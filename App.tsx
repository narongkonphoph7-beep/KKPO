
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  AppStatus, 
  AppState, 
  ProcessingResult 
} from './types';
import { 
  performOCRAndSummarize, 
  generateThaiSpeech,
  decode,
  decodeAudioData,
  FileData
} from './services/geminiService';

// Components
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { ResultView } from './components/ResultView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: AppStatus.IDLE,
    result: null,
    error: null,
    progressMessage: ''
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  
  const [audioBlob, setAudioBlob] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Generate previews when files change
  useEffect(() => {
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setFilePreviews(urls);
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const handleFileSelection = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Helper: Compress Image before sending to AI
  const compressFile = async (file: File): Promise<FileData> => {
    // If PDF, return as is (base64)
    if (file.type === 'application/pdf') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve({ 
              base64: reader.result.split(',')[1], 
              mimeType: file.type 
            });
          } else {
            reject(new Error("Failed to read PDF"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // If Image, compress via Canvas
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max width 1500px is sufficient for OCR
          const MAX_WIDTH = 1500; 
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG quality 0.7 (significant size reduction)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve({
            base64: dataUrl.split(',')[1],
            mimeType: 'image/jpeg'
          });
        };
        img.onerror = (e) => reject(e);
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const handleStartProcessing = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const fileCount = selectedFiles.length;
      setState(prev => ({ 
        ...prev, 
        status: AppStatus.UPLOADING, 
        progressMessage: `กำลังบีบอัดและอัปโหลด ${fileCount} ไฟล์ (โหมดเทอร์โบ)...` 
      }));
      
      // Process files in parallel
      const filesData = await Promise.all(selectedFiles.map(compressFile));

      // STEP 1 & 2 & 3: OCR + Filter + Summarize
      setState(prev => ({ ...prev, status: AppStatus.PROCESSING_OCR, progressMessage: `AI กำลังอ่านและสรุปใจความอย่างรวดเร็ว...` }));
      const { original, summary } = await performOCRAndSummarize(filesData);

      // STEP 4: TTS
      setState(prev => ({ ...prev, status: AppStatus.GENERATING_VOICE, progressMessage: 'กำลังสร้างเสียงบรรยาย...' }));
      let audioBase64;
      try {
        audioBase64 = await generateThaiSpeech(summary);
      } catch (e) {
        console.warn("TTS Failed, continuing with text only", e);
        // If TTS fails (e.g. quota), we still show the summary
        audioBase64 = null;
      }
      
      setAudioBlob(audioBase64 || null);
      setState({
        status: AppStatus.COMPLETED,
        result: {
          originalText: original,
          summary: summary,
          audioBase64: audioBase64 || undefined
        },
        error: null,
        progressMessage: 'เรียบร้อยแล้ว!'
      });
    } catch (err: any) {
      console.error(err);
      
      // Improve user experience for Quota errors
      let errorMsg = err.message || 'เกิดข้อผิดพลาดบางอย่าง โปรดลองอีกครั้ง';
      if (err.message?.includes('429') || err.message?.includes('Quota')) {
        errorMsg = "⚠️ ใช้งานเกินโควตาประจำวันของ Google AI (ฟรี 1500 ครั้ง/วัน) โปรดรอสักครู่แล้วลองใหม่";
      }

      setState(prev => ({ 
        ...prev, 
        status: AppStatus.ERROR, 
        error: errorMsg 
      }));
    }
  };

  const playAudio = async () => {
    if (!audioBlob) return;
    
    // Stop existing audio if any
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    const ctx = audioContextRef.current;
    
    // Ensure context is running (browsers might suspend it)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const data = decode(audioBlob);
    const audioBuffer = await decodeAudioData(data, ctx, 24000, 1);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      setIsAudioPlaying(false);
      audioSourceRef.current = null;
    };

    audioSourceRef.current = source;
    source.start();
    setIsAudioPlaying(true);
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsAudioPlaying(false);
  };

  const reset = () => {
    stopAudio();
    setState({
      status: AppStatus.IDLE,
      result: null,
      error: null,
      progressMessage: ''
    });
    setAudioBlob(null);
    setSelectedFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow flex flex-col items-center justify-center space-y-8 mt-12">
        {state.status === AppStatus.IDLE && (
          <div className="w-full animate-fade-in">
            {selectedFiles.length === 0 ? (
              <>
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">เริ่มสร้างเรื่องเล่าจากเอกสาร</h2>
                  <p className="text-gray-600">อัปโหลดรูปภาพ หรือ PDF เอกสารภาษาไทยของคุณที่นี่ (รองรับหลายไฟล์)</p>
                </div>
                <FileUploader onUpload={handleFileSelection} />
              </>
            ) : (
              <div className="w-full">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-gray-800">เอกสารที่เลือก ({selectedFiles.length})</h2>
                   <button 
                     onClick={() => setSelectedFiles([])}
                     className="text-red-500 hover:text-red-700 text-sm font-semibold"
                   >
                     ล้างทั้งหมด
                   </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {filePreviews.map((url, index) => {
                    const isPdf = selectedFiles[index].type === 'application/pdf';
                    return (
                      <div key={index} className="relative group aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden shadow-md border border-gray-200">
                        {isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" />
                             </svg>
                             <span className="text-sm font-bold mt-2">PDF</span>
                          </div>
                        ) : (
                          <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        )}
                        <button 
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                          {selectedFiles[index].name}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Add More Button Block */}
                  <div className="relative aspect-[3/4]">
                    <FileUploader onUpload={handleFileSelection} compact={true} />
                  </div>
                </div>

                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleStartProcessing}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xl font-bold py-4 px-12 rounded-full shadow-xl hover:shadow-2xl transform transition hover:-translate-y-1 active:scale-95 flex items-center space-x-3"
                  >
                    <span>⚡</span>
                    <span>เริ่มประมวลผลด่วน</span>
                  </button>
                </div>
              </div>
            )}
            
            {selectedFiles.length === 0 && (
              <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
                  <div className="text-4xl mb-4">👁️</div>
                  <h3 className="font-semibold text-lg mb-2">The Eye (Thai OCR)</h3>
                  <p className="text-sm text-gray-500">อ่านข้อความภาษาไทยได้แม่นยำ แม้เป็นภาพถ่ายหลายหน้า</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
                  <div className="text-4xl mb-4">🧠</div>
                  <h3 className="font-semibold text-lg mb-2">The Brain (AI Summary)</h3>
                  <p className="text-sm text-gray-500">รวบรวมเนื้อหาจากทุกหน้า สรุปใจความสำคัญให้เข้าใจง่าย</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
                  <div className="text-4xl mb-4">🎙️</div>
                  <h3 className="font-semibold text-lg mb-2">The Voice (Thai TTS)</h3>
                  <p className="text-sm text-gray-500">แปลงข้อความเป็นเสียงพูดภาษาไทยที่นุ่มนวล</p>
                </div>
              </section>
            )}
          </div>
        )}

        {state.status !== AppStatus.IDLE && state.status !== AppStatus.COMPLETED && state.status !== AppStatus.ERROR && (
          <ProcessingOverlay status={state.status} message={state.progressMessage} />
        )}

        {state.status === AppStatus.COMPLETED && state.result && (
          <ResultView 
            result={state.result} 
            isPlaying={isAudioPlaying}
            onPlay={playAudio} 
            onStop={stopAudio}
            onReset={reset} 
          />
        )}

        {state.status === AppStatus.ERROR && (
          <div className="bg-red-50 border border-red-200 p-8 rounded-3xl text-center max-w-md w-full shadow-lg">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-red-800 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-red-600 mb-6">{state.error}</p>
            <button 
              onClick={reset}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition transform active:scale-95"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>@จัดทำโดย น้องปอนด์สุดหล่อจาก CS68  🚀</p>
      </footer>
    </div>
  );
};

export default App;

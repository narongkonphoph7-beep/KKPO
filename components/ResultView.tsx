
import React, { useState } from 'react';
import { ProcessingResult } from '../types';

interface ResultViewProps {
  result: ProcessingResult;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onReset: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ result, isPlaying, onPlay, onStop, onReset }) => {
  const [tab, setTab] = useState<'summary' | 'original'>('summary');

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-fade-in-up">
      {/* Top Header - Audio Call to Action */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
            <span className="text-4xl">🎙️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-1">เรื่องเล่าจากเอกสารพร้อมแล้ว!</h2>
            <p className="text-blue-100 opacity-90">
              {isPlaying ? 'กำลังอ่านสรุปให้ฟัง...' : 'กดปุ่มเพื่อเริ่มฟังเสียงสรุป'}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          {isPlaying ? (
            <button 
              onClick={onStop}
              className="group flex items-center space-x-3 bg-red-500 text-white font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              <span>หยุดพูด</span>
            </button>
          ) : (
            <button 
              onClick={onPlay}
              className="group flex items-center space-x-3 bg-white text-blue-700 font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span>ฟังบทสรุป</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button 
          onClick={() => setTab('summary')}
          className={`flex-1 py-4 font-bold transition ${tab === 'summary' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          บทสรุป (Summary)
        </button>
        <button 
          onClick={() => setTab('original')}
          className={`flex-1 py-4 font-bold transition ${tab === 'original' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          ข้อความต้นฉบับ (Original)
        </button>
      </div>

      {/* Content Area */}
      <div className="p-8 md:p-12 min-h-[300px]">
        {tab === 'summary' ? (
          <div className="prose prose-blue max-w-none text-gray-700 text-lg leading-relaxed whitespace-pre-wrap animate-fade-in">
             <div className="text-3xl text-blue-300 mb-4">“</div>
             {result.summary}
             <div className="text-3xl text-blue-300 text-right mt-4">”</div>
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-2xl text-gray-500 text-sm font-mono overflow-auto max-h-[400px] whitespace-pre-wrap animate-fade-in">
            {result.originalText || "ไม่มีข้อมูลข้อความต้นฉบับ"}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-8 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-gray-400 text-xs">
          เอกสารถูกประมวลผลด้วยโมเดล Gemini 3 Flash และ TTS
        </p>
        <button 
          onClick={onReset}
          className="text-gray-600 hover:text-blue-600 font-semibold text-sm underline underline-offset-4"
        >
          กลับไปหน้าอัปโหลดเอกสารใหม่
        </button>
      </div>
    </div>
  );
};

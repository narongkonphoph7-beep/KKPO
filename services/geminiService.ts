
import { GoogleGenAI, Modality } from "@google/genai";

// The build process replaces this with the actual string
const API_KEY = process.env.API_KEY || '';

export const getGeminiClient = () => {
  if (!API_KEY) {
    throw new Error("ไม่พบ API Key (API Key Missing). หากคุณเพิ่งใส่ Key ใน Vercel กรุณากด 'Redeploy' เพื่อให้ระบบอัปเดต");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

export interface FileData {
  base64: string;
  mimeType: string;
}

export const performOCRAndSummarize = async (files: FileData[]): Promise<{ original: string; summary: string }> => {
  const ai = getGeminiClient();
  
  // Concise prompt for faster processing
  const prompt = `
    Task: Thai Document Analysis.
    1. Extract ALL text from the provided images/PDFs (OCR). Combine logically.
    2. Summarize the content into a cohesive, easy-to-understand "Story" in THAI language.
    
    Output strictly in this JSON format:
    {
      "originalText": "All extracted text here...",
      "summary": "Thai summary story here..."
    }
  `;

  // Create parts for every file provided, respecting its mime type
  const fileParts = files.map(file => ({
    inlineData: { mimeType: file.mimeType, data: file.base64 }
  }));

  try {
    const response = await ai.models.generateContent({
      // USE GEMINI 2.0 FLASH for higher rate limits (1500 RPD) vs Gemini 3 (20 RPD)
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          ...fileParts,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      original: result.originalText || '',
      summary: result.summary || ''
    };
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
      throw new Error("โควตาการใช้งานฟรีของวันนี้เต็มแล้ว (Limit Exceeded). กรุณารอ 1-2 นาทีแล้วลองใหม่ หรือเปลี่ยน API Key");
    }
    throw error;
  }
};

export const generateThaiSpeech = async (text: string): Promise<string> => {
  const ai = getGeminiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `โปรดอ่านด้วยน้ำเสียงเล่าเรื่องที่น่าฟัง: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Could not generate audio content");
    
    return base64Audio;
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
      throw new Error("โควตาการสร้างเสียงเต็ม (TTS Limit). คุณยังสามารถอ่านบทสรุปได้");
    }
    throw error;
  }
};

// Audio Utilities for raw PCM
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

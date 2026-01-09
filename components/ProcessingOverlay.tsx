
import React from 'react';
import { AppStatus } from '../types';

interface ProcessingOverlayProps {
  status: AppStatus;
  message: string;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ status, message }) => {
  return (
    <div className="w-full max-w-lg bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center space-y-8 animate-pulse border border-blue-50">
      <div className="relative">
        <div className="w-24 h-24 border-8 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl">🤖</span>
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-gray-800">กำลังทำงาน...</h3>
        <p className="text-blue-600 font-medium animate-bounce">{message}</p>
      </div>

      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div className={`h-full bg-blue-600 transition-all duration-1000 ${
          status === AppStatus.PROCESSING_OCR ? 'w-1/3' : 
          status === AppStatus.SUMMARIZING ? 'w-2/3' : 
          'w-[95%]'
        }`}></div>
      </div>
      
      <p className="text-xs text-gray-400 italic">"ความพยายามในการอ่านเอกสารอย่างละเอียดเพื่อผลลัพธ์ที่แม่นยำที่สุด..."</p>
    </div>
  );
};

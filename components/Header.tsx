
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center space-y-4">
      <div className="inline-flex items-center space-x-4 bg-white px-6 py-2 rounded-full shadow-md border border-gray-100">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 shadow-inner flex items-center justify-center bg-gray-50">
          {/* Replace 'https://api.dicebear.com/7.x/bottts/svg?seed=ThaiSight' with your actual image URL or local path */}
          <img 
            src="https://api.dicebear.com/7.x/bottts/svg?seed=ThaiSight" 
            alt="ThaiSight AI Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          น้องปอนด์สุดหล่อ
        </h1>
      </div>
      <p className="text-lg text-gray-600 font-medium">
        "เปลี่ยนภาพเอกสาร เป็นเรื่องเล่า... ให้ AI อ่านสรุปให้คุณฟัง"
      </p>
    </header>
  );
};

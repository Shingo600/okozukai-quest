"use client";
import React from "react";

export function PhoneFrame({ children, bg = "bg-kid-bg" }: { children: React.ReactNode; bg?: string }) {
  return (
    <div className="min-h-screen w-full flex justify-center bg-[#efe7f6]">
      <div className={`relative w-full max-w-[430px] min-h-screen ${bg} shadow-soft overflow-hidden`}>
        <div className="flex justify-between items-center px-5 pt-3 text-xs font-bold text-gray-600">
          <span>9:41</span>
          <span className="tracking-widest">●●●●</span>
        </div>
        {children}
      </div>
    </div>
  );
}

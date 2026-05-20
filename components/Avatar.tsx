"use client";
import React from "react";
import { isPhotoAvatar } from "@/lib/imageResize";

export function Avatar({
  avatar,
  size = 48,
  className = "",
}: {
  avatar: string;
  size?: number;
  className?: string;
}) {
  const isPhoto = isPhotoAvatar(avatar);
  const baseClass = `inline-flex items-center justify-center rounded-full overflow-hidden bg-kid-yellow/40 ${className}`;
  const style: React.CSSProperties = { width: size, height: size };
  if (isPhoto) {
    return (
      <span className={baseClass} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }
  return (
    <span className={baseClass} style={{ ...style, fontSize: size * 0.6 }}>
      <span>{avatar}</span>
    </span>
  );
}

"use client";
import React, { useState } from "react";

type Mode = "enter" | "setup";

export function PinPad({
  mode,
  title,
  onComplete,
  onCancel,
  errorMessage,
}: {
  mode: Mode;
  title?: string;
  onComplete: (pin: string) => void | Promise<void>;
  onCancel?: () => void;
  errorMessage?: string;
}) {
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [stage, setStage] = useState<"first" | "confirm">("first");
  const [localError, setLocalError] = useState<string | null>(null);

  const current = mode === "enter" ? pin1 : stage === "first" ? pin1 : pin2;
  const setCurrent = (v: string) => {
    setLocalError(null);
    if (mode === "enter") setPin1(v);
    else if (stage === "first") setPin1(v);
    else setPin2(v);
  };

  const digit = (n: string) => {
    if (current.length >= 4) return;
    const next = current + n;
    setCurrent(next);
    if (next.length === 4) {
      if (mode === "enter") {
        void onComplete(next);
      } else if (stage === "first") {
        setTimeout(() => setStage("confirm"), 150);
      } else {
        if (pin1 === next) {
          void onComplete(next);
        } else {
          setLocalError("PIN が一致しません。最初からやり直してください");
          setTimeout(() => { setPin1(""); setPin2(""); setStage("first"); }, 800);
        }
      }
    }
  };

  const backspace = () => setCurrent(current.slice(0, -1));
  const error = errorMessage ?? localError;

  return (
    <div className="w-full max-w-sm mx-auto px-4 py-6 text-center">
      {title && <div className="text-sm font-bold text-gray-700 mb-1">{title}</div>}
      <div className="text-xs text-gray-500 mb-4">
        {mode === "setup" ? (stage === "first" ? "4桁のPINを設定" : "もう一度入力してください") : "4桁のPINを入力"}
      </div>
      <div className="flex justify-center gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 ${current.length > i ? "bg-parent-purple border-parent-purple" : "border-gray-300"}`} />
        ))}
      </div>
      {error && <div className="text-xs text-rose-500 bg-rose-50 rounded-xl p-2 mb-3">{error}</div>}
      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button key={n} onClick={() => digit(n)} className="aspect-square rounded-2xl bg-gray-50 text-2xl font-bold text-gray-700 active:bg-gray-200">{n}</button>
        ))}
        <button onClick={onCancel} disabled={!onCancel} className="aspect-square rounded-2xl text-xs text-gray-400 disabled:opacity-0">キャンセル</button>
        <button onClick={() => digit("0")} className="aspect-square rounded-2xl bg-gray-50 text-2xl font-bold text-gray-700 active:bg-gray-200">0</button>
        <button onClick={backspace} className="aspect-square rounded-2xl text-lg text-gray-500 active:bg-gray-100">⌫</button>
      </div>
    </div>
  );
}

"use client";
import React, { useState } from "react";
import { useStore, type OnboardingChild } from "@/lib/store";
import { PinPad } from "./PinPad";

const AVATAR_PRESETS = ["🧒", "👧", "👦", "🐱", "🐶", "🐰", "🦊", "🐻", "🐼"];

export function Onboarding() {
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [count, setCount] = useState(1);
  const [children, setChildren] = useState<OnboardingChild[]>([{ name: "", avatar: "🧒" }]);
  const [busy, setBusy] = useState(false);

  const handleCount = (n: number) => {
    setCount(n);
    setChildren((prev) => {
      const next = Array.from({ length: n }, (_, i) => prev[i] ?? { name: "", avatar: AVATAR_PRESETS[i % AVATAR_PRESETS.length] });
      return next;
    });
    setStep(2);
  };

  const updateChild = (i: number, patch: Partial<OnboardingChild>) => {
    setChildren((c) => c.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const canProceedStep2 = children.every((c) => c.name.trim().length > 0);

  const finishPinSetup = async (pin: string) => {
    setBusy(true);
    try {
      await completeOnboarding(children, pin);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-b from-[#FFFBEE] via-[#fde7ef] to-[#efe2ff]">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🪙</div>
        <h1 className="text-2xl font-extrabold text-parent-purpleDeep">おこづかいクエスト</h1>
        <p className="text-xs text-gray-500 mt-1">最初の設定 ({step}/3)</p>
      </div>

      {step === 1 && (
        <div className="card w-full max-w-sm p-5 text-center space-y-4">
          <div className="font-bold text-gray-700">こどもは何人？</div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} onClick={() => handleCount(n)} className="aspect-square rounded-2xl bg-gray-50 text-2xl font-bold text-gray-700 active:bg-gray-200">
                {n}<span className="text-xs font-normal">人</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card w-full max-w-sm p-5 space-y-4">
          <div className="font-bold text-gray-700 text-center">こどもの名前とアバター</div>
          <div className="space-y-4">
            {children.map((c, i) => (
              <div key={i} className="space-y-2">
                <div className="text-xs text-gray-500">こども{i + 1}</div>
                <input
                  value={c.name}
                  onChange={(e) => updateChild(i, { name: e.target.value })}
                  placeholder="名前"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {AVATAR_PRESETS.map((a) => (
                    <button
                      key={a}
                      onClick={() => updateChild(i, { avatar: a })}
                      className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center ${c.avatar === a ? "bg-emerald-100 ring-2 ring-emerald-300" : "bg-gray-100"}`}
                    >{a}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => setStep(1)} className="rounded-full bg-gray-100 text-gray-600 font-bold py-2 text-sm">もどる</button>
            <button onClick={() => setStep(3)} disabled={!canProceedStep2} className="btn-primary-parent py-2 text-sm disabled:opacity-40">つぎへ</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card w-full max-w-sm p-3">
          <PinPad
            mode="setup"
            title="親モードの PIN を作成"
            onComplete={finishPinSetup}
            onCancel={() => setStep(2)}
          />
          {busy && <div className="text-xs text-gray-400 text-center pb-2">設定を保存中…</div>}
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-4">あとから設定画面で変更できます</p>
    </div>
  );
}

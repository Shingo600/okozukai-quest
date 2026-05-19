"use client";
import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { PinPad } from "./PinPad";

export function UserSwitch() {
  const { state, setCurrentUser, parentUnlocked, verifyPinAndUnlock } = useStore();
  const [pinFor, setPinFor] = useState<string | null>(null); // 親ユーザ id
  const [error, setError] = useState<string | null>(null);

  const choose = (userId: string, role: string) => {
    if (role === "child") {
      setCurrentUser(userId);
      return;
    }
    // 親
    if (parentUnlocked) {
      setCurrentUser(userId);
    } else {
      setPinFor(userId);
      setError(null);
    }
  };

  const handlePin = async (pin: string) => {
    const ok = await verifyPinAndUnlock(pin);
    if (ok) {
      const id = pinFor;
      setPinFor(null);
      if (id) setCurrentUser(id);
    } else {
      setError("PIN が違います");
    }
  };

  const children = state.users.filter((u) => u.role === "child");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-b from-[#FFFBEE] via-[#fde7ef] to-[#efe2ff]">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🪙</div>
        <h1 className="text-2xl font-extrabold text-parent-purpleDeep">おこづかいクエスト</h1>
        <p className="text-sm text-gray-500 mt-1">だれでつかう？</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <Section title="こども" color="from-kid-green to-emerald-300">
          {children.length === 0 && <div className="text-xs text-gray-400 px-2">まだ登録がありません</div>}
          {children.map((u) => (
            <UserCard key={u.id} avatar={u.avatar} name={u.name} sub={`Lv.${u.level} ・ ${u.allowanceBalance}円`} onClick={() => choose(u.id, u.role)} />
          ))}
        </Section>
        <Section title="おとな" color="from-parent-purple to-parent-purpleDeep">
          {state.users.filter((u) => u.role !== "child").map((u) => (
            <UserCard
              key={u.id}
              avatar={u.avatar}
              name={u.name}
              sub={`${u.role === "mother" ? "ママ" : "パパ"}${parentUnlocked ? "" : " 🔒"}`}
              onClick={() => choose(u.id, u.role)}
            />
          ))}
        </Section>
      </div>

      {pinFor && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center" onClick={() => setPinFor(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <PinPad
              mode="enter"
              title="親モードに切り替え"
              onComplete={handlePin}
              onCancel={() => setPinFor(null)}
              errorMessage={error ?? undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={`inline-block bg-gradient-to-r ${color} text-white text-xs font-bold rounded-full px-3 py-1 mb-2`}>{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function UserCard({ avatar, name, sub, onClick }: { avatar: string; name: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full card flex items-center gap-3 px-4 py-3 hover:scale-[1.01] active:scale-95 transition">
      <div className="w-12 h-12 rounded-full bg-kid-yellow/40 flex items-center justify-center text-2xl">{avatar}</div>
      <div className="text-left flex-1">
        <div className="font-bold text-gray-800">{name}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </div>
      <div className="text-gray-300">›</div>
    </button>
  );
}

"use client";
import React, { useEffect, useState } from "react";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  icon?: string;
  tone?: "info" | "success" | "warn";
}

export function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-3 inset-x-0 z-[9000] flex flex-col items-center gap-2 px-3 pointer-events-none">
      {items.map((t) => (
        <ToastView key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setEnter(true), 10);
    const t2 = setTimeout(onDismiss, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);
  const toneCls =
    item.tone === "success" ? "bg-emerald-500 text-white"
    : item.tone === "warn" ? "bg-amber-500 text-white"
    : "bg-white text-gray-800";
  return (
    <div className={`pointer-events-auto max-w-[400px] w-full ${toneCls} shadow-soft rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-300 ${enter ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}>
      <div className="text-2xl">{item.icon ?? "🎉"}</div>
      <div className="flex-1">
        <div className="text-sm font-bold">{item.title}</div>
        {item.message && <div className="text-xs opacity-90">{item.message}</div>}
      </div>
    </div>
  );
}

"use client";
import React from "react";

export type ChildTab = "home" | "quest" | "bonus" | "history" | "mypage";
export type ParentTab = "home" | "task" | "approval" | "history" | "settings";

export function ChildNav({ tab, onChange, pendingCount = 0 }: { tab: ChildTab; onChange: (t: ChildTab) => void; pendingCount?: number }) {
  const items: { key: ChildTab; label: string; icon: string }[] = [
    { key: "home", label: "ホーム", icon: "🏠" },
    { key: "quest", label: "クエスト", icon: "⚔️" },
    { key: "bonus", label: "ボーナス", icon: "🌟" },
    { key: "history", label: "履歴", icon: "📜" },
    { key: "mypage", label: "マイページ", icon: "👤" },
  ];
  return (
    <NavBase items={items} tab={tab} onChange={onChange} active="text-green-600" badge={tab !== "history" && pendingCount > 0 ? { key: "history" as ChildTab, count: pendingCount } : null} />
  );
}

export function ParentNav({ tab, onChange, pendingCount }: { tab: ParentTab; onChange: (t: ParentTab) => void; pendingCount: number }) {
  const items: { key: ParentTab; label: string; icon: string }[] = [
    { key: "home", label: "ホーム", icon: "🏠" },
    { key: "task", label: "タスク", icon: "📝" },
    { key: "approval", label: "承認待ち", icon: "✅" },
    { key: "history", label: "履歴", icon: "📜" },
    { key: "settings", label: "設定", icon: "⚙️" },
  ];
  return (
    <NavBase items={items} tab={tab} onChange={onChange} active="text-parent-purpleDeep" badge={pendingCount > 0 ? { key: "approval" as ParentTab, count: pendingCount } : null} />
  );
}

function NavBase<T extends string>({
  items, tab, onChange, active, badge,
}: {
  items: { key: T; label: string; icon: string }[];
  tab: T;
  onChange: (t: T) => void;
  active: string;
  badge: { key: T; count: number } | null;
}) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur border-t border-gray-100 z-30">
      <ul className="flex justify-between px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {items.map((it) => {
          const isActive = it.key === tab;
          const showBadge = badge && badge.key === it.key;
          return (
            <li key={it.key} className="flex-1">
              <button
                onClick={() => onChange(it.key)}
                className={`relative w-full flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold ${isActive ? active : "text-gray-400"}`}
              >
                <span className="text-xl leading-none">{it.icon}</span>
                <span>{it.label}</span>
                {showBadge && (
                  <span className="absolute top-0 right-3 bg-red-500 text-white rounded-full text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {badge!.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

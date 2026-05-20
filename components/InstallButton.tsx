"use client";
import React, { useEffect, useState } from "react";

// beforeinstallprompt の型（標準仕様 / Chrome）
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 既にインストール済み（standalone モード）の判定
    const mq = window.matchMedia("(display-mode: standalone)");
    const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (mq.matches || navStandalone === true) setInstalled(true);

    // iOS Safari 判定（beforeinstallprompt が出ないため）
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(ios);

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onBefore as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  // Android/Desktop Chrome: beforeinstallprompt が来ている場合
  if (deferred) {
    return (
      <button
        onClick={async () => {
          await deferred.prompt();
          const res = await deferred.userChoice;
          if (res.outcome === "accepted") setDeferred(null);
        }}
        className="w-full mt-3 rounded-full border-2 border-parent-purple text-parent-purpleDeep font-bold py-2 text-sm active:scale-95 transition"
      >
        📱 ホーム画面にインストール
      </button>
    );
  }

  // iOS Safari: 手順を表示
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSHelp(true)}
          className="w-full mt-3 rounded-full border-2 border-parent-purple text-parent-purpleDeep font-bold py-2 text-sm"
        >
          📱 iPhone でインストール
        </button>
        {showIOSHelp && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowIOSHelp(false)}>
            <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-5" onClick={(e) => e.stopPropagation()}>
              <div className="font-bold text-center mb-3">iPhone にインストール</div>
              <ol className="text-sm space-y-2 text-gray-700">
                <li>1. Safari の下にある <span className="font-bold">共有ボタン（□↑）</span> をタップ</li>
                <li>2. <span className="font-bold">「ホーム画面に追加」</span> をタップ</li>
                <li>3. 右上の <span className="font-bold">「追加」</span> をタップ</li>
              </ol>
              <p className="text-[11px] text-gray-400 mt-3">Chrome や他ブラウザの場合は Safari で開き直してください。</p>
              <button onClick={() => setShowIOSHelp(false)} className="w-full mt-4 rounded-full bg-gray-100 text-gray-600 font-bold py-2 text-sm">閉じる</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // それ以外（既にPWA / インストール条件未満）は非表示
  return null;
}

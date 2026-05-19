"use client";
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Session } from "@/lib/api";

type Mode = "signin" | "signup";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.getSession().then((s) => { if (mounted) { setSession(s); setReady(true); } });
    const unsub = api.onAuthChange((s) => setSession(s));
    return () => { mounted = false; unsub(); };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">読み込み中…</div>
    );
  }
  if (!session) return <AuthScreen onSignedIn={(s) => setSession(s)} />;
  return <>{children}</>;
}

function AuthScreen({ onSignedIn }: { onSignedIn: (s: Session) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("メールアドレスの形式が正しくありません"); return; }
    if (password.length < 6) { setError("パスワードは6文字以上にしてください"); return; }
    setBusy(true);
    try {
      if (mode === "signup") await api.signUp(email, password);
      else await api.signIn(email, password);
      const s = await api.getSession();
      if (s) onSignedIn(s);
      else setError("セッション取得に失敗しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-b from-[#FFFBEE] via-[#fde7ef] to-[#efe2ff]">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🪙</div>
        <h1 className="text-2xl font-extrabold text-parent-purpleDeep">おこづかいクエスト</h1>
        <p className="text-sm text-gray-500 mt-1">{mode === "signin" ? "サインインしてください" : "新しい家族アカウントを作成"}</p>
      </div>

      <div className="card w-full max-w-sm p-5 space-y-3">
        <div className="flex gap-2 text-xs font-bold">
          <button onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-full ${mode === "signin" ? "bg-parent-purple text-white" : "bg-gray-100 text-gray-500"}`}>サインイン</button>
          <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-full ${mode === "signup" ? "bg-parent-purple text-white" : "bg-gray-100 text-gray-500"}`}>新規登録</button>
        </div>
        <label className="block text-xs text-gray-500">メールアドレス
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2 text-sm" placeholder="parent@example.com" />
        </label>
        <label className="block text-xs text-gray-500">パスワード
          <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2 text-sm" placeholder="6文字以上" />
        </label>
        {error && <div className="text-xs text-rose-500 bg-rose-50 rounded-xl p-2">{error}</div>}
        <button onClick={submit} disabled={busy} className="w-full btn-primary-parent py-3 text-sm disabled:opacity-50">
          {busy ? "通信中…" : mode === "signin" ? "サインイン" : "アカウントを作成"}
        </button>
        <p className="text-[11px] text-gray-400 text-center">
          {mode === "signin" ? "初回はサインアップしてください。" : "サインアップすると家族用データが作成されます。"}
        </p>
      </div>
    </div>
  );
}

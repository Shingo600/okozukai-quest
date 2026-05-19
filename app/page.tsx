"use client";
import { StoreProvider, useStore } from "@/lib/store";
import { UserSwitch } from "@/components/UserSwitch";
import { ChildApp } from "@/components/ChildApp";
import { ParentApp } from "@/components/ParentApp";
import { ToastStack } from "@/components/Toast";
import { AuthGate } from "@/components/AuthGate";
import { Onboarding } from "@/components/Onboarding";
import { backendKind } from "@/lib/api";

function Shell() {
  const { currentUser, toasts, dismissToast, needsOnboarding, hydrated } = useStore();
  if (!hydrated) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">読み込み中…</div>;
  }
  if (needsOnboarding) {
    return (
      <div className="mx-auto w-full max-w-[430px]">
        <Onboarding />
        <ToastStack items={toasts} onDismiss={dismissToast} />
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[430px]">
      {!currentUser ? <UserSwitch /> : currentUser.role === "child" ? <ChildApp /> : <ParentApp />}
      <ToastStack items={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function Page() {
  const inner = (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
  return backendKind === "supabase" ? <AuthGate>{inner}</AuthGate> : inner;
}

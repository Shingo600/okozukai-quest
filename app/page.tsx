"use client";
import { StoreProvider, useStore } from "@/lib/store";
import { UserSwitch } from "@/components/UserSwitch";
import { ChildApp } from "@/components/ChildApp";
import { ParentApp } from "@/components/ParentApp";
import { ToastStack } from "@/components/Toast";
import { AuthGate } from "@/components/AuthGate";
import { backendKind } from "@/lib/api";

function Shell() {
  const { currentUser, toasts, dismissToast } = useStore();
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

"use client";
// クライアント単体の OS 通知ヘルパ。
// `state.settings.push` がマスタースイッチ。

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission {
  if (!isSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function fireOSNotification(title: string, body?: string, options: NotificationOptions = {}): void {
  if (!isSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", ...options });
  } catch {
    // iOS Safari など発火不能な環境では黙殺
  }
}

// ローカルタイム基準の日付ユーティリティ。
// `new Date().toISOString().slice(0,10)` は UTC 基準のため、
// JST 00:00〜08:59 で前日扱いされるバグを避ける。

const pad = (n: number) => String(n).padStart(2, "0");

export function todayLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function addDaysLocal(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d);
  dt.setDate(dt.getDate() + n);
  return todayLocal(dt);
}

export function weekdayLocal(dateStr?: string): number {
  if (!dateStr) return new Date().getDay();
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d).getDay();
}

export function hhmmLocal(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

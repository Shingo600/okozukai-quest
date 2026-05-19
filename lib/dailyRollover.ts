import type { AppState, Task } from "./types";
import { todayLocal, addDaysLocal, weekdayLocal } from "./date";

/**
 * 日跨ぎ処理。state.lastRolloverDate と今日を比較し、
 * - daily / weekly テンプレタスクを今日分として再生成
 * - 子供毎に streakDays を更新（前日に approved があれば +1、無ければリセット）
 * を行った新しい state を返す。重複実行（同日内呼び出し）は no-op。
 */
export function rolloverIfNeeded(state: AppState, today = todayLocal()): AppState {
  if (state.lastRolloverDate === today) return state;

  let tasks = state.tasks.slice();

  // 既存タスクで repeatType=daily / weekly のものを「テンプレ」として扱い、
  // 同タイトル+同担当 で今日まだ無ければ active として再生成する。
  const sources = state.tasks.filter((t) => t.repeatType === "daily" || t.repeatType === "weekly");
  const existsToday = new Set(
    state.tasks
      .filter((t) => t.dueDate === today)
      .map((t) => `${t.title}::${t.assignedChildId}`)
  );
  const weekday = weekdayLocal(today);

  for (const src of sources) {
    if (src.repeatType === "weekly" && !src.weekdays.includes(weekday)) continue;
    const key = `${src.title}::${src.assignedChildId}`;
    if (existsToday.has(key)) continue;
    const newTask: Task = {
      ...src,
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: "active",
      dueDate: today,
      createdAt: today,
    };
    tasks.unshift(newTask);
    existsToday.add(key);
  }

  // streak 判定: 前日にこの child の approved 履歴があれば streakDays +1、無ければ 0
  const yesterday = addDaysLocal(today, -1);
  const users = state.users.map((u) => {
    if (u.role !== "child") return u;
    const hadApprovedYesterday = state.history.some(
      (h) => h.childId === u.id && h.status === "approved" && h.createdAt === yesterday && h.type === "earn"
    );
    return { ...u, streakDays: hadApprovedYesterday ? u.streakDays + 1 : 0 };
  });

  return { ...state, tasks, users, lastRolloverDate: today };
}

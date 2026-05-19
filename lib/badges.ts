import type { AppState, Badge } from "./types";

/**
 * 承認直後に呼ばれる。state を引数に取り、達成条件を満たすバッジを acquired=true に更新した
 * 新しい state と、今回新たに獲得したバッジ一覧を返す。
 */
export function evaluateBadges(state: AppState, childId: string): { state: AppState; newlyAcquired: Badge[] } {
  const user = state.users.find((u) => u.id === childId);
  if (!user) return { state, newlyAcquired: [] };

  const approvedCount = state.history.filter((h) => h.childId === childId && h.status === "approved" && h.type === "earn").length;
  const cleaningCount = state.history.filter((h) => h.childId === childId && /掃除|そうじ|洗う|ゴミ|お風呂/.test(h.title)).length;

  const rules: { id: string; ok: boolean }[] = [
    { id: "b1", ok: approvedCount >= 1 },
    { id: "b2", ok: user.streakDays >= 3 },
    { id: "b3", ok: cleaningCount >= 10 },
  ];

  const newlyAcquired: Badge[] = [];
  const badges = state.badges.map((b) => {
    const rule = rules.find((r) => r.id === b.id);
    if (rule && rule.ok && !b.acquired) {
      newlyAcquired.push({ ...b, acquired: true });
      return { ...b, acquired: true };
    }
    return b;
  });

  return { state: { ...state, badges }, newlyAcquired };
}

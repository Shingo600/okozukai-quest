"use client";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type {
  AppState, Task, User, Notification, AllowanceHistory, NotificationSettings, RepeatType, TaskTemplate, RedemptionRequest,
} from "./types";
import { createDemoState, createEmptyState } from "./demoData";
import { hashPin, verifyPin } from "./pin";
import { api } from "./api";
import { rolloverIfNeeded } from "./dailyRollover";
import { evaluateBadges } from "./badges";
import { todayLocal } from "./date";
import type { ToastItem } from "@/components/Toast";
import { playSound, confettiBurst } from "./effects";
import { fireOSNotification, requestNotificationPermission, getPermission } from "./notify";
import { hhmmLocal } from "./date";

type OsKind = "newTask" | "submit" | "approval" | "reminder";
function maybeFireOS(settings: NotificationSettings, kind: OsKind, title: string, body?: string) {
  if (!settings.push) return;
  if (kind === "newTask" && !settings.onNewTask) return;
  if (kind === "submit" && !settings.onSubmit) return;
  if (kind === "approval" && !settings.onApproval) return;
  if (kind === "reminder" && !settings.reminder) return;
  fireOSNotification(title, body);
}

function mergeWithDefaults(parsed: Partial<AppState>): AppState {
  const defaults = createEmptyState();
  return {
    ...defaults,
    ...parsed,
    taskTemplates: parsed.taskTemplates ?? defaults.taskTemplates,
    redemptions: parsed.redemptions ?? [],
  };
}

export interface OnboardingChild {
  name: string;
  avatar: string;
}

interface Ctx {
  state: AppState;
  currentUser: User | null;
  setCurrentUser: (id: string | null) => void;
  resetDemo: () => void;
  signOut: () => Promise<void>;
  hydrated: boolean;
  needsOnboarding: boolean;
  parentUnlocked: boolean;
  completeOnboarding: (children: OnboardingChild[], pin: string) => Promise<void>;
  resetAll: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  verifyPinAndUnlock: (pin: string) => Promise<boolean>;
  lockParent: () => void;
  updateUser: (id: string, patch: Partial<Pick<User, "name" | "avatar">>) => void;
  markPaid: (historyIds: string[]) => void;
  unmarkPaid: (historyId: string) => void;
  // tasks
  addTask: (t: Omit<Task, "id" | "status" | "createdAt">) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, dir: -1 | 1) => void;
  submitTask: (taskId: string) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string) => void;
  // notifications
  markNotificationRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  pushNotification: (n: Omit<Notification, "id" | "isRead" | "createdAt">) => void;
  // settings
  updateSettings: (patch: Partial<NotificationSettings>) => void;
  // task templates
  addTemplate: (t: Omit<TaskTemplate, "id">) => void;
  removeTemplate: (id: string) => void;
  // rewards
  redeemReward: (childId: string, rewardId: string) => boolean;
  confirmRedeem: (redemptionId: string) => void;
  cancelRedeem: (redemptionId: string) => void;
  // toasts (UI演出)
  toasts: ToastItem[];
  pushToast: (t: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

const StoreContext = createContext<Ctx | null>(null);

const LOCAL_CURRENT_USER_KEY = "okq-local-current-user";

function readLocalCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(LOCAL_CURRENT_USER_KEY); } catch { return null; }
}
function writeLocalCurrentUserId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(LOCAL_CURRENT_USER_KEY, id);
    else window.localStorage.removeItem(LOCAL_CURRENT_USER_KEY);
  } catch {}
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createEmptyState());
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  // 端末ごとにログイン中のプロフィールを管理（Supabase には保存しない）
  const [localCurrentUserId, setLocalCurrentUserId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 直近のリモート適用時の参照を覚えておき、save 不要かを判定する。
  // ローカルで setState されると state の参照が変わるので、参照一致なら save スキップ。
  const remoteSnapshotRef = useRef<AppState | null>(null);

  // hydrate + rollover + realtime subscribe
  useEffect(() => {
    let cancelled = false;
    let unsubChange = () => {};
    let unsubAuth = () => {};
    // 端末ローカルの最終ログインユーザを復元
    setLocalCurrentUserId(readLocalCurrentUserId());
    (async () => {
      const loaded = await api.loadState();
      if (cancelled) return;
      const base = loaded ? mergeWithDefaults(loaded) : createEmptyState();
      const rolled = rolloverIfNeeded(base);
      // 共有 state の currentUserId は無視（端末ローカルで管理）
      setState({ ...rolled, currentUserId: null });
      setHydrated(true);
      // 他端末からの変更を受信。currentUserId は端末ローカルなので無視。
      // 適用した state の参照を覚えて、useEffect 側で「参照一致なら save 不要」と判定する。
      // ローカルで setState されると別参照になり、自動的に save が走る。
      unsubChange = api.subscribe((remote) => {
        const merged = mergeWithDefaults(remote);
        const next: AppState = { ...rolloverIfNeeded(merged), currentUserId: null };
        remoteSnapshotRef.current = next;
        setState(next);
      });
      // セッション変化（サインアウト等）
      unsubAuth = api.onAuthChange((s) => {
        if (!s) {
          setState(createEmptyState());
          setParentUnlocked(false);
          setLocalCurrentUserId(null);
          writeLocalCurrentUserId(null);
          setHydrated(false);
        }
      });
    })();
    return () => { cancelled = true; unsubChange(); unsubAuth(); };
  }, []);

  // 永続化（デバウンス）。currentUserId はサーバに送らない。
  // 直近のリモート反映と同じ参照なら save しない（エコーループ防止）。
  // ローカル操作で setState が走ると参照が変わるので、通常通り save される。
  useEffect(() => {
    if (!hydrated) return;
    if (remoteSnapshotRef.current === state) {
      remoteSnapshotRef.current = null;
      return;
    }
    remoteSnapshotRef.current = null;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void api.saveState({ ...state, currentUserId: null });
    }, 250);
  }, [state, hydrated]);

  // 権限要求トースト（hydrate 後に1回）
  useEffect(() => {
    if (!hydrated) return;
    if (!state.settings.push) return;
    if (getPermission() !== "default") return;
    setToasts((prev) => [...prev, {
      id: `tst_perm_${Date.now()}`,
      title: "通知を許可しますか？",
      message: "ONにすると、お知らせがOS通知でも届きます",
      icon: "🔔",
      tone: "info",
    }]);
  }, [hydrated, state.settings.push]);

  // リマインダー（毎分チェック）
  useEffect(() => {
    if (!hydrated) return;
    const check = () => {
      const now = new Date();
      const hhmm = hhmmLocal(now);
      const today = todayLocal(now);
      setState((s) => {
        if (!s.settings.reminder) return s;
        if (s.settings.reminderTime !== hhmm) return s;
        if (s.lastReminderDate === today) return s;
        const childIds = new Set(s.tasks.filter((t) => t.status === "active" && t.dueDate === today).map((t) => t.assignedChildId));
        if (childIds.size === 0) return { ...s, lastReminderDate: today };
        const notifs: Notification[] = Array.from(childIds).map((cid) => ({
          id: `n_rem_${Date.now()}_${cid}`, userId: cid,
          title: "今日のクエストがまだ残ってるよ！",
          message: "がんばって全部クリアしよう！",
          type: "reminder", isRead: false, createdAt: new Date().toISOString(),
        }));
        maybeFireOS(s.settings, "reminder", "今日のクエストがまだ残ってるよ！", "がんばって全部クリアしよう！");
        return { ...s, notifications: [...notifs, ...s.notifications], lastReminderDate: today };
      });
    };
    const id = setInterval(check, 60_000);
    check();
    return () => clearInterval(id);
  }, [hydrated]);

  const pushToast = useCallback((t: Omit<ToastItem, "id">) => {
    setToasts((prev) => [...prev, { ...t, id: `tst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }]);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const setCurrentUser = useCallback((id: string | null) => {
    setLocalCurrentUserId(id);
    writeLocalCurrentUserId(id);
  }, []);

  // 開発用：デモデータに置き換え。
  const resetDemo = useCallback(() => {
    const fresh = createDemoState();
    setState(fresh);
    void api.saveState(fresh);
  }, []);

  // 全データを消してオンボーディングに戻す。
  const resetAll = useCallback(async () => {
    try { await api.clear(); } catch {}
    const fresh = createEmptyState();
    setState(fresh);
    setParentUnlocked(false);
    setLocalCurrentUserId(null);
    writeLocalCurrentUserId(null);
    // parentPin が undefined になることで page 側が Onboarding を表示する
  }, []);

  // オンボーディング完了：子供プロフィール + PIN を確定。
  const completeOnboarding = useCallback(async (children: OnboardingChild[], pin: string) => {
    const pinValue = await hashPin(pin);
    const fresh = createEmptyState();
    const childUsers = children.map((c, i) => ({
      id: `c${i + 1}`,
      name: c.name.trim() || `こども${i + 1}`,
      role: "child" as const,
      avatar: c.avatar || "🧒",
      level: 1, xp: 0, xpToNext: 300,
      streakDays: 0, allowanceBalance: 0,
    }));
    const next: AppState = { ...fresh, users: [...childUsers, ...fresh.users], parentPin: pinValue };
    setState(next);
    setParentUnlocked(true); // 設定直後は親モードに入れる
    await api.saveState(next);
  }, []);

  const setPin = useCallback(async (pin: string) => {
    const pinValue = await hashPin(pin);
    setState((s) => ({ ...s, parentPin: pinValue }));
  }, []);

  const verifyPinAndUnlock = useCallback(async (pin: string): Promise<boolean> => {
    if (!state.parentPin) return false;
    const ok = await verifyPin(pin, state.parentPin);
    if (ok) setParentUnlocked(true);
    return ok;
  }, [state.parentPin]);

  const lockParent = useCallback(() => setParentUnlocked(false), []);

  const updateUser = useCallback((id: string, patch: Partial<Pick<User, "name" | "avatar">>) => {
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
  }, []);

  const markPaid = useCallback((historyIds: string[]) => {
    const ids = new Set(historyIds);
    const today = todayLocal();
    setState((s) => ({
      ...s,
      history: s.history.map((h) => (ids.has(h.id) ? { ...h, paidAt: today } : h)),
    }));
  }, []);

  const unmarkPaid = useCallback((historyId: string) => {
    setState((s) => ({
      ...s,
      history: s.history.map((h) => (h.id === historyId ? { ...h, paidAt: undefined } : h)),
    }));
  }, []);

  const signOut = useCallback(async () => {
    try { await api.signOut(); } catch {}
    setParentUnlocked(false);
  }, []);

  const pushNotification = useCallback((n: Omit<Notification, "id" | "isRead" | "createdAt">) => {
    setState((s) => ({
      ...s,
      notifications: [
        { ...n, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, isRead: false, createdAt: new Date().toISOString() },
        ...s.notifications,
      ],
    }));
  }, []);

  const addTask = useCallback((t: Omit<Task, "id" | "status" | "createdAt">) => {
    let osTitle = "", osBody = "", settings: NotificationSettings | null = null;
    setState((s) => {
      const task: Task = { ...t, id: `t_${Date.now()}`, status: "active", createdAt: todayLocal() };
      const requester = s.users.find((u) => u.id === t.requesterId);
      osTitle = `${requester?.name ?? "親"}から新しいお手伝い！`;
      osBody = `「${t.title}」が追加されたよ！`;
      settings = s.settings;
      const notif: Notification = {
        id: `n_${Date.now()}`, userId: t.assignedChildId,
        title: osTitle, message: osBody,
        type: "task", isRead: false, createdAt: new Date().toISOString(),
      };
      const taskTemplates = s.taskTemplates.map((tpl) =>
        tpl.title === t.title ? { ...tpl, usedCount: (tpl.usedCount ?? 0) + 1 } : tpl
      );
      return { ...s, tasks: [task, ...s.tasks], notifications: [notif, ...s.notifications], taskTemplates };
    });
    if (settings) maybeFireOS(settings, "newTask", osTitle, osBody);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Omit<Task, "id">>) => {
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const moveTask = useCallback((id: string, dir: -1 | 1) => {
    setState((s) => {
      const idx = s.tasks.findIndex((t) => t.id === id);
      if (idx < 0) return s;
      const next = idx + dir;
      if (next < 0 || next >= s.tasks.length) return s;
      const tasks = s.tasks.slice();
      [tasks[idx], tasks[next]] = [tasks[next], tasks[idx]];
      return { ...s, tasks };
    });
  }, []);

  const submitTask = useCallback((taskId: string) => {
    let osTitle = "", osBody = "", settings: NotificationSettings | null = null;
    setState((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      const child = s.users.find((u) => u.id === task.assignedChildId);
      osTitle = "お手伝い完了の申請が届いています！";
      osBody = `${child?.name ?? "子供"}が「${task.title}」を完了したよ`;
      settings = s.settings;
      const notif: Notification = {
        id: `n_${Date.now()}`, userId: task.requesterId,
        title: osTitle, message: osBody,
        type: "approval", isRead: false, createdAt: new Date().toISOString(),
      };
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: "submitted" } : t)),
        notifications: [notif, ...s.notifications],
      };
    });
    try { playSound("submit"); } catch {}
    if (settings) maybeFireOS(settings, "submit", osTitle, osBody);
  }, []);

  const approveTask = useCallback((taskId: string) => {
    let levelUp = false;
    let earned = 0;
    let childName = "";
    let osTitle = "", osBody = "", settings: NotificationSettings | null = null;
    setState((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      const requester = s.users.find((u) => u.id === task.requesterId);
      const users = s.users.map((u) => {
        if (u.id !== task.assignedChildId) return u;
        let xp = u.xp + Math.max(20, Math.floor(task.reward / 2));
        let level = u.level;
        let xpToNext = u.xpToNext || 500;
        while (xp >= xpToNext) { xp -= xpToNext; level += 1; xpToNext = xpToNext + 100; levelUp = true; }
        childName = u.name;
        return { ...u, allowanceBalance: u.allowanceBalance + task.reward, xp, level, xpToNext };
      });
      const hist: AllowanceHistory = {
        id: `h_${Date.now()}`, childId: task.assignedChildId, taskId: task.id,
        title: task.title, amount: task.reward, type: "earn", status: "approved",
        createdAt: todayLocal(),
      };
      osTitle = `${requester?.name ?? "親"}が承認したよ！`;
      osBody = `「${task.title}」で${task.reward}円ゲット！`;
      settings = s.settings;
      const notif: Notification = {
        id: `n_${Date.now()}`, userId: task.assignedChildId,
        title: osTitle, message: osBody,
        type: "approval", isRead: false, createdAt: new Date().toISOString(),
      };
      earned = task.reward;
      const next: AppState = {
        ...s,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: "approved" } : t)),
        users,
        history: [hist, ...s.history],
        notifications: [notif, ...s.notifications],
      };
      // バッジ評価
      const evald = evaluateBadges(next, task.assignedChildId);
      if (evald.newlyAcquired.length > 0) {
        const badgeNotifs = evald.newlyAcquired.map((b) => ({
          id: `n_${Date.now()}_${b.id}`, userId: task.assignedChildId,
          title: "🏅 バッジを獲得！", message: `「${b.title}」をゲット！`,
          type: "system" as const, isRead: false, createdAt: new Date().toISOString(),
        }));
        // toasts は副作用として後でディスパッチ
        queueMicrotask(() => {
          for (const b of evald.newlyAcquired) pushToast({ title: "バッジ獲得！", message: b.title, icon: b.icon, tone: "success" });
          try { playSound("badge"); } catch {}
        });
        return { ...evald.state, notifications: [...badgeNotifs, ...evald.state.notifications] };
      }
      return evald.state;
    });
    // 演出
    if (settings) maybeFireOS(settings, "approval", osTitle, osBody);
    queueMicrotask(() => {
      try { playSound("approve"); } catch {}
      confettiBurst({ count: 60 });
      pushToast({ title: `${childName ? childName + "が" : ""}${earned}円ゲット！`, icon: "🪙", tone: "success" });
      if (levelUp) {
        setTimeout(() => {
          try { playSound("levelup"); } catch {}
          pushToast({ title: "レベルアップ！", message: "Lv. UP 🎉", icon: "⭐", tone: "success" });
        }, 250);
      }
    });
  }, [pushToast]);

  const rejectTask = useCallback((taskId: string) => {
    let osTitle = "", osBody = "", settings: NotificationSettings | null = null;
    setState((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      osTitle = "やり直しのお願い";
      osBody = `「${task.title}」をもう一度やってみよう！`;
      settings = s.settings;
      const notif: Notification = {
        id: `n_${Date.now()}`, userId: task.assignedChildId,
        title: osTitle, message: osBody,
        type: "approval", isRead: false, createdAt: new Date().toISOString(),
      };
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: "active" } : t)),
        notifications: [notif, ...s.notifications],
      };
    });
    if (settings) maybeFireOS(settings, "approval", osTitle, osBody);
  }, []);

  const markNotificationRead = useCallback((id: string) =>
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) })), []);
  const markAllRead = useCallback((userId: string) =>
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.userId === userId || n.userId === "all" ? { ...n, isRead: true } : n)) })), []);
  const updateSettings = useCallback((patch: Partial<NotificationSettings>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })), []);

  const addTemplate = useCallback((t: Omit<TaskTemplate, "id">) =>
    setState((s) => ({ ...s, taskTemplates: [{ ...t, id: `tpl_${Date.now()}`, usedCount: t.usedCount ?? 0 }, ...s.taskTemplates] })), []);
  const removeTemplate = useCallback((id: string) =>
    setState((s) => ({ ...s, taskTemplates: s.taskTemplates.filter((t) => t.id !== id) })), []);

  const redeemReward = useCallback((childId: string, rewardId: string): boolean => {
    let success = false;
    let osTitle = "", osBody = "", settings: NotificationSettings | null = null;
    setState((s) => {
      const child = s.users.find((u) => u.id === childId);
      const reward = s.rewards.find((r) => r.id === rewardId);
      if (!child || !reward) return s;
      if (child.allowanceBalance < reward.cost) return s;
      if (reward.stock !== undefined && reward.stock <= 0) return s;
      success = true;
      const users = s.users.map((u) => (u.id === childId ? { ...u, allowanceBalance: u.allowanceBalance - reward.cost } : u));
      const rewards = s.rewards.map((r) => (r.id === rewardId && r.stock !== undefined ? { ...r, stock: r.stock - 1 } : r));
      const redemptionId = `red_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const req: RedemptionRequest = {
        id: redemptionId, childId, rewardId, cost: reward.cost, status: "pending",
        createdAt: todayLocal(),
      };
      const hist: AllowanceHistory = {
        id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, childId,
        redemptionId,
        title: `🎁 ${reward.title}`, amount: -reward.cost, type: "spend",
        status: "pending", createdAt: todayLocal(),
      };
      osTitle = "🎁 ごほうび交換の申請";
      osBody = `${child.name}が「${reward.title}」を交換したよ`;
      settings = s.settings;
      const parentNotifs: Notification[] = s.users.filter((u) => u.role !== "child").map((p) => ({
        id: `n_${Date.now()}_${p.id}`, userId: p.id,
        title: osTitle, message: osBody,
        type: "approval", isRead: false, createdAt: new Date().toISOString(),
      }));
      return { ...s, users, rewards, redemptions: [req, ...s.redemptions], history: [hist, ...s.history], notifications: [...parentNotifs, ...s.notifications] };
    });
    if (success) {
      if (settings) maybeFireOS(settings, "approval", osTitle, osBody);
      queueMicrotask(() => {
        try { playSound("spend"); } catch {}
        confettiBurst({ count: 50, colors: ["#FFE38A", "#FFB99A", "#FFD9E0"] });
      });
    }
    return success;
  }, []);

  const confirmRedeem = useCallback((redemptionId: string) => {
    setState((s) => {
      const req = s.redemptions.find((r) => r.id === redemptionId);
      if (!req) return s;
      return {
        ...s,
        redemptions: s.redemptions.map((r) => (r.id === redemptionId ? { ...r, status: "confirmed" } : r)),
        history: s.history.map((h) => (h.redemptionId === redemptionId ? { ...h, status: "approved" } : h)),
      };
    });
  }, []);

  const cancelRedeem = useCallback((redemptionId: string) => {
    setState((s) => {
      const req = s.redemptions.find((r) => r.id === redemptionId);
      if (!req || req.status !== "pending") return s;
      // 残高を戻し、対応する履歴は削除ではなく cancelled に
      const users = s.users.map((u) => (u.id === req.childId ? { ...u, allowanceBalance: u.allowanceBalance + req.cost } : u));
      const rewards = s.rewards.map((r) => (r.id === req.rewardId && r.stock !== undefined ? { ...r, stock: r.stock + 1 } : r));
      return {
        ...s, users, rewards,
        redemptions: s.redemptions.map((r) => (r.id === redemptionId ? { ...r, status: "cancelled" } : r)),
        history: s.history.map((h) => (h.redemptionId === redemptionId ? { ...h, status: "cancelled" } : h)),
      };
    });
  }, []);

  const currentUser = useMemo(() => state.users.find((u) => u.id === localCurrentUserId) ?? null, [state, localCurrentUserId]);

  const needsOnboarding = hydrated && !state.parentPin;

  const ctx: Ctx = {
    state, currentUser, setCurrentUser, resetDemo, signOut,
    hydrated, needsOnboarding, parentUnlocked,
    completeOnboarding, resetAll, setPin, verifyPinAndUnlock, lockParent,
    updateUser, markPaid, unmarkPaid,
    addTask, updateTask, deleteTask, moveTask, submitTask, approveTask, rejectTask,
    markNotificationRead, markAllRead, pushNotification, updateSettings,
    addTemplate, removeTemplate,
    redeemReward, confirmRedeem, cancelRedeem,
    toasts, pushToast, dismissToast,
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

export const REPEAT_LABELS: Record<RepeatType, string> = {
  today: "今日のみ",
  daily: "毎日",
  weekly: "曜日を指定",
  none: "繰り返しなし",
};

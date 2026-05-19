import type { AppState } from "./types";
import { todayLocal } from "./date";

const today = () => todayLocal();

// 本番運用用の「空」状態。親プリセット + テンプレ + ごほうび + バッジ枠だけ用意し、
// 子供・タスク・履歴・通知は空。parentPin も未設定なのでオンボーディングが起動する。
export const createEmptyState = (): AppState => ({
  currentUserId: null,
  users: [
    { id: "p1", name: "ママ", role: "mother", avatar: "👩", level: 0, xp: 0, xpToNext: 0, streakDays: 0, allowanceBalance: 0 },
    { id: "p2", name: "パパ", role: "father", avatar: "👨", level: 0, xp: 0, xpToNext: 0, streakDays: 0, allowanceBalance: 0 },
  ],
  tasks: [],
  history: [],
  notifications: [],
  rewards: [
    { id: "r1", title: "ゲームソフト", icon: "🎮", cost: 2000 },
    { id: "r2", title: "マンガセット", icon: "📚", cost: 1500 },
    { id: "r3", title: "文房具セット", icon: "✏️", cost: 800 },
    { id: "r4", title: "おかしパーティー", icon: "🍭", cost: 500 },
  ],
  badges: [
    { id: "b1", title: "はじめてのお手伝い", icon: "⭐", description: "初めてのお手伝い達成", acquired: false },
    { id: "b2", title: "3日連続達成", icon: "🔥", description: "3日連続でクエスト達成", acquired: false },
    { id: "b3", title: "おそうじ名人", icon: "🧹", description: "掃除タスク10回達成", acquired: false },
    { id: "b4", title: "?????", icon: "🔒", description: "もっとがんばろう", acquired: false },
  ],
  taskTemplates: [
    { id: "tpl1", title: "リビングの掃除機", icon: "🧹", reward: 50 },
    { id: "tpl2", title: "食器を洗う", icon: "🍽️", reward: 50 },
    { id: "tpl3", title: "犬の散歩", icon: "🐕", reward: 100 },
    { id: "tpl4", title: "ゴミ出し", icon: "🗑️", reward: 50 },
    { id: "tpl5", title: "お風呂掃除", icon: "🛁", reward: 100 },
    { id: "tpl6", title: "お洗濯たたみ", icon: "👕", reward: 50 },
    { id: "tpl7", title: "玄関の靴をそろえる", icon: "👟", reward: 20 },
    { id: "tpl8", title: "おつかい", icon: "🛍️", reward: 100 },
  ],
  redemptions: [],
  lastRolloverDate: today(),
  settings: {
    push: false,
    onNewTask: true,
    onSubmit: true,
    onApproval: true,
    reminder: true,
    streak: true,
    reminderTime: "18:00",
  },
});

export const createDemoState = (): AppState => ({
  currentUserId: null,
  users: [
    { id: "c1", name: "そうた", role: "child", avatar: "🧒", level: 5, xp: 350, xpToNext: 500, streakDays: 3, allowanceBalance: 1250 },
    { id: "c2", name: "みお", role: "child", avatar: "👧", level: 3, xp: 120, xpToNext: 400, streakDays: 1, allowanceBalance: 600 },
    { id: "c3", name: "はると", role: "child", avatar: "👦", level: 2, xp: 50, xpToNext: 300, streakDays: 0, allowanceBalance: 200 },
    { id: "p1", name: "ママ", role: "mother", avatar: "👩", level: 0, xp: 0, xpToNext: 0, streakDays: 0, allowanceBalance: 0 },
    { id: "p2", name: "パパ", role: "father", avatar: "👨", level: 0, xp: 0, xpToNext: 0, streakDays: 0, allowanceBalance: 0 },
  ],
  tasks: [
    { id: "t1", title: "リビングの掃除機", icon: "🧹", reward: 50, requesterId: "p1", assignedChildId: "c1", status: "approved", dueDate: today(), repeatType: "daily", weekdays: [], createdAt: today() },
    { id: "t2", title: "食器を洗う", icon: "🍽️", reward: 50, requesterId: "p1", assignedChildId: "c1", status: "approved", dueDate: today(), repeatType: "daily", weekdays: [], createdAt: today() },
    { id: "t3", title: "犬の散歩", icon: "🐕", reward: 100, requesterId: "p2", assignedChildId: "c1", status: "submitted", dueDate: today(), repeatType: "today", weekdays: [], createdAt: today() },
    { id: "t4", title: "ゴミ出し", icon: "🗑️", reward: 50, requesterId: "p1", assignedChildId: "c1", status: "active", dueDate: today(), repeatType: "weekly", weekdays: [1, 4], createdAt: today() },
    { id: "t5", title: "お風呂掃除", icon: "🛁", reward: 100, requesterId: "p2", assignedChildId: "c2", status: "submitted", dueDate: today(), repeatType: "today", weekdays: [], createdAt: today() },
  ],
  history: [
    { id: "h1", childId: "c1", taskId: "t1", title: "リビングの掃除機", amount: 50, type: "earn", status: "approved", createdAt: "2026-05-15" },
    { id: "h2", childId: "c1", taskId: "t2", title: "食器を洗う", amount: 50, type: "earn", status: "approved", createdAt: "2026-05-15" },
    { id: "h3", childId: "c1", title: "犬の散歩", amount: 100, type: "earn", status: "approved", createdAt: "2026-05-14" },
    { id: "h4", childId: "c1", title: "ゴミ出し", amount: 50, type: "earn", status: "approved", createdAt: "2026-05-14" },
    { id: "h5", childId: "c1", title: "お風呂掃除", amount: 100, type: "earn", status: "approved", createdAt: "2026-05-13" },
  ],
  notifications: [
    { id: "n1", userId: "c1", title: "ママから新しいお手伝い！", message: "「お風呂掃除」が追加されたよ！", type: "task", isRead: false, createdAt: new Date().toISOString() },
    { id: "n2", userId: "c1", title: "パパが承認したよ！", message: "「食器を洗う」で50円ゲット！", type: "approval", isRead: false, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
    { id: "n3", userId: "c1", title: "システムからのお知らせ", message: "3日連続達成！すごいね！", type: "system", isRead: true, createdAt: new Date(Date.now() - 60 * 60000).toISOString() },
    { id: "n4", userId: "all", title: "今日のクエストがまだ残ってるよ！", message: "がんばって全部クリアしよう！", type: "reminder", isRead: false, createdAt: new Date(Date.now() - 3 * 60 * 60000).toISOString() },
  ],
  taskTemplates: [
    { id: "tpl1", title: "リビングの掃除機", icon: "🧹", reward: 50 },
    { id: "tpl2", title: "食器を洗う", icon: "🍽️", reward: 50 },
    { id: "tpl3", title: "犬の散歩", icon: "🐕", reward: 100 },
    { id: "tpl4", title: "ゴミ出し", icon: "🗑️", reward: 50 },
    { id: "tpl5", title: "お風呂掃除", icon: "🛁", reward: 100 },
    { id: "tpl6", title: "お洗濯たたみ", icon: "👕", reward: 50 },
    { id: "tpl7", title: "玄関の靴をそろえる", icon: "👟", reward: 20 },
    { id: "tpl8", title: "おつかい", icon: "🛍️", reward: 100 },
  ],
  rewards: [
    { id: "r1", title: "ゲームソフト", icon: "🎮", cost: 2000 },
    { id: "r2", title: "マンガセット", icon: "📚", cost: 1500 },
    { id: "r3", title: "文房具セット", icon: "✏️", cost: 800 },
    { id: "r4", title: "おかしパーティー", icon: "🍭", cost: 500 },
  ],
  badges: [
    { id: "b1", title: "はじめてのお手伝い", icon: "⭐", description: "初めてのお手伝い達成", acquired: true },
    { id: "b2", title: "3日連続達成", icon: "🔥", description: "3日連続でクエスト達成", acquired: true },
    { id: "b3", title: "おそうじ名人", icon: "🧹", description: "掃除タスク10回達成", acquired: true },
    { id: "b4", title: "?????", icon: "🔒", description: "もっとがんばろう", acquired: false },
  ],
  redemptions: [],
  lastRolloverDate: today(),
  settings: {
    push: true,
    onNewTask: true,
    onSubmit: true,
    onApproval: true,
    reminder: true,
    streak: true,
    reminderTime: "18:00",
  },
});

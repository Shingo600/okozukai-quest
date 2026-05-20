"use client";
import React, { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { ChildNav, type ChildTab } from "./BottomNav";
import type { Task, User } from "@/lib/types";
import { Avatar } from "./Avatar";

export function ChildApp() {
  const { state, currentUser, setCurrentUser, markAllRead } = useStore();
  const [tab, setTab] = useState<ChildTab>("home");
  const [showBell, setShowBell] = useState(false);

  if (!currentUser) return null;
  const child = currentUser;

  const todaysTasks = state.tasks.filter((t) => t.assignedChildId === child.id);
  const myNotifications = state.notifications.filter((n) => n.userId === child.id || n.userId === "all");
  const unread = myNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-kid-bg pb-24">
      <Header child={child} unread={unread} onBell={() => { setShowBell(true); markAllRead(child.id); }} onSwitch={() => setCurrentUser(null)} />
      {tab === "home" && <ChildHome child={child} tasks={todaysTasks} />}
      {tab === "quest" && <QuestPage child={child} />}
      {tab === "bonus" && <BonusList child={child} />}
      {tab === "history" && <HistoryPage child={child} />}
      {tab === "mypage" && <MyPage child={child} />}
      <ChildNav tab={tab} onChange={setTab} pendingCount={unread} />
      {showBell && <NotificationsModal notifications={myNotifications} onClose={() => setShowBell(false)} />}
    </div>
  );
}

function Header({ child, unread, onBell, onSwitch }: { child: User; unread: number; onBell: () => void; onSwitch: () => void }) {
  return (
    <div className="px-5 pt-2 pb-3 flex items-center justify-between">
      <button onClick={onSwitch} className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center text-lg">☰</button>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-600">{child.name}</span>
        <button onClick={onBell} className="relative w-10 h-10 rounded-full bg-white/70 flex items-center justify-center text-lg">
          🔔
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center">{unread}</span>}
        </button>
      </div>
    </div>
  );
}

function ChildHome({ child, tasks }: { child: User; tasks: Task[] }) {
  const { submitTask, state } = useStore();
  const mother = state.users.find((u) => u.role === "mother");
  const todayEarnPlan = tasks.filter((t) => t.status === "active" || t.status === "submitted").reduce((a, t) => a + t.reward, 0);

  return (
    <div className="px-4 space-y-4">
      <div className="flex items-start gap-3">
        <Avatar avatar={mother?.avatar ?? "👩"} size={56} />
        <div className="relative bg-white rounded-2xl px-4 py-3 shadow-soft text-sm flex-1">
          <div>おはよう！</div>
          <div>今日もお手伝いよろしくね♪</div>
          <div className="absolute -left-2 top-4 w-3 h-3 bg-white rotate-45" />
        </div>
      </div>

      <div className="relative">
        <div className="bg-pink-300 text-white text-sm font-bold rounded-full px-4 py-1 inline-block shadow">🚩 今日のクエスト</div>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 && <EmptyMsg msg="今日のクエストはまだないよ" />}
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} onDone={() => submitTask(t.id)} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat title="今日の獲得予定" amount={todayEarnPlan} icon="🪙" color="bg-kid-yellow/50" />
        <Stat title="おこづかい残高" amount={child.allowanceBalance} icon="💰" color="bg-pink-200/60" />
      </div>
    </div>
  );
}

function TaskRow({ task, onDone }: { task: Task; onDone: () => void }) {
  const { state } = useStore();
  const isDone = task.status === "approved";
  const isSubmitted = task.status === "submitted";
  const isRejected = task.status === "rejected";
  const requester = state.users.find((u) => u.id === task.requesterId);
  return (
    <div className="card flex items-center px-3 py-3 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-kid-yellow/40 flex items-center justify-center text-2xl">{task.icon}</div>
      <div className="flex-1">
        <div className="font-bold text-gray-800 text-sm">{task.title}</div>
        <div className="text-xs text-gray-500">🪙 {task.reward}円 ・ {requester?.name}</div>
      </div>
      {isDone ? (
        <span className="pill bg-green-100 text-green-700">できた！</span>
      ) : isSubmitted ? (
        <span className="pill bg-amber-100 text-amber-700">申請中</span>
      ) : isRejected ? (
        <span className="pill bg-rose-100 text-rose-600">やり直し</span>
      ) : (
        <button onClick={onDone} className="btn-primary-kid text-xs">できた！</button>
      )}
    </div>
  );
}

function Stat({ title, amount, icon, color }: { title: string; amount: number; icon: string; color: string }) {
  return (
    <div className={`card px-4 py-3 ${color}`}>
      <div className="text-xs text-gray-600">{title}</div>
      <div className="flex items-end gap-1 mt-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xl font-extrabold text-gray-800">{amount.toLocaleString()}</span>
        <span className="text-xs font-bold text-gray-600">円</span>
      </div>
    </div>
  );
}

function QuestPage({ child }: { child: User }) {
  const { state } = useStore();
  const myTasks = state.tasks.filter((t) => t.assignedChildId === child.id);
  const father = state.users.find((u) => u.role === "father");
  const pct = Math.min(100, Math.round((child.xp / Math.max(1, child.xpToNext)) * 100));
  return (
    <div className="px-4 space-y-4">
      <div className="card px-4 py-4 bg-gradient-to-b from-white to-emerald-50 text-center">
        <div className="inline-block bg-kid-green text-white text-xs font-bold rounded-full px-3 py-1">お手伝いレベル</div>
        <div className="my-2 flex justify-center"><Avatar avatar={child.avatar} size={80} /></div>
        <div className="text-3xl font-extrabold text-gray-800">Lv. {child.level}</div>
        <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-kid-yellow to-orange-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-gray-500 mt-1">つぎのレベルまで あと{Math.max(0, child.xpToNext - child.xp)}XP</div>
      </div>

      <div className="card px-4 py-3 bg-gradient-to-r from-rose-100 to-amber-100 flex items-center gap-3">
        <span className="text-2xl">🔥</span>
        <div className="flex-1">
          <div className="text-xs text-gray-600">連続達成</div>
          <div className="text-2xl font-extrabold text-rose-500">{child.streakDays}日</div>
          <div className="text-xs text-gray-500">すごい！この調子！</div>
        </div>
        <span className="text-3xl">🎁</span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-gray-700">バッジ</div>
          <span className="text-xs text-gray-400">もっと見る ›</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {state.badges.map((b) => (
            <div key={b.id} className={`card text-center px-2 py-3 ${b.acquired ? "" : "opacity-40 grayscale"}`}>
              <div className="text-2xl">{b.icon}</div>
              <div className="text-[10px] text-gray-600 mt-1 leading-tight">{b.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card px-3 py-3">
        <div className="font-bold text-gray-700 mb-2 text-sm">クエスト履歴</div>
        <div className="space-y-1">
          {myTasks.slice(0, 6).map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-1">
              <div className="flex items-center gap-2"><span>{t.icon}</span><span>{t.title}</span></div>
              <span className="text-xs text-gray-500">{t.status === "approved" ? "完了" : t.status === "submitted" ? "申請中" : "未"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Avatar avatar={father?.avatar ?? "👨"} size={56} />
        <div className="relative bg-white rounded-2xl px-4 py-3 shadow-soft text-sm flex-1">
          <div>いつもありがとう！</div>
          <div>助かってるよ</div>
          <div>この調子でがんばろう！👍</div>
        </div>
      </div>
    </div>
  );
}

function BonusList({ child }: { child: User }) {
  const { state } = useStore();
  // level 昇順
  const bonuses = useMemo(() => state.levelBonuses.slice().sort((a, b) => a.level - b.level), [state.levelBonuses]);
  // childId ごとの最新 claim を bonusId → claim でマップ化
  const myClaims = useMemo(() => state.bonusClaims.filter((c) => c.childId === child.id), [state.bonusClaims, child.id]);
  const claimByBonusId = useMemo(() => {
    const m: Record<string, typeof myClaims[number]> = {};
    for (const c of myClaims) {
      // cancelled 以外を優先
      const cur = m[c.bonusId];
      if (!cur) m[c.bonusId] = c;
      else if (cur.status === "cancelled" && c.status !== "cancelled") m[c.bonusId] = c;
    }
    return m;
  }, [myClaims]);

  const pct = Math.min(100, Math.round((child.xp / Math.max(1, child.xpToNext)) * 100));

  return (
    <div className="px-4 space-y-4">
      <div className="card px-4 py-4 bg-gradient-to-b from-white to-amber-50 text-center">
        <div className="inline-block bg-kid-green text-white text-xs font-bold rounded-full px-3 py-1">レベルアップボーナス</div>
        <div className="flex items-center justify-between mt-3">
          <div className="text-left">
            <div className="text-xs text-gray-500">いまのレベル</div>
            <div className="text-3xl font-extrabold text-gray-800">Lv. {child.level}</div>
          </div>
          <div className="text-5xl">🌟</div>
        </div>
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-kid-yellow to-orange-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[11px] text-gray-500 mt-1">つぎのレベルまで あと {Math.max(0, child.xpToNext - child.xp)} XP</div>
      </div>

      <div className="font-bold text-gray-700 text-sm">達成でもらえるボーナス</div>
      <div className="space-y-2">
        {bonuses.length === 0 && <div className="card px-4 py-6 text-center text-sm text-gray-400">親がまだボーナスを設定していません</div>}
        {bonuses.map((b) => {
          const claim = claimByBonusId[b.id];
          const reached = child.level >= b.level;
          const pending = reached && claim && claim.status === "pending";
          const confirmed = claim && claim.status === "confirmed";
          let badge: { text: string; className: string };
          if (confirmed) badge = { text: "✓ 受け取り済", className: "bg-emerald-100 text-emerald-700" };
          else if (pending) badge = { text: "🎁 親が確認中", className: "bg-amber-100 text-amber-700" };
          else if (reached) badge = { text: "達成済", className: "bg-emerald-50 text-emerald-600" };
          else badge = { text: `🔒 Lv.${b.level} で解放`, className: "bg-gray-100 text-gray-400" };
          return (
            <div key={b.id} className={`card flex items-center gap-3 px-3 py-3 ${!reached ? "opacity-70" : ""}`}>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">{b.icon ?? "🌟"}</div>
              <div className="flex-1">
                <div className="font-bold text-sm">Lv.{b.level} {b.title ? <span className="text-gray-600">・ {b.title}</span> : null}</div>
                <div className="text-xs text-amber-600 font-bold">🪙 {b.reward.toLocaleString()}円</div>
              </div>
              <span className={`pill ${badge.className}`}>{badge.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPage({ child }: { child: User }) {
  const { state } = useStore();
  const mine = state.history.filter((h) => h.childId === child.id);
  const totalThisMonth = useMemo(() => mine.filter((h) => h.type === "earn" && h.status === "approved").reduce((a, h) => a + h.amount, 0), [mine]);
  // 未払い計算は ParentApp の UnpaidSummary 側で実施
  return (
    <div className="px-4 space-y-4">
      <div className="card px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-gray-700">今月の獲得額</div>
          <span className="text-xs text-gray-400">今月 ▾</span>
        </div>
        <div className="text-3xl font-extrabold text-gray-800 mt-1">{totalThisMonth.toLocaleString()}円</div>
      </div>
      <div className="space-y-2">
        {mine.map((h) => {
          const isSpend = h.type === "spend";
          const isEarn = h.type === "earn";
          const isCancelled = h.status === "cancelled";
          const paid = !!h.paidAt;
          return (
            <div key={h.id} className={`card flex items-center gap-3 px-3 py-3 ${isCancelled ? "opacity-60" : ""}`}>
              <div className="text-xs text-gray-500 w-12">{h.createdAt.slice(5)}</div>
              <Avatar avatar={child.avatar} size={32} />
              <div className="flex-1">
                <div className={`font-bold text-sm ${isCancelled ? "line-through" : ""}`}>{h.title}</div>
                <div className={`text-xs ${isCancelled ? "text-gray-400" : h.status === "approved" ? "text-green-600" : "text-amber-600"}`}>
                  {isCancelled ? "キャンセル済" : h.status === "approved" ? "承認済み" : "未確定"}
                  {isEarn && !isCancelled && (paid ? <span className="ml-2 text-blue-600">💰 支払い済</span> : <span className="ml-2 text-gray-400">貯金中</span>)}
                </div>
              </div>
              <div className={`font-bold ${isCancelled ? "text-gray-400 line-through" : isSpend ? "text-rose-500" : "text-green-600"}`}>{isSpend ? "" : "+"}{h.amount}円</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MyPage({ child }: { child: User }) {
  const { setCurrentUser, state, updateSettings } = useStore();
  return (
    <div className="px-4 space-y-3">
      <div className="card px-4 py-5 text-center">
        <div className="flex justify-center"><Avatar avatar={child.avatar} size={80} /></div>
        <div className="font-extrabold text-lg mt-2">{child.name}</div>
        <div className="text-xs text-gray-500">Lv.{child.level} ・ {child.streakDays}日連続</div>
      </div>
      <ToggleRow label="リマインド通知" value={state.settings.reminder} onChange={(v) => updateSettings({ reminder: v })} />
      <ToggleRow label="承認通知" value={state.settings.onApproval} onChange={(v) => updateSettings({ onApproval: v })} />
      <button onClick={() => setCurrentUser(null)} className="w-full card px-4 py-3 text-sm font-bold text-rose-500">ユーザー切替へ戻る</button>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="card flex items-center justify-between px-4 py-3">
      <div className="text-sm font-bold text-gray-700">{label}</div>
      <button onClick={() => onChange(!value)} className={`w-12 h-7 rounded-full p-0.5 transition ${value ? "bg-green-400" : "bg-gray-300"}`}>
        <div className={`w-6 h-6 bg-white rounded-full transition ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return <div className="card px-4 py-6 text-center text-sm text-gray-400">{msg}</div>;
}

function NotificationsModal({ notifications, onClose }: { notifications: import("@/lib/types").Notification[]; onClose: () => void }) {
  const [filter, setFilter] = useState<"all" | "task" | "approval" | "system">("all");
  const list = notifications.filter((n) => filter === "all" || n.type === filter);
  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-center text-xs text-gray-400 mb-2">アプリ内通知</div>
        <div className="flex gap-2 mb-3 text-xs">
          {[
            { k: "all", label: "すべて" },
            { k: "task", label: "お知らせ" },
            { k: "approval", label: "申請" },
            { k: "system", label: "その他" },
          ].map((b) => (
            <button key={b.k} onClick={() => setFilter(b.k as typeof filter)} className={`pill ${filter === b.k ? "bg-parent-purple text-white" : "bg-gray-100 text-gray-500"}`}>{b.label}</button>
          ))}
        </div>
        <div className="space-y-2">
          {list.map((n) => (
            <div key={n.id} className="card px-3 py-3 flex gap-3">
              <div className="text-2xl">{n.type === "task" ? "📩" : n.type === "approval" ? "✅" : n.type === "reminder" ? "⏰" : "ℹ️"}</div>
              <div className="flex-1">
                <div className="text-sm font-bold">{n.title}</div>
                <div className="text-xs text-gray-500">{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

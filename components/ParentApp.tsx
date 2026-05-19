"use client";
import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { ParentNav, type ParentTab } from "./BottomNav";
import type { RepeatType, Task, User } from "@/lib/types";
import { todayLocal } from "@/lib/date";
import { requestNotificationPermission, getPermission } from "@/lib/notify";

export function ParentApp() {
  const { state, currentUser, setCurrentUser, approveTask, rejectTask } = useStore();
  const [tab, setTab] = useState<ParentTab>("home");
  const [editing, setEditing] = useState<Task | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  if (!currentUser) return null;

  const pending = state.tasks.filter((t) => t.status === "submitted");
  const approved = state.tasks.filter((t) => t.status === "approved");
  const planned = state.tasks.reduce((a, t) => a + t.reward, 0);
  const paid = approved.reduce((a, t) => a + t.reward, 0);
  const ratio = planned > 0 ? Math.round((paid / planned) * 100) : 0;
  const pendingRedemptions = state.redemptions.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-parent-bg pb-24">
      <div className="px-5 pt-2 pb-3 flex items-center justify-between">
        <button onClick={() => setCurrentUser(null)} className="w-10 h-10 rounded-full bg-white/70 text-lg">←</button>
        <div className="text-sm font-bold text-parent-purpleDeep">親ダッシュボード 👨‍👩</div>
        <div className="w-10" />
      </div>

      {tab === "home" && (
        <ParentHome
          planned={planned}
          paid={paid}
          ratio={ratio}
          pending={pending}
          onApprove={approveTask}
          onReject={rejectTask}
          onAdd={() => setShowAdd(true)}
        />
      )}
      {tab === "task" && <TaskListPage onAdd={() => setShowAdd(true)} onEdit={(t) => setEditing(t)} />}
      {tab === "approval" && <ApprovalPage onApprove={approveTask} onReject={rejectTask} />}
      {tab === "history" && <ParentHistory />}
      {tab === "settings" && <SettingsPage user={currentUser} />}

      <ParentNav tab={tab} onChange={setTab} pendingCount={pending.length + pendingRedemptions.length} />
      {showAdd && <TaskFormModal mode="create" requesterId={currentUser.id} onClose={() => setShowAdd(false)} />}
      {editing && <TaskFormModal mode="edit" task={editing} requesterId={editing.requesterId} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ParentHome({
  planned, paid, ratio, pending, onApprove, onReject, onAdd,
}: { planned: number; paid: number; ratio: number; pending: Task[]; onApprove: (id: string) => void; onReject: (id: string) => void; onAdd: () => void }) {
  const { state } = useStore();
  return (
    <div className="px-4 space-y-4">
      <div className="card px-4 py-4 bg-gradient-to-b from-white to-[#efe7f6]">
        <div className="text-sm font-bold text-parent-purpleDeep">🪙 今月の小遣い状況</div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex-1 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">支払い予定額</span><span className="font-bold">{planned.toLocaleString()}円</span></div>
            <div className="flex justify-between"><span className="text-gray-500">支払い済み</span><span className="font-bold">{paid.toLocaleString()}円</span></div>
          </div>
          <Donut percent={ratio} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="font-bold text-gray-700">承認待ちタスク</div>
        <span className="bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pending.length}</span>
      </div>
      <div className="space-y-2">
        {pending.length === 0 && <div className="card px-4 py-6 text-center text-sm text-gray-400">承認待ちはありません</div>}
        {pending.map((t) => {
          const child = state.users.find((u) => u.id === t.assignedChildId);
          return (
            <div key={t.id} className="card px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{child?.avatar}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{t.title}</div>
                  <div className="text-xs text-gray-500">{child?.name} から申請</div>
                </div>
                <div className="font-bold">{t.reward}円</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => onApprove(t.id)} className="btn-primary-parent text-xs py-2">承認する</button>
                <button onClick={() => onReject(t.id)} className="rounded-full bg-rose-100 text-rose-600 font-bold text-xs py-2">やり直し</button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onAdd} className="w-full btn-primary-parent flex items-center justify-center gap-2 py-3">
        タスクを追加する ＋
      </button>
    </div>
  );
}

function Donut({ percent }: { percent: number }) {
  const r = 28; const c = 2 * Math.PI * r;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} stroke="#eee" strokeWidth="10" fill="none" />
      <circle cx="40" cy="40" r={r} stroke="#7C5BC7" strokeWidth="10" fill="none" strokeDasharray={c} strokeDashoffset={c - (c * percent) / 100} strokeLinecap="round" transform="rotate(-90 40 40)" />
      <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="800" fill="#7C5BC7">{percent}%</text>
    </svg>
  );
}

function TaskListPage({ onAdd, onEdit }: { onAdd: () => void; onEdit: (t: Task) => void }) {
  const { state, deleteTask, moveTask } = useStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <div className="px-4 space-y-2">
      <div className="flex justify-between items-center">
        <div className="font-bold">タスク一覧（{state.tasks.length}）</div>
        <button onClick={onAdd} className="btn-primary-parent text-xs">＋ 追加</button>
      </div>
      {state.tasks.map((t, idx) => {
        const child = state.users.find((u) => u.id === t.assignedChildId);
        const statusLabel = ({ active: "未着手", submitted: "申請中", approved: "完了", rejected: "やり直し" } as Record<string, string>)[t.status];
        return (
          <div key={t.id} className="card px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{t.icon}</div>
              <div className="flex-1">
                <div className="font-bold text-sm">{t.title}</div>
                <div className="text-xs text-gray-500">{child?.name} ・ {t.reward}円 ・ {statusLabel}</div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => moveTask(t.id, -1)} disabled={idx === 0} className="text-xs w-6 h-6 rounded bg-gray-100 disabled:opacity-30">↑</button>
                <button onClick={() => moveTask(t.id, 1)} disabled={idx === state.tasks.length - 1} className="text-xs w-6 h-6 rounded bg-gray-100 disabled:opacity-30">↓</button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => onEdit(t)} className="rounded-full bg-parent-purple/20 text-parent-purpleDeep font-bold text-xs py-2">編集</button>
              <button onClick={() => setConfirmId(t.id)} className="rounded-full bg-rose-100 text-rose-600 font-bold text-xs py-2">削除</button>
            </div>
            {confirmId === t.id && (
              <div className="mt-2 text-xs bg-rose-50 rounded-xl p-2 flex items-center justify-between">
                <span>本当に削除しますか？</span>
                <div className="flex gap-1">
                  <button onClick={() => { deleteTask(t.id); setConfirmId(null); }} className="pill bg-rose-500 text-white">削除</button>
                  <button onClick={() => setConfirmId(null)} className="pill bg-gray-200 text-gray-600">やめる</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ApprovalPage({ onApprove, onReject }: { onApprove: (id: string) => void; onReject: (id: string) => void }) {
  const { state, confirmRedeem, cancelRedeem } = useStore();
  const pending = state.tasks.filter((t) => t.status === "submitted");
  const reds = state.redemptions.filter((r) => r.status === "pending");
  return (
    <div className="px-4 space-y-3">
      <div className="font-bold">承認待ち（タスク {pending.length} / 交換 {reds.length}）</div>

      {pending.length === 0 && reds.length === 0 && <div className="card px-4 py-6 text-center text-sm text-gray-400">承認待ちはありません</div>}

      {pending.map((t) => {
        const child = state.users.find((u) => u.id === t.assignedChildId);
        return (
          <div key={t.id} className="card px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{child?.avatar}</div>
              <div className="flex-1">
                <div className="font-bold text-sm">{t.icon} {t.title}</div>
                <div className="text-xs text-gray-500">{child?.name} ・ {t.reward}円</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => onApprove(t.id)} className="btn-primary-parent text-xs py-2">承認する</button>
              <button onClick={() => onReject(t.id)} className="rounded-full bg-rose-100 text-rose-600 font-bold text-xs py-2">やり直し</button>
            </div>
          </div>
        );
      })}

      {reds.map((r) => {
        const child = state.users.find((u) => u.id === r.childId);
        const reward = state.rewards.find((rw) => rw.id === r.rewardId);
        return (
          <div key={r.id} className="card px-3 py-3 bg-amber-50">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎁</div>
              <div className="flex-1">
                <div className="font-bold text-sm">{reward?.icon} {reward?.title}</div>
                <div className="text-xs text-gray-500">{child?.name} ・ {r.cost.toLocaleString()}円</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => confirmRedeem(r.id)} className="btn-primary-parent text-xs py-2">受渡し完了</button>
              <button onClick={() => cancelRedeem(r.id)} className="rounded-full bg-rose-100 text-rose-600 font-bold text-xs py-2">取消（返金）</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ParentHistory() {
  const { state } = useStore();
  const approvedTotal = state.history.filter((h) => h.status === "approved" && h.type === "earn").reduce((a, h) => a + h.amount, 0);
  const pendingTotal = state.history.filter((h) => h.status === "pending").reduce((a, h) => a + Math.abs(h.amount), 0);
  return (
    <div className="px-4 space-y-3">
      <div className="card px-4 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">今月の獲得額</div>
          <div className="text-2xl font-extrabold">{approvedTotal.toLocaleString()}円</div>
        </div>
        <div className="text-right text-xs">
          <div className="text-emerald-500">● 承認済み {approvedTotal.toLocaleString()}円</div>
          <div className="text-rose-400">● 未確定 {pendingTotal.toLocaleString()}円</div>
        </div>
      </div>
      <div className="space-y-2">
        {state.history.map((h) => {
          const child = state.users.find((u) => u.id === h.childId);
          const isSpend = h.type === "spend";
          return (
            <div key={h.id} className="card flex items-center gap-3 px-3 py-3">
              <div className="text-xs text-gray-500 w-12">{h.createdAt.slice(5)}</div>
              <div className="text-2xl">{child?.avatar}</div>
              <div className="flex-1">
                <div className="font-bold text-sm">{h.title}</div>
                <div className={`text-xs ${h.status === "approved" ? "text-green-600" : "text-amber-600"}`}>{h.status === "approved" ? "承認済み" : "未確定"}</div>
              </div>
              <div className={`font-bold ${isSpend ? "text-rose-500" : "text-green-600"}`}>{isSpend ? "" : "+"}{h.amount}円</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsPage({ user }: { user: User }) {
  const { state, updateSettings, resetDemo, signOut } = useStore();
  const s = state.settings;
  return (
    <div className="px-4 space-y-3">
      <div className="card px-4 py-4 flex items-center gap-3">
        <div className="text-3xl">{user.avatar}</div>
        <div>
          <div className="font-bold">{user.name}</div>
          <div className="text-xs text-gray-500">通知設定</div>
        </div>
      </div>
      <ToggleRow label="プッシュ通知を受け取る" value={s.push} onChange={async (v) => {
        updateSettings({ push: v });
        if (v) await requestNotificationPermission();
      }} />
      {s.push && getPermission() === "denied" && (
        <div className="text-[11px] text-rose-500 px-2 -mt-2">ブラウザ設定で通知がブロックされています。ブラウザ設定から許可してください。</div>
      )}
      <div className="text-xs text-gray-400 px-2 mt-2">受け取る通知</div>
      <ToggleRow label="新しいお手伝いが追加されたとき" value={s.onNewTask} onChange={(v) => updateSettings({ onNewTask: v })} />
      <ToggleRow label="お手伝いの申請が届いたとき" value={s.onSubmit} onChange={(v) => updateSettings({ onSubmit: v })} />
      <ToggleRow label="承認・却下されたとき" value={s.onApproval} onChange={(v) => updateSettings({ onApproval: v })} />
      <ToggleRow label="リマインド通知（未完了タスク）" value={s.reminder} onChange={(v) => updateSettings({ reminder: v })} />
      <ToggleRow label="連続達成ボーナス通知" value={s.streak} onChange={(v) => updateSettings({ streak: v })} />
      <div className="card flex items-center justify-between px-4 py-3">
        <div className="text-sm font-bold">リマインド通知の時間</div>
        <input
          type="time"
          value={s.reminderTime}
          onChange={(e) => updateSettings({ reminderTime: e.target.value })}
          className="text-sm font-bold bg-transparent text-parent-purpleDeep"
        />
      </div>
      <button onClick={() => { if (confirm("デモデータを初期化しますか？")) resetDemo(); }} className="w-full text-xs text-rose-400 underline mt-4">デモデータを初期化</button>
      <button onClick={() => { if (confirm("サインアウトしますか？")) void signOut(); }} className="w-full text-xs text-gray-500 underline mt-1">サインアウト</button>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="card flex items-center justify-between px-4 py-3">
      <div className="text-sm font-bold text-gray-700">{label}</div>
      <button onClick={() => onChange(!value)} className={`w-12 h-7 rounded-full p-0.5 transition ${value ? "bg-emerald-400" : "bg-gray-300"}`}>
        <div className={`w-6 h-6 bg-white rounded-full transition ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function TaskFormModal({
  mode, task, requesterId, onClose,
}: { mode: "create" | "edit"; task?: Task; requesterId: string; onClose: () => void }) {
  const { state, addTask, updateTask, addTemplate, removeTemplate } = useStore();
  const children = state.users.filter((u) => u.role === "child");
  const [title, setTitle] = useState(task?.title ?? "");
  const [icon, setIcon] = useState(task?.icon ?? "✨");
  const [reward, setReward] = useState(task?.reward ?? 100);
  const [assigned, setAssigned] = useState(task?.assignedChildId ?? children[0]?.id ?? "");
  const [repeat, setRepeat] = useState<RepeatType>(task?.repeatType ?? "today");
  const [weekdays, setWeekdays] = useState<number[]>(task?.weekdays?.length ? task.weekdays : [1, 2, 3, 4, 5]);
  const [memo, setMemo] = useState(task?.memo ?? "");
  const [manageTpl, setManageTpl] = useState(false);

  const sortedTemplates = useMemo(
    () => state.taskTemplates.slice().sort((a, b) => (b.usedCount ?? 0) - (a.usedCount ?? 0)),
    [state.taskTemplates],
  );

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]));

  const pickTemplate = (tplId: string) => {
    const tpl = state.taskTemplates.find((t) => t.id === tplId);
    if (!tpl) return;
    setTitle(tpl.title);
    setIcon(tpl.icon);
    setReward(tpl.reward);
  };

  const saveAsTemplate = () => {
    if (!title.trim()) return;
    addTemplate({ title: title.trim(), icon, reward });
  };

  const save = () => {
    if (!title.trim() || !assigned) return;
    const payload = {
      title: title.trim(),
      icon,
      reward,
      assignedChildId: assigned,
      repeatType: repeat,
      weekdays: repeat === "weekly" ? weekdays : [],
      memo,
    };
    if (mode === "edit" && task) {
      updateTask(task.id, payload);
    } else {
      addTask({
        ...payload,
        requesterId,
        dueDate: todayLocal(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={onClose} className="text-parent-purpleDeep text-sm">キャンセル</button>
          <div className="font-bold">{mode === "edit" ? "タスクを編集" : "タスクを追加する"}</div>
          <button onClick={save} className="text-parent-purpleDeep text-sm font-bold">保存</button>
        </div>
        <div className="px-4 py-4 space-y-4 text-sm">
          {mode === "create" && (
            <Field label={
              <div className="flex items-center justify-between">
                <span>よく使うタスクから選ぶ</span>
                <button onClick={() => setManageTpl((v) => !v)} className="text-[11px] text-parent-purpleDeep underline">{manageTpl ? "完了" : "編集"}</button>
              </div>
            }>
              <div className="flex gap-2 overflow-x-auto scroll-no-bar -mx-1 px-1 pb-1">
                {sortedTemplates.length === 0 && <div className="text-xs text-gray-400">登録されたタスクはありません</div>}
                {sortedTemplates.map((tpl) => (
                  <div key={tpl.id} className="relative shrink-0">
                    <button
                      onClick={() => pickTemplate(tpl.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-2 border text-xs font-bold transition ${title === tpl.title ? "bg-parent-purple text-white border-parent-purple" : "bg-white text-gray-700 border-gray-200"}`}
                    >
                      <span className="text-base">{tpl.icon}</span>
                      <span>{tpl.title}</span>
                      <span className="text-[10px] opacity-70">{tpl.reward}円</span>
                    </button>
                    {manageTpl && (
                      <button
                        onClick={() => removeTemplate(tpl.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] leading-none flex items-center justify-center shadow"
                        aria-label="削除"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Field>
          )}
          <Field label="タスク名">
            <div className="flex gap-2">
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 2) || "✨")}
                className="w-14 border rounded-xl px-2 py-2 text-center text-xl"
                aria-label="アイコン"
              />
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例）お風呂掃除" className="flex-1 border rounded-xl px-3 py-2" />
            </div>
            <button type="button" onClick={saveAsTemplate} disabled={!title.trim()}
              className="mt-2 text-[11px] text-parent-purpleDeep underline disabled:text-gray-300">
              ＋ この内容をよく使うタスクに登録
            </button>
          </Field>
          <Field label="金額">
            <div className="flex items-center gap-1">
              <input type="number" value={reward} onChange={(e) => setReward(Number(e.target.value))} placeholder="例）100" className="w-full border rounded-xl px-3 py-2" />
              <span>円</span>
            </div>
          </Field>
          <Field label="担当する子ども">
            <div className="flex gap-3">
              {children.map((c) => (
                <button key={c.id} onClick={() => setAssigned(c.id)} className={`flex flex-col items-center text-xs ${assigned === c.id ? "text-parent-purpleDeep font-bold" : "text-gray-500"}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${assigned === c.id ? "bg-emerald-100 ring-2 ring-emerald-300" : "bg-gray-100"}`}>{c.avatar}</div>
                  <div className="mt-1">{c.name}</div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="期間・繰り返し">
            <div className="space-y-2">
              {(["today", "daily", "weekly", "none"] as RepeatType[]).map((r) => (
                <label key={r} className="flex items-center gap-2">
                  <input type="radio" checked={repeat === r} onChange={() => setRepeat(r)} />
                  <span>{({ today: "今日のみ", daily: "毎日", weekly: "曜日を指定", none: "繰り返しなし（1回のみ）" } as Record<RepeatType, string>)[r]}</span>
                </label>
              ))}
              {repeat === "weekly" && (
                <div className="flex gap-1 mt-2">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                    <button key={d} onClick={() => toggleDay(i)} className={`w-8 h-8 rounded-full text-xs font-bold ${weekdays.includes(i) ? "bg-parent-purple text-white" : "bg-gray-100 text-gray-500"}`}>{d}</button>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="メモ（任意）">
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例）きれいにやってね！" className="w-full border rounded-xl px-3 py-2" />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </div>
  );
}

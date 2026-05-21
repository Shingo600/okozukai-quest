import type { AppState } from "../types";
import type { DataAdapter } from "./types";
import { getSupabase, hasSupabaseConfig } from "../supabaseClient";

const TABLE = "family_states";
const SNAP_TABLE = "family_state_snapshots";

// ブラウザタブごとに固有のクライアント ID。
// 保存時にペイロードに埋め込み、Realtime 受信時に自分のエコーを判定する。
const CLIENT_ID = (typeof crypto !== "undefined" && "randomUUID" in crypto)
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2) + Date.now().toString(36);

interface StoredEnvelope extends AppState {
  _meta?: { client: string; ts: number };
}

function stripMeta(s: StoredEnvelope): AppState {
  const { _meta, ...rest } = s;
  void _meta;
  return rest as AppState;
}

async function requireUserId(): Promise<string> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("not signed in");
  return uid;
}

export const supabaseAdapter: DataAdapter = {
  async getSession() {
    if (!hasSupabaseConfig()) return null;
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (!s) return null;
    return { userId: s.user.id, email: s.user.email ?? undefined };
  },

  onAuthChange(cb) {
    if (!hasSupabaseConfig()) return () => {};
    const supabase = getSupabase();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session ? { userId: session.user.id, email: session.user.email ?? undefined } : null);
    });
    return () => sub.subscription.unsubscribe();
  },

  async signIn(email, password) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signUp(email, password) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  async signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  },

  async loadState() {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from(TABLE)
      .select("state")
      .eq("family_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return stripMeta(data.state as StoredEnvelope);
  },

  async saveState(state) {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const payload: StoredEnvelope = { ...state, _meta: { client: CLIENT_ID, ts: Date.now() } };
    const { error } = await supabase
      .from(TABLE)
      .upsert({ family_id: userId, state: payload }, { onConflict: "family_id" });
    if (error) throw error;
  },

  async clear() {
    const supabase = getSupabase();
    const userId = await requireUserId();
    await supabase.from(TABLE).delete().eq("family_id", userId);
  },

  // --- スナップショット ---
  async listSnapshots() {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from(SNAP_TABLE)
      .select("id, label, created_at")
      .eq("family_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      // テーブル未作成のときは静かに空リストを返す（初回は普通）
      if (/does not exist|relation .* does not exist/i.test(error.message)) {
        console.warn("family_state_snapshots テーブルが未作成です。supabase/snapshots.sql を適用してください。");
        return [];
      }
      throw error;
    }
    return (data ?? []).map((r) => ({
      id: r.id as string,
      label: (r.label as string | null) ?? undefined,
      createdAt: r.created_at as string,
    }));
  },

  async createSnapshot(state, label) {
    const supabase = getSupabase();
    const userId = await requireUserId();
    // _meta は AppState 外の付帯情報。スナップショットには含めずクリーンに保存
    const { error: insErr, data: ins } = await supabase
      .from(SNAP_TABLE)
      .insert({ family_id: userId, state, label: label ?? null })
      .select("id, label, created_at")
      .single();
    if (insErr) {
      if (/does not exist|relation .* does not exist/i.test(insErr.message)) {
        throw new Error("バックアップ用テーブルが未作成です。supabase/snapshots.sql を Supabase で実行してください。");
      }
      throw insErr;
    }
    // 30件超過分を古い順に削除
    const { data: extra, error: selErr } = await supabase
      .from(SNAP_TABLE)
      .select("id")
      .eq("family_id", userId)
      .order("created_at", { ascending: false })
      .range(30, 999);
    if (!selErr && extra && extra.length > 0) {
      const ids = extra.map((r) => r.id as string);
      await supabase.from(SNAP_TABLE).delete().eq("family_id", userId).in("id", ids);
    }
    return {
      id: ins.id as string,
      label: (ins.label as string | null) ?? undefined,
      createdAt: ins.created_at as string,
    };
  },

  async restoreSnapshot(id) {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from(SNAP_TABLE)
      .select("state")
      .eq("family_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("snapshot not found");
    const state = data.state as AppState;
    // 本体テーブルに復元（_meta はこの保存で付け直される）
    const payload: StoredEnvelope = { ...state, _meta: { client: CLIENT_ID, ts: Date.now() } };
    const { error: upErr } = await supabase
      .from(TABLE)
      .upsert({ family_id: userId, state: payload }, { onConflict: "family_id" });
    if (upErr) throw upErr;
    return state;
  },

  async deleteSnapshot(id) {
    const supabase = getSupabase();
    const userId = await requireUserId();
    await supabase.from(SNAP_TABLE).delete().eq("family_id", userId).eq("id", id);
  },

  subscribe(onChange) {
    if (!hasSupabaseConfig()) return () => {};
    const supabase = getSupabase();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || !active) return;
      const ch = supabase.channel(`family_state:${uid}`);
      (ch as unknown as { on: (...args: unknown[]) => typeof ch }).on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `family_id=eq.${uid}` },
        (payload: { new?: { state?: StoredEnvelope } }) => {
          const remote = payload.new?.state;
          if (!remote) return;
          // 自分が保存したエコーなら無視（チラつき防止）
          if (remote._meta?.client === CLIENT_ID) return;
          onChange(stripMeta(remote));
        },
      );
      ch.subscribe();
      channel = ch;
    })();

    return () => {
      active = false;
      if (channel) { void channel.unsubscribe(); }
    };
  },
};

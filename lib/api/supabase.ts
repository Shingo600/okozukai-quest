import type { AppState } from "../types";
import type { DataAdapter, Session } from "./types";
import { getSupabase, hasSupabaseConfig } from "../supabaseClient";

const TABLE = "family_states";

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

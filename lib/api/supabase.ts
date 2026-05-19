import type { AppState } from "../types";
import type { DataAdapter, Session } from "./types";
import { getSupabase, hasSupabaseConfig } from "../supabaseClient";

const TABLE = "family_states";

// djb2 ハッシュ（自エコー判定用）
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function snapshotHash(state: AppState): string {
  const s = JSON.stringify(state);
  return `${s.length}:${hash(s)}`;
}

let lastSavedHash: string | null = null;

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
    lastSavedHash = null;
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
    const state = data.state as AppState;
    lastSavedHash = snapshotHash(state);
    return state;
  },

  async saveState(state) {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const h = snapshotHash(state);
    lastSavedHash = h;
    const { error } = await supabase
      .from(TABLE)
      .upsert({ family_id: userId, state }, { onConflict: "family_id" });
    if (error) throw error;
  },

  async clear() {
    const supabase = getSupabase();
    const userId = await requireUserId();
    await supabase.from(TABLE).delete().eq("family_id", userId);
    lastSavedHash = null;
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
      // postgres_changes は SDK 型シグネチャがやや動的なので any 経由で呼ぶ
      (ch as unknown as { on: (...args: unknown[]) => typeof ch }).on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `family_id=eq.${uid}` },
        (payload: { new?: { state?: AppState } }) => {
          const remote = payload.new?.state;
          if (!remote) return;
          const h = snapshotHash(remote);
          if (h === lastSavedHash) return;
          lastSavedHash = h;
          onChange(remote);
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

import type { AppState } from "../types";

export interface Session {
  userId: string;
  email?: string;
}

export interface Snapshot {
  id: string;
  createdAt: string; // ISO
  label?: string;
}

// データ永続化アダプタ。
// local: localStorage / supabase: 行ベースの JSON ブロブ
export interface DataAdapter {
  // セッション
  getSession(): Promise<Session | null>;
  onAuthChange(cb: (session: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  // 状態
  loadState(): Promise<AppState | null>;
  saveState(state: AppState): Promise<void>;
  clear(): Promise<void>;

  // リアルタイム購読（他端末からの変更通知）。
  // 戻り値は購読解除関数。
  subscribe(onChange: (state: AppState) => void): () => void;

  // バックアップ（スナップショット）
  listSnapshots(): Promise<Snapshot[]>;
  createSnapshot(state: AppState, label?: string): Promise<Snapshot>;
  restoreSnapshot(id: string): Promise<AppState>;
  deleteSnapshot(id: string): Promise<void>;
}

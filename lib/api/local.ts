import type { AppState } from "../types";
import type { DataAdapter, Session, Snapshot } from "./types";

const STORAGE_KEY = "okq-state-v1";
const SNAP_KEY = "okq-snapshots-v1";
const SNAP_LIMIT = 30;
const LOCAL_SESSION: Session = { userId: "local" };

interface StoredSnapshot extends Snapshot {
  state: AppState;
}

function readSnaps(): StoredSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SNAP_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredSnapshot[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeSnaps(snaps: StoredSnapshot[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SNAP_KEY, JSON.stringify(snaps)); } catch {}
}

export const localAdapter: DataAdapter = {
  async getSession() { return LOCAL_SESSION; },
  onAuthChange(_cb) { return () => {}; },
  async signIn() {},
  async signUp() {},
  async signOut() {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  },
  async loadState() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AppState;
    } catch {
      return null;
    }
  },
  async saveState(state) {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  },
  async clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
  subscribe(_onChange) { return () => {}; },

  // --- スナップショット（localStorage 簡易実装）---
  async listSnapshots() {
    return readSnaps()
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
      .map(({ id, createdAt, label }) => ({ id, createdAt, label }));
  },
  async createSnapshot(state, label) {
    const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const snap: StoredSnapshot = { id, createdAt: new Date().toISOString(), label, state };
    const next = [snap, ...readSnaps()]
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
      .slice(0, SNAP_LIMIT);
    writeSnaps(next);
    return { id, createdAt: snap.createdAt, label };
  },
  async restoreSnapshot(id) {
    const found = readSnaps().find((s) => s.id === id);
    if (!found) throw new Error("snapshot not found");
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(found.state)); } catch {}
    }
    return found.state;
  },
  async deleteSnapshot(id) {
    writeSnaps(readSnaps().filter((s) => s.id !== id));
  },
};

import type { AppState } from "../types";
import type { DataAdapter, Session } from "./types";

const STORAGE_KEY = "okq-state-v1";
const LOCAL_SESSION: Session = { userId: "local" };

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
};

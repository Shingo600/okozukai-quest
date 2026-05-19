import type { DataAdapter } from "./types";
import { localAdapter } from "./local";
import { supabaseAdapter } from "./supabase";
import { hasSupabaseConfig } from "../supabaseClient";

const wantSupabase = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND) === "supabase";

export const api: DataAdapter = wantSupabase && hasSupabaseConfig() ? supabaseAdapter : localAdapter;
export const backendKind: "supabase" | "local" = wantSupabase && hasSupabaseConfig() ? "supabase" : "local";
export type { DataAdapter, Session } from "./types";

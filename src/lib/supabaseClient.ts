import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (typeof process !== "undefined" ? process.env.SUPABASE_URL : "") || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (typeof process !== "undefined" ? process.env.SUPABASE_ANON_KEY : "") || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ Supabase URL or Anon Key is missing! Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your env settings to enable live database connection."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

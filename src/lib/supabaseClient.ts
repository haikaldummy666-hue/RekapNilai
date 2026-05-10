import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseSingleton: SupabaseClient | null | undefined;

export function getSupabase() {
  if (supabaseSingleton !== undefined) return supabaseSingleton;
  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseSingleton = null;
    return supabaseSingleton;
  }
  supabaseSingleton = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseSingleton;
}

export function requireSupabase() {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase env belum di-set: VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY");
  }
  return sb;
}

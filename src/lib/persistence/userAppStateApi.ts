import { getSupabase } from "@/lib/supabaseClient";

export type UserAppStatePayload = {
  schemaVersion: 1;
  savedAt: string;
  studentStore: {
    students: unknown[];
    activeId: string | null;
  };
  appState: unknown;
};

export type UserAppStateRow = {
  id: string;
  user_id: string;
  key: string;
  state: UserAppStatePayload;
  updated_at: string;
  created_at: string;
  deleted_at: string | null;
};

export async function fetchUserAppState(key = "default"): Promise<UserAppStateRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("user_app_state")
    .select("*")
    .eq("key", key)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return null;
  return (data as any) ?? null;
}

export async function upsertUserAppState(
  payload: UserAppStatePayload,
  key = "default",
): Promise<{ ok: true; updatedAt: string } | { ok: false; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "NO_SUPABASE" };
  const { data, error } = await sb.rpc("upsert_user_app_state", { p_key: key, p_state: payload });
  if (error) return { ok: false, message: error.message };
  const updatedAt = typeof (data as any)?.updated_at === "string" ? (data as any).updated_at : "";
  return { ok: true, updatedAt };
}

export async function softDeleteUserAppState(
  key = "default",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "NO_SUPABASE" };
  const { error } = await sb.rpc("soft_delete_user_app_state", { p_key: key });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}


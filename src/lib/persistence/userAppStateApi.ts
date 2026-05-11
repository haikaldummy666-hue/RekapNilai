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

export type StudentDbRow = {
  id: string;
  madrasah_id: string;
  identitas: unknown;
  nilai: unknown;
  nilai_history: unknown;
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

export async function fetchStudentsFromDb(): Promise<StudentDbRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("students")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data as any) ?? [];
}

export async function syncStudentsSnapshot(
  students: unknown[],
): Promise<{ ok: true; inserted: number; updated: number; softDeleted: number } | { ok: false; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "NO_SUPABASE" };
  const { data, error } = await sb.rpc("sync_students_snapshot", { p_students: students });
  if (error) return { ok: false, message: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    inserted: Number((row as any)?.inserted ?? 0),
    updated: Number((row as any)?.updated ?? 0),
    softDeleted: Number((row as any)?.soft_deleted ?? 0),
  };
}

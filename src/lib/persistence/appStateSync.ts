import { useStudentStore } from "@/stores/studentStore";
import { useAppStateStore } from "@/stores/appStateStore";
import { fetchStudentsFromDb, fetchUserAppState, type UserAppStatePayload } from "./userAppStateApi";
import { idbGet, idbSet } from "./indexedDb";

function isoToMs(v: string | undefined | null): number {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

function backupKey(userId: string, key: string) {
  return `user_app_state:${userId}:${key}`;
}

export async function restoreBestEffort(userId: string, key = "default"): Promise<{
  source: "remote" | "indexeddb" | "none";
}> {
  const dbRows = await fetchStudentsFromDb();
  if (dbRows.length > 0) {
    useStudentStore.getState().importSnapshot(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        students: dbRows.map((r) => ({
          id: r.id,
          identitas: (r as any).identitas ?? {},
          nilai: (r as any).nilai ?? {},
          nilaiHistory: (r as any).nilai_history ?? { entries: [] },
          updatedAt: r.updated_at,
        })),
        activeId: null,
      },
      "merge",
    );
  }

  const remote = await fetchUserAppState(key);
  if (remote?.state) {
    await idbSet(backupKey(userId, key), remote.state as any);
    applyPayload(remote.state);
    useAppStateStore.getState().setSyncMeta({ lastRemotePullAt: new Date().toISOString() });
    return { source: "remote" };
  }

  const cached = await idbGet(backupKey(userId, key));
  if (cached?.value) {
    applyPayload(cached.value as any);
    return { source: "indexeddb" };
  }

  return { source: "none" };
}

export async function persistBackupBestEffort(
  userId: string,
  payload: UserAppStatePayload,
  key = "default",
) {
  await idbSet(backupKey(userId, key), payload as any);
}

export function buildLocalPayload(): UserAppStatePayload {
  const student = useStudentStore.getState();
  const snapshot = student.exportSnapshot();
  const appState = useAppStateStore.getState().state;
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    studentStore: { students: snapshot.students, activeId: snapshot.activeId },
    appState,
  };
}

export function isRemoteNewer(remoteSavedAt: string | undefined, localSavedAt: string | undefined) {
  return isoToMs(remoteSavedAt) > isoToMs(localSavedAt);
}

export function applyPayload(payload: UserAppStatePayload) {
  const st = useStudentStore.getState();
  st.importSnapshot(
    {
      version: 2,
      exportedAt: payload.savedAt,
      students: Array.isArray(payload.studentStore?.students) ? payload.studentStore.students : [],
      activeId: payload.studentStore?.activeId ?? null,
    },
    "merge",
  );

  const app = payload.appState as any;
  if (app && typeof app === "object" && app.version === 1 && typeof app.updatedAt === "string") {
    useAppStateStore.setState({ state: app });
  }
}

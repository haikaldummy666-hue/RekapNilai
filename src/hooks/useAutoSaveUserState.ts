import { useEffect } from "react";
import { debounce } from "@/lib/persistence/debounce";
import { buildLocalPayload, persistBackupBestEffort } from "@/lib/persistence/appStateSync";
import { upsertUserAppState } from "@/lib/persistence/userAppStateApi";
import { useAppStateStore } from "@/stores/appStateStore";
import { useStudentStore } from "@/stores/studentStore";

export function useAutoSaveUserState(userId: string | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (!userId) return;
    if (typeof window === "undefined") return;

    let saving = false;

    const saveOnce = async () => {
      if (saving) return;
      saving = true;
      try {
        const payload = buildLocalPayload();
        await persistBackupBestEffort(userId, payload);
        const res = await upsertUserAppState(payload);
        if (res.ok) {
          useAppStateStore.getState().setSyncMeta({
            lastRemotePushAt: new Date().toISOString(),
          });
        } else {
          useAppStateStore.getState().setSyncMeta({
            lastRemoteErrorAt: new Date().toISOString(),
          });
        }
      } finally {
        saving = false;
      }
    };

    const queueSave = debounce(() => {
      void saveOnce();
    }, 1000, 30_000);

    const unsubStudent = useStudentStore.subscribe(() => queueSave());
    const unsubAppState = useAppStateStore.subscribe(() => queueSave());

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") queueSave.flush();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", queueSave.flush);

    return () => {
      unsubStudent();
      unsubAppState();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", queueSave.flush);
      queueSave.flush();
      queueSave.cancel();
    };
  }, [enabled, userId]);
}


import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

type RouteKey = string;

type PersistedRouteState = {
  ui?: Record<string, Json>;
  drafts?: Record<string, Json>;
  updatedAt?: string;
};

type PersistedAppState = {
  version: 1;
  lastVisited?: { pathname: string; search: string; hash: string };
  routes: Record<RouteKey, PersistedRouteState>;
  updatedAt: string;
  sync: {
    lastRemotePullAt?: string;
    lastRemotePushAt?: string;
    lastRemoteErrorAt?: string;
  };
};

interface AppStateStore {
  state: PersistedAppState;
  setLastVisited: (v: { pathname: string; search?: string; hash?: string }) => void;
  setRouteUi: (routeKey: RouteKey, patch: Record<string, Json>) => void;
  setRouteDraft: (routeKey: RouteKey, draftKey: string, value: Json) => void;
  removeRouteDraft: (routeKey: RouteKey, draftKey: string) => void;
  clearRoute: (routeKey: RouteKey) => void;
  setSyncMeta: (patch: Partial<PersistedAppState["sync"]>) => void;
}

const memoryStorage = (() => {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
  return storage;
})();

function safeStorage(): Storage {
  if (typeof window === "undefined") return memoryStorage;
  return window.localStorage;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultState(): PersistedAppState {
  return {
    version: 1,
    routes: {},
    updatedAt: nowIso(),
    sync: {},
  };
}

export const useAppStateStore = create<AppStateStore>()(
  persist(
    (set, get) => ({
      state: defaultState(),

      setLastVisited: (v) =>
        set((s) => ({
          state: {
            ...s.state,
            lastVisited: {
              pathname: v.pathname,
              search: v.search ?? "",
              hash: v.hash ?? "",
            },
            updatedAt: nowIso(),
          },
        })),

      setRouteUi: (routeKey, patch) =>
        set((s) => {
          const prev = s.state.routes[routeKey] ?? {};
          const ui = { ...(prev.ui ?? {}), ...patch };
          return {
            state: {
              ...s.state,
              routes: {
                ...s.state.routes,
                [routeKey]: { ...prev, ui, updatedAt: nowIso() },
              },
              updatedAt: nowIso(),
            },
          };
        }),

      setRouteDraft: (routeKey, draftKey, value) =>
        set((s) => {
          const prev = s.state.routes[routeKey] ?? {};
          const drafts = { ...(prev.drafts ?? {}), [draftKey]: value };
          return {
            state: {
              ...s.state,
              routes: {
                ...s.state.routes,
                [routeKey]: { ...prev, drafts, updatedAt: nowIso() },
              },
              updatedAt: nowIso(),
            },
          };
        }),

      removeRouteDraft: (routeKey, draftKey) =>
        set((s) => {
          const prev = s.state.routes[routeKey];
          if (!prev?.drafts || !(draftKey in prev.drafts)) return s;
          const drafts = { ...prev.drafts };
          delete drafts[draftKey];
          return {
            state: {
              ...s.state,
              routes: {
                ...s.state.routes,
                [routeKey]: { ...prev, drafts, updatedAt: nowIso() },
              },
              updatedAt: nowIso(),
            },
          };
        }),

      clearRoute: (routeKey) =>
        set((s) => {
          if (!(routeKey in s.state.routes)) return s;
          const routes = { ...s.state.routes };
          delete routes[routeKey];
          return { state: { ...s.state, routes, updatedAt: nowIso() } };
        }),

      setSyncMeta: (patch) =>
        set((s) => ({
          state: {
            ...s.state,
            sync: { ...s.state.sync, ...patch },
            updatedAt: nowIso(),
          },
        })),
    }),
    {
      name: "rekap-nilai-mi-appstate-v1",
      version: 1,
      storage: createJSONStorage(() => safeStorage()),
      migrate: (persisted) => {
        const raw = persisted as Partial<AppStateStore> | undefined;
        const st = raw?.state;
        if (!st || typeof st !== "object") return { state: defaultState() } as AppStateStore;
        const routes = typeof st.routes === "object" && st.routes ? st.routes : {};
        const lastVisited =
          st.lastVisited &&
          typeof st.lastVisited === "object" &&
          typeof (st.lastVisited as any).pathname === "string"
            ? (st.lastVisited as PersistedAppState["lastVisited"])
            : undefined;
        const updatedAt = typeof st.updatedAt === "string" ? st.updatedAt : nowIso();
        const sync = (st.sync && typeof st.sync === "object" ? st.sync : {}) as PersistedAppState["sync"];
        return {
          state: {
            version: 1,
            lastVisited,
            routes: routes as PersistedAppState["routes"],
            updatedAt,
            sync,
          },
        } as AppStateStore;
      },
    },
  ),
);

export function setAppStateTenant(tenantKey: string) {
  const key = tenantKey.trim() ? tenantKey.trim() : "public";
  const name = `rekap-nilai-mi-appstate-v1:${key}`;
  useAppStateStore.persist.setOptions({ name });
  const storage = useAppStateStore.persist.getOptions().storage;
  const maybe = storage?.getItem?.(name) as unknown;
  const readExisting = async () => {
    if (!maybe) return null;
    if (typeof (maybe as any)?.then === "function") return await (maybe as Promise<any>);
    return maybe as any;
  };
  return readExisting().then(async (existing) => {
    await useAppStateStore.persist.rehydrate();
    if (existing == null) {
      useAppStateStore.setState({ state: defaultState() });
    }
  });
}

export function getRouteUi(routeKey: string): Record<string, Json> {
  return useAppStateStore.getState().state.routes[routeKey]?.ui ?? {};
}

export function getRouteDrafts(routeKey: string): Record<string, Json> {
  return useAppStateStore.getState().state.routes[routeKey]?.drafts ?? {};
}


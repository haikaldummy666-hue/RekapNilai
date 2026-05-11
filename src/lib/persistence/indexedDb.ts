type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

type KvRow = { key: string; value: Json; updatedAt: string };

type DbConfig = {
  dbName: string;
  storeName: string;
};

const defaultConfig: DbConfig = {
  dbName: "rekap-nilai-mi",
  storeName: "kv",
};

const memory = new Map<string, KvRow>();

function nowIso() {
  return new Date().toISOString();
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

async function openDb(cfg: DbConfig): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(cfg.dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(cfg.storeName)) {
        db.createObjectStore(cfg.storeName, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function withStore<T>(
  cfg: DbConfig,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb(cfg);
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(cfg.storeName, mode);
    const store = tx.objectStore(cfg.storeName);
    let request: IDBRequest<T> | void;
    try {
      request = fn(store);
    } catch (e) {
      reject(e);
      return;
    }
    if (request) {
      request.onsuccess = () => resolve(request!.result);
      request.onerror = () => reject(request!.error ?? new Error("IndexedDB request failed"));
    }
    tx.oncomplete = () => {
      if (!request) resolve(undefined);
      db.close();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error("IndexedDB tx failed"));
      db.close();
    };
  });
}

export async function idbGet(key: string, cfg: Partial<DbConfig> = {}): Promise<KvRow | null> {
  const c = { ...defaultConfig, ...cfg };
  if (!hasIndexedDb()) {
    return memory.get(key) ?? null;
  }
  const row = (await withStore<KvRow>(c, "readonly", (s) => s.get(key))) ?? null;
  return row;
}

export async function idbSet(
  key: string,
  value: Json,
  cfg: Partial<DbConfig> = {},
): Promise<KvRow> {
  const c = { ...defaultConfig, ...cfg };
  const row: KvRow = { key, value, updatedAt: nowIso() };
  if (!hasIndexedDb()) {
    memory.set(key, row);
    return row;
  }
  await withStore(c, "readwrite", (s) => s.put(row));
  return row;
}

export async function idbDel(key: string, cfg: Partial<DbConfig> = {}): Promise<void> {
  const c = { ...defaultConfig, ...cfg };
  if (!hasIndexedDb()) {
    memory.delete(key);
    return;
  }
  await withStore(c, "readwrite", (s) => s.delete(key));
}


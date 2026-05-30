/**
 * Store untuk Mata Pelajaran Lokal (Mulok)
 * Menyimpan konfigurasi mata pelajaran lokal yang dipilih
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MulokConfig, AvailableMulok } from "@/types/mulok.types";
import { DEFAULT_MULOK } from "@/types/mulok.types";

interface MulokState {
  config: MulokConfig;
  
  // Selectors
  isSelected: (mulok: AvailableMulok) => boolean;
  
  // Actions
  addMulok: (mulok: AvailableMulok) => void;
  removeMulok: (mulok: AvailableMulok) => void;
  setMulok: (selected: AvailableMulok[]) => void;
  
  // Bulk operations
  getMulokList: () => AvailableMulok[];
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

export const useMulokStore = create<MulokState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_MULOK,
      
      isSelected: (mulok) => {
        return get().config.selected.includes(mulok);
      },
      
      addMulok: (mulok) => {
        set((state) => {
          if (state.config.selected.includes(mulok)) return state;
          return {
            config: {
              selected: [...state.config.selected, mulok],
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },
      
      removeMulok: (mulok) => {
        set((state) => {
          // Bahasa Sunda tidak boleh dihapus
          if (mulok === "Bahasa Sunda") return state;
          return {
            config: {
              selected: state.config.selected.filter((m) => m !== mulok),
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },
      
      setMulok: (selected) => {
        set({
          config: {
            selected,
            updatedAt: new Date().toISOString(),
          },
        });
      },
      
      getMulokList: () => {
        return [...get().config.selected];
      },
    }),
    {
      name: "mulok-store",
      storage: createJSONStorage(() => safeStorage()),
      version: 1,
    }
  )
);

import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";

/** Sinkronkan kelas `dark` di <html> dengan store. */
export function useThemeSync() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);
}

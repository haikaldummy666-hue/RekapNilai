import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { useThemeSync } from "@/hooks/useThemeSync";
import { useEffect, useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import { setStudentStoreTenant } from "@/stores/studentStore";
import { setAppStateTenant, useAppStateStore } from "@/stores/appStateStore";
import { restoreBestEffort } from "@/lib/persistence/appStateSync";
import { useAutoSaveUserState } from "@/hooks/useAutoSaveUserState";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-4 text-muted-foreground">Halaman tidak ditemukan.</p>
        <a href="/" className="mt-6 inline-block text-primary underline">
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Coba lagi
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Rekap Nilai & Rapor Kelas 6 — Madrasah Ibtidaiyah" },
      {
        name: "description",
        content:
          "Aplikasi rekap nilai & rapor siswa kelas 6 Madrasah Ibtidaiyah dengan Excel import/export dan PDF rapor.",
      },
      { name: "author", content: "MI Premium" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  useThemeSync();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 px-3 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => (s.location as any).href as string | undefined });
  const user = useAuthStore((s) => s.getCurrentUser());
  const sessionInitialized = useAuthStore((s) => s.sessionInitialized);
  const initSession = useAuthStore((s) => s.initSession);
  const seedDefaultAdmin = useAuthStore((s) => s.seedDefaultAdmin);
  const authEnabled = !!(
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) &&
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  );

  const isPublic = useMemo(() => {
    return pathname === "/login" || pathname === "/daftar-madrasah";
  }, [pathname]);

  useEffect(() => {
    void seedDefaultAdmin();
  }, [seedDefaultAdmin]);

  useEffect(() => {
    void initSession();
  }, [initSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionInitialized) return;
    if (!authEnabled) return;
    if (!user && !isPublic) {
      void router.navigate({ to: "/login" });
      return;
    }
    if (user && isPublic) {
      void router.navigate({ to: "/" });
    }
  }, [authEnabled, isPublic, router, sessionInitialized, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) {
      setStudentStoreTenant("public");
      setAppStateTenant("public");
      return;
    }
    const tenantKey = user.role === "admin" ? "admin" : user.id;
    setStudentStoreTenant(tenantKey);
    setAppStateTenant(tenantKey);
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user || isPublic) return;
    const pathname = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;
    useAppStateStore.getState().setLastVisited({ pathname, search, hash });
    try {
      window.sessionStorage.setItem(
        `rekap-nilai-mi:lastVisited:${user.id}`,
        JSON.stringify({ pathname, search, hash }),
      );
    } catch {}
    void href;
  }, [href, isPublic, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user || isPublic) return;
    void restoreBestEffort(user.id, "default");
  }, [isPublic, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user || isPublic) return;
    const last = useAppStateStore.getState().state.lastVisited;
    if (!last) return;
    const currentPath = window.location.pathname;
    if (currentPath !== "/") return;
    const to = `${last.pathname}${last.search ?? ""}${last.hash ?? ""}`;
    if (!to || to === "/" || to.startsWith("/login") || to.startsWith("/daftar-madrasah")) return;
    void router.navigate({ to });
  }, [isPublic, router, user]);

  useAutoSaveUserState(user?.id ?? null, !!user && !isPublic);

  return (
    <QueryClientProvider client={queryClient}>
      {isPublic ? (
        <>
          <Outlet />
          <Toaster richColors position="top-right" />
        </>
      ) : (
        <AppShell />
      )}
    </QueryClientProvider>
  );
}

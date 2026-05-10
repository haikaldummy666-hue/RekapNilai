import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { useThemeSync } from "@/hooks/useThemeSync";
import { useEffect, useMemo } from "react";
import { useRouterState, useRouter } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import { setStudentStoreTenant } from "@/stores/studentStore";

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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

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
  const user = useAuthStore((s) => s.getCurrentUser());
  const initSession = useAuthStore((s) => s.initSession);

  const isPublic = useMemo(() => {
    return pathname === "/login" || pathname === "/daftar-madrasah";
  }, [pathname]);

  useEffect(() => {
    void initSession();
  }, [initSession]);

  useEffect(() => {
    if (!user && !isPublic) {
      void router.navigate({ to: "/login" });
      return;
    }
    if (user && isPublic) {
      void router.navigate({ to: "/" });
    }
  }, [isPublic, router, user]);

  useEffect(() => {
    if (!user) {
      setStudentStoreTenant("public");
      return;
    }
    const tenantKey = user.role === "admin" ? "admin" : user.id;
    setStudentStoreTenant(tenantKey);
  }, [user]);

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

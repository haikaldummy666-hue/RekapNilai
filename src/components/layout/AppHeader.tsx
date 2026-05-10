import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { LogOut, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";
import { StudentSwitcher } from "./StudentSwitcher";

export function AppHeader() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.getCurrentUser());
  const identity = useAuthStore((s) => s.getDisplayIdentity());
  const logout = useAuthStore((s) => s.logout);

  const showStudentContext =
    pathname !== "/admin" && pathname !== "/profil" && pathname !== "/excel-tools";

  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <SidebarTrigger className="transition-base" />
        <div className="ml-1 hidden text-sm font-medium sm:block">
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            Rekap Nilai MI {identity !== "—" ? identity : ""}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {showStudentContext ? (
            <StudentSwitcher compact showClassFilter showRemove={false} className="hidden sm:flex" />
          ) : null}
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="transition-base">
                  {identity}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profil" className="flex items-center gap-2">
                    <Settings />
                    Profil
                  </Link>
                </DropdownMenuItem>
                {user.role === "admin" ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Shield />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    void router.navigate({ to: "/login" });
                  }}
                >
                  <LogOut />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}

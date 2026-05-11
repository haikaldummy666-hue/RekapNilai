import { Link, useRouterState } from "@tanstack/react-router";
import {
  Shield,
  BookMarked,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  Trophy,
  User,
  UserCog,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/authStore";

const NAV_GROUPS = [
  {
    label: "Ringkasan",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Persiapan Data",
    items: [
      { to: "/siswa", label: "Daftar Siswa", icon: Users },
      { to: "/identitas", label: "Identitas Siswa", icon: User },
      { to: "/profil", label: "Profil", icon: UserCog },
    ],
  },
  {
    label: "Input Nilai",
    items: [
      { to: "/kurmer", label: "Raport Kurmer", icon: BookMarked },
      { to: "/praktek", label: "Ujian Praktek", icon: ClipboardList },
      { to: "/hasil-ujian", label: "Hasil Ujian", icon: ScrollText },
    ],
  },
  {
    label: "Output",
    items: [
      { to: "/hasil-akhir", label: "Hasil Akhir", icon: Trophy },
      { to: "/skl-ijazah", label: "SKL & Ijazah", icon: GraduationCap },
    ],
  },
  {
    label: "Tools",
    items: [{ to: "/excel-tools", label: "Excel Tools", icon: FileSpreadsheet }],
  },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.getCurrentUser());
  const identity = useAuthStore((s) => s.getDisplayIdentity());

  const navGroups =
    user?.role === "admin"
      ? [...NAV_GROUPS, { label: "Admin", items: [{ to: "/admin", label: "Admin", icon: Shield }] }]
      : NAV_GROUPS;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3 transition-[padding,gap] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant transition-[width,height,border-radius,transform,box-shadow] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:shadow-soft">
            <GraduationCap className="h-5 w-5 text-primary-foreground transition-[width,height,transform] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold leading-tight">
              Rekap Nilai MI {identity !== "—" ? identity : ""}
            </p>
            <p className="truncate text-xs text-muted-foreground">Kelas 6 · 2026</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link to={item.to} className="transition-base">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <p className="px-2 py-2 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          © 2026 · Modern Islamic Premium
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

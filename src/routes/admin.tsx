import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ShieldCheck, UserPlus, CheckCircle2, Ban, ScrollText } from "lucide-react";
import { PageCard, PageHeader } from "@/components/layout/PageCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { getSupabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Rekap Nilai MI" }] }),
  component: AdminPage,
});

const CreateSchema = z.object({
  namaMadrasah: z.string().trim().min(2, "Nama madrasah wajib diisi"),
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  alamat: z.string().trim().optional(),
  kontak: z.string().trim().optional(),
});

function statusBadge(status: string) {
  if (status === "active") return "bg-success/15 text-success border-success/30";
  if (status === "pending") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.getCurrentUser());
  const users = useAuthStore((s) => s.users);
  const audit = useAuthStore((s) => s.audit);
  const approveMadrasah = useAuthStore((s) => s.approveMadrasah);
  const disableUser = useAuthStore((s) => s.disableUser);
  const adminCreateMadrasah = useAuthStore((s) => s.adminCreateMadrasah);

  const pending = useMemo(
    () => users.filter((u) => u.role === "madrasah" && u.status === "pending"),
    [users],
  );
  const madrasahList = useMemo(() => users.filter((u) => u.role === "madrasah"), [users]);

  const [namaMadrasah, setNamaMadrasah] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kontak, setKontak] = useState("");
  const [creating, setCreating] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);

  const canCreate = useMemo(() => {
    return (
      namaMadrasah.trim().length > 1 && email.trim().length > 3 && password.length >= 6 && !creating
    );
  }, [creating, email, namaMadrasah, password]);

  if (!user) {
    return (
      <div className="glass rounded-2xl p-6 shadow-soft">
        <p className="text-sm text-muted-foreground">Anda belum login.</p>
        <Button className="mt-3" onClick={() => router.navigate({ to: "/login" })}>
          Login
        </Button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="glass rounded-2xl p-6 shadow-soft">
        <h1 className="text-lg font-semibold">Akses ditolak</h1>
        <p className="mt-1 text-sm text-muted-foreground">Menu ini hanya untuk admin.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Admin"
        description="Approval pendaftaran, manajemen akun, dan audit trail."
        actions={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Hak akses penuh
          </div>
        }
      />

      <Tabs defaultValue="approval" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approval">Approval</TabsTrigger>
          <TabsTrigger value="create">Tambah Akun</TabsTrigger>
          <TabsTrigger value="users">Akun</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="supabase">Supabase</TabsTrigger>
        </TabsList>

        <TabsContent value="approval">
          <PageCard
            title="Permintaan Pendaftaran"
            description="Setujui akun madrasah yang menunggu."
          >
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada pendaftaran pending.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Madrasah</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.profile.namaMadrasah}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(u.status)}>{u.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="bg-gradient-primary text-primary-foreground"
                          onClick={() => {
                            const res = approveMadrasah(u.id);
                            if (!res.ok) toast.error("Gagal approval");
                            else toast.success("Akun disetujui");
                          }}
                        >
                          <CheckCircle2 />
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PageCard>
        </TabsContent>

        <TabsContent value="create">
          <PageCard title="Tambah Akun Madrasah" description="Akun dibuat langsung aktif.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-sm font-medium">Nama Madrasah</p>
                <Input value={namaMadrasah} onChange={(e) => setNamaMadrasah(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Email</p>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Password</p>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-sm font-medium">Alamat</p>
                <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-sm font-medium">Kontak</p>
                <Input value={kontak} onChange={(e) => setKontak(e.target.value)} />
              </div>
            </div>

            <Button
              className="mt-4 bg-gradient-primary text-primary-foreground"
              disabled={!canCreate}
              onClick={async () => {
                const parsed = CreateSchema.safeParse({
                  namaMadrasah,
                  email,
                  password,
                  alamat,
                  kontak,
                });
                if (!parsed.success) {
                  toast.error(parsed.error.issues[0]?.message ?? "Form tidak valid");
                  return;
                }
                setCreating(true);
                try {
                  const res = await adminCreateMadrasah(parsed.data);
                  if (!res.ok) {
                    toast.error(
                      res.reason === "EMAIL_EXISTS"
                        ? "Email sudah terdaftar"
                        : "Gagal membuat akun",
                    );
                    return;
                  }
                  toast.success("Akun madrasah dibuat");
                  setNamaMadrasah("");
                  setEmail("");
                  setPassword("");
                  setAlamat("");
                  setKontak("");
                } finally {
                  setCreating(false);
                }
              }}
            >
              <UserPlus />
              {creating ? "Membuat…" : "Buat Akun"}
            </Button>
          </PageCard>
        </TabsContent>

        <TabsContent value="users">
          <PageCard title="Daftar Akun Madrasah">
            {madrasahList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada akun madrasah.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Madrasah</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {madrasahList.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.profile.namaMadrasah}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(u.status)}>{u.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={u.status === "disabled"}
                          onClick={() => {
                            const res = disableUser(u.id);
                            if (!res.ok) toast.error("Gagal menonaktifkan akun");
                            else toast.success("Akun dinonaktifkan");
                          }}
                        >
                          <Ban />
                          Nonaktifkan
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PageCard>
        </TabsContent>

        <TabsContent value="supabase">
          <PageCard title="Supabase" description="Cek environment variables dan koneksi dasar.">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{getSupabase() ? "Siap" : "Env belum di-set"}</span>
              </div>
              <Button
                variant="outline"
                disabled={testingSupabase}
                onClick={async () => {
                  const sb = getSupabase();
                  if (!sb) {
                    toast.error(
                      "Supabase env belum di-set (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY)",
                    );
                    return;
                  }
                  setTestingSupabase(true);
                  try {
                    const { error } = await sb.auth.getSession();
                    if (error) {
                      toast.error(error.message);
                      return;
                    }
                    toast.success("Supabase terhubung");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Gagal menghubungkan Supabase");
                  } finally {
                    setTestingSupabase(false);
                  }
                }}
              >
                {testingSupabase ? "Menguji…" : "Test Koneksi"}
              </Button>
            </div>
          </PageCard>
        </TabsContent>

        <TabsContent value="audit">
          <PageCard title="Audit Trail" description="Log aktivitas terbaru (maks 500).">
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.slice(0, 200).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(a.at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <ScrollText className="h-4 w-4 text-primary" />
                          {a.action}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.actorId
                          ? (users.find((u) => u.id === a.actorId)?.email ?? a.actorId)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.targetId
                          ? (users.find((u) => u.id === a.targetId)?.email ?? a.targetId)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PageCard>
        </TabsContent>
      </Tabs>
    </>
  );
}

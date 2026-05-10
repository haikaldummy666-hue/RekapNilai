import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Rekap Nilai MI" }] }),
  component: LoginPage,
});

const LoginSchema = z.object({
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.getCurrentUser());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const helpdeskPhone = "083808283542";
  const helpdeskWa = "6283808283542";
  const helpdeskTemplate = "saya dari MI (nama madrasah yang didaftarkan) ingin melakukan acc akun";
  const helpdeskHref = `https://wa.me/${helpdeskWa}?text=${encodeURIComponent(helpdeskTemplate)}`;

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading;
  }, [email, loading, password]);

  const onSubmit = async () => {
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Form tidak valid");
      return;
    }

    setLoading(true);
    try {
      const res = await login(parsed.data.email, parsed.data.password);
      if (!res.ok) {
        if (res.reason === "PENDING") toast.error("Akun masih menunggu approval admin");
        else if (res.reason === "DISABLED") toast.error("Akun dinonaktifkan");
        else toast.error("Email atau password salah");
        return;
      }
      toast.success("Login berhasil");
      await router.navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal login");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass w-full max-w-md rounded-2xl p-6 shadow-soft">
          <h1 className="text-xl font-semibold">Anda sudah login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Silakan kembali ke dashboard.</p>
          <Button className="mt-4 w-full" onClick={() => router.navigate({ to: "/" })}>
            Ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass w-full max-w-md rounded-2xl p-6 shadow-soft">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-primary bg-clip-text text-transparent">Login</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mengelola rekap nilai.</p>

        <div className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Email</p>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@madrasah.id"
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Password</p>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSubmit();
              }}
            />
          </div>

          <Button
            className="w-full bg-gradient-primary text-primary-foreground"
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
          >
            {loading ? "Memproses…" : "Login"}
          </Button>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          Belum punya akun madrasah?{" "}
          <Link to="/daftar-madrasah" className="text-primary underline">
            Daftar
          </Link>
        </p>

        <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3 text-sm">
          <p className="font-medium">Butuh ACC akun?</p>
          <p className="mt-1 text-muted-foreground">
            Setelah daftar akun, silakan hubungi helpdesk untuk melakukan ACC/approval akun.
          </p>
          <a href={helpdeskHref} target="_blank" rel="noreferrer" className="mt-3 block">
            <Button variant="outline" className="w-full">
              Chat Helpdesk WA ({helpdeskPhone})
            </Button>
          </a>
          <p className="mt-2 text-xs text-muted-foreground">Template chat: "{helpdeskTemplate}"</p>
        </div>
      </div>
    </div>
  );
}

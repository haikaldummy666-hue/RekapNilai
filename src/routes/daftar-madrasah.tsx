import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/daftar-madrasah")({
  head: () => ({ meta: [{ title: "Daftar Madrasah — Rekap Nilai MI" }] }),
  component: DaftarMadrasahPage,
});

const RegisterSchema = z.object({
  namaMadrasah: z.string().trim().min(2, "Nama madrasah wajib diisi"),
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  alamat: z.string().trim().optional(),
  kontak: z.string().trim().optional(),
});

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function DaftarMadrasahPage() {
  const router = useRouter();
  const registerMadrasah = useAuthStore((s) => s.registerMadrasah);

  const [namaMadrasah, setNamaMadrasah] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kontak, setKontak] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      namaMadrasah.trim().length > 1 && email.trim().length > 3 && password.length >= 6 && !loading
    );
  }, [email, loading, namaMadrasah, password]);

  const onSubmit = async () => {
    const parsed = RegisterSchema.safeParse({ namaMadrasah, email, password, alamat, kontak });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Form tidak valid");
      return;
    }

    setLoading(true);
    try {
      const res = await registerMadrasah({ ...parsed.data, logoDataUrl });
      if (!res.ok) {
        toast.error("Email sudah terdaftar");
        return;
      }
      toast.success("Pendaftaran berhasil. Menunggu approval admin.");
      await router.navigate({ to: "/login" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal daftar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass w-full max-w-xl rounded-2xl p-6 shadow-soft">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-primary bg-clip-text text-transparent">Daftar Madrasah</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Akun akan aktif setelah disetujui admin.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium">Nama Madrasah</p>
            <Input value={namaMadrasah} onChange={(e) => setNamaMadrasah(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Email</p>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
            />
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

          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium">Logo (opsional)</p>
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const url = await fileToDataUrl(f);
                  setLogoDataUrl(url);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Gagal memuat logo");
                }
              }}
            />
          </div>
        </div>

        <Button
          className="mt-5 w-full bg-gradient-primary text-primary-foreground"
          disabled={!canSubmit}
          onClick={() => void onSubmit()}
        >
          {loading ? "Memproses…" : "Daftar"}
        </Button>

        <p className="mt-5 text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/login" className="text-primary underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

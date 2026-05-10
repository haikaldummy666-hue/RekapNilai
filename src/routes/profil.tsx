import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageCard, PageHeader } from "@/components/layout/PageCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_LOGO_DATA_URL, useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/profil")({
  head: () => ({ meta: [{ title: "Profil — Rekap Nilai MI" }] }),
  component: ProfilPage,
});

const ProfileSchema = z.object({
  namaMadrasah: z.string().trim().min(2, "Nama wajib diisi"),
  alamat: z.string().trim().optional(),
  kontak: z.string().trim().optional(),
  logoDataUrl: z.string().optional(),
  logoFileName: z.string().trim().optional(),
  namaKepalaMadrasah: z
    .string()
    .trim()
    .min(3, "Nama kepala madrasah minimal 3 karakter")
    .max(100, "Nama kepala madrasah maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  kelas: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^6[.\- ](?:[A-Z]|[1-9]|10)$/.test(v),
      "Format kelas tidak valid (contoh: 6.A, 6.1, 6-A)",
    )
    .optional()
    .or(z.literal("")),
});

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function ProfilPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.getCurrentUser());
  const updateMyProfile = useAuthStore((s) => s.updateMyProfile);

  const [namaMadrasah, setNamaMadrasah] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kontak, setKontak] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [logoFileName, setLogoFileName] = useState<string | undefined>(undefined);
  const [namaKepalaMadrasah, setNamaKepalaMadrasah] = useState("");
  const [kelas, setKelas] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNamaMadrasah(user.profile.namaMadrasah || "");
    setAlamat(user.profile.alamat || "");
    setKontak(user.profile.kontak || "");
    setLogoDataUrl(user.profile.logoDataUrl);
    setLogoFileName(user.profile.logoFileName);
    setNamaKepalaMadrasah(user.profile.namaKepalaMadrasah || "");
    setKelas(user.profile.kelas || "");
  }, [user]);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      namaMadrasah.trim() !== (user.profile.namaMadrasah || "").trim() ||
      alamat.trim() !== (user.profile.alamat || "").trim() ||
      kontak.trim() !== (user.profile.kontak || "").trim() ||
      (logoDataUrl || "") !== (user.profile.logoDataUrl || "") ||
      (logoFileName || "") !== (user.profile.logoFileName || "") ||
      namaKepalaMadrasah.trim() !== (user.profile.namaKepalaMadrasah || "").trim() ||
      kelas.trim() !== (user.profile.kelas || "").trim()
    );
  }, [alamat, kelas, kontak, logoDataUrl, logoFileName, namaKepalaMadrasah, namaMadrasah, user]);

  const canSave = dirty && !saving;

  const onSave = useCallback(async () => {
    if (!user) return;
    const parsed = ProfileSchema.safeParse({
      namaMadrasah,
      alamat,
      kontak,
      logoDataUrl,
      logoFileName,
      namaKepalaMadrasah,
      kelas,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Form tidak valid");
      return;
    }

    setSaving(true);
    try {
      const res = updateMyProfile(parsed.data);
      if (!res.ok) {
        toast.error("Tidak bisa menyimpan profil");
        return;
      }
      toast.success("Profil tersimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  }, [
    alamat,
    kelas,
    kontak,
    logoDataUrl,
    logoFileName,
    namaKepalaMadrasah,
    namaMadrasah,
    updateMyProfile,
    user,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canSave) void onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSave, onSave]);

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

  return (
    <>
      <PageHeader
        title="Profil"
        description="Kelola identitas akun yang sedang login."
        actions={
          <Button
            className="bg-gradient-primary text-primary-foreground"
            disabled={!canSave}
            onClick={() => void onSave()}
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        }
      />

      <PageCard title="Data Madrasah">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium">Nama</p>
            <Input value={namaMadrasah} onChange={(e) => setNamaMadrasah(e.target.value)} />
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
            <p className="text-sm font-medium">Nama Kepala Madrasah</p>
            <Input
              value={namaKepalaMadrasah}
              onChange={(e) => setNamaKepalaMadrasah(e.target.value)}
              placeholder="Contoh: H. Ahmad Fauzan"
            />
            <p className="text-xs text-muted-foreground">
              Akan tampil otomatis di tanda tangan SKL & ijazah.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium">Format Kelas</p>
            <Select value={kelas} onValueChange={setKelas}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih format kelas…" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "6.A",
                  "6.B",
                  "6.C",
                  "6.1",
                  "6.2",
                  "6.3",
                  "6-A",
                  "6-B",
                  "6-C",
                  "6-1",
                  "6-2",
                  "6-3",
                ].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Dipakai konsisten di semua dokumen.</p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium">Logo (opsional)</p>
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!(f.type === "image/png" || f.type === "image/jpeg")) {
                  toast.error("Format logo harus PNG atau JPG");
                  e.target.value = "";
                  return;
                }
                if (f.size > 2 * 1024 * 1024) {
                  toast.error("Ukuran logo maksimal 2MB");
                  e.target.value = "";
                  return;
                }
                try {
                  const url = await fileToDataUrl(f);
                  setLogoDataUrl(url);
                  const ext = f.type === "image/png" ? "png" : "jpg";
                  setLogoFileName(`logo-${user.id}-${crypto.randomUUID()}.${ext}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Gagal memuat logo");
                }
              }}
            />
            <p className="text-xs text-muted-foreground">PNG/JPG, maksimal 2MB.</p>

            <div className="mt-2 flex items-center gap-3">
              <img
                src={logoDataUrl || DEFAULT_LOGO_DATA_URL}
                alt="Logo"
                className="h-12 w-12 rounded-md border border-border object-cover"
              />
              {logoDataUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLogoDataUrl(undefined);
                    setLogoFileName(undefined);
                  }}
                >
                  Hapus Logo
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Menggunakan logo default.</p>
              )}
            </div>

            {logoDataUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <p className="text-xs text-muted-foreground">Tersimpan sebagai: {logoFileName}</p>
              </div>
            ) : null}
          </div>
        </div>
      </PageCard>
    </>
  );
}

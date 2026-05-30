import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_MULOK, type AvailableMulok } from "@/types/mulok.types";
import { useMulokStore } from "@/stores/mulokStore";
import { Badge } from "@/components/ui/badge";

interface MulokManagerProps {
  /** If true, shows only the form without dialog wrapper (inline mode) */
  inline?: boolean;
}

function MulokManagerForm() {
  const { config, addMulok, removeMulok, getMulokList } = useMulokStore();
  const [selectedMulok, setSelectedMulok] = useState<AvailableMulok | "">("");

  const mulokList = getMulokList();
  const availableToAdd = AVAILABLE_MULOK.filter((m) => !mulokList.includes(m));

  const handleAdd = () => {
    if (!selectedMulok) {
      toast.error("Pilih mata pelajaran terlebih dahulu");
      return;
    }
    addMulok(selectedMulok as AvailableMulok);
    setSelectedMulok("");
    toast.success(`${selectedMulok} ditambahkan`);
  };

  const handleRemove = (mulok: AvailableMulok) => {
    if (mulok === "Bahasa Sunda") {
      toast.error("Bahasa Sunda tidak boleh dihapus (wajib sebagai Mulok)");
      return;
    }
    removeMulok(mulok);
    toast.success(`${mulok} dihapus`);
  };

  return (
    <div className="space-y-6">
      {/* Daftar Mulok Saat Ini */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Mata Pelajaran Lokal Terpilih:</h3>
        <div className="flex flex-wrap gap-2">
          {mulokList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada mulok yang dipilih</p>
          ) : (
            mulokList.map((m) => (
              <div key={m} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <span className="text-sm font-medium">{m}</span>
                {m !== "Bahasa Sunda" && (
                  <button
                    onClick={() => handleRemove(m)}
                    className="ml-1 text-destructive hover:text-destructive/80"
                    aria-label={`Hapus ${m}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {m === "Bahasa Sunda" && (
                  <span className="ml-1 text-xs text-muted-foreground">(wajib)</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tambah Mulok Baru */}
      {availableToAdd.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">Tambah Mata Pelajaran Lokal:</h3>
          <div className="flex gap-2">
            <Select value={selectedMulok} onValueChange={(value) => setSelectedMulok(value as AvailableMulok)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih mata pelajaran..." />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </div>
        </div>
      )}

      {availableToAdd.length === 0 && mulokList.length > 0 && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          ✓ Semua mata pelajaran lokal sudah ditambahkan
        </div>
      )}
    </div>
  );
}

export function MulokManager({ inline = false }: MulokManagerProps) {
  const [open, setOpen] = useState(false);

  if (inline) {
    return <MulokManagerForm />;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Kelola Mulok
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kelola Mata Pelajaran Lokal (Mulok)</DialogTitle>
          <DialogDescription>
            Tambahkan atau hapus mata pelajaran lokal. Bahasa Sunda wajib dan tidak bisa dihapus.
            Perubahan akan otomatis tercermin di template Excel yang diunduh.
          </DialogDescription>
        </DialogHeader>
        <MulokManagerForm />
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Zap, History } from "lucide-react";
import { PageCard, PageHeader } from "@/components/layout/PageCard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DocumentUploadDialog } from "@/components/scanning/DocumentUploadDialog";
import { ScanningReviewDialog } from "@/components/scanning/ScanningReviewDialog";
import { ScanningHistoryDialog } from "@/components/scanning/ScanningHistoryDialog";
import { useScanningSession } from "@/hooks/useScanningSession";
import { useStudentStore } from "@/stores/studentStore";
import type { DocumentScanRequest } from "@/types/scanning.types";
import { toast } from "sonner";

export const Route = createFileRoute("/scanning")({
  head: () => ({ meta: [{ title: "Pindai Nilai — Rekap Nilai MI" }] }),
  component: ScanningPage,
});

function ScanningPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const activeStudent = useStudentStore((s) => s.getActive());
  const updateIdentitas = useStudentStore((s) => s.updateIdentitas);
  const updateUjianTertulis = useStudentStore((s) => s.updateUjianTertulis);

  const {
    status,
    sessionData,
    error,
    processDocument,
    applyChanges,
    reset,
  } = useScanningSession();

  const handleDocumentSelected = async (request: DocumentScanRequest) => {
    try {
      await processDocument(request, activeStudent || undefined, useMock);
      toast.success("Dokumen berhasil diproses");
    } catch (err) {
      toast.error("Gagal memproses dokumen");
    }
  };

  const handleApplyChanges = async () => {
    if (!activeStudent) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }

    try {
      const result = await applyChanges(activeStudent.id, activeStudent);

      // Update UI dengan changes yang diterapkan
      if (result.appliedChanges.identitas) {
        Object.entries(result.appliedChanges.identitas).forEach(([key, value]) => {
          updateIdentitas(activeStudent.id, { [key]: value } as any);
        });
      }

      if (result.appliedChanges.nilai?.ujianTertulis) {
        Object.entries(result.appliedChanges.nilai.ujianTertulis).forEach(
          ([subject, value]) => {
            updateUjianTertulis(activeStudent.id, subject as any, value as number);
          },
        );
      }

      toast.success("Data berhasil diterapkan ke sistem");
      reset();
      setShowUpload(false);
    } catch (err) {
      toast.error("Gagal menerapkan data");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pindai Nilai Siswa"
        description="Gunakan AI untuk memindai dan mengekstrak nilai dari dokumen fisik atau digital"
      />

      {/* Main Card */}
      <PageCard>
        <div className="space-y-6">
          {/* Status Information */}
          {activeStudent ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-900">
                <strong>Siswa Aktif:</strong> {activeStudent.identitas.nama}
              </p>
              <p className="text-blue-800 text-xs mt-1">
                Dokumen pemindaian akan diterapkan ke siswa ini
              </p>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Pilih siswa dari halaman "Daftar Siswa" untuk memulai pemindaian
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Status Display */}
          {status !== "idle" && status !== "success" && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-800">
                Status: <strong>{status}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowUpload(true)}
              disabled={!activeStudent || status !== "idle"}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              Pindai Dokumen Nilai
            </Button>

            <Button
              onClick={() => setShowHistory(true)}
              variant="outline"
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Lihat Riwayat
            </Button>

            {/* Development Toggle */}
            {process.env.NODE_ENV === "development" && (
              <Button
                onClick={() => setUseMock(!useMock)}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                {useMock ? "Mock OCR" : "Real OCR"}
              </Button>
            )}
          </div>

          {/* Dialogs */}
          <DocumentUploadDialog
            open={showUpload}
            onOpenChange={setShowUpload}
            onDocumentSelected={handleDocumentSelected}
            isProcessing={status === "uploading" || status === "processing"}
          />

          <ScanningReviewDialog
            open={status === "review" && sessionData !== null}
            onOpenChange={(open) => {
              if (!open) reset();
            }}
            sessionData={sessionData}
            onApply={handleApplyChanges}
            onCancel={reset}
            isApplying={status === "applying"}
          />

          <ScanningHistoryDialog
            open={showHistory}
            onOpenChange={setShowHistory}
            studentId={activeStudent?.id}
          />

          {/* Feature Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">📄 Format Dokumen yang Didukung</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Rapor Semester</li>
                <li>• Transkrip Nilai</li>
                <li>• Lembar Penilaian</li>
                <li>• Dokumen Digital lainnya</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">✨ Fitur Utama</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Akurasi OCR 95%+</li>
                <li>• Validasi Data Otomatis</li>
                <li>• Review & Koreksi Manual</li>
                <li>• Backup & Rollback</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">🔐 Keamanan Data</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Backup otomatis sebelum perubahan</li>
                <li>• Mekanisme rollback yang aman</li>
                <li>• Logging semua transaksi</li>
                <li>• Deteksi anomali data</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">⚙️ Workflow</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Upload dokumen nilai</li>
                <li>2. Pilih semester & tipe dokumen</li>
                <li>3. Review hasil OCR & validasi</li>
                <li>4. Koreksi manual jika diperlukan</li>
                <li>5. Terapkan ke database</li>
              </ul>
            </div>
          </div>
        </div>
      </PageCard>
    </div>
  );
}

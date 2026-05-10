import { useState, useRef } from "react";
import { Upload, Camera, Loader2, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageQualityPreview } from "@/components/scanning/ImageQualityPreview";
import type { DocumentScanRequest } from "@/types/scanning.types";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentSelected: (data: DocumentScanRequest) => void;
  isProcessing?: boolean;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onDocumentSelected,
  isProcessing = false,
}: DocumentUploadDialogProps) {
  const [documentType, setDocumentType] = useState<
    "rapor" | "transkrip" | "lembar-penilaian" | "other"
  >("rapor");
  const [semester, setSemester] = useState<string>("1");
  const [error, setError] = useState<string>("");
  const [showQualityPreview, setShowQualityPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const handleFileSelected = async (file: File) => {
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar (JPG, PNG, PDF)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setError("Ukuran file terlalu besar (max 10MB)");
      return;
    }

    // Show quality preview first
    setSelectedFile(file);
    setShowQualityPreview(true);
  };

  const handleQualityPreviewConfirm = async () => {
    if (!selectedFile) return;

    try {
      const base64 = await fileToBase64(selectedFile);
      onDocumentSelected({
        documentType,
        semester: parseInt(semester),
        imageData: base64,
        fileName: selectedFile.name,
      });
      onOpenChange(false);
      setSelectedFile(null);
    } catch (err) {
      setError("Gagal membaca file");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError("Tidak bisa mengakses kamera");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL("image/jpeg");
        
        // Convert data URL to File
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
            handleFileSelected(file);
            stopCamera();
          }
        }, "image/jpeg", 0.95);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pindai Dokumen Nilai</DialogTitle>
          <DialogDescription>
            Upload atau ambil foto dokumen nilai siswa untuk pemindaian otomatis
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Tipe Dokumen */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tipe Dokumen</label>
            <Select value={documentType} onValueChange={(value: any) => setDocumentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rapor">Rapor</SelectItem>
                <SelectItem value="transkrip">Transkrip Nilai</SelectItem>
                <SelectItem value="lembar-penilaian">Lembar Penilaian</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Semester */}
          <div>
            <label className="text-sm font-medium mb-2 block">Semester</label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Options */}
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="camera">Ambil Foto</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Klik untuk upload atau drag file</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG (maks 10MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  disabled={isProcessing}
                  className="hidden"
                />
              </div>
            </TabsContent>

            <TabsContent value="camera" className="mt-4">
              {!cameraActive ? (
                <Button
                  onClick={startCamera}
                  className="w-full"
                  disabled={isProcessing}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Buka Kamera
                </Button>
              ) : (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black"
                  />
                  <div className="flex gap-2">
                    <Button onClick={capturePhoto} className="flex-1" disabled={isProcessing}>
                      Ambil Foto
                    </Button>
                    <Button onClick={stopCamera} variant="outline" className="flex-1">
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memproses dokumen...
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <ImageQualityPreview
          open={showQualityPreview}
          onOpenChange={setShowQualityPreview}
          imageFile={selectedFile}
          onConfirm={handleQualityPreviewConfirm}
          qualityThreshold={70}
        />
      </DialogContent>
    </Dialog>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

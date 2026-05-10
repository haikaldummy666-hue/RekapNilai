import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Zap, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { analyzeImageQuality, passesQualityThreshold, formatQualityReport } from "@/utils/imageQualityAssessment";
import type { ImageQualityMetrics } from "@/utils/imageQualityAssessment";

interface ImageQualityPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onConfirm: () => void;
  qualityThreshold?: number;
}

export function ImageQualityPreview({
  open,
  onOpenChange,
  imageFile,
  onConfirm,
  qualityThreshold = 70,
}: ImageQualityPreviewProps) {
  const [metrics, setMetrics] = useState<ImageQualityMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (open && imageFile) {
      analyzeImage();
    }
  }, [open, imageFile]);

  const analyzeImage = async () => {
    setLoading(true);
    try {
      const img = new Image();
      const url = URL.createObjectURL(imageFile!);
      img.onload = async () => {
        const metrics = await analyzeImageQuality(img);
        setMetrics(metrics);
        setPassed(passesQualityThreshold(metrics, qualityThreshold));
        setImageUrl(url);
      };
      img.src = url;
    } catch (error) {
      console.error("Error analyzing image:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return null;
  }

  const getMetricColor = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const getStatusIcon = () => {
    if (metrics.qualityRating === "excellent" || metrics.qualityRating === "good") {
      return <CheckCircle2 className="w-8 h-8 text-green-600" />;
    } else if (metrics.qualityRating === "acceptable") {
      return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
    } else {
      return <AlertCircle className="w-8 h-8 text-destructive" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Quality Assessment
          </DialogTitle>
          <DialogDescription>
            Foto dokumen Anda akan dianalisis kualitasnya sebelum OCR processing
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
            <p className="text-muted-foreground">Analyzing image quality...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="flex justify-center">
              <img
                src={imageUrl}
                alt="Preview"
                className="max-w-xs max-h-64 rounded-lg border"
              />
            </div>

            {/* Overall Status */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">Overall Score</h3>
                <Badge
                  variant={
                    metrics.qualityRating === "excellent"
                      ? "default"
                      : metrics.qualityRating === "good"
                        ? "secondary"
                        : metrics.qualityRating === "acceptable"
                          ? "outline"
                          : "destructive"
                  }
                  className="text-lg px-3 py-1"
                >
                  {metrics.overallScore}%
                </Badge>
              </div>
              <Progress value={metrics.overallScore} className="h-3" />
              <p className="text-sm text-blue-800 mt-2 capitalize">
                Rating: <strong>{metrics.qualityRating}</strong>
              </p>
            </div>

            {/* Individual Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-1">Brightness</div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{metrics.brightness}%</span>
                  <Badge variant={getMetricColor(metrics.brightness)}>
                    {metrics.brightness < 30
                      ? "Dark"
                      : metrics.brightness > 90
                        ? "Bright"
                        : "Optimal"}
                  </Badge>
                </div>
                <Progress value={metrics.brightness} className="mt-2" />
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-1">Contrast</div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{metrics.contrast}%</span>
                  <Badge variant={getMetricColor(metrics.contrast)}>
                    {metrics.contrast < 40 ? "Low" : "Good"}
                  </Badge>
                </div>
                <Progress value={metrics.contrast} className="mt-2" />
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-1">Sharpness</div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{metrics.sharpness}%</span>
                  <Badge variant={getMetricColor(metrics.sharpness)}>
                    {metrics.sharpness < 40 ? "Blur" : "Sharp"}
                  </Badge>
                </div>
                <Progress value={metrics.sharpness} className="mt-2" />
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-1">Tilt Angle</div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{metrics.tilt.toFixed(1)}°</span>
                  <Badge
                    variant={Math.abs(metrics.tilt) > 15 ? "destructive" : "default"}
                  >
                    {Math.abs(metrics.tilt) > 15 ? "Tilted" : "Straight"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* File Info */}
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution:</span>
                <span className="font-mono">
                  {metrics.resolution.width}x{metrics.resolution.height}px ({metrics.resolution.dpi} DPI)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">File Size:</span>
                <span className="font-mono">{(metrics.fileSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Color Profile:</span>
                <span className="font-mono">{metrics.colorProfile.toUpperCase()}</span>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Recommendations:</h4>
              <div className="space-y-2">
                {metrics.recommendations.map((rec, idx) => {
                  const isPositive = rec.startsWith("✅");
                  const isWarning = rec.startsWith("⚠️");
                  const isError = rec.startsWith("❌");

                  return (
                    <Alert key={idx} variant={isError ? "destructive" : "default"}>
                      <AlertDescription
                        className={
                          isPositive
                            ? "text-green-800"
                            : isWarning
                              ? "text-yellow-800"
                              : ""
                        }
                      >
                        {rec}
                      </AlertDescription>
                    </Alert>
                  );
                })}
              </div>
            </div>

            {/* Quality Status Alert */}
            {!passed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Quality score di bawah threshold ({qualityThreshold}%). Sangat disarankan untuk
                  mengulang foto dengan setting yang lebih baik.
                </AlertDescription>
              </Alert>
            )}

            {passed && metrics.qualityRating === "acceptable" && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Kualitas cukup untuk OCR, tapi siapkan untuk review dan koreksi manual.
                </AlertDescription>
              </Alert>
            )}

            {passed && (metrics.qualityRating === "good" || metrics.qualityRating === "excellent") && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✓ Kualitas {metrics.qualityRating}! Siap untuk OCR processing dengan hasil
                  optimal.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Ulangi Foto
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={loading || (!passed && qualityThreshold > 60)}
          >
            {passed ? "Lanjutkan OCR Processing" : "Proses Meski Kualitas Rendah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

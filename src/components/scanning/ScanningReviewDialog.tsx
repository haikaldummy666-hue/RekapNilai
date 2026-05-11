import { useState } from "react";
import { CheckCircle2, AlertCircle, Edit2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ScanningSessionData,
  ReviewItem,
  DataValidationResult,
} from "@/types/scanning.types";

interface ScanningReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionData: ScanningSessionData | null;
  onApply: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function ScanningReviewDialog({
  open,
  onOpenChange,
  sessionData,
  onApply,
  onCancel,
  isApplying = false,
}: ScanningReviewDialogProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);

  if (!sessionData) return null;

  const formatValue = (v: unknown): string => {
    if (v === null) return "null";
    if (v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
    try {
      const s = JSON.stringify(v);
      return s.length > 400 ? `${s.slice(0, 400)}…` : s;
    } catch {
      return String(v);
    }
  };

  const handleStartEdit = (fieldName: string, value: any) => {
    setEditingField(fieldName);
    setEditValue(formatValue(value));
  };

  const handleSaveEdit = (fieldName: string) => {
    const current = sessionData.reviewItems.find((i) => i.fieldName === fieldName);
    const original = current?.ocrValue;
    let nextValue: any = editValue;
    if (typeof original === "number") {
      const n = Number(editValue);
      nextValue = Number.isFinite(n) ? n : original;
    } else if (typeof original === "boolean") {
      nextValue = String(editValue).trim().toLowerCase() === "true";
    } else if (original && typeof original === "object") {
      try {
        nextValue = JSON.parse(String(editValue));
      } catch {
        nextValue = original;
      }
    }

    sessionData.reviewItems = sessionData.reviewItems.map((item) =>
      item.fieldName === fieldName ? { ...item, ocrValue: nextValue, status: "corrected" } : item,
    );
    setEditingField(null);
    setEditValue(null);
  };

  const getStatusColor = (
    status: "verified" | "corrected" | "skipped",
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "verified":
        return "default";
      case "corrected":
        return "secondary";
      case "skipped":
        return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Hasil Pemindaian</DialogTitle>
          <DialogDescription>
            Periksa dan sesuaikan data yang berhasil dipindai sebelum diterapkan
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="data" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="validation">Validasi</TabsTrigger>
            <TabsTrigger value="anomalies">Anomali</TabsTrigger>
          </TabsList>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-4">
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {sessionData.reviewItems.map((item) => (
                <div key={item.fieldName} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.fieldName}</span>
                        <Badge variant={getStatusColor(item.status)} className="text-xs">
                          {item.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Akurasi OCR: {item.confidence}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Hasil Pindai</p>
                      {editingField === item.fieldName ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveEdit(item.fieldName)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingField(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-mono">{formatValue(item.ocrValue)}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleStartEdit(item.fieldName, item.ocrValue)
                            }
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {item.currentValue !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Nilai Sebelumnya
                        </p>
                        <p className="font-mono text-muted-foreground">
                          {formatValue(item.currentValue)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-4">
            {sessionData.validation.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  Errors ({sessionData.validation.errors.length})
                </h4>
                {sessionData.validation.errors.map((error, idx) => (
                  <Alert key={idx} variant="destructive" className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{error.field}:</strong> {error.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {sessionData.validation.warnings.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Warnings ({sessionData.validation.warnings.length})
                </h4>
                {sessionData.validation.warnings.map((warning, idx) => (
                  <Alert key={idx} className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{warning.field}:</strong> {warning.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {sessionData.validation.errors.length === 0 &&
              sessionData.validation.warnings.length === 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✓ Semua data valid dan siap diterapkan
                  </AlertDescription>
                </Alert>
              )}
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-4">
            {sessionData.validation.anomalies.length === 0 ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Tidak ada anomali terdeteksi
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {sessionData.validation.anomalies.map((anomaly, idx) => (
                  <div key={idx} className="border rounded p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <strong>{anomaly.field}</strong>
                      <Badge variant="outline">{anomaly.type}</Badge>
                    </div>
                    <p className="text-muted-foreground">{anomaly.description}</p>
                    {anomaly.value !== undefined && (
                      <p className="text-xs mt-2">
                        Nilai: <span className="font-mono">{formatValue(anomaly.value)}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {sessionData.errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{sessionData.errorMessage}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
            disabled={isApplying}
          >
            Batal
          </Button>
          <Button
            onClick={() => {
              onApply();
            }}
            disabled={isApplying || !sessionData.canApply}
          >
            {isApplying ? "Menerapkan..." : "Terapkan Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

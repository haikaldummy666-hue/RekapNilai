import { useState, useEffect } from "react";
import { Download, Eye, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getScanningHistory } from "@/lib/databaseOperations";
import type { ScanningTransaction } from "@/types/scanning.types";

interface ScanningHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
}

export function ScanningHistoryDialog({
  open,
  onOpenChange,
  studentId,
}: ScanningHistoryDialogProps) {
  const [transactions, setTransactions] = useState<ScanningTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<ScanningTransaction | null>(null);

  useEffect(() => {
    if (open && studentId) {
      loadHistory();
    }
  }, [open, studentId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await getScanningHistory(studentId!, 50);
      setTransactions(history);
    } catch (error) {
      console.error("Failed to load scanning history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) =>
    statusFilter === "all" ? true : t.status === statusFilter,
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
      case "rolled-back":
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case "pending":
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      "rolled-back": "destructive",
    };
    return variants[status] || "outline";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Riwayat Pemindaian Nilai</DialogTitle>
          <DialogDescription>
            {studentId
              ? "Daftar semua transaksi pemindaian untuk siswa ini"
              : "Daftar semua transaksi pemindaian"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filter Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="rolled-back">Rolled Back</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadHistory} variant="outline">
                Refresh
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat data...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada transaksi pemindaian
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Tipe Dokumen</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Akurasi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {new Date(transaction.timestamp).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {transaction.documentType}
                      </TableCell>
                      <TableCell className="text-sm">
                        Semester {transaction.semester}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.status)}
                          <Badge variant={getStatusBadge(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {Math.round(transaction.ocrResult.confidence)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Detail Modal */}
      {selectedTransaction && (
        <Dialog
          open={!!selectedTransaction}
          onOpenChange={(open) => {
            if (!open) setSelectedTransaction(null);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detail Transaksi Pemindaian</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">ID Transaksi</p>
                  <p className="font-mono text-xs">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Status</p>
                  <Badge variant={getStatusBadge(selectedTransaction.status)}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Waktu</p>
                  <p>{new Date(selectedTransaction.timestamp).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Akurasi OCR</p>
                  <p className="font-semibold">
                    {Math.round(selectedTransaction.ocrResult.confidence)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Tipe Dokumen</p>
                  <p className="capitalize">{selectedTransaction.documentType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Semester</p>
                  <p>{selectedTransaction.semester}</p>
                </div>
              </div>

              {/* Extracted Data */}
              <div>
                <h4 className="font-medium mb-2">Data yang Diekstraksi</h4>
                <div className="bg-muted p-4 rounded-lg text-sm space-y-1 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedTransaction.ocrResult.extractedFields, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Applied Changes */}
              {selectedTransaction.appliedChanges && (
                <div>
                  <h4 className="font-medium mb-2">Perubahan yang Diterapkan</h4>
                  <div className="bg-muted p-4 rounded-lg text-sm space-y-1 max-h-48 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedTransaction.appliedChanges, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Manual Corrections */}
              {selectedTransaction.manualCorrections && (
                <div>
                  <h4 className="font-medium mb-2">Koreksi Manual</h4>
                  <div className="bg-muted p-4 rounded-lg text-sm space-y-1">
                    {Object.entries(selectedTransaction.manualCorrections).map(
                      ([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-mono">{key}:</span> {String(value)}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTransaction.notes && (
                <div>
                  <h4 className="font-medium mb-2">Catatan</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTransaction.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  // Export transaction data
                  const data = JSON.stringify(selectedTransaction, null, 2);
                  const blob = new Blob([data], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `transaction-${selectedTransaction.id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

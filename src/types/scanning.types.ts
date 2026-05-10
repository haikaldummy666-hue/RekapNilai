/**
 * Types untuk AI OCR scanning system
 */

export type ScanningStatus = "idle" | "uploading" | "processing" | "review" | "applying" | "success" | "error";

export interface OcrExtractionResult {
  rawText: string;
  confidence: number; // 0-100
  extractedFields: {
    nisn?: string;
    noUjian?: string;
    nama?: string;
    jenisKelamin?: "L" | "P";
    tempatLahir?: string;
    tanggalLahir?: string;
    namaAyah?: string;
    namaIbu?: string;
    values?: Record<string, number>;
  };
}

export interface DocumentScanRequest {
  documentType: "rapor" | "transkrip" | "lembar-penilaian" | "other";
  semester: number; // 1, 2, 3, dst
  imageData: string; // base64
  fileName: string;
}

export interface ScanningTransaction {
  id: string;
  studentId?: string;
  timestamp: string;
  documentType: string;
  semester: number;
  status: "pending" | "completed" | "failed" | "rolled-back";
  ocrResult: OcrExtractionResult;
  appliedChanges?: {
    beforeSnapshot: any;
    afterSnapshot: any;
  };
  manualCorrections?: Record<string, any>;
  rollbackData?: any;
  userId?: string;
  notes?: string;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  anomalies: AnomalyDetection[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "critical" | "error";
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestedValue?: any;
}

export interface AnomalyDetection {
  type: "outlier" | "inconsistency" | "format-error" | "missing-data";
  field: string;
  description: string;
  value?: any;
  expectedRange?: [number, number];
}

export interface ReviewItem {
  fieldName: string;
  ocrValue: any;
  currentValue: any;
  confidence: number;
  status: "verified" | "corrected" | "skipped";
  corrections?: any;
}

export interface ScanningSessionData {
  transactionId: string;
  extractedData: Record<string, any>;
  reviewItems: ReviewItem[];
  validation: DataValidationResult;
  semester: number;
  documentType: string;
  canApply: boolean;
  errorMessage?: string;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  studentId: string;
  data: any;
  transactionId: string;
}

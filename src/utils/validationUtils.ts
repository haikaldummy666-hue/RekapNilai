/**
 * Data Validation Utilities
 * Validates extracted OCR data and provides validation results
 */

import type { DataValidationResult, ValidationError, ValidationWarning } from "@/types/scanning.types";
import { detectAnomalies } from "@/utils/ocrUtils";
import type { Identitas, NilaiSiswa } from "@/types/student.types";

const VALID_SUBJECTS = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Ilmu Pengetahuan Alam",
  "Ilmu Pengetahuan Sosial",
  "Pendidikan Agama",
  "Pendidikan Jasmani",
  "Seni Budaya",
];

/**
 * Validate extracted data from OCR
 */
export function validateExtractedData(
  extracted: Record<string, any>,
  currentStudent?: any,
): DataValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const anomalies = detectAnomalies(extracted, currentStudent);

  // Validate identitas fields
  const identitasErrors = validateIdentitas({
    nisn: extracted.nisn,
    noUjian: extracted.noUjian,
    nama: extracted.nama,
    jenisKelamin: extracted.jenisKelamin,
    tempatLahir: extracted.tempatLahir,
    tanggalLahir: extracted.tanggalLahir,
    namaAyah: extracted.namaAyah,
    namaIbu: extracted.namaIbu,
  });

  errors.push(...identitasErrors.errors);
  warnings.push(...identitasErrors.warnings);

  // Validate values
  if (extracted.values) {
    const valuesValidation = validateValues(extracted.values);
    errors.push(...valuesValidation.errors);
    warnings.push(...valuesValidation.warnings);
  } else {
    warnings.push({
      field: "values",
      message: "Tidak ada nilai yang terdeteksi dari dokumen",
    });
  }

  const isValid = errors.length === 0 && anomalies.filter((a) => a.type === "outlier").length === 0;

  return {
    isValid,
    errors,
    warnings,
    anomalies,
  };
}

/**
 * Validate identitas fields
 */
function validateIdentitas(data: Partial<Identitas>): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // NISN validation
  if (data.nisn) {
    if (!/^\d{10}$/.test(data.nisn)) {
      errors.push({
        field: "nisn",
        message: "NISN harus 10 digit angka",
        severity: "error",
        value: data.nisn,
      });
    }
  } else {
    warnings.push({
      field: "nisn",
      message: "NISN tidak terdeteksi atau kosong",
    });
  }

  // Nama validation
  if (!data.nama || data.nama.trim().length < 3) {
    warnings.push({
      field: "nama",
      message: "Nama tidak valid atau terlalu pendek",
    });
  }

  // Jenis kelamin validation
  if (data.jenisKelamin && !["L", "P"].includes(data.jenisKelamin)) {
    errors.push({
      field: "jenisKelamin",
      message: 'Jenis kelamin harus "L" atau "P"',
      severity: "error",
      value: data.jenisKelamin,
    });
  } else if (!data.jenisKelamin) {
    warnings.push({
      field: "jenisKelamin",
      message: "Jenis kelamin tidak terdeteksi",
    });
  }

  // Tanggal lahir validation
  if (data.tanggalLahir) {
    if (!isValidDate(data.tanggalLahir)) {
      errors.push({
        field: "tanggalLahir",
        message: "Format tanggal lahir tidak valid",
        severity: "error",
        value: data.tanggalLahir,
      });
    }
  } else {
    warnings.push({
      field: "tanggalLahir",
      message: "Tanggal lahir tidak terdeteksi",
    });
  }

  // Tempat lahir
  if (!data.tempatLahir || data.tempatLahir.trim().length < 2) {
    warnings.push({
      field: "tempatLahir",
      message: "Tempat lahir tidak terdeteksi atau tidak valid",
    });
  }

  return { errors, warnings };
}

/**
 * Validate nilai fields
 */
function validateValues(values: Record<string, number>): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (Object.keys(values).length === 0) {
    warnings.push({
      field: "values",
      message: "Tidak ada nilai yang terdeteksi",
    });
    return { errors, warnings };
  }

  Object.entries(values).forEach(([subject, value]) => {
    if (typeof value !== "number") {
      errors.push({
        field: subject,
        message: "Nilai harus berupa angka",
        severity: "error",
        value,
      });
      return;
    }

    if (value < 0 || value > 100) {
      errors.push({
        field: subject,
        message: `Nilai harus antara 0-100 (ditemukan: ${value})`,
        severity: "critical",
        value,
      });
    }

    if (value < 60) {
      warnings.push({
        field: subject,
        message: `Nilai rendah (${value}), periksa kembali`,
        suggestedValue: value,
      });
    }
  });

  // Check if too few subjects detected
  if (Object.keys(values).length < 5) {
    warnings.push({
      field: "values",
      message: `Hanya ${Object.keys(values).length} mata pelajaran terdeteksi, biasanya ada 8 MP`,
    });
  }

  return { errors, warnings };
}

/**
 * Check if date string is valid
 */
function isValidDate(dateStr: string): boolean {
  // Try various formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // yyyy-mm-dd
    /^\d{2}\/\d{2}\/\d{4}$/, // dd/mm/yyyy
    /^\d{2}-\d{2}-\d{4}$/, // dd-mm-yyyy
    /^\d{1,2}\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}$/i, // dd Bulan yyyy
  ];

  const isFormat = formats.some((f) => f.test(dateStr));
  if (!isFormat) return false;

  // Try to parse
  try {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: DataValidationResult): string {
  if (result.isValid) {
    return "✓ Data valid dan siap diterapkan";
  }

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;
  const anomalyCount = result.anomalies.length;

  const parts: string[] = [];

  if (errorCount > 0) {
    parts.push(`${errorCount} error`);
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} warning`);
  }
  if (anomalyCount > 0) {
    parts.push(`${anomalyCount} anomali`);
  }

  return `⚠ Ditemukan: ${parts.join(", ")}`;
}

/**
 * Get critical errors that prevent applying
 */
export function hasCriticalErrors(result: DataValidationResult): boolean {
  return result.errors.some((e) => e.severity === "critical" || e.severity === "error");
}

/**
 * OCR Processing Utilities
 * Handles document analysis, text extraction, and data parsing
 */

import type { OcrExtractionResult, AnomalyDetection } from "@/types/scanning.types";

/**
 * Parse OCR response from Google Vision API and extract structured data
 */
export async function processOcrResponse(
  visionApiResponse: any,
  documentType: string,
): Promise<OcrExtractionResult> {
  const texts = visionApiResponse.responses?.[0]?.textAnnotations || [];
  const fullText = texts[0]?.description || "";

  const confidence = calculateConfidence(visionApiResponse);
  const extractedFields = parseExtractedText(fullText, documentType);

  return {
    rawText: fullText,
    confidence,
    extractedFields,
  };
}

/**
 * Calculate overall confidence score for OCR result
 */
function calculateConfidence(visionResponse: any): number {
  const textAnnotations = visionResponse.responses?.[0]?.textAnnotations || [];
  if (textAnnotations.length === 0) return 0;

  // Calculate average confidence from detected text blocks
  const confidences = textAnnotations.slice(1).map((annotation: any) => {
    const confidence = annotation.confidence || 0;
    return Math.max(0, Math.min(100, confidence * 100));
  });

  if (confidences.length === 0) return textAnnotations[0]?.confidence || 0;

  const avgConfidence = confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length;
  return Math.round(avgConfidence);
}

/**
 * Parse extracted text and identify key fields
 */
function parseExtractedText(text: string, documentType: string): Record<string, any> {
  const lines = text.split("\n").map((l) => l.trim());
  const result: Record<string, any> = {};

  // Regex patterns untuk berbagai format
  const patterns = {
    nisn: /NISN[:\s]*([0-9]{10})/i,
    noUjian: /No\.?\s*Ujian[:\s]*([0-9A-Z]+)/i,
    nama: /Nama[:\s]*([A-Z][A-Za-z\s]+)/i,
    jk: /Jenis\s*Kelamin[:\s]*([LP])/i,
    tempatLahir: /Tempat\s*Lahir[:\s]*([A-Za-z\s]+)[,]/i,
    tanggalLahir: /Tanggal\s*Lahir[:\s]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i,
  };

  // Extract dari full text
  const fullTextLower = text.toLowerCase();

  Object.entries(patterns).forEach(([field, pattern]) => {
    const match = text.match(pattern);
    if (match) {
      result[field] = match[1];
    }
  });

  // Extract nilai dari tabel/struktur
  if (documentType === "rapor" || documentType === "transkrip") {
    result.values = extractValuesFromTable(text);
  }

  return result;
}

/**
 * Extract nilai from tabular data in document
 */
function extractValuesFromTable(text: string): Record<string, number> {
  const values: Record<string, number> = {};

  // Common subject patterns
  const subjectPatterns = {
    Matematika: /Matematika[:\s]*([0-9]{1,3})/i,
    "Bahasa Indonesia": /Bahasa\s+Indonesia[:\s]*([0-9]{1,3})/i,
    "Bahasa Inggris": /Bahasa\s+Inggris[:\s]*([0-9]{1,3})/i,
    "Ilmu Pengetahuan Alam": /IPA|Ilmu\s+Pengetahuan\s+Alam[:\s]*([0-9]{1,3})/i,
    "Ilmu Pengetahuan Sosial": /IPS|Ilmu\s+Pengetahuan\s+Sosial[:\s]*([0-9]{1,3})/i,
    "Pendidikan Agama": /Pendidikan\s+Agama[:\s]*([0-9]{1,3})/i,
    "Pendidikan Jasmani": /Pendidikan\s+Jasmani[:\s]*([0-9]{1,3})/i,
    "Seni Budaya": /Seni\s+Budaya[:\s]*([0-9]{1,3})/i,
  };

  Object.entries(subjectPatterns).forEach(([subject, pattern]) => {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        values[subject] = value;
      }
    }
  });

  return values;
}

/**
 * Format OCR extracted data for review
 */
export function formatExtractedDataForReview(extracted: any): Record<string, any> {
  return {
    NISN: extracted.nisn || "—",
    "No. Ujian": extracted.noUjian || "—",
    Nama: extracted.nama || "—",
    "Jenis Kelamin": extracted.jenisKelamin || "—",
    "Tempat Lahir": extracted.tempatLahir || "—",
    "Tanggal Lahir": extracted.tanggalLahir || "—",
    "Nama Ayah": extracted.namaAyah || "—",
    "Nama Ibu": extracted.namaIbu || "—",
    ...extracted.values,
  };
}

/**
 * Detect anomalies in extracted data
 */
export function detectAnomalies(
  extracted: Record<string, any>,
  currentStudent?: any,
): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];

  // Check untuk nilai yang out of range
  Object.entries(extracted.values || {}).forEach(([subject, value]) => {
    if (typeof value === "number") {
      if (value < 0 || value > 100) {
        anomalies.push({
          type: "outlier",
          field: subject,
          description: `Nilai diluar range 0-100: ${value}`,
          value,
          expectedRange: [0, 100],
        });
      }
    }
  });

  // Check untuk inconsistency dengan data existing
  if (currentStudent) {
    if (extracted.nama && currentStudent.identitas?.nama && extracted.nama !== currentStudent.identitas.nama) {
      anomalies.push({
        type: "inconsistency",
        field: "nama",
        description: `Nama tidak sesuai dengan data sebelumnya`,
        value: extracted.nama,
      });
    }

    if (extracted.nisn && currentStudent.identitas?.nisn && extracted.nisn !== currentStudent.identitas.nisn) {
      anomalies.push({
        type: "inconsistency",
        field: "nisn",
        description: `NISN tidak sesuai dengan data sebelumnya`,
        value: extracted.nisn,
      });
    }
  }

  // Check untuk format errors
  if (extracted.nisn && !/^\d{10}$/.test(extracted.nisn)) {
    anomalies.push({
      type: "format-error",
      field: "nisn",
      description: "Format NISN harus 10 digit",
      value: extracted.nisn,
    });
  }

  if (extracted.jenisKelamin && !["L", "P"].includes(extracted.jenisKelamin)) {
    anomalies.push({
      type: "format-error",
      field: "jenisKelamin",
      description: "Jenis kelamin harus L atau P",
      value: extracted.jenisKelamin,
    });
  }

  return anomalies;
}

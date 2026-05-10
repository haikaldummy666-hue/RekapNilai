/**
 * Server Actions untuk OCR Processing
 * Menggunakan Google Vision API atau Cloud Vision
 */

"use server";

import type { DocumentScanRequest, OcrExtractionResult } from "@/types/scanning.types";
import { processOcrResponse } from "@/utils/ocrUtils";

/**
 * Process document dengan Google Vision API
 * Implement dengan Cloud Vision API key dari environment
 */
export async function processDocumentWithVision(
  request: DocumentScanRequest,
): Promise<OcrExtractionResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error("Google Vision API key not configured");
  }

  try {
    // Prepare request untuk Google Vision API
    const visionRequest = {
      requests: [
        {
          image: {
            content: request.imageData.split(",")[1], // Remove data:image/png;base64, prefix
          },
          features: [
            {
              type: "TEXT_DETECTION",
              maxResults: 10,
            },
            {
              type: "DOCUMENT_TEXT_DETECTION",
              maxResults: 5,
            },
          ],
          imageContext: {
            languageHints: ["id"], // Indonesian
          },
        },
      ],
    };

    // Call Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(visionRequest),
      },
    );

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const visionResponse = await response.json();

    // Check for errors dalam response
    if (visionResponse.responses?.[0]?.error) {
      throw new Error(`Vision API error: ${visionResponse.responses[0].error.message}`);
    }

    // Process response
    const result = await processOcrResponse(visionResponse, request.documentType);

    return result;
  } catch (error) {
    console.error("Error processing document with Vision API:", error);
    throw error;
  }
}

/**
 * Alternative: Mock OCR untuk development/testing
 * Gunakan ini jika Google Vision API tidak tersedia
 */
export async function processDocumentWithMockOCR(
  request: DocumentScanRequest,
): Promise<OcrExtractionResult> {
  // Simulate OCR processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

  const mockData = {
    rawText: `
RAPOR SISWA
NISN: 1234567890
No. Ujian: ABC-2024-001
Nama: Ahmad Musafir
Jenis Kelamin: L
Tempat Lahir: Jakarta
Tanggal Lahir: 10 Januari 2015
Nama Ayah: Budi Santoso
Nama Ibu: Siti Nur'aini

NILAI SEMESTER 1
Matematika: 85
Bahasa Indonesia: 82
Bahasa Inggris: 78
IPA: 88
IPS: 80
Pendidikan Agama: 90
Pendidikan Jasmani: 92
Seni Budaya: 85
    `,
    confidence: 88 + Math.random() * 12,
    extractedFields: {
      nisn: "1234567890",
      noUjian: "ABC-2024-001",
      nama: "Ahmad Musafir",
      jenisKelamin: "L",
      tempatLahir: "Jakarta",
      tanggalLahir: "2015-01-10",
      namaAyah: "Budi Santoso",
      namaIbu: "Siti Nur'aini",
      values: {
        Matematika: 85,
        "Bahasa Indonesia": 82,
        "Bahasa Inggris": 78,
        "Ilmu Pengetahuan Alam": 88,
        "Ilmu Pengetahuan Sosial": 80,
        "Pendidikan Agama": 90,
        "Pendidikan Jasmani": 92,
        "Seni Budaya": 85,
      },
    },
  };

  return mockData as OcrExtractionResult;
}

/**
 * Main entry point untuk document processing
 */
export async function processDocumentScanning(
  request: DocumentScanRequest,
  useMockOCR: boolean = false,
): Promise<OcrExtractionResult> {
  // Validate request
  if (!request.imageData) {
    throw new Error("Image data is required");
  }

  if (!request.documentType) {
    throw new Error("Document type is required");
  }

  if (!request.semester || request.semester < 1) {
    throw new Error("Valid semester is required");
  }

  // Use mock OCR for development or fallback
  if (useMockOCR || !process.env.GOOGLE_VISION_API_KEY) {
    return processDocumentWithMockOCR(request);
  }

  return processDocumentWithVision(request);
}

/**
 * Analyze confidence dan quality dari extracted data
 */
export function analyzeExtractionQuality(result: OcrExtractionResult): {
  quality: "high" | "medium" | "low";
  score: number;
  recommendations: string[];
} {
  const confidence = result.confidence;
  const extractedCount = Object.values(result.extractedFields).filter((v) => v !== undefined).length;
  const hasValues = result.extractedFields.values && Object.keys(result.extractedFields.values).length > 0;

  let score = confidence;
  const recommendations: string[] = [];

  // Adjust score based on extracted fields
  if (extractedCount < 5) {
    score -= 20;
    recommendations.push("Beberapa field tidak terdeteksi dengan baik");
  }

  if (!hasValues) {
    score -= 30;
    recommendations.push("Nilai tidak terdeteksi dari dokumen");
  }

  if (confidence < 70) {
    recommendations.push("Akurasi OCR rendah, review hasil dengan seksama");
  }

  let quality: "high" | "medium" | "low" = "low";
  if (score >= 85) quality = "high";
  else if (score >= 70) quality = "medium";

  return {
    quality,
    score: Math.max(0, Math.min(100, score)),
    recommendations,
  };
}

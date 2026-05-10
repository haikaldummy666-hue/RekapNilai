/**
 * Demo Data & Testing Utilities untuk AI OCR Scanning System
 * Gunakan untuk development, testing, dan demo purposes
 */

import type { DocumentScanRequest, OcrExtractionResult, ScanningTransaction } from "@/types/scanning.types";

/**
 * Sample data untuk testing/demo
 */
export const DEMO_DOCUMENTS = {
  rapor_good: {
    documentType: "rapor" as const,
    semester: 1,
    fileName: "rapor-ahmad-s1.jpg",
    description: "Rapor berkualitas tinggi - hasil OCR sempurna",
    expectedConfidence: 95,
  },
  rapor_medium: {
    documentType: "rapor" as const,
    semester: 2,
    fileName: "rapor-budi-s2-blurry.jpg",
    description: "Rapor blur - akurasi medium",
    expectedConfidence: 75,
  },
  rapor_low: {
    documentType: "rapor" as const,
    semester: 1,
    fileName: "rapor-citra-s1-damaged.jpg",
    description: "Rapor rusak/hilang - akurasi rendah",
    expectedConfidence: 55,
  },
  transkrip: {
    documentType: "transkrip" as const,
    semester: 6,
    fileName: "transkrip-nilai-2026.jpg",
    description: "Transkrip nilai lengkap semester 1-6",
    expectedConfidence: 90,
  },
};

/**
 * Mock OCR results untuk berbagai scenario
 */
export function generateMockOcrResult(scenario: "perfect" | "partial" | "error"): OcrExtractionResult {
  const baseResult = {
    rawText: `RAPOR SISWA KELAS VI
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
Seni Budaya: 85`,
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

  switch (scenario) {
    case "perfect":
      return {
        rawText: baseResult.rawText,
        confidence: 98,
        extractedFields: baseResult.extractedFields,
      };

    case "partial":
      return {
        rawText: baseResult.rawText,
        confidence: 72,
        extractedFields: {
          nisn: "1234567890",
          nama: "Ahmad Musafir",
          // Missing some fields
          values: {
            Matematika: 85,
            "Bahasa Indonesia": 82,
            "Bahasa Inggris": 78,
            // Missing some values
          },
        },
      };

    case "error":
      return {
        rawText: "ILLEGAL_CHARACTERS_@#$%^&*()",
        confidence: 35,
        extractedFields: {
          nisn: "12345", // Wrong format
          nama: "???", // Garbage text
          values: {
            Matematika: 150, // Out of range
            "Bahasa Indonesia": -10, // Negative
          },
        },
      };

    default:
      return baseResult as OcrExtractionResult;
  }
}

/**
 * Generate mock transactions untuk history testing
 */
export function generateMockTransactions(count: number = 10): ScanningTransaction[] {
  const statuses: ScanningTransaction["status"][] = [
    "completed",
    "completed",
    "completed",
    "failed",
    "rolled-back",
  ];
  const documentTypes = ["rapor", "transkrip", "lembar-penilaian"];

  return Array.from({ length: count }, (_, i) => ({
    id: `txn_${Date.now()}_${i}`,
    studentId: `student_${Math.floor(i / 5) + 1}`,
    timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    documentType: documentTypes[i % documentTypes.length],
    semester: (i % 6) + 1,
    status: statuses[i % statuses.length],
    ocrResult: generateMockOcrResult(
      i % 5 === 0 ? "error" : i % 3 === 0 ? "partial" : "perfect",
    ),
    appliedChanges:
      statuses[i % statuses.length] === "completed"
        ? {
            beforeSnapshot: {},
            afterSnapshot: {},
          }
        : undefined,
  }));
}

/**
 * Test data untuk validation testing
 */
export const VALIDATION_TEST_CASES = {
  validData: {
    nisn: "1234567890",
    nama: "Ahmad Musafir",
    jenisKelamin: "L" as const,
    tempatLahir: "Jakarta",
    tanggalLahir: "2015-01-10",
    values: {
      Matematika: 85,
      "Bahasa Indonesia": 82,
      "Bahasa Inggris": 78,
    },
  },

  missingNisn: {
    nama: "Ahmad Musafir",
    jenisKelamin: "L" as const,
    values: { Matematika: 85 },
  },

  invalidNisn: {
    nisn: "123", // Too short
    nama: "Ahmad Musafir",
    values: { Matematika: 85 },
  },

  invalidJenisKelamin: {
    nisn: "1234567890",
    jenisKelamin: "X" as any, // Invalid
    values: { Matematika: 85 },
  },

  outOfRangeValue: {
    nisn: "1234567890",
    values: {
      Matematika: 150, // > 100
    },
  },

  negativeValue: {
    nisn: "1234567890",
    values: {
      Matematika: -10, // < 0
    },
  },

  allValidValues: {
    nisn: "1234567890",
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

/**
 * Compare two OCR results untuk testing accuracy
 */
export function compareOcrResults(
  expected: OcrExtractionResult,
  actual: OcrExtractionResult,
): {
  matchPercentage: number;
  fieldMatches: Record<string, boolean>;
  valueMatches: Record<string, boolean>;
} {
  const fieldMatches: Record<string, boolean> = {};
  const valueMatches: Record<string, boolean> = {};

  // Compare fields
  Object.entries(expected.extractedFields).forEach(([field, value]) => {
    if (field === "values") return;
    fieldMatches[field] = (actual.extractedFields as any)[field] === value;
  });

  // Compare values
  Object.entries(expected.extractedFields.values || {}).forEach(([subject, value]) => {
    valueMatches[subject] = (actual.extractedFields.values as any)?.[subject] === value;
  });

  const totalMatches = Object.values(fieldMatches).filter((v) => v).length +
    Object.values(valueMatches).filter((v) => v).length;
  const totalFields = Object.keys(fieldMatches).length + Object.keys(valueMatches).length;

  const matchPercentage = totalFields > 0 ? (totalMatches / totalFields) * 100 : 0;

  return {
    matchPercentage,
    fieldMatches,
    valueMatches,
  };
}

/**
 * Generate test report untuk OCR accuracy testing
 */
export function generateOcrTestReport(
  testCases: Array<{ name: string; expected: OcrExtractionResult; actual: OcrExtractionResult }>,
): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageAccuracy: number;
  details: Array<{ name: string; accuracy: number; status: "PASS" | "FAIL" }>;
} {
  const details = testCases.map((tc) => {
    const comparison = compareOcrResults(tc.expected, tc.actual);
    return {
      name: tc.name,
      accuracy: comparison.matchPercentage,
      status: comparison.matchPercentage >= 95 ? ("PASS" as const) : ("FAIL" as const),
    };
  });

  const passedTests = details.filter((d) => d.status === "PASS").length;
  const failedTests = details.filter((d) => d.status === "FAIL").length;
  const averageAccuracy =
    details.reduce((sum, d) => sum + d.accuracy, 0) / details.length;

  return {
    totalTests: testCases.length,
    passedTests,
    failedTests,
    averageAccuracy,
    details,
  };
}

/**
 * Benchmark OCR processing time
 */
export async function benchmarkOcrProcessing(
  iterations: number = 10,
): Promise<{
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  operationsPerSecond: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    // Simulate OCR processing
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 5000 + 3000),
    );

    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const operationsPerSecond = 1000 / averageTime;

  return {
    totalTime,
    averageTime,
    minTime,
    maxTime,
    operationsPerSecond,
  };
}

/**
 * Log test results untuk debugging
 */
export function logTestResults(report: ReturnType<typeof generateOcrTestReport>): void {
  console.group("OCR Accuracy Test Report");
  console.table({
    "Total Tests": report.totalTests,
    "Passed Tests": report.passedTests,
    "Failed Tests": report.failedTests,
    "Average Accuracy": `${report.averageAccuracy.toFixed(2)}%`,
  });

  console.group("Test Details");
  report.details.forEach((detail) => {
    const icon = detail.status === "PASS" ? "✅" : "❌";
    console.log(
      `${icon} ${detail.name}: ${detail.accuracy.toFixed(2)}%`,
    );
  });
  console.groupEnd();
  console.groupEnd();
}

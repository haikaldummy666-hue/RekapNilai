/**
 * Hook untuk mengelola scanning session
 */

import { useState, useCallback } from "react";
import type {
  DocumentScanRequest,
  OcrExtractionResult,
  ScanningSessionData,
  ReviewItem,
} from "@/types/scanning.types";
import { processDocumentScanning, analyzeExtractionQuality } from "@/lib/ocrServer";
import { validateExtractedData, formatValidationResult } from "@/utils/validationUtils";
import {
  applyOcrDataToStudent,
  createScanningTransaction,
} from "@/lib/databaseOperations";
import type { Student } from "@/types/student.types";

export function useScanningSession() {
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "review" | "applying" | "success" | "error"
  >("idle");
  const [sessionData, setSessionData] = useState<ScanningSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processDocument = useCallback(
    async (request: DocumentScanRequest, currentStudent?: Student, useMockOCR?: boolean) => {
      setStatus("uploading");
      setError(null);

      try {
        // Create transaction record
        const transaction = await createScanningTransaction({
          documentType: request.documentType,
          semester: request.semester,
          status: "pending",
          ocrResult: {
            rawText: "",
            confidence: 0,
            extractedFields: {},
          },
          studentId: currentStudent?.id,
        });

        setStatus("processing");

        // Process document dengan OCR
        const ocrResult = await processDocumentScanning(request, useMockOCR);

        // Validate hasil
        const validation = validateExtractedData(ocrResult.extractedFields, currentStudent);

        // Analyze quality
        const quality = analyzeExtractionQuality(ocrResult);

        // Prepare review items
        const reviewItems: ReviewItem[] = Object.entries(ocrResult.extractedFields).map(
          ([fieldName, value]) => ({
            fieldName,
            ocrValue: value,
            currentValue: currentStudent ? (currentStudent.identitas as any)?.[fieldName] : undefined,
            confidence: ocrResult.confidence,
            status: "verified",
          }),
        );

        // Create session data
        const data: ScanningSessionData = {
          transactionId: transaction.id,
          extractedData: ocrResult.extractedFields,
          reviewItems,
          validation,
          semester: request.semester,
          documentType: request.documentType,
          canApply: validation.isValid && quality.quality !== "low",
          errorMessage: quality.recommendations.join("; "),
        };

        setSessionData(data);
        setStatus("review");

        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);
        setStatus("error");
        throw err;
      }
    },
    [],
  );

  const applyChanges = useCallback(
    async (studentId: string, student: Student) => {
      if (!sessionData) {
        throw new Error("No session data available");
      }

      setStatus("applying");
      setError(null);

      try {
        const result = await applyOcrDataToStudent(
          studentId,
          sessionData.extractedData,
          sessionData.transactionId,
          student,
        );

        setStatus("success");
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to apply changes";
        setError(errorMsg);
        setStatus("error");
        throw err;
      }
    },
    [sessionData],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setSessionData(null);
    setError(null);
  }, []);

  const updateReviewItem = useCallback((fieldName: string, updates: Partial<ReviewItem>) => {
    setSessionData((prev) =>
      prev
        ? {
            ...prev,
            reviewItems: prev.reviewItems.map((item) =>
              item.fieldName === fieldName ? { ...item, ...updates } : item,
            ),
          }
        : null,
    );
  }, []);

  return {
    status,
    sessionData,
    error,
    processDocument,
    applyChanges,
    reset,
    updateReviewItem,
  };
}

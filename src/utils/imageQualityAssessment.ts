/**
 * Image Quality Assessment Tool
 * Evaluate dokumen photo sebelum OCR processing
 */

export interface ImageQualityMetrics {
  brightness: number; // 0-100
  contrast: number; // 0-100
  sharpness: number; // 0-100 (anti-blur)
  tilt: number; // degrees (-90 to 90)
  fileSize: number; // bytes
  resolution: {
    width: number;
    height: number;
    dpi: number;
  };
  colorProfile: "grayscale" | "rgb" | "cmyk";
  overallScore: number; // 0-100
  qualityRating: "excellent" | "good" | "acceptable" | "poor" | "unacceptable";
  recommendations: string[];
}

/**
 * Analyze image quality untuk OCR
 */
export async function analyzeImageQuality(imageData: HTMLImageElement | Canvas | File): Promise<ImageQualityMetrics> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Cannot access canvas context");
  }

  // Draw image ke canvas
  if (imageData instanceof File) {
    const img = new Image();
    const url = URL.createObjectURL(imageData);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  } else if (imageData instanceof HTMLImageElement) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.drawImage(imageData, 0, 0);
  } else if (imageData instanceof HTMLCanvasElement) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.drawImage(imageData, 0, 0);
  }

  // Get image data
  const imageDataPixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageDataPixels.data;

  // Calculate metrics
  const brightness = calculateBrightness(data);
  const contrast = calculateContrast(data, canvas.width, canvas.height);
  const sharpness = calculateSharpness(ctx, canvas.width, canvas.height);
  const tilt = detectTilt(ctx, canvas.width, canvas.height);
  const fileSize = imageData instanceof File ? imageData.size : canvas.width * canvas.height * 4;
  const resolution = {
    width: canvas.width,
    height: canvas.height,
    dpi: estimateDpi(canvas.width, canvas.height),
  };

  // Calculate overall score
  const overallScore = calculateOverallScore({
    brightness,
    contrast,
    sharpness,
    fileSize,
    tilt,
  });

  const qualityRating = getQualityRating(overallScore);
  const recommendations = generateRecommendations({
    brightness,
    contrast,
    sharpness,
    tilt,
    fileSize,
    qualityRating,
  });

  return {
    brightness,
    contrast,
    sharpness,
    tilt,
    fileSize,
    resolution,
    colorProfile: "rgb",
    overallScore,
    qualityRating,
    recommendations,
  };
}

/**
 * Calculate brightness (0-100)
 */
function calculateBrightness(data: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sum += (r + g + b) / 3;
  }
  const average = sum / (data.length / 4);
  return Math.min(100, Math.max(0, (average / 255) * 100));
}

/**
 * Calculate contrast (0-100)
 */
function calculateContrast(data: Uint8ClampedArray, width: number, height: number): number {
  const mean = Array.from(data).reduce((a, b, i) => (i % 4 !== 3 ? a + b : a), 0) / (data.length / 4);

  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pixel = (data[i] + data[i + 1] + data[i + 2]) / 3;
    variance += Math.pow(pixel - mean, 2);
  }
  variance /= data.length / 4;

  const stddev = Math.sqrt(variance);
  return Math.min(100, (stddev / 128) * 100);
}

/**
 * Calculate sharpness / anti-blur (0-100)
 */
function calculateSharpness(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  // Simple Laplacian kernel untuk detect edges (sharpness indicator)
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let edgeSum = 0;
  const kernel = [-1, -1, -1, -1, 8, -1, -1, -1, -1];

  for (let i = 1; i < height - 1; i++) {
    for (let j = 1; j < width - 1; j++) {
      let sum = 0;
      let idx = 0;

      for (let ki = -1; ki <= 1; ki++) {
        for (let kj = -1; kj <= 1; kj++) {
          const pixelIdx = ((i + ki) * width + (j + kj)) * 4;
          const pixel = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3;
          sum += pixel * kernel[idx];
          idx++;
        }
      }

      edgeSum += Math.abs(sum);
    }
  }

  const avgEdge = edgeSum / ((width - 2) * (height - 2));
  return Math.min(100, Math.max(0, (avgEdge / 10) * 100));
}

/**
 * Detect document tilt angle (-90 to 90 degrees)
 */
function detectTilt(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  // Simplified tilt detection - check horizontal line alignment
  // In production, use more sophisticated Hough transform
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Sample middle rows untuk find dominant direction
  let horizontalGradient = 0;
  for (let i = Math.floor(height / 3); i < Math.floor((2 * height) / 3); i++) {
    for (let j = 1; j < width - 1; j++) {
      const idx = (i * width + j) * 4;
      const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
      const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
      horizontalGradient += Math.abs(right - left);
    }
  }

  // Rough estimation - real implementation would use Hough transform
  const tilt = ((horizontalGradient % 90) - 45) * 0.1;
  return Math.max(-45, Math.min(45, tilt));
}

/**
 * Estimate DPI dari dimensions
 */
function estimateDpi(width: number, height: number): number {
  // Estimasi A4 paper (210x297 mm)
  const estimatedWidthMm = 210;
  const dpi = (width / estimatedWidthMm) * 25.4; // Convert mm to DPI
  return Math.round(dpi);
}

/**
 * Calculate overall quality score (0-100)
 */
function calculateOverallScore(metrics: {
  brightness: number;
  contrast: number;
  sharpness: number;
  fileSize: number;
  tilt: number;
}): number {
  // Weighted scoring
  const brightnessScore = metrics.brightness > 30 && metrics.brightness < 90 ? 100 : Math.abs(metrics.brightness - 60) * 2;
  const contrastScore = Math.min(100, metrics.contrast);
  const sharpnessScore = Math.min(100, metrics.sharpness);
  const tiltScore = 100 - Math.abs(metrics.tilt) * 2;

  // Overall weighted average
  const score =
    brightnessScore * 0.25 + contrastScore * 0.25 + sharpnessScore * 0.3 + tiltScore * 0.2;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Get quality rating
 */
function getQualityRating(score: number): "excellent" | "good" | "acceptable" | "poor" | "unacceptable" {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "acceptable";
  if (score >= 40) return "poor";
  return "unacceptable";
}

/**
 * Generate recommendations
 */
function generateRecommendations(metrics: {
  brightness: number;
  contrast: number;
  sharpness: number;
  tilt: number;
  fileSize: number;
  qualityRating: string;
}): string[] {
  const recommendations: string[] = [];

  // Brightness recommendations
  if (metrics.brightness < 30) {
    recommendations.push("❌ Foto terlalu gelap - gunakan flash atau pindah ke tempat terang");
  } else if (metrics.brightness > 90) {
    recommendations.push("❌ Foto terlalu terang/overexposed - kurangi exposure atau hindari direct sun");
  }

  // Contrast recommendations
  if (metrics.contrast < 30) {
    recommendations.push("⚠️ Kontras rendah - teks mungkin sulit dibaca, perbaiki lighting");
  }

  // Sharpness recommendations
  if (metrics.sharpness < 40) {
    recommendations.push("❌ Foto blur - steady tangan atau gunakan tripod saat foto");
  } else if (metrics.sharpness < 60) {
    recommendations.push("⚠️ Sharpness moderate - coba ulangi foto dengan fokus lebih baik");
  }

  // Tilt recommendations
  if (Math.abs(metrics.tilt) > 15) {
    recommendations.push("⚠️ Dokumen miring - ambil foto lebih tegak lurus");
  }

  // File size recommendations
  if (metrics.fileSize < 500 * 1024) {
    recommendations.push("⚠️ File terlalu kecil - gunakan resolusi lebih tinggi");
  } else if (metrics.fileSize > 5 * 1024 * 1024) {
    recommendations.push("✅ File besar - kompresi untuk mempercepat upload");
  }

  // General recommendations
  if (metrics.qualityRating === "excellent") {
    recommendations.push("✅ Kualitas sempurna! Siap untuk OCR processing");
  } else if (metrics.qualityRating === "good") {
    recommendations.push("👍 Kualitas baik - dapat diproses, hasil expected ~95%");
  } else if (metrics.qualityRating === "acceptable") {
    recommendations.push("⚠️ Kualitas cukup - akan diproses tapi siapkan untuk review manual");
  } else if (metrics.qualityRating === "poor") {
    recommendations.push("❌ Kualitas buruk - sangat disarankan untuk ulangi foto");
  } else if (metrics.qualityRating === "unacceptable") {
    recommendations.push("❌ Kualitas tidak dapat diterima - ULANGI FOTO dengan setting lebih baik");
  }

  return recommendations;
}

/**
 * Format quality report untuk display
 */
export function formatQualityReport(metrics: ImageQualityMetrics): string {
  return `
📊 IMAGE QUALITY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rating: ${metrics.qualityRating.toUpperCase()} (Score: ${metrics.overallScore}/100)

📐 METRICS:
  • Brightness: ${metrics.brightness}%
  • Contrast: ${metrics.contrast}%
  • Sharpness: ${metrics.sharpness}%
  • Tilt: ${metrics.tilt.toFixed(1)}°

📁 FILE:
  • Size: ${(metrics.fileSize / 1024).toFixed(1)} KB
  • Resolution: ${metrics.resolution.width}x${metrics.resolution.height}
  • Estimated DPI: ${metrics.resolution.dpi}

💡 RECOMMENDATIONS:
${metrics.recommendations.map((r) => `  ${r}`).join("\n")}
  `;
}

/**
 * Check if image passes quality threshold
 */
export function passesQualityThreshold(metrics: ImageQualityMetrics, threshold: number = 70): boolean {
  return metrics.overallScore >= threshold;
}

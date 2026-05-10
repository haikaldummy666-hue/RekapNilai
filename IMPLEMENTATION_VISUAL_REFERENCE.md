# 🎯 Visual Implementation Reference

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│  DocumentUploadDialog.tsx (Upload / Camera Capture)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ File Selected
                         ↓
┌─────────────────────────────────────────────────────────────┐
│            QUALITY ASSESSMENT (Client-side)                │
│                                                              │
│  ImageQualityPreview.tsx (Dialog Component)                │
│          ↓                                                   │
│  imageQualityAssessment.ts (Analysis Engine)               │
│    ├─ analyzeImageQuality()                                │
│    ├─ calculateBrightness() → 0-100%                       │
│    ├─ calculateContrast() → 0-100%                         │
│    ├─ calculateSharpness() → 0-100%                        │
│    ├─ detectTilt() → ±90° angle                            │
│    ├─ calculateOverallScore() → 0-100%                     │
│    ├─ getQualityRating() → Rating enum                     │
│    └─ generateRecommendations() → Tips[]                   │
└────────────────┬──────────────────────────────────────────┘
                 │
          User Decision
         /              \
        ✓ Retry        ✓ Proceed
       /                  \
      └────────┐    ┌──────┘
               │    │
        [Retake Photo] │
               │    │
               └─→ ↓
┌─────────────────────────────────────────────────────────────┐
│             OCR PROCESSING (Server-side)                   │
│  ocrServer.ts → Google Vision API (or Mock)               │
│  → Extract Text & Values                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              REVIEW & CORRECTIONS                          │
│  ScanningReviewDialog.tsx (Manual Edit if needed)          │
│  → User verify + correct errors                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               DATABASE & BACKUP                            │
│  databaseOperations.ts                                      │
│  → Backup snapshot before apply                            │
│  → Transaction log created                                 │
│  → Data stored in Supabase                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
ScanningPage (/scanning route)
├─ Header (Title + Description)
├─ StudentInfo Display
├─ ActionButtons
│  └─ "Pindai Dokumen Nilai"
│     └─ DocumentUploadDialog
│        ├─ Tab: Upload File
│        │  └─ File Input → handleFileSelected()
│        │     └─ ImageQualityPreview Dialog
│        │        ├─ Quality Metrics Display
│        │        ├─ Recommendations List
│        │        └─ Action Buttons
│        │           ├─ "Ulangi Foto"
│        │           └─ "Lanjutkan OCR"
│        │
│        └─ Tab: Ambil Foto
│           └─ Video Stream → capturePhoto()
│              └─ ImageQualityPreview Dialog
│                 └─ (same as above)
│
├─ "Lihat Riwayat" Button
│  └─ ScanningHistoryDialog
│     └─ Transaction List
│
└─ FeatureCards
   └─ Feature Descriptions
```

---

## Data Flow Diagram

```
┌─────────────┐
│   Image     │
│   File      │
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Canvas API                              │
│  getImageData() → Pixel Array            │
└──────┬───────────────────────────────────┘
       │
       ├──→ Brightness Analysis
       │    ├─ Sum RGB values
       │    ├─ Calculate average
       │    └─ Convert to 0-100%
       │
       ├──→ Contrast Analysis
       │    ├─ Calculate mean
       │    ├─ Calculate variance
       │    └─ stddev / 128 * 100 = score
       │
       ├──→ Sharpness Analysis
       │    ├─ Apply Laplacian kernel
       │    ├─ Detect edges
       │    └─ Sum edge strength
       │
       └──→ Tilt Detection
            ├─ Analyze horizontal gradients
            ├─ Find dominant direction
            └─ Estimate angle in degrees
       │
       ↓
┌──────────────────────────────────────────┐
│  Metrics Combined                        │
│  ├─ brightness: 65                       │
│ ├─ contrast: 72                          │
│  ├─ sharpness: 80                        │
│  ├─ tilt: 8                              │
│  └─ resolution: 1200x800 @ 96 DPI        │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Calculate Overall Score                 │
│  = brightness*0.25 +                     │
│    contrast*0.25 +                       │
│    sharpness*0.3 +                       │
│    (100 - tilt*2)*0.2                    │
│  = 76% → "GOOD"                          │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  ImageQualityMetrics Object              │
│  {                                       │
│    brightness: 65,                       │
│    contrast: 72,                         │
│    sharpness: 80,                        │
│    tilt: 8,                              │
│    fileSize: 524288,                     │
│    resolution: {...},                    │
│    colorProfile: "rgb",                  │
│    overallScore: 76,                     │
│    qualityRating: "good",                │
│    recommendations: [...]                │
│  }                                       │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Render in Preview Dialog                │
│  ├─ Show all metrics                     │
│  ├─ Display rating badge                 │
│  ├─ Show recommendations                 │
│  ├─ Alert if quality issues              │
│  └─ Action buttons                       │
└──────────────────────────────────────────┘
```

---

## Quality Score Calculation Formula

```
Overall Score Calculation:
──────────────────────────

score = (brightness * 0.25) +
        (contrast * 0.25) +
        (sharpness * 0.30) +
        ((100 - |tilt| * 2) * 0.20)

Where:
  brightness = 0-100% (higher is better in range 30-80)
  contrast = 0-100% (higher is better)
  sharpness = 0-100% (higher is better)
  tilt = -90 to +90° (smaller absolute value is better)

Weighting:
  25% → Brightness (important for OCR readability)
  25% → Contrast (important for text detection)
  30% → Sharpness (most important for character recognition)
  20% → Tilt (less critical, can auto-correct slight tilt)

Rating Thresholds:
  ≥85%        → EXCELLENT (Can proceed with confidence)
  70% - 84%   → GOOD (Proceed, expect good results)
  55% - 69%   → ACCEPTABLE (Proceed but plan review)
  40% - 54%   → POOR (Suggest retry, allow override)
  <40%        → UNACCEPTABLE (Block, require retry)
```

---

## File Organization

```
src/
├─ components/
│  └─ scanning/
│     ├─ DocumentUploadDialog.tsx ← Updated
│     ├─ ImageQualityPreview.tsx ← NEW
│     ├─ ScanningReviewDialog.tsx
│     └─ ScanningHistoryDialog.tsx
│
├─ utils/
│  ├─ imageQualityAssessment.ts ← NEW
│  ├─ ocrUtils.ts
│  ├─ validationUtils.ts
│  ├─ pdfUtils.ts
│  └─ ...
│
├─ hooks/
│  └─ useScanningSession.ts
│
├─ lib/
│  ├─ ocrServer.ts
│  ├─ databaseOperations.ts
│  └─ supabaseClient.ts
│
├─ routes/
│  └─ scanning.tsx
│
├─ types/
│  └─ scanning.types.ts
│
└─ stores/
   └─ ...

Root/
├─ PHOTO_QUALITY_REQUIREMENTS.md ← NEW
├─ QUALITY_ASSESSMENT_QUICK_START.md ← NEW
├─ IMAGE_QUALITY_IMPLEMENTATION_SUMMARY.md ← NEW
├─ INTEGRATION_CHECKLIST.md
├─ AI_OCR_SETUP_GUIDE.md
└─ ...
```

---

## State Management Flow

```
DocumentUploadDialog Component State:
────────────────────────────────────
const [documentType] = useState()        → "rapor" | "transkrip" | ...
const [semester] = useState()            → "1" to "6"
const [error] = useState()               → Error message string
const [showQualityPreview] = useState()   → Show/hide quality dialog
const [selectedFile] = useState()        → File object for preview
const [cameraActive] = useState()        → Camera open/close state

ImageQualityPreview Component State:
────────────────────────────────────
const [metrics] = useState()             → ImageQualityMetrics object
const [loading] = useState()             → Analysis in progress
const [imageUrl] = useState()            → Data URL for preview
const [passed] = useState()              → Quality threshold passed

useScanningSession Hook State:
──────────────────────────────
const [status] = useState()              → "idle" | "processing" | ...
const [sessionData] = useState()         → Full scanning session data
const [error] = useState()               → Error if occurred

Combined UX Flow:
────────────────
1. User: upload file
2. DocumentUploadDialog: Save to selectedFile
3. DocumentUploadDialog: Set showQualityPreview = true
4. ImageQualityPreview: Display with loading = true
5. ImageQualityPreview: Calculate metrics
6. ImageQualityPreview: Set metrics & passed state
7. UI: Render all metrics
8. User: Click "Lanjutkan" or "Ulangi"
9. DocumentUploadDialog: Submit to useScanningSession
10. useScanningSession: Process to OCR (next stage)
```

---

## Type Definitions

```typescript
interface ImageQualityMetrics {
  brightness: number;           // 0-100
  contrast: number;             // 0-100
  sharpness: number;            // 0-100
  tilt: number;                 // -90 to +90 degrees
  fileSize: number;             // bytes
  resolution: {
    width: number;
    height: number;
    dpi: number;
  };
  colorProfile: "grayscale" | "rgb" | "cmyk";
  overallScore: number;         // 0-100
  qualityRating: 
    | "excellent" 
    | "good" 
    | "acceptable" 
    | "poor" 
    | "unacceptable";
  recommendations: string[];    // User tips
}

interface DocumentScanRequest {
  documentType: "rapor" | "transkrip" | "lembar-penilaian" | "other";
  semester: number;             // 1-6
  imageData: string;            // base64
  fileName: string;
}

interface ImageQualityPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onConfirm: () => void;
  qualityThreshold?: number;    // default 70
}
```

---

## Integration Points

```
With Existing Components:
─────────────────────────

DocumentUploadDialog.tsx
  └─ Was: submitted directly
  └─ Now: shows quality preview first
  └─ Uses: imageQualityAssessment.ts functions
  └─ Renders: ImageQualityPreview component

With Existing Hooks:
───────────────────

useScanningSession.ts
  └─ Receives: Approved DocumentScanRequest after quality check
  └─ Calls: ocrServer.ts for processing
  └─ No changes needed (accepts after quality gate)

With Existing Utils:
────────────────────

ocrServer.ts
  └─ Receives: Image after quality assessment
  └─ Processes: With Google Vision API
  └─ Returns: Extraction results (unchanged)

databaseOperations.ts
  └─ Stores: Original image metadata including quality metrics
  └─ Tracks: Quality score in scanning_logs table
  └─ Enables: Audit trail of photo quality per scan

validationUtils.ts
  └─ Still validates: Extracted OCR data
  └─ Now informed by: Quality metrics (can adjust thresholds)
```

---

## Performance Characteristics

```
Canvas Analysis Performance:
────────────────────────────

Image Size    │ Analysis Time │ Metrics
──────────────┼───────────────┼─────────────────
512x512px     │ ~100ms        │ Instant
1024x768px    │ ~250ms        │ Very fast
1920x1440px   │ ~500ms        │ Still fast
4096x3072px   │ ~1500ms       │ Noticeable
8000x6000px   │ >2000ms       │ Slow

Optimization Tips:
  • Resize large images before upload
  • Use requestAnimationFrame for smooth UI
  • Show spinner during analysis
  • Cache results if same file analyzed twice

Memory Usage:
  • Image 1200x800 → ~4MB in memory (raw pixels)
  • Peak during analysis: ~8-10MB for typical image
  • Released after analysis complete
  • No memory leaks (canvas automatically garbage collected)
```

---

## Testing Strategy

```
Unit Test Cases:
────────────────
✓ calculateBrightness() with various pixel values
✓ calculateContrast() with uniform and varied pixels
✓ calculateSharpness() with sharp vs blurry images
✓ detectTilt() with level and tilted documents
✓ getQualityRating() with all score ranges
✓ generateRecommendations() with different issues

Integration Test Cases:
───────────────────────
✓ Upload good quality image → Excellent rating
✓ Upload medium quality image → Good/Acceptable rating
✓ Upload poor quality image → Poor/Unacceptable rating
✓ Camera capture → Quality preview shows
✓ Confirm flow → Image submitted to OCR
✓ Retry flow → Can take new photo

E2E Test Cases:
───────────────
✓ User flow: Upload → Preview → Confirm → OCR
✓ User flow: Capture → Preview → Retry → Preview → Confirm
✓ Error handling: Large file → Error shown
✓ Error handling: Wrong format → Error shown
✓ Performance: 1200px image analyzed <500ms
```

---

## Troubleshooting Matrix

```
Problem                    │ Cause                 │ Solution
───────────────────────────┼──────────────────────┼──────────────────────
Preview doesn't show       │ Import missing       │ Check imports in DialogUploadDialog
                           │ Component not in DOM  │ Check render statement
                           │ State not updating   │ Verify useState hook
───────────────────────────┼──────────────────────┼──────────────────────
Metrics all 0              │ Canvas context null  │ Check getContext('2d')
                           │ Image not loaded     │ Verify image loaded before analysis
                           │ Pixel data empty     │ Check getImageData call
───────────────────────────┼──────────────────────┼──────────────────────
Score always high/low      │ Calculation error    │ Review weighted average formula
                           │ Metric clamping      │ Check Math.min/Math.max bounds
                           │ Division by zero     │ Verify denominator not 0
───────────────────────────┼──────────────────────┼──────────────────────
Recommendations wrong      │ Threshold mismatch   │ Verify threshold values
                           │ Text generation bug  │ Check string concatenation
                           │ Logic error          │ Review if/else conditions
───────────────────────────┼──────────────────────┼──────────────────────
Slow analysis              │ Large image          │ Resize before upload
                           │ Low-end device       │ Test on target device
                           │ Nested loops         │ Optimize algorithm
───────────────────────────┼──────────────────────┼──────────────────────
Memory leak                │ Canvas not cleared   │ Call canvas.width = 0
                           │ Event listener leak  │ Remove on component unmount
                           │ Ref not cleaned      │ Check cleanup in useEffect
```

---

## Next Steps Checklist

```
Immediate:
  [ ] Read QUALITY_ASSESSMENT_QUICK_START.md
  [ ] Start dev server: npm run dev
  [ ] Test upload flow
  [ ] Test camera flow
  [ ] Verify quality preview renders
  [ ] Try different image qualities

Short-term:
  [ ] Setup Google Vision API
  [ ] Migrate Supabase database
  [ ] Enable real OCR processing
  [ ] Test end-to-end workflow
  [ ] Gather user feedback

Long-term:
  [ ] Fine-tune quality thresholds
  [ ] Add analytics tracking
  [ ] Build photo quality report dashboard
  [ ] Implement mobile app integration
```

---

*Visual Reference Created: Image Quality Assessment System v1.0*

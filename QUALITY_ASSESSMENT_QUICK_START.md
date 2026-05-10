# 🚀 Quick Start: Image Quality Assessment Testing

## Apa yang baru ditambahkan?

3 file baru untuk **Image Quality Assessment** sebelum OCR processing:

1. **`imageQualityAssessment.ts`** - Backend quality analysis engine
2. **`ImageQualityPreview.tsx`** - Preview dialog component
3. **`DocumentUploadDialog.tsx`** (updated) - Now integrated dengan quality check
4. **`PHOTO_QUALITY_REQUIREMENTS.md`** - Comprehensive photo guide

---

## 🎯 Workflow Baru (Visualized)

```
User Upload Photo
        ↓
[Quality Assessment Dialog Shows]
        ↓
   Check Metrics:
   ✓ Brightness
   ✓ Contrast  
   ✓ Sharpness
   ✓ Tilt Angle
        ↓
   Calculate Score (0-100%)
        ↓
   Show Recommendations
        ↓
   User: Confirm or Retry
        ↓
   [Proceed to OCR]
```

---

## ⚡ Testing Step-by-Step

### Step 1: Setup Environment
```bash
# In .env.local, ensure:
VITE_USE_MOCK_OCR=true  # Use mock OCR for testing
# VITE_GOOGLE_VISION_API_KEY=your-key  # (leave commented for now)
```

### Step 2: Start Dev Server
```bash
npm run dev
# Access: http://localhost:5173
```

### Step 3: Navigate to Scanning Page
```
Sidebar > Input Nilai > Pindai Nilai (AI)
Or direct: http://localhost:5173/scanning
```

### Step 4: Test Upload Flow
```
1. Click "Pindai Dokumen Nilai" button
2. Choose "Upload File" tab
3. Click upload area or drag image
4. **NEW:** Quality Preview dialog appears
5. See all metrics displayed
6. Click "Lanjutkan OCR Processing" or "Ulangi Foto"
```

### Step 5: Test Camera Flow
```
1. Click "Pindai Dokumen Nilai" button
2. Choose "Ambil Foto" tab
3. Click "Buka Kamera"
4. Take photo (any image)
5. **NEW:** Quality Preview dialog appears
6. Metrics auto-calculated from captured image
7. Proceed or retry
```

---

## 📊 Quality Metrics Explained

When preview dialog shows, you'll see:

```
BRIGHTNESS (0-100%)
├─ <30%  = ❌ Too Dark ("Foto terlalu gelap")
├─ 30-60% = ✅ Ideal ("Optimal")
└─ >90%  = ❌ Too Bright ("Foto terlalu terang")

CONTRAST (0-100%)
├─ <40%  = ⚠️ Low Contrast
├─ 40-70% = 👍 Good
└─ >70%  = ✅ Excellent

SHARPNESS (0-100%) - Anti-blur
├─ <40%  = ❌ Blurry ("Foto blur")
├─ 40-70% = ⚠️ Moderate Sharpness
└─ >70%  = ✅ Sharp

TILT ANGLE (degrees)
├─ ≤15°  = ✅ Straight ("Optimal")
├─ 15-25° = ⚠️ Slightly Tilted
└─ >25°  = ❌ Very Tilted ("Dokumen miring")
```

### Overall Score Interpretation

| Score | Rating | What it means | Typical Accuracy |
|-------|--------|---------------|------------------|
| ≥85% | 🟢 Excellent | Perfect lighting, straight, sharp | 95-99% |
| 70-84% | 🟢 Good | Normal conditions, acceptable | 85-95% |
| 55-69% | 🟡 Acceptable | Moderate issues, needs review | 70-85% |
| 40-54% | 🟠 Poor | Significant issues, suggest retry | 40-70% |
| <40% | 🔴 Unacceptable | Cannot process reliably | <40% |

---

## 🧪 Test Scenarios

### ✅ Test Case 1: Good Quality Image
**Expected**: Score ≥70%, Green checkmarks

Steps:
1. Use a well-lit photo (indoor light OK)
2. Photo should be straight (not tilted)
3. Teks/objects should be sharp
4. Upload to system
5. **Result**: Should see "Good" or "Excellent" rating

### ⚠️ Test Case 2: Medium Quality Image
**Expected**: Score 55-69%, Yellow warnings

Steps:
1. Use slightly dark photo
2. Or slightly tilted image
3. Or camera shake (slight blur)
4. Upload to system
5. **Result**: Should see "Acceptable" with recommendations

### ❌ Test Case 3: Poor Quality Image
**Expected**: Score <50%, Red flags

Steps:
1. Use very dark photo
2. Or heavily blurred
3. Or extreme tilt >30°
4. Upload to system
5. **Result**: Should see "Poor" or "Unacceptable", can still proceed if score >40%

---

## 💡 Pro Tips for Testing

### Get Different Quality Scores
```
HIGH QUALITY (95%+):
- Take phone photo near window in daytime
- Hold level, avoid tilt
- Make sure not blurry

MEDIUM QUALITY (70-80%):
- Take photo indoors with regular light
- Slight tilt is OK (<15°)
- Slightly soft focus is acceptable

LOW QUALITY (40-50%):
- Take photo in dark room
- Heavy blur or tilt
- Bad contrast

To test: Try uploading different quality photos
and compare metrics each time
```

### Download Test Images
If don't have test images, use:
- Screenshots of documents
- Phone camera photos
- Any mixed quality images

---

## 🐛 Debugging Tips

### If Quality Preview doesn't show
```
Check:
1. DevTools Console (F12) - any JS errors?
2. Network tab - file upload succeeded?
3. File size <10MB?
4. Image format: JPG/PNG?

If still not working:
- Restart dev server: npm run dev
- Hard refresh: Ctrl+Shift+R
- Clear cache: Ctrl+Shift+Delete
```

### If Metrics seem wrong
```
Example: "Brightness shows 5% for bright photo"

This might happen if:
- Image is screenshot (different color space)
- File format issue
- Canvas drawing glitch

Solution:
- Try different image format (JPG vs PNG)
- Try different photo source
- Check browser console for errors
```

### Performance concerns
```
Quality analysis is:
✓ Canvas-based (fast, no server call)
✓ Client-side only (instant)
✓ No external API call
✓ Typically <500ms for analysis

If slow:
- Reduce image resolution before upload
- Might be browser performance issue
- Try different browser
```

---

## 📋 Testing Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] Can navigate to `/scanning` route
- [ ] "Pindai Dokumen Nilai" button appears
- [ ] Upload dialog opens
- [ ] Can select "Upload File" tab
- [ ] Can select "Ambil Foto" tab (camera)
- [ ] File upload shows quality preview
- [ ] Camera capture shows quality preview
- [ ] Quality metrics display (all 4 showing)
- [ ] Overall score calculated
- [ ] Recommendations shown
- [ ] "Lanjutkan OCR Processing" button works
- [ ] "Ulangi Foto" button cancels and allows retry
- [ ] Dialog closes after confirming
- [ ] Different image qualities give different scores

---

## 🎬 Next: After Testing

### If Everything Works ✅
Congratulations! Quality assessment is integrated and working.

Next steps:
1. Setup Google Vision API key (see INTEGRATION_CHECKLIST.md)
2. Setup Supabase database (see INTEGRATION_CHECKLIST.md)
3. Remove mock OCR setting
4. Test with real OCR processing

### If Something Broken ❌
Troubleshoot:
1. Check console errors (F12)
2. Verify all imports in files
3. Check file paths are correct
4. Make sure imageQualityAssessment.ts is in src/utils/
5. Make sure ImageQualityPreview.tsx is in src/components/scanning/

Common issues:
- Import path wrong → Update import statement
- TypeScript errors → Check type definitions
- Component not rendering → Check Dialog setup

---

## 📚 Reference: File Locations

```
New/Updated Files:
✅ src/utils/imageQualityAssessment.ts (NEW)
✅ src/components/scanning/ImageQualityPreview.tsx (NEW)
✅ src/components/scanning/DocumentUploadDialog.tsx (UPDATED)
✅ PHOTO_QUALITY_REQUIREMENTS.md (NEW)

Related Existing:
├─ src/routes/scanning.tsx (uses DocumentUploadDialog)
├─ src/hooks/useScanningSession.ts (handles after preview)
├─ src/lib/ocrServer.ts (processes after quality check)
└─ src/types/scanning.types.ts (type definitions)
```

---

## 🎓 Learning: How Quality Assessment Works

Behind the scenes:

```javascript
// 1. Get image pixel data from canvas
const imageData = ctx.getImageData(0, 0, width, height);

// 2. Analyze brightness
const brightness = pixels.map(p => (p.r + p.g + p.b) / 3).average();

// 3. Analyze contrast
const contrast = calculateVariance(pixels);

// 4. Analyze sharpness (using Laplacian kernel)
const sharpness = detectEdges(pixels);

// 5. Analyze tilt
const tilt = detectHorizontalGradient(pixels);

// 6. Weight all metrics
score = brightness*0.25 + contrast*0.25 + sharpness*0.3 + tilt*0.2;

// 7. Return rating
rating = score >= 85 ? "excellent" : score >= 70 ? "good" : ...
```

No external library needed - pure canvas math!

---

## 🚀 Ready to Launch?

Once quality assessment is tested and working:

1. ✅ Quality preview working
2. ✅ Metrics displaying correctly  
3. ✅ Recommendations showing
4. ✅ User can retry or proceed

**You're ready for real OCR processing!**

Next: Follow INTEGRATION_CHECKLIST.md to:
- Setup Google Vision API
- Setup Supabase database
- Test real OCR with quality feedback

---

**Questions?** Check PHOTO_QUALITY_REQUIREMENTS.md for detailed guidance on photo quality!

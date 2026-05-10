# 📸 Panduan Foto Dokumen untuk OCR Scanning

## Ringkas: Foto seperti apa yang bisa dibaca oleh AI OCR?

Sistem OCR kami menggunakan **Google Vision API** (pre-trained, tidak perlu training), bukan YOLO. Google Vision API khusus untuk membaca teks dari dokumen dan foto, dan sudah bisa mengenali teks tanpa training tambahan.

**TL;DR - Quick Checklist:**
- ✅ Cahaya cukup (tidak gelap, tidak overexposed)
- ✅ Foto tegak lurus (tilt ≤15°)
- ✅ Teks jelas dan tajam (tidak blur)
- ✅ Resolusi 1200-2000px untuk hasil optimal
- ✅ File JPG/PNG (tidak PDF scan)

---

## 🎯 Akurasi OCR Berdasarkan Kualitas Foto

| Kualitas | Rating | Akurasi | Kondisi | Contoh |
|----------|--------|---------|---------|---------|
| **Sempurna** | Excellent | 95-99% | Cahaya terang, lurus, resolusi tinggi, teks besar | Foto laporan dengan pencahayaan studio |
| **Baik** | Good | 85-95% | Cahaya normal, slightly tilted, resolusi 1200px | Foto dengan ponsel di ruangan terang |
| **Cukup** | Acceptable | 70-85% | Cahaya moderate, tilt 15-25°, resolusi 800px | Foto cepat di indoor, agak miring |
| **Buruk** | Poor | 40-70% | Cahaya gelap, blur, tilt >25°, teks kecil | Foto gelap, tidak fokus, sangat miring |
| **Tidak Bisa** | Unacceptable | <40% | Gelap total, blur berat, teks tidak terlihat | Foto di ruangan gelap tanpa flash |

---

## 📷 Kondisi Pencahayaan

### ✅ BAIK: Cahaya Alami atau Terang
```
Kondisi Ideal:
- Cahaya natural (dekat jendela) ATAU cahaya ruangan terang
- Hindari shadow dari tangan/body saat foto
- Brightness meter: 50-80% pada preview
- Hasil: Teks jelas, background kontras

Contoh Skenario:
1. Ruangan dengan jendela, ambil foto siang hari
2. Meja kerja dengan lampu LED overhead
3. Outdoor saat mendung (cahaya diffused)
4. Flash + manual positioning (jangan dekat <15cm)
```

### ⚠️ MODERATE: Cahaya Sedang
```
Kondisi Dapat Diterima:
- Cahaya ruangan normal (office lighting)
- Ada shadow tapi masih bisa baca
- Brightness meter: 40-50% pada preview
- Hasil: Teks terlihat tapi mungkin butuh review

Contoh Skenario:
1. Ruangan indoor dengan lampu biasa
2. Saat sore/pagi dengan cahaya tidak langsung
3. Dengan reflector sederhana (kertas putih)
```

### ❌ BURUK: Cahaya Gelap atau Overexposed
```
Kondisi TIDAK Ideal:
- Ruangan gelap tanpa flash
- Direct sunlight (glare/overexposed)
- Brightness meter: <30% atau >90% pada preview
- Hasil: Teks tidak jelas, akurasi <50%

Contoh Skenario:
1. Foto di kamar gelap tanpa flash
2. Outdoor di terik matahari (glare)
3. Flash too close (overexposed spot)
4. Cahaya dari samping (side lighting)
```

---

## 📐 Posisi & Sudut (Tilt)

### ✅ BAIK: Tegak Lurus (≤15° tilt)
```
Positioning Guide:
- Tempat dokumen di permukaan datar
- Ambil foto dari atas (90° angle ideal)
- Tangan steady atau gunakan tripod
- Seluruh dokumen harus visible dalam frame

Teknik:
1. Letakkan laporan di meja
2. Berdiri di atas, camera pointing down
3. Pastikan 4 corner dokumen terlihat
4. Tilt tidak boleh lebih dari 15 derajat

Confidence Boost:
- Jika miring <5°: Akurasi +5% (sistem auto-correct kecil)
- Jika miring 5-15°: Akurasi -10% (masih acceptable)
- Jika miring >15°: Akurasi -30% (not recommended)
```

### ⚠️ MODERATE: Slightly Tilted (15-25° tilt)
```
Posisi Acceptable tapi Tidak Ideal:
- Tilt visible tapi masih bisa baca
- Sistem akan warn user untuk ulangi
- Akurasi berkurang ~15-25%
- Preview akan show "Dokumen Miring" warning

Skenario:
- Foto di sofa dengan angle tidak perfect
- Ambil dari sudut, tapi teks still readable
- Emergency situation (tidak ada meja)
```

### ❌ BURUK: Sangat Miring (>25° tilt)
```
Posisi TIDAK Acceptable:
- Dokumen sudut ekstrem
- Teks sulit dibaca, akurasi <50%
- Sistem akan REJECT atau warn heavily

Skenario:
- Foto dengan camera miring ekstrem
- Holding dokumen saat foto
- Tidak align dengan horizontal
```

---

## 🖼️ Resolusi & File Size

### Rekomendasi Resolusi

| Situasi | Min | Optimal | Max | Alasan |
|---------|-----|---------|-----|--------|
| A4 Rapor | 600px | 1200px | 2000px | Standard letter size |
| A3 Formulir | 800px | 1400px | 2500px | Larger than letter |
| Small Notes | 400px | 800px | 1200px | Quick reference |
| High Precision | 1200px | 1800px | 3000px | Medical/Legal docs |

### File Size Guidelines

```
Rekomendasi:
- JPG Quality 85-95%: 300KB-1.5MB ← BEST
- PNG: 500KB-3MB (lossless)
- Raw Photo: 2-5MB (compress first)
- Avoid: >5MB (slow upload, memory issues)

Teknik Compress (Windows):
1. Right-click → Compress
2. Atau gunakan app: ImageMagick, TinyPNG
3. Online: imagecompressor.com

Teknik Compress (Phone):
- iPhone: Settings > Camera > Format > Most Compatible
- Android: Use Google Photos backup, auto-compress
- Or: Compress app dari Play Store
```

---

## 📱 Capture menggunakan Smartphone

### iPhone
```
Settings untuk OCR-Friendly Photos:
1. Settings > Camera > Formats
   - Use Apple ProRAW: OFF (buat file lebih kecil)
   
2. Saat foto:
   - Portrait mode: OFF
   - Night mode: AUTO (biarkan sistem decide)
   - Flash: AUTO (tapi lebih suka natural light)
   - Tap focus on text area
   
3. Tips:
   - Use iPad atau second device sebagai background
   - Clean lens sebelum foto
   - Avoid extreme angles
   - Use GridLines untuk align dokumen
```

### Android
```
Settings untuk OCR-Friendly Photos:
1. Camera app > Settings > Resolution
   - Pilih 12MP atau lebih (tidak perlu >16MP)
   
2. Saat foto:
   - Beauty mode: OFF
   - Night mode: AUTO
   - Tap exposure untuk adjust brightness
   - Focus on text (tap area dengan teks)
   
3. Tips:
   - Matikan HDR atau set AUTO
   - Use default color profile (RGB)
   - Stabilize dengan kedua tangan atau tripod
```

---

## 🔍 Quality Assessment Checklist

### Sebelum Submit (Dalam App Preview):

```
Sistem akan auto-check:
✓ Brightness: 30-90% adalah range optimal
  - <30% = "Foto terlalu gelap, gunakan flash"
  - >90% = "Foto terlalu terang, kurangi exposure"

✓ Contrast: ≥40% adalah minimum acceptable
  - Teks harus jelas terpisah dari background
  - Warning jika <40%: "Kontras rendah, review manual"

✓ Sharpness: ≥60% adalah minimum acceptable
  - Teks harus tidak blur, letters clear
  - Warning jika <60%: "Sharpness moderate, coba ulangi"

✓ Tilt: ≤15° adalah ideal
  - Warning jika >15°: "Dokumen miring, ambil tegak lurus"

✓ Resolution: 1200x800px atau lebih
  - Warning jika terlalu kecil: "Resolusi rendah"

✓ File Size: 300KB-2MB adalah ideal
  - Warning jika >5MB: "File besar, kompresi dulu"

HASIL:
- Excellent (≥85%): ✅ Siap OCR dengan confidence tinggi
- Good (70-84%): 👍 Siap OCR, expected accuracy 85-95%
- Acceptable (55-69%): ⚠️ Bisa diproses, persiapkan manual review
- Poor (40-54%): ❌ Sangat disarankan ulangi foto
- Unacceptable (<40%): ❌ JANGAN submit, ulangi dengan setting lebih baik
```

---

## 📋 Contoh Kasus Real-World

### Case 1: Rapor Kertas (A4 Letter)
```
Skenario: Scan rapor siswa dari sekolah

RECOMMENDED SETUP:
1. Posisi: Flat di meja, overhead camera
2. Cahaya: Natural light dari jendela + room lamp
3. Camera: Smartphone dengan level app (untuk check tilt)
4. Distance: ~30cm dari dokumen
5. Angle: Straight down (90°), tilt <5°

QUALITY TARGET:
- Brightness: 60-70% (natural terang)
- Contrast: 80%+ (teks hitam di kertas putih)
- Sharpness: 85%+ (semua kata jelas)
- Tilt: <5° (perfectly straight)
- Result: EXCELLENT (95-99% OCR accuracy)

COMMON MISTAKES:
❌ Cahaya dari samping (uneven brightness)
❌ Foto dari sudut 45° (excessive tilt)
❌ Tangan/shadow di dokumen
❌ Camera shake (blur)
✅ DO: Gunakan tripod atau steady di flat surface
```

### Case 2: Transkrip Digital (Screen Photo)
```
Skenario: Foto layar report dari laptop/tablet

CHALLENGE: Glare dari layar, brightness tidak uniform

RECOMMENDED SETUP:
1. Reduce screen brightness ke 50-60%
2. Gunakan matte screen protector jika ada
3. Angle: ~30-40° dari screen (reduce glare)
4. Cahaya: Ambient light saja, no flash
5. Posisi: Steady di sofa/meja (gunakan tripod)

QUALITY TARGET:
- Brightness: 50-60% (avoid overexposed)
- Contrast: 70%+ (text vs background)
- Sharpness: 75%+ (characters readable)
- Tilt: <10° (screen tidak terlalu miring)
- Result: GOOD (85-92% OCR accuracy)

TIPS:
- Screenshot + crop lebih baik dari foto layar
- Jika harus foto layar: angle untuk avoid glare
- Use phone dengan good camera (newer models)
```

### Case 3: Quick Mobile Entry (Emergency)
```
Skenario: Foto cepat di lapangan / tidak ada setup ideal

REALITY: Cahaya tidak perfect, angle tidak ideal, time constraint

ACCEPTABLE SETUP:
1. Posisi: Tangan holding dokumen (worst case)
2. Cahaya: Ambient outdoor / indoor (as-is)
3. Camera: Auto mode, jangan pikir terlalu lama
4. Distance: ~15-20cm
5. Angle: Best effort <20° tilt

QUALITY TARGET:
- Brightness: 40-60% (whatever available)
- Contrast: 50%+ (at least distinguishable)
- Sharpness: 50%+ (legible even if not perfect)
- Tilt: <20° (acceptable for emergency)
- Result: ACCEPTABLE (70-82% OCR accuracy)

EXPECTED WORKFLOW:
1. Auto-scan dengan confidence <80%
2. Show review dialog
3. User manually verify & correct errors
4. Apply changes dengan corrections

LESSON: Backup plan: Manual review untuk accuracy
```

---

## 🚀 Optimization Tips & Tricks

### Untuk Maksimum Accuracy (95%+)

```
Step-by-step Setup:
1. LIGHTING
   - Find bright spot near window (daylight ideal)
   - Or use desk lamp positioned 45° angle
   - Avoid harsh shadows

2. DOCUMENT PREP
   - Flatten document on clean surface
   - Smooth any creases/folds
   - Remove any staples/clips that cast shadow

3. POSITIONING
   - Place document flat on white/neutral background
   - Use phone level app to ensure 0° tilt
   - Distance: ~25-35cm for A4, ~40-50cm for A3

4. CAMERA SETTINGS
   - Clean lens with cloth
   - Use Grid Lines for alignment
   - Tap on text area to focus
   - Lock focus before taking photo

5. CAPTURE
   - Take 2-3 shots from slightly different angles
   - Choose best one from preview
   - Delete bad ones

6. QUALITY CHECK
   - Review in app before submit
   - Check all metrics are GREEN
   - If any warning, try again

RESULT: 96-99% accuracy on first try!
```

### Untuk Quick Scanning (70%+ acceptable)

```
Minimal Steps:
1. Position dokumen roughly flat
2. Ambil foto with decent lighting
3. Check brightness not too dark
4. Submit untuk OCR
5. Plan untuk manual review 10-15 minute field

Expect: 70-85% accuracy, plan manual verification
```

### Troubleshooting Common Issues

```
Problem: "Foto Gelap"
Solution:
1. Move to brighter location
2. Use Flash + 30cm distance
3. Increase screen brightness if indoor
4. Try again until brightness >40%

Problem: "Teks Blur"
Solution:
1. Clean camera lens
2. Use tripod or steady surface
3. Focus by tapping text area
4. Wait for camera focus lock (green square)
5. Take photo slowly (avoid shake)

Problem: "Tilt Detected"
Solution:
1. Use phone level app
2. Align dokumen to level
3. Camera straight above (90°)
4. Avoid hand angle that tilts

Problem: "File Terlalu Besar"
Solution:
1. Compress menggunakan built-in tools
2. Reduce resolution to 1200px max
3. Use JPG quality 85% (not 100%)
4. Online compress: imagecompressor.com

Problem: "Tidak Ada Kontras"
Solution:
1. Ensure dokumen + background berbeda warna
2. Add white paper background (bukan colored)
3. Increase lighting untuk lebih bright
4. Try dengan colored document reader app first
```

---

## 🔐 Keamanan & Privacy

```
Data Handling:
- Photo hanya digunakan untuk OCR processing
- Google Vision API: Tidak store image permanent
- Extracted text: Store di database Supabase (encrypted)
- Backup: 90-day retention, automatic cleanup

Compliance:
- GDPR compliant: No personal data tracking
- No facial recognition: We process text only
- RLS policies: Student data isolated per user
- Audit log: All access tracked

Tips untuk Privacy:
1. Cover student identity jika tidak perlu
2. Upload hanya nilai columns, crop jika perlu
3. Delete from app setelah processed
4. Backup otomatis, but manual delete juga tersedia
```

---

## 📞 Support & Next Steps

### Tidak yakin foto Anda bagus?
1. Upload di app → Preview dialog auto-check quality
2. Green score? ✅ Go ahead
3. Yellow warning? ⚠️ Review recommendations, ulangi jika perlu
4. Red error? ❌ Ulangi foto dengan guidance dari app

### Hasil OCR tidak akurat?
1. Check quality metrics yang reported
2. Jika <70% confidence: Plan manual review
3. App provide review dialog untuk edit fields
4. Save corrections automatically

### Butuh bantuan lebih?
- Lihat AI_OCR_SETUP_GUIDE.md untuk setup
- Lihat QUICK_REFERENCE.md untuk troubleshooting
- Check INTEGRATION_CHECKLIST.md untuk deployment

---

## 📚 Reference: Google Vision API Facts

```
Technology Stack:
- Google Vision API (TEXT_DETECTION + DOCUMENT_TEXT_DETECTION)
- Pre-trained on millions of documents
- Support 100+ languages (including Indonesia)
- NO custom training required (pre-baked)

Why Not YOLO?
- YOLO = Object Detection (identify "where is the cat")
- Google Vision = OCR + Text Detection ("what does text say")
- Different tools, different job
- Google Vision is correct choice untuk membaca teks

Confidence Calculation:
- Returned by Vision API (0-1 scale)
- Converted to 0-100% dalam UI
- Represents probability API confidence dalam extraction
- Higher confidence = higher accuracy expected

Cost:
- Free tier: 1000 images/month
- Paid: $1.5 per 1000 images (very affordable)
```

---

**Kesimpulan**: Foto dengan cahaya cukup, tegak lurus, dan resolusi 1200px = 95%+ akurasi. Sistem OCR tidak perlu training, sudah pre-trained. Preview dialog dalam app akan guide user tentang kualitas foto sebelum submit!

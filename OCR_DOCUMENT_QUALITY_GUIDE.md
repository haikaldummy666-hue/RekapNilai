/**
 * Panduan Format Dokumen Optimal untuk OCR
 * Contoh & best practices untuk pemindaian nilai siswa
 */

// ============================================================================
// KARAKTERISTIK DOKUMEN YANG BAGUS UNTUK OCR
// ============================================================================

export const DOCUMENT_QUALITY_GUIDELINES = {
  EXCELLENT: {
    description: "Kualitas Terbaik - 95%+ akurasi",
    characteristics: [
      "Foto tegak lurus (tidak miring/tilt)",
      "Seluruh dokumen terlihat dalam frame",
      "Lighting merata dan terang (tidak ada shadow)",
      "Ukuran file 1-3 MB (resolution 1200-2000px)",
      "Teks jelas dan readable (bukan blur/bergerak)",
      "Latar belakang bersih (putih/konsisten)",
      "Dokumen tidak kusut/rusak",
      "ISO rendah, contrast tinggi",
    ],
    confidence: "90-100%",
    exampleDocuments: [
      "Rapor/Surat resmi dari sekolah yang baru",
      "Fotokopi/scan berkualitas tinggi",
      "Screenshot dari sistem digital yang jelas",
    ],
  },

  GOOD: {
    description: "Kualitas Baik - 75-85% akurasi",
    characteristics: [
      "Sedikit miring (< 15 derajat)",
      "Sebagian besar dokumen terlihat",
      "Lighting cukup baik, sedikit shadow",
      "Ukuran file 0.5-1.5 MB",
      "Teks terlihat tapi sedikit blur",
      "Latar belakang agak berantakan",
      "Dokumen dalam kondisi normal",
    ],
    confidence: "75-85%",
    exampleDocuments: [
      "Foto rapor dengan smartphone standar",
      "Fotokopi yang sudah lama",
      "Screenshot dengan zoom sedang",
    ],
  },

  POOR: {
    description: "Kualitas Rendah - 50-70% akurasi",
    characteristics: [
      "Foto miring/tilt > 20 derajat",
      "Hanya sebagian dokumen terlihat",
      "Lighting buruk, banyak shadow/glare",
      "Ukuran file sangat kecil (< 500KB)",
      "Teks blur/tidak jelas",
      "Latar belakang berantakan",
      "Dokumen kusut/rusak",
      "Kontras rendah",
    ],
    confidence: "50-70%",
    exampleDocuments: [
      "Foto dengan HP lama/kamera buruk",
      "Foto saat gelap tanpa flash",
      "Dokumen basah/lipatan besar",
    ],
  },

  UNACCEPTABLE: {
    description: "Tidak Bisa Dibaca - <50% akurasi",
    characteristics: [
      "Foto sangat miring/terbalik",
      "Hanya sebagian kecil dokumen",
      "Foto sangat gelap atau silau",
      "Teks tidak terbaca/sangat blur",
      "Dokumen rusak parah",
      "Foto dokumen dari layar dengan refleksi",
    ],
    confidence: "<50%",
    exampleDocuments: [
      "Foto dari jarak jauh",
      "Foto dengan motion blur",
      "Dokumen yang sudah usang/hilang warna",
    ],
  },
};

// ============================================================================
// UKURAN & RESOLUSI OPTIMAL
// ============================================================================

export const IMAGE_SPECIFICATIONS = {
  MINIMUM_REQUIREMENTS: {
    width_px: 800,
    height_px: 600,
    dpi: 150,
    fileSize_mb: 0.5,
    formats: ["JPG", "PNG", "PDF"],
  },

  RECOMMENDED: {
    width_px: 1500,
    height_px: 1000,
    dpi: 300,
    fileSize_mb: 1.5,
    formats: ["JPG", "PNG"],
  },

  MAXIMUM: {
    width_px: 4000,
    height_px: 3000,
    dpi: 600,
    fileSize_mb: 10,
    formats: ["JPG", "PNG", "TIFF"],
  },

  PHONE_CAMERA: {
    description: "Setelan kamera smartphone optimal",
    settings: [
      "Resolusi: HD atau Full HD (1920x1080+)",
      "Format: JPG dengan quality tinggi",
      "Flash: Auto atau On (tergantung lighting)",
      "ISO: Auto (akan naik jika gelap)",
      "Focus: Tap untuk fokus pada dokumen",
      "Stabilisasi: Gunakan tripod atau steady hand",
    ],
  },
};

// ============================================================================
// CONTOH TIPE DOKUMEN & AKURASI YANG DIHARAPKAN
// ============================================================================

export const DOCUMENT_TYPES_ACCURACY = {
  RAPOR_SEKOLAH: {
    name: "Rapor dari Sekolah (Resmi)",
    expectedAccuracy: "95-99%",
    whyGood: [
      "Format standar & konsisten",
      "Teks tercetak jelas",
      "Biasanya putih bersih",
      "Layout terstruktur",
    ],
    tips: [
      "Pastikan seluruh rapor terlihat",
      "Foto tegak lurus",
      "Jangan ada glare dari plastik/lamination",
    ],
  },

  TRANSKRIP_DIGITAL: {
    name: "Transkrip Nilai (Digital/Print)",
    expectedAccuracy: "90-98%",
    whyGood: [
      "Font tercetak dengan baik",
      "Tabel terstruktur jelas",
      "Data numeric mudah dikenali",
    ],
    tips: [
      "Jika digital: ambil screenshot yang clear",
      "Jika print: gunakan fotokopi berkualitas",
      "Zoom in jika teks kecil",
    ],
  },

  LEMBAR_PENILAIAN: {
    name: "Lembar Penilaian/Assessment",
    expectedAccuracy: "85-95%",
    whyGood: [
      "Format form terstruktur",
      "Kolom dan baris jelas",
    ],
    tips: [
      "Pastikan form tidak kusut",
      "Tulis dengan ballpen hitam",
      "Hindari crease/lipatan di area teks",
    ],
  },

  FOTOKOPI_LAMA: {
    name: "Fotokopi Lama/Berkali-kali",
    expectedAccuracy: "70-85%",
    whyGood: [
      "Masih bisa dibaca dengan effort lebih",
    ],
    tips: [
      "Ambil dari sudut berbeda jika ada area blur",
      "Cek hasil OCR extra seksama",
      "Siapkan untuk koreksi manual lebih banyak",
    ],
  },

  HANDWRITTEN: {
    name: "Handwritten/Tulisan Tangan",
    expectedAccuracy: "50-70%",
    whyGood: [
      "Google Vision bisa baca handwriting",
      "Tapi akurasi lebih rendah",
    ],
    tips: [
      "Handwriting jelas dengan ballpen tebal",
      "Hindari tinta tipis/pensil",
      "Foto dengan lighting yang optimal",
      "Siapkan untuk revisi manual signifikan",
    ],
  },
};

// ============================================================================
// SCENARIO & CONTOH AKURAT/TIDAK AKURAT
// ============================================================================

export const SCENARIO_EXAMPLES = {
  SCENARIO_1_PERFECT: {
    title: "✅ SEMPURNA - Rapor Baru dari Sekolah",
    photo: {
      subject: "Rapor A4 putih bersih dengan tabel nilai",
      angle: "Tegak lurus (90°)",
      lighting: "Terang merata, sinar alami atau lampu putih",
      distance: "1-1.5 meter dari kamera",
      phone: "Smartphone modern (2020+)",
      zoom: "Tidak di-zoom, ukuran natural",
    },
    expectedResult: {
      confidence: "97%",
      accuracy: "99% - hampir sempurna",
      fields_extracted: [
        "NISN: ✅ 100% akurat",
        "Nama: ✅ 100% akurat",
        "Nilai: ✅ 100% akurat",
      ],
      manual_correction_needed: false,
      processing_time: "3-5 detik",
    },
  },

  SCENARIO_2_GOOD: {
    title: "👍 BAIK - Foto dari HP Standar",
    photo: {
      subject: "Rapor di atas meja",
      angle: "Sedikit miring (10-15°)",
      lighting: "Terang tapi sedikit ada shadow",
      distance: "1-1.2 meter",
      phone: "Smartphone medium quality",
      zoom: "Zoom 1.5x untuk lebih jelas",
    },
    expectedResult: {
      confidence: "82%",
      accuracy: "95% - sangat baik",
      fields_extracted: [
        "NISN: ✅ 100% akurat",
        "Nama: ✅ 100% akurat",
        "Nilai: ✅ 99% (satu angka mungkin salah baca)",
      ],
      manual_correction_needed: "Cek beberapa nilai",
      processing_time: "4-6 detik",
    },
  },

  SCENARIO_3_MEDIOCRE: {
    title: "⚠️ SEDANG - Foto Gelap atau Blur",
    photo: {
      subject: "Rapor di tempat kurang pencahayaan",
      angle: "Miring 20-30°",
      lighting: "Gelap, sedikit lampu",
      distance: "0.8 meter (terlalu dekat)",
      phone: "Smartphone lama atau kamera buruk",
      zoom: "Blur dari motion/hand shake",
    },
    expectedResult: {
      confidence: "65%",
      accuracy: "75-80% - butuh review",
      fields_extracted: [
        "NISN: ⚠️ 85% (beberapa digit salah baca)",
        "Nama: ✅ 95% akurat",
        "Nilai: ⚠️ 70% (beberapa nilai error)",
      ],
      manual_correction_needed: "Ya, cek semua field",
      processing_time: "5-8 detik",
    },
  },

  SCENARIO_4_POOR: {
    title: "❌ BURUK - Foto Sangat Blur atau Gelap Terang",
    photo: {
      subject: "Rapor tapi overcropped, blur motion",
      angle: "Sangat miring (> 45°)",
      lighting: "Sangat gelap atau silau overexposed",
      distance: "Terlalu jauh atau terlalu dekat",
      phone: "Kamera sangat lama",
      zoom: "Extreme zoom yang blur",
    },
    expectedResult: {
      confidence: "45%",
      accuracy: "50-60% - buruk",
      fields_extracted: [
        "NISN: ❌ 40% (banyak salah baca)",
        "Nama: ⚠️ 60% (partial)",
        "Nilai: ❌ 35% (kebanyakan error)",
      ],
      manual_correction_needed: "Ya, hampir semua field perlu diulang",
      processing_time: "3-5 detik (tapi hasil jelek)",
      recommendation: "ULANGI FOTO - hasil tidak dapat diandalkan",
    ],
  },
};

// ============================================================================
// LIGHTING GUIDE
// ============================================================================

export const LIGHTING_CONDITIONS = {
  OPTIMAL: {
    description: "Natural daylight (overcast/indoor window)",
    condition: "Outdoor dengan langit mendung atau indoor near window",
    result: "✅ Excellent",
    iso: "Auto (100-400)",
    exposure: "Normal",
  },

  GOOD: {
    description: "Bright indoor (LED/neon)",
    condition: "Indoor dengan lampu neon atau LED putih",
    result: "👍 Good",
    iso: "Auto (200-800)",
    exposure: "Normal",
  },

  ACCEPTABLE: {
    description: "Weak indoor lighting",
    condition: "Indoor dengan lampu kuning atau redup",
    result: "⚠️ Acceptable",
    iso: "Auto (600-1600)",
    exposure: "Bright +1 stop",
  },

  POOR: {
    description: "Very dark (night, no flash)",
    condition: "Gelap malam tanpa flash",
    result: "❌ Poor",
    iso: "High (1600+)",
    exposure: "Bright +2 stop",
    recommendation: "GUNAKAN FLASH atau PINDAH TEMPAT TERANG",
  },

  PROBLEMATIC_GLARE: {
    description: "Glossy paper with reflection",
    condition: "Dokumen dengan lamination/plastik glossy",
    result: "❌ Poor",
    recommendation:
      "Ubah sudut foto untuk hindari reflection. Gunakan polarizing filter jika ada.",
  },
};

// ============================================================================
// CHECKLIST SEBELUM PINDAI
// ============================================================================

export const PRE_SCANNING_CHECKLIST = [
  "✅ Dokumen dalam kondisi baik (tidak kusut/basah)",
  "✅ Seluruh dokumen terlihat dalam frame",
  "✅ Foto tegak lurus (tidak miring > 15°)",
  "✅ Lighting terang dan merata",
  "✅ Tidak ada glare/reflection (jika dokumen glossy)",
  "✅ Fokus sharp pada teks (tidak blur)",
  "✅ Ukuran file 0.5-3 MB",
  "✅ Format JPG atau PNG (bukan PDF photo)",
  "✅ Contrass baik antara teks dan background",
  "✅ Tidak ada bayangan tangan atau objek lain",
];

// ============================================================================
// TIPS & TRICKS
// ============================================================================

export const TIPS_AND_TRICKS = {
  SMARTPHONE_PHOTOGRAPHY: [
    "🔍 Gunakan landscape mode (horizontal) untuk dokumen A4",
    "💡 Cari area dengan lighting terbaik",
    "⚖️ Steady tangan - gunakan tripod atau lean on table",
    "📱 Bersihkan lensa kamera (sering ada debu)",
    "🎯 Tap untuk fokus pada area teks penting",
    "❌ Jangan zoom digital - pindur lebih dekat saja",
    "🔄 Ambil beberapa foto dari sudut berbeda",
  ],

  FIXING_COMMON_ISSUES: {
    tilt_miring: [
      "Solusi: Letakkan dokumen di lantai/meja datar",
      "Gunakan ruler untuk align dokumen",
      "Foto tegak lurus dari atas (bird eye view)",
    ],
    blur: [
      "Solusi: Steady tangan, gunakan tripod",
      "Increase lighting (buka camera app settings)",
      "Jangan zoom, pindur lebih dekat",
    ],
    dark_gelap: [
      "Solusi: Gunakan flash atau pindah ke tempat terang",
      "Foto dekat window saat siang",
      "Nyalakan semua lampu yang ada",
    ],
    glare: [
      "Solusi: Ubah sudut foto 45°",
      "Kurangi reflection dengan non-glossy surface",
      "Gunakan anti-glare filter jika ada",
    ],
  },
};

// ============================================================================
// COMPARISON CHART
// ============================================================================

export const QUALITY_COMPARISON_TABLE = [
  {
    scenario: "Rapor baru dari sekolah, lighting optimal",
    confidence: "95-99%",
    accuracy: "99%",
    effort: "Minimal",
    recommendation: "✅ TERBAIK - Langsung apply",
  },
  {
    scenario: "Foto HP standar, lighting baik",
    confidence: "85-90%",
    accuracy: "95%",
    effort: "Minimal",
    recommendation: "✅ BAIK - Cek hasil sebentar",
  },
  {
    scenario: "Fotokopi lama, lighting cukup",
    confidence: "70-80%",
    accuracy: "80%",
    effort: "Moderate",
    recommendation: "👍 ACCEPTABLE - Review detail",
  },
  {
    scenario: "Foto HP lama, lighting sedang",
    confidence: "65-75%",
    accuracy: "70%",
    effort: "High",
    recommendation: "⚠️ MEDIOCRE - Banyak koreksi",
  },
  {
    scenario: "Foto blur, gelap, atau kusut",
    confidence: "45-60%",
    accuracy: "<65%",
    effort: "Very High",
    recommendation: "❌ POOR - Sebaiknya ulangi foto",
  },
  {
    scenario: "Handwritten values, tinta tebal",
    confidence: "60-75%",
    accuracy: "70%",
    effort: "Moderate",
    recommendation: "⚠️ ACCEPTABLE - Cek handwriting area",
  },
];

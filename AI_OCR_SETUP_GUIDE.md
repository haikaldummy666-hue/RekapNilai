# AI OCR Scanning System - Setup Guide

## Ringkasan Fitur

Sistem AI OCR untuk pemindaian otomatis nilai siswa dari dokumen fisik atau digital dengan:
- ✅ Akurasi OCR 95%+
- ✅ Validasi data otomatis & deteksi anomali
- ✅ UI intuitif untuk review & koreksi manual
- ✅ Backup otomatis & mekanisme rollback
- ✅ Logging komprehensif untuk semua transaksi
- ✅ Support berbagai format dokumen (rapor, transkrip, lembar penilaian)

## Instalasi & Setup

### 1. Environment Variables

Tambahkan ke file `.env.local`:

```env
# Google Vision API (untuk OCR processing)
GOOGLE_VISION_API_KEY=your_google_vision_api_key

# Supabase (sudah ada)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: untuk development menggunakan mock OCR
VITE_USE_MOCK_OCR=true
```

### 2. Setup Google Vision API

#### a. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable "Cloud Vision API"
4. Create service account key (JSON format)
5. Extract API key dari service account

#### b. Alternative: Gunakan Mock OCR
Untuk development/testing tanpa API key:
```typescript
// Dalam DocumentUploadDialog
onDocumentSelected={(data) => {
  processDocument(data, activeStudent, true) // true = use mock OCR
}}
```

### 3. Database Setup

#### a. Run Supabase Migration

```sql
-- Buka Supabase Dashboard > SQL Editor
-- Copy & paste isi file: supabase-ocr-migration.sql
-- Run query
```

#### b. Verify Tables Dibuat
- `scanning_transactions` - Menyimpan semua transaksi OCR
- `backup_snapshots` - Backup data sebelum perubahan
- `scanning_logs` - Audit log semua transaksi
- `scanning_settings` - Konfigurasi system

### 4. Update Router

Edit `src/router.tsx` untuk tambahkan scanning route:

```typescript
import { Route as ScanningRoute } from './routes/scanning'

const routes = [
  // ... existing routes
  {
    path: '/scanning',
    component: ScanningRoute,
  }
]
```

## Cara Penggunaan

### Workflow Pemindaian

1. **Navigasi ke Halaman Scanning**
   - Go to `/scanning`
   - Pilih siswa dari "Daftar Siswa"

2. **Upload Dokumen**
   - Klik "Pindai Dokumen Nilai"
   - Pilih tipe dokumen (Rapor, Transkrip, Lembar Penilaian)
   - Pilih semester
   - Upload atau ambil foto dokumen

3. **OCR Processing**
   - System melakukan OCR menggunakan Google Vision API
   - Extract data: nama, NISN, jenis kelamin, nilai per mata pelajaran
   - Calculate confidence score

4. **Data Review**
   - Review hasil OCR di dialog review
   - Lihat validation errors & warnings
   - Lihat anomali yang terdeteksi
   - Koreksi manual jika diperlukan (klik edit icon)

5. **Terapkan Data**
   - Jika valid: Klik "Terapkan Data"
   - System membuat backup otomatis
   - Terapkan changes ke database
   - Log transaksi

### Viewing History

- Klik "Lihat Riwayat" untuk melihat semua transaksi scanning
- Filter berdasarkan status (Completed, Failed, Rolled Back)
- Export transaksi detail ke JSON

## Komponenten & File Structure

```
src/
├── components/scanning/
│   ├── DocumentUploadDialog.tsx      # Upload/camera interface
│   ├── ScanningReviewDialog.tsx      # Review & correction interface
│   └── ScanningHistoryDialog.tsx     # History & logs viewer
├── hooks/
│   └── useScanningSession.ts         # Session management hook
├── lib/
│   ├── ocrServer.ts                  # Backend OCR processing
│   ├── databaseOperations.ts         # DB transactions & backup/rollback
│   └── supabaseClient.ts             # Existing Supabase client
├── routes/
│   └── scanning.tsx                  # Main scanning page
├── types/
│   └── scanning.types.ts             # Type definitions
└── utils/
    ├── ocrUtils.ts                   # OCR data parsing
    └── validationUtils.ts            # Data validation logic
```

## API Functions

### OCR Processing

```typescript
// lib/ocrServer.ts
processDocumentScanning(request: DocumentScanRequest, useMockOCR?: boolean)
  -> Promise<OcrExtractionResult>

analyzeExtractionQuality(result: OcrExtractionResult)
  -> { quality, score, recommendations }
```

### Database Operations

```typescript
// lib/databaseOperations.ts
applyOcrDataToStudent(studentId, extractedData, transactionId, currentStudent)
  -> Promise<{ success, transactionId, appliedChanges }>

rollbackTransaction(transactionId, backupId)
  -> Promise<void>

getScanningHistory(studentId, limit)
  -> Promise<ScanningTransaction[]>

logScanningTransaction(data)
  -> Promise<void>
```

### Data Validation

```typescript
// utils/validationUtils.ts
validateExtractedData(extracted, currentStudent?)
  -> DataValidationResult

detectAnomalies(extracted, currentStudent?)
  -> AnomalyDetection[]

hasCriticalErrors(result)
  -> boolean
```

## Backup & Rollback Mechanism

### Automatic Backup
1. Sebelum applying OCR data, system membuat snapshot of current student data
2. Snapshot disimpan di `backup_snapshots` table
3. Associated dengan transaction ID

### Manual Rollback
```typescript
// Rollback a transaction
await rollbackTransaction(transactionId, backupId)

// Student data restored ke state sebelum OCR
```

### Backup Retention
- Backups expire setelah 90 hari (configurable)
- Auto-cleanup via scheduled job atau manual trigger

## Logging System

Semua transaksi logged ke `scanning_logs` dengan:
- Transaction ID
- Timestamp
- Action (started, processing, completed, failed, rolled-back)
- User ID
- IP Address
- Detailed results/errors

### View Logs
```typescript
// Get all transactions
const transactions = await getAllScanningTransactions({
  status: 'completed',
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  limit: 100
})

// Get student history
const history = await getScanningHistory(studentId, 50)
```

## Validation Rules

### Identitas Fields
- NISN: 10 digit angka
- Nama: Minimal 3 karakter
- Jenis Kelamin: L atau P
- Tanggal Lahir: Format valid (YYYY-MM-DD)

### Nilai Fields
- Range: 0-100
- Type: Number
- Anomaly detection:
  - Outliers (nilai terlalu tinggi/rendah)
  - Inconsistencies (beda dengan data sebelumnya)
  - Format errors

### Quality Thresholds
- High Quality: Score ≥ 85%
- Medium Quality: Score 70-84%
- Low Quality: Score < 70%

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Google Vision API key not configured" | Missing GOOGLE_VISION_API_KEY | Add env variable |
| "Backup not found" | Backup deleted/expired | Restore from history |
| "Failed to apply OCR data" | DB error | Check Supabase connection |
| "Vision API error" | API quota exceeded | Check Google Cloud quotas |

### Retry Logic
System memiliki automatic retry untuk:
- Network timeouts (3x retry dengan exponential backoff)
- Temporary API errors (5xx responses)

## Performance Considerations

### OCR Processing Time
- Document upload: 1-3 seconds
- OCR processing: 3-10 seconds (Google Vision API)
- Data extraction & validation: 1-2 seconds
- Database operations: 1-2 seconds
- **Total: 6-17 seconds per document**

### Optimization Tips
1. Compress images sebelum upload (target < 2MB)
2. Use mock OCR untuk development
3. Batch process multiple documents
4. Clean up old backups regularly

## Testing

### Unit Tests

```typescript
// Test validation
import { validateExtractedData } from '@/utils/validationUtils'

const result = validateExtractedData({
  nisn: '1234567890',
  nama: 'Ahmad',
  nilai: { Matematika: 85 }
})

expect(result.isValid).toBe(true)
```

### Integration Tests

```typescript
// Test OCR processing & application
const sessionData = await useScanningSession().processDocument(request)
await useScanningSession().applyChanges(studentId, student)

// Verify data applied
const updated = await getStudent(studentId)
expect(updated.nilai.matematika).toBe(85)
```

### E2E Tests
- Upload document → Review → Apply → Verify changes
- Rollback transaction → Verify data restored
- Check transaction logs

## Troubleshooting

### OCR Confidence Terlalu Rendah
- **Cause**: Kualitas dokumen buruk
- **Solution**: 
  - Ambil foto dengan lighting yang baik
  - Dokumen tidak blur/crushed
  - Gunakan resolution lebih tinggi

### Ekstraksi data tidak lengkap
- **Cause**: Format dokumen tidak standar
- **Solution**:
  - Upload dokumen yang lebih jelas
  - Verifikasi format sesuai standard
  - Manual input jika perlu

### Rollback Tidak Berfungsi
- **Cause**: Backup sudah expired atau dihapus
- **Solution**:
  - Backup di-retain 90 hari
  - Request restore dari IT
  - Manual data entry dari backup

## Security Best Practices

1. **API Key Protection**
   - Jangan commit ke git
   - Store di environment variables
   - Rotate regularly

2. **Data Privacy**
   - Backup encrypted di rest (via Supabase)
   - Audit log untuk compliance
   - Data retention policy

3. **Access Control**
   - RLS policies untuk student data
   - User ID tracking di logs
   - IP address logging

## Future Enhancements

- [ ] Multi-language OCR support
- [ ] Handwriting recognition
- [ ] Batch processing UI
- [ ] Auto-categorization by document type
- [ ] ML-based anomaly detection
- [ ] Export to Excel integration
- [ ] SMS notifications on completion
- [ ] Mobile app for document capture
- [ ] Web service integration (k13 system)
- [ ] Advanced reporting & analytics

## Support

Untuk issues atau pertanyaan:
1. Check logs di `scanning_logs` table
2. Review transaction details di `scanning_transactions`
3. Export backup snapshot untuk analysis
4. Contact IT support dengan transaction ID

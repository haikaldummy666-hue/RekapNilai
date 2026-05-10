# Quick Reference - AI OCR Scanning System

## 🚀 Quick Start (5 minutes)

### 1. Setup Environment
```bash
# Add to .env.local
GOOGLE_VISION_API_KEY=your_key
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# Or use mock for development
VITE_USE_MOCK_OCR=true
```

### 2. Run Database Migration
```sql
-- Supabase > SQL Editor
-- Copy content of: supabase-ocr-migration.sql
-- Execute
```

### 3. Access Feature
```
http://localhost:5173/scanning
```

## 📝 Common Tasks

### Test with Mock Data
```typescript
import { useScanningSession } from '@/hooks/useScanningSession'
import { generateMockOcrResult } from '@/utils/ocrTestUtils'

const { processDocument } = useScanningSession()

// Process with mock OCR
await processDocument(request, student, true) // true = mock
```

### Check Transaction Status
```typescript
import { getScanningHistory, getAllScanningTransactions } from '@/lib/databaseOperations'

// Get student history
const history = await getScanningHistory(studentId)

// Get all transactions
const all = await getAllScanningTransactions({
  status: 'completed',
  limit: 50
})
```

### Rollback a Transaction
```typescript
import { rollbackTransaction } from '@/lib/databaseOperations'

await rollbackTransaction(transactionId, backupId)
```

### Validate Data
```typescript
import { validateExtractedData, hasCriticalErrors } from '@/utils/validationUtils'

const result = validateExtractedData(extracted)
if (hasCriticalErrors(result)) {
  console.log('Critical errors found!')
}
```

## 🔧 Configuration

### Min Confidence Threshold
```typescript
// In Supabase scanning_settings table
min_confidence_threshold: 70 // 0-100
```

### Enable/Disable Features
```env
VITE_ENABLE_SCANNING=true
VITE_ENABLE_MANUAL_REVIEW=true
VITE_ENABLE_ROLLBACK=true
VITE_ENABLE_ANOMALY_DETECTION=true
```

### Backup Retention
```env
VITE_BACKUP_RETENTION_DAYS=90 # Default
```

## 📊 Database Queries

### Get Recent Transactions
```sql
SELECT * FROM scanning_transactions
ORDER BY timestamp DESC
LIMIT 20;
```

### Get Failed Transactions
```sql
SELECT * FROM scanning_transactions
WHERE status = 'failed'
ORDER BY timestamp DESC;
```

### Get Backup Size
```sql
SELECT 
  SUM(backup_size_bytes) as total_size,
  COUNT(*) as backup_count
FROM backup_snapshots
WHERE expires_at > NOW();
```

### Cleanup Expired Backups
```sql
SELECT cleanup_expired_backups();
```

## 🐛 Debugging

### Enable Debug Logging
```env
VITE_DEBUG_OCR=true
VITE_LOG_OCR_RESULTS=true
```

### Check Logs
```typescript
// Browser Console
console.log(sessionData.validation) // See all validation results
console.log(ocrResult.confidence) // See confidence score
```

### View Transaction Details
```sql
SELECT 
  id,
  student_id,
  status,
  ocr_result->>'confidence' as confidence,
  timestamp
FROM scanning_transactions
WHERE student_id = 'student_id'
ORDER BY timestamp DESC;
```

## 📱 Mobile/Camera Usage

### Capture Photo
```typescript
// In DocumentUploadDialog
const capturePhoto = () => {
  // Camera auto-captures when visible
  // Click "Ambil Foto" button
}
```

### Upload File
```typescript
// In DocumentUploadDialog
// Drag & drop or click upload area
```

## 🔄 Data Flow

```
User Action
    ↓
DocumentUploadDialog
    ↓
processDocument() hook
    ↓
ocrServer.ts (Google Vision)
    ↓
validationUtils.ts (Validate)
    ↓
ScanningReviewDialog (Review)
    ↓
applyOcrDataToStudent()
    ↓
Backup + Database Update
    ↓
Log Transaction
    ↓
Success/Error Response
```

## 🎯 Key Functions

```typescript
// OCR Processing
processDocumentScanning(request, useMockOCR)
analyzeExtractionQuality(result)

// Data Validation
validateExtractedData(extracted, currentStudent)
detectAnomalies(extracted, currentStudent)
hasCriticalErrors(result)

// Database Operations
applyOcrDataToStudent(studentId, data, txnId, student)
rollbackTransaction(transactionId, backupId)
createBackupSnapshot(studentId, data, txnId)
logScanningTransaction(data)

// History & Logs
getScanningHistory(studentId, limit)
getAllScanningTransactions(filters)
```

## 📋 Field Mapping

```typescript
// Extracted Fields
{
  nisn: string,
  noUjian: string,
  nama: string,
  jenisKelamin: 'L' | 'P',
  tempatLahir: string,
  tanggalLahir: string,
  namaAyah: string,
  namaIbu: string,
  values: Record<string, number> // Mata pelajaran
}

// Database Storage
identitas: {
  nisn,
  noUjian,
  nama,
  jenisKelamin,
  tempatLahir,
  tanggalLahir,
  namaAyah,
  namaIbu
}

nilai: {
  ujianTertulis: { [subject]: score },
  praktek: { [subject]: score },
  kurmer: { [subject]: row }
}
```

## ⚠️ Error Messages

| Error | Solution |
|-------|----------|
| "Google Vision API key not configured" | Add GOOGLE_VISION_API_KEY |
| "Backup not found" | Restore from history or upload again |
| "Failed to validate data" | Check data format in validation tab |
| "Database connection failed" | Verify Supabase connection |
| "Confidence too low" | Re-upload clearer image |

## 🔐 Security Checklist

- [ ] API key in .env.local (not in code)
- [ ] RLS policies enabled in Supabase
- [ ] Backup retention set appropriately
- [ ] Transaction logging enabled
- [ ] User ID tracking configured
- [ ] Validation rules configured

## 📚 Related Files

- Setup Guide: `AI_OCR_SETUP_GUIDE.md`
- Implementation: `AI_OCR_IMPLEMENTATION.md`
- Migrations: `supabase-ocr-migration.sql`
- Env Template: `.env.local.example`

## 🆘 Support

1. Check logs: `SELECT * FROM scanning_logs`
2. View transactions: `SELECT * FROM scanning_transactions`
3. Check backups: `SELECT * FROM backup_snapshots`
4. Export data: Use ScanningHistoryDialog
5. Contact: Development team with transaction ID

---

**Last Updated**: 2026-05-10  
**Version**: 1.0 (Production Ready)

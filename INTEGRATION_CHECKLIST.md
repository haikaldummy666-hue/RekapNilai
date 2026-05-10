# Integration Checklist - AI OCR Scanning System

## Pre-Deployment Checklist

### ✅ Code Files Created
- [x] src/types/scanning.types.ts
- [x] src/utils/ocrUtils.ts
- [x] src/utils/validationUtils.ts
- [x] src/utils/ocrTestUtils.ts
- [x] src/lib/ocrServer.ts
- [x] src/lib/databaseOperations.ts
- [x] src/components/scanning/DocumentUploadDialog.tsx
- [x] src/components/scanning/ScanningReviewDialog.tsx
- [x] src/components/scanning/ScanningHistoryDialog.tsx
- [x] src/hooks/useScanningSession.ts
- [x] src/routes/scanning.tsx

### ✅ Documentation Created
- [x] AI_OCR_SETUP_GUIDE.md
- [x] AI_OCR_IMPLEMENTATION.md
- [x] QUICK_REFERENCE.md
- [x] supabase-ocr-migration.sql
- [x] .env.local.example

### ✅ Code Updates
- [x] src/components/layout/AppSidebar.tsx - Added scanning link
- [x] Router auto-detects new route

## Environment Setup

### Step 1: Environment Variables
```bash
# Create/Update .env.local
GOOGLE_VISION_API_KEY=                    # ← Fill this
VITE_SUPABASE_URL=                        # ← Already set
VITE_SUPABASE_ANON_KEY=                   # ← Already set
VITE_USE_MOCK_OCR=true                    # Start with mock for testing
VITE_ENABLE_SCANNING=true
VITE_ENABLE_ANOMALY_DETECTION=true
VITE_ENABLE_SCANNING_LOGS=true
VITE_AUTO_BACKUP_ENABLED=true
VITE_BACKUP_RETENTION_DAYS=90
```

### Step 2: Database Setup
```bash
# Open Supabase Dashboard
1. Go to SQL Editor
2. Create new query
3. Copy full content of supabase-ocr-migration.sql
4. Execute the query
5. Verify tables created:
   - scanning_transactions
   - backup_snapshots
   - scanning_logs
   - scanning_settings
```

### Step 3: Verify Tables
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name LIKE 'scanning_%';
```

Expected output:
```
backup_snapshots
scanning_logs
scanning_settings
scanning_transactions
```

## Component Integration

### Step 1: Verify Route Registration
```bash
# Start dev server
npm run dev

# Check browser console for errors
# Navigate to http://localhost:5173/scanning
```

### Step 2: Check Sidebar Link
- Navigate to application
- Check sidebar for "Pindai Nilai (AI)" link under "Input Nilai"
- Click link should go to /scanning

### Step 3: Test Components Render
```typescript
// In browser console
// Visit /scanning page
// Verify:
- Main page loads without errors
- "Pindai Dokumen Nilai" button visible
- "Lihat Riwayat" button visible
- Feature description cards visible
```

## Mock OCR Testing

### Test with Mock Data (No API Key)
```bash
# 1. Set environment
VITE_USE_MOCK_OCR=true

# 2. Start dev server
npm run dev

# 3. Navigate to /scanning
# 4. Click "Pindai Dokumen Nilai"
# 5. Select document type & semester
# 6. Upload any image (mock will ignore actual content)
# 7. Should see mock OCR results in review dialog
```

### Verify Mock OCR Response
```typescript
// In browser console at /scanning page
import { processDocumentWithMockOCR } from '@/lib/ocrServer'

const mockRequest = {
  documentType: 'rapor',
  semester: 1,
  imageData: 'data:image/png;base64,...',
  fileName: 'test.jpg'
}

const result = await processDocumentWithMockOCR(mockRequest)
console.log(result)
// Should show realistic mock data
```

## Real OCR Setup (Google Vision API)

### Prerequisites
1. Google Cloud Account
2. Credit card for billing (free tier available)

### Setup Steps

**Step 1: Create Google Cloud Project**
```
1. Go to https://console.cloud.google.com
2. Click "Create Project"
3. Name: "AI OCR Scanner" (or any name)
4. Create project
```

**Step 2: Enable Vision API**
```
1. In Cloud Console, go to "APIs & Services"
2. Click "Enable APIs and Services"
3. Search "Cloud Vision API"
4. Click "Enable"
```

**Step 3: Create Service Account**
```
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill form:
   - Service account name: "ocr-scanner"
   - Grant Editor role
   - Continue & Done
```

**Step 4: Generate API Key**
```
1. Go to Service Account > "Keys"
2. Click "Add Key" > "Create new key" > "JSON"
3. Download JSON file
4. Open JSON file, find "private_key" field
5. Copy the full key (including quotes)
```

**Step 5: Set Environment Variable**
```bash
# In .env.local
GOOGLE_VISION_API_KEY=<paste_private_key_here>
VITE_USE_MOCK_OCR=false
```

**Step 6: Test Real API**
```bash
# 1. Restart dev server
npm run dev

# 2. Navigate to /scanning
# 3. Upload real document image
# 4. Should process with real Google Vision API
# 5. Check browser console for API logs
```

## Data Validation Testing

### Test Validation
```typescript
import { validateExtractedData } from '@/utils/validationUtils'
import { VALIDATION_TEST_CASES } from '@/utils/ocrTestUtils'

// Test valid data
let result = validateExtractedData(VALIDATION_TEST_CASES.validData)
console.log('Valid:', result.isValid) // Should be true

// Test invalid data
result = validateExtractedData(VALIDATION_TEST_CASES.outOfRangeValue)
console.log('Invalid:', result.isValid) // Should be false
console.log('Errors:', result.errors)
```

## Backup & Rollback Testing

### Test Backup Creation
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM backup_snapshots;
-- After first scanning, count should increase
```

### Test Rollback
```sql
-- View a transaction with backup
SELECT 
  t.id,
  t.status,
  b.id as backup_id
FROM scanning_transactions t
LEFT JOIN backup_snapshots b ON t.id = b.transaction_id
LIMIT 1;

-- Note: Rollback requires UI interaction or direct API call
```

## Performance Testing

### Benchmark OCR Processing
```typescript
import { benchmarkOcrProcessing } from '@/utils/ocrTestUtils'

const benchmark = await benchmarkOcrProcessing(10)
console.log('Average time:', benchmark.averageTime, 'ms')
console.log('Ops/sec:', benchmark.operationsPerSecond)
```

## Logging Verification

### Check Transaction Logs
```sql
SELECT 
  id,
  transaction_id,
  action,
  status,
  timestamp
FROM scanning_logs
ORDER BY timestamp DESC
LIMIT 10;
```

### Check Full Transaction History
```sql
SELECT 
  id,
  student_id,
  document_type,
  semester,
  status,
  ocr_result->>'confidence' as confidence,
  timestamp
FROM scanning_transactions
ORDER BY timestamp DESC
LIMIT 10;
```

## Security Verification

### ✅ Security Checklist
- [x] API key in .env.local (not in code)
- [x] .env.local in .gitignore
- [x] RLS policies enabled in Supabase
- [x] Backup encryption enabled (Supabase default)
- [x] Logging enabled for audit trail
- [x] No sensitive data in console logs
- [x] User ID tracked in logs
- [x] IP address tracking configured
- [x] Data validation before storage
- [x] Transaction integrity checks

### Test RLS Policies
```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE 'scanning_%';

-- Should show "t" in rowsecurity column (enabled)
```

## Final Verification Checklist

### Before Production
- [ ] Environment variables configured
- [ ] Database tables created
- [ ] Mock OCR tested successfully
- [ ] Google Vision API key obtained
- [ ] Real OCR tested (optional, can use mock)
- [ ] Data validation working
- [ ] Backup/rollback tested
- [ ] Logging verified
- [ ] Security policies confirmed
- [ ] Error handling tested
- [ ] Performance acceptable
- [ ] Documentation reviewed
- [ ] Team trained on feature

### Deployment Steps
1. [ ] Merge code to main branch
2. [ ] Update .env.local with production values
3. [ ] Run database migration in production
4. [ ] Deploy to production environment
5. [ ] Verify feature accessible at /scanning
6. [ ] Test full workflow in production
7. [ ] Monitor logs for errors
8. [ ] Notify users about new feature

## Troubleshooting

### Issue: Route not found
**Solution**: 
```bash
rm -rf dist
npm run dev  # This regenerates routeTree.gen.ts
```

### Issue: Tables not created
**Solution**:
1. Check Supabase connection
2. Re-run migration SQL
3. Verify no errors in SQL execution

### Issue: Mock OCR not working
**Solution**:
1. Check VITE_USE_MOCK_OCR=true
2. Restart dev server
3. Clear browser cache

### Issue: Google Vision API error
**Solution**:
1. Verify API key is correct
2. Check API is enabled in GCP
3. Check API quotas not exceeded
4. Try mock OCR for testing

### Issue: Backup not saving
**Solution**:
1. Check Supabase connection
2. Verify backup_snapshots table exists
3. Check database permissions
4. Review error logs

## Post-Deployment Monitoring

### Check Regular Status
```sql
-- Transaction success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM scanning_transactions
GROUP BY status;

-- Average confidence score
SELECT 
  AVG(CAST(ocr_result->>'confidence' AS FLOAT)) as avg_confidence,
  MIN(CAST(ocr_result->>'confidence' AS FLOAT)) as min_confidence,
  MAX(CAST(ocr_result->>'confidence' AS FLOAT)) as max_confidence
FROM scanning_transactions
WHERE status = 'completed';
```

### Monitor Backup Growth
```sql
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as backups_created,
  SUM(backup_size_bytes) / 1024 / 1024 as total_size_mb
FROM backup_snapshots
GROUP BY DATE(timestamp)
ORDER BY date DESC
LIMIT 30;
```

## Support Contacts

For issues related to:
- **Code/Logic**: Development team
- **Database**: Supabase support
- **Google Vision API**: Google Cloud support
- **UI/UX**: Frontend team
- **Security**: Security team

---

**Status**: Ready for deployment  
**Last Updated**: 2026-05-10  
**Version**: 1.0

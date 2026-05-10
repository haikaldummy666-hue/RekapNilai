# 🚀 Pre-Deployment Setup Checklist

## Status: ⚠️ NOT READY YET - Butuh Setup Sebelum Push ke GitHub

Berikut yang **SUDAH** ready dan yang **BELUM** perlu di-setup:

---

## ✅ Sudah Siap (Vercel Config)

```
✓ vercel.json ada dengan config
✓ .gitignore sudah set (*.local files ignored)
✓ Build command: npm run build
✓ Output directory: dist/client
✓ Rewrite rules sudah ada
```

---

## ❌ BELUM Setup (Butuh Diexekusi Sebelum Push)

### 1️⃣ Create .env.local (Lokal Development)

```bash
# Copy template ke actual file
cp .env.local.example .env.local
```

Edit `.env.local` dengan values Anda:

```env
# SUPABASE
VITE_SUPABASE_URL=https://xziynvczautbusvqcxuz.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# GOOGLE VISION API (optional untuk production)
GOOGLE_VISION_API_KEY=your_key_here
VITE_USE_MOCK_OCR=true

# OCR CONFIG
OCR_MIN_CONFIDENCE_THRESHOLD=70
VITE_ENABLE_ANOMALY_DETECTION=true
VITE_ENABLE_SCANNING_LOGS=true
VITE_AUTO_BACKUP_ENABLED=true
```

**✓ Check:** 
- [ ] .env.local sudah ada
- [ ] Filled dengan Supabase keys Anda
- [ ] File tidak di-git (verified via .gitignore)

---

### 2️⃣ Setup Supabase Database Schema

#### Option A: GUI Supabase (Recommended - Visual)

```
1. Buka: https://app.supabase.com
2. Login ke project: xziynvczautbusvqcxuz
3. Click "SQL Editor" di sidebar
4. Click "New Query"
5. Copy paste contents dari supabase-ocr-migration.sql
6. Click "Run"
```

#### Option B: CLI (Vercel-compatible)

```bash
# Install Supabase CLI
npm install -g supabase

# Or gunakan npx
npx supabase@latest db push
```

**✓ Check:**
- [ ] Buka Supabase Dashboard → Table Editor
- [ ] Verify tables exist:
  - [ ] scanning_transactions
  - [ ] backup_snapshots
  - [ ] scanning_logs
  - [ ] scanning_settings

---

### 3️⃣ Setup Vercel Environment Variables

**JANGAN push .env.local ke GitHub!** Set di Vercel instead:

```
1. Buka: https://vercel.com/dashboard
2. Select project Anda
3. Settings → Environment Variables
4. Add setiap variable:

   Name: VITE_SUPABASE_URL
   Value: https://xziynvczautbusvqcxuz.supabase.co
   
   Name: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGc... (copy from Supabase)
   
   Name: GOOGLE_VISION_API_KEY
   Value: YOUR_KEY (optional)
   
   Name: VITE_USE_MOCK_OCR
   Value: false (for production)
```

**✓ Check:**
- [ ] All env vars in Vercel dashboard
- [ ] No secrets in code
- [ ] .env.local in .gitignore

---

### 4️⃣ Test Locally Before Push

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Navigate to /scanning
# Test quality preview
# Verify Supabase connection (if schema migrated)
```

**✓ Check:**
- [ ] `npm run dev` works
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Can navigate to /scanning
- [ ] Quality preview dialog appears

---

### 5️⃣ Setup GitHub (Before First Push)

```bash
# Initialize git (if not already)
git init

# Add Vercel deploy hook (optional)
git remote add origin https://github.com/YOUR_USERNAME/rekapnilaikelas6.git

# Create .env.local file (NEVER commit)
echo ".env.local" >> .gitignore

# Verify .gitignore has .env.local
cat .gitignore | grep "\.local"
```

**✓ Check:**
- [ ] .env.local NOT in git
- [ ] GitHub repo created
- [ ] Remote origin added
- [ ] .gitignore has *.local

---

## 📋 Complete Pre-Push Checklist

### Step 1: Environment Setup
- [ ] Created .env.local from template
- [ ] Filled with Supabase keys
- [ ] Set VITE_USE_MOCK_OCR=true (for testing)
- [ ] Verified .env.local in .gitignore

### Step 2: Database Setup
- [ ] Supabase schema migrated (supabase-ocr-migration.sql)
- [ ] Tables verified in Supabase dashboard:
  - [ ] scanning_transactions
  - [ ] backup_snapshots
  - [ ] scanning_logs
  - [ ] scanning_settings
- [ ] RLS policies enabled
- [ ] Test user has access

### Step 3: Local Testing
- [ ] `npm install` runs without errors
- [ ] `npm run dev` starts without errors
- [ ] Navigate to http://localhost:5173
- [ ] Sidebar shows "Pindai Nilai (AI)" menu
- [ ] Can navigate to /scanning
- [ ] Upload dialog opens
- [ ] Quality preview works
- [ ] No console errors or warnings
- [ ] Build passes: `npm run build`

### Step 4: Vercel Setup
- [ ] Created Vercel project
- [ ] Connected GitHub repo (optional)
- [ ] Environment variables set in Vercel:
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] VITE_SUPABASE_SERVICE_ROLE_KEY (if server-side)
  - [ ] GOOGLE_VISION_API_KEY (optional)
- [ ] Test deploy to Vercel
- [ ] Verify production build works

### Step 5: GitHub Ready
- [ ] .env.local NOT committed
- [ ] .gitignore verified
- [ ] All dependencies in package.json
- [ ] No hardcoded secrets in code
- [ ] Ready for first push

---

## 🚨 CRITICAL: What NOT to Push

```
❌ .env.local (contains private keys)
❌ node_modules/ (.gitignore handles)
❌ dist/ (build output, .gitignore handles)
❌ .wrangler/ (Cloudflare config)
❌ Any API keys or secrets
```

**Verified by .gitignore:**
```
✓ *.local files ignored
✓ node_modules/ ignored
✓ dist/ ignored
```

---

## 📊 Deployment Flow After Push

```
GitHub Push
    ↓
Vercel Auto-Deploy (if connected)
    ↓
Vercel reads env vars from Settings
    ↓
Build: npm run build
    ↓
Deploy to Vercel CDN
    ↓
Supabase connection via VITE_SUPABASE_URL + keys
    ↓
App live at: your-project.vercel.app
```

---

## 🎯 Quick Summary

### Right Now (Before Push):
1. ✅ Create .env.local with Supabase keys
2. ✅ Migrate database schema in Supabase
3. ✅ Test locally: npm run dev
4. ✅ Set env vars in Vercel dashboard
5. ✅ Verify .gitignore protects .env.local

### Then Push to GitHub:
```bash
git add .
git commit -m "Initial commit: AI OCR scanning system"
git push origin main
```

### Vercel Auto-Deploys:
- ✅ Pull code from GitHub
- ✅ Use env vars from Vercel Settings
- ✅ Build and deploy
- ✅ Live on Vercel!

---

## 🔗 Links You Need

- Supabase Project: https://app.supabase.com
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repo: https://github.com/YOUR_USERNAME/rekapnilaikelas6

---

## ⏱️ Estimated Time

- Setup .env.local: 5 minutes
- Migrate Supabase schema: 5 minutes
- Local testing: 10 minutes
- Vercel env vars: 5 minutes
- First push: 2 minutes

**Total: ~30 minutes to ready-to-deploy state**

---

## ❓ Common Issues

### "Supabase keys not working"
→ Check: Are keys copied correctly from Supabase dashboard?
→ Check: .env.local has correct key names (VITE_SUPABASE_*)
→ Fix: Copy fresh from Supabase Settings → API

### "Build fails on Vercel"
→ Check: All env vars in Vercel dashboard match code expectations
→ Check: No .env.local file committed (would override Vercel vars)
→ Fix: Verify env var names in vercel.json match Settings

### "Database tables don't exist"
→ Check: Ran supabase-ocr-migration.sql?
→ Check: Migration ran without errors?
→ Fix: Go to Supabase SQL Editor and run migration again

### "Quality preview doesn't work"
→ Check: React components imported correctly
→ Check: TypeScript types resolved
→ Fix: Clear node_modules and reinstall: rm -rf node_modules && npm install

---

**READY TO PUSH?** Verify all checkboxes above ✅, then:

```bash
git push origin main
```

Vercel will auto-deploy!

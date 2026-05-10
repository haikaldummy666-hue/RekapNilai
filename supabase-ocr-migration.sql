-- Supabase SQL Migration untuk AI OCR Scanning System
-- Tables untuk menyimpan scanning transactions, backups, dan logs

-- Table: scanning_transactions
-- Menyimpan semua transaksi pemindaian nilai
CREATE TABLE IF NOT EXISTS scanning_transactions (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  document_type TEXT NOT NULL CHECK (document_type IN ('rapor', 'transkrip', 'lembar-penilaian', 'other')),
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 6),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'rolled-back')) DEFAULT 'pending',
  
  -- OCR Result
  ocr_result JSONB NOT NULL,
  
  -- Applied Changes (after applying to database)
  applied_changes JSONB,
  
  -- Manual Corrections made by user
  manual_corrections JSONB,
  
  -- Rollback Information
  rollback_data JSONB,
  
  -- User Information
  user_id TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE INDEX idx_scanning_transactions_student_id ON scanning_transactions(student_id);
CREATE INDEX idx_scanning_transactions_timestamp ON scanning_transactions(timestamp DESC);
CREATE INDEX idx_scanning_transactions_status ON scanning_transactions(status);
CREATE INDEX idx_scanning_transactions_user_id ON scanning_transactions(user_id);

-- Table: backup_snapshots
-- Menyimpan snapshot data siswa sebelum perubahan dari OCR
CREATE TABLE IF NOT EXISTS backup_snapshots (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Backup data (full student record)
  data JSONB NOT NULL,
  
  -- Metadata
  backup_size_bytes INTEGER,
  checksum TEXT,
  notes TEXT,
  
  -- Expiry (auto-delete after 90 days)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '90 days',
  
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES scanning_transactions(id) ON DELETE CASCADE
);

CREATE INDEX idx_backup_snapshots_student_id ON backup_snapshots(student_id);
CREATE INDEX idx_backup_snapshots_transaction_id ON backup_snapshots(transaction_id);
CREATE INDEX idx_backup_snapshots_timestamp ON backup_snapshots(timestamp DESC);

-- Table: scanning_logs
-- Audit log untuk setiap transaksi scanning
CREATE TABLE IF NOT EXISTS scanning_logs (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  student_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Log Entry
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'processing', 'completed', 'failed', 'rolled-back')),
  details JSONB,
  
  -- User
  user_id TEXT,
  ip_address TEXT,
  
  -- Result
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  FOREIGN KEY (transaction_id) REFERENCES scanning_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE INDEX idx_scanning_logs_transaction_id ON scanning_logs(transaction_id);
CREATE INDEX idx_scanning_logs_timestamp ON scanning_logs(timestamp DESC);
CREATE INDEX idx_scanning_logs_student_id ON scanning_logs(student_id);

-- Table: scanning_settings
-- Konfigurasi dan preferences untuk scanning system
CREATE TABLE IF NOT EXISTS scanning_settings (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  
  -- OCR Settings
  min_confidence_threshold INTEGER DEFAULT 70, -- Minimum confidence untuk auto-apply
  enable_anomaly_detection BOOLEAN DEFAULT TRUE,
  enable_auto_logging BOOLEAN DEFAULT TRUE,
  
  -- Backup Settings
  auto_backup BOOLEAN DEFAULT TRUE,
  backup_retention_days INTEGER DEFAULT 90,
  
  -- Validation Settings
  validation_rules JSONB,
  required_fields TEXT[], -- Array of required field names
  
  -- Created/Updated
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO scanning_settings (id, min_confidence_threshold, enable_anomaly_detection, enable_auto_logging)
VALUES ('default', 70, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk updated_at
CREATE TRIGGER trigger_scanning_transactions_updated_at
BEFORE UPDATE ON scanning_transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_scanning_settings_updated_at
BEFORE UPDATE ON scanning_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Function: Auto-cleanup expired backups
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM backup_snapshots
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (jika menggunakan Row Level Security)
ALTER TABLE scanning_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanning_settings ENABLE ROW LEVEL SECURITY;

-- Policies untuk authenticated users (sesuaikan dengan auth model Anda)
CREATE POLICY "Users can view own scanning transactions" ON scanning_transactions
  FOR SELECT USING (user_id = auth.uid() OR true); -- Adjust based on your auth

CREATE POLICY "Users can view own backup snapshots" ON backup_snapshots
  FOR SELECT USING (student_id IN (
    SELECT id FROM students WHERE true -- Adjust based on access control
  ));

CREATE POLICY "Users can view own scanning logs" ON scanning_logs
  FOR SELECT USING (user_id = auth.uid() OR true); -- Adjust based on your auth

-- WCAGTR Platform Initial Schema
-- Türkiye Cumhuriyeti Erişilebilirlik Standartları (WCAG 2.2 + TR Checklist)

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(subscription_status);

-- Domains table
CREATE TABLE IF NOT EXISTS domains (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  token TEXT,
  token_expires_at TIMESTAMP,
  auto_fix_enabled BOOLEAN DEFAULT false,
  server_patch_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_domains_customer ON domains(customer_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_active ON domains(is_active);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  scan_type VARCHAR(50) DEFAULT 'auto',
  total_violations INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  major_count INTEGER DEFAULT 0,
  minor_count INTEGER DEFAULT 0,
  wcag_level VARCHAR(10),
  tr_compliance_score DECIMAL(5,2),
  scan_duration_ms INTEGER,
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  scan_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scans_domain ON scans(domain_id);
CREATE INDEX IF NOT EXISTS idx_scans_url ON scans(url);
CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_compliance ON scans(tr_compliance_score);

-- Violations table
CREATE TABLE IF NOT EXISTS violations (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  wcag_criterion VARCHAR(50) NOT NULL,
  tr_criterion VARCHAR(50),
  severity VARCHAR(20) NOT NULL,
  element_selector TEXT,
  violation_type VARCHAR(100) NOT NULL,
  description TEXT,
  recommendation TEXT,
  impact VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_scan ON violations(scan_id);
CREATE INDEX IF NOT EXISTS idx_violations_wcag ON violations(wcag_criterion);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);

-- Fixes table
CREATE TABLE IF NOT EXISTS fixes (
  id SERIAL PRIMARY KEY,
  violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  fix_type VARCHAR(50) NOT NULL,
  fix_method VARCHAR(50) NOT NULL,
  css_patch TEXT,
  js_patch TEXT,
  html_patch TEXT,
  server_patch TEXT,
  approval_status VARCHAR(50) DEFAULT 'pending',
  applied_at TIMESTAMP,
  ai_confidence DECIMAL(5,2),
  ai_reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixes_violation ON fixes(violation_id);
CREATE INDEX IF NOT EXISTS idx_fixes_status ON fixes(approval_status);
CREATE INDEX IF NOT EXISTS idx_fixes_applied ON fixes(applied_at);

-- Patches table (for server-side delivery)
CREATE TABLE IF NOT EXISTS patches (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  fix_id INTEGER REFERENCES fixes(id) ON DELETE SET NULL,
  patch_content TEXT NOT NULL,
  patch_signature TEXT NOT NULL,
  file_path TEXT,
  patch_type VARCHAR(50) NOT NULL,
  delivery_status VARCHAR(50) DEFAULT 'pending',
  delivered_at TIMESTAMP,
  applied_at TIMESTAMP,
  rollback_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patches_domain ON patches(domain_id);
CREATE INDEX IF NOT EXISTS idx_patches_status ON patches(delivery_status);
CREATE INDEX IF NOT EXISTS idx_patches_created ON patches(created_at DESC);

-- API Logs table
CREATE TABLE IF NOT EXISTS api_logs (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address VARCHAR(50),
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_domain ON api_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_logs(status_code);

-- System Health table
CREATE TABLE IF NOT EXISTS system_health (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_unit VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_metric ON system_health(metric_name);
CREATE INDEX IF NOT EXISTS idx_health_recorded ON system_health(recorded_at DESC);

-- Admin Users table
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);

-- Create initial admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- bcrypt hash for 'admin123'
INSERT INTO admin_users (email, password_hash, full_name, role)
VALUES (
  'admin@wcagtr.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'System Administrator',
  'superadmin'
) ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE customers IS 'Platform müşterileri';
COMMENT ON TABLE domains IS 'Müşteri domainleri ve token bilgileri';
COMMENT ON TABLE scans IS 'WCAG tarama sonuçları';
COMMENT ON TABLE violations IS 'Tespit edilen erişilebilirlik ihlalleri';
COMMENT ON TABLE fixes IS 'AI önerilen düzeltmeler';
COMMENT ON TABLE patches IS 'Sunucu tarafı patch delivery';
COMMENT ON TABLE api_logs IS 'API kullanım logları';
COMMENT ON TABLE system_health IS 'Sistem sağlık metrikleri';

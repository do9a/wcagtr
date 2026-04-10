-- Billing plans + payment transaction foundation

CREATE TABLE IF NOT EXISTS billing_plans (
  code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_monthly_try INTEGER,
  interval_days INTEGER NOT NULL DEFAULT 30,
  features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_plans_active ON billing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_plans_display_order ON billing_plans(display_order);

INSERT INTO billing_plans (code, name, price_monthly_try, interval_days, features, is_active, display_order)
VALUES
  ('trial', 'Trial', 0, 14, ARRAY['1 domain', 'Temel tarama', 'Email destek'], true, 1),
  ('basic', 'Basic', 1499, 30, ARRAY['3 domain', 'Otomatik tarama', 'Fix önerileri'], true, 2),
  ('pro', 'Pro', 4999, 30, ARRAY['10 domain', 'Fix approval workflow', 'Öncelikli destek'], true, 3),
  ('enterprise', 'Enterprise', NULL, 30, ARRAY['Sınırsız domain', 'Patch Agent', 'Özel SLA'], true, 4)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly_try = EXCLUDED.price_monthly_try,
  interval_days = EXCLUDED.interval_days,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_code VARCHAR(50) NOT NULL REFERENCES billing_plans(code),
  provider VARCHAR(50) NOT NULL DEFAULT 'mock',
  amount_try INTEGER,
  currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  checkout_url TEXT,
  provider_payment_id VARCHAR(255),
  provider_reference VARCHAR(255),
  failure_reason TEXT,
  paid_at TIMESTAMP,
  expires_at TIMESTAMP,
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);

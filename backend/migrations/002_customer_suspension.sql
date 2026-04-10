-- Add customer suspension support for admin controls
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customers_is_suspended
  ON customers(is_suspended);

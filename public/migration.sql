-- ============================================================
-- MIGRACIÓN: Agregar columnas de trazabilidad y caja avanzada
-- ============================================================
-- Ejecuta este SQL si ya tienes las tablas creadas
-- ============================================================

-- Columna user_name en todas las tablas
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE debts ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';

-- Columnas para caja avanzada (apertura y desglose)
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS opening_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS opening_notes TEXT DEFAULT '';
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS sales_cup DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS sales_usd DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS expenses_cup DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS expenses_usd DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS actual_cup DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS actual_usd DECIMAL(10,2) DEFAULT 0;

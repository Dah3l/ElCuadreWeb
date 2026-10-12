-- ============================================================
-- EL CUADRE - Esquema de Base de Datos para Supabase
-- ============================================================
-- Ejecuta este SQL en el Editor SQL de Supabase
-- (Dashboard > SQL Editor > New Query)
-- ============================================================

-- ============================================================
-- TABLA: settings (configuración por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT DEFAULT 'Mi Negocio',
  exchange_rate DECIMAL(10,2) DEFAULT 120.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: products (inventario)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: sales (ventas)
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CUP' CHECK (currency IN ('CUP', 'USD')),
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: expenses (gastos)
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CUP' CHECK (currency IN ('CUP', 'USD')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: cash_closures (cierres de caja)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_amount DECIMAL(10,2) DEFAULT 0,
  actual_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: debts (fiados / deudas)
-- ============================================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'por_cobrar' CHECK (type IN ('por_cobrar', 'por_pagar')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CUP' CHECK (currency IN ('CUP', 'USD')),
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para mejor rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_closures_user_id ON cash_closures(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_date ON cash_closures(date);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);

-- ============================================================
-- POLÍTICAS RLS (Row Level Security)
-- Cada usuario solo puede ver y modificar SUS propios datos
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- ----- SETTINGS -----
DROP POLICY IF EXISTS "settings_select" ON settings;
DROP POLICY IF EXISTS "settings_insert" ON settings;
DROP POLICY IF EXISTS "settings_update" ON settings;
DROP POLICY IF EXISTS "settings_delete" ON settings;

CREATE POLICY "settings_select" ON settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "settings_insert" ON settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_update" ON settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "settings_delete" ON settings
  FOR DELETE USING (auth.uid() = user_id);

-- ----- PRODUCTS -----
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

CREATE POLICY "products_select" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "products_delete" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- ----- SALES -----
DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;
DROP POLICY IF EXISTS "sales_delete" ON sales;

CREATE POLICY "sales_select" ON sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sales_insert" ON sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_update" ON sales
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sales_delete" ON sales
  FOR DELETE USING (auth.uid() = user_id);

-- ----- EXPENSES -----
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ----- CASH_CLOSURES -----
DROP POLICY IF EXISTS "cash_closures_select" ON cash_closures;
DROP POLICY IF EXISTS "cash_closures_insert" ON cash_closures;
DROP POLICY IF EXISTS "cash_closures_update" ON cash_closures;
DROP POLICY IF EXISTS "cash_closures_delete" ON cash_closures;

CREATE POLICY "cash_closures_select" ON cash_closures
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cash_closures_insert" ON cash_closures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cash_closures_update" ON cash_closures
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cash_closures_delete" ON cash_closures
  FOR DELETE USING (auth.uid() = user_id);

-- ----- DEBTS -----
DROP POLICY IF EXISTS "debts_select" ON debts;
DROP POLICY IF EXISTS "debts_insert" ON debts;
DROP POLICY IF EXISTS "debts_update" ON debts;
DROP POLICY IF EXISTS "debts_delete" ON debts;

CREATE POLICY "debts_select" ON debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "debts_insert" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "debts_update" ON debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "debts_delete" ON debts
  FOR DELETE USING (auth.uid() = user_id);

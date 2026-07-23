-- ============================================================
-- COVER STORE - Supabase Setup
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  modelo TEXT,
  color TEXT,
  precio INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  imagen_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar Row Level Security
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas: lectura pública, escritura solo para usuarios autenticados
--    (el admin se loguea con Supabase Auth — ver instrucciones al final del archivo)
DROP POLICY IF EXISTS "Escritura pública categorias" ON categorias;
DROP POLICY IF EXISTS "Lectura pública categorias"   ON categorias;
DROP POLICY IF EXISTS "Escritura pública productos"  ON productos;
DROP POLICY IF EXISTS "Lectura pública productos"    ON productos;

CREATE POLICY "Lectura pública categorias"      ON categorias FOR SELECT USING (true);
CREATE POLICY "Escritura autenticada categorias" ON categorias FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Lectura pública productos"       ON productos  FOR SELECT USING (true);
CREATE POLICY "Escritura autenticada productos"  ON productos  FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5. Categorías por defecto
INSERT INTO categorias (nombre) VALUES
  ('fundas'),
  ('protectores'),
  ('correas'),
  ('ventosas'),
  ('airpods pro de segunda generación')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- STORAGE - Ejecuta esto también para habilitar subida de imágenes
-- (O créalo manualmente en Storage > New bucket > "product-images" público)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lectura pública storage" ON storage.objects;
DROP POLICY IF EXISTS "Subida storage"          ON storage.objects;
DROP POLICY IF EXISTS "Actualizar storage"      ON storage.objects;
DROP POLICY IF EXISTS "Eliminar storage"        ON storage.objects;

CREATE POLICY "Lectura pública storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Subida storage autenticada"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Actualizar storage autenticada"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Eliminar storage autenticada"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- ============================================================
-- MODELOS DE CELULARES
-- Ejecuta esto para habilitar la gestión de modelos desde la DB
-- ============================================================

CREATE TABLE IF NOT EXISTS modelos (
  id   TEXT PRIMARY KEY,        -- slug: 'iphone15pro'
  nombre TEXT NOT NULL UNIQUE,  -- display: 'iPhone 15 Pro'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE modelos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública modelos"   ON modelos;
DROP POLICY IF EXISTS "Escritura pública modelos" ON modelos;

CREATE POLICY "Lectura pública modelos"      ON modelos FOR SELECT USING (true);
CREATE POLICY "Escritura autenticada modelos" ON modelos FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

INSERT INTO modelos (id, nombre) VALUES
  ('iphone11',      'iPhone 11'),
  ('iphone12',      'iPhone 12'),
  ('iphone12mini',  'iPhone 12 Mini'),
  ('iphone12pro',   'iPhone 12 Pro'),
  ('iphone12promax','iPhone 12 Pro Max'),
  ('iphone13',      'iPhone 13'),
  ('iphone13mini',  'iPhone 13 Mini'),
  ('iphone13pro',   'iPhone 13 Pro'),
  ('iphone13promax','iPhone 13 Pro Max'),
  ('iphone14',      'iPhone 14'),
  ('iphone14plus',  'iPhone 14 Plus'),
  ('iphone14pro',   'iPhone 14 Pro'),
  ('iphone14promax','iPhone 14 Pro Max'),
  ('iphone15',      'iPhone 15'),
  ('iphone15plus',  'iPhone 15 Plus'),
  ('iphone15pro',   'iPhone 15 Pro'),
  ('iphone15promax','iPhone 15 Pro Max'),
  ('iphone16',      'iPhone 16'),
  ('iphone16plus',  'iPhone 16 Plus'),
  ('iphone16pro',   'iPhone 16 Pro'),
  ('iphone16promax','iPhone 16 Pro Max'),
  ('iphone17',      'iPhone 17'),
  ('iphone17plus',  'iPhone 17 Plus'),
  ('iphone17pro',   'iPhone 17 Pro'),
  ('iphone17promax','iPhone 17 Pro Max')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CUENTA ADMIN (pasos manuales, una sola vez)
-- ============================================================
-- Las políticas de arriba exigen auth.role() = 'authenticated' para
-- escribir. Para eso necesitás un usuario real en Supabase Auth:
--
-- 1. Dashboard → Authentication → Providers → confirmá que "Email" esté habilitado.
-- 2. Dashboard → Authentication → Users → "Add user" → "Create new user":
--      Email:    admin@coverstore.local   (o el que hayas puesto en ADMIN_EMAIL en app.js)
--      Password: elegí una contraseña fuerte real (esta es la que se usa para
--                entrar al panel — NO se guarda en el código)
--      Marcá "Auto Confirm User" para no tener que confirmar por mail.
-- 3. Listo. app.js ahora hace login contra Supabase Auth con ese email +
--    la contraseña que ingresés en el modal, en vez de comparar un string
--    hardcodeado.
--
-- Si en algún momento querés cambiar la contraseña del admin, hacelo desde
-- Authentication → Users → (el usuario) → "Reset password", sin tocar el código.

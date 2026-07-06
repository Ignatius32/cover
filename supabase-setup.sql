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

-- 4. Políticas: lectura pública + escritura pública (la contraseña está en el frontend)
CREATE POLICY "Lectura pública categorias"   ON categorias FOR SELECT USING (true);
CREATE POLICY "Escritura pública categorias" ON categorias FOR ALL   USING (true) WITH CHECK (true);
CREATE POLICY "Lectura pública productos"    ON productos  FOR SELECT USING (true);
CREATE POLICY "Escritura pública productos"  ON productos  FOR ALL   USING (true) WITH CHECK (true);

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

CREATE POLICY "Lectura pública storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Subida storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Actualizar storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images');

CREATE POLICY "Eliminar storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images');

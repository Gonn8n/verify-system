-- Agregar columnas faltantes a verification_analysis
-- Ejecutar en Supabase SQL Editor

-- Columnas para findings del DNI
ALTER TABLE verification_analysis
  ADD COLUMN IF NOT EXISTS dni_front_findings jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dni_back_findings jsonb DEFAULT '[]'::jsonb;

-- Columna para consistencia del documento
ALTER TABLE verification_analysis
  ADD COLUMN IF NOT EXISTS data_consistency jsonb DEFAULT '{}'::jsonb;

-- Columna para resumen en español
ALTER TABLE verification_analysis
  ADD COLUMN IF NOT EXISTS summary jsonb DEFAULT '[]'::jsonb;

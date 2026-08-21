-- ============================================
-- VERIFY SYSTEM - Verificar estructura de tablas
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Verificar columnas de verification_analysis
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'verification_analysis'
ORDER BY ordinal_position;

-- 2. Verificar que el UNIQUE constraint exista
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'verification_analysis'::regclass
  AND contype = 'u';

-- 3. Verificar RLS de verification_analysis
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'verification_analysis';

-- 4. Verificar columnas de verifications
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'verifications'
ORDER BY ordinal_position;

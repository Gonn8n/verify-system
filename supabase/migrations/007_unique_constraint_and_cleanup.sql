-- ============================================
-- VERIFY SYSTEM - Migración: UNIQUE constraint + limpieza
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Eliminar registros duplicados, quedarse con el más reciente
DELETE FROM verification_analysis
WHERE id NOT IN (
  SELECT DISTINCT ON (verification_id) id
  FROM verification_analysis
  ORDER BY verification_id, analyzed_at DESC
);

-- 2. Agregar UNIQUE constraint para que UPSERT funcione
ALTER TABLE verification_analysis
  ADD CONSTRAINT verification_analysis_verification_id_unique
  UNIQUE (verification_id);

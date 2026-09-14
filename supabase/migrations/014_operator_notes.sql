-- ============================================
-- VERIFY SYSTEM - Migración 014: Notas del operador
-- ============================================
-- Columna notas internas por verificación (solo admin ve/escribe)

ALTER TABLE verifications ADD COLUMN operator_notes TEXT;
ALTER TABLE verifications ADD COLUMN operator_notes_updated_at TIMESTAMPTZ;

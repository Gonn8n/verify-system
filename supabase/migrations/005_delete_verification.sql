-- ============================================
-- VERIFY SYSTEM - Migración: Eliminar verificación
-- ============================================

-- Función para eliminar una verificación completa (admin only)
CREATE OR REPLACE FUNCTION delete_verification(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Obtener el unique_code para eliminar archivos del storage
  SELECT unique_code INTO v_code FROM verifications WHERE id = p_id;

  -- Eliminar análisis AI asociado
  DELETE FROM verification_analysis WHERE verification_id = p_id;

  -- Eliminar archivos del storage (carpeta del código)
  DELETE FROM storage.objects
  WHERE bucket_id = 'verification-files'
    AND name LIKE v_code || '/%';

  -- Eliminar el registro de verificación
  DELETE FROM verifications WHERE id = p_id;
END;
$$;

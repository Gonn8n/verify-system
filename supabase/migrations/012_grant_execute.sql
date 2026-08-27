-- ============================================
-- VERIFY SYSTEM - Migración 012: Grant EXECUTE a anon
-- ============================================
-- Las funciones SECURITY DEFINER necesitan que anon tenga permiso EXECUTE
-- para poder llamarlas desde el cliente (key anon, sin auth)

GRANT EXECUTE ON FUNCTION update_verification_by_code(
  TEXT, TEXT, TEXT, TEXT, TEXT, FLOAT, FLOAT
) TO anon;

GRANT EXECUTE ON FUNCTION get_verification_by_code(TEXT) TO anon;

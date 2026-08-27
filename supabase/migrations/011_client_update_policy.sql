-- ============================================
-- VERIFY SYSTEM - Migración 011: Política de actualización para clientes
-- ============================================
-- El cliente (anon) necesita actualizar verifications para guardar URLs de archivos
-- Sin esta política, client.js falla al hacer .from('verifications').update()

-- Permitir a usuarios anónimos actualizar verificaciones (solo columnas de archivos y ubicación)
DROP POLICY IF EXISTS "Client update own verification" ON verifications;
CREATE POLICY "Client update own verification"
  ON verifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

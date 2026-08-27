-- ============================================
-- VERIFY SYSTEM - Migración 013: Storage UPDATE policy para clientes
-- ============================================
-- Permite a usuarios anónimos hacer upsert (PUT) en verification-files
-- Sin esto, upsert:true en client.js falla con "violates row-level security policy"

DROP POLICY IF EXISTS "Admin update files" ON storage.objects;

CREATE POLICY "Client update verification files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'verification-files')
  WITH CHECK (bucket_id = 'verification-files');

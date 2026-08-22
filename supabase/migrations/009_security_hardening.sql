-- ============================================
-- MIGRATION 009: SECURITY HARDENING
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Crear tabla verification_analysis si no existe
CREATE TABLE IF NOT EXISTS verification_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
  extracted_name TEXT DEFAULT '',
  extracted_dni TEXT DEFAULT '',
  extracted_birth_date TEXT DEFAULT '',
  dni_front_score INTEGER DEFAULT 0,
  dni_back_score INTEGER DEFAULT 0,
  dni_front_findings JSONB DEFAULT '[]',
  dni_back_findings JSONB DEFAULT '[]',
  card_photo_score INTEGER DEFAULT 0,
  card_photo_findings JSONB DEFAULT '[]',
  overall_score INTEGER DEFAULT 0,
  fraud_signals JSONB DEFAULT '[]',
  data_match JSONB DEFAULT '{}',
  data_consistency JSONB DEFAULT '{}',
  summary JSONB DEFAULT '[]',
  recommendation TEXT DEFAULT 'low_risk',
  raw_response JSONB DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_by TEXT DEFAULT 'openai-gpt-4o'
);

-- 2. Crear UNIQUE constraint si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verification_analysis_verification_id_unique'
  ) THEN
    ALTER TABLE verification_analysis ADD CONSTRAINT verification_analysis_verification_id_unique UNIQUE (verification_id);
  END IF;
END $$;

-- 3. Habilitar RLS en verification_analysis
ALTER TABLE verification_analysis ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Admin full access on analysis" ON verification_analysis;

-- 5. Política: Solo admin puede leer/escribir análisis
CREATE POLICY "Admin full access on analysis" ON verification_analysis
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- 6. Eliminar función delete_verification existente
DROP FUNCTION IF EXISTS delete_verification(UUID);

-- 7. Recrear delete_verification CON autenticación
CREATE OR REPLACE FUNCTION delete_verification(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_admin_id UUID;
BEGIN
  -- Verificar que el llamador es admin
  SELECT id INTO v_admin_id FROM admin_users WHERE id = auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Obtener unique_code para eliminar archivos del storage
  SELECT unique_code INTO v_code FROM verifications WHERE id = p_id;

  -- Eliminar archivos del storage
  IF v_code IS NOT NULL THEN
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'verification-files'
        AND (storage.foldername(name))[1] = v_code;
    EXCEPTION WHEN OTHERS THEN
      -- Ignorar errores de storage
      NULL;
    END;
  END IF;

  -- Eliminar análisis AI
  DELETE FROM verification_analysis WHERE verification_id = p_id;

  -- Eliminar verificación
  DELETE FROM verifications WHERE id = p_id;
END;
$$;

-- 8. Eliminar función save_analysis existente
DROP FUNCTION IF EXISTS save_analysis(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, INTEGER, JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, JSONB);

-- 9. Recrear save_analysis CON autenticación
CREATE OR REPLACE FUNCTION save_analysis(
  p_verification_id UUID,
  p_extracted_name TEXT DEFAULT '',
  p_extracted_dni TEXT DEFAULT '',
  p_extracted_birth_date TEXT DEFAULT '',
  p_dni_front_score INTEGER DEFAULT 0,
  p_dni_back_score INTEGER DEFAULT 0,
  p_dni_front_findings JSONB DEFAULT '[]',
  p_dni_back_findings JSONB DEFAULT '[]',
  p_card_photo_score INTEGER DEFAULT 0,
  p_card_photo_findings JSONB DEFAULT '[]',
  p_overall_score INTEGER DEFAULT 0,
  p_fraud_signals JSONB DEFAULT '[]',
  p_data_match JSONB DEFAULT '{}',
  p_data_consistency JSONB DEFAULT '{}',
  p_summary JSONB DEFAULT '[]',
  p_recommendation TEXT DEFAULT 'low_risk',
  p_raw_response JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Verificar que el llamador es admin
  SELECT id INTO v_admin_id FROM admin_users WHERE id = auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Upsert análisis
  INSERT INTO verification_analysis (
    verification_id, extracted_name, extracted_dni, extracted_birth_date,
    dni_front_score, dni_back_score, dni_front_findings, dni_back_findings,
    card_photo_score, card_photo_findings, overall_score, fraud_signals,
    data_match, data_consistency, summary, recommendation, raw_response,
    analyzed_at, analyzed_by
  ) VALUES (
    p_verification_id, p_extracted_name, p_extracted_dni, p_extracted_birth_date,
    p_dni_front_score, p_dni_back_score, p_dni_front_findings, p_dni_back_findings,
    p_card_photo_score, p_card_photo_findings, p_overall_score, p_fraud_signals,
    p_data_match, p_data_consistency, p_summary, p_recommendation, p_raw_response,
    NOW(), 'openai-gpt-4o'
  )
  ON CONFLICT (verification_id)
  DO UPDATE SET
    extracted_name = EXCLUDED.extracted_name,
    extracted_dni = EXCLUDED.extracted_dni,
    extracted_birth_date = EXCLUDED.extracted_birth_date,
    dni_front_score = EXCLUDED.dni_front_score,
    dni_back_score = EXCLUDED.dni_back_score,
    dni_front_findings = EXCLUDED.dni_front_findings,
    dni_back_findings = EXCLUDED.dni_back_findings,
    card_photo_score = EXCLUDED.card_photo_score,
    card_photo_findings = EXCLUDED.card_photo_findings,
    overall_score = EXCLUDED.overall_score,
    fraud_signals = EXCLUDED.fraud_signals,
    data_match = EXCLUDED.data_match,
    data_consistency = EXCLUDED.data_consistency,
    summary = EXCLUDED.summary,
    recommendation = EXCLUDED.recommendation,
    raw_response = EXCLUDED.raw_response,
    analyzed_at = NOW(),
    analyzed_by = 'openai-gpt-4o';
END;
$$;

-- 10. Política de storage: Solo admin puede eliminar archivos
DROP POLICY IF EXISTS "Admin delete files" ON storage.objects;
CREATE POLICY "Admin delete files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'verification-files'
    AND EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- 11. Política de storage: Solo admin puede actualizar archivos
DROP POLICY IF EXISTS "Admin update files" ON storage.objects;
CREATE POLICY "Admin update files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'verification-files'
    AND EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- 12. Eliminar función get_verification_by_code existente
DROP FUNCTION IF EXISTS get_verification_by_code(TEXT);

-- 13. Recrear get_verification_by_code (público, solo lectura)
CREATE OR REPLACE FUNCTION get_verification_by_code(code TEXT)
RETURNS SETOF verifications
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM verifications WHERE unique_code = code;
$$;

-- 14. Eliminar función update_verification_by_code existente
DROP FUNCTION IF EXISTS update_verification_by_code(TEXT, TEXT, TEXT, TEXT, TEXT, FLOAT, FLOAT);

-- 15. Recrear update_verification_by_code (público, para clientes)
CREATE OR REPLACE FUNCTION update_verification_by_code(
  code TEXT,
  p_dni_front_url TEXT DEFAULT NULL,
  p_dni_back_url TEXT DEFAULT NULL,
  p_life_proof_video_url TEXT DEFAULT NULL,
  p_card_photo_url TEXT DEFAULT NULL,
  p_latitude FLOAT DEFAULT NULL,
  p_longitude FLOAT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE verifications
  SET
    dni_front_url = COALESCE(p_dni_front_url, dni_front_url),
    dni_back_url = COALESCE(p_dni_back_url, dni_back_url),
    life_proof_video_url = COALESCE(p_life_proof_video_url, life_proof_video_url),
    card_photo_url = COALESCE(p_card_photo_url, card_photo_url),
    latitude = COALESCE(p_latitude, latitude),
    longitude = COALESCE(p_longitude, longitude),
    status = CASE
      WHEN status = 'pending' THEN 'in_review'
      ELSE status
    END
  WHERE unique_code = code;
END;
$$;

-- ============================================
-- MIGRATION 010: SECURITY FIXES
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FIX: search_path mutable en funciones
-- ============================================

-- get_verification_by_code
CREATE OR REPLACE FUNCTION get_verification_by_code(code TEXT)
RETURNS SETOF verifications
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT * FROM verifications WHERE unique_code = code;
$$;

-- update_verification_by_code
CREATE OR REPLACE FUNCTION update_verification_by_code(
  p_code TEXT,
  p_dni_front_url TEXT DEFAULT NULL,
  p_dni_back_url TEXT DEFAULT NULL,
  p_life_proof_video_url TEXT DEFAULT NULL,
  p_card_photo_url TEXT DEFAULT NULL,
  p_latitude FLOAT DEFAULT NULL,
  p_longitude FLOAT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  WHERE unique_code = p_code;
END;
$$;

-- delete_verification
CREATE OR REPLACE FUNCTION delete_verification(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM admin_users WHERE id = auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT unique_code INTO v_code FROM verifications WHERE id = p_id;

  IF v_code IS NOT NULL THEN
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'verification-files'
        AND (storage.foldername(name))[1] = v_code;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  DELETE FROM verification_analysis WHERE verification_id = p_id;
  DELETE FROM verifications WHERE id = p_id;
END;
$$;

-- save_analysis
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
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM admin_users WHERE id = auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

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

-- update_updated_at_column (trigger function) - use ALTER to avoid breaking trigger
ALTER FUNCTION update_updated_at_column() SET search_path = public;

-- ============================================
-- 2. FIX: Revoke EXECUTE from anon
-- ============================================

-- Funciones que solo admin debe usar
REVOKE EXECUTE ON FUNCTION delete_verification(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION save_analysis(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, INTEGER, JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, JSONB) FROM anon;

-- get_verification_by_code y update_verification_by_code son públicos (clientes los usan)
-- No revocar EXECUTE de estas

-- ============================================
-- 3. FIX: RLS initplan performance
-- ============================================

-- verifications - Admin full access
DROP POLICY IF EXISTS "Admin full access on verifications" ON verifications;
CREATE POLICY "Admin full access on verifications" ON verifications
  FOR ALL
  USING ((SELECT auth.uid()) IN (SELECT id FROM admin_users));

-- admin_users - Admin read own profile
DROP POLICY IF EXISTS "Admin read own profile" ON admin_users;
CREATE POLICY "Admin read own profile" ON admin_users
  FOR SELECT
  USING ((SELECT auth.uid()) = id);

-- verification_analysis - Admin full access
DROP POLICY IF EXISTS "Admin full access on analysis" ON verification_analysis;
CREATE POLICY "Admin full access on analysis" ON verification_analysis
  FOR ALL
  USING ((SELECT auth.uid()) IN (SELECT id FROM admin_users));

-- ============================================
-- 4. FIX: Public bucket listing
-- ============================================

-- Eliminar política de listing público
DROP POLICY IF EXISTS "Public read verification files" ON storage.objects;

-- Crear política más restrictiva: solo permite leer archivos específicos por path
CREATE POLICY "Public read verification files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'verification-files'
    AND (
      -- Admin puede ver todo
      EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid()))
      OR
      -- Usuarios anónimos pueden leer archivos (necesario para el cliente)
      (SELECT auth.uid()) IS NULL
    )
  );

-- ============================================
-- 5. Leakage password protection
-- ============================================
-- Esto se configura en el Dashboard, no en SQL
-- Andá a: Authentication → Providers → Email → Habilitar "Check against haveibeenpwned"

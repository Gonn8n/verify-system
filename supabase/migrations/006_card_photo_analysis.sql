-- ============================================
-- VERIFY SYSTEM - Migración: Análisis de tarjeta
-- ============================================

-- Agregar columnas para análisis de tarjeta
ALTER TABLE verification_analysis
  ADD COLUMN IF NOT EXISTS card_photo_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_photo_findings jsonb DEFAULT '[]'::jsonb;

-- Actualizar la función save_analysis para incluir tarjeta
CREATE OR REPLACE FUNCTION save_analysis(
  p_verification_id UUID,
  p_extracted_name TEXT DEFAULT '',
  p_extracted_dni TEXT DEFAULT '',
  p_extracted_birth_date TEXT DEFAULT '',
  p_dni_front_score INTEGER DEFAULT 0,
  p_dni_back_score INTEGER DEFAULT 0,
  p_dni_front_findings jsonb DEFAULT '[]'::jsonb,
  p_dni_back_findings jsonb DEFAULT '[]'::jsonb,
  p_card_photo_score INTEGER DEFAULT 0,
  p_card_photo_findings jsonb DEFAULT '[]'::jsonb,
  p_overall_score INTEGER DEFAULT 0,
  p_fraud_signals jsonb DEFAULT '[]'::jsonb,
  p_data_match jsonb DEFAULT '{}'::jsonb,
  p_data_consistency jsonb DEFAULT '{}'::jsonb,
  p_summary jsonb DEFAULT '[]'::jsonb,
  p_recommendation TEXT DEFAULT 'low_risk',
  p_raw_response jsonb DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO verification_analysis (
    verification_id, extracted_name, extracted_dni, extracted_birth_date,
    dni_front_score, dni_back_score, dni_front_findings, dni_back_findings,
    card_photo_score, card_photo_findings,
    overall_score, fraud_signals, data_match, data_consistency,
    summary, recommendation, raw_response, analyzed_at
  ) VALUES (
    p_verification_id, p_extracted_name, p_extracted_dni, p_extracted_birth_date,
    p_dni_front_score, p_dni_back_score, p_dni_front_findings, p_dni_back_findings,
    p_card_photo_score, p_card_photo_findings,
    p_overall_score, p_fraud_signals, p_data_match, p_data_consistency,
    p_summary, p_recommendation, p_raw_response, NOW()
  )
  ON CONFLICT (verification_id) DO UPDATE SET
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
    analyzed_at = NOW();
END;
$$;

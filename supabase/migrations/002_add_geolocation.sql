-- ============================================
-- VERIFY SYSTEM - Migración: Geolocalización
-- ============================================

-- Agregar columnas de ubicación
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- Actualizar la función get_verification_by_code para incluir ubicación
CREATE OR REPLACE FUNCTION get_verification_by_code(code TEXT)
RETURNS TABLE (
  id UUID,
  unique_code TEXT,
  first_name TEXT,
  last_name TEXT,
  dni TEXT,
  email TEXT,
  phone TEXT,
  card_last_four TEXT,
  status TEXT,
  dni_front_url TEXT,
  dni_back_url TEXT,
  life_proof_video_url TEXT,
  card_photo_url TEXT,
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.unique_code, v.first_name, v.last_name, v.dni,
         v.email, v.phone, v.card_last_four, v.status,
         v.dni_front_url, v.dni_back_url, v.life_proof_video_url,
         v.card_photo_url, v.latitude, v.longitude, v.created_at
  FROM verifications v
  WHERE v.unique_code = code;
END;
$$;

-- Actualizar la función update_verification_by_code para incluir ubicación
DROP FUNCTION IF EXISTS update_verification_by_code(text,text,text,text,text);

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
AS $$
BEGIN
  UPDATE verifications
  SET dni_front_url = COALESCE(p_dni_front_url, dni_front_url),
      dni_back_url = COALESCE(p_dni_back_url, dni_back_url),
      life_proof_video_url = COALESCE(p_life_proof_video_url, life_proof_video_url),
      card_photo_url = COALESCE(p_card_photo_url, card_photo_url),
      latitude = COALESCE(p_latitude, latitude),
      longitude = COALESCE(p_longitude, longitude),
      updated_at = NOW()
  WHERE unique_code = p_code;
END;
$$;

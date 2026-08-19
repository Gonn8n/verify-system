-- ============================================
-- VERIFY SYSTEM - Migración: Auto-status in_review
-- ============================================

-- Actualizar la función para que cambie status a 'in_review' cuando el cliente sube archivos
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
      -- Auto-cambiar a 'in_review' cuando el cliente sube archivos y el status sigue en 'pending'
      status = CASE
        WHEN status = 'pending' AND (
          p_dni_front_url IS NOT NULL OR
          p_dni_back_url IS NOT NULL OR
          p_life_proof_video_url IS NOT NULL OR
          p_card_photo_url IS NOT NULL
        ) THEN 'in_review'
        ELSE status
      END,
      updated_at = NOW()
  WHERE unique_code = p_code;
END;
$$;

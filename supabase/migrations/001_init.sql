-- ============================================
-- VERIFY SYSTEM - Migración inicial
-- ============================================

-- Tabla principal de verificaciones
CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  card_last_four TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  dni_front_url TEXT,
  dni_back_url TEXT,
  life_proof_video_url TEXT,
  card_photo_url TEXT,
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de admins (vinculada a auth.users)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL
);

-- Índices
CREATE INDEX idx_verifications_unique_code ON verifications(unique_code);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_email ON verifications(email);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin puede hacer todo con verificaciones
CREATE POLICY "Admin full access on verifications"
  ON verifications
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

-- Admin puede leer su propia info
CREATE POLICY "Admin read own profile"
  ON admin_users
  FOR SELECT
  USING (admin_users.id = auth.uid());

-- Cliente puede leer su propia verificación por unique_code (sin auth)
-- Esto se maneja con una Edge Function o función RPC
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

-- Función para que el cliente actualice su verificación (sin login)
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

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Bucket para archivos de verificación (DNI, videos, tarjetas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-files', 'verification-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Admin puede subir archivos
CREATE POLICY "Admin upload files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-files'
    AND EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

-- Policy: Admin puede leer todos los archivos
CREATE POLICY "Admin read all files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'verification-files'
    AND EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

-- Policy: Anyone can upload (para el cliente subir sus documentos)
CREATE POLICY "Public upload verification files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'verification-files');

-- Policy: Anyone can read (para acceder a los archivos subidos)
CREATE POLICY "Public read verification files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'verification-files');

-- ============================================
-- DATOS INICIALES (opcional - agregar admin)
-- ============================================

-- NOTA: Después de crear tu usuario en Supabase Auth,
-- ejecutá este INSERT con tu UUID de usuario:
-- INSERT INTO admin_users (id, email) VALUES ('tu-uuid-aqui', 'tu@email.com');

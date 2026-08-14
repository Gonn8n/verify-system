// ============================================
// VERIFY SYSTEM - Configuración Supabase
// ============================================
// IMPORTANTE: Reemplazá estos valores con los de tu proyecto Supabase
// Dashboard: https://supabase.com/dashboard/project/ceogbuepvunwyavltcgu

const SUPABASE_CONFIG = {
  // Tu URL de proyecto Supabase
  url: 'https://ceogbuepvunwyavltcgu.supabase.co',
  
  // Anon Key (pública, segura para frontend)
  anonKey: 'TU_SUPABASE_ANON_KEY_AQUI',
  
  // Dominio del sitio (para generar links)
  domain: 'https://verify.maxihogar.com',
  
  // Nombre del ecommerce (aparece en emails y UI)
  commerceName: 'Verify',
  
  // Bucket de Storage
  storageBucket: 'verification-files'
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}

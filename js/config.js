// ============================================
// VERIFY SYSTEM - Configuración Supabase
// ============================================
// IMPORTANTE: Reemplazá estos valores con los de tu proyecto Supabase
// Dashboard: https://supabase.com/dashboard/project/ceogbuepvunwyavltcgu

const SUPABASE_CONFIG = {
  // Tu URL de proyecto Supabase
  url: 'https://ceogbuepvunwyavltcgu.supabase.co',
  
  // Anon Key (pública, segura para frontend)
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlb2didWVwdnVud3lhdmx0Y2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NTE1MzIsImV4cCI6MjEwMDMyNzUzMn0.WIlndQsajKccJr4CIfU2SDAe7adtI6wSVTaOmditL-g',
  
  // Dominio del sitio (para generar links)
  domain: 'https://check.maxihogar.com',
  
  // Nombre del ecommerce (aparece en emails y UI)
  commerceName: 'Check Maxihogar',
  
  // Bucket de Storage
  storageBucket: 'verification-files'
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}

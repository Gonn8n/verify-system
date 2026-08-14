// ============================================
// VERIFY SYSTEM - Autenticación
// ============================================

const { createClient } = supabase;

// Inicializar Supabase
const supabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');
const eyeOffIcon = document.getElementById('eyeOffIcon');
const errorMessage = document.getElementById('errorMessage');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');

// Toggle password visibility
togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  eyeIcon.classList.toggle('hidden', isPassword);
  eyeOffIcon.classList.toggle('hidden', !isPassword);
});

// Mostrar error
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

// Ocultar error
function hideError() {
  errorMessage.classList.remove('show');
}

// Loading state
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.classList.toggle('hidden', loading);
  btnSpinner.classList.toggle('hidden', !loading);
}

// Verificar si ya hay sesión activa
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    // Verificar que sea admin
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .single();
    
    if (adminUser) {
      window.location.href = 'admin/index.html';
    }
  }
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    // 1. Login con Supabase Auth
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    // 2. Verificar que sea admin
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (adminError || !adminUser) {
      // No es admin, cerrar sesión
      await supabaseClient.auth.signOut();
      throw new Error('No tenés permisos de administrador');
    }

    // 3. Redirigir al panel
    window.location.href = 'admin/index.html';

  } catch (error) {
    console.error('Login error:', error);
    
    // Mensajes de error en español
    let msg = 'Error al iniciar sesión';
    if (error.message.includes('Invalid login credentials')) {
      msg = 'Email o contraseña incorrectos';
    } else if (error.message.includes('permisos')) {
      msg = error.message;
    } else if (error.message.includes('Email not confirmed')) {
      msg = 'Confirmá tu email antes de continuar';
    }
    
    showError(msg);
  } finally {
    setLoading(false);
  }
});

// Iniciar
checkSession();

// ============================================
// VERIFY SYSTEM - Flujo del Cliente
// ============================================

const { createClient } = supabase;

// Inicializar Supabase
const supabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

// Estado
let verificationData = null;
let currentStep = 2;
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let userLocation = null;

// Constantes
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/webm', 'video/mp4'];

// Archivos subidos
let files = {
  dniFront: null,
  dniBack: null,
  lifeProofVideo: null,
  cardPhoto: null
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================

let toastTimeout = null;

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const colors = {
    info: { bg: '#1F2937', color: '#fff' },
    error: { bg: '#DC2626', color: '#fff' },
    success: { bg: '#10B981', color: '#fff' }
  };
  const c = colors[type] || colors.info;
  toast.style.cssText = `background:${c.bg};color:${c.color};padding:12px 20px;border-radius:12px;font-size:0.9rem;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,0.15);opacity:0;transition:opacity 0.3s ease;pointer-events:auto;max-width:90vw;text-align:center;`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => { toast.style.opacity = '1'; });

  // Duración dinámica: 3s mensajes cortos, 5s mensajes largos
  const duration = message.length > 50 ? 5000 : 3000;
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================
// VALIDACIÓN DE ARCHIVOS
// ============================================

function validateFile(file, allowedTypes) {
  if (!file) return { valid: false, error: 'No se seleccionó ningún archivo' };
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. El máximo es 10MB` };
  }
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Formato de archivo no válido' };
  }
  return { valid: true };
}

// ============================================
// INICIALIZACIÓN
// ============================================

async function init() {
  // Obtener código de la URL
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) {
    showError('No se proporcionó un código de verificación válido');
    return;
  }

  // Buscar verificación
  const { data, error } = await supabaseClient
    .rpc('get_verification_by_code', { code: code });

  if (error || !data || data.length === 0) {
    showError('Verificación no encontrada o código inválido');
    return;
  }

  verificationData = data[0];

  // Verificar si ya completó
  if (verificationData.status === 'approved' || verificationData.status === 'rejected') {
    showCompletedMessage();
    return;
  }

  // Verificar si ya subió todo
  if (verificationData.dni_front_url && verificationData.dni_back_url && 
      verificationData.life_proof_video_url && verificationData.card_photo_url) {
    showCompletedMessage();
    return;
  }

  // Actualizar UI
  document.getElementById('operationCode').textContent = '#' + verificationData.unique_code;
  document.getElementById('commerceName').textContent = SUPABASE_CONFIG.commerceName;

  // Restaurar progreso guardado
  const savedStep = sessionStorage.getItem(`verify_step_${verificationData.unique_code}`);
  if (savedStep && parseInt(savedStep) >= 2) {
    showStep(parseInt(savedStep));
    return;
  }

  // Detectar si es mobile
  if (!isMobile()) {
    showStep(3);
    generateQR();
  } else {
    showStep(2);
  }
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function showError(message) {
  document.querySelector('.verify-content').innerHTML = `
    <div class="step-container active">
      <div class="intro-card text-center">
        <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
        <h2>Error</h2>
        <p>${message}</p>
      </div>
    </div>
  `;
}

function showCompletedMessage() {
  const statusConfig = {
    pending: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
      bg: '#FEF3C7',
      color: '#F59E0B',
      title: 'Validación en proceso.',
      msg: 'Estamos revisando la información que nos proporcionaste, quedate atento que recibirás un email con el resultado en las próximas horas.'
    },
    in_review: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
      bg: '#DBEAFE',
      color: '#3B82F6',
      title: 'Validación en revisión.',
      msg: 'Tu información está siendo revisada por nuestro equipo. Recibirás un email con el resultado pronto.'
    },
    approved: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      bg: '#D1FAE5',
      color: '#10B981',
      title: '¡Compra aprobada!',
      msg: 'Tu verificación fue aprobada exitosamente. Gracias por completar el proceso.'
    },
    rejected: {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      bg: '#FEE2E2',
      color: '#EF4444',
      title: 'Compra rechazada.',
      msg: 'Lamentablemente no pudimos verificar tu identidad. Si creés que es un error, contactá al soporte del comercio.'
    }
  };

  const s = statusConfig[verificationData.status] || statusConfig.pending;

  document.querySelector('.verify-content').innerHTML = `
    <div class="step-container active">
      <div class="intro-card">
        <div class="success-container">
          <div class="success-icon-large" style="background: ${s.bg};">
            <svg viewBox="0 0 24 24" fill="none" stroke="${s.color}" stroke-width="2" style="width:50px;height:50px;">
              ${s.icon}
            </svg>
          </div>
          <h1>${s.title}</h1>
          <p>${s.msg}</p>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// NAVEGACIÓN ENTRE PASOS
// ============================================

function showStep(step) {
  document.querySelectorAll('.step-container').forEach(el => el.classList.remove('active'));
  const stepEl = document.getElementById(`step${step}`);
  if (stepEl) {
    stepEl.classList.add('active');
    currentStep = step;
    // Persistir progreso
    const code = verificationData?.unique_code;
    if (code) {
      sessionStorage.setItem(`verify_step_${code}`, step);
    }
  }
}

// ============================================
// QR CODE
// ============================================

function generateQR() {
  const code = verificationData.unique_code;
  const url = `${SUPABASE_CONFIG.domain}/v/?code=${code}`;
  
  // Usar API de QR code simple
  const qrContainer = document.getElementById('qrCode');
  if (qrContainer) {
    qrContainer.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 12px; display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" alt="QR Code">
      </div>
      <p style="margin-top: 12px; font-size: 0.8rem; color: var(--color-text-secondary);">Escaneá el QR y seguí desde tu celular</p>
    `;
  }
}

// ============================================
// STEP 2: INICIO
// ============================================

document.getElementById('startBtn')?.addEventListener('click', () => {
  if (isMobile()) {
    showStep(4);
    requestPermissions();
  } else {
    showStep(3);
    generateQR();
  }
});

document.getElementById('continueOnMobileBtn')?.addEventListener('click', () => {
  showStep(4);
  requestPermissions();
});

// ============================================
// PERMISOS DE CÁMARA
// ============================================

async function requestPermissions() {
  // Solo pedir geolocalización, no cámara (se pide cuando se necesita)
  requestGeolocation();
}

function requestGeolocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    },
    (err) => {
      console.log('Geolocation not available or denied:', err.message);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

// ============================================
// STEP 4: DNI FRENTE
// ============================================

const dniFrontArea = document.getElementById('dniFrontArea');
const dniFrontInput = document.getElementById('dniFrontInput');
const dniFrontPreview = document.getElementById('dniFrontPreview');
const dniFrontUploadBtn = document.getElementById('dniFrontUploadBtn');
const dniFrontCaptureBtn = document.getElementById('dniFrontCaptureBtn');

dniFrontArea?.addEventListener('click', () => {
  dniFrontInput.removeAttribute('capture');
  dniFrontInput.click();
});
dniFrontUploadBtn?.addEventListener('click', () => {
  dniFrontInput.removeAttribute('capture');
  dniFrontInput.click();
});
dniFrontCaptureBtn?.addEventListener('click', () => {
  dniFrontInput.setAttribute('capture', 'environment');
  dniFrontInput.click();
});

dniFrontInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const validation = validateFile(file, ALLOWED_IMAGE_TYPES);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    e.target.value = '';
    return;
  }
  files.dniFront = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    dniFrontPreview.src = ev.target.result;
    dniFrontPreview.classList.add('show');
    dniFrontArea.classList.add('has-file');
  };
  reader.readAsDataURL(file);
  // Resetear input para poder re-seleccionar el mismo archivo
  e.target.value = '';
});

document.getElementById('nextDniFrontBtn')?.addEventListener('click', () => {
  if (!files.dniFront) {
    showToast('Subí una foto del frente de tu DNI', 'error');
    return;
  }
  showStep(5);
});

document.getElementById('backDniFrontBtn')?.addEventListener('click', () => {
  showStep(2);
});

// ============================================
// STEP 5: DNI DORSO
// ============================================

const dniBackArea = document.getElementById('dniBackArea');
const dniBackInput = document.getElementById('dniBackInput');
const dniBackPreview = document.getElementById('dniBackPreview');
const dniBackUploadBtn = document.getElementById('dniBackUploadBtn');
const dniBackCaptureBtn = document.getElementById('dniBackCaptureBtn');

dniBackArea?.addEventListener('click', () => {
  dniBackInput.removeAttribute('capture');
  dniBackInput.click();
});
dniBackUploadBtn?.addEventListener('click', () => {
  dniBackInput.removeAttribute('capture');
  dniBackInput.click();
});
dniBackCaptureBtn?.addEventListener('click', () => {
  dniBackInput.setAttribute('capture', 'environment');
  dniBackInput.click();
});

dniBackInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const validation = validateFile(file, ALLOWED_IMAGE_TYPES);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    e.target.value = '';
    return;
  }
  files.dniBack = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    dniBackPreview.src = ev.target.result;
    dniBackPreview.classList.add('show');
    dniBackArea.classList.add('has-file');
  };
  reader.readAsDataURL(file);
  // Resetear input para poder re-seleccionar el mismo archivo
  e.target.value = '';
});

document.getElementById('nextDniBackBtn')?.addEventListener('click', () => {
  if (!files.dniBack) {
    showToast('Subí una foto del dorso de tu DNI', 'error');
    return;
  }
  showStep(6);
});

document.getElementById('backDniBackBtn')?.addEventListener('click', () => {
  showStep(4);
});

// ============================================
// STEP 6: VIDEO INTRO
// ============================================

document.getElementById('nextVideoIntroBtn')?.addEventListener('click', () => {
  showStep(7);
});

document.getElementById('backVideoIntroBtn')?.addEventListener('click', () => {
  showStep(5);
});

// ============================================
// STEP 7: PERMISOS
// ============================================

document.getElementById('okPermissionsBtn')?.addEventListener('click', async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user' },
      audio: true 
    });
    
    const preview = document.getElementById('cameraPreview');
    preview.srcObject = mediaStream;
    preview.classList.add('active');
    
    // Pedir geolocalización junto con cámara
    requestGeolocation();
    
    showStep(8);
  } catch (err) {
    console.error('Camera error:', err);
    showToast('No se pudo acceder a la cámara. Verificá los permisos del navegador.', 'error');
  }
});

// ============================================
// STEP 8: GRABAR VIDEO
// ============================================

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const recordingIndicator = document.getElementById('recordingIndicator');
const videoPreview = document.getElementById('videoPreview');
let recordingTimer = null;
let recordingSeconds = 0;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

recordBtn?.addEventListener('click', () => {
  if (!mediaStream) return;

  recordedChunks = [];
  
  const options = { mimeType: 'video/webm;codecs=vp9,opus' };
  try {
    mediaRecorder = new MediaRecorder(mediaStream, options);
  } catch (e) {
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
  }

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
    files.lifeProofVideo = recordedBlob;
    
    // Mostrar preview
    const url = URL.createObjectURL(recordedBlob);
    videoPreview.src = url;
    videoPreview.classList.add('show');
    
    // Detener cámara
    stopCamera();
  };

  mediaRecorder.start();
  
  // Iniciar timer
  recordingSeconds = 0;
  const timerEl = document.getElementById('recordingTimer');
  if (timerEl) timerEl.textContent = '00:00';
  recordingTimer = setInterval(() => {
    recordingSeconds++;
    if (timerEl) timerEl.textContent = formatTime(recordingSeconds);
  }, 1000);
  
  // UI
  recordBtn.classList.add('recording');
  stopBtn.classList.add('show');
  recordingIndicator.classList.add('show');
});

stopBtn?.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  
  // Detener timer
  clearInterval(recordingTimer);
  recordingTimer = null;
  
  // UI
  recordBtn.classList.remove('recording');
  stopBtn.classList.remove('show');
  recordingIndicator.classList.remove('show');
});

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

document.getElementById('nextRecordBtn')?.addEventListener('click', () => {
  if (!files.lifeProofVideo) {
    showToast('Grabá un video de prueba de vida', 'error');
    return;
  }
  showStep(9);
});

document.getElementById('backRecordBtn')?.addEventListener('click', () => {
  stopCamera();
  showStep(7);
});

// ============================================
// STEP 9: FOTO TARJETA
// ============================================

async function reopenCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' },
      audio: false 
    });
  } catch (err) {
    console.error('Camera error:', err);
  }
}

const cardArea = document.getElementById('cardArea');
const cardInput = document.getElementById('cardInput');
const cardPreview = document.getElementById('cardPreview');
const cardCaptureBtn = document.getElementById('cardCaptureBtn');

cardArea?.addEventListener('click', () => {
  cardInput.removeAttribute('capture');
  cardInput.click();
});
cardCaptureBtn?.addEventListener('click', () => {
  cardInput.setAttribute('capture', 'environment');
  cardInput.click();
});

cardInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const validation = validateFile(file, ALLOWED_IMAGE_TYPES);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    e.target.value = '';
    return;
  }
  files.cardPhoto = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    cardPreview.src = ev.target.result;
    cardPreview.classList.add('show');
    cardArea.classList.add('has-file');
  };
  reader.readAsDataURL(file);
  // Resetear input para poder re-seleccionar el mismo archivo
  e.target.value = '';
});

document.getElementById('nextCardBtn')?.addEventListener('click', async () => {
  if (!files.cardPhoto) {
    showToast('Subí una foto de tu tarjeta', 'error');
    return;
  }
  
  // Cerrar cámara antes de subir
  stopCamera();
  
  // Subir todos los archivos
  await uploadFiles();
  showStep(10);
});

document.getElementById('backCardBtn')?.addEventListener('click', () => {
  stopCamera();
  showStep(8);
  // Reabrir cámara de video
  reopenCameraForVideo();
});

async function reopenCameraForVideo() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user' },
      audio: true 
    });
    const preview = document.getElementById('cameraPreview');
    preview.srcObject = mediaStream;
    preview.classList.add('active');
  } catch (err) {
    console.error('Camera error:', err);
  }
}

// ============================================
// SUBIR ARCHIVOS
// ============================================

async function uploadFiles() {
  const code = verificationData.unique_code;

  // Mostrar feedback de carga
  showToast('Subiendo archivos...', 'info');

  // Subir todos los archivos en paralelo
  const uploads = [];
  if (files.dniFront) uploads.push(uploadFile(files.dniFront, `${code}/dni-front.jpg`));
  if (files.dniBack) uploads.push(uploadFile(files.dniBack, `${code}/dni-back.jpg`));
  if (files.lifeProofVideo) uploads.push(uploadFile(files.lifeProofVideo, `${code}/life-proof.webm`));
  if (files.cardPhoto) uploads.push(uploadFile(files.cardPhoto, `${code}/card-photo.jpg`));

  const results = await Promise.all(uploads);

  // Mapear resultados
  let i = 0;
  const dniFrontUrl = files.dniFront ? results[i++] : null;
  const dniBackUrl = files.dniBack ? results[i++] : null;
  const videoUrl = files.lifeProofVideo ? results[i++] : null;
  const cardUrl = files.cardPhoto ? results[i++] : null;

  // Usar la función segura para actualizar el registro (sin login)
  const { data, error } = await supabaseClient
    .rpc('update_verification_by_code', {
      p_code: code,
      p_dni_front_url: dniFrontUrl,
      p_dni_back_url: dniBackUrl,
      p_life_proof_video_url: videoUrl,
      p_card_photo_url: cardUrl,
      p_latitude: userLocation?.latitude || null,
      p_longitude: userLocation?.longitude || null
    });

  if (error) {
    console.error('Error updating verification:', error);
    showToast('Error al guardar. Intentá de nuevo.', 'error');
  }
}

async function uploadFile(file, path) {
  try {
    const { data, error } = await supabaseClient.storage
      .from(SUPABASE_CONFIG.storageBucket)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Obtener URL pública
    const { data: urlData } = supabaseClient.storage
      .from(SUPABASE_CONFIG.storageBucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

// ============================================
// INICIAR
// ============================================

init();

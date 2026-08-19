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

// Archivos subidos
let files = {
  dniFront: null,
  dniBack: null,
  lifeProofVideo: null,
  cardPhoto: null
};

// ============================================
// HELPERS DE UI
// ============================================

const STEP_META = {
  2:  { label: 'Introducción', index: 0 },
  3:  { label: 'Celular',       index: 1 },
  4:  { label: 'DNI frente',    index: 2 },
  5:  { label: 'DNI dorso',     index: 3 },
  6:  { label: 'Video',         index: 4 },
  7:  { label: 'Permisos',      index: 5 },
  8:  { label: 'Grabación',     index: 6 },
  9:  { label: 'Tarjeta',       index: 7 },
  10: { label: 'Finalización',  index: 8 }
};

const TOTAL_STEPS = 8;

// Error inline bajo un elemento (reemplaza alert())
function showFieldError(areaEl, message) {
  clearFieldError(areaEl);
  const err = document.createElement('div');
  err.className = 'field-error';
  err.setAttribute('role', 'alert');
  err.innerHTML = `
    <svg class="icon" aria-hidden="true"><use href="#i-alert-circle"/></svg>
    <span>${message}</span>
  `;
  areaEl.classList.add('is-invalid');
  areaEl.after(err);
  err.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearFieldError(areaEl) {
  if (!areaEl) return;
  areaEl.classList.remove('is-invalid');
  const next = areaEl.nextElementSibling;
  if (next && next.classList && next.classList.contains('field-error')) {
    next.remove();
  }
}

// Error inline a nivel de step (ej: permisos cámara)
function showStepError(errorEl, message) {
  if (!errorEl) return;
  errorEl.querySelector('span').textContent = message;
  errorEl.classList.add('show');
}

function clearStepError(errorEl) {
  if (errorEl) errorEl.classList.remove('show');
}

// Stepper de progreso global
function updateProgress(step) {
  const meta = STEP_META[step];
  if (!meta) return;

  const stepper = document.getElementById('stepper');
  if (!stepper) return;

  // Ocultar en el paso de transición (QR) y en la finalización
  if (step === 3 || step === 10) {
    stepper.classList.add('hidden');
    return;
  }

  stepper.classList.remove('hidden');
  document.getElementById('stepperCount').textContent = `Paso ${meta.index + 1} de ${TOTAL_STEPS}`;
  document.getElementById('stepperLabel').textContent = meta.label;
  document.getElementById('stepperFill').style.width = (meta.index / TOTAL_STEPS * 100) + '%';
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
        <div class="status-icon status-icon-error">
          <svg class="icon" aria-hidden="true"><use href="#i-alert-circle"/></svg>
        </div>
        <h2>Error</h2>
        <p>${message}</p>
      </div>
    </div>
  `;
}

function showCompletedMessage() {
  const status = verificationData ? verificationData.status : '';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  let icon, iconClass, title, body;

  if (isApproved) {
    icon = 'i-check-circle';
    iconClass = 'status-icon-success';
    title = 'Verificación aprobada';
    body = 'Tu identidad fue verificada correctamente. ¡Tu compra está aprobada!';
  } else if (isRejected) {
    icon = 'i-x-circle';
    iconClass = 'status-icon-error';
    title = 'Verificación rechazada';
    body = 'No pudimos verificar tu identidad. Por favor, contactá al comercio para más información.';
  } else {
    icon = 'i-check-circle';
    iconClass = 'status-icon-success';
    title = 'Solicitud enviada con éxito';
    body = 'Estamos revisando la información que nos proporcionaste, quedate atento que recibirás un email con el resultado en las próximas horas.';
  }

  const badgeHtml = (!isApproved && !isRejected)
    ? `<span class="badge badge-pending">Estado: En revisión</span>`
    : '';

  document.querySelector('.verify-content').innerHTML = `
    <div class="step-container active">
      <div class="intro-card">
        <div class="success-container">
          <div class="status-icon ${iconClass}">
            <svg class="icon" aria-hidden="true"><use href="#${icon}"/></svg>
          </div>
          <h1>${title}</h1>
          <p>${body}</p>
          ${badgeHtml}
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
    updateProgress(step);
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
      <div class="qr-frame">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" alt="QR Code">
      </div>
      <p class="caption mt-3">Escaneá el QR y seguí desde tu celular</p>
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
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' },
      audio: false 
    });
    // No mostramos el preview aquí, solo pedimos permiso
  } catch (err) {
    console.error('Permission error:', err);
    // Si falla, igual permitimos subir archivo
  }
}

// ============================================
// STEP 4: DNI FRENTE
// ============================================

const dniFrontArea = document.getElementById('dniFrontArea');
const dniFrontInput = document.getElementById('dniFrontInput');
const dniFrontPreview = document.getElementById('dniFrontPreview');
const dniFrontUploadBtn = document.getElementById('dniFrontUploadBtn');
const dniFrontCaptureBtn = document.getElementById('dniFrontCaptureBtn');

dniFrontArea?.addEventListener('click', () => dniFrontInput.click());
dniFrontUploadBtn?.addEventListener('click', () => dniFrontInput.click());
dniFrontCaptureBtn?.addEventListener('click', () => {
  dniFrontInput.removeAttribute('capture');
  dniFrontInput.click();
});

dniFrontInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    files.dniFront = file;
    clearFieldError(dniFrontArea);
    const reader = new FileReader();
    reader.onload = (e) => {
      dniFrontPreview.src = e.target.result;
      dniFrontPreview.classList.add('show');
      dniFrontArea.classList.add('has-file');
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('nextDniFrontBtn')?.addEventListener('click', () => {
  if (!files.dniFront) {
    showFieldError(dniFrontArea, 'Por favor, subí una foto del frente de tu DNI');
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

dniBackArea?.addEventListener('click', () => dniBackInput.click());
dniBackUploadBtn?.addEventListener('click', () => dniBackInput.click());
dniBackCaptureBtn?.addEventListener('click', () => {
  dniBackInput.removeAttribute('capture');
  dniBackInput.click();
});

dniBackInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    files.dniBack = file;
    clearFieldError(dniBackArea);
    const reader = new FileReader();
    reader.onload = (e) => {
      dniBackPreview.src = e.target.result;
      dniBackPreview.classList.add('show');
      dniBackArea.classList.add('has-file');
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('nextDniBackBtn')?.addEventListener('click', () => {
  if (!files.dniBack) {
    showFieldError(dniBackArea, 'Por favor, subí una foto del dorso de tu DNI');
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
  clearStepError(document.getElementById('permissionError'));
  try {
    // Intentar obtener cámara frontal para video
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true
    });

    // Mostrar preview
    const preview = document.getElementById('cameraPreview');
    preview.srcObject = mediaStream;
    preview.classList.add('active');

    showStep(8);
  } catch (err) {
    console.error('Camera error:', err);
    showStepError(
      document.getElementById('permissionError'),
      'No se pudo acceder a la cámara. Verificá los permisos del navegador e intentá de nuevo.'
    );
  }
});

// Inyectar el dominio real del sitio en el paso de permisos
(function setSiteDomain() {
  const el = document.getElementById('siteDomain');
  if (el && SUPABASE_CONFIG && SUPABASE_CONFIG.domain) {
    el.textContent = SUPABASE_CONFIG.domain.replace(/^https?:\/\//, '');
  }
})();

// ============================================
// STEP 8: GRABAR VIDEO
// ============================================

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const recordingIndicator = document.getElementById('recordingIndicator');
const videoPreview = document.getElementById('videoPreview');

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
    clearFieldError(videoPreview);

    // Detener cámara
    stopCamera();
  };

  mediaRecorder.start();
  
  // UI
  recordBtn.classList.add('recording');
  stopBtn.classList.add('show');
  recordingIndicator.classList.add('show');
});

stopBtn?.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  
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
    showFieldError(document.getElementById('videoPreview'), 'Por favor, grabá un video de prueba de vida');
    return;
  }
  showStep(9);
  // Reabrir cámara para tomar foto de tarjeta
  reopenCamera();
});

document.getElementById('backRecordBtn')?.addEventListener('click', () => {
  stopCamera();
  showStep(6);
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
const cardUploadBtn = document.getElementById('cardUploadBtn');
const cardCaptureBtn = document.getElementById('cardCaptureBtn');

cardArea?.addEventListener('click', () => cardInput.click());
cardUploadBtn?.addEventListener('click', () => cardInput.click());
cardCaptureBtn?.addEventListener('click', () => {
  cardInput.removeAttribute('capture');
  cardInput.click();
});

cardInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    files.cardPhoto = file;
    clearFieldError(cardArea);
    const reader = new FileReader();
    reader.onload = (e) => {
      cardPreview.src = e.target.result;
      cardPreview.classList.add('show');
      cardArea.classList.add('has-file');
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('nextCardBtn')?.addEventListener('click', async () => {
  if (!files.cardPhoto) {
    showFieldError(cardArea, 'Por favor, subí una foto de tu tarjeta');
    return;
  }
  
  // Subir todos los archivos
  await uploadFiles();
  showStep(10);
});

document.getElementById('backCardBtn')?.addEventListener('click', () => {
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

  // Subir archivos y obtener URLs
  let dniFrontUrl = null;
  let dniBackUrl = null;
  let videoUrl = null;
  let cardUrl = null;

  if (files.dniFront) {
    dniFrontUrl = await uploadFile(files.dniFront, `${code}/dni-front.jpg`);
  }

  if (files.dniBack) {
    dniBackUrl = await uploadFile(files.dniBack, `${code}/dni-back.jpg`);
  }

  if (files.lifeProofVideo) {
    videoUrl = await uploadFile(files.lifeProofVideo, `${code}/life-proof.webm`);
  }

  if (files.cardPhoto) {
    cardUrl = await uploadFile(files.cardPhoto, `${code}/card-photo.jpg`);
  }

  // Usar la función segura para actualizar el registro (sin login)
  const { data, error } = await supabaseClient
    .rpc('update_verification_by_code', {
      p_code: code,
      p_dni_front_url: dniFrontUrl,
      p_dni_back_url: dniBackUrl,
      p_life_proof_video_url: videoUrl,
      p_card_photo_url: cardUrl
    });

  if (error) {
    console.error('Error updating verification:', error);
    const cardStep = document.getElementById('step9');
    if (cardStep) {
      const errEl = cardStep.querySelector('.inline-error');
      if (errEl) {
        errEl.querySelector('span').textContent = 'Error al guardar la verificación. Por favor, intentá de nuevo.';
        errEl.classList.add('show');
        errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
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

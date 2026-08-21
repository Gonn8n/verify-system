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

// Archivos subidos
let files = {
  dniFront: null,
  dniBack: null,
  lifeProofVideo: null,
  cardPhoto: null
};

// Marcadores de archivos ya subidos a Supabase
let uploaded = {
  dniFront: false,
  dniBack: false,
  lifeProofVideo: false,
  cardPhoto: false
};

// ============================================
// GEOLOCALIZACIÓN
// ============================================

function requestLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => { userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
    () => { userLocation = null; },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
  );
}

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

// Error inline bajo un elemento
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

// Error inline a nivel de step
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

  if (step === 3 || step === 10) {
    stepper.classList.add('hidden');
    return;
  }

  stepper.classList.remove('hidden');
  document.getElementById('stepperLabel').textContent = meta.label;
  document.getElementById('stepperFill').style.width = (meta.index / TOTAL_STEPS * 100) + '%';
}

// ============================================
// QR TOGGLE & MODAL
// ============================================

function showQRToggle() {
  const btn = document.getElementById('qrToggleBtn');
  if (btn) btn.classList.remove('hidden');
}

function hideQRToggle() {
  const btn = document.getElementById('qrToggleBtn');
  if (btn) btn.classList.add('hidden');
}

function generateQRModal() {
  if (!verificationData) return;
  const code = verificationData.unique_code;
  const url = `${SUPABASE_CONFIG.domain}/v/?code=${code}`;
  const imgContainer = document.getElementById('qrModalImage');
  const urlEl = document.getElementById('qrModalUrl');
  if (imgContainer) {
    imgContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" alt="QR Code">`;
  }
  if (urlEl) {
    urlEl.textContent = url;
  }
}

document.getElementById('qrToggleBtn')?.addEventListener('click', () => {
  generateQRModal();
  document.getElementById('qrModal')?.classList.remove('hidden');
});

document.getElementById('qrModalClose')?.addEventListener('click', () => {
  document.getElementById('qrModal')?.classList.add('hidden');
});

document.getElementById('qrModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'qrModal') {
    e.target.classList.add('hidden');
  }
});

// ============================================
// INICIALIZACIÓN
// ============================================

async function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) {
    showError('No se proporcionó un código de verificación válido');
    return;
  }

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
    // Determinar paso inicial según progreso
    let startStep = 4;

    if (verificationData.dni_front_url) {
      uploaded.dniFront = true;
      startStep = 5;
    }
    if (verificationData.dni_back_url) {
      uploaded.dniBack = true;
      startStep = 6;
    }
    if (verificationData.life_proof_video_url) {
      uploaded.lifeProofVideo = true;
      startStep = 9;
    }

    showStep(startStep);
    showQRToggle();
    requestPermissions();
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

    // Mostrar fotos existentes si ya están subidas
    showExistingFiles(step);
  }
}

function showExistingFiles(step) {
  if (!verificationData) return;

  if (step === 4 && verificationData.dni_front_url) {
    const preview = document.getElementById('dniFrontPreview');
    const area = document.getElementById('dniFrontArea');
    if (preview && area) {
      preview.src = verificationData.dni_front_url;
      preview.classList.add('show');
      area.classList.add('has-file');
    }
  }

  if (step === 5 && verificationData.dni_back_url) {
    const preview = document.getElementById('dniBackPreview');
    const area = document.getElementById('dniBackArea');
    if (preview && area) {
      preview.src = verificationData.dni_back_url;
      preview.classList.add('show');
      area.classList.add('has-file');
    }
  }

  if (step === 9 && verificationData.card_photo_url) {
    const preview = document.getElementById('cardPreview');
    const area = document.getElementById('cardArea');
    if (preview && area) {
      preview.src = verificationData.card_photo_url;
      preview.classList.add('show');
      area.classList.add('has-file');
    }
  }
}

// ============================================
// QR CODE (para desktop)
// ============================================

function generateQR() {
  const code = verificationData.unique_code;
  const url = `${SUPABASE_CONFIG.domain}/v/?code=${code}`;

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
    showQRToggle();
    requestPermissions();
  } else {
    showStep(3);
    generateQR();
  }
});

document.getElementById('continueOnMobileBtn')?.addEventListener('click', () => {
  showStep(4);
  showQRToggle();
  requestPermissions();
});

// ============================================
// PERMISOS DE CÁMARA
// ============================================

async function requestPermissions() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera not available on this device');
      requestLocation();
      return;
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
  } catch (err) {
    console.error('Permission error:', err);
  }
  requestLocation();
}

// ============================================
// UPLOAD HELPERS
// ============================================

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

    const { data: urlData } = supabaseClient.storage
      .from(SUPABASE_CONFIG.storageBucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

async function uploadSingleFile(fileKey, storagePath) {
  const code = verificationData.unique_code;
  if (!files[fileKey] || uploaded[fileKey]) return true;

  const url = await uploadFile(files[fileKey], `${code}/${storagePath}`);
  if (!url) return false;

  // Guardar URL en DB
  const updateField = {};
  if (fileKey === 'dniFront') updateField.dni_front_url = url;
  if (fileKey === 'dniBack') updateField.dni_back_url = url;
  if (fileKey === 'lifeProofVideo') updateField.life_proof_video_url = url;
  if (fileKey === 'cardPhoto') updateField.card_photo_url = url;

  const { error } = await supabaseClient
    .from('verifications')
    .update(updateField)
    .eq('id', verificationData.id);

  if (error) {
    console.error('Error updating verification:', error);
    return false;
  }

  // Actualizar datos locales
  if (fileKey === 'dniFront') verificationData.dni_front_url = url;
  if (fileKey === 'dniBack') verificationData.dni_back_url = url;
  if (fileKey === 'lifeProofVideo') verificationData.life_proof_video_url = url;
  if (fileKey === 'cardPhoto') verificationData.card_photo_url = url;

  uploaded[fileKey] = true;
  return true;
}

// ============================================
// REMOVE BUTTONS (Eliminar y re-subir)
// ============================================

function setupRemoveButton(btnId, fileKey, inputId, previewId, areaId) {
  document.getElementById(btnId)?.addEventListener('click', (e) => {
    e.stopPropagation();
    files[fileKey] = null;
    uploaded[fileKey] = false;
    const preview = document.getElementById(previewId);
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    if (preview) { preview.src = ''; preview.classList.remove('show'); }
    if (area) area.classList.remove('has-file');
    if (input) input.value = '';
  });
}

setupRemoveButton('dniFrontRemove', 'dniFront', 'dniFrontInput', 'dniFrontPreview', 'dniFrontArea');
setupRemoveButton('dniBackRemove', 'dniBack', 'dniBackInput', 'dniBackPreview', 'dniBackArea');
setupRemoveButton('cardRemove', 'cardPhoto', 'cardInput', 'cardPreview', 'cardArea');

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
  dniFrontInput.setAttribute('capture', 'environment');
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

document.getElementById('nextDniFrontBtn')?.addEventListener('click', async () => {
  if (!files.dniFront && !uploaded.dniFront) {
    showFieldError(dniFrontArea, 'Por favor, subí una foto del frente de tu DNI');
    return;
  }
  if (files.dniFront && !uploaded.dniFront) {
    const btn = document.getElementById('nextDniFrontBtn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    const ok = await uploadSingleFile('dniFront', 'dni-front.jpg');
    btn.disabled = false; btn.textContent = 'CONTINUAR';
    if (!ok) { showFieldError(dniFrontArea, 'Error al guardar. Intentá de nuevo.'); return; }
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
  dniBackInput.setAttribute('capture', 'environment');
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

document.getElementById('nextDniBackBtn')?.addEventListener('click', async () => {
  if (!files.dniBack && !uploaded.dniBack) {
    showFieldError(dniBackArea, 'Por favor, subí una foto del dorso de tu DNI');
    return;
  }
  if (files.dniBack && !uploaded.dniBack) {
    const btn = document.getElementById('nextDniBackBtn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    const ok = await uploadSingleFile('dniBack', 'dni-back.jpg');
    btn.disabled = false; btn.textContent = 'CONTINUAR';
    if (!ok) { showFieldError(dniBackArea, 'Error al guardar. Intentá de nuevo.'); return; }
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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showStepError(
        document.getElementById('permissionError'),
        'Tu navegador no tiene acceso a la cámara. Intentá desde tu celular.'
      );
      return;
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true
    });

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

// Inyectar dominio real
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

    const url = URL.createObjectURL(recordedBlob);
    videoPreview.src = url;
    videoPreview.classList.add('show');
    clearFieldError(videoPreview);

    stopCamera();
  };

  mediaRecorder.start();

  recordBtn.classList.add('recording');
  stopBtn.classList.add('show');
  recordingIndicator.classList.add('show');
});

stopBtn?.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }

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

document.getElementById('nextRecordBtn')?.addEventListener('click', async () => {
  if (!files.lifeProofVideo && !uploaded.lifeProofVideo) {
    showFieldError(document.getElementById('videoPreview'), 'Por favor, grabá un video de prueba de vida');
    return;
  }
  if (files.lifeProofVideo && !uploaded.lifeProofVideo) {
    const btn = document.getElementById('nextRecordBtn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    const ok = await uploadSingleFile('lifeProofVideo', 'life-proof.webm');
    btn.disabled = false; btn.textContent = 'CONTINUAR';
    if (!ok) { showFieldError(document.getElementById('videoPreview'), 'Error al guardar. Intentá de nuevo.'); return; }
  }
  showStep(9);
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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
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
  cardInput.setAttribute('capture', 'environment');
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
  if (!files.cardPhoto && !uploaded.cardPhoto) {
    showFieldError(cardArea, 'Por favor, subí una foto de tu tarjeta');
    return;
  }
  if (files.cardPhoto && !uploaded.cardPhoto) {
    const btn = document.getElementById('nextCardBtn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    const ok = await uploadSingleFile('cardPhoto', 'card-photo.jpg');
    btn.disabled = false; btn.textContent = 'CONTINUAR';
    if (!ok) { showFieldError(cardArea, 'Error al guardar. Intentá de nuevo.'); return; }
  }
  hideQRToggle();
  showStep(10);
});

document.getElementById('backCardBtn')?.addEventListener('click', () => {
  showStep(8);
  reopenCameraForVideo();
});

async function reopenCameraForVideo() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
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
// INICIAR
// ============================================

init();

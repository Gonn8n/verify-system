// ============================================
// VERIFY SYSTEM - Panel Administrativo
// ============================================

const { createClient } = supabase;

// Inicializar Supabase
const supabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

// Estado global
let currentUser = null;
let currentFilter = 'all';
let currentDetailId = null;
let allVerifications = [];

// Elementos del DOM
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const verificationList = document.getElementById('verificationList');
const newVerificationBtn = document.getElementById('newVerificationBtn');
const newModal = document.getElementById('newModal');
const closeNewModal = document.getElementById('closeNewModal');
const cancelNewBtn = document.getElementById('cancelNewBtn');
const newVerificationForm = document.getElementById('newVerificationForm');
const saveNewBtn = document.getElementById('saveNewBtn');
const generatedLink = document.getElementById('generatedLink');
const generatedLinkButtons = document.getElementById('generatedLinkButtons');
const linkText = document.getElementById('linkText');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const emailLinkBtn = document.getElementById('emailLinkBtn');
const whatsappLinkBtn = document.getElementById('whatsappLinkBtn');
const detailOverlay = document.getElementById('detailOverlay');
const closeDetail = document.getElementById('closeDetail');
const filterTabs = document.querySelectorAll('.filter-tab');
const toast = document.getElementById('toast');

// ============================================
// SEGURIDAD - Escape HTML
// ============================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ============================================
// AUTENTICACIÓN
// ============================================

async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    window.location.href = '../index.html';
    return;
  }

  // Verificar que sea admin
  const { data: adminUser } = await supabaseClient
    .from('admin_users')
    .select('id, email')
    .eq('id', session.user.id)
    .single();

  if (!adminUser) {
    await supabaseClient.auth.signOut();
    window.location.href = '../index.html';
    return;
  }

  currentUser = adminUser;
  const email = session.user.email || '';
  userEmail.textContent = email;
  document.getElementById('userAvatar').textContent = (email.charAt(0) || 'V').toUpperCase();

  // Cargar verificaciones
  await loadVerifications();
}

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = '../index.html';
});

// ============================================
// CARGAR VERIFICACIONES
// ============================================

async function loadVerifications() {
  const { data, error } = await supabaseClient
    .from('verifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading verifications:', error);
    showToast('Error al cargar verificaciones', 'error');
    return;
  }

  allVerifications = data || [];
  updateStats();
  renderList();
}

// ============================================
// ESTADÍSTICAS
// ============================================

function updateStats() {
  const stats = {
    pending: 0,
    in_review: 0,
    approved: 0,
    rejected: 0
  };

  allVerifications.forEach(v => {
    if (stats[v.status] !== undefined) {
      stats[v.status]++;
    }
  });

  document.getElementById('statPending').textContent = stats.pending;
  document.getElementById('statReview').textContent = stats.in_review;
  document.getElementById('statApproved').textContent = stats.approved;
  document.getElementById('statRejected').textContent = stats.rejected;
}

// ============================================
// FILTROS
// ============================================

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderList();
  });
});

// ============================================
// RENDERIZAR LISTA
// ============================================

function renderList() {
  const filtered = currentFilter === 'all' 
    ? allVerifications 
    : allVerifications.filter(v => v.status === currentFilter);

  if (filtered.length === 0) {
    verificationList.innerHTML = `
      <div class="empty-state">
        <svg class="icon" aria-hidden="true"><use href="#i-clipboard"/></svg>
        <p>${currentFilter === 'all' ? 'Cargá una nueva verificación para comenzar' : 'No hay verificaciones con este estado'}</p>
      </div>
    `;
    return;
  }

  verificationList.innerHTML = filtered.map(v => {
    const initials = ((v.first_name || '')[0] || '') + ((v.last_name || '')[0] || '');
    const safeStatus = (v.status || 'pending').replace('in_review', 'review');
    return `
    <div class="admin-card status-${escapeHtml(v.status)}" data-id="${escapeHtml(v.id)}">
      <div class="avatar">${escapeHtml(initials) || '?'}</div>
      <div class="admin-card-body">
        <div class="admin-card-header">
          <div>
            <div class="admin-card-name">${escapeHtml(v.first_name)} ${escapeHtml(v.last_name)}</div>
            <div class="admin-card-code">${escapeHtml(v.unique_code)}</div>
          </div>
          <span class="badge badge-dot badge-${escapeHtml(safeStatus)}">${escapeHtml(getStatusLabel(v.status))}</span>
        </div>
        <div class="admin-card-meta">
          <span>DNI: ${escapeHtml(v.dni)}</span>
          <span>${escapeHtml(formatDate(v.created_at))}</span>
        </div>
      </div>
      <svg class="icon admin-card-chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>
    </div>
  `;
  }).join('');

  // Click en cards
  document.querySelectorAll('.admin-card').forEach(card => {
    card.addEventListener('click', () => {
      openDetail(card.dataset.id);
    });
  });
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Pendiente',
    in_review: 'En Revisión',
    approved: 'Aprobado',
    rejected: 'Rechazado'
  };
  return labels[status] || status;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================
// NUEVA VERIFICACIÓN
// ============================================

newVerificationBtn.addEventListener('click', () => {
  newModal.classList.remove('hidden');
  newVerificationForm.reset();
  generatedLink.classList.add('hidden');
  generatedLinkButtons.classList.add('hidden');
  saveNewBtn.disabled = false;
  saveNewBtn.textContent = 'Crear Verificación';
});

closeNewModal.addEventListener('click', () => newModal.classList.add('hidden'));
cancelNewBtn.addEventListener('click', () => newModal.classList.add('hidden'));
newModal.addEventListener('click', (e) => {
  if (e.target === newModal) newModal.classList.add('hidden');
});

// Generar código único
function generateUniqueCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 24; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Crear verificación
saveNewBtn.addEventListener('click', async () => {
  if (!newVerificationForm.checkValidity()) {
    newVerificationForm.reportValidity();
    return;
  }

  saveNewBtn.disabled = true;
  saveNewBtn.textContent = 'Creando...';

  const uniqueCode = generateUniqueCode();
  const verificationData = {
    unique_code: uniqueCode,
    first_name: document.getElementById('firstName').value.trim(),
    last_name: document.getElementById('lastName').value.trim(),
    dni: document.getElementById('dni').value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    card_last_four: document.getElementById('cardLastFour').value.trim() || null,
    status: 'pending'
  };

  const { data, error } = await supabaseClient
    .from('verifications')
    .insert(verificationData)
    .select()
    .single();

  if (error) {
    console.error('Error creating verification:', error);
    showToast('Error al crear verificación', 'error');
    saveNewBtn.disabled = false;
    saveNewBtn.textContent = 'Crear Verificación';
    return;
  }

  // Mostrar link generado
  const verificationUrl = `${SUPABASE_CONFIG.domain}/v/?code=${uniqueCode}`;
  linkText.textContent = verificationUrl;
  generatedLink.classList.remove('hidden');
  generatedLinkButtons.classList.remove('hidden');
  saveNewBtn.classList.add('hidden');

  // Configurar botones de link
  setupLinkButtons(verificationUrl, verificationData.email, verificationData.first_name, verificationData.phone, uniqueCode);

  // Recargar lista
  await loadVerifications();
  
  showToast('Verificación creada exitosamente', 'success');
});

// ============================================
// BOTONES DE LINK
// ============================================

function setupLinkButtons(url, email, firstName, phone, uniqueCode) {
  // Copy
  copyLinkBtn.onclick = () => {
    navigator.clipboard.writeText(url);
    showToast('Link copiado', 'success');
  };

  // Email
  emailLinkBtn.onclick = async () => {
    emailLinkBtn.disabled = true;
    emailLinkBtn.textContent = 'Enviando...';
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify({
          type: 'verification_request',
          to: email,
          firstName: firstName,
          verificationUrl: url,
          uniqueCode: uniqueCode,
          commerceName: SUPABASE_CONFIG.commerceName
        })
      });
      if (response.ok) {
        showToast('Email enviado exitosamente', 'success');
      } else {
        const err = await response.json();
        showToast('Error al enviar email: ' + (err.error || 'Error desconocido'), 'error');
      }
    } catch (err) {
      showToast('Error al enviar email', 'error');
    }
    emailLinkBtn.disabled = false;
    emailLinkBtn.textContent = 'Email';
  };

  // WhatsApp
  whatsappLinkBtn.onclick = () => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('54') ? cleanPhone : '549' + cleanPhone;
    const text = encodeURIComponent(`Hola ${firstName}, necesitamos que verifiques tu compra. Hacé click en el enlace: ${url}`);
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };
}

// ============================================
// DETALLE DE VERIFICACIÓN
// ============================================

async function openDetail(id) {
  const verification = allVerifications.find(v => v.id === id);
  if (!verification) return;

  currentDetailId = id;

  // Reset tabs to first
  document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.detail-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('.detail-tab[data-tab="tabInfo"]').classList.add('active');
  document.getElementById('tabInfo').classList.add('active');

  // Llenar datos
  document.getElementById('detailTitle').textContent = `${verification.first_name} ${verification.last_name}`;
  document.getElementById('detailDni').textContent = verification.dni;
  document.getElementById('detailEmail').textContent = verification.email;
  document.getElementById('detailPhone').textContent = verification.phone;
  document.getElementById('detailCard').textContent = verification.card_last_four || 'No proporcionado';
  document.getElementById('detailCode').textContent = verification.unique_code;
  const safeStatus = (verification.status || 'pending').replace('in_review', 'review');
  document.getElementById('detailStatusBadge').innerHTML = `<span class="badge badge-${escapeHtml(safeStatus)}">${escapeHtml(getStatusLabel(verification.status))}</span>`;
  document.getElementById('detailCreated').textContent = formatDate(verification.created_at);

  // Ubicación
  const locationRow = document.getElementById('detailLocationRow');
  if (verification.latitude && verification.longitude) {
    locationRow.style.display = '';
    document.getElementById('detailLocation').href = `https://www.google.com/maps?q=${verification.latitude},${verification.longitude}`;
  } else {
    locationRow.style.display = 'none';
  }

  // Link
  const verificationUrl = `${SUPABASE_CONFIG.domain}/v/?code=${verification.unique_code}`;
  document.getElementById('detailLink').textContent = verificationUrl;

  // Configurar botones de link del detalle
  document.getElementById('detailCopyBtn').onclick = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      showToast('Link copiado', 'success');
    } catch {
      // Fallback: textarea + execCommand
      const ta = document.createElement('textarea');
      ta.value = verificationUrl;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Link copiado', 'success');
    }
  };

  document.getElementById('detailEmailBtn').onclick = async () => {
    const btn = document.getElementById('detailEmailBtn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify({
          type: 'verification_request',
          to: verification.email,
          firstName: verification.first_name,
          verificationUrl: verificationUrl,
          uniqueCode: verification.unique_code,
          commerceName: SUPABASE_CONFIG.commerceName
        })
      });
      if (response.ok) {
        showToast('Email enviado exitosamente', 'success');
      } else {
        const err = await response.json();
        showToast('Error al enviar email: ' + (err.error || 'Error desconocido'), 'error');
      }
    } catch (err) {
      showToast('Error al enviar email', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg> Email';
  };

  document.getElementById('detailWhatsappBtn').onclick = () => {
    const phone = (verification.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = phone.startsWith('54') ? phone : '549' + phone;
    const text = encodeURIComponent(`Hola ${verification.first_name}, necesitamos que verifiques tu compra. Hacé click en el enlace: ${verificationUrl}`);
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  // Documentos
  renderMedia('detailDniFront', verification.dni_front_url, 'image');
  renderMedia('detailDniBack', verification.dni_back_url, 'image');
  renderMedia('detailVideo', verification.life_proof_video_url, 'video');
  renderMedia('detailCardPhoto', verification.card_photo_url, 'image');

  // Botones de estado
  document.querySelectorAll('[data-status]').forEach(btn => {
    btn.onclick = () => updateStatus(btn.dataset.status);
  });

  // Tabs
  document.querySelectorAll('.detail-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.detail-tab-content').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    };
  });

  // Botón eliminar
  const deleteBtn = document.getElementById('detailDeleteBtn');
  if (deleteBtn) {
    deleteBtn.onclick = () => deleteVerification(verification.id, verification.first_name);
  }

  // Cargar análisis existente
  loadExistingAnalysis(verification.id);

  // Botón analizar
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.onclick = () => runAnalysis(verification.id);
  }

  detailOverlay.classList.remove('hidden');
}

function renderMedia(containerId, url, type) {
  const container = document.getElementById(containerId);
  if (!url) {
    const icon = type === 'video' ? 'i-video' : 'i-id-card';
    container.innerHTML = `
      <div class="detail-media-placeholder">
        <svg class="icon" aria-hidden="true"><use href="#${icon}"/></svg>
        No subido
      </div>
    `;
    return;
  }

  if (type === 'video') {
    const wrapper = document.createElement('div');
    wrapper.className = 'video-preview-container';
    const video = document.createElement('video');
    video.controls = true;
    video.src = url;
    wrapper.appendChild(video);
    container.innerHTML = '';
    container.appendChild(wrapper);
  } else {
    const savedRotation = parseInt(localStorage.getItem('rotation_' + url) || '0', 10);
    const rotationStyle = savedRotation ? `transform: rotate(${savedRotation}deg);` : '';

    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview-wrapper';

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Documento';
    img.dataset.rotation = savedRotation;
    img.style.cssText = rotationStyle;
    img.addEventListener('click', () => openImageModal(url, savedRotation));

    const actions = document.createElement('div');
    actions.className = 'media-actions';

    const rotateBtn = document.createElement('button');
    rotateBtn.className = 'media-action-btn media-rotate';
    rotateBtn.title = 'Rotar 90°';
    rotateBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>';
    rotateBtn.addEventListener('click', () => rotateMediaImage(rotateBtn));

    const zoomBtn = document.createElement('button');
    zoomBtn.className = 'media-action-btn media-zoom';
    zoomBtn.title = 'Ver tamaño completo';
    zoomBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';
    zoomBtn.addEventListener('click', () => openImageModal(url, parseInt(img.dataset.rotation || '0')));

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = '';
    downloadLink.className = 'media-action-btn media-download';
    downloadLink.title = 'Descargar';
    downloadLink.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';

    actions.appendChild(rotateBtn);
    actions.appendChild(zoomBtn);
    actions.appendChild(downloadLink);
    wrapper.appendChild(img);
    wrapper.appendChild(actions);
    container.innerHTML = '';
    container.appendChild(wrapper);
  }
}

// Rotar imagen 90° en el admin
function rotateMediaImage(btn) {
  const container = btn.closest('.image-preview-wrapper');
  const img = container.querySelector('img');
  if (!img) return;
  const current = parseInt(img.dataset.rotation || '0', 10);
  const next = (current + 90) % 360;
  img.dataset.rotation = next;
  img.style.transform = `rotate(${next}deg)`;
  // Persist rotation
  localStorage.setItem('rotation_' + img.src, next);
}

// Modal de imagen a tamaño completo
function openImageModal(url, rotation = 0) {
  const existing = document.getElementById('imageModal');
  if (existing) existing.remove();

  const rotationStyle = rotation ? `transform: rotate(${rotation}deg);` : '';

  const modal = document.createElement('div');
  modal.id = 'imageModal';
  modal.className = 'image-modal-overlay';

  const content = document.createElement('div');
  content.className = 'image-modal-content';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'image-modal-close';
  closeBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  closeBtn.addEventListener('click', closeImageModal);

  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Documento completo';
  img.style.cssText = rotationStyle;

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = '';
  downloadLink.className = 'image-modal-download';
  downloadLink.title = 'Descargar';
  downloadLink.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Descargar';

  content.appendChild(closeBtn);
  content.appendChild(img);
  content.appendChild(downloadLink);
  modal.appendChild(content);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeImageModal();
  });
  document.body.appendChild(modal);
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  if (modal) modal.remove();
}

closeDetail.addEventListener('click', () => {
  detailOverlay.classList.add('hidden');
  currentDetailId = null;
});

detailOverlay.addEventListener('click', (e) => {
  if (e.target === detailOverlay) {
    detailOverlay.classList.add('hidden');
    currentDetailId = null;
  }
});

// ============================================
// ACTUALIZAR ESTADO
// ============================================

async function updateStatus(newStatus) {
  if (!currentDetailId) return;

  const { error } = await supabaseClient
    .from('verifications')
    .update({ status: newStatus })
    .eq('id', currentDetailId);

  if (error) {
    console.error('Error updating status:', error);
    showToast('Error al actualizar estado', 'error');
    return;
  }

  // Enviar email de notificación
  await sendStatusEmail(currentDetailId, newStatus);

  showToast(`Estado cambiado a: ${getStatusLabel(newStatus)}`, 'success');
  
  // Recargar datos
  await loadVerifications();
  
  // Actualizar detalle
  const updated = allVerifications.find(v => v.id === currentDetailId);
  if (updated) {
    const safeStatus = (newStatus || 'pending').replace('in_review', 'review');
    document.getElementById('detailStatusBadge').innerHTML = `<span class="badge badge-${escapeHtml(safeStatus)}">${escapeHtml(getStatusLabel(newStatus))}</span>`;
  }
}

// ============================================
// ENVIAR EMAIL DE ESTADO
// ============================================

async function sendStatusEmail(verificationId, status) {
  const verification = allVerifications.find(v => v.id === verificationId);
  if (!verification) return;

  const emailType = status === 'approved' ? 'status_approved' : 'status_rejected';

  try {
    const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/resend-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
      },
      body: JSON.stringify({
        type: emailType,
        to: verification.email,
        firstName: verification.first_name,
        uniqueCode: verification.unique_code,
        commerceName: SUPABASE_CONFIG.commerceName
      })
    });

    if (!response.ok) {
      console.error('Error sending email:', await response.text());
    }
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

// ============================================
// ELIMINAR VERIFICACIÓN
// ============================================

const CONFIRM_WORDS = ['PALOMA', 'MURCIELAGO', 'ELEFANTE', 'CANGREJO', 'TORTUGA', 'JIRAFA', 'COCODRILO', 'BALLENA', 'PUMA', 'CONDOR'];

function getRandomWord() {
  return CONFIRM_WORDS[Math.floor(Math.random() * CONFIRM_WORDS.length)];
}

async function deleteVerification(id, name) {
  const word = getRandomWord();
  showConfirmModal({
    title: 'Eliminar verificación',
    text: `Vas a eliminar la verificación de ${name}. Esta acción no se puede deshacer.`,
    requireWord: true,
    confirmWord: word,
    danger: true,
    onConfirm: async () => {
      try {
        // 1. Obtener datos antes de eliminar
        const v = allVerifications.find(v => v.id === id);
        const code = v ? v.unique_code : '';

        // 2. Eliminar de la UI inmediatamente
        allVerifications = allVerifications.filter(v => v.id !== id);
        updateStats();
        renderList();
        closeDetailPanel();
        showToast('Eliminando...', 'success');

        // 3. Eliminar archivos del storage
        if (code) {
          const storageFiles = ['dni-front.jpg', 'dni-back.jpg', 'life-proof.webm', 'card-photo.jpg'];
          for (const f of storageFiles) {
            await supabaseClient.storage.from('verification-files').remove([`${code}/${f}`]);
          }
        }

        // 4. Eliminar análisis AI
        await supabaseClient.from('verification_analysis').delete().eq('verification_id', id);

        // 5. Eliminar verificación
        const { error } = await supabaseClient.from('verifications').delete().eq('id', id);
        if (error) throw error;

        showToast('Verificación eliminada', 'success');
      } catch (err) {
        console.error('Error deleting:', err.message || err);
        showToast('Error al eliminar: ' + (err.message || 'Error desconocido'), 'error');
        // Recargar la lista para restaurar el estado
        await loadVerifications();
      }
    }
  });
}

// ============================================
// ANÁLISIS AI
// ============================================

async function loadExistingAnalysis(verificationId) {
  const resultsDiv = document.getElementById('analysisResults');
  resultsDiv.classList.add('hidden');

  const { data } = await supabaseClient
    .from('verification_analysis')
    .select('*')
    .eq('verification_id', verificationId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return;

  resultsDiv.classList.remove('hidden');

  // Score ring
  const score = data.overall_score || 0;
  const scoreEl = document.getElementById('analysisScoreValue');
  const ringEl = document.getElementById('analysisScoreRing');
  scoreEl.textContent = score;
  ringEl.className = 'analysis-score-ring ' + (score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low');

  // Recommendation
  const recEl = document.getElementById('analysisRecommendation');
  const rec = data.recommendation || '';
  const recLabels = { low_risk: 'LOW RISK', medium_risk: 'MEDIUM RISK', high_risk: 'HIGH RISK', manual_review: 'REVISIÓN MANUAL' };
  const recClasses = { low_risk: 'rec-low', medium_risk: 'rec-medium', high_risk: 'rec-high', manual_review: 'rec-review' };
  const recLabel = recLabels[rec] || rec.toUpperCase();
  const recClass = recClasses[rec] || 'rec-medium';
  recEl.innerHTML = `<span class="rec-badge ${escapeHtml(recClass)}">${escapeHtml(recLabel)}</span>`;

  // Scores per document
  function scoreBarClass(score) { return score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'; }
  const frontScore = data.dni_front_score || 0;
  const backScore = data.dni_back_score || 0;
  const cardScore = data.card_photo_score || 0;
  const frontBar = document.getElementById('frontScore');
  const backBar = document.getElementById('backScore');
  const cardBar = document.getElementById('cardScore');
  frontBar.style.width = frontScore + '%';
  frontBar.className = 'score-bar ' + scoreBarClass(frontScore);
  document.getElementById('frontScoreText').textContent = frontScore + '%';
  backBar.style.width = backScore + '%';
  backBar.className = 'score-bar ' + scoreBarClass(backScore);
  document.getElementById('backScoreText').textContent = backScore + '%';
  cardBar.style.width = cardScore + '%';
  cardBar.className = 'score-bar ' + scoreBarClass(cardScore);
  document.getElementById('cardScoreText').textContent = cardScore + '%';

  // Summary
  const summaryEl = document.getElementById('summarySection');
  const summaryContent = document.getElementById('summaryContent');
  if (data.summary && (Array.isArray(data.summary) ? data.summary.length : true)) {
    summaryEl.style.display = '';
    const items = Array.isArray(data.summary) ? data.summary : String(data.summary).split('\n').filter(Boolean);
    summaryContent.innerHTML = `<ul class="summary-list">${items.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  } else {
    summaryEl.style.display = 'none';
  }

  // Findings — combine all document findings
  const findingsEl = document.getElementById('findingsSection');
  const findingsContent = document.getElementById('findingsContent');
  const allFindings = [
    ...(Array.isArray(data.dni_front_findings) ? data.dni_front_findings : []),
    ...(Array.isArray(data.dni_back_findings) ? data.dni_back_findings : []),
    ...(Array.isArray(data.card_photo_findings) ? data.card_photo_findings : [])
  ];
  if (allFindings.length) {
    findingsEl.style.display = '';
    findingsContent.innerHTML = `<ul class="summary-list">${allFindings.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`;
  } else {
    findingsEl.style.display = 'none';
  }

  // Data consistency
  const consistencyEl = document.getElementById('consistencySection');
  const consistencyContent = document.getElementById('consistencyContent');
  if (data.data_consistency && typeof data.data_consistency === 'object') {
    consistencyEl.style.display = '';
    const labels = { front_back_match: 'Frente ↔ Dorso', text_readable: 'Texto legible', document_intact: 'Documento intacto' };
    consistencyContent.innerHTML = `<ul class="summary-list">${Object.entries(data.data_consistency).map(([k, v]) => `<li class="${v ? 'match-yes' : 'match-no'}">${escapeHtml(labels[k] || k)}</li>`).join('')}</ul>`;
  } else {
    consistencyEl.style.display = 'none';
  }

  // Data match
  const dataMatchEl = document.getElementById('dataMatchSection');
  const dataMatchContent = document.getElementById('dataMatchContent');
  if (data.data_match && typeof data.data_match === 'object') {
    dataMatchEl.style.display = '';
    const labels = { name_match: 'Nombre', dni_match: 'DNI', card_match: 'Tarjeta' };
    dataMatchContent.innerHTML = `<ul class="summary-list">${Object.entries(data.data_match).filter(([k]) => labels[k]).map(([k, v]) => `<li class="${v ? 'match-yes' : 'match-no'}">${escapeHtml(labels[k])}</li>`).join('')}</ul>`;
  } else {
    dataMatchEl.style.display = 'none';
  }

  // Fraud signals
  const fraudEl = document.getElementById('fraudSignalsSection');
  const fraudContent = document.getElementById('fraudSignalsContent');
  if (Array.isArray(data.fraud_signals) && data.fraud_signals.length) {
    fraudEl.style.display = '';
    fraudContent.innerHTML = `<ul class="fraud-signals-list">${data.fraud_signals.map(s => {
      if (typeof s === 'object') {
        const severity = s.severity || 'medium';
        const confidence = s.confidence || 0;
        const location = s.location || '';
        const desc = s.description || s.signal || JSON.stringify(s);
        return `<li class="fraud-signal severity-${escapeHtml(severity)}"><span class="signal-severity">${escapeHtml(severity.toUpperCase())}</span> <span class="signal-confidence">${escapeHtml(confidence)}%</span>${location ? ` <span class="signal-location">en ${escapeHtml(location)}</span>` : ''}<div class="signal-desc">${escapeHtml(desc)}</div></li>`;
      }
      return `<li>${escapeHtml(s)}</li>`;
    }).join('')}</ul>`;
  } else {
    fraudEl.style.display = 'none';
  }
}

async function runAnalysis(verificationId) {
  const analyzeBtn = document.getElementById('analyzeBtn');
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analizando...';

  try {
    const response = await fetch('https://bot.anexaria.com/webhook/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_id: verificationId })
    });

    if (!response.ok) throw new Error('Error en análisis');

    showToast('Análisis enviado. Procesando...', 'success');

    // Poll for results — n8n takes time to save to Supabase
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 2000;

    const poll = async () => {
      const { data } = await supabaseClient
        .from('verification_analysis')
        .select('overall_score')
        .eq('verification_id', verificationId)
        .single();

      if (data && data.overall_score != null) {
        await loadExistingAnalysis(verificationId);
        showToast('Análisis completado', 'success');
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Verificar con Agente';
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, pollInterval);
      } else {
        showToast('Análisis tardó demasiado. Refrescá la página.', 'error');
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Verificar con Agente';
      }
    };

    setTimeout(poll, pollInterval);
  } catch (err) {
    console.error('Analysis error:', err);
    showToast('Error al analizar', 'error');
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Verificar con Agente';
  }
}

// ============================================
// CONFIRM MODAL
// ============================================

function showConfirmModal({ title, text, requireWord, confirmWord, danger, onConfirm }) {
  const modal = document.getElementById('confirmModal');
  const icon = document.getElementById('confirmModalIcon');
  const titleEl = document.getElementById('confirmModalTitle');
  const textEl = document.getElementById('confirmModalText');
  const inputGroup = document.getElementById('confirmInputGroup');
  const input = document.getElementById('confirmInput');
  const acceptBtn = document.getElementById('confirmAcceptBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  titleEl.textContent = title;
  textEl.textContent = text;
  icon.className = 'confirm-modal-icon' + (danger ? ' danger' : '');

  if (requireWord) {
    inputGroup.classList.remove('hidden');
    document.getElementById('confirmInputLabel').textContent = `Escribí "${confirmWord}" para confirmar:`;
    input.value = '';
    input.className = 'confirm-modal-input';
  } else {
    inputGroup.classList.add('hidden');
  }

  acceptBtn.className = 'btn' + (danger ? ' btn-danger' : '');
  acceptBtn.textContent = 'Confirmar';
  modal.classList.remove('hidden');

  const cleanup = () => {
    modal.classList.add('hidden');
    acceptBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  cancelBtn.onclick = cleanup;

  acceptBtn.onclick = () => {
    if (requireWord && input.value.toUpperCase() !== confirmWord) {
      input.className = 'confirm-modal-input error';
      return;
    }
    cleanup();
    onConfirm();
  };
}

function closeDetailPanel() {
  detailOverlay.classList.add('hidden');
  currentDetailId = null;
}

// ============================================
// TOAST
// ============================================

function showToast(message, type) {
  toast.textContent = message;
  toast.classList.remove('toast-success', 'toast-error');
  if (type) {
    toast.classList.add('toast-' + type);
  }
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ============================================
// Cerrar modales con Escape
// ============================================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!newModal.classList.contains('hidden')) {
      newModal.classList.add('hidden');
    }
    if (!detailOverlay.classList.contains('hidden')) {
      detailOverlay.classList.add('hidden');
      currentDetailId = null;
    }
  }
});

// ============================================
// INICIAR
// ============================================

checkAuth();

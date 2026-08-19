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

// Utilidades
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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
const linkText = document.getElementById('linkText');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const emailLinkBtn = document.getElementById('emailLinkBtn');
const whatsappLinkBtn = document.getElementById('whatsappLinkBtn');
const detailOverlay = document.getElementById('detailOverlay');
const closeDetail = document.getElementById('closeDetail');
const filterTabs = document.querySelectorAll('.filter-tab');
const toast = document.getElementById('toast');

// Confirm modal elements
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalText = document.getElementById('confirmModalText');
const confirmModalIcon = document.getElementById('confirmModalIcon');
const confirmInputGroup = document.getElementById('confirmInputGroup');
const confirmInputLabel = document.getElementById('confirmInputLabel');
const confirmInput = document.getElementById('confirmInput');
const confirmAcceptBtn = document.getElementById('confirmAcceptBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

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
  userEmail.textContent = session.user.email;
  
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
  verificationList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Cargando verificaciones...</p>
    </div>
  `;

  const { data, error } = await supabaseClient
    .from('verifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading verifications:', error);
    showToast('Error al cargar verificaciones');
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
        <div class="empty-state-icon">📋</div>
        <p>${currentFilter === 'all' ? 'Cargá una nueva verificación para comenzar' : 'No hay verificaciones con este estado'}</p>
      </div>
    `;
    return;
  }

  verificationList.innerHTML = filtered.map(v => `
    <div class="admin-card status-${escapeHtml(v.status)}" data-id="${escapeHtml(v.id)}">
      <div class="admin-card-header">
        <div>
          <div class="admin-card-name">${escapeHtml(v.first_name)} ${escapeHtml(v.last_name)}</div>
          <div class="admin-card-code">${escapeHtml(v.unique_code)}</div>
        </div>
        <span class="badge badge-${escapeHtml(v.status.replace('in_review', 'review'))}">${getStatusLabel(v.status)}</span>
      </div>
      <div class="admin-card-meta">
        <span>DNI: ${escapeHtml(v.dni)}</span>
        <span>${formatDate(v.created_at)}</span>
      </div>
      <div class="admin-card-actions">
        <button class="card-action-btn" data-action="copy" data-code="${escapeHtml(v.unique_code)}" data-name="${escapeHtml(v.first_name)}" data-email="${escapeHtml(v.email)}" title="Copiar link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="card-action-btn" data-action="whatsapp" data-code="${escapeHtml(v.unique_code)}" data-name="${escapeHtml(v.first_name)}" data-email="${escapeHtml(v.email)}" title="WhatsApp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>
        <button class="card-action-btn" data-action="email" data-code="${escapeHtml(v.unique_code)}" data-name="${escapeHtml(v.first_name)}" data-email="${escapeHtml(v.email)}" title="Email">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </button>
      </div>
    </div>
  `).join('');

  // Click en cards
  document.querySelectorAll('.admin-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // No abrir detalle si se clickeó un botón de acción
      if (e.target.closest('.card-action-btn')) return;
      openDetail(card.dataset.id);
    });
  });

  // Botones de acción rápida en cards
  document.querySelectorAll('.card-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const code = btn.dataset.code;
      const name = btn.dataset.name;
      const email = btn.dataset.email;
      const url = `${SUPABASE_CONFIG.domain}/v/?code=${code}`;

      if (action === 'copy') {
        navigator.clipboard.writeText(url).then(() => {
          showToast('Link copiado');
        }).catch(() => {
          showToast('No se pudo copiar el link', 'error');
        });
      } else if (action === 'whatsapp') {
        const text = encodeURIComponent(`Hola ${name}, necesitamos que verifiques tu compra. Hacé click en el enlace: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      } else if (action === 'email') {
        const subject = encodeURIComponent('Verificá tu compra');
        const body = encodeURIComponent(`Hola ${name},\n\nNecesitamos que verifiques tu compra. Hacé click en el siguiente enlace:\n\n${url}\n\nTenés 24 horas para completar la verificación.\n\nSaludos,\nEquipo Verify`);
        window.open(`mailto:${email}?subject=${subject}&body=${body}`);
      }
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
  saveNewBtn.disabled = false;
  saveNewBtn.textContent = 'Crear Verificación';
});

closeNewModal.addEventListener('click', () => newModal.classList.add('hidden'));
cancelNewBtn.addEventListener('click', () => newModal.classList.add('hidden'));

// Cerrar modal al hacer click afuera
newModal.addEventListener('click', (e) => {
  if (e.target === newModal) {
    newModal.classList.add('hidden');
  }
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
    showToast('Error al crear verificación');
    saveNewBtn.disabled = false;
    saveNewBtn.textContent = 'Crear Verificación';
    return;
  }

  // Mostrar link generado
  const verificationUrl = `${SUPABASE_CONFIG.domain}/v/?code=${uniqueCode}`;
  linkText.textContent = verificationUrl;
  generatedLink.classList.remove('hidden');
  saveNewBtn.classList.add('hidden');

  // Configurar botones de link
  setupLinkButtons(verificationUrl, verificationData.email, verificationData.first_name);

  // Recargar lista
  await loadVerifications();
  
  showToast('Verificación creada exitosamente');
});

// ============================================
// BOTONES DE LINK
// ============================================

function setupLinkButtons(url, email, firstName) {
  // Copy
  copyLinkBtn.onclick = () => {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copiado');
    }).catch(() => {
      showToast('No se pudo copiar el link', 'error');
    });
  };

  // Email
  emailLinkBtn.onclick = () => {
    const subject = encodeURIComponent('Verificá tu compra');
    const body = encodeURIComponent(`Hola ${firstName},\n\nNecesitamos que verifiques tu compra. Hacé click en el siguiente enlace:\n\n${url}\n\nTenés 24 horas para completar la verificación.\n\nSaludos,\nEquipo Verify`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  // WhatsApp
  whatsappLinkBtn.onclick = () => {
    const text = encodeURIComponent(`Hola ${firstName}, necesitamos que verifiques tu compra. Hacé click en el enlace: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };
}

// ============================================
// DETALLE DE VERIFICACIÓN
// ============================================

async function openDetail(id) {
  const verification = allVerifications.find(v => v.id === id);
  if (!verification) return;

  currentDetailId = id;

  // Llenar datos
  document.getElementById('detailTitle').textContent = `${verification.first_name} ${verification.last_name}`;
  document.getElementById('detailDni').textContent = verification.dni;
  document.getElementById('detailEmail').textContent = verification.email;
  document.getElementById('detailPhone').textContent = verification.phone;
  document.getElementById('detailCard').textContent = verification.card_last_four || 'No proporcionado';
  document.getElementById('detailCode').textContent = verification.unique_code;
  document.getElementById('detailStatusBadge').innerHTML = `<span class="badge badge-${verification.status.replace('in_review', 'review')}">${getStatusLabel(verification.status)}</span>`;
  document.getElementById('detailCreated').textContent = formatDate(verification.created_at);

  // Ubicación
  const locationRow = document.getElementById('detailLocationRow');
  if (verification.latitude && verification.longitude) {
    const mapsUrl = `https://www.google.com/maps?q=${verification.latitude},${verification.longitude}`;
    document.getElementById('detailLocation').href = mapsUrl;
    locationRow.style.display = 'flex';
  } else {
    locationRow.style.display = 'none';
  }

  // Link
  const verificationUrl = `${SUPABASE_CONFIG.domain}/v/?code=${verification.unique_code}`;
  document.getElementById('detailLink').textContent = verificationUrl;

  // Configurar botones de link del detalle
  document.getElementById('detailCopyBtn').onclick = () => {
    navigator.clipboard.writeText(verificationUrl).then(() => {
      showToast('Link copiado');
    }).catch(() => {
      showToast('No se pudo copiar el link', 'error');
    });
  };

  document.getElementById('detailEmailBtn').onclick = () => {
    const subject = encodeURIComponent('Verificá tu compra');
    const body = encodeURIComponent(`Hola ${verification.first_name},\n\nNecesitamos que verifiques tu compra. Hacé click en el siguiente enlace:\n\n${verificationUrl}\n\nTenés 24 horas para completar la verificación.\n\nSaludos,\nEquipo Verify`);
    window.open(`mailto:${verification.email}?subject=${subject}&body=${body}`);
  };

  document.getElementById('detailWhatsappBtn').onclick = () => {
    const text = encodeURIComponent(`Hola ${verification.first_name}, necesitamos que verifiques tu compra. Hacé click en el enlace: ${verificationUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
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

  // Resetear análisis
  document.getElementById('analysisResults').classList.add('hidden');

  detailOverlay.classList.remove('hidden');

  // Cargar análisis existente
  loadExistingAnalysis(id);

  // Botón eliminar
  document.getElementById('detailDeleteBtn').onclick = () => deleteVerification(id);
}

function renderMedia(containerId, url, type) {
  const container = document.getElementById(containerId);
  if (!url) {
    container.innerHTML = '<div class="detail-media-placeholder">No subido</div>';
    return;
  }

  if (type === 'video') {
    container.innerHTML = `
      <div class="video-preview-container">
        <video controls src="${url}"></video>
        <a href="${url}" target="_blank" class="media-action-btn media-zoom" title="Abrir en nueva pestaña">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="image-preview-container">
        <img src="${url}" alt="Documento" onclick="openImageModal('${url}')">
        <div class="media-actions">
          <button class="media-action-btn media-zoom" onclick="openImageModal('${url}')" title="Ver tamaño completo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
          <a href="${url}" download class="media-action-btn media-download" title="Descargar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </a>
        </div>
      </div>
    `;
  }
}

// Modal de imagen a tamaño completo
function openImageModal(url) {
  const existing = document.getElementById('imageModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'imageModal';
  modal.className = 'image-modal-overlay';
  modal.innerHTML = `
    <div class="image-modal-content">
      <button class="image-modal-close" onclick="closeImageModal()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <img src="${url}" alt="Documento completo">
      <a href="${url}" download class="image-modal-download" title="Descargar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Descargar
      </a>
    </div>
  `;
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

// Cerrar detalle al hacer click afuera
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

  const statusLabel = getStatusLabel(newStatus);
  const confirmed = await showConfirmModal({
    title: 'Cambiar estado',
    text: `¿Cambiar estado a "${statusLabel}"?`,
    isDanger: newStatus === 'rejected',
    acceptLabel: newStatus === 'rejected' ? 'Rechazar' : 'Confirmar'
  });

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from('verifications')
    .update({ status: newStatus })
    .eq('id', currentDetailId);

  if (error) {
    console.error('Error updating status:', error);
    showToast('Error al actualizar estado');
    return;
  }

  // Enviar email de notificación
  await sendStatusEmail(currentDetailId, newStatus);

  showToast(`Estado cambiado a: ${getStatusLabel(newStatus)}`);
  
  // Recargar datos
  await loadVerifications();
  
  // Actualizar detalle
  const updated = allVerifications.find(v => v.id === currentDetailId);
  if (updated) {
    document.getElementById('detailStatusBadge').innerHTML = `<span class="badge badge-${newStatus.replace('in_review', 'review')}">${getStatusLabel(newStatus)}</span>`;
  }
}

// ============================================
// ELIMINAR VERIFICACIÓN
// ============================================

async function deleteVerification(id) {
  const verification = allVerifications.find(v => v.id === id);
  if (!verification) return;

  const confirmed = await showConfirmModal({
    title: 'Eliminar verificación',
    text: `Se eliminará permanentemente la verificación de ${escapeHtml(verification.first_name)} ${escapeHtml(verification.last_name)} (${escapeHtml(verification.dni)}). Esta acción no se puede deshacer.`,
    requireWord: true,
    isDanger: true,
    acceptLabel: 'Eliminar'
  });

  if (!confirmed) return;

  const { error } = await supabaseClient.rpc('delete_verification', { p_id: id });

  if (error) {
    console.error('Error deleting verification:', error);
    showToast('Error al eliminar la verificación');
    return;
  }

  showToast('Verificación eliminada');

  // Cerrar detail panel
  detailOverlay.classList.add('hidden');
  currentDetailId = null;

  // Recargar datos
  await loadVerifications();
}

// ============================================
// ENVIAR EMAIL DE ESTADO
// ============================================

async function sendStatusEmail(verificationId, status) {
  const verification = allVerifications.find(v => v.id === verificationId);
  if (!verification) return;

  try {
    const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/send-status-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
      },
      body: JSON.stringify({
        email: verification.email,
        firstName: verification.first_name,
        status: status,
        commerceName: SUPABASE_CONFIG.commerceName,
        uniqueCode: verification.unique_code
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
// CONFIRM MODAL CUSTOM
// ============================================

function getRandomWord() {
  const words = ['PALOMA', 'MURCIELAGO', 'CONEJO', 'JIRABA', 'TORTUGA', 'BUHO', 'PINGUINO', 'CABALLO', 'DELFIN', 'AGUILA'];
  return words[Math.floor(Math.random() * words.length)];
}

function showConfirmModal({ title, text, requireWord = false, isDanger = false, acceptLabel = 'Confirmar' }) {
  return new Promise((resolve) => {
    confirmModalTitle.textContent = title;
    confirmModalText.textContent = text;
    confirmAcceptBtn.textContent = acceptLabel;
    confirmAcceptBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

    if (isDanger) {
      confirmModalIcon.className = 'confirm-modal-icon danger';
      confirmModalIcon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      confirmModalIcon.className = 'confirm-modal-icon';
      confirmModalIcon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    }

    if (requireWord) {
      const word = getRandomWord();
      confirmInputGroup.classList.remove('hidden');
      confirmInputLabel.textContent = `Escribí "${word}" para confirmar:`;
      confirmInput.value = '';
      confirmInput.className = 'confirm-modal-input';
      confirmInput.dataset.word = word;
      setTimeout(() => confirmInput.focus(), 100);
    } else {
      confirmInputGroup.classList.add('hidden');
    }

    confirmModal.classList.remove('hidden');

    const cleanup = (result) => {
      confirmModal.classList.add('hidden');
      confirmAcceptBtn.onclick = null;
      confirmCancelBtn.onclick = null;
      resolve(result);
    };

    confirmAcceptBtn.onclick = () => {
      if (requireWord) {
        const entered = confirmInput.value.trim().toUpperCase();
        const expected = confirmInput.dataset.word;
        if (entered !== expected) {
          confirmInput.classList.add('error');
          confirmInput.value = '';
          confirmInput.focus();
          return;
        }
      }
      cleanup(true);
    };

    confirmCancelBtn.onclick = () => cleanup(false);
  });
}

// ============================================
// TOAST
// ============================================

function showToast(message) {
  toast.textContent = message;
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
    if (!confirmModal.classList.contains('hidden')) {
      confirmModal.classList.add('hidden');
      return;
    }
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
// ANÁLISIS AI
// ============================================

const N8N_WEBHOOK_URL = 'https://bot.anexaria.com/webhook/verify';

async function analyzeVerification() {
  if (!currentDetailId) return;

  const btn = document.getElementById('analyzeBtn');
  const results = document.getElementById('analysisResults');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Analizando...';

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_id: currentDetailId })
    });

    if (!response.ok) throw new Error('Error en el análisis');

    const result = await response.json();

    if (result.success && result.analysis) {
      renderAnalysis(result.analysis);
      results.classList.remove('hidden');
      showToast('Análisis completado');
    } else {
      throw new Error('Respuesta inválida');
    }
  } catch (err) {
    console.error('Analysis error:', err);
    showToast('Error al analizar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Analizar con AI';
  }
}

function renderAnalysis(analysis) {
  // Score circular
  const score = analysis.overall_score || 0;
  const ring = document.getElementById('analysisScoreRing');
  const scoreValue = document.getElementById('analysisScoreValue');
  scoreValue.textContent = score;
  ring.className = 'analysis-score-ring';
  if (score >= 70) ring.classList.add('high');
  else if (score >= 40) ring.classList.add('medium');
  else ring.classList.add('low');

  // Recomendación
  const rec = document.getElementById('analysisRecommendation');
  const recLabels = {
    low_risk: { text: 'Bajo Riesgo', class: 'rec-low' },
    medium_risk: { text: 'Riesgo Medio', class: 'rec-medium' },
    high_risk: { text: 'Alto Riesgo', class: 'rec-high' }
  };
  const recData = recLabels[analysis.recommendation] || recLabels.medium_risk;
  rec.innerHTML = `<span class="rec-badge ${recData.class}">${recData.text}</span>`;

  // Resumen
  const summary = analysis.summary || [];
  const summarySection = document.getElementById('summarySection');
  const summaryContent = document.getElementById('summaryContent');
  if (summary.length > 0) {
    summarySection.classList.remove('hidden');
    summaryContent.innerHTML = '<ul class="summary-list">' + summary.map(s => `<li>${s}</li>`).join('') + '</ul>';
  } else {
    summarySection.classList.add('hidden');
  }

  // Scores por documento
  setScoreBar('frontScore', 'frontScoreText', analysis.dni_front_score || 0);
  setScoreBar('backScore', 'backScoreText', analysis.dni_back_score || 0);
  setScoreBar('cardScore', 'cardScoreText', analysis.card_photo_score || 0);

  // Hallazgos del DNI
  const frontFindings = analysis.dni_front_findings || [];
  const backFindings = analysis.dni_back_findings || [];
  const cardFindings = analysis.card_photo_findings || [];
  const findingsSection = document.getElementById('findingsSection');
  const findingsContent = document.getElementById('findingsContent');

  if (frontFindings.length > 0 || backFindings.length > 0 || cardFindings.length > 0) {
    findingsSection.classList.remove('hidden');
    let findingsHtml = '';
    if (frontFindings.length > 0) {
      findingsHtml += '<div class="findings-group"><span class="findings-label">Frente DNI:</span><ul>' + frontFindings.map(f => `<li>${f}</li>`).join('') + '</ul></div>';
    }
    if (backFindings.length > 0) {
      findingsHtml += '<div class="findings-group"><span class="findings-label">Dorso DNI:</span><ul>' + backFindings.map(f => `<li>${f}</li>`).join('') + '</ul></div>';
    }
    if (cardFindings.length > 0) {
      findingsHtml += '<div class="findings-group"><span class="findings-label">Tarjeta:</span><ul>' + cardFindings.map(f => `<li>${f}</li>`).join('') + '</ul></div>';
    }
    findingsContent.innerHTML = findingsHtml;
  } else {
    findingsSection.classList.add('hidden');
  }

  // Consistencia del documento
  const consistency = analysis.data_consistency || {};
  const consistencySection = document.getElementById('consistencySection');
  const consistencyContent = document.getElementById('consistencyContent');
  const consistencyKeys = [
    { key: 'front_back_match', label: 'Frente y dorso consistentes' },
    { key: 'text_readable', label: 'Texto legible' },
    { key: 'document_intact', label: 'Documento intacto' }
  ];
  const filledConsistency = consistencyKeys.filter(k => consistency[k.key] !== undefined);
  if (filledConsistency.length > 0) {
    consistencySection.classList.remove('hidden');
    consistencyContent.innerHTML = filledConsistency.map(k => {
      const val = consistency[k.key];
      const cls = val ? 'match-ok' : 'match-error';
      const icon = val ? '✓' : '✗';
      const text = val ? 'Sí' : 'No';
      return `<div class="match-row"><span class="match-label">${k.label}</span><span class="match-status ${cls}">${icon} ${text}</span></div>`;
    }).join('');
  } else {
    consistencySection.classList.add('hidden');
  }

  // Data match
  const dataMatch = analysis.data_match || {};
  const dataMatchContent = document.getElementById('dataMatchContent');
  const cardStatus = dataMatch.card_match
    ? `✓ Coincide (${dataMatch.extracted_card_last_four || '?'})`
    : (dataMatch.operator_card_last_four ? `✗ No coincide (${dataMatch.extracted_card_last_four || 'sin dato'} vs ${dataMatch.operator_card_last_four})` : '- Sin dato');
  dataMatchContent.innerHTML = `
    <div class="match-row">
      <span class="match-label">Nombre: <strong>${dataMatch.extracted_name || '-'}</strong></span>
      <span class="match-status ${dataMatch.name_match ? 'match-ok' : 'match-error'}">
        ${dataMatch.name_match ? '✓ Coincide' : '✗ No coincide'}
      </span>
    </div>
    <div class="match-row">
      <span class="match-label">DNI: <strong>${dataMatch.extracted_dni || '-'}</strong></span>
      <span class="match-status ${dataMatch.dni_match ? 'match-ok' : 'match-error'}">
        ${dataMatch.dni_match ? '✓ Coincide' : '✗ No coincide'}
      </span>
    </div>
    <div class="match-row">
      <span class="match-label">Tarjeta: <strong>${dataMatch.operator_card_last_four || 'No proporcionado'}</strong></span>
      <span class="match-status ${dataMatch.card_match ? 'match-ok' : 'match-warn'}">
        ${cardStatus}
      </span>
    </div>
  `;

  // Fraud signals
  const signals = analysis.fraud_signals || [];
  const fraudSection = document.getElementById('fraudSignalsSection');
  const fraudContent = document.getElementById('fraudSignalsContent');

  if (signals.length === 0) {
    fraudSection.classList.add('hidden');
  } else {
    fraudSection.classList.remove('hidden');
    fraudContent.innerHTML = signals.map(s => `
      <div class="fraud-signal">
        <div class="fraud-signal-header">
          <span class="fraud-signal-name">${formatSignalName(s.signal)}</span>
          <span class="fraud-signal-confidence">${s.confidence}%</span>
        </div>
        <div class="fraud-signal-desc">${s.description}</div>
      </div>
    `).join('');
  }
}

function setScoreBar(barId, textId, score) {
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);
  bar.style.width = score + '%';
  bar.className = 'score-bar';
  if (score >= 70) bar.classList.add('high');
  else if (score >= 40) bar.classList.add('medium');
  else bar.classList.add('low');
  text.textContent = score + '%';
}

function formatSignalName(signal) {
  const names = {
    font_mismatch: 'Fuentes inconsistentes',
    edge_tampering: 'Bordes alterados',
    photo_overlay: 'Superposición de imagen',
    resolution_anomaly: 'Anomalía de resolución',
    screen_capture: 'Captura de pantalla',
    text_inconsistency: 'Texto inconsistente',
    blur_anomaly: 'Anomalía de enfoque',
    name_mismatch: 'Nombre no coincide',
    dni_mismatch: 'DNI no coincide',
    analysis_error: 'Error de análisis'
  };
  return names[signal] || signal.replace(/_/g, ' ');
}

// Cargar análisis existente al abrir detalle
async function loadExistingAnalysis(verificationId) {
  try {
    const { data } = await supabaseClient
      .from('verification_analysis')
      .select('*')
      .eq('verification_id', verificationId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      renderAnalysis({
        overall_score: data.overall_score,
        dni_front_score: data.dni_front_score,
        dni_back_score: data.dni_back_score,
        dni_front_findings: data.dni_front_findings,
        dni_back_findings: data.dni_back_findings,
        card_photo_score: data.card_photo_score,
        card_photo_findings: data.card_photo_findings,
        recommendation: data.recommendation,
        fraud_signals: data.fraud_signals,
        data_match: data.data_match,
        data_consistency: data.data_consistency,
        summary: data.summary
      });
      document.getElementById('analysisResults').classList.remove('hidden');
    }
  } catch (err) {
    // No hay análisis previo, ignore
  }
}

// Event listener para botón de análisis
document.getElementById('analyzeBtn')?.addEventListener('click', analyzeVerification);

// ============================================
// INICIAR
// ============================================

checkAuth();

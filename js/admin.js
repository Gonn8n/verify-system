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
const linkText = document.getElementById('linkText');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const emailLinkBtn = document.getElementById('emailLinkBtn');
const whatsappLinkBtn = document.getElementById('whatsappLinkBtn');
const detailOverlay = document.getElementById('detailOverlay');
const closeDetail = document.getElementById('closeDetail');
const filterTabs = document.querySelectorAll('.filter-tab');
const toast = document.getElementById('toast');

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
    <div class="admin-card status-${v.status}" data-id="${v.id}">
      <div class="admin-card-header">
        <div>
          <div class="admin-card-name">${v.first_name} ${v.last_name}</div>
          <div class="admin-card-code">${v.unique_code}</div>
        </div>
        <span class="badge badge-${v.status.replace('in_review', 'review')}">${getStatusLabel(v.status)}</span>
      </div>
      <div class="admin-card-meta">
        <span>DNI: ${v.dni}</span>
        <span>${formatDate(v.created_at)}</span>
      </div>
      <div class="admin-card-actions">
        <button class="card-action-btn" data-action="copy" data-code="${v.unique_code}" data-name="${v.first_name}" data-email="${v.email}" title="Copiar link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="card-action-btn" data-action="whatsapp" data-code="${v.unique_code}" data-name="${v.first_name}" data-email="${v.email}" title="WhatsApp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>
        <button class="card-action-btn" data-action="email" data-code="${v.unique_code}" data-name="${v.first_name}" data-email="${v.email}" title="Email">
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
        navigator.clipboard.writeText(url);
        showToast('Link copiado');
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
    navigator.clipboard.writeText(url);
    showToast('Link copiado');
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
  document.getElementById('detailName').textContent = `${verification.first_name} ${verification.last_name}`;
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
    navigator.clipboard.writeText(verificationUrl);
    showToast('Link copiado');
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

  detailOverlay.classList.remove('hidden');
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

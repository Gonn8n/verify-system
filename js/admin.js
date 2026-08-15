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
    </div>
  `).join('');

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
  saveNewBtn.disabled = false;
  saveNewBtn.textContent = 'Crear Verificación';
});

closeNewModal.addEventListener('click', () => newModal.classList.add('hidden'));
cancelNewBtn.addEventListener('click', () => newModal.classList.add('hidden'));

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
      </div>
    `;
  } else {
    container.innerHTML = `<img src="${url}" alt="Documento">`;
  }
}

closeDetail.addEventListener('click', () => {
  detailOverlay.classList.add('hidden');
  currentDetailId = null;
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

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
    return `
    <div class="admin-card status-${v.status}" data-id="${v.id}">
      <div class="avatar">${initials || '?'}</div>
      <div class="admin-card-body">
        <div class="admin-card-header">
          <div>
            <div class="admin-card-name">${v.first_name} ${v.last_name}</div>
            <div class="admin-card-code">${v.unique_code}</div>
          </div>
          <span class="badge badge-dot badge-${v.status.replace('in_review', 'review')}">${getStatusLabel(v.status)}</span>
        </div>
        <div class="admin-card-meta">
          <span>DNI: ${v.dni}</span>
          <span>${formatDate(v.created_at)}</span>
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
    showToast('Error al crear verificación', 'error');
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
  
  showToast('Verificación creada exitosamente', 'success');
});

// ============================================
// BOTONES DE LINK
// ============================================

function setupLinkButtons(url, email, firstName) {
  // Copy
  copyLinkBtn.onclick = () => {
    navigator.clipboard.writeText(url);
    showToast('Link copiado', 'success');
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
  document.getElementById('detailStatusBadge').innerHTML = `<span class="badge badge-${verification.status.replace('in_review', 'review')}">${getStatusLabel(verification.status)}</span>`;
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
  document.getElementById('detailCopyBtn').onclick = () => {
    navigator.clipboard.writeText(verificationUrl);
    showToast('Link copiado', 'success');
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
    container.innerHTML = `
      <div class="video-preview-container">
        <video controls src="${url}"></video>
      </div>
    `;
  } else {
    const savedRotation = parseInt(localStorage.getItem('rotation_' + url) || '0', 10);
    const rotationStyle = savedRotation ? `transform: rotate(${savedRotation}deg);` : '';
    container.innerHTML = `
      <div class="image-preview-wrapper">
        <img src="${url}" alt="Documento" data-rotation="${savedRotation}" style="${rotationStyle}" onclick="openImageModal('${url}', parseInt(this.dataset.rotation || '0'))">
        <div class="media-actions">
          <button class="media-action-btn media-rotate" onclick="rotateMediaImage(this)" title="Rotar 90°">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>
          </button>
          <button class="media-action-btn media-zoom" onclick="openImageModal('${url}', parseInt(this.closest('.image-preview-wrapper').querySelector('img').dataset.rotation || '0'))" title="Ver tamaño completo">
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
  modal.innerHTML = `
    <div class="image-modal-content">
      <button class="image-modal-close" onclick="closeImageModal()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <img src="${url}" alt="Documento completo" style="${rotationStyle}">
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
        const { error } = await supabaseClient.rpc('delete_verification', { p_id: id });
        if (error) throw error;
        showToast('Verificación eliminada', 'success');
        closeDetailPanel();
        await loadVerifications();
      } catch (err) {
        console.error('Error deleting:', err);
        showToast('Error al eliminar', 'error');
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
    .single();

  if (!data) return;

  resultsDiv.classList.remove('hidden');

  // Score ring
  const score = data.score || 0;
  const scoreEl = document.getElementById('analysisScoreValue');
  const ringEl = document.getElementById('analysisScoreRing');
  scoreEl.textContent = score;
  ringEl.className = 'analysis-score-ring ' + (score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low');

  // Recommendation
  const recEl = document.getElementById('analysisRecommendation');
  const rec = data.recommendation || '';
  recEl.innerHTML = `<span class="rec-badge ${rec === 'LOW' ? 'rec-low' : rec === 'MEDIUM' ? 'rec-medium' : 'rec-high'}">${rec}</span>`;

  // Scores per document
  if (data.front_score != null) {
    document.getElementById('frontScore').style.width = data.front_score + '%';
    document.getElementById('frontScoreText').textContent = data.front_score + '%';
  }
  if (data.back_score != null) {
    document.getElementById('backScore').style.width = data.back_score + '%';
    document.getElementById('backScoreText').textContent = data.back_score + '%';
  }
  if (data.card_score != null) {
    document.getElementById('cardScore').style.width = data.card_score + '%';
    document.getElementById('cardScoreText').textContent = data.card_score + '%';
  }

  // Summary
  if (data.summary) {
    document.getElementById('summarySection').style.display = '';
    const summaryText = Array.isArray(data.summary) ? data.summary.join('\n') : String(data.summary);
    document.getElementById('summaryContent').innerHTML = `<ul class="summary-list">${summaryText.split('\n').filter(Boolean).map(l => `<li>${l}</li>`).join('')}</ul>`;
  }

  // Findings
  if (data.findings) {
    document.getElementById('findingsSection').style.display = '';
    const findingsText = Array.isArray(data.findings) ? data.findings.join('\n') : String(data.findings);
    document.getElementById('findingsContent').innerHTML = `<p style="font-size:0.85rem;color:var(--color-text);line-height:1.5;">${findingsText}</p>`;
  }

  // Data match
  if (data.data_consistency) {
    document.getElementById('dataMatchSection').style.display = '';
    const consistencyText = Array.isArray(data.data_consistency) ? data.data_consistency.join('\n') : String(data.data_consistency);
    document.getElementById('dataMatchContent').innerHTML = `<p style="font-size:0.85rem;color:var(--color-text);line-height:1.5;">${consistencyText}</p>`;
  }

  // Fraud signals
  if (data.fraud_signals) {
    document.getElementById('fraudSignalsSection').style.display = '';
    const fraudText = Array.isArray(data.fraud_signals) ? data.fraud_signals.join('\n') : String(data.fraud_signals);
    document.getElementById('fraudSignalsContent').innerHTML = `<p style="font-size:0.85rem;color:var(--color-text);line-height:1.5;">${fraudText}</p>`;
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
        .select('score')
        .eq('verification_id', verificationId)
        .single();

      if (data && data.score != null) {
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

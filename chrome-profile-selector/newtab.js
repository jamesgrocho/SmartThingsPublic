'use strict';

// ── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'chrome_profile_selector_v1';

function storageGet() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(STORAGE_KEY, (data) => resolve(data[STORAGE_KEY]));
    } else {
      try { resolve(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { resolve(null); }
    }
  });
}

function storageSet(value) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ [STORAGE_KEY]: value });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInitials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function randomColor() {
  const palette = [
    '#4285f4', '#ea4335', '#34a853', '#fbbc04',
    '#9c27b0', '#ff5722', '#00bcd4', '#607d8b',
    '#e91e63', '#3f51b5', '#009688', '#795548',
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

// Map cols value (1-4) to CSS grid-column span
function colsToSpan(cols) {
  const map = { 1: 1, 2: 2, 3: 3, 4: 4 };
  return map[cols] || 2;
}

// ── State ────────────────────────────────────────────────────────────────────

let profiles = [];
let editingId = null;
let dragSrcId = null;
let cardMouseTarget = null; // tracks which element mousedown landed on

const DEFAULT_PROFILES = [
  { id: uid(), name: 'Work',     image: null, color: '#4285f4', url: '', cols: 2 },
  { id: uid(), name: 'Personal', image: null, color: '#ea4335', url: '', cols: 2 },
  { id: uid(), name: 'Dev',      image: null, color: '#34a853', url: '', cols: 2 },
];

// ── Render ───────────────────────────────────────────────────────────────────

function render() {
  const grid = document.getElementById('grid');
  const emptyHint = document.getElementById('emptyHint');

  grid.innerHTML = '';

  if (profiles.length === 0) {
    emptyHint.style.display = 'block';
    return;
  }
  emptyHint.style.display = 'none';

  profiles.forEach((p) => grid.appendChild(buildCard(p)));
}

function buildCard(profile) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = profile.id;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Open ${profile.name} profile`);
  card.draggable = true;

  const span = colsToSpan(profile.cols);
  card.style.gridColumn = `span ${span}`;
  card.style.setProperty('--card-color', profile.color || '#4285f4');

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'card-avatar';
  if (profile.image) {
    avatar.style.backgroundImage = `url(${profile.image})`;
  } else {
    avatar.textContent = getInitials(profile.name);
  }

  // Name overlay
  const overlay = document.createElement('div');
  overlay.className = 'card-overlay';
  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.textContent = profile.name;
  overlay.appendChild(nameEl);

  // Controls bar
  const controls = document.createElement('div');
  controls.className = 'card-controls';

  const editBtn = document.createElement('button');
  editBtn.className = 'ctrl-btn';
  editBtn.title = 'Edit profile';
  editBtn.textContent = '✏ Edit';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'ctrl-btn danger';
  deleteBtn.title = 'Delete profile';
  deleteBtn.textContent = '✕';

  const sizeLabel = document.createElement('span');
  sizeLabel.style.cssText = 'color:rgba(255,255,255,0.5);font-size:0.7rem;white-space:nowrap;flex-shrink:0;';
  sizeLabel.textContent = '⇔';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'size-slider';
  slider.min = '1';
  slider.max = '4';
  slider.value = String(profile.cols);
  slider.title = 'Resize card';

  controls.appendChild(editBtn);
  controls.appendChild(deleteBtn);
  controls.appendChild(sizeLabel);
  controls.appendChild(slider);

  // Image drop hint
  const dropHint = document.createElement('div');
  dropHint.className = 'card-drop-hint';
  dropHint.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
    Drop image to set photo
  `;

  card.appendChild(avatar);
  card.appendChild(overlay);
  card.appendChild(controls);
  card.appendChild(dropHint);

  // ── Event: click to open profile ──
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-controls')) return;
    openProfile(profile);
  });

  card.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.card-controls')) {
      e.preventDefault();
      openProfile(profile);
    }
  });

  // ── Event: edit button ──
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(profile.id);
  });

  // ── Event: delete button ──
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteProfile(profile.id);
  });

  // ── Event: size slider ──
  slider.addEventListener('mousedown', (e) => e.stopPropagation());
  slider.addEventListener('click', (e) => e.stopPropagation());
  slider.addEventListener('input', (e) => {
    e.stopPropagation();
    const cols = parseInt(e.target.value, 10);
    const p = profiles.find((x) => x.id === profile.id);
    if (p) {
      p.cols = cols;
      card.style.gridColumn = `span ${colsToSpan(cols)}`;
      storageSet(profiles);
    }
  });

  // ── Drag: track mousedown target to prevent drag from controls ──
  card.addEventListener('mousedown', (e) => {
    cardMouseTarget = e.target;
  });

  // ── Drag: card reorder ──
  card.addEventListener('dragstart', (e) => {
    if (cardMouseTarget && cardMouseTarget.closest('.card-controls')) {
      e.preventDefault();
      return;
    }
    dragSrcId = profile.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', profile.id);
    requestAnimationFrame(() => card.classList.add('dragging'));
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.card').forEach((c) => {
      c.classList.remove('reorder-over', 'file-drag-over');
    });
  });

  // ── Drag: card reorder target / image file drop ──
  card.addEventListener('dragover', (e) => {
    e.preventDefault();

    const isFileDrag = e.dataTransfer.types.includes('Files');

    if (isFileDrag) {
      card.classList.add('file-drag-over');
      card.classList.remove('reorder-over');
      e.dataTransfer.dropEffect = 'copy';
    } else if (dragSrcId && dragSrcId !== profile.id) {
      card.classList.add('reorder-over');
      card.classList.remove('file-drag-over');
      e.dataTransfer.dropEffect = 'move';
    }
  });

  card.addEventListener('dragleave', (e) => {
    // Only remove if leaving the card entirely
    if (!card.contains(e.relatedTarget)) {
      card.classList.remove('reorder-over', 'file-drag-over');
    }
  });

  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('reorder-over', 'file-drag-over');

    // Image file drop
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        loadImageOntoCard(file, profile.id);
      }
      return;
    }

    // Card reorder
    if (dragSrcId && dragSrcId !== profile.id) {
      const srcIdx = profiles.findIndex((x) => x.id === dragSrcId);
      const dstIdx = profiles.findIndex((x) => x.id === profile.id);
      if (srcIdx !== -1 && dstIdx !== -1) {
        profiles.splice(dstIdx, 0, profiles.splice(srcIdx, 1)[0]);
        storageSet(profiles);
        render();
      }
    }
    dragSrcId = null;
  });

  return card;
}

// ── Profile actions ──────────────────────────────────────────────────────────

function openProfile(profile) {
  const url = profile.url || (
    typeof chrome !== 'undefined' && chrome.runtime
      ? chrome.runtime.getURL('newtab.html')
      : window.location.href
  );

  if (typeof chrome !== 'undefined' && chrome.windows) {
    chrome.windows.create({ url });
  } else {
    window.open(url, '_blank');
  }
}

function deleteProfile(id) {
  const p = profiles.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
  profiles = profiles.filter((x) => x.id !== id);
  storageSet(profiles);
  render();
}

function addProfile() {
  const p = {
    id: uid(),
    name: 'New Profile',
    image: null,
    color: randomColor(),
    url: '',
    cols: 2,
  };
  profiles.push(p);
  storageSet(profiles);
  render();
  openModal(p.id);
}

// ── Image loading ────────────────────────────────────────────────────────────

function loadImageOntoCard(file, profileId) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const p = profiles.find((x) => x.id === profileId);
    if (p) {
      p.image = ev.target.result;
      storageSet(profiles);
      render();
    }
  };
  reader.readAsDataURL(file);
}

function loadImageToModal(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('editImagePreview');
    const text = document.getElementById('editImageText');
    const removeBtn = document.getElementById('btnRemoveImg');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    text.style.display = 'none';
    removeBtn.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ── Modal ────────────────────────────────────────────────────────────────────

function openModal(id) {
  editingId = id;
  const p = profiles.find((x) => x.id === id);
  if (!p) return;

  document.getElementById('editName').value = p.name;
  document.getElementById('editUrl').value = p.url || '';
  document.getElementById('editColor').value = p.color || '#4285f4';

  const preview = document.getElementById('editImagePreview');
  const text = document.getElementById('editImageText');
  const removeBtn = document.getElementById('btnRemoveImg');

  if (p.image) {
    preview.src = p.image;
    preview.style.display = 'block';
    text.style.display = 'none';
    removeBtn.style.display = 'block';
  } else {
    preview.src = '';
    preview.style.display = 'none';
    text.style.display = 'flex';
    removeBtn.style.display = 'none';
  }

  document.getElementById('editImageFile').value = '';
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('editName').focus();
}

function saveModal() {
  const p = profiles.find((x) => x.id === editingId);
  if (!p) return;

  p.name = document.getElementById('editName').value.trim() || 'Profile';
  p.url = document.getElementById('editUrl').value.trim();
  p.color = document.getElementById('editColor').value;

  const preview = document.getElementById('editImagePreview');
  if (preview.style.display !== 'none' && preview.src) {
    p.image = preview.src;
  } else if (preview.style.display === 'none') {
    p.image = null;
  }

  storageSet(profiles);
  render();
  closeModal();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
}

function setupModal() {
  const overlay = document.getElementById('modalOverlay');
  const dropZone = document.getElementById('editImageDrop');
  const fileInput = document.getElementById('editImageFile');

  document.getElementById('btnSave').addEventListener('click', saveModal);
  document.getElementById('btnCancel').addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  // Remove image button
  document.getElementById('btnRemoveImg').addEventListener('click', (e) => {
    e.stopPropagation();
    const preview = document.getElementById('editImagePreview');
    const text = document.getElementById('editImageText');
    preview.src = '';
    preview.style.display = 'none';
    text.style.display = 'flex';
    e.currentTarget.style.display = 'none';
    fileInput.value = '';
  });

  // Click to upload
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) loadImageToModal(file);
  });

  // Drag & drop into modal drop zone
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
  });
  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('active');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageToModal(file);
  });
}

// ── Global drop guard ────────────────────────────────────────────────────────
// Prevent browser from navigating when a file is dropped outside a card

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await storageGet();
  profiles = Array.isArray(stored) ? stored : DEFAULT_PROFILES;
  storageSet(profiles);

  setupModal();

  document.getElementById('btnAdd').addEventListener('click', addProfile);

  render();
}

document.addEventListener('DOMContentLoaded', init);

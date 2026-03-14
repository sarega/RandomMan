const adminState = {
  data: null,
};

const adminElements = {
  status: document.getElementById('admin-status'),
  settingsForm: document.getElementById('settings-form'),
  titleInput: document.getElementById('title-input'),
  subtitleInput: document.getElementById('subtitle-input'),
  adminNoteInput: document.getElementById('admin-note-input'),
  resultModeInput: document.getElementById('result-mode-input'),
  primaryColorInput: document.getElementById('primary-color-input'),
  accentColorInput: document.getElementById('accent-color-input'),
  surfaceColorInput: document.getElementById('surface-color-input'),
  backgroundColorInput: document.getElementById('background-color-input'),
  textColorInput: document.getElementById('text-color-input'),
  logoImageInput: document.getElementById('logo-image-input'),
  heroImageInput: document.getElementById('hero-image-input'),
  defaultMinInput: document.getElementById('default-min-input'),
  defaultMaxInput: document.getElementById('default-max-input'),
  logoUploadInput: document.getElementById('logo-upload-input'),
  heroUploadInput: document.getElementById('hero-upload-input'),
  uploadLogoButton: document.getElementById('upload-logo-button'),
  uploadHeroButton: document.getElementById('upload-hero-button'),
  openPlayLink: document.getElementById('open-play-link'),
  copyPlayLink: document.getElementById('copy-play-link'),
  adminSessionCode: document.getElementById('admin-session-code'),
  adminPlayLink: document.getElementById('admin-play-link'),
  sessionQrImage: document.getElementById('session-qr-image'),
  regenerateSession: document.getElementById('regenerate-session'),
  textList: document.getElementById('text-list'),
  addTextButton: document.getElementById('add-text-button'),
  imageLinkForm: document.getElementById('image-link-form'),
  imageTitleInput: document.getElementById('image-title-input'),
  imageUrlInput: document.getElementById('image-url-input'),
  poolImageTitleInput: document.getElementById('pool-image-title-input'),
  poolImageUploadInput: document.getElementById('pool-image-upload-input'),
  uploadPoolImageButton: document.getElementById('upload-pool-image-button'),
  imageGrid: document.getElementById('image-grid'),
  history: document.getElementById('admin-history'),
  logoPreview: document.getElementById('admin-logo-preview'),
  heroPreview: document.getElementById('admin-hero-preview'),
};

document.addEventListener('DOMContentLoaded', () => {
  bindAdminEvents();
  initializeAdmin();
});

function bindAdminEvents() {
  adminElements.settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveSettings();
  });

  adminElements.uploadLogoButton.addEventListener('click', async () => {
    await uploadBranding('logoImage', adminElements.logoUploadInput.files[0]);
  });

  adminElements.uploadHeroButton.addEventListener('click', async () => {
    await uploadBranding('heroImage', adminElements.heroUploadInput.files[0]);
  });

  adminElements.copyPlayLink.addEventListener('click', async () => {
    if (!adminState.data?.liveSession?.playUrl) {
      return;
    }

    await navigator.clipboard.writeText(adminState.data.liveSession.playUrl);
    showStatus('Copied play link', 'success');
  });

  adminElements.regenerateSession.addEventListener('click', async () => {
    const response = await fetch('/api/admin/session/regenerate', {
      method: 'POST',
    });
    const data = await response.json();
    adminState.data = data;
    renderAdmin();
    showStatus('Created a new live room and QR code', 'success');
  });

  adminElements.addTextButton.addEventListener('click', () => {
    if (!adminState.data) {
      return;
    }

    adminState.data.pools.texts.push({
      id: crypto.randomUUID(),
      value: '',
    });
    renderTextList();
  });

  adminElements.textList.addEventListener('input', (event) => {
    const field = event.target.closest('[data-text-id]');

    if (!field || !adminState.data) {
      return;
    }

    const item = adminState.data.pools.texts.find(
      (entry) => entry.id === field.dataset.textId
    );

    if (item) {
      item.value = field.value;
    }
  });

  adminElements.textList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-text]');

    if (!button || !adminState.data) {
      return;
    }

    adminState.data.pools.texts = adminState.data.pools.texts.filter(
      (item) => item.id !== button.dataset.removeText
    );
    renderTextList();
  });

  adminElements.imageLinkForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await addImageLink();
  });

  adminElements.uploadPoolImageButton.addEventListener('click', async () => {
    await uploadPoolImage(adminElements.poolImageUploadInput.files[0]);
  });

  adminElements.imageGrid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-image]');

    if (!button) {
      return;
    }

    const response = await fetch(
      `/api/admin/images/${encodeURIComponent(button.dataset.removeImage)}`,
      {
        method: 'DELETE',
      }
    );
    const data = await response.json();
    adminState.data = data;
    renderAdmin();
    showStatus('Removed image from pool', 'success');
  });
}

async function initializeAdmin() {
  await loadAdminState();
  window.setInterval(loadAdminHistory, 5000);
}

async function loadAdminState() {
  const response = await fetch('/api/admin/state');
  const data = await response.json();
  adminState.data = data;
  renderAdmin();
}

function renderAdmin() {
  if (!adminState.data) {
    return;
  }

  const { settings, pools, liveSession } = adminState.data;

  document.documentElement.style.setProperty(
    '--primary-color',
    settings.theme.primaryColor
  );
  document.documentElement.style.setProperty(
    '--accent-color',
    settings.theme.accentColor
  );
  document.documentElement.style.setProperty(
    '--surface-color',
    settings.theme.surfaceColor
  );
  document.documentElement.style.setProperty(
    '--background-color',
    settings.theme.backgroundColor
  );
  document.documentElement.style.setProperty(
    '--text-color',
    settings.theme.textColor
  );

  adminElements.titleInput.value = settings.title;
  adminElements.subtitleInput.value = settings.subtitle;
  adminElements.adminNoteInput.value = settings.adminNote;
  adminElements.resultModeInput.value = settings.resultMode || 'text';
  adminElements.primaryColorInput.value = settings.theme.primaryColor;
  adminElements.accentColorInput.value = settings.theme.accentColor;
  adminElements.surfaceColorInput.value = settings.theme.surfaceColor;
  adminElements.backgroundColorInput.value = settings.theme.backgroundColor;
  adminElements.textColorInput.value = settings.theme.textColor;
  adminElements.logoImageInput.value = settings.logoImage;
  adminElements.heroImageInput.value = settings.heroImage;
  adminElements.defaultMinInput.value = String(pools.numbers.defaultMin);
  adminElements.defaultMaxInput.value = String(pools.numbers.defaultMax);

  togglePreview(adminElements.logoPreview, settings.logoImage);
  togglePreview(adminElements.heroPreview, settings.heroImage);

  adminElements.adminSessionCode.textContent = liveSession.code;
  adminElements.adminPlayLink.href = liveSession.playUrl;
  adminElements.adminPlayLink.textContent = liveSession.playUrl;
  adminElements.openPlayLink.href = liveSession.playUrl;
  adminElements.sessionQrImage.src = `${liveSession.qrUrl}?v=${encodeURIComponent(
    liveSession.createdAt
  )}`;

  renderTextList();
  renderImageGrid();
  renderHistory(adminState.data.recentDraws);
}

function togglePreview(element, src) {
  if (src) {
    element.src = src;
    element.classList.remove('hidden');
    return;
  }

  element.removeAttribute('src');
  element.classList.add('hidden');
}

function renderTextList() {
  adminElements.textList.innerHTML = '';

  if (!adminState.data?.pools?.texts?.length) {
    const empty = document.createElement('div');
    empty.className = 'text-item';
    empty.innerHTML = `
      <textarea disabled>ยังไม่มีข้อความในคลัง</textarea>
      <button class="text-delete" type="button" disabled>Empty</button>
    `;
    adminElements.textList.append(empty);
    return;
  }

  adminState.data.pools.texts.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'text-item';

    const field = document.createElement('textarea');
    field.dataset.textId = item.id;
    field.rows = 3;
    field.value = item.value;
    field.placeholder = `ข้อความที่ ${index + 1}`;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'text-delete';
    removeButton.dataset.removeText = item.id;
    removeButton.textContent = 'Remove';

    wrapper.append(field, removeButton);
    adminElements.textList.append(wrapper);
  });
}

function renderImageGrid() {
  adminElements.imageGrid.innerHTML = '';

  if (!adminState.data.pools.images.length) {
    const empty = document.createElement('div');
    empty.className = 'image-card';
    empty.innerHTML = `
      <div class="image-meta">
        <strong>ยังไม่มีรูปในคลัง</strong>
        <span class="history-subtitle">อัปโหลดรูปหรือเพิ่ม URL เพื่อเปิดโหมด Image</span>
      </div>
    `;
    adminElements.imageGrid.append(empty);
    return;
  }

  adminState.data.pools.images.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'image-card';

    const image = document.createElement('img');
    image.src = item.path;
    image.alt = item.title;

    const meta = document.createElement('div');
    meta.className = 'image-meta';

    const title = document.createElement('strong');
    title.textContent = item.title;

    const source = document.createElement('span');
    source.className = 'history-subtitle';
    source.textContent = item.source;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'image-delete';
    removeButton.dataset.removeImage = item.id;
    removeButton.textContent = 'Remove';

    meta.append(title, source);
    card.append(image, meta, removeButton);
    adminElements.imageGrid.append(card);
  });
}

async function saveSettings() {
  const payload = {
    title: adminElements.titleInput.value,
    subtitle: adminElements.subtitleInput.value,
    adminNote: adminElements.adminNoteInput.value,
    resultMode: adminElements.resultModeInput.value,
    heroImage: adminElements.heroImageInput.value.trim(),
    logoImage: adminElements.logoImageInput.value.trim(),
    defaultMin: adminElements.defaultMinInput.value,
    defaultMax: adminElements.defaultMaxInput.value,
    theme: {
      primaryColor: adminElements.primaryColorInput.value,
      accentColor: adminElements.accentColorInput.value,
      surfaceColor: adminElements.surfaceColorInput.value,
      backgroundColor: adminElements.backgroundColorInput.value,
      textColor: adminElements.textColorInput.value,
    },
    texts: adminState.data.pools.texts,
  };
  const response = await fetch('/api/admin/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    showStatus(data.error || 'Save failed');
    return;
  }

  adminState.data = data;
  renderAdmin();
  showStatus('Saved admin settings', 'success');
}

async function uploadBranding(slot, file) {
  if (!file) {
    showStatus('Choose an image first');
    return;
  }

  const formData = new FormData();
  formData.append('slot', slot);
  formData.append('image', file);

  const response = await fetch('/api/admin/upload/branding', {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) {
    showStatus(data.error || 'Upload failed');
    return;
  }

  adminState.data = data.state;
  renderAdmin();
  showStatus(`Uploaded ${slot}`, 'success');
}

async function addImageLink() {
  const response = await fetch('/api/admin/images/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: adminElements.imageTitleInput.value,
      imageUrl: adminElements.imageUrlInput.value,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    showStatus(data.error || 'Could not add image');
    return;
  }

  adminState.data = data;
  adminElements.imageTitleInput.value = '';
  adminElements.imageUrlInput.value = '';
  renderAdmin();
  showStatus('Added image URL to pool', 'success');
}

async function uploadPoolImage(file) {
  if (!file) {
    showStatus('Choose an image for the pool');
    return;
  }

  const formData = new FormData();
  formData.append('title', adminElements.poolImageTitleInput.value);
  formData.append('image', file);

  const response = await fetch('/api/admin/upload/pool-image', {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) {
    showStatus(data.error || 'Upload failed');
    return;
  }

  adminState.data = data;
  adminElements.poolImageTitleInput.value = '';
  adminElements.poolImageUploadInput.value = '';
  renderAdmin();
  showStatus('Uploaded image into random pool', 'success');
}

async function loadAdminHistory() {
  if (!adminState.data?.liveSession?.code) {
    return;
  }

  const response = await fetch(
    `/api/draws?session=${encodeURIComponent(adminState.data.liveSession.code)}`
  );
  const data = await response.json();
  renderHistory(data.draws);
}

function renderHistory(draws) {
  adminElements.history.innerHTML = '';

  if (!draws.length) {
    const empty = document.createElement('div');
    empty.className = 'history-card';
    empty.innerHTML = `
      <div class="history-icon">?</div>
      <div>
        <div class="history-title">ยังไม่มีผลลัพธ์ในห้องนี้</div>
        <div class="history-subtitle">สร้าง QR แล้วให้ผู้เล่นเริ่มสุ่มได้เลย</div>
      </div>
      <div class="history-time">Ready</div>
    `;
    adminElements.history.append(empty);
    return;
  }

  draws.forEach((draw) => {
    const card = document.createElement('article');
    card.className = 'history-card';

    const icon = document.createElement('div');
    icon.className = 'history-icon';
    icon.textContent = draw.category === 'combo' ? '+' : 'R';

    const body = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = `${draw.playerName} • ${draw.result.label}`;
    const subtitle = document.createElement('div');
    subtitle.className = 'history-subtitle';
    subtitle.textContent = draw.sourceLabel;
    body.append(title, subtitle);

    const time = document.createElement('div');
    time.className = 'history-time';
    time.textContent = formatTime(draw.createdAt);

    card.append(icon, body, time);
    adminElements.history.append(card);
  });
}

function showStatus(message, type = 'warning') {
  adminElements.status.textContent = message;
  adminElements.status.classList.remove('hidden');
  adminElements.status.style.background =
    type === 'success' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(251, 191, 36, 0.16)';
  adminElements.status.style.color =
    type === 'success' ? '#065f46' : '#7c2d12';
}

function formatTime(value) {
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

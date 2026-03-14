const state = {
  config: null,
  sessionCode: '',
  cooldownUntil: 0,
  cooldownTimerId: null,
  isDrawing: false,
};

const COOLDOWN_MS = 60 * 1000;

const elements = {
  title: document.getElementById('play-title'),
  warning: document.getElementById('play-warning'),
  drawButton: document.getElementById('draw-button'),
  resultPlaceholder: document.getElementById('result-placeholder'),
  resultBody: document.getElementById('result-body'),
  resultKicker: document.getElementById('result-kicker'),
  resultValue: document.getElementById('result-value'),
  resultImage: document.getElementById('result-image'),
  resultDetail: document.getElementById('result-detail'),
};

document.addEventListener('DOMContentLoaded', () => {
  initialize();
});

async function initialize() {
  elements.drawButton.addEventListener('click', drawRandom);
  await loadConfig();
  syncCooldownState();
  updateButtonState();
}

async function loadConfig() {
  const query = new URLSearchParams(window.location.search);
  const requestedSession = query.get('session') || '';
  const response = await fetch(
    `/api/config${requestedSession ? `?session=${encodeURIComponent(requestedSession)}` : ''}`
  );
  const config = await response.json();

  state.config = config;
  state.sessionCode = requestedSession || config.liveSession.code;

  if (!requestedSession) {
    const url = new URL(window.location.href);
    url.searchParams.set('session', config.liveSession.code);
    window.history.replaceState({}, '', url);
    state.sessionCode = config.liveSession.code;
  }

  renderConfig();
}

function renderConfig() {
  const { settings, requestedSession } = state.config;

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

  document.title = settings.title;
  elements.title.textContent = settings.title;

  const staleMessage = requestedSession.active
    ? ''
    : 'ลิงก์หรือ QR นี้หมดอายุแล้ว กรุณาขอลิงก์ใหม่จากแอดมิน';

  elements.warning.textContent = staleMessage;
  elements.warning.classList.toggle('hidden', !staleMessage);
  updateButtonState();
}

async function drawRandom() {
  if (state.isDrawing || !state.config?.requestedSession?.active) {
    return;
  }

  if (state.cooldownUntil > Date.now()) {
    updateButtonState();
    return;
  }

  try {
    state.isDrawing = true;
    updateButtonState();

    const response = await fetch('/api/draw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionCode: state.sessionCode,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Draw failed');
    }

    renderResult(data.draw);
    elements.warning.classList.add('hidden');
    startCooldown();
  } catch (error) {
    elements.warning.textContent = error.message;
    elements.warning.classList.remove('hidden');
  } finally {
    state.isDrawing = false;
    updateButtonState();
  }
}

function renderResult(draw) {
  elements.resultPlaceholder.classList.add('hidden');
  elements.resultBody.classList.remove('hidden');
  elements.resultKicker.textContent =
    draw.primaryResult.kind === 'number' ? 'Lucky Number' : 'Lucky Text';
  elements.resultValue.textContent = draw.primaryResult.label;
  elements.resultDetail.textContent = `Image: ${draw.imageResult.label}`;
  elements.resultImage.src = draw.imageResult.imageUrl;
}

function getCooldownStorageKey() {
  return `randomman-cooldown:${state.sessionCode}`;
}

function syncCooldownState() {
  if (!state.sessionCode) {
    return;
  }

  const rawValue = window.localStorage.getItem(getCooldownStorageKey());
  const parsedValue = Number(rawValue || 0);

  state.cooldownUntil =
    Number.isFinite(parsedValue) && parsedValue > Date.now() ? parsedValue : 0;

  if (!state.cooldownUntil) {
    window.localStorage.removeItem(getCooldownStorageKey());
  }

  startCooldownTicker();
}

function startCooldown() {
  state.cooldownUntil = Date.now() + COOLDOWN_MS;
  window.localStorage.setItem(
    getCooldownStorageKey(),
    String(state.cooldownUntil)
  );
  startCooldownTicker();
}

function startCooldownTicker() {
  if (state.cooldownTimerId) {
    window.clearInterval(state.cooldownTimerId);
    state.cooldownTimerId = null;
  }

  if (!state.cooldownUntil) {
    updateButtonState();
    return;
  }

  updateButtonState();
  state.cooldownTimerId = window.setInterval(() => {
    if (state.cooldownUntil <= Date.now()) {
      state.cooldownUntil = 0;
      window.localStorage.removeItem(getCooldownStorageKey());
      window.clearInterval(state.cooldownTimerId);
      state.cooldownTimerId = null;
    }

    updateButtonState();
  }, 1000);
}

function updateButtonState() {
  if (state.isDrawing) {
    elements.drawButton.disabled = true;
    elements.drawButton.textContent = 'Drawing...';
    return;
  }

  if (!state.config?.requestedSession?.active) {
    elements.drawButton.disabled = true;
    elements.drawButton.textContent = 'Link Expired';
    return;
  }

  const remainingMs = state.cooldownUntil - Date.now();

  if (remainingMs > 0) {
    elements.drawButton.disabled = true;
    elements.drawButton.textContent = `Random in ${formatRemainingTime(remainingMs)}`;
    return;
  }

  elements.drawButton.disabled = false;
  elements.drawButton.textContent = 'Random';
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

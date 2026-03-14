const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const MAX_DRAW_HISTORY = 400;

const DEFAULT_TEXTS = [
  'วันนี้คุณจะได้ข่าวดี',
  'โอกาสใหม่กำลังเปิดขึ้น',
  'จังหวะทองอยู่ในรอบนี้',
  'ทีมของคุณกำลังไปถูกทาง',
  'โชคพิเศษกำลังเดินเข้ามา',
  'พักอีกนิดแล้วรางวัลจะมา',
  'คำตอบอยู่ใกล้กว่าที่คิด',
  'ลองเริ่มสิ่งใหม่ในวันนี้',
  'มีคนกำลังส่งพลังดี ๆ ให้คุณ',
  'รอบนี้อาจเป็นแจ็กพอตของคุณ',
];

const DEFAULT_IMAGES = [
  {
    id: 'seed-starburst',
    title: 'Star Burst',
    path: '/assets/starburst.svg',
    source: 'seed',
  },
  {
    id: 'seed-lucky-wheel',
    title: 'Lucky Wheel',
    path: '/assets/lucky-wheel.svg',
    source: 'seed',
  },
  {
    id: 'seed-jackpot-ticket',
    title: 'Jackpot Ticket',
    path: '/assets/jackpot-ticket.svg',
    source: 'seed',
  },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureRuntimePaths() {
  ensureDir(DATA_DIR);
  ensureDir(UPLOADS_DIR);
}

function createSessionCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  while (code.length < 6) {
    const index = crypto.randomInt(0, alphabet.length);
    code += alphabet[index];
  }

  return code;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function buildDefaultStore() {
  return {
    settings: {
      title: 'RandomMan Jackpot',
      subtitle: 'สุ่มตัวเลข ข้อความ และรูปภาพ พร้อมเล่นพร้อมกันทั้งห้อง',
      adminNote: 'ส่ง QR ให้ผู้เล่นเข้ามาเล่นรอบเดียวกันได้ทันที',
      resultMode: 'text',
      heroImage: '',
      logoImage: '',
      theme: {
        primaryColor: '#ff7a18',
        accentColor: '#0f172a',
        surfaceColor: '#fff7ed',
        backgroundColor: '#fff4d6',
        textColor: '#24140a',
      },
    },
    pools: {
      numbers: {
        defaultMin: 1,
        defaultMax: 10,
      },
      texts: DEFAULT_TEXTS.map((value, index) => ({
        id: `seed-text-${index + 1}`,
        value,
      })),
      images: DEFAULT_IMAGES,
    },
    liveSession: {
      code: 'LUCKY10',
      createdAt: new Date().toISOString(),
    },
    draws: [],
  };
}

function clampString(value, fallback = '', maxLength = 240) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim().slice(0, maxLength);
}

function normalizeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTextItems(items) {
  if (!Array.isArray(items)) {
    return buildDefaultStore().pools.texts;
  }

  const normalized = items
    .map((item) => {
      if (typeof item === 'string') {
        return {
          id: createId('text'),
          value: clampString(item, '', 240),
        };
      }

      return {
        id: clampString(item?.id, createId('text'), 80),
        value: clampString(item?.value, '', 240),
      };
    })
    .filter((item) => item.value);

  return normalized;
}

function normalizeImageItems(items) {
  if (!Array.isArray(items)) {
    return DEFAULT_IMAGES.map((item) => ({ ...item }));
  }

  return items
    .map((item) => ({
      id: clampString(item?.id, createId('image'), 80),
      title: clampString(item?.title, 'Lucky image', 120),
      path: clampString(item?.path, '', 400),
      source: clampString(item?.source, 'upload', 40),
    }))
    .filter((item) => item.path);
}

function normalizeStore(input) {
  const defaults = buildDefaultStore();
  const theme = {
    ...defaults.settings.theme,
    ...(input?.settings?.theme || {}),
  };
  const defaultMin = normalizeInteger(
    input?.pools?.numbers?.defaultMin,
    defaults.pools.numbers.defaultMin
  );
  const defaultMax = normalizeInteger(
    input?.pools?.numbers?.defaultMax,
    defaults.pools.numbers.defaultMax
  );

  return {
    settings: {
      title: clampString(input?.settings?.title, defaults.settings.title, 80),
      subtitle: clampString(
        input?.settings?.subtitle,
        defaults.settings.subtitle,
        180
      ),
      adminNote: clampString(
        input?.settings?.adminNote,
        defaults.settings.adminNote,
        180
      ),
      resultMode:
        clampString(input?.settings?.resultMode, defaults.settings.resultMode, 16) ===
        'number'
          ? 'number'
          : 'text',
      heroImage: clampString(input?.settings?.heroImage, '', 400),
      logoImage: clampString(input?.settings?.logoImage, '', 400),
      theme: {
        primaryColor: clampString(
          theme.primaryColor,
          defaults.settings.theme.primaryColor,
          40
        ),
        accentColor: clampString(
          theme.accentColor,
          defaults.settings.theme.accentColor,
          40
        ),
        surfaceColor: clampString(
          theme.surfaceColor,
          defaults.settings.theme.surfaceColor,
          40
        ),
        backgroundColor: clampString(
          theme.backgroundColor,
          defaults.settings.theme.backgroundColor,
          40
        ),
        textColor: clampString(
          theme.textColor,
          defaults.settings.theme.textColor,
          40
        ),
      },
    },
    pools: {
      numbers: {
        defaultMin: Math.min(defaultMin, defaultMax),
        defaultMax: Math.max(defaultMin, defaultMax),
      },
      texts: normalizeTextItems(input?.pools?.texts),
      images: normalizeImageItems(input?.pools?.images),
    },
    liveSession: {
      code: clampString(
        input?.liveSession?.code,
        defaults.liveSession.code,
        24
      ).toUpperCase(),
      createdAt: clampString(
        input?.liveSession?.createdAt,
        defaults.liveSession.createdAt,
        60
      ),
    },
    draws: Array.isArray(input?.draws)
      ? input.draws.slice(-MAX_DRAW_HISTORY)
      : [],
  };
}

function ensureStoreFile() {
  ensureRuntimePaths();

  if (!fs.existsSync(STORE_FILE)) {
    const seed = buildDefaultStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify(seed, null, 2));
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = normalizeStore(JSON.parse(raw));
    fs.writeFileSync(STORE_FILE, JSON.stringify(parsed, null, 2));
  } catch (error) {
    const fallback = buildDefaultStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify(fallback, null, 2));
  }
}

function readStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(STORE_FILE, 'utf8');
  return normalizeStore(JSON.parse(raw));
}

function writeStore(store) {
  const normalized = normalizeStore(store);
  fs.writeFileSync(STORE_FILE, JSON.stringify(normalized, null, 2));
  return normalized;
}

function buildBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${protocol}://${req.get('host')}`;
}

function buildPlayUrl(req, code) {
  return `${buildBaseUrl(req)}/?session=${encodeURIComponent(code)}`;
}

function recentDraws(store, sessionCode, limit = 14) {
  return store.draws
    .filter((draw) => draw.sessionCode === sessionCode)
    .slice(-limit)
    .reverse();
}

function buildPublicState(store, req, requestedSessionCode = '') {
  const sessionCode = clampString(
    requestedSessionCode,
    store.liveSession.code,
    24
  ).toUpperCase();

  return {
    settings: store.settings,
    pools: {
      numbers: store.pools.numbers,
      textCount: store.pools.texts.length,
      imageCount: store.pools.images.length,
    },
    liveSession: {
      ...store.liveSession,
      playUrl: buildPlayUrl(req, store.liveSession.code),
      qrUrl: `/api/session/${encodeURIComponent(store.liveSession.code)}/qr`,
    },
    requestedSession: {
      code: sessionCode,
      active: sessionCode === store.liveSession.code,
    },
    recentDraws: recentDraws(store, sessionCode),
  };
}

function buildAdminState(store, req) {
  return {
    settings: store.settings,
    pools: store.pools,
    liveSession: {
      ...store.liveSession,
      playUrl: buildPlayUrl(req, store.liveSession.code),
      qrUrl: `/api/session/${encodeURIComponent(store.liveSession.code)}/qr`,
    },
    recentDraws: recentDraws(store, store.liveSession.code, 18),
  };
}

function pickRandom(array) {
  return array[crypto.randomInt(0, array.length)];
}

function createNumberPool(store) {
  const values = [];

  for (
    let current = store.pools.numbers.defaultMin;
    current <= store.pools.numbers.defaultMax;
    current += 1
  ) {
    values.push(current);
  }

  return {
    values,
    sourceLabel: `Default range ${store.pools.numbers.defaultMin}-${store.pools.numbers.defaultMax}`,
  };
}

function createPrimaryResult(store) {
  const mode = store.settings.resultMode === 'number' ? 'number' : 'text';

  if (mode === 'text' && store.pools.texts.length > 0) {
    const item = pickRandom(store.pools.texts);

    return {
      kind: 'text',
      label: item.value,
      detail: 'ข้อความจากคลังคำสั่ง',
      sourceLabel: 'Text pool',
    };
  }

  const numberPool = createNumberPool(store);

  if (numberPool.values.length === 0) {
    throw new Error('Number pool is empty');
  }

  const value = pickRandom(numberPool.values);

  return {
    kind: 'number',
    label: String(value),
    detail:
      mode === 'text' ? 'ข้อความว่างอยู่ จึงใช้ตัวเลขแทน' : 'ตัวเลขสุ่ม',
    sourceLabel: numberPool.sourceLabel,
  };
}

function createImageResult(store) {
  if (store.pools.images.length === 0) {
    throw new Error('Image pool is empty');
  }

  const item = pickRandom(store.pools.images);

  return {
    label: item.title || 'Lucky image',
    imageUrl: item.path,
    detail: 'รูปภาพจากคลังกราฟิก',
    sourceLabel: 'Image pool',
  };
}

ensureStoreFile();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, UPLOADS_DIR);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname) || '.png';
      const safeExtension = extension.replace(/[^a-zA-Z0-9.]/g, '') || '.png';
      callback(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
    },
  }),
  limits: {
    fileSize: 6 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image files are allowed'));
      return;
    }

    callback(null, true);
  },
});

const app = express();

app.set('trust proxy', true);
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

app.get('/admin', (_req, res) => {
  res.redirect('/admin.html');
});

app.get('/api/config', (req, res) => {
  const store = readStore();
  const requestedSession = clampString(req.query.session, '', 24);
  res.json(buildPublicState(store, req, requestedSession));
});

app.get('/api/admin/state', (req, res) => {
  const store = readStore();
  res.json(buildAdminState(store, req));
});

app.post('/api/admin/save', (req, res) => {
  const store = readStore();
  const payload = req.body || {};
  const incomingMin = normalizeInteger(
    payload?.defaultMin,
    store.pools.numbers.defaultMin
  );
  const incomingMax = normalizeInteger(
    payload?.defaultMax,
    store.pools.numbers.defaultMax
  );

  store.settings = {
    ...store.settings,
    title: clampString(payload?.title, store.settings.title, 80),
    subtitle: clampString(payload?.subtitle, store.settings.subtitle, 180),
    adminNote: clampString(payload?.adminNote, store.settings.adminNote, 180),
    resultMode:
      clampString(payload?.resultMode, store.settings.resultMode, 16) === 'number'
        ? 'number'
        : 'text',
    heroImage: clampString(payload?.heroImage, '', 400),
    logoImage: clampString(payload?.logoImage, '', 400),
    theme: {
      primaryColor: clampString(
        payload?.theme?.primaryColor,
        store.settings.theme.primaryColor,
        40
      ),
      accentColor: clampString(
        payload?.theme?.accentColor,
        store.settings.theme.accentColor,
        40
      ),
      surfaceColor: clampString(
        payload?.theme?.surfaceColor,
        store.settings.theme.surfaceColor,
        40
      ),
      backgroundColor: clampString(
        payload?.theme?.backgroundColor,
        store.settings.theme.backgroundColor,
        40
      ),
      textColor: clampString(
        payload?.theme?.textColor,
        store.settings.theme.textColor,
        40
      ),
    },
  };
  store.pools.numbers = {
    defaultMin: Math.min(incomingMin, incomingMax),
    defaultMax: Math.max(incomingMin, incomingMax),
  };
  store.pools.texts = normalizeTextItems(payload?.texts);

  const saved = writeStore(store);
  res.json(buildAdminState(saved, req));
});

app.post(
  '/api/admin/upload/branding',
  upload.single('image'),
  (req, res) => {
    const slot = clampString(req.body?.slot, '', 40);

    if (!req.file || !['heroImage', 'logoImage'].includes(slot)) {
      res.status(400).json({ error: 'Missing file or invalid slot' });
      return;
    }

    const store = readStore();
    store.settings[slot] = `/uploads/${req.file.filename}`;
    const saved = writeStore(store);

    res.json({
      path: store.settings[slot],
      state: buildAdminState(saved, req),
    });
  }
);

app.post('/api/admin/images/link', (req, res) => {
  const store = readStore();
  const title = clampString(req.body?.title, 'Linked image', 120);
  const imageUrl = clampString(req.body?.imageUrl, '', 400);

  if (!imageUrl) {
    res.status(400).json({ error: 'Image URL is required' });
    return;
  }

  store.pools.images.push({
    id: createId('image'),
    title,
    path: imageUrl,
    source: 'link',
  });
  const saved = writeStore(store);

  res.json(buildAdminState(saved, req));
});

app.post('/api/admin/upload/pool-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Image file is required' });
    return;
  }

  const store = readStore();
  store.pools.images.push({
    id: createId('image'),
    title: clampString(req.body?.title, req.file.originalname, 120),
    path: `/uploads/${req.file.filename}`,
    source: 'upload',
  });
  const saved = writeStore(store);

  res.json(buildAdminState(saved, req));
});

app.delete('/api/admin/images/:imageId', (req, res) => {
  const imageId = clampString(req.params.imageId, '', 80);
  const store = readStore();
  store.pools.images = store.pools.images.filter((item) => item.id !== imageId);
  const saved = writeStore(store);
  res.json(buildAdminState(saved, req));
});

app.post('/api/admin/session/regenerate', (req, res) => {
  const store = readStore();
  store.liveSession = {
    code: createSessionCode(),
    createdAt: new Date().toISOString(),
  };
  const saved = writeStore(store);
  res.json(buildAdminState(saved, req));
});

app.get('/api/draws', (req, res) => {
  const store = readStore();
  const sessionCode = clampString(
    req.query.session,
    store.liveSession.code,
    24
  ).toUpperCase();

  res.json({
    sessionCode,
    active: sessionCode === store.liveSession.code,
    draws: recentDraws(store, sessionCode, 18),
  });
});

app.post('/api/draw', (req, res) => {
  const store = readStore();
  const sessionCode = clampString(req.body?.sessionCode, '', 24).toUpperCase();

  if (!sessionCode || sessionCode !== store.liveSession.code) {
    res.status(400).json({
      error: 'This QR/session is no longer active. Ask admin for a new link.',
    });
    return;
  }

  try {
    const primaryResult = createPrimaryResult(store);
    const imageResult = createImageResult(store);
    const playerName = clampString(
      req.body?.playerName,
      'Anonymous Player',
      60
    );
    const entry = {
      id: createId('draw'),
      sessionCode,
      playerName,
      category: 'combo',
      primaryResult,
      imageResult,
      result: {
        label: `${primaryResult.label} + ${imageResult.label}`,
        imageUrl: imageResult.imageUrl,
        detail: `${primaryResult.detail} + ${imageResult.detail}`,
      },
      sourceLabel: `${primaryResult.sourceLabel} + ${imageResult.sourceLabel}`,
      createdAt: new Date().toISOString(),
    };

    store.draws.push(entry);
    store.draws = store.draws.slice(-MAX_DRAW_HISTORY);

    const saved = writeStore(store);
    res.json({
      draw: entry,
      recentDraws: recentDraws(saved, sessionCode, 18),
    });
  } catch (error) {
    res.status(400).json({
      error: error.message || 'Draw failed',
    });
  }
});

app.get('/api/session/:code/qr', async (req, res, next) => {
  try {
    const store = readStore();
    const code = clampString(req.params.code, '', 24).toUpperCase();

    if (code !== store.liveSession.code) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const buffer = await QRCode.toBuffer(buildPlayUrl(req, code), {
      type: 'png',
      width: 360,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffffff',
      },
    });

    res.type('png');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.message === 'Only image files are allowed' ? 400 : 500;
  res.status(status).json({
    error: error.message || 'Unexpected server error',
  });
});

function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`RandomMan listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  app,
  startServer,
};

const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');
const { normalizeLocale, getSystemLocale } = require('./i18n');

const DEFAULT_FEATURES = {
  clock: true,
  weather: true,
  media: true,
  timer: true,
  notes: true,
  audio: true,
  calendar: true,
  gemini: true,
};

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function getDefaultDisplayIds() {
  return [screen.getPrimaryDisplay().id];
}

function normalizeSettings(raw) {
  const displays = Array.isArray(raw?.displays) && raw.displays.length
    ? raw.displays
    : getDefaultDisplayIds();

  const available = new Set(screen.getAllDisplays().map((d) => d.id));
  const validDisplays = displays.filter((id) => available.has(id));

  return {
    displays: validDisplays.length ? validDisplays : getDefaultDisplayIds(),
    features: {
      ...DEFAULT_FEATURES,
      ...(raw?.features || {}),
    },
    geminiApiKey: typeof raw?.geminiApiKey === 'string' ? raw.geminiApiKey : '',
    locale: raw?.locale != null
      ? normalizeLocale(raw.locale)
      : getSystemLocale(app.getLocale()),
    launchAtStartup: !!raw?.launchAtStartup,
    alwaysOnTop: raw?.alwaysOnTop === undefined ? true : !!raw?.alwaysOnTop,
    islandPositions: normalizeIslandPositions(
      raw?.islandPositions,
      validDisplays.length ? validDisplays : getDefaultDisplayIds()
    ),
  };
}

function normalizeIslandPositions(raw, displayIds) {
  const positions = {};
  const valid = new Set(displayIds);
  if (!raw || typeof raw !== 'object') return positions;

  for (const [key, value] of Object.entries(raw)) {
    const id = Number(key);
    if (!valid.has(id)) continue;
    if (!value || !['top', 'right', 'bottom', 'left'].includes(value.edge)) continue;
    positions[id] = {
      edge: value.edge,
      offset: typeof value.offset === 'number' && Number.isFinite(value.offset)
        ? value.offset
        : null,
      anchorVersion: value.anchorVersion === 2 ? 2 : 1,
    };
  }
  return positions;
}

function loadSettings() {
  try {
    const file = settingsPath();
    if (!fs.existsSync(file)) return normalizeSettings(null);
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return normalizeSettings(raw);
  } catch {
    return normalizeSettings(null);
  }
}

function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

module.exports = {
  loadSettings,
  saveSettings,
  normalizeSettings,
  DEFAULT_FEATURES,
};

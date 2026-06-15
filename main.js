const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, clipboard, shell } = require('electron');
const path = require('path');
const { startMediaBridge, getMediaSnapshot, mediaCommand, stopMediaBridge } = require('./media-service');
const { getLocationWeather } = require('./location-service');
const { loadSettings, saveSettings } = require('./settings-store');
const { TRANSPARENT, attachTransparencyFixes, enforceTransparency } = require('./window-transparency');
const notesStore = require('./notes-store');
const devicesService = require('./devices-service');
const calendarStore = require('./calendar-store');
const geminiService = require('./gemini-service');
const { t } = require('./i18n');
const { applyLaunchAtStartup, mergeInstallerStartupPreference } = require('./startup');
const { updateOutsideClickWatch } = require('./outside-click');
const {
  defaultPosition,
  normalizePosition,
  boundsFromPosition,
  positionFromCursor,
  withAnchorVersion,
  migrateOffsetToAnchor,
  ANCHOR_VERSION,
  resolveSizeKeyForEdge,
} = require('./island-position');
const ICON_PATH = path.join(__dirname, 'appicon.png');

const WINDOW_SIZES = {
  compact: { width: 130, height: 45 },
  compactV: { width: 45, height: 130 },
  mediaCompact: { width: 170, height: 45 },
  mediaCompactV: { width: 49, height: 166 },
  expanded: { width: 420, height: 168 },
  notification: { width: 360, height: 96 },
  timerCompact: { width: 172, height: 49 },
  timerCompactV: { width: 49, height: 172 },
  settings: { width: 420, height: 350 },
  notes: { width: 420, height: 300 },
  notesCompact: { width: 160, height: 45 },
  notesCompactV: { width: 49, height: 164 },
  audio: { width: 420, height: 340 },
  calendar: { width: 420, height: 360 },
  gemini: { width: 420, height: 360 },
};

/** @type {Map<number, { window: BrowserWindow, sizeKey: string }>} */
const islandWindows = new Map();

let settings = null;
let weatherInterval = null;
let mediaStarted = false;
/** @type {Tray | null} */
let tray = null;

function getDisplayInfo(display) {
  const all = screen.getAllDisplays();
  const index = all.findIndex((d) => d.id === display.id);
  const primary = display.id === screen.getPrimaryDisplay().id;

  return {
    id: display.id,
    index: index + 1,
    label: display.label || null,
    primary,
    width: display.size.width,
    height: display.size.height,
    workArea: display.workArea,
  };
}

function getDisplaysList() {
  return screen.getAllDisplays().map(getDisplayInfo);
}

function getDisplayForWindow(win) {
  const displayId = findDisplayIdByWindow(win);
  if (!displayId) return null;
  return screen.getAllDisplays().find((d) => d.id === displayId) || null;
}

function ensureAnchorPosition(display, size, entry) {
  if (!entry.position) {
    entry.position = defaultPosition();
    return;
  }
  if (entry.position.anchorVersion === ANCHOR_VERSION) return;

  const edge = entry.position.edge || 'top';
  entry.position = withAnchorVersion({
    edge,
    offset: migrateOffsetToAnchor(display, size, edge, entry.position),
  });
}

function applyIslandBounds(win, entry, size) {
  const display = getDisplayForWindow(win);
  if (!display || !entry) return;
  ensureAnchorPosition(display, size, entry);
  win.setBounds(boundsFromPosition(display, size, entry.position));
}

function persistIslandPosition(displayId, position) {
  if (!settings) settings = loadSettings();
  settings.islandPositions = {
    ...(settings.islandPositions || {}),
    [displayId]: position,
  };
  saveSettings(settings);
}

function findEntryByWindow(win) {
  for (const entry of islandWindows.values()) {
    if (entry.window === win) return entry;
  }
  return null;
}

function findDisplayIdByWindow(win) {
  for (const [displayId, entry] of islandWindows.entries()) {
    if (entry.window === win) return displayId;
  }
  return null;
}

function applyWindowSize(win, sizeKey) {
  const displayId = findDisplayIdByWindow(win);
  if (!displayId) return;

  const size = WINDOW_SIZES[sizeKey] || WINDOW_SIZES.compact;
  const entry = islandWindows.get(displayId);
  if (!entry) return;

  entry.sizeKey = sizeKey;
  applyIslandBounds(win, entry, size);
  enforceTransparency(win);
}

function broadcast(channel, data) {
  for (const { window } of islandWindows.values()) {
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, data);
    }
  }
}

function applyAlwaysOnTopToWindow(win, alwaysOnTop) {
  if (!win || win.isDestroyed()) return;
  if (alwaysOnTop) {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    win.setAlwaysOnTop(true, 'floating');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  }
}

function updateWindowFocusability(win, entry) {
  if (!win || win.isDestroyed() || !entry) return;
  win.setFocusable(!!(entry.expanded || entry.inputMode));
}

function getExpandedIslandEntries() {
  return [...islandWindows.values()].filter(
    (entry) => entry.expanded && entry.window && !entry.window.isDestroyed()
  );
}

function syncOutsideClickWatch() {
  updateOutsideClickWatch(getExpandedIslandEntries);
}

function isCursorOverWindow(win) {
  if (!win || win.isDestroyed()) return false;
  const point = screen.getCursorScreenPoint();
  const b = win.getBounds();
  return point.x >= b.x
    && point.x < b.x + b.width
    && point.y >= b.y
    && point.y < b.y + b.height;
}

function attachIslandFocusHandlers(win, entry) {
  win.on('blur', () => {
    clearTimeout(entry.blurCollapseTimer);
    entry.blurCollapseTimer = setTimeout(() => {
      if (win.isDestroyed() || win.isFocused()) return;
      if (!entry.expanded) return;
      if (isCursorOverWindow(win)) return;
      win.webContents.send('island:collapse-request');
    }, 250);
  });

  win.on('focus', () => {
    clearTimeout(entry.blurCollapseTimer);
  });
}

function applyAlwaysOnTopSetting() {
  if (!settings) settings = loadSettings();
  const enabled = settings.alwaysOnTop !== false;
  for (const { window } of islandWindows.values()) {
    applyAlwaysOnTopToWindow(window, enabled);
  }
}

function createIslandWindow(displayId) {
  if (islandWindows.has(displayId)) return;

  const display = screen.getAllDisplays().find((d) => d.id === displayId);
  if (!display) return;

  const info = getDisplayInfo(display);
  const position = normalizePosition(settings?.islandPositions?.[displayId]);
  const compactSize = WINDOW_SIZES.compact;
  const bounds = boundsFromPosition(display, compactSize, position);

  const win = new BrowserWindow({
    ...bounds,
    icon: ICON_PATH,
    frame: false,
    transparent: true,
    backgroundColor: TRANSPARENT,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: false,
    show: false,
    title: '',
    thickFrame: false,
    roundedCorners: false,
    type: process.platform === 'win32' ? 'toolbar' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
      additionalArguments: [`--display-id=${displayId}`],
    },
  });

  win.setTitle('');
  win.setMenuBarVisibility(false);
  win.setBackgroundColor(TRANSPARENT);
  if (!settings) settings = loadSettings();
  applyAlwaysOnTopToWindow(win, settings.alwaysOnTop !== false);
  attachTransparencyFixes(win);

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  const entry = {
    window: win,
    sizeKey: 'compact',
    position,
    inputMode: false,
    expanded: false,
    blurCollapseTimer: null,
    dragging: false,
  };
  attachIslandFocusHandlers(win, entry);

  win.once('ready-to-show', () => {
    win.setBackgroundColor(TRANSPARENT);
    win.show();
    win.webContents.send('init:context', {
      displayId,
      display: info,
      settings,
      displays: getDisplaysList(),
      islandPosition: position,
    });
  });

  win.on('closed', () => {
    clearTimeout(entry.blurCollapseTimer);
    islandWindows.delete(displayId);
    syncOutsideClickWatch();
  });

  islandWindows.set(displayId, entry);
}

function destroyIslandWindow(displayId) {
  const entry = islandWindows.get(displayId);
  if (!entry) return;
  if (!entry.window.isDestroyed()) entry.window.destroy();
  islandWindows.delete(displayId);
}

function syncIslandWindows() {
  if (!settings) settings = loadSettings();
  const selected = new Set(settings.displays);

  for (const displayId of islandWindows.keys()) {
    if (!selected.has(displayId)) destroyIslandWindow(displayId);
  }

  for (const displayId of selected) {
    createIslandWindow(displayId);
  }

  broadcast('settings:update', { settings, displays: getDisplaysList() });
}

function repositionAllWindows() {
  for (const [, entry] of islandWindows.entries()) {
    if (!entry.window || entry.window.isDestroyed()) continue;
    const size = WINDOW_SIZES[entry.sizeKey] || WINDOW_SIZES.compact;
    applyIslandBounds(entry.window, entry, size);
  }
}

async function refreshWeather() {
  try {
    const weather = await getLocationWeather();
    broadcast('weather:update', weather);
  } catch {
    broadcast('weather:update', {
      city: t('locationFailed', settings?.locale),
      temp: '--',
      icon: '🌡️',
    });
  }
}

function getTrayIcon() {
  let image = nativeImage.createFromPath(ICON_PATH);
  if (image.isEmpty()) return image;
  if (process.platform === 'win32') {
    image = image.resize({ width: 16, height: 16 });
  } else if (process.platform === 'darwin') {
    image = image.resize({ width: 22, height: 22 });
  }
  return image;
}

function updateTrayMenu() {
  if (!tray) return;
  const locale = settings?.locale;
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Winisland', enabled: false },
    { type: 'separator' },
    {
      label: t('trayExit', locale),
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  if (tray) {
    updateTrayMenu();
    return;
  }
  const icon = getTrayIcon();
  if (icon.isEmpty()) return;
  tray = new Tray(icon);
  tray.setToolTip('Winisland');
  updateTrayMenu();
}

function ensureMediaBridge() {
  if (!settings?.features?.media) return;
  if (mediaStarted) return;
  mediaStarted = true;
  startMediaBridge((channel, data) => broadcast(channel, data));
}

async function stopMediaIfDisabled() {
  if (settings?.features?.media || !mediaStarted) return;
  await stopMediaBridge();
  mediaStarted = false;
  broadcast('media:update', { session: { active: false } });
}

function syncWeatherPolling() {
  if (!settings?.features?.weather) {
    if (weatherInterval) {
      clearInterval(weatherInterval);
      weatherInterval = null;
    }
    return;
  }
  refreshWeather();
  if (!weatherInterval) {
    weatherInterval = setInterval(refreshWeather, 30 * 60 * 1000);
  }
}

function startMediaAndWeather() {
  if (islandWindows.size === 0) return;
  ensureMediaBridge();
  syncWeatherPolling();
}

ipcMain.on('resize-island', (event, sizeKey) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) applyWindowSize(win, sizeKey);
});

ipcMain.on('island:drag-start', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const entry = findEntryByWindow(win);
  if (!win || win.isDestroyed() || !entry) return;
  entry.dragging = true;
});

function sizeForEntry(entry, edge) {
  const sizeKey = resolveSizeKeyForEdge(entry.sizeKey || 'compact', edge);
  entry.sizeKey = sizeKey;
  return WINDOW_SIZES[sizeKey] || WINDOW_SIZES.compact;
}

ipcMain.on('island:drag-move', (event, screenX, screenY) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const entry = findEntryByWindow(win);
  const display = getDisplayForWindow(win);
  if (!win || win.isDestroyed() || !entry || !display || !entry.dragging) return;

  const previewEdge = entry.position?.edge || 'top';
  const previewSize = sizeForEntry(entry, previewEdge);
  entry.position = positionFromCursor(display, previewSize, screenX, screenY);
  const size = sizeForEntry(entry, entry.position.edge);
  applyIslandBounds(win, entry, size);
  enforceTransparency(win);
  win.webContents.send('island:position', entry.position);
});

ipcMain.on('island:drag-end', (event, screenX, screenY) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const entry = findEntryByWindow(win);
  const displayId = findDisplayIdByWindow(win);
  const display = getDisplayForWindow(win);
  if (!win || win.isDestroyed() || !entry || !display || displayId == null) return;

  entry.dragging = false;
  const previewSize = sizeForEntry(entry, entry.position?.edge || 'top');
  entry.position = withAnchorVersion(positionFromCursor(display, previewSize, screenX, screenY));
  const size = sizeForEntry(entry, entry.position.edge);
  applyIslandBounds(win, entry, size);
  enforceTransparency(win);
  persistIslandPosition(displayId, entry.position);
  win.webContents.send('island:position', entry.position);
});

ipcMain.on('set-input-mode', (event, enabled) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const entry = findEntryByWindow(win);
  if (!win || win.isDestroyed() || !entry) return;

  const want = !!enabled;
  if (entry.inputMode === want) {
    if (want) event.sender.focus();
    enforceTransparency(win);
    return;
  }

  entry.inputMode = want;
  updateWindowFocusability(win, entry);
  enforceTransparency(win);

  if (want) {
    event.sender.focus();
  }
});

ipcMain.on('island:set-expanded', (event, expanded) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const entry = findEntryByWindow(win);
  if (!win || win.isDestroyed() || !entry) return;

  entry.expanded = !!expanded;
  updateWindowFocusability(win, entry);
  enforceTransparency(win);
  syncOutsideClickWatch();
});

ipcMain.on('island:focus', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const entry = findEntryByWindow(win);
  if (!win || win.isDestroyed() || !entry) return;

  win.setFocusable(true);
  win.focus();
  enforceTransparency(win);
});

ipcMain.on('island:set-throttled', (event, throttled) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  win.webContents.setBackgroundThrottling(!!throttled);
});

ipcMain.handle('clipboard:write', (_event, text) => {
  clipboard.writeText(String(text ?? ''));
  return true;
});

ipcMain.handle('clipboard:read', () => clipboard.readText());

ipcMain.handle('shell:openExternal', (_event, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  return shell.openExternal(url);
});

ipcMain.handle('settings:get', () => {
  if (!settings) settings = loadSettings();
  return { settings, displays: getDisplaysList() };
});

ipcMain.handle('settings:save', async (_event, newSettings) => {
  const hadMedia = settings?.features?.media;
  settings = saveSettings(newSettings);
  applyLaunchAtStartup(settings.launchAtStartup);
  applyAlwaysOnTopSetting();
  if (settings.features?.media && !hadMedia) {
    ensureMediaBridge();
  } else if (!settings.features?.media && hadMedia) {
    await stopMediaIfDisabled();
  }
  syncWeatherPolling();
  syncIslandWindows();
  updateTrayMenu();
  return { settings, displays: getDisplaysList() };
});

ipcMain.handle('displays:get', () => getDisplaysList());

ipcMain.handle('media:get', () => getMediaSnapshot());

ipcMain.handle('media:command', async (_event, action) => {
  await mediaCommand(action);
  return true;
});

ipcMain.handle('weather:get', () => {
  const locale = settings?.locale;
  return getLocationWeather().catch(() => ({
    city: t('locationFailed', locale),
    temp: '--',
    icon: '🌡️',
  }));
});

ipcMain.handle('notes:get', () => notesStore.getNotes());

ipcMain.handle('notes:add', (_event, text) => {
  const notes = notesStore.addNote(text);
  broadcast('notes:update', notes);
  return notes;
});

ipcMain.handle('notes:update', (_event, { id, text }) => {
  const notes = notesStore.updateNote(id, text);
  broadcast('notes:update', notes);
  return notes;
});

ipcMain.handle('notes:delete', (_event, id) => {
  const notes = notesStore.deleteNote(id);
  broadcast('notes:update', notes);
  return notes;
});

ipcMain.handle('audio:getState', () => devicesService.getAudioState().catch(() => null));
ipcMain.handle('audio:setPlaybackVolume', (_e, value) => devicesService.setPlaybackVolume(value));
ipcMain.handle('audio:setRecordingVolume', (_e, value) => devicesService.setRecordingVolume(value));
ipcMain.handle('audio:setPlaybackMute', (_e, muted) => devicesService.setPlaybackMute(muted));
ipcMain.handle('audio:setRecordingMute', (_e, muted) => devicesService.setRecordingMute(muted));
ipcMain.handle('audio:togglePlaybackMute', () => devicesService.togglePlaybackMute());
ipcMain.handle('audio:toggleRecordingMute', () => devicesService.toggleRecordingMute());
ipcMain.handle('audio:setDefaultPlayback', (_e, deviceId) => devicesService.setDefaultPlayback(deviceId));
ipcMain.handle('audio:setDefaultRecording', (_e, deviceId) => devicesService.setDefaultRecording(deviceId));
ipcMain.handle('bluetooth:getDevices', () => devicesService.getBluetoothDevices().catch(() => ({ devices: [] })));

ipcMain.handle('calendar:get', () => calendarStore.getEvents());

ipcMain.handle('calendar:add', (_event, payload) => {
  const events = calendarStore.addEvent(payload);
  broadcast('calendar:update', events);
  return events;
});

ipcMain.handle('calendar:update', (_event, payload) => {
  const events = calendarStore.updateEvent(payload.id, payload);
  broadcast('calendar:update', events);
  return events;
});

ipcMain.handle('calendar:delete', (_event, id) => {
  const events = calendarStore.deleteEvent(id);
  broadcast('calendar:update', events);
  return events;
});

ipcMain.handle('gemini:send', async (_event, messages) => {
  if (!settings) settings = loadSettings();
  return geminiService.sendMessage(settings.geminiApiKey, messages, settings.locale);
});

app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

app.whenReady().then(() => {
  app.setName('Winisland');
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.winisland.app');
  }
  settings = saveSettings(mergeInstallerStartupPreference(loadSettings()));
  applyLaunchAtStartup(settings.launchAtStartup);
  syncIslandWindows();
  createTray();
  startMediaAndWeather();

  screen.on('display-added', () => {
    settings = loadSettings();
    broadcast('settings:update', { settings, displays: getDisplaysList() });
  });

  screen.on('display-removed', () => {
    settings = saveSettings(settings);
    syncIslandWindows();
  });

  screen.on('display-metrics-changed', () => {
    repositionAllWindows();
    broadcast('settings:update', { settings, displays: getDisplaysList() });
  });
});

app.on('before-quit', () => {
  updateOutsideClickWatch(() => []);
  if (weatherInterval) clearInterval(weatherInterval);
  stopMediaBridge();
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (islandWindows.size === 0) syncIslandWindows();
});

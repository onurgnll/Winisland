// ─── State ───
const state = {
  mode: 'clock',
  expanded: false,
  displayId: null,
  displays: [],
  settings: {
    displays: [],
    features: {
      clock: true,
      weather: true,
      media: true,
      timer: true,
      notes: true,
      audio: true,
      calendar: true,
      gemini: true,
    },
    geminiApiKey: '',
    locale: 'en',
    launchAtStartup: false,
    alwaysOnTop: true,
  },
  notes: [],
  calendarEvents: [],
  geminiMessages: [],
  geminiLoading: false,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  calendarSelectedDate: null,
  audio: {
    playback: { volume: 50, muted: false, defaultId: '', devices: [] },
    recording: { volume: 50, muted: false, defaultId: '', devices: [] },
  },
  bluetooth: [],
  audioPollInterval: null,
  playbackVolumeDragging: false,
  recordingVolumeDragging: false,
  wheelLocked: false,
  editingNoteId: null,
  media: {
    active: false,
    title: '',
    artist: '',
    app: '',
    playing: false,
    positionMs: 0,
    durationMs: 0,
    thumbnail: null,
    controls: {},
  },
  timerTotal: 300,
  timerRemaining: 300,
  timerRunning: false,
  timerEditing: false,
  timerInterval: null,
  notificationTimeout: null,
  hoverTimeout: null,
  collapseTimeout: null,
  idleCollapseTimeout: null,
  islandHovered: false,
  expandTransitionTimeout: null,
  collapseTransitionTimeout: null,
  isCollapsing: false,
  collapseWindowSizeKey: null,
  suspendOutsideCollapseUntil: 0,
  mediaAnchor: { positionMs: 0, durationMs: 0, playing: false, updatedAt: 0 },
  isDragging: false,
  dragDidMove: false,
  islandAnchor: 'top',
};

// ─── DOM refs ───
const appRoot = document.getElementById('app');
const island = document.getElementById('island');
const compactLeft = document.getElementById('compact-left');
const compactCenter = document.getElementById('compact-center');
const compactRight = document.getElementById('compact-right');
const clockTime = document.getElementById('clock-time');
const clockSeconds = document.getElementById('clock-seconds');
const clockDate = document.getElementById('clock-date');
const clockWeather = document.querySelector('.clock-weather');
const weatherTemp = document.getElementById('weather-temp');
const weatherCity = document.getElementById('weather-city');
const weatherIcon = document.querySelector('.weather-icon');
const mediaArt = document.getElementById('media-art');
const mediaApp = document.getElementById('media-app');
const mediaTitle = document.getElementById('media-title');
const mediaArtist = document.getElementById('media-artist');
const progressBar = document.getElementById('progress-bar');
const mediaCurrent = document.getElementById('media-current');
const mediaTotal = document.getElementById('media-total');
const equalizer = document.getElementById('equalizer');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const timerValue = document.getElementById('timer-value');
const timerRingFill = document.getElementById('timer-ring-fill');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const btnTimerReset = document.getElementById('btn-timer-reset');
const timerEditInput = document.getElementById('timer-edit-input');
const notifIcon = document.getElementById('notif-icon');
const notifApp = document.getElementById('notif-app');
const notifTitle = document.getElementById('notif-title');
const notifBody = document.getElementById('notif-body');
const indicators = document.getElementById('indicators');
const btnSettings = document.getElementById('btn-settings');
const displayList = document.getElementById('display-list');
let settingsSaveTimer = null;
const settingsLocale = document.getElementById('settings-locale');
const featClock = document.getElementById('feat-clock');
const featWeather = document.getElementById('feat-weather');
const featMedia = document.getElementById('feat-media');
const featTimer = document.getElementById('feat-timer');
const featNotes = document.getElementById('feat-notes');
const featAudio = document.getElementById('feat-audio');
const featCalendar = document.getElementById('feat-calendar');
const featGemini = document.getElementById('feat-gemini');
const featLaunchAtStartup = document.getElementById('feat-launch-startup');
const featAlwaysOnTop = document.getElementById('feat-always-on-top');
const settingsFollowLink = document.getElementById('settings-follow-link');
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const calGrid = document.getElementById('cal-grid');
const calMonthLabel = document.getElementById('cal-month-label');
const btnCalPrev = document.getElementById('btn-cal-prev');
const btnCalNext = document.getElementById('btn-cal-next');
const calDayPanel = document.getElementById('cal-day-panel');
const calDayTitle = document.getElementById('cal-day-title');
const calEvents = document.getElementById('cal-events');
const calEventTime = document.getElementById('cal-event-time');
const calEventText = document.getElementById('cal-event-text');
const btnCalAdd = document.getElementById('btn-cal-add');
const geminiMessages = document.getElementById('gemini-messages');
const geminiScroll = document.getElementById('gemini-scroll');
const geminiInput = document.getElementById('gemini-input');
const geminiCompose = document.getElementById('gemini-compose');
const btnGeminiSend = document.getElementById('btn-gemini-send');
const btnGeminiClear = document.getElementById('btn-gemini-clear');
const btList = document.getElementById('bt-list');
const audioOutputSelect = document.getElementById('audio-output-select');
const audioInputSelect = document.getElementById('audio-input-select');
const playbackVolume = document.getElementById('playback-volume');
const recordingVolume = document.getElementById('recording-volume');
const playbackVolumeLabel = document.getElementById('playback-volume-label');
const recordingVolumeLabel = document.getElementById('recording-volume-label');
const btnPlaybackMute = document.getElementById('btn-playback-mute');
const btnRecordingMute = document.getElementById('btn-recording-mute');
const notesList = document.getElementById('notes-list');
const noteInput = document.getElementById('note-input');
const btnPasteNote = document.getElementById('btn-paste-note');
const btnAddNote = document.getElementById('btn-add-note');

const RING_CIRCUMFERENCE = 2 * Math.PI * 42;
const ISLAND_TRANSITION_MS = 450;
const WHEEL_TAB_COOLDOWN_MS = 300;
const IDLE_COLLAPSE_MS = 5000;
const DRAG_THRESHOLD_PX = 6;

const DRAG_EXCLUDE_SELECTOR =
  'button, input, textarea, label, select, ' +
  '.dot, .island__settings-btn, ' +
  '.notes-compose, .notes-list, .note-item, ' +
  '.audio-scroll, .audio-section, .audio-row, .bt-list, ' +
  '.calendar-scroll, .calendar-grid, .calendar-day-panel, .calendar-compose, .cal-event, ' +
  '.gemini-scroll, .gemini-compose, .gemini-messages, .gemini-input, ' +
  '.settings-scroll, .media-controls, .timer-actions, ' +
  '.timer-ring, .timer-value, .timer-edit-input, .timer-label';

let dragState = null;

function L(key, params) {
  return window.i18n?.t(key, state.settings?.locale, params) || key;
}

function intlLoc() {
  return window.i18n?.intlLocale(state.settings?.locale) || 'en-US';
}

function formatWeekdayLong(date) {
  return new Intl.DateTimeFormat(intlLoc(), { weekday: 'long' }).format(date);
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat(intlLoc(), { month: 'long', year: 'numeric' }).format(date);
}

function formatDayMonthYear(date) {
  return new Intl.DateTimeFormat(intlLoc(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function applyLocale() {
  const loc = state.settings?.locale || 'en';
  document.documentElement.lang = loc;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = L(el.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = L(el.dataset.i18nTitle);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = L(el.dataset.i18nPlaceholder);
  });

  if (settingsLocale && window.i18n) {
    settingsLocale.innerHTML = window.i18n.SUPPORTED_LOCALES.map((code) => {
      const label = L(code === 'tr' ? 'langTr' : 'langEn');
      return `<option value="${code}">${label}</option>`;
    }).join('');
    settingsLocale.value = loc;
  }

  const weekdays = document.querySelectorAll('.calendar-weekdays span');
  const monday = new Date(2024, 0, 1);
  weekdays.forEach((el, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    el.textContent = new Intl.DateTimeFormat(intlLoc(), { weekday: 'narrow' }).format(d);
  });

  if (geminiApiKeyInput) {
    geminiApiKeyInput.placeholder = state.settings.geminiApiKey
      ? L('settingsApiKeySaved')
      : L('settingsApiKeyPlaceholder');
  }

  updateGeminiAvailability();
  renderDisplayList();
  if (state.mode === 'notes') renderNotes();
  if (state.mode === 'calendar') renderCalendar();
  if (state.mode === 'gemini') renderGeminiChat();
  updateMediaUI();
  updateClock();
  updateCompactView();
}

// ─── Helpers ───
function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMs(ms) {
  return formatTime((ms || 0) / 1000);
}

function getEnabledModes() {
  const modes = [];
  const f = state.settings.features;
  if (f.clock) modes.push('clock');
  if (f.media) modes.push('media');
  if (f.timer) modes.push('timer');
  if (f.notes) modes.push('notes');
  if (f.audio) modes.push('audio');
  if (f.calendar) modes.push('calendar');
  if (f.gemini) modes.push('gemini');
  return modes;
}

function getFirstEnabledMode() {
  const modes = getEnabledModes();
  return modes[0] || 'clock';
}

const TYPING_PANEL_MODES = ['notes', 'gemini', 'calendar'];

function getPanelInput(mode = state.mode) {
  if (mode === 'notes') return noteInput;
  if (mode === 'gemini' && hasGeminiApiKey()) return geminiInput;
  if (mode === 'calendar' && state.calendarSelectedDate) return calEventText;
  return null;
}

function focusPanelInput(mode = state.mode) {
  const el = getPanelInput(mode);
  if (!el || el.disabled) return false;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  return document.activeElement === el;
}

function schedulePanelInputFocus(mode = state.mode) {
  if (!TYPING_PANEL_MODES.includes(mode)) return;
  const tryFocus = () => focusPanelInput(mode);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      tryFocus();
      setTimeout(tryFocus, 0);
      setTimeout(tryFocus, 80);
      setTimeout(tryFocus, 200);
    });
  });
}

function updateInputMode(mode) {
  if (!window.dynwin?.setInputMode) return;
  const needsInput = mode === 'notes' || mode === 'settings' || mode === 'calendar' || mode === 'gemini'
    || (mode === 'timer' && state.timerEditing);
  window.dynwin.setInputMode(needsInput);
  if (needsInput && TYPING_PANEL_MODES.includes(mode)) {
    schedulePanelInputFocus(mode);
  }
}

function isTypingRedirectMode() {
  return state.expanded && TYPING_PANEL_MODES.includes(state.mode);
}

function panelAlreadyHasFieldFocus() {
  const active = document.activeElement;
  if (!active) return false;
  const panel = document.querySelector('.panel.active');
  if (!panel || !panel.contains(active)) return false;
  return active.matches('input, textarea, select');
}

function canStartIslandDrag(target) {
  if (!target.closest('#island')) return false;
  if (target.closest(DRAG_EXCLUDE_SELECTOR)) return false;
  return true;
}

function applyIslandAnchor(position) {
  const edge = position?.edge || 'top';
  const edges = ['top', 'right', 'bottom', 'left'];
  edges.forEach((name) => {
    appRoot.classList.remove(`anchor-${name}`);
    island.classList.remove(`anchor-${name}`);
  });
  appRoot.classList.add(`anchor-${edge}`);
  island.classList.add(`anchor-${edge}`);
  const vertical = edge === 'left' || edge === 'right';
  island.classList.toggle('island--vertical', vertical);
  state.islandAnchor = edge;
  if (!state.expanded && state.mode === 'clock') updateClock();
  resizeWindow();
}

function handleIslandDragMove(e) {
  if (!dragState) return;
  const dx = e.screenX - dragState.startX;
  const dy = e.screenY - dragState.startY;
  if (!dragState.active) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    dragState.active = true;
    state.isDragging = true;
    state.dragDidMove = true;
    clearTimeout(state.hoverTimeout);
    clearTimeout(state.collapseTimeout);
    clearDelayedCollapse();
    island.classList.add('island--dragging');
    window.dynwin?.dragStart?.();
  }
  window.dynwin?.dragMove?.(e.screenX, e.screenY);
}

function endIslandDrag(e) {
  if (!dragState) return;
  if (dragState.active) {
    window.dynwin?.dragEnd?.(e.screenX, e.screenY);
    island.classList.remove('island--dragging');
    state.isDragging = false;
    setTimeout(() => { state.dragDidMove = false; }, 0);
  }
  dragState = null;
}

function handleTypingRedirect(e) {
  if (!isTypingRedirectMode()) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Tab' || e.key === 'Escape' || e.key.startsWith('Arrow')) return;
  if (panelAlreadyHasFieldFocus()) return;

  const input = getPanelInput();
  if (!input || input.disabled) return;
  if (e.key.length !== 1) return;

  e.preventDefault();
  e.stopPropagation();

  input.focus();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + e.key + input.value.slice(end);
  const pos = start + 1;
  if (typeof input.selectionStart === 'number') {
    input.selectionStart = pos;
    input.selectionEnd = pos;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function isVerticalAnchor() {
  return state.islandAnchor === 'left' || state.islandAnchor === 'right';
}

function getWindowSizeKey() {
  if (state.isCollapsing && state.collapseWindowSizeKey) {
    return state.collapseWindowSizeKey;
  }
  const vertical = isVerticalAnchor();
  if (state.mode === 'notification') return 'notification';
  if (!state.expanded) {
    if (state.mode === 'timer' && state.timerRunning) return vertical ? 'timerCompactV' : 'timerCompact';
    if (state.mode === 'notes') return vertical ? 'notesCompactV' : 'notesCompact';
    if (state.mode === 'media' && state.media.active) return vertical ? 'mediaCompactV' : 'mediaCompact';
    return vertical ? 'compactV' : 'compact';
  }
  if (state.mode === 'settings') return 'settings';
  if (state.mode === 'notes') return 'notes';
  if (state.mode === 'audio') return 'audio';
  if (state.mode === 'calendar') return 'calendar';
  if (state.mode === 'gemini') return 'gemini';
  return 'expanded';
}

function isDelayedCollapsePanel() {
  return state.mode === 'notes' || state.mode === 'calendar' || state.mode === 'gemini' || state.mode === 'audio';
}

function hasPanelDraft() {
  if (state.mode === 'notes') {
    if (noteInput?.value.trim()) return true;
    if (state.editingNoteId) {
      const textarea = notesList?.querySelector(`[data-edit-id="${state.editingNoteId}"]`);
      if (textarea?.value.trim()) return true;
    }
  }
  if (state.mode === 'gemini' && geminiInput?.value.trim()) return true;
  if (state.mode === 'calendar' && calEventText?.value.trim()) return true;
  return false;
}

function clearDelayedCollapse() {
  clearTimeout(state.idleCollapseTimeout);
  state.idleCollapseTimeout = null;
}

function scheduleDelayedCollapse() {
  clearDelayedCollapse();
  if (!state.expanded || !isDelayedCollapsePanel()) return;
  state.idleCollapseTimeout = setTimeout(() => {
    if (state.islandHovered || hasPanelDraft()) return;
    collapse();
  }, IDLE_COLLAPSE_MS);
}

function handlePanelDraftInput() {
  clearDelayedCollapse();
  if (!state.islandHovered && isDelayedCollapsePanel() && state.expanded && !hasPanelDraft()) {
    scheduleDelayedCollapse();
  }
}

function resizeWindow() {
  if (!window.dynwin) return;
  window.dynwin.resizeIsland(getWindowSizeKey());
}

function syncExpandedState() {
  window.dynwin?.setExpanded?.(state.expanded);
}

function syncBackgroundThrottle() {
  const mediaLive = !!state.settings?.features?.media
    && state.media.active
    && state.media.playing;
  const throttled = !state.expanded
    && state.mode !== 'notification'
    && !mediaLive;
  window.dynwin?.setBackgroundThrottled?.(throttled);
}

function needsClockTick() {
  return !!state.settings?.features?.clock && state.mode === 'clock';
}

function needsMediaProgressTick() {
  return !!state.settings?.features?.media
    && state.media.active
    && state.media.playing
    && state.mode === 'media'
    && state.expanded;
}

function suspendOutsideCollapse(ms = 500) {
  state.suspendOutsideCollapseUntil = Date.now() + ms;
}

function handleOutsideCollapseRequest() {
  if (!state.expanded || state.mode === 'notification') return;
  if (Date.now() < state.suspendOutsideCollapseUntil) return;
  clearDelayedCollapse();
  clearTimeout(state.collapseTimeout);
  collapse();
}

// ─── Settings ───
function renderDisplayList() {
  const selected = new Set(state.settings.displays);
  displayList.innerHTML = '';

  state.displays.forEach((display) => {
    const label = document.createElement('label');
    label.className = 'settings-display';
    const name = display.label || L('displayN', { n: display.index || 1 });
    label.innerHTML = `
      <input type="checkbox" data-display-id="${display.id}" ${selected.has(display.id) ? 'checked' : ''} />
      <span>
        <div>${escapeHtml(name)}${display.primary ? ` ${L('displayPrimary')}` : ''}</div>
        <div class="settings-display__meta">${display.width}×${display.height}</div>
      </span>
    `;
    displayList.appendChild(label);
  });
}

function syncFeatureInputs() {
  const f = state.settings.features;
  featClock.checked = f.clock;
  featWeather.checked = f.weather;
  featMedia.checked = f.media;
  featTimer.checked = f.timer;
  featNotes.checked = f.notes;
  if (featAudio) featAudio.checked = f.audio;
  if (featCalendar) featCalendar.checked = f.calendar;
  if (featGemini) featGemini.checked = f.gemini;
  if (featLaunchAtStartup) featLaunchAtStartup.checked = !!state.settings.launchAtStartup;
  if (featAlwaysOnTop) featAlwaysOnTop.checked = state.settings.alwaysOnTop !== false;
  if (settingsLocale) settingsLocale.value = state.settings.locale || 'en';
  if (geminiApiKeyInput) {
    geminiApiKeyInput.value = '';
    geminiApiKeyInput.placeholder = state.settings.geminiApiKey
      ? L('settingsApiKeySaved')
      : L('settingsApiKeyPlaceholder');
  }
}

function applySettings(data) {
  if (!data) return;
  if (data.settings) state.settings = JSON.parse(JSON.stringify(data.settings));
  if (data.displays) state.displays = data.displays;

  syncFeatureInputs();
  renderDisplayList();
  applyFeatureVisibility();

  if (!getEnabledModes().includes(state.mode) || state.mode === 'notification') {
    showPanel(getFirstEnabledMode());
  }

  applyLocale();
  syncRuntimeTimers();
}

function applyFeatureVisibility() {
  const f = state.settings.features;

  clockWeather.classList.toggle('hidden', !f.weather);

  document.querySelectorAll('.dot[data-mode]').forEach((dot) => {
    const mode = dot.dataset.mode;
    const visible = !!f[mode];
    dot.classList.toggle('hidden', !visible);
  });
}

function collectSettingsFromForm() {
  const selectedDisplays = [...displayList.querySelectorAll('input[data-display-id]:checked')]
    .map((el) => Number(el.dataset.displayId));

  return {
    displays: selectedDisplays.length ? selectedDisplays : [state.displayId].filter(Boolean),
    features: {
      clock: featClock.checked,
      weather: featWeather.checked,
      media: featMedia.checked,
      timer: featTimer.checked,
      notes: featNotes.checked,
      audio: featAudio ? featAudio.checked : true,
      calendar: featCalendar ? featCalendar.checked : true,
      gemini: featGemini ? featGemini.checked : true,
    },
    geminiApiKey: (() => {
      const typed = geminiApiKeyInput ? geminiApiKeyInput.value.trim() : '';
      if (typed) return typed;
      return state.settings.geminiApiKey || '';
    })(),
    locale: settingsLocale ? settingsLocale.value : state.settings.locale,
    launchAtStartup: featLaunchAtStartup ? featLaunchAtStartup.checked : false,
    alwaysOnTop: featAlwaysOnTop ? featAlwaysOnTop.checked : true,
  };
}

// ─── Notes ───
function formatNoteTime(ts) {
  const d = new Date(ts);
  const datePart = new Intl.DateTimeFormat(intlLoc(), {
    day: 'numeric',
    month: 'short',
  }).format(d);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${datePart} ${h}:${m}`;
}

function truncate(text, max = 28) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function renderNotes() {
  if (!notesList) return;

  if (!state.notes.length) {
    notesList.innerHTML = `<div class="notes-empty">${escapeHtml(L('notesEmpty'))}</div>`;
    return;
  }

  notesList.innerHTML = state.notes.map((note) => {
    const isEditing = state.editingNoteId === note.id;
    if (isEditing) {
      return `
        <div class="note-item" data-id="${note.id}">
          <textarea class="note-item__edit" data-edit-id="${note.id}">${escapeTextarea(note.text)}</textarea>
          <div class="note-item__meta">
            <span class="note-item__time">${formatNoteTime(note.updatedAt)}</span>
            <div class="note-item__actions">
              <button class="note-btn note-btn--save" data-save-id="${note.id}">${escapeHtml(L('notesSave'))}</button>
              <button class="note-btn" data-cancel-id="${note.id}">${escapeHtml(L('notesCancel'))}</button>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="note-item" data-id="${note.id}">
        <div class="note-item__text">${escapeHtml(note.text)}</div>
        <div class="note-item__meta">
          <span class="note-item__time">${formatNoteTime(note.updatedAt)}</span>
          <div class="note-item__actions">
            <button class="note-btn" data-copy-id="${note.id}">${escapeHtml(L('notesCopy'))}</button>
            <button class="note-btn" data-edit-id="${note.id}">${escapeHtml(L('notesEdit'))}</button>
            <button class="note-btn note-btn--delete" data-delete-id="${note.id}">${escapeHtml(L('notesDelete'))}</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeTextarea(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');
}

function applyNotes(notes) {
  state.notes = notes || [];
  renderNotes();
  updateCompactNotes();
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}

async function writeClipboardText(text) {
  if (window.dynwin?.copyText) {
    await window.dynwin.copyText(text);
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  if (!fallbackCopyText(text)) {
    throw new Error('copy failed');
  }
}

async function readClipboardText() {
  if (window.dynwin?.readText) {
    return window.dynwin.readText();
  }
  if (navigator.clipboard?.readText) {
    return navigator.clipboard.readText();
  }
  return '';
}

function showCopyFeedback(btn) {
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = L('notesCopied');
  btn.classList.add('note-btn--copied');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('note-btn--copied');
  }, 1200);
}

async function copyNoteText(text, btn) {
  if (!text) return;
  try {
    await writeClipboardText(text);
    showCopyFeedback(btn);
  } catch {
    if (fallbackCopyText(text)) {
      showCopyFeedback(btn);
    }
  }
}

async function pasteIntoNoteInput() {
  if (!noteInput) return;
  try {
    const text = await readClipboardText();
    if (!text) return;

    const start = noteInput.selectionStart ?? noteInput.value.length;
    const end = noteInput.selectionEnd ?? noteInput.value.length;
    noteInput.value = noteInput.value.slice(0, start) + text + noteInput.value.slice(end);
    const pos = start + text.length;
    noteInput.selectionStart = pos;
    noteInput.selectionEnd = pos;
    noteInput.focus();
    noteInput.dispatchEvent(new Event('input', { bubbles: true }));
    handlePanelDraftInput();
  } catch {
    /* ignore */
  }
}

async function addNote() {
  const text = noteInput.value;
  if (!text.trim()) return;
  const notes = await window.dynwin.addNote(text);
  noteInput.value = '';
  handlePanelDraftInput();
  applyNotes(notes);
}

async function saveEditedNote(id) {
  const textarea = notesList.querySelector(`[data-edit-id="${id}"]`);
  if (!textarea) return;
  const notes = await window.dynwin.updateNote(id, textarea.value);
  state.editingNoteId = null;
  handlePanelDraftInput();
  applyNotes(notes);
}

async function deleteNote(id) {
  const notes = await window.dynwin.deleteNote(id);
  if (state.editingNoteId === id) state.editingNoteId = null;
  applyNotes(notes);
}

function updateCompactNotes() {
  if (!state.expanded && state.mode === 'notes') {
    const count = state.notes.length;
    if (count === 0) {
      compactCenter.textContent = L('compactNote');
    } else {
      compactCenter.textContent = truncate(state.notes[0].text, 18);
    }
    compactLeft.innerHTML = '';
    compactRight.innerHTML = count > 0 ? `<span style="font-size:10px;opacity:.6">${count}</span>` : '';
  }
}

// ─── Audio & Bluetooth ───
function batteryBarClass(level) {
  if (level <= 15) return 'bt-item__bar-fill--critical';
  if (level <= 35) return 'bt-item__bar-fill--low';
  return '';
}

function renderBluetooth() {
  if (!btList) return;
  const devices = state.bluetooth || [];
  if (!devices.length) {
    btList.innerHTML = `<div class="audio-empty">${escapeHtml(L('audioNoBt'))}</div>`;
    return;
  }
  btList.innerHTML = devices.map((d) => {
    const icon = d.name.match(/Mouse|Fare/i) ? '🖱' : d.name.match(/Keyboard|Klavye/i) ? '⌨' : '🎧';
    const bat = d.battery;
    const batHtml = bat != null
      ? `<div class="bt-item__bar"><div class="bt-item__bar-fill ${batteryBarClass(bat)}" style="width:${bat}%"></div></div><span class="bt-item__battery">${bat}%</span>`
      : '<span class="bt-item__battery">—</span>';
    return `<div class="bt-item"><span class="bt-item__icon">${icon}</span><span class="bt-item__name">${escapeHtml(d.name)}</span>${batHtml}</div>`;
  }).join('');
}

function fillDeviceSelect(select, devices, defaultId) {
  if (!select) return;
  select.innerHTML = (devices || []).map((d) =>
    `<option value="${escapeHtml(d.id)}" ${d.id === defaultId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`
  ).join('');
}

function updateAudioControlsUI() {
  const pb = state.audio.playback;
  const rec = state.audio.recording;

  if (!state.playbackVolumeDragging && playbackVolume) {
    playbackVolume.value = pb.volume;
    playbackVolumeLabel.textContent = `${pb.volume}%`;
  }
  if (!state.recordingVolumeDragging && recordingVolume) {
    recordingVolume.value = rec.volume;
    recordingVolumeLabel.textContent = `${rec.volume}%`;
  }

  if (btnPlaybackMute) {
    btnPlaybackMute.textContent = pb.muted ? '🔇' : '🔊';
    btnPlaybackMute.classList.toggle('audio-mute-btn--muted', pb.muted);
  }
  if (btnRecordingMute) {
    btnRecordingMute.textContent = rec.muted ? '🔇' : '🎤';
    btnRecordingMute.classList.toggle('audio-mute-btn--muted', rec.muted);
  }

  fillDeviceSelect(audioOutputSelect, pb.devices, pb.defaultId);
  fillDeviceSelect(audioInputSelect, rec.devices, rec.defaultId);
}

function applyAudioState(data) {
  if (!data) return;
  state.audio = {
    playback: { ...state.audio.playback, ...data.playback },
    recording: { ...state.audio.recording, ...data.recording },
  };
  updateAudioControlsUI();
  updateCompactAudio();
}

async function loadAudioState() {
  if (!window.dynwin?.getAudioState) return;
  try {
    const data = await window.dynwin.getAudioState();
    applyAudioState(data);
  } catch { /* ignore */ }
}

async function loadBluetooth() {
  if (!window.dynwin?.getBluetoothDevices) return;
  try {
    const data = await window.dynwin.getBluetoothDevices();
    let devices = data?.devices || [];
    if (devices && devices.value) devices = devices.value;
    if (!Array.isArray(devices)) devices = devices ? [devices] : [];
    state.bluetooth = devices;
    renderBluetooth();
  } catch {
    if (btList) btList.innerHTML = `<div class="audio-empty">${escapeHtml(L('audioBtError'))}</div>`;
  }
}

function startAudioPolling() {
  stopAudioPolling();
  loadAudioState();
  loadBluetooth();
  state.audioPollInterval = setInterval(() => {
    if (state.mode === 'audio') {
      loadAudioState();
      loadBluetooth();
    }
  }, 15000);
}

function stopAudioPolling() {
  if (state.audioPollInterval) {
    clearInterval(state.audioPollInterval);
    state.audioPollInterval = null;
  }
}

function updateCompactAudio() {
  if (!state.expanded && state.mode === 'audio') {
    const pb = state.audio.playback;
    compactLeft.innerHTML = pb.muted ? '🔇' : '🔊';
    compactCenter.textContent = pb.muted ? L('audioMuted') : `${pb.volume}%`;
    compactRight.innerHTML = '';
  }
}

// ─── Calendar ───
function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getEventsForDate(dateKey) {
  return state.calendarEvents.filter((e) => e.date === dateKey);
}

function getEventDatesSet() {
  return new Set(state.calendarEvents.map((e) => e.date));
}

function renderCalendarGrid() {
  if (!calGrid || !calMonthLabel) return;

  const { calendarYear: year, calendarMonth: month } = state;
  calMonthLabel.textContent = formatMonthYear(new Date(year, month, 1));

  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );
  const eventCounts = {};
  state.calendarEvents.forEach((e) => {
    eventCounts[e.date] = (eventCounts[e.date] || 0) + 1;
  });

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push('<div class="cal-day cal-day--empty"></div>');
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(year, month, day);
    const count = eventCounts[dateKey] || 0;
    const classes = ['cal-day'];
    if (dateKey === todayKey) classes.push('cal-day--today');
    if (dateKey === state.calendarSelectedDate) classes.push('cal-day--selected');
    const badge = count > 0
      ? (count > 1
        ? `<span class="cal-day__badge cal-day__badge--many">${count}</span>`
        : '<span class="cal-day__badge"></span>')
      : '';
    cells.push(
      `<button type="button" class="${classes.join(' ')}" data-date="${dateKey}">`
      + `<span>${day}</span>${badge}</button>`
    );
  }
  calGrid.innerHTML = cells.join('');
}

function renderCalendarDayPanel() {
  if (!calDayPanel) return;

  if (!state.calendarSelectedDate) {
    calDayPanel.classList.add('hidden');
    return;
  }

  const d = parseDateKey(state.calendarSelectedDate);
  calDayPanel.classList.remove('hidden');
  calDayTitle.textContent = `${formatDayMonthYear(d)}, ${formatWeekdayLong(d)}`;

  const events = getEventsForDate(state.calendarSelectedDate).sort((a, b) => a.time.localeCompare(b.time));
  if (!calEvents) return;

  if (!events.length) {
    calEvents.innerHTML = `<div class="cal-events-empty">${escapeHtml(L('calNoEvents'))}</div>`;
    return;
  }

  calEvents.innerHTML = events.map((ev) => `
    <div class="cal-event" data-id="${ev.id}">
      <span class="cal-event__time">${escapeHtml(ev.time)}</span>
      <span class="cal-event__text">${escapeHtml(ev.text)}</span>
      <button class="cal-event__delete" data-delete-cal="${ev.id}" title="${escapeHtml(L('calDelete'))}">×</button>
    </div>
  `).join('');
}

function renderCalendar() {
  renderCalendarGrid();
  renderCalendarDayPanel();
  updateCompactCalendar();
}

function selectCalendarDate(dateKey) {
  state.calendarSelectedDate = dateKey;
  renderCalendar();
  schedulePanelInputFocus('calendar');
}

function applyCalendarEvents(events) {
  state.calendarEvents = events || [];
  renderCalendar();
}

function updateCompactCalendar() {
  if (!state.expanded && state.mode === 'calendar') {
    const todayKey = toDateKey(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    );
    const count = getEventsForDate(todayKey).length;
    compactLeft.innerHTML = '📅';
    compactCenter.textContent = count ? L('calPlans', { n: count }) : L('compactCalendar');
    compactRight.innerHTML = count > 0 ? '<span class="cal-day__badge"></span>' : '';
  }
}

async function addCalendarEvent() {
  if (!state.calendarSelectedDate || !calEventText || !calEventTime) return;
  const text = calEventText.value;
  if (!text.trim()) return;
  const events = await window.dynwin.addCalendarEvent({
    date: state.calendarSelectedDate,
    time: calEventTime.value || '09:00',
    text,
  });
  calEventText.value = '';
  handlePanelDraftInput();
  applyCalendarEvents(events);
}

async function deleteCalendarEvent(id) {
  const events = await window.dynwin.deleteCalendarEvent(id);
  applyCalendarEvents(events);
}

function shiftCalendarMonth(delta) {
  let m = state.calendarMonth + delta;
  let y = state.calendarYear;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11) { m = 0; y += 1; }
  state.calendarMonth = m;
  state.calendarYear = y;
  renderCalendarGrid();
}

// ─── Gemini ───
function hasGeminiApiKey() {
  return !!String(state.settings.geminiApiKey || '').trim();
}

function updateGeminiAvailability() {
  const enabled = hasGeminiApiKey();

  if (geminiCompose) geminiCompose.classList.toggle('gemini-compose--disabled', !enabled);

  if (geminiInput) {
    geminiInput.disabled = !enabled;
    geminiInput.placeholder = enabled
      ? L('geminiPlaceholder')
      : L('geminiApiKeyPlaceholder');
    if (!enabled) geminiInput.value = '';
  }

  if (btnGeminiSend) btnGeminiSend.disabled = !enabled || state.geminiLoading;
  if (btnGeminiClear) {
    btnGeminiClear.disabled = !enabled || !state.geminiMessages.length;
  }
}

function scrollGeminiToBottom() {
  if (!geminiScroll) return;
  requestAnimationFrame(() => {
    geminiScroll.scrollTop = geminiScroll.scrollHeight;
  });
}

function renderGeminiChat() {
  if (!geminiMessages) return;

  updateGeminiAvailability();

  if (!hasGeminiApiKey()) {
    geminiMessages.innerHTML = `<div class="gemini-empty">${escapeHtml(L('geminiNoApiKey'))}<br>${escapeHtml(L('geminiNoApiKeyHint'))}</div>`;
    return;
  }

  if (!state.geminiMessages.length && !state.geminiLoading) {
    geminiMessages.innerHTML = `<div class="gemini-empty">${escapeHtml(L('geminiEmpty'))}</div>`;
    return;
  }

  const parts = state.geminiMessages.map((msg) => {
    const cls = msg.role === 'user' ? 'gemini-msg--user' : 'gemini-msg--model';
    return `<div class="gemini-msg ${cls}">${escapeHtml(msg.text)}</div>`;
  });

  if (state.geminiLoading) {
    parts.push(`<div class="gemini-msg gemini-msg--loading">${escapeHtml(L('geminiTyping'))}</div>`);
  }

  geminiMessages.innerHTML = parts.join('');
  scrollGeminiToBottom();
  if (btnGeminiClear) btnGeminiClear.disabled = !state.geminiMessages.length;
}

function updateCompactGemini() {
  if (!state.expanded && state.mode === 'gemini') {
    const last = state.geminiMessages[state.geminiMessages.length - 1];
    compactLeft.innerHTML = '✨';
    if (!hasGeminiApiKey()) {
      compactCenter.textContent = L('geminiApiKeyRequired');
    } else if (state.geminiLoading) {
      compactCenter.textContent = L('geminiTyping');
    } else if (last) {
      compactCenter.textContent = truncate(last.text, 18);
    } else {
      compactCenter.textContent = L('tabGemini');
    }
    compactRight.innerHTML = '';
  }
}

function clearGeminiChat() {
  if (!hasGeminiApiKey()) return;
  state.geminiMessages = [];
  state.geminiLoading = false;
  if (btnGeminiSend) btnGeminiSend.disabled = false;
  renderGeminiChat();
  updateCompactGemini();
}

async function sendGeminiMessage() {
  if (!geminiInput || state.geminiLoading || !hasGeminiApiKey()) return;

  const text = geminiInput.value.trim();
  if (!text) return;

  state.geminiMessages.push({ role: 'user', text });
  geminiInput.value = '';
  handlePanelDraftInput();
  state.geminiLoading = true;
  if (btnGeminiSend) btnGeminiSend.disabled = true;
  renderGeminiChat();
  updateCompactGemini();

  const result = await window.dynwin.sendGeminiMessage(state.geminiMessages);

  state.geminiLoading = false;
  if (btnGeminiSend) btnGeminiSend.disabled = false;

  if (result.ok) {
    state.geminiMessages.push({ role: 'model', text: result.text });
  } else {
    state.geminiMessages.push({ role: 'model', text: L('geminiErrorPrefix', { msg: result.error }) });
  }

  renderGeminiChat();
  updateCompactGemini();
  focusPanelInput('gemini');
}

function previewSettingsFromForm() {
  const collected = collectSettingsFromForm();
  if (collected.displays.length) state.settings.displays = collected.displays;
  state.settings.features = collected.features;
  state.settings.launchAtStartup = collected.launchAtStartup;
  state.settings.alwaysOnTop = collected.alwaysOnTop;
  if (settingsLocale) state.settings.locale = settingsLocale.value;
  applyFeatureVisibility();
}

function scheduleAutoSaveSettings() {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => saveSettings(), 400);
}

async function saveSettings() {
  const newSettings = collectSettingsFromForm();
  if (!newSettings.displays.length) {
    renderDisplayList();
    return;
  }

  const result = await window.dynwin.saveSettings(newSettings);
  applySettings(result);
}

function bindSettingsAutoSave() {
  if (displayList) {
    displayList.addEventListener('change', (e) => {
      if (!e.target.matches('input[data-display-id]')) return;
      previewSettingsFromForm();
      scheduleAutoSaveSettings();
    });
  }

  if (settingsLocale) {
    settingsLocale.addEventListener('change', () => {
      state.settings.locale = settingsLocale.value;
      applyLocale();
      scheduleAutoSaveSettings();
    });
  }

  const autoSaveCheckboxes = [
    featClock, featWeather, featMedia, featTimer, featNotes,
    featAudio, featCalendar, featGemini, featLaunchAtStartup, featAlwaysOnTop,
  ];
  autoSaveCheckboxes.forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      previewSettingsFromForm();
      scheduleAutoSaveSettings();
    });
  });

  if (geminiApiKeyInput) {
    geminiApiKeyInput.addEventListener('input', () => scheduleAutoSaveSettings());
  }
}

// ─── Clock ───
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');

  clockTime.textContent = `${h}:${m}`;
  clockSeconds.textContent = s;

  clockDate.textContent = new Intl.DateTimeFormat(intlLoc(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  if (!state.expanded && state.mode === 'clock') {
    if (isVerticalAnchor()) {
      compactCenter.innerHTML = `<span class="compact-v-time"><span>${h}</span><span class="compact-v-sep">:</span><span>${m}</span></span>`;
    } else {
      compactCenter.textContent = `${h}:${m}`;
    }
    compactLeft.innerHTML = '';
    compactRight.innerHTML = '';
  }
}

// ─── Weather ───
function applyWeather(weather) {
  if (!weather) return;
  weatherCity.textContent = weather.city || '...';
  weatherTemp.textContent = weather.temp === '--' ? '--°C' : `${weather.temp}°C`;
  if (weather.icon) weatherIcon.textContent = weather.icon;
}

// ─── Media ───
function getLivePositionMs() {
  const anchor = state.mediaAnchor;
  if (!anchor.playing) return anchor.positionMs;
  const elapsed = Date.now() - anchor.updatedAt;
  const live = anchor.positionMs + elapsed;
  if (anchor.durationMs > 0) return Math.min(live, anchor.durationMs);
  return live;
}

function updateMediaProgress() {
  const durationMs = state.media.durationMs || state.mediaAnchor.durationMs || 0;
  const positionMs = getLivePositionMs();
  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  mediaCurrent.textContent = formatMs(positionMs);
  mediaTotal.textContent = durationMs > 0 ? formatMs(durationMs) : '--:--';
  progressBar.style.width = `${progress * 100}%`;
}

function updateMediaUI() {
  const media = state.media;

  mediaApp.textContent = media.app || '';
  mediaTitle.textContent = media.active ? media.title : L('mediaNone');
  mediaArtist.textContent = media.active ? media.artist : L('mediaHint');

  updateMediaProgress();

  btnPlay.textContent = media.playing ? '⏸' : '▶';
  equalizer.classList.toggle('paused', !media.playing);

  btnPlay.disabled = !media.active;
  btnPrev.disabled = !media.active || media.controls.canSkipPrevious === false;
  btnNext.disabled = !media.active || media.controls.canSkipNext === false;

  if (state.mode === 'media' && media.thumbnail) {
    mediaArt.className = 'media-art media-art--thumb';
    mediaArt.style.backgroundImage = `url("${media.thumbnail}")`;
  } else {
    mediaArt.className = 'media-art art-1';
    mediaArt.style.backgroundImage = '';
  }

  if (!state.expanded && state.mode === 'media') {
    updateCompactMedia();
  }

  if (
    !state.expanded
    && state.settings.features.media
    && media.active
    && media.playing
    && state.mode !== 'notification'
    && state.mode !== 'settings'
    && state.mode !== 'notes'
    && state.mode !== 'audio'
    && state.mode !== 'calendar'
    && state.mode !== 'gemini'
  ) {
    if (state.mode !== 'media') showPanel('media');
  }
}

function setCompactMediaTitle(title) {
  const label = (title || '').replace(/\s+/g, ' ').trim() || L('mediaNone');
  const safe = escapeHtml(label);
  compactCenter.innerHTML = `
    <div class="compact-media-title">
      <span class="compact-media-title__track">
        <span class="compact-media-title__text">${safe}</span>
      </span>
    </div>`;

  const wrap = compactCenter.querySelector('.compact-media-title');
  const text = compactCenter.querySelector('.compact-media-title__text');
  if (!wrap || !text) return;

  requestAnimationFrame(() => {
    const vertical = isVerticalAnchor();
    if (vertical) wrap.classList.add('compact-media-title--vertical');

    const overflow = vertical
      ? text.scrollHeight > wrap.clientHeight + 1
      : text.scrollWidth > wrap.clientWidth + 1;
    wrap.classList.toggle('compact-media-title--scroll', overflow);
    if (!overflow) return;

    const gap = vertical ? 16 : 28;
    const dist = (vertical ? text.scrollHeight : text.scrollWidth) + gap;
    wrap.innerHTML = `
      <span class="compact-media-title__track compact-media-title__track--scroll${vertical ? ' compact-media-title__track--vertical' : ''}">
        <span class="compact-media-title__text">${safe}</span>
        <span class="compact-media-title__text" aria-hidden="true">${safe}</span>
      </span>`;
    const track = wrap.querySelector('.compact-media-title__track');
    if (!track) return;
    const duration = Math.max(18, dist / 7);
    track.style.setProperty('--marquee-duration', `${duration}s`);
    track.style.setProperty('--marquee-distance', `-${dist}px`);
  });
}

function updateCompactMedia() {
  const media = state.media;
  const showMediaCompact = media.active && !state.expanded && state.mode === 'media';
  island.classList.toggle('island--media-compact', showMediaCompact);

  if (!media.active) {
    compactCenter.textContent = L('mediaNone');
  } else {
    setCompactMediaTitle(media.title);
  }
  compactLeft.innerHTML = media.active && media.playing
    ? '<div class="mini-eq"><span></span><span></span><span></span><span></span></div>'
    : '';
  compactRight.innerHTML = media.active && media.playing
    ? '<div class="live-dot"></div>'
    : '';

  if (!state.expanded) resizeWindow();
}

function applyMediaSnapshot(snapshot) {
  if (snapshot?.session) {
    const session = snapshot.session;
    const prev = state.media;
    const positionMs = session.positionMs != null ? session.positionMs : (prev.positionMs ?? 0);
    const durationMs = session.durationMs > 0 ? session.durationMs : (prev.durationMs || 0);

    state.media = { ...prev, ...session, positionMs, durationMs };
    state.mediaAnchor = {
      positionMs,
      durationMs,
      playing: !!session.playing,
      updatedAt: Date.now(),
    };
  }
  if (state.islandHovered || state.expanded) {
    suspendOutsideCollapse(700);
  }
  updateMediaUI();
  syncRuntimeTimers();
  syncBackgroundThrottle();
}

// ─── Timer ───
function parseTimerInput(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^(\d{1,3}):(\d{2})$/);
  if (match) {
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    if (seconds >= 0 && seconds < 60) return minutes * 60 + seconds;
  }
  const onlySeconds = Number(trimmed);
  if (Number.isFinite(onlySeconds) && onlySeconds > 0) return Math.floor(onlySeconds);
  return null;
}

function cancelTimerEdit() {
  if (!state.timerEditing) return;
  state.timerEditing = false;
  if (timerEditInput) {
    timerEditInput.classList.add('hidden');
    timerEditInput.blur();
  }
  if (timerValue) timerValue.classList.remove('hidden');
  if (state.mode === 'timer') updateInputMode('timer');
}

function commitTimerEdit() {
  if (!state.timerEditing || !timerEditInput) return;
  const seconds = parseTimerInput(timerEditInput.value);
  state.timerEditing = false;
  timerEditInput.classList.add('hidden');
  if (timerValue) timerValue.classList.remove('hidden');
  if (seconds && seconds > 0 && seconds <= 86400) {
    stopTimer();
    state.timerTotal = seconds;
    state.timerRemaining = seconds;
  }
  updateTimerUI();
  if (state.mode === 'timer') updateInputMode('timer');
}

function beginTimerEdit() {
  if (state.timerRunning || !timerValue || !timerEditInput) return;
  state.timerEditing = true;
  timerValue.classList.add('hidden');
  timerEditInput.classList.remove('hidden');
  timerEditInput.value = formatTime(state.timerRemaining);
  updateInputMode('timer');
  setTimeout(() => {
    timerEditInput.focus();
    timerEditInput.select();
  }, 30);
}

function updateTimerUI() {
  if (!state.timerEditing && timerValue) {
    timerValue.textContent = formatTime(state.timerRemaining);
    timerValue.title = state.timerRunning ? '' : L('timerTapToEdit');
    timerValue.classList.toggle('timer-value--editable', !state.timerRunning);
  }
  const pct = state.timerRemaining / state.timerTotal;
  timerRingFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct);
  btnTimerToggle.textContent = state.timerRunning ? '⏸' : '▶';

  if (!state.expanded && state.mode === 'timer') {
    compactCenter.innerHTML = `<span class="compact-timer">${formatTime(state.timerRemaining)}</span>`;
    compactLeft.innerHTML = '⏱';
    compactRight.innerHTML = state.timerRunning ? '<div class="live-dot" style="background:#ff9f0a"></div>' : '';
  }
}

function startTimer() {
  if (state.timerInterval) return;
  cancelTimerEdit();
  state.timerRunning = true;
  state.timerInterval = setInterval(() => {
    if (state.timerRemaining <= 0) {
      stopTimer();
      showNotification({
        icon: '⏰',
        app: L('timerDoneApp'),
        title: L('timerDoneTitle'),
        body: L('timerDoneBody'),
      });
      return;
    }
    state.timerRemaining--;
    updateTimerUI();
  }, 1000);
  updateTimerUI();
  resizeWindow();
}

function stopTimer() {
  state.timerRunning = false;
  cancelTimerEdit();
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  updateTimerUI();
  resizeWindow();
}

function resetTimer() {
  stopTimer();
  state.timerRemaining = state.timerTotal;
  updateTimerUI();
}

// ─── Panels ───
function showPanel(mode) {
  if (mode !== 'settings' && !getEnabledModes().includes(mode)) {
    mode = getFirstEnabledMode();
  }

  if (mode !== 'timer') cancelTimerEdit();

  const prevMode = state.mode;
  clearDelayedCollapse();
  state.mode = mode;
  island.dataset.mode = mode;

  document.querySelectorAll('.panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === mode);
  });

  document.querySelectorAll('.dot').forEach((d) => {
    d.classList.toggle('active', d.dataset.mode === mode);
  });
  if (btnSettings) btnSettings.classList.toggle('active', mode === 'settings');

  if (mode !== 'audio') stopAudioPolling();

  island.classList.remove('island--settings-view', 'island--notes-view', 'island--audio-view', 'island--calendar-view', 'island--gemini-view', 'island--notes-compact');

  if (mode === 'settings') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--expanded', 'island--notes-compact');
    island.classList.add('island--settings-view');
    state.expanded = true;
    renderDisplayList();
    syncFeatureInputs();
  } else if (mode === 'notes') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--expanded', 'island--notes-compact');
    island.classList.add('island--notes-view');
    state.expanded = true;
    renderNotes();
  } else if (mode === 'audio') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--expanded', 'island--notes-compact', 'island--calendar-view', 'island--gemini-view');
    island.classList.add('island--audio-view');
    state.expanded = true;
    startAudioPolling();
  } else if (mode === 'calendar') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--expanded', 'island--notes-compact', 'island--audio-view', 'island--gemini-view');
    island.classList.add('island--calendar-view');
    state.expanded = true;
    renderCalendar();
  } else if (mode === 'gemini') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--expanded', 'island--notes-compact', 'island--audio-view', 'island--calendar-view');
    island.classList.add('island--gemini-view');
    state.expanded = true;
    renderGeminiChat();
  } else if (mode === 'media' && state.settings.features.media) {
    if (prevMode !== 'media') {
      window.dynwin.getMedia().then(applyMediaSnapshot).catch(() => {});
    }
    if (state.expanded) {
      stopAudioPolling();
      island.classList.add('island--expanded');
    }
  } else if (state.expanded) {
    stopAudioPolling();
    island.classList.add('island--expanded');
  }

  updateInputMode(mode);
  updateCompactView();
  resizeWindow();
  if (state.expanded) {
    syncExpandedState();
    syncBackgroundThrottle();
    if (prevMode !== mode) window.dynwin?.focusIsland?.();
  } else {
    syncBackgroundThrottle();
  }
  syncRuntimeTimers();
}

function updateCompactView() {
  island.classList.toggle(
    'island--media-compact',
    state.mode === 'media' && state.media.active && !state.expanded
  );

  compactLeft.innerHTML = '';
  compactRight.innerHTML = '';

  switch (state.mode) {
    case 'clock':
      updateClock();
      break;
    case 'media':
      updateCompactMedia();
      break;
    case 'timer':
      updateTimerUI();
      break;
    case 'settings':
      compactCenter.textContent = L('compactSettings');
      break;
    case 'notes':
      updateCompactNotes();
      break;
    case 'audio':
      updateCompactAudio();
      break;
    case 'calendar':
      updateCompactCalendar();
      break;
    case 'gemini':
      updateCompactGemini();
      break;
    case 'notification':
      break;
  }
}

// ─── Expand / Collapse ───
function clearIslandTransition() {
  clearTimeout(state.expandTransitionTimeout);
  clearTimeout(state.collapseTransitionTimeout);
  clearDelayedCollapse();
  state.isCollapsing = false;
  state.collapseWindowSizeKey = null;
  island.classList.remove('island--expanding', 'island--collapsing');
}

function expand() {
  if (state.expanded) return;
  clearTimeout(state.collapseTimeout);
  clearIslandTransition();
  suspendOutsideCollapse(ISLAND_TRANSITION_MS + 200);
  state.expanded = true;

  island.classList.add('island--expanding');
  island.classList.remove('island--collapsing');

  if (state.mode === 'settings') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--notes-view', 'island--audio-view', 'island--calendar-view', 'island--gemini-view', 'island--notes-compact');
    island.classList.add('island--settings-view');
  } else if (state.mode === 'notes') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--settings-view', 'island--audio-view', 'island--calendar-view', 'island--gemini-view', 'island--notes-compact');
    island.classList.add('island--notes-view');
  } else if (state.mode === 'audio') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--settings-view', 'island--notes-view', 'island--calendar-view', 'island--gemini-view', 'island--notes-compact');
    island.classList.add('island--audio-view');
    startAudioPolling();
  } else if (state.mode === 'calendar') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--settings-view', 'island--notes-view', 'island--audio-view', 'island--gemini-view', 'island--notes-compact');
    island.classList.add('island--calendar-view');
    renderCalendar();
  } else if (state.mode === 'gemini') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--settings-view', 'island--notes-view', 'island--audio-view', 'island--calendar-view', 'island--notes-compact');
    island.classList.add('island--gemini-view');
    renderGeminiChat();
  } else if (state.mode === 'notification') {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--settings-view', 'island--notes-view', 'island--audio-view', 'island--calendar-view', 'island--gemini-view');
    island.classList.add('island--expanded');
  } else {
    island.classList.remove('island--compact', 'island--notification', 'island--timer-compact', 'island--settings-view', 'island--notes-view', 'island--audio-view', 'island--calendar-view', 'island--gemini-view', 'island--notes-compact');
    island.classList.add('island--expanded');
    showPanel(state.mode);
  }

  updateInputMode(state.mode);
  resizeWindow();

  syncExpandedState();
  syncBackgroundThrottle();
  syncRuntimeTimers();
  state.expandTransitionTimeout = setTimeout(() => {
    island.classList.remove('island--expanding');
    schedulePanelInputFocus(state.mode);
    window.dynwin?.focusIsland?.();
  }, ISLAND_TRANSITION_MS);
}

function collapse() {
  if (!state.expanded) return;

  clearIslandTransition();

  state.collapseWindowSizeKey = getWindowSizeKey();
  state.isCollapsing = true;

  island.classList.add('island--collapsing');
  island.classList.remove('island--expanding');

  updateInputMode('clock');
  state.expanded = false;
  island.classList.remove('island--expanded', 'island--settings-view', 'island--notes-view', 'island--audio-view', 'island--calendar-view', 'island--gemini-view');
  stopAudioPolling();

  if (state.mode === 'notification') {
    island.classList.add('island--notification');
  } else if (state.mode === 'timer' && state.timerRunning) {
    island.classList.add('island--timer-compact');
  } else if (state.mode === 'notes') {
    island.classList.add('island--notes-compact');
  } else {
    island.classList.add('island--compact');
  }

  updateCompactView();

  syncExpandedState();
  syncBackgroundThrottle();
  syncRuntimeTimers();

  state.collapseTransitionTimeout = setTimeout(() => {
    state.isCollapsing = false;
    state.collapseWindowSizeKey = null;
    island.classList.remove('island--collapsing');
    resizeWindow();
  }, ISLAND_TRANSITION_MS);
}

// ─── Notifications ───
function showNotification(notif) {
  clearTimeout(state.notificationTimeout);

  notifIcon.textContent = notif.icon;
  notifApp.textContent = notif.app;
  notifTitle.textContent = notif.title;
  notifBody.textContent = notif.body;

  const prevMode = state.mode;
  const wasExpanded = state.expanded;
  state.mode = 'notification';
  state.expanded = false;

  island.classList.remove('island--compact', 'island--expanded', 'island--timer-compact', 'island--settings-view', 'island--notes-view', 'island--audio-view', 'island--calendar-view', 'island--gemini-view', 'island--notes-compact');
  island.classList.add('island--notification', 'island--pulse');

  document.querySelectorAll('.panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === 'notification');
  });

  syncExpandedState();
  syncBackgroundThrottle();
  syncRuntimeTimers();
  resizeWindow();
  setTimeout(() => island.classList.remove('island--pulse'), 600);

  state.notificationTimeout = setTimeout(() => {
    state.mode = prevMode === 'notification' ? getFirstEnabledMode() : prevMode;
    island.classList.remove('island--notification');

    if (wasExpanded) {
      state.expanded = true;
      if (state.mode === 'settings') {
        island.classList.add('island--settings-view');
      } else if (state.mode === 'notes') {
        island.classList.add('island--notes-view');
      } else if (state.mode === 'audio') {
        island.classList.add('island--audio-view');
        startAudioPolling();
      } else if (state.mode === 'calendar') {
        island.classList.add('island--calendar-view');
      } else if (state.mode === 'gemini') {
        island.classList.add('island--gemini-view');
      } else {
        island.classList.add('island--expanded');
      }
      showPanel(state.mode);
    } else {
      island.classList.add('island--compact');
      showPanel(state.mode);
    }
    resizeWindow();
  }, 4000);
}

// ─── Mode cycling ───
function canScrollInDirection(el, deltaY) {
  if (!el || el.scrollHeight <= el.clientHeight + 1) return false;
  if (deltaY > 0) return el.scrollTop < el.scrollHeight - el.clientHeight - 1;
  return el.scrollTop > 0;
}

function findPanelScrollContainer(target) {
  return target.closest('.notes-scroll, .audio-scroll, .settings-scroll, .calendar-scroll, .gemini-scroll');
}

function cycleModeBy(delta) {
  const modes = getEnabledModes();
  if (!modes.length || delta === 0) return;

  let idx;
  if (state.mode === 'settings' || state.mode === 'notification') {
    idx = delta > 0 ? -1 : 0;
  } else {
    idx = modes.indexOf(state.mode);
    if (idx < 0) idx = 0;
  }

  const next = modes[(idx + delta + modes.length) % modes.length];
  showPanel(next);
}

function cycleMode() {
  cycleModeBy(1);
}

function handleIslandWheel(e) {
  if (state.mode === 'notification') return;
  if (e.target.closest('input[type="range"]')) return;

  if (state.mode === 'settings') {
    const scrollEl = e.target.closest('.settings-scroll')
      || document.querySelector('.panel--settings .settings-scroll');
    if (scrollEl) {
      e.preventDefault();
      scrollEl.scrollTop += e.deltaY;
    }
    return;
  }

  const scrollEl = findPanelScrollContainer(e.target);
  if (scrollEl && canScrollInDirection(scrollEl, e.deltaY)) return;

  e.preventDefault();
  e.stopPropagation();

  if (state.wheelLocked) return;
  state.wheelLocked = true;
  setTimeout(() => { state.wheelLocked = false; }, WHEEL_TAB_COOLDOWN_MS);

  cycleModeBy(e.deltaY > 0 ? 1 : -1);
}

// ─── Event listeners ───
document.addEventListener('keydown', handleTypingRedirect, true);

island.addEventListener('mouseenter', () => {
  if (state.isDragging) return;
  state.islandHovered = true;
  clearTimeout(state.collapseTimeout);
  clearDelayedCollapse();
  clearTimeout(state.hoverTimeout);
  suspendOutsideCollapse(600);
  state.hoverTimeout = setTimeout(expand, 80);
});

island.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (canStartIslandDrag(e.target)) {
    dragState = { startX: e.screenX, startY: e.screenY, active: false };
    return;
  }
  if (e.target.closest('select')) suspendOutsideCollapse(800);
  if (state.expanded) window.dynwin?.focusIsland?.();
});

document.addEventListener('mousemove', handleIslandDragMove);
document.addEventListener('mouseup', endIslandDrag);

island.addEventListener('mouseleave', () => {
  if (state.isDragging) return;
  state.islandHovered = false;
  clearTimeout(state.hoverTimeout);
  if (isDelayedCollapsePanel()) {
    scheduleDelayedCollapse();
    return;
  }
  state.collapseTimeout = setTimeout(collapse, 350);
});

island.addEventListener('wheel', handleIslandWheel, { passive: false });

island.addEventListener('click', (e) => {
  if (state.dragDidMove) return;
  if (e.target.closest(DRAG_EXCLUDE_SELECTOR)) return;
  cycleMode();
});

btnPlay.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!state.media.active) return;
  await window.dynwin.mediaCommand('playPause');
  showPanel('media');
});

btnPrev.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!state.media.active) return;
  await window.dynwin.mediaCommand('previous');
  showPanel('media');
});

btnNext.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!state.media.active) return;
  await window.dynwin.mediaCommand('next');
  showPanel('media');
});

btnTimerToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.timerRunning) stopTimer();
  else startTimer();
  showPanel('timer');
});

btnTimerReset.addEventListener('click', (e) => {
  e.stopPropagation();
  resetTimer();
});

if (timerValue) {
  timerValue.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.timerRunning) beginTimerEdit();
  });
}

if (timerEditInput) {
  timerEditInput.addEventListener('mousedown', (e) => e.stopPropagation());
  timerEditInput.addEventListener('click', (e) => e.stopPropagation());
  timerEditInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTimerEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelTimerEdit();
      updateTimerUI();
    }
  });
  timerEditInput.addEventListener('blur', () => {
    if (state.timerEditing) commitTimerEdit();
  });
}

indicators.addEventListener('click', (e) => {
  const dot = e.target.closest('.dot');
  if (!dot) return;
  e.stopPropagation();
  showPanel(dot.dataset.mode);
});

btnSettings.addEventListener('click', (e) => {
  e.stopPropagation();
  showPanel(state.mode === 'settings' ? getFirstEnabledMode() : 'settings');
});

btnAddNote.addEventListener('click', (e) => {
  e.stopPropagation();
  addNote();
});

if (btnPasteNote) {
  btnPasteNote.addEventListener('click', (e) => {
    e.stopPropagation();
    pasteIntoNoteInput();
  });
  btnPasteNote.addEventListener('mousedown', (e) => e.stopPropagation());
}

noteInput.addEventListener('input', handlePanelDraftInput);
noteInput.addEventListener('mousedown', (e) => e.stopPropagation());
noteInput.addEventListener('click', (e) => e.stopPropagation());

noteInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addNote();
  }
});

notesList.addEventListener('input', (e) => {
  if (e.target.matches('[data-edit-id]')) handlePanelDraftInput();
});
notesList.addEventListener('mousedown', (e) => e.stopPropagation());

if (btnPlaybackMute) {
  btnPlaybackMute.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await window.dynwin.togglePlaybackMute();
    if (result?.muted !== undefined) {
      state.audio.playback.muted = result.muted;
      updateAudioControlsUI();
      updateCompactAudio();
    } else {
      await loadAudioState();
    }
  });
}

if (btnRecordingMute) {
  btnRecordingMute.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await window.dynwin.toggleRecordingMute();
    if (result?.muted !== undefined) {
      state.audio.recording.muted = result.muted;
      updateAudioControlsUI();
    } else {
      await loadAudioState();
    }
  });
}

if (playbackVolume) {
  playbackVolume.addEventListener('mousedown', (e) => e.stopPropagation());
  playbackVolume.addEventListener('input', (e) => {
    e.stopPropagation();
    state.playbackVolumeDragging = true;
    const val = Number(playbackVolume.value);
    playbackVolumeLabel.textContent = `${val}%`;
  });
  playbackVolume.addEventListener('change', async (e) => {
    e.stopPropagation();
    state.playbackVolumeDragging = false;
    const val = Number(playbackVolume.value);
    state.audio.playback.volume = val;
    await window.dynwin.setPlaybackVolume(val);
    updateCompactAudio();
  });
}

if (recordingVolume) {
  recordingVolume.addEventListener('mousedown', (e) => e.stopPropagation());
  recordingVolume.addEventListener('input', (e) => {
    e.stopPropagation();
    state.recordingVolumeDragging = true;
    const val = Number(recordingVolume.value);
    recordingVolumeLabel.textContent = `${val}%`;
  });
  recordingVolume.addEventListener('change', async (e) => {
    e.stopPropagation();
    state.recordingVolumeDragging = false;
    const val = Number(recordingVolume.value);
    state.audio.recording.volume = val;
    await window.dynwin.setRecordingVolume(val);
  });
}

if (audioOutputSelect) {
  audioOutputSelect.addEventListener('mousedown', (e) => e.stopPropagation());
  audioOutputSelect.addEventListener('click', (e) => e.stopPropagation());
  audioOutputSelect.addEventListener('change', async (e) => {
    e.stopPropagation();
    const id = audioOutputSelect.value;
    await window.dynwin.setDefaultPlayback(id);
    state.audio.playback.defaultId = id;
    await loadAudioState();
  });
}

if (audioInputSelect) {
  audioInputSelect.addEventListener('mousedown', (e) => e.stopPropagation());
  audioInputSelect.addEventListener('click', (e) => e.stopPropagation());
  audioInputSelect.addEventListener('change', async (e) => {
    e.stopPropagation();
    const id = audioInputSelect.value;
    await window.dynwin.setDefaultRecording(id);
    state.audio.recording.defaultId = id;
    await loadAudioState();
  });
}

if (btnCalPrev) {
  btnCalPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    shiftCalendarMonth(-1);
  });
}

if (btnCalNext) {
  btnCalNext.addEventListener('click', (e) => {
    e.stopPropagation();
    shiftCalendarMonth(1);
  });
}

if (calGrid) {
  calGrid.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target.closest('[data-date]');
    if (!btn) return;
    selectCalendarDate(btn.dataset.date);
  });
}

if (calEvents) {
  calEvents.addEventListener('click', async (e) => {
    e.stopPropagation();
    const del = e.target.closest('[data-delete-cal]');
    if (del) await deleteCalendarEvent(del.dataset.deleteCal);
  });
}

if (btnCalAdd) {
  btnCalAdd.addEventListener('click', (e) => {
    e.stopPropagation();
    addCalendarEvent();
  });
}

if (calEventText) {
  calEventText.addEventListener('input', handlePanelDraftInput);
  calEventText.addEventListener('mousedown', (e) => e.stopPropagation());
  calEventText.addEventListener('click', (e) => e.stopPropagation());
  calEventText.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      addCalendarEvent();
    }
  });
}

if (calEventTime) {
  calEventTime.addEventListener('mousedown', (e) => e.stopPropagation());
  calEventTime.addEventListener('click', (e) => e.stopPropagation());
}

if (btnGeminiSend) {
  btnGeminiSend.addEventListener('click', (e) => {
    e.stopPropagation();
    sendGeminiMessage();
  });
}

if (btnGeminiClear) {
  btnGeminiClear.addEventListener('click', (e) => {
    e.stopPropagation();
    clearGeminiChat();
  });
}

if (geminiInput) {
  geminiInput.addEventListener('input', handlePanelDraftInput);
  geminiInput.addEventListener('mousedown', (e) => e.stopPropagation());
  geminiInput.addEventListener('click', (e) => e.stopPropagation());
  geminiInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendGeminiMessage();
    }
  });
}

if (geminiApiKeyInput) {
  geminiApiKeyInput.addEventListener('mousedown', (e) => e.stopPropagation());
  geminiApiKeyInput.addEventListener('click', (e) => e.stopPropagation());
}

if (settingsLocale) {
  settingsLocale.addEventListener('mousedown', (e) => e.stopPropagation());
  settingsLocale.addEventListener('click', (e) => e.stopPropagation());
  settingsLocale.addEventListener('change', (e) => e.stopPropagation());
}

const GITHUB_PROFILE_URL = 'https://github.com/onurgnll';

if (settingsFollowLink) {
  settingsFollowLink.addEventListener('mousedown', (e) => e.stopPropagation());
  settingsFollowLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dynwin?.openExternal?.(GITHUB_PROFILE_URL);
  });
}

notesList.addEventListener('click', (e) => {
  e.stopPropagation();
  const copyBtn = e.target.closest('[data-copy-id]');
  const editBtn = e.target.closest('[data-edit-id]');
  const saveBtn = e.target.closest('[data-save-id]');
  const cancelBtn = e.target.closest('[data-cancel-id]');
  const deleteBtn = e.target.closest('[data-delete-id]');

  if (copyBtn && copyBtn.tagName === 'BUTTON' && copyBtn.dataset.copyId) {
    e.preventDefault();
    const note = state.notes.find((n) => n.id === copyBtn.dataset.copyId);
    if (note) void copyNoteText(note.text, copyBtn);
    return;
  }
  if (editBtn && editBtn.tagName === 'BUTTON') {
    state.editingNoteId = editBtn.dataset.editId;
    renderNotes();
    const textarea = notesList.querySelector(`[data-edit-id="${state.editingNoteId}"]`);
    if (textarea) setTimeout(() => textarea.focus(), 50);
    return;
  }
  if (saveBtn) {
    saveEditedNote(saveBtn.dataset.saveId);
    return;
  }
  if (cancelBtn) {
    state.editingNoteId = null;
    renderNotes();
    handlePanelDraftInput();
    return;
  }
  if (deleteBtn) {
    deleteNote(deleteBtn.dataset.deleteId);
  }
});

// ─── Init ───
document.title = '';

async function init() {
  if (!window.dynwin) return;

  state.displayId = window.dynwin.displayId;

  window.dynwin.onInit((ctx) => {
    state.displayId = ctx.displayId;
    if (ctx.islandPosition) applyIslandAnchor(ctx.islandPosition);
    applySettings(ctx);
  });

  window.dynwin.onSettingsUpdate(applySettings);
  window.dynwin.onCollapseRequest(handleOutsideCollapseRequest);
  window.dynwin.onPositionUpdate(applyIslandAnchor);

  const initial = await window.dynwin.getSettings();
  applySettings(initial);
  bindSettingsAutoSave();

  showPanel(getFirstEnabledMode());
  updateMediaUI();
  updateTimerUI();
  updateClock();
  syncBackgroundThrottle();
  syncRuntimeTimers();
  resizeWindow();

  window.dynwin.getMedia().then(applyMediaSnapshot).catch(() => {});
  window.dynwin.onMediaUpdate(applyMediaSnapshot);
  window.dynwin.getWeather().then(applyWeather).catch(() => {});
  window.dynwin.onWeatherUpdate(applyWeather);

  window.dynwin.getNotes().then(applyNotes).catch(() => {});
  window.dynwin.onNotesUpdate(applyNotes);

  window.dynwin.getCalendarEvents().then(applyCalendarEvents).catch(() => {});
  window.dynwin.onCalendarUpdate(applyCalendarEvents);
}

let clockTimer = null;
let mediaProgressTimer = null;

function syncClockTimer() {
  if (needsClockTick()) {
    if (!clockTimer) {
      updateClock();
      clockTimer = setInterval(updateClock, 1000);
    }
  } else if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

function syncMediaProgressTimer() {
  if (needsMediaProgressTick()) {
    if (!mediaProgressTimer) {
      updateMediaProgress();
      mediaProgressTimer = setInterval(updateMediaProgress, 500);
    }
  } else if (mediaProgressTimer) {
    clearInterval(mediaProgressTimer);
    mediaProgressTimer = null;
  }
}

function syncRuntimeTimers() {
  syncClockTimer();
  syncMediaProgressTimer();
}

init();

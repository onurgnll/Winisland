const { screen } = require('electron');

let pollInterval = null;
let lastDown = false;
let watching = false;
/** @type {() => Array<{ window: import('electron').BrowserWindow }>} */
let getExpandedEntries = () => [];

/** @type {((vk: number) => number) | null} */
let getAsyncKeyState = null;

try {
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');
  getAsyncKeyState = user32.func('short __stdcall GetAsyncKeyState(int vKey)');
} catch {
  getAsyncKeyState = null;
}

function isPointOutsideWindow(point, win) {
  if (!win || win.isDestroyed()) return false;
  const b = win.getBounds();
  return point.x < b.x
    || point.x >= b.x + b.width
    || point.y < b.y
    || point.y >= b.y + b.height;
}

function handleOutsideClick() {
  const point = screen.getCursorScreenPoint();
  for (const entry of getExpandedEntries()) {
    const win = entry.window;
    if (!win || win.isDestroyed()) continue;
    if (isPointOutsideWindow(point, win)) {
      win.webContents.send('island:collapse-request');
    }
  }
}

function pollMouseButton() {
  if (!watching) return;

  const down = getAsyncKeyState
    ? (getAsyncKeyState(0x01) & 0x8000) !== 0
    : false;

  const justPressed = down && !lastDown;
  lastDown = down;
  if (justPressed) handleOutsideClick();
}

function startPoller() {
  if (pollInterval || !getAsyncKeyState) return;
  pollInterval = setInterval(pollMouseButton, 50);
}

function stopPoller() {
  if (!pollInterval) return;
  clearInterval(pollInterval);
  pollInterval = null;
  lastDown = false;
}

function updateOutsideClickWatch(entriesProvider) {
  getExpandedEntries = entriesProvider;
  const hasExpanded = getExpandedEntries().length > 0;
  watching = hasExpanded;
  if (hasExpanded && getAsyncKeyState) {
    startPoller();
  } else {
    stopPoller();
  }
}

module.exports = { updateOutsideClickWatch };

const TRANSPARENT = '#00000000';

function enforceTransparency(win) {
  if (!win || win.isDestroyed()) return;
  win.setBackgroundColor(TRANSPARENT);
}

function attachTransparencyFixes(win) {
  win.on('blur', () => enforceTransparency(win));
  win.on('focus', () => enforceTransparency(win));
  win.on('show', () => enforceTransparency(win));
  win.on('restore', () => enforceTransparency(win));

  win.webContents.on('did-finish-load', () => {
    enforceTransparency(win);
    win.webContents.insertCSS('html, body, #app { background: transparent !important; }');
  });
}

module.exports = {
  TRANSPARENT,
  enforceTransparency,
  attachTransparencyFixes,
};

const { execFileSync } = require('child_process');
const { app } = require('electron');

const INSTALLER_REG_KEY = 'HKCU\\Software\\winisland\\winisland';
const INSTALLER_REG_VALUE = 'launchAtStartup';

function applyLaunchAtStartup(enabled) {
  if (process.platform !== 'win32') return;
  app.setLoginItemSettings({
    openAtLogin: !!enabled,
    path: process.execPath,
    args: [],
  });
}

function readInstallerStartupFlag() {
  if (process.platform !== 'win32' || !app.isPackaged) return false;
  try {
    const out = execFileSync(
      'reg',
      ['query', INSTALLER_REG_KEY, '/v', INSTALLER_REG_VALUE],
      { encoding: 'utf8', windowsHide: true }
    );
    return /REG_DWORD\s+0x1/.test(out) || /\s1\s*$/.test(out.trim());
  } catch {
    return false;
  }
}

function clearInstallerStartupFlag() {
  if (process.platform !== 'win32') return;
  try {
    execFileSync(
      'reg',
      ['delete', INSTALLER_REG_KEY, '/v', INSTALLER_REG_VALUE, '/f'],
      { windowsHide: true }
    );
  } catch {
    // ignore
  }
}

function mergeInstallerStartupPreference(settings) {
  if (!readInstallerStartupFlag()) return settings;
  clearInstallerStartupFlag();
  return { ...settings, launchAtStartup: true };
}

module.exports = {
  applyLaunchAtStartup,
  mergeInstallerStartupPreference,
};

const { execFile } = require('child_process');
const { getResourcePath } = require('./paths');

const AUDIO_SCRIPT = getResourcePath('scripts', 'audio-api.ps1');
const BT_SCRIPT = getResourcePath('scripts', 'bluetooth-api.ps1');

function decodePsOutput(buf) {
  if (!buf) return '';
  if (Buffer.isBuffer(buf)) return buf.toString('utf8');
  return String(buf);
}

function cleanPsError(text) {
  return decodePsOutput(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line && !line.startsWith('At ') && !line.includes(':char:'))
    .join(' ')
    .trim();
}

function runPs(script, args = []) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args],
      { windowsHide: true, timeout: 25000, maxBuffer: 2 * 1024 * 1024, encoding: 'buffer' },
      (err, stdout, stderr) => {
        if (err) {
          const msg = cleanPsError(stderr) || cleanPsError(stdout) || err.message;
          reject(new Error(msg || 'PowerShell hatasi'));
          return;
        }
        const line = decodePsOutput(stdout).trim();
        if (!line) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(line));
        } catch (parseErr) {
          reject(new Error(`JSON parse: ${parseErr.message}`));
        }
      }
    );
  });
}

function audioAction(action, extra = {}) {
  const args = ['-Action', action];
  if (extra.deviceId) args.push('-DeviceId', extra.deviceId);
  if (extra.value !== undefined) args.push('-Value', String(extra.value));
  if (extra.bool !== undefined) args.push('-Bool', extra.bool ? 'true' : 'false');
  return runPs(AUDIO_SCRIPT, args);
}

function getAudioState() {
  return audioAction('GetState');
}

function setPlaybackVolume(value) {
  return audioAction('SetPlaybackVolume', { value });
}

function setRecordingVolume(value) {
  return audioAction('SetRecordingVolume', { value });
}

function setPlaybackMute(muted) {
  return audioAction('SetPlaybackMute', { bool: muted });
}

function setRecordingMute(muted) {
  return audioAction('SetRecordingMute', { bool: muted });
}

function togglePlaybackMute() {
  return audioAction('TogglePlaybackMute');
}

function toggleRecordingMute() {
  return audioAction('ToggleRecordingMute');
}

function setDefaultPlayback(deviceId) {
  return audioAction('SetDefaultPlayback', { deviceId });
}

function setDefaultRecording(deviceId) {
  return audioAction('SetDefaultRecording', { deviceId });
}

function normalizeBluetoothDevices(data) {
  if (!data) return { devices: [] };
  let devices = data.devices;
  if (!devices) return { devices: [] };
  if (Array.isArray(devices)) return { devices };
  if (devices.value && Array.isArray(devices.value)) return { devices: devices.value };
  if (typeof devices === 'object' && devices.name) return { devices: [devices] };
  return { devices: [] };
}

function getBluetoothDevices() {
  return runPs(BT_SCRIPT, ['-Action', 'GetDevices']).then(normalizeBluetoothDevices);
}

module.exports = {
  getAudioState,
  setPlaybackVolume,
  setRecordingVolume,
  setPlaybackMute,
  setRecordingMute,
  togglePlaybackMute,
  toggleRecordingMute,
  setDefaultPlayback,
  setDefaultRecording,
  getBluetoothDevices,
};

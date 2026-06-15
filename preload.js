const { contextBridge, ipcRenderer } = require('electron');

function getDisplayId() {
  const arg = process.argv.find((a) => a.startsWith('--display-id='));
  return arg ? Number(arg.split('=')[1]) : null;
}

contextBridge.exposeInMainWorld('dynwin', {
  displayId: getDisplayId(),
  resizeIsland: (sizeKey) => ipcRenderer.send('resize-island', sizeKey),
  setInputMode: (enabled) => ipcRenderer.send('set-input-mode', enabled),
  setExpanded: (expanded) => ipcRenderer.send('island:set-expanded', expanded),
  setBackgroundThrottled: (throttled) => ipcRenderer.send('island:set-throttled', throttled),
  focusIsland: () => ipcRenderer.send('island:focus'),
  dragStart: () => ipcRenderer.send('island:drag-start'),
  dragMove: (screenX, screenY) => ipcRenderer.send('island:drag-move', screenX, screenY),
  dragEnd: (screenX, screenY) => ipcRenderer.send('island:drag-end', screenX, screenY),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  readText: () => ipcRenderer.invoke('clipboard:read'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  getMedia: () => ipcRenderer.invoke('media:get'),
  mediaCommand: (action) => ipcRenderer.invoke('media:command', action),
  getWeather: () => ipcRenderer.invoke('weather:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  getDisplays: () => ipcRenderer.invoke('displays:get'),
  getNotes: () => ipcRenderer.invoke('notes:get'),
  addNote: (text) => ipcRenderer.invoke('notes:add', text),
  updateNote: (id, text) => ipcRenderer.invoke('notes:update', { id, text }),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
  getAudioState: () => ipcRenderer.invoke('audio:getState'),
  setPlaybackVolume: (value) => ipcRenderer.invoke('audio:setPlaybackVolume', value),
  setRecordingVolume: (value) => ipcRenderer.invoke('audio:setRecordingVolume', value),
  setPlaybackMute: (muted) => ipcRenderer.invoke('audio:setPlaybackMute', muted),
  setRecordingMute: (muted) => ipcRenderer.invoke('audio:setRecordingMute', muted),
  togglePlaybackMute: () => ipcRenderer.invoke('audio:togglePlaybackMute'),
  toggleRecordingMute: () => ipcRenderer.invoke('audio:toggleRecordingMute'),
  setDefaultPlayback: (deviceId) => ipcRenderer.invoke('audio:setDefaultPlayback', deviceId),
  setDefaultRecording: (deviceId) => ipcRenderer.invoke('audio:setDefaultRecording', deviceId),
  getBluetoothDevices: () => ipcRenderer.invoke('bluetooth:getDevices'),
  getCalendarEvents: () => ipcRenderer.invoke('calendar:get'),
  addCalendarEvent: (payload) => ipcRenderer.invoke('calendar:add', payload),
  updateCalendarEvent: (payload) => ipcRenderer.invoke('calendar:update', payload),
  deleteCalendarEvent: (id) => ipcRenderer.invoke('calendar:delete', id),
  sendGeminiMessage: (messages) => ipcRenderer.invoke('gemini:send', messages),
  onCalendarUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('calendar:update', handler);
    return () => ipcRenderer.removeListener('calendar:update', handler);
  },
  onNotesUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('notes:update', handler);
    return () => ipcRenderer.removeListener('notes:update', handler);
  },
  onMediaUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('media:update', handler);
    return () => ipcRenderer.removeListener('media:update', handler);
  },
  onWeatherUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('weather:update', handler);
    return () => ipcRenderer.removeListener('weather:update', handler);
  },
  onSettingsUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('settings:update', handler);
    return () => ipcRenderer.removeListener('settings:update', handler);
  },
  onInit: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('init:context', handler);
    return () => ipcRenderer.removeListener('init:context', handler);
  },
  onCollapseRequest: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('island:collapse-request', handler);
    return () => ipcRenderer.removeListener('island:collapse-request', handler);
  },
  onPositionUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('island:position', handler);
    return () => ipcRenderer.removeListener('island:position', handler);
  },
});

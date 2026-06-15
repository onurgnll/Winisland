const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { createSessionManager } = require('windows-media-sessions');
const mediaKeys = require('./media-keys');

const BACKEND_NAME = 'windows-media-sessions-backend.exe';

let manager = null;
let unsubscribe = null;
let lastSnapshot = { session: null };
/** @type {string | null} null = no track seen yet (first snapshot) */
let lastTrackKey = null;
let trackStartedAt = 0;

const TRACK_GRACE_MS = 6000;

function getMediaBackendPath() {
  if (process.env.WINDOWS_MEDIA_SESSIONS_BACKEND) {
    return path.resolve(process.env.WINDOWS_MEDIA_SESSIONS_BACKEND);
  }

  const candidates = [];

  if (app.isPackaged) {
    candidates.push(
      path.join(process.resourcesPath, 'bin', BACKEND_NAME),
      path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        'windows-media-sessions',
        'bin',
        'win-x64',
        BACKEND_NAME
      )
    );
  }

  candidates.push(
    path.join(__dirname, 'node_modules', 'windows-media-sessions', 'bin', 'win-x64', BACKEND_NAME)
  );

  try {
    const pkgRoot = path.dirname(require.resolve('windows-media-sessions/package.json'));
    candidates.push(path.join(pkgRoot, 'bin', 'win-x64', BACKEND_NAME));
  } catch {
    // package not installed
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

function getManager() {
  if (!manager) {
    const backendPath = getMediaBackendPath();
    if (!fs.existsSync(backendPath)) {
      console.error('[media] backend not found:', backendPath);
    }
    manager = createSessionManager({ backendPath });
    manager.on('error', (err) => {
      console.error('[media] backend error:', err.message);
    });
  }
  return manager;
}

function normalizeTimeline(timeline) {
  if (!timeline) return { positionMs: 0, durationMs: 0 };

  const rawPosition = Number(timeline.positionMs) || 0;
  let durationMs = Number(timeline.durationMs) || 0;

  // Some apps report duration in seconds despite the *Ms field name.
  if (durationMs > 0 && durationMs < 36000) {
    durationMs *= 1000;
  }

  // Windows reports position in seconds (field is misnamed positionMs).
  let positionMs;
  if (durationMs > 0 && rawPosition * 1000 > durationMs * 2) {
    positionMs = Math.round(rawPosition);
  } else {
    positionMs = Math.round(rawPosition * 1000);
  }

  if (durationMs > 0) {
    positionMs = Math.min(Math.max(0, positionMs), durationMs);
  }

  return { positionMs, durationMs };
}

function getTrackKey(session) {
  if (!session) return '';
  const title = session.title || '';
  const artist = session.artist || session.albumTitle || '';
  return `${title}\0${artist}\0${session.id || ''}`;
}

function finalizeSessionPosition(clientSession, trackChanged) {
  if (!clientSession.active) {
    trackStartedAt = 0;
    return clientSession;
  }

  const now = Date.now();

  if (trackChanged) {
    trackStartedAt = now;
    clientSession.positionMs = 0;
    return clientSession;
  }

  const sinceTrack = trackStartedAt > 0 ? now - trackStartedAt : TRACK_GRACE_MS;

  if (sinceTrack < TRACK_GRACE_MS) {
    if (clientSession.playing) {
      clientSession.positionMs = Math.min(
        sinceTrack,
        clientSession.durationMs > 0 ? clientSession.durationMs : sinceTrack
      );
    } else if (clientSession.positionMs > 2000) {
      clientSession.positionMs = 0;
    }
    return clientSession;
  }

  if (trackStartedAt > 0 && clientSession.playing) {
    const expected = sinceTrack;
    if (clientSession.positionMs > expected + 8000) {
      clientSession.positionMs = Math.min(
        expected,
        clientSession.durationMs > 0 ? clientSession.durationMs : expected
      );
    }
  }

  return clientSession;
}

function scheduleTimelineRefresh(sessionManager) {
  setTimeout(() => sessionManager.backend?.requestRefresh(), 250);
  setTimeout(() => sessionManager.backend?.requestRefresh(), 1200);
}

function pickSession(sessions, currentSessionId) {
  if (!sessions.length) return null;

  if (currentSessionId) {
    const current = sessions.find((s) => s.id === currentSessionId);
    if (current) return current;
  }

  const playing = sessions.find((s) => s.playbackStatus === 'playing');
  if (playing) return playing;

  const paused = sessions.find((s) => s.playbackStatus === 'paused');
  if (paused) return paused;

  return sessions[0];
}

function toClientSession(session, currentSessionId) {
  if (!session) {
    return {
      active: false,
      title: 'Medya yok',
      artist: 'Spotify, YouTube vb. başlatın',
      app: '',
      playing: false,
      positionMs: 0,
      durationMs: 0,
      thumbnail: null,
      controls: { canPlay: false, canPause: false, canSkipNext: false, canSkipPrevious: false },
    };
  }

  const { positionMs, durationMs } = normalizeTimeline(session.timeline);

  return {
    active: true,
    id: session.id,
    title: session.title || 'Bilinmeyen parça',
    artist: session.artist || session.albumTitle || 'Bilinmeyen sanatçı',
    app: session.sourceAppDisplayName || session.sourceAppUserModelId || '',
    playing: session.playbackStatus === 'playing',
    positionMs,
    durationMs,
    thumbnail: session.thumbnail || null,
    controls: session.controls || {
      canPlay: true,
      canPause: true,
      canSkipNext: true,
      canSkipPrevious: true,
    },
    isCurrent: session.id === currentSessionId,
  };
}

function buildSnapshot(sessions, currentSessionId) {
  const session = pickSession(sessions, currentSessionId);
  return {
    session: toClientSession(session, currentSessionId),
  };
}

function pushSnapshot(sessions, sendToRenderer, sessionManager = null) {
  const session = pickSession(sessions, null);
  const trackKey = getTrackKey(session);
  const trackChanged = !!trackKey && lastTrackKey != null && trackKey !== lastTrackKey;

  if (!session) {
    lastTrackKey = null;
    trackStartedAt = 0;
  } else {
    if (sessionManager && (trackChanged || lastTrackKey === null)) {
      scheduleTimelineRefresh(sessionManager);
    }
    lastTrackKey = trackKey;
  }

  const clientSession = finalizeSessionPosition(
    toClientSession(session, null),
    trackChanged
  );

  lastSnapshot = {
    session: clientSession,
    trackChanged,
  };
  sendToRenderer('media:update', lastSnapshot);
}

function startMediaBridge(sendToRenderer) {
  if (process.platform !== 'win32') {
    pushSnapshot([], sendToRenderer);
    return;
  }

  if (unsubscribe) return;

  const sessionManager = getManager();

  unsubscribe = sessionManager.onSessionsChanged((sessions) => {
    pushSnapshot(sessions, sendToRenderer, sessionManager);
  });

  sessionManager
    .getAllSessions()
    .then((sessions) => pushSnapshot(sessions, sendToRenderer, sessionManager))
    .catch((err) => {
      console.error('[media] failed to load sessions:', err.message);
    });
}

function getMediaSnapshot() {
  return lastSnapshot;
}

async function mediaCommand(action) {
  switch (action) {
    case 'playPause':
      await mediaKeys.playPause();
      break;
    case 'next':
      await mediaKeys.next();
      break;
    case 'previous':
      await mediaKeys.previous();
      break;
    default:
      throw new Error(`Unknown media action: ${action}`);
  }
}

async function stopMediaBridge() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (manager) {
    await manager.stop().catch(() => {});
    manager = null;
  }
  lastTrackKey = null;
  trackStartedAt = 0;
}

module.exports = {
  startMediaBridge,
  getMediaSnapshot,
  mediaCommand,
  stopMediaBridge,
};

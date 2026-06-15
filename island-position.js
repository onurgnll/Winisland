const EDGE_MARGIN = 8;
const ANCHOR_VERSION = 2;

const VALID_EDGES = new Set(['top', 'right', 'bottom', 'left']);

function defaultPosition() {
  return { edge: 'top', offset: null, anchorVersion: ANCHOR_VERSION };
}

function isVerticalEdge(edge) {
  return edge === 'left' || edge === 'right';
}

function resolveSizeKeyForEdge(sizeKey, edge) {
  const vertical = isVerticalEdge(edge);
  if (vertical) {
    if (sizeKey === 'compact') return 'compactV';
    if (sizeKey === 'timerCompact') return 'timerCompactV';
    if (sizeKey === 'notesCompact') return 'notesCompactV';
    if (sizeKey === 'mediaCompact') return 'mediaCompactV';
  } else {
    if (sizeKey === 'compactV') return 'compact';
    if (sizeKey === 'timerCompactV') return 'timerCompact';
    if (sizeKey === 'notesCompactV') return 'notesCompact';
    if (sizeKey === 'mediaCompactV') return 'mediaCompact';
  }
  return sizeKey;
}

function normalizePosition(raw) {
  if (!raw || !VALID_EDGES.has(raw.edge)) return defaultPosition();
  return {
    edge: raw.edge,
    offset: typeof raw.offset === 'number' && Number.isFinite(raw.offset) ? raw.offset : null,
    anchorVersion: raw.anchorVersion === ANCHOR_VERSION ? ANCHOR_VERSION : 1,
  };
}

function normalizeIslandPositions(raw, displayIds) {
  const positions = {};
  const valid = new Set(displayIds);
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      const id = Number(key);
      if (!valid.has(id)) continue;
      positions[id] = normalizePosition(value);
    }
  }
  return positions;
}

function migrateOffsetToAnchor(display, size, edge, position) {
  const { offset, anchorVersion } = position || {};
  if (offset == null) return null;
  if (anchorVersion === ANCHOR_VERSION) return offset;

  if (edge === 'top' || edge === 'bottom') {
    return offset + size.width / 2;
  }
  return offset + size.height / 2;
}

function resolveOffset(display, size, edge, offset) {
  const { width: areaW, height: areaH } = display.workAreaSize;

  if (edge === 'top' || edge === 'bottom') {
    const min = size.width / 2;
    const max = areaW - size.width / 2;
    const fallback = areaW / 2;
    if (max < min) return Math.round(fallback);
    if (offset == null) return Math.round(Math.max(min, Math.min(max, fallback)));
    return Math.max(min, Math.min(max, Math.round(offset)));
  }

  const min = size.height / 2;
  const max = areaH - size.height / 2;
  const fallback = areaH / 2;
  if (max < min) return Math.round(fallback);
  if (offset == null) return Math.round(Math.max(min, Math.min(max, fallback)));
  return Math.max(min, Math.min(max, Math.round(offset)));
}

function boundsFromPosition(display, size, position) {
  const wa = display.workArea;
  const edge = position?.edge || 'top';
  const anchorOffset = resolveOffset(
    display,
    size,
    edge,
    migrateOffsetToAnchor(display, size, edge, position)
  );

  if (edge === 'bottom') {
    return {
      x: Math.round(wa.x + anchorOffset - size.width / 2),
      y: wa.y + wa.height - size.height - EDGE_MARGIN,
      width: size.width,
      height: size.height,
    };
  }

  if (edge === 'right') {
    return {
      x: wa.x + wa.width - size.width - EDGE_MARGIN,
      y: Math.round(wa.y + anchorOffset - size.height / 2),
      width: size.width,
      height: size.height,
    };
  }

  if (edge === 'left') {
    return {
      x: wa.x + EDGE_MARGIN,
      y: Math.round(wa.y + anchorOffset - size.height / 2),
      width: size.width,
      height: size.height,
    };
  }

  return {
    x: Math.round(wa.x + anchorOffset - size.width / 2),
    y: wa.y + EDGE_MARGIN,
    width: size.width,
    height: size.height,
  };
}

function snapEdgeFromPoint(display, screenX, screenY) {
  const wa = display.workArea;
  const relX = screenX - wa.x;
  const relY = screenY - wa.y;
  const distTop = relY;
  const distBottom = wa.height - relY;
  const distRight = wa.width - relX;
  const distLeft = relX;

  const min = Math.min(distTop, distBottom, distRight, distLeft);
  if (min === distRight) return 'right';
  if (min === distLeft) return 'left';
  if (min === distBottom) return 'bottom';
  return 'top';
}

function offsetFromPoint(display, _size, edge, screenX, screenY) {
  const wa = display.workArea;
  if (edge === 'top' || edge === 'bottom') {
    return screenX - wa.x;
  }
  return screenY - wa.y;
}

function positionFromCursor(display, size, screenX, screenY) {
  const edge = snapEdgeFromPoint(display, screenX, screenY);
  const rawOffset = offsetFromPoint(display, size, edge, screenX, screenY);
  return {
    edge,
    offset: resolveOffset(display, size, edge, rawOffset),
    anchorVersion: ANCHOR_VERSION,
  };
}

function withAnchorVersion(position) {
  return {
    ...position,
    anchorVersion: ANCHOR_VERSION,
  };
}

module.exports = {
  EDGE_MARGIN,
  ANCHOR_VERSION,
  defaultPosition,
  isVerticalEdge,
  normalizePosition,
  normalizeIslandPositions,
  resolveOffset,
  boundsFromPosition,
  snapEdgeFromPoint,
  offsetFromPoint,
  positionFromCursor,
  migrateOffsetToAnchor,
  resolveSizeKeyForEdge,
  withAnchorVersion,
};

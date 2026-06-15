const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

function eventsPath() {
  return path.join(app.getPath('userData'), 'calendar.json');
}

function loadEvents() {
  try {
    const file = eventsPath();
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveEvents(events) {
  fs.mkdirSync(path.dirname(eventsPath()), { recursive: true });
  fs.writeFileSync(eventsPath(), JSON.stringify(events, null, 2), 'utf8');
  return events;
}

function normalizeTime(time) {
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

function normalizeDate(date) {
  const m = String(date || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    return null;
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
}

function getEvents() {
  return sortEvents(loadEvents());
}

function addEvent({ date, time, text }) {
  const safeDate = normalizeDate(date);
  const safeTime = normalizeTime(time);
  const trimmed = String(text || '').trim();
  if (!safeDate || !safeTime || !trimmed) return getEvents();

  const events = loadEvents();
  events.push({
    id: crypto.randomUUID(),
    date: safeDate,
    time: safeTime,
    text: trimmed,
    createdAt: Date.now(),
  });
  saveEvents(events);
  return getEvents();
}

function updateEvent(id, { date, time, text }) {
  const safeDate = normalizeDate(date);
  const safeTime = normalizeTime(time);
  const trimmed = String(text || '').trim();
  if (!safeDate || !safeTime || !trimmed) return getEvents();

  const events = loadEvents();
  const event = events.find((e) => e.id === id);
  if (!event) return getEvents();

  event.date = safeDate;
  event.time = safeTime;
  event.text = trimmed;
  event.updatedAt = Date.now();
  saveEvents(events);
  return getEvents();
}

function deleteEvent(id) {
  saveEvents(loadEvents().filter((e) => e.id !== id));
  return getEvents();
}

module.exports = {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
};

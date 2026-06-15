const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

function notesPath() {
  return path.join(app.getPath('userData'), 'notes.json');
}

function loadNotes() {
  try {
    const file = notesPath();
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  fs.mkdirSync(path.dirname(notesPath()), { recursive: true });
  fs.writeFileSync(notesPath(), JSON.stringify(notes, null, 2), 'utf8');
  return notes;
}

function getNotes() {
  return loadNotes().sort((a, b) => b.updatedAt - a.updatedAt);
}

function addNote(text) {
  const trimmed = text.trim();
  if (!trimmed) return getNotes();

  const now = Date.now();
  const note = {
    id: crypto.randomUUID(),
    text: trimmed,
    createdAt: now,
    updatedAt: now,
  };

  const notes = loadNotes();
  notes.push(note);
  saveNotes(notes);
  return getNotes();
}

function updateNote(id, text) {
  const trimmed = text.trim();
  if (!trimmed) return getNotes();

  const notes = loadNotes();
  const note = notes.find((n) => n.id === id);
  if (!note) return getNotes();

  note.text = trimmed;
  note.updatedAt = Date.now();
  saveNotes(notes);
  return getNotes();
}

function deleteNote(id) {
  const notes = loadNotes().filter((n) => n.id !== id);
  saveNotes(notes);
  return getNotes();
}

module.exports = {
  getNotes,
  addNote,
  updateNote,
  deleteNote,
};

# Winisland

**English** | [Türkçe](README.tr.md)

Winisland is a desktop utility for Windows that provides a compact, transparent overlay inspired by the Dynamic Island interaction model. The widget stays anchored to the screen edge, expands on interaction, and collapses when idle—delivering clock, media, productivity, and system controls without occupying permanent taskbar space.

---

## Overview

Winisland runs as a lightweight always-on-top overlay. Users interact through hover, click, and drag gestures. Supported modules can be enabled or disabled individually. The interface is available in **English** and **Turkish**.

| Module | Description |
|--------|-------------|
| **Clock** | Live time, date, and weather |
| **Media** | Now playing from Windows media sessions (Spotify, browsers, etc.); playback controls |
| **Timer** | Countdown with completion notification |
| **Notes** | Quick notes with copy and paste support |
| **Audio & Bluetooth** | Output/input device selection, volume, paired Bluetooth devices |
| **Calendar** | Day-based planning and events |
| **Gemini** | Optional AI chat (requires API key) |
| **Settings** | Module toggles, language, multi-monitor placement, startup options |

The widget defaults to the top-center position. It can be dragged and snapped to the **top**, **bottom**, **left**, or **right** screen edge. Left and right placements use a vertical compact layout.

---

## Requirements

| | |
|---|---|
| **Operating system** | Windows 10 / 11 (64-bit) |
| **Pre-built release** | No additional dependencies |
| **Build from source** | [Node.js](https://nodejs.org/) 18+ (LTS recommended) |

---

## Installation

### Pre-built executable

1. Download the latest release from [Releases](https://github.com/onurgnll/dynwin/releases).
2. Run **Winisland Setup … .exe** (standard installer with desktop shortcut).
3. Launch the application. A system tray icon is added; right-click and select **Exit** to quit.

On first launch, the widget appears at the top center of the primary display.

### Build from source

```bash
git clone https://github.com/onurgnll/dynwin.git
cd dynwin
npm install
npm start
```

Development mode with logging:

```bash
npm run dev
```

---

## Usage

### General

| Action | Result |
|--------|--------|
| Hover over the widget | Expands the active module |
| Move pointer away | Collapses after a short delay |
| Click the widget body | Cycles through enabled modules |
| Indicator dots / settings icon | Direct module selection |
| Drag the widget | Snap to a screen edge |

---

## Building distributables

```bash
npm install
npm run build
```

Output directory: `dist/`

| Artifact | Type |
|----------|------|
| `Winisland Setup 1.0.0.exe` | NSIS installer |

Installer build:

```bash
npm run build:installer
```

---

## Technical summary

- **Runtime:** Electron with transparent frameless windows
- **Media:** Windows Media Session API via `windows-media-sessions`
- **Storage:** Local persistence for notes, calendar, and settings (`%APPDATA%`)
- **Localization:** English (`en`), Turkish (`tr`)

---

## License

MIT License. See repository license terms for details.

---

**Author:** [github.com/onurgnll](https://github.com/onurgnll)

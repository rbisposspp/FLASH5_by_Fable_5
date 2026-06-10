# FLASH4.5 ok

Interactive ESL web app for creating card sets, studying flashcards, and playing a memory game in a local-first workflow.

## Overview

This project is a vanilla HTML/CSS/JavaScript learning tool designed for fast classroom use. It lets teachers or creators build custom card sets with text, images, and local audio files, then reuse the same content in study and game modes.

## Features

- Create, rename, save, load, and import flashcard sets
- Add cards with optional image and uploaded audio file
- Study content as interactive flip cards
- Play a memory matching game with difficulty levels
- Customize default card colors per set
- Save a finished set as a self-contained, playable lesson folder (Study + Memory) downloaded as a ZIP
- Local-first workflow with no required backend

## Project Structure

```text
.
├── index.html
├── script.js
├── style.css
├── player/          # runtime template bundled into each saved lesson
│   ├── index.html
│   └── player.js
├── README.md
└── CLAUDE.md
```

> Note: "Save Lesson (ZIP)" fetches the `player/` files and `style.css`, so it must be
> used with the app served over a local server (not opened via `file://`).

## Getting Started

1. Open the project folder.
2. Start a local server:

```bash
python3 -m http.server 8000
```

3. Open the app in your browser:

```text
http://127.0.0.1:8000/index.html
```

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript

## Notes

- Data is handled locally in the browser.
- The interface includes a dark, high-contrast classroom-oriented palette.
- Print styles and reduced-motion support are included.


claude --resume 497505a8-b5a9-420e-9105-795e9cf318cc

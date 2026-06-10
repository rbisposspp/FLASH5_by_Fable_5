# FLASH5

Vanilla HTML/CSS/JS ESL flashcard tool. Teachers build card sets with text, images, and audio, then study them as flip cards or play a memory matching game. Finished sets export as self-contained, playable lesson ZIPs — no backend, no framework, no build step.

## Features

- Create, rename, load, and delete card sets
- Add cards with optional image (resized to 800×800) and uploaded audio file
- Study mode — interactive flip cards with keyboard navigation
- Memory game — two match types:
  - **Identical**: two copies of each card
  - **Image + Sound**: one image-only card paired with one audio-only card (auto-plays on flip)
- Customize card colors per set
- Export a set as JSON (`{setName, cards[], instructions, customColors}`) for backup and transfer
- Import a set from JSON — each card is validated before persisting; malformed files are rejected in full
- Save a finished set as a self-contained lesson ZIP (Study + Memory, no authoring UI)
- Data-safe localStorage: on parse error, raw data is stashed to a backup key — nothing is ever deleted automatically

## Project Structure

```text
.
├── index.html        # authoring app
├── script.js         # authoring app logic (~2 000 lines)
├── shared.js         # shared helpers (audio, feedback, shuffle, etc.)
├── style.css         # shared stylesheet
├── player/
│   ├── index.html    # player runtime template
│   └── player.js     # player runtime logic
├── CLAUDE.md
└── README.md
```

## Running

```bash
python3 -m http.server 8000
# open http://127.0.0.1:8000/index.html
```

Serving over HTTP is required — "Save Lesson (ZIP)" fetches `player/index.html`, `player/player.js`, `shared.js`, and `style.css` at runtime, which fails under `file://`.

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript (ES2020+)
- No dependencies, no build step, no framework

## Exported Lesson ZIPs

The unzipped folder works directly via `file://`. It contains:

```text
<set-name>/
├── index.html
├── style.css
├── shared.js
├── player.js
└── data.js          # window.LESSON = { title, cards[] }
```

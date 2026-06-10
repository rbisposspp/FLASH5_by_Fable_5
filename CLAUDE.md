# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vanilla HTML/CSS/JS ESL flashcard tool (no framework, no build step, no tests, no dependencies). Teachers create card sets (word + optional image + optional audio file), study them as flip cards, and play a memory matching game. Sets can be exported as self-contained playable lesson ZIPs.

Note: the git root is `/home/sias/projects` (the multi-project workspace), not this folder.

## Running

```bash
python3 -m http.server 8000
# open http://127.0.0.1:8000/index.html
```

Serving over HTTP is required — "Save Lesson (ZIP)" `fetch()`es `player/index.html`, `player/player.js`, `shared.js`, and `style.css` at runtime, which fails under `file://`.

## Architecture

Two apps share one stylesheet (`style.css`) and one helper module (`shared.js`):

1. **Authoring app** — `index.html` + `script.js` (~2000 lines, everything inside one `DOMContentLoaded` closure). Three tabs: Manage Content (create/edit sets and cards), Study Flashcards, Play Memory Game.
2. **Player runtime** — `player/index.html` + `player/player.js`. A stripped-down Study + Memory app (no authoring) that is bundled into every exported lesson. It reads `window.LESSON` provided by a generated `data.js`. `player/index.html` contains a `__LESSON_TITLE__` placeholder replaced at export time.

**Shared module:** `shared.js` defines `window.FlashShared` (`shuffleArray`, `normalizeAnswerText`, `describeCardContent`, `provideFeedback`, `stopCurrentAudio`, `playCardAudio`, `createPlayAudioButton` — audio state lives inside the module). Both apps destructure from it at the top of their closures; it must load before `script.js` / `player.js` in both HTML files.

**Duplication warning:** the flashcard/memory *rendering* logic is still duplicated between `script.js` and `player/player.js`. Changes to Study or Memory rendering behavior must be mirrored in both files; changes to the helpers above go in `shared.js` only.

### Data model

All persistence is `localStorage` under key `interactiveLearningToolCardSets_v3_audio_only` (`script.js:13`). Shape:

```js
cardSets = { [setName]: { cards: [...], instructions: "", customColors: {front, back} | null } }
// card: { id, word, imageDataUrl, audioType: 'file'|'none', audioDataUrl }
```

Images are resized client-side via canvas to max 800×800 (see `CONFIG` at top of `script.js`) and stored as data URLs; audio files are stored as data URLs too — localStorage size is the real constraint.

**Data safety rules:**

- Never delete teacher data the teacher didn't explicitly delete. On a corrupt main key, `loadCardSetsFromLocalStorage` copies the raw string to `interactiveLearningToolCardSets_backup` and leaves the main key untouched — keep this behavior.
- Sets round-trip via "Export Set (JSON)" / "Import Set (JSON)" (`{setName, cards, instructions, customColors}`; the imported set name comes from the *filename*, sanitized). Imports are validated per card by `validateImportedCard` (string `id`, string `word`, `audioType` `'file'|'none'`) — any malformed card rejects the whole file before persisting.

### Memory game match types

The memory game has a "Match Type" select (`#memoryGameMatchType`, both apps): `identical` (two copies of each card) or `image_audio` (one image-only card + one sound-only card per pair — sound card auto-plays on flip, image card has no audio button). Board cards carry a `variant` field (`'full'|'image'|'audio'`) set in `startNewMemoryGame`; rendering, click handling, and `updateMemoryCardAriaLabel` branch on it. `image_audio` only uses cards that have both an image and an audio file. The audio variant's ARIA labels and play-button title must never reveal the word before the match.

### Lesson export (`handleSaveLesson`)

Converts each card's data URLs to binary files (`assets/images/`, `assets/audio/`), generates `data.js` (`window.LESSON = {...}`), and packs `index.html` + `style.css` + `shared.js` + `player.js` + `data.js` + assets into a ZIP using a **hand-rolled ZIP writer** (`buildZip` + `crc32` in `script.js`, stored entries, no compression). The unzipped folder works directly via `file://`.

## Conventions

- Existing code uses 4-space indentation — match it (overrides the global 2-space rule).
- Accessibility is deliberate and must be preserved: ARIA tab pattern with keyboard arrow navigation, `aria-live` feedback regions, per-card `aria-label` updates on flip/match, skip link.
- User feedback goes through `provideFeedback(element, message, type)` into the existing `aria-live` regions — don't add `alert()`s.

## Language conventions

- All code, comments, variable names, commit messages, and documentation: **English**.
- Terminal output, prompts directed at me, and inline task notes: **Brazilian Portuguese**.
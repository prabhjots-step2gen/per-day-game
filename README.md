# 🎮 My Game World

A collection of fun, interactive, educational 3D games for a 4-year-old — built
with **Three.js**, vanilla JavaScript, and the Web Audio API. No build step,
no dependencies to install: just open `index.html` in a browser.

> Made especially for my daughter. ✨

## ✨ Features

- **Interactive games** with 3D graphics (Three.js r128)
- **Child-friendly interface** — bright colors, big buttons, playful animations
- **Central game menu** to browse and launch games
- **Generated sound effects** (Web Audio API — no audio files needed)
- **Safe & distraction-free** — no ads, no external links

## 🕹️ Games

| # | Game | Description |
|:-:|------|-------------|
| 0 | 🎨 Color Shapes | Tap shapes to recolor, spin, and bounce |
| 1 | 🔢 Counting Fun | Count object families and match the big number card |
| 2 | 🔤 ABC Adventure | Match big letters to the word that starts with them |
| 3 | 🃏 Memory Match | Flip cards and find all 4 matching pairs |
| 4 | 🧩 Puzzle World | Slide 2×2 picture puzzles into place |
| 5–9 | ⬜ More games | On the roadmap — see `AGENTS.md` |

## 🛠️ Tech Stack

- **Three.js** (r128) — 3D graphics & animation
- **JavaScript** (vanilla, no build step)
- **HTML5 / CSS3** — layout, styling, responsive UI
- **Web Audio API** — generated sound effects

## 🚀 Running

No installation needed:

1. Open `index.html` in any modern browser, **or**
2. Serve the folder: `npx serve` / `python -m http.server`

Games render in both landscape and portrait.

## 🏛️ Architecture

- `js/main.js` — `GameManager` (menu, routing) + `Background3D`
- `js/base-game.js` — abstract `BaseGame` (Three.js scene lifecycle, input, disposal)
- `games/` — one file per game, each extending `BaseGame` (plug-in pattern)
- `js/utils/` — shared helpers & sound manager

**Adding a new game:** create a file in `games/` extending `BaseGame`, register
its class in the `GAMES[]` array in `js/main.js`, and add a `<script>` tag in
`index.html` after `js/main.js`. Full details in `AGENTS.md`.

## 📄 Docs

See [`AGENTS.md`](AGENTS.md) for the full project guide and development log
(effort, prompts, errors, and test results per deliverable).

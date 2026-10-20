# 🎮 My Game World — Project Guide & Development Log

> This file is the guide for humans **and** AI agents working in this repo.
> Part 1 describes the project. Part 2 is a living **development log** that
> tracks effort, prompts, errors, and test results per deliverable.

## Part 1 — About the Project

A collection of **10 fun, interactive, educational games** for a 4-year-old.
The goal: a playful digital environment where she can explore, learn, and
develop essential skills through games, all from a simple, colorful,
child-friendly menu.

### ✨ Key Features
- **10 Interactive Games** — engaging activities for young children
- **Child-Friendly Interface** — bright colors, playful animations, large buttons, intuitive navigation
- **Game Selection Menu** — a central menu to browse, select, and launch games
- **Age-Appropriate Gameplay** — activities suited to a 4-year-old's developmental stage
- **Interactive 3D Experiences** — Three.js graphics and animation
- **Simple Navigation** — easy controls with clear visual feedback
- **Safe & Distraction-Free** — no ads, no external links, no complicated settings

### 🛠️ Technology Stack
- **Three.js** (r128) — 3D graphics, animation, interactive scenes
- **JavaScript** (vanilla, no build step) — game logic
- **HTML5 / CSS3** — layout, styling, responsive UI
- **Web Audio API** — generated sound effects (no external audio files)

### 🎯 Project Goals
Make learning enjoyable through play; encourage curiosity, creativity, and
problem-solving; build early skills (counting, color/shape recognition, memory,
hand-eye coordination); provide a simple, intuitive experience a child can
navigate independently; and keep a reusable foundation for adding new games.

### 🕹️ Game Collection (roadmap)

| Index | Game | Status |
|:-----:|------|:------:|
| 0 | Color Shapes | ✅ done |
| 1 | Counting Fun | ✅ done |
| 2 | ABC Adventure | ✅ done |
| 3 | Memory Match | ✅ done |
| 4 | Puzzle World | ✅ done |
| 5 | Sort It Out | ⬜ next |
| 6 | Animal Friends | ⬜ |
| 7 | Pattern Play | ⬜ |
| 8 | Doodle Pad | ⬜ |
| 9 | 3D World | ⬜ |

### 🏛️ Architecture (how to add a game)
- **`js/main.js`** → `GameManager` (menu, routing, audio) + `Background3D`. Owns the `GAMES[]` registry — 10 slots, each with an `id`, display info, and a `gameClass`.
- **`js/base-game.js`** → abstract `BaseGame`: Three.js scene lifecycle (`init/start/stop/dispose`), camera/renderer/lighting/input setup, `update()/onClick()/onTouchStart()` hooks, floating-animation helpers, and full resource disposal.
- **Plug-in pattern** → a new game = **one file in `games/`** extending `BaseGame` (override `gameInit()`, `update()`, and optionally `onClick()`), set `GAMES[n].gameClass = YourGame;`, and add a `<script>` tag in `index.html` **after** `js/main.js`.
- **Shared utils** → `js/utils/helpers.js` (`Helpers`) and `js/utils/sound.js` (`SoundManager`).

### 🧭 Development Philosophy
Delight over complexity. Every game should be easy to understand, visually
appealing, responsive, and **forgiving of mistakes** — use positive feedback,
gentle animations, and encouraging sounds. Keep games modular so each can be
developed, tested, and improved independently.

---

## Part 2 — Development Log

Living record of effort, prompts, errors, and test results per deliverable.
**Last updated:** 2026-10-20

### 📊 At-a-Glance Summary

| # | Deliverable | Status | Lines of Code | Prompts | Errors Fixed | Test Cases (fail → pass) | Wall-Clock Time |
|---|-------------|--------|:------------:|:-------:|:------------:|:------------------------:|:---------------:|
| 0 | **Base Template** (scaffolding) | ✅ Done | 1,583 | 1* | 0* | —* | *prior session |
| 1 | **Game 1 — Color Shapes** | ✅ Done | 181 | 1* | 0* | —* | *prior session |
| 2 | **Game 2 — Counting Fun** | ✅ Done | 885 | 3 | 9 | 1 fail → all pass | ~16 min |
| 3 | **Game 3 — ABC Adventure** | ✅ Done | 858 | 1 | 0 | all pass (1st run) | ~10 min |
| 4 | **Game 4 — Memory Match** | ✅ Done | 712 | 1 | 3 | all pass (2nd run) | ~8 min |
| 5 | **Game 5 — Puzzle World** | ✅ Done | 871 | 1 | 2 | 10 fail → all pass | ~15 min |
|   | **Total (code)** |        | **5,090** |      |            |                          |                |

\* Items **0** and **1** were completed in a **prior session** before this log
existed. Their deliverables and line counts are measured (accurate), but the
granular prompt/error/test counts from that session were **not captured**, so
they are marked `*` rather than guessed.

### 🧱 0 — Base Template (Scaffolding) — prior session

Reusable foundation every game builds on.

| File | Purpose | Lines |
|------|---------|:-----:|
| `index.html` | Main menu + game view shell, script loading | 54 |
| `css/main.css` | Child-friendly styling: gradients, cards, animations, responsive | 484 |
| `js/main.js` | `GameManager` (registry, routing) + `Background3D` (18 floating shapes, parallax) | 413 |
| `js/base-game.js` | Abstract `BaseGame` — scene lifecycle, render loop, utilities | 328 |
| `js/utils/sound.js` | `SoundManager` — Web Audio SFX (6 types, no external files) | 174 |
| `js/utils/helpers.js` | `Helpers` — random, shuffle, lerp, clamp, toast, etc. | 130 |
| `assets/` | Empty `audio/`, `images/`, `models/` folders | — |
| **Subtotal** | | **1,583** |

> Metrics note: one-shot scaffolding task; no prompt/error/test log kept at the time.
> Line counts measured 2026-10-20 (accurate).

### 🎨 1 — Game 1: Color Shapes (`GAMES[0]`) — prior session

Working demo proving the full pipeline (menu → launch → 3D scene → interaction →
sound → back to menu). Six colorful 3D shapes; tap to recolor, spin, bounce, and play a "pop".

- **Deliverable:** `games/color-shapes.js` (181 lines), registered as `GAMES[0]`.
- **Metrics note:** shipped with the base template as the architecture proof; no separate log kept. Line count measured now (accurate).

### 🔢 2 — Game 2: Counting Fun (`GAMES[1]`) — this session

Big number card (1–5) above a sunny playground. Three "families" of objects
(apples, stars, balls, ducks, hearts), each a different color/shape and each with
a **different count**. The child counts each family and taps the one matching
the card. 5 rounds → gold star row → confetti finale. Correct = praise + zoom-to-card;
wrong = gentle wobble + "almost!" (no penalties).

**Deliverables:**

| File | Change | Lines |
|------|--------|:-----:|
| `games/counting-fun.js` | New — full game class | 885 |
| `index.html` | Added `<script src="games/counting-fun.js">` | +1 |
| `C:\step2gen\smoke-counting.js` | New — headless smoke test (mocked THREE/DOM) | ~260 |

**Metrics (measured this session):**

| Metric | Value | Notes |
|--------|:-----:|-------|
| **User prompts** | **3** | ① initial task · ② "object positions not good" · ③ (resubmitted) |
| **Errors found & fixed** | **9** | 4 logic · 2 leaks · 1 crash-guard · 2 layout/viewport |
| **Smoke-test cases** | **9 stages** | All pass after fixes |
| **Task-case failures** | **1** | "2 groups share a color" assertion failed → exposed a design flaw |
| **Stability re-runs** | **6 / 6 passed** | Random-round regression check after redesign |
| **Wall-clock time** | **~16 min** | 19:55 → 20:11 (incl. 2 user-feedback pauses) |
|  · initial full build | ~5 min | First playable version |
|  · layout / viewport fixes | ~7 min | Object spacing + mobile framing |

### 🔤 3 — Game 3: ABC Adventure (`GAMES[2]`) — this session

Big letter card (A–Z) above a sunny alphabet park. Three 3D "stations" — each a
colored podium with a big emoji object and its **word label** below it. The
child taps the object whose name **starts with the big letter** (e.g. **X** →
Xylophone / Cat / Umbrella). 5 rounds → gold star row → confetti finale.
Correct = "B is for Ball!" praise + zoom-to-card; wrong = gentle wobble +
"almost!" (no penalties).

**Deliverables:**

| File | Change | Lines |
|------|--------|:-----:|
| `games/abc-adventure.js` | New — full game class (letter card + 3 word stations, 26-letter pool) | 858 |
| `index.html` | Added `<script src="games/abc-adventure.js">` | +1 |
| `C:\step2gen\smoke-abc.js` | New — headless smoke test (mocked THREE/DOM) | ~255 |

**Design lesson carried over from Game 2:** the 26-entry word pool has one
entry **per letter** (Apple…Zebra), and each round picks the target letter plus
two distractors with **different letters** — so exactly one station ever
matches the card and the answer is always unambiguous.

**Metrics (measured this session):**

| Metric | Value | Notes |
|--------|:-----:|-------|
| **User prompts** | **1** | Single task: "work on Game 3" |
| **Errors found & fixed** | **0** | Game logic passed smoke test on first run |
| **Smoke-test cases** | **9 stages** | All pass (1st run) |
| **Browser render** | **2** | Landscape 1280×720 + portrait 430×844, both correct |
| **Wall-clock time** | **~10 min** | build + test + screenshots |

**Screenshot-harness fixes** (in the temp `abc-shot.html`, *not* shipped code):
① the first harness was missing the `#game-grid` div that the real
`index.html` has, so `GameManager._createMenu` threw on a null grid — fixed by
mirroring `index.html` exactly; ② headless Edge needed a local `three.min.js`
(the CDN was unreachable offline) plus `--headless=new
--enable-unsafe-swiftshader --use-angle=swiftshader-webgl` for software WebGL.
Both are environment/tooling notes, not game bugs.

### 🃏 4 — Game 4: Memory Match (`GAMES[3]`) — this session

A 2×4 grid of face-down cards over a soft blue sky. Four distinct emoji are
chosen each play (each appearing twice → 8 cards, shuffled). The child taps a
card to flip it; two matching cards stay open with a cheerful "match!" and a
star lights up. A mismatch politely flips both cards back after a short pause
— **no penalties**. Find all 4 pairs and a starry confetti finale plays.

**Deliverables:**

| File | Change | Lines |
|------|--------|:-----:|
| `games/memory-match.js` | New — full game class (card-flip pair matching, 8 cards / 4 pairs) | 712 |
| `index.html` | Added `<script src="games/memory-match.js">` | +1 |
| `C:\step2gen\smoke-memory.js` | New — headless smoke test (mocked THREE/DOM) | 278 |

**Design notes:**
- Cards are 3D groups: a colored plate + a soft "**?**" back + an emoji face.
  Flipping is a horizontal scale tween (1 → 0 → 1) with the face/back swapped
  at the edge — reads as a card turn without a full 3D rotation.
- The whole grid lives in one `gridGroup`, so portrait simply scales it
  (0.72×) instead of re-placing 8 cards on resize.
- A card that is mid-flip-animation is not tappable, so mismatch/flip-back
  timings can't corrupt the pick state.

**Metrics (measured this session):**

| Metric | Value | Notes |
|--------|:-----:|-------|
| **User prompts** | **1** | Single task: "continue on next game" |
| **Errors found & fixed** | **3** | 1 in game code · 2 in the smoke harness (timing) |
| **Smoke-test cases** | **9 stages** | All pass (2nd run; 1st run had 4 harness-timing fails) |
| **Browser render** | **2** | Landscape 1280×720 + portrait 430×844, both correct |
| **Wall-clock time** | **~8 min** | build + test + screenshots |

### 🧩 5 — Game 5: Puzzle World (`GAMES[4]`) — this session

A 2×2 **sliding-picture puzzle** over a warm sunset backdrop. A big animal
(Lion, Turtle, Unicorn, Octopus, Butterfly, Frog, Panda, Fox — 3 chosen per
play) is drawn on a 512×512 canvas and split into 4 quadrants. Three tiles plus
one empty hole appear **shuffled**; the child taps a tile adjacent to the hole
to slide it over. A small **goal-preview** sprite of the finished picture stays
visible top-left. Solve 3 puzzles → 3 gold stars light up → starry confetti
finale. Tapping a tile that can't move just wobbles it — no penalties.

**Deliverables:**

| File | Change | Lines |
|------|--------|:-----:|
| `games/puzzle-world.js` | New — full game class (2×2 slide puzzle, BFS-guaranteed-solvable shuffle, 3 puzzles / 3 stars) | 871 |
| `index.html` | Added `<script src="games/puzzle-world.js">` | +1 |
| `C:\step2gen\smoke-puzzle.js` | New — headless smoke test (mocked THREE/DOM; a BFS solver drives each puzzle to its solution) | 400 |

**Design notes:**
- Each tile is a 3D group: a cream frame box + a plane carrying one quadrant of
  the animal canvas via `CanvasTexture` offset/repeat.
- The board lives in one `boardGroup`, so portrait simply scales it (0.75×)
  instead of re-placing tiles on resize.
- The shuffle **BFS-enumerates all 12 reachable 2×2 states** and randomly picks
  one at distance ≥ 2 from solved — the board is always solvable and never
  starts pre-solved. (An earlier random-walk shuffle with a "no immediate
  reversal" rule forced a deterministic 12-state cycle, so 24 moves always
  returned to the solved state — see Error #2 below.)

**Metrics (measured this session):**

| Metric | Value | Notes |
|--------|:-----:|-------|
| **User prompts** | **1** | Single task: "continue on next game" |
| **Errors found & fixed** | **2** | 1 missing helper · 1 deterministic-shuffle design flaw |
| **Smoke-test cases** | **11 stages** | 10 fail on 1st run → ALL PASS after fixes |
| **Browser render** | **2** | Landscape 1280×720 + portrait 430×844, both correct |
| **Wall-clock time** | **~15 min** | build + test + screenshots |

### 🐛 Error & Bug Register

Every issue found and fixed, by deliverable.

#### Game 2 — Counting Fun

| # | Type | Bug | Fix |
|---|------|-----|-----|
| 1 | Logic | Leftover `n` reference in `_setNumber(n)` after refactor → `ReferenceError` | Use `this.targetCount` |
| 2 | Logic | Leftover `n` reference in `_spawnRoundObjects(n)` | Use `this.targetCount` |
| 3 | **Design** | 2 of 3 families shared the card's color → the answer was ambiguous; smoke test caught it (`got 1`, expected 2) | Redesigned: each family gets a **unique count**; child matches by counting |
| 4 | Logic | Praise banner's `_targetOpacity` never reset → banner stayed visible next round | Reset `_targetOpacity = 0` in `_newRound()` |
| 5 | Logic | Star row: `_gameOver` was **both** a method and a flag → `!this._gameOver` always `false`, keeping all stars dim; plus off-by-one | Renamed flag to `finished`; introduced a `score` counter |
| 6 | Crash | Round-advance `setTimeout` could fire **after** `dispose()` if the child left mid-celebration → crash on a dead scene | `isRunning` guards on all pending timers |
| 7 | Leak | `material.map` textures & shared geometries not disposed on round transitions / dispose | Explicit `.map` + shared-geometry disposal, plus a scene-texture sweep |
| 8 | **Layout** | Items used random `±0.35` offsets → 3–5 objects merged into one blob, impossible to count (user-reported) | Fixed per-count **row / grid / 3+2** layouts with clear spacing |
| 9 | **Viewport** | On portrait/narrow screens the fixed camera clipped the side families off-screen (user-reported) | Aspect-aware `_familySlots()` + responsive `_fitCamera()` that pulls back / reframes |

**Test-harness fixes** (in `smoke-counting.js`, not shipped game code): added
missing mocks for `renderer.render`, canvas `moveTo`, `Group.traverse`, and DOM
`remove()` so the mocked environment matched real Three.js/DOM.

#### Game 4 — Memory Match

| # | Type | Bug | Fix |
|---|------|-----|-----|
| 1 | Leak/Structure | `_startGame` added each card to **both** `gridGroup` and the scene (double `addGameObject` + `scene.add`) → double render/traversal on dispose | Cards now live only under `gridGroup`; only `gridGroup` is tracked via `addGameObject` |
| 2 | Test timing | Flip tween is 0.32s (~20 frames) but the harness advanced only 5 frames before asserting `face.visible` | Advanced ~25 frames before visibility asserts |
| 3 | Test logic | Step 7 tapped a card still mid flip-back (`anim != null`), so the tap was ignored and `matchedPairs` stalled at 3 (cascading game-over fails) | Rewrote step 7 to flush animations and walk all remaining pairs naturally |

All three were caught by the headless smoke test on the **first** run; after the
fixes the full 9-stage suite passes. No shipped-game logic bugs beyond the
structure cleanup (#1).

#### Game 5 — Puzzle World

| # | Type | Bug | Fix |
|---|------|-----|-----|
| 1 | Missing method | `_setupPuzzleDeco` called `this._makeEmojiSprite`, which only existed in `memory-match.js` → `TypeError` on `init()` | Added the `_makeEmojiSprite` canvas-sprite helper to `PuzzleWorldGame` |
| 2 | **Design** | Random-walk shuffle with a "no immediate reversal" rule on a 2×2 grid forces the hole onto a **deterministic 12-state cycle**; 24 moves = 2 full cycles → the board *always* returned to the solved state, so the smoke test saw a pre-solved board, the BFS solver produced 0 moves, and puzzle progression stalled (10 cascading failures) | Replaced `_shuffleBoard(moves)` with a **BFS enumeration** of all 12 reachable states, filtered to distance ≥ 2, picking one at random — always solvable, never pre-solved, independent of walk length |

Both were caught by the headless smoke test; after the fixes the full
11-stage suite passes.

#### Base Template & Game 1
No logged errors (prior session). The architecture was validated by Game 1
running end-to-end.

### ✅ Testing & Verification Approach

**Per-game loop used for Game 2 (repeat this for future games):**
1. **Headless smoke test** — Node + mocked THREE/DOM (`smoke-counting.js`).
   Stages: registration → init/start → round layout (unique counts/colors) →
   frames run → correct tap advances round & lights a star → wrong tap does not
   advance → game-over confetti → dispose cleans up → leaving mid-animation
   does not crash. **Result: ALL PASS** (and 6/6 on repeated random-round runs).
2. **Real browser render** — headless Microsoft Edge screenshots confirming the
   3D scene, number card, praise banner, star row, and object families render
   correctly in both **landscape** and **portrait**.

**Base Template / Game 1:** verified by Game 1 running the full
menu → launch → play → back-to-menu pipeline in-browser.

### 📁 File Inventory & Line Counts *(measured 2026-10-20)*

| File | Lines | Chars |
|------|:-----:|:-----:|
| `css/main.css` | 484 | 9,894 |
| `js/main.js` | 413 | 13,018 |
| `js/base-game.js` | 328 | 10,192 |
| `js/utils/sound.js` | 174 | 5,970 |
| `js/utils/helpers.js` | 130 | 3,126 |
| `index.html` | 57 | 2,149 |
| `games/color-shapes.js` | 181 | 6,305 |
| `games/counting-fun.js` | 885 | 32,078 |
| `games/abc-adventure.js` | 858 | 32,193 |
| `games/memory-match.js` | 712 | 25,631 |
| `games/puzzle-world.js` | 871 | 32,545 |
| **Total (shipped)** | **5,093** | **173,050** |
| `smoke-counting.js` (test, not shipped) | ~260 | — |
| `smoke-abc.js` (test, not shipped) | ~255 | — |
| `smoke-memory.js` (test, not shipped) | 278 | — |
| `smoke-puzzle.js` (test, not shipped) | 400 | — |

### 📝 Log Conventions
For each new game, record **prompts, errors, test results, and time** in
Part 2 so the summary table stays accurate. Mark any prior-session work with
`*` where granular metrics weren't captured, and measure line counts live.

---

*The vision: a little world of games built with love, curiosity, and Three.js —
made especially for my daughter.*

# Light-A-Match

A fast-paced browser arcade game inspired by Tumblestone. Drag chains of 3 or more matching stones on a grid, clear them before time runs out, and chase a high score with combo multipliers.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default: http://localhost:5173).

## How to Play

1. Click or tap **Light-A-Match** on the start screen to begin a 60-second round.
2. **Click and drag** through adjacent stones of the same color (including diagonals).
3. Release when your chain has **3 or more** stones to clear them.
4. Stones fall with gravity and new ones spawn from the top.
5. Make matches quickly to build **combo multipliers** (x2, x3, …).
6. Beat your **high score** — saved locally in your browser.

## Controls

| Input | Action |
|-------|--------|
| Mouse drag | Build and submit a stone chain |
| Touch drag | Same on mobile browsers |
| Click | Start game / play again |
| `R` | Restart after game over |

## Scoring

- Base score: `chain length × 10`
- Combo: each match within 1.5 seconds of the previous increases the multiplier
- Example: a 5-stone chain at combo x3 earns `5 × 10 × 3 = 150` points

## Build

```bash
npm run build
npm run preview
```

## Tech

- Vite + TypeScript
- HTML Canvas 2D
- No backend — high scores stored in `localStorage`

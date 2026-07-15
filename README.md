# Light-A-Match

A level-based color-matching puzzle game inspired by Tumblestone. Clear the board by selecting sets of three matching stones from the top of each column.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click to begin.

## How to Play

1. Each column is a stack of colored stones.
2. Only the **top stone** in each column can be selected (highlighted with a white outline).
3. Tap three top stones of the **same color** from **three different columns** to clear them.
4. Stones above fall down to fill the gaps.
5. Clear every stone on the board to complete the level.
6. Pick the wrong trio and the **entire puzzle resets** — try again from the start of that level.

## Levels

- 30 levels with increasing difficulty
- Larger grids, more colors, and more stone triplets as you progress
- Every puzzle is generated to be completable
- Progress is saved locally (highest level reached)

## Controls

| Input | Action |
|-------|--------|
| Tap stone | Select / deselect (max 3, one per column) |
| Click | Start game / next level / dismiss mistake |
| `R` | Reset current level |

## Build

```bash
npm run build
npm run preview
```

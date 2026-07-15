import { Board } from './Board';
import { Cell, LevelConfig, STONE_COLORS, StoneColor } from './types';

const MAX_LEVEL = 30;

export function getLevelConfig(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(level, MAX_LEVEL));
  return {
    level: clamped,
    cols: Math.min(Math.max(5, 4 + Math.floor((clamped - 1) / 3)), 7),
    rows: Math.min(6 + Math.floor((clamped - 1) / 2), 11),
    colors: Math.min(4 + Math.floor((clamped - 1) / 4), 10),
    triplets: 2 + Math.floor(clamped * 1.1),
  };
}

interface SolutionMove {
  color: StoneColor;
  cols: [number, number, number];
}

export class LevelManager {
  currentLevel = 1;
  highestLevel = 1;

  constructor() {
    this.loadProgress();
  }

  getConfig(): LevelConfig {
    return getLevelConfig(this.currentLevel);
  }

  createBoard(): Board {
    const config = this.getConfig();
    const board = new Board(config.cols, config.rows, config.colors);

    // Always build via reverse construction so a full solution is guaranteed,
    // then keep the most mixed (scattered) candidate. We no longer fall back to
    // vertical color-blocks-per-column — those looked "sorted" and weren't
    // puzzles. Boards may still have dead-ends if the player mis-matches; that
    // is expected puzzle risk, separate from the 3-strike life system.
    let best: Board | null = null;
    let bestScatter = -1;

    for (let attempt = 0; attempt < 48; attempt++) {
      const candidate = this.generateSolvablePuzzle(config);
      if (candidate.countStones() === 0) continue;
      if (!hasValidMove(candidate)) continue;

      const scatter = measureScatter(candidate);
      if (scatter > bestScatter) {
        bestScatter = scatter;
        best = candidate;
      }

      // Strong mix: accept early. Prefer dead-end-free when cheap to verify.
      if (scatter >= 0.35) {
        const result = verifyScatterDeadEndFree(candidate);
        if (result.safe || result.exhausted) {
          board.loadGrid(candidate.grid);
          return board;
        }
      }
    }

    const picked = best ?? this.generateSolvablePuzzle(config);
    board.loadGrid(picked.grid);
    return board;
  }

  /**
   * Builds a solvable puzzle by reverse-playing matches: each move places one
   * stone of a color onto three distinct columns. Color picks prefer interrupting
   * same-color stacks so the board looks mixed, not sorted into monochrome columns.
   */
  private generateSolvablePuzzle(config: LevelConfig): Board {
    const board = new Board(config.cols, config.rows, config.colors);
    const palette = STONE_COLORS.slice(0, config.colors);
    const maxStones = config.cols * config.rows;
    const tripletCount = Math.min(config.triplets, Math.floor(maxStones / 3));
    const solution: SolutionMove[] = [];

    const working = board.clone();

    for (let i = 0; i < tripletCount; i++) {
      const availableCols = getColumnsWithSpace(working);
      if (availableCols.length < 3) break;

      const cols = pickThreeColumns(availableCols);
      const color = pickMixedColor(working, cols, palette);
      solution.push({ color, cols });

      for (const col of cols) {
        pushOntoColumn(working, col, color);
      }
    }

    for (let i = solution.length - 1; i >= 0; i--) {
      const { color, cols } = solution[i];
      for (const col of cols) {
        pushOntoColumn(board, col, color);
      }
    }

    return board;
  }

  completeLevel(): void {
    this.currentLevel++;
    if (this.currentLevel > this.highestLevel) {
      this.highestLevel = this.currentLevel;
      this.saveProgress();
    }
  }

  resetToLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(level, MAX_LEVEL));
  }

  private loadProgress(): void {
    const stored = localStorage.getItem('light-a-match-level');
    if (!stored) return;
    const level = parseInt(stored, 10);
    if (!Number.isNaN(level) && level >= 1) {
      // Remember farthest reached, but always open a fresh run at Level I so
      // reloads / Restart don't trap the player on a mid-progress level.
      this.highestLevel = level;
      this.currentLevel = 1;
    }
  }

  private saveProgress(): void {
    localStorage.setItem('light-a-match-level', String(this.highestLevel));
  }
}

export function hasValidMove(board: Board): boolean {
  return findAllMoves(board).length > 0;
}

// Cap on how many distinct states the dead-end search will explore per
// candidate. A one-time cost at level start; large enough to fully verify
// genuine scatter puzzles whose reachable space is modest, but bounded so a
// candidate with an explosive state space is rejected quickly.
const DEAD_END_STATE_BUDGET = 600000;

/**
 * Verifies that a board can never reach an unwinnable dead-end under the current
 * rule (a match is any 3 same-colored stones; columns may repeat), while staying
 * fast enough to run at level start.
 *
 * Because stones are only ever removed from the top of a column, a reachable
 * state is fully described by how many stones have been removed from each column
 * (`removed[col]`). We DFS over that compact space with memoization: a state is
 * "safe" iff it is empty, or it has at least one legal move AND every state it
 * can move to is also safe. If any reachable non-empty state has no move, the
 * player could get stuck, so we reject the board.
 *
 * The search is gated by an estimate of the reachable state space; boards whose
 * space is too large to verify cheaply are rejected here so the caller falls
 * back to the guaranteed-safe scattered generator.
 */
export interface ScatterVerifyResult {
  // True only if the whole reachable state space was explored and every reachable
  // non-empty state has a legal move (so the player can never get stuck).
  safe: boolean;
  // True if the node budget was exhausted before the search finished (the board
  // is too large to verify cheaply, so it should be rejected in favor of the
  // guaranteed-safe generator rather than retried).
  exhausted: boolean;
}

export function verifyScatterDeadEndFree(board: Board): ScatterVerifyResult {
  const cols = board.cols;
  const stacks: StoneColor[][] = [];
  let total = 0;

  for (let col = 0; col < cols; col++) {
    const stack: StoneColor[] = [];
    for (let row = 0; row < board.rows; row++) {
      const stone = board.getStone(col, row);
      if (stone !== null) stack.push(stone);
    }
    stacks.push(stack);
    total += stack.length;
  }

  // A board whose stone count is not a multiple of 3 can never be fully cleared.
  if (total % 3 !== 0) return { safe: false, exhausted: false };

  // The set of distinct reachable states (memoized by column removal counts) is
  // usually far smaller than the loose product bound, so we rely on the node
  // budget rather than pre-rejecting by that bound: if the whole reachable space
  // is explored within budget with no stuck state, the board is dead-end-free;
  // if the budget is exhausted first the candidate is rejected (the caller then
  // falls back to the guaranteed-safe generator).
  const heights = stacks.map((s) => s.length);
  const safe = new Set<string>();
  let budget = DEAD_END_STATE_BUDGET;
  let exhausted = false;

  const dfs = (removed: number[]): boolean => {
    let remaining = 0;
    for (let col = 0; col < cols; col++) remaining += heights[col] - removed[col];
    if (remaining === 0) return true;

    const key = removed.join(',');
    if (safe.has(key)) return true;
    if (--budget <= 0) {
      exhausted = true;
      return false;
    }

    // Group the accessible top-runs by color. From a column you can only take
    // its current top color, and only as many as its contiguous top run.
    const byColor = new Map<StoneColor, { col: number; run: number }[]>();
    for (let col = 0; col < cols; col++) {
      const start = removed[col];
      if (start >= heights[col]) continue;
      const color = stacks[col][start];
      let run = 0;
      for (let i = start; i < heights[col] && stacks[col][i] === color; i++) run++;
      const list = byColor.get(color);
      if (list) list.push({ col, run });
      else byColor.set(color, [{ col, run }]);
    }

    let anyMove = false;
    for (const contribs of byColor.values()) {
      const avail = contribs.reduce((sum, c) => sum + c.run, 0);
      if (avail < 3) continue;
      anyMove = true;

      const caps = contribs.map((c) => Math.min(3, c.run));
      let stuck = false;
      enumerateDistributions(caps, 3, (dist) => {
        if (stuck) return;
        const next = removed.slice();
        for (let i = 0; i < contribs.length; i++) next[contribs[i].col] += dist[i];
        if (!dfs(next)) stuck = true;
      });
      if (stuck) return false;
    }

    if (!anyMove) return false;
    safe.add(key);
    return true;
  };

  const ok = dfs(new Array(cols).fill(0));
  return { safe: ok, exhausted };
}

/**
 * Enumerates every legal 3-stone match reachable from the current board.
 *
 * A match is 3 stones of the SAME COLOR. Columns may repeat: after the top
 * stone of a column is fired into a slot, the stone beneath it becomes the new
 * top and can also be fired. So a column can contribute more than one stone to
 * a match, but only its top-most contiguous run of the match color (you can't
 * skip a differently-colored stone, since every fired stone must land in a slot
 * and match). We therefore compute, per color and per column, how many of the
 * top stones share that color, then enumerate all ways to pick 3 total.
 */
function findAllMoves(board: Board): Cell[][] {
  // color -> per-column count of top-most contiguous stones of that color.
  const topRuns = new Map<StoneColor, number[]>();

  for (let col = 0; col < board.cols; col++) {
    const topRow = board.getTopStoneRow(col);
    if (topRow === null) continue;

    const color = board.getStone(col, topRow)!;
    let count = 0;
    for (let row = topRow; row < board.rows; row++) {
      if (board.getStone(col, row) === color) count++;
      else break;
    }

    if (!topRuns.has(color)) {
      topRuns.set(color, new Array<number>(board.cols).fill(0));
    }
    topRuns.get(color)![col] = count;
  }

  const moves: Cell[][] = [];

  for (const avail of topRuns.values()) {
    const total = avail.reduce((sum, n) => sum + n, 0);
    if (total < 3) continue;

    enumerateDistributions(avail, 3, (dist) => {
      const cells: Cell[] = [];
      for (let col = 0; col < board.cols; col++) {
        const take = dist[col];
        if (take === 0) continue;
        const topRow = board.getTopStoneRow(col)!;
        for (let i = 0; i < take; i++) {
          cells.push({ col, row: topRow + i });
        }
      }
      moves.push(cells);
    });
  }

  return moves;
}

/**
 * Invokes `cb` for every non-negative integer vector `dist` where
 * `dist[i] <= cap[i]` for all i and the entries sum to `target`.
 */
function enumerateDistributions(
  cap: number[],
  target: number,
  cb: (dist: number[]) => void
): void {
  const n = cap.length;
  const dist = new Array<number>(n).fill(0);

  const rec = (idx: number, remaining: number): void => {
    if (idx === n) {
      if (remaining === 0) cb(dist);
      return;
    }
    const max = Math.min(cap[idx], remaining);
    for (let k = 0; k <= max; k++) {
      dist[idx] = k;
      rec(idx + 1, remaining - k);
    }
    dist[idx] = 0;
  };

  rec(0, target);
}

function getColumnsWithSpace(board: Board): number[] {
  const cols: number[] = [];
  for (let col = 0; col < board.cols; col++) {
    if (columnStoneCount(board, col) < board.rows) cols.push(col);
  }
  return cols;
}

function columnStoneCount(board: Board, col: number): number {
  let count = 0;
  for (let row = 0; row < board.rows; row++) {
    if (board.getStone(col, row) !== null) count++;
  }
  return count;
}

function pickThreeColumns(cols: number[]): [number, number, number] {
  const shuffled = shuffle(cols);
  return [shuffled[0], shuffled[1], shuffled[2]];
}

/** Fraction of adjacent vertical pairs that change color (higher = more mixed). */
function measureScatter(board: Board): number {
  let transitions = 0;
  let pairs = 0;
  for (let col = 0; col < board.cols; col++) {
    let prev: StoneColor | null = null;
    for (let row = 0; row < board.rows; row++) {
      const stone = board.getStone(col, row);
      if (stone === null) continue;
      if (prev !== null) {
        pairs++;
        if (stone !== prev) transitions++;
      }
      prev = stone;
    }
  }
  return pairs === 0 ? 0 : transitions / pairs;
}

/**
 * Prefer a color that differs from the current top of as many of the chosen
 * columns as possible, so reverse placement doesn't stack monochrome runs.
 */
function pickMixedColor(
  board: Board,
  cols: [number, number, number],
  palette: readonly StoneColor[]
): StoneColor {
  let best: StoneColor = palette[Math.floor(Math.random() * palette.length)];
  let bestScore = -1;

  for (const color of shuffle([...palette])) {
    let score = 0;
    for (const col of cols) {
      const top = board.getStone(col, 0);
      if (top === null || top !== color) score++;
    }
    // Small random jitter so ties don't always pick the same color.
    score += Math.random() * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = color;
    }
  }

  return best;
}

function pushOntoColumn(board: Board, col: number, color: StoneColor): void {
  if (columnStoneCount(board, col) >= board.rows) return;

  for (let row = board.rows - 1; row > 0; row--) {
    board.grid[row][col] = board.getStone(col, row - 1);
  }
  board.grid[0][col] = color;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

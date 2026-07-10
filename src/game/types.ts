export const COLS = 8;
export const ROWS = 10;
export const STONE_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
export type StoneColor = (typeof STONE_COLORS)[number];

export const COLOR_VALUES: Record<StoneColor, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f',
  purple: '#9b59b6',
  orange: '#e67e22',
};

export const COLOR_HIGHLIGHTS: Record<StoneColor, string> = {
  red: '#ff6b6b',
  blue: '#5dade2',
  green: '#58d68d',
  yellow: '#f7dc6f',
  purple: '#bb8fce',
  orange: '#f0b27a',
};

export interface Cell {
  col: number;
  row: number;
}

export type GamePhase = 'menu' | 'playing' | 'animating' | 'gameOver';

export const GAME_DURATION = 60;
export const COMBO_WINDOW_MS = 1500;
export const MIN_CHAIN_LENGTH = 3;
export const HIGH_SCORE_KEY = 'light-a-match-highscore';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface StoneAnimation {
  col: number;
  row: number;
  offsetY: number;
  startOffsetY: number;
  type: 'remove' | 'fall' | 'spawn';
  progress: number;
  color: StoneColor;
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row;
}

export function isAdjacent(a: Cell, b: Cell): boolean {
  const dc = Math.abs(a.col - b.col);
  const dr = Math.abs(a.row - b.row);
  return dc <= 1 && dr <= 1 && (dc + dr > 0);
}

export function randomStoneColor(): StoneColor {
  return STONE_COLORS[Math.floor(Math.random() * STONE_COLORS.length)];
}

export const STONE_COLORS = [
  'terracotta',
  'aegean',
  'olive',
  'amber',
  'imperial',
  'copper',
  'marble',
  'bronze',
  'wine',
  'slate',
] as const;
export type StoneColor = (typeof STONE_COLORS)[number];

export const COLOR_VALUES: Record<StoneColor, string> = {
  terracotta: '#b85c38',
  aegean: '#3d6f8c',
  olive: '#5e7a45',
  amber: '#c4923a',
  imperial: '#6b4f7a',
  copper: '#a0623d',
  marble: '#c8bfb0',
  bronze: '#8a6a3d',
  wine: '#7a3348',
  slate: '#4f5d6b',
};

export const COLOR_GRAIN: Record<StoneColor, string> = {
  terracotta: '#8a3f24',
  aegean: '#2a4f66',
  olive: '#3f5530',
  amber: '#9a6d22',
  imperial: '#4f385c',
  copper: '#74482a',
  marble: '#9e9588',
  bronze: '#634b2b',
  wine: '#552232',
  slate: '#343f4a',
};

export const COLOR_SPECKLE: Record<StoneColor, string> = {
  terracotta: '#d4845f',
  aegean: '#5f8fad',
  olive: '#7f9a62',
  amber: '#ddb25a',
  imperial: '#8d6f9c',
  copper: '#c07f52',
  marble: '#ece4d8',
  bronze: '#a88452',
  wine: '#9c4a62',
  slate: '#6d7d8f',
};

export interface Cell {
  col: number;
  row: number;
}

export type GamePhase =
  | 'menu'
  | 'playing'
  | 'animating'
  | 'slotReturn'
  | 'strikeOut'
  | 'levelComplete'
  | 'gameComplete';

export type AnimPhase = 'remove';

export const MATCH_SIZE = 3;
export const MAX_STRIKES = 3;
export const LEVEL_PROGRESS_KEY = 'light-a-match-level';
export const ANIM_REMOVE_MS = 220;
export const SLOT_ANIM_MS = 300;
export const SLOT_RETURN_MS = 450;
// How long the cannonball takes to travel from the ship to the stone it hits.
// The fired stone waits this long (sitting in its grid cell) before it lifts
// into its slot, so the cannonball visually reaches/touches the stone first.
export const SHOT_FLIGHT_MS = 280;
export const MAX_PALETTE_SIZE = STONE_COLORS.length;

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
  type: 'remove';
  progress: number;
  color: StoneColor;
}

export interface SlotStone {
  cell: Cell;
  color: StoneColor;
  slotIndex: number;
  progress: number;
  returning: boolean;
  // Remaining time (ms) the stone stays in its grid cell before it starts
  // lifting into its slot, so the cannonball can reach it first.
  liftDelayMs: number;
}

export interface LevelConfig {
  level: number;
  cols: number;
  rows: number;
  colors: number;
  triplets: number;
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row;
}

export function cellKey(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

export function randomStoneColor(count: number): StoneColor {
  const palette = STONE_COLORS.slice(0, Math.min(count, STONE_COLORS.length));
  return palette[Math.floor(Math.random() * palette.length)];
}

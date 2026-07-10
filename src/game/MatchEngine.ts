import { Board } from './Board';
import { Cell, StoneAnimation, StoneColor } from './types';

export interface MatchResult {
  clearedCells: Cell[];
  clearedColors: StoneColor[];
  fallMoves: { from: Cell; to: Cell; color: StoneColor }[];
  spawns: { col: number; row: number; color: StoneColor }[];
  reshuffled: boolean;
}

export class MatchEngine {
  constructor(private board: Board) {}

  getBoard(): Board {
    return this.board;
  }

  executeMatch(chain: Cell[]): MatchResult | null {
    if (!this.board.isValidChain(chain)) return null;

    const clearedCells = [...chain];
    const clearedColors = clearedCells.map(
      ({ col, row }) => this.board.getStone(col, row)!
    );
    this.board.clearCells(clearedCells);

    const fallMoves = this.board.applyGravity();
    const spawns = this.board.refill();

    let reshuffled = false;
    if (!this.board.hasValidMove()) {
      this.board.reshuffle();
      reshuffled = true;
    }

    return { clearedCells, clearedColors, fallMoves, spawns, reshuffled };
  }

  buildAnimations(
    result: MatchResult,
    cellSize: number
  ): StoneAnimation[] {
    const animations: StoneAnimation[] = [];

    for (let i = 0; i < result.clearedCells.length; i++) {
      const { col, row } = result.clearedCells[i];
      animations.push({
        col,
        row,
        offsetY: 0,
        startOffsetY: 0,
        type: 'remove',
        progress: 0,
        color: result.clearedColors[i],
      });
    }

    for (const move of result.fallMoves) {
      const distance = (move.from.row - move.to.row) * cellSize;
      animations.push({
        col: move.to.col,
        row: move.to.row,
        offsetY: -distance,
        startOffsetY: -distance,
        type: 'fall',
        progress: 0,
        color: move.color,
      });
    }

    for (const spawn of result.spawns) {
      const distance = (spawn.row + 1) * cellSize;
      animations.push({
        col: spawn.col,
        row: spawn.row,
        offsetY: -distance,
        startOffsetY: -distance,
        type: 'spawn',
        progress: 0,
        color: spawn.color,
      });
    }

    return animations;
  }
}

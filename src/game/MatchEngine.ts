import { Board } from './Board';
import { Cell, StoneAnimation, StoneColor } from './types';

export class MatchEngine {
  constructor(private board: Board) {}

  getBoard(): Board {
    return this.board;
  }

  clearSelection(selection: Cell[]): StoneColor | null {
    if (!this.board.isValidMatch(selection)) return null;

    const color = this.board.getStone(selection[0].col, selection[0].row);
    this.board.clearCells(selection);
    return color;
  }

  buildRemoveAnimations(
    selection: Cell[],
    color: StoneColor
  ): StoneAnimation[] {
    return selection.map(({ col, row }) => ({
      col,
      row,
      type: 'remove' as const,
      progress: 0,
      color,
    }));
  }
}

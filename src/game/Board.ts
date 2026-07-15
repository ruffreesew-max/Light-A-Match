import {
  Cell,
  StoneColor,
} from './types';

export class Board {
  grid: (StoneColor | null)[][];
  readonly cols: number;
  readonly rows: number;
  readonly colorCount: number;

  constructor(cols: number, rows: number, colorCount: number) {
    this.cols = cols;
    this.rows = rows;
    this.colorCount = colorCount;
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): (StoneColor | null)[][] {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => null)
    );
  }

  clone(): Board {
    const copy = new Board(this.cols, this.rows, this.colorCount);
    copy.grid = this.grid.map((row) => [...row]);
    return copy;
  }

  loadGrid(grid: (StoneColor | null)[][]): void {
    this.grid = grid.map((row) => [...row]);
  }

  getStone(col: number, row: number): StoneColor | null {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return this.grid[row][col];
  }

  clearCells(cells: Cell[]): void {
    for (const { col, row } of cells) {
      this.grid[row][col] = null;
    }
  }

  isEmpty(): boolean {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col] !== null) return false;
      }
    }
    return true;
  }

  getTopStoneRow(col: number): number | null {
    for (let row = 0; row < this.rows; row++) {
      if (this.grid[row][col] !== null) return row;
    }
    return null;
  }

  getAccessibleCells(): Cell[] {
    const accessible: Cell[] = [];
    for (let col = 0; col < this.cols; col++) {
      const row = this.getTopStoneRow(col);
      if (row !== null) accessible.push({ col, row });
    }
    return accessible;
  }

  isAccessible(col: number, row: number): boolean {
    return this.getTopStoneRow(col) === row;
  }

  applyGravity(): { from: Cell; to: Cell; color: StoneColor }[] {
    const moves: { from: Cell; to: Cell; color: StoneColor }[] = [];

    for (let col = 0; col < this.cols; col++) {
      let writeRow = 0;
      for (let row = 0; row < this.rows; row++) {
        const stone = this.grid[row][col];
        if (stone !== null) {
          if (row !== writeRow) {
            this.grid[writeRow][col] = stone;
            this.grid[row][col] = null;
            moves.push({
              from: { col, row },
              to: { col, row: writeRow },
              color: stone,
            });
          }
          writeRow++;
        }
      }
    }

    return moves;
  }

  isValidMatch(selection: Cell[]): boolean {
    if (selection.length !== 3) return false;

    const color = this.getStone(selection[0].col, selection[0].row);
    if (color === null) return false;

    for (const cell of selection) {
      if (!this.isAccessible(cell.col, cell.row)) return false;
      if (this.getStone(cell.col, cell.row) !== color) return false;
    }

    const cols = new Set(selection.map((c) => c.col));
    return cols.size === 3;
  }

  isValidMatchFromSlots(
    slots: { cell: Cell; color: StoneColor }[]
  ): boolean {
    if (slots.length !== 3) return false;

    // A valid match is simply 3 stones of the same color. Stones may come from
    // the same column (fired one after another as each becomes the new top),
    // so we no longer require 3 distinct columns.
    const color = slots[0].color;
    return slots.every((s) => s.color === color);
  }

  countStones(): number {
    let count = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col] !== null) count++;
      }
    }
    return count;
  }
}

export function boardsEqual(a: Board, b: Board): boolean {
  if (a.cols !== b.cols || a.rows !== b.rows) return false;
  for (let row = 0; row < a.rows; row++) {
    for (let col = 0; col < a.cols; col++) {
      if (a.getStone(col, row) !== b.getStone(col, row)) return false;
    }
  }
  return true;
}

export function selectionUsesUniqueColumns(selection: Cell[]): boolean {
  const cols = selection.map((c) => c.col);
  return new Set(cols).size === cols.length;
}

export function selectionHasUniformColor(board: Board, selection: Cell[]): boolean {
  if (selection.length === 0) return false;
  const color = board.getStone(selection[0].col, selection[0].row);
  if (color === null) return false;
  return selection.every(
    (cell) => board.getStone(cell.col, cell.row) === color
  );
}

export function selectionIsAccessible(board: Board, selection: Cell[]): boolean {
  return selection.every((cell) => board.isAccessible(cell.col, cell.row));
}

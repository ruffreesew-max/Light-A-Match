import {
  COLS,
  ROWS,
  StoneColor,
  Cell,
  randomStoneColor,
  isAdjacent,
} from './types';

export class Board {
  grid: (StoneColor | null)[][];

  constructor() {
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): (StoneColor | null)[][] {
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => null)
    );
  }

  fillRandom(): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.grid[row][col] = randomStoneColor();
      }
    }
    let attempts = 0;
    while (!this.hasValidMove() && attempts < 50) {
      this.reshuffle();
      attempts++;
    }
  }

  getStone(col: number, row: number): StoneColor | null {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return this.grid[row][col];
  }

  setStone(col: number, row: number, color: StoneColor | null): void {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    this.grid[row][col] = color;
  }

  clearCells(cells: Cell[]): void {
    for (const { col, row } of cells) {
      this.grid[row][col] = null;
    }
  }

  applyGravity(): { from: Cell; to: Cell; color: StoneColor }[] {
    const moves: { from: Cell; to: Cell; color: StoneColor }[] = [];

    for (let col = 0; col < COLS; col++) {
      let writeRow = ROWS - 1;
      for (let row = ROWS - 1; row >= 0; row--) {
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
          writeRow--;
        }
      }
    }

    return moves;
  }

  refill(): { col: number; row: number; color: StoneColor }[] {
    const spawns: { col: number; row: number; color: StoneColor }[] = [];

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        if (this.grid[row][col] === null) {
          const color = randomStoneColor();
          this.grid[row][col] = color;
          spawns.push({ col, row, color });
        }
      }
    }

    return spawns;
  }

  reshuffle(): void {
    const stones: StoneColor[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const stone = this.grid[row][col];
        if (stone !== null) stones.push(stone);
      }
    }

    for (let i = stones.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stones[i], stones[j]] = [stones[j], stones[i]];
    }

    let idx = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.grid[row][col] = stones[idx++];
      }
    }
  }

  hasValidMove(): boolean {
    const visited = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => false)
    );

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const color = this.grid[row][col];
        if (color === null || visited[row][col]) continue;

        const size = this.floodFill(col, row, color, visited);
        if (size >= 3) return true;
      }
    }

    return false;
  }

  private floodFill(
    col: number,
    row: number,
    color: StoneColor,
    visited: boolean[][]
  ): number {
    const stack: Cell[] = [{ col, row }];
    let count = 0;

    while (stack.length > 0) {
      const cell = stack.pop()!;
      if (
        cell.col < 0 ||
        cell.col >= COLS ||
        cell.row < 0 ||
        cell.row >= ROWS ||
        visited[cell.row][cell.col]
      ) {
        continue;
      }

      if (this.grid[cell.row][cell.col] !== color) continue;

      visited[cell.row][cell.col] = true;
      count++;

      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          stack.push({ col: cell.col + dc, row: cell.row + dr });
        }
      }
    }

    return count;
  }

  isValidChain(chain: Cell[]): boolean {
    if (chain.length < 3) return false;

    const firstColor = this.getStone(chain[0].col, chain[0].row);
    if (firstColor === null) return false;

    for (let i = 0; i < chain.length; i++) {
      const { col, row } = chain[i];
      if (this.getStone(col, row) !== firstColor) return false;
      if (i > 0 && !isAdjacent(chain[i - 1], chain[i])) return false;
    }

    return true;
  }

  getChainColor(chain: Cell[]): StoneColor | null {
    if (chain.length === 0) return null;
    return this.getStone(chain[0].col, chain[0].row);
  }
}

export function createBoardWithValidMoves(): Board {
  const board = new Board();
  board.fillRandom();
  return board;
}

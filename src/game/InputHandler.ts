import { Board } from './Board';
import { Cell, cellsEqual } from './types';

export type MatchCallback = (chain: Cell[]) => void;

export class InputHandler {
  private chain: Cell[] = [];
  private dragging = false;
  private enabled = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private board: Board,
    private getCellSize: () => number,
    private getOffset: () => { x: number; y: number },
    private onMatch: MatchCallback
  ) {
    this.bindEvents();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.chain = [];
      this.dragging = false;
    }
  }

  getChain(): Cell[] {
    return this.chain;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
  }

  private pointerToCell(clientX: number, clientY: number): Cell | null {
    const rect = this.canvas.getBoundingClientRect();
    const cellSize = this.getCellSize();
    const offset = this.getOffset();

    const x = clientX - rect.left - offset.x;
    const y = clientY - rect.top - offset.y;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (col < 0 || row < 0) return null;
    if (this.board.getStone(col, row) === null) return null;

    return { col, row };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);

    const cell = this.pointerToCell(e.clientX, e.clientY);
    if (!cell) return;

    this.dragging = true;
    this.chain = [cell];
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled || !this.dragging) return;
    e.preventDefault();

    const cell = this.pointerToCell(e.clientX, e.clientY);
    if (!cell) return;

    const last = this.chain[this.chain.length - 1];
    if (cellsEqual(cell, last)) return;

    if (
      this.chain.length >= 2 &&
      cellsEqual(cell, this.chain[this.chain.length - 2])
    ) {
      this.chain.pop();
      return;
    }

    if (this.chain.some((c) => cellsEqual(c, cell))) return;

    const chainColor = this.board.getChainColor(this.chain);
    const cellColor = this.board.getStone(cell.col, cell.row);
    if (chainColor !== cellColor) return;

    const dc = Math.abs(cell.col - last.col);
    const dr = Math.abs(cell.row - last.row);
    if (dc > 1 || dr > 1 || (dc === 0 && dr === 0)) return;

    this.chain.push(cell);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.dragging) return;
    e.preventDefault();

    this.dragging = false;

    if (this.chain.length >= 3 && this.board.isValidChain(this.chain)) {
      this.onMatch([...this.chain]);
    }

    this.chain = [];
  };

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
  }
}

import { Board } from './Board';
import { Cell } from './types';

export type PickStoneCallback = (cell: Cell) => void;
export type ShootCallback = (col: number, row: number) => void;

export interface RestartButtonBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const REPEAT_INITIAL_MS = 160;
const REPEAT_INTERVAL_MS = 85;

export class InputHandler {
  private shipCol = 2;
  private enabled = true;
  private leftHeld = false;
  private rightHeld = false;
  private spaceHeld = false;
  private repeatTimer = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private board: Board,
    private getRestartButton: () => RestartButtonBounds | null,
    private onPickStone: PickStoneCallback,
    private onShoot: ShootCallback,
    private onRestart: () => void
  ) {
    this.bindEvents();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.leftHeld = false;
      this.rightHeld = false;
      this.spaceHeld = false;
      this.repeatTimer = 0;
    }
  }

  setBoard(board: Board): void {
    this.board = board;
    this.shipCol = Math.min(this.shipCol, this.getMaxShipCol());
  }

  getShipCol(): number {
    return this.shipCol;
  }

  resetShip(): void {
    this.shipCol = Math.floor((this.board.cols - 1) / 2);
    this.leftHeld = false;
    this.rightHeld = false;
    this.repeatTimer = 0;
  }

  update(deltaMs: number): void {
    if (!this.enabled) return;

    if (!this.leftHeld && !this.rightHeld) {
      this.repeatTimer = 0;
      return;
    }

    this.repeatTimer -= deltaMs;
    if (this.repeatTimer > 0) return;

    if (this.leftHeld) {
      this.shipCol = Math.max(0, this.shipCol - 1);
    } else if (this.rightHeld) {
      this.shipCol = Math.min(this.getMaxShipCol(), this.shipCol + 1);
    }

    this.repeatTimer = REPEAT_INTERVAL_MS;
  }

  private getMaxShipCol(): number {
    return this.board.cols - 1;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;

    if (['ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === 'ArrowLeft') {
      const shouldMove = !this.leftHeld || this.rightHeld;
      this.leftHeld = true;
      this.rightHeld = false;
      if (shouldMove) {
        this.shipCol = Math.max(0, this.shipCol - 1);
      }
      this.repeatTimer = REPEAT_INITIAL_MS;
      return;
    }

    if (e.key === 'ArrowRight') {
      const shouldMove = !this.rightHeld || this.leftHeld;
      this.rightHeld = true;
      this.leftHeld = false;
      if (shouldMove) {
        this.shipCol = Math.min(this.getMaxShipCol(), this.shipCol + 1);
      }
      this.repeatTimer = REPEAT_INITIAL_MS;
      return;
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
      if (this.spaceHeld) return;
      this.spaceHeld = true;
      this.fire();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowLeft') this.leftHeld = false;
    if (e.key === 'ArrowRight') this.rightHeld = false;
    if (e.key === ' ' || e.key === 'Spacebar') this.spaceHeld = false;
  };

  private fire(): void {
    const col = this.shipCol;
    const row = this.board.getTopStoneRow(col);
    if (row === null) return;

    const cell = { col, row };
    this.onShoot(col, row);
    this.onPickStone(cell);
  }

  private onPointerDown = (e: PointerEvent): void => {
    const button = this.getRestartButton();
    if (!button) return;

    const rect = this.canvas.getBoundingClientRect();
    const x =
      ((e.clientX - rect.left) / rect.width) * this.canvas.clientWidth;
    const y =
      ((e.clientY - rect.top) / rect.height) * this.canvas.clientHeight;

    if (
      x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height
    ) {
      e.preventDefault();
      this.onRestart();
    }
  };

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }
}

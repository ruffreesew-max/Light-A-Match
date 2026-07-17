import { Board } from './Board';
import { InputHandler } from './InputHandler';
import { Renderer } from './Renderer';
import { LevelManager } from './LevelManager';
import {
  Cell,
  GamePhase,
  SlotStone,
  SLOT_ANIM_MS,
  SLOT_RETURN_MS,
  SHOT_FLIGHT_MS,
  MAX_STRIKES,
  cellsEqual,
} from './types';
import { isSheetsConfigured } from '../stats/config';
import { getPlayerId, getPlayerName } from '../stats/player';
import { RunTracker } from '../stats/runTracker';
import { submitRun } from '../stats/sheetsClient';
import type { RunOutcome } from '../stats/types';

const MAX_SLOTS = 3;

export class Game {
  private board: Board;
  private levelManager: LevelManager;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private phase: GamePhase = 'menu';
  private slots: SlotStone[] = [];
  private strikes = 0;
  private lastTime = 0;
  private rafId = 0;
  private runTracker = new RunTracker();
  private submittingRun = false;

  constructor(
    private canvas: HTMLCanvasElement,
    _ctx: CanvasRenderingContext2D
  ) {
    this.levelManager = new LevelManager();
    this.board = this.levelManager.createBoard();
    this.renderer = new Renderer(canvas, _ctx);
    this.renderer.resize(this.board.cols, this.board.rows);

    this.inputHandler = this.createInputHandler();
    this.inputHandler.setEnabled(false);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  resize(): void {
    this.renderer.resize(this.board.cols, this.board.rows);
  }

  handleClick(): void {
    if (this.phase === 'menu') {
      this.strikes = 0;
      this.startLevel({ newRun: true });
    } else if (this.phase === 'strikeOut') {
      void this.finishRun('strike_out');
      this.strikes = 0;
      this.levelManager.resetToLevel(1);
      this.startLevel({ newRun: true });
    } else if (this.phase === 'levelComplete') {
      this.advanceLevel();
    } else if (this.phase === 'gameComplete') {
      void this.finishRun('victoria');
      this.strikes = 0;
      this.levelManager.resetToLevel(1);
      this.startLevel({ newRun: true });
    }
  }

  private createInputHandler(): InputHandler {
    return new InputHandler(
      this.canvas,
      this.board,
      () => this.renderer.getRestartButtonBounds(this.phase),
      (cell) => this.handlePickStone(cell),
      (col, row) => this.renderer.triggerShoot(col, row),
      () => this.resetLevel()
    );
  }

  private startLevel(options?: { newRun?: boolean }): void {
    this.board = this.levelManager.createBoard();
    this.phase = 'playing';
    this.slots = [];
    this.renderer.resize(this.board.cols, this.board.rows);
    this.replaceInputHandler();
    this.inputHandler.resetShip();
    this.inputHandler.setEnabled(true);

    const level = this.levelManager.getConfig().level;
    if (options?.newRun || !this.runTracker.isActive()) {
      this.runTracker.begin(level);
    } else {
      this.runTracker.noteLevelReached(level);
    }
  }

  private advanceLevel(): void {
    const completedLevel = this.levelManager.getConfig().level;
    if (completedLevel >= 30) {
      this.phase = 'gameComplete';
      this.inputHandler.setEnabled(false);
      return;
    }
    this.levelManager.completeLevel();
    this.startLevel();
  }

  resetLevel(): void {
    if (this.phase === 'menu') return;
    if (this.runTracker.isActive()) {
      void this.finishRun('restart');
    }
    this.strikes = 0;
    this.levelManager.resetToLevel(1);
    this.startLevel({ newRun: true });
  }

  private replaceInputHandler(): void {
    this.inputHandler.destroy();
    this.inputHandler = this.createInputHandler();
  }

  private handlePickStone(cell: Cell): void {
    if (this.phase !== 'playing') return;

    const existing = this.slots.find((s) => cellsEqual(s.cell, cell));
    if (existing) {
      this.returnSlot(existing);
      return;
    }

    if (this.slots.filter((s) => !s.returning).length >= MAX_SLOTS) return;

    const color = this.board.getStone(cell.col, cell.row);
    if (color === null) return;

    const slotIndex = this.slots.length;
    this.board.clearCells([cell]);

    this.slots.push({
      cell,
      color,
      slotIndex,
      progress: 0,
      returning: false,
      liftDelayMs: SHOT_FLIGHT_MS,
    });
  }

  private returnSlot(slot: SlotStone): void {
    slot.returning = true;
  }

  private reindexSlots(): void {
    this.slots.forEach((s, i) => {
      s.slotIndex = i;
    });
  }

  private updateSlots(deltaMs: number): void {
    for (const slot of this.slots) {
      if (slot.returning) {
        const speed = deltaMs / SLOT_RETURN_MS;
        slot.progress = Math.max(0, slot.progress - speed);
        if (slot.progress <= 0) {
          this.board.grid[slot.cell.row][slot.cell.col] = slot.color;
        }
        continue;
      }

      // Hold the stone in its grid cell until the cannonball reaches it, then
      // start lifting it into the slot.
      if (slot.liftDelayMs > 0) {
        slot.liftDelayMs = Math.max(0, slot.liftDelayMs - deltaMs);
        continue;
      }

      const speed = deltaMs / SLOT_ANIM_MS;
      slot.progress = Math.min(1, slot.progress + speed);
    }

    this.slots = this.slots.filter(
      (s) => !(s.returning && s.progress <= 0)
    );
    if (this.phase === 'playing') {
      this.reindexSlots();
    }
  }

  private checkSlotsReady(): boolean {
    return (
      this.slots.length === MAX_SLOTS &&
      this.slots.every((s) => !s.returning && s.progress >= 1)
    );
  }

  private tryResolveSlots(): void {
    if (!this.checkSlotsReady()) return;

    if (!this.board.isValidMatchFromSlots(this.slots)) {
      this.triggerMistake();
      return;
    }

    const color = this.slots[0].color;
    const cells = this.slots.map((s) => s.cell);
    const clearing = [...this.slots];
    this.slots = [];

    this.runTracker.noteMatch();

    // The clear is purely a visual flourish now (the board cells were already
    // emptied when each stone was fired). Keep the game in 'playing' so input
    // stays enabled and the player can immediately fire at the newly exposed
    // top stones instead of being locked out during the animation.
    this.renderer.startSlotMatchClear(clearing);
    this.renderer.spawnParticles(cells, color);

    if (this.board.isEmpty()) {
      this.runTracker.noteLevelCleared(this.levelManager.getConfig().level);
      this.phase = 'levelComplete';
      this.inputHandler.setEnabled(false);
    }
  }

  private triggerMistake(): void {
    this.strikes = Math.min(MAX_STRIKES, this.strikes + 1);
    this.phase = 'slotReturn';
    this.inputHandler.setEnabled(false);

    for (const slot of [...this.slots]) {
      slot.returning = true;
    }
  }

  private async finishRun(outcome: RunOutcome): Promise<void> {
    if (!this.runTracker.isActive() || this.submittingRun) return;
    if (!isSheetsConfigured()) {
      this.runTracker.end();
      return;
    }

    const snap = this.runTracker.snapshot(this.strikes);
    this.runTracker.end();

    // Skip empty / trivial restarts with no progress.
    if (outcome === 'restart' && snap.levelsCleared === 0 && snap.matches === 0) {
      return;
    }

    this.submittingRun = true;
    try {
      await submitRun({
        playerName: getPlayerName() || 'Anonymous',
        playerId: getPlayerId(),
        outcome,
        ...snap,
      });
    } catch (err) {
      console.error('[Game] failed to submit run:', err);
    } finally {
      this.submittingRun = false;
    }
  }

  private loop = (time: number): void => {
    try {
      this.tick(time);
    } catch (err) {
      // Never let a single frame's error permanently kill the render loop:
      // log it and keep scheduling frames so the game stays responsive.
      console.error('[Game.loop] frame error:', err);
    } finally {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  private tick(time: number): void {
    const deltaMs = Math.min(time - this.lastTime, 50);
    this.lastTime = time;

    if (this.phase === 'playing') {
      this.inputHandler.update(deltaMs);
    }

    if (
      this.phase === 'playing' ||
      this.phase === 'slotReturn'
    ) {
      this.updateSlots(deltaMs);
    }

    if (this.phase === 'playing') {
      this.tryResolveSlots();
    }

    if (this.phase === 'slotReturn' && this.slots.length === 0) {
      if (this.strikes >= MAX_STRIKES) {
        this.phase = 'strikeOut';
        this.inputHandler.setEnabled(false);
      } else {
        this.phase = 'playing';
        this.inputHandler.setEnabled(true);
      }
    }

    // The match-clear animation is purely cosmetic and runs independently of the
    // game phase, so advance it every frame.
    this.renderer.updateSlotClearAnim(deltaMs);

    this.renderer.updateParticles(deltaMs);
    this.renderer.updateShootEffect(deltaMs);

    const shipCol = this.inputHandler.getShipCol();

    this.renderer.render(
      this.board,
      this.slots,
      this.levelManager,
      this.phase,
      shipCol,
      this.strikes
    );
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.inputHandler.destroy();
  }
}

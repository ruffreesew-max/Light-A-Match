import { Board } from './Board';
import {
  COLOR_VALUES,
  Cell,
  GamePhase,
  Particle,
  SlotStone,
  StoneColor,
  ANIM_REMOVE_MS,
  SHOT_FLIGHT_MS,
} from './types';
import { LevelManager } from './LevelManager';
import { drawHUD, drawOverlay } from '../ui/HUD';
import { RestartButtonBounds } from './InputHandler';
import { StoneSpriteCache } from './StoneSpriteCache';
import { toRoman } from '../ui/romanNumerals';
import {
  THEME,
  drawRomanBackground,
  drawRomanPillar,
  drawRomanBattleship,
} from '../ui/romanTheme';

const ROMAN_FONT = '"Times New Roman", "Palatino Linotype", Georgia, serif';
const SLOT_COUNT = 3;

interface SlotClearAnim {
  stone: SlotStone;
  progress: number;
}

export class Renderer {
  private particles: Particle[] = [];
  private slotClear: SlotClearAnim[] = [];
  private animDurationMs = ANIM_REMOVE_MS;
  private stoneSprites = new StoneSpriteCache();
  private bgCache: HTMLCanvasElement | null = null;
  private bgCacheWidth = 0;
  private bgCacheHeight = 0;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private slotAreaHeight = 0;
  private hudHeight = 50;
  private shipDeckHeight = 72;
  private pillarWidth = THEME.pillarWidth;
  private boardScale = 0.7;
  private shootCol: number | null = null;
  private shootRow = 0;
  private shootProgress = 0;
  private boardCols = 5;
  private restartButton: RestartButtonBounds = { x: 0, y: 0, width: 0, height: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {}

  resize(cols: number, rows: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight - this.hudHeight;
    const playWidth = maxWidth - this.pillarWidth * 2;
    const boardAreaHeight = (maxHeight - this.shipDeckHeight) * 0.92;

    const cellFromWidth = (playWidth / cols) * this.boardScale;
    const cellFromHeight = (boardAreaHeight / rows) * this.boardScale;
    this.cellSize = Math.floor(Math.min(cellFromWidth, cellFromHeight));
    this.boardCols = cols;
    this.slotAreaHeight = this.cellSize * 1.2;

    const boardWidth = this.cellSize * cols;
    const boardHeight = this.cellSize * rows;

    this.offsetX =
      this.pillarWidth + Math.floor((playWidth - boardWidth) / 2);
    this.offsetY =
      this.hudHeight +
      this.shipDeckHeight +
      this.slotAreaHeight +
      20 +
      Math.floor((maxHeight - this.shipDeckHeight - this.slotAreaHeight - boardHeight) * 0.65);

    this.canvas.width = maxWidth * dpr;
    this.canvas.height = (maxHeight + this.hudHeight) * dpr;
    this.canvas.style.width = `${maxWidth}px`;
    this.canvas.style.height = `${maxHeight + this.hudHeight}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.restartButton = {
      x: this.pillarWidth + 20,
      y: maxHeight + this.hudHeight - 46,
      width: 124,
      height: 38,
    };

    this.invalidateBgCache();
  }

  private invalidateBgCache(): void {
    this.bgCache = null;
    this.bgCacheWidth = 0;
    this.bgCacheHeight = 0;
  }

  private ensureBgCache(width: number, height: number): void {
    if (
      this.bgCache &&
      this.bgCacheWidth === width &&
      this.bgCacheHeight === height
    ) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawRomanBackground(ctx, width, height);

    const pillarHeight = height - this.hudHeight * 0.5;
    const pillarY = this.hudHeight - 10;
    drawRomanPillar(ctx, 16, pillarY, pillarHeight, this.pillarWidth);
    drawRomanPillar(
      ctx,
      width - this.pillarWidth - 16,
      pillarY,
      pillarHeight,
      this.pillarWidth
    );

    this.bgCache = canvas;
    this.bgCacheWidth = width;
    this.bgCacheHeight = height;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  getShipDeckY(): number {
    return this.hudHeight + 8;
  }

  getRestartButtonBounds(phase: GamePhase): RestartButtonBounds | null {
    if (
      phase === 'menu' ||
      phase === 'levelComplete' ||
      phase === 'gameComplete' ||
      phase === 'strikeOut'
    ) {
      return null;
    }
    return this.restartButton;
  }

  triggerShoot(col: number, row: number): void {
    this.shootCol = col;
    this.shootRow = row;
    this.shootProgress = 0;
  }

  updateShootEffect(deltaMs: number): void {
    if (this.shootCol === null) return;
    this.shootProgress += deltaMs / SHOT_FLIGHT_MS;
    // Hold at the impact pose for a beat so the ball is seen touching the
    // stone, then clear. Using > 1.15 (not >= 1) keeps progress clamped to 1
    // for roughly one extra frame of impact.
    if (this.shootProgress > 1.15) {
      this.shootCol = null;
      this.shootProgress = 0;
    }
  }

  startSlotMatchClear(slots: SlotStone[]): void {
    this.slotClear = slots.map((stone) => ({ stone, progress: 0 }));
  }

  updateSlotClearAnim(deltaMs: number): boolean {
    if (this.slotClear.length === 0) return true;

    const speed = deltaMs / this.animDurationMs;
    let allDone = true;

    for (const anim of this.slotClear) {
      anim.progress = Math.min(1, anim.progress + speed);
      if (anim.progress < 1) allDone = false;
    }

    if (allDone) this.slotClear = [];
    return allDone;
  }

  setAnimations(): void {
    this.slotClear = [];
  }

  spawnParticles(cells: Cell[], color: StoneColor): void {
    for (let i = 0; i < cells.length; i++) {
      const pos = this.getSlotCenter(i);
      this.emitParticles(pos.x, pos.y, color);
    }
  }

  private emitParticles(x: number, y: number, color: StoneColor): void {
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: COLOR_VALUES[color],
        life: 1,
        maxLife: 1,
        size: 2 + Math.random() * 3,
      });
    }
  }

  updateParticles(deltaMs: number): void {
    const decay = deltaMs / 450;
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= decay;
      return p.life > 0;
    });
  }

  render(
    board: Board,
    slots: SlotStone[],
    levelManager: LevelManager,
    phase: GamePhase,
    shipCol: number,
    strikes = 0
  ): void {
    const { width, height } = this.getCanvasSize();

    this.ensureBgCache(width, height);
    if (this.bgCache) {
      this.ctx.drawImage(this.bgCache, 0, 0);
    } else {
      drawRomanBackground(this.ctx, width, height);
      this.drawPillars(height);
    }

    this.drawHUD(levelManager, phase, board, width, strikes);

    if (phase === 'menu') {
      this.drawGameOverlay(
        'Light-A-Match',
        'Arrow keys move galley, Space fires at column tops',
        `Click to begin Level ${toRoman(1)}`
      );
      return;
    }

    this.drawShipLanes(board.cols);
    this.drawBattleship(shipCol);
    this.drawSlotArea();
    this.drawBoard(board);
    // Draw the cannonball after the board so it isn't covered by the board
    // panel once it enters the grid — it must stay visible down to the stone.
    this.drawShootEffect();
    this.drawSlotStones(slots, phase);
    this.drawSlotClearStones();
    this.drawParticles();
    this.drawRestartButton(phase);

    if (phase === 'strikeOut') {
      this.drawGameOverlay(
        'Three Strikes',
        'Incorrect matches — back to Level I',
        'Click to try again'
      );
    } else if (phase === 'levelComplete') {
      const config = levelManager.getConfig();
      this.drawGameOverlay(
        `Level ${toRoman(config.level)} Complete`,
        'The temple stands cleared',
        'Click to continue'
      );
    } else if (phase === 'gameComplete') {
      this.drawGameOverlay(
        'Victoria!',
        'All levels conquered',
        'Click to play again'
      );
    }
  }

  private getSlotCenter(slotIndex: number): { x: number; y: number } {
    const gap = this.cellSize * 1.2;
    const totalWidth = gap * (SLOT_COUNT - 1);
    const boardCenter = this.offsetX + (this.cellSize * this.boardCols) / 2;
    const startX = boardCenter - totalWidth / 2;
    return {
      x: startX + slotIndex * gap,
      y: this.offsetY - this.slotAreaHeight * 0.45,
    };
  }

  private getCellCenter(cell: Cell): { x: number; y: number } {
    return {
      x: this.offsetX + cell.col * this.cellSize + this.cellSize / 2,
      y: this.offsetY + cell.row * this.cellSize + this.cellSize / 2,
    };
  }

  private getStoneScreenPos(slot: SlotStone): { x: number; y: number } {
    const from = this.getCellCenter(slot.cell);
    const to = this.getSlotCenter(slot.slotIndex);
    const t = this.easeOutCubic(slot.progress);
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
  }

  private drawSlotArea(): void {
    const y = this.offsetY - this.slotAreaHeight;
    this.ctx.fillStyle = 'rgba(42, 28, 18, 0.25)';
    this.ctx.fillRect(
      this.offsetX - 6,
      y,
      this.cellSize * this.boardCols + 12,
      this.slotAreaHeight
    );

    for (let i = 0; i < SLOT_COUNT; i++) {
      const center = this.getSlotCenter(i);
      const size = this.cellSize * 0.82;
      this.ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.roundRect(
        center.x - size / 2,
        center.y - size / 2,
        size,
        size,
        size * 0.15
      );
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  private drawSlotStones(slots: SlotStone[], phase: GamePhase): void {
    const stoneSize = this.cellSize * 0.78;
    const showRed = phase === 'slotReturn';

    for (const slot of slots) {
      const pos = this.getStoneScreenPos(slot);
      const redHue = showRed && slot.returning ? 0.7 : 0;
      this.drawStoneAt(
        pos.x - stoneSize / 2,
        pos.y - stoneSize / 2,
        stoneSize,
        slot.color,
        slot.cell.col,
        slot.cell.row,
        true,
        redHue
      );
    }
  }

  private drawSlotClearStones(): void {
    const stoneSize = this.cellSize * 0.78;

    for (const anim of this.slotClear) {
      const pos = this.getSlotCenter(anim.stone.slotIndex);
      const scale = 1 - this.easeOutCubic(anim.progress);
      if (scale <= 0) continue;
      const size = stoneSize * scale;
      const offset = (stoneSize - size) / 2;
      this.drawStoneAt(
        pos.x - stoneSize / 2 + offset,
        pos.y - stoneSize / 2 + offset,
        size,
        anim.stone.color,
        anim.stone.cell.col,
        anim.stone.cell.row,
        true,
        0,
        1 - anim.progress
      );
    }
  }

  private drawShipLanes(cols: number): void {
    const deckY = this.getShipDeckY() + this.cellSize * 0.5;

    for (let col = 0; col < cols; col++) {
      const x = this.offsetX + col * this.cellSize;
      this.ctx.fillStyle = 'rgba(30, 20, 12, 0.15)';
      this.ctx.fillRect(x, deckY - 4, this.cellSize, this.shipDeckHeight - 8);
    }
  }

  private drawBattleship(shipCol: number): void {
    const centerX =
      this.offsetX + shipCol * this.cellSize + this.cellSize / 2;
    drawRomanBattleship(this.ctx, centerX, this.getShipDeckY(), this.cellSize);
  }

  private drawShootEffect(): void {
    if (this.shootCol === null) return;

    const col = this.shootCol;
    const startX = this.offsetX + col * this.cellSize + this.cellSize / 2;
    const startY = this.getShipDeckY() + this.cellSize * 0.55;
    // Travel all the way down to the fired stone's cell (through the slot band
    // and into the grid) so the cannonball visually reaches its target.
    const targetY =
      this.offsetY + this.shootRow * this.cellSize + this.cellSize / 2;
    // Linear travel (not ease-out) so the ball keeps clearly moving until it
    // hits — ease-out made it look like it stalled short of the stone.
    const t = Math.min(1, this.shootProgress);
    const y = startY + (targetY - startY) * t;

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(201, 162, 39, ${1 - t * 0.45})`;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(startX, y);
    this.ctx.stroke();

    this.ctx.fillStyle = THEME.gold;
    this.ctx.beginPath();
    this.ctx.arc(startX, y, Math.max(5, this.cellSize * 0.09), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawRestartButton(phase: GamePhase): void {
    if (
      phase === 'menu' ||
      phase === 'levelComplete' ||
      phase === 'gameComplete' ||
      phase === 'strikeOut'
    ) {
      return;
    }

    const { x, y, width, height } = this.restartButton;

    this.ctx.save();
    this.ctx.globalAlpha = 1;
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = 'rgba(42, 28, 18, 0.92)';
    this.roundRect(x, y, width, height, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = THEME.gold;
    this.ctx.lineWidth = 2;
    this.roundRect(x, y, width, height, 8);
    this.ctx.stroke();

    this.ctx.fillStyle = THEME.textLight;
    this.ctx.font = `bold 16px ${ROMAN_FONT}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Restart', x + width / 2, y + height / 2);
    this.ctx.restore();
  }

  private drawPillars(canvasHeight: number): void {
    const pillarHeight = canvasHeight - this.hudHeight * 0.5;
    const pillarY = this.hudHeight - 10;

    drawRomanPillar(this.ctx, 16, pillarY, pillarHeight, this.pillarWidth);
    drawRomanPillar(
      this.ctx,
      this.getCanvasSize().width - this.pillarWidth - 16,
      pillarY,
      pillarHeight,
      this.pillarWidth
    );
  }

  private getCanvasSize(): { width: number; height: number } {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
      width: this.canvas.width / dpr,
      height: this.canvas.height / dpr,
    };
  }

  private drawHUD(
    levelManager: LevelManager,
    phase: GamePhase,
    board: Board,
    canvasWidth: number,
    strikes: number
  ): void {
    drawHUD(
      this.ctx,
      levelManager,
      phase,
      board,
      canvasWidth,
      this.hudHeight,
      strikes
    );
  }

  private drawGameOverlay(title: string, subtitle: string, footer: string): void {
    const { width, height } = this.getCanvasSize();
    drawOverlay(this.ctx, width, height, title, subtitle, footer);
  }

  private drawBoard(board: Board): void {
    const padding = this.cellSize * 0.08;
    const stoneSize = this.cellSize - padding * 2;
    const accessible = new Set(
      board.getAccessibleCells().map((c) => `${c.col},${c.row}`)
    );

    this.ctx.fillStyle = 'rgba(42, 28, 18, 0.35)';
    this.roundRect(
      this.offsetX - 8,
      this.offsetY - 8,
      board.cols * this.cellSize + 16,
      board.rows * this.cellSize + 16,
      12
    );
    this.ctx.fill();

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const color = board.getStone(col, row);
        const x = this.offsetX + col * this.cellSize;
        const y = this.offsetY + row * this.cellSize;

        this.ctx.fillStyle = 'rgba(30, 20, 12, 0.25)';
        this.roundRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 6);
        this.ctx.fill();

        if (color === null) continue;

        const stoneX = x + padding;
        const stoneY = y + padding;
        const isAccessible = accessible.has(`${col},${row}`);

        this.drawStoneAt(
          stoneX,
          stoneY,
          stoneSize,
          color,
          col,
          row,
          isAccessible,
          0
        );
      }
    }
  }

  private drawStoneAt(
    x: number,
    y: number,
    size: number,
    color: StoneColor,
    col: number,
    row: number,
    accessible: boolean,
    redHue: number,
    alpha = 1
  ): void {
    const roundedSize = Math.round(size);
    if (roundedSize < 1) return;
    this.stoneSprites.clearIfSizeChanged(roundedSize);
    const sprite = this.stoneSprites.getSprite(color, roundedSize, col, row);

    this.ctx.save();
    this.ctx.globalAlpha = accessible ? alpha : alpha * 0.38;

    this.ctx.drawImage(sprite, x, y, size, size);

    if (redHue > 0) {
      const radius = size * 0.18;
      this.ctx.globalAlpha = alpha * redHue * 0.6;
      this.ctx.fillStyle = '#c62828';
      this.roundRect(x, y, size, size, radius);
      this.ctx.fill();
    }

    if (accessible) {
      const radius = size * 0.18;
      this.ctx.globalAlpha = alpha * 0.85;
      this.ctx.strokeStyle = 'rgba(245, 234, 214, 0.45)';
      this.ctx.lineWidth = 2;
      this.roundRect(x - 1, y - 1, size + 2, size + 2, radius + 1);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}

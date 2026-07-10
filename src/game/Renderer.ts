import { Board } from './Board';
import {
  COLS,
  ROWS,
  COLOR_VALUES,
  COLOR_HIGHLIGHTS,
  Cell,
  GamePhase,
  Particle,
  StoneAnimation,
  StoneColor,
} from './types';
import { ScoreManager } from './ScoreManager';
import { drawHUD, drawOverlay } from '../ui/HUD';

export class Renderer {
  private particles: Particle[] = [];
  private animations: StoneAnimation[] = [];
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private hudHeight = 60;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {}

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight - this.hudHeight;

    const cellFromWidth = maxWidth / COLS;
    const cellFromHeight = maxHeight / ROWS;
    this.cellSize = Math.floor(Math.min(cellFromWidth, cellFromHeight));

    const boardWidth = this.cellSize * COLS;
    const boardHeight = this.cellSize * ROWS;

    this.offsetX = Math.floor((maxWidth - boardWidth) / 2);
    this.offsetY = this.hudHeight + Math.floor((maxHeight - boardHeight) / 2);

    this.canvas.width = maxWidth * dpr;
    this.canvas.height = (maxHeight + this.hudHeight) * dpr;
    this.canvas.style.width = `${maxWidth}px`;
    this.canvas.style.height = `${maxHeight + this.hudHeight}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  setAnimations(animations: StoneAnimation[]): void {
    this.animations = animations;
  }

  updateAnimations(deltaMs: number): boolean {
    if (this.animations.length === 0) return true;

    const speed = deltaMs / 200;
    let allDone = true;

    for (const anim of this.animations) {
      anim.progress = Math.min(1, anim.progress + speed);
      if (anim.progress < 1) allDone = false;

      if (anim.type === 'fall' || anim.type === 'spawn') {
        const eased = this.easeOutCubic(anim.progress);
        anim.offsetY = anim.startOffsetY * (1 - eased);
      }
    }

    if (allDone) {
      this.animations = [];
    }

    return allDone;
  }

  spawnParticles(cells: Cell[], color: StoneColor): void {
    for (const { col, row } of cells) {
      const cx = this.offsetX + col * this.cellSize + this.cellSize / 2;
      const cy = this.offsetY + row * this.cellSize + this.cellSize / 2;
      const particleCount = 3;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
        const speed = 2 + Math.random() * 3;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: COLOR_VALUES[color],
          life: 1,
          maxLife: 1,
          size: 3 + Math.random() * 4,
        });
      }
    }
  }

  updateParticles(deltaMs: number): void {
    const decay = deltaMs / 400;
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= decay;
      return p.life > 0;
    });
  }

  render(
    board: Board,
    chain: Cell[],
    scoreManager: ScoreManager,
    phase: GamePhase,
    earnedScore?: number
  ): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, width, height);

    this.drawHUD(scoreManager, phase);

    if (phase === 'menu') {
      this.drawGameOverlay('Light-A-Match', 'Click or tap to start', '');
      return;
    }

    this.drawBoard(board, chain);

    if (earnedScore && earnedScore > 0) {
      this.drawFloatingScore(earnedScore);
    }

    this.drawParticles();

    if (phase === 'gameOver') {
      this.drawGameOverlay(
        'Time\'s Up!',
        `Score: ${scoreManager.score}`,
        `High Score: ${scoreManager.highScore} — Click to play again`
      );
    }
  }

  private getCanvasSize(): { width: number; height: number } {
    const dpr = window.devicePixelRatio || 1;
    return {
      width: this.canvas.width / dpr,
      height: this.canvas.height / dpr,
    };
  }

  private drawHUD(scoreManager: ScoreManager, phase: GamePhase): void {
    const { width } = this.getCanvasSize();
    drawHUD(this.ctx, scoreManager, phase, width, this.hudHeight);
  }

  private drawGameOverlay(title: string, subtitle: string, footer: string): void {
    const { width, height } = this.getCanvasSize();
    drawOverlay(this.ctx, width, height, title, subtitle, footer);
  }

  private drawBoard(board: Board, chain: Cell[]): void {
    const padding = this.cellSize * 0.08;
    const stoneSize = this.cellSize - padding * 2;

    const hiddenCells = new Set<string>();
    for (const anim of this.animations) {
      if (anim.type === 'remove' && anim.progress < 1) {
        hiddenCells.add(`${anim.col},${anim.row}`);
      }
      if ((anim.type === 'fall' || anim.type === 'spawn') && anim.progress < 1) {
        hiddenCells.add(`${anim.col},${anim.row}`);
      }
    }

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const color = board.getStone(col, row);
        if (color === null) continue;

        const key = `${col},${row}`;
        if (hiddenCells.has(key)) continue;

        const x = this.offsetX + col * this.cellSize + padding;
        const y = this.offsetY + row * this.cellSize + padding;

        const isSelected = chain.some((c) => c.col === col && c.row === row);
        this.drawStone(x, y, stoneSize, color, isSelected);
      }
    }

    for (const anim of this.animations) {
      if (anim.type === 'remove') {
        const scale = 1 - this.easeOutCubic(anim.progress);
        if (scale <= 0) continue;
        const padding = this.cellSize * 0.08;
        const stoneSize = (this.cellSize - padding * 2) * scale;
        const offset = (this.cellSize - padding * 2 - stoneSize) / 2;
        const x = this.offsetX + anim.col * this.cellSize + padding + offset;
        const y = this.offsetY + anim.row * this.cellSize + padding + offset;
        this.drawStone(x, y, stoneSize, anim.color, false, 1 - anim.progress);
      } else {
        const padding = this.cellSize * 0.08;
        const stoneSize = this.cellSize - padding * 2;
        const x = this.offsetX + anim.col * this.cellSize + padding;
        const y = this.offsetY + anim.row * this.cellSize + padding + anim.offsetY;
        this.drawStone(x, y, stoneSize, anim.color, false);
      }
    }

    if (chain.length >= 2) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      for (let i = 0; i < chain.length; i++) {
        const cx =
          this.offsetX + chain[i].col * this.cellSize + this.cellSize / 2;
        const cy =
          this.offsetY + chain[i].row * this.cellSize + this.cellSize / 2;
        if (i === 0) this.ctx.moveTo(cx, cy);
        else this.ctx.lineTo(cx, cy);
      }
      this.ctx.stroke();
    }
  }

  private drawStone(
    x: number,
    y: number,
    size: number,
    color: StoneColor,
    selected: boolean,
    alpha = 1
  ): void {
    const radius = size * 0.22;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    this.ctx.shadowBlur = selected ? 12 : 6;
    this.ctx.shadowOffsetY = 3;

    this.ctx.fillStyle = COLOR_VALUES[color];
    this.roundRect(x, y, size, size, radius);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    const highlightSize = size * 0.35;
    this.ctx.fillStyle = COLOR_HIGHLIGHTS[color];
    this.ctx.globalAlpha = alpha * 0.5;
    this.roundRect(
      x + size * 0.15,
      y + size * 0.1,
      highlightSize,
      highlightSize * 0.6,
      radius * 0.5
    );
    this.ctx.fill();

    if (selected) {
      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.roundRect(x - 2, y - 2, size + 4, size + 4, radius + 2);
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

  private drawFloatingScore(earned: number): void {
    this.ctx.save();
    this.ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `+${earned}`,
      this.offsetX + (COLS * this.cellSize) / 2,
      this.offsetY + 20
    );
    this.ctx.restore();
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

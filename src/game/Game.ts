import { createBoardWithValidMoves, Board } from './Board';
import { MatchEngine } from './MatchEngine';
import { InputHandler } from './InputHandler';
import { Renderer } from './Renderer';
import { ScoreManager } from './ScoreManager';
import { Cell, GamePhase } from './types';

export class Game {
  private board: Board;
  private matchEngine: MatchEngine;
  private scoreManager: ScoreManager;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private phase: GamePhase = 'menu';
  private lastTime = 0;
  private earnedScore = 0;
  private earnedScoreTimer = 0;
  private rafId = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {
    this.board = createBoardWithValidMoves();
    this.matchEngine = new MatchEngine(this.board);
    this.scoreManager = new ScoreManager();
    this.renderer = new Renderer(canvas, ctx);
    this.renderer.resize();

    this.inputHandler = new InputHandler(
      canvas,
      this.board,
      () => this.renderer.getCellSize(),
      () => this.renderer.getOffset(),
      (chain) => this.handleMatch(chain)
    );

    this.inputHandler.setEnabled(false);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  resize(): void {
    this.renderer.resize();
  }

  handleClick(): void {
    if (this.phase === 'menu') {
      this.startGame();
    } else if (this.phase === 'gameOver') {
      this.startGame();
    }
  }

  handleKeyRestart(): void {
    if (this.phase === 'gameOver') {
      this.startGame();
    }
  }

  private startGame(): void {
    this.board = createBoardWithValidMoves();
    this.matchEngine = new MatchEngine(this.board);
    this.scoreManager.reset();
    this.phase = 'playing';
    this.earnedScore = 0;
    this.earnedScoreTimer = 0;
    this.inputHandler.setEnabled(true);

    this.inputHandler.destroy();
    this.inputHandler = new InputHandler(
      this.canvas,
      this.board,
      () => this.renderer.getCellSize(),
      () => this.renderer.getOffset(),
      (chain) => this.handleMatch(chain)
    );
  }

  private handleMatch(chain: Cell[]): void {
    if (this.phase !== 'playing') return;

    const chainColor = this.board.getChainColor(chain);
    const result = this.matchEngine.executeMatch(chain);
    if (!result) return;

    this.phase = 'animating';
    this.inputHandler.setEnabled(false);

    const earned = this.scoreManager.registerMatch(chain.length);
    this.earnedScore = earned;
    this.earnedScoreTimer = 800;

    const animations = this.matchEngine.buildAnimations(
      result,
      this.renderer.getCellSize()
    );
    this.renderer.setAnimations(animations);

    if (chainColor) {
      this.renderer.spawnParticles(result.clearedCells, chainColor);
    }
  }

  private loop = (time: number): void => {
    const deltaMs = time - this.lastTime;
    this.lastTime = time;
    const deltaSeconds = deltaMs / 1000;

    if (this.phase === 'playing') {
      this.scoreManager.updateComboIdle();
      const timeUp = this.scoreManager.updateTimer(deltaSeconds);
      if (timeUp) {
        this.phase = 'gameOver';
        this.scoreManager.finalizeHighScore();
        this.inputHandler.setEnabled(false);
      }
    }

    if (this.phase === 'animating') {
      const done = this.renderer.updateAnimations(deltaMs);
      if (done) {
        this.phase = 'playing';
        this.inputHandler.setEnabled(true);
      }
    }

    this.renderer.updateParticles(deltaMs);

    if (this.earnedScoreTimer > 0) {
      this.earnedScoreTimer -= deltaMs;
      if (this.earnedScoreTimer <= 0) {
        this.earnedScore = 0;
      }
    }

    const chain = this.inputHandler.getChain();
    this.renderer.render(
      this.board,
      chain,
      this.scoreManager,
      this.phase,
      this.earnedScore
    );

    this.rafId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.inputHandler.destroy();
  }
}

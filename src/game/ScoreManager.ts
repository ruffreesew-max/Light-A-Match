import {
  COMBO_WINDOW_MS,
  GAME_DURATION,
  HIGH_SCORE_KEY,
  MIN_CHAIN_LENGTH,
} from './types';

export class ScoreManager {
  score = 0;
  combo = 1;
  timeRemaining = GAME_DURATION;
  highScore = 0;
  private lastMatchTime = 0;

  constructor() {
    this.highScore = this.loadHighScore();
  }

  reset(): void {
    this.score = 0;
    this.combo = 1;
    this.timeRemaining = GAME_DURATION;
    this.lastMatchTime = 0;
  }

  updateTimer(deltaSeconds: number): boolean {
    this.timeRemaining -= deltaSeconds;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      return true;
    }
    return false;
  }

  registerMatch(chainLength: number): number {
    const now = performance.now();

    if (this.lastMatchTime > 0 && now - this.lastMatchTime <= COMBO_WINDOW_MS) {
      this.combo++;
    } else {
      this.combo = 1;
    }

    this.lastMatchTime = now;

    const baseScore = chainLength * 10;
    const earned = baseScore * this.combo;
    this.score += earned;
    return earned;
  }

  updateComboIdle(): void {
    if (this.lastMatchTime === 0) return;
    const now = performance.now();
    if (now - this.lastMatchTime > COMBO_WINDOW_MS) {
      this.combo = 1;
      this.lastMatchTime = 0;
    }
  }

  finalizeHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
    }
  }

  private loadHighScore(): number {
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  getMinChainLength(): number {
    return MIN_CHAIN_LENGTH;
  }
}

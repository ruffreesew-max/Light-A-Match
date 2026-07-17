/** Tracks one play session from leaving the menu until the run ends. */
export class RunTracker {
  private startedAt = 0;
  private matches = 0;
  private levelsCleared = 0;
  private peakLevel = 1;
  private active = false;

  begin(level: number): void {
    this.startedAt = performance.now();
    this.matches = 0;
    this.levelsCleared = 0;
    this.peakLevel = Math.max(1, level);
    this.active = true;
  }

  noteMatch(): void {
    if (!this.active) return;
    this.matches++;
  }

  noteLevelCleared(level: number): void {
    if (!this.active) return;
    this.levelsCleared++;
    this.peakLevel = Math.max(this.peakLevel, level);
  }

  noteLevelReached(level: number): void {
    if (!this.active) return;
    this.peakLevel = Math.max(this.peakLevel, level);
  }

  snapshot(strikes: number): {
    bestLevel: number;
    strikes: number;
    levelsCleared: number;
    matches: number;
    durationSec: number;
  } {
    const durationSec = this.active
      ? Math.max(0, Math.round((performance.now() - this.startedAt) / 1000))
      : 0;
    return {
      bestLevel: this.peakLevel,
      strikes,
      levelsCleared: this.levelsCleared,
      matches: this.matches,
      durationSec,
    };
  }

  end(): void {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }
}

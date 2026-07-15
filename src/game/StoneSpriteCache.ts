import {
  COLOR_VALUES,
  COLOR_GRAIN,
  COLOR_SPECKLE,
  StoneColor,
} from './types';
import { drawStoneTexture } from '../ui/romanTheme';

export class StoneSpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();
  private cachedSize = -1;

  clearIfSizeChanged(size: number): void {
    const rounded = Math.max(1, Math.round(size));
    if (this.cachedSize === rounded) return;
    this.cache.clear();
    this.cachedSize = rounded;
  }

  getSprite(
    color: StoneColor,
    size: number,
    col: number,
    row: number
  ): HTMLCanvasElement {
    const rounded = Math.max(1, Math.round(size));
    const key = `${color}:${col}:${row}:${rounded}`;

    const existing = this.cache.get(key);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = rounded;
    canvas.height = rounded;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const radius = rounded * 0.18;
    drawStoneTexture(
      ctx,
      0,
      0,
      rounded,
      COLOR_VALUES[color],
      COLOR_GRAIN[color],
      COLOR_SPECKLE[color],
      col,
      row,
      color,
      radius
    );

    this.cache.set(key, canvas);
    return canvas;
  }
}

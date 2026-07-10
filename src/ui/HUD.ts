import { GamePhase } from '../game/types';
import { ScoreManager } from '../game/ScoreManager';

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  scoreManager: ScoreManager,
  phase: GamePhase,
  canvasWidth: number,
  hudHeight: number
): void {
  if (phase === 'menu') return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvasWidth, hudHeight);

  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${scoreManager.score}`, 20, hudHeight / 2);

  if (scoreManager.combo > 1) {
    ctx.fillStyle = '#f1c40f';
    ctx.textAlign = 'center';
    ctx.fillText(`Combo x${scoreManager.combo}`, canvasWidth / 2, hudHeight / 2);
  }

  const time = Math.ceil(scoreManager.timeRemaining);
  ctx.textAlign = 'right';
  ctx.fillStyle = time <= 10 ? '#e74c3c' : '#ffffff';
  ctx.fillText(`Time: ${time}`, canvasWidth - 20, hudHeight / 2);
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  title: string,
  subtitle: string,
  footer: string
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, canvasWidth / 2, canvasHeight / 2 - 40);

  ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#cccccc';
  ctx.fillText(subtitle, canvasWidth / 2, canvasHeight / 2 + 10);

  if (footer) {
    ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(footer, canvasWidth / 2, canvasHeight / 2 + 50);
  }
}

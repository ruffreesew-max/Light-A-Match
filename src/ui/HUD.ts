import { GamePhase, MAX_STRIKES } from '../game/types';
import { LevelManager } from '../game/LevelManager';
import { Board } from '../game/Board';
import { toRoman } from './romanNumerals';
import { THEME } from './romanTheme';

const ROMAN_FONT = '"Times New Roman", "Palatino Linotype", Georgia, serif';

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  levelManager: LevelManager,
  phase: GamePhase,
  board: Board,
  canvasWidth: number,
  hudHeight: number,
  strikes = 0
): void {
  if (phase === 'menu') return;

  ctx.fillStyle = THEME.hudBg;
  ctx.fillRect(0, 0, canvasWidth, hudHeight);

  const config = levelManager.getConfig();
  const midY = hudHeight / 2;

  ctx.font = `bold 24px ${ROMAN_FONT}`;
  ctx.textBaseline = 'middle';

  ctx.fillStyle = THEME.gold;
  ctx.textAlign = 'left';
  ctx.fillText(`Level ${toRoman(config.level)}`, 24, midY);

  ctx.textAlign = 'center';
  ctx.fillStyle = THEME.textLight;
  ctx.font = `20px ${ROMAN_FONT}`;
  ctx.fillText(
    `${toRoman(board.countStones())} Stones Remaining`,
    canvasWidth / 2,
    midY
  );

  // Three-strike meter on the right (filled = incorrect matches so far).
  const strikeRight = canvasWidth - 24;
  const gap = 16;
  const r = 6;
  for (let i = 0; i < MAX_STRIKES; i++) {
    const cx = strikeRight - (MAX_STRIKES - 1 - i) * gap;
    ctx.beginPath();
    ctx.arc(cx, midY, r, 0, Math.PI * 2);
    if (i < strikes) {
      ctx.fillStyle = '#c62828';
      ctx.fill();
      ctx.strokeStyle = THEME.gold;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.fillStyle = THEME.textMuted;
  ctx.font = `14px ${ROMAN_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Strikes', strikeRight - MAX_STRIKES * gap - 8, midY);
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  title: string,
  subtitle: string,
  footer: string
): void {
  ctx.fillStyle = 'rgba(24, 16, 10, 0.72)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `bold 52px ${ROMAN_FONT}`;
  ctx.fillStyle = THEME.gold;
  ctx.fillText(title, canvasWidth / 2, canvasHeight / 2 - 44);

  ctx.font = `26px ${ROMAN_FONT}`;
  ctx.fillStyle = THEME.textLight;
  ctx.fillText(subtitle, canvasWidth / 2, canvasHeight / 2 + 8);

  if (footer) {
    ctx.font = `20px ${ROMAN_FONT}`;
    ctx.fillStyle = THEME.textMuted;
    ctx.fillText(footer, canvasWidth / 2, canvasHeight / 2 + 52);
  }
}

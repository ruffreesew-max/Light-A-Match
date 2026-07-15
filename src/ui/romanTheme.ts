export const THEME = {
  skyTop: '#6b8fa3',
  skyBottom: '#c4a574',
  ground: '#8b6f47',
  marble: '#e8dcc8',
  marbleDark: '#c9b89a',
  marbleShadow: '#9a8668',
  gold: '#c9a227',
  goldDark: '#8a6d1d',
  hudBg: 'rgba(42, 28, 18, 0.72)',
  textLight: '#f5ead6',
  textMuted: '#d4c4a8',
  pillarWidth: 88,
};

export function drawRomanBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, THEME.skyTop);
  gradient.addColorStop(0.55, THEME.skyBottom);
  gradient.addColorStop(1, THEME.ground);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(60, 40, 24, 0.18)';
  ctx.fillRect(0, height * 0.78, width, height * 0.22);
}

export function drawRomanPillar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  width: number
): void {
  const shaftTop = y + width * 0.55;
  const shaftBottom = y + height - width * 0.35;
  const shaftWidth = width * 0.62;
  const shaftX = x + (width - shaftWidth) / 2;

  ctx.save();

  // Base plinth
  ctx.fillStyle = THEME.marble;
  ctx.fillRect(x, shaftBottom, width, width * 0.28);
  ctx.fillStyle = THEME.marbleShadow;
  ctx.fillRect(x, shaftBottom + width * 0.2, width, width * 0.08);

  // Shaft
  const shaftGrad = ctx.createLinearGradient(shaftX, 0, shaftX + shaftWidth, 0);
  shaftGrad.addColorStop(0, THEME.marbleShadow);
  shaftGrad.addColorStop(0.25, THEME.marble);
  shaftGrad.addColorStop(0.5, '#f3ebdc');
  shaftGrad.addColorStop(0.75, THEME.marble);
  shaftGrad.addColorStop(1, THEME.marbleShadow);
  ctx.fillStyle = shaftGrad;
  ctx.fillRect(shaftX, shaftTop, shaftWidth, shaftBottom - shaftTop);

  // Fluting
  ctx.strokeStyle = 'rgba(90, 70, 48, 0.22)';
  ctx.lineWidth = 1.5;
  const fluteCount = 5;
  for (let i = 1; i < fluteCount; i++) {
    const fx = shaftX + (shaftWidth * i) / fluteCount;
    ctx.beginPath();
    ctx.moveTo(fx, shaftTop + 6);
    ctx.lineTo(fx, shaftBottom - 4);
    ctx.stroke();
  }

  // Capital
  ctx.fillStyle = THEME.marble;
  ctx.beginPath();
  ctx.ellipse(x + width / 2, shaftTop, width * 0.48, width * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + width * 0.08, shaftTop - width * 0.18, width * 0.84, width * 0.2);

  ctx.fillStyle = THEME.gold;
  ctx.fillRect(x + width * 0.12, shaftTop - width * 0.24, width * 0.76, width * 0.06);

  // Volute scrolls
  ctx.strokeStyle = THEME.goldDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + width * 0.22, shaftTop - width * 0.08, width * 0.08, 0, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + width * 0.78, shaftTop - width * 0.08, width * 0.08, Math.PI, Math.PI * 2.5);
  ctx.stroke();

  ctx.restore();
}

export function drawRomanBattleship(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  deckY: number,
  cellSize: number
): void {
  const hullW = cellSize * 0.9;
  const hullH = cellSize * 0.42;
  const x = centerX - hullW / 2;
  const y = deckY;

  ctx.save();

  // Hull
  ctx.fillStyle = '#5c3d2e';
  ctx.beginPath();
  ctx.moveTo(x, y + hullH * 0.35);
  ctx.lineTo(x + hullW * 0.08, y + hullH);
  ctx.lineTo(x + hullW * 0.92, y + hullH);
  ctx.lineTo(x + hullW, y + hullH * 0.35);
  ctx.closePath();
  ctx.fill();

  // Deck
  ctx.fillStyle = THEME.marble;
  ctx.fillRect(x + hullW * 0.12, y, hullW * 0.76, hullH * 0.45);

  // Bronze rail
  ctx.fillStyle = THEME.gold;
  ctx.fillRect(x + hullW * 0.1, y + hullH * 0.08, hullW * 0.8, hullH * 0.08);

  // Eagle emblem
  ctx.fillStyle = THEME.goldDark;
  ctx.beginPath();
  ctx.moveTo(centerX, y + hullH * 0.12);
  ctx.lineTo(centerX - hullW * 0.1, y + hullH * 0.32);
  ctx.lineTo(centerX + hullW * 0.1, y + hullH * 0.32);
  ctx.closePath();
  ctx.fill();

  // Catapult / ballista arm
  ctx.strokeStyle = '#3e2a1c';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX, y + hullH * 0.2);
  ctx.lineTo(centerX, y + hullH * 0.75);
  ctx.stroke();

  // Aiming reticle at bottom
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, y + hullH);
  ctx.lineTo(centerX, y + hullH + cellSize * 0.15);
  ctx.stroke();

  ctx.restore();
}

function hashSeed(col: number, row: number, color: string): number {
  return (col * 92821 + row * 68917 + color.charCodeAt(0) * 97) >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function drawStoneTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  baseColor: string,
  grainColor: string,
  speckleColor: string,
  col: number,
  row: number,
  colorId: string,
  radius: number
): void {
  const rand = seededRandom(hashSeed(col, row, colorId));

  ctx.save();
  roundRectPath(ctx, x, y, size, size, radius);
  ctx.clip();

  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, size, size);

  // Mineral grain bands
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = grainColor;
  for (let i = 0; i < 3; i++) {
    const gy = y + size * (0.1 + rand() * 0.8);
    ctx.lineWidth = 0.8 + rand() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.bezierCurveTo(
      x + size * 0.35,
      gy + (rand() - 0.5) * 6,
      x + size * 0.65,
      gy + (rand() - 0.5) * 6,
      x + size,
      gy + (rand() - 0.5) * 4
    );
    ctx.stroke();
  }

  // Speckles and pits
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = speckleColor;
  const speckleCount = Math.max(4, Math.floor(size * 0.12));
  for (let i = 0; i < speckleCount; i++) {
    const sx = x + rand() * size;
    const sy = y + rand() * size;
    const sr = 0.5 + rand() * 1.6;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Matte edge wear
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = 'rgba(30, 22, 14, 0.5)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, x + 1, y + 1, size - 2, size - 2, radius - 1);
  ctx.stroke();

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 2, y + 2, size * 0.45, size * 0.18);

  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

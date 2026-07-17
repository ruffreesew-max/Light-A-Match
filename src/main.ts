import { Game } from './game/Game';
import { StatsPanel } from './ui/StatsPanel';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
const app = document.getElementById('app');
const leaderboardBtn = document.getElementById('leaderboard-btn');

if (!ctx || !app) {
  throw new Error('Could not get game canvas / app root');
}

const game = new Game(canvas, ctx);
const statsPanel = new StatsPanel(app);
game.start();

window.addEventListener('resize', () => game.resize());

canvas.addEventListener('click', () => {
  if (statsPanel.isOpen()) return;
  game.handleClick();
});

leaderboardBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  statsPanel.show();
});

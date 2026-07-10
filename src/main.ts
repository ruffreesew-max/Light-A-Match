import { Game } from './game/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('Could not get 2D rendering context');
}

const game = new Game(canvas, ctx);
game.start();

window.addEventListener('resize', () => game.resize());

document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    game.handleKeyRestart();
  }
});

canvas.addEventListener('click', () => game.handleClick());

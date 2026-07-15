import { defineConfig } from 'vite';

// Relative base so GitHub Pages (and any static host) can serve assets correctly
// whether the site lives at the domain root or under /Light-A-Match/.
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: true,
  },
});

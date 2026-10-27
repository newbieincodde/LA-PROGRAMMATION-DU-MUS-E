import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  root: '.',
  publicDir: false,
  server: {
    port: 5173,
    open: false,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'bundled-assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  plugins: [
    {
      name: 'copy-assets-folder',
      closeBundle() {
        const src = path.resolve('assets');
        const dest = path.resolve('dist/assets');
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true });
          console.log('[copy-assets-folder] Successfully mirrored assets to dist/assets for 100% production fidelity.');
        }
      },
    },
  ],
});

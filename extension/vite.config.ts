import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';

export default defineConfig({
  // Set root to src so HTML entry points are output relative to it,
  // meaning popup.html → dist/popup.html (not dist/src/popup.html)
  root: 'src',
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es', // Ensure ES format for module support
      },
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  plugins: [
    {
      // After build: copy manifest + public assets into dist
      name: 'copy-extension-assets',
      closeBundle() {
        const copies: [string, string][] = [
          ['public/manifest.json', 'dist/manifest.json'],
          ['public/favicon.svg',   'dist/favicon.svg'],
          ['public/icons.svg',     'dist/icons.svg'],
          ['public/loader.js',     'dist/loader.js'],
        ];
        for (const [src, dest] of copies) {
          const abs = resolve(__dirname, src);
          if (existsSync(abs)) copyFileSync(abs, resolve(__dirname, dest));
        }
      },
    },
  ],
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-files',
      closeBundle() {
        // Copy manifest.json
        copyFileSync('manifest.json', 'build/manifest.json');
        
        // Copy public files
        const publicDir = 'public';
        const buildDir = 'build';
        
        if (!existsSync(`${buildDir}/icons`)) {
          mkdirSync(`${buildDir}/icons`, { recursive: true });
        }
        
        // Copy inject.js
        if (existsSync(`${publicDir}/inject.js`)) {
          copyFileSync(`${publicDir}/inject.js`, `${buildDir}/inject.js`);
        }
      }
    }
  ],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/inject.ts'),
      },
      output: {
        entryFileNames: (chunkInfo: any) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});

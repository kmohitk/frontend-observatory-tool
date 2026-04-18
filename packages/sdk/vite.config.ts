import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@observatory/shared': resolve(__dirname, '../shared/src/index.ts'),
      '@observatory/collector': resolve(__dirname, '../collector/src/index.ts'),
    },
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ObservatorySDK',
      formats: ['iife'],
      fileName: () => 'observatory-sdk.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    target: 'es2020',
    minify: false,
  },
});

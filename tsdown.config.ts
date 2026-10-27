import { defineConfig } from 'tsdown';

export default defineConfig({
  banner: '#!/usr/bin/env node',
  clean: true,
  dts: false,
  fixedExtension: false,
  entry: ['src/index.ts'],
  format: ['esm'],
  minify: false,
  outDir: 'dist',
  platform: 'node',
  target: 'node22',
});

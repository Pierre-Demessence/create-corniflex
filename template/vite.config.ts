import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const brand = JSON.parse(readFileSync(resolve(import.meta.dirname, 'brand.json'), 'utf8')) as { name: string };

export default defineConfig({
  plugins: [
    {
      name: 'inject-brand',
      transformIndexHtml: (html: string) => html.replaceAll('%APP_NAME%', () => brand.name),
    },
  ],
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json `paths`, the single source of truth.
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      exclude: ['src/**/*.test.ts', 'src/main.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
    },
  },
});

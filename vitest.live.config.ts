// `npm run test:live`: downloads real extensions from all three stores. Not part of `npm test`.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.live.ts'], environment: 'node', testTimeout: 120_000 },
});

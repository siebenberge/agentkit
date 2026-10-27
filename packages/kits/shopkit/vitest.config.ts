import { defineConfig } from 'vitest/config';

export default defineConfig({
  // components use the automatic JSX runtime (no `import React`)
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

import { defineConfig } from 'vitest/config';

// Some tests load and enrich several large PHP-versioned built-in snapshots in
// one case. This is a cold fixture setup limit, not the hot LSP query budget.
export default defineConfig({ test: {
  testTimeout: 20_000,
  projects: [
    {
      extends: true,
      test: {
        name: 'lsp',
        include: ['test/**/*.test.ts'],
        exclude: ['test/magic-modifier-stdio.test.ts'],
        sequence: { groupOrder: 1 },
      },
    },
    {
      extends: true,
      test: {
        name: 'completion-performance',
        include: ['test/magic-modifier-stdio.test.ts'],
        // Keep the existing hot-query gates after all other LSP workers finish.
        fileParallelism: false,
        sequence: { groupOrder: 2 },
      },
    },
  ],
} });

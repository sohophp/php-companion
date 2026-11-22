import { availableParallelism } from 'node:os';
import { defineConfig } from 'vitest/config';

const performanceTests = [
  'test/magic-modifier-stdio.test.ts',
  'test/semantic-provider-lifecycle-stdio.test.ts',
  'test/symfony-container-provider-concurrency-stdio.test.ts',
];

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
        exclude: performanceTests,
        maxWorkers: Math.min(8, Math.max(1, availableParallelism() - 1)),
        sequence: { groupOrder: 1 },
      },
    },
    {
      extends: true,
      test: {
        name: 'performance',
        include: performanceTests,
        // Measure cancellation and hot queries without competing cold LSP startups.
        fileParallelism: false,
        sequence: { groupOrder: 2 },
      },
    },
  ],
} });

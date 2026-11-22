import { availableParallelism } from 'node:os';
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  include: ['test/**/*.test.ts'],
  // Several files initialize the complete builtin catalogue in their first
  // test. Bound competing cold parses without changing per-test deadlines,
  // and preserve Vitest's lower default on machines with fewer CPUs.
  maxWorkers: Math.min(8, Math.max(1, availableParallelism() - 1)),
} });

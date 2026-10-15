import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['test/**/*.test.ts'],
  // These filesystem-heavy suites share a Windows temporary volume. Keep each
  // case's timeout and internal concurrency checks while isolating the files.
  fileParallelism: process.platform !== 'win32',
} });

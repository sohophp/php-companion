import { defineConfig } from 'vitest/config';

// Some tests load and enrich several large PHP-versioned built-in snapshots in
// one case. This is a cold fixture setup limit, not the hot LSP query budget.
export default defineConfig({ test: { include: ['test/**/*.test.ts'], testTimeout: 20_000 } });

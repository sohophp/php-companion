import { build, context } from 'esbuild';
import process from 'node:process';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');
const options = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode', 'web-tree-sitter'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}

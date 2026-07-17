import { build, context } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
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

async function copyRuntimeAssets() {
  await mkdir('dist', { recursive: true });
  await Promise.all([
    copyFile('node_modules/web-tree-sitter/web-tree-sitter.wasm', 'dist/web-tree-sitter.wasm'),
    copyFile('node_modules/tree-sitter-php/tree-sitter-php.wasm', 'dist/tree-sitter-php.wasm'),
  ]);
}

await copyRuntimeAssets();

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}

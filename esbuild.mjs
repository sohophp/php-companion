import { build, context } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import process from 'node:process';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');
const options = {
  entryPoints: {
    extension: 'src/extension/extension.ts',
    'language-server': 'packages/language-server/src/server.ts',
  },
  bundle: true,
  outdir: 'dist',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  define: { 'import.meta.url': '__filename' },
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

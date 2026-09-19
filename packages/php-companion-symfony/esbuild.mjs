import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import process from 'node:process';

await build({
  entryPoints: {
    extension: 'src/extension.ts',
    'service-provider': '../provider-symfony-services/src/cli.ts',
    'event-provider': '../provider-symfony-events/src/cli.ts',
    'static-route-provider': '../provider-symfony-routes/src/cli.ts',
    'winstar-route-provider': '../provider-winstar-routes/src/cli.ts',
  },
  bundle: true,
  outdir: 'dist',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  define: { 'import.meta.url': '__filename' },
  sourcemap: !process.argv.includes('--production'),
  minify: process.argv.includes('--production'),
  logLevel: 'info',
});

await mkdir('dist', { recursive: true });
await Promise.all([
  copyFile('../../node_modules/web-tree-sitter/web-tree-sitter.wasm', 'dist/web-tree-sitter.wasm'),
  copyFile('../../node_modules/tree-sitter-php/tree-sitter-php.wasm', 'dist/tree-sitter-php.wasm'),
]);

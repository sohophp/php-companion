import { build } from 'esbuild';
import process from 'node:process';

await build({
  entryPoints: {
    extension: 'src/extension.ts',
    'winstar-route-provider': '../provider-winstar-routes/src/cli.ts',
  },
  bundle: true,
  outdir: 'dist',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !process.argv.includes('--production'),
  minify: process.argv.includes('--production'),
  logLevel: 'info',
});

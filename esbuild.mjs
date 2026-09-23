import { build, context } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';
import { ENGINE_BUILD_PLACEHOLDER, finalizeReferenceEngineBuild } from './scripts/reference-engine-build.mjs';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');
const options = {
  entryPoints: {
    extension: 'src/extension/extension.ts',
    'language-server': 'packages/language-server/src/server.ts',
    candidateWorker: 'packages/language-server/src/candidateWorker.ts',
    portableCandidateSearchWorker: 'packages/language-server/src/portableCandidateSearchWorker.ts',
  },
  bundle: true,
  outdir: 'dist',
  write: false,
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  define: { 'import.meta.url': '__filename', __PHP_COMPANION_ENGINE_BUILD__: JSON.stringify(ENGINE_BUILD_PLACEHOLDER) },
  plugins: [{ name: 'reference-engine-identity', setup(builder) {
    builder.onEnd(async (result) => {
      if (result.errors.length) return;
      const assets = new Map(await Promise.all(['web-tree-sitter.wasm', 'tree-sitter-php.wasm']
        .map(async (name) => [name, await readFile(`dist/${name}`)])));
      const finalized = finalizeReferenceEngineBuild(result.outputFiles, assets);
      await Promise.all(finalized.files.map(async (file) => {
        await mkdir(dirname(file.path), { recursive: true });
        await writeFile(file.path, file.contents, { mode: file.contents[0] === 35 && file.contents[1] === 33 ? 0o755 : 0o644 });
      }));
    });
  } }],
  logLevel: 'info',
};

async function copyRuntimeAssets() {
  await mkdir('dist', { recursive: true });
  await rm('dist/winstar-route-provider.js', { force: true });
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

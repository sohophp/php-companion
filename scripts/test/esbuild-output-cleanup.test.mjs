import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { promisify } from 'node:util';

const workspace = fileURLToPath(new URL('../../', import.meta.url));
const run = promisify(execFile);
const entryNames = ['extension', 'language-server', 'candidateWorker', 'portableCandidateSearchWorker', 'sourceStatWorker', 'builtinSnapshotWorker'];
const runtimeFiles = [...entryNames.map(name => `${name}.js`), 'tree-sitter-php.wasm', 'web-tree-sitter.wasm'].sort();

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) result.push(...await files(join(directory, entry.name), `${prefix}${entry.name}/`));
    else result.push(`${prefix}${entry.name}`);
  }
  return result.sort();
}

async function project(check) {
  const root = await mkdtemp(join(tmpdir(), 'sophp-build-output-'));
  const sources = new Map();
  try {
    await copyFile(join(workspace, 'esbuild.mjs'), join(root, 'esbuild.mjs'));
    await mkdir(join(root, 'scripts'));
    await copyFile(join(workspace, 'scripts/reference-engine-build.mjs'), join(root, 'scripts/reference-engine-build.mjs'));
    await symlink(resolve(workspace, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    for (const name of entryNames) {
      const path = name === 'extension' ? 'src/extension/extension.ts' : `packages/language-server/src/${name === 'language-server' ? 'server' : name}.ts`;
      const text = `export const entry = ${JSON.stringify(name)}; export const engineBuild = __PHP_COMPANION_ENGINE_BUILD__;\n`;
      const destination = join(root, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, text);
      sources.set(destination, text);
    }
    await mkdir(join(root, 'dist/node_modules/web-tree-sitter'), { recursive: true });
    await writeFile(join(root, 'dist/node_modules/web-tree-sitter/index.js'), 'stale SDK output\n');
    await writeFile(join(root, 'dist/winstar-route-provider.js'), 'stale provider output\n');
    for (const name of entryNames) await writeFile(join(root, `dist/${name}.js.map`), 'stale source map\n');
    await check(root);
    for (const [path, text] of sources) assert.equal(await readFile(path, 'utf8'), text);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function build(root, production) {
  await run(process.execPath, [join(root, 'esbuild.mjs'), ...(production ? ['--production'] : [])], {
    cwd: root, timeout: 20_000, maxBuffer: 1024 * 1024,
  });
  const expected = [...runtimeFiles, ...(production ? [] : entryNames.map(name => `${name}.js.map`))].sort();
  assert.deepEqual(await files(join(root, 'dist')), expected);
  const server = await readFile(join(root, 'dist/language-server.js'), 'utf8');
  assert.doesNotMatch(server, /PHP_COMPANION_ENGINE_BUILD_PLACEHOLDER/);
  assert.match(server, /[a-f0-9]{64}/);
  for (const [source, output] of [['web-tree-sitter', 'web-tree-sitter.wasm'], ['tree-sitter-php', 'tree-sitter-php.wasm']]) {
    assert.deepEqual(await readFile(join(root, 'dist', output)), await readFile(join(root, 'node_modules', source, output)));
  }
}

test('production build removes stale maps and nested SDK output while preserving runtime assets and sources', { timeout: 30_000 }, async () => {
  await project(root => build(root, true));
});

test('development then production rebuild keeps only the files belonging to each build mode', { timeout: 30_000 }, async () => {
  await project(async root => {
    await build(root, false);
    await build(root, true);
  });
});

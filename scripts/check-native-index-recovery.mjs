import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { indexComposerSources } from '../packages/index/dist/index.js';

const root = await mkdtemp(join(tmpdir(), 'sophp-native-index-recovery-'));
const directory = join(root, 'cache with spaces');
const phases = [];
let parsed = []; let restored = [];
const options = {
  cache: { directory, version: 'native-recovery-v1', restore(payload, source) {
    assert.equal(payload.hash, source.hash);
    restored.push(source.path);
    return true;
  } },
  onSource(source) { parsed.push(source.path); return { hash: source.hash }; },
};
async function load(name, expectedCached, expectedParsed, expectedRestored) {
  parsed = []; restored = [];
  const result = await indexComposerSources(root, options);
  assert.equal(result.files, 2, name); assert.equal(result.complete, true, name);
  assert.equal(result.cached, expectedCached, name);
  assert.deepEqual(parsed.sort(), expectedParsed.slice().sort(), name);
  assert.deepEqual(restored.sort(), expectedRestored.slice().sort(), name);
  phases.push({ name, cached: result.cached, parsed: parsed.length, warnings: result.warnings });
  return result;
}
try {
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const a = join(root, 'src', 'A.php'); const b = join(root, 'src', 'B.php');
  await writeFile(a, '<?php namespace App; class Alpha {}');
  await writeFile(b, '<?php namespace App; class Beta {}');
  await load('cold', 0, [a, b], []);
  await load('warm', 2, [], [a, b]);
  const cacheFiles = await readdir(directory);
  assert.equal(cacheFiles.length, 1);
  const cacheFile = join(directory, cacheFiles[0]);
  const original = JSON.parse(await readFile(cacheFile, 'utf8'));
  await writeFile(cacheFile, '{broken');
  const damaged = await load('corrupt manifest rebuild', 0, [a, b], []);
  assert.ok(damaged.warnings.includes('Persistent index cache was unreadable and will be rebuilt.'));
  await load('warm after manifest recovery', 2, [], [a, b]);
  const partial = JSON.parse(JSON.stringify(original)); partial.entries[a].hash = 'invalid';
  await writeFile(cacheFile, JSON.stringify(partial));
  await load('isolated corrupt entry', 1, [a], [b]);
  await load('warm after entry recovery', 2, [], [a, b]);
  await writeFile(a, '<?php namespace App; class Omega {}');
  await load('changed source invalidation', 1, [a], [b]);
  await load('warm after source update', 2, [], [a, b]);
  process.stdout.write(JSON.stringify({ platform: process.platform, node: process.version, phases,
    scope: 'Native persistent source index; does not exercise LSP or editor UI' }, null, 2) + '\n');
} finally { await rm(root, { recursive: true, force: true }); }

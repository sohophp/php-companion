import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ReferenceResultStore, type ReferenceResultProof } from '../src/referenceResultStore.js';

describe('persistent reference result store', () => {
  let root: string; let store: ReferenceResultStore; let proof: ReferenceResultProof;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-reference-store-')); store = new ReferenceResultStore(root);
    proof = { schema: 1, key: 'a'.repeat(64), environment: 'b'.repeat(64), sourceRoots: ['/src'], additionalFiles: [],
      context: 'context', loaded: [{ uri: 'file:///src/A.php', hash: 'c'.repeat(64) }], fingerprint: 'd'.repeat(64),
      locations: [{ uri: 'file:///src/A.php', range: { start: { line: 1, character: 3 }, end: { line: 1, character: 6 } } }] };
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('round trips exact locations and refuses corrupt, truncated or mismatched artifacts', async () => {
    expect(await store.write(proof, () => true)).toBe(true);
    expect(await store.read(proof.key)).toEqual(proof);
    const path = join(root, 'reference-results-v1', `${proof.key}.json`); const original = await readFile(path, 'utf8');
    await writeFile(path, original.replace('file:///src/A.php', 'file:///src/B.php'));
    expect(await store.read(proof.key)).toBeUndefined();
    await writeFile(path, original.slice(0, -3)); expect(await store.read(proof.key)).toBeUndefined();
    await writeFile(join(root, 'reference-results-v1', `${'e'.repeat(64)}.json`), original);
    expect(await store.read('e'.repeat(64))).toBeUndefined();
    expect(await store.read('../outside')).toBeUndefined();
  });

  it('preserves the last good result when a write is cancelled and rejects invalid locations', async () => {
    await store.write(proof, () => true);
    let checks = 0;
    expect(await store.write({ ...proof, locations: [] }, () => ++checks === 1)).toBe(false);
    expect(await store.read(proof.key)).toEqual(proof);
    expect(await readdir(join(root, 'reference-results-v1'))).toEqual([`${proof.key}.json`]);
    proof.locations[0]!.range.end.character = 1;
    expect(await store.write(proof, () => true)).toBe(false);
  });

  it('only exposes authenticated bounded query hints for prewarming', async () => {
    proof.queryHint = { uri: 'file:///src/A.php', names: ['get', 'dispatch'], mode: 'symbol', deferBodies: true };
    expect(await store.write(proof, () => true)).toBe(true);
    expect(await store.recent()).toEqual([proof]);
    expect(await store.write({ ...proof, queryHint: { ...proof.queryHint, names: ['../outside'] } }, () => true)).toBe(false);
    expect(await store.recent()).toEqual([proof]);
  });

  it('authenticates bounded framework input roots and timestamp-sensitive proofs', async () => {
    proof.scopedSourceRoots = [{ path: '/workspace/config', extensions: ['.php', '.yaml', '.xml'] }];
    proof.includeFileStamps = true;
    expect(await store.write(proof, () => true)).toBe(true);
    expect(await store.read(proof.key)).toEqual(proof);
    expect(await store.write({ ...proof, scopedSourceRoots: [{ path: '/workspace/config', extensions: ['xml'] }] }, () => true)).toBe(false);
    expect(await store.read(proof.key)).toEqual(proof);
  });
});

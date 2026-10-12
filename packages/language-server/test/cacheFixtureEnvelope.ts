import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Test fixtures use this envelope adapter. Existing
// decompression, corruption, cache counts and protocol assertions stay intact.
// All payload mutations remain inside schema 2 with matching immutable blobs;
// corruption therefore reaches the original semantic validation boundary.
type Entry = Record<string, unknown>;
type Manifest = { schema: number; generation?: string; entries: Record<string, Entry> };
const envelopes = new WeakMap<Manifest, { generation: string }>();
const digest = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export async function readCacheFixture(path: string): Promise<Manifest> {
  const manifest = JSON.parse(await readFile(path, 'utf8')) as Manifest;
  if (manifest.schema !== 2) return manifest;
  assert.equal(typeof manifest.generation, 'string');
  const generation = manifest.generation!;
  for (const entry of Object.values(manifest.entries)) {
    assert.equal(Object.hasOwn(entry, 'payload'), false);
    assert.match(String(entry.payloadHash), /^[a-f0-9]{64}$/u);
    const bytes = await readFile(join(path + '.entries', generation, String(entry.payloadHash) + '.json'));
    assert.equal(bytes.length, entry.payloadBytes);
    assert.equal(digest(bytes), entry.payloadHash);
    entry.payload = JSON.parse(bytes.toString('utf8'));
  }
  envelopes.set(manifest, { generation });
  return manifest;
}

export async function writeCacheFixture(path: string, manifest: Manifest): Promise<void> {
  const envelope = envelopes.get(manifest);
  if (!envelope) { await writeFile(path, JSON.stringify(manifest)); return; }
  const encoded = structuredClone(manifest);
  assert.equal(encoded.schema, 2);
  assert.equal(encoded.generation, envelope.generation);
  for (const entry of Object.values(encoded.entries)) {
    const bytes = JSON.stringify(entry.payload);
    const hash = digest(bytes);
    const blob = join(path + '.entries', envelope.generation, hash + '.json');
    try { await writeFile(blob, bytes, { flag: 'wx' }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      assert.equal(await readFile(blob, 'utf8'), bytes);
    }
    entry.payloadHash = hash;
    entry.payloadBytes = Buffer.byteLength(bytes);
    delete entry.payload;
  }
  await writeFile(path, JSON.stringify(encoded));
}

import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { SourceStatBatches } from '../src/sourceStatBatches.js';

let root: string | undefined;
afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });

it('returns filesystem stamps and promptly rejects pending inspections after cancellation', async () => {
  root = await mkdtemp(join(tmpdir(), 'sophp-stat-cancel-'));
  const path = join(root, 'Source.php');
  await writeFile(path, '<?php');
  let live = true;
  const batches = new SourceStatBatches(() => live, resolve('dist/sourceStatWorker.js'));
  try {
    const expected = await stat(path);
    expect(await batches.inspect(path)).toEqual({ size: expected.size, mtimeMs: expected.mtimeMs, ctimeMs: expected.ctimeMs });
    const pending = batches.inspect(path);
    const rejected = expect(pending).rejects.toThrow('Source metadata worker failed.');
    live = false;
    await expect(batches.inspect(path)).rejects.toThrow('Source metadata worker failed.');
    await rejected;
  } finally { batches.close(); }
});

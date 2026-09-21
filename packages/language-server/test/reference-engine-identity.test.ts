import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { captureReferenceEngineIdentity, type ReferenceEngineInputs } from '../src/referenceEngineIdentity.js';

describe('reference engine identity', () => {
  let root: string; let inputs: ReferenceEngineInputs;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-engine-'));
    inputs = { buildId: 'a'.repeat(64), serverPath: join(root, 'server.js'), workerPath: join(root, 'worker.js'),
      coreWasmPath: join(root, 'core.wasm'), phpWasmPath: join(root, 'php.wasm'), runtime: 'runtime-one' };
    await Promise.all([inputs.serverPath, inputs.workerPath, inputs.coreWasmPath, inputs.phpWasmPath]
      .map((path) => writeFile(path, `initial:${path}`)));
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('is stable for unchanged engine inputs and changes for each executable or parser asset', async () => {
    const first = await captureReferenceEngineIdentity(inputs); expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(await captureReferenceEngineIdentity(inputs)).toBe(first);
    for (const path of [inputs.serverPath, inputs.workerPath, inputs.coreWasmPath, inputs.phpWasmPath]) {
      await writeFile(path, `changed:${path}`);
      expect(await captureReferenceEngineIdentity(inputs), path).not.toBe(first);
      await writeFile(path, `initial:${path}`);
      expect(await captureReferenceEngineIdentity(inputs)).toBe(first);
    }
    expect(await captureReferenceEngineIdentity({ ...inputs, buildId: 'b'.repeat(64) })).not.toBe(first);
    expect(await captureReferenceEngineIdentity({ ...inputs, runtime: 'runtime-two' })).not.toBe(first);
    expect(await captureReferenceEngineIdentity({ ...inputs, coreWasmPath: inputs.phpWasmPath, phpWasmPath: inputs.coreWasmPath })).not.toBe(first);
  });

  it('refuses unbundled identities, missing assets and ambiguous input roles', async () => {
    expect(await captureReferenceEngineIdentity({ ...inputs, buildId: undefined })).toBeUndefined();
    expect(await captureReferenceEngineIdentity({ ...inputs, buildId: 'placeholder' })).toBeUndefined();
    expect(await captureReferenceEngineIdentity({ ...inputs, workerPath: inputs.serverPath })).toBeUndefined();
    await rm(inputs.phpWasmPath);
    expect(await captureReferenceEngineIdentity(inputs)).toBeUndefined();
  });
});

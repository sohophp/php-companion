import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';

async function benchmark(fault?: 'cold-time' | 'cache-byte', missingWasm?: 'core' | 'php', files = 1000): Promise<{ code: number; stdout: string; stderr: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'sophp-persistence-gate-test-'));
  const temporary = join(directory, 'temporary');
  await mkdir(temporary);
  const script = resolve(process.env.SOPHP_PRIVATE_PERSISTENCE_TEST_SCRIPT ?? 'scripts/benchmark-persistent-index.mjs');
  const args = fault ? ['--import', pathToFileURL(resolve('test/fixtures/benchmark-persistence/budget-control.mjs')).href] : [];
  const wasmArgs = missingWasm ? [
    missingWasm === 'core' ? join(directory, 'missing-core.wasm') : resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm'),
    join(directory, 'missing-php.wasm'),
  ] : [];
  try {
    const result = await new Promise<{ code: number; stdout: string; stderr: string }>((done, reject) => {
      execFile(process.execPath, [...args, script, String(files), ...wasmArgs], {
        cwd: resolve('.'), timeout: 45_000, maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, TMPDIR: temporary, TEMP: temporary, TMP: temporary,
          SOPHP_PRIVATE_PERSISTENCE_BUDGET_TARGET: pathToFileURL(script).href,
          SOPHP_PRIVATE_PERSISTENCE_BUDGET_FAULT: fault },
      }, (error, stdout, stderr) => {
        if (error && (error.killed || typeof error.code !== 'number')) reject(error);
        else done({ code: error?.code as number ?? 0, stdout, stderr });
      });
    });
    expect(await readdir(temporary)).toEqual([]);
    return result;
  } finally { await rm(directory, { recursive: true, force: true }); }
}

it('rejects a measured cold-index budget breach after the complete four-load workload', async () => {
  const result = await benchmark('cold-time');
  expect(result.code).toBe(1);
  expect(result.stderr).toBe('');
  const report = JSON.parse(result.stdout);
  expect(report.cold.durationMs).toBeGreaterThan(8000);
  expect(report.coldIndexBudget).toEqual({ milliseconds: 8000, passed: false });
  expect(report.loadMemory.processRssBudgetPassed).toBe(true);
  expect(report.exactness.corruptLayerReparsedFiles).toBe(1);
  expect(report.exactness.corruptCallableReparsedFiles).toBe(1);
}, 60_000);

it('rejects one byte above the exact warm-cache budget despite rounded MiB reporting', async () => {
  const result = await benchmark('cache-byte');
  expect(result.code).toBe(1);
  expect(result.stderr).toContain('Warm cache exceeded its frozen budget: 67108865 bytes > 67108864 bytes.');
}, 60_000);

it('accepts the ordinary four-load persistence workload with the original budgets', async () => {
  const result = await benchmark();
  expect(result.code).toBe(0);
  expect(result.stderr).toBe('');
  const report = JSON.parse(result.stdout);
  expect(report.coldIndexBudget).toEqual({ milliseconds: 8000, passed: true });
  expect(report.cache.warm.bytes).toBeLessThanOrEqual(64 * 1024 * 1024);
  expect(report.loadMemory.processRssBudgetPassed).toBe(true);
  expect(report.exactness.callableFactsRestored).toBe(3);
  expect(report.exactness.derivedFactInvalidated).toBe(true);
  expect(report.exactness.corruptLayerReparsedFiles).toBe(1);
  expect(report.exactness.corruptCallableReparsedFiles).toBe(1);
}, 60_000);


it.each(['core', 'php'] as const)('cleans the temporary project when %s WASM initialization fails', async (missingWasm) => {
  const result = await benchmark(undefined, missingWasm);
  expect(result.code).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain(`missing-${missingWasm}.wasm`);
}, 60_000);


it('rejects four files before creating a project because the focused query needs a deferred file', async () => {
  const result = await benchmark(undefined, undefined, 4);
  expect(result.code).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('files >= 5; four dependency files plus one deferred file');
  expect(result.stderr).not.toContain('Focused query loaded an invalid implementation set');
}, 60_000);

it('accepts five files with all dependency and deferred-loading assertions intact', async () => {
  const result = await benchmark(undefined, undefined, 5);
  expect(result.code).toBe(0);
  expect(result.stderr).toBe('');
  const report = JSON.parse(result.stdout);
  expect(report.files).toBe(5);
  expect(report.exactness.implementationsLoadedByQuery).toBeLessThan(5);
  expect(report.exactness.deferredImplementations).toBe(5);
  expect(report.exactness.corruptLayerReparsedFiles).toBe(1);
  expect(report.exactness.corruptCallableReparsedFiles).toBe(1);
  expect(report.coldIndexBudget).toEqual({ milliseconds: null, passed: null });
}, 60_000);

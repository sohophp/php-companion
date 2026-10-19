import assert from 'node:assert/strict';
import cp from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { attachProductionResponseGate, type ProductionResponseGate } from '../support/productionResponseGate';
import type { InstalledProfileInput } from '../support/installedProfile';

export async function run(): Promise<void> {
  const inputPath = process.env.PHP_COMPANION_TEST_INSTALLED_INPUT; assert.ok(inputPath);
  const input = JSON.parse(readFileSync(inputPath, 'utf8')) as InstalledProfileInput;
  const bootstrapPath = process.env.PHP_COMPANION_TEST_INSTALLED_BOOTSTRAP; assert.ok(bootstrapPath);
  const bootstrap = JSON.parse(readFileSync(bootstrapPath, 'utf8')) as { hidden: string; composer: string; sha256: string };
  const proofPath = process.env.PHP_COMPANION_TEST_INSTALLED_PROOF; assert.ok(proofPath);
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core);
  assert.equal(core.isActive, false, 'Install the observer before PHP workspace activation');
  const gateInstances: ProductionResponseGate[] = [];
  const originalFork = cp.fork;
  const fork = ((...args: Parameters<typeof cp.fork>): ReturnType<typeof cp.fork> => {
    const child = originalFork(...args);
    if (args[0] === join(core.extensionPath, 'dist', 'language-server.js'))
      gateInstances.push(attachProductionResponseGate(child));
    return child;
  }) as typeof cp.fork;
  cp.fork = fork;
  const hash = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');
  assert.equal(hash(bootstrap.hidden), bootstrap.sha256);
  renameSync(bootstrap.hidden, bootstrap.composer); assert.equal(hash(bootstrap.composer), bootstrap.sha256);
  try {
    // The original complete entry, ordering, case count, timeouts and budgets stay intact.
    await (await import('./index')).run();
    assert.equal(gateInstances.length, 1);
    const gate = gateInstances[0].snapshot();
    assert.equal(gate.initializations.length, 1); assert.equal(gate.initializations[0].testMode, false);
    assert.equal(gate.backendGuardRejections, 1);
    assert.equal(gate.held, null); assert.equal(gate.reserved, undefined); assert.equal(gate.armed, false);
    assert.equal(gate.backendExit, null); assert.deepEqual(gate.transportErrors, []);
    const held = gate.events.filter(event => event.kind === 'hold-real-response');
    const released = gate.events.filter(event => event.kind === 'release-real-response');
    assert.equal(held.length, 1); assert.equal(released.length, 1); assert.equal(held[0].sha256, released[0].sha256);
    assert.ok(gate.events.some(event => event.kind === 'backend-version-confirmed'
      && event.version === 2 && event.uri?.endsWith('/ProfileLargeShapeConsumer.php')));
    const commands = await vscode.commands.getCommands(true);
    assert.ok(!commands.includes('phpCompanion._testLanguageServerLifecycle'));
    assert.ok(!commands.includes('phpCompanion._testCrashLanguageServer'));
    for (const expected of input.extensions) {
      const actual = vscode.extensions.getExtension(expected.id); assert.ok(actual);
      assert.equal(actual.extensionPath, expected.path); assert.equal(actual.packageJSON.version, expected.version);
    }
    for (const [path, sha256] of Object.entries(input.fileHashes)) assert.equal(hash(path), sha256, path);
    writeFileSync(proofPath, JSON.stringify({ status: 'passed', originalCompleteSuiteRetained: true,
      serverTestMode: false, gate, installed: input.extensions, productFilesChecked: input.productFilesChecked,
      installedFilesChecked: Object.keys(input.fileHashes).length, candidateCommit: input.candidateCommit }, null, 2) + '\n');
  } finally { cp.fork = originalFork; }
}

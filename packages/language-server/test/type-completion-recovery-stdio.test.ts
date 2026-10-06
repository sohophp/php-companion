import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const scenarios = (['7.2', '8.5'] as const).flatMap(phpVersion =>
  (['onDemand', 'progressive'] as const).flatMap(indexingMode =>
    (['successive', 'cancel', 'edit', 'delete', 'deadline'] as const).map(action => ({ phpVersion, indexingMode, action }))));

it.each(scenarios)('recovers type candidates safely after $action PHP $phpVersion $indexingMode', async ({ phpVersion, indexingMode, action }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-type-recovery-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    await mkdir(join(root, 'src')); await mkdir(join(root, 'lib'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/', 'Domain\\': 'lib/' } } }));
    const originalPath = join(root, 'lib', 'InventoryOriginal.php');
    await writeFile(originalPath, '<?php namespace Domain; class InventoryOriginal {}');
    await writeFile(join(root, 'lib', 'ElseCreated.php'), '<?php namespace Domain; class ElseCreated {}');
    const path = join(root, 'src', 'Consumer.php'), uri = pathToFileURL(path).toString();
    const source = '<?php namespace App; use Domain\\Inv;';
    await writeFile(path, source);
    server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
    const rpc = client(server);
    await rpc.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion, indexingMode, testMode: true } });
    rpc.notify('initialized', {});
    rpc.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text: source } });
    await rpc.wait(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri);
    const completion = (text = source): { id: number; response: Promise<any> } => rpc.start('textDocument/completion', {
      textDocument: { uri }, position: { line: 0, character: text.length - 1 },
    });
    const arm = async (): Promise<void> => { expect(await rpc.request('phpCompanion/testPauseNextQuery', { method: 'typeCompletionCandidates' })).toBe(true); };
    const release = async (): Promise<void> => { expect(await rpc.request('phpCompanion/testReleaseQuery', { method: 'typeCompletionCandidates' })).toBe(true); };
    const pause = async (): Promise<void> => {
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        const value = await rpc.request('phpCompanion/testQueryState', { method: 'typeCompletionCandidates', uri });
        if (value.paused) return;
        await new Promise<void>(done => setTimeout(done, 10));
      }
      throw new Error('Type search did not pause.');
    };
    const changed = async (name: string, remove = false): Promise<void> => {
      const changedPath = join(root, 'lib', `${name}.php`), changedUri = pathToFileURL(changedPath).toString();
      if (remove) await rm(changedPath);
      else await writeFile(changedPath, `<?php namespace Domain; class ${name} {}`);
      rpc.notify('workspace/didChangeWatchedFiles', { changes: [{ uri: changedUri, type: remove ? 3 : 1 }] });
      await rpc.wait(message => message.method === 'window/logMessage'
        && message.params?.message?.includes(`[index:delta] complete uri=${changedUri}`));
    };
    const labels = (message: any): string[] => {
      expect(message.error).toBeUndefined();
      return (Array.isArray(message.result) ? message.result : message.result.items).map((item: any) => item.label);
    };
    await arm(); const pending = completion();
    // Attach an observer before any assertion so a setup error cannot leave an
    // unhandled outstanding request during process cleanup.
    void pending.response.catch(() => undefined);
    await pause(); await changed('InventoryAdded1'); await arm(); await release(); await pause();
    if (action === 'cancel' || action === 'edit') {
      if (action === 'cancel') rpc.notify('$/cancelRequest', { id: pending.id });
      else rpc.notify('textDocument/didChange', { textDocument: { uri, version: 2 },
        contentChanges: [{ text: source.replace('Inv;', 'Else;') }] });
      // A subsequent request observes the version/cancellation notification
      // before the held candidate search is released.
      const state = await rpc.request('phpCompanion/testQueryState', { method: 'typeCompletionCandidates', uri });
      expect(state.version).toBe(action === 'edit' ? 2 : 1);
      await changed('InventoryAdded2'); await release();
      const result = await pending.response;
      if (result.error) expect(result.error.code).toBe(-32800);
      else expect(labels(result)).toEqual([]);
      if (action === 'edit') expect(labels(await completion(source.replace('Inv;', 'Else;')).response)).toContain('ElseCreated');
      else expect(labels(await completion().response)).toContain('InventoryAdded2');
    } else if (action === 'deadline') {
      // Exhaust the recovery window while the second search is held, then
      // invalidate it. The current request must terminate rather than retry.
      await new Promise<void>(done => setTimeout(done, 1_100));
      await changed('InventoryAdded2'); const started = performance.now(); await release();
      expect(labels(await pending.response)).toEqual([]);
      expect(performance.now() - started).toBeLessThan(2_000);
      expect(labels(await completion().response)).toContain('InventoryAdded2');
    } else {
      await changed(action === 'delete' ? 'InventoryOriginal' : 'InventoryAdded2', action === 'delete');
      if (action === 'successive') { await arm(); await release(); await pause(); await changed('InventoryAdded3'); }
      await release(); const result = labels(await pending.response);
      expect(result).toContain('InventoryAdded1');
      if (action === 'delete') expect(result).not.toContain('InventoryOriginal');
      else expect(result).toEqual(expect.arrayContaining(['InventoryAdded2', 'InventoryAdded3', 'InventoryOriginal']));
    }
    expect(await readFile(path, 'utf8')).toBe(source);
    await rpc.request('shutdown', null); const exited = once(server, 'exit'); rpc.notify('exit', null);
    expect((await exited)[0]).toBe(0); server = undefined;
  } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
}, 20_000);

function client(server: ChildProcessWithoutNullStreams): {
  notify: (method: string, params: unknown) => void;
  start: (method: string, params: unknown) => { id: number; response: Promise<any> };
  request: (method: string, params: unknown) => Promise<any>;
  wait: (predicate: (message: any) => boolean) => Promise<any>;
} {
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let sequence = 0;
  server.stdout.on('data', (chunk: Buffer) => {
    for (const raw of decoder.push(chunk)) {
      const message = raw as any;
      if (message.method && message.id !== undefined) { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id: message.id, result: null })); continue; }
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.predicate(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  const wait = (predicate: (message: any) => boolean): Promise<any> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((resolveResponse, reject) => {
      const waiter = { predicate, resolve: (message: any): void => { clearTimeout(timer); resolveResponse(message); } };
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('No LSP response: ' + JSON.stringify(messages.slice(-5)))); }, 10_000);
      waiters.push(waiter);
    });
  };
  const start = (method: string, params: unknown): { id: number; response: Promise<any> } => {
    const id = ++sequence, response = wait(message => message.id === id);
    server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params })); return { id, response };
  };
  return { wait, start, notify: (method, params): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params })); },
    request: async (method, params): Promise<any> => { const message = await start(method, params).response; expect(message.error).toBeUndefined(); return message.result; } };
}

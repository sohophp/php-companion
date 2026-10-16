import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'experimental', 'progressive']
  .map(indexingMode => ({ phpVersion, indexingMode })));

it.each(cases)('cancels editing queries while preserving a held close and another waiter at PHP $phpVersion/$indexingMode',
  async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-close-cancel-'));
    await mkdir(join(root, 'src')); await mkdir(join(root, 'gates'));
    const closing = join(root, 'src/Closed.php'), caller = join(root, 'src/Caller.php');
    const disk = '<?php namespace App; class Closed { public function restored(): int { return 1; } }';
    const buffer = disk.replaceAll('restored', 'pending');
    const source = '<?php namespace App; function invoke(Closed $item): void { $item->pending(); $item->restored(); }';
    await writeFile(closing, disk); await writeFile(caller, source);
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    const uri = pathToFileURL(caller).href, closingUri = pathToFileURL(closing).href;
    const classPosition = { line: 0, character: source.indexOf('Closed') + 2 };
    const completionPosition = { line: 0, character: source.indexOf('->') + 2 };
    const runtime = process.env.PHP_COMPANION_TEST_CANONICAL_SERVER ?? resolve('dist/server.js');
    const child = spawn(process.execPath, ['--import', pathToFileURL(resolve('test/helpers/close-read-gate.mjs')).href,
      runtime, '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'),
      '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe',
      env: { ...process.env, SOPHP_CLOSE_WAIT_GATES: join(root, 'gates'), SOPHP_CLOSE_WAIT_SOURCE: closing } });
    const closed = once(child, 'close'), decoder = new LspMessageDecoder(), messages: any[] = [];
    const waiters: Array<{ predicate: (message: any) => boolean; done: (message: any) => void; timer: ReturnType<typeof setTimeout> }> = [];
    let sequence = 0, stderr = '';
    const send = (value: object): void => { child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...value })); };
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.stdout.on('data', chunk => {
      for (const message of decoder.push(chunk) as any[]) {
        message.receivedAtMs = performance.now(); messages.push(message);
        if (message.method && message.id !== undefined) send({ id: message.id, result: null });
        for (const waiter of [...waiters]) if (waiter.predicate(message)) {
          clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
        }
      }
    });
    const wait = (predicate: (message: any) => boolean): Promise<any> => {
      const found = messages.find(predicate); if (found) return Promise.resolve(found);
      return new Promise((done, reject) => {
        const waiter = { predicate, done, timer: setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1); reject(Error(`Close-wait response timed out: ${stderr}`));
        }, 15_000) }; waiters.push(waiter);
      });
    };
    const begin = (method: string, params: unknown): { id: number; response: Promise<any> } => {
      const id = ++sequence, response = wait(message => message.id === id && !message.method);
      send({ id, method, params }); return { id, response };
    };
    const request = async (method: string, params: unknown): Promise<any> => {
      const message = await begin(method, params).response; expect(message.error).toBeUndefined(); return message.result;
    };
    const notify = (method: string, params: unknown): void => send({ method, params });
    try {
      await request('initialize', { processId: null, rootUri: pathToFileURL(root).href, capabilities: {},
        initializationOptions: { phpVersion, indexingMode, versionedDiagnostics: true, cacheDirectory: join(root, '.cache') } });
      notify('initialized', {});
      if (indexingMode !== 'onDemand') await wait(message => message.method === 'window/logMessage'
        && /^\[index:\d+\] end /.test(message.params.message));
      for (const [openedUri, text] of [[closingUri, buffer], [uri, source]]) {
        notify('textDocument/didOpen', { textDocument: { uri: openedUri, languageId: 'php', version: 1, text } });
        await wait(message => message.method === 'phpCompanion/versionedDiagnostics'
          && message.params.uri === openedUri && message.params.version === 1);
      }
      const before = await request('textDocument/completion', { textDocument: { uri }, position: completionPosition });
      expect((Array.isArray(before) ? before : before.items).some((item: any) => item.label === 'pending')).toBe(true);
      const variables = await request('textDocument/completion', { textDocument: { uri },
        position: { line: 0, character: source.indexOf('$item->') + 3 } });
      const variableItem = (Array.isArray(variables) ? variables : variables.items).find((item: any) => item.label === '$item');
      expect(variableItem?.data?.kind).toBe('variable-detail');
      const unresolved = { ...variableItem }; delete unresolved.detail;
      await writeFile(join(root, 'gates/active'), '');
      notify('textDocument/didClose', { textDocument: { uri: closingUri } });
      const deadline = Date.now() + 10_000;
      while (!await access(join(root, 'gates/read-1.paused')).then(() => true, () => false)) {
        expect(Date.now(), 'close read did not reach the controlled disk gate').toBeLessThan(deadline);
        await new Promise(done => setTimeout(done, 5));
      }
      const queryParams = { textDocument: { uri }, position: classPosition };
      const specifications = [
        { method: 'textDocument/hover', params: queryParams, expected: null },
        { method: 'textDocument/completion', params: queryParams, expected: [] },
        { method: 'textDocument/definition', params: queryParams, expected: [] },
        { method: 'textDocument/typeDefinition', params: queryParams, expected: [] },
        { method: 'textDocument/implementation', params: queryParams, expected: [] },
        { method: 'textDocument/signatureHelp', params: { textDocument: { uri },
          position: { line: 0, character: source.indexOf('pending(') + 'pending('.length } }, expected: null },
        { method: 'completionItem/resolve', params: variableItem, expected: unresolved },
      ];
      const cancelled = specifications.map(specification => ({ ...specification,
        ...begin(specification.method, specification.params) }));
      const survivor = begin('textDocument/completion', { textDocument: { uri }, position: completionPosition });
      // This independent standard JSON-RPC error confirms that the server is
      // processing messages while the real disk read remains held.
      const barrier = await begin('sophp-close-cancel/barrier', {}).response;
      expect(barrier.error?.code).toBe(-32601);
      expect(messages.some(message => [...cancelled, survivor].some(query => query.id === message.id) && !message.method)).toBe(false);
      const cancelledAt = performance.now();
      for (const query of cancelled) notify('$/cancelRequest', { id: query.id });
      let budgetTimer: ReturnType<typeof setTimeout> | undefined;
      const allCancelled = Promise.all(cancelled.map(query => query.response));
      const early = await Promise.race([allCancelled, new Promise<undefined>(done => { budgetTimer = setTimeout(() => done(undefined), 100); })]);
      clearTimeout(budgetTimer);
      const survivorBeforeRelease = messages.some(message => message.id === survivor.id && !message.method);
      const releasedAt = performance.now();
      await writeFile(join(root, 'gates/release-all'), '');
      const [responses, survivorResponse] = await Promise.all([allCancelled, survivor.response]);
      const observations = responses.map((response, index) => ({ method: specifications[index]!.method,
        elapsedMs: response.receivedAtMs - cancelledAt, beforeReadRelease: response.receivedAtMs < releasedAt }));
      for (const response of [...responses, survivorResponse]) expect(response.error).toBeUndefined();
      for (const [index, response] of responses.entries()) expect(response.result).toEqual(specifications[index]!.expected);
      const restored = Array.isArray(survivorResponse.result) ? survivorResponse.result : survivorResponse.result.items;
      expect(restored.some((item: any) => item.label === 'restored')).toBe(true);
      expect(restored.some((item: any) => item.label === 'pending')).toBe(false);
      expect(await readFile(closing, 'utf8')).toBe(disk); expect(await readFile(caller, 'utf8')).toBe(source);
      await request('shutdown', null); notify('exit', null); await closed;
      expect(child.exitCode).toBe(0); expect(stderr).toBe('');
      process.stdout.write(JSON.stringify({ case: 'close-wait-cancellation', phpVersion, indexingMode, observations,
        survivorBeforeRelease, survivorRestoredDiskMembers: true }) + '\n');
      expect(early, 'cancelled queries must return while the shared close is still held').not.toBeUndefined();
      for (const observation of observations) {
        expect(observation.elapsedMs).toBeLessThanOrEqual(100); expect(observation.beforeReadRelease).toBe(true);
      }
      expect(survivorBeforeRelease).toBe(false);
    } finally {
      await writeFile(join(root, 'gates/release-all'), '').catch(() => {});
      if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed; }
      for (const waiter of waiters) clearTimeout(waiter.timer);
      await rm(root, { recursive: true, force: true });
    }
  });

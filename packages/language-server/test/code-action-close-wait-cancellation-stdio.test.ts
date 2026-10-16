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

it.each(cases)('cancels code actions while preserving a held close, an action waiter and disk hierarchy at PHP $phpVersion/$indexingMode',
  async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-code-action-close-cancel-'));
    await mkdir(join(root, 'src')); await mkdir(join(root, 'gates'));
    const closing = join(root, 'src/Closed.php'), caller = join(root, 'src/Caller.php');
    const disk = '<?php namespace App; class Closed extends DiskBase {}';
    const buffer = disk.replace('DiskBase', 'BufferBase');
    const source = '<?php namespace App; class DiskBase {} class BufferBase {} class Derived extends Closed {}';
    await writeFile(closing, disk); await writeFile(caller, source);
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    const uri = pathToFileURL(caller).href, closingUri = pathToFileURL(closing).href;
    const hierarchyPosition = { line: 0, character: source.indexOf('class Derived') + 'class '.length + 2 };
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
      const prepared = await request('textDocument/prepareTypeHierarchy', { textDocument: { uri: closingUri },
        position: { line: 0, character: buffer.indexOf('class Closed') + 'class '.length + 2 } });
      expect(prepared).toHaveLength(1); const item = prepared[0]; expect(item.name).toBe('Closed');
      expect(item.uri).toBe(closingUri); expect(item.data).toEqual({ fqcn: 'App\\Closed' });
      const beforeParents = await request('typeHierarchy/supertypes', { item });
      expect(beforeParents.map((parent: any) => parent.name)).toEqual(['BufferBase']);
      const beforeChildren = await request('typeHierarchy/subtypes', { item });
      expect(beforeChildren.map((child: any) => child.name)).toEqual(['Derived']);
      const callerPrepared = await request('textDocument/prepareTypeHierarchy', {
        textDocument: { uri }, position: hierarchyPosition });
      expect(callerPrepared.map((type: any) => type.name)).toEqual(['Derived']);
      const warmActionParams = { textDocument: { uri }, range: { start: hierarchyPosition, end: hierarchyPosition },
        context: { only: ['quickfix'], diagnostics: [{ range: { start: hierarchyPosition, end: hierarchyPosition },
          code: 'php.namespace.psr4', message: 'Expected namespace', data: { expectedNamespace: 'Changed' } }] } };
      const beforeActions = await request('textDocument/codeAction', warmActionParams);
      expect(beforeActions.some((action: any) => action.kind === 'quickfix'
        && action.edit?.changes?.[uri]?.some((edit: any) => edit.newText === 'Changed'))).toBe(true);
      await writeFile(join(root, 'gates/active'), '');
      notify('textDocument/didClose', { textDocument: { uri: closingUri } });
      const deadline = Date.now() + 10_000;
      while (!await access(join(root, 'gates/read-1.paused')).then(() => true, () => false)) {
        expect(Date.now(), 'close read did not reach the controlled disk gate').toBeLessThan(deadline);
        await new Promise(done => setTimeout(done, 5));
      }
      const actionParams = { textDocument: { uri }, range: { start: hierarchyPosition, end: hierarchyPosition },
        context: { only: ['quickfix'], diagnostics: [{ range: { start: hierarchyPosition, end: hierarchyPosition },
          code: 'php.namespace.psr4', message: 'Expected namespace', data: { expectedNamespace: 'Changed' } }] } };
      const specifications = [{ method: 'textDocument/codeAction', params: actionParams, expected: [] }];
      const cancelled = specifications.map(specification => ({ ...specification,
        ...begin(specification.method, specification.params) }));
      const survivor = begin('typeHierarchy/supertypes', { item });
      const actionSurvivor = begin('textDocument/codeAction', actionParams);
      // This independent standard JSON-RPC error confirms that the server is
      // processing messages while the real disk read remains held.
      const barrier = await begin('sophp-close-cancel/barrier', {}).response;
      expect(barrier.error?.code).toBe(-32601);
      expect(messages.some(message => [...cancelled, survivor, actionSurvivor].some(query => query.id === message.id) && !message.method)).toBe(false);
      const cancelledAt = performance.now();
      for (const query of cancelled) notify('$/cancelRequest', { id: query.id });
      let budgetTimer: ReturnType<typeof setTimeout> | undefined;
      const allCancelled = Promise.all(cancelled.map(query => query.response));
      const early = await Promise.race([allCancelled, new Promise<undefined>(done => { budgetTimer = setTimeout(() => done(undefined), 100); })]);
      clearTimeout(budgetTimer);
      const survivorBeforeRelease = messages.some(message => message.id === survivor.id && !message.method);
      const actionSurvivorBeforeRelease = messages.some(message => message.id === actionSurvivor.id && !message.method);
      const releasedAt = performance.now();
      await writeFile(join(root, 'gates/release-all'), '');
      const [responses, survivorResponse, actionSurvivorResponse] = await Promise.all([allCancelled, survivor.response, actionSurvivor.response]);
      const observations = responses.map((response, index) => ({ method: specifications[index]!.method,
        elapsedMs: response.receivedAtMs - cancelledAt, beforeReadRelease: response.receivedAtMs < releasedAt }));
      for (const response of [...responses, survivorResponse, actionSurvivorResponse]) expect(response.error).toBeUndefined();
      for (const [index, response] of responses.entries()) expect(response.result).toEqual(specifications[index]!.expected);
      const restored = survivorResponse.result;
      expect(restored.map((parent: any) => parent.name)).toEqual(['DiskBase']);
      const afterChildren = await request('typeHierarchy/subtypes', { item });
      expect(afterChildren.map((child: any) => child.name)).toEqual(['Derived']);
      const afterPrepared = await request('textDocument/prepareTypeHierarchy', {
        textDocument: { uri }, position: hierarchyPosition });
      expect(afterPrepared.map((type: any) => type.name)).toEqual(['Derived']);
      expect(actionSurvivorResponse.result).toEqual(beforeActions);
      expect(await request('textDocument/codeAction', actionParams)).toEqual(beforeActions);
      expect(await readFile(closing, 'utf8')).toBe(disk); expect(await readFile(caller, 'utf8')).toBe(source);
      await request('shutdown', null); notify('exit', null); await closed;
      expect(child.exitCode).toBe(0); expect(stderr).toBe('');
      process.stdout.write(JSON.stringify({ case: 'code-action-close-wait-cancellation', phpVersion, indexingMode, observations,
        survivorBeforeRelease, actionSurvivorBeforeRelease, actionSurvivorPreserved: true, survivorRestoredDiskSupertype: true, previousSupertype: 'BufferBase', restoredSupertype: 'DiskBase', subtypePreserved: true, preparePreserved: true }) + '\n');
      expect(early, 'cancelled queries must return while the shared close is still held').not.toBeUndefined();
      for (const observation of observations) {
        expect(observation.elapsedMs).toBeLessThanOrEqual(100); expect(observation.beforeReadRelease).toBe(true);
      }
      expect(survivorBeforeRelease).toBe(false); expect(actionSurvivorBeforeRelease).toBe(false);
    } finally {
      await writeFile(join(root, 'gates/release-all'), '').catch(() => {});
      if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed; }
      for (const waiter of waiters) clearTimeout(waiter.timer);
      await rm(root, { recursive: true, force: true });
    }
  });

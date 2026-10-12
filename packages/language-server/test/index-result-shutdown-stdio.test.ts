import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['progressive', 'experimental'].flatMap(indexingMode =>
  [false, true].map(shutdownBeforeRelease => ({ phpVersion, indexingMode, shutdownBeforeRelease }))));

it.each(cases)('reports current index results at PHP $phpVersion in $indexingMode, shutdown=$shutdownBeforeRelease',
  async ({ phpVersion, indexingMode, shutdownBeforeRelease }) => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'sophp-index-result-shutdown-')));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
    await writeFile(join(root, 'First.php'), '<?php namespace App; final class First {}');
    await writeFile(join(root, 'Second.php'), '<?php namespace App; final class Second {}');
    const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
      '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    const exited = once(server, 'exit');
    const decoder = new LspMessageDecoder();
    const messages: any[] = [];
    const waiters = new Set<{ matches: (message: any) => boolean; done: (message: any) => void }>();
    let id = 0, stderr = '';
    const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
    server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    server.stdout.on('data', (chunk: Buffer) => {
      for (const message of decoder.push(chunk) as any[]) {
        messages.push(message);
        if (message.method && message.id !== undefined) {
          send({ id: message.id, result: null });
          continue;
        }
        for (const waiter of [...waiters]) if (waiter.matches(message)) waiter.done(message);
      }
    });
    const waitFor = (matches: (message: any) => boolean): Promise<any> => {
      const existing = messages.find(matches);
      if (existing) return Promise.resolve(existing);
      return new Promise((done, reject) => {
        const waiter = { matches, done: (message: any): void => {
          clearTimeout(timer); waiters.delete(waiter); done(message);
        } };
        const timer = setTimeout(() => {
          waiters.delete(waiter); reject(new Error(`Index result wait timed out: ${stderr}; ${JSON.stringify(messages)}`));
        }, 15_000);
        waiters.add(waiter);
      });
    };
    const request = async (method: string, params: object | null = {}): Promise<any> => {
      const requestId = ++id;
      const waiting = waitFor(message => message.id === requestId && message.method === undefined);
      send({ id: requestId, method, params });
      const reply = await waiting;
      expect(reply.error, method).toBeUndefined();
      return reply.result;
    };
    try {
      await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
        initializationOptions: { phpVersion, indexingMode, testMode: true,
          indexLimits: { maxFiles: 1, maxFileSizeBytes: 524288, maxTotalBytes: 1048576 } } });
      expect(await request('phpCompanion/testPauseNextQuery', { method: 'indexSourceScan' })).toBe(true);
      send({ method: 'initialized', params: {} });
      await waitFor(message => message.method === 'window/logMessage'
        && message.params.message === '[test-query-paused] method=indexSourceScan');
      if (shutdownBeforeRelease) await request('shutdown', null);
      expect(await request('phpCompanion/testReleaseQuery', { method: 'indexSourceScan' })).toBe(true);
      // Observe the resumed index result itself, rather than a timer or a retry.
      await waitFor(message => message.method === 'window/logMessage'
        && message.params.message === `[test-index-scan-completed] root=${root} warnings=1`);
      const state = await request('phpCompanion/testSemanticLifecycle');
      const warnings = messages.filter(message => message.method === 'window/logMessage' && message.params.type === 2);
      const reports = messages.filter(message => message.method === 'window/logMessage'
        && /^Indexed \d+ PHP files/.test(message.params.message));
      if (shutdownBeforeRelease) {
        expect(state).toEqual({ shuttingDown: true, parserCreated: false, workspaceCount: 0, pendingBuiltinRoots: 0 });
        expect(warnings).toEqual([]);
        expect(reports).toEqual([]);
      } else {
        expect(state).toMatchObject({ shuttingDown: false, parserCreated: true, workspaceCount: 1 });
        expect(warnings.map(message => message.params.message)).toEqual(['Project source index exceeded 1 files.']);
        expect(reports).toHaveLength(1);
        await request('shutdown', null);
      }
      send({ method: 'exit', params: {} });
      expect((await exited)[0], stderr).toBe(0);
      expect(stderr).toBe('');
    } finally {
      if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  });

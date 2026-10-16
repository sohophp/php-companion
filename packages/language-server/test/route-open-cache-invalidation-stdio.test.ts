import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir as osTmpdir } from 'node:os';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

// Keep the test and server on the same physical temporary path, including macOS.
const testTempRoot = realpathSync(osTmpdir());
if (process.platform === 'darwin') process.env.TMPDIR = testTempRoot;
function tmpdir(): string { return testTempRoot; }
function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function completionItems(result: any[] | { isIncomplete: boolean; items: any[] }): any[] {
  return Array.isArray(result) ? result : result.items;
}

function lspPosition(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

function messagesFrom(process: ChildProcessWithoutNullStreams): {
  messages: object[];
  waitFor: (predicate: (message: any) => boolean, timeoutMs?: number) => Promise<any>;
} {
  const messages: object[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let buffer = Buffer.alloc(0);
  process.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const match = /Content-Length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString('ascii'));
      if (!match) throw new Error('Language server emitted an invalid LSP header.');
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) return;
      const message = JSON.parse(buffer.subarray(bodyStart, bodyStart + length).toString('utf8')) as object;
      buffer = buffer.subarray(bodyStart + length);
      messages.push(message);
      for (const waiter of [...waiters]) {
        if (waiter.predicate(message)) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    }
  });
  return {
    messages,
    waitFor: (predicate, timeoutMs = 15_000): Promise<any> => {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolvePromise, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for language server response; logs: ${JSON.stringify(messages.filter((message) => message.method === 'window/logMessage').slice(-12))}; recent messages: ${JSON.stringify(messages.slice(-5))}`)), timeoutMs);
        waiters.push({ predicate, resolve: (message) => { clearTimeout(timer); resolvePromise(message); } });
      });
    },
  };
}

describe('route input cache during initial disk reads', () => {
  let server: ChildProcessWithoutNullStreams | undefined;
  afterEach(() => server?.kill());
  it.each(['file', 'directory'].flatMap(inputKind => [false, true].flatMap(openComplete => [1, 2].map(depth => ({ inputKind, openComplete, depth })))))(
    'uses already open newly discovered $inputKind route inputs with complete=$openComplete and depth=$depth', async ({ inputKind, openComplete, depth }) => {
      const root = await mkdtemp(join(tmpdir(), 'php-companion-route-discovery-'));
      const gates = join(root, 'gates'); await mkdir(gates);
      try {
        const support = join(root, 'support'); await mkdir(support);
        const inputPath = join(support, 'lookup.php'), inputUri = pathToFileURL(inputPath).toString();
        const nextSupport = join(root, 'next'); await mkdir(nextSupport);
        const nextPath = join(nextSupport, 'lookup.php'), nextUri = pathToFileURL(nextPath).toString();
        const source = "<?php namespace Symfony\\Component\\Routing { interface RouterInterface { public function generate(string $name): string; } } namespace App { function run(\\Symfony\\Component\\Routing\\RouterInterface $router): void { $router->generate('discovery.'); } }";
        const sourcePath = join(root, 'Use.php'), uri = pathToFileURL(sourcePath).toString();
        const diskSource = `<?php return ${!openComplete};`, openSource = `<?php return ${openComplete};`;
        await writeFile(sourcePath, source); await writeFile(inputPath, diskSource); await writeFile(nextPath, diskSource);
        const provider = join(root, 'provider.mjs'), requestsPath = join(root, 'requests.jsonl');
        const inputs = { inputEvidenceComplete: true, inputUris: inputKind === 'file' ? [inputUri] : [],
          inputDirectoryUris: inputKind === 'directory' ? [pathToFileURL(support).toString()] : [] };
        const nextInputs = { inputEvidenceComplete: true, inputUris: inputKind === 'file' ? [inputUri, nextUri] : [],
          inputDirectoryUris: inputKind === 'directory' ? [pathToFileURL(support).toString(), pathToFileURL(nextSupport).toString()] : [] };
        await writeFile(provider, `import {readFile,appendFile} from 'node:fs/promises'; let body=''; for await(const part of process.stdin)body+=part;
const request=JSON.parse(body), uri=${JSON.stringify(inputUri)};
await appendFile(${JSON.stringify(requestsPath)},JSON.stringify(request.params)+'\\n');
const first=request.params.documents?.find(d=>d.uri===uri), next=${depth}===2 && Boolean(first);
const source=next ? request.params.documents?.find(d=>d.uri===${JSON.stringify(nextUri)})?.source ?? await readFile(${JSON.stringify(nextPath)},'utf8') : first?.source ?? await readFile(${JSON.stringify(inputPath)},'utf8');
process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'discovery.routes',generation:request.params.generation,complete:source.includes('true'),routes:[{name:'discovery.one',path:'/one'}],...(next ? ${JSON.stringify(nextInputs)} : ${JSON.stringify(inputs)})}}));`);
        server = spawn(process.execPath, ['--import', pathToFileURL(resolve('test/helpers/close-read-gate.mjs')).href, resolve('../../dist/language-server.js'), '--stdio',
          '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe', env: { ...process.env, SOPHP_CLOSE_WAIT_GATES: gates, SOPHP_CLOSE_WAIT_SOURCE: inputPath } });
        const output = messagesFrom(server);
        const send = (message: object): void => { server!.stdin.write(encode({ jsonrpc: '2.0', ...message })); };
        send({ id: 1230, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { indexingMode: 'onDemand', bundledRouteProviders: [{ providerId: 'discovery.routes', command: process.execPath,
            args: [provider], timeoutMs: 1000, replacesStaticRoutes: true, cacheUntilInvalidated: true }] } } });
        await output.waitFor(message => message.id === 1230); send({ method: 'initialized', params: {} });
        for (const document of [{ uri, text: source }, { uri: inputUri, text: openSource }, ...(depth === 2 ? [{ uri: nextUri, text: openSource }] : [])]) {
          if (document.uri === inputUri) await writeFile(join(gates, 'active'), '');
          send({ method: 'textDocument/didOpen', params: { textDocument: { ...document, languageId: 'php', version: 1 } } });
          await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === document.uri);
        }
        const query = async (id: number): Promise<string[]> => {
          send({ id, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, source.indexOf("'discovery.'") + 11) } });
          const response = await output.waitFor(message => message.id === id); expect(response.error).toBeUndefined();
          return completionItems(response.result).map((item: { label: string }) => item.label);
        };
        const waitGate = async (name: string): Promise<void> => {
          const end = Date.now() + 5000;
          while (!await access(join(gates, name)).then(() => true, () => false)) {
            expect(Date.now(), 'real read gate marker: ' + name).toBeLessThan(end);
            await new Promise(done => setTimeout(done, 5));
          }
        };
        await waitGate('read-1.paused');
        const pausedStack = await readFile(join(gates, 'read-1.paused'), 'utf8');
        const expected = openComplete ? ['discovery.one'] : [];
        expect(await query(1231)).toEqual(depth === 2 ? [] : expected);
        const requests = (await readFile(requestsPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
        expect(requests.at(-1).documents?.find((document: { uri: string }) => document.uri === inputUri)?.source).toBe(openSource);
        if (depth === 2) {
          expect(requests).toHaveLength(2);
          expect(requests.at(-1).documents?.some((document: { uri: string }) => document.uri === nextUri)).toBeFalsy();
        }
        expect(requests).toHaveLength(2);
        await writeFile(join(gates, 'release-all'), '');
        await waitGate('read-1.released');
        send({ id: 1235, method: 'sophp-route-cache/read-release-barrier', params: {} });
        expect((await output.waitFor(message => message.id === 1235)).error?.code).toBe(-32601);
        expect(await query(1232)).toEqual(expected);
        const finalRequests = (await readFile(requestsPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
        process.stdout.write(JSON.stringify({case:'route-open-cache-invalidation',inputKind,openComplete,depth,pid:server.pid,requestsBeforeRelease:requests,requestsAfterRelease:finalRequests,pausedStack,expectedCalls:requests.length + (depth === 2 ? 1 : 0),actualCalls:finalRequests.length})+'\n');
        expect(finalRequests).toHaveLength(requests.length + (depth === 2 ? 1 : 0));
        if (depth === 2) expect(finalRequests.at(-1).documents?.find((document: { uri: string }) => document.uri === nextUri)?.source).toBe(openSource);
        expect(await query(1234)).toEqual(expected);
        expect((await readFile(requestsPath, 'utf8')).trim().split('\n')).toHaveLength(finalRequests.length);
        expect(await readFile(inputPath, 'utf8')).toBe(diskSource);
        send({ id: 1233, method: 'shutdown', params: null }); await output.waitFor(message => message.id === 1233);
        const exited = once(server, 'exit'); send({ method: 'exit', params: null }); await exited;
      } finally {
        await writeFile(join(gates, 'release-all'), '').catch(() => {});
        if (server && server.exitCode === null && server.signalCode === null) {
          const closed = once(server, 'close'); server.kill('SIGKILL'); await closed;
        }
        await rm(root, { recursive: true, force: true });
        process.stdout.write(JSON.stringify({case:'route-open-cache-cleanup',root,pid:server?.pid,exitCode:server?.exitCode,signal:server?.signalCode,removed:true})+'\n');
      }
    });

});

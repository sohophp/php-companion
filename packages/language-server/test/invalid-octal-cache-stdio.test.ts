import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';
import { semanticIndexCacheVersion } from '../src/cacheVersion.js';

it.each(['7.2', '8.5'])('rejects v82 parser error facts and restores current closed-file references at PHP %s', async phpVersion => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-invalid-octal-cache-'));
  const cacheDirectory = join(root, '.cache');
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const path = join(root, 'src', 'Example.php');
  const uri = pathToFileURL(path).toString();
  const source = `<?php namespace App;
class Base {} class Ready extends Base { public function onlyReady(): void {} }
/** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
function unknown(): void {}
function valid(Base $item, bool $run): void {
  while ($run) { if (!isReady($item)) { break (1); unknown(); } /* valid */ $item->onlyReady(); }
}
function invalid(Base $item, bool $run): void {
  while ($run) { if (!isReady($item)) { while ($run) { break; unknown(); } } /* invalid */ $item->onlyReady(); }
}`;
  await writeFile(path, source);
  const brokenPath = join(root, 'src', 'Broken.php'), brokenUri = pathToFileURL(brokenPath).toString();
  const brokenSource = '<?php namespace App; class Broken { public function run(int $left, int $right): int { return $left+$right; } } $value=0o;';
  await writeFile(brokenPath, brokenSource);
  const position = (offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  try {
    for (let run = 0; run < 3; run++) {
      const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
      const messages: any[] = [];
      const waiters: Array<{ predicate: (message: any) => boolean; done: (message: any) => void }> = [];
      let id = 0, stderr = '';
      server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
      server.stdout.on('data', (chunk: Buffer) => {
        for (const message of decoder.push(chunk) as any[]) {
          messages.push(message);
          for (const waiter of [...waiters]) if (waiter.predicate(message)) waiter.done(message);
        }
      });
      const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
      const waitFor = (predicate: (message: any) => boolean): Promise<any> => {
        const found = messages.find(predicate); if (found) return Promise.resolve(found);
        return new Promise((done, reject) => {
          const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error(`LSP timed out: ${stderr}`)); }, 15_000);
          const waiter = { predicate, done: (message: any): void => {
            clearTimeout(timer); waiters.splice(waiters.indexOf(waiter), 1); done(message);
          } };
          waiters.push(waiter);
        });
      };
      const request = async (method: string, params: object | null): Promise<any> => {
        const requestId = ++id; const response = waitFor(message => message.id === requestId);
        send({ id: requestId, method, params });
        const message = await response; expect(message.error).toBeUndefined(); return message.result;
      };
      try {
        await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { phpVersion, indexingMode: 'experimental', cacheDirectory } });
        send({ method: 'initialized', params: {} });
        const indexed = await waitFor(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        expect(Number(/(\d+) cached/.exec(indexed.params.message)?.[1])).toBe(run === 2 ? 2 : 0);
        send({ method: 'textDocument/didOpen', params: { textDocument: { uri: brokenUri, languageId: 'php', version: 1, text: brokenSource } } });
        const brokenDiagnostics = await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === brokenUri && message.params?.version === 1);
        const syntax = brokenDiagnostics.params.diagnostics.filter((item: any) => item.code === 'php.syntax');
        expect(syntax).toHaveLength(1);
        const badStart = brokenSource.indexOf('0o');
        expect(syntax[0].range).toEqual({ start: { line: 0, character: badStart }, end: { line: 0, character: badStart + 2 } });
        expect(await request('phpCompanion/methodParameterOrder', { textDocument: { uri: brokenUri }, position: { line: 0, character: brokenSource.indexOf('$left') } })).toBeNull();
        expect(await readFile(brokenPath, 'utf8')).toBe(brokenSource);
        const callerUri = pathToFileURL(join(root, 'src', 'Caller.php')).toString();
        const caller = '<?php namespace App; function probe(Ready $item): void { $item->onlyReady(); }';
        send({ method: 'textDocument/didOpen', params: { textDocument: { uri: callerUri, languageId: 'php', version: 1, text: caller } } });
        const params = { textDocument: { uri: callerUri }, position: { line: 0, character: caller.lastIndexOf('onlyReady') + 1 } };
        const definitions = await request('textDocument/definition', params);
        expect(definitions).toHaveLength(1);
        expect(definitions[0]).toMatchObject({ uri, range: { start: position(source.indexOf('onlyReady')) } });
        const references = await request('textDocument/references', { ...params, context: { includeDeclaration: true } });
        const expected = [
          { uri, range: { start: position(source.indexOf('onlyReady')), end: position(source.indexOf('onlyReady') + 'onlyReady'.length) } },
          { uri, range: { start: position(source.indexOf('/* valid */ $item->onlyReady') + '/* valid */ $item->'.length), end: position(source.indexOf('/* valid */ $item->onlyReady') + '/* valid */ $item->onlyReady'.length) } },
          { uri: callerUri, range: { start: { line: 0, character: caller.lastIndexOf('onlyReady') }, end: { line: 0, character: caller.lastIndexOf('onlyReady') + 'onlyReady'.length } } },
        ];
        const sort = (rows: any[]): any[] => rows.toSorted((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
        expect(sort(references), JSON.stringify({ phpVersion, run, indexed: indexed.params.message })).toEqual(sort(expected));
        expect(await readFile(path, 'utf8')).toBe(source);
        await request('shutdown', null); send({ method: 'exit', params: {} });
        expect((await exited)[0], stderr).toBe(0); expect(stderr).toBe('');
      } finally {
        if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
      }
      if (run === 0) {
        const manifests = [];
        for (const name of await readdir(cacheDirectory)) {
          if (!name.endsWith('.json')) continue;
          const manifestPath = join(cacheDirectory, name), manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
          if (manifest.version !== semanticIndexCacheVersion(phpVersion)) continue;
          expect(Object.keys(manifest.entries)).toHaveLength(2);
          manifest.version = `semantic-v82-php-${phpVersion}`;
          await writeFile(manifestPath, JSON.stringify(manifest)); manifests.push(manifestPath);
        }
        expect(manifests).toHaveLength(1);
      }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}, 45_000);

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['progressive', 'experimental'].map(indexingMode => ({ phpVersion, indexingMode })));
async function verifyIdentifierBoundaries(phpVersion: string, indexingMode: string, search: 'system' | 'portable' = 'system'): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'sophp-prepared-fresh-references-'));
  await mkdir(join(root, 'src/Contract'), { recursive: true });
  await mkdir(join(root, 'src/Controller'), { recursive: true });
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const contract = '<?php namespace App\\Contract; interface FreshContract { public function get(): void; }';
  const unrelated = '<?php namespace App\\Contract; interface OtherContract { public function get(): void; }';
  const otherCaller = '<?php namespace App\\Controller; use App\\Contract\\OtherContract; class OtherCaller { public function run(OtherContract $target): void { $target->get(); } }';
  const caller = '<?php namespace App\\Controller; use App\\Contract\\FreshContract; class FreshCaller { public function run(FreshContract $target): void { $target->GET(); } }';
  const path = join(root, 'src/Contract/FreshContract.php'), uri = pathToFileURL(path).toString();
  const callerPath = join(root, 'src/Controller/FreshCaller.php'), callerUri = pathToFileURL(callerPath).toString();
  await writeFile(path, contract);
  await writeFile(callerPath, caller);
  await writeFile(join(root, 'src/Contract/OtherContract.php'), unrelated);
  await writeFile(join(root, 'src/Controller/OtherCaller.php'), otherCaller);
  const unicodeCases = ['取得get', '𐐀get', '😀get'].map((name, index) => {
    const contractName = `UnicodeContract${index}`;
    const unicodeContract = `<?php namespace App\\Contract; interface ${contractName} { public function ${name}(): void; }`;
    const unicodeCaller = `<?php namespace App\\Controller; use App\\Contract\\${contractName}; class UnicodeCaller${index} { public function run(${contractName} $target): void { $target->${name}(); } }`;
    const unicodeContractPath = join(root, `src/Contract/${contractName}.php`), unicodeUri = pathToFileURL(unicodeContractPath).toString();
    const unicodeCallerPath = join(root, `src/Controller/UnicodeCaller${index}.php`), unicodeCallerUri = pathToFileURL(unicodeCallerPath).toString();
    return { name, unicodeContract, unicodeCaller, unicodeContractPath, unicodeUri, unicodeCallerPath, unicodeCallerUri };
  });
  await Promise.all(unicodeCases.flatMap(item => [writeFile(item.unicodeContractPath, item.unicodeContract), writeFile(item.unicodeCallerPath, item.unicodeCaller)]));
  const noisePath = join(root, 'src/Controller/GetNoise.php');
  const quotedPath = join(root, 'src/Controller/QuotedNoise.php');
  const unicodePath = join(root, 'src/Controller/UnicodeNoise.php');
  await writeFile(noisePath, '<?php namespace App\\Controller; class GetNoise { public function getSomething(): void {} public function forget(): void {} public function _get(): void {} public function get_(): void {} public function dispatchSomething(): void {} }');
  await writeFile(quotedPath, "<?php namespace App\\Controller; class QuotedNoise { const NAME = 'get'; }");
  await writeFile(unicodePath, "<?php namespace App\\Controller; class UnicodeNoise { const NAME = 'αget'; }");
  const arm = join(root, 'observe'), reads = join(root, 'reads.jsonl'), preload = join(root, 'observe-read.cjs');
  await writeFile(preload, `const fs = require('node:fs'), fsp = require('node:fs/promises');
const original = fs.readFile, originalPromise = fsp.readFile;
const arm = ${JSON.stringify(arm)}, log = ${JSON.stringify(reads)}, sourceRoot = ${JSON.stringify(join(root, 'src') + '/')};
const observe = path => { if (typeof path === 'string' && path.startsWith(sourceRoot) && path.endsWith('.php') && fs.existsSync(arm)) fs.appendFileSync(log, JSON.stringify({ path, pid: process.pid }) + '\\n'); };
fs.readFile = function(path, ...args) { observe(path); return original.call(this, path, ...args); };
fsp.readFile = function(path, ...args) { observe(path); return originalPromise.call(this, path, ...args); };`);
  const runtime = resolve(process.env.SOPHP_PREPARED_REFERENCE_RUNTIME ?? '../../dist');
  const server = spawn(process.execPath, ['--require', preload, join(runtime, 'language-server.js'), '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
  const pending = new Map<number, { done: (message: any) => void }>();
  const messages: any[] = [];
  const notifications: Array<{ predicate: (message: any) => boolean; done: (message: any) => void }> = [];
  let id = 0, stderr = '';
  server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
  server.stdout.on('data', (chunk: Buffer) => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message); pending.get(message.id)?.done(message);
      for (const waiter of [...notifications]) if (waiter.predicate(message)) waiter.done(message);
    }
  });
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = (method: string, params: object | null): Promise<any> => {
    const requestId = ++id;
    return new Promise((done, reject) => {
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out: ${stderr}`)); }, 15_000);
      pending.set(requestId, { done: message => {
        clearTimeout(timer); pending.delete(requestId);
        if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result);
      } });
      send({ id: requestId, method, params });
    });
  };
  const waitFor = (predicate: (message: any) => boolean): Promise<any> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((done, reject) => {
      const timer = setTimeout(() => { notifications.splice(notifications.indexOf(waiter), 1); reject(new Error(`Diagnostics timed out: ${stderr}`)); }, 15_000);
      const waiter = { predicate, done: (message: any): void => {
        clearTimeout(timer); notifications.splice(notifications.indexOf(waiter), 1); done(message);
      } };
      notifications.push(waiter);
    });
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode, experimentalReferenceSourceOnly: indexingMode === 'experimental',
        experimentalRipgrepCandidates: search, testMode: true, testDisablePersistentReferences: true,
        cacheDirectory: join(root, 'cache') } });
    send({ method: 'initialized', params: {} });
    if (indexingMode === 'progressive' || indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage'
      && message.params?.message?.includes('Reference source facts ready'));
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: contract } } });
    await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === 1);
    const at = (source: string, name: string): { start: { line: number; character: number }; end: { line: number; character: number } } => ({
      start: position(source, source.indexOf(name)), end: position(source, source.indexOf(name) + name.length),
    });
    const params = { textDocument: { uri }, position: position(contract, contract.indexOf('get') + 2), context: { includeDeclaration: true } };
    const result = await request('textDocument/references', params);
    expect(result.map((location: any) => location.uri).sort()).toEqual([uri, callerUri].sort());
    expect(result).toContainEqual({ uri, range: at(contract, 'get') });
    expect(result).toContainEqual({ uri: callerUri, range: at(caller, 'GET') });
    await waitFor(message => message.method === 'window/logMessage' && /^Indexed \d+ PHP files/.test(message.params?.message ?? ''));
    await writeFile(arm, 'observe actual prepared reads');
    expect(await request('textDocument/references', params)).toEqual(result);
    await rm(arm);
    const observed = (await readFile(reads, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as { path: string });
    const paths = observed.map(item => item.path);
    expect(paths).toContain(callerPath);
    expect(paths).toContain(quotedPath);
    expect(paths).toContain(unicodePath);
    expect(paths).not.toContain(noisePath);
    const edited = caller.replace('$target->GET();', '');
    await writeFile(callerPath, edited); // A later disk-only edit must also invalidate the proof.
    expect(await request('textDocument/references', params)).toEqual([{ uri, range: at(contract, 'get') }]);
    await writeFile(callerPath, caller);
    expect((await request('textDocument/references', params)).map((location: any) => location.uri).sort()).toEqual([uri, callerUri].sort());
    await rm(callerPath); // Deletion also arrives before a watcher event.
    expect(await request('textDocument/references', params)).toEqual([{ uri, range: at(contract, 'get') }]);
    const newPath = join(root, 'src/Controller/NewCaller.php'), newUri = pathToFileURL(newPath).toString();
    const newCaller = caller.replace('FreshCaller', 'NewCaller').replace('->GET()', '->get()');
    await writeFile(newPath, newCaller);
    const newlyFound = await request('textDocument/references', params);
    expect(newlyFound.map((location: any) => location.uri).sort()).toEqual([uri, newUri].sort());
    const newMethodStart = newCaller.indexOf('->get') + 2;
    expect(newlyFound).toContainEqual({ uri: newUri, range: {
      start: position(newCaller, newMethodStart), end: position(newCaller, newMethodStart + 3),
    } });
    await rm(newPath);
    expect(await request('textDocument/references', params)).toEqual([{ uri, range: at(contract, 'get') }]);
    for (const { name, unicodeContract, unicodeCaller, unicodeUri, unicodeCallerPath, unicodeCallerUri } of unicodeCases) {
      send({ method: 'textDocument/didOpen', params: { textDocument: { uri: unicodeUri, languageId: 'php', version: 1, text: unicodeContract } } });
      await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === unicodeUri && message.params?.version === 1);
      const unicodeParams = { textDocument: { uri: unicodeUri }, position: position(unicodeContract, unicodeContract.indexOf(name) + 1), context: { includeDeclaration: true } };
      const unicodeReferences = [
        { uri: unicodeUri, range: at(unicodeContract, name) },
        { uri: unicodeCallerUri, range: at(unicodeCaller, name) },
      ];
      const unicodeInitial = await request('textDocument/references', unicodeParams);
      expect(unicodeInitial).toHaveLength(2); expect(unicodeInitial).toEqual(expect.arrayContaining(unicodeReferences));
      await writeFile(unicodeCallerPath, unicodeCaller.replace(`$target->${name}();`, ''));
      expect(await request('textDocument/references', unicodeParams)).toEqual([unicodeReferences[0]]);
      await writeFile(unicodeCallerPath, unicodeCaller);
      const unicodeRestored = await request('textDocument/references', unicodeParams);
      expect(unicodeRestored).toHaveLength(2); expect(unicodeRestored).toEqual(expect.arrayContaining(unicodeReferences));
    }
    await writeFile(callerPath, edited);
    expect(await readFile(path, 'utf8')).toBe(contract);
    expect(await readFile(callerPath, 'utf8')).toBe(edited);
    await request('shutdown', null); send({ method: 'exit', params: {} });
    const [code] = await exited; expect(code, stderr).toBe(0);
  } finally {
    if (server.exitCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
}

it.each(cases)('preserves short identifier boundaries and disk-only changes at PHP $phpVersion in $indexingMode',
  async ({ phpVersion, indexingMode }) => verifyIdentifierBoundaries(phpVersion, indexingMode), 20_000);
it.each(cases)('preserves portable short identifier boundaries and disk-only changes at PHP $phpVersion in $indexingMode',
  async ({ phpVersion, indexingMode }) => verifyIdentifierBoundaries(phpVersion, indexingMode, 'portable'), 20_000);

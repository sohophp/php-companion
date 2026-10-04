import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';

function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function messagesFrom(server: ChildProcessWithoutNullStreams): {
  waitFor: (predicate: (message: any) => boolean) => Promise<any>;
} {
  const messages: any[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let buffer = Buffer.alloc(0);
  server.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const match = /Content-Length: (\d+)/iu.exec(buffer.subarray(0, headerEnd).toString('ascii'));
      if (!match) throw new Error('Invalid LSP header');
      const length = Number(match[1]), start = headerEnd + 4;
      if (buffer.length < start + length) return;
      const message = JSON.parse(buffer.subarray(start, start + length).toString('utf8'));
      buffer = buffer.subarray(start + length); messages.push(message);
      for (const waiter of [...waiters]) if (waiter.predicate(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  return { waitFor: async (predicate): Promise<any> => {
    const existing = messages.find(predicate); if (existing) return existing;
    return new Promise<any>((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for completion prefix response: '
        + JSON.stringify(messages.slice(-8)))), 15_000);
      waiters.push({ predicate, resolve: (message): void => { clearTimeout(timer); resolvePromise(message); } });
    });
  } };
}

it.each(['onDemand', 'progressive'].flatMap(indexingMode => ['7.2', '8.5'].map(phpVersion => ({ indexingMode, phpVersion }))))(
  'refreshes server matching as unsaved prefixes narrow in $indexingMode at PHP $phpVersion', async ({ indexingMode, phpVersion }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-prefix-refresh-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const path = join(root, 'Matching.php'), uri = pathToFileURL(path).toString();
    const header = '<?php namespace Matching; class ShortCurrent {} class ShallowCurrent {} class OtherCurrent {} '
      + 'function short_current():void{} function shallow_current():void{} function other_current():void{} '
      + 'const SHORT_CURRENT=1; const SHALLOW_CURRENT=2; const OTHER_CURRENT=3; '
      + 'class Box { public function shortCurrent():void{} public function shallowCurrent():void{} public function otherCurrent():void{} } ';
    const original = header + 'function consume():void{}';
    await writeFile(path, original);
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: {
      'psr-4': { 'Matching\\': './' }, files: ['Matching.php'],
    } }));
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm',
      resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    const output = messagesFrom(server); let id = 0, version = 0;
    const request = async (method: string, params: object): Promise<any> => {
      const requestId = ++id; server!.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
      const response = await output.waitFor(message => message.id === requestId);
      expect(response.error).toBeUndefined(); return response.result;
    };
    const notify = (method: string, params: object): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode } }); notify('initialized', {});
    // Progressive prepares source facts without declaring the whole reference
    // index complete. Wait for its actual readiness signal, not complete=true.
    if (indexingMode === 'progressive') await output.waitFor(message => message.method === 'window/logMessage'
      && message.params?.message?.includes('Reference source facts ready'));
    const observations: Array<{ family: string; prefix: string; incomplete: boolean; labels: string[] }> = [];
    for (const family of ['type', 'expression', 'member'] as const) {
      for (const prefix of ['', 'Sh', 'Sho', 'Ot', 'Sh', 'Sho', 'SC']) {
        const marked = header + (family === 'type' ? `function consume():void{new ${prefix}§;}`
          : family === 'member' ? `function consume(Box $box):void{$box->${prefix}§;}`
            : `function consume():void{${prefix}§;}`);
        const source = marked.replace('§', ''), caret = marked.indexOf('§'); version++;
        notify(version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', version === 1
          ? { textDocument: { uri, languageId: 'php', version, text: source } }
          : { textDocument: { uri, version }, contentChanges: [{ text: source }] });
        await output.waitFor(message => message.method === 'textDocument/publishDiagnostics'
          && message.params?.uri === uri && message.params?.version === version);
        const result = await request('textDocument/completion', { textDocument: { uri }, position: { line: 0, character: caret },
          context: { triggerKind: prefix === '' ? 1 : 3 } });
        const labels: string[] = (Array.isArray(result) ? result : result.items).map((item: { label: string }) => item.label);
        observations.push({ family, prefix, incomplete: result.isIncomplete === true,
          labels: labels.filter(label => /current|SessionHandler|stdClass/iu.test(label)) });
        const short = family === 'type' ? 'ShortCurrent' : family === 'member' ? 'shortCurrent' : 'short_current';
        const shallow = family === 'type' ? 'ShallowCurrent' : family === 'member' ? 'shallowCurrent' : 'shallow_current';
        const other = family === 'type' ? 'OtherCurrent' : family === 'member' ? 'otherCurrent' : 'other_current';
        if (prefix === 'Sh' || prefix === 'SC') expect(labels, family + prefix).toEqual(expect.arrayContaining([short, shallow]));
        if (prefix === 'Sho') {
          expect(labels, family).toContain(short); expect(labels, family).not.toContain(shallow);
          expect(labels, family).not.toContain(other); expect(labels, family).not.toContain('SessionHandler');
          if (family === 'expression') { expect(labels).toContain('SHORT_CURRENT'); expect(labels).not.toContain('SHALLOW_CURRENT'); }
        }
        if (prefix === 'Ot') { expect(labels, family).toContain(other); expect(labels, family).not.toContain(short); }
      }
    }
    console.log('Completion prefix refresh proof: ' + JSON.stringify({ indexingMode, phpVersion, observations }));
    for (const observation of observations) expect(observation.incomplete, observation.family + '/' + observation.prefix).toBe(true);
    expect(await readFile(path, 'utf8')).toBe(original);
    await request('shutdown', {}); notify('exit', {});
  } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
}, 30_000);

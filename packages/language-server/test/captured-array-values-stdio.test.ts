import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
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



it.each(['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode }))))(
  'keeps captured array values at PHP $phpVersion in $indexingMode', async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-captured-array-lsp-')); let server: ChildProcessWithoutNullStreams | undefined;
    try {
      await mkdir(join(root, 'src'));
      const disk = '<?php', uri = pathToFileURL(join(root, 'Consumer.php')).toString();
      await writeFile(join(root, 'Consumer.php'), disk);
      const cases: Array<[string, string, string[]]> = [
        ['cold static capture', "$options=External\\TYPE::$options;$f=function()use($options){$options['mo§'];};", ['mode']],
        ['cold alias capture', "$options=External\\TYPE::$options;$copy=$options;$f=function()use($copy){$copy['mo§'];};", ['mode']],
        ['nested capture', "$options=External\\TYPE::$options;$f=function()use($options){$g=function()use($options){$options['mo§'];};};", ['mode']],
        ['cold method capture', "$options=External\\TYPE::readOptions();$f=function()use($options){$options['mo§'];};", ['mode']],
        ['by reference', "$options=External\\TYPE::$options;$f=function()use(&$options){$options['mo§'];};", []],
        ['shadowed parameter', "$options=External\\TYPE::$options;$f=function($options){$options['mo§'];};", []],
        ['unknown mutation', "$options=External\\TYPE::$options;$f=function()use($options){unknown($options);$options['mo§'];};", []],
        ['local replace', "$options=External\\TYPE::$options;$f=function()use($options){$options=['more'=>1];$options['mo§'];};", ['more']],
        ['nested overwrite', "$options=External\\TYPE::$options;$f=function()use($options){$options=42;if($flag){$options['mo§'];}};", []],
        ['prior value closure', "$options=External\\TYPE::$options;$a=function()use($options){return $options;};$b=function()use($options){$options['mo§'];};", ['mode']],
        ['prior reference closure', "$options=External\\TYPE::$options;$a=function()use(&$options){return $options;};$b=function()use($options){$options['mo§'];};", []],
        ['captured entry parameter', "$f=function()use($param){$param['mo§'];};", ['mode']],
        ['entry parameter removed', "unset($param);$f=function()use($param){$param['mo§'];};", []],
        ['entry parameter restored', "unset($param);$param=['more'=>1];$f=function()use($param){$param['mo§'];};", ['more']],
      ];
      if (phpVersion === '8.5') cases.push(
        ['cold arrow', "$options=External\\TYPE::$options;$f=fn()=>$options['mo§'];", ['mode']],
        ['arrow shadow', "$options=External\\TYPE::$options;$f=fn($options)=>$options['mo§'];", []],
      );
      const owners: Array<{ path: string; source: string }> = [];
      for (let index = 0; index < cases.length; index++) {
        const path = join(root, 'src', `CaptureOrigin${index}.php`);
        const source = `<?php namespace External; class CaptureOrigin${index} {/** @var array{mode:string} */ public static $options; /** @return array{mode:string} */ public static function readOptions():array{return [];}}`;
        owners.push({ path, source }); await writeFile(path, source);
      }
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Consumer.php'], 'psr-4': { 'External\\': 'src/' } } }));
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      const output = messagesFrom(server); let id = 1, version = 0;
      const notify = (method: string, params: object): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
      const request = async (method: string, params: object): Promise<any> => {
        const requestId = id++; server!.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
        const response = await output.waitFor(message => message.id === requestId); expect(response.error).toBeUndefined(); return response.result;
      };
      await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion, indexingMode } });
      notify('initialized', {});
      for (const [index, [name, body, expected]] of cases.entries()) {
        const marked = `<?php /** @param array{mode:string} $param */ function consume($param){${body.replaceAll('TYPE', `CaptureOrigin${index}`)}}`;
        const source = marked.replace('§', ''); version++;
        notify(version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', version === 1
          ? { textDocument: { uri, languageId: 'php', version, text: source } }
          : { textDocument: { uri, version }, contentChanges: [{ text: source }] });
        await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === version);
        const offset = marked.indexOf('§');
        const result = await request('textDocument/completion', { textDocument: { uri }, position: lspPosition(source, offset) });
        const items = Array.isArray(result) ? result : result?.items ?? [];
        expect(items.map((item: any) => item.label), name).toEqual(expected);
        if (expected.length) {
          const edit = items[0].textEdit;
          expect(edit).toEqual({ range: { start: lspPosition(source, source.lastIndexOf('[', offset) + 1), end: lspPosition(source, offset + 1) }, newText: `'${expected[0]}'` });
        }
      }
      // The same captured binding must retract after changes to its value and capture mode.
      for (const [value, capture, expected] of [['mode', '', ['mode']], ['more', '', ['more']], ['other', '', []], ['mode', '&', []], ['mode', '', ['mode']]] as const) {
        const marked = `<?php function consume(){$options=['${value}'=>1];$f=function()use(${capture}$options){$options['mo§'];};}`;
        const source = marked.replace('§', ''); version++;
        notify('textDocument/didChange', { textDocument: { uri, version }, contentChanges: [{ text: source }] });
        await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === version);
        const result = await request('textDocument/completion', { textDocument: { uri }, position: lspPosition(source, marked.indexOf('§')) });
        expect((Array.isArray(result) ? result : result?.items ?? []).map((item: any) => item.label)).toEqual(expected);
      }
      for (const owner of owners) expect(await readFile(owner.path, 'utf8')).toBe(owner.source);
      expect(await readFile(join(root, 'Consumer.php'), 'utf8')).toBe(disk);
      await request('shutdown', {}); notify('exit', {});
    } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
  }, 60_000,
);

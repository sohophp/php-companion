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
  'hydrates first variable Hover sources at PHP $phpVersion in $indexingMode', async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-variable-hover-')); let server: ChildProcessWithoutNullStreams | undefined;
    try {
      await mkdir(join(root, 'src'));
      const disk = '<?php', consumerPath = join(root, 'Consumer.php'), uri = pathToFileURL(consumerPath).toString();
      await writeFile(consumerPath, disk);
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Consumer.php'], 'psr-4': { 'External\\': 'src/' } } }));
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      const output = messagesFrom(server); let id = 1, version = 0;
      const notify = (method: string, params: unknown): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
      const request = async (method: string, params: unknown): Promise<any> => {
        const own = id++; server!.stdin.write(encode({ jsonrpc: '2.0', id: own, method, params }));
        const response = await output.waitFor(message => message.id === own); expect(response.error).toBeUndefined(); return response.result;
      };
      await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion, indexingMode, testMode: true } });
      notify('initialized', {});
      const open = async (source: string): Promise<void> => {
        version++;
        if (version === 1) notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version, text: source } });
        else notify('textDocument/didChange', { textDocument: { uri, version }, contentChanges: [{ text: source }] });
        await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === version);
      };
      await open(disk);
      const typeOf = (hover: any): string | null => hover?.contents?.value?.match(/\$\w+: ([^\n]*)/)?.[1] ?? null;
      const hoverAt = (source: string, variable = '$options'): { textDocument: { uri: string }; position: { line: number; character: number } } => ({ textDocument: { uri }, position: lspPosition(source, source.lastIndexOf(variable) + 2) });
      const cases: Array<[string, string, string | null]> = [
 ['ordinary array',"$options=External\\TYPE::$options;$options['mo'];",'array{mode: int}'],
 ['captured array',"$options=External\\TYPE::$options;$f=function()use($options){$options['mo'];};",'array{mode: int}'],
 ['bare argument',"$options=External\\TYPE::$options;$f=function()use($options){send($options);};",'array{mode: int}'],
 ['scalar capture',"$options=External\\TYPE::$scalar;$f=function()use($options){send($options);};",'string'],
 ['method capture',"$options=External\\TYPE::options();$f=function()use($options){send($options);};",'array{mode: int}'],
 ['instance property',"$config=new External\\TYPE();$options=$config->options;$f=function()use($options){send($options);};",'array{mode: int}'],
 ['nested capture',"$options=External\\TYPE::$options;$f=function()use($options){$g=function()use($options){send($options);};};",'array{mode: int}'],
 ['alias',"$options=External\\TYPE::$options;$copy=$options;$f=function()use($copy){send($copy);};",'array{mode: int}'],
 ['reference capture',"$options=External\\TYPE::$options;$f=function()use(&$options){send($options);};",null],
 ['shadow',"$options=External\\TYPE::$options;$f=function($options){send($options);};",null],
 ['unknown mutation',"$options=External\\TYPE::$options;$f=function()use($options){unknown($options);send($options);};",null],
 ['overwrite',"$options=External\\TYPE::$options;$f=function()use($options){$options=123;send($options);};",'int'],
 ['unset',"$options=External\\TYPE::$options;$f=function()use($options){unset($options);send($options);};",null],
];
      if (phpVersion === '8.5') cases.push(['arrow', "$options=External\\TYPE::$options;$f=fn()=>send($options);", 'array{mode: int}']);
      const owners: Array<[string, string]> = [];
      for (let index = 0; index < cases.length; index++) {
        const [name, body, expected] = cases[index], type = `HoverSource${index}`;
        const path = join(root, 'src', `${type}.php`);
        const ownerSource = `<?php namespace External;class ${type}{/** @var array{mode:int} */public static $options;/** @var string */public static $scalar;/** @var array{mode:int} */public $instanceOptions;/** @return array{mode:int} */public static function options(){return [];} }`;
        await writeFile(path, ownerSource); owners.push([path, ownerSource]);
        const source = ('<?php function send($value){} function run(){' + body + '}').replaceAll('TYPE', type).replace('->options', '->instanceOptions');
        await open(source);
        const variable = name === 'alias' ? '$copy' : '$options', params = hoverAt(source, variable);
        const hover = await request('textDocument/hover', params);
        expect(typeOf(hover), name).toBe(expected);
        if (expected) {
          const start = source.lastIndexOf(variable);
          expect(hover.range).toEqual({ start: lspPosition(source, start), end: lspPosition(source, start + variable.length) });
        }
      }
      const ownerPath = join(root, 'src', 'RefreshSource.php'), ownerUri = pathToFileURL(ownerPath).toString();
      const ownerSource = (type?: string): string => `<?php namespace External;class RefreshSource{${type ? `/** @var ${type} */` : ''}public static $options;}`;
      const ownerDisk = ownerSource('array{mode:int}'); await writeFile(ownerPath, ownerDisk);
      const captured = '<?php function run(){$options=External\\RefreshSource::$options;$f=function()use($options){send($options);};}';
      await open(captured); expect(typeOf(await request('textDocument/hover', hoverAt(captured)))).toBe('array{mode: int}');
      for (const [ownerVersion, type, expected] of [[1, 'string', 'string'], [2, undefined, null], [3, 'array{more:string}', 'array{more: string}']] as const) {
        if (ownerVersion === 1) notify('textDocument/didOpen', { textDocument: { uri: ownerUri, languageId: 'php', version: ownerVersion, text: ownerSource(type) } });
        else notify('textDocument/didChange', { textDocument: { uri: ownerUri, version: ownerVersion }, contentChanges: [{ text: ownerSource(type) }] });
        await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === ownerUri && message.params?.version === ownerVersion);
        expect(typeOf(await request('textDocument/hover', hoverAt(captured)))).toBe(expected);
      }
      notify('textDocument/didClose', { textDocument: { uri: ownerUri } });
      expect(typeOf(await request('textDocument/hover', hoverAt(captured)))).toBe('array{mode: int}');
      const method = 'hoverValueSources';
      const waitPaused = async (): Promise<void> => {
        const deadline = Date.now() + 5_000;
        while (Date.now() < deadline) {
          if ((await request('phpCompanion/testQueryState', { method, uri })).paused) return;
          await new Promise(done => setTimeout(done, 10));
        }
        throw new Error('Hover did not pause after declaration loading');
      };
      expect(await request('phpCompanion/testPauseNextQuery', { method })).toBe(true);
      const cancelledId = id, cancelled = request('textDocument/hover', hoverAt(captured)); await waitPaused();
      notify('$/cancelRequest', { id: cancelledId });
      expect(await request('phpCompanion/testReleaseQuery', { method })).toBe(true); expect(await cancelled).toBeNull();
      expect(await request('phpCompanion/testPauseNextQuery', { method })).toBe(true);
      const stale = request('textDocument/hover', hoverAt(captured)); await waitPaused();
      const replacement = captured.replace('send($options)', '$options=123;send($options)'); await open(replacement);
      expect(await request('phpCompanion/testReleaseQuery', { method })).toBe(true); expect(await stale).toBeNull();
      expect(typeOf(await request('textDocument/hover', hoverAt(replacement)))).toBe('int');
      expect(await readFile(ownerPath, 'utf8')).toBe(ownerDisk);
      for (const [path, source] of owners) expect(await readFile(path, 'utf8')).toBe(source);
      expect(await readFile(consumerPath, 'utf8')).toBe(disk);
      await request('shutdown', {}); notify('exit', {});
    } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
  }, 60_000,
);

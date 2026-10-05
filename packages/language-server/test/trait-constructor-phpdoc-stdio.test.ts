import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each([['7.2', 'onDemand'], ['7.2', 'experimental'], ['8.5', 'onDemand'], ['8.5', 'experimental']] as const)(
  'keeps Trait PHPDoc constructor contracts in an unsaved Composer document at PHP %s (%s)', async (phpVersion, indexingMode) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-trait-phpdoc-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Consumer\\': 'src/' } } }));
  const file = join(root, 'src', 'Editing.php'), uri = pathToFileURL(file).toString();
  const disk = '<?php namespace Consumer; // unchanged disk baseline\n';
  await writeFile(file, disk);
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.matches(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
      }
    }
  });
  const waitFor = (matches: (message: any) => boolean): Promise<any> => {
    const existing = messages.find(matches); if (existing) return Promise.resolve(existing);
    return new Promise((done, reject) => {
      const waiter = { matches, done: (message: any): void => { clearTimeout(timer); done(message); } };
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Trait constructor LSP response timed out')); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0, version = 0, queries = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const query = async (marked: string, expectedCodes: string[], signature?: string, completion?: string): Promise<void> => {
    const source = marked.replace('§', ''), offset = marked.indexOf('§'); version++;
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    const result = await request('textDocument/signatureHelp', { textDocument: { uri }, position: position(source, offset) }); queries++;
    expect(result?.signatures?.[0]?.label?.includes(signature ?? '') ?? false).toBe(Boolean(signature));
    if (completion) {
      const result = await request('textDocument/completion', { textDocument: { uri }, position: position(source, offset) });
      const items = Array.isArray(result) ? result : result.items;
      expect(items.some((item: any) => item.label === completion)).toBe(true);
    }
    const published = await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
    const codes = published.params.diagnostics.filter((item: any) => ['php.instantiation.invalid-target', 'php.instantiation.inaccessible-constructor',
      'php.argument.missing-required', 'php.argument.type-mismatch'].includes(item.code)).map((item: any) => item.code).sort();
    expect(codes, marked).toEqual(expectedCodes.sort());
  };
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: { textDocument: { completion: { completionItem: { snippetSupport: true } } } },
      initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
    send({ method: 'initialized', params: {} });
    if (indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage'
      && message.params?.message?.includes('complete=true'));
    const cases = [
      ['User', undefined, 'new \\Origin\\User()', 'new User()'],
      ['Selected', 'use Origin\\User as Selected;', 'new \\Origin\\User()', 'new User()'],
      ['?User', undefined, 'new \\Origin\\User()', 'new User()'],
      ['User[]', undefined, '[new \\Origin\\User()]', '[new User()]'],
      ['list<User>', undefined, '[new \\Origin\\User()]', '[new User()]'],
      ["array{'User':User, label:'User'}", undefined, "['User'=>new \\Origin\\User(),'label'=>'User']", "['User'=>new User(),'label'=>'User']"],
      ['class-string<User>', undefined, '\\Origin\\User::class', 'User::class'],
      ['callable(User $User):User', undefined, 'function(\\Origin\\User $User):\\Origin\\User{return $User;}', 'function(User $User):User{return $User;}'],
    ] as const;
    for (const [type, imports, good, bad] of cases) {
      const header = `<?php namespace Origin; ${imports??''} class User {} trait Init {/** @param ${type} $value */ public function __construct($value){}}
        namespace Consumer; class User {} class C {use \\Origin\\Init;}`;
      await query(header+` new C(${good}); §`, []);
      await query(header+` new C(${bad}); §`, ['php.argument.type-mismatch']);
      await query(header+' new C(§);', ['php.argument.missing-required'], 'Origin\\User', phpVersion==='8.5' ? 'value:' : undefined);
    }
    const self = '<?php namespace Origin; trait Init {/** @param self $value */ public function __construct($value){}} namespace Consumer; class User {} class C {use \\Origin\\Init;}';
    await query(self+' function run(C $good){new C($good§);}', [], 'Consumer\\C');
    await query(self+' new C(new User()); §', ['php.argument.type-mismatch']);
    const parent = '<?php namespace Origin; class Root {} trait Init {/** @param parent $value */ public function __construct($value){}} namespace Consumer; use Origin\\Root as Base; class User {} class C extends Base {use \\Origin\\Init;}';
    await query(parent+' new C(new Base()§);', [], 'Origin\\Root');
    await query(parent+' new C(new User()); §', ['php.argument.type-mismatch']);
    const repeated = '<?php namespace One {class User {}} namespace Two {class User {}} namespace Origin {use One\\User as Selected; trait First {/** @param Selected $value */ public function __construct($value){}}} namespace Origin {use Two\\User as Selected; trait Init {/** @param Selected $value */ public function __construct($value){}}} namespace Consumer {class C {use \\Origin\\Init;}';
    await query(repeated+' new C(new \\Two\\User()§);}', [], 'Two\\User');
    const template = '<?php namespace Origin; class User {} trait Init {/** @template T of User\n * @param T $value */ public function __construct($value){}} namespace Consumer; class T {} class User {} class C {use \\Origin\\Init;}';
    await query(template+' new C(new \\Origin\\User()); §', []);
    await query(template+' new C(new User()); §', ['php.argument.type-mismatch']);
    await query('<?php namespace Origin; /** @template T */ trait Init {/** @param T $value */ public function __construct($value){}} namespace Consumer; class T {} class C {use \\Origin\\Init;} new C(42§);', [], '$value');
    await query('<?php namespace Origin; trait Init {/** @param Missing $value */ public function __construct($value){}} namespace Consumer; class Missing {} class C {use \\Origin\\Init;} new C(42§);', [], 'Origin\\Missing');
    await query('<?php namespace Origin; class Selected {} /** @phpstan-type Selected array{value:int} */ trait Init {/** @param Selected $value */ public function __construct($value){}} namespace Consumer; class C {use \\Origin\\Init;} new C(42§);', [], '$value');
    expect(queries).toBe(34); expect(version).toBe(34);
    expect(await readFile(file, 'utf8')).toBe(disk);
    console.log(JSON.stringify({ phpVersion, indexingMode, queries, diagnosticVersions: version, diskUnchanged: true }));
  } finally {
    if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});

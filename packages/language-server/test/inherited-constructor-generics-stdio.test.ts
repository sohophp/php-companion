import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each([['7.2', 'onDemand'], ['7.2', 'experimental'], ['8.1', 'onDemand'], ['8.1', 'experimental'], ['8.5', 'onDemand'], ['8.5', 'experimental']] as const)(
  'keeps inherited generic constructor contracts in an unsaved Composer document at PHP %s (%s)', async (phpVersion, indexingMode) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-inherited-generics-'));
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
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Inherited constructor LSP response timed out')); }, 15_000);
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
      if (completion.startsWith('$')) expect(items[0]?.label).toBe(completion);
      else expect(items.some((item: any) => item.label === completion)).toBe(true);
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
      ['T', 'new \\Origin\\User()', 'new User()'],
      ['?T', 'null', 'new User()'],
      ['T[]', '[new \\Origin\\User()]', '[new User()]'],
      ['list<T>', '[new \\Origin\\User()]', '[new User()]'],
      ["array{T:T, label:'T'}", "['T'=>new \\Origin\\User(),'label'=>'T']", "['T'=>new User(),'label'=>'T']"],
      ['class-string<T>', '\\Origin\\User::class', 'User::class'],
      ['callable(T $T):T', 'function(\\Origin\\User $T):\\Origin\\User{return $T;}', 'function(User $T):User{return $T;}'],
    ] as const;
    for (const [type,good,bad] of cases) {
      const header = `<?php namespace Origin; class User {} /** @template T */ class Box {/** @param ${type} $value */ public function __construct($value){}}
        namespace Consumer; class User {} /** @extends \\Origin\\Box<\\Origin\\User> */ class C extends \\Origin\\Box {}`;
      await query(header+` new C(${good}); §`, []);
      await query(header+` new C(${bad}); §`, ['php.argument.type-mismatch']);
      await query(header+' new C(§);', ['php.argument.missing-required'], 'Origin\\User', phpVersion!=='7.2' ? 'value:' : undefined);
    }
    const union = '<?php /** @template T */ class Box {/** @param T[] $value */ public function __construct(array $value){}} /** @extends Box<int|string> */ class C extends Box {}';
    await query(union+' new C([1,"ok"]); §', []);
    await query(union+' new C([true]); §', ['php.argument.type-mismatch']);
    await query(union+' new C(§);', ['php.argument.missing-required'], '(int|string)[]', phpVersion!=='7.2' ? 'value:' : undefined);
    const method = '<?php namespace Origin; class User {} /** @template T */ class Box {/** @template U of T\n * @param U $value */ public function __construct($value){}} namespace Consumer; class User {} class U {} /** @extends \\Origin\\Box<\\Origin\\User> */ class C extends \\Origin\\Box {}';
    await query(method+' new C(new \\Origin\\User()); §', []);
    await query(method+' new C(new User()); §', ['php.argument.type-mismatch']);
    await query(method+' new C(§);', ['php.argument.missing-required'], 'U $value', phpVersion!=='7.2' ? 'value:' : undefined);
    const nested = '<?php namespace Origin; class User {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} /** @template U\n * @extends Box<U> */ class Middle extends Box {} namespace Consumer; use Origin\\Middle as ParentBox; use Origin\\User as Selected; class User {} /** @extends ParentBox<Selected> */ class C extends ParentBox {}';
    await query(nested+' new C(new \\Origin\\User()); §', []);
    await query(nested+' new C(new User()); §', ['php.argument.type-mismatch']);
    await query(nested+' new C(§);', ['php.argument.missing-required'], 'Origin\\User', phpVersion!=='7.2' ? 'value:' : undefined);
    for (const doc of ['', '/** @extends Box<Missing> */', '/** @extends Box<User,User> */', '/** @extends Box<User>\n * @extends Box<Other> */']) {
      await query(`<?php class T {} class User {} class Other {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} ${doc} class C extends Box {} new C(42§);`, [], '$value');
    }
    await query(nested+' function run(User $offerA,\\Origin\\User $offerZ){new C($offer§);}', [], 'Origin\\User', '$offerZ');
    expect(queries).toBe(35); expect(version).toBe(35);
    expect(await readFile(file, 'utf8')).toBe(disk);
    console.log(JSON.stringify({ phpVersion, indexingMode, queries, diagnosticVersions: version, diskUnchanged: true }));
  } finally {
    if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].flatMap(indexingMode => [false, true].map(controlled => ({phpVersion, indexingMode, controlled}))));

it.each(cases)('plans and revalidates Move Member at PHP $phpVersion in $indexingMode mode (controlled=$controlled)', async ({phpVersion, indexingMode, controlled}) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-move-member-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({autoload: {'psr-4': {'App\\': 'src/'}}}));
  const source = '<?php namespace App; final class Utility {public static function format(int $value): int {return Dependency::TOKEN + $value;}}';
  const target = '<?php namespace App; final class Receiver {}';
  const dependency = '<?php namespace App; class Dependency {public const TOKEN = 1;}';
  const caller = '<?php namespace App; class Caller {public function run(): int {return Utility::format(2);}}';
  const files = new Map<string, string>();
  for (const [name, text] of [['Utility', source], ['Receiver', target], ['Dependency', dependency], ['Caller', caller]]) {
    const path = join(root, 'src', `${name}.php`); await writeFile(path, text!); files.set(pathToFileURL(path).toString(), text!);
  }
  const uri = pathToFileURL(join(root, 'src', 'Utility.php')).toString();
  const targetUri = pathToFileURL(join(root, 'src', 'Receiver.php')).toString();
  const callerUri = pathToFileURL(join(root, 'src', 'Caller.php')).toString();
  const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm',
    resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], {stdio: 'pipe'});
  const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
  const pending = new Map<number, {done: (message: any) => void}>(); let id = 0, stderr = '';
  server.stderr.on('data', (chunk: Buffer) => {stderr += chunk.toString();});
  server.stdout.on('data', (chunk: Buffer) => {for (const message of decoder.push(chunk) as any[]) pending.get(message.id)?.done(message);});
  const send = (message: object): void => {server.stdin.write(encodeLspMessage({jsonrpc: '2.0', ...message}));};
  const request = (method: string, params: object | null): Promise<any> => {
    const requestId = ++id;
    return new Promise((done, reject) => {
      const timer = setTimeout(() => {pending.delete(requestId);reject(new Error(`${method} timed out: ${stderr}`));}, 15000);
      pending.set(requestId, {done: message => {clearTimeout(timer);pending.delete(requestId);if (message.error) reject(new Error(JSON.stringify(message.error)));else done(message.result);}});
      send({id: requestId, method, params});
    });
  };
  const position = {line: 0, character: source.indexOf('format(') + 1};
  let version = 1;
  const plan = (): Promise<any> => request('phpCompanion/moveMember', {textDocument: {uri, version}, position, targetClass: 'App\\Receiver'});
  const valid = (value: any): Promise<boolean> => request('phpCompanion/validateMoveMember', {
    textDocument: {uri, version}, position, targetClass: value.phpCompanion.moveMember.targetClass, planHash: value.phpCompanion.moveMember.planHash,
  });
  try {
    await request('initialize', {processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: {phpVersion, indexingMode, testMode: controlled}});
    send({method: 'initialized', params: {}});
    send({method: 'textDocument/didOpen', params: {textDocument: {uri, languageId: 'php', version, text: source}}});
    const first = await plan(); expect(first).not.toBeNull(); expect(Object.keys(first.changes).sort()).toEqual([uri, targetUri, callerUri].sort());
    expect(first.phpCompanion.moveMember).toEqual({targetClass: 'App\\Receiver', callable: 'App\\Utility::format', planHash: expect.stringMatching(/^[a-f0-9]{64}$/)});
    expect(first.phpCompanion.sourceHashes).toEqual(Object.fromEntries([...files].filter(([key]) => key !== pathToFileURL(join(root, 'src', 'Dependency.php')).toString())
      .map(([key, text]) => [key, createHash('sha256').update(text).digest('hex')])));
    expect(await valid(first)).toBe(true);
    for (const invalid of [{line: -1, character: 0}, {line: 0, character: 0.5}, {line: 99, character: 0}])
      expect(await request('phpCompanion/moveMember', {textDocument: {uri, version}, position: invalid, targetClass: 'App\\Receiver'})).toBeNull();
    expect(await request('phpCompanion/moveMember', {textDocument: {uri, version: 0}, position, targetClass: 'App\\Receiver'})).toBeNull();
    expect(await request('phpCompanion/validateMoveMember', {textDocument: {uri, version}, position, targetClass: 'App\\Receiver', planHash: '0'.repeat(64)})).toBe(false);
    // No watcher notification: preview revalidation must independently discover the new caller.
    const extraPath = join(root, 'src', 'Extra.php'), extraUri = pathToFileURL(extraPath).toString();
    const extra = '<?php namespace App; function extra(): int {return Utility::format(3);}';
    await writeFile(extraPath, extra);
    expect(await valid(first)).toBe(false);
    const withExtra = await plan(); expect(withExtra.changes[extraUri]).toBeDefined(); expect(await valid(withExtra)).toBe(true);
    await writeFile(join(root, 'src', 'Receiver.php'), target.replace('{}', '{public static function format(int $value): int {return $value;}}'));
    expect(await valid(withExtra)).toBe(false); expect(await plan()).toBeNull();
    await writeFile(join(root, 'src', 'Receiver.php'), target);
    const restored = await plan(); expect(restored).not.toBeNull(); expect(await valid(restored)).toBe(true);
    await writeFile(join(root, 'src', 'Dependency.php'), dependency.replace('public const', 'private const'));
    expect(await valid(restored)).toBe(false); expect(await plan()).toBeNull();
    await writeFile(join(root, 'src', 'Dependency.php'), dependency);
    const beforeEdit = await plan(); expect(beforeEdit).not.toBeNull();
    version += 1;
    send({method: 'textDocument/didChange', params: {textDocument: {uri, version}, contentChanges: [{text: `${source}\n// current unsaved buffer`} ]}});
    expect(await valid(beforeEdit)).toBe(false);
    const afterEdit = await plan(); expect(afterEdit).not.toBeNull(); expect(await valid(afterEdit)).toBe(true);
    expect(afterEdit.phpCompanion.sourceHashes[uri]).toBe(createHash('sha256').update(`${source}\n// current unsaved buffer`).digest('hex'));
    if (controlled) {
      const pause = 'moveMemberDiskRefresh';
      expect(await request('phpCompanion/testPauseNextQuery', {method: pause})).toBe(true);
      const cancelledId = id + 1, held = plan();
      const deadline = Date.now() + 5000;
      let paused = false;
      while (Date.now() < deadline) {
        const state = await request('phpCompanion/testQueryState', {method: pause, uri});
        if (state?.paused) {paused = true;break;}
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(paused, 'Move Member did not reach the real checked-source pause').toBe(true);
      send({method: '$/cancelRequest', params: {id: cancelledId}});
      expect(await request('phpCompanion/testReleaseQuery', {method: pause})).toBe(true);
      expect(await held).toBeNull();
      const fresh = await plan(); expect(fresh).not.toBeNull(); expect(await valid(fresh)).toBe(true);
    }
    expect(await readFile(join(root, 'src', 'Utility.php'), 'utf8')).toBe(source);
    expect(await readFile(extraPath, 'utf8')).toBe(extra);
    await request('shutdown', null); send({method: 'exit', params: {}}); expect((await exited)[0], stderr).toBe(0); expect(stderr).toBe('');
  } finally {
    if (server.exitCode === null && server.signalCode === null) {server.kill();await exited;}
    await rm(root, {recursive: true, force: true});
  }
});

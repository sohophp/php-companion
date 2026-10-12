import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].flatMap(indexingMode => [false, true].map(controlled => ({phpVersion, indexingMode, controlled}))));

it.each(cases)('revalidates unedited callee stack effects at PHP $phpVersion in $indexingMode mode (controlled=$controlled)', async ({phpVersion, indexingMode, controlled}) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-move-member-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({autoload: {'psr-4': {'App\\': 'src/'}}}));
  const source = '<?php namespace App; final class Utility {public static function format(int $value): int {return Helper::value($value);}}';
  const target = '<?php namespace App; final class Receiver {}';
  const dependency = '<?php namespace App; class Dependency {public const TOKEN = 1;}';
  const caller = '<?php namespace App; class Caller {public function run(): int {return Utility::format(2);}}';
  const helper = '<?php namespace App; final class Helper {public static function value(int $value): int {return $value + 1;}}';
  const helperUri = pathToFileURL(join(root, 'src', 'Helper.php')).toString();
  const files = new Map<string, string>();
  for (const [name, text] of [['Utility', source], ['Receiver', target], ['Dependency', dependency], ['Caller', caller], ['Helper', helper]]) {
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
  const version = 1;
  const plan = (): Promise<any> => request('phpCompanion/moveMember', {textDocument: {uri, version}, position, targetClass: 'App\\Receiver'});
  const valid = (value: any): Promise<boolean> => request('phpCompanion/validateMoveMember', {
    textDocument: {uri, version}, position, targetClass: value.phpCompanion.moveMember.targetClass, planHash: value.phpCompanion.moveMember.planHash,
  });

  try {
    await request('initialize', {processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: {phpVersion, indexingMode, testMode: controlled}});
    send({method: 'initialized', params: {}});
    send({method: 'textDocument/didOpen', params: {textDocument: {uri, languageId: 'php', version, text: source}}});
    const first = await plan(); expect(first).not.toBeNull();
    expect(Object.keys(first.changes).sort()).toEqual([uri, targetUri, callerUri].sort());
    expect(first.phpCompanion.sourceHashes[helperUri]).toBeUndefined();
    expect(await valid(first)).toBe(true);
    const observer = "\\debug_backtrace()[1]['class'] === Utility::class ? $value + 1 : $value + 2";
    const unsafe = [
      helper.replace('return $value + 1;', `return ${observer};`),
      `<?php namespace App; final class Helper {public static function value(int $value): int {return self::nested($value);} private static function nested(int $value): int {return ${observer};}}`,
      `<?php namespace App; final class Helper {public static function value(int $value): int {return call_user_func([self::class, 'nested'], $value);} private static function nested(int $value): int {return ${observer};}}`,
    ];
    unsafe.push(
      '<?php namespace App; final class Helper {public static function value(int $value): int {$item=new Inspector(); return $value + 1;}} final class Inspector {public function __destruct() {\\debug_print_backtrace();}}',
      "<?php namespace App; final class Helper {public static function value(int $value): int {return (string) new Inspector() === Utility::class ? $value + 1 : $value + 2;}} final class Inspector {public function __toString(): string {return \\debug_backtrace()[2]['class'];}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {return (new Inspector())->result;}} /** @property-read int $result */ final class Inspector {public function __get($name): int {return \\debug_backtrace()[2]['class'] === Utility::class ? 3 : 4;}}",
    );
    if (Number(phpVersion) >= 8.4) unsafe.push(
      "<?php namespace App; final class Helper {public static function value(int $value): int {return (new Inspector())->result;}} final class Inspector {public $result {get => \\debug_backtrace()[2]['class'] === Utility::class ? 3 : 4;}}",
    );
    unsafe.push(
      "<?php namespace App; final class Helper {public static function value(int $value): int {echo new Inspector(); return $value + 1;}} final class Inspector {public function __toString(): string {return \\debug_backtrace()[2]['class'];}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {print new Inspector(); return $value + 1;}} final class Inspector {public function __toString(): string {return \\debug_backtrace()[2]['class'];}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {return (clone new Inspector())->result;}} final class Inspector {public $result=3; public function __clone() {$this->result=\\debug_backtrace()[2]['class'] === Utility::class ? 3 : 4;}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {return isset((new Inspector())->result) ? 3 : 4;}} /** @property-read int $result */ final class Inspector {public function __isset($name): bool {return \\debug_backtrace()[2]['class'] === Utility::class;}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {$item=new Inspector(); unset($item->value); return $item->result;}} /** @property string $value */ final class Inspector {public $result=3; public function __unset($name): void {$this->result=\\debug_backtrace()[2]['class'] === Utility::class ? 3 : 4;}}",
    );
    if (Number(phpVersion) >= 8) unsafe.push(
      "<?php namespace App; final class Helper {public static function value(int $value): int {foreach(new Inspector() as $item){return $item;}return 0;}} final class Inspector implements \\Iterator {private int $n=0; public function rewind():void {$this->n=0;} public function next():void {$this->n++;} public function valid():bool {return $this->n===0;} public function key():mixed {return 0;} public function current():mixed {return \\debug_backtrace()[2]['class'] === Utility::class ? 3 : 4;}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {return (new Inspector())['value'];}} final class Inspector implements \\ArrayAccess {public function offsetExists(mixed $key):bool {return true;} public function offsetGet(mixed $key):mixed {return \\debug_backtrace()[2]['class'] === Utility::class ? 3 : 4;} public function offsetSet(mixed $key,mixed $value):void {} public function offsetUnset(mixed $key):void {}}",
    );
    unsafe.push(
      "<?php namespace App; final class Helper {public static function value(int $value): int {return count(new Inspector());}} final class Inspector implements \\Countable {public function count(): int {return \\array_column(\\debug_backtrace(), 'class')[2] === Utility::class ? 3 : 4;}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {return strpos(serialize(new Inspector()), Utility::class) !== false ? 3 : 4;}} final class Inspector {public $caller='stable';public function __sleep(): array {$this->caller=\\array_column(\\debug_backtrace(), 'class')[2];return ['caller'];}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {return json_encode(new Inspector()) === json_encode(Utility::class) ? 3 : 4;}} final class Inspector implements \\JsonSerializable {public function jsonSerialize(): string {return \\array_column(\\debug_backtrace(), 'class')[2];}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {return strpos(print_r(new Inspector(), true), Utility::class) !== false ? 3 : 4;}} final class Inspector {public function __debugInfo(): array {return ['caller'=>\\array_column(\\debug_backtrace(), 'class')[2]];}}",
      "<?php namespace App; final class Helper {public static function value(int $value): int {$GLOBALS['moveMemberException']=new \\RuntimeException();return $value + 1;}}",
    );
    if (Number(phpVersion) >= 7.4) unsafe.push("<?php namespace App; final class Helper {public static function value(int $value): int {return strpos(serialize(new Inspector()), Utility::class) !== false ? 3 : 4;}} final class Inspector {public function __serialize(): array {return ['caller'=>\\array_column(\\debug_backtrace(), 'class')[2]];}}");
    for (const text of unsafe) {
      // No watcher notification and no edit to any preview participant.
      await writeFile(join(root, 'src', 'Helper.php'), text);
      expect(await valid(first)).toBe(false); expect(await plan()).toBeNull();
      expect(await readFile(join(root, 'src', 'Helper.php'), 'utf8')).toBe(text);
      for (const [key, original] of files) if (key !== helperUri)
        expect(await readFile(new URL(key), 'utf8')).toBe(original);
      await writeFile(join(root, 'src', 'Helper.php'), helper);
      const restored = await plan(); expect(restored).not.toBeNull(); expect(await valid(restored)).toBe(true);
    }
    const unusedMagic = '<?php namespace App; final class Helper {public static function value(int $value): int {return (new Inspector())->result;}} final class Inspector {public $result=3; public function __destruct() {} public function __get($name) {return \\debug_backtrace();} public function __toString(): string {return \\debug_backtrace()[1]["class"];}}';
    await writeFile(join(root, 'src', 'Helper.php'), unusedMagic);
    const pureMagic = await plan(); expect(pureMagic).not.toBeNull(); expect(await valid(pureMagic)).toBe(true);
    await writeFile(join(root, 'src', 'Helper.php'), helper);
    send({method: 'textDocument/didOpen', params: {textDocument: {uri: helperUri, languageId: 'php', version: 1, text: unsafe[0]}}});
    expect(await valid(first)).toBe(false); expect(await plan()).toBeNull();
    expect(await readFile(join(root, 'src', 'Helper.php'), 'utf8')).toBe(helper);
    send({method: 'textDocument/didChange', params: {textDocument: {uri: helperUri, version: 2}, contentChanges: [{text: helper}]}});
    const restoredBuffer = await plan(); expect(restoredBuffer).not.toBeNull(); expect(await valid(restoredBuffer)).toBe(true);
    send({method: 'textDocument/didClose', params: {textDocument: {uri: helperUri}}});
    const restoredDisk = await plan(); expect(restoredDisk).not.toBeNull(); expect(await valid(restoredDisk)).toBe(true);
    if (controlled) {
      const pause = 'moveMemberDiskRefresh';
      expect(await request('phpCompanion/testPauseNextQuery', {method: pause})).toBe(true);
      const cancelledId = id + 1, held = plan();
      const deadline = Date.now() + 5000; let paused = false;
      while (Date.now() < deadline) {
        const state = await request('phpCompanion/testQueryState', {method: pause, uri});
        if (state?.paused) {paused = true;break;}
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(paused).toBe(true); send({method: '$/cancelRequest', params: {id: cancelledId}});
      expect(await request('phpCompanion/testReleaseQuery', {method: pause})).toBe(true);
      expect(await held).toBeNull(); const fresh = await plan(); expect(fresh).not.toBeNull(); expect(await valid(fresh)).toBe(true);
    }
    for (const [key, original] of files) expect(await readFile(new URL(key), 'utf8')).toBe(original);
    await request('shutdown', null); send({method: 'exit', params: {}});
    expect((await exited)[0], stderr).toBe(0); expect(stderr).toBe('');
  } finally {
    if (server.exitCode === null && server.signalCode === null) {server.kill();await exited;}
    await rm(root, {recursive: true, force: true});
  }
});

import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const declarations = '<?php interface Handler {} class Ready implements Handler { public function onlyReady(): void {} }';
const overloads = 'function registerHandler(Handler $handler, bool $shutdown = true): bool {} function registerHandler(callable $open, callable $close): bool {}';
for (const deferred of [false, true]) it.each([
  { name: 'value overload selected by arity', builtin: true, functions: overloads, call: 'registerHandler($item)', expected: true },
  { name: 'reference overload with matching arity', builtin: true, functions: overloads + ' function registerHandler(Handler &$handler): bool {}', call: 'registerHandler($item)', expected: false },
  { name: 'unknown named argument', builtin: true, functions: overloads, call: 'registerHandler(other: $item)', expected: false },
  { name: 'unknown unpacking', builtin: true, functions: overloads, call: 'registerHandler(...$item)', expected: false },
  { name: 'duplicate project declarations', builtin: false, functions: overloads, call: 'registerHandler($item)', expected: false },
])('retains only proven value bindings for $name (deferred=' + deferred + ')', ({ builtin, functions, call, expected }) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///ValueOverloadConsumer.php';
  try {
    workspace.update(builtin ? 'php-companion-builtin:/value-overload.php' : 'file:///Declarations.php', declarations + functions, true);
    const source = '<?php function run(): void { $item = new Ready(); ' + call + '; $item->onlyReady(); }';
    if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
    expect(workspace.memberAt(uri, source.lastIndexOf('onlyReady') + 2)?.name).toBe(expected ? 'onlyReady' : undefined);
  } finally { workspace.dispose(); }
});

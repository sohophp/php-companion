import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each([false, true])('recognizes hook keyword scope with retained tree %s', retainTree => {
  const workspace = new SemanticWorkspace(parser);
  const uri = 'file:///HookKeywords.php';
  const cases: Array<[string, boolean, 'get' | 'set' | undefined]> = [
    ['<?php class C { public mixed $name { get { r§; } } }', true, 'get'],
    ['<?php class C { public mixed $name { set { r§; } } }', true, 'set'],
    ['<?php class C { public mixed $name { set(string $incoming) { r§; } } }', true, 'set'],
    ['<?php class C { public mixed $name { get { r§', true, 'get'],
    ['<?php class C { public mixed $name { set { r§', true, 'set'],
    ['<?php class C { public mixed $name { get { if (true) { r§; } } } }', true, 'get'],
    ['<?php class C { public mixed $name { get { $callback = function () { yie§; }; } } }', true, undefined],
    ['<?php class C { public function f() { r§; } }', true, undefined],
    ['<?php class C { r§; }', false, undefined],
    ['<?php r§;', false, undefined],
  ];
  for (const [marked, callable, hook] of cases) {
    workspace.update(uri, marked.replace('§', ''), retainTree);
    const context = workspace.phpKeywordCompletionContext(uri, marked.indexOf('§'));
    expect(context?.inCallable, marked).toBe(callable);
    expect(context?.propertyHookKind, marked).toBe(hook);
  }
});

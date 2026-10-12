import {afterAll, beforeAll, expect, it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => {parser = await PhpSyntaxParser.createDefault();});
afterAll(() => parser.dispose());
const root = 'file:///move-callback-stack/';
const callback = '[\\Support\\Inspector::class, "helper"]';
const invocations = [
  ['call_user_func', `\\call_user_func(${callback})`],
  ['call_user_func_array', `\\call_user_func_array(${callback}, [])`],
  ['Closure::fromCallable', `\\Closure::fromCallable(${callback})()`],
  ['named call_user_func', `\\call_user_func(callback: ${callback})`],
  ['named call_user_func_array', `\\call_user_func_array(args: [], callback: ${callback})`],
  ['named Closure::fromCallable', `\\Closure::fromCallable(callback: ${callback})()`],
  ['typed array_map callback', `\\array_map(${callback}, [])`],
] as const;
it.each(invocations.flatMap(([label, expression]) => [false, true].flatMap(tracing => [false, true]
  .map(deferred => ({label, expression, tracing, deferred})))))(
  '$label follows callback identity, tracing=$tracing, deferred=$deferred', ({expression, tracing, deferred}) => {
    const source = `<?php namespace A; final class Source {public static function observe() {return ${expression};}}`;
    const files = new Map([
      [root + 'Source.php', source],
      [root + 'Target.php', '<?php namespace B; final class Target {}'],
      [root + 'Support.php', `<?php namespace Support; final class Inspector {public static function helper() {return ${tracing ? '\\debug_backtrace()' : '"stable"'};}}`],
      [root + 'Caller.php', '<?php return \\A\\Source::observe();'],
    ]);
    const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('8.5');
    workspace.update('php-companion-builtin:callback-stack', `<?php
function debug_backtrace(int $options = 1, int $limit = 0): array {}
function call_user_func($callback, ...$args) {} function call_user_func_array($callback, array $args) {}
function array_map(?callable $callback, array $array, array ...$arrays): array {}
class Closure {public static function fromCallable(callable $callback): Closure {}}`, true);
    for (const [uri, text] of files) {
      if (deferred) workspace.updateDeclarations(uri, text);
      else workspace.update(uri, text, true);
    }
    try {
      const plan = workspace.moveStaticMethod(root + 'Source.php', source.indexOf('observe(') + 1, 'B\\Target');
      if (tracing) expect(plan).toBeUndefined();
      else expect(plan).toBeDefined();
      for (const [uri, text] of files) expect(workspace.source(uri)).toBe(text);
    } finally {workspace.dispose();}
  },
);

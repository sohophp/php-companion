import {afterAll, beforeAll, expect, it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => {parser = await PhpSyntaxParser.createDefault();});
afterAll(() => parser.dispose());
const root = 'file:///move-string-callback/';
const cases = [
  ['function', '\\call_user_func("helper")'],
  ['static method', '\\call_user_func("Inspector::helper")'],
  ['static array dispatch', '\\call_user_func_array("Inspector::helper", [])'],
  ['static closure dispatch', '\\Closure::fromCallable("Inspector::helper")()'],
] as const;
it.each(cases.flatMap(([label, expression]) => [false, true].flatMap(tracing => [false, true]
  .map(deferred => ({label, expression, tracing, deferred})))))(
  '$label string callback, tracing=$tracing, deferred=$deferred', ({expression, tracing, deferred}) => {
    const source = `<?php namespace A; final class Source {public static function observe() {return ${expression};}}`;
    const value = tracing ? '\\debug_backtrace()' : '"stable"';
    const files = new Map([
      [root + 'Source.php', source], [root + 'Target.php', '<?php namespace B; final class Target {}'],
      [root + 'Support.php', `<?php function helper() {return ${value};} final class Inspector {public static function helper() {return ${value};}}`],
      [root + 'Caller.php', '<?php return \\A\\Source::observe();'],
    ]);
    const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('8.5');
    workspace.update('php-companion-builtin:string-callback-stack', '<?php function debug_backtrace(int $options=1,int $limit=0): array {} function call_user_func($callback,...$args) {} function call_user_func_array($callback,array $args) {} class Closure {public static function fromCallable(callable $callback): Closure {}}', true);
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

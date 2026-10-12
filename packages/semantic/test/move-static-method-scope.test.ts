import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const root = 'file:///caller-scope/';
const sourceUri = root + 'Source.php', targetUri = root + 'Target.php', callerUri = root + 'Caller.php';
const builtins = `<?php
function get_class($object = null): string {} function get_parent_class($object = null) {}
function get_class_vars(string $class): array {} function get_object_vars(object $object): array {}
function get_class_methods($class): array {} function is_callable($callback): bool {}
function call_user_func($callback, ...$args) {} function call_user_func_array($callback, array $args) {}
class Closure { public static function fromCallable(callable $callback): Closure {} }
`;
const scenarios = [
  ['lexical class', 'get_class()', false],
  ['lexical parent', 'get_parent_class()', false],
  ['explicit object class', 'get_class(new \\C\\PublicData())', true],
  ['explicit object parent', 'get_parent_class(new \\C\\PublicData())', true],
  ['private class properties', 'get_class_vars(self::class)', false],
  ['private instance properties', 'get_object_vars(new self())', false],
  ['private class methods', 'get_class_methods(self::class)', false],
  ['public class properties', 'get_class_vars(\\C\\PublicData::class)', true],
  ['public object properties', 'get_object_vars(new \\C\\PublicData())', true],
  ['public class methods', 'get_class_methods(\\C\\PublicData::class)', true],
  ['private callback availability', "is_callable([self::class, 'secret'])", false],
  ['private function callback', "call_user_func([self::class, 'secret'])", false],
  ['private function array callback', "call_user_func_array([self::class, 'secret'], [])", false],
  ['private closure callback', "\\Closure::fromCallable([self::class, 'secret'])()", false],
  ['public callback availability', "is_callable([\\C\\PublicData::class, 'value'])", true],
  ['public function callback', "call_user_func([\\C\\PublicData::class, 'value'])", true],
  ['public function array callback', "call_user_func_array([\\C\\PublicData::class, 'value'], [])", true],
  ['public closure callback', "\\Closure::fromCallable([\\C\\PublicData::class, 'value'])()", true],
  ['original private destination constructor', 'new \\B\\Target()', false],

  ['named object class', 'get_class(object: new \\C\\PublicData())', true],
  ['named class parent', 'get_parent_class(object_or_class: \\C\\PublicData::class)', true],
  ['named class properties', 'get_class_vars(class: \\C\\PublicData::class)', true],
  ['named public callback availability', "is_callable(value: [\\C\\PublicData::class, 'value'])", true],
  ['named public closure callback', "\\Closure::fromCallable(callback: [\\C\\PublicData::class, 'value'])()", true],
] as const;
it.each(scenarios)('preserves caller scope: %s', (label, expression, safe) => {
  const sources = new Map([
    [sourceUri, `<?php namespace A; class ParentA {} final class Source extends ParentA {
private $hidden = 1; protected $protected = 2; public $open = 3;
private static function secret() { return 42; }
public static function observe() { return ${expression}; }
}`],
    [targetUri, `<?php namespace B; class ParentB {} final class Target extends ParentB { ${label === 'original private destination constructor' ? 'private function __construct() {}' : ''} }`],
    [root + 'PublicData.php', `<?php namespace C; class PublicBase {} class PublicData extends PublicBase {public $open = 3; public static function value() {return 42;}}`],
    [callerUri, '<?php return \\A\\Source::observe();'],
  ]);
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('8.5');
  workspace.update('php-companion-builtin:caller-scope', builtins, true);
  for (const [uri, source] of sources) workspace.update(uri, source, true);

  try {
    const source = sources.get(sourceUri)!;
    const plan = workspace.moveStaticMethod(sourceUri, source.indexOf('observe(') + 1, 'B\\Target');
    if (!safe) expect(plan, label).toBeUndefined();
    else {
      expect(plan, label).toBeDefined();
      const changed = new Map([...sources].map(([uri, text]) => [uri, plan!.edits.filter(edit => edit.uri === uri)
        .sort((left, right) => right.start - left.start).reduce((value, edit) => value.slice(0, edit.start) + edit.newText + value.slice(edit.end), text)]));
      expect(changed.get(sourceUri)).not.toContain('function observe(');
      expect(changed.get(targetUri)).toContain('function observe(');
      expect(changed.get(callerUri)).toContain('\\B\\Target::observe()');
    }
    for (const [uri, source] of sources) expect(workspace.source(uri)).toBe(source);
  } finally {workspace.dispose();}
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace, type MoveMemberInfo } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const root = 'file:///move-member/';
const sourceUri = `${root}Source.php`, targetUri = `${root}Target.php`, callerUri = `${root}Caller.php`, definitionsUri = `${root}Definitions.php`;
const source = `<?php declare(strict_types=1);
namespace Domain\\Source;
use Domain\\Data\\Payload as Item;
use function Domain\\Support\\decorate as decorateValue;
use const Domain\\Support\\PREFIX as MARK;
class UtilityParent { public const TOKEN = 'parent'; }
final class Utility extends UtilityParent {
    public const TOKEN = 'owner';
    /**
     * @param Item $item
     * @return string
     */
    public static function render(Item $item, int $n = 1): string {
        if ($n > 1) return self::render($item, $n - 1);
        return decorateValue(MARK . ':' . parent::TOKEN . ':' . self::TOKEN . ':' . $item->value());
    }
}`;
const target = `<?php declare(strict_types=1);
namespace Destination;
use Domain\\Other\\Wrong as Item;
use function Domain\\Other\\wrong as decorateValue;
use const Domain\\Other\\WRONG as MARK;
final class Receiver {}`;
const caller = `<?php declare(strict_types=1);
namespace Consumer;
use Domain\\Source\\Utility as U;
use Domain\\Data\\Payload;
function run(): string { return U::render(new Payload(), 2); }`;
const definitions = `<?php declare(strict_types=1);
namespace Domain\\Data { final class Payload { public function value(): string { return '汉字'; } } }
namespace Domain\\Support { const PREFIX = 'prefix'; function decorate(string $value): string { return '[' . $value . ']'; } }`;
const initial = (): Map<string, string> => new Map([[sourceUri, source], [targetUri, target], [callerUri, caller], [definitionsUri, definitions]]);
function apply(files: Map<string, string>, plan: MoveMemberInfo): Map<string, string> {
  return new Map([...files].map(([uri, text]) => [uri, plan.edits.filter(edit => edit.uri === uri)
    .sort((left, right) => right.start - left.start).reduce((value, edit) => value.slice(0, edit.start) + edit.newText + value.slice(edit.end), text)]));
}
function setup(files = initial(), deferred = false, version = '8.5'): SemanticWorkspace {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion(version);
  for (const [uri, text] of files) {
    if (deferred) workspace.updateDeclarations(uri, text);
    else workspace.update(uri, text, true);
  }
  return workspace;
}
function move(workspace: SemanticWorkspace, text = source, destination = 'Destination\\Receiver'): MoveMemberInfo | undefined {
  return workspace.moveStaticMethod(sourceUri, text.indexOf('render(') + 1, destination);
}

describe('Move Member: static methods across lexical contexts', () => {
  it.each([false, true])('preserves recursive calls, aliases, parent/self constants, PHPDoc and unrelated files (deferred=%s)', deferred => {
    const files = initial(), workspace = setup(files, deferred);
    try {
      const plan = move(workspace); expect(plan).toBeDefined();
      const changed = apply(files, plan!);
      expect(changed.get(sourceUri)).not.toContain('function render');
      expect(changed.get(sourceUri)).not.toContain('@param Item');
      expect(changed.get(targetUri)).toContain('@param \\Domain\\Data\\Payload $item');
      expect(changed.get(targetUri)).toContain('function render(\\Domain\\Data\\Payload $item');
      expect(changed.get(targetUri)).toContain('\\Destination\\Receiver::render($item, $n - 1)');
      expect(changed.get(targetUri)).toContain('\\Domain\\Support\\decorate(\\Domain\\Support\\PREFIX');
      expect(changed.get(targetUri)).toContain('\\Domain\\Source\\UtilityParent::TOKEN');
      expect(changed.get(targetUri)).toContain('\\Domain\\Source\\Utility::TOKEN');
      expect(changed.get(callerUri)).toContain('\\Destination\\Receiver::render(new Payload(), 2)');
      expect(changed.get(definitionsUri)).toBe(definitions);
      for (const [uri, text] of files) expect(workspace.source(uri)).toBe(text);
      for (const [uri, text] of changed) {
        const parsed = parser.parse(text); try { expect(parsed.errors, uri).toEqual([]); } finally { parsed.tree.delete(); }
      }
      expect(plan!.checkedUris).toEqual(expect.arrayContaining([...files.keys()]));
    } finally { workspace.dispose(); }
  });

  it('keeps named arguments and first-class callable invocation intact', () => {
    const files = initial(); files.set(callerUri, caller.replace('U::render(new Payload(), 2)', 'U::render(item: new Payload(), n: 2)'));
    files.set(`${root}Callable.php`, '<?php use Domain\\Source\\Utility; $callback = Utility::render(...);');
    const workspace = setup(files);
    try {
      const plan = move(workspace); expect(plan).toBeDefined(); const changed = apply(files, plan!);
      expect(changed.get(callerUri)).toContain('\\Destination\\Receiver::render(item: new Payload(), n: 2)');
      expect(changed.get(`${root}Callable.php`)).toContain('\\Destination\\Receiver::render(...)');
    } finally { workspace.dispose(); }
  });

  it('preserves every byte of a multiline string inside the moved method', () => {
    const literal = "<<<'TEXT'\n  Item $this self::TOKEN 汉字\nTEXT";
    const text = source.replace("return decorateValue(MARK . ':' . parent::TOKEN . ':' . self::TOKEN . ':' . $item->value());", `return ${literal};`);
    const files = initial(); files.set(sourceUri, text); const workspace = setup(files);
    try { const plan = move(workspace, text); expect(plan).toBeDefined(); expect(apply(files, plan!).get(targetUri)).toContain(literal); }
    finally { workspace.dispose(); }
  });

  it('keeps method-local template names while binding their bounds', () => {
    const text = source.replace('@param Item $item', '@template T of Item\n     * @param T $item');
    const files = initial(); files.set(sourceUri, text); const workspace = setup(files);
    try { const plan = move(workspace, text); expect(plan).toBeDefined(); const changed = apply(files, plan!).get(targetUri)!;
      expect(changed).toContain('@template T of \\Domain\\Data\\Payload'); expect(changed).toContain('@param T $item'); }
    finally { workspace.dispose(); }
  });

  it.each([
    ['instance method', (value: string): string => value.replace('static function render', 'function render')],
    ['private method', (value: string): string => value.replace('public static function render', 'private static function render')],
    ['protected method', (value: string): string => value.replace('public static function render', 'protected static function render')],
    ['late-static receiver', (value: string): string => value.replace('self::render($item', 'static::render($item')],
    ['late-static return', (value: string): string => value.replace('): string {\n        if', '): static {\n        if')],
    ['class-bound magic constant', (value: string): string => value.replace("return decorateValue(MARK", "return decorateValue(__CLASS__ . MARK")],
    ['file-bound magic constant', (value: string): string => value.replace("return decorateValue(MARK", "return decorateValue(__FILE__ . MARK")],
    ['private member dependency', (value: string): string => value.replace("public const TOKEN = 'owner'", "private const TOKEN = 'owner'")],
    ['class PHPDoc template', (value: string): string => value.replace('final class Utility extends', '/** @template T */ final class Utility extends').replace('@param Item $item', '@param T $item')],
    ['context-bound PHPDoc', (value: string): string => value.replace('@return string', '@return static')],
    ['unparsed annotation binding', (value: string): string => value.replace('@return string', '@see Item::value')],
    ['unknown function binding', (value: string): string => value.replace('return decorateValue(', 'return missingFunction(')],
  ] as const)('refuses %s without changing workspace source', (_label, mutate) => {
    const text = mutate(source), files = initial(); files.set(sourceUri, text); const workspace = setup(files);
    try { expect(move(workspace, text)).toBeUndefined(); for (const [uri, value] of files) expect(workspace.source(uri)).toBe(value); }
    finally { workspace.dispose(); }
  });

  it.each([
    ['existing target method', 'final class Receiver { public static function RENDER(): string { return "collision"; } }'],
    ['interface target', 'interface Receiver {}'],
    ['Trait target', 'trait Receiver {}'],
    ['missing target hierarchy', 'class Receiver extends MissingBase {}'],
    ['inherited target collision', 'class Base {public static function render(): string {return "base";}} class Receiver extends Base {}'],
    ['target child collision', 'class Receiver {} class Child extends Receiver {public static function render(): string {return "child";}}'],
  ] as const)('refuses %s', (_label, replacement) => {
    const files = initial(); files.set(targetUri, target.replace('final class Receiver {}', replacement)); const workspace = setup(files);
    try { expect(move(workspace)).toBeUndefined(); } finally { workspace.dispose(); }
  });

  it.each([
    ['instance call', '<?php use Domain\\Source\\Utility; (new Utility())->render(new \\Domain\\Data\\Payload());'],
    ['unknown receiver', '<?php function unknown($value) {return $value::render();}'],
    ['string callable', "<?php $callback = 'Domain\\\\Source\\\\Utility::render';"],
    ['array callable', "<?php $callback = [\\Domain\\Source\\Utility::class, 'render'];"],
    ['source descendant', '<?php class Child extends \\Domain\\Source\\Utility {}'],
    ['duplicate source declaration', '<?php namespace Domain\\Source; class Utility {}'],
    ['duplicate target declaration', '<?php namespace Destination; class Receiver {}'],
  ] as const)('refuses %s rather than leaving a caller or binding behind', (_label, extra) => {
    const files = initial(); files.set(`${root}Extra.php`, extra); const workspace = setup(files);
    try { expect(move(workspace)).toBeUndefined(); } finally { workspace.dispose(); }
  });

  it('refuses a strict-types boundary change', () => {
    const files = initial(); files.set(targetUri, target.replace('declare(strict_types=1);', '')); const workspace = setup(files);
    try { expect(move(workspace)).toBeUndefined(); } finally { workspace.dispose(); }
  });

  it.each(['Domain\\Source\\Utility', 'Missing', 'Destination\\Receiver; phpinfo()', ''])('refuses invalid destination %j', destination => {
    const workspace = setup(); try { expect(move(workspace, source, destination)).toBeUndefined(); } finally { workspace.dispose(); }
  });

  it.each(['7.2', '7.3', '7.4', '8.0', '8.5'])('preserves legacy construction under PHP %s', version => {
    const files = new Map([[sourceUri, '<?php class Utility {public static function Receiver(int $n): int {return $n;}} Utility::Receiver(1);'],
      [targetUri, '<?php class Receiver {} new Receiver();']]); const workspace = setup(files, false, version);
    try { const text = files.get(sourceUri)!; const plan = workspace.moveStaticMethod(sourceUri, text.indexOf('Receiver(') + 1, 'Receiver');
      if (version.startsWith('7.')) expect(plan).toBeUndefined(); else expect(plan).toBeDefined(); }
    finally { workspace.dispose(); }
  });

  it.each(['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'])('allows a same-name ordinary method when an explicit constructor exists under PHP %s', version => {
    const sourceText = '<?php class Utility {public static function Receiver(int $n): int {return $n;}} Utility::Receiver(1);';
    const files = new Map([[sourceUri, sourceText], [targetUri, '<?php class Receiver {public function __construct() {}} new Receiver();']]);
    const workspace = setup(files, false, version);
    try { expect(workspace.moveStaticMethod(sourceUri, sourceText.indexOf('Receiver(') + 1, 'Receiver')).toBeDefined(); }
    finally { workspace.dispose(); }
  });

});

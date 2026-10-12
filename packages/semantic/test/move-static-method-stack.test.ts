import {afterAll, beforeAll, expect, it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => {parser = await PhpSyntaxParser.createDefault();});
afterAll(() => parser.dispose());
const root = 'file:///move-stack/';
const scenarios = [
  ['direct trace', '\\debug_backtrace()', '', false],
  ['plain function', '\\Support\\helper()', 'namespace Support; function helper() {return "stable";}', true],
  ['function trace', '\\Support\\helper()', 'namespace Support; function helper() {return \\debug_backtrace();}', false],
  ['transitive trace', '\\Support\\helper()', 'namespace Support; function helper() {return nested();} function nested() {return \\debug_backtrace();}', false],
  ['aliased trace', '\\Support\\helper()', 'namespace Support; use function debug_backtrace as inspect; function helper() {return inspect();}', false],
  ['printed trace', '\\Support\\helper()', 'namespace Support; function helper() {\\debug_print_backtrace(); return "stable";}', false],
  ['static method trace', '\\Support\\Inspector::helper()', 'namespace Support; final class Inspector {public static function helper() {return \\debug_backtrace();}}', false],
  ['plain static method', '\\Support\\Inspector::helper()', 'namespace Support; final class Inspector {public static function helper() {return "stable";}}', true],
  ['constructor trace', 'new \\Support\\Inspector()', 'namespace Support; final class Inspector {public function __construct() {\\debug_print_backtrace();}}', false],
  ['plain constructor', 'new \\Support\\Inspector()', 'namespace Support; final class Inspector {public function __construct() {}}', true],
  ['inherited constructor trace', 'new \\Support\\Inspector()', 'namespace Support; class Base {public function __construct() {\\debug_print_backtrace();}} final class Inspector extends Base {}', false],
  ['unrelated function trace', '\\Support\\helper()', 'namespace Support; function helper() {return "stable";} function unused() {return \\debug_backtrace();}', true],
  ['unrelated method trace', '\\Support\\Inspector::helper()', 'namespace Support; final class Inspector {public static function helper() {return "stable";} public static function unused() {return \\debug_backtrace();}}', true],
  ['trace-like string', '\\Support\\helper()', 'namespace Support; function helper() {return "debug_backtrace()";}', true],
  ['trace-like comment', '\\Support\\helper()', 'namespace Support; function helper() {/* debug_backtrace() */ return "stable";}', true],
  ['namespaced shadow', '\\Support\\helper()', 'namespace Support; function helper() {return debug_backtrace();} function debug_backtrace() {return "stable";}', true],
  ['safe recursion', '\\Support\\helper(2)', 'namespace Support; function helper($n) {return $n ? nested($n - 1) : "stable";} function nested($n) {return helper($n);}', true],
  ['recursive trace', '\\Support\\helper(2)', 'namespace Support; function helper($n) {return $n ? nested($n - 1) : \\debug_backtrace();} function nested($n) {return helper($n);}', false],
  ['unknown transitive target', '\\Support\\helper()', 'namespace Support; function helper() {return missing();}', false],
] as const;

it.each(scenarios.flatMap(scenario => [false, true].map(deferred => ({scenario, deferred}))))(
  'preserves observed caller identity: $scenario.0, deferred=$deferred', ({scenario: [label, expression, support, safe], deferred}) => {
    const source = `<?php namespace A; final class Source {public static function observe() {return ${expression};}}`;
    const files = new Map([
      [root + 'Source.php', source],
      [root + 'Target.php', '<?php namespace B; final class Target {}'],
      [root + 'Support.php', '<?php ' + support],
      [root + 'Caller.php', '<?php return \\A\\Source::observe();'],
    ]);
    const workspace = new SemanticWorkspace(parser);
    workspace.setTargetPhpVersion('8.5');
    workspace.update('php-companion-builtin:stack', '<?php function debug_backtrace(int $options = 1, int $limit = 0): array {} function debug_print_backtrace(int $options = 0, int $limit = 0): void {}', true);
    for (const [uri, text] of files) {
      if (deferred) workspace.updateDeclarations(uri, text);
      else workspace.update(uri, text, true);
    }
    try {
      const plan = workspace.moveStaticMethod(root + 'Source.php', source.indexOf('observe(') + 1, 'B\\Target');
      if (!safe) expect(plan, label).toBeUndefined();
      else {
        expect(plan, label).toBeDefined();
        const changed = new Map([...files].map(([uri, text]) => [uri, plan!.edits.filter(edit => edit.uri === uri)
          .sort((a, b) => b.start - a.start).reduce((value, edit) => value.slice(0, edit.start) + edit.newText + value.slice(edit.end), text)]));
        expect(changed.get(root + 'Source.php')).not.toContain('function observe(');
        expect(changed.get(root + 'Target.php')).toContain('function observe(');
        expect(changed.get(root + 'Caller.php')).toContain('\\B\\Target::observe()');
        expect(changed.get(root + 'Support.php')).toBe(files.get(root + 'Support.php'));
      }
      for (const [uri, text] of files) expect(workspace.source(uri)).toBe(text);
    } finally {workspace.dispose();}
  },
);

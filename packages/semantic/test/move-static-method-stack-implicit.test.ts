import {afterAll, beforeAll, expect, it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => {parser = await PhpSyntaxParser.createDefault();});
afterAll(() => parser.dispose());
const root = 'file:///move-stack/';
const scenarios = [
  ['destructor trace', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public $value="stable"; public function __destruct() {echo \\debug_backtrace()[1]["class"];}}', false],
  ['plain destructor', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public $value="stable"; public function __destruct() {}}', true],
  ['inherited destructor trace', '(new \\Support\\Inspector())->value', 'namespace Support; class Base {public $value="stable"; public function __destruct() {echo \\debug_backtrace()[1]["class"];}} final class Inspector extends Base {}', false],
  ['transitive destructor trace', '(new \\Support\\Inspector())->value', 'namespace Support; function nested() {return \\debug_backtrace();} final class Inspector {public $value="stable"; public function __destruct() {nested();}}', false],
  ['string cast trace', '(string) new \\Support\\Inspector()', 'namespace Support; final class Inspector {public function __toString(): string {return \\debug_backtrace()[1]["class"];}}', false],
  ['plain string cast', '(string) new \\Support\\Inspector()', 'namespace Support; final class Inspector {public function __toString(): string {return "stable";}}', true],
  ['inherited string cast trace', '(string) new \\Support\\Inspector()', 'namespace Support; class Base {public function __toString(): string {return \\debug_backtrace()[1]["class"];}} final class Inspector extends Base {}', false],
  ['concatenation trace', '"prefix" . new \\Support\\Inspector()', 'namespace Support; final class Inspector {public function __toString(): string {return \\debug_backtrace()[1]["class"];}}', false],
  ['plain concatenation', '"prefix" . new \\Support\\Inspector()', 'namespace Support; final class Inspector {public function __toString(): string {return "stable";}}', true],
  ['unused string conversion', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public $value="stable"; public function __toString(): string {return \\debug_backtrace()[1]["class"];}}', true],
  ['get hook trace', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public string $value {get => \\debug_backtrace()[1]["class"];}}', false],
  ['plain get hook', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public string $value {get => "stable";}}', true],
  ['inherited get hook trace', '(new \\Support\\Inspector())->value', 'namespace Support; class Base {public string $value {get => \\debug_backtrace()[1]["class"];}} final class Inspector extends Base {}', false],
  ['composed inherited get hook trace', '(new \\Support\\Inspector())->value', 'namespace Support; class Base {public string $value {get => \\debug_backtrace()[1]["class"]; set {}}} final class Inspector extends Base {public string $value {set {}}}', false],
  ['overridden get hook control', '(new \\Support\\Inspector())->value', 'namespace Support; class Base {public string $value {get => \\debug_backtrace()[1]["class"];}} final class Inspector extends Base {public string $value {get => "stable";}}', true],
  ['unused get hook trace', '(new \\Support\\Inspector())->plain', 'namespace Support; final class Inspector {public $plain="stable"; public string $value {get => \\debug_backtrace()[1]["class"];}}', true],
  ['unused set hook trace', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public string $value {get => "stable"; set {\\debug_print_backtrace();}}}', true],
  ['magic getter trace', '(new \\Support\\Inspector())->value', 'namespace Support; /** @property-read string $value */ final class Inspector {public function __get($name) {return \\debug_backtrace()[1]["class"];}}', false],
  ['plain magic getter', '(new \\Support\\Inspector())->value', 'namespace Support; /** @property-read string $value */ final class Inspector {public function __get($name) {return "stable";}}', true],
  ['inherited magic getter trace', '(new \\Support\\Inspector())->value', 'namespace Support; /** @property-read string $value */ class Base {public function __get($name) {return \\debug_backtrace()[1]["class"];}} final class Inspector extends Base {}', false],
  ['unused magic getter trace', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public $value="stable"; public function __get($name) {return \\debug_backtrace()[1]["class"];}}', true],
  ['unused magic setter trace', '(new \\Support\\Inspector())->value', 'namespace Support; /** @property-read string $value */ final class Inspector {public function __get($name) {return "stable";} public function __set($name,$value) {\\debug_print_backtrace();}}', true],
  ['set hook trace', '((new \\Support\\Inspector())->value = "stable")', 'namespace Support; final class Inspector {public string $value {set {\\debug_print_backtrace();}}}', false],
  ['plain set hook', '((new \\Support\\Inspector())->value = "stable")', 'namespace Support; final class Inspector {public string $value {set {}}}', true],
  ['magic setter trace', '((new \\Support\\Inspector())->value = "stable")', 'namespace Support; /** @property-write string $value */ final class Inspector {public function __set($name,$value) {\\debug_print_backtrace();}}', false],
  ['plain magic setter', '((new \\Support\\Inspector())->value = "stable")', 'namespace Support; /** @property-write string $value */ final class Inspector {public function __set($name,$value) {}}', true],
  ['typed helper return trace', '\\Support\\helper()', 'namespace Support; function helper(): string {return new Inspector();} final class Inspector {public function __toString(): string {return \\debug_backtrace()[2]["class"];}}', false],
  ['plain typed helper return', '\\Support\\helper()', 'namespace Support; function helper(): string {return new Inspector();} final class Inspector {public function __toString(): string {return "stable";}}', true],
  ['typed parameter conversion trace', '\\Support\\consume(new \\Support\\Inspector())', 'namespace Support; function consume(string $item): string {return $item;} final class Inspector {public function __toString(): string {return \\debug_backtrace()[1]["class"];}}', false],
  ['plain typed parameter conversion', '\\Support\\consume(new \\Support\\Inspector())', 'namespace Support; function consume(string $item): string {return $item;} final class Inspector {public function __toString(): string {return "stable";}}', true],
  ['named typed parameter conversion trace', '\\Support\\consume(item: new \\Support\\Inspector())', 'namespace Support; function consume(string $item): string {return $item;} final class Inspector {public function __toString(): string {return \\debug_backtrace()[1]["class"];}}', false],
  ['plain named typed parameter conversion', '\\Support\\consume(item: new \\Support\\Inspector())', 'namespace Support; function consume(string $item): string {return $item;} final class Inspector {public function __toString(): string {return "stable";}}', true],
  ['interpolated conversion trace', '\\Support\\helper()', 'namespace Support; function helper(): string {$item=new Inspector(); return "$item";} final class Inspector {public function __toString(): string {return \\debug_backtrace()[2]["class"];}}', false],
  ['plain interpolated conversion', '\\Support\\helper()', 'namespace Support; function helper(): string {$item=new Inspector(); return "$item";} final class Inspector {public function __toString(): string {return "stable";}}', true],
  ['backed get hook control', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public string $value="stable" {get {return $this->value;}}}', true],
  ['transitive hook trace', '(new \\Support\\Inspector())->value', 'namespace Support; function nested(): string {return \\debug_backtrace()[2]["class"];} final class Inspector {public string $value {get => nested();}}', false],
  ['unused hook on construction', 'new \\Support\\Inspector()', 'namespace Support; final class Inspector {public string $value {get => \\debug_backtrace()[1]["class"];}}', true],
  ['hook return coercion trace', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public string $value {get => new Text();}} final class Text {public function __toString(): string {return \\debug_backtrace()[2]["class"];}}', false],
  ['plain hook return coercion', '(new \\Support\\Inspector())->value', 'namespace Support; final class Inspector {public string $value {get => new Text();}} final class Text {public function __toString(): string {return "stable";}}', true],
  ['typed scalar property return control', '\\Support\\helper()', 'namespace Support; function helper(): string {return (new Inspector())->value;} final class Inspector {public $value="stable"; public function __destruct() {}}', true],
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

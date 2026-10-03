import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it('distinguishes static declaration modifiers from shared local bindings', () => {
 const project = new SemanticWorkspace(parser); const uri = 'file:///StaticScope.php';
 const definitions = '<?php class StaticScopeRepo { public function ready(): void {} } function staticScopeObserve($value, $options): void {}';
 project.update('file:///StaticScopeDefinitions.php', definitions);
 const check = (header: string, body: string, expected: string[]): void => {
  const source = `<?php class StaticScopeRun { ${header} { ${body} $value->rea; } }`;
  project.update(uri, source);
  expect(project.completeMembers(uri, source.indexOf('->rea') + 5).map(item => item.name), header + body).toEqual(expected);
 };
 const body = '$value = null ?: new StaticScopeRepo(); staticScopeObserve($value, ["flag" => 1]);';
 for (const header of ['public function run(): void', 'public static function run(): void', 'private static function run(): void', 'protected static function run(): void', 'public final static function run(): void', 'public static function run(&$other): void', 'public static function run(): static']) check(header, body, ['ready']);
 for (const fragment of ['static $value;', 'global $value;', '$alias =& $value;']) check('public static function run(): void', fragment + body, []);
 check('public static function run(&$value): void', body, []);
 project.update('file:///StaticScopeDefinitions.php', definitions.replace('staticScopeObserve($value', 'staticScopeObserve(&$value'));
 check('public static function run(): void', body, []);
 project.update('file:///StaticScopeDefinitions.php', definitions);
 check('public static function run(): void', body, ['ready']);
 for (const [header, expected] of [
  ['function ()', ['ready']], ['static function ()', ['ready']],
  ['static function () use (&$value)', []], ['static function () use (&$other)', ['ready']],
 ] as const) {
  const source = `<?php function outer($other): void { $value = null; $closure = ${header} { ${body} $value->rea; }; }`;
  project.update(uri, source);
  expect(project.completeMembers(uri, source.indexOf('->rea') + 5).map(item => item.name), header).toEqual(expected);
 }
 project.dispose();
});

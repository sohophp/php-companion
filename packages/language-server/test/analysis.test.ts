import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity, SymbolKind } from 'vscode-languageserver/node.js';
import { analyzePhpDocument, analyzePhpSemanticTokens, PHP_SEMANTIC_TOKEN_MODIFIERS, PHP_SEMANTIC_TOKEN_TYPES } from '../src/analysis.js';

function decodedSemanticTokens(document: TextDocument, data: number[]): Array<{ text: string; type: string; modifiers: string[] }> {
  const decoded: Array<{ text: string; type: string; modifiers: string[] }> = [];
  let line = 0; let character = 0;
  for (let index = 0; index < data.length; index += 5) {
    line += data[index]!;
    character = data[index] === 0 ? character + data[index + 1]! : data[index + 1]!;
    const start = { line, character }; const end = { line, character: character + data[index + 2]! };
    const modifierBits = data[index + 4]!;
    decoded.push({
      text: document.getText({ start, end }),
      type: PHP_SEMANTIC_TOKEN_TYPES[data[index + 3]!]!,
      modifiers: PHP_SEMANTIC_TOKEN_MODIFIERS.filter((_, modifier) => (modifierBits & (1 << modifier)) !== 0),
    });
  }
  return decoded;
}

describe('PHP document analysis', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it('returns exact UTF-16 document symbol positions', () => {
    const document = TextDocument.create('file:///Example.php', 'php', 1, '<?php\n// 😀\nnamespace App;\nclass Example {}');
    const result = analyzePhpDocument(document, parser);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols).toMatchObject([{ name: 'Example', detail: 'App\\Example', selectionRange: { start: { line: 3, character: 6 }, end: { line: 3, character: 13 } } }]);
  });

  it('reports stable coded syntax diagnostics', () => {
    const document = TextDocument.create('file:///Broken.php', 'php', 1, '<?php class Broken { public function run( }');
    const result = analyzePhpDocument(document, parser);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.every((item) => item.code === 'php.syntax' && item.source === 'PHP Companion')).toBe(true);
  });
  it('reports a stable target-version diagnostic without rejecting supported syntax', () => {
    const document = TextDocument.create('file:///Version.php', 'php', 1, '<?php enum Status { case Ready; }');
    expect(analyzePhpDocument(document, parser, '8.0').diagnostics).toMatchObject([{ code: 'php.version.unsupported' }]);
    expect(analyzePhpDocument(document, parser, '8.1').diagnostics).toEqual([]);
  });
  it('warns only for PHP 8.4 implicitly nullable typed parameters', () => {
    const source = `<?php
      function plain(string $value = null, ?string $explicit = null, string|null $union = null, mixed $mixed = null, $untyped = null): void {}
      function composite(A&B $value = null): void {}
      $closure = fn (Result $result = null) => $result;
      class Example { public function __construct(public Service $service = null) {} }
    `;
    const document = TextDocument.create('file:///ImplicitNullable.php', 'php', 1, source);
    expect(analyzePhpDocument(document, parser, '8.3').diagnostics.filter((item) => item.code === 'php.parameter.implicitly-nullable')).toEqual([]);
    const diagnostics = analyzePhpDocument(document, parser, '8.4').diagnostics.filter((item) => item.code === 'php.parameter.implicitly-nullable');
    expect(diagnostics.map((item) => document.getText(item.range))).toEqual(['string', 'A&B', 'Result', 'Service']);
    expect(diagnostics.map((item) => item.data)).toEqual([
      expect.objectContaining({ newType: '?string' }), expect.objectContaining({ newType: '(A&B)|null' }),
      expect.objectContaining({ newType: '?Result' }), expect.objectContaining({ newType: '?Service' }),
    ]);
  });
  it('enforces representative PHP 7.3 through 8.5 syntax boundaries', () => {
    const cases = [
      { feature: 'trailing comma in a call', minimum: '7.3' as const, source: '<?php call(1,);' },
      { feature: 'typed property', minimum: '7.4' as const, source: '<?php class C { public string $name; }' },
      { feature: 'null-safe member access', minimum: '8.0' as const, source: '<?php $object?->run();' },
      { feature: 'mixed type', minimum: '8.0' as const, source: '<?php function accepts(mixed $value): void {}' },
      { feature: 'static return type', minimum: '8.0' as const, source: '<?php class Factory { public function make(): static { return new static(); } }' },
      { feature: 'never type', minimum: '8.1' as const, source: '<?php function stop(): never { throw new Exception(); }' },
      { feature: 'first-class callable', minimum: '8.1' as const, source: '<?php $callback = strlen(...);' },
      { feature: 'DNF type', minimum: '8.2' as const, source: '<?php function run((A&B)|C $value): void {}' },
      { feature: 'standalone false type', minimum: '8.2' as const, source: '<?php function alwaysFalse(): false { return false; }' },
      { feature: 'standalone false and null types', minimum: '8.2' as const, source: '<?php function falseOrNull(): false|null { return null; }' },
      { feature: 'standalone false type', minimum: '8.2' as const, source: '<?php function nullableFalse(): ?false { return null; }' },
      { feature: 'true type', minimum: '8.2' as const, source: '<?php function alwaysTrue(): true { return true; }' },
      { feature: 'standalone null type', minimum: '8.2' as const, source: '<?php function alwaysNull(): null { return null; }' },
      { feature: 'typed class constant', minimum: '8.3' as const, source: '<?php class C { public const string NAME = "x"; }' },
      { feature: 'dynamic class constant access', minimum: '8.3' as const, source: "<?php class C { public const NAME = 'x'; } $name = 'NAME'; echo C::{$name};" },
      { feature: 'property hook', minimum: '8.4' as const, source: '<?php class C { public string $name { get => "name"; } }' },
      { feature: 'final property', minimum: '8.4' as const, source: '<?php class C { final public string $name; }' },
      { feature: 'asymmetric property visibility', minimum: '8.5' as const, source: '<?php class C { public private(set) static string $name; }' },
      { feature: 'closure in constant expression', minimum: '8.5' as const, source: '<?php const CALLBACK = static function (string $value): string { return $value; };' },
      { feature: 'first-class callable in constant expression', minimum: '8.5' as const, source: '<?php const CALLBACK = strlen(...);' },
      { feature: 'pipe operator', minimum: '8.5' as const, source: '<?php $result = "hello" |> strtoupper(...);' },
      { feature: 'clone with properties', minimum: '8.5' as const, source: "<?php $copy = clone($object, ['name' => 'new']);" },
      { feature: 'final promoted property', minimum: '8.5' as const, source: '<?php class C { public function __construct(public final string $name) {} }' },
    ];
    const versions = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'] as const;
    for (const fixture of cases) {
      for (const version of versions) {
        const document = TextDocument.create(`file:///${fixture.feature}.php`, 'php', 1, fixture.source);
        const diagnostics = analyzePhpDocument(document, parser, version).diagnostics;
        const unsupported = diagnostics.filter((item) => item.code === 'php.version.unsupported' && item.message.includes(fixture.feature));
        expect(unsupported.length, `${fixture.feature} on PHP ${version}`).toBe(Number(Number(version.replace('.', '')) < Number(fixture.minimum.replace('.', ''))));
        if (version === '8.5') expect(diagnostics.filter((item) => item.code === 'php.syntax'), `${fixture.feature} parser support`).toEqual([]);
      }
    }
  });
  it('does not hide syntax errors near PHP 8.5 grammar compatibility shims', () => {
    const invalidSources = [
      '<?php $copy = clone($object, [\'name\' => ]);',
      '<?php function run(public final string $name): void {}',
    ];
    for (const source of invalidSources) {
      const document = TextDocument.create('file:///Invalid85.php', 'php', 1, source);
      expect(analyzePhpDocument(document, parser, '8.5').diagnostics.some((item) => item.code === 'php.syntax'), source).toBe(true);
    }
  });
  it('enforces PHP 8.5 constant-expression callable constraints', () => {
    const cases = [
      ['Arrow functions cannot be used in constant expressions because they implicitly capture variables.', '<?php const CALLBACK = fn(string $value): string => $value;'],
      ['Closures in constant expressions must be static.', '<?php const CALLBACK = function (string $value): string { return $value; };'],
      ['Closures in constant expressions cannot capture variables.', '<?php const CALLBACK = static function () use ($value) { return $value; };'],
      ['First-class callables in constant expressions must directly name a function or static method.', "<?php const NAME = 'strlen'; const CALLBACK = (NAME)(...);"],
    ] as const;
    for (const [message, source] of cases) {
      const document = TextDocument.create('file:///InvalidConstantCallable.php', 'php', 1, source);
      expect(analyzePhpDocument(document, parser, '8.5').diagnostics).toContainEqual(expect.objectContaining({
        code: 'php.constant-expression.invalid-callable', message,
      }));
    }
    for (const source of [
      '<?php const CALLBACK = static function (string $value): string { return $value; };',
      '<?php const CALLBACK = strlen(...);',
      '<?php class C { private static function normalize(string $value): string { return $value; } public const CALLBACK = self::normalize(...); }',
    ]) {
      const document = TextDocument.create('file:///ValidConstantCallable.php', 'php', 1, source);
      expect(analyzePhpDocument(document, parser, '8.5').diagnostics.filter((item) => item.code === 'php.constant-expression.invalid-callable')).toEqual([]);
    }
    const contexts = `<?php
      #[Attribute] class Handler { public function __construct(public Closure $callback) {} }
      #[Handler(strtolower(...))]
      class C {
        public Closure $property = strtoupper(...);
        public function run(Closure $callback = static function (string $value): string { return $value; }): void {}
      }
    `;
    const php84 = analyzePhpDocument(TextDocument.create('file:///ConstantCallableContexts.php', 'php', 1, contexts), parser, '8.4').diagnostics;
    expect(php84.filter((item) => item.code === 'php.version.unsupported'
      && (item.message.includes('closure in constant expression') || item.message.includes('first-class callable in constant expression')))).toHaveLength(3);
    const php85 = analyzePhpDocument(TextDocument.create('file:///ConstantCallableContexts.php', 'php', 1, contexts), parser, '8.5').diagnostics;
    expect(php85.filter((item) => item.code === 'php.version.unsupported' || item.code === 'php.constant-expression.invalid-callable')).toEqual([]);
  });
  it('gates the intentional void cast at PHP 8.5 without rejecting ordinary casts', () => {
    const document = TextDocument.create('file:///VoidCast.php', 'php', 1, '<?php function result(): int { return 1; } (void) result(); $value = (void) result(); foo((void) result()); for ((void) result();; (void) result()) {} (bool) result();');
    const php84 = analyzePhpDocument(document, parser, '8.4').diagnostics.filter((item) => item.code === 'php.version.unsupported');
    expect(php84).toHaveLength(5);
    expect(php84.every((item) => item.message === '(void) cast requires PHP 8.5 or newer; the target is PHP 8.4.')).toBe(true);
    expect(analyzePhpDocument(document, parser, '8.5').diagnostics.filter((item) => item.code === 'php.version.unsupported' || item.code === 'php.syntax')).toEqual([]);
    const invalidCondition = TextDocument.create('file:///InvalidVoidCast.php', 'php', 1, '<?php for (; (void) result();) {}');
    expect(analyzePhpDocument(invalidCondition, parser, '8.5').diagnostics.some((item) => item.code === 'php.syntax')).toBe(true);
  });
  it('classifies structured declarations and precise symbol uses', () => {
    const document = TextDocument.create('file:///Tokens.php', 'php', 1, `<?php
class Service {
  public static function make(string $name): void {
    $local = $name;
    self::make($name);
    $this->value;
    helper(value: $local);
    new /* class */ Result();
    $callback = function (string $nested) use ($local) { return $nested . $local; };
  }
  public string $value;
}
$global = helper();`);
    const syntactic = decodedSemanticTokens(document, analyzePhpSemanticTokens(document, parser).data);
    expect(syntactic).toEqual([
      { text: 'Service', type: 'class', modifiers: ['declaration'] },
      { text: 'make', type: 'method', modifiers: ['declaration', 'static'] },
      { text: '$name', type: 'parameter', modifiers: ['declaration'] },
      { text: '$local', type: 'variable', modifiers: [] },
      { text: '$name', type: 'parameter', modifiers: [] },
      { text: 'self', type: 'type', modifiers: [] },
      { text: 'make', type: 'method', modifiers: ['static'] },
      { text: '$name', type: 'parameter', modifiers: [] },
      { text: '$this', type: 'variable', modifiers: [] },
      { text: 'value', type: 'property', modifiers: [] },
      { text: 'helper', type: 'function', modifiers: [] },
      { text: 'value', type: 'parameter', modifiers: [] },
      { text: '$local', type: 'variable', modifiers: [] },
      { text: 'Result', type: 'class', modifiers: [] },
      { text: '$callback', type: 'variable', modifiers: [] },
      { text: '$nested', type: 'parameter', modifiers: ['declaration'] },
      { text: '$local', type: 'variable', modifiers: [] },
      { text: '$nested', type: 'parameter', modifiers: [] },
      { text: '$local', type: 'variable', modifiers: [] },
      { text: '$value', type: 'property', modifiers: ['declaration'] },
      { text: '$global', type: 'variable', modifiers: [] },
      { text: 'helper', type: 'function', modifiers: [] },
    ]);
  });
  it('classifies native, PHPDoc, inheritance and import type positions without guessing the declaration kind', () => {
    const document = TextDocument.create('file:///TypeTokens.php', 'php', 1, `<?php
use Vendor\\Base as ParentBase;
use function Vendor\\helper as importedHelper;
use const Vendor\\FLAG as IMPORTED_FLAG;
/** @param DocType $value */
#[Marker]
class Child extends ParentBase implements Contract {
  use SharedTrait;
  public Payload $payload;
  public function run(Input $input): Output {
    if ($input instanceof SpecialInput) {}
    Child::build();
    return new Result();
  }
}`);
    const syntactic = decodedSemanticTokens(document, analyzePhpSemanticTokens(document, parser).data);
    expect(syntactic).toEqual([
      { text: 'Vendor\\Base', type: 'type', modifiers: [] },
      { text: 'ParentBase', type: 'type', modifiers: [] },
      { text: 'Vendor\\helper', type: 'function', modifiers: [] },
      { text: 'importedHelper', type: 'function', modifiers: [] },
      { text: 'Vendor\\FLAG', type: 'enumMember', modifiers: [] },
      { text: 'IMPORTED_FLAG', type: 'enumMember', modifiers: [] },
      { text: 'DocType', type: 'type', modifiers: [] },
      { text: 'Marker', type: 'type', modifiers: [] },
      { text: 'Child', type: 'class', modifiers: ['declaration'] },
      { text: 'ParentBase', type: 'type', modifiers: [] },
      { text: 'Contract', type: 'type', modifiers: [] },
      { text: 'SharedTrait', type: 'type', modifiers: [] },
      { text: 'Payload', type: 'type', modifiers: [] },
      { text: '$payload', type: 'property', modifiers: ['declaration'] },
      { text: 'run', type: 'method', modifiers: ['declaration'] },
      { text: 'Input', type: 'type', modifiers: [] },
      { text: '$input', type: 'parameter', modifiers: ['declaration'] },
      { text: 'Output', type: 'type', modifiers: [] },
      { text: '$input', type: 'parameter', modifiers: [] },
      { text: 'SpecialInput', type: 'type', modifiers: [] },
      { text: 'Child', type: 'type', modifiers: [] },
      { text: 'build', type: 'method', modifiers: ['static'] },
      { text: 'Result', type: 'class', modifiers: [] },
    ]);
    const source = document.getText();
    const knownKinds = [
      ['Vendor\\Base', 'class'], ['ParentBase', 'class'], ['Marker', 'class'], ['Contract', 'interface'],
      ['SharedTrait', 'trait'], ['Payload', 'class'], ['Input', 'interface'], ['Output', 'class'], ['SpecialInput', 'class'], ['Child::', 'class'],
    ] as const;
    const refined = decodedSemanticTokens(document, analyzePhpSemanticTokens(document, parser, {
      typeKindAt: (offset) => knownKinds.find(([text]) => {
        for (let start = source.indexOf(text); start >= 0; start = source.indexOf(text, start + 1)) {
          if (offset >= start && offset < start + text.length) return true;
        }
        return false;
      })?.[1],
      constantUses: () => [],
    }).data);
    expect(refined.filter((item, index) => item.type !== syntactic[index]?.type).map((item) => [item.text, item.type])).toEqual([
      ['Vendor\\Base', 'class'], ['ParentBase', 'class'], ['Marker', 'class'], ['ParentBase', 'class'], ['Contract', 'interface'],
      ['SharedTrait', 'class'], ['Payload', 'class'], ['Input', 'interface'], ['Output', 'class'], ['SpecialInput', 'class'], ['Child', 'class'],
    ]);
  });
  it('exposes enum cases as case-sensitive enum members', () => {
    const document = TextDocument.create('file:///Status.php', 'php', 1, '<?php enum Status: string { case Ready = "ready"; case ready = "lower"; public const LABEL = "status"; } Status::Ready; Status::LABEL;');
    const result = analyzePhpDocument(document, parser);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols[0]?.children).toMatchObject([
      { name: 'Ready', detail: 'case = "ready"', kind: SymbolKind.EnumMember },
      { name: 'ready', detail: 'case = "lower"', kind: SymbolKind.EnumMember },
      { name: 'LABEL', kind: SymbolKind.Constant },
    ]);
    const tokens = analyzePhpSemanticTokens(document, parser).data;
    const types = Array.from({ length: tokens.length / 5 }, (_, index) => PHP_SEMANTIC_TOKEN_TYPES[tokens[index * 5 + 3]!]!);
    expect(types).toEqual(['enum', 'enumMember', 'enumMember', 'enumMember', 'type', 'enumMember', 'type', 'enumMember']);
  });
  it('rejects enum properties and forbidden magic methods without cascading magic diagnostics', () => {
    const source = `<?php namespace App;
      enum Broken {
        public int $value;
        public static string $shared;
        public function __get(string $name): mixed { return null; }
        public function __serialize(): array { return []; }
        public function __invoke(): mixed { return null; }
        public function __call(string $name, array $arguments): mixed { return null; }
        public static function __callStatic(string $name, array $arguments): mixed { return null; }
        public const LABEL = 'broken';
        case Ready;
      }
      enum Valid { case Ready; public const LABEL = 'valid'; public function __invoke(): mixed { return null; } }`;
    const document = TextDocument.create('file:///EnumMembers.php', 'php', 1, source);
    const result = analyzePhpDocument(document, parser);
    expect(result.diagnostics.filter((item) => item.code === 'php.enum.invalid-member')
      .map((item) => [document.getText(item.range), item.message])).toEqual([
        ['$value', 'Enum App\\Broken cannot declare property $value.'],
        ['$shared', 'Enum App\\Broken cannot declare property $shared.'],
        ['__get', 'Enum App\\Broken cannot include magic method __get.'],
        ['__serialize', 'Enum App\\Broken cannot include magic method __serialize.'],
      ]);
    expect(result.diagnostics.filter((item) => item.code === 'php.method.invalid-magic-signature' || item.code === 'php.method.magic-visibility')).toEqual([]);
    expect(analyzePhpDocument(document, parser, '8.0').diagnostics.filter((item) => item.code === 'php.enum.invalid-member')).toEqual([]);
    const incomplete = TextDocument.create('file:///IncompleteEnum.php', 'php', 1, '<?php enum Broken { public int $value');
    expect(analyzePhpDocument(incomplete, parser).diagnostics.filter((item) => item.code === 'php.enum.invalid-member')).toEqual([]);
    const malformed = TextDocument.create('file:///MalformedEnum.php', 'php', 1, '<?php enum Broken { int $value; public function run($arg; }');
    const malformedDiagnostics = analyzePhpDocument(malformed, parser).diagnostics;
    expect(malformedDiagnostics.some((item) => item.code === 'php.syntax')).toBe(true);
    expect(malformedDiagnostics.filter((item) => item.code === 'php.enum.invalid-member')).toEqual([]);
  });
  it('reports only proven invalid enum case value contracts', () => {
    const source = `<?php namespace App;
      enum Unit { case Invalid = 'value'; case Valid; }
      enum Backed: string {
        case Missing;
        case Wrong = 1;
        case First = 'same';
        case Duplicate = 'same';
        case Valid = 'valid';
        case ConstantExpression = ENUM_VALUE;
      }
      enum IntegerBacked: int { case Wrong = false; case Valid = -1; case ConstantExpression = VALUE; }
    `;
    const document = TextDocument.create('file:///EnumCases.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.enum.invalid-case');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['Invalid', 'Case App\\Unit::Invalid of a non-backed enum must not have a value.'],
      ['Missing', 'Case App\\Backed::Missing of a backed enum must have a value.'],
      ['Wrong', 'Case App\\Backed::Wrong has int value but enum backing type is string.'],
      ['Duplicate', 'Case App\\Backed::Duplicate duplicates the backing value of App\\Backed::First.'],
      ['Wrong', 'Case App\\IntegerBacked::Wrong has bool value but enum backing type is int.'],
    ]);
    expect(analyzePhpDocument(document, parser, '8.0').diagnostics.filter((item) => item.code === 'php.enum.invalid-case')).toEqual([]);
    const incomplete = TextDocument.create('file:///IncompleteEnumCase.php', 'php', 1, '<?php enum Broken: string { case Missing =');
    expect(analyzePhpDocument(incomplete, parser).diagnostics.filter((item) => item.code === 'php.enum.invalid-case')).toEqual([]);
  });
  it('rejects only direct enum methods that collide with synthesized APIs', () => {
    const source = `<?php namespace App;
      enum Unit {
        case Ready;
        public function CASES(): array { return []; }
        public static function from(int $value): self { return self::Ready; }
        public static function tryFrom(int $value): ?self { return null; }
      }
      enum Backed: string {
        case Ready = 'ready';
        public static function cases(): array { return []; }
        public function from(string $value): self { return self::Ready; }
        private static function tryFrom(string $value): ?self { return null; }
      }
      trait CompatibleTrait { public static function cases(): array { return []; } public static function from(string $value): mixed { return null; } }
      enum TraitConsumer: string { use CompatibleTrait; case Ready = 'ready'; }
    `;
    const document = TextDocument.create('file:///EnumSynthesizedMethods.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.enum.invalid-member');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['CASES', 'Enum App\\Unit cannot redeclare synthesized method CASES.'],
      ['cases', 'Enum App\\Backed cannot redeclare synthesized method cases.'],
      ['from', 'Enum App\\Backed cannot redeclare synthesized method from.'],
      ['tryFrom', 'Enum App\\Backed cannot redeclare synthesized method tryFrom.'],
    ]);
    expect(analyzePhpDocument(document, parser, '8.0').diagnostics.filter((item) => item.code === 'php.enum.invalid-member')).toEqual([]);
  });
  it('reports only the later duplicate declaration with a stable code', () => {
    const source = '<?php namespace App; function helper() {} function HELPER() {} const MODE = 1; const MODE = 2; class User { public function run() {} public function RUN() {} public string $name; public string $name; public const ROLE = 1; public const ROLE = 2; } class user {}';
    const document = TextDocument.create('file:///Duplicates.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics;
    expect(diagnostics.map((item) => item.code)).toEqual([
      'php.duplicate.type', 'php.duplicate.function', 'php.duplicate.method', 'php.duplicate.property', 'php.duplicate.constant', 'php.duplicate.constant',
    ]);
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['user', 'Duplicate type declaration.'],
      ['HELPER', 'Duplicate function declaration.'],
      ['RUN', 'Duplicate method declaration.'],
      ['$name', 'Duplicate property declaration.'],
      ['MODE', 'Duplicate namespace constant declaration.'],
      ['ROLE', 'Duplicate class constant declaration.'],
    ]);
  });
  it('keeps function namespaces separate and constant identities case-sensitive', () => {
    const source = '<?php namespace One { function helper() {} const MODE = 1; const mode = 2; class Values { public const ROLE = 1; public const role = 2; } } namespace Two { function helper() {} }';
    const document = TextDocument.create('file:///LegalNames.php', 'php', 1, source);
    expect(analyzePhpDocument(document, parser).diagnostics.filter((item) => String(item.code).startsWith('php.duplicate.'))).toEqual([]);
  });
  it('reports invalid constructor and destructor contracts on the method name', () => {
    const source = `<?php namespace App;
      class Broken {
        public static function __construct(): void {}
        public static function __destruct(string $reason): void {}
      }
      class Valid {
        public function __construct(string $value) {}
        public function __destruct() {}
      }`;
    const document = TextDocument.create('file:///MagicMethods.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.method.invalid-magic-signature');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['__construct', 'Constructor App\\Broken::__construct cannot be static or declare a return type.'],
      ['__destruct', 'Destructor App\\Broken::__destruct cannot be static, declare a return type or accept parameters.'],
    ]);
  });
  it('reports classic magic method arity, staticness and incompatible declared return types', () => {
    const source = `<?php namespace App;
      class BrokenMagic {
        public function __clone(string $value): int {}
        public function __toString(string $value): int {}
        public static function __get(int $name) {}
        public function __set(string $name): int {}
        public function __isset(string &$name, string $extra): int {}
        public static function __unset(string $name): void {}
        public static function __call(string $name, object $arguments) {}
        public function __callStatic(string $name): mixed {}
        public function __sleep(string ...$value): int {}
        public function __wakeup(string $value): int {}
        public function __set_state(): object {}
        public static function __serialize(string $value): string {}
        public static function __unserialize(): int {}
        public static function __debugInfo(string $value): string {}
      }
      class ValidMagic {
        public function __clone(): never { exit; }
        public function __toString() { return ''; }
        public function __get(string|int $name) {}
        public function __set(string $name, mixed $value): never { exit; }
        public function __isset(string $name): true { return true; }
        public function __unset(string $name): void {}
        public function __call(string $name, iterable $arguments) {}
        public static function __callStatic(string $name, array $arguments) {}
        public function __sleep(): array { return []; }
        public function __wakeup(): never { exit; }
        public static function __set_state(array $properties): object { return new self(); }
        public function __serialize(): array { return []; }
        public function __unserialize(array $data): never { exit; }
        public function __debugInfo(): null { return null; }
      }`;
    const document = TextDocument.create('file:///ClassicMagic.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.method.invalid-magic-signature');
    expect(diagnostics.map((item) => document.getText(item.range))).toEqual([
      '__clone', '__toString', '__get', '__set', '__isset', '__unset', '__call', '__callStatic', '__sleep', '__wakeup', '__set_state',
      '__serialize', '__unserialize', '__debugInfo',
    ]);
    expect(diagnostics[0]?.message).toBe('Magic method App\\BrokenMagic::__clone has an invalid signature: must accept exactly 0 parameters; return type must be void or a compatible subtype when declared.');
    expect(diagnostics[7]?.message).toBe('Magic method App\\BrokenMagic::__callStatic has an invalid signature: must accept exactly 2 parameters; must be static.');
    expect(diagnostics[2]?.message).toBe('Magic method App\\BrokenMagic::__get has an invalid signature: cannot be static; parameter 1 type must accept string when declared.');
    expect(diagnostics[6]?.message).toBe('Magic method App\\BrokenMagic::__call has an invalid signature: cannot be static; parameter 2 type must accept array when declared.');
    const legacySerialize = TextDocument.create('file:///LegacySerialize.php', 'php', 1, '<?php class Legacy { public static function __serialize(string $value): string {} }');
    expect(analyzePhpDocument(legacySerialize, parser, '7.3').diagnostics.filter((item) => item.code === 'php.method.invalid-magic-signature')).toEqual([]);
    expect(analyzePhpDocument(legacySerialize, parser, '7.4').diagnostics.filter((item) => item.code === 'php.method.invalid-magic-signature')).toHaveLength(1);
    expect(analyzePhpDocument(TextDocument.create('file:///IncompleteMagic.php', 'php', 1, '<?php class Broken { function __get('), parser)
      .diagnostics.filter((item) => item.code === 'php.method.invalid-magic-signature')).toEqual([]);
  });
  it('warns for non-public magic methods except constructors, destructors and clone', () => {
    const source = `<?php class Visibility {
      private function __get($name) {}
      protected function __toString() { return ''; }
      private function __invoke() {}
      protected function __serialize(): array { return []; }
      private function __construct() {}
      private function __destruct() {}
      private function __clone(): void {}
    }`;
    const document = TextDocument.create('file:///MagicVisibility.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.method.magic-visibility');
    expect(diagnostics.map((item) => [document.getText(item.range), item.severity, item.message])).toEqual([
      ['__get', DiagnosticSeverity.Warning, 'Magic method Visibility::__get must have public visibility.'],
      ['__toString', DiagnosticSeverity.Warning, 'Magic method Visibility::__toString must have public visibility.'],
      ['__invoke', DiagnosticSeverity.Warning, 'Magic method Visibility::__invoke must have public visibility.'],
      ['__serialize', DiagnosticSeverity.Warning, 'Magic method Visibility::__serialize must have public visibility.'],
    ]);
    expect(analyzePhpDocument(document, parser, '7.3').diagnostics.filter((item) => item.code === 'php.method.magic-visibility')
      .map((item) => document.getText(item.range))).toEqual(['__get', '__toString', '__invoke']);
    const incomplete = TextDocument.create('file:///IncompleteVisibility.php', 'php', 1, '<?php class Broken { private function __get(');
    expect(analyzePhpDocument(incomplete, parser).diagnostics.filter((item) => item.code === 'php.method.magic-visibility')).toEqual([]);
  });
  it('reports only proven invalid native type positions and standalone violations', () => {
    const source = `<?php namespace App;
      class Broken {
        public callable $handler;
        public function __construct(public callable $promoted) {}
        public function consume(void $first, never $second, static $third, callable $allowed): void|null {}
        public function mixedResult(): mixed|string {}
      }
      class Valid {
        public \\Closure $handler;
        public function consume(callable $value): static { return new static(); }
        public function stop(): never { exit; }
        public function ignore(): void {}
      }`;
    const document = TextDocument.create('file:///NativeTypes.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.type.invalid-declaration');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['callable', 'Type callable cannot be used for a property.'],
      ['callable', 'Type callable cannot be used for a property.'],
      ['void', 'Type void is return-only and cannot be used for a parameter.'],
      ['never', 'Type never is return-only and cannot be used for a parameter.'],
      ['static', 'Type static is return-only and cannot be used for a parameter.'],
      ['void', 'Type void must be used as a standalone type.'],
      ['mixed', 'Type mixed must be used as a standalone type.'],
    ]);
    const legacy = TextDocument.create('file:///LegacyTypes.php', 'php', 1, '<?php namespace App; class never {} function accept(never $value): never { return $value; }');
    expect(analyzePhpDocument(legacy, parser, '8.0').diagnostics.filter((item) => item.code === 'php.type.invalid-declaration')).toEqual([]);
    const incomplete = TextDocument.create('file:///IncompleteType.php', 'php', 1, '<?php function broken(void $');
    expect(analyzePhpDocument(incomplete, parser).diagnostics.filter((item) => item.code === 'php.type.invalid-declaration')).toEqual([]);
  });
  it('reports compile-time redundant native type combinations without flagging legal unions', () => {
    const source = `<?php namespace App;
      function duplicate(int|INT $value): void {}
      function boolFalse(bool|false $value): void {}
      function boolTrue(true|bool $value): void {}
      function literals(false|true $value): void {}
      function iterableArray(array|iterable $value): void {}
      function duplicateNull(null|NULL $value): void {}
      function validBool(bool|null $value): void {}
      function validIterable(iterable|\\Countable $value): void {}`;
    const document = TextDocument.create('file:///RedundantTypes.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.type.redundant-declaration');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['INT', 'Type int is declared more than once.'],
      ['false', 'Type false is redundant when bool is declared.'],
      ['true', 'Type true is redundant when bool is declared.'],
      ['true', 'Types true and false cannot be combined; use bool.'],
      ['array', 'Type array is redundant when iterable is declared.'],
      ['NULL', 'Type null is declared more than once.'],
    ]);
    expect(analyzePhpDocument(document, parser, '7.4').diagnostics.filter((item) => item.code === 'php.type.redundant-declaration')).toEqual([]);
  });
  it('reports object/class and iterable/Traversable redundancy plus non-class intersections', () => {
    const source = `<?php namespace App;
      interface Marker {}
      class Payload {}
      function objectClass(object|Payload $value): void {}
      function iterableTraversable(iterable|\\Traversable $value): void {}
      function duplicateClass(Payload|payload $value): void {}
      function duplicateQualified(\\App\\Payload|\\app\\payload $value): void {}
      function invalidIntersection(Marker&int $value): void {}
      function duplicateIntersection(Marker&marker $value): void {}
      function validObject(object|null $value): void {}
      function distinctSpelling(Payload|\\Vendor\\Payload $value): void {}
      interface Traversable {}
      function localTraversable(iterable|Traversable $value): void {}
      class ParentType {}
      class ChildType extends ParentType { public function validRelative(Marker&self $value): void {} }`;
    const document = TextDocument.create('file:///StructuralNativeTypes.php', 'php', 1, source);
    expect(analyzePhpDocument(document, parser).diagnostics.filter((item) => ['php.type.redundant-declaration', 'php.type.invalid-declaration'].includes(String(item.code)))
      .map((item) => [item.code, document.getText(item.range), item.message])).toEqual([
      ['php.type.redundant-declaration', 'Payload', 'Class type Payload is redundant when object is declared.'],
      ['php.type.redundant-declaration', '\\Traversable', 'Type \\Traversable is redundant when iterable is declared.'],
      ['php.type.redundant-declaration', 'payload', 'Type payload is declared more than once.'],
      ['php.type.redundant-declaration', '\\app\\payload', 'Type \\app\\payload is declared more than once.'],
      ['php.type.invalid-declaration', 'int', 'Type int cannot be part of an intersection type.'],
      ['php.type.redundant-declaration', 'marker', 'Type marker is declared more than once.'],
    ]);
  });
  it('reports invalid readonly property declarations with target-version precision', () => {
    const source = `<?php namespace App;
      class ExplicitReadonlyProperties {
        public static readonly $all = 1;
        public readonly int $defaulted = 1;
        public readonly mixed $valid;
        public function __construct(public readonly int $promoted = 1) {}
      }
      readonly class ReadonlyClassProperties {
        public $untyped;
        public static int $staticValue;
        public int $defaulted = 1;
        public mixed $valid;
        public function __construct(public int $promoted = 1) {}
      }`;
    const document = TextDocument.create('file:///ReadonlyProperties.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser, '8.2').diagnostics
      .filter((item) => item.code === 'php.property.invalid-readonly-declaration');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['$all', 'Readonly property App\\ExplicitReadonlyProperties::$all must have a type; cannot be static; cannot have a default value.'],
      ['$defaulted', 'Readonly property App\\ExplicitReadonlyProperties::$defaulted cannot have a default value.'],
      ['$untyped', 'Readonly property App\\ReadonlyClassProperties::$untyped must have a type.'],
      ['$staticValue', 'Readonly property App\\ReadonlyClassProperties::$staticValue cannot be static.'],
      ['$defaulted', 'Readonly property App\\ReadonlyClassProperties::$defaulted cannot have a default value.'],
    ]);

    const php81Diagnostics = analyzePhpDocument(document, parser, '8.1').diagnostics
      .filter((item) => item.code === 'php.property.invalid-readonly-declaration');
    expect(php81Diagnostics.map((item) => document.getText(item.range))).toEqual(['$all', '$defaulted']);
    expect(analyzePhpDocument(document, parser, '8.0').diagnostics
      .filter((item) => item.code === 'php.property.invalid-readonly-declaration')).toEqual([]);

    const incomplete = TextDocument.create('file:///IncompleteReadonlyProperty.php', 'php', 1, '<?php class Broken { public readonly int $');
    expect(analyzePhpDocument(incomplete, parser).diagnostics
      .filter((item) => item.code === 'php.property.invalid-readonly-declaration')).toEqual([]);
  });
  it('rejects static and readonly property hooks only when PHP 8.4 semantics apply', () => {
    const source = `<?php namespace App;
      class InvalidHooks {
        public static string $shared { get => self::$shared; }
        public readonly string $frozen { get => 'frozen'; }
        public private(set) string $writeOnly { set(string $value) { consume($value); } }
        public string $defaulted = 'value' { get => 'value'; }
        public array $referenceAndSet { &get { return $this->referenceAndSet; } set => $value; }
        public string $valid { get => 'valid'; }
      }`;
    const document = TextDocument.create('file:///InvalidHooks.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser, '8.4').diagnostics;
    expect(diagnostics.filter((item) => item.code === 'php.property.invalid-hook-declaration')
      .map((item) => [document.getText(item.range), item.message])).toEqual([
        ['$shared', 'Static property App\\InvalidHooks::$shared cannot declare hooks.'],
        ['$writeOnly', 'Virtual property App\\InvalidHooks::$writeOnly cannot specify asymmetric write visibility.'],
        ['$defaulted', 'Virtual property App\\InvalidHooks::$defaulted cannot specify a default value.'],
        ['$referenceAndSet', 'Backed property App\\InvalidHooks::$referenceAndSet cannot combine a by-reference get hook with a set hook.'],
      ]);
    expect(diagnostics.filter((item) => item.code === 'php.property.invalid-readonly-declaration')
      .map((item) => [document.getText(item.range), item.message])).toEqual([
        ['$frozen', 'Readonly property App\\InvalidHooks::$frozen cannot declare hooks.'],
      ]);
    expect(analyzePhpDocument(document, parser, '8.3').diagnostics.filter((item) =>
      item.code === 'php.property.invalid-hook-declaration' || item.code === 'php.property.invalid-readonly-declaration')).toEqual([]);
  });
  it('rejects invalid PHP 8.4 abstract and interface property-hook declarations', () => {
    const source = `<?php namespace App;
      class Concrete { abstract public string $missing { get; } }
      abstract class InvalidAbstract {
        abstract private string $private { get; }
        final abstract public string $final { get; }
        abstract public string $implemented { get => 'value'; }
        public string $bodyless { get; }
      }
      interface InvalidInterface {
        protected string $hidden { get; }
        public string $body { get => 'value'; }
        public string $finalHook { final get; }
      }`;
    const document = TextDocument.create('file:///InvalidAbstractProperties.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser, '8.4').diagnostics
      .filter((item) => item.code === 'php.property.invalid-abstract-declaration');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['$missing', 'Invalid declaration of App\\Concrete::$missing: a class with abstract properties must be declared abstract.'],
      ['$private', 'Invalid declaration of App\\InvalidAbstract::$private: abstract properties cannot be private.'],
      ['$final', 'Invalid declaration of App\\InvalidAbstract::$final: abstract properties cannot be final.'],
      ['$implemented', 'Invalid declaration of App\\InvalidAbstract::$implemented: abstract properties must specify at least one abstract hook.'],
      ['$bodyless', 'Invalid declaration of App\\InvalidAbstract::$bodyless: properties with bodyless hooks must be declared abstract.'],
      ['$hidden', 'Invalid declaration of App\\InvalidInterface::$hidden: interface properties must be public.'],
      ['$body', 'Invalid declaration of App\\InvalidInterface::$body: abstract properties must specify at least one abstract hook; interface property hooks cannot contain a body.'],
      ['$finalHook', 'Invalid declaration of App\\InvalidInterface::$finalHook: abstract property hooks cannot be final.'],
    ]);
    expect(analyzePhpDocument(document, parser, '8.3').diagnostics
      .filter((item) => item.code === 'php.property.invalid-abstract-declaration')).toEqual([]);
  });
  it('reports invalid relative type scopes while preserving trait and interface parents', () => {
    const source = `<?php namespace App {
      function outside(self $value): static { return new parent(); }
      self::run(); parent::run(); static::run();
      class Standalone { public function run(parent $value): void { parent::run(); new parent(); } }
      class Base { public static function run(): void {} }
      class Child extends Base { public function runChild(parent $value): self { parent::run(); return new static(); } }
      trait Shared { public function runShared(parent $value): self { parent::run(); return new static(); } }
      interface Root { public const VALUE = 1; }
      interface Contract extends Root { public const VALUE = parent::VALUE; }
      enum State { case Ready; public function invalid(parent $value): void { parent::run(); } }
    }`;
    const document = TextDocument.create('file:///RelativeScopes.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.type.invalid-relative-scope');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['self', 'Cannot use self outside a class, interface, trait, or enum scope.'],
      ['static', 'Cannot use static outside a class, interface, trait, or enum scope.'],
      ['parent', 'Cannot use parent outside a class, interface, trait, or enum scope.'],
      ['self', 'Cannot use self outside a class, interface, trait, or enum scope.'],
      ['parent', 'Cannot use parent outside a class, interface, trait, or enum scope.'],
      ['static', 'Cannot use static outside a class, interface, trait, or enum scope.'],
      ['parent', 'Cannot use parent in App\\Standalone because it has no parent type.'],
      ['parent', 'Cannot use parent in App\\Standalone because it has no parent type.'],
      ['parent', 'Cannot use parent in App\\Standalone because it has no parent type.'],
      ['parent', 'Cannot use parent in App\\State because it has no parent type.'],
      ['parent', 'Cannot use parent in App\\State because it has no parent type.'],
    ]);
  });
  it('reports invalid abstract method contracts while preserving legal interface and trait declarations', () => {
    const source = `<?php namespace App;
      abstract class AbstractService {
        abstract public function withBody(): void {}
        public function missingBody(): void;
        abstract private function hidden(): void;
        abstract protected function validAbstract(): void;
        abstract final public function finalAbstract(): void;
      }
      interface InvalidContract {
        public function withBody(): void {}
        final public function finalMethod(): void;
        protected function protectedMethod(): void;
      }
      interface ValidContract { public function valid(): void; }
      class ConcreteService { abstract private function pending(): void; }
      trait ValidTrait { abstract private function delegated(): void; }`;
    const document = TextDocument.create('file:///AbstractMethods.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.method.invalid-abstract-declaration');
    expect(diagnostics.map((item) => [document.getText(item.range), item.message])).toEqual([
      ['withBody', 'Invalid declaration of App\\AbstractService::withBody: abstract methods cannot contain a body.'],
      ['missingBody', 'Invalid declaration of App\\AbstractService::missingBody: non-abstract methods must contain a body.'],
      ['hidden', 'Invalid declaration of App\\AbstractService::hidden: abstract methods cannot be private outside a trait.'],
      ['finalAbstract', 'Invalid declaration of App\\AbstractService::finalAbstract: abstract methods cannot be final.'],
      ['withBody', 'Invalid declaration of App\\InvalidContract::withBody: interface methods cannot contain a body.'],
      ['finalMethod', 'Invalid declaration of App\\InvalidContract::finalMethod: interface methods cannot be final.'],
      ['protectedMethod', 'Invalid declaration of App\\InvalidContract::protectedMethod: interface methods must be public.'],
      ['pending', 'Invalid declaration of App\\ConcreteService::pending: a class with abstract methods must be declared abstract; abstract methods cannot be private outside a trait.'],
    ]);
    const incomplete = TextDocument.create('file:///IncompleteAbstract.php', 'php', 1, '<?php abstract class Broken { abstract function run(');
    expect(analyzePhpDocument(incomplete, parser).diagnostics.filter((item) => item.code === 'php.method.invalid-abstract-declaration')).toEqual([]);
  });
  it('reports a namespace mismatch only when the caller proves a unique PSR-4 namespace', () => {
    const document = TextDocument.create('file:///src/Model/User.php', 'php', 1, '<?php namespace Wrong; class User {}');
    expect(analyzePhpDocument(document, parser, '8.5', 'App\\Model').diagnostics).toMatchObject([{ code: 'php.namespace.psr4', severity: 2, data: { expectedNamespace: 'App\\Model' } }]);
    expect(analyzePhpDocument(document, parser).diagnostics).toEqual([]);
    const multiple = TextDocument.create('file:///Mixed.php', 'php', 1, '<?php namespace One { class A {} } namespace Two { class B {} }');
    expect(analyzePhpDocument(multiple, parser, '8.5', 'App').diagnostics).toEqual([]);
  });
  it('reports statements after direct or complete conditional termination as unreachable', () => {
    const source = `<?php function run(bool $stop): void {
      if ($stop) { return; validAfterConditional(); }
      while ($stop) { break; unreachableInLoop(); }
      return; first(); second();
    }
    function branches(int $value): void {
      if ($value === 1) { return; } elseif ($value === 2) { throw new Exception(); } else { exit; }
      afterCompleteConditional();
    }
    function incomplete(bool $value): void {
      if ($value) { return; } elseif (rand(0, 1)) { throw new Exception(); }
      afterIncompleteConditional();
      if ($value) { return; } else { keepGoing(); }
      afterContinuingConditional();
    }
    function guarded(bool $value): void {
      try { if ($value) { return; } else { throw new Exception(); } }
      catch (RuntimeException $error) { return; }
      catch (Exception $error) { exit; }
      afterCompleteTry();
    }
    function continuingTry(): void {
      try { return; } catch (Exception $error) { recover(); }
      afterContinuingCatch();
    }
    function terminatingFinally(): void {
      try { work(); } finally { throw new Exception(); }
      afterTerminatingFinally();
    }
    function completeSwitch(int $value): void {
      switch ($value) {
        case 1: return;
        case 2: prepare();
        default: throw new Exception();
      }
      afterCompleteSwitch();
    }
    function incompleteSwitch(int $value): void {
      switch ($value) { case 1: return; case 2: break; default: exit; }
      afterBreakSwitch();
      switch ($value) { case 1: return; }
      afterNoDefaultSwitch();
    }
    function bypassingBranch(bool $stop): void {
      while (true) {
        if ($stop) { break; return; } else { exit; }
        wronglyUnreachableAfterLoop();
      }
    }
    function infiniteLoop(): void {
      while (true) { work(); continue; }
      afterInfiniteLoop();
    }
    function breakableLoop(bool $stop): void {
      while (true) { if ($stop) { break; } work(); }
      afterBreakableLoop();
      while ($stop) { work(); }
      afterDynamicLoop();
    }
    function otherInfiniteLoops(): void {
      for (;;) { work(); }
      afterInfiniteFor();
    }
    function initializedInfiniteFor(): void {
      for ($index = 0; ; $index++) { work(); }
      afterInitializedInfiniteFor();
    }
    function conditionalFor(bool $stop): void {
      for ($index = 0; $stop; $index++) { work(); }
      afterConditionalFor();
    }
    function infiniteDo(): void {
      do { continue; } while (true);
      afterInfiniteDo();
    }
    function breakableDo(bool $stop): void {
      do { if ($stop) { break; } } while (true);
      afterBreakableDo();
    }`;
    const document = TextDocument.create('file:///Unreachable.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.control-flow.unreachable');
    expect(diagnostics.map((item) => document.getText(item.range))).toEqual([
      'validAfterConditional();', 'first();', 'second();', 'afterCompleteConditional();',
      'afterCompleteTry();', 'afterTerminatingFinally();', 'afterCompleteSwitch();', 'afterInfiniteLoop();',
      'afterInfiniteFor();', 'afterInitializedInfiniteFor();', 'afterInfiniteDo();',
    ]);
  });

  it('suppresses unreachable diagnostics when the flow traversal budget is exhausted', () => {
    const nested = `${'if (true) { '.repeat(300)}return;${' }'.repeat(300)} after();`;
    const document = TextDocument.create('file:///DeepFlow.php', 'php', 1, `<?php function deep(): void { ${nested} }`);
    expect(analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.control-flow.unreachable')).toEqual([]);
  });

  it('accepts semantically proven never calls as terminating statements', () => {
    const source = '<?php function run(): void { stop(); afterStop(); }';
    const callStart = source.indexOf('stop()');
    const document = TextDocument.create('file:///NeverFlow.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser, '8.5', undefined,
      [{ start: callStart, end: callStart + 'stop()'.length }]).diagnostics
      .filter((item) => item.code === 'php.control-flow.unreachable');
    expect(diagnostics.map((item) => document.getText(item.range))).toEqual(['afterStop();']);
    expect(analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.control-flow.unreachable')).toEqual([]);
  });

  it('recognizes guaranteed nested throw expressions without crossing conditional evaluation', () => {
    const source = `<?php
      function assignment(): void { $value = throw new Exception(); afterAssignment(); }
      function argument(): void { consume(throw new Exception()); afterArgument(); }
      function shortCircuit(bool $ready): void { $ready && throw new Exception(); afterShortCircuit(); }
      function ternary(bool $ready): void { $value = $ready ? throw new A() : throw new B(); afterTernary(); }
      function partialTernary(bool $ready): void { $value = $ready ? throw new A() : 1; afterPartialTernary(); }
      function matched(int $value): void { $result = match ($value) { 1 => throw new A(), default => throw new B() }; afterMatch(); }
      function partialMatch(int $value): void { $result = match ($value) { 1 => throw new A(), default => 1 }; afterPartialMatch(); }
      function condition(): void { if (throw new Exception()) {} afterCondition(); }
      function completeValue(bool $ready): int { $value = $ready ? throw new A() : throw new B(); }
      function incompleteValue(bool $ready): int { $value = $ready ? throw new A() : 1; }
    `;
    const document = TextDocument.create('file:///ThrowExpressions.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics;
    expect(diagnostics.filter((item) => item.code === 'php.control-flow.unreachable').map((item) => document.getText(item.range))).toEqual([
      'afterAssignment();', 'afterArgument();', 'afterTernary();', 'afterMatch();', 'afterCondition();',
    ]);
    expect(diagnostics.filter((item) => item.code === 'php.return.missing').map((item) => document.getText(item.range)))
      .toEqual(['incompleteValue']);
  });

  it('reports only proven normal completion paths in native never callables', () => {
    const source = `<?php
      function emptyBody(): never {}
      function directThrow(): never { throw new Exception(); }
      function complete(bool $ready): never { if ($ready) { exit; } else { throw new Exception(); } }
      function missingElse(bool $ready): never { if ($ready) { throw new Exception(); } }
      function dynamicLoop(bool $ready): never { while ($ready) { throw new Exception(); } }
      function infiniteLoop(): never { while (true) { work(); } }
      function unknownCall(): never { work(); }
      function provenCall(): never { stop(); }
      abstract class Contract { abstract public function abstractStop(): never; }
    `;
    const stopStart = source.indexOf('stop()');
    const document = TextDocument.create('file:///NeverDeclarations.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser, '8.5', undefined,
      [{ start: stopStart, end: stopStart + 'stop()'.length }]).diagnostics.filter((item) => item.code === 'php.never.fallthrough');
    expect(diagnostics.map((item) => document.getText(item.range))).toEqual(['emptyBody', 'missingElse', 'dynamicLoop']);
    expect(analyzePhpDocument(document, parser, '8.0').diagnostics.filter((item) => item.code === 'php.never.fallthrough')).toEqual([]);
  });

  it('reports only proven missing returns for native value return types', () => {
    const source = `<?php namespace App;
      function emptyValue(): int {}
      function emptyNullable(): ?int {}
      function emptyMixed(): mixed {}
      function complete(bool $ready): string { if ($ready) { return 'yes'; } else { throw new Exception(); } }
      function missingElse(bool $ready): string { if ($ready) { return 'yes'; } }
      function unknownCall(): string { work(); }
      function generator(): iterable { if (false) { yield 1; } }
      function noValue(): void {}
      abstract class Contract { abstract public function value(): int; }
    `;
    const document = TextDocument.create('file:///MissingReturns.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser).diagnostics.filter((item) => item.code === 'php.return.missing');
    expect(diagnostics.map((item) => document.getText(item.range))).toEqual(['emptyValue', 'emptyNullable', 'emptyMixed', 'missingElse']);
    expect(diagnostics.map((item) => item.message)).toEqual([
      'App\\emptyValue can complete without returning a value of type int.',
      'App\\emptyNullable can complete without returning a value of type ?int.',
      'App\\emptyMixed can complete without returning a value of type mixed.',
      'App\\missingElse can complete without returning a value of type string.',
    ]);
  });

  it('returns nested methods and top-level functions as document symbols', () => {
    const document = TextDocument.create('file:///Symbols.php', 'php', 1, '<?php namespace App; class User { public function name(): string {} } function helper(): void {}');
    const result = analyzePhpDocument(document, parser);
    expect(result.symbols).toMatchObject([
      { name: 'User', children: [{ name: 'name', detail: 'name(): string' }] },
      { name: 'helper', detail: 'App\\helper' },
    ]);
  });

  it('returns properties and class constants as nested symbols', () => {
    const document = TextDocument.create('file:///Members.php', 'php', 1, '<?php class User { public string $name; public const string KIND = "user"; }');
    expect(analyzePhpDocument(document, parser).symbols).toMatchObject([{ name: 'User', children: [
      { name: '$name', kind: SymbolKind.Property },
      { name: 'KIND', kind: SymbolKind.Constant },
    ] }]);
  });
  it('returns namespace constants as top-level document symbols', () => {
    const document = TextDocument.create('file:///Constants.php', 'php', 1, '<?php namespace App; const VERSION = "1";');
    expect(analyzePhpDocument(document, parser).symbols).toMatchObject([{ name: 'VERSION', detail: 'App\\VERSION', kind: SymbolKind.Constant }]);
  });
});

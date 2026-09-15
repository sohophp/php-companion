import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '@php-companion/semantic';
import { indexComposerRoot } from '../src/projectIndex.js';
import { BUILTIN_DOCUMENT_URI, builtinPhpStub } from '@php-companion/language-spec';

describe('bounded Composer indexing', () => {
  let root: string | undefined;
  afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });
  it('indexes root and vendor PSR-4 declarations for semantic queries', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-ls-project-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'vendor', 'vendor', 'package', 'src'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'vendor/package', autoload: { 'psr-4': { 'Vendor\\Package\\': 'src/' } } }] }));
    await writeFile(join(root, 'vendor', 'vendor', 'package', 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Vendor\\Package\\': 'src/' } } }));
    const dependency = join(root, 'vendor', 'vendor', 'package', 'src', 'Clock.php');
    await writeFile(dependency, '<?php namespace Vendor\\Package; class Clock { public function now(): int {} }');
    const parser = await PhpSyntaxParser.createDefault();
    const semantic = new SemanticWorkspace(parser);
    try {
      const result = await indexComposerRoot(root, semantic);
      expect(result).toMatchObject({ files: 1, complete: true });
      const consumer = '<?php namespace App; use Vendor\\Package\\Clock; function run(Clock $clock): void { $clock->no }';
      const uri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
      semantic.update(uri, consumer);
      expect(semantic.completeMembers(uri, consumer.indexOf('no }') + 2)).toMatchObject([{ name: 'now', uri: pathToFileURL(dependency).toString() }]);
    } finally { parser.dispose(); }
  });

  it('fails closed before indexing when the file budget is exceeded', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-ls-budget-'));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await Promise.all(['A', 'B'].map((name) => writeFile(join(root!, 'src', `${name}.php`), `<?php class ${name} {}`)));
    const parser = await PhpSyntaxParser.createDefault();
    try {
      const result = await indexComposerRoot(root, new SemanticWorkspace(parser), { maxFiles: 1, maxFileSizeBytes: 1024, maxTotalBytes: 2048 });
      expect(result).toMatchObject({ files: 0, complete: false });
    } finally { parser.dispose(); }
  });
  it('requires an import for a global builtin class inside a namespace', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      const source = '<?php namespace App; function show(DateTimeImmutable $date): void { $date->for }';
      semantic.update('file:///BuiltinConsumer.php', source);
      expect(semantic.completeMembers('file:///BuiltinConsumer.php', source.indexOf('for }') + 3)).toEqual([]);
      expect(semantic.definition('file:///BuiltinConsumer.php', source.indexOf('DateTimeImmutable') + 2)).toEqual([]);
      const partial = '<?php namespace App; function show(DateTimeImm';
      semantic.update('file:///BuiltinPartial.php', partial);
      expect(semantic.completeTypes('file:///BuiltinPartial.php', partial.length)).toMatchObject([
        { name: 'DateTimeImmutable', fqcn: 'DateTimeImmutable', importFqcn: 'DateTimeImmutable' },
      ]);
      const imported = '<?php namespace App; use DateTimeImmutable; function show(DateTimeImmutable $date): void { $date->for }';
      semantic.update('file:///BuiltinImported.php', imported);
      expect(semantic.completeMembers('file:///BuiltinImported.php', imported.indexOf('for }') + 3)).toMatchObject([{ name: 'format', uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition('file:///BuiltinImported.php', imported.lastIndexOf('DateTimeImmutable') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('resolves standard exceptions with inherited members and constructor signatures', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      const source = `<?php namespace App;
        function report(\\Throwable $error): string { return $error->getMessage(); }
        function fail(): void {
          $error = new \\InvalidArgumentException(message: 'invalid', code: 2);
          report($error);
          $error->getM;
        }
        function leak(\\Exception $error): void { echo $error->message; }
        class InvalidFailure extends \\RuntimeException { public function getMessage(): string { return ''; } }
        function modern(\\JsonException $json, \\UnhandledMatchError $match, \\FiberError $fiber, \\RequestParseBodyException $body): void {}
      `;
      const uri = 'file:///BuiltinExceptions.php'; semantic.update(uri, source);
      expect(semantic.unresolvedNewTypes(uri)).toEqual([]);
      expect(semantic.unresolvedTypeReferences(uri)).toEqual([]);
      expect(semantic.completeMembers(uri, source.indexOf('$error->getM') + '$error->getM'.length)
        .map((item) => item.name)).toContain('getMessage');
      expect(semantic.definition(uri, source.indexOf('InvalidArgumentException') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.inaccessibleMemberAccesses(uri)).toMatchObject([
        { name: 'message', ownerFqcn: 'Exception', kind: 'property', visibility: 'protected' },
      ]);
      expect(semantic.incompatibleMethodOverrides(uri)).toMatchObject([
        { method: 'App\\InvalidFailure::getMessage', inheritedMethod: 'Exception::getMessage', reason: 'a final method cannot be overridden' },
      ]);
      expect(semantic.signature(uri, source.indexOf("message: 'invalid'") + 2)).toMatchObject({
        fqcn: 'Exception::__construct', calledOnFqcn: 'InvalidArgumentException',
        parameters: [{ name: 'message' }, { name: 'code' }, { name: 'previous' }],
      });
    } finally { parser.dispose(); }
  });
  it('does not expose exception classes before their target PHP version', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        function legacy(\\RuntimeException $runtime, \\ParseError $parse): void {}
        function newer(\\CompileError $compile, \\JsonException $json, \\ValueError $value, \\UnhandledMatchError $match, \\FiberError $fiber, \\RequestParseBodyException $body): void {}
      `;
      const uri = 'file:///VersionedBuiltinExceptions.php';
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2')); semantic.update(uri, source);
      expect(semantic.unresolvedTypeReferences(uri).map((item) => item.fqcn)).toEqual([
        'CompileError', 'JsonException', 'ValueError', 'UnhandledMatchError', 'FiberError', 'RequestParseBodyException',
      ]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(semantic.unresolvedTypeReferences(uri)).toEqual([]);
    } finally { parser.dispose(); }
  });
  it('resolves versioned Fiber and sensitive-parameter members, signatures, and definitions', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        function fibers(\\Fiber $fiber): void {
          $fiber->res;
          $reflection = new \\ReflectionFiber($fiber);
          $reflection->getExec;
          $current = \\Fiber::getCurrent();
          if ($current !== null) { $current->isSusp; }
        }
        #[\\SensitiveParameter]
        function secret(string $token): void {
          $wrapped = new \\SensitiveParameterValue($token);
          $wrapped->getV;
        }
      `;
      const uri = 'file:///VersionedFiber.php';
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1')); semantic.update(uri, source);
      expect(semantic.unresolvedTypeReferences(uri)).toEqual([]);
      expect(semantic.unresolvedNewTypes(uri).map((item) => item.fqcn)).toEqual(['SensitiveParameterValue']);
      expect(semantic.completeMembers(uri, source.indexOf('$fiber->res') + '$fiber->res'.length).map((item) => item.name)).toEqual(['resume']);
      expect(semantic.completeMembers(uri, source.indexOf('$reflection->getExec') + '$reflection->getExec'.length).map((item) => item.name)).toEqual(['getExecutingFile', 'getExecutingLine']);
      expect(semantic.completeMembers(uri, source.indexOf('$current->isSusp') + '$current->isSusp'.length).map((item) => item.name)).toEqual(['isSuspended']);
      expect(semantic.signature(uri, source.indexOf('new \\ReflectionFiber(') + 'new \\ReflectionFiber('.length)).toMatchObject({
        fqcn: 'ReflectionFiber::__construct', parameters: [{ name: 'fiber', type: 'Fiber' }],
      });
      expect(semantic.definition(uri, source.indexOf('ReflectionFiber') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(semantic.unresolvedTypeReferences(uri)).toEqual([]);
      expect(semantic.unresolvedNewTypes(uri)).toEqual([]);
      expect(semantic.completeMembers(uri, source.indexOf('$wrapped->getV') + '$wrapped->getV'.length).map((item) => item.name)).toEqual(['getValue']);
      expect(semantic.definition(uri, source.indexOf('SensitiveParameter') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('resolves core iterable contracts, automatic interfaces, and non-constructible objects', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      const source = `<?php namespace App;
        class Item { public function name(): string { return ''; } }
        class Printable { public function __toString(): string { return ''; } }
        enum State { case Ready; }
        enum Code: string { case Ready = 'ready'; }
        /** @param \\Generator<int, Item, mixed, string> $items */
        function iterate(\\Generator $items): void { foreach ($items as $item) { $item->na; } $items->getR; }
        function contracts(\\ArrayAccess $offsets, \\Countable $countable, \\JsonSerializable $json, \\WeakMap $weak): void { $offsets->offsetG; $countable->cou; $json->jsonS; $weak->getI; $weak->offsetSet(new Item(), 'value'); }
        function automatic(\\Stringable $text, \\UnitEnum $unit, \\BackedEnum $backed): void {}
        function useAutomatic(): void { automatic(new Printable(), State::Ready, Code::Ready); }
        function invalid(): void { new \\Generator(); new \\WeakReference(); new \\Closure(); }
        function dynamic(): void { $value = new \\stdClass(); $value->label = 'ok'; }
      `;
      const uri = 'file:///BuiltinCoreObjects.php'; semantic.update(uri, source);
      expect(semantic.unresolvedNewTypes(uri)).toEqual([]);
      expect(semantic.unresolvedTypeReferences(uri)).toEqual([]);
      expect(semantic.completeMembers(uri, source.indexOf('$item->na') + '$item->na'.length).map((item) => item.name)).toEqual(['name']);
      for (const [marker, member] of [['$items->getR', 'getReturn'], ['$offsets->offsetG', 'offsetGet'], ['$countable->cou', 'count'], ['$json->jsonS', 'jsonSerialize'], ['$weak->getI', 'getIterator']] as const) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name)).toContain(member);
      }
      expect(semantic.isSubtype('App\\Printable', 'Stringable')).toBe(true);
      expect(semantic.isSubtype('App\\State', 'UnitEnum')).toBe(true);
      expect(semantic.isSubtype('App\\Code', 'BackedEnum')).toBe(true);
      expect(semantic.signature(uri, source.indexOf('$weak->offsetSet') + '$weak->offsetSet('.length)).toMatchObject({
        fqcn: 'WeakMap::offsetSet', parameters: [{ name: 'object', type: 'object' }, { name: 'value', type: 'TValue' }],
      });
      expect(semantic.inaccessibleInstantiations(uri).map((item) => item.target)).toEqual(['Generator', 'WeakReference', 'Closure']);
      expect(semantic.dynamicPropertyCreations(uri)).toEqual([]);
    } finally { parser.dispose(); }
  });
  it('infers precise Generator key, value, and return types from supported yield bodies', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      const source = `<?php namespace App;
        class Item { public function name(): string { return ''; } }
        class Other { public function other(): string { return ''; } }
        class Result { public function done(): void {} }
        class StreamFactory {
          public function stream(Item $item): \\Generator { yield $item; }
          public static function staticStream(): \\Generator { yield new Item(); }
        }
        function generated(Item $first): \\Generator { yield $first; yield 'named' => new Item(); return new Result(); }
        function delegated(): \\Generator { yield from [new Item(), new Item()]; }
        /** @param iterable<string, Item> $items */
        function forwarded(iterable $items) { yield from $items; }
        function implicit() { yield new Item(); }
        function nested(): \\Generator { $inner = function () { yield new Other(); }; yield new Item(); }
        /** @return \\Generator<int, Item, mixed, Result> */
        function documented(): \\Generator { yield unknown_value(); }
        function unknown(mixed $value): \\Generator { yield $value; }
        function consume(StreamFactory $factory): void {
          $generated = generated(new Item()); foreach ($generated as $item) { $item->na; }
          $delegated = delegated(); foreach ($delegated as $delegatedItem) { $delegatedItem->na; }
          $nested = nested(); foreach ($nested as $nestedItem) { $nestedItem->na; }
          $documented = documented(); foreach ($documented as $documentedItem) { $documentedItem->na; }
          $forwarded = forwarded([]); $implicit = implicit();
          $method = $factory->stream(new Item()); foreach ($method as $methodItem) { $methodItem->na; }
          $static = StreamFactory::staticStream(); foreach ($static as $staticItem) { $staticItem->na; }
          $unknown = unknown(value()); foreach ($unknown as $unknownItem) { $unknownItem->na; }
        }
      `;
      const uri = 'file:///InferredGenerators.php'; semantic.update(uri, source);
      expect(semantic.signature(uri, source.indexOf('generated(new Item())') + 'generated('.length)?.returnType)
        .toBe('Generator<int|string, App\\Item, mixed, App\\Result>');
      expect(semantic.signature(uri, source.indexOf('delegated();') + 'delegated('.length)?.returnType)
        .toBe('Generator<int, App\\Item, mixed, void>');
      expect(semantic.signature(uri, source.lastIndexOf('forwarded(') + 'forwarded('.length)?.returnType)
        .toBe('Generator<string, App\\Item, mixed, void>');
      expect(semantic.signature(uri, source.lastIndexOf('implicit(') + 'implicit('.length)?.returnType)
        .toBe('Generator<int, App\\Item, mixed, void>');
      expect(semantic.signature(uri, source.lastIndexOf('stream(') + 'stream('.length)?.returnType)
        .toBe('Generator<int, App\\Item, mixed, void>');
      expect(semantic.signature(uri, source.lastIndexOf('staticStream(') + 'staticStream('.length)?.returnType)
        .toBe('Generator<int, App\\Item, mixed, void>');
      expect(semantic.signature(uri, source.indexOf('documented();') + 'documented('.length)?.returnType)
        .toBe('\\Generator<int, Item, mixed, Result>');
      for (const marker of ['$item->na', '$delegatedItem->na', '$nestedItem->na', '$documentedItem->na', '$methodItem->na', '$staticItem->na']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name), marker).toEqual(['name']);
      }
      expect(semantic.completeMembers(uri, source.indexOf('$unknownItem->na') + '$unknownItem->na'.length)).toEqual([]);
    } finally { parser.dispose(); }
  });
  it('invalidates versioned core object availability when the PHP target changes', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php function consume(\\WeakReference $reference, \\Stringable $stringable, \\WeakMap $map, \\UnitEnum $unit, \\BackedEnum $backed): void {}`;
      const uri = 'file:///VersionedCoreObjects.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.3'));
      expect(semantic.unresolvedTypeReferences(uri).map((item) => item.fqcn)).toEqual(['WeakReference', 'Stringable', 'WeakMap', 'UnitEnum', 'BackedEnum']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.unresolvedTypeReferences(uri).map((item) => item.fqcn)).toEqual(['Stringable', 'WeakMap', 'UnitEnum', 'BackedEnum']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.unresolvedTypeReferences(uri).map((item) => item.fqcn)).toEqual(['UnitEnum', 'BackedEnum']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.unresolvedTypeReferences(uri)).toEqual([]);
    } finally { parser.dispose(); }
  });
  it('switches Date/Time factories, exceptions, and fixed DatePeriod iteration with the PHP target', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        function dates(\\DateTimeImmutable $date, \\DatePeriod $period, \\DateInterval $interval): void {
          \\DateTime::createFromImmutable($date);
          \\DateTime::createFromInterface($date);
          \\DatePeriod::createFromISO8601String('R1/2020-01-01T00:00:00Z/P1D');
          \\DateTimeImmutable::createFromTimestamp(1);
          $date->getMicrosecond();
          new DatePeriod(isostr: 'R1/2020-01-01T00:00:00Z/P1D');
          new DatePeriod(start: $date, interval: $interval, recurrences: 2);
          new DatePeriod(start: $date, interval: $interval, end: $date);
          foreach ($period as $entry) { $entry->for; }
        }
        function dateFailure(\\DateMalformedStringException $error): void {}
      `;
      const uri = 'file:///VersionedDateTime.php'; semantic.update(uri, source);
      const unresolvedMembers = (): string[] => semantic.unresolvedMembers(uri).map((item) => item.name);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(unresolvedMembers()).toEqual(['createFromImmutable', 'createFromInterface', 'createFromISO8601String', 'createFromTimestamp', 'getMicrosecond']);
      expect(semantic.unresolvedTypeReferences(uri).map((item) => item.fqcn)).toEqual(['DateMalformedStringException']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.3'));
      expect(unresolvedMembers()).toEqual(['createFromInterface', 'createFromISO8601String', 'createFromTimestamp', 'getMicrosecond']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(unresolvedMembers()).toEqual(['createFromISO8601String', 'createFromTimestamp', 'getMicrosecond']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(unresolvedMembers()).toEqual(['createFromTimestamp', 'getMicrosecond']);
      expect(semantic.unresolvedTypeReferences(uri)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(unresolvedMembers()).toEqual([]);
      expect(semantic.completeMembers(uri, source.indexOf('$entry->for') + '$entry->for'.length).map((item) => item.name)).toEqual(['format']);
      expect(semantic.signature(uri, source.indexOf('createFromTimestamp(1)') + 'createFromTimestamp('.length)).toMatchObject({
        fqcn: 'DateTimeImmutable::createFromTimestamp', returnType: 'static', parameters: [{ name: 'timestamp', type: 'int|float' }],
      });
      const constructors = semantic.signatures(uri, source.indexOf('new DatePeriod(isostr:') + 'new DatePeriod('.length);
      expect(constructors.map((signature) => signature.parameters.map((parameter) => parameter.name))).toEqual([
        ['start', 'interval', 'recurrences', 'options'],
        ['start', 'interval', 'end', 'options'],
        ['isostr', 'options'],
      ]);
      expect(semantic.signatures(uri, source.indexOf("isostr: '") + 'isostr:'.length)).toHaveLength(1);
      expect(semantic.signatures(uri, source.indexOf('recurrences: 2') + 'recurrences:'.length)[0]?.parameters[2]?.name).toBe('recurrences');
      expect(semantic.signatures(uri, source.indexOf('end: $date') + 'end:'.length)[0]?.parameters[2]?.name).toBe('end');
    } finally { parser.dispose(); }
  });
  it('selects audited string function overloads and versioned signatures without widening correlated parameters', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        implode('-', ['a', 'b']);
        implode(['a', 'b'], '-');
        strtr('abc', ['a' => 'x']);
        strtr('abc', 'a', 'x');
        str_contains('abc', 'b');
        substr('abc', 1);
      `;
      const uri = 'file:///VersionedStrings.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      const signatureAt = (marker: string, length = marker.length): ReturnType<SemanticWorkspace['signatures']> =>
        semantic.signatures(uri, source.indexOf(marker) + length);
      expect(signatureAt("'-', ['a', 'b']", "'-', ['a', 'b']".length)).toHaveLength(1);
      expect(signatureAt("['a', 'b'], '-'", "['a', 'b'], '-'".length)[0]?.parameters.map((parameter) => parameter.name)).toEqual(['array', 'separator']);
      expect(signatureAt("'abc', ['a' => 'x']", "'abc', ['a' => 'x']".length)[0]?.parameters.map((parameter) => parameter.type)).toEqual(['string', 'array']);
      expect(signatureAt("'abc', 'a', 'x'", "'abc', 'a', 'x'".length)[0]?.parameters.map((parameter) => parameter.type)).toEqual(['string', 'string', 'string']);
      expect(signatureAt("str_contains('abc'", 'str_contains('.length)).toEqual([]);
      expect(signatureAt("substr('abc', 1", 'substr('.length)[0]?.returnType).toBe('string|false');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signatureAt("['a', 'b'], '-'", "['a', 'b'], '-'".length)[0]?.parameters.map((parameter) => parameter.name)).toEqual(['separator', 'array']);
      expect(semantic.incompatibleArguments(uri).filter((item) => item.callable === 'implode').map((item) => [item.actualType, item.expectedType])).toEqual([
        ['non-empty-list<string>', 'string'], ['string', 'array'],
      ]);
      expect(signatureAt("str_contains('abc'", 'str_contains('.length)[0]?.returnType).toBe('bool');
      expect(signatureAt("substr('abc', 1", 'substr('.length)[0]?.returnType).toBe('string');
    } finally { parser.dispose(); }
  });
  it('indexes complete Strings catalog shapes and removal/addition boundaries', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        $counts = count_chars('abca', 1); $used = count_chars('abca', 3);
        $wordCount = str_word_count('one two', 0); $words = str_word_count('one two', 1);
        $positions = str_word_count('one two', 2); $csv = str_getcsv('a,b');
        $locale = localeconv(); $translation = get_html_translation_table(HTML_ENTITIES, ENT_QUOTES | ENT_HTML5);
        $replacedString = substr_replace('abc', 'x', 1); $replacedArray = substr_replace(['abc'], 'x', 1);
        sscanf('42', '%d', $number); strtok('a,b', ','); strtok(','); strip_tags('<p>x</p>');
        convert_cyr_string('abc', 'k', 'w'); hebrevc('text'); money_format('%i', 1.0);
        str_increment('AZ'); str_decrement('BA'); utf8_encode('text');
      `;
      const uri = 'file:///CompleteStrings.php'; semantic.update(uri, source);
      const returnAt = (call: string): string | undefined => semantic.signature(uri, source.indexOf(call) + call.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnAt("count_chars('abca', 1)")).toBe('array<int, int>');
      expect(returnAt("count_chars('abca', 3)")).toBe('string');
      expect(returnAt("str_word_count('one two', 0)")).toBe('int');
      expect(returnAt("str_word_count('one two', 1)")).toBe('list<string>');
      expect(returnAt("str_word_count('one two', 2)")).toBe('array<int, string>');
      expect(semantic.signature(uri, source.indexOf('strip_tags(') + 'strip_tags('.length)?.parameters[1]?.type).toBe('string|null');
      expect(semantic.signatures(uri, source.indexOf('str_increment(') + 'str_increment('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.signature(uri, source.indexOf('strip_tags(') + 'strip_tags('.length)?.parameters[1]?.type).toBe('array|string|null');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signatures(uri, source.indexOf('convert_cyr_string(') + 'convert_cyr_string('.length)).toEqual([]);
      expect(semantic.signatures(uri, source.indexOf('hebrevc(') + 'hebrevc('.length)).toEqual([]);
      expect(semantic.signatures(uri, source.indexOf('money_format(') + 'money_format('.length)).toEqual([]);
      expect(returnAt("count_chars('abca', 1)")).toBe('array<int, int>');
      expect(returnAt("count_chars('abca', 3)")).toBe('string');
      expect(returnAt("str_word_count('one two', 0)")).toBe('int');
      expect(returnAt("str_word_count('one two', 1)")).toBe('list<string>');
      expect(returnAt("str_word_count('one two', 2)")).toBe('array<int, string>');
      expect(returnAt("str_getcsv('a,b')")).toBe('list<string|null>');
      expect(returnAt("substr_replace('abc', 'x', 1)")).toBe('string');
      expect(returnAt("substr_replace(['abc'], 'x', 1)")).toBe('array');
      expect(returnAt('localeconv()')).toContain('decimal_point: string');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(returnAt("str_increment('AZ')")).toBe('string');
      expect(returnAt("str_decrement('BA')")).toBe('string');
      for (const symbol of ['count_chars', 'str_word_count', 'str_getcsv', 'localeconv',
        'get_html_translation_table', 'substr_replace', 'sscanf', 'strtok', 'str_increment',
        'str_decrement', 'utf8_encode']) {
        expect(semantic.definition(uri, source.indexOf(`${symbol}(`) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      expect(semantic.definition(uri, source.indexOf('ENT_HTML5') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('gates versioned array failure and mutation contracts', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        /** @param array<string, string> $items */
        function arrays(array $items): void {
          array_merge(); array_is_list($items); array_combine([], []); array_walk($items, static function (): void {});
        }
      `;
      const uri = 'file:///VersionedArrays.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.3'));
      expect(semantic.missingRequiredArguments(uri).filter((item) => item.callable === 'array_merge')).toHaveLength(1);
      expect(semantic.signatures(uri, source.indexOf('array_is_list(') + 'array_is_list('.length)).toEqual([]);
      expect(semantic.signature(uri, source.indexOf('array_combine([], [])') + 'array_combine('.length)?.returnType).toBe('array<array-key, TValue>|false');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.missingRequiredArguments(uri).filter((item) => item.callable === 'array_merge')).toEqual([]);
      expect(semantic.signature(uri, source.indexOf('array_combine([], [])') + 'array_combine('.length)?.returnType).toBe('array<array-key, TValue>');
      expect(semantic.signatures(uri, source.indexOf('array_is_list(') + 'array_is_list('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.signature(uri, source.indexOf('array_is_list(') + 'array_is_list('.length)?.returnType).toBe('bool');
      expect(semantic.signature(uri, source.indexOf('array_walk($items') + 'array_walk('.length)?.returnType).toBe('bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(semantic.signature(uri, source.indexOf('array_walk($items') + 'array_walk('.length)?.returnType).toBe('true');
    } finally { parser.dispose(); }
  });
  it('propagates generic array keys, values, filters, and maps', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class ArrayItem { public function name(): string { return ''; } }
        function acceptInt(int $value): void {}
        /** @param array<string, ArrayItem> $items */
        function arrays(array $items): void {
          $values = array_values($items); foreach ($values as $value) { $value->na; }
          $filtered = array_filter($items); foreach ($filtered as $filteredValue) { $filteredValue->na; }
          $mapped = array_map(fn(ArrayItem $item): ArrayItem => $item, $items); foreach ($mapped as $mappedValue) { $mappedValue->na; }
          $keys = array_keys($items); foreach ($keys as $key) { acceptInt($key); }
          $found = array_search(new ArrayItem(), $items, true); acceptInt($found);
        }
      `;
      const uri = 'file:///GenericArrays.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.completeMembers(uri, source.indexOf('$value->na') + '$value->na'.length).map((item) => item.name)).toEqual(['name']);
      expect(semantic.completeMembers(uri, source.indexOf('$filteredValue->na') + '$filteredValue->na'.length).map((item) => item.name)).toEqual(['name']);
      expect(semantic.completeMembers(uri, source.indexOf('$mappedValue->na') + '$mappedValue->na'.length).map((item) => item.name)).toEqual(['name']);
      expect(semantic.incompatibleArguments(uri).filter((item) => item.callable === 'App\\acceptInt').map((item) => item.actualType)).toEqual(['string', 'false|string']);
    } finally { parser.dispose(); }
  });
  it('gates modern array APIs and propagates their generic key and value results', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class ModernItem { public function name(): string { return ''; } }
        function acceptInt(int $value): void {}
        /** @param array<string, ModernItem> $items */
        function modern(array $items): void {
          $firstKey = array_key_first($items); acceptInt($firstKey);
          $matched = array_find($items, fn(ModernItem $item): bool => true); $matched?->na;
          $matchedKey = array_find_key($items, fn(ModernItem $item, string $key): bool => $key !== ''); acceptInt($matchedKey);
          array_any($items, fn(ModernItem $item, string $key): bool => $key !== '');
          array_all($items, fn(ModernItem $item, string $key): bool => $key !== '');
          $first = array_first($items); $first?->na;
          $last = array_last($items); $last?->na;
        }
      `;
      const uri = 'file:///ModernArrays.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.3'));
      expect(semantic.signature(uri, source.indexOf('array_key_first(') + 'array_key_first('.length)?.returnType).toBe('TKey|null');
      expect(semantic.signatures(uri, source.indexOf('array_find(') + 'array_find('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(semantic.signature(uri, source.indexOf('array_find(') + 'array_find('.length)?.returnType).toBe('TValue|null');
      expect(semantic.signature(uri, source.indexOf('array_find_key(') + 'array_find_key('.length)?.returnType).toBe('TKey|null');
      expect(semantic.signature(uri, source.indexOf('array_any(') + 'array_any('.length)?.returnType).toBe('bool');
      expect(semantic.signature(uri, source.indexOf('array_all(') + 'array_all('.length)?.returnType).toBe('bool');
      expect(semantic.completeMembers(uri, source.indexOf('$matched?->na') + '$matched?->na'.length).map((item) => item.name)).toEqual(['name']);
      expect(semantic.incompatibleArguments(uri).filter((item) => item.callable === 'App\\acceptInt').map((item) => item.actualType)).toEqual(['null|string', 'null|string']);
      expect(semantic.signatures(uri, source.indexOf('array_first(') + 'array_first('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      for (const marker of ['$first?->na', '$last?->na']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name)).toEqual(['name']);
      }
    } finally { parser.dispose(); }
  });
  it('gates iterator conversion signatures and preserves generic iterator values', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class IteratorItem { public function name(): string { return ''; } }
        /** @param \\IteratorAggregate<string, IteratorItem> $items */
        function consume(\\IteratorAggregate $items): void {
          $preserved = iterator_to_array($items); foreach ($preserved as $preservedItem) { $preservedItem->na; }
          $reindexed = iterator_to_array($items, false); foreach ($reindexed as $reindexedItem) { $reindexedItem->na; }
          iterator_count($items); is_iterable($items);
        }
      `;
      const uri = 'file:///IteratorFunctions.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.signature(uri, source.indexOf('iterator_to_array(') + 'iterator_to_array('.length)?.parameters[0]?.nativeType).toBe('Traversable');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(semantic.signature(uri, source.indexOf('iterator_to_array(') + 'iterator_to_array('.length)?.parameters[0]?.nativeType).toBe('Traversable|array');
      expect(semantic.signature(uri, source.indexOf('iterator_count(') + 'iterator_count('.length)?.parameters[0]?.nativeType).toBe('Traversable|array');
      for (const marker of ['$preservedItem->na', '$reindexedItem->na']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name)).toEqual(['name']);
      }
      expect(semantic.definition(uri, source.indexOf('iterator_to_array(') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('indexes the complete SPL function catalog and its PHP 7/8 boundaries', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        class_implements(ArrayIterator::class); class_parents(ArrayIterator::class); class_uses(ArrayIterator::class);
        iterator_apply(new ArrayIterator([]), static fn (): bool => true); iterator_count([]); iterator_to_array([]);
        spl_autoload('Missing'); spl_autoload_call('Missing'); spl_autoload_extensions(); spl_autoload_functions();
        spl_autoload_register(); spl_autoload_unregister('spl_autoload'); spl_classes();
        spl_object_hash(new stdClass()); spl_object_id(new stdClass());
      `;
      const uri = 'file:///SplFunctions.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const signatureOpen = (name: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(`${name}(`) + name.length + 1);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signatureAt('class_implements(ArrayIterator::class)')?.parameters.map((parameter) => parameter.name)).toEqual(['what', 'autoload']);
      expect(signatureAt('spl_autoload_functions()')?.returnType).toBe('list<callable>|false');
      expect(signatureOpen('iterator_apply')?.parameters[1]?.name).toBe('function');
      expect(signatureAt('iterator_count([])')?.parameters[0]?.nativeType).toBe('Traversable');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signatureAt('class_implements(ArrayIterator::class)')?.parameters.map((parameter) => parameter.name)).toEqual(['object_or_class', 'autoload']);
      expect(signatureAt('class_implements(ArrayIterator::class)')?.returnType).toBe('array<class-string, class-string>|false');
      expect(signatureAt('spl_autoload_functions()')?.returnType).toBe('list<callable>');
      expect(signatureAt('spl_classes()')?.returnType).toBe('array<class-string, class-string>');
      expect(signatureOpen('spl_object_hash')?.returnType).toBe('string');
      expect(signatureOpen('spl_object_id')?.returnType).toBe('int');
      expect(signatureOpen('iterator_apply')?.parameters[1]?.name).toBe('callback');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(signatureAt('iterator_count([])')?.parameters[0]?.nativeType).toBe('Traversable|array');
      for (const symbol of ['class_implements', 'class_parents', 'class_uses', 'iterator_apply', 'iterator_count',
        'iterator_to_array', 'spl_autoload', 'spl_autoload_call', 'spl_autoload_extensions', 'spl_autoload_functions',
        'spl_autoload_register', 'spl_autoload_unregister', 'spl_classes', 'spl_object_hash', 'spl_object_id']) {
        expect(semantic.definition(uri, source.indexOf(`${symbol}(`) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes SPL file classes, inherited members, return types, and versioned signatures', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        new SplFileInfo('/tmp/example.csv');
        function inspectFiles(SplFileInfo $info, SplFileObject $file, SplTempFileObject $temp): void {
          $opened = $info->openFile('r');
          $line = $file->fgets();
          $csv = $file->fgetcsv();
          $control = $file->getCsvControl();
          $file->fputcsv(['one', 'two']);
          $file->fwrite('payload');
          $file->fgetss();
          $file->getFilename();
          $opened->rewind();
          $temp->rewind();
        }
      `;
      const uri = 'file:///SplFiles.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const constructor = (): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf('new SplFileInfo(') + 'new SplFileInfo('.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(constructor()?.parameters[0]?.name).toBe('file_name');
      expect(signatureAt("$file->fwrite('payload')")?.parameters[1]?.nativeType).toBeUndefined();
      expect(signatureAt("$file->fwrite('payload')")?.returnType).toBe('int');
      expect(signatureAt('$file->fgetss()')?.returnType).toBe('string|false');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(constructor()?.parameters[0]?.name).toBe('filename');
      expect(signatureAt("$file->fgets()")?.returnType).toBe('string|false');
      expect(signatureAt("$file->fgetcsv()")?.returnType).toBe('list<string|null>|false');
      expect(signatureAt("$file->getCsvControl()")?.returnType).toBe('array{0: string, 1: string, 2: string}');
      expect(signatureAt("$file->getFilename()")?.returnType).toBe('string');
      expect(signatureAt("$file->fputcsv(['one', 'two'])")?.parameters.map((parameter) => parameter.name)).toEqual([
        'fields', 'separator', 'enclosure', 'escape',
      ]);
      expect(signatureAt("$file->fwrite('payload')")?.parameters[1]?.nativeType).toBe('int');
      expect(signatureAt('$file->fgetss()')).toBeUndefined();
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(signatureAt("$file->fputcsv(['one', 'two'])")?.parameters.at(-1)?.name).toBe('eol');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(signatureAt("$file->fwrite('payload')")?.parameters[1]?.nativeType).toBe('?int');
      for (const marker of ['SplFileInfo', 'openFile', 'fgets', 'fgetcsv', 'getCsvControl', 'fputcsv', 'fwrite',
        'getFilename', 'SplTempFileObject', 'rewind']) {
        expect(semantic.definition(uri, source.indexOf(marker) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      expect(semantic.completeMembers(uri, source.indexOf('$file->getFilename') + '$file->'.length)
        .map((item) => item.name)).toContain('getFilename');
      expect(semantic.completeMembers(uri, source.indexOf('$temp->rewind') + '$temp->'.length)
        .map((item) => item.name)).toContain('rewind');
      expect(semantic.completeMembers(uri, source.indexOf('$opened->rewind') + '$opened->'.length)
        .map((item) => item.name)).toContain('rewind');
    } finally { parser.dispose(); }
  });
  it('propagates ArrayObject and ArrayIterator generics and exposes versioned signatures', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class CollectionItem { public function label(): string { return ''; } }
        /**
         * @param \\ArrayObject<string, CollectionItem> $object
         * @param \\ArrayIterator<string, CollectionItem> $iterator
         */
        function inspectCollections(\\ArrayObject $object, \\ArrayIterator $iterator): void {
          $copy = $object->getArrayCopy(); foreach ($copy as $copyItem) { $copyItem->lab; }
          $created = $object->getIterator(); foreach ($created as $createdItem) { $createdItem->lab; }
          $offset = $object->offsetGet('primary'); $offset->lab;
          $current = $iterator->current(); $current->lab;
          $iteratorCopy = $iterator->getArrayCopy(); foreach ($iteratorCopy as $iteratorItem) { $iteratorItem->lab; }
          $object->append(new CollectionItem());
          $object->offsetSet('secondary', new CollectionItem());
          $object->uasort(static fn (CollectionItem $left, CollectionItem $right): int => 0);
          $iterator->uksort(static fn (string $left, string $right): int => 0);
          $object->exchangeArray([]);
          $iterator->seek(0);
          $object->__serialize();
        }
      `;
      const uri = 'file:///SplArrayCollections.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const signatureOpen = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signatureAt('$object->exchangeArray([])')?.parameters[0]?.name).toBe('array');
      expect(signatureAt('$iterator->seek(0)')?.parameters[0]?.name).toBe('position');
      expect(semantic.signatures(uri, source.indexOf('$object->__serialize(') + '$object->__serialize('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(signatureAt('$object->exchangeArray([])')?.parameters[0]?.name).toBe('input');
      expect(signatureAt('$object->__serialize()')?.returnType).toBe('array');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signatureAt('$object->exchangeArray([])')?.parameters[0]?.nativeType).toBe('array|object');
      expect(signatureAt('$iterator->seek(0)')?.parameters[0]).toMatchObject({ name: 'offset', nativeType: 'int' });
      expect(signatureOpen('$object->uasort(')?.returnType).toBe('bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(signatureOpen('$object->uasort(')?.returnType).toBe('true');
      expect(semantic.completeMembers(uri, source.indexOf('$object->getArrayCopy') + '$object->getArrayCopy'.length)[0]?.returnType)
        .toBe('array<string, App\\CollectionItem>');
      expect(signatureAt('$object->getArrayCopy()')?.returnType).toBe('array<string, App\\CollectionItem>');
      expect(signatureAt("$object->offsetGet('primary')")?.returnType).toBe('App\\CollectionItem');
      for (const marker of ['$copyItem->lab', '$createdItem->lab', '$offset->lab', '$current->lab', '$iteratorItem->lab']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name)).toEqual(['label']);
      }
      for (const marker of ['ArrayObject', 'ArrayIterator']) {
        expect(semantic.definition(uri, source.lastIndexOf(marker) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      for (const marker of ['getArrayCopy', 'getIterator', 'offsetGet', 'current', 'append', 'offsetSet', 'uasort',
        'uksort', 'exchangeArray', 'seek', '__serialize']) {
        expect(semantic.definition(uri, source.indexOf(`->${marker}`) + 4), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('propagates SplObjectStorage and SplFixedArray values across their versioned interfaces', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class StorageKey { public function keyLabel(): string { return ''; } }
        class StorageInfo { public function infoLabel(): string { return ''; } }
        class FixedItem { public function fixedLabel(): string { return ''; } }
        /**
         * @param \\SplObjectStorage<StorageKey, StorageInfo> $storage
         * @param \\SplFixedArray<FixedItem> $fixed
         */
        function inspectObjectCollections(\\SplObjectStorage $storage, \\SplFixedArray $fixed): void {
          $current = $storage->current(); $current->keyL;
          $info = $storage->getInfo(); $info?->infoL;
          $offsetInfo = $storage->offsetGet(new StorageKey()); $offsetInfo?->infoL;
          foreach ($storage as $stored) { $stored->keyL; }
          $storage->attach(new StorageKey(), new StorageInfo());
          $storage->offsetSet(new StorageKey(), new StorageInfo());
          $storage->count(); $storage->seek(0);
          $array = $fixed->toArray(); foreach ($array as $arrayItem) { $arrayItem?->fixedL; }
          $fixedValue = $fixed->offsetGet(0); $fixedValue?->fixedL;
          foreach ($fixed as $fixedItem) { $fixedItem?->fixedL; }
          $fixed->current(); $fixed->getIterator(); $fixed->jsonSerialize(); $fixed->__serialize();
          $fixed->setSize(4);
          $created = \\SplFixedArray::fromArray([new FixedItem()], false);
          foreach ($created as $createdItem) { $createdItem?->fixedL; }
        }
      `;
      const uri = 'file:///SplObjectCollections.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const signatureOpen = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signatureOpen('$storage->attach(')?.parameters.map((item) => item.name)).toEqual(['object', 'inf']);
      expect(signatureAt('$fixed->current()')?.returnType).toBe('App\\FixedItem|null');
      expect(signatureOpen('\\SplFixedArray::fromArray(')?.parameters.map((item) => item.name)).toEqual(['data', 'save_indexes']);
      expect(semantic.signatures(uri, source.indexOf('$fixed->getIterator(') + '$fixed->getIterator('.length)).toEqual([]);
      expect(semantic.signatures(uri, source.indexOf('$storage->seek(') + '$storage->seek('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(signatureOpen('$storage->attach(')?.parameters.at(-1)?.name).toBe('data');
      expect(signatureOpen('\\SplFixedArray::fromArray(')?.parameters[0]?.name).toBe('array');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signatureOpen('$storage->attach(')?.parameters.map((item) => item.name)).toEqual(['object', 'info']);
      expect(signatureAt('$storage->count()')?.parameters[0]).toMatchObject({ name: 'mode', nativeType: 'int' });
      expect(semantic.signatures(uri, source.indexOf('$fixed->current(') + '$fixed->current('.length)).toEqual([]);
      expect(signatureAt('$fixed->getIterator()')?.returnType).toBe('Iterator<int, App\\FixedItem|null>');
      expect(semantic.signatures(uri, source.indexOf('$fixed->jsonSerialize(') + '$fixed->jsonSerialize('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(signatureAt('$fixed->jsonSerialize()')?.returnType).toBe('array<int, App\\FixedItem|null>');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(signatureAt('$fixed->__serialize()')?.returnType).toBe('array');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(signatureAt('$storage->seek(0)')?.parameters[0]).toMatchObject({ name: 'offset', nativeType: 'int' });
      expect(signatureAt('$fixed->setSize(4)')?.returnType).toBe('true');
      for (const marker of ['$current->keyL', '$info?->infoL', '$offsetInfo?->infoL', '$stored->keyL', '$arrayItem?->fixedL',
        '$fixedValue?->fixedL', '$fixedItem?->fixedL', '$createdItem?->fixedL']) {
        const expected = marker.includes('keyL') ? 'keyLabel' : marker.includes('infoL') ? 'infoLabel' : 'fixedLabel';
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name), marker).toEqual([expected]);
      }
      for (const marker of ['SplObjectStorage', 'SplFixedArray']) {
        expect(semantic.definition(uri, source.lastIndexOf(marker) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      for (const marker of ['current', 'getInfo', 'offsetGet', 'attach', 'offsetSet', 'count', 'seek', 'toArray',
        'getIterator', 'jsonSerialize', '__serialize', 'setSize', 'fromArray']) {
        const operator = marker === 'fromArray' ? '::' : '->';
        expect(semantic.definition(uri, source.indexOf(`${operator}${marker}`, source.indexOf('function inspectObjectCollections'))
          + operator.length + 1), marker)
          .toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('propagates generic values through SplDoublyLinkedList, SplQueue, and SplStack inheritance', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class LinearItem { public function linearLabel(): string { return ''; } }
        /**
         * @param \\SplDoublyLinkedList<LinearItem> $list
         * @param \\SplQueue<LinearItem> $queue
         * @param \\SplStack<LinearItem> $stack
         */
        function inspectLinearCollections(\\SplDoublyLinkedList $list, \\SplQueue $queue, \\SplStack $stack): void {
          $current = $list->current(); $current->linearL;
          $bottom = $list->bottom(); $bottom->linearL;
          $top = $list->top(); $top->linearL;
          $popped = $list->pop(); $popped->linearL;
          $shifted = $list->shift(); $shifted->linearL;
          $offset = $list->offsetGet(0); $offset->linearL;
          foreach ($list as $iterated) { $iterated->linearL; }
          $dequeued = $queue->dequeue(); $dequeued->linearL;
          $queuedCurrent = $queue->current(); $queuedCurrent->linearL;
          $stackTop = $stack->top(); $stackTop->linearL;
          $list->add(0, new LinearItem()); $list->push(new LinearItem()); $list->unshift(new LinearItem());
          $list->offsetSet(null, new LinearItem()); $list->setIteratorMode(\\SplDoublyLinkedList::IT_MODE_FIFO);
          $queue->enqueue(new LinearItem()); $list->__serialize(); $list->__unserialize([]);
        }
      `;
      const uri = 'file:///SplLinearCollections.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const signatureOpen = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signatureOpen('$list->push(')?.returnType).toBe('true');
      expect(signatureOpen('$queue->enqueue(')?.returnType).toBe('true');
      expect(signatureOpen('$list->add(')?.parameters.map((item) => item.name)).toEqual(['index', 'newval']);
      expect(signatureOpen('$list->setIteratorMode(')?.parameters[0]?.name).toBe('flags');
      expect(semantic.signatures(uri, source.indexOf('$list->__serialize(') + '$list->__serialize('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(signatureOpen('$list->setIteratorMode(')?.parameters[0]?.name).toBe('mode');
      expect(signatureAt('$list->__serialize()')?.returnType).toBe('array{0: int, 1: list<App\\LinearItem>, 2: array}');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signatureOpen('$list->push(')?.returnType).toBe('void');
      expect(signatureOpen('$queue->enqueue(')?.returnType).toBe('void');
      expect(signatureOpen('$list->add(')?.parameters).toMatchObject([
        { name: 'index', nativeType: 'int' }, { name: 'value', nativeType: 'mixed' },
      ]);
      expect(signatureOpen('$list->__unserialize(')?.parameters[0]).toMatchObject({ name: 'data', nativeType: 'array' });
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      for (const marker of ['$current->linearL', '$bottom->linearL', '$top->linearL', '$popped->linearL',
        '$shifted->linearL', '$offset->linearL', '$iterated->linearL', '$dequeued->linearL',
        '$queuedCurrent->linearL', '$stackTop->linearL']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name), marker)
          .toEqual(['linearLabel']);
      }
      for (const marker of ['current', 'bottom', 'top', 'pop', 'shift', 'offsetGet', 'dequeue', 'add', 'push',
        'unshift', 'offsetSet', 'setIteratorMode', 'enqueue', '__serialize', '__unserialize']) {
        const methodOffset = source.indexOf(`->${marker}`, source.indexOf('function inspectLinearCollections')) + 3;
        expect(semantic.definition(uri, methodOffset), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      for (const marker of ['SplDoublyLinkedList', 'SplQueue', 'SplStack']) {
        expect(semantic.definition(uri, source.lastIndexOf(marker) + 3), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      expect(semantic.definition(uri, source.indexOf('IT_MODE_FIFO') + 3)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('propagates generic SPL heap values and preserves priority extraction unions', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class HeapItem { public function heapLabel(): string { return ''; } }
        class PriorityItem { public function priorityLabel(): string { return ''; } }
        /**
         * @param \\SplMinHeap<HeapItem> $min
         * @param \\SplMaxHeap<HeapItem> $max
         * @param \\SplPriorityQueue<HeapItem, PriorityItem> $priority
         */
        function inspectHeaps(\\SplMinHeap $min, \\SplMaxHeap $max, \\SplPriorityQueue $priority): void {
          $minimum = $min->extract(); $minimum->heapL;
          $minTop = $min->top(); $minTop->heapL;
          $maximum = $max->current(); $maximum->heapL;
          foreach ($max as $heapItem) { $heapItem->heapL; }
          $min->insert(new HeapItem()); $min->recoverFromCorruption(); $min->isCorrupted();
          $priority->insert(new HeapItem(), new PriorityItem());
          $priority->setExtractFlags(\\SplPriorityQueue::EXTR_BOTH);
          $priority->current(); $priority->top(); $priority->extract(); $priority->__debugInfo(); $priority->__serialize();
        }
      `;
      const uri = 'file:///SplHeaps.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const signatureOpen = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signatureOpen('$min->insert(')?.returnType).toBe('true');
      expect(signatureOpen('$priority->insert(')?.returnType).toBe('true');
      expect(semantic.signatures(uri, source.indexOf('$priority->__debugInfo(') + '$priority->__debugInfo('.length)).toEqual([]);
      expect(semantic.signatures(uri, source.indexOf('$priority->__serialize(') + '$priority->__serialize('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(signatureAt('$priority->__debugInfo()')?.returnType)
        .toBe('array<string, bool|int|list<array{data: App\\HeapItem, priority: App\\PriorityItem}>>');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signatureOpen('$priority->insert(')?.parameters).toMatchObject([
        { name: 'value', type: 'App\\HeapItem', nativeType: 'mixed' },
        { name: 'priority', type: 'App\\PriorityItem', nativeType: 'mixed' },
      ]);
      const priorityResult = 'App\\HeapItem|App\\PriorityItem|array{data: App\\HeapItem, priority: App\\PriorityItem}';
      expect(signatureAt('$priority->current()')?.returnType).toBe(priorityResult);
      expect(signatureAt('$priority->top()')?.returnType).toBe(priorityResult);
      expect(signatureAt('$priority->extract()')?.returnType).toBe(priorityResult);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(semantic.definition(uri, source.indexOf('EXTR_BOTH') + 3)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.signatures(uri, source.indexOf('$priority->__serialize(') + '$priority->__serialize('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(signatureAt('$priority->__serialize()')?.returnType)
        .toBe('array{0: array, 1: array{flags: int, heap_elements: list<array{data: App\\HeapItem, priority: App\\PriorityItem}>}}');
      for (const marker of ['$minimum->heapL', '$minTop->heapL', '$maximum->heapL', '$heapItem->heapL']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name), marker)
          .toEqual(['heapLabel']);
      }
      for (const marker of ['extract', 'top', 'current', 'insert', 'recoverFromCorruption', 'isCorrupted',
        'setExtractFlags', '__debugInfo', '__serialize']) {
        const methodOffset = source.indexOf(`->${marker}`, source.indexOf('function inspectHeaps')) + 3;
        expect(semantic.definition(uri, methodOffset), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      for (const marker of ['SplMinHeap', 'SplMaxHeap', 'SplPriorityQueue']) {
        expect(semantic.definition(uri, source.lastIndexOf(marker) + 3), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  }, 10_000);
  it('provides versioned SplObserver and SplSubject contracts', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        function observe(\\SplSubject $subject, \\SplObserver $observer): void {
          $subject->attach($observer);
          $subject->detach($observer);
          $subject->notify();
          $observer->update($subject);
        }
      `;
      const uri = 'file:///SplObserver.php'; semantic.update(uri, source);
      const signatureOpen = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signatureOpen('$subject->attach(')).toMatchObject({
        returnType: 'void', parameters: [{ name: 'SplObserver', type: 'SplObserver' }],
      });
      expect(signatureOpen('$observer->update(')).toMatchObject({
        returnType: 'void', parameters: [{ name: 'SplSubject', type: 'SplSubject' }],
      });
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(signatureOpen('$subject->detach(')).toMatchObject({
        returnType: 'void', parameters: [{ name: 'observer', type: 'SplObserver' }],
      });
      expect(signatureOpen('$observer->update(')).toMatchObject({
        returnType: 'void', parameters: [{ name: 'subject', type: 'SplSubject' }],
      });
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(signatureOpen('$subject->notify(')?.returnType).toBe('void');
      for (const marker of ['attach', 'detach', 'notify', 'update']) {
        const methodOffset = source.indexOf(`->${marker}`) + 3;
        expect(semantic.definition(uri, methodOffset), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      for (const marker of ['SplSubject', 'SplObserver']) {
        expect(semantic.definition(uri, source.indexOf(marker) + 3), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('propagates generic MultipleIterator entries and versioned failure returns', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class MultiItem { public function multiLabel(): string { return ''; } }
        /**
         * @param \\MultipleIterator<string, MultiItem> $multiple
         * @param \\Iterator<string, MultiItem> $iterator
         */
        function inspectMultiple(\\MultipleIterator $multiple, \\Iterator $iterator): void {
          $multiple->attachIterator($iterator, 'left');
          $multiple->setFlags(\\MultipleIterator::MIT_NEED_ANY | \\MultipleIterator::MIT_KEYS_ASSOC);
          $current = $multiple->current(); $item = $current['left']; if ($item !== null) { $item->multiL; }
          foreach ($multiple as $keys => $values) { $iterated = $values['left']; if ($iterated !== null) { $iterated->multiL; } }
          $multiple->key(); $multiple->containsIterator($iterator); $multiple->countIterators(); $multiple->__debugInfo();
        }
      `;
      const uri = 'file:///MultipleIterator.php'; semantic.update(uri, source);
      const signatureOpen = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signatureAt('$multiple->current()')?.returnType).toBe('array<array-key, App\\MultiItem|null>|false');
      expect(signatureAt('$multiple->key()')?.returnType).toBe('array<array-key, string|null>|false');
      expect(signatureOpen('$multiple->attachIterator(')?.parameters).toMatchObject([
        { name: 'iterator', type: 'Iterator<string, App\\MultiItem>' },
        { name: 'infos', type: 'int|string|null' },
      ]);
      expect(semantic.signatures(uri, source.indexOf('$multiple->__debugInfo(') + '$multiple->__debugInfo('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(signatureAt('$multiple->__debugInfo()')?.returnType)
        .toContain('array{obj: Iterator<string, App\\MultiItem>, inf: int|string|null}');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signatureOpen('$multiple->attachIterator(')?.parameters[1]).toMatchObject({ name: 'info', nativeType: 'string|int|null' });
      expect(signatureAt('$multiple->current()')?.returnType).toBe('array<array-key, App\\MultiItem|null>|false');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(signatureAt('$multiple->current()')?.returnType).toBe('array<array-key, App\\MultiItem|null>');
      for (const marker of ['$item->multiL', '$iterated->multiL']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name), marker)
          .toEqual(['multiLabel']);
      }
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(semantic.definition(uri, source.indexOf('MIT_KEYS_ASSOC') + 3)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      for (const marker of ['attachIterator', 'setFlags', 'current', 'key', 'containsIterator', 'countIterators', '__debugInfo']) {
        const methodOffset = source.indexOf(`->${marker}`, source.indexOf('function inspectMultiple')) + 3;
        expect(semantic.definition(uri, methodOffset), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      expect(semantic.definition(uri, source.indexOf('MultipleIterator') + 3)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('propagates generic SPL iterator adapters through inheritance, recursion, and nested iterators', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class AdapterItem { public function adapterLabel(): string { return ''; } }
        /**
         * @param \\Iterator<string, AdapterItem> $inner
         * @param \\IteratorIterator<string, AdapterItem> $wrapped
         * @param \\LimitIterator<string, AdapterItem> $limited
         * @param \\CallbackFilterIterator<string, AdapterItem> $filtered
         * @param \\AppendIterator<string, AdapterItem> $appended
         * @param \\ParentIterator<string, AdapterItem> $parents
         * @param \\RecursiveCallbackFilterIterator<string, AdapterItem> $recursive
         */
        function inspectAdapters(\\Iterator $inner, \\IteratorIterator $wrapped, \\LimitIterator $limited,
          \\CallbackFilterIterator $filtered, \\AppendIterator $appended, \\ParentIterator $parents,
          \\RecursiveCallbackFilterIterator $recursive, \\EmptyIterator $empty): void {
          new \\IteratorIterator($inner, class: null);
          new \\LimitIterator($inner, offset: 1, limit: 2);
          new \\CallbackFilterIterator($inner, callback: static fn ($value, $key, $iterator): bool => true);
          $wrappedItem = $wrapped->current(); $wrappedItem->adapterL;
          foreach ($limited as $limitedItem) { $limitedItem->adapterL; }
          foreach ($filtered as $filteredItem) { $filteredItem->adapterL; }
          $appendedItem = $appended->current(); $appendedItem->adapterL;
          $innerList = $appended->getArrayIterator(); $nested = $innerList->current();
          $nestedItem = $nested->current(); $nestedItem->adapterL;
          $directParentItem = $parents->current(); $directParentItem->adapterL;
          $parentChild = $parents->getChildren(); if ($parentChild !== null) { $parentItem = $parentChild->current(); $parentItem->adapterL; }
          $recursiveChild = $recursive->getChildren(); $recursiveItem = $recursiveChild->current(); $recursiveItem->adapterL;
          $limited->seek(1); $limited->getPosition(); $appended->getIteratorIndex();
          $empty->current(); $empty->valid();
        }
      `;
      const uri = 'file:///IteratorAdapters.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const constructorAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(constructorAt('new \\IteratorIterator(')?.parameters.map((parameter) => parameter.name)).toEqual(['iterator']);
      expect(constructorAt('new \\LimitIterator(')?.parameters.map((parameter) => parameter.name)).toEqual(['iterator', 'offset', 'count']);
      expect(constructorAt('new \\CallbackFilterIterator(')?.parameters[1]).toMatchObject({ name: 'callback' });
      expect(constructorAt('new \\CallbackFilterIterator(')?.parameters[1]?.nativeType).toBeUndefined();
      expect(signatureAt('$limited->seek(1)')?.parameters[0]?.name).toBe('position');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(constructorAt('new \\IteratorIterator(')?.parameters.map((parameter) => parameter.name)).toEqual(['iterator', 'class']);
      expect(constructorAt('new \\LimitIterator(')?.parameters.map((parameter) => parameter.name)).toEqual(['iterator', 'offset', 'limit']);
      expect(constructorAt('new \\CallbackFilterIterator(')?.parameters[1]?.nativeType).toBe('callable');
      expect(signatureAt('$limited->seek(1)')?.parameters[0]).toMatchObject({ name: 'offset', nativeType: 'int' });
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(signatureAt('$wrapped->current()')?.returnType).toBe('App\\AdapterItem');
      expect(signatureAt('$appended->getArrayIterator()')?.returnType)
        .toBe('ArrayIterator<int, Iterator<string, App\\AdapterItem>>');
      expect(signatureAt('$innerList->current()')?.returnType).toBe('Iterator<string, App\\AdapterItem>');
      expect(signatureAt('$nested->current()')?.returnType).toBe('App\\AdapterItem');
      expect(signatureAt('$parents->getChildren()')?.returnType).toBe('static|null');
      expect(signatureAt('$parentChild->current()')?.returnType).toBe('App\\AdapterItem');
      expect(signatureAt('$limited->seek(1)')?.returnType).toBe('int');
      expect(signatureAt('$appended->getIteratorIndex()')?.returnType).toBe('int|null');
      expect(signatureAt('$empty->current()')?.returnType).toBe('never');
      expect(signatureAt('$empty->valid()')?.returnType).toBe('false');
      for (const marker of ['$wrappedItem->adapterL', '$limitedItem->adapterL', '$filteredItem->adapterL',
        '$appendedItem->adapterL', '$nestedItem->adapterL', '$directParentItem->adapterL', '$parentItem->adapterL', '$recursiveItem->adapterL']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name), marker)
          .toEqual(['adapterLabel']);
      }
      for (const marker of ['IteratorIterator', 'LimitIterator', 'CallbackFilterIterator', 'AppendIterator',
        'ParentIterator', 'RecursiveCallbackFilterIterator', 'EmptyIterator']) {
        expect(semantic.definition(uri, source.indexOf(marker) + 3), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('propagates advanced SPL iterator generics without hiding regex and tree value transformations', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class AdvancedItem { public function advancedLabel(): string { return ''; } }
        /**
         * @param \\RecursiveIterator<string, AdvancedItem> $inner
         * @param \\RecursiveIteratorIterator<string, AdvancedItem> $recursive
         * @param \\CachingIterator<string, AdvancedItem> $cached
         * @param \\RecursiveCachingIterator<string, AdvancedItem> $recursiveCache
         * @param \\RegexIterator<string, AdvancedItem> $regex
         * @param \\RecursiveRegexIterator<string, AdvancedItem> $recursiveRegex
         * @param \\RecursiveTreeIterator<string, AdvancedItem> $tree
         */
        function inspectAdvanced(\\RecursiveIterator $inner, \\RecursiveIteratorIterator $recursive,
          \\CachingIterator $cached, \\RecursiveCachingIterator $recursiveCache, \\RegexIterator $regex,
          \\RecursiveRegexIterator $recursiveRegex, \\RecursiveTreeIterator $tree): void {
          new \\RecursiveIteratorIterator($inner, mode: \\RecursiveIteratorIterator::SELF_FIRST, flags: 0);
          new \\CachingIterator($inner, flags: \\CachingIterator::FULL_CACHE);
          new \\RegexIterator($inner, pattern: '/item/', mode: \\RegexIterator::GET_MATCH, flags: 0, pregFlags: 0);
          new \\RecursiveTreeIterator($inner, flags: \\RecursiveTreeIterator::BYPASS_CURRENT,
            cachingIteratorFlags: \\CachingIterator::CATCH_GET_CHILD, mode: \\RecursiveTreeIterator::SELF_FIRST);
          $recursiveItem = $recursive->current(); $recursiveItem->advancedL;
          $sub = $recursive->getSubIterator(); if ($sub !== null) { $subItem = $sub->current(); $subItem->advancedL; }
          $cachedItem = $cached->current(); $cachedItem->advancedL;
          $cachedLookup = $cached->offsetGet('item'); if ($cachedLookup !== null) { $cachedLookup->advancedL; }
          $cache = $cached->getCache(); $cacheItem = $cache['item']; $cacheItem->advancedL;
          $cacheChild = $recursiveCache->getChildren(); if ($cacheChild !== null) { $childItem = $cacheChild->current(); $childItem->advancedL; }
          $regex->current(); $regex->getRegex(); $regex->setMode(\\RegexIterator::REPLACE);
          $regexChild = $recursiveRegex->getChildren(); $regexChild->current();
          $tree->key(); $tree->current(); $tree->getPrefix(); $tree->setPostfix('!');
        }
      `;
      const uri = 'file:///AdvancedIterators.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const constructorAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(constructorAt('new \\RecursiveIteratorIterator(')?.parameters.map((parameter) => parameter.name))
        .toEqual(['iterator', 'mode', 'flags']);
      expect(constructorAt('new \\RegexIterator(')?.parameters.map((parameter) => parameter.name))
        .toEqual(['iterator', 'regex', 'mode', 'flags', 'preg_flags']);
      expect(signatureAt('$tree->setPostfix(\'!\')')?.parameters).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(constructorAt('new \\RegexIterator(')?.parameters.map((parameter) => parameter.name))
        .toEqual(['iterator', 'pattern', 'mode', 'flags', 'pregFlags']);
      expect(constructorAt('new \\RecursiveTreeIterator(')?.parameters.map((parameter) => parameter.name))
        .toEqual(['iterator', 'flags', 'cachingIteratorFlags', 'mode']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(signatureAt('$recursive->current()')?.returnType).toBe('App\\AdvancedItem');
      expect(signatureAt('$recursive->getSubIterator()')?.returnType).toBe('RecursiveIterator<string, App\\AdvancedItem>|null');
      expect(signatureAt('$cached->offsetGet(\'item\')')?.returnType).toBe('App\\AdvancedItem|null');
      expect(signatureAt('$cached->getCache()')?.returnType).toBe('array<string, App\\AdvancedItem>');
      expect(signatureAt('$recursiveCache->getChildren()')?.returnType)
        .toBe('RecursiveCachingIterator<string, App\\AdvancedItem>|null');
      expect(signatureAt('$regex->current()')?.returnType).toBe('array<int|string, mixed>|App\\AdvancedItem|string');
      expect(signatureAt('$recursiveRegex->getChildren()')?.returnType).toBe('static');
      expect(signatureAt('$regexChild->current()')?.returnType).toBe('array<int|string, mixed>|App\\AdvancedItem|string');
      expect(signatureAt('$tree->key()')?.returnType).toBe('string');
      expect(signatureAt('$tree->current()')?.returnType).toBe('App\\AdvancedItem|string');
      for (const marker of ['$recursiveItem->advancedL', '$subItem->advancedL', '$cachedItem->advancedL',
        '$cachedLookup->advancedL', '$cacheItem->advancedL', '$childItem->advancedL']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name), marker)
          .toEqual(['advancedLabel']);
      }
      for (const marker of ['RecursiveIteratorIterator', 'CachingIterator', 'RecursiveCachingIterator',
        'RegexIterator', 'RecursiveRegexIterator', 'RecursiveTreeIterator']) {
        expect(semantic.definition(uri, source.indexOf(marker) + 3), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(constructorAt('new \\RecursiveTreeIterator(')?.parameters[0]?.nativeType).toBe('RecursiveIterator|IteratorAggregate');
    } finally { parser.dispose(); }
  });
  it('propagates SPL directory iterator identities while preserving mutable current modes', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        /** @param \\DirectoryIterator $directory
         * @param \\FilesystemIterator $filesystem
         * @param \\RecursiveDirectoryIterator $recursive
         * @param \\GlobIterator $glob */
        function inspectDirectories(\\DirectoryIterator $directory, \\FilesystemIterator $filesystem,
          \\RecursiveDirectoryIterator $recursive, \\GlobIterator $glob): void {
          new \\DirectoryIterator('/tmp');
          new \\FilesystemIterator('/tmp', flags: \\FilesystemIterator::SKIP_DOTS);
          new \\RecursiveDirectoryIterator('/tmp', flags: \\FilesystemIterator::FOLLOW_SYMLINKS);
          new \\GlobIterator('/tmp/*.php', flags: \\FilesystemIterator::CURRENT_AS_FILEINFO);
          $entry = $directory->current(); $entry->isD; $directory->seek(0);
          foreach ($directory as $iterated) { $iterated->getPathn; }
          $filesystem->current(); $filesystem->key(); $filesystem->setFlags(0);
          $recursive->current(); $recursive->hasChildren(); $child = $recursive->getChildren(); $child->getSubP;
          $glob->count();
        }
      `;
      const uri = 'file:///DirectoryIterators.php'; semantic.update(uri, source);
      const signatureAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length - 1);
      const constructorAt = (call: string): ReturnType<SemanticWorkspace['signature']> =>
        semantic.signature(uri, source.indexOf(call) + call.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(constructorAt('new \\DirectoryIterator(')?.parameters.map((parameter) => parameter.name)).toEqual(['path']);
      expect(signatureAt('$directory->seek(0)')?.parameters.map((parameter) => parameter.name)).toEqual(['position']);
      expect(signatureAt('$recursive->hasChildren()')?.parameters.map((parameter) => parameter.name)).toEqual(['allow_links']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(constructorAt('new \\FilesystemIterator(')?.parameters.map((parameter) => parameter.name)).toEqual(['directory', 'flags']);
      expect(constructorAt('new \\GlobIterator(')?.parameters.map((parameter) => parameter.name)).toEqual(['pattern', 'flags']);
      expect(signatureAt('$directory->current()')?.returnType).toBe('static');
      expect(signatureAt('$filesystem->current()')?.returnType).toBe('string|SplFileInfo|FilesystemIterator');
      expect(signatureAt('$recursive->current()')?.returnType).toBe('string|SplFileInfo|FilesystemIterator');
      expect(signatureAt('$recursive->getChildren()')?.returnType).toBe('static');
      expect(semantic.completeMembers(uri, source.indexOf('$entry->isD') + '$entry->isD'.length).map((item) => item.name))
        .toEqual(expect.arrayContaining(['isDir', 'isDot']));
      expect(semantic.completeMembers(uri, source.indexOf('$iterated->getPathn') + '$iterated->getPathn'.length).map((item) => item.name))
        .toContain('getPathname');
      expect(semantic.completeMembers(uri, source.indexOf('$child->getSubP') + '$child->getSubP'.length).map((item) => item.name))
        .toEqual(expect.arrayContaining(['getSubPath', 'getSubPathname']));
      for (const marker of ['DirectoryIterator', 'FilesystemIterator', 'RecursiveDirectoryIterator', 'GlobIterator']) {
        expect(semantic.definition(uri, source.indexOf(marker) + 3), marker).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('gates JSON APIs and exposes audited return contracts by PHP target', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        $encoded = json_encode(['ready' => true]);
        $decoded = json_decode($encoded, associative: true);
        $valid = json_validate($encoded);
        $error = json_last_error();
        $message = json_last_error_msg();
        $throw = JSON_THROW_ON_ERROR;
        $enumError = JSON_ERROR_NON_BACKED_ENUM;
      `;
      const uri = 'file:///VersionedJson.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(semantic.signature(uri, source.indexOf('json_encode(') + 'json_encode('.length)?.returnType).toBe('string|false');
      expect(semantic.signatures(uri, source.indexOf('json_validate(') + 'json_validate('.length)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('JSON_THROW_ON_ERROR') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.3'));
      expect(semantic.definition(uri, source.indexOf('JSON_THROW_ON_ERROR') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf('json_decode(') + 'json_decode('.length)).toMatchObject({
        returnType: 'mixed', parameters: [
          expect.objectContaining({ name: 'json', type: 'string' }),
          expect.objectContaining({ name: 'associative', type: '?bool' }),
          expect.objectContaining({ name: 'depth', type: 'int', defaultValue: '512' }),
          expect.objectContaining({ name: 'flags', type: 'int', defaultValue: '0' }),
        ],
      });
      expect(semantic.definition(uri, source.indexOf('JSON_ERROR_NON_BACKED_ENUM') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.definition(uri, source.indexOf('JSON_ERROR_NON_BACKED_ENUM') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(semantic.signature(uri, source.indexOf('json_validate(') + 'json_validate('.length)?.returnType).toBe('bool');
      expect(semantic.definition(uri, source.indexOf('json_last_error_msg(') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('models filesystem failure returns, streams, paths, and PHP 8 nullable lengths', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        /** @param resource $stream */
        function files($stream): void {
          $contents = file_get_contents('/tmp/data');
          file_get_contents('/tmp/data', false, null, 0, null);
          file_put_contents('/tmp/data', $contents, FILE_APPEND | LOCK_EX);
          $opened = fopen('/tmp/data', 'rb');
          $chunk = fread($stream, 1024);
          fwrite($stream, $chunk, null);
          $parts = pathinfo('/tmp/data.txt');
          $directory = dirname('/tmp/data.txt');
          $matches = glob('/tmp/*.txt');
          $resolved = realpath('/tmp/data.txt');
        }
      `;
      const uri = 'file:///VersionedFilesystem.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.signatures(uri, source.indexOf("file_get_contents('/tmp/data')") + 'file_get_contents('.length).map((item) => item.returnType))
        .toEqual(['string|false', 'string|false']);
      expect(semantic.signature(uri, source.indexOf("fopen('/tmp/data'") + 'fopen('.length)?.returnType).toBe('resource|false');
      expect(semantic.signature(uri, source.indexOf("glob('/tmp") + 'glob('.length)?.returnType).toBe('list<string>|false');
      expect(semantic.incompatibleArguments(uri).filter((item) => item.actualType === 'null' && item.expectedType === 'int').map((item) => item.callable).sort())
        .toEqual(['file_get_contents', 'fwrite']);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.incompatibleArguments(uri).filter((item) => item.actualType === 'null'
        && ['file_get_contents', 'fwrite'].includes(item.callable))).toEqual([]);
      expect(semantic.signature(uri, source.indexOf("pathinfo('/tmp") + 'pathinfo('.length)?.returnType).toBe('array|string');
      expect(semantic.signature(uri, source.indexOf("realpath('/tmp") + 'realpath('.length)?.returnType).toBe('string|false');
      expect(semantic.definition(uri, source.indexOf('FILE_APPEND') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf("dirname('/tmp") + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('indexes the remaining Filesystem stream, CSV, INI, lock, seek, and sync contracts', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        /** @param resource $stream */
        function streamCatalog($stream): void {
          feof($stream); fflush($stream); fgetc($stream); fgets($stream);
          fgetcsv($stream); fputcsv($stream, ['a', 'b']);
          file('/tmp/data', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
          flock($stream, LOCK_SH | LOCK_NB, $wouldBlock); fnmatch('*.php', 'index.php');
          fpassthru($stream); fscanf($stream, '%d', $number); fseek($stream, 0, SEEK_SET);
          fstat($stream); ftell($stream); ftruncate($stream, 0);
          fsync($stream); fdatasync($stream);
          parse_ini_file('/tmp/config.ini', scanner_mode: INI_SCANNER_TYPED);
          parse_ini_string('ready=true', scanner_mode: INI_SCANNER_RAW);
          $process = popen('php -v', 'r'); if ($process !== false) pclose($process);
          readfile('/tmp/data'); rewind($stream); set_file_buffer($stream, 0); tmpfile();
        }
      `;
      const uri = 'file:///FilesystemStreams.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.signature(uri, source.indexOf('fgetcsv(') + 'fgetcsv('.length)?.parameters[2]?.name).toBe('delimiter');
      expect(semantic.signature(uri, source.indexOf('readfile(') + 'readfile('.length)?.parameters[1]?.name).toBe('flags');
      expect(semantic.signatures(uri, source.indexOf("fscanf($stream, '%d'") + 'fscanf('.length)).toHaveLength(2);
      expect(semantic.signature(uri, source.indexOf('fsync(') + 'fsync('.length)).toBeUndefined();
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf('fgetcsv(') + 'fgetcsv('.length)?.parameters[2]?.name).toBe('separator');
      expect(semantic.signature(uri, source.indexOf('fputcsv(') + 'fputcsv('.length)?.parameters).toHaveLength(5);
      expect(semantic.signature(uri, source.indexOf('fstat(') + 'fstat('.length)?.returnType).toContain('dev: int');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.signature(uri, source.indexOf('fputcsv(') + 'fputcsv('.length)?.parameters[5]?.name).toBe('eol');
      expect(semantic.signature(uri, source.indexOf('fsync(') + 'fsync('.length)?.returnType).toBe('bool');
      expect(semantic.signature(uri, source.indexOf('fdatasync(') + 'fdatasync('.length)?.returnType).toBe('bool');
      expect(semantic.signature(uri, source.indexOf('file(') + 'file('.length)?.returnType).toBe('list<string>|false');
      expect(semantic.signature(uri, source.indexOf('popen(') + 'popen('.length)?.returnType).toBe('resource|false');
      for (const symbol of ['feof', 'fflush', 'fgetc', 'fgetcsv', 'fgets', 'file', 'flock', 'fnmatch',
        'fpassthru', 'fputcsv', 'fscanf', 'fseek', 'fstat', 'fsync', 'fdatasync', 'ftell', 'ftruncate',
        'parse_ini_file', 'parse_ini_string', 'pclose', 'popen', 'readfile', 'rewind', 'set_file_buffer', 'tmpfile']) {
        const offset = source.indexOf(`${symbol}(`) + 2;
        expect(semantic.definition(uri, offset)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      for (const constant of ['FILE_IGNORE_NEW_LINES', 'FILE_SKIP_EMPTY_LINES', 'LOCK_SH', 'LOCK_NB',
        'SEEK_SET', 'INI_SCANNER_TYPED', 'INI_SCANNER_RAW']) {
        expect(semantic.definition(uri, source.indexOf(constant) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes filesystem metadata shapes, permissions, links, and PHP 7/8 parameter names', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        function metadata(string $path): void {
          $stat = stat($path); $linkStat = lstat($path);
          fileatime($path); filectime($path); filegroup($path); fileinode($path);
          filemtime($path); fileowner($path); fileperms($path); filetype($path);
          is_executable($path); is_link($path); is_uploaded_file($path);
          chown($path, 1000); chgrp($path, 1000); lchown($path, 1000); lchgrp($path, 1000);
          chmod($path, 0644); touch($path); clearstatcache(true, $path);
          disk_total_space($path); disk_free_space($path); diskfreespace($path);
          realpath_cache_get(); realpath_cache_size(); rmdir($path);
          readlink($path); linkinfo($path); symlink($path, $path . '.link'); link($path, $path . '.hard');
          tempnam($path, 'php'); umask(); move_uploaded_file($path, $path . '.moved');
        }
      `;
      const uri = 'file:///FilesystemMetadata.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(semantic.signature(uri, source.indexOf('chmod(') + 'chmod('.length)?.parameters[1]?.name).toBe('mode');
      expect(semantic.signature(uri, source.indexOf('is_uploaded_file(') + 'is_uploaded_file('.length)?.parameters[0]?.name).toBe('path');
      expect(semantic.signature(uri, source.indexOf('stat(') + 'stat('.length)?.returnType).toContain('dev: int');
      expect(semantic.signature(uri, source.indexOf('realpath_cache_get(') + 'realpath_cache_get('.length)?.returnType).toContain('key: float');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf('chmod(') + 'chmod('.length)?.parameters[1]?.name).toBe('permissions');
      expect(semantic.signature(uri, source.indexOf('is_uploaded_file(') + 'is_uploaded_file('.length)?.parameters[0]?.name).toBe('filename');
      expect(semantic.signature(uri, source.indexOf('touch(') + 'touch('.length)?.parameters[1]?.type).toBe('?int');
      expect(semantic.signature(uri, source.indexOf('realpath_cache_get(') + 'realpath_cache_get('.length)?.returnType).toContain('key: int');
      expect(semantic.signature(uri, source.indexOf('disk_free_space(') + 'disk_free_space('.length)?.returnType).toBe('float|false');
      for (const symbol of ['chgrp', 'chmod', 'chown', 'clearstatcache', 'disk_free_space', 'disk_total_space',
        'diskfreespace', 'fileatime', 'filectime', 'filegroup', 'fileinode', 'filemtime', 'fileowner',
        'fileperms', 'filetype', 'is_executable', 'is_link', 'is_uploaded_file', 'lchgrp', 'lchown',
        'link', 'linkinfo', 'lstat', 'move_uploaded_file', 'readlink', 'realpath_cache_get',
        'realpath_cache_size', 'rmdir', 'stat', 'symlink', 'tempnam', 'touch', 'umask']) {
        const marker = symbol === 'stat' ? '$stat = stat(' : symbol === 'link' ? '; link(' : `${symbol}(`;
        const offset = source.indexOf(marker) + marker.indexOf(`${symbol}(`) + 2;
        expect(semantic.definition(uri, offset)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes Directory functions, result lists, members, and versioned parameter names', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        function directories(): void {
          $directory = dir('.');
          $entries = scandir('.', SCANDIR_SORT_NONE);
          getcwd(); chdir('.'); chroot('/');
          $object = dir('.');
          if ($object !== false) {
            $path = $object->path;
            $entry = $object->read();
            $object->rewind();
            $object->close();
          }
          $handle = opendir('.');
          if ($handle !== false) { readdir($handle); rewinddir($handle); closedir($handle); }
        }
      `;
      const uri = 'file:///Directory.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnType("dir('.')")).toBe('Directory|false');
      expect(returnType("scandir('.', SCANDIR_SORT_NONE)")).toBe('list<string>|false');
      expect(semantic.signature(uri, source.indexOf("opendir('.')") + 'opendir('.length)?.parameters[0]?.name).toBe('path');
      expect(semantic.signature(uri, source.indexOf('scandir(') + 'scandir('.length)?.parameters[0]?.name).toBe('dir');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(semantic.signature(uri, source.indexOf("opendir('.')") + 'opendir('.length)?.parameters[0]?.name).toBe('directory');
      expect(semantic.signature(uri, source.indexOf('scandir(') + 'scandir('.length)?.parameters[0]?.name).toBe('directory');
      expect(returnType('$object->read()')).toBe('string|false');
      for (const symbol of ['dir', 'scandir', 'opendir', 'getcwd', 'chdir', 'chroot', 'readdir', 'rewinddir', 'closedir']) {
        expect(semantic.definition(uri, source.indexOf(`${symbol}(`) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
      expect(semantic.definition(uri, source.indexOf('SCANDIR_SORT_NONE') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      for (const symbol of ['path', 'read', 'rewind', 'close']) {
        expect(semantic.definition(uri, source.indexOf(`$object->${symbol}`) + '$object->'.length + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes Program Execution outputs, process shapes, and versioned command contracts', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        function processes(): void {
          escapeshellarg('fixture'); escapeshellcmd('echo fixture');
          exec('echo fixture', $output, $resultCode);
          passthru('echo fixture', $passthruCode);
          $process = proc_open(['php', '-v'], [1 => ['pipe', 'w']], $pipes);
          if ($process !== false) {
            $status = proc_get_status($process);
            proc_terminate($process); proc_close($process);
          }
          proc_nice(1);
          shell_exec('echo fixture');
          system('echo fixture', $systemCode);
        }
      `;
      const uri = 'file:///ProgramExecution.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(semantic.signature(uri, source.indexOf('proc_open(') + 'proc_open('.length)?.parameters[0]?.type).toBe('string');
      expect(semantic.signature(uri, source.indexOf('exec(') + 'exec('.length)?.parameters[2]?.name).toBe('return_value');
      expect(returnType("shell_exec('echo fixture')")).toBe('string|false|null');
      expect(returnType('proc_get_status($process)')).not.toContain('cached: bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.signature(uri, source.indexOf('proc_open(') + 'proc_open('.length)?.parameters[0]?.type).toBe('array|string');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(returnType("passthru('echo fixture', $passthruCode)")).toBe('false|null');
      expect(semantic.signature(uri, source.indexOf('exec(') + 'exec('.length)?.parameters[2]?.name).toBe('result_code');
      expect(returnType('proc_get_status($process)')).not.toContain('cached: bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(returnType('proc_get_status($process)')).toContain('cached: bool');
      expect(returnType("exec('echo fixture', $output, $resultCode)")).toBe('string|false');
      expect(returnType("proc_open(['php', '-v'], [1 => ['pipe', 'w']], $pipes)")).toBe('resource|false');
      for (const symbol of ['escapeshellarg', 'escapeshellcmd', 'exec', 'passthru', 'proc_close',
        'proc_get_status', 'proc_nice', 'proc_open', 'proc_terminate', 'shell_exec', 'system']) {
        expect(semantic.definition(uri, source.indexOf(`${symbol}(`) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('models encoding failure returns, URL overloads, and the PHP 8 get_headers parameter', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        $serialized = serialize(['ready' => true]);
        $restored = unserialize($serialized, ['allowed_classes' => false]);
        $encoded = base64_encode($serialized);
        $decoded = base64_decode($encoded, true);
        $parts = parse_url('https://example.com:8443/path');
        $port = parse_url('https://example.com:8443/path', PHP_URL_PORT);
        $query = http_build_query(['page' => 1], encoding_type: PHP_QUERY_RFC3986);
        $headers = get_headers('https://example.com', true);
      `;
      const uri = 'file:///VersionedEncoding.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.signature(uri, source.indexOf('unserialize(') + 'unserialize('.length)?.returnType).toBe('mixed');
      expect(semantic.signature(uri, source.indexOf('base64_decode(') + 'base64_decode('.length)?.returnType).toBe('string|false');
      expect(semantic.signatures(uri, source.indexOf("parse_url('https") + 'parse_url('.length).map((item) => item.returnType))
        .toEqual(['array|false', 'array|string|int|false|null']);
      expect(semantic.signature(uri, source.indexOf('PHP_URL_PORT)') + 'PHP_URL_PORT'.length)?.returnType).toBe('array|string|int|false|null');
      expect(semantic.signature(uri, source.indexOf("get_headers('https") + 'get_headers('.length)?.parameters[1]).toMatchObject({ name: 'format', type: 'int' });
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf("get_headers('https") + 'get_headers('.length)?.parameters[1]).toMatchObject({ name: 'associative', type: 'bool' });
      expect(semantic.signature(uri, source.indexOf('http_build_query(') + 'http_build_query('.length)?.parameters[0]?.type).toBe('array|object');
      expect(semantic.definition(uri, source.indexOf('PHP_URL_PORT') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('PHP_QUERY_RFC3986') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('base64_encode(') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('models PDO statement failures, member flow, constants, and the PHP 8.4 factory', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        function database(\\PDO $pdo): void {
          $statement = $pdo->prepare('SELECT id FROM users WHERE active = :active');
          if ($statement === false) return;
          $statement->bindValue(':active', true, \\PDO::PARAM_BOOL);
          $statement->execute();
          $row = $statement->fetchObject();
          $metadata = $statement->getColumnMeta(0);
          $query = $statement->queryString;
        }
        $connected = \\PDO::connect('sqlite::memory:');
      `;
      const uri = 'file:///VersionedPdo.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.signature(uri, source.indexOf('prepare(') + 'prepare('.length)?.returnType).toBe('PDOStatement|false');
      expect(semantic.signature(uri, source.indexOf('bindValue(') + 'bindValue('.length)?.parameters[0]).toMatchObject({ name: 'paramno' });
      expect(semantic.signature(uri, source.indexOf('fetchObject(') + 'fetchObject('.length)?.returnType).toBe('object|false');
      expect(semantic.signature(uri, source.indexOf('getColumnMeta(') + 'getColumnMeta('.length)?.returnType).toBe('array<string, mixed>|false');
      expect(semantic.signatures(uri, source.indexOf('PDO::connect(') + 'PDO::connect('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf('bindValue(') + 'bindValue('.length)?.parameters[0]).toMatchObject({ name: 'param', type: 'string|int' });
      expect(semantic.definition(uri, source.indexOf('PDO::PARAM_BOOL') + 'PDO::'.length + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('queryString') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(semantic.signature(uri, source.indexOf('PDO::connect(') + 'PDO::connect('.length)).toMatchObject({ returnType: 'static' });
      expect(semantic.definition(uri, source.indexOf('PDO::connect') + 'PDO::'.length + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('propagates Reflection class, method, property, parameter, and collection identities', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        final class ReflectedService {
          public string $label = 'ready';
          public function execute(string $payload): string { return $payload; }
        }
        function inspect(): void {
          $class = new \\ReflectionClass(ReflectedService::class);
          $instance = $class->newInstance();
          $instance->execute('created');
          $withoutConstructor = $class->newInstanceWithoutConstructor();
          $withoutConstructor->execute('without');
          $fromArguments = $class->newInstanceArgs(['argument']);
          $fromArguments->execute('arguments');
          $objectClass = new \\ReflectionClass(new ReflectedService());
          $objectInstance = $objectClass->newInstance();
          $objectInstance->execute('object');
          $method = $class->getMethod('execute');
          $method->getDeclaringClass()->getName();
          foreach ($method->getParameters() as $parameter) { $parameter->getType(); }
          $property = $class->getProperty('label');
          $property->getDeclaringClass()->getMethods();
          $constant = $class->getReflectionConstant('VERSION');
          $flags = \\ReflectionMethod::IS_PUBLIC;
          foreach ($class->getMethods() as $candidate) { $candidate->getPrototype(); }
          \\ReflectionMethod::createFromMethodName(ReflectedService::class . '::execute');
          $class->newLazyGhost(static fn (): ReflectedService => new ReflectedService());
          $property->getMangledName();
        }
        function inspectDynamicReflection(string $name): void {
          $dynamicClass = new \\ReflectionClass($name);
          $dynamicInstance = $dynamicClass->newInstance();
          $dynamicInstance->execute('unknown');
        }
        function inspectConstant(\\ReflectionClassConstant $constant): void { $constant->getDeclaringClass(); }
        function inspectEnum(\\ReflectionEnum $enum): void { foreach ($enum->getCases() as $case) { $case->getEnum(); } }
      `;
      const uri = 'file:///VersionedReflection.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(semantic.signature(uri, source.indexOf('new \\ReflectionClass(') + 'new \\ReflectionClass('.length)?.parameters[0]).toMatchObject({ name: 'argument' });
      expect(semantic.completeMembers(uri, source.indexOf("$instance->execute('created") + '$instance->'.length).map((item) => item.name)).toContain('execute');
      expect(semantic.definition(uri, source.indexOf("$instance->execute('created") + '$instance->'.length + 2)).toMatchObject([{ uri }]);
      expect(semantic.completeMembers(uri, source.indexOf("$withoutConstructor->execute('without") + '$withoutConstructor->'.length).map((item) => item.name)).toContain('execute');
      expect(semantic.completeMembers(uri, source.indexOf("$fromArguments->execute('arguments") + '$fromArguments->'.length).map((item) => item.name)).toContain('execute');
      expect(semantic.signature(uri, source.indexOf("getMethod('execute") + 'getMethod('.length)?.returnType).toBe('ReflectionMethod');
      expect(semantic.signature(uri, source.indexOf('getParameters()') + 'getParameters('.length)?.returnType).toBe('list<ReflectionParameter>');
      expect(semantic.signatures(uri, source.indexOf('createFromMethodName(') + 'createFromMethodName('.length)).toEqual([]);
      expect(semantic.signatures(uri, source.indexOf('newLazyGhost(') + 'newLazyGhost('.length)).toEqual([]);
      expect(semantic.signatures(uri, source.indexOf('getMangledName(') + 'getMangledName('.length)).toEqual([]);
      expect(semantic.completeMembers(uri, source.indexOf('$enum->getCases') + '$enum->'.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.signature(uri, source.indexOf('new \\ReflectionClass(') + 'new \\ReflectionClass('.length)?.parameters[0]).toMatchObject({ name: 'objectOrClass', type: 'object|string' });
      expect(semantic.completeMembers(uri, source.indexOf("$objectInstance->execute('object") + '$objectInstance->'.length).map((item) => item.name)).toContain('execute');
      expect(semantic.completeMembers(uri, source.indexOf("$dynamicInstance->execute('unknown") + '$dynamicInstance->'.length)).toEqual([]);
      expect(semantic.signature(uri, source.indexOf('getDeclaringClass()') + 'getDeclaringClass('.length)?.returnType).toBe('ReflectionClass');
      expect(semantic.signature(uri, source.indexOf('getType()') + 'getType('.length)?.returnType).toBe('?ReflectionType');
      expect(semantic.signature(uri, source.indexOf("getReflectionConstant('VERSION") + 'getReflectionConstant('.length)?.returnType).toBe('ReflectionClassConstant|false');
      expect(semantic.completeMembers(uri, source.indexOf('$constant->getDeclaringClass') + '$constant->'.length).map((item) => item.name)).toContain('getDeclaringClass');
      expect(semantic.definition(uri, source.indexOf('ReflectionMethod::') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.signature(uri, source.indexOf('$enum->getCases(') + '$enum->getCases('.length)?.returnType).toBe('list<ReflectionEnumUnitCase>');
      expect(semantic.completeMembers(uri, source.indexOf('$case->getEnum') + '$case->'.length).map((item) => item.name)).toContain('getEnum');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(semantic.signature(uri, source.indexOf('createFromMethodName(') + 'createFromMethodName('.length)).toMatchObject({ returnType: 'static' });
      expect(semantic.signature(uri, source.indexOf('newLazyGhost(') + 'newLazyGhost('.length)).toMatchObject({ returnType: 'object' });
      expect(semantic.definition(uri, source.indexOf('IS_PUBLIC') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(semantic.signature(uri, source.indexOf('getMangledName(') + 'getMangledName('.length)).toMatchObject({ returnType: 'string' });
      expect(semantic.definition(uri, source.indexOf('getMangledName') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      const completions = semantic.completeMembers(uri, source.indexOf('$candidate->getPrototype') + '$candidate->'.length);
      expect(completions.some((item) => item.name === 'getPrototype')).toBe(true);
    } finally { parser.dispose(); }
  });
  it('indexes precise mbstring signatures, return shapes, constants, and version boundaries', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $length = mb_strlen('繁體中文', 'UTF-8');
        $parts = mb_str_split('繁體中文');
        $position = mb_ereg_search_pos('pattern', 'm');
        $encodings = mb_list_encodings();
        $padded = mb_str_pad('php', 8);
        $trimmed = mb_trim(' php ');
        $legacy = mbereg('pattern', 'subject');
        $caseMode = MB_CASE_FOLD;
        $engine = MB_ONIGURUMA_VERSION;
      `;
      const uri = 'file:///VersionedMbstring.php'; semantic.update(uri, source);
      const signature = (needle: string): ReturnType<SemanticWorkspace['signature']> => semantic.signature(uri, source.indexOf(needle) + needle.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signature("mb_strlen('")?.parameters[0]).toMatchObject({ name: 'str', type: undefined });
      expect(semantic.definition(uri, source.indexOf('mbereg') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('mb_str_split') + 2)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('MB_CASE_FOLD') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(signature("mb_str_split('")?.returnType).toBe('list<string>');
      expect(semantic.definition(uri, source.indexOf('MB_CASE_FOLD') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('MB_ONIGURUMA_VERSION') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(signature("mb_strlen('")?.parameters[0]).toMatchObject({ name: 'string', type: 'string' });
      expect(signature("mb_ereg_search_pos('")?.returnType).toBe('array{0: int, 1: int}|false');
      expect(signature('mb_list_encodings(')?.returnType).toBe('list<string>');
      expect(semantic.definition(uri, source.indexOf('mbereg') + 2)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('mb_str_pad') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(signature("mb_str_pad('")?.returnType).toBe('string');
      expect(semantic.definition(uri, source.indexOf('mb_trim') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(signature("mb_trim('")?.returnType).toBe('string');
      for (const symbol of ['mb_strlen', 'mb_str_split', 'mb_ereg_search_pos', 'mb_list_encodings', 'mb_str_pad', 'mb_trim']) {
        expect(semantic.definition(uri, source.indexOf(symbol) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes libxml, SimpleXML, and XML Parser versioned identities', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        class ProjectXml extends \\SimpleXMLElement { public function projectName(): string { return $this->getName(); } }
        function inspectXml(string $source): void {
          $xml = simplexml_load_string($source, ProjectXml::class);
          if ($xml === false) return;
          $xml->getN;
          foreach ($xml as $child) { $child->getN; }
          $errors = libxml_get_errors();
          foreach ($errors as $error) { $error->mes; }
          libxml_set_external_entity_loader(null);
          libxml_get_external_entity_loader();
          $recover = LIBXML_RECOVER;
          $parser = xml_parser_create_ns(null, ':');
          xml_parser_set_option($parser, XML_OPTION_CASE_FOLDING, 0);
          xml_set_element_handler($parser, null, null);
          $values = []; $index = [];
          $parsed = xml_parse_into_struct($parser, $source, $values, $index);
          xml_parser_get_option($parser, XML_OPTION_CASE_FOLDING);
          xml_parser_free($parser);
          $huge = XML_OPTION_PARSE_HUGE;
        }
      `;
      const uri = 'file:///VersionedXmlFoundation.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(semantic.signature(uri, source.indexOf('simplexml_load_string(') + 'simplexml_load_string('.length)?.parameters[3]?.name).toBe('ns');
      expect(semantic.completeMembers(uri, source.indexOf('$xml->getN') + '$xml->getN'.length).map((item) => item.name)).toContain('getName');
      expect(semantic.completeMembers(uri, source.indexOf('$child->getN') + '$child->getN'.length).map((item) => item.name)).toContain('getName');
      expect(semantic.completeMembers(uri, source.indexOf('$error->mes') + '$error->mes'.length).map((item) => item.name)).toEqual(['message']);
      expect(semantic.definition(uri, source.indexOf('libxml_get_external_entity_loader') + 2)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('LIBXML_RECOVER') + 2)).toEqual([]);
      expect(semantic.signature(uri, source.indexOf('xml_parser_create_ns(') + 'xml_parser_create_ns('.length)?.parameters[1]?.name).toBe('sep');
      expect(semantic.signature(uri, source.indexOf('xml_parser_create_ns(') + 'xml_parser_create_ns('.length)?.returnType).toBe('resource|false');
      expect(semantic.definition(uri, source.indexOf('XML_OPTION_PARSE_HUGE') + 2)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('XML_OPTION_CASE_FOLDING') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf('xml_parser_create_ns(') + 'xml_parser_create_ns('.length)?.parameters[1]?.name).toBe('separator');
      expect(semantic.signature(uri, source.indexOf('xml_parser_create_ns(') + 'xml_parser_create_ns('.length)?.returnType).toBe('XMLParser');
      expect(semantic.signature(uri, source.indexOf('xml_parse_into_struct(') + 'xml_parse_into_struct('.length)?.returnType).toBe('int');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(semantic.completeMembers(uri, source.indexOf('$child->getN') + '$child->getN'.length).map((item) => item.name)).toContain('getName');
      expect(semantic.signature(uri, source.indexOf('simplexml_load_string(') + 'simplexml_load_string('.length)?.parameters[3]?.name).toBe('namespace_or_prefix');
      expect(semantic.definition(uri, source.indexOf('libxml_get_external_entity_loader') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.signature(uri, source.indexOf('libxml_get_external_entity_loader(') + 'libxml_get_external_entity_loader('.length)?.returnType).toBe('?callable');
      expect(semantic.signature(uri, source.indexOf('xml_parse_into_struct(') + 'xml_parse_into_struct('.length)?.returnType).toBe('int|false');
      expect(semantic.signature(uri, source.indexOf('xml_set_element_handler(') + 'xml_set_element_handler('.length)?.returnType).toBe('true');
      expect(semantic.signature(uri, source.indexOf('xml_parser_get_option(') + 'xml_parser_get_option('.length)?.returnType).toBe('string|int');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(semantic.signature(uri, source.indexOf('xml_parser_get_option(') + 'xml_parser_get_option('.length)?.returnType).toBe('string|int|bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(semantic.definition(uri, source.indexOf('LIBXML_RECOVER') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('XML_OPTION_PARSE_HUGE') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.signature(uri, source.indexOf('xml_set_element_handler(') + 'xml_set_element_handler('.length)?.parameters[1]?.type).toBe('callable|string|null');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(semantic.signature(uri, source.indexOf('libxml_set_external_entity_loader(') + 'libxml_set_external_entity_loader('.length)?.returnType).toBe('true');
    } finally { parser.dispose(); }
  });
  it('indexes complete XMLReader and XMLWriter procedural and object APIs', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        function transformXml(string $source): string {
          $legacyReader = new XMLReader(); $legacyReader->XML($source);
          $reader = XMLReader::XML($source);
          if ($reader === false) return '';
          $reader->read(); $reader->getAttribute('id'); $reader->localName; $reader->close();
          $modernReader = XMLReader::fromString($source); $modernReader->readOuterXml();
          $writer = xmlwriter_open_memory();
          if ($writer === false) return '';
          xmlwriter_set_indent($writer, true);
          xmlwriter_start_element($writer, 'root'); xmlwriter_write_element($writer, 'item', 'value');
          xmlwriter_end_element($writer); $output = xmlwriter_output_memory($writer);
          $objectWriter = new XMLWriter(); $objectWriter->openMemory(); $objectWriter->writeDtdEntity('name', 'content');
          $modernWriter = XMLWriter::toMemory(); $modernWriter->writeElement('root');
          return $output . XMLReader::ELEMENT;
        }
      `;
      const uri = 'file:///VersionedXmlIo.php'; semantic.update(uri, source);
      const signature = (needle: string): ReturnType<SemanticWorkspace['signature']> => semantic.signature(uri, source.indexOf(needle) + needle.length);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signature('$legacyReader->XML(')?.parameters[2]?.name).toBe('options');
      expect(signature('$legacyReader->XML(')?.returnType).toBe('XMLReader|false');
      expect(signature('xmlwriter_open_memory(')?.returnType).toBe('resource|false');
      expect(signature('xmlwriter_set_indent(')?.parameters[0]?.name).toBe('xmlwriter');
      expect(signature('$objectWriter->writeDtdEntity(')?.parameters).toHaveLength(2);
      expect(semantic.definition(uri, source.indexOf('XMLReader::ELEMENT') + 'XMLReader::'.length + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('fromString') + 2)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('toMemory') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signature('XMLReader::XML(')?.parameters[2]?.name).toBe('flags');
      expect(signature('xmlwriter_open_memory(')?.returnType).toBe('XMLWriter|false');
      expect(signature('xmlwriter_set_indent(')?.parameters[0]?.name).toBe('writer');
      expect(signature('$objectWriter->writeDtdEntity(')?.parameters).toHaveLength(6);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(signature('$objectWriter->writeDtdEntity(')?.returnType).toBe('bool');
      expect(semantic.definition(uri, source.indexOf('localName') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(signature('$reader->close(')?.returnType).toBe('true');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(signature('XMLReader::fromString(')?.returnType).toBe('static');
      expect(signature('XMLWriter::toMemory(')?.returnType).toBe('static');
      expect(semantic.definition(uri, source.indexOf('fromString') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('toMemory') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('$modernReader->readOuterXml') + '$modernReader->'.length + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('$modernWriter->writeElement') + '$modernWriter->'.length + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('indexes classic DOM collections, factories, properties, and versioned members', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        function inspectDom(string $xml, SimpleXMLElement $simple, XMLReader $reader): string {
          $document = new DOMDocument();
          $document->loadXML($xml);
          $root = $document->documentElement;
          if ($root === null) return '';
          $element = $document->createElement('item');
          if ($element === false) return '';
          $element->setAttribute('id', 'one');
          $root->appendChild($element);
          $nodes = $document->getElementsByTagName('item');
          $first = $nodes->item(0);
          $xpath = new DOMXPath($document);
          $matches = $xpath->query('//item');
          $imported = dom_import_simplexml($simple);
          $legacy = $document->createProcessingInstruction('php', 'echo');
          $expanded = $reader->expand();
          if ($expanded !== false) $expanded->getRootNode();
          $element->getAttributeNames();
          $element->className;
          DOMXPath::quote('item');
          return $document->saveXML() ?: '';
        }
        $position = DOMNode::DOCUMENT_POSITION_FOLLOWING;
      `;
      const uri = 'file:///VersionedClassicDom.php'; semantic.update(uri, source);
      const signature = (needle: string): ReturnType<SemanticWorkspace['signature']> => semantic.signature(uri, source.indexOf(needle) + needle.length);
      const definition = (needle: string, offset = 2): ReturnType<SemanticWorkspace['definition']> => semantic.definition(uri, source.indexOf(needle) + offset);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(signature('$document->createProcessingInstruction(')).toMatchObject({ parameters: [{ name: 'target' }, { name: 'data' }] });
      expect(signature('$document->createProcessingInstruction(')?.parameters[1]?.defaultValue).toBeUndefined();
      expect(signature('$document->getElementsByTagName(')?.returnType).toBe('DOMNodeList');
      expect(signature('$nodes->item(')?.returnType).toBe('DOMNode|null');
      expect(definition('documentElement')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(definition('getAttributeNames')).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(signature('$document->createProcessingInstruction(')?.parameters[1]).toMatchObject({ name: 'data', defaultValue: '""' });
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(signature('$document->createProcessingInstruction(')?.parameters[1]).toMatchObject({ name: 'data', type: 'string', defaultValue: '""' });
      expect(definition('documentElement')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(signature('$xpath->query(')?.returnType).toBe('DOMNodeList|false');
      expect(signature('dom_import_simplexml(')?.returnType).toBe('DOMElement');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(signature('dom_import_simplexml(')?.returnType).toBe('DOMAttr|DOMElement');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(definition('getAttributeNames')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(definition('className')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(definition('getRootNode')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(signature('DOMXPath::quote(')?.returnType).toBe('string');
      expect(definition('DOCUMENT_POSITION_FOLLOWING')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(definition('$expanded->getRootNode', '$expanded->'.length + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('indexes the modern Dom namespace and its PHP 8.4–8.5 additions', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        function inspectModernDom(string $html, SimpleXMLElement $simple): string {
          $document = \\Dom\\HTMLDocument::createFromString($html);
          $root = $document->documentElement;
          if ($root === null) return '';
          $root->querySelector('main');
          $matches = $root->querySelectorAll('.item');
          $first = $matches->item(0);
          $classes = $root->classList;
          $classes->add('ready');
          $xpath = new \\Dom\\XPath($document);
          $xpath->evaluate('//main');
          $imported = \\Dom\\import_simplexml($simple);
          $root->getElementsByClassName('item');
          $root->insertAdjacentHTML(\\Dom\\AdjacentPosition::BeforeEnd, '<span></span>');
          $outer = $root->outerHTML;
          return $document->saveHtml();
        }
        $position = \\Dom\\Node::DOCUMENT_POSITION_FOLLOWING;
      `;
      const uri = 'file:///VersionedModernDom.php'; semantic.update(uri, source);
      const signature = (needle: string): ReturnType<SemanticWorkspace['signature']> => semantic.signature(uri, source.indexOf(needle) + needle.length);
      const definition = (needle: string, offset = 2): ReturnType<SemanticWorkspace['definition']> => semantic.definition(uri, source.indexOf(needle) + offset);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(signature('\\Dom\\HTMLDocument::createFromString(')).toBeUndefined();
      expect(definition('AdjacentPosition')).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(signature('\\Dom\\HTMLDocument::createFromString(')?.returnType).toBe('HTMLDocument');
      expect(signature('$root->querySelector(')?.returnType).toBe('?Element');
      expect(signature('$root->querySelectorAll(')?.returnType).toBe('NodeList');
      expect(signature('$matches->item(')?.returnType).toBe('?Node');
      expect(signature('$classes->add(')?.returnType).toBe('void');
      expect(signature('$xpath->evaluate(')?.returnType).toBe('null|bool|float|string|NodeList');
      expect(signature('\\Dom\\import_simplexml(')?.returnType).toBe('Attr|Element');
      expect(definition('DOCUMENT_POSITION_FOLLOWING')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(definition('getElementsByClassName')).toEqual([]);
      expect(definition('insertAdjacentHTML')).toEqual([]);
      expect(definition('outerHTML')).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(signature('$root->getElementsByClassName(')?.returnType).toBe('HTMLCollection');
      expect(signature('$root->insertAdjacentHTML(')?.parameters[0]?.type).toBe('AdjacentPosition');
      expect(definition('getElementsByClassName')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(definition('insertAdjacentHTML')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(definition('outerHTML')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(definition('AdjacentPosition')).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('models versioned password, hash, and random security APIs', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        $passwordHash = password_hash('secret', PASSWORD_DEFAULT);
        $verified = password_verify('secret', $passwordHash);
        $info = password_get_info($passwordHash);
        $algorithms = password_algos();
        $digest = hash('sha256', 'payload', false, []);
        $fileDigest = hash_file('sha256', '/tmp/payload', false, []);
        $equal = hash_equals('known', 'candidate');
        $token = random_bytes(32);
        $number = random_int(1, 10);
        $cost = PASSWORD_BCRYPT_DEFAULT_COST;
      `;
      const uri = 'file:///VersionedSecurity.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(semantic.signature(uri, source.indexOf('password_hash(') + 'password_hash('.length)?.returnType).toBe('string|false');
      expect(semantic.signatures(uri, source.indexOf('password_algos(') + 'password_algos('.length)).toEqual([]);
      expect(semantic.signature(uri, source.indexOf("hash('sha256'") + 'hash('.length)?.returnType).toBe('string|false');
      expect(semantic.signature(uri, source.indexOf("hash('sha256'") + 'hash('.length)?.parameters).toHaveLength(3);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf('password_hash(') + 'password_hash('.length)?.returnType).toBe('string');
      expect(semantic.signature(uri, source.indexOf('password_algos(') + 'password_algos('.length)?.returnType).toBe('list<string>');
      expect(semantic.signature(uri, source.indexOf("hash('sha256'") + 'hash('.length)?.returnType).toBe('string');
      expect(semantic.signature(uri, source.indexOf("hash('sha256'") + 'hash('.length)?.parameters).toHaveLength(3);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.signature(uri, source.indexOf("hash('sha256'") + 'hash('.length)?.parameters).toHaveLength(4);
      expect(semantic.signature(uri, source.indexOf('hash_file(') + 'hash_file('.length)?.returnType).toBe('string|false');
      expect(semantic.signature(uri, source.indexOf('random_bytes(') + 'random_bytes('.length)?.returnType).toBe('string');
      expect(semantic.signature(uri, source.indexOf('random_int(') + 'random_int('.length)?.returnType).toBe('int');
      expect(semantic.definition(uri, source.indexOf('PASSWORD_DEFAULT') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('hash_equals') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('random_bytes') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('selects precise Filter returns and versioned constants', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $id = filter_var('42', FILTER_VALIDATE_INT);
        $email = filter_var('user@example.com', FILTER_VALIDATE_EMAIL);
        $externalId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $dynamic = filter_var('42', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $values = filter_var_array(['id' => '42']);
        $filters = filter_list();
        $canonicalBool = FILTER_VALIDATE_BOOL;
        $globalOnly = FILTER_FLAG_GLOBAL_RANGE;
        $throw = FILTER_THROW_ON_FAILURE;
        function filteredInt(): int|false { return filter_var('42', FILTER_VALIDATE_INT); }
        function invalidFilteredInt(): string { return filter_var('42', FILTER_VALIDATE_INT); }
        function filteredEmail(): string|false { return filter_var('user@example.com', FILTER_VALIDATE_EMAIL); }
        function invalidFilteredEmail(): int { return filter_var('user@example.com', FILTER_VALIDATE_EMAIL); }
        function filteredInput(): int|false|null { return filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT); }
        function invalidFilteredInput(): bool { return filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT); }
      `;
      const uri = 'file:///VersionedFilter.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      const optionFilterCall = "filter_var('42', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])";
      expect(semantic.signature(uri, source.indexOf(optionFilterCall) + optionFilterCall.length - 1)?.returnType).toBe('mixed');
      expect(semantic.incompatibleReturns(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
        ['invalidFilteredInt', 'false|int', 'string'],
        ['invalidFilteredEmail', 'false|string', 'int'],
        ['invalidFilteredInput', 'false|int|null', 'bool'],
      ]);
      expect(semantic.definition(uri, source.indexOf('FILTER_VALIDATE_BOOL') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.definition(uri, source.indexOf('FILTER_VALIDATE_BOOL') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.signature(uri, source.indexOf('filter_var_array(') + 'filter_var_array('.length)?.returnType).toBe('array|false|null');
      expect(semantic.signature(uri, source.indexOf('filter_list(') + 'filter_list('.length)?.returnType).toBe('list<string>');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(semantic.definition(uri, source.indexOf('FILTER_FLAG_GLOBAL_RANGE') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('FILTER_THROW_ON_FAILURE') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(semantic.definition(uri, source.indexOf('FILTER_THROW_ON_FAILURE') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('selects precise PCRE returns and gates the PHP 8 error-message API', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php
        function replacePcreSubject(string $subject): string|null { return preg_replace('/x/', 'y', $subject); }
        /** @param callable(array):string $replace
         * @param array<string, callable(array):string> $callbacks */
        function replaceMatches(callable $replace, array $callbacks): void {
          $callback = preg_replace_callback('/x/', $replace, 'x');
          $callbackArray = preg_replace_callback_array($callbacks, 'x');
        }
        /** @param array<string, string> $values */ function acceptsStringKeys(array $values): void {}
        /** @param array<int, string> $values */ function acceptsIntegerKeys(array $values): void {}
        acceptsStringKeys(preg_filter('/x/', 'y', ['first' => 'x']));
        acceptsIntegerKeys(preg_filter('/x/', 'y', ['first' => 'x']));
        $matched = preg_match('/x/', 'x', $matches);
        $filtered = preg_filter('/x/', 'y', 'x');
        $filteredArray = preg_filter('/x/', 'y', ['first' => 'x']);
        $replaced = preg_replace('/x/', 'y', 'x');
        $replacedArray = preg_replace('/x/', 'y', ['first' => 'x']);
        $grep = preg_grep('/x/', ['first' => 'x']);
        $parts = preg_split('/x/', 'x');
        $error = preg_last_error();
        $message = preg_last_error_msg();
        $flag = PREG_UNMATCHED_AS_NULL;
      `;
      const uri = 'file:///VersionedPcre.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnType("preg_match('/x/', 'x', $matches)")).toBe('int|false');
      expect(returnType("preg_filter('/x/', 'y', 'x')")).toBe('string|null');
      expect(returnType("preg_replace('/x/', 'y', 'x')")).toBe('string|null');
      expect(returnType("preg_replace_callback('/x/', $replace, 'x')")).toBe('string|null');
      expect(returnType("preg_replace_callback_array($callbacks, 'x')")).toBe('string|null');
      expect(returnType("preg_grep('/x/', ['first' => 'x'])")).toBe('array<TKey, TValue>|false');
      expect(returnType("preg_split('/x/', 'x')")).toBe('list<string|array{0: string, 1: int}>|false');
      expect(semantic.signatures(uri, source.indexOf('preg_last_error_msg(') + 'preg_last_error_msg('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(returnType('preg_last_error_msg()')).toBe('string');
      expect(returnType("preg_replace('/x/', 'y', $subject)")).toBe('string|null');
      expect(returnType("preg_filter('/x/', 'y', 'x')")).toBe('string|null');
      expect(returnType("preg_replace('/x/', 'y', 'x')")).toBe('string|null');
      expect(returnType("preg_replace_callback('/x/', $replace, 'x')")).toBe('string|null');
      expect(returnType("preg_replace_callback_array($callbacks, 'x')")).toBe('string|null');
      expect(semantic.definition(uri, source.indexOf('PREG_UNMATCHED_AS_NULL') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(returnType("preg_filter('/x/', 'y', ['first' => 'x'])")).toBe('array<TKey, string>');
      expect(returnType("preg_replace('/x/', 'y', ['first' => 'x'])")).toBe('array<TKey, string>|null');
      expect(semantic.incompatibleArguments(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toContainEqual([
        'acceptsIntegerKeys', 'array<string, string>', 'array<int, string>',
      ]);
    } finally { parser.dispose(); }
  });
  it('selects precise math returns, generic extrema, and versioned rounding symbols', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $absoluteInt = abs(4);
        $absoluteFloat = abs(4.5);
        $maximumArray = max([1, 2]);
        $minimumStrings = min('b', 'a');
        $rounded = round(2.5, 0, RoundingMode::HalfEven);
        $division = fdiv(1.0, 0.0);
        $power = fpow(2.0, 3.0);
        $pi = M_PI;
        $mode = PHP_ROUND_HALF_ODD;
        function invalidAbsolute(): string { return abs(4); }
        function invalidMaximum(): string { return max([1, 2]); }
      `;
      const uri = 'file:///VersionedMath.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(returnType('abs(4)')).toBe('int');
      expect(returnType('abs(4.5)')).toBe('float');
      expect(returnType('max([1, 2])')).toBe('TValue|false');
      expect(returnType("min('b', 'a')")).toBe('TValue');
      expect(semantic.signatures(uri, source.indexOf('fdiv(') + 'fdiv('.length)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('RoundingMode') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(returnType('max([1, 2])')).toBe('TValue');
      expect(returnType('fdiv(1.0, 0.0)')).toBe('float');
      expect(semantic.signatures(uri, source.indexOf('fpow(') + 'fpow('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(returnType('fpow(2.0, 3.0)')).toBe('float');
      expect(returnType('round(2.5, 0, RoundingMode::HalfEven)')).toBe('float');
      expect(semantic.definition(uri, source.indexOf('RoundingMode') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('HalfEven') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('M_PI') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.incompatibleReturns(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
        ['invalidAbsolute', 'int', 'string'], ['invalidMaximum', 'int', 'string'],
      ]);
    } finally { parser.dispose(); }
  });
  it('selects conditional variable-output returns and gates PHP 8 debug/resource APIs', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        /** @param resource $resource */ function inspectResource($resource): int { return get_resource_id($resource); }
        function renderedValue(): string { return print_r(['id' => 1], true); }
        function emittedValue(): true { return print_r(['id' => 1]); }
        function invalidRenderedValue(): int { return print_r(['id' => 1], true); }
        function invalidEmittedValue(): string { return print_r(['id' => 1]); }
        function exportedValue(): string { return var_export(['id' => 1], true); }
        function invalidExportedValue(): string { return var_export(['id' => 1]); }
        $type = gettype(1);
        $debugType = get_debug_type(1);
        $vars = get_defined_vars();
        $float = floatval('1.5');
        $int = intval('10', 10);
        $string = strval(10);
      `;
      const uri = 'file:///VersionedVariableHandling.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.signatures(uri, source.indexOf('get_debug_type(') + 'get_debug_type('.length)).toEqual([]);
      expect(semantic.signatures(uri, source.indexOf('get_resource_id(') + 'get_resource_id('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf('get_debug_type(') + 'get_debug_type('.length)?.returnType).toBe('string');
      expect(semantic.signature(uri, source.indexOf('get_resource_id(') + 'get_resource_id('.length)?.returnType).toBe('int');
      expect(semantic.definition(uri, source.indexOf('get_defined_vars') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.definition(uri, source.indexOf('floatval') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(semantic.incompatibleReturns(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
        ['invalidRenderedValue', 'string', 'int'],
        ['invalidEmittedValue', 'true', 'string'],
        ['invalidExportedValue', 'null', 'string'],
      ]);
    } finally { parser.dispose(); }
  });
  it('propagates runtime introspection collection shapes and PHP 7/8 parameter contracts', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $functions = get_defined_functions();
        $constants = get_defined_constants();
        $categorized = get_defined_constants(true);
        $extensions = get_loaded_extensions();
        $extensionFunctions = get_extension_funcs('Core');
        $exists = function_exists('strlen');
        $loaded = extension_loaded('json');
        $defined = defined('PHP_VERSION');
        $value = constant('PHP_VERSION');
        $created = define('APP_RUNTIME_FLAG', true);
        function invalidFunctions(): int { return get_defined_functions(); }
        function invalidConstants(): int { return get_defined_constants(); }
        function invalidCategorizedConstants(): int { return get_defined_constants(true); }
      `;
      const uri = 'file:///RuntimeIntrospection.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(returnType('get_defined_functions()')).toBe('array{internal: list<string>, user: list<string>}');
      expect(returnType('get_loaded_extensions()')).toBe('list<string>');
      expect(returnType("get_extension_funcs('Core')")).toBe('list<string>|false');
      const functionsCallOffset = source.indexOf('get_defined_functions()') + 'get_defined_functions()'.length - 1;
      expect(semantic.signature(uri, functionsCallOffset)?.parameters[0]).toMatchObject({ name: 'exclude_disabled', defaultValue: 'false' });
      expect(semantic.incompatibleReturns(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
        ['invalidFunctions', 'array{internal: list<string>, user: list<string>}', 'int'],
        ['invalidConstants', 'array<string, mixed>', 'int'],
        ['invalidCategorizedConstants', 'array<string, array<string, mixed>>', 'int'],
      ]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, functionsCallOffset)?.parameters[0]).toMatchObject({ name: 'exclude_disabled', nativeType: 'bool', defaultValue: 'true' });
      const defineOffset = source.indexOf("define('APP_RUNTIME_FLAG'") + 'define('.length;
      expect(semantic.signature(uri, defineOffset)?.parameters[1]).toMatchObject({ name: 'value', nativeType: undefined });
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.signature(uri, defineOffset)?.parameters[1]).toMatchObject({ name: 'value', nativeType: 'mixed' });
      for (const symbol of ['define', 'defined', 'constant', 'function_exists', 'get_defined_constants', 'extension_loaded']) {
        expect(semantic.definition(uri, source.indexOf(`${symbol}(`) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('propagates runtime configuration shapes and gates removed or added APIs', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $configured = get_cfg_var('memory_limit');
        $current = ini_get('memory_limit');
        $previous = ini_set('memory_limit', 1024);
        $all = ini_get_all();
        $flat = ini_get_all(null, false);
        $path = get_include_path();
        $oldPath = set_include_path('/tmp');
        restore_include_path();
        $version = phpversion();
        $sapi = php_sapi_name();
        $system = php_uname();
        $scanned = php_ini_scanned_files();
        $loaded = php_ini_loaded_file();
        $usage = memory_get_usage(true);
        $peak = memory_get_peak_usage();
        memory_reset_peak_usage();
        $bytes = ini_parse_quantity('128M');
        $access = PHP_INI_ALL;
        function invalidDetailedIni(): int { return ini_get_all(); }
        function invalidFlatIni(): int { return ini_get_all(null, false); }
      `;
      const uri = 'file:///RuntimeConfiguration.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.4'));
      expect(semantic.signature(uri, source.indexOf('ini_set(') + 'ini_set('.length)?.parameters[1]?.nativeType).toBeUndefined();
      expect(semantic.signature(uri, source.indexOf('restore_include_path(') + 'restore_include_path('.length)?.returnType).toBe('void');
      expect(semantic.signatures(uri, source.indexOf('memory_reset_peak_usage(') + 'memory_reset_peak_usage('.length)).toEqual([]);
      expect(semantic.incompatibleReturns(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
        ['invalidDetailedIni', 'array<string, array{global_value: null|string, local_value: null|string, access: int}>|false', 'int'],
        ['invalidFlatIni', 'array<string, null|string>|false', 'int'],
      ]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signatures(uri, source.indexOf('restore_include_path(') + 'restore_include_path('.length)).toEqual([]);
      expect(semantic.signature(uri, source.indexOf('ini_set(') + 'ini_set('.length)?.parameters[1]?.nativeType).toBe('string');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.signature(uri, source.indexOf('ini_set(') + 'ini_set('.length)?.parameters[1]?.nativeType).toBe('string|int|float|bool|null');
      expect(semantic.signatures(uri, source.indexOf('memory_reset_peak_usage(') + 'memory_reset_peak_usage('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(semantic.signature(uri, source.indexOf('memory_reset_peak_usage(') + 'memory_reset_peak_usage('.length)?.returnType).toBe('void');
      expect(semantic.signature(uri, source.indexOf('ini_parse_quantity(') + 'ini_parse_quantity('.length)?.returnType).toBe('int');
      for (const symbol of ['get_cfg_var', 'ini_get_all', 'phpversion', 'memory_get_usage', 'PHP_INI_ALL']) {
        expect(semantic.definition(uri, source.indexOf(symbol) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('propagates PHP Options/Info collection shapes, conditional returns, and GC version boundaries', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $environment = getenv();
        $path = getenv('PATH');
        $resources = get_resources();
        $files = get_included_files();
        $options = getopt('a::', ['all::']);
        $usage = getrusage();
        $comparison = version_compare('8.5', '8.4');
        $satisfies = version_compare('8.5', '8.4', '>=');
        $gc = gc_status();
        $assertState = assert_options(ASSERT_ACTIVE);
        $magicQuotes = get_magic_quotes_gpc();
        $info = phpinfo(INFO_GENERAL);
        function invalidEnvironment(): int { return getenv(); }
        function invalidPath(): int { return getenv('PATH'); }
        function invalidComparison(): string { return version_compare('8.5', '8.4'); }
      `;
      const uri = 'file:///RuntimeEnvironment.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnType('getenv()')).toBe('($varname is null ? array<string, string> : string|false)');
      expect(returnType("getenv('PATH')")).toBe('($varname is null ? array<string, string> : string|false)');
      expect(returnType('get_resources()')).toBe('array<int, resource>');
      expect(returnType('get_included_files()')).toBe('list<string>');
      expect(returnType("version_compare('8.5', '8.4')")).toBe('($oper is null ? -1|0|1 : bool|null)');
      expect(returnType("version_compare('8.5', '8.4', '>=')")).toBe('($oper is null ? -1|0|1 : bool|null)');
      expect(returnType('get_magic_quotes_gpc()')).toBe('false');
      expect(semantic.signatures(uri, source.indexOf('gc_status(') + 'gc_status('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(semantic.signatures(uri, source.indexOf('get_magic_quotes_gpc(') + 'get_magic_quotes_gpc('.length)).toEqual([]);
      expect(returnType("version_compare('8.5', '8.4', '>=')")).toBe('($operator is null ? -1|0|1 : bool)');
      expect(returnType('phpinfo(INFO_GENERAL)')).toBe('true');
      expect(returnType('gc_status()')).toBe('array{runs: int, collected: int, threshold: int, roots: int}');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(returnType('gc_status()')).toContain('buffer_size: int');
      expect(returnType('gc_status()')).toContain('application_time: float');
      expect(semantic.incompatibleReturns(uri).map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
        ['invalidEnvironment', 'array<string, string>', 'int'],
        ['invalidPath', 'false|string', 'int'],
        ['invalidComparison', '-1|0|1', 'string'],
      ]);
      for (const symbol of ['assert_options', 'ASSERT_ACTIVE', 'getenv', 'get_resources', 'getopt', 'gc_status', 'phpinfo', 'version_compare', 'INFO_GENERAL']) {
        expect(semantic.definition(uri, source.indexOf(symbol) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes Error Handling shapes, callable contracts, constants, and version gates', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
        $last = error_get_last();
        $previous = set_error_handler(null);
        $exception = set_exception_handler(null);
        $restored = restore_error_handler();
        $triggered = trigger_error('fixture', E_USER_NOTICE);
        $errorHandler = get_error_handler();
        $exceptionHandler = get_exception_handler();
      `;
      const uri = 'file:///ErrorHandling.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnType('debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS)')).toBe('list<array{function: string, line?: int, file?: string, class?: class-string, type?: string, args?: list<mixed>, object?: object}>');
      expect(returnType('error_get_last()')).toBe('array{type: int, message: string, file: string, line: int}|null');
      expect(returnType('set_error_handler(null)')).toBe('callable|null');
      expect(returnType('restore_error_handler()')).toBe('bool');
      expect(returnType("trigger_error('fixture', E_USER_NOTICE)")).toBe('bool');
      expect(semantic.signatures(uri, source.indexOf('get_error_handler(') + 'get_error_handler('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(returnType('restore_error_handler()')).toBe('true');
      expect(returnType("trigger_error('fixture', E_USER_NOTICE)")).toBe('bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(returnType("trigger_error('fixture', E_USER_NOTICE)")).toBe('true');
      expect(semantic.signatures(uri, source.indexOf('get_error_handler(') + 'get_error_handler('.length)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(returnType('get_error_handler()')).toBe('?callable');
      expect(returnType('get_exception_handler()')).toBe('?callable');
      for (const symbol of ['debug_backtrace', 'DEBUG_BACKTRACE_IGNORE_ARGS', 'error_get_last', 'set_error_handler',
        'set_exception_handler', 'restore_error_handler', 'trigger_error', 'E_USER_NOTICE', 'get_error_handler',
        'get_exception_handler']) {
        expect(semantic.definition(uri, source.indexOf(symbol) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes Output Control status shapes, callback metadata, constants, and PHP 8.4 gates', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $status = ob_get_status();
        $statuses = ob_get_status(true);
        $contents = ob_get_contents();
        $handlers = ob_list_handlers();
        ob_start();
        ob_implicit_flush();
        output_add_rewrite_var('token', 'value');
        output_reset_rewrite_vars();
        PHP_OUTPUT_HANDLER_STDFLAGS;
        PHP_OUTPUT_HANDLER_PROCESSED;
      `;
      const uri = 'file:///OutputControl.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnType('ob_get_status()')).toContain('$full_status is true ? list<array{name: string');
      expect(returnType('ob_get_status()')).toContain('array{name?: string, type?: int');
      expect(returnType('ob_get_contents()')).toBe('string|false');
      expect(returnType('ob_list_handlers()')).toBe('list<string>');
      expect(semantic.signature(uri, source.indexOf('ob_implicit_flush(') + 'ob_implicit_flush('.length)?.parameters[0]?.name).toBe('flag');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signature(uri, source.indexOf('ob_implicit_flush(') + 'ob_implicit_flush('.length)?.parameters[0]?.name).toBe('enable');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(semantic.definition(uri, source.indexOf('PHP_OUTPUT_HANDLER_PROCESSED') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      for (const symbol of ['ob_get_status', 'ob_get_contents', 'ob_list_handlers', 'ob_start', 'ob_implicit_flush',
        'output_add_rewrite_var', 'output_reset_rewrite_vars', 'PHP_OUTPUT_HANDLER_STDFLAGS',
        'PHP_OUTPUT_HANDLER_PROCESSED']) {
        expect(semantic.definition(uri, source.indexOf(symbol) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes Function Handling signatures and PHP 7.2–8.2 availability boundaries', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        function invokeFixture(): void {
          call_user_func('strlen', 'value');
          call_user_func_array('strlen', ['value']);
          forward_static_call('Fixture::run');
          forward_static_call_array('Fixture::run', []);
          func_get_arg(0); func_get_args(); func_num_args();
          create_function('$value', 'return $value;');
          register_shutdown_function('strlen');
          register_tick_function('strlen');
          unregister_tick_function('strlen');
        }
      `;
      const uri = 'file:///FunctionHandling.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnType("call_user_func('strlen', 'value')")).toBe('mixed');
      expect(returnType('func_get_args()')).toBe('list<mixed>');
      expect(returnType("register_shutdown_function('strlen')")).toBe('void');
      expect(semantic.definition(uri, source.indexOf('create_function') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.definition(uri, source.indexOf('create_function') + 2)).toEqual([]);
      expect(semantic.signature(uri, source.indexOf('func_get_arg(') + 'func_get_arg('.length)?.parameters[0]?.name).toBe('position');
      expect(returnType("register_shutdown_function('strlen')")).toBe('?bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.2'));
      expect(returnType("register_shutdown_function('strlen')")).toBe('void');
      for (const symbol of ['call_user_func', 'call_user_func_array', 'forward_static_call', 'forward_static_call_array',
        'func_get_arg', 'func_get_args', 'func_num_args', 'register_shutdown_function', 'register_tick_function',
        'unregister_tick_function']) {
        expect(semantic.definition(uri, source.indexOf(symbol) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes Session signatures, status literals, cookie shapes, and handler types', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $params = session_get_cookie_params();
        $status = session_status();
        session_start(['read_and_close' => true]);
        session_set_cookie_params(['lifetime' => 3600, 'samesite' => 'Lax']);
        session_set_save_handler(new SessionHandler());
        PHP_SESSION_ACTIVE;
      `;
      const uri = 'file:///SessionHandling.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnType('session_status()')).toBe('0|1|2');
      expect(returnType('session_get_cookie_params()')).toContain('httponly: bool');
      expect(returnType('session_get_cookie_params()')).not.toContain('samesite');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      expect(returnType('session_status()')).toBe('0|1|2');
      expect(returnType('session_get_cookie_params()')).toContain('partitioned: bool');
      expect(returnType('session_get_cookie_params()')).toContain('samesite: string');
      expect(semantic.signature(uri, source.indexOf('session_start(') + 'session_start('.length)?.returnType).toBe('bool');
      for (const symbol of ['session_get_cookie_params', 'session_status', 'session_start',
        'session_set_cookie_params', 'session_set_save_handler', 'SessionHandler', 'PHP_SESSION_ACTIVE']) {
        expect(semantic.definition(uri, source.indexOf(symbol) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('indexes Network signatures, DNS constants, and PHP 7.3–8.4 availability boundaries', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1);
        $headers = headers_list();
        $lastHeaders = http_get_last_response_headers();
        $body = request_parse_body();
        $hosts = gethostbynamel('example.com');
        $interfaces = net_get_interfaces();
        $currentCode = http_response_code();
        $previousCode = http_response_code(204);
        setcookie('fixture', 'value', ['samesite' => 'Lax']);
        long2ip(2130706433);
        closelog();
        DNS_ANY;
      `;
      const uri = 'file:///Network.php'; semantic.update(uri, source);
      const returnType = (needle: string): string | undefined => semantic.signature(uri, source.indexOf(needle) + needle.length - 1)?.returnType;
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(returnType('headers_list()')).toBe('list<string>');
      expect(returnType("gethostbynamel('example.com')")).toBe('list<string>|false');
      expect(returnType('http_response_code()')).toBe('int|false');
      expect(returnType('http_response_code(204)')).toBe('int|true');
      expect(semantic.definition(uri, source.indexOf('net_get_interfaces') + 2)).toEqual([]);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.3'));
      expect(returnType('net_get_interfaces()')).toContain('unicast: list<array{flags: int, family: int');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.3'));
      expect(semantic.definition(uri, source.indexOf('http_get_last_response_headers') + 2)).toEqual([]);
      expect(returnType('long2ip(2130706433)')).toBe('string|false');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.4'));
      expect(returnType('http_get_last_response_headers()')).toBe('list<string>|null');
      expect(returnType('request_parse_body()')).toBe('array{0: array<string, mixed>, 1: array<string, mixed>}');
      expect(returnType('long2ip(2130706433)')).toBe('string');
      expect(returnType('closelog()')).toBe('true');
      for (const symbol of ['headers_list', 'http_get_last_response_headers', 'request_parse_body',
        'gethostbynamel', 'net_get_interfaces', 'http_response_code', 'setcookie', 'long2ip', 'closelog', 'DNS_ANY']) {
        expect(semantic.definition(uri, source.indexOf(symbol) + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      }
    } finally { parser.dispose(); }
  });
  it('gates class inspection APIs and preserves get_class object identity', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class InspectedItem {}
        class OtherItem {}
        /** @param class-string<InspectedItem> $class */ function acceptItem(string $class): void {}
        /** @param class-string<OtherItem> $class */ function acceptOther(string $class): void {}
        function inspect(InspectedItem $item): void {
          acceptItem(get_class($item)); acceptOther(get_class($item));
          class_exists(InspectedItem::class); interface_exists('Countable'); trait_exists('ExampleTrait');
          enum_exists('ExampleEnum'); method_exists($item, 'run'); property_exists($item, 'name');
          is_a($item, InspectedItem::class); is_subclass_of($item, InspectedItem::class);
          get_class_methods($item); get_class_vars(InspectedItem::class); get_object_vars($item);
        }
      `;
      const uri = 'file:///ClassInspection.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signatures(uri, source.indexOf('enum_exists(') + 'enum_exists('.length)).toEqual([]);
      expect(semantic.signature(uri, source.indexOf('get_class_methods(') + 'get_class_methods('.length)?.returnType).toBe('list<string>');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.1'));
      expect(semantic.signature(uri, source.indexOf('enum_exists(') + 'enum_exists('.length)?.returnType).toBe('bool');
      expect(semantic.signatures(uri, source.indexOf('get_class($item)') + 'get_class($item'.length)[0]?.returnType).toBe('class-string<T>');
      expect(semantic.incompatibleArguments(uri).filter((item) => item.callable.startsWith('App\\accept'))
        .map((item) => [item.callable, item.actualType, item.expectedType])).toEqual([
          ['App\\acceptOther', 'class-string<App\\InspectedItem>', 'class-string<App\\OtherItem>'],
        ]);
      expect(semantic.definition(uri, source.indexOf('get_class($item)') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('gates type predicates and narrows proven positive branches', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        function acceptInt(int $value): void {}
        function predicates(string|int $value, mixed $unknown): void {
          if (is_string($value)) { acceptInt($value); }
          if (is_int($value)) { acceptInt($value); }
          if (is_string($unknown)) { acceptInt($unknown); }
          is_countable($unknown); is_real($unknown);
        }
      `;
      const uri = 'file:///TypePredicates.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.2'));
      expect(semantic.signatures(uri, source.indexOf('is_countable(') + 'is_countable('.length)).toEqual([]);
      expect(semantic.signature(uri, source.indexOf('is_real(') + 'is_real('.length)?.returnType).toBe('bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('7.3'));
      expect(semantic.signature(uri, source.indexOf('is_countable(') + 'is_countable('.length)?.returnType).toBe('bool');
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.0'));
      expect(semantic.signatures(uri, source.indexOf('is_real(') + 'is_real('.length)).toEqual([]);
      expect(semantic.incompatibleArguments(uri).filter((item) => item.callable === 'App\\acceptInt')
        .map((item) => item.actualType)).toEqual(['string', 'string']);
      expect(semantic.definition(uri, source.indexOf('is_string($value)') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
    } finally { parser.dispose(); }
  });
  it('narrows predicate complements only on proven false paths', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        function complements(string|int|bool $value, mixed $unknown): void {
          if (!is_string($value)) { acceptString($value); } else { acceptInt($value); }
          if (is_int($value)) return; acceptInt($value);
          if (is_string($value) || is_int($value)) return; acceptString($value);
          if (!is_string($unknown)) { acceptString($unknown); }
        }
      `;
      const uri = 'file:///PredicateComplements.php';
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['bool|int', 'string'], ['string', 'int'], ['bool|string', 'int'], ['bool', 'string'],
      ]);
    } finally { parser.dispose(); }
  });
  it('combines predicate facts across elseif branches and terminating chains', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        function chain(string|int|bool $value): void {
          if (is_string($value)) { acceptInt($value); }
          elseif (is_int($value)) { acceptString($value); }
          else { acceptInt($value); }
          if (is_string($value)) return; elseif (is_int($value)) return;
          acceptString($value);
        }
      `;
      const uri = 'file:///PredicateElseIf.php';
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['int', 'string'], ['bool', 'int'], ['bool', 'string'],
      ]);
    } finally { parser.dispose(); }
  });
  it('uses object-only is_a facts while preserving allow-string uncertainty', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class IsA { public function onlyA(): void {} } class IsAChild extends IsA { public function onlyChild(): void {} public function sharedChild(): void {} }
        class IsAChildTwo extends IsA { public function sharedChild(): void {} }
        class IsB { public function onlyB(): void {} }
        class IsBox { public IsA|IsB $object; public IsAChild|IsAChildTwo|IsB $subtypes; }
        function takeIsA(IsA $value): void {} function takeIsB(IsB $value): void {}
        /** @param array{subtypes: IsAChild|IsAChildTwo|IsB} $data */
        function inspectIsA(IsA|IsB $direct, mixed $mixed, IsA|string $stringEnabled, IsBox $box, array $data,
          IsAChild|IsB $subtype, IsAChild|IsB $subtypeFalse, IsAChild|IsAChildTwo|IsB $subtypes): void {
          if (is_a($direct, IsA::class)) { takeIsB($direct); $direct->only; }
          else { takeIsA($direct); $direct->only; }
          if (is_a(object_or_class: $mixed, class: IsA::class, allow_string: false)) { takeIsB($mixed); $mixed->only; }
          if (is_a($box->object, IsA::class)) { takeIsB($box->object); $box->object->only; }
          if (is_a($subtype, IsA::class)) { takeIsB($subtype); $subtype->only; }
          if (is_a($subtypeFalse, IsA::class)) return; takeIsA($subtypeFalse); $subtypeFalse->only;
          if (is_a($subtypes, IsA::class)) { $subtypes->sharedChild(); }
          if (is_a($box->subtypes, IsA::class)) { $box->subtypes->sharedChild(); }
          if (is_a($data['subtypes'], IsA::class)) { $data['subtypes']->sharedChild(); }
          if (is_a($stringEnabled, IsA::class, true)) { takeIsA($stringEnabled); }
        }
      `;
      const uri = 'file:///IsAFlow.php'; semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['App\\IsA', 'App\\IsB'], ['App\\IsB', 'App\\IsA'], ['App\\IsA', 'App\\IsB'],
        ['App\\IsA', 'App\\IsB'], ['App\\IsAChild', 'App\\IsB'], ['App\\IsB', 'App\\IsA'],
        ['App\\IsA|string', 'App\\IsA'],
      ]);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyA']);
      expect(semantic.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyB']);
      expect(semantic.completeMembers(uri, completions[2]!).map((item) => item.name)).toEqual(['onlyA']);
      expect(semantic.completeMembers(uri, completions[3]!).map((item) => item.name)).toEqual(['onlyA']);
      expect(semantic.completeMembers(uri, completions[4]!).map((item) => item.name)).toEqual(['onlyA', 'onlyChild']);
      expect(semantic.completeMembers(uri, completions[5]!).map((item) => item.name)).toEqual(['onlyB']);
      const sharedChildren = [...source.matchAll(/->sharedChild/g)].map((item) => item.index + 8);
      expect(sharedChildren).toHaveLength(3);
      for (const sharedChild of sharedChildren) {
        expect(semantic.completeMembers(uri, sharedChild).map((item) => item.name)).toEqual(['sharedChild']);
        expect(semantic.definition(uri, sharedChild + 2)).toHaveLength(2);
      }
    } finally { parser.dispose(); }
  });
  it('uses strict object subclass facts and excludes the target class itself', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class SubclassBase { public function onlyBase(): void {} }
        class SubclassChild extends SubclassBase { public function onlyChild(): void {} public function sharedSubclass(): void {} }
        class SecondSubclassChild extends SubclassBase { public function sharedSubclass(): void {} }
        class SubclassOther { public function onlyOther(): void {} }
        class SubclassBox { public SubclassChild|SubclassOther $object; public SubclassChild|SecondSubclassChild|SubclassOther $children; }
        function takeChild(SubclassChild $value): void {} function takeOther(SubclassOther $value): void {}
        /** @param array{object: SubclassChild|SubclassOther, children: SubclassChild|SecondSubclassChild|SubclassOther} $data */
        function inspectSubclass(SubclassChild|SubclassOther $direct, SubclassBase|SubclassChild $withBase,
          SubclassChild|string $defaultAllowed, SubclassBox $box, array $data,
          SubclassChild|SecondSubclassChild|SubclassOther $children): void {
          if (is_subclass_of($direct, SubclassBase::class, false)) { takeOther($direct); $direct->only; }
          else { takeChild($direct); $direct->only; }
          if (is_subclass_of($withBase, SubclassBase::class, false)) { $withBase->only; }
          else { $withBase->only; }
          if (is_subclass_of($box->object, SubclassBase::class, false)) { takeOther($box->object); $box->object->only; }
          if (is_subclass_of($data['object'], SubclassBase::class, false)) { takeOther($data['object']); $data['object']->only; }
          if (is_subclass_of($defaultAllowed, SubclassBase::class)) { takeChild($defaultAllowed); }
          if (is_subclass_of($children, SubclassBase::class, false)) { $children->sharedSubclass(); }
          if (is_subclass_of($box->children, SubclassBase::class, false)) { $box->children->sharedSubclass(); }
          if (is_subclass_of($data['children'], SubclassBase::class, false)) { $data['children']->sharedSubclass(); }
        }
      `;
      const uri = 'file:///SubclassFlow.php'; semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['App\\SubclassChild', 'App\\SubclassOther'], ['App\\SubclassOther', 'App\\SubclassChild'],
        ['App\\SubclassChild', 'App\\SubclassOther'], ['App\\SubclassChild', 'App\\SubclassOther'],
        ['App\\SubclassChild|string', 'App\\SubclassChild'],
      ]);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyBase', 'onlyChild']);
      expect(semantic.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyOther']);
      expect(semantic.completeMembers(uri, completions[2]!).map((item) => item.name)).toEqual(['onlyBase', 'onlyChild']);
      expect(semantic.completeMembers(uri, completions[3]!).map((item) => item.name)).toEqual(['onlyBase']);
      expect(semantic.completeMembers(uri, completions[4]!).map((item) => item.name)).toEqual(['onlyBase', 'onlyChild']);
      expect(semantic.completeMembers(uri, completions[5]!).map((item) => item.name)).toEqual(['onlyBase', 'onlyChild']);
      const sharedSubclasses = [...source.matchAll(/->sharedSubclass/g)].map((item) => item.index + 8);
      expect(sharedSubclasses).toHaveLength(3);
      for (const sharedSubclass of sharedSubclasses) {
        expect(semantic.completeMembers(uri, sharedSubclass).map((item) => item.name)).toEqual(['sharedSubclass']);
        expect(semantic.definition(uri, sharedSubclass + 2)).toHaveLength(2);
      }
    } finally { parser.dispose(); }
  });
  it('keeps syntax-only is_callable checks out of callable flow', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class InvokableHandler { public function __invoke(): void {} public function onlyInvoke(): void {} }
        class CallableOther { public function otherOnly(): void {} }
        class CallableBox {
          /** @var callable|int */ public mixed $handler;
          /** @var InvokableHandler|CallableOther */ public mixed $objectHandler;
        }
        function takeCallable(callable $value): void {} function takeInt(int $value): void {}
        /** @param array{handler: callable|int, objectHandler: InvokableHandler|CallableOther} $data */
        function inspectCallable(callable|int $direct, callable|int $explicit, callable|int $syntax,
          bool $flag, CallableBox $box, array $data, InvokableHandler|CallableOther $invokable): void {
          if (is_callable($direct)) { takeInt($direct); } else { takeCallable($direct); }
          if (is_callable($explicit, false)) { takeInt($explicit); }
          if (is_callable($box->handler, false)) { takeInt($box->handler); }
          if (is_callable($data['handler'], false)) { takeInt($data['handler']); }
          if (is_callable($invokable)) { $invokable->onlyInvoke(); }
          if (is_callable($box->objectHandler, false)) { $box->objectHandler->onlyInvoke(); }
          if (is_callable($data['objectHandler'], false)) { $data['objectHandler']->onlyInvoke(); }
          if (is_callable($syntax, true)) { takeCallable($syntax); }
          if (is_callable($syntax, $flag)) { takeCallable($syntax); }
        }
      `;
      const uri = 'file:///CallableFlow.php'; semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['callable', 'int'], ['int', 'callable'], ['callable', 'int'], ['callable', 'int'],
        ['callable', 'int'], ['callable|int', 'callable'], ['callable|int', 'callable'],
      ]);
      for (const match of source.matchAll(/->onlyInvoke/g)) {
        const names = semantic.completeMembers(uri, match.index + 8).map((item) => item.name);
        expect(names).toContain('onlyInvoke');
        expect(names).not.toContain('otherOnly');
        expect(semantic.definition(uri, match.index + 4)).toMatchObject([{ uri }]);
      }
    } finally { parser.dispose(); }
  });
  it('uses an explicit adjacent local @var assertion for completion, definition, and diagnostics', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace LocalVarDocLs;
        class Service { public function execute(): void {} }
        class Other {}
        function provide(): mixed {}
        function acceptOther(Other $value): void {}
        function run(): void {
          /** @var Service $service */
          $service = provide();
          $service->exe;
          $service->execute();
          acceptOther($service);
          $service = provide();
          $service->bad;
          /** @var array{service: Service} $data */
          $data = provide();
          $data['service']->exe;
          $data['service']->execute();
          $data['service'] = provide();
          $data['service']->bad;
        }`;
      const uri = 'file:///LocalVarDocLs.php'; semantic.update(uri, source);
      const completion = source.indexOf('$service->exe') + '$service->exe'.length;
      expect(semantic.completeMembers(uri, completion).map((item) => item.name)).toEqual(['execute']);
      const definition = source.indexOf('$service->execute') + '$service->'.length + 2;
      expect(semantic.definition(uri, definition)).toMatchObject([{ uri }]);
      expect(semantic.completeMembers(uri, source.indexOf('$service->bad') + '$service->bad'.length)).toEqual([]);
      const arrayCompletion = source.indexOf("$data['service']->exe") + "$data['service']->exe".length;
      expect(semantic.completeMembers(uri, arrayCompletion).map((item) => item.name)).toEqual(['execute']);
      const arrayDefinition = source.indexOf("$data['service']->execute") + "$data['service']->".length + 2;
      expect(semantic.definition(uri, arrayDefinition)).toMatchObject([{ uri }]);
      expect(semantic.completeMembers(uri, source.indexOf("$data['service']->bad") + "$data['service']->bad".length)).toEqual([]);
      expect(semantic.incompatibleArguments(uri)).toMatchObject([
        { actualType: 'LocalVarDocLs\\Service', expectedType: 'LocalVarDocLs\\Other' },
      ]);
    } finally { parser.dispose(); }
  });
  it('keeps standalone local @var assertions block-scoped and invalidates them on mutation', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace StandaloneVarDocLs;
        class Service { public function execute(): void {} }
        class Other {}
        function provide(): mixed {}
        function mutate(mixed &$value): void {}
        function acceptOther(Other $value): void {}
        function run(): void {
          $value = provide();
          /** @var Service $value */
          $value->exe; $value->execute(); acceptOther($value);
          mutate($value); $value->bad;
          if (true) { /** @var Service $branch */ $branch->execute(); }
          $branch->bad;
        }`;
      const uri = 'file:///StandaloneVarDocLs.php'; semantic.update(uri, source);
      expect(semantic.completeMembers(uri, source.indexOf('$value->exe') + '$value->exe'.length).map((item) => item.name)).toEqual(['execute']);
      expect(semantic.definition(uri, source.indexOf('$value->execute') + '$value->'.length + 2)).toMatchObject([{ uri }]);
      expect(semantic.incompatibleArguments(uri)).toMatchObject([
        { actualType: 'StandaloneVarDocLs\\Service', expectedType: 'StandaloneVarDocLs\\Other' },
      ]);
      for (const marker of ['$value->bad', '$branch->bad']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length)).toEqual([]);
      }
    } finally { parser.dispose(); }
  });
  it('preserves a concrete object alternative for completion after is_object', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class ObjectCandidate { public function onlyObject(): void {} public function shared(): void {} }
        class SecondObjectCandidate { public function shared(): void {} }
        function takeObject(ObjectCandidate $value): void {} function takeString(string $value): void {}
        function inspectObject(ObjectCandidate|string $direct, ObjectCandidate|string $guard,
          ObjectCandidate|SecondObjectCandidate|string $multiple): void {
          if (is_object($direct)) { takeString($direct); $direct->onlyObject(); }
          else { takeObject($direct); }
          if (!is_object($guard)) return; takeString($guard); $guard->onlyObject();
          if (is_object($multiple)) { $multiple->shared(); }
        }
      `;
      const uri = 'file:///ObjectFlow.php'; semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['App\\ObjectCandidate', 'string'], ['string', 'App\\ObjectCandidate'], ['App\\ObjectCandidate', 'string'],
      ]);
      const members = [...source.matchAll(/->onlyObject/g)].map((item) => item.index + 6);
      for (const offset of members) {
        expect(semantic.completeMembers(uri, offset).map((item) => item.name)).toEqual(['onlyObject']);
        expect(semantic.definition(uri, offset - 2).some((item) => source.slice(item.start, item.end) === 'onlyObject')).toBe(true);
      }
      const shared = source.indexOf('->shared') + 5;
      expect(semantic.completeMembers(uri, shared).map((item) => item.name)).toEqual(['shared']);
      const definitions = semantic.definition(uri, shared + 1);
      expect(definitions).toHaveLength(2);
      expect(definitions.every((item) => source.slice(item.start, item.end) === 'shared')).toBe(true);
    } finally { parser.dispose(); }
  });
  it('preserves concrete implementations after is_countable and is_iterable', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class Counted implements \\Countable { public function count(): int { return 1; } public function countedOnly(): void {} }
        class Iterated implements \\IteratorAggregate { public function getIterator(): \\Traversable {} public function iteratedOnly(): void {} }
        class Other { public function otherOnly(): void {} }
        class Uncertain extends MissingParent { public function uncertainOnly(): void {} }
        class Box { public Uncertain|Other $choice; }
        function inspect(Counted|Other $counted, Iterated|Other $iterated): void {
          if (is_countable($counted)) { $counted->countedOnly(); }
          if (is_iterable($iterated)) { $iterated->iteratedOnly(); }
        }
        /** @param array{choice: Uncertain|Other} $data */
        function uncertain(Uncertain|Other $value, Box $box, array $data): void {
          if (is_countable($value)) {} else { $value->otherOnly(); }
          if (is_countable($box->choice)) {} else { $box->choice->otherOnly(); }
          if (is_countable($data['choice'])) {} else { $data['choice']->otherOnly(); }
        }`;
      const uri = 'file:///CompositePredicateFlow.php';
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      for (const member of ['countedOnly', 'iteratedOnly']) {
        const offset = source.indexOf(`->${member}`) + 2;
        const names = semantic.completeMembers(uri, offset + member.length).map((item) => item.name);
        expect(names).toContain(member);
        expect(names).not.toContain('otherOnly');
        expect(semantic.definition(uri, offset + 2)).toMatchObject([{ uri }]);
      }
      for (const match of source.matchAll(/->otherOnly/g)) {
        expect(semantic.completeMembers(uri, match.index + 7)).toEqual([]);
        expect(semantic.definition(uri, match.index + 4)).toEqual([]);
      }
    } finally { parser.dispose(); }
  });
  it('reuses safe constructor PHPDoc refinements for promoted properties', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class PromotedService { public function serviceOnly(): void {} }
        class PromotedConsumer {
          /**
           * @param PromotedService $service
           * @param PromotedService $invalid
           */
          public function __construct(public mixed $service, public int $invalid) {}
        }
        function inspectPromoted(PromotedConsumer $consumer): void {
          $consumer->service->serviceOnly();
          $consumer->invalid->serviceOnly();
        }`;
      const uri = 'file:///PromotedPhpDoc.php'; semantic.update(uri, source);
      const valid = source.indexOf('$consumer->service->serviceOnly') + '$consumer->service->'.length;
      expect(semantic.completeMembers(uri, valid + 7).map((item) => item.name)).toContain('serviceOnly');
      expect(semantic.definition(uri, valid + 2)).toMatchObject([{ uri }]);
      const invalid = source.indexOf('$consumer->invalid->serviceOnly') + '$consumer->invalid->'.length;
      expect(semantic.completeMembers(uri, invalid + 7)).toEqual([]);
      expect(semantic.definition(uri, invalid + 2)).toEqual([]);
    } finally { parser.dispose(); }
  });
  it('narrows direct property paths and drops facts after possible mutation', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class Box { public string|int $value; public mixed $unknown; public function mutate(): void {} }
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        function inspect(Box $box): void {}
        function properties(Box $box): void {
          if (is_string($box->value)) { acceptInt($box->value); acceptString($box->value); }
          else { acceptString($box->value); }
          if (is_string($box->unknown)) { acceptInt($box->unknown); }
          if (!is_string($box->unknown)) { acceptString($box->unknown); }
          if (is_string($box->value)) { $box->mutate(); acceptInt($box->value); }
          if (is_string($box->value)) { inspect($box); acceptString($box->value); }
        }
      `;
      const uri = 'file:///PredicateProperties.php';
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['int', 'string'], ['string', 'int'], ['int|string', 'int'], ['int|string', 'string'],
      ]);
    } finally { parser.dispose(); }
  });
  it('uses non-null and instanceof property facts for diagnostics and completion', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class A { public function onlyA(): void {} } class B { public function onlyB(): void {} }
        class Box { public A|B $object; public ?A $nullable; }
        function acceptA(A $value): void {} function acceptB(B $value): void {}
        function propertyObjects(Box $box): void {
          if ($box->object instanceof A) { acceptB($box->object); $box->object->only; }
          else { acceptA($box->object); $box->object->only; }
          if ($box->nullable !== null) { acceptB($box->nullable); $box->nullable->only; }
        }
      `;
      const uri = 'file:///PropertyObjectFacts.php'; semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['App\\A', 'App\\B'], ['App\\B', 'App\\A'], ['App\\A', 'App\\B'],
      ]);
      const positions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, positions[0]!).map((item) => item.name)).toEqual(['onlyA']);
      expect(semantic.completeMembers(uri, positions[1]!).map((item) => item.name)).toEqual(['onlyB']);
      expect(semantic.completeMembers(uri, positions[2]!).map((item) => item.name)).toEqual(['onlyA']);
    } finally { parser.dispose(); }
  });
  it('uses true isset operands for non-null diagnostics and completion', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class Item { public function onlyItem(): void {} }
        class Box { public ?string $value; public ?Item $item; }
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        function issetFlow(?string $text, Box $box): void {
          if (isset($text, $box->value)) { acceptInt($text); acceptInt($box->value); }
          if (isset($box->item)) { $box->item->only; }
          if (!isset($box->value)) return; acceptInt($box->value);
          if (isset($box->value)) { $box->value = null; acceptString($box->value); }
        }
      `;
      const uri = 'file:///IssetFlow.php'; semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['string', 'int'], ['string', 'int'], ['null|string', 'string'],
      ]);
      expect(semantic.completeMembers(uri, source.indexOf('only;') + 4).map((item) => item.name)).toEqual(['onlyItem']);
    } finally { parser.dispose(); }
  });
  it('uses false empty paths for non-null diagnostics and completion', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class Item { public function onlyItem(): void {} }
        class Box { public ?string $value; public ?Item $item; }
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        /** @param array{label?: string|null, item?: Item|null} $data */
        function emptyFlow(?string $text, Box $box, array $data): void {
          if (!empty($text)) { acceptInt($text); }
          if (empty($box->value)) return; acceptInt($box->value);
          if (!empty($box->item)) { $box->item->only; }
          if (empty($data['label'])) return; acceptInt($data['label']);
          if (!empty($data['item'])) { $data['item']->only; }
        }
        function truePath(?string $text): void { if (empty($text)) { acceptString($text); } }
      `;
      const uri = 'file:///EmptyFlow.php'; semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['string', 'int'], ['string', 'int'], ['null|string', 'string'],
      ]);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
      expect(semantic.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyItem']);
    } finally { parser.dispose(); }
  });
  it('uses direct truthy paths for non-null diagnostics and completion', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class Item { public function onlyItem(): void {} }
        class Box { public ?string $value; public ?Item $item; }
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        /** @param array{label?: string|null, item?: Item|null} $data */
        function truthyFlow(?string $text, Box $box, array $data): void {
          if ($text) { acceptInt($text); }
          if (!$box->value) return; acceptInt($box->value);
          if ($box->item) { $box->item->only; }
          if (!$data['label']) return; acceptInt($data['label']);
          if ($data['item']) { $data['item']->only; }
        }
        function falsy(?string $text): void { if (!$text) { acceptString($text); } }
      `;
      const uri = 'file:///TruthyFlow.php'; semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['string', 'int'], ['string', 'int'], ['null|string', 'string'],
      ]);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
      expect(semantic.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyItem']);
    } finally { parser.dispose(); }
  });
  it('uses loose null-comparison complements for non-null diagnostics', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class Box { public ?string $value; }
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        /** @param array{label?: string|null} $data */
        function looseNullFlow(?string $text, Box $box, array $data): void {
          if ($text != null) { acceptInt($text); }
          if ($box->value == null) return; acceptInt($box->value);
          if ($data['label'] != null) { acceptInt($data['label']); }
        }
        function uncertain(?string $text): void { if ($text == null) { acceptString($text); } }
      `;
      const uri = 'file:///LooseNullFlow.php'; semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['string', 'int'], ['string', 'int'], ['null|string', 'string'],
      ]);
    } finally { parser.dispose(); }
  });
  it('uses literal array-key isset facts for diagnostics and completion', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class Item { public function onlyItem(): void {} }
        class A { public function onlyA(): void {} } class B { public function onlyB(): void {} }
        function acceptInt(int $value): void {} function acceptString(string $value): void {}
        function acceptA(A $value): void {} function acceptB(B $value): void {}
        /** @param array{label?: string|null, item?: Item|null, value: string|int, object: A|B, nullable: A|null} $data */
        function arrayIssetFlow(array $data): void {
          if (isset($data['label'])) { acceptInt($data['label']); }
          if (isset($data['item'])) { $data['item']->only; }
          if (\\is_string($data['value'])) { acceptInt($data['value']); }
          else { acceptString($data['value']); }
          if ($data['object'] instanceof A) { acceptB($data['object']); $data['object']->only; }
          else { acceptA($data['object']); $data['object']->only; }
          if ($data['nullable'] !== null) { acceptB($data['nullable']); $data['nullable']->only; }
          if (isset($data['label'])) { $data['label'] = null; acceptInt($data['label']); }
        }
      `;
      const uri = 'file:///ArrayIssetFlow.php'; semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['string', 'int'], ['int', 'string'],
        ['App\\A', 'App\\B'], ['App\\B', 'App\\A'], ['App\\A', 'App\\B'],
      ]);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
      expect(semantic.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyA']);
      expect(semantic.completeMembers(uri, completions[2]!).map((item) => item.name)).toEqual(['onlyB']);
      expect(semantic.completeMembers(uri, completions[3]!).map((item) => item.name)).toEqual(['onlyA']);
    } finally { parser.dispose(); }
  });
  it('uses nested safe array-path facts for diagnostics and completion', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class NestedItem { public function onlyItem(): void {} }
        class NestedA { public function onlyA(): void {} } class NestedB { public function onlyB(): void {} }
        function nestedInt(int $value): void {} function nestedString(string $value): void {}
        function nestedA(NestedA $value): void {} function nestedB(NestedB $value): void {}
        /** @param array{meta: array{label?: string|null, item?: NestedItem|null, value: string|int, object: NestedA|NestedB}} $data */
        function nestedArrayFlow(array $data): void {
          if (isset($data['meta']['label'])) { nestedInt($data['meta']['label']); }
          if (isset($data['meta']['item'])) { $data['meta']['item']->only; }
          if (\\is_string($data['meta']['value'])) { nestedInt($data['meta']['value']); }
          else { nestedString($data['meta']['value']); }
          if ($data['meta']['object'] instanceof NestedA) { nestedB($data['meta']['object']); $data['meta']['object']->only; }
          else { nestedA($data['meta']['object']); $data['meta']['object']->only; }
        }
      `;
      const uri = 'file:///NestedArrayFlow.php'; semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['string', 'int'], ['int', 'string'],
        ['App\\NestedA', 'App\\NestedB'], ['App\\NestedB', 'App\\NestedA'],
      ]);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
      expect(semantic.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyA']);
      expect(semantic.completeMembers(uri, completions[2]!).map((item) => item.name)).toEqual(['onlyB']);
    } finally { parser.dispose(); }
  });
  it('uses array-key existence without erasing an explicit nullable value', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class PresentItem { public function onlyItem(): void {} }
        function presentString(string $value): void {} function presentInt(int $value): void {}
        /** @param array{label?: string, nullable?: string|null, item?: PresentItem, explicitItem?: PresentItem|null, meta?: array{nested?: PresentItem}} $data */
        function present(array $data): void {
          if (array_key_exists('label', $data)) { presentInt($data['label']); }
          if (key_exists('item', $data)) { $data['item']->only; }
          if (array_key_exists('explicitItem', $data)) { $data['explicitItem']->only; }
          if (array_key_exists('nullable', $data)) { presentString($data['nullable']); }
          if (!array_key_exists('meta', $data)) return;
          if (array_key_exists('nested', $data['meta'])) { $data['meta']['nested']->only; }
        }
      `;
      const uri = 'file:///ArrayKeyExistsFlow.php'; semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['null|string', 'string'],
      ]);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyItem']);
      expect(semantic.completeMembers(uri, completions[1]!)).toEqual([]);
      expect(semantic.completeMembers(uri, completions[2]!).map((item) => item.name)).toEqual(['onlyItem']);
    } finally { parser.dispose(); }
  });
  it('narrows local values and drops the fact after reassignment', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        function locals(string|int $input, mixed $unknown): void {
          $local = $input;
          if (is_string($local)) { acceptInt($local); } else { acceptString($local); }
          $fromMixed = $unknown;
          if (is_string($fromMixed)) { acceptInt($fromMixed); }
          if (is_string($local)) { $local = 1; acceptString($local); }
        }
      `;
      const uri = 'file:///PredicateLocals.php';
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['int', 'string'], ['string', 'int'], ['int', 'string'],
      ]);
    } finally { parser.dispose(); }
  });
  it('uses non-null and instanceof flow facts in argument diagnostics', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php declare(strict_types=1); namespace App;
        class A {} class B {} function acceptA(A $value): void {} function acceptB(B $value): void {}
        function acceptString(string $value): void {} function acceptInt(int $value): void {}
        function flow(?string $text, A|B $object): void {
          if ($text !== null) { acceptString($text); } acceptString($text);
          if ($object instanceof A) { acceptB($object); } else { acceptA($object); }
          if (!($object instanceof B)) { acceptB($object); }
          $local = $text; if ($local !== null) { acceptInt($local); }
        }
      `;
      const uri = 'file:///FlowNarrowing.php'; semantic.update(uri, source);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['null|string', 'string'], ['App\\A', 'App\\B'], ['App\\B', 'App\\A'], ['App\\A', 'App\\B'], ['string', 'int'],
      ]);
    } finally { parser.dispose(); }
  });
  it('surfaces standalone native assert facts, complements, and mutation invalidation', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const types = `<?php namespace App;
        class Base {} class Repository extends Base { public function onlyRepository(): void {} } class Other extends Base {}
        function repository(): mixed {} function maybeRepository(): ?Repository {} function objectValue(): Repository|Other {}
        function falseable(): Repository|false {} function booleanValue(): bool {}
        function scalarValue(): string|int {} function acceptOther(Other $value): void {}
        function acceptInt(int $value): void {} function acceptString(string $value): void {} function acceptFalse(false $value): void {}
        function mutate(mixed &$value): void {}`;
      const source = `<?php declare(strict_types=1); namespace App; function run(): void {
        $repo = repository(); assert($repo instanceof Repository, 'repository expected');
        $repo->only; $repo->onlyRepository(); acceptOther($repo);
        mutate($repo); $repo->only;
        $maybe = maybeRepository(); assert(description: null, assertion: !is_null($maybe));
        $maybe->only; acceptOther($maybe); $maybe = null; $maybe->only;
        $scalar = repository(); assert(is_string($scalar)); acceptInt($scalar);
        $excluded = objectValue(); assert(!($excluded instanceof Other));
        $excluded->only; acceptOther($excluded); $excluded = new Other(); $excluded->only;
        $negative = scalarValue(); assert(!is_string($negative)); acceptString($negative);
        $falseable = falseable(); assert($falseable !== false); $falseable->only; acceptOther($falseable);
        $boolean = booleanValue(); assert(false !== $boolean); acceptFalse($boolean);
        $loose = falseable(); assert($loose != false); $loose->only;
      }`;
      const typesUri = 'file:///NativeAssertTypes.php'; const uri = 'file:///NativeAssertConsumer.php';
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5')); semantic.update(typesUri, types); semantic.update(uri, source);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyRepository']);
      expect(semantic.completeMembers(uri, completions[2]!).map((item) => item.name)).toEqual(['onlyRepository']);
      expect(semantic.completeMembers(uri, completions[4]!).map((item) => item.name)).toEqual(['onlyRepository']);
      expect(semantic.definition(uri, source.indexOf('onlyRepository();') + 2)).toMatchObject([{ uri: typesUri }]);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType]))
        .toEqual([['App\\Repository', 'App\\Other'], ['App\\Repository', 'App\\Other'], ['string', 'int'],
          ['App\\Repository', 'App\\Other'], ['int', 'string'], ['App\\Repository', 'App\\Other'], ['true', 'false']]);
      expect(semantic.completeMembers(uri, completions[1]!)).toEqual([]);
      expect(semantic.completeMembers(uri, completions[3]!)).toEqual([]);
      expect(semantic.completeMembers(uri, completions[5]!)).toEqual([]);
      expect(semantic.completeMembers(uri, completions[6]!).map((item) => item.name)).toEqual(['onlyRepository']);
      expect(semantic.completeMembers(uri, completions[7]!)).toEqual([]);
    } finally { parser.dispose(); }
  });
  it('surfaces strict boolean literal branch and guard facts', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const types = `<?php namespace App;
        class Repository { public function onlyRepository(): void {} } class Other {}
        function falseable(): Repository|false {} function booleanValue(): bool {} function mixedValue(): mixed {}
        /** @return array{item: Repository}|false */ function record(): array|false {}
        function acceptOther(Other $value): void {} function acceptFalse(false $value): void {} function acceptTrue(true $value): void {}`;
      const source = `<?php declare(strict_types=1); namespace App;
        function run(Repository|false $parameter): void {
          if ($parameter !== false) { $parameter->only; acceptOther($parameter); }
          $guard = falseable(); if (false === $guard) { return; } $guard->only; acceptOther($guard);
          $loose = falseable(); if ($loose != false) { $loose->only; }
          $boolean = booleanValue(); if (false !== $boolean) { acceptFalse($boolean); }
          $exact = mixedValue(); if ($exact === false) { acceptTrue($exact); }
          $record = record(); if ($record !== false) { $record['item']->only; $record['item']->onlyRepository(); acceptOther($record['item']); }
          $ternary = record(); $ternary === false ? null : acceptOther($ternary['item']);
          $ternaryMember = record(); $ternaryMember !== false ? $ternaryMember['item']->only : null;
        }`;
      const typesUri = 'file:///BooleanBranchTypes.php'; const uri = 'file:///BooleanBranchConsumer.php';
      semantic.update(typesUri, types); semantic.update(uri, source);
      const completions = [...source.matchAll(/only;/g)].map((item) => item.index + 4);
      expect(semantic.completeMembers(uri, completions[0]!).map((item) => item.name)).toEqual(['onlyRepository']);
      expect(semantic.completeMembers(uri, completions[1]!).map((item) => item.name)).toEqual(['onlyRepository']);
      expect(semantic.completeMembers(uri, completions[2]!)).toEqual([]);
      expect(semantic.completeMembers(uri, completions[3]!).map((item) => item.name)).toEqual(['onlyRepository']);
      const ternaryCompletion = source.indexOf("$ternaryMember['item']->only") + "$ternaryMember['item']->only".length;
      expect(semantic.completeMembers(uri, ternaryCompletion).map((item) => item.name)).toEqual(['onlyRepository']);
      expect(semantic.definition(uri, source.lastIndexOf('onlyRepository();') + 2)).toMatchObject([{ uri: typesUri }]);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType]))
        .toEqual([['App\\Repository', 'App\\Other'], ['App\\Repository', 'App\\Other'], ['true', 'false'], ['false', 'true'],
          ['App\\Repository', 'App\\Other'], ['App\\Repository', 'App\\Other']]);
    } finally { parser.dispose(); }
  });
  it('surfaces precise null-coalescing aliases for completion, definition, and diagnostics', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const types = `<?php namespace App;
        class Repository { public function onlyRepository(): void {} }
        class User { public function email(): string {} }
        function acceptInt(int $value): void {} function acceptRepository(Repository $value): void {}`;
      const source = `<?php declare(strict_types=1); namespace App;
        function unknown() {}
        function run(?User $user, ?string $provided, ?Repository $repo, Repository $certain): void {
          $email = $user?->email() ?? ''; acceptInt($email);
          $chosen = $provided ?? 'fallback'; acceptInt($chosen);
          $effective = $repo ?? new Repository(); $effective->only;
          $definition = $repo ?? new Repository(); $definition->onlyRepository();
          $retainedFalse = $repo ?? false; acceptRepository($retainedFalse);
          $certainChoice = $certain ?? unknown(); $certainChoice->only;
          $unsafe = $repo ?? unknown(); $unsafe->only;
        }`;
      const typesUri = 'file:///CoalescingTypes.php'; const uri = 'file:///CoalescingConsumer.php';
      semantic.update(typesUri, types); semantic.update(uri, source);
      const completions = [...source.matchAll(/->only;/g)].map((item) => item.index + '->only'.length);
      expect(completions.map((offset) => semantic.completeMembers(uri, offset).map((item) => item.name)))
        .toEqual([['onlyRepository'], ['onlyRepository'], []]);
      expect(semantic.definition(uri, source.indexOf('$definition->onlyRepository') + '$definition->'.length + 2))
        .toMatchObject([{ uri: typesUri }]);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType])).toEqual([
        ['string', 'int'], ['string', 'int'], ['bool|App\\Repository', 'App\\Repository'],
      ]);
    } finally { parser.dispose(); }
  });
  it('surfaces complete ternary results while preserving unknown and Elvis expressions', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const types = `<?php namespace App;
        class SharedResult { public function shared(): void {} }
        class LeftResult extends SharedResult { public function onlyLeft(): void {} }
        class RightResult extends SharedResult { public function onlyRight(): void {} }
        function left(): LeftResult {} function right(): RightResult {} function unknown() {}
        function acceptString(string $value): void {}`;
      const source = `<?php declare(strict_types=1); namespace App;
        function run(bool $condition): void {
          $choice = $condition ? left() : right(); $choice->sha;
          $literal = true ? left() : unknown(); $literal->only;
          $definition = false ? unknown() : right(); $definition->onlyRight();
          $unsafe = $condition ? left() : unknown(); $unsafe->shared();
          $elvis = $condition ?: left(); $elvis->shared();
          $scalar = $condition ? 1 : 'value'; acceptString($scalar);
        }`;
      const typesUri = 'file:///TernaryTypes.php'; const uri = 'file:///TernaryConsumer.php';
      semantic.update(typesUri, types); semantic.update(uri, source);
      for (const marker of ['$choice->sha', '$literal->only']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name))
          .toEqual([marker.includes('sha') ? 'shared' : 'onlyLeft']);
      }
      expect(semantic.definition(uri, source.indexOf('$definition->onlyRight') + '$definition->'.length + 2))
        .toMatchObject([{ uri: typesUri }]);
      expect(semantic.definition(uri, source.indexOf('$unsafe->shared') + '$unsafe->'.length + 2)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('$elvis->shared') + '$elvis->'.length + 2)).toEqual([]);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType]))
        .toEqual([['int|string', 'string']]);
    } finally { parser.dispose(); }
  });
  it('surfaces default-complete match results and suppresses incomplete or unknown arms', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const types = `<?php namespace App;
        class SharedResult { public function shared(): void {} }
        class LeftResult extends SharedResult { public function onlyLeft(): void {} }
        class RightResult extends SharedResult { public function onlyRight(): void {} }
        function left(): LeftResult {} function right(): RightResult {} function unknown() {}
        function acceptString(string $value): void {}`;
      const source = `<?php declare(strict_types=1); namespace App;
        function run(int $mode): void {
          $choice = match ($mode) { 1 => left(), default => right() }; $choice->sha;
          $throwDefault = match ($mode) { 1 => left(), default => throw new \\RuntimeException() }; $throwDefault->only;
          $definition = match ($mode) { 1 => left(), default => right() }; $definition->shared();
          $unknown = match ($mode) { 1 => left(), default => unknown() }; $unknown->shared();
          $incomplete = match ($mode) { 1 => left() }; $incomplete->shared();
          $scalar = match ($mode) { 1 => 1, default => 'value' }; acceptString($scalar);
        }`;
      const typesUri = 'file:///MatchTypes.php'; const uri = 'file:///MatchConsumer.php';
      semantic.update(typesUri, types); semantic.update(uri, source);
      const completionMarker = '$choice->sha';
      expect(semantic.completeMembers(uri, source.indexOf(completionMarker) + completionMarker.length).map((item) => item.name))
        .toEqual(['shared']);
      const throwMarker = '$throwDefault->only';
      expect(semantic.completeMembers(uri, source.indexOf(throwMarker) + throwMarker.length).map((item) => item.name))
        .toEqual(['onlyLeft']);
      expect(semantic.definition(uri, source.indexOf('$definition->shared') + '$definition->'.length + 2))
        .toMatchObject([{ uri: typesUri }]);
      expect(semantic.definition(uri, source.indexOf('$unknown->shared') + '$unknown->'.length + 2)).toEqual([]);
      expect(semantic.definition(uri, source.indexOf('$incomplete->shared') + '$incomplete->'.length + 2)).toEqual([]);
      expect(semantic.incompatibleArguments(uri).map((item) => [item.actualType, item.expectedType]))
        .toEqual([['int|string', 'string']]);
    } finally { parser.dispose(); }
  });
  it('propagates generic values returned by destructive array functions', async () => {
    const parser = await PhpSyntaxParser.createDefault(); const semantic = new SemanticWorkspace(parser);
    try {
      const source = `<?php namespace App;
        class StackItem { public function name(): string { return ''; } }
        /** @param array<string, StackItem> $items */
        function consume(array $items): void {
          $popped = array_pop($items); $popped?->na;
          foreach ($items as $retainedValue) { $retainedValue->na; }
          $shifted = array_shift($items); $shifted?->na;
          $removed = array_splice($items, 0, 1); foreach ($removed as $removedValue) { $removedValue->na; }
          foreach ($items as $staleValue) { $staleValue->na; }
        }
        /** @param array<string, StackItem> $items */
        function reorder(array $items): void { sort($items); foreach ($items as $sortedValue) { $sortedValue->na; } }
        /** @param array<string, StackItem> $items */
        function widen(array $items): void { array_push($items, 1); foreach ($items as $widenedValue) { $widenedValue->na; } }
      `;
      const uri = 'file:///GenericStackArrays.php'; semantic.update(uri, source);
      semantic.update(BUILTIN_DOCUMENT_URI, builtinPhpStub('8.5'));
      for (const marker of ['$popped?->na', '$retainedValue->na', '$shifted?->na', '$removedValue->na', '$sortedValue->na']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name)).toEqual(['name']);
      }
      for (const marker of ['$staleValue->na', '$widenedValue->na']) {
        expect(semantic.completeMembers(uri, source.indexOf(marker) + marker.length)).toEqual([]);
      }
    } finally { parser.dispose(); }
  });
});

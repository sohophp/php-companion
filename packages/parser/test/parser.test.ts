import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIncrementalEdit, PhpSyntaxParser } from '../src/index.js';

describe('@php-companion/parser', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it('loads packaged grammar paths and returns declarations', () => {
    const result = parser.parse('<?php namespace App; interface Clock {}');
    expect(result.declarations).toMatchObject([{ name: 'Clock', fqcn: 'App\\Clock', kind: 'interface' }]);
    result.tree.delete();
  });
  it('creates an exact UTF-16 incremental edit across multiple lines', () => {
    const edit = createIncrementalEdit("a😀\nold\n", "a😀\nnew value\n");
    expect(edit).toMatchObject({ startIndex: 4, oldEndIndex: 7, newEndIndex: 13, startPosition: { row: 1, column: 0 }, oldEndPosition: { row: 1, column: 3 }, newEndPosition: { row: 1, column: 9 } });
  });

  it('extracts method/function signatures and promoted parameters', () => {
    const result = parser.parse(`<?php
namespace App;
class User {
  public function __construct(public readonly string $name, private ?int $age = null) {}
  public function label(int|string $id): ?string { return $this->name; }
}
function helper(User $user): string { return $user->label(1); }
`);
    expect(result.callables).toMatchObject([
      { name: '__construct', fqcn: 'App\\User::__construct', kind: 'method', parameters: [{ name: 'name', type: 'string', promoted: true }, { name: 'age', type: '?int', defaultValue: 'null', promoted: true }] },
      { name: 'label', fqcn: 'App\\User::label', kind: 'method', returnType: '?string', parameters: [{ name: 'id', type: 'int|string', promoted: false }] },
      { name: 'helper', fqcn: 'App\\helper', kind: 'function', returnType: 'string', parameters: [{ name: 'user', type: 'User' }] },
    ]);
    result.tree.delete();
  });
  it('distinguishes first-class callable acquisition from invocation', () => {
    const result = parser.parse('<?php $function = strlen(...); $static = Factory::make(...); $invoked = strlen("value"); $result = $function("value");');
    expect(result.calls.map((call) => ({ kind: call.kind, firstClassCallable: call.firstClassCallable, arguments: call.arguments.length }))).toEqual([
      { kind: 'function', firstClassCallable: true, arguments: 0 },
      { kind: 'static-method', firstClassCallable: true, arguments: 0 },
      { kind: 'function', firstClassCallable: false, arguments: 1 },
      { kind: undefined, firstClassCallable: false, arguments: 1 },
    ]);
    result.tree.delete();
  });
  it('distinguishes discarded call results from expressions and PHP 8.5 void casts', () => {
    const source = '<?php function run(): void { result(); $value = result(); (bool) result(); (void) result(); } result();';
    const result = parser.parse(source);
    expect(result.calls.filter((call) => source.slice(call.nameStart, call.nameEnd) === 'result')
      .map((call) => ({ discarded: call.resultDiscarded, voidCast: call.intentionalVoidCast
        ? source.slice(call.intentionalVoidCast.start, call.intentionalVoidCast.end) : undefined }))).toEqual([
      { discarded: true, voidCast: undefined },
      { discarded: false, voidCast: undefined },
      { discarded: false, voidCast: undefined },
      { discarded: false, voidCast: '(void)' },
      { discarded: true, voidCast: undefined },
    ]);
    result.tree.delete();
  });
  it('tracks discarded results and void casts in for initializers and updates', () => {
    const source = '<?php for (result(), (void) consumed(); condition(); result(), (void) consumed()) {}';
    const result = parser.parse(source);
    expect(result.calls.map((call) => ({ name: source.slice(call.nameStart, call.nameEnd), discarded: call.resultDiscarded,
      voidCast: call.intentionalVoidCast ? source.slice(call.intentionalVoidCast.start, call.intentionalVoidCast.end) : undefined }))).toEqual([
      { name: 'result', discarded: true, voidCast: undefined },
      { name: 'consumed', discarded: false, voidCast: '(void)' },
      { name: 'condition', discarded: false, voidCast: undefined },
      { name: 'result', discarded: true, voidCast: undefined },
      { name: 'consumed', discarded: false, voidCast: '(void)' },
    ]);
    result.tree.delete();
  });

  it('assigns declarations to separate bracketed and unbracketed namespaces', () => {
    for (const source of [
      '<?php namespace First; class One {} namespace Second; class Two {}',
      '<?php namespace First { class One {} } namespace Second { class Two {} }',
    ]) {
      const result = parser.parse(source);
      expect(result.declarations.map((item) => item.fqcn)).toEqual(['First\\One', 'Second\\Two']);
      result.tree.delete();
    }
  });

  it('extracts inheritance, traits, visibility and static method facts', () => {
    const result = parser.parse('<?php namespace App; class Child extends Base implements One, Two { use Shared; private static function secret(): void {} protected function inherited(): void {} }');
    expect(result.declarations[0]).toMatchObject({ extendsNames: ['Base'], implementsNames: ['One', 'Two'], traitNames: ['Shared'] });
    expect(result.callables).toMatchObject([
      { name: 'secret', visibility: 'private', static: true },
      { name: 'inherited', visibility: 'protected', static: false },
    ]);
    result.tree.delete();
  });

  it('extracts exact type positions and explicit import alias ranges', () => {
    const source = `<?php
use Vendor\\Base as ParentBase;
use function Vendor\\helper as importedHelper;
#[Marker]
class Child extends ParentBase implements Contract {
  use Shared;
  public function run(Input $input): Output {
    if ($input instanceof SpecialInput) {}
    Child::build();
  }
}`;
    const result = parser.parse(source);
    expect(result.typeReferences.map((reference) => ({ text: source.slice(reference.start, reference.end), context: reference.context }))).toEqual([
      { text: 'Marker', context: 'attribute' },
      { text: 'ParentBase', context: 'inheritance' },
      { text: 'Contract', context: 'inheritance' },
      { text: 'Shared', context: 'trait' },
      { text: 'Input', context: 'native-type' },
      { text: 'Output', context: 'native-type' },
      { text: 'SpecialInput', context: 'instanceof' },
      { text: 'Child', context: 'static-receiver' },
    ]);
    expect(result.imports.map((item) => ({ path: source.slice(item.pathStart, item.pathEnd), alias: source.slice(item.aliasStart!, item.aliasEnd!) }))).toEqual([
      { path: 'Vendor\\Base', alias: 'ParentBase' },
      { path: 'Vendor\\helper', alias: 'importedHelper' },
    ]);
    result.tree.delete();
  });

  it('extracts self, parent and static as exact static receiver ranges', () => {
    const source = '<?php self::run(); parent::$value; static::VALUE;';
    const result = parser.parse(source);
    expect(result.typeReferences.map((reference) => ({ text: source.slice(reference.start, reference.end), context: reference.context }))).toEqual([
      { text: 'self', context: 'static-receiver' },
      { text: 'parent', context: 'static-receiver' },
      { text: 'static', context: 'static-receiver' },
    ]);
    result.tree.delete();
  });

  it('extracts trait precedence, aliases and visibility adaptations', () => {
    const result = parser.parse('<?php class C { use A, B { A::run insteadof B; B::run as protected otherRun; A::hidden as public exposed; } }');
    expect(result.declarations[0]).toMatchObject({ traitNames: ['A', 'B'], traitAdaptations: [
      { kind: 'precedence', trait: 'A', method: 'run', insteadOf: ['B'] },
      { kind: 'alias', trait: 'B', method: 'run', visibility: 'protected', alias: 'otherRun' },
      { kind: 'alias', trait: 'A', method: 'hidden', visibility: 'public', alias: 'exposed' },
    ] });
    result.tree.delete();
  });

  it('extracts statically provable local new and variable assignments', () => {
    const result = parser.parse('<?php namespace App; function run(Service $service, callable $factory, array $data): void { $user = new Domain\\User(); $copy = $user; $element = $data["user"]; $function = find(); $callable = $factory(); $static = Factory::make(); $member = $service->load(); }');
    expect(result.assignments).toMatchObject([
      { variable: '$user', callableFqcn: 'App\\run', typeName: 'Domain\\User' },
      { variable: '$copy', callableFqcn: 'App\\run', sourceVariable: '$user' },
      { variable: '$element', sourceArrayElement: { variable: '$data', key: 'user' } },
      { variable: '$function', sourceCall: { kind: 'function', name: 'find' } },
      { variable: '$callable', sourceCall: { kind: 'callable-variable', variable: '$factory' } },
      { variable: '$static', sourceCall: { kind: 'static', typeName: 'Factory', method: 'make' } },
      { variable: '$member', sourceCall: { kind: 'member', variable: '$service', method: 'load' } },
    ]);
    result.tree.delete();
  });
  it('extracts only literal two-element callable arrays', () => {
    const result = parser.parse(`<?php function run(Handler $handler, string $method): void {
      $instance = [$handler, 'handle']; $static = [Handler::class, "build"];
      $dynamic = [$handler, $method]; $string = ['Handler', 'handle']; $extra = [$handler, 'handle', true];
    }`);
    expect(result.assignments.find((item) => item.variable === '$instance')?.sourceCallableArray).toEqual({
      receiver: { kind: 'variable', variable: '$handler' }, method: 'handle',
    });
    expect(result.assignments.find((item) => item.variable === '$static')?.sourceCallableArray).toEqual({
      receiver: { kind: 'class', typeName: 'Handler' }, method: 'build',
    });
    for (const variable of ['$dynamic', '$string', '$extra']) {
      expect(result.assignments.find((item) => item.variable === variable)?.sourceCallableArray).toBeUndefined();
    }
  });
  it('links only exact closure and arrow assignment literals to their scopes', () => {
    const result = parser.parse(`<?php function run(): void {
      $closure = function (Input $value): Result { return new Result(); };
      $arrow = fn(Input $value): Result => new Result();
      $wrapped = consume(fn(Input $value): Result => new Result());
    }`);
    expect(result.assignments.find((item) => item.variable === '$closure')?.sourceClosureId).toMatch(/^closure@/);
    expect(result.assignments.find((item) => item.variable === '$arrow')?.sourceClosureId).toMatch(/^arrow@/);
    expect(result.assignments.find((item) => item.variable === '$wrapped')?.sourceClosureId).toBeUndefined();
    expect(result.scopes.filter((scope) => scope.kind === 'closure' || scope.kind === 'arrow')).toMatchObject([
      { kind: 'closure', returnType: 'Result', parameters: [{ name: 'value', nativeType: 'Input' }] },
      { kind: 'arrow', returnType: 'Result', parameters: [{ name: 'value', nativeType: 'Input' }] },
      { kind: 'arrow', returnType: 'Result', parameters: [{ name: 'value', nativeType: 'Input' }] },
    ]);
    result.tree.delete();
  });
  it('records an explicitly typed single-parameter arrow callback on member assignments', () => {
    const result = parser.parse('<?php function run(Collection $items): void { $mapped = $items->map(fn(User $item): View => new View()); $invalid = $items->map(fn(User $item): View => new View(), true); }');
    expect(result.assignments.find((item) => item.variable === '$mapped')?.sourceCall).toMatchObject({
      kind: 'member', variable: '$items', method: 'map', callback: { parameterType: 'User', returnType: 'View' },
    });
    expect(result.assignments.find((item) => item.variable === '$invalid')?.sourceCall).toMatchObject({ kind: 'member', callback: undefined });
    result.tree.delete();
  });
  it('records an explicitly typed single-parameter closure callback on member assignments', () => {
    const result = parser.parse('<?php function run(Collection $items): void { $mapped = $items->map(static function(User $item): View { return new View(); }); $unknown = $items->map(function(User $item) { return makeView($item); }); }');
    expect(result.assignments.find((item) => item.variable === '$mapped')?.sourceCall).toMatchObject({
      kind: 'member', variable: '$items', method: 'map', callback: { parameterType: 'User', returnType: 'View' },
    });
    expect(result.assignments.find((item) => item.variable === '$unknown')?.sourceCall).toMatchObject({ kind: 'member', callback: undefined });
    result.tree.delete();
  });
  it('infers a callback return only from a single proven object construction', () => {
    const result = parser.parse('<?php function run(Collection $items): void { $arrow = $items->map(fn(User $item) => new View()); $closure = $items->map(function(User $item) { return new View(); }); $conditional = $items->map(function(User $item) { if ($item) return new View(); return new Other(); }); }');
    expect(result.assignments.find((item) => item.variable === '$arrow')?.sourceCall).toMatchObject({ callback: { parameterType: 'User', returnType: 'View' } });
    expect(result.assignments.find((item) => item.variable === '$closure')?.sourceCall).toMatchObject({ callback: { parameterType: 'User', returnType: 'View' } });
    expect(result.assignments.find((item) => item.variable === '$conditional')?.sourceCall).toMatchObject({ callback: undefined });
    result.tree.delete();
  });
  it('records direct property assignment sources and nullsafe access', () => {
    const result = parser.parse('<?php function run(Holder $holder): void { $ready = $holder->repository; $maybe = $holder?->optional; $nested = $holder->factory->repository; }');
    expect(result.assignments.map(({ variable, sourceMember }) => ({ variable, sourceMember }))).toEqual([
      { variable: '$ready', sourceMember: { variable: '$holder', member: 'repository', nullsafe: false } },
      { variable: '$maybe', sourceMember: { variable: '$holder', member: 'optional', nullsafe: true } },
      { variable: '$nested', sourceMember: undefined },
    ]);
    expect(result.assignments.find((item) => item.variable === '$nested')?.sourceChain).toEqual({
      variable: '$holder', steps: [
        { kind: 'property', name: 'factory', nullsafe: false },
        { kind: 'property', name: 'repository', nullsafe: false },
      ],
    });
    result.tree.delete();
  });
  it('extracts call arguments and reference or variadic parameter facts', () => {
    const result = parser.parse('<?php function collect(int &$first, string ...$rest): void {} collect(first: 1); $service->run(1, name: "x"); Service::build(); new /* comment */ Service();');
    expect(result.callables[0]?.parameters).toMatchObject([
      { name: 'first', byReference: true, variadic: false }, { name: 'rest', byReference: false, variadic: true },
    ]);
    expect(result.calls).toMatchObject([
      { kind: 'function', arguments: [{ name: 'first', unpacked: false }], flat: true },
      { kind: 'method', arguments: [{ name: undefined, unpacked: false }, { name: 'name', unpacked: false }], flat: true },
      { kind: 'static-method', arguments: [], flat: true },
      { kind: 'constructor', arguments: [], flat: true },
    ]);
    const named = result.calls[1]!.arguments[1]!;
    expect(result.tree.rootNode.text.slice(named.nameStart, named.nameEnd)).toBe('name');
    result.tree.delete();
  });
  it('records explicit current-namespace function calls as complete call facts', () => {
    const source = '<?php namespace App; namespace\\localHelper(1);';
    const result = parser.parse(source);
    expect(result.calls.map((call) => ({
      kind: call.kind,
      name: source.slice(call.nameStart, call.nameEnd),
      arguments: call.arguments.length,
    }))).toEqual([{ kind: 'function', name: 'namespace\\localHelper', arguments: 1 }]);
    result.tree.delete();
  });
  it('marks only complete calls directly owned by a compound statement as standalone', () => {
    const result = parser.parse('<?php function run(bool $flag): void { verify(); if ($flag) verify(); if ($flag) { verify(); } $value = verify(); consume(verify()); }');
    expect(result.calls.filter((call) => result.tree.rootNode.text.slice(call.nameStart, call.nameEnd) === 'verify')
      .map((call) => call.standalone)).toEqual([true, false, true, false, false]);
    result.tree.delete();
  });
  it('records the whole expression only when a nested call is guaranteed to execute', () => {
    const source = `<?php function run($guard): void {
      $value = stop(); wrap(stop()); $guard && stop(); stop() && $guard;
      $guard ?? stop(); stop() ?? $guard; $guard ? stop() : other(); stop() ? yes() : no();
      $guard?->run(stop()); stop()?->run();
    }`;
    const result = parser.parse(source);
    const calls = result.calls.filter((call) => source.slice(call.nameStart, call.nameEnd) === 'stop');
    expect(calls.map((call) => call.terminatingExpression && source.slice(call.terminatingExpression.start, call.terminatingExpression.end)))
      .toEqual(['$value = stop()', 'wrap(stop())', undefined, 'stop() && $guard', undefined, 'stop() ?? $guard', undefined,
        'stop() ? yes() : no()', undefined, 'stop()?->run()']);
    result.tree.delete();
  });
  it('records guaranteed control-condition ranges without crossing short circuits', () => {
    const source = `<?php function run($guard, $items): void {
      if (stop()) {} if ($guard && stop()) {} if (stop() || $guard) {}
      while (stop()) {} switch (stop()) {} for (init(); stop(); step()) {}
      foreach (stop() as $item) {} do {} while (stop());
    }`;
    const result = parser.parse(source);
    const calls = result.calls.filter((call) => source.slice(call.nameStart, call.nameEnd) === 'stop');
    expect(calls.map((call) => call.terminatingExpression && source.slice(call.terminatingExpression.start, call.terminatingExpression.end)))
      .toEqual(['(stop())', undefined, '(stop() || $guard)', '(stop())', '(stop())', 'stop()', 'stop()', undefined]);
    result.tree.delete();
  });
  it('records only direct variable receivers for instance and nullsafe calls', () => {
    const source = '<?php function run($guard): void { $guard->check(); $guard?->maybe(); $guard->nested()->check(); Guard::check(); }';
    const result = parser.parse(source);
    const calls = result.calls.filter((call) => ['check', 'maybe'].includes(source.slice(call.nameStart, call.nameEnd)));
    expect(calls.map((call) => call.receiver)).toEqual([
      { variable: '$guard', nullsafe: false },
      { variable: '$guard', nullsafe: true },
      undefined,
      undefined,
    ]);
    result.tree.delete();
  });
  it('records only logically implied truthy and falsy callable branch ranges', () => {
    const source = '<?php function run($guard): void { if (check()) { yes(); } else { no(); } if (!check()) { falsePath(); } else { truePath(); } if (check() && other()) { conjunction(); } else { conjunctionFailed(); } if (check() || other()) { disjunction(); } else { disjunctionFailed(); } if (!(check() || other())) { negatedDisjunction(); } if ($guard->methodCheck()) { methodPath(); } if (Guard::staticCheck()) { staticPath(); } }';
    const result = parser.parse(source);
    const checks = result.calls.filter((call) => source.slice(call.nameStart, call.nameEnd) === 'check');
    const others = result.calls.filter((call) => source.slice(call.nameStart, call.nameEnd) === 'other');
    expect(checks).toHaveLength(5);
    expect(checks[0]?.condition?.whenTrue && source.slice(checks[0].condition!.whenTrue!.start, checks[0].condition!.whenTrue!.end).trim()).toBe('yes();');
    expect(checks[0]?.condition?.whenFalse && source.slice(checks[0].condition!.whenFalse!.start, checks[0].condition!.whenFalse!.end).trim()).toBe('no();');
    expect(checks[1]?.condition?.whenTrue && source.slice(checks[1].condition!.whenTrue!.start, checks[1].condition!.whenTrue!.end).trim()).toBe('truePath();');
    expect(checks[1]?.condition?.whenFalse && source.slice(checks[1].condition!.whenFalse!.start, checks[1].condition!.whenFalse!.end).trim()).toBe('falsePath();');
    expect(checks[2]?.condition?.whenTrue && source.slice(checks[2].condition!.whenTrue!.start, checks[2].condition!.whenTrue!.end).trim()).toBe('conjunction();');
    expect(checks[2]?.condition?.whenFalse).toBeUndefined();
    expect(others[0]?.condition).toEqual(checks[2]?.condition);
    expect(checks[3]?.condition?.whenTrue).toBeUndefined();
    expect(checks[3]?.condition?.whenFalse && source.slice(checks[3].condition!.whenFalse!.start, checks[3].condition!.whenFalse!.end).trim()).toBe('disjunctionFailed();');
    expect(others[1]?.condition).toEqual(checks[3]?.condition);
    expect(checks[4]?.condition?.whenTrue).toBeUndefined();
    expect(checks[4]?.condition?.whenFalse && source.slice(checks[4].condition!.whenFalse!.start, checks[4].condition!.whenFalse!.end).trim()).toBe('negatedDisjunction();');
    expect(others[2]?.condition).toEqual(checks[4]?.condition);
    const methodCheck = result.calls.find((call) => source.slice(call.nameStart, call.nameEnd) === 'methodCheck');
    const staticCheck = result.calls.find((call) => source.slice(call.nameStart, call.nameEnd) === 'staticCheck');
    expect(methodCheck?.condition?.whenTrue && source.slice(methodCheck.condition.whenTrue.start, methodCheck.condition.whenTrue.end).trim()).toBe('methodPath();');
    expect(staticCheck?.condition?.whenTrue && source.slice(staticCheck.condition.whenTrue.start, staticCheck.condition.whenTrue.end).trim()).toBe('staticPath();');
    result.tree.delete();
  });
  it('records precise short-circuit evaluation ranges for callable facts', () => {
    const source = '<?php function run(): void { if (check() && consumeTrue()) {} if (check() || consumeFalse()) {} if ((check() && other()) && consumeNested()) {} if (!(check() || other())) {} }';
    const result = parser.parse(source);
    const ranges = (callName: string, occurrence: number): Array<{ when: 'true' | 'false'; text: string }> | undefined => {
      const call = result.calls.filter((candidate) => source.slice(candidate.nameStart, candidate.nameEnd) === callName)[occurrence];
      return call?.shortCircuit?.map((fact) => ({ when: fact.when, text: source.slice(fact.range.start, fact.range.end) }));
    };
    expect(ranges('check', 0)).toEqual([{ when: 'true', text: 'consumeTrue()' }]);
    expect(ranges('check', 1)).toEqual([{ when: 'false', text: 'consumeFalse()' }]);
    expect(ranges('check', 2)).toEqual([
      { when: 'true', text: 'consumeNested()' },
      { when: 'true', text: 'other()' },
    ]);
    expect(ranges('other', 0)).toEqual([{ when: 'true', text: 'consumeNested()' }]);
    expect(ranges('check', 3)).toEqual([{ when: 'false', text: 'other()' }]);
    result.tree.delete();
  });
  it('records callable condition facts inside while and for bodies without leaking past loops', () => {
    const source = `<?php function run(): void {
      while (check()) { whileBody(); } afterWhile();
      while (!negative()) shortBody(); afterShort();
      for (; checkFor(); ) { forBody(); } afterFor();
      do { doBody(); } while (checkDo());
      do { doShortBody(); } while (checkDoShort() && consumeDoShort());
    }`;
    const result = parser.parse(source);
    const call = (name: string): (typeof result.calls)[number] | undefined => result.calls.find((candidate) => source.slice(candidate.nameStart, candidate.nameEnd) === name);
    const text = (range: { start: number; end: number } | undefined): string | undefined => range && source.slice(range.start, range.end).trim();
    expect(text(call('check')?.condition?.whenTrue)).toBe('whileBody();');
    expect(call('check')?.condition?.whenFalse).toBeUndefined();
    expect(text(call('negative')?.condition?.whenFalse)).toBe('shortBody();');
    expect(text(call('checkFor')?.condition?.whenTrue)).toBe('forBody();');
    expect(call('checkDo')?.condition).toBeUndefined();
    expect(call('checkDoShort')?.shortCircuit?.map((fact) => fact.when)).toEqual(['true']);
    expect(text(call('checkDoShort')?.shortCircuit?.[0]?.range)).toBe('consumeDoShort()');
    expect(result.calls.filter((candidate) => ['afterWhile', 'afterShort', 'afterFor'].includes(source.slice(candidate.nameStart, candidate.nameEnd)))
      .every((candidate) => candidate.condition === undefined)).toBe(true);
    result.tree.delete();
  });
  it('bounds conditional call facts after terminating guards to their containing block', () => {
    const source = `<?php
      function a(): void { if (!check()) { return; } afterA(); }
      function b(): void { if (check()) { throw new Failure(); } afterB(); }
      function c(): void { if (!check()) { logValue(); } afterC(); }
      function d(): void { if (!check()) { return; } else { alternative(); } afterD(); }
      function e(bool $flag): void { if ($flag) { if (!check()) return; nested(); } outside(); }
      function f(): void { if (!check()) { goto after; return; } after: afterF(); }
      function g(bool $flag): void { if (!check()) { if ($flag) { return; } else { throw new Failure(); } } afterG(); }
      function h(bool $first, bool $second): void { if (!check()) { if ($first) { return; } elseif ($second) { exit; } else { throw new Failure(); } } afterH(); }
      function i(bool $flag): void { if (!check()) { if ($flag) { return; } } afterI(); }
      function j(): void { if (!check()) { try { return; } catch (Failure $error) { throw $error; } finally { logValue(); } } afterJ(); }
      function k(): void { if (!check()) { try { logValue(); } finally { exit; } } afterK(); }
      function l(): void { if (!check()) { try { return; } catch (Failure $error) { logValue(); } } afterL(); }
      function m(): void { if (!check()) { try { return; } finally { goto after; } } after: afterM(); }
      function n(int $mode): void { if (!check()) { switch ($mode) { case 1: logValue(); case 2: return; default: throw new Failure(); } } afterN(); }
      function o(int $mode): void { if (!check()) { switch ($mode) { case 1: return; default: break; } } afterO(); }
      function p(int $mode): void { if (!check()) { switch ($mode) { case 1: return; } } afterP(); }
      function q(int $mode, bool $flag): void { if (!check()) { switch ($mode) { case 1: if ($flag) return; else throw new Failure(); default: exit; } } afterQ(); }
      function r(): void { if (!check()) { while (true) { return; } } afterR(); }
      function s(bool $again): void { if (!check()) { do { throw new Failure(); } while ($again); } afterS(); }
      function t(bool $flag): void { if (!check()) { for (;;) { if ($flag) return; else exit; } } afterT(); }
      function u(): void { if (!check()) { while (true) { break; } } afterU(); }
      function v(bool $again): void { if (!check()) { while ($again) { return; } } afterV(); }`;
    const result = parser.parse(source);
    const checks = result.calls.filter((call) => source.slice(call.nameStart, call.nameEnd) === 'check');
    const text = (range: { start: number; end: number } | undefined): string | undefined => range && source.slice(range.start, range.end).trim();
    expect(checks[0]?.guardContinuation?.when).toBe('true');
    expect(text(checks[0]?.guardContinuation?.range)).toBe('afterA();');
    expect(text(checks[0]?.condition?.whenFalse)).toBe('return;');
    expect(text(checks[1]?.condition?.whenTrue)).toContain('throw new Failure();');
    expect(checks[1]?.guardContinuation?.when).toBe('false');
    expect(text(checks[1]?.guardContinuation?.range)).toBe('afterB();');
    expect(text(checks[2]?.condition?.whenTrue)).toBeUndefined();
    expect(text(checks[2]?.condition?.whenFalse)).toBe('logValue();');
    expect(text(checks[3]?.condition?.whenTrue)).toBe('alternative();');
    expect(text(checks[3]?.condition?.whenFalse)).toBe('return;');
    expect(checks[3]?.guardContinuation?.when).toBe('true');
    expect(text(checks[3]?.guardContinuation?.range)).toBe('afterD();');
    expect(checks[4]?.guardContinuation?.when).toBe('true');
    expect(text(checks[4]?.guardContinuation?.range)).toBe('nested();');
    expect(text(checks[4]?.condition?.whenFalse)).toBe('return;');
    expect(checks[4]?.guardContinuation?.range.end).toBeLessThan(source.indexOf('outside();'));
    expect(checks[5]?.guardContinuation).toBeUndefined();
    expect(text(checks[5]?.condition?.whenFalse)).toContain('goto after; return;');
    expect(checks[6]?.guardContinuation?.when).toBe('true');
    expect(text(checks[6]?.guardContinuation?.range)).toBe('afterG();');
    expect(checks[7]?.guardContinuation?.when).toBe('true');
    expect(text(checks[7]?.guardContinuation?.range)).toBe('afterH();');
    expect(checks[8]?.guardContinuation).toBeUndefined();
    expect(checks[9]?.guardContinuation?.when).toBe('true');
    expect(text(checks[9]?.guardContinuation?.range)).toBe('afterJ();');
    expect(checks[10]?.guardContinuation?.when).toBe('true');
    expect(text(checks[10]?.guardContinuation?.range)).toBe('afterK();');
    expect(checks[11]?.guardContinuation).toBeUndefined();
    expect(checks[12]?.guardContinuation).toBeUndefined();
    expect(checks[13]?.guardContinuation?.when).toBe('true');
    expect(text(checks[13]?.guardContinuation?.range)).toBe('afterN();');
    expect(checks[14]?.guardContinuation).toBeUndefined();
    expect(checks[15]?.guardContinuation).toBeUndefined();
    expect(checks[16]?.guardContinuation?.when).toBe('true');
    expect(text(checks[16]?.guardContinuation?.range)).toBe('afterQ();');
    expect(checks[17]?.guardContinuation?.when).toBe('true');
    expect(text(checks[17]?.guardContinuation?.range)).toBe('afterR();');
    expect(checks[18]?.guardContinuation?.when).toBe('true');
    expect(text(checks[18]?.guardContinuation?.range)).toBe('afterS();');
    expect(checks[19]?.guardContinuation?.when).toBe('true');
    expect(text(checks[19]?.guardContinuation?.range)).toBe('afterT();');
    expect(checks[20]?.guardContinuation).toBeUndefined();
    expect(checks[21]?.guardContinuation).toBeUndefined();
    result.tree.delete();
  });
  it('extracts foreach value assignments from simple and keyed iteration', () => {
    const result = parser.parse('<?php function run($users, $entity): void { foreach ($users as $user) { $user->name(); } foreach ($users as $key => $item) { $item->name(); } foreach ($entity->orders as $order) { $order->number(); } }');
    expect(result.assignments.filter((item) => item.sourceIterable).map((item) => [item.variable, item.sourceIterable])).toEqual([
      ['$user', expect.objectContaining({ kind: 'variable', variable: '$users', part: 'value', start: 53, end: 59 })],
      ['$item', expect.objectContaining({ kind: 'variable', variable: '$users', part: 'value', start: 98, end: 104 })],
      ['$order', expect.objectContaining({ kind: 'member', variable: '$entity', member: 'orders', memberKind: 'property', part: 'value', start: 151, end: 166 })],
    ]);
    result.tree.delete();
  });
  it('records only directly representable dynamic member names and receivers', () => {
    const result = parser.parse(`<?php function run(User $user, string $name): void { $user->{'load'}(); $user->{$name}(); $user->{makeName()}(); User::{'build'}(); $user->; $name->; }`);
    const dynamicAccesses = result.memberAccesses.filter((access) => access.dynamic);
    expect(dynamicAccesses).toMatchObject([
      { name: 'load', kind: 'method', static: false, dynamic: 'literal', receiver: { kind: 'variable', name: '$user', nullsafe: false } },
      { name: '$name', kind: 'method', static: false, dynamic: 'variable', receiver: { kind: 'variable', name: '$user', nullsafe: false } },
      { name: 'makeName()', kind: 'method', static: false, dynamic: 'unknown', receiver: { kind: 'variable', name: '$user', nullsafe: false } },
      { name: 'build', kind: 'method', static: true, dynamic: 'literal', receiver: { kind: 'type', name: 'User', nullsafe: false } },
    ]);
    expect(dynamicAccesses).toHaveLength(4);
    result.tree.delete();
  });
  it('records PHP 8.3 dynamic class constant names without treating the wrapper as a literal constant name', () => {
    const result = parser.parse(`<?php function run(string $name, string $input): void {
      $literal = Flags::{'READY'}; $local = Flags::{$name}; $constant = Flags::{Names::READY};
      $folded = Flags::{('REA' . 'DY')}; $unknown = Flags::{$input};
    }`);
    expect(result.memberAccesses.filter((access) => access.kind === 'constant' && access.dynamic)).toMatchObject([
      { name: 'READY', dynamic: 'literal', receiver: { kind: 'type', name: 'Flags' } },
      { name: '$name', dynamic: 'variable', receiver: { kind: 'type', name: 'Flags' } },
      { name: 'Names::READY', dynamic: 'constant', receiver: { kind: 'type', name: 'Flags' } },
      { name: 'READY', dynamic: 'expression', receiver: { kind: 'type', name: 'Flags' } },
      { name: '$input', dynamic: 'variable', receiver: { kind: 'type', name: 'Flags' } },
    ]);
    result.tree.delete();
  });
  it('folds parenthesized and literal-concatenated dynamic member names with one rename range', () => {
    const source = `<?php function run(User $user, string $part): void { $user->{(('lo').('ad'))}(); $user->{('ti' . "tle")}; $user->{('lo' . $part)}(); $user->{('lo' /* keep */ . 'ad')}(); }`;
    const result = parser.parse(source);
    const dynamic = result.memberAccesses.filter((access) => access.dynamic === 'expression');
    expect(dynamic).toMatchObject([
      { name: 'load', kind: 'method', dynamic: 'expression' },
      { name: 'title', kind: 'property', dynamic: 'expression' },
    ]);
    expect(source.slice(dynamic[0]!.start, dynamic[0]!.end)).toBe("lo').('ad");
    expect(source.slice(dynamic[1]!.start, dynamic[1]!.end)).toBe(`ti' . "tle`);
    expect(result.calls.filter((call) => call.receiver)).toHaveLength(1);
    expect(result.memberAccesses.filter((access) => access.dynamic === 'unknown')).toHaveLength(2);
    result.tree.delete();
  });
  it('records global, class and enum-backed constant dynamic names as precise call facts', () => {
    const result = parser.parse(`<?php function run(User $user): void { $user->{METHOD_NAME}(); $user->{Names::LOAD}(); $user->{Method::Load->value}(); $user->{Method::Load->name}(); }`);
    expect(result.memberAccesses.filter((access) => access.dynamic === 'constant')).toMatchObject([
      { name: 'METHOD_NAME', kind: 'method' },
      { name: 'Names::LOAD', kind: 'method' },
      { name: 'Method::Load->value', kind: 'method' },
      { name: 'Method::Load->name', kind: 'method' },
    ]);
    expect(result.calls.filter((call) => call.receiver)).toHaveLength(4);
    result.tree.delete();
  });
  it('records precise dynamic invocations as calls and assignment sources', () => {
    const source = `<?php function run(User $user, string $name): void { $literal = $user->{'load'}(1); $named = $user->{$name}(id: 1); $unsafe = $user->{makeName()}(); }`;
    const result = parser.parse(source);
    const memberCalls = result.calls.filter((call) => call.receiver);
    expect(memberCalls).toMatchObject([
      { arguments: [{ name: undefined }], receiver: { variable: '$user', nullsafe: false } },
      { arguments: [{ name: 'id' }], receiver: { variable: '$user', nullsafe: false } },
    ]);
    expect(memberCalls).toHaveLength(2);
    expect(result.assignments.find((item) => item.variable === '$literal')?.sourceCall).toMatchObject({
      kind: 'member', variable: '$user', method: 'load', dynamic: 'literal',
    });
    expect(result.assignments.find((item) => item.variable === '$named')?.sourceCall).toMatchObject({
      kind: 'member', variable: '$user', method: '$name', dynamic: 'variable',
    });
    expect(result.assignments.find((item) => item.variable === '$unsafe')?.sourceCall).toBeUndefined();
    result.tree.delete();
  });
  it('keeps closure and arrow variables in their smallest lexical scope', () => {
    const result = parser.parse('<?php function run(OuterType $outer) { $before = new Before(); $closure = function(InnerType $inner) use ($before, &$outer) { $inside = new Inside(); }; $arrow = fn(ArrowType $item) => $item; }');
    expect(result.scopes.map((scope) => ({ id: scope.id, kind: scope.kind, parameters: scope.parameters.map((item) => item.type) }))).toEqual([
      { id: 'run', kind: 'function', parameters: ['OuterType'] },
      { id: expect.stringMatching(/^closure@/), kind: 'closure', parameters: ['InnerType'] },
      { id: expect.stringMatching(/^arrow@/), kind: 'arrow', parameters: ['ArrowType'] },
    ]);
    expect(result.assignments.find((item) => item.variable === '$inside')?.scopeId).toMatch(/^closure@/);
    expect(result.scopes[1]).toMatchObject({ parentId: 'run', captures: [{ variable: '$before', byReference: false }, { variable: '$outer', byReference: true }] });
    expect(result.scopes[2]).toMatchObject({ parentId: 'run', captures: [] });
    expect(result.variableReferences.filter((item) => item.variable === '$item')).toMatchObject([{ scopeId: expect.stringMatching(/^arrow@/) }, { scopeId: expect.stringMatching(/^arrow@/) }]);
    expect(result.variableReferences.filter((item) => item.variable === '$before').map((item) => item.scopeId)).toEqual(['run', expect.stringMatching(/^closure@/)]);
    result.tree.delete();
  });
  it('records return expressions in their smallest lexical scope', () => {
    const source = '<?php function outer() { $fn = function () { return new Inner(); }; return new Outer(); }';
    const result = parser.parse(source);
    expect(result.returns.map((item) => [item.scopeId, source.slice(item.expressionStart!, item.expressionEnd!)])).toEqual([
      [expect.stringMatching(/^closure@/), 'new Inner()'], ['outer', 'new Outer()'],
    ]);
    result.tree.delete();
  });
  it('records only a directly proven positive instanceof branch', () => {
    const source = '<?php function run(A|B $value) { if ($value instanceof A) { $value->a(); } else { $value->b(); } if (!($value instanceof B)) { $value->x(); } }';
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'instanceof', variable: '$value', typeName: 'A', scopeId: 'run' },
      { kind: 'not-instanceof', variable: '$value', typeName: 'A', scopeId: 'run' },
      { kind: 'not-instanceof', variable: '$value', typeName: 'B', scopeId: 'run' },
    ]);
    expect(result.narrowings).toHaveLength(3); result.tree.delete();
  });
  it('records strict non-null narrowing only in the positive branch', () => {
    const result = parser.parse('<?php function run(?A $value) { if ($value !== null) { $value->a(); } if ($value === null) { $value->x(); } else { $value->b(); } if (!($value === null)) { $value->c(); } }');
    expect(result.narrowings).toMatchObject([
      { kind: 'non-null', variable: '$value' },
      { kind: 'non-null', variable: '$value' },
      { kind: 'non-null', variable: '$value' },
    ]);
    expect(result.narrowings).toHaveLength(3); result.tree.delete();
  });
  it('records direct builtin type-predicate facts in proven branch ranges', () => {
    const source = '<?php function run(string|int $value, mixed $other) { if (is_string($value)) { useIt($value); } if (is_int($value) && is_string($other)) { useIt($other); } if (!is_float($value)) { useIt($value); } while (is_array($other)) { useIt($other); } }';
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'type-predicate', variable: '$value', functionName: 'is_string', typeName: 'string', scopeId: 'run' },
      { kind: 'type-predicate', variable: '$value', functionName: 'is_int', typeName: 'int', scopeId: 'run' },
      { kind: 'type-predicate', variable: '$other', functionName: 'is_string', typeName: 'string', scopeId: 'run' },
      { kind: 'type-predicate', variable: '$value', functionName: 'is_float', typeName: 'float', negated: true, scopeId: 'run' },
      { kind: 'type-predicate', variable: '$other', functionName: 'is_array', typeName: 'array', scopeId: 'run' },
    ]);
    expect(result.narrowings).toHaveLength(5); result.tree.delete();
  });
  it('records only direct static property paths for builtin predicate facts', () => {
    const source = `<?php class Box { public object $inner; function run(string $name): void {
      if (is_string($this->inner->value)) { useIt($this->inner->value); }
      if ($this->inner->item instanceof Item) { useIt($this->inner->item); }
      if ($this->inner->nullable !== null) { useIt($this->inner->nullable); }
      if (is_int($this?->inner->value)) { useIt($this?->inner->value); }
      if (is_string($this->{$name})) { useIt($this->{$name}); }
    } }`;
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'type-predicate', variable: '$this', propertyPath: ['inner', 'value'], functionName: 'is_string' },
      { kind: 'instanceof', variable: '$this', propertyPath: ['inner', 'item'], typeName: 'Item' },
      { kind: 'non-null', variable: '$this', propertyPath: ['inner', 'nullable'] },
    ]);
    expect(result.narrowings).toHaveLength(3); result.tree.delete();
  });
  it('records non-null facts only when direct isset operands are proven true', () => {
    const source = `<?php function run(?A $value, Box $box, string $name): void {
      if (isset($value, $box->item, $box->{$name}, $box?->nullable)) { useIt($value, $box->item); }
      if (isset($box->missing)) { return; } else { useUnknown($box->missing); }
      if (!isset($box->guarded)) return; useIt($box->guarded);
      if (isset($data['label'], $data[0], $data[$name], $data['not-safe-key'])) { useIt($data['label']); }
      if (is_string($data['value'])) { useIt($data['value']); }
      if (!empty($value)) { useIt($value); }
      if (empty($box->emptyGuard)) return; useIt($box->emptyGuard);
      if (!empty($data['ready'])) { useIt($data['ready']); }
      if (empty($box->unknownEmpty)) { useUnknown($box->unknownEmpty); }
      if ($value) { useIt($value); }
      if (!$box->truthyGuard) return; useIt($box->truthyGuard);
      if ($data['truthy']) { useIt($data['truthy']); }
      if (!$box->falsy) { useUnknown($box->falsy); }
      if (isset($data['meta']['label'])) { useIt($data['meta']['label']); }
      if (is_string($data['meta'][0])) { useIt($data['meta'][0]); }
      if (isset($data['meta'][$name])) { useUnknown($data['meta'][$name]); }
      if (array_key_exists('present', $data)) { useIt($data['present']); }
      if (!key_exists('item', $data['meta'])) return; useIt($data['meta']['item']);
      if (array_key_exists($name, $data)) { useUnknown($data[$name]); }
      if (!array_key_exists('absent', $data)) { useUnknown($data['absent']); }
    }`;
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'non-null', variable: '$value' },
      { kind: 'non-null', variable: '$box', propertyPath: ['item'] },
      { kind: 'non-null', variable: '$box', propertyPath: ['missing'] },
      { kind: 'non-null', variable: '$box', propertyPath: ['guarded'] },
      { kind: 'non-null', variable: '$data', arrayPath: ['label'] },
      { kind: 'non-null', variable: '$data', arrayPath: ['0'] },
      { kind: 'type-predicate', variable: '$data', arrayPath: ['value'], functionName: 'is_string' },
      { kind: 'non-null', variable: '$value' },
      { kind: 'non-null', variable: '$box', propertyPath: ['emptyGuard'] },
      { kind: 'non-null', variable: '$data', arrayPath: ['ready'] },
      { kind: 'non-null', variable: '$value' },
      { kind: 'non-null', variable: '$box', propertyPath: ['truthyGuard'] },
      { kind: 'non-null', variable: '$data', arrayPath: ['truthy'] },
      { kind: 'non-null', variable: '$data', arrayPath: ['meta', 'label'] },
      { kind: 'type-predicate', variable: '$data', arrayPath: ['meta', '0'], functionName: 'is_string' },
      { kind: 'array-key-exists', variable: '$data', arrayPath: ['present'], functionName: 'array_key_exists' },
      { kind: 'array-key-exists', variable: '$data', arrayPath: ['meta', 'item'], functionName: 'key_exists' },
    ]);
    expect(result.narrowings).toHaveLength(17); result.tree.delete();
  });
  it('bounds safe literal array paths at sixteen levels', () => {
    const path = (length: number): string => Array.from({ length }, (_, index) => `['k${index}']`).join('');
    const source = `<?php function run(array $data): void { if (isset($data${path(16)})) { useIt($data${path(16)}); } if (isset($data${path(17)})) { useUnknown($data${path(17)}); } }`;
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([{ kind: 'non-null', variable: '$data', arrayPath: Array.from({ length: 16 }, (_, index) => `k${index}`) }]);
    expect(result.narrowings).toHaveLength(1); result.tree.delete();
  });
  it('records predicate complements in else, terminating guard and false disjunction ranges', () => {
    const source = '<?php function run(string|int|bool $value) { if (!is_string($value)) { useOther($value); } else { useString($value); } if (is_int($value)) return; useNotInt($value); if (is_string($value) || is_int($value)) return; useBool($value); }';
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'type-predicate', functionName: 'is_string', negated: true },
      { kind: 'type-predicate', functionName: 'is_string', negated: false },
      { kind: 'type-predicate', functionName: 'is_int', negated: false },
      { kind: 'type-predicate', functionName: 'is_int', negated: true },
      { kind: 'type-predicate', functionName: 'is_string', negated: true },
      { kind: 'type-predicate', functionName: 'is_int', negated: true },
    ]);
    expect(result.narrowings).toHaveLength(6); result.tree.delete();
  });
  it('records object-only is_a facts and rejects string-enabled or dynamic class checks', () => {
    const source = `<?php function run($direct, $guard, $named, $stringEnabled, $dynamic, string $class): void {
      if (is_a($direct, Ready::class)) { useReady($direct); } else { useOther($direct); }
      if (!is_a($guard, Ready::class, false)) return; useReady($guard);
      if (is_a(object_or_class: $named, class: Ready::class, allow_string: false)) { useReady($named); }
      if (is_a($stringEnabled, Ready::class, true)) { useUnknown($stringEnabled); }
      if (is_a($dynamic, $class)) { useUnknown($dynamic); }
    }`;
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'type-predicate', variable: '$direct', typeName: 'Ready', functionName: 'is_a', negated: false },
      { kind: 'type-predicate', variable: '$direct', typeName: 'Ready', functionName: 'is_a', negated: true },
      { kind: 'type-predicate', variable: '$guard', typeName: 'Ready', functionName: 'is_a', negated: true },
      { kind: 'type-predicate', variable: '$guard', typeName: 'Ready', functionName: 'is_a', negated: false },
      { kind: 'type-predicate', variable: '$named', typeName: 'Ready', functionName: 'is_a', negated: false },
    ]);
    expect(result.narrowings).toHaveLength(5); result.tree.delete();
  });
  it('records strict subclass facts only when is_subclass_of disallows strings', () => {
    const source = `<?php function run($direct, $guard, $named, $default, $enabled, $dynamic, string $class): void {
      if (is_subclass_of($direct, BaseType::class, false)) { useChild($direct); } else { useOther($direct); }
      if (!is_subclass_of($guard, BaseType::class, false)) return; useChild($guard);
      if (is_subclass_of(object_or_class: $named, class: BaseType::class, allow_string: false)) { useChild($named); }
      if (is_subclass_of($default, BaseType::class)) { useUnknown($default); }
      if (is_subclass_of($enabled, BaseType::class, true)) { useUnknown($enabled); }
      if (is_subclass_of($dynamic, $class, false)) { useUnknown($dynamic); }
    }`;
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'subclass-predicate', variable: '$direct', typeName: 'BaseType', functionName: 'is_subclass_of', negated: false },
      { kind: 'subclass-predicate', variable: '$direct', typeName: 'BaseType', functionName: 'is_subclass_of', negated: true },
      { kind: 'subclass-predicate', variable: '$guard', typeName: 'BaseType', functionName: 'is_subclass_of', negated: true },
      { kind: 'subclass-predicate', variable: '$guard', typeName: 'BaseType', functionName: 'is_subclass_of', negated: false },
      { kind: 'subclass-predicate', variable: '$named', typeName: 'BaseType', functionName: 'is_subclass_of', negated: false },
    ]);
    expect(result.narrowings).toHaveLength(5); result.tree.delete();
  });
  it('records callable facts only when is_callable performs the runtime check', () => {
    const source = `<?php function run($default, $explicit, $guard, $named, $syntax, $dynamic, bool $flag): void {
      if (is_callable($default)) { useCallable($default); } else { useOther($default); }
      if (is_callable($explicit, false)) { useCallable($explicit); }
      if (!is_callable($guard, false)) return; useCallable($guard);
      if (is_callable(value: $named, syntax_only: false)) { useCallable($named); }
      if (is_callable($syntax, true)) { useUnknown($syntax); }
      if (is_callable($dynamic, $flag)) { useUnknown($dynamic); }
    }`;
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'type-predicate', variable: '$default', typeName: 'callable', functionName: 'is_callable', negated: false },
      { kind: 'type-predicate', variable: '$default', typeName: 'callable', functionName: 'is_callable', negated: true },
      { kind: 'type-predicate', variable: '$explicit', typeName: 'callable', functionName: 'is_callable', negated: false },
      { kind: 'type-predicate', variable: '$guard', typeName: 'callable', functionName: 'is_callable', negated: true },
      { kind: 'type-predicate', variable: '$guard', typeName: 'callable', functionName: 'is_callable', negated: false },
      { kind: 'type-predicate', variable: '$named', typeName: 'callable', functionName: 'is_callable', negated: false },
    ]);
    expect(result.narrowings).toHaveLength(6); result.tree.delete();
  });
  it('carries prior false predicate facts through elseif chains and their continuation', () => {
    const source = '<?php function run(string|int|bool $value) { if (is_string($value)) { useString($value); } elseif (is_int($value)) { useInt($value); } else { useBool($value); } if (is_string($value)) return; elseif (is_int($value)) return; useBoolAgain($value); }';
    const result = parser.parse(source);
    expect(result.narrowings.map((item) => item.kind === 'type-predicate'
      ? [item.functionName, Boolean(item.negated), source.slice(item.start, item.end).includes('useBool')]
      : [item.kind])).toEqual([
      ['is_string', false, false],
      ['is_string', true, false], ['is_int', false, false],
      ['is_string', true, true], ['is_int', true, true],
      ['is_string', false, false],
      ['is_string', true, false], ['is_int', false, false],
      ['is_string', true, true], ['is_int', true, true],
    ]);
    result.tree.delete();
  });
  it('records narrowing after a directly negated guard that always exits', () => {
    const source = '<?php function run(A|B $value, ?A $nullable, ?A $exited) { if (!($value instanceof A)) { logIt(); return; } $value->a(); if ($nullable === null) throw new Exception(); $nullable->a(); if ($exited === null) exit(1); $exited->a(); }';
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'instanceof', variable: '$value', typeName: 'A', scopeId: 'run' },
      { kind: 'non-null', variable: '$nullable', scopeId: 'run' },
      { kind: 'non-null', variable: '$exited', scopeId: 'run' },
    ]);
    expect(result.narrowings[0]?.start).toBeLessThan(source.indexOf('$value->a'));
    expect(result.narrowings[0]?.end).toBeGreaterThan(source.indexOf('$value->a'));
    expect(result.narrowings[1]?.start).toBeLessThan(source.indexOf('$nullable->a'));
    expect(result.narrowings[1]?.end).toBeGreaterThan(source.indexOf('$nullable->a'));
    expect(result.narrowings[2]?.end).toBeGreaterThan(source.indexOf('$exited->a'));
    result.tree.delete();
  });
  it('records only direct positive while-loop entry facts inside the body', () => {
    const source = '<?php function run(?A $nullable, A|B $value, ?A $loose) { while ($nullable !== null) { $nullable->a(); } while ($value instanceof A) $value->a(); while ($loose != null) { $loose->a(); } }';
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'non-null', variable: '$nullable', scopeId: 'run' },
      { kind: 'instanceof', variable: '$value', typeName: 'A', scopeId: 'run' },
      { kind: 'non-null', variable: '$loose', scopeId: 'run' },
    ]);
    expect(result.narrowings).toHaveLength(3);
    expect(result.narrowings[2]?.start).toBeLessThan(source.lastIndexOf('$loose->a'));
    expect(result.narrowings[2]?.end).toBeGreaterThan(source.lastIndexOf('$loose->a'));
    result.tree.delete();
  });
  it('records every mandatory atom in a positive conjunction but not a disjunction', () => {
    const source = '<?php function run(?A $left, A|B $right, ?A $uncertain) { if ($left !== null && $right instanceof A) { $left->a(); $right->a(); } if ($left !== null || $uncertain !== null) { $left->x(); } while ($left !== null && $right instanceof A) { $right->b(); } }';
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'non-null', variable: '$left' },
      { kind: 'instanceof', variable: '$right', typeName: 'A' },
      { kind: 'non-null', variable: '$left' },
      { kind: 'instanceof', variable: '$right', typeName: 'A' },
    ]);
    expect(result.narrowings).toHaveLength(4);
    expect(result.narrowings.some((item) => item.variable === '$uncertain')).toBe(false);
    result.tree.delete();
  });
  it('records strict boolean literal facts in logically implied short-circuit operands', () => {
    const source = `<?php function run(array|false $right, array|false $left, array|false $loose) {
      if ($right !== false && consume($right)) {}
      if ($left === false || consume($left)) {}
      if ($loose != false && consume($loose)) {}
    }`;
    const result = parser.parse(source);
    const calls = [...source.matchAll(/consume\(/g)].map((match) => match.index);
    const facts = result.narrowings.filter((item) => item.kind === 'boolean-literal'
      && calls.some((offset) => offset >= item.start && offset <= item.end));
    expect(facts).toMatchObject([
      { kind: 'boolean-literal', variable: '$right', value: false, negated: true, scopeId: 'run' },
      { kind: 'boolean-literal', variable: '$left', value: false, negated: true, scopeId: 'run' },
    ]);
    expect(facts).toHaveLength(2);
    expect(result.narrowings.some((item) => item.variable === '$loose')).toBe(false);
    result.tree.delete();
  });
  it('records strict boolean literal facts in the selected ternary arm', () => {
    const source = `<?php function run(array|false $right, array|false $left, array|false $loose) {
      consume($right === false ? fallback() : use($right));
      consume($left !== false ? use($left) : fallback());
      consume($loose != false ? use($loose) : fallback());
    }`;
    const result = parser.parse(source);
    const useOffsets = [...source.matchAll(/use\(/g)].map((match) => match.index);
    const facts = result.narrowings.filter((item) => item.kind === 'boolean-literal'
      && useOffsets.some((offset) => offset >= item.start && offset <= item.end));
    expect(facts).toMatchObject([
      { kind: 'boolean-literal', variable: '$right', value: false, negated: true, scopeId: 'run' },
      { kind: 'boolean-literal', variable: '$left', value: false, negated: true, scopeId: 'run' },
    ]);
    expect(facts).toHaveLength(2);
    expect(facts.every((fact) => fact.inspectionStart !== undefined && fact.inspectionStart < fact.start)).toBe(true);
    expect(result.narrowings.some((item) => item.variable === '$loose')).toBe(false);
    result.tree.delete();
  });
  it('records positive condition facts after standalone native assert calls', () => {
    const source = `<?php function run(A|B $value, A|B $named, A|B $left, A|B $right, ?A $nullable, string|int $scalar, A|B $described, A|B $namedDescription, A|B $reordered, A|B $excluded, string|int $negativeScalar, ?A $notNull, int|float|string $numeric, array $data, A|B $nested, A|B $dynamicDescription, string $message, A|B $invalidOrder) {
      assert($value instanceof A); $value->a();
      \\assert(assertion: $named instanceof A); $named->a();
      assert($left instanceof A && $right instanceof A); $left->a(); $right->a();
      assert($nullable !== null); $nullable->a();
      assert(is_string($scalar)); consumeString($scalar);
      assert($described instanceof A, 'description'); $described->a();
      assert(assertion: $namedDescription instanceof A, description: null); $namedDescription->a();
      assert(description: "static description", assertion: $reordered instanceof A); $reordered->a();
      assert(!($excluded instanceof A)); $excluded->b();
      assert(!is_string($negativeScalar)); consumeInt($negativeScalar);
      assert(!is_null($notNull)); $notNull->a();
      assert(!is_numeric($numeric)); consumeString($numeric);
      assert(isset($data['ready'])); $data['ready']->a();
      assert(array_key_exists('present', $data)); consume($data['present']);
      consume(assert($nested instanceof A)); $nested->a();
      assert($dynamicDescription instanceof A, $message); $dynamicDescription->a();
      assert(description: 'invalid order', $invalidOrder instanceof A); $invalidOrder->a();
    }`;
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'instanceof', variable: '$value', typeName: 'A', scopeId: 'run' },
      { kind: 'instanceof', variable: '$named', typeName: 'A', scopeId: 'run' },
      { kind: 'instanceof', variable: '$left', typeName: 'A', scopeId: 'run' },
      { kind: 'instanceof', variable: '$right', typeName: 'A', scopeId: 'run' },
      { kind: 'non-null', variable: '$nullable', scopeId: 'run' },
      { kind: 'type-predicate', variable: '$scalar', typeName: 'string', functionName: 'is_string', scopeId: 'run' },
      { kind: 'instanceof', variable: '$described', typeName: 'A', scopeId: 'run' },
      { kind: 'instanceof', variable: '$namedDescription', typeName: 'A', scopeId: 'run' },
      { kind: 'instanceof', variable: '$reordered', typeName: 'A', scopeId: 'run' },
      { kind: 'not-instanceof', variable: '$excluded', typeName: 'A', scopeId: 'run' },
      { kind: 'type-predicate', variable: '$negativeScalar', typeName: 'string', negated: true, scopeId: 'run' },
      { kind: 'type-predicate', variable: '$notNull', typeName: 'null', negated: true, scopeId: 'run' },
      { kind: 'type-predicate', variable: '$numeric', typeName: 'int|float', negated: true, scopeId: 'run' },
      { kind: 'non-null', variable: '$data', arrayPath: ['ready'], scopeId: 'run' },
      { kind: 'array-key-exists', variable: '$data', arrayPath: ['present'], scopeId: 'run' },
    ]);
    expect(result.narrowings).toHaveLength(15);
    for (const narrowing of result.narrowings) {
      expect(narrowing.assertion).toBe(true);
      expect(source.slice(narrowing.start, narrowing.end)).toContain(narrowing.variable);
    }
    result.tree.delete();
  });
  it('records only strict boolean literal facts from standalone native assert calls', () => {
    const source = `<?php function run(int|false $right, bool $left, mixed $exact, int|true $truthy, int|false $loose) {
      assert($right !== false); consumeInt($right);
      assert(false !== $left); consumeTrue($left);
      assert($exact === false); consumeFalse($exact);
      assert(true === $truthy); consumeTrue($truthy);
      assert($loose != false); consumeUnknown($loose);
    }`;
    const result = parser.parse(source);
    expect(result.narrowings).toMatchObject([
      { kind: 'boolean-literal', variable: '$right', value: false, negated: true, assertion: true },
      { kind: 'boolean-literal', variable: '$left', value: false, negated: true, assertion: true },
      { kind: 'boolean-literal', variable: '$exact', value: false, negated: false, assertion: true },
      { kind: 'boolean-literal', variable: '$truthy', value: true, negated: false, assertion: true },
    ]);
    expect(result.narrowings).toHaveLength(4);
    expect(result.narrowings.some((item) => item.variable === '$loose')).toBe(false);
    result.tree.delete();
  });
  it('records single and multi-catch types only inside their catch bodies', () => {
    const source = '<?php function run() { try { work(); } catch (Failure $error) { $error->report(); } catch (First|Second $unknown) { $unknown->report(); } }';
    const result = parser.parse(source);
    expect(result.assignments).toMatchObject([
      { variable: '$error', typeName: 'Failure', scopeId: 'run' },
      { variable: '$unknown', typeNames: ['First', 'Second'], scopeId: 'run' },
    ]);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0]?.validRange?.start).toBeLessThan(source.indexOf('$error->report'));
    expect(result.assignments[0]?.validRange?.end).toBeGreaterThan(source.indexOf('$error->report'));
    expect(result.assignments[1]?.validRange?.start).toBeLessThan(source.indexOf('$unknown->report'));
    expect(result.assignments[1]?.validRange?.end).toBeGreaterThan(source.indexOf('$unknown->report'));
    result.tree.delete();
  });

  it('extracts declared, static, readonly, promoted properties and typed constants', () => {
    const result = parser.parse(`<?php namespace App; class User {
      public readonly ?Profile $profile, $backup;
      protected static int $count = 1;
      public private(set) static string $token = 'ready';
      public const string KIND = 'user';
      public function __construct(private Address $address, public final string $id) {}
    }`);
    expect(result.properties).toMatchObject([
      { name: 'profile', fqcn: 'App\\User::$profile', type: '?Profile', visibility: 'public', static: false, readonly: true, promoted: false },
      { name: 'backup', type: '?Profile' },
      { name: 'count', type: 'int', defaultValue: '1', visibility: 'protected', static: true },
      { name: 'token', type: 'string', defaultValue: "'ready'", visibility: 'public', writeVisibility: 'private', static: true },
      { name: 'address', type: 'Address', defaultValue: undefined, visibility: 'private', promoted: true },
      { name: 'id', type: 'string', visibility: 'public', final: true, promoted: true },
    ]);
    expect(result.constants).toMatchObject([{ name: 'KIND', fqcn: 'App\\User::KIND', type: 'string', value: "'user'", visibility: 'public', global: false }]);
    result.tree.delete();
  });
  it('extracts PHP 8.4 property hook capabilities, write types, visibility, and backing state', () => {
    const result = parser.parse(`<?php
      interface Named { public string $required { get; set; } }
      abstract class User {
        abstract public string $partial { get; final set => $value; }
        final protected string $reference { &get { return $this->reference; } }
        public string $backed { get => $this->backed; }
        public string $display { get => 'display'; }
        public private(set) string $input { set(string|\\Stringable $value) => (string) $value; }
        public string $normalized { get => $this->normalized; final set => strtolower($value); }
      }
    `);
    expect(result.errors).toEqual([]);
    expect(result.properties).toMatchObject([
      { name: 'required', abstract: true, final: false, virtual: true, readable: true, writable: true, writeType: 'string', hooks: [
        { kind: 'get', abstract: true, byReference: false, usesBackingValue: false }, { kind: 'set', abstract: true, byReference: false, usesBackingValue: false },
      ] },
      { name: 'partial', abstract: true, final: false, hooks: [
        { kind: 'get', abstract: true, byReference: false }, { kind: 'set', abstract: false, final: true, byReference: false },
      ] },
      { name: 'reference', abstract: false, final: true, hooks: [{ kind: 'get', byReference: true }] },
      { name: 'backed', virtual: false, readable: true, writable: true, hooks: [{ kind: 'get', abstract: false, usesBackingValue: true }] },
      { name: 'display', virtual: true, readable: true, writable: false, hooks: [{ kind: 'get', usesBackingValue: false }] },
      { name: 'input', visibility: 'public', writeVisibility: 'private', virtual: false, readable: true, writable: true,
        writeType: 'string|\\Stringable', hooks: [{ kind: 'set', parameter: { name: 'value', nativeType: 'string|\\Stringable' }, usesBackingValue: true }] },
      { name: 'normalized', virtual: false, readable: true, writable: true, writeType: 'string', hooks: [
        { kind: 'get', usesBackingValue: true }, { kind: 'set', final: true },
      ] },
    ]);
    const hookScopes = result.scopes.filter((scope) => scope.kind === 'property-hook');
    expect(hookScopes).toHaveLength(10);
    expect(hookScopes.map((scope) => scope.parameters.map((parameter) => [parameter.name, parameter.type]))).toEqual([
      [], [['value', 'string']], [], [['value', 'string']], [], [], [], [['value', 'string|\\Stringable']], [], [['value', 'string']],
    ]);
    expect(result.variableReferences.filter((reference) => reference.variable === '$value').map((reference) => reference.scopeId)).toEqual([
      hookScopes[3]!.id, hookScopes[7]!.id, hookScopes[7]!.id, hookScopes[9]!.id,
    ]);
    result.tree.delete();
  });
  it('marks every valid instance property declared by a readonly class as readonly', () => {
    const result = parser.parse(`<?php namespace App;
      readonly class State { public int $id; public readonly string $label; public static int $invalid; public function __construct(public int $version) {} }
      class Mutable { public int $id; }
    `);
    expect(result.declarations).toMatchObject([
      { name: 'State', kind: 'class', readonlyClass: true },
      { name: 'Mutable', kind: 'class', readonlyClass: false },
    ]);
    expect(result.properties).toMatchObject([
      { name: 'id', containerFqcn: 'App\\State', static: false, readonly: true },
      { name: 'label', containerFqcn: 'App\\State', static: false, readonly: true },
      { name: 'invalid', containerFqcn: 'App\\State', static: true, readonly: false },
      { name: 'version', containerFqcn: 'App\\State', promoted: true, readonly: true },
      { name: 'id', containerFqcn: 'App\\Mutable', static: false, readonly: false },
    ]);
    result.tree.delete();
  });
  it('extracts namespace constants separately from class constants', () => {
    const result = parser.parse('<?php namespace App; const VERSION = "1", OTHER = "2";');
    expect(result.constants).toMatchObject([
      { name: 'VERSION', fqcn: 'App\\VERSION', global: true, containerFqcn: undefined },
      { name: 'OTHER', fqcn: 'App\\OTHER', global: true, containerFqcn: undefined },
    ]);
    result.tree.delete();
  });
  it('extracts unit and backed enum cases as distinct static members', () => {
    const result = parser.parse('<?php namespace App; enum Status: string { case Ready = "ready"; case ready = "lower"; public const LABEL = "status"; }');
    expect(result.declarations).toMatchObject([{ name: 'Status', kind: 'enum', enumBackingType: 'string' }]);
    expect(result.constants).toMatchObject([
      { kind: 'enum-case', name: 'Ready', fqcn: 'App\\Status::Ready', containerFqcn: 'App\\Status', global: false, type: 'App\\Status', value: '"ready"', visibility: 'public' },
      { kind: 'enum-case', name: 'ready', fqcn: 'App\\Status::ready', containerFqcn: 'App\\Status', global: false, type: 'App\\Status', value: '"lower"', visibility: 'public' },
      { kind: 'constant', name: 'LABEL', fqcn: 'App\\Status::LABEL', global: false },
    ]);
    result.tree.delete();
  });
  it('does not invent a backing type for a unit enum', () => {
    const result = parser.parse('<?php enum State { case Ready; }');
    expect(result.declarations).toMatchObject([{ name: 'State', kind: 'enum', enumBackingType: undefined }]);
    result.tree.delete();
  });
  it('gives anonymous classes a document-scoped identity and extracts their members', () => {
    const result = parser.parse('<?php namespace App; function run() { $value = new class extends Base implements Contract { public function local(): void {} }; }', undefined, 'file:///Anonymous.php');
    const declaration = result.declarations.find((item) => item.anonymous)!;
    expect(declaration).toMatchObject({ kind: 'class', anonymous: true, extendsNames: ['Base'], implementsNames: ['Contract'] });
    expect(declaration.fqcn).toContain('@anonymous:file%3A%2F%2F%2FAnonymous.php:');
    expect(result.callables.find((item) => item.name === 'local')).toMatchObject({ name: 'local', containerFqcn: declaration.fqcn });
    expect(result.assignments).toMatchObject([{ variable: '$value', typeName: declaration.fqcn }]);
    result.tree.delete();
  });
});

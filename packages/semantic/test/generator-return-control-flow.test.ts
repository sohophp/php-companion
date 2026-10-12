import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { parsePhpDocType, type PhpDocType } from '@php-companion/phpdoc';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const declarations = String.raw`<?php namespace ReturnFlow;
class Item { public function item(): void {} }
class Result { public function done(): void {} }
class Other { public function other(): void {} }
function needResult(Result $value): void {}
function needOther(Other $value): void {}
`;

const cases = [
  { name: 'conditional return includes implicit null', body: 'if ($flag) { return new Result(); }', type: 'ReturnFlow\\Result|null' },
  { name: 'complete branches have no implicit null', body: 'if ($flag) { return new Result(); } else { return new Other(); }', type: 'ReturnFlow\\Result|ReturnFlow\\Other' },
  { name: 'throwing alternative has no return value', body: 'if ($flag) { throw new \\Exception(); } return new Result();', type: 'ReturnFlow\\Result' },
  { name: 'finally return replaces the pending return', body: 'try { return new Result(); } finally { return new Other(); }', type: 'ReturnFlow\\Other' },
  { name: 'conditional finally combines replacement and pending returns', body: 'try { return new Result(); } finally { if ($flag) { return new Other(); } }', type: 'ReturnFlow\\Result|ReturnFlow\\Other' },
  { name: 'try and catch may fall through', body: 'try { if ($flag) { return new Result(); } } catch (\\Exception $e) { return new Other(); }', type: 'ReturnFlow\\Result|ReturnFlow\\Other|null' },
  { name: 'try and catch both return', body: 'try { return new Result(); } catch (\\Exception $e) { return new Other(); }', type: 'ReturnFlow\\Result|ReturnFlow\\Other' },
  { name: 'switch without default includes implicit null', body: 'switch ($flag) { case true: return new Result(); }', type: 'ReturnFlow\\Result|null' },
  { name: 'switch with complete default returns is total', body: 'switch ($flag) { case true: return new Result(); default: return new Other(); }', type: 'ReturnFlow\\Result|ReturnFlow\\Other' },
  { name: 'switch local break keeps fallthrough', body: 'switch ($flag) { case true: return new Result(); default: break; }', type: 'ReturnFlow\\Result|null' },
  { name: 'switch break can reach a following return', body: 'switch ($flag) { case true: return new Result(); default: break 1; } return new Other();', type: 'ReturnFlow\\Result|ReturnFlow\\Other' },
  { name: 'optional while return includes implicit null', body: 'while ($flag) { return new Result(); }', type: 'ReturnFlow\\Result|null' },
  { name: 'do return executes at least once', body: 'do { return new Result(); } while ($flag);', type: 'ReturnFlow\\Result' },
  { name: 'literal false loop excludes its unreachable return', body: 'while (false) { return new Other(); } return new Result();', type: 'ReturnFlow\\Result' },
  { name: 'false for loop excludes its unreachable return', body: 'for (; false;) { return new Other(); } return new Result();', type: 'ReturnFlow\\Result' },
  { name: 'empty foreach excludes its unreachable return', body: 'foreach ([] as $value) { return new Other(); } return new Result();', type: 'ReturnFlow\\Result' },
  { name: 'nonempty foreach returns on its first iteration', body: 'foreach ([1] as $value) { return new Result(); }', type: 'ReturnFlow\\Result' },
  { name: 'unknown foreach may be empty', body: 'foreach ($values as $value) { return new Result(); }', type: 'ReturnFlow\\Result|null' },
  { name: 'unreachable sequential return is excluded', body: 'return new Result(); return new Other();', type: 'ReturnFlow\\Result' },
  { name: 'nested closure does not add its return', body: '$nested = function () { return new Other(); }; return new Result();', type: 'ReturnFlow\\Result' },
  { name: 'bare return includes null', body: 'if ($flag) { return; } return new Result();', type: 'ReturnFlow\\Result|null' },
  { name: 'yield-only generator keeps its existing void contract', body: '', type: 'void' },
] as const;

function normalized(type: PhpDocType): string {
  if (type.kind === 'name') return type.name.replace(/^\\/, '');
  if (type.kind === 'union') return type.types.map(normalized).sort().join('|');
  throw new Error(`Unexpected inferred return type: ${type.kind}`);
}

describe('Generator return contracts follow reachable completion paths', () => {
  it.each(cases.flatMap(row => [false, true].map(deferred => ({ row, deferred }))))('$row.name (deferred=$deferred)', ({ row, deferred }) => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///GeneratorReturnFlow.php';
    const source = declarations + `function stream(bool $flag, array $values): \\Generator { yield new Item(); ${row.body} }
function query(): void { stream(false, []); }`;
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const result = workspace.signature(uri, source.lastIndexOf('stream(') + 'stream('.length)?.returnType;
      const parsed = result && parsePhpDocType(result);
      expect(parsed && parsed.errors).toEqual([]);
      const type = parsed && parsed.type;
      expect(type?.kind).toBe('generic');
      if (type?.kind !== 'generic') throw new Error(`Missing inferred Generator: ${result}`);
      expect(normalized(type.arguments[3]!)).toBe(normalized(parsePhpDocType(row.type).type!));
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });

  it.each(['7.2', '8.5'] as const)('delegated nullable results require narrowing before navigation (PHP %s)', version => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///NullableDelegatedResult.php';
    const source = declarations + String.raw`
function inner(bool $flag): \Generator { yield new Item(); if ($flag) { return new Result(); } }
function outer(bool $flag): \Generator {
  $result = yield from inner($flag);
  $result->done();
  needResult($result);
  if ($result !== null) { $result->done(); needResult($result); needOther($result); }
}`;
    try {
      workspace.update(builtinDocumentUri(version), builtinPhpStub(version)); workspace.update(uri, source, true);
      const before = source.indexOf('$result->done()') + '$result->'.length;
      const narrowed = source.lastIndexOf('$result->done()') + '$result->'.length;
      expect(workspace.completeMembers(uri, before)).toEqual([]);
      expect(workspace.memberAt(uri, before + 1)).toBeUndefined();
      expect(workspace.completeMembers(uri, narrowed).map(item => item.name)).toEqual(['done']);
      expect(workspace.memberAt(uri, narrowed + 1)?.fqcn).toBe('ReturnFlow\\Result::done');
      const problems = workspace.incompatibleArguments(uri);
      expect(problems.map(item => item.callable)).toEqual(['ReturnFlow\\needResult', 'ReturnFlow\\needOther']);
    } finally { workspace.dispose(); }
  });

  it.each([false, true])('updates a nullable contract after an unsaved body gains and loses a total return (deferred=%s)', deferred => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///EditedGeneratorReturn.php';
    const body = 'if ($flag) { return new Result(); }';
    const initial = declarations + `function stream(bool $flag): \\Generator { yield new Item(); ${body} }
function query(): void { stream(false); }`;
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      for (const [source, expected] of [[initial, 'ReturnFlow\\Result|null'], [initial.replace(body, body + ' return new Result();'), 'ReturnFlow\\Result'], [initial, 'ReturnFlow\\Result|null']] as const) {
        if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
        const signature = workspace.signature(uri, source.lastIndexOf('stream(') + 'stream('.length)?.returnType;
        const parsed = signature && parsePhpDocType(signature).type;
        expect(parsed?.kind).toBe('generic');
        if (parsed?.kind !== 'generic') throw new Error(`Missing Generator after edit: ${signature}`);
        expect(normalized(parsed.arguments[3]!)).toBe(normalized(parsePhpDocType(expected).type!));
      }
    } finally { workspace.dispose(); }
  });

  it.each(['while (true)', 'for (;;)'].flatMap(loop => [false, true].map(deferred => ({ loop, deferred }))))('a repeating $loop excludes a return after the loop (deferred=$deferred)', ({ loop, deferred }) => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///RepeatingGeneratorReturn.php';
    const source = declarations + `function stream(bool $flag): \\Generator {
      yield new Item(); ${loop} { if ($flag) { return new Result(); } } return new Other();
    } function query(): void { stream(true); }`;
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const signature = workspace.signature(uri, source.lastIndexOf('stream(') + 'stream('.length)?.returnType;
      const parsed = signature && parsePhpDocType(signature).type;
      expect(parsed?.kind).toBe('generic');
      if (parsed?.kind !== 'generic') throw new Error(`Missing repeating Generator: ${signature}`);
      expect(normalized(parsed.arguments[3]!)).toBe('ReturnFlow\\Result');
    } finally { workspace.dispose(); }
  });
});

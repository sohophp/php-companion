import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///DocumentedCallbackConsumer.php';
const scenarios = [
  { name: 'conditional parameter', body: '/** @param callable(bool $flag): ($flag is true ? Row : Other) $cb */ function run(callable $cb){ $v=$cb(1); $v->na§me(); }', owners: ['App\\Other', 'App\\Row'] },
  { name: 'direct invocation', body: '/** @param callable(bool $flag): ($flag is true ? Row : Other) $cb */ function run(callable $cb){ $cb(1)->na§me(); }', owners: ['App\\Other', 'App\\Row'] },
  { name: 'import alias', body: 'use Vendor\\Row as Result; /** @param callable(): Result $cb */ function run(callable $cb){ $v=$cb(); $v->na§me(); }', owners: ['Vendor\\Row'] },
  { name: 'stable parameter alias', body: '/** @param callable(): Row $cb */ function run(callable $cb){ $copy=$cb; $v=$copy(); $v->na§me(); }', owners: ['App\\Row'] },
  { name: 'local annotation', body: 'function run(){ /** @var callable(): Row $cb */ $cb=make(); $v=$cb(); $v->na§me(); }', owners: ['App\\Row'] },
  { name: 'standalone annotation', body: 'function run(){ /** @var callable(): Row $cb */ $v=$cb(); $v->na§me(); }', owners: ['App\\Row'] },
  { name: 'no input class source', body: '/** @param callable(Input $input): Row $cb */ function run(callable $cb){ $v=$cb($input); $v->na§me(); }', owners: ['App\\Row'] },
  { name: 'scalar return', body: '/** @param callable(): int $cb */ function run(callable $cb){ $v=$cb(); $v->na§me(); }', owners: [] },
  { name: 'template-only return', body: '/** @template T\n * @param callable(): T $cb */ function run(callable $cb){ $v=$cb(); $v->na§me(); }', owners: [] },
  { name: 'conditional template', body: '/** @template T\n * @param callable(bool $flag): ($flag is true ? T : Row) $cb */ function run(callable $cb){ $v=$cb(1); $v->na§me(); }', owners: ['App\\Row'] },
  { name: 'shape key is not a class', body: '/** @param callable(): array{Row: Other} $cb */ function run(callable $cb){ $v=$cb(); $v->na§me(); }', owners: ['App\\Other'] },
  { name: 'dynamic callback', body: 'function run(callable $cb){ $v=$cb(); $v->na§me(); }', owners: [] },
  { name: 'reassigned parameter', body: '/** @param callable(): Row $cb */ function run(callable $cb){ $cb=other(); $v=$cb(); $v->na§me(); }', owners: [] },
  { name: 'reference parameter', body: '/** @param callable(): Row $cb */ function run(callable &$cb){ $v=$cb(); $v->na§me(); }', owners: [] },
  { name: 'sibling parameter', body: '/** @param callable(): Row $cb */ function first(callable $cb){} function run(callable $cb){ $v=$cb(); $v->na§me(); }', owners: [] },
  { name: 'local reassignment', body: 'function run(){ /** @var callable(): Row $cb */ $cb=make(); $cb=other(); $v=$cb(); $v->na§me(); }', owners: [] },
  { name: 'comment', body: '/** @param callable(): Row $cb */ function run(callable $cb){ $v=$cb(); /* $v->na§me(); */ }', owners: [] },
  { name: 'HTML', body: '/** @param callable(): Row $cb */ function run(callable $cb){ $v=$cb(); } ?> $v->na§me();', owners: [] },
] as const;
for (const version of ['7.2', '8.5']) for (const retained of [false, true]) {
  it.each(scenarios)(`collects callback sources for $name PHP ${version} retained=${retained}`, ({ body, owners }) => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.setTargetPhpVersion(version);
      const marked = '<?php namespace App; ' + body, offset = marked.indexOf('§'), source = marked.replace('§', '');
      workspace.update(uri, source, retained);
      const revision = workspace.revision(), snapshot = workspace.snapshot(uri);
      expect(workspace.memberOwnerTypeNamesAt(uri, offset).sort()).toEqual(owners);
      expect(workspace.memberReceiverFunctionNamesAt(uri, offset)).toEqual([]);
      expect(workspace.completeMembers(uri, offset)).toEqual([]);
      expect(workspace.revision()).toBe(revision);
      expect(workspace.snapshot(uri)).toEqual(snapshot);
    } finally { workspace.dispose(); }
  });
}

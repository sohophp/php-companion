import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///template-bounds/Queries.php';
const definitions = `<?php namespace Data { class Item { public function value(): string { return 'item'; } }
class Other { public function wrong(): string { return 'other'; } } }
namespace App { use Data\\Item as Imported; use Data\\Other;
class T { public function value(): string { return 'unrelated'; } }
/** @template V */ class Box { /** @return V */ public function get() {} }
`;
const cases = [
  ['native parameter alias', '', '@template T of Imported\n * @param T $item', 'Imported $item', '$item->value()', 'Data\\Item::value'],
  ['documented parameter', '', '@template T of Imported\n * @param T $item', '$item', '$item->value()', 'Data\\Item::value'],
  ['function template', '', '@template T of Imported\n * @param T $item', '$item', '$item->value()', 'Data\\Item::value'],
  ['transitive bounds', '', '@template U of Imported\n * @template T of U\n * @param T $item', '$item', '$item->value()', 'Data\\Item::value'],
  ['class template', '@template T of Imported', '@param T $item', '$item', '$item->value()', 'Data\\Item::value'],
  ['method shadows class template', '@template T of Imported', '@template T of Other\n * @param T $item', '$item', '$item->wrong()', 'Data\\Other::wrong'],
  ['unbounded method shadows class template', '@template T of Imported', '@template T\n * @param T $item', '$item', '$item->value()', undefined],
  ['cyclic bounds do not bind the unrelated class T', '', '@template U of T\n * @template T of U\n * @param T $item', '$item', '$item->value()', undefined],
  ['missing bounds do not bind the unrelated class T', '', '@template T of Missing\n * @param T $item', '$item', '$item->value()', undefined],
  ['scalar bounds', '', '@template T of int\n * @param T $item', '$item', '$item->value()', undefined],
  ['nullable bound through nullsafe access', '', '@template T of Imported\n * @param T|null $item', '$item', '$item?->value()', 'Data\\Item::value'],
  ['nullable bound narrowed before access', '', '@template T of Imported\n * @param T|null $item', '$item', 'if ($item !== null) { $item->value(); }', 'Data\\Item::value'],
  ['generic bound retains its arguments', '', '@template T of Box<Imported>\n * @param T $item', '$item', '$item->get()', 'App\\Box::get'],
] as const;

describe('Template parameter member upper bounds', () => {
  it.each(cases.flatMap(row => [false, true].map(deferred => ({ label: row[0], row, deferred }))))('$label (deferred=$deferred)',
    ({ row, deferred }) => {
      const [_label, classDoc, methodDoc, parameter, expression, expected] = row;
      const functionOnly = _label === 'function template';
      const declaration = `/** ${methodDoc} */ ${functionOnly ? 'function inspect' : 'public static function inspect'}(${parameter}) { ${expression}; }`;
      const source = definitions + (functionOnly ? declaration : `/** ${classDoc} */ class Owner { ${declaration} }`) + '\n}';
      const workspace = new SemanticWorkspace(parser);
      try {
        if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
        const name = expression.includes('wrong(') ? 'wrong(' : expression.includes('get(') ? 'get(' : 'value(';
        const offset = source.lastIndexOf(name) + 1;
        expect(workspace.memberAt(uri, offset)?.fqcn).toBe(expected);
        expect(workspace.source(uri)).toBe(source);
      } finally { workspace.dispose(); }
    });
});

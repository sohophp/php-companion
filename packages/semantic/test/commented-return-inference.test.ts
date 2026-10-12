import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { parsePhpDocType } from '@php-companion/phpdoc';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const declarations = String.raw`<?php namespace CommentedReturn;
class Item {}
class Result { public function done(): void {} }
/** @template R
 * @param callable():R $factory
 * @return R */
function invoke(callable $factory) {}
`;
const returns = [
  { name: 'block comment', body: 'return /* explanation */ new Result();', type: 'CommentedReturn\\Result' },
  { name: 'line comment', body: 'return // explanation\n new Result();', type: 'CommentedReturn\\Result' },
  { name: 'hash comment', body: 'return # explanation\n new Result();', type: 'CommentedReturn\\Result' },
  { name: 'consecutive comments', body: 'return /* first */ /* second */ new Result();', type: 'CommentedReturn\\Result' },
  { name: 'trailing comment', body: 'return new Result() /* explanation */;', type: 'CommentedReturn\\Result' },
  { name: 'commented bare return', body: 'return /* explanation */;', type: 'null' },
  { name: 'line-commented bare return', body: 'return // explanation\n;', type: 'null' },
  { name: 'comment markers inside a string', body: 'return "/* text */ // #";', type: 'string' },
  { name: 'unknown call', body: 'return /* explanation */ missingResult();', type: undefined },
  { name: 'missing expression', body: 'return /* explanation */ new ;', type: undefined },
  { name: 'unterminated comment', body: 'return /* explanation', type: undefined },
] as const;

describe.each([false, true])('comments in return statements (deferred=%s)', deferred => {
  it.each(returns)('preserves Generator contracts: $name', row => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///CommentedGenerator.php';
    const source = declarations + `function stream(): \\Generator { yield new Item(); ${row.body} }
function query(): void { stream(); }`;
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const signature = workspace.signature(uri, source.lastIndexOf('stream(') + 'stream('.length)?.returnType;
      const type = signature && parsePhpDocType(signature).type;
      if (row.type === undefined) expect(type && type.kind === 'generic').toBe(false);
      else {
        expect(type && type.kind).toBe('generic');
        if (!type || type.kind !== 'generic') throw new Error(`Missing Generator contract: ${signature}`);
        expect(type.arguments[3]).toMatchObject({ kind: 'name', name: row.type });
      }
    } finally { workspace.dispose(); }
  });

  it.each(returns.filter(row => row.type === 'CommentedReturn\\Result' || row.type === undefined))(
    'preserves closure template navigation: $name', row => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///CommentedClosure.php';
      const source = declarations + `function query(): void {
        $result = invoke(function () { ${row.body} }); $result->done();
      }`;
      try {
        if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
        const offset = source.lastIndexOf('->done') + 2;
        expect(workspace.completeMembers(uri, offset).map(item => item.name))
          .toEqual(row.type ? ['done'] : []);
        expect(workspace.definition(uri, offset + 1).length).toBe(row.type ? 1 : 0);
      } finally { workspace.dispose(); }
    });
});

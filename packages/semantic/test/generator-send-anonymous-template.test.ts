import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const rows = [
  { name: 'bound', template: '@template T of Command', expected: ['execute'] },
  { name: 'unbound', template: '@template T', expected: [] },
  { name: 'cycle', template: '@template U of T\n * @template T of U', expected: [] },
] as const;

describe('Anonymous Generator send templates own their bounds and shadow classes', () => {
  for (const row of rows) for (const deferred of [false, true]) {
    it(`${row.name} (deferred=${deferred})`, () => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///AnonymousSendTemplate.php';
      const marked = `<?php namespace AnonymousSend;
class Item {} class Result {} class Command { public function execute(): void {} } class T { public function wrong(): void {} }
function outer(): void { $callback = /** ${row.template}\n * @return \\Generator<int, Item, T, Result> */ function(): \\Generator { $received=yield new Item(); $received->§execute(); return new Result(); }; }`;
      const offset = marked.indexOf('§'), source = marked.replace('§', '');
      try {
        workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
        if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
        expect(workspace.completeMembers(uri, offset).map(item => item.name)).toEqual(row.expected);
        expect(workspace.source(uri)).toBe(source);
      } finally { workspace.dispose(); }
    });
  }
});

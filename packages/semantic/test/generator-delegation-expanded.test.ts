import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
import { parsePhpDocType, type PhpDocType } from '@php-companion/phpdoc';
import { source } from './expanded-fixture.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const normalizeType = (type: PhpDocType): string => {
 if (type.kind === 'name') return `name:${type.name}`;
 if (type.kind === 'generic') return `generic:${normalizeType(type.base)}<${type.arguments.map(normalizeType).join(',')}>`;
 if (type.kind === 'union' || type.kind === 'intersection') return `${type.kind}:${type.types.map(normalizeType).sort().join('|')}`;
 throw new Error(`Unexpected type in a delegated result: ${type.kind}`);
};
const normalize = (value: string | undefined): string | undefined => {
 if (value === undefined) return undefined;
 const parsed = parsePhpDocType(value);
 expect(parsed.errors).toEqual([]);
 expect(parsed.consumed).toBe(value.length);
 expect(parsed.type).toBeDefined();
 return normalizeType(parsed.type!);
};
const cases = [["delegatedNoReturn", "Generator<int, App\\Item, mixed, null>"], ["delegatedComment", "Generator<int, App\\Item, mixed, App\\Result>"], ["delegatedArrayComment", "Generator<int, App\\Item, mixed, null>"], ["delegatedParenthesized", "Generator<int, App\\Item, mixed, App\\Result>"], ["delegatedNestedYield", "Generator<int, App\\Item|App\\Result, mixed, void>"], ["delegatedArrayParameter", "Generator<int, App\\Item, mixed, null>"], ["delegatedListParameter", "Generator<int, App\\Item, mixed, null>"], ["delegatedUnionParameter", "Generator<int, App\\Item, mixed, null|App\\Result>"], ["delegatedAlias", "Generator<int, App\\Item, mixed, App\\Result>"], ["delegatedInvalidCall", "\\Generator"], ["delegatedUnknownIterable", "\\Generator"], ["delegatedRecursive", "\\Generator"], ["delegatedReassigned", "\\Generator"], ["delegatedReferenceEscape", "\\Generator"]] as const;
describe('Generator delegated results across expressions and contracts', () => {
 it.each(cases.flatMap(([name, expected]) => [false, true].map(deferred => ({ name, expected, deferred }))))('$name (deferred=$deferred)', ({ name, expected, deferred }) => {
  const workspace = new SemanticWorkspace(parser); workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5')); const uri = 'file:///ExpandedDelegation.php';
  try {
   if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
   const offset = source.lastIndexOf(name + '(') + name.length + 1;
   expect(normalize(workspace.signature(uri, offset)?.returnType)).toBe(normalize(expected));
   expect(workspace.source(uri)).toBe(source);
  } finally { workspace.dispose(); }
 });
});

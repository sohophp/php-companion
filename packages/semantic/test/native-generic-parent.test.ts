import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '8.5'] as const)('retains SimpleXML iteration contracts through a native subclass at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///InheritedXml.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const inheritance of ['class CustomXml extends \\SimpleXMLElement {}', 'class BaseXml extends \\SimpleXMLElement {} class CustomXml extends BaseXml {}']) {
      const source = `<?php ${inheritance} function read(string $source): void { $xml = simplexml_load_string($source, CustomXml::class); if ($xml === false) return; foreach ($xml as $child) { $child->getN; } }`;
      workspace.update(uri, source, true);
      expect(workspace.completeMembers(uri, source.indexOf('$child->getN') + '$child->getN'.length).map(item => item.name).sort()).toEqual(['getName', 'getNamespaces']);
    }
  } finally { workspace.dispose(); }
}, 15000);
it.each([
  ['fixed parent', '/** @implements IteratorAggregate<string, Element> */ class Fixed implements IteratorAggregate { public function getIterator(): Traversable { return new ArrayIterator([]); } } class Child extends Fixed {}', true],
  ['unbound generic parent', '/** @template T\n * @implements IteratorAggregate<string, T> */ class Fixed implements IteratorAggregate { public function getIterator(): Traversable { return new ArrayIterator([]); } } class Child extends Fixed {}', false],
  ['missing hierarchy', 'class Child extends Missing { public function getIterator(): Traversable { return new ArrayIterator([]); } }', false],
  ['conflicting inherited contracts', '/** @extends IteratorAggregate<string, Element> */ interface First extends IteratorAggregate {} /** @extends IteratorAggregate<string, Other> */ interface Second extends IteratorAggregate {} class Child implements First, Second { public function getIterator(): Traversable { return new ArrayIterator([]); } }', false],
])('projects a %s without inventing missing type arguments', (_name, declarations, available) => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///InheritedCollection.php';
  try {
    workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
    const source = `<?php class Element { public function valueOnly(): void {} } class Other {} ${declarations} function read(Child $collection): void { foreach ($collection as $item) { $item->valueO; } }`;
    workspace.update(uri, source, true);
    expect(workspace.completeMembers(uri, source.indexOf('$item->valueO') + '$item->valueO'.length).map(item => item.name).includes('valueOnly')).toBe(available);
  } finally { workspace.dispose(); }
}, 15000);

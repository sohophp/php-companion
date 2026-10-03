import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it('resolves optional class-string defaults in the declaration scope and rejects unbound template names', () => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///FactoryConsumer.php';
  try {
    workspace.update('file:///Factory.php', `<?php namespace Factory;
      use Factory\\DefaultItem as Choice;
      class Base {} class DefaultItem extends Base { public function defaultOnly(): void {} }
      /** @template T of Base
       * @param class-string<T>|null $class
       * @return ($class is null ? Base : T) */
      function make(?string $class = Choice::class): Base {}`);
    const prefix = '<?php namespace Consumer; class Choice { public function wrongOnly(): void {} }';
    for (const [arguments_, expected] of [['', ['defaultOnly']], ['null', []], ['Choice::class', []]] as const) {
      const source = prefix + ` function read(): void { $item = \\Factory\\make(${arguments_}); $item->defaultO; }`;
      workspace.update(uri, source, true);
      expect(workspace.completeMembers(uri, source.indexOf('defaultO;') + 8).map(item => item.name), arguments_).toEqual(expected);
      const start = source.indexOf('\\Factory\\make(');
      expect(workspace.provenExpressionType(uri, start, source.indexOf(');', start) + 1) ?? '', arguments_).not.toMatch(/(?:^|\\)T\b/);
    }
  } finally { workspace.dispose(); }
});

it.each(['7.2', '8.5'] as const)('preserves SimpleXML factory subclass witnesses and failure branches at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///XmlFactory.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    const prefix = '<?php namespace XmlFactory; class CustomXml extends \\SimpleXMLElement { public function customOnly(): void {} } class OtherXml extends \\SimpleXMLElement { public function otherOnly(): void {} }';
    for (const [name, input, failure] of [['simplexml_load_string', '$input', 'false'], ['simplexml_load_file', '$input', 'false'], ['simplexml_import_dom', '$node', 'null']] as const) {
      const expression = `${name}(${input}, CustomXml::class)`;
      const source = prefix + ` function read(string $input, \\DOMNode $node): void { $xml = ${expression}; if ($xml === ${failure}) return; $xml->customO; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      const type = workspace.provenExpressionType(uri, start, start + expression.length);
      expect(type, name).toContain('XmlFactory\\CustomXml'); expect(type, name).toContain(failure);
      expect(workspace.completeMembers(uri, source.indexOf('customO;') + 7).map(item => item.name), name).toEqual(['customOnly']);
      const changed = source.replace('CustomXml::class', 'OtherXml::class'); workspace.update(uri, changed, true);
      expect(workspace.completeMembers(uri, changed.indexOf('customO;') + 7).map(item => item.name), name).toEqual([]);
      const unknown = source.replace('CustomXml::class', '$class').replace('string $input,', 'string $input, string $class,');
      workspace.update(uri, unknown, true);
      expect(workspace.completeMembers(uri, unknown.indexOf('customO;') + 7).map(item => item.name), name).toEqual([]);
    }
    for (const suffix of ['', ', null', ', \\SimpleXMLElement::class']) {
      const source = prefix + ` function defaults(string $input): void { $xml = simplexml_load_string($input${suffix}); if ($xml === false) return; $xml->getN; }`;
      workspace.update(uri, source, true);
      expect(workspace.completeMembers(uri, source.indexOf('getN;') + 4).map(item => item.name).sort(), suffix).toEqual(['getName', 'getNamespaces']);
    }
  } finally { workspace.dispose(); }
}, 15_000);

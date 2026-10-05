import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { BUILTIN_DOCUMENT_URI, builtinPhpExtensionStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const versions = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'] as const;
for (const retained of [true, false]) it.each(versions)('distinguishes native XMLReader invocation contracts at %s, retained=' + retained, version => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///NativeReader.php';
  try {
    workspace.update(BUILTIN_DOCUMENT_URI, '<?php\n' + builtinPhpExtensionStub(version, 'xmlreader'), retained);
    const native = workspace.snapshot(BUILTIN_DOCUMENT_URI)!.declaration;
    expect(native.callables.filter(item => item.fqcn === 'XMLReader::XML')).toHaveLength(1);
    expect(native.callables.find(item => item.fqcn === 'XMLReader::XML')?.static).toBe(!version.startsWith('7.'));
    for (const receiver of ['XMLReader', 'ChildReader']) for (const method of ['XML', 'open']) {
      const source = `<?php class ChildReader extends XMLReader {} function run(string $source) {
        $reader = new ${receiver}(); $result = $reader->${method}($source);
        $factory = ${receiver}::${method}($source); if ($factory === false) return;
        $factory->localName; $result->read();
      }`;
      workspace.update(uri, source, retained);
      const instance = `$reader->${method}(`, factory = `${receiver}::${method}(`;
      expect(workspace.signature(uri, source.indexOf(instance) + instance.length)?.returnType).toBe('bool');
      expect(workspace.signature(uri, source.indexOf(factory) + factory.length)?.returnType).toBe('XMLReader|false');
      expect(workspace.definition(uri, source.indexOf('localName') + 2)).toMatchObject([{ uri: BUILTIN_DOCUMENT_URI }]);
      expect(workspace.completeMembers(uri, source.indexOf('$result->read') + '$result->re'.length)).toEqual([]);
      for (const access of ['$reader->', `${receiver}::`]) {
        const marked = `<?php class ChildReader extends XMLReader {} function run(${receiver} $reader){${access}${method.slice(0, 1)}§;}`;
        workspace.update(uri, marked.replace('§', ''), retained);
        const matches = workspace.completeMembers(uri, marked.indexOf('§')).filter(item => item.name === method);
        expect(matches).toHaveLength(1);
        expect(matches[0]?.returnType).toBe(access === '$reader->' ? 'bool' : 'XMLReader|false');
      }
    }
    expect(workspace.snapshot(BUILTIN_DOCUMENT_URI)!.declaration).toEqual(native);
    workspace.remove(BUILTIN_DOCUMENT_URI);
    const absent = '<?php function run(XMLReader $reader){$reader->X;}';
    workspace.update(uri, absent, retained);
    expect(workspace.completeMembers(uri, absent.indexOf('$reader->X') + '$reader->X'.length)).toEqual([]);
  } finally { workspace.dispose(); }
});

it('preserves user methods and overriding declaration identities', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///UserReader.php';
  try {
    const user = '<?php class XMLReader {public function XML($source):string{return "user";}} function run(XMLReader $reader){$reader->XML("text");}';
    workspace.update(uri, user);
    expect(workspace.signature(uri, user.lastIndexOf('XML(') + 'XML('.length)?.returnType).toBe('string');
    workspace.remove(uri);
    workspace.update(BUILTIN_DOCUMENT_URI, '<?php\n' + builtinPhpExtensionStub('8.5', 'xmlreader'));
    const override = '<?php class UserReader extends XMLReader {public static function XML(string $source, ?string $encoding=null, int $flags=0):int{return 1;}} UserReader::XML("text");';
    workspace.update(uri, override);
    expect(workspace.signature(uri, override.lastIndexOf('XML(') + 'XML('.length)?.returnType).toBe('int');
    expect(workspace.definition(uri, override.lastIndexOf('XML(') + 1)).toMatchObject([{ uri }]);
  } finally { workspace.dispose(); }
});

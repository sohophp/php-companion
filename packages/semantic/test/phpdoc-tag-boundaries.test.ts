import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const definitionsUri = 'file:///TagDefinitions.php';
const callerUri = 'file:///TagCaller.php';
function fixture(kind: 'property' | 'function' | 'method', dialect: string, type = 'Row'): { definitions: string; caller: string } {
  const prefix = '<?php class Row { public function name(): string {} } class Other { public function otherOnly(): void {} } ';
  const tag = kind === 'property' ? 'var' : 'return';
  const doc = `/**\n * @${tag} ${type}\n * @${dialect}${tag}-extra metadata\n */`;
  return {
    definitions: prefix + (kind === 'property' ? `class Api { ${doc} public $row; }`
      : kind === 'method' ? `class Api { ${doc} public function read() {} }` : `${doc} function rows() {}`),
    caller: '<?php function run(Api $api): void { '
      + (kind === 'property' ? '$api->row' : kind === 'method' ? '$api->read()' : 'rows()') + '->name(); }',
  };
}

for (const retained of [true, false]) {
  for (const dialect of ['', 'phpstan-', 'psalm-']) {
    it.each(['property', 'function', 'method'] as const)(
      `preserves the documented %s type with unsupported ${dialect} tags, retained=${retained}`, kind => {
        const workspace = new SemanticWorkspace(parser);
        try {
          const { definitions, caller } = fixture(kind, dialect);
          workspace.update(definitionsUri, definitions, retained); workspace.update(callerUri, caller, retained);
          const offset = caller.indexOf('->name') + '->na'.length;
          expect(workspace.completeMembers(callerUri, offset).map(item => item.name)).toEqual(['name']);
          const start = definitions.indexOf('name():');
          expect(workspace.definition(callerUri, offset).map(({ uri, start, end }) => ({ uri, start, end })))
            .toEqual([{ uri: definitionsUri, start, end: start + 4 }]);
          const snapshot = workspace.snapshot(definitionsUri), revision = workspace.revision();
          expect(workspace.completeMembers(callerUri, offset).map(item => item.name)).toEqual(['name']);
          expect(workspace.snapshot(definitionsUri)).toEqual(snapshot); expect(workspace.revision()).toBe(revision);
          workspace.update(definitionsUri, fixture(kind, dialect, 'Other').definitions, retained);
          expect(workspace.completeMembers(callerUri, offset).map(item => item.name)).toEqual([]);
          expect(workspace.definition(callerUri, offset)).toEqual([]);
          workspace.update(definitionsUri, definitions, retained);
          expect(workspace.completeMembers(callerUri, offset).map(item => item.name)).toEqual(['name']);
        } finally { workspace.dispose(); }
      });
  }
}

it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)(
  'preserves full tag boundaries after %s and rejects previous derived formats', mode => {
    const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
    try {
      const { definitions, caller } = fixture('property', 'phpstan-');
      donor.update(definitionsUri, definitions);
      const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(definitionsUri)!
        : donor.snapshot(definitionsUri)!;
      expect(workspace[mode](JSON.parse(JSON.stringify(snapshot)), definitionsUri)).toBe(true);
      workspace.update(callerUri, caller);
      const offset = caller.indexOf('->name') + '->na'.length;
      expect(workspace.completeMembers(callerUri, offset).map(item => item.name)).toEqual(['name']);
      expect(workspace[mode]({ ...snapshot, schema: mode === 'restoreSourceDeclaration' ? 5 : 87 }, definitionsUri)).toBe(false);
      expect(workspace.completeMembers(callerUri, offset).map(item => item.name)).toEqual(['name']);
    } finally { workspace.dispose(); donor.dispose(); }
  });

for (const retained of [true, false]) {
  it.each([
    ['assignment', 'function run(){ $value=rows(); $value->§name(); }', ['rows']],
    ['direct call', 'function run(){ rows()->§name(); }', ['rows']],
    ['function alias', 'use function Vendor\\rows as fetch; function run(){ $value=fetch(); $value->§name(); }', ['Vendor\\rows']],
    ['namespace call', 'namespace App; function run(){ $value=namespace\\rows(); $value->§name(); }', ['App\\rows']],
    ['dynamic callable', 'function run($factory){ $value=$factory(); $value->§name(); }', []],
    ['sibling scope', 'function first(){ $value=rows(); } function second($value){ $value->§name(); }', []],
  ] as const)(`finds %s function dependencies without proving a return value, retained=${retained}`, (_name, body, expected) => {
    const workspace = new SemanticWorkspace(parser);
    try {
      const source = `<?php ${body}`; const offset = source.indexOf('§');
      workspace.update(callerUri, source.replace('§', ''), retained);
      const revision = workspace.revision(), snapshot = workspace.snapshot(callerUri);
      expect(workspace.memberReceiverFunctionNamesAt(callerUri, offset)).toEqual(expected);
      expect(workspace.completeMembers(callerUri, offset)).toEqual([]);
      expect(workspace.definition(callerUri, offset)).toEqual([]);
      expect(workspace.revision()).toBe(revision); expect(workspace.snapshot(callerUri)).toEqual(snapshot);
    } finally { workspace.dispose(); }
  });
}

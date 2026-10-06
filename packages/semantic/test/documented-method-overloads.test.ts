import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

type Form = 'assigned' | 'direct' | 'static-assigned' | 'static-direct' | 'dynamic' | 'named' | 'nullsafe';
const versions = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];
const inputs = [
  { input: '42', members: ['common', 'intOnly'], owners: ['IntResult'] },
  { input: '42.', members: ['common', 'floatOnly'], owners: ['FloatResult'] },
  { input: '.5', members: ['common', 'floatOnly'], owners: ['FloatResult'] },
  { input: '4.2e1', members: ['common', 'floatOnly'], owners: ['FloatResult'] },
  { input: "'bad'", members: [], owners: [] },
  { input: '$argument', members: ['common'], owners: ['FloatResult', 'IntResult'] },
];
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

function commonDefinitions(source: string, uri: string, owners: string[], member = 'common'): Array<{ uri: string; start: number; end: number }> {
  return owners.map(owner => {
    const start = source.indexOf(`function ${member}(`, source.indexOf(`class ${owner}{`)) + 'function '.length;
    return { uri, start, end: start + member.length };
  }).sort((a, b) => a.start - b.start);
}
function definitionLocations(workspace: SemanticWorkspace, uri: string, offset: number): Array<{ uri: string; start: number; end: number }> {
  return workspace.definition(uri, offset).map(({ uri: targetUri, start, end }) => ({ uri: targetUri, start, end })).sort((a, b) => a.start - b.start);
}

function declarations(staticMethod = false, reverse = false): string {
  const tags = [`${staticMethod ? 'static ' : ''}IntResult pick(int $value)`, `${staticMethod ? 'static ' : ''}FloatResult pick(float $value)`];
  if (reverse) tags.reverse();
  return 'class IntResult{function intOnly(){}function common(){}}class FloatResult{function floatOnly(){}function common(){}}'
    + `/** @method ${tags[0]}\n * @method ${tags[1]} */class Factory{}`;
}

for (const version of versions) {
  const forms: Form[] = ['assigned', 'direct', 'static-assigned', 'static-direct', 'dynamic'];
  if (Number(version) >= 8) forms.push('named', 'nullsafe');
  for (const form of forms) for (const row of inputs) for (const strict of [false, true]) for (const retained of [true, false]) {
    it(`documents overload ${version} ${form} ${row.input} strict=${strict} retained=${retained}`, () => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///OverloadConsumers.php';
      try {
        const input = form === 'named' ? `value:${row.input}` : row.input;
        const expression = form.startsWith('static') ? `Factory::pick(${input})` : form === 'dynamic' ? `$factory->{'pick'}(${input})`
          : form === 'nullsafe' ? `$factory?->pick(${input})` : `$factory->pick(${input})`;
        const call = form.endsWith('direct') ? `${expression}->common();` : `$v=${expression};$v${form === 'nullsafe' ? '?->' : '->'}common();`;
        // Keep the nine target models syntactically valid, including PHP 7.2.
        const source = `<?php declare(strict_types=${Number(strict)});${declarations(form.startsWith('static'))}`
          + `/** @param int|float $argument */function run(${form === 'nullsafe' ? '?' : ''}Factory $factory,$argument){${call}}`;
        workspace.setTargetPhpVersion(version); workspace.update(uri, source, retained);
        const access = source.lastIndexOf('->') + 2;
        expect(workspace.completeMembers(uri, access).map(item => item.name).sort()).toEqual(row.members);
        expect(definitionLocations(workspace, uri, access + 2)).toEqual(commonDefinitions(source, uri, row.owners));
        if (form !== 'dynamic' && row.owners.length) {
          const callEnd = source.indexOf(`pick(${input})`) + 5 + input.length;
          expect(workspace.signatures(uri, callEnd).map(item => item.returnType).sort()).toEqual(row.owners);
        }
        if (!form.endsWith('direct') && row.owners.length) {
          const value = workspace.variableValueAt(uri, source.lastIndexOf('$v') + 1)?.type;
          for (const owner of row.owners) expect(value).toContain(owner);
          for (const owner of ['IntResult', 'FloatResult'].filter(name => !row.owners.includes(name))) expect(value).not.toContain(owner);
        }
      } finally { workspace.dispose(); }
    });
  }
}

for (const retained of [true, false]) for (const reverse of [false, true]) {
  it(`refreshes documented returns after unsaved argument edits retained=${retained} reverse=${reverse}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///OverloadEdits.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      for (const row of [inputs[0]!, inputs[1]!, inputs[4]!, inputs[5]!, inputs[0]!]) {
        const source = `<?php ${declarations(false, reverse)}/** @param int|float $argument */function run(Factory $factory,$argument){$v=$factory->pick(${row.input});$v->common();}`;
        workspace.update(uri, source, retained);
        const access = source.lastIndexOf('->') + 2;
        expect(workspace.completeMembers(uri, access).map(item => item.name).sort()).toEqual(row.members);
        expect(definitionLocations(workspace, uri, access + 2)).toEqual(commonDefinitions(source, uri, row.owners));
      }
    } finally { workspace.dispose(); }
  });
  it(`refreshes overloaded declarations without choosing their first tag retained=${retained} reverse=${reverse}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///OverloadDeclarationEdits.php';
    try {
      for (const order of [reverse, !reverse, reverse]) {
        const source = `<?php ${declarations(false, order)}function run(Factory $factory){$v=$factory->pick(42.);$v->floatOnly();}`;
        workspace.update(uri, source, retained);
        expect(workspace.completeMembers(uri, source.lastIndexOf('->') + 2).map(item => item.name).sort()).toEqual(['common', 'floatOnly']);
        expect(definitionLocations(workspace, uri, source.lastIndexOf('->') + 4)).toEqual(commonDefinitions(source, uri, ['FloatResult'], 'floatOnly'));
      }
    } finally { workspace.dispose(); }
  });
}

for (const retained of [true, false]) {
  it(`keeps a native method ahead of magic documentation retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///NativePrecedence.php';
    try {
      const source = '<?php class NativeResult{function nativeOnly(){}}class DocumentedResult{function docOnly(){}}'
        + '/** @method DocumentedResult pick(float $value) */class Factory{function pick(float $value):NativeResult{return new NativeResult();}}'
        + 'function run(Factory $factory){$v=$factory->pick(42.);$v->nativeOnly();}';
      workspace.update(uri, source, retained);
      expect(workspace.completeMembers(uri, source.lastIndexOf('->') + 2).map(item => item.name)).toEqual(['nativeOnly']);
      expect(definitionLocations(workspace, uri, source.lastIndexOf('->') + 4)).toEqual(commonDefinitions(source, uri, ['NativeResult'], 'nativeOnly'));
    } finally { workspace.dispose(); }
  });
  it(`inherits overloads and retains both possible returns for mixed inputs retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///InheritedOverloads.php';
    try {
      for (const input of ['42.', '$argument']) {
        const source = `<?php ${declarations()}class Child extends Factory{}function run(Child $factory,$argument){$v=$factory->pick(${input});$v->common();}`;
        workspace.update(uri, source, retained);
        expect(workspace.completeMembers(uri, source.lastIndexOf('->') + 2).map(item => item.name).sort())
          .toEqual(input === '42.' ? ['common', 'floatOnly'] : ['common']);
      }
    } finally { workspace.dispose(); }
  });
  it(`bounds union combinations without inventing an exclusive result retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///OverloadBudget.php';
    try {
      const parameters = Array.from({ length: 7 }, (_, index) => `$v${index}`);
      const tags = ['int', 'float'].map(type => `@method ${type === 'int' ? 'IntResult' : 'FloatResult'} pick(${parameters.map(name => `${type} ${name}`).join(',')})`);
      const source = '<?php class IntResult{function intOnly(){}function common(){}}class FloatResult{function floatOnly(){}function common(){}}'
        + `/** ${tags[0]}\n * ${tags[1]} */class Factory{}/** ${parameters.map(name => `@param int|float ${name}`).join('\n * ')} */`
        + `function run(Factory $factory,${parameters.join(',')}){$v=$factory->pick(${parameters.join(',')});$v->common();}`;
      workspace.update(uri, source, retained);
      expect(workspace.completeMembers(uri, source.lastIndexOf('->') + 2).map(item => item.name)).toEqual(['common']);
      expect(workspace.definition(uri, source.lastIndexOf('->') + 4)).toHaveLength(2);
    } finally { workspace.dispose(); }
  });
}

for (const retained of [true, false]) for (const staticMethod of [false, true]) {
  it(`requests unloaded PHPDoc return branches static=${staticMethod} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ColdOverloads.php';
    try {
      const factory = '<?php namespace App;/** @method '+(staticMethod ? 'static ' : '')+'IntResult pick(int $value)\n * @method '
        +(staticMethod ? 'static ' : '')+'FloatResult pick(float $value) */class Factory{}';
      workspace.update('file:///src/Factory.php', factory, retained);
      const source = '<?php use App\\Factory;function run(Factory $factory){$v='+(staticMethod ? 'Factory::pick(42.)' : '$factory->pick(42.)')+';$v->common();}';
      workspace.update(uri, source, retained);
      const access = source.lastIndexOf('->') + 2;
      expect(workspace.completeMembers(uri, access)).toEqual([]);
      expect(workspace.memberOwnerTypeNamesAt(uri, access)).toEqual(expect.arrayContaining(['App\\IntResult', 'App\\FloatResult']));
      workspace.update('file:///src/IntResult.php', '<?php namespace App;class IntResult{function intOnly(){}function common(){}}', retained);
      workspace.update('file:///src/FloatResult.php', '<?php namespace App;class FloatResult{function floatOnly(){}function common(){}}', retained);
      expect(workspace.completeMembers(uri, access).map(item => item.name).sort()).toEqual(['common', 'floatOnly']);
      expect(definitionLocations(workspace, uri, access + 2)).toEqual(commonDefinitions('<?php namespace App;class FloatResult{function floatOnly(){}function common(){}}', 'file:///src/FloatResult.php', ['FloatResult']));
    } finally { workspace.dispose(); }
  });
}

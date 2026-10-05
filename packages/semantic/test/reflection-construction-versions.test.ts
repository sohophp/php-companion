import { afterAll, beforeAll, expect, it } from 'vitest';
import { builtinDocumentUri, builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '@php-companion/language-spec';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(SUPPORTED_PHP_VERSIONS)('keeps PHP %s Reflection construction and references distinct', version => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///ReflectionConstruction.php';
  const target = Number(version.replace('.', ''));
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    const cases = [
      ['ReflectionType', true, target < 80],
      ['ReflectionNamedType', true, true],
      ['ReflectionUnionType', target >= 80, target >= 80],
      ['ReflectionIntersectionType', target >= 81, target >= 81],
      ['ReflectionAttribute', target >= 80, false],
      ['ReflectionReference', target >= 74, false],
    ] as const;
    for (const [name, present, constructible] of cases) {
      for (const marked of [`<?php new \\${name}§;`, `<?php new /*🙂 construction*/ \\${name}§;`,
        `<?php use ${name} as Selected; new Sele§;`, `<?php new \\${name}§();`]) {
        workspace.update(uri, marked.replace('§', ''), true);
        expect(workspace.completeTypes(uri, marked.indexOf('§')).some(item => item.fqcn === name), marked).toBe(constructible);
        if (name === 'ReflectionType' && marked.endsWith('§();')) {
          expect(workspace.invalidInstantiations(uri).map(item => item.reason)).toEqual(target < 80 ? [] : ['abstract-class']);
        }
      }
      for (const marked of [`<?php function accepts(\\${name}§ $value):void{}`,
        `<?php function returns():\\${name}§{}`, `<?php use ${name}§;`,
        `<?php $value instanceof \\${name}§;`]) {
        workspace.update(uri, marked.replace('§', ''), true);
        expect(workspace.completeTypes(uri, marked.indexOf('§')).some(item => item.fqcn === name), marked).toBe(present);
      }
    }
    const marked = '<?php namespace Consumer; class ReflectionType {} new ReflectionTy§;';
    workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.fqcn)).toContain('Consumer\\ReflectionType');
  } finally { workspace.dispose(); }
});

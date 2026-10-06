import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { unsupportedSyntax, type SupportedPhpVersion } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const version of ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'] as SupportedPhpVersion[]) {
  for (const [expression, modern] of [
    ["clone($value,['mode'=>'42 '])", true],
    ['clone(new Value(),["mode"=>max(1,2)])', true],
    ['clone($value,$updates)', true],
    ['clone($value,)', true],
    ['clone($value)', false],
    ['clone $value', false],
    ['_lone($value,[])', false],
  ] as const) {
    it(`diagnoses intrinsic clone version ${version} ${expression}`, () => {
      const source = `<?php $copy=${expression};`, tree = parser.parseTree(source);
      try {
        const features = unsupportedSyntax(tree.rootNode, version, source).filter(item => item.feature === 'clone with properties');
        expect(features).toHaveLength(modern && version !== '8.5' ? 1 : 0);
        if (features.length) expect(source.slice(features[0]!.start, features[0]!.end)).toBe(expression);
      } finally { tree.delete(); }
    });
  }
}

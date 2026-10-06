import { afterAll, beforeAll, expect, it } from 'vitest';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = [
 ['procedural boolean', "intltz_get_canonical_id('UTC',$v);useValue($v§);", 'bool'],
 ['static boolean', "IntlTimeZone::getCanonicalID('UTC',$v);useValue($v§);", 'bool'],
 ['procedural raw offset', "intltz_get_offset($zone,0.0,false,$v,$dst);useValue($v§);", 'int'],
 ['procedural dst offset', "intltz_get_offset($zone,0.0,false,$raw,$v);useValue($v§);", 'int'],
 ['instance raw offset', "$zone->getOffset(0.0,false,$v,$dst);useValue($v§);", 'int'],
 ['instance dst offset', "$zone->getOffset(0.0,false,$raw,$v);useValue($v§);", 'int'],
 ['filter inline consumed', "$filter->filter($in,$out,$v,false);useValue($v§);", 'int'],
 ['invalid duplicate target', "intltz_get_offset($zone,0.0,false,$v,$v);useValue($v§);", undefined],
 ['output not guaranteed', "if($flag){intltz_get_canonical_id('UTC',$v);}useValue($v§);", undefined],
 ['unknown subsequent mutation', "intltz_get_canonical_id('UTC',$v);unknown($v);useValue($v§);", undefined],
] as const;
for (const version of ['7.2', '8.5'] as const) for (const retained of [true, false]) {
 it(`uses audited builtin output contracts at PHP ${version}, retained=${retained}`, () => {
  const w = new SemanticWorkspace(parser);
  try {
   w.update(builtinDocumentUri(version), builtinPhpStub(version), retained);
   for (const [name, marked, expected] of cases) {
    const uri = 'file:///BuiltinOutputs.php';
    const text = `<?php function run(IntlTimeZone $zone,php_user_filter $filter,$in,$out,$flag){${marked}}`;
    w.update(uri, text.replace('§', ''), retained);
    const value = w.variableValueAt(uri, text.indexOf('§') - 1);
    expect(value?.type, name).toBe(expected);
   }
  } finally { w.dispose(); }
 });
}

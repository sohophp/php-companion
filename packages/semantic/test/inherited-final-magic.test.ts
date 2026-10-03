import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = [
 ['public constructor','class Base { final public function __construct(){} } class Child extends Base { public function __§(){} }',[{name:'__construct',visibility:'public'}]],
 ['private constructor','class Base { final private function __construct(){} } class Child extends Base { public function __§(){} }',[{name:'__construct',visibility:'private'}]],
 ['private invoke','class Base { final private function __invoke(){} } class Child extends Base { public function __§(){} }',[{name:'__invoke',visibility:'private'}]],
 ['nonfinal constructor','class Base { public function __construct(){} } class Child extends Base { public function __§(){} }',[]],
 ['own trait final','trait Methods { final public function __construct(){} } class Child { use Methods; public function __§(){} }',[]],
 ['parent trait final','trait Methods { final public function __construct(){} } class Base { use Methods; } class Child extends Base { public function __§(){} }',[{name:'__construct',visibility:'public'}]],
 ['parent override trait','trait Methods { final public function __construct(){} } class Base { use Methods; public function __construct(){} } class Child extends Base { public function __§(){} }',[]],
 ['grandparent','class Base { final public function __construct(){} } class Middle extends Base {} class Child extends Middle { public function __§(){} }',[{name:'__construct',visibility:'public'}]],
 ['mixin','class Other { final public function __invoke(){} } /** @mixin Other */ class Base {} class Child extends Base { public function __§(){} }',[]],
 ['unknown parent','class Child extends Unknown { public function __§(){} }',[]],
 ['duplicate parent','class Base { final public function __invoke(){} } class Base {} class Child extends Base { public function __§(){} }',[]],
 ['namespace alias','namespace Types { class Base { final public function __construct(){} } } namespace Consumer { use Types\\Base as Imported; class Child extends Imported { public function __§(){} } }',[{name:'__construct',visibility:'public'}]],
];

it.each(cases)('records inherited final magic methods for %s', (_name, marked, expected) => {
 const workspace = new SemanticWorkspace(parser); const uri = 'file:///Magic.php';
 try {
  workspace.update(uri, '<?php ' + (marked as string).replace('§', ''), true);
  expect(workspace.phpDeclarationNameCompletionContext(uri, 6 + (marked as string).indexOf('§'))?.inheritedFinalMethods ?? []).toEqual(expected);
 } finally { workspace.dispose(); }
});

const traitCases = [
 ['final alias','trait Methods { public function seed(){} } class Base { use Methods { seed as final __construct; } } class Child extends Base { public function __§(){} }',['__construct']],
 ['final no alias','trait Methods { public function __construct(){} } class Base { use Methods { __construct as final; } } class Child extends Base { public function __§(){} }',['__construct']],
 ['final invoke alias','trait Methods { public function seed(){} } class Base { use Methods { seed as final __invoke; } } class Child extends Base { public function __§(){} }',['__invoke']],
 ['own final alias','trait Methods { public function seed(){} } class Child { use Methods { seed as final __construct; } public function __§(){} }',[]],
 ['own overrides final trait alias','trait Methods { public function seed(){} } class Base { use Methods { seed as final __construct; } public function __construct(){} } class Child extends Base { public function __§(){} }',[]],
 ['nonfinal alias','trait Methods { public function seed(){} } class Base { use Methods { seed as __construct; } } class Child extends Base { public function __§(){} }',[]],
];
it.each(traitCases)('records inherited final trait aliases for %s', (_name, marked, expected) => {
 const workspace = new SemanticWorkspace(parser); const uri = 'file:///Magic.php';
 try {
  workspace.update(uri, '<?php ' + (marked as string).replace('§', ''), true);
  expect((workspace.phpDeclarationNameCompletionContext(uri, 6 + (marked as string).indexOf('§'))?.inheritedFinalMethods ?? []).map(item => item.name)).toEqual(expected);
 } finally { workspace.dispose(); }
});

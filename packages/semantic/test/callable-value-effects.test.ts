import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) it.each([
  ['$call=function(&$item){$item=42;};$call($value);', undefined],
  ['$call=function($item){};$call($value);', 'string'],
  ['$call=function(&$item){$item=42;};$alias=$call;$alias($value);', undefined],
  ['$call=function($item){};$alias=$call;$alias($value);', 'string'],
  ['$call=fn(&$item)=>$item=42;$call($value);', undefined],
  ['$call=function($unused,&$item){};$call(item:$value,unused:1);', undefined],
  ['$call=function(&...$items){};$call(1,$value);', undefined],
  ['$call=function($item,&$output=null){};$call($value);', 'string'],
  ['$call=function($item,&$output){};$call($value,$other);', 'string'],
  ['$call=unknown();$call($value);', undefined],
  ['$call=unknown();$call($other);', 'string'],
  ['$call=function(&$item){$item=42;};$call($value);$value="fresh";', 'string'],
  ['$call=function()use(&$value){$value=42;};$call();', undefined],
  ['$call=function()use(&$value){$value=42;};$alias=$call;$alias();', undefined],
  ['$call=function($item)use(&$value){$value=42;};$call($value);', undefined],
  ['$call=function()use(&$value){$value=42;};', 'string'],
  ['$call=function()use($value){$value=42;};$call();', 'string'],
  ['$call=function()use(&$value){$value=42;};$alias=$call(...);', 'string'],
  ['$call=function()use(&$value){$value=42;};$alias=$call(...);$alias();', undefined],
] as const)(`tracks reference effects of callable bindings without inferring their return, retained=${retained}: %s`, (body, type) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///CallableEffects.php';
  try {
    workspace.update('php-companion-builtin:callable-effects', '<?php function is_string($value):bool{}');
    const marked = '<?php declare(strict_types=1); function send(int $value):void{} '
      + `function run(?string $value,$other){if(is_string($value)){${body}send(§$value);}}`;
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    const snapshot = workspace.snapshot(uri), revision = workspace.revision();
    expect(workspace.completionVariableDetail(uri, offset, '$value')).toBe(type ? `$value: ${type}` : undefined);
    expect(workspace.variableValueAt(uri, offset)?.type).toBe(type);
    expect(workspace.provenExpressionType(uri, offset, offset + 6)).toBe(type);
    expect(workspace.incompatibleArguments(uri).filter(item => item.start === offset)).toHaveLength(type ? 1 : 0);
    expect(workspace.snapshot(uri)).toEqual(snapshot); expect(workspace.revision()).toBe(revision);
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) {
  it.each(['object', 'instance-array', 'static-array', 'first-class'] as const)(
    `uses declared reference modifiers for other callable forms, retained=${retained}: %s`, kind => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///DeclaredCallableEffects.php';
      try {
        workspace.update('php-companion-builtin:callable-effects', '<?php function is_string($value):bool{}');
        for (const reference of [false, true]) {
          const parameter = `${reference ? '&' : ''}$item`;
          const setup = kind === 'object' ? '$call=$handler;' : kind === 'instance-array' ? '$call=[$handler,"change"];'
            : kind === 'static-array' ? '$call=[Handler::class,"changeStatic"];' : '$call=Handler::changeStatic(...);';
          const marked = `<?php declare(strict_types=1); class Handler{public function __invoke(${parameter}):void{} `
            + `public function change(${parameter}):void{} public static function changeStatic(${parameter}):void{}} `
            + `function send(int $value):void{} function run(Handler $handler,?string $value){if(is_string($value)){${setup}$call($value);send(§$value);}}`;
          const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
          expect(workspace.completionVariableDetail(uri, offset, '$value')).toBe(reference ? undefined : '$value: string');
          expect(workspace.variableValueAt(uri, offset)?.type).toBe(reference ? undefined : 'string');
          expect(workspace.incompatibleArguments(uri).filter(item => item.start === offset)).toHaveLength(reference ? 0 : 1);
        }
      } finally { workspace.dispose(); }
    });
  it(`withdraws and restores cached callable effects after unsaved parameter changes, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ChangingCallableEffects.php';
    try {
      workspace.update('php-companion-builtin:callable-effects', '<?php function is_string($value):bool{}');
      for (const reference of [false, true, false]) {
        const marked = '<?php declare(strict_types=1); function send(int $value):void{} function run(?string $value){'
          + `if(is_string($value)){$call=function(${reference ? '&' : ''}$item){};$call($value);send(§$value);}}`;
        const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completionVariableDetail(uri, offset, '$value')).toBe(reference ? undefined : '$value: string');
        expect(workspace.variableValueAt(uri, offset)?.type).toBe(reference ? undefined : 'string');
        expect(workspace.incompatibleArguments(uri)).toHaveLength(reference ? 0 : 1);
      }
    } finally { workspace.dispose(); }
  });
  it(`does not navigate old object members after a reference closure call, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ObjectCallableEffects.php';
    try {
      for (const reference of [false, true]) {
        const marked = '<?php class First{public function firstOnly():void{}} class Second{public function secondOnly():void{}} '
          + `function run(First $value){$call=function(${reference ? '&' : ''}$item){$item=new Second();};$call($value);$value->§;}`;
        const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completeMembers(uri, offset).map(item => item.name)).toEqual(reference ? [] : ['firstOnly']);
      }
    } finally { workspace.dispose(); }
  });
}

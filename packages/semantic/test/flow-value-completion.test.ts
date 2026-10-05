import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const retained of [true, false]) it.each([
  ['?string $offerA', 'if($offerA!==null)', 'string'],
  ['?string $offerA', 'if($offerA===null)return; if(true)', 'string'],
  ['$offerA', 'if(is_string($offerA))', 'string'],
  ['bool $offerA', 'if($offerA===true)', 'true'],
] as const)(`uses current guard facts in blank and prefixed values, retained=${retained}: %s %s`, (parameter, guard, detail) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///FlowValues.php';
  try {
    for (const blank of [false, true]) {
      workspace.update('php-companion-builtin:flow-values', '<?php function is_string($value):bool{}');
      const marked = `<?php function send(${detail === 'true' ? 'bool' : 'string'} $value):void{} function run(${parameter},int $offerZ){${guard}{send(${blank ? '' : '$offer'}§);}}`;
      const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      const snapshot = workspace.snapshot(uri), revision = workspace.revision();
      expect(workspace.completionVariableDetail(uri, offset, '$offerA')).toBe(`$offerA: ${detail}`);
      if (blank) expect(workspace.completeBareExpressionVariables(uri, offset)?.find(item => item.name === '$offerA')).toEqual({name:'$offerA',compatibilityRank:0});
      else expect(workspace.completeVariables(uri, offset)?.names[0]).toBe('$offerA');
      expect(workspace.snapshot(uri)).toEqual(snapshot); expect(workspace.revision()).toBe(revision);
    }
  } finally { workspace.dispose(); }
});
for (const retained of [true, false]) it.each([
  ['<?php namespace Business; function is_string($value):bool{return true;} namespace App; use function Business\\is_string; function send(string $value):void{} function run(?string $offerA,string $offerZ){if(is_string($offerA)){send($offer§);}}', '$offerA: null|string'],
  ['<?php function send(string $value):void{} function mutate(&$value):void{} function run(?string $offerA,string $offerZ){if($offerA!==null){mutate($offerA);send($offer§);}}', undefined],
] as const)(`does not infer builtin predicates or stable reference values without proof, retained=${retained}: %s`, (marked, detail) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///AdversarialFlowValues.php';
  try {
    const offset = marked.indexOf('§'); workspace.update(uri,marked.replace('§',''),retained);
    expect(workspace.completeVariables(uri,offset)?.names).toEqual(['$offerZ','$offerA']);
    expect(workspace.completionVariableDetail(uri,offset,'$offerA')).toBe(detail);
  } finally {workspace.dispose();}
});
for (const retained of [true, false]) it.each([
  ['if($offerA!==null){$offerA=null;send(§);}', 'null', 2],
  ['if(is_string($offerA)){unknown($offerA);send(§);}', undefined, 1],
  ['if(is_string($offerA)){unknown(value:$offerA);send(§);}', undefined, 1],
  ['if($offerA!==null){}send(§);', 'null|string', 2],
] as const)(`does not preserve an invalidated or exited guard, retained=${retained}: %s`, (body, detail, rank) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///InvalidatedFlowValues.php';
  try {
    const marked = `<?php function send(string $value):void{} function run(?string $offerA,int $offerZ){${body}}`;
    const offset = marked.indexOf('§');workspace.update(uri,marked.replace('§',''),retained);
    expect(workspace.completionVariableDetail(uri,offset,'$offerA')).toBe(detail ? `$offerA: ${detail}` : undefined);
    expect(workspace.completeBareExpressionVariables(uri,offset)?.find(item=>item.name==='$offerA')?.compatibilityRank).toBe(rank);
  } finally {workspace.dispose();}
});

import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = `<?php /** @param array{enabled:bool,nested:array{enabled:bool}} $config */ function send(array $config):void{}
function pickA():string{return 'x';} function pickZ():bool{return true;} function inner(string $value):bool{return true;}`;
for (const retained of [false,true]) for (const mixed of [false,true]) {
 it.each([
  ["send(['enabled'=>tr§", ['true']],
  ["send(['enabled'=> /* value */ tr§", ['true']],
  ["send(['nested'=>['enabled'=>tr§", ['true']],
  ["send(config:['enabled'=>tr§", ['true']],
  ["send(['enabled'=>(tr§", ['true']],
  ["send(['enabled'=>!tr§", []],
  ["send(['enabled'=>inner(tr§", []],
  ["send(['missing'=>tr§", []],
 ] as const)(`restores unclosed field values retained=${retained}, mixed=${mixed}: %s`, (tail,expected) => {
  const workspace = new SemanticWorkspace(parser), uri='file:///UnclosedShape.php', marked=header.replace('<?php ',mixed ? '<?php ?><main>{[(</main><?php ' : '<?php ')+tail;
  try {
   workspace.update(uri,marked.replace('§',''),retained);
   const revision=workspace.revision(), snapshot=JSON.stringify(workspace.snapshot(uri));
   expect(workspace.completeExpectedValues(uri,marked.indexOf('§')).map(item=>item.label)).toEqual(expected);
   if (expected.length) expect(workspace.phpKeywordCompletionContext(uri,marked.indexOf('§'))?.kind).toBe('expression');
   expect(workspace.revision()).toBe(revision);expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
  } finally {workspace.dispose();}
 });
 it.each([
  ["send(['enabled'=>pick§", ['pickZ','pickA'], [0,2]],
  ["send(['nested'=>['enabled'=>pick§", ['pickZ','pickA'], [0,2]],
  ["send(['enabled'=>inner(pick§", ['pickA','pickZ'], [0,2]],
  ["send(['enabled'=>unknown(pick§", ['pickA','pickZ'], [undefined,undefined]],
  ["send(['enabled'=>!pick§", ['pickA','pickZ'], [undefined,undefined]],
 ] as const)(`preserves nearest candidate contract retained=${retained}, mixed=${mixed}: %s`, (tail,names,ranks)=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///UnclosedShapeRank.php',marked=header.replace('<?php ',mixed ? '<?php ?><main>{[(</main><?php ' : '<?php ')+tail;
  try {
   workspace.update(uri,marked.replace('§',''),retained);
   const result=workspace.completeFunctions(uri,marked.indexOf('§'));
   expect(result.map(item=>item.name)).toEqual(names);expect(result.map(item=>item.compatibilityRank)).toEqual(ranks);
  } finally {workspace.dispose();}
 });
}

for (const retained of [false,true]) {
 it('keeps recovery budgets and HTML exclusions retained='+retained,()=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///UnclosedShapeBudget.php';
  try {
   for (const marked of [header+"?> <main>send(['enabled'=>tr§</main>",header.replace('<?php ','<?php /*'+'.'.repeat(140000)+'*/ ')+"send(['enabled'=>tr§"]) {
    workspace.update(uri,marked.replace('§',''),retained);
    expect(workspace.completeExpectedValues(uri,marked.indexOf('§'))).toEqual([]);
   }
  } finally {workspace.dispose();}
 });
}

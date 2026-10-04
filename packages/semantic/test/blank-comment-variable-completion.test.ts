import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = `<?php /** @param array{enabled:bool} $config */ function send(array $config):void{}
function takes(bool $value):void{} function pair(string $text,bool $flag):void{}
function run(string $text,bool $flag):bool{`;
for (const retained of [false, true]) {
  it.each([
    "send(['enabled'=> /* value */ §]);",
    "send(['enabled'=> /* first */ /* second */ §]);",
    "send(['enabled'=> // value\n §]);",
    'takes(/* value */ §);',
    'pair("x", /* value */ §);',
    'pair(flag: /* value */ §, text:"x");',
    'return /* value */ §;',
    'return // value\n §;',
    `return /* ${'long '.repeat(2000)} */ §;`,
    '$assigned = true; $assigned = /* value */ §;',
  ])(`keeps typed locals after trailing comments, retained=${retained}: %s`, tail => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///BlankComment.php';
    const marked = header + tail + '}', offset = marked.indexOf('§');
    try {
      workspace.update(uri, marked.replace('§', ''), retained);
      const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
      const result = workspace.completeBareExpressionVariables(uri, offset);
      expect(result?.[0]).toEqual({name:tail.includes('$assigned') ? '$assigned' : '$flag',compatibilityRank:0});
      expect(result?.find(item => item.name === '$text')?.compatibilityRank).toBe(2);
      expect(workspace.revision()).toBe(revision);
      expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
    } finally { workspace.dispose(); }
  });
  it.each([
    'takes(/* value § */ true);', 'return /* §',
    'takes("/* value § */");', 'takes("/* value */"§);',
    'takes(unknown(/* value */ §));',
    "send(['missing'=> /* value */ §]);",
    'return true /* value */ §;',
  ])(`does not invent a blank expected expression, retained=${retained}: %s`, tail => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///BlankCommentNegative.php';
    const marked = header + tail + '}';
    try {
      workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completeBareExpressionVariables(uri, marked.indexOf('§')) ?? []).toEqual([]);
    } finally { workspace.dispose(); }
  });
}
for (const retained of [false, true]) {
  it.each(['public', 'private', 'public readonly'])(
    `preserves property offsets and write restrictions, retained=${retained}: %s`, visibility => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///PropertyBlankComment.php';
      const marked = `<?php class Builder {${visibility} bool $enabled;} function run(Builder $host,string $text,bool $flag){$host->enabled = /* value */ §;}`;
      try {
        workspace.update(uri, marked.replace('§', ''), retained);
        const result = workspace.completeBareExpressionVariables(uri, marked.indexOf('§'));
        if (visibility === 'public') expect(result?.[0]).toEqual({name:'$flag',compatibilityRank:0});
        else expect(result).toBeUndefined();
      } finally { workspace.dispose(); }
    });
  it(`distinguishes blank positional values from typed parameter names, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///BlankArgumentContext.php';
    try {
      for (const [tail, blank] of [['takes(/* value */ §);', true], ['takes(/* value */ va§);', false]] as const) {
        const marked = header + tail + '}'; workspace.update(uri, marked.replace('§', ''), retained);
        const context = workspace.completionContext(uri, marked.indexOf('§'), true);
        expect(context.kind).toBe('named-argument');
        if (context.kind === 'named-argument') expect(context.blankValue).toBe(blank);
      }
    } finally { workspace.dispose(); }
  });
}

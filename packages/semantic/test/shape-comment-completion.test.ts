import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = `<?php /** @param array{enabled:bool,nested:array{enabled:bool}} $config */ function send(array $config):void{}
function pickA():string{return 'x';} function pickZ():bool{return true;} function inner(string $value):bool{return true;}`;
for (const retained of [false, true]) {
  it.each([
    "send(['enabled' /* key */ => tr§]);",
    "send(['enabled' => /* value */ tr§]);",
    "send(['enabled' // key\n => tr§]);",
    "send(['enabled' # key\r\n => tr§]);",
    "send([/* before */ 'enabled' /* key */ => /* value */ tr§]);",
    "send(['nested' /* key */ => ['enabled' => tr§]]);",
    "send(['nested' => /* value */ ['enabled' => /* inner */ tr§]]);",
  ])(`offers the proven value through comments, retained=${retained}: %s`, tail => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeComment.php';
    const marked = header + tail, offset = marked.indexOf('§');
    try {
      workspace.update(uri, marked.replace('§', ''), retained);
      const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
      expect(workspace.completeExpectedValues(uri, offset).map(item => item.label)).toEqual(['true']);
      expect(workspace.revision()).toBe(revision);
      expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
    } finally { workspace.dispose(); }
  });
  it.each([
    ["send(['enabled' /* key */ => /* value */ pick§]);", ['pickZ', 'pickA'], [0, 2]],
    ["send(['nested' /* key */ => ['enabled' => /* value */ pick§]]);", ['pickZ', 'pickA'], [0, 2]],
    ["send(['enabled' => /* value */ inner(pick§)]);", ['pickA', 'pickZ'], [0, 2]],
    ["send(['missing' /* key */ => pick§]);", ['pickA', 'pickZ'], [undefined, undefined]],
    ["send(['enabled' . /* key */ 'missing' => pick§]);", ['pickA', 'pickZ'], [undefined, undefined]],
  ] as const)(`ranks only proven fields, retained=${retained}: %s`, (tail, names, ranks) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeCommentRanking.php';
    const marked = header + tail, offset = marked.indexOf('§');
    try {
      workspace.update(uri, marked.replace('§', ''), retained);
      const result = workspace.completeFunctions(uri, offset);
      expect(result.map(item => item.name)).toEqual(names);
      expect(result.map(item => item.compatibilityRank)).toEqual(ranks);
    } finally { workspace.dispose(); }
  });
  it(`keeps literal comment text and filters used keys, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeCommentKeys.php';
    try {
      const marked = `<?php /** @param array{'/*key':bool,enabled:bool,nested:array{enabled:bool}} $config */ function send(array $config):void{} send(['/*key' /* real */ => true, 'enabled' /* used */ => true, '§']);`;
      workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completeArrayShapeKeys(uri, marked.indexOf('§'))?.keys.map(item => item.name)).toEqual(['nested']);
      const nested = header + "send(['nested' /* key */ => [/* before */ 'ena§']]);";
      workspace.update(uri, nested.replace('§', ''), retained);
      expect(workspace.completeArrayShapeKeys(uri, nested.indexOf('§'))?.keys.map(item => item.name)).toEqual(['enabled']);
      const literal = `<?php /** @param array{'/*key':bool} $config */ function send(array $config):void{} send(['/*key' /* real */ => tr§]);`;
      workspace.update(uri, literal.replace('§', ''), retained);
      expect(workspace.completeExpectedValues(uri, literal.indexOf('§')).map(item => item.label)).toEqual(['true']);
    } finally { workspace.dispose(); }
  });
}
for (const retained of [false, true]) {
  it.each(["send(['enabled' /* tr§ */ => true]);", "send(['enabled' => /* tr§ */ true]);", "send(['enabled' => /* tr§"])(
    `does not suggest values inside comments, retained=${retained}: %s`, tail => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeCommentCursor.php';
      const marked = header + tail;
      try {
        workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completeExpectedValues(uri, marked.indexOf('§'))).toEqual([]);
      } finally { workspace.dispose(); }
    });
  it(`refreshes the field contract without saving, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeCommentRefresh.php';
    try {
      for (const type of ['bool', 'string', 'bool']) {
        const marked = header.replace('enabled:bool', `enabled:${type}`) + "send(['enabled' /* key */ => /* value */ pick§]);";
        workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completeFunctions(uri, marked.indexOf('§'))[0]?.name).toBe(type === 'bool' ? 'pickZ' : 'pickA');
      }
    } finally { workspace.dispose(); }
  });
}

import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = `<?php
/** @param array{enabled:bool,nested:array{enabled:bool}} $config */ function send(array $config):void {}
function flagAText():string {return 'x';} function flagMBool():bool {return true;} function flagZUnknown() {}
const FLAG_A_TEXT='x', FLAG_M_BOOL=true;
function innerText(string $value):bool {return true;} function innerBool(bool $value):bool {return true;}
`;
for (const retained of [false, true]) {
  it.each([
    ["send(['enabled'=>flag§]);", [2, 0, 1]],
    ["send(config:['enabled'=>(flag§)]);", [2, 0, 1]],
    ["send(['nested'=>['enabled'=>flag§]]);", [2, 0, 1]],
    ["send(['enabled'=>true?flag§:false]);", [2, 0, 1]],
    ["send(['enabled'=>null??flag§]);", [2, 0, 1]],
    ["send(['enabled'=>match(1){default=>flag§}]);", [2, 0, 1]],
    ["send(['enabled'=>innerText(flag§)]);", [0, 2, 1]],
    ["send(['enabled'=>unknown(flag§)]);", [undefined, undefined, undefined]],
    ["send(['missing'=>flag§]);", [undefined, undefined, undefined]],
    ["send(['enabled'=>!flag§]);", [undefined, undefined, undefined]],
    ["send(['enabled'=>flag§+1]);", [undefined, undefined, undefined]],
    ["send(['enabled'=>flag§?true:false]);", [undefined, undefined, undefined]],
    ["send(['enabled'=>(function(){return flag§;})()]);", [undefined, undefined, undefined]],
    ["send(['enabled'=>fn()=>flag§]);", [undefined, undefined, undefined]],
    ["/** @return array{enabled:bool} */ function run():array{return ['enabled'=>flag§];}", [2, 0, 1]],
    ["/** @param array{enabled:bool} $config */ function run(array $config):void{$config=['enabled'=>flag§];}", [2, 0, 1]],
  ] as const)(`ranks function results by the nearest contract (retained=${retained}): %s`, (tail, ranks) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeCandidate.php';
    try {
      const marked = header + tail, offset = marked.indexOf('§');
      workspace.update(uri, marked.replace('§', ''), retained);
      const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
      const candidates = workspace.completeFunctions(uri, offset);
      expect(Object.fromEntries(candidates.map(item => [item.name, item.compatibilityRank])))
        .toEqual({ flagAText: ranks[0], flagMBool: ranks[1], flagZUnknown: ranks[2] });
      if (ranks[1] === 0) expect(candidates.map(item => item.name)).toEqual(['flagMBool', 'flagZUnknown', 'flagAText']);
      expect(workspace.revision()).toBe(revision); expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
    } finally { workspace.dispose(); }
  });
  it.each([
    ["send(['enabled'=>tr§]);", ['true']],
    ["send(['enabled'=>(tr§)]);", ['true']],
    ["send(['enabled'=>innerBool(tr§)]);", ['true']],
    ["send(['enabled'=>innerText(tr§)]);", []],
    ["send(['enabled'=>unknown(tr§)]);", []],
    ["send(['enabled'=>!tr§]);", []],
    ["send(['enabled'=>tr§?true:false]);", []],
    ["send(['enabled'=>nu§??false]);", ['null']],
    ["send(['enabled'=>null??nu§]);", []],
  ] as const)(`uses nearest literal value contract (retained=${retained}): %s`, (tail, labels) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeLiteral.php';
    try {
      const marked = header + tail, offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completeExpectedValues(uri, offset).map(item => item.label)).toEqual(labels);
    } finally { workspace.dispose(); }
  });
  it(`ranks constants and variables without removing incompatible candidates (retained=${retained})`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeSymbols.php';
    try {
      for (const tail of ["send(['enabled'=>FLAG_§]);", "send(['enabled'=>(FLAG_§)]);"]) {
        const marked = header + tail, offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completeConstants(uri, offset).map(item => [item.name, item.compatibilityRank]))
          .toEqual([['FLAG_M_BOOL', 0], ['FLAG_A_TEXT', 2]]);
      }
      const marked = header + "function run(string $flagAText,bool $flagMBool,$flagZUnknown){send(['enabled'=>$flag§]);}";
      const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completeVariables(uri, offset)?.names).toEqual(['$flagMBool', '$flagZUnknown', '$flagAText']);
    } finally { workspace.dispose(); }
  });
}
for (const retained of [false, true]) {
  it(`ranks member results and construction types by shape fields (retained=${retained})`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeMember.php';
    const declarations = `<?php interface Contract {} class ChoiceA {} class ChoiceZ implements Contract {}
    class Builder { public function makeAText():string{return '';} public function makeMBool():bool{return true;} public function makeZUnknown(){} public static function makeStaticAText():string{return '';} public static function makeStaticZBool():bool{return true;} }
    /** @param array{enabled:bool,object:Contract} $config */ function send(array $config):void {}`;
    try {
      for (const expression of ["$builder->make§", "($builder->make§)"]) {
        const marked = declarations + `function run(Builder $builder){send(['enabled'=>${expression}]);}`;
        const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completeMembers(uri, offset).map(item => item.name)).toEqual(['makeMBool', 'makeZUnknown', 'makeAText']);
      }
      const staticMarked = declarations + "send(['enabled'=>Builder::makeStatic§]);";
      const staticOffset = staticMarked.indexOf('§'); workspace.update(uri, staticMarked.replace('§', ''), retained);
      expect(workspace.completeMembers(uri, staticOffset).map(item => item.name)).toEqual(['makeStaticZBool', 'makeStaticAText']);
      for (const expression of ['new Choice§', '(new Choice§)', 'new /* comment */ Choice§']) {
        const marked = declarations + `send(['object'=>${expression}]);`, offset = marked.indexOf('§');
        workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completeTypes(uri, offset).map(item => item.name)).toEqual(['ChoiceZ', 'ChoiceA']);
      }
    } finally { workspace.dispose(); }
  });
  it(`offers blank value locals and refreshes changed contracts (retained=${retained})`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeRefresh.php';
    try {
      const marked = header + "function run(string $flagAText,bool $flagMBool,$flagZUnknown){send(['enabled'=>§]);}";
      const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completeBareExpressionVariables(uri, offset)?.map(item => [item.name, item.compatibilityRank]))
        .toEqual([['$flagMBool', 0], ['$flagZUnknown', 1], ['$flagAText', 2]]);
      const typed = header + "send(['enabled'=>flag§]);", typedOffset = typed.indexOf('§');
      workspace.update(uri, typed.replace('§', ''), retained);
      expect(workspace.completeFunctions(uri, typedOffset)[0]?.name).toBe('flagMBool');
      const changed = typed.replace('enabled:bool', 'enabled:string');
      const changedOffset = changed.indexOf('§'); workspace.update(uri, changed.replace('§', ''), retained);
      expect(workspace.completeFunctions(uri, changedOffset)[0]?.name).toBe('flagAText');
    } finally { workspace.dispose(); }
  });
  it.each([
    ['array{enabled:bool}|array{enabled:bool,extra:string}', [2, 0, 1]],
    ['array{enabled:bool}|array', [undefined, undefined, undefined]],
    ['array{enabled:bool}|mixed', [undefined, undefined, undefined]],
    ['array', [undefined, undefined, undefined]],
  ] as const)(`uses only proven shared fields (retained=${retained}): %s`, (contract, ranks) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ShapeUnion.php';
    try {
      const marked = header.replace('array{enabled:bool,nested:array{enabled:bool}}', contract) + "send(['enabled'=>flag§]);";
      const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      expect(Object.fromEntries(workspace.completeFunctions(uri, offset).map(item => [item.name, item.compatibilityRank])))
        .toEqual({ flagAText: ranks[0], flagMBool: ranks[1], flagZUnknown: ranks[2] });
    } finally { workspace.dispose(); }
  });
}

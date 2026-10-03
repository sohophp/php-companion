import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {unsupportedSyntax} from '../src/index.js';
let parser: PhpSyntaxParser;beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
it.each(['7.2','8.0','8.1','8.2','8.3','8.5'] as const)('keeps distinct readonly syntax contracts at PHP %s',version=>{
for(const [source,feature,minimum] of [
['<?php $x = new readonly class {};','readonly anonymous class','8.3'],
['<?php readonly class State {}','readonly class','8.2'],
['<?php class State { public readonly int $id; }','readonly property','8.1'],
] as const){const tree=parser.parseTree(source);try{const found=unsupportedSyntax(tree.rootNode,version).filter(rule=>rule.feature.startsWith('readonly'));expect(found.length).toBe(Number(Number(version)<Number(minimum)));for(const rule of found){expect(rule.feature).toBe(feature);expect(rule.minimumVersion).toBe(minimum);expect(source.slice(rule.start,rule.end)).toBe('readonly');}}finally{tree.delete();}}});

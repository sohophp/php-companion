import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const sourceFor=(count:number,extra=false):string=>`<?php class BranchOutputs {
    public function run(bool $enabled${extra?',bool $other':''}):array
    {
        if ($enabled) {
${Array.from({length:count},(_,i)=>`            $out${i} = ${i};`).join('\n')}
        } ${extra?`elseif ($other) {
${Array.from({length:count},(_,i)=>`            $out${i} = ${i+10};`).join('\n')}
        } `:''}else {
${Array.from({length:count},(_,i)=>`            $out${i} = ${i+20};`).join('\n')}
        }
        return [${Array.from({length:count},(_,i)=>`$out${i}`).join(',')}];
    }
}`;
const selection=(source:string):[number,number]=>[source.indexOf('if ($enabled)'),source.indexOf('\n        return [')];
it.each([3,4,8,32])('extracts %i complete branch outputs without losing order or types',count=>{
 const project=new SemanticWorkspace(parser);try{
 const source=sourceFor(count,true),uri='file:///BranchOutputs.php';project.update(uri,source,true);
 const plan=project.extractMethod(uri,...selection(source));expect(plan).toBeDefined();
 const names=Array.from({length:count},(_,i)=>`$out${i}`);
 expect(plan?.parameters).toEqual(['enabled','other']);
 expect(plan?.callText).toBe(`        [${names.join(', ')}] = $this->extractedMethod($enabled, $other);\n`);
 expect(plan?.methodText).toContain(`return [${names.join(', ')}];`);
 expect(plan?.methodText).toContain(`@return array{${names.map((_,i)=>`${i}: int`).join(', ')}}`);
 const edited=source.slice(0,plan!.selectionStart)+plan!.callText+source.slice(plan!.selectionEnd,plan!.insertOffset)+plan!.methodText+source.slice(plan!.insertOffset);
 const parsed=parser.parse(edited);expect(parsed.errors).toEqual([]);parsed.tree.delete();
 project.update(uri,edited,true);const last=edited.indexOf(`$out${count-1}]`,edited.indexOf('return ['));
 expect(project.variableValueAt(uri,last+2)?.type).toBe('int');
 }finally{project.dispose();}
});
it.each([
 ['duplicate',sourceFor(3).replace('$out2 = 2;','$out0 = 2;').replace('$out2 = 22;','$out0 = 22;')],
 ['missing',sourceFor(3).replace('            $out2 = 22;\n','')],
 ['order',sourceFor(3).replace('$out1 = 21;\n            $out2 = 22;','$out2 = 22;\n            $out1 = 21;')],
 ['type',sourceFor(3).replace('$out2 = 22;',"$out2 = 'text';")],
 ['dependency',sourceFor(3).replace('$out2 = 2;','$out2 = $out0;')],
 ['reference',sourceFor(3).replace('$out2 = 2;','$out2 = &$out0;')],
 ['existing',sourceFor(3).replace('        if ($enabled)',"        $out2 = 5;\n        if ($enabled)")],
 ['no else',sourceFor(3).replace('} else {','} elseif ($enabled) {')],
 ['budget',sourceFor(33)],
] as const)('rejects unsafe or unsupported branch outputs: %s',(_,source)=>{
 const project=new SemanticWorkspace(parser);try{
 const uri='file:///BranchOutputs.php';project.update(uri,source,true);
 expect(project.extractMethod(uri,...selection(source))).toBeUndefined();
 }finally{project.dispose();}
});

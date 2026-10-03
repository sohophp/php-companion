import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const make=(selected:string,after='return $total;',parameters='int $price, int $quantity, int $tax',before=''):string=>`<?php\nclass LocalChain {\n    public function run(${parameters})\n    {\n        ${before}${selected}\n        ${after}\n    }\n}\n`;
const chain='$subtotal = $price * $quantity;\n        $total = $subtotal + $tax;';
const query=(source:string,selected:string):{workspace:SemanticWorkspace;plan:ReturnType<SemanticWorkspace['extractMethod']>}=>{
 const workspace=new SemanticWorkspace(parser);workspace.update('file:///LocalChain.php',source,true);
 return {workspace,plan:workspace.extractMethod('file:///LocalChain.php',source.indexOf(selected),source.indexOf(selected)+selected.length)};
};
it.each([
 ['temporary',chain,'return $total;','int $price, int $quantity, int $tax',['total'],['price','quantity','tax'],'int|float'],
 ['both outputs',chain,'return [$subtotal, $total];','int $price, int $quantity, int $tax',['subtotal','total'],['price','quantity','tax'],'int|float'],
 ['literal','$subtotal = 10;\n        $total = $subtotal + 2;','return $total;','',['total'],[],'int|float'],
 ['float','$subtotal = $price * $quantity;\n        $total = $subtotal + $tax;','return $total;','float $price, int $quantity, int $tax',['total'],['price','quantity','tax'],'float'],
 ['parenthesized','$subtotal = ($price * $quantity);\n        $total = ($subtotal + $tax);','return $total;','int $price, int $quantity, int $tax',['total'],['price','quantity','tax'],'int|float'],
 ['string','$prefix = $name . "-";\n        $total = $prefix . "tail";','return $total;','string $name',['total'],['name'],'string'],
 ['three stages','$base = $price * $quantity;\n        $subtotal = $base + $tax;\n        $total = $subtotal - 1;','return $total;','int $price, int $quantity, int $tax',['total'],['price','quantity','tax'],'int|float'],
] as const)('proves straight-line scalar chain: %s',(_,selected,after,parameters,outputs,inputs,type)=>{
 const source=make(selected,after,parameters),{workspace,plan}=query(source,selected);try{
 expect(plan).toBeDefined();expect(plan?.parameters).toEqual(inputs);
 expect(plan?.callText).toContain(`[${outputs.map(name=>`$${name}`).join(', ')}] =`);
 expect(plan?.methodText).toContain(`return [${outputs.map(name=>`$${name}`).join(', ')}];`);
 expect(plan?.methodText).toContain(`@return array{${outputs.map((_,index)=>`${index}: ${type}`).join(', ')}}`);
 const edited=source.slice(0,plan!.selectionStart)+plan!.callText+source.slice(plan!.selectionEnd,plan!.insertOffset)+plan!.methodText+source.slice(plan!.insertOffset);
 const parsed=parser.parse(edited);expect(parsed.errors).toEqual([]);parsed.tree.delete();
 }finally{workspace.dispose();}
});
it.each([
 ['undefined','$subtotal = $missing + 1;\n        $total = $subtotal + 2;','return $total;',''],
 ['reference','$subtotal = &$price;\n        $total = $subtotal + 2;','return $total;','int $price'],
 ['duplicate','$subtotal = 1;\n        $subtotal = 2;\n        $total = $subtotal + 2;','return $total;',''],
 ['division','$subtotal = $price / $quantity;\n        $total = $subtotal + 2;','return $total;','int $price, int $quantity'],
 ['unknown parameter','$subtotal = $price * 2;\n        $total = $subtotal + 2;','return $total;','$price'],
 ['numeric string','$subtotal = $price + 2;\n        $total = $subtotal + 2;','return $total;','string $price'],
 ['dynamic observer',chain,'return get_defined_vars();','int $price, int $quantity, int $tax'],
 ['compact observer',chain,'return compact("subtotal", "total");','int $price, int $quantity, int $tax'],
 ['include observer',chain,'include "observer.php"; return $total;','int $price, int $quantity, int $tax'],
 ['eval observer',chain,'eval("echo $subtotal;"); return $total;','int $price, int $quantity, int $tax'],
 ['dynamic reader',chain,'return $$subtotal;','int $price, int $quantity, int $tax'],
 ['no live output',chain,'return 1;','int $price, int $quantity, int $tax'],
] as const)('rejects unproved scalar chain: %s',(_,selected,after,parameters)=>{
 const {workspace,plan}=query(make(selected,after,parameters),selected);try{expect(plan).toBeUndefined();}finally{workspace.dispose();}
});
it('rejects an existing output name',()=>{
 const {workspace,plan}=query(make(chain,'return $total;','int $price, int $quantity, int $tax','$subtotal = 5;\n        '),chain);
 try{expect(plan).toBeUndefined();}finally{workspace.dispose();}
});

it.each([
 ['explicit capture', '$callback = function () use ($subtotal) { return $subtotal; }; return [$total, $callback()];'],
 ['reference capture', '$callback = function () use (&$subtotal) { return $subtotal; }; return [$total, $callback()];'],
 ['arrow capture', '$callback = fn () => $subtotal; return [$total, $callback()];'],
 ['nested arrow capture', '$callback = fn () => fn () => $subtotal; return [$total, $callback()()];'],
] as const)('returns a local used by a later callback: %s',(_,after)=>{
 const {workspace,plan}=query(make(chain,after),chain);try{
 expect(plan?.callText).toContain('[$subtotal, $total] =');
 }finally{workspace.dispose();}
});
it('refuses a local reference captured before selection',()=>{
 const source=make(chain,'return $total;','int $price, int $quantity, int $tax','$callback = function () use (&$subtotal) { return $subtotal; };\n        ');
 const {workspace,plan}=query(source,chain);try{expect(plan).toBeUndefined();}finally{workspace.dispose();}
});

it.each([
 ['independent closure local', '$callback = function () { $subtotal = 99; return $subtotal; }; return [$total, $callback()];'],
 ['arrow parameter shadow', '$callback = fn ($subtotal) => $subtotal; return [$total, $callback(99)];'],
] as const)('keeps an unrelated nested name out of outputs: %s',(_,after)=>{
 const {workspace,plan}=query(make(chain,after),chain);try{
 expect(plan?.callText).toContain('[$total] =');
 }finally{workspace.dispose();}
});

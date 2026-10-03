import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const sourceFor=(selected:string,parameters:string,returnType=''):string=>`<?php\nclass LocalReturn {\n    public function run(${parameters})${returnType?`: ${returnType}`:''}\n    {\n        ${selected}\n    }\n}\n`;
it.each([
 ['numeric','int $price, int $quantity, int $tax','$subtotal = $price * $quantity;\n        return $subtotal + $tax;','','int|float'],
 ['typed int caller','int $price, int $quantity, int $tax','$subtotal = $price * $quantity;\n        return $subtotal + $tax;','int','int|float'],
 ['typed float caller','int $price, int $quantity, int $tax','$subtotal = $price * $quantity;\n        return $subtotal + $tax;','float','int|float'],
 ['literal','','$subtotal = 10;\n        return $subtotal + 2;','','int|float'],
 ['string','string $name','$prefix = $name . "-";\n        return $prefix . "tail";','','string'],
 ['bool','','$ready = true;\n        return $ready;','','bool'],
 ['int parameter','int $value','$local = $value;\n        return $local;','','int'],
 ['float','float $price, int $quantity','$subtotal = $price * $quantity;\n        return $subtotal + 2;','','float'],
 ['nested arithmetic','int $price, int $quantity, int $tax','$subtotal = ($price * $quantity);\n        return ($subtotal + $tax) * 2;','','int|float'],
] as const)('extracts assignments ending in a scalar return: %s',(_,parameters,selected,returnType,expectedType)=>{
 const project=new SemanticWorkspace(parser);try{
 const uri='file:///LocalReturn.php',source=sourceFor(selected,parameters,returnType);project.update(uri,source,true);
 const plan=project.extractMethod(uri,source.indexOf(selected),source.indexOf(selected)+selected.length);expect(plan).toBeDefined();
 expect(plan?.callText).toMatch(/^ {8}return \$this->extractedMethod\(/u);
 expect(plan?.methodText).toContain(selected);expect(plan?.methodText).not.toContain('return [');
 if(expectedType.includes('|')){expect(plan?.methodText).toContain(`@return ${expectedType}`);expect(plan?.methodText).not.toMatch(/extractedMethod\([^\n]*\):/u);}
 else expect(plan?.methodText).toContain(`): ${expectedType}`);
 const edited=source.slice(0,plan!.selectionStart)+plan!.callText+source.slice(plan!.selectionEnd,plan!.insertOffset)+plan!.methodText+source.slice(plan!.insertOffset);
 const parsed=parser.parse(edited);expect(parsed.errors).toEqual([]);parsed.tree.delete();
 }finally{project.dispose();}
});
it.each([
 ['unknown','$price','$subtotal = $price * 2;\n        return $subtotal + 2;',''],
 ['reference','int $price','$subtotal = &$price;\n        return $subtotal + 2;',''],
 ['division','int $price, int $quantity','$subtotal = $price / $quantity;\n        return $subtotal + 2;',''],
 ['read before write','','$subtotal = $missing;\n        return $subtotal;',''],
 ['repeat write','','$subtotal = 1;\n        $subtotal = 2;\n        return $subtotal;',''],
 ['numeric string','string $price','$subtotal = $price + 2;\n        return $subtotal + 2;',''],
 ['scope observer','','$subtotal = 1;\n        return get_defined_vars();',''],
 ['void caller','','$subtotal = 1;\n        return $subtotal;','void'],
 ['incompatible caller','int $price','$subtotal = $price * 2;\n        return $subtotal + 2;','string'],
] as const)('rejects unproved assignment return: %s',(_,parameters,selected,returnType)=>{
 const project=new SemanticWorkspace(parser);try{
 const uri='file:///LocalReturn.php',source=sourceFor(selected,parameters,returnType);project.update(uri,source,true);
 expect(project.extractMethod(uri,source.indexOf(selected),source.indexOf(selected)+selected.length)).toBeUndefined();
 }finally{project.dispose();}
});

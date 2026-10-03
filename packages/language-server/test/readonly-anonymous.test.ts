import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {TextDocument} from 'vscode-languageserver-textdocument';
import {analyzePhpDocument} from '../src/analysis.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
it.each(['8.1','8.2','8.3','8.5'] as const)('gates anonymous readonly syntax and implicit declarations at PHP %s',version=>{
 const source='<?php $value = new readonly class { public $id; };';
 const diagnostics=analyzePhpDocument(TextDocument.create('file:///Anonymous.php','php',1,source),parser,version).diagnostics;
 expect(diagnostics.some(item=>item.code==='php.version.unsupported')).toBe(Number(version)<8.3);
 expect(diagnostics.some(item=>item.code==='php.property.invalid-readonly-declaration')).toBe(Number(version)>=8.3);
});

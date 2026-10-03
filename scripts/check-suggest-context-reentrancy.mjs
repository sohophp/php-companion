// Diagnostic only: control mode uses an isolated synthetic provider, never an installed Profile.
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';import {spawn} from 'node:child_process';import {build} from 'esbuild';
const root=fileURLToPath(new URL('..',import.meta.url));const mode=process.argv[2];if(!['core','control','coreKeys'].includes(mode))throw new Error('Choose core/control');const scratch=await mkdtemp(root+'/.vscode-test/suggest-context-');
try{
 await build({entryPoints:[root+'/test/extension/suite/suggestContextReentrancy.ts'],outfile:scratch+'/suite.cjs',bundle:true,platform:'node',format:'cjs',external:['vscode'],logLevel:'warning'});
 let runner=(await readFile(root+'/dist-test/runTest.js','utf8')).replaceAll('__dirname',JSON.stringify(root+'/dist-test'));
 runner=runner.replace(/^\s*extensionTestsPath:.*$/m,'            extensionTestsPath: '+JSON.stringify(scratch+'/suite.cjs')+',');
 if(mode==='control'){
  const extension=scratch+'/control';await mkdir(extension);await writeFile(extension+'/package.json',JSON.stringify({publisher:'sohophp',name:'php-companion',version:'0.0.0',engines:{vscode:'^1.99.0'},main:'extension.js',activationEvents:['onLanguage:php'],contributes:{configurationDefaults:JSON.parse(await readFile(root+'/package.json','utf8')).contributes.configurationDefaults}}));
  await writeFile(extension+'/extension.js',`const v=require('vscode');exports.activate=()=>v.languages.registerCompletionItemProvider('php',{provideCompletionItems(d,p){if(/\\benum\\s+\\w*$/.test(d.lineAt(p.line).text.slice(0,p.character)))return [];const w=d.getWordRangeAtPosition(p);const prefix=w?d.getText(w):'';return ['function','class','enum'].filter(x=>x.startsWith(prefix)).map(x=>{const i=new v.CompletionItem(x,v.CompletionItemKind.Keyword);i.range=w;i.sortText='0';return i;});}});`);
  runner=runner.replace(/extensionDevelopmentPath:[\s\S]*?(?=\s*extensionTestsPath:)/,'extensionDevelopmentPath: '+JSON.stringify(extension)+',');
 }
 await writeFile(scratch+'/runner.cjs',runner);
 const child=spawn(process.execPath,[root+'/scripts/run-extension-test.mjs',scratch+'/runner.cjs'],{cwd:root,env:{...process.env,SOPHP_SUGGEST_SEPARATE_KEYS:mode==='coreKeys'?'1':'0',PHP_COMPANION_TEST_CORE_ONLY:'1',PHP_COMPANION_TEST_C1_ONLY:'1',PHP_COMPANION_TEST_C1_UI:'1',PHP_COMPANION_TEST_C1_PHP_VERSION:'8.5'},stdio:'inherit'});
 await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>code===0&&!signal?done():reject(new Error('Host failed '+code+'/'+signal)));});
}finally{await rm(scratch,{recursive:true,force:true});}

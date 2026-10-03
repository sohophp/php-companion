import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { typeWorkbenchText, visibleCompletionLabels } from './c1Ui.js';
async function until<T>(read: () => PromiseLike<T>, ready: (value:T)=>boolean): Promise<T> {
 const end=Date.now()+15000;while(Date.now()<end){const value=await read();if(ready(value))return value;await new Promise(done=>setTimeout(done,40));}throw new Error('Suggest context probe timed out');
}
export async function run():Promise<void>{
 const core=vscode.extensions.getExtension('sohophp.php-companion');assert.ok(core);await core.activate();
 const folder=vscode.workspace.workspaceFolders?.[0];assert.ok(folder);const port=Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT);assert.ok(port);
 let checked=0;
 for(let round=0;round<6;round++){
  for(const keyword of ['enum']){
   const source=keyword==='function'?"<?php\n\nif (!defined('ROOT_PATH')) { throw new LogicException('missing'); }\nuse App\\Components\\Configuration\\Config;\n":"<?php\nfunction example() { return []; }\n\n";
   const uri=vscode.Uri.joinPath(folder.uri,'src',`SuggestContext${round}${keyword}.php`);await vscode.workspace.fs.writeFile(uri,Buffer.from(source));
   const document=await vscode.workspace.openTextDocument(uri);const editor=await vscode.window.showTextDocument(document);
   const offset=keyword==='function'?'<?php\n'.length:source.length;const pos=document.positionAt(offset);editor.selection=new vscode.Selection(pos,pos);
   await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
   for(const [index,letter] of [...keyword].entries()){
    await typeWorkbenchText(port,letter);
    const typed=keyword.slice(0,index+1);
    await until(async()=>document.getText(),value=>value===source.slice(0,offset)+typed+source.slice(offset));
    if(typed==='func'||typed==='c'||typed==='enu') await until(()=>visibleCompletionLabels(port),values=>values.length>0&&values[0]?.startsWith(keyword)===true);
   }
   const labels=await until(()=>visibleCompletionLabels(port),values=>values.some(value=>value===keyword||value.startsWith(keyword+' ')));
   assert.ok(labels[0]?.startsWith(keyword));
   if(process.env.SOPHP_SUGGEST_SEPARATE_KEYS==='1'){await typeWorkbenchText(port,' ');await typeWorkbenchText(port,'e');}
   else await typeWorkbenchText(port,' e');
   await until(async()=>document.getText(),value=>value===source.slice(0,offset)+keyword+' e'+source.slice(offset));
   if(core.packageJSON.version==='0.0.0'){
    const api=await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',uri,editor.selection.active);
    assert.deepEqual(api?.items.filter(item=>item.kind!==vscode.CompletionItemKind.Snippet)??[],[]);
    console.log('Control before explicit refresh: '+JSON.stringify(await visibleCompletionLabels(port)));
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
   }
   await until(()=>visibleCompletionLabels(port),values=>values.length===0);
   assert.equal(document.getText(),source.slice(0,offset)+keyword+' e'+source.slice(offset));checked++;
  }
 }
 console.log('Suggest context probe proof: '+JSON.stringify({checked,platform:process.platform,separateKeys:process.env.SOPHP_SUGGEST_SEPARATE_KEYS==='1',provider:{version:core.packageJSON.version,uri:core.extensionUri.toString()}}));
}

import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core=vscode.extensions.getExtension('sohophp.php-companion');assert.ok(core);await core.activate();
  const folder=vscode.workspace.workspaceFolders?.[0];assert.ok(folder);
  const phpVersion=vscode.workspace.getConfiguration('phpCompanion',folder.uri).get<string>('phpVersion');
  assert.ok(phpVersion==='7.2' || phpVersion==='8.5');
  const cases=[
    {name:'CasePublic',selected:'options',source:"<?php class CasePublic {public $options=1;public $Options=2;function read(){return $this->options.':'.$this->Options;}} echo (new CasePublic())->read();"},
    {name:'CasePrivate',selected:'Options',source:"<?php class CasePrivate {private $options=1;private $Options=2;function read(){return $this->options.':'.$this->Options;}} echo (new CasePrivate())->read();"},
    {name:'CaseStatic',selected:'options',source:"<?php class CaseStatic {public static $options=1;public static $Options=2;function read(){return self::$options.':'.self::$Options;}} echo (new CaseStatic())->read();"},
    {name:'CaseTraitHost',selected:'Options',source:"<?php trait CaseTrait {public $options=1;public $Options=2;function read(){return $this->options.':'.$this->Options;}} class CaseTraitHost {use CaseTrait;} echo (new CaseTraitHost())->read();"},
    ...(phpVersion==='8.5'?[{name:'CasePromoted',selected:'options',source:"<?php class CasePromoted {function __construct(public $options,public $Options){} function read(){return $this->options.':'.$this->Options;}} echo (new CasePromoted(options:1,Options:2))->read();"}]:[]),
  ];
  const results=[];let cancelled=0,collisions=0,staleRefusals=0;
  for(const item of cases){
    const uri=vscode.Uri.joinPath(folder.uri,'src',item.name+'.php');await vscode.workspace.fs.writeFile(uri,Buffer.from(item.source));
    const document=await vscode.workspace.openTextDocument(uri);await vscode.window.showTextDocument(document,{preview:false});
    const position=document.positionAt(item.source.indexOf('$'+item.selected)+2);
    const expected=item.source.replace(new RegExp(`(?<![A-Za-z0-9_])${item.selected}(?![A-Za-z0-9_])`,'g'),'settings');
    const args={uri,position,newName:'settings'};
    let previewed=false;
    assert.equal(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename',{...args,testPreviewAction:async()=>{previewed=true;return 'cancel';}}),false);
    assert.equal(previewed,true);assert.equal(document.isClosed,false);assert.equal(document.getText(),item.source);cancelled++;
    previewed=false;
    assert.equal(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename',{...args,newName:item.selected==='options'?'Options':'options',
      testPreviewAction:async()=>{previewed=true;return 'apply';}}),false);
    assert.equal(previewed,false);assert.equal(document.getText(),item.source);collisions++;
    if(item.name==='CasePublic'){
      previewed=false;let afterPlanCalled=false;
      assert.equal(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename',{...args,
        testAfterPlan:async()=>{afterPlanCalled=true;const editor=await vscode.window.showTextDocument(document,{preview:false});assert.equal(await editor.edit(edit=>edit.insert(document.positionAt(document.getText().length),'\n// changed after plan')),true);},
        testPreviewAction:async()=>{previewed=true;return 'apply';}}),false);
      assert.equal(afterPlanCalled,true);assert.equal(previewed,false);assert.equal(document.getText(),item.source+'\n// changed after plan');staleRefusals++;
      const editor=await vscode.window.showTextDocument(document,{preview:false});
      assert.equal(await editor.edit(edit=>edit.replace(new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),item.source)),true);
    }
    assert.equal(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename',{...args,testPreviewAction:async()=> 'apply'}),true);
    assert.equal(document.getText(),expected);
    await vscode.window.showTextDocument(document,{preview:false});
    await vscode.commands.executeCommand('undo');assert.equal(document.getText(),item.source);
    await vscode.commands.executeCommand('redo');assert.equal(document.getText(),expected);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(),item.source);
    results.push({name:item.name,selected:item.selected,source:item.source,accepted:expected,exactText:true,undoRedo:true,diskUnchanged:true});
  }
  assert.equal(staleRefusals,1);
  console.log('Property case Rename host proof: '+JSON.stringify({phpVersion,results,cancelled,collisions,staleRefusals}));
}

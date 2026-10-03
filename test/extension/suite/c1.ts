import { arrayAccessCases } from './arrayAccessFixture.js';
import { quotedPrefixCases } from './quotedPrefixFixture.js';
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { unfinishedShapeContexts, unfinishedShapeSource, unfinishedShapeTail } from './unfinishedShapeFixture.js';
import { existingShapeArrowCases } from './existingShapeArrowFixture.js';
import { wordMiddleShapeCases } from './wordMiddleShapeFixture.js';
import { measureRapidReceiverSuggestion, measureRealVendorSuggestion, measureUnsavedReceiverSuggestion, measureVisibleInstalledPsr0Type, measureVisibleSuggestion,
  measureVisibleTypeSuggestion, pressWorkbenchEnter, pressWorkbenchTab, typeWorkbenchText, visibleCompletionLabels } from './c1Ui.js';

async function waitForResult<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean, message: string): Promise<T> {
  const deadline = Date.now() + 30_000;
  let lastResult: T | undefined;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (ready(result)) return result;
      lastResult = result;
    } catch (error) { lastError = error; /* The language server may still be starting. */ }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`${message} Last result: ${JSON.stringify(lastResult)}; last error: ${String(lastError)}`);
}

async function verifyVisibleArrayAccessKeys(folder: vscode.Uri, port: number): Promise<void> {
  const uri = vscode.Uri.joinPath(folder, 'C1VisibleArrayAccessKeys.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from('<?php'));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const samples: number[] = [];
  for (const item of arrayAccessCases.filter(item => item.labels.length > 0)) {
    const offset = item.marked.indexOf('§'), source = item.marked.replace('§', '');
    await vscode.commands.executeCommand('hideSuggestWidget');
    assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)));
    const position = document.positionAt(offset);
    await waitForResult(() => boundedCompletion(uri, position), result => result?.items[0]?.label === item.labels[0]!, `Array access key provider omitted ${item.name}.`);
    editor.selection = new vscode.Selection(position, position);
    const started = performance.now();
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const labels = await waitForResult(() => visibleCompletionLabels(port), labels => labels[0]?.startsWith(item.labels[0]!) === true, `Visible array access key omitted ${item.name}.`);
    samples.push(Math.round(performance.now() - started));
    assert.strictEqual(labels.length, item.labels.length, `Array access key mixed unrelated suggestions: ${JSON.stringify(labels)}`);
    const accepted = source.slice(0, item.start) + item.insertion + source.slice(item.end);
    await pressWorkbenchTab(port);
    await waitForResult(async () => document.getText(), text => text === accepted, `Array access key ${item.name} Tab inserted incorrect escaping, suffix or delimiters.`);
    await vscode.commands.executeCommand('undo');
    await waitForResult(async () => document.getText(), text => text === source, `Array access key ${item.name} Undo did not restore source.`);
    await vscode.commands.executeCommand('redo');
    await waitForResult(async () => document.getText(), text => text === accepted, `Array access key ${item.name} Redo did not restore accepted text.`);
  }
  console.log(`C1 array access key visible list, exact Tab text and Undo/Redo passed: ${JSON.stringify({samplesMs: samples, maxMs: Math.max(...samples)})}`);
}

async function verifyVisibleQuotedPrefixes(folder: vscode.Uri, port: number): Promise<void> {
  const uri = vscode.Uri.joinPath(folder, 'C1VisibleQuotedPrefixes.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from('<?php'));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const samples: number[] = [];
  for (const item of quotedPrefixCases) {
    const offset = item.marked.indexOf('§'), source = item.marked.replace('§', '');
    await vscode.commands.executeCommand('hideSuggestWidget');
    assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)));
    const position = document.positionAt(offset);
    await waitForResult(() => boundedCompletion(uri, position), result => result?.items[0]?.label === item.label, `Quoted prefix provider omitted ${item.name}.`);
    editor.selection = new vscode.Selection(position, position);
    const started = performance.now();
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const labels = await waitForResult(() => visibleCompletionLabels(port), labels => labels[0]?.startsWith(item.label) === true, `Visible quoted prefix omitted ${item.name}.`);
    samples.push(Math.round(performance.now() - started));
    assert.strictEqual(labels.length, 1, `Quoted prefix mixed unrelated suggestions: ${JSON.stringify(labels)}`);
    const accepted = source.slice(0, item.start) + item.insertion + source.slice(item.end);
    await pressWorkbenchTab(port);
    await waitForResult(async () => document.getText(), text => text === accepted, `Quoted prefix ${item.name} Tab inserted incorrect escaping, suffix or delimiters.`);
    await vscode.commands.executeCommand('undo');
    await waitForResult(async () => document.getText(), text => text === source, `Quoted prefix ${item.name} Undo did not restore source.`);
    await vscode.commands.executeCommand('redo');
    await waitForResult(async () => document.getText(), text => text === accepted, `Quoted prefix ${item.name} Redo did not restore accepted text.`);
  }
  console.log(`C1 quoted prefix visible list, exact Tab text and Undo/Redo passed: ${JSON.stringify({samplesMs: samples, maxMs: Math.max(...samples)})}`);
}

async function verifyVisibleUnfinishedShapes(folder: vscode.Uri, port: number): Promise<void> {
  const uri = vscode.Uri.joinPath(folder, 'C1VisibleUnfinishedShapes.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(unfinishedShapeSource('c1Unfinished', 'mode', 'create', 'argument', 'key')));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const samples: number[] = [];
  for (const context of unfinishedShapeContexts) for (const part of ['key', 'value'] as const) for (const middle of [false, true]) {
    const sourceFor = (key: string, value: string): string => unfinishedShapeSource('c1Unfinished', key, value, context, part)
      + (middle ? unfinishedShapeTail(context) : '');
    const replace = async (key: string, value: string): Promise<void> => {
      await vscode.commands.executeCommand('hideSuggestWidget');
      assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor(key, value))));
    };
    const verify = async (key: string, value: string): Promise<void> => {
      const expected = part === 'key' ? key : `'${value}'`;
      const position = document.positionAt(unfinishedShapeSource('c1Unfinished', key, value, context, part).length);
      await waitForResult(() => boundedCompletion(uri, position), result => result?.items[0]?.label === expected, `Unfinished ${context}/${part} provider omitted ${expected}.`);
      await vscode.commands.executeCommand('hideSuggestWidget');
      editor.selection = new vscode.Selection(position, position);
      const started = performance.now();
      await vscode.commands.executeCommand('editor.action.triggerSuggest');
      const labels = await waitForResult(() => visibleCompletionLabels(port), labels => labels[0]?.startsWith(expected) === true, `Visible unfinished ${context}/${part} omitted ${expected}.`);
      samples.push(Math.round(performance.now() - started));
      assert.strictEqual(labels.length, 1, `Unfinished string mixed unrelated candidates: ${JSON.stringify(labels)}`);
    };
    await replace('mode', 'create');
    await verify('mode', 'create');
    const baseline = document.getText();
    const offset = unfinishedShapeSource('c1Unfinished', 'mode', 'create', context, part).length;
    const accepted = baseline.slice(0, baseline.slice(0, offset).lastIndexOf("'"))
      + (part === 'key' ? "'mode' => " : "'create'") + baseline.slice(offset);
    await pressWorkbenchTab(port);
    await waitForResult(async () => document.getText(), text => text === accepted, `Unfinished ${context}/${part} Tab inserted incorrect text or synthetic delimiters.`);
    await vscode.commands.executeCommand('undo');
    await waitForResult(async () => document.getText(), text => text === baseline, 'Unfinished acceptance Undo did not restore input.');
    await vscode.commands.executeCommand('redo');
    await waitForResult(async () => document.getText(), text => text === accepted, 'Unfinished acceptance Redo did not restore text.');
    await vscode.commands.executeCommand('undo');
    await replace('other', 'refresh');
    await verify('other', 'refresh');
    await vscode.commands.executeCommand('hideSuggestWidget');
  }
  console.log(`C1 EOF and middle unfinished shape visible list, exact Tab text, tail preservation and Undo/Redo passed: ${JSON.stringify({ samplesMs: samples, maxMs: Math.max(...samples) })}`);
  const arrowSamples: number[] = [];
  for (const item of [...existingShapeArrowCases, ...wordMiddleShapeCases].filter(item => item.insertion)) {
    await vscode.commands.executeCommand('hideSuggestWidget');
    const source = item.marked.replace('§', ''), offset = item.marked.indexOf('§');
    assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)));
    const position = document.positionAt(offset);
    const expected = item.labels[0]!;
    await waitForResult(() => boundedCompletion(uri, position), result => result?.items[0]?.label === expected, `Existing arrow provider failed: ${item.name}`);
    editor.selection = new vscode.Selection(position, position);
    const started = performance.now();
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const labels = await waitForResult(() => visibleCompletionLabels(port), labels => labels[0]?.startsWith(expected) === true, `Existing arrow visible list failed: ${item.name}`);
    arrowSamples.push(Math.round(performance.now() - started));
    assert.strictEqual(labels.length, 1, `Existing arrow mixed unrelated candidates: ${item.name}`);
    const start = source.slice(0, offset).lastIndexOf(item.insertion![0]!);
    const accepted = source.slice(0, start) + item.insertion + source.slice(item.end);
    await pressWorkbenchTab(port);
    await waitForResult(async () => document.getText(), text => text === accepted, `Existing arrow Tab overwrote source: ${item.name}`);
    await vscode.commands.executeCommand('undo');
    await waitForResult(async () => document.getText(), text => text === source, `Existing arrow Undo failed: ${item.name}`);
    await vscode.commands.executeCommand('redo');
    await waitForResult(async () => document.getText(), text => text === accepted, `Existing arrow Redo failed: ${item.name}`);
    await vscode.commands.executeCommand('hideSuggestWidget');
  }
  console.log(`C1 existing array arrows and word-middle literals: visible list, exact Tab text and Undo/Redo passed: ${JSON.stringify({ samplesMs: arrowSamples, maxMs: Math.max(...arrowSamples) })}`);
}

async function verifyVisibleUnionShapes(folder: vscode.Uri, port: number): Promise<void> {
  const uri = vscode.Uri.joinPath(folder, 'C1VisibleUnionShapes.php');
  const sourceFor = (key: string, mode: string): string => {
    const expression = mode === 'key' ? `['${key.slice(0, 2)}']`
      : mode === 'nested' ? "['payload'=>['tr']]" : `['${key}'=>'cr']`;
    return `<?php /** @param (array{${key}:'create',payload:array{trace:string,x:int},id:int}|array{${key}:'update',payload:array{trace:string,y:string},name:string})|null $options */ function c1UnionSend(?array $options):void{} c1UnionSend(${expression});`;
  };
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('mode', 'key')));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const samples: number[] = [];
  for (const mode of ['key', 'nested', 'value']) {
    const replace = async (key: string): Promise<void> => {
      await vscode.commands.executeCommand('hideSuggestWidget');
      assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor(key, mode))));
    };
    const verify = async (key: string): Promise<void> => {
      const expected = mode === 'key' ? key : mode === 'nested' ? 'trace' : "'create'";
      const token = mode === 'key' ? `'${key.slice(0, 2)}'` : mode === 'nested' ? "'tr'" : "'cr'";
      const position = document.positionAt(document.getText().lastIndexOf(token) + token.length - 1);
      await waitForResult(() => boundedCompletion(uri, position), result => result?.items[0]?.label === expected, `Union shape provider omitted ${expected}.`);
      await vscode.commands.executeCommand('hideSuggestWidget');
      editor.selection = new vscode.Selection(position, position);
      const started = performance.now();
      await vscode.commands.executeCommand('editor.action.triggerSuggest');
      const labels = await waitForResult(() => visibleCompletionLabels(port), value => value[0]?.startsWith(expected) === true, `Visible union shape omitted ${expected}.`);
      samples.push(Math.round(performance.now() - started));
      assert.strictEqual(labels.length, 1, `Visible union shape mixed unrelated candidates: ${JSON.stringify(labels)}`);
    };
    await replace('mode');
    await verify('mode');
    const baseline = document.getText();
    const accepted = mode === 'key' ? baseline.replace("['mo']", "['mode' => ]")
      : mode === 'nested' ? baseline.replace("['tr']", "['trace' => ]") : baseline.replace("=>'cr'", "=>'create'");
    await pressWorkbenchTab(port);
    await waitForResult(async () => document.getText(), text => text === accepted, `Tab did not accept the union shape ${mode} edit.`);
    await vscode.commands.executeCommand('undo');
    await waitForResult(async () => document.getText(), text => text === baseline, `Union shape ${mode} Undo changed the wrong text.`);
    await vscode.commands.executeCommand('redo');
    await waitForResult(async () => document.getText(), text => text === accepted, `Union shape ${mode} Redo did not restore acceptance.`);
    await vscode.commands.executeCommand('undo');
    await replace('other');
    await verify('other');
    await vscode.commands.executeCommand('hideSuggestWidget');
  }
  console.log(`C1 union shape visible lists, exact Tab text, Undo/Redo and unsaved contracts passed: ${JSON.stringify({ samplesMs: samples, maxMs: Math.max(...samples) })}`);
}

async function verifyVisibleBranchShapes(folder: vscode.Uri, port: number): Promise<void> {
  const uri=vscode.Uri.joinPath(folder,'C1VisibleBranchShapes.php');
  const phpVersion=vscode.workspace.getConfiguration('phpCompanion',folder).get<string>('phpVersion');
  const modes=['ternary','coalesce','left','nested',...(phpVersion==='7.2'?[]:['arm'])];
  const sourceFor=(key: string,mode: string): string=>{
    const expression=mode==='ternary'?'true?["o"]:[]':mode==='coalesce'?'null??["o"]':mode==='left'?'["o"]??[]'
      :mode==='nested'?'["nested"=>["deep"=>["o"]]]':'match(true){true=>["o"],default=>[]}';
    return `<?php /** @param array{${key}:string,nested:array{deep:array{${key}:string}}} $config */ function c1BranchShapeSend(array $config):void{} c1BranchShapeSend(${expression});`;
  };
  await vscode.workspace.fs.writeFile(uri,Buffer.from(sourceFor('owner',modes[0]!)));
  const document=await vscode.workspace.openTextDocument(uri);const editor=await vscode.window.showTextDocument(document);
  const samples: number[]=[];
  for(const mode of modes){
    const replace=async(key: string): Promise<void>=>{
      await vscode.commands.executeCommand('hideSuggestWidget');
      assert.ok(await editor.edit(edit=>edit.replace(new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),sourceFor(key,mode))));
    };
    const verify=async(key: string): Promise<void>=>{
      const position=document.positionAt(document.getText().lastIndexOf('"o"')+2);
      await waitForResult(()=>boundedCompletion(uri,position),result=>result?.items[0]?.label===key,`Shape provider did not refresh ${key} in ${mode}.`);
      await vscode.commands.executeCommand('hideSuggestWidget');editor.selection=new vscode.Selection(position,position);
      const started=performance.now();await vscode.commands.executeCommand('editor.action.triggerSuggest');
      const labels=await waitForResult(()=>visibleCompletionLabels(port),value=>value[0]?.startsWith(key)===true,`Visible ${mode} shape omitted ${key}.`);
      samples.push(Math.round(performance.now()-started));
      assert.strictEqual(labels.length,1,`Visible ${mode} shape mixed unrelated suggestions: ${JSON.stringify(labels)}`);
      assert.ok(!labels.some(label=>label.startsWith(key==='owner'?'other':'owner')),`Visible ${mode} shape retained a stale key`);
    };
    await replace('owner');await verify('owner');
    await pressWorkbenchTab(port);
    await waitForResult(async()=>document.getText(),text=>text===sourceFor('owner',mode).replace('"o"','"owner" => '),`Tab did not accept the shape key in ${mode}.`);
    await vscode.commands.executeCommand('undo');assert.strictEqual(document.getText(),sourceFor('owner',mode));
    await replace('other');await verify('other');await vscode.commands.executeCommand('hideSuggestWidget');
    await vscode.commands.executeCommand('undo');await verify('owner');
    await vscode.commands.executeCommand('hideSuggestWidget');await vscode.commands.executeCommand('redo');await verify('other');
  }
  await vscode.commands.executeCommand('hideSuggestWidget');
  console.log(`C1 visible shape branches PHP ${phpVersion}: ${JSON.stringify({samplesMs:samples,modes})}; Tab, unsaved keys and Undo/Redo passed`);
}

async function verifyVisibleBranchValues(folder: vscode.Uri, port: number): Promise<void> {
  const uri=vscode.Uri.joinPath(folder,'C1VisibleBranchValues.php');
  const phpVersion=vscode.workspace.getConfiguration('phpCompanion',folder).get<string>('phpVersion');
  const modes=['coalesce','nullable',...(phpVersion==='7.2'?[]:['arm','subject','label'])];
  const sourceFor=(type: string): string=>{
    const fallback=type==='string'?"'text'":'123';
    return `<?php function c1BranchTakes(${type} $v):void{}
${modes.map(mode=>`function c1Branch${mode}(${mode==='nullable'?`?${type} $valueMaybe,${type} $valueText`:''}):${type}{
${mode==='nullable'?'':"$valueFlag=true;$valueText='text';$valueNumber=123;"}
${mode==='coalesce'?'return null??$val;':mode==='nullable'?`return $val??${fallback};`
:mode==='subject'?`c1BranchTakes(match($val){true=>${fallback},default=>${fallback}});`
:mode==='label'?`c1BranchTakes(match(true){$val=>${fallback},default=>${fallback}});`
:`return match(true){true=>$val,default=>${fallback}};`}}`).join('\n')}`;
  };
  await vscode.workspace.fs.writeFile(uri,Buffer.from(sourceFor('string')));
  const document=await vscode.workspace.openTextDocument(uri);const editor=await vscode.window.showTextDocument(document);
  const samples: number[]=[];
  const verify=async(type: string): Promise<void>=>{
    for(const mode of modes){
      const text=document.getText();const start=text.indexOf(`function c1Branch${mode}(`);
      const next=text.indexOf('function c1Branch',start+1);
      const end=next<0?text.length:next;
      const offset=text.lastIndexOf('$val',end-1)+4;
      const expected=mode==='nullable'?'$valueMaybe':mode==='subject'||mode==='label'?'$valueFlag':type==='string'?'$valueText':'$valueNumber';
      const position=document.positionAt(offset);
      await waitForResult(()=>boundedCompletion(uri,position),result=>result?.items[0]?.label===expected,
        `Provider did not rank ${expected} in ${mode} for ${type}.`);
      await vscode.commands.executeCommand('hideSuggestWidget');
      editor.selection=new vscode.Selection(position,position);
      const started=performance.now();await vscode.commands.executeCommand('editor.action.triggerSuggest');
      const labels=await waitForResult(()=>visibleCompletionLabels(port),value=>value[0]?.startsWith(expected)===true,
        `Visible list did not rank ${expected} in ${mode} for ${type}.`);
      samples.push(Math.round(performance.now()-started));
      const preserved=mode==='nullable'?['$valueMaybe','$valueText']:['$valueFlag','$valueText','$valueNumber'];
      assert.ok(preserved.every(name=>labels.some(label=>label.startsWith(name))),`Visible ${mode} list lost variables: ${JSON.stringify(labels)}`);
    }
  };
  await verify('string');await vscode.commands.executeCommand('hideSuggestWidget');
  assert.ok(await editor.edit(edit=>edit.replace(new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),sourceFor('int'))));
  await verify('int');await vscode.commands.executeCommand('hideSuggestWidget');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo');await verify('string');
  await vscode.commands.executeCommand('hideSuggestWidget');await vscode.commands.executeCommand('redo');await verify('int');
  await vscode.commands.executeCommand('hideSuggestWidget');
  console.log(`C1 visible value branches PHP ${phpVersion}: ${JSON.stringify({samplesMs:samples,modes})}; unsaved sorting and Undo/Redo passed`);
}

async function boundedCompletion(uri: vscode.Uri, position: vscode.Position): Promise<vscode.CompletionList | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Completion provider exceeded 5 seconds.')), 5_000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

async function warmLatency<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean, name: string): Promise<{ median: number; max: number }> {
  const samples: number[] = [];
  for (let index = 0; index < 12; index += 1) {
    const started = performance.now();
    const result = await read();
    samples.push(performance.now() - started);
    assert.ok(ready(result), `SoPHP ${name} returned an unexpected warm result.`);
  }
  samples.sort((left, right) => left - right);
  return { median: Math.round((samples[5]! + samples[6]!) / 2), max: Math.round(samples[11]!) };
}

async function verifyStaticIncludeDefinition(folder: vscode.Uri): Promise<void> {
  const vendor = vscode.Uri.joinPath(folder, 'vendor');
  await vscode.workspace.fs.createDirectory(vendor);
  const target = vscode.Uri.joinPath(vendor, 'autoload.php');
  await vscode.workspace.fs.writeFile(target, Buffer.from('<?php return true;'));
  const source = `<?php
require_once dirname(__DIR__) . '/vendor/autoload.php';
require_once dirname($base) . '/vendor/autoload.php';`;
  const config = vscode.Uri.joinPath(folder, 'config');
  await vscode.workspace.fs.createDirectory(config);
  const uri = vscode.Uri.joinPath(config, 'bootstrap.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const definition = (offset: number): Thenable<vscode.Location[]> => vscode.commands.executeCommand(
    'vscode.executeDefinitionProvider', uri, document.positionAt(offset));
  const first = source.indexOf('autoload.php') + 4;
  const found = await waitForResult(() => definition(first), (locations) =>
    locations?.some((location) => location.uri.toString() === target.toString()) === true,
  'SoPHP did not navigate from dirname(__DIR__) to the included file.');
  assert.deepStrictEqual(found.map((location) => location.uri.toString()), [target.toString()]);
  const second = source.lastIndexOf('autoload.php') + 4;
  assert.deepStrictEqual(await definition(second), [], 'A dynamic include path must not point to the static file.');
}

async function verifyShadowedGlobalCompletion(folder: vscode.Uri): Promise<void> {
  const globalUri = vscode.Uri.joinPath(folder, 'C1ShadowGlobal.php');
  const localUri = vscode.Uri.joinPath(folder, 'C1ShadowLocal.php');
  const uri = vscode.Uri.joinPath(folder, 'C1ShadowConsumer.php');
  await vscode.workspace.fs.writeFile(globalUri, Buffer.from('<?php function c1ShadowHelper(): void {} const C1_SHADOW_KEY = 1;'));
  await vscode.workspace.fs.writeFile(localUri, Buffer.from('<?php namespace C1\\Shadow; function c1ShadowHelper(): void {} const C1_SHADOW_KEY = 2;'));
  const source = '<?php namespace C1\\Shadow; $function = c1ShadowH; $constant = C1_SHADOW_K;';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  await vscode.workspace.openTextDocument(globalUri);
  await vscode.workspace.openTextDocument(localUri);
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  for (const [prefix, label, owner] of [
    ['c1ShadowH', 'c1ShadowHelper', 'C1\\Shadow\\c1ShadowHelper'],
    ['C1_SHADOW_K', 'C1_SHADOW_KEY', 'C1\\Shadow\\C1_SHADOW_KEY'],
  ]) {
    const position = document.positionAt(source.indexOf(`${prefix};`) + prefix.length);
    const completion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
      (result) => result?.items.some((item) => item.label === label && item.detail?.includes(owner)) === true,
      `SoPHP did not offer the local ${label} in the isolated editor.`,
    );
    const matches = completion.items.filter((item) => item.label === label);
    assert.strictEqual(matches.length, 1, `The shadowed global ${label} appeared beside the local declaration.`);
    assert.ok(matches[0]?.detail?.includes(owner));
  }
}

async function verifyScopedSymbolDefinition(folder: vscode.Uri): Promise<void> {
  const globalUri = vscode.Uri.joinPath(folder, 'C1ScopedGlobal.php');
  const vendorUri = vscode.Uri.joinPath(folder, 'C1ScopedVendor.php');
  const uri = vscode.Uri.joinPath(folder, 'C1ScopedConsumer.php');
  await vscode.workspace.fs.writeFile(globalUri, Buffer.from(
    '<?php function c1ScopedTarget(): void {} const C1_SCOPED_FLAG = 1;'));
  await vscode.workspace.fs.writeFile(vendorUri, Buffer.from(
    '<?php namespace C1\\Vendor; function c1ScopedTarget(): void {} const C1_SCOPED_FLAG = 2;'));
  const source = '<?php namespace C1\\Scoped { use function C1\\Vendor\\c1ScopedTarget; '
    + 'use const C1\\Vendor\\C1_SCOPED_FLAG; c1ScopedTarget(); echo C1_SCOPED_FLAG; } '
    + 'namespace C1\\Scoped { c1ScopedTarget(); echo C1_SCOPED_FLAG; }';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  await vscode.workspace.openTextDocument(globalUri);
  await vscode.workspace.openTextDocument(vendorUri);
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  for (const [marker, last, target] of [
    ['c1ScopedTarget();', false, vendorUri],
    ['c1ScopedTarget();', true, globalUri],
    ['echo C1_SCOPED_FLAG;', false, vendorUri],
    ['echo C1_SCOPED_FLAG;', true, globalUri],
  ] as const) {
    const start = last ? source.lastIndexOf(marker) : source.indexOf(marker);
    const position = document.positionAt(start + (marker.startsWith('echo ') ? 'echo '.length : 0) + 2);
    const definitions = await waitForResult(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', uri, position),
      (items) => items?.some((item) => item.uri.toString() === target.toString()) === true,
      'SoPHP did not resolve ' + marker + ' in its own namespace block.',
    );
    assert.deepStrictEqual(definitions.map((item) => item.uri.toString()), [target.toString()]);
  }
  const localTypeUri = vscode.Uri.joinPath(folder, 'C1ScopedLocalType.php');
  const vendorTypeUri = vscode.Uri.joinPath(folder, 'C1ScopedVendorType.php');
  const typeUri = vscode.Uri.joinPath(folder, 'C1ScopedTypeConsumer.php');
  await vscode.workspace.fs.writeFile(localTypeUri, Buffer.from(
    '<?php namespace C1\\Scoped; class Item { public function localOnly(): void {} }'));
  await vscode.workspace.fs.writeFile(vendorTypeUri, Buffer.from(
    '<?php namespace C1\\Vendor; class Item { public function vendorOnly(): void {} }'));
  const typeSource = '<?php namespace C1\\Scoped { use C1\\Vendor\\Item; new Item(); } '
    + 'namespace C1\\Scoped { new Item(); }';
  await vscode.workspace.fs.writeFile(typeUri, Buffer.from(typeSource));
  await vscode.workspace.openTextDocument(localTypeUri);
  await vscode.workspace.openTextDocument(vendorTypeUri);
  const typeDocument = await vscode.workspace.openTextDocument(typeUri);
  await vscode.window.showTextDocument(typeDocument);
  for (const [last, target] of [[false, vendorTypeUri], [true, localTypeUri]] as const) {
    const start = last ? typeSource.lastIndexOf('new Item();') : typeSource.indexOf('new Item();');
    const position = typeDocument.positionAt(start + 'new '.length + 2);
    const definitions = await waitForResult(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', typeUri, position),
      (items) => items?.some((item) => item.uri.toString() === target.toString()) === true,
      'SoPHP did not resolve Item in its own namespace block.',
    );
    assert.deepStrictEqual(definitions.map((item) => item.uri.toString()), [target.toString()]);
  }
  const memberUri = vscode.Uri.joinPath(folder, 'C1ScopedMembers.php');
  const memberSource = '<?php namespace C1\\Scoped { use C1\\Vendor\\Item; '
    + 'function first(): void { $a = new Item(); $a->ven; } } '
    + 'namespace C1\\Scoped { function second(): void { $b = new Item(); $b->loc; } }';
  await vscode.workspace.fs.writeFile(memberUri, Buffer.from(memberSource));
  const memberDocument = await vscode.workspace.openTextDocument(memberUri);
  await vscode.window.showTextDocument(memberDocument);
  for (const [marker, expected, excluded] of [
    ['ven;', 'vendorOnly', 'localOnly'],
    ['loc;', 'localOnly', 'vendorOnly'],
  ] as const) {
    const position = memberDocument.positionAt(memberSource.indexOf(marker) + 3);
    const result = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', memberUri, position),
      (items) => items?.items.some((item) => item.label === expected) === true,
      'SoPHP did not complete the ' + expected + ' member in its own namespace block.',
    );
    assert.ok(!result.items.some((item) => item.label === excluded),
      'SoPHP suggested a member from the other namespace block.');
  }
  const parameterUri = vscode.Uri.joinPath(folder, 'C1ScopedParameters.php');
  const parameterSource = '<?php namespace C1\\Scoped { use C1\\Vendor\\Item; '
    + 'function first(Item $a): void { $a->ven; } } '
    + 'namespace C1\\Scoped { function second(Item $b): void { $b->loc; } }';
  await vscode.workspace.fs.writeFile(parameterUri, Buffer.from(parameterSource));
  const parameterDocument = await vscode.workspace.openTextDocument(parameterUri);
  await vscode.window.showTextDocument(parameterDocument);
  for (const [marker, expected, excluded] of [
    ['ven;', 'vendorOnly', 'localOnly'],
    ['loc;', 'localOnly', 'vendorOnly'],
  ] as const) {
    const position = parameterDocument.positionAt(parameterSource.indexOf(marker) + 3);
    const result = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', parameterUri, position),
      (items) => items?.items.some((item) => item.label === expected) === true,
      'SoPHP did not complete the ' + expected + ' parameter member in its own namespace block.',
    );
    assert.ok(!result.items.some((item) => item.label === excluded),
      'SoPHP suggested a parameter member from the other namespace block.');
  }
}

async function verifyKeywordCompletionSmoke(folder: vscode.Uri, phpVersion: string): Promise<void> {
  const cases = [
    { name: 'Return', source: '<?php\nfunction asdf() {\n    retu\n}', prefix: 'retu', expected: 'return' },
    { name: 'UnclosedReturn', source: '<?php\nfunction asdf() {\n    retu', prefix: 'retu', expected: 'return' },
    { name: 'Function', source: '<?php\nfunc', prefix: 'func', expected: 'function' },
    { name: 'FullFunction', source: '<?php\n$app = 1;\n// bootstrap complete\nfunction', prefix: 'function', expected: 'function' },
    { name: 'Method', source: '<?php\nclass Example { public func\n}', prefix: 'func', expected: 'function' },
    { name: 'FullMethod', source: '<?php class Functionality {} class Example { public function', prefix: 'function', expected: 'function' },
    { name: 'UnclosedMethod', source: '<?php\nclass Example { public func', prefix: 'func', expected: 'function' },
    { name: 'Foreach', source: '<?php\nfunction asdf() {\n    fore\n}', prefix: 'fore', expected: 'foreach' },
    { name: 'Throw', source: '<?php\nfunction asdf() {\n    thro\n}', prefix: 'thro', expected: 'throw' },
    { name: 'New', source: '<?php\n$app = n', prefix: 'n', expected: 'new' },
  ];
  for (const item of cases) {
    const uri = vscode.Uri.joinPath(folder, `C1Keyword${item.name}.php`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(item.source));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    const offset = item.source.lastIndexOf(item.prefix) + item.prefix.length;
    const completion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
        document.positionAt(offset)),
      (result) => result?.items.some((candidate) => candidate.label === item.expected
        && candidate.kind === vscode.CompletionItemKind.Keyword) === true,
      `SoPHP did not suggest ${item.expected} after ${item.prefix}.`,
    );
    const keyword = completion.items.find((candidate) => candidate.label === item.expected
      && candidate.kind === vscode.CompletionItemKind.Keyword);
    assert.strictEqual(keyword?.preselect, true, `${item.expected} was not selected ahead of symbols.`);
    assert.strictEqual(keyword?.textEdit?.newText, `${item.expected} `);
    if (item.name === 'Function' || item.name === 'FullFunction') {
      assert.ok(!completion.items.some((candidate) => ['func_get_arg', 'function_exists'].includes(String(candidate.label))),
        'A declaration keyword was mixed with unrelated callable names.');
    }
    if (item.name === 'FullMethod') {
      assert.ok(!completion.items.some((candidate) => candidate.label === 'Functionality'),
        'A complete method declaration keyword was mixed with a class name.');
    }
    console.log(`C1 ${item.name} completion: ${completion.items.slice(0, 8).map((candidate) => String(candidate.label)).join(', ')}`);
  }
  const namedSource = '<?php function fillValue(string $first): void {} function fillFromDefault(): string { return "ok"; } fillValue(fi);';
  const namedUri = vscode.Uri.joinPath(folder, 'C1NamedArgumentVersion.php');
  await vscode.workspace.fs.writeFile(namedUri, Buffer.from(namedSource));
  const namedDocument = await vscode.workspace.openTextDocument(namedUri);
  await vscode.window.showTextDocument(namedDocument);
  const namedOffset = namedSource.lastIndexOf('fillValue(fi') + 'fillValue(fi'.length;
  const namedCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', namedUri,
      namedDocument.positionAt(namedOffset)),
    (result) => result?.items.some((candidate) => candidate.label === (Number.parseFloat(phpVersion) < 8 ? 'fillFromDefault' : 'first:')) === true,
    `SoPHP did not return the expected argument completion for PHP ${phpVersion}.`,
  );
  const namedLabels = namedCompletion.items.map((candidate) => String(candidate.label));
  assert.strictEqual(namedLabels.includes('first:'), Number.parseFloat(phpVersion) >= 8,
    `Named argument completion used the wrong PHP syntax version: ${namedLabels.slice(0, 10).join(', ')}`);
  console.log(`C1 PHP ${phpVersion} argument completion: ${namedLabels.slice(0, 8).join(', ')}`);
  const enumSource = '<?php enum CompletionColor { case Red; public static function resolve(): self { return self::Red; } }'
    + ' class CompletionContainer { public static function resolve(): self { return new self(); } }'
    + ' function paint(CompletionC $color): void {} CompletionColor::res; CompletionContainer::res;';
  const enumUri = vscode.Uri.joinPath(folder, 'C1EnumVersion.php');
  await vscode.workspace.fs.writeFile(enumUri, Buffer.from(enumSource));
  const enumDocument = await vscode.workspace.openTextDocument(enumUri);
  await vscode.window.showTextDocument(enumDocument);
  const typeCandidates = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', enumUri,
      enumDocument.positionAt(enumSource.indexOf('CompletionC $color') + 'CompletionC'.length)),
    (result) => result?.items.some((candidate) => candidate.label === 'CompletionContainer') === true,
    'SoPHP did not preserve a normal class while checking the enum syntax version.',
  );
  const supportsEnums = Number.parseFloat(phpVersion) >= 8.1;
  assert.strictEqual(typeCandidates.items.some((candidate) => candidate.label === 'CompletionColor'), supportsEnums,
    `Enum type completion used the wrong PHP syntax version: ${phpVersion}`);
  const enumMethodCandidates = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', enumUri,
    enumDocument.positionAt(enumSource.indexOf('CompletionColor::res') + 'CompletionColor::res'.length));
  assert.strictEqual(enumMethodCandidates.items.some((candidate) => candidate.label === 'resolve'), supportsEnums,
    `Enum method completion used the wrong PHP syntax version: ${phpVersion}`);
  console.log(`C1 PHP ${phpVersion} enum completion: type=${supportsEnums}, method=${supportsEnums}`);
  const nullsafeSource = '<?php class CompletionWorker { public function run(): void {} }'
    + ' function useWorker(CompletionWorker $worker): void { $worker?->ru; $worker->ru; }';
  const nullsafeUri = vscode.Uri.joinPath(folder, 'C1NullsafeVersion.php');
  await vscode.workspace.fs.writeFile(nullsafeUri, Buffer.from(nullsafeSource));
  const nullsafeDocument = await vscode.workspace.openTextDocument(nullsafeUri);
  await vscode.window.showTextDocument(nullsafeDocument);
  for (const [marker, expected] of [
    ['$worker?->ru', Number.parseFloat(phpVersion) >= 8],
    ['$worker->ru', true],
  ] as const) {
    const candidates = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', nullsafeUri,
        nullsafeDocument.positionAt(nullsafeSource.indexOf(marker) + marker.length)),
      (result) => result !== undefined && (expected
        ? result.items.some((candidate) => candidate.label === 'run') : !result.isIncomplete),
      `SoPHP did not return a member completion list at ${marker}.`,
    );
    assert.strictEqual(candidates.items.some((candidate) => candidate.label === 'run'), expected,
      `Nullsafe member completion used the wrong PHP syntax version at ${marker}: ${phpVersion}`);
  }
  console.log(`C1 PHP ${phpVersion} nullsafe completion: ${Number.parseFloat(phpVersion) >= 8}`);
  const shapeSource = '<?php /** @return array{owner: string} */ function config(): array { return ["ow"]; }';
  const shapeUri = vscode.Uri.joinPath(folder, 'C1ReturnShapeCompletion.php');
  await vscode.workspace.fs.writeFile(shapeUri, Buffer.from(shapeSource));
  const shapeDocument = await vscode.workspace.openTextDocument(shapeUri);
  await vscode.window.showTextDocument(shapeDocument);
  const shapeCandidates = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', shapeUri,
      shapeDocument.positionAt(shapeSource.lastIndexOf('"ow"') + 3)),
    (result) => result?.items.some((candidate) => candidate.label === 'owner') === true,
    'SoPHP did not suggest the proven return array-shape key.',
  );
  const shapeKey = shapeCandidates.items.find((candidate) => candidate.label === 'owner');
  assert.strictEqual(shapeKey?.textEdit?.newText, '"owner" => ');
  console.log(`C1 PHP ${phpVersion} return shape completion: ${String(shapeKey?.label)}`);
}

async function verifyCompletionExperience(folder: vscode.Uri, debugPort?: number, phpVersion = '8.5'): Promise<void> {
  if (debugPort) {
    const bootstrapSource = "<?php\n\nif (!defined('ROOT_PATH')) {\n    throw new LogicException('missing');\n}\nuse App\\Components\\Configuration\\Config;\n";
    const bootstrapUri = vscode.Uri.joinPath(folder, 'C1IncrementalFunctionKeyword.php');
    await vscode.workspace.fs.writeFile(bootstrapUri, Buffer.from(bootstrapSource));
    const bootstrapDocument = await vscode.workspace.openTextDocument(bootstrapUri);
    const bootstrapEditor = await vscode.window.showTextDocument(bootstrapDocument);
    const insertion = bootstrapDocument.positionAt('<?php\n'.length);
    bootstrapEditor.selection = new vscode.Selection(insertion, insertion);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await typeWorkbenchText(debugPort, 'f');
    await waitForResult(async () => bootstrapDocument.getText(), (value) => value.startsWith('<?php\nf\n'),
      'Workbench did not insert the first function keyword character.');
    await visibleCompletionLabels(debugPort);
    for (const [index, letter] of ['u', 'n', 'c'].entries()) {
      await typeWorkbenchText(debugPort, letter);
      const prefix = `<?php\n${'func'.slice(0, index + 2)}\n`;
      await waitForResult(async () => bootstrapDocument.getText(), (value) => value.startsWith(prefix),
        `Workbench did not insert the function keyword prefix ${prefix}.`);
    }
    const incrementalStarted = Date.now();
    const incrementalLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels.length > 0 && labels.every((label) => /^function(?:\s|$)/u.test(label)),
      'Typing func after <?php did not withdraw stale prefix suggestions.');
    console.log(`C1 incremental func list after final character: ${Date.now() - incrementalStarted} ms`);
    console.log(`C1 incremental func visible: ${JSON.stringify(incrementalLabels.slice(0, 8))}`);
    assert.ok(incrementalLabels[0]?.startsWith('function'),
      `Typing func after <?php did not rank function first: ${JSON.stringify(incrementalLabels)}`);
    assert.ok(!incrementalLabels.some((label) => label.includes('func_get_arg') || label.includes('function_exists')),
      `Typing func after <?php kept unrelated function calls: ${JSON.stringify(incrementalLabels)}`);
    for (const letter of 'tion') await typeWorkbenchText(debugPort, letter);
    await waitForResult(async () => bootstrapDocument.getText(), (value) => value.startsWith('<?php\nfunction\n'),
      'Workbench did not insert the complete function keyword.');
    const fullKeywordLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels.length > 0 && labels.every((label) => /^function(?:\s|$)/u.test(label)),
      'The complete function keyword did not refresh its visible list.');
    console.log(`C1 incremental function visible: ${JSON.stringify(fullKeywordLabels.slice(0, 8))}`);
    assert.ok(fullKeywordLabels[0]?.startsWith('function'),
      `Typing function after <?php lost the keyword suggestion: ${JSON.stringify(fullKeywordLabels)}`);
    assert.ok(!fullKeywordLabels.some((label) => label.includes('function_exists')),
      `Typing function after <?php kept an unrelated function call: ${JSON.stringify(fullKeywordLabels)}`);
    const classSource = '<?php\nfunction prior(): array { return []; }\n\n';
    const classUri = vscode.Uri.joinPath(folder, 'C1IncrementalClassKeyword.php');
    await vscode.workspace.fs.writeFile(classUri, Buffer.from(classSource));
    const classDocument = await vscode.workspace.openTextDocument(classUri);
    const classEditor = await vscode.window.showTextDocument(classDocument);
    const classPosition = classDocument.positionAt(classSource.length);
    classEditor.selection = new vscode.Selection(classPosition, classPosition);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await typeWorkbenchText(debugPort, 'c');
    await waitForResult(async () => classDocument.getText(), (value) => value.endsWith('\nc'),
      'Workbench did not insert the first class keyword character.');
    await waitForResult(() => visibleCompletionLabels(debugPort), (labels) => labels[0]?.startsWith('class') === true,
      'Typing c at top level did not offer the class keyword first.').catch(async (error: unknown) => {
        const actual = await boundedCompletion(classUri, classEditor.selection.active);
        console.log(`C1 class prefix Provider diagnostics: ${JSON.stringify({ text: classDocument.getText(),
          labels: actual?.items.slice(0, 10).map((item) => item.label), language: classDocument.languageId })}`);
        throw error;
      });
    for (const letter of 'las') await typeWorkbenchText(debugPort, letter);
    await waitForResult(async () => classDocument.getText(), (value) => value.endsWith('\nclas'),
      'Workbench did not insert the partial class keyword.');
    const partialClassLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels[0]?.startsWith('class') === true && !labels.some((label) => label.includes('class_exists')),
      'The partial class keyword did not refresh its visible list.');
    assert.ok(partialClassLabels[0]?.startsWith('class'),
      `Typing clas did not rank class first: ${JSON.stringify(partialClassLabels)}`);
    assert.ok(!partialClassLabels.some((label) => label.includes('class_exists')),
      `Typing clas retained function completions from c: ${JSON.stringify(partialClassLabels)}`);
    const classNameSource = '<?php\nclass \n';
    const classNameUri = vscode.Uri.joinPath(folder, 'C1ClassDeclarationName.php');
    await vscode.workspace.fs.writeFile(classNameUri, Buffer.from(classNameSource));
    const classNameDocument = await vscode.workspace.openTextDocument(classNameUri);
    const classNameEditor = await vscode.window.showTextDocument(classNameDocument);
    const classNamePosition = classNameDocument.positionAt('<?php\nclass '.length);
    classNameEditor.selection = new vscode.Selection(classNamePosition, classNamePosition);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await typeWorkbenchText(debugPort, 'C');
    await waitForResult(async () => classNameDocument.getText(), (value) => value.startsWith('<?php\nclass C\n'),
      'Workbench did not insert the class declaration name.');
    const classNameLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels[0]?.startsWith('C1ClassDeclarationName') === true
        && !labels.some((label) => /call_user_func|CREDITS_ALL/u.test(label)),
      'The class name did not refresh its filename-only visible list.');
    assert.ok(classNameLabels[0]?.startsWith('C1ClassDeclarationName')
      && !classNameLabels.some((label) => /call_user_func|CREDITS_ALL/u.test(label)),
    `Typing class C did not show only the current filename suggestion: ${JSON.stringify(classNameLabels)}`);
    const memberKeywordSource = '<?php\nclass C {\n    \n}\n';
    const memberKeywordUri = vscode.Uri.joinPath(folder, 'C1ClassMemberKeyword.php');
    await vscode.workspace.fs.writeFile(memberKeywordUri, Buffer.from(memberKeywordSource));
    const memberKeywordDocument = await vscode.workspace.openTextDocument(memberKeywordUri);
    const memberKeywordEditor = await vscode.window.showTextDocument(memberKeywordDocument);
    const memberKeywordPosition = memberKeywordDocument.positionAt(memberKeywordSource.indexOf('    \n') + 4);
    memberKeywordEditor.selection = new vscode.Selection(memberKeywordPosition, memberKeywordPosition);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await typeWorkbenchText(debugPort, 'pu');
    await waitForResult(async () => memberKeywordDocument.getText(), (value) => value.includes('    pu\n'),
      'Workbench did not insert the class member keyword prefix.');
    const memberKeywordLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels[0]?.startsWith('public') === true && !labels.some((label) => /putenv|PHP_URL_/u.test(label)),
      'The class member prefix did not refresh its public-first visible list.');
    assert.ok(memberKeywordLabels[0]?.startsWith('public')
      && !memberKeywordLabels.some((label) => /putenv|PHP_URL_/u.test(label)),
    `Typing pu inside a class displayed global symbols: ${JSON.stringify(memberKeywordLabels)}`);
    const magicSource = '<?php\nclass Magic {\n    public function __co\n}\n';
    const magicUri = vscode.Uri.joinPath(folder, 'C1MagicMethodName.php');
    await vscode.workspace.fs.writeFile(magicUri, Buffer.from(magicSource));
    const magicDocument = await vscode.workspace.openTextDocument(magicUri);
    const magicEditor = await vscode.window.showTextDocument(magicDocument);
    const magicPosition = magicDocument.positionAt(magicSource.indexOf('__co') + '__co'.length);
    magicEditor.selection = new vscode.Selection(magicPosition, magicPosition);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await typeWorkbenchText(debugPort, 'n');
    await waitForResult(async () => magicDocument.getText(), (value) => value.includes('function __con\n'),
      'Workbench did not insert the magic method prefix.');
    const magicLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels[0]?.startsWith('__construct') === true,
      'Typing __con after function did not suggest __construct.');
    assert.ok(!magicLabels.some((label) => /func_get_arg|PHP_URL_/u.test(label)),
      `Magic method completion displayed unrelated symbols: ${JSON.stringify(magicLabels)}`);
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => magicDocument.getText(), (value) => value.includes('function __construct()'),
      'Accepting __construct did not insert method parentheses.');
    const enumSource = '<?php\nclass C {\n}\n';
    const enumUri = vscode.Uri.joinPath(folder, 'C1EnumDeclaration.php');
    await vscode.workspace.fs.writeFile(enumUri, Buffer.from(enumSource));
    const enumDocument = await vscode.workspace.openTextDocument(enumUri);
    const enumEditor = await vscode.window.showTextDocument(enumDocument);
    const enumPosition = enumDocument.positionAt(enumSource.length);
    enumEditor.selection = new vscode.Selection(enumPosition, enumPosition);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    for (const letter of 'enu') await typeWorkbenchText(debugPort, letter);
    await waitForResult(async () => enumDocument.getText(), (value) => value.endsWith('enu'),
      'Workbench did not insert the enum keyword prefix.');
    const enumKeywordLabels = await visibleCompletionLabels(debugPort);
    if (Number.parseFloat(phpVersion) >= 8.1) {
      assert.ok(enumKeywordLabels[0]?.startsWith('enum')
        && !enumKeywordLabels.some((label) => label.includes('enum_exists')),
      `Typing enu did not isolate the enum keyword: ${JSON.stringify(enumKeywordLabels)}`);
      await typeWorkbenchText(debugPort, 'm');
      await waitForResult(async () => enumDocument.getText(), (value) => value.endsWith('enum'),
        'Workbench did not insert the complete enum keyword.');
      const fullEnumKeywordLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
        (labels) => labels[0]?.startsWith('enum') === true && !labels.some((label) => label.includes('enum_exists')),
        'The complete enum keyword did not refresh its visible list.');
      assert.ok(fullEnumKeywordLabels[0]?.startsWith('enum')
        && !fullEnumKeywordLabels.some((label) => label.includes('enum_exists')),
      `Typing enum after a class displayed unrelated functions: ${JSON.stringify(fullEnumKeywordLabels)}`);
      // This scenario checks ordinary typing. Keep bulk insertion across the
      // word boundary in the separate SuggestModel reentrancy probe.
      for (const character of ' e') await typeWorkbenchText(debugPort, character);
      await waitForResult(async () => enumDocument.getText(), (value) => value.endsWith('enum e'),
        'Workbench did not insert the enum declaration name prefix.');
      const enumNameVersion = enumDocument.version;
      const enumNameCandidates = await boundedCompletion(enumUri, enumEditor.selection.active);
      assert.strictEqual(enumDocument.version, enumNameVersion, 'Enum name changed while checking its candidates.');
      // This API also returns VS Code's static snippets, which the PHP UI hides
      // through editor.snippetSuggestions=none. Check semantic candidates here;
      // the visible-list assertion below still checks the complete actual UI.
      assert.deepStrictEqual(enumNameCandidates?.items.filter(item => item.kind !== vscode.CompletionItemKind.Snippet) ?? [], [],
        'The current enum name request returned unrelated semantic candidates.');
      const enumNameLabels = await waitForResult(() => visibleCompletionLabels(debugPort), (labels) => labels.length === 0,
        'The previous enum keyword list was not withdrawn at the declaration name.');
      assert.deepStrictEqual(enumNameLabels, [],
        `Typing enum e displayed unrelated symbols: ${JSON.stringify(enumNameLabels)}`);
    } else {
      for (const label of enumKeywordLabels) assert.ok(!/^enum(?:$| block|_exists)/u.test(label),
        `PHP ${phpVersion} displayed an unavailable enum candidate: ${label}`);
      const unavailable = await boundedCompletion(enumUri, enumEditor.selection.active);
      assert.ok(!unavailable?.items.some(item => item.label === 'enum' || item.label === 'enum block' || item.label === 'enum_exists'),
        `PHP ${phpVersion} Provider exposed an unavailable enum candidate.`);
      await typeWorkbenchText(debugPort, 'm');
      await waitForResult(async () => enumDocument.getText(), value => value.endsWith('enum'),
        'Workbench did not insert the complete unsupported enum word.');
      const fullUnavailable = await boundedCompletion(enumUri, enumEditor.selection.active);
      assert.ok(!fullUnavailable?.items.some(item => item.label === 'enum' || item.label === 'enum block' || item.label === 'enum_exists'),
        `PHP ${phpVersion} Provider exposed an unavailable complete enum candidate.`);
      console.log(`C1 PHP ${phpVersion} enum keyword and builtin absence passed`);
    }
    const returnSource = '<?php\nfunction example(): void {\n    \n}\n';
    const returnUri = vscode.Uri.joinPath(folder, 'C1IncrementalReturnKeyword.php');
    await vscode.workspace.fs.writeFile(returnUri, Buffer.from(returnSource));
    const returnDocument = await vscode.workspace.openTextDocument(returnUri);
    const returnEditor = await vscode.window.showTextDocument(returnDocument);
    const returnPosition = returnDocument.positionAt(returnSource.indexOf('    \n') + 4);
    returnEditor.selection = new vscode.Selection(returnPosition, returnPosition);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await typeWorkbenchText(debugPort, 'r');
    await waitForResult(async () => returnDocument.getText(), (value) => value.includes('    r\n'),
      'Workbench did not insert the first return keyword character.');
    const returnLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels[0]?.startsWith('return') === true,
      'Typing r in a function body did not rank return first.');
    console.log(`C1 incremental r visible: ${JSON.stringify(returnLabels.slice(0, 8))}`);
    await typeWorkbenchText(debugPort, 'etu');
    await waitForResult(async () => returnDocument.getText(), (value) => value.includes('    retu\n'),
      'Workbench did not insert the return keyword prefix.');
    await waitForResult(() => visibleCompletionLabels(debugPort), (labels) => labels[0]?.startsWith('return') === true,
      'Return completion disappeared before acceptance.');
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => returnDocument.getText(), (value) => value.includes('    return \n'),
      'Accepting return before a newline did not leave a space for the expression.');
    const declarationSource = '<?php\nfunction \nif (!defined("ROOT_PATH")) {}\n';
    const declarationUri = vscode.Uri.joinPath(folder, 'C1FunctionNameSnippets.php');
    await vscode.workspace.fs.writeFile(declarationUri, Buffer.from(declarationSource));
    const declarationDocument = await vscode.workspace.openTextDocument(declarationUri);
    const declarationEditor = await vscode.window.showTextDocument(declarationDocument);
    const declarationPosition = declarationDocument.positionAt('<?php\nfunction '.length);
    declarationEditor.selection = new vscode.Selection(declarationPosition, declarationPosition);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await typeWorkbenchText(debugPort, 'a');
    await waitForResult(async () => declarationDocument.getText(), (value) => value.startsWith('<?php\nfunction a\n'),
      'Workbench did not insert the declaration name character.');
    assert.strictEqual(vscode.workspace.getConfiguration('editor', { uri: declarationUri, languageId: 'php' })
      .get('snippetSuggestions'), 'none',
      'PHP snippets must be hidden from automatic suggestions under SoPHP ownership.');
    const declarationLabels = await visibleCompletionLabels(debugPort);
    assert.deepStrictEqual(declarationLabels, [],
      `Typing a function declaration name displayed unrelated PHP snippets: ${JSON.stringify(declarationLabels)}`);
    const templateSource = '<?php\nfunc';
    const templateUri = vscode.Uri.joinPath(folder, 'C1TemplateAfterSnippetSetting.php');
    await vscode.workspace.fs.writeFile(templateUri, Buffer.from(templateSource));
    const templateDocument = await vscode.workspace.openTextDocument(templateUri);
    const templateEditor = await vscode.window.showTextDocument(templateDocument);
    const templatePosition = templateDocument.positionAt(templateSource.length);
    templateEditor.selection = new vscode.Selection(templatePosition, templatePosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const templateLabels = await visibleCompletionLabels(debugPort);
    assert.ok(templateLabels.some((label) => label.startsWith('function block')),
      `Hiding built-in PHP snippets also hid the contextual SoPHP declaration template: ${JSON.stringify(templateLabels)}`);
    const constructorSource = '<?php\n$value = new ArrayOb;\n';
    const constructorUri = vscode.Uri.joinPath(folder, 'C1ConstructorAcceptance.php');
    await vscode.workspace.fs.writeFile(constructorUri, Buffer.from(constructorSource));
    const constructorDocument = await vscode.workspace.openTextDocument(constructorUri);
    const constructorEditor = await vscode.window.showTextDocument(constructorDocument);
    const constructorPosition = constructorDocument.positionAt(constructorSource.indexOf('ArrayOb;') + 'ArrayOb'.length);
    const constructorItems = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', constructorUri, constructorPosition),
      (result) => result?.items.some((item) => item.label === 'ArrayObject') === true,
      'SoPHP did not offer ArrayObject in a new expression.',
    );
    const constructorItem = constructorItems.items.find((item) => item.label === 'ArrayObject');
    assert.ok(constructorItem?.insertText instanceof vscode.SnippetString);
    assert.strictEqual(constructorItem.insertText.value, 'ArrayObject($0)');
    constructorEditor.selection = new vscode.Selection(constructorPosition, constructorPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    assert.ok((await visibleCompletionLabels(debugPort)).some((label) => label.startsWith('ArrayObject')));
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => constructorDocument.getText(), (value) => value.includes('new ArrayObject();'),
      'Accepting ArrayObject did not insert constructor parentheses.');
    assert.strictEqual(constructorDocument.getText()[constructorDocument.offsetAt(constructorEditor.selection.active)], ')',
      'Constructor completion did not leave the cursor inside parentheses.');
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const argumentLabels = await visibleCompletionLabels(debugPort);
    if (Number.parseFloat(phpVersion) >= 8) {
      assert.ok(argumentLabels[0]?.startsWith('array:'),
        `ArrayObject constructor lost its named argument suggestions: ${JSON.stringify(argumentLabels)}`);
    } else {
      assert.ok(!argumentLabels.some(label => /^(?:array|input|flags|iteratorClass|iterator_class):/u.test(label)),
        `PHP ${phpVersion} displayed unsupported named constructor arguments: ${JSON.stringify(argumentLabels)}`);
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider',
        constructorUri, constructorEditor.selection.active);
      assert.ok(signature?.signatures.some(item => item.label.includes('ArrayObject(')),
        `PHP ${phpVersion} lost the positional ArrayObject constructor signature.`);
    }
  }
  const source = '<?php function sendInvoice(string $message): void {} function run(): void { sendInv }';
  const uri = vscode.Uri.joinPath(folder, 'C1CompletionExperience.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const offset = source.indexOf('sendInv }') + 'sendInv'.length;
  const position = document.positionAt(offset);
  const completions = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
    (result) => result?.items.some((item) => item.label === 'sendInvoice') === true,
    'SoPHP did not provide the callable completion in the isolated editor.',
  );
  const callable = completions.items.find((item) => item.label === 'sendInvoice');
  assert.ok(callable?.insertText instanceof vscode.SnippetString);
  assert.strictEqual(callable.insertText.value, 'sendInvoice(${1:message})$0');
  editor.selection = new vscode.Selection(position, position);
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  if (debugPort) {
    const labels = await visibleCompletionLabels(debugPort);
    assert.ok(labels.some((label) => label.includes('sendInvoice')), 'The visible Workbench list omitted sendInvoice.');
  } else await new Promise<void>((resolve) => setTimeout(resolve, 300));
  if (debugPort) await pressWorkbenchEnter(debugPort);
  else await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.ok(document.getText().includes('sendInvoice(message)'), 'Accepting the visible function suggestion left incorrect call text.');
  assert.strictEqual(document.getText(editor.selection), 'message', 'The callable snippet did not select its first argument.');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(document.getText(), source, 'Undo did not restore the text after accepting a callable suggestion.');
  if (debugPort) {
    const keywordSource = '<?php\nfunction';
    const keywordUri = vscode.Uri.joinPath(folder, 'C1KeywordMiddleAcceptance.php');
    await vscode.workspace.fs.writeFile(keywordUri, Buffer.from(keywordSource));
    const keywordDocument = await vscode.workspace.openTextDocument(keywordUri);
    const keywordEditor = await vscode.window.showTextDocument(keywordDocument);
    const keywordPosition = keywordDocument.positionAt(keywordSource.indexOf('function') + 'funct'.length);
    keywordEditor.selection = new vscode.Selection(keywordPosition, keywordPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    assert.ok((await visibleCompletionLabels(debugPort)).some((label) => label.includes('function')),
      'The visible list omitted function inside its complete word.');
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => keywordDocument.getText(), (text) => text === '<?php\nfunction ',
      'Accepting function inside its word duplicated the suffix or omitted the trailing space.');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(keywordDocument.getText(), keywordSource);
  }
  const memberSource = '<?php class CompletionCounter { public function getUserCount(): int { return 1; } } function completionRead(CompletionCounter $counter): void { $counter->getUserCount; }';
  const memberUri = vscode.Uri.joinPath(folder, 'C1MemberWordAcceptance.php');
  await vscode.workspace.fs.writeFile(memberUri, Buffer.from(memberSource));
  const memberDocument = await vscode.workspace.openTextDocument(memberUri);
  const memberEditor = await vscode.window.showTextDocument(memberDocument);
  const memberPosition = memberDocument.positionAt(memberSource.lastIndexOf('getUserCount;') + 'getUs'.length);
  const memberItems = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', memberUri, memberPosition),
    (result) => result?.items.some((item) => item.label === 'getUserCount') === true,
    'SoPHP did not offer getUserCount inside an existing member word.',
  );
  const member = memberItems.items.find((item) => item.label === 'getUserCount');
  const memberRange = member?.range instanceof vscode.Range ? member.range : member?.range?.replacing;
  assert.ok(memberRange, 'VS Code did not preserve the full member replacement range.');
  assert.strictEqual(memberDocument.getText(memberRange), 'getUserCount');
  memberEditor.selection = new vscode.Selection(memberPosition, memberPosition);
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  if (debugPort) assert.ok((await visibleCompletionLabels(debugPort)).some((label) => label.includes('getUserCount')));
  else await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  await waitForResult(async () => memberDocument.getText(), (text) => text.includes('$counter->getUserCount();'),
    'Accepting getUserCount duplicated or damaged the existing suffix.');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(memberDocument.getText(), memberSource);
  const acronymOffset = memberSource.lastIndexOf('getUserCount;');
  assert.ok(await memberEditor.edit((edit) => edit.replace(new vscode.Range(
    memberDocument.positionAt(acronymOffset), memberDocument.positionAt(acronymOffset + 'getUserCount'.length)), 'guc')));
  const acronymPosition = memberDocument.positionAt(acronymOffset + 'guc'.length);
  await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', memberUri, acronymPosition),
    (result) => result?.items.some((item) => item.label === 'getUserCount') === true,
    'SoPHP did not show getUserCount for the guc abbreviation after an unsaved edit.',
  );
  memberEditor.selection = new vscode.Selection(acronymPosition, acronymPosition);
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  if (debugPort) assert.ok((await visibleCompletionLabels(debugPort)).some((label) => label.includes('getUserCount')),
    'The visible Workbench list omitted getUserCount for guc.');
  if (debugPort) {
    assert.ok(await memberEditor.edit((edit) => edit.replace(new vscode.Range(
      memberDocument.positionAt(acronymOffset), memberDocument.positionAt(acronymOffset + 'guc'.length)), 'user')));
    const interiorPosition = memberDocument.positionAt(acronymOffset + 'user'.length);
    memberEditor.selection = new vscode.Selection(interiorPosition, interiorPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    assert.ok((await visibleCompletionLabels(debugPort)).some((label) => label.includes('getUserCount')),
      'The visible Workbench list omitted getUserCount for an interior word.');
    const snakeSource = '<?php function get_user_count(): int { return 1; } function completionSnake(): int { return guc; }';
    const snakeUri = vscode.Uri.joinPath(folder, 'C1SnakeAcronym.php');
    await vscode.workspace.fs.writeFile(snakeUri, Buffer.from(snakeSource));
    const snakeDocument = await vscode.workspace.openTextDocument(snakeUri);
    const snakeEditor = await vscode.window.showTextDocument(snakeDocument);
    const snakePosition = snakeDocument.positionAt(snakeSource.lastIndexOf('guc;') + 'guc'.length);
    snakeEditor.selection = new vscode.Selection(snakePosition, snakePosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    assert.ok((await visibleCompletionLabels(debugPort)).some((label) => label.includes('get_user_count')),
      'The visible Workbench list omitted get_user_count for guc.');
    const rankingSource = "<?php function completionOptionNumber(): int { return 1; } const completionOptionText = 'ready'; function completionTakeText(string $value): void {} completionTakeText(completionOption);";
    const rankingUri = vscode.Uri.joinPath(folder, 'C1CrossKindRanking.php');
    await vscode.workspace.fs.writeFile(rankingUri, Buffer.from(rankingSource));
    const rankingDocument = await vscode.workspace.openTextDocument(rankingUri);
    const rankingEditor = await vscode.window.showTextDocument(rankingDocument);
    const rankingPosition = rankingDocument.positionAt(rankingSource.lastIndexOf('completionOption') + 'completionOption'.length);
    rankingEditor.selection = new vscode.Selection(rankingPosition, rankingPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const rankedLabels = await visibleCompletionLabels(debugPort);
    const compatible = rankedLabels.findIndex((label) => label.includes('completionOptionText'));
    const incompatible = rankedLabels.findIndex((label) => label.includes('completionOptionNumber'));
    assert.ok(compatible >= 0 && incompatible >= 0 && compatible < incompatible,
      `The visible Workbench list did not rank the compatible constant first: ${JSON.stringify(rankedLabels)}`);
    const memberRankingSource = '<?php class CompletionBuilder { public function makeInt(): int { return 1; } public function makeUnknown() {} public function makeText(): string { return "a"; } } function completionTakeString(string $value): void {} function completionRun(CompletionBuilder $builder): void { completionTakeString($builder->make); }';
    const memberRankingUri = vscode.Uri.joinPath(folder, 'C1MemberTypeRanking.php');
    await vscode.workspace.fs.writeFile(memberRankingUri, Buffer.from(memberRankingSource));
    const memberRankingDocument = await vscode.workspace.openTextDocument(memberRankingUri);
    const memberRankingEditor = await vscode.window.showTextDocument(memberRankingDocument);
    const memberRankingPosition = memberRankingDocument.positionAt(memberRankingSource.lastIndexOf('$builder->make') + '$builder->make'.length);
    memberRankingEditor.selection = new vscode.Selection(memberRankingPosition, memberRankingPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const memberRankedLabels = await visibleCompletionLabels(debugPort);
    const memberRanks = ['makeText', 'makeUnknown', 'makeInt'].map((name) => memberRankedLabels.findIndex((label) => label.includes(name)));
    assert.ok(memberRanks.every((index) => index >= 0) && memberRanks[0]! < memberRanks[1]! && memberRanks[1]! < memberRanks[2]!,
      `The visible Workbench list did not rank compatible member results first: ${JSON.stringify(memberRankedLabels)}`);
    const argumentLead = Number.parseFloat(phpVersion) >= 8 ? 'value: ' : '';
    const bareArgumentSource = `<?php function completionTake(string $value): void {} function completionRun(string $name, int $number): void { completionTake(${argumentLead}); }`;
    const bareArgumentUri = vscode.Uri.joinPath(folder, 'C1BareArgumentAcceptance.php');
    await vscode.workspace.fs.writeFile(bareArgumentUri, Buffer.from(bareArgumentSource));
    const bareArgumentDocument = await vscode.workspace.openTextDocument(bareArgumentUri);
    const bareArgumentEditor = await vscode.window.showTextDocument(bareArgumentDocument);
    const bareArgumentPosition = bareArgumentDocument.positionAt(bareArgumentSource.lastIndexOf('completionTake(')
      + 'completionTake('.length + argumentLead.length);
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', bareArgumentUri, bareArgumentPosition),
      (result) => result?.items.some((item) => item.label === '$name') === true,
      'SoPHP did not offer a compatible local variable at a blank argument.',
    );
    bareArgumentEditor.selection = new vscode.Selection(bareArgumentPosition, bareArgumentPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const bareArgumentLabels = await visibleCompletionLabels(debugPort);
    const localName = bareArgumentLabels.findIndex((label) => label.includes('$name'));
    const wrongType = bareArgumentLabels.findIndex((label) => label.includes('$number'));
    assert.ok(localName >= 0 && (wrongType < 0 || localName < wrongType),
      `The visible Workbench list did not prioritize the compatible local: ${JSON.stringify(bareArgumentLabels)}`);
    assert.ok(!bareArgumentLabels.some((label) => label.includes('completionTake')),
      `The blank typed argument mixed in unprefixed function names: ${JSON.stringify(bareArgumentLabels)}`);
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => bareArgumentDocument.getText(),
      (text) => text.includes(`completionTake(${argumentLead}$name);`),
      'Accepting a compatible local variable did not fill the blank argument.');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(bareArgumentDocument.getText(), bareArgumentSource);
    const literalSource = "<?php /** @param 'draft'|'final' $state */ function completionSetState(string $state): void {} completionSetState(dra);";
    const literalUri = vscode.Uri.joinPath(folder, 'C1LiteralValueAcceptance.php');
    await vscode.workspace.fs.writeFile(literalUri, Buffer.from(literalSource));
    const literalDocument = await vscode.workspace.openTextDocument(literalUri);
    const literalEditor = await vscode.window.showTextDocument(literalDocument);
    const literalPosition = literalDocument.positionAt(literalSource.lastIndexOf('dra') + 3);
    literalEditor.selection = new vscode.Selection(literalPosition, literalPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const literalLabels = await visibleCompletionLabels(debugPort);
    assert.ok(literalLabels.some((label) => label.includes("'draft'")) && !literalLabels.some((label) => label.includes("'final'")),
      `The visible Workbench list did not filter PHPDoc literal values: ${JSON.stringify(literalLabels)}`);
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => literalDocument.getText(),
      (text) => text.includes("completionSetState('draft');"),
      'Accepting a PHPDoc literal value did not insert the quoted expression.');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(literalDocument.getText(), literalSource);
    const quotedLiteralSource = literalSource.replaceAll('completionSetState', 'completionSetQuotedState')
      .replace('completionSetQuotedState(dra);', "completionSetQuotedState('dra');");
    const quotedLiteralUri = vscode.Uri.joinPath(folder, 'C1QuotedLiteralValueAcceptance.php');
    await vscode.workspace.fs.writeFile(quotedLiteralUri, Buffer.from(quotedLiteralSource));
    const quotedLiteralDocument = await vscode.workspace.openTextDocument(quotedLiteralUri);
    const quotedLiteralEditor = await vscode.window.showTextDocument(quotedLiteralDocument);
    const quotedLiteralPosition = quotedLiteralDocument.positionAt(quotedLiteralSource.lastIndexOf('dra') + 3);
    quotedLiteralEditor.selection = new vscode.Selection(quotedLiteralPosition, quotedLiteralPosition);
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        quotedLiteralUri, quotedLiteralPosition),
      (result) => result?.items.some((item) => item.label === "'draft'") === true,
      'The VS Code completion provider did not return the quoted PHPDoc literal value.',
    );
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const quotedLiteralLabels = await waitForResult(
      () => visibleCompletionLabels(debugPort),
      (labels) => labels.some((label) => label.includes("'draft'")),
      'The visible Workbench list did not show the quoted PHPDoc literal value.',
    );
    assert.ok(quotedLiteralLabels.some((label) => label.includes("'draft'"))
      && !quotedLiteralLabels.some((label) => label.includes("'final'")),
    `The visible Workbench list did not filter quoted PHPDoc literal values: ${JSON.stringify(quotedLiteralLabels)}`);
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => quotedLiteralDocument.getText(),
      (text) => text.includes("completionSetQuotedState('draft');"),
      'Accepting a quoted PHPDoc literal value duplicated the existing quotes.');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(quotedLiteralDocument.getText(), quotedLiteralSource);
    const unclosedLiteralSource = literalSource.replaceAll('completionSetState', 'completionSetUnclosedState')
      .replace('completionSetUnclosedState(dra);', "completionSetUnclosedState('dra");
    const unclosedLiteralUri = vscode.Uri.joinPath(folder, 'C1UnclosedLiteralValueAcceptance.php');
    await vscode.workspace.fs.writeFile(unclosedLiteralUri, Buffer.from(unclosedLiteralSource));
    const unclosedLiteralDocument = await vscode.workspace.openTextDocument(unclosedLiteralUri);
    const unclosedLiteralEditor = await vscode.window.showTextDocument(unclosedLiteralDocument);
    const unclosedLiteralPosition = unclosedLiteralDocument.positionAt(unclosedLiteralSource.length);
    unclosedLiteralEditor.selection = new vscode.Selection(unclosedLiteralPosition, unclosedLiteralPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    assert.ok((await visibleCompletionLabels(debugPort)).some((label) => label.includes("'draft'")),
      'The visible Workbench list omitted a proven value in an unclosed string.');
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => unclosedLiteralDocument.getText(),
      (text) => text.endsWith("completionSetUnclosedState('draft'"),
      'Accepting an unclosed PHPDoc literal did not add the closing quote.');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(unclosedLiteralDocument.getText(), unclosedLiteralSource);
    const shapeLiteralSource = "<?php /** @param array{status: 'draft'|'final'} $input */ function completionSendShape(array $input): void {} completionSendShape(['status' => 'dra']);";
    const shapeLiteralUri = vscode.Uri.joinPath(folder, 'C1ShapeLiteralValueAcceptance.php');
    await vscode.workspace.fs.writeFile(shapeLiteralUri, Buffer.from(shapeLiteralSource));
    const shapeLiteralDocument = await vscode.workspace.openTextDocument(shapeLiteralUri);
    const shapeLiteralEditor = await vscode.window.showTextDocument(shapeLiteralDocument);
    const shapeLiteralPosition = shapeLiteralDocument.positionAt(shapeLiteralSource.lastIndexOf('dra') + 3);
    shapeLiteralEditor.selection = new vscode.Selection(shapeLiteralPosition, shapeLiteralPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const shapeLiteralLabels = await waitForResult(
      () => visibleCompletionLabels(debugPort),
      (labels) => labels.some((label) => label.includes("'draft'")),
      'The visible Workbench list did not show the array-shape literal value.',
    );
    assert.ok(shapeLiteralLabels.some((label) => label.includes("'draft'"))
      && !shapeLiteralLabels.some((label) => label.includes("'final'")),
    `The visible Workbench list did not filter array-shape literal values: ${JSON.stringify(shapeLiteralLabels)}`);
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => shapeLiteralDocument.getText(),
      (text) => text.endsWith("completionSendShape(['status' => 'draft']);"),
      'Accepting an array-shape literal value duplicated the existing quotes.');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(shapeLiteralDocument.getText(), shapeLiteralSource);
    const openShapeSource = "<?php /** @param array{status: 'draft'|'final'} $config */ function completionUpdateOpenShape(array $config): void { $config = ['status' => 'dra";
    const openShapeUri = vscode.Uri.joinPath(folder, 'C1OpenShapeLiteralValueAcceptance.php');
    await vscode.workspace.fs.writeFile(openShapeUri, Buffer.from(openShapeSource));
    const openShapeDocument = await vscode.workspace.openTextDocument(openShapeUri);
    const openShapeEditor = await vscode.window.showTextDocument(openShapeDocument);
    const openShapePosition = openShapeDocument.positionAt(openShapeSource.length);
    openShapeEditor.selection = new vscode.Selection(openShapePosition, openShapePosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const openShapeLabels = await waitForResult(
      () => visibleCompletionLabels(debugPort),
      (labels) => labels.some((label) => label.includes("'draft'")),
      'The visible Workbench list did not show the unclosed assignment shape value.',
    );
    assert.ok(!openShapeLabels.some((label) => label.includes("'final'")),
      `The visible Workbench list included a mismatched shape value: ${JSON.stringify(openShapeLabels)}`);
    await pressWorkbenchEnter(debugPort);
    await waitForResult(async () => openShapeDocument.getText(),
      (text) => text.endsWith("$config = ['status' => 'draft'"),
      'Accepting an unclosed assignment shape value did not close the quote.');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(openShapeDocument.getText(), openShapeSource);
    const templateSource = '<?php function completionTemplateRun(): void { if }';
    const templateUri = vscode.Uri.joinPath(folder, 'C1TemplateAcceptance.php');
    await vscode.workspace.fs.writeFile(templateUri, Buffer.from(templateSource));
    const templateDocument = await vscode.workspace.openTextDocument(templateUri);
    const templateEditor = await vscode.window.showTextDocument(templateDocument);
    const templatePosition = templateDocument.positionAt(templateSource.indexOf('if }') + 2);
    const templateItems = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', templateUri, templatePosition),
      (result) => result?.items.some((item) => item.label === 'if block') === true,
      'SoPHP did not offer the if block template.',
    );
    assert.ok(templateItems.items.some((item) => item.label === 'if' && item.preselect));
    templateEditor.selection = new vscode.Selection(templatePosition, templatePosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const templateLabels = await visibleCompletionLabels(debugPort);
    assert.ok(templateLabels.some((label) => label.includes('if block')), 'The visible list omitted the if block template.');
    await vscode.commands.executeCommand('selectNextSuggestion');
    await pressWorkbenchTab(debugPort);
    await waitForResult(async () => templateDocument.getText(), (text) => text.includes('if (condition) {'),
      'Pressing Tab did not accept the if block template.');
    assert.strictEqual(templateDocument.getText(templateEditor.selection), 'condition',
      'The if block template did not select its condition placeholder.');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(templateDocument.getText(), templateSource, 'Undo did not restore the source after accepting the if block template.');
    const shortTypeUri = vscode.Uri.joinPath(folder, 'ShortProjectType.php');
    await vscode.workspace.fs.writeFile(shortTypeUri, Buffer.from('<?php namespace App\\C1; class ShortProjectType {}'));
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'ShallowType.php'),
      Buffer.from('<?php namespace App\\C1; class ShallowType {}'));
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'OtherProjectType.php'),
      Buffer.from('<?php namespace App\\C1; class OtherProjectType {}'));
    const shortConsumerFolder = vscode.Uri.joinPath(folder, 'Other');
    await vscode.workspace.fs.createDirectory(shortConsumerFolder);
    const shortSource = '<?php namespace App\\C1\\Other; function make(): void { new Sh }';
    const shortUri = vscode.Uri.joinPath(shortConsumerFolder, 'ShortConsumer.php');
    await vscode.workspace.fs.writeFile(shortUri, Buffer.from(shortSource));
    const shortDocument = await vscode.workspace.openTextDocument(shortUri);
    const shortEditor = await vscode.window.showTextDocument(shortDocument);
    const shortPosition = shortDocument.positionAt(shortSource.indexOf('new Sh') + 'new Sh'.length);
    const shortCandidates = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', shortUri, shortPosition),
      (result) => result?.items.some((item) => item.label === 'ShortProjectType') === true,
      'SoPHP did not show a project class for a two-character type prefix.',
    );
    assert.ok(shortCandidates.isIncomplete, 'The two-character project prefix incorrectly claimed all vendor types were searched.');
    shortEditor.selection = new vscode.Selection(shortPosition, shortPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const shortLabels = await visibleCompletionLabels(debugPort);
    assert.ok(shortLabels.some((label) => label.includes('ShortProjectType')),
      'The visible Workbench list omitted the short-prefix project class.');
    assert.ok(shortLabels.some((label) => label.includes('ShallowType')),
      'The two-character list omitted the competing project class.');
    const shortRange = new vscode.Range(shortPosition.translate(0, -2), shortPosition);
    shortEditor.selection = new vscode.Selection(shortRange.start, shortRange.end);
    await typeWorkbenchText(debugPort, 'Ot');
    await waitForResult(async () => shortDocument.getText(), (text) => text === shortSource.replace('new Sh', 'new Ot'),
      'Workbench typing did not replace the first two-character type prefix.');
    const otherCandidates = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', shortUri, shortPosition),
      (result) => result?.items.some((item) => item.label === 'OtherProjectType') === true,
      'SoPHP did not show the second two-character project type after an unsaved edit.',
    );
    assert.ok(otherCandidates.isIncomplete);
    shortEditor.selection = new vscode.Selection(shortPosition, shortPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const otherLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels.some((label) => label.includes('OtherProjectType'))
        && !labels.some((label) => label.includes('ShortProjectType')),
      'The visible Workbench list did not switch to the second two-character project type.');
    assert.ok(otherLabels.length > 0);
    shortEditor.selection = new vscode.Selection(shortRange.start, shortRange.end);
    await typeWorkbenchText(debugPort, 'Sh');
    await waitForResult(async () => shortDocument.getText(), (text) => text === shortSource,
      'Workbench typing did not restore the first two-character type prefix.');
    const restoredCandidates = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', shortUri, shortPosition),
      (result) => result?.items.some((item) => item.label === 'ShortProjectType') === true,
      'SoPHP did not restore the first two-character project type after another unsaved edit.',
    );
    assert.ok(restoredCandidates.isIncomplete);
    shortEditor.selection = new vscode.Selection(shortPosition, shortPosition);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels.some((label) => label.includes('ShortProjectType'))
        && !labels.some((label) => label.includes('OtherProjectType')),
      'The visible Workbench list retained the stale second two-character project type.');
    await typeWorkbenchText(debugPort, 'o');
    await waitForResult(async () => shortDocument.getText(), (text) => text.includes('new Sho }'),
      'Typing the third character did not update the open PHP document.');
    const longerPosition = shortDocument.positionAt(shortSource.indexOf('new Sh') + 'new Sho'.length);
    const longerCandidates = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', shortUri, longerPosition),
      (result) => result?.isIncomplete === false && result.items.some((item) => item.label === 'ShortProjectType'),
      'SoPHP did not complete the project type after the short-prefix retrigger.',
    );
    assert.ok(!longerCandidates.items.some((item) => item.label === 'ShallowType'),
      'The longer prefix retained an unrelated project type.');
    const longerLabels = await waitForResult(() => visibleCompletionLabels(debugPort),
      (labels) => labels.some((label) => label.includes('ShortProjectType'))
        && !labels.some((label) => label.includes('ShallowType')),
      'The visible Workbench list did not narrow after typing the third character.');
    assert.ok(longerLabels.length > 0);
    await verifyVisibleBranchValues(folder, debugPort);
    await verifyVisibleBranchShapes(folder, debugPort);
    await verifyVisibleUnionShapes(folder, debugPort);
    await verifyVisibleUnfinishedShapes(folder, debugPort);
    await verifyVisibleQuotedPrefixes(folder, debugPort);
    await verifyVisibleArrayAccessKeys(folder, debugPort);
    const visible = await measureVisibleSuggestion(debugPort, folder);
    console.log(`C1 completion visible list: ${JSON.stringify({ samplesMs: visible.samplesMs,
      medianMs: visible.medianMs, maxMs: visible.maxMs })}`);
  }
  console.log('C1 completion experience: visible call, alternating short project types, third-character retrigger, word-middle member replacement, Tab template, placeholders, and Undo passed.');
}

async function verifyColdRealVendorQuery(kind: 'references' | 'implementation',
  requestLanguageServer: <T>(method: string, params: unknown) => Promise<T>): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.find((folder) => folder.name === 'real-vendor');
  assert.ok(root, 'The cold query requires the locked real Composer vendor project.');
  const source = '<?php namespace App\\C1; use Psr\\Http\\Message\\ResponseInterface; function cold(ResponseInterface $value): void { $value->getStatusCode(); }';
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'C1', 'ColdVendorConsumer.php');
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root.uri, 'src', 'C1'));
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const call = document.positionAt(source.indexOf('$value->getStatusCode()') + '$value->'.length + 2);
  const target = vscode.Uri.joinPath(root.uri, 'vendor', 'guzzlehttp', 'psr7', 'src', 'Response.php').toString();
  const started = performance.now();
  const result = kind === 'references'
    ? await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, call)
    : await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, call);
  const elapsedMs = Math.round(performance.now() - started);
  assert.ok(Array.isArray(result), `The first ${kind} command did not return locations.`);
  if (kind === 'references') {
    const callStart = document.positionAt(source.indexOf('getStatusCode()'));
    assert.ok(result.some((item) => item.uri.toString() === uri.toString() && item.range.start.isEqual(callStart)),
      `The first References command missed its own call: ${JSON.stringify(result)}`);
  } else {
    assert.ok(result.some((item) => item.uri.toString() === target),
      `The first Implementation command missed Guzzle Response: ${JSON.stringify(result)}`);
  }
  const timings = await requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: false });
  const memory = await requestLanguageServer<{ rss?: number }>('phpCompanion/testMemoryUsage', {});
  console.log(`C1 cold ${kind} query: ${JSON.stringify({ elapsedMs, resultCount: result.length,
    serverMs: timings[kind]?.at(-1), scanMs: timings[`${kind}Scan`]?.at(-1),
    projectMs: timings.candidateProject?.at(-1), prefilterMs: timings.candidatePrefilter?.at(-1),
    inventoryMs: timings.candidateInventory?.at(-1), indexMs: timings.candidateIndex?.at(-1),
    serverRssMiB: memory.rss === undefined ? undefined : Math.round(memory.rss / 1048576),
    candidateEpochRetries: timings.candidateEpochRetry?.length ?? 0 })}`);
  const warmRounds = Number(process.env.PHP_COMPANION_TEST_C1_COLD_WARM_ROUNDS ?? 0);
  if (warmRounds) {
    assert.ok(Number.isSafeInteger(warmRounds) && warmRounds > 0 && warmRounds <= 200);
    const locations = (items: vscode.Location[]): string[] => items.map((item) =>
      `${item.uri.toString()}:${item.range.start.line}:${item.range.start.character}:${item.range.end.line}:${item.range.end.character}`).sort();
    const expected = locations(result);
    const commandMs: number[] = [];
    for (let round = 0; round < warmRounds; round += 1) {
      const warmStarted = performance.now();
      const warm = kind === 'references'
        ? await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, call)
        : await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, call);
      commandMs.push(performance.now() - warmStarted);
      assert.deepStrictEqual(locations(warm ?? []), expected, `Warm ${kind} changed locations in round ${round}.`);
    }
    const sorted = commandMs.sort((left, right) => left - right);
    const warmTimings = await requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: false });
    const warmMemory = await requestLanguageServer<{ rss?: number }>('phpCompanion/testMemoryUsage', {});
    const timingSummary = (name: string): { count: number; medianMs?: number; p95Ms?: number; maxMs?: number } => {
      const values = [...(warmTimings[name] ?? [])].slice(-warmRounds).sort((left, right) => left - right);
      return { count: values.length, medianMs: values[Math.ceil(values.length * 0.5) - 1],
        p95Ms: values[Math.ceil(values.length * 0.95) - 1], maxMs: values.at(-1) };
    };
    console.log(`C1 warm ${kind} after cold: ${JSON.stringify({ rounds: warmRounds,
      medianMs: Math.round(sorted[Math.ceil(warmRounds * 0.5) - 1]!),
      p95Ms: Math.round(sorted[Math.ceil(warmRounds * 0.95) - 1]!), maxMs: Math.round(sorted.at(-1)!),
      server: timingSummary(kind), scan: timingSummary(`${kind}Scan`),
      freshness: timingSummary('methodReferenceFreshnessTotal'), candidateIndex: timingSummary('candidateIndex'),
      serverRssMiB: warmMemory.rss === undefined ? undefined : Math.round(warmMemory.rss / 1048576) })}`);
  }
}

async function verifyRealComposerVendor(requestLanguageServer: <T>(method: string, params: unknown) => Promise<T>): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.find((folder) => folder.name === 'real-vendor');
  assert.ok(root, 'The locked real Composer vendor project was not opened.');
  const lock = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root.uri, 'composer.lock'))).toString('utf8')) as {
    packages?: unknown[];
  };
  assert.strictEqual(lock.packages?.length, 30, 'The real Composer fixture did not contain its 30 locked packages.');
  const source = `<?php namespace App\\C1;
use Psr\\Http\\Message\\ResponseInterface;
use Monolog\\Logger;
function inspect(ResponseInterface $value): void { $value->getStatusCode(); $value->getSta; }`;
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'C1', 'RealVendorConsumer.php');
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root.uri, 'src', 'C1'));
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const interfaceUri = vscode.Uri.joinPath(root.uri, 'vendor', 'psr', 'http-message', 'src', 'ResponseInterface.php');
  const implementationUri = vscode.Uri.joinPath(root.uri, 'vendor', 'guzzlehttp', 'psr7', 'src', 'Response.php');
  const loggerUri = vscode.Uri.joinPath(root.uri, 'vendor', 'monolog', 'monolog', 'src', 'Monolog', 'Logger.php');
  const call = document.positionAt(source.indexOf('$value->getStatusCode()') + '$value->'.length + 2);
  const partial = document.positionAt(source.indexOf('$value->getSta;') + '$value->getSta'.length);
  const completion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, partial),
    (result) => result?.items.some((item) => item.label === 'getStatusCode' && item.kind === vscode.CompletionItemKind.Method) === true,
    'SoPHP did not complete the installed PSR ResponseInterface method.');
  assert.ok(!completion.items.some((item) => item.label === 'getName' && item.kind === vscode.CompletionItemKind.Method));
  const hover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, call),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('getStatusCode'))) === true,
    'SoPHP did not show Hover for the installed PSR ResponseInterface method.');
  assert.ok(hover.length > 0);
  const signature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', uri,
      document.positionAt(source.indexOf('$value->getStatusCode()') + '$value->getStatusCode('.length)),
    (result) => result?.signatures.some((item) => item.label.includes('getStatusCode()')) === true,
    'SoPHP did not show Signature Help for the installed PSR ResponseInterface method.');
  assert.ok(signature.signatures.length > 0);
  const definition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === interfaceUri.toString()) === true,
    'SoPHP did not navigate to the installed PSR ResponseInterface declaration.');
  assert.ok(definition.every((item) => item.uri.toString() === interfaceUri.toString()));
  await requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const implementationStarted = performance.now();
  const implementationRequestsMs: number[] = [];
  const implementation = await waitForResult(
    async () => {
      const requestStarted = performance.now();
      const result = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, call);
      implementationRequestsMs.push(Math.round(performance.now() - requestStarted));
      return result;
    },
    (result) => result?.some((item) => item.uri.toString() === implementationUri.toString()) === true,
    'SoPHP did not find the installed Guzzle Response implementation.');
  assert.ok(implementation.every((item) => item.uri.toString() !== loggerUri.toString()));
  const implementationMs = Math.round(performance.now() - implementationStarted);
  const implementationTimings = await requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
  const implementationServerMs = Math.round(implementationTimings.implementation?.at(-1) ?? Number.NaN);
  const implementationScanMs = Math.round(implementationTimings.implementationScan?.at(-1) ?? Number.NaN);
  assert.ok(Number.isFinite(implementationServerMs) && Number.isFinite(implementationScanMs),
    'SoPHP did not record the first Implementation handler and candidate scan durations.');
  const warmImplementation = await warmLatency(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === implementationUri.toString()) === true,
    'Real vendor Implementation');
  const references = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === uri.toString()) === true,
    'SoPHP did not find the project call to the installed PSR interface.');
  assert.ok(references.every((item) => item.uri.toString() !== loggerUri.toString()));

  const change = new vscode.WorkspaceEdit();
  for (const [before, after] of [['ResponseInterface $value', 'Logger $value'],
    ['$value->getStatusCode()', '$value->getName()'], ['$value->getSta;', '$value->getN;']] as const) {
    const start = source.indexOf(before);
    change.replace(uri, new vscode.Range(document.positionAt(start), document.positionAt(start + before.length)), after);
  }
  assert.ok(await vscode.workspace.applyEdit(change), 'Could not change the real Composer consumer without saving.');
  const changed = document.getText();
  assert.ok(document.isDirty && changed.includes('Logger $value') && changed.includes('$value->getN;'));
  const changedCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
      document.positionAt(changed.indexOf('$value->getN;') + '$value->getN'.length)),
    (result) => result?.items.some((item) => item.label === 'getName' && item.kind === vscode.CompletionItemKind.Method) === true,
    'SoPHP did not complete the unsaved Monolog Logger receiver.');
  assert.ok(!changedCompletion.items.some((item) => item.label === 'getStatusCode' && item.kind === vscode.CompletionItemKind.Method));
  const changedDefinition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', uri,
      document.positionAt(changed.indexOf('$value->getName()') + '$value->'.length + 2)),
    (result) => result?.some((item) => item.uri.toString() === loggerUri.toString()) === true,
    'SoPHP kept the PSR method after an unsaved switch to Monolog Logger.');
  assert.ok(changedDefinition.every((item) => item.uri.toString() === loggerUri.toString()));
  const restore = new vscode.WorkspaceEdit();
  for (const [before, after] of [['Logger $value', 'ResponseInterface $value'],
    ['$value->getName()', '$value->getStatusCode()'], ['$value->getN;', '$value->getSta;']] as const) {
    const start = changed.indexOf(before);
    restore.replace(uri, new vscode.Range(document.positionAt(start), document.positionAt(start + before.length)), after);
  }
  assert.ok(await vscode.workspace.applyEdit(restore), 'Could not restore the real Composer receiver without saving.');
  const restored = document.getText();
  const restoredCall = document.positionAt(restored.indexOf('$value->getStatusCode()') + '$value->'.length + 2);
  const restoredStarted = performance.now();
  const restoredImplementation = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, restoredCall),
    (result) => result?.some((item) => item.uri.toString() === implementationUri.toString()) === true,
    'SoPHP did not restore the Guzzle implementation after an unsaved receiver round trip.');
  assert.ok(restoredImplementation.every((item) => item.uri.toString() !== loggerUri.toString()));
  const restoredImplementationMs = Math.round(performance.now() - restoredStarted);
  console.log(`C1 real Composer vendor: ${JSON.stringify({
    lockedPackages: lock.packages?.length, noiseFiles: Number(process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE ?? 0),
    completion: 'getStatusCode', implementation: implementation.map((item) => item.uri.toString()), implementationMs,
    implementationRequestsMs, implementationServerMs, implementationScanMs,
    candidateEpochRetries: implementationTimings.candidateEpochRetry?.length ?? 0,
    candidateInvalidatedOpen: implementationTimings.candidateInvalidatedOpen?.length ?? 0,
    warmImplementation, restoredImplementationMs,
    unsavedCompletion: 'getName', references: references.length,
  })}`);
}

async function verifyRealVendorEditingChain(rounds: number,
  requestLanguageServer: <T>(method: string, params: unknown) => Promise<T>): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.find((folder) => folder.name === 'real-vendor');
  assert.ok(root, 'The real Composer vendor project was not opened for the editing chain.');
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'C1', 'RealVendorChain.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from('<?php namespace App\\C1;'));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const cases = [
    { type: 'ResponseInterface', method: 'getStatusCode', prefix: 'getSta',
      declaration: 'vendor/psr/http-message/src/ResponseInterface.php', implementation: 'vendor/guzzlehttp/psr7/src/Response.php',
      forbidden: 'getRequestTarget' },
    { type: 'RequestInterface', method: 'getRequestTarget', prefix: 'getReq',
      declaration: 'vendor/psr/http-message/src/RequestInterface.php', implementation: 'vendor/guzzlehttp/psr7/src/Request.php',
      forbidden: 'getStatusCode' },
  ] as const;
  const samples = new Map<string, number[]>();
  await requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const memorySamples: Array<{ round: number; rssMiB: number; heapUsedMiB: number; externalMiB: number }> = [];
  const sampleMemory = async (round: number): Promise<void> => {
    const memory = await requestLanguageServer<{ rss: number; heapUsed: number; external: number }>('phpCompanion/testMemoryUsage',
      { collect: false });
    memorySamples.push({ round, rssMiB: Math.round(memory.rss / 1048576),
      heapUsedMiB: Math.round(memory.heapUsed / 1048576), externalMiB: Math.round(memory.external / 1048576) });
  };
  const checked = async <T>(name: string, read: () => PromiseLike<T>, ready: (value: T) => boolean,
    message: string): Promise<T> => {
    const started = performance.now();
    const result = await waitForResult(read, ready, message);
    const values = samples.get(name) ?? []; values.push(Math.round(performance.now() - started)); samples.set(name, values);
    return result;
  };
  await sampleMemory(0);
  for (let round = 0; round < rounds; round += 1) {
    const current = cases[round % cases.length]!;
    const source = `<?php namespace App\\C1;
use Psr\\Http\\Message\\ResponseInterface;
use Psr\\Http\\Message\\RequestInterface;
function inspect(${current.type} $value): void { $value->${current.method}(); $value->${current.prefix}; }`;
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not change the real vendor chain in round ${round}.`);
    assert.ok(document.isDirty && document.getText() === source, `Real vendor round ${round} lost its unsaved source.`);
    const callOffset = source.indexOf(`$value->${current.method}()`) + '$value->'.length;
    const call = document.positionAt(callOffset + 2);
    const partial = document.positionAt(source.indexOf(`$value->${current.prefix};`) + `$value->${current.prefix}`.length);
    const declarationUri = vscode.Uri.joinPath(root.uri, current.declaration).toString();
    const implementationUri = vscode.Uri.joinPath(root.uri, current.implementation).toString();
    const completion = await checked('completion', () => vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, partial),
    (result) => result?.items.some((item) => item.label === current.method) === true,
    `Real vendor round ${round} did not complete ${current.method}.`);
    assert.ok(!completion.items.some((item) => item.label === current.forbidden),
      `Real vendor round ${round} returned a method from the previous receiver.`);
    await checked('hover', () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, call),
      (result) => result?.some((item) => item.contents.some((part) =>
        (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes(current.method))) === true,
      `Real vendor round ${round} did not show Hover for ${current.method}.`);
    await checked('signature', () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', uri,
      document.positionAt(callOffset + current.method.length + 1)),
    (result) => result?.signatures.some((item) => item.label.includes(`${current.method}()`)) === true,
    `Real vendor round ${round} did not show Signature Help for ${current.method}.`);
    const definition = await checked('definition', () => vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === declarationUri) === true,
    `Real vendor round ${round} did not navigate to ${current.type}.`);
    assert.deepStrictEqual(definition.map((item) => item.uri.toString()), [declarationUri]);
    const implementation = await checked('implementation', () => vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeImplementationProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === implementationUri) === true,
    `Real vendor round ${round} did not find the Guzzle implementation of ${current.type}.`);
    assert.deepStrictEqual(implementation.map((item) => item.uri.toString()), [implementationUri]);
    const references = await checked('references', () => vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === uri.toString()
      && item.range.start.isEqual(document.positionAt(callOffset))) === true,
    `Real vendor round ${round} did not find the current unsaved call.`);
    assert.ok(references.every((item) => item.uri.toString() !== uri.toString()
      || item.range.start.isEqual(document.positionAt(callOffset))),
    `Real vendor round ${round} returned another call from the same unsaved document.`);
    if ((round + 1) % 25 === 0 || round === rounds - 1) await sampleMemory(round + 1);
  }
  const summary = Object.fromEntries([...samples].map(([name, values]) => {
    const sorted = [...values].sort((left, right) => left - right);
    return [name, { count: sorted.length, median: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1], max: sorted.at(-1) }];
  }));
  const serverTimings = await requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
  const freshnessTimings = Object.fromEntries(['methodReferenceFreshnessSearch', 'methodReferenceFreshnessHash',
    'methodReferenceFreshnessTotal'].map((name) => {
    const sorted = [...(serverTimings[name] ?? [])].sort((left, right) => left - right);
    return [name, { count: sorted.length, median: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1], max: sorted.at(-1) }];
  }));
  console.log(`C1 real vendor unsaved six-query chain: ${JSON.stringify({ rounds, summary, memorySamples, freshnessTimings })}`);
}

export async function run(): Promise<void> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'C1 Extension Host test has no workspace.');
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load in the isolated Extension Host.');
  await extension.activate();
  if (process.env.PHP_COMPANION_TEST_C1_OPEN_SOURCE_PROFILE === '1') {
    for (const id of ['sohophp.php-companion', 'sohophp.php-companion-symfony', 'sohophp.php-companion-open-source-pack',
      'sohophp.twig-plus', 'redhat.vscode-yaml', 'redhat.vscode-xml', 'xdebug.php-debug', 'junstyle.php-cs-fixer',
      'editorconfig.editorconfig', 'eiminsasete.apacheconf-snippets', 'neilbrayfield.php-docblocker']) {
      assert.ok(vscode.extensions.getExtension(id), `The C1 Open Source Pack profile is missing ${id}.`);
    }
    assert.ok(!vscode.extensions.getExtension('bmewburn.vscode-intelephense-client')
      && !vscode.extensions.getExtension('symfony.language-tools'),
    'The C1 Open Source Pack profile contains a competing PHP or Symfony language server.');
    assert.strictEqual(vscode.workspace.getConfiguration('editor', { uri: workspace.uri, languageId: 'php' })
      .get('defaultFormatter'), 'junstyle.php-cs-fixer',
    'The C1 Open Source Pack profile lost the PHP formatter while setting completion defaults.');
  }
  const timingApi = extension.exports as { requestLanguageServer?: <T>(method: string, params: unknown) => Promise<T> };
  assert.ok(timingApi.requestLanguageServer, 'SoPHP Core did not expose the test timing request bridge.');
  const coldQuery = process.env.PHP_COMPANION_TEST_C1_COLD_QUERY;
  if (coldQuery) {
    assert.ok(coldQuery === 'references' || coldQuery === 'implementation',
      'PHP_COMPANION_TEST_C1_COLD_QUERY must be references or implementation.');
    await verifyColdRealVendorQuery(coldQuery, timingApi.requestLanguageServer);
    return;
  }
  const targetPhpVersion = process.env.PHP_COMPANION_TEST_C1_PHP_VERSION;
  const runtimeVersion = process.env.PHP_COMPANION_TEST_C1_RUNTIME_VERSION;
  const syntaxVersion = targetPhpVersion ?? runtimeVersion ?? '8.5';
  const supportsAttributes = Number.parseFloat(syntaxVersion) >= 8;
  const supportsEnums = Number.parseFloat(syntaxVersion) >= 8.1;
  const supportsDnf = Number.parseFloat(syntaxVersion) >= 8.2;
  const runtimeDiscover = process.env.PHP_COMPANION_TEST_C1_RUNTIME_DISCOVER === '1';
  const c1DebugPort = process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT;
  if (targetPhpVersion) assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', workspace.uri).get('phpVersion'), targetPhpVersion);
  assert.strictEqual(vscode.workspace.getConfiguration('php').get('suggest.basic'), false,
    'VS Code built-in PHP suggestions must stay disabled while SoPHP owns PHP completion, Hover and Signature Help.');
  const folder = vscode.Uri.joinPath(workspace.uri, 'src', 'C1');
  await vscode.workspace.fs.createDirectory(folder);
  if (process.env.PHP_COMPANION_TEST_C1_INCLUDE_ONLY === '1') {
    await verifyStaticIncludeDefinition(folder);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C1_KEYWORDS_ONLY === '1') {
    await verifyKeywordCompletionSmoke(folder, syntaxVersion);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C1_SHADOW_ONLY === '1') {
    await verifyShadowedGlobalCompletion(folder);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C1_SCOPE_ONLY === '1') {
    await verifyScopedSymbolDefinition(folder);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C1_COMPLETION_ONLY === '1') {
    await verifyCompletionExperience(folder, c1DebugPort ? Number(c1DebugPort) : undefined, syntaxVersion);
    await verifyShadowedGlobalCompletion(folder);
    return;
  }
  const mixedSymbolsUri = vscode.Uri.joinPath(folder, 'C1MixedSymbols.php');
  await vscode.workspace.fs.writeFile(mixedSymbolsUri, Buffer.from(
    '<?php namespace App\\C1; function c1_mix_function(): void {} const C1_MIX_CONSTANT = 1;',
  ));
  await vscode.workspace.openTextDocument(mixedSymbolsUri);
  const mixedConsumerSource = '<?php namespace App\\C1; function c1MixedConsumer(): void { echo c1_mix; }';
  const mixedConsumerUri = vscode.Uri.joinPath(folder, 'C1MixedConsumer.php');
  await vscode.workspace.fs.writeFile(mixedConsumerUri, Buffer.from(mixedConsumerSource));
  const mixedConsumerDocument = await vscode.workspace.openTextDocument(mixedConsumerUri);
  await vscode.window.showTextDocument(mixedConsumerDocument);
  const mixedSuggestions = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', mixedConsumerUri,
      mixedConsumerDocument.positionAt(mixedConsumerSource.indexOf('c1_mix;') + 'c1_mix'.length)),
    (result) => result?.items.some((item) => item.label === 'c1_mix_function') === true
      && result.items.some((item) => item.label === 'C1_MIX_CONSTANT'),
    'SoPHP omitted a matching constant when a function shared the typed prefix.',
  );
  assert.strictEqual(mixedSuggestions.items.filter((item) => item.label === 'c1_mix_function').length, 1);
  assert.strictEqual(mixedSuggestions.items.filter((item) => item.label === 'C1_MIX_CONSTANT').length, 1);
  for (const [kind, source, expected, excluded] of [
    ['function', '<?php namespace App\\C1; use function App\\C1\\c1_mix', 'c1_mix_function', 'C1_MIX_CONSTANT'],
    ['const', '<?php namespace App\\C1; use const App\\C1\\c1_mix', 'C1_MIX_CONSTANT', 'c1_mix_function'],
    ['group-function', '<?php namespace App\\C1; use function App\\C1\\{c1_mix', 'c1_mix_function', 'C1_MIX_CONSTANT'],
    ['group-closed-function', '<?php namespace App\\C1; use function App\\C1\\{c1_mix}; class GroupImportConsumer {}', 'c1_mix_function', 'C1_MIX_CONSTANT'],
    ['group-const', '<?php namespace App\\C1; use const App\\C1\\{c1_mix', 'C1_MIX_CONSTANT', 'c1_mix_function'],
    ['mixed-function', '<?php namespace App\\C1; use App\\C1\\{const C1_MIX_CONSTANT, function c1_mix', 'c1_mix_function', 'C1_MIX_CONSTANT'],
    ['mixed-const', '<?php namespace App\\C1; use App\\C1\\{function c1_mix_function, const c1_mix', 'C1_MIX_CONSTANT', 'c1_mix_function'],
  ] as const) {
    const uri = vscode.Uri.joinPath(folder, `C1${kind}ImportConsumer.php`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    const offset = source.includes('};') ? source.indexOf('};') : source.length;
    const result = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
        document.positionAt(offset)),
      (completion) => completion?.items.some((item) => item.label === expected) === true,
      `SoPHP did not complete the ${kind} import from its namespace.`,
    );
    assert.strictEqual(result.items.filter((item) => item.label === expected).length, 1);
    assert.ok(!result.items.some((item) => item.label === excluded),
      `SoPHP suggested the wrong symbol kind for the ${kind} import.`);
    assert.ok(!result.items.find((item) => item.label === expected)?.additionalTextEdits?.length,
      `SoPHP added another use statement while completing the ${kind} import.`);
    if (kind.startsWith('group') || kind.startsWith('mixed')) {
      const selected = result.items.find((item) => item.label === expected)!;
      const range = selected.range instanceof vscode.Range ? selected.range : selected.range?.replacing;
      const groupStart = source.indexOf('{');
      const expectedRange = source.slice(groupStart, offset + (source[offset] === '}' ? 1 : 0));
      const expectedText = `${source.slice(groupStart, offset - 'c1_mix'.length)}${expected}${source[offset] === '}' ? '}' : ''}`;
      assert.ok(range && document.getText(range) === expectedRange && selected.insertText === expectedText,
        `SoPHP would damage a member or brace in the ${kind} import.`);
    }
  }
  const nestedSymbolsFolder = vscode.Uri.joinPath(folder, 'Nested');
  await vscode.workspace.fs.createDirectory(nestedSymbolsFolder);
  const nestedSymbolsUri = vscode.Uri.joinPath(nestedSymbolsFolder, 'C1NestedSymbols.php');
  await vscode.workspace.fs.writeFile(nestedSymbolsUri, Buffer.from(
    '<?php namespace App\\C1\\Nested; function c1_nested_function(): void {} const C1_NESTED_CONSTANT = 1;',
  ));
  await vscode.workspace.openTextDocument(nestedSymbolsUri);
  const groupedFunctionSource = '<?php namespace App\\C1; use function App\\C1\\{Nes}; class GroupedFunctionConsumer {}';
  const groupedFunctionUri = vscode.Uri.joinPath(folder, 'C1GroupedFunctionConsumer.php');
  await vscode.workspace.fs.writeFile(groupedFunctionUri, Buffer.from(groupedFunctionSource));
  const groupedFunctionDocument = await vscode.workspace.openTextDocument(groupedFunctionUri);
  const groupedFunctionEditor = await vscode.window.showTextDocument(groupedFunctionDocument);
  const groupedFunctionOffset = groupedFunctionSource.indexOf('Nes}') + 'Nes'.length;
  const groupedFunctionCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', groupedFunctionUri,
      groupedFunctionDocument.positionAt(groupedFunctionOffset)),
    (result) => result?.items.some((item) => item.label === 'Nested\\'
      && item.detail === 'App\\C1\\Nested\\' && !item.additionalTextEdits?.length) === true,
    'SoPHP did not suggest a namespace inside a function group use.',
  );
  const groupedFunctionItem = groupedFunctionCompletion.items.find((item) => item.label === 'Nested\\')!;
  const groupedFunctionRange = groupedFunctionItem.range instanceof vscode.Range
    ? groupedFunctionItem.range : groupedFunctionItem.range?.replacing;
  assert.ok(groupedFunctionRange && groupedFunctionDocument.getText(groupedFunctionRange) === '{Nes}'
    && groupedFunctionItem.insertText === '{Nested\\}',
  'The function group namespace suggestion would change the braces.');
  groupedFunctionEditor.selection = new vscode.Selection(groupedFunctionDocument.positionAt(groupedFunctionOffset),
    groupedFunctionDocument.positionAt(groupedFunctionOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(groupedFunctionDocument.getText(), groupedFunctionSource.replace('{Nes}', '{Nested\\}'),
    'Accepting the function group namespace suggestion changed the braces or other source text.');
  const groupedFunctionText = groupedFunctionDocument.getText();
  await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', groupedFunctionUri,
      groupedFunctionDocument.positionAt(groupedFunctionText.indexOf('Nested\\}') + 'Nested\\'.length)),
    (result) => result?.items.some((item) => item.label === 'c1_nested_function') === true,
    'SoPHP did not continue with function completion after accepting the group namespace.',
  );
  assert.strictEqual(vscode.workspace.getConfiguration('editor', { uri: vscode.Uri.joinPath(folder, 'Consumer.php'),
    languageId: 'php' }).get('wordBasedSuggestions'), 'off',
    'PHP variable suggestions should come from SoPHP with PHP scope ownership.');
  assert.strictEqual(vscode.workspace.getConfiguration('editor.suggest', { uri: vscode.Uri.joinPath(folder, 'Consumer.php'),
    languageId: 'php' }).get('showWords'), false,
    'PHP should hide word candidates while SoPHP owns scoped variable suggestions.');
  const localWordSource = '<?php function c1LocalWord(): void { $customerName = "Ada"; $cust }';
  const localWordUri = vscode.Uri.joinPath(folder, 'C1LocalWord.php');
  await vscode.workspace.fs.writeFile(localWordUri, Buffer.from(localWordSource));
  const localWordDocument = await vscode.workspace.openTextDocument(localWordUri);
  await vscode.window.showTextDocument(localWordDocument);
  const localWordSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    localWordUri, localWordDocument.positionAt(localWordSource.indexOf('$cust }') + '$cust'.length));
  assert.ok(localWordSuggestions?.items.some((item) => item.label === 'customerName' || item.label === '$customerName'),
    'PHP no longer suggests a variable word from the current file.');
  const unsetSource = '<?php function c1Unset(): void { $state = 1; unset($state); echo $sta; }';
  const unsetUri = vscode.Uri.joinPath(folder, 'C1Unset.php');
  await vscode.workspace.fs.writeFile(unsetUri, Buffer.from(unsetSource));
  const unsetDocument = await vscode.workspace.openTextDocument(unsetUri);
  await vscode.window.showTextDocument(unsetDocument);
  const unsetOffset = unsetSource.indexOf('$sta;') + '$sta'.length;
  const unsetSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    unsetUri, unsetDocument.positionAt(unsetOffset));
  assert.ok(!unsetSuggestions?.items.some((item) => item.label === '$state'),
    'PHP suggested a local variable after its direct unset.');
  const restoreEdit = new vscode.WorkspaceEdit();
  restoreEdit.insert(unsetUri, unsetDocument.positionAt(unsetSource.indexOf('echo $sta;')), '$state = 2; ');
  assert.ok(await vscode.workspace.applyEdit(restoreEdit));
  const restoredText = unsetDocument.getText();
  const restoredSuggestions = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', unsetUri,
      unsetDocument.positionAt(restoredText.indexOf('$sta;') + '$sta'.length)),
    (result) => result?.items.some((item) => item.label === '$state') === true,
    'PHP did not restore the local variable suggestion after an unsaved reassignment.',
  );
  assert.ok(restoredSuggestions.items.some((item) => item.label === '$state'));
  const byReferenceSource = '<?php function c1Fill(string &$value): void {} function c1Consume(string $value): void {} function c1ByRef(): void { c1Fill($output); echo $out; }';
  const byReferenceUri = vscode.Uri.joinPath(folder, 'C1ByReferenceOutput.php');
  await vscode.workspace.fs.writeFile(byReferenceUri, Buffer.from(byReferenceSource));
  const byReferenceDocument = await vscode.workspace.openTextDocument(byReferenceUri);
  await vscode.window.showTextDocument(byReferenceDocument);
  const byReferenceOffset = byReferenceSource.indexOf('$out;') + '$out'.length;
  const byReferenceSuggestions = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', byReferenceUri,
      byReferenceDocument.positionAt(byReferenceOffset)),
    (result) => result?.items.some((item) => item.label === '$output') === true,
    'PHP did not suggest a local initialized through a known reference parameter.',
  );
  assert.ok(byReferenceSuggestions.items.some((item) => item.label === '$output'));
  const byReferenceEdit = new vscode.WorkspaceEdit();
  byReferenceEdit.replace(byReferenceUri, new vscode.Range(
    byReferenceDocument.positionAt(byReferenceSource.indexOf('c1Fill($output)')),
    byReferenceDocument.positionAt(byReferenceSource.indexOf('c1Fill($output)') + 'c1Fill'.length)), 'c1Consume');
  assert.ok(await vscode.workspace.applyEdit(byReferenceEdit));
  const byReferenceChanged = byReferenceDocument.getText();
  await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', byReferenceUri,
      byReferenceDocument.positionAt(byReferenceChanged.indexOf('$out;') + '$out'.length)),
    (result) => result?.items.some((item) => item.label === '$output') === false,
    'PHP kept a reference-output suggestion after an unsaved change to an ordinary parameter.',
  );
  const unfinishedByReference = byReferenceSource.replace('echo $out; }', 'echo $out');
  const unfinishedEdit = new vscode.WorkspaceEdit();
  unfinishedEdit.replace(byReferenceUri, new vscode.Range(byReferenceDocument.positionAt(0),
    byReferenceDocument.positionAt(byReferenceDocument.getText().length)), unfinishedByReference);
  assert.ok(await vscode.workspace.applyEdit(unfinishedEdit));
  await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', byReferenceUri,
      byReferenceDocument.positionAt(unfinishedByReference.length)),
    (result) => result?.items.some((item) => item.label === '$output') === true,
    'PHP lost the reference-output suggestion while the function body was unfinished.',
  );
  const methodReferenceSource = `<?php final class C1ReferenceSink {
  public function fill(string &$value): void {}
  public static function fillStatic(string &$value): void {}
}
function c1MethodReference(C1ReferenceSink $sink): void {
  $sink->fill($instanceResult); echo $inst;
  C1ReferenceSink::fillStatic($staticResult); echo $sta;
}`;
  const methodReferenceUri = vscode.Uri.joinPath(folder, 'C1MethodReferenceOutput.php');
  await vscode.workspace.fs.writeFile(methodReferenceUri, Buffer.from(methodReferenceSource));
  const methodReferenceDocument = await vscode.workspace.openTextDocument(methodReferenceUri);
  await vscode.window.showTextDocument(methodReferenceDocument);
  for (const [marker, label] of [['$inst;', '$instanceResult'], ['$sta;', '$staticResult']] as const) {
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', methodReferenceUri,
        methodReferenceDocument.positionAt(methodReferenceSource.indexOf(marker) + marker.length - 1)),
      (result) => result?.items.some((item) => item.label === label) === true,
      `PHP did not suggest ${label} after a resolved reference-parameter method call.`,
    );
  }
  const middleWordSource = '<?php function c1MiddleWord(): void { $customerName = "Ada"; $custOldTail; }';
  const middleWordUri = vscode.Uri.joinPath(folder, 'C1MiddleWord.php');
  await vscode.workspace.fs.writeFile(middleWordUri, Buffer.from(middleWordSource));
  const middleWordDocument = await vscode.workspace.openTextDocument(middleWordUri);
  await vscode.window.showTextDocument(middleWordDocument);
  const middleWordStart = middleWordSource.indexOf('$custOldTail;');
  const middleWordSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    middleWordUri, middleWordDocument.positionAt(middleWordStart + '$cust'.length));
  const middleWordItem = middleWordSuggestions?.items.find((item) => item.label === '$customerName');
  assert.ok(middleWordItem, 'PHP did not suggest the visible variable when the cursor was inside another variable token.');
  const middleWordRange = middleWordItem.range instanceof vscode.Range ? middleWordItem.range : middleWordItem.range?.replacing;
  assert.ok(middleWordRange, 'PHP variable completion did not provide a replacement range.');
  assert.strictEqual(middleWordDocument.offsetAt(middleWordRange.start), middleWordStart);
  assert.strictEqual(middleWordDocument.offsetAt(middleWordRange.end), middleWordStart + '$custOldTail'.length,
    'PHP variable completion left the existing suffix outside its replacement range.');
  const middleWordEdit = new vscode.WorkspaceEdit();
  middleWordEdit.replace(middleWordUri, middleWordRange, '$customerName');
  assert.ok(await vscode.workspace.applyEdit(middleWordEdit));
  assert.strictEqual(middleWordDocument.getText(), middleWordSource.replace('$custOldTail;', '$customerName;'),
    'Accepting PHP variable completion left the old variable suffix in the document.');
  const interpolationSource = `<?php function c1Interpolation(string $username): void {
  echo "Hello {$userOldTail}";
  echo "Just $";
  echo 'Hello $user';
  echo "Hello \\$user";
}`;
  const interpolationUri = vscode.Uri.joinPath(folder, 'C1Interpolation.php');
  await vscode.workspace.fs.writeFile(interpolationUri, Buffer.from(interpolationSource));
  const interpolationDocument = await vscode.workspace.openTextDocument(interpolationUri);
  await vscode.window.showTextDocument(interpolationDocument);
  const bareDollarSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    interpolationUri, interpolationDocument.positionAt(interpolationSource.indexOf('Just $') + 'Just $'.length));
  assert.ok(bareDollarSuggestions?.items.some((item) => item.label === '$username'),
    'PHP did not suggest the visible parameter immediately after an interpolation dollar.');
  const interpolationStart = interpolationSource.indexOf('$userOldTail');
  const interpolationSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    interpolationUri, interpolationDocument.positionAt(interpolationStart + '$user'.length));
  const interpolationItem = interpolationSuggestions?.items.find((item) => item.label === '$username');
  assert.ok(interpolationItem, 'PHP interpolated string did not suggest the visible parameter.');
  const interpolationRange = interpolationItem.range instanceof vscode.Range ? interpolationItem.range : interpolationItem.range?.replacing;
  assert.ok(interpolationRange, 'PHP interpolated variable completion did not provide a replacement range.');
  assert.strictEqual(interpolationDocument.offsetAt(interpolationRange.start), interpolationStart);
  assert.strictEqual(interpolationDocument.offsetAt(interpolationRange.end), interpolationStart + '$userOldTail'.length);
  for (const literal of ["'Hello $user'", 'Hello \\$user']) {
    const offset = interpolationSource.indexOf('$user', interpolationSource.indexOf(literal)) + '$user'.length;
    const suggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      interpolationUri, interpolationDocument.positionAt(offset));
    assert.ok(!suggestions?.items.some((item) => item.label === '$username'),
      `PHP suggested a variable inside ${literal}.`);
  }
  const interpolationEdit = new vscode.WorkspaceEdit();
  interpolationEdit.replace(interpolationUri, interpolationRange, '$username');
  assert.ok(await vscode.workspace.applyEdit(interpolationEdit));
  assert.ok(interpolationDocument.getText().includes('"Hello {$username}"'),
    'Accepting interpolated variable completion damaged the surrounding braces.');
  const memberStringSource = String.raw`<?php
class C1DisplayItem { public string $title = ''; public function titleCase(): string { return ''; } }
function c1Display(C1DisplayItem $item): void {
  echo "{$item->ti}";
  echo "plain $item->ti";
  echo 'literal $item->ti';
  echo "escaped \$item->ti";
  // $item->ti
  /* $item->ti */
  echo <<<'TXT'
$item->ti
TXT;
}`;
  const memberStringUri = vscode.Uri.joinPath(folder, 'C1InterpolatedMembers.php');
  await vscode.workspace.fs.writeFile(memberStringUri, Buffer.from(memberStringSource));
  const memberStringDocument = await vscode.workspace.openTextDocument(memberStringUri);
  await vscode.window.showTextDocument(memberStringDocument);
  const memberSuggestions = async (marker: string, length = marker.length): Promise<vscode.CompletionItem[]> =>
    (await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      memberStringUri, memberStringDocument.positionAt(memberStringSource.indexOf(marker) + length)))?.items ?? [];
  for (const marker of ['{$item->ti', 'plain $item->ti']) {
    const suggestions = await memberSuggestions(marker);
    assert.ok(suggestions.some((item) => item.label === 'title' && item.kind === vscode.CompletionItemKind.Property),
      `PHP lost member completion in ${marker}.`);
  }
  for (const [marker, length] of [
    ['literal $item->ti', 'literal $item->ti'.length],
    [String.raw`escaped \$item->ti`, String.raw`escaped \$item->ti`.length],
    ['// $item->ti', '// $item->ti'.length],
    ['/* $item->ti', '/* $item->ti'.length],
    ['$item->ti\nTXT;', '$item->ti'.length],
  ] as const) {
    const suggestions = await memberSuggestions(marker, length);
    assert.ok(!suggestions.some((item) => item.label === 'title' && item.kind === vscode.CompletionItemKind.Property),
      `PHP suggested a member inside literal text: ${marker}.`);
  }
  const expressionSource = `<?php
class C1Invoice {}
function c1FunctionName(): void {}
const C1_CONSTANT = 1;
function c1Expressions(): void {
  c1Fun; C1_CON; $invoice = new C1Inv;
  echo 'c1Fun C1_CON new C1Inv';
  // c1Fun C1_CON new C1Inv
}`;
  const expressionUri = vscode.Uri.joinPath(folder, 'C1ExpressionSuggestions.php');
  await vscode.workspace.fs.writeFile(expressionUri, Buffer.from(expressionSource));
  const expressionDocument = await vscode.workspace.openTextDocument(expressionUri);
  await vscode.window.showTextDocument(expressionDocument);
  const expressionSuggestions = async (needle: string, from: number): Promise<vscode.CompletionItem[]> =>
    (await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      expressionUri, expressionDocument.positionAt(expressionSource.indexOf(needle, from) + needle.length)))?.items ?? [];
  const expressionBody = expressionSource.indexOf('function c1Expressions');
  assert.ok((await expressionSuggestions('c1Fun', expressionBody)).some((item) =>
    item.label === 'c1FunctionName' && item.kind === vscode.CompletionItemKind.Function));
  assert.ok((await expressionSuggestions('C1_CON', expressionBody)).some((item) =>
    item.label === 'C1_CONSTANT' && item.kind === vscode.CompletionItemKind.Constant));
  assert.ok((await expressionSuggestions('new C1Inv', expressionBody)).some((item) =>
    item.label === 'C1Invoice' && item.kind === vscode.CompletionItemKind.Class));
  for (const marker of ["'c1Fun C1_CON new C1Inv'", '// c1Fun C1_CON new C1Inv']) {
    const start = expressionSource.indexOf(marker);
    assert.ok(!(await expressionSuggestions('c1Fun', start)).some((item) =>
      item.label === 'c1FunctionName' && item.kind === vscode.CompletionItemKind.Function),
    `SoPHP suggested a function inside ${marker}.`);
    assert.ok(!(await expressionSuggestions('C1_CON', start)).some((item) =>
      item.label === 'C1_CONSTANT' && item.kind === vscode.CompletionItemKind.Constant),
    `SoPHP suggested a constant inside ${marker}.`);
    assert.ok(!(await expressionSuggestions('new C1Inv', start)).some((item) =>
      item.label === 'C1Invoice' && item.kind === vscode.CompletionItemKind.Class),
    `SoPHP suggested a type inside ${marker}.`);
  }
  const phpDocSource = String.raw`<?php
namespace App\C1;
/**
 * @param C1DocTa
 * @return array<C1DocTa
 * @param Nested\C1DocTa
 * @return \App\C1\Nested\C1DocTa
 * @var array<
 * C1DocTa
 * @method static C1DocTa
 * @method C1DocTarget find(C1DocTa
 * @method C1DocTarget find(C1DocTarget $owner, C1DocTa
 * @method C1DocTarget find(C1DocTarget $owner) description
 * @template T of C1DocTa
 * @template-covariant TView as C1DocTa
 * @phpstan-template TKey of C1DocTa
 * @psalm-template TItem as C1DocTa
 * @template TNext of
 * C1DocTa
 * @phpstan-template TAfter as
 * C1DocTa
 * @template TDescription of C1DocTarget description
 * @param array{owner: C1DocTa
 * @return array{owner: C1DocTarget, reviewer?: C1DocTa
 * @var array{meta: array{owner: C1DocTa
 * @method C1DocTarget find(array{owner: C1DocTarget, reviewer: C1DocTa
 * @return array{owner: C1DocTarget}|C1DocTa
 * @var array<array{owner: C1DocTarget}, C1DocTa
 * @param array{owner: C1DocTarget, review
 * @return C1DocTarget description
 */
function documented(): void {}
// @param C1DocTa
`;
  const phpDocTypeUri = vscode.Uri.joinPath(folder, 'C1DocTarget.php');
  await vscode.workspace.fs.writeFile(phpDocTypeUri, Buffer.from('<?php namespace App\\C1; class C1DocTarget {}'));
  const nestedDocFolder = vscode.Uri.joinPath(folder, 'Nested');
  await vscode.workspace.fs.createDirectory(nestedDocFolder);
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(nestedDocFolder, 'C1DocTarget.php'),
    Buffer.from('<?php namespace App\\C1\\Nested; class C1DocTarget {}'));
  const phpDocUri = vscode.Uri.joinPath(folder, 'C1DocConsumer.php');
  await vscode.workspace.fs.writeFile(phpDocUri, Buffer.from(phpDocSource));
  const phpDocDocument = await vscode.workspace.openTextDocument(phpDocUri);
  await vscode.window.showTextDocument(phpDocDocument);
  const phpDocSuggestions = async (marker: string): Promise<vscode.CompletionItem[]> =>
    (await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      phpDocUri, phpDocDocument.positionAt(phpDocSource.indexOf(marker) + marker.length)))?.items ?? [];
  for (const marker of ['@param C1DocTa', '@return array<C1DocTa']) {
    assert.ok((await phpDocSuggestions(marker)).some((item) =>
      item.label === 'C1DocTarget' && item.kind === vscode.CompletionItemKind.Class),
    `SoPHP did not suggest the project class in PHPDoc type position ${marker}.`);
  }
  for (const marker of [String.raw`@param Nested\C1DocTa`, String.raw`@return \App\C1\Nested\C1DocTa`]) {
    const type = (await phpDocSuggestions(marker)).find((item) =>
      item.label === 'C1DocTarget' && item.detail === 'App\\C1\\Nested\\C1DocTarget');
    assert.ok(type, `SoPHP did not resolve the qualified PHPDoc type ${marker}.`);
    assert.ok(!type.additionalTextEdits?.length, 'Qualified PHPDoc completion added an unnecessary import.');
  }
  assert.ok((await phpDocSuggestions(' * C1DocTa')).some((item) =>
    item.label === 'C1DocTarget' && item.detail === 'App\\C1\\C1DocTarget'),
  'SoPHP did not continue the PHPDoc generic type on the next line.');
  for (const marker of ['@method static C1DocTa', '@method C1DocTarget find(C1DocTa',
    '@method C1DocTarget find(C1DocTarget $owner, C1DocTa']) {
    assert.ok((await phpDocSuggestions(marker)).some((item) =>
      item.label === 'C1DocTarget' && item.detail === 'App\\C1\\C1DocTarget'),
    `SoPHP did not suggest the project class in @method type position ${marker}.`);
  }
  for (const marker of ['@template T of C1DocTa', '@template-covariant TView as C1DocTa',
    '@phpstan-template TKey of C1DocTa', '@psalm-template TItem as C1DocTa',
    '@template TNext of\n * C1DocTa', '@phpstan-template TAfter as\n * C1DocTa']) {
    const position = phpDocDocument.positionAt(phpDocSource.indexOf(marker) + marker.length);
    const query = (): Thenable<vscode.CompletionList> => vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', phpDocUri, position);
    const matches = (result: vscode.CompletionList | undefined): boolean => result?.items.some((item) =>
      item.label === 'C1DocTarget' && item.detail === 'App\\C1\\C1DocTarget') === true;
    let result = await query();
    if (!matches(result) && result?.isIncomplete) {
      const started = performance.now();
      const deadline = Date.now() + 5_000;
      do {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        result = await query();
      } while (!matches(result) && result?.isIncomplete && Date.now() < deadline);
      if (matches(result)) console.log(`C1 PHPDoc template candidate recovered after ${Math.round(performance.now() - started)}ms: ${marker}`);
    }
    assert.ok(matches(result),
    `SoPHP did not suggest the project class in PHPDoc template bound ${marker}; incomplete=${String(result?.isIncomplete)}; received ${JSON.stringify(
      result?.items.map((item) => ({ label: item.label, detail: item.detail, kind: item.kind })).slice(0, 20))}.`);
  }
  for (const marker of ['@template T', '@template-covariant TView', '@phpstan-template TKey',
    '@psalm-template TItem', '@template TDescription of C1DocTarget description']) {
    assert.ok(!(await phpDocSuggestions(marker)).some((item) =>
      item.label === 'C1DocTarget' && item.kind === vscode.CompletionItemKind.Class),
    `SoPHP suggested a project class outside a PHPDoc template bound: ${marker}.`);
  }
  for (const marker of ['@param array{owner: C1DocTa', '@return array{owner: C1DocTarget, reviewer?: C1DocTa',
    '@var array{meta: array{owner: C1DocTa',
    '@method C1DocTarget find(array{owner: C1DocTarget, reviewer: C1DocTa',
    '@return array{owner: C1DocTarget}|C1DocTa', '@var array<array{owner: C1DocTarget}, C1DocTa']) {
    const suggestions = await phpDocSuggestions(marker);
    assert.ok(suggestions.some((item) =>
      item.label === 'C1DocTarget' && item.detail === 'App\\C1\\C1DocTarget'),
    `SoPHP did not suggest the project class in PHPDoc array shape value ${marker}; received ${JSON.stringify(
      suggestions.map((item) => ({ label: item.label, detail: item.detail, kind: item.kind })).slice(0, 20))}.`);
  }
  assert.ok(!(await phpDocSuggestions('@param array{owner: C1DocTarget, review')).some((item) =>
    item.label === 'C1DocTarget' && item.kind === vscode.CompletionItemKind.Class),
  'SoPHP suggested a project class for a PHPDoc array shape key.');
  assert.ok(!(await phpDocSuggestions('@return array{owner: C1DocTarget}')).some((item) =>
    item.label === 'C1DocTarget' && item.kind === vscode.CompletionItemKind.Class),
  'SoPHP suggested a project class after a completed PHPDoc array shape.');
  for (const marker of ['@method C1DocTarget find', '@method C1DocTarget find(C1DocTarget $owner) description']) {
    assert.ok(!(await phpDocSuggestions(marker)).some((item) =>
      item.label === 'C1DocTarget' && item.kind === vscode.CompletionItemKind.Class),
    `SoPHP suggested a class in an @method name or description: ${marker}.`);
  }
  for (const marker of ['@return C1DocTarget description', '// @param C1DocTa']) {
    assert.ok(!(await phpDocSuggestions(marker)).some((item) =>
      item.label === 'C1DocTarget' && item.kind === vscode.CompletionItemKind.Class),
    `SoPHP suggested the project class outside a PHPDoc type position ${marker}.`);
  }
  const nativeTypeCases = [
    ['C1ClosureType.php', '<?php namespace App\\C1; $callback = function (C1DocTa'],
    ['C1ClosureCapturedReturn.php', '<?php namespace App\\C1; $captured = 1; $callback = function () use (&$captured): C1DocTa'],
    ...(supportsDnf ? [['C1DnfReturnType.php', '<?php namespace App\\C1; function make(): (Countable&Throwable)|C1DocTa']] : []),
    ...(supportsDnf ? [['C1DnfCapturedReturn.php', '<?php namespace App\\C1; $captured = 1; $callback = function () use ($captured): (Countable&Throwable)|C1DocTa']] : []),
  ];
  for (const [name, source] of nativeTypeCases) {
    const typeUri = vscode.Uri.joinPath(folder, name);
    await vscode.workspace.fs.writeFile(typeUri, Buffer.from(source));
    const typeDocument = await vscode.workspace.openTextDocument(typeUri);
    await vscode.window.showTextDocument(typeDocument);
    const items = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        typeUri, typeDocument.positionAt(source.length)),
      (result) => result?.items.some((item) => item.label === 'C1DocTarget' && item.detail === 'App\\C1\\C1DocTarget') === true,
      `SoPHP did not suggest the project class in ${name}.`);
    assert.ok(items.items.some((item) => item.label === 'C1DocTarget' && item.detail === 'App\\C1\\C1DocTarget'));
  }
  const navigationTargetUri = vscode.Uri.joinPath(folder, 'C1DocNavigationTarget.php');
  await vscode.workspace.fs.writeFile(navigationTargetUri,
    Buffer.from('<?php namespace App\\C1; class C1DocNavigationTarget {}'));
  const navigationSource = `<?php namespace App\\C1;
/**
 * @param C1DocNavigationTarget $value description C1DocNavigationTarget
 * @return list<C1DocNavigationTarget> explanation C1DocNavigationTarget
 * @var array{C1DocNavigationTarget: C1DocNavigationTarget} $shape
 * @method C1DocNavigationTarget find(C1DocNavigationTarget $value) explanation C1DocNavigationTarget
 * @template T of C1DocNavigationTarget description C1DocNavigationTarget
 */
class C1DocNavigationConsumer {}
// C1DocNavigationTarget in an ordinary comment
`;
  const navigationUri = vscode.Uri.joinPath(folder, 'C1DocNavigationConsumer.php');
  await vscode.workspace.fs.writeFile(navigationUri, Buffer.from(navigationSource));
  const navigationDocument = await vscode.workspace.openTextDocument(navigationUri);
  await vscode.window.showTextDocument(navigationDocument);
  const docDefinition = async (marker: string, occurrence = 0): Promise<vscode.Location[]> => {
    let start = -1;
    for (let index = 0; index <= occurrence; index += 1) start = navigationSource.indexOf(marker, start + 1);
    assert.ok(start >= 0, `Missing PHPDoc navigation marker ${marker}.`);
    return await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider',
      navigationUri, navigationDocument.positionAt(start + marker.length - 2)) ?? [];
  };
  for (const marker of ['@param C1DocNavigationTarget', 'list<C1DocNavigationTarget',
    'C1DocNavigationTarget: C1DocNavigationTarget', '@method C1DocNavigationTarget',
    'find(C1DocNavigationTarget', '@template T of C1DocNavigationTarget']) {
    const locations = await waitForResult(() => docDefinition(marker),
      (items) => items.some((item) => item.uri.toString() === navigationTargetUri.toString()),
      `SoPHP did not navigate from PHPDoc type ${marker}.`);
    assert.ok(locations.some((item) => item.uri.toString() === navigationTargetUri.toString()));
  }
  for (const marker of ['description C1DocNavigationTarget', 'explanation C1DocNavigationTarget',
    '// C1DocNavigationTarget']) {
    assert.deepStrictEqual(await docDefinition(marker), [],
      `SoPHP treated PHPDoc description or ordinary comment as a type: ${marker}.`);
  }
  assert.deepStrictEqual(await docDefinition('description C1DocNavigationTarget', 1), [],
    'SoPHP treated the PHPDoc template description as a type.');
  const shapeKey = navigationDocument.positionAt(navigationSource.indexOf('array{C1DocNavigationTarget') + 'array{'.length + 2);
  assert.deepStrictEqual(await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider',
    navigationUri, shapeKey) ?? [], [],
    'SoPHP treated an array shape key as a type.');
  const continuationOtherUri = vscode.Uri.joinPath(folder, 'C1DocNavigationOther.php');
  await vscode.workspace.fs.writeFile(continuationOtherUri,
    Buffer.from('<?php namespace App\\C1; class C1DocNavigationOther {}'));
  const continuationSource = `<?php namespace App\\C1;
/** @return list<
 * C1DocNavigationTarget
 */
function documentedValues(): array { return []; }
`;
  const continuationUri = vscode.Uri.joinPath(folder, 'C1DocContinuation.php');
  await vscode.workspace.fs.writeFile(continuationUri, Buffer.from(continuationSource));
  const continuationDocument = await vscode.workspace.openTextDocument(continuationUri);
  const continuationEditor = await vscode.window.showTextDocument(continuationDocument);
  const continuedDefinition = async (name: string, targetUri: vscode.Uri): Promise<void> => {
    const offset = continuationDocument.getText().indexOf(` * ${name}`) + ' * '.length + 2;
    assert.ok(offset >= ' * '.length + 2, `Missing continued PHPDoc type ${name}.`);
    await waitForResult(() => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider',
      continuationUri, continuationDocument.positionAt(offset)),
    (items) => (items ?? []).some((item) => item.uri.toString() === targetUri.toString()),
    `SoPHP did not navigate continued PHPDoc type ${name}.`);
  };
  await continuedDefinition('C1DocNavigationTarget', navigationTargetUri);
  const continuedStart = continuationDocument.positionAt(continuationDocument.getText().indexOf(' * C1DocNavigationTarget') + ' * '.length);
  assert.ok(await continuationEditor.edit((edit) => edit.replace(new vscode.Range(continuedStart,
    continuedStart.translate(0, 'C1DocNavigationTarget'.length)), 'C1DocNavigationOther')),
  'Could not change the continued PHPDoc type in the unsaved editor.');
  await continuedDefinition('C1DocNavigationOther', continuationOtherUri);
  await vscode.commands.executeCommand('undo');
  assert.ok(continuationDocument.getText().includes(' * C1DocNavigationTarget'),
    'Undo did not restore the continued PHPDoc type.');
  await continuedDefinition('C1DocNavigationTarget', navigationTargetUri);
  const safetyTypeUri = vscode.Uri.joinPath(folder, 'C1DocSafetyTarget.php');
  const safetyUseUri = vscode.Uri.joinPath(folder, 'C1DocSafetyConsumer.php');
  const safetyType = '<?php namespace App\\C1; class C1DocSafetyTarget {}';
  const safetyUse = `<?php namespace App\\C1;
/**
 * @return C1DocSafetyTarget description C1DocSafetyTarget
 * @return list<
 * C1DocSafetyTarget
 * @var array{C1DocSafetyTarget: C1DocSafetyTarget} $value
 * @method C1DocSafetyTarget find(C1DocSafetyTarget $value) explanation C1DocSafetyTarget
 */
class C1DocSafetyConsumer {}
`;
  await vscode.workspace.fs.writeFile(safetyTypeUri, Buffer.from(safetyType));
  await vscode.workspace.fs.writeFile(safetyUseUri, Buffer.from(safetyUse));
  const safetyUseDocument = await vscode.workspace.openTextDocument(safetyUseUri);
  await vscode.window.showTextDocument(safetyUseDocument);
  const safetyTypeDocument = await vscode.workspace.openTextDocument(safetyTypeUri);
  await vscode.window.showTextDocument(safetyTypeDocument);
  const safetyPosition = safetyTypeDocument.positionAt(safetyType.indexOf('class C1DocSafetyTarget') + 'class '.length + 2);
  const expectedSafetyOffsets = [safetyUse.indexOf('@return C1DocSafetyTarget') + '@return '.length,
    safetyUse.indexOf(' * C1DocSafetyTarget\n') + ' * '.length,
    safetyUse.indexOf('C1DocSafetyTarget: C1DocSafetyTarget') + 'C1DocSafetyTarget: '.length,
    safetyUse.indexOf('@method C1DocSafetyTarget') + '@method '.length,
    safetyUse.indexOf('find(C1DocSafetyTarget') + 'find('.length];
  const safetyReferences = await waitForResult(() => vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', safetyTypeUri, safetyPosition),
  (items) => (items ?? []).filter((item) => item.uri.toString() === safetyUseUri.toString()).length === expectedSafetyOffsets.length,
  'SoPHP did not return the exact PHPDoc type References.');
  assert.deepStrictEqual((safetyReferences ?? []).filter((item) => item.uri.toString() === safetyUseUri.toString())
    .map((item) => safetyUseDocument.offsetAt(item.range.start)).sort((a, b) => a - b), expectedSafetyOffsets);
  const mixedSource = '<div>$G</div><?php $globalName = 1; function globalHelper(): void {} ?><p>$G globalHel</p><?php $G; globalHel; ?>';
  const mixedUri = vscode.Uri.joinPath(folder, 'C1MixedPhpHtml.php');
  await vscode.workspace.fs.writeFile(mixedUri, Buffer.from(mixedSource));
  const mixedDocument = await vscode.workspace.openTextDocument(mixedUri);
  await vscode.window.showTextDocument(mixedDocument);
  const htmlDollar = mixedSource.indexOf('$G', mixedSource.indexOf('<p>')) + '$G'.length;
  const htmlSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    mixedUri, mixedDocument.positionAt(htmlDollar));
  // The command can include VS Code's Text-kind word candidates even with the editor's word setting off.
  // Check SoPHP's Variable-kind result here; the visible suggestion widget needs separate Workbench coverage.
  assert.ok(!htmlSuggestions?.items.some((item) => item.label === '$globalName' && item.kind === vscode.CompletionItemKind.Variable),
    'SoPHP suggested a variable in HTML between PHP tags.');
  const phpDollar = mixedSource.lastIndexOf('$G;') + '$G'.length;
  const phpSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    mixedUri, mixedDocument.positionAt(phpDollar));
  assert.ok(phpSuggestions?.items.some((item) => item.label === '$globalName' && item.kind === vscode.CompletionItemKind.Variable),
    'PHP lost the variable suggestion after returning from HTML to PHP.');
  const htmlFunction = mixedSource.indexOf('globalHel</p>') + 'globalHel'.length;
  const htmlFunctionSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    mixedUri, mixedDocument.positionAt(htmlFunction));
  assert.ok(!htmlFunctionSuggestions?.items.some((item) => item.label === 'globalHelper' && item.kind === vscode.CompletionItemKind.Function),
    'SoPHP suggested a PHP function in HTML between PHP tags.');
  const phpFunction = mixedSource.lastIndexOf('globalHel;') + 'globalHel'.length;
  const phpFunctionSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    mixedUri, mixedDocument.positionAt(phpFunction));
  assert.ok(phpFunctionSuggestions?.items.some((item) => item.label === 'globalHelper' && item.kind === vscode.CompletionItemKind.Function),
    'PHP lost the function suggestion after returning from HTML to PHP.');
  if (c1DebugPort) {
    const mixedEditor = await vscode.window.showTextDocument(mixedDocument);
    mixedEditor.selection = new vscode.Selection(mixedDocument.positionAt(htmlDollar), mixedDocument.positionAt(htmlDollar));
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const labels = await visibleCompletionLabels(Number(c1DebugPort));
    assert.ok(!labels.some((label) => label.includes('$globalName')),
      `The Workbench visibly suggested a PHP variable in HTML: ${JSON.stringify(labels)}`);
    mixedEditor.selection = new vscode.Selection(mixedDocument.positionAt(htmlFunction), mixedDocument.positionAt(htmlFunction));
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const functionLabels = await visibleCompletionLabels(Number(c1DebugPort));
    assert.ok(!functionLabels.some((label) => label.includes('globalHelper')),
      `The Workbench visibly suggested a PHP function in HTML: ${JSON.stringify(functionLabels)}`);
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  }
  const scopedWordSource = '<?php function c1First(): void { $otherFunctionSecret = 1; } function c1Second(): void { $otherFunctionSec; }';
  const scopedWordUri = vscode.Uri.joinPath(folder, 'C1ScopedWord.php');
  await vscode.workspace.fs.writeFile(scopedWordUri, Buffer.from(scopedWordSource));
  const scopedWordDocument = await vscode.workspace.openTextDocument(scopedWordUri);
  await vscode.window.showTextDocument(scopedWordDocument);
  const scopedWordSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    scopedWordUri, scopedWordDocument.positionAt(scopedWordSource.indexOf('$otherFunctionSec;') + '$otherFunctionSec'.length));
  assert.ok(!scopedWordSuggestions?.items.some((item) => item.label === 'otherFunctionSecret' || item.label === '$otherFunctionSecret'),
    'PHP suggested a local variable from a different function in the current file.');
  const colonWordSource = `<?php function c1ColonConsume(string $value): void {}
function c1ColonWords(string $username, bool $flag): void {
  c1ColonConsume(value:$user);
  $result = $flag ? 'fallback' :$user;
}`;
  const colonWordUri = vscode.Uri.joinPath(folder, 'C1ColonWords.php');
  await vscode.workspace.fs.writeFile(colonWordUri, Buffer.from(colonWordSource));
  const colonWordDocument = await vscode.workspace.openTextDocument(colonWordUri);
  await vscode.window.showTextDocument(colonWordDocument);
  for (const marker of ['value:$user', ':$user;']) {
    const offset = colonWordSource.indexOf(marker) + marker.length - (marker.endsWith(';') ? 1 : 0);
    const suggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      colonWordUri, colonWordDocument.positionAt(offset));
    assert.ok(suggestions?.items.some((item) => item.label === '$username'),
      `PHP did not suggest the local variable after the colon in ${marker}`);
  }
  const arrowWordSource = '<?php function c1Arrow(string $customer): void { $customerName = $customer; $read = fn () => $cust; }';
  const arrowWordUri = vscode.Uri.joinPath(folder, 'C1ArrowWord.php');
  await vscode.workspace.fs.writeFile(arrowWordUri, Buffer.from(arrowWordSource));
  const arrowWordDocument = await vscode.workspace.openTextDocument(arrowWordUri);
  await vscode.window.showTextDocument(arrowWordDocument);
  const arrowWordSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    arrowWordUri, arrowWordDocument.positionAt(arrowWordSource.indexOf('$cust;') + '$cust'.length));
  assert.ok(arrowWordSuggestions?.items.some((item) => item.label === '$customerName'),
    'PHP arrow function no longer suggests a visible captured local variable.');
  const nestedWordSource = `<?php class C1NestedWords {
  public function run(array $rows): void {
    foreach ($rows as $entryKey => $entryValue) { $entryK; }
    $bound = function () { $thi; };
    $unbound = static function () { $thi; };
    [$firstPart, $secondPart] = $rows; $firstP;
    list($legacyPart) = $rows; $legacyP;
    global $sharedThing; static $cachedThing = []; $shar; $cach;
  }
}`;
  const nestedWordUri = vscode.Uri.joinPath(folder, 'C1NestedWords.php');
  await vscode.workspace.fs.writeFile(nestedWordUri, Buffer.from(nestedWordSource));
  const nestedWordDocument = await vscode.workspace.openTextDocument(nestedWordUri);
  await vscode.window.showTextDocument(nestedWordDocument);
  const nestedSuggestions = async (offset: number): Promise<vscode.CompletionItem[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', nestedWordUri, nestedWordDocument.positionAt(offset)))?.items ?? [];
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$entryK;') + '$entryK'.length))
    .some((item) => item.label === '$entryKey'), 'PHP foreach key variable was missing from scoped completion.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$thi;') + '$thi'.length))
    .some((item) => item.label === '$this'), 'PHP bound closure lost the $this suggestion.');
  assert.ok(!(await nestedSuggestions(nestedWordSource.lastIndexOf('$thi;') + '$thi'.length))
    .some((item) => item.label === '$this'), 'PHP static closure incorrectly suggested $this.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$firstP;') + '$firstP'.length))
    .some((item) => item.label === '$firstPart'), 'PHP short-array destructuring variable was missing from scoped completion.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$legacyP;') + '$legacyP'.length))
    .some((item) => item.label === '$legacyPart'), 'PHP list destructuring variable was missing from scoped completion.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$shar;') + '$shar'.length))
    .some((item) => item.label === '$sharedThing'), 'PHP global declaration variable was missing from scoped completion.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$cach;') + '$cach'.length))
    .some((item) => item.label === '$cachedThing'), 'PHP static local variable was missing from scoped completion.');
  if (process.env.PHP_COMPANION_TEST_C1_LEGACY_TYPE_NAMES === '1') {
    assert.ok(targetPhpVersion === '7.2' || targetPhpVersion === '7.4',
      'Legacy native-name class probe requires a PHP 7.2 or 7.4 target.');
    const legacySource = `<?php namespace App\\C1;
class mixed { public function ready(): void {} }
class never {}
function useLegacy(mixed $value): never { $value->ready(); return new never(); }`;
    const legacyUri = vscode.Uri.joinPath(folder, 'LegacyNativeNames.php');
    await vscode.workspace.fs.writeFile(legacyUri, Buffer.from(legacySource));
    const legacyDocument = await vscode.workspace.openTextDocument(legacyUri);
    await vscode.window.showTextDocument(legacyDocument);
    for (const name of ['mixed', 'never'] as const) {
      const declarationOffset = legacySource.indexOf(`class ${name}`) + 'class '.length;
      const typeOffset = legacySource.indexOf(name, legacySource.indexOf('function useLegacy'));
      const definitions = await waitForResult(
        () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', legacyUri,
          legacyDocument.positionAt(typeOffset + 1)),
        (result) => result?.some((location) => location.uri.toString() === legacyUri.toString()
          && location.range.start.isEqual(legacyDocument.positionAt(declarationOffset))) === true,
        `SoPHP did not navigate to the PHP 7 ${name} class declaration.`,
      );
      assert.ok(definitions.length > 0);
    }
    const legacyDiagnostics = vscode.languages.getDiagnostics(legacyUri);
    assert.ok(!legacyDiagnostics.some((diagnostic) => diagnostic.code === 'php.syntax'
      || diagnostic.code === 'php.version.unsupported'),
    `SoPHP reported a false PHP ${targetPhpVersion} error for legacy class names: ${JSON.stringify(legacyDiagnostics)}`);
    const commentedSource = `<?php namespace App\\C1\\Commented;
class /* legacy */ mixed {}
final /* legacy */ class never {}
function useCommented(mixed $value): never { return new never(); }`;
    const commentedUri = vscode.Uri.joinPath(folder, 'CommentedLegacyNames.php');
    await vscode.workspace.fs.writeFile(commentedUri, Buffer.from(commentedSource));
    const commentedDocument = await vscode.workspace.openTextDocument(commentedUri);
    await vscode.window.showTextDocument(commentedDocument);
    for (const name of ['mixed', 'never'] as const) {
      const declarationOffset = commentedSource.indexOf(`${name} {}`);
      const typeOffset = commentedSource.indexOf(name, commentedSource.indexOf('function useCommented'));
      await waitForResult(
        () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', commentedUri,
          commentedDocument.positionAt(typeOffset + 1)),
        (result) => result?.some((location) => location.uri.toString() === commentedUri.toString()
          && location.range.start.isEqual(commentedDocument.positionAt(declarationOffset))) === true,
        `SoPHP did not navigate to the commented PHP 7 ${name} class declaration.`,
      );
    }
    assert.ok(!vscode.languages.getDiagnostics(commentedUri).some((diagnostic) => diagnostic.code === 'php.syntax'
      || diagnostic.code === 'php.version.unsupported'),
    `SoPHP reported a false PHP ${targetPhpVersion} error for commented legacy class declarations.`);
    const renamedDeclaration = new vscode.WorkspaceEdit();
    const oldDeclaration = legacySource.indexOf('class mixed') + 'class '.length;
    renamedDeclaration.replace(legacyUri,
      new vscode.Range(legacyDocument.positionAt(oldDeclaration), legacyDocument.positionAt(oldDeclaration + 'mixed'.length)),
      'LegacyMixed');
    assert.ok(await vscode.workspace.applyEdit(renamedDeclaration));
    await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(legacyUri)),
      (result) => result.some((diagnostic) => diagnostic.code === 'php.version.unsupported'
        && diagnostic.message.includes('mixed type')),
      `SoPHP did not refresh PHP ${targetPhpVersion} diagnostics after the legacy class was renamed without saving.`,
    );
    const renamedReference = new vscode.WorkspaceEdit();
    const oldType = legacyDocument.getText().indexOf('mixed $value');
    renamedReference.replace(legacyUri,
      new vscode.Range(legacyDocument.positionAt(oldType), legacyDocument.positionAt(oldType + 'mixed'.length)),
      'LegacyMixed');
    assert.ok(await vscode.workspace.applyEdit(renamedReference));
    const edited = legacyDocument.getText();
    const newDeclaration = edited.indexOf('class LegacyMixed') + 'class '.length;
    const newType = edited.indexOf('LegacyMixed $value');
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', legacyUri,
        legacyDocument.positionAt(newType + 1)),
      (result) => result?.some((location) => location.uri.toString() === legacyUri.toString()
        && location.range.start.isEqual(legacyDocument.positionAt(newDeclaration))) === true,
      `SoPHP kept the old PHP ${targetPhpVersion} class navigation after an unsaved rename.`,
    );
    assert.ok(!vscode.languages.getDiagnostics(legacyUri).some((diagnostic) => diagnostic.code === 'php.version.unsupported'
      && diagnostic.message.includes('mixed type')),
    `SoPHP kept the old PHP ${targetPhpVersion} mixed-type diagnostic after the reference was updated.`);
    console.log(`C1 PHP ${targetPhpVersion} legacy mixed/never navigation and unsaved diagnostic transition passed.`);
  }
  const contractSource = '<?php namespace App\\C1; interface C1Contract { public function renderC1(int $count): string; }';
  const printerSource = '<?php namespace App\\C1; final class C1Printer implements C1Contract { public function renderC1(int $count): string { return (string) $count; } }';
  const otherSource = '<?php namespace App\\C1; final class C1Other { public function renderC1(): void {} }';
  const consumerSource = '<?php namespace App\\C1; function run(C1Contract $value): void { $value->renderC1(2); $value->renderC; }';
  const contractUri = vscode.Uri.joinPath(folder, 'C1Contract.php');
  const printerUri = vscode.Uri.joinPath(folder, 'C1Printer.php');
  const otherUri = vscode.Uri.joinPath(folder, 'C1Other.php');
  const consumerUri = vscode.Uri.joinPath(folder, 'C1Consumer.php');
  for (const [uri, source] of [[contractUri, contractSource], [printerUri, printerSource], [otherUri, otherSource], [consumerUri, consumerSource]] as const) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  }
  const document = await vscode.workspace.openTextDocument(consumerUri);
  await vscode.window.showTextDocument(document);
  const callOffset = consumerSource.indexOf('$value->renderC1(2)') + '$value->'.length;
  const completionOffset = consumerSource.indexOf('$value->renderC;') + '$value->renderC'.length;
  const started = Date.now();
  const completion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', consumerUri,
      document.positionAt(completionOffset), '>'),
    (result) => result?.items.some((item) => item.label === 'renderC1') === true,
    'SoPHP did not complete the Composer member in VS Code.',
  );
  assert.strictEqual(completion.items.filter((item) => item.label === 'renderC1').length, 1);
  const completionMs = Date.now() - started;
  const callPosition = document.positionAt(callOffset + 1);
  const hover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', consumerUri, callPosition),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('renderC1'))) === true,
    'SoPHP did not show the member Hover in VS Code.',
  );
  assert.ok(hover.length > 0);
  const signature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', consumerUri,
      document.positionAt(consumerSource.indexOf('$value->renderC1(2)') + '$value->renderC1('.length)),
    (result) => result?.signatures.some((item) => item.label.includes('renderC1(int $count): string')) === true,
    'SoPHP did not show the member signature in VS Code.',
  );
  assert.ok(signature.signatures.length > 0);
  const definition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri, callPosition),
    (result) => result?.some((item) => item.uri.toString() === contractUri.toString()) === true,
    'SoPHP did not navigate to the Composer interface method in VS Code.',
  );
  assert.deepStrictEqual(definition.map((item) => item.uri.toString()), [contractUri.toString()]);
  const implementation = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', consumerUri, callPosition),
    (result) => result?.some((item) => item.uri.toString() === printerUri.toString()) === true,
    'SoPHP did not navigate to the implementing method in VS Code.',
  );
  assert.deepStrictEqual(implementation.map((item) => item.uri.toString()), [printerUri.toString()]);
  const references = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', consumerUri, callPosition),
    (result) => result?.some((item) => item.uri.toString() === consumerUri.toString()) === true,
    'SoPHP did not return the member call reference in VS Code.',
  );
  assert.ok(references.every((item) => item.uri.toString() !== otherUri.toString()));
  await timingApi.requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const warm = {
    completion: await warmLatency(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', consumerUri,
        document.positionAt(completionOffset), '>'),
      (result) => result?.items.some((item) => item.label === 'renderC1') === true, 'Completion'),
    hover: await warmLatency(
      () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', consumerUri, callPosition),
      (result) => result?.length > 0, 'Hover'),
    signature: await warmLatency(
      () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', consumerUri,
        document.positionAt(consumerSource.indexOf('$value->renderC1(2)') + '$value->renderC1('.length)),
      (result) => result?.signatures.some((item) => item.label.includes('renderC1(int $count): string')) === true, 'Signature Help'),
    definition: await warmLatency(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri, callPosition),
      (result) => result?.some((item) => item.uri.toString() === contractUri.toString()) === true, 'Definition'),
    implementation: await warmLatency(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', consumerUri, callPosition),
      (result) => result?.some((item) => item.uri.toString() === printerUri.toString()) === true, 'Implementation'),
    references: await warmLatency(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', consumerUri, callPosition),
      (result) => result?.some((item) => item.uri.toString() === consumerUri.toString()) === true, 'References'),
  };
  const serverTimings = await timingApi.requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
  const languageClientRoundTrip = await warmLatency(
    () => timingApi.requestLanguageServer!<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: false }),
    (result) => result !== undefined, 'Language Client round trip');
  const builtinSource = '<?php namespace App\\C1; function builtins(): void { ab }';
  const builtinUri = vscode.Uri.joinPath(folder, 'BuiltinCompletion.php');
  await vscode.workspace.fs.writeFile(builtinUri, Buffer.from(builtinSource));
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(builtinUri));
  const builtinCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', builtinUri,
      new vscode.Position(0, builtinSource.indexOf('ab }') + 2)),
    (result) => result?.items.some((item) => item.label === 'abs') === true,
    'SoPHP did not complete the built-in abs function.',
  );
  assert.strictEqual(builtinCompletion.items.filter((item) => item.label === 'abs').length, 1,
    'PHP built-in completion was returned by more than one provider.');
  const keywordSource = '<?php\n$app = n';
  const keywordUri = vscode.Uri.joinPath(folder, 'C1NewKeywordConsumer.php');
  await vscode.workspace.fs.writeFile(keywordUri, Buffer.from(keywordSource));
  const keywordDocument = await vscode.workspace.openTextDocument(keywordUri);
  await vscode.window.showTextDocument(keywordDocument);
  const keywordCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', keywordUri,
      keywordDocument.positionAt(keywordSource.length)),
    (result) => result?.items.some((item) => item.label === 'new' && item.kind === vscode.CompletionItemKind.Keyword) === true,
    'SoPHP did not suggest the new keyword after an assignment.',
  );
  const newKeyword = keywordCompletion.items.find((item) => item.label === 'new');
  assert.strictEqual(newKeyword?.textEdit?.newText, 'new ');
  assert.strictEqual(newKeyword?.preselect, true);
  assert.ok(!keywordCompletion.items.some((item) => ['nav', 'noframes', 'noscript'].includes(String(item.label))),
    'PHP expression completion included HTML Emmet abbreviations.');
  assert.ok(keywordCompletion.items.some((item) => item.label === 'number_format'),
    'Suppressing HTML suggestions also removed a valid PHP function.');
  const functionSource = '<?php\n$app = 1;\nfunc';
  const functionUri = vscode.Uri.joinPath(folder, 'C1FunctionKeywordConsumer.php');
  await vscode.workspace.fs.writeFile(functionUri, Buffer.from(functionSource));
  const functionDocument = await vscode.workspace.openTextDocument(functionUri);
  await vscode.window.showTextDocument(functionDocument);
  const functionCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', functionUri,
      functionDocument.positionAt(functionSource.length)),
    (result) => result?.items.some((item) => item.label === 'function' && item.kind === vscode.CompletionItemKind.Keyword) === true,
    'SoPHP did not suggest the function keyword after func.',
  );
  const functionKeyword = functionCompletion.items.find((item) => item.label === 'function');
  assert.strictEqual(functionKeyword?.textEdit?.newText, 'function ');
  assert.strictEqual(functionKeyword?.preselect, true);
  assert.ok(!functionCompletion.items.some((item) => item.label === 'func_get_arg'),
    'A declaration keyword was mixed with unrelated callable names.');
  const returnSource = '<?php\nfunction asdf() {\n    retu\n}';
  const returnUri = vscode.Uri.joinPath(folder, 'C1ReturnKeywordConsumer.php');
  await vscode.workspace.fs.writeFile(returnUri, Buffer.from(returnSource));
  const returnDocument = await vscode.workspace.openTextDocument(returnUri);
  await vscode.window.showTextDocument(returnDocument);
  const returnCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', returnUri,
      returnDocument.positionAt(returnSource.indexOf('retu') + 4)),
    (result) => result?.items.some((item) => item.label === 'return' && item.kind === vscode.CompletionItemKind.Keyword) === true,
    'SoPHP did not suggest return inside a PHP function.',
  );
  const returnKeyword = returnCompletion.items.find((item) => item.label === 'return');
  assert.strictEqual(returnKeyword?.textEdit?.newText, 'return ');
  assert.strictEqual(returnKeyword?.preselect, true);
  console.log('C1 return completion candidates:', returnCompletion.items.slice(0, 10).map((item) => String(item.label)).join(', '));
  const typeSource = '<?php namespace App\\C1; function instantiate(): void { new C1TypeCompletionPro; }';
  const typeUri = vscode.Uri.joinPath(folder, 'C1TypeCompletionConsumer.php');
  const typeDeclarationUri = vscode.Uri.joinPath(folder, 'C1TypeCompletionProbe.php');
  await vscode.workspace.fs.writeFile(typeDeclarationUri, Buffer.from('<?php namespace App\\C1; class C1TypeCompletionProbe {}'));
  const abstractTypeUri = vscode.Uri.joinPath(folder, 'C1TypeCompletionPrototype.php');
  await vscode.workspace.fs.writeFile(abstractTypeUri,
    Buffer.from('<?php namespace App\\C1; abstract class C1TypeCompletionPrototype {}'));
  await vscode.workspace.fs.writeFile(typeUri, Buffer.from(typeSource));
  const typeDocument = await vscode.workspace.openTextDocument(typeUri);
  await vscode.window.showTextDocument(typeDocument);
  const typeCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', typeUri,
      typeDocument.positionAt(typeSource.indexOf('C1TypeCompletionPro') + 'C1TypeCompletionPro'.length)),
    (result) => result?.items.some((item) => item.label === 'C1TypeCompletionProbe') === true,
    'SoPHP did not complete a project class name in VS Code.',
  );
  assert.strictEqual(typeCompletion.items.filter((item) => item.label === 'C1TypeCompletionProbe').length, 1,
    'Project class completion was returned more than once.');
  assert.ok(!typeCompletion.items.some((item) => item.label === 'C1TypeCompletionPrototype'),
    'Construction completion suggested an abstract class.');
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'C1CtorPublicProbe.php'),
    Buffer.from('<?php namespace App\\C1; class C1CtorPublicProbe { public function __construct() {} }'));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'C1CtorPrivateProbe.php'),
    Buffer.from('<?php namespace App\\C1; class C1CtorPrivateProbe { private function __construct() {} }'));
  const constructorSource = '<?php namespace App\\C1; function create(): void { new C1CtorP';
  const constructorUri = vscode.Uri.joinPath(folder, 'C1CtorConsumer.php');
  await vscode.workspace.fs.writeFile(constructorUri, Buffer.from(constructorSource));
  const constructorDocument = await vscode.workspace.openTextDocument(constructorUri);
  await vscode.window.showTextDocument(constructorDocument);
  const constructorCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', constructorUri,
      constructorDocument.positionAt(constructorSource.length)),
    (result) => result?.items.some((item) => item.label === 'C1CtorPublicProbe') === true,
    'SoPHP did not suggest a class with a public constructor.',
  );
  assert.ok(!constructorCompletion.items.some((item) => item.label === 'C1CtorPrivateProbe'),
    'Construction completion suggested a class with an inaccessible private constructor.');
  const privateConstructorDocument = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(folder, 'C1CtorPrivateProbe.php'));
  await vscode.window.showTextDocument(privateConstructorDocument);
  const constructorVisibilityStart = privateConstructorDocument.getText().indexOf('private function __construct');
  const constructorVisibilityRange = new vscode.Range(privateConstructorDocument.positionAt(constructorVisibilityStart),
    privateConstructorDocument.positionAt(constructorVisibilityStart + 'private'.length));
  const revealConstructor = new vscode.WorkspaceEdit();
  revealConstructor.replace(privateConstructorDocument.uri, constructorVisibilityRange, 'public');
  assert.ok(await vscode.workspace.applyEdit(revealConstructor), 'Could not make the project constructor public without saving.');
  await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', constructorUri,
      constructorDocument.positionAt(constructorSource.length)),
    (result) => result?.items.some((item) => item.label === 'C1CtorPrivateProbe') === true,
    'Construction completion did not refresh an unsaved public constructor.',
  );
  const hideConstructor = new vscode.WorkspaceEdit();
  hideConstructor.replace(privateConstructorDocument.uri, new vscode.Range(privateConstructorDocument.positionAt(constructorVisibilityStart),
    privateConstructorDocument.positionAt(constructorVisibilityStart + 'public'.length)), 'private');
  assert.ok(await vscode.workspace.applyEdit(hideConstructor), 'Could not restore the project constructor visibility.');
  const privateCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', constructorUri,
      constructorDocument.positionAt(constructorSource.length)),
    (result) => result?.items.some((item) => item.label === 'C1CtorPublicProbe') === true
      && !result.items.some((item) => item.label === 'C1CtorPrivateProbe'),
    'Construction completion did not retract an unsaved private constructor.',
  );
  assert.ok(!privateCompletion.items.some((item) => item.label === 'C1CtorPrivateProbe'));
  const externalFolder = vscode.Uri.joinPath(folder, 'External');
  await vscode.workspace.fs.createDirectory(externalFolder);
  const externalTypeUri = vscode.Uri.joinPath(externalFolder, 'C1ExternalTypeProbe.php');
  await vscode.workspace.fs.writeFile(externalTypeUri, Buffer.from('<?php namespace App\\C1\\External; class C1ExternalTypeProbe {}'));
  const externalTypeSource = '<?php namespace App\\C1; function externalType(): void { new C1ExternalTypePro; }';
  const externalTypeConsumerUri = vscode.Uri.joinPath(folder, 'C1ExternalTypeConsumer.php');
  await vscode.workspace.fs.writeFile(externalTypeConsumerUri, Buffer.from(externalTypeSource));
  const externalTypeDocument = await vscode.workspace.openTextDocument(externalTypeConsumerUri);
  await vscode.window.showTextDocument(externalTypeDocument);
  const externalTypeCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', externalTypeConsumerUri,
      externalTypeDocument.positionAt(externalTypeSource.indexOf('C1ExternalTypePro') + 'C1ExternalTypePro'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && item.additionalTextEdits?.some((entry) => entry.newText.includes('use App\\C1\\External\\C1ExternalTypeProbe;'))) === true,
    'SoPHP did not offer a cross-namespace class with its import in VS Code.',
  );
  assert.strictEqual(externalTypeCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1,
    'Cross-namespace class completion was returned more than once.');
  const traitUri = vscode.Uri.joinPath(externalFolder, 'C1ExternalTraitProbe.php');
  const nonTraitUri = vscode.Uri.joinPath(externalFolder, 'C1ExternalTraitThing.php');
  await vscode.workspace.fs.writeFile(traitUri, Buffer.from('<?php namespace App\\C1\\External; trait C1ExternalTraitProbe {}'));
  await vscode.workspace.fs.writeFile(nonTraitUri, Buffer.from('<?php namespace App\\C1\\External; class C1ExternalTraitThing {}'));
  const traitSource = '<?php namespace App\\C1; class C1TraitConsumer { use C1ExternalTraitPro; }';
  const traitConsumerUri = vscode.Uri.joinPath(folder, 'C1TraitConsumer.php');
  await vscode.workspace.fs.writeFile(traitConsumerUri, Buffer.from(traitSource));
  const traitDocument = await vscode.workspace.openTextDocument(traitConsumerUri);
  await vscode.window.showTextDocument(traitDocument);
  const traitCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', traitConsumerUri,
      traitDocument.positionAt(traitSource.indexOf('C1ExternalTraitPro') + 'C1ExternalTraitPro'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTraitProbe'
      && item.additionalTextEdits?.some((entry) => entry.newText.includes('use App\\C1\\External\\C1ExternalTraitProbe;'))) === true,
    'SoPHP did not offer a cross-namespace trait with its import inside a class use declaration.',
  );
  assert.ok(!traitCompletion.items.some((item) => item.label === 'C1ExternalTraitThing'),
    'SoPHP offered a class where PHP requires a trait.');
  for (const [kind, suffix, body] of [
    ['class', 'Class', '{}'], ['interface', 'Interface', '{}'],
    ['trait', 'Trait', '{}'], ['enum', 'Enum', '{ case One; }'],
  ] as const) {
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(externalFolder, `C1Inheritance${suffix}.php`),
      Buffer.from(`<?php namespace App\\C1\\External; ${kind === 'class' ? '#[\\Attribute] ' : ''}${kind} C1Inheritance${suffix} ${body}`));
  }
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(externalFolder, 'C1InheritancePlain.php'),
    Buffer.from('<?php namespace App\\C1\\External; class C1InheritancePlain {}'));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(externalFolder, 'C1InheritanceAlias.php'),
    Buffer.from('<?php namespace App\\C1\\External; use Attribute as Marker; #[Marker] class C1InheritanceAlias {}'));
  const inheritanceSource = '<?php namespace App\\C1; class C1Child extends C1Inheritance {} class C1Adapter implements C1Inheritance {}';
  const inheritanceUri = vscode.Uri.joinPath(folder, 'C1InheritanceConsumer.php');
  await vscode.workspace.fs.writeFile(inheritanceUri, Buffer.from(inheritanceSource));
  const inheritanceDocument = await vscode.workspace.openTextDocument(inheritanceUri);
  await vscode.window.showTextDocument(inheritanceDocument);
  for (const [marker, expected, excluded] of [
    ['extends C1Inheritance', 'C1InheritanceClass', 'C1InheritanceInterface'],
    ['implements C1Inheritance', 'C1InheritanceInterface', 'C1InheritanceClass'],
  ] as const) {
    const suggestions = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', inheritanceUri,
        inheritanceDocument.positionAt(inheritanceSource.indexOf(marker) + marker.length)),
      (result) => result?.items.some((item) => item.label === expected) === true,
      `SoPHP did not suggest ${expected} in ${marker}.`,
    );
    assert.ok(!suggestions.items.some((item) => item.label === excluded
      || item.label === 'C1InheritanceTrait' || item.label === 'C1InheritanceEnum'),
    `SoPHP suggested an invalid declaration kind in ${marker}.`);
  }
  const constructionSource = `<?php namespace App\\C1;
#[C1Inheritance]
class C1ConstructionPositions {
  public function run(object $value): void {
    new C1Inheritance;
    if ($value instanceof C1Inheritance) {}
  }
}`;
  const constructionUri = vscode.Uri.joinPath(folder, 'C1ConstructionPositions.php');
  await vscode.workspace.fs.writeFile(constructionUri, Buffer.from(constructionSource));
  const constructionDocument = await vscode.workspace.openTextDocument(constructionUri);
  await vscode.window.showTextDocument(constructionDocument);
  for (const [marker, allowed, rejected] of [
    ['new C1Inheritance', ['C1InheritanceClass'], ['C1InheritanceInterface', 'C1InheritanceTrait', 'C1InheritanceEnum']],
    ['instanceof C1Inheritance', supportsEnums
      ? ['C1InheritanceClass', 'C1InheritanceInterface', 'C1InheritanceEnum']
      : ['C1InheritanceClass', 'C1InheritanceInterface'],
    supportsEnums ? ['C1InheritanceTrait'] : ['C1InheritanceTrait', 'C1InheritanceEnum']],
    ['#[C1Inheritance', ['C1InheritanceClass', 'C1InheritanceAlias'],
      ['C1InheritancePlain', 'C1InheritanceInterface', 'C1InheritanceTrait', 'C1InheritanceEnum']],
  ] as const) {
    if (marker.startsWith('#[') && !supportsAttributes) continue;
    const suggestions = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', constructionUri,
        constructionDocument.positionAt(constructionSource.indexOf(marker) + marker.length)),
      (result) => allowed.every((name) => result?.items.some((item) => item.label === name)),
      `SoPHP did not complete the valid PHP types in ${marker}.`,
    );
    for (const name of rejected) assert.ok(!suggestions.items.some((item) => item.label === name),
      `SoPHP suggested invalid ${name} in ${marker}.`);
  }
  if (supportsAttributes) {
  for (const [name, flags] of [
    ['C1TargetClass', '\\Attribute::TARGET_CLASS'],
    ['C1TargetMethod', '\\Attribute::TARGET_METHOD'],
    ['C1TargetAll', undefined],
    ['C1TargetRepeat', '\\Attribute::TARGET_ALL | \\Attribute::IS_REPEATABLE'],
  ] as const) {
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(externalFolder, `${name}.php`),
      Buffer.from(`<?php namespace App\\C1\\External; #[\\Attribute${flags ? `(${flags})` : ''}] class ${name} {}`));
  }
  const targetSource = `<?php namespace App\\C1;
#[C1Target] class C1TargetConsumer { #[C1Target] public function run(): void {} }`;
  const targetUri = vscode.Uri.joinPath(folder, 'C1TargetConsumer.php');
  await vscode.workspace.fs.writeFile(targetUri, Buffer.from(targetSource));
  const targetDocument = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(targetDocument);
  for (const [at, expected, rejected] of [
    [targetSource.indexOf('C1Target]'), 'C1TargetClass', 'C1TargetMethod'],
    [targetSource.lastIndexOf('C1Target]'), 'C1TargetMethod', 'C1TargetClass'],
  ] as const) {
    const suggestions = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', targetUri,
        targetDocument.positionAt(at + 'C1Target'.length)),
      (result) => result?.items.some((item) => item.label === expected) === true,
      `SoPHP omitted ${expected} at an Attribute target.`,
    );
    assert.ok(suggestions.items.some((item) => item.label === 'C1TargetAll'), 'Default Attribute target was omitted.');
    assert.ok(!suggestions.items.some((item) => item.label === rejected),
      `SoPHP suggested ${rejected} at the wrong Attribute target.`);
  }
  const groupedSource = `<?php namespace App\\C1;
#[\\App\\C1\\External\\C1TargetAll, C1Target] class C1GroupedTargetConsumer {
  #[\\App\\C1\\External\\C1TargetAll, C1Target] public function run(): void {}
}`;
  const groupedUri = vscode.Uri.joinPath(folder, 'C1GroupedTargetConsumer.php');
  await vscode.workspace.fs.writeFile(groupedUri, Buffer.from(groupedSource));
  const groupedDocument = await vscode.workspace.openTextDocument(groupedUri);
  await vscode.window.showTextDocument(groupedDocument);
  for (const [at, expected, rejected] of [
    [groupedSource.indexOf(', C1Target'), 'C1TargetClass', 'C1TargetMethod'],
    [groupedSource.lastIndexOf(', C1Target'), 'C1TargetMethod', 'C1TargetClass'],
  ] as const) {
    const suggestions = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', groupedUri,
        groupedDocument.positionAt(at + ', C1Target'.length)),
      (result) => result?.items.some((item) => item.label === expected) === true,
      `SoPHP omitted ${expected} as the second name in an Attribute group.`,
    );
    assert.ok(!suggestions.items.some((item) => item.label === 'C1TargetAll'),
      'Grouped Attribute repeated a non-repeatable class.');
    assert.ok(suggestions.items.some((item) => item.label === 'C1TargetRepeat'),
      'Grouped Attribute omitted a repeatable class.');
    assert.ok(!suggestions.items.some((item) => item.label === rejected),
      `Grouped Attribute suggested ${rejected} at the wrong target.`);
  }
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(externalFolder, 'C1AttrArguments.php'),
    Buffer.from(`<?php namespace App\\C1\\External;
#[\\Attribute] class C1AttrArguments { public function __construct(string $name, int $count = 0) {} }`));
  const attributeArgumentsSource = '<?php namespace App\\C1; use App\\C1\\External\\C1AttrArguments; #[C1AttrArguments(na';
  const attributeArgumentsUri = vscode.Uri.joinPath(folder, 'C1AttrArgumentsConsumer.php');
  await vscode.workspace.fs.writeFile(attributeArgumentsUri, Buffer.from(attributeArgumentsSource));
  const attributeArgumentsDocument = await vscode.workspace.openTextDocument(attributeArgumentsUri);
  await vscode.window.showTextDocument(attributeArgumentsDocument);
  const attributeArgumentsPosition = attributeArgumentsDocument.positionAt(attributeArgumentsSource.length);
  const attributeArgumentSuggestions = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      attributeArgumentsUri, attributeArgumentsPosition),
    (result) => result?.items.some((item) => item.label === 'name:') === true,
    'SoPHP did not suggest a PHP Attribute constructor parameter.',
  );
  assert.ok(attributeArgumentSuggestions.items.some((item) => item.label === 'name:'));
  const attributeSignature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', attributeArgumentsUri, attributeArgumentsPosition);
  assert.ok(attributeSignature?.signatures.some((item) => item.label.includes('name')),
    'SoPHP did not show the PHP Attribute constructor signature.');
  }
  const catchTypeUri = vscode.Uri.joinPath(externalFolder, 'C1ExternalCatchException.php');
  await vscode.workspace.fs.writeFile(catchTypeUri,
    Buffer.from('<?php namespace App\\C1\\External; class C1ExternalCatchException extends \\RuntimeException {}'));
  const ordinaryCatchTypeUri = vscode.Uri.joinPath(externalFolder, 'C1ExternalCatchExample.php');
  await vscode.workspace.fs.writeFile(ordinaryCatchTypeUri,
    Buffer.from('<?php namespace App\\C1\\External; class C1ExternalCatchExample {}'));
  const catchSource = '<?php namespace App\\C1; function catchTypes(): void { try {} catch (\\LogicException|C1ExternalCatchEx';
  const catchUri = vscode.Uri.joinPath(folder, 'C1MultiCatchConsumer.php');
  await vscode.workspace.fs.writeFile(catchUri, Buffer.from(catchSource));
  const catchDocument = await vscode.workspace.openTextDocument(catchUri);
  await vscode.window.showTextDocument(catchDocument);
  const catchCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', catchUri,
      catchDocument.positionAt(catchSource.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalCatchException'
      && item.kind === vscode.CompletionItemKind.Class
      && item.additionalTextEdits?.some((edit) => edit.newText.includes('use App\\C1\\External\\C1ExternalCatchException;'))) === true,
    'SoPHP did not complete the second exception type in a multi-catch clause.',
  );
  assert.strictEqual(catchCompletion.items.filter((item) => item.label === 'C1ExternalCatchException').length, 1,
    'Multi-catch completion returned the project exception more than once.');
  assert.ok(!catchCompletion.items.some((item) => item.label === 'C1ExternalCatchExample'),
    'Multi-catch completion suggested a known ordinary class.');
  const qualifiedTypeSource = '<?php namespace App\\C1; use App\\C1\\External as ExtAlias; '
    + 'function qualified(): void { new \\App; new \\App\\C1\\Ext; new ExtAlias\\C1ExternalTypePro; }';
  const qualifiedTypeUri = vscode.Uri.joinPath(folder, 'C1QualifiedTypeConsumer.php');
  await vscode.workspace.fs.writeFile(qualifiedTypeUri, Buffer.from(qualifiedTypeSource));
  const qualifiedTypeDocument = await vscode.workspace.openTextDocument(qualifiedTypeUri);
  const qualifiedTypeEditor = await vscode.window.showTextDocument(qualifiedTypeDocument);
  const rootNamespaceOffset = qualifiedTypeSource.indexOf('new \\App;') + 'new \\App'.length;
  const rootNamespaceCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', qualifiedTypeUri,
      qualifiedTypeDocument.positionAt(rootNamespaceOffset)),
    (result) => result?.items.some((item) => item.label === 'App\\'
      && item.kind === vscode.CompletionItemKind.Module && item.detail === 'App\\') === true,
    'SoPHP did not suggest the first absolute namespace segment in a native type position.',
  );
  assert.strictEqual(rootNamespaceCompletion.items.filter((item) => item.label === 'App\\').length, 1);
  const namespaceOffset = qualifiedTypeSource.indexOf('new \\App\\C1\\Ext') + 'new \\App\\C1\\Ext'.length;
  const qualifiedNamespaceCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', qualifiedTypeUri,
      qualifiedTypeDocument.positionAt(namespaceOffset)),
    (result) => result?.items.some((item) => item.label === 'External\\'
      && item.kind === vscode.CompletionItemKind.Module && item.detail === 'App\\C1\\External\\') === true,
    'SoPHP did not suggest the next namespace segment in a native type position.',
  );
  assert.strictEqual(qualifiedNamespaceCompletion.items.filter((item) => item.label === 'External\\').length, 1);
  assert.ok(!qualifiedNamespaceCompletion.items.some((item) => item.label === 'extract'),
    'A PHP function displaced native type namespace completion.');
  qualifiedTypeEditor.selection = new vscode.Selection(qualifiedTypeDocument.positionAt(namespaceOffset),
    qualifiedTypeDocument.positionAt(namespaceOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.ok(qualifiedTypeDocument.getText().includes('new \\App\\C1\\External\\;'),
    'Accepting a native type namespace suggestion did not preserve the typed qualifier.');
  const qualifiedClassText = qualifiedTypeDocument.getText();
  const qualifiedClassCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', qualifiedTypeUri,
      qualifiedTypeDocument.positionAt(qualifiedClassText.indexOf('ExtAlias\\C1ExternalTypePro')
        + 'ExtAlias\\C1ExternalTypePro'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe' && !item.additionalTextEdits?.length) === true,
    'SoPHP did not complete an imported namespace alias in a native type position.',
  );
  assert.strictEqual(qualifiedClassCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1);
  const namespaceImportSource = '<?php namespace App\\C1; use Ap; class NamespaceImportConsumer {}';
  const namespaceImportUri = vscode.Uri.joinPath(folder, 'C1NamespaceImportConsumer.php');
  await vscode.workspace.fs.writeFile(namespaceImportUri, Buffer.from(namespaceImportSource));
  const namespaceImportDocument = await vscode.workspace.openTextDocument(namespaceImportUri);
  const namespaceImportEditor = await vscode.window.showTextDocument(namespaceImportDocument);
  const namespaceImportOffset = namespaceImportSource.indexOf('use Ap') + 'use Ap'.length;
  const namespaceImportCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', namespaceImportUri,
      namespaceImportDocument.positionAt(namespaceImportOffset)),
    (result) => result?.items.some((item) => item.label === 'App\\' && item.kind === vscode.CompletionItemKind.Module) === true,
    'SoPHP did not suggest the Composer PSR-4 root namespace after use Ap.',
  );
  assert.strictEqual(namespaceImportCompletion.items.filter((item) => item.label === 'App\\').length, 1);
  namespaceImportEditor.selection = new vscode.Selection(namespaceImportDocument.positionAt(namespaceImportOffset),
    namespaceImportDocument.positionAt(namespaceImportOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(namespaceImportDocument.getText(), namespaceImportSource.replace('use Ap;', 'use App\\;'),
    'Accepting the Composer namespace suggestion did not finish the use prefix.');
  const nestedNamespaceCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', namespaceImportUri,
      namespaceImportDocument.positionAt(namespaceImportDocument.getText().indexOf('use App\\') + 'use App\\'.length)),
    (result) => result?.items.some((item) => item.label === 'C1\\' && item.kind === vscode.CompletionItemKind.Module) === true,
    'SoPHP did not offer the next Composer namespace segment after accepting App.',
  );
  assert.strictEqual(nestedNamespaceCompletion.items.filter((item) => item.label === 'C1\\').length, 1);
  const namespacePathEdit = new vscode.WorkspaceEdit();
  namespacePathEdit.insert(namespaceImportUri,
    namespaceImportDocument.positionAt(namespaceImportDocument.getText().indexOf('use App\\') + 'use App\\'.length),
    'C1\\External\\');
  assert.ok(await vscode.workspace.applyEdit(namespacePathEdit));
  const openImportText = namespaceImportDocument.getText();
  const emptyClassCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', namespaceImportUri,
      namespaceImportDocument.positionAt(openImportText.indexOf('use App\\C1\\External\\') + 'use App\\C1\\External\\'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe' && !item.additionalTextEdits?.length) === true,
    'SoPHP did not offer a class immediately after the completed namespace path.',
  );
  assert.strictEqual(emptyClassCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1);
  const manualImportSource = '<?php namespace App\\C1; use App\\C1\\External\\C1ExternalTypePro; class ManualImportConsumer {}';
  const manualImportUri = vscode.Uri.joinPath(folder, 'C1ManualImportConsumer.php');
  await vscode.workspace.fs.writeFile(manualImportUri, Buffer.from(manualImportSource));
  const manualImportDocument = await vscode.workspace.openTextDocument(manualImportUri);
  const manualImportEditor = await vscode.window.showTextDocument(manualImportDocument);
  const manualImportCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', manualImportUri,
      manualImportDocument.positionAt(manualImportSource.indexOf('External\\C1ExternalTypePro') + 'External\\C1ExternalTypePro'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && !item.additionalTextEdits?.length) === true,
    'SoPHP did not complete a hand-written qualified use import in VS Code.',
  );
  assert.strictEqual(manualImportCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1);
  manualImportEditor.selection = new vscode.Selection(
    manualImportDocument.positionAt(manualImportSource.indexOf('External\\C1ExternalTypePro') + 'External\\C1ExternalTypePro'.length),
    manualImportDocument.positionAt(manualImportSource.indexOf('External\\C1ExternalTypePro') + 'External\\C1ExternalTypePro'.length));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(manualImportDocument.getText(), manualImportSource.replace('C1ExternalTypePro;', 'C1ExternalTypeProbe;'),
    'Accepting the class suggestion did not finish the existing use statement exactly once.');
  const groupImportSource = '<?php namespace App\\C1; use App\\C1\\External\\{C1ExternalTypePro}; class GroupImportConsumer {}';
  const groupImportUri = vscode.Uri.joinPath(folder, 'C1GroupImportConsumer.php');
  await vscode.workspace.fs.writeFile(groupImportUri, Buffer.from(groupImportSource));
  const groupImportDocument = await vscode.workspace.openTextDocument(groupImportUri);
  const groupImportEditor = await vscode.window.showTextDocument(groupImportDocument);
  const groupImportOffset = groupImportSource.indexOf('{C1ExternalTypePro') + '{C1ExternalTypePro'.length;
  const groupImportCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', groupImportUri,
      groupImportDocument.positionAt(groupImportOffset)),
    (result) => result?.items.filter((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe'
      && !item.additionalTextEdits?.length).length === 1,
    'SoPHP did not complete a class member in a hand-written group use.',
  );
  assert.strictEqual(groupImportCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1);
  const groupItem = groupImportCompletion.items.find((item) => item.label === 'C1ExternalTypeProbe')!;
  const groupRange = groupItem.range instanceof vscode.Range ? groupItem.range : groupItem.range?.replacing;
  assert.ok(groupRange && groupImportDocument.getText(groupRange) === '{C1ExternalTypePro}'
    && groupItem.insertText === '{C1ExternalTypeProbe}',
  'The group use completion would lose its braces while replacing the member.');
  groupImportEditor.selection = new vscode.Selection(groupImportDocument.positionAt(groupImportOffset),
    groupImportDocument.positionAt(groupImportOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  assert.strictEqual(groupImportDocument.getText(), groupImportSource,
    'Opening group use suggestions changed the source before any suggestion was accepted.');
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(groupImportDocument.getText(), groupImportSource.replace('C1ExternalTypePro}', 'C1ExternalTypeProbe}'),
    'Accepting the class suggestion did not finish the existing group use member exactly once.');
  const laterGroupSource = groupImportSource.replace('{C1ExternalTypePro}', '{ExistingType, C1ExternalTypePro}')
    .replace('GroupImportConsumer', 'LaterGroupImportConsumer');
  const laterGroupUri = vscode.Uri.joinPath(folder, 'C1LaterGroupImportConsumer.php');
  await vscode.workspace.fs.writeFile(laterGroupUri, Buffer.from(laterGroupSource));
  const laterGroupDocument = await vscode.workspace.openTextDocument(laterGroupUri);
  const laterGroupEditor = await vscode.window.showTextDocument(laterGroupDocument);
  const laterGroupOffset = laterGroupSource.indexOf('C1ExternalTypePro}') + 'C1ExternalTypePro'.length;
  await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', laterGroupUri,
      laterGroupDocument.positionAt(laterGroupOffset)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe') === true,
    'SoPHP did not complete a later class member in a group use.',
  );
  laterGroupEditor.selection = new vscode.Selection(laterGroupDocument.positionAt(laterGroupOffset),
    laterGroupDocument.positionAt(laterGroupOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(laterGroupDocument.getText(), laterGroupSource.replace('C1ExternalTypePro}', 'C1ExternalTypeProbe}'),
    'Accepting a later group use member changed an earlier member or the braces.');
  const nestedGroupSource = '<?php namespace App\\C1; use App\\C1\\{External\\C1ExternalTypePro}; class NestedGroupImportConsumer {}';
  const nestedGroupUri = vscode.Uri.joinPath(folder, 'C1NestedGroupImportConsumer.php');
  await vscode.workspace.fs.writeFile(nestedGroupUri, Buffer.from(nestedGroupSource));
  const nestedGroupDocument = await vscode.workspace.openTextDocument(nestedGroupUri);
  const nestedGroupEditor = await vscode.window.showTextDocument(nestedGroupDocument);
  const nestedGroupOffset = nestedGroupSource.indexOf('C1ExternalTypePro}') + 'C1ExternalTypePro'.length;
  const nestedGroupCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', nestedGroupUri,
      nestedGroupDocument.positionAt(nestedGroupOffset)),
    (result) => result?.items.filter((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe' && !item.additionalTextEdits?.length).length === 1,
    'SoPHP did not complete a nested class member in a group use.',
  );
  const nestedGroupItem = nestedGroupCompletion.items.find((item) => item.label === 'C1ExternalTypeProbe')!;
  const nestedGroupRange = nestedGroupItem.range instanceof vscode.Range ? nestedGroupItem.range : nestedGroupItem.range?.replacing;
  assert.ok(nestedGroupRange && nestedGroupDocument.getText(nestedGroupRange) === '{External\\C1ExternalTypePro}'
    && nestedGroupItem.insertText === '{External\\C1ExternalTypeProbe}',
  'The nested group use completion would change its namespace prefix or braces.');
  nestedGroupEditor.selection = new vscode.Selection(nestedGroupDocument.positionAt(nestedGroupOffset),
    nestedGroupDocument.positionAt(nestedGroupOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(nestedGroupDocument.getText(), nestedGroupSource.replace('C1ExternalTypePro}', 'C1ExternalTypeProbe}'),
    'Accepting the nested group use member changed its prefix or braces.');
  const groupNamespaceSource = '<?php namespace App\\C1; use App\\C1\\{Exte}; class GroupNamespaceImportConsumer {}';
  const groupNamespaceUri = vscode.Uri.joinPath(folder, 'C1GroupNamespaceImportConsumer.php');
  await vscode.workspace.fs.writeFile(groupNamespaceUri, Buffer.from(groupNamespaceSource));
  const groupNamespaceDocument = await vscode.workspace.openTextDocument(groupNamespaceUri);
  const groupNamespaceEditor = await vscode.window.showTextDocument(groupNamespaceDocument);
  const groupNamespaceOffset = groupNamespaceSource.indexOf('Exte}') + 'Exte'.length;
  const groupNamespaceCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', groupNamespaceUri,
      groupNamespaceDocument.positionAt(groupNamespaceOffset)),
    (result) => result?.items.some((item) => item.label === 'External\\'
      && item.detail === 'App\\C1\\External\\' && !item.additionalTextEdits?.length) === true,
    'SoPHP did not suggest a namespace inside a class group use.',
  );
  const groupNamespaceItem = groupNamespaceCompletion.items.find((item) => item.label === 'External\\')!;
  const groupNamespaceRange = groupNamespaceItem.range instanceof vscode.Range
    ? groupNamespaceItem.range : groupNamespaceItem.range?.replacing;
  assert.ok(groupNamespaceRange && groupNamespaceDocument.getText(groupNamespaceRange) === '{Exte}'
    && groupNamespaceItem.insertText === '{External\\}',
  'The group namespace suggestion would alter an existing group member or brace.');
  groupNamespaceEditor.selection = new vscode.Selection(groupNamespaceDocument.positionAt(groupNamespaceOffset),
    groupNamespaceDocument.positionAt(groupNamespaceOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(groupNamespaceDocument.getText(), groupNamespaceSource.replace('{Exte}', '{External\\}'),
    'Accepting the group namespace suggestion changed the braces or other source text.');
  const groupNamespaceText = groupNamespaceDocument.getText();
  await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', groupNamespaceUri,
      groupNamespaceDocument.positionAt(groupNamespaceText.indexOf('External\\}') + 'External\\'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe') === true,
    'SoPHP did not continue with class completion after accepting the group namespace.',
  );
  const alternateFolder = vscode.Uri.joinPath(folder, 'Alternative');
  await vscode.workspace.fs.createDirectory(alternateFolder);
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(alternateFolder, 'C1ExternalTypeProbe.php'),
    Buffer.from('<?php namespace App\\C1\\Alternative; class C1ExternalTypeProbe {}'));
  const transitionSource = manualImportSource.replace('ManualImportConsumer', 'ManualImportTransition');
  const transitionUri = vscode.Uri.joinPath(folder, 'C1ManualImportTransition.php');
  await vscode.workspace.fs.writeFile(transitionUri, Buffer.from(transitionSource));
  let transitionDocument = await vscode.workspace.openTextDocument(transitionUri);
  await vscode.window.showTextDocument(transitionDocument);
  const transitionCandidates = async (expectedNamespace: 'External' | 'Alternative'): Promise<vscode.CompletionList> => {
    const text = transitionDocument.getText();
    const prefix = `${expectedNamespace}\\C1ExternalTypePro`;
    return waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', transitionUri,
        transitionDocument.positionAt(text.indexOf(prefix) + prefix.length)),
      (result) => result?.items.filter((item) => item.label === 'C1ExternalTypeProbe').length === 1
        && result.items.some((item) => item.label === 'C1ExternalTypeProbe'
          && item.detail === `App\\C1\\${expectedNamespace}\\C1ExternalTypeProbe`),
      `SoPHP kept a stale manual import completion after switching to ${expectedNamespace}.`,
    );
  };
  await transitionCandidates('External');
  const pathEdit = new vscode.WorkspaceEdit();
  const pathStart = transitionSource.indexOf('External\\C1ExternalTypePro');
  pathEdit.replace(transitionUri, new vscode.Range(transitionDocument.positionAt(pathStart),
    transitionDocument.positionAt(pathStart + 'External'.length)), 'Alternative');
  assert.ok(await vscode.workspace.applyEdit(pathEdit), 'Could not switch the manual import without saving.');
  assert.ok(transitionDocument.isDirty);
  await transitionCandidates('Alternative');
  await vscode.commands.executeCommand('workbench.action.files.revert');
  assert.strictEqual(transitionDocument.getText(), transitionSource, 'Revert did not restore the on-disk manual import.');
  await transitionCandidates('External');
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  transitionDocument = await vscode.workspace.openTextDocument(transitionUri);
  assert.strictEqual(transitionDocument.getText(), transitionSource);
  await vscode.window.showTextDocument(transitionDocument);
  await transitionCandidates('External');
  if (/^8\./.test(targetPhpVersion ?? runtimeVersion ?? '')) {
    const compositeSource = '<?php namespace App\\C1; '
      + 'function acceptComposite(int|C1ExternalTypePro $value): void {} '
      + 'function returnComposite(): int|C1ExternalTypePro {} '
      + 'function acceptMapped(#[MapRequestPayload(validationGroups: ["create", "write"])] C1ExternalTypePro $value): void {} '
      + 'class CompositeHolder { public Countable&C1ExternalTypePro $value; }';
    const compositeUri = vscode.Uri.joinPath(folder, 'C1CompositeTypeConsumer.php');
    await vscode.workspace.fs.writeFile(compositeUri, Buffer.from(compositeSource));
    const compositeDocument = await vscode.workspace.openTextDocument(compositeUri);
    await vscode.window.showTextDocument(compositeDocument);
    for (const marker of ['int|C1ExternalTypePro $value', 'int|C1ExternalTypePro {}',
      '] C1ExternalTypePro $value',
      'Countable&C1ExternalTypePro $value']) {
      const position = compositeDocument.positionAt(compositeSource.indexOf(marker) + marker.indexOf('C1ExternalTypePro')
        + 'C1ExternalTypePro'.length);
      const result = await waitForResult(
        () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', compositeUri, position),
        (list) => list?.items.some((item) => item.label === 'C1ExternalTypeProbe'
          && item.additionalTextEdits?.some((entry) => entry.newText.includes('use App\\C1\\External\\C1ExternalTypeProbe;'))) === true,
        `SoPHP did not complete and import the class in ${marker}.`,
      );
      assert.strictEqual(result.items.filter((item) => item.label === 'C1ExternalTypeProbe'
        && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe').length, 1);
    }
  }
  if (process.env.PHP_COMPANION_TEST_C1_SOURCE_CLASSMAP === '1') {
    const classmapProject = vscode.Uri.joinPath(workspace.uri, 'c1-classmap-project');
    const classmapDirectory = vscode.Uri.joinPath(classmapProject, 'legacy');
    await vscode.workspace.fs.createDirectory(classmapDirectory);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(classmapProject, 'composer.json'), Buffer.from(JSON.stringify({
      autoload: { classmap: ['legacy/'] },
    })));
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(classmapDirectory, 'Bundle.php'), Buffer.from(
      '<?php namespace Legacy\\Host; class C1ClassmapTypeProbe {}'));
    const classmapSource = '<?php namespace Consumer; function useClassmap(): void { new C1ClassmapTypePro; }';
    const classmapConsumerUri = vscode.Uri.joinPath(classmapProject, 'Consumer.php');
    await vscode.workspace.fs.writeFile(classmapConsumerUri, Buffer.from(classmapSource));
    const classmapDocument = await vscode.workspace.openTextDocument(classmapConsumerUri);
    await vscode.window.showTextDocument(classmapDocument);
    const classmapCompletion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', classmapConsumerUri,
        classmapDocument.positionAt(classmapSource.indexOf('C1ClassmapTypePro') + 'C1ClassmapTypePro'.length)),
      (result) => result?.items.some((item) => item.label === 'C1ClassmapTypeProbe'
        && item.additionalTextEdits?.some((entry) => entry.newText.includes('use Legacy\\Host\\C1ClassmapTypeProbe;'))) === true,
      'SoPHP did not complete a class from an unopened Composer classmap file in VS Code.',
    );
    assert.strictEqual(classmapCompletion.items.filter((item) => item.label === 'C1ClassmapTypeProbe').length, 1);
    const classmapImportSource = '<?php namespace Consumer; use Leg; class C1ClassmapImportConsumer {}';
    const classmapImportUri = vscode.Uri.joinPath(classmapProject, 'ImportConsumer.php');
    await vscode.workspace.fs.writeFile(classmapImportUri, Buffer.from(classmapImportSource));
    const classmapImportDocument = await vscode.workspace.openTextDocument(classmapImportUri);
    const classmapImportEditor = await vscode.window.showTextDocument(classmapImportDocument);
    const classmapImportOffset = classmapImportSource.indexOf('use Leg') + 'use Leg'.length;
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', classmapImportUri,
        classmapImportDocument.positionAt(classmapImportOffset)),
      (result) => result?.items.some((item) => item.label === 'Legacy\\' && item.kind === vscode.CompletionItemKind.Module) === true,
      'SoPHP did not suggest a classmap namespace from the declaration in VS Code.',
    );
    classmapImportEditor.selection = new vscode.Selection(classmapImportDocument.positionAt(classmapImportOffset),
      classmapImportDocument.positionAt(classmapImportOffset));
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    assert.strictEqual(classmapImportDocument.getText(), classmapImportSource.replace('use Leg;', 'use Legacy\\;'),
      'Accepting the classmap namespace suggestion did not finish the use prefix.');
    const classmapImportText = classmapImportDocument.getText();
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', classmapImportUri,
        classmapImportDocument.positionAt(classmapImportText.indexOf('use Legacy\\') + 'use Legacy\\'.length)),
      (result) => result?.items.some((item) => item.label === 'Host\\' && item.kind === vscode.CompletionItemKind.Module) === true,
      'SoPHP did not suggest the nested classmap namespace in VS Code.',
    );

    const psr0Project = vscode.Uri.joinPath(workspace.uri, 'c1-psr0-project');
    const psr0Directory = vscode.Uri.joinPath(psr0Project, 'legacy', 'Legacy');
    await vscode.workspace.fs.createDirectory(psr0Directory);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(psr0Project, 'composer.json'), Buffer.from(JSON.stringify({
      autoload: { 'psr-0': { 'Legacy_': 'legacy/' } },
    })));
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(psr0Directory, 'C1Psr0TypeProbe.php'), Buffer.from(
      '<?php class Legacy_C1Psr0TypeProbe {}'));
    const wrongPsr0Uri = vscode.Uri.joinPath(psr0Project, 'legacy', 'Wrong.php');
    await vscode.workspace.fs.writeFile(wrongPsr0Uri, Buffer.from(
      '<?php class Legacy_C1Psr0WrongProbe {}'));
    const psr0Source = '<?php namespace Consumer; function usePsr0(): void { new Legacy_C1Psr0TypePro; new Legacy_C1Psr0WrongPro; }';
    const psr0ConsumerUri = vscode.Uri.joinPath(psr0Project, 'Consumer.php');
    await vscode.workspace.fs.writeFile(psr0ConsumerUri, Buffer.from(psr0Source));
    const psr0Document = await vscode.workspace.openTextDocument(psr0ConsumerUri);
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(wrongPsr0Uri));
    await vscode.window.showTextDocument(psr0Document);
    const psr0Completion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', psr0ConsumerUri,
        psr0Document.positionAt(psr0Source.indexOf('Legacy_C1Psr0TypePro') + 'Legacy_C1Psr0TypePro'.length)),
      (result) => result?.items.some((item) => item.label === 'Legacy_C1Psr0TypeProbe'
        && item.additionalTextEdits?.some((entry) => entry.newText.includes('use Legacy_C1Psr0TypeProbe;'))) === true,
      'SoPHP did not complete an unopened Composer PSR-0 class in VS Code.',
    );
    assert.strictEqual(psr0Completion.items.filter((item) => item.label === 'Legacy_C1Psr0TypeProbe').length, 1);
    const wrongPsr0Completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', psr0ConsumerUri,
      psr0Document.positionAt(psr0Source.indexOf('Legacy_C1Psr0WrongPro') + 'Legacy_C1Psr0WrongPro'.length));
    assert.ok(!wrongPsr0Completion?.items.some((item) => item.label === 'Legacy_C1Psr0WrongProbe'),
      `SoPHP suggested a PSR-0 class from a path that Composer cannot load: ${JSON.stringify(
        wrongPsr0Completion?.items.filter((item) => item.label === 'Legacy_C1Psr0WrongProbe'))}`);
  }
  if (process.env.PHP_COMPANION_TEST_C1_PSR0_DEPENDENCY === '1') {
    const psr0Project = vscode.Uri.joinPath(workspace.uri, 'c1-psr0-dependency');
    const consumerUri = vscode.Uri.joinPath(psr0Project, 'src', 'Consumer.php');
    const vendorUri = vscode.Uri.joinPath(psr0Project, 'vendor', 'sohophp', 'legacy-psr0-fixture',
      'src', 'Legacy', 'Component', 'Widget.php');
    const qualifiedSource = '<?php namespace Consumer; function navigate(): void { new \\Legacy_Component_Widget; }';
    const qualifiedUri = vscode.Uri.joinPath(psr0Project, 'src', 'Qualified.php');
    await vscode.workspace.fs.writeFile(qualifiedUri, Buffer.from(qualifiedSource));
    const qualified = await vscode.workspace.openTextDocument(qualifiedUri);
    await vscode.window.showTextDocument(qualified);
    const definition = await waitForResult(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', qualifiedUri,
        qualified.positionAt(qualifiedSource.indexOf('Legacy_Component_Widget') + 8)),
      (result) => result?.some((item) => item.uri.toString() === vendorUri.toString()) === true,
      'SoPHP did not navigate cold to the installed Composer PSR-0 dependency.',
    );
    assert.ok(definition.every((item) => item.uri.toString() === vendorUri.toString()));
    const consumer = await vscode.workspace.openTextDocument(consumerUri);
    await vscode.window.showTextDocument(consumer);
    const source = consumer.getText();
    const completion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', consumerUri,
        consumer.positionAt(source.indexOf('Legacy_Component_Wid') + 'Legacy_Component_Wid'.length)),
      (result) => result?.items.some((item) => item.label === 'Legacy_Component_Widget'
        && item.additionalTextEdits?.some((entry) => entry.newText.includes('use Legacy_Component_Widget;'))) === true,
      'SoPHP did not complete the installed Composer PSR-0 dependency with its import.',
    );
    assert.strictEqual(completion.items.filter((item) => item.label === 'Legacy_Component_Widget').length, 1);
  }
  const edit = new vscode.WorkspaceEdit();
  const receiverOffset = consumerSource.indexOf('C1Contract $value');
  edit.replace(consumerUri, new vscode.Range(document.positionAt(receiverOffset),
    document.positionAt(receiverOffset + 'C1Contract'.length)), 'C1Other');
  assert.ok(await vscode.workspace.applyEdit(edit), 'Could not apply the unsaved receiver edit.');
  assert.ok(document.isDirty, 'The receiver edit unexpectedly saved the document.');
  const changedDefinition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri,
      document.positionAt(document.getText().indexOf('$value->renderC1(2)') + '$value->'.length + 1)),
    (result) => result?.some((item) => item.uri.toString() === otherUri.toString()) === true,
    'SoPHP kept the old member declaration after an unsaved edit.',
  );
  assert.deepStrictEqual(changedDefinition.map((item) => item.uri.toString()), [otherUri.toString()]);
  const changedSource = document.getText();
  const changedCallOffset = changedSource.indexOf('$value->renderC1(2)') + '$value->'.length;
  const changedCallPosition = document.positionAt(changedCallOffset + 1);
  const changedCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', consumerUri,
      document.positionAt(changedSource.indexOf('$value->renderC;') + '$value->renderC'.length), '>'),
    (result) => result?.items.some((item) => item.label === 'renderC1' && item.detail?.includes('C1Other::renderC1(): void')) === true,
    'SoPHP completion kept the old receiver after an unsaved edit.',
  );
  assert.strictEqual(changedCompletion.items.filter((item) => item.label === 'renderC1').length, 1);
  const changedHover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', consumerUri, changedCallPosition),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('renderC1(): void'))) === true,
    'SoPHP Hover kept the old method signature after an unsaved edit.',
  );
  assert.ok(changedHover.length > 0);
  const changedSignature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', consumerUri,
      document.positionAt(changedSource.indexOf('$value->renderC1(2)') + '$value->renderC1('.length)),
    (result) => result?.signatures.some((item) => item.label.includes('renderC1(): void')) === true,
    'SoPHP Signature Help kept the old method parameters after an unsaved edit.',
  );
  assert.deepStrictEqual(changedSignature.signatures.map((item) => item.label), ['renderC1(): void']);
  const changedReferences = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', consumerUri, changedCallPosition),
    (result) => result?.some((item) => item.uri.toString() === consumerUri.toString()
      && item.range.start.isEqual(document.positionAt(changedCallOffset))) === true,
    'SoPHP References did not follow the new receiver after an unsaved edit.',
  );
  assert.ok(changedReferences.every((item) => ![contractUri.toString(), printerUri.toString()].includes(item.uri.toString())));
  const changedImplementations = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', consumerUri,
    changedCallPosition);
  assert.deepStrictEqual(changedImplementations, [], 'SoPHP kept the old interface implementation after an unsaved edit.');
  const vendorFolder = vscode.Uri.joinPath(workspace.uri, 'vendor', 'acme', 'c1-library', 'src');
  const vendorComposerFolder = vscode.Uri.joinPath(workspace.uri, 'vendor', 'composer');
  await vscode.workspace.fs.createDirectory(vendorFolder);
  await vscode.workspace.fs.createDirectory(vendorComposerFolder);
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspace.uri, 'composer.lock'), Buffer.from(JSON.stringify({
    packages: [{ name: 'acme/c1-library', autoload: { 'psr-4': { 'Acme\\C1\\': 'src/' } } }],
  })));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vendorComposerFolder, 'installed.json'), Buffer.from(JSON.stringify({
    packages: [{ name: 'acme/c1-library', install_path: '../acme/c1-library' }],
  })));
  const vendorSource = '<?php namespace Acme\\C1; interface VendorContract { public function renderVendor(int $count): string; }';
  const vendorUri = vscode.Uri.joinPath(vendorFolder, 'VendorContract.php');
  const vendorPrinterSource = '<?php namespace App\\C1; use Acme\\C1\\VendorContract; final class VendorPrinter implements VendorContract { public function renderVendor(int $count): string { return (string) $count; } }';
  const vendorPrinterUri = vscode.Uri.joinPath(folder, 'VendorPrinter.php');
  const namesakeSource = '<?php namespace App\\C1; final class VendorNamesake { public function renderVendor(): void {} }';
  const namesakeUri = vscode.Uri.joinPath(folder, 'VendorNamesake.php');
  const vendorConsumerSource = '<?php namespace App\\C1; use Acme\\C1\\VendorContract; function useVendor(VendorContract $value, VendorNamesake $other): void { $value->renderVendor(2); $other->renderVendor(); $value->renderVen; }';
  const vendorConsumerUri = vscode.Uri.joinPath(folder, 'VendorConsumer.php');
  for (const [uri, source] of [[vendorUri, vendorSource], [vendorPrinterUri, vendorPrinterSource],
    [namesakeUri, namesakeSource], [vendorConsumerUri, vendorConsumerSource]] as const) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  }
  const vendorDocument = await vscode.workspace.openTextDocument(vendorConsumerUri);
  await vscode.window.showTextDocument(vendorDocument);
  const vendorCallOffset = vendorConsumerSource.indexOf('$value->renderVendor(2)') + '$value->'.length;
  const vendorCallPosition = vendorDocument.positionAt(vendorCallOffset + 1);
  const vendorCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', vendorConsumerUri,
      vendorDocument.positionAt(vendorConsumerSource.indexOf('$value->renderVen;') + '$value->renderVen'.length), '>'),
    (result) => result?.items.some((item) => item.label === 'renderVendor' && item.detail?.includes('VendorContract::renderVendor(int $count): string')) === true,
    'SoPHP did not complete a method declared by a Composer vendor package.',
  );
  assert.strictEqual(vendorCompletion.items.filter((item) => item.label === 'renderVendor').length, 1);
  const vendorHover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', vendorConsumerUri, vendorCallPosition),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('renderVendor(int $count): string'))) === true,
    'SoPHP did not show the vendor method Hover.',
  );
  assert.ok(vendorHover.length > 0);
  const vendorSignature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', vendorConsumerUri,
      vendorDocument.positionAt(vendorConsumerSource.indexOf('$value->renderVendor(2)') + '$value->renderVendor('.length)),
    (result) => result?.signatures.some((item) => item.label.includes('renderVendor(int $count): string')) === true,
    'SoPHP did not show the vendor method signature.',
  );
  assert.ok(vendorSignature.signatures.length > 0);
  const vendorDefinition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', vendorConsumerUri, vendorCallPosition),
    (result) => result?.some((item) => item.uri.toString() === vendorUri.toString()) === true,
    'SoPHP did not navigate to the Composer vendor declaration.',
  );
  assert.deepStrictEqual(vendorDefinition.map((item) => item.uri.toString()), [vendorUri.toString()]);
  const vendorImplementation = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', vendorConsumerUri, vendorCallPosition),
    (result) => result?.some((item) => item.uri.toString() === vendorPrinterUri.toString()) === true,
    'SoPHP did not navigate from the vendor interface to its project implementation.',
  );
  assert.deepStrictEqual(vendorImplementation.map((item) => item.uri.toString()), [vendorPrinterUri.toString()]);
  const vendorReferences = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', vendorConsumerUri, vendorCallPosition),
    (result) => result?.some((item) => item.uri.toString() === vendorConsumerUri.toString()
      && item.range.start.isEqual(vendorDocument.positionAt(vendorCallOffset))) === true,
    'SoPHP did not return the vendor method call reference.',
  );
  assert.ok(vendorReferences.every((item) => item.uri.toString() !== namesakeUri.toString()
    && !(item.uri.toString() === vendorConsumerUri.toString()
      && item.range.start.isEqual(vendorDocument.positionAt(vendorConsumerSource.indexOf('$other->renderVendor()') + '$other->'.length)))));
  const secondWorkspace = vscode.workspace.workspaceFolders?.[1];
  assert.ok(secondWorkspace, 'C1 Extension Host test has no second Composer workspace root.');
  const secondFolder = vscode.Uri.joinPath(secondWorkspace.uri, 'src', 'C1');
  await vscode.workspace.fs.createDirectory(secondFolder);
  const secondContractSource = '<?php namespace App\\C1; interface C1Contract { public function renderC1(string $label): void; }';
  const secondPrinterSource = '<?php namespace App\\C1; final class C1Printer implements C1Contract { public function renderC1(string $label): void {} }';
  const secondConsumerSource = '<?php namespace App\\C1; function run(C1Contract $value): void { $value->renderC1("x"); $value->renderC; }';
  const secondContractUri = vscode.Uri.joinPath(secondFolder, 'C1Contract.php');
  const secondPrinterUri = vscode.Uri.joinPath(secondFolder, 'C1Printer.php');
  const secondConsumerUri = vscode.Uri.joinPath(secondFolder, 'C1Consumer.php');
  for (const [uri, source] of [[secondContractUri, secondContractSource], [secondPrinterUri, secondPrinterSource],
    [secondConsumerUri, secondConsumerSource]] as const) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  }
  const secondDocument = await vscode.workspace.openTextDocument(secondConsumerUri);
  await vscode.window.showTextDocument(secondDocument);
  const secondCallOffset = secondConsumerSource.indexOf('$value->renderC1("x")') + '$value->'.length;
  const secondCallPosition = secondDocument.positionAt(secondCallOffset + 1);
  const secondCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', secondConsumerUri,
      secondDocument.positionAt(secondConsumerSource.indexOf('$value->renderC;') + '$value->renderC'.length), '>'),
    (result) => result?.items.some((item) => item.label === 'renderC1'
      && item.detail?.includes('C1Contract::renderC1(string $label): void')) === true,
    'SoPHP mixed the first Composer root into second-root completion.',
  );
  assert.strictEqual(secondCompletion.items.filter((item) => item.label === 'renderC1').length, 1);
  const secondHover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', secondConsumerUri, secondCallPosition),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('renderC1(string $label): void'))) === true,
    'SoPHP mixed the first Composer root into second-root Hover.',
  );
  assert.ok(secondHover.length > 0);
  const secondSignature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', secondConsumerUri,
      secondDocument.positionAt(secondConsumerSource.indexOf('$value->renderC1("x")') + '$value->renderC1('.length)),
    (result) => result?.signatures.some((item) => item.label === 'renderC1(string $label): void') === true,
    'SoPHP mixed the first Composer root into second-root Signature Help.',
  );
  assert.deepStrictEqual(secondSignature.signatures.map((item) => item.label), ['renderC1(string $label): void']);
  const secondDefinition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', secondConsumerUri, secondCallPosition),
    (result) => result?.some((item) => item.uri.toString() === secondContractUri.toString()) === true,
    'SoPHP navigated to the wrong Composer root.',
  );
  assert.deepStrictEqual(secondDefinition.map((item) => item.uri.toString()), [secondContractUri.toString()]);
  const secondImplementation = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', secondConsumerUri, secondCallPosition),
    (result) => result?.some((item) => item.uri.toString() === secondPrinterUri.toString()) === true,
    'SoPHP found an implementation from the wrong Composer root.',
  );
  assert.deepStrictEqual(secondImplementation.map((item) => item.uri.toString()), [secondPrinterUri.toString()]);
  const secondReferences = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', secondConsumerUri, secondCallPosition),
    (result) => result?.some((item) => item.uri.toString() === secondConsumerUri.toString()
      && item.range.start.isEqual(secondDocument.positionAt(secondCallOffset))) === true,
    'SoPHP did not find the second-root call reference.',
  );
  assert.ok(secondReferences.every((item) => item.uri.toString().startsWith(`${secondWorkspace.uri.toString()}/`)),
    `SoPHP mixed references from the first Composer root: ${JSON.stringify(secondReferences.map((item) => ({
      uri: item.uri.toString(), line: item.range.start.line, character: item.range.start.character,
    })))}`);
  {
    const versionUri = vscode.Uri.joinPath(folder, 'Versioned.php');
    const versionSource = `<?php namespace App\\C1;
enum C1State { case Ready; }
function choose(int $value): int { return match ($value) { 1 => 1, default => 0 }; }
function consume(): void { (void) choose(1); }`;
    await vscode.workspace.fs.writeFile(versionUri, Buffer.from(versionSource));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(versionUri));
    const firstTargetPhpVersion = targetPhpVersion ?? await waitForResult(
      () => vscode.commands.executeCommand<string>('phpCompanion._testEffectivePhpVersion', versionUri),
      (value) => typeof value === 'string' && /^\d+\.\d+$/u.test(value),
      'SoPHP did not resolve an effective PHP version for the first Composer root.');
    if (!targetPhpVersion) console.log(`C1 auto PHP target for the first Composer root: ${firstTargetPhpVersion}`);
    const expected = firstTargetPhpVersion.startsWith('7.') ? ['match expression', 'enum', '(void) cast']
      : firstTargetPhpVersion === '8.0' ? ['enum', '(void) cast']
        : firstTargetPhpVersion === '8.5' ? [] : ['(void) cast'];
    const diagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(versionUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && expected.every((feature) => result.some((item) => item.code === 'php.version.unsupported' && item.message.includes(feature))),
      `SoPHP did not publish the PHP ${firstTargetPhpVersion} diagnostic set in VS Code.`,
    );
    const versionMessages = diagnostics.filter((item) => item.code === 'php.version.unsupported').map((item) => item.message);
    for (const feature of expected) assert.ok(versionMessages.some((message) => message.includes(feature)),
      `PHP ${firstTargetPhpVersion} did not report unsupported ${feature}.`);
    assert.strictEqual(versionMessages.length, expected.length, `PHP ${firstTargetPhpVersion} returned unexpected version diagnostics.`);
    assert.ok(!diagnostics.some((item) => item.code === 'php.syntax'), `PHP ${firstTargetPhpVersion} reported a parser error for the version fixture.`);
    const cloneUri = vscode.Uri.joinPath(folder, 'VersionCloneWith.php');
    const cloneSource = `<?php namespace App\\C1;
class C1CloneWith { public $name = 'a'; }
$copy = clone(new C1CloneWith(), ['name' => strtoupper('b')],);`;
    await vscode.workspace.fs.writeFile(cloneUri, Buffer.from(cloneSource));
    const cloneDocument = await vscode.workspace.openTextDocument(cloneUri);
    await vscode.window.showTextDocument(cloneDocument);
    const cloneExpected = firstTargetPhpVersion !== '8.5';
    const cloneDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(cloneUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && (!cloneExpected || result.some((item) => item.code === 'php.version.unsupported'
          && item.message.includes('clone with properties'))),
      `SoPHP did not publish the PHP ${firstTargetPhpVersion} clone-with diagnostic set in VS Code.`,
    );
    assert.ok(!cloneDiagnostics.some((item) => item.code === 'php.syntax'),
      `PHP ${firstTargetPhpVersion} treated a valid clone-with call as invalid syntax.`);
    if (process.env.PHP_COMPANION_TEST_C1_VALIDATE_PHP) {
      assert.ok(!cloneDiagnostics.some((item) => item.severity === vscode.DiagnosticSeverity.Error
        && item.message.includes('syntax error')),
      `The configured PHP CLI still reported a syntax error for valid PHP ${firstTargetPhpVersion} clone-with code: `
        + `${JSON.stringify({ configured: vscode.workspace.getConfiguration('php.validate', cloneUri).get('executablePath'),
          diagnostics: cloneDiagnostics.map((item) => ({ source: item.source, code: item.code, message: item.message })) })}`);
    }
    assert.strictEqual(cloneDiagnostics.filter((item) => item.code === 'php.version.unsupported'
      && item.message.includes('clone with properties')).length, cloneExpected ? 1 : 0);
    const missingValue = new vscode.WorkspaceEdit();
    const valueStart = cloneSource.indexOf("strtoupper('b')");
    missingValue.delete(cloneUri, new vscode.Range(cloneDocument.positionAt(valueStart),
      cloneDocument.positionAt(valueStart + "strtoupper('b')".length)));
    assert.ok(await vscode.workspace.applyEdit(missingValue), 'Could not make the clone-with argument incomplete.');
    await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(cloneUri)),
      (result) => result.some((item) => item.code === 'php.syntax'),
      'SoPHP did not diagnose the incomplete clone-with argument.');
    await vscode.commands.executeCommand('undo');
    await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(cloneUri)),
      (result) => !result.some((item) => item.code === 'php.syntax')
        && result.some((item) => item.code === 'php.type.filename'),
      'SoPHP did not withdraw the clone-with syntax error after Undo.');
    console.log(`C1 PHP ${firstTargetPhpVersion} clone-with Problems and Undo matched the target version`);
    const syntaxEdgeUri = vscode.Uri.joinPath(folder, 'VersionSyntaxEdges.php');
    const syntaxEdgeSource = `<?php namespace App\\C1;
class C1VersionSyntaxMarker {}
$label = "a|>b" . "c"; $total = 1 + /* |> */ 2;
$text = "start"; $text .= "??="; $count = 1; $count += /* ??= */ 2;
function accept(int $value): void {}
accept(1, /* note */);`;
    await vscode.workspace.fs.writeFile(syntaxEdgeUri, Buffer.from(syntaxEdgeSource));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(syntaxEdgeUri));
    const edgeDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(syntaxEdgeUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && (firstTargetPhpVersion !== '7.2' || result.some((item) => item.code === 'php.version.unsupported'
          && item.message.includes('trailing comma in a call'))),
      `SoPHP did not publish the PHP ${firstTargetPhpVersion} syntax-edge diagnostics in VS Code.`,
    );
    const edgeVersions = edgeDiagnostics.filter((item) => item.code === 'php.version.unsupported');
    assert.deepStrictEqual(edgeVersions.map((item) => item.message.includes('trailing comma in a call')),
      firstTargetPhpVersion === '7.2' ? [true] : [],
      `PHP ${firstTargetPhpVersion} misdiagnosed operator text or a commented call comma.`);
    if (edgeVersions.length) assert.strictEqual((await vscode.workspace.openTextDocument(syntaxEdgeUri)).getText(edgeVersions[0]!.range), ',');
    const commentUri = vscode.Uri.joinPath(folder, 'VersionPromotionComment.php');
    const commentSource = '<?php namespace App\\C1; class C1PromotionComment { public function __construct(public /* final */ string $name) {} }';
    await vscode.workspace.fs.writeFile(commentUri, Buffer.from(commentSource));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(commentUri));
    const commentDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(commentUri)),
      (result) => result.some((item) => item.code === 'php.type.filename'),
      `SoPHP did not process the PHP ${firstTargetPhpVersion} promotion-comment fixture in VS Code.`,
    );
    assert.ok(!commentDiagnostics.some((item) => item.code === 'php.version.unsupported'
      && item.message.includes('final promoted property')), 'SoPHP treated a promotion comment as final.');
    const finalUri = vscode.Uri.joinPath(folder, 'VersionPromotionFinal.php');
    const finalSource = '<?php namespace App\\C1; class C1PromotionFinal { public function __construct(public final string $name) {} }';
    await vscode.workspace.fs.writeFile(finalUri, Buffer.from(finalSource));
    const finalDocument = await vscode.workspace.openTextDocument(finalUri);
    await vscode.window.showTextDocument(finalDocument);
    const promotionDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(finalUri)),
      (result) => firstTargetPhpVersion === '8.5'
        ? result.some((item) => item.code === 'php.type.filename')
        : result.some((item) => item.code === 'php.version.unsupported'
          && item.message.includes('final promoted property')),
      `SoPHP did not publish the PHP ${firstTargetPhpVersion} promotion diagnostics in VS Code.`,
    );
    const finalVersions = promotionDiagnostics.filter((item) => item.code === 'php.version.unsupported'
      && item.message.includes('final promoted property'));
    assert.strictEqual(finalVersions.length, firstTargetPhpVersion === '8.5' ? 0 : 1,
      `PHP ${firstTargetPhpVersion} missed or misreported a real final modifier.`);
    if (finalVersions.length) assert.strictEqual(finalDocument.getText(finalVersions[0]!.range), 'final');
    const secondTargetPhpVersion = targetPhpVersion ? targetPhpVersion === '7.2' ? '8.5' : '7.2' : '8.5';
    assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', secondWorkspace.uri).get('phpVersion'), targetPhpVersion ? secondTargetPhpVersion : 'auto');
    const secondVersionUri = vscode.Uri.joinPath(secondFolder, 'Versioned.php');
    await vscode.workspace.fs.writeFile(secondVersionUri, Buffer.from(versionSource));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(secondVersionUri));
    const secondExpected = secondTargetPhpVersion === '7.2' ? ['match expression', 'enum', '(void) cast'] : [];
    const secondDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(secondVersionUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && secondExpected.every((feature) => result.some((item) => item.code === 'php.version.unsupported' && item.message.includes(feature))),
      `SoPHP did not publish the PHP ${secondTargetPhpVersion} diagnostic set in the second Composer root.`,
    );
    assert.strictEqual(secondDiagnostics.filter((item) => item.code === 'php.version.unsupported').length, secondExpected.length,
      'SoPHP mixed PHP version diagnostics between Composer roots.');
    assert.ok(!secondDiagnostics.some((item) => item.code === 'php.syntax'),
      `PHP ${secondTargetPhpVersion} reported a parser error for the second-root version fixture.`);
    if (!targetPhpVersion) {
      const autoBuiltinSource = '<?php namespace App\\C1; class AutoBuiltinProbe {} function probe(): void { str_con }';
      for (const [targetFolder, expectedAvailable] of [[folder, firstTargetPhpVersion.startsWith('8.')],
        [secondFolder, secondTargetPhpVersion.startsWith('8.')]] as const) {
        const autoBuiltinUri = vscode.Uri.joinPath(targetFolder, 'AutoBuiltin.php');
        await vscode.workspace.fs.writeFile(autoBuiltinUri, Buffer.from(autoBuiltinSource));
        const autoBuiltinDocument = await vscode.workspace.openTextDocument(autoBuiltinUri);
        await vscode.window.showTextDocument(autoBuiltinDocument);
        await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(autoBuiltinUri)),
          (result) => result.some((item) => item.code === 'php.type.filename'),
          'SoPHP did not process the auto-version builtin fixture.');
        const autoBuiltinCompletion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
          autoBuiltinUri, autoBuiltinDocument.positionAt(autoBuiltinSource.indexOf('str_con') + 'str_con'.length));
        assert.strictEqual(autoBuiltinCompletion.items.some((item) => item.label === 'str_contains'), expectedAvailable,
          'SoPHP used the wrong Composer auto version for built-in completion.');
      }
      const sortSource = '<?php namespace App\\C1; function sorted(array $items): void { sort($items); }';
      const sortDefinitions: vscode.Location[] = [];
      for (const targetFolder of [folder, secondFolder]) {
        const sortUri = vscode.Uri.joinPath(targetFolder, 'SortBuiltin.php');
        await vscode.workspace.fs.writeFile(sortUri, Buffer.from(sortSource));
        const sortDocument = await vscode.workspace.openTextDocument(sortUri);
        await vscode.window.showTextDocument(sortDocument);
        const result = await waitForResult(
          () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', sortUri,
            sortDocument.positionAt(sortSource.indexOf('sort($items)') + 2)),
          (locations) => locations?.some((location) => location.uri.scheme === 'php-companion-builtin') === true,
          'SoPHP did not navigate to the PHP sort built-in declaration.');
        sortDefinitions.push(result.find((location) => location.uri.scheme === 'php-companion-builtin')!);
      }
      assert.strictEqual(sortDefinitions[0]!.uri.toString() === sortDefinitions[1]!.uri.toString(),
        firstTargetPhpVersion === secondTargetPhpVersion,
        'Built-in virtual document identity did not follow the two effective PHP versions.');
      for (const [index, version] of [firstTargetPhpVersion, secondTargetPhpVersion].entries()) {
        const source = (await vscode.workspace.openTextDocument(sortDefinitions[index]!.uri)).getText();
        const [major, minor] = version.split('.').map(Number);
        const returnType = major! > 8 || (major === 8 && minor! >= 2) ? 'true' : 'bool';
        assert.ok(source.includes(`function sort(array &$array, int $flags = 0): ${returnType}`),
          `PHP ${version} navigation displayed the wrong built-in signature: ${sortDefinitions[index]!.uri.toString()} ${source.match(/function sort\([^\n]*/u)?.[0] ?? source.slice(0, 80)}`);
      }
      const parentServiceSource = '<?php namespace App\\C1; class NestedService { public function parentOnly(): void {} }';
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'NestedService.php'), Buffer.from(parentServiceSource));
      const nestedRoot = vscode.Uri.joinPath(workspace.uri, 'apps', 'api');
      const nestedFolder = vscode.Uri.joinPath(nestedRoot, 'src', 'C1');
      await vscode.workspace.fs.createDirectory(nestedFolder);
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(nestedRoot, 'composer.json'), Buffer.from(JSON.stringify({
        config: { platform: { php: '8.5.0' } }, autoload: { 'psr-4': { 'App\\': 'src/' } },
      })));
      const nestedServiceSource = '<?php namespace App\\C1; class NestedService { public function nestedOnly(): void {} }';
      const nestedServiceUri = vscode.Uri.joinPath(nestedFolder, 'NestedService.php');
      const nestedConsumerSource = '<?php namespace App\\C1; function nestedRun(NestedService $service): void { $service->nestedOnly(); $service->nested; }';
      const nestedConsumerUri = vscode.Uri.joinPath(nestedFolder, 'Consumer.php');
      await vscode.workspace.fs.writeFile(nestedServiceUri, Buffer.from(nestedServiceSource));
      await vscode.workspace.fs.writeFile(nestedConsumerUri, Buffer.from(nestedConsumerSource));
      const nestedDocument = await vscode.workspace.openTextDocument(nestedConsumerUri);
      await vscode.window.showTextDocument(nestedDocument);
      const nestedCompletion = await waitForResult(
        () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', nestedConsumerUri,
          nestedDocument.positionAt(nestedConsumerSource.indexOf('$service->nested;') + '$service->nested'.length), '>'),
        (result) => result?.items.some((item) => item.label === 'nestedOnly') === true,
        'SoPHP did not discover the nested Composer project in onDemand mode.',
      );
      assert.ok(!nestedCompletion.items.some((item) => item.label === 'parentOnly'));
      const nestedDefinition = await waitForResult(
        () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', nestedConsumerUri,
          nestedDocument.positionAt(nestedConsumerSource.indexOf('$service->nestedOnly()') + '$service->'.length + 1)),
        (result) => result?.some((item) => item.uri.toString() === nestedServiceUri.toString()) === true,
        'SoPHP navigated from the nested project into its parent project.',
      );
      assert.deepStrictEqual(nestedDefinition.map((item) => item.uri.toString()), [nestedServiceUri.toString()]);
      const nestedCallOffset = nestedConsumerSource.indexOf('$service->nestedOnly()') + '$service->'.length;
      const nestedReferences = await waitForResult(
        () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', nestedConsumerUri,
          nestedDocument.positionAt(nestedCallOffset + 1)),
        (result) => result?.some((item) => item.uri.toString() === nestedConsumerUri.toString()
          && item.range.start.isEqual(nestedDocument.positionAt(nestedCallOffset))) === true,
        'SoPHP did not find the nested project call reference.',
      );
      assert.ok(nestedReferences.every((item) => item.uri.toString().startsWith(`${nestedRoot.toString()}/`)),
        'SoPHP mixed parent references into the nested Composer project.');
      const nestedVersionUri = vscode.Uri.joinPath(nestedFolder, 'Versioned.php');
      await vscode.workspace.fs.writeFile(nestedVersionUri, Buffer.from(versionSource));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(nestedVersionUri));
      const nestedDiagnostics = await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(nestedVersionUri)),
        (result) => result.some((item) => item.code === 'php.type.filename')
          && !result.some((item) => item.code === 'php.version.unsupported'),
        `SoPHP kept the parent PHP ${firstTargetPhpVersion} target in the nested PHP 8.5 project.`);
      assert.ok(!nestedDiagnostics.some((item) => item.code === 'php.syntax'));
      await waitForResult(() => vscode.commands.executeCommand<string>('phpCompanion._testVersionStatus'),
        (value) => value?.includes('SoPHP: 8.5') === true,
        'SoPHP status bar displayed the parent PHP version while editing the nested project.');
      const nestedVersionChoices = await vscode.commands.executeCommand<{
        placeHolder: string; items: Array<{ label: string; description?: string }>
      }>('phpCompanion._testVersionChoices');
      assert.ok(nestedVersionChoices?.placeHolder.includes('workspace'),
        'The PHP version picker did not explain its workspace-wide setting scope.');
      assert.strictEqual(nestedVersionChoices.items.find((item) => item.label === 'PHP 8.5')?.description, '$(check)',
        'The PHP version picker marked the parent version instead of the active nested project version.');
      const parentVersionAfterNestedUri = vscode.Uri.joinPath(folder, 'AfterNestedVersioned.php');
      await vscode.workspace.fs.writeFile(parentVersionAfterNestedUri, Buffer.from(versionSource));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(parentVersionAfterNestedUri));
      const parentDiagnosticsAfterNested = await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(parentVersionAfterNestedUri)),
        (result) => result.some((item) => item.code === 'php.type.filename')
          && result.filter((item) => item.code === 'php.version.unsupported').length === expected.length,
        `SoPHP replaced the parent PHP ${firstTargetPhpVersion} target after opening the nested PHP 8.5 project.`);
      assert.ok(!parentDiagnosticsAfterNested.some((item) => item.code === 'php.syntax'));
      await waitForResult(() => vscode.commands.executeCommand<string>('phpCompanion._testVersionStatus'),
        (value) => value?.includes(`SoPHP: ${firstTargetPhpVersion}`) === true,
        'SoPHP status bar kept the nested PHP version after returning to the parent project.');
      const secondComposerUri = vscode.Uri.joinPath(secondWorkspace.uri, 'composer.json');
      const secondComposer = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(secondComposerUri)).toString('utf8')) as {
        config: { platform: { php: string } };
      };
      secondComposer.config.platform.php = '8.1.0';
      await vscode.workspace.fs.writeFile(secondComposerUri, Buffer.from(JSON.stringify(secondComposer, null, 2)));
      await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(secondVersionUri)),
        (result) => result.filter((item) => item.code === 'php.version.unsupported').length === 1
          && result.some((item) => item.code === 'php.version.unsupported' && item.message.includes('(void) cast')),
        'SoPHP kept the old auto PHP version after a Composer platform change.');
    }
    const changedSecondVersion = secondTargetPhpVersion === '7.2' ? '8.1' : '7.2';
    const changedSecondExpected = changedSecondVersion === '7.2' ? ['match expression', 'enum', '(void) cast'] : ['(void) cast'];
    await vscode.workspace.getConfiguration('phpCompanion', secondWorkspace.uri).update('phpVersion', changedSecondVersion,
      vscode.ConfigurationTarget.WorkspaceFolder);
    const changedSecondDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(secondVersionUri)),
      (result) => {
        const unsupported = result.filter((item) => item.code === 'php.version.unsupported');
        return unsupported.length === changedSecondExpected.length
          && changedSecondExpected.every((feature) => unsupported.some((item) => item.message.includes(feature)));
      },
      'SoPHP kept the old PHP version diagnostics after a second-root setting change.',
    );
    assert.ok(!changedSecondDiagnostics.some((item) => item.code === 'php.syntax'));
    const builtinVersionSource = '<?php namespace App\\C1; class BuiltinVersionProbe {} function versionedBuiltin(): void { str_con }';
    const builtinVersionUri = vscode.Uri.joinPath(secondFolder, 'BuiltinVersion.php');
    await vscode.workspace.fs.writeFile(builtinVersionUri, Buffer.from(builtinVersionSource));
    const builtinVersionDocument = await vscode.workspace.openTextDocument(builtinVersionUri);
    await vscode.window.showTextDocument(builtinVersionDocument);
    await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(builtinVersionUri)),
      (result) => result.some((item) => item.code === 'php.type.filename'),
      'SoPHP did not process the second-root builtin fixture after the version change.');
    const builtinVersionCompletion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        builtinVersionUri, builtinVersionDocument.positionAt(builtinVersionSource.indexOf('str_con') + 'str_con'.length)),
      (result) => result?.items.some((item) => item.label === 'str_contains' && item.kind === vscode.CompletionItemKind.Function)
        === (changedSecondVersion !== '7.2'),
      'SoPHP did not update built-in completion after the second-root PHP setting changed.');
    assert.strictEqual(builtinVersionCompletion.items.some((item) => item.label === 'str_contains' && item.kind === vscode.CompletionItemKind.Function),
      changedSecondVersion !== '7.2',
      'SoPHP kept the old root version in built-in completion after a setting change.');
  }
  if (runtimeVersion) {
    const runtimeWorkspace = vscode.workspace.workspaceFolders?.find((folder) => folder.name === 'runtime');
    assert.ok(runtimeWorkspace, 'C1 runtime probe workspace was not opened.');
    assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', runtimeWorkspace.uri).get('phpVersion'), 'auto');
    if (runtimeDiscover) assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', runtimeWorkspace.uri).get('phpExecutablePath'), null,
      'The PATH discovery fixture unexpectedly configured a PHP executable.');
    const runtimeMinor = runtimeVersion.match(/^(?:7\.[234]|8\.[0-5])/u)?.[0];
    assert.ok(runtimeMinor, `C1 runtime probe received an unsupported version: ${runtimeVersion}`);
    const runtimeSource = '<?php namespace App\\C1; enum State { case Ready; } function choose(int $value): int { return match ($value) { 1 => 1, default => 0 }; } function useIt(): void { (void) choose(1); str_con }';
    const runtimeFolder = vscode.Uri.joinPath(runtimeWorkspace.uri, 'src', 'C1');
    await vscode.workspace.fs.createDirectory(runtimeFolder);
    const runtimeUri = vscode.Uri.joinPath(runtimeFolder, 'RuntimeVersioned.php');
    await vscode.workspace.fs.writeFile(runtimeUri, Buffer.from(runtimeSource));
    const runtimeDocument = await vscode.workspace.openTextDocument(runtimeUri);
    await vscode.window.showTextDocument(runtimeDocument);
    const expectedUnsupported = runtimeMinor.startsWith('7.') ? ['match expression', 'enum', '(void) cast']
      : runtimeMinor === '8.0' ? ['enum', '(void) cast'] : runtimeMinor === '8.5' ? [] : ['(void) cast'];
    const runtimeDiagnostics = await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(runtimeUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && result.filter((item) => item.code === 'php.version.unsupported').length === expectedUnsupported.length
        && expectedUnsupported.every((feature) => result.some((item) => item.code === 'php.version.unsupported'
          && item.message.includes(feature))),
      `SoPHP auto mode did not use the configured PHP ${runtimeMinor} executable for diagnostics.`);
    assert.ok(!runtimeDiagnostics.some((item) => item.code === 'php.syntax'));
    const runtimeCompletion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      runtimeUri, runtimeDocument.positionAt(runtimeSource.indexOf('str_con') + 'str_con'.length));
    assert.strictEqual(runtimeCompletion.items.some((item) => item.label === 'str_contains'), !runtimeMinor.startsWith('7.'),
      'SoPHP auto mode did not use the selected PHP runtime for built-in completion.');
    console.log(`C1 ${runtimeDiscover ? 'PATH discovery' : 'configured'} runtime probe: PHP ${runtimeVersion}, diagnostics and built-in completion passed.`);
  }
  if (process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR === '1') await verifyRealComposerVendor(timingApi.requestLanguageServer);
  const chainRounds = Number(process.env.PHP_COMPANION_TEST_C1_CHAIN_ROUNDS ?? 0);
  assert.ok(Number.isSafeInteger(chainRounds) && chainRounds >= 0 && chainRounds <= 1000,
    'PHP_COMPANION_TEST_C1_CHAIN_ROUNDS must be an integer from 0 to 1000.');
  if (chainRounds) {
    assert.strictEqual(process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR, '1',
      'The real vendor six-query chain requires PHP_COMPANION_TEST_C1_REAL_VENDOR=1.');
    await verifyRealVendorEditingChain(chainRounds, timingApi.requestLanguageServer);
  }
  if (c1DebugPort) {
    await timingApi.requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
    const visibleSuggestion = await measureVisibleSuggestion(Number(c1DebugPort), folder);
    const suggestionServerTimings = await timingApi.requestLanguageServer<Record<string, number[]>>(
      'phpCompanion/testQueryTimings', { reset: true });
    console.log(`C1 visible PHP suggestion after typing: ${JSON.stringify({ ...visibleSuggestion,
      serverCompletionMs: suggestionServerTimings.completion ?? [] })}`);
    const visibleTypeSuggestion = await measureVisibleTypeSuggestion(Number(c1DebugPort), folder);
    console.log(`C1 visible cross-namespace type suggestion after typing: ${JSON.stringify(visibleTypeSuggestion)}`);
    if (process.env.PHP_COMPANION_TEST_C1_PSR0_DEPENDENCY === '1') {
      const psr0Suggestion = await measureVisibleInstalledPsr0Type(Number(c1DebugPort),
        vscode.Uri.joinPath(workspace.uri, 'c1-psr0-dependency'));
      console.log(`C1 visible installed Composer PSR-0 type suggestion: ${JSON.stringify(psr0Suggestion)}`);
    }
    if (process.env.PHP_COMPANION_TEST_C1_QUICK_DELAY_PROBE === '1') {
      const configuration = vscode.workspace.getConfiguration('editor', folder);
      const originalDelay = configuration.get<number>('quickSuggestionsDelay');
      try {
        await configuration.update('quickSuggestionsDelay', 0, vscode.ConfigurationTarget.Workspace);
        const zeroDelay = await measureVisibleSuggestion(Number(c1DebugPort), folder, false, 6);
        await configuration.update('quickSuggestionsDelay', originalDelay, vscode.ConfigurationTarget.Workspace);
        const restored = await measureVisibleSuggestion(Number(c1DebugPort), folder, false, 12);
        console.log(`C1 quick suggestions delay A/B/A: ${JSON.stringify({ originalDelay,
          defaultMs: visibleSuggestion.samplesMs, zeroMs: zeroDelay.samplesMs, restoredMs: restored.samplesMs })}`);
      } finally {
        await configuration.update('quickSuggestionsDelay', originalDelay, vscode.ConfigurationTarget.Workspace);
      }
    }
    if (process.env.PHP_COMPANION_TEST_C1_WORKBENCH_INPUT_PROBE === '1') {
      const workbenchInput = await measureVisibleSuggestion(Number(c1DebugPort), folder, false, 18, 'workbench');
      console.log(`C1 Workbench input visible suggestions: ${JSON.stringify(workbenchInput)}`);
    }
    if (process.env.PHP_COMPANION_TEST_C1_UI === '1') {
      const vendorSuggestion = await measureVisibleSuggestion(Number(c1DebugPort), folder, true);
      console.log(`C1 visible vendor suggestion after typing: ${JSON.stringify(vendorSuggestion)}`);
      const switchedSuggestion = await measureUnsavedReceiverSuggestion(Number(c1DebugPort), folder);
      console.log(`C1 visible unsaved receiver switch: ${JSON.stringify(switchedSuggestion)}`);
      const rapidRounds = Number(process.env.PHP_COMPANION_TEST_C1_RAPID_ROUNDS ?? 10);
      assert.ok(Number.isSafeInteger(rapidRounds) && rapidRounds >= 1 && rapidRounds <= 1_000,
        'PHP_COMPANION_TEST_C1_RAPID_ROUNDS must be an integer from 1 to 1,000.');
      const rapidSuggestion = await measureRapidReceiverSuggestion(Number(c1DebugPort), folder, rapidRounds);
      assert.deepStrictEqual(rapidSuggestion.staleRounds, [],
        'SoPHP showed a method from the previous unsaved receiver type while typing.');
      console.log(`C1 rapid unsaved receiver switch: ${JSON.stringify(rapidSuggestion)}`);
      if (process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR === '1') {
        const realRoot = vscode.workspace.workspaceFolders?.find((entry) => entry.name === 'real-vendor');
        assert.ok(realRoot);
        const realSuggestion = await measureRealVendorSuggestion(Number(c1DebugPort), realRoot.uri);
        console.log(`C1 visible real Composer vendor suggestion: ${JSON.stringify(realSuggestion)}`);
      }
    }
  }
  console.log(`C1 Extension Host: PHP ${targetPhpVersion ?? 'auto'}, completion=${completionMs}ms; six editing queries before and after the unsaved receiver change, plus Composer vendor and multi-root chains, passed.`);
  console.log(`C1 VS Code built-in PHP suggestions: ${vscode.workspace.getConfiguration('php').get('suggest.basic', true)}`);
  console.log(`C1 warm command latency (12 sequential samples each, ms): ${JSON.stringify(warm)}`);
  console.log(`C1 server handler latency (same warm interval, ms): ${JSON.stringify(Object.fromEntries(
    Object.entries(serverTimings).map(([method, samples]) => [method, {
      count: samples.length, median: samples.length ? Math.round([...samples].sort((left, right) => left - right)[Math.floor((samples.length - 1) / 2)]!) : 0,
      max: samples.length ? Math.round(Math.max(...samples)) : 0,
    }]),
  ))}`);
  console.log(`C1 Language Client round trip (12 samples, ms): ${JSON.stringify(languageClientRoundTrip)}`);
  const removedFolder = vscode.workspace.workspaceFolders?.[1];
  assert.ok(removedFolder, 'The C1 workspace removal check needs a second Composer root.');
  const versionStateFolders = async (): Promise<string[]> => (await vscode.commands.executeCommand<string[]>(
    'phpCompanion._testVersionStateFolders')) ?? [];
  assert.ok((await versionStateFolders()).includes(removedFolder.uri.toString()),
    'The second Composer root had no version state before removal.');
  assert.ok(vscode.workspace.updateWorkspaceFolders(removedFolder.index, 1),
    'Could not remove the second Composer root from the workspace.');
  await waitForResult(versionStateFolders,
    (folders) => !folders.includes(removedFolder.uri.toString()) && folders.includes(workspace.uri.toString()),
    'SoPHP retained version state for a removed Composer workspace.');
  console.log('C1 removed Composer workspace no longer appears in active PHP version states');
}

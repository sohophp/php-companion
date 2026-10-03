import { arrayAccessCases } from './arrayAccessFixture.js';
import { quotedPrefixCases } from './quotedPrefixFixture.js';
import * as assert from 'node:assert';
import { symlink } from 'node:fs/promises';
import * as vscode from 'vscode';
import { unfinishedShapeContexts, unfinishedShapeSource, unfinishedShapeTail } from './unfinishedShapeFixture.js';
import { existingShapeArrowCases } from './existingShapeArrowFixture.js';
import { wordMiddleShapeCases } from './wordMiddleShapeFixture.js';

async function verifyVersionedBuiltinConstructors(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2FileinfoConstructor.php');
  const disk = '<?php class C2Info extends finfo {} new finfo(';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(disk));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const configuration = vscode.workspace.getConfiguration('phpCompanion', root);
  const initialVersion = configuration.get('phpVersion');
  const waitForParameters = async (names: string[]): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const help = await vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider',
        uri, document.positionAt(document.getText().length));
      const actual = help?.signatures[0]?.parameters.map(parameter => typeof parameter.label === 'string'
        ? /\$([A-Za-z_]+)/u.exec(parameter.label)?.[1] : undefined);
      if (help?.signatures.length === 1 && help.activeParameter === 0 && JSON.stringify(actual) === JSON.stringify(names)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Constructor parameters did not become ${names.join(', ')}: ${document.getText()}`);
  };
  const replace = async (source: string): Promise<void> => {
    assert.ok(await editor.edit(builder => builder.replace(new vscode.Range(document.positionAt(0),
      document.positionAt(document.getText().length)), source), { undoStopBefore: true, undoStopAfter: true }));
  };
  try {
    for (const version of ['7.2', '8.5']) {
      await configuration.update('phpVersion', version, vscode.ConfigurationTarget.WorkspaceFolder);
      const parameters = version === '7.2' ? ['options', 'arg'] : ['flags', 'magic_database'];
      if (document.getText() !== disk) await replace(disk);
      await waitForParameters(parameters);
      await replace(disk.replace('new finfo(', 'new C2Info('));
      assert.ok(document.isDirty); await waitForParameters(parameters);
      await replace('<?php class C2Info extends finfo { public function __construct(string $label) {} } new C2Info(');
      await waitForParameters(['label']);
      await vscode.commands.executeCommand('undo'); await waitForParameters(parameters);
      await vscode.commands.executeCommand('redo'); await waitForParameters(['label']);
      assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), disk);
    }
    console.log('C2 PHP 7.2/8.5 Fileinfo constructor signatures, inherited parameters, unsaved override and Undo/Redo passed');
  } finally { await configuration.update('phpVersion', initialVersion, vscode.ConfigurationTarget.WorkspaceFolder); }
}

async function verifyPropertyAssignmentCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2PropertyRanking.php');
  const source = `<?php
function c2PropertyInt(): int { return 1; }
function c2PropertyText(): string { return 'text'; }
function c2PropertyUnknown() {}
class C2PropertyRanking { public string $value;
  function edit(): void { $this->value = c2Property; }
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const waitForOrder = async (first: string, last: string): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$this->value = c2Property';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      const names = result?.items.filter(item => typeof item.label === 'string' && /^c2Property(?:Int|Text|Unknown)$/.test(item.label))
        .sort((left, right) => (left.sortText ?? '').localeCompare(right.sortText ?? ''))
        .map(item => item.label);
      if (JSON.stringify(names) === JSON.stringify([first, 'c2PropertyUnknown', last])) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Property value completion did not rank ${first} first and keep unknown results.`);
  };
  await waitForOrder('c2PropertyText', 'c2PropertyInt');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)), source.replace('public string', 'public int'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await waitForOrder('c2PropertyInt', 'c2PropertyText');
  await vscode.commands.executeCommand('undo'); await waitForOrder('c2PropertyText', 'c2PropertyInt');
  await vscode.commands.executeCommand('redo'); await waitForOrder('c2PropertyInt', 'c2PropertyText');
  console.log('C2 property assignment completion: ranking, unknown candidates, unsaved type change and Undo/Redo');
}

async function verifyElvisCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2Elvis.php');
  const source = `<?php
class C2ElvisRepository { public function ready(): void {} }
class C2ElvisOther { public function other(): void {} }
/** @return C2ElvisRepository|false|null */ function c2ElvisMaybe() {}
function runC2Elvis(): void {
  $value = c2ElvisMaybe() ?: new C2ElvisRepository();
  $independent = new C2ElvisRepository(); $value->ready();
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const items = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (items && items.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Shorthand ternary completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const definition = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', uri,
    document.positionAt(source.indexOf('$value->rea') + '$value->'.length + 1));
  assert.ok(definition?.some(item => item.uri.toString() === uri.toString()), 'Shorthand ternary method did not navigate.');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('new C2ElvisRepository()', 'new C2ElvisOther()'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 shorthand ternary: completion, definition, unsaved fallback change and Undo/Redo passed');
}

async function verifyValueCallCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ValueCall.php');
  const source = `<?php
class C2ValueCallRepo { public function ready(): void {} }
function c2ValueCallObserve($value) {}
function runC2ValueCall(): void {
  $value = new C2ValueCallRepo(); c2ValueCallObserve($value); $value->ready();
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Value-call completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('function c2ValueCallObserve($value)', 'function c2ValueCallObserve(&$value)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 value calls: unsaved reference parameter change and Undo/Redo passed');
}

async function verifyMethodValueCallCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2MethodValueCall.php');
  const source = `<?php
class C2MethodValueCallRepo { public function ready(): void {} }
final class C2MethodValueObserver { public static function c2MethodValueCallObserve($value) {} }
function runC2MethodValueCall(): void {
  $value = new C2MethodValueCallRepo(); C2MethodValueObserver::c2MethodValueCallObserve($value); $value->ready();
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Value-call completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('function c2MethodValueCallObserve($value)', 'function c2MethodValueCallObserve(&$value)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 value method calls: unsaved reference parameter change and Undo/Redo passed');
}

async function verifyExactMethodValueCallCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ExactMethodValueCall.php');
  const source = `<?php
class C2ExactMethodValueCallRepo { public function ready(): void {} }
class C2ExactMethodValueObserver { public function c2MethodValueCallObserve($value) {} }
function runC2ExactMethodValueCall(): void {
  $observer = new C2ExactMethodValueObserver(); $value = null ?: new C2ExactMethodValueCallRepo(); $observer->c2MethodValueCallObserve($value); $value->ready();
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Value-call completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('function c2MethodValueCallObserve($value)', 'function c2MethodValueCallObserve(&$value)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 exact constructed method calls: unsaved reference parameter change and Undo/Redo passed');
}

async function verifyArrayMethodValueCallCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ArrayMethodValueCall.php');
  const source = `<?php
class C2ArrayMethodValueCallRepo { public function ready(): void {} }
class C2ArrayMethodValueObserver { public function c2MethodValueCallObserve($value, $options) {} }
function runC2ArrayMethodValueCall(): void {
  $observer = new C2ArrayMethodValueObserver(); $value = null ?: new C2ArrayMethodValueCallRepo(); $observer->c2MethodValueCallObserve($value, ["limit" => 10, "options" => ["enabled" => true]]); $value->ready();
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Value-call completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('function c2MethodValueCallObserve($value, $options)', 'function c2MethodValueCallObserve(&$value, $options)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 array value method calls: unsaved reference parameter change and Undo/Redo passed');
}

async function verifyExpressionMethodValueCallCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ExpressionMethodValueCall.php');
  const source = `<?php
class C2ExpressionMethodValueFlags { const FAST = 1; const SAFE = 2; }
class C2ExpressionMethodValueCallRepo { public function ready(): void {} }
class C2ExpressionMethodValueObserver { public function c2MethodValueCallObserve($value, $options) {} }
function runC2ExpressionMethodValueCall(): void {
  $observer = new C2ExpressionMethodValueObserver(); $value = null ?: new C2ExpressionMethodValueCallRepo(); $observer->c2MethodValueCallObserve($value, ["flags" => (C2ExpressionMethodValueFlags::FAST | C2ExpressionMethodValueFlags::SAFE), "limit" => 2 * 5]); $value->ready();
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Value-call completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('function c2MethodValueCallObserve($value, $options)', 'function c2MethodValueCallObserve(&$value, $options)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 expression value method calls: unsaved reference parameter change and Undo/Redo passed');
}

async function verifyStaticScopeMethodValueCallCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2StaticScopeMethodValueCall.php');
  const source = `<?php
class C2StaticScopeMethodValueFlags { const FAST = 1; const SAFE = 2; }
class C2StaticScopeMethodValueCallRepo { public function ready(): void {} }
class C2StaticScopeMethodValueObserver { public function c2MethodValueCallObserve($value, $options) {} }
class C2StaticScopeMethodValueRun { public static function run(): void {
  $observer = new C2StaticScopeMethodValueObserver(); $value = null ?: new C2StaticScopeMethodValueCallRepo(); $observer->c2MethodValueCallObserve($value, ["flags" => (C2StaticScopeMethodValueFlags::FAST | C2StaticScopeMethodValueFlags::SAFE), "limit" => 2 * 5]); $value->ready();
} }`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Value-call completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('function c2MethodValueCallObserve($value, $options)', 'function c2MethodValueCallObserve(&$value, $options)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 static scope value method calls: unsaved reference parameter change and Undo/Redo passed');
}

async function verifyLiteralPrefixMethodValueCallCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2LiteralPrefixMethodValueCall.php');
  const source = `<?php
class C2LiteralPrefixMethodValueFlags { const FAST = 1; const SAFE = 2; }
class C2LiteralPrefixMethodValueCallRepo { public function ready(): void {} }
class C2LiteralPrefixMethodValueObserver { public function c2MethodValueCallObserve($value, $options) {} }
class C2LiteralPrefixMethodValueRun { public static function run(): void {
  /* static global eval &$value */ $label = "static"; $observer = new C2LiteralPrefixMethodValueObserver(); $value = null ?: new C2LiteralPrefixMethodValueCallRepo(); $observer->c2MethodValueCallObserve($value, ["flags" => (C2LiteralPrefixMethodValueFlags::FAST | C2LiteralPrefixMethodValueFlags::SAFE), "limit" => 2 * 5]); $value->ready();
} }`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Value-call completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('function c2MethodValueCallObserve($value, $options)', 'function c2MethodValueCallObserve(&$value, $options)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 literal prefix value method calls: unsaved reference parameter change and Undo/Redo passed');
}

async function verifyPostAssignmentLiteralMethodValueCallCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2PostAssignmentLiteralMethodValueCall.php');
  const source = `<?php
class C2PostAssignmentLiteralMethodValueFlags { const FAST = 1; const SAFE = 2; }
class C2PostAssignmentLiteralMethodValueCallRepo { public function ready(): void {} }
class C2PostAssignmentLiteralMethodValueObserver { public function c2MethodValueCallObserve($value, $options) {} }
class C2PostAssignmentLiteralMethodValueRun { public static function run(): void {
  /* static global eval &$value */ $label = "static"; $observer = new C2PostAssignmentLiteralMethodValueObserver(); $value = null ?: new C2PostAssignmentLiteralMethodValueCallRepo(); $label = 'literal $value global eval'; $observer->c2MethodValueCallObserve($value, ["flags" => (C2PostAssignmentLiteralMethodValueFlags::FAST | C2PostAssignmentLiteralMethodValueFlags::SAFE), "limit" => 2 * 5]); $value->ready();
} }`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Value-call completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const prefix = '/* static global eval &$value */';
  const prefixOffset = source.indexOf(prefix); assert.ok(prefixOffset >= 0);
  const prefixEdit = new vscode.WorkspaceEdit();
  prefixEdit.replace(uri, new vscode.Range(document.positionAt(prefixOffset), document.positionAt(prefixOffset + prefix.length)),
    'global $value;'.padEnd(prefix.length));
  assert.ok(await vscode.workspace.applyEdit(prefixEdit)); assert.ok(document.isDirty);
  assert.strictEqual(document.getText().length, source.length);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  await vscode.commands.executeCommand('undo'); await completion(true);
  assert.strictEqual(document.getText(), source);
  console.log('C2 cached prefix syntax: equal-length unsaved edit and Undo/Redo passed');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('function c2MethodValueCallObserve($value, $options)', 'function c2MethodValueCallObserve(&$value, $options)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 post assignment literal value method calls: unsaved reference parameter change and Undo/Redo passed');
}

async function verifyCrossFileValueSignatureCompletion(root: vscode.Uri): Promise<void> {
  const definitionsUri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2CrossFileValueSignatures.php');
  const callerUri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2CrossFileValueCaller.php');
  const definitions = `<?php class C2CrossFileValueRepo { public function ready(): void {} }
function c2CrossFileObserve($value): void {}
class C2CrossFileValueObserver { public function observe($value): void {} }`;
  const caller = `<?php function c2CrossFileFunction(): void {
  $value = null ?: new C2CrossFileValueRepo(); c2CrossFileObserve($value); $value->ready();
} function c2CrossFileMethod(): void {
  $observer = new C2CrossFileValueObserver(); $value = null ?: new C2CrossFileValueRepo(); $observer->observe($value); $value->ready();
}`;
  await vscode.workspace.fs.writeFile(definitionsUri, Buffer.from(definitions));
  await vscode.workspace.fs.writeFile(callerUri, Buffer.from(caller));
  const definitionsDocument = await vscode.workspace.openTextDocument(definitionsUri);
  const callerDocument = await vscode.workspace.openTextDocument(callerUri);
  await vscode.window.showTextDocument(callerDocument);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    const positions = [caller.indexOf('$value->rea'), caller.lastIndexOf('$value->rea')];
    while (Date.now() < deadline) {
      const results = await Promise.all(positions.map(offset => vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', callerUri, callerDocument.positionAt(offset + '$value->rea'.length))));
      if (results.every(result => result && result.items.some(item => item.label === 'ready') === expected)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Cross-file function/method signatures did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(definitionsUri, new vscode.Range(definitionsDocument.positionAt(0), definitionsDocument.positionAt(definitions.length)),
    definitions.replaceAll('($value)', '(&$value)'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(definitionsDocument.isDirty);
  await completion(false);
  await vscode.window.showTextDocument(definitionsDocument);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  await vscode.commands.executeCommand('undo'); await completion(true);
  assert.strictEqual(callerDocument.getText(), caller); assert.strictEqual(callerDocument.isDirty, false);
  console.log('C2 cross-file value signatures: unchanged caller, unsaved function/method reference edits and Undo/Redo passed');
}

async function verifyReferenceReturnCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ReferenceReturn.php');
  const source = `<?php
class C2ReferenceRepo { public function ready(): void {} }
class C2ReferenceOther {}
class C2ReferenceStorage { public static $value; }
function &c2ReferenceSlot() { return C2ReferenceStorage::$value; }
function c2ReferenceObserve($value) { C2ReferenceStorage::$value = new C2ReferenceOther(); }
function runC2Reference(): void {
  $value = c2ReferenceSlot(); $value = new C2ReferenceRepo(); c2ReferenceObserve($value); $value->ready();
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$value->rea';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      if (result && result.items.some(item => item.label === 'ready') === expected) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Reference-return completion did not refresh ready=${expected}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('$value = c2ReferenceSlot()', '$value = /* alias */ &c2ReferenceSlot()'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 reference returns: copy/alias binding, unsaved change and Undo/Redo passed');
}

async function verifyGenericExpectedCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2GenericExpected.php');
  const source = `<?php class C2GenericBase {} class C2GenericAlpha extends C2GenericBase {} class C2GenericBeta extends C2GenericBase {}
/** @template T of C2GenericBase
 * @param class-string<T> $type
 * @param T $value */ function c2GenericTake($type, $value, string $tail): void {}
function runC2Generic(C2GenericBeta $valueBeta, C2GenericAlpha $valueAlpha, $valueUnknown): void { c2GenericTake(C2GenericAlpha::class, $v); }`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const completion = async (alpha: boolean): Promise<void> => {
    const expected = alpha ? ['$valueAlpha', '$valueUnknown', '$valueBeta'] : ['$valueBeta', '$valueUnknown', '$valueAlpha'];
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const result = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', uri, document.positionAt(text.lastIndexOf('$v') + 2));
      const names = result?.items.filter(item => typeof item.label === 'string' && /^\$value(?:Alpha|Beta|Unknown)$/.test(item.label))
        .sort((left, right) => (left.sortText ?? '').localeCompare(right.sortText ?? '')).map(item => item.label);
      if (JSON.stringify(names) === JSON.stringify(expected)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Generic expected type did not refresh alpha=${alpha}.`);
  };
  await completion(true);
  const unclosed = source.replace('$v);', '$v;');
  const openingEdit = new vscode.WorkspaceEdit();
  openingEdit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)), unclosed);
  assert.ok(await vscode.workspace.applyEdit(openingEdit)); await completion(true);
  const edit = new vscode.WorkspaceEdit(); edit.replace(uri,
    new vscode.Range(document.positionAt(0), document.positionAt(unclosed.length)), unclosed.replace('c2GenericTake(C2GenericAlpha::class', 'c2GenericTake(C2GenericBeta::class'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty); await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 generic expected arguments: missing required tail, closed/unclosed ranking, unknown retention, unsaved edit and Undo/Redo passed');
}

async function verifyOverloadExpectedCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2OverloadExpected.php');
  const source = `<?php
/** @method int send(string $value, int $mode = 0)
 * @method string send(string $value, string $mode = '') */ class C2OverloadClient {}
function c2OverloadValueInt(): int {}
function c2OverloadValueText(): string {}
function c2OverloadValueUnknown() {}
function runC2Overload(C2OverloadClient $client): void { $client->send(c2OverloadValue); }`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (agreed: boolean): Promise<void> => {
    const expected = agreed ? ['c2OverloadValueText', 'c2OverloadValueUnknown', 'c2OverloadValueInt']
      : ['c2OverloadValueInt', 'c2OverloadValueText', 'c2OverloadValueUnknown'];
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const marker = '$client->send(c2OverloadValue';
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        uri, document.positionAt(text.indexOf(marker) + marker.length));
      const names = result?.items.filter(item => typeof item.label === 'string' && /^c2OverloadValue(?:Int|Text|Unknown)$/.test(item.label))
        .sort((left, right) => (left.sortText ?? '').localeCompare(right.sortText ?? '')).map(item => item.label);
      if (JSON.stringify(names) === JSON.stringify(expected)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Overload expected type did not refresh agreed=${agreed}.`);
  };
  await completion(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
    source.replace('@method string send(string', '@method string send(int'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await completion(false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await completion(true);
  await vscode.commands.executeCommand('redo'); await completion(false);
  console.log('C2 overload expected types: ranking, unknown preservation, unsaved conflict and Undo/Redo passed');
}

async function verifyThisBindingDiagnostics(root: vscode.Uri): Promise<void> {
  const directory = vscode.Uri.joinPath(root, 'src', 'Service');
  await vscode.workspace.fs.createDirectory(directory);
  const uri = vscode.Uri.joinPath(directory, 'C2ThisBinding.php');
  const source = '<?php class C2ThisBinding { public function ready(): void {} public static function run(): void { $this->ready(); $callback = static fn () => $this->ready(); } }';
  const revised = source.replace('public static function', 'public function').replace('static fn', 'fn');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const diagnostics = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(uri)
    .filter((item) => item.source === 'SoPHP' && item.code === 'php.variable.unbound-this');
  const waitForCount = async (count: number): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && diagnostics().length !== count) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(diagnostics().length, count, `Expected ${count} unbound $this diagnostics in the editor.`);
  };
  await waitForCount(2);
  const completion = (text: string): Thenable<vscode.CompletionList> => vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider', uri, document.positionAt(text.indexOf('$this->ready()') + '$this->re'.length));
  const definition = (text: string): Thenable<vscode.Location[]> => vscode.commands.executeCommand(
    'vscode.executeDefinitionProvider', uri, document.positionAt(text.indexOf('$this->ready()') + '$this->re'.length));
  assert.ok(!(await completion(source)).items.some((item) => item.label === 'ready' && item.kind === vscode.CompletionItemKind.Method),
    'An unbound $this offered instance methods.');
  assert.deepStrictEqual(await definition(source), [], 'An unbound $this navigated to an instance method.');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(source.length)), revised);
  assert.ok(await vscode.workspace.applyEdit(edit));
  assert.ok(document.isDirty, 'The instance edit must remain unsaved.');
  await waitForCount(0);
  assert.ok((await completion(revised)).items.some((item) => item.label === 'ready' && item.kind === vscode.CompletionItemKind.Method),
    'A bound $this lost instance methods.');
  assert.deepStrictEqual((await definition(revised)).map((location) => location.uri.toString()), [uri.toString()]);
  await vscode.commands.executeCommand('undo');
  await waitForCount(2);
  await vscode.commands.executeCommand('redo');
  await waitForCount(0);
}

async function verifyPartialWordVariableDiagnostics(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2PartialWord.php');
  const source = `<?php
final class Bootstrap { public function __construct(string $projectDir) {} }
$app = new Bootstrap(projectDir: $a);`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const diagnostics = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(uri).filter((item) => item.source === 'SoPHP');
  const waitFor = async (syntax: boolean, variable: boolean): Promise<void> => {
    const matches = (): boolean => diagnostics().some((item) => item.code === 'php.syntax') === syntax
      && diagnostics().some((item) => item.code === 'php.variable.possiblyUndefined') === variable;
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && !matches()) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(matches(), `Unexpected partial-word diagnostics: ${JSON.stringify(diagnostics().map((item) => item.code))}`);
  };
  await waitFor(false, true);
  const partial = new vscode.WorkspaceEdit();
  partial.insert(uri, document.positionAt('<?php\n'.length), 'func\n');
  assert.ok(await vscode.workspace.applyEdit(partial));
  assert.ok(document.isDirty, 'The partial-word edit unexpectedly saved the document.');
  await waitFor(true, true);
  const assignment = new vscode.WorkspaceEdit();
  assignment.insert(uri, document.positionAt(document.getText().indexOf('$app =')), "$a = 'root';\n");
  assert.ok(await vscode.workspace.applyEdit(assignment));
  await waitFor(true, false);
  await vscode.commands.executeCommand('undo');
  await waitFor(true, true);
  await vscode.commands.executeCommand('undo');
  await waitFor(false, true);
  console.log('C2 standalone partial word kept an independent variable diagnostic through unsaved edit and Undo');
}

async function verifyArrayFilterModeFeedback(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ArrayFilterMode.php');
  const sourceFor = (mode: string, parameters = '$entry'): string => `<?php
class C2ArrayFilterItem { public function name(): string { return ''; } }
/** @param array<string, C2ArrayFilterItem> $items */
function c2FilterItems(array $items, int $mode): void {
    array_filter($items, fn(${parameters}) => $entry->na${mode});
}`;
  const original = sourceFor('');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (): Promise<boolean> => {
    const source = document.getText(); const offset = source.indexOf('$entry->na') + '$entry->na'.length;
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, document.positionAt(offset));
    return list.items.some((item) => item.label === 'name' && item.kind === vscode.CompletionItemKind.Method);
  };
  const waitFor = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (await completion() === expected) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`array_filter callback completion did not become ${expected ? 'value' : 'unknown'} mode.`);
  };
  const change = async (mode: string, parameters = '$entry'): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor(mode, parameters));
    assert.ok(await vscode.workspace.applyEdit(edit));
    assert.ok(document.isDirty, 'array_filter mode changes must remain unsaved.');
  };
  await waitFor(true);
  await change(', ARRAY_FILTER_USE_KEY'); await waitFor(false);
  await vscode.commands.executeCommand('undo'); await waitFor(true);
  await vscode.commands.executeCommand('redo'); await waitFor(false);
  await change(', $mode'); await waitFor(false);
  await change(', 0'); await waitFor(true);
  await change(', \\ARRAY_FILTER_USE_BOTH', '$entry, $key'); await waitFor(true);
  await change(', $mode', '$entry, $key'); await waitFor(false);
  const keySource = `<?php
class C2ArrayFilterItem { public function name(): string { return ''; } }
/** @param array<string, C2ArrayFilterItem> $items */
function c2FilterItems(array $items): void {
    array_filter($items, fn($entry, $key) => strlen(), \\ARRAY_FILTER_USE_BOTH);
}`;
  const keyEdit = new vscode.WorkspaceEdit();
  keyEdit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), keySource);
  assert.ok(await vscode.workspace.applyEdit(keyEdit));
  assert.ok(document.isDirty);
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const offset = document.getText().indexOf('strlen()') + 'strlen('.length;
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, document.positionAt(offset));
    const key = list.items.find((item) => item.label === '$key');
    const value = list.items.find((item) => item.label === '$entry');
    if (key?.sortText?.startsWith('!0') && value?.sortText?.startsWith('2')) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const offset = document.getText().indexOf('strlen()') + 'strlen('.length;
  const list = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', uri, document.positionAt(offset));
  assert.ok(list.items.find((item) => item.label === '$key')?.sortText?.startsWith('!0'));
  assert.ok(list.items.find((item) => item.label === '$entry')?.sortText?.startsWith('2'));
  const aliasedSource = `<?php namespace App;
use const ARRAY_FILTER_USE_BOTH as FILTER_BOTH;
class C2ArrayFilterItem { public function name(): string { return ''; } }
/** @param array<string, C2ArrayFilterItem> $items */
function c2FilterItems(array $items): void {
    array_filter($items, fn($entry, $key) => $entry->na, FILTER_BOTH);
}`;
  const aliasEdit = new vscode.WorkspaceEdit();
  aliasEdit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), aliasedSource);
  assert.ok(await vscode.workspace.applyEdit(aliasEdit));
  await waitFor(true);
  console.log('C2 array_filter callback mode, imported constant and key type: unsaved completion and Undo/Redo passed');
}

async function verifyArrayReduceCarryFeedback(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ArrayReduceCarry.php');
  const sourceFor = (returned: 'C2ReduceCarry' | 'C2ReduceItem'): string => `<?php
class C2ReduceItem { public function name(): string { return ''; } }
class C2ReduceCarry { public function total(): int { return 1; } }
/** @param list<C2ReduceItem> $items */
function c2Reduce(array $items): void {
    array_reduce($items, function ($carry, $item) {
        $carry->tot;
        $item->na;
        return new ${returned}();
    }, new C2ReduceCarry());
}`;
  const original = sourceFor('C2ReduceCarry');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (marker: string, label: string): Promise<boolean> => {
    const source = document.getText();
    const offset = source.indexOf(marker) + marker.length;
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, document.positionAt(offset));
    return list.items.some((item) => item.label === label && item.kind === vscode.CompletionItemKind.Method);
  };
  const waitFor = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (await completion('$carry->tot', 'total') === expected && await completion('$item->na', 'name')) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`array_reduce carry completion did not become ${expected ? 'compatible' : 'unknown'}.`);
  };
  const change = async (returned: 'C2ReduceCarry' | 'C2ReduceItem'): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor(returned));
    assert.ok(await vscode.workspace.applyEdit(edit));
    assert.ok(document.isDirty, 'array_reduce return edits must remain unsaved.');
  };
  await waitFor(true);
  await change('C2ReduceItem'); await waitFor(false);
  await vscode.commands.executeCommand('undo'); await waitFor(true);
  await vscode.commands.executeCommand('redo'); await waitFor(false);
  console.log('C2 array_reduce carry feedback: unsaved callback return and Undo/Redo passed');
}

async function verifyArrayWalkRecursiveFeedback(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ArrayWalkRecursive.php');
  const sourceFor = (type: 'C2RecursiveItem' | 'C2RecursiveOther'): string => `<?php
class C2RecursiveItem { public function name(): string { return ''; } }
class C2RecursiveOther { public function other(): string { return ''; } }
/** @param array<string, array<string, ${type}>> $items */
function c2WalkRecursive(array $items): void {
    array_walk_recursive($items, fn($entry, $key) => $entry->na);
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('C2RecursiveItem')));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (): Promise<boolean> => {
    const source = document.getText();
    const offset = source.indexOf('$entry->na') + '$entry->na'.length;
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, document.positionAt(offset));
    return list.items.some((item) => item.label === 'name' && item.kind === vscode.CompletionItemKind.Method);
  };
  const waitFor = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (await completion() === expected) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`array_walk_recursive leaf completion did not become ${expected ? 'Item' : 'Other'}.`);
  };
  await waitFor(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    sourceFor('C2RecursiveOther'));
  assert.ok(await vscode.workspace.applyEdit(edit));
  assert.ok(document.isDirty, 'array_walk_recursive type changes must remain unsaved.');
  await waitFor(false);
  await vscode.commands.executeCommand('undo'); await waitFor(true);
  await vscode.commands.executeCommand('redo'); await waitFor(false);
  console.log('C2 array_walk_recursive leaf completion followed unsaved type edits and Undo/Redo');
}

async function verifyLocalStringCallbackFeedback(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2LocalStringCallback.php');
  const sourceFor = (valid: boolean): string => `<?php
class C2StringInput {}
class C2StringOutput { public function name(): string { return ''; } }
function c2StringConvert(C2StringInput $input): C2StringOutput { return new C2StringOutput(); }
function c2StringMap(): void {
    $callback = 'c2StringConvert'; $copy = $callback;
    $callback = 'missingFunction';
    ${valid ? '' : "$copy = 'missingFunction';"}
    $result = array_map($copy, [new C2StringInput()]);
    foreach ($result as $item) { $item->na; }
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor(true)));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const completion = async (): Promise<boolean> => {
    const source = document.getText();
    const offset = source.indexOf('$item->na') + '$item->na'.length;
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, document.positionAt(offset));
    return list.items.some((item) => item.label === 'name' && item.kind === vscode.CompletionItemKind.Method);
  };
  const waitFor = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (await completion() === expected) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Local string callback completion did not become ${expected ? 'valid' : 'unknown'}.`);
  };
  await waitFor(true);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    sourceFor(false));
  assert.ok(await vscode.workspace.applyEdit(edit));
  assert.ok(document.isDirty, 'Local string callback changes must remain unsaved.');
  await waitFor(false);
  await vscode.commands.executeCommand('undo'); await waitFor(true);
  await vscode.commands.executeCommand('redo'); await waitFor(false);
  console.log('C2 local string callback snapshot, unsaved replacement and Undo/Redo passed');
}

async function verifyOperandCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2OperandCompletion.php');
  const sourceFor = (type: string): string => `<?php
function c2OperandTarget(${type} $value): void {}
function c2OperandInner(string $value): string { return $value; }
${[
  'c2OperandTarget(!$val);', 'c2OperandTarget($val === true);', 'c2OperandTarget((int) $val);',
  'c2OperandTarget($val + 1);', 'c2OperandTarget(!c2OperandInner($val));',
  `c2OperandTarget($val ?? ${type === 'string' ? "'no'" : '2'});`,
].map((expression, index) => `function c2OperandRun${index}(): void {
  $valueText = 'text'; $valueFlag = true; $valueNumber = 123;
  ${expression}
}`).join('\n')}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('string')));
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const verify = async (type: string): Promise<void> => {
    for (const [marker, expected] of [['!$val);', '$valueFlag'], ['(int) $val);', '$valueFlag'], ['$val ===', '$valueFlag'], ['$val +', '$valueFlag'], ['$val));', '$valueText'], ['$val ??', type === 'string' ? '$valueText' : '$valueNumber']]) {
      const deadline = Date.now() + 10_000; let passed = false;
      while (Date.now() < deadline) {
        const offset = document.getText().indexOf(marker!) + marker!.indexOf('$val') + '$val'.length;
        const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
        const labels = result?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
        if (labels[0] === expected && ['$valueFlag', '$valueText', '$valueNumber'].every(label => labels.includes(label))) { passed = true; break; }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.ok(passed, `Operand completion ${marker} did not rank ${expected} for ${type}.`);
    }
  };
  await verify('string');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('int'));
  assert.ok(await vscode.workspace.applyEdit(edit)); await verify('int');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await verify('string');
  await vscode.commands.executeCommand('redo'); await verify('int');
  console.log('C2 operand/result ranking, unsaved return contract and Undo/Redo passed');
}

async function verifyCallbackReturnCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2CallbackReturnCompletion.php');
  const sourceFor = (type: string): string => `<?php
function c2CallbackOuter(string $value): void {}
function c2CallbackInner(bool $value): bool { return $value; }
function c2CallbackRun(): void {
 c2CallbackOuter(function(): ${type} { $valueText='text'; $valueFlag=true; $valueNumber=123; return $val; });
}
function c2CallbackArgument(): void {
 $callback=function(): ${type} { $valueText='text'; $valueFlag=true; $valueNumber=123; return c2CallbackInner($val); };
}
function c2CallbackArrow(): void {
 $valueText='text'; $valueFlag=true; $valueNumber=123;
 $callback=fn(): ${type} => $val;
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('string')));
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const verify = async (type: string): Promise<void> => {
    for (const [marker, expected] of [['return $val;', type === 'string' ? '$valueText' : '$valueNumber'], ['c2CallbackInner($val)', '$valueFlag'], ['=> $val;', type === 'string' ? '$valueText' : '$valueNumber']]) {
      const deadline = Date.now() + 10_000; let passed = false;
      while (Date.now() < deadline) {
        const offset = document.getText().indexOf(marker!) + marker!.indexOf('$val') + '$val'.length;
        const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
        const labels = result?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
        if (labels[0] === expected && ['$valueFlag', '$valueText', '$valueNumber'].every(label => labels.includes(label))) { passed = true; break; }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.ok(passed, `Callback return completion ${marker} did not rank ${expected} for ${type}.`);
    }
  };
  await verify('string');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('int'));
  assert.ok(await vscode.workspace.applyEdit(edit)); await verify('int');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await verify('string');
  await vscode.commands.executeCommand('redo'); await verify('int');
  console.log('C2 callback return ranking, inner argument contract, unsaved updates and Undo/Redo passed');
}

async function verifyTrailingCallbackCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2TrailingCallbackCompletion.php');
  const sourceFor = (type: string): string => `<?php
function c2CallbackOuter(string $value): void {}
$valueOutside=1;
c2CallbackOuter(function(): ${type} { $valueText='text'; $valueFlag=true; $valueNumber=123; return $val`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('string')));
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const verify = async (type: string): Promise<void> => {
    for (const [marker, expected] of [['return $val', type === 'string' ? '$valueText' : '$valueNumber']]) {
      const deadline = Date.now() + 10_000; let passed = false;
      while (Date.now() < deadline) {
        const offset = document.getText().indexOf(marker!) + marker!.indexOf('$val') + '$val'.length;
        const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
        const labels = result?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
        if (!labels.includes('$valueOutside') && labels[0] === expected && ['$valueFlag', '$valueText', '$valueNumber'].every(label => labels.includes(label))) { passed = true; break; }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.ok(passed, `Callback return completion ${marker} did not rank ${expected} for ${type}.`);
    }
  };
  await verify('string');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('int'));
  assert.ok(await vscode.workspace.applyEdit(edit)); await verify('int');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await verify('string');
  await vscode.commands.executeCommand('redo'); await verify('int');
  console.log('C2 trailing callback ranking, scope isolation, unsaved updates and Undo/Redo passed');
}

async function verifyCallbackCompletionDetails(root: vscode.Uri): Promise<void> {
  const uri=vscode.Uri.joinPath(root,'src','Service','C2CallbackDetails.php');
  const sourceFor=(type: string, trailing: boolean): string => `<?php
$valueText=${type==='string' ? "'text'" : '123'};
$callback=function() use ($valueText): ${type} { return $va${trailing ? '' : '; };'}`;
  await vscode.workspace.fs.writeFile(uri,Buffer.from(sourceFor('string',false)));
  const document=await vscode.workspace.openTextDocument(uri);await vscode.window.showTextDocument(document);
  const verify=async(type: string): Promise<void>=>{
    const deadline=Date.now()+10_000;let detail: string | undefined;
    while(Date.now()<deadline){
      const offset=document.getText().lastIndexOf('$va')+3;
      const result=await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',uri,document.positionAt(offset),undefined,64);
      const item=result?.items.find(candidate=>(typeof candidate.label==='string'?candidate.label:candidate.label.label)==='$valueText');
      detail=item?.detail;
      if(detail===`$valueText: ${type}`)return;
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    assert.fail(`Callback completion detail should be $valueText: ${type}, got ${detail}`);
  };
  const replace=async(type: string,trailing: boolean): Promise<void>=>{
    const edit=new vscode.WorkspaceEdit();edit.replace(uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),sourceFor(type,trailing));
    assert.ok(await vscode.workspace.applyEdit(edit));await verify(type);
  };
  await verify('string');await replace('int',false);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo');await verify('string');
  await vscode.commands.executeCommand('redo');await verify('int');
  await replace('int',true);
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo');await verify('int');
  await vscode.commands.executeCommand('redo');await verify('int');
  console.log('C2 callback variable details, trailing input, unsaved changes and Undo/Redo passed');
}

async function verifyTrailingCallableMembers(root: vscode.Uri): Promise<void> {
  const uri=vscode.Uri.joinPath(root,'src','Service','C2TrailingMembers.php');
  const sourceFor=(type: string): string=>`<?php
class C2TrailingItem {public function title():string{return 'text';} private function hidden():void{}}
class C2TrailingOther {public function toggle():bool{return true;}}
class C2TrailingFactory {public function run(C2Trailing${type} $item):void {$item->`;
  await vscode.workspace.fs.writeFile(uri,Buffer.from(sourceFor('Item')));
  const document=await vscode.workspace.openTextDocument(uri);await vscode.window.showTextDocument(document);
  const verify=async(type: string): Promise<void>=>{
    const expected=type==='Item'?'title':'toggle',unwanted=type==='Item'?'toggle':'title';
    const deadline=Date.now()+10_000;
    while(Date.now()<deadline){
      const result=await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',uri,document.positionAt(document.getText().length),undefined,64);
      const labels=result?.items.map(item=>typeof item.label==='string'?item.label:item.label.label)??[];
      if(labels.includes(expected)&&!labels.includes(unwanted)&&!labels.includes('hidden'))return;
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    assert.fail(`Unclosed method member completion should show ${expected} without ${unwanted} or hidden`);
  };
  await verify('Item');
  const edit=new vscode.WorkspaceEdit();edit.replace(uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),sourceFor('Other'));
  assert.ok(await vscode.workspace.applyEdit(edit));await verify('Other');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo');await verify('Item');
  await vscode.commands.executeCommand('redo');await verify('Other');
  console.log('C2 trailing method members, private candidate filtering, unsaved parameter replacement and Undo/Redo passed');
}

async function verifyBranchShapeCompletion(root: vscode.Uri): Promise<void> {
  const uri=vscode.Uri.joinPath(root,'src','Service','C2BranchShapes.php');
  const modes=['ternary','coalesce','left','nested','arm','subject','label'];
  const sourceFor=(key: string): string=>`<?php
/** @param array{${key}:string,nested:array{deep:array{${key}:string}}} $config */
function c2BranchShapeSend(array $config):void{}
${modes.map(mode=>{
  const expression=mode==='ternary'?'true?["o"]:[]':mode==='coalesce'?'null??["o"]':mode==='left'?'["o"]??[]'
    :mode==='nested'?'["nested"=>["deep"=>["o"]]]':mode==='subject'?'match(["o"]){default=>[]}'
    :mode==='label'?'match(true){["o"]=>[],default=>[]}':'match(true){true=>["o"],default=>[]}';
  return `function c2BranchShape${mode}():void{c2BranchShapeSend(${expression});}`;
}).join('\n')}`;
  await vscode.workspace.fs.writeFile(uri,Buffer.from(sourceFor('owner')));
  const document=await vscode.workspace.openTextDocument(uri);await vscode.window.showTextDocument(document);
  const verify=async(key: string): Promise<void>=>{
    for(const mode of modes){
      const text=document.getText(),start=text.indexOf(`function c2BranchShape${mode}(`);
      const offset=text.indexOf('"o"',start)+2;let labels: string[]=[];
      const deadline=Date.now()+10_000;
      while(Date.now()<deadline){
        const result=await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',uri,document.positionAt(offset),undefined,64);
        // The command aggregates unfiltered built-in PHP snippets; LSP tests
        // check the exact SoPHP list, and C1 checks actual Workbench filtering.
        labels=result?.items.filter(item=>item.kind!==vscode.CompletionItemKind.Snippet)
          .map(item=>typeof item.label==='string'?item.label:item.label.label)??[];
        if(mode==='subject'||mode==='label'){
          if(!labels.includes('owner')&&!labels.includes('other'))break;
        }else if(labels.length===1&&labels[0]===key)break;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      if(mode==='subject'||mode==='label')assert.ok(!labels.includes('owner')&&!labels.includes('other'),`Shape selector ${mode} borrowed a value contract`);
      else assert.deepStrictEqual(labels,[key],`Shape branch ${mode} did not refresh ${key}`);
    }
  };
  await verify('owner');
  const edit=new vscode.WorkspaceEdit();edit.replace(uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),sourceFor('other'));
  assert.ok(await vscode.workspace.applyEdit(edit));await verify('other');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo');await verify('owner');
  await vscode.commands.executeCommand('redo');await verify('other');
  console.log('C2 array shape value branches, deep fields, selector isolation, unsaved contract changes and Undo/Redo passed');
}

async function verifyArrayAccessKeyCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ArrayAccessKeys.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from('<?php'));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const read = async (offset: number): Promise<string[]> => {
    const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
    return result?.items.filter(item => item.kind !== vscode.CompletionItemKind.Snippet)
      .map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
  };
  for (const item of arrayAccessCases) {
    const offset = item.marked.indexOf('§'), source = item.marked.replace('§', '');
    assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)));
    let labels: string[] = [];
    const deadline = Date.now() + 10_000;
    do {
      labels = await read(offset);
      if (JSON.stringify(labels) === JSON.stringify(item.labels)) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < deadline);
    assert.deepStrictEqual(labels, item.labels, `Array access keys did not refresh ${item.name}.`);
  }
  console.log('C2 array access key candidates, nested/optional guards, unsaved withdrawal and closed/unclosed reads passed');
}

async function verifyQuotedPrefixCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2QuotedPrefixes.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from('<?php'));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const read = async (offset: number): Promise<string[]> => {
    const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
    return result?.items.filter(item => item.kind !== vscode.CompletionItemKind.Snippet)
      .map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
  };
  for (const item of quotedPrefixCases) {
    const offset = item.marked.indexOf('§'), source = item.marked.replace('§', '');
    assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)));
    let labels: string[] = [];
    const deadline = Date.now() + 10_000;
    do {
      labels = await read(offset);
      if (JSON.stringify(labels) === JSON.stringify([item.label])) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < deadline);
    assert.deepStrictEqual(labels, [item.label], `Quoted prefix did not refresh ${item.name}.`);
  }
  console.log('C2 punctuation, unicode, escaped keys/values, double quoted dollar and closed/unclosed prefix candidates passed');
}

async function verifyUnfinishedShapeCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2UnfinishedShapes.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(unfinishedShapeSource('c2Unfinished', 'mode', 'create', 'argument', 'key')));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  for (const context of unfinishedShapeContexts) for (const part of ['key', 'value'] as const) for (const middle of [false, true]) {
    const sourceFor = (key: string, value: string): string => unfinishedShapeSource('c2Unfinished', key, value, context, part)
      + (middle ? unfinishedShapeTail(context) : '');
    const verify = async (key: string, value: string): Promise<void> => {
      const expected = [part === 'key' ? key : `'${value}'`];
      let labels: string[] = [];
      const deadline = Date.now() + 10_000;
      do {
        const offset = unfinishedShapeSource('c2Unfinished', key, value, context, part).length;
        const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
        labels = result?.items.filter(item => item.kind !== vscode.CompletionItemKind.Snippet)
          .map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
        if (JSON.stringify(labels) === JSON.stringify(expected)) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      } while (Date.now() < deadline);
      assert.deepStrictEqual(labels, expected, `Unfinished ${middle ? 'middle' : 'EOF'} ${context} ${part} did not refresh ${key}/${value}`);
      assert.strictEqual(document.getText(), sourceFor(key, value), 'Completion changed the unfinished document.');
    };
    assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('mode', 'create'))));
    await verify('mode', 'create');
    assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('other', 'refresh'))));
    await verify('other', 'refresh');
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await vscode.commands.executeCommand('undo');
    await verify('mode', 'create');
    await vscode.commands.executeCommand('redo');
    await verify('other', 'refresh');
  }
  console.log('C2 EOF and middle unfinished shape keys/values in argument, return, assignment and method; exact candidates, unsaved changes and Undo/Redo passed');
  for (const item of [...existingShapeArrowCases, ...wordMiddleShapeCases]) {
    const source = item.marked.replace('§', ''), offset = item.marked.indexOf('§');
    assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)));
    const deadline = Date.now() + 10_000;
    let labels: string[] = [];
    do {
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
      // Outside PHP, VS Code may aggregate plain word suggestions from its
      // HTML provider. The Core protocol negative remains strictly empty.
      if (item.name.endsWith('HTML')) {
        assert.ok(result?.items.every(candidate => candidate.kind === vscode.CompletionItemKind.Text
          || candidate.kind === vscode.CompletionItemKind.Snippet) ?? true,
        'HTML received a PHP semantic completion instead of plain text suggestions.');
        console.log(`C2 HTML completion aggregation: ${result?.items.length ?? 0} plain text/snippet items; no PHP semantic items`);
      }
      labels = result?.items.filter(candidate => candidate.kind !== vscode.CompletionItemKind.Snippet
        && !(item.name.endsWith('HTML') && candidate.kind === vscode.CompletionItemKind.Text))
        .map(candidate => typeof candidate.label === 'string' ? candidate.label : candidate.label.label) ?? [];
      if (JSON.stringify(labels) === JSON.stringify(item.labels)) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < deadline);
    assert.deepStrictEqual(labels, item.labels, `Existing arrow candidates incorrect: ${item.name}`);
    assert.strictEqual(document.getText(), source, 'Existing arrow query changed the source.');
  }
  console.log('C2 existing array arrows and word-middle literals: all 64 complete/incomplete and conservative negative cases passed');
}

async function verifyUnionShapeCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2UnionShapes.php');
  const sourceFor = (key: string): string => `<?php
/** @param (array{${key}:'create',payload:array{trace:string,x:int},id:int}|array{${key}:'update',payload:array{trace:string,y:string},name:string})|null $options */
function c2UnionSend(?array $options):void{}
function c2UnionKeys():void{c2UnionSend([""]);}
function c2UnionValues():void{c2UnionSend(["${key}"=>""]);}
function c2UnionNested():void{c2UnionSend(["payload"=>[""]]);}
function c2UnionBranch():void{c2UnionSend(["i"]);}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('mode')));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const verify = async (key: string): Promise<void> => {
    for (const [method, token, expected] of [
      ['Keys', '""', [key, 'payload']],
      ['Values', '""', ['"create"', '"update"']],
      ['Nested', '""', ['trace']],
      ['Branch', '"i"', []],
    ] as const) {
      const text = document.getText(), start = text.indexOf(`function c2Union${method}(`);
      const offset = text.indexOf(token, start) + (method === 'Branch' ? 2 : 1);
      let labels: string[] = [];
      const deadline = Date.now() + 10_000;
      do {
        const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
        labels = result?.items.filter(item => item.kind !== vscode.CompletionItemKind.Snippet)
          .map(item => typeof item.label === 'string' ? item.label : item.label.label).sort() ?? [];
        if (JSON.stringify(labels) === JSON.stringify([...expected].sort())) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      } while (Date.now() < deadline);
      assert.deepStrictEqual(labels, [...expected].sort(), `Union shape ${method} did not refresh ${key}`);
    }
  };
  await verify('mode');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('other'));
  assert.ok(await vscode.workspace.applyEdit(edit));
  await verify('other');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo');
  await verify('mode');
  await vscode.commands.executeCommand('redo');
  await verify('other');
  console.log('C2 union shape common keys, literal values, nested keys, branch isolation, nullable contract and Undo/Redo passed');
}

async function verifyBranchValueCompletion(root: vscode.Uri): Promise<void> {
  const uri=vscode.Uri.joinPath(root,'src','Service','C2BranchValues.php');
  const sourceFor=(type: string): string=>{
    const fallback=type==='string'?"'text'":'123';
    const expressions=[`return null??$val;`,`return match(true){true=>$val,default=>${fallback}};`,
      `c2BranchTakesValue(match($val){true=>${fallback},default=>${fallback}});`,
      `c2BranchTakesValue(match(true){$val=>${fallback},default=>${fallback}});`];
    return `<?php function c2BranchTakesValue(${type} $v):void{}
${expressions.map((expression,index)=>`function c2BranchValues${index}():${type}{
$valueFlag=true;$valueText='text';$valueNumber=123;${expression}}`).join('\n')}
function c2BranchNullable(?${type} $valueMaybe,${type} $valueText):${type}{return $val??${fallback};}`;
  };
  await vscode.workspace.fs.writeFile(uri,Buffer.from(sourceFor('string')));
  const document=await vscode.workspace.openTextDocument(uri);await vscode.window.showTextDocument(document);
  const verify=async(type: string): Promise<void>=>{
    const checks=[['null??$val',type==='string'?'$valueText':'$valueNumber'],
      ['true=>$val',type==='string'?'$valueText':'$valueNumber'],
      ['match($val','$valueFlag'],['{$val','$valueFlag'],['return $val??','$valueMaybe']];
    for(const [marker,expected]of checks){
      const offset=document.getText().indexOf(marker!)+marker!.indexOf('$val')+'$val'.length;
      const deadline=Date.now()+10_000;let labels: string[]=[];
      while(Date.now()<deadline){
        const result=await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',uri,document.positionAt(offset),undefined,64);
        labels=result?.items.map(item=>typeof item.label==='string'?item.label:item.label.label)??[];
        const preserved=expected==='$valueMaybe'?['$valueMaybe','$valueText']:['$valueFlag','$valueText','$valueNumber'];
        if(labels[0]===expected&&preserved.every(label=>labels.includes(label)))break;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      assert.strictEqual(labels[0],expected,`Branch completion ${marker} for ${type}: ${labels.slice(0,10).join(',')}`);
      assert.ok((expected==='$valueMaybe'?['$valueMaybe','$valueText']:['$valueFlag','$valueText','$valueNumber']).every(label=>labels.includes(label)));
    }
  };
  await verify('string');
  const edit=new vscode.WorkspaceEdit();edit.replace(uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),sourceFor('int'));
  assert.ok(await vscode.workspace.applyEdit(edit));await verify('int');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo');await verify('string');
  await vscode.commands.executeCommand('redo');await verify('int');
  console.log('C2 coalescing and match value sorting, selector isolation, nullable values and unsaved Undo/Redo passed');
}

async function verifyConditionalCompletion(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ConditionalCompletion.php');
  const sourceFor = (type: string): string => `<?php
function c2Condition(): ${type} {
  $valueText = 'text'; $valueFlag = true; $valueNumber = 123;
  return $val ? ${type === 'string' ? "'yes' : 'no'" : '1 : 2'};
}
function c2Branch(): ${type} {
  $valueText = 'text'; $valueFlag = true; $valueNumber = 123;
  return $valueFlag ? $val : ${type === 'string' ? "'no'" : '2'};
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('string')));
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const verify = async (type: string): Promise<void> => {
    for (const [marker, expected] of [['$val ?', '$valueFlag'], ['$val :', type === 'string' ? '$valueText' : '$valueNumber']]) {
      const deadline = Date.now() + 10_000; let passed = false;
      while (Date.now() < deadline) {
        const offset = document.getText().indexOf(marker!) + '$val'.length;
        const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset), undefined, 64);
        const labels = result?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
        if (labels[0] === expected && ['$valueFlag', '$valueText', '$valueNumber'].every(label => labels.includes(label))) { passed = true; break; }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.ok(passed, `Conditional completion ${marker} did not rank ${expected} for ${type}.`);
    }
  };
  await verify('string');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('int'));
  assert.ok(await vscode.workspace.applyEdit(edit)); await verify('int');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await verify('string');
  await vscode.commands.executeCommand('redo'); await verify('int');
  console.log('C2 conditional condition/value ranking, unsaved return contract and Undo/Redo passed');
}

async function verifyObjectColumnFeedback(root: vscode.Uri, generic = false): Promise<void> {
  const prefix = generic ? 'C2GenericColumn' : 'C2Column';
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', `${prefix}.php`);
  const sourceFor = (type: string): string => `<?php declare(strict_types=1);
${generic ? '/** @template T */ ' : ''}class ${prefix}Row { /** @var ${generic ? 'T' : type} */ public $entry${generic ? '' : ` = ${type === 'string' ? "'text'" : '123'}`}; }
function ${prefix}Int(int $value): void {}
${generic ? `/** @param list<${prefix}Row<${type}>> $rows */` : ''}
function ${prefix}Run(${generic ? 'array $rows' : ''}): void {
  ${generic ? '' : `$rows = [new ${prefix}Row()];`} $column = array_column($rows, 'entry');
  foreach ($column as $value) { ${prefix}Int($value); $value; }
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('string')));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const waitFor = async (type: string): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText(); const offset = text.lastIndexOf('$value;');
      const hover = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, document.positionAt(offset + 2));
      const content = (hover ?? []).flatMap(result => result.contents.map(item =>
        typeof item === 'string' ? item : 'value' in item ? item.value : '')).join('\n');
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset + 4), undefined, 64);
      const variable = completion?.items.find(item => (typeof item.label === 'string' ? item.label : item.label.label) === '$value');
      const diagnostics = vscode.languages.getDiagnostics(uri).filter(item => item.code === 'php.argument.type-mismatch');
      if (content.includes(`$value: ${type}`) && variable?.detail === `$value: ${type}`
        && diagnostics.length === (type === 'string' ? 1 : 0)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Object column did not refresh Hover, completion detail and diagnostics to ${type}.`);
  };
  await waitFor('string');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('int'));
  assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  await waitFor('int');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('undo'); await waitFor('string');
  await vscode.commands.executeCommand('redo'); await waitFor('int');
  console.log(`C2 object column generic=${generic}: scalar type, Hover, completion detail, diagnostics and Undo/Redo passed`);
}

async function verifyStringSplitFeedback(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2StringSplit.php');
  const sourceFor = (expression: string): string => `<?php
function c2Split(string $input): void {
    $parts = ${expression}; if ($parts === false) { return; }
    foreach ($parts as $part) { $part; }
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('explode(",", $input)')));
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const waitFor = async (expected: string): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const text = document.getText();
      const results = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider', uri, document.positionAt(text.lastIndexOf('$part;') + 2));
      const content = (results ?? []).flatMap((result) => result.contents.map((item) =>
        typeof item === 'string' ? item : 'value' in item ? item.value : '')).join('\n');
      if (content.includes(`$part: ${expected}`)) {
        const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
          'vscode.executeCompletionItemProvider', uri, document.positionAt(text.lastIndexOf('$part;') + 4), undefined, 64);
        const variable = completion?.items.find((item) => (typeof item.label === 'string' ? item.label : item.label.label) === '$part');
        if (variable?.detail === `$part: ${expected}`) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`String split foreach Hover did not show ${expected}.`);
  };
  const replace = async (expression: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor(expression));
    assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
  };
  await waitFor('string'); await replace('str_split($input, 2)'); await waitFor('string');
  await replace('[123]'); await waitFor('int');
  await vscode.commands.executeCommand('undo'); await waitFor('string');
  await vscode.commands.executeCommand('redo'); await waitFor('int');
  await replace('preg_split("/,/", $input)'); await waitFor('string');
  await replace('preg_split("/,/", $input, -1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_OFFSET_CAPTURE)');
  await waitFor('array{0: string, 1: int}');
  await vscode.commands.executeCommand('undo'); await waitFor('string');
  await vscode.commands.executeCommand('redo'); await waitFor('array{0: string, 1: int}');
  console.log('C2 string split foreach, unsaved type replacement and Undo/Redo passed');
}

async function verifyParseUrlContractFeedback(root: vscode.Uri): Promise<void> {
  const uri = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ParseUrlContract.php');
  const sourceFor = (component: 'PHP_URL_PORT' | 'PHP_URL_HOST'): string => `<?php
function c2ParseUrl(string $url): void {
    $parts = parse_url($url); $parts;
    $value = parse_url($url, ${component});
    $parts; $value;
}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(sourceFor('PHP_URL_PORT')));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const hover = async (variable: string): Promise<string> => {
    const text = document.getText();
    const results = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', uri, document.positionAt(text.lastIndexOf(variable + ';') + 2));
    return (results ?? []).flatMap((result) => result.contents.map((content) =>
      typeof content === 'string' ? content : 'value' in content ? content.value : '')).join('\n');
  };
  const waitFor = async (expected: string): Promise<void> => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if ((await hover('$value')).includes(expected) && (await hover('$parts')).includes('port?: int')) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`parse_url Hover did not preserve shape and ${expected}: value=${await hover('$value')}; parts=${await hover('$parts')}.`);
  };
  await waitFor('false|int|null');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), sourceFor('PHP_URL_HOST'));
  assert.ok(await vscode.workspace.applyEdit(edit));
  assert.ok(document.isDirty, 'parse_url component changes must remain unsaved.');
  await waitFor('false|null|string');
  await vscode.commands.executeCommand('undo'); await waitFor('false|int|null');
  await vscode.commands.executeCommand('redo'); await waitFor('false|null|string');
  console.log('C2 parse_url shape, unsaved component Hover and Undo/Redo passed');
}

export async function run(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0];
  assert.ok(root, 'C2 diagnostics test requires the Composer fixture.');
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', root.uri).get('indexing.mode'), 'onDemand');
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', root.uri).get('phpVersion'), '8.5');
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load.');
  if (process.env.PHP_COMPANION_TEST_C2_OPEN_SOURCE_PROFILE === '1') {
    const profileIds = ['sohophp.php-companion-symfony', 'sohophp.php-companion-open-source-pack',
      'sohophp.twig-plus', 'redhat.vscode-yaml', 'redhat.vscode-xml', 'xdebug.php-debug',
      'junstyle.php-cs-fixer', 'EditorConfig.EditorConfig', 'eiminsasete.apacheconf-snippets',
      'neilbrayfield.php-docblocker'];
    for (const id of profileIds) assert.ok(vscode.extensions.getExtension(id), `Open Source Pack member ${id} is missing.`);
    const apacheUri = vscode.Uri.joinPath(root.uri, '.htaccess');
    const apacheSource = 'a-force-ht';
    await vscode.workspace.fs.writeFile(apacheUri, Buffer.from(apacheSource));
    const apacheDocument = await vscode.workspace.openTextDocument(apacheUri);
    assert.strictEqual(apacheDocument.languageId, 'apacheconf', 'Apache syntax extension did not claim .htaccess.');
    const apacheEditor = await vscode.window.showTextDocument(apacheDocument);
    const apacheCompletion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', apacheUri, apacheDocument.positionAt(apacheSource.length));
    const forceHttps = apacheCompletion?.items.find((item) => item.kind === vscode.CompletionItemKind.Snippet
      && (typeof item.label === 'string' ? item.label : item.label.label) === 'a-force-https');
    assert.ok(forceHttps, 'Apache Conf Snippets did not offer Force HTTPS in .htaccess.');
    assert.ok(forceHttps.insertText instanceof vscode.SnippetString, 'Force HTTPS did not contain a snippet body.');
    const replacement = forceHttps.range instanceof vscode.Range ? forceHttps.range
      : forceHttps.range?.replacing ?? new vscode.Range(0, 0, 0, apacheSource.length);
    assert.ok(await apacheEditor.insertSnippet(forceHttps.insertText, replacement),
      'Force HTTPS snippet could not be inserted into .htaccess.');
    const insertedApache = apacheDocument.getText();
    assert.ok(insertedApache.startsWith('RewriteEngine on\nRewriteCond %{HTTPS} !on\n')
      && insertedApache.includes('RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]')
      && insertedApache.includes('Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"')
      && !insertedApache.includes(apacheSource),
    `Force HTTPS snippet produced unexpected Apache configuration: ${JSON.stringify(insertedApache)}`);
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(apacheDocument.getText(), apacheSource, 'Undo did not restore the Apache snippet trigger.');
    await vscode.commands.executeCommand('redo');
    assert.strictEqual(apacheDocument.getText(), insertedApache, 'Redo did not restore the Apache configuration.');
    console.log('C2 Open Source Pack Apache snippet: completion, insertion, one Undo/Redo');
    console.log(`C2 Open Source Pack profile loaded Core, Pack metadata, Symfony and 8 external members (${profileIds.length + 1} extensions)`);
  }
  const api = await extension.activate() as { requestLanguageServer?: <T>(method: string, params: unknown) => Promise<T> };
  assert.ok(api.requestLanguageServer, 'SoPHP Core did not expose the test timing request bridge.');
  if (process.env.PHP_COMPANION_TEST_C2_BUILTIN_CONSTRUCTOR_ONLY === '1') {
    await verifyVersionedBuiltinConstructors(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_PROPERTY_RANK_ONLY === '1') {
    await verifyPropertyAssignmentCompletion(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_CALLBACK_ONLY === '1') {
    await verifyCallbackReturnCompletion(root.uri);
    await verifyTrailingCallbackCompletion(root.uri);
    await verifyCallbackCompletionDetails(root.uri);
    await verifyTrailingCallableMembers(root.uri);
    await verifyBranchValueCompletion(root.uri);
    await verifyBranchShapeCompletion(root.uri);
    await verifyUnionShapeCompletion(root.uri);
    await verifyUnfinishedShapeCompletion(root.uri);
    await verifyQuotedPrefixCompletion(root.uri);
    await verifyArrayAccessKeyCompletion(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_ELVIS_ONLY === '1') {
    await verifyElvisCompletion(root.uri);
    await verifyValueCallCompletion(root.uri);
    await verifyMethodValueCallCompletion(root.uri);
    await verifyExactMethodValueCallCompletion(root.uri);
    await verifyArrayMethodValueCallCompletion(root.uri);
    await verifyExpressionMethodValueCallCompletion(root.uri);
    await verifyStaticScopeMethodValueCallCompletion(root.uri);
    await verifyLiteralPrefixMethodValueCallCompletion(root.uri);
    await verifyPostAssignmentLiteralMethodValueCallCompletion(root.uri);
    await verifyCrossFileValueSignatureCompletion(root.uri);
    await verifyObjectColumnFeedback(root.uri);
    await verifyObjectColumnFeedback(root.uri, true);
    await verifyConditionalCompletion(root.uri);
    await verifyOperandCompletion(root.uri);
    await verifyCallbackReturnCompletion(root.uri);
    await verifyTrailingCallbackCompletion(root.uri);
    await verifyCallbackCompletionDetails(root.uri);
    await verifyTrailingCallableMembers(root.uri);
    await verifyBranchValueCompletion(root.uri);
    await verifyBranchShapeCompletion(root.uri);
    await verifyUnionShapeCompletion(root.uri);
    await verifyUnfinishedShapeCompletion(root.uri);
    await verifyQuotedPrefixCompletion(root.uri);
    await verifyArrayAccessKeyCompletion(root.uri);
    await verifyReferenceReturnCompletion(root.uri);
    await verifyOverloadExpectedCompletion(root.uri);
    await verifyGenericExpectedCompletion(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_THIS_ONLY === '1') {
    await verifyThisBindingDiagnostics(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_PARTIAL_WORD_ONLY === '1') {
    await verifyPartialWordVariableDiagnostics(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_ARRAY_FILTER_ONLY === '1') {
    await verifyArrayFilterModeFeedback(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_ARRAY_REDUCE_ONLY === '1') {
    await verifyArrayReduceCarryFeedback(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_ARRAY_WALK_RECURSIVE_ONLY === '1') {
    await verifyArrayWalkRecursiveFeedback(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_LOCAL_STRING_CALLBACK_ONLY === '1') {
    await verifyLocalStringCallbackFeedback(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_STRING_SPLIT_ONLY === '1') {
    await verifyStringSplitFeedback(root.uri);
    return;
  }
  if (process.env.PHP_COMPANION_TEST_C2_PARSE_URL_ONLY === '1') {
    await verifyParseUrlContractFeedback(root.uri);
    return;
  }
  await verifyVersionedBuiltinConstructors(root.uri);
  const missingDelimiterUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'C2MissingDelimiter.php');
  const validDelimiterSource = '<?php function c2MissingDelimiter(): void {}';
  await vscode.workspace.fs.writeFile(missingDelimiterUri, Buffer.from(validDelimiterSource));
  const missingDelimiterDocument = await vscode.workspace.openTextDocument(missingDelimiterUri);
  await vscode.window.showTextDocument(missingDelimiterDocument);
  const missingDelimiterEdit = new vscode.WorkspaceEdit();
  missingDelimiterEdit.replace(missingDelimiterUri,
    new vscode.Range(missingDelimiterDocument.positionAt(0), missingDelimiterDocument.positionAt(validDelimiterSource.length)),
    '<?php function c2MissingDelimiter(: void {}');
  assert.ok(await vscode.workspace.applyEdit(missingDelimiterEdit));
  assert.ok(missingDelimiterDocument.isDirty, 'Missing delimiter input must stay unsaved');
  const missingDelimiterDiagnostics = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(missingDelimiterUri)
    .filter((diagnostic) => diagnostic.source === 'SoPHP' && diagnostic.code === 'php.syntax');
  const missingDelimiterDeadline = Date.now() + 10_000;
  while (Date.now() < missingDelimiterDeadline && missingDelimiterDiagnostics().length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepStrictEqual(missingDelimiterDiagnostics().map((diagnostic) => missingDelimiterDocument.getText(diagnostic.range)), [':'],
    'SoPHP did not locate the missing closing delimiter in the unsaved PHP editor');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(missingDelimiterDocument.getText(), validDelimiterSource);
  const clearDelimiterDeadline = Date.now() + 10_000;
  while (Date.now() < clearDelimiterDeadline && missingDelimiterDiagnostics().length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepStrictEqual(missingDelimiterDiagnostics(), [], 'SoPHP kept the old missing-delimiter error after Undo');
  console.log('C2 missing closing delimiter: unsaved syntax diagnostic and Undo withdrawal');
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ControlFlowDiagnostics.php');
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const expected = ['cleanup();', 'unreachableAfterConditional();', 'unreachableAfterSwitch();',
    'unreachableAfterInfiniteLoop();', 'unreachableAfterInitializedFor();', 'unreachableAfterNeverCall();',
    'unreachableAfterNestedNeverCall();', 'unreachableAfterNeverCondition();', 'unreachableAfterNestedThrow();',
    'unreachableAfterThrowTernary();'];
  const actual = (): string[] => vscode.languages.getDiagnostics(uri)
    .filter((item) => item.source === 'SoPHP' && item.code === 'php.control-flow.unreachable')
    .map((item) => document.getText(item.range));
  const waitForCount = async (count: number): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && actual().length !== count) await new Promise((resolve) => setTimeout(resolve, 50));
  };
  await waitForCount(expected.length);
  assert.deepStrictEqual(actual(), expected, 'Default onDemand omitted proven same-file never calls or reported an unproven call.');
  const signature = 'function stopNow(): never';
  const returnOffset = document.getText().indexOf(signature) + 'function stopNow(): '.length;
  assert.ok(returnOffset >= 'function stopNow(): '.length, 'The fixture lost its native never declaration.');
  const replaceType = async (oldType: string, newType: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(returnOffset), document.positionAt(returnOffset + oldType.length)), newType);
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not change ${oldType} to ${newType} in the unsaved PHP buffer.`);
    assert.ok(document.isDirty, 'The diagnostic test unexpectedly saved the PHP buffer.');
  };
  await replaceType('never', 'void');
  const withoutNever = expected.filter((item) => !item.includes('Never'));
  await waitForCount(withoutNever.length);
  assert.deepStrictEqual(actual(), withoutNever, 'The editor kept unreachable diagnostics after never became void.');
  await replaceType('void', 'never');
  await waitForCount(expected.length);
  assert.deepStrictEqual(actual(), expected, 'The editor did not restore unreachable diagnostics after never returned.');
  const events: Array<{ version: number; count: number; atMs: number }> = [];
  await api.requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const subscription = vscode.languages.onDidChangeDiagnostics((event) => {
    if (event.uris.some((changed) => changed.toString() === uri.toString())) {
      events.push({ version: document.version, count: actual().length, atMs: performance.now() });
    }
  });
  try {
    for (let round = 0; round < 20; round += 1) {
      await replaceType(round % 2 === 0 ? 'never' : 'void', round % 2 === 0 ? 'void' : 'never');
    }
    const finalStarted = performance.now();
    await replaceType('never', 'void');
    const finalVersion = document.version;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !events.some((event) => event.version >= finalVersion && event.count === withoutNever.length)) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(events.some((event) => event.version >= finalVersion && event.count === withoutNever.length),
      'The editor did not publish diagnostics for the final rapid void edit.');
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.deepStrictEqual(actual(), withoutNever, 'The final rapid edit kept an old never diagnostic.');
    assert.ok(!events.some((event) => event.version >= finalVersion && event.count !== 0 && event.count !== withoutNever.length),
      `A stale diagnostic was published after the final rapid edit: ${JSON.stringify(events)}`);
    const cleared = events.find((event) => event.version >= finalVersion && event.count === 0);
    const restored = events.find((event) => event.version >= finalVersion && event.count === withoutNever.length);
    assert.ok(restored);
    const timings = await api.requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
    console.log(`C2 onDemand native never diagnostics: ${JSON.stringify({ sequential: [expected.length, withoutNever.length, expected.length],
      rapidFinal: withoutNever.length, events: events.length, finalVisibleMs: Math.round(restored.atMs - finalStarted),
      clearedMs: cleared && Math.round(cleared.atMs - finalStarted),
      blankMs: cleared && Math.round(restored.atMs - cleared.atMs), serverDiagnosticsMs: timings.diagnostics?.at(-1),
      serverChangeMs: timings.documentChangeDiagnostics?.at(-1), unsaved: document.isDirty })}`);
  } finally {
    subscription.dispose();
  }

  const localUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'LocalArgumentDiagnostics.php');
  const source = `<?php
declare(strict_types=1);
namespace App\\Service;
function takeLocal(int $value): void {}
final class LocalArgumentDiagnostics { public function accept(int $value): void {} }
function inspect(LocalArgumentDiagnostics $local): void { takeLocal('bad'); takeLocal(); $local->accept('bad'); takeLocal(other: 1); takeLocal(value: 1, value: 2); }
`;
  await vscode.workspace.fs.writeFile(localUri, Buffer.from(source));
  const localDocument = await vscode.workspace.openTextDocument(localUri);
  await vscode.window.showTextDocument(localDocument);
  const argumentCodes = (): string[] => vscode.languages.getDiagnostics(localUri)
    .filter((item) => item.source === 'SoPHP' && String(item.code).startsWith('php.argument.'))
    .map((item) => String(item.code)).sort();
  const expectedArguments = ['php.argument.duplicate-named', 'php.argument.missing-required', 'php.argument.type-mismatch',
    'php.argument.type-mismatch', 'php.argument.unknown-named'];
  const argumentDeadline = Date.now() + 20_000;
  while (Date.now() < argumentDeadline && argumentCodes().length !== expectedArguments.length) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepStrictEqual(argumentCodes(), expectedArguments, 'Default onDemand did not show proven same-file argument errors.');
  const repaired = source.replace("takeLocal('bad'); takeLocal(); $local->accept('bad'); takeLocal(other: 1); takeLocal(value: 1, value: 2);",
    'takeLocal(1); takeLocal(2); $local->accept(3); takeLocal(value: 1); takeLocal(value: 2);');
  const repair = new vscode.WorkspaceEdit();
  repair.replace(localUri, new vscode.Range(new vscode.Position(0, 0), localDocument.positionAt(localDocument.getText().length)), repaired);
  assert.ok(await vscode.workspace.applyEdit(repair), 'Could not repair local argument calls in the unsaved buffer.');
  assert.ok(localDocument.isDirty);
  const repairedDeadline = Date.now() + 20_000;
  while (Date.now() < repairedDeadline && argumentCodes().length > 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(argumentCodes(), [], 'Default onDemand kept same-file argument errors after the calls were repaired.');
  console.log('C2 onDemand same-file argument diagnostics: 5 → 0, unsaved');

  const nestedUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NestedArrayFeedback.php');
  const nestedSource = `<?php namespace App\\Service;
function dispatchNested(array $payload, string $mode): void {}
dispatchNested(array('x'));
dispatchNested(payload: array('x'), extra: 'dev');
dispatchNested(array('x'), 'dev');
`;
  await vscode.workspace.fs.writeFile(nestedUri, Buffer.from(nestedSource));
  const nestedDocument = await vscode.workspace.openTextDocument(nestedUri);
  await vscode.window.showTextDocument(nestedDocument);
  const nestedErrors = (): string[] => vscode.languages.getDiagnostics(nestedUri)
    .filter((item) => item.source === 'SoPHP' && (item.code === 'php.argument.missing-required'
      || item.code === 'php.argument.unknown-named'))
    .map((item) => String(item.code)).sort();
  const nestedExpected = ['php.argument.missing-required', 'php.argument.unknown-named'];
  const nestedDeadline = Date.now() + 20_000;
  while (Date.now() < nestedDeadline && nestedErrors().length !== nestedExpected.length)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(nestedErrors(), nestedExpected, 'Default onDemand omitted nested-array argument diagnostics.');
  const nestedHints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
    'vscode.executeInlayHintProvider', nestedUri, new vscode.Range(nestedDocument.positionAt(0),
      nestedDocument.positionAt(nestedDocument.getText().length))) ?? [];
  assert.deepStrictEqual(nestedHints.filter((hint) => nestedDocument.offsetAt(hint.position) >= nestedSource.lastIndexOf('dispatchNested('))
    .map((hint) => hint.label), ['$payload:', '$mode:'], 'The editor omitted parameter hints for the outer nested-array call.');
  const correctedNested = nestedSource.replace("dispatchNested(array('x'));", "dispatchNested(array('x'), 'dev');")
    .replace("extra: 'dev'", "mode: 'dev'");
  const nestedEdit = new vscode.WorkspaceEdit();
  nestedEdit.replace(nestedUri, new vscode.Range(nestedDocument.positionAt(0),
    nestedDocument.positionAt(nestedDocument.getText().length)), correctedNested);
  assert.ok(await vscode.workspace.applyEdit(nestedEdit));
  assert.ok(nestedDocument.isDirty, 'The nested-array diagnostic edit unexpectedly saved the PHP buffer.');
  const nestedCorrectedDeadline = Date.now() + 20_000;
  while (Date.now() < nestedCorrectedDeadline && nestedErrors().length)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(nestedErrors(), [], 'The editor kept nested-array argument diagnostics after unsaved repair.');
  console.log('C2 onDemand nested-array calls: two diagnostics, two parameter hints, unsaved repair clears diagnostics');

  const nestedNamedUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NestedNamedCompletion.php');
  const nestedNamedSource = `<?php namespace App\\Service;
function innerNamed(int $second): int { return $second; }
function outerNamed(int $first, int $second): void {}
outerNamed(innerNamed(second: 1), /* next, ) argument */ se
`;
  await vscode.workspace.fs.writeFile(nestedNamedUri, Buffer.from(nestedNamedSource));
  const nestedNamedDocument = await vscode.workspace.openTextDocument(nestedNamedUri);
  await vscode.window.showTextDocument(nestedNamedDocument);
  const nestedNamedPosition = nestedNamedDocument.positionAt(nestedNamedSource.lastIndexOf(' se\n') + 3);
  const nestedNamedCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', nestedNamedUri, nestedNamedPosition);
  assert.ok(nestedNamedCompletions?.items.some((item) => item.label === 'second:'),
    'The outer second: completion was hidden by the inner second: argument.');
  const nestedNamedHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', nestedNamedUri, nestedNamedPosition);
  assert.ok(nestedNamedHelp?.signatures.some((item) => item.label.includes('outerNamed(')),
    'Signature Help lost the outer call after a nested named argument.');
  assert.strictEqual(nestedNamedHelp?.activeParameter, 1,
    'Signature Help selected the inner parameter instead of the outer second parameter.');
  console.log('C2 nested named arguments: outer completion and Signature Help keep the second parameter');
  const attributedNamedSource = `<?php namespace App\\Service;
function outerNamed(callable $first, int $second): void {}
outerNamed(fn(#[\\SensitiveParameter] int $value): int => $value, se
`;
  const attributedEdit = new vscode.WorkspaceEdit();
  attributedEdit.replace(nestedNamedUri, new vscode.Range(nestedNamedDocument.positionAt(0),
    nestedNamedDocument.positionAt(nestedNamedDocument.getText().length)), attributedNamedSource);
  assert.ok(await vscode.workspace.applyEdit(attributedEdit), 'Could not enter the attributed arrow call.');
  assert.ok(nestedNamedDocument.isDirty, 'The attributed arrow input was unexpectedly saved.');
  const attributedNamedPosition = nestedNamedDocument.positionAt(attributedNamedSource.lastIndexOf(' se\n') + 3);
  const attributedNamedCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', nestedNamedUri, attributedNamedPosition);
  assert.ok(attributedNamedCompletions?.items.some((item) => item.label === 'second:'),
    'The attributed arrow argument hid the outer second: completion.');
  const attributedNamedHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', nestedNamedUri, attributedNamedPosition);
  assert.ok(attributedNamedHelp?.signatures.some((item) => item.label.includes('outerNamed(')),
    'The attributed arrow argument hid the outer Signature Help.');
  assert.strictEqual(attributedNamedHelp?.activeParameter, 1,
    'The attributed arrow argument selected the wrong outer parameter.');
  console.log('C2 attributed arrow input: unsaved outer named completion and Signature Help use second');

  const remainingUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'RemainingNamedSignature.php');
  const remainingSource = `<?php namespace App\\Service;
function configure(string $host, int $port, bool $tls): void {}
configure(tls: true, `;
  await vscode.workspace.fs.writeFile(remainingUri, Buffer.from(remainingSource));
  const remainingDocument = await vscode.workspace.openTextDocument(remainingUri);
  await vscode.window.showTextDocument(remainingDocument);
  const remainingHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', remainingUri, remainingDocument.positionAt(remainingSource.length));
  assert.ok(remainingHelp?.signatures.some((item) => item.label.includes('configure(')),
    'The editor lost the function signature after a named argument.');
  assert.strictEqual(remainingHelp?.activeParameter, 0,
    'The editor highlighted $port instead of the first unused $host parameter.');
  const remainingNames = async (): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', remainingUri,
    remainingDocument.positionAt(remainingDocument.getText().length)))?.items
    .map((item) => String(item.label)).filter((label) => ['host:', 'port:', 'tls:'].includes(label)) ?? [];
  assert.deepStrictEqual(await remainingNames(), ['host:', 'port:'],
    'The editor offered a named argument that was already provided.');
  const mixedSource = remainingSource.replace('tls: true, ', '"local", tls: true, ');
  const mixedEdit = new vscode.WorkspaceEdit();
  mixedEdit.replace(remainingUri, new vscode.Range(new vscode.Position(0, 0),
    remainingDocument.positionAt(remainingDocument.getText().length)), mixedSource);
  assert.ok(await vscode.workspace.applyEdit(mixedEdit));
  assert.ok(remainingDocument.isDirty, 'The mixed argument update unexpectedly saved the PHP buffer.');
  assert.deepStrictEqual(await remainingNames(), ['port:'],
    'The editor offered a positional parameter again as a named argument.');
  console.log('C2 named arguments: Signature Help and completion skip filled parameters after unsaved mixed arguments');

  const unpackedUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'UnpackedNamedSignature.php');
  const unpackedSource = `<?php namespace App\\Service;
function dynamicArguments(): array { return []; }
function unpackedConfigure(string $host, int $port, bool $tls): void {}
$args = dynamicArguments(); unpackedConfigure(...$args, ho`;
  await vscode.workspace.fs.writeFile(unpackedUri, Buffer.from(unpackedSource));
  const unpackedDocument = await vscode.workspace.openTextDocument(unpackedUri);
  await vscode.window.showTextDocument(unpackedDocument);
  const unpackedPosition = unpackedDocument.positionAt(unpackedSource.length);
  const unpackedHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', unpackedUri, unpackedPosition);
  assert.ok(!unpackedHelp?.signatures.some((item) => item.label.includes('unpackedConfigure(')),
    'The editor highlighted a parameter whose position is unknown after dynamic unpacking.');
  const unpackedCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', unpackedUri, unpackedPosition);
  assert.ok(!unpackedCompletions?.items.some((item) => ['host:', 'port:', 'tls:'].includes(String(item.label))),
    'The editor suggested a named parameter that may already be filled by dynamic unpacking.');
  console.log('C2 dynamic argument unpack: uncertain signature highlight and named completions suppressed');

  const literalUnpackedUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'LiteralUnpackedNamedSignature.php');
  const literalUnpackedSource = `<?php namespace App\\Service;
function literalUnpackedConfigure(string $host, int $port, bool $tls): void {}
literalUnpackedConfigure(...['local', 80], t`;
  await vscode.workspace.fs.writeFile(literalUnpackedUri, Buffer.from(literalUnpackedSource));
  const literalUnpackedDocument = await vscode.workspace.openTextDocument(literalUnpackedUri);
  await vscode.window.showTextDocument(literalUnpackedDocument);
  const literalUnpackedPosition = literalUnpackedDocument.positionAt(literalUnpackedSource.length);
  const literalUnpackedHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', literalUnpackedUri, literalUnpackedPosition);
  assert.ok(literalUnpackedHelp?.signatures.some((item) => item.label.includes('literalUnpackedConfigure(')));
  assert.strictEqual(literalUnpackedHelp.activeParameter, 2);
  const literalUnpackedCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', literalUnpackedUri, literalUnpackedPosition);
  assert.ok(literalUnpackedCompletions?.items.some((item) => String(item.label) === 'tls:'),
    'The editor did not suggest the remaining parameter after a literal unpack.');
  console.log('C2 literal argument unpack: signature and named completion follow known array entries');

  const invalidUnpackUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'InvalidLiteralUnpack.php');
  const invalidUnpackSource = `<?php namespace App\\Service;
function literalOrder(string $host, int $port, bool $tls): void {}
literalOrder(...['port' => 80, 'local'], tls: true);`;
  await vscode.workspace.fs.writeFile(invalidUnpackUri, Buffer.from(invalidUnpackSource));
  const invalidUnpackDocument = await vscode.workspace.openTextDocument(invalidUnpackUri);
  await vscode.window.showTextDocument(invalidUnpackDocument);
  const unpackOrderDiagnostic = (): vscode.Diagnostic | undefined => vscode.languages.getDiagnostics(invalidUnpackUri)
    .find((diagnostic) => diagnostic.code === 'php.argument.positional-after-named');
  const waitForUnpackOrder = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && Boolean(unpackOrderDiagnostic()) !== expected) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.strictEqual(Boolean(unpackOrderDiagnostic()), expected,
      'The editor did not update the literal unpack argument-order diagnostic.');
  };
  await waitForUnpackOrder(true);
  assert.strictEqual(invalidUnpackDocument.getText(unpackOrderDiagnostic()!.range), "'local'",
    'The editor did not highlight the positional array entry after a named entry.');
  const validUnpackEdit = new vscode.WorkspaceEdit();
  validUnpackEdit.replace(invalidUnpackUri, new vscode.Range(new vscode.Position(0, 0),
    invalidUnpackDocument.positionAt(invalidUnpackDocument.getText().length)),
  invalidUnpackSource.replace("'port' => 80, 'local'", "'local', 'port' => 80"));
  assert.ok(await vscode.workspace.applyEdit(validUnpackEdit));
  assert.ok(invalidUnpackDocument.isDirty);
  await waitForUnpackOrder(false);
  console.log('C2 literal argument unpack: invalid order diagnostic appears and clears after an unsaved repair');

  const documentedOverloadUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'MagicCommentOverload.php');
  const documentedOverloadSource = `<?php namespace App\\Service;
class C2LocatedUser {} class C2LocatedOther {}
/** @method C2LocatedUser locate(int $id)
 * @method C2LocatedOther locate(string $slug) */ class C2MagicModel {}
function inspectC2Magic(C2MagicModel $model): void { $model->locate(/* hint, ) */ id: 1); }
`;
  await vscode.workspace.fs.writeFile(documentedOverloadUri, Buffer.from(documentedOverloadSource));
  const documentedOverloadDocument = await vscode.workspace.openTextDocument(documentedOverloadUri);
  await vscode.window.showTextDocument(documentedOverloadDocument);
  const documentedOverloadPosition = documentedOverloadDocument.positionAt(
    documentedOverloadSource.indexOf('id: 1') + 'id: 1'.length);
  const documentedOverloadHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', documentedOverloadUri, documentedOverloadPosition);
  assert.deepStrictEqual(documentedOverloadHelp?.signatures.map((item) => item.label),
    ['locate(int $id): C2LocatedUser'], 'An argument comment brought back the unrelated documented overload.');
  console.log('C2 documented overload: punctuation in argument comment keeps the matching signature');

  const triviaSignatureUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'SignatureTrivia.php');
  const triviaSignatureSource = `<?php namespace App\\Service;
function outerTrivia(int $first, int $second): void {}
$text = "outerTrivia(se rest"; // outerTrivia(se rest
outerTrivia(1, se
`;
  await vscode.workspace.fs.writeFile(triviaSignatureUri, Buffer.from(triviaSignatureSource));
  const triviaSignatureDocument = await vscode.workspace.openTextDocument(triviaSignatureUri);
  await vscode.window.showTextDocument(triviaSignatureDocument);
  const declarationHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', triviaSignatureUri,
    triviaSignatureDocument.positionAt(triviaSignatureSource.indexOf('outerTrivia(') + 'outerTrivia('.length));
  assert.ok(!declarationHelp?.signatures.some((item) => item.label.includes('outerTrivia(')),
    'A call signature appeared while editing the function declaration.');
  for (const marker of ['"outerTrivia(se rest', '// outerTrivia(se rest']) {
    const offset = triviaSignatureSource.indexOf(marker) + marker.indexOf('se') + 2;
    const ghost = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', triviaSignatureUri, triviaSignatureDocument.positionAt(offset));
    assert.ok(!ghost?.signatures.some((item) => item.label.includes('outerTrivia(')),
      'A PHP signature appeared inside a string or comment.');
  }
  const realTrivia = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', triviaSignatureUri,
    triviaSignatureDocument.positionAt(triviaSignatureSource.lastIndexOf(' se\n') + 3));
  assert.ok(realTrivia?.signatures.some((item) => item.label.includes('outerTrivia(')),
    'Suppressing text in trivia also hid the real PHP call.');
  console.log('C2 signature context: no ghost hints in declarations or text, real call remains available');

  const neverArrayUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NestedArrayNever.php');
  const neverArraySource = `<?php namespace App\\Service;
function stopNested(array $payload): never { throw new \\Exception(); }
function ordinaryNested(array $payload): void {}
function afterStopNested(): void {}
function afterOrdinaryNested(): void {}
function runStopNested(): void { stopNested(array('x')); afterStopNested(); }
function runOrdinaryNested(): void { ordinaryNested(array('x')); afterOrdinaryNested(); }
`;
  await vscode.workspace.fs.writeFile(neverArrayUri, Buffer.from(neverArraySource));
  const neverArrayDocument = await vscode.workspace.openTextDocument(neverArrayUri);
  await vscode.window.showTextDocument(neverArrayDocument);
  const neverArrayUnreachable = (): string[] => vscode.languages.getDiagnostics(neverArrayUri)
    .filter((item) => item.source === 'SoPHP' && item.code === 'php.control-flow.unreachable')
    .map((item) => neverArrayDocument.getText(item.range));
  const neverArrayDeadline = Date.now() + 20_000;
  while (Date.now() < neverArrayDeadline && neverArrayUnreachable().length !== 1)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(neverArrayUnreachable(), ['afterStopNested();'],
    'Default onDemand missed the outer never call or marked the ordinary call unreachable.');
  console.log('C2 onDemand nested-array never call: unreachable after native never only');

  const methodUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'CrossFileLiteralService.php');
  const methodConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'CrossFileLiteralConsumer.php');
  const methodSource = `<?php namespace App\\Service;
final class CrossFileLiteralService { public function accept(int $value): void {} }
`;
  const methodConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function inspectCrossFileLiteral(CrossFileLiteralService $service): void { $service->accept('bad'); }
`;
  await vscode.workspace.fs.writeFile(methodUri, Buffer.from(methodSource));
  await vscode.workspace.fs.writeFile(methodConsumerUri, Buffer.from(methodConsumerSource));
  const methodDocument = await vscode.workspace.openTextDocument(methodUri);
  const methodConsumerDocument = await vscode.workspace.openTextDocument(methodConsumerUri);
  await vscode.window.showTextDocument(methodConsumerDocument);
  const crossFileMismatch = (): boolean => vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch');
  const waitForMismatch = async (expected: boolean): Promise<number> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && crossFileMismatch() !== expected) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(crossFileMismatch(), expected, `C2 cross-file literal mismatch did not become ${expected}.`);
    const observedAt = performance.now();
    const stableUntil = Date.now() + 150;
    while (Date.now() < stableUntil) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.strictEqual(crossFileMismatch(), expected, 'C2 cross-file literal diagnostic flashed an older result.');
    }
    return observedAt;
  };
  await waitForMismatch(true);
  const interpolatedConsumerSource = methodConsumerSource.replace("$service->accept('bad');",
    '$service->accept("hello {$dynamic}");').replace('CrossFileLiteralService $service)',
      'CrossFileLiteralService $service, string $dynamic)');
  const replaceCrossFileConsumer = async (source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      methodConsumerDocument.positionAt(methodConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
  };
  await replaceCrossFileConsumer(interpolatedConsumerSource);
  const interpolationDeadline = Date.now() + 20_000;
  while (Date.now() < interpolationDeadline && !vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch'
      && methodConsumerDocument.getText(item.range) === '"hello {$dynamic}"'))
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch'
      && methodConsumerDocument.getText(item.range) === '"hello {$dynamic}"'),
  'Default onDemand did not diagnose the complete interpolated string as string.');
  await replaceCrossFileConsumer(interpolatedConsumerSource.replace('declare(strict_types=1); ', ''));
  await waitForMismatch(false);
  const localInterpolatedSource = methodConsumerSource.replace("$service->accept('bad');",
    '$text = "hello {$dynamic}"; $service->accept($text);').replace('CrossFileLiteralService $service)',
      'CrossFileLiteralService $service, string $dynamic)');
  await replaceCrossFileConsumer(localInterpolatedSource);
  const localInterpolationDeadline = Date.now() + 20_000;
  while (Date.now() < localInterpolationDeadline && !vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch'
      && methodConsumerDocument.getText(item.range) === '$text'))
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch'
      && methodConsumerDocument.getText(item.range) === '$text'),
  'Default onDemand lost the interpolated string type after a local assignment.');
  await replaceCrossFileConsumer(localInterpolatedSource.replace('$service->accept($text);', '$text = 42; $service->accept($text);'));
  await waitForMismatch(false);
  await replaceCrossFileConsumer(methodConsumerSource);
  await waitForMismatch(true);
  console.log('C2 interpolated string argument: direct/local type, strict mismatch, weak coercion, unsaved restore');
  const changeMethodDeclaration = async (from: string, to: string, expected: boolean): Promise<void> => {
    const offset = methodDocument.getText().indexOf(from);
    assert.ok(offset >= 0, `Missing method declaration text ${from}.`);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodUri, new vscode.Range(methodDocument.positionAt(offset), methodDocument.positionAt(offset + from.length)), to);
    assert.ok(await vscode.workspace.applyEdit(edit));
    await waitForMismatch(expected);
  };
  await changeMethodDeclaration('final class CrossFileLiteralService', 'class CrossFileLiteralService', false);
  await changeMethodDeclaration('public function accept', 'final public function accept', true);
  await changeMethodDeclaration('final public function accept', 'public function accept', false);
  const exactConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ExactReceiverConsumer.php');
  const exactConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function inspectExactReceiver(): void { $service = new CrossFileLiteralService(); $other = 1; $service->accept('bad'); }
`;
  await vscode.workspace.fs.writeFile(exactConsumerUri, Buffer.from(exactConsumerSource));
  const exactConsumerDocument = await vscode.workspace.openTextDocument(exactConsumerUri);
  await vscode.window.showTextDocument(exactConsumerDocument);
  const exactMismatch = (): boolean => vscode.languages.getDiagnostics(exactConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch');
  const waitForExactMismatch = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && exactMismatch() !== expected) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(exactMismatch(), expected, `C2 exact receiver mismatch did not become ${expected}.`);
  };
  await waitForExactMismatch(true);
  const changeExactConsumer = async (source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(exactConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      exactConsumerDocument.positionAt(exactConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
  };
  await changeExactConsumer(exactConsumerSource.replace('$other = 1;', 'change($service);'));
  await waitForExactMismatch(false);
  await changeExactConsumer(exactConsumerSource);
  await waitForExactMismatch(true);
  await changeMethodDeclaration('public function accept', 'final public function accept', true);
  console.log('C2 onDemand exact receiver diagnostic: final class → open class → final method → exact new receiver; exact receiver has → no → has');
  const editType = async (from: string, to: string): Promise<number> => {
    const offset = methodDocument.getText().indexOf(from);
    assert.ok(offset >= 0, `Missing cross-file method type ${from}.`);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodUri, new vscode.Range(methodDocument.positionAt(offset), methodDocument.positionAt(offset + from.length)), to);
    const started = performance.now();
    assert.ok(await vscode.workspace.applyEdit(edit));
    assert.ok(methodDocument.isDirty, 'The cross-file declaration was unexpectedly saved.');
    const observedAt = await waitForMismatch(to.startsWith('int '));
    return Math.round(observedAt - started);
  };
  const removedMs = await editType('int $value', 'string $value');
  const signatureAt = methodConsumerDocument.positionAt(methodConsumerSource.indexOf("'bad'") + 2);
  const methodSignature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', methodConsumerUri, signatureAt);
  assert.ok(methodSignature?.signatures.some((item) => item.label.includes('accept(string $value): void')),
    'Signature Help did not use the edited cross-file declaration.');
  const restoredMs = await editType('string $value', 'int $value');
  console.log(`C2 onDemand cross-file literal diagnostic: ${JSON.stringify({ visible: [true, false, true],
    removedMs, restoredMs, unsaved: methodDocument.isDirty })}`);

  const replaceCrossFileCall = async (argument: string): Promise<void> => {
    const source = methodConsumerSource.replace("'bad'", argument);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      methodConsumerDocument.positionAt(methodConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
  };
  const waitForCrossFileArgument = async (code: string, expected: boolean): Promise<void> => {
    const hasDiagnostic = (): boolean => vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
      item.source === 'SoPHP' && item.code === code);
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && hasDiagnostic() !== expected) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(hasDiagnostic(), expected, `C2 cross-file ${code} did not become ${expected}.`);
  };
  await replaceCrossFileCall('wrong: 1');
  await waitForCrossFileArgument('php.argument.unknown-named', true);
  await replaceCrossFileCall('value: 1');
  await waitForCrossFileArgument('php.argument.unknown-named', false);
  await replaceCrossFileCall('');
  await waitForCrossFileArgument('php.argument.missing-required', true);
  await changeMethodDeclaration('int $value', 'int $value = 0', false);
  await waitForCrossFileArgument('php.argument.missing-required', false);
  await changeMethodDeclaration('int $value = 0', 'int $value', false);
  await waitForCrossFileArgument('php.argument.missing-required', true);
  await replaceCrossFileCall("'bad'");
  await waitForCrossFileArgument('php.argument.missing-required', false);
  await waitForMismatch(true);
  console.log('C2 onDemand cross-file named and missing arguments: wrong → corrected; missing → optional → required; unsaved');

  await editType('int $value', 'string $value');
  const localConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function inspectCrossFileLiteral(CrossFileLiteralService $service): void { $value = 'bad'; $other = 1; $service->accept($value); }
`;
  const replaceConsumer = async (source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      methodConsumerDocument.positionAt(methodConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit), 'Could not change the cross-file consumer buffer.');
    assert.ok(methodConsumerDocument.isDirty, 'The cross-file consumer was unexpectedly saved.');
  };
  await replaceConsumer(localConsumerSource);
  await waitForMismatch(false);
  const localRestoredMs = await editType('string $value', 'int $value');
  const literalFixed = localConsumerSource.replace("$value = 'bad'", '$value = 1');
  await replaceConsumer(literalFixed);
  await waitForMismatch(false);
  await replaceConsumer(localConsumerSource);
  await waitForMismatch(true);
  const unknownConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function change(string &$value): void { $value = 'bad'; }
function inspectCrossFileLiteral(CrossFileLiteralService $service): void { $value = 'bad'; change($value); $service->accept($value); }
`;
  await replaceConsumer(unknownConsumerSource);
  await waitForMismatch(false);
  console.log(`C2 onDemand cross-file local literal diagnostic: ${JSON.stringify({ visible: [false, true, false, true, false],
    restoredMs: localRestoredMs, declarationUnsaved: methodDocument.isDirty, consumerUnsaved: methodConsumerDocument.isDirty })}`);

  const returnUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NativeReturnService.php');
  const returnConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NativeReturnConsumer.php');
  const returnSource = `<?php namespace App\\Service;
final class NativeReturnService { public function accept(int $value): void {} public function text(): string { return 'bad'; } }
`;
  const returnConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function inspectNativeReturn(NativeReturnService $service): void { $service->accept($service->text()); }
`;
  await vscode.workspace.fs.writeFile(returnUri, Buffer.from(returnSource));
  await vscode.workspace.fs.writeFile(returnConsumerUri, Buffer.from(returnConsumerSource));
  const returnDocument = await vscode.workspace.openTextDocument(returnUri);
  const returnConsumerDocument = await vscode.workspace.openTextDocument(returnConsumerUri);
  await vscode.window.showTextDocument(returnConsumerDocument);
  const returnMismatch = (): boolean => vscode.languages.getDiagnostics(returnConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch');
  const waitForReturnMismatch = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && returnMismatch() !== expected) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(returnMismatch(), expected, `C2 native return mismatch did not become ${expected}.`);
  };
  const changeReturnSource = async (source: string, expected: boolean): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(returnUri, new vscode.Range(new vscode.Position(0, 0),
      returnDocument.positionAt(returnDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
    await waitForReturnMismatch(expected);
  };
  await waitForReturnMismatch(true);
  await changeReturnSource(returnSource.replace("text(): string { return 'bad';", 'text(): int { return 42;'), false);
  await changeReturnSource(returnSource, true);
  await changeReturnSource(returnSource.replace('public function text(): string', '/** @return string */ public function text()'), false);
  console.log('C2 onDemand cross-file native return argument: string → int → string → PHPDoc-only, diagnostic has → no → has → no');
  const localReturnConsumer = returnConsumerSource.replace('$service->accept($service->text());',
    '$value = $service->text(); $other = 1; $service->accept($value);');
  const changeReturnConsumer = async (source: string, expected: boolean): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(returnConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      returnConsumerDocument.positionAt(returnConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
    await waitForReturnMismatch(expected);
  };
  await changeReturnConsumer(localReturnConsumer, false);
  await changeReturnSource(returnSource, true);
  await changeReturnConsumer(localReturnConsumer.replace('$other = 1;', 'change($value);'), false);
  await changeReturnConsumer(localReturnConsumer, true);
  const localValueHover = async (expected: string): Promise<void> => {
    const offset = returnConsumerDocument.getText().lastIndexOf('$value);') + 2;
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', returnConsumerUri, returnConsumerDocument.positionAt(offset)) ?? [];
    assert.ok(hovers.some((hover) => hover.contents.some((item) =>
      (typeof item === 'string' ? item : item.value).includes(`$value: ${expected}`))),
    `C2 local value Hover did not show ${expected}.`);
  };
  await localValueHover('string');
  await changeReturnSource(returnSource.replace("text(): string { return 'bad';", 'text(): int { return 42;'), false);
  await localValueHover('int');
  await changeReturnSource(returnSource, true);
  console.log('C2 onDemand local native return argument: PHPDoc-only → native string → possible mutation → restored, diagnostic no → has → no → has');

  const aliasRealUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'PathAliasRecord.php');
  const aliasLink = vscode.Uri.joinPath(root.uri, 'alias');
  const aliasUri = vscode.Uri.joinPath(aliasLink, 'Service', 'PathAliasRecord.php');
  const aliasConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'PathAliasConsumer.php');
  const aliasDiskSource = '<?php namespace App\\Service; class PathAliasRecord { public function diskOnly(): void {} }';
  const aliasRealSource = '<?php namespace App\\Service; class PathAliasRecord { public function realOnly(): void {} public function inspect(): void { $this->realOnly(); } }';
  const aliasLinkSource = '<?php namespace App\\Service; class PathAliasRecord { public function linkedOnly(): void {} }';
  const aliasConsumerSource = '<?php namespace App\\Service; function inspectPathAlias(PathAliasRecord $record): void { $record->; }';
  await vscode.workspace.fs.writeFile(aliasRealUri, Buffer.from(aliasDiskSource));
  await vscode.workspace.fs.writeFile(aliasConsumerUri, Buffer.from(aliasConsumerSource));
  await symlink(vscode.Uri.joinPath(root.uri, 'src').fsPath, aliasLink.fsPath, process.platform === 'win32' ? 'junction' : 'dir');
  const aliasRealDocument = await vscode.workspace.openTextDocument(aliasRealUri);
  await vscode.window.showTextDocument(aliasRealDocument);
  const replaceAliasSource = async (target: vscode.Uri, open: vscode.TextDocument, source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(target, new vscode.Range(new vscode.Position(0, 0), open.positionAt(open.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not edit ${target.toString()}.`);
    assert.ok(open.isDirty, `The path alias buffer ${target.toString()} was unexpectedly saved.`);
  };
  await replaceAliasSource(aliasRealUri, aliasRealDocument, aliasRealSource);
  const aliasDocument = await vscode.workspace.openTextDocument(aliasUri);
  await vscode.window.showTextDocument(aliasDocument);
  await replaceAliasSource(aliasUri, aliasDocument, aliasLinkSource);
  const aliasConsumerDocument = await vscode.workspace.openTextDocument(aliasConsumerUri);
  await vscode.window.showTextDocument(aliasConsumerDocument);
  const projectAliasCompletions = async (): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', aliasConsumerUri,
    aliasConsumerDocument.positionAt(aliasConsumerSource.indexOf('$record->') + '$record->'.length)))?.items.map((item) => String(item.label)) ?? [];
  const aliasDeadline = Date.now() + 20_000;
  while (Date.now() < aliasDeadline && !(await projectAliasCompletions()).includes('linkedOnly')) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok((await projectAliasCompletions()).includes('linkedOnly'), 'The latest linked tab did not own project facts.');
  assert.ok(!(await projectAliasCompletions()).includes('realOnly'), 'The older real-path tab leaked into project facts.');
  const localAliasCall = aliasRealSource.indexOf('$this->realOnly') + '$this->'.length;
  const aliasHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', aliasRealUri, aliasRealDocument.positionAt(localAliasCall + 2)) ?? [];
  assert.ok(aliasHovers.some((hover) => hover.contents.some((item) => (typeof item === 'string' ? item : item.value).includes('realOnly'))),
    'The non-owner tab lost Hover for its unsaved local method.');
  const aliasLocalCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', aliasRealUri, aliasRealDocument.positionAt(localAliasCall));
  assert.ok(aliasLocalCompletions?.items.some((item) => String(item.label) === 'realOnly'),
    'The non-owner tab lost its own local member completion.');
  const aliasDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', aliasRealUri, aliasRealDocument.positionAt(localAliasCall + 2)) ?? [];
  assert.ok(aliasDefinitions.some((location) => location.uri.toString() === aliasRealUri.toString()
    && aliasRealDocument.getText(location.range) === 'realOnly'), 'The non-owner tab did not navigate to its own declaration.');
  const aliasSignatures = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', aliasRealUri,
    aliasRealDocument.positionAt(aliasRealSource.indexOf('$this->realOnly(') + '$this->realOnly('.length));
  assert.ok(aliasSignatures?.signatures.some((signature) => signature.label.includes('realOnly')),
    'The non-owner tab lost Signature Help for its unsaved local method.');
  console.log('C2 onDemand dual-path local queries: project uses linkedOnly; real tab Hover, Completion, Definition, Signature Help use realOnly');
  const aliasHoverMs: number[] = [];
  for (let round = 0; round < 10; round += 1) {
    const latest = round % 2 === 0;
    const expectedProject = latest ? 'linkedLatestOnly' : 'linkedOnly';
    await replaceAliasSource(aliasUri, aliasDocument, latest ? aliasLinkSource.replace('linkedOnly', expectedProject) : aliasLinkSource);
    const projectDeadline = Date.now() + 20_000;
    while (Date.now() < projectDeadline && !(await projectAliasCompletions()).includes(expectedProject)) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const projectLabels = await projectAliasCompletions();
    assert.ok(projectLabels.includes(expectedProject) && !projectLabels.includes('realOnly'),
      `Project completion lost the current path-alias owner: ${JSON.stringify(projectLabels)}`);
    const started = performance.now();
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', aliasRealUri, aliasRealDocument.positionAt(localAliasCall + 2)) ?? [];
    aliasHoverMs.push(performance.now() - started);
    assert.ok(hovers.some((hover) => hover.contents.some((item) => (typeof item === 'string' ? item : item.value).includes('realOnly'))),
      'The non-owner tab lost its own method after a linked-tab edit.');
  }
  const sortedAliasHoverMs = [...aliasHoverMs].sort((left, right) => left - right);
  console.log(`C2 onDemand dual-path edits: ${JSON.stringify({ rounds: aliasHoverMs.length,
    hoverP95Ms: Math.round(sortedAliasHoverMs[Math.floor((sortedAliasHoverMs.length - 1) * 0.95)]!),
    declarationUnsaved: aliasDocument.isDirty && aliasRealDocument.isDirty })}`);

  const recordsUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'CrossFileDocRecords.php');
  const consumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'CrossFileDocConsumer.php');
  const recordsSource = `<?php namespace App\\Service;
class CrossFileAlphaDoc { public function crossAlpha(): void {} }
class CrossFileBetaDoc { public function crossBeta(): void {} }
/** @return list<CrossFileAlphaDoc> */ function crossFileRecords(): array { return []; }
`;
  const consumerSource = `<?php namespace App\\Service;
function inspectCrossFileDoc(): void { foreach (crossFileRecords() as $item) { $item->cross; $item->crossAlpha(); } }
`;
  await vscode.workspace.fs.writeFile(recordsUri, Buffer.from(recordsSource));
  await vscode.workspace.fs.writeFile(consumerUri, Buffer.from(consumerSource));
  const recordsDocument = await vscode.workspace.openTextDocument(recordsUri);
  const consumerDocument = await vscode.workspace.openTextDocument(consumerUri);
  await vscode.window.showTextDocument(consumerDocument);
  const completionPosition = consumerDocument.positionAt(consumerSource.indexOf('$item->cross;') + '$item->cross'.length);
  const callPosition = consumerDocument.positionAt(consumerSource.indexOf('$item->crossAlpha();') + '$item->cross'.length);
  const methods = async (): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', consumerUri, completionPosition,
  ))?.items.filter((item) => item.kind === vscode.CompletionItemKind.Method).map((item) => String(item.label)) ?? [];
  const waitForMethod = async (expected: string, rejected: string): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const actual = await methods();
      if (actual.includes(expected) && !actual.includes(rejected)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Cross-file PHPDoc methods did not update: ${JSON.stringify(await methods())}`);
  };
  await waitForMethod('crossAlpha', 'crossBeta');
  const initialDefinition = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri, callPosition) ?? [];
  assert.ok(initialDefinition.some((location) => location.uri.toString() === recordsUri.toString()
    && recordsDocument.getText(location.range).includes('crossAlpha')));
  const typeStart = recordsDocument.getText().indexOf('list<CrossFileAlphaDoc>');
  assert.ok(typeStart >= 0);
  const typeEdit = new vscode.WorkspaceEdit();
  typeEdit.replace(recordsUri, new vscode.Range(recordsDocument.positionAt(typeStart),
    recordsDocument.positionAt(typeStart + 'list<CrossFileAlphaDoc>'.length)), 'list<CrossFileBetaDoc>');
  assert.ok(await vscode.workspace.applyEdit(typeEdit));
  assert.ok(recordsDocument.isDirty);
  await waitForMethod('crossBeta', 'crossAlpha');
  const staleDefinition = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri, callPosition) ?? [];
  assert.ok(!staleDefinition.some((location) => location.uri.toString() === recordsUri.toString()
    && recordsDocument.getText(location.range).includes('crossAlpha')));
  console.log('C2 onDemand cross-file PHPDoc return: Alpha → Beta, completion and definition updated from unsaved source');

  const shapeAlphaUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ShapeAlpha.php');
  const shapeBetaUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ShapeBeta.php');
  const shapeFactoryUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ShapeFactory.php');
  const shapeConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ShapeConsumer.php');
  const shapeFactorySource = `<?php namespace App\\Service;
class ShapeFactory { /** @return array{item: ShapeAlpha}|array{item: ShapeBeta} */ public function choose(): array { return []; } }`;
  const shapeConsumerSource = `<?php namespace App\\Service;
function inspectShape(ShapeFactory $factory): void {
  $row = $factory->choose(); $item = $row['item']; $item->; $item->com; $item->alpha; $item->common();
}`;
  await vscode.workspace.fs.writeFile(shapeAlphaUri, Buffer.from('<?php namespace App\\Service; class ShapeAlpha { public function common(): void {} public function alphaOnly(): void {} }'));
  await vscode.workspace.fs.writeFile(shapeBetaUri, Buffer.from('<?php namespace App\\Service; class ShapeBeta { public function common(): void {} public function betaOnly(): void {} }'));
  await vscode.workspace.fs.writeFile(shapeFactoryUri, Buffer.from(shapeFactorySource));
  await vscode.workspace.fs.writeFile(shapeConsumerUri, Buffer.from(shapeConsumerSource));
  const shapeFactoryDocument = await vscode.workspace.openTextDocument(shapeFactoryUri);
  const shapeConsumerDocument = await vscode.workspace.openTextDocument(shapeConsumerUri);
  await vscode.window.showTextDocument(shapeConsumerDocument);
  const shapeMethods = async (marker: string): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', shapeConsumerUri,
    shapeConsumerDocument.positionAt(shapeConsumerSource.indexOf(marker) + marker.length),
  ))?.items.filter((item) => item.kind === vscode.CompletionItemKind.Method).map((item) => String(item.label)) ?? [];
  const shapeDeadline = Date.now() + 20_000;
  while (Date.now() < shapeDeadline && !(await shapeMethods('$item->')).includes('common'))
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok((await shapeMethods('$item->')).includes('common'), 'Cold onDemand bare arrow omitted the shared member.');
  assert.ok((await shapeMethods('$item->com')).includes('common'), 'Cold onDemand union shape omitted the shared member.');
  assert.ok(!(await shapeMethods('$item->alpha')).includes('alphaOnly'), 'Union shape exposed a branch-only member.');
  const shapeDefinitionPosition = shapeConsumerDocument.positionAt(shapeConsumerSource.indexOf('$item->common()') + '$item->co'.length);
  const shapeDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', shapeConsumerUri, shapeDefinitionPosition) ?? [];
  assert.deepStrictEqual(shapeDefinitions.map((item) => item.uri.toString()).sort(),
    [shapeAlphaUri.toString(), shapeBetaUri.toString()].sort());
  const shapeReturn = 'array{item: ShapeAlpha}|array{item: ShapeBeta}';
  const shapeStart = shapeFactorySource.indexOf(shapeReturn);
  const shapeEdit = new vscode.WorkspaceEdit();
  shapeEdit.replace(shapeFactoryUri, new vscode.Range(shapeFactoryDocument.positionAt(shapeStart),
    shapeFactoryDocument.positionAt(shapeStart + shapeReturn.length)), 'array{item: ShapeAlpha}');
  assert.ok(await vscode.workspace.applyEdit(shapeEdit));
  assert.ok(shapeFactoryDocument.isDirty, 'The union-shape source edit was unexpectedly saved.');
  const alphaDeadline = Date.now() + 20_000;
  while (Date.now() < alphaDeadline && !(await shapeMethods('$item->alpha')).includes('alphaOnly'))
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok((await shapeMethods('$item->alpha')).includes('alphaOnly'), 'The unsaved shape did not update member completion.');
  const updatedShapeDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', shapeConsumerUri, shapeDefinitionPosition) ?? [];
  assert.deepStrictEqual(updatedShapeDefinitions.map((item) => item.uri.toString()), [shapeAlphaUri.toString()]);
  console.log('C2 cold onDemand union-shape return: shared member → unsaved Alpha-only member and definition');

  const reopenSourceUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ReopenFeedback.php');
  const reopenContractUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ReopenContract.php');
  const reopenConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ReopenFeedbackConsumer.php');
  const reopenSource = (method: string, parameterType: string): string => `<?php namespace App\\Service;
final class ReopenFeedback implements ReopenContract { public function ${method}(${parameterType} $value): void {} }
`;
  const reopenContract = (method: string, parameterType: string): string => `<?php namespace App\\Service;
interface ReopenContract { public function ${method}(${parameterType} $value): void; }
`;
  const reopenConsumer = `<?php declare(strict_types=1); namespace App\\Service;
function inspectReopenFeedback(ReopenFeedback $value): void { $value->reopen; $value->reopenOld(1); }
`;
  await vscode.workspace.fs.writeFile(reopenSourceUri, Buffer.from(reopenSource('reopenOld', 'int')));
  await vscode.workspace.fs.writeFile(reopenContractUri, Buffer.from(reopenContract('reopenOld', 'int')));
  await vscode.workspace.fs.writeFile(reopenConsumerUri, Buffer.from(reopenConsumer));
  const reopenConsumerDocument = await vscode.workspace.openTextDocument(reopenConsumerUri);
  const reopenCompletionPosition = reopenConsumerDocument.positionAt(reopenConsumer.indexOf('$value->reopen') + '$value->reopen'.length);
  const reopenMethods = async (): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', reopenConsumerUri, reopenCompletionPosition,
  ))?.items.map((item) => String(item.label)) ?? [];
  const waitForReopenMethod = async (expectedMethod: string, rejectedMethod: string): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const labels = await reopenMethods();
      if (labels.includes(expectedMethod) && !labels.includes(rejectedMethod)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Reopened declaration did not refresh completion: ${JSON.stringify(await reopenMethods())}`);
  };
  await vscode.window.showTextDocument(reopenConsumerDocument);
  await waitForReopenMethod('reopenOld', 'reopenNew');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(reopenSourceUri));
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline && vscode.workspace.textDocuments.some((item) => item.uri.toString() === reopenSourceUri.toString())) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const retainedAfterClose = vscode.workspace.textDocuments.some((item) => item.uri.toString() === reopenSourceUri.toString());
  await vscode.workspace.fs.writeFile(reopenSourceUri, Buffer.from(reopenSource('reopenNew', 'string')));
  await vscode.workspace.fs.writeFile(reopenContractUri, Buffer.from(reopenContract('reopenNew', 'string')));
  const reopenedDocument = await vscode.workspace.openTextDocument(reopenSourceUri);
  const diskRefreshDeadline = Date.now() + 20_000;
  while (Date.now() < diskRefreshDeadline && !reopenedDocument.getText().includes('reopenNew')) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(reopenedDocument.getText().includes('reopenNew'),
    `The reopened editor retained the old disk declaration (retainedAfterClose=${retainedAfterClose}).`);
  await vscode.window.showTextDocument(reopenedDocument);
  await waitForReopenMethod('reopenNew', 'reopenOld');
  const oldCallOffset = reopenConsumerDocument.getText().indexOf('reopenOld(1);');
  const oldDefinition = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', reopenConsumerUri, reopenConsumerDocument.positionAt(oldCallOffset + 2)) ?? [];
  assert.ok(!oldDefinition.some((location) => location.uri.toString() === reopenSourceUri.toString()),
    'The reopened source still resolved the removed method.');
  const reopenEdit = new vscode.WorkspaceEdit();
  reopenEdit.replace(reopenConsumerUri, new vscode.Range(reopenConsumerDocument.positionAt(oldCallOffset),
    reopenConsumerDocument.positionAt(oldCallOffset + 'reopenOld'.length)), 'reopenNew');
  assert.ok(await vscode.workspace.applyEdit(reopenEdit), 'Could not update the consumer to the new method.');
  const newDefinition = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', reopenConsumerUri, reopenConsumerDocument.positionAt(oldCallOffset + 2)) ?? [];
  assert.ok(newDefinition.some((location) => location.uri.toString() === reopenSourceUri.toString()
    && reopenedDocument.getText(location.range) === 'reopenNew'), 'Definition did not follow the reopened source.');
  const newHover = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', reopenConsumerUri, reopenConsumerDocument.positionAt(oldCallOffset + 2)) ?? [];
  assert.ok(newHover.some((hover) => hover.contents.some((item) =>
    (typeof item === 'string' ? item : item.value).includes('reopenNew'))), 'Hover retained the old method after reopen.');
  const newCallPosition = reopenConsumerDocument.positionAt(oldCallOffset + 'reopenNew('.length);
  const newSignatures = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', reopenConsumerUri, newCallPosition);
  assert.ok(newSignatures?.signatures.some((signature) => signature.label.includes('string $value')),
    'Signature Help retained the old parameter type after reopen.');
  const reopenTypeErrors = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(reopenConsumerUri)
    .filter((diagnostic) => diagnostic.source === 'SoPHP' && diagnostic.code === 'php.argument.type-mismatch');
  const reopenErrorDeadline = Date.now() + 20_000;
  while (Date.now() < reopenErrorDeadline && reopenTypeErrors().length === 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(reopenTypeErrors().length, 1, 'The reopened string parameter did not reject the old numeric argument.');
  const argumentOffset = reopenConsumerDocument.getText().indexOf('reopenNew(1)') + 'reopenNew('.length;
  const argumentEdit = new vscode.WorkspaceEdit();
  argumentEdit.replace(reopenConsumerUri, new vscode.Range(reopenConsumerDocument.positionAt(argumentOffset),
    reopenConsumerDocument.positionAt(argumentOffset + 1)), "'ok'");
  assert.ok(await vscode.workspace.applyEdit(argumentEdit), 'Could not repair the unsaved argument after reopen.');
  const repairDeadline = Date.now() + 20_000;
  while (Date.now() < repairDeadline && reopenTypeErrors().length > 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(reopenTypeErrors(), [], 'The corrected unsaved argument retained a stale type diagnostic.');
  const reopenedDeclarationOffset = reopenedDocument.getText().indexOf('reopenNew');
  const reopenedReferences = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', reopenSourceUri, reopenedDocument.positionAt(reopenedDeclarationOffset + 2)) ?? [];
  assert.ok(reopenedReferences.some((location) => location.uri.toString() === reopenConsumerUri.toString()
    && reopenConsumerDocument.getText(location.range) === 'reopenNew'),
  'References did not follow the reopened method and unsaved consumer edit.');
  const reopenedContractDocument = await vscode.workspace.openTextDocument(reopenContractUri);
  const contractMethodOffset = reopenedContractDocument.getText().indexOf('reopenNew');
  assert.ok(contractMethodOffset >= 0, 'The interface retained its old declaration after disk refresh.');
  const reopenedImplementations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeImplementationProvider', reopenContractUri, reopenedContractDocument.positionAt(contractMethodOffset + 2)) ?? [];
  assert.ok(reopenedImplementations.some((location) => location.uri.toString() === reopenSourceUri.toString()
    && reopenedDocument.getText(location.range) === 'reopenNew'),
  'Implementation did not follow the refreshed interface and class declaration.');
  console.log(`C2 editor close, disk change, reopen: six queries and diagnostics use reopenNew(string); retainedAfterClose=${retainedAfterClose}`);

  const classmapProject = vscode.Uri.joinPath(root.uri, 'c2-classmap-proof');
  const classmapSourceUri = vscode.Uri.joinPath(classmapProject, 'mapped', 'Bundle.php');
  const classmapConsumerUri = vscode.Uri.joinPath(classmapProject, 'src', 'Consumer.php');
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(classmapProject, 'mapped'));
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(classmapProject, 'src'));
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(classmapProject, 'vendor', 'composer'));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(classmapProject, 'composer.json'), Buffer.from(JSON.stringify({
    autoload: { 'psr-4': { 'App\\': 'src/' }, classmap: ['mapped/'] },
  })));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(classmapProject, 'vendor', 'composer', 'autoload_classmap.php'), Buffer.from(`<?php
// autoload_classmap.php @generated by Composer
$vendorDir = dirname(__DIR__);
$baseDir = dirname($vendorDir);
return array(
    'Legacy\\\\Proof' => $baseDir . '/mapped/Bundle.php',
);
`));
  const classmapSource = '<?php namespace Legacy; final class Proof { public function accept(int $value): void {} }';
  const classmapConsumer = '<?php declare(strict_types=1); namespace App; function run(\\Legacy\\Proof $item): void { $item->accept("bad"); $item->acc; }';
  await vscode.workspace.fs.writeFile(classmapSourceUri, Buffer.from(classmapSource));
  await vscode.workspace.fs.writeFile(classmapConsumerUri, Buffer.from(classmapConsumer));
  const classmapSourceDocument = await vscode.workspace.openTextDocument(classmapSourceUri);
  await vscode.window.showTextDocument(classmapSourceDocument);
  const classmapConsumerDocument = await vscode.workspace.openTextDocument(classmapConsumerUri);
  await vscode.window.showTextDocument(classmapConsumerDocument);
  const classmapErrors = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(classmapConsumerUri)
    .filter((item) => item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch');
  const classmapDeadline = Date.now() + 20_000;
  while (Date.now() < classmapDeadline && classmapErrors().length === 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(classmapErrors().length, 1, 'Composer classmap proof did not enable the cross-file argument diagnostic.');
  assert.ok(!vscode.languages.getDiagnostics(classmapSourceUri).some((item) => item.code === 'php.type.filename'),
    'A classmap declaration received a PSR-4 filename warning.');
  const classmapCompletion = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', classmapConsumerUri,
    classmapConsumerDocument.positionAt(classmapConsumer.indexOf('$item->acc;') + '$item->acc'.length));
  assert.ok(classmapCompletion?.items.some((item) => item.label === 'accept'),
    'The classmap method did not appear in editor completion.');
  const classmapCall = classmapConsumer.indexOf('$item->accept(') + '$item->'.length + 2;
  const classmapDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', classmapConsumerUri, classmapConsumerDocument.positionAt(classmapCall)) ?? [];
  assert.ok(classmapDefinitions.some((location) => location.uri.toString() === classmapSourceUri.toString()),
    'Classmap method Definition did not reach its mapped source.');
  const classmapEdit = new vscode.WorkspaceEdit();
  const typeOffset = classmapSourceDocument.getText().indexOf('int $value');
  classmapEdit.replace(classmapSourceUri, new vscode.Range(classmapSourceDocument.positionAt(typeOffset),
    classmapSourceDocument.positionAt(typeOffset + 'int'.length)), 'string');
  assert.ok(await vscode.workspace.applyEdit(classmapEdit), 'Could not edit the mapped declaration in an unsaved buffer.');
  assert.ok(classmapSourceDocument.isDirty, 'The mapped declaration edit was saved unexpectedly.');
  const classmapClearDeadline = Date.now() + 20_000;
  while (Date.now() < classmapClearDeadline && classmapErrors().length > 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(classmapErrors(), [], 'The old classmap argument diagnostic survived the unsaved declaration edit.');
  const classmapHover = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', classmapConsumerUri, classmapConsumerDocument.positionAt(classmapCall)) ?? [];
  assert.ok(classmapHover.some((hover) => hover.contents.some((item) =>
    (typeof item === 'string' ? item : item.value).includes('string $value'))),
  'Classmap method Hover retained the old parameter type.');
  console.log('C2 Composer classmap: argument diagnostic, completion, Definition and unsaved Hover/diagnostic refresh');

  const attributeUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'C2LiveAttribute.php');
  const attributeConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'C2LiveAttributeConsumer.php');
  const markedAttribute = '<?php namespace App\\Service; #[\\Attribute(\\Attribute::TARGET_CLASS)] class C2LiveAttribute {}';
  const methodAttribute = markedAttribute.replace('TARGET_CLASS', 'TARGET_METHOD');
  const plainAttribute = '<?php namespace App\\Service; class C2LiveAttribute {}';
  const attributeConsumer = '<?php namespace App\\Service; #[C2LiveAttr] class C2LiveAttributeConsumer {}';
  await vscode.workspace.fs.writeFile(attributeUri, Buffer.from(markedAttribute));
  await vscode.workspace.fs.writeFile(attributeConsumerUri, Buffer.from(attributeConsumer));
  const attributeDocument = await vscode.workspace.openTextDocument(attributeUri);
  const attributeConsumerDocument = await vscode.workspace.openTextDocument(attributeConsumerUri);
  await vscode.window.showTextDocument(attributeDocument);
  await vscode.window.showTextDocument(attributeConsumerDocument);
  const attributePosition = attributeConsumerDocument.positionAt(attributeConsumer.indexOf('C2LiveAttr]') + 'C2LiveAttr'.length);
  const attributeCompletion = async (): Promise<boolean> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', attributeConsumerUri, attributePosition))?.items
    .some((item) => (typeof item.label === 'string' ? item.label : item.label.label) === 'C2LiveAttribute') ?? false;
  const waitForAttribute = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && await attributeCompletion() !== expected) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.strictEqual(await attributeCompletion(), expected,
      `C2 cross-file Attribute completion did not become ${expected} after the declaration changed.`);
  };
  const replaceAttribute = async (source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(attributeUri, new vscode.Range(new vscode.Position(0, 0),
      attributeDocument.positionAt(attributeDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit), 'Could not edit the Attribute declaration buffer.');
    assert.ok(attributeDocument.isDirty, 'The Attribute declaration edit was unexpectedly saved.');
  };
  await waitForAttribute(true);
  await replaceAttribute(plainAttribute);
  await waitForAttribute(false);
  await replaceAttribute(markedAttribute);
  await waitForAttribute(true);
  await replaceAttribute(methodAttribute);
  await waitForAttribute(false);
  await replaceAttribute(markedAttribute);
  await waitForAttribute(true);
  console.log('C2 onDemand cross-file Attribute marker and target: completion present → withdrawn → restored → wrong target withdrawn → restored');

  const symbolFolder = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'Tools');
  await vscode.workspace.fs.createDirectory(symbolFolder);
  const symbolUri = vscode.Uri.joinPath(symbolFolder, 'C2LiveSymbols.php');
  const symbolConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'C2LiveSymbolImports.php');
  const symbolSource = '<?php namespace App\\Service\\Tools; function c2ImportDraft(): void {} const C2_IMPORT_DRAFT = 1;';
  const symbolConsumer = '<?php namespace App\\Service; use function App\\Service\\Tools\\{c2Import}; use const App\\Service\\Tools\\{C2_IMPORT};';
  await vscode.workspace.fs.writeFile(symbolUri, Buffer.from(symbolSource));
  await vscode.workspace.fs.writeFile(symbolConsumerUri, Buffer.from(symbolConsumer));
  const symbolDocument = await vscode.workspace.openTextDocument(symbolUri);
  const symbolConsumerDocument = await vscode.workspace.openTextDocument(symbolConsumerUri);
  await vscode.window.showTextDocument(symbolDocument);
  await vscode.window.showTextDocument(symbolConsumerDocument);
  const symbolLabels = async (marker: string): Promise<string[]> => {
    const position = symbolConsumerDocument.positionAt(symbolConsumer.indexOf(marker) + marker.length - 1);
    const result = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', symbolConsumerUri, position);
    return result?.items.map((item) => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
  };
  const waitForSymbol = async (marker: string, present: string, absent: string): Promise<void> => {
    const deadline = Date.now() + 20_000;
    let labels = await symbolLabels(marker);
    while (Date.now() < deadline && (!labels.includes(present) || labels.includes(absent))) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      labels = await symbolLabels(marker);
    }
    assert.ok(labels.includes(present) && !labels.includes(absent),
      `C2 grouped ${marker} completion retained a stale symbol: ${JSON.stringify(labels)}`);
  };
  await waitForSymbol('{c2Import}', 'c2ImportDraft', 'c2ImportFinal');
  await waitForSymbol('{C2_IMPORT}', 'C2_IMPORT_DRAFT', 'C2_IMPORT_FINAL');
  const liveSymbols = symbolSource.replace('c2ImportDraft', 'c2ImportFinal')
    .replace('C2_IMPORT_DRAFT', 'C2_IMPORT_FINAL');
  const symbolEdit = new vscode.WorkspaceEdit();
  symbolEdit.replace(symbolUri, new vscode.Range(new vscode.Position(0, 0),
    symbolDocument.positionAt(symbolDocument.getText().length)), liveSymbols);
  assert.ok(await vscode.workspace.applyEdit(symbolEdit), 'Could not update grouped-import symbols in the unsaved declaration.');
  assert.ok(symbolDocument.isDirty, 'The grouped-import declaration was unexpectedly saved.');
  await waitForSymbol('{c2Import}', 'c2ImportFinal', 'c2ImportDraft');
  await waitForSymbol('{C2_IMPORT}', 'C2_IMPORT_FINAL', 'C2_IMPORT_DRAFT');
  console.log('C2 grouped function and constant imports follow the unsaved declaration without retaining old candidates');
  await verifyArrayFilterModeFeedback(root.uri);
  await verifyArrayWalkRecursiveFeedback(root.uri);
  await verifyLocalStringCallbackFeedback(root.uri);
  await verifyPropertyAssignmentCompletion(root.uri);
  await verifyElvisCompletion(root.uri);
  await verifyValueCallCompletion(root.uri);
  await verifyMethodValueCallCompletion(root.uri);
    await verifyExactMethodValueCallCompletion(root.uri);
    await verifyArrayMethodValueCallCompletion(root.uri);
    await verifyExpressionMethodValueCallCompletion(root.uri);
    await verifyStaticScopeMethodValueCallCompletion(root.uri);
    await verifyLiteralPrefixMethodValueCallCompletion(root.uri);
    await verifyPostAssignmentLiteralMethodValueCallCompletion(root.uri);
    await verifyCrossFileValueSignatureCompletion(root.uri);
  await verifyReferenceReturnCompletion(root.uri);
  await verifyOverloadExpectedCompletion(root.uri);
  await verifyGenericExpectedCompletion(root.uri);
  await verifyParseUrlContractFeedback(root.uri);
  await verifyStringSplitFeedback(root.uri);
  await verifyObjectColumnFeedback(root.uri);
  await verifyObjectColumnFeedback(root.uri, true);
  await verifyConditionalCompletion(root.uri);
  await verifyOperandCompletion(root.uri);
  await verifyCallbackReturnCompletion(root.uri);
  await verifyTrailingCallbackCompletion(root.uri);
  await verifyCallbackCompletionDetails(root.uri);
  await verifyTrailingCallableMembers(root.uri);
  await verifyBranchValueCompletion(root.uri);
  await verifyBranchShapeCompletion(root.uri);
  await verifyUnionShapeCompletion(root.uri);
  await verifyUnfinishedShapeCompletion(root.uri);
  await verifyQuotedPrefixCompletion(root.uri);
  await verifyArrayAccessKeyCompletion(root.uri);
}

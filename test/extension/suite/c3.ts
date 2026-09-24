import * as assert from 'node:assert';
import * as vscode from 'vscode';

type QueryState = { paused: boolean; version: number | null };
type TestApi = { requestLanguageServer<T>(method: string, params: unknown): Promise<T> };

async function waitForState(api: TestApi, method: string, document: vscode.TextDocument,
  matches: (state: QueryState) => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  let state: QueryState | null = null;
  while (Date.now() < deadline) {
    state = await api.requestLanguageServer<QueryState | null>('phpCompanion/testQueryState', { method, uri: document.uri.toString() });
    if (state && matches(state)) return;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  assert.fail(`${message}: ${JSON.stringify(state)}`);
}

async function verifyEditDuringRequest(api: TestApi, method: string, document: vscode.TextDocument,
  startCommand: () => Thenable<unknown>, staleEditAbsent: () => boolean): Promise<void> {
  await vscode.window.showTextDocument(document);
  const original = document.getText();
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testPauseNextQuery', { method }), true,
    `Could not arm the ${method} request pause`);
  const command = startCommand();
  try {
    await waitForState(api, method, document, (state) => state.paused && state.version === document.version,
      `${method} did not pause with the original document version`);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, document.positionAt(document.getText().length), '\n// Edited while the server held an import response.\n');
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not edit the document while ${method} was paused`);
    assert.ok(document.isDirty, `${method} unexpectedly saved the user edit`);
    await waitForState(api, method, document, (state) => state.paused && state.version === document.version,
      `${method} did not observe the new document version before release`);
  } finally {
    assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testReleaseQuery', { method }), true,
      `Could not release the paused ${method} request`);
  }
  await command;
  assert.ok(staleEditAbsent(), `${method} applied an edit calculated from the old document version`);
  assert.ok(document.getText().includes('Edited while the server held'), `${method} discarded the user's concurrent edit`);
  await vscode.window.showTextDocument(document);
  await vscode.commands.executeCommand('undo');
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline && document.getText() !== original) await new Promise((resolve) => setTimeout(resolve, 25));
  assert.strictEqual(document.getText(), original, `${method} could not undo the concurrent user edit`);
}

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'C3 import request test requires the Composer fixture');
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load');
  const api = await extension.activate() as TestApi;
  assert.strictEqual(typeof api.requestLanguageServer, 'function');

  const importUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'ImportConsumer.php');
  const importDocument = await vscode.workspace.openTextDocument(importUri);
  const importOffset = importDocument.getText().indexOf('UserService');
  assert.ok(importOffset > 0);
  await verifyEditDuringRequest(api, 'addImport', importDocument,
    () => vscode.commands.executeCommand('phpCompanion.importClass', importUri, importDocument.positionAt(importOffset + 1)),
    () => !importDocument.getText().includes('use App\\Service\\UserService;'));
  await verifyEditDuringRequest(api, 'planTypeImports', importDocument,
    () => vscode.commands.executeCommand('phpCompanion.resolvePastedImports'),
    () => !importDocument.getText().includes('use App\\Service\\UserService;'));

  const optimizeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'OptimizeConsumer.php');
  const optimizeDocument = await vscode.workspace.openTextDocument(optimizeUri);
  await verifyEditDuringRequest(api, 'organizeImports', optimizeDocument,
    () => vscode.commands.executeCommand('phpCompanion.optimizeImports', optimizeUri, { preview: false }),
    () => optimizeDocument.getText().includes('use App\\Contract\\Runner;')
      && optimizeDocument.getText().match(/use App\\Service\\UserService;/g)?.length === 2);
  const serviceDirectory = vscode.Uri.joinPath(folder.uri, 'src', 'Service');
  const generatedUri = vscode.Uri.joinPath(serviceDirectory, 'C3GeneratedType.php');
  const checkPreview = (): void => {
    const preview = vscode.window.activeTextEditor?.document;
    assert.ok(preview && preview.uri.scheme === 'sophp-type-preview', 'Generated PHP source was not opened as a read-only preview');
    assert.ok(preview.getText().includes('namespace App\\Service;') && preview.getText().includes('class C3GeneratedType'),
      'Generated PHP preview omitted its PSR-4 namespace or class');
  };
  await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'C3GeneratedType', serviceDirectory,
    async () => { checkPreview(); return 'cancel'; });
  await assert.rejects(async () => vscode.workspace.fs.stat(generatedUri), 'Cancelling generated PHP preview created a file');
  const concurrentSource = '<?php\n// Created while SoPHP preview was open.\n';
  await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'C3GeneratedType', serviceDirectory,
    async () => { checkPreview(); await vscode.workspace.fs.writeFile(generatedUri, Buffer.from(concurrentSource)); return 'apply'; });
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(generatedUri)).toString('utf8'), concurrentSource,
    'Applying a stale generation preview overwrote a file created concurrently');
  await vscode.workspace.fs.delete(generatedUri);
  await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'C3GeneratedType', serviceDirectory,
    async () => { checkPreview(); return 'apply'; });
  const generated = await vscode.workspace.openTextDocument(generatedUri);
  assert.ok(generated.getText().includes('class C3GeneratedType'), 'Applying generated PHP preview did not create the source');
  await vscode.window.showTextDocument(generated);
  await vscode.commands.executeCommand('undo');
  await assert.rejects(async () => vscode.workspace.fs.stat(generatedUri), 'Generated PHP file was not removed by one Undo');
  const classUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3Extractable.php');
  const interfaceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3ExtractableInterface.php');
  const classSource = '<?php\nnamespace App\\Service;\nclass C3Extractable { public function handle(string $value): string { return $value; } }\n';
  await vscode.workspace.fs.writeFile(classUri, Buffer.from(classSource));
  const classDocument = await vscode.workspace.openTextDocument(classUri);
  await vscode.window.showTextDocument(classDocument);
  const classPosition = classDocument.positionAt(classSource.indexOf('C3Extractable'));
  const extractAction = async (): Promise<vscode.CodeAction> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
        'vscode.executeCodeActionProvider', classUri, new vscode.Range(classPosition, classPosition), vscode.CodeActionKind.RefactorExtract.value);
      const found = actions.find((action): action is vscode.CodeAction => 'command' in action
        && action.title === 'Extract interface C3ExtractableInterface');
      if (found?.command) return found;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail('Extract Interface preview action was unavailable');
  };
  const staleAction = await extractAction();
  const staleEdit = new vscode.WorkspaceEdit();
  staleEdit.insert(classUri, new vscode.Position(1, 0), '// edited before extraction\n');
  assert.ok(await vscode.workspace.applyEdit(staleEdit));
  await vscode.commands.executeCommand(staleAction.command!.command, ...staleAction.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri), 'Stale Extract Interface left an orphan file');
  assert.ok(classDocument.getText().includes('// edited before extraction') && !classDocument.getText().includes('implements C3ExtractableInterface'),
    'Stale Extract Interface corrupted the edited source');
  await vscode.window.showTextDocument(classDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(classDocument.getText(), classSource);
  const cancelAction = await extractAction();
  await vscode.commands.executeCommand(cancelAction.command!.command, ...cancelAction.command!.arguments ?? [],
    { testPreviewAction: async () => {
      assert.ok(vscode.window.tabGroups.all.flatMap((group) => group.tabs)
        .filter((tab) => tab.label.includes('Extract Interface:')).length >= 2,
      'Extract Interface did not show source and new interface diffs');
      return 'cancel';
    } });
  await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri), 'Cancelling Extract Interface created the target');
  const raceAction = await extractAction();
  await vscode.commands.executeCommand(raceAction.command!.command, ...raceAction.command!.arguments ?? [],
    { testPreviewAction: async () => {
      const concurrent = new vscode.WorkspaceEdit();
      concurrent.insert(classUri, new vscode.Position(1, 0), '// edited while reviewing extraction\n');
      assert.ok(await vscode.workspace.applyEdit(concurrent));
      return 'apply';
    } });
  await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri), 'Extract Interface applied an edit made stale during preview');
  assert.ok(classDocument.getText().includes('// edited while reviewing extraction'));
  await vscode.window.showTextDocument(classDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(classDocument.getText(), classSource);
  const targetConflictAction = await extractAction();
  const targetConflictSource = '<?php\n// another extension created this target\n';
  await vscode.commands.executeCommand(targetConflictAction.command!.command, ...targetConflictAction.command!.arguments ?? [],
    { testPreviewAction: async () => {
      await vscode.workspace.fs.writeFile(interfaceUri, Buffer.from(targetConflictSource));
      return 'apply';
    } });
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(interfaceUri)).toString('utf8'), targetConflictSource,
    'Extract Interface overwrote a target created during preview');
  assert.strictEqual(classDocument.getText(), classSource, 'Target conflict changed the source class');
  await vscode.workspace.fs.delete(interfaceUri);
  const freshAction = await extractAction();
  await vscode.commands.executeCommand(freshAction.command!.command, ...freshAction.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok((await vscode.workspace.openTextDocument(interfaceUri)).getText().includes('interface C3ExtractableInterface'));
  assert.ok(classDocument.getText().includes('implements C3ExtractableInterface'));
  await vscode.window.showTextDocument(classDocument);
  await vscode.commands.executeCommand('undo');
  await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri), 'Extract Interface Undo left the target');
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(interfaceUri)).getText().includes('interface C3ExtractableInterface'));
  console.log('C3 held server import requests: addImport, planTypeImports, organizeImports; all rejected stale edits.');
  console.log('C3 PHP type generation: preview, cancel, apply and one Undo passed; Redo remains open.');
}

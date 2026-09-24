import * as assert from 'node:assert';
import { createHash } from 'node:crypto';
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
        .filter((tab) => tab.label.includes('Extract interface C3ExtractableInterface')).length >= 2,
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
  assert.strictEqual(vscode.window.activeTextEditor?.document.uri.toString(), classUri.toString(),
    'Extract Interface left focus in the diff preview after applying');
  await vscode.commands.executeCommand('undo');
  await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri), 'Extract Interface Undo left the target');
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(interfaceUri)).getText().includes('interface C3ExtractableInterface'));
  const variableUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3ExtractVariable.php');
  const variableSource = '<?php\nnamespace App\\Service;\nfunction makeObject(): object\n{\n    $result = new \\stdClass();\n    return $result;\n}\n';
  await vscode.workspace.fs.writeFile(variableUri, Buffer.from(variableSource));
  const variableDocument = await vscode.workspace.openTextDocument(variableUri);
  await vscode.window.showTextDocument(variableDocument);
  const expressionStart = variableSource.indexOf('new \\stdClass()');
  const variableAction = async (): Promise<vscode.CodeAction> => {
    let titles: string[] = [];
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
        'vscode.executeCodeActionProvider', variableUri,
        new vscode.Range(variableDocument.positionAt(expressionStart), variableDocument.positionAt(expressionStart + 'new \\stdClass()'.length)),
        vscode.CodeActionKind.RefactorExtract.value);
      titles = actions.map((action) => action.title);
      const found = actions.find((action): action is vscode.CodeAction => 'command' in action && action.title === 'Extract to $extracted');
      if (found?.command) return found;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Extract Variable was not routed through the preview command: ${JSON.stringify(titles)}`);
  };
  const heldVersion = variableDocument.version;
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testPauseNextQuery', { method: 'refactorExtract' }), true);
  let heldCancelled = false;
  const heldActions = vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', variableUri,
    new vscode.Range(variableDocument.positionAt(expressionStart), variableDocument.positionAt(expressionStart + 'new \\stdClass()'.length)),
    vscode.CodeActionKind.RefactorExtract.value).then((actions) => actions, (error: unknown) => {
      if (error instanceof Error && (error.name === 'Canceled' || error.message === 'Canceled')) {
        heldCancelled = true;
        return [] as Array<vscode.CodeAction | vscode.Command>;
      }
      throw error;
    });
  await waitForState(api, 'refactorExtract', variableDocument, (state) => state.paused && state.version === heldVersion,
    'Extract Variable response was not held with the source version');
  const heldChange = new vscode.WorkspaceEdit();
  heldChange.insert(variableUri, new vscode.Position(1, 0), '// edited while server held extraction\n');
  assert.ok(await vscode.workspace.applyEdit(heldChange));
  try {
    await waitForState(api, 'refactorExtract', variableDocument,
      (state) => state.paused && state.version === variableDocument.version && state.version !== heldVersion,
      'Language Server did not observe the new source version before releasing Extract Variable');
  } finally {
    assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testReleaseQuery', { method: 'refactorExtract' }), true);
  }
  const heldResult = await heldActions;
  const staleHeldAction = heldResult.find((action): action is vscode.CodeAction => 'command' in action && action.title === 'Extract to $extracted');
  let heldPreviewOpened = false;
  if (staleHeldAction?.command) await vscode.commands.executeCommand(staleHeldAction.command.command,
    ...staleHeldAction.command.arguments ?? [], { testPreviewAction: async () => { heldPreviewOpened = true; return 'apply'; } });
  assert.ok(!heldPreviewOpened && !variableDocument.getText().includes('$extracted'),
    'Extract Variable accepted a response computed before an in-flight edit');
  console.log(`C3 held Extract Variable response: cancelled=${heldCancelled}, actions=${heldResult.length}, stalePreviewOpened=${heldPreviewOpened}`);
  await vscode.window.showTextDocument(variableDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(variableDocument.getText(), variableSource);
  const staleVariable = await variableAction();
  const variableChange = new vscode.WorkspaceEdit();
  variableChange.insert(variableUri, new vscode.Position(1, 0), '// edited after selecting extraction\n');
  assert.ok(await vscode.workspace.applyEdit(variableChange));
  await vscode.commands.executeCommand(staleVariable.command!.command, ...staleVariable.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(!variableDocument.getText().includes('$extracted'), 'Stale Extract Variable changed the edited source');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(variableDocument.getText(), variableSource);
  const cancelVariable = await variableAction();
  await vscode.commands.executeCommand(cancelVariable.command!.command, ...cancelVariable.command!.arguments ?? [],
    { testPreviewAction: async () => {
      assert.ok(vscode.window.tabGroups.all.flatMap((group) => group.tabs)
        .some((tab) => tab.label.includes('Extract to $extracted')), 'Extract Variable did not show a source diff');
      return 'cancel';
    } });
  assert.strictEqual(variableDocument.getText(), variableSource, 'Cancelling Extract Variable changed the source');
  const freshVariable = await variableAction();
  await vscode.commands.executeCommand(freshVariable.command!.command, ...freshVariable.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(variableDocument.getText().includes('$extracted = new \\stdClass();'));
  assert.strictEqual(vscode.window.activeTextEditor?.document.uri.toString(), variableUri.toString());
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(variableDocument.getText(), variableSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(variableDocument.getText().includes('$extracted = new \\stdClass();'));
  const inlineUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3InlineVariable.php');
  const inlineSource = '<?php\nnamespace App\\Service;\nfunction makeInline(): object\n{\n    $result = new \\stdClass();\n    return $result;\n}\n';
  await vscode.workspace.fs.writeFile(inlineUri, Buffer.from(inlineSource));
  const inlineDocument = await vscode.workspace.openTextDocument(inlineUri);
  await vscode.window.showTextDocument(inlineDocument);
  const inlineAction = async (): Promise<vscode.CodeAction> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const start = inlineDocument.getText().indexOf('$result');
      const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
        'vscode.executeCodeActionProvider', inlineUri,
        new vscode.Range(inlineDocument.positionAt(start), inlineDocument.positionAt(start)),
        vscode.CodeActionKind.RefactorInline.value);
      const found = actions.find((action): action is vscode.CodeAction => 'command' in action && action.title === 'Inline $result');
      if (found?.command) return found;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail('Inline Variable was not routed through the preview command');
  };
  const staleInline = await inlineAction();
  const inlineChange = new vscode.WorkspaceEdit();
  inlineChange.insert(inlineUri, new vscode.Position(1, 0), '// edited after selecting inline\n');
  assert.ok(await vscode.workspace.applyEdit(inlineChange));
  await vscode.commands.executeCommand(staleInline.command!.command, ...staleInline.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(inlineDocument.getText().includes('// edited after selecting inline')
    && inlineDocument.getText().includes('$result = new \\stdClass();'), 'Stale Inline Variable changed the edited source');
  await vscode.window.showTextDocument(inlineDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(inlineDocument.getText(), inlineSource);
  const cancelInline = await inlineAction();
  await vscode.commands.executeCommand(cancelInline.command!.command, ...cancelInline.command!.arguments ?? [],
    { testPreviewAction: async () => {
      assert.ok(vscode.window.tabGroups.all.flatMap((group) => group.tabs)
        .some((tab) => tab.label.includes('Inline $result')), 'Inline Variable did not show a source diff');
      return 'cancel';
    } });
  assert.strictEqual(inlineDocument.getText(), inlineSource, 'Cancelling Inline Variable changed the source');
  const freshInline = await inlineAction();
  await vscode.commands.executeCommand(freshInline.command!.command, ...freshInline.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(inlineDocument.getText().includes('return new \\stdClass();') && !inlineDocument.getText().includes('$result ='));
  assert.strictEqual(vscode.window.activeTextEditor?.document.uri.toString(), inlineUri.toString());
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(inlineDocument.getText(), inlineSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(inlineDocument.getText().includes('return new \\stdClass();'));
  const secondUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3SecondTarget.php');
  const secondSource = '<?php\nnamespace App\\Service;\nfunction secondTarget(): int { return 1; }\n';
  await vscode.workspace.fs.writeFile(secondUri, Buffer.from(secondSource));
  const secondDocument = await vscode.workspace.openTextDocument(secondUri);
  const sourceEdit = new vscode.WorkspaceEdit();
  sourceEdit.replace(inlineUri, new vscode.Range(2, 9, 2, 19), 'makeUpdated');
  sourceEdit.replace(secondUri, new vscode.Range(2, 9, 2, 21), 'secondUpdate');
  const targetHashes = { [secondUri.toString()]: createHash('sha256').update(secondSource).digest('hex') };
  const previewRequest = (): { edit: vscode.WorkspaceEdit; title: string; sourceUri: vscode.Uri; sourceVersion: number;
    sourceText: string; targetHashes: Record<string, string> } => ({ edit: sourceEdit, title: 'Multi-file refactor', sourceUri: inlineUri,
    sourceVersion: inlineDocument.version, sourceText: inlineDocument.getText(), targetHashes });
  const staleRequest = previewRequest();
  const changeSecond = new vscode.WorkspaceEdit();
  changeSecond.insert(secondUri, new vscode.Position(1, 0), '// changed while planning\n');
  assert.ok(await vscode.workspace.applyEdit(changeSecond));
  await vscode.commands.executeCommand('phpCompanion.applyPreviewedExtract', staleRequest,
    { testPreviewAction: async () => 'apply' });
  assert.ok(secondDocument.getText().includes('changed while planning') && !inlineDocument.getText().includes('makeUpdated'),
    'A stale second target allowed a multi-file refactor');
  await vscode.window.showTextDocument(secondDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(secondDocument.getText(), secondSource);
  await vscode.commands.executeCommand('phpCompanion.applyPreviewedExtract', previewRequest(),
    { testPreviewAction: async () => {
      const concurrent = new vscode.WorkspaceEdit();
      concurrent.insert(secondUri, new vscode.Position(1, 0), '// changed during preview\n');
      assert.ok(await vscode.workspace.applyEdit(concurrent));
      return 'apply';
    } });
  assert.ok(secondDocument.getText().includes('changed during preview') && !inlineDocument.getText().includes('makeUpdated'),
    'A second target changed during preview was overwritten');
  await vscode.window.showTextDocument(secondDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(secondDocument.getText(), secondSource);
  await vscode.commands.executeCommand('phpCompanion.applyPreviewedExtract', previewRequest(),
    { testPreviewAction: async () => 'apply' });
  assert.ok(inlineDocument.getText().includes('function makeUpdated()') && secondDocument.getText().includes('function secondUpdate()'));
  await vscode.commands.executeCommand('undo');
  assert.ok(!inlineDocument.getText().includes('function makeUpdated()') && secondDocument.getText() === secondSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(inlineDocument.getText().includes('function makeUpdated()') && secondDocument.getText().includes('function secondUpdate()'));
  const signatureUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3Signature.php');
  const signatureSource = '<?php\nnamespace App\\Service;\nclass C3Signature { private function build(int $unused, string $name): string { return $name; } public function run(): string { return $this->build(1, "ok"); } }\n';
  await vscode.workspace.fs.writeFile(signatureUri, Buffer.from(signatureSource));
  const signatureDocument = await vscode.workspace.openTextDocument(signatureUri);
  await vscode.window.showTextDocument(signatureDocument);
  const signatureAction = async (): Promise<vscode.CodeAction> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const offset = signatureDocument.getText().indexOf('$unused');
      const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
        'vscode.executeCodeActionProvider', signatureUri,
        new vscode.Range(signatureDocument.positionAt(offset), signatureDocument.positionAt(offset)),
        vscode.CodeActionKind.RefactorRewrite.value);
      const found = actions.find((action): action is vscode.CodeAction => 'command' in action
        && action.title === 'Remove unused parameter $unused');
      if (found?.command) return found;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail('Remove unused parameter was not routed through the preview command');
  };
  const staleSignature = await signatureAction();
  const signatureChange = new vscode.WorkspaceEdit();
  signatureChange.insert(signatureUri, new vscode.Position(1, 0), '// edited after selecting signature change\n');
  assert.ok(await vscode.workspace.applyEdit(signatureChange));
  await vscode.commands.executeCommand(staleSignature.command!.command, ...staleSignature.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(signatureDocument.getText().includes('$unused') && signatureDocument.getText().includes('edited after selecting'),
    'A stale signature action changed the edited source');
  await vscode.window.showTextDocument(signatureDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(signatureDocument.getText(), signatureSource);
  const cancelSignature = await signatureAction();
  await vscode.commands.executeCommand(cancelSignature.command!.command, ...cancelSignature.command!.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(signatureDocument.getText(), signatureSource);
  const freshSignature = await signatureAction();
  await vscode.commands.executeCommand(freshSignature.command!.command, ...freshSignature.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(signatureDocument.getText().includes('build(string $name)') && signatureDocument.getText().includes('build("ok")'));
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(signatureDocument.getText(), signatureSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(signatureDocument.getText().includes('build(string $name)'));
  const renameUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3RenameRace.php');
  const renameSource = '<?php\nnamespace App\\Service;\nfunction renameRace(): int { $value = 1; return $value; }\n';
  await vscode.workspace.fs.writeFile(renameUri, Buffer.from(renameSource));
  const renameDocument = await vscode.workspace.openTextDocument(renameUri);
  await vscode.window.showTextDocument(renameDocument);
  const renamePosition = renameDocument.positionAt(renameSource.indexOf('$value') + 2);
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testPauseNextQuery', { method: 'rename' }), true);
  const heldRename = vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
    'vscode.executeDocumentRenameProvider', renameUri, renamePosition, 'updatedValue')
    .then((edit) => edit, (error: unknown) => {
      assert.match(error instanceof Error ? error.message : String(error), /Canceled|changed|Rename/);
      return undefined;
    });
  await waitForState(api, 'rename', renameDocument, (state) => state.paused && state.version === renameDocument.version,
    'Rename response was not held with the source version');
  const renameChange = new vscode.WorkspaceEdit();
  renameChange.insert(renameUri, new vscode.Position(1, 0), '// edited while Rename was in flight\n');
  assert.ok(await vscode.workspace.applyEdit(renameChange));
  try {
    await waitForState(api, 'rename', renameDocument,
      (state) => state.paused && state.version === renameDocument.version,
      'Language Server did not receive the new version before releasing Rename');
  } finally {
    assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testReleaseQuery', { method: 'rename' }), true);
  }
  assert.strictEqual(await heldRename, undefined, 'Rename returned a stale WorkspaceEdit after source modification');
  assert.ok(renameDocument.getText().includes('edited while Rename was in flight') && renameDocument.getText().includes('$value'),
    'Rename changed or discarded the concurrent user edit');
  await vscode.window.showTextDocument(renameDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(renameDocument.getText(), renameSource);
  const crossRenameUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'UserService.php');
  const crossConsumerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'UserController.php');
  const crossRenameSource = Buffer.from(await vscode.workspace.fs.readFile(crossRenameUri)).toString('utf8');
  const crossConsumerSource = Buffer.from(await vscode.workspace.fs.readFile(crossConsumerUri)).toString('utf8');
  const crossRenameDocument = await vscode.workspace.openTextDocument(crossRenameUri);
  await vscode.window.showTextDocument(crossRenameDocument);
  const crossPosition = crossRenameDocument.positionAt(crossRenameSource.indexOf('class UserService') + 'class '.length + 2);
  const readyRename = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
    'vscode.executeDocumentRenameProvider', crossRenameUri, crossPosition, 'RenamedUserService');
  assert.ok(readyRename?.entries().some(([uri]) => uri.toString() === crossConsumerUri.toString()),
    'Cross-file Rename fixture did not include its closed consumer');
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testPauseNextQuery', { method: 'rename' }), true);
  const heldCrossRename = vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
    'vscode.executeDocumentRenameProvider', crossRenameUri, crossPosition, 'RenamedUserService')
    .then((edit) => edit, (error: unknown) => {
      assert.match(error instanceof Error ? error.message : String(error), /Canceled|changed|Rename/);
      return undefined;
    });
  await waitForState(api, 'rename', crossRenameDocument,
    (state) => state.paused && state.version === crossRenameDocument.version,
    'Cross-file Rename response was not held before the closed consumer changed');
  const changedConsumer = crossConsumerSource.replace('// UserService is intentionally ordinary text.',
    '// UserService remains ordinary text after an external edit.');
  await vscode.workspace.fs.writeFile(crossConsumerUri, Buffer.from(changedConsumer));
  try {
    assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testReleaseQuery', { method: 'rename' }), true);
  } finally {
    assert.strictEqual(await heldCrossRename, undefined,
      'Rename returned a stale WorkspaceEdit after a closed consumer changed on disk');
  }
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(crossConsumerUri)).toString('utf8'), changedConsumer);
  assert.strictEqual(crossRenameDocument.getText(), crossRenameSource);
  const dynamicUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'DynamicProperties.php');
  const dynamicDocument = await vscode.workspace.openTextDocument(dynamicUri);
  await vscode.window.showTextDocument(dynamicDocument);
  const dynamicOriginal = dynamicDocument.getText();
  const invalidAttributes = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(dynamicUri)
    .filter((diagnostic) => diagnostic.code === 'php.attribute.invalid-allow-dynamic-properties');
  for (let attempt = 0; attempt < 100 && invalidAttributes().length !== 4; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.strictEqual(invalidAttributes().length, 4, 'C3 diagnostic undo probe did not start with four invalid attributes');
  const property = vscode.languages.getDiagnostics(dynamicUri).find((diagnostic) => diagnostic.code === 'php.property.dynamic-deprecated');
  assert.ok(property);
  const fixes = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', dynamicUri, property.range, vscode.CodeActionKind.QuickFix.value);
  const declare = fixes.find((action): action is vscode.CodeAction => 'edit' in action && action.title.includes('Declare property $created'));
  assert.ok(declare?.edit);
  assert.ok(await vscode.workspace.applyEdit(declare.edit));
  await vscode.commands.executeCommand('undo');
  await vscode.commands.executeCommand('redo');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(dynamicDocument.getText(), dynamicOriginal, 'C3 diagnostic undo probe did not restore source text');
  for (let attempt = 0; attempt < 100 && invalidAttributes().length !== 4; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.strictEqual(invalidAttributes().length, 4,
    `C3 diagnostic undo probe lost invalid attributes; diagnostics=${JSON.stringify(vscode.languages.getDiagnostics(dynamicUri).map((item) => item.code))}`);
  console.log('C3 held server import requests: addImport, planTypeImports, organizeImports; all rejected stale edits.');
  console.log('C3 PHP type generation: preview, cancel, apply and one Undo passed; Redo remains open.');
}

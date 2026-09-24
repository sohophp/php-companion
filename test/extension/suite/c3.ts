import * as assert from 'node:assert';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
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
  const profileRenameErrors: string[] = [];
  if (process.env.PHP_COMPANION_TEST_C3_OPEN_SOURCE_PROFILE === '1') process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    if (message.includes('ENOENT') && message.includes('C3GroupedType.php')) profileRenameErrors.push(message);
  });
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load');
  if (process.env.PHP_COMPANION_TEST_C3_OPEN_SOURCE_PROFILE === '1') {
    const pack = vscode.extensions.getExtension('sohophp.php-companion-open-source-pack');
    assert.ok(pack, 'C3 Open Source Profile did not load the Pack');
    const members = pack.packageJSON.extensionPack as string[];
    assert.strictEqual(members.length, 11, 'C3 Open Source Profile did not use the current 11-member Pack');
    for (const id of members) assert.ok(vscode.extensions.getExtension(id), `C3 Open Source Profile is missing ${id}`);
    assert.ok(!vscode.extensions.getExtension('bmewburn.vscode-intelephense-client'),
      'C3 Open Source Profile has a second general PHP language server');
    assert.ok(!vscode.extensions.getExtension('symfony.language-tools'),
      'C3 Open Source Profile has a conflicting Symfony Rename provider');
  }
  const f2Rename = (extension.packageJSON.contributes?.keybindings as Array<{ command: string; key: string; when: string }> | undefined)
    ?.find((entry) => entry.command === 'phpCompanion.safeRename' && entry.key === 'f2');
  assert.ok(f2Rename?.when.includes('editorLangId == php') && f2Rename.when.includes('phpCompanion.safeRenameAvailable'),
    'F2 must route PHP Rename through the guarded SoPHP command only when its language server owns PHP');
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
  const optimizeOriginal = optimizeDocument.getText();
  await vscode.commands.executeCommand('phpCompanion.optimizeImports', optimizeUri, { preview: true, testPreviewAction: async () => {
    const previews = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
      tab.input instanceof vscode.TabInputTextDiff && tab.input.original.toString() === optimizeUri.toString());
    assert.strictEqual(previews.length, 1, 'Optimize Imports did not open one diff');
    assert.ok(previews[0]!.input instanceof vscode.TabInputTextDiff);
    assert.strictEqual(previews[0]!.input.modified.scheme, 'sophp-rename-preview', 'Optimize Imports result was not read-only');
    assert.ok(await vscode.window.tabGroups.close(previews), 'Could not close the Optimize Imports preview');
    return 'apply';
  } });
  assert.strictEqual(optimizeDocument.getText(), optimizeOriginal, 'Optimize Imports applied after its preview was closed');
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
      const diffs = vscode.window.tabGroups.all.flatMap((group) => group.tabs)
        .filter((tab) => tab.label.includes('Extract interface C3ExtractableInterface'));
      assert.ok(diffs.length >= 2,
      'Extract Interface did not show source and new interface diffs');
      for (const tab of diffs) {
        assert.ok(tab.input instanceof vscode.TabInputTextDiff, 'Extract preview did not open a text diff');
        const original = await vscode.workspace.openTextDocument(tab.input.original);
        const modified = await vscode.workspace.openTextDocument(tab.input.modified);
        assert.strictEqual(original.isDirty, false, 'Extract original preview is editable');
        assert.strictEqual(modified.isDirty, false, 'Extract modified preview is editable');
        assert.strictEqual(original.uri.scheme, 'sophp-rename-preview', 'Extract original is not a read-only snapshot');
        assert.strictEqual(modified.uri.scheme, 'sophp-rename-preview', 'Extract result is not a read-only snapshot');
      }
      return 'cancel';
    } });
  await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri), 'Cancelling Extract Interface created the target');
  assert.ok(!vscode.window.tabGroups.all.flatMap((group) => group.tabs)
    .some((tab) => tab.label.includes('Extract interface C3ExtractableInterface')),
  'Cancelling Extract Interface left preview tabs open');
  const closedExtractAction = await extractAction();
  await vscode.commands.executeCommand(closedExtractAction.command!.command, ...closedExtractAction.command!.arguments ?? [],
    { testPreviewAction: async () => {
      const previews = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
        tab.label.includes('Extract interface C3ExtractableInterface'));
      assert.ok(previews.length >= 2, 'Extract Interface did not open source and target previews');
      assert.ok(await vscode.window.tabGroups.close(previews[0]!), 'Could not close an Extract preview');
      return 'apply';
    } });
  await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri), 'Extract applied after a preview was closed');
  assert.strictEqual(classDocument.getText(), classSource, 'Closing an Extract preview changed the source');
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
  const diskTargetUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3ClosedDiskTarget.php');
  const diskTargetSource = '<?php\nnamespace App\\Service;\nfunction closedTarget(): int { return 1; }\n';
  const diskTargetChanged = '// external write during preview\n' + diskTargetSource;
  await vscode.workspace.fs.writeFile(diskTargetUri, Buffer.from(diskTargetSource));
  const diskTargetEdit = new vscode.WorkspaceEdit();
  diskTargetEdit.replace(inlineUri, new vscode.Range(2, 9, 2, 20), 'makeFromDisk');
  diskTargetEdit.replace(diskTargetUri, new vscode.Range(2, 9, 2, 21), 'renamedTarget');
  const diskTargetRequest = { edit: diskTargetEdit, title: 'Closed target refactor', sourceUri: inlineUri,
    sourceVersion: inlineDocument.version, sourceText: inlineDocument.getText(),
    targetHashes: { [diskTargetUri.toString()]: createHash('sha256').update(diskTargetSource).digest('hex') } };
  await vscode.commands.executeCommand('phpCompanion.applyPreviewedExtract', diskTargetRequest,
    { testPreviewAction: async () => {
      assert.ok(!vscode.workspace.textDocuments.some((document) => document.uri.toString() === diskTargetUri.toString()),
        'Preview opened a closed refactor target in the editor model');
      await vscode.workspace.fs.writeFile(diskTargetUri, Buffer.from(diskTargetChanged));
      return 'apply';
    } });
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(diskTargetUri)).toString('utf8'), diskTargetChanged,
    'Extract overwrote a closed target changed on disk during preview');
  assert.ok(!inlineDocument.getText().includes('makeFromDisk'), 'Extract partially applied a stale disk plan');
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
  const addParameterUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3AddPrivateParameter.php');
  const addParameterSource = '<?php\nnamespace App\\Service;\nfinal class C3AddPrivateParameter {\n    /**\n     * @param string $prefix\n     * @return string\n     */\n    private function format(string $prefix): string { return $prefix; }\n    public function run(): void { $this->format("a"); $this->format(prefix: "b"); }\n}\n';
  await vscode.workspace.fs.writeFile(addParameterUri, Buffer.from(addParameterSource));
  const addParameterDocument = await vscode.workspace.openTextDocument(addParameterUri);
  await vscode.window.showTextDocument(addParameterDocument);
  const addPosition = addParameterDocument.positionAt(addParameterSource.indexOf('format(string') + 1);
  const requestAddPlan = (): Thenable<{ changes?: Record<string, unknown> } | null> =>
    api.requestLanguageServer('phpCompanion/addMethodParameter', {
      textDocument: { uri: addParameterUri.toString() }, position: addPosition, name: 'suffix', type: 'string', value: '"x"',
    });
  let addPlan = await requestAddPlan();
  for (let attempt = 0; attempt < 100 && !addPlan?.changes?.[addParameterUri.toString()]; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    addPlan = await requestAddPlan();
  }
  assert.ok(addPlan?.changes?.[addParameterUri.toString()], `Language Server omitted the Add Parameter plan: ${JSON.stringify(addPlan)}`);
  const addParameter = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.addMethodParameter', {
      uri: addParameterUri, position: addPosition, name: 'suffix', type: 'string', value: '"x"', testPreviewAction,
    });
  assert.strictEqual(await addParameter(async () => 'cancel'), true);
  assert.strictEqual(addParameterDocument.getText(), addParameterSource, 'Cancelling Add Parameter changed the file');
  assert.strictEqual(await addParameter(async () => 'apply'), true);
  assert.ok(addParameterDocument.getText().includes('format(string $prefix, string $suffix)'));
  assert.ok(addParameterDocument.getText().includes('* @param string $suffix'));
  assert.ok(addParameterDocument.getText().includes('format("a", "x")'));
  assert.ok(addParameterDocument.getText().includes('format(prefix: "b", suffix: "x")'));
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(addParameterDocument.getText(), addParameterSource, 'One Undo did not restore Add Parameter');
  await vscode.commands.executeCommand('redo');
  assert.ok(addParameterDocument.getText().includes('format(string $prefix, string $suffix)'), 'One Redo did not restore Add Parameter');
  const contractUri = vscode.Uri.joinPath(folder.uri, 'src', 'Contract', 'C3SignatureContract.php');
  const firstUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3SignatureFirst.php');
  const secondSignatureUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3SignatureSecond.php');
  const callerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3SignatureCaller.php');
  const contractSource = '<?php\nnamespace App\\Contract;\ninterface C3SignatureContract { /** @param string $value */ public function send(string $value): string; }\n';
  const firstSource = '<?php\nnamespace App\\Service;\nuse App\\Contract\\C3SignatureContract;\nfinal class C3SignatureFirst implements C3SignatureContract { /** @param string $payload */ public function send(string $payload): string { return $payload; } }\n';
  const secondSignatureSource = '<?php\nnamespace App\\Service;\nuse App\\Contract\\C3SignatureContract;\nfinal class C3SignatureSecond implements C3SignatureContract { /** @param string $data */ public function send(string $data): string { return $data; } }\n';
  const callerSource = '<?php\nnamespace App\\Controller;\nuse App\\Contract\\C3SignatureContract;\nuse App\\Service\\C3SignatureFirst;\nuse App\\Service\\C3SignatureSecond;\nfinal class C3SignatureCaller { public function run(C3SignatureContract $contract, C3SignatureFirst $first, C3SignatureSecond $second): void { $contract->send(value: "a"); $first->send(payload: "b"); $second->send(data: "c"); } }\n';
  const signatureFiles: Array<[vscode.Uri, string]> = [[contractUri, contractSource], [firstUri, firstSource],
    [secondSignatureUri, secondSignatureSource], [callerUri, callerSource]];
  await Promise.all(signatureFiles.map(([uri, source]) => vscode.workspace.fs.writeFile(uri, Buffer.from(source))));
  const contractDocument = await vscode.workspace.openTextDocument(contractUri);
  await vscode.window.showTextDocument(contractDocument);
  const contractPosition = contractDocument.positionAt(contractSource.indexOf('$value', contractSource.indexOf('function send')) + 2);
  const familyReferences = async (): Promise<vscode.Location[]> => await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', contractUri, contractPosition) ?? [];
  for (let attempt = 0; attempt < 100 && !(await familyReferences()).some((item) => item.uri.toString() === callerUri.toString()); attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 50));
  const references = await familyReferences();
  for (const uri of [firstUri, secondSignatureUri, callerUri]) assert.ok(
    references.some((item) => item.uri.toString() === uri.toString()), `Parameter References omitted ${uri.path}`);
  const callerDocument = await vscode.workspace.openTextDocument(callerUri);
  const namedPosition = callerDocument.positionAt(callerSource.indexOf('value:') + 2);
  const namedReferences = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', callerUri, namedPosition) ?? [];
  for (const uri of [contractUri, firstUri, secondSignatureUri]) assert.ok(
    namedReferences.some((item) => item.uri.toString() === uri.toString()), `Named argument References omitted ${uri.path}`);
  const renameFamilyParameter = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
      uri: contractUri, position: contractPosition, newName: 'message', testPreviewAction,
    });
  assert.strictEqual(await renameFamilyParameter(async () => {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs)
      .filter((tab) => tab.label.startsWith('SoPHP Rename: message ('));
    assert.strictEqual(tabs.length, 1, 'Change Signature did not preview all four files together');
    assert.ok(tabs[0]!.label.includes('4 files'), 'Change Signature preview omitted a participant');
    return 'cancel';
  }), false, 'Cancelling the parameter Rename changed the signature');
  for (const [uri, source] of signatureFiles)
    assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(), source, `Cancelling Change Signature changed ${uri.path}`);
  assert.strictEqual(await renameFamilyParameter(async () => 'apply'), true, 'Parameter Rename did not apply across the method family');
  assert.ok((await vscode.workspace.openTextDocument(contractUri)).getText().includes('send(string $message)'));
  assert.ok((await vscode.workspace.openTextDocument(firstUri)).getText().includes('send(string $message)'));
  assert.ok((await vscode.workspace.openTextDocument(secondSignatureUri)).getText().includes('send(string $message)'));
  assert.ok((await vscode.workspace.openTextDocument(callerUri)).getText().includes('send(message: "a")'));
  await vscode.commands.executeCommand('undo');
  for (const [uri, source] of signatureFiles)
    assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(), source, `One Undo did not restore ${uri.path}`);
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(callerUri)).getText().includes('send(message: "a")'),
    'One Redo did not restore the named arguments');
  const familyBeforeAdd = new Map(await Promise.all(signatureFiles.map(async ([uri]) =>
    [uri.toString(), (await vscode.workspace.openTextDocument(uri)).getText()] as const)));
  const addFamilyPosition = contractDocument.positionAt(contractDocument.getText().indexOf('send(string') + 1);
  const familyPlan = await api.requestLanguageServer<{ changes?: Record<string, unknown> } | null>('phpCompanion/addMethodParameter', {
    textDocument: { uri: contractUri.toString() }, position: addFamilyPosition,
    name: 'context', type: 'string', value: '"web"',
  });
  assert.ok(familyPlan?.changes?.[contractUri.toString()], `Language Server omitted method-family Add Parameter: ${JSON.stringify(familyPlan)}`);
  const addFamilyParameter = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.addMethodParameter', {
      uri: contractUri, position: addFamilyPosition, name: 'context', type: 'string', value: '"web"', testPreviewAction,
    });
  assert.strictEqual(await addFamilyParameter(async () => {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs)
      .filter((tab) => tab.label.includes('Add parameter $context:'));
    assert.strictEqual(tabs.length, 4, 'Add Parameter did not preview every method-family file');
    return 'cancel';
  }), true);
  for (const [uri] of signatureFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(),
    familyBeforeAdd.get(uri.toString()), `Cancelling method-family Add Parameter changed ${uri.path}`);
  assert.strictEqual(await addFamilyParameter(async () => 'apply'), true);
  for (const uri of [contractUri, firstUri, secondSignatureUri]) assert.ok(
    (await vscode.workspace.openTextDocument(uri)).getText().includes('string $context'),
    `Add Parameter omitted ${uri.path}`);
  assert.ok((await vscode.workspace.openTextDocument(callerUri)).getText().includes('send(message: "a", context: "web")'));
  assert.ok((await vscode.workspace.openTextDocument(callerUri)).getText().includes('send("b", context: "web")')
    || (await vscode.workspace.openTextDocument(callerUri)).getText().includes('send(message: "b", context: "web")'));
  await vscode.commands.executeCommand('undo');
  for (const [uri] of signatureFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(),
    familyBeforeAdd.get(uri.toString()), `One Undo did not restore method-family Add Parameter in ${uri.path}`);
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(callerUri)).getText().includes('send(message: "a", context: "web")'));
  const familyBeforeRemove = new Map(await Promise.all(signatureFiles.map(async ([uri]) =>
    [uri.toString(), (await vscode.workspace.openTextDocument(uri)).getText()] as const)));
  const removeFamilyPosition = contractDocument.positionAt(contractDocument.getText().indexOf('$context',
    contractDocument.getText().indexOf('function send')) + 2);
  const removeFamilyPlan = await api.requestLanguageServer<{ changes?: Record<string, unknown> } | null>(
    'phpCompanion/removeMethodParameter', { textDocument: { uri: contractUri.toString() }, position: removeFamilyPosition });
  assert.strictEqual(Object.keys(removeFamilyPlan?.changes ?? {}).length, 4,
    `Language Server omitted method-family Remove Parameter: ${JSON.stringify(removeFamilyPlan)}`);
  const removeFamilyParameter = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.removeMethodParameter', {
      uri: contractUri, position: removeFamilyPosition, testPreviewAction,
    });
  assert.strictEqual(await removeFamilyParameter(async () => {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs)
      .filter((tab) => tab.label.includes('Remove method parameter:'));
    assert.strictEqual(tabs.length, 4, 'Remove Parameter did not preview every method-family file');
    return 'cancel';
  }), true);
  for (const [uri] of signatureFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(),
    familyBeforeRemove.get(uri.toString()), `Cancelling method-family Remove Parameter changed ${uri.path}`);
  assert.strictEqual(await removeFamilyParameter(async () => 'apply'), true);
  for (const uri of [contractUri, firstUri, secondSignatureUri]) {
    const source = (await vscode.workspace.openTextDocument(uri)).getText();
    assert.ok(!source.includes('$context') && !source.includes('@param string $context'),
      `Remove Parameter omitted ${uri.path}`);
  }
  assert.ok(!(await vscode.workspace.openTextDocument(callerUri)).getText().includes('context: "web"'));
  await vscode.commands.executeCommand('undo');
  for (const [uri] of signatureFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(),
    familyBeforeRemove.get(uri.toString()), `One Undo did not restore method-family Remove Parameter in ${uri.path}`);
  await vscode.commands.executeCommand('redo');
  assert.ok(!(await vscode.workspace.openTextDocument(callerUri)).getText().includes('context: "web"'));
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
  const safeRename = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
      uri: renameUri, position: renamePosition, newName: 'updatedValue', testPreviewAction,
    });
  assert.strictEqual(await safeRename(async () => {
    const preview = vscode.window.activeTextEditor?.document;
    assert.ok(preview && preview.getText().includes('$updatedValue'),
      'SoPHP Rename did not show the proposed edit before confirmation');
    assert.strictEqual(preview.uri.scheme, 'sophp-rename-preview');
    assert.strictEqual(preview.isDirty, false, 'Rename preview must not create an unsaved editable document');
    return 'cancel';
  }), false);
  const hasRenamePreviewTab = (): boolean => vscode.window.tabGroups.all.flatMap((group) => group.tabs).some((tab) =>
    tab.input instanceof vscode.TabInputTextDiff && tab.input.original.scheme === 'sophp-rename-preview');
  assert.strictEqual(hasRenamePreviewTab(), false, 'Cancelling Rename left a preview diff open');
  assert.strictEqual(renameDocument.getText(), renameSource, 'Cancelling SoPHP Rename changed the source');
  assert.strictEqual(await safeRename(async () => {
    const previews = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
      tab.input instanceof vscode.TabInputTextDiff && tab.input.original.scheme === 'sophp-rename-preview');
    assert.strictEqual(previews.length, 1, 'Rename did not open one preview for this local variable');
    assert.ok(await vscode.window.tabGroups.close(previews), 'Could not close the Rename preview');
    return 'apply';
  }), false, 'Rename applied after its preview was closed');
  assert.strictEqual(renameDocument.getText(), renameSource, 'Closing the Rename preview changed the source');
  assert.strictEqual(await safeRename(async () => {
    const changed = new vscode.WorkspaceEdit();
    changed.insert(renameUri, new vscode.Position(1, 0), '// edited during SoPHP Rename preview\n');
    assert.ok(await vscode.workspace.applyEdit(changed));
    return 'apply';
  }), false, 'SoPHP Rename accepted an old preview after the source changed');
  assert.ok(renameDocument.getText().includes('edited during SoPHP Rename preview') && renameDocument.getText().includes('$value'));
  await vscode.window.showTextDocument(renameDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(renameDocument.getText(), renameSource);
  assert.strictEqual(await safeRename(async () => 'apply'), true, 'SoPHP Rename did not apply a confirmed preview');
  assert.strictEqual(hasRenamePreviewTab(), false, 'Applying Rename left a stale preview diff open');
  assert.ok(renameDocument.getText().includes('$updatedValue') && !renameDocument.getText().includes('$value'));
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(renameDocument.getText(), renameSource, 'One Undo did not restore the SoPHP Rename source');
  await vscode.commands.executeCommand('redo');
  assert.ok(renameDocument.getText().includes('$updatedValue'), 'One Redo did not restore SoPHP Rename');
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
  const safeTypeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3SafeType.php');
  const renamedTypeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3RenamedType.php');
  const safeConsumerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3SafeTypeConsumer.php');
  const safeTypeSource = '<?php\nnamespace App\\Service;\nfinal class C3SafeType {}\n';
  const safeConsumerSource = '<?php\nnamespace App\\Controller;\nuse App\\Service\\C3SafeType;\nfinal class C3SafeTypeConsumer { public function run(C3SafeType $item): void {} }\n';
  await vscode.workspace.fs.writeFile(safeTypeUri, Buffer.from(safeTypeSource));
  await vscode.workspace.fs.writeFile(safeConsumerUri, Buffer.from(safeConsumerSource));
  const safeConsumerDocument = await vscode.workspace.openTextDocument(safeConsumerUri);
  await vscode.window.showTextDocument(safeConsumerDocument);
  const safeTypeDocument = await vscode.workspace.openTextDocument(safeTypeUri);
  await vscode.window.showTextDocument(safeTypeDocument);
  const safeTypePosition = safeTypeDocument.positionAt(safeTypeSource.indexOf('class C3SafeType') + 'class '.length + 3);
  const safeConsumerReady = async (): Promise<boolean> => {
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', safeTypeUri, safeTypePosition);
    return references?.some((item) => item.uri.toString() === safeConsumerUri.toString()) ?? false;
  };
  for (let attempt = 0; attempt < 100 && !await safeConsumerReady(); attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(await safeConsumerReady(), 'New PSR-4 consumer was not indexed before Safe Rename');
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
    uri: safeTypeUri, position: safeTypePosition, newName: 'C3RenamedType', testPreviewAction: async () => {
      assert.ok(vscode.window.tabGroups.all.flatMap((group) => group.tabs).some((tab) => tab.label.includes('C3SafeType.php')),
        'SoPHP type Rename did not show the declaration or file move preview');
      return 'apply';
    },
  }), true, 'SoPHP Rename did not apply the PSR-4 file move');
  await assert.rejects(async () => vscode.workspace.fs.stat(safeTypeUri));
  assert.ok((await vscode.workspace.openTextDocument(renamedTypeUri)).getText().includes('class C3RenamedType'));
  assert.ok((await vscode.workspace.openTextDocument(safeConsumerUri)).getText().includes('C3RenamedType'));
  await vscode.commands.executeCommand('undo');
  assert.ok((await vscode.workspace.openTextDocument(safeTypeUri)).getText().includes('class C3SafeType'));
  await assert.rejects(async () => vscode.workspace.fs.stat(renamedTypeUri));
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(renamedTypeUri)).getText().includes('class C3RenamedType'));
  const diskRaceTypeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3DiskRaceType.php');
  const diskRaceNewUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3DiskRaceRenamed.php');
  const diskRaceConsumerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3DiskRaceConsumer.php');
  const diskRaceTypeSource = '<?php\nnamespace App\\Service;\nfinal class C3DiskRaceType {}\n';
  const diskRaceConsumerSource = '<?php\nnamespace App\\Controller;\nuse App\\Service\\C3DiskRaceType;\nfinal class C3DiskRaceConsumer { public function run(C3DiskRaceType $item): void {} }\n// original marker\n';
  await writeFile(diskRaceTypeUri.fsPath, diskRaceTypeSource);
  await writeFile(diskRaceConsumerUri.fsPath, diskRaceConsumerSource);
  const diskRaceTypeDocument = await vscode.workspace.openTextDocument(diskRaceTypeUri);
  await vscode.window.showTextDocument(diskRaceTypeDocument);
  const diskRacePosition = diskRaceTypeDocument.positionAt(diskRaceTypeSource.indexOf('class C3DiskRaceType') + 'class '.length + 3);
  const diskRaceReferences = async (): Promise<boolean> => {
    const locations = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', diskRaceTypeUri, diskRacePosition);
    return locations?.some((item) => item.uri.toString() === diskRaceConsumerUri.toString()) ?? false;
  };
  for (let attempt = 0; attempt < 100 && !await diskRaceReferences(); attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(await diskRaceReferences(), 'Disk race consumer was not indexed before Rename');
  assert.ok(!vscode.workspace.textDocuments.some((item) => item.uri.toString() === diskRaceConsumerUri.toString()),
    'Disk race consumer remained open before preview');
  const diskRaceChangedConsumer = diskRaceConsumerSource.replace('original marker', 'external marker during preview');
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
    uri: diskRaceTypeUri, position: diskRacePosition, newName: 'C3DiskRaceRenamed', testPreviewAction: async () => {
      assert.ok(!vscode.workspace.textDocuments.some((item) => item.uri.toString() === diskRaceConsumerUri.toString()),
        'Rename preview opened its closed disk race target');
      await writeFile(diskRaceConsumerUri.fsPath, diskRaceChangedConsumer);
      assert.strictEqual(await readFile(diskRaceConsumerUri.fsPath, 'utf8'), diskRaceChangedConsumer);
      return 'apply';
    },
  }), false, 'Rename applied stale edits after an external disk change during preview');
  assert.strictEqual(await readFile(diskRaceConsumerUri.fsPath, 'utf8'), diskRaceChangedConsumer,
    'Rename did not preserve the external disk edit');
  assert.ok((await vscode.workspace.openTextDocument(diskRaceTypeUri)).getText().includes('class C3DiskRaceType'));
  await assert.rejects(async () => vscode.workspace.fs.stat(diskRaceNewUri));
  const groupedTypeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3GroupedType.php');
  const groupedNewUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3GroupedRenamed.php');
  const groupedSource = '<?php\nnamespace App\\Service;\nfinal class C3GroupedType {}\n';
  await vscode.workspace.fs.writeFile(groupedTypeUri, Buffer.from(groupedSource));
  const groupedConsumers = Array.from({ length: 21 }, (_, index) =>
    vscode.Uri.joinPath(folder.uri, 'src', 'Controller', `C3GroupedConsumer${index}.php`));
  for (const [index, consumer] of groupedConsumers.entries()) await vscode.workspace.fs.writeFile(consumer,
    Buffer.from(`<?php\nnamespace App\\Controller;\nuse App\\Service\\C3GroupedType;\nfinal class C3GroupedConsumer${index} { public function run(C3GroupedType $item): void {} }\n`));
  const groupedDocument = await vscode.workspace.openTextDocument(groupedTypeUri);
  await vscode.window.showTextDocument(groupedDocument);
  const groupedPosition = groupedDocument.positionAt(groupedSource.indexOf('class C3GroupedType') + 'class '.length + 3);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', groupedTypeUri, groupedPosition);
    if (groupedConsumers.every((consumer) => references?.some((reference) => reference.uri.toString() === consumer.toString()))) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const groupedReferences = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', groupedTypeUri, groupedPosition);
  assert.ok(groupedConsumers.every((consumer) => groupedReferences?.some((reference) => reference.uri.toString() === consumer.toString())),
    'Grouped Rename fixture was not fully indexed');
  const groupedRename = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
      uri: groupedTypeUri, position: groupedPosition, newName: 'C3GroupedRenamed', testPreviewAction,
    });
  assert.strictEqual(await groupedRename(async () => {
    const changesTabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs)
      .filter((tab) => tab.label.startsWith('SoPHP Rename: C3GroupedRenamed ('));
    assert.strictEqual(changesTabs.length, 2, 'Grouped Rename did not split 22 files into two changes tabs');
    assert.ok(changesTabs.some((tab) => tab.label.includes('1–20 / 22 files'))
      && changesTabs.some((tab) => tab.label.includes('21–22 / 22 files')),
    'Grouped Rename did not show the complete file range in both tabs');
    return 'cancel';
  }), false);
  assert.ok(!vscode.window.tabGroups.all.flatMap((group) => group.tabs)
    .some((tab) => tab.label.startsWith('SoPHP Rename: C3GroupedRenamed (')),
  'Cancelling grouped Rename left the changes tab open');
  assert.strictEqual(await groupedRename(async () => {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs)
      .filter((tab) => tab.label.startsWith('SoPHP Rename: C3GroupedRenamed ('));
    assert.strictEqual(tabs.length, 2, 'Grouped Rename did not open both preview groups');
    assert.ok(await vscode.window.tabGroups.close(tabs[0]!), 'Could not close a grouped Rename preview');
    return 'apply';
  }), false, 'Grouped Rename applied after one preview group was closed');
  assert.ok((await vscode.workspace.openTextDocument(groupedTypeUri)).getText().includes('class C3GroupedType'),
    'Closing one grouped Rename preview changed the source');
  assert.strictEqual(await groupedRename(async () => {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs)
      .filter((tab) => tab.label.startsWith('SoPHP Rename: C3GroupedRenamed ('));
    assert.strictEqual(tabs.length, 2, 'Grouped Rename did not keep both changes tabs visible');
    assert.ok(tabs.every((tab) => !tab.isPreview), 'Grouped Rename changes tabs were not pinned');
    return 'apply';
  }), true, 'Grouped Rename did not apply');
  assert.ok(!vscode.window.tabGroups.all.flatMap((group) => group.tabs)
    .some((tab) => tab.label.startsWith('SoPHP Rename: C3GroupedRenamed (')),
  'Applying grouped Rename left a changes tab open');
  assert.ok((await vscode.workspace.openTextDocument(groupedNewUri)).getText().includes('class C3GroupedRenamed'));
  for (const consumer of groupedConsumers) assert.ok((await vscode.workspace.openTextDocument(consumer)).getText().includes('C3GroupedRenamed'));
  await vscode.commands.executeCommand('undo');
  assert.ok((await vscode.workspace.openTextDocument(groupedTypeUri)).getText().includes('class C3GroupedType'));
  for (const consumer of groupedConsumers) assert.ok((await vscode.workspace.openTextDocument(consumer)).getText().includes('C3GroupedType'));
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(groupedNewUri)).getText().includes('class C3GroupedRenamed'));
  for (const consumer of groupedConsumers) assert.ok((await vscode.workspace.openTextDocument(consumer)).getText().includes('C3GroupedRenamed'));
  const moveSourceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3MovePreview.php');
  const moveTargetUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3MovePreview.php');
  const moveSource = '<?php\nnamespace App\\Service;\nfinal class C3MovePreview {}\n';
  await vscode.workspace.fs.writeFile(moveSourceUri, Buffer.from(moveSource));
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(moveSourceUri));
  const movePreview = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<void> =>
    vscode.commands.executeCommand('phpCompanion.safeMove', moveSourceUri, moveTargetUri, { preview: true, testPreviewAction });
  await movePreview(async () => {
    const diffs = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
      tab.input instanceof vscode.TabInputTextDiff && tab.label.includes('C3MovePreview.php'));
    assert.ok(diffs.some((tab) => tab.label.includes('Controller/C3MovePreview.php')),
      'Safe Move preview omitted the destination path');
    for (const tab of diffs) {
      assert.ok(tab.input instanceof vscode.TabInputTextDiff);
      const baseline = await vscode.workspace.openTextDocument(tab.input.original);
      const preview = await vscode.workspace.openTextDocument(tab.input.modified);
      assert.strictEqual(baseline.uri.scheme, 'sophp-rename-preview');
      assert.strictEqual(preview.uri.scheme, 'sophp-rename-preview');
      assert.strictEqual(baseline.isDirty, false);
      assert.strictEqual(preview.isDirty, false);
    }
    return 'cancel';
  });
  assert.ok(!vscode.window.tabGroups.all.flatMap((group) => group.tabs).some((tab) =>
    tab.input instanceof vscode.TabInputTextDiff && tab.label.includes('C3MovePreview.php')),
  'Cancelling Safe Move left a preview diff open');
  assert.strictEqual((await vscode.workspace.openTextDocument(moveSourceUri)).getText(), moveSource);
  await assert.rejects(async () => vscode.workspace.fs.stat(moveTargetUri));
  await movePreview(async () => {
    const previews = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
      tab.input instanceof vscode.TabInputTextDiff && tab.label.includes('C3MovePreview.php'));
    assert.ok(previews.length >= 1, 'Safe Move did not open its preview');
    assert.ok(await vscode.window.tabGroups.close(previews[0]!), 'Could not close a Safe Move preview');
    return 'apply';
  });
  assert.strictEqual((await vscode.workspace.openTextDocument(moveSourceUri)).getText(), moveSource,
    'Safe Move applied after its preview was closed');
  await assert.rejects(async () => vscode.workspace.fs.stat(moveTargetUri));
  await movePreview(async () => 'apply');
  assert.ok((await vscode.workspace.openTextDocument(moveTargetUri)).getText().includes('namespace App\\Controller;'));
  await assert.rejects(async () => vscode.workspace.fs.stat(moveSourceUri));
  await vscode.commands.executeCommand('undo');
  assert.ok((await vscode.workspace.openTextDocument(moveSourceUri)).getText().includes('namespace App\\Service;'));
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(moveTargetUri)).getText().includes('namespace App\\Controller;'));
  const symfonyExtension = vscode.extensions.getExtension('sohophp.php-companion-symfony');
  assert.ok(symfonyExtension, 'C3 Symfony Rename test requires the independent extension');
  await symfonyExtension.activate();
  const servicesUri = vscode.Uri.joinPath(folder.uri, 'config', 'services.yaml');
  const xmlServicesUri = vscode.Uri.joinPath(folder.uri, 'config', 'services.xml');
  const servicesDocument = await vscode.workspace.openTextDocument(servicesUri);
  const xmlServicesSource = Buffer.from(await vscode.workspace.fs.readFile(xmlServicesUri)).toString('utf8');
  assert.ok(!vscode.workspace.textDocuments.some((item) => item.uri.toString() === xmlServicesUri.toString()),
    'Symfony XML target must remain closed for the disk snapshot regression');
  await vscode.window.showTextDocument(servicesDocument);
  const servicePosition = servicesDocument.positionAt(servicesDocument.getText().indexOf('app.mailer:') + 3);
  let readyServiceRename: vscode.WorkspaceEdit | undefined;
  for (let attempt = 0; attempt < 100 && !readyServiceRename; attempt += 1) {
    readyServiceRename = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
      'vscode.executeDocumentRenameProvider', servicesUri, servicePosition, 'app.mailer_renamed');
    if (!readyServiceRename) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(readyServiceRename?.entries().some(([uri]) => uri.toString() === xmlServicesUri.toString()),
    'Symfony service Rename fixture did not include the closed XML reference');
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testPauseNextQuery', { method: 'symfonyRename' }), true);
  const heldServiceRename = vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
    'vscode.executeDocumentRenameProvider', servicesUri, servicePosition, 'app.mailer_renamed')
    .then((edit) => edit, (error: unknown) => {
      assert.match(error instanceof Error ? error.message : String(error), /Canceled|changed|Rename/);
      return undefined;
    });
  await waitForState(api, 'symfonyRename', servicesDocument, (state) => state.paused,
    'Symfony service Rename response was not held before the XML reference changed');
  const changedXml = xmlServicesSource.replace('</container>', '  <!-- external edit during Rename -->\n</container>');
  await vscode.workspace.fs.writeFile(xmlServicesUri, Buffer.from(changedXml));
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testReleaseQuery', { method: 'symfonyRename' }), true);
  assert.strictEqual(await heldServiceRename, undefined,
    'Symfony Rename returned a stale WorkspaceEdit after a closed XML reference changed');
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(xmlServicesUri)).toString('utf8'), changedXml);
  assert.ok(servicesDocument.getText().includes('app.mailer:'));
  const containerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'ContainerConsumer.php');
  const containerDocument = await vscode.workspace.openTextDocument(containerUri);
  await vscode.window.showTextDocument(containerDocument);
  const containerPosition = containerDocument.positionAt(containerDocument.getText().indexOf("get('app.mailer')") + 7);
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
    uri: containerUri, position: containerPosition, newName: 'app.mailer_safe', testPreviewAction: async () => {
      const labels = vscode.window.tabGroups.all.flatMap((group) => group.tabs).map((tab) => tab.label);
      assert.ok(labels.some((label) => label.includes('services.yaml')) && labels.some((label) => label.includes('services.xml')),
        'SoPHP Rename did not preview Symfony YAML and XML targets');
      assert.ok(!vscode.workspace.textDocuments.some((item) => item.uri.toString() === xmlServicesUri.toString()),
        'Rename preview opened a previously closed XML target');
      return 'cancel';
    },
  }), false, 'Cancelling a cross-format SoPHP Rename changed files');
  assert.ok(servicesDocument.getText().includes('app.mailer:'));
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
  const propertyFix = async (): Promise<vscode.CodeAction | undefined> => {
    const fixes = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', dynamicUri, property.range, vscode.CodeActionKind.QuickFix.value);
    return fixes.find((action): action is vscode.CodeAction => 'edit' in action && action.title.includes('Declare property $created'));
  };
  let declare = await propertyFix();
  for (let attempt = 0; attempt < 100 && !declare?.edit; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    declare = await propertyFix();
  }
  assert.ok(declare?.edit, 'C3 dynamic property Quick Fix was unavailable after diagnostic publication');
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
  if (process.env.PHP_COMPANION_TEST_C3_OPEN_SOURCE_PROFILE === '1') {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    assert.deepStrictEqual(profileRenameErrors, [],
      'Open Source Pack emitted an unhandled stale-file read during C3 Rename');
  }
  console.log('C3 held server import requests: addImport, planTypeImports, organizeImports; all rejected stale edits.');
  console.log('C3 PHP type generation: preview, cancel, apply and one Undo passed; Redo remains open.');
}

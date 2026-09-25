import * as assert from 'node:assert';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import * as vscode from 'vscode';

type QueryState = { paused: boolean; version: number | null };
type TestApi = { requestLanguageServer<T>(method: string, params: unknown): Promise<T> };

async function waitFor(check: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail(message);
}

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
  startCommand: () => Thenable<boolean>, staleEditAbsent: () => boolean): Promise<void> {
  await vscode.window.showTextDocument(document);
  const original = document.getText();
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testPauseNextQuery', { method }), true,
    `Could not arm the ${method} request pause`);
  const command = startCommand();
  let paused = false;
  try {
    await waitForState(api, method, document, (state) => state.paused && state.version === document.version,
      `${method} did not pause with the original document version`);
    paused = true;
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, document.positionAt(document.getText().length), '\n// Edited while the server held an import response.\n');
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not edit the document while ${method} was paused`);
    assert.ok(document.isDirty, `${method} unexpectedly saved the user edit`);
    await waitForState(api, method, document, (state) => state.paused && state.version === document.version,
      `${method} did not observe the new document version before release`);
  } finally {
    const released = await api.requestLanguageServer<boolean>('phpCompanion/testReleaseQuery', { method });
    if (paused) assert.strictEqual(released, true, `Could not release the paused ${method} request`);
  }
  assert.strictEqual(await command, false, `${method} reported success after the document changed during planning`);
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
  const phpunitProfile = process.env.PHP_COMPANION_TEST_C3_PHPUNIT_PAIR_PROFILE === '1'
    || process.env.PHP_COMPANION_TEST_TEST_PROVIDER_ID !== undefined;
  const testProviderId = process.env.PHP_COMPANION_TEST_TEST_PROVIDER_ID ?? 'recca0120.vscode-phpunit';
  const openSourceProfile = process.env.PHP_COMPANION_TEST_C3_OPEN_SOURCE_PROFILE === '1';
  const configuredTestProfile = phpunitProfile || openSourceProfile;
  const profileRenameErrors: string[] = [];
  if (phpunitProfile) process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    if (message.includes('ENOENT') && (message.includes('C3GroupedType.php')
      || message.includes('/tests/'))) profileRenameErrors.push(message);
  });
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load');
  if (openSourceProfile) {
    const pack = vscode.extensions.getExtension('sohophp.php-companion-open-source-pack');
    assert.ok(pack, 'C3 Open Source Profile did not load the Pack');
    const members = pack.packageJSON.extensionPack as string[];
    assert.strictEqual(members.length, 10, 'C3 Open Source Profile did not use the current 10-member Pack');
    for (const id of members) assert.ok(vscode.extensions.getExtension(id), `C3 Open Source Profile is missing ${id}`);
    assert.ok(!vscode.extensions.getExtension('bmewburn.vscode-intelephense-client'),
      'C3 Open Source Profile has a second general PHP language server');
    assert.ok(!vscode.extensions.getExtension('symfony.language-tools'),
      'C3 Open Source Profile has a conflicting Symfony Rename provider');
    assert.ok(!vscode.extensions.getExtension('recca0120.vscode-phpunit'),
      'C3 Open Source Profile included the rejected PHPUnit provider');
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
  await vscode.window.showTextDocument(importDocument);
  const importPosition = importDocument.positionAt(importOffset + 1);
  let importCandidates: Array<{ fqcn: string }> = [];
  const importReadyDeadline = Date.now() + 30_000;
  while (Date.now() < importReadyDeadline) {
    importCandidates = await api.requestLanguageServer<Array<{ fqcn: string }>>('phpCompanion/importCandidates', {
      textDocument: { uri: importUri.toString() }, position: importPosition, name: 'UserService',
    });
    if (importCandidates.some((candidate) => candidate.fqcn === 'App\\Service\\UserService')) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(importCandidates.some((candidate) => candidate.fqcn === 'App\\Service\\UserService'),
    `The Composer import candidate was not ready: ${JSON.stringify(importCandidates)}`);
  await verifyEditDuringRequest(api, 'addImport', importDocument,
    () => vscode.commands.executeCommand<boolean>('phpCompanion.importClass', importUri, importPosition),
    () => !importDocument.getText().includes('use App\\Service\\UserService;'));
  await verifyEditDuringRequest(api, 'planTypeImports', importDocument,
    () => vscode.commands.executeCommand<boolean>('phpCompanion.resolvePastedImports'),
    () => !importDocument.getText().includes('use App\\Service\\UserService;'));
  for (const commandName of ['importClass', 'resolvePastedImports'] as const) {
    const className = commandName === 'importClass' ? 'C3ExternalImportClass' : 'C3ExternalResolveImports';
    const externalUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', `${className}.php`);
    const original = importDocument.getText().replace('ImportConsumer', className);
    const externalChange = `${original}\n// Written outside the editor while import planning completed.\n`;
    await vscode.workspace.fs.writeFile(externalUri, Buffer.from(original));
    try {
      const externalDocument = await vscode.workspace.openTextDocument(externalUri);
      await vscode.window.showTextDocument(externalDocument);
      const version = externalDocument.version;
      let planReady = false;
      const afterPlan = async (): Promise<void> => {
        planReady = true;
        await writeFile(externalUri.fsPath, externalChange);
        assert.strictEqual(externalDocument.version, version,
          `${commandName} external disk write changed the open document version before apply`);
      };
      if (commandName === 'importClass') {
        const offset = externalDocument.getText().indexOf('UserService');
        assert.ok(offset > 0);
        assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.importClass', externalUri,
          externalDocument.positionAt(offset + 1), { testAfterPlan: afterPlan }), false);
      } else {
        assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.resolvePastedImports',
          { testAfterPlan: afterPlan }), false);
      }
      assert.ok(planReady, `${commandName} did not reach the import plan`);
      assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(externalUri)).toString('utf8'), externalChange,
        `${commandName} overwrote an external disk edit`);
      assert.ok(!externalDocument.getText().includes('use App\\Service\\UserService;'),
        `${commandName} applied an import from a stale disk snapshot`);
    } finally {
      await vscode.workspace.fs.delete(externalUri);
    }
  }
  for (const commandName of ['importClass', 'resolvePastedImports'] as const) {
    const className = commandName === 'importClass' ? 'C3NormalImportClass' : 'C3NormalResolveImports';
    const normalUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', `${className}.php`);
    await vscode.workspace.fs.writeFile(normalUri, Buffer.from(importDocument.getText().replace('ImportConsumer', className)));
    try {
      const normalDocument = await vscode.workspace.openTextDocument(normalUri);
      await vscode.window.showTextDocument(normalDocument);
      const original = normalDocument.getText();
      if (commandName === 'importClass') {
        const offset = original.indexOf('UserService');
        assert.ok(offset > 0);
        assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.importClass', normalUri,
          normalDocument.positionAt(offset + 1)), true);
      } else {
        assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.resolvePastedImports'), true);
      }
      const imported = normalDocument.getText();
      assert.ok(imported.includes('use App\\Service\\UserService;'), `${commandName} rejected an unchanged PHP file`);
      await vscode.window.showTextDocument(normalDocument);
      await vscode.commands.executeCommand('undo');
      assert.strictEqual(normalDocument.getText(), original, `${commandName} could not be undone once`);
      await vscode.commands.executeCommand('redo');
      assert.strictEqual(normalDocument.getText(), imported, `${commandName} could not be redone once`);
    } finally {
      await vscode.workspace.fs.delete(normalUri);
    }
  }

  const optimizeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'OptimizeConsumer.php');
  const optimizeDocument = await vscode.workspace.openTextDocument(optimizeUri);
  await verifyEditDuringRequest(api, 'organizeImports', optimizeDocument,
    () => vscode.commands.executeCommand('phpCompanion.optimizeImports', optimizeUri, { preview: false }),
    () => optimizeDocument.getText().includes('use App\\Contract\\Runner;')
      && optimizeDocument.getText().match(/use App\\Service\\UserService;/g)?.length === 2);
  const optimizeOriginal = optimizeDocument.getText();
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.optimizeImports', optimizeUri,
    { preview: true, testPreviewAction: async () => 'cancel' }), false,
  'Cancelling Optimize Imports reported an applied edit');
  assert.strictEqual(optimizeDocument.getText(), optimizeOriginal, 'Cancelling Optimize Imports changed the document');
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.optimizeImports', optimizeUri, { preview: true, testPreviewAction: async () => {
    const previews = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
      tab.input instanceof vscode.TabInputTextDiff && tab.input.original.toString() === optimizeUri.toString());
    assert.strictEqual(previews.length, 1, 'Optimize Imports did not open one diff');
    assert.ok(previews[0]!.input instanceof vscode.TabInputTextDiff);
    assert.strictEqual(previews[0]!.input.modified.scheme, 'sophp-rename-preview', 'Optimize Imports result was not read-only');
    assert.ok(await vscode.window.tabGroups.close(previews), 'Could not close the Optimize Imports preview');
    return 'apply';
  } }), false, 'Closing Optimize Imports preview reported an applied edit');
  assert.strictEqual(optimizeDocument.getText(), optimizeOriginal, 'Optimize Imports applied after its preview was closed');
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.optimizeImports', optimizeUri,
    { preview: true, testPreviewAction: async () => 'apply' }), true,
  'Applying Optimize Imports did not report success');
  const optimizedSource = optimizeDocument.getText();
  assert.ok(!optimizedSource.includes('use App\\Contract\\Runner;')
    && optimizedSource.match(/use App\\Service\\UserService;/g)?.length === 1,
  'Optimize Imports did not remove the unused and duplicate imports');
  await vscode.window.showTextDocument(optimizeDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(optimizeDocument.getText(), optimizeOriginal, 'Optimize Imports could not be undone once');
  await vscode.commands.executeCommand('redo');
  assert.strictEqual(optimizeDocument.getText(), optimizedSource, 'Optimize Imports could not be redone once');
  for (const [commandName, failureMode] of [
    ['importClass', 'false'], ['resolvePastedImports', 'throw'], ['optimizeImports', 'false'], ['optimizeImports', 'throw'],
  ] as const) {
    const isOptimize = commandName === 'optimizeImports';
    const className = `C3ApplyFailure${commandName}${failureMode}`;
    const uri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', `${className}.php`);
    const original = (isOptimize ? optimizeOriginal : importDocument.getText())
      .replace(isOptimize ? 'OptimizeConsumer' : 'ImportConsumer', className);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
      let reachedApply = false;
      const testApplyEdit = async (edit: vscode.WorkspaceEdit): Promise<boolean> => {
        reachedApply = true;
        assert.ok(edit.entries().length > 0, `${commandName} did not prepare an edit`);
        if (failureMode === 'throw') throw new Error('C3 simulated applyEdit failure');
        return false;
      };
      const result = commandName === 'importClass'
        ? await vscode.commands.executeCommand<boolean>('phpCompanion.importClass', uri,
          document.positionAt(original.indexOf('UserService') + 1), { testApplyEdit })
        : commandName === 'resolvePastedImports'
          ? await vscode.commands.executeCommand<boolean>('phpCompanion.resolvePastedImports', { testApplyEdit })
          : await vscode.commands.executeCommand<boolean>('phpCompanion.optimizeImports', uri,
            { preview: false, testApplyEdit });
      assert.ok(reachedApply, `${commandName} did not reach workspace.applyEdit`);
      assert.strictEqual(result, false, `${commandName} reported success after workspace.applyEdit ${failureMode}`);
      assert.strictEqual(document.getText(), original, `${commandName} changed the document after an application failure`);
      assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), original,
        `${commandName} changed the disk file after an application failure`);
    } finally {
      await vscode.workspace.fs.delete(uri);
    }
  }
  console.log('C3 import commands kept source unchanged and returned false after applyEdit rejection or exception');
  const externalOptimizeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3ExternalOptimize.php');
  const externalOptimizeSource = optimizeOriginal.replace('OptimizeConsumer', 'C3ExternalOptimize');
  const externalChangedSource = `${externalOptimizeSource}\n// Written by an external process during preview.\n`;
  await vscode.workspace.fs.writeFile(externalOptimizeUri, Buffer.from(externalOptimizeSource));
  try {
    const externalDocument = await vscode.workspace.openTextDocument(externalOptimizeUri);
    await vscode.window.showTextDocument(externalDocument);
    const versionBeforePreview = externalDocument.version;
    assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.optimizeImports', externalOptimizeUri,
      { preview: true, testPreviewAction: async () => {
        await writeFile(externalOptimizeUri.fsPath, externalChangedSource);
        assert.strictEqual(externalDocument.version, versionBeforePreview,
          'External disk write unexpectedly changed the open document version before confirmation');
        return 'apply';
      } }), false, 'Optimize Imports applied a plan after the disk file changed during preview');
    assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(externalOptimizeUri)).toString('utf8'), externalChangedSource,
      'Optimize Imports overwrote the external disk change');
  } finally {
    await vscode.workspace.fs.delete(externalOptimizeUri);
  }
  const serviceDirectory = vscode.Uri.joinPath(folder.uri, 'src', 'Service');
  const generatedDirectory = vscode.Uri.joinPath(serviceDirectory, 'C3NewDirectory');
  const nestedGeneratedUri = vscode.Uri.joinPath(generatedDirectory, 'C3NestedType.php');
  await assert.rejects(async () => vscode.workspace.fs.stat(generatedDirectory));
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3NestedType', generatedDirectory,
    async () => {
      await assert.rejects(async () => vscode.workspace.fs.stat(generatedDirectory),
        'Type generation created the parent directory before preview confirmation');
      return 'apply';
    }), true, 'Successful nested type generation did not report creation');
  assert.ok((await vscode.workspace.openTextDocument(nestedGeneratedUri)).getText()
    .includes('namespace App\\Service\\C3NewDirectory;'), 'Type generation failed beneath a missing parent directory');
  await vscode.commands.executeCommand('undo');
  await assert.rejects(async () => vscode.workspace.fs.stat(nestedGeneratedUri),
    'Undo did not remove the PHP file generated beneath a missing parent directory');
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(nestedGeneratedUri)).getText()
    .includes('class C3NestedType'), 'Redo did not restore the PHP file beneath a missing parent directory');
  await vscode.commands.executeCommand('undo');
  await assert.rejects(async () => vscode.workspace.fs.stat(nestedGeneratedUri),
    'A second Undo did not remove the restored PHP file');
  const parentAfterUndo = await vscode.workspace.fs.stat(generatedDirectory).then(() => true, () => false);
  console.log(`C3 missing-parent generation Undo: parentDirectoryRemains=${parentAfterUndo}`);
  if (parentAfterUndo) await vscode.workspace.fs.delete(generatedDirectory, { recursive: true });
  const removedDuringPreview = vscode.Uri.joinPath(serviceDirectory, 'C3RemovedDuringPreview');
  const removedType = vscode.Uri.joinPath(removedDuringPreview, 'C3RemovedType.php');
  await vscode.workspace.fs.createDirectory(removedDuringPreview);
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3RemovedType', removedDuringPreview,
    async () => {
      await vscode.workspace.fs.delete(removedDuringPreview);
      return 'apply';
    }), false, 'Type generation accepted a destination removed during preview');
  await assert.rejects(async () => vscode.workspace.fs.stat(removedDuringPreview),
    'Type generation recreated a destination removed during preview');
  await assert.rejects(async () => vscode.workspace.fs.stat(removedType),
    'Type generation created a file in a destination removed during preview');
  const createdDuringPreview = vscode.Uri.joinPath(serviceDirectory, 'C3CreatedDuringPreview');
  const createdDuringPreviewType = vscode.Uri.joinPath(createdDuringPreview, 'C3CreatedDuringPreviewType.php');
  await assert.rejects(async () => vscode.workspace.fs.stat(createdDuringPreview));
  try {
    assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class',
      'C3CreatedDuringPreviewType', createdDuringPreview, async () => {
        await vscode.workspace.fs.createDirectory(createdDuringPreview);
        return 'apply';
      }), false, 'Type generation accepted a destination created during preview');
    await assert.rejects(async () => vscode.workspace.fs.stat(createdDuringPreviewType),
      'Type generation wrote into a destination created after its preview opened');
  } finally {
    await vscode.workspace.fs.delete(createdDuringPreview, { recursive: true });
  }
  const generatedUri = vscode.Uri.joinPath(serviceDirectory, 'C3GeneratedType.php');
  const dottedDirectory = vscode.Uri.joinPath(folder.uri, 'src', 'Service.With.Dot');
  const dottedType = vscode.Uri.joinPath(dottedDirectory, 'C3DottedDirectoryType.php');
  const missingDottedDirectory = vscode.Uri.joinPath(folder.uri, 'src', 'Future.With.Dot');
  const missingDottedType = vscode.Uri.joinPath(missingDottedDirectory, 'C3FutureDottedType.php');
  await vscode.workspace.fs.createDirectory(dottedDirectory);
  const dottedComposerUri = vscode.Uri.joinPath(folder.uri, 'composer.json');
  const dottedComposerBefore = await vscode.workspace.fs.readFile(dottedComposerUri);
  try {
    const dottedComposer = JSON.parse(Buffer.from(dottedComposerBefore).toString('utf8')) as {
      autoload: { 'psr-4': Record<string, string> } };
    dottedComposer.autoload['psr-4']['App\\Dotted\\'] = 'src/Service.With.Dot/';
    dottedComposer.autoload['psr-4']['App\\FutureDotted\\'] = 'src/Future.With.Dot/';
    await vscode.workspace.fs.writeFile(dottedComposerUri, Buffer.from(JSON.stringify(dottedComposer)));
    await vscode.commands.executeCommand('phpCompanion.detectPhpVersions');
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'C3DottedDirectoryType', dottedDirectory,
      async () => 'apply');
    assert.ok((await vscode.workspace.openTextDocument(dottedType)).getText().includes('namespace App\\Dotted;'),
      'Generating from a dotted Composer root moved the new type to its parent');
    await assert.rejects(async () => vscode.workspace.fs.stat(missingDottedDirectory));
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'C3FutureDottedType', missingDottedDirectory,
      async () => 'apply');
    assert.ok((await vscode.workspace.openTextDocument(missingDottedType)).getText().includes('namespace App\\FutureDotted;'),
      'Generating from a missing dotted Composer root moved the new type to its parent');
  } finally {
    await vscode.workspace.fs.writeFile(dottedComposerUri, dottedComposerBefore);
    await vscode.commands.executeCommand('phpCompanion.detectPhpVersions');
    try { await vscode.workspace.fs.delete(dottedType); } catch { /* No file if generation failed. */ }
    try { await vscode.workspace.fs.delete(missingDottedDirectory, { recursive: true }); } catch { /* No directory if generation failed. */ }
  }
  const fileTarget = vscode.Uri.joinPath(serviceDirectory, 'C3TypeTarget.php');
  const siblingType = vscode.Uri.joinPath(serviceDirectory, 'C3SiblingType.php');
  await vscode.workspace.fs.writeFile(fileTarget, Buffer.from('<?php\nnamespace App\\Service;\n'));
  await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'C3SiblingType', fileTarget,
    async () => 'apply');
  assert.ok((await vscode.workspace.openTextDocument(siblingType)).getText().includes('namespace App\\Service;'),
    'Generating from an existing file did not create a sibling type');
  await vscode.workspace.fs.delete(siblingType);
  await vscode.workspace.fs.delete(fileTarget);
  const invalidDirectory = vscode.Uri.joinPath(folder.uri, 'src', 'Invalid.Dir');
  const invalidType = vscode.Uri.joinPath(invalidDirectory, 'C3InvalidNamespaceType.php');
  await vscode.workspace.fs.createDirectory(invalidDirectory);
  let invalidPreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3InvalidNamespaceType', invalidDirectory,
    async () => { invalidPreviewOpened = true; return 'apply'; }), false);
  assert.strictEqual(invalidPreviewOpened, false, 'An invalid PSR-4 namespace opened a type preview');
  await assert.rejects(async () => vscode.workspace.fs.stat(invalidType),
    'Generating under an invalid PSR-4 namespace created a PHP file');
  await vscode.workspace.fs.delete(invalidDirectory);
  const reservedUri = vscode.Uri.joinPath(serviceDirectory, 'class.php');
  let reservedPreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'class', serviceDirectory,
    async () => { reservedPreviewOpened = true; return 'apply'; }), false);
  assert.strictEqual(reservedPreviewOpened, false, 'A reserved type name opened a generation preview');
  await assert.rejects(async () => vscode.workspace.fs.stat(reservedUri),
    'A reserved type name generated invalid PHP');
  const unicodeDirectory = vscode.Uri.joinPath(folder.uri, 'src', '中文');
  const unicodeType = vscode.Uri.joinPath(unicodeDirectory, '测试类.php');
  await vscode.workspace.fs.createDirectory(unicodeDirectory);
  await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', '测试类', unicodeDirectory,
    async () => 'apply');
  assert.ok((await vscode.workspace.openTextDocument(unicodeType)).getText().includes('namespace App\\中文;'),
    'A valid Unicode namespace or type name was rejected');
  await vscode.workspace.fs.delete(unicodeType);
  const checkPreview = (): void => {
    const preview = vscode.window.activeTextEditor?.document;
    assert.ok(preview && preview.uri.scheme === 'sophp-type-preview', 'Generated PHP source was not opened as a read-only preview');
    assert.ok(preview.getText().includes('namespace App\\Service;') && preview.getText().includes('class C3GeneratedType'),
      'Generated PHP preview omitted its PSR-4 namespace or class');
  };
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3GeneratedType', serviceDirectory,
    async () => { checkPreview(); return 'cancel'; }), false);
  await assert.rejects(async () => vscode.workspace.fs.stat(generatedUri), 'Cancelling generated PHP preview created a file');
  const failedPreviewUri = vscode.Uri.joinPath(serviceDirectory, 'C3PreviewCloseFailure.php');
  const openPreviewTab = (): vscode.Tab | undefined => vscode.window.tabGroups.all.flatMap((group) => group.tabs).find((tab) =>
    tab.input instanceof vscode.TabInputText && tab.input.uri.scheme === 'sophp-type-preview'
      && tab.input.uri.path === failedPreviewUri.path);
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3PreviewCloseFailure', serviceDirectory,
    async () => { checkPreview(); return 'apply'; }, undefined, async () => false), false,
  'Type generation reported success when VS Code refused to close its preview');
  await assert.rejects(async () => vscode.workspace.fs.stat(failedPreviewUri),
    'Type generation created a file after preview close returned false');
  const keptPreview = openPreviewTab();
  assert.ok(keptPreview, 'The refused preview close did not leave a reviewable tab');
  assert.ok((await vscode.workspace.openTextDocument((keptPreview.input as vscode.TabInputText).uri)).getText()
    .includes('class C3PreviewCloseFailure'), 'A failed close erased the still-open PHP preview');
  assert.ok(await vscode.window.tabGroups.close(keptPreview));
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3PreviewCloseFailure', serviceDirectory,
    async () => { checkPreview(); return 'apply'; }, undefined, async () => { throw new Error('Injected preview close failure'); }), false,
  'Type generation threw when closing its preview failed');
  await assert.rejects(async () => vscode.workspace.fs.stat(failedPreviewUri),
    'Type generation created a file after preview close threw');
  const thrownPreview = openPreviewTab();
  if (thrownPreview) assert.ok(await vscode.window.tabGroups.close(thrownPreview));
  const openFailureUri = vscode.Uri.joinPath(serviceDirectory, 'C3OpenFailure.php');
  let attemptedOpen = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3OpenFailure',
    serviceDirectory, async () => 'apply', undefined, undefined, async (uri: vscode.Uri) => {
      attemptedOpen = true;
      assert.strictEqual(uri.toString(), openFailureUri.toString(), 'The created file open used the wrong URI');
      throw new Error('Injected created file open failure');
    }), true, 'Type generation reported failure after creating the file but failing to open it');
  assert.ok(attemptedOpen, 'Type generation did not attempt to open the created file');
  assert.ok((await vscode.workspace.openTextDocument(openFailureUri)).getText().includes('class C3OpenFailure'),
    'The created PHP file was lost when opening its editor failed');
  await vscode.workspace.fs.delete(openFailureUri);
  const stageFallbackUri = vscode.Uri.joinPath(serviceDirectory, 'C3StageFallback.php');
  let stageWasAttempted = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class',
    'C3StageFallback', serviceDirectory, async () => 'apply', undefined, undefined, undefined,
    async (edit: vscode.WorkspaceEdit) => {
      stageWasAttempted = true;
      assert.ok(edit.size > 0, 'Type generation did not prepare the staged file move');
      return false;
    }), true, 'Type generation did not fall back when the staged file move was rejected');
  assert.ok(stageWasAttempted, 'Type generation skipped the staged file move');
  assert.ok((await vscode.workspace.openTextDocument(stageFallbackUri)).getText().includes('class C3StageFallback'),
    'The fallback file creation lost the generated PHP source');
  await vscode.workspace.fs.delete(stageFallbackUri);
  const concurrentSource = '<?php\n// Created while SoPHP preview was open.\n';
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3GeneratedType', serviceDirectory,
    async () => { checkPreview(); await vscode.workspace.fs.writeFile(generatedUri, Buffer.from(concurrentSource)); return 'apply'; }), false);
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(generatedUri)).toString('utf8'), concurrentSource,
    'Applying a stale generation preview overwrote a file created concurrently');
  await vscode.workspace.fs.delete(generatedUri);
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'class', 'C3GeneratedType', serviceDirectory,
    async () => { checkPreview(); return 'apply'; }), true);
  const generated = await vscode.workspace.openTextDocument(generatedUri);
  assert.ok(generated.getText().includes('class C3GeneratedType'), 'Applying generated PHP preview did not create the source');
  await vscode.window.showTextDocument(generated);
  await vscode.commands.executeCommand('undo');
  await assert.rejects(async () => vscode.workspace.fs.stat(generatedUri), 'Generated PHP file was not removed by one Undo');
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(generatedUri)).getText().includes('class C3GeneratedType'),
    'Redo did not restore the generated PHP file');
  await vscode.commands.executeCommand('undo');
  await assert.rejects(async () => vscode.workspace.fs.stat(generatedUri), 'A second Undo did not remove the restored PHP file');
  if (process.env.PHP_COMPANION_TEST_C3_REDO_PROBE === '1') {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await vscode.commands.executeCommand('redo');
      await new Promise((resolve) => setTimeout(resolve, 250));
      const restored = await vscode.workspace.fs.stat(generatedUri).then(() => true, () => false);
      console.log(`C3 type generation Redo attempt ${attempt}: restored=${restored}`);
      if (restored) break;
    }
  }
  if (!configuredTestProfile) {
    const unmappedTests = vscode.Uri.joinPath(folder.uri, 'tests');
    const unmappedTest = vscode.Uri.joinPath(unmappedTests, 'C3UnmappedTest.php');
    await vscode.workspace.fs.createDirectory(unmappedTests);
    let cancelledPreviewOpened = false;
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'test', 'C3UnmappedTest', serviceDirectory,
      async () => { cancelledPreviewOpened = true; return 'apply'; }, async () => undefined);
    assert.strictEqual(cancelledPreviewOpened, false, 'Cancelled test-directory selection opened a preview');
    await assert.rejects(async () => vscode.workspace.fs.stat(unmappedTest),
      'Cancelled test-directory selection generated a file');
    const deletedSelection = vscode.Uri.joinPath(unmappedTests, 'C3DeletedSelection.php');
    let deletedPreviewOpened = false;
    assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion._testCreatePhpType', 'test', 'C3DeletedSelection', serviceDirectory,
      async () => { deletedPreviewOpened = true; return 'apply'; }, async () => {
        await vscode.workspace.fs.delete(unmappedTests);
        return unmappedTests;
      }), false, 'A test directory deleted after selection threw instead of rejecting generation');
    assert.strictEqual(deletedPreviewOpened, false, 'A deleted test directory opened a generation preview');
    await assert.rejects(async () => vscode.workspace.fs.stat(deletedSelection),
      'A deleted test directory still generated a PHP file');
    await vscode.workspace.fs.createDirectory(unmappedTests);
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'test', 'C3UnmappedTest', serviceDirectory,
      async () => {
        const preview = vscode.window.activeTextEditor?.document;
        assert.strictEqual(preview?.uri.path, unmappedTest.path,
          'A project without autoload-dev did not preview the selected test directory');
        assert.ok(preview.getText().includes('final class C3UnmappedTest extends \\PHPUnit\\Framework\\TestCase')
          && !preview.getText().includes('namespace App\\'),
        'An unmapped PHPUnit test should use the global namespace');
        return 'apply';
      }, async () => unmappedTests);
    assert.ok((await vscode.workspace.openTextDocument(unmappedTest)).getText().includes('class C3UnmappedTest'));
    await vscode.workspace.fs.delete(unmappedTest);
    const explicitTest = vscode.Uri.joinPath(unmappedTests, 'C3ExplicitTest.php');
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'test', 'C3ExplicitTest', unmappedTests,
      async () => {
        assert.strictEqual(vscode.window.activeTextEditor?.document.uri.path, explicitTest.path,
          'An explicitly selected test directory was ignored');
        return 'apply';
      }, async () => assert.fail('An explicitly selected test directory opened the folder chooser'));
    assert.ok((await vscode.workspace.openTextDocument(explicitTest)).getText().includes('class C3ExplicitTest'));
    await vscode.workspace.fs.delete(explicitTest);
  }
  const composerUri = vscode.Uri.joinPath(folder.uri, 'composer.json');
  const composerBefore = await vscode.workspace.fs.readFile(composerUri);
  const staleComposerUri = vscode.Uri.joinPath(serviceDirectory, 'C3StaleComposerType.php');
  try {
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'C3StaleComposerType', serviceDirectory,
      async () => {
        const changed = JSON.parse(Buffer.from(composerBefore).toString('utf8')) as Record<string, unknown>;
        changed.autoload = { 'psr-4': { 'Changed\\': 'src/' } };
        await vscode.workspace.fs.writeFile(composerUri, Buffer.from(JSON.stringify(changed)));
        return 'apply';
      });
    await assert.rejects(async () => vscode.workspace.fs.stat(staleComposerUri),
      'Type generation applied a preview based on a changed Composer mapping');
  } finally {
    await vscode.workspace.fs.writeFile(composerUri, composerBefore);
  }
  const changedBeforeRequest = JSON.parse(Buffer.from(composerBefore).toString('utf8')) as Record<string, unknown>;
  changedBeforeRequest.autoload = { 'psr-4': { 'Changed\\': 'src/' } };
  const staleCachedUri = vscode.Uri.joinPath(serviceDirectory, 'C3StaleCachedType.php');
  try {
    await vscode.workspace.fs.writeFile(composerUri, Buffer.from(JSON.stringify(changedBeforeRequest)));
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'C3StaleCachedType', serviceDirectory,
      async () => {
        assert.ok(vscode.window.activeTextEditor?.document.getText().includes('namespace Changed\\Service;'),
          'Type generation preview used stale Composer mappings');
        return 'cancel';
      });
    await assert.rejects(async () => vscode.workspace.fs.stat(staleCachedUri),
      'Type generation created a class from a Composer mapping changed before the command');
  } finally {
    await vscode.workspace.fs.writeFile(composerUri, composerBefore);
  }
  if (configuredTestProfile) {
    const generatedTestUri = vscode.Uri.joinPath(folder.uri, 'tests', 'C3GeneratedTest.php');
    const testFileChurn = process.env.PHP_COMPANION_TEST_C3_PHPUNIT_CHURN === '1';
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'test', 'C3GeneratedTest', serviceDirectory,
      async () => {
        const preview = vscode.window.activeTextEditor?.document;
        assert.strictEqual(preview?.uri.path, generatedTestUri.path,
          'New PHPUnit Test did not preview the Composer autoload-dev destination');
        assert.ok(preview.getText().includes('namespace App\\Tests;')
          && preview.getText().includes('class C3GeneratedTest extends \\PHPUnit\\Framework\\TestCase'),
        'New PHPUnit Test preview used the wrong namespace or base class');
        return testFileChurn ? 'apply' : 'cancel';
      });
    if (testFileChurn) {
      assert.ok((await vscode.workspace.openTextDocument(generatedTestUri)).getText().includes('class C3GeneratedTest'));
      await vscode.workspace.fs.delete(generatedTestUri);
    } else {
      await assert.rejects(async () => vscode.workspace.fs.stat(generatedTestUri),
        'Cancelling New PHPUnit Test created the previewed file');
    }
  }
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
  const echoUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3ExtractEcho.php');
  const echoSource = '<?php\r\nnamespace App\\Service;\r\nfunction showEcho(): void\r\n{\r\n    echo strtoupper("hello");\r\n}\r\n';
  await vscode.workspace.fs.writeFile(echoUri, Buffer.from(echoSource));
  const echoDocument = await vscode.workspace.openTextDocument(echoUri);
  await vscode.window.showTextDocument(echoDocument);
  const echoStart = echoSource.indexOf('strtoupper("hello")');
  const echoActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', echoUri,
    new vscode.Range(echoDocument.positionAt(echoStart), echoDocument.positionAt(echoStart + 'strtoupper("hello")'.length)),
    vscode.CodeActionKind.RefactorExtract.value);
  const echoAction = echoActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract to $extracted');
  assert.ok(echoAction?.command, 'Single echo expression did not offer Extract Variable.');
  await vscode.commands.executeCommand(echoAction.command.command, ...echoAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(echoDocument.getText().includes('    $extracted = strtoupper("hello");\r\n    echo $extracted;'),
    'Extract Variable did not preserve the single echo expression and CRLF line endings.');
  assert.ok(!/(?<!\r)\n/u.test(echoDocument.getText()), 'Extract Variable introduced a lone LF into the CRLF file.');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(echoDocument.getText(), echoSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(echoDocument.getText().includes('    echo $extracted;'));
  console.log('C3 Extract Variable from a single echo expression: preview, apply, CRLF and one Undo/Redo');
  const inlineUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3InlineVariable.php');
  const inlineSource = '<?php\nnamespace App\\Service;\nfunction makeInline(): object\n{\n    $result = new \\stdClass();\n    // Explain why this object is returned.\n    return (($result));\n}\n';
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
  assert.strictEqual((staleInline.command?.arguments?.[0] as { sourceDiskHash?: string })?.sourceDiskHash,
    createHash('sha256').update(await vscode.workspace.fs.readFile(inlineUri)).digest('hex'),
    'Inline Variable action did not preserve its source disk snapshot');
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
  assert.ok(inlineDocument.getText().includes('// Explain why this object is returned.\n    return ((new \\stdClass()));')
    && !inlineDocument.getText().includes('$result ='));
  assert.strictEqual(vscode.window.activeTextEditor?.document.uri.toString(), inlineUri.toString());
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(inlineDocument.getText(), inlineSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(inlineDocument.getText().includes('// Explain why this object is returned.\n    return ((new \\stdClass()));'));
  const echoInlineUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3InlineEcho.php');
  const echoInlineSource = '<?php\nnamespace App\\Service;\nfunction showInlineEcho(): void\n{\n    $echoed = strtoupper("hello");\n    // Keep this explanation.\n    echo $echoed;\n}\n';
  await vscode.workspace.fs.writeFile(echoInlineUri, Buffer.from(echoInlineSource));
  const echoInlineDocument = await vscode.workspace.openTextDocument(echoInlineUri);
  await vscode.window.showTextDocument(echoInlineDocument);
  const echoInlineStart = echoInlineSource.indexOf('$echoed');
  const echoInlineActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', echoInlineUri,
    new vscode.Range(echoInlineDocument.positionAt(echoInlineStart), echoInlineDocument.positionAt(echoInlineStart)),
    vscode.CodeActionKind.RefactorInline.value);
  const echoInlineAction = echoInlineActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Inline $echoed');
  assert.ok(echoInlineAction?.command, 'Single echo use did not offer Inline Variable.');
  await vscode.commands.executeCommand(echoInlineAction.command.command, ...echoInlineAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(echoInlineDocument.getText().includes('// Keep this explanation.\n    echo strtoupper("hello");'));
  assert.ok(!echoInlineDocument.getText().includes('$echoed'));
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(echoInlineDocument.getText(), echoInlineSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(echoInlineDocument.getText().includes('echo strtoupper("hello");'));
  console.log('C3 Inline Variable into a single echo expression: preview, apply, comment and one Undo/Redo');
  const embeddedInlineUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3EmbeddedInlineVariable.php');
  const embeddedInlineSource = '<?php\nfunction embeddedInline(): int {\n    $sum = 1 + 2;\n    return $sum * 3;\n}\nfunction assignedInline(): int {\n    $assignedSum = 4 + 5;\n    $result = $assignedSum * 2;\n    return $result;\n}\n';
  await vscode.workspace.fs.writeFile(embeddedInlineUri, Buffer.from(embeddedInlineSource));
  const embeddedInlineDocument = await vscode.workspace.openTextDocument(embeddedInlineUri);
  await vscode.window.showTextDocument(embeddedInlineDocument);
  const embeddedInlineStart = embeddedInlineSource.indexOf('$sum');
  const embeddedInlineActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', embeddedInlineUri,
    new vscode.Range(embeddedInlineDocument.positionAt(embeddedInlineStart), embeddedInlineDocument.positionAt(embeddedInlineStart)),
    vscode.CodeActionKind.RefactorInline.value);
  const embeddedInlineAction = embeddedInlineActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Inline $sum');
  assert.ok(embeddedInlineAction?.command, 'Embedded return Inline Variable action was unavailable');
  await vscode.commands.executeCommand(embeddedInlineAction.command.command, ...embeddedInlineAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(embeddedInlineDocument.getText().includes('return (1 + 2) * 3;'),
    'Embedded Inline Variable did not preserve arithmetic precedence');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(embeddedInlineDocument.getText(), embeddedInlineSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(embeddedInlineDocument.getText().includes('return (1 + 2) * 3;'));
  const assignedInlineStart = embeddedInlineDocument.getText().indexOf('$assignedSum');
  const assignedInlineActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', embeddedInlineUri,
    new vscode.Range(embeddedInlineDocument.positionAt(assignedInlineStart), embeddedInlineDocument.positionAt(assignedInlineStart)),
    vscode.CodeActionKind.RefactorInline.value);
  const assignedInlineAction = assignedInlineActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Inline $assignedSum');
  assert.ok(assignedInlineAction?.command, 'Assignment RHS Inline Variable action was unavailable');
  await vscode.commands.executeCommand(assignedInlineAction.command.command, ...assignedInlineAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(embeddedInlineDocument.getText().includes('$result = (4 + 5) * 2;'));
  await vscode.commands.executeCommand('undo');
  assert.ok(embeddedInlineDocument.getText().includes('$assignedSum = 4 + 5;'));
  await vscode.commands.executeCommand('redo');
  assert.ok(embeddedInlineDocument.getText().includes('$result = (4 + 5) * 2;'));
  const inlineDiskBefore = await vscode.workspace.fs.readFile(inlineUri);
  const staleDiskSource = Buffer.concat([Buffer.from('// changed externally after Code Action was computed\n'), Buffer.from(inlineDiskBefore)]);
  const staleDiskEdit = new vscode.WorkspaceEdit();
  staleDiskEdit.insert(inlineUri, new vscode.Position(0, 0), '// should not apply\n');
  const staleDiskRequest = { edit: staleDiskEdit, title: 'Stale disk refactor', sourceUri: inlineUri,
    sourceVersion: inlineDocument.version, sourceText: inlineDocument.getText(),
    sourceDiskHash: createHash('sha256').update(inlineDiskBefore).digest('hex') };
  await vscode.workspace.fs.writeFile(inlineUri, staleDiskSource);
  let staleDiskPreviewOpened = false;
  await vscode.commands.executeCommand('phpCompanion.applyPreviewedExtract', staleDiskRequest,
    { testPreviewAction: async () => { staleDiskPreviewOpened = true; return 'apply'; } });
  assert.strictEqual(staleDiskPreviewOpened, false, 'A stale source disk snapshot opened a refactor preview');
  assert.ok(!inlineDocument.getText().includes('should not apply'), 'A stale source disk snapshot changed the editor');
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(inlineUri)).toString(), staleDiskSource.toString(),
    'A stale source disk snapshot overwrote the external change');
  await vscode.workspace.fs.writeFile(inlineUri, inlineDiskBefore);
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
  await vscode.workspace.fs.writeFile(diskTargetUri, Buffer.from(diskTargetSource));
  await vscode.workspace.fs.delete(diskTargetUri);
  let missingTargetPreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.applyPreviewedExtract', diskTargetRequest,
    { testPreviewAction: async () => { missingTargetPreviewOpened = true; return 'apply'; } }), false,
  'Extract did not reject a target deleted after planning');
  assert.strictEqual(missingTargetPreviewOpened, false, 'Extract opened a preview for a deleted target');
  assert.ok(!inlineDocument.getText().includes('makeFromDisk'), 'Extract changed the source after its target was deleted');
  await vscode.workspace.fs.writeFile(diskTargetUri, Buffer.from(diskTargetSource));
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
  assert.strictEqual(await addParameter(async () => 'cancel'), false);
  assert.strictEqual(addParameterDocument.getText(), addParameterSource, 'Cancelling Add Parameter changed the file');
  const externalAddSource = `// external edit after Add Parameter planning\n${addParameterSource}`;
  let staleAddPreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.addMethodParameter', {
    uri: addParameterUri, position: addPosition, name: 'suffix', type: 'string', value: '"x"',
    testBeforePreview: async () => {
      await vscode.workspace.fs.writeFile(addParameterUri, Buffer.from(externalAddSource));
    },
    testPreviewAction: async () => { staleAddPreviewOpened = true; return 'apply'; },
  }), false);
  assert.strictEqual(staleAddPreviewOpened, false, 'Add Parameter preview opened after an external source edit');
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(addParameterUri)).toString(), externalAddSource,
    'Add Parameter overwrote an external source edit');
  assert.strictEqual(addParameterDocument.getText(), addParameterSource, 'Add Parameter changed the stale editor');
  await vscode.workspace.fs.writeFile(addParameterUri, Buffer.from(addParameterSource));
  assert.strictEqual(await addParameter(async () => 'apply'), true);
  assert.ok(addParameterDocument.getText().includes('format(string $prefix, string $suffix)'));
  assert.ok(addParameterDocument.getText().includes('* @param string $suffix'));
  assert.ok(addParameterDocument.getText().includes('format("a", "x")'));
  assert.ok(addParameterDocument.getText().includes('format(prefix: "b", suffix: "x")'));
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(addParameterDocument.getText(), addParameterSource, 'One Undo did not restore Add Parameter');
  await vscode.commands.executeCommand('redo');
  assert.ok(addParameterDocument.getText().includes('format(string $prefix, string $suffix)'), 'One Redo did not restore Add Parameter');
  const inlineDocUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3InlineDocParameter.php');
  const inlineDocSource = `<?php namespace App\\Service;
final class C3InlineDocParameter {
    /** @param string $prefix */
    private function format(string $prefix /* note, retained */): string { return $prefix; }
    public function run(): string { return $this->format('a' /* note, retained */); }
}`;
  await vscode.workspace.fs.writeFile(inlineDocUri, Buffer.from(inlineDocSource));
  const inlineDocDocument = await vscode.workspace.openTextDocument(inlineDocUri);
  await vscode.window.showTextDocument(inlineDocDocument);
  const inlineDocPosition = inlineDocDocument.positionAt(inlineDocSource.indexOf('format(string') + 1);
  const addInlineDocParameter = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.addMethodParameter', {
      uri: inlineDocUri, position: inlineDocPosition, name: 'suffix', type: 'string', value: "'x'", testPreviewAction,
    });
  assert.strictEqual(await addInlineDocParameter(async () => 'cancel'), false);
  assert.strictEqual(inlineDocDocument.getText(), inlineDocSource, 'Cancelling inline PHPDoc Add Parameter changed the source');
  assert.strictEqual(await addInlineDocParameter(async () => 'apply'), true);
  assert.ok(inlineDocDocument.getText().includes('* @param string $suffix')
    && inlineDocDocument.getText().includes('string $prefix /* note, retained */, string $suffix')
    && inlineDocDocument.getText().includes("'a' /* note, retained */, 'x'"),
  'Add Parameter did not expand one-line PHPDoc with its new parameter');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(inlineDocDocument.getText(), inlineDocSource, 'One Undo did not restore the one-line PHPDoc');
  await vscode.commands.executeCommand('redo');
  assert.ok(inlineDocDocument.getText().includes('* @param string $suffix'),
    'One Redo did not restore the new inline PHPDoc parameter');
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
  }), false);
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
  }), false);
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
  const reorderContractUri = vscode.Uri.joinPath(folder.uri, 'src', 'Contract', 'C3ReorderContract.php');
  const reorderFirstUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3ReorderFirst.php');
  const reorderCallerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3ReorderCaller.php');
  const reorderContractSource = '<?php\nnamespace App\\Contract;\ninterface C3ReorderContract {\n    /**\n     * @param string $value\n     * @param string $context\n     * @param int $count\n     * @phpstan-param positive-int $count\n     */\n    public function send(string $value, string $context, int $count): string;\n}\n';
  const reorderFirstSource = '<?php\nnamespace App\\Service;\nuse App\\Contract\\C3ReorderContract;\nfinal class C3ReorderFirst implements C3ReorderContract {\n    /**\n     * @param string $payload\n     * @param string $mode\n     * @param int $quantity\n     * @psalm-param positive-int $quantity\n     */\n    public function send(string $payload, string $mode, int $quantity): string { return $payload; }\n}\n';
  const unrelatedReorderUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3UnrelatedReorder.php');
  const unrelatedReorderSource = '<?php\nnamespace App\\Service;\nfinal class C3UnrelatedReorder { public function send(string $message): void {} }\n';
  const reorderCallerSource = '<?php\nnamespace App\\Controller;\nuse App\\Contract\\C3ReorderContract;\nuse App\\Service\\C3ReorderFirst;\nfinal class C3ReorderCaller { public function run(C3ReorderContract $contract, C3ReorderFirst $first, string $value, string $context, int $count, \\App\\Service\\C3UnrelatedReorder $unrelated): void { $localValue = $value; $localContext = $context; $localCount = $count; $contract->send("a", "web", 2); $contract->send($value, $context, $count); $contract->send($localValue, $localContext, $localCount); $callback = $unrelated->send(...); $first->send(payload: "b", mode: "web", quantity: 3); $first->send("c", mode: "api", quantity: 4); } }\n';
  const reorderFiles: Array<[vscode.Uri, string]> = [[reorderContractUri, reorderContractSource],
    [reorderFirstUri, reorderFirstSource], [reorderCallerUri, reorderCallerSource]];
  await Promise.all([...reorderFiles, [unrelatedReorderUri, unrelatedReorderSource] as [vscode.Uri, string]]
    .map(([uri, source]) => vscode.workspace.fs.writeFile(uri, Buffer.from(source))));
  const reorderContractDocument = await vscode.workspace.openTextDocument(reorderContractUri);
  await vscode.window.showTextDocument(reorderContractDocument);
  const reorderPosition = reorderContractDocument.positionAt(reorderContractSource.indexOf('$count',
    reorderContractSource.indexOf('function send')) + 2);
  const reorderSelection = await api.requestLanguageServer<{ names?: string[]; index?: number } | null>(
    'phpCompanion/methodParameterOrder', { textDocument: { uri: reorderContractUri.toString() }, position: reorderPosition });
  assert.deepStrictEqual(reorderSelection, { names: ['value', 'context', 'count'], index: 2 });
  const requestReorderPlan = (): Thenable<{ changes?: Record<string, unknown> } | null> =>
    api.requestLanguageServer('phpCompanion/reorderMethodParameters', {
      textDocument: { uri: reorderContractUri.toString() }, position: reorderPosition, targetIndex: 0,
    });
  let reorderPlan = await requestReorderPlan();
  for (let attempt = 0; attempt < 100 && Object.keys(reorderPlan?.changes ?? {}).length !== 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    reorderPlan = await requestReorderPlan();
  }
  assert.strictEqual(Object.keys(reorderPlan?.changes ?? {}).length, 3,
    `Language Server omitted method-family Reorder Parameter: ${JSON.stringify(reorderPlan)}`);
  const reorderParameter = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.reorderMethodParameters', {
      uri: reorderContractUri, position: reorderPosition, targetIndex: 0, testPreviewAction,
    });
  assert.strictEqual(await reorderParameter(async () => {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs)
      .filter((tab) => tab.label.includes('Reorder method parameters:'));
    assert.strictEqual(tabs.length, 3, 'Reorder Parameter did not preview every method-family file');
    return 'cancel';
  }), false);
  for (const [uri, source] of reorderFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(),
    source, `Cancelling method-family Reorder Parameter changed ${uri.path}`);
  assert.strictEqual(await reorderParameter(async () => 'apply'), true);
  assert.ok((await vscode.workspace.openTextDocument(reorderContractUri)).getText().includes('send(int $count, string $value, string $context)'));
  assert.ok((await vscode.workspace.openTextDocument(reorderFirstUri)).getText().includes('send(int $quantity, string $payload, string $mode)'));
  const reorderedContractText = (await vscode.workspace.openTextDocument(reorderContractUri)).getText();
  const reorderedFirstText = (await vscode.workspace.openTextDocument(reorderFirstUri)).getText();
  assert.ok(reorderedContractText.indexOf('@phpstan-param positive-int $count') < reorderedContractText.indexOf('@param string $value'),
    'Reorder Parameter left the PHPStan annotation behind its original position');
  assert.ok(reorderedFirstText.indexOf('@psalm-param positive-int $quantity') < reorderedFirstText.indexOf('@param string $payload'),
    'Reorder Parameter left the Psalm annotation behind its original position');
  assert.ok((await vscode.workspace.openTextDocument(reorderCallerUri)).getText().includes('send(2, "a", "web")'));
  assert.ok((await vscode.workspace.openTextDocument(reorderCallerUri)).getText().includes('send($count, $value, $context)'));
  assert.ok((await vscode.workspace.openTextDocument(reorderCallerUri)).getText().includes('send($localCount, $localValue, $localContext)'));
  assert.ok((await vscode.workspace.openTextDocument(reorderCallerUri)).getText().includes('send(payload: "c", mode: "api", quantity: 4)'));
  assert.strictEqual((await vscode.workspace.openTextDocument(unrelatedReorderUri)).getText(), unrelatedReorderSource);
  await vscode.commands.executeCommand('undo');
  for (const [uri, source] of reorderFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(),
    source, `One Undo did not restore method-family Reorder Parameter in ${uri.path}`);
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(reorderContractUri)).getText().includes('send(int $count, string $value, string $context)'),
    'One Redo did not restore method-family Reorder Parameter in the contract');
  assert.ok((await vscode.workspace.openTextDocument(reorderFirstUri)).getText().includes('send(int $quantity, string $payload, string $mode)'),
    'One Redo did not restore method-family Reorder Parameter in the implementation');
  assert.ok((await vscode.workspace.openTextDocument(reorderContractUri)).getText().indexOf('@phpstan-param positive-int $count')
    < (await vscode.workspace.openTextDocument(reorderContractUri)).getText().indexOf('@param string $value'),
  'One Redo did not restore reordered PHPStan annotations');
  assert.ok((await vscode.workspace.openTextDocument(reorderCallerUri)).getText().includes('send(2, "a", "web")'));
  assert.ok((await vscode.workspace.openTextDocument(reorderCallerUri)).getText().includes('send($count, $value, $context)'));
  assert.ok((await vscode.workspace.openTextDocument(reorderCallerUri)).getText().includes('send($localCount, $localValue, $localContext)'));
  assert.ok((await vscode.workspace.openTextDocument(reorderCallerUri)).getText().includes('send(payload: "c", mode: "api", quantity: 4)'));
  assert.strictEqual((await vscode.workspace.openTextDocument(unrelatedReorderUri)).getText(), unrelatedReorderSource);
  const arrayReorderUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3ArrayReorder.php');
  const arrayReorderSource = "<?php\nnamespace App\\Service;\nfinal class C3ArrayReorder {\n    public function dispatch(array $payload, array $options, array $flags): void {}\n    public function run(): void { $this->dispatch(['a'], ['mode' => ['fast', 1]], [true, null]); $this->dispatch(array('b'), array('mode' => array('safe', 2)), array(false, null)); }\n}\n";
  await vscode.workspace.fs.writeFile(arrayReorderUri, Buffer.from(arrayReorderSource));
  const arrayReorderDocument = await vscode.workspace.openTextDocument(arrayReorderUri);
  await vscode.window.showTextDocument(arrayReorderDocument);
  const arrayReorderPosition = arrayReorderDocument.positionAt(arrayReorderSource.indexOf('$flags',
    arrayReorderSource.indexOf('function dispatch')) + 2);
  const arrayReorder = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.reorderMethodParameters', {
      uri: arrayReorderUri, position: arrayReorderPosition, targetIndex: 0, testPreviewAction,
    });
  assert.strictEqual(await arrayReorder(async () => 'cancel'), false);
  assert.strictEqual(arrayReorderDocument.getText(), arrayReorderSource,
    'Cancelling literal-array Reorder Parameter changed the PHP file');
  assert.strictEqual(await arrayReorder(async () => 'apply'), true);
  assert.ok(arrayReorderDocument.getText().includes("dispatch([true, null], ['a'], ['mode' => ['fast', 1]])"),
    'Literal-array arguments were not reordered in the editor');
  assert.ok(arrayReorderDocument.getText().includes("dispatch(array(false, null), array('b'), array('mode' => array('safe', 2)))"),
    'Legacy array arguments were not reordered in the editor');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(arrayReorderDocument.getText(), arrayReorderSource,
    'One Undo did not restore literal-array Reorder Parameter');
  await vscode.commands.executeCommand('redo');
  assert.ok(arrayReorderDocument.getText().includes("dispatch([true, null], ['a'], ['mode' => ['fast', 1]])"),
    'One Redo did not restore literal-array Reorder Parameter');
  assert.ok(arrayReorderDocument.getText().includes("dispatch(array(false, null), array('b'), array('mode' => array('safe', 2)))"),
    'One Redo did not restore legacy-array Reorder Parameter');
  const optionalContractUri = vscode.Uri.joinPath(folder.uri, 'src', 'Contract', 'C3OptionalContract.php');
  const optionalFirstUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3OptionalFirst.php');
  const optionalCallerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3OptionalCaller.php');
  const optionalContractSource = "<?php\nnamespace App\\Contract;\ninterface C3OptionalContract {\n    /**\n     * @param string $head\n     * @param string $mode\n     * @param int $count\n     */\n    public function combine(string $head, string $mode = 'web', int $count = 2): string;\n}\n";
  const optionalFirstSource = "<?php\nnamespace App\\Service;\nuse App\\Contract\\C3OptionalContract;\nfinal class C3OptionalFirst implements C3OptionalContract {\n    public function combine(string $head, string $mode = 'web', int $count = 2): string { return $head; }\n}\n";
  const optionalCallerSource = "<?php\nnamespace App\\Controller;\nuse App\\Contract\\C3OptionalContract;\nuse App\\Service\\C3OptionalFirst;\nfinal class C3OptionalCaller {\n    public function run(C3OptionalContract $contract, C3OptionalFirst $first): void {\n        $contract->combine('a');\n        $contract->combine('b', 'api', 3);\n        $contract->combine(head: 'c', count: 4);\n        $first->combine('d', mode: 'admin');\n    }\n}\n";
  const optionalFiles: Array<[vscode.Uri, string]> = [[optionalContractUri, optionalContractSource],
    [optionalFirstUri, optionalFirstSource], [optionalCallerUri, optionalCallerSource]];
  await Promise.all(optionalFiles.map(([uri, source]) => vscode.workspace.fs.writeFile(uri, Buffer.from(source))));
  const optionalDocument = await vscode.workspace.openTextDocument(optionalContractUri);
  await vscode.window.showTextDocument(optionalDocument);
  const optionalPosition = optionalDocument.positionAt(optionalContractSource.indexOf('$count',
    optionalContractSource.indexOf('function combine')) + 2);
  const requestOptionalPlan = (): Thenable<{ changes?: Record<string, unknown> } | null> =>
    api.requestLanguageServer('phpCompanion/reorderMethodParameters', {
      textDocument: { uri: optionalContractUri.toString() }, position: optionalPosition, targetIndex: 1,
    });
  let optionalPlan = await requestOptionalPlan();
  for (let attempt = 0; attempt < 100 && Object.keys(optionalPlan?.changes ?? {}).length !== 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    optionalPlan = await requestOptionalPlan();
  }
  assert.strictEqual(Object.keys(optionalPlan?.changes ?? {}).length, 3,
    'Language Server omitted the optional method-family Reorder Parameter plan');
  const reorderOptional = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.reorderMethodParameters', {
      uri: optionalContractUri, position: optionalPosition, targetIndex: 1, testPreviewAction,
    });
  assert.strictEqual(await reorderOptional(async () => 'cancel'), false);
  for (const [uri, source] of optionalFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(),
    source, 'Cancelling optional Reorder Parameter changed a file');
  assert.strictEqual(await reorderOptional(async () => 'apply'), true);
  assert.ok((await vscode.workspace.openTextDocument(optionalContractUri)).getText().includes(
    "combine(string $head, int $count = 2, string $mode = 'web')"));
  assert.ok((await vscode.workspace.openTextDocument(optionalCallerUri)).getText().includes("combine('b', 3, 'api')"));
  assert.ok((await vscode.workspace.openTextDocument(optionalCallerUri)).getText().includes(
    "combine(head: 'd', mode: 'admin')"));
  await vscode.commands.executeCommand('undo');
  for (const [uri, source] of optionalFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(),
    source, 'One Undo did not restore optional Reorder Parameter');
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(optionalFirstUri)).getText().includes(
    "combine(string $head, int $count = 2, string $mode = 'web')"));
  assert.ok((await vscode.workspace.openTextDocument(optionalCallerUri)).getText().includes("combine('b', 3, 'api')"));
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
      const move = new vscode.WorkspaceEdit();
      move.renameFile(safeTypeUri, renamedTypeUri, { overwrite: false });
      assert.ok(await vscode.workspace.applyEdit(move), 'Could not simulate an Explorer rename during Rename preview');
      assert.ok((await vscode.workspace.openTextDocument(renamedTypeUri)).getText().includes('class C3SafeType'),
        'Unconfirmed Rename plan changed a file moved independently during preview');
      const restore = new vscode.WorkspaceEdit();
      restore.renameFile(renamedTypeUri, safeTypeUri, { overwrite: false });
      assert.ok(await vscode.workspace.applyEdit(restore), 'Could not restore the type after preview race');
      return 'cancel';
    },
  }), false, 'Rename applied after the preview was cancelled');
  assert.ok((await vscode.workspace.openTextDocument(safeTypeUri)).getText().includes('class C3SafeType'));
  await assert.rejects(async () => vscode.workspace.fs.stat(renamedTypeUri));
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
  const renamePlanTypeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3RenamePlanType.php');
  const renamePlanNewUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3RenamePlanChanged.php');
  const renamePlanConsumerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3RenamePlanConsumer.php');
  const renamePlanTypeSource = '<?php\nnamespace App\\Service;\nfinal class C3RenamePlanType {}\n';
  const renamePlanConsumerSource = '<?php\nnamespace App\\Controller;\nuse App\\Service\\C3RenamePlanType;\nfinal class C3RenamePlanConsumer { public function run(C3RenamePlanType $item): void {} }\n';
  const renamePlanConsumerChanged = `${renamePlanConsumerSource}// Changed after Rename planning.\n`;
  await vscode.workspace.fs.writeFile(renamePlanTypeUri, Buffer.from(renamePlanTypeSource));
  await vscode.workspace.fs.writeFile(renamePlanConsumerUri, Buffer.from(renamePlanConsumerSource));
  const renamePlanDocument = await vscode.workspace.openTextDocument(renamePlanTypeUri);
  await vscode.window.showTextDocument(renamePlanDocument);
  const renamePlanPosition = renamePlanDocument.positionAt(renamePlanTypeSource.indexOf('class C3RenamePlanType') + 'class '.length + 2);
  let renamePlanReady = false;
  for (let attempt = 0; attempt < 100 && !renamePlanReady; attempt += 1) {
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', renamePlanTypeUri, renamePlanPosition);
    renamePlanReady = references?.some((reference) => reference.uri.toString() === renamePlanConsumerUri.toString()) ?? false;
    if (!renamePlanReady) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(renamePlanReady, 'Rename planning race consumer was not indexed');
  assert.ok(!vscode.workspace.textDocuments.some((item) => item.uri.toString() === renamePlanConsumerUri.toString()),
    'Rename planning race consumer was already open');
  let renamePlanPreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
    uri: renamePlanTypeUri, position: renamePlanPosition, newName: 'C3RenamePlanChanged',
    testAfterPlan: async () => { await writeFile(renamePlanConsumerUri.fsPath, renamePlanConsumerChanged); },
    testPreviewAction: async () => { renamePlanPreviewOpened = true; return 'apply'; },
  }), false, 'Rename applied a plan after a closed consumer changed before preview');
  assert.strictEqual(renamePlanPreviewOpened, false, 'Rename previewed stale edits after a closed consumer changed');
  assert.strictEqual(await readFile(renamePlanConsumerUri.fsPath, 'utf8'), renamePlanConsumerChanged);
  assert.strictEqual(await readFile(renamePlanTypeUri.fsPath, 'utf8'), renamePlanTypeSource);
  await assert.rejects(async () => vscode.workspace.fs.stat(renamePlanNewUri));
  console.log('C3 Rename rejected an external closed-consumer change before preview');
  const dirtyRaceTypeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3DirtyRaceType.php');
  const dirtyRaceNewUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3DirtyRaceRenamed.php');
  const dirtyRaceConsumerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3DirtyRaceConsumer.php');
  const dirtyRaceTypeSource = '<?php\nnamespace App\\Service;\nfinal class C3DirtyRaceType {}\n';
  const dirtyRaceConsumerSource = '<?php\nnamespace App\\Controller;\nuse App\\Service\\C3DirtyRaceType;\nfinal class C3DirtyRaceConsumer { public function run(C3DirtyRaceType $item): void {} }\n';
  await vscode.workspace.fs.writeFile(dirtyRaceTypeUri, Buffer.from(dirtyRaceTypeSource));
  await vscode.workspace.fs.writeFile(dirtyRaceConsumerUri, Buffer.from(dirtyRaceConsumerSource));
  const dirtyRaceConsumerDocument = await vscode.workspace.openTextDocument(dirtyRaceConsumerUri);
  await vscode.window.showTextDocument(dirtyRaceConsumerDocument);
  const dirtyEdit = new vscode.WorkspaceEdit();
  dirtyEdit.insert(dirtyRaceConsumerUri, dirtyRaceConsumerDocument.positionAt(dirtyRaceConsumerDocument.getText().length),
    '// Unsaved editor note.\n');
  assert.ok(await vscode.workspace.applyEdit(dirtyEdit));
  assert.strictEqual(dirtyRaceConsumerDocument.isDirty, true, 'Rename race consumer was not dirty before planning');
  const dirtyRaceExternalSource = `${dirtyRaceConsumerSource}// External disk note.\n`;
  const dirtyRaceTypeDocument = await vscode.workspace.openTextDocument(dirtyRaceTypeUri);
  await vscode.window.showTextDocument(dirtyRaceTypeDocument);
  const dirtyRacePosition = dirtyRaceTypeDocument.positionAt(dirtyRaceTypeSource.indexOf('class C3DirtyRaceType') + 'class '.length + 2);
  let dirtyRacePreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
    uri: dirtyRaceTypeUri, position: dirtyRacePosition, newName: 'C3DirtyRaceRenamed',
    testAfterPlan: async () => {
      await writeFile(dirtyRaceConsumerUri.fsPath, dirtyRaceExternalSource);
      assert.ok(dirtyRaceConsumerDocument.isDirty, 'External write cleared the unsaved consumer buffer');
    },
    testPreviewAction: async () => { dirtyRacePreviewOpened = true; return 'cancel'; },
  }), false, 'Rename applied after a dirty consumer changed on disk');
  assert.strictEqual(dirtyRacePreviewOpened, false, 'Rename previewed stale edits after a dirty consumer changed on disk');
  assert.strictEqual(await readFile(dirtyRaceConsumerUri.fsPath, 'utf8'), dirtyRaceExternalSource);
  assert.ok(dirtyRaceConsumerDocument.getText().includes('// Unsaved editor note.'));
  assert.strictEqual(await readFile(dirtyRaceTypeUri.fsPath, 'utf8'), dirtyRaceTypeSource);
  await assert.rejects(async () => vscode.workspace.fs.stat(dirtyRaceNewUri));
  console.log('C3 Rename rejected an external disk change behind an unsaved consumer before preview');
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
  const movePreview = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', moveSourceUri, moveTargetUri, { preview: true, testPreviewAction });
  assert.strictEqual(await movePreview(async () => {
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
  }), false, 'Cancelling Safe Move reported success');
  assert.ok(!vscode.window.tabGroups.all.flatMap((group) => group.tabs).some((tab) =>
    tab.input instanceof vscode.TabInputTextDiff && tab.label.includes('C3MovePreview.php')),
  'Cancelling Safe Move left a preview diff open');
  assert.strictEqual((await vscode.workspace.openTextDocument(moveSourceUri)).getText(), moveSource);
  await assert.rejects(async () => vscode.workspace.fs.stat(moveTargetUri));
  assert.strictEqual(await movePreview(async () => {
    const previews = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
      tab.input instanceof vscode.TabInputTextDiff && tab.label.includes('C3MovePreview.php'));
    assert.ok(previews.length >= 1, 'Safe Move did not open its preview');
    assert.ok(await vscode.window.tabGroups.close(previews[0]!), 'Could not close a Safe Move preview');
    return 'apply';
  }), false, 'Closing a Safe Move preview reported success');
  assert.strictEqual((await vscode.workspace.openTextDocument(moveSourceUri)).getText(), moveSource,
    'Safe Move applied after its preview was closed');
  await assert.rejects(async () => vscode.workspace.fs.stat(moveTargetUri));
  const externallyChangedMoveSource = `${moveSource}// Changed on disk while Safe Move preview was open.\n`;
  const moveDocument = await vscode.workspace.openTextDocument(moveSourceUri);
  const moveVersion = moveDocument.version;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', moveSourceUri, moveTargetUri, {
    preview: true,
    testPreviewAction: async () => 'apply',
    testBeforeApply: async () => {
      await writeFile(moveSourceUri.fsPath, externallyChangedMoveSource);
      assert.strictEqual(moveDocument.version, moveVersion,
        'External Safe Move disk write unexpectedly changed the open document version before apply');
    },
  }), false, 'Safe Move reported success after an external disk change');
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(moveSourceUri)).toString('utf8'), externallyChangedMoveSource,
    'Safe Move overwrote an external source edit');
  await assert.rejects(async () => vscode.workspace.fs.stat(moveTargetUri),
    'Safe Move moved the source after its disk contents changed');
  const planRaceSourceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3MovePlanRace.php');
  const planRaceTargetUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3MovePlanRace.php');
  const planRaceSource = moveSource.replaceAll('C3MovePreview', 'C3MovePlanRace');
  const planRaceChanged = `${planRaceSource}// Changed after the move plan but before preview snapshots.\n`;
  await vscode.workspace.fs.writeFile(planRaceSourceUri, Buffer.from(planRaceSource));
  const planRaceDocument = await vscode.workspace.openTextDocument(planRaceSourceUri);
  await vscode.window.showTextDocument(planRaceDocument);
  const planRaceVersion = planRaceDocument.version;
  let planRacePreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', planRaceSourceUri, planRaceTargetUri, {
    preview: true,
    testAfterPlan: async () => {
      await writeFile(planRaceSourceUri.fsPath, planRaceChanged);
      assert.strictEqual(planRaceDocument.version, planRaceVersion,
        'External Safe Move disk write unexpectedly changed the open document version after planning');
    },
    testPreviewAction: async () => { planRacePreviewOpened = true; return 'apply'; },
  }), false, 'Safe Move applied a plan after its source changed before preview snapshots');
  assert.strictEqual(planRacePreviewOpened, false, 'Safe Move opened a preview for a stale source plan');
  assert.strictEqual(await readFile(planRaceSourceUri.fsPath, 'utf8'), planRaceChanged,
    'Safe Move overwrote a source changed after planning');
  await assert.rejects(async () => vscode.workspace.fs.stat(planRaceTargetUri));
  console.log('C3 Safe Move rejected an external source change between planning and preview snapshots');
  const relatedRaceSourceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3MoveRelatedRace.php');
  const relatedRaceTargetUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3MoveRelatedRace.php');
  const relatedRaceConsumerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3MoveRelatedConsumer.php');
  const relatedRaceSource = moveSource.replaceAll('C3MovePreview', 'C3MoveRelatedRace');
  const relatedRaceConsumer = '<?php\nnamespace App\\Controller;\nuse App\\Service\\C3MoveRelatedRace;\nfinal class C3MoveRelatedConsumer { public function run(C3MoveRelatedRace $value): void {} }\n';
  const relatedRaceChanged = `${relatedRaceConsumer}// Changed after the move plan but before preview snapshots.\n`;
  await vscode.workspace.fs.writeFile(relatedRaceSourceUri, Buffer.from(relatedRaceSource));
  await vscode.workspace.fs.writeFile(relatedRaceConsumerUri, Buffer.from(relatedRaceConsumer));
  const relatedRaceDocument = await vscode.workspace.openTextDocument(relatedRaceSourceUri);
  await vscode.window.showTextDocument(relatedRaceDocument);
  const relatedRacePosition = relatedRaceDocument.positionAt(relatedRaceSource.indexOf('class C3MoveRelatedRace') + 'class '.length + 2);
  let relatedRaceReady = false;
  for (let attempt = 0; attempt < 100 && !relatedRaceReady; attempt += 1) {
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', relatedRaceSourceUri, relatedRacePosition);
    relatedRaceReady = references?.some((reference) => reference.uri.toString() === relatedRaceConsumerUri.toString()) ?? false;
    if (!relatedRaceReady) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(relatedRaceReady, 'Safe Move related file was not indexed before the planning race');
  assert.ok(!vscode.workspace.textDocuments.some((item) => item.uri.toString() === relatedRaceConsumerUri.toString()),
    'Safe Move related file was already open before the planning race');
  let relatedRacePreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', relatedRaceSourceUri, relatedRaceTargetUri, {
    preview: true,
    testAfterPlan: async () => { await writeFile(relatedRaceConsumerUri.fsPath, relatedRaceChanged); },
    testPreviewAction: async () => { relatedRacePreviewOpened = true; return 'apply'; },
  }), false, 'Safe Move applied a plan after a related file changed before preview snapshots');
  assert.strictEqual(relatedRacePreviewOpened, false, 'Safe Move previewed stale edits for a related file');
  assert.strictEqual(await readFile(relatedRaceConsumerUri.fsPath, 'utf8'), relatedRaceChanged);
  assert.strictEqual(await readFile(relatedRaceSourceUri.fsPath, 'utf8'), relatedRaceSource);
  await assert.rejects(async () => vscode.workspace.fs.stat(relatedRaceTargetUri));
  console.log('C3 Safe Move rejected an external related-file change between planning and preview snapshots');
  const dirtyMoveSourceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3MoveDirtyRace.php');
  const dirtyMoveTargetUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3MoveDirtyRace.php');
  const dirtyMoveConsumerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3MoveDirtyConsumer.php');
  const dirtyMoveSource = moveSource.replaceAll('C3MovePreview', 'C3MoveDirtyRace');
  const dirtyMoveConsumerSource = '<?php\nnamespace App\\Controller;\nuse App\\Service\\C3MoveDirtyRace;\nfinal class C3MoveDirtyConsumer { public function run(C3MoveDirtyRace $value): void {} }\n';
  const dirtyMoveExternalSource = `${dirtyMoveConsumerSource}// External disk note.\n`;
  await vscode.workspace.fs.writeFile(dirtyMoveSourceUri, Buffer.from(dirtyMoveSource));
  await vscode.workspace.fs.writeFile(dirtyMoveConsumerUri, Buffer.from(dirtyMoveConsumerSource));
  const dirtyMoveConsumerDocument = await vscode.workspace.openTextDocument(dirtyMoveConsumerUri);
  await vscode.window.showTextDocument(dirtyMoveConsumerDocument);
  const dirtyMoveEdit = new vscode.WorkspaceEdit();
  dirtyMoveEdit.insert(dirtyMoveConsumerUri, dirtyMoveConsumerDocument.positionAt(dirtyMoveConsumerDocument.getText().length),
    '// Unsaved editor note.\n');
  assert.ok(await vscode.workspace.applyEdit(dirtyMoveEdit));
  assert.ok(dirtyMoveConsumerDocument.isDirty, 'Safe Move related file was not dirty before planning');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(dirtyMoveSourceUri));
  let dirtyMovePreviewOpened = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', dirtyMoveSourceUri, dirtyMoveTargetUri, {
    preview: true,
    testAfterPlan: async () => { await writeFile(dirtyMoveConsumerUri.fsPath, dirtyMoveExternalSource); },
    testPreviewAction: async () => { dirtyMovePreviewOpened = true; return 'apply'; },
  }), false, 'Safe Move applied after a dirty related file changed on disk');
  assert.strictEqual(dirtyMovePreviewOpened, false, 'Safe Move previewed stale edits for a dirty related file');
  assert.strictEqual(await readFile(dirtyMoveConsumerUri.fsPath, 'utf8'), dirtyMoveExternalSource);
  assert.ok(dirtyMoveConsumerDocument.getText().includes('// Unsaved editor note.'));
  assert.strictEqual(await readFile(dirtyMoveSourceUri.fsPath, 'utf8'), dirtyMoveSource);
  await assert.rejects(async () => vscode.workspace.fs.stat(dirtyMoveTargetUri));
  console.log('C3 Safe Move rejected an external disk change behind an unsaved related file before preview');
  // Use a fresh file for the success path: the preceding external disk write can
  // still deliver a watcher update while a second move is being planned.
  const appliedMoveSourceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3MoveApplied.php');
  const appliedMoveTargetUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3MoveApplied.php');
  await vscode.workspace.fs.writeFile(appliedMoveSourceUri, Buffer.from(moveSource.replaceAll('C3MovePreview', 'C3MoveApplied')));
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(appliedMoveSourceUri));
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', appliedMoveSourceUri,
    appliedMoveTargetUri, { preview: true, testPreviewAction: async () => 'apply' }), true,
  'Applied Safe Move did not report success');
  assert.ok((await vscode.workspace.openTextDocument(appliedMoveTargetUri)).getText().includes('namespace App\\Controller;'));
  await assert.rejects(async () => vscode.workspace.fs.stat(appliedMoveSourceUri));
  await vscode.commands.executeCommand('undo');
  assert.ok((await vscode.workspace.openTextDocument(appliedMoveSourceUri)).getText().includes('namespace App\\Service;'));
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(appliedMoveTargetUri)).getText().includes('namespace App\\Controller;'));
  const globalProjectUri = vscode.Uri.joinPath(folder.uri, 'global-psr4');
  const globalSourceRoot = vscode.Uri.joinPath(globalProjectUri, 'src');
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(globalSourceRoot, 'Sub'));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(globalProjectUri, 'composer.json'),
    Buffer.from(JSON.stringify({ autoload: { 'psr-4': { '': 'src/' } } })));
  const globalMoveSourceUri = vscode.Uri.joinPath(globalSourceRoot, 'C3GlobalMove.php');
  const globalMoveTargetUri = vscode.Uri.joinPath(globalSourceRoot, 'Sub', 'C3GlobalMove.php');
  const globalConsumerUri = vscode.Uri.joinPath(globalSourceRoot, 'C3GlobalConsumer.php');
  await vscode.workspace.fs.writeFile(globalMoveSourceUri, Buffer.from('<?php class C3GlobalMove {}'));
  await vscode.workspace.fs.writeFile(globalConsumerUri,
    Buffer.from('<?php class C3GlobalConsumer { public const TYPE = C3GlobalMove::class; }'));
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(globalMoveSourceUri));
  let globalMovePlan: { error?: string; edit?: Record<string, unknown> } = {};
  for (let attempt = 0; attempt < 30; attempt += 1) {
    globalMovePlan = await api.requestLanguageServer('phpCompanion/planSafeMove', {
      moves: [{ oldUri: globalMoveSourceUri.toString(), newUri: globalMoveTargetUri.toString() }],
      includeFileOperations: true, requireCompleteIndex: true });
    if (globalMovePlan.edit) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(globalMovePlan.edit, `Global PSR-4 Safe Move plan unavailable: ${globalMovePlan.error ?? 'no edit'}`);
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', globalMoveSourceUri,
    globalMoveTargetUri, { preview: true, testPreviewAction: async () => 'apply' }), true,
  'Safe Move did not add a namespace to a global PSR-4 type');
  assert.ok((await vscode.workspace.openTextDocument(globalMoveTargetUri)).getText().includes('namespace Sub;'));
  assert.ok((await vscode.workspace.openTextDocument(globalConsumerUri)).getText().includes('\\Sub\\C3GlobalMove::class'));
  await vscode.commands.executeCommand('undo');
  assert.ok((await vscode.workspace.openTextDocument(globalMoveSourceUri)).getText().includes('class C3GlobalMove'));
  assert.ok((await vscode.workspace.openTextDocument(globalConsumerUri)).getText().includes('C3GlobalMove::class'));
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(globalMoveTargetUri)).getText().includes('namespace Sub;'));
  assert.ok((await vscode.workspace.openTextDocument(globalConsumerUri)).getText().includes('\\Sub\\C3GlobalMove::class'));
  console.log('C3 global PSR-4 Safe Move: preview, apply and Undo/Redo preserve declaration and reference');
  const cleanupSourceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3MoveCleanup.php');
  const cleanupTargetUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3MoveCleanup.php');
  await vscode.workspace.fs.writeFile(cleanupSourceUri, Buffer.from(moveSource.replaceAll('C3MovePreview', 'C3MoveCleanup')));
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(cleanupSourceUri));
  let previewCloseAttempted = false;
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', cleanupSourceUri, cleanupTargetUri, {
    preview: true,
    testPreviewAction: async () => 'apply',
    testClosePreviewTabs: async (tabs: vscode.Tab[]) => {
      previewCloseAttempted = true;
      assert.ok(tabs.length > 0, 'Safe Move did not open a preview before cleanup');
      throw new Error('C3 simulated preview tab close failure');
    },
  }), true, 'Safe Move reported failure after the file had moved and preview cleanup failed');
  assert.ok(previewCloseAttempted, 'Safe Move preview cleanup was not reached');
  await assert.rejects(async () => vscode.workspace.fs.stat(cleanupSourceUri));
  assert.ok((await vscode.workspace.openTextDocument(cleanupTargetUri)).getText().includes('namespace App\\Controller;'));
  const cleanupTabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
    tab.input instanceof vscode.TabInputTextDiff && tab.label.includes('C3MoveCleanup.php'));
  if (cleanupTabs.length) await vscode.window.tabGroups.close(cleanupTabs);
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(cleanupTargetUri));
  await vscode.commands.executeCommand('undo');
  assert.ok((await vscode.workspace.openTextDocument(cleanupSourceUri)).getText().includes('namespace App\\Service;'));
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(cleanupTargetUri)).getText().includes('namespace App\\Controller;'));
  console.log('C3 Safe Move preserved applied result and Undo/Redo after preview cleanup failure');
  const symfonyExtension = vscode.extensions.getExtension('sohophp.php-companion-symfony');
  assert.ok(symfonyExtension, 'C3 Symfony Rename test requires the independent extension');
  await symfonyExtension.activate();
  const routeControllerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3PhpRouteController.php');
  const routeControllerSource = '<?php namespace App\\Controller; final class C3PhpRouteController { public function view(): void {} }';
  const phpRoutesUri = vscode.Uri.joinPath(folder.uri, 'config', 'routes.php');
  const phpRoutesSource = `<?php use App\\Controller\\C3PhpRouteController as Target;
use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator;
return static function (RoutingConfigurator $routes): void {
    $routes->add('c3.route', '/c3')->controller([Target::class, 'view']);
};`;
  await vscode.workspace.fs.writeFile(routeControllerUri, Buffer.from(routeControllerSource));
  await vscode.workspace.fs.writeFile(phpRoutesUri, Buffer.from(phpRoutesSource));
  const routeControllerDocument = await vscode.workspace.openTextDocument(routeControllerUri);
  const phpRoutesDocument = await vscode.workspace.openTextDocument(phpRoutesUri);
  await vscode.window.showTextDocument(phpRoutesDocument);
  const routeDefinition = async (needle: string): Promise<vscode.Location[]> => vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', phpRoutesUri, phpRoutesDocument.positionAt(phpRoutesDocument.getText().indexOf(needle) + 2))
    .then((items) => items ?? []);
  let routeClassDefinitions: vscode.Location[] = []; let routeMethodDefinitions: vscode.Location[] = [];
  const hasRouteMethod = (): boolean => routeMethodDefinitions.some((item) => item.uri.toString() === routeControllerUri.toString()
    && routeControllerSource.slice(routeControllerDocument.offsetAt(item.range.start), routeControllerDocument.offsetAt(item.range.end)) === 'view');
  const routeDeadline = Date.now() + 20_000;
  while (Date.now() < routeDeadline) {
    routeClassDefinitions = await routeDefinition('Target::class');
    routeMethodDefinitions = await routeDefinition("'view'");
    if (routeClassDefinitions.some((item) => item.uri.toString() === routeControllerUri.toString()) && hasRouteMethod()) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(routeClassDefinitions.some((item) => item.uri.toString() === routeControllerUri.toString()),
    'Independent SoPHP Symfony Definition missed a PHP route controller alias');
  assert.ok(hasRouteMethod(),
    'Independent SoPHP Symfony Definition missed a PHP route controller method string');
  console.log('C3 PHP routes.php controller alias and method Definition reached the independent Symfony provider');
  const yamlRoutesUri = vscode.Uri.joinPath(folder.uri, 'config', 'routes.yaml');
  const yamlRoutesDocument = await vscode.workspace.openTextDocument(yamlRoutesUri);
  const userControllerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'UserController.php');
  const yamlControllerPosition = yamlRoutesDocument.positionAt(yamlRoutesDocument.getText().indexOf('UserController') + 2);
  const yamlControllerDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', yamlRoutesUri, yamlControllerPosition);
  assert.ok(yamlControllerDefinitions?.some((item) => item.uri.toString() === userControllerUri.toString()),
    'Independent SoPHP Symfony Definition missed the conventional YAML route controller');
  const unrelatedYamlUri = vscode.Uri.joinPath(folder.uri, 'config', 'workflow.yaml');
  await vscode.workspace.fs.writeFile(unrelatedYamlUri, Buffer.from(yamlRoutesDocument.getText()));
  try {
    const unrelatedYamlDocument = await vscode.workspace.openTextDocument(unrelatedYamlUri);
    const unrelatedDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', unrelatedYamlUri,
      unrelatedYamlDocument.positionAt(unrelatedYamlDocument.getText().indexOf('UserController') + 2));
    assert.ok(!unrelatedDefinitions?.some((item) => item.uri.toString() === userControllerUri.toString()),
      'SoPHP Symfony returned a PHP controller from unrelated YAML');
  } finally {
    await vscode.workspace.fs.delete(unrelatedYamlUri);
  }
  console.log('C3 Symfony YAML Controller Definition kept the route source boundary');
  const servicesUri = vscode.Uri.joinPath(folder.uri, 'config', 'services.yaml');
  const xmlServicesUri = vscode.Uri.joinPath(folder.uri, 'config', 'services.xml');
  const servicesDocument = await vscode.workspace.openTextDocument(servicesUri);
  const xmlServicesSource = Buffer.from(await vscode.workspace.fs.readFile(xmlServicesUri)).toString('utf8');
  assert.ok(!vscode.workspace.textDocuments.some((item) => item.uri.toString() === xmlServicesUri.toString()),
    'Symfony XML target must remain closed for the disk snapshot regression');
  await vscode.window.showTextDocument(servicesDocument);
  console.log('C3 Symfony services YAML editor and closed XML snapshot are ready');
  const servicePosition = servicesDocument.positionAt(servicesDocument.getText().indexOf('app.mailer:') + 3);
  let readyServiceRename: vscode.WorkspaceEdit | undefined;
  for (let attempt = 0; attempt < 100 && !readyServiceRename; attempt += 1) {
    try {
      readyServiceRename = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
        'vscode.executeDocumentRenameProvider', servicesUri, servicePosition, 'app.mailer_renamed');
    } catch (error) {
      if (!/Canceled/.test(error instanceof Error ? error.message : String(error))) throw error;
    }
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
  if (phpunitProfile) {
    const phpunit = vscode.extensions.getExtension(testProviderId);
    assert.ok(phpunit, `Test Provider ${testProviderId} did not load`);
    await phpunit.activate();
    await vscode.commands.executeCommand(testProviderId === 'aossoftware.aos-phpunit'
      ? 'phpunitRunner.refreshTests' : 'phpunit.reload');
    if (testProviderId === 'aossoftware.aos-phpunit') {
      const php = process.env.PHP_COMPANION_TEST_TEST_PROVIDER_PHP;
      const executable = process.env.PHP_COMPANION_TEST_TEST_PROVIDER_PHPUNIT;
      assert.ok(php && executable, 'PHPUnit Runner gate needs independent PHP and PHPUnit executables');
      await vscode.workspace.getConfiguration('phpunitRunner', folder.uri).update('phpExecutable', php, vscode.ConfigurationTarget.Workspace);
      await vscode.workspace.getConfiguration('phpunitRunner', folder.uri).update('phpunitCommand', executable, vscode.ConfigurationTarget.Workspace);
      const runUri = vscode.Uri.joinPath(folder.uri, 'tests', 'ProfileRunnerTest.php');
      const resultUri = vscode.Uri.joinPath(folder.uri, 'phpunit-runner-passed.txt');
      await vscode.workspace.fs.writeFile(runUri, Buffer.from(`<?php
final class ProfileRunnerTest extends \\PHPUnit\\Framework\\TestCase {
    public function testRunFromEditor(): void {
        file_put_contents(dirname(__DIR__) . '/phpunit-runner-passed.txt', 'passed');
        self::assertTrue(true);
    }
}
`));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(runUri));
      await vscode.commands.executeCommand('phpunitRunner.refreshTests');
      await vscode.commands.executeCommand('phpunitRunner.runCurrentFile');
      let executed = false;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        let contents: Uint8Array | undefined;
        try { contents = await vscode.workspace.fs.readFile(resultUri); } catch { /* Test has not run yet. */ }
        if (contents && Buffer.from(contents).toString('utf8') === 'passed') { executed = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(executed, 'PHPUnit Runner did not execute the configured PHPUnit test from the editor');
    }
    const testUri = vscode.Uri.joinPath(folder.uri, 'tests', 'ProfileTest.php');
    const renamedTestUri = vscode.Uri.joinPath(folder.uri, 'tests', 'C3RenamedProfileTest.php');
    const testDocument = await vscode.workspace.openTextDocument(testUri);
    await vscode.window.showTextDocument(testDocument);
    const testRename = new vscode.WorkspaceEdit();
    testRename.renameFile(testUri, renamedTestUri);
    assert.ok(await vscode.workspace.applyEdit(testRename), 'Could not rename the configured PHPUnit test file');
    assert.ok((await vscode.workspace.openTextDocument(renamedTestUri)).getText().includes('class ProfileTest'));
    await vscode.commands.executeCommand('undo');
    assert.ok((await vscode.workspace.openTextDocument(testUri)).getText().includes('class ProfileTest'),
      'One Undo did not restore the PHPUnit test file');
    await vscode.commands.executeCommand('redo');
    assert.ok((await vscode.workspace.openTextDocument(renamedTestUri)).getText().includes('class ProfileTest'),
      'One Redo did not restore the renamed PHPUnit test file');
    const configuredUri = vscode.Uri.joinPath(folder.uri, 'tests', 'C3ConfiguredTest.php');
    const renamedConfiguredUri = vscode.Uri.joinPath(folder.uri, 'tests', 'C3RenamedTest.php');
    const configuredDocument = await vscode.workspace.openTextDocument(configuredUri);
    await vscode.window.showTextDocument(configuredDocument);
    const configuredPosition = configuredDocument.positionAt(configuredDocument.getText().indexOf('class C3ConfiguredTest')
      + 'class '.length + 3);
    assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
      uri: configuredUri, position: configuredPosition, newName: 'C3RenamedTest', testPreviewAction: async () => 'apply',
    }), true, 'SoPHP could not rename the configured PHPUnit test class');
    assert.ok((await vscode.workspace.openTextDocument(renamedConfiguredUri)).getText().includes('class C3RenamedTest'),
      'SoPHP Rename did not change both the PHPUnit test file and class');
    await vscode.commands.executeCommand('undo');
    assert.ok((await vscode.workspace.openTextDocument(configuredUri)).getText().includes('class C3ConfiguredTest'),
      'One Undo did not restore the configured PHPUnit test file and class');
    await vscode.commands.executeCommand('redo');
    assert.ok((await vscode.workspace.openTextDocument(renamedConfiguredUri)).getText().includes('class C3RenamedTest'),
      'One Redo did not restore the renamed PHPUnit test file and class');
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    assert.deepStrictEqual(profileRenameErrors, [],
      'Open Source Pack emitted an unhandled stale-file read during C3 Rename');
  }
  const xmlDocument = await vscode.workspace.openTextDocument(xmlServicesUri);
  const dirtyXml = changedXml.replace('</container>', '  <!-- unsaved buffer before Rename -->\n</container>');
  const dirtyXmlEdit = new vscode.WorkspaceEdit();
  dirtyXmlEdit.replace(xmlServicesUri, new vscode.Range(xmlDocument.positionAt(0),
    xmlDocument.positionAt(xmlDocument.getText().length)), dirtyXml);
  assert.ok(await vscode.workspace.applyEdit(dirtyXmlEdit));
  assert.ok(xmlDocument.isDirty, 'The Symfony XML Rename target was not an unsaved buffer');
  const expectedXmlHash = createHash('sha256').update(xmlDocument.getText()).digest('hex');
  let serverXmlHash = '';
  for (let attempt = 0; attempt < 100 && serverXmlHash !== expectedXmlHash; attempt += 1) {
    const hashes = await api.requestLanguageServer<Record<string, string>>('phpCompanion/testFrameworkSnapshotHashes', {});
    serverXmlHash = hashes[xmlServicesUri.toString()] ?? '';
    if (serverXmlHash !== expectedXmlHash) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.strictEqual(serverXmlHash, expectedXmlHash,
    'The server did not receive the unsaved Symfony XML source snapshot');
  let dirtyServiceRename: vscode.WorkspaceEdit | undefined;
  for (let attempt = 0; attempt < 100 && !dirtyServiceRename; attempt += 1) {
    dirtyServiceRename = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
      'vscode.executeDocumentRenameProvider', servicesUri, servicePosition, 'app.mailer_dirty_probe').then((edit) => edit, () => undefined);
    if (!dirtyServiceRename) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(dirtyServiceRename?.entries().some(([uri]) => uri.toString() === xmlServicesUri.toString()),
    'Symfony service Rename did not include the unsaved XML target');
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testPauseNextQuery', { method: 'symfonyRename' }), true);
  const heldDirtyServiceRename = vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
    'vscode.executeDocumentRenameProvider', servicesUri, servicePosition, 'app.mailer_dirty_probe')
    .then((edit) => edit, (error: unknown) => {
      assert.match(error instanceof Error ? error.message : String(error), /changed|Rename/);
      return undefined;
    });
  await waitForState(api, 'symfonyRename', servicesDocument, (state) => state.paused,
    'Symfony service Rename response was not held before the dirty XML disk changed');
  const externalDirtyXml = changedXml.replace('</container>', '  <!-- external disk edit behind unsaved buffer -->\n</container>');
  await vscode.workspace.fs.writeFile(xmlServicesUri, Buffer.from(externalDirtyXml));
  assert.strictEqual(await api.requestLanguageServer<boolean>('phpCompanion/testReleaseQuery', { method: 'symfonyRename' }), true);
  assert.strictEqual(await heldDirtyServiceRename, undefined,
    'Symfony Rename returned stale edits after the disk changed behind an unsaved XML target');
  assert.strictEqual(xmlDocument.getText(), dirtyXml, 'Symfony Rename changed the unsaved XML buffer');
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(xmlServicesUri)).toString('utf8'), externalDirtyXml,
    'Symfony Rename overwrote the independent disk edit behind the unsaved XML buffer');
  console.log('C3 Symfony Rename rejected an external XML disk change behind an unsaved buffer');
  console.log('C3 held server import requests: addImport, planTypeImports, organizeImports; all rejected stale edits.');
  const versionConfiguration = vscode.workspace.getConfiguration('phpCompanion', folder.uri);
  const originalFolderVersion = versionConfiguration.inspect<string>('phpVersion')?.workspaceFolderValue;
  const changedVersionUri = vscode.Uri.joinPath(serviceDirectory, 'match.php');
  let versionPreviewOpened = false;
  try {
    await versionConfiguration.update('phpVersion', '7.4', vscode.ConfigurationTarget.WorkspaceFolder);
    await vscode.commands.executeCommand('phpCompanion.detectPhpVersions');
    await vscode.commands.executeCommand('phpCompanion._testCreatePhpType', 'class', 'match', serviceDirectory,
      async () => {
        versionPreviewOpened = true;
        assert.ok(vscode.window.activeTextEditor?.document.getText().includes('class match'),
          'PHP 7.4 did not allow a type name reserved only by PHP 8');
        await versionConfiguration.update('phpVersion', '8.5', vscode.ConfigurationTarget.WorkspaceFolder);
        return 'apply';
      });
    assert.strictEqual(versionPreviewOpened, true, 'PHP 7.4 generation did not open the preview');
    await assert.rejects(async () => vscode.workspace.fs.stat(changedVersionUri),
      'Type generation applied a preview after the target PHP version changed');
  } finally {
    await versionConfiguration.update('phpVersion', originalFolderVersion, vscode.ConfigurationTarget.WorkspaceFolder);
    await vscode.commands.executeCommand('phpCompanion.detectPhpVersions');
  }
  const nestedExtractUri = vscode.Uri.joinPath(serviceDirectory, 'C3NestedArrayExtract.php');
  const nestedExtractSource = `<?php namespace App\\Service;
function makeNestedLabel(array $payload): string { return 'ready'; }
final class C3NestedArrayExtract {
    public function run(): string {
        $result = makeNestedLabel(array('x'));
        return $result;
    }
}`;
  await vscode.workspace.fs.writeFile(nestedExtractUri, Buffer.from(nestedExtractSource));
  const nestedExtractDocument = await vscode.workspace.openTextDocument(nestedExtractUri);
  await vscode.window.showTextDocument(nestedExtractDocument);
  const nestedSelection = "$result = makeNestedLabel(array('x'));";
  const nestedStart = nestedExtractSource.indexOf(nestedSelection);
  let nestedAction: vscode.CodeAction | undefined;
  for (let attempt = 0; attempt < 100 && !nestedAction; attempt += 1) {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', nestedExtractUri,
      new vscode.Range(nestedExtractDocument.positionAt(nestedStart),
        nestedExtractDocument.positionAt(nestedStart + nestedSelection.length)), vscode.CodeActionKind.RefactorExtract.value);
    nestedAction = actions.find((action): action is vscode.CodeAction => 'command' in action
      && action.title === 'Extract method extractedMethod' && Boolean(action.command));
    if (!nestedAction) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(nestedAction?.command, 'C3 nested-array call did not offer Extract Method for its proven native return.');
  await vscode.commands.executeCommand(nestedAction.command.command, ...nestedAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(nestedExtractDocument.getText().includes('private function extractedMethod(): string'),
    'C3 Extract Method lost the native string output type behind a legacy array argument.');
  await vscode.window.showTextDocument(nestedExtractDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(nestedExtractDocument.getText(), nestedExtractSource,
    'C3 nested-array Extract Method did not restore its original source in one Undo.');
  await vscode.commands.executeCommand('redo');
  assert.ok(nestedExtractDocument.getText().includes('private function extractedMethod(): string'),
    'C3 nested-array Extract Method did not restore its typed output in one Redo.');
  const nestedInputUri = vscode.Uri.joinPath(serviceDirectory, 'C3NestedArrayInput.php');
  const nestedInputSource = `<?php namespace App\\Service;
final class C3NestedArrayInput {
    private function dispatch(string $label, array $payload): void {}
    public function run(string $label): void {
        $this->dispatch($label, array('x'));
    }
}`;
  await vscode.workspace.fs.writeFile(nestedInputUri, Buffer.from(nestedInputSource));
  const nestedInputDocument = await vscode.workspace.openTextDocument(nestedInputUri);
  await vscode.window.showTextDocument(nestedInputDocument);
  const nestedInputSelection = "$this->dispatch($label, array('x'));";
  const nestedInputStart = nestedInputSource.indexOf(nestedInputSelection);
  const nestedInputAction = async (): Promise<vscode.CodeAction> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
        'vscode.executeCodeActionProvider', nestedInputUri,
        new vscode.Range(nestedInputDocument.positionAt(nestedInputStart),
          nestedInputDocument.positionAt(nestedInputStart + nestedInputSelection.length)), vscode.CodeActionKind.RefactorExtract.value);
      const found = actions.find((action): action is vscode.CodeAction => 'command' in action
        && action.title === 'Extract method extractedMethod' && Boolean(action.command));
      if (found?.command) return found;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail('C3 nested-array call did not offer Extract Method for its proven by-value input.');
  };
  const cancelledNestedInput = await nestedInputAction();
  await vscode.commands.executeCommand(cancelledNestedInput.command!.command, ...cancelledNestedInput.command!.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(nestedInputDocument.getText(), nestedInputSource,
    'Cancelling C3 nested-array Extract Method changed the source.');
  const appliedNestedInput = await nestedInputAction();
  await vscode.commands.executeCommand(appliedNestedInput.command!.command, ...appliedNestedInput.command!.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(nestedInputDocument.getText().includes('private function extractedMethod(string $label): void')
    && nestedInputDocument.getText().includes('$this->extractedMethod($label);'),
  'C3 Extract Method omitted the proven by-value input behind a legacy array argument.');
  await vscode.window.showTextDocument(nestedInputDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(nestedInputDocument.getText(), nestedInputSource,
    'C3 nested-array input extraction did not restore its source in one Undo.');
  await vscode.commands.executeCommand('redo');
  assert.ok(nestedInputDocument.getText().includes('private function extractedMethod(string $label): void'),
    'C3 nested-array input extraction did not restore its parameter in one Redo.');
  console.log('C3 nested-array Extract Method: typed output and by-value input, cancel/apply, one Undo/Redo');
  const echoMethodUri = vscode.Uri.joinPath(serviceDirectory, 'C3EchoExtractMethod.php');
  const echoMethodSource = `<?php namespace App\\Service;
final class C3EchoExtractMethod {
    public function display(string $message): void {
        echo $message;
    }
    public function displayPair(string $first, string $second): void {
        echo $first, $second;
    }
    public function displayJoined(string $first, string $second): void {
        echo $first . $second;
    }
    public function displayJoinedObject(string $first, object $second): void {
        echo $first . $second;
    }
}`;
  await vscode.workspace.fs.writeFile(echoMethodUri, Buffer.from(echoMethodSource));
  const echoMethodDocument = await vscode.workspace.openTextDocument(echoMethodUri);
  await vscode.window.showTextDocument(echoMethodDocument);
  const echoMethodStart = echoMethodSource.indexOf('echo $message;');
  const echoMethodActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', echoMethodUri,
    new vscode.Range(echoMethodDocument.positionAt(echoMethodStart),
      echoMethodDocument.positionAt(echoMethodStart + 'echo $message;'.length)), vscode.CodeActionKind.RefactorExtract.value);
  const echoMethodAction = echoMethodActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod');
  assert.ok(echoMethodAction?.command, 'Single echo statement did not offer Extract Method.');
  await vscode.commands.executeCommand(echoMethodAction.command.command, ...echoMethodAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(echoMethodDocument.getText().includes('$this->extractedMethod($message);')
    && echoMethodDocument.getText().includes('private function extractedMethod(string $message): void')
    && echoMethodDocument.getText().includes('echo $message;'),
  'Extract Method did not preserve the echo statement and its input.');
  await vscode.window.showTextDocument(echoMethodDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(echoMethodDocument.getText(), echoMethodSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(echoMethodDocument.getText().includes('private function extractedMethod(string $message): void'));
  console.log('C3 Extract Method from a single echo statement: input, preview, apply and one Undo/Redo');
  const pairMethodSource = echoMethodDocument.getText();
  const pairMethodStart = pairMethodSource.indexOf('echo $first, $second;');
  const pairMethodActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', echoMethodUri,
    new vscode.Range(echoMethodDocument.positionAt(pairMethodStart),
      echoMethodDocument.positionAt(pairMethodStart + 'echo $first, $second;'.length)), vscode.CodeActionKind.RefactorExtract.value);
  const pairMethodAction = pairMethodActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod2');
  assert.ok(pairMethodAction?.command, 'Scalar variable pair did not offer Extract Method.');
  await vscode.commands.executeCommand(pairMethodAction.command.command, ...pairMethodAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(echoMethodDocument.getText().includes('$this->extractedMethod2($first, $second);')
    && echoMethodDocument.getText().includes('private function extractedMethod2(string $first, string $second): void')
    && echoMethodDocument.getText().includes('echo $first, $second;'),
  'Extract Method did not preserve the scalar echo pair and its order.');
  await vscode.window.showTextDocument(echoMethodDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(echoMethodDocument.getText(), pairMethodSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(echoMethodDocument.getText().includes('private function extractedMethod2(string $first, string $second): void'));
  console.log('C3 Extract Method from scalar echo pair: order, preview, apply and one Undo/Redo');
  const joinedMethodSource = echoMethodDocument.getText();
  const joinedMethodStart = joinedMethodSource.indexOf('echo $first . $second;');
  const joinedMethodRange = new vscode.Range(echoMethodDocument.positionAt(joinedMethodStart),
    echoMethodDocument.positionAt(joinedMethodStart + 'echo $first . $second;'.length));
  const joinedMethodActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', echoMethodUri, joinedMethodRange, vscode.CodeActionKind.RefactorExtract.value);
  const joinedMethodAction = joinedMethodActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod3');
  assert.ok(joinedMethodAction?.command, 'Scalar concatenation did not offer Extract Method.');
  await vscode.commands.executeCommand(joinedMethodAction.command.command, ...joinedMethodAction.command.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(echoMethodDocument.getText(), joinedMethodSource, 'Cancelling scalar concatenation extraction changed the source.');
  await vscode.commands.executeCommand(joinedMethodAction.command.command, ...joinedMethodAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(echoMethodDocument.getText().includes('$this->extractedMethod3($first, $second);')
    && echoMethodDocument.getText().includes('private function extractedMethod3(string $first, string $second): void')
    && echoMethodDocument.getText().includes('echo $first . $second;'),
  'Extract Method changed the scalar concatenation or its parameter order.');
  await vscode.window.showTextDocument(echoMethodDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(echoMethodDocument.getText(), joinedMethodSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(echoMethodDocument.getText().includes('private function extractedMethod3(string $first, string $second): void'));
  const objectMethodSource = echoMethodDocument.getText();
  const objectMethodStart = objectMethodSource.indexOf('echo $first . $second;', objectMethodSource.indexOf('displayJoinedObject'));
  const objectMethodActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', echoMethodUri, new vscode.Range(echoMethodDocument.positionAt(objectMethodStart),
      echoMethodDocument.positionAt(objectMethodStart + 'echo $first . $second;'.length)), vscode.CodeActionKind.RefactorExtract.value);
  assert.ok(!objectMethodActions.some((action) => action.title.startsWith('Extract method')),
    'Object concatenation offered an unsafe Extract Method.');
  console.log('C3 Extract Method from scalar concatenation: cancel/apply, one Undo/Redo, object rejection');
  const returnMethodUri = vscode.Uri.joinPath(serviceDirectory, 'C3ReturnExtractMethod.php');
  const returnMethodSource = `<?php namespace App\\Service;
final class C3ReturnExtractMethod {
    public function format(string $message): string {
        $this->mark();
        return $this->decorate($message);
    }
    public function passthrough($value) {
        return $value;
    }
    private function mark(): void {}
    private function decorate(string $message): string { return $message; }
}`;
  await vscode.workspace.fs.writeFile(returnMethodUri, Buffer.from(returnMethodSource));
  const returnMethodDocument = await vscode.workspace.openTextDocument(returnMethodUri);
  await vscode.window.showTextDocument(returnMethodDocument);
  const returnMethodStart = returnMethodSource.indexOf('$this->mark();');
  const returnMethodEnd = returnMethodSource.indexOf('return $this->decorate($message);') + 'return $this->decorate($message);'.length;
  const returnMethodActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', returnMethodUri,
    new vscode.Range(returnMethodDocument.positionAt(returnMethodStart), returnMethodDocument.positionAt(returnMethodEnd)),
    vscode.CodeActionKind.RefactorExtract.value);
  const returnMethodAction = returnMethodActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod');
  assert.ok(returnMethodAction?.command, 'Returning statement sequence did not offer Extract Method.');
  await vscode.commands.executeCommand(returnMethodAction.command.command, ...returnMethodAction.command.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(returnMethodDocument.getText(), returnMethodSource,
    'Cancelling returning Extract Method changed the source.');
  await vscode.commands.executeCommand(returnMethodAction.command.command, ...returnMethodAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(returnMethodDocument.getText().includes('return $this->extractedMethod($message);')
    && returnMethodDocument.getText().includes('private function extractedMethod(string $message): string')
    && returnMethodDocument.getText().includes('$this->mark();\n        return $this->decorate($message);'),
  'Returning Extract Method did not preserve the call, input, type and statement order.');
  await vscode.window.showTextDocument(returnMethodDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(returnMethodDocument.getText(), returnMethodSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(returnMethodDocument.getText().includes('private function extractedMethod(string $message): string'));
  console.log('C3 Extract Method from returning sequence: type, input, cancel/apply and one Undo/Redo');
  const untypedReturnSource = returnMethodDocument.getText();
  const untypedReturnStart = untypedReturnSource.indexOf('return $value;');
  const untypedReturnActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', returnMethodUri,
    new vscode.Range(returnMethodDocument.positionAt(untypedReturnStart),
      returnMethodDocument.positionAt(untypedReturnStart + 'return $value;'.length)), vscode.CodeActionKind.RefactorExtract.value);
  const untypedReturnAction = untypedReturnActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod2');
  assert.ok(untypedReturnAction?.command, 'Untyped return did not offer Extract Method.');
  await vscode.commands.executeCommand(untypedReturnAction.command.command, ...untypedReturnAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(returnMethodDocument.getText().includes('return $this->extractedMethod2($value);')
    && returnMethodDocument.getText().includes('private function extractedMethod2($value)')
    && !returnMethodDocument.getText().includes('private function extractedMethod2($value):'),
  'Untyped return extraction introduced a native return type or lost the input.');
  await vscode.window.showTextDocument(returnMethodDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(returnMethodDocument.getText(), untypedReturnSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(returnMethodDocument.getText().includes('private function extractedMethod2($value)'));
  console.log('C3 Extract Method from untyped return: input, apply and one Undo/Redo');
  const multipleOutputUri = vscode.Uri.joinPath(serviceDirectory, 'C3MultipleOutputExtractMethod.php');
  const multipleOutputSource = `<?php namespace App\\Service;
final class C3MultipleOutputExtractMethod {
    public function build(string $seed): string {
        $first = $this->decorate($seed);
        $second = $this->suffix();
        return $first . $second;
    }
    public function partial(): string {
        $first = 'one';
        $second = $this->dynamicSuffix();
        return $first . $second;
    }
    private function decorate(string $seed): string { return strtoupper($seed); }
    private function suffix(): string { return '!'; }
    private function dynamicSuffix() { return '!'; }
}`;
  await vscode.workspace.fs.writeFile(multipleOutputUri, Buffer.from(multipleOutputSource));
  const multipleOutputDocument = await vscode.workspace.openTextDocument(multipleOutputUri);
  await vscode.window.showTextDocument(multipleOutputDocument);
  const multipleOutputStart = multipleOutputSource.indexOf('$first =');
  const multipleOutputEnd = multipleOutputSource.indexOf('$second =') + '$second = $this->suffix();'.length;
  const multipleOutputActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', multipleOutputUri,
    new vscode.Range(multipleOutputDocument.positionAt(multipleOutputStart), multipleOutputDocument.positionAt(multipleOutputEnd)),
    vscode.CodeActionKind.RefactorExtract.value);
  const multipleOutputAction = multipleOutputActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod');
  assert.ok(multipleOutputAction?.command, 'Two independent outputs did not offer Extract Method.');
  await vscode.commands.executeCommand(multipleOutputAction.command.command, ...multipleOutputAction.command.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(multipleOutputDocument.getText(), multipleOutputSource,
    'Cancelling multiple-output Extract Method changed the source.');
  await vscode.commands.executeCommand(multipleOutputAction.command.command, ...multipleOutputAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  const multipleOutputResult = multipleOutputDocument.getText();
  assert.ok(multipleOutputResult.includes('[$first, $second] = $this->extractedMethod($seed);')
    && multipleOutputResult.includes('/** @return array{0: string, 1: string} */')
    && multipleOutputResult.includes('private function extractedMethod(string $seed): array')
    && multipleOutputResult.includes('$first = $this->decorate($seed);\n        $second = $this->suffix();\n        return [$first, $second];')
    && multipleOutputResult.includes('return $first . $second;'),
  'Multiple-output extraction lost assignment order, return values or the consumer.');
  const multipleOutputHover = async (variable: '$first' | '$second'): Promise<string> => {
    const current = multipleOutputDocument.getText();
    const use = current.indexOf(`return $first . $second;`);
    const offset = current.indexOf(variable, use) + 2;
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', multipleOutputUri, multipleOutputDocument.positionAt(offset)) ?? [];
    return hovers.flatMap((hover) => hover.contents).map((part) => typeof part === 'string' ? part : part.value).join('\n');
  };
  let firstType = ''; let secondType = '';
  const multipleOutputHoverDeadline = Date.now() + 20_000;
  while (Date.now() < multipleOutputHoverDeadline) {
    [firstType, secondType] = await Promise.all([multipleOutputHover('$first'), multipleOutputHover('$second')]);
    if (firstType.includes('$first: string') && secondType.includes('$second: string')) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(firstType.includes('$first: string') && secondType.includes('$second: string'),
    `Multiple-output extraction lost local type feedback: first=${firstType}, second=${secondType}`);
  await vscode.window.showTextDocument(multipleOutputDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(multipleOutputDocument.getText(), multipleOutputSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(multipleOutputDocument.getText().includes('[$first, $second] = $this->extractedMethod($seed);'));
  console.log('C3 Extract Method with two outputs: preview, cancel/apply and one Undo/Redo');
  const partialOutputSource = multipleOutputDocument.getText();
  const partialOutputStart = partialOutputSource.indexOf("$first = 'one';", partialOutputSource.indexOf('public function partial('));
  const partialOutputEnd = partialOutputSource.indexOf('$second =', partialOutputStart) + '$second = $this->dynamicSuffix();'.length;
  const partialOutputActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', multipleOutputUri,
    new vscode.Range(multipleOutputDocument.positionAt(partialOutputStart), multipleOutputDocument.positionAt(partialOutputEnd)),
    vscode.CodeActionKind.RefactorExtract.value);
  const partialOutputAction = partialOutputActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod2');
  assert.ok(partialOutputAction?.command, 'Partially known outputs did not offer Extract Method.');
  await vscode.commands.executeCommand(partialOutputAction.command.command, ...partialOutputAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(multipleOutputDocument.getText().includes('/** @return array{0: string, 1: mixed} */')
    && multipleOutputDocument.getText().includes('[$first, $second] = $this->extractedMethod2();'),
  'Partial output extraction lost the proven first type or the call.');
  const partialUse = multipleOutputDocument.getText().indexOf('return $first . $second;', multipleOutputDocument.getText().indexOf('public function partial('));
  let partialHover = '';
  const partialHoverDeadline = Date.now() + 20_000;
  while (Date.now() < partialHoverDeadline) {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', multipleOutputUri, multipleOutputDocument.positionAt(partialUse + 'return '.length + 2)) ?? [];
    partialHover = hovers.flatMap((hover) => hover.contents).map((part) => typeof part === 'string' ? part : part.value).join('\n');
    if (partialHover.includes('$first: string')) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(partialHover.includes('$first: string'), `Partial output lost its proven string Hover: ${partialHover}`);
  await vscode.window.showTextDocument(multipleOutputDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(multipleOutputDocument.getText(), partialOutputSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(multipleOutputDocument.getText().includes('/** @return array{0: string, 1: mixed} */'));
  console.log('C3 partial output Extract Method: preserved known Hover, apply and one Undo/Redo');
  const branchExtractUri = vscode.Uri.joinPath(serviceDirectory, 'C3BranchExtract.php');
  const branchExtractSource = `<?php namespace App\\Service;
final class C3BranchExtract {
    public function run(bool $flag, bool $enabled): string {
        if ($flag && !$enabled) {
            $result = $this->first();
        } elseif ($enabled) {
            $result = $this->second();
        } else {
            $result = $this->third();
        }
        return $result;
    }
    private function first(): string { return 'one'; }
    private function second(): string { return 'two'; }
    private function third(): string { return 'three'; }
}`;
  await vscode.workspace.fs.writeFile(branchExtractUri, Buffer.from(branchExtractSource));
  const branchExtractDocument = await vscode.workspace.openTextDocument(branchExtractUri);
  await vscode.window.showTextDocument(branchExtractDocument);
  const branchExtractStart = branchExtractSource.indexOf('if ($flag && !$enabled)');
  const branchExtractEnd = branchExtractSource.indexOf('\n        return $result;', branchExtractStart);
  const branchExtractActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', branchExtractUri,
    new vscode.Range(branchExtractDocument.positionAt(branchExtractStart), branchExtractDocument.positionAt(branchExtractEnd)),
    vscode.CodeActionKind.RefactorExtract.value);
  const branchExtractAction = branchExtractActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod');
  assert.ok(branchExtractAction?.command, 'Proven if/else output did not offer Extract Method.');
  await vscode.commands.executeCommand(branchExtractAction.command.command, ...branchExtractAction.command.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(branchExtractDocument.getText(), branchExtractSource,
    'Cancelling if/else Extract Method changed the source.');
  await vscode.commands.executeCommand(branchExtractAction.command.command, ...branchExtractAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  const branchExtractResult = branchExtractDocument.getText();
  assert.ok(branchExtractResult.includes('$result = $this->extractedMethod($flag, $enabled);')
    && branchExtractResult.includes('private function extractedMethod(bool $flag, bool $enabled): string')
    && branchExtractResult.includes('if ($flag && !$enabled)')
    && branchExtractResult.includes('} elseif ($enabled) {')
    && branchExtractResult.includes('return $result;'),
  'If/else Extract Method lost the condition, output or return type.');
  const branchUse = branchExtractResult.indexOf('return $result;');
  let branchHover = '';
  const branchHoverDeadline = Date.now() + 20_000;
  while (Date.now() < branchHoverDeadline) {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', branchExtractUri, branchExtractDocument.positionAt(branchUse + 'return '.length + 2)) ?? [];
    branchHover = hovers.flatMap((hover) => hover.contents).map((part) => typeof part === 'string' ? part : part.value).join('\n');
    if (branchHover.includes('$result: string')) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(branchHover.includes('$result: string'), `If/else Extract Method lost output Hover: ${branchHover}`);
  await vscode.window.showTextDocument(branchExtractDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(branchExtractDocument.getText(), branchExtractSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(branchExtractDocument.getText().includes('$result = $this->extractedMethod($flag, $enabled);'));
  console.log('C3 if/elseif/else output Extract Method: preview, cancel/apply, Hover and one Undo/Redo');
  const branchReturnUri = vscode.Uri.joinPath(serviceDirectory, 'C3BranchReturn.php');
  const branchReturnSource = `<?php namespace App\\Service;
final class C3BranchReturn {
    public function run(bool $flag, bool $enabled): string {
        if ($flag) {
            return $this->first();
        } elseif ($enabled) {
            return $this->second();
        } else {
            return $this->third();
        }
    }
    private function first(): string { return 'one'; }
    private function second(): string { return 'two'; }
    private function third(): string { return 'three'; }
}`;
  await vscode.workspace.fs.writeFile(branchReturnUri, Buffer.from(branchReturnSource));
  const branchReturnDocument = await vscode.workspace.openTextDocument(branchReturnUri);
  await vscode.window.showTextDocument(branchReturnDocument);
  const branchReturnStart = branchReturnSource.indexOf('if ($flag)');
  const branchReturnEnd = branchReturnSource.indexOf('\n    }\n    private', branchReturnStart);
  const branchReturnActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', branchReturnUri,
    new vscode.Range(branchReturnDocument.positionAt(branchReturnStart), branchReturnDocument.positionAt(branchReturnEnd)),
    vscode.CodeActionKind.RefactorExtract.value);
  const branchReturnAction = branchReturnActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod');
  assert.ok(branchReturnAction?.command, 'Complete if/elseif/else returns did not offer Extract Method.');
  await vscode.commands.executeCommand(branchReturnAction.command.command, ...branchReturnAction.command.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(branchReturnDocument.getText(), branchReturnSource,
    'Cancelling conditional return Extract Method changed the source.');
  await vscode.commands.executeCommand(branchReturnAction.command.command, ...branchReturnAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(branchReturnDocument.getText().includes('return $this->extractedMethod($flag, $enabled);')
    && branchReturnDocument.getText().includes('private function extractedMethod(bool $flag, bool $enabled): string')
    && branchReturnDocument.getText().includes('return $this->third();'),
  'Conditional return Extract Method lost its return flow or type.');
  await vscode.window.showTextDocument(branchReturnDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(branchReturnDocument.getText(), branchReturnSource,
    'One Undo did not restore conditional return Extract Method.');
  await vscode.commands.executeCommand('redo');
  assert.ok(branchReturnDocument.getText().includes('return $this->extractedMethod($flag, $enabled);'),
    'One Redo did not restore conditional return Extract Method.');
  console.log('C3 if/elseif/else return Extract Method: preview, cancel/apply and one Undo/Redo');
  const untypedBranchUri = vscode.Uri.joinPath(serviceDirectory, 'C3UntypedBranchReturn.php');
  const untypedBranchSource = branchReturnSource.replaceAll('C3BranchReturn', 'C3UntypedBranchReturn')
    .replace('run(bool $flag, bool $enabled): string', 'run(bool $flag, bool $enabled)')
    .replace('return $this->second();', 'return 42;')
    .replace('return $this->third();', 'return $enabled;');
  await vscode.workspace.fs.writeFile(untypedBranchUri, Buffer.from(untypedBranchSource));
  const untypedBranchDocument = await vscode.workspace.openTextDocument(untypedBranchUri);
  await vscode.window.showTextDocument(untypedBranchDocument);
  const untypedStart = untypedBranchSource.indexOf('if ($flag)');
  const untypedEnd = untypedBranchSource.indexOf('\n    }\n    private', untypedStart);
  const untypedActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', untypedBranchUri,
    new vscode.Range(untypedBranchDocument.positionAt(untypedStart), untypedBranchDocument.positionAt(untypedEnd)),
    vscode.CodeActionKind.RefactorExtract.value);
  const untypedAction = untypedActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod');
  assert.ok(untypedAction?.command, 'Untyped conditional returns did not offer Extract Method.');
  await vscode.commands.executeCommand(untypedAction.command.command, ...untypedAction.command.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(untypedBranchDocument.getText(), untypedBranchSource,
    'Cancelling untyped conditional return Extract Method changed the source.');
  await vscode.commands.executeCommand(untypedAction.command.command, ...untypedAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(untypedBranchDocument.getText().includes('return $this->extractedMethod($flag, $enabled);')
    && untypedBranchDocument.getText().includes('private function extractedMethod(bool $flag, bool $enabled)\n')
    && untypedBranchDocument.getText().includes('return 42;')
    && untypedBranchDocument.getText().includes('return $enabled;'),
  'Untyped conditional return Extract Method changed the mixed return values or added a return type.');
  await vscode.window.showTextDocument(untypedBranchDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(untypedBranchDocument.getText(), untypedBranchSource,
    'One Undo did not restore untyped conditional return Extract Method.');
  await vscode.commands.executeCommand('redo');
  assert.ok(untypedBranchDocument.getText().includes('return $this->extractedMethod($flag, $enabled);'),
    'One Redo did not restore untyped conditional return Extract Method.');
  console.log('C3 untyped mixed-value conditional return Extract Method: cancel/apply and one Undo/Redo');
  const guardReturnSource = `<?php namespace App\\Service;
final class C3GuardReturn {
    public function run(bool $flag): string {
        if ($flag) {
            return $this->first();
        }
        return $this->second();
    }
    private function first(): string { return 'one'; }
    private function second(): string { return 'two'; }
}`;
  const guardVariants = [
    { name: 'C3GuardReturn', source: guardReturnSource, signature: 'private function extractedMethod(bool $flag): string' },
    { name: 'C3UntypedGuardReturn', source: guardReturnSource.replaceAll('C3GuardReturn', 'C3UntypedGuardReturn')
      .replace('run(bool $flag): string', 'run(bool $flag)')
      .replace('return $this->second();', 'return 42;'), signature: 'private function extractedMethod(bool $flag)\n' },
  ];
  for (const variant of guardVariants) {
    const uri = vscode.Uri.joinPath(serviceDirectory, `${variant.name}.php`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(variant.source));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    const start = variant.source.indexOf('if ($flag)');
    const end = variant.source.indexOf('\n    }\n    private', start);
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', uri,
      new vscode.Range(document.positionAt(start), document.positionAt(end)),
      vscode.CodeActionKind.RefactorExtract.value);
    const action = actions.find((candidate): candidate is vscode.CodeAction =>
      'command' in candidate && candidate.title === 'Extract method extractedMethod');
    assert.ok(action?.command, `${variant.name} did not offer guard return Extract Method.`);
    await vscode.commands.executeCommand(action.command.command, ...action.command.arguments ?? [],
      { testPreviewAction: async () => 'cancel' });
    assert.strictEqual(document.getText(), variant.source, `${variant.name} preview cancellation changed the source.`);
    await vscode.commands.executeCommand(action.command.command, ...action.command.arguments ?? [],
      { testPreviewAction: async () => 'apply' });
    assert.ok(document.getText().includes('return $this->extractedMethod($flag);')
      && document.getText().includes(variant.signature), `${variant.name} changed the return flow or signature.`);
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(document.getText(), variant.source, `${variant.name} did not Undo in one step.`);
    await vscode.commands.executeCommand('redo');
    assert.ok(document.getText().includes('return $this->extractedMethod($flag);'), `${variant.name} did not Redo in one step.`);
  }
  console.log('C3 typed and untyped guard-return Extract Method: preview, cancel/apply and one Undo/Redo');
  const staticExtractUri = vscode.Uri.joinPath(serviceDirectory, 'C3StaticExtract.php');
  const staticExtractSource = `<?php namespace App\\Service;
final class C3StaticExtract {
    public static function run(string $message): string {
        return $message;
    }
    public static function magic(): string {
        return __METHOD__;
    }
}`;
  await vscode.workspace.fs.writeFile(staticExtractUri, Buffer.from(staticExtractSource));
  const staticExtractDocument = await vscode.workspace.openTextDocument(staticExtractUri);
  await vscode.window.showTextDocument(staticExtractDocument);
  const staticStart = staticExtractSource.indexOf('return $message;');
  const staticActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', staticExtractUri,
    new vscode.Range(staticExtractDocument.positionAt(staticStart), staticExtractDocument.positionAt(staticStart + 'return $message;'.length)),
    vscode.CodeActionKind.RefactorExtract.value);
  const staticAction = staticActions.find((action): action is vscode.CodeAction =>
    'command' in action && action.title === 'Extract method extractedMethod');
  assert.ok(staticAction?.command, 'Static method did not offer Extract Method.');
  const magicStart = staticExtractSource.indexOf('return __METHOD__;');
  const magicActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', staticExtractUri,
    new vscode.Range(staticExtractDocument.positionAt(magicStart), staticExtractDocument.positionAt(magicStart + 'return __METHOD__;'.length)),
    vscode.CodeActionKind.RefactorExtract.value);
  assert.ok(!magicActions.some((action) => action.title === 'Extract method extractedMethod'),
    'Extract Method offered to move __METHOD__ into a different method context.');
  await vscode.commands.executeCommand(staticAction.command.command, ...staticAction.command.arguments ?? [],
    { testPreviewAction: async () => 'cancel' });
  assert.strictEqual(staticExtractDocument.getText(), staticExtractSource,
    'Cancelling static Extract Method changed the source.');
  await vscode.commands.executeCommand(staticAction.command.command, ...staticAction.command.arguments ?? [],
    { testPreviewAction: async () => 'apply' });
  assert.ok(staticExtractDocument.getText().includes('return self::extractedMethod($message);')
    && staticExtractDocument.getText().includes('private static function extractedMethod(string $message): string'),
  'Static Extract Method lost its static call or return type.');
  await vscode.window.showTextDocument(staticExtractDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(staticExtractDocument.getText(), staticExtractSource,
    'One Undo did not restore static Extract Method.');
  await vscode.commands.executeCommand('redo');
  assert.ok(staticExtractDocument.getText().includes('return self::extractedMethod($message);'),
    'One Redo did not restore static Extract Method.');
  console.log('C3 static Extract Method: preview, cancel/apply, magic-constant refusal and one Undo/Redo');
  const commentedRemoveUri = vscode.Uri.joinPath(serviceDirectory, 'C3CommentedRemove.php');
  const commentedRemoveSource = `<?php namespace App\\Service;
final class C3CommentedRemove {
    public function dispatch(string $label /* keep declaration */, string $context): void {}
    public function run(): void { $this->dispatch('a' /* keep label */, 'web'); }
}`;
  await vscode.workspace.fs.writeFile(commentedRemoveUri, Buffer.from(commentedRemoveSource));
  const commentedRemoveDocument = await vscode.workspace.openTextDocument(commentedRemoveUri);
  await vscode.window.showTextDocument(commentedRemoveDocument);
  const commentedPosition = commentedRemoveDocument.positionAt(commentedRemoveSource.indexOf('$context') + 2);
  const removeCommented = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.removeMethodParameter', {
      uri: commentedRemoveUri, position: commentedPosition, testPreviewAction,
    });
  assert.strictEqual(await removeCommented(async () => 'cancel'), false,
    'C3 commented Remove Parameter reported success after cancellation.');
  assert.strictEqual(commentedRemoveDocument.getText(), commentedRemoveSource,
    'Cancelling C3 commented Remove Parameter changed the source.');
  assert.strictEqual(await removeCommented(async () => 'apply'), true,
    'C3 commented Remove Parameter did not apply.');
  assert.ok(commentedRemoveDocument.getText().includes('dispatch(string $label /* keep declaration */)')
    && commentedRemoveDocument.getText().includes("dispatch('a' /* keep label */)"),
  'C3 Remove Parameter discarded comments attached to retained parameters or arguments.');
  await vscode.window.showTextDocument(commentedRemoveDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(commentedRemoveDocument.getText(), commentedRemoveSource,
    'C3 commented Remove Parameter did not restore its source in one Undo.');
  await vscode.commands.executeCommand('redo');
  assert.ok(commentedRemoveDocument.getText().includes("dispatch('a' /* keep label */)"),
    'C3 commented Remove Parameter did not restore its retained argument comment in one Redo.');
  console.log('C3 Remove Parameter kept declaration and argument comments through cancel/apply/Undo/Redo');
  const commentedAddContractUri = vscode.Uri.joinPath(folder.uri, 'src', 'Contract', 'C3CommentedAddContract.php');
  const commentedAddServiceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3CommentedAddService.php');
  const commentedAddCallerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3CommentedAddCaller.php');
  const commentedAddContract = `<?php namespace App\\Contract;
interface C3CommentedAddContract { public function record(string $message /* note, retained */): void; }`;
  const commentedAddService = `<?php namespace App\\Service;
use App\\Contract\\C3CommentedAddContract;
final class C3CommentedAddService implements C3CommentedAddContract {
    public function record(string $message /* note, retained */): void {}
}`;
  const commentedAddCaller = `<?php namespace App\\Controller;
use App\\Contract\\C3CommentedAddContract;
final class C3CommentedAddCaller {
    public function run(C3CommentedAddContract $store): void { $store->record('x' /* note, retained */); }
}`;
  const commentedAddFiles: Array<[vscode.Uri, string]> = [[commentedAddContractUri, commentedAddContract],
    [commentedAddServiceUri, commentedAddService], [commentedAddCallerUri, commentedAddCaller]];
  await Promise.all(commentedAddFiles.map(([uri, source]) => vscode.workspace.fs.writeFile(uri, Buffer.from(source))));
  const commentedAddDocument = await vscode.workspace.openTextDocument(commentedAddContractUri);
  await vscode.window.showTextDocument(commentedAddDocument);
  const commentedAddPosition = commentedAddDocument.positionAt(commentedAddContract.indexOf('function record') + 10);
  const requestCommentedAddPlan = (): Thenable<{ changes?: Record<string, unknown> } | null> =>
    api.requestLanguageServer('phpCompanion/addMethodParameter', {
      textDocument: { uri: commentedAddContractUri.toString() }, position: commentedAddPosition,
      name: 'context', type: 'string', value: '"web"',
    });
  let commentedAddPlan = await requestCommentedAddPlan();
  for (let attempt = 0; attempt < 100 && Object.keys(commentedAddPlan?.changes ?? {}).length !== 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    commentedAddPlan = await requestCommentedAddPlan();
  }
  assert.strictEqual(Object.keys(commentedAddPlan?.changes ?? {}).length, 3,
    `Commented method-family Add Parameter omitted an affected file: ${JSON.stringify(commentedAddPlan)}`);
  const addCommentedFamily = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.addMethodParameter', {
      uri: commentedAddContractUri, position: commentedAddPosition, name: 'context', type: 'string', value: '"web"',
      testPreviewAction,
    });
  assert.strictEqual(await addCommentedFamily(async () => 'cancel'), false);
  for (const [uri, source] of commentedAddFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(), source,
    `Cancelling commented Add Parameter changed ${uri.path}`);
  assert.strictEqual(await addCommentedFamily(async () => 'apply'), true);
  assert.ok((await vscode.workspace.openTextDocument(commentedAddContractUri)).getText()
    .includes('string $message /* note, retained */, string $context'));
  assert.ok((await vscode.workspace.openTextDocument(commentedAddServiceUri)).getText()
    .includes('string $message /* note, retained */, string $context'));
  assert.ok((await vscode.workspace.openTextDocument(commentedAddCallerUri)).getText()
    .includes("'x' /* note, retained */, \"web\""));
  await vscode.commands.executeCommand('undo');
  for (const [uri, source] of commentedAddFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(), source,
    `One Undo did not restore commented Add Parameter in ${uri.path}`);
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(commentedAddCallerUri)).getText()
    .includes("'x' /* note, retained */, \"web\""),
  'One Redo did not restore commented method-family Add Parameter');
  console.log('C3 commented method-family Add Parameter: three files, cancel/apply, one Undo/Redo');
  const closedRemoveContractUri = vscode.Uri.joinPath(folder.uri, 'src', 'Contract', 'C3ClosedRemoveContract.php');
  const closedRemoveServiceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3ClosedRemoveService.php');
  const closedRemoveCallerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3ClosedRemoveCaller.php');
  const closedRemoveContract = commentedAddContract.replaceAll('C3CommentedAddContract', 'C3ClosedRemoveContract');
  const closedRemoveService = commentedAddService.replaceAll('C3CommentedAddContract', 'C3ClosedRemoveContract')
    .replaceAll('C3CommentedAddService', 'C3ClosedRemoveService');
  const closedRemoveCaller = commentedAddCaller.replaceAll('C3CommentedAddContract', 'C3ClosedRemoveContract')
    .replaceAll('C3CommentedAddCaller', 'C3ClosedRemoveCaller');
  const closedRemoveFiles: Array<[vscode.Uri, string]> = [[closedRemoveContractUri, closedRemoveContract],
    [closedRemoveServiceUri, closedRemoveService], [closedRemoveCallerUri, closedRemoveCaller]];
  await Promise.all(closedRemoveFiles.map(([uri, source]) => vscode.workspace.fs.writeFile(uri, Buffer.from(source))));
  const closedRemoveDocument = await vscode.workspace.openTextDocument(closedRemoveContractUri);
  await vscode.window.showTextDocument(closedRemoveDocument);
  assert.ok(!vscode.workspace.textDocuments.some((document) => document.uri.toString() === closedRemoveServiceUri.toString()
    || document.uri.toString() === closedRemoveCallerUri.toString()),
  'Closed-file Remove Parameter fixture opened a consumer before planning');
  const closedRemovePosition = closedRemoveDocument.positionAt(closedRemoveContract.indexOf('$message') + 2);
  const requestClosedRemovePlan = (): Thenable<{ changes?: Record<string, unknown> } | null> =>
    api.requestLanguageServer('phpCompanion/removeMethodParameter', {
      textDocument: { uri: closedRemoveContractUri.toString() }, position: closedRemovePosition,
    });
  let closedRemovePlan = await requestClosedRemovePlan();
  for (let attempt = 0; attempt < 100 && Object.keys(closedRemovePlan?.changes ?? {}).length !== 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    closedRemovePlan = await requestClosedRemovePlan();
  }
  assert.strictEqual(Object.keys(closedRemovePlan?.changes ?? {}).length, 3,
    `Closed-file Remove Parameter omitted an affected file: ${JSON.stringify(closedRemovePlan)}`);
  const removeClosedFamily = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.removeMethodParameter', {
      uri: closedRemoveContractUri, position: closedRemovePosition, testPreviewAction,
    });
  assert.strictEqual(await removeClosedFamily(async () => 'cancel'), false);
  for (const [uri, source] of closedRemoveFiles) assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source,
    `Cancelling closed-file Remove Parameter changed ${uri.path}`);
  assert.strictEqual(await removeClosedFamily(async () => 'apply'), true);
  assert.ok((await vscode.workspace.openTextDocument(closedRemoveContractUri)).getText().includes('record(): void'));
  assert.ok((await vscode.workspace.openTextDocument(closedRemoveServiceUri)).getText().includes('record(): void'));
  assert.ok((await vscode.workspace.openTextDocument(closedRemoveCallerUri)).getText().includes('record()'));
  await vscode.commands.executeCommand('undo');
  for (const [uri, source] of closedRemoveFiles) assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(), source,
    `One Undo did not restore closed-file Remove Parameter in ${uri.path}`);
  await vscode.commands.executeCommand('redo');
  assert.ok((await vscode.workspace.openTextDocument(closedRemoveCallerUri)).getText().includes('record()'),
    'One Redo did not restore closed-file Remove Parameter');
  console.log('C3 closed-file method-family Remove Parameter: three files, cancel/apply, one Undo/Redo');
  const freshReferenceContractUri = vscode.Uri.joinPath(folder.uri, 'src', 'Contract', 'C3FreshReferenceContract.php');
  const freshReferenceCallerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Controller', 'C3FreshReferenceCaller.php');
  const freshReferenceContract = `<?php namespace App\\Contract;
interface C3FreshReferenceContract { public function refreshSnapshot(): void; }`;
  const freshReferenceCaller = `<?php namespace App\\Controller;
use App\\Contract\\C3FreshReferenceContract;
final class C3FreshReferenceCaller {
    public function run(C3FreshReferenceContract $target): void { $target->refreshSnapshot(); }
}`;
  await vscode.workspace.fs.writeFile(freshReferenceContractUri, Buffer.from(freshReferenceContract));
  const freshReferenceDocument = await vscode.workspace.openTextDocument(freshReferenceContractUri);
  await vscode.window.showTextDocument(freshReferenceDocument);
  await vscode.workspace.fs.writeFile(freshReferenceCallerUri, Buffer.from(freshReferenceCaller));
  assert.ok(!vscode.workspace.textDocuments.some((document) => document.uri.toString() === freshReferenceCallerUri.toString()),
    'Fresh References fixture opened its new consumer before lookup');
  const freshReferencePosition = freshReferenceDocument.positionAt(freshReferenceContract.indexOf('refreshSnapshot') + 2);
  const freshReferences = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', freshReferenceContractUri, freshReferencePosition) ?? [];
  assert.ok(freshReferences.some((location) => location.uri.toString() === freshReferenceCallerUri.toString()),
    `References omitted a newly created, unopened consumer: ${JSON.stringify(freshReferences)}`);
  console.log('C1 References included a newly created unopened consumer');
  const appliedOpenUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3AppliedOpenResult.php');
  const appliedOpenSource = '<?php\nnamespace App\\Service;\nfunction c3AppliedOpenResult(): void { $before = 1; echo $before; }\n';
  await vscode.workspace.fs.writeFile(appliedOpenUri, Buffer.from(appliedOpenSource));
  const appliedOpenDocument = await vscode.workspace.openTextDocument(appliedOpenUri);
  await vscode.window.showTextDocument(appliedOpenDocument);
  const appliedOpenEdit = new vscode.WorkspaceEdit();
  const appliedOpenPosition = appliedOpenDocument.positionAt(appliedOpenSource.indexOf('$before'));
  appliedOpenEdit.replace(appliedOpenUri, new vscode.Range(appliedOpenPosition,
    appliedOpenDocument.positionAt(appliedOpenSource.indexOf('$before') + '$before'.length)), '$after');
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.applyPreviewedExtract', {
    edit: appliedOpenEdit, title: 'C3 applied result', sourceUri: appliedOpenUri,
    sourceVersion: appliedOpenDocument.version, sourceText: appliedOpenSource,
  }, { testPreviewAction: async () => 'apply', testBeforeOpen: async () => { throw new Error('C3 simulated editor open failure'); } }), true,
  'Previewed edit reported failure after VS Code had applied the change');
  assert.ok(appliedOpenDocument.getText().includes('$after = 1'), 'Previewed edit lost the applied change after an editor open failure');
  await vscode.window.showTextDocument(appliedOpenDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(appliedOpenDocument.getText(), appliedOpenSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(appliedOpenDocument.getText().includes('$after = 1'));
  const renameOpenUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3RenameOpenResult.php');
  const renameOpenSource = '<?php\nnamespace App\\Service;\nfunction c3RenameOpenResult(): void { $before = 1; echo $before; }\n';
  await vscode.workspace.fs.writeFile(renameOpenUri, Buffer.from(renameOpenSource));
  const renameOpenDocument = await vscode.workspace.openTextDocument(renameOpenUri);
  await vscode.window.showTextDocument(renameOpenDocument);
  assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
    uri: renameOpenUri, position: renameOpenDocument.positionAt(renameOpenSource.indexOf('$before') + 2), newName: 'after',
    testPreviewAction: async () => 'apply', testBeforeOpen: async () => { throw new Error('C3 simulated editor open failure'); },
  }), true, 'Rename reported failure after VS Code had applied the change');
  assert.ok(renameOpenDocument.getText().includes('$after = 1') && renameOpenDocument.getText().includes('echo $after'),
    'Rename lost the applied change after an editor open failure');
  await vscode.window.showTextDocument(renameOpenDocument);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(renameOpenDocument.getText(), renameOpenSource);
  await vscode.commands.executeCommand('redo');
  assert.ok(renameOpenDocument.getText().includes('echo $after'));
  console.log('C3 applied refactor and Rename retained true outcomes after simulated editor open failures');
  const signatureTypeUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3SignatureType.php');
  const signatureContractUri = vscode.Uri.joinPath(folder.uri, 'src', 'Contract', 'C3CrossSignatures.php');
  await vscode.workspace.fs.writeFile(signatureTypeUri, Buffer.from('<?php namespace App\\Service; const C3_IMPORTED_LIMIT = 9; class C3SignatureType { public const LIMIT = 7; }'));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder.uri, 'src', 'Contract', 'C3RelativeLimit.php'),
    Buffer.from('<?php namespace App\\Contract\\Limits; const RELATIVE_LIMIT = 11;'));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3AliasLimit.php'),
    Buffer.from('<?php namespace App\\Service\\Limits; const ALIASED_LIMIT = 13;'));
  await vscode.workspace.fs.writeFile(signatureContractUri, Buffer.from(`<?php namespace App\\Contract;
use App\\Service\\C3SignatureType as Alias;
use App\\Service\\Limits as SharedLimits;
use const App\\Service\\C3_IMPORTED_LIMIT as IMPORTED_LIMIT;
const LOCAL_LIMIT = 5;
interface C3CrossContract { public function accept(Alias $value, int $limit = Alias::LIMIT): Alias; }
abstract class C3CrossAbstract { abstract protected function reset(Alias $value, int $limit = Alias::LIMIT): Alias; }
class C3CrossBase { public function convert(Alias $value, int $limit = Alias::LIMIT): Alias { return $value; } public function choose(): (\\Traversable&\\Countable)|Alias { return new Alias(); } }
class C3CrossDefaults { public function defaults(int $local = LOCAL_LIMIT, int $imported = IMPORTED_LIMIT, object $value = new Alias(), int $explicit = namespace\\LOCAL_LIMIT, int $relative = Limits\\RELATIVE_LIMIT, int $aliased = SharedLimits\\ALIASED_LIMIT, string $label = 'namespace\\LOCAL_LIMIT'): void {} }`));
  const inheritedSignature = '(\\App\\Service\\C3SignatureType $value, int $limit = \\App\\Service\\C3SignatureType::LIMIT): \\App\\Service\\C3SignatureType';
  const crossCases = [
    { name: 'C3CrossInterface', declaration: 'implements \\App\\Contract\\C3CrossContract', title: 'Implement 1 interface method', method: 'accept', signature: inheritedSignature },
    { name: 'C3CrossAbstractChild', declaration: 'extends \\App\\Contract\\C3CrossAbstract', title: 'Implement 1 abstract method', method: 'reset', signature: inheritedSignature },
    { name: 'C3CrossOverride', declaration: 'extends \\App\\Contract\\C3CrossBase', title: 'Override App\\Contract\\C3CrossBase::convert', method: 'convert', signature: inheritedSignature },
    { name: 'C3CrossDnf', declaration: 'extends \\App\\Contract\\C3CrossBase', title: 'Override App\\Contract\\C3CrossBase::choose', method: 'choose',
      signature: '(): (\\Traversable&\\Countable)|\\App\\Service\\C3SignatureType' },
  ];
  for (const item of crossCases) {
    const uri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', `${item.name}.php`);
    const original = `<?php namespace App\\Service; class ${item.name} ${item.declaration} {}`;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    const position = document.positionAt(original.indexOf(`class ${item.name}`) + 8);
    let action: vscode.CodeAction | undefined;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline && !action) {
      const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
        'vscode.executeCodeActionProvider', uri, new vscode.Range(position, position), vscode.CodeActionKind.RefactorRewrite.value) ?? [];
      action = actions.find((candidate): candidate is vscode.CodeAction => 'edit' in candidate && candidate.title === item.title);
      if (!action) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(action?.edit, `Missing cross-namespace ${item.title} Action`);
    assert.ok(await vscode.workspace.applyEdit(action.edit), `Could not apply cross-namespace ${item.title}`);
    assert.ok(document.getText().includes(`${item.method}${item.signature}`), `${item.title} copied an unresolved source alias, default constant or DNF type`);
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('undo');
    await waitFor(() => document.getText() === original, `${item.title} did not Undo in one step`);
    await vscode.commands.executeCommand('redo');
    await waitFor(() => document.getText().includes(`${item.method}${item.signature}`),
      `${item.title} did not Redo in one step`);
  }
  const defaultsUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3CrossDefaultsChild.php');
  const defaultsSource = '<?php namespace App\\Service; class C3CrossDefaultsChild extends \\App\\Contract\\C3CrossDefaults {}';
  await vscode.workspace.fs.writeFile(defaultsUri, Buffer.from(defaultsSource));
  const defaultsDocument = await vscode.workspace.openTextDocument(defaultsUri);
  await vscode.window.showTextDocument(defaultsDocument);
  const defaultsPosition = defaultsDocument.positionAt(defaultsSource.indexOf('class C3CrossDefaultsChild') + 8);
  let defaultsAction: vscode.CodeAction | undefined;
  const defaultsDeadline = Date.now() + 15_000;
  while (Date.now() < defaultsDeadline && !defaultsAction) {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', defaultsUri, new vscode.Range(defaultsPosition, defaultsPosition), vscode.CodeActionKind.RefactorRewrite.value) ?? [];
    defaultsAction = actions.find((candidate): candidate is vscode.CodeAction => 'edit' in candidate
      && candidate.title === 'Override App\\Contract\\C3CrossDefaults::defaults');
    if (!defaultsAction) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(defaultsAction?.edit, 'Missing cross-namespace Action for namespace, imported and new-expression defaults');
  assert.ok(await vscode.workspace.applyEdit(defaultsAction.edit), 'Could not apply cross-namespace default expression Action');
  const generatedDefaults = "defaults(int $local = \\App\\Contract\\LOCAL_LIMIT, int $imported = \\App\\Service\\C3_IMPORTED_LIMIT, object $value = new \\App\\Service\\C3SignatureType(), int $explicit = \\App\\Contract\\LOCAL_LIMIT, int $relative = \\App\\Contract\\Limits\\RELATIVE_LIMIT, int $aliased = \\App\\Service\\Limits\\ALIASED_LIMIT, string $label = 'namespace\\LOCAL_LIMIT'): void";
  assert.ok(defaultsDocument.getText().includes(generatedDefaults),
    `Override did not preserve the source default expressions: ${defaultsDocument.getText()}`);
  await vscode.window.showTextDocument(defaultsDocument);
  await vscode.commands.executeCommand('undo');
  await waitFor(() => defaultsDocument.getText() === defaultsSource, 'Default expression Action did not Undo in one step');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => defaultsDocument.getText().includes(generatedDefaults), 'Default expression Action did not Redo in one step');
  console.log('C3 cross-namespace interface, abstract, DNF and Override Actions applied with one Undo/Redo');
  console.log('C3 namespace constant, imported constant and new-expression defaults applied with one Undo/Redo');
  console.log('C3 PHP type generation: preview, cancel, apply, changed-directory refusal and one Undo/Redo passed.');
  const eventContractUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3EventDispatcherInterface.php');
  const eventSubscriberContractUri = vscode.Uri.joinPath(folder.uri, 'src', 'C3EventSubscriberInterface.php');
  const eventSubscriberUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3EventSubscriber.php');
  const eventDispatchUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3EventDispatch.php');
  const eventSubscriberSource = `<?php namespace App\\Service;
  final class C3EventSubscriber implements \\Symfony\\Component\\EventDispatcher\\EventSubscriberInterface {
  public static function getSubscribedEvents(): array { return ['app.ready' => 'onReady']; }
  public function onReady(): void {}
}`;
  const eventDispatchOld = "<?php namespace App\\Service; function c3Dispatch(C3EventDispatcherInterface $dispatcher): void { $dispatcher->dispatch(new \\stdClass(), 'app.old'); }";
  await vscode.workspace.fs.writeFile(eventContractUri, Buffer.from('<?php namespace App\\Service; interface C3EventDispatcherInterface extends \\Symfony\\Contracts\\EventDispatcher\\EventDispatcherInterface { public function dispatch(object $event, ?string $eventName = null): object; }'));
  await vscode.workspace.fs.writeFile(eventSubscriberContractUri, Buffer.from('<?php namespace Symfony\\Component\\EventDispatcher; interface EventSubscriberInterface { public static function getSubscribedEvents(): array; }'));
  await vscode.workspace.fs.writeFile(eventSubscriberUri, Buffer.from(eventSubscriberSource));
  await vscode.workspace.fs.writeFile(eventDispatchUri, Buffer.from(eventDispatchOld));
  const eventSubscriberDocument = await vscode.workspace.openTextDocument(eventSubscriberUri);
  const eventDispatchDocument = await vscode.workspace.openTextDocument(eventDispatchUri);
  const eventDispatchEditor = await vscode.window.showTextDocument(eventDispatchDocument);
  const eventOldPosition = eventDispatchDocument.positionAt(eventDispatchDocument.getText().indexOf('app.old'));
  const eventEdit = new vscode.WorkspaceEdit();
  eventEdit.replace(eventDispatchUri, new vscode.Range(eventOldPosition, eventOldPosition.translate(0, 'app.old'.length)), 'app.ready');
  assert.ok(await vscode.workspace.applyEdit(eventEdit));
  assert.ok(eventDispatchDocument.isDirty, 'Symfony event fixture must exercise an unsaved editor snapshot');
  const eventListenerPosition = eventSubscriberDocument.positionAt(eventSubscriberSource.lastIndexOf('onReady') + 2);
  const eventReferences = async (): Promise<vscode.Location[]> => (await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', eventSubscriberUri, eventListenerPosition)) ?? [];
  const hasEventDispatch = (references: vscode.Location[]): boolean => references.some((reference) =>
    reference.uri.toString() === eventDispatchUri.toString()
    && eventDispatchDocument.getText(reference.range) === 'app.ready');
  let currentEventReferences: vscode.Location[] = [];
  const eventDeadline = Date.now() + 30_000;
  while (Date.now() < eventDeadline) {
    currentEventReferences = await eventReferences();
    if (hasEventDispatch(currentEventReferences)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(hasEventDispatch(currentEventReferences),
    `Symfony listener References missed a new unsaved dispatch in a PHP file without a type declaration: ${JSON.stringify(currentEventReferences)}`);
  await vscode.window.showTextDocument(eventDispatchEditor.document);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(eventDispatchDocument.getText(), eventDispatchOld,
    'Undo did not restore the original Symfony event dispatch');
  const eventWithdrawDeadline = Date.now() + 30_000;
  while (Date.now() < eventWithdrawDeadline) {
    currentEventReferences = await eventReferences();
    if (!hasEventDispatch(currentEventReferences)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(!hasEventDispatch(currentEventReferences),
    'Symfony listener References retained a dispatch after the unsaved event edit was undone');
  console.log('C3 Symfony event References followed an unsaved dispatch edit and its Undo in the Pack host');
}

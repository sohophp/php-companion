import * as assert from 'node:assert';
import * as vscode from 'vscode';

async function waitFor(predicate: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!predicate() && Date.now() < deadline) await new Promise<void>((resolve) => setTimeout(resolve, 20));
  assert.ok(predicate(), message);
}

async function waitForAsync(predicate: () => Promise<boolean>, message: string): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (!await predicate() && Date.now() < deadline) await new Promise<void>((resolve) => setTimeout(resolve, 20));
  assert.ok(await predicate(), message);
}

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'PHP Companion extension was not discovered');
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('phpCompanion.selectPhpVersion'));
  assert.ok(commands.includes('phpCompanion.new.class'));
  assert.ok(commands.includes('phpCompanion.copy.fqcn'));
  assert.ok(commands.includes('phpCompanion.showPerformanceLog'));
  assert.ok(commands.includes('phpCompanion.safeMove'));
  assert.ok(commands.includes('phpCompanion.importClass'));
  assert.ok(commands.includes('phpCompanion.optimizeImports'));

  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'Fixture workspace was not opened');
  const controllerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'UserController.php');
  const serviceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'UserService.php');
  const movableServiceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'MovableService.php');
  const contactServiceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Contact', 'MovableService.php');
  const moveConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'MoveConsumer.php');
  const renamedServiceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'AccountService.php');
  const staleDuplicateUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Legacy', 'Duplicate.php');
  const originalController = await vscode.workspace.fs.readFile(controllerUri);
  const originalService = await vscode.workspace.fs.readFile(serviceUri);
  const aliasUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'AliasConsumer.php');
  const originalAlias = await vscode.workspace.fs.readFile(aliasUri);
  const importUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'ImportConsumer.php');
  const optimizeUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'OptimizeConsumer.php');
  const originalImport = await vscode.workspace.fs.readFile(importUri);
  const originalOptimize = await vscode.workspace.fs.readFile(optimizeUri);
  const runnerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Contract', 'Runner.php');
  const movedRunnerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'Runner.php');
  const runnerConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'RunnerConsumer.php');
  const controllerDocument = await vscode.workspace.openTextDocument(controllerUri);
  const aliasDocument = await vscode.workspace.openTextDocument(aliasUri);
  const serviceDocument = await vscode.workspace.openTextDocument(serviceUri);
  const runnerConsumerDocument = await vscode.workspace.openTextDocument(runnerConsumerUri);
  const moveConsumerDocument = await vscode.workspace.openTextDocument(moveConsumerUri);

  const importDocument = await vscode.workspace.openTextDocument(importUri);
  const importOffset = importDocument.getText().indexOf('UserService');
  await vscode.commands.executeCommand('phpCompanion.importClass', importUri, importDocument.positionAt(importOffset + 1));
  assert.ok(importDocument.getText().includes('use App\\Service\\UserService;'), 'Import Class did not add the unique canonical candidate');
  assert.ok(await importDocument.save(), 'Import Class fixture could not be saved');

  const optimizeDocument = await vscode.workspace.openTextDocument(optimizeUri);
  await vscode.commands.executeCommand('phpCompanion.optimizeImports', optimizeUri, { preview: false });
  assert.ok(!optimizeDocument.getText().includes('App\\Contract\\Runner'), 'Optimize Imports did not remove a known unused class import');
  assert.strictEqual(optimizeDocument.getText().match(/use App\\Service\\UserService;/g)?.length, 1, 'Optimize Imports did not deduplicate imports');
  assert.ok(await optimizeDocument.save(), 'Optimize Imports fixture could not be saved');

  for (const relativePath of [['Contract', 'Runner.php'], ['Support', 'LogsActivity.php']] as const) {
    const uri = vscode.Uri.joinPath(workspace.uri, 'src', ...relativePath);
    const document = await vscode.workspace.openTextDocument(uri);
    const typeName = relativePath[1].replace('.php', '');
    const offset = document.getText().indexOf(typeName);
    const prepared = await vscode.commands.executeCommand<{ placeholder?: string; text?: string }>(
      '_executePrepareRename', uri, document.positionAt(offset + 1),
    );
    assert.strictEqual(prepared?.placeholder ?? prepared?.text, typeName, `${typeName} declaration did not support F2 preparation`);
  }
  const moveEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>('phpCompanion._testBuildMoveEdits', runnerUri, movedRunnerUri);
  assert.ok(moveEdit?.get(movedRunnerUri)?.some((textEdit) => textEdit.newText === 'App\\Service'), 'Safe Move did not target the post-move URI for namespace updates');
  const moveToService = new vscode.WorkspaceEdit();
  moveToService.renameFile(runnerUri, movedRunnerUri);
  assert.ok(await vscode.workspace.applyEdit(moveToService), 'Explorer-style Contract to Service move failed');
  await waitForAsync(async () => Buffer.from(await vscode.workspace.fs.readFile(movedRunnerUri)).toString('utf8').includes('namespace App\\Service;'), 'Explorer move did not update the namespace atomically');
  const movedRunner = Buffer.from(await vscode.workspace.fs.readFile(movedRunnerUri)).toString('utf8');
  assert.ok(movedRunner.includes('namespace App\\Service;'), `Explorer move did not update the namespace atomically: ${movedRunner}`);
  await waitFor(() => runnerConsumerDocument.getText().includes('use App\\Service\\Runner;') && !runnerConsumerDocument.isDirty, 'An open reference document did not refresh and save after Safe Move');
  assert.strictEqual(runnerConsumerDocument.getText().match(/use App\\Service\\Runner;/g)?.length, 1, 'Forward move produced a duplicate use statement');
  assert.ok(!runnerConsumerDocument.isDirty, 'Safe Move unexpectedly left the refreshed reference document dirty');
  assert.ok(runnerConsumerDocument.getText().includes('Runner::class'), 'Safe Move unexpectedly changed the imported short name');
  const moveToContract = new vscode.WorkspaceEdit();
  moveToContract.renameFile(movedRunnerUri, runnerUri);
  assert.ok(await vscode.workspace.applyEdit(moveToContract), 'Explorer-style Service to Contract move failed');
  await waitForAsync(async () => Buffer.from(await vscode.workspace.fs.readFile(runnerUri)).toString('utf8').includes('namespace App\\Contract;'), 'Round-trip Explorer move kept a stale namespace');
  const returnedRunner = Buffer.from(await vscode.workspace.fs.readFile(runnerUri)).toString('utf8');
  assert.ok(returnedRunner.includes('namespace App\\Contract;'), `Round-trip Safe Move kept a stale namespace: ${returnedRunner}`);
  await waitFor(() => runnerConsumerDocument.getText().includes('use App\\Contract\\Runner;') && !runnerConsumerDocument.isDirty, 'Open references did not return to the original namespace and save after a round-trip move');
  assert.strictEqual(runnerConsumerDocument.getText().match(/use App\\Contract\\Runner;/g)?.length, 1, 'Round-trip move produced a duplicate use statement');
  assert.ok(!runnerConsumerDocument.isDirty, 'Round-trip Safe Move left the reference document dirty');

  // Reproduce the interactive Explorer flow exactly: Service -> Contact -> Service.
  const moveServiceToContact = new vscode.WorkspaceEdit();
  moveServiceToContact.renameFile(movableServiceUri, contactServiceUri);
  assert.ok(await vscode.workspace.applyEdit(moveServiceToContact), 'Explorer-style Service to Contact move failed');
  await waitForAsync(async () => Buffer.from(await vscode.workspace.fs.readFile(contactServiceUri)).toString('utf8').includes('namespace App\\Contact;'), 'Service to Contact move kept the old namespace');
  await waitFor(() => moveConsumerDocument.getText().includes('use App\\Contact\\MovableService;') && !moveConsumerDocument.isDirty, 'Service to Contact references did not refresh and save');
  assert.strictEqual(moveConsumerDocument.getText().match(/use App\\Contact\\MovableService;/g)?.length, 1, 'Service to Contact move produced a duplicate use statement');

  // Simulate a second PHP file-operation participant leaving both imports. The
  // reverse move must reconcile this to one canonical import, not stack edits.
  const duplicateImport = new vscode.WorkspaceEdit();
  const contactImportEnd = moveConsumerDocument.positionAt(moveConsumerDocument.getText().indexOf('use App\\Contact\\MovableService;') + 'use App\\Contact\\MovableService;'.length);
  duplicateImport.insert(moveConsumerUri, contactImportEnd, '\nuse App\\Service\\MovableService;');
  assert.ok(await vscode.workspace.applyEdit(duplicateImport));
  assert.ok(await moveConsumerDocument.save());

  const moveContactToService = new vscode.WorkspaceEdit();
  moveContactToService.renameFile(contactServiceUri, movableServiceUri);
  assert.ok(await vscode.workspace.applyEdit(moveContactToService), 'Explorer-style Contact to Service move failed');
  await waitForAsync(async () => Buffer.from(await vscode.workspace.fs.readFile(movableServiceUri)).toString('utf8').includes('namespace App\\Service;'), 'Contact to Service move kept the stale Contact namespace');
  await waitFor(() => moveConsumerDocument.getText().includes('use App\\Service\\MovableService;') && !moveConsumerDocument.getText().includes('use App\\Contact\\MovableService;') && !moveConsumerDocument.isDirty, 'Reverse move did not reconcile and save imports');
  assert.strictEqual(moveConsumerDocument.getText().match(/use App\\Service\\MovableService;/g)?.length, 1, 'Reverse move left duplicate use statements');

  const referenceOffset = controllerDocument.getText().indexOf('UserService');
  assert.ok(referenceOffset >= 0);
  await assert.rejects(
    Promise.resolve(vscode.commands.executeCommand(
      'vscode.executeDocumentRenameProvider',
      controllerUri,
      controllerDocument.positionAt(referenceOffset + 2),
      'ShouldNotRename',
    )),
    /only from a type declaration name/,
    'Rename unexpectedly started from an import/reference',
  );
  const declarationOffset = serviceDocument.getText().indexOf('UserService');
  assert.ok(declarationOffset >= 0);
  const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider',
    serviceUri,
    serviceDocument.positionAt(declarationOffset + 2),
    'AccountService',
  );
  assert.ok(edit, 'F2 RenameProvider returned no edit for the type declaration');
  assert.ok(edit.entries().length >= 2, 'Rename did not include cross-file text edits');
  try {
    assert.ok(await vscode.workspace.applyEdit(edit), 'Rename workspace edit failed to apply');
    const updatedController = controllerDocument.getText();
    assert.ok(updatedController.includes('use App\\Service\\AccountService;'), 'Import path was not renamed');
    assert.ok(updatedController.includes('@param AccountService'), 'PHPDoc parameter was not renamed');
    assert.ok(updatedController.includes('#[Example(AccountService::class)]'), 'Attribute class reference was not renamed');
    assert.ok(updatedController.includes('\\App\\Service\\AccountService::class'), 'Fully-qualified class reference was not renamed');
    assert.ok(updatedController.includes("$label = 'UserService';"), 'Ordinary string was unexpectedly renamed');
    assert.ok(updatedController.includes('// UserService is intentionally ordinary text.'), 'Ordinary comment was unexpectedly renamed');
    await vscode.workspace.fs.stat(renamedServiceUri);
    const updatedAlias = aliasDocument.getText();
    assert.ok(updatedAlias.includes('use App\\Service\\AccountService as Service;'), 'Aliased import path was not renamed');
    assert.ok(updatedAlias.includes('consume(Service $service): Service'), 'Explicit alias was unexpectedly changed');
    const staleDuplicate = Buffer.from(await vscode.workspace.fs.readFile(staleDuplicateUri)).toString('utf8');
    assert.ok(staleDuplicate.includes('class UserService'), 'A non-canonical duplicate declaration was unexpectedly renamed');
  } finally {
    try { await vscode.workspace.fs.delete(renamedServiceUri); } catch { /* Rename may have failed before creating it. */ }
    await vscode.workspace.fs.writeFile(serviceUri, originalService);
    await vscode.workspace.fs.writeFile(controllerUri, originalController);
    await vscode.workspace.fs.writeFile(aliasUri, originalAlias);
    await vscode.workspace.fs.writeFile(importUri, originalImport);
    await vscode.workspace.fs.writeFile(optimizeUri, originalOptimize);
  }
}

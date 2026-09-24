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
  console.log('C3 held server import requests: addImport, planTypeImports, organizeImports; all rejected stale edits.');
}

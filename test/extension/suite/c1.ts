import * as assert from 'node:assert';
import * as vscode from 'vscode';

async function waitForResult<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean, message: string): Promise<T> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (ready(result)) return result;
    } catch { /* The language server may still be starting. */ }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(message);
}

export async function run(): Promise<void> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'C1 Extension Host test has no workspace.');
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load in the isolated Extension Host.');
  await extension.activate();
  const targetPhpVersion = process.env.PHP_COMPANION_TEST_C1_PHP_VERSION;
  if (targetPhpVersion) assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', workspace.uri).get('phpVersion'), targetPhpVersion);
  const folder = vscode.Uri.joinPath(workspace.uri, 'src', 'C1');
  await vscode.workspace.fs.createDirectory(folder);
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
  console.log(`C1 Extension Host: PHP ${targetPhpVersion ?? 'auto'}, completion=${completionMs}ms; Hover, Signature Help, Definition, Implementation, References and unsaved Definition passed.`);
}

import * as assert from 'node:assert';
import * as vscode from 'vscode';

/** Run after the real formatter's positive apply/Undo, in the isolated Profile. */
export async function verifyFormatterFailureRecovery(
  workspace: vscode.WorkspaceFolder, configUri: vscode.Uri, document: vscode.TextDocument,
): Promise<void> {
  const markerUri = vscode.Uri.joinPath(workspace.uri, 'formatter-failure-observed.json');
  await assert.rejects(async () => vscode.workspace.fs.stat(markerUri),
    (error: unknown) => error instanceof vscode.FileSystemError && error.code === 'FileNotFound',
    'The formatter failure witness must be new');
  assert.strictEqual(vscode.workspace.getConfiguration('php-cs-fixer', document.uri).get('config'), configUri.fsPath);
  const originalConfig = await vscode.workspace.fs.readFile(configUri);
  const originalText = document.getText();
  const originalDisk = await vscode.workspace.fs.readFile(document.uri);
  const originalVersion = document.version;
  const originalDirty = document.isDirty;
  const failureMessage = 'SoPHP Profile intentional formatter configuration failure';
  // A nonexistent config is silently ignored by this provider. An existing
  // throwing config proves that a real formatter process reached the failure.
  const failingConfig = `<?php
file_put_contents(__DIR__ . '/formatter-failure-observed.json', json_encode([
    'message' => '${failureMessage}', 'config' => __FILE__,
    'phpVersion' => PHP_VERSION, 'phpBinary' => PHP_BINARY,
]));
throw new RuntimeException('${failureMessage}');
`;
  let failureResult: 'rejected' | 'empty' = 'empty';
  try {
    await vscode.workspace.fs.writeFile(configUri, Buffer.from(failingConfig));
    let failedEdits: vscode.TextEdit[] = [];
    try {
      failedEdits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        'vscode.executeFormatDocumentProvider', document.uri, { tabSize: 4, insertSpaces: true }) ?? [];
    } catch {
      failureResult = 'rejected';
    }
    const witness = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(markerUri)).toString('utf8')) as {
      message: string; config: string; phpVersion: string; phpBinary: string;
    };
    assert.strictEqual(witness.message, failureMessage);
    assert.strictEqual(witness.config, configUri.fsPath);
    assert.match(witness.phpVersion, /^\d+\.\d+\.\d+/u);
    assert.ok(witness.phpBinary, 'The failed config did not record a real PHP runtime');
    assert.strictEqual(failedEdits.length, 0, 'The failed formatter returned edits');
    assert.strictEqual(document.getText(), originalText, 'Formatter failure changed the buffer');
    assert.strictEqual(document.version, originalVersion, 'Formatter failure changed the document version');
    assert.strictEqual(document.isDirty, originalDirty, 'Formatter failure changed the dirty state');
    assert.deepStrictEqual(await vscode.workspace.fs.readFile(document.uri), originalDisk, 'Formatter failure changed the file');
    console.log('Open Source Profile formatter failure witness: ' + JSON.stringify({
      ...witness, failureResult, edits: 0, bufferUnchanged: true, versionUnchanged: true,
      diskUnchanged: true, dirtyStateUnchanged: true,
    }));
  } finally {
    await vscode.workspace.fs.writeFile(configUri, originalConfig);
  }
  assert.deepStrictEqual(await vscode.workspace.fs.readFile(configUri), originalConfig);
  const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
    'vscode.executeFormatDocumentProvider', document.uri, { tabSize: 4, insertSpaces: true }) ?? [];
  assert.ok(edits.length > 0, 'The real formatter did not recover after restoring its config');
  const edit = new vscode.WorkspaceEdit(); edit.set(document.uri, edits);
  assert.ok(await vscode.workspace.applyEdit(edit), 'Recovered formatter edits could not be applied');
  assert.ok(document.getText().replace(/\r\n/gu, '\n').includes('class ProfileFormat\n{'));
  assert.deepStrictEqual(await vscode.workspace.fs.readFile(document.uri), originalDisk, 'Applying format saved the file unexpectedly');
  await vscode.window.showTextDocument(document);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(document.getText(), originalText, 'Recovered formatting was not one Undo transaction');
  assert.deepStrictEqual(await vscode.workspace.fs.readFile(document.uri), originalDisk);
  console.log('Open Source Profile formatter recovery: restored config; real apply and exact Undo passed');
}

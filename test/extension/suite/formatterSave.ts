import * as assert from 'node:assert';
import * as vscode from 'vscode';

/** Exercise the user's Format Document command, then the actual save boundary. */
export async function verifyFormatterSaveUndoRedo(
  document: vscode.TextDocument, formatterId: string, expectedFragments: readonly string[],
): Promise<void> {
  await vscode.window.showTextDocument(document);
  const settings = vscode.workspace.getConfiguration('editor', { uri: document.uri, languageId: document.languageId });
  assert.strictEqual(settings.get('defaultFormatter'), formatterId);
  assert.strictEqual(settings.get('formatOnSave'), false, 'This case verifies explicit formatting followed by Save');
  const originalText = document.getText();
  const readDisk = async (): Promise<string> => Buffer.from(await vscode.workspace.fs.readFile(document.uri)).toString('utf8');
  assert.strictEqual(await readDisk(), originalText, 'The lifecycle fixture must start at its saved source');
  assert.strictEqual(document.isDirty, false);
  await vscode.commands.executeCommand('editor.action.formatDocument');
  assert.strictEqual(vscode.window.activeTextEditor?.document.uri.toString(), document.uri.toString(), 'Format Document changed the active document');
  const formattedText = document.getText();
  assert.notStrictEqual(formattedText, originalText, `${formatterId} did not change the unformatted source`);
  for (const fragment of expectedFragments) assert.ok(formattedText.replace(/\r\n/gu, '\n').includes(fragment),
    `${formatterId} did not produce expected content: ${fragment}`);
  assert.strictEqual(document.isDirty, true);
  assert.strictEqual(await readDisk(), originalText, 'Format Document saved the source before Save');

  assert.ok(await document.save(), 'Saving the formatted document failed');
  assert.strictEqual(document.getText(), formattedText, 'Save changed the formatted buffer');
  assert.strictEqual(await readDisk(), formattedText, 'Save did not persist the formatted buffer');
  assert.strictEqual(document.isDirty, false);
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(document.getText(), originalText, 'One Undo after Save did not restore the exact original source');
  assert.strictEqual(await readDisk(), formattedText, 'Undo changed the saved file');
  assert.strictEqual(document.isDirty, true);
  await vscode.commands.executeCommand('redo');
  assert.strictEqual(document.getText(), formattedText, 'One Redo did not restore the exact formatted source');
  assert.strictEqual(await readDisk(), formattedText, 'Redo changed the saved file');
  assert.strictEqual(document.isDirty, false);
  console.log('Open Source Profile formatter save/Undo/Redo proof: ' + JSON.stringify({
    language: document.languageId, formatterId, originalText, formattedText,
    actualFormatDocumentCommand: true, savePersistedExactBuffer: true, undoRestoredExactSource: true,
    redoRestoredExactFormat: true, undoAndRedoKeptSavedDisk: true, dirtyStates: [false, true, false, true, false],
  }));
}

import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { installFormatterCliFixture } from './formatterCliFixture';

export async function checkFormatterAutoFixState(first: vscode.WorkspaceFolder, second: vscode.WorkspaceFolder): Promise<object> {
  const settings = (folder: vscode.WorkspaceFolder): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration('php-cs-fixer', folder.uri);
  for (const folder of [first, second]) {
    await settings(folder).update('onsave', false, vscode.ConfigurationTarget.WorkspaceFolder);
    await settings(folder).update('autoFixByBracket', false, vscode.ConfigurationTarget.WorkspaceFolder);
    await settings(folder).update('autoFixBySemicolon', folder === first, vscode.ConfigurationTarget.WorkspaceFolder);
    await vscode.workspace.getConfiguration('editor', { uri: folder.uri, languageId: 'php' })
      .update('formatOnSave', false, vscode.ConfigurationTarget.WorkspaceFolder, true);
  }
  const exists = async (uri: vscode.Uri): Promise<boolean> => vscode.workspace.fs.stat(uri).then(() => true, () => false);
  const waitFile = async (uri: vscode.Uri): Promise<void> => {
    const deadline = Date.now() + 30_000;
    while (!await exists(uri) && Date.now() < deadline) await new Promise(done => setTimeout(done, 25));
    assert.ok(await exists(uri), `Actual CLI marker missing: ${uri.fsPath}`);
  };
  const settle = async (): Promise<void> => { await new Promise(done => setTimeout(done, 750)); };
  const plainLauncher = async (folder: vscode.WorkspaceFolder, name: string): Promise<vscode.Uri> => {
    const marker = vscode.Uri.joinPath(folder.uri, `${name}.called`);
    await installFormatterCliFixture(folder, name, { called: marker });
    return marker;
  };
  const open = async (folder: vscode.WorkspaceFolder, name: string, source: string): Promise<vscode.TextDocument> => {
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `${name}.php`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    return vscode.workspace.openTextDocument(uri);
  };
  const focusEnd = async (document: vscode.TextDocument): Promise<vscode.TextEditor> => {
    const editor = await vscode.window.showTextDocument(document);
    const position = document.positionAt(document.getText().length);
    editor.selection = new vscode.Selection(position, position);
    return editor;
  };
  const markerA = await plainLauncher(first, 'background first');
  const markerB = await plainLauncher(second, 'background second');
  const background = await open(first, 'AutoBackground', '<?php\n$value=1');
  const other = await open(second, 'AutoOther', '<?php\n$other=1;');
  const otherEditor = await focusEnd(other);
  const beforeSemicolon = other.positionAt(other.getText().length - 1);
  otherEditor.selection = new vscode.Selection(beforeSemicolon, beforeSemicolon);
  const backgroundChange = new vscode.WorkspaceEdit();
  backgroundChange.insert(background.uri, background.positionAt(background.getText().length), ';');
  assert.ok(await vscode.workspace.applyEdit(backgroundChange));
  await settle();
  assert.equal(other.getText(), '<?php\n$other=1;', 'Background change must not format another folder');
  assert.equal(background.getText(), '<?php\n$value=1;');
  assert.ok(!await exists(markerA) && !await exists(markerB), 'Background event must not invoke the CLI');
  assert.ok(otherEditor.selection.active.isEqual(beforeSemicolon), 'Background event must not move the other caret');
  const disabled = await open(second, 'AutoDisabled', '<?php\n$disabled=1');
  await focusEnd(disabled); await vscode.commands.executeCommand('type', { text: ';' }); await settle();
  assert.equal(disabled.getText(), '<?php\n$disabled=1;');
  assert.ok(!await exists(markerB), 'Disabled folder must not invoke auto-fix');

  const results: object[] = [];
  for (const state of ['new-version', 'focus-changed', 'current'] as const) {
    const pending = vscode.Uri.joinPath(first.uri, `${state}.pending`);
    const release = vscode.Uri.joinPath(first.uri, `${state}.release`);
    const completed = vscode.Uri.joinPath(first.uri, `${state}.completed`);
    await installFormatterCliFixture(first, `${state} slow`, { pending, release, completed });
    const document = await open(first, `Auto-${state}`, '<?php\n$value=1');
    const editor = await focusEnd(document);
    try {
      await vscode.commands.executeCommand('type', { text: ';' }); await waitFile(pending);
      const requestedVersion = document.version;
      if (state === 'new-version') await vscode.commands.executeCommand('type', { text: ' // later input' });
      const sourceAtRelease = document.getText();
      if (state === 'focus-changed') await focusEnd(other);
      const focused = vscode.window.activeTextEditor; assert.ok(focused);
      const caretAtRelease = focused.selection.active;
      await vscode.workspace.fs.writeFile(release, Buffer.from('release'));
      await waitFile(completed); await settle();
      assert.equal(Buffer.from(await vscode.workspace.fs.readFile(completed)).toString('utf8').trim(), '0', 'Actual pinned CLI must finish successfully');
      assert.equal(document.getText(), state === 'current' ? '<?php\n$value = 1;' : sourceAtRelease);
      if (state === 'new-version') assert.ok(document.version > requestedVersion, 'Need a real edit while the CLI is pending');
      if (state !== 'current') assert.ok(focused.selection.active.isEqual(caretAtRelease), 'Late result must preserve the current caret');
      assert.equal(other.getText(), '<?php\n$other=1;');
      assert.equal(Buffer.from(await vscode.workspace.fs.readFile(document.uri)).toString('utf8'), '<?php\n$value=1', 'Auto-fix must not save the source');
      results.push({ state, actualCliExit: 0, requestedVersion, finalVersion: document.version, source: document.getText() });
    } finally {
      await vscode.workspace.fs.writeFile(release, Buffer.from('release'));
    }
    assert.equal(editor.document, document);
  }
  const bracketMarker = await plainLauncher(first, 'bracket current');
  await settings(first).update('autoFixBySemicolon', false, vscode.ConfigurationTarget.WorkspaceFolder);
  await settings(first).update('autoFixByBracket', true, vscode.ConfigurationTarget.WorkspaceFolder);
  const bracket = await open(first, 'AutoBracket', '<?php\nclass AutoBracket{\npublic function value(){return 1234;}\n');
  await focusEnd(bracket); await vscode.commands.executeCommand('type', { text: '}' });
  const bracketExpected = '<?php\nclass AutoBracket\n{\n    public function value()\n    {\n        return 1234;\n    }\n}';
  const deadline = Date.now() + 30_000;
  while (bracket.getText().replaceAll('\r\n', '\n') !== bracketExpected && Date.now() < deadline) await new Promise(done => setTimeout(done, 25));
  assert.equal(bracket.getText().replaceAll('\r\n', '\n'), bracketExpected, 'Valid current bracket auto-fix must continue to work');
  assert.ok(await exists(bracketMarker), 'Bracket positive must invoke the actual CLI');
  return { tested: true, backgroundIgnored: true, disabledFolderIgnored: true, deferredCliResults: results,
    bracketCurrentFormatted: true, scope: 'Actual isolated VS Code and pinned CLI; not real WSL human acceptance' };
}

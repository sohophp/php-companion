import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const executable = process.env.PHP_COMPANION_FORMATTER_EXECUTABLE; assert.ok(executable);
  const config = vscode.Uri.joinPath(folder.uri, '.php-cs-fixer.dist.php');
  await vscode.workspace.fs.writeFile(config, Buffer.from("<?php return (new PhpCsFixer\\Config())->setRules(['@PSR12'=>true]);\n"));
  const fixerSettings = vscode.workspace.getConfiguration('php-cs-fixer', folder.uri);
  await fixerSettings.update('executablePath', executable, vscode.ConfigurationTarget.Workspace);
  await fixerSettings.update('config', config.fsPath, vscode.ConfigurationTarget.Workspace);
  await fixerSettings.update('autoFixByBracket', false, vscode.ConfigurationTarget.Workspace);
  await fixerSettings.update('autoFixBySemicolon', false, vscode.ConfigurationTarget.Workspace);
  const editorSettings = vscode.workspace.getConfiguration('editor', { uri: folder.uri, languageId: 'php' });
  await editorSettings.update('defaultFormatter', 'junstyle.php-cs-fixer', vscode.ConfigurationTarget.Workspace, true);
  await editorSettings.update('formatOnSave', true, vscode.ConfigurationTarget.Workspace, true);
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const formatter = vscode.extensions.getExtension('junstyle.php-cs-fixer'); assert.ok(formatter); await formatter.activate();
  assert.equal(formatter.packageJSON.version, '0.3.21');
  const candidate = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(
    vscode.Uri.joinPath(formatter.extensionUri, 'sophp-no-change-candidate.json'))).toString('utf8'));
  assert.equal(candidate.owner, 'junstyle.php-cs-fixer');
  assert.equal(candidate.license, 'ISC');
  assert.equal(candidate.patchedHash, 'f962949143810f554d9c71e104a7fadd1b3bf819faa8cee25a350c4a2d705ea6');
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'ProfileFormat.php');
  const original = '<?php\nclass  ProfileFormat{public function value( ):int{return 1234;}}\n';
  const expected = '<?php\n\nclass ProfileFormat\n{\n    public function value(): int\n    {\n        return 1234;\n    }\n}\n';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const text = (): string => document.getText().replaceAll('\r\n', '\n');
  const wait = async (predicate: () => boolean, message: string): Promise<void> => {
    const deadline = Date.now() + 30_000;
    while (!predicate() && Date.now() < deadline) await new Promise(done => setTimeout(done, 50));
    assert.ok(predicate(), message);
  };
  assert.equal(vscode.workspace.getConfiguration('editor', { uri, languageId: 'php' }).get('defaultFormatter'), 'junstyle.php-cs-fixer');
  await vscode.commands.executeCommand('editor.action.formatDocument');
  await wait(() => text() === expected, 'Format Document did not produce the expected PSR-12 text');
  assert.ok(document.isDirty);
  await vscode.commands.executeCommand('undo'); await wait(() => text() === original, 'Format Document was not a single Undo transaction');
  await vscode.commands.executeCommand('redo'); await wait(() => text() === expected, 'Redo did not restore formatted text');
  await vscode.commands.executeCommand('undo'); await wait(() => text() === original, 'Second Undo did not restore original text');
  assert.equal(document.isDirty, false, 'Undo should return to the saved original');
  const pending = new vscode.WorkspaceEdit();
  pending.insert(uri, document.positionAt(document.getText().length), ' ');
  assert.ok(await vscode.workspace.applyEdit(pending));
  assert.ok(document.isDirty, 'Save-format fixture must contain an unsaved edit');
  assert.ok(await document.save());
  assert.equal(text(), expected, 'Format on Save did not format the restored document');
  assert.equal(document.isDirty, false);
  const disk = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8').replaceAll('\r\n', '\n');
  assert.equal(disk, expected);
  await vscode.commands.executeCommand('editor.action.formatDocument');
  assert.equal(text(), expected, 'Formatting was not idempotent');
  console.log(`Formatter candidate acceptance proof: ${JSON.stringify({ platform: process.platform, node: process.version,
    formatterVersion: formatter.packageJSON.version, candidateHash: candidate.patchedHash, formatDocument: true, undo: true, redo: true, formatOnSave: true,
    diskMatches: true, idempotent: true, original, formatted: expected })}`);
}

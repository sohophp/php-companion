import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { checkFormatterAutoFixState } from './formatterAutoFixAcceptance';
import { installFormatterCliFixture } from './formatterCliFixture';

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const executable = process.env.PHP_COMPANION_FORMATTER_EXECUTABLE; assert.ok(executable);
  const config = vscode.Uri.joinPath(folder.uri, '.php-cs-fixer.dist.php');
  await vscode.workspace.fs.writeFile(config, Buffer.from("<?php return (new PhpCsFixer\\Config())->setRules(['@PSR12'=>true]);\n"));
  const fixerSettings = vscode.workspace.getConfiguration('php-cs-fixer', folder.uri);
  await fixerSettings.update('executablePath', executable, vscode.ConfigurationTarget.WorkspaceFolder);
  await fixerSettings.update('executablePathWindows', executable, vscode.ConfigurationTarget.WorkspaceFolder);
  await fixerSettings.update('config', config.fsPath, vscode.ConfigurationTarget.WorkspaceFolder);
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
  assert.equal(candidate.patchedHash, 'e0e5407e2307cac7589160065ba1d92e9d516259ffbbfdf02671365fc7582577');
  for (const key of candidate.resourceKeys) assert.equal(
    formatter.packageJSON.contributes.configuration.properties[`php-cs-fixer.${key}`].scope, 'resource');
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
  const second = vscode.workspace.workspaceFolders?.[1]; assert.ok(second, 'Formatter gate requires two independent workspace folders');
  const secondConfig = vscode.Uri.joinPath(second.uri, 'different config.php');
  await vscode.workspace.fs.writeFile(secondConfig, Buffer.from("<?php return (new PhpCsFixer\\Config())->setRules(['@PSR12'=>true])->setIndent(\"\\t\");\n"));
  const secondSettings = vscode.workspace.getConfiguration('php-cs-fixer', second.uri);
  const trace = vscode.Uri.joinPath(second.uri, 'formatter-called.txt');
  await installFormatterCliFixture(second, 'second with spaces', { called: trace });
  await secondSettings.update('config', secondConfig.fsPath, vscode.ConfigurationTarget.WorkspaceFolder);
  const secondPhp = process.env.PHP_COMPANION_TEST_FORMATTER_SECOND_PHP;
  const actualRuntimes: string[] = [];
  const expectedRuntimes: string[] = [];
  if (secondPhp) {
    const firstPhp = process.env.PHP_COMPANION_PHP_EXECUTABLE; assert.ok(firstPhp);
    const cli = process.env.PHP_COMPANION_TEST_FORMATTER_CLI; assert.ok(cli);
    assert.notEqual(firstPhp, secondPhp, 'Distinct runtime gate must use two different PHP executables');
    for (const [index, runtimeFolder] of [folder, second].entries()) {
      const php = index === 0 ? firstPhp : secondPhp;
      expectedRuntimes.push(execFileSync(php, ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8', timeout: 30_000 }));
      let configuredPhp = php;
      const runtimeTrace = vscode.Uri.joinPath(runtimeFolder.uri, 'runtime.txt');
      if (process.platform !== 'win32') {
        const proxy = vscode.Uri.joinPath(runtimeFolder.uri, 'php runtime with spaces');
        const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
        await vscode.workspace.fs.writeFile(proxy, Buffer.from(`#!/usr/bin/env bash\nexec ${quote(php)} "$@"\n`));
        await chmod(proxy.fsPath, 0o755);
        configuredPhp = proxy.fsPath;
      }
      const launcher = vscode.Uri.joinPath(runtimeFolder.uri, 'locked fixer.phar');
      const phpQuote = (value: string): string => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
      // A PHP launcher deliberately exercises the formatter's .phar runtime-selection branch.
      // It loads the pinned Composer CLI; this fixture is not a packaged PHAR distribution.
      await vscode.workspace.fs.writeFile(launcher, Buffer.from(`<?php require ${phpQuote(cli)};\n`));
      const scoped = vscode.workspace.getConfiguration('php-cs-fixer', runtimeFolder.uri);
      await scoped.update('executablePath', launcher.fsPath, vscode.ConfigurationTarget.WorkspaceFolder);
      await scoped.update('executablePathWindows', launcher.fsPath, vscode.ConfigurationTarget.WorkspaceFolder);
      await vscode.workspace.getConfiguration('php', runtimeFolder.uri).update('validate.executablePath', configuredPhp,
        vscode.ConfigurationTarget.WorkspaceFolder);
      const runtimeConfig = index === 0 ? config : secondConfig;
      await vscode.workspace.fs.writeFile(runtimeConfig, Buffer.from(`<?php\nfile_put_contents(${phpQuote(runtimeTrace.fsPath)}, PHP_VERSION);\nreturn (new PhpCsFixer\\Config())->setRules(['@PSR12'=>true])${index === 1 ? '->setIndent("\\t")' : ''};\n`));
    }
  }
  const secondUri = vscode.Uri.joinPath(second.uri, 'src', 'ProfileFormat.php');
  await vscode.workspace.fs.writeFile(secondUri, Buffer.from(original));
  const secondDocument = await vscode.workspace.openTextDocument(secondUri);
  const reset = new vscode.WorkspaceEdit();
  reset.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), original);
  assert.ok(await vscode.workspace.applyEdit(reset));
  const both = await Promise.all([uri, secondUri].map(resource => vscode.commands.executeCommand<vscode.TextEdit[]>(
    'vscode.executeFormatDocumentProvider', resource, { tabSize: 4, insertSpaces: true })));
  const combined = new vscode.WorkspaceEdit();
  for (const [index, resource] of [uri, secondUri].entries()) {
    assert.ok(both[index]); combined.set(resource, both[index]!);
  }
  assert.ok(await vscode.workspace.applyEdit(combined));
  assert.equal(text(), expected, 'Second project must not overwrite first project settings');
  assert.equal(secondDocument.getText().replaceAll('\r\n', '\n'), expected.replaceAll('    ', '\t'), 'Second folder config must select tab indentation');
  if (secondPhp) {
    for (const runtimeFolder of [folder, second]) actualRuntimes.push(Buffer.from(await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(runtimeFolder.uri, 'runtime.txt'))).toString('utf8'));
    assert.notEqual(actualRuntimes[0], actualRuntimes[1], 'Both requests must run under different actual PHP versions');
    assert.deepEqual(actualRuntimes, expectedRuntimes, 'Each request must run with its own configured PHP executable');
  } else assert.match(Buffer.from(await vscode.workspace.fs.readFile(trace)).toString('utf8'), /called/u);
  const autoFixState = await checkFormatterAutoFixState(folder, second);
  console.log(`Formatter candidate acceptance proof: ${JSON.stringify({ platform: process.platform, node: process.version,
    formatterVersion: formatter.packageJSON.version, candidateHash: candidate.patchedHash, formatDocument: true, undo: true, redo: true, formatOnSave: true,
    diskMatches: true, idempotent: true, multiRootDistinctConfig: true, concurrentFormatting: true,
    distinctExecutableWithSpaces: true, distinctPhpRuntimes: Boolean(secondPhp), actualRuntimes,
    original, formatted: expected, autoFixState })}`);
}

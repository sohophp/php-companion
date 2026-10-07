import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as vscode from 'vscode';
import { installFormatterCliFixture } from './formatterCliFixture';

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const controlPath = process.env.SOPHP_FORMATTER_NAVIGATION_CONTROL; assert.ok(controlPath);
  const formatter = vscode.extensions.getExtension('junstyle.php-cs-fixer'); assert.ok(formatter); await formatter.activate();
  const probe = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(
    vscode.Uri.joinPath(formatter.extensionUri, 'sophp-navigation-probe.json'))).toString('utf8'));
  const bundle = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(formatter.extensionUri, 'index.js'));
  assert.equal(createHash('sha256').update(bundle).digest('hex'), probe.probeHash);
  assert.equal(probe.baseHash, '1948676a0542f7a323410f7814b7653e96e5df81f980dc5314b4e045608bf04d');
  const settings = vscode.workspace.getConfiguration('php-cs-fixer', folder.uri);
  for (const [key, value] of [['onsave', false], ['autoFixByBracket', true], ['autoFixBySemicolon', false]] as const) {
    await settings.update(key, value, vscode.ConfigurationTarget.WorkspaceFolder);
  }
  await vscode.workspace.getConfiguration('editor', { uri: folder.uri, languageId: 'php' })
    .update('formatOnSave', false, vscode.ConfigurationTarget.WorkspaceFolder, true);
  const exists = async (uri: vscode.Uri): Promise<boolean> => vscode.workspace.fs.stat(uri).then(() => true, () => false);
  const waitFile = async (uri: vscode.Uri): Promise<void> => {
    const deadline = Date.now() + 30_000;
    while (!await exists(uri) && Date.now() < deadline) await new Promise(done => setTimeout(done, 25));
    assert.ok(await exists(uri), `Navigation marker missing: ${uri.fsPath}`);
  };
  const original = '<?php\nclass NavigationRace{\npublic function value(){return 1234;}\n';
  const expected = '<?php\nclass NavigationRace\n{\n    public function value()\n    {\n        return 1234;\n    }\n}';
  const otherUri = vscode.Uri.joinPath(folder.uri, 'src', 'NavigationOther.php');
  await vscode.workspace.fs.writeFile(otherUri, Buffer.from('<?php\n$other=1;'));
  const other = await vscode.workspace.openTextDocument(otherUri);
  const results: object[] = [];
  for (const command of ['editor.action.jumpToBracket', 'cursorUndo']) {
    for (const state of ['new-version', 'focus-changed', 'current']) {
      const name = `${command === 'cursorUndo' ? 'undo' : 'jump'}-${state}`;
      const pending = vscode.Uri.joinPath(folder.uri, `${name}.pending`);
      const release = vscode.Uri.joinPath(folder.uri, `${name}.release`);
      const done = vscode.Uri.joinPath(folder.uri, `${name}.done`);
      const trace = vscode.Uri.joinPath(folder.uri, `${name}.trace`);
      const called = vscode.Uri.joinPath(folder.uri, `${name}.called`);
      await installFormatterCliFixture(folder, name, { called });
      await vscode.workspace.fs.writeFile(vscode.Uri.file(controlPath), Buffer.from(JSON.stringify({
        command, pending: pending.fsPath, release: release.fsPath, done: done.fsPath, trace: trace.fsPath,
      })));
      const uri = vscode.Uri.joinPath(folder.uri, 'src', `${name}.php`);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      const end = document.positionAt(document.getText().length); editor.selection = new vscode.Selection(end, end);
      try {
        await vscode.commands.executeCommand('type', { text: '}' }); await waitFile(pending);
        const requestedVersion = document.version;
        const completed = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(pending)).toString('utf8'));
        assert.equal(completed.phase, 'after-builtin'); assert.equal(completed.command, command);
        assert.equal(completed.uri, uri.toString());
        const commandPosition = completed.selections[0].slice(2);
        assert.deepEqual(commandPosition, command === 'cursorUndo' ? [3, 1] : [1, 20], 'Actual built-in command must move/restore the caret');
        if (state === 'new-version') {
          const edit = new vscode.WorkspaceEdit(); edit.insert(uri, document.positionAt(document.getText().length), ' // later input');
          assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.version > requestedVersion);
        }
        if (state === 'focus-changed') await vscode.window.showTextDocument(other);
        const active = vscode.window.activeTextEditor; assert.ok(active);
        const selections = active.selections.map(s => [s.anchor.line, s.anchor.character, s.active.line, s.active.character]);
        const source = document.getText();
        await vscode.workspace.fs.writeFile(release, Buffer.from('release')); await waitFile(done);
        const entries = Buffer.from(await vscode.workspace.fs.readFile(trace)).toString('utf8').trim().split('\n').map(line => JSON.parse(line));
        assert.equal(entries.at(-1).phase, 'flow-completed');
        assert.equal(entries.filter(entry => entry.phase === 'released').length, 1);
        const cliInvoked = await exists(called);
        assert.equal(cliInvoked, state === 'current', `${name}: guarded navigation must not invoke the CLI`);
        assert.equal(document.getText().replaceAll('\r\n', '\n'), state === 'current' ? expected : source);
        if (state !== 'current') assert.deepEqual(active.selections.map(s => [s.anchor.line, s.anchor.character, s.active.line, s.active.character]), selections);
        if (command === 'editor.action.jumpToBracket' && state !== 'current') {
          assert.ok(!entries.some(entry => entry.command === 'cursorUndo'), 'Stale jump continuation must not invoke cursorUndo');
        }
        assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), original);
        assert.equal(other.getText(), '<?php\n$other=1;');
        const result = { command, state, actualBuiltinCompleted: true, cliInvoked, requestedVersion,
          finalVersion: document.version, flowCompleted: true, entries };
        results.push(result); console.log(`Formatter navigation case proof: ${JSON.stringify(result)}`);
      } finally { await vscode.workspace.fs.writeFile(release, Buffer.from('release')); }
    }
  }
  console.log(`Formatter navigation race proof: ${JSON.stringify({ platform: process.platform, node: process.version,
    vscode: vscode.version, baseHash: probe.baseHash, probeHash: probe.probeHash, controlledDiagnostic: true, cases: results })}`);
}

import * as assert from 'node:assert';
import * as vscode from 'vscode';

const readText = async (uri: vscode.Uri): Promise<string> => Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');

async function withFormatOnSave(document: vscode.TextDocument, verify: () => Promise<void>): Promise<void> {
  const configuration = vscode.workspace.getConfiguration(undefined, document.uri);
  const key = `[${document.languageId}]`;
  const previous = configuration.inspect<Record<string, unknown>>(key)?.workspaceValue;
  const scope = { uri: document.uri, languageId: document.languageId };
  const previousEffective = vscode.workspace.getConfiguration('editor', scope).get('formatOnSave');
  try {
    await configuration.update(key, { ...previous, 'editor.formatOnSave': true }, vscode.ConfigurationTarget.Workspace);
    assert.strictEqual(vscode.workspace.getConfiguration('editor', scope).get('formatOnSave'), true);
    await verify();
  } finally {
    await configuration.update(key, previous, vscode.ConfigurationTarget.Workspace);
  }
  assert.deepStrictEqual(vscode.workspace.getConfiguration(undefined, document.uri).inspect(key)?.workspaceValue, previous);
  assert.strictEqual(vscode.workspace.getConfiguration('editor', scope).get('formatOnSave'), previousEffective);
}

async function createFixture(workspace: vscode.WorkspaceFolder, name: string, source: string): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.joinPath(workspace.uri, name);
  await assert.rejects(async () => vscode.workspace.fs.stat(uri),
    (error: unknown) => error instanceof vscode.FileSystemError && error.code === 'FileNotFound');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  return vscode.workspace.openTextDocument(uri);
}

export async function verifyFormatterOnSave(workspace: vscode.WorkspaceFolder, configUri: vscode.Uri): Promise<void> {
  for (const fixture of [
    { name: 'src/ProfileAutoSave.php', source: '<?php\nclass  ProfileAutoSave{public function run( ):void{}}\n',
      formatter: 'junstyle.php-cs-fixer', expected: 'class ProfileAutoSave\n{' },
    { name: 'ProfileAutoSave.html.twig', source: '{%if true%}{{ value }}{%endif%}\n',
      formatter: 'sohophp.twig-plus', expected: '{% if true %}' },
  ]) {
    const document = await createFixture(workspace, fixture.name, fixture.source);
    await withFormatOnSave(document, async () => {
      const editor = await vscode.window.showTextDocument(document);
      assert.strictEqual(vscode.workspace.getConfiguration('editor', { uri: document.uri, languageId: document.languageId }).get('defaultFormatter'), fixture.formatter);
      assert.ok(await editor.edit(edit => edit.insert(document.positionAt(document.getText().length), '\n')));
      const raw = fixture.source + '\n';
      assert.strictEqual(document.getText(), raw); assert.strictEqual(document.isDirty, true);
      assert.strictEqual(await readText(document.uri), fixture.source);
      assert.ok(await document.save(), 'Automatic formatting Save failed');
      const formatted = document.getText();
      assert.notStrictEqual(formatted, raw);
      assert.ok(formatted.replace(/\r\n/gu, '\n').includes(fixture.expected));
      assert.strictEqual(await readText(document.uri), formatted); assert.strictEqual(document.isDirty, false);
      await vscode.commands.executeCommand('undo');
      assert.strictEqual(document.getText(), raw, 'One Undo did not restore the pre-save buffer');
      assert.strictEqual(await readText(document.uri), formatted); assert.strictEqual(document.isDirty, true);
      await vscode.commands.executeCommand('redo');
      assert.strictEqual(document.getText(), formatted, 'One Redo did not restore automatic formatting');
      assert.strictEqual(await readText(document.uri), formatted); assert.strictEqual(document.isDirty, false);
      console.log('Open Source Profile format-on-save proof: ' + JSON.stringify({
        language: document.languageId, uri: document.uri.toString(), formatter: fixture.formatter,
        raw, formatted, saveAutomaticallyFormatted: true, undoRestoredPreSaveBuffer: true,
        redoRestoredSavedBuffer: true, undoAndRedoKeptDisk: true,
      }));
    });
  }

  const originalConfig = await vscode.workspace.fs.readFile(configUri);
  const markerUri = vscode.Uri.joinPath(workspace.uri, 'formatter-save-failure-observed.json');
  await assert.rejects(async () => vscode.workspace.fs.stat(markerUri),
    (error: unknown) => error instanceof vscode.FileSystemError && error.code === 'FileNotFound');
  for (const language of ['php', 'twig'] as const) {
    const source = language === 'php' ? '<?php\nclass  ProfileFailedSave{public function run( ):void{}}\n'
      : '<script>for (let i, i < 3; i++) {}</script>\n';
    const document = await createFixture(workspace, language === 'php' ? 'src/ProfileFailedSave.php' : 'ProfileFailedSave.html.twig', source);
    try {
      if (language === 'php') await vscode.workspace.fs.writeFile(configUri, Buffer.from(`<?php
file_put_contents(__DIR__ . '/formatter-save-failure-observed.json', json_encode([
    'message' => 'SoPHP intentional format-on-save failure', 'config' => __FILE__,
    'phpVersion' => PHP_VERSION, 'phpBinary' => PHP_BINARY,
]));
throw new RuntimeException('SoPHP intentional format-on-save failure');
`));
      await withFormatOnSave(document, async () => {
        const editor = await vscode.window.showTextDocument(document);
        assert.strictEqual(vscode.workspace.getConfiguration('editor', { uri: document.uri, languageId: document.languageId }).get('defaultFormatter'),
          language === 'php' ? 'junstyle.php-cs-fixer' : 'sohophp.twig-plus');
        const comment = language === 'php' ? '// user edit before failed save\n' : '{# user edit before failed save #}\n';
        assert.ok(await editor.edit(edit => edit.insert(document.positionAt(document.getText().length), comment)));
        const raw = source + comment; const version = document.version;
        assert.strictEqual(document.getText(), raw); assert.strictEqual(document.isDirty, true);
        assert.ok(await document.save(), 'A formatter failure prevented saving user input');
        assert.strictEqual(document.getText(), raw, 'A failed save formatter changed user input');
        assert.strictEqual(document.version, version, 'A failed save formatter changed the document version');
        assert.strictEqual(await readText(document.uri), raw); assert.strictEqual(document.isDirty, false);
        let witness: { message: string; config: string; phpVersion: string; phpBinary: string } | undefined;
        if (language === 'php') {
          witness = JSON.parse(await readText(markerUri)) as typeof witness;
          assert.ok(witness);
          assert.strictEqual(witness.message, 'SoPHP intentional format-on-save failure');
          assert.strictEqual(vscode.Uri.file(witness.config).fsPath, configUri.fsPath);
          assert.match(witness.phpVersion, /^\d+\.\d+\.\d+/u); assert.ok(witness.phpBinary);
          await vscode.workspace.fs.writeFile(configUri, originalConfig);
        }
        const recoveredSource = language === 'php' ? '<?php\nclass  ProfileRecoveredSave{public function run( ):void{}}\n'
          : '{%if true%}{{ recovered }}{%endif%}\n';
        assert.ok(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), recoveredSource)));
        assert.ok(await document.save(), 'Automatic formatting did not recover');
        const recovered = document.getText();
        assert.ok(recovered.replace(/\r\n/gu, '\n').includes(language === 'php' ? 'class ProfileRecoveredSave\n{' : '{% if true %}'));
        assert.strictEqual(await readText(document.uri), recovered); assert.strictEqual(document.isDirty, false);
        console.log('Open Source Profile failed format-on-save recovery proof: ' + JSON.stringify({
          language, uri: document.uri.toString(), raw, recovered, witness,
          failedFormatterSaveKeptBufferAndVersion: true, userInputSavedExactly: true,
          recoveredSaveAutomaticallyFormatted: true,
        }));
      });
    } finally {
      if (language === 'php') await vscode.workspace.fs.writeFile(configUri, originalConfig);
    }
  }
  assert.deepStrictEqual(await vscode.workspace.fs.readFile(configUri), originalConfig);
  console.log('Open Source Profile format-on-save settings and PHP config restored exactly');
}

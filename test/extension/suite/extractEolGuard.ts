import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const results = [];
  for (const [index, scenario] of ['target-content', 'stale-source'].entries()) {
    const name = `GuardBuilder${index}`;
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `${name}.php`);
    const target = vscode.Uri.joinPath(folder.uri, 'src', `${name}Interface.php`);
    const source = `<?php\nnamespace App;\nclass ${name} { public function with(): static { return $this; } }\n`;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
    const position = document.positionAt(source.indexOf(name) + 1);
    let action: vscode.CodeAction | undefined; const deadline = Date.now() + 20_000;
    while (!action && Date.now() < deadline) {
      const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>('vscode.executeCodeActionProvider', uri,
        new vscode.Range(position, position), vscode.CodeActionKind.RefactorExtract.value);
      action = actions.find((item): item is vscode.CodeAction => item.title === `Extract interface ${name}Interface` && 'command' in item);
      if (!action) await new Promise(done => setTimeout(done, 50));
    }
    assert.ok(action?.command);
    const append = async (targetUri: vscode.Uri): Promise<void> => {
      const current = await vscode.workspace.openTextDocument(targetUri); const edit = new vscode.WorkspaceEdit();
      edit.insert(targetUri, current.positionAt(current.getText().length), '// outside the approved plan\n');
      assert.ok(await vscode.workspace.applyEdit(edit));
    };
    const result = await vscode.commands.executeCommand(action.command.command, ...action.command.arguments ?? [], {
      testPreviewAction: async (): Promise<'apply'> => 'apply',
      testBeforeApply: scenario === 'stale-source' ? async (): Promise<void> => append(uri) : undefined,
      testApplyEdit: scenario === 'target-content' ? async (edit: vscode.WorkspaceEdit): Promise<boolean> => {
        assert.ok(await vscode.workspace.applyEdit(edit)); await append(target); return true;
      } : undefined,
    });
    assert.equal(result, false, `${scenario} was incorrectly accepted`);
    if (scenario === 'target-content') {
      assert.ok((await vscode.workspace.openTextDocument(target)).getText().includes('// outside the approved plan'));
      results.push({ scenario, rejected: true, unexpectedTextPreserved: true });
    } else {
      assert.ok(document.getText().includes('// outside the approved plan'));
      assert.ok(!document.getText().includes(`implements ${name}Interface`));
      await assert.rejects(async () => vscode.workspace.fs.stat(target));
      results.push({ scenario, rejected: true, targetNotCreated: true });
    }
  }
  console.log(`Extract EOL guard host proof: ${JSON.stringify({ platform: process.platform, results,
    scope: 'Unexpected post-apply target content is reported as failure and preserved; stale source is rejected before file creation' })}`);
}

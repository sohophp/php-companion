import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const baseline = process.env.PHP_COMPANION_PASTE_BASELINE === '1';
  console.log('Literal paste product: ' + core.extensionPath);
  let caseIndex = 0;
  const symbols = [{ fqcn: 'App\\Service\\UserService', alias: 'UserService' }];
  const rows: object[] = [];
  for (const marked of ["<?php $a='|';", '<?php $a="|";', "<?php $a='中文|';", "<?php $a=<<<'TXT'\n|\nTXT;"]) {
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `LiteralPaste${caseIndex++}.php`);
    const offset = marked.indexOf('|'); const source = marked.replace('|', '');
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    assert.equal(document.getText(), source, 'Test document retained stale source');
    // Keep the target unsaved; context must come from the editor, not stale disk.
    await editor.edit(edit => edit.insert(document.positionAt(source.length), '\n// unsaved'));
    const before = document.getText(); const position = document.positionAt(offset);
    const text = 'UserService 中文 ' + Array.from({ length: 100 }, (_, i) => `ExternalType${i}`).join(' ');
    for (const metadata of [false, true]) {
      const started = performance.now();
      const edits = await vscode.commands.executeCommand<unknown[]>('phpCompanion._testPasteImportEdits', uri, text, position,
        metadata ? { symbols } : undefined);
      const ms = performance.now() - started;
      rows.push({ marked, metadata, ms, importEdits: edits?.length ?? 0 });
      if (!baseline) { assert.equal(edits, undefined, `Literal paste requested PHP import edits: ${JSON.stringify({marked, metadata, before, position})}`); assert.ok(ms < 150, `Literal preflight took ${ms}ms`); }
    }
    if (!baseline) {
      editor.selection = new vscode.Selection(position, position);
      await vscode.env.clipboard.writeText(text);
      await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
      const expected = before.slice(0, offset) + text + before.slice(offset);
      const deadline = Date.now() + 5_000;
      while (document.getText() !== expected && Date.now() < deadline) await new Promise(done => setTimeout(done, 20));
      assert.equal(document.getText(), expected, 'Clipboard paste altered text or inserted imports');
      await vscode.commands.executeCommand('undo'); assert.equal(document.getText(), before);
    }
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  }
  // The same metadata remains eligible at an actual PHP code insertion point.
  console.log('Literal paste target measurements: ' + JSON.stringify({ baseline, rows }));
  const codeUri = vscode.Uri.joinPath(folder.uri, 'src', 'LiteralPasteCode.php');
  const source = '<?php namespace Consumer; function run() {  }';
  await vscode.workspace.fs.writeFile(codeUri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(codeUri); await vscode.window.showTextDocument(document);
  const edits = await vscode.commands.executeCommand<Array<{imports: string[]}>>('phpCompanion._testPasteImportEdits', codeUri,
    'new UserService();', document.positionAt(source.indexOf('  }') + 1), { symbols });
  assert.ok(edits?.some(edit => edit.imports.some(text => text.includes('use App\\Service\\UserService;'))), 'Code paste lost automatic imports');
  console.log('Literal paste host evidence: ' + JSON.stringify({ baseline, rows, codeImportPreserved: true }));
}

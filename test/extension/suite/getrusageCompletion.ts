import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'RusageConsumer.php');
  const timingKeys = ['ru_stime.tv_sec', 'ru_stime.tv_usec', 'ru_utime.tv_sec', 'ru_utime.tv_usec'];
  const expected = process.platform === 'win32' ? [...timingKeys, 'ru_majflt', 'ru_maxrss']
    : [...timingKeys, 'ru_oublock', 'ru_inblock', 'ru_msgsnd', 'ru_msgrcv', 'ru_maxrss', 'ru_ixrss',
      'ru_idrss', 'ru_minflt', 'ru_majflt', 'ru_nsignals', 'ru_nvcsw', 'ru_nivcsw', 'ru_nswap'];
  const text = (mode: string, guard: boolean): string => `<?php function usage(int $mode): void { $data = getrusage(${mode}); ${guard ? 'if ($data === false) return;' : ''} $data['ru_']; }`;
  const original = text('', true);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const mode of ['', '1', '$mode']) for (const guard of [true, false, true]) {
    const source = text(mode, guard);
    if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    let actual: string[] = []; const deadline = Date.now() + 20_000;
    do {
      const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
        document.positionAt(source.indexOf("['ru_") + 5));
      actual = (result?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? []).sort();
      if (JSON.stringify(actual) === JSON.stringify(guard ? [...expected].sort() : [])) break;
      await new Promise(done => setTimeout(done, 50));
    } while (Date.now() < deadline);
    assert.deepEqual(actual, guard ? [...expected].sort() : [], `${mode}: guard=${guard}`);
    results.push({ mode, guard, keys: actual, matched: true });
  }
  const definitions = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', uri,
    document.positionAt(document.getText().indexOf('getrusage') + 2));
  assert.equal(definitions?.length, 1);
  const builtinUri = definitions![0]!.uri; assert.ok(builtinUri.query.includes('getrusage'));
  const builtin = await vscode.workspace.openTextDocument(builtinUri);
  assert.ok(builtin.getText().includes("'ru_utime.tv_sec':int"));
  assert.equal(builtin.getText().includes("'ru_nivcsw':int"), process.platform !== 'win32');
  assert.equal(document.isDirty, true);
  assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Getrusage completion host proof: ' + JSON.stringify({ platform: process.platform, results,
    builtinDocumentMatchesRuntime: true, diskUnchanged: true }));
}

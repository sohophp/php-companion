import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { verifyDefaultEvaluationReorder } from './reorderDefaults';

/** Exercises the public command with real multi-file previews and undo history. */
export async function verifyEffectfulParameterReorder(folder: vscode.WorkspaceFolder): Promise<void> {
  const directory = vscode.Uri.joinPath(folder.uri, 'src', 'C3EffectReorder');
  await vscode.workspace.fs.createDirectory(directory);
  const names = ['Contract', 'Example', 'Caller'];
  const uris = names.map(name => vscode.Uri.joinPath(directory, `${name}.php`));
  const sources = [
    '<?php namespace App\\C3EffectReorder; interface Contract { public function send(int $head, int $mode = 20, int $count = 30): array; }',
    '<?php namespace App\\C3EffectReorder; final class Example implements Contract { public function send(int $head, int $mode = 20, int $count = 30): array { return [$head, $mode, $count]; } }',
    `<?php namespace App\\C3EffectReorder; final class Caller {
      public function run(Contract $contract, Example $example): void {
        $contract->send(nextValue('head'), nextValue('mode'), nextValue('count'));
        $example->send(nextValue('head'), mode: nextValue('mode'), count: nextValue('count'));
        $contract->send(nextValue('head'), nextValue('mode'));
      }
    }`,
  ];
  for (let index = 0; index < uris.length; index++) await vscode.workspace.fs.writeFile(uris[index]!, Buffer.from(sources[index]!));
  const documents = await Promise.all(uris.map(uri => vscode.workspace.openTextDocument(uri)));
  const contract = documents[0]!;
  const caller = documents[2]!;
  const unsaved = new vscode.WorkspaceEdit();
  const head = caller.getText().indexOf("'head'");
  unsaved.replace(uris[2]!, new vscode.Range(caller.positionAt(head), caller.positionAt(head + 6)), "'unsaved-head'");
  assert.ok(await vscode.workspace.applyEdit(unsaved));
  const initial = documents.map(document => document.getText());
  assert.ok(caller.isDirty);
  await vscode.window.showTextDocument(contract);
  const position = contract.positionAt(contract.getText().indexOf('$count') + 2);
  const command = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
    vscode.commands.executeCommand<boolean>('phpCompanion.reorderMethodParameters', {
      uri: uris[0], position, targetIndex: 1, testPreviewAction,
    });
  const assertInitial = (): void => documents.forEach((document, index) => assert.strictEqual(document.getText(), initial[index]));
  let sawPreview = false;
  assert.strictEqual(await command(async () => {
    const previews = vscode.window.tabGroups.all.flatMap(group => group.tabs)
      .filter(tab => tab.input instanceof vscode.TabInputTextDiff);
    for (const name of names) assert.ok(previews.some(tab => tab.label.includes(`${name}.php`)), `Missing ${name} preview`);
    sawPreview = true;
    return 'cancel';
  }), false);
  assert.ok(sawPreview); assertInitial();
  assert.strictEqual(await command(async () => {
    const edit = new vscode.WorkspaceEdit();
    edit.insert(uris[2]!, caller.positionAt(caller.getText().length), '\n// concurrent user input');
    assert.ok(await vscode.workspace.applyEdit(edit));
    return 'apply';
  }), false, 'The reorder command overwrote caller input during preview');
  assert.strictEqual(contract.getText(), initial[0]);
  assert.strictEqual(documents[1]!.getText(), initial[1]);
  assert.strictEqual(caller.getText(), initial[2] + '\n// concurrent user input');
  await vscode.window.showTextDocument(caller); await vscode.commands.executeCommand('undo'); assertInitial();
  await vscode.window.showTextDocument(contract);
  assert.strictEqual(await command(async () => 'apply'), true);
  const edited = documents.map(document => document.getText());
  assert.strictEqual(edited[0], initial[0]!.replace('int $mode = 20, int $count = 30', 'int $count = 30, int $mode = 20'));
  assert.strictEqual(edited[1], initial[1]!.replace('int $mode = 20, int $count = 30', 'int $count = 30, int $mode = 20'));
  assert.strictEqual(edited[2], initial[2]!
    .replace("send(nextValue('unsaved-head'), nextValue('mode'), nextValue('count'))", "send(head: nextValue('unsaved-head'), mode: nextValue('mode'), count: nextValue('count'))")
    .replace("send(nextValue('head'), mode: nextValue('mode'), count: nextValue('count'))", "send(head: nextValue('head'), mode: nextValue('mode'), count: nextValue('count'))")
    .replace("send(nextValue('head'), nextValue('mode'))", "send(head: nextValue('head'), mode: nextValue('mode'))"));
  await vscode.window.showTextDocument(contract); await vscode.commands.executeCommand('undo'); assertInitial();
  await vscode.commands.executeCommand('redo');
  documents.forEach((document, index) => assert.strictEqual(document.getText(), edited[index], 'One Redo must restore every file'));
  await vscode.commands.executeCommand('undo'); assertInitial();
  for (let index = 0; index < uris.length; index++) assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uris[index]!)).toString(), sources[index]);
  console.log('C3 effectful parameter reorder: three-file preview, unsaved caller, cancel/apply, concurrent-input rejection and one Undo/Redo passed');
}

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder);
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension); await extension.activate();
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', folder.uri).get('phpVersion'), '8.5');
  await verifyEffectfulParameterReorder(folder);
  await verifyDefaultEvaluationReorder(folder);
}

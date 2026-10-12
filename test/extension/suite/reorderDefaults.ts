import * as assert from 'node:assert';
import * as vscode from 'vscode';

export async function verifyDefaultEvaluationReorder(folder: vscode.WorkspaceFolder): Promise<void> {
  const directory = vscode.Uri.joinPath(folder.uri, 'src', 'C3DefaultReorder');
  await vscode.workspace.fs.createDirectory(directory);
  const scenarios = [
    ['Objects', `<?php namespace App\\C3DefaultReorder;
final class Mark { public function __construct(string $label) {} }
final class Objects {
  public function send(int $head, Mark $mode = new Mark('mode'), Mark $count = new Mark('count')): void {}
  public function run(): void { $this->send(1); }
}`],
    ['Lines', `<?php namespace App\\C3DefaultReorder; final class Lines {
  public function send(
    int $head,
    int $mode = __LINE__,
    int $count = __LINE__
  ): array { return [$head, $mode, $count, __LINE__]; }
  public function run(): array { return $this->send(1); }
}`],
    ['Multiline', `<?php namespace App\\C3DefaultReorder; final class Multiline {
  public function send(
    int $head,
    int $mode = 20,
    int $count = 30
  ): array { return [$head, $mode, $count, __LINE__]; }
  public function run(): array { return $this->send(
    1,
    2,
    3
  ); }
}`],
  ];
  for (const [name, source] of scenarios) {
    const uri = vscode.Uri.joinPath(directory, `${name}.php`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source!));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    const position = document.positionAt(source!.indexOf('$count') + 2);
    const command = (testPreviewAction: () => Promise<'apply' | 'cancel'>): Thenable<boolean> =>
      vscode.commands.executeCommand<boolean>('phpCompanion.reorderMethodParameters', { uri, position, targetIndex: 1, testPreviewAction });
    if (name !== 'Multiline') {
      let previewed = false;
      assert.strictEqual(await command(async () => { previewed = true; return 'apply'; }), false);
      assert.strictEqual(previewed, false, `${name}: unsafe defaults must be rejected before preview`);
      assert.strictEqual(document.getText(), source);
    } else {
      let previewed = false;
      assert.strictEqual(await command(async () => {
        assert.ok(vscode.window.tabGroups.all.flatMap(group => group.tabs)
          .some(tab => tab.input instanceof vscode.TabInputTextDiff && tab.label.includes('Multiline.php')));
        previewed = true; return 'cancel';
      }), false);
      assert.ok(previewed); assert.strictEqual(document.getText(), source);
      assert.strictEqual(await command(async () => 'apply'), true);
      const expected = source!.replace('int $mode = 20,\n    int $count = 30', 'int $count = 30,\n    int $mode = 20')
        .replace('1,\n    2,\n    3', '1,\n    3,\n    2');
      assert.strictEqual(document.getText(), expected);
      assert.strictEqual(document.getText().split('\n').length, source!.split('\n').length);
      await vscode.window.showTextDocument(document); await vscode.commands.executeCommand('undo');
      assert.strictEqual(document.getText(), source);
      await vscode.commands.executeCommand('redo'); assert.strictEqual(document.getText(), expected);
      await vscode.commands.executeCommand('undo'); assert.strictEqual(document.getText(), source);
    }
    assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
  }
  console.log('C3 default evaluation reorder: object/line defaults rejected before preview, multiline cancel/apply and one Undo/Redo passed');
}

import * as assert from 'node:assert';
import * as vscode from 'vscode';

/** Actual editor providers and unsaved changes; this is not human WSL acceptance. */
export async function verifyTemplateParameterBounds(root: vscode.Uri): Promise<void> {
  const directory = vscode.Uri.joinPath(root, 'src', 'Service', 'C2TemplateBounds');
  const uri = vscode.Uri.joinPath(directory, 'Example.php');
  try {
    await vscode.workspace.fs.stat(uri);
    assert.fail('The template-bound workflow must never overwrite an existing fixture.');
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') throw error;
  }
  const sourceFor = (templates: string, native: string, method = 'value'): string => `<?php namespace App\\Service\\C2TemplateBounds;
class Item { public function value(): string { return 'item'; } }
class Other { public function other(): string { return 'other'; } }
class T { public function value(): string { return 'unrelated'; } }
class Example {
/** ${templates}
 * @param T $item */
public static function run(${native}$item) { $item->${method}(); }
}`;
  const initial = sourceFor('@template T of Item', 'Item ');
  let document: vscode.TextDocument | undefined;
  const observations: Array<{ version: number; method: string; expectedOwner?: string }> = [];
  await vscode.workspace.fs.createDirectory(directory);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(initial));
  try {
    document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    const query = async (method: string, owner?: string): Promise<void> => {
      const source = document!.getText();
      const position = document!.positionAt(source.lastIndexOf(`${method}()`) + 1);
      const definitions = await vscode.commands.executeCommand<Array<vscode.Location | vscode.LocationLink>>(
        'vscode.executeDefinitionProvider', uri, position);
      if (owner === undefined) assert.deepStrictEqual(definitions ?? [], [], 'An unbounded template resolved an unrelated class.');
      else {
        assert.strictEqual(definitions?.length, 1, 'The template bound lost its unique method definition.');
        const location = definitions![0]!;
        const targetUri = 'targetUri' in location ? location.targetUri : location.uri;
        const range = 'targetUri' in location ? location.targetSelectionRange ?? location.targetRange : location.range;
        assert.strictEqual(targetUri.toString(), uri.toString());
        const offset = source.indexOf(`function ${method}(`, source.indexOf(`class ${owner} `)) + 'function '.length;
        assert.ok(offset >= 'function '.length);
        assert.ok(range.contains(document!.positionAt(offset)), 'The template member resolved to the wrong declaration.');
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, position);
        assert.ok(hovers?.some(hover => hover.contents.some(content =>
          (typeof content === 'string' ? content : content.value).includes(method))), 'The current template member lost its hover.');
      }
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position);
      assert.strictEqual(completion?.items.some(item => (typeof item.label === 'string' ? item.label : item.label.label) === method) ?? false,
        owner !== undefined, 'Completion retained the wrong template-bound member.');
      observations.push({version: document!.version, method, expectedOwner: owner});
    };
    const change = async (source: string): Promise<void> => {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(document!.positionAt(0), document!.positionAt(document!.getText().length)), source);
      assert.ok(await vscode.workspace.applyEdit(edit));
      assert.ok(document!.isDirty, 'Template changes were unexpectedly saved.');
    };
    await query('value', 'Item');
    await change(sourceFor('@template T of Other', 'Other ', 'other')); await query('other', 'Other');
    await change(sourceFor('@template T', '')); await query('value');
    const cyclic = sourceFor('@template U of T\n * @template T of U', '');
    await change(cyclic); await query('value');
    await change(initial); await query('value', 'Item');
    await vscode.commands.executeCommand('undo'); assert.strictEqual(document.getText(), cyclic); await query('value');
    await vscode.commands.executeCommand('redo'); assert.strictEqual(document.getText(), initial); await query('value', 'Item');
    assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), initial);
    assert.strictEqual(observations.length, 7);
    console.log('C2 template-bound editor workflow: ' + JSON.stringify(observations));
  } finally {
    if (document && !document.isClosed && document.getText() !== initial) {
      const reset = new vscode.WorkspaceEdit();
      reset.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), initial);
      assert.ok(await vscode.workspace.applyEdit(reset));
    }
    if (document?.isDirty) await document.save();
    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
      tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === uri.toString());
    if (tabs.length) await vscode.window.tabGroups.close(tabs);
    await vscode.workspace.fs.delete(uri, {useTrash: false});
  }
}

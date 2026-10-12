import * as assert from 'node:assert';
import * as vscode from 'vscode';

/** Actual editor providers and unsaved changes; this is not human WSL acceptance. */
export async function verifyForeachAssertions(root: vscode.Uri): Promise<void> {
  const directory = vscode.Uri.joinPath(root, 'src', 'Service', 'C2ForeachAssertions');
  const uri = vscode.Uri.joinPath(directory, 'Example.php');
  try {
    await vscode.workspace.fs.stat(uri);
    assert.fail('The foreach-assertion workflow must never overwrite an existing fixture.');
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') throw error;
  }
  const sourceFor = (body: string): string => `<?php namespace App\\Service\\C2ForeachAssertions;
class Base {}
class Ready extends Base { public function onlyReady(): void {} }
/** @phpstan-assert Ready $value */ function requireReady(Base $value): void {}
/** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
function needReady(Ready $value): void {}
function unknown($value): void {}
/** @param list<Base> $items */ function run(Base $item, array $items): void { ${body} }
`;
  const good = 'foreach ($items as $item) { requireReady($item); $item->onlyReady(); needReady($item); }';
  const initial = sourceFor(good);
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
      if (owner === undefined) assert.deepStrictEqual(definitions ?? [], [], 'A stale assertion survived foreach value rebinding or a possible mutation.');
      else {
        assert.strictEqual(definitions?.length, 1, 'The asserted foreach value lost its unique method definition.');
        const location = definitions![0]!;
        const targetUri = 'targetUri' in location ? location.targetUri : location.uri;
        const range = 'targetUri' in location ? location.targetSelectionRange ?? location.targetRange : location.range;
        assert.strictEqual(targetUri.toString(), uri.toString());
        const offset = source.indexOf(`function ${method}(`, source.indexOf(`class ${owner} `)) + 'function '.length;
        assert.ok(offset >= 'function '.length);
        assert.ok(range.contains(document!.positionAt(offset)), 'The asserted foreach member resolved to the wrong declaration.');
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, position);
        assert.ok(hovers?.some(hover => hover.contents.some(content =>
          (typeof content === 'string' ? content : content.value).includes(method))), 'The asserted foreach member lost its hover.');
      }
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position);
      assert.strictEqual(completion?.items.some(item => (typeof item.label === 'string' ? item.label : item.label.label) === method) ?? false,
        owner !== undefined, 'Completion retained the wrong foreach-assertion member.');
      observations.push({version: document!.version, method, expectedOwner: owner});
    };
    const change = async (source: string): Promise<void> => {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(document!.positionAt(0), document!.positionAt(document!.getText().length)), source);
      assert.ok(await vscode.workspace.applyEdit(edit));
      assert.ok(document!.isDirty, 'Foreach changes were unexpectedly saved.');
    };
    await query('onlyReady', 'Ready');
    await change(sourceFor('foreach ($items as $item) { if (isReady($item)) { $item->onlyReady(); needReady($item); } }'));
    await query('onlyReady', 'Ready');
    const rebound = sourceFor('requireReady($item); foreach ($items as $item) { $item->onlyReady(); needReady($item); }');
    await change(rebound); await query('onlyReady');
    await change(sourceFor('foreach ($items as $item) { requireReady($item); unknown($item); $item->onlyReady(); needReady($item); }'));
    await query('onlyReady');
    await change(rebound); await query('onlyReady');
    await change(initial); await query('onlyReady', 'Ready');
    await vscode.commands.executeCommand('undo'); assert.strictEqual(document.getText(), rebound); await query('onlyReady');
    await vscode.commands.executeCommand('redo'); assert.strictEqual(document.getText(), initial); await query('onlyReady', 'Ready');
    const negativeSourceFor = (body: string): string => sourceFor(body)
      .replace('class Base {}', 'class Base {}\nclass Rejected extends Base {}')
      .replace('@phpstan-assert Ready', '@phpstan-assert !(Rejected|null)')
      .replace('@phpstan-assert-if-true Ready', '@phpstan-assert-if-true !(Rejected|null)')
      .replace('function requireReady(Base', 'function requireReady(?Base')
      .replace('function isReady(Base', 'function isReady(?Base')
      .replace('list<Base>', 'list<Ready|Rejected|null>');
    const negativeGood = negativeSourceFor(good);
    const negativeConditional = negativeSourceFor('foreach ($items as $item) { if (isReady($item)) { $item->onlyReady(); needReady($item); } }');
    const negativeMutation = negativeSourceFor('foreach ($items as $item) { requireReady($item); unknown($item); $item->onlyReady(); needReady($item); }');
    await change(negativeGood); await query('onlyReady', 'Ready');
    await change(negativeConditional); await query('onlyReady', 'Ready');
    await change(negativeMutation); await query('onlyReady');
    await vscode.commands.executeCommand('undo'); assert.strictEqual(document.getText(), negativeConditional); await query('onlyReady', 'Ready');
    await vscode.commands.executeCommand('redo'); assert.strictEqual(document.getText(), negativeMutation); await query('onlyReady');
    await change(negativeGood); await query('onlyReady', 'Ready');
    const loopBreak = sourceFor('while (true) { if (!isReady($item)) { break (1); } $item->onlyReady(); needReady($item); }');
    const negativeLoopBreak = negativeSourceFor('foreach ($items as $item) { if (!isReady($item)) { break; } $item->onlyReady(); needReady($item); }');
    const invalidLoopExit = sourceFor('while (true) { if (!isReady($item)) { continue 2; } $item->onlyReady(); needReady($item); }');
    await change(loopBreak); await query('onlyReady', 'Ready');
    await change(negativeLoopBreak); await query('onlyReady', 'Ready');
    await change(invalidLoopExit); await query('onlyReady');
    await vscode.commands.executeCommand('undo'); assert.strictEqual(document.getText(), negativeLoopBreak); await query('onlyReady', 'Ready');
    await vscode.commands.executeCommand('redo'); assert.strictEqual(document.getText(), invalidLoopExit); await query('onlyReady');
    await change(loopBreak); await query('onlyReady', 'Ready');
    assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), initial);
    assert.strictEqual(observations.length, 20);
    console.log('C2 foreach-assertion editor workflow: ' + JSON.stringify(observations));
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

import * as assert from 'node:assert';
import * as vscode from 'vscode';

/** Keep generation inside a complete selected class during unsaved editing. */
export async function verifyGenerationBodyBoundary(root: vscode.Uri): Promise<void> {
  const namespace = 'App\\Service\\C3BodyBoundary';
  const directory = vscode.Uri.joinPath(root, 'src', 'Service', 'C3BodyBoundary');
  try {
    await vscode.workspace.fs.stat(directory); assert.fail('The generation fixture must not overwrite existing files.');
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') throw error;
  }
  await vscode.workspace.fs.createDirectory(directory);
  for (const [name, declaration] of Object.entries({
    Base: 'class Base { public function label(): string { return "label"; } }',
    Contract: 'interface Contract { public function label(): string; }',
    AbstractBase: 'abstract class AbstractBase { abstract public function label(): string; }',
  })) await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(directory, `${name}.php`), Buffer.from(`<?php namespace ${namespace}; ${declaration}`));
  const uri = vscode.Uri.joinPath(directory, 'Target.php');
  const initial = `<?php namespace ${namespace}; class Target {}`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(initial));
  const variants = [
    { name: 'complete class', body: 'private string $value;', suffix: '}', expected: true },
    { name: 'nested method braces', body: 'private string $value; public function keep(): void { if (true) {} }', suffix: '}', expected: true },
    { name: 'brace in comment', body: 'private string $value; /* } */', suffix: '}', expected: true },
    { name: 'unrelated unfinished function', body: 'private string $value;', suffix: '} function unrelated(', expected: true },
    { name: 'missing class brace', body: 'private string $value; public function keep(): void {}', suffix: '', expected: false },
    { name: 'line-comment brace', body: 'private string $value; public function keep(): void {} // }', suffix: '', expected: false },
    { name: 'block-comment brace', body: 'private string $value; public function keep(): void {} /* } */', suffix: '', expected: false },
    { name: 'unfinished method', body: 'private string $value; public function keep(): void {} public function unfinished(', suffix: '', expected: false },
  ];
  const titles = { constructor: 'Generate constructor for 1 property', accessor: 'Generate 1 property accessor',
    interface: 'Implement 1 interface method', abstract: 'Implement 1 abstract method', override: `Override ${namespace}\\Base::label` };
  const observations: Array<{ operation: string; variant: string; offered: boolean; version: number; undoRedo: boolean }> = [];
  let failure: unknown;
  try {
    for (const operation of ['constructor', 'accessor', 'interface', 'abstract', 'override'] as const) for (const variant of variants) {
      const source = `<?php namespace ${namespace}; class Target${operation === 'override' ? ' extends Base' : operation === 'interface' ? ' implements Contract' : operation === 'abstract' ? ' extends AbstractBase' : ''} { ${variant.body} ${variant.suffix}`;
      let document = await vscode.workspace.openTextDocument(uri);
      const change = new vscode.WorkspaceEdit();
      change.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source);
      assert.ok(await vscode.workspace.applyEdit(change));
      document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
      const cursor = document.positionAt(source.indexOf('Target') + 2), version = document.version;
      const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>('vscode.executeCodeActionProvider', uri,
        new vscode.Range(cursor, cursor), vscode.CodeActionKind.RefactorRewrite.value);
      const selected = actions.filter((action): action is vscode.CodeAction => action.title === titles[operation] && 'kind' in action);
      assert.strictEqual(selected.length, variant.expected ? 1 : 0, `${operation}/${variant.name}`);
      if (selected.length) {
        const action = selected[0]!; assert.ok(action.command, 'Generation must use the guarded preview command.');
        assert.strictEqual(await vscode.commands.executeCommand(action.command.command, ...action.command.arguments ?? [], { testPreviewAction: async () => 'cancel' }), false);
        document = await vscode.workspace.openTextDocument(uri); assert.strictEqual(document.getText(), source); assert.strictEqual(document.version, version);
        assert.strictEqual(await vscode.commands.executeCommand(action.command.command, ...action.command.arguments ?? [], { testPreviewAction: async () => 'apply' }), true);
        document = await vscode.workspace.openTextDocument(uri);
        const generated = document.getText(); assert.notStrictEqual(generated, source);
        const expectedNames = operation === 'constructor' ? ['__construct'] : operation === 'accessor' ? ['getValue', 'setValue'] : ['label'];
        for (const name of expectedNames) assert.ok(generated.includes(`function ${name}(`));
        assert.ok(generated.endsWith(variant.suffix), 'Generation replaced the class closing brace or unrelated unfinished code.');
        await vscode.window.showTextDocument(document);
        await vscode.commands.executeCommand('undo'); assert.strictEqual(document.getText(), source);
        await vscode.commands.executeCommand('redo'); assert.strictEqual(document.getText(), generated);
        await vscode.commands.executeCommand('undo'); assert.strictEqual(document.getText(), source);
      }
      assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), initial);
      observations.push({ operation, variant: variant.name, offered: selected.length === 1, version, undoRedo: selected.length === 1 });
    }
    assert.strictEqual(observations.length, 40);
    console.log('C3 generation complete-body workflow: ' + JSON.stringify(observations));
  } catch (error) { failure = error; }
  finally {
    try {
      const document = await vscode.workspace.openTextDocument(uri), restore = new vscode.WorkspaceEdit();
      restore.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), initial);
      assert.ok(await vscode.workspace.applyEdit(restore));
      await vscode.workspace.fs.delete(directory, { recursive: true, useTrash: false });
    } catch (cleanupError) {
      if (failure === undefined) failure = cleanupError;
      else console.error('Generation fixture cleanup failed:', cleanupError);
    }
  }
  if (failure !== undefined) throw failure;
}

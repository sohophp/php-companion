import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { generatorDelegationContract, generatorDelegationMismatchCalls, generatorDelegationSource,
  type GeneratorDelegationState } from './generatorDelegationFixture.js';

/** Exercise real providers and unsaved document versions in the original C2 workflow. */
export async function verifyGeneratorDelegation(root: vscode.Uri): Promise<void> {
  const namespace = 'App\\Service\\C2GeneratorDelegation';
  const directory = vscode.Uri.joinPath(root, 'src', 'Service', 'C2GeneratorDelegation');
  const uri = vscode.Uri.joinPath(directory, 'Example.php');
  try {
    await vscode.workspace.fs.stat(uri); assert.fail('The Generator workflow must not overwrite an existing fixture.');
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') throw error;
  }
  const initial = generatorDelegationSource(namespace, 'result');
  await vscode.workspace.fs.createDirectory(directory); await vscode.workspace.fs.writeFile(uri, Buffer.from(initial));
  let document: vscode.TextDocument | undefined, failure: unknown;
  const observations: Array<{ state: string; version: number; signature: string; mismatchLines: number[] }> = [];
  const refresh = async (): Promise<vscode.TextDocument> => {
    document = await vscode.workspace.openTextDocument(uri); assert.ok(!document.isClosed); return document;
  };
  const member = async (marker: string, owner?: string): Promise<void> => {
    const current = await refresh(), source = current.getText();
    const position = current.positionAt(source.lastIndexOf(marker) + marker.indexOf('->') + 3);
    const name = marker.slice(marker.indexOf('->') + 2).replace('()', '');
    const definitions = await vscode.commands.executeCommand<Array<vscode.Location | vscode.LocationLink>>('vscode.executeDefinitionProvider', uri, position);
    if (owner === undefined) assert.deepStrictEqual(definitions ?? [], [], 'An unknown or null delegated result retained a method.');
    else {
      assert.strictEqual(definitions?.length, 1);
      const location = definitions![0]!, targetUri = 'targetUri' in location ? location.targetUri : location.uri;
      const range = 'targetUri' in location ? location.targetSelectionRange ?? location.targetRange : location.range;
      assert.strictEqual(targetUri.toString(), uri.toString());
      const offset = source.indexOf(`function ${name}(`, source.indexOf(`class ${owner} `)) + 'function '.length;
      assert.ok(range.contains(current.positionAt(offset)), 'Delegated result resolved to the wrong class member.');
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, position);
      assert.ok(hovers?.some(hover => hover.contents.some(content => (typeof content === 'string' ? content : content.value).includes(name))));
    }
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position);
    assert.strictEqual(completion?.items.some(item => (typeof item.label === 'string' ? item.label : item.label.label) === name) ?? false, owner !== undefined);
  };
  const query = async (state: GeneratorDelegationState): Promise<void> => {
    const current = await refresh(), source = current.getText(); assert.strictEqual(source, generatorDelegationSource(namespace, state));
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', uri,
      current.positionAt(source.lastIndexOf('delegated();') + 'delegated('.length));
    assert.strictEqual(signature?.signatures.length, 1);
    const label = signature!.signatures[0]!.label;
    assert.strictEqual(label.slice(label.indexOf(': ') + 2), generatorDelegationContract(namespace, state));
    await member('$result->done()', state === 'result' ? 'Result' : undefined);
    await member('$result->wrong()', state === 'other' ? 'Other' : undefined);
    await member('$item->name()', state !== 'unknown' ? 'Item' : undefined);
    const expected = generatorDelegationMismatchCalls(state).map(name => current.positionAt(
      source.lastIndexOf(`${name}($result)`) + `${name}(`.length).line).sort((a, b) => a - b);
    const lines = (): number[] => vscode.languages.getDiagnostics(uri).filter(item => item.code === 'php.argument.type-mismatch')
      .map(item => item.range.start.line).sort((a, b) => a - b);
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && JSON.stringify(lines()) !== JSON.stringify(expected)) await new Promise(done => setTimeout(done, 40));
    assert.deepStrictEqual(lines(), expected, 'Delegated result diagnostics retained an earlier document version.');
    assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), initial);
    observations.push({ state, version: current.version, signature: label, mismatchLines: lines() });
  };
  const change = async (state: GeneratorDelegationState): Promise<void> => {
    const current = await refresh(), edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(current.positionAt(0), current.positionAt(current.getText().length)), generatorDelegationSource(namespace, state));
    assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok((await refresh()).isDirty);
  };
  try {
    await vscode.window.showTextDocument(await refresh()); await query('result');
    for (const state of ['other', 'array', 'unknown', 'result'] as const) { await change(state); await query(state); }
    await vscode.commands.executeCommand('undo'); await query('unknown');
    await vscode.commands.executeCommand('redo'); await query('result');
    assert.strictEqual(observations.length, 7);
    console.log('C2 Generator delegation editor workflow: ' + JSON.stringify(observations));
  } catch (error) { failure = error; }
  try {
    const current = await refresh();
    if (current.getText() !== initial) {
      const edit = new vscode.WorkspaceEdit(); edit.replace(uri, new vscode.Range(current.positionAt(0), current.positionAt(current.getText().length)), initial);
      assert.ok(await vscode.workspace.applyEdit(edit)); await refresh();
    }
    if (document?.isDirty) assert.ok(await document.save());
    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab => tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === uri.toString());
    if (tabs.length) await vscode.window.tabGroups.close(tabs);
    await vscode.workspace.fs.delete(uri, { useTrash: false });
  } catch (error) { if (failure === undefined) failure = error; }
  if (failure !== undefined) throw failure;
}

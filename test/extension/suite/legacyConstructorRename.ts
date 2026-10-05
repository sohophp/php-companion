import * as assert from 'node:assert';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const extension = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(extension);
  await extension.activate();
  const version = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get<string>('phpVersion');
  assert.ok(version === '7.2' || version === '8.5');
  const legacy = version === '7.2';
  const cases = [
    { name: 'HostLegacy', body: 'public function HostLegacy(int $value){}', marker: legacy ? 'function HostLegacy' : 'class HostLegacy',
      changed: legacy ? 'public function HostRenamedLegacy(int $value){}' : 'public function HostLegacy(int $value){}' },
    { name: 'HostAlias', body: 'use HostAliasInit {seed as HostAlias;}', marker: 'class HostAlias',
      trait: '<?php trait HostAliasInit {public function seed(int $value){}}',
      changed: legacy ? 'use HostAliasInit {seed as HostRenamedAlias;}' : 'use HostAliasInit {seed as HostAlias;}' },
    { name: 'HostShared', body: 'use HostSharedInit;', marker: 'class HostShared',
      trait: '<?php trait HostSharedInit {public function HostShared(int $value){}}',
      changed: legacy ? 'use HostSharedInit { HostSharedInit::HostShared as public HostRenamedShared; }' : 'use HostSharedInit;' },
  ];
  let accepted = 0, cancelled = 0, rejectedDependencies = 0;
  for (const item of cases) {
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `${item.name}.php`);
    const newName = item.name.replace('Host', 'HostRenamed');
    const newUri = vscode.Uri.joinPath(folder.uri, 'src', `${newName}.php`);
    const source = `<?php class ${item.name} {${item.body}} new ${item.name}(7);`;
    const expected = `<?php class ${newName} {${item.changed}} new ${newName}(7);`;
    const traitUri = vscode.Uri.joinPath(folder.uri, 'src', `${item.name}Init.php`);
    if (item.trait) await vscode.workspace.fs.writeFile(traitUri, Buffer.from(item.trait));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
    const position = document.positionAt(source.indexOf(item.marker) + item.marker.length - 1);
    assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
      uri, position, newName, testPreviewAction: async () => {
        assert.ok(vscode.window.tabGroups.all.flatMap(group => group.tabs).some(tab => tab.label.includes(`${item.name}.php`)));
        return 'cancel';
      },
    }), false);
    cancelled++; assert.strictEqual(document.getText(), source);
    await assert.rejects(async () => vscode.workspace.fs.stat(newUri));
    if (legacy && item.name === 'HostShared') {
      let previewed = false;
      assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
        uri, position, newName,
        testAfterPlan: async () => { await vscode.workspace.fs.writeFile(traitUri, Buffer.from(`${item.trait}\n// changed after plan`)); },
        testPreviewAction: async () => { previewed = true; return 'apply'; },
      }), false, 'A changed unedited Trait dependency must invalidate Rename');
      assert.strictEqual(previewed, false); assert.strictEqual(document.getText(), source); rejectedDependencies++;
      await vscode.workspace.fs.writeFile(traitUri, Buffer.from(item.trait!));
    }
    assert.strictEqual(await vscode.commands.executeCommand<boolean>('phpCompanion.safeRename', {
      uri, position, newName, testPreviewAction: async () => 'apply',
    }), true);
    assert.strictEqual((await vscode.workspace.openTextDocument(newUri)).getText(), expected);
    await assert.rejects(async () => vscode.workspace.fs.stat(uri));
    await vscode.commands.executeCommand('undo');
    assert.strictEqual((await vscode.workspace.openTextDocument(uri)).getText(), source);
    await assert.rejects(async () => vscode.workspace.fs.stat(newUri));
    await vscode.commands.executeCommand('redo');
    assert.strictEqual((await vscode.workspace.openTextDocument(newUri)).getText(), expected);
    await assert.rejects(async () => vscode.workspace.fs.stat(uri));
    if (item.trait) assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(traitUri)).toString(), item.trait);
    accepted++;
  }
  assert.strictEqual(accepted, 3); assert.strictEqual(cancelled, 3);
  assert.strictEqual(rejectedDependencies, legacy ? 1 : 0);
  console.log(`Legacy Rename host PHP ${version}: ${accepted} preview/apply/file/Undo/Redo cases; ${cancelled} cancellations; ${rejectedDependencies} changed dependency refusals passed`);
}

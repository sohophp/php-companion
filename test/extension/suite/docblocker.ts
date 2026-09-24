import * as assert from 'node:assert';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0];
  assert.ok(root, 'DocBlocker composition test needs an isolated Composer project.');
  const core = vscode.extensions.getExtension('sohophp.php-companion');
  const docblocker = vscode.extensions.getExtension('neilbrayfield.php-docblocker');
  assert.ok(core, 'SoPHP Core did not load.');
  assert.ok(docblocker, 'The isolated profile did not load PHP DocBlocker.');
  for (const id of ['sohophp.php-companion-symfony', 'sohophp.php-companion-open-source-pack', 'sohophp.twig-plus',
    'redhat.vscode-yaml', 'redhat.vscode-xml', 'xdebug.php-debug', 'recca0120.vscode-phpunit',
    'junstyle.php-cs-fixer', 'EditorConfig.EditorConfig', 'eiminsasete.apacheconf-snippets']) {
    assert.ok(vscode.extensions.getExtension(id), `The isolated Pack profile is missing ${id}.`);
  }
  const pack = vscode.extensions.getExtension('sohophp.php-companion-open-source-pack');
  assert.ok((pack?.packageJSON.extensionPack as string[] | undefined)?.includes('neilbrayfield.php-docblocker'),
    'The source Pack manifest did not include PHP DocBlocker.');
  assert.strictEqual(docblocker.packageJSON.version, '2.7.0');
  const phpVersion = process.env.PHP_COMPANION_TEST_DOCBLOCKER_PHP_VERSION ?? '8.5';
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', root.uri).get('phpVersion'), phpVersion);

  const uri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'DocblockerProbe.php');
  const source = '<?php\n\nfunction describe(int $value): string { return (string) $value; }\n';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  await core.activate();
  await docblocker.activate();
  editor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(1, 0));
  await vscode.commands.executeCommand('type', { text: '/**' });
  const typed = document.lineAt(1).text;
  console.log(`PHP DocBlocker typed trigger: ${JSON.stringify(typed)}`);
  const position = editor.selection.active;
  let items: vscode.CompletionItem[] = [];
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const result = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, position, '*', 100,
    );
    items = result?.items ?? [];
    if (items.some((item) => item.detail === 'PHP DocBlocker')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const docblockItems = items.filter((item) => item.label === '/**' && item.detail === 'PHP DocBlocker');
  assert.strictEqual(docblockItems.length, 1, 'PHP DocBlocker did not provide one DocBlock generator.');
  assert.strictEqual(items.filter((item) => item.label === '/**').length, 1, 'The profile offered duplicate DocBlock generators.');
  const item = docblockItems[0]!;
  assert.ok(item.insertText instanceof vscode.SnippetString, 'DocBlock generator did not return a snippet.');
  const replacement = item.range instanceof vscode.Range ? item.range : item.range?.replacing;
  assert.ok(replacement, 'DocBlock generator did not identify the typed trigger range.');
  assert.ok(await editor.insertSnippet(item.insertText, replacement));
  const generated = document.getText();
  assert.match(generated, /@param\s+(?:int|integer)\s+\$value/u);
  assert.match(generated, /@return\s+string/u);
  assert.strictEqual((generated.match(/\/\*\*/gu) ?? []).length, 1,
    `DocBlocker left duplicate opening markers; range=${replacement.start.line}:${replacement.start.character}-${replacement.end.line}:${replacement.end.character}; source=${JSON.stringify(generated)}`);
  const diagnostics = vscode.languages.getDiagnostics(uri).filter((diagnostic) => diagnostic.source === 'PHP Companion');
  assert.ok(!diagnostics.some((diagnostic) => diagnostic.code === 'php.phpdoc.type-conflict'),
    'SoPHP rejected the generated native-compatible DocBlock.');
  if (phpVersion === '8.5') {
    const modernUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ModernDocblockerProbe.php');
    await vscode.workspace.fs.writeFile(modernUri, Buffer.from('<?php\n\nfunction modern(?string $value): int|false { return false; }\n'));
    const modernDocument = await vscode.workspace.openTextDocument(modernUri);
    const modernEditor = await vscode.window.showTextDocument(modernDocument);
    modernEditor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(1, 0));
    await vscode.commands.executeCommand('type', { text: '/**' });
    const modernItems = (await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', modernUri, modernEditor.selection.active, '*', 100,
    ))?.items.filter((candidate) => candidate.label === '/**' && candidate.detail === 'PHP DocBlocker') ?? [];
    assert.strictEqual(modernItems.length, 1);
    const modernItem = modernItems[0]!;
    assert.ok(modernItem.insertText instanceof vscode.SnippetString);
    const modernRange = modernItem.range instanceof vscode.Range ? modernItem.range : modernItem.range?.replacing;
    assert.ok(modernRange);
    assert.ok(await modernEditor.insertSnippet(modernItem.insertText, modernRange));
    const modernGenerated = modernDocument.getText();
    assert.match(modernGenerated, /@param\s+(?:\?string|string\|null)\s+\$value/u);
    assert.match(modernGenerated, /@return\s+(?:int|integer)\|false/u);

    const propertyUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'PropertyDocblockerProbe.php');
    await vscode.workspace.fs.writeFile(propertyUri, Buffer.from('<?php\nclass PropertyDocblockerProbe {\n    \n    public string $name;\n}\n'));
    const propertyDocument = await vscode.workspace.openTextDocument(propertyUri);
    const propertyEditor = await vscode.window.showTextDocument(propertyDocument);
    propertyEditor.selection = new vscode.Selection(new vscode.Position(2, 4), new vscode.Position(2, 4));
    await vscode.commands.executeCommand('type', { text: '/**' });
    const propertyItems = (await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', propertyUri, propertyEditor.selection.active, '*', 100,
    ))?.items.filter((candidate) => candidate.label === '/**' && candidate.detail === 'PHP DocBlocker') ?? [];
    assert.strictEqual(propertyItems.length, 1);
    const propertyItem = propertyItems[0]!;
    assert.ok(propertyItem.insertText instanceof vscode.SnippetString);
    const propertyRange = propertyItem.range instanceof vscode.Range ? propertyItem.range : propertyItem.range?.replacing;
    assert.ok(propertyRange);
    assert.ok(await propertyEditor.insertSnippet(propertyItem.insertText, propertyRange));
    assert.match(propertyDocument.getText(), /@var\s+string/u);
  }
  const tagUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'DocblockerTagProbe.php');
  const tagSource = '<?php\n/**\n * @p\n */\nfunction tagged($value): void {}\n';
  await vscode.workspace.fs.writeFile(tagUri, Buffer.from(tagSource));
  const tagDocument = await vscode.workspace.openTextDocument(tagUri);
  await vscode.window.showTextDocument(tagDocument);
  const tagPosition = tagDocument.positionAt(tagSource.indexOf('@p') + 2);
  const tagItems = (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', tagUri, tagPosition, '@', 100,
  ))?.items ?? [];
  assert.strictEqual(tagItems.filter((candidate) => candidate.label === '@param').length, 1,
    'The full Pack profile did not offer exactly one @param completion.');
  console.log('PHP DocBlocker 2.7.0 + SoPHP: one generator, typed param/return, no PHPDoc conflict.');
}

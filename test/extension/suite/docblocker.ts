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
  const generatedParam = /@param\s+(int|integer)\s+\$value/u.exec(document.getText());
  assert.ok(generatedParam);
  const nativeDocType = generatedParam[1]!;
  const changeParamType = async (from: string, to: string): Promise<void> => {
    const text = document.getText();
    const start = text.indexOf(from, text.indexOf('@param'));
    assert.ok(start >= 0);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(start), document.positionAt(start + from.length)), to);
    assert.ok(await vscode.workspace.applyEdit(edit));
    assert.ok(document.isDirty);
  };
  const paramConflicts = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(uri)
    .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.phpdoc.type-conflict');
  await changeParamType(nativeDocType, 'string');
  const conflictDeadline = Date.now() + 20_000;
  while (Date.now() < conflictDeadline && paramConflicts().length !== 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(paramConflicts().length, 1, 'SoPHP did not flag a proven native/PHPDoc scalar conflict in onDemand mode.');
  assert.strictEqual(document.getText(paramConflicts()[0]!.range), 'string');
  await changeParamType('string', nativeDocType);
  const restoredDeadline = Date.now() + 20_000;
  while (Date.now() < restoredDeadline && paramConflicts().length !== 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(paramConflicts(), [], 'SoPHP kept an old PHPDoc conflict after the unsaved correction.');
  console.log('C2 generated PHPDoc scalar conflict: 1 → 0, unsaved');
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
  const flowUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'DocblockerFlow.php');
  const flowSource = `<?php
namespace App\\Service;
class AlphaDocItem { public function itemAlpha(): void {} public function itemCommon(): void {} }
class BetaDocItem { public function itemBeta(): void {} public function itemCommon(): void {} }

function inspect(array $items): void { foreach ($items as $item) { $item->item; $item->itemAlpha(); } }
function consumeString(string $value): void {}
/** @param array{item: AlphaDocItem}|array{item: AlphaDocItem, other: int} $data */
function inspectSharedShape(array $data): void { $data['item']->item; $data['item']->itemAlpha(); consumeString($data['item']); }
/** @param array{item: AlphaDocItem}|array{other: int} $data */
function inspectMissingShape(array $data): void { $data['item']->item; $data['item']->itemAlpha(); consumeString($data['item']); }
`;
  await vscode.workspace.fs.writeFile(flowUri, Buffer.from(flowSource));
  const flowDocument = await vscode.workspace.openTextDocument(flowUri);
  const flowEditor = await vscode.window.showTextDocument(flowDocument);
  flowEditor.selection = new vscode.Selection(new vscode.Position(4, 0), new vscode.Position(4, 0));
  await vscode.commands.executeCommand('type', { text: '/**' });
  const flowItems = (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', flowUri, flowEditor.selection.active, '*', 100,
  ))?.items.filter((candidate) => candidate.label === '/**' && candidate.detail === 'PHP DocBlocker') ?? [];
  assert.strictEqual(flowItems.length, 1);
  const flowItem = flowItems[0]!;
  assert.ok(flowItem.insertText instanceof vscode.SnippetString);
  const flowRange = flowItem.range instanceof vscode.Range ? flowItem.range : flowItem.range?.replacing;
  assert.ok(flowRange);
  assert.ok(await flowEditor.insertSnippet(flowItem.insertText, flowRange));
  assert.match(flowDocument.getText(), /@param\s+array\s+\$items/u);
  const setDocumentedItem = async (itemType: string): Promise<void> => {
    const current = flowDocument.getText();
    const match = /@param\s+([^\s]+)\s+\$items/u.exec(current);
    assert.ok(match);
    const start = current.indexOf(match[1]!, match.index);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(flowUri, new vscode.Range(flowDocument.positionAt(start), flowDocument.positionAt(start + match[1]!.length)),
      `list<${itemType}>`);
    assert.ok(await vscode.workspace.applyEdit(edit));
    assert.ok(flowDocument.isDirty);
  };
  const itemCompletions = async (): Promise<string[]> => {
    const text = flowDocument.getText();
    const position = flowDocument.positionAt(text.indexOf('$item->item;') + '$item->item'.length);
    const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', flowUri, position);
    return result?.items.map((candidate) => String(candidate.label)) ?? [];
  };
  const waitForItem = async (expected: string, rejected: string): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const labels = await itemCompletions();
      if (labels.includes(expected) && !labels.includes(rejected)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`SoPHP did not use the current PHPDoc item type: expected ${expected}, rejected ${rejected}, actual ${JSON.stringify(await itemCompletions())}`);
  };
  const originalCallPosition = (): vscode.Position => {
    const text = flowDocument.getText();
    return flowDocument.positionAt(text.indexOf('$item->itemAlpha();') + '$item->item'.length);
  };
  const originalDefinitions = async (): Promise<vscode.Location[]> => await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', flowUri, originalCallPosition(),
  ) ?? [];
  const originalHoverText = async (): Promise<string> => (await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', flowUri, originalCallPosition(),
  ) ?? []).flatMap((hover) => hover.contents).map((part) => typeof part === 'string' ? part : part.value).join('\n');
  await setDocumentedItem('AlphaDocItem');
  await waitForItem('itemAlpha', 'itemBeta');
  assert.ok((await originalDefinitions()).some((location) => location.uri.toString() === flowUri.toString()
    && flowDocument.getText(location.range).includes('itemAlpha')),
  'SoPHP did not navigate from a generated PHPDoc refinement to the Alpha method.');
  assert.match(await originalHoverText(), /itemAlpha/u);
  await setDocumentedItem('BetaDocItem');
  await waitForItem('itemBeta', 'itemAlpha');
  assert.ok(!(await originalDefinitions()).some((location) => location.uri.toString() === flowUri.toString()
    && flowDocument.getText(location.range).includes('itemAlpha')),
  'SoPHP kept a stale Alpha definition after the PHPDoc item type changed.');
  assert.doesNotMatch(await originalHoverText(), /itemAlpha/u);
  const changedCallSource = flowDocument.getText();
  const originalCallStart = changedCallSource.indexOf('$item->itemAlpha();');
  assert.ok(originalCallStart >= 0);
  const changedCallStart = originalCallStart + '$item->'.length;
  const changedCallEdit = new vscode.WorkspaceEdit();
  changedCallEdit.replace(flowUri, new vscode.Range(flowDocument.positionAt(changedCallStart),
    flowDocument.positionAt(changedCallStart + 'itemAlpha'.length)), 'itemBeta');
  assert.ok(await vscode.workspace.applyEdit(changedCallEdit));
  const betaPosition = flowDocument.positionAt(flowDocument.getText().lastIndexOf('$item->itemBeta();') + '$item->item'.length);
  let betaDefinitions: vscode.Location[] = [];
  const betaDefinitionDeadline = Date.now() + 20_000;
  while (Date.now() < betaDefinitionDeadline) {
    betaDefinitions = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', flowUri, betaPosition) ?? [];
    if (betaDefinitions.some((location) => location.uri.toString() === flowUri.toString()
      && flowDocument.getText(location.range).includes('itemBeta'))) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(betaDefinitions.some((location) => location.uri.toString() === flowUri.toString()
    && flowDocument.getText(location.range).includes('itemBeta')),
  'SoPHP did not navigate to the new Beta method after the unsaved PHPDoc and call edits.');
  const betaHovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', flowUri, betaPosition) ?? [];
  assert.match(betaHovers.flatMap((hover) => hover.contents).map((part) => typeof part === 'string' ? part : part.value).join('\n'), /itemBeta/u);
  await setDocumentedItem('AlphaDocItem|BetaDocItem');
  const unionLabels = (await itemCompletions()).filter((label) => label.startsWith('item'));
  assert.deepStrictEqual(unionLabels, ['itemCommon'], 'A PHPDoc union exposed members absent from one alternative.');
  const unionBetaPosition = flowDocument.positionAt(flowDocument.getText().lastIndexOf('$item->itemBeta();') + '$item->item'.length);
  const unionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', flowUri, unionBetaPosition) ?? [];
  assert.ok(!unionDefinitions.some((location) => flowDocument.getText(location.range).includes('itemBeta')),
    'A PHPDoc union still navigated to a method absent from one alternative.');
  const shapeCompletions = async (functionName: string): Promise<string[]> => {
    const source = flowDocument.getText();
    const start = source.indexOf(`function ${functionName}`);
    assert.ok(start >= 0);
    const access = source.indexOf("$data['item']->item;", start);
    assert.ok(access >= 0);
    const position = flowDocument.positionAt(access + "$data['item']->item".length);
    const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', flowUri, position);
    return result?.items.filter((candidate) => candidate.kind === vscode.CompletionItemKind.Method)
      .map((candidate) => String(candidate.label)).filter((label) => label.startsWith('item')) ?? [];
  };
  assert.deepStrictEqual(await shapeCompletions('inspectSharedShape'), ['itemAlpha', 'itemCommon']);
  assert.deepStrictEqual(await shapeCompletions('inspectMissingShape'), []);
  const shapeCallPosition = (functionName: string): vscode.Position => {
    const source = flowDocument.getText();
    const start = source.indexOf(`function ${functionName}`);
    assert.ok(start >= 0);
    const call = source.indexOf("$data['item']->itemAlpha();", start);
    assert.ok(call >= 0);
    return flowDocument.positionAt(call + "$data['item']->item".length);
  };
  const sharedCallPosition = shapeCallPosition('inspectSharedShape');
  const sharedDefinitions = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', flowUri, sharedCallPosition) ?? [];
  assert.ok(sharedDefinitions.some((location) => flowDocument.getText(location.range).includes('itemAlpha')));
  const sharedHover = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', flowUri, sharedCallPosition) ?? [];
  assert.match(sharedHover.flatMap((hover) => hover.contents).map((part) => typeof part === 'string' ? part : part.value).join('\n'), /itemAlpha/u);
  const missingCallPosition = shapeCallPosition('inspectMissingShape');
  const missingDefinitions = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', flowUri, missingCallPosition) ?? [];
  assert.ok(!missingDefinitions.some((location) => flowDocument.getText(location.range).includes('itemAlpha')));
  const missingHover = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', flowUri, missingCallPosition) ?? [];
  assert.doesNotMatch(missingHover.flatMap((hover) => hover.contents).map((part) => typeof part === 'string' ? part : part.value).join('\n'), /itemAlpha/u);
  const argumentDiagnostics = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(flowUri)
    .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.argument.type-mismatch');
  const argumentDeadline = Date.now() + 20_000;
  while (Date.now() < argumentDeadline && argumentDiagnostics().length !== 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(argumentDiagnostics().length, 1, 'The shared shape key did not produce one proven argument mismatch.');
  assert.match(flowDocument.getText(argumentDiagnostics()[0]!.range), /\$data\['item'\]/u);
  console.log('C2 generated PHPDoc type flow: AlphaDocItem → BetaDocItem, completion/hover/definition updated');
  console.log('PHP DocBlocker 2.7.0 + SoPHP: one generator, typed param/return, no PHPDoc conflict.');
}

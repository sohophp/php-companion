import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'OrderingConsumer.php');
  const cases: Array<[string, string, string]> = [
    ['date', "<?php function run(): void { $formatter = new IntlDateFormatter('en_US', 0, 0); datefmt_parse($formatter, '1/1/70'); $formatter->getErrorC§; }", 'getErrorCode'],
    ['dom', '<?php function run(): void { $document = new DOMDocument(); $xpath = new DOMXPath($document); $document->createProcessingI§; }', 'createProcessingInstruction'],
    ['xml', '<?php class CustomXml extends SimpleXMLElement {} function run(string $source): void { $xml = simplexml_load_string($source, CustomXml::class); if ($xml === false) return; foreach ($xml as $child) { $child->getN§; } }', 'getName'],
    ['reference-control', '<?php class Item { public function itemOnly(): void {} } class Rebind { public function __construct($item) {} } function run(): void { $item = new Item(); new Rebind($item); $item->itemO§; }', 'itemOnly'],
    ['actual-reference', '<?php class Item { public function itemOnly(): void {} } class Rebind { public function __construct(&$item) {} } function run(): void { $item = new Item(); new Rebind($item); $item->itemO§; }', ''],
  ];
  const original = cases[0]![1].replace('§', ''); await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const [name, marked, expected] of [...cases, ...cases]) {
    const source = marked.replace('§', '');
    if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    let labels: string[] = []; const deadline = Date.now() + 20_000;
    do {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
        document.positionAt(marked.indexOf('§')));
      labels = completion?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
      if (expected ? labels.includes(expected) : !labels.includes('itemOnly')) break;
      await new Promise(done => setTimeout(done, 50));
    } while (Date.now() < deadline);
    assert.ok(expected ? labels.includes(expected) : !labels.includes('itemOnly'), JSON.stringify({ name, labels }));
    results.push({ name, expected, matched: true });
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Stubs flow completion host proof: ' + JSON.stringify({ platform: process.platform, results, diskUnchanged: true }));
}

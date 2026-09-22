import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const root = process.env.PHP_COMPANION_REFERENCE_PERF_WORKSPACE;
  const idleMs = Number(process.env.PHP_COMPANION_REFERENCE_PERF_IDLE_MS ?? '0');
  assert.ok(root && Number.isSafeInteger(idleMs) && idleMs >= 0 && idleMs <= 30_000);
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'Packaged PHP Companion extension is unavailable');
  await extension.activate();
  const uri = vscode.Uri.file(join(root, 'src', 'Security', 'AdminPasswordChangeGuard.php'));
  const indexing = vscode.workspace.getConfiguration('phpCompanion', uri);
  const mode = indexing.get<string>('indexing.mode', 'onDemand');
  const sourceOnly = indexing.get<boolean>('indexing.experimentalSourceOnlyReferences', false);
  const document = await vscode.workspace.openTextDocument(uri);
  assert.equal(document.languageId, 'php');
  const editor = await vscode.window.showTextDocument(document);
  const offset = document.getText().lastIndexOf('get(');
  assert.ok(offset >= 0, 'Winstar reference fixture changed');
  const position = document.positionAt(offset + 1);
  editor.selection = new vscode.Selection(position, position);
  const readyStarted = performance.now();
  let symbols: vscode.DocumentSymbol[] | undefined;
  while (performance.now() - readyStarted < 30_000) {
    symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', uri);
    if (symbols?.some((symbol) => symbol.name === 'AdminPasswordChangeGuard')) break;
    await new Promise<void>((done) => setTimeout(done, 100));
  }
  assert.ok(symbols?.some((symbol) => symbol.name === 'AdminPasswordChangeGuard'), 'PHP language server did not become ready');
  const readyMs = Math.round(performance.now() - readyStarted);
  if (idleMs) await new Promise<void>((done) => setTimeout(done, idleMs));
  const started = performance.now();
  const locations = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, position);
  const elapsedMs = Math.round(performance.now() - started);
  assert.equal(locations?.length, 175, 'Winstar References location count changed (including declaration)');
  const applicationContext = vscode.Uri.file(join(root, 'src', 'Bridge', 'ApplicationContextSubscriber.php')).toString();
  const lines = new Set(locations.filter((location) => location.uri.toString() === applicationContext)
    .map((location) => location.range.start.line + 1));
  assert.ok(lines.has(82) && lines.has(85), 'Inherited Request receiver references are missing');
  const normalized = locations.map((location) => ({ uri: location.uri.toString(), range: {
    start: { line: location.range.start.line, character: location.range.start.character },
    end: { line: location.range.end.line, character: location.range.end.character },
  } })).sort((left, right) => left.uri.localeCompare(right.uri) || left.range.start.line - right.range.start.line
    || left.range.start.character - right.range.start.character);
  const locationSha256 = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  assert.equal(locationSha256, '49e43a49ed90a8bd1561f56e96475d9b77a2163beb90276af671bffe80eb448c',
    'Winstar References locations changed');
  console.log(`PHP_COMPANION_REFERENCE_PERF ${JSON.stringify({ mode, sourceOnly, readyMs, elapsedMs, idleMs, locations: locations.length, locationSha256 })}`);
}

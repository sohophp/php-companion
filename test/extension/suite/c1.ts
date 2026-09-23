import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { measureRapidReceiverSuggestion, measureRealVendorSuggestion, measureUnsavedReceiverSuggestion, measureVisibleSuggestion } from './c1Ui.js';

async function waitForResult<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean, message: string): Promise<T> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (ready(result)) return result;
    } catch { /* The language server may still be starting. */ }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(message);
}

async function warmLatency<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean, name: string): Promise<{ median: number; max: number }> {
  const samples: number[] = [];
  for (let index = 0; index < 12; index += 1) {
    const started = performance.now();
    const result = await read();
    samples.push(performance.now() - started);
    assert.ok(ready(result), `SoPHP ${name} returned an unexpected warm result.`);
  }
  samples.sort((left, right) => left - right);
  return { median: Math.round((samples[5]! + samples[6]!) / 2), max: Math.round(samples[11]!) };
}

async function verifyRealComposerVendor(requestLanguageServer: <T>(method: string, params: unknown) => Promise<T>): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.find((folder) => folder.name === 'real-vendor');
  assert.ok(root, 'The locked real Composer vendor project was not opened.');
  const lock = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root.uri, 'composer.lock'))).toString('utf8')) as {
    packages?: unknown[];
  };
  assert.strictEqual(lock.packages?.length, 30, 'The real Composer fixture did not contain its 30 locked packages.');
  const source = `<?php namespace App\\C1;
use Psr\\Http\\Message\\ResponseInterface;
use Monolog\\Logger;
function inspect(ResponseInterface $value): void { $value->getStatusCode(); $value->getSta; }`;
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'C1', 'RealVendorConsumer.php');
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root.uri, 'src', 'C1'));
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const interfaceUri = vscode.Uri.joinPath(root.uri, 'vendor', 'psr', 'http-message', 'src', 'ResponseInterface.php');
  const implementationUri = vscode.Uri.joinPath(root.uri, 'vendor', 'guzzlehttp', 'psr7', 'src', 'Response.php');
  const loggerUri = vscode.Uri.joinPath(root.uri, 'vendor', 'monolog', 'monolog', 'src', 'Monolog', 'Logger.php');
  const call = document.positionAt(source.indexOf('$value->getStatusCode()') + '$value->'.length + 2);
  const partial = document.positionAt(source.indexOf('$value->getSta;') + '$value->getSta'.length);
  const completion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, partial),
    (result) => result?.items.some((item) => item.label === 'getStatusCode' && item.kind === vscode.CompletionItemKind.Method) === true,
    'SoPHP did not complete the installed PSR ResponseInterface method.');
  assert.ok(!completion.items.some((item) => item.label === 'getName' && item.kind === vscode.CompletionItemKind.Method));
  const hover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, call),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('getStatusCode'))) === true,
    'SoPHP did not show Hover for the installed PSR ResponseInterface method.');
  assert.ok(hover.length > 0);
  const signature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', uri,
      document.positionAt(source.indexOf('$value->getStatusCode()') + '$value->getStatusCode('.length)),
    (result) => result?.signatures.some((item) => item.label.includes('getStatusCode()')) === true,
    'SoPHP did not show Signature Help for the installed PSR ResponseInterface method.');
  assert.ok(signature.signatures.length > 0);
  const definition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === interfaceUri.toString()) === true,
    'SoPHP did not navigate to the installed PSR ResponseInterface declaration.');
  assert.ok(definition.every((item) => item.uri.toString() === interfaceUri.toString()));
  await requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const implementationStarted = performance.now();
  const implementationRequestsMs: number[] = [];
  const implementation = await waitForResult(
    async () => {
      const requestStarted = performance.now();
      const result = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, call);
      implementationRequestsMs.push(Math.round(performance.now() - requestStarted));
      return result;
    },
    (result) => result?.some((item) => item.uri.toString() === implementationUri.toString()) === true,
    'SoPHP did not find the installed Guzzle Response implementation.');
  assert.ok(implementation.every((item) => item.uri.toString() !== loggerUri.toString()));
  const implementationMs = Math.round(performance.now() - implementationStarted);
  const implementationTimings = await requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
  const implementationServerMs = Math.round(implementationTimings.implementation?.at(-1) ?? Number.NaN);
  const implementationScanMs = Math.round(implementationTimings.implementationScan?.at(-1) ?? Number.NaN);
  assert.ok(Number.isFinite(implementationServerMs) && Number.isFinite(implementationScanMs),
    'SoPHP did not record the first Implementation handler and candidate scan durations.');
  const warmImplementation = await warmLatency(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === implementationUri.toString()) === true,
    'Real vendor Implementation');
  const references = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === uri.toString()) === true,
    'SoPHP did not find the project call to the installed PSR interface.');
  assert.ok(references.every((item) => item.uri.toString() !== loggerUri.toString()));

  const change = new vscode.WorkspaceEdit();
  for (const [before, after] of [['ResponseInterface $value', 'Logger $value'],
    ['$value->getStatusCode()', '$value->getName()'], ['$value->getSta;', '$value->getN;']] as const) {
    const start = source.indexOf(before);
    change.replace(uri, new vscode.Range(document.positionAt(start), document.positionAt(start + before.length)), after);
  }
  assert.ok(await vscode.workspace.applyEdit(change), 'Could not change the real Composer consumer without saving.');
  const changed = document.getText();
  assert.ok(document.isDirty && changed.includes('Logger $value') && changed.includes('$value->getN;'));
  const changedCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
      document.positionAt(changed.indexOf('$value->getN;') + '$value->getN'.length)),
    (result) => result?.items.some((item) => item.label === 'getName' && item.kind === vscode.CompletionItemKind.Method) === true,
    'SoPHP did not complete the unsaved Monolog Logger receiver.');
  assert.ok(!changedCompletion.items.some((item) => item.label === 'getStatusCode' && item.kind === vscode.CompletionItemKind.Method));
  const changedDefinition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', uri,
      document.positionAt(changed.indexOf('$value->getName()') + '$value->'.length + 2)),
    (result) => result?.some((item) => item.uri.toString() === loggerUri.toString()) === true,
    'SoPHP kept the PSR method after an unsaved switch to Monolog Logger.');
  assert.ok(changedDefinition.every((item) => item.uri.toString() === loggerUri.toString()));
  const restore = new vscode.WorkspaceEdit();
  for (const [before, after] of [['Logger $value', 'ResponseInterface $value'],
    ['$value->getName()', '$value->getStatusCode()'], ['$value->getN;', '$value->getSta;']] as const) {
    const start = changed.indexOf(before);
    restore.replace(uri, new vscode.Range(document.positionAt(start), document.positionAt(start + before.length)), after);
  }
  assert.ok(await vscode.workspace.applyEdit(restore), 'Could not restore the real Composer receiver without saving.');
  const restored = document.getText();
  const restoredCall = document.positionAt(restored.indexOf('$value->getStatusCode()') + '$value->'.length + 2);
  const restoredStarted = performance.now();
  const restoredImplementation = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, restoredCall),
    (result) => result?.some((item) => item.uri.toString() === implementationUri.toString()) === true,
    'SoPHP did not restore the Guzzle implementation after an unsaved receiver round trip.');
  assert.ok(restoredImplementation.every((item) => item.uri.toString() !== loggerUri.toString()));
  const restoredImplementationMs = Math.round(performance.now() - restoredStarted);
  console.log(`C1 real Composer vendor: ${JSON.stringify({
    lockedPackages: lock.packages?.length, noiseFiles: Number(process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE ?? 0),
    completion: 'getStatusCode', implementation: implementation.map((item) => item.uri.toString()), implementationMs,
    implementationRequestsMs, implementationServerMs, implementationScanMs,
    candidateEpochRetries: implementationTimings.candidateEpochRetry?.length ?? 0,
    candidateInvalidatedOpen: implementationTimings.candidateInvalidatedOpen?.length ?? 0,
    warmImplementation, restoredImplementationMs,
    unsavedCompletion: 'getName', references: references.length,
  })}`);
}

export async function run(): Promise<void> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'C1 Extension Host test has no workspace.');
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load in the isolated Extension Host.');
  await extension.activate();
  const timingApi = extension.exports as { requestLanguageServer?: <T>(method: string, params: unknown) => Promise<T> };
  assert.ok(timingApi.requestLanguageServer, 'SoPHP Core did not expose the test timing request bridge.');
  const targetPhpVersion = process.env.PHP_COMPANION_TEST_C1_PHP_VERSION;
  const runtimeVersion = process.env.PHP_COMPANION_TEST_C1_RUNTIME_VERSION;
  const runtimeDiscover = process.env.PHP_COMPANION_TEST_C1_RUNTIME_DISCOVER === '1';
  const c1DebugPort = process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT;
  if (targetPhpVersion) assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', workspace.uri).get('phpVersion'), targetPhpVersion);
  assert.strictEqual(vscode.workspace.getConfiguration('php').get('suggest.basic'), false,
    'VS Code built-in PHP suggestions must stay disabled while SoPHP owns PHP completion, Hover and Signature Help.');
  const folder = vscode.Uri.joinPath(workspace.uri, 'src', 'C1');
  await vscode.workspace.fs.createDirectory(folder);
  const contractSource = '<?php namespace App\\C1; interface C1Contract { public function renderC1(int $count): string; }';
  const printerSource = '<?php namespace App\\C1; final class C1Printer implements C1Contract { public function renderC1(int $count): string { return (string) $count; } }';
  const otherSource = '<?php namespace App\\C1; final class C1Other { public function renderC1(): void {} }';
  const consumerSource = '<?php namespace App\\C1; function run(C1Contract $value): void { $value->renderC1(2); $value->renderC; }';
  const contractUri = vscode.Uri.joinPath(folder, 'C1Contract.php');
  const printerUri = vscode.Uri.joinPath(folder, 'C1Printer.php');
  const otherUri = vscode.Uri.joinPath(folder, 'C1Other.php');
  const consumerUri = vscode.Uri.joinPath(folder, 'C1Consumer.php');
  for (const [uri, source] of [[contractUri, contractSource], [printerUri, printerSource], [otherUri, otherSource], [consumerUri, consumerSource]] as const) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  }
  const document = await vscode.workspace.openTextDocument(consumerUri);
  await vscode.window.showTextDocument(document);
  const callOffset = consumerSource.indexOf('$value->renderC1(2)') + '$value->'.length;
  const completionOffset = consumerSource.indexOf('$value->renderC;') + '$value->renderC'.length;
  const started = Date.now();
  const completion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', consumerUri,
      document.positionAt(completionOffset), '>'),
    (result) => result?.items.some((item) => item.label === 'renderC1') === true,
    'SoPHP did not complete the Composer member in VS Code.',
  );
  assert.strictEqual(completion.items.filter((item) => item.label === 'renderC1').length, 1);
  const completionMs = Date.now() - started;
  const callPosition = document.positionAt(callOffset + 1);
  const hover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', consumerUri, callPosition),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('renderC1'))) === true,
    'SoPHP did not show the member Hover in VS Code.',
  );
  assert.ok(hover.length > 0);
  const signature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', consumerUri,
      document.positionAt(consumerSource.indexOf('$value->renderC1(2)') + '$value->renderC1('.length)),
    (result) => result?.signatures.some((item) => item.label.includes('renderC1(int $count): string')) === true,
    'SoPHP did not show the member signature in VS Code.',
  );
  assert.ok(signature.signatures.length > 0);
  const definition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri, callPosition),
    (result) => result?.some((item) => item.uri.toString() === contractUri.toString()) === true,
    'SoPHP did not navigate to the Composer interface method in VS Code.',
  );
  assert.deepStrictEqual(definition.map((item) => item.uri.toString()), [contractUri.toString()]);
  const implementation = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', consumerUri, callPosition),
    (result) => result?.some((item) => item.uri.toString() === printerUri.toString()) === true,
    'SoPHP did not navigate to the implementing method in VS Code.',
  );
  assert.deepStrictEqual(implementation.map((item) => item.uri.toString()), [printerUri.toString()]);
  const references = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', consumerUri, callPosition),
    (result) => result?.some((item) => item.uri.toString() === consumerUri.toString()) === true,
    'SoPHP did not return the member call reference in VS Code.',
  );
  assert.ok(references.every((item) => item.uri.toString() !== otherUri.toString()));
  await timingApi.requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const warm = {
    completion: await warmLatency(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', consumerUri,
        document.positionAt(completionOffset), '>'),
      (result) => result?.items.some((item) => item.label === 'renderC1') === true, 'Completion'),
    hover: await warmLatency(
      () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', consumerUri, callPosition),
      (result) => result?.length > 0, 'Hover'),
    signature: await warmLatency(
      () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', consumerUri,
        document.positionAt(consumerSource.indexOf('$value->renderC1(2)') + '$value->renderC1('.length)),
      (result) => result?.signatures.some((item) => item.label.includes('renderC1(int $count): string')) === true, 'Signature Help'),
    definition: await warmLatency(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri, callPosition),
      (result) => result?.some((item) => item.uri.toString() === contractUri.toString()) === true, 'Definition'),
    implementation: await warmLatency(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', consumerUri, callPosition),
      (result) => result?.some((item) => item.uri.toString() === printerUri.toString()) === true, 'Implementation'),
    references: await warmLatency(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', consumerUri, callPosition),
      (result) => result?.some((item) => item.uri.toString() === consumerUri.toString()) === true, 'References'),
  };
  const serverTimings = await timingApi.requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
  const languageClientRoundTrip = await warmLatency(
    () => timingApi.requestLanguageServer!<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: false }),
    (result) => result !== undefined, 'Language Client round trip');
  const builtinSource = '<?php namespace App\\C1; function builtins(): void { ab }';
  const builtinUri = vscode.Uri.joinPath(folder, 'BuiltinCompletion.php');
  await vscode.workspace.fs.writeFile(builtinUri, Buffer.from(builtinSource));
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(builtinUri));
  const builtinCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', builtinUri,
      new vscode.Position(0, builtinSource.indexOf('ab }') + 2)),
    (result) => result?.items.some((item) => item.label === 'abs') === true,
    'SoPHP did not complete the built-in abs function.',
  );
  assert.strictEqual(builtinCompletion.items.filter((item) => item.label === 'abs').length, 1,
    'PHP built-in completion was returned by more than one provider.');
  const edit = new vscode.WorkspaceEdit();
  const receiverOffset = consumerSource.indexOf('C1Contract $value');
  edit.replace(consumerUri, new vscode.Range(document.positionAt(receiverOffset),
    document.positionAt(receiverOffset + 'C1Contract'.length)), 'C1Other');
  assert.ok(await vscode.workspace.applyEdit(edit), 'Could not apply the unsaved receiver edit.');
  assert.ok(document.isDirty, 'The receiver edit unexpectedly saved the document.');
  const changedDefinition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri,
      document.positionAt(document.getText().indexOf('$value->renderC1(2)') + '$value->'.length + 1)),
    (result) => result?.some((item) => item.uri.toString() === otherUri.toString()) === true,
    'SoPHP kept the old member declaration after an unsaved edit.',
  );
  assert.deepStrictEqual(changedDefinition.map((item) => item.uri.toString()), [otherUri.toString()]);
  const changedSource = document.getText();
  const changedCallOffset = changedSource.indexOf('$value->renderC1(2)') + '$value->'.length;
  const changedCallPosition = document.positionAt(changedCallOffset + 1);
  const changedCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', consumerUri,
      document.positionAt(changedSource.indexOf('$value->renderC;') + '$value->renderC'.length), '>'),
    (result) => result?.items.some((item) => item.label === 'renderC1' && item.detail?.includes('C1Other::renderC1(): void')) === true,
    'SoPHP completion kept the old receiver after an unsaved edit.',
  );
  assert.strictEqual(changedCompletion.items.filter((item) => item.label === 'renderC1').length, 1);
  const changedHover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', consumerUri, changedCallPosition),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('renderC1(): void'))) === true,
    'SoPHP Hover kept the old method signature after an unsaved edit.',
  );
  assert.ok(changedHover.length > 0);
  const changedSignature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', consumerUri,
      document.positionAt(changedSource.indexOf('$value->renderC1(2)') + '$value->renderC1('.length)),
    (result) => result?.signatures.some((item) => item.label.includes('renderC1(): void')) === true,
    'SoPHP Signature Help kept the old method parameters after an unsaved edit.',
  );
  assert.deepStrictEqual(changedSignature.signatures.map((item) => item.label), ['renderC1(): void']);
  const changedReferences = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', consumerUri, changedCallPosition),
    (result) => result?.some((item) => item.uri.toString() === consumerUri.toString()
      && item.range.start.isEqual(document.positionAt(changedCallOffset))) === true,
    'SoPHP References did not follow the new receiver after an unsaved edit.',
  );
  assert.ok(changedReferences.every((item) => ![contractUri.toString(), printerUri.toString()].includes(item.uri.toString())));
  const changedImplementations = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', consumerUri,
    changedCallPosition);
  assert.deepStrictEqual(changedImplementations, [], 'SoPHP kept the old interface implementation after an unsaved edit.');
  const vendorFolder = vscode.Uri.joinPath(workspace.uri, 'vendor', 'acme', 'c1-library', 'src');
  const vendorComposerFolder = vscode.Uri.joinPath(workspace.uri, 'vendor', 'composer');
  await vscode.workspace.fs.createDirectory(vendorFolder);
  await vscode.workspace.fs.createDirectory(vendorComposerFolder);
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspace.uri, 'composer.lock'), Buffer.from(JSON.stringify({
    packages: [{ name: 'acme/c1-library', autoload: { 'psr-4': { 'Acme\\C1\\': 'src/' } } }],
  })));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vendorComposerFolder, 'installed.json'), Buffer.from(JSON.stringify({
    packages: [{ name: 'acme/c1-library', install_path: '../acme/c1-library' }],
  })));
  const vendorSource = '<?php namespace Acme\\C1; interface VendorContract { public function renderVendor(int $count): string; }';
  const vendorUri = vscode.Uri.joinPath(vendorFolder, 'VendorContract.php');
  const vendorPrinterSource = '<?php namespace App\\C1; use Acme\\C1\\VendorContract; final class VendorPrinter implements VendorContract { public function renderVendor(int $count): string { return (string) $count; } }';
  const vendorPrinterUri = vscode.Uri.joinPath(folder, 'VendorPrinter.php');
  const namesakeSource = '<?php namespace App\\C1; final class VendorNamesake { public function renderVendor(): void {} }';
  const namesakeUri = vscode.Uri.joinPath(folder, 'VendorNamesake.php');
  const vendorConsumerSource = '<?php namespace App\\C1; use Acme\\C1\\VendorContract; function useVendor(VendorContract $value, VendorNamesake $other): void { $value->renderVendor(2); $other->renderVendor(); $value->renderVen; }';
  const vendorConsumerUri = vscode.Uri.joinPath(folder, 'VendorConsumer.php');
  for (const [uri, source] of [[vendorUri, vendorSource], [vendorPrinterUri, vendorPrinterSource],
    [namesakeUri, namesakeSource], [vendorConsumerUri, vendorConsumerSource]] as const) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  }
  const vendorDocument = await vscode.workspace.openTextDocument(vendorConsumerUri);
  await vscode.window.showTextDocument(vendorDocument);
  const vendorCallOffset = vendorConsumerSource.indexOf('$value->renderVendor(2)') + '$value->'.length;
  const vendorCallPosition = vendorDocument.positionAt(vendorCallOffset + 1);
  const vendorCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', vendorConsumerUri,
      vendorDocument.positionAt(vendorConsumerSource.indexOf('$value->renderVen;') + '$value->renderVen'.length), '>'),
    (result) => result?.items.some((item) => item.label === 'renderVendor' && item.detail?.includes('VendorContract::renderVendor(int $count): string')) === true,
    'SoPHP did not complete a method declared by a Composer vendor package.',
  );
  assert.strictEqual(vendorCompletion.items.filter((item) => item.label === 'renderVendor').length, 1);
  const vendorHover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', vendorConsumerUri, vendorCallPosition),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('renderVendor(int $count): string'))) === true,
    'SoPHP did not show the vendor method Hover.',
  );
  assert.ok(vendorHover.length > 0);
  const vendorSignature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', vendorConsumerUri,
      vendorDocument.positionAt(vendorConsumerSource.indexOf('$value->renderVendor(2)') + '$value->renderVendor('.length)),
    (result) => result?.signatures.some((item) => item.label.includes('renderVendor(int $count): string')) === true,
    'SoPHP did not show the vendor method signature.',
  );
  assert.ok(vendorSignature.signatures.length > 0);
  const vendorDefinition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', vendorConsumerUri, vendorCallPosition),
    (result) => result?.some((item) => item.uri.toString() === vendorUri.toString()) === true,
    'SoPHP did not navigate to the Composer vendor declaration.',
  );
  assert.deepStrictEqual(vendorDefinition.map((item) => item.uri.toString()), [vendorUri.toString()]);
  const vendorImplementation = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', vendorConsumerUri, vendorCallPosition),
    (result) => result?.some((item) => item.uri.toString() === vendorPrinterUri.toString()) === true,
    'SoPHP did not navigate from the vendor interface to its project implementation.',
  );
  assert.deepStrictEqual(vendorImplementation.map((item) => item.uri.toString()), [vendorPrinterUri.toString()]);
  const vendorReferences = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', vendorConsumerUri, vendorCallPosition),
    (result) => result?.some((item) => item.uri.toString() === vendorConsumerUri.toString()
      && item.range.start.isEqual(vendorDocument.positionAt(vendorCallOffset))) === true,
    'SoPHP did not return the vendor method call reference.',
  );
  assert.ok(vendorReferences.every((item) => item.uri.toString() !== namesakeUri.toString()
    && !(item.uri.toString() === vendorConsumerUri.toString()
      && item.range.start.isEqual(vendorDocument.positionAt(vendorConsumerSource.indexOf('$other->renderVendor()') + '$other->'.length)))));
  const secondWorkspace = vscode.workspace.workspaceFolders?.[1];
  assert.ok(secondWorkspace, 'C1 Extension Host test has no second Composer workspace root.');
  const secondFolder = vscode.Uri.joinPath(secondWorkspace.uri, 'src', 'C1');
  await vscode.workspace.fs.createDirectory(secondFolder);
  const secondContractSource = '<?php namespace App\\C1; interface C1Contract { public function renderC1(string $label): void; }';
  const secondPrinterSource = '<?php namespace App\\C1; final class C1Printer implements C1Contract { public function renderC1(string $label): void {} }';
  const secondConsumerSource = '<?php namespace App\\C1; function run(C1Contract $value): void { $value->renderC1("x"); $value->renderC; }';
  const secondContractUri = vscode.Uri.joinPath(secondFolder, 'C1Contract.php');
  const secondPrinterUri = vscode.Uri.joinPath(secondFolder, 'C1Printer.php');
  const secondConsumerUri = vscode.Uri.joinPath(secondFolder, 'C1Consumer.php');
  for (const [uri, source] of [[secondContractUri, secondContractSource], [secondPrinterUri, secondPrinterSource],
    [secondConsumerUri, secondConsumerSource]] as const) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  }
  const secondDocument = await vscode.workspace.openTextDocument(secondConsumerUri);
  await vscode.window.showTextDocument(secondDocument);
  const secondCallOffset = secondConsumerSource.indexOf('$value->renderC1("x")') + '$value->'.length;
  const secondCallPosition = secondDocument.positionAt(secondCallOffset + 1);
  const secondCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', secondConsumerUri,
      secondDocument.positionAt(secondConsumerSource.indexOf('$value->renderC;') + '$value->renderC'.length), '>'),
    (result) => result?.items.some((item) => item.label === 'renderC1'
      && item.detail?.includes('C1Contract::renderC1(string $label): void')) === true,
    'SoPHP mixed the first Composer root into second-root completion.',
  );
  assert.strictEqual(secondCompletion.items.filter((item) => item.label === 'renderC1').length, 1);
  const secondHover = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', secondConsumerUri, secondCallPosition),
    (result) => result?.some((item) => item.contents.some((part) =>
      (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes('renderC1(string $label): void'))) === true,
    'SoPHP mixed the first Composer root into second-root Hover.',
  );
  assert.ok(secondHover.length > 0);
  const secondSignature = await waitForResult(
    () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', secondConsumerUri,
      secondDocument.positionAt(secondConsumerSource.indexOf('$value->renderC1("x")') + '$value->renderC1('.length)),
    (result) => result?.signatures.some((item) => item.label === 'renderC1(string $label): void') === true,
    'SoPHP mixed the first Composer root into second-root Signature Help.',
  );
  assert.deepStrictEqual(secondSignature.signatures.map((item) => item.label), ['renderC1(string $label): void']);
  const secondDefinition = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', secondConsumerUri, secondCallPosition),
    (result) => result?.some((item) => item.uri.toString() === secondContractUri.toString()) === true,
    'SoPHP navigated to the wrong Composer root.',
  );
  assert.deepStrictEqual(secondDefinition.map((item) => item.uri.toString()), [secondContractUri.toString()]);
  const secondImplementation = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', secondConsumerUri, secondCallPosition),
    (result) => result?.some((item) => item.uri.toString() === secondPrinterUri.toString()) === true,
    'SoPHP found an implementation from the wrong Composer root.',
  );
  assert.deepStrictEqual(secondImplementation.map((item) => item.uri.toString()), [secondPrinterUri.toString()]);
  const secondReferences = await waitForResult(
    () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', secondConsumerUri, secondCallPosition),
    (result) => result?.some((item) => item.uri.toString() === secondConsumerUri.toString()
      && item.range.start.isEqual(secondDocument.positionAt(secondCallOffset))) === true,
    'SoPHP did not find the second-root call reference.',
  );
  assert.ok(secondReferences.every((item) => item.uri.toString().startsWith(`${secondWorkspace.uri.toString()}/`)),
    `SoPHP mixed references from the first Composer root: ${JSON.stringify(secondReferences.map((item) => ({
      uri: item.uri.toString(), line: item.range.start.line, character: item.range.start.character,
    })))}`);
  {
    const firstTargetPhpVersion = targetPhpVersion ?? '7.2';
    const versionUri = vscode.Uri.joinPath(folder, 'Versioned.php');
    const versionSource = `<?php namespace App\\C1;
enum C1State { case Ready; }
function choose(int $value): int { return match ($value) { 1 => 1, default => 0 }; }
function consume(): void { (void) choose(1); }`;
    await vscode.workspace.fs.writeFile(versionUri, Buffer.from(versionSource));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(versionUri));
    const expected = firstTargetPhpVersion === '7.2' ? ['match expression', 'enum', '(void) cast']
      : firstTargetPhpVersion === '8.1' ? ['(void) cast'] : [];
    const diagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(versionUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && expected.every((feature) => result.some((item) => item.code === 'php.version.unsupported' && item.message.includes(feature))),
      `SoPHP did not publish the PHP ${firstTargetPhpVersion} diagnostic set in VS Code.`,
    );
    const versionMessages = diagnostics.filter((item) => item.code === 'php.version.unsupported').map((item) => item.message);
    for (const feature of expected) assert.ok(versionMessages.some((message) => message.includes(feature)),
      `PHP ${firstTargetPhpVersion} did not report unsupported ${feature}.`);
    assert.strictEqual(versionMessages.length, expected.length, `PHP ${firstTargetPhpVersion} returned unexpected version diagnostics.`);
    assert.ok(!diagnostics.some((item) => item.code === 'php.syntax'), `PHP ${firstTargetPhpVersion} reported a parser error for the version fixture.`);
    const secondTargetPhpVersion = targetPhpVersion ? targetPhpVersion === '7.2' ? '8.5' : '7.2' : '8.5';
    assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', secondWorkspace.uri).get('phpVersion'), targetPhpVersion ? secondTargetPhpVersion : 'auto');
    const secondVersionUri = vscode.Uri.joinPath(secondFolder, 'Versioned.php');
    await vscode.workspace.fs.writeFile(secondVersionUri, Buffer.from(versionSource));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(secondVersionUri));
    const secondExpected = secondTargetPhpVersion === '7.2' ? ['match expression', 'enum', '(void) cast'] : [];
    const secondDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(secondVersionUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && secondExpected.every((feature) => result.some((item) => item.code === 'php.version.unsupported' && item.message.includes(feature))),
      `SoPHP did not publish the PHP ${secondTargetPhpVersion} diagnostic set in the second Composer root.`,
    );
    assert.strictEqual(secondDiagnostics.filter((item) => item.code === 'php.version.unsupported').length, secondExpected.length,
      'SoPHP mixed PHP version diagnostics between Composer roots.');
    assert.ok(!secondDiagnostics.some((item) => item.code === 'php.syntax'),
      `PHP ${secondTargetPhpVersion} reported a parser error for the second-root version fixture.`);
    if (!targetPhpVersion) {
      const autoBuiltinSource = '<?php namespace App\\C1; class AutoBuiltinProbe {} function probe(): void { str_con }';
      for (const [targetFolder, expectedAvailable] of [[folder, false], [secondFolder, true]] as const) {
        const autoBuiltinUri = vscode.Uri.joinPath(targetFolder, 'AutoBuiltin.php');
        await vscode.workspace.fs.writeFile(autoBuiltinUri, Buffer.from(autoBuiltinSource));
        const autoBuiltinDocument = await vscode.workspace.openTextDocument(autoBuiltinUri);
        await vscode.window.showTextDocument(autoBuiltinDocument);
        await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(autoBuiltinUri)),
          (result) => result.some((item) => item.code === 'php.type.filename'),
          'SoPHP did not process the auto-version builtin fixture.');
        const autoBuiltinCompletion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
          autoBuiltinUri, autoBuiltinDocument.positionAt(autoBuiltinSource.indexOf('str_con') + 'str_con'.length));
        assert.strictEqual(autoBuiltinCompletion.items.some((item) => item.label === 'str_contains'), expectedAvailable,
          'SoPHP used the wrong Composer auto version for built-in completion.');
      }
      const sortSource = '<?php namespace App\\C1; function sorted(array $items): void { sort($items); }';
      const sortDefinitions: vscode.Location[] = [];
      for (const targetFolder of [folder, secondFolder]) {
        const sortUri = vscode.Uri.joinPath(targetFolder, 'SortBuiltin.php');
        await vscode.workspace.fs.writeFile(sortUri, Buffer.from(sortSource));
        const sortDocument = await vscode.workspace.openTextDocument(sortUri);
        await vscode.window.showTextDocument(sortDocument);
        const result = await waitForResult(
          () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', sortUri,
            sortDocument.positionAt(sortSource.indexOf('sort($items)') + 2)),
          (locations) => locations?.some((location) => location.uri.scheme === 'php-companion-builtin') === true,
          'SoPHP did not navigate to the PHP sort built-in declaration.');
        sortDefinitions.push(result.find((location) => location.uri.scheme === 'php-companion-builtin')!);
      }
      assert.notStrictEqual(sortDefinitions[0]!.uri.toString(), sortDefinitions[1]!.uri.toString(),
        'PHP 7.2 and 8.5 built-in declarations shared one virtual document URI.');
      const sort72 = await vscode.workspace.openTextDocument(sortDefinitions[0]!.uri);
      const sort85 = await vscode.workspace.openTextDocument(sortDefinitions[1]!.uri);
      assert.ok(sort72.getText().includes('function sort(array &$array, int $flags = 0): bool'),
        `PHP 7.2 navigation displayed the wrong built-in signature: ${sortDefinitions[0]!.uri.toString()} ${sort72.getText().match(/function sort\([^\n]*/u)?.[0] ?? sort72.getText().slice(0, 80)}`);
      assert.ok(sort85.getText().includes('function sort(array &$array, int $flags = 0): true'),
        `PHP 8.5 navigation displayed the wrong built-in signature: ${sortDefinitions[1]!.uri.toString()} ${sort85.getText().match(/function sort\([^\n]*/u)?.[0] ?? sort85.getText().slice(0, 80)}`);
      const parentServiceSource = '<?php namespace App\\C1; class NestedService { public function parentOnly(): void {} }';
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'NestedService.php'), Buffer.from(parentServiceSource));
      const nestedRoot = vscode.Uri.joinPath(workspace.uri, 'apps', 'api');
      const nestedFolder = vscode.Uri.joinPath(nestedRoot, 'src', 'C1');
      await vscode.workspace.fs.createDirectory(nestedFolder);
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(nestedRoot, 'composer.json'), Buffer.from(JSON.stringify({
        config: { platform: { php: '8.5.0' } }, autoload: { 'psr-4': { 'App\\': 'src/' } },
      })));
      const nestedServiceSource = '<?php namespace App\\C1; class NestedService { public function nestedOnly(): void {} }';
      const nestedServiceUri = vscode.Uri.joinPath(nestedFolder, 'NestedService.php');
      const nestedConsumerSource = '<?php namespace App\\C1; function nestedRun(NestedService $service): void { $service->nestedOnly(); $service->nested; }';
      const nestedConsumerUri = vscode.Uri.joinPath(nestedFolder, 'Consumer.php');
      await vscode.workspace.fs.writeFile(nestedServiceUri, Buffer.from(nestedServiceSource));
      await vscode.workspace.fs.writeFile(nestedConsumerUri, Buffer.from(nestedConsumerSource));
      const nestedDocument = await vscode.workspace.openTextDocument(nestedConsumerUri);
      await vscode.window.showTextDocument(nestedDocument);
      const nestedCompletion = await waitForResult(
        () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', nestedConsumerUri,
          nestedDocument.positionAt(nestedConsumerSource.indexOf('$service->nested;') + '$service->nested'.length), '>'),
        (result) => result?.items.some((item) => item.label === 'nestedOnly') === true,
        'SoPHP did not discover the nested Composer project in onDemand mode.',
      );
      assert.ok(!nestedCompletion.items.some((item) => item.label === 'parentOnly'));
      const nestedDefinition = await waitForResult(
        () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', nestedConsumerUri,
          nestedDocument.positionAt(nestedConsumerSource.indexOf('$service->nestedOnly()') + '$service->'.length + 1)),
        (result) => result?.some((item) => item.uri.toString() === nestedServiceUri.toString()) === true,
        'SoPHP navigated from the nested project into its parent project.',
      );
      assert.deepStrictEqual(nestedDefinition.map((item) => item.uri.toString()), [nestedServiceUri.toString()]);
      const nestedCallOffset = nestedConsumerSource.indexOf('$service->nestedOnly()') + '$service->'.length;
      const nestedReferences = await waitForResult(
        () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', nestedConsumerUri,
          nestedDocument.positionAt(nestedCallOffset + 1)),
        (result) => result?.some((item) => item.uri.toString() === nestedConsumerUri.toString()
          && item.range.start.isEqual(nestedDocument.positionAt(nestedCallOffset))) === true,
        'SoPHP did not find the nested project call reference.',
      );
      assert.ok(nestedReferences.every((item) => item.uri.toString().startsWith(`${nestedRoot.toString()}/`)),
        'SoPHP mixed parent references into the nested Composer project.');
      const nestedVersionUri = vscode.Uri.joinPath(nestedFolder, 'Versioned.php');
      await vscode.workspace.fs.writeFile(nestedVersionUri, Buffer.from(versionSource));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(nestedVersionUri));
      const nestedDiagnostics = await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(nestedVersionUri)),
        (result) => result.some((item) => item.code === 'php.type.filename')
          && !result.some((item) => item.code === 'php.version.unsupported'),
        'SoPHP kept the parent PHP 7.2 target in the nested PHP 8.5 project.');
      assert.ok(!nestedDiagnostics.some((item) => item.code === 'php.syntax'));
      const parentVersionAfterNestedUri = vscode.Uri.joinPath(folder, 'AfterNestedVersioned.php');
      await vscode.workspace.fs.writeFile(parentVersionAfterNestedUri, Buffer.from(versionSource));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(parentVersionAfterNestedUri));
      const parentDiagnosticsAfterNested = await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(parentVersionAfterNestedUri)),
        (result) => result.filter((item) => item.code === 'php.version.unsupported').length === 3,
        'SoPHP replaced the parent PHP 7.2 target after opening the nested PHP 8.5 project.');
      assert.ok(!parentDiagnosticsAfterNested.some((item) => item.code === 'php.syntax'));
      const secondComposerUri = vscode.Uri.joinPath(secondWorkspace.uri, 'composer.json');
      const secondComposer = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(secondComposerUri)).toString('utf8')) as {
        config: { platform: { php: string } };
      };
      secondComposer.config.platform.php = '8.1.0';
      await vscode.workspace.fs.writeFile(secondComposerUri, Buffer.from(JSON.stringify(secondComposer, null, 2)));
      await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(secondVersionUri)),
        (result) => result.filter((item) => item.code === 'php.version.unsupported').length === 1
          && result.some((item) => item.code === 'php.version.unsupported' && item.message.includes('(void) cast')),
        'SoPHP kept the old auto PHP version after a Composer platform change.');
    }
    const changedSecondVersion = secondTargetPhpVersion === '7.2' ? '8.1' : '7.2';
    const changedSecondExpected = changedSecondVersion === '7.2' ? ['match expression', 'enum', '(void) cast'] : ['(void) cast'];
    await vscode.workspace.getConfiguration('phpCompanion', secondWorkspace.uri).update('phpVersion', changedSecondVersion,
      vscode.ConfigurationTarget.WorkspaceFolder);
    const changedSecondDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(secondVersionUri)),
      (result) => {
        const unsupported = result.filter((item) => item.code === 'php.version.unsupported');
        return unsupported.length === changedSecondExpected.length
          && changedSecondExpected.every((feature) => unsupported.some((item) => item.message.includes(feature)));
      },
      'SoPHP kept the old PHP version diagnostics after a second-root setting change.',
    );
    assert.ok(!changedSecondDiagnostics.some((item) => item.code === 'php.syntax'));
    const builtinVersionSource = '<?php namespace App\\C1; class BuiltinVersionProbe {} function versionedBuiltin(): void { str_con }';
    const builtinVersionUri = vscode.Uri.joinPath(secondFolder, 'BuiltinVersion.php');
    await vscode.workspace.fs.writeFile(builtinVersionUri, Buffer.from(builtinVersionSource));
    const builtinVersionDocument = await vscode.workspace.openTextDocument(builtinVersionUri);
    await vscode.window.showTextDocument(builtinVersionDocument);
    await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(builtinVersionUri)),
      (result) => result.some((item) => item.code === 'php.type.filename'),
      'SoPHP did not process the second-root builtin fixture after the version change.');
    const builtinVersionCompletion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
        builtinVersionUri, builtinVersionDocument.positionAt(builtinVersionSource.indexOf('str_con') + 'str_con'.length)),
      (result) => result?.items.some((item) => item.label === 'str_contains' && item.kind === vscode.CompletionItemKind.Function)
        === (changedSecondVersion !== '7.2'),
      'SoPHP did not update built-in completion after the second-root PHP setting changed.');
    assert.strictEqual(builtinVersionCompletion.items.some((item) => item.label === 'str_contains' && item.kind === vscode.CompletionItemKind.Function),
      changedSecondVersion !== '7.2',
      'SoPHP kept the old root version in built-in completion after a setting change.');
  }
  if (runtimeVersion) {
    const runtimeWorkspace = vscode.workspace.workspaceFolders?.find((folder) => folder.name === 'runtime');
    assert.ok(runtimeWorkspace, 'C1 runtime probe workspace was not opened.');
    assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', runtimeWorkspace.uri).get('phpVersion'), 'auto');
    if (runtimeDiscover) assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', runtimeWorkspace.uri).get('phpExecutablePath'), null,
      'The PATH discovery fixture unexpectedly configured a PHP executable.');
    const runtimeMinor = runtimeVersion.match(/^(?:7\.[234]|8\.[0-5])/u)?.[0];
    assert.ok(runtimeMinor, `C1 runtime probe received an unsupported version: ${runtimeVersion}`);
    const runtimeSource = '<?php namespace App\\C1; enum State { case Ready; } function choose(int $value): int { return match ($value) { 1 => 1, default => 0 }; } function useIt(): void { (void) choose(1); str_con }';
    const runtimeFolder = vscode.Uri.joinPath(runtimeWorkspace.uri, 'src', 'C1');
    await vscode.workspace.fs.createDirectory(runtimeFolder);
    const runtimeUri = vscode.Uri.joinPath(runtimeFolder, 'RuntimeVersioned.php');
    await vscode.workspace.fs.writeFile(runtimeUri, Buffer.from(runtimeSource));
    const runtimeDocument = await vscode.workspace.openTextDocument(runtimeUri);
    await vscode.window.showTextDocument(runtimeDocument);
    const expectedUnsupported = runtimeMinor.startsWith('7.') ? ['match expression', 'enum', '(void) cast']
      : runtimeMinor === '8.0' ? ['enum', '(void) cast'] : runtimeMinor === '8.5' ? [] : ['(void) cast'];
    const runtimeDiagnostics = await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(runtimeUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && result.filter((item) => item.code === 'php.version.unsupported').length === expectedUnsupported.length
        && expectedUnsupported.every((feature) => result.some((item) => item.code === 'php.version.unsupported'
          && item.message.includes(feature))),
      `SoPHP auto mode did not use the configured PHP ${runtimeMinor} executable for diagnostics.`);
    assert.ok(!runtimeDiagnostics.some((item) => item.code === 'php.syntax'));
    const runtimeCompletion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      runtimeUri, runtimeDocument.positionAt(runtimeSource.indexOf('str_con') + 'str_con'.length));
    assert.strictEqual(runtimeCompletion.items.some((item) => item.label === 'str_contains'), !runtimeMinor.startsWith('7.'),
      'SoPHP auto mode did not use the selected PHP runtime for built-in completion.');
    console.log(`C1 ${runtimeDiscover ? 'PATH discovery' : 'configured'} runtime probe: PHP ${runtimeVersion}, diagnostics and built-in completion passed.`);
  }
  if (process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR === '1') await verifyRealComposerVendor(timingApi.requestLanguageServer);
  if (c1DebugPort) {
    const visibleSuggestion = await measureVisibleSuggestion(Number(c1DebugPort), folder);
    console.log(`C1 visible PHP suggestion after typing: ${JSON.stringify(visibleSuggestion)}`);
    if (process.env.PHP_COMPANION_TEST_C1_UI === '1') {
      const vendorSuggestion = await measureVisibleSuggestion(Number(c1DebugPort), folder, true);
      console.log(`C1 visible vendor suggestion after typing: ${JSON.stringify(vendorSuggestion)}`);
      const switchedSuggestion = await measureUnsavedReceiverSuggestion(Number(c1DebugPort), folder);
      console.log(`C1 visible unsaved receiver switch: ${JSON.stringify(switchedSuggestion)}`);
      const rapidSuggestion = await measureRapidReceiverSuggestion(Number(c1DebugPort), folder);
      console.log(`C1 rapid unsaved receiver switch: ${JSON.stringify(rapidSuggestion)}`);
      if (process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR === '1') {
        const realRoot = vscode.workspace.workspaceFolders?.find((entry) => entry.name === 'real-vendor');
        assert.ok(realRoot);
        const realSuggestion = await measureRealVendorSuggestion(Number(c1DebugPort), realRoot.uri);
        console.log(`C1 visible real Composer vendor suggestion: ${JSON.stringify(realSuggestion)}`);
      }
    }
  }
  console.log(`C1 Extension Host: PHP ${targetPhpVersion ?? 'auto'}, completion=${completionMs}ms; six editing queries before and after the unsaved receiver change, plus Composer vendor and multi-root chains, passed.`);
  console.log(`C1 VS Code built-in PHP suggestions: ${vscode.workspace.getConfiguration('php').get('suggest.basic', true)}`);
  console.log(`C1 warm command latency (12 sequential samples each, ms): ${JSON.stringify(warm)}`);
  console.log(`C1 server handler latency (same warm interval, ms): ${JSON.stringify(Object.fromEntries(
    Object.entries(serverTimings).map(([method, samples]) => [method, {
      count: samples.length, median: samples.length ? Math.round([...samples].sort((left, right) => left - right)[Math.floor((samples.length - 1) / 2)]!) : 0,
      max: samples.length ? Math.round(Math.max(...samples)) : 0,
    }]),
  ))}`);
  console.log(`C1 Language Client round trip (12 samples, ms): ${JSON.stringify(languageClientRoundTrip)}`);
}

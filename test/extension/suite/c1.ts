import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { measureRapidReceiverSuggestion, measureRealVendorSuggestion, measureUnsavedReceiverSuggestion, measureVisibleInstalledPsr0Type, measureVisibleSuggestion,
  measureVisibleTypeSuggestion } from './c1Ui.js';

async function waitForResult<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean, message: string): Promise<T> {
  const deadline = Date.now() + 30_000;
  let lastResult: T | undefined;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (ready(result)) return result;
      lastResult = result;
    } catch (error) { lastError = error; /* The language server may still be starting. */ }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`${message} Last result: ${JSON.stringify(lastResult)}; last error: ${String(lastError)}`);
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

async function verifyColdRealVendorQuery(kind: 'references' | 'implementation',
  requestLanguageServer: <T>(method: string, params: unknown) => Promise<T>): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.find((folder) => folder.name === 'real-vendor');
  assert.ok(root, 'The cold query requires the locked real Composer vendor project.');
  const source = '<?php namespace App\\C1; use Psr\\Http\\Message\\ResponseInterface; function cold(ResponseInterface $value): void { $value->getStatusCode(); }';
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'C1', 'ColdVendorConsumer.php');
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root.uri, 'src', 'C1'));
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const call = document.positionAt(source.indexOf('$value->getStatusCode()') + '$value->'.length + 2);
  const target = vscode.Uri.joinPath(root.uri, 'vendor', 'guzzlehttp', 'psr7', 'src', 'Response.php').toString();
  const started = performance.now();
  const result = kind === 'references'
    ? await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, call)
    : await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, call);
  const elapsedMs = Math.round(performance.now() - started);
  assert.ok(Array.isArray(result), `The first ${kind} command did not return locations.`);
  if (kind === 'references') {
    const callStart = document.positionAt(source.indexOf('getStatusCode()'));
    assert.ok(result.some((item) => item.uri.toString() === uri.toString() && item.range.start.isEqual(callStart)),
      `The first References command missed its own call: ${JSON.stringify(result)}`);
  } else {
    assert.ok(result.some((item) => item.uri.toString() === target),
      `The first Implementation command missed Guzzle Response: ${JSON.stringify(result)}`);
  }
  const timings = await requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: false });
  const memory = await requestLanguageServer<{ rss?: number }>('phpCompanion/testMemoryUsage', {});
  console.log(`C1 cold ${kind} query: ${JSON.stringify({ elapsedMs, resultCount: result.length,
    serverMs: timings[kind]?.at(-1), scanMs: timings[`${kind}Scan`]?.at(-1),
    projectMs: timings.candidateProject?.at(-1), prefilterMs: timings.candidatePrefilter?.at(-1),
    inventoryMs: timings.candidateInventory?.at(-1), indexMs: timings.candidateIndex?.at(-1),
    serverRssMiB: memory.rss === undefined ? undefined : Math.round(memory.rss / 1048576),
    candidateEpochRetries: timings.candidateEpochRetry?.length ?? 0 })}`);
  const warmRounds = Number(process.env.PHP_COMPANION_TEST_C1_COLD_WARM_ROUNDS ?? 0);
  if (warmRounds) {
    assert.ok(Number.isSafeInteger(warmRounds) && warmRounds > 0 && warmRounds <= 200);
    const locations = (items: vscode.Location[]): string[] => items.map((item) =>
      `${item.uri.toString()}:${item.range.start.line}:${item.range.start.character}:${item.range.end.line}:${item.range.end.character}`).sort();
    const expected = locations(result);
    const commandMs: number[] = [];
    for (let round = 0; round < warmRounds; round += 1) {
      const warmStarted = performance.now();
      const warm = kind === 'references'
        ? await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, call)
        : await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', uri, call);
      commandMs.push(performance.now() - warmStarted);
      assert.deepStrictEqual(locations(warm ?? []), expected, `Warm ${kind} changed locations in round ${round}.`);
    }
    const sorted = commandMs.sort((left, right) => left - right);
    const warmTimings = await requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: false });
    const warmMemory = await requestLanguageServer<{ rss?: number }>('phpCompanion/testMemoryUsage', {});
    const timingSummary = (name: string): { count: number; medianMs?: number; p95Ms?: number; maxMs?: number } => {
      const values = [...(warmTimings[name] ?? [])].slice(-warmRounds).sort((left, right) => left - right);
      return { count: values.length, medianMs: values[Math.ceil(values.length * 0.5) - 1],
        p95Ms: values[Math.ceil(values.length * 0.95) - 1], maxMs: values.at(-1) };
    };
    console.log(`C1 warm ${kind} after cold: ${JSON.stringify({ rounds: warmRounds,
      medianMs: Math.round(sorted[Math.ceil(warmRounds * 0.5) - 1]!),
      p95Ms: Math.round(sorted[Math.ceil(warmRounds * 0.95) - 1]!), maxMs: Math.round(sorted.at(-1)!),
      server: timingSummary(kind), scan: timingSummary(`${kind}Scan`),
      freshness: timingSummary('methodReferenceFreshnessTotal'), candidateIndex: timingSummary('candidateIndex'),
      serverRssMiB: warmMemory.rss === undefined ? undefined : Math.round(warmMemory.rss / 1048576) })}`);
  }
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

async function verifyRealVendorEditingChain(rounds: number,
  requestLanguageServer: <T>(method: string, params: unknown) => Promise<T>): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.find((folder) => folder.name === 'real-vendor');
  assert.ok(root, 'The real Composer vendor project was not opened for the editing chain.');
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'C1', 'RealVendorChain.php');
  await vscode.workspace.fs.writeFile(uri, Buffer.from('<?php namespace App\\C1;'));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const cases = [
    { type: 'ResponseInterface', method: 'getStatusCode', prefix: 'getSta',
      declaration: 'vendor/psr/http-message/src/ResponseInterface.php', implementation: 'vendor/guzzlehttp/psr7/src/Response.php',
      forbidden: 'getRequestTarget' },
    { type: 'RequestInterface', method: 'getRequestTarget', prefix: 'getReq',
      declaration: 'vendor/psr/http-message/src/RequestInterface.php', implementation: 'vendor/guzzlehttp/psr7/src/Request.php',
      forbidden: 'getStatusCode' },
  ] as const;
  const samples = new Map<string, number[]>();
  await requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const memorySamples: Array<{ round: number; rssMiB: number; heapUsedMiB: number; externalMiB: number }> = [];
  const sampleMemory = async (round: number): Promise<void> => {
    const memory = await requestLanguageServer<{ rss: number; heapUsed: number; external: number }>('phpCompanion/testMemoryUsage',
      { collect: false });
    memorySamples.push({ round, rssMiB: Math.round(memory.rss / 1048576),
      heapUsedMiB: Math.round(memory.heapUsed / 1048576), externalMiB: Math.round(memory.external / 1048576) });
  };
  const checked = async <T>(name: string, read: () => PromiseLike<T>, ready: (value: T) => boolean,
    message: string): Promise<T> => {
    const started = performance.now();
    const result = await waitForResult(read, ready, message);
    const values = samples.get(name) ?? []; values.push(Math.round(performance.now() - started)); samples.set(name, values);
    return result;
  };
  await sampleMemory(0);
  for (let round = 0; round < rounds; round += 1) {
    const current = cases[round % cases.length]!;
    const source = `<?php namespace App\\C1;
use Psr\\Http\\Message\\ResponseInterface;
use Psr\\Http\\Message\\RequestInterface;
function inspect(${current.type} $value): void { $value->${current.method}(); $value->${current.prefix}; }`;
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not change the real vendor chain in round ${round}.`);
    assert.ok(document.isDirty && document.getText() === source, `Real vendor round ${round} lost its unsaved source.`);
    const callOffset = source.indexOf(`$value->${current.method}()`) + '$value->'.length;
    const call = document.positionAt(callOffset + 2);
    const partial = document.positionAt(source.indexOf(`$value->${current.prefix};`) + `$value->${current.prefix}`.length);
    const declarationUri = vscode.Uri.joinPath(root.uri, current.declaration).toString();
    const implementationUri = vscode.Uri.joinPath(root.uri, current.implementation).toString();
    const completion = await checked('completion', () => vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, partial),
    (result) => result?.items.some((item) => item.label === current.method) === true,
    `Real vendor round ${round} did not complete ${current.method}.`);
    assert.ok(!completion.items.some((item) => item.label === current.forbidden),
      `Real vendor round ${round} returned a method from the previous receiver.`);
    await checked('hover', () => vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, call),
      (result) => result?.some((item) => item.contents.some((part) =>
        (part instanceof vscode.MarkdownString ? part.value : typeof part === 'string' ? part : part.value).includes(current.method))) === true,
      `Real vendor round ${round} did not show Hover for ${current.method}.`);
    await checked('signature', () => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', uri,
      document.positionAt(callOffset + current.method.length + 1)),
    (result) => result?.signatures.some((item) => item.label.includes(`${current.method}()`)) === true,
    `Real vendor round ${round} did not show Signature Help for ${current.method}.`);
    const definition = await checked('definition', () => vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === declarationUri) === true,
    `Real vendor round ${round} did not navigate to ${current.type}.`);
    assert.deepStrictEqual(definition.map((item) => item.uri.toString()), [declarationUri]);
    const implementation = await checked('implementation', () => vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeImplementationProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === implementationUri) === true,
    `Real vendor round ${round} did not find the Guzzle implementation of ${current.type}.`);
    assert.deepStrictEqual(implementation.map((item) => item.uri.toString()), [implementationUri]);
    const references = await checked('references', () => vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', uri, call),
    (result) => result?.some((item) => item.uri.toString() === uri.toString()
      && item.range.start.isEqual(document.positionAt(callOffset))) === true,
    `Real vendor round ${round} did not find the current unsaved call.`);
    assert.ok(references.every((item) => item.uri.toString() !== uri.toString()
      || item.range.start.isEqual(document.positionAt(callOffset))),
    `Real vendor round ${round} returned another call from the same unsaved document.`);
    if ((round + 1) % 25 === 0 || round === rounds - 1) await sampleMemory(round + 1);
  }
  const summary = Object.fromEntries([...samples].map(([name, values]) => {
    const sorted = [...values].sort((left, right) => left - right);
    return [name, { count: sorted.length, median: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1], max: sorted.at(-1) }];
  }));
  const serverTimings = await requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
  const freshnessTimings = Object.fromEntries(['methodReferenceFreshnessSearch', 'methodReferenceFreshnessHash',
    'methodReferenceFreshnessTotal'].map((name) => {
    const sorted = [...(serverTimings[name] ?? [])].sort((left, right) => left - right);
    return [name, { count: sorted.length, median: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1], max: sorted.at(-1) }];
  }));
  console.log(`C1 real vendor unsaved six-query chain: ${JSON.stringify({ rounds, summary, memorySamples, freshnessTimings })}`);
}

export async function run(): Promise<void> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'C1 Extension Host test has no workspace.');
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load in the isolated Extension Host.');
  await extension.activate();
  if (process.env.PHP_COMPANION_TEST_C1_OPEN_SOURCE_PROFILE === '1') {
    for (const id of ['sohophp.php-companion', 'sohophp.php-companion-symfony', 'sohophp.php-companion-open-source-pack',
      'sohophp.twig-plus', 'redhat.vscode-yaml', 'redhat.vscode-xml', 'xdebug.php-debug', 'junstyle.php-cs-fixer',
      'editorconfig.editorconfig', 'eiminsasete.apacheconf-snippets', 'neilbrayfield.php-docblocker']) {
      assert.ok(vscode.extensions.getExtension(id), `The C1 Open Source Pack profile is missing ${id}.`);
    }
    assert.ok(!vscode.extensions.getExtension('bmewburn.vscode-intelephense-client')
      && !vscode.extensions.getExtension('symfony.language-tools'),
    'The C1 Open Source Pack profile contains a competing PHP or Symfony language server.');
    assert.strictEqual(vscode.workspace.getConfiguration('editor', { uri: workspace.uri, languageId: 'php' })
      .get('defaultFormatter'), 'junstyle.php-cs-fixer',
    'The C1 Open Source Pack profile lost the PHP formatter while setting completion defaults.');
  }
  const timingApi = extension.exports as { requestLanguageServer?: <T>(method: string, params: unknown) => Promise<T> };
  assert.ok(timingApi.requestLanguageServer, 'SoPHP Core did not expose the test timing request bridge.');
  const coldQuery = process.env.PHP_COMPANION_TEST_C1_COLD_QUERY;
  if (coldQuery) {
    assert.ok(coldQuery === 'references' || coldQuery === 'implementation',
      'PHP_COMPANION_TEST_C1_COLD_QUERY must be references or implementation.');
    await verifyColdRealVendorQuery(coldQuery, timingApi.requestLanguageServer);
    return;
  }
  const targetPhpVersion = process.env.PHP_COMPANION_TEST_C1_PHP_VERSION;
  const runtimeVersion = process.env.PHP_COMPANION_TEST_C1_RUNTIME_VERSION;
  const runtimeDiscover = process.env.PHP_COMPANION_TEST_C1_RUNTIME_DISCOVER === '1';
  const c1DebugPort = process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT;
  if (targetPhpVersion) assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', workspace.uri).get('phpVersion'), targetPhpVersion);
  assert.strictEqual(vscode.workspace.getConfiguration('php').get('suggest.basic'), false,
    'VS Code built-in PHP suggestions must stay disabled while SoPHP owns PHP completion, Hover and Signature Help.');
  const folder = vscode.Uri.joinPath(workspace.uri, 'src', 'C1');
  await vscode.workspace.fs.createDirectory(folder);
  assert.strictEqual(vscode.workspace.getConfiguration('editor', { uri: vscode.Uri.joinPath(folder, 'Consumer.php'),
    languageId: 'php' }).get('wordBasedSuggestions'), 'off',
    'PHP variable suggestions should come from SoPHP with PHP scope ownership.');
  const localWordSource = '<?php function c1LocalWord(): void { $customerName = "Ada"; $cust }';
  const localWordUri = vscode.Uri.joinPath(folder, 'C1LocalWord.php');
  await vscode.workspace.fs.writeFile(localWordUri, Buffer.from(localWordSource));
  const localWordDocument = await vscode.workspace.openTextDocument(localWordUri);
  await vscode.window.showTextDocument(localWordDocument);
  const localWordSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    localWordUri, localWordDocument.positionAt(localWordSource.indexOf('$cust }') + '$cust'.length));
  assert.ok(localWordSuggestions?.items.some((item) => item.label === 'customerName' || item.label === '$customerName'),
    'PHP no longer suggests a variable word from the current file.');
  const middleWordSource = '<?php function c1MiddleWord(): void { $customerName = "Ada"; $custOldTail; }';
  const middleWordUri = vscode.Uri.joinPath(folder, 'C1MiddleWord.php');
  await vscode.workspace.fs.writeFile(middleWordUri, Buffer.from(middleWordSource));
  const middleWordDocument = await vscode.workspace.openTextDocument(middleWordUri);
  await vscode.window.showTextDocument(middleWordDocument);
  const middleWordStart = middleWordSource.indexOf('$custOldTail;');
  const middleWordSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    middleWordUri, middleWordDocument.positionAt(middleWordStart + '$cust'.length));
  const middleWordItem = middleWordSuggestions?.items.find((item) => item.label === '$customerName');
  assert.ok(middleWordItem, 'PHP did not suggest the visible variable when the cursor was inside another variable token.');
  const middleWordRange = middleWordItem.range instanceof vscode.Range ? middleWordItem.range : middleWordItem.range?.replacing;
  assert.ok(middleWordRange, 'PHP variable completion did not provide a replacement range.');
  assert.strictEqual(middleWordDocument.offsetAt(middleWordRange.start), middleWordStart);
  assert.strictEqual(middleWordDocument.offsetAt(middleWordRange.end), middleWordStart + '$custOldTail'.length,
    'PHP variable completion left the existing suffix outside its replacement range.');
  const middleWordEdit = new vscode.WorkspaceEdit();
  middleWordEdit.replace(middleWordUri, middleWordRange, '$customerName');
  assert.ok(await vscode.workspace.applyEdit(middleWordEdit));
  assert.strictEqual(middleWordDocument.getText(), middleWordSource.replace('$custOldTail;', '$customerName;'),
    'Accepting PHP variable completion left the old variable suffix in the document.');
  const interpolationSource = `<?php function c1Interpolation(string $username): void {
  echo "Hello {$userOldTail}";
  echo "Just $";
  echo 'Hello $user';
  echo "Hello \\$user";
}`;
  const interpolationUri = vscode.Uri.joinPath(folder, 'C1Interpolation.php');
  await vscode.workspace.fs.writeFile(interpolationUri, Buffer.from(interpolationSource));
  const interpolationDocument = await vscode.workspace.openTextDocument(interpolationUri);
  await vscode.window.showTextDocument(interpolationDocument);
  const bareDollarSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    interpolationUri, interpolationDocument.positionAt(interpolationSource.indexOf('Just $') + 'Just $'.length));
  assert.ok(bareDollarSuggestions?.items.some((item) => item.label === '$username'),
    'PHP did not suggest the visible parameter immediately after an interpolation dollar.');
  const interpolationStart = interpolationSource.indexOf('$userOldTail');
  const interpolationSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    interpolationUri, interpolationDocument.positionAt(interpolationStart + '$user'.length));
  const interpolationItem = interpolationSuggestions?.items.find((item) => item.label === '$username');
  assert.ok(interpolationItem, 'PHP interpolated string did not suggest the visible parameter.');
  const interpolationRange = interpolationItem.range instanceof vscode.Range ? interpolationItem.range : interpolationItem.range?.replacing;
  assert.ok(interpolationRange, 'PHP interpolated variable completion did not provide a replacement range.');
  assert.strictEqual(interpolationDocument.offsetAt(interpolationRange.start), interpolationStart);
  assert.strictEqual(interpolationDocument.offsetAt(interpolationRange.end), interpolationStart + '$userOldTail'.length);
  for (const literal of ["'Hello $user'", 'Hello \\$user']) {
    const offset = interpolationSource.indexOf('$user', interpolationSource.indexOf(literal)) + '$user'.length;
    const suggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      interpolationUri, interpolationDocument.positionAt(offset));
    assert.ok(!suggestions?.items.some((item) => item.label === '$username'),
      `PHP suggested a variable inside ${literal}.`);
  }
  const interpolationEdit = new vscode.WorkspaceEdit();
  interpolationEdit.replace(interpolationUri, interpolationRange, '$username');
  assert.ok(await vscode.workspace.applyEdit(interpolationEdit));
  assert.ok(interpolationDocument.getText().includes('"Hello {$username}"'),
    'Accepting interpolated variable completion damaged the surrounding braces.');
  const scopedWordSource = '<?php function c1First(): void { $otherFunctionSecret = 1; } function c1Second(): void { $otherFunctionSec; }';
  const scopedWordUri = vscode.Uri.joinPath(folder, 'C1ScopedWord.php');
  await vscode.workspace.fs.writeFile(scopedWordUri, Buffer.from(scopedWordSource));
  const scopedWordDocument = await vscode.workspace.openTextDocument(scopedWordUri);
  await vscode.window.showTextDocument(scopedWordDocument);
  const scopedWordSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    scopedWordUri, scopedWordDocument.positionAt(scopedWordSource.indexOf('$otherFunctionSec;') + '$otherFunctionSec'.length));
  assert.ok(!scopedWordSuggestions?.items.some((item) => item.label === 'otherFunctionSecret' || item.label === '$otherFunctionSecret'),
    'PHP suggested a local variable from a different function in the current file.');
  const colonWordSource = `<?php function c1ColonConsume(string $value): void {}
function c1ColonWords(string $username, bool $flag): void {
  c1ColonConsume(value:$user);
  $result = $flag ? 'fallback' :$user;
}`;
  const colonWordUri = vscode.Uri.joinPath(folder, 'C1ColonWords.php');
  await vscode.workspace.fs.writeFile(colonWordUri, Buffer.from(colonWordSource));
  const colonWordDocument = await vscode.workspace.openTextDocument(colonWordUri);
  await vscode.window.showTextDocument(colonWordDocument);
  for (const marker of ['value:$user', ':$user;']) {
    const offset = colonWordSource.indexOf(marker) + marker.length - (marker.endsWith(';') ? 1 : 0);
    const suggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
      colonWordUri, colonWordDocument.positionAt(offset));
    assert.ok(suggestions?.items.some((item) => item.label === '$username'),
      `PHP did not suggest the local variable after the colon in ${marker}`);
  }
  const arrowWordSource = '<?php function c1Arrow(string $customer): void { $customerName = $customer; $read = fn () => $cust; }';
  const arrowWordUri = vscode.Uri.joinPath(folder, 'C1ArrowWord.php');
  await vscode.workspace.fs.writeFile(arrowWordUri, Buffer.from(arrowWordSource));
  const arrowWordDocument = await vscode.workspace.openTextDocument(arrowWordUri);
  await vscode.window.showTextDocument(arrowWordDocument);
  const arrowWordSuggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider',
    arrowWordUri, arrowWordDocument.positionAt(arrowWordSource.indexOf('$cust;') + '$cust'.length));
  assert.ok(arrowWordSuggestions?.items.some((item) => item.label === '$customerName'),
    'PHP arrow function no longer suggests a visible captured local variable.');
  const nestedWordSource = `<?php class C1NestedWords {
  public function run(array $rows): void {
    foreach ($rows as $entryKey => $entryValue) { $entryK; }
    $bound = function () { $thi; };
    $unbound = static function () { $thi; };
    [$firstPart, $secondPart] = $rows; $firstP;
    list($legacyPart) = $rows; $legacyP;
    global $sharedThing; static $cachedThing = []; $shar; $cach;
  }
}`;
  const nestedWordUri = vscode.Uri.joinPath(folder, 'C1NestedWords.php');
  await vscode.workspace.fs.writeFile(nestedWordUri, Buffer.from(nestedWordSource));
  const nestedWordDocument = await vscode.workspace.openTextDocument(nestedWordUri);
  await vscode.window.showTextDocument(nestedWordDocument);
  const nestedSuggestions = async (offset: number): Promise<vscode.CompletionItem[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', nestedWordUri, nestedWordDocument.positionAt(offset)))?.items ?? [];
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$entryK;') + '$entryK'.length))
    .some((item) => item.label === '$entryKey'), 'PHP foreach key variable was missing from scoped completion.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$thi;') + '$thi'.length))
    .some((item) => item.label === '$this'), 'PHP bound closure lost the $this suggestion.');
  assert.ok(!(await nestedSuggestions(nestedWordSource.lastIndexOf('$thi;') + '$thi'.length))
    .some((item) => item.label === '$this'), 'PHP static closure incorrectly suggested $this.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$firstP;') + '$firstP'.length))
    .some((item) => item.label === '$firstPart'), 'PHP short-array destructuring variable was missing from scoped completion.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$legacyP;') + '$legacyP'.length))
    .some((item) => item.label === '$legacyPart'), 'PHP list destructuring variable was missing from scoped completion.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$shar;') + '$shar'.length))
    .some((item) => item.label === '$sharedThing'), 'PHP global declaration variable was missing from scoped completion.');
  assert.ok((await nestedSuggestions(nestedWordSource.indexOf('$cach;') + '$cach'.length))
    .some((item) => item.label === '$cachedThing'), 'PHP static local variable was missing from scoped completion.');
  if (process.env.PHP_COMPANION_TEST_C1_LEGACY_TYPE_NAMES === '1') {
    assert.ok(targetPhpVersion === '7.2' || targetPhpVersion === '7.4',
      'Legacy native-name class probe requires a PHP 7.2 or 7.4 target.');
    const legacySource = `<?php namespace App\\C1;
class mixed { public function ready(): void {} }
class never {}
function useLegacy(mixed $value): never { $value->ready(); return new never(); }`;
    const legacyUri = vscode.Uri.joinPath(folder, 'LegacyNativeNames.php');
    await vscode.workspace.fs.writeFile(legacyUri, Buffer.from(legacySource));
    const legacyDocument = await vscode.workspace.openTextDocument(legacyUri);
    await vscode.window.showTextDocument(legacyDocument);
    for (const name of ['mixed', 'never'] as const) {
      const declarationOffset = legacySource.indexOf(`class ${name}`) + 'class '.length;
      const typeOffset = legacySource.indexOf(name, legacySource.indexOf('function useLegacy'));
      const definitions = await waitForResult(
        () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', legacyUri,
          legacyDocument.positionAt(typeOffset + 1)),
        (result) => result?.some((location) => location.uri.toString() === legacyUri.toString()
          && location.range.start.isEqual(legacyDocument.positionAt(declarationOffset))) === true,
        `SoPHP did not navigate to the PHP 7 ${name} class declaration.`,
      );
      assert.ok(definitions.length > 0);
    }
    const legacyDiagnostics = vscode.languages.getDiagnostics(legacyUri);
    assert.ok(!legacyDiagnostics.some((diagnostic) => diagnostic.code === 'php.syntax'
      || diagnostic.code === 'php.version.unsupported'),
    `SoPHP reported a false PHP ${targetPhpVersion} error for legacy class names: ${JSON.stringify(legacyDiagnostics)}`);
    const commentedSource = `<?php namespace App\\C1\\Commented;
class /* legacy */ mixed {}
final /* legacy */ class never {}
function useCommented(mixed $value): never { return new never(); }`;
    const commentedUri = vscode.Uri.joinPath(folder, 'CommentedLegacyNames.php');
    await vscode.workspace.fs.writeFile(commentedUri, Buffer.from(commentedSource));
    const commentedDocument = await vscode.workspace.openTextDocument(commentedUri);
    await vscode.window.showTextDocument(commentedDocument);
    for (const name of ['mixed', 'never'] as const) {
      const declarationOffset = commentedSource.indexOf(`${name} {}`);
      const typeOffset = commentedSource.indexOf(name, commentedSource.indexOf('function useCommented'));
      await waitForResult(
        () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', commentedUri,
          commentedDocument.positionAt(typeOffset + 1)),
        (result) => result?.some((location) => location.uri.toString() === commentedUri.toString()
          && location.range.start.isEqual(commentedDocument.positionAt(declarationOffset))) === true,
        `SoPHP did not navigate to the commented PHP 7 ${name} class declaration.`,
      );
    }
    assert.ok(!vscode.languages.getDiagnostics(commentedUri).some((diagnostic) => diagnostic.code === 'php.syntax'
      || diagnostic.code === 'php.version.unsupported'),
    `SoPHP reported a false PHP ${targetPhpVersion} error for commented legacy class declarations.`);
    const renamedDeclaration = new vscode.WorkspaceEdit();
    const oldDeclaration = legacySource.indexOf('class mixed') + 'class '.length;
    renamedDeclaration.replace(legacyUri,
      new vscode.Range(legacyDocument.positionAt(oldDeclaration), legacyDocument.positionAt(oldDeclaration + 'mixed'.length)),
      'LegacyMixed');
    assert.ok(await vscode.workspace.applyEdit(renamedDeclaration));
    await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(legacyUri)),
      (result) => result.some((diagnostic) => diagnostic.code === 'php.version.unsupported'
        && diagnostic.message.includes('mixed type')),
      `SoPHP did not refresh PHP ${targetPhpVersion} diagnostics after the legacy class was renamed without saving.`,
    );
    const renamedReference = new vscode.WorkspaceEdit();
    const oldType = legacyDocument.getText().indexOf('mixed $value');
    renamedReference.replace(legacyUri,
      new vscode.Range(legacyDocument.positionAt(oldType), legacyDocument.positionAt(oldType + 'mixed'.length)),
      'LegacyMixed');
    assert.ok(await vscode.workspace.applyEdit(renamedReference));
    const edited = legacyDocument.getText();
    const newDeclaration = edited.indexOf('class LegacyMixed') + 'class '.length;
    const newType = edited.indexOf('LegacyMixed $value');
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', legacyUri,
        legacyDocument.positionAt(newType + 1)),
      (result) => result?.some((location) => location.uri.toString() === legacyUri.toString()
        && location.range.start.isEqual(legacyDocument.positionAt(newDeclaration))) === true,
      `SoPHP kept the old PHP ${targetPhpVersion} class navigation after an unsaved rename.`,
    );
    assert.ok(!vscode.languages.getDiagnostics(legacyUri).some((diagnostic) => diagnostic.code === 'php.version.unsupported'
      && diagnostic.message.includes('mixed type')),
    `SoPHP kept the old PHP ${targetPhpVersion} mixed-type diagnostic after the reference was updated.`);
    console.log(`C1 PHP ${targetPhpVersion} legacy mixed/never navigation and unsaved diagnostic transition passed.`);
  }
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
  const typeSource = '<?php namespace App\\C1; function instantiate(): void { new C1TypeCompletionPro; }';
  const typeUri = vscode.Uri.joinPath(folder, 'C1TypeCompletionConsumer.php');
  const typeDeclarationUri = vscode.Uri.joinPath(folder, 'C1TypeCompletionProbe.php');
  await vscode.workspace.fs.writeFile(typeDeclarationUri, Buffer.from('<?php namespace App\\C1; class C1TypeCompletionProbe {}'));
  await vscode.workspace.fs.writeFile(typeUri, Buffer.from(typeSource));
  const typeDocument = await vscode.workspace.openTextDocument(typeUri);
  await vscode.window.showTextDocument(typeDocument);
  const typeCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', typeUri,
      typeDocument.positionAt(typeSource.indexOf('C1TypeCompletionPro') + 'C1TypeCompletionPro'.length)),
    (result) => result?.items.some((item) => item.label === 'C1TypeCompletionProbe') === true,
    'SoPHP did not complete a project class name in VS Code.',
  );
  assert.strictEqual(typeCompletion.items.filter((item) => item.label === 'C1TypeCompletionProbe').length, 1,
    'Project class completion was returned more than once.');
  const externalFolder = vscode.Uri.joinPath(folder, 'External');
  await vscode.workspace.fs.createDirectory(externalFolder);
  const externalTypeUri = vscode.Uri.joinPath(externalFolder, 'C1ExternalTypeProbe.php');
  await vscode.workspace.fs.writeFile(externalTypeUri, Buffer.from('<?php namespace App\\C1\\External; class C1ExternalTypeProbe {}'));
  const externalTypeSource = '<?php namespace App\\C1; function externalType(): void { new C1ExternalTypePro; }';
  const externalTypeConsumerUri = vscode.Uri.joinPath(folder, 'C1ExternalTypeConsumer.php');
  await vscode.workspace.fs.writeFile(externalTypeConsumerUri, Buffer.from(externalTypeSource));
  const externalTypeDocument = await vscode.workspace.openTextDocument(externalTypeConsumerUri);
  await vscode.window.showTextDocument(externalTypeDocument);
  const externalTypeCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', externalTypeConsumerUri,
      externalTypeDocument.positionAt(externalTypeSource.indexOf('C1ExternalTypePro') + 'C1ExternalTypePro'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && item.additionalTextEdits?.some((entry) => entry.newText.includes('use App\\C1\\External\\C1ExternalTypeProbe;'))) === true,
    'SoPHP did not offer a cross-namespace class with its import in VS Code.',
  );
  assert.strictEqual(externalTypeCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1,
    'Cross-namespace class completion was returned more than once.');
  const namespaceImportSource = '<?php namespace App\\C1; use Ap; class NamespaceImportConsumer {}';
  const namespaceImportUri = vscode.Uri.joinPath(folder, 'C1NamespaceImportConsumer.php');
  await vscode.workspace.fs.writeFile(namespaceImportUri, Buffer.from(namespaceImportSource));
  const namespaceImportDocument = await vscode.workspace.openTextDocument(namespaceImportUri);
  const namespaceImportEditor = await vscode.window.showTextDocument(namespaceImportDocument);
  const namespaceImportOffset = namespaceImportSource.indexOf('use Ap') + 'use Ap'.length;
  const namespaceImportCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', namespaceImportUri,
      namespaceImportDocument.positionAt(namespaceImportOffset)),
    (result) => result?.items.some((item) => item.label === 'App\\' && item.kind === vscode.CompletionItemKind.Module) === true,
    'SoPHP did not suggest the Composer PSR-4 root namespace after use Ap.',
  );
  assert.strictEqual(namespaceImportCompletion.items.filter((item) => item.label === 'App\\').length, 1);
  namespaceImportEditor.selection = new vscode.Selection(namespaceImportDocument.positionAt(namespaceImportOffset),
    namespaceImportDocument.positionAt(namespaceImportOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(namespaceImportDocument.getText(), namespaceImportSource.replace('use Ap;', 'use App\\;'),
    'Accepting the Composer namespace suggestion did not finish the use prefix.');
  const nestedNamespaceCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', namespaceImportUri,
      namespaceImportDocument.positionAt(namespaceImportDocument.getText().indexOf('use App\\') + 'use App\\'.length)),
    (result) => result?.items.some((item) => item.label === 'C1\\' && item.kind === vscode.CompletionItemKind.Module) === true,
    'SoPHP did not offer the next Composer namespace segment after accepting App.',
  );
  assert.strictEqual(nestedNamespaceCompletion.items.filter((item) => item.label === 'C1\\').length, 1);
  const namespacePathEdit = new vscode.WorkspaceEdit();
  namespacePathEdit.insert(namespaceImportUri,
    namespaceImportDocument.positionAt(namespaceImportDocument.getText().indexOf('use App\\') + 'use App\\'.length),
    'C1\\External\\');
  assert.ok(await vscode.workspace.applyEdit(namespacePathEdit));
  const openImportText = namespaceImportDocument.getText();
  const emptyClassCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', namespaceImportUri,
      namespaceImportDocument.positionAt(openImportText.indexOf('use App\\C1\\External\\') + 'use App\\C1\\External\\'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe' && !item.additionalTextEdits?.length) === true,
    'SoPHP did not offer a class immediately after the completed namespace path.',
  );
  assert.strictEqual(emptyClassCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1);
  const manualImportSource = '<?php namespace App\\C1; use App\\C1\\External\\C1ExternalTypePro; class ManualImportConsumer {}';
  const manualImportUri = vscode.Uri.joinPath(folder, 'C1ManualImportConsumer.php');
  await vscode.workspace.fs.writeFile(manualImportUri, Buffer.from(manualImportSource));
  const manualImportDocument = await vscode.workspace.openTextDocument(manualImportUri);
  const manualImportEditor = await vscode.window.showTextDocument(manualImportDocument);
  const manualImportCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', manualImportUri,
      manualImportDocument.positionAt(manualImportSource.indexOf('External\\C1ExternalTypePro') + 'External\\C1ExternalTypePro'.length)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && !item.additionalTextEdits?.length) === true,
    'SoPHP did not complete a hand-written qualified use import in VS Code.',
  );
  assert.strictEqual(manualImportCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1);
  manualImportEditor.selection = new vscode.Selection(
    manualImportDocument.positionAt(manualImportSource.indexOf('External\\C1ExternalTypePro') + 'External\\C1ExternalTypePro'.length),
    manualImportDocument.positionAt(manualImportSource.indexOf('External\\C1ExternalTypePro') + 'External\\C1ExternalTypePro'.length));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(manualImportDocument.getText(), manualImportSource.replace('C1ExternalTypePro;', 'C1ExternalTypeProbe;'),
    'Accepting the class suggestion did not finish the existing use statement exactly once.');
  const groupImportSource = '<?php namespace App\\C1; use App\\C1\\External\\{C1ExternalTypePro}; class GroupImportConsumer {}';
  const groupImportUri = vscode.Uri.joinPath(folder, 'C1GroupImportConsumer.php');
  await vscode.workspace.fs.writeFile(groupImportUri, Buffer.from(groupImportSource));
  const groupImportDocument = await vscode.workspace.openTextDocument(groupImportUri);
  const groupImportEditor = await vscode.window.showTextDocument(groupImportDocument);
  const groupImportOffset = groupImportSource.indexOf('{C1ExternalTypePro') + '{C1ExternalTypePro'.length;
  const groupImportCompletion = await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', groupImportUri,
      groupImportDocument.positionAt(groupImportOffset)),
    (result) => result?.items.filter((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe'
      && !item.additionalTextEdits?.length).length === 1,
    'SoPHP did not complete a class member in a hand-written group use.',
  );
  assert.strictEqual(groupImportCompletion.items.filter((item) => item.label === 'C1ExternalTypeProbe').length, 1);
  const groupItem = groupImportCompletion.items.find((item) => item.label === 'C1ExternalTypeProbe')!;
  const groupRange = groupItem.range instanceof vscode.Range ? groupItem.range : groupItem.range?.replacing;
  assert.ok(groupRange && groupImportDocument.getText(groupRange) === '{C1ExternalTypePro}'
    && groupItem.insertText === '{C1ExternalTypeProbe}',
  'The group use completion would lose its braces while replacing the member.');
  groupImportEditor.selection = new vscode.Selection(groupImportDocument.positionAt(groupImportOffset),
    groupImportDocument.positionAt(groupImportOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  assert.strictEqual(groupImportDocument.getText(), groupImportSource,
    'Opening group use suggestions changed the source before any suggestion was accepted.');
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(groupImportDocument.getText(), groupImportSource.replace('C1ExternalTypePro}', 'C1ExternalTypeProbe}'),
    'Accepting the class suggestion did not finish the existing group use member exactly once.');
  const laterGroupSource = groupImportSource.replace('{C1ExternalTypePro}', '{ExistingType, C1ExternalTypePro}')
    .replace('GroupImportConsumer', 'LaterGroupImportConsumer');
  const laterGroupUri = vscode.Uri.joinPath(folder, 'C1LaterGroupImportConsumer.php');
  await vscode.workspace.fs.writeFile(laterGroupUri, Buffer.from(laterGroupSource));
  const laterGroupDocument = await vscode.workspace.openTextDocument(laterGroupUri);
  const laterGroupEditor = await vscode.window.showTextDocument(laterGroupDocument);
  const laterGroupOffset = laterGroupSource.indexOf('C1ExternalTypePro}') + 'C1ExternalTypePro'.length;
  await waitForResult(
    () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', laterGroupUri,
      laterGroupDocument.positionAt(laterGroupOffset)),
    (result) => result?.items.some((item) => item.label === 'C1ExternalTypeProbe'
      && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe') === true,
    'SoPHP did not complete a later class member in a group use.',
  );
  laterGroupEditor.selection = new vscode.Selection(laterGroupDocument.positionAt(laterGroupOffset),
    laterGroupDocument.positionAt(laterGroupOffset));
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  assert.strictEqual(laterGroupDocument.getText(), laterGroupSource.replace('C1ExternalTypePro}', 'C1ExternalTypeProbe}'),
    'Accepting a later group use member changed an earlier member or the braces.');
  const alternateFolder = vscode.Uri.joinPath(folder, 'Alternative');
  await vscode.workspace.fs.createDirectory(alternateFolder);
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(alternateFolder, 'C1ExternalTypeProbe.php'),
    Buffer.from('<?php namespace App\\C1\\Alternative; class C1ExternalTypeProbe {}'));
  const transitionSource = manualImportSource.replace('ManualImportConsumer', 'ManualImportTransition');
  const transitionUri = vscode.Uri.joinPath(folder, 'C1ManualImportTransition.php');
  await vscode.workspace.fs.writeFile(transitionUri, Buffer.from(transitionSource));
  let transitionDocument = await vscode.workspace.openTextDocument(transitionUri);
  await vscode.window.showTextDocument(transitionDocument);
  const transitionCandidates = async (expectedNamespace: 'External' | 'Alternative'): Promise<vscode.CompletionList> => {
    const text = transitionDocument.getText();
    const prefix = `${expectedNamespace}\\C1ExternalTypePro`;
    return waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', transitionUri,
        transitionDocument.positionAt(text.indexOf(prefix) + prefix.length)),
      (result) => result?.items.filter((item) => item.label === 'C1ExternalTypeProbe').length === 1
        && result.items.some((item) => item.label === 'C1ExternalTypeProbe'
          && item.detail === `App\\C1\\${expectedNamespace}\\C1ExternalTypeProbe`),
      `SoPHP kept a stale manual import completion after switching to ${expectedNamespace}.`,
    );
  };
  await transitionCandidates('External');
  const pathEdit = new vscode.WorkspaceEdit();
  const pathStart = transitionSource.indexOf('External\\C1ExternalTypePro');
  pathEdit.replace(transitionUri, new vscode.Range(transitionDocument.positionAt(pathStart),
    transitionDocument.positionAt(pathStart + 'External'.length)), 'Alternative');
  assert.ok(await vscode.workspace.applyEdit(pathEdit), 'Could not switch the manual import without saving.');
  assert.ok(transitionDocument.isDirty);
  await transitionCandidates('Alternative');
  await vscode.commands.executeCommand('workbench.action.files.revert');
  assert.strictEqual(transitionDocument.getText(), transitionSource, 'Revert did not restore the on-disk manual import.');
  await transitionCandidates('External');
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  transitionDocument = await vscode.workspace.openTextDocument(transitionUri);
  assert.strictEqual(transitionDocument.getText(), transitionSource);
  await vscode.window.showTextDocument(transitionDocument);
  await transitionCandidates('External');
  if (/^8\./.test(targetPhpVersion ?? runtimeVersion ?? '')) {
    const compositeSource = '<?php namespace App\\C1; '
      + 'function acceptComposite(int|C1ExternalTypePro $value): void {} '
      + 'function returnComposite(): int|C1ExternalTypePro {} '
      + 'function acceptMapped(#[MapRequestPayload(validationGroups: ["create", "write"])] C1ExternalTypePro $value): void {} '
      + 'class CompositeHolder { public Countable&C1ExternalTypePro $value; }';
    const compositeUri = vscode.Uri.joinPath(folder, 'C1CompositeTypeConsumer.php');
    await vscode.workspace.fs.writeFile(compositeUri, Buffer.from(compositeSource));
    const compositeDocument = await vscode.workspace.openTextDocument(compositeUri);
    await vscode.window.showTextDocument(compositeDocument);
    for (const marker of ['int|C1ExternalTypePro $value', 'int|C1ExternalTypePro {}',
      '] C1ExternalTypePro $value',
      'Countable&C1ExternalTypePro $value']) {
      const position = compositeDocument.positionAt(compositeSource.indexOf(marker) + marker.indexOf('C1ExternalTypePro')
        + 'C1ExternalTypePro'.length);
      const result = await waitForResult(
        () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', compositeUri, position),
        (list) => list?.items.some((item) => item.label === 'C1ExternalTypeProbe'
          && item.additionalTextEdits?.some((entry) => entry.newText.includes('use App\\C1\\External\\C1ExternalTypeProbe;'))) === true,
        `SoPHP did not complete and import the class in ${marker}.`,
      );
      assert.strictEqual(result.items.filter((item) => item.label === 'C1ExternalTypeProbe'
        && item.detail === 'App\\C1\\External\\C1ExternalTypeProbe').length, 1);
    }
  }
  if (process.env.PHP_COMPANION_TEST_C1_SOURCE_CLASSMAP === '1') {
    const classmapProject = vscode.Uri.joinPath(workspace.uri, 'c1-classmap-project');
    const classmapDirectory = vscode.Uri.joinPath(classmapProject, 'legacy');
    await vscode.workspace.fs.createDirectory(classmapDirectory);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(classmapProject, 'composer.json'), Buffer.from(JSON.stringify({
      autoload: { classmap: ['legacy/'] },
    })));
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(classmapDirectory, 'Bundle.php'), Buffer.from(
      '<?php namespace Legacy\\Host; class C1ClassmapTypeProbe {}'));
    const classmapSource = '<?php namespace Consumer; function useClassmap(): void { new C1ClassmapTypePro; }';
    const classmapConsumerUri = vscode.Uri.joinPath(classmapProject, 'Consumer.php');
    await vscode.workspace.fs.writeFile(classmapConsumerUri, Buffer.from(classmapSource));
    const classmapDocument = await vscode.workspace.openTextDocument(classmapConsumerUri);
    await vscode.window.showTextDocument(classmapDocument);
    const classmapCompletion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', classmapConsumerUri,
        classmapDocument.positionAt(classmapSource.indexOf('C1ClassmapTypePro') + 'C1ClassmapTypePro'.length)),
      (result) => result?.items.some((item) => item.label === 'C1ClassmapTypeProbe'
        && item.additionalTextEdits?.some((entry) => entry.newText.includes('use Legacy\\Host\\C1ClassmapTypeProbe;'))) === true,
      'SoPHP did not complete a class from an unopened Composer classmap file in VS Code.',
    );
    assert.strictEqual(classmapCompletion.items.filter((item) => item.label === 'C1ClassmapTypeProbe').length, 1);
    const classmapImportSource = '<?php namespace Consumer; use Leg; class C1ClassmapImportConsumer {}';
    const classmapImportUri = vscode.Uri.joinPath(classmapProject, 'ImportConsumer.php');
    await vscode.workspace.fs.writeFile(classmapImportUri, Buffer.from(classmapImportSource));
    const classmapImportDocument = await vscode.workspace.openTextDocument(classmapImportUri);
    const classmapImportEditor = await vscode.window.showTextDocument(classmapImportDocument);
    const classmapImportOffset = classmapImportSource.indexOf('use Leg') + 'use Leg'.length;
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', classmapImportUri,
        classmapImportDocument.positionAt(classmapImportOffset)),
      (result) => result?.items.some((item) => item.label === 'Legacy\\' && item.kind === vscode.CompletionItemKind.Module) === true,
      'SoPHP did not suggest a classmap namespace from the declaration in VS Code.',
    );
    classmapImportEditor.selection = new vscode.Selection(classmapImportDocument.positionAt(classmapImportOffset),
      classmapImportDocument.positionAt(classmapImportOffset));
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    assert.strictEqual(classmapImportDocument.getText(), classmapImportSource.replace('use Leg;', 'use Legacy\\;'),
      'Accepting the classmap namespace suggestion did not finish the use prefix.');
    const classmapImportText = classmapImportDocument.getText();
    await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', classmapImportUri,
        classmapImportDocument.positionAt(classmapImportText.indexOf('use Legacy\\') + 'use Legacy\\'.length)),
      (result) => result?.items.some((item) => item.label === 'Host\\' && item.kind === vscode.CompletionItemKind.Module) === true,
      'SoPHP did not suggest the nested classmap namespace in VS Code.',
    );

    const psr0Project = vscode.Uri.joinPath(workspace.uri, 'c1-psr0-project');
    const psr0Directory = vscode.Uri.joinPath(psr0Project, 'legacy', 'Legacy');
    await vscode.workspace.fs.createDirectory(psr0Directory);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(psr0Project, 'composer.json'), Buffer.from(JSON.stringify({
      autoload: { 'psr-0': { 'Legacy_': 'legacy/' } },
    })));
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(psr0Directory, 'C1Psr0TypeProbe.php'), Buffer.from(
      '<?php class Legacy_C1Psr0TypeProbe {}'));
    const wrongPsr0Uri = vscode.Uri.joinPath(psr0Project, 'legacy', 'Wrong.php');
    await vscode.workspace.fs.writeFile(wrongPsr0Uri, Buffer.from(
      '<?php class Legacy_C1Psr0WrongProbe {}'));
    const psr0Source = '<?php namespace Consumer; function usePsr0(): void { new Legacy_C1Psr0TypePro; new Legacy_C1Psr0WrongPro; }';
    const psr0ConsumerUri = vscode.Uri.joinPath(psr0Project, 'Consumer.php');
    await vscode.workspace.fs.writeFile(psr0ConsumerUri, Buffer.from(psr0Source));
    const psr0Document = await vscode.workspace.openTextDocument(psr0ConsumerUri);
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(wrongPsr0Uri));
    await vscode.window.showTextDocument(psr0Document);
    const psr0Completion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', psr0ConsumerUri,
        psr0Document.positionAt(psr0Source.indexOf('Legacy_C1Psr0TypePro') + 'Legacy_C1Psr0TypePro'.length)),
      (result) => result?.items.some((item) => item.label === 'Legacy_C1Psr0TypeProbe'
        && item.additionalTextEdits?.some((entry) => entry.newText.includes('use Legacy_C1Psr0TypeProbe;'))) === true,
      'SoPHP did not complete an unopened Composer PSR-0 class in VS Code.',
    );
    assert.strictEqual(psr0Completion.items.filter((item) => item.label === 'Legacy_C1Psr0TypeProbe').length, 1);
    const wrongPsr0Completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', psr0ConsumerUri,
      psr0Document.positionAt(psr0Source.indexOf('Legacy_C1Psr0WrongPro') + 'Legacy_C1Psr0WrongPro'.length));
    assert.ok(!wrongPsr0Completion?.items.some((item) => item.label === 'Legacy_C1Psr0WrongProbe'),
      `SoPHP suggested a PSR-0 class from a path that Composer cannot load: ${JSON.stringify(
        wrongPsr0Completion?.items.filter((item) => item.label === 'Legacy_C1Psr0WrongProbe'))}`);
  }
  if (process.env.PHP_COMPANION_TEST_C1_PSR0_DEPENDENCY === '1') {
    const psr0Project = vscode.Uri.joinPath(workspace.uri, 'c1-psr0-dependency');
    const consumerUri = vscode.Uri.joinPath(psr0Project, 'src', 'Consumer.php');
    const vendorUri = vscode.Uri.joinPath(psr0Project, 'vendor', 'sohophp', 'legacy-psr0-fixture',
      'src', 'Legacy', 'Component', 'Widget.php');
    const qualifiedSource = '<?php namespace Consumer; function navigate(): void { new \\Legacy_Component_Widget; }';
    const qualifiedUri = vscode.Uri.joinPath(psr0Project, 'src', 'Qualified.php');
    await vscode.workspace.fs.writeFile(qualifiedUri, Buffer.from(qualifiedSource));
    const qualified = await vscode.workspace.openTextDocument(qualifiedUri);
    await vscode.window.showTextDocument(qualified);
    const definition = await waitForResult(
      () => vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', qualifiedUri,
        qualified.positionAt(qualifiedSource.indexOf('Legacy_Component_Widget') + 8)),
      (result) => result?.some((item) => item.uri.toString() === vendorUri.toString()) === true,
      'SoPHP did not navigate cold to the installed Composer PSR-0 dependency.',
    );
    assert.ok(definition.every((item) => item.uri.toString() === vendorUri.toString()));
    const consumer = await vscode.workspace.openTextDocument(consumerUri);
    await vscode.window.showTextDocument(consumer);
    const source = consumer.getText();
    const completion = await waitForResult(
      () => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', consumerUri,
        consumer.positionAt(source.indexOf('Legacy_Component_Wid') + 'Legacy_Component_Wid'.length)),
      (result) => result?.items.some((item) => item.label === 'Legacy_Component_Widget'
        && item.additionalTextEdits?.some((entry) => entry.newText.includes('use Legacy_Component_Widget;'))) === true,
      'SoPHP did not complete the installed Composer PSR-0 dependency with its import.',
    );
    assert.strictEqual(completion.items.filter((item) => item.label === 'Legacy_Component_Widget').length, 1);
  }
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
    const expected = firstTargetPhpVersion.startsWith('7.') ? ['match expression', 'enum', '(void) cast']
      : firstTargetPhpVersion === '8.0' ? ['enum', '(void) cast']
        : firstTargetPhpVersion === '8.5' ? [] : ['(void) cast'];
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
    const syntaxEdgeUri = vscode.Uri.joinPath(folder, 'VersionSyntaxEdges.php');
    const syntaxEdgeSource = `<?php namespace App\\C1;
class C1VersionSyntaxMarker {}
$label = "a|>b" . "c"; $total = 1 + /* |> */ 2;
$text = "start"; $text .= "??="; $count = 1; $count += /* ??= */ 2;
function accept(int $value): void {}
accept(1, /* note */);`;
    await vscode.workspace.fs.writeFile(syntaxEdgeUri, Buffer.from(syntaxEdgeSource));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(syntaxEdgeUri));
    const edgeDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(syntaxEdgeUri)),
      (result) => result.some((item) => item.code === 'php.type.filename')
        && (firstTargetPhpVersion !== '7.2' || result.some((item) => item.code === 'php.version.unsupported'
          && item.message.includes('trailing comma in a call'))),
      `SoPHP did not publish the PHP ${firstTargetPhpVersion} syntax-edge diagnostics in VS Code.`,
    );
    const edgeVersions = edgeDiagnostics.filter((item) => item.code === 'php.version.unsupported');
    assert.deepStrictEqual(edgeVersions.map((item) => item.message.includes('trailing comma in a call')),
      firstTargetPhpVersion === '7.2' ? [true] : [],
      `PHP ${firstTargetPhpVersion} misdiagnosed operator text or a commented call comma.`);
    if (edgeVersions.length) assert.strictEqual((await vscode.workspace.openTextDocument(syntaxEdgeUri)).getText(edgeVersions[0]!.range), ',');
    const commentUri = vscode.Uri.joinPath(folder, 'VersionPromotionComment.php');
    const commentSource = '<?php namespace App\\C1; class C1PromotionComment { public function __construct(public /* final */ string $name) {} }';
    await vscode.workspace.fs.writeFile(commentUri, Buffer.from(commentSource));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(commentUri));
    const commentDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(commentUri)),
      (result) => result.some((item) => item.code === 'php.type.filename'),
      `SoPHP did not process the PHP ${firstTargetPhpVersion} promotion-comment fixture in VS Code.`,
    );
    assert.ok(!commentDiagnostics.some((item) => item.code === 'php.version.unsupported'
      && item.message.includes('final promoted property')), 'SoPHP treated a promotion comment as final.');
    const finalUri = vscode.Uri.joinPath(folder, 'VersionPromotionFinal.php');
    const finalSource = '<?php namespace App\\C1; class C1PromotionFinal { public function __construct(public final string $name) {} }';
    await vscode.workspace.fs.writeFile(finalUri, Buffer.from(finalSource));
    const finalDocument = await vscode.workspace.openTextDocument(finalUri);
    await vscode.window.showTextDocument(finalDocument);
    const promotionDiagnostics = await waitForResult(
      () => Promise.resolve(vscode.languages.getDiagnostics(finalUri)),
      (result) => firstTargetPhpVersion === '8.5'
        ? result.some((item) => item.code === 'php.type.filename')
        : result.some((item) => item.code === 'php.version.unsupported'
          && item.message.includes('final promoted property')),
      `SoPHP did not publish the PHP ${firstTargetPhpVersion} promotion diagnostics in VS Code.`,
    );
    const finalVersions = promotionDiagnostics.filter((item) => item.code === 'php.version.unsupported'
      && item.message.includes('final promoted property'));
    assert.strictEqual(finalVersions.length, firstTargetPhpVersion === '8.5' ? 0 : 1,
      `PHP ${firstTargetPhpVersion} missed or misreported a real final modifier.`);
    if (finalVersions.length) assert.strictEqual(finalDocument.getText(finalVersions[0]!.range), 'final');
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
      await waitForResult(() => vscode.commands.executeCommand<string>('phpCompanion._testVersionStatus'),
        (value) => value?.includes('SoPHP: 8.5') === true,
        'SoPHP status bar displayed the parent PHP version while editing the nested project.');
      const nestedVersionChoices = await vscode.commands.executeCommand<{
        placeHolder: string; items: Array<{ label: string; description?: string }>
      }>('phpCompanion._testVersionChoices');
      assert.ok(nestedVersionChoices?.placeHolder.includes('workspace'),
        'The PHP version picker did not explain its workspace-wide setting scope.');
      assert.strictEqual(nestedVersionChoices.items.find((item) => item.label === 'PHP 8.5')?.description, '$(check)',
        'The PHP version picker marked the parent version instead of the active nested project version.');
      const parentVersionAfterNestedUri = vscode.Uri.joinPath(folder, 'AfterNestedVersioned.php');
      await vscode.workspace.fs.writeFile(parentVersionAfterNestedUri, Buffer.from(versionSource));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(parentVersionAfterNestedUri));
      const parentDiagnosticsAfterNested = await waitForResult(() => Promise.resolve(vscode.languages.getDiagnostics(parentVersionAfterNestedUri)),
        (result) => result.filter((item) => item.code === 'php.version.unsupported').length === 3,
        'SoPHP replaced the parent PHP 7.2 target after opening the nested PHP 8.5 project.');
      assert.ok(!parentDiagnosticsAfterNested.some((item) => item.code === 'php.syntax'));
      await waitForResult(() => vscode.commands.executeCommand<string>('phpCompanion._testVersionStatus'),
        (value) => value?.includes('SoPHP: 7.2') === true,
        'SoPHP status bar kept the nested PHP version after returning to the parent project.');
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
  const chainRounds = Number(process.env.PHP_COMPANION_TEST_C1_CHAIN_ROUNDS ?? 0);
  assert.ok(Number.isSafeInteger(chainRounds) && chainRounds >= 0 && chainRounds <= 1000,
    'PHP_COMPANION_TEST_C1_CHAIN_ROUNDS must be an integer from 0 to 1000.');
  if (chainRounds) {
    assert.strictEqual(process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR, '1',
      'The real vendor six-query chain requires PHP_COMPANION_TEST_C1_REAL_VENDOR=1.');
    await verifyRealVendorEditingChain(chainRounds, timingApi.requestLanguageServer);
  }
  if (c1DebugPort) {
    await timingApi.requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
    const visibleSuggestion = await measureVisibleSuggestion(Number(c1DebugPort), folder);
    const suggestionServerTimings = await timingApi.requestLanguageServer<Record<string, number[]>>(
      'phpCompanion/testQueryTimings', { reset: true });
    console.log(`C1 visible PHP suggestion after typing: ${JSON.stringify({ ...visibleSuggestion,
      serverCompletionMs: suggestionServerTimings.completion ?? [] })}`);
    const visibleTypeSuggestion = await measureVisibleTypeSuggestion(Number(c1DebugPort), folder);
    console.log(`C1 visible cross-namespace type suggestion after typing: ${JSON.stringify(visibleTypeSuggestion)}`);
    if (process.env.PHP_COMPANION_TEST_C1_PSR0_DEPENDENCY === '1') {
      const psr0Suggestion = await measureVisibleInstalledPsr0Type(Number(c1DebugPort),
        vscode.Uri.joinPath(workspace.uri, 'c1-psr0-dependency'));
      console.log(`C1 visible installed Composer PSR-0 type suggestion: ${JSON.stringify(psr0Suggestion)}`);
    }
    if (process.env.PHP_COMPANION_TEST_C1_QUICK_DELAY_PROBE === '1') {
      const configuration = vscode.workspace.getConfiguration('editor', folder);
      const originalDelay = configuration.get<number>('quickSuggestionsDelay');
      try {
        await configuration.update('quickSuggestionsDelay', 0, vscode.ConfigurationTarget.Workspace);
        const zeroDelay = await measureVisibleSuggestion(Number(c1DebugPort), folder, false, 6);
        await configuration.update('quickSuggestionsDelay', originalDelay, vscode.ConfigurationTarget.Workspace);
        const restored = await measureVisibleSuggestion(Number(c1DebugPort), folder, false, 12);
        console.log(`C1 quick suggestions delay A/B/A: ${JSON.stringify({ originalDelay,
          defaultMs: visibleSuggestion.samplesMs, zeroMs: zeroDelay.samplesMs, restoredMs: restored.samplesMs })}`);
      } finally {
        await configuration.update('quickSuggestionsDelay', originalDelay, vscode.ConfigurationTarget.Workspace);
      }
    }
    if (process.env.PHP_COMPANION_TEST_C1_WORKBENCH_INPUT_PROBE === '1') {
      const workbenchInput = await measureVisibleSuggestion(Number(c1DebugPort), folder, false, 18, 'workbench');
      console.log(`C1 Workbench input visible suggestions: ${JSON.stringify(workbenchInput)}`);
    }
    if (process.env.PHP_COMPANION_TEST_C1_UI === '1') {
      const vendorSuggestion = await measureVisibleSuggestion(Number(c1DebugPort), folder, true);
      console.log(`C1 visible vendor suggestion after typing: ${JSON.stringify(vendorSuggestion)}`);
      const switchedSuggestion = await measureUnsavedReceiverSuggestion(Number(c1DebugPort), folder);
      console.log(`C1 visible unsaved receiver switch: ${JSON.stringify(switchedSuggestion)}`);
      const rapidRounds = Number(process.env.PHP_COMPANION_TEST_C1_RAPID_ROUNDS ?? 10);
      assert.ok(Number.isSafeInteger(rapidRounds) && rapidRounds >= 1 && rapidRounds <= 1_000,
        'PHP_COMPANION_TEST_C1_RAPID_ROUNDS must be an integer from 1 to 1,000.');
      const rapidSuggestion = await measureRapidReceiverSuggestion(Number(c1DebugPort), folder, rapidRounds);
      assert.deepStrictEqual(rapidSuggestion.staleRounds, [],
        'SoPHP showed a method from the previous unsaved receiver type while typing.');
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
  const removedFolder = vscode.workspace.workspaceFolders?.[1];
  assert.ok(removedFolder, 'The C1 workspace removal check needs a second Composer root.');
  const versionStateFolders = async (): Promise<string[]> => (await vscode.commands.executeCommand<string[]>(
    'phpCompanion._testVersionStateFolders')) ?? [];
  assert.ok((await versionStateFolders()).includes(removedFolder.uri.toString()),
    'The second Composer root had no version state before removal.');
  assert.ok(vscode.workspace.updateWorkspaceFolders(removedFolder.index, 1),
    'Could not remove the second Composer root from the workspace.');
  await waitForResult(versionStateFolders,
    (folders) => !folders.includes(removedFolder.uri.toString()) && folders.includes(workspace.uri.toString()),
    'SoPHP retained version state for a removed Composer workspace.');
  console.log('C1 removed Composer workspace no longer appears in active PHP version states');
}

import * as assert from 'node:assert';
import { symlink } from 'node:fs/promises';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0];
  assert.ok(root, 'C2 diagnostics test requires the Composer fixture.');
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', root.uri).get('indexing.mode'), 'onDemand');
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', root.uri).get('phpVersion'), '8.5');
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load.');
  if (process.env.PHP_COMPANION_TEST_C2_OPEN_SOURCE_PROFILE === '1') {
    const profileIds = ['sohophp.php-companion-symfony', 'sohophp.php-companion-open-source-pack',
      'sohophp.twig-plus', 'redhat.vscode-yaml', 'redhat.vscode-xml', 'xdebug.php-debug',
      'junstyle.php-cs-fixer', 'EditorConfig.EditorConfig', 'eiminsasete.apacheconf-snippets',
      'neilbrayfield.php-docblocker'];
    for (const id of profileIds) assert.ok(vscode.extensions.getExtension(id), `Open Source Pack member ${id} is missing.`);
    const apacheUri = vscode.Uri.joinPath(root.uri, '.htaccess');
    const apacheSource = 'a-force-ht';
    await vscode.workspace.fs.writeFile(apacheUri, Buffer.from(apacheSource));
    const apacheDocument = await vscode.workspace.openTextDocument(apacheUri);
    assert.strictEqual(apacheDocument.languageId, 'apacheconf', 'Apache syntax extension did not claim .htaccess.');
    const apacheEditor = await vscode.window.showTextDocument(apacheDocument);
    const apacheCompletion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', apacheUri, apacheDocument.positionAt(apacheSource.length));
    const forceHttps = apacheCompletion?.items.find((item) => item.kind === vscode.CompletionItemKind.Snippet
      && (typeof item.label === 'string' ? item.label : item.label.label) === 'a-force-https');
    assert.ok(forceHttps, 'Apache Conf Snippets did not offer Force HTTPS in .htaccess.');
    assert.ok(forceHttps.insertText instanceof vscode.SnippetString, 'Force HTTPS did not contain a snippet body.');
    const replacement = forceHttps.range instanceof vscode.Range ? forceHttps.range
      : forceHttps.range?.replacing ?? new vscode.Range(0, 0, 0, apacheSource.length);
    assert.ok(await apacheEditor.insertSnippet(forceHttps.insertText, replacement),
      'Force HTTPS snippet could not be inserted into .htaccess.');
    const insertedApache = apacheDocument.getText();
    assert.ok(insertedApache.startsWith('RewriteEngine on\nRewriteCond %{HTTPS} !on\n')
      && insertedApache.includes('RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]')
      && insertedApache.includes('Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"')
      && !insertedApache.includes(apacheSource),
    `Force HTTPS snippet produced unexpected Apache configuration: ${JSON.stringify(insertedApache)}`);
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(apacheDocument.getText(), apacheSource, 'Undo did not restore the Apache snippet trigger.');
    await vscode.commands.executeCommand('redo');
    assert.strictEqual(apacheDocument.getText(), insertedApache, 'Redo did not restore the Apache configuration.');
    console.log('C2 Open Source Pack Apache snippet: completion, insertion, one Undo/Redo');
    console.log(`C2 Open Source Pack profile loaded Core, Pack metadata, Symfony and 8 external members (${profileIds.length + 1} extensions)`);
  }
  const api = await extension.activate() as { requestLanguageServer?: <T>(method: string, params: unknown) => Promise<T> };
  assert.ok(api.requestLanguageServer, 'SoPHP Core did not expose the test timing request bridge.');
  const missingDelimiterUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'C2MissingDelimiter.php');
  const validDelimiterSource = '<?php function c2MissingDelimiter(): void {}';
  await vscode.workspace.fs.writeFile(missingDelimiterUri, Buffer.from(validDelimiterSource));
  const missingDelimiterDocument = await vscode.workspace.openTextDocument(missingDelimiterUri);
  await vscode.window.showTextDocument(missingDelimiterDocument);
  const missingDelimiterEdit = new vscode.WorkspaceEdit();
  missingDelimiterEdit.replace(missingDelimiterUri,
    new vscode.Range(missingDelimiterDocument.positionAt(0), missingDelimiterDocument.positionAt(validDelimiterSource.length)),
    '<?php function c2MissingDelimiter(: void {}');
  assert.ok(await vscode.workspace.applyEdit(missingDelimiterEdit));
  assert.ok(missingDelimiterDocument.isDirty, 'Missing delimiter input must stay unsaved');
  const missingDelimiterDiagnostics = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(missingDelimiterUri)
    .filter((diagnostic) => diagnostic.source === 'SoPHP' && diagnostic.code === 'php.syntax');
  const missingDelimiterDeadline = Date.now() + 10_000;
  while (Date.now() < missingDelimiterDeadline && missingDelimiterDiagnostics().length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepStrictEqual(missingDelimiterDiagnostics().map((diagnostic) => missingDelimiterDocument.getText(diagnostic.range)), [':'],
    'SoPHP did not locate the missing closing delimiter in the unsaved PHP editor');
  await vscode.commands.executeCommand('undo');
  assert.strictEqual(missingDelimiterDocument.getText(), validDelimiterSource);
  const clearDelimiterDeadline = Date.now() + 10_000;
  while (Date.now() < clearDelimiterDeadline && missingDelimiterDiagnostics().length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepStrictEqual(missingDelimiterDiagnostics(), [], 'SoPHP kept the old missing-delimiter error after Undo');
  console.log('C2 missing closing delimiter: unsaved syntax diagnostic and Undo withdrawal');
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ControlFlowDiagnostics.php');
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const expected = ['cleanup();', 'unreachableAfterConditional();', 'unreachableAfterSwitch();',
    'unreachableAfterInfiniteLoop();', 'unreachableAfterInitializedFor();', 'unreachableAfterNeverCall();',
    'unreachableAfterNestedNeverCall();', 'unreachableAfterNeverCondition();', 'unreachableAfterNestedThrow();',
    'unreachableAfterThrowTernary();'];
  const actual = (): string[] => vscode.languages.getDiagnostics(uri)
    .filter((item) => item.source === 'SoPHP' && item.code === 'php.control-flow.unreachable')
    .map((item) => document.getText(item.range));
  const waitForCount = async (count: number): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && actual().length !== count) await new Promise((resolve) => setTimeout(resolve, 50));
  };
  await waitForCount(expected.length);
  assert.deepStrictEqual(actual(), expected, 'Default onDemand omitted proven same-file never calls or reported an unproven call.');
  const signature = 'function stopNow(): never';
  const returnOffset = document.getText().indexOf(signature) + 'function stopNow(): '.length;
  assert.ok(returnOffset >= 'function stopNow(): '.length, 'The fixture lost its native never declaration.');
  const replaceType = async (oldType: string, newType: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(returnOffset), document.positionAt(returnOffset + oldType.length)), newType);
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not change ${oldType} to ${newType} in the unsaved PHP buffer.`);
    assert.ok(document.isDirty, 'The diagnostic test unexpectedly saved the PHP buffer.');
  };
  await replaceType('never', 'void');
  const withoutNever = expected.filter((item) => !item.includes('Never'));
  await waitForCount(withoutNever.length);
  assert.deepStrictEqual(actual(), withoutNever, 'The editor kept unreachable diagnostics after never became void.');
  await replaceType('void', 'never');
  await waitForCount(expected.length);
  assert.deepStrictEqual(actual(), expected, 'The editor did not restore unreachable diagnostics after never returned.');
  const events: Array<{ version: number; count: number; atMs: number }> = [];
  await api.requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const subscription = vscode.languages.onDidChangeDiagnostics((event) => {
    if (event.uris.some((changed) => changed.toString() === uri.toString())) {
      events.push({ version: document.version, count: actual().length, atMs: performance.now() });
    }
  });
  try {
    for (let round = 0; round < 20; round += 1) {
      await replaceType(round % 2 === 0 ? 'never' : 'void', round % 2 === 0 ? 'void' : 'never');
    }
    const finalStarted = performance.now();
    await replaceType('never', 'void');
    const finalVersion = document.version;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !events.some((event) => event.version >= finalVersion && event.count === withoutNever.length)) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(events.some((event) => event.version >= finalVersion && event.count === withoutNever.length),
      'The editor did not publish diagnostics for the final rapid void edit.');
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.deepStrictEqual(actual(), withoutNever, 'The final rapid edit kept an old never diagnostic.');
    assert.ok(!events.some((event) => event.version >= finalVersion && event.count !== 0 && event.count !== withoutNever.length),
      `A stale diagnostic was published after the final rapid edit: ${JSON.stringify(events)}`);
    const cleared = events.find((event) => event.version >= finalVersion && event.count === 0);
    const restored = events.find((event) => event.version >= finalVersion && event.count === withoutNever.length);
    assert.ok(restored);
    const timings = await api.requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
    console.log(`C2 onDemand native never diagnostics: ${JSON.stringify({ sequential: [expected.length, withoutNever.length, expected.length],
      rapidFinal: withoutNever.length, events: events.length, finalVisibleMs: Math.round(restored.atMs - finalStarted),
      clearedMs: cleared && Math.round(cleared.atMs - finalStarted),
      blankMs: cleared && Math.round(restored.atMs - cleared.atMs), serverDiagnosticsMs: timings.diagnostics?.at(-1),
      serverChangeMs: timings.documentChangeDiagnostics?.at(-1), unsaved: document.isDirty })}`);
  } finally {
    subscription.dispose();
  }

  const localUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'LocalArgumentDiagnostics.php');
  const source = `<?php
declare(strict_types=1);
namespace App\\Service;
function takeLocal(int $value): void {}
final class LocalArgumentDiagnostics { public function accept(int $value): void {} }
function inspect(LocalArgumentDiagnostics $local): void { takeLocal('bad'); takeLocal(); $local->accept('bad'); takeLocal(other: 1); takeLocal(value: 1, value: 2); }
`;
  await vscode.workspace.fs.writeFile(localUri, Buffer.from(source));
  const localDocument = await vscode.workspace.openTextDocument(localUri);
  await vscode.window.showTextDocument(localDocument);
  const argumentCodes = (): string[] => vscode.languages.getDiagnostics(localUri)
    .filter((item) => item.source === 'SoPHP' && String(item.code).startsWith('php.argument.'))
    .map((item) => String(item.code)).sort();
  const expectedArguments = ['php.argument.duplicate-named', 'php.argument.missing-required', 'php.argument.type-mismatch',
    'php.argument.type-mismatch', 'php.argument.unknown-named'];
  const argumentDeadline = Date.now() + 20_000;
  while (Date.now() < argumentDeadline && argumentCodes().length !== expectedArguments.length) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepStrictEqual(argumentCodes(), expectedArguments, 'Default onDemand did not show proven same-file argument errors.');
  const repaired = source.replace("takeLocal('bad'); takeLocal(); $local->accept('bad'); takeLocal(other: 1); takeLocal(value: 1, value: 2);",
    'takeLocal(1); takeLocal(2); $local->accept(3); takeLocal(value: 1); takeLocal(value: 2);');
  const repair = new vscode.WorkspaceEdit();
  repair.replace(localUri, new vscode.Range(new vscode.Position(0, 0), localDocument.positionAt(localDocument.getText().length)), repaired);
  assert.ok(await vscode.workspace.applyEdit(repair), 'Could not repair local argument calls in the unsaved buffer.');
  assert.ok(localDocument.isDirty);
  const repairedDeadline = Date.now() + 20_000;
  while (Date.now() < repairedDeadline && argumentCodes().length > 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(argumentCodes(), [], 'Default onDemand kept same-file argument errors after the calls were repaired.');
  console.log('C2 onDemand same-file argument diagnostics: 5 → 0, unsaved');

  const nestedUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NestedArrayFeedback.php');
  const nestedSource = `<?php namespace App\\Service;
function dispatchNested(array $payload, string $mode): void {}
dispatchNested(array('x'));
dispatchNested(payload: array('x'), extra: 'dev');
dispatchNested(array('x'), 'dev');
`;
  await vscode.workspace.fs.writeFile(nestedUri, Buffer.from(nestedSource));
  const nestedDocument = await vscode.workspace.openTextDocument(nestedUri);
  await vscode.window.showTextDocument(nestedDocument);
  const nestedErrors = (): string[] => vscode.languages.getDiagnostics(nestedUri)
    .filter((item) => item.source === 'SoPHP' && (item.code === 'php.argument.missing-required'
      || item.code === 'php.argument.unknown-named'))
    .map((item) => String(item.code)).sort();
  const nestedExpected = ['php.argument.missing-required', 'php.argument.unknown-named'];
  const nestedDeadline = Date.now() + 20_000;
  while (Date.now() < nestedDeadline && nestedErrors().length !== nestedExpected.length)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(nestedErrors(), nestedExpected, 'Default onDemand omitted nested-array argument diagnostics.');
  const nestedHints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
    'vscode.executeInlayHintProvider', nestedUri, new vscode.Range(nestedDocument.positionAt(0),
      nestedDocument.positionAt(nestedDocument.getText().length))) ?? [];
  assert.deepStrictEqual(nestedHints.filter((hint) => nestedDocument.offsetAt(hint.position) >= nestedSource.lastIndexOf('dispatchNested('))
    .map((hint) => hint.label), ['$payload:', '$mode:'], 'The editor omitted parameter hints for the outer nested-array call.');
  const correctedNested = nestedSource.replace("dispatchNested(array('x'));", "dispatchNested(array('x'), 'dev');")
    .replace("extra: 'dev'", "mode: 'dev'");
  const nestedEdit = new vscode.WorkspaceEdit();
  nestedEdit.replace(nestedUri, new vscode.Range(nestedDocument.positionAt(0),
    nestedDocument.positionAt(nestedDocument.getText().length)), correctedNested);
  assert.ok(await vscode.workspace.applyEdit(nestedEdit));
  assert.ok(nestedDocument.isDirty, 'The nested-array diagnostic edit unexpectedly saved the PHP buffer.');
  const nestedCorrectedDeadline = Date.now() + 20_000;
  while (Date.now() < nestedCorrectedDeadline && nestedErrors().length)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(nestedErrors(), [], 'The editor kept nested-array argument diagnostics after unsaved repair.');
  console.log('C2 onDemand nested-array calls: two diagnostics, two parameter hints, unsaved repair clears diagnostics');

  const nestedNamedUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NestedNamedCompletion.php');
  const nestedNamedSource = `<?php namespace App\\Service;
function innerNamed(int $second): int { return $second; }
function outerNamed(int $first, int $second): void {}
outerNamed(innerNamed(second: 1), /* next, ) argument */ se
`;
  await vscode.workspace.fs.writeFile(nestedNamedUri, Buffer.from(nestedNamedSource));
  const nestedNamedDocument = await vscode.workspace.openTextDocument(nestedNamedUri);
  await vscode.window.showTextDocument(nestedNamedDocument);
  const nestedNamedPosition = nestedNamedDocument.positionAt(nestedNamedSource.lastIndexOf(' se\n') + 3);
  const nestedNamedCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', nestedNamedUri, nestedNamedPosition);
  assert.ok(nestedNamedCompletions?.items.some((item) => item.label === 'second:'),
    'The outer second: completion was hidden by the inner second: argument.');
  const nestedNamedHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', nestedNamedUri, nestedNamedPosition);
  assert.ok(nestedNamedHelp?.signatures.some((item) => item.label.includes('outerNamed(')),
    'Signature Help lost the outer call after a nested named argument.');
  assert.strictEqual(nestedNamedHelp?.activeParameter, 1,
    'Signature Help selected the inner parameter instead of the outer second parameter.');
  console.log('C2 nested named arguments: outer completion and Signature Help keep the second parameter');
  const attributedNamedSource = `<?php namespace App\\Service;
function outerNamed(callable $first, int $second): void {}
outerNamed(fn(#[\\SensitiveParameter] int $value): int => $value, se
`;
  const attributedEdit = new vscode.WorkspaceEdit();
  attributedEdit.replace(nestedNamedUri, new vscode.Range(nestedNamedDocument.positionAt(0),
    nestedNamedDocument.positionAt(nestedNamedDocument.getText().length)), attributedNamedSource);
  assert.ok(await vscode.workspace.applyEdit(attributedEdit), 'Could not enter the attributed arrow call.');
  assert.ok(nestedNamedDocument.isDirty, 'The attributed arrow input was unexpectedly saved.');
  const attributedNamedPosition = nestedNamedDocument.positionAt(attributedNamedSource.lastIndexOf(' se\n') + 3);
  const attributedNamedCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', nestedNamedUri, attributedNamedPosition);
  assert.ok(attributedNamedCompletions?.items.some((item) => item.label === 'second:'),
    'The attributed arrow argument hid the outer second: completion.');
  const attributedNamedHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', nestedNamedUri, attributedNamedPosition);
  assert.ok(attributedNamedHelp?.signatures.some((item) => item.label.includes('outerNamed(')),
    'The attributed arrow argument hid the outer Signature Help.');
  assert.strictEqual(attributedNamedHelp?.activeParameter, 1,
    'The attributed arrow argument selected the wrong outer parameter.');
  console.log('C2 attributed arrow input: unsaved outer named completion and Signature Help use second');

  const remainingUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'RemainingNamedSignature.php');
  const remainingSource = `<?php namespace App\\Service;
function configure(string $host, int $port, bool $tls): void {}
configure(tls: true, `;
  await vscode.workspace.fs.writeFile(remainingUri, Buffer.from(remainingSource));
  const remainingDocument = await vscode.workspace.openTextDocument(remainingUri);
  await vscode.window.showTextDocument(remainingDocument);
  const remainingHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', remainingUri, remainingDocument.positionAt(remainingSource.length));
  assert.ok(remainingHelp?.signatures.some((item) => item.label.includes('configure(')),
    'The editor lost the function signature after a named argument.');
  assert.strictEqual(remainingHelp?.activeParameter, 0,
    'The editor highlighted $port instead of the first unused $host parameter.');
  const remainingNames = async (): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', remainingUri,
    remainingDocument.positionAt(remainingDocument.getText().length)))?.items
    .map((item) => String(item.label)).filter((label) => ['host:', 'port:', 'tls:'].includes(label)) ?? [];
  assert.deepStrictEqual(await remainingNames(), ['host:', 'port:'],
    'The editor offered a named argument that was already provided.');
  const mixedSource = remainingSource.replace('tls: true, ', '"local", tls: true, ');
  const mixedEdit = new vscode.WorkspaceEdit();
  mixedEdit.replace(remainingUri, new vscode.Range(new vscode.Position(0, 0),
    remainingDocument.positionAt(remainingDocument.getText().length)), mixedSource);
  assert.ok(await vscode.workspace.applyEdit(mixedEdit));
  assert.ok(remainingDocument.isDirty, 'The mixed argument update unexpectedly saved the PHP buffer.');
  assert.deepStrictEqual(await remainingNames(), ['port:'],
    'The editor offered a positional parameter again as a named argument.');
  console.log('C2 named arguments: Signature Help and completion skip filled parameters after unsaved mixed arguments');

  const unpackedUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'UnpackedNamedSignature.php');
  const unpackedSource = `<?php namespace App\\Service;
function dynamicArguments(): array { return []; }
function unpackedConfigure(string $host, int $port, bool $tls): void {}
$args = dynamicArguments(); unpackedConfigure(...$args, ho`;
  await vscode.workspace.fs.writeFile(unpackedUri, Buffer.from(unpackedSource));
  const unpackedDocument = await vscode.workspace.openTextDocument(unpackedUri);
  await vscode.window.showTextDocument(unpackedDocument);
  const unpackedPosition = unpackedDocument.positionAt(unpackedSource.length);
  const unpackedHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', unpackedUri, unpackedPosition);
  assert.ok(!unpackedHelp?.signatures.some((item) => item.label.includes('unpackedConfigure(')),
    'The editor highlighted a parameter whose position is unknown after dynamic unpacking.');
  const unpackedCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', unpackedUri, unpackedPosition);
  assert.ok(!unpackedCompletions?.items.some((item) => ['host:', 'port:', 'tls:'].includes(String(item.label))),
    'The editor suggested a named parameter that may already be filled by dynamic unpacking.');
  console.log('C2 dynamic argument unpack: uncertain signature highlight and named completions suppressed');

  const literalUnpackedUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'LiteralUnpackedNamedSignature.php');
  const literalUnpackedSource = `<?php namespace App\\Service;
function literalUnpackedConfigure(string $host, int $port, bool $tls): void {}
literalUnpackedConfigure(...['local', 80], t`;
  await vscode.workspace.fs.writeFile(literalUnpackedUri, Buffer.from(literalUnpackedSource));
  const literalUnpackedDocument = await vscode.workspace.openTextDocument(literalUnpackedUri);
  await vscode.window.showTextDocument(literalUnpackedDocument);
  const literalUnpackedPosition = literalUnpackedDocument.positionAt(literalUnpackedSource.length);
  const literalUnpackedHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', literalUnpackedUri, literalUnpackedPosition);
  assert.ok(literalUnpackedHelp?.signatures.some((item) => item.label.includes('literalUnpackedConfigure(')));
  assert.strictEqual(literalUnpackedHelp.activeParameter, 2);
  const literalUnpackedCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', literalUnpackedUri, literalUnpackedPosition);
  assert.ok(literalUnpackedCompletions?.items.some((item) => String(item.label) === 'tls:'),
    'The editor did not suggest the remaining parameter after a literal unpack.');
  console.log('C2 literal argument unpack: signature and named completion follow known array entries');

  const invalidUnpackUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'InvalidLiteralUnpack.php');
  const invalidUnpackSource = `<?php namespace App\\Service;
function literalOrder(string $host, int $port, bool $tls): void {}
literalOrder(...['port' => 80, 'local'], tls: true);`;
  await vscode.workspace.fs.writeFile(invalidUnpackUri, Buffer.from(invalidUnpackSource));
  const invalidUnpackDocument = await vscode.workspace.openTextDocument(invalidUnpackUri);
  await vscode.window.showTextDocument(invalidUnpackDocument);
  const unpackOrderDiagnostic = (): vscode.Diagnostic | undefined => vscode.languages.getDiagnostics(invalidUnpackUri)
    .find((diagnostic) => diagnostic.code === 'php.argument.positional-after-named');
  const waitForUnpackOrder = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && Boolean(unpackOrderDiagnostic()) !== expected) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.strictEqual(Boolean(unpackOrderDiagnostic()), expected,
      'The editor did not update the literal unpack argument-order diagnostic.');
  };
  await waitForUnpackOrder(true);
  assert.strictEqual(invalidUnpackDocument.getText(unpackOrderDiagnostic()!.range), "'local'",
    'The editor did not highlight the positional array entry after a named entry.');
  const validUnpackEdit = new vscode.WorkspaceEdit();
  validUnpackEdit.replace(invalidUnpackUri, new vscode.Range(new vscode.Position(0, 0),
    invalidUnpackDocument.positionAt(invalidUnpackDocument.getText().length)),
  invalidUnpackSource.replace("'port' => 80, 'local'", "'local', 'port' => 80"));
  assert.ok(await vscode.workspace.applyEdit(validUnpackEdit));
  assert.ok(invalidUnpackDocument.isDirty);
  await waitForUnpackOrder(false);
  console.log('C2 literal argument unpack: invalid order diagnostic appears and clears after an unsaved repair');

  const documentedOverloadUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'MagicCommentOverload.php');
  const documentedOverloadSource = `<?php namespace App\\Service;
class C2LocatedUser {} class C2LocatedOther {}
/** @method C2LocatedUser locate(int $id)
 * @method C2LocatedOther locate(string $slug) */ class C2MagicModel {}
function inspectC2Magic(C2MagicModel $model): void { $model->locate(/* hint, ) */ id: 1); }
`;
  await vscode.workspace.fs.writeFile(documentedOverloadUri, Buffer.from(documentedOverloadSource));
  const documentedOverloadDocument = await vscode.workspace.openTextDocument(documentedOverloadUri);
  await vscode.window.showTextDocument(documentedOverloadDocument);
  const documentedOverloadPosition = documentedOverloadDocument.positionAt(
    documentedOverloadSource.indexOf('id: 1') + 'id: 1'.length);
  const documentedOverloadHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', documentedOverloadUri, documentedOverloadPosition);
  assert.deepStrictEqual(documentedOverloadHelp?.signatures.map((item) => item.label),
    ['locate(int $id): C2LocatedUser'], 'An argument comment brought back the unrelated documented overload.');
  console.log('C2 documented overload: punctuation in argument comment keeps the matching signature');

  const triviaSignatureUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'SignatureTrivia.php');
  const triviaSignatureSource = `<?php namespace App\\Service;
function outerTrivia(int $first, int $second): void {}
$text = "outerTrivia(se rest"; // outerTrivia(se rest
outerTrivia(1, se
`;
  await vscode.workspace.fs.writeFile(triviaSignatureUri, Buffer.from(triviaSignatureSource));
  const triviaSignatureDocument = await vscode.workspace.openTextDocument(triviaSignatureUri);
  await vscode.window.showTextDocument(triviaSignatureDocument);
  const declarationHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', triviaSignatureUri,
    triviaSignatureDocument.positionAt(triviaSignatureSource.indexOf('outerTrivia(') + 'outerTrivia('.length));
  assert.ok(!declarationHelp?.signatures.some((item) => item.label.includes('outerTrivia(')),
    'A call signature appeared while editing the function declaration.');
  for (const marker of ['"outerTrivia(se rest', '// outerTrivia(se rest']) {
    const offset = triviaSignatureSource.indexOf(marker) + marker.indexOf('se') + 2;
    const ghost = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', triviaSignatureUri, triviaSignatureDocument.positionAt(offset));
    assert.ok(!ghost?.signatures.some((item) => item.label.includes('outerTrivia(')),
      'A PHP signature appeared inside a string or comment.');
  }
  const realTrivia = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', triviaSignatureUri,
    triviaSignatureDocument.positionAt(triviaSignatureSource.lastIndexOf(' se\n') + 3));
  assert.ok(realTrivia?.signatures.some((item) => item.label.includes('outerTrivia(')),
    'Suppressing text in trivia also hid the real PHP call.');
  console.log('C2 signature context: no ghost hints in declarations or text, real call remains available');

  const neverArrayUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NestedArrayNever.php');
  const neverArraySource = `<?php namespace App\\Service;
function stopNested(array $payload): never { throw new \\Exception(); }
function ordinaryNested(array $payload): void {}
function afterStopNested(): void {}
function afterOrdinaryNested(): void {}
function runStopNested(): void { stopNested(array('x')); afterStopNested(); }
function runOrdinaryNested(): void { ordinaryNested(array('x')); afterOrdinaryNested(); }
`;
  await vscode.workspace.fs.writeFile(neverArrayUri, Buffer.from(neverArraySource));
  const neverArrayDocument = await vscode.workspace.openTextDocument(neverArrayUri);
  await vscode.window.showTextDocument(neverArrayDocument);
  const neverArrayUnreachable = (): string[] => vscode.languages.getDiagnostics(neverArrayUri)
    .filter((item) => item.source === 'SoPHP' && item.code === 'php.control-flow.unreachable')
    .map((item) => neverArrayDocument.getText(item.range));
  const neverArrayDeadline = Date.now() + 20_000;
  while (Date.now() < neverArrayDeadline && neverArrayUnreachable().length !== 1)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(neverArrayUnreachable(), ['afterStopNested();'],
    'Default onDemand missed the outer never call or marked the ordinary call unreachable.');
  console.log('C2 onDemand nested-array never call: unreachable after native never only');

  const methodUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'CrossFileLiteralService.php');
  const methodConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'CrossFileLiteralConsumer.php');
  const methodSource = `<?php namespace App\\Service;
final class CrossFileLiteralService { public function accept(int $value): void {} }
`;
  const methodConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function inspectCrossFileLiteral(CrossFileLiteralService $service): void { $service->accept('bad'); }
`;
  await vscode.workspace.fs.writeFile(methodUri, Buffer.from(methodSource));
  await vscode.workspace.fs.writeFile(methodConsumerUri, Buffer.from(methodConsumerSource));
  const methodDocument = await vscode.workspace.openTextDocument(methodUri);
  const methodConsumerDocument = await vscode.workspace.openTextDocument(methodConsumerUri);
  await vscode.window.showTextDocument(methodConsumerDocument);
  const crossFileMismatch = (): boolean => vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch');
  const waitForMismatch = async (expected: boolean): Promise<number> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && crossFileMismatch() !== expected) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(crossFileMismatch(), expected, `C2 cross-file literal mismatch did not become ${expected}.`);
    const observedAt = performance.now();
    const stableUntil = Date.now() + 150;
    while (Date.now() < stableUntil) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.strictEqual(crossFileMismatch(), expected, 'C2 cross-file literal diagnostic flashed an older result.');
    }
    return observedAt;
  };
  await waitForMismatch(true);
  const interpolatedConsumerSource = methodConsumerSource.replace("$service->accept('bad');",
    '$service->accept("hello {$dynamic}");').replace('CrossFileLiteralService $service)',
      'CrossFileLiteralService $service, string $dynamic)');
  const replaceCrossFileConsumer = async (source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      methodConsumerDocument.positionAt(methodConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
  };
  await replaceCrossFileConsumer(interpolatedConsumerSource);
  const interpolationDeadline = Date.now() + 20_000;
  while (Date.now() < interpolationDeadline && !vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch'
      && methodConsumerDocument.getText(item.range) === '"hello {$dynamic}"'))
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch'
      && methodConsumerDocument.getText(item.range) === '"hello {$dynamic}"'),
  'Default onDemand did not diagnose the complete interpolated string as string.');
  await replaceCrossFileConsumer(interpolatedConsumerSource.replace('declare(strict_types=1); ', ''));
  await waitForMismatch(false);
  const localInterpolatedSource = methodConsumerSource.replace("$service->accept('bad');",
    '$text = "hello {$dynamic}"; $service->accept($text);').replace('CrossFileLiteralService $service)',
      'CrossFileLiteralService $service, string $dynamic)');
  await replaceCrossFileConsumer(localInterpolatedSource);
  const localInterpolationDeadline = Date.now() + 20_000;
  while (Date.now() < localInterpolationDeadline && !vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch'
      && methodConsumerDocument.getText(item.range) === '$text'))
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch'
      && methodConsumerDocument.getText(item.range) === '$text'),
  'Default onDemand lost the interpolated string type after a local assignment.');
  await replaceCrossFileConsumer(localInterpolatedSource.replace('$service->accept($text);', '$text = 42; $service->accept($text);'));
  await waitForMismatch(false);
  await replaceCrossFileConsumer(methodConsumerSource);
  await waitForMismatch(true);
  console.log('C2 interpolated string argument: direct/local type, strict mismatch, weak coercion, unsaved restore');
  const changeMethodDeclaration = async (from: string, to: string, expected: boolean): Promise<void> => {
    const offset = methodDocument.getText().indexOf(from);
    assert.ok(offset >= 0, `Missing method declaration text ${from}.`);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodUri, new vscode.Range(methodDocument.positionAt(offset), methodDocument.positionAt(offset + from.length)), to);
    assert.ok(await vscode.workspace.applyEdit(edit));
    await waitForMismatch(expected);
  };
  await changeMethodDeclaration('final class CrossFileLiteralService', 'class CrossFileLiteralService', false);
  await changeMethodDeclaration('public function accept', 'final public function accept', true);
  await changeMethodDeclaration('final public function accept', 'public function accept', false);
  const exactConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ExactReceiverConsumer.php');
  const exactConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function inspectExactReceiver(): void { $service = new CrossFileLiteralService(); $other = 1; $service->accept('bad'); }
`;
  await vscode.workspace.fs.writeFile(exactConsumerUri, Buffer.from(exactConsumerSource));
  const exactConsumerDocument = await vscode.workspace.openTextDocument(exactConsumerUri);
  await vscode.window.showTextDocument(exactConsumerDocument);
  const exactMismatch = (): boolean => vscode.languages.getDiagnostics(exactConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch');
  const waitForExactMismatch = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && exactMismatch() !== expected) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(exactMismatch(), expected, `C2 exact receiver mismatch did not become ${expected}.`);
  };
  await waitForExactMismatch(true);
  const changeExactConsumer = async (source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(exactConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      exactConsumerDocument.positionAt(exactConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
  };
  await changeExactConsumer(exactConsumerSource.replace('$other = 1;', 'change($service);'));
  await waitForExactMismatch(false);
  await changeExactConsumer(exactConsumerSource);
  await waitForExactMismatch(true);
  await changeMethodDeclaration('public function accept', 'final public function accept', true);
  console.log('C2 onDemand exact receiver diagnostic: final class → open class → final method → exact new receiver; exact receiver has → no → has');
  const editType = async (from: string, to: string): Promise<number> => {
    const offset = methodDocument.getText().indexOf(from);
    assert.ok(offset >= 0, `Missing cross-file method type ${from}.`);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodUri, new vscode.Range(methodDocument.positionAt(offset), methodDocument.positionAt(offset + from.length)), to);
    const started = performance.now();
    assert.ok(await vscode.workspace.applyEdit(edit));
    assert.ok(methodDocument.isDirty, 'The cross-file declaration was unexpectedly saved.');
    const observedAt = await waitForMismatch(to.startsWith('int '));
    return Math.round(observedAt - started);
  };
  const removedMs = await editType('int $value', 'string $value');
  const signatureAt = methodConsumerDocument.positionAt(methodConsumerSource.indexOf("'bad'") + 2);
  const methodSignature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', methodConsumerUri, signatureAt);
  assert.ok(methodSignature?.signatures.some((item) => item.label.includes('accept(string $value): void')),
    'Signature Help did not use the edited cross-file declaration.');
  const restoredMs = await editType('string $value', 'int $value');
  console.log(`C2 onDemand cross-file literal diagnostic: ${JSON.stringify({ visible: [true, false, true],
    removedMs, restoredMs, unsaved: methodDocument.isDirty })}`);

  const replaceCrossFileCall = async (argument: string): Promise<void> => {
    const source = methodConsumerSource.replace("'bad'", argument);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      methodConsumerDocument.positionAt(methodConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
  };
  const waitForCrossFileArgument = async (code: string, expected: boolean): Promise<void> => {
    const hasDiagnostic = (): boolean => vscode.languages.getDiagnostics(methodConsumerUri).some((item) =>
      item.source === 'SoPHP' && item.code === code);
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && hasDiagnostic() !== expected) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(hasDiagnostic(), expected, `C2 cross-file ${code} did not become ${expected}.`);
  };
  await replaceCrossFileCall('wrong: 1');
  await waitForCrossFileArgument('php.argument.unknown-named', true);
  await replaceCrossFileCall('value: 1');
  await waitForCrossFileArgument('php.argument.unknown-named', false);
  await replaceCrossFileCall('');
  await waitForCrossFileArgument('php.argument.missing-required', true);
  await changeMethodDeclaration('int $value', 'int $value = 0', false);
  await waitForCrossFileArgument('php.argument.missing-required', false);
  await changeMethodDeclaration('int $value = 0', 'int $value', false);
  await waitForCrossFileArgument('php.argument.missing-required', true);
  await replaceCrossFileCall("'bad'");
  await waitForCrossFileArgument('php.argument.missing-required', false);
  await waitForMismatch(true);
  console.log('C2 onDemand cross-file named and missing arguments: wrong → corrected; missing → optional → required; unsaved');

  await editType('int $value', 'string $value');
  const localConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function inspectCrossFileLiteral(CrossFileLiteralService $service): void { $value = 'bad'; $other = 1; $service->accept($value); }
`;
  const replaceConsumer = async (source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(methodConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      methodConsumerDocument.positionAt(methodConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit), 'Could not change the cross-file consumer buffer.');
    assert.ok(methodConsumerDocument.isDirty, 'The cross-file consumer was unexpectedly saved.');
  };
  await replaceConsumer(localConsumerSource);
  await waitForMismatch(false);
  const localRestoredMs = await editType('string $value', 'int $value');
  const literalFixed = localConsumerSource.replace("$value = 'bad'", '$value = 1');
  await replaceConsumer(literalFixed);
  await waitForMismatch(false);
  await replaceConsumer(localConsumerSource);
  await waitForMismatch(true);
  const unknownConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function change(string &$value): void { $value = 'bad'; }
function inspectCrossFileLiteral(CrossFileLiteralService $service): void { $value = 'bad'; change($value); $service->accept($value); }
`;
  await replaceConsumer(unknownConsumerSource);
  await waitForMismatch(false);
  console.log(`C2 onDemand cross-file local literal diagnostic: ${JSON.stringify({ visible: [false, true, false, true, false],
    restoredMs: localRestoredMs, declarationUnsaved: methodDocument.isDirty, consumerUnsaved: methodConsumerDocument.isDirty })}`);

  const returnUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NativeReturnService.php');
  const returnConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'NativeReturnConsumer.php');
  const returnSource = `<?php namespace App\\Service;
final class NativeReturnService { public function accept(int $value): void {} public function text(): string { return 'bad'; } }
`;
  const returnConsumerSource = `<?php declare(strict_types=1); namespace App\\Service;
function inspectNativeReturn(NativeReturnService $service): void { $service->accept($service->text()); }
`;
  await vscode.workspace.fs.writeFile(returnUri, Buffer.from(returnSource));
  await vscode.workspace.fs.writeFile(returnConsumerUri, Buffer.from(returnConsumerSource));
  const returnDocument = await vscode.workspace.openTextDocument(returnUri);
  const returnConsumerDocument = await vscode.workspace.openTextDocument(returnConsumerUri);
  await vscode.window.showTextDocument(returnConsumerDocument);
  const returnMismatch = (): boolean => vscode.languages.getDiagnostics(returnConsumerUri).some((item) =>
    item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch');
  const waitForReturnMismatch = async (expected: boolean): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && returnMismatch() !== expected) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(returnMismatch(), expected, `C2 native return mismatch did not become ${expected}.`);
  };
  const changeReturnSource = async (source: string, expected: boolean): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(returnUri, new vscode.Range(new vscode.Position(0, 0),
      returnDocument.positionAt(returnDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
    await waitForReturnMismatch(expected);
  };
  await waitForReturnMismatch(true);
  await changeReturnSource(returnSource.replace("text(): string { return 'bad';", 'text(): int { return 42;'), false);
  await changeReturnSource(returnSource, true);
  await changeReturnSource(returnSource.replace('public function text(): string', '/** @return string */ public function text()'), false);
  console.log('C2 onDemand cross-file native return argument: string → int → string → PHPDoc-only, diagnostic has → no → has → no');
  const localReturnConsumer = returnConsumerSource.replace('$service->accept($service->text());',
    '$value = $service->text(); $other = 1; $service->accept($value);');
  const changeReturnConsumer = async (source: string, expected: boolean): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(returnConsumerUri, new vscode.Range(new vscode.Position(0, 0),
      returnConsumerDocument.positionAt(returnConsumerDocument.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit));
    await waitForReturnMismatch(expected);
  };
  await changeReturnConsumer(localReturnConsumer, false);
  await changeReturnSource(returnSource, true);
  await changeReturnConsumer(localReturnConsumer.replace('$other = 1;', 'change($value);'), false);
  await changeReturnConsumer(localReturnConsumer, true);
  const localValueHover = async (expected: string): Promise<void> => {
    const offset = returnConsumerDocument.getText().lastIndexOf('$value);') + 2;
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', returnConsumerUri, returnConsumerDocument.positionAt(offset)) ?? [];
    assert.ok(hovers.some((hover) => hover.contents.some((item) =>
      (typeof item === 'string' ? item : item.value).includes(`$value: ${expected}`))),
    `C2 local value Hover did not show ${expected}.`);
  };
  await localValueHover('string');
  await changeReturnSource(returnSource.replace("text(): string { return 'bad';", 'text(): int { return 42;'), false);
  await localValueHover('int');
  await changeReturnSource(returnSource, true);
  console.log('C2 onDemand local native return argument: PHPDoc-only → native string → possible mutation → restored, diagnostic no → has → no → has');

  const aliasRealUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'PathAliasRecord.php');
  const aliasLink = vscode.Uri.joinPath(root.uri, 'alias');
  const aliasUri = vscode.Uri.joinPath(aliasLink, 'Service', 'PathAliasRecord.php');
  const aliasConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'PathAliasConsumer.php');
  const aliasDiskSource = '<?php namespace App\\Service; class PathAliasRecord { public function diskOnly(): void {} }';
  const aliasRealSource = '<?php namespace App\\Service; class PathAliasRecord { public function realOnly(): void {} public function inspect(): void { $this->realOnly(); } }';
  const aliasLinkSource = '<?php namespace App\\Service; class PathAliasRecord { public function linkedOnly(): void {} }';
  const aliasConsumerSource = '<?php namespace App\\Service; function inspectPathAlias(PathAliasRecord $record): void { $record->; }';
  await vscode.workspace.fs.writeFile(aliasRealUri, Buffer.from(aliasDiskSource));
  await vscode.workspace.fs.writeFile(aliasConsumerUri, Buffer.from(aliasConsumerSource));
  await symlink(vscode.Uri.joinPath(root.uri, 'src').fsPath, aliasLink.fsPath, process.platform === 'win32' ? 'junction' : 'dir');
  const aliasRealDocument = await vscode.workspace.openTextDocument(aliasRealUri);
  await vscode.window.showTextDocument(aliasRealDocument);
  const replaceAliasSource = async (target: vscode.Uri, open: vscode.TextDocument, source: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(target, new vscode.Range(new vscode.Position(0, 0), open.positionAt(open.getText().length)), source);
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not edit ${target.toString()}.`);
    assert.ok(open.isDirty, `The path alias buffer ${target.toString()} was unexpectedly saved.`);
  };
  await replaceAliasSource(aliasRealUri, aliasRealDocument, aliasRealSource);
  const aliasDocument = await vscode.workspace.openTextDocument(aliasUri);
  await vscode.window.showTextDocument(aliasDocument);
  await replaceAliasSource(aliasUri, aliasDocument, aliasLinkSource);
  const aliasConsumerDocument = await vscode.workspace.openTextDocument(aliasConsumerUri);
  await vscode.window.showTextDocument(aliasConsumerDocument);
  const projectAliasCompletions = async (): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', aliasConsumerUri,
    aliasConsumerDocument.positionAt(aliasConsumerSource.indexOf('$record->') + '$record->'.length)))?.items.map((item) => String(item.label)) ?? [];
  const aliasDeadline = Date.now() + 20_000;
  while (Date.now() < aliasDeadline && !(await projectAliasCompletions()).includes('linkedOnly')) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok((await projectAliasCompletions()).includes('linkedOnly'), 'The latest linked tab did not own project facts.');
  assert.ok(!(await projectAliasCompletions()).includes('realOnly'), 'The older real-path tab leaked into project facts.');
  const localAliasCall = aliasRealSource.indexOf('$this->realOnly') + '$this->'.length;
  const aliasHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', aliasRealUri, aliasRealDocument.positionAt(localAliasCall + 2)) ?? [];
  assert.ok(aliasHovers.some((hover) => hover.contents.some((item) => (typeof item === 'string' ? item : item.value).includes('realOnly'))),
    'The non-owner tab lost Hover for its unsaved local method.');
  const aliasLocalCompletions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', aliasRealUri, aliasRealDocument.positionAt(localAliasCall));
  assert.ok(aliasLocalCompletions?.items.some((item) => String(item.label) === 'realOnly'),
    'The non-owner tab lost its own local member completion.');
  const aliasDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', aliasRealUri, aliasRealDocument.positionAt(localAliasCall + 2)) ?? [];
  assert.ok(aliasDefinitions.some((location) => location.uri.toString() === aliasRealUri.toString()
    && aliasRealDocument.getText(location.range) === 'realOnly'), 'The non-owner tab did not navigate to its own declaration.');
  const aliasSignatures = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', aliasRealUri,
    aliasRealDocument.positionAt(aliasRealSource.indexOf('$this->realOnly(') + '$this->realOnly('.length));
  assert.ok(aliasSignatures?.signatures.some((signature) => signature.label.includes('realOnly')),
    'The non-owner tab lost Signature Help for its unsaved local method.');
  console.log('C2 onDemand dual-path local queries: project uses linkedOnly; real tab Hover, Completion, Definition, Signature Help use realOnly');
  const aliasHoverMs: number[] = [];
  for (let round = 0; round < 10; round += 1) {
    const latest = round % 2 === 0;
    const expectedProject = latest ? 'linkedLatestOnly' : 'linkedOnly';
    await replaceAliasSource(aliasUri, aliasDocument, latest ? aliasLinkSource.replace('linkedOnly', expectedProject) : aliasLinkSource);
    const projectDeadline = Date.now() + 20_000;
    while (Date.now() < projectDeadline && !(await projectAliasCompletions()).includes(expectedProject)) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const projectLabels = await projectAliasCompletions();
    assert.ok(projectLabels.includes(expectedProject) && !projectLabels.includes('realOnly'),
      `Project completion lost the current path-alias owner: ${JSON.stringify(projectLabels)}`);
    const started = performance.now();
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', aliasRealUri, aliasRealDocument.positionAt(localAliasCall + 2)) ?? [];
    aliasHoverMs.push(performance.now() - started);
    assert.ok(hovers.some((hover) => hover.contents.some((item) => (typeof item === 'string' ? item : item.value).includes('realOnly'))),
      'The non-owner tab lost its own method after a linked-tab edit.');
  }
  const sortedAliasHoverMs = [...aliasHoverMs].sort((left, right) => left - right);
  console.log(`C2 onDemand dual-path edits: ${JSON.stringify({ rounds: aliasHoverMs.length,
    hoverP95Ms: Math.round(sortedAliasHoverMs[Math.floor((sortedAliasHoverMs.length - 1) * 0.95)]!),
    declarationUnsaved: aliasDocument.isDirty && aliasRealDocument.isDirty })}`);

  const recordsUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'CrossFileDocRecords.php');
  const consumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'CrossFileDocConsumer.php');
  const recordsSource = `<?php namespace App\\Service;
class CrossFileAlphaDoc { public function crossAlpha(): void {} }
class CrossFileBetaDoc { public function crossBeta(): void {} }
/** @return list<CrossFileAlphaDoc> */ function crossFileRecords(): array { return []; }
`;
  const consumerSource = `<?php namespace App\\Service;
function inspectCrossFileDoc(): void { foreach (crossFileRecords() as $item) { $item->cross; $item->crossAlpha(); } }
`;
  await vscode.workspace.fs.writeFile(recordsUri, Buffer.from(recordsSource));
  await vscode.workspace.fs.writeFile(consumerUri, Buffer.from(consumerSource));
  const recordsDocument = await vscode.workspace.openTextDocument(recordsUri);
  const consumerDocument = await vscode.workspace.openTextDocument(consumerUri);
  await vscode.window.showTextDocument(consumerDocument);
  const completionPosition = consumerDocument.positionAt(consumerSource.indexOf('$item->cross;') + '$item->cross'.length);
  const callPosition = consumerDocument.positionAt(consumerSource.indexOf('$item->crossAlpha();') + '$item->cross'.length);
  const methods = async (): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', consumerUri, completionPosition,
  ))?.items.filter((item) => item.kind === vscode.CompletionItemKind.Method).map((item) => String(item.label)) ?? [];
  const waitForMethod = async (expected: string, rejected: string): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const actual = await methods();
      if (actual.includes(expected) && !actual.includes(rejected)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Cross-file PHPDoc methods did not update: ${JSON.stringify(await methods())}`);
  };
  await waitForMethod('crossAlpha', 'crossBeta');
  const initialDefinition = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri, callPosition) ?? [];
  assert.ok(initialDefinition.some((location) => location.uri.toString() === recordsUri.toString()
    && recordsDocument.getText(location.range).includes('crossAlpha')));
  const typeStart = recordsDocument.getText().indexOf('list<CrossFileAlphaDoc>');
  assert.ok(typeStart >= 0);
  const typeEdit = new vscode.WorkspaceEdit();
  typeEdit.replace(recordsUri, new vscode.Range(recordsDocument.positionAt(typeStart),
    recordsDocument.positionAt(typeStart + 'list<CrossFileAlphaDoc>'.length)), 'list<CrossFileBetaDoc>');
  assert.ok(await vscode.workspace.applyEdit(typeEdit));
  assert.ok(recordsDocument.isDirty);
  await waitForMethod('crossBeta', 'crossAlpha');
  const staleDefinition = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', consumerUri, callPosition) ?? [];
  assert.ok(!staleDefinition.some((location) => location.uri.toString() === recordsUri.toString()
    && recordsDocument.getText(location.range).includes('crossAlpha')));
  console.log('C2 onDemand cross-file PHPDoc return: Alpha → Beta, completion and definition updated from unsaved source');

  const shapeAlphaUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ShapeAlpha.php');
  const shapeBetaUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ShapeBeta.php');
  const shapeFactoryUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ShapeFactory.php');
  const shapeConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ShapeConsumer.php');
  const shapeFactorySource = `<?php namespace App\\Service;
class ShapeFactory { /** @return array{item: ShapeAlpha}|array{item: ShapeBeta} */ public function choose(): array { return []; } }`;
  const shapeConsumerSource = `<?php namespace App\\Service;
function inspectShape(ShapeFactory $factory): void {
  $row = $factory->choose(); $item = $row['item']; $item->com; $item->alpha; $item->common();
}`;
  await vscode.workspace.fs.writeFile(shapeAlphaUri, Buffer.from('<?php namespace App\\Service; class ShapeAlpha { public function common(): void {} public function alphaOnly(): void {} }'));
  await vscode.workspace.fs.writeFile(shapeBetaUri, Buffer.from('<?php namespace App\\Service; class ShapeBeta { public function common(): void {} public function betaOnly(): void {} }'));
  await vscode.workspace.fs.writeFile(shapeFactoryUri, Buffer.from(shapeFactorySource));
  await vscode.workspace.fs.writeFile(shapeConsumerUri, Buffer.from(shapeConsumerSource));
  const shapeFactoryDocument = await vscode.workspace.openTextDocument(shapeFactoryUri);
  const shapeConsumerDocument = await vscode.workspace.openTextDocument(shapeConsumerUri);
  await vscode.window.showTextDocument(shapeConsumerDocument);
  const shapeMethods = async (marker: string): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', shapeConsumerUri,
    shapeConsumerDocument.positionAt(shapeConsumerSource.indexOf(marker) + marker.length),
  ))?.items.filter((item) => item.kind === vscode.CompletionItemKind.Method).map((item) => String(item.label)) ?? [];
  const shapeDeadline = Date.now() + 20_000;
  while (Date.now() < shapeDeadline && !(await shapeMethods('$item->com')).includes('common'))
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok((await shapeMethods('$item->com')).includes('common'), 'Cold onDemand union shape omitted the shared member.');
  assert.ok(!(await shapeMethods('$item->alpha')).includes('alphaOnly'), 'Union shape exposed a branch-only member.');
  const shapeDefinitionPosition = shapeConsumerDocument.positionAt(shapeConsumerSource.indexOf('$item->common()') + '$item->co'.length);
  const shapeDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', shapeConsumerUri, shapeDefinitionPosition) ?? [];
  assert.deepStrictEqual(shapeDefinitions.map((item) => item.uri.toString()).sort(),
    [shapeAlphaUri.toString(), shapeBetaUri.toString()].sort());
  const shapeReturn = 'array{item: ShapeAlpha}|array{item: ShapeBeta}';
  const shapeStart = shapeFactorySource.indexOf(shapeReturn);
  const shapeEdit = new vscode.WorkspaceEdit();
  shapeEdit.replace(shapeFactoryUri, new vscode.Range(shapeFactoryDocument.positionAt(shapeStart),
    shapeFactoryDocument.positionAt(shapeStart + shapeReturn.length)), 'array{item: ShapeAlpha}');
  assert.ok(await vscode.workspace.applyEdit(shapeEdit));
  assert.ok(shapeFactoryDocument.isDirty, 'The union-shape source edit was unexpectedly saved.');
  const alphaDeadline = Date.now() + 20_000;
  while (Date.now() < alphaDeadline && !(await shapeMethods('$item->alpha')).includes('alphaOnly'))
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok((await shapeMethods('$item->alpha')).includes('alphaOnly'), 'The unsaved shape did not update member completion.');
  const updatedShapeDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', shapeConsumerUri, shapeDefinitionPosition) ?? [];
  assert.deepStrictEqual(updatedShapeDefinitions.map((item) => item.uri.toString()), [shapeAlphaUri.toString()]);
  console.log('C2 cold onDemand union-shape return: shared member → unsaved Alpha-only member and definition');

  const reopenSourceUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ReopenFeedback.php');
  const reopenContractUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ReopenContract.php');
  const reopenConsumerUri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ReopenFeedbackConsumer.php');
  const reopenSource = (method: string, parameterType: string): string => `<?php namespace App\\Service;
final class ReopenFeedback implements ReopenContract { public function ${method}(${parameterType} $value): void {} }
`;
  const reopenContract = (method: string, parameterType: string): string => `<?php namespace App\\Service;
interface ReopenContract { public function ${method}(${parameterType} $value): void; }
`;
  const reopenConsumer = `<?php declare(strict_types=1); namespace App\\Service;
function inspectReopenFeedback(ReopenFeedback $value): void { $value->reopen; $value->reopenOld(1); }
`;
  await vscode.workspace.fs.writeFile(reopenSourceUri, Buffer.from(reopenSource('reopenOld', 'int')));
  await vscode.workspace.fs.writeFile(reopenContractUri, Buffer.from(reopenContract('reopenOld', 'int')));
  await vscode.workspace.fs.writeFile(reopenConsumerUri, Buffer.from(reopenConsumer));
  const reopenConsumerDocument = await vscode.workspace.openTextDocument(reopenConsumerUri);
  const reopenCompletionPosition = reopenConsumerDocument.positionAt(reopenConsumer.indexOf('$value->reopen') + '$value->reopen'.length);
  const reopenMethods = async (): Promise<string[]> => (await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', reopenConsumerUri, reopenCompletionPosition,
  ))?.items.map((item) => String(item.label)) ?? [];
  const waitForReopenMethod = async (expectedMethod: string, rejectedMethod: string): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const labels = await reopenMethods();
      if (labels.includes(expectedMethod) && !labels.includes(rejectedMethod)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Reopened declaration did not refresh completion: ${JSON.stringify(await reopenMethods())}`);
  };
  await vscode.window.showTextDocument(reopenConsumerDocument);
  await waitForReopenMethod('reopenOld', 'reopenNew');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(reopenSourceUri));
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline && vscode.workspace.textDocuments.some((item) => item.uri.toString() === reopenSourceUri.toString())) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const retainedAfterClose = vscode.workspace.textDocuments.some((item) => item.uri.toString() === reopenSourceUri.toString());
  await vscode.workspace.fs.writeFile(reopenSourceUri, Buffer.from(reopenSource('reopenNew', 'string')));
  await vscode.workspace.fs.writeFile(reopenContractUri, Buffer.from(reopenContract('reopenNew', 'string')));
  const reopenedDocument = await vscode.workspace.openTextDocument(reopenSourceUri);
  const diskRefreshDeadline = Date.now() + 20_000;
  while (Date.now() < diskRefreshDeadline && !reopenedDocument.getText().includes('reopenNew')) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(reopenedDocument.getText().includes('reopenNew'),
    `The reopened editor retained the old disk declaration (retainedAfterClose=${retainedAfterClose}).`);
  await vscode.window.showTextDocument(reopenedDocument);
  await waitForReopenMethod('reopenNew', 'reopenOld');
  const oldCallOffset = reopenConsumerDocument.getText().indexOf('reopenOld(1);');
  const oldDefinition = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', reopenConsumerUri, reopenConsumerDocument.positionAt(oldCallOffset + 2)) ?? [];
  assert.ok(!oldDefinition.some((location) => location.uri.toString() === reopenSourceUri.toString()),
    'The reopened source still resolved the removed method.');
  const reopenEdit = new vscode.WorkspaceEdit();
  reopenEdit.replace(reopenConsumerUri, new vscode.Range(reopenConsumerDocument.positionAt(oldCallOffset),
    reopenConsumerDocument.positionAt(oldCallOffset + 'reopenOld'.length)), 'reopenNew');
  assert.ok(await vscode.workspace.applyEdit(reopenEdit), 'Could not update the consumer to the new method.');
  const newDefinition = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', reopenConsumerUri, reopenConsumerDocument.positionAt(oldCallOffset + 2)) ?? [];
  assert.ok(newDefinition.some((location) => location.uri.toString() === reopenSourceUri.toString()
    && reopenedDocument.getText(location.range) === 'reopenNew'), 'Definition did not follow the reopened source.');
  const newHover = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', reopenConsumerUri, reopenConsumerDocument.positionAt(oldCallOffset + 2)) ?? [];
  assert.ok(newHover.some((hover) => hover.contents.some((item) =>
    (typeof item === 'string' ? item : item.value).includes('reopenNew'))), 'Hover retained the old method after reopen.');
  const newCallPosition = reopenConsumerDocument.positionAt(oldCallOffset + 'reopenNew('.length);
  const newSignatures = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', reopenConsumerUri, newCallPosition);
  assert.ok(newSignatures?.signatures.some((signature) => signature.label.includes('string $value')),
    'Signature Help retained the old parameter type after reopen.');
  const reopenTypeErrors = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(reopenConsumerUri)
    .filter((diagnostic) => diagnostic.source === 'SoPHP' && diagnostic.code === 'php.argument.type-mismatch');
  const reopenErrorDeadline = Date.now() + 20_000;
  while (Date.now() < reopenErrorDeadline && reopenTypeErrors().length === 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(reopenTypeErrors().length, 1, 'The reopened string parameter did not reject the old numeric argument.');
  const argumentOffset = reopenConsumerDocument.getText().indexOf('reopenNew(1)') + 'reopenNew('.length;
  const argumentEdit = new vscode.WorkspaceEdit();
  argumentEdit.replace(reopenConsumerUri, new vscode.Range(reopenConsumerDocument.positionAt(argumentOffset),
    reopenConsumerDocument.positionAt(argumentOffset + 1)), "'ok'");
  assert.ok(await vscode.workspace.applyEdit(argumentEdit), 'Could not repair the unsaved argument after reopen.');
  const repairDeadline = Date.now() + 20_000;
  while (Date.now() < repairDeadline && reopenTypeErrors().length > 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(reopenTypeErrors(), [], 'The corrected unsaved argument retained a stale type diagnostic.');
  const reopenedDeclarationOffset = reopenedDocument.getText().indexOf('reopenNew');
  const reopenedReferences = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', reopenSourceUri, reopenedDocument.positionAt(reopenedDeclarationOffset + 2)) ?? [];
  assert.ok(reopenedReferences.some((location) => location.uri.toString() === reopenConsumerUri.toString()
    && reopenConsumerDocument.getText(location.range) === 'reopenNew'),
  'References did not follow the reopened method and unsaved consumer edit.');
  const reopenedContractDocument = await vscode.workspace.openTextDocument(reopenContractUri);
  const contractMethodOffset = reopenedContractDocument.getText().indexOf('reopenNew');
  assert.ok(contractMethodOffset >= 0, 'The interface retained its old declaration after disk refresh.');
  const reopenedImplementations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeImplementationProvider', reopenContractUri, reopenedContractDocument.positionAt(contractMethodOffset + 2)) ?? [];
  assert.ok(reopenedImplementations.some((location) => location.uri.toString() === reopenSourceUri.toString()
    && reopenedDocument.getText(location.range) === 'reopenNew'),
  'Implementation did not follow the refreshed interface and class declaration.');
  console.log(`C2 editor close, disk change, reopen: six queries and diagnostics use reopenNew(string); retainedAfterClose=${retainedAfterClose}`);

  const classmapProject = vscode.Uri.joinPath(root.uri, 'c2-classmap-proof');
  const classmapSourceUri = vscode.Uri.joinPath(classmapProject, 'mapped', 'Bundle.php');
  const classmapConsumerUri = vscode.Uri.joinPath(classmapProject, 'src', 'Consumer.php');
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(classmapProject, 'mapped'));
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(classmapProject, 'src'));
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(classmapProject, 'vendor', 'composer'));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(classmapProject, 'composer.json'), Buffer.from(JSON.stringify({
    autoload: { 'psr-4': { 'App\\': 'src/' }, classmap: ['mapped/'] },
  })));
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(classmapProject, 'vendor', 'composer', 'autoload_classmap.php'), Buffer.from(`<?php
// autoload_classmap.php @generated by Composer
$vendorDir = dirname(__DIR__);
$baseDir = dirname($vendorDir);
return array(
    'Legacy\\\\Proof' => $baseDir . '/mapped/Bundle.php',
);
`));
  const classmapSource = '<?php namespace Legacy; final class Proof { public function accept(int $value): void {} }';
  const classmapConsumer = '<?php declare(strict_types=1); namespace App; function run(\\Legacy\\Proof $item): void { $item->accept("bad"); $item->acc; }';
  await vscode.workspace.fs.writeFile(classmapSourceUri, Buffer.from(classmapSource));
  await vscode.workspace.fs.writeFile(classmapConsumerUri, Buffer.from(classmapConsumer));
  const classmapSourceDocument = await vscode.workspace.openTextDocument(classmapSourceUri);
  await vscode.window.showTextDocument(classmapSourceDocument);
  const classmapConsumerDocument = await vscode.workspace.openTextDocument(classmapConsumerUri);
  await vscode.window.showTextDocument(classmapConsumerDocument);
  const classmapErrors = (): vscode.Diagnostic[] => vscode.languages.getDiagnostics(classmapConsumerUri)
    .filter((item) => item.source === 'SoPHP' && item.code === 'php.argument.type-mismatch');
  const classmapDeadline = Date.now() + 20_000;
  while (Date.now() < classmapDeadline && classmapErrors().length === 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(classmapErrors().length, 1, 'Composer classmap proof did not enable the cross-file argument diagnostic.');
  assert.ok(!vscode.languages.getDiagnostics(classmapSourceUri).some((item) => item.code === 'php.type.filename'),
    'A classmap declaration received a PSR-4 filename warning.');
  const classmapCompletion = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider', classmapConsumerUri,
    classmapConsumerDocument.positionAt(classmapConsumer.indexOf('$item->acc;') + '$item->acc'.length));
  assert.ok(classmapCompletion?.items.some((item) => item.label === 'accept'),
    'The classmap method did not appear in editor completion.');
  const classmapCall = classmapConsumer.indexOf('$item->accept(') + '$item->'.length + 2;
  const classmapDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', classmapConsumerUri, classmapConsumerDocument.positionAt(classmapCall)) ?? [];
  assert.ok(classmapDefinitions.some((location) => location.uri.toString() === classmapSourceUri.toString()),
    'Classmap method Definition did not reach its mapped source.');
  const classmapEdit = new vscode.WorkspaceEdit();
  const typeOffset = classmapSourceDocument.getText().indexOf('int $value');
  classmapEdit.replace(classmapSourceUri, new vscode.Range(classmapSourceDocument.positionAt(typeOffset),
    classmapSourceDocument.positionAt(typeOffset + 'int'.length)), 'string');
  assert.ok(await vscode.workspace.applyEdit(classmapEdit), 'Could not edit the mapped declaration in an unsaved buffer.');
  assert.ok(classmapSourceDocument.isDirty, 'The mapped declaration edit was saved unexpectedly.');
  const classmapClearDeadline = Date.now() + 20_000;
  while (Date.now() < classmapClearDeadline && classmapErrors().length > 0) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepStrictEqual(classmapErrors(), [], 'The old classmap argument diagnostic survived the unsaved declaration edit.');
  const classmapHover = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', classmapConsumerUri, classmapConsumerDocument.positionAt(classmapCall)) ?? [];
  assert.ok(classmapHover.some((hover) => hover.contents.some((item) =>
    (typeof item === 'string' ? item : item.value).includes('string $value'))),
  'Classmap method Hover retained the old parameter type.');
  console.log('C2 Composer classmap: argument diagnostic, completion, Definition and unsaved Hover/diagnostic refresh');
}

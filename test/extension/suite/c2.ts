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
  const api = await extension.activate() as { requestLanguageServer?: <T>(method: string, params: unknown) => Promise<T> };
  assert.ok(api.requestLanguageServer, 'SoPHP Core did not expose the test timing request bridge.');
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ControlFlowDiagnostics.php');
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const expected = ['cleanup();', 'unreachableAfterConditional();', 'unreachableAfterSwitch();',
    'unreachableAfterInfiniteLoop();', 'unreachableAfterInitializedFor();', 'unreachableAfterNeverCall();',
    'unreachableAfterNestedNeverCall();', 'unreachableAfterNeverCondition();', 'unreachableAfterNestedThrow();',
    'unreachableAfterThrowTernary();'];
  const actual = (): string[] => vscode.languages.getDiagnostics(uri)
    .filter((item) => item.source === 'PHP Companion' && item.code === 'php.control-flow.unreachable')
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
    .filter((item) => item.source === 'PHP Companion' && String(item.code).startsWith('php.argument.'))
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
    item.source === 'PHP Companion' && item.code === 'php.argument.type-mismatch');
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
    item.source === 'PHP Companion' && item.code === 'php.argument.type-mismatch');
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
  console.log('C2 onDemand dual-path local queries: project uses linkedOnly; real tab Hover, Completion, Definition use realOnly');
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
}

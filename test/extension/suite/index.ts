import * as assert from 'node:assert';
import * as vscode from 'vscode';

async function waitFor(predicate: () => boolean, message: string, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) await new Promise<void>((resolve) => setTimeout(resolve, 20));
  assert.ok(predicate(), message);
}

async function waitForAsync(predicate: () => Promise<boolean>, message: string | (() => string), timeoutMs = 5_000, intervalMs = 20): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch { /* Providers can reject while their server is restarting. */ }
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }
  const resolvedMessage = typeof message === 'function' ? message() : message;
  try { assert.ok(await predicate(), resolvedMessage); } catch (error) { assert.fail(`${resolvedMessage}: ${error instanceof Error ? error.message : String(error)}`); }
}

function normalizedNewlines(value: string): string { return value.replaceAll('\r\n', '\n'); }

/** Restore fixtures through the editor so dirty buffers and filesystem versions stay coherent. */
async function restoreTextFixture(uri: vscode.Uri, original: Uint8Array): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  const expected = Buffer.from(original).toString('utf8');
  if (document.getText() !== expected) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), expected);
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not restore ${uri.path}`);
  }
  if (document.isDirty) assert.ok(await document.save(), `Could not save restored ${uri.path}`);
  assert.strictEqual(document.getText(), expected, `Restored buffer differs for ${uri.path}`);
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), expected, `Restored file differs for ${uri.path}`);
}

async function verifyOpenSourceProfile(workspace: vscode.WorkspaceFolder): Promise<void> {
  const formatterExecutable = process.env.PHP_COMPANION_FORMATTER_EXECUTABLE;
  const phpExecutable = process.env.PHP_COMPANION_PHP_EXECUTABLE;
  const phpunitExecutable = process.env.PHP_COMPANION_PHPUNIT_EXECUTABLE;
  assert.ok(formatterExecutable, 'Open Source Profile test requires PHP_COMPANION_FORMATTER_EXECUTABLE');
  assert.ok(phpExecutable, 'Open Source Profile test requires PHP_COMPANION_PHP_EXECUTABLE');
  assert.ok(phpunitExecutable, 'Open Source Profile test requires PHP_COMPANION_PHPUNIT_EXECUTABLE');
  const extensionIds = [
    'sohophp.twig-plus',
    'redhat.vscode-yaml',
    'redhat.vscode-xml',
    'xdebug.php-debug',
    'recca0120.vscode-phpunit',
    'junstyle.php-cs-fixer',
    'editorconfig.editorconfig',
  ];
  for (const id of extensionIds) assert.ok(vscode.extensions.getExtension(id), `${id} is missing from the Open Source Profile`);
  assert.strictEqual(vscode.extensions.getExtension('bmewburn.vscode-intelephense-client'), undefined, 'Open Source Profile unexpectedly contains Intelephense');
  assert.strictEqual(vscode.extensions.getExtension('symfony.language-tools'), undefined, 'Open Source Profile contains the rejected Symfony Rename provider');

  await vscode.workspace.getConfiguration('php-cs-fixer', workspace.uri).update('executablePath', formatterExecutable, vscode.ConfigurationTarget.Workspace);
  await vscode.workspace.getConfiguration('php-cs-fixer', workspace.uri).update('autoFixByBracket', false, vscode.ConfigurationTarget.Workspace);
  await vscode.workspace.getConfiguration('php-cs-fixer', workspace.uri).update('autoFixBySemicolon', false, vscode.ConfigurationTarget.Workspace);
  const formatUri = vscode.Uri.joinPath(workspace.uri, 'src', 'ProfileFormat.php');
  await vscode.workspace.fs.writeFile(formatUri, Buffer.from('<?php\nclass  ProfileFormat{public function run( ):void{}}\n'));
  const formatDocument = await vscode.workspace.openTextDocument(formatUri);
  await vscode.window.showTextDocument(formatDocument);
  let formattingEdits: vscode.TextEdit[] = [];
  await waitForAsync(async () => {
    formattingEdits = await vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', formatUri, { tabSize: 4, insertSpaces: true }) ?? [];
    return formattingEdits.length > 0;
  }, 'PHP CS Fixer did not provide edits through the project PHP 8.5 wrapper');
  const formatEdit = new vscode.WorkspaceEdit(); formatEdit.set(formatUri, formattingEdits);
  assert.ok(await vscode.workspace.applyEdit(formatEdit), 'PHP CS Fixer edits could not be applied');
  assert.ok(normalizedNewlines(formatDocument.getText()).includes("class ProfileFormat\n{"), 'PHP CS Fixer did not apply PSR-12 class spacing');
  await vscode.commands.executeCommand('undo');
  assert.ok(formatDocument.getText().includes('class  ProfileFormat'), 'PHP formatting was not one Undo transaction');

  const twigUri = vscode.Uri.joinPath(workspace.uri, 'Profile.html.twig');
  await vscode.workspace.fs.writeFile(twigUri, Buffer.from('{%if true%}{{ value }}{%endif%}\n'));
  const twigDocument = await vscode.workspace.openTextDocument(twigUri);
  await vscode.window.showTextDocument(twigDocument);
  await waitForAsync(async () => {
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', twigUri, { tabSize: 2, insertSpaces: true }) ?? [];
    return edits.length > 0;
  }, 'TwigPlus did not remain the Twig formatter in the Open Source Profile');

  const yamlUri = vscode.Uri.joinPath(workspace.uri, 'profile.yaml');
  await vscode.extensions.getExtension('redhat.vscode-yaml')!.activate();
  await vscode.workspace.fs.writeFile(yamlUri, Buffer.from('name:   value\n'));
  const yamlDocument = await vscode.workspace.openTextDocument(yamlUri);
  await vscode.window.showTextDocument(yamlDocument);
  await waitForAsync(async () => {
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', yamlUri, { tabSize: 2, insertSpaces: true }) ?? [];
    return edits.length > 0;
  }, 'Red Hat YAML did not provide YAML formatting in the Open Source Profile', 30_000, 100);

  const xmlUri = vscode.Uri.joinPath(workspace.uri, 'profile.xml');
  await vscode.extensions.getExtension('redhat.vscode-xml')!.activate();
  await vscode.workspace.fs.writeFile(xmlUri, Buffer.from('<?xml version="1.0"?><root><item id="1">value</item></root>\n'));
  const xmlDocument = await vscode.workspace.openTextDocument(xmlUri);
  await vscode.window.showTextDocument(xmlDocument);
  let xmlFormattingEdits: vscode.TextEdit[] = [];
  await waitForAsync(async () => {
    xmlFormattingEdits = await vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', xmlUri, { tabSize: 2, insertSpaces: true }) ?? [];
    return xmlFormattingEdits.length > 0;
  }, 'Red Hat XML did not provide XML formatting in the Open Source Profile', 30_000, 100);
  const xmlFormatEdit = new vscode.WorkspaceEdit(); xmlFormatEdit.set(xmlUri, xmlFormattingEdits);
  assert.ok(await vscode.workspace.applyEdit(xmlFormatEdit), 'Red Hat XML formatting edits could not be applied');
  assert.ok(normalizedNewlines(xmlDocument.getText()).includes('\n  <item id="1">value</item>\n'), 'Red Hat XML did not format nested XML content');

  const jsonUri = vscode.Uri.joinPath(workspace.uri, 'profile.json');
  await vscode.workspace.fs.writeFile(jsonUri, Buffer.from('{"name":"value","enabled":true}\n'));
  const jsonDocument = await vscode.workspace.openTextDocument(jsonUri); await vscode.window.showTextDocument(jsonDocument);
  await waitForAsync(async () => {
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', jsonUri, { tabSize: 2, insertSpaces: true }) ?? [];
    return edits.length > 0;
  }, 'VS Code built-in JSON service did not provide JSON formatting');

  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspace.uri, '.editorconfig'), Buffer.from('root = true\n\n[*.php]\nindent_style = space\nindent_size = 3\n'));
  const editorConfigUri = vscode.Uri.joinPath(workspace.uri, 'EditorConfigProbe.php');
  await vscode.workspace.fs.writeFile(editorConfigUri, Buffer.from('<?php\nfunction probe(): void {}\n'));
  const editorConfigDocument = await vscode.workspace.openTextDocument(editorConfigUri);
  const editorConfigEditor = await vscode.window.showTextDocument(editorConfigDocument);
  await waitFor(() => editorConfigEditor.options.insertSpaces === true && editorConfigEditor.options.tabSize === 3, 'EditorConfig did not apply the workspace PHP indentation settings');

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('phpunit.run-all'), 'PHPUnit test command was not registered');
  const debuggers = vscode.extensions.getExtension('xdebug.php-debug')!.packageJSON.contributes?.debuggers as Array<{ type?: string }> | undefined;
  assert.ok(debuggers?.some((debuggerContribution) => debuggerContribution.type === 'php'), 'PHP Debug did not contribute the php debugger');

  const debugUri = vscode.Uri.joinPath(workspace.uri, 'debug-profile.php');
  await vscode.workspace.fs.writeFile(debugUri, Buffer.from('<?php $value = 42; echo $value, PHP_EOL;\n'));
  let debugStarted = false;
  const started = vscode.debug.onDidStartDebugSession((session) => { if (session.type === 'php') debugStarted = true; });
  const terminated = new Promise<void>((resolve, reject) => {
    const listener = vscode.debug.onDidTerminateDebugSession((session) => {
      if (session.type !== 'php') return;
      clearTimeout(timeout); listener.dispose(); resolve();
    });
    const timeout = setTimeout(() => { listener.dispose(); reject(new Error('PHP Debug probe did not terminate within 10 seconds')); }, 10_000);
  });
  try {
    assert.ok(await vscode.debug.startDebugging(workspace, {
      type: 'php', request: 'launch', name: 'Open Source Profile Xdebug probe', program: debugUri.fsPath,
      cwd: workspace.uri.fsPath, runtimeExecutable: phpExecutable, stopOnEntry: false,
    }), 'PHP Debug refused to start a launch session');
    await terminated;
    assert.ok(debugStarted, 'PHP Debug did not start a php debug session');
    await vscode.debug.stopDebugging();
    await waitFor(() => vscode.debug.activeDebugSession === undefined, 'PHP Debug probe did not leave the active session');
  } finally { started.dispose(); await vscode.debug.stopDebugging(); }

  await vscode.workspace.getConfiguration('phpunit', workspace.uri).update('php', phpExecutable, vscode.ConfigurationTarget.Workspace);
  await vscode.workspace.getConfiguration('phpunit', workspace.uri).update('phpunit', phpunitExecutable, vscode.ConfigurationTarget.Workspace);
  const testUri = vscode.Uri.joinPath(workspace.uri, 'tests', 'ProfileTest.php');
  const testResultUri = vscode.Uri.joinPath(workspace.uri, 'phpunit-ran.txt');
  const testSourceUri = vscode.Uri.joinPath(workspace.uri, 'phpunit-source.txt');
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspace.uri, 'tests'));
  await vscode.workspace.fs.writeFile(testUri, Buffer.from(`<?php
use PHPUnit\\Framework\\TestCase;
final class ProfileTest extends TestCase {
    public function testProfile(): void {
        file_put_contents(dirname(__DIR__) . '/phpunit-ran.txt', 'passed');
        file_put_contents(dirname(__DIR__) . '/phpunit-source.txt', basename(__FILE__));
        self::assertTrue(true);
    }
}
`));
  const testDocument = await vscode.workspace.openTextDocument(testUri); await vscode.window.showTextDocument(testDocument);
  await vscode.extensions.getExtension('recca0120.vscode-phpunit')!.activate();
  await vscode.commands.executeCommand('phpunit.reload');
  const phpUnitResultMatches = async (expectedFile: string): Promise<boolean> => {
    try {
      return Buffer.from(await vscode.workspace.fs.readFile(testResultUri)).toString('utf8') === 'passed'
        && Buffer.from(await vscode.workspace.fs.readFile(testSourceUri)).toString('utf8') === expectedFile;
    } catch { return false; }
  };
  const runPhpUnitUntil = async (command: 'phpunit.run-file' | 'phpunit.run-all', expectedFile: string, message: string, uri?: vscode.Uri): Promise<void> => {
    let lastAttempt = 0;
    await waitForAsync(async () => {
      if (await phpUnitResultMatches(expectedFile)) return true;
      if (Date.now() - lastAttempt >= 10_000) {
        lastAttempt = Date.now();
        await vscode.commands.executeCommand(command, ...(uri ? [uri] : []));
      }
      return false;
    }, message, 60_000, 250);
  };
  await runPhpUnitUntil('phpunit.run-file', 'ProfileTest.php', 'PHPUnit extension did not execute the selected test file through the configured PHP runtime', testUri);
  await vscode.workspace.fs.delete(testResultUri);
  await vscode.workspace.fs.delete(testSourceUri);
  await runPhpUnitUntil('phpunit.run-all', 'ProfileTest.php', 'PHPUnit extension did not discover and execute the configured test suite');
  const movedTestUri = vscode.Uri.joinPath(workspace.uri, 'tests', 'MovedProfileTest.php');
  const verifyMovedSuite = async (expectedFile: string): Promise<void> => {
    await vscode.workspace.fs.delete(testResultUri);
    await vscode.workspace.fs.delete(testSourceUri);
    await runPhpUnitUntil('phpunit.run-all', expectedFile, `PHPUnit did not execute the suite from ${expectedFile}`);
  };
  await vscode.window.showTextDocument(testDocument);
  const moveTest = new vscode.WorkspaceEdit();
  moveTest.renameFile(testUri, movedTestUri);
  assert.ok(await vscode.workspace.applyEdit(moveTest), 'Could not move PHPUnit fixture');
  await verifyMovedSuite('MovedProfileTest.php');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(movedTestUri));
  await vscode.commands.executeCommand('undo');
  await waitForAsync(async () => { await vscode.workspace.fs.stat(testUri); return true; }, 'Could not undo PHPUnit fixture move');
  await verifyMovedSuite('ProfileTest.php');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(testUri));
  await vscode.commands.executeCommand('redo');
  await waitForAsync(async () => { await vscode.workspace.fs.stat(movedTestUri); return true; }, 'Could not redo PHPUnit fixture move');
  await verifyMovedSuite('MovedProfileTest.php');
}

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'PHP Companion extension was not discovered');
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('phpCompanion.selectPhpVersion'));
  assert.ok(commands.includes('phpCompanion.new.class'));
  assert.ok(commands.includes('phpCompanion.copy.fqcn'));
  assert.ok(commands.includes('phpCompanion.showPerformanceLog'));
  assert.ok(commands.includes('phpCompanion.safeMove'));
  assert.ok(commands.includes('phpCompanion.importClass'));
  assert.ok(commands.includes('phpCompanion.optimizeImports'));

  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'Fixture workspace was not opened');
  if (process.env.PHP_COMPANION_TEST_WITH_INTELEPHENSE === '1') {
    assert.ok(vscode.extensions.getExtension('bmewburn.vscode-intelephense-client'), 'Intelephense compatibility profile did not install Intelephense');
    const inspected = vscode.workspace.getConfiguration('phpCompanion', workspace.uri).inspect<boolean>('languageServer.enabled');
    assert.strictEqual(inspected?.workspaceValue, undefined, 'Intelephense compatibility fixture must not explicitly enable the self-hosted language server');
    assert.strictEqual(inspected?.workspaceFolderValue, undefined, 'Intelephense compatibility fixture must not enable the self-hosted language server for a folder');
    assert.ok(!commands.includes('phpCompanion._testCrashLanguageServer'), 'PHP Companion started its language server without an explicit choice beside Intelephense');
    assert.ok(!commands.includes('phpCompanion.provideTwigInterop'), 'PHP Companion exposed language-server interop while defaulting to Intelephense');
    return;
  }
  if (process.env.PHP_COMPANION_PACKAGED_TEST === '1') {
    const languageServerConfiguration = vscode.workspace.getConfiguration('phpCompanion', workspace.uri);
    const inspected = languageServerConfiguration.inspect<boolean>('languageServer.enabled');
    assert.strictEqual(languageServerConfiguration.get('languageServer.enabled'), true, 'Packaged PHP Companion did not enable its self-hosted language server by default');
    assert.strictEqual(inspected?.workspaceValue, undefined, 'Packaged fixture must not explicitly enable the language server');
    assert.strictEqual(inspected?.workspaceFolderValue, undefined, 'Packaged fixture must not explicitly enable the language server for a folder');
  }
  const brokenUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Broken.php');
  await vscode.workspace.openTextDocument(brokenUri);
  await waitFor(
    () => vscode.languages.getDiagnostics(brokenUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.syntax'),
    'Self-hosted language server did not publish coded syntax diagnostics',
  );
  await waitForAsync(async () => await vscode.commands.executeCommand('phpCompanion.provideTwigInterop', workspace.uri) !== null,
    'Self-hosted language server did not complete its initial project index', 120_000, 250);
  const controlFlowDiagnosticUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'ControlFlowDiagnostics.php');
  await vscode.workspace.openTextDocument(controlFlowDiagnosticUri);
  await waitFor(
    () => vscode.languages.getDiagnostics(controlFlowDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.control-flow.unreachable').length === 10,
    'Self-hosted language server did not publish a proven unreachable-statement diagnostic',
  );
  const controlFlowDocument = await vscode.workspace.openTextDocument(controlFlowDiagnosticUri);
  assert.deepStrictEqual(vscode.languages.getDiagnostics(controlFlowDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.control-flow.unreachable')
    .map((diagnostic) => controlFlowDocument.getText(diagnostic.range)), [
      'cleanup();', 'unreachableAfterConditional();', 'unreachableAfterSwitch();', 'unreachableAfterInfiniteLoop();',
      'unreachableAfterInitializedFor();', 'unreachableAfterNeverCall();', 'unreachableAfterNestedNeverCall();',
      'unreachableAfterNeverCondition();', 'unreachableAfterNestedThrow();', 'unreachableAfterThrowTernary();',
    ], 'Packaged unreachable diagnostics did not preserve the complete-branch boundary');
  await waitFor(
    () => vscode.languages.getDiagnostics(controlFlowDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.never.fallthrough').length === 1,
    'Self-hosted language server did not publish the proven never fallthrough diagnostic',
  );
  const neverFallthroughDiagnostics = vscode.languages.getDiagnostics(controlFlowDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.never.fallthrough');
  assert.deepStrictEqual(neverFallthroughDiagnostics.map((diagnostic) => controlFlowDocument.getText(diagnostic.range)),
    ['invalidNeverFallthrough'], 'Packaged never fallthrough diagnostics crossed an unknown-call boundary');
  await waitFor(
    () => vscode.languages.getDiagnostics(controlFlowDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.return.missing').length === 1,
    'Self-hosted language server did not publish the proven missing-return diagnostic',
  );
  const missingReturnDiagnostics = vscode.languages.getDiagnostics(controlFlowDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.return.missing');
  assert.deepStrictEqual(missingReturnDiagnostics.map((diagnostic) => controlFlowDocument.getText(diagnostic.range)),
    ['missingValueReturn'], 'Packaged missing-return diagnostics crossed an unknown-call boundary');
  await waitFor(
    () => vscode.languages.getDiagnostics(controlFlowDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.inheritance.final-class'),
    'Self-hosted language server did not reject extending a final class',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(controlFlowDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.method.incompatible-override'),
    'Self-hosted language server did not reject overriding a final method',
  );
  const duplicateDiagnosticUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'DuplicateDeclarations.php');
  const duplicateDiagnosticDocument = await vscode.workspace.openTextDocument(duplicateDiagnosticUri);
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.duplicate.function'),
    'Self-hosted language server did not publish a duplicate named-function diagnostic',
  );
  const duplicateFunctionDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.duplicate.function');
  const duplicateFunctionStart = duplicateDiagnosticDocument.getText().indexOf('DUPLICATEHELPER');
  assert.strictEqual(duplicateFunctionDiagnostics.length, 1, 'Duplicate function declarations produced an unexpected diagnostic count');
  assert.strictEqual(duplicateFunctionDiagnostics[0]!.message, 'Duplicate function declaration.');
  assert.deepStrictEqual(duplicateFunctionDiagnostics[0]!.range, new vscode.Range(
    duplicateDiagnosticDocument.positionAt(duplicateFunctionStart),
    duplicateDiagnosticDocument.positionAt(duplicateFunctionStart + 'DUPLICATEHELPER'.length),
  ), 'Duplicate function diagnostic did not mark only the later function name');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.method.invalid-magic-signature').length === 7,
    'Self-hosted language server did not publish invalid constructor and destructor signature diagnostics',
  );
  const lifecycleDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.method.invalid-magic-signature');
  assert.deepStrictEqual(lifecycleDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), [
    '__construct', '__destruct', '__clone', '__callStatic', '__serialize', '__debugInfo', '__get',
  ],
    'Invalid lifecycle method diagnostics did not mark the method names');
  assert.deepStrictEqual(lifecycleDiagnostics.slice(2).map((diagnostic) => diagnostic.message), [
    'Magic method App\\Service\\InvalidLifecycle::__clone has an invalid signature: must accept exactly 0 parameters; return type must be void or a compatible subtype when declared.',
    'Magic method App\\Service\\InvalidLifecycle::__callStatic has an invalid signature: must accept exactly 2 parameters; must be static.',
    'Magic method App\\Service\\InvalidLifecycle::__serialize has an invalid signature: must accept exactly 0 parameters; cannot be static; return type must be array or a compatible subtype when declared.',
    'Magic method App\\Service\\InvalidLifecycle::__debugInfo has an invalid signature: must accept exactly 0 parameters; cannot be static; return type must be ?array or a compatible subtype when declared.',
    'Magic method App\\Service\\InvalidLifecycle::__get has an invalid signature: cannot take parameters by reference; cannot be static; parameter 1 type must accept string when declared.',
  ], 'Classic magic method diagnostics did not retain stable packaged messages');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.method.magic-visibility').length === 1,
    'Self-hosted language server did not publish the magic method visibility warning',
  );
  const magicVisibilityDiagnostic = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .find((diagnostic) => diagnostic.code === 'php.method.magic-visibility');
  assert.strictEqual(magicVisibilityDiagnostic?.severity, vscode.DiagnosticSeverity.Warning);
  assert.strictEqual(magicVisibilityDiagnostic?.message, 'Magic method App\\Service\\InvalidLifecycle::__invoke must have public visibility.');
  assert.strictEqual(duplicateDiagnosticDocument.getText(magicVisibilityDiagnostic?.range), '__invoke',
    'Magic visibility warning did not mark only the method name');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.property.invalid-readonly-declaration').length === 5,
    'Self-hosted language server did not publish invalid readonly property declaration diagnostics',
  );
  const invalidReadonlyPropertyDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.property.invalid-readonly-declaration');
  assert.deepStrictEqual(invalidReadonlyPropertyDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), [
    '$all', '$defaulted', '$untyped', '$staticValue', '$defaulted',
  ], 'Invalid readonly property diagnostics did not mark only property names');
  assert.deepStrictEqual(invalidReadonlyPropertyDiagnostics.map((diagnostic) => diagnostic.message), [
    'Readonly property App\\Service\\InvalidReadonlyProperties::$all must have a type; cannot be static; cannot have a default value.',
    'Readonly property App\\Service\\InvalidReadonlyProperties::$defaulted cannot have a default value.',
    'Readonly property App\\Service\\InvalidReadonlyClassProperties::$untyped must have a type.',
    'Readonly property App\\Service\\InvalidReadonlyClassProperties::$staticValue cannot be static.',
    'Readonly property App\\Service\\InvalidReadonlyClassProperties::$defaulted cannot have a default value.',
  ], 'Invalid readonly property diagnostics did not retain stable packaged messages');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.inheritance.readonly-mismatch').length === 2,
    'Self-hosted language server did not publish readonly inheritance mismatch diagnostics',
  );
  const readonlyInheritanceDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.inheritance.readonly-mismatch');
  assert.deepStrictEqual(readonlyInheritanceDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), [
    'InvalidReadonlyChild', 'InvalidMutableChild',
  ]);
  assert.deepStrictEqual(readonlyInheritanceDiagnostics.map((diagnostic) => diagnostic.message), [
    'Readonly class App\\Service\\InvalidReadonlyChild cannot extend non-readonly class App\\Service\\MutableReadonlyContractBase.',
    'Non-readonly class App\\Service\\InvalidMutableChild cannot extend readonly class App\\Service\\ReadonlyContractBase.',
  ]);
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.readonly-class.invalid-trait').length === 2,
    'Self-hosted language server did not publish readonly Trait compatibility diagnostics',
  );
  const readonlyTraitDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.readonly-class.invalid-trait');
  assert.deepStrictEqual(readonlyTraitDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), [
    'MutableReadonlyContractProperty', 'NestedMutableReadonlyContractProperty',
  ]);
  assert.deepStrictEqual(readonlyTraitDiagnostics.map((diagnostic) => diagnostic.message), [
    'Readonly class App\\Service\\InvalidDirectReadonlyTraitUse cannot use trait App\\Service\\MutableReadonlyContractProperty because App\\Service\\MutableReadonlyContractProperty declares non-readonly property $mutableValue.',
    'Readonly class App\\Service\\InvalidNestedReadonlyTraitUse cannot use trait App\\Service\\NestedMutableReadonlyContractProperty because App\\Service\\MutableReadonlyContractProperty declares non-readonly property $mutableValue.',
  ]);
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.enum.invalid-member').length === 9,
    'Self-hosted language server did not publish invalid enum member diagnostics',
  );
  const invalidEnumMemberDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.enum.invalid-member');
  assert.deepStrictEqual(invalidEnumMemberDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), [
    '$value', '$shared', '__get', '__serialize', 'cases', 'cases', 'from', 'tryFrom', 'NestedEnumPropertyTrait',
  ], 'Invalid enum member diagnostics did not mark only property or method names');
  assert.deepStrictEqual(invalidEnumMemberDiagnostics.map((diagnostic) => diagnostic.message), [
    'Enum App\\Service\\InvalidEnumMembers cannot declare property $value.',
    'Enum App\\Service\\InvalidEnumMembers cannot declare property $shared.',
    'Enum App\\Service\\InvalidEnumMembers cannot include magic method __get.',
    'Enum App\\Service\\InvalidEnumMembers cannot include magic method __serialize.',
    'Enum App\\Service\\InvalidUnitSynthesizedMethod cannot redeclare synthesized method cases.',
    'Enum App\\Service\\InvalidBackedSynthesizedMethods cannot redeclare synthesized method cases.',
    'Enum App\\Service\\InvalidBackedSynthesizedMethods cannot redeclare synthesized method from.',
    'Enum App\\Service\\InvalidBackedSynthesizedMethods cannot redeclare synthesized method tryFrom.',
    'Enum App\\Service\\InvalidEnumTraitUse cannot use trait App\\Service\\NestedEnumPropertyTrait because App\\Service\\EnumPropertyTrait declares property $fromTrait.',
  ], 'Invalid enum member diagnostics did not retain stable packaged messages');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.enum.invalid-case').length === 4,
    'Self-hosted language server did not publish invalid enum case diagnostics',
  );
  const invalidEnumCaseDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.enum.invalid-case');
  assert.deepStrictEqual(invalidEnumCaseDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), [
    'Invalid', 'Missing', 'Wrong', 'Duplicate',
  ], 'Invalid enum case diagnostics did not mark only case names');
  assert.deepStrictEqual(invalidEnumCaseDiagnostics.map((diagnostic) => diagnostic.message), [
    'Case App\\Service\\InvalidUnitCase::Invalid of a non-backed enum must not have a value.',
    'Case App\\Service\\InvalidBackedCases::Missing of a backed enum must have a value.',
    'Case App\\Service\\InvalidBackedCases::Wrong has int value but enum backing type is string.',
    'Case App\\Service\\InvalidBackedCases::Duplicate duplicates the backing value of App\\Service\\InvalidBackedCases::First.',
  ], 'Invalid enum case diagnostics did not retain stable packaged messages');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.enum.invalid-interface').length === 5,
    'Self-hosted language server did not publish invalid enum interface diagnostics',
  );
  const invalidEnumInterfaceDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.enum.invalid-interface');
  assert.deepStrictEqual(invalidEnumInterfaceDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), [
    '\\UnitEnum', '\\BackedEnum', '\\Serializable', 'EnumSerializableChild', 'EnumBackedChild',
  ], 'Invalid enum interface diagnostics did not mark only implemented interface names');
  assert.deepStrictEqual(invalidEnumInterfaceDiagnostics.map((diagnostic) => diagnostic.message), [
    'Enum App\\Service\\InvalidDirectUnitInterface cannot explicitly implement built-in interface UnitEnum.',
    'Enum App\\Service\\InvalidDirectBackedInterface cannot explicitly implement built-in interface BackedEnum.',
    'Enum App\\Service\\InvalidDirectSerializable cannot implement the Serializable interface.',
    'Enum App\\Service\\InvalidNestedSerializable cannot implement App\\Service\\EnumSerializableChild because it extends Serializable.',
    'Non-backed enum App\\Service\\InvalidNonBackedInterface cannot implement App\\Service\\EnumBackedChild because it extends BackedEnum.',
  ], 'Invalid enum interface diagnostics did not retain stable packaged messages');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.type.invalid-declaration').length === 4,
    'Self-hosted language server did not publish invalid native type declaration diagnostics',
  );
  const invalidTypeDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.type.invalid-declaration');
  assert.deepStrictEqual(invalidTypeDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), ['callable', 'void', 'void', 'int'],
    'Invalid native type diagnostics did not mark only the offending atomic types');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.type.redundant-declaration').length === 5,
    'Self-hosted language server did not publish redundant native type diagnostics',
  );
  const redundantTypeDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.type.redundant-declaration');
  assert.deepStrictEqual(redundantTypeDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), ['INT', 'false', 'InvalidLifecycle', '\\Traversable', 'invalidlifecycle'],
    'Redundant native type diagnostics did not mark only the redundant atomic types');
  const duplicateClassTypeDiagnostic = redundantTypeDiagnostics.find((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range) === 'invalidlifecycle');
  assert.strictEqual(duplicateClassTypeDiagnostic?.message, 'Type invalidlifecycle is declared more than once.');
  const duplicateClassTypeStart = duplicateDiagnosticDocument.getText().indexOf('invalidlifecycle');
  assert.deepStrictEqual(duplicateClassTypeDiagnostic?.range, new vscode.Range(
    duplicateDiagnosticDocument.positionAt(duplicateClassTypeStart),
    duplicateDiagnosticDocument.positionAt(duplicateClassTypeStart + 'invalidlifecycle'.length),
  ), 'Duplicate class type diagnostic did not mark only the later type name');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.type.invalid-relative-scope').length === 3,
    'Self-hosted language server did not publish invalid relative-scope diagnostics',
  );
  const relativeScopeDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.type.invalid-relative-scope');
  const duplicateDiagnosticSource = duplicateDiagnosticDocument.getText();
  const relativeScopeStart = duplicateDiagnosticSource.indexOf('parent', duplicateDiagnosticSource.indexOf('invalidRelativeScope'));
  const expectedRelativeScopeStarts = [
    relativeScopeStart,
    duplicateDiagnosticSource.indexOf('parent', relativeScopeStart + 1),
    duplicateDiagnosticSource.indexOf('parent', duplicateDiagnosticSource.indexOf('parent', relativeScopeStart + 1) + 1),
  ];
  assert.deepStrictEqual(relativeScopeDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), ['parent', 'parent', 'parent'],
    'Invalid relative-scope diagnostics did not mark only the relative scope keyword');
  assert.deepStrictEqual(relativeScopeDiagnostics.map((diagnostic) => diagnostic.message), [
    'Cannot use parent in App\\Service\\InvalidLifecycle because it has no parent type.',
    'Cannot use parent in App\\Service\\InvalidLifecycle because it has no parent type.',
    'Cannot use parent in App\\Service\\InvalidLifecycle because it has no parent type.',
  ], 'Invalid relative-scope diagnostics did not retain the stable message');
  assert.deepStrictEqual(relativeScopeDiagnostics.map((diagnostic) => diagnostic.range), expectedRelativeScopeStarts.map((start) => new vscode.Range(
    duplicateDiagnosticDocument.positionAt(start),
    duplicateDiagnosticDocument.positionAt(start + 'parent'.length),
  )), 'Invalid relative-scope diagnostics did not retain exact ranges');
  await waitFor(
    () => vscode.languages.getDiagnostics(duplicateDiagnosticUri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.method.invalid-abstract-declaration').length === 7,
    'Self-hosted language server did not publish invalid abstract method diagnostics',
  );
  const abstractMethodDiagnostics = vscode.languages.getDiagnostics(duplicateDiagnosticUri)
    .filter((diagnostic) => diagnostic.code === 'php.method.invalid-abstract-declaration');
  assert.deepStrictEqual(abstractMethodDiagnostics.map((diagnostic) => duplicateDiagnosticDocument.getText(diagnostic.range)), [
    'withBody', 'missingBody', 'hidden', 'finalAbstract', 'interfaceBody', 'finalInterface', 'protectedInterface',
  ], 'Invalid abstract method diagnostics did not mark only method names');
  assert.deepStrictEqual(abstractMethodDiagnostics.map((diagnostic) => diagnostic.message), [
    'Invalid declaration of App\\Service\\InvalidAbstractMethods::withBody: abstract methods cannot contain a body.',
    'Invalid declaration of App\\Service\\InvalidAbstractMethods::missingBody: non-abstract methods must contain a body.',
    'Invalid declaration of App\\Service\\InvalidAbstractMethods::hidden: abstract methods cannot be private outside a trait.',
    'Invalid declaration of App\\Service\\InvalidAbstractMethods::finalAbstract: abstract methods cannot be final.',
    'Invalid declaration of App\\Service\\InvalidInterfaceMethod::interfaceBody: interface methods cannot contain a body.',
    'Invalid declaration of App\\Service\\InvalidInterfaceMethod::finalInterface: interface methods cannot be final.',
    'Invalid declaration of App\\Service\\InvalidInterfaceMethod::protectedInterface: interface methods must be public.',
  ], 'Invalid abstract method diagnostics did not retain stable messages');
  const strictScalarDiagnosticUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'StrictScalarDiagnostics.php');
  const strictScalarDocument = await vscode.workspace.openTextDocument(strictScalarDiagnosticUri);
  await waitFor(
    () => ['php.argument.type-mismatch', 'php.return.type-mismatch', 'php.assignment.type-mismatch'].every((code) => vscode.languages.getDiagnostics(strictScalarDiagnosticUri)
      .some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === code)),
    'Self-hosted language server did not publish strict scalar literal argument, return, and property-assignment diagnostics',
    15_000,
  );
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('DeliveryState::from')), 'Synthetic backed Enum factory signature did not participate in strict argument diagnostics');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptStateClass') && diagnostic.message.includes('class-string<App\\Service\\ConstructedReadonlyState>')),
  'Bounded PHPDoc class-string did not reject a resolved unrelated class constant');
  const phpDocConflictUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'PhpDocTypeConflicts.php');
  const phpDocConflictDocument = await vscode.workspace.openTextDocument(phpDocConflictUri);
  await waitFor(
    () => vscode.languages.getDiagnostics(phpDocConflictUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.phpdoc.type-conflict'),
    'Self-hosted language server did not publish a proven PHPDoc/native type conflict',
    15_000,
  );
  const phpDocConflict = vscode.languages.getDiagnostics(phpDocConflictUri).filter((diagnostic) => diagnostic.code === 'php.phpdoc.type-conflict');
  const phpDocConflictStart = phpDocConflictDocument.getText().indexOf('DocumentedParent $value');
  assert.strictEqual(phpDocConflict.length, 1, 'Legal PHPDoc subtype refinement produced an extra conflict');
  assert.deepStrictEqual(phpDocConflict[0]!.range, new vscode.Range(
    phpDocConflictDocument.positionAt(phpDocConflictStart),
    phpDocConflictDocument.positionAt(phpDocConflictStart + 'DocumentedParent'.length),
  ), 'PHPDoc/native conflict did not mark only the documented type');
  const assertionConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'AssertionConsumer.php');
  const assertionConsumer = await vscode.workspace.openTextDocument(assertionConsumerUri);
  const assertedOffset = assertionConsumer.getText().indexOf('$proven->only') + '$proven->only'.length;
  const conditionalOffset = assertionConsumer.getText().indexOf('$conditional->onlyReady') + '$conditional->'.length + 2;
  const outsideConditionalOffset = assertionConsumer.getText().lastIndexOf('$conditional->onlyReady') + '$conditional->'.length + 2;
  const compoundOffset = assertionConsumer.getText().indexOf('$compound->onlyReady') + '$compound->'.length + 2;
  const nonNullOffset = assertionConsumer.getText().indexOf('$nullable->onlyReady') + '$nullable->'.length + 2;
  const templateAssertionOffset = assertionConsumer.getText().indexOf('$templated->onlyReady') + '$templated->'.length + 2;
  const propertyAssertionOffset = assertionConsumer.getText().indexOf('$holder->value->onlyReady') + '$holder->value->'.length + 2;
  const methodAssertionOffset = assertionConsumer.getText().indexOf('$methodProven->onlyReady') + '$methodProven->'.length + 2;
  const thisAssertionOffset = assertionConsumer.getText().lastIndexOf('$holder->value->onlyReady') + '$holder->value->'.length + 2;
  const nestedAssertionOffset = assertionConsumer.getText().indexOf('$nestedHolder->nested->value->onlyReady') + '$nestedHolder->nested->value->'.length + 2;
  const negativePropertyOffset = assertionConsumer.getText().indexOf('$holder->optional->onlyReady') + '$holder->optional->'.length + 2;
  const templatePropertyOffset = assertionConsumer.getText().indexOf('$templateHolder->value->onlyReady') + '$templateHolder->value->'.length + 2;
  const shortCircuitAssertionOffset = assertionConsumer.getText().indexOf('$shortCircuit->onlyReady') + '$shortCircuit->'.length + 2;
  const guardAssertionOffset = assertionConsumer.getText().indexOf('$guarded->onlyReady') + '$guarded->'.length + 2;
  const alternativeGuardAssertionOffset = assertionConsumer.getText().indexOf('$alternativeGuard->onlyReady') + '$alternativeGuard->'.length + 2;
  const nestedGuardAssertionOffset = assertionConsumer.getText().indexOf('$nestedGuard->onlyReady') + '$nestedGuard->'.length + 2;
  const tryGuardAssertionOffset = assertionConsumer.getText().indexOf('$tryGuard->onlyReady') + '$tryGuard->'.length + 2;
  const switchGuardAssertionOffset = assertionConsumer.getText().indexOf('$switchGuard->onlyReady') + '$switchGuard->'.length + 2;
  const loopGuardAssertionOffset = assertionConsumer.getText().indexOf('$loopGuard->onlyReady') + '$loopGuard->'.length + 2;
  const literalNegativeAssertionOffset = assertionConsumer.getText().indexOf('$literalNegative->onlyReady') + '$literalNegative->'.length + 2;
  const genericNegativeAssertionOffset = assertionConsumer.getText().indexOf('$genericNegative->get()->onlyGenericUser') + '$genericNegative->get()->'.length + 2;
  const intersectionNegativeAssertionOffset = assertionConsumer.getText().indexOf('$intersectionNegative->onlyReady') + '$intersectionNegative->'.length + 2;
  const remainingIntersectionAssertionOffset = assertionConsumer.getText().indexOf('$remainingIntersection->onlyMarker') + '$remainingIntersection->'.length + 2;
  const conditionalReadyOffset = assertionConsumer.getText().indexOf('$conditionalReady->onlyConditionalReady') + '$conditionalReady->'.length + 2;
  const conditionalOtherOffset = assertionConsumer.getText().indexOf('$conditionalOther->onlyConditionalOther') + '$conditionalOther->'.length + 2;
  const conditionalUnknownOffset = assertionConsumer.getText().indexOf('$conditionalUnknown->commonConditional') + '$conditionalUnknown->'.length + 2;
  const nestedConditionalOffset = assertionConsumer.getText().indexOf('$nestedConditional->commonConditional') + '$nestedConditional->'.length + 2;
  const crossConditionalOffset = assertionConsumer.getText().indexOf('$crossConditional->commonConditional') + '$crossConditional->'.length + 2;
  const callableConditionalReadyOffset = assertionConsumer.getText().indexOf('$callableConditionalReady->onlyConditionalReady') + '$callableConditionalReady->'.length + 2;
  const callableConditionalOtherOffset = assertionConsumer.getText().indexOf('$callableConditionalOther->onlyConditionalOther') + '$callableConditionalOther->'.length + 2;
  const callableConditionalUnknownOffset = assertionConsumer.getText().indexOf('$callableConditionalUnknown->commonConditional') + '$callableConditionalUnknown->'.length + 2;
  const loopAssertionOffset = assertionConsumer.getText().indexOf('$loopAssertion->onlyReady') + '$loopAssertion->'.length + 2;
  const outsideLoopAssertionOffset = assertionConsumer.getText().lastIndexOf('$loopAssertion->onlyReady') + '$loopAssertion->'.length + 2;
  const doShortAssertionOffset = assertionConsumer.getText().indexOf('$doShortAssertion->onlyReady') + '$doShortAssertion->'.length + 2;
  const magicPropertyOffset = assertionConsumer.getText().indexOf('$magicRepository->profile') + '$magicRepository->'.length + 2;
  const magicMethodOffset = assertionConsumer.getText().indexOf('$magicRepository->find') + '$magicRepository->'.length + 2;
  const magicPropertyChainOffset = assertionConsumer.getText().indexOf('$magicRepository->profile->label') + '$magicRepository->profile->'.length + 2;
  const magicMethodChainOffset = assertionConsumer.getText().indexOf('$magicRepository->find(1)->label') + '$magicRepository->find(1)->'.length + 2;
  const magicReadOnlyChainOffset = assertionConsumer.getText().indexOf('$magicRepository->createdBy->label') + '$magicRepository->createdBy->'.length + 2;
  const magicWriteOnlyOffset = assertionConsumer.getText().indexOf('$magicRepository->payload =') + '$magicRepository->'.length + 2;
  const magicWriteOnlyReadOffset = assertionConsumer.getText().indexOf('$magicRepository->payload->label') + '$magicRepository->payload->'.length + 2;
  const magicNamedIdOverloadOffset = assertionConsumer.getText().indexOf('$magicRepository->locate(id: 1)->label') + '$magicRepository->locate(id: 1)->'.length + 2;
  const magicNamedSlugOverloadOffset = assertionConsumer.getText().indexOf("$magicRepository->locate(slug: 'team')->other") + "$magicRepository->locate(slug: 'team')->".length + 2;
  const magicTypedOverloadOffset = assertionConsumer.getText().indexOf('$magicRepository->locate(1)->label') + '$magicRepository->locate(1)->'.length + 2;
  const magicAmbiguousOverloadOffset = assertionConsumer.getText().indexOf('$magicRepository->locate($magicKey)->label') + '$magicRepository->locate($magicKey)->'.length + 2;
  const magicTemplateOffset = assertionConsumer.getText().indexOf('$magicRepository->fetch(MagicProfile::class)->label') + '$magicRepository->fetch(MagicProfile::class)->'.length + 2;
  const magicInvalidTemplateOffset = assertionConsumer.getText().indexOf('$magicRepository->fetch(MagicOther::class)->label') + '$magicRepository->fetch(MagicOther::class)->'.length + 2;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', assertionConsumerUri, assertionConsumer.positionAt(assertedOffset), '>',
    );
    return completion.items.some((item) => (typeof item.label === 'string' ? item.label : item.label.label) === 'onlyReady');
  }, 'An unconditional PHPStan assertion did not narrow the direct parameter in the packaged extension');
  const conditionalAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(conditionalOffset),
  );
  assert.strictEqual(conditionalAssertionDefinitions.length, 1,
    'A conditional PHPStan assertion did not narrow its direct truthy branch');
  const outsideConditionalDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(outsideConditionalOffset),
  );
  assert.strictEqual(outsideConditionalDefinitions.length, 0,
    'A conditional PHPStan assertion escaped its proven branch');
  const compoundAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(compoundOffset),
  );
  assert.strictEqual(compoundAssertionDefinitions.length, 1,
    'A conditional PHPStan assertion did not narrow a logically implied conjunction branch');
  const nonNullAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(nonNullOffset),
  );
  assert.strictEqual(nonNullAssertionDefinitions.length, 1,
    'A negative-null PHPStan assertion did not narrow its nullable object parameter');
  const templateAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(templateAssertionOffset),
  );
  assert.strictEqual(templateAssertionDefinitions.length, 1,
    'A class-string witness did not specialize a PHPStan template assertion');
  const propertyAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(propertyAssertionOffset),
  );
  assert.strictEqual(propertyAssertionDefinitions.length, 1,
    'A PHPStan property assertion did not narrow the direct public property chain');
  const methodAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(methodAssertionOffset),
  );
  assert.strictEqual(methodAssertionDefinitions.length, 1,
    'A PHPStan assertion method did not narrow its direct parameter');
  const thisAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(thisAssertionOffset),
  );
  assert.strictEqual(thisAssertionDefinitions.length, 1,
    'A PHPStan $this property assertion did not narrow the direct method receiver');
  const nestedAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(nestedAssertionOffset),
  );
  assert.strictEqual(nestedAssertionDefinitions.length, 1,
    'A PHPStan multi-level property assertion did not narrow the visible property chain');
  const negativePropertyDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(negativePropertyOffset),
  );
  assert.strictEqual(negativePropertyDefinitions.length, 1,
    'A PHPStan !null property assertion did not remove null from the visible property');
  const templatePropertyDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(templatePropertyOffset),
  );
  assert.strictEqual(templatePropertyDefinitions.length, 1,
    'A PHPStan template assertion did not specialize the visible property path');
  const shortCircuitAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(shortCircuitAssertionOffset),
  );
  assert.strictEqual(shortCircuitAssertionDefinitions.length, 1,
    'A PHPStan conditional assertion did not narrow the short-circuit right operand');
  const guardAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(guardAssertionOffset),
  );
  assert.strictEqual(guardAssertionDefinitions.length, 1,
    'A PHPStan conditional assertion did not narrow after a terminating guard');
  const alternativeGuardAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(alternativeGuardAssertionOffset),
  );
  assert.strictEqual(alternativeGuardAssertionDefinitions.length, 1,
    'A PHPStan conditional assertion did not narrow when only its truthy alternative can continue');
  const nestedGuardAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(nestedGuardAssertionOffset),
  );
  assert.strictEqual(nestedGuardAssertionDefinitions.length, 1,
    'A PHPStan conditional assertion did not narrow after a complete nested terminating branch');
  const tryGuardAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(tryGuardAssertionOffset),
  );
  assert.strictEqual(tryGuardAssertionDefinitions.length, 1,
    'A PHPStan conditional assertion did not narrow after complete try and catch termination');
  const switchGuardAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(switchGuardAssertionOffset),
  );
  assert.strictEqual(switchGuardAssertionDefinitions.length, 1,
    'A PHPStan conditional assertion did not narrow after a complete terminating switch');
  const loopGuardAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(loopGuardAssertionOffset),
  );
  assert.strictEqual(loopGuardAssertionDefinitions.length, 1,
    'A PHPStan conditional assertion did not narrow after a guaranteed terminating loop');
  const literalNegativeAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(literalNegativeAssertionOffset),
  );
  assert.strictEqual(literalNegativeAssertionDefinitions.length, 1,
    'A PHPStan !false assertion did not subtract the false literal from a finite union');
  const genericNegativeAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(genericNegativeAssertionOffset),
  );
  assert.strictEqual(genericNegativeAssertionDefinitions.length, 1,
    'A PHPStan generic exclusion did not preserve the remaining generic argument');
  const intersectionNegativeAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(intersectionNegativeAssertionOffset),
  );
  assert.strictEqual(intersectionNegativeAssertionDefinitions.length, 1,
    'A PHPStan intersection exclusion did not preserve the remaining object branch');
  const remainingIntersectionAssertionDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(remainingIntersectionAssertionOffset),
  );
  assert.strictEqual(remainingIntersectionAssertionDefinitions.length, 1,
    'A PHPStan exclusion did not preserve the composite members of the remaining intersection');
  for (const [offset, expectedDefinitions, message] of [
    [conditionalReadyOffset, 1, 'A true PHPDoc conditional return did not select its true object branch'],
    [conditionalOtherOffset, 1, 'A false PHPDoc conditional return did not select its false object branch'],
    [conditionalUnknownOffset, 2, 'An unknown PHPDoc conditional return did not preserve both definitions of the common Union member'],
    [nestedConditionalOffset, 2, 'A nested PHPDoc conditional return retained an impossible correlated branch'],
    [crossConditionalOffset, 2, 'A cross-parameter PHPDoc conditional return did not correlate aliased arguments'],
    [callableConditionalReadyOffset, 1, 'A true PHPDoc Callable conditional return did not select its true object branch'],
    [callableConditionalOtherOffset, 1, 'A false PHPDoc Callable conditional return did not select its false object branch'],
    [callableConditionalUnknownOffset, 2, 'An unknown PHPDoc Callable conditional return did not preserve both definitions of the common Union member'],
    [loopAssertionOffset, 1, 'A PHPStan conditional assertion did not narrow inside a while body'],
    [outsideLoopAssertionOffset, 0, 'A PHPStan while assertion leaked past the loop exit'],
    [doShortAssertionOffset, 1, 'A PHPStan conditional assertion did not narrow a do while short-circuit operand'],
    [magicPropertyOffset, 1, 'A PHPDoc magic property did not navigate to its declaration tag'],
    [magicMethodOffset, 1, 'A PHPDoc magic method did not navigate to its declaration tag'],
    [magicPropertyChainOffset, 1, 'A PHPDoc magic property return did not continue the member chain'],
    [magicMethodChainOffset, 1, 'A PHPDoc magic method return did not continue the member chain'],
    [magicReadOnlyChainOffset, 1, 'A PHPDoc read-only property did not continue the member chain'],
    [magicWriteOnlyOffset, 1, 'A PHPDoc write-only property assignment did not navigate to its declaration tag'],
    [magicWriteOnlyReadOffset, 0, 'A PHPDoc write-only property incorrectly exposed a readable return chain'],
    [magicNamedIdOverloadOffset, 1, 'A named PHPDoc overload did not select its object return'],
    [magicNamedSlugOverloadOffset, 1, 'A second named PHPDoc overload did not select its object return'],
    [magicTypedOverloadOffset, 1, 'A typed PHPDoc overload did not select its object return'],
    [magicAmbiguousOverloadOffset, 0, 'An ambiguous PHPDoc overload incorrectly guessed a return type'],
    [magicTemplateOffset, 1, 'A PHPDoc magic method template did not infer its class-string return'],
    [magicInvalidTemplateOffset, 0, 'A PHPDoc magic method template ignored its bound'],
  ] as const) {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', assertionConsumerUri, assertionConsumer.positionAt(offset),
    );
    assert.strictEqual(definitions.length, expectedDefinitions, message);
  }
  const magicArgumentOffset = assertionConsumer.getText().indexOf('$magicRepository->find(1)') + '$magicRepository->find('.length;
  const magicSignature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', assertionConsumerUri, assertionConsumer.positionAt(magicArgumentOffset), '(',
  );
  assert.strictEqual(magicSignature?.signatures[0]?.label, 'find(int $id, string $label = null): MagicProfile',
    'A PHPDoc magic method did not expose its documented signature');
  const magicOverloadArgumentOffset = assertionConsumer.getText().indexOf('$magicRepository->locate(1)') + '$magicRepository->locate('.length;
  const magicOverloadSignature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', assertionConsumerUri, assertionConsumer.positionAt(magicOverloadArgumentOffset), '(',
  );
  assert.deepStrictEqual(magicOverloadSignature?.signatures.map((signature) => signature.label), [
    'locate(int $id): MagicProfile', 'locate(string $slug): MagicOther',
  ], 'PHPDoc overload Signature Help did not preserve all ambiguous candidates');
  await waitForAsync(async () => vscode.languages.getDiagnostics(assertionConsumerUri).some((diagnostic) =>
    diagnostic.code === 'php.assignment.readonly-property' && diagnostic.message.includes('$createdBy')),
  'A PHPDoc read-only property write diagnostic was not published');
  const magicDiagnostics = vscode.languages.getDiagnostics(assertionConsumerUri);
  assert.ok(magicDiagnostics.some((diagnostic) => diagnostic.code === 'php.assignment.readonly-property'
    && diagnostic.message.includes('$createdBy')), 'A PHPDoc read-only property write was not diagnosed');
  assert.ok(magicDiagnostics.some((diagnostic) => diagnostic.code === 'php.assignment.type-mismatch'
    && diagnostic.message.includes('$magicRepository->payload')), 'A PHPDoc write-only property type mismatch was not diagnosed');
  assert.strictEqual(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptStateTransform') && diagnostic.message.includes('callable(App\\Service\\ConstructedReadonlyState): App\\Service\\ConstructedReadonlyState')).length, 2,
  'PHPDoc Callable variance did not reject the proven parameter and return mismatches');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptInvariantBox') && diagnostic.message.includes('InvariantBox<App\\Service\\GenericChild>') && diagnostic.message.includes('InvariantBox<App\\Service\\GenericParent>')),
  'Declared PHPDoc template invariance did not reject different generic arguments');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptGenericPair') && diagnostic.message.includes('ReversedPair<App\\Service\\GenericParent, App\\Service\\GenericChild>')
    && diagnostic.message.includes('GenericPair<App\\Service\\GenericParent, App\\Service\\GenericChild>')),
  'PHPDoc generic inheritance did not substitute reordered template arguments before variance checking');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptState') && diagnostic.message.includes('App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A uniquely resolved function return type did not participate in argument diagnostics');
  assert.strictEqual(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptCheckedCallState')).length, 7,
  'Only argument-compatible direct, named, statically unpacked, linearly built positional or sealed named parameter-shape, and method calls should propagate their declared return type');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptLateChild') && diagnostic.message.includes('App\\Service\\LateBase')
    && diagnostic.message.includes('App\\Service\\LateChild')),
  'A self return was not bound to its declaring class before argument diagnostics');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptLateChild') && diagnostic.message.includes('App\\Service\\LateChild|null')),
  'A nullable nullsafe call result did not retain its null branch in argument diagnostics');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptCallableState') && diagnostic.message.includes('App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'An untouched zero-required-argument PHPDoc Callable result did not participate in argument diagnostics');
  assert.strictEqual(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptCallableState') && diagnostic.message.includes('App\\Service\\UnrelatedState')).length, 2,
  'A positional PHPDoc Callable invocation satisfying required and optional arity did not provide its return type');
  assert.strictEqual(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptNamedCallableState') && diagnostic.message.includes('App\\Service\\UnrelatedState')).length, 12,
  'Only type-compatible named, variadic, mixed, statically or linearly built positional, sealed parameter-shape unpacked, and aliased PHPDoc Callable invocations should provide their proven return type');
  assert.strictEqual(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptGenericTemplateState')).length, 13,
  'Direct, named, list-nested, method, statically or linearly built positional unpacked, sealed named parameter-shape, reordered transitive parent, and branch-distributed covariant or invariant Union PHPDoc template arguments did not specialize their proven return types precisely');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptCorrelatedPair')
    && diagnostic.message.includes('GenericPair<App\\Service\\InheritedConstructedReadonlyState, App\\Service\\UnrelatedState>|App\\Service\\GenericPair<App\\Service\\UnrelatedState, App\\Service\\InheritedConstructedReadonlyState>')),
  'A correlated multi-template Union did not preserve its branch-specific generic results');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptNestedCorrelated')
    && diagnostic.message.includes('GenericEnvelope<App\\Service\\GenericPair<App\\Service\\InheritedConstructedReadonlyState, App\\Service\\UnrelatedState>>|App\\Service\\GenericEnvelope<App\\Service\\GenericPair<App\\Service\\UnrelatedState, App\\Service\\InheritedConstructedReadonlyState>>')),
  'A nested correlated multi-template Union did not preserve its branch-specific generic results');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptLocalIntegers') && diagnostic.message.includes('list<string>') && diagnostic.message.includes('list<int>')),
  'A same-block local did not retain a complete PHPDoc call result across a harmless literal statement');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptMutatedIntegers') && diagnostic.message.includes('non-empty-list<int|string>') && diagnostic.message.includes('list<int>')),
  'Deterministic list appends did not update the same-block local element union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptMutatedShape') && diagnostic.message.includes('array{id: string}') && diagnostic.message.includes('array{id: int}')),
  'A deterministic shape key write did not update the same-block local field type');
  assert.strictEqual(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptVariableMutatedIntegers') && diagnostic.message.includes('list<int>')).length, 2,
  'Proven parameter appends and safe index-zero writes did not update list element types');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptVariableMutatedShape') && diagnostic.message.includes('array{id: string}')
    && diagnostic.message.includes('array{id: int}')),
  'A proven parameter shape-key write did not update its field type');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptChainState') && diagnostic.message.includes('App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A complete multi-step member call did not provide its final object type to argument diagnostics');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptChainState') && diagnostic.message.includes('App\\Service\\InheritedConstructedReadonlyState|null')),
  'A multi-step nullsafe call did not retain its null branch in argument diagnostics');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptChainInt') && diagnostic.message.includes('string') && diagnostic.message.includes('int')),
  'A complete multi-step member chain did not provide its final scalar type');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptChainIntegers') && diagnostic.message.includes('list<string>') && diagnostic.message.includes('list<int>')),
  'A complete multi-step member chain did not provide its final PHPDoc generic type');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptCompositeChainState') && diagnostic.message.includes('App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A multi-step Union receiver chain did not provide its shared final type');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptCompositeChainState') && diagnostic.message.includes('App\\Service\\InheritedConstructedReadonlyState|null')),
  'A nullable multi-step Union receiver chain did not preserve its null branch');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptConditionalInt') && diagnostic.message.includes('int|string') && diagnostic.message.includes('int')),
  'A complete if/elseif/else did not merge scalar local assignments into a Union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptConditionalState')
    && diagnostic.message.includes('App\\Service\\InheritedConstructedReadonlyState|App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A complete conditional did not merge object call results into a Union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptSwitchInt') && diagnostic.message.includes('int|string') && diagnostic.message.includes('int')),
  'A complete switch did not merge scalar local assignments into a Union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptSwitchState')
    && diagnostic.message.includes('App\\Service\\InheritedConstructedReadonlyState|App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A complete switch did not merge object call results across fallthrough into a Union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptTryInt') && diagnostic.message.includes('int|string') && diagnostic.message.includes('int')),
  'A complete try/catch did not merge scalar local assignments into a Union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptTryState')
    && diagnostic.message.includes('App\\Service\\InheritedConstructedReadonlyState|App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A complete try/catch/finally did not preserve nested object assignment results');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptTryIntegers') && diagnostic.message.includes('non-empty-list<string>')
    && diagnostic.message.includes('list<int>')),
  'A definite finally assignment did not override earlier local value paths');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptDoInt') && diagnostic.message.includes('string') && diagnostic.message.includes('int')),
  'A guaranteed do/while iteration did not propagate its scalar local assignment');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptDoState')
    && diagnostic.message.includes('App\\Service\\InheritedConstructedReadonlyState|App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A guaranteed do/while iteration did not preserve a complete conditional object Union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptLoopInt') && diagnostic.message.includes('string') && diagnostic.message.includes('int')),
  'A proven nonempty integer for loop did not propagate its scalar local assignment');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptLoopState')
    && diagnostic.message.includes('App\\Service\\InheritedConstructedReadonlyState|App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A single-pass true while loop did not preserve a complete conditional object Union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptForeachInt') && diagnostic.message.includes('string') && diagnostic.message.includes('int')),
  'A proven nonempty foreach did not propagate its scalar local assignment');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptForeachState')
    && diagnostic.message.includes('App\\Service\\InheritedConstructedReadonlyState|App\\Service\\UnrelatedState')
    && diagnostic.message.includes('App\\Service\\ConstructedReadonlyState')),
  'A proven nonempty foreach did not preserve a complete conditional object Union');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptIntegerList') && diagnostic.message.includes('list<int>')),
  'PHPDoc list element constraint did not reject a proven string list literal');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptNonEmptyLabels') && diagnostic.message.includes('non-empty-list<string>')),
  'PHPDoc non-empty-list constraint did not reject a proven empty list literal');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptPayloadShape') && diagnostic.message.includes('array{id: int, name?: string}') && diagnostic.message.includes('array{id: string}')),
  'PHPDoc array shape did not reject a proven incompatible field type');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptPayloadShape') && diagnostic.message.includes('array{name: string}')),
  'PHPDoc array shape did not reject a proven missing required field');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && diagnostic.message.includes('acceptNestedPayload') && diagnostic.message.includes('meta: array{active: string}') && diagnostic.message.includes('meta: array{active: bool}')),
  'PHPDoc array shape did not reject a proven nested field type mismatch');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && strictScalarDocument.getText(diagnostic.range) === '$localBadList'),
  'PHPDoc list argument check did not propagate an adjacent local array literal');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.argument.type-mismatch'
    && strictScalarDocument.getText(diagnostic.range) === '$localBadShape'),
  'PHPDoc shape argument check did not propagate an adjacent local array literal');
  assert.strictEqual(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).filter((diagnostic) => diagnostic.code === 'php.assignment.readonly-property').length, 34,
    'Readonly property diagnostics did not cover explicit, readonly-class, native Enum, indirect modifications, builtin references, object reference iteration, and conditional/try/switch/loop control flow');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.assignment.readonly-property'
    && diagnostic.message.includes('iterate') && diagnostic.message.includes('$whole')), 'Whole-object by-reference iteration did not identify the proven initialized readonly property');
  assert.ok(vscode.languages.getDiagnostics(strictScalarDiagnosticUri).some((diagnostic) => diagnostic.code === 'php.assignment.readonly-property'
    && diagnostic.message.includes('iterate') && diagnostic.message.includes('$createdBody') && diagnostic.message.includes('$createdId')), 'Factory-constructed local by-reference iteration did not identify visible readonly properties proven by promotion and the constructor body');
  const completionServiceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'CompletionService.php');
  const completionConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'CompletionConsumer.php');
  const completionService = await vscode.workspace.openTextDocument(completionServiceUri);
  const completionConsumer = await vscode.workspace.openTextDocument(completionConsumerUri);
  const memberOffset = completionConsumer.getText().indexOf('displayName');
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', completionConsumerUri, completionConsumer.positionAt(memberOffset + 3), '>',
    );
    return completion.items.some((item) => item.label === 'displayName');
  }, 'Self-hosted language server did not complete a proven parameter member');
  const contextualCallableUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'ContextualCallableConsumer.php');
  const contextualCallable = await vscode.workspace.openTextDocument(contextualCallableUri);
  const nestedLoopBreakMarker = '$nestedBreakLoopMapped[0]->displayName';
  const nestedLoopBreakMemberOffset = contextualCallable.getText().indexOf(nestedLoopBreakMarker)
    + '$nestedBreakLoopMapped[0]->'.length;
  const contextualMemberOffsets = [...contextualCallable.getText().matchAll(/displayName/g)].map((match) => match.index!)
    .filter((offset) => offset !== nestedLoopBreakMemberOffset);
  assert.strictEqual(contextualMemberOffsets.length, 27, 'Contextual callable fixture must cover concrete, generic parameter, and inferred arrow/closure result contracts');
  for (const [contextIndex, contextualMemberOffset] of contextualMemberOffsets.entries()) {
    await waitForAsync(async () => {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', contextualCallableUri, contextualCallable.positionAt(contextualMemberOffset + 3), '>',
      );
      return completion.items.some((item) => item.label === 'displayName');
    }, `PHPDoc callable context did not type unannotated arrow parameter ${contextIndex + 1}`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', contextualCallableUri, contextualCallable.positionAt(contextualMemberOffset + 2),
      );
      return definitions.some((location) => location.uri.toString() === completionServiceUri.toString());
    }, `Contextually typed arrow parameter ${contextIndex + 1} did not navigate to its member declaration`);
  }
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', contextualCallableUri, contextualCallable.positionAt(nestedLoopBreakMemberOffset + 2),
    );
    return definitions.length === 0;
  }, 'Contextual closure inference crossed a nested loop break');
  await waitFor(() => vscode.languages.getDiagnostics(contextualCallableUri).filter((diagnostic) =>
    diagnostic.code === 'php.argument.type-mismatch'
      && diagnostic.message.includes('acceptContextualString')
      && diagnostic.message.includes('App\\Service\\CompletionService')
      && diagnostic.message.includes('string')).length === 12,
  'Contextually typed arrow parameter did not participate in argument diagnostics');
  const privateMethodOffset = completionService.getText().lastIndexOf('normalizeName');
  await waitForAsync(async () => {
    const prepared = await vscode.commands.executeCommand<{ placeholder?: string; text?: string }>(
      '_executePrepareRename', completionServiceUri, completionService.positionAt(privateMethodOffset + 2),
    );
    return (prepared?.placeholder ?? prepared?.text) === 'normalizeName';
  }, 'Private method Rename did not become available after the restarted server completed indexing');
  const privateMethodEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', completionServiceUri, completionService.positionAt(privateMethodOffset + 2), 'normalizeValue',
  );
  assert.ok(privateMethodEdit, 'Private method Rename returned no edit');
  assert.strictEqual(privateMethodEdit.get(completionServiceUri).length, 2, 'Private method Rename did not include its direct call');
  await vscode.window.showTextDocument(completionService);
  assert.ok(await vscode.workspace.applyEdit(privateMethodEdit), 'Private method Rename edit could not be applied');
  assert.strictEqual(completionService.getText().match(/normalizeValue/g)?.length, 2, 'Private method Rename changed the wrong locations');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (completionService.getText().match(/normalizeName/g)?.length ?? 0) === 2, 'Private method Rename could not be undone as one editor operation');
  const localVariableOffset = completionService.getText().indexOf('value:') + 2;
  const localVariableEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', completionServiceUri, completionService.positionAt(localVariableOffset), 'input',
  );
  assert.ok(localVariableEdit, 'Local parameter Rename returned no edit');
  assert.strictEqual(localVariableEdit.get(completionServiceUri).length, 3, 'Local parameter Rename did not include its resolved named argument');
  assert.ok(await vscode.workspace.applyEdit(localVariableEdit), 'Local parameter Rename edit could not be applied');
  assert.strictEqual(completionService.getText().match(/\$input/g)?.length, 2, 'Local parameter Rename changed the wrong locations');
  assert.ok(completionService.getText().includes('normalizeName(input: $prefix)'), 'Local parameter Rename did not update the resolved named argument');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (completionService.getText().match(/\$value/g)?.length ?? 0) === 4, 'Local parameter Rename could not be undone as one editor operation');
  const privatePropertyOffset = completionService.getText().indexOf('$label') + 1;
  const privatePropertyEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', completionServiceUri, completionService.positionAt(privatePropertyOffset), 'caption',
  );
  assert.ok(privatePropertyEdit, 'Private property Rename returned no edit');
  assert.strictEqual(privatePropertyEdit.get(completionServiceUri).length, 2, 'Private property Rename changed the wrong number of locations');
  assert.ok(await vscode.workspace.applyEdit(privatePropertyEdit), 'Private property Rename edit could not be applied');
  assert.strictEqual(completionService.getText().match(/caption/g)?.length, 2, 'Private property Rename changed the wrong locations');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (completionService.getText().match(/label/g)?.length ?? 0) === 2, 'Private property Rename could not be undone as one editor operation');
  const functionDeclarationOffset = completionService.getText().indexOf('formatValue');
  const functionOffset = completionService.getText().indexOf('formatValue', functionDeclarationOffset + 1) + 2;
  const functionRenameEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', completionServiceUri, completionService.positionAt(functionOffset), 'normalizeValue',
  );
  assert.ok(functionRenameEdit, 'Function Rename returned no edit');
  assert.strictEqual(functionRenameEdit.get(completionServiceUri).length, 2, 'Function Rename changed the wrong number of locations');
  assert.ok(await vscode.workspace.applyEdit(functionRenameEdit), 'Function Rename edit could not be applied');
  assert.strictEqual(completionService.getText().match(/normalizeValue/g)?.length, 2, 'Function Rename changed the wrong locations');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (completionService.getText().match(/formatValue/g)?.length ?? 0) === 2, 'Function Rename could not be undone as one editor operation');
  const messageContractUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Contract', 'MessageHandler.php');
  const messageImplementationUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'MessageHandler.php');
  const messageConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'MessageHandlerConsumer.php');
  const messageContract = await vscode.workspace.openTextDocument(messageContractUri);
  const messageImplementation = await vscode.workspace.openTextDocument(messageImplementationUri);
  const messageConsumer = await vscode.workspace.openTextDocument(messageConsumerUri);
  const inheritedParameterOffset = messageConsumer.getText().indexOf('payload:') + 2;
  let inheritedParameterEdit: vscode.WorkspaceEdit | undefined;
  await waitForAsync(async () => {
    inheritedParameterEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider', messageConsumerUri, messageConsumer.positionAt(inheritedParameterOffset), 'content',
    );
    return (inheritedParameterEdit?.entries().length ?? 0) === 3;
  }, 'Inherited method parameter Rename did not include the complete workspace family');
  assert.ok(inheritedParameterEdit, 'Inherited method parameter Rename returned no edit');
  assert.strictEqual(inheritedParameterEdit.get(messageContractUri).length, 2, 'Interface parameter Rename changed the wrong contract locations');
  assert.strictEqual(inheritedParameterEdit.get(messageImplementationUri).length, 3, 'Interface parameter Rename changed the wrong implementation locations');
  assert.strictEqual(inheritedParameterEdit.get(messageConsumerUri).length, 2, 'Interface parameter Rename changed the wrong named arguments');
  await vscode.window.showTextDocument(messageContract);
  assert.ok(await vscode.workspace.applyEdit(inheritedParameterEdit), 'Inherited method parameter Rename edit could not be applied');
  assert.ok(messageContract.getText().includes('$content'), 'Inherited Rename did not update the interface parameter');
  assert.ok(messageImplementation.getText().includes('$content'), 'Inherited Rename did not update the override parameter and its use');
  assert.ok(messageContract.getText().includes('@param string $content'), 'Inherited Rename did not update the interface PHPDoc');
  assert.ok(messageImplementation.getText().includes('@phpstan-param string $content'), 'Inherited Rename did not update the implementation PHPDoc');
  assert.strictEqual(messageConsumer.getText().match(/content:/g)?.length, 2, 'Inherited Rename did not update each resolved named argument');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => messageContract.getText().includes('$message') && messageImplementation.getText().includes('$payload')
    && messageConsumer.getText().includes('message:') && messageConsumer.getText().includes('payload:'), 'Inherited method parameter Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => messageContract.getText().includes('$content') && messageImplementation.getText().includes('$content')
    && (messageConsumer.getText().match(/content:/g)?.length ?? 0) === 2, 'Inherited method parameter Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => messageContract.getText().includes('$message') && messageImplementation.getText().includes('$payload'), 'Inherited method parameter Rename fixture could not be restored');
  const inheritedMethodOffset = messageConsumer.getText().indexOf('->handle') + 3;
  const inheritedMethodEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', messageConsumerUri, messageConsumer.positionAt(inheritedMethodOffset), 'process',
  );
  assert.ok(inheritedMethodEdit, 'Inherited public method Rename returned no edit');
  assert.strictEqual(inheritedMethodEdit.get(messageContractUri).length, 1, 'Public method Rename did not update the interface declaration exactly once');
  assert.strictEqual(inheritedMethodEdit.get(messageImplementationUri).length, 1, 'Public method Rename did not update the implementation declaration exactly once');
  assert.strictEqual(inheritedMethodEdit.get(messageConsumerUri).length, 3, 'Public method Rename did not update both direct calls and the proven array callable');
  assert.ok(await vscode.workspace.applyEdit(inheritedMethodEdit), 'Inherited public method Rename edit could not be applied');
  await waitFor(() => messageContract.getText().includes('function process') && messageImplementation.getText().includes('function process')
    && (messageConsumer.getText().match(/->process/g)?.length ?? 0) === 2 && messageConsumer.getText().includes("[$concrete, 'process']"),
  'Inherited public method Rename did not apply across direct calls and the proven array callable');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => messageContract.getText().includes('function handle') && messageImplementation.getText().includes('function handle')
    && (messageConsumer.getText().match(/->handle/g)?.length ?? 0) === 2 && messageConsumer.getText().includes("[$concrete, 'handle']"),
  'Inherited public method Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => messageContract.getText().includes('function process') && messageImplementation.getText().includes('function process'), 'Inherited public method Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => messageContract.getText().includes('function handle') && messageImplementation.getText().includes('function handle'), 'Inherited public method Rename fixture could not be restored');
  const publicPropertyBaseUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'PublicPropertyBase.php');
  const publicPropertyChildUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'PublicPropertyChild.php');
  const publicPropertyConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'PublicPropertyConsumer.php');
  const publicPropertyBase = await vscode.workspace.openTextDocument(publicPropertyBaseUri);
  const publicPropertyChild = await vscode.workspace.openTextDocument(publicPropertyChildUri);
  const publicPropertyConsumer = await vscode.workspace.openTextDocument(publicPropertyConsumerUri);
  const publicPropertyOffset = publicPropertyConsumer.getText().indexOf('label') + 2;
  const publicPropertyEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', publicPropertyConsumerUri, publicPropertyConsumer.positionAt(publicPropertyOffset), 'title',
  );
  assert.ok(publicPropertyEdit, 'Inherited public property Rename returned no edit');
  assert.strictEqual(publicPropertyEdit.get(publicPropertyBaseUri).length, 2, 'Public property Rename did not update the base declaration and same-named method body access');
  assert.strictEqual(publicPropertyEdit.get(publicPropertyChildUri).length, 1, 'Public property Rename did not update the child declaration exactly once');
  assert.strictEqual(publicPropertyEdit.get(publicPropertyConsumerUri).length, 2, 'Public property Rename did not update both resolved accesses');
  await vscode.window.showTextDocument(publicPropertyBase);
  assert.ok(await vscode.workspace.applyEdit(publicPropertyEdit), 'Inherited public property Rename edit could not be applied');
  await waitFor(() => publicPropertyBase.getText().includes('$title') && publicPropertyChild.getText().includes('$title')
    && (publicPropertyConsumer.getText().match(/->title/g)?.length ?? 0) === 2, 'Inherited public property Rename did not apply across the workspace');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => publicPropertyBase.getText().includes('$label') && publicPropertyChild.getText().includes('$label')
    && (publicPropertyConsumer.getText().match(/->label/g)?.length ?? 0) === 2, 'Inherited public property Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => publicPropertyBase.getText().includes('$title') && publicPropertyChild.getText().includes('$title'), 'Inherited public property Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => publicPropertyBase.getText().includes('$label') && publicPropertyChild.getText().includes('$label'), 'Inherited public property Rename fixture could not be restored');
  const promotedPropertyBaseUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'PromotedPropertyBase.php');
  const promotedPropertyConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'PromotedPropertyConsumer.php');
  const promotedPropertyBase = await vscode.workspace.openTextDocument(promotedPropertyBaseUri);
  const promotedPropertyConsumer = await vscode.workspace.openTextDocument(promotedPropertyConsumerUri);
  const promotedPropertyOffset = promotedPropertyConsumer.getText().indexOf('label:') + 2;
  const promotedPropertyEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', promotedPropertyConsumerUri, promotedPropertyConsumer.positionAt(promotedPropertyOffset), 'title',
  );
  assert.ok(promotedPropertyEdit, 'Promoted property Rename returned no edit');
  assert.strictEqual(promotedPropertyEdit.get(promotedPropertyBaseUri).length, 3, 'Promoted property Rename did not update its declaration, constructor use, and PHPDoc');
  assert.strictEqual(promotedPropertyEdit.get(promotedPropertyConsumerUri).length, 4, 'Promoted property Rename did not update inherited named construction and property accesses');
  await vscode.window.showTextDocument(promotedPropertyBase);
  assert.ok(await vscode.workspace.applyEdit(promotedPropertyEdit), 'Promoted property Rename edit could not be applied');
  await waitFor(() => (promotedPropertyBase.getText().match(/title/g)?.length ?? 0) === 3
    && (promotedPropertyConsumer.getText().match(/title/g)?.length ?? 0) === 4, 'Promoted property Rename did not apply across parameter and property identities');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (promotedPropertyBase.getText().match(/label/g)?.length ?? 0) === 3
    && (promotedPropertyConsumer.getText().match(/label/g)?.length ?? 0) === 4, 'Promoted property Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => promotedPropertyBase.getText().includes('$title') && promotedPropertyConsumer.getText().includes('title:'), 'Promoted property Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => promotedPropertyBase.getText().includes('$label') && promotedPropertyConsumer.getText().includes('label:'), 'Promoted property Rename fixture could not be restored');
  const traitFeatureUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'SharedFeature.php');
  const traitFeatureHostUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'TraitFeatureHost.php');
  const traitFeatureChildUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'TraitFeatureChild.php');
  const traitFeature = await vscode.workspace.openTextDocument(traitFeatureUri);
  const traitFeatureHost = await vscode.workspace.openTextDocument(traitFeatureHostUri);
  const traitFeatureChild = await vscode.workspace.openTextDocument(traitFeatureChildUri);
  const traitMethodOffset = traitFeatureChild.getText().indexOf('formatLabel') + 2;
  const traitMethodEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', traitFeatureChildUri, traitFeatureChild.positionAt(traitMethodOffset), 'renderLabel',
  );
  assert.ok(traitMethodEdit, 'Trait method Rename returned no edit');
  assert.strictEqual(traitMethodEdit.get(traitFeatureUri).length, 2, 'Trait method Rename did not update its declaration and self call');
  assert.strictEqual(traitMethodEdit.get(traitFeatureHostUri).length, 3, 'Trait method Rename did not update the precedence rule, qualified alias source and host call');
  assert.strictEqual(traitMethodEdit.get(traitFeatureChildUri).length, 1, 'Trait method Rename did not update the descendant call');
  await vscode.window.showTextDocument(traitFeature);
  assert.ok(await vscode.workspace.applyEdit(traitMethodEdit), 'Trait method Rename edit could not be applied');
  await waitFor(() => (traitFeature.getText().match(/renderLabel/g)?.length ?? 0) === 2
    && (traitFeatureHost.getText().match(/renderLabel/g)?.length ?? 0) === 3
    && traitFeatureChild.getText().includes('renderLabel'), 'Trait method Rename did not apply across the consumer family');
  assert.ok(traitFeatureHost.getText().includes('formatAlias'), 'Trait method Rename changed the declared alias name');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (traitFeature.getText().match(/formatLabel/g)?.length ?? 0) === 2
    && (traitFeatureHost.getText().match(/formatLabel/g)?.length ?? 0) === 3
    && traitFeatureChild.getText().includes('formatLabel'), 'Trait method Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => traitFeature.getText().includes('renderLabel') && traitFeatureHost.getText().includes('renderLabel'), 'Trait method Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => traitFeature.getText().includes('formatLabel') && traitFeatureHost.getText().includes('formatLabel'), 'Trait method Rename fixture could not be restored');
  const traitAliasOffset = traitFeatureHost.getText().indexOf('formatAlias', traitFeatureHost.getText().indexOf('formatFromHost')) + 2;
  const traitAliasEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', traitFeatureHostUri, traitFeatureHost.positionAt(traitAliasOffset), 'alternateFormat',
  );
  assert.ok(traitAliasEdit, 'Trait alias Rename returned no edit');
  assert.strictEqual(traitAliasEdit.get(traitFeatureHostUri).length, 2, 'Trait alias Rename did not update its adaptation and exact call');
  assert.strictEqual(traitAliasEdit.get(traitFeatureUri).length, 0, 'Trait alias Rename unexpectedly changed the source trait method');
  assert.strictEqual(traitAliasEdit.get(traitFeatureChildUri).length, 0, 'Trait alias Rename unexpectedly changed unrelated descendant calls');
  await vscode.window.showTextDocument(traitFeatureHost);
  assert.ok(await vscode.workspace.applyEdit(traitAliasEdit), 'Trait alias Rename edit could not be applied');
  await waitFor(() => (traitFeatureHost.getText().match(/alternateFormat/g)?.length ?? 0) === 2
    && traitFeature.getText().includes('formatLabel'), 'Trait alias Rename did not preserve the source method identity');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (traitFeatureHost.getText().match(/formatAlias/g)?.length ?? 0) === 2, 'Trait alias Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => (traitFeatureHost.getText().match(/alternateFormat/g)?.length ?? 0) === 2, 'Trait alias Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (traitFeatureHost.getText().match(/formatAlias/g)?.length ?? 0) === 2, 'Trait alias Rename fixture could not be restored');
  const traitPropertyOffset = traitFeatureHost.getText().indexOf('label', traitFeatureHost.getText().indexOf('return')) + 2;
  const traitPropertyEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', traitFeatureHostUri, traitFeatureHost.positionAt(traitPropertyOffset), 'title',
  );
  assert.ok(traitPropertyEdit, 'Trait property Rename returned no edit');
  assert.strictEqual(traitPropertyEdit.get(traitFeatureUri).length, 2, 'Trait property Rename did not update its declaration and self access');
  assert.strictEqual(traitPropertyEdit.get(traitFeatureHostUri).length, 1, 'Trait property Rename did not update the host access');
  assert.strictEqual(traitPropertyEdit.get(traitFeatureChildUri).length, 1, 'Trait property Rename did not update the descendant access');
  await vscode.window.showTextDocument(traitFeature);
  assert.ok(await vscode.workspace.applyEdit(traitPropertyEdit), 'Trait property Rename edit could not be applied');
  await waitFor(() => (traitFeature.getText().match(/title/g)?.length ?? 0) === 2
    && traitFeatureHost.getText().includes('$this->title') && traitFeatureChild.getText().includes('$this->title'), 'Trait property Rename did not apply across the consumer family');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (traitFeature.getText().match(/label/g)?.length ?? 0) === 2
    && traitFeatureHost.getText().includes('$this->label') && traitFeatureChild.getText().includes('$this->label'), 'Trait property Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => traitFeature.getText().includes('$title') && traitFeatureHost.getText().includes('$this->title'), 'Trait property Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => traitFeature.getText().includes('$label') && traitFeatureHost.getText().includes('$this->label'), 'Trait property Rename fixture could not be restored');
  await waitForAsync(async () => (await vscode.commands.getCommands(true)).includes('phpCompanion._testCrashLanguageServer'), 'Language Server test crash command was not registered');
  await vscode.commands.executeCommand('phpCompanion._testCrashLanguageServer');
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', completionConsumerUri, completionConsumer.positionAt(memberOffset + 3), '>',
    );
    return completion.items.some((item) => item.label === 'displayName');
  }, 'Self-hosted language server did not restore completion after an injected process crash');
  await waitForAsync(async () => {
    const memberDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', completionConsumerUri, completionConsumer.positionAt(memberOffset + 2),
    );
    return memberDefinitions.some((location) => location.uri.toString() === completionServiceUri.toString());
  }, 'Self-hosted language server did not resolve a proven member definition');
  const memberHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', completionConsumerUri, completionConsumer.positionAt(memberOffset + 2),
  ) ?? [];
  const memberHoverText = memberHovers.flatMap((hover) => hover.contents).map((content) => (
    typeof content === 'string' ? content : content.value
  )).join('\n');
  assert.ok(
    memberHoverText.includes('displayName(string $prefix): string'),
    `Self-hosted language server did not return the exact proven member hover: ${memberHoverText}`,
  );
  const autowiredConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'AutowiredConsumer.php');
  const autowiredConsumer = await vscode.workspace.openTextDocument(autowiredConsumerUri);
  const autowiredTypeOffset = autowiredConsumer.getText().indexOf('Mailer $mailer') + 2;
  await waitForAsync(async () => {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', autowiredConsumerUri, autowiredConsumer.positionAt(autowiredTypeOffset),
    ) ?? [];
    return hovers.flatMap((hover) => hover.contents).some((content) => (typeof content === 'string' ? content : content.value).includes('Symfony autowiring'));
  }, 'Self-hosted language server did not expose the proven Symfony autowiring target');
  const mailerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'Mailer.php');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', autowiredConsumerUri, autowiredConsumer.positionAt(autowiredTypeOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.toString() === mailerUri.toString());
  }, 'Self-hosted language server did not navigate from an autowired constructor type to its service implementation');
  for (const [needle, expected] of [['Mailer $audit', '(named alias)'], ['Mailer $bound', '(binding)']] as const) {
    const offset = autowiredConsumer.getText().indexOf(needle) + 2;
    await waitForAsync(async () => {
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider', autowiredConsumerUri, autowiredConsumer.positionAt(offset),
      ) ?? [];
      return hovers.flatMap((hover) => hover.contents).some((content) => (typeof content === 'string' ? content : content.value).includes(expected));
    }, `Self-hosted language server did not expose Symfony ${expected} autowiring`);
  }
  for (const needle of ['Mailer|Traceable', 'Mailer&Traceable'] as const) {
    const offset = autowiredConsumer.getText().indexOf(needle) + 2;
    await waitForAsync(async () => {
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider', autowiredConsumerUri, autowiredConsumer.positionAt(offset),
      ) ?? [];
      return hovers.flatMap((hover) => hover.contents).some((content) => (typeof content === 'string' ? content : content.value).includes('Symfony autowiring'));
    }, `Self-hosted language server did not expose Symfony combined-type autowiring for ${needle}`);
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', autowiredConsumerUri, autowiredConsumer.positionAt(offset),
    ) ?? [];
    assert.ok(definitions.some((location) => location.uri.toString() === mailerUri.toString()), `Combined type ${needle} did not navigate to the service implementation`);
  }
  const requiredOffset = autowiredConsumer.getText().indexOf('Mailer $required)') + 2;
  await waitForAsync(async () => {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', autowiredConsumerUri, autowiredConsumer.positionAt(requiredOffset),
    ) ?? [];
    return hovers.flatMap((hover) => hover.contents).some((content) => (typeof content === 'string' ? content : content.value).includes('Symfony autowiring'));
  }, 'Self-hosted language server did not expose Symfony Required method autowiring');
  const requiredDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider', autowiredConsumerUri, autowiredConsumer.positionAt(requiredOffset),
  ) ?? [];
  assert.ok(requiredDefinitions.some((location) => location.uri.toString() === mailerUri.toString()), 'Symfony Required method parameter did not navigate to the service implementation');
  const requiredPropertyOffset = autowiredConsumer.getText().indexOf('Mailer $requiredProperty') + 2;
  await waitForAsync(async () => {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider', autowiredConsumerUri, autowiredConsumer.positionAt(requiredPropertyOffset),
    ) ?? [];
    return hovers.flatMap((hover) => hover.contents).some((content) => (typeof content === 'string' ? content : content.value).includes('Symfony autowiring'));
  }, 'Self-hosted language server did not expose Symfony Required property autowiring');
  const argumentOffset = completionConsumer.getText().indexOf("'A'") + 2;
  const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', completionConsumerUri, completionConsumer.positionAt(argumentOffset), '(',
  );
  assert.strictEqual(signatureHelp?.signatures[0]?.label, 'displayName(string $prefix): string', 'Self-hosted language server returned the wrong member signature');
  const memberReferences = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider', completionConsumerUri, completionConsumer.positionAt(memberOffset + 2), { includeDeclaration: true },
  ) ?? [];
  assert.ok(memberReferences.some((location) => location.uri.toString() === completionServiceUri.toString()), 'Member References omitted the resolved declaration');
  assert.ok(memberReferences.some((location) => location.uri.toString() === completionConsumerUri.toString()), 'Member References omitted the resolved call');
  const parameterOffset = completionConsumer.getText().indexOf('$service') + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeTypeDefinitionProvider', completionConsumerUri, completionConsumer.positionAt(parameterOffset),
    );
    return definitions.some((location) => location.uri.toString() === completionServiceUri.toString());
  }, 'Self-hosted language server did not resolve a proven variable type definition');
  const memberDiagnosticUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'MemberDiagnosticConsumer.php');
  await vscode.workspace.openTextDocument(memberDiagnosticUri);
  const implicitNullableUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'ImplicitNullable.php');
  const implicitNullableDocument = await vscode.workspace.openTextDocument(implicitNullableUri);
  await waitFor(
    () => vscode.languages.getDiagnostics(implicitNullableUri).some((diagnostic) => diagnostic.code === 'php.parameter.implicitly-nullable'),
    'Self-hosted language server did not publish the PHP 8.4 implicit-nullability warning',
  );
  const implicitNullableDiagnostic = vscode.languages.getDiagnostics(implicitNullableUri)
    .find((diagnostic) => diagnostic.code === 'php.parameter.implicitly-nullable')!;
  assert.strictEqual(implicitNullableDocument.getText(implicitNullableDiagnostic.range), 'string',
    'Implicit-nullability warning did not mark only the parameter type');
  let explicitNullableAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', implicitNullableUri, implicitNullableDiagnostic.range, vscode.CodeActionKind.QuickFix.value,
    );
    explicitNullableAction = actions.find((action): action is vscode.CodeAction => 'edit' in action
      && action.title === 'Declare parameter type as explicitly nullable');
    return Boolean(explicitNullableAction?.edit);
  }, 'Implicit-nullability warning did not provide its explicit nullable Quick Fix');
  assert.ok(explicitNullableAction?.edit);
  await vscode.window.showTextDocument(implicitNullableDocument);
  assert.ok(await vscode.workspace.applyEdit(explicitNullableAction.edit), 'Explicit nullable Quick Fix could not be applied');
  await waitFor(() => implicitNullableDocument.getText().includes('?string $name = null'), 'Explicit nullable Quick Fix changed the wrong type');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => implicitNullableDocument.getText().includes('string $name = null'), 'Explicit nullable Quick Fix could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => implicitNullableDocument.getText().includes('?string $name = null'), 'Explicit nullable Quick Fix could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !implicitNullableDocument.getText().includes('?string $name = null'), 'Implicit-nullability fixture could not be restored after Redo');
  const dynamicPropertyUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'DynamicProperties.php');
  const dynamicPropertyDocument = await vscode.workspace.openTextDocument(dynamicPropertyUri);
  await waitFor(
    () => vscode.languages.getDiagnostics(dynamicPropertyUri).some((diagnostic) => diagnostic.source === 'PHP Companion'
      && diagnostic.code === 'php.property.dynamic-deprecated'),
    'Self-hosted language server did not publish a proven dynamic-property creation warning',
  );
  const dynamicPropertyDiagnostics = vscode.languages.getDiagnostics(dynamicPropertyUri)
    .filter((diagnostic) => diagnostic.code === 'php.property.dynamic-deprecated');
  assert.strictEqual(dynamicPropertyDiagnostics.length, 2, 'Dynamic-property creation warning did not suppress proven consecutive writes after creation');
  assert.strictEqual(dynamicPropertyDiagnostics[0]!.severity, vscode.DiagnosticSeverity.Warning);
  assert.strictEqual(dynamicPropertyDiagnostics[0]!.message,
    'Creation of dynamic property App\\Service\\DynamicPropertyTarget::$created is deprecated in PHP 8.2 and newer.');
  assert.strictEqual(dynamicPropertyDocument.getText(dynamicPropertyDiagnostics[0]!.range), 'created',
    'Dynamic-property creation warning did not mark only the property name');
  assert.strictEqual(dynamicPropertyDocument.getText(dynamicPropertyDiagnostics[1]!.range), 'repeated',
    'Dynamic-property creation warning did not retain the first consecutive creation');
  let declareDynamicPropertyAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', dynamicPropertyUri, dynamicPropertyDiagnostics[0]!.range, vscode.CodeActionKind.QuickFix.value,
    );
    declareDynamicPropertyAction = actions.find((action): action is vscode.CodeAction => 'edit' in action
      && action.title === 'Declare property $created in App\\Service\\DynamicPropertyTarget');
    return Boolean(declareDynamicPropertyAction?.edit);
  }, 'Dynamic-property diagnostic did not provide a typed declaration Quick Fix');
  assert.ok(declareDynamicPropertyAction?.edit);
  await vscode.window.showTextDocument(dynamicPropertyDocument);
  assert.ok(await vscode.workspace.applyEdit(declareDynamicPropertyAction.edit), 'Dynamic-property declaration Quick Fix could not be applied');
  await waitFor(() => dynamicPropertyDocument.getText().includes('public int $created;'), 'Dynamic-property declaration Quick Fix inserted the wrong property');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !dynamicPropertyDocument.getText().includes('public int $created;'), 'Dynamic-property declaration Quick Fix could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => dynamicPropertyDocument.getText().includes('public int $created;'), 'Dynamic-property declaration Quick Fix could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !dynamicPropertyDocument.getText().includes('public int $created;'), 'Dynamic-property declaration fixture could not be restored after Redo');
  await waitFor(
    () => {
      const diagnostics = vscode.languages.getDiagnostics(dynamicPropertyUri)
        .filter((diagnostic) => diagnostic.code === 'php.attribute.invalid-allow-dynamic-properties');
      return diagnostics.length === 4
        && diagnostics.every((diagnostic) => dynamicPropertyDocument.getText(diagnostic.range) === '\\AllowDynamicProperties');
    },
    'Self-hosted language server did not publish invalid AllowDynamicProperties declaration diagnostics',
  );
  const invalidDynamicAttributeDiagnostics = vscode.languages.getDiagnostics(dynamicPropertyUri)
    .filter((diagnostic) => diagnostic.code === 'php.attribute.invalid-allow-dynamic-properties');
  assert.deepStrictEqual(invalidDynamicAttributeDiagnostics.map((diagnostic) => diagnostic.message), [
    'Cannot apply #[AllowDynamicProperties] to readonly class App\\Service\\InvalidReadonlyDynamicPropertyTarget.',
    'Cannot apply #[AllowDynamicProperties] to interface App\\Service\\InvalidDynamicPropertyInterface.',
    'Cannot apply #[AllowDynamicProperties] to trait App\\Service\\InvalidDynamicPropertyTrait.',
    'Cannot apply #[AllowDynamicProperties] to enum App\\Service\\InvalidDynamicPropertyEnum.',
  ]);
  assert.ok(invalidDynamicAttributeDiagnostics.every((diagnostic) => dynamicPropertyDocument.getText(diagnostic.range) === '\\AllowDynamicProperties'),
    'Invalid AllowDynamicProperties diagnostics did not mark only the attribute name');
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.member.unresolved'),
    'Self-hosted language server did not publish a proven missing-member diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.argument.missing-required'),
    'Self-hosted language server did not publish a proven missing-required-argument diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.argument.unknown-named'),
    'Self-hosted language server did not publish a proven unknown-named-argument diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.argument.duplicate-named'),
    'Self-hosted language server did not publish a duplicate-named-argument diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.member.non-static-access'),
    'Self-hosted language server did not publish a proven non-static-member access diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.member.inaccessible'),
    'Self-hosted language server did not publish a proven member-visibility diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.argument.type-mismatch'),
    'Self-hosted language server did not publish a proven argument-type diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.return.type-mismatch'),
    'Self-hosted language server did not publish a proven return-type diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.assignment.type-mismatch'),
    'Self-hosted language server did not publish a proven assignment-type diagnostic',
  );
  await waitFor(
    () => vscode.languages.getDiagnostics(memberDiagnosticUri).some((diagnostic) => diagnostic.source === 'PHP Companion' && diagnostic.code === 'php.member.possibly-null'),
    'Self-hosted language server did not publish a proven nullable-member diagnostic',
  );
  const memberDiagnosticDocument = await vscode.workspace.openTextDocument(memberDiagnosticUri);
  const nullableDiagnostic = vscode.languages.getDiagnostics(memberDiagnosticUri).find((diagnostic) => diagnostic.code === 'php.member.possibly-null')!;
  let nullsafeAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const nullableActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', memberDiagnosticUri, nullableDiagnostic.range, vscode.CodeActionKind.QuickFix.value,
    );
    nullsafeAction = nullableActions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Use null-safe member access');
    return Boolean(nullsafeAction?.edit);
  }, 'Nullable-member diagnostic did not provide its null-safe Quick Fix');
  assert.ok(nullsafeAction?.edit);
  await vscode.window.showTextDocument(memberDiagnosticDocument);
  assert.ok(await vscode.workspace.applyEdit(nullsafeAction.edit), 'Null-safe member Quick Fix could not be applied');
  assert.ok(memberDiagnosticDocument.getText().includes("$service?->displayName('prefix')"), 'Null-safe member Quick Fix changed the wrong operator');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => memberDiagnosticDocument.getText().includes("$service->displayName('prefix')"), 'Null-safe member Quick Fix could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => memberDiagnosticDocument.getText().includes("$service?->displayName('prefix')"), 'Null-safe member Quick Fix could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => memberDiagnosticDocument.getText().includes("$service->displayName('prefix')"), 'Null-safe member Quick Fix could not be restored after Redo');
  const extractUri = vscode.Uri.joinPath(workspace.uri, 'src', 'ExtractVariable.php');
  const extractSource = '<?php\nnamespace App;\nfunction createObject(): object\n{\n    $result = new \\stdClass();\n    return $result;\n}\n';
  await vscode.workspace.fs.writeFile(extractUri, Buffer.from(extractSource));
  const extractDocument = await vscode.workspace.openTextDocument(extractUri); await vscode.window.showTextDocument(extractDocument);
  const extractStart = extractSource.indexOf('new \\stdClass()'); let extractAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', extractUri,
      new vscode.Range(extractDocument.positionAt(extractStart), extractDocument.positionAt(extractStart + 'new \\stdClass()'.length)),
      vscode.CodeActionKind.RefactorExtract.value,
    );
    extractAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Extract to $extracted');
    return Boolean(extractAction?.edit);
  }, 'Self-hosted language server did not offer Extract Variable for a whole assignment RHS');
  assert.ok(await vscode.workspace.applyEdit(extractAction!.edit!), 'Extract Variable edit could not be applied');
  await waitFor(() => normalizedNewlines(extractDocument.getText()).includes('$extracted = new \\stdClass();\n    $result = $extracted;'), 'Extract Variable did not preserve indentation or replace the selected expression');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !extractDocument.getText().includes('$extracted ='), 'Extract Variable could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => extractDocument.getText().includes('$extracted = new \\stdClass();'), 'Extract Variable could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => extractDocument.getText() === extractSource, 'Extract Variable did not restore the original document before Inline Variable');
  const inlineStart = extractDocument.getText().indexOf('$result'); let inlineAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', extractUri,
      new vscode.Range(extractDocument.positionAt(inlineStart), extractDocument.positionAt(inlineStart)),
      vscode.CodeActionKind.RefactorInline.value,
    );
    inlineAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Inline $result');
    return Boolean(inlineAction?.edit);
  }, 'Self-hosted language server did not offer Inline Variable for a single immediate whole-value use');
  assert.ok(await vscode.workspace.applyEdit(inlineAction!.edit!), 'Inline Variable edit could not be applied');
  await waitFor(() => extractDocument.getText().includes('return new \\stdClass();') && !extractDocument.getText().includes('$result ='), 'Inline Variable did not remove the declaration and replace the use');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => extractDocument.getText() === extractSource, 'Inline Variable could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => extractDocument.getText().includes('return new \\stdClass();'), 'Inline Variable could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => extractDocument.getText() === extractSource, 'Inline Variable could not be restored after Redo');
  const extractMethodUri = vscode.Uri.joinPath(workspace.uri, 'src', 'ExtractMethod.php');
  const extractMethodSource = '<?php\nnamespace App;\nclass WorkerService { public function prepare(): void {} }\nclass Worker\n{\n    public function run(WorkerService $service, string $message): void\n    {\n        $service->prepare();\n        $this->notify($message);\n        $this->finish();\n    }\n\n    public function produce(): WorkerService\n    {\n        $this->finish();\n        $result = new WorkerService();\n        return $result;\n    }\n\n    private function notify(string $message): void {}\n    private function finish(): void {}\n}\n';
  await vscode.workspace.fs.writeFile(extractMethodUri, Buffer.from(extractMethodSource));
  const extractMethodDocument = await vscode.workspace.openTextDocument(extractMethodUri); await vscode.window.showTextDocument(extractMethodDocument);
  const methodStart = extractMethodSource.indexOf('$service->prepare()'); const methodEnd = extractMethodSource.indexOf(';', extractMethodSource.indexOf('$this->finish()')) + 1;
  let extractMethodAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', extractMethodUri,
      new vscode.Range(extractMethodDocument.positionAt(methodStart), extractMethodDocument.positionAt(methodEnd)),
      vscode.CodeActionKind.RefactorExtract.value,
    );
    extractMethodAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Extract method extractedMethod');
    return Boolean(extractMethodAction?.edit);
  }, 'Self-hosted language server did not offer Extract Method for complete instance statements with proven object receiver inputs');
  assert.ok(await vscode.workspace.applyEdit(extractMethodAction!.edit!), 'Extract Method edit could not be applied');
  await waitFor(() => extractMethodDocument.getText().includes('$this->extractedMethod($service, $message);') && extractMethodDocument.getText().includes('private function extractedMethod(WorkerService $service, string $message): void'), 'Extract Method did not preserve the proven inputs and native parameter types');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => extractMethodDocument.getText() === extractMethodSource, 'Extract Method could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => extractMethodDocument.getText().includes('private function extractedMethod(WorkerService $service, string $message): void'), 'Extract Method could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => extractMethodDocument.getText() === extractMethodSource, 'Extract Method could not be restored after Redo');
  const outputStart = extractMethodSource.lastIndexOf('$this->finish()'); const outputEnd = extractMethodSource.indexOf(';', extractMethodSource.indexOf('$result =', outputStart)) + 1;
  let extractOutputAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', extractMethodUri,
      new vscode.Range(extractMethodDocument.positionAt(outputStart), extractMethodDocument.positionAt(outputEnd)),
      vscode.CodeActionKind.RefactorExtract.value,
    );
    extractOutputAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Extract method extractedMethod');
    return Boolean(extractOutputAction?.edit);
  }, 'Self-hosted language server did not offer Extract Method for one proven output');
  assert.ok(await vscode.workspace.applyEdit(extractOutputAction!.edit!), 'Extract Method output edit could not be applied');
  await waitFor(() => extractMethodDocument.getText().includes('$result = $this->extractedMethod();') && extractMethodDocument.getText().includes('private function extractedMethod(): \\App\\WorkerService') && extractMethodDocument.getText().includes('return new WorkerService();'), 'Extract Method did not preserve its single output');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => extractMethodDocument.getText() === extractMethodSource, 'Extract Method output could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => extractMethodDocument.getText().includes('$result = $this->extractedMethod();'), 'Extract Method output could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => extractMethodDocument.getText() === extractMethodSource, 'Extract Method output could not be restored after Redo');
  const removeParameterUri = vscode.Uri.joinPath(workspace.uri, 'src', 'RemoveParameter.php');
  const removeParameterSource = '<?php\nnamespace App;\nclass Formatter\n{\n    /**\n     * @param int $unused obsolete\n     */\n    private function format(string $prefix, int $unused, string $suffix): string\n    {\n        return $prefix . $suffix;\n    }\n\n    public function run(): void\n    {\n        $this->format("a", 1, "b");\n        $this->format(suffix: "b", unused: 2, prefix: "a");\n    }\n}\n';
  await vscode.workspace.fs.writeFile(removeParameterUri, Buffer.from(removeParameterSource));
  const removeParameterDocument = await vscode.workspace.openTextDocument(removeParameterUri); await vscode.window.showTextDocument(removeParameterDocument);
  const removeParameterOffset = removeParameterSource.indexOf('int $unused,') + 'int '.length; let removeParameterAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', removeParameterUri,
      new vscode.Range(removeParameterDocument.positionAt(removeParameterOffset), removeParameterDocument.positionAt(removeParameterOffset)),
      vscode.CodeActionKind.RefactorRewrite.value,
    );
    removeParameterAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Remove unused parameter $unused');
    return Boolean(removeParameterAction?.edit);
  }, 'Self-hosted language server did not offer removal of an unused private parameter');
  assert.ok(await vscode.workspace.applyEdit(removeParameterAction!.edit!), 'Unused private parameter removal could not be applied');
  await waitFor(() => removeParameterDocument.getText().includes('format(string $prefix, string $suffix)')
    && removeParameterDocument.getText().includes('format("a", "b")')
    && removeParameterDocument.getText().includes('format(suffix: "b", prefix: "a")')
    && !removeParameterDocument.getText().includes('@param int $unused'), 'Private signature change did not update the declaration, PHPDoc and both call styles');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => removeParameterDocument.getText() === removeParameterSource, 'Private signature change could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => removeParameterDocument.getText().includes('format(string $prefix, string $suffix)'), 'Private signature change could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => removeParameterDocument.getText() === removeParameterSource, 'Private signature change could not be restored after Redo');
  await waitForAsync(async () => {
    const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
      'vscode.executeInlayHintProvider', memberDiagnosticUri,
      new vscode.Range(new vscode.Position(0, 0), memberDiagnosticDocument.positionAt(memberDiagnosticDocument.getText().length)),
    );
    return hints.some((hint) => hint.label === ': CompletionService') && hints.some((hint) => hint.label === '$prefix:');
  }, 'Self-hosted language server did not provide a proven local variable type hint');

  const runnerInterfaceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Contract', 'Runner.php');
  const runnerImplementationUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'RunnerImplementation.php');
  const runnerInterface = await vscode.workspace.openTextDocument(runnerInterfaceUri);
  const runnerNameOffset = runnerInterface.getText().indexOf('Runner');
  await waitForAsync(async () => {
    const implementations = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeImplementationProvider', runnerInterfaceUri, runnerInterface.positionAt(runnerNameOffset + 2),
    );
    return implementations.some((location) => location.uri.toString() === runnerImplementationUri.toString());
  }, 'Self-hosted language server did not resolve an interface implementation');
  await waitForAsync(async () => {
    const hierarchy = await vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
      'vscode.prepareTypeHierarchy', runnerInterfaceUri, runnerInterface.positionAt(runnerNameOffset + 2),
    );
    if (!hierarchy?.length || hierarchy[0]!.name !== 'Runner') return false;
    const subtypes = await vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>('vscode.provideSubtypes', hierarchy[0]);
    return subtypes.some((item) => item.uri.toString() === runnerImplementationUri.toString());
  }, 'Self-hosted language server did not provide the interface type hierarchy');

  const missingRunnerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'MissingRunner.php');
  const missingRunner = await vscode.workspace.openTextDocument(missingRunnerUri);
  const missingRunnerOffset = missingRunner.getText().indexOf('MissingRunner');
  let implementAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', missingRunnerUri,
      new vscode.Range(missingRunner.positionAt(missingRunnerOffset), missingRunner.positionAt(missingRunnerOffset + 'MissingRunner'.length)),
    );
    implementAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Implement 1 interface method');
    return Boolean(implementAction?.edit);
  }, 'Self-hosted language server did not offer the missing interface method action');
  await vscode.window.showTextDocument(missingRunner);
  assert.ok(await vscode.workspace.applyEdit(implementAction!.edit!), 'Implement interface methods edit could not be applied');
  assert.ok(normalizedNewlines(missingRunner.getText()).includes("public function run(): void\n    {\n        throw new \\LogicException('Not implemented.');"), 'Generated interface method did not preserve the declared signature');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !missingRunner.getText().includes('LogicException'), 'Implement interface methods could not be undone as one editor operation');

  const constructorUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'ConstructorTarget.php');
  const constructorDocument = await vscode.workspace.openTextDocument(constructorUri);
  const constructorOffset = constructorDocument.getText().indexOf('ConstructorTarget');
  let constructorAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', constructorUri,
      new vscode.Range(constructorDocument.positionAt(constructorOffset), constructorDocument.positionAt(constructorOffset + 'ConstructorTarget'.length)),
    );
    constructorAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Generate constructor for 1 property');
    return Boolean(constructorAction?.edit);
  }, 'Self-hosted language server did not offer safe constructor generation');
  await vscode.window.showTextDocument(constructorDocument);
  assert.ok(await vscode.workspace.applyEdit(constructorAction!.edit!), 'Constructor generation edit could not be applied');
  assert.ok(constructorDocument.getText().includes('public function __construct(string $name)'), 'Generated constructor did not preserve the property type');
  assert.ok(!constructorDocument.getText().includes('$limit = $limit'), 'Generated constructor included a property that already has a default');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !constructorDocument.getText().includes('__construct'), 'Constructor generation could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => constructorDocument.getText().includes('public function __construct(string $name)'), 'Constructor generation could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !constructorDocument.getText().includes('__construct'), 'Constructor generation could not be restored after Redo');
  let accessorAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', constructorUri,
      new vscode.Range(constructorDocument.positionAt(constructorOffset), constructorDocument.positionAt(constructorOffset + 'ConstructorTarget'.length)),
    );
    accessorAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Generate 2 property accessors');
    return Boolean(accessorAction?.edit);
  }, 'Self-hosted language server did not offer safe accessor generation');
  assert.ok(await vscode.workspace.applyEdit(accessorAction!.edit!), 'Accessor generation edit could not be applied');
  for (const signature of ['getName(): string', 'setName(string $name): void', 'getLimit(): int', 'setLimit(int $limit): void']) {
    assert.ok(constructorDocument.getText().includes(signature), `Generated accessors omitted ${signature}`);
  }
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !constructorDocument.getText().includes('getName'), 'Accessor generation could not be undone as one editor operation');

  const overrideUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'OverrideTarget.php');
  const overrideDocument = await vscode.workspace.openTextDocument(overrideUri);
  const overrideOffset = overrideDocument.getText().indexOf('OverrideTarget');
  let overrideAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', overrideUri,
      new vscode.Range(overrideDocument.positionAt(overrideOffset), overrideDocument.positionAt(overrideOffset + 'OverrideTarget'.length)),
    );
    overrideAction = actions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Override App\\Service\\BaseService::label');
    return Boolean(overrideAction?.edit) && !actions.some((action) => action.title.includes('fixed'));
  }, 'Self-hosted language server did not offer only the safe Override candidate');
  await vscode.window.showTextDocument(overrideDocument);
  assert.ok(await vscode.workspace.applyEdit(overrideAction!.edit!), 'Override edit could not be applied');
  assert.ok(normalizedNewlines(overrideDocument.getText()).includes("public function label(string $prefix = ''): string\n    {\n        return parent::label($prefix);"), 'Override did not preserve and forward the parent signature');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !overrideDocument.getText().includes('parent::label'), 'Override could not be undone as one editor operation');

  const unusedImportUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'UnusedImport.php');
  const unusedImportDocument = await vscode.workspace.openTextDocument(unusedImportUri);
  let unusedImportDiagnostic: vscode.Diagnostic | undefined;
  await waitFor(() => {
    unusedImportDiagnostic = vscode.languages.getDiagnostics(unusedImportUri).find((diagnostic) => diagnostic.code === 'php.import.unused');
    return Boolean(unusedImportDiagnostic);
  }, 'Self-hosted language server did not diagnose an unused independent import');
  let removeImportAction: vscode.CodeAction | undefined;
  await waitForAsync(async () => {
    const unusedImportActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', unusedImportUri, unusedImportDiagnostic!.range, vscode.CodeActionKind.QuickFix.value,
    );
    removeImportAction = unusedImportActions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Remove unused import');
    return Boolean(removeImportAction?.edit);
  }, 'Unused import diagnostic did not provide its removal Quick Fix');
  assert.ok(removeImportAction?.edit, 'Unused import diagnostic did not provide its removal Quick Fix');
  await vscode.window.showTextDocument(unusedImportDocument);
  assert.ok(await vscode.workspace.applyEdit(removeImportAction.edit), 'Unused import Quick Fix could not be applied');
  assert.ok(!unusedImportDocument.getText().includes('use App\\Contract\\Runner;'), 'Unused import Quick Fix left the import statement');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => unusedImportDocument.getText().includes('use App\\Contract\\Runner;'), 'Unused import Quick Fix could not be undone as one editor operation');

  const diagnosticUnknownsUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'DiagnosticUnknowns.php');
  const unresolvedSymbolsUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'UnresolvedSymbolConsumer.php');
  const wrongNamespaceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'WrongNamespace.php');
  await vscode.workspace.openTextDocument(diagnosticUnknownsUri);
  await vscode.workspace.openTextDocument(unresolvedSymbolsUri);
  await vscode.workspace.openTextDocument(wrongNamespaceUri);
  await waitForAsync(async () => {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', diagnosticUnknownsUri) ?? [];
    return symbols.some((symbol) => symbol.name === 'KnownDiagnosticTarget');
  }, 'Diagnostic unknown fixture was not analyzed');
  const unknownFactDiagnostics = vscode.languages.getDiagnostics(diagnosticUnknownsUri).filter((diagnostic) => diagnostic.source === 'PHP Companion');
  assert.deepEqual(unknownFactDiagnostics.map((diagnostic) => diagnostic.code), ['php.type.unresolved'],
    `Incomplete hierarchy produced cascading diagnostics: ${unknownFactDiagnostics.map((diagnostic) => String(diagnostic.code)).join(', ')}`);
  assert.equal(unknownFactDiagnostics[0]?.message, 'Cannot resolve type App\\Service\\ExternalBase.', 'Missing parent type diagnostic resolved the wrong identity');
  await waitFor(() => vscode.languages.getDiagnostics(unresolvedSymbolsUri).some((diagnostic) => diagnostic.code === 'php.function.unresolved'),
    'Namespaced unresolved function diagnostic was not published');
  const unresolvedSymbolDiagnostics = vscode.languages.getDiagnostics(unresolvedSymbolsUri).filter((diagnostic) => diagnostic.source === 'PHP Companion');
  assert.deepEqual(unresolvedSymbolDiagnostics.map((diagnostic) => [diagnostic.code, diagnostic.message]), [
    ['php.variable.undefined', 'Variable $definitelyMissing is definitely undefined at this point.'],
    ['php.function.unresolved', 'Cannot resolve function App\\Service\\MissingVendor\\missingFunction.'],
    ['php.constant.unresolved', 'Cannot resolve constant App\\Service\\MissingVendor\\MISSING_CONSTANT.'],
  ], 'Namespaced unresolved-symbol diagnostics were missing or included unqualified extension candidates');
  await waitFor(() => vscode.languages.getDiagnostics(wrongNamespaceUri).some((diagnostic) => diagnostic.code === 'php.namespace.psr4'), 'PSR-4 namespace fixture was not analyzed');
  const diagnosticCorpus = new Map<string, { uri: vscode.Uri; expected: string[] }>([
    ['syntax', { uri: brokenUri, expected: ['php.syntax'] }],
    ['control-flow', { uri: controlFlowDiagnosticUri, expected: ['php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.control-flow.unreachable', 'php.never.fallthrough', 'php.return.missing', 'php.inheritance.final-class', 'php.method.incompatible-override'] }],
    ['member-and-type', { uri: memberDiagnosticUri, expected: [
      'php.argument.duplicate-named', 'php.argument.missing-required', 'php.argument.type-mismatch', 'php.argument.unknown-named',
      'php.assignment.type-mismatch', 'php.member.inaccessible', 'php.member.non-static-access', 'php.member.possibly-null',
      'php.member.unresolved', 'php.return.type-mismatch',
    ] }],
    ['interface', { uri: missingRunnerUri, expected: ['php.interface.missing-method'] }],
    ['unused-import', { uri: unusedImportUri, expected: ['php.import.unused'] }],
    ['namespace', { uri: wrongNamespaceUri, expected: ['php.namespace.psr4'] }],
    ['phpdoc-native', { uri: phpDocConflictUri, expected: ['php.phpdoc.type-conflict'] }],
    ['unknown-suppression', { uri: diagnosticUnknownsUri, expected: ['php.type.unresolved'] }],
    ['unresolved-symbols', { uri: unresolvedSymbolsUri, expected: ['php.variable.undefined', 'php.function.unresolved', 'php.constant.unresolved'] }],
  ]);
  for (const [name, item] of diagnosticCorpus) {
    const actual = vscode.languages.getDiagnostics(item.uri)
      .filter((diagnostic) => diagnostic.source === 'PHP Companion')
      .map((diagnostic) => String(diagnostic.code)).sort();
    assert.deepStrictEqual(actual, [...item.expected].sort(), `Diagnostic corpus mismatch for ${name}`);
  }

  const optimizeImportsUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'OptimizeImports.php');
  const optimizeImportsDocument = await vscode.workspace.openTextDocument(optimizeImportsUri);
  const organizeActions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
    'vscode.executeCodeActionProvider', optimizeImportsUri,
    new vscode.Range(new vscode.Position(0, 0), optimizeImportsDocument.positionAt(optimizeImportsDocument.getText().length)),
    vscode.CodeActionKind.SourceOrganizeImports.value,
  );
  const organizeAction = organizeActions.find((action): action is vscode.CodeAction => 'edit' in action && action.title === 'Organize Imports');
  assert.ok(organizeAction?.edit, 'Organize Imports source action was not available');
  await vscode.window.showTextDocument(optimizeImportsDocument);
  assert.ok(await vscode.workspace.applyEdit(organizeAction.edit), 'Organize Imports edit could not be applied');
  assert.ok(!optimizeImportsDocument.getText().includes('OverrideTarget'), 'Organize Imports left a proven unused import');
  assert.ok(optimizeImportsDocument.getText().includes('use App\\Service\\CompletionService;'), 'Organize Imports removed a used import');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => optimizeImportsDocument.getText().includes('OverrideTarget'), 'Organize Imports could not be undone as one editor operation');

  const constantsUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Support', 'Constants.php');
  const constantConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'ConstantConsumer.php');
  const constantConsumer = await vscode.workspace.openTextDocument(constantConsumerUri);
  const constantOffset = constantConsumer.getText().lastIndexOf('DEFAULT_LIMIT');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', constantConsumerUri, constantConsumer.positionAt(constantOffset + 2),
    );
    return definitions.some((location) => location.uri.toString() === constantsUri.toString());
  }, 'Self-hosted language server did not resolve an imported namespace constant');
  const constants = await vscode.workspace.openTextDocument(constantsUri);
  const globalConstantEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', constantConsumerUri, constantConsumer.positionAt(constantOffset + 2), 'MAX_ITEMS',
  );
  assert.ok(globalConstantEdit, 'Namespace constant Rename returned no edit');
  assert.strictEqual(globalConstantEdit.get(constantsUri).length, 1, 'Namespace constant Rename did not update its declaration');
  assert.strictEqual(globalConstantEdit.get(constantConsumerUri).length, 2, 'Namespace constant Rename did not update its import and use');
  await vscode.window.showTextDocument(constantConsumer);
  assert.ok(await vscode.workspace.applyEdit(globalConstantEdit), 'Namespace constant Rename edit could not be applied');
  await waitFor(() => constants.getText().includes('MAX_ITEMS') && (constantConsumer.getText().match(/MAX_ITEMS/g)?.length ?? 0) === 2, 'Namespace constant Rename did not apply across files');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => constants.getText().includes('DEFAULT_LIMIT') && (constantConsumer.getText().match(/DEFAULT_LIMIT/g)?.length ?? 0) === 2, 'Namespace constant Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => constants.getText().includes('MAX_ITEMS') && constantConsumer.getText().includes('MAX_ITEMS'), 'Namespace constant Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => constants.getText().includes('DEFAULT_LIMIT') && constantConsumer.getText().includes('DEFAULT_LIMIT'), 'Namespace constant Rename fixture could not be restored');

  const classConstantBaseUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'ConstantBase.php');
  const classConstantConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'ClassConstantConsumer.php');
  const classConstantBase = await vscode.workspace.openTextDocument(classConstantBaseUri);
  const classConstantConsumer = await vscode.workspace.openTextDocument(classConstantConsumerUri);
  const classConstantOffset = classConstantConsumer.getText().lastIndexOf('MODE') + 2;
  const classConstantEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', classConstantConsumerUri, classConstantConsumer.positionAt(classConstantOffset), 'FORMAT',
  );
  assert.ok(classConstantEdit, 'Class constant Rename returned no edit');
  assert.strictEqual(classConstantEdit.get(classConstantBaseUri).length, 2, 'Class constant Rename did not update its declaration and self access');
  assert.strictEqual(classConstantEdit.get(classConstantConsumerUri).length, 2, 'Class constant Rename did not update base and inherited accesses');
  await vscode.window.showTextDocument(classConstantConsumer);
  assert.ok(await vscode.workspace.applyEdit(classConstantEdit), 'Class constant Rename edit could not be applied');
  await waitFor(() => (classConstantBase.getText().match(/FORMAT/g)?.length ?? 0) === 2
    && (classConstantConsumer.getText().match(/FORMAT/g)?.length ?? 0) === 2, 'Class constant Rename did not apply across files');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (classConstantBase.getText().match(/MODE/g)?.length ?? 0) === 2
    && (classConstantConsumer.getText().match(/MODE/g)?.length ?? 0) === 2, 'Class constant Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => classConstantBase.getText().includes('FORMAT') && classConstantConsumer.getText().includes('FORMAT'), 'Class constant Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => classConstantBase.getText().includes('MODE') && classConstantConsumer.getText().includes('MODE'), 'Class constant Rename fixture could not be restored');

  const traitConstantConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'TraitConstantConsumer.php');
  const traitConstantConsumer = await vscode.workspace.openTextDocument(traitConstantConsumerUri);
  const traitConstantOffset = traitConstantConsumer.getText().lastIndexOf('CATEGORY') + 2;
  const traitConstantEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', traitConstantConsumerUri, traitConstantConsumer.positionAt(traitConstantOffset), 'GROUP',
  );
  assert.ok(traitConstantEdit, 'Trait constant Rename returned no edit');
  assert.strictEqual(traitConstantEdit.get(traitFeatureUri).length, 2, 'Trait constant Rename did not update its declaration and self access');
  assert.strictEqual(traitConstantEdit.get(traitConstantConsumerUri).length, 2, 'Trait constant Rename did not update host and descendant accesses');
  await vscode.window.showTextDocument(traitConstantConsumer);
  assert.ok(await vscode.workspace.applyEdit(traitConstantEdit), 'Trait constant Rename edit could not be applied');
  await waitFor(() => (traitFeature.getText().match(/GROUP/g)?.length ?? 0) === 2
    && (traitConstantConsumer.getText().match(/GROUP/g)?.length ?? 0) === 2, 'Trait constant Rename did not apply across consumers');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => (traitFeature.getText().match(/CATEGORY/g)?.length ?? 0) === 2
    && (traitConstantConsumer.getText().match(/CATEGORY/g)?.length ?? 0) === 2, 'Trait constant Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => traitFeature.getText().includes('GROUP') && traitConstantConsumer.getText().includes('GROUP'), 'Trait constant Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => traitFeature.getText().includes('CATEGORY') && traitConstantConsumer.getText().includes('CATEGORY'), 'Trait constant Rename fixture could not be restored');

  const enumUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'DeliveryState.php');
  const enumConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'EnumCaseConsumer.php');
  const enumDocument = await vscode.workspace.openTextDocument(enumUri);
  const enumConsumer = await vscode.workspace.openTextDocument(enumConsumerUri);
  const enumStaticOffset = enumConsumer.getText().indexOf('DeliveryState::Ready') + 'DeliveryState::'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', enumConsumerUri, enumConsumer.positionAt(enumStaticOffset), ':',
    );
    const labels = new Set(completion.items.map((item) => typeof item.label === 'string' ? item.label : item.label.label));
    return ['cases', 'from', 'tryFrom', 'Ready', 'ready'].every((label) => labels.has(label))
      && completion.items.some((item) => (typeof item.label === 'string' ? item.label : item.label.label) === 'Ready' && item.kind === vscode.CompletionItemKind.EnumMember);
  }, 'Enum static completion omitted native methods or case-sensitive cases');
  const enumInstanceOffset = enumConsumer.getText().lastIndexOf('->value') + 2;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', enumConsumerUri, enumConsumer.positionAt(enumInstanceOffset), '>',
    );
    const labels = new Set(completion.items.map((item) => typeof item.label === 'string' ? item.label : item.label.label));
    return labels.has('name') && labels.has('value');
  }, 'Backed Enum static factory return type did not expose native instance properties');
  const enumHovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    'vscode.executeHoverProvider', enumConsumerUri, enumConsumer.positionAt(enumConsumer.getText().indexOf('Ready') + 2),
  ) ?? [];
  const enumHoverText = enumHovers.flatMap((hover) => hover.contents).map((content) => typeof content === 'string' ? content : content.value).join('\n');
  assert.ok(enumHoverText.includes("case Ready = 'ready'"), `Enum case hover lost its native declaration form: ${enumHoverText}`);
  const enumArgumentOffset = enumConsumer.getText().lastIndexOf("'ready'") + 4;
  const enumSignature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
    'vscode.executeSignatureHelpProvider', enumConsumerUri, enumConsumer.positionAt(enumArgumentOffset), '(',
  );
  assert.strictEqual(enumSignature?.signatures[0]?.label, 'from(string $value): static', 'Backed Enum factory signature was not exact');
  const enumCaseOffset = enumConsumer.getText().indexOf('Ready') + 2;
  const enumCaseEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider', enumConsumerUri, enumConsumer.positionAt(enumCaseOffset), 'Pending',
  );
  assert.ok(enumCaseEdit, 'Enum case Rename returned no edit');
  assert.strictEqual(enumCaseEdit.get(enumUri).length, 1, 'Enum case Rename did not update its declaration');
  assert.strictEqual(enumCaseEdit.get(enumConsumerUri).length, 1, 'Enum case Rename did not update its exact static access');
  assert.ok(enumDocument.getText().includes('case ready'), 'Enum case fixture lost its case-sensitive sibling');
  await vscode.window.showTextDocument(enumConsumer);
  assert.ok(await vscode.workspace.applyEdit(enumCaseEdit), 'Enum case Rename edit could not be applied');
  await waitFor(() => enumDocument.getText().includes('case Pending') && enumConsumer.getText().includes('DeliveryState::Pending')
    && enumDocument.getText().includes('case ready') && enumConsumer.getText().includes('DeliveryState::ready'), 'Enum case Rename did not preserve case-sensitive identities');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => enumDocument.getText().includes('case Ready') && enumConsumer.getText().includes('DeliveryState::Ready'), 'Enum case Rename could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => enumDocument.getText().includes('case Pending') && enumConsumer.getText().includes('DeliveryState::Pending'), 'Enum case Rename could not be redone as one editor operation');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => enumDocument.getText().includes('case Ready') && enumConsumer.getText().includes('DeliveryState::Ready'), 'Enum case Rename fixture could not be restored');

  const dynamicConstantUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'Php83DynamicConstant.php');
  const dynamicConstantSource = `<?php declare(strict_types=1); namespace App\\Controller;
class Php83Flags { public const OK = 1; public const LABEL = 'bad'; }
function php83AcceptInt(int $value): void {}
function php83DynamicConstant(string $input): void {
    $name = 'OK'; php83AcceptInt(Php83Flags::{$name});
    $bad = 'LABEL'; php83AcceptInt(Php83Flags::{$bad});
    $changed = 'OK'; $changed = $input; php83AcceptInt(Php83Flags::{$changed});
}`;
  try {
    await vscode.workspace.fs.writeFile(dynamicConstantUri, Buffer.from(dynamicConstantSource));
    const dynamicConstantDocument = await vscode.workspace.openTextDocument(dynamicConstantUri);
    await waitForAsync(async () => vscode.languages.getDiagnostics(dynamicConstantUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch').length === 1,
    'Packaged PHP 8.3 dynamic class constant literal type did not reach diagnostics');
    const dynamicNameOffset = dynamicConstantSource.indexOf('$name}');
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', dynamicConstantUri, dynamicConstantDocument.positionAt(dynamicNameOffset + 2),
      );
      return definitions.length === 1 && definitions[0]!.uri.toString() === dynamicConstantUri.toString()
        && dynamicConstantDocument.offsetAt(definitions[0]!.range.start) === dynamicConstantSource.indexOf('OK = 1');
    }, 'Packaged PHP 8.3 dynamic class constant Definition did not resolve the unique declaration');
    const changedOffset = dynamicConstantSource.indexOf('$changed}');
    const changedDefinitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', dynamicConstantUri, dynamicConstantDocument.positionAt(changedOffset + 2),
    );
    assert.deepStrictEqual(changedDefinitions, [], 'Modified PHP 8.3 dynamic class constant name produced a guessed Definition');
  } finally {
    try { await vscode.workspace.fs.delete(dynamicConstantUri); } catch { /* Fixture may not have been created if setup failed. */ }
  }

  const propertyHookUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'Php84PropertyHooks.php');
  const propertyHookSource = `<?php declare(strict_types=1); namespace App\\Controller;
interface Php84HookLabel {}
class Php84Hooks {
    public string $display { get => 'display'; }
    public string $sink { set(string|Php84HookLabel $value) { echo $value; } }
    public private(set) string $input { set(string|Php84HookLabel $value) => (string) $value; }
    public array $items { get => $this->items; }
    public array $referenceItems { &get { return $this->referenceItems; } }
}
class Php84Animal {} class Php84Dog extends Php84Animal {}
interface Php84Readable { public Php84Animal $pet { get; } }
interface Php84Both { public Php84Animal $pet { get; set; } }
class Php84Missing implements Php84Readable {}
class Php84BadInvariant implements Php84Both { public Php84Dog $pet; }
class Php84FinalBase { final public string $closed; }
class Php84BadFinal extends Php84FinalBase { public string $closed; }
class Php84ReferenceIteration {
    public array $plain { get => $this->plain; }
    public array $allowed { &get { return $this->allowed; } }
}
function php84Mutate(array &$value): void {}
function php84PropertyHooks(Php84Hooks $hooks, array $replacement, Php84ReferenceIteration $iteration): void {
    $hooks->display; $hooks->display = 'changed';
    $hooks->sink = 1; $hooks->sink;
    $hooks->input = 'accepted'; $hooks->input;
    $hooks->items['key'] = 'changed'; $hooks->referenceItems['key'] = 'changed';
    $right =& $hooks->items; $allowed =& $hooks->referenceItems;
    $hooks->items =& $replacement; $hooks->referenceItems =& $replacement;
    php84Mutate($hooks->items); php84Mutate($hooks->referenceItems);
    foreach ($hooks->items as &$item) {} foreach ($hooks->referenceItems as &$allowedItem) {}
    foreach ($iteration as &$property) {}
}`;
  try {
    await vscode.workspace.fs.writeFile(propertyHookUri, Buffer.from(propertyHookSource));
    const propertyHookDocument = await vscode.workspace.openTextDocument(propertyHookUri);
    let propertyHookCodes: Array<vscode.Diagnostic['code']> = [];
    await waitForAsync(async () => {
      propertyHookCodes = vscode.languages.getDiagnostics(propertyHookUri).map((diagnostic) => diagnostic.code);
      return propertyHookCodes.filter((code) => code === 'php.property.unwritable').length === 1
        && propertyHookCodes.filter((code) => code === 'php.property.unreadable').length === 1
        && propertyHookCodes.filter((code) => code === 'php.assignment.type-mismatch').length === 1
        && propertyHookCodes.filter((code) => code === 'php.member.inaccessible').length === 1
        && propertyHookCodes.filter((code) => code === 'php.property.indirect-modification').length === 4
        && propertyHookCodes.filter((code) => code === 'php.property.reference-assignment').length === 2
        && propertyHookCodes.filter((code) => code === 'php.property.reference-iteration').length === 1
        && propertyHookCodes.filter((code) => code === 'php.property.missing-implementation').length === 1
        && propertyHookCodes.filter((code) => code === 'php.property.incompatible-override').length === 2
        && !propertyHookCodes.includes('php.variable.undefined');
    }, () => `Packaged PHP 8.4 property-hook capabilities did not reach exact diagnostics; last codes: ${JSON.stringify(propertyHookCodes)}`, 15_000, 50);
    for (const marker of ['display;', 'sink = 1']) {
      const offset = propertyHookSource.indexOf(marker) + 2;
      await waitForAsync(async () => {
        const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeDefinitionProvider', propertyHookUri, propertyHookDocument.positionAt(offset),
        ) ?? [];
        return definitions.length === 1 && definitions[0]!.uri.toString() === propertyHookUri.toString()
          && propertyHookDocument.getText(definitions[0]!.range).startsWith('$');
      }, `Packaged PHP 8.4 property-hook Definition did not resolve ${marker}`);
    }
  } finally {
    try { await vscode.workspace.fs.delete(propertyHookUri); } catch { /* Fixture may not have been created if setup failed. */ }
  }

  await vscode.workspace.openTextDocument(wrongNamespaceUri);
  await waitFor(
    () => vscode.languages.getDiagnostics(wrongNamespaceUri).some((diagnostic) => diagnostic.code === 'php.namespace.psr4'),
    'Self-hosted language server did not publish a PSR-4 namespace diagnostic',
  );
  const namespaceDiagnostic = vscode.languages.getDiagnostics(wrongNamespaceUri).find((diagnostic) => diagnostic.code === 'php.namespace.psr4')!;
  await waitForAsync(async () => {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>(
      'vscode.executeCodeActionProvider', wrongNamespaceUri, namespaceDiagnostic.range, vscode.CodeActionKind.QuickFix.value,
    );
    return actions.some((action) => 'edit' in action && action.kind?.contains(vscode.CodeActionKind.QuickFix) === true
      && action.edit?.entries().some(([uri, edits]) => uri.toString() === wrongNamespaceUri.toString()
        && edits.some((edit) => edit.newText === 'App')));
  }, 'Self-hosted language server did not expose the preferred PSR-4 namespace quick fix');
  const builtinConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'BuiltinConsumer.php');
  const typePredicateConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'TypePredicateConsumer.php');
  const typePredicateComplementConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'TypePredicateComplementConsumer.php');
  const typePredicatePropertyConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'TypePredicatePropertyConsumer.php');
  const localVarDocConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'LocalVarDocConsumer.php');
  const nativeAssertConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'NativeAssertConsumer.php');
  const booleanLiteralBranchConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'BooleanLiteralBranchConsumer.php');
  const nullCoalescingConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'NullCoalescingConsumer.php');
  const matchExpressionConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'MatchExpressionConsumer.php');
  const builtinConsumer = await vscode.workspace.openTextDocument(builtinConsumerUri);
  const typePredicateConsumer = await vscode.workspace.openTextDocument(typePredicateConsumerUri);
  const typePredicateComplementConsumer = await vscode.workspace.openTextDocument(typePredicateComplementConsumerUri);
  const typePredicatePropertyConsumer = await vscode.workspace.openTextDocument(typePredicatePropertyConsumerUri);
  const localVarDocConsumer = await vscode.workspace.openTextDocument(localVarDocConsumerUri);
  const nativeAssertConsumer = await vscode.workspace.openTextDocument(nativeAssertConsumerUri);
  const booleanLiteralBranchConsumer = await vscode.workspace.openTextDocument(booleanLiteralBranchConsumerUri);
  const nullCoalescingConsumer = await vscode.workspace.openTextDocument(nullCoalescingConsumerUri);
  const matchExpressionConsumer = await vscode.workspace.openTextDocument(matchExpressionConsumerUri);
  const builtinMemberOffset = builtinConsumer.getText().indexOf('format(');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(builtinMemberOffset + 2),
    );
    if (!definitions.some((location) => location.uri.scheme === 'php-companion-builtin')) return false;
    const target = await vscode.workspace.openTextDocument(definitions.find((location) => location.uri.scheme === 'php-companion-builtin')!.uri);
    return target.getText().includes('interface DateTimeInterface');
  }, 'Self-hosted language server did not expose the builtin definition document');
  const exceptionTypeOffset = builtinConsumer.getText().indexOf('RuntimeException');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(exceptionTypeOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not resolve a standard SPL exception to the builtin document');
  const exceptionMemberOffset = builtinConsumer.getText().indexOf('getMessage');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(exceptionMemberOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate an inherited Throwable member');
  const generatorTypeOffset = builtinConsumer.getText().indexOf('\\Generator') + 1;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(generatorTypeOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not resolve Generator to the builtin document');
  const generatorMemberOffset = builtinConsumer.getText().indexOf('next();');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(generatorMemberOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate a Generator member');
  const countableMemberOffset = builtinConsumer.getText().indexOf('count();');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(countableMemberOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate a Countable member');
  const datePeriodMemberOffset = builtinConsumer.getText().indexOf("$occurrence->format('c')") + '$occurrence->'.length;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(datePeriodMemberOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not propagate the DatePeriod element type through foreach');
  const datePeriodSignatureOffset = builtinConsumer.getText().indexOf('$start, $interval, 2') + '$start, $interval, 2'.length;
  await waitForAsync(async () => {
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(datePeriodSignatureOffset), ',',
    );
    return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes('int $recurrences');
  }, 'Self-hosted language server did not select the DatePeriod recurrence constructor overload');
  const implodeDefinitionOffset = builtinConsumer.getText().indexOf("implode('-',");
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(implodeDefinitionOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate an audited string function to the builtin document');
  const implodeSignatureOffset = builtinConsumer.getText().indexOf("'-', ['first', 'second']") + "'-', ['first', 'second']".length;
  await waitForAsync(async () => {
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(implodeSignatureOffset), ',',
    );
    return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes('string $separator, array $array');
  }, 'Self-hosted language server did not select the canonical implode overload');
  const strtrSignatureOffset = builtinConsumer.getText().indexOf("'abc', ['a' => 'x']") + "'abc', ['a' => 'x']".length;
  await waitForAsync(async () => {
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(strtrSignatureOffset), ',',
    );
    return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes('string $string, array $from');
  }, 'Self-hosted language server did not select the array strtr overload');
  for (const stringSymbol of ['addcslashes', 'addslashes', 'chop', 'chr', 'chunk_split', 'convert_uudecode',
    'convert_uuencode', 'count_chars', 'crc32', 'crypt', 'fprintf', 'get_html_translation_table', 'hebrev',
    'levenshtein', 'localeconv', 'md5', 'md5_file', 'metaphone', 'nl_langinfo', 'number_format', 'ord',
    'printf', 'quoted_printable_decode', 'quoted_printable_encode', 'quotemeta', 'setlocale', 'sha1',
    'sha1_file', 'similar_text', 'soundex', 'sscanf', 'str_decrement', 'str_getcsv', 'str_increment',
    'str_repeat', 'str_rot13', 'str_shuffle', 'str_word_count', 'strchr', 'strcoll', 'strcspn', 'strip_tags',
    'stripcslashes', 'stripslashes', 'stristr', 'strpbrk', 'strrchr', 'strspn', 'strstr', 'strtok',
    'substr_compare', 'substr_count', 'substr_replace', 'utf8_decode', 'utf8_encode', 'vfprintf', 'vprintf']) {
    const stringOffset = builtinConsumer.getText().indexOf(`${stringSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(stringOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${stringSymbol} to the builtin document`);
  }
  for (const [call, expected] of [["count_chars('abca', 1)", 'array<int, int>'],
    ["count_chars('abca', 3)", 'string'], ["str_word_count('one two', 0)", 'int'],
    ["str_word_count('one two', 1)", 'list<string>'], ["str_word_count('one two', 2)", 'array<int, string>'],
    ["str_getcsv('a,b')", 'list<string|null>'], ['localeconv()', 'decimal_point: string'],
    ["substr_replace('fixture', 'x', 1)", 'string'], ["substr_replace(['fixture'], 'x', 1)", 'array'],
    ["str_increment('AZ')", 'string'], ["strrchr('fixture', 'x', true)", 'bool $before_needle']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const stringConstant of ['HTML_ENTITIES', 'ENT_QUOTES', 'ENT_HTML5', 'STR_PAD_LEFT']) {
    const constantOffset = builtinConsumer.getText().indexOf(stringConstant);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(constantOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${stringConstant} to the builtin document`);
  }
  for (const jsonSymbol of ['json_encode', 'json_decode', 'json_validate']) {
    const jsonOffset = builtinConsumer.getText().indexOf(`${jsonSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(jsonOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${jsonSymbol} to the builtin document`);
  }
  const jsonFlagOffset = builtinConsumer.getText().indexOf('JSON_THROW_ON_ERROR');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(jsonFlagOffset + 2),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate JSON_THROW_ON_ERROR to the builtin document');
  for (const filesystemSymbol of ['file_get_contents', 'file_put_contents', 'pathinfo']) {
    const filesystemOffset = builtinConsumer.getText().indexOf(`${filesystemSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(filesystemOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${filesystemSymbol} to the builtin document`);
  }
  const fileAppendOffset = builtinConsumer.getText().indexOf('FILE_APPEND');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(fileAppendOffset + 2),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate FILE_APPEND to the builtin document');
  for (const [directorySymbol, marker] of [['chdir', "chdir('.')"], ['chroot', "chroot('/')"],
    ['closedir', 'closedir($handle)'], ['dir', "$directory = dir('.')"], ['getcwd', 'getcwd()'],
    ['opendir', "$handle = opendir('.')"], ['readdir', 'readdir($handle)'],
    ['rewinddir', 'rewinddir($handle)'], ['scandir', "scandir('.', SCANDIR_SORT_ASCENDING)"]] as const) {
    const directoryOffset = builtinConsumer.getText().indexOf(marker) + marker.indexOf(`${directorySymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(directoryOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${directorySymbol} to the builtin document`);
  }
  for (const directoryMember of ['$directory->path;', '$directory->handle;', '$directory->read()',
    '$directory->rewind()', '$directory->close()']) {
    const memberOffset = builtinConsumer.getText().indexOf(directoryMember) + directoryMember.indexOf('->') + 4;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${directoryMember} to the builtin document`);
  }
  for (const directoryConstant of ['SCANDIR_SORT_ASCENDING', 'SCANDIR_SORT_DESCENDING', 'SCANDIR_SORT_NONE']) {
    const constantOffset = builtinConsumer.getText().indexOf(directoryConstant);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(constantOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${directoryConstant} to the builtin document`);
  }
  for (const [call, expected] of [["$directory = dir('.')", 'Directory|false'],
    ["scandir('.', SCANDIR_SORT_ASCENDING)", 'list<string>|false'], ['$directory->read()', 'string|false']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const executionSymbol of ['escapeshellarg', 'escapeshellcmd', 'exec', 'passthru', 'proc_close',
    'proc_get_status', 'proc_nice', 'proc_open', 'proc_terminate', 'shell_exec', 'system']) {
    const executionOffset = builtinConsumer.getText().indexOf(`${executionSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(executionOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${executionSymbol} to the builtin document`);
  }
  for (const [call, expected] of [["exec('echo fixture', $output, $resultCode)", 'string|false'],
    ["passthru('echo fixture', $passthruCode)", 'false|null'],
    ["$process = proc_open(['php', '-v'], [1 => ['pipe', 'w']], $pipes)", 'resource|false'],
    ['proc_get_status($process)', 'cached: bool'], ["shell_exec('echo fixture')", 'string|false|null']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const metadataSymbol of ['chgrp', 'chmod', 'chown', 'clearstatcache', 'disk_free_space',
    'disk_total_space', 'diskfreespace', 'fileatime', 'filectime', 'filegroup', 'fileinode',
    'filemtime', 'fileowner', 'fileperms', 'filetype', 'is_executable', 'is_link',
    'is_uploaded_file', 'lchgrp', 'lchown', 'link', 'linkinfo', 'lstat', 'move_uploaded_file',
    'readlink', 'realpath_cache_get', 'realpath_cache_size', 'rmdir', 'stat', 'symlink',
    'tempnam', 'touch', 'umask']) {
    const marker = metadataSymbol === 'stat' ? '    stat($path);'
      : metadataSymbol === 'link' ? '    link($path,' : `    ${metadataSymbol}(`;
    const metadataOffset = builtinConsumer.getText().indexOf(marker) + marker.indexOf(`${metadataSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(metadataOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${metadataSymbol} to the builtin document`);
  }
  for (const [call, expected] of [['stat($path)', 'array|false'], ['realpath_cache_get()', 'key: int'],
    ['disk_free_space($path)', 'float|false'], ['readlink($path)', 'string|false'],
    ["tempnam($path, 'php')", 'string|false']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const streamSymbol of ['feof', 'fflush', 'fgetc', 'fgetcsv', 'fgets', 'file', 'flock',
    'fnmatch', 'fpassthru', 'fputcsv', 'fscanf', 'fseek', 'fstat', 'fsync', 'fdatasync', 'ftell',
    'ftruncate', 'parse_ini_file', 'parse_ini_string', 'pclose', 'popen', 'readfile', 'rewind',
    'set_file_buffer', 'tmpfile']) {
    const marker = streamSymbol === 'popen' ? '$process = popen(' : `    ${streamSymbol}(`;
    const streamOffset = builtinConsumer.getText().indexOf(marker) + marker.indexOf(`${streamSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(streamOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${streamSymbol} to the builtin document`);
  }
  for (const streamConstant of ['FILE_IGNORE_NEW_LINES', 'FILE_SKIP_EMPTY_LINES', 'LOCK_SH', 'LOCK_NB',
    'SEEK_SET', 'INI_SCANNER_TYPED', 'INI_SCANNER_RAW']) {
    const constantOffset = builtinConsumer.getText().indexOf(streamConstant);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(constantOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${streamConstant} to the builtin document`);
  }
  for (const [call, expected] of [['fgetcsv($stream)', 'list<string|null>|false'],
    ["fputcsv($stream, ['first', 'second'])", '$eol'], ["file('/tmp/data', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)", 'list<string>|false'],
    ['fstat($stream)', '0: int'], ["popen('php -v', 'r')", 'resource|false'],
    ['tmpfile()', 'resource|false']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.some((item) => item.label.includes(expected));
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const encodingSymbol of ['serialize', 'unserialize', 'base64_encode', 'base64_decode', 'parse_url', 'http_build_query']) {
    const encodingOffset = builtinConsumer.getText().indexOf(`${encodingSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(encodingOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${encodingSymbol} to the builtin document`);
  }
  const queryEncodingOffset = builtinConsumer.getText().indexOf('PHP_QUERY_RFC3986');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(queryEncodingOffset + 2),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate PHP_QUERY_RFC3986 to the builtin document');
  for (const pdoSymbol of ['\\PDO $pdo', '\\PDOStatement $statement', 'prepare(', 'bindValue(', 'fetchObject()', 'queryString', 'PDO::connect(']) {
    const pdoOffset = builtinConsumer.getText().indexOf(pdoSymbol) + (pdoSymbol.startsWith('\\') ? 1 : pdoSymbol.startsWith('PDO::') ? 'PDO::'.length : 2);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(pdoOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${pdoSymbol} to the builtin document`);
  }
  const pdoParameterOffset = builtinConsumer.getText().indexOf('PDO::PARAM_BOOL') + 'PDO::'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(pdoParameterOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate PDO::PARAM_BOOL to the builtin document');
  for (const reflectionSymbol of ['\\ReflectionClass', 'getMethod(', 'getParameters()', 'getType()', '\\ReflectionProperty', 'createFromMethodName(', 'newLazyGhost(', 'getMangledName()', '\\ReflectionClassConstant', '\\ReflectionEnum', 'getCases()']) {
    const reflectionOffset = builtinConsumer.getText().indexOf(reflectionSymbol) + (reflectionSymbol.startsWith('\\') ? 1 : 2);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(reflectionOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${reflectionSymbol} to the builtin document`);
  }
  const reflectedInstanceFormatOffset = builtinConsumer.getText().indexOf('$instance->format(') + '$instance->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(reflectedInstanceFormatOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not preserve the reflected DateTimeImmutable instance type');
  for (const [call, expected] of [['getMethod(', 'string $name'], ['createFromMethodName(', 'string $method'], ['newLazyGhost(', 'callable $initializer']]) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.some((item) => item.label.includes(expected));
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const mbstringSymbol of ['mb_str_split', 'mb_trim', 'mb_strlen', 'mb_ereg_search_pos']) {
    const mbstringOffset = builtinConsumer.getText().indexOf(mbstringSymbol);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(mbstringOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${mbstringSymbol} to the builtin document`);
  }
  for (const [call, expected] of [['mb_str_split(', 'string $string'], ['mb_trim(', 'string $string'], ['mb_strlen(', 'string $string'], ['mb_ereg_search_pos(', '?string $pattern']]) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.some((item) => item.label.includes(expected));
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const xmlSymbol of ['simplexml_load_string', 'libxml_get_errors', 'libxml_set_external_entity_loader', 'getName()', 'message', 'LIBXML_RECOVER',
    'xml_parser_create', 'xml_parser_set_option', 'xml_set_element_handler', 'xml_parse_into_struct', 'xml_parser_get_option',
    'xml_error_string', 'xml_get_error_code', 'xml_parser_free', 'XML_OPTION_PARSE_HUGE', 'XML_OPTION_CASE_FOLDING']) {
    const xmlOffset = builtinConsumer.getText().indexOf(xmlSymbol, builtinConsumer.getText().indexOf('function inspectSimpleXml'));
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(xmlOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${xmlSymbol} to the builtin document`);
  }
  for (const [call, expected] of [['simplexml_load_string(', 'string $data'], ['libxml_set_external_entity_loader(', 'true'],
    ['xml_parser_create(', '?string $encoding'], ['xml_parser_set_option(', 'string|int|bool $value'],
    ['xml_set_element_handler(', 'callable|string|null $start_handler'], ['xml_parse_into_struct(', 'int|false'],
    ['xml_parser_get_option(', 'string|int|bool']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, builtinConsumer.getText().indexOf('function inspectSimpleXml')) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.some((item) => item.label.includes(expected));
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const xmlIoSymbol of ['XMLReader::fromString', 'read()', 'localName', 'getAttribute(', 'close()', 'XMLWriter::toMemory',
    'startDocument()', 'writeElement(', 'outputMemory()', 'xmlwriter_open_memory', 'xmlwriter_set_indent',
    'xmlwriter_write_element', 'xmlwriter_output_memory', 'XMLReader::ELEMENT']) {
    const xmlIoOffset = builtinConsumer.getText().indexOf(xmlIoSymbol, builtinConsumer.getText().indexOf('function roundTripXml'));
    const symbolOffset = xmlIoOffset + (xmlIoSymbol.includes('::') ? xmlIoSymbol.indexOf('::') + 4 : 2);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(symbolOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${xmlIoSymbol} to the builtin document`);
  }
  for (const [call, expected] of [['XMLReader::fromString(', 'string $source'], ['XMLWriter::toMemory(', 'static'],
    ['$reader->getAttribute(', 'string|null'], ['$writer->writeElement(', 'bool'], ['xmlwriter_write_element(', 'bool'],
    ['xmlwriter_output_memory(', 'string']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, builtinConsumer.getText().indexOf('function roundTripXml')) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.some((item) => item.label.includes(expected));
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const domSymbol of ['DOMDocument', 'loadXML(', 'documentElement', 'createElement(', 'setAttribute(', 'appendChild(',
    'getElementsByTagName(', 'item(', 'DOMXPath', 'query(', 'dom_import_simplexml', 'getRootNode(', 'getAttributeNames(',
    'className', 'compareDocumentPosition(', 'DOMNode::DOCUMENT_POSITION_FOLLOWING', 'DOMXPath::quote']) {
    const domOffset = builtinConsumer.getText().indexOf(domSymbol, builtinConsumer.getText().indexOf('function inspectClassicDom'));
    const symbolOffset = domOffset + (domSymbol.includes('::') ? domSymbol.indexOf('::') + 4 : 2);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(symbolOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${domSymbol} to the classic DOM builtin document`);
  }
  for (const [call, expected] of [['new \\DOMDocument(', 'string $version'], ['$document->createElement(', 'DOMElement|false'],
    ['$xpath->query(', 'DOMNodeList|false'], ['dom_import_simplexml(', 'DOMAttr|DOMElement'],
    ['$expanded->getRootNode(', 'DOMNode'], ['\\DOMXPath::quote(', 'string']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, builtinConsumer.getText().indexOf('function inspectClassicDom')) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.some((item) => item.label.includes(expected));
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const modernDomSymbol of ['HTMLDocument::createFromString', 'documentElement', 'querySelector(', 'querySelectorAll(',
    'item(', 'classList', 'add(', 'Dom\\XPath', 'evaluate(', 'Dom\\import_simplexml', 'getElementsByClassName(',
    'insertAdjacentHTML(', 'AdjacentPosition::BeforeEnd', 'outerHTML', 'Node::DOCUMENT_POSITION_FOLLOWING']) {
    const modernDomOffset = builtinConsumer.getText().indexOf(modernDomSymbol, builtinConsumer.getText().indexOf('function inspectModernDom'));
    const symbolOffset = modernDomOffset + (modernDomSymbol.includes('::') ? modernDomSymbol.indexOf('::') + 4 : 2);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(symbolOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${modernDomSymbol} to the modern Dom builtin document`);
  }
  for (const [call, expected] of [['\\Dom\\HTMLDocument::createFromString(', 'HTMLDocument'], ['$root->querySelector(', '?Element'],
    ['$root->querySelectorAll(', 'NodeList'], ['$nodes->item(', '?Node'], ['$classes->add(', 'void'],
    ['$xpath->evaluate(', 'null|bool|float|string|NodeList'], ['\\Dom\\import_simplexml(', 'Attr|Element'],
    ['$root->getElementsByClassName(', 'HTMLCollection'], ['$root->insertAdjacentHTML(', 'AdjacentPosition $where']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, builtinConsumer.getText().indexOf('function inspectModernDom')) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.some((item) => item.label.includes(expected));
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  const pipeResultOffset = builtinConsumer.getText().indexOf('$result->pipeOutput()', builtinConsumer.getText().indexOf('function inspectPipe'))
    + '$result->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(pipeResultOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
      && builtinConsumer.getText(location.range).includes('pipeOutput'));
  }, 'Self-hosted language server did not propagate the PHP 8.5 pipe result to Definition');
  const invalidPipeOffset = builtinConsumer.getText().indexOf('$invalid->pipeOutput()', builtinConsumer.getText().indexOf('function inspectPipe'))
    + '$invalid->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(invalidPipeOffset),
    ) ?? [];
    return definitions.length === 0;
  }, 'Self-hosted language server inferred an incompatible PHP 8.5 pipe stage');
  const cloneResultOffset = builtinConsumer.getText().indexOf('$copy->cloneInput()', builtinConsumer.getText().indexOf('function inspectCloneWith'))
    + '$copy->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(cloneResultOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
      && builtinConsumer.getText(location.range).includes('cloneInput'));
  }, 'Self-hosted language server did not preserve the PHP 8.5 clone-with result for Definition');
  const unknownCloneOffset = builtinConsumer.getText().indexOf('$unknown->cloneInput()', builtinConsumer.getText().indexOf('function inspectCloneWith'))
    + '$unknown->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(unknownCloneOffset),
    ) ?? [];
    return definitions.length === 0;
  }, 'Self-hosted language server inferred a nullable PHP 8.5 clone-with operand');
  for (const securitySymbol of ['password_hash', 'password_verify', 'password_needs_rehash', 'password_get_info', 'hash_file', 'random_bytes', 'random_int']) {
    const securityOffset = builtinConsumer.getText().indexOf(`${securitySymbol}`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(securityOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${securitySymbol} to the builtin document`);
  }
  const hashOffset = builtinConsumer.getText().indexOf('return hash(') + 'return '.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(hashOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate hash to the builtin document');
  for (const securityConstant of ['PASSWORD_DEFAULT', 'PASSWORD_BCRYPT_DEFAULT_COST']) {
    const securityConstantOffset = builtinConsumer.getText().indexOf(securityConstant);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(securityConstantOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${securityConstant} to the builtin document`);
  }
  const hashOptionsOffset = builtinConsumer.getText().indexOf("$payload, false, []") + "$payload, false, []".length;
  await waitForAsync(async () => {
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(hashOptionsOffset), ',',
    );
    return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes('array $options = []');
  }, 'Self-hosted language server did not expose the PHP 8.1+ hash options parameter');
  for (const filterSymbol of ['filter_var(', 'filter_input(', 'filter_var_array(']) {
    const filterOffset = builtinConsumer.getText().indexOf(filterSymbol) + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(filterOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${filterSymbol} to the builtin document`);
  }
  for (const filterConstant of ['FILTER_VALIDATE_INT', 'FILTER_VALIDATE_EMAIL', 'INPUT_GET', 'FILTER_FLAG_GLOBAL_RANGE', 'FILTER_THROW_ON_FAILURE']) {
    const filterConstantOffset = builtinConsumer.getText().indexOf(filterConstant) + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(filterConstantOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${filterConstant} to the builtin document`);
  }
  for (const pcreSymbol of ['preg_match', 'preg_match_all', 'preg_filter', 'preg_grep', 'preg_replace', 'preg_replace_callback', 'preg_replace_callback_array', 'preg_split', 'preg_quote', 'preg_last_error', 'preg_last_error_msg']) {
    const pcreOffset = builtinConsumer.getText().indexOf(`${pcreSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(pcreOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${pcreSymbol} to the builtin document`);
  }
  for (const pcreConstant of ['PREG_UNMATCHED_AS_NULL', 'PREG_GREP_INVERT', 'PREG_SPLIT_NO_EMPTY']) {
    const pcreConstantOffset = builtinConsumer.getText().indexOf(pcreConstant) + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(pcreConstantOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${pcreConstant} to the builtin document`);
  }
  const pcreReplaceCall = "preg_replace('/x/', 'y', $subject)";
  const pcreReplaceSignatureOffset = builtinConsumer.getText().indexOf(pcreReplaceCall) + pcreReplaceCall.length - 1;
  let pcreReplaceSignature: vscode.SignatureHelp | undefined;
  await waitForAsync(async () => {
    pcreReplaceSignature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(pcreReplaceSignatureOffset), ',',
    );
    return Boolean(pcreReplaceSignature?.signatures.length);
  }, 'Self-hosted language server did not return preg_replace Signature Help');
  const pcreReplaceLabels = pcreReplaceSignature!.signatures.map((signature) => signature.label);
  assert.strictEqual(pcreReplaceLabels.length, 1, `preg_replace overload remained ambiguous: ${JSON.stringify(pcreReplaceLabels)}`);
  assert.ok(pcreReplaceLabels[0]!.includes('string $subject') && pcreReplaceLabels[0]!.endsWith(': string|null'),
    `preg_replace did not select the string-subject return: ${JSON.stringify(pcreReplaceLabels)}`);
  for (const mathSymbol of ['abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'base_convert', 'bindec',
    'ceil', 'cos', 'cosh', 'decbin', 'dechex', 'decoct', 'deg2rad', 'exp', 'expm1', 'fdiv', 'floor', 'fmod', 'fpow',
    'hexdec', 'hypot', 'intdiv', 'is_finite', 'is_infinite', 'is_nan', 'log', 'log10', 'log1p', 'max', 'min',
    'octdec', 'pi', 'pow', 'rad2deg', 'round', 'sin', 'sinh', 'sqrt', 'tan', 'tanh']) {
    const mathOffset = builtinConsumer.getText().indexOf(`${mathSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(mathOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${mathSymbol} to the builtin document`);
  }
  for (const mathConstant of ['M_PI', 'INF', 'NAN', 'PHP_ROUND_HALF_ODD']) {
    const mathConstantOffset = builtinConsumer.getText().indexOf(mathConstant) + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(mathConstantOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${mathConstant} to the builtin document`);
  }
  for (const roundingSymbol of ['RoundingMode', 'HalfEven']) {
    const roundingOffset = builtinConsumer.getText().indexOf(roundingSymbol) + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(roundingOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${roundingSymbol} to the builtin document`);
  }
  const absCall = 'abs(4)';
  const absSignatureOffset = builtinConsumer.getText().indexOf(absCall) + absCall.length - 1;
  let absSignature: vscode.SignatureHelp | undefined;
  await waitForAsync(async () => {
    absSignature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(absSignatureOffset), ',',
    );
    return Boolean(absSignature?.signatures.length);
  }, 'Self-hosted language server did not return abs Signature Help');
  const absLabels = absSignature!.signatures.map((signature) => signature.label);
  assert.strictEqual(absLabels.length, 1, `abs overload remained ambiguous: ${JSON.stringify(absLabels)}`);
  assert.ok(absLabels[0]!.includes('int $num') && absLabels[0]!.endsWith(': int'),
    `abs did not select the integer return: ${JSON.stringify(absLabels)}`);
  for (const variableSymbol of ['boolval', 'debug_zval_dump', 'doubleval', 'floatval', 'get_debug_type', 'get_defined_vars',
    'get_resource_id', 'get_resource_type', 'gettype', 'intval', 'print_r', 'settype', 'strval', 'var_dump', 'var_export']) {
    const variableOffset = builtinConsumer.getText().indexOf(`${variableSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(variableOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${variableSymbol} to the builtin document`);
  }
  const printRCall = 'print_r($value, true)';
  const printRSignatureOffset = builtinConsumer.getText().indexOf(printRCall) + printRCall.length - 1;
  await waitForAsync(async () => {
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(printRSignatureOffset), ',',
    );
    return signature?.signatures.length === 1
      && signature.signatures[0]?.label.includes('($return is true ? string : true)');
  }, 'Self-hosted language server did not expose the print_r conditional return');
  for (const introspectionSymbol of ['define', 'defined', 'constant', 'function_exists', 'get_defined_functions',
    'get_defined_constants', 'get_loaded_extensions', 'extension_loaded', 'get_extension_funcs']) {
    const introspectionOffset = builtinConsumer.getText().indexOf(`${introspectionSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(introspectionOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${introspectionSymbol} to the builtin document`);
  }
  const categorizedConstantsCall = 'get_defined_constants(true)';
  const categorizedConstantsOffset = builtinConsumer.getText().indexOf(categorizedConstantsCall) + categorizedConstantsCall.length - 1;
  await waitForAsync(async () => {
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(categorizedConstantsOffset), ',',
    );
    return signature?.signatures.length === 1
      && signature.signatures[0]?.label.includes('array<string, array<string, mixed>>');
  }, 'Self-hosted language server did not expose the categorized constants conditional return');
  for (const configurationSymbol of ['get_cfg_var', 'ini_get', 'ini_get_all', 'ini_set', 'ini_alter', 'ini_restore',
    'get_include_path', 'set_include_path', 'phpversion', 'php_sapi_name', 'php_uname', 'php_ini_scanned_files',
    'php_ini_loaded_file', 'memory_get_usage', 'memory_get_peak_usage', 'memory_reset_peak_usage', 'ini_parse_quantity']) {
    const configurationOffset = builtinConsumer.getText().indexOf(`${configurationSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(configurationOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${configurationSymbol} to the builtin document`);
  }
  for (const configurationConstant of ['PHP_INI_USER', 'PHP_INI_PERDIR', 'PHP_INI_SYSTEM', 'PHP_INI_ALL']) {
    const configurationConstantOffset = builtinConsumer.getText().indexOf(configurationConstant);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(configurationConstantOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${configurationConstant} to the builtin document`);
  }
  for (const environmentSymbol of ['assert', 'assert_options', 'cli_get_process_title', 'cli_set_process_title', 'dl', 'gc_collect_cycles',
    'gc_disable', 'gc_enable', 'gc_enabled', 'gc_mem_caches', 'gc_status', 'get_current_user', 'get_included_files',
    'get_required_files', 'get_resources', 'getenv', 'getlastmod', 'getmygid', 'getmyinode', 'getmypid', 'getmyuid',
    'getopt', 'getrusage', 'phpcredits', 'phpinfo', 'putenv', 'set_time_limit', 'sys_get_temp_dir', 'version_compare',
    'zend_version']) {
    const environmentOffset = builtinConsumer.getText().indexOf(`${environmentSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(environmentOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${environmentSymbol} to the builtin document`);
  }
  for (const environmentConstant of ['INFO_GENERAL', 'INFO_CREDITS', 'INFO_CONFIGURATION', 'INFO_MODULES',
    'INFO_ENVIRONMENT', 'INFO_VARIABLES', 'INFO_LICENSE', 'INFO_ALL', 'CREDITS_GROUP', 'CREDITS_GENERAL',
    'CREDITS_SAPI', 'CREDITS_MODULES', 'CREDITS_DOCS', 'CREDITS_FULLPAGE', 'CREDITS_QA', 'CREDITS_ALL',
    'ASSERT_ACTIVE', 'ASSERT_CALLBACK', 'ASSERT_BAIL', 'ASSERT_WARNING', 'ASSERT_EXCEPTION']) {
    const environmentConstantOffset = builtinConsumer.getText().indexOf(environmentConstant);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(environmentConstantOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${environmentConstant} to the builtin document`);
  }
  for (const [call, expected] of [['getenv()', 'array<string, string>'],
    ["getenv('PATH')", 'string|false'], ["version_compare(PHP_VERSION, '8.5')", '-1|0|1'],
    ["version_compare(PHP_VERSION, '8.5', '>=')", 'bool']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const errorSymbol of ['debug_backtrace', 'debug_print_backtrace', 'error_clear_last', 'error_get_last',
    'error_log', 'error_reporting', 'get_error_handler', 'get_exception_handler', 'restore_error_handler',
    'restore_exception_handler', 'set_error_handler', 'set_exception_handler', 'trigger_error', 'user_error']) {
    const errorOffset = builtinConsumer.getText().indexOf(`${errorSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(errorOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${errorSymbol} to the builtin document`);
  }
  for (const errorConstant of ['DEBUG_BACKTRACE_IGNORE_ARGS', 'DEBUG_BACKTRACE_PROVIDE_OBJECT', 'E_ALL', 'E_ERROR',
    'E_WARNING', 'E_PARSE', 'E_NOTICE', 'E_CORE_ERROR', 'E_CORE_WARNING', 'E_COMPILE_ERROR', 'E_COMPILE_WARNING',
    'E_USER_ERROR', 'E_USER_NOTICE', 'E_USER_WARNING', 'E_STRICT', 'E_RECOVERABLE_ERROR', 'E_DEPRECATED',
    'E_USER_DEPRECATED']) {
    const errorConstantOffset = builtinConsumer.getText().indexOf(errorConstant);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(errorConstantOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${errorConstant} to the builtin document`);
  }
  for (const [call, expected] of [['debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS)', 'list<array{function: string'],
    ['error_get_last()', 'array{type: int, message: string, file: string, line: int}|null'],
    ['restore_error_handler()', 'true'], ["trigger_error('php-companion fixture', E_USER_NOTICE)", 'true'],
    ['get_error_handler()', '?callable']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const outputSymbol of ['flush', 'ob_clean', 'ob_end_clean', 'ob_end_flush', 'ob_flush', 'ob_get_clean',
    'ob_get_contents', 'ob_get_flush', 'ob_get_length', 'ob_get_level', 'ob_get_status', 'ob_implicit_flush',
    'ob_list_handlers', 'ob_start', 'output_add_rewrite_var', 'output_reset_rewrite_vars']) {
    const outputOffset = builtinConsumer.getText().indexOf(`${outputSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(outputOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${outputSymbol} to the builtin document`);
  }
  for (const outputConstant of ['PHP_OUTPUT_HANDLER_START', 'PHP_OUTPUT_HANDLER_WRITE', 'PHP_OUTPUT_HANDLER_FLUSH',
    'PHP_OUTPUT_HANDLER_CLEAN', 'PHP_OUTPUT_HANDLER_FINAL', 'PHP_OUTPUT_HANDLER_CONT', 'PHP_OUTPUT_HANDLER_END',
    'PHP_OUTPUT_HANDLER_CLEANABLE', 'PHP_OUTPUT_HANDLER_FLUSHABLE', 'PHP_OUTPUT_HANDLER_REMOVABLE',
    'PHP_OUTPUT_HANDLER_STDFLAGS', 'PHP_OUTPUT_HANDLER_STARTED', 'PHP_OUTPUT_HANDLER_DISABLED',
    'PHP_OUTPUT_HANDLER_PROCESSED']) {
    const outputConstantOffset = builtinConsumer.getText().indexOf(outputConstant);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(outputConstantOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${outputConstant} to the builtin document`);
  }
  for (const [call, expected] of [['ob_get_status()', 'array{name?: string, type?: int'],
    ['ob_get_status(true)', 'list<array{name: string, type: int'], ['ob_get_contents()', 'string|false'],
    ['ob_list_handlers()', 'list<string>']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const functionHandlingSymbol of ['call_user_func', 'call_user_func_array', 'forward_static_call',
    'forward_static_call_array', 'func_get_arg', 'func_get_args', 'func_num_args', 'register_shutdown_function',
    'register_tick_function', 'unregister_tick_function']) {
    const functionHandlingOffset = builtinConsumer.getText().indexOf(`${functionHandlingSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(functionHandlingOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${functionHandlingSymbol} to the builtin document`);
  }
  for (const [call, expected] of [["call_user_func('strlen', 'value')", 'mixed'], ['func_get_args()', 'list<mixed>'],
    ["register_shutdown_function('strlen')", 'void']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const sessionSymbol of ['session_abort', 'session_cache_expire', 'session_cache_limiter', 'session_commit',
    'session_create_id', 'session_decode', 'session_destroy', 'session_encode', 'session_gc',
    'session_get_cookie_params', 'session_id', 'session_module_name', 'session_name', 'session_regenerate_id',
    'session_register_shutdown', 'session_reset', 'session_save_path', 'session_set_cookie_params',
    'session_set_save_handler', 'session_start', 'session_status', 'session_unset', 'session_write_close']) {
    const sessionOffset = builtinConsumer.getText().indexOf(`${sessionSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(sessionOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${sessionSymbol} to the builtin document`);
  }
  for (const sessionSymbol of ['SessionHandler', 'PHP_SESSION_DISABLED', 'PHP_SESSION_NONE', 'PHP_SESSION_ACTIVE']) {
    const sessionOffset = builtinConsumer.getText().indexOf(sessionSymbol);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(sessionOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${sessionSymbol} to the builtin document`);
  }
  for (const [call, expected] of [['session_get_cookie_params()', 'partitioned: bool'],
    ['session_status()', '0|1|2'], ['session_create_id()', 'string|false']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  const sessionHandlerMethodOffset = builtinConsumer.getText().indexOf('$handler->create_sid()') + '$handler->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(sessionHandlerMethodOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate SessionHandler::create_sid to the builtin document');
  for (const networkSymbol of ['checkdnsrr', 'closelog', 'dns_check_record', 'dns_get_mx', 'dns_get_record',
    'fsockopen', 'gethostbyaddr', 'gethostbynamel', 'gethostbyname', 'gethostname', 'getmxrr',
    'getprotobyname', 'getprotobynumber', 'getservbyname', 'getservbyport', 'header',
    'header_register_callback', 'header_remove', 'headers_list', 'headers_sent', 'http_clear_last_response_headers',
    'http_get_last_response_headers', 'http_response_code', 'inet_ntop', 'inet_pton', 'ip2long', 'long2ip',
    'net_get_interfaces', 'openlog', 'pfsockopen', 'request_parse_body', 'setcookie', 'setrawcookie',
    'socket_get_status', 'socket_set_blocking', 'socket_set_timeout', 'syslog']) {
    const networkOffset = builtinConsumer.getText().indexOf(`${networkSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(networkOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${networkSymbol} to the builtin document`);
  }
  for (const dnsConstant of ['DNS_A', 'DNS_NS', 'DNS_CNAME', 'DNS_SOA', 'DNS_PTR', 'DNS_HINFO', 'DNS_CAA',
    'DNS_MX', 'DNS_TXT', 'DNS_SRV', 'DNS_NAPTR', 'DNS_AAAA', 'DNS_A6', 'DNS_ANY', 'DNS_ALL']) {
    const dnsOffset = builtinConsumer.getText().lastIndexOf(`${dnsConstant};`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(dnsOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${dnsConstant} to the builtin document`);
  }
  for (const [call, expected] of [['headers_list()', 'list<string>'],
    ['http_get_last_response_headers()', 'list<string>|null'],
    ['request_parse_body()', 'array{0: array<string, mixed>, 1: array<string, mixed>}'],
    ["gethostbynamel('example.com')", 'list<string>|false'], ['long2ip(2130706433)', 'string'],
    ['closelog()', 'true']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - 1;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const marker of ['$value->arrayLabel();', '$mappedValue->arrayLabel();', '$foundItem?->arrayLabel();', '$firstItem?->arrayLabel();', '$popped?->arrayLabel();', '$removedItem->arrayLabel();', '$iteratorItem->arrayLabel();', '$reindexedIteratorItem->arrayLabel();']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker) + marker.indexOf('arrayLabel') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      );
      return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
        && builtinConsumer.getText(location.range).includes('arrayLabel'));
    }, `Self-hosted language server did not preserve the generic array element for ${marker}`);
  }
  const staleArrayMemberOffset = builtinConsumer.getText().indexOf('$staleItem->arrayLabel();') + '$staleItem->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(staleArrayMemberOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server retained a stale generic array element after array_splice mutation');
  const arrayIsListOffset = builtinConsumer.getText().indexOf('array_is_list($values)');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(arrayIsListOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate the PHP 8.1 array_is_list builtin');
  const iteratorToArrayOffset = builtinConsumer.getText().indexOf('iterator_to_array($items)');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(iteratorToArrayOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate iterator_to_array to the builtin document');
  for (const splSymbol of ['class_implements', 'class_parents', 'class_uses', 'iterator_apply', 'iterator_count',
    'iterator_to_array', 'spl_autoload', 'spl_autoload_call', 'spl_autoload_extensions', 'spl_autoload_functions',
    'spl_autoload_register', 'spl_autoload_unregister', 'spl_classes', 'spl_object_hash', 'spl_object_id']) {
    const marker = splSymbol === 'iterator_count' || splSymbol === 'iterator_to_array'
      ? `    ${splSymbol}(new \\ArrayIterator([]))` : `    ${splSymbol}(`;
    const splOffset = builtinConsumer.getText().indexOf(marker) + marker.indexOf(`${splSymbol}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(splOffset + 2),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${splSymbol} to the builtin document`);
  }
  for (const [call, expected] of [['class_implements(\\ArrayIterator::class)', 'array<class-string, class-string>|false'],
    ['iterator_apply(', '?array $args'],
    ['iterator_count(', 'Traversable|array $iterator'],
    ['spl_autoload_functions()', 'list<callable>'], ['spl_classes()', 'array<class-string, class-string>'],
    ['spl_object_hash(', 'string'], ['spl_object_id(', 'int']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call) + call.length - (call.endsWith('(') ? 0 : 1);
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for ${call}`);
  }
  for (const marker of ['SplFileInfo(__FILE__)', 'openFile(\'r\')', '$opened->rewind()', '$file->fgets()',
    '$file->fgetcsv()', '$file->getCsvControl()', '$file->fputcsv(', '$file->fwrite(', '$file->getFilename()',
    '$temp->rewind()']) {
    const nameStart = /^[A-Za-z]/.test(marker) ? 0 : marker.indexOf('->') + 2;
    const splFileOffset = builtinConsumer.getText().indexOf(marker) + nameStart + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(splFileOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${marker} to the builtin SPL file declaration`);
  }
  for (const [call, expected] of [['openFile(', 'openFile(string $mode = \'r\', bool $useIncludePath = false'],
    ['fgetcsv(', 'list<string|null>|false'], ['getCsvControl(', 'array{0: string, 1: string, 2: string}'],
    ['fputcsv(', 'string $eol = "\\n"'], ['fwrite(', '?int $length = null'], ['getFilename(', 'string']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, builtinConsumer.getText().indexOf('function exerciseSplFiles')) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for SPL file call ${call}`);
  }
  const splArrayCollectionsStart = builtinConsumer.getText().indexOf('function exerciseSplArrayCollections');
  for (const marker of ['$copyItem->arrayLabel()', '$createdItem->arrayLabel()', '$offset->arrayLabel()', '$current->arrayLabel()']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker, splArrayCollectionsStart) + marker.indexOf('arrayLabel') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
        && builtinConsumer.getText(location.range).includes('arrayLabel'));
    }, `Self-hosted language server did not preserve the collection generic for ${marker}`);
  }
  for (const marker of ['getArrayCopy', 'getIterator', 'offsetGet', 'current', 'append', 'offsetSet', 'uasort',
    'uksort', 'exchangeArray', 'seek', '__serialize']) {
    const methodOffset = builtinConsumer.getText().indexOf(`->${marker}`, splArrayCollectionsStart) + 4;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate SPL collection method ${marker}`);
  }
  for (const [call, expected] of [['getArrayCopy(', 'array<string, App\\Controller\\ArrayBuiltinItem>'],
    ['offsetGet(', 'App\\Controller\\ArrayBuiltinItem'], ['uasort(', 'true'], ['seek(', 'int $offset'],
    ['__serialize(', 'array']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, splArrayCollectionsStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for SPL collection call ${call}`);
  }
  const splObjectCollectionsStart = builtinConsumer.getText().indexOf('function exerciseSplObjectCollections');
  for (const marker of ['$stored->arrayLabel()', '$info?->arrayLabel()', '$fixedItem?->arrayLabel()', '$createdItem?->arrayLabel()']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker, splObjectCollectionsStart) + marker.indexOf('arrayLabel') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
        && builtinConsumer.getText(location.range).includes('arrayLabel'));
    }, `Self-hosted language server did not preserve the object collection generic for ${marker}`);
  }
  for (const marker of ['current', 'getInfo', 'offsetSet', 'seek', 'offsetGet', 'fromArray', 'getIterator',
    'jsonSerialize', '__serialize', 'setSize']) {
    const operator = marker === 'fromArray' ? '::' : '->';
    const methodOffset = builtinConsumer.getText().indexOf(`${operator}${marker}`, splObjectCollectionsStart) + operator.length + 1;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate SPL object collection method ${marker}`);
  }
  for (const [call, expected] of [['getInfo(', 'App\\Controller\\ArrayBuiltinItem|null'],
    ['offsetGet(', 'App\\Controller\\ArrayBuiltinItem|null'], ['fromArray(', 'SplFixedArray<TFrom>'],
    ['getIterator(', 'Iterator<int, App\\Controller\\ArrayBuiltinItem|null>'], ['jsonSerialize(', 'array<int, App\\Controller\\ArrayBuiltinItem|null>'],
    ['setSize(', 'true']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, splObjectCollectionsStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for SPL object collection call ${call}`);
  }
  const splLinearCollectionsStart = builtinConsumer.getText().indexOf('function exerciseSplLinearCollections');
  for (const marker of ['$current->arrayLabel()', '$offset->arrayLabel()', '$item->arrayLabel()',
    '$dequeued->arrayLabel()', '$queued->arrayLabel()', '$stacked->arrayLabel()']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker, splLinearCollectionsStart) + marker.indexOf('arrayLabel') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
        && builtinConsumer.getText(location.range).includes('arrayLabel'));
    }, `Self-hosted language server did not preserve the linear collection generic for ${marker}`);
  }
  for (const marker of ['current', 'offsetGet', 'dequeue', 'top', 'add', 'push', 'offsetSet', 'setIteratorMode',
    'enqueue', '__serialize']) {
    const methodOffset = builtinConsumer.getText().indexOf(`->${marker}`, splLinearCollectionsStart) + 3;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate SPL linear collection method ${marker}`);
  }
  const linearConstantOffset = builtinConsumer.getText().indexOf('IT_MODE_FIFO', splLinearCollectionsStart) + 3;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(linearConstantOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate the SPL iterator mode constant');
  for (const [call, expected] of [['current(', 'App\\Controller\\ArrayBuiltinItem'],
    ['dequeue(', 'App\\Controller\\ArrayBuiltinItem'], ['top(', 'App\\Controller\\ArrayBuiltinItem'],
    ['add(', 'int $index, App\\Controller\\ArrayBuiltinItem $value'], ['push(', 'void'], ['enqueue(', 'void'],
    ['__serialize(', 'array{0: int, 1: list<App\\Controller\\ArrayBuiltinItem>, 2: array}']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, splLinearCollectionsStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for SPL linear collection call ${call}`);
  }
  const splHeapsStart = builtinConsumer.getText().indexOf('function exerciseSplHeaps');
  for (const marker of ['$minimum->arrayLabel()', '$maximum->arrayLabel()', '$heapItem->arrayLabel()']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker, splHeapsStart) + marker.indexOf('arrayLabel') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
        && builtinConsumer.getText(location.range).includes('arrayLabel'));
    }, `Self-hosted language server did not preserve the SPL heap generic for ${marker}`);
  }
  for (const marker of ['extract', 'current', 'insert', 'recoverFromCorruption', 'setExtractFlags', 'top',
    '__debugInfo', '__serialize']) {
    const methodOffset = builtinConsumer.getText().indexOf(`->${marker}`, splHeapsStart) + 3;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate SPL heap method ${marker}`);
  }
  const heapConstantOffset = builtinConsumer.getText().indexOf('EXTR_BOTH', splHeapsStart) + 3;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(heapConstantOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate the SPL priority extract constant');
  const priorityResult = 'App\\Controller\\ArrayBuiltinItem|App\\Controller\\PriorityBuiltinItem|array{data: App\\Controller\\ArrayBuiltinItem, priority: App\\Controller\\PriorityBuiltinItem}';
  for (const [call, expected] of [['$min->insert(', 'App\\Controller\\ArrayBuiltinItem $value'],
    ['$priority->insert(', 'App\\Controller\\ArrayBuiltinItem $value, App\\Controller\\PriorityBuiltinItem $priority'],
    ['$priority->current(', priorityResult], ['$priority->top(', priorityResult], ['$priority->extract(', priorityResult],
    ['$priority->__serialize(', 'heap_elements: list<array{data: App\\Controller\\ArrayBuiltinItem, priority: App\\Controller\\PriorityBuiltinItem}>']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, splHeapsStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for SPL heap call ${call}`);
  }
  const splObserverStart = builtinConsumer.getText().indexOf('function exerciseSplObserver');
  for (const marker of ['attach', 'detach', 'notify', 'update']) {
    const methodOffset = builtinConsumer.getText().indexOf(`->${marker}`, splObserverStart) + 3;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate SPL observer method ${marker}`);
  }
  for (const [call, expected] of [['$subject->attach(', 'SplObserver $observer'],
    ['$subject->notify(', 'void'], ['$observer->update(', 'SplSubject $subject']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, splObserverStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for SPL observer call ${call}`);
  }
  const multipleIteratorStart = builtinConsumer.getText().indexOf('function exerciseMultipleIterator');
  for (const marker of ['$item->arrayLabel()', '$iterated->arrayLabel()']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker, multipleIteratorStart) + marker.indexOf('arrayLabel') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
        && builtinConsumer.getText(location.range).includes('arrayLabel'));
    }, `Self-hosted language server did not preserve the MultipleIterator generic for ${marker}`);
  }
  for (const marker of ['attachIterator', 'setFlags', 'current', 'key', 'containsIterator', 'countIterators', '__debugInfo']) {
    const methodOffset = builtinConsumer.getText().indexOf(`->${marker}`, multipleIteratorStart) + 3;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate MultipleIterator method ${marker}`);
  }
  const multipleIteratorConstantOffset = builtinConsumer.getText().indexOf('MIT_KEYS_ASSOC', multipleIteratorStart) + 3;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(multipleIteratorConstantOffset),
    ) ?? [];
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate the MultipleIterator flags constant');
  for (const [call, expected] of [['$multiple->attachIterator(', 'Iterator<string, App\\Controller\\ArrayBuiltinItem> $iterator, int|string|null $info'],
    ['$multiple->current(', 'array<array-key, App\\Controller\\ArrayBuiltinItem|null>'],
    ['$multiple->key(', 'array<array-key, string|null>'],
    ['$multiple->__debugInfo(', 'obj: Iterator<string, App\\Controller\\ArrayBuiltinItem>']] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, multipleIteratorStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for MultipleIterator call ${call}`);
  }
  const iteratorAdaptersStart = builtinConsumer.getText().indexOf('function exerciseIteratorAdapters');
  for (const marker of ['$wrappedItem->arrayLabel()', '$limitedItem->arrayLabel()', '$filteredItem->arrayLabel()',
    '$appendedItem->arrayLabel()', '$nestedItem->arrayLabel()', '$parentItem->arrayLabel()', '$recursiveItem->arrayLabel()']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker, iteratorAdaptersStart) + marker.indexOf('arrayLabel') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
        && builtinConsumer.getText(location.range).includes('arrayLabel'));
    }, `Self-hosted language server did not preserve the SPL iterator adapter generic for ${marker}`);
  }
  for (const marker of ['current', 'getArrayIterator', 'getChildren', 'seek', 'getPosition', 'getIteratorIndex', 'valid']) {
    const methodOffset = builtinConsumer.getText().indexOf(`->${marker}`, iteratorAdaptersStart) + 3;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate SPL iterator adapter method ${marker}`);
  }
  for (const [call, expected] of [
    ['$wrapped->current(', 'App\\Controller\\ArrayBuiltinItem'],
    ['$appended->getArrayIterator(', 'ArrayIterator<int, Iterator<string, App\\Controller\\ArrayBuiltinItem>>'],
    ['$limited->seek(', 'int $offset'], ['$limited->getPosition(', 'int'],
    ['$appended->getIteratorIndex(', 'int|null'], ['$empty->current(', 'never'], ['$empty->valid(', 'false'],
  ] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, iteratorAdaptersStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for SPL iterator adapter call ${call}`);
  }
  const advancedIteratorsStart = builtinConsumer.getText().indexOf('function exerciseAdvancedIterators');
  for (const marker of ['$recursiveItem->arrayLabel()', '$subItem->arrayLabel()', '$cachedItem->arrayLabel()',
    '$cachedLookup->arrayLabel()', '$cacheItem->arrayLabel()', '$childItem->arrayLabel()']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker, advancedIteratorsStart) + marker.indexOf('arrayLabel') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
        && builtinConsumer.getText(location.range).includes('arrayLabel'));
    }, `Self-hosted language server did not preserve the advanced SPL iterator generic for ${marker}`);
  }
  for (const marker of ['getSubIterator', 'offsetGet', 'getCache', 'getChildren', 'getRegex', 'setMode', 'getPrefix', 'setPostfix']) {
    const methodOffset = builtinConsumer.getText().indexOf(`->${marker}`, advancedIteratorsStart) + 3;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate advanced SPL iterator method ${marker}`);
  }
  for (const [call, expected] of [
    ['$recursive->current(', 'App\\Controller\\ArrayBuiltinItem'],
    ['$recursive->getSubIterator(', 'RecursiveIterator<string, App\\Controller\\ArrayBuiltinItem>|null'],
    ['$cached->offsetGet(', 'App\\Controller\\ArrayBuiltinItem|null'],
    ['$cached->getCache(', 'array<string, App\\Controller\\ArrayBuiltinItem>'],
    ['$regex->current(', 'array<int|string, mixed>|App\\Controller\\ArrayBuiltinItem|string'],
    ['$regexChild->current(', 'array<int|string, mixed>|App\\Controller\\ArrayBuiltinItem|string'],
    ['$tree->current(', 'App\\Controller\\ArrayBuiltinItem|string'],
  ] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, advancedIteratorsStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for advanced SPL iterator call ${call}`);
  }
  const directoryIteratorsStart = builtinConsumer.getText().indexOf('function exerciseDirectoryIterators');
  for (const marker of ['$entry->getPathname()', '$iterated->isDir()', '$child->getSubPathname()']) {
    const memberOffset = builtinConsumer.getText().indexOf(marker, directoryIteratorsStart) + marker.indexOf('->') + 3;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(memberOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not preserve the directory iterator identity for ${marker}`);
  }
  for (const marker of ['current', 'seek', 'key', 'setFlags', 'hasChildren', 'getChildren', 'getSubPathname', 'count']) {
    const methodOffset = builtinConsumer.getText().indexOf(`->${marker}`, directoryIteratorsStart) + 3;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(methodOffset),
      ) ?? [];
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate SPL directory iterator method ${marker}`);
  }
  for (const [call, expected] of [
    ['$directory->current(', 'static'], ['$directory->seek(', 'int $offset'],
    ['$filesystem->current(', 'string|SplFileInfo|FilesystemIterator'], ['$filesystem->key(', 'string'],
    ['$recursive->current(', 'string|SplFileInfo|FilesystemIterator'], ['$recursive->getChildren(', 'static'],
    ['$glob->count(', 'int'],
  ] as const) {
    const signatureOffset = builtinConsumer.getText().indexOf(call, directoryIteratorsStart) + call.length;
    await waitForAsync(async () => {
      const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
        'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(signatureOffset), ',',
      );
      return signature?.signatures.length === 1 && signature.signatures[0]?.label.includes(expected);
    }, `Self-hosted language server did not expose ${expected} for SPL directory iterator call ${call}`);
  }
  for (const functionName of ['get_class', 'get_class_methods', 'class_exists', 'is_a', 'method_exists', 'property_exists']) {
    const functionOffset = builtinConsumer.getText().indexOf(`${functionName}(`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(functionOffset + 2),
      );
      return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
    }, `Self-hosted language server did not navigate ${functionName} to the builtin document`);
  }
  const isStringOffset = typePredicateConsumer.getText().indexOf('is_string($value)');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', typePredicateConsumerUri, typePredicateConsumer.positionAt(isStringOffset + 2),
    );
    return definitions.some((location) => location.uri.scheme === 'php-companion-builtin');
  }, 'Self-hosted language server did not navigate is_string to the builtin document');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicateConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const finalValueOffset = typePredicateConsumer.getText().lastIndexOf('$value');
    return mismatches.length === 1 && typePredicateConsumer.offsetAt(mismatches[0]!.range.start) === finalValueOffset;
  }, 'Self-hosted language server did not restrict the scalar mismatch to the non-narrowed branch');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicateComplementConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expectedOffsets = [...typePredicateComplementConsumer.getText().matchAll(/\$value/g)]
      .map((match) => match.index!).filter((offset) => {
        const prefix = typePredicateComplementConsumer.getText().slice(Math.max(0, offset - 32), offset);
        return /acceptPredicate(?:String|Int)\($/.test(prefix);
      });
    const expectedLocalOffsets = [...typePredicateComplementConsumer.getText().matchAll(/\$(?:local|fromMixed)/g)]
      .map((match) => match.index!).filter((offset) => {
        const prefix = typePredicateComplementConsumer.getText().slice(Math.max(0, offset - 32), offset);
        return /acceptPredicate(?:String|Int)\($/.test(prefix);
      });
    const flowTextMismatch = typePredicateComplementConsumer.getText().lastIndexOf('acceptFlowString($flowText)') + 'acceptFlowString('.length;
    const expectedFlowOffsets = [flowTextMismatch, ...[...typePredicateComplementConsumer.getText().matchAll(/\$(?:flowObject|flowLocal)/g)]
      .map((match) => match.index!).filter((offset) => {
        const prefix = typePredicateComplementConsumer.getText().slice(Math.max(0, offset - 24), offset);
        return /acceptFlow(?:A|B|String|Int)\($/.test(prefix);
      })];
    const allExpectedOffsets = [...expectedOffsets, ...expectedLocalOffsets, ...expectedFlowOffsets].sort((left, right) => left - right);
    return mismatches.length === 17 && allExpectedOffsets.length === 17
      && mismatches.every((diagnostic, index) => typePredicateComplementConsumer.offsetAt(diagnostic.range.start) === allExpectedOffsets[index]);
  }, 'Self-hosted language server did not publish the seventeen exact flow-narrowing diagnostics');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expectedOffsets = [...typePredicatePropertyConsumer.getText().matchAll(/\$box->(?:(?:inner->)?value|unknown)/g)]
      .map((match) => match.index!).filter((offset) => {
        const prefix = typePredicatePropertyConsumer.getText().slice(Math.max(0, offset - 40), offset);
        const lineEnd = typePredicatePropertyConsumer.getText().indexOf('\n', offset);
        const line = typePredicatePropertyConsumer.getText().slice(offset, lineEnd < 0 ? undefined : lineEnd);
        return /acceptProperty(?:String|Int)\($/.test(prefix)
          && !line.includes('valid narrowed property read') && !line.includes('unknown negative mixed complement');
      });
    return expectedOffsets.length === 8 && expectedOffsets.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the eight exact property-predicate diagnostics');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const objectFlowStart = typePredicatePropertyConsumer.getText().indexOf('function isAObjectFlow');
    const objectOffsets = [...typePredicatePropertyConsumer.getText().matchAll(/\$box->(?:object|nullable)/g)]
      .map((match) => match.index!).filter((offset) => {
        if (offset >= objectFlowStart) return false;
        const prefix = typePredicatePropertyConsumer.getText().slice(Math.max(0, offset - 40), offset);
        return /acceptPropertyFlow(?:A|B)\($/.test(prefix);
      });
    return objectOffsets.length === 4
      && objectOffsets.every((offset) => mismatches.some((diagnostic) => typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the four exact non-null and instanceof property diagnostics');
  for (const member of ['onlyA', 'onlyB']) {
    const offset = typePredicatePropertyConsumer.getText().indexOf(`->${member}();`) + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes(member));
    }, `Self-hosted language server did not navigate the ${member} property-flow member`);
  }
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const issetOffsets = [...typePredicatePropertyConsumer.getText().matchAll(/\$box->optional/g)]
      .map((match) => match.index!).filter((offset) => {
        if (offset >= typePredicatePropertyConsumer.getText().indexOf('function arrayIssetFlow')) return false;
        const prefix = typePredicatePropertyConsumer.getText().slice(Math.max(0, offset - 40), offset);
        return /acceptProperty(?:String|Int)\($/.test(prefix);
      });
    return issetOffsets.length === 3
      && issetOffsets.every((offset) => mismatches.some((diagnostic) => typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the three exact isset property diagnostics');
  const issetMemberOffset = typePredicatePropertyConsumer.getText().indexOf('optionalObject->onlyA();') + 'optionalObject->'.length;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(issetMemberOffset),
    );
    return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
      && typePredicatePropertyConsumer.getText(location.range).includes('onlyA'));
  }, 'Self-hosted language server did not navigate the isset-narrowed property member');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const arrayOffset = typePredicatePropertyConsumer.getText().indexOf("acceptPropertyInt($data['label'])")
      + 'acceptPropertyInt('.length;
    const predicateOffset = typePredicatePropertyConsumer.getText().indexOf("acceptPropertyInt($data['value'])")
      + 'acceptPropertyInt('.length;
    const complementOffset = typePredicatePropertyConsumer.getText().indexOf("acceptPropertyString($data['value'])")
      + 'acceptPropertyString('.length;
    const objectOffsets = [...typePredicatePropertyConsumer.getText().matchAll(/\$data\['(?:object|nullable)'\]/g)]
      .map((match) => match.index!).filter((offset) => {
        const prefix = typePredicatePropertyConsumer.getText().slice(Math.max(0, offset - 40), offset);
        return /acceptPropertyFlow(?:A|B)\($/.test(prefix);
      });
    return objectOffsets.length === 3
      && [arrayOffset, predicateOffset, complementOffset, ...objectOffsets].every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the literal array-key flow diagnostics');
  const arrayIssetMemberOffset = typePredicatePropertyConsumer.getText().indexOf("$data['item']->onlyA();") + "$data['item']->".length;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(arrayIssetMemberOffset),
    );
    return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
      && typePredicatePropertyConsumer.getText(location.range).includes('onlyA'));
  }, 'Self-hosted language server did not navigate the isset-narrowed array element member');
  for (const expression of ["$data['object']->onlyA();", "$data['object']->onlyB();", "$data['nullable']->onlyA();"]) {
    const member = expression.includes('onlyB') ? 'onlyB' : 'onlyA';
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression) + expression.indexOf(member);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes(member));
    }, `Self-hosted language server did not navigate the ${member} array-element flow member`);
  }
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expected = [
      'acceptPropertyInt($text)', 'acceptPropertyInt($box->optional)',
      "acceptPropertyInt($data['label'])", 'acceptPropertyString($text)',
    ].map((expression) => typePredicatePropertyConsumer.getText().lastIndexOf(expression)
      + expression.indexOf('$'));
    return expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the four exact empty-flow diagnostics');
  for (const expression of ['$box->optionalObject->onlyA();', "$data['item']->onlyA();"]) {
    const offset = typePredicatePropertyConsumer.getText().lastIndexOf(expression) + expression.indexOf('onlyA');
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes('onlyA'));
    }, 'Self-hosted language server did not navigate the empty-false narrowed member');
  }
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expected = [
      'acceptPropertyInt($truthyText)', 'acceptPropertyInt($box->truthyValue)',
      "acceptPropertyInt($data['truthyLabel'])", 'acceptPropertyString($falsyText)',
    ].map((expression) => typePredicatePropertyConsumer.getText().indexOf(expression)
      + expression.indexOf('$'));
    return expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the four exact truthy-flow diagnostics');
  for (const expression of ['$box->truthyObject->onlyA();', "$data['truthyItem']->onlyA();"]) {
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression) + expression.indexOf('onlyA');
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes('onlyA'));
    }, 'Self-hosted language server did not navigate the truthy-narrowed member');
  }
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expected = [
      'acceptPropertyInt($looseText)', 'acceptPropertyInt($box->truthyValue)',
      "acceptPropertyInt($data['looseLabel'])", 'acceptPropertyString($looseUnknown)',
    ].map((expression) => typePredicatePropertyConsumer.getText().indexOf(expression)
      + expression.indexOf('$'));
    return expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the four exact loose-null diagnostics');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expected = [
      "acceptPropertyInt($data['meta']['label'])",
      "acceptPropertyInt($data['meta']['value'])",
      "acceptPropertyString($data['meta']['value'])",
      "acceptPropertyFlowB($data['meta']['object'])",
      "acceptPropertyFlowA($data['meta']['object'])",
      "acceptPropertyFlowB($data['meta']['nullable'])",
    ].map((expression) => typePredicatePropertyConsumer.getText().indexOf(expression)
      + expression.indexOf('$'));
    return expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the six exact nested-array-path diagnostics');
  for (const expression of [
    "$data['meta']['item']->onlyA();",
    "$data['meta']['object']->onlyA();",
    "$data['meta']['object']->onlyB();",
    "$data['meta']['nullable']->onlyA();",
  ]) {
    const member = expression.includes('onlyB') ? 'onlyB' : 'onlyA';
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression) + expression.indexOf(member);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes(member));
    }, `Self-hosted language server did not navigate the ${member} nested-array-path member`);
  }
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expected = [
      "acceptPropertyInt($data['presentLabel'])",
      "acceptPropertyString($data['presentNullable'])",
    ].map((expression) => typePredicatePropertyConsumer.getText().indexOf(expression)
      + expression.indexOf('$'));
    return expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not preserve the two exact array-key-existence diagnostics');
  for (const expression of [
    "$data['presentItem']->onlyA();",
    "$data['presentMeta']['nested']->onlyA();",
  ]) {
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression) + expression.indexOf('onlyA');
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes('onlyA'));
    }, 'Self-hosted language server did not navigate the array-key-existence narrowed member');
  }
  for (const expression of [
    "$data['presentExplicitItem']->onlyA();",
    "$data['presentItem']->onlyA();\n    }",
  ]) {
    const offset = expression.includes('Explicit')
      ? typePredicatePropertyConsumer.getText().indexOf(expression) + expression.indexOf('onlyA')
      : typePredicatePropertyConsumer.getText().lastIndexOf("$data['presentItem']->onlyA();") + "$data['presentItem']->".length;
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
    );
    assert.equal(definitions?.length ?? 0, 0, 'Array-key existence erased explicit null or survived a nested offset write');
  }
  const isAFlowStart = typePredicatePropertyConsumer.getText().indexOf('function isAObjectFlow');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expected = [
      'acceptPropertyFlowB($isADirect)', 'acceptPropertyFlowA($isADirect)',
      'acceptPropertyFlowB($isAGuard)', 'acceptPropertyFlowB($isAMixed)',
      'acceptPropertyFlowB($box->object)', 'acceptPropertyFlowA($box->object)',
      'acceptPropertyFlowB($isASubtype)', 'acceptPropertyFlowA($isASubtypeFalse)',
      'acceptPropertyFlowA($isAString)',
    ].map((expression) => typePredicatePropertyConsumer.getText().indexOf(expression, isAFlowStart)
      + expression.indexOf('$'));
    return expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the seven exact object-only is_a diagnostics');
  for (const expression of [
    '$isADirect->onlyA();', '$isADirect->onlyB();', '$isAMixed->onlyA();',
    '$box->object->onlyA();', '$box->object->onlyB();',
    '$isASubtype->onlyChild();', '$isASubtypeFalse->onlyB();',
  ]) {
    const member = expression.includes('onlyChild') ? 'onlyChild' : expression.includes('onlyB') ? 'onlyB' : 'onlyA';
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression, isAFlowStart) + expression.indexOf(member);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes(member));
    }, `Self-hosted language server did not navigate the ${member} object-only is_a member`);
  }
  for (const expression of ['$isASubtypes->sharedSubtype();', '$box->subtypes->sharedSubtype();', "$data['subtypes']->sharedSubtype();"]) {
    const isASharedSubtypeOffset = typePredicatePropertyConsumer.getText().indexOf(expression, isAFlowStart)
      + expression.indexOf('sharedSubtype');
    await waitForAsync(async () => {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', typePredicatePropertyConsumerUri,
        typePredicatePropertyConsumer.positionAt(isASharedSubtypeOffset + 'shared'.length), '>',
      );
      return completion.items.filter((item) => item.label === 'sharedSubtype').length === 1;
    }, `Self-hosted language server did not expose the common is_a subtype member for ${expression}`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri,
        typePredicatePropertyConsumer.positionAt(isASharedSubtypeOffset + 2),
      );
      return definitions.length === 2 && definitions.every((location) =>
        typePredicatePropertyConsumer.getText(location.range).includes('sharedSubtype'));
    }, `Self-hosted language server did not navigate both is_a subtype declarations for ${expression}`);
  }
  const isSubclassFlowStart = typePredicatePropertyConsumer.getText().indexOf('function isSubclassObjectFlow');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expected = [
      'acceptPropertyFlowB($subclassDirect)', 'acceptPropertyFlowA($subclassDirect)',
      'acceptPropertyFlowB($subclassWithBase)', 'acceptPropertyFlowB($subclassWithBase)',
      'acceptPropertyFlowB($box->subclassObject)', "acceptPropertyFlowB($data['subclassObject'])",
      'acceptPropertyFlowA($subclassDefault)',
    ].map((expression, index) => {
      const first = typePredicatePropertyConsumer.getText().indexOf(expression, isSubclassFlowStart);
      const start = index === 3 ? typePredicatePropertyConsumer.getText().indexOf(expression, first + expression.length) : first;
      return start + expression.indexOf('$');
    });
    return expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the seven exact object-only is_subclass_of diagnostics');
  for (const expression of [
    '$subclassDirect->onlyChild();', '$subclassDirect->onlyB();',
    '$subclassWithBase->onlyChild();', '$subclassWithBase->onlyA();',
    '$box->subclassObject->onlyChild();', "$data['subclassObject']->onlyChild();",
  ]) {
    const member = expression.includes('onlyB') ? 'onlyB' : expression.includes('onlyA') ? 'onlyA' : 'onlyChild';
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression, isSubclassFlowStart) + expression.indexOf(member);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes(member));
    }, `Self-hosted language server did not navigate the ${member} object-only is_subclass_of member`);
  }
  for (const expression of ['$subclassChildren->sharedSubtype();', '$box->subtypes->sharedSubtype();', "$data['subtypes']->sharedSubtype();"]) {
    const subclassSharedOffset = typePredicatePropertyConsumer.getText().indexOf(expression, isSubclassFlowStart)
      + expression.indexOf('sharedSubtype');
    await waitForAsync(async () => {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', typePredicatePropertyConsumerUri,
        typePredicatePropertyConsumer.positionAt(subclassSharedOffset + 'shared'.length), '>',
      );
      return completion.items.filter((item) => item.label === 'sharedSubtype').length === 1;
    }, `Self-hosted language server did not expose the common strict-subclass member for ${expression}`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri,
        typePredicatePropertyConsumer.positionAt(subclassSharedOffset + 2),
      );
      return definitions.length === 2 && definitions.every((location) =>
        typePredicatePropertyConsumer.getText(location.range).includes('sharedSubtype'));
    }, `Self-hosted language server did not navigate both strict-subclass declarations for ${expression}`);
  }
  const callableFlowStart = typePredicatePropertyConsumer.getText().indexOf('function callablePredicateFlow');
  await waitForAsync(async () => {
    const text = typePredicatePropertyConsumer.getText();
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const firstSyntax = text.indexOf('acceptPropertyCallable($callableSyntax)', callableFlowStart);
    const expected = [
      text.indexOf('acceptPropertyInt($callableDirect)', callableFlowStart) + 'acceptPropertyInt('.length,
      text.indexOf('acceptPropertyCallable($callableDirect)', callableFlowStart) + 'acceptPropertyCallable('.length,
      text.indexOf('acceptPropertyInt($callableExplicit)', callableFlowStart) + 'acceptPropertyInt('.length,
      text.indexOf('acceptPropertyInt($box->callableHandler)', callableFlowStart) + 'acceptPropertyInt('.length,
      text.indexOf("acceptPropertyInt($data['callableHandler'])", callableFlowStart) + 'acceptPropertyInt('.length,
      firstSyntax + 'acceptPropertyCallable('.length,
      text.indexOf('acceptPropertyCallable($callableSyntax)', firstSyntax + 1) + 'acceptPropertyCallable('.length,
    ];
    return expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the seven exact runtime is_callable diagnostics');
  for (const expression of ['$invokable->onlyInvoke();', '$box->invokableHandler->onlyInvoke();', "$data['invokableHandler']->onlyInvoke();"]) {
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression, callableFlowStart)
      + expression.indexOf('onlyInvoke');
    await waitForAsync(async () => {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', typePredicatePropertyConsumerUri,
        typePredicatePropertyConsumer.positionAt(offset + 'onlyInv'.length), '>',
      );
      const names = completion.items.map((item) => item.label);
      return names.includes('onlyInvoke') && !names.includes('otherOnly');
    }, `Self-hosted language server did not preserve the concrete invokable member for ${expression}`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri,
        typePredicatePropertyConsumer.positionAt(offset + 2),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes('onlyInvoke'));
    }, `Self-hosted language server did not navigate the concrete invokable member for ${expression}`);
  }
  const isObjectFlowStart = typePredicatePropertyConsumer.getText().indexOf('function isObjectConcreteFlow');
  await waitForAsync(async () => {
    const mismatches = vscode.languages.getDiagnostics(typePredicatePropertyConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expected = [
      'acceptPropertyString($objectDirect)', 'acceptPropertyFlowA($objectDirect)',
      'acceptPropertyString($objectGuard)',
    ].map((expression) => typePredicatePropertyConsumer.getText().indexOf(expression, isObjectFlowStart)
      + expression.indexOf('$'));
    return mismatches.length === 67 && expected.every((offset) => mismatches.some((diagnostic) =>
      typePredicatePropertyConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the three exact is_object diagnostics');
  for (const expression of ['$objectDirect->onlyA();', '$objectGuard->onlyA();']) {
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression, isObjectFlowStart) + expression.indexOf('onlyA');
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri, typePredicatePropertyConsumer.positionAt(offset),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes('onlyA'));
    }, 'Self-hosted language server did not navigate an is_object-narrowed concrete member');
  }
  const sharedObjectOffset = typePredicatePropertyConsumer.getText().indexOf('$objectMultiple->sharedObject();', isObjectFlowStart)
    + '$objectMultiple->'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', typePredicatePropertyConsumerUri,
      typePredicatePropertyConsumer.positionAt(sharedObjectOffset + 'shared'.length), '>',
    );
    return completion.items.filter((item) => item.label === 'sharedObject').length === 1;
  }, 'Self-hosted language server did not expose the common is_object Union member');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri,
      typePredicatePropertyConsumer.positionAt(sharedObjectOffset + 2),
    );
    return definitions.length === 2 && definitions.every((location) =>
      location.uri.toString() === typePredicatePropertyConsumerUri.toString()
      && typePredicatePropertyConsumer.getText(location.range).includes('sharedObject'));
  }, 'Self-hosted language server did not navigate both is_object Union member declarations');
  const compositePredicateFlowStart = typePredicatePropertyConsumer.getText().indexOf('function compositeObjectPredicateFlow');
  for (const expression of ['$counted->countedOnly();', '$iterated->iteratedOnly();']) {
    const member = expression.includes('counted') ? 'countedOnly' : 'iteratedOnly';
    const offset = typePredicatePropertyConsumer.getText().indexOf(expression, compositePredicateFlowStart)
      + expression.indexOf(member);
    await waitForAsync(async () => {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', typePredicatePropertyConsumerUri,
        typePredicatePropertyConsumer.positionAt(offset + member.length), '>',
      );
      const names = completion.items.map((item) => item.label);
      return names.includes(member) && !names.includes('otherOnly');
    }, `Self-hosted language server did not preserve the concrete composite-predicate member ${member}`);
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri,
        typePredicatePropertyConsumer.positionAt(offset + 2),
      );
      return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
        && typePredicatePropertyConsumer.getText(location.range).includes(member));
    }, `Self-hosted language server did not navigate the composite-predicate member ${member}`);
  }
  const promotedPhpDocOffset = typePredicatePropertyConsumer.getText().indexOf('$consumer->service->promotedOnly();')
    + '$consumer->service->'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', typePredicatePropertyConsumerUri,
      typePredicatePropertyConsumer.positionAt(promotedPhpDocOffset + 'promoted'.length), '>',
    );
    return completion.items.some((item) => item.label === 'promotedOnly');
  }, 'Self-hosted language server did not reuse constructor PHPDoc for a promoted mixed property');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', typePredicatePropertyConsumerUri,
      typePredicatePropertyConsumer.positionAt(promotedPhpDocOffset + 2),
    );
    return definitions.some((location) => location.uri.toString() === typePredicatePropertyConsumerUri.toString()
      && typePredicatePropertyConsumer.getText(location.range).includes('promotedOnly'));
  }, 'Self-hosted language server did not navigate through a PHPDoc-refined promoted property');
  const localVarCompletionOffset = localVarDocConsumer.getText().indexOf('$service->exe;') + '$service->exe'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(localVarCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'execute');
  }, 'Self-hosted language server did not use an adjacent local @var assertion for completion');
  const localVarDefinitionOffset = localVarDocConsumer.getText().indexOf('$service->execute();') + '$service->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(localVarDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === localVarDocConsumerUri.toString()
      && localVarDocConsumer.getText(location.range).includes('execute'));
  }, 'Self-hosted language server did not navigate a member through an adjacent local @var assertion');
  await waitForAsync(async () => {
    const diagnostics = vscode.languages.getDiagnostics(localVarDocConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expectedOffsets = ['$service', '$standalone'].map((variable) =>
      localVarDocConsumer.getText().indexOf(`acceptLocalVarOther(${variable})`) + 'acceptLocalVarOther('.length);
    return diagnostics.length === 2 && expectedOffsets.every((offset) => diagnostics.some((diagnostic) =>
      localVarDocConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the local @var argument diagnostic');
  const invalidatedLocalVarOffset = localVarDocConsumer.getText().lastIndexOf('$service->execute();') + '$service->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(invalidatedLocalVarOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server retained a local @var assertion after reassignment');
  const localArrayCompletionOffset = localVarDocConsumer.getText().indexOf("$data['service']->exe;") + "$data['service']->exe".length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(localArrayCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'execute');
  }, 'Self-hosted language server did not use a local @var array shape for member completion');
  const localArrayDefinitionOffset = localVarDocConsumer.getText().indexOf("$data['service']->execute();") + "$data['service']->".length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(localArrayDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === localVarDocConsumerUri.toString()
      && localVarDocConsumer.getText(location.range).includes('execute'));
  }, 'Self-hosted language server did not navigate through a local @var array shape');
  const invalidatedLocalArrayOffset = localVarDocConsumer.getText().lastIndexOf("$data['service']->execute();") + "$data['service']->".length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(invalidatedLocalArrayOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server retained a local @var array shape after offset mutation');
  const standaloneCompletionOffset = localVarDocConsumer.getText().indexOf('$standalone->exe;') + '$standalone->exe'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(standaloneCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'execute');
  }, 'Self-hosted language server did not use a standalone local @var assertion for completion');
  const standaloneDefinitionOffset = localVarDocConsumer.getText().indexOf('$standalone->execute();') + '$standalone->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(standaloneDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === localVarDocConsumerUri.toString()
      && localVarDocConsumer.getText(location.range).includes('execute'));
  }, 'Self-hosted language server did not navigate through a standalone local @var assertion');
  const invalidatedStandaloneOffset = localVarDocConsumer.getText().lastIndexOf('$standalone->execute();') + '$standalone->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', localVarDocConsumerUri,
      localVarDocConsumer.positionAt(invalidatedStandaloneOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server retained a standalone local @var assertion after a by-reference call');
  const nativeAssertCompletionOffset = nativeAssertConsumer.getText().indexOf('$repository->onlyRepo;') + '$repository->onlyRepo'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(nativeAssertCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'onlyRepository');
  }, 'Self-hosted language server did not use a standalone native assert for completion');
  const nativeAssertDefinitionOffset = nativeAssertConsumer.getText().indexOf('$repository->onlyRepository();') + '$repository->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(nativeAssertDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === nativeAssertConsumerUri.toString()
      && nativeAssertConsumer.getText(location.range).includes('onlyRepository'));
  }, 'Self-hosted language server did not navigate through a standalone native assert');
  await waitForAsync(async () => {
    const diagnostics = vscode.languages.getDiagnostics(nativeAssertConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expectedOffsets = ([
      ['acceptNativeAssertOther($repository)', 'acceptNativeAssertOther('.length],
      ['acceptNativeAssertOther($nullable)', 'acceptNativeAssertOther('.length],
      ['acceptNativeAssertInt($scalar)', 'acceptNativeAssertInt('.length],
      ['acceptNativeAssertOther($excluded)', 'acceptNativeAssertOther('.length],
      ['acceptNativeAssertString($negative)', 'acceptNativeAssertString('.length],
      ['acceptNativeAssertOther($falseable)', 'acceptNativeAssertOther('.length],
      ['acceptNativeAssertFalse($boolean)', 'acceptNativeAssertFalse('.length],
    ] as const).map(([needle, prefix]) => nativeAssertConsumer.getText().indexOf(needle) + prefix);
    return diagnostics.length === 7 && expectedOffsets.every((offset) => diagnostics.some((diagnostic) =>
      nativeAssertConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish the native assert argument diagnostic');
  const invalidatedNativeAssertOffset = nativeAssertConsumer.getText().lastIndexOf('$repository->onlyRepository();')
    + '$repository->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(invalidatedNativeAssertOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server retained a native assert fact after a by-reference call');
  const nativeAssertNullableCompletionOffset = nativeAssertConsumer.getText().indexOf('$nullable->onlyRepo;') + '$nullable->onlyRepo'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(nativeAssertNullableCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'onlyRepository');
  }, 'Self-hosted language server did not remove null through a standalone native assert');
  const invalidatedNativeAssertNullableOffset = nativeAssertConsumer.getText().lastIndexOf('$nullable->onlyRepository();')
    + '$nullable->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(invalidatedNativeAssertNullableOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server retained a native non-null assert after reassignment');
  const nativeAssertComplementCompletionOffset = nativeAssertConsumer.getText().indexOf('$excluded->onlyRepo;') + '$excluded->onlyRepo'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(nativeAssertComplementCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'onlyRepository');
  }, 'Self-hosted language server did not apply a native negative instanceof complement');
  const invalidatedNativeAssertComplementOffset = nativeAssertConsumer.getText().indexOf('$excluded->onlyRepository();')
    + '$excluded->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(invalidatedNativeAssertComplementOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server retained a native negative instanceof complement after reassignment');
  const nativeAssertFalseableCompletionOffset = nativeAssertConsumer.getText().indexOf('$falseable->onlyRepo;') + '$falseable->onlyRepo'.length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(nativeAssertFalseableCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'onlyRepository');
  }, 'Self-hosted language server did not remove false through a standalone native assert');
  const invalidatedNativeAssertFalseableOffset = nativeAssertConsumer.getText().lastIndexOf('$falseable->onlyRepository();')
    + '$falseable->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', nativeAssertConsumerUri,
      nativeAssertConsumer.positionAt(invalidatedNativeAssertFalseableOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server retained a native false exclusion after reassignment');
  for (const marker of ['$parameter->onlyRepo;', '$guard->onlyRepo;']) {
    const offset = booleanLiteralBranchConsumer.getText().indexOf(marker) + marker.slice(0, -1).length;
    await waitForAsync(async () => {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', booleanLiteralBranchConsumerUri,
        booleanLiteralBranchConsumer.positionAt(offset), '>',
      );
      return completion.items.some((item) => item.label === 'onlyRepository');
    }, `Self-hosted language server did not apply a strict boolean branch fact at ${marker}`);
  }
  const booleanGuardDefinitionOffset = booleanLiteralBranchConsumer.getText().indexOf('$guard->onlyRepository();')
    + '$guard->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', booleanLiteralBranchConsumerUri,
      booleanLiteralBranchConsumer.positionAt(booleanGuardDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === nativeAssertConsumerUri.toString()
      && nativeAssertConsumer.getText(location.range).includes('onlyRepository'));
  }, 'Self-hosted language server did not navigate through a strict false guard');
  const looseBooleanDefinitionOffset = booleanLiteralBranchConsumer.getText().indexOf('$loose->onlyRepository();')
    + '$loose->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', booleanLiteralBranchConsumerUri,
      booleanLiteralBranchConsumer.positionAt(looseBooleanDefinitionOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server treated a loose false comparison as a strict type fact');
  await waitForAsync(async () => {
    const diagnostics = vscode.languages.getDiagnostics(booleanLiteralBranchConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expectedOffsets = ([
      ['acceptNativeAssertOther($parameter)', 'acceptNativeAssertOther('.length],
      ['acceptNativeAssertOther($guard)', 'acceptNativeAssertOther('.length],
      ['acceptNativeAssertFalse($boolean)', 'acceptNativeAssertFalse('.length],
      ['acceptNativeAssertTrue($exact)', 'acceptNativeAssertTrue('.length],
      ['acceptNativeAssertOther($record[\'item\'])', 'acceptNativeAssertOther('.length],
      ['acceptNativeAssertOther($ternary[\'item\'])', 'acceptNativeAssertOther('.length],
    ] as const).map(([needle, prefix]) => booleanLiteralBranchConsumer.getText().indexOf(needle) + prefix);
    return diagnostics.length === 6 && expectedOffsets.every((offset) => diagnostics.some((diagnostic) =>
      booleanLiteralBranchConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish strict boolean branch diagnostics');
  const booleanShapeCompletionOffset = booleanLiteralBranchConsumer.getText().indexOf("$record['item']->onlyRepo;")
    + "$record['item']->onlyRepo".length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', booleanLiteralBranchConsumerUri,
      booleanLiteralBranchConsumer.positionAt(booleanShapeCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'onlyRepository');
  }, 'Self-hosted language server did not propagate a strict false exclusion into an array shape element');
  const booleanShapeDefinitionOffset = booleanLiteralBranchConsumer.getText().indexOf("$record['item']->onlyRepository();")
    + "$record['item']->".length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', booleanLiteralBranchConsumerUri,
      booleanLiteralBranchConsumer.positionAt(booleanShapeDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === nativeAssertConsumerUri.toString()
      && nativeAssertConsumer.getText(location.range).includes('onlyRepository'));
  }, 'Self-hosted language server did not navigate from a false-excluded array shape element');
  const booleanTernaryCompletionOffset = booleanLiteralBranchConsumer.getText().indexOf("$ternaryMember['item']->onlyRepo")
    + "$ternaryMember['item']->onlyRepo".length;
  await waitForAsync(async () => {
    const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', booleanLiteralBranchConsumerUri,
      booleanLiteralBranchConsumer.positionAt(booleanTernaryCompletionOffset), '>',
    );
    return completion.items.some((item) => item.label === 'onlyRepository');
  }, 'Self-hosted language server did not apply a strict false fact inside a ternary arm');
  const booleanTernaryDefinitionOffset = booleanLiteralBranchConsumer.getText().lastIndexOf("$ternaryMember['item']->onlyRepository()")
    + "$ternaryMember['item']->".length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', booleanLiteralBranchConsumerUri,
      booleanLiteralBranchConsumer.positionAt(booleanTernaryDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === nativeAssertConsumerUri.toString()
      && nativeAssertConsumer.getText(location.range).includes('onlyRepository'));
  }, 'Self-hosted language server did not navigate from a false-excluded ternary shape element');
  for (const marker of ['$effective->onlyRepo;', '$certainChoice->onlyRepo;', '$ternary->onlyRepo;', '$literalTernary->onlyRepo;']) {
    const offset = nullCoalescingConsumer.getText().indexOf(marker) + marker.slice(0, -1).length;
    await waitForAsync(async () => {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', nullCoalescingConsumerUri,
        nullCoalescingConsumer.positionAt(offset), '>',
      );
      return completion.items.some((item) => item.label === 'onlyRepository');
    }, `Self-hosted language server did not propagate a null-coalescing result at ${marker}`);
  }
  const coalescingDefinitionOffset = nullCoalescingConsumer.getText().indexOf('$definition->onlyRepository();')
    + '$definition->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', nullCoalescingConsumerUri,
      nullCoalescingConsumer.positionAt(coalescingDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === nativeAssertConsumerUri.toString()
      && nativeAssertConsumer.getText(location.range).includes('onlyRepository'));
  }, 'Self-hosted language server did not navigate through a null-coalescing alias');
  const ternaryDefinitionOffset = nullCoalescingConsumer.getText().indexOf('$ternaryDefinition->onlyRepository();')
    + '$ternaryDefinition->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', nullCoalescingConsumerUri,
      nullCoalescingConsumer.positionAt(ternaryDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === nativeAssertConsumerUri.toString()
      && nativeAssertConsumer.getText(location.range).includes('onlyRepository'));
  }, 'Self-hosted language server did not navigate through a literal-condition ternary alias');
  const unsafeCoalescingDefinitionOffset = nullCoalescingConsumer.getText().indexOf('$unsafe->onlyRepository();')
    + '$unsafe->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', nullCoalescingConsumerUri,
      nullCoalescingConsumer.positionAt(unsafeCoalescingDefinitionOffset),
    );
    return definitions.length === 0;
  }, 'Self-hosted language server invented a null-coalescing result with an unknown reachable fallback');
  for (const marker of ['$unsafeTernary->onlyRepository();', '$elvis->onlyRepository();']) {
    const offset = nullCoalescingConsumer.getText().indexOf(marker) + marker.indexOf('onlyRepository') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', nullCoalescingConsumerUri,
        nullCoalescingConsumer.positionAt(offset),
      );
      return definitions.length === 0;
    }, `Self-hosted language server invented an unsupported ternary result at ${marker}`);
  }
  await waitForAsync(async () => {
    const diagnostics = vscode.languages.getDiagnostics(nullCoalescingConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const expectedOffsets = ([
      ['acceptNativeAssertOther($retainedFalse)', 'acceptNativeAssertOther('.length],
      ['acceptNativeAssertInt($resolvedLabel)', 'acceptNativeAssertInt('.length],
      ['acceptNativeAssertString($ternaryScalar)', 'acceptNativeAssertString('.length],
    ] as const).map(([needle, prefix]) => nullCoalescingConsumer.getText().indexOf(needle) + prefix);
    return diagnostics.length === 3 && expectedOffsets.every((offset) => diagnostics.some((diagnostic) =>
      nullCoalescingConsumer.offsetAt(diagnostic.range.start) === offset));
  }, 'Self-hosted language server did not publish precise null-coalescing diagnostics');
  for (const marker of ['$choice->onlyRepo;', '$throwDefault->onlyRepo;']) {
    const offset = matchExpressionConsumer.getText().indexOf(marker) + marker.slice(0, -1).length;
    await waitForAsync(async () => {
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider', matchExpressionConsumerUri,
        matchExpressionConsumer.positionAt(offset), '>',
      );
      return completion.items.some((item) => item.label === 'onlyRepository');
    }, `Self-hosted language server did not propagate a complete match result at ${marker}`);
  }
  const matchDefinitionOffset = matchExpressionConsumer.getText().indexOf('$definition->onlyRepository();')
    + '$definition->'.length + 2;
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', matchExpressionConsumerUri,
      matchExpressionConsumer.positionAt(matchDefinitionOffset),
    );
    return definitions.some((location) => location.uri.toString() === nativeAssertConsumerUri.toString()
      && nativeAssertConsumer.getText(location.range).includes('onlyRepository'));
  }, 'Self-hosted language server did not navigate through a complete match result');
  for (const marker of ['$unknown->onlyRepository();', '$incomplete->onlyRepository();']) {
    const offset = matchExpressionConsumer.getText().indexOf(marker) + marker.indexOf('onlyRepository') + 2;
    await waitForAsync(async () => {
      const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider', matchExpressionConsumerUri,
        matchExpressionConsumer.positionAt(offset),
      );
      return definitions.length === 0;
    }, `Self-hosted language server invented an unsafe match result at ${marker}`);
  }
  await waitForAsync(async () => {
    const diagnostics = vscode.languages.getDiagnostics(matchExpressionConsumerUri)
      .filter((diagnostic) => diagnostic.code === 'php.argument.type-mismatch');
    const offset = matchExpressionConsumer.getText().indexOf('acceptNativeAssertString($scalar)')
      + 'acceptNativeAssertString('.length;
    return diagnostics.length === 1 && matchExpressionConsumer.offsetAt(diagnostics[0]!.range.start) === offset;
  }, 'Self-hosted language server did not publish the complete match result diagnostic');
  const inferredGeneratorCallOffset = builtinConsumer.getText().indexOf('inferredItems();') + 'inferredItems('.length;
  await waitForAsync(async () => {
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider', builtinConsumerUri, builtinConsumer.positionAt(inferredGeneratorCallOffset), '(',
    );
    return signature?.signatures[0]?.label === 'inferredItems(): Generator<int, App\\Controller\\GeneratedItem, mixed, void>';
  }, 'Self-hosted language server did not expose the inferred Generator signature');
  const inferredGeneratorMemberOffset = builtinConsumer.getText().lastIndexOf('label();');
  await waitForAsync(async () => {
    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', builtinConsumerUri, builtinConsumer.positionAt(inferredGeneratorMemberOffset + 2),
    );
    return definitions.some((location) => location.uri.toString() === builtinConsumerUri.toString()
      && builtinConsumer.getText(location.range).includes('label'));
  }, 'Self-hosted language server did not propagate inferred Generator values through foreach');
  assert.equal(
    vscode.languages.getDiagnostics(builtinConsumerUri).filter((diagnostic) => diagnostic.code === 'php.type.unresolved').length,
    0,
    'Self-hosted language server reported a standard exception as unresolved',
  );
  const controllerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'UserController.php');
  const serviceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'UserService.php');
  const movableServiceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'MovableService.php');
  const contactServiceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Contact', 'MovableService.php');
  const moveConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'MoveConsumer.php');
  const renamedServiceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'AccountService.php');
  const staleDuplicateUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Legacy', 'Duplicate.php');
  const originalController = await vscode.workspace.fs.readFile(controllerUri);
  const originalService = await vscode.workspace.fs.readFile(serviceUri);
  const aliasUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'AliasConsumer.php');
  const originalAlias = await vscode.workspace.fs.readFile(aliasUri);
  const importUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'ImportConsumer.php');
  const optimizeUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'OptimizeConsumer.php');
  const originalImport = await vscode.workspace.fs.readFile(importUri);
  const originalOptimize = await vscode.workspace.fs.readFile(optimizeUri);
  const runnerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Contract', 'Runner.php');
  const movedRunnerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'Runner.php');
  const runnerConsumerUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'RunnerConsumer.php');
  const originalRunner = await vscode.workspace.fs.readFile(runnerUri);
  const originalRunnerConsumer = await vscode.workspace.fs.readFile(runnerConsumerUri);
  const controllerDocument = await vscode.workspace.openTextDocument(controllerUri);
  const aliasDocument = await vscode.workspace.openTextDocument(aliasUri);
  const serviceDocument = await vscode.workspace.openTextDocument(serviceUri);
  const languageSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', serviceUri);
  assert.ok(languageSymbols?.some((symbol) => symbol.name === 'UserService'), 'Self-hosted language server did not return the PHP class document symbol');
  const runnerConsumerDocument = await vscode.workspace.openTextDocument(runnerConsumerUri);
  const moveConsumerDocument = await vscode.workspace.openTextDocument(moveConsumerUri);

  const importDocument = await vscode.workspace.openTextDocument(importUri);
  await vscode.window.showTextDocument(importDocument);
  const importOffset = importDocument.getText().indexOf('UserService');
  await vscode.commands.executeCommand('phpCompanion.importClass', importUri, importDocument.positionAt(importOffset + 1));
  assert.ok(importDocument.getText().includes('use App\\Service\\UserService;'), 'Import Class did not add the unique canonical candidate');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !importDocument.getText().includes('use App\\Service\\UserService;'), 'Import Class could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => importDocument.getText().includes('use App\\Service\\UserService;'), 'Import Class could not be redone as one editor operation');
  assert.ok(await importDocument.save(), 'Import Class fixture could not be saved');
  await restoreTextFixture(importUri, originalImport);
  await vscode.window.showTextDocument(importDocument);
  await vscode.commands.executeCommand('phpCompanion.resolvePastedImports');
  await waitFor(() => importDocument.getText().includes('use App\\Service\\UserService;'), 'Resolve Imports did not consume Language Server candidates');
  await vscode.commands.executeCommand('undo');
  await waitFor(() => !importDocument.getText().includes('use App\\Service\\UserService;'), 'Resolve Imports could not be undone as one editor operation');
  await vscode.commands.executeCommand('redo');
  await waitFor(() => importDocument.getText().includes('use App\\Service\\UserService;'), 'Resolve Imports could not be redone as one editor operation');
  assert.ok(await importDocument.save(), 'Resolve Imports fixture could not be saved');

  const optimizeDocument = await vscode.workspace.openTextDocument(optimizeUri);
  await vscode.commands.executeCommand('phpCompanion.optimizeImports', optimizeUri, { preview: false });
  assert.ok(!optimizeDocument.getText().includes('App\\Contract\\Runner'), 'Optimize Imports did not remove a known unused class import');
  assert.strictEqual(optimizeDocument.getText().match(/use App\\Service\\UserService;/g)?.length, 1, 'Optimize Imports did not deduplicate imports');
  assert.ok(await optimizeDocument.save(), 'Optimize Imports fixture could not be saved');

  for (const relativePath of [['Contract', 'Runner.php'], ['Support', 'LogsActivity.php']] as const) {
    const uri = vscode.Uri.joinPath(workspace.uri, 'src', ...relativePath);
    const document = await vscode.workspace.openTextDocument(uri);
    const typeName = relativePath[1].replace('.php', '');
    const offset = document.getText().indexOf(typeName);
    const prepared = await vscode.commands.executeCommand<{ placeholder?: string; text?: string }>(
      '_executePrepareRename', uri, document.positionAt(offset + 1),
    );
    assert.strictEqual(prepared?.placeholder ?? prepared?.text, typeName, `${typeName} declaration did not support F2 preparation`);
  }
  const moveEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>('phpCompanion._testBuildMoveEdits', runnerUri, movedRunnerUri);
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', runnerUri).get<boolean>('move.preview'), true, 'Safe Move preview must be enabled by default');
  assert.ok(moveEdit?.get(movedRunnerUri)?.some((textEdit) => textEdit.newText === 'App\\Service'), 'Safe Move did not target the post-move URI for namespace updates');
  assert.ok(moveEdit?.get(runnerConsumerUri)?.some((textEdit) => textEdit.newText === 'App\\Service\\Runner'), 'Safe Move preview did not include its proven reference update');
  await vscode.window.showTextDocument(runnerConsumerDocument);
  await vscode.commands.executeCommand('phpCompanion.safeMove', runnerUri, movedRunnerUri, { preview: false });
  const movedRunnerDocument = await vscode.workspace.openTextDocument(movedRunnerUri);
  await waitFor(() => movedRunnerDocument.getText().includes('namespace App\\Service;'), 'Safe Move command did not update the namespace atomically');
  const movedRunner = movedRunnerDocument.getText();
  assert.ok(movedRunner.includes('namespace App\\Service;'), `Explorer move did not update the namespace atomically: ${movedRunner}`);
  await waitFor(() => runnerConsumerDocument.getText().includes('use App\\Service\\Runner;'), 'An open reference document did not update after Safe Move');
  assert.strictEqual(runnerConsumerDocument.getText().match(/use App\\Service\\Runner;/g)?.length, 1, 'Forward move produced a duplicate use statement');
  assert.ok(runnerConsumerDocument.getText().includes('Runner::class'), 'Safe Move unexpectedly changed the imported short name');
  await vscode.commands.executeCommand('undo');
  await waitForAsync(async () => {
    try {
      await vscode.workspace.fs.stat(runnerUri);
      return runnerConsumerDocument.getText().includes('use App\\Contract\\Runner;');
    } catch { return false; }
  }, 'Safe Move command could not be undone as one workspace operation');
  await vscode.commands.executeCommand('redo');
  await waitForAsync(async () => {
    try {
      await vscode.workspace.fs.stat(movedRunnerUri);
      const redoneDocument = await vscode.workspace.openTextDocument(movedRunnerUri);
      return redoneDocument.getText().includes('namespace App\\Service;') && runnerConsumerDocument.getText().includes('use App\\Service\\Runner;');
    } catch { return false; }
  }, 'Safe Move command could not be redone as one workspace operation');
  for (const [uri] of moveEdit.entries()) {
    const document = await vscode.workspace.openTextDocument(uri);
    if (document.isDirty) assert.ok(await document.save(), `Could not save Safe Move edit before restoring its path: ${uri.path}`);
  }
  await waitForAsync(async () => {
    const reverse = await vscode.commands.executeCommand<vscode.WorkspaceEdit>('phpCompanion._testBuildMoveEdits', movedRunnerUri, runnerUri);
    return reverse?.get(runnerUri)?.some((edit) => edit.newText === 'App\\Contract') === true
      && reverse.get(runnerConsumerUri)?.some((edit) => edit.newText === 'App\\Contract\\Runner') === true;
  }, 'Language Server did not settle on the redone Safe Move before planning its reversal', 30_000, 100);
  const restoreRunnerFile = new vscode.WorkspaceEdit();
  restoreRunnerFile.renameFile(movedRunnerUri, runnerUri);
  assert.ok(await vscode.workspace.applyEdit(restoreRunnerFile), 'Could not restore Safe Move fixture file');
  await waitForAsync(async () => {
    try {
      const restoredDocument = await vscode.workspace.openTextDocument(runnerUri);
      return restoredDocument.getText().includes('namespace App\\Contract;') && !restoredDocument.isDirty
        && runnerConsumerDocument.getText().includes('use App\\Contract\\Runner;') && !runnerConsumerDocument.isDirty;
    } catch { return false; }
  }, 'Safe Move reverse coordination did not settle before fixture restoration', 30_000);
  await restoreTextFixture(runnerUri, originalRunner);
  const restoreRunnerConsumer = new vscode.WorkspaceEdit();
  restoreRunnerConsumer.replace(runnerConsumerUri, new vscode.Range(new vscode.Position(0, 0), runnerConsumerDocument.positionAt(runnerConsumerDocument.getText().length)), Buffer.from(originalRunnerConsumer).toString('utf8'));
  assert.ok(await vscode.workspace.applyEdit(restoreRunnerConsumer), 'Safe Move fixture references could not be restored');
  assert.ok(await runnerConsumerDocument.save(), 'Safe Move fixture references could not be saved after restoration');

  // Reproduce the interactive Explorer flow exactly: Service -> Contact -> Service.
  await waitForAsync(async () => {
    const forward = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'phpCompanion._testBuildMoveEdits', movableServiceUri, contactServiceUri,
    );
    return forward?.get(contactServiceUri)?.some((edit) => edit.newText === 'App\\Contact') === true
      && forward.get(moveConsumerUri)?.some((edit) => edit.newText === 'App\\Contact\\MovableService') === true;
  }, 'Language Server did not settle before planning the Explorer-style Service to Contact move', 30_000, 100);
  await vscode.window.showTextDocument(moveConsumerDocument);
  const moveServiceToContact = new vscode.WorkspaceEdit();
  moveServiceToContact.renameFile(movableServiceUri, contactServiceUri);
  assert.ok(await vscode.workspace.applyEdit(moveServiceToContact), 'Explorer-style Service to Contact move failed');
  await waitForAsync(async () => Buffer.from(await vscode.workspace.fs.readFile(contactServiceUri)).toString('utf8').includes('namespace App\\Contact;'),
    'Service to Contact move kept the old namespace', 30_000);
  await waitFor(() => moveConsumerDocument.getText().includes('use App\\Contact\\MovableService;') && !moveConsumerDocument.isDirty, 'Service to Contact references did not refresh and save');
  assert.strictEqual(moveConsumerDocument.getText().match(/use App\\Contact\\MovableService;/g)?.length, 1, 'Service to Contact move produced a duplicate use statement');
  // Simulate a second PHP file-operation participant leaving both imports. The
  // reverse move must reconcile this to one canonical import, not stack edits.
  const duplicateImport = new vscode.WorkspaceEdit();
  const contactImportEnd = moveConsumerDocument.positionAt(moveConsumerDocument.getText().indexOf('use App\\Contact\\MovableService;') + 'use App\\Contact\\MovableService;'.length);
  duplicateImport.insert(moveConsumerUri, contactImportEnd, '\nuse App\\Service\\MovableService;');
  assert.ok(await vscode.workspace.applyEdit(duplicateImport));
  if (moveConsumerDocument.isDirty) await moveConsumerDocument.save();
  await waitFor(() => !moveConsumerDocument.isDirty, 'Duplicate import fixture did not finish saving');

  const moveContactToService = new vscode.WorkspaceEdit();
  moveContactToService.renameFile(contactServiceUri, movableServiceUri);
  assert.ok(await vscode.workspace.applyEdit(moveContactToService), 'Explorer-style Contact to Service move failed');
  await waitForAsync(async () => Buffer.from(await vscode.workspace.fs.readFile(movableServiceUri)).toString('utf8').includes('namespace App\\Service;'),
    'Contact to Service move kept the stale Contact namespace', 30_000);
  await waitFor(() => moveConsumerDocument.getText().includes('use App\\Service\\MovableService;') && !moveConsumerDocument.getText().includes('use App\\Contact\\MovableService;') && !moveConsumerDocument.isDirty, 'Reverse move did not reconcile and save imports');
  assert.strictEqual(moveConsumerDocument.getText().match(/use App\\Service\\MovableService;/g)?.length, 1, 'Reverse move left duplicate use statements');

  const declarationOffset = serviceDocument.getText().indexOf('UserService');
  assert.ok(declarationOffset >= 0);
  const aliasUseOffset = aliasDocument.getText().indexOf('Service $service');
  let aliasRename: vscode.WorkspaceEdit | undefined;
  try {
    aliasRename = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
      'vscode.executeDocumentRenameProvider',
      aliasUri,
      aliasDocument.positionAt(aliasUseOffset + 2),
      'ShouldNotRename',
    );
  } catch (error) {
    assert.match(error instanceof Error ? error.message : String(error), /No result|can't be renamed/, 'Alias Rename failed for an unexpected reason');
  }
  assert.strictEqual(aliasRename, undefined, 'Type Rename unexpectedly started from an explicit alias use');
  assert.ok(aliasDocument.getText().includes('use App\\Service\\UserService as Service;'), 'Rejected alias Rename changed the document');
  const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider',
    serviceUri,
    serviceDocument.positionAt(declarationOffset + 2),
    'AccountService',
  );
  assert.ok(edit, 'F2 RenameProvider returned no edit for the class declaration');
  assert.ok(edit.entries().length >= 2, 'Rename did not include cross-file text edits');
  try {
    await vscode.window.showTextDocument(serviceDocument);
    assert.ok(await vscode.workspace.applyEdit(edit), 'Rename workspace edit failed to apply');
    const updatedController = controllerDocument.getText();
    assert.ok(updatedController.includes('use App\\Service\\AccountService;'), 'Import path was not renamed');
    assert.ok(updatedController.includes('@param AccountService'), 'PHPDoc parameter was not renamed');
    assert.ok(updatedController.includes('#[Example(AccountService::class)]'), 'Attribute class reference was not renamed');
    assert.ok(updatedController.includes('\\App\\Service\\AccountService::class'), 'Fully-qualified class reference was not renamed');
    assert.ok(updatedController.includes("$label = 'UserService';"), 'Ordinary string was unexpectedly renamed');
    assert.ok(updatedController.includes('// UserService is intentionally ordinary text.'), 'Ordinary comment was unexpectedly renamed');
    await vscode.workspace.fs.stat(renamedServiceUri);
    const updatedAlias = aliasDocument.getText();
    assert.ok(updatedAlias.includes('use App\\Service\\AccountService as Service;'), 'Aliased import path was not renamed');
    assert.ok(updatedAlias.includes('consume(Service $service): Service'), 'Explicit alias was unexpectedly changed');
    const renamedServiceDocument = vscode.workspace.textDocuments.find((document) => document.uri.toString() === renamedServiceUri.toString());
    assert.ok((renamedServiceDocument ?? serviceDocument).getText().includes('class AccountService'), 'Class declaration text was not updated with its PSR-4 file rename');
    const staleDuplicate = Buffer.from(await vscode.workspace.fs.readFile(staleDuplicateUri)).toString('utf8');
    assert.ok(staleDuplicate.includes('class UserService'), 'A non-canonical duplicate declaration was unexpectedly renamed');
    await vscode.commands.executeCommand('undo');
    await waitForAsync(async () => {
      try {
        await vscode.workspace.fs.stat(serviceUri);
        return controllerDocument.getText().includes('use App\\Service\\UserService;');
      } catch { return false; }
    }, 'Type Rename could not be undone with its file and references');
    await vscode.commands.executeCommand('redo');
    await waitForAsync(async () => {
      try {
        await vscode.workspace.fs.stat(renamedServiceUri);
        return controllerDocument.getText().includes('use App\\Service\\AccountService;');
      } catch { return false; }
    }, 'Type Rename could not be redone with its file and references');
  } finally {
    let renamedExists = false;
    try { await vscode.workspace.fs.stat(renamedServiceUri); renamedExists = true; } catch { /* Rename may have failed before creating it. */ }
    if (renamedExists) {
      const serviceToRestore = await vscode.workspace.openTextDocument(renamedServiceUri);
      if (serviceToRestore.isDirty) assert.ok(await serviceToRestore.save(), 'Could not save renamed service before restoring its path');
      const restoreServiceFile = new vscode.WorkspaceEdit();
      restoreServiceFile.renameFile(renamedServiceUri, serviceUri);
      assert.ok(await vscode.workspace.applyEdit(restoreServiceFile), 'Could not restore renamed service fixture');
    }
    for (const [uri, original] of [[serviceUri, originalService], [controllerUri, originalController], [aliasUri, originalAlias], [importUri, originalImport], [optimizeUri, originalOptimize]] as const) {
      await restoreTextFixture(uri, original);
    }
  }

  const verifyDeclarationRename = async (fixture: {
    declarationUri: vscode.Uri;
    consumerUri: vscode.Uri;
    oldName: string;
    newName: string;
    declarationKind: 'interface' | 'trait' | 'enum';
    renamedReferences: readonly string[];
    ordinaryText: string;
  }): Promise<void> => {
    const renamedUri = vscode.Uri.joinPath(fixture.declarationUri, '..', `${fixture.newName}.php`);
    const originalDeclaration = await vscode.workspace.fs.readFile(fixture.declarationUri);
    const originalConsumer = await vscode.workspace.fs.readFile(fixture.consumerUri);
    const declarationDocument = await vscode.workspace.openTextDocument(fixture.declarationUri);
    const consumerDocument = await vscode.workspace.openTextDocument(fixture.consumerUri);
    const offset = declarationDocument.getText().indexOf(`${fixture.declarationKind} ${fixture.oldName}`) + fixture.declarationKind.length + 1;
    assert.ok(offset >= fixture.declarationKind.length + 1, `${fixture.declarationKind} declaration fixture is missing`);
    await vscode.window.showTextDocument(declarationDocument);
    let renameEdit: vscode.WorkspaceEdit | undefined;
    await waitForAsync(async () => {
      renameEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
        'vscode.executeDocumentRenameProvider', fixture.declarationUri, declarationDocument.positionAt(offset + 1), fixture.newName,
      );
      return Boolean(renameEdit);
    }, `${fixture.declarationKind} declaration Rename provider did not become ready`, 30_000, 100);
    assert.ok(renameEdit, `${fixture.declarationKind} declaration F2 returned no edit`);
    assert.ok(renameEdit.entries().some(([uri, edits]) => uri.toString() === fixture.consumerUri.toString() && edits.length > 0),
      `${fixture.declarationKind} declaration F2 omitted its consumer text edits`);
    try {
      assert.ok(await vscode.workspace.applyEdit(renameEdit), `${fixture.declarationKind} declaration F2 edit could not be applied`);
      try {
        await waitForAsync(async () => {
          try {
            await vscode.workspace.fs.stat(renamedUri);
            const renamedDocument = vscode.workspace.textDocuments.find((document) => document.uri.toString() === renamedUri.toString());
            return (renamedDocument ?? declarationDocument).getText().includes(`${fixture.declarationKind} ${fixture.newName}`)
              && fixture.renamedReferences.every((reference) => consumerDocument.getText().includes(reference));
          } catch { return false; }
        }, `${fixture.declarationKind} declaration F2 did not update its file and references`);
      } catch (error) {
        let renamedDeclaration = vscode.workspace.textDocuments.find((document) => document.uri.toString() === renamedUri.toString())?.getText() ?? '<not-open>';
        let originalDeclarationState = '<missing>';
        try { renamedDeclaration = Buffer.from(await vscode.workspace.fs.readFile(renamedUri)).toString('utf8'); } catch { /* Report a missing rename target. */ }
        try { originalDeclarationState = Buffer.from(await vscode.workspace.fs.readFile(fixture.declarationUri)).toString('utf8'); } catch { /* Report a missing original. */ }
        const missingReferences = fixture.renamedReferences.filter((reference) => !consumerDocument.getText().includes(reference));
        throw new Error(`${error instanceof Error ? error.message : String(error)}; target=${JSON.stringify(renamedDeclaration)}; original=${JSON.stringify(originalDeclarationState)}; missing=${JSON.stringify(missingReferences)}; consumer=${JSON.stringify(consumerDocument.getText())}`);
      }
      assert.ok(consumerDocument.getText().includes(fixture.ordinaryText), `${fixture.declarationKind} declaration F2 changed ordinary string content`);
      await vscode.commands.executeCommand('undo');
      await waitForAsync(async () => {
        try {
          await vscode.workspace.fs.stat(fixture.declarationUri);
          const restoredDocument = vscode.workspace.textDocuments.find((document) => document.uri.toString() === fixture.declarationUri.toString());
          return (restoredDocument ?? declarationDocument).getText().includes(`${fixture.declarationKind} ${fixture.oldName}`)
            && consumerDocument.getText().includes(fixture.oldName);
        } catch { return false; }
      }, `${fixture.declarationKind} declaration F2 could not be undone as one editor operation`);
      await vscode.commands.executeCommand('redo');
      await waitForAsync(async () => {
        try {
          await vscode.workspace.fs.stat(renamedUri);
          const renamedDocument = vscode.workspace.textDocuments.find((document) => document.uri.toString() === renamedUri.toString());
          return (renamedDocument ?? declarationDocument).getText().includes(`${fixture.declarationKind} ${fixture.newName}`)
            && fixture.renamedReferences.every((reference) => consumerDocument.getText().includes(reference));
        } catch { return false; }
      }, `${fixture.declarationKind} declaration F2 could not be redone as one editor operation`);
    } finally {
      try {
        const renamedDocument = await vscode.workspace.openTextDocument(renamedUri);
        if (renamedDocument.isDirty) assert.ok(await renamedDocument.save(), `Could not save renamed ${fixture.declarationKind} fixture`);
        const restoreFile = new vscode.WorkspaceEdit();
        restoreFile.renameFile(renamedUri, fixture.declarationUri);
        assert.ok(await vscode.workspace.applyEdit(restoreFile), `Could not restore renamed ${fixture.declarationKind} fixture path`);
      } catch { /* The rename may have failed before creating its target. */ }
      await restoreTextFixture(fixture.declarationUri, originalDeclaration);
      await restoreTextFixture(fixture.consumerUri, originalConsumer);
    }
  };

  await verifyDeclarationRename({
    declarationUri: vscode.Uri.joinPath(workspace.uri, 'src', 'Contract', 'ExportContract.php'),
    consumerUri: vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'ExportService.php'),
    oldName: 'ExportContract',
    newName: 'ReportContract',
    declarationKind: 'interface',
    renamedReferences: ['use App\\Contract\\ReportContract;', 'implements ReportContract', '@return ReportContract', 'contract(): ReportContract'],
    ordinaryText: "'ExportContract'",
  });
  await verifyDeclarationRename({
    declarationUri: vscode.Uri.joinPath(workspace.uri, 'src', 'Support', 'LogsActivity.php'),
    consumerUri: vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'ActivityService.php'),
    oldName: 'LogsActivity',
    newName: 'TracksActivity',
    declarationKind: 'trait',
    renamedReferences: ['use App\\Support\\TracksActivity;', 'use TracksActivity;', 'class-string<TracksActivity>', 'TracksActivity::class'],
    ordinaryText: "'LogsActivity'",
  });
  await verifyDeclarationRename({
    declarationUri: vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'DeliveryState.php'),
    consumerUri: enumConsumerUri,
    oldName: 'DeliveryState',
    newName: 'ShipmentState',
    declarationKind: 'enum',
    renamedReferences: ['use App\\Service\\ShipmentState;', '@return ShipmentState', 'ShipmentState::Ready', 'ShipmentState::from'],
    ordinaryText: "'DeliveryState'",
  });
  if (process.env.PHP_COMPANION_OPEN_SOURCE_PROFILE === '1') await verifyOpenSourceProfile(workspace);
}

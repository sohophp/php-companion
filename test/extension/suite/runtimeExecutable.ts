import * as assert from 'node:assert';
import { chmod, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

export async function verifyRuntimeExecutableReplacement(folder: vscode.WorkspaceFolder, previewOnly = false): Promise<void> {
  assert.notStrictEqual(process.platform, 'win32', 'The executable wrapper fixture requires POSIX');
  const run = promisify(execFile);
  const probe = async (command: string): Promise<{ minor: string; path: string }> => {
    const { stdout } = await run(command, ['-r', "echo PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION . PHP_EOL . PHP_BINARY;"],
      { timeout: 5000, maxBuffer: 65536 });
    const [minor, path] = stdout.trim().split(/\r?\n/);
    assert.ok(minor && path, 'The PHP version probe returned incomplete information');
    return { minor, path };
  };
  let runtimePath: string | undefined;
  const unavailable: string[] = [];
  for (const command of ['php85', 'php8.5', 'php']) {
    try {
      const candidate = await probe(command);
      if (candidate.minor === '8.5') { runtimePath = candidate.path; break; }
    } catch (error) { unavailable.push(`${command}: ${String(error)}`); }
  }
  assert.ok(runtimePath, `This fixture needs actual PHP 8.5: ${unavailable.join('; ')}`);
  const directory = await mkdtemp(join(tmpdir(), 'sophp-preview-runtime-'));
  const program = join(directory, 'php');
  const quote = (value: string): string => "'" + value.replaceAll("'", "'\\''") + "'";
  const initialProgram = `#!/bin/sh\nexec ${quote(runtimePath)} "$@"\n`;
  const replaceProgram = async (text: string): Promise<void> => {
    const replacement = join(directory, 'replacement');
    await writeFile(replacement, text); await chmod(replacement, 0o755); await rename(replacement, program);
  };
  const configuration = vscode.workspace.getConfiguration('phpCompanion', folder.uri);
  const previousVersion = configuration.inspect<string>('phpVersion')?.workspaceFolderValue;
  const previousExecutable = configuration.inspect<string | null>('phpExecutablePath')?.workspaceFolderValue;
  try {
    await replaceProgram(initialProgram);
    assert.strictEqual((await probe(program)).minor, '8.5', 'The temporary runtime wrapper is invalid');
    await configuration.update('phpVersion', '8.5', vscode.ConfigurationTarget.WorkspaceFolder);
    await configuration.update('phpExecutablePath', program, vscode.ConfigurationTarget.WorkspaceFolder);
    await vscode.commands.executeCommand('phpCompanion.detectPhpVersions');
    const setupUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', 'C3RuntimeSetup.php');
    await vscode.workspace.fs.writeFile(setupUri, Buffer.from('<?php class C3RuntimeSetup {}'));
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(setupUri));
    await vscode.commands.executeCommand('phpCompanion.showCompatibilityReport');
    assert.ok(vscode.window.activeTextEditor?.document.getText().includes(program), 'Core did not select the temporary runtime');

    for (const operation of previewOnly ? [] : ['move', 'rename'] as const) {
      const name = operation === 'move' ? 'C3RuntimeMove' : 'C3RuntimeRename';
      const nextName = operation === 'move' ? name : 'C3RuntimeRenamed';
      const sourceUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', `${name}.php`);
      const targetUri = vscode.Uri.joinPath(folder.uri, 'src', operation === 'move' ? 'Controller' : 'Service', `${nextName}.php`);
      const callerUri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', `${name}Caller.php`);
      const source = String.raw`<?php namespace App\Service; final class ${name} {}`;
      const caller = String.raw`<?php namespace App\Service; function consume${name}(${name} $value): ${name} { return $value; }`;
      await vscode.workspace.fs.writeFile(sourceUri, Buffer.from(source));
      await vscode.workspace.fs.writeFile(callerUri, Buffer.from(caller));
      const document = await vscode.workspace.openTextDocument(sourceUri);
      const callerDocument = await vscode.workspace.openTextDocument(callerUri);
      await vscode.window.showTextDocument(document);
      const position = document.positionAt(source.indexOf(name) + 2);
      const invoke = (options: { testAfterPlan?: () => Promise<void>; testBeforeApply?: () => Promise<void> }): Thenable<boolean> =>
        operation === 'move'
          ? vscode.commands.executeCommand<boolean>('phpCompanion.safeMove', sourceUri, targetUri,
            { preview: true, testPreviewAction: async () => 'apply', ...options })
          : vscode.commands.executeCommand<boolean>('phpCompanion.safeRename',
            { uri: sourceUri, position, newName: nextName, testPreviewAction: async () => 'apply', ...options });
      const deadline = Date.now() + 20_000; let ready = false;
      do {
        try {
          ready = Boolean(await vscode.commands.executeCommand('vscode.executeDocumentRenameProvider', sourceUri, position, `${name}Ready`));
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'No result.') throw error;
        }
        if (!ready) await new Promise(resolve => setTimeout(resolve, 50));
      } while (!ready && Date.now() < deadline);
      assert.ok(ready, `${operation} never obtained baseline project facts`);
      for (const phase of ['after-plan', 'before-apply'] as const) {
        await vscode.window.showTextDocument(document);
        let changed = false; let setupError: unknown;
        const replace = async (): Promise<void> => {
          try {
            await replaceProgram('#!/bin/sh\nexit 99\n');
            const current = vscode.workspace.getConfiguration('phpCompanion', sourceUri);
            assert.strictEqual(current.get('phpExecutablePath'), program, 'Replacement must preserve the configured path');
            assert.strictEqual(current.get('phpVersion'), '8.5', 'Replacement must preserve the PHP target');
            changed = true;
          } catch (error) { setupError = error; throw error; }
        };
        try {
          const result = await invoke(phase === 'after-plan' ? { testAfterPlan: replace } : { testBeforeApply: replace });
          if (setupError) throw setupError;
          console.log(`C3 runtime replacement ${operation} ${phase}: result=${result}`);
          assert.strictEqual(result, false, `${operation} accepted a replaced runtime ${phase}`);
          assert.ok(changed, `${operation} did not reach ${phase}`);
          assert.strictEqual(document.getText(), source); assert.strictEqual(callerDocument.getText(), caller);
          assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(sourceUri)).toString(), source);
          assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(callerUri)).toString(), caller);
          await assert.rejects(async () => vscode.workspace.fs.stat(targetUri));
        } finally {
          await replaceProgram(initialProgram);
          await vscode.commands.executeCommand('phpCompanion.detectPhpVersions');
        }
      }
      assert.strictEqual(await invoke({}), true, `${operation} did not recover after runtime restoration`);
      const edited = (await vscode.workspace.openTextDocument(targetUri)).getText();
      assert.ok(edited.includes(operation === 'move' ? String.raw`namespace App\Controller;` : `class ${nextName}`));
      const editedCaller = callerDocument.getText();
      assert.ok(editedCaller.includes(operation === 'move' ? String.raw`App\Controller\C3RuntimeMove` : nextName));
      await assert.rejects(async () => vscode.workspace.fs.stat(sourceUri));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(targetUri));
      await vscode.commands.executeCommand('undo');
      assert.strictEqual((await vscode.workspace.openTextDocument(sourceUri)).getText(), source);
      assert.strictEqual(callerDocument.getText(), caller);
      await assert.rejects(async () => vscode.workspace.fs.stat(targetUri));
      await vscode.commands.executeCommand('redo');
      assert.strictEqual((await vscode.workspace.openTextDocument(targetUri)).getText(), edited);
      assert.strictEqual(callerDocument.getText(), editedCaller);
      await assert.rejects(async () => vscode.workspace.fs.stat(sourceUri));
      console.log(`C3 ${operation}: same-path runtime replacement declined in both phases; restore/apply/Undo/Redo passed`);
    }
    if (previewOnly) for (const kind of ['generation', 'extraction', 'interface'] as const) {
      const name = kind === 'generation' ? 'C3RuntimeConstructor' : kind === 'interface' ? 'C3RuntimeInterfaceSource' : 'C3RuntimeExtract';
      const uri = vscode.Uri.joinPath(folder.uri, 'src', 'Service', `${name}.php`);
      const interfaceUri = kind === 'interface' ? vscode.Uri.joinPath(folder.uri, 'src', 'Service', `${name}Interface.php`) : undefined;
      const selected = '$subtotal = $price * $quantity;\n        $total = $subtotal + $tax;';
      const source = kind === 'generation'
        ? String.raw`<?php namespace App\Service; final class ${name} { private int $id; }`
        : kind === 'interface' ? String.raw`<?php namespace App\Service; final class ${name} { public function handle(string $value): string { return $value; } }`
        : String.raw`<?php namespace App\Service; final class ${name} {
    public function run(int $price, int $quantity, int $tax): int {
        ` + selected + `
        return $total;
    }
}`;
      await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
      const range = kind !== 'extraction'
        ? new vscode.Range(document.positionAt(source.indexOf(`class ${name}`) + 7), document.positionAt(source.indexOf(`class ${name}`) + 7))
        : new vscode.Range(document.positionAt(source.indexOf(selected)), document.positionAt(source.indexOf(selected) + selected.length));
      const actionFor = async (): Promise<vscode.CodeAction> => {
        const deadline = Date.now() + 20_000;
        do {
          const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>('vscode.executeCodeActionProvider', uri, range,
            kind === 'generation' ? vscode.CodeActionKind.RefactorRewrite.value : vscode.CodeActionKind.RefactorExtract.value);
          const action = actions?.find((item): item is vscode.CodeAction => 'command' in item
            && (kind === 'generation' ? item.title.startsWith('Generate constructor') : kind === 'interface'
              ? item.title === `Extract interface ${name}Interface` : item.title === 'Extract method extractedMethod'));
          if (action?.command) {
            assert.strictEqual(action.command.command, 'phpCompanion.applyPreviewedExtract');
            return action;
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        } while (Date.now() < deadline);
        throw new Error(`${kind} never obtained the preview Code Action`);
      };
      for (const phase of ['in-preview', 'before-apply'] as const) {
        const action = await actionFor();
        let changed = false; let setupError: unknown;
        const replace = async (): Promise<void> => {
          try {
            await replaceProgram('#!/bin/sh\nexit 99\n');
            const current = vscode.workspace.getConfiguration('phpCompanion', uri);
            assert.strictEqual(current.get('phpExecutablePath'), program);
            assert.strictEqual(current.get('phpVersion'), '8.5');
            changed = true;
          } catch (error) { setupError = error; throw error; }
        };
        try {
          const result = await vscode.commands.executeCommand<boolean>(action.command!.command, ...action.command!.arguments ?? [], {
            testPreviewAction: async () => { if (phase === 'in-preview') await replace(); return 'apply'; },
            ...(phase === 'before-apply' ? { testBeforeApply: replace } : {}),
          });
          if (setupError) throw setupError;
          console.log(`C3 runtime replacement ${kind} ${phase}: result=${result}`);
          assert.strictEqual(result, false, `${kind} accepted a replaced runtime ${phase}`);
          assert.ok(changed, `${kind} did not reach ${phase}`);
          assert.strictEqual(document.getText(), source);
          assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
          if (interfaceUri) await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri));
        } finally {
          await replaceProgram(initialProgram);
          await vscode.commands.executeCommand('phpCompanion.detectPhpVersions');
        }
      }
      const restored = await actionFor();
      assert.strictEqual(await vscode.commands.executeCommand(restored.command!.command, ...restored.command!.arguments ?? [],
        { testPreviewAction: async () => 'cancel' }), false);
      assert.strictEqual(document.getText(), source);
      if (interfaceUri) await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri));
      assert.strictEqual(await vscode.commands.executeCommand(restored.command!.command, ...restored.command!.arguments ?? [],
        { testPreviewAction: async () => 'apply' }), true);
      const edited = document.getText();
      assert.ok(edited.includes(kind === 'generation' ? 'function __construct(int $id)'
        : kind === 'interface' ? `implements ${name}Interface` : 'function extractedMethod('));
      const interfaceText = interfaceUri ? (await vscode.workspace.openTextDocument(interfaceUri)).getText() : undefined;
      if (interfaceUri) assert.ok(interfaceText?.includes(`interface ${name}Interface`) && interfaceText.includes('handle(string $value): string'));
      assert.notStrictEqual(edited, source);
      await vscode.window.showTextDocument(document);
      await vscode.commands.executeCommand('undo'); assert.strictEqual(document.getText(), source);
      if (interfaceUri) await assert.rejects(async () => vscode.workspace.fs.stat(interfaceUri));
      await vscode.commands.executeCommand('redo'); assert.strictEqual(document.getText(), edited);
      if (interfaceUri) assert.strictEqual((await vscode.workspace.openTextDocument(interfaceUri)).getText(), interfaceText);
      assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
      console.log(`C3 ${kind}: same-path runtime replacement declined in both phases; restore/cancel/apply/Undo/Redo passed`);
    }
  } finally {
    await configuration.update('phpVersion', previousVersion, vscode.ConfigurationTarget.WorkspaceFolder);
    await configuration.update('phpExecutablePath', previousExecutable, vscode.ConfigurationTarget.WorkspaceFolder);
    await vscode.commands.executeCommand('phpCompanion.detectPhpVersions');
    await rm(directory, { recursive: true, force: true });
  }
}

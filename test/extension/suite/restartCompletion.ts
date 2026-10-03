import * as assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

async function until<T>(check: () => Promise<T | undefined | false>, reason: string): Promise<T> {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch { /* The client may reject while restarting. */ }
    await new Promise<void>(resolve => setTimeout(resolve, 100));
  }
  throw new Error(reason);
}

async function serverPid(): Promise<number | undefined> {
  if (process.platform === 'win32') {
    const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `Get-CimInstance Win32_Process -Filter "ParentProcessId = ${process.pid}" | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*dist*language-server.js*' } | Select-Object -ExpandProperty ProcessId | ConvertTo-Json -Compress`],
    { windowsHide: true, timeout: 10_000 });
    if (!stdout.trim()) return undefined;
    const value: unknown = JSON.parse(stdout);
    const pids = Array.isArray(value) ? value : [value];
    return pids.length === 1 && typeof pids[0] === 'number' && Number.isSafeInteger(pids[0]) ? pids[0] : undefined;
  }
  assert.strictEqual(process.platform, 'linux', 'Owned server PID discovery supports Linux and Windows');
  const children = (await readFile(`/proc/${process.pid}/task/${process.pid}/children`, 'utf8'))
    .trim().split(/\s+/).filter(Boolean);
  for (const pid of children) {
    try {
      if ((await readFile(`/proc/${pid}/cmdline`, 'utf8')).includes('dist/language-server.js')) return Number(pid);
    } catch { /* A child may exit while /proc is being read. */ }
  }
  return undefined;
}

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core);
  await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'RestartUnsaved.php');
  const header = '<?php class RestartAlpha { public function alphaMember(): string { return ""; } } '
    + 'class RestartBeta { public function betaMember(): int { return 1; } } ';
  const saved = header + '$item = new RestartAlpha(); $item->alphaMember();';
  const unsaved = header + '$item = new RestartBeta(); $item->betaMember();';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(saved));
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const query = async (source: string, member: string): Promise<string[]> => {
    const offset = source.lastIndexOf(member) + 5;
    const reply = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', uri, document.positionAt(offset));
    return (reply?.items ?? []).map(item => typeof item.label === 'string' ? item.label : item.label.label);
  };
  await until(async () => (await query(saved, 'alphaMember')).includes('alphaMember'), 'Saved Alpha completion did not appear');
  assert.strictEqual(await editor.edit(builder => builder.replace(
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), unsaved)), true);
  assert.strictEqual(document.isDirty, true);
  await until(async () => (await query(unsaved, 'betaMember')).includes('betaMember'), 'Unsaved Beta completion did not appear');
  const before = await until(serverPid, 'Could not identify owned server PID');
  await until(async () => (await vscode.commands.getCommands(true)).includes('phpCompanion._testCrashLanguageServer'), 'Crash command missing');
  await vscode.commands.executeCommand('phpCompanion._testCrashLanguageServer');
  const after = await until(async () => {
    const pid = await serverPid(); return pid && pid !== before ? pid : undefined;
  }, 'Language Client did not restart its server process');
  await until(async () => (await query(unsaved, 'betaMember')).includes('betaMember'), 'Restart did not restore unsaved Beta completion');
  assert.strictEqual(document.getText(), unsaved); assert.strictEqual(document.isDirty, true);
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), saved);
  const definitions = await until(async () => {
    const values = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider', uri, document.positionAt(unsaved.lastIndexOf('betaMember') + 2));
    return values?.some(value => value.uri.toString() === uri.toString()
      && document.offsetAt(value.range.start) === unsaved.indexOf('betaMember')) ? values : undefined;
  }, 'Restart did not restore unsaved Beta definition');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), saved);
  assert.strictEqual(await vscode.workspace.applyEdit(edit), true);
  await until(async () => (await query(saved, 'alphaMember')).includes('alphaMember'), 'Editing after restart did not restore Alpha completion');
  assert.ok(!(await query(saved, 'alphaMember')).includes('betaMember'));
  console.log('Restart unsaved completion proof: ' + JSON.stringify({ beforePid: before, afterPid: after,
    platform: process.platform, node: process.version,
    unsavedPreserved: true, diskPreserved: true, betaDefinitionCount: definitions.length, postRestartEditing: true }));
}

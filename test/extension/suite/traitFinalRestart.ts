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
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const parentUri = vscode.Uri.joinPath(folder.uri, 'src', 'FinalCacheParent.php');
  const childUri = vscode.Uri.joinPath(folder.uri, 'src', 'FinalCacheChild.php');
  const parent = '<?php trait FinalCacheMethods { public function seed(){} } class FinalCacheBase { use FinalCacheMethods { seed as __construct; } }';
  const finalParent = parent.replace('as __construct', 'as final __construct');
  const child = '<?php class FinalCacheChild extends FinalCacheBase { public function __(){} }';
  await vscode.workspace.fs.writeFile(parentUri, Buffer.from(parent));
  await vscode.workspace.fs.writeFile(childUri, Buffer.from(child));
  const parentDocument = await vscode.workspace.openTextDocument(parentUri);
  const editor = await vscode.window.showTextDocument(parentDocument);
  const childDocument = await vscode.workspace.openTextDocument(childUri);
  const position = childDocument.positionAt(child.indexOf('function __') + 'function __'.length);
  const query = async (available: boolean): Promise<boolean> => {
    const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', childUri, position);
    const labels = (result?.items ?? []).map(item => typeof item.label === 'string' ? item.label : item.label.label);
    return labels.includes('__invoke') && labels.includes('__construct') === available;
  };
  await until(() => query(true), 'Ordinary trait constructor missing');
  assert.strictEqual(await editor.edit(edit => edit.replace(new vscode.Range(parentDocument.positionAt(0), parentDocument.positionAt(parentDocument.getText().length)), finalParent)), true);
  await until(() => query(false), 'Unsaved final trait constructor remained available');
  const beforePid = await until(serverPid, 'Could not identify owned server PID');
  await until(async () => (await vscode.commands.getCommands(true)).includes('phpCompanion._testCrashLanguageServer'), 'Crash command missing');
  await vscode.commands.executeCommand('phpCompanion._testCrashLanguageServer');
  const afterPid = await until(async () => { const pid = await serverPid(); return pid && pid !== beforePid ? pid : undefined; }, 'Server did not restart');
  await until(() => query(false), 'Restart lost unsaved final trait contract');
  assert.strictEqual(parentDocument.getText(), finalParent); assert.strictEqual(parentDocument.isDirty, true);
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(parentUri)).toString(), parent);
  assert.strictEqual(await editor.edit(edit => edit.replace(new vscode.Range(parentDocument.positionAt(0), parentDocument.positionAt(parentDocument.getText().length)), parent)), true);
  await until(() => query(true), 'Removing final after restart did not restore constructor');
  assert.strictEqual(Buffer.from(await vscode.workspace.fs.readFile(childUri)).toString(), child);
  console.log('Final trait restart host proof: ' + JSON.stringify({ beforePid, afterPid, unsavedFinalPreserved: true, postRestartRemoval: true, disksPreserved: true, platform: process.platform }));
}

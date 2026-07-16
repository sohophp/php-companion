import * as assert from 'node:assert';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'PHP Companion placeholder was not discovered');
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  assert.ok(!commands.some((command) => command.startsWith('phpCompanion.')), 'Paused extension registered commands');
}

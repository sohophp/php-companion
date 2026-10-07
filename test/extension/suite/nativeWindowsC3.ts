import * as assert from 'node:assert';
import process from 'node:process';
import * as vscode from 'vscode';
import { run as runC3 } from './c3.js';

export async function run(): Promise<void> {
  assert.strictEqual(process.platform, 'win32');
  assert.ok(!Object.keys(process.env).some(key => (key.startsWith('PHP_COMPANION_TEST_C3_')
    || key.startsWith('PHP_COMPANION_TEST_TEST_PROVIDER_')) && process.env[key]),
  'Full native C3 must not run with subset, Pack or test-provider flags');
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Full native C3 requires its independent Composer workspace');
  const settings = (): { phpVersion: unknown; indexingMode: unknown } => {
    const configuration = vscode.workspace.getConfiguration('phpCompanion', folder.uri);
    return { phpVersion: configuration.get('phpVersion'), indexingMode: configuration.get('indexing.mode') };
  };
  const initialSettings = settings();
  assert.strictEqual(initialSettings.phpVersion, '8.5');
  assert.ok(initialSettings.indexingMode === 'onDemand' || initialSettings.indexingMode === 'experimental');
  await runC3();
  assert.deepStrictEqual(settings(), initialSettings, 'Full C3 changed its selected PHP version or indexing mode');
  console.log(`Windows C3 acceptance proof: ${JSON.stringify({ suite: 'fullC3', platform: process.platform,
    node: process.version, ...initialSettings })}`);
}

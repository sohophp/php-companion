import * as assert from 'node:assert';
import process from 'node:process';
import { run as runC3 } from './c3.js';

export async function run(): Promise<void> {
  assert.strictEqual(process.platform, 'win32');
  assert.ok(!Object.keys(process.env).some(key => (key.startsWith('PHP_COMPANION_TEST_C3_')
    || key.startsWith('PHP_COMPANION_TEST_TEST_PROVIDER_')) && process.env[key]),
  'Full native C3 must not run with subset, Pack or test-provider flags');
  await runC3();
  console.log(`Windows C3 acceptance proof: ${JSON.stringify({ suite: 'fullC3', platform: process.platform,
    node: process.version, phpVersion: '8.5', indexingMode: 'experimental' })}`);
}

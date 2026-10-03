import * as assert from 'node:assert';
import process from 'node:process';
import { run as runC2 } from './c2.js';

export async function run(): Promise<void> {
  assert.strictEqual(process.platform, 'win32');
  assert.ok(!Object.keys(process.env).some(key => key.startsWith('PHP_COMPANION_TEST_C2_') && process.env[key]),
    'Full native C2 must not run with subset or Pack flags');
  await runC2();
  console.log(`Windows C2 acceptance proof: ${JSON.stringify({ suite: 'fullC2', platform: process.platform,
    node: process.version, phpVersion: '8.5', indexingMode: 'onDemand' })}`);
}

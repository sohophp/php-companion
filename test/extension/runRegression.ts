import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runTests } from '@vscode/test-electron';
async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'php-companion-move-regression-'));
  try {
    await mkdir(join(root, 'src', 'Bridge'), { recursive: true });
    await mkdir(join(root, '.vscode'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/', 'SohoPHP\\': 'src/' } } }));
    await writeFile(join(root, '.vscode', 'settings.json'), JSON.stringify({ 'phpCompanion.languageServer.enabled': true, 'phpCompanion.indexing.mode': 'onDemand' }));
    await writeFile(join(root, 'src', 'Bridge', 'Subscriber.php'), '<?php\n\ndeclare(strict_types=1);\n\nnamespace App\\Bridge;\n\nfinal class Subscriber {}\n');
    await writeFile(join(root, 'src', 'Consumer.php'), '<?php namespace App; use App\\Bridge\\Subscriber; function consume(Subscriber $value): Subscriber { return $value; }');
    await runTests({ extensionDevelopmentPath: resolve(__dirname, '..'), extensionTestsPath: resolve(__dirname, 'suite', 'moveRegression'), launchArgs: [root, '--disable-extensions', '--no-sandbox'], extensionTestsEnv: { ELECTRON_RUN_AS_NODE: undefined, PHP_COMPANION_COLD_MOVE: process.env.PHP_COMPANION_COLD_MOVE } });
  } finally { await rm(root, { recursive: true, force: true }); }
}
void main();

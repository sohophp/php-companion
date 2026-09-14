import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { runVSCodeCommand } from '@vscode/test-electron';

const extensionsDirectory = resolve(process.env.PHP_COMPANION_TEST_EXTENSIONS_DIR ?? process.argv[2] ?? '');
if (!process.env.PHP_COMPANION_TEST_EXTENSIONS_DIR && !process.argv[2]) {
  throw new Error('Set PHP_COMPANION_TEST_EXTENSIONS_DIR or pass the isolated extensions directory.');
}
const userDataDirectory = resolve(process.env.PHP_COMPANION_TEST_USER_DATA_DIR ?? `${extensionsDirectory}-user-data`);
const vscodeVersion = process.env.PHP_COMPANION_TEST_VSCODE_VERSION ?? '1.137.0';
const specifications = JSON.parse(await readFile(new URL('../test/extension/open-source-profile.extensions.json', import.meta.url), 'utf8'));
if (!Array.isArray(specifications) || specifications.some((entry) => typeof entry?.id !== 'string' || typeof entry?.version !== 'string')) {
  throw new Error('Open Source Profile extension registry is invalid.');
}

await mkdir(extensionsDirectory, { recursive: true });
await mkdir(userDataDirectory, { recursive: true });
const commandEnvironment = { ...process.env, VSCODE_IPC_HOOK_CLI: undefined, DONT_PROMPT_WSL_INSTALL: '1' };
for (const entry of specifications) {
  await runVSCodeCommand([
    `--extensions-dir=${extensionsDirectory}`,
    `--user-data-dir=${userDataDirectory}`,
    '--install-extension', `${entry.id}@${entry.version}`, '--force',
  ], { version: vscodeVersion, spawn: { env: commandEnvironment } });
}
const { stdout } = await runVSCodeCommand([
  `--extensions-dir=${extensionsDirectory}`,
  `--user-data-dir=${userDataDirectory}`,
  '--list-extensions', '--show-versions',
], { version: vscodeVersion, spawn: { env: commandEnvironment } });
const installed = new Set(stdout.split(/\r?\n/u).map((line) => line.trim().toLowerCase()).filter(Boolean));
for (const entry of specifications) {
  const expected = `${entry.id}@${entry.version}`.toLowerCase();
  if (!installed.has(expected)) throw new Error(`Open Source Profile is missing ${expected}. Installed: ${[...installed].join(', ')}`);
}
if ([...installed].some((entry) => entry.startsWith('bmewburn.vscode-intelephense-client@'))) {
  throw new Error('Open Source Profile unexpectedly installed Intelephense.');
}
process.stdout.write(`${JSON.stringify({ vscodeVersion, extensionsDirectory, installed: [...installed].sort() }, null, 2)}\n`);

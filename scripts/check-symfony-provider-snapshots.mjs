import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

// Run against the built candidate or the actual installed Symfony dist directory.
const providerDirectory = resolve(process.argv[2] ?? 'packages/php-companion-symfony/dist');
const root = mkdtempSync(join(tmpdir(), 'sophp-provider-snapshots-'));
try {
  for (const count of [128, 129, 512, 513]) {
    const request = { protocolVersion: 1, id: `php-companion.symfony.controller-contexts:${count}`, method: 'facts',
      params: { rootUri: pathToFileURL(root).toString(), rootPath: root, generation: '1', phpVersion: '8.5', projectTypes: [],
        documents: Array.from({ length: count }, (_, index) => ({ uri: pathToFileURL(join(root, `Fixture${index}.php`)).toString(),
          languageId: 'php', source: '<?php\n', snapshotVersion: '1' })) } };
    const result = spawnSync(process.execPath, [join(providerDirectory, 'controller-context-provider.js'),
      '--parser-core-wasm', join(providerDirectory, 'web-tree-sitter.wasm'),
      '--php-wasm', join(providerDirectory, 'tree-sitter-php.wasm')],
    { input: JSON.stringify(request), encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(result.error);
    if (count <= 512) {
      assert.equal(result.status, 0, `Count ${count}: ${result.stderr}`);
      const response = JSON.parse(result.stdout);
      assert.equal(response.id, request.id);
      assert.equal(response.protocolVersion, 1);
      assert.equal(response.error, undefined);
      assert.equal(response.result.complete, true);
      assert.deepEqual(response.result.controllerContexts, []);
    } else {
      assert.equal(result.status, 2);
      assert.match(result.stderr, /does not match semantic-provider protocol/);
      assert.equal(result.stdout, '');
    }
    process.stdout.write(`Symfony controller snapshots ${count}: ${count <= 512 ? 'accepted' : 'rejected over limit'}\n`);
  }
} finally { rmSync(root, { recursive: true, force: true }); }

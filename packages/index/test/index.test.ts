import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { indexComposerSources } from '../src/index.js';

describe('bounded project source index', () => {
  let root: string | undefined;
  afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });
  it('emits source snapshots without depending on a semantic consumer', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-index-')); await mkdir(join(root, 'src'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'src', 'User.php'), '<?php class User {}'); const sources: string[] = [];
    const result = await indexComposerSources(root, { onSource: ({ source }) => { sources.push(source); } });
    expect(result).toMatchObject({ files: 1, complete: true }); expect(sources).toEqual(['<?php class User {}']);
  });
  it('lets an adapter preserve its remote document URI scheme', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-index-uri-')); await mkdir(join(root, 'src'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'src', 'Remote.php'), '<?php class Remote {}'); const uris: string[] = [];
    await indexComposerSources(root, { uriForPath: (path) => `remote:${path}`, onSource: ({ uri }) => { uris.push(uri); } });
    expect(uris).toEqual([`remote:${join(root, 'src', 'Remote.php')}`]);
  });
  it('does not emit a partial set when the file-count budget is exceeded', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-index-budget-')); await mkdir(join(root, 'src'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await Promise.all(['A', 'B'].map((name) => writeFile(join(root!, 'src', `${name}.php`), '<?php')));
    let emitted = 0; const result = await indexComposerSources(root, { limits: { maxFiles: 1, maxFileSizeBytes: 100, maxTotalBytes: 100 }, onSource: () => { emitted += 1; } });
    expect(result).toMatchObject({ complete: false, projectComplete: false }); expect(emitted).toBe(0);
  });
  it('indexes project sources first and deterministically truncates dependencies', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-index-dependency-budget-'));
    await mkdir(join(root, 'src')); await mkdir(join(root, 'vendor', 'composer'), { recursive: true }); await mkdir(join(root, 'vendor', 'acme', 'lib', 'src'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'acme/lib', autoload: { 'psr-4': { 'Acme\\': 'src/' } } }] }));
    await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'acme/lib', install_path: '../acme/lib' }] }));
    await writeFile(join(root, 'src', 'Project.php'), '<?php class Project {}');
    await writeFile(join(root, 'vendor', 'acme', 'lib', 'src', 'A.php'), '<?php class A {}');
    await writeFile(join(root, 'vendor', 'acme', 'lib', 'src', 'B.php'), '<?php class B {}');
    const indexed: string[] = [];
    const result = await indexComposerSources(root, { limits: { maxFiles: 2, maxFileSizeBytes: 100, maxTotalBytes: 1_000 }, onSource: ({ path }) => { indexed.push(path); } });
    expect(result).toMatchObject({ files: 2, complete: false, projectComplete: true, warnings: [expect.stringContaining('Dependency index was truncated')] });
    expect(indexed).toEqual([join(root, 'src', 'Project.php'), join(root, 'vendor', 'acme', 'lib', 'src', 'A.php')]);
  });
  it('restores unchanged payloads and rebuilds a corrupt persistent cache', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-index-cache-')); await mkdir(join(root, 'src')); const cache = join(root, 'cache');
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'src', 'User.php'), '<?php class User {}');
    const first = await indexComposerSources(root, { cache: { directory: cache, version: 'test-v1', restore: () => false }, onSource: ({ source }) => ({ sourceLength: source.length }) });
    expect(first.cached).toBe(0);
    let parsed = 0; const second = await indexComposerSources(root, { cache: { directory: cache, version: 'test-v1', restore: (payload) => (payload as { sourceLength?: number }).sourceLength === 19 }, onSource: () => { parsed += 1; } });
    expect(second.cached).toBe(1); expect(parsed).toBe(0);
    const cacheFile = join(cache, (await readdir(cache))[0]!); await writeFile(cacheFile, '{broken');
    const third = await indexComposerSources(root, { cache: { directory: cache, version: 'test-v1', restore: () => true }, onSource: () => { parsed += 1; return {}; } });
    expect(third.cached).toBe(0); expect(parsed).toBe(1); expect(third.warnings).toContain('Persistent index cache was unreadable and will be rebuilt.');
  });
  it('does not index files excluded from Composer classmaps', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-index-exclude-'));
    await mkdir(join(root, 'src', 'Tests'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' }, 'exclude-from-classmap': ['/src/Tests/'] } }));
    await writeFile(join(root, 'src', 'Included.php'), '<?php class Included {}');
    await writeFile(join(root, 'src', 'Tests', 'Excluded.php'), '<?php class Excluded {}');
    const indexed: string[] = [];
    const result = await indexComposerSources(root, { onSource: ({ path }) => { indexed.push(path); } });
    expect(result).toMatchObject({ files: 1, complete: true });
    expect(indexed).toEqual([join(root, 'src', 'Included.php')]);
  });
  it('stops during directory discovery before emitting a partial index', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-index-cancel-'));
    await mkdir(join(root, 'src', 'Nested'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'src', 'Nested', 'User.php'), '<?php class User {}');
    let checks = 0; let emitted = 0;
    const result = await indexComposerSources(root, { shouldContinue: () => ++checks < 3, onSource: () => { emitted += 1; } });
    expect(result).toMatchObject({ files: 0, complete: false, warnings: expect.arrayContaining(['Project indexing was cancelled.']) });
    expect(emitted).toBe(0);
  });
});

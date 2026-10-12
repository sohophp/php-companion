import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

// These subprocess controls exercise evidence and cleanup, not PHP or LSP semantics.
const roots = [];
after(async () => { for (const root of roots) await rm(root, { recursive: true, force: true }); });
const hash = locations => createHash('sha256').update(JSON.stringify([...locations].sort((a, b) =>
  a.uri.localeCompare(b.uri) || a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character))).digest('hex');
const exists = async path => { try { await stat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sophp-reference-evidence-')); roots.push(root);
  const scripts = join(root, 'scripts'); const project = join(root, 'project with spaces'); const evidence = join(root, 'evidence');
  await mkdir(scripts); await mkdir(project);
  await copyFile(fileURLToPath(new URL('../check-winstar-reference-baseline.mjs', import.meta.url)), join(scripts, 'check.mjs'));
  const location = (file, line) => ({ uri: pathToFileURL(join(project, file)).toString(),
    range: { start: { line, character: 2 }, end: { line, character: 5 } } });
  const locations = [location('src/Bridge/ApplicationContextSubscriber.php', 81), location('src/Bridge/ApplicationContextSubscriber.php', 84),
    location('vendor/symfony/http-foundation/Response.php', 287), location('vendor/symfony/http-foundation/Response.php', 1316),
    ...Array.from({ length: 184 }, (_, line) => location('src/Callers.php', line))];
  const definitions = [location('vendor/symfony/http-foundation/ParameterBag.php', 54)];
  const data = join(root, 'data.json'); const invocations = join(root, 'invocations.json');
  await writeFile(data, JSON.stringify({ locations, definitions }));
  await writeFile(join(scripts, 'benchmark-language-queries.mjs'), `
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import process from 'node:process';
const data = JSON.parse(await readFile(process.env.REFERENCE_TEST_DATA, 'utf8'));
const journal = process.env.REFERENCE_TEST_INVOCATIONS;
let records = []; try { records = JSON.parse(await readFile(journal, 'utf8')); } catch {}
const cache = process.argv[6]; const marker = join(cache, 'helper-marker');
let reload = false; try { await stat(marker); reload = true; } catch {}
await writeFile(marker, 'seen');
records.push({ pid: process.pid, cache, reload }); await writeFile(journal, JSON.stringify(records));
const mode = process.env.REFERENCE_TEST_MODE;
if (mode === 'failure' || mode === 'reload-failure' && reload) {
  process.stdout.write('partial output\\n'); process.stderr.write('controlled helper failure\\n'); process.exitCode = 23;
} else {
  const moved = { ...data.locations[0], range: { start: { line: 99, character: 2 }, end: { line: 99, character: 5 } } };
  const refs = mode === 'mismatch' ? [...data.locations, moved] : mode === 'changed-location' ? [moved, ...data.locations.slice(1)] : data.locations;
  await writeFile(process.env.PHP_COMPANION_BENCHMARK_REFERENCE_LOCATIONS_PATH, JSON.stringify(refs));
  process.stderr.write('[reference-cache] ' + (reload ? 'restored' : 'stored') + '\\n');
  process.stderr.write('[named-candidates] elapsedMs=0\\n[references:1] container elapsedMs=0\\n[references:1] routes elapsedMs=0\\n[references:1] events elapsedMs=0\\n[references:1] semantic count=' + refs.length + ' elapsedMs=0\\n');
  const hash = xs => createHash('sha256').update(JSON.stringify([...xs].sort((a,b) => a.uri.localeCompare(b.uri) || a.range.start.line-b.range.start.line || a.range.start.character-b.range.start.character))).digest('hex');
  for (const [method, xs] of [['textDocument/references', refs], ['textDocument/definition', data.definitions]]) process.stdout.write(JSON.stringify({ method, results: xs.length, elapsedMs: 1, locationSha256: hash(xs) }) + '\\n');
}
`);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PHP_COMPANION_')));
  function run(mode = 'success', extra = {}, selectedProject = project) {
    return spawnSync(process.execPath, [join(scripts, 'check.mjs'), selectedProject, join(root, 'server.js'), hash(locations), hash(definitions)], {
      cwd: root, encoding: 'utf8', timeout: 10_000,
      env: { ...env, PHP_COMPANION_CHECK_REFERENCE_SYMFONY: '0', REFERENCE_TEST_DATA: data,
        REFERENCE_TEST_INVOCATIONS: invocations, REFERENCE_TEST_MODE: mode, ...extra },
    });
  }
  async function cleanupChecked() {
    const records = JSON.parse(await readFile(invocations, 'utf8'));
    for (const record of records) {
      assert.equal(await exists(record.cache), false, 'original temporary cache was removed');
      if (process.platform === 'linux') assert.equal(await exists(`/proc/${record.pid}`), false, 'helper exited');
    }
    return records;
  }
  async function capture(result) {
    const match = /\[reference-evidence\] ([^\n]+)/u.exec(result.stderr); assert.ok(match, result.stderr); return match[1];
  }
  return { root, project, evidence, locations, run, cleanupChecked, capture };
}

describe('reference baseline durable evidence', () => {
  it('keeps the default successful CLI output and temporary cleanup', async () => {
    const f = await fixture(); const result = f.run(); assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /cold textDocument\/references: 188 locations/u);
    assert.match(result.stdout, /cold textDocument\/definition: 1 locations/u);
    assert.doesNotMatch(result.stderr, /reference-evidence/u); assert.equal(await exists(f.evidence), false); await f.cleanupChecked();
  });
  it('preserves successful evidence in separate directories without overwriting existing files', async () => {
    const f = await fixture(); await mkdir(f.evidence); await writeFile(join(f.evidence, 'keep.txt'), 'existing'); const dirs = [];
    for (let index = 0; index < 2; index++) {
      const result = f.run('success', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: f.evidence }); assert.equal(result.status, 0, result.stderr);
      const dir = await f.capture(result); dirs.push(dir); assert.deepEqual(JSON.parse(await readFile(join(dir, 'cold.locations.json'), 'utf8')), f.locations);
      const record = JSON.parse(await readFile(join(dir, 'cold.run.json'), 'utf8')); assert.equal(record.exitCode, 0); assert.equal(record.locationsRetained, true);
    }
    assert.notEqual(dirs[0], dirs[1]); assert.equal(await readFile(join(f.evidence, 'keep.txt'), 'utf8'), 'existing'); await f.cleanupChecked();
  });
  it('retains every returned location when the original 188-location assertion fails', async () => {
    const f = await fixture(); const result = f.run('mismatch', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: f.evidence });
    assert.equal(result.status, 1); assert.match(result.stderr, /Reference baseline changed/u); const dir = await f.capture(result);
    const locations = JSON.parse(await readFile(join(dir, 'cold.locations.json'), 'utf8')); assert.equal(locations.length, 189);
    const output = (await readFile(join(dir, 'cold.stdout.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(output[0].results, 189); assert.equal(output[0].locationSha256, hash(locations)); await f.cleanupChecked();
  });
  it('rejects the same reference count when the complete location hash changes', async () => {
    const f = await fixture(); const result = f.run('changed-location', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: f.evidence });
    assert.equal(result.status, 1); assert.match(result.stderr, /Reference baseline changed/u); const dir = await f.capture(result);
    const locations = JSON.parse(await readFile(join(dir, 'cold.locations.json'), 'utf8')); assert.equal(locations.length, 188);
    assert.notEqual(hash(locations), hash(f.locations)); await f.cleanupChecked();
  });
  it('retains partial output and nonzero helper exit before applying result assertions', async () => {
    const f = await fixture(); const result = f.run('failure', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: f.evidence });
    assert.equal(result.status, 1); assert.match(result.stderr, /Benchmark exited with code 23/u); const dir = await f.capture(result);
    assert.equal(await readFile(join(dir, 'cold.stdout.jsonl'), 'utf8'), 'partial output\n');
    assert.match(await readFile(join(dir, 'cold.stderr.log'), 'utf8'), /controlled helper failure/u);
    const record = JSON.parse(await readFile(join(dir, 'cold.run.json'), 'utf8')); assert.equal(record.exitCode, 23); assert.equal(record.locationsRetained, false);
    assert.equal(await exists(join(dir, 'cold.locations.json')), false); await f.cleanupChecked();
  });
  it('does not label cold locations as reload evidence when reload fails before writing', async () => {
    const f = await fixture(); const result = f.run('reload-failure', {
      PHP_COMPANION_REFERENCE_EVIDENCE_DIR: f.evidence, PHP_COMPANION_CHECK_REFERENCE_RELOAD: '1',
    });
    assert.equal(result.status, 1); assert.match(result.stderr, /Benchmark exited with code 23/u); const dir = await f.capture(result);
    assert.equal(JSON.parse(await readFile(join(dir, 'cold.locations.json'), 'utf8')).length, 188);
    assert.equal(await exists(join(dir, 'reload.locations.json')), false);
    assert.equal(JSON.parse(await readFile(join(dir, 'reload.run.json'), 'utf8')).locationsRetained, false);
    const records = await f.cleanupChecked(); assert.equal(records.length, 2); assert.equal(records[1].reload, true);
  });
  it('rejects an outside symlink pointing into the audited project', async () => {
    const f = await fixture(); const alias = join(f.root, 'evidence-alias'); await symlink(f.project, alias, 'dir');
    const result = f.run('success', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: alias });
    assert.equal(result.status, 1); assert.match(result.stderr, /evidence must be outside/u);
    assert.deepEqual(await readdir(f.project), []); assert.equal(await exists(join(f.root, 'invocations.json')), false);
  });
  it('rejects nonexistent descendants through a project symlink before creating directories', async () => {
    const f = await fixture(); const alias = join(f.root, 'ancestor-alias'); await symlink(f.project, alias, 'dir');
    const result = f.run('success', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: join(alias, 'new', 'nested') });
    assert.equal(result.status, 1); assert.match(result.stderr, /evidence must be outside/u);
    assert.deepEqual(await readdir(f.project), []); assert.equal(await exists(join(f.root, 'invocations.json')), false);
  });
  it('recognizes the physical project boundary when the workspace itself is a symlink', async () => {
    const f = await fixture(); const alias = join(f.root, 'workspace-alias'); await symlink(f.project, alias, 'dir');
    const result = f.run('success', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: join(f.project, 'evidence') }, alias);
    assert.equal(result.status, 1); assert.match(result.stderr, /evidence must be outside/u);
    assert.deepEqual(await readdir(f.project), []); assert.equal(await exists(join(f.root, 'invocations.json')), false);
  });
  it('allows a symlink destination whose physical directory is outside the audited project', async () => {
    const f = await fixture(); await mkdir(f.evidence); const alias = join(f.root, 'external-evidence-alias'); await symlink(f.evidence, alias, 'dir');
    const result = f.run('success', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: join(alias, 'new') });
    assert.equal(result.status, 0, result.stderr); const dir = await f.capture(result);
    assert.deepEqual(JSON.parse(await readFile(join(dir, 'cold.locations.json'), 'utf8')), f.locations);
    assert.deepEqual(await readdir(f.project), []); await f.cleanupChecked();
  });
  it('rejects an evidence destination inside the audited project before starting a helper', async () => {
    const f = await fixture(); const result = f.run('success', { PHP_COMPANION_REFERENCE_EVIDENCE_DIR: join(f.project, 'evidence') });
    assert.equal(result.status, 1); assert.match(result.stderr, /evidence must be outside/u);
    assert.deepEqual(await readdir(f.project), []); assert.equal(await exists(join(f.root, 'invocations.json')), false);
  });
});

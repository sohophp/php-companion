import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { runInNewContext } from 'node:vm';

assert.equal(process.platform, 'win32');
const [root, candidate] = process.argv.slice(2); assert.ok(root && candidate);
const bundle = await readFile(join(candidate, 'index.js'), 'utf8');
const start = bundle.indexOf('let x=JSON.parse(c);'); assert.ok(start >= 0);
const end = bundle.indexOf('Cn()', start); assert.ok(end > start);
assert.equal(bundle[end - 1], '}');
const branch = bundle.slice(start, end - 1); // Remove the enclosing upstream else block's closing brace.
const project = await mkdtemp(join(tmpdir(), 'sophp-formatter-errors-'));
try {
  const path = join(project, 'Example.php');
  const config = join(project, '.php-cs-fixer.php');
  await writeFile(config, "<?php return (new PhpCsFixer\\Config())->setRules(['@PSR12'=>true]);\n");
  const cli = (dryRun = false) => spawnSync(join(root, 'php with spaces', 'php.exe'), ['-c', join(root, 'isolated ini', 'php.ini'),
    join(root, 'tools', 'vendor', 'friendsofphp', 'php-cs-fixer', 'php-cs-fixer'), 'fix', '--format=json', '--using-cache=no',
    `--config=${config}`, ...(dryRun ? ['--dry-run'] : []), path], { cwd: project, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  const evaluate = (stdout, stderr) => {
    let accepted = false; let rejected; const logs = []; const notifications = [];
    runInNewContext(`(function(){${branch}})()`, { c: stdout, T: stderr, e: 'original', r: path, n: false,
      ct: { readFileSync: () => 'changed' }, J: text => logs.push(text), ge: text => notifications.push(text),
      a: () => { accepted = true; }, u: error => { rejected = error.message; } }, { timeout: 1000 });
    return { accepted, rejected, logs, notifications };
  };
  await writeFile(path, '<?php\n\nreturn 42;\n');
  const good = cli(); assert.ifError(good.error); assert.equal(good.status, 0);
  assert.deepEqual(JSON.parse(good.stdout).files, []);
  const positive = evaluate(good.stdout, good.stderr); assert.equal(positive.accepted, true); assert.equal(positive.rejected, undefined);
  assert.ok(positive.logs.includes(good.stderr), 'Informational stderr must stay visible in output');
  await writeFile(path, '<?php\nfunction invalid( {\n');
  const bad = cli(); assert.ifError(bad.error); assert.equal(bad.status, 0);
  assert.match(bad.stderr, /Files that were not fixed due to errors reported during linting before fixing:/u);
  const negative = evaluate(bad.stdout, bad.stderr); assert.equal(negative.accepted, false);
  assert.match(negative.rejected, /errors reported during linting/u);
  assert.ok(negative.notifications.includes(bad.stderr), 'Syntax error must still produce an error notification');
  const dry = cli(true); assert.ifError(dry.error); assert.equal(dry.status, 4);
  assert.throws(() => evaluate('{"files":null}', ''), /Invalid PHP CS Fixer JSON files/u);
  assert.throws(() => evaluate('not json', ''), /JSON/u);
  process.stdout.write(`${JSON.stringify({ platform: process.platform, validExit: good.status, invalidFixExit: bad.status,
    invalidDryRunExit: dry.status, informationalOutputPreserved: true, syntaxErrorRejected: true,
    errorNotificationPreserved: true, invalidJsonRejected: true,
    scope: 'Execute the exact patched formatter branch with actual pinned CS Fixer stdout/stderr; not a full editor UI error-notification claim' }, null, 2)}\n`);
} finally { await rm(project, { recursive: true, force: true }); }

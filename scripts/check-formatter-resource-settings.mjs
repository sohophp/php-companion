import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

const [candidate] = process.argv.slice(2);
assert.ok(candidate, 'Provide a pinned formatter extension directory');
const bundle = await readFile(path.join(candidate, 'index.js'), 'utf8');
const start = bundle.indexOf('var Dn=class extends as{');
const end = bundle.indexOf('exports.activate=', start);
assert.ok(start >= 0 && end > start);
const calls = []; const pending = []; const reads = [];
const roots = ['/project A', '/project B'];
const uri = root => ({ scheme: 'file', fsPath: `${root}/src/Example.php`, path: `${root}/src/Example.php` });
const rootOf = resource => roots.find(root => resource?.fsPath?.startsWith(`${root}/`));
const settings = root => ({ executablePath: `${root}/tools/fixer.phar`, config: `${root}/config.php`,
  tmpDir: `${root}/tmp`, autoFixByBracket: false, autoFixBySemicolon: false });
const v = { workspace: {
  getConfiguration(section, resource) {
    const root = rootOf(resource); reads.push({ section, root });
    const values = section === 'php-cs-fixer' ? settings(root ?? '/WRONG')
      : section === 'php' ? { 'validate.executablePath': `${root ?? '/WRONG'}/php` }
      : section === 'editor' ? { formatOnSave: true } : { format: {} };
    return { get: (key, fallback) => values[key] ?? fallback };
  },
  getWorkspaceFolder(resource) { const root = rootOf(resource); return root ? { uri: { scheme: 'file', fsPath: root } } : undefined; },
  workspaceFolders: roots.map(root => ({ uri: { scheme: 'file', fsPath: root } })),
}, Uri: { joinPath: (resource, ...parts) => ({ scheme: 'file', fsPath: path.join(resource.fsPath, ...parts) }) },
  Position: class { constructor(line, character) { this.line = line; this.character = character; } },
  Range: class {}, TextEdit: class { constructor(range, newText) { this.range = range; this.newText = newText; } },
};
const context = { v, as: class {}, process: { platform: 'linux', env: {} }, Ct: path,
  $e: { homedir: () => '/home/test' }, __dirname: candidate, setTimeout: () => {},
  In: '/fallback-temp', yE: '/fallback-temp-2', Pe: false, wn() {}, ge() {}, J() {}, Cn() {},
  ct: { existsSync: () => true, mkdirSync() {}, writeFileSync() {}, readFileSync: file => `formatted:${file}`,
    rm: (_file, _options, done) => done() },
  Rn: (executable, args, options) => {
    calls.push({ executable, args: Array.from(args), options });
    return new Promise(resolve => pending.push(resolve));
  }, console,
};
const Formatter = runInNewContext(`${bundle.slice(start, end)};Dn`, context);
const formatter = new Formatter();
const document = root => ({ uri: uri(root), getText: () => '<?php return 1;', lineCount: 1,
  lineAt: () => ({ range: { end: {} } }) });
const jobs = roots.map(root => formatter.formattingProvider(document(root), {}));
assert.equal(calls.length, 2);
for (const [index, root] of roots.entries()) {
  assert.equal(calls[index].executable, `${root}/php`, 'PHP executable must use the document folder configuration');
  assert.equal(calls[index].args[0], `${root}/tools/fixer.phar`);
  assert.ok(calls[index].args.includes(`--config=${root}/config.php`));
  assert.ok(calls[index].args.at(-1).startsWith(`${root}/tmp/`));
  assert.equal(calls[index].options.cwd, `${root}/src`);
}
// Reverse completion order so a later request cannot overwrite an earlier request's settings.
pending[1]({ stdout: '{"files":[{}]}', stderr: '' });
pending[0]({ stdout: '{"files":[{}]}', stderr: '' });
const results = await Promise.all(jobs);
for (const [index, root] of roots.entries()) assert.ok(results[index][0].newText.startsWith(`formatted:${root}/tmp/`));
assert.ok(reads.some(read => read.section === 'editor' && read.root === roots[0]));
assert.ok(reads.some(read => read.section === 'html' && read.root === roots[1]));
const unchanged = formatter.format('original', uri(roots[0]));
pending.at(-1)({ stdout: '{"files":[]}', stderr: 'PHP CS Fixer informational output\nPHP runtime: test\n' });
assert.equal(await unchanged, 'original');
for (const [stdout, stderr, pattern] of [
  ['{"files":[]}', 'Files that were not fixed due to errors reported during linting before fixing:', /linting/u],
  ['{"files":null}', '', /Invalid PHP CS Fixer JSON files/u],
  ['not json', '', /JSON|Unexpected token/u],
]) {
  const job = formatter.format('original', uri(roots[1]));
  const rejected = assert.rejects(job, pattern);
  pending.at(-1)({ stdout, stderr });
  await rejected;
}
console.log(JSON.stringify({ resourceScopedPhp: true, resourceScopedFixer: true, resourceScopedConfig: true,
  resourceScopedTemp: true, concurrentRequests: true, reversedCompletion: true,
  noChangeAccepted: true, lintErrorsRejected: true, invalidJsonRejected: true,
  scope: 'Exact pinned extension class in a mocked VS Code/CLI boundary; not real editor or actual CLI acceptance' }));

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, lstat, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const [sourceArgument, destinationArgument] = process.argv.slice(2);
assert.ok(sourceArgument && destinationArgument, 'Provide locked extension source and a new isolated destination');
const source = await realpath(sourceArgument);
const requestedDestination = resolve(destinationArgument);
const destination = resolve(await realpath(dirname(requestedDestination)), basename(requestedDestination));
assert.notEqual(source, destination);
const nested = relative(source, destination);
assert.ok(nested === '..' || nested.startsWith(`..${sep}`) || isAbsolute(nested), 'Candidate must be outside the source extension');
await lstat(destination).then(() => { throw new Error('Candidate destination must not exist'); }, error => {
  if (error.code !== 'ENOENT') throw error;
});
const manifest = JSON.parse(await readFile(`${source}/package.json`, 'utf8'));
assert.equal(manifest.publisher, 'junstyle'); assert.equal(manifest.name, 'php-cs-fixer');
assert.equal(manifest.version, '0.3.21'); assert.equal(manifest.license, 'ISC');
const input = await readFile(`${source}/index.js`, 'utf8');
assert.equal(createHash('sha256').update(input).digest('hex'),
  '0d94dba0ab92cfcee26a4fdbc49ef9da81289ee4124395940b1a3c76deeaa243', 'Unreviewed formatter bundle');
const original = 'let x=JSON.parse(c);if(x&&x.files.length>0)a(ct.readFileSync(r,"utf-8"));else{let E=T.split(/\\r?\\n/).filter(Boolean);if(E.length>1)return J(T),n||ge(E[1]),u(new Error(T));a(e.toString())}';
assert.equal(input.split(original).length, 2, 'Expected exactly one reviewed no-change branch');
const replacement = 'let x=JSON.parse(c);if(!x||!Array.isArray(x.files))throw new Error("Invalid PHP CS Fixer JSON files");if(/Files that were not fixed due to errors reported during /.test(T)){J(T);n||ge(T);return u(new Error(T))}if(x.files.length>0)a(ct.readFileSync(r,"utf-8"));else{T&&J(T);a(e.toString())}';
// Copy fails when destination files already exist; never edit a user's installation or the locked source.
await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
const output = input.replace(original, replacement);
await writeFile(`${destination}/index.js`, output);
const hash = value => createHash('sha256').update(value).digest('hex');
const proof = { owner: 'junstyle.php-cs-fixer', version: manifest.version, license: manifest.license,
  sourceHash: hash(input), patchedHash: hash(output), source, destination,
  change: 'On successful CLI exit with valid JSON and no changed files, preserve informational stderr in output and return original text. Explicit CS Fixer lint/fix error reports, nonzero exit and invalid JSON still reject.',
  scope: 'Isolated development candidate only; no marketplace identity, Profile or default Pack change' };
await writeFile(`${destination}/sophp-no-change-candidate.json`, JSON.stringify(proof, null, 2));
process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);

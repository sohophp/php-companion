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
let output = input.replace(original, replacement);
const replaceOnce = (before, after) => {
  assert.equal(output.split(before).length, 2, `Expected exactly one reviewed resource settings branch: ${before}`);
  output = output.replace(before, after);
};
replaceOnce('loadSettings(){let e=v.workspace.getConfiguration("php-cs-fixer");',
  'forResource(e){let i=Object.create(this);return i.loadSettings(e),i}loadSettings(resource){let e=v.workspace.getConfiguration("php-cs-fixer",resource);');
replaceOnce('v.workspace.getConfiguration("php").get("validate.executablePath","php")',
  'v.workspace.getConfiguration("php",resource).get("validate.executablePath","php")');
replaceOnce('this.editorFormatOnSave=v.workspace.getConfiguration("editor").get("formatOnSave")',
  'this.editorFormatOnSave=v.workspace.getConfiguration("editor",resource).get("formatOnSave")');
replaceOnce('v.workspace.getConfiguration("html").get("format")',
  'v.workspace.getConfiguration("html",e.uri).get("format")');
// Each request owns a configuration snapshot. Never mutate the activation singleton while
// another folder's asynchronous CLI request is still running.
replaceOnce('exports.activate=t=>{let e=new Dn;',
  'for(let name of ["formattingProvider","rangeFormattingProvider","format","fix","diff","isExcluded","doAutoFixByBracket","doAutoFixBySemicolon"]){let original=Dn.prototype[name];Dn.prototype[name]=function(...args){let resource=name==="format"?args[1]:args[0]?.document?.uri||args[0]?.uri||args[0];return original.apply(this.forResource(resource),args)}}exports.activate=t=>{let e=new Dn;');
replaceOnce('i.document.languageId=="php"&&e.onsave&&e.editorFormatOnSave==!1',
  'i.document.languageId=="php"&&e.forResource(i.document.uri).onsave&&e.forResource(i.document.uri).editorFormatOnSave==!1');
replaceOnce('e.autoFixByBracket&&e.doAutoFixByBracket(i),e.autoFixBySemicolon&&e.doAutoFixBySemicolon(i)',
  'e.forResource(i.document.uri).autoFixByBracket&&e.doAutoFixByBracket(i),e.forResource(i.document.uri).autoFixBySemicolon&&e.doAutoFixBySemicolon(i)');
await writeFile(`${destination}/index.js`, output);
const resourceKeys = ['executablePath', 'executablePathWindows', 'rules', 'config', 'allowRisky', 'pathMode',
  'ignorePHPVersion', 'exclude', 'onsave', 'autoFixByBracket', 'autoFixBySemicolon', 'formatHtml', 'tmpDir'];
const properties = manifest.contributes.configuration.properties;
for (const key of resourceKeys) {
  assert.ok(properties[`php-cs-fixer.${key}`], `Missing reviewed formatter setting: ${key}`);
  properties[`php-cs-fixer.${key}`].scope = 'resource';
}
// VS Code otherwise rejects folder settings before the request-scoped loader can read them.
await writeFile(`${destination}/package.json`, JSON.stringify(manifest, null, 2));
const hash = value => createHash('sha256').update(value).digest('hex');
const proof = { owner: 'junstyle.php-cs-fixer', version: manifest.version, license: manifest.license,
  sourceHash: hash(input), patchedHash: hash(output), source, destination,
  change: 'On successful CLI exit with valid JSON and no changed files, preserve informational stderr in output and return original text. Explicit CS Fixer lint/fix error reports, nonzero exit and invalid JSON still reject.',
  resourceSettings: 'Read formatter, PHP, editor and HTML settings for the document URI; isolate each request settings snapshot across workspace folders.',
  resourceKeys,
  scope: 'Isolated development candidate only; no marketplace identity, Profile or default Pack change' };
await writeFile(`${destination}/sophp-no-change-candidate.json`, JSON.stringify(proof, null, 2));
process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);

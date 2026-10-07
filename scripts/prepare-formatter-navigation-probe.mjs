import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, lstat, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const [input, output] = process.argv.slice(2);
assert.ok(input && output, 'Provide the reviewed candidate and a new isolated probe directory');
const source = await realpath(input);
const destination = resolve(await realpath(dirname(resolve(output))), basename(resolve(output)));
const nested = relative(source, destination);
assert.ok(nested === '..' || nested.startsWith(`..${sep}`) || isAbsolute(nested));
await lstat(destination).then(() => { throw new Error('Preserve existing probe'); }, error => {
  if (error.code !== 'ENOENT') throw error;
});
const hash = value => createHash('sha256').update(value).digest('hex');
const original = await readFile(`${source}/index.js`, 'utf8');
const baseHash = hash(original);
assert.equal(baseHash, '1948676a0542f7a323410f7814b7653e96e5df81f980dc5314b4e045608bf04d');
const manifest = JSON.parse(await readFile(`${source}/package.json`, 'utf8'));
assert.equal(`${manifest.publisher}.${manifest.name}`, 'junstyle.php-cs-fixer');
assert.equal(manifest.version, '0.3.21'); assert.equal(manifest.license, 'ISC');

// Test instrumentation: forward actual editor commands and delay only their
// fulfilled promises. Joining existing promises exposes a terminal flow marker.
async function sophpProbeNavigation(command, api, fs, timer) {
  const control = JSON.parse(fs.readFileSync(process.env.SOPHP_FORMATTER_NAVIGATION_CONTROL, 'utf8'));
  const observe = phase => {
    const editor = api.window.activeTextEditor;
    const entry = { phase, command, uri: editor?.document.uri.toString(), version: editor?.document.version,
      selections: editor?.selections.map(selection => [selection.anchor.line, selection.anchor.character,
        selection.active.line, selection.active.character]) };
    fs.appendFileSync(control.trace, JSON.stringify(entry) + '\n');
    return entry;
  };
  observe('before-builtin');
  const result = await api.commands.executeCommand(command);
  const completed = observe('after-builtin');
  if (command === control.command) {
    fs.writeFileSync(control.pending, JSON.stringify(completed));
    const deadline = Date.now() + 30_000;
    while (!fs.existsSync(control.release) && Date.now() < deadline) await new Promise(done => timer(done, 25));
    if (!fs.existsSync(control.release)) throw new Error('Navigation probe release timed out');
    observe('released');
  }
  return result;
}
function sophpProbeDone(fs) {
  const control = JSON.parse(fs.readFileSync(process.env.SOPHP_FORMATTER_NAVIGATION_CONTROL, 'utf8'));
  fs.appendFileSync(control.trace, JSON.stringify({ phase: 'flow-completed' }) + '\n');
  fs.writeFileSync(control.done, 'done\n');
}

const start = original.indexOf('doAutoFixByBracket(e){');
const end = original.indexOf('doAutoFixBySemicolon(e){', start);
assert.ok(start >= 0 && end > start);
let method = original.slice(start, end);
const replace = (before, after, count = 1) => {
  assert.equal(method.split(before).length - 1, count, before);
  method = method.replaceAll(before, after);
};
const call = command => `this.sophpProbeNavigation("${command}",v,require("node:fs"),setTimeout)`;
replace('v.commands.executeCommand("editor.action.jumpToBracket")', call('editor.action.jumpToBracket'));
replace('v.commands.executeCommand("cursorUndo")', call('cursorUndo'), 2);
replace(`${call('editor.action.jumpToBracket')}.then`, `return ${call('editor.action.jumpToBracket')}.then`);
replace(`,${call('cursorUndo')}.then`, `;return ${call('cursorUndo')}.then`);
replace('this.format(et,n.uri,!1,!0).then', 'return this.format(et,n.uri,!1,!0).then');
replace('W=x(W),W!=x(et)&&s.edit', 'W=x(W);return W!=x(et)&&s.edit');
replace('.then(applied=>{applied&&', '.then(applied=>{return applied&&');
assert.ok(method.endsWith('})})}'));
method = method.slice(0, -1) + '.finally(()=>this.sophpProbeDone(require("node:fs")))}';
let bundle = original.slice(0, start) + method + original.slice(end);
const marker = 'var Dn=class extends as{'; assert.equal(bundle.split(marker).length, 2);
const helpers = [sophpProbeNavigation, sophpProbeDone].map(fn => fn.toString().replaceAll('\r\n', '\n')
  .replace(/^async function /u, 'async ').replace(/^function /u, '')).join('');
bundle = bundle.replace(marker, marker + helpers);
await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
await writeFile(`${destination}/index.js`, bundle);
const proof = { baseHash, probeHash: hash(bundle), source, destination,
  changes: ['forward actual built-in commands', 'delay selected fulfilled command promise', 'join existing continuation promises', 'write observations and a terminal flow marker'],
  commandReplacements: 3, guardConditionsChanged: false,
  scope: 'Controlled actual editor/CLI diagnostic only; instrumented candidate is not ordinary production candidate qualification or a Profile update' };
await writeFile(`${destination}/sophp-navigation-probe.json`, JSON.stringify(proof, null, 2) + '\n');
process.stdout.write(JSON.stringify(proof) + '\n');

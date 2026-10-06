import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { log } from 'node:console';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';

// PHPDoc signatures describe this dispatcher. They do not create native PHP
// overloads, enforce argument types, or imply coercion of documented arguments.
const inputs = ['42', '42.', '42.0', '4.2e1', '0x2a', '.5'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const runtimeModels = ['7.2', '7.4', '8.1', '8.2', '8.4', '8.5'];
const runtimes = [];
const observations = [];
const results = [];
const parser = await PhpSyntaxParser.createDefault();
try {
  for (const model of runtimeModels) {
    const path = `/opt/remi/php${model.replace('.', '')}/root/usr/bin/php`;
    const version = spawnSync(path, ['-n', '-r', 'echo PHP_VERSION;'], { encoding: 'utf8', timeout: 5000 });
    assert.equal(version.error, undefined); assert.equal(version.status, 0, version.stderr);
    assert.ok(version.stdout.startsWith(`${model}.`));
    runtimes.push({ model, path, version: version.stdout, sha256: sha(await readFile(path)) });
    for (const staticMethod of [false, true]) for (const strict of [false, true]) for (const input of inputs) {
      const definitions = 'class IntResult{function intOnly(){}function common(){}}class FloatResult{function floatOnly(){}function common(){}}'
        + `/** @method ${staticMethod ? 'static ' : ''}IntResult pick(int $value)\n * @method ${staticMethod ? 'static ' : ''}FloatResult pick(float $value) */`
        + `class Factory{${staticMethod ? 'static ' : ''}function ${staticMethod ? '__callStatic' : '__call'}($name,$arguments){return is_float($arguments[0])?new FloatResult():new IntResult();}}`;
      const expression = staticMethod ? `Factory::pick(${input})` : `$factory->pick(${input})`;
      const native = spawnSync(path, ['-n', '-r', `declare(strict_types=${Number(strict)});${definitions}$factory=new Factory();$v=${expression};echo gettype(${input}),'|',get_class($v),'|',implode(',',get_class_methods($v));`],
        { encoding: 'utf8', timeout: 5000 });
      assert.equal(native.error, undefined); assert.equal(native.status, 0, native.stderr + native.stdout);
      const [inputType, returnClass, members] = native.stdout.split('|');
      assert.ok(inputType && returnClass && members);
      const observed = { inputType, returnClass, members: members.split(',').sort() };
      observations.push({ model, staticMethod, strict, input, ...observed });
      for (const retained of [true, false]) {
        const workspace = new SemanticWorkspace(parser), uri = 'file:///DocumentedDispatcher.php';
        try {
          const source = `<?php declare(strict_types=${Number(strict)});${definitions}function run(Factory $factory){$v=${expression};$v->common();}`;
          workspace.setTargetPhpVersion(model); workspace.update(uri, source, retained);
          const actual = workspace.completeMembers(uri, source.lastIndexOf('->') + 2).map(item => item.name).sort();
          const actualType = workspace.variableValueAt(uri, source.lastIndexOf('$v') + 1)?.type;
          results.push({ model, staticMethod, strict, input, retained, actual, actualType,
            match: JSON.stringify(actual) === JSON.stringify(observed.members) && actualType === observed.returnClass });
        } finally { workspace.dispose(); }
      }
    }
  }
} finally { parser.dispose(); }
const report = {
  scope: 'Six actual PHP runtimes and documented __call/__callStatic dispatch; not arbitrary magic method execution, nine native runtimes, or PHPDoc argument enforcement.',
  bundleSha256: sha(await readFile('dist/language-server.js')),
  semanticSourceSha256: sha(await readFile('packages/semantic/src/index.ts')),
  semanticCompiledSha256: sha(await readFile('packages/semantic/dist/index.js')),
  runtimes, nativeObservations: observations.length, total: results.length,
  mismatching: results.filter(row => !row.match).length, observations, results,
};
await writeFile(process.argv[2] ?? '.vscode-test/documented-method-overloads.json', JSON.stringify(report, null, 2) + '\n');
log(JSON.stringify({ nativeObservations: report.nativeObservations, total: report.total, mismatching: report.mismatching }));
assert.equal(report.mismatching, 0);

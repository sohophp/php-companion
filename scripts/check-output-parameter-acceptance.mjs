import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Use the existing compiled harness without changing frozen dist-test artifacts.
if (process.platform !== 'linux') throw new Error('This visible gate uses the Linux VS Code harness.');
if (process.argv.length > 3) throw new Error('Usage: node scripts/check-output-parameter-acceptance.mjs [report.json]');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const automatic = process.env.SOPHP_AUTOMATIC_COMPLETION === '1';
const isolatedIndexingMode = process.env.SOPHP_AUTOMATIC_INDEXING_MODE;
if (!automatic || !['onDemand', 'progressive'].includes(isolatedIndexingMode))
  throw new Error('Set SOPHP_AUTOMATIC_COMPLETION=1 and select SOPHP_AUTOMATIC_INDEXING_MODE=onDemand or progressive.');
if (isolatedIndexingMode && (process.env.PHP_COMPANION_TEST_C3_INDEXING_MODE
  || isolatedIndexingMode === 'progressive' && process.env.PHP_COMPANION_TEST_SYMFONY_CONTEXT_ON_DEMAND === '1'))
  throw new Error('Conflicting isolated indexing mode settings.');

const scratch = await mkdtemp(join(root, '.vscode-test', 'output-parameter-verification-'));
try {
  const suite = join(scratch, 'suite.cjs');
  await build({ entryPoints: [join(root, 'test/extension/suite/outputParameterAcceptance.ts')], outfile: suite,
    bundle: true, platform: 'node', format: 'cjs', external: ['vscode'], logLevel: 'warning' });
  let runner = (await readFile(join(root, 'dist-test/runTest.js'), 'utf8'))
    .replaceAll('__dirname', JSON.stringify(join(root, 'dist-test')));
  const pathPattern = /^([ \t]*)extensionTestsPath:[\s\S]*?(?=^[ \t]*launchArgs:)/gmu;
  assert.equal([...runner.matchAll(pathPattern)].length, 1, 'Compiled harness must have one tests path followed by launch arguments.');
  runner = runner.replace(pathPattern, (_value, indent) => `${indent}extensionTestsPath: ${JSON.stringify(suite)},\n`);
  if (isolatedIndexingMode) {
    const fixtureCopy = '    await (0, promises_1.cp)(sourceFixture, fixture, { recursive: true });';
    assert.equal(runner.split(fixtureCopy).length, 2, 'Compiled harness must have one primary fixture copy.');
    runner = runner.replace(fixtureCopy, `${fixtureCopy}
    {
      const fixtureSettingsPath = require('node:path').join(fixture, '.vscode', 'settings.json');
      const fixtureSettings = JSON.parse(await (0, promises_1.readFile)(fixtureSettingsPath, 'utf8'));
      fixtureSettings['phpCompanion.indexing.mode'] = ${JSON.stringify(isolatedIndexingMode)};
      await (0, promises_1.writeFile)(fixtureSettingsPath, JSON.stringify(fixtureSettings, null, 2));
    }`);
  }
  if (isolatedIndexingMode) {
    const c1ModeAssignment = "settings['phpCompanion.indexing.mode'] = 'onDemand';\n        if (c1PhpVersion)";
    assert.equal(runner.split(c1ModeAssignment).length, 2, 'One primary C1 mode override must precede PHP version setup.');
    runner = runner.replace(c1ModeAssignment, `settings['phpCompanion.indexing.mode'] = ${JSON.stringify(isolatedIndexingMode)};\n        if (c1PhpVersion)`);
    const workspaceReady = '        const c1ProductPaths =';
    assert.equal(runner.split(workspaceReady).length, 2, 'Workspace file must be written before unique product path setup.');
    runner = runner.replace(workspaceReady, `        if (workspaceFile) {
          const modeWorkspace = JSON.parse(await require('node:fs/promises').readFile(workspaceFile, 'utf8'));
          modeWorkspace.settings = { ...modeWorkspace.settings, 'phpCompanion.indexing.mode': ${JSON.stringify(isolatedIndexingMode)} };
          await require('node:fs/promises').writeFile(workspaceFile, JSON.stringify(modeWorkspace, null, 2));
        }\n` + workspaceReady);
  }
  const fixtureFamily = process.env.SOPHP_OUTPUT_FAMILY ?? 'ordinary';
  const outputFamilies = {
    ordinary: { declaration: '/** @param-out Row $value */ function fill(&$value): void {}', call: 'fill($value);' },
    classInput: { declaration: '/** @template T of object */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}', call: 'new Maker(Row::class,$value);' },
    inherited: { declaration: '/** @template T */class Base{/** @param-out T $value */function __construct(&$value){}}/** @extends Base<Row> */class Maker extends Base{}', call: 'new Maker($value);' },
    trait: { declaration: '/** @template T */trait Build{/** @param-out T $value */function __construct(&$value){}}class Maker{/** @use Build<Row> */use Build;}', call: 'new Maker($value);' },
    conditional: { declaration: '/** @param-out ($mode is true ? Row : int) $value */function fill(bool $mode,&$value){}', call: 'fill(true,$value);' },
    conditionalNumericReturn: { declaration: '/** @return ($mode is int ? Row : int) */function fill(int $mode){}', call: "$value=fill('42');" },
    conditionalNumeric: { declaration: '/** @param-out ($mode is int ? Row : int) $value */function fill(int $mode,&$value){}', call: "fill('42',$value);" },
    conditionalIntegralFloat: { declaration: '/** @param-out ($mode is int ? int : Row) $value */function fill(int|float $mode,&$value){}', call: 'fill(42.0,$value);' },
    conditionalWeak: { declaration: '/** @param-out ($mode is true ? Row : Row) $value */function fill(bool $mode,&$value){}', call: 'fill(Row::class,$value);' },
    conditionalDefault: { declaration: '/** @param-out ($mode is true ? Row : int) $value */function fill(&$value,bool $mode=true){}', call: 'fill($value);' },
    conditionalNumericDefaultReturn: { declaration: '/** @return ($mode is int ? int : Row) */function fill(float $mode=42){}', call: '$value=fill();' },
    conditionalNumericDefaultOutput: { declaration: '/** @param-out ($mode is int ? int : Row) $value */function fill(&$value,float $mode=42){}', call: 'fill($value);' },
    nativeNumericPipeReturn: { declaration: 'function fill(int $mode): Row { return new Row(); }', call: '$input="42";$value=$input |> fill(...);' },
    conditionalNativeFalseReturn: { declaration: '/** @return ($mode is false ? Row : int) */function fill(false|int $mode){}', call: '$value=fill(false);' },
    conditionalNativeTrueOutput: { declaration: '/** @param-out ($mode is true ? Row : int) $value */function fill(true|int $mode,&$value){}', call: 'fill(true,$value);' },
    nativeCloneWeak: { declaration: '', call: "$original=new Row();$value=clone($original,['mode'=>'42 ']);" },
    nativeCloneMember: { declaration: 'class Box {public Row $row;}', call: "$box=new Box();$box->row=new Row();$value=clone($box->row,['mode'=>42.]);" },
    documentedMethodFloat: { declaration: 'class IntResult{function intOnly(){}}/** @method IntResult pick(int $value)\n * @method Row pick(float $value) */class Maker{function __call($name,$arguments){return is_float($arguments[0])?new Row():new IntResult();}}', call: '$maker=new Maker();$value=$maker->pick(42.);' },
    documentedStaticFloat: { declaration: 'class IntResult{function intOnly(){}}/** @method static IntResult pick(int $value)\n * @method static Row pick(float $value) */class Maker{static function __callStatic($name,$arguments){return is_float($arguments[0])?new Row():new IntResult();}}', call: '$value=Maker::pick(42.);' },
    documentedCallableConditional: { declaration: 'class OtherResult extends Row{function onlyOther(){}}',
      call: '$value=$callback(1);',
      consumerDeclaration: '/** @param callable(bool $flag): ($flag is true ? Row : OtherResult) $callback */\nfunction run(callable $callback): void' },
    variadic: { declaration: '/** @param-out Row $values */function fill(&...$values){}', call: 'fill($first,$value);' },
    variadicNamed: { declaration: '/** @param-out Row $values */function fill(&...$values){}', call: 'fill(first:$first,result:$value);' },
    variadicGeneric: { declaration: '/** @template T of object\n * @param class-string<T> $class\n * @param-out T $values */function fill(string $class,&...$values){}', call: 'fill(Row::class,$first,$value);' },
    callback: { declaration: 'class Maker{/** @template T of object\n * @param callable():T $factory\n * @param-out T $value */function __construct(callable $factory,&$value){}}', call: 'new Maker(function():Row{return new Row();},$value);' },
  };
  assert.ok(Object.hasOwn(outputFamilies, fixtureFamily), 'Unknown output fixture family');
  assert.ok(!['variadicNamed', 'conditionalIntegralFloat'].includes(fixtureFamily) || Number(process.env.SOPHP_VISIBLE_PHP_VERSION ?? '8.5') >= 8,
    'Selected fixture requires PHP 8');
  assert.ok(fixtureFamily !== 'conditionalNativeFalseReturn' || Number(process.env.SOPHP_VISIBLE_PHP_VERSION ?? '8.5') >= 8,
    'Native false union fixture requires PHP 8');
  assert.ok(fixtureFamily !== 'conditionalNativeTrueOutput' || Number(process.env.SOPHP_VISIBLE_PHP_VERSION ?? '8.5') >= 8.2,
    'Native true fixture requires PHP 8.2');
  const cloneFamily = ['nativeCloneWeak', 'nativeCloneMember'].includes(fixtureFamily);
  assert.ok(!cloneFamily || Number(process.env.SOPHP_VISIBLE_PHP_VERSION ?? '8.5') >= 8.5,
    'Clone-with fixture requires PHP 8.5');
  const selected = outputFamilies[fixtureFamily];
  const coldFixtureFiles = {
    'src/OutputQuery/Row.php': "<?php namespace App\\OutputQuery; class Row {" + (cloneFamily ? 'public int $mode;' : '') + "public function name(): string {return 'row';}}",
    'src/output-query-functions.php': '<?php namespace App\\OutputQuery; ' + selected.declaration,
    'OutputParameterConsumer.php': '<?php\n' + (cloneFamily ? 'declare(strict_types=1);\n' : '') + 'namespace App\\OutputQuery;\n' + (selected.consumerDeclaration ?? 'function run(): void') + ' {\n    ' + selected.call + '\n    $value->;\n}\n',
  };
  const coldFixtureCopy = '    await (0, promises_1.cp)(sourceFixture, fixture, { recursive: true });';
  assert.equal(runner.split(coldFixtureCopy).length, 2, 'One fixture copy must precede editor launch');
  runner = runner.replace(coldFixtureCopy, `${coldFixtureCopy}
    {
      const fixtureFs = require('node:fs/promises');
      const fixturePath = require('node:path');
      const coldFiles = ${JSON.stringify(coldFixtureFiles)};
      for (const [relative, source] of Object.entries(coldFiles)) {
        const target = fixturePath.join(fixture, relative);
        await fixtureFs.mkdir(fixturePath.dirname(target), { recursive: true });
        await fixtureFs.writeFile(target, source);
      }
      const composerFile = fixturePath.join(fixture, 'composer.json');
      const composer = JSON.parse(await fixtureFs.readFile(composerFile, 'utf8'));
      composer.autoload = { ...composer.autoload, files: [...(composer.autoload?.files ?? []), 'src/output-query-functions.php'] };
      await fixtureFs.writeFile(composerFile, JSON.stringify(composer, null, 2));
    }`);
  const runnerPath = join(scratch, 'runner.cjs'); await writeFile(runnerPath, runner);
  let output = '';
  let rendererExceptions = 0;
  const child = spawn(process.execPath, [join(root, 'scripts/run-extension-test.mjs'), runnerPath], {
    cwd: root, env: { ...process.env, PHP_COMPANION_TEST_CORE_ONLY: '1', PHP_COMPANION_TEST_C1_ONLY: '1', PHP_COMPANION_TEST_C1_UI: '1', PHP_COMPANION_TEST_C1_PHP_VERSION: process.env.SOPHP_VISIBLE_PHP_VERSION ?? '8.5' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const [stream, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    stream.setEncoding('utf8'); let pending = '';
    const inspect = line => { if (line.includes("TypeError: Cannot read properties of undefined (reading 'getItemsByProvider')")) rendererExceptions++; };
    stream.on('data', chunk => { destination.write(chunk); output = (output + chunk).slice(-131_072);
      pending += chunk; const lines = pending.split('\n'); pending = lines.pop(); for (const line of lines) inspect(line); });
    stream.on('end', () => { if (pending) inspect(pending); });
  }
  await new Promise((resolveDone, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => code === 0 && !signal ? resolveDone()
      : reject(new Error(`Output parameter host exited with code ${code}, signal ${signal}`)));
  });
  const match = /Output parameter acceptance proof: (\{[^\r\n]*\})/u.exec(output);
  assert.ok(match, 'Host completed without the output parameter proof');
  const proof = JSON.parse(match[1]);
  proof.fixtureFamily = fixtureFamily;
  assert.equal(proof.indexingMode, isolatedIndexingMode);
  assert.equal(proof.results.length, 2);
  assert.deepEqual(proof.otherQueriesBeforeTyping, []);
  assert.equal(proof.definitionMatched, true);
  assert.equal(proof.hoverMatched, true);
  assert.equal(proof.diskUnchanged, true);
  if (automatic) { assert.equal(rendererExceptions, 0, 'Automatic completion raised getItemsByProvider'); proof.rendererExceptions = rendererExceptions; }
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(proof, null, 2) + '\n');
} finally { await rm(scratch, { recursive: true, force: true }); }

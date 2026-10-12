import assert from 'node:assert/strict';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { runTests } from '@vscode/test-electron';
import { generatePhpComposerProject, R1_PERFORMANCE_BUDGETS } from '../../packages/testkit/dist/index.js';

const [preparationPath, outputDirectory, countText, roundText, indexingMode] = process.argv.slice(2);
const base = resolve(outputDirectory);
const meta = JSON.parse(await readFile(preparationPath, 'utf8'));
const root = await mkdtemp(join(tmpdir(), 'sophp-editor-cold-activation-'));
const workspace = join(root, 'workspace'); await mkdir(workspace);
const files = Number(countText), round = Number(roundText);
assert.ok([1000, 10000, 50000].includes(files)); assert.ok(Number.isInteger(round) && round >= 1 && round <= 5);
assert.ok(['onDemand', 'progressive', 'experimental'].includes(indexingMode));
const name = `activation-${files}${indexingMode === 'onDemand' ? '' : '-' + indexingMode}-r${round}`;
const targetName = `Fixture${String(files - 1).padStart(6, '0')}`;
const consumer = join(workspace, 'src/Fixture000000.php'); const target = join(workspace, 'src', targetName + '.php');
const source = `<?php\nnamespace Benchmark;\nfunction consume(${targetName} $item): void { $item->id(); $item->i; }\n`;
const positionAt = (text, offset) => { const lines = text.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1).length }; };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const record = { status: 'preparing', fixtureRoot: root, files, round, diagnosticOnly: true, privateMetadataMainWrapper: true,
  phpTarget: meta.phpTarget, phpVersion: meta.phpVersion, indexingMode,
  sourceProfile: Boolean(meta.profile),
  normalProductChanged: false, profileUpdated: false, fullQualification: false, fullObjectiveComplete: false };
const output = join(base, name + '-driver.json');
const save = () => writeFile(output, JSON.stringify(record, null, 2) + '\n');
await save();
try {
  if (meta.profile) {
    await cp(meta.profile.extensionsDirectory, join(root, 'extensions'), { recursive: true, dereference: true });
    for (const file of meta.profile.installedFiles) {
      assert.equal(digest(await readFile(join(root, 'extensions', file.relativePath))), file.sha256, file.relativePath);
    }
    record.profileCopiedFilesVerified = meta.profile.installedFiles.length;
    await mkdir(join(root, 'user-data/User'), { recursive: true });
    await writeFile(join(root, 'user-data/User/settings.json'), JSON.stringify({
      'extensions.autoUpdate': 'off', 'extensions.autoCheckUpdates': false, 'update.mode': 'none' }));
    record.profileAutomaticUpdatesDisabled = true;
  }
  await generatePhpComposerProject(workspace, files); await writeFile(consumer, source);
  record.generatedPhpFiles = (await readdir(join(workspace, 'src'))).filter(name => name.endsWith('.php')).length;
  assert.equal(record.generatedPhpFiles, files);
  const targetSource = await readFile(target, 'utf8'); const at = targetSource.indexOf('id():'); assert.ok(at >= 0);
  await mkdir(join(workspace, '.vscode'));
  await writeFile(join(workspace, '.vscode/settings.json'), JSON.stringify({
    'phpCompanion.phpVersion': meta.phpTarget, 'phpCompanion.phpExecutablePath': meta.php,
    'phpCompanion.indexing.mode': indexingMode, 'php.suggest.basic': false, 'php.validate.enable': false,
    'security.workspace.trust.enabled': false }));
  const casePath = join(base, name + '-case.json');
  await writeFile(casePath, JSON.stringify({ files, round, source, consumer, target, targetName,
    php: meta.php, phpTarget: meta.phpTarget, indexingMode,
    profile: meta.profile ? { inventory: meta.profile.inventory, installed: meta.profile.installed,
      copiedExtensionsDirectory: join(root, 'extensions') } : undefined,
    targetSha256: digest(targetSource), extension: meta.extension, editorVersion: meta.editorVersion,
    coldBudgetMs: R1_PERFORMANCE_BUDGETS.coldIndexMs[`files${files}`],
    completion: positionAt(source, source.lastIndexOf('$item->i') + '$item->i'.length),
    completionStart: positionAt(source, source.lastIndexOf('$item->i') + '$item->'.length),
    hover: positionAt(source, source.indexOf('$item->id') + 2),
    definition: positionAt(source, source.indexOf('->id') + 3),
    targetStart: positionAt(targetSource, at), targetEnd: positionAt(targetSource, at + 2),
    trace: join(base, name + '-partial-trace.json'), proof: join(base, name + '-proof.json') }, null, 2) + '\n', { flag: 'wx' });
  record.status = 'running'; record.electronRunAsNodeClearedForEditorLikeOriginalRunTest = true; await save();
  await runTests({ vscodeExecutablePath: meta.editor,
    extensionDevelopmentPath: meta.profile ? [meta.extension, ...meta.profile.developmentPaths] : meta.extension,
    extensionTestsPath: join(meta.helperDirectory, 'suite.cjs'),
    launchArgs: [workspace, ...(meta.profile ? [] : ['--disable-extensions']), '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust',
      '--user-data-dir=' + join(root, 'user-data'), '--extensions-dir=' + join(root, 'extensions')],
    extensionTestsEnv: { ELECTRON_RUN_AS_NODE: undefined, SOPHP_ACTIVATION_CASE: casePath } });
  if (meta.profile) {
    const expectedDirectories = meta.profile.installed.map(item => basename(item.path)).sort();
    const actualDirectories = (await readdir(join(root, 'extensions'), { withFileTypes: true }))
      .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    assert.deepEqual(actualDirectories, expectedDirectories, 'Isolated installed extension inventory changed.');
    const runtimeFiles = meta.profile.installedFiles.filter(file => expectedDirectories
      .some(directory => file.relativePath.startsWith(directory + '/')));
    for (const file of runtimeFiles) {
      assert.equal(digest(await readFile(join(root, 'extensions', file.relativePath))), file.sha256, file.relativePath);
    }
    record.profileCopiedRuntimeFilesVerifiedAtExit = runtimeFiles.length;
    record.profileRuntimeCopiesUnchanged = true;
  }
  record.correctnessPassed = true;
} catch (error) { record.correctnessPassed = false; record.error = String(error.stack ?? error); }
finally {
  try { await cp(join(root, 'user-data/logs'), join(base, name + '-host-logs'), { recursive: true }); }
  catch (error) { record.logArchiveError = String(error); }
  await rm(root, { recursive: true, force: true });
  record.status = 'exited'; record.fixtureRemoved = true; await save();
}
process.exitCode = record.correctnessPassed && !record.logArchiveError ? 0 : 1;

/* eslint @typescript-eslint/no-require-imports: off */
/* global require, exports */
const console = require('node:console');
const process = require('node:process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
exports.run = async () => {
  const meta = JSON.parse(fs.readFileSync(process.env.SOPHP_ACTIVATION_CASE, 'utf8'));
  const extension = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(extension);
  assert.equal(extension.extensionPath, meta.extension);
  await extension.activate();
  const { trace } = require(path.join(meta.extension, 'activation-main.cjs'));
  await trace.measurement;
  assert.equal(trace.calls, 1); assert.equal(trace.correctFirstResponses, true);
  assert.equal(trace.originalContextMode, vscode.ExtensionMode.Test);
  assert.equal(trace.delegatedContextMode, vscode.ExtensionMode.Production);
  assert.equal(trace.queryRetries, 0); assert.equal(trace.queryPrewarm, false);
  assert.equal(trace.phpVersion, meta.phpTarget); assert.equal(trace.phpExecutablePath, meta.php);
  assert.equal(trace.indexingMode, meta.indexingMode);
  assert.equal(vscode.version, meta.editorVersion); assert.equal(process.platform, 'linux');
  const serializable = { ...trace }; delete serializable.measurement;
  if (meta.profile) {
    // Keep successful query responses and owned process identities even if a
    // later partner-inventory assertion fails.
    fs.writeFileSync(meta.trace, JSON.stringify({ ...serializable, sourceProfile: true,
      status: 'first-queries-passed-before-profile-inventory', files: meta.files, round: meta.round }, null, 2) + '\n', { flag: 'wx' });
    assert.equal(vscode.workspace.getConfiguration('extensions').get('autoUpdate'), 'off');
    assert.equal(vscode.workspace.getConfiguration('extensions').get('autoCheckUpdates'), false);
    assert.equal(vscode.workspace.getConfiguration('update').get('mode'), 'none');
  }
  const profileInventory = [];
  if (meta.profile) {
    // Observe normal PHP-triggered activation only. Do not preactivate partners
    // or issue extra PHP queries to obtain a passing inventory.
    for (const expected of meta.profile.inventory) {
      const partner = vscode.extensions.getExtension(expected.id); assert.ok(partner, expected.id);
      assert.equal(partner.packageJSON.version, expected.version, expected.id);
      const installed = meta.profile.installed.some(item => item.id === expected.id);
      const expectedPath = installed
        ? path.join(meta.profile.copiedExtensionsDirectory, path.basename(expected.path)) : expected.path;
      assert.equal(partner.extensionPath, expectedPath, expected.id);
      profileInventory.push({ id: expected.id, version: expected.version, extensionPath: partner.extensionPath, active: partner.isActive });
    }
    profileInventory.unshift({ id: extension.id, version: extension.packageJSON.version,
      extensionPath: extension.extensionPath, active: extension.isActive });
  }
  const ownedHostDescendants = [];
  if (meta.profile) {
    const visit = pid => {
      let children;
      try { children = fs.readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/u).filter(Boolean); }
      catch (error) { if (['ENOENT', 'ESRCH'].includes(error.code)) return; throw error; }
      for (const child of children) {
        try { ownedHostDescendants.push({ pid: Number(child),
          argv: fs.readFileSync(`/proc/${child}/cmdline`, 'utf8').split('\0').filter(Boolean) }); }
        catch (error) { if (!['ENOENT', 'ESRCH'].includes(error.code)) throw error; }
        visit(child);
      }
    };
    visit(process.pid);
  }
  const proof = { ...serializable, sourceProfile: Boolean(meta.profile), profileInventory,
    profileAutomaticUpdatesDisabled: Boolean(meta.profile),
    ownedHostDescendants,
    status: 'passed', files: meta.files, round: meta.round, nativeEditor: vscode.version,
    firstCompletionWithinOriginalColdBudget: trace.firstCompletionReceivedMs <= meta.coldBudgetMs,
    originalColdBudgetMs: meta.coldBudgetMs, fullQualification: false,
    privateActivationClockWrapper: true, profileUpdated: false, realWslAcceptance: false, fullObjectiveComplete: false };
  fs.writeFileSync(meta.proof, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
  console.log('Editor activation first-result observation: ' + JSON.stringify(proof));
};

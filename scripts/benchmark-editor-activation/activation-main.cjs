/* eslint @typescript-eslint/no-require-imports: off */
/* global require, exports */
const process = require('node:process');
const vscode = require('vscode');
const path = require('node:path');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const actual = require('./dist/extension.js');
const trace = { calls: 0, diagnosticOnly: true, actualNormalBundleUnchanged: true };
exports.trace = trace;
exports.activate = context => {
  assert.equal(++trace.calls, 1);
  trace.started = performance.now();
  trace.activationStartedAtUtc = new Date().toISOString();
  trace.originalContextMode = context.extensionMode;
  const productionContext = Object.create(context);
  Object.defineProperty(productionContext, 'extensionMode', { value: vscode.ExtensionMode.Production });
  trace.delegatedContextMode = productionContext.extensionMode;
  const result = actual.activate(productionContext);
  trace.measurement = result.then(async () => {
    trace.activationResolvedMs = performance.now() - trace.started;
    const meta = JSON.parse(fs.readFileSync(process.env.SOPHP_ACTIVATION_CASE, 'utf8'));
    const children = fs.readFileSync(`/proc/${process.pid}/task/${process.pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean);
    trace.servers = children.flatMap(pid => {
      try { return [{ pid: Number(pid), argv: fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean) }]; }
      catch (error) { if (['ENOENT', 'ESRCH'].includes(error.code)) return []; throw error; }
    }).filter(p => p.argv.includes(path.join(context.extensionPath, 'dist/language-server.js')));
    assert.equal(trace.servers.length, 1);
    trace.hostPid = process.pid; trace.contextMode = context.extensionMode;
    const uri = vscode.Uri.file(meta.consumer);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { preview: false });
    assert.equal(document.getText(), meta.source);
    const started = performance.now();
    const completion = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', uri, new vscode.Position(meta.completion.line, meta.completion.character));
    trace.firstCompletionReceivedMs = performance.now() - trace.started;
    trace.firstCompletionCallMs = performance.now() - started;
    const item = completion?.items?.[0]; assert.ok(item);
    assert.equal(typeof item.label === 'string' ? item.label : item.label.label, 'id');
    assert.equal(item.kind, vscode.CompletionItemKind.Method);
    trace.rawCompletion = { label: item.label, kind: item.kind, detail: item.detail, insertText: item.insertText };
    assert.equal(item.detail, `Benchmark\\${meta.targetName}::id(): int`);
    assert.ok(item.insertText instanceof vscode.SnippetString);
    assert.equal(item.insertText.value, 'id()$0');
    const range = item.range instanceof vscode.Range ? item.range : item.range?.replacing;
    const position = p => ({ line: p.line, character: p.character });
    assert.ok(range);
    assert.deepEqual([position(range.start), position(range.end)], [meta.completionStart, meta.completion]);
    trace.firstCompletionValidated = true;
    const hover = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, new vscode.Position(meta.hover.line, meta.hover.character));
    trace.firstHoverReceivedMs = performance.now() - trace.started;
    trace.rawHover = hover;
    trace.hoverTexts = (hover ?? []).flatMap(result => result.contents.map(content => typeof content === 'string' ? content : content.value));
    assert.ok(trace.hoverTexts.some(text => text.includes(meta.targetName)));
    const definitions = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', uri, new vscode.Position(meta.definition.line, meta.definition.character));
    trace.firstDefinitionReceivedMs = performance.now() - trace.started;
    assert.equal(definitions.length, 1); assert.equal(definitions[0].uri.fsPath, meta.target);
    assert.deepEqual([position(definitions[0].range.start), position(definitions[0].range.end)], [meta.targetStart, meta.targetEnd]);
    assert.equal(document.isDirty, false);
    assert.equal(fs.readFileSync(meta.consumer, 'utf8'), meta.source);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(meta.target)).digest('hex'), meta.targetSha256);
    trace.correctFirstResponses = true; trace.queryRetries = 0; trace.queryPrewarm = false;
    trace.phpVersion = vscode.workspace.getConfiguration('phpCompanion', uri).get('phpVersion');
    trace.phpExecutablePath = vscode.workspace.getConfiguration('phpCompanion', uri).get('phpExecutablePath');
    trace.indexingMode = vscode.workspace.getConfiguration('phpCompanion', uri).get('indexing.mode');
    trace.clock = 'performance.now immediately before invoking original normal activate; first public query scheduled directly on original activation promise resolution';
    return trace;
  });
  // Preserve the original activation promise and API; retain observer rejection
  // until the suite awaits it without creating an unhandled-rejection side effect.
  trace.measurement.catch(error => {
    const meta = JSON.parse(fs.readFileSync(process.env.SOPHP_ACTIVATION_CASE, 'utf8'));
    const partial = { ...trace }; delete partial.measurement;
    fs.writeFileSync(meta.trace, JSON.stringify({ ...partial, status: 'failed', error: String(error.stack ?? error) }, null, 2) + '\n', { flag: 'wx' });
  });
  return result;
};
exports.deactivate = actual.deactivate;

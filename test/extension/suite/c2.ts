import * as assert from 'node:assert';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0];
  assert.ok(root, 'C2 diagnostics test requires the Composer fixture.');
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', root.uri).get('indexing.mode'), 'onDemand');
  assert.strictEqual(vscode.workspace.getConfiguration('phpCompanion', root.uri).get('phpVersion'), '8.5');
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'SoPHP Core did not load.');
  const api = await extension.activate() as { requestLanguageServer?: <T>(method: string, params: unknown) => Promise<T> };
  assert.ok(api.requestLanguageServer, 'SoPHP Core did not expose the test timing request bridge.');
  const uri = vscode.Uri.joinPath(root.uri, 'src', 'Service', 'ControlFlowDiagnostics.php');
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  const expected = ['cleanup();', 'unreachableAfterConditional();', 'unreachableAfterSwitch();',
    'unreachableAfterInfiniteLoop();', 'unreachableAfterInitializedFor();', 'unreachableAfterNeverCall();',
    'unreachableAfterNestedNeverCall();', 'unreachableAfterNeverCondition();', 'unreachableAfterNestedThrow();',
    'unreachableAfterThrowTernary();'];
  const actual = (): string[] => vscode.languages.getDiagnostics(uri)
    .filter((item) => item.source === 'PHP Companion' && item.code === 'php.control-flow.unreachable')
    .map((item) => document.getText(item.range));
  const waitForCount = async (count: number): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && actual().length !== count) await new Promise((resolve) => setTimeout(resolve, 50));
  };
  await waitForCount(expected.length);
  assert.deepStrictEqual(actual(), expected, 'Default onDemand omitted proven same-file never calls or reported an unproven call.');
  const signature = 'function stopNow(): never';
  const returnOffset = document.getText().indexOf(signature) + 'function stopNow(): '.length;
  assert.ok(returnOffset >= 'function stopNow(): '.length, 'The fixture lost its native never declaration.');
  const replaceType = async (oldType: string, newType: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(returnOffset), document.positionAt(returnOffset + oldType.length)), newType);
    assert.ok(await vscode.workspace.applyEdit(edit), `Could not change ${oldType} to ${newType} in the unsaved PHP buffer.`);
    assert.ok(document.isDirty, 'The diagnostic test unexpectedly saved the PHP buffer.');
  };
  await replaceType('never', 'void');
  const withoutNever = expected.filter((item) => !item.includes('Never'));
  await waitForCount(withoutNever.length);
  assert.deepStrictEqual(actual(), withoutNever, 'The editor kept unreachable diagnostics after never became void.');
  await replaceType('void', 'never');
  await waitForCount(expected.length);
  assert.deepStrictEqual(actual(), expected, 'The editor did not restore unreachable diagnostics after never returned.');
  const events: Array<{ version: number; count: number; atMs: number }> = [];
  await api.requestLanguageServer('phpCompanion/testQueryTimings', { reset: true });
  const subscription = vscode.languages.onDidChangeDiagnostics((event) => {
    if (event.uris.some((changed) => changed.toString() === uri.toString())) {
      events.push({ version: document.version, count: actual().length, atMs: performance.now() });
    }
  });
  try {
    for (let round = 0; round < 20; round += 1) {
      await replaceType(round % 2 === 0 ? 'never' : 'void', round % 2 === 0 ? 'void' : 'never');
    }
    const finalStarted = performance.now();
    await replaceType('never', 'void');
    const finalVersion = document.version;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !events.some((event) => event.version >= finalVersion && event.count === withoutNever.length)) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(events.some((event) => event.version >= finalVersion && event.count === withoutNever.length),
      'The editor did not publish diagnostics for the final rapid void edit.');
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.deepStrictEqual(actual(), withoutNever, 'The final rapid edit kept an old never diagnostic.');
    assert.ok(!events.some((event) => event.version >= finalVersion && event.count !== 0 && event.count !== withoutNever.length),
      `A stale diagnostic was published after the final rapid edit: ${JSON.stringify(events)}`);
    const cleared = events.find((event) => event.version >= finalVersion && event.count === 0);
    const restored = events.find((event) => event.version >= finalVersion && event.count === withoutNever.length);
    assert.ok(restored);
    const timings = await api.requestLanguageServer<Record<string, number[]>>('phpCompanion/testQueryTimings', { reset: true });
    console.log(`C2 onDemand native never diagnostics: ${JSON.stringify({ sequential: [expected.length, withoutNever.length, expected.length],
      rapidFinal: withoutNever.length, events: events.length, finalVisibleMs: Math.round(restored.atMs - finalStarted),
      clearedMs: cleared && Math.round(cleared.atMs - finalStarted),
      blankMs: cleared && Math.round(restored.atMs - cleared.atMs), serverDiagnosticsMs: timings.diagnostics?.at(-1),
      serverChangeMs: timings.documentChangeDiagnostics?.at(-1), unsaved: document.isDirty })}`);
  } finally {
    subscription.dispose();
  }
}

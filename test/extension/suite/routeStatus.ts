import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { visibleStatusBarContains } from './c1Ui.js';

interface Registration { dispose(): void; }
interface CoreApi { registerIntegration(contribution: unknown): Registration; }

async function until(check: () => Promise<boolean>, reason: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(reason);
}

export async function run(): Promise<void> {
  const [first, second] = vscode.workspace.workspaceFolders ?? [];
  assert.ok(first && second, 'Route status host needs two independent Composer folders.');
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT);
  assert.ok(Number.isSafeInteger(port) && port > 0, 'Route status host needs Workbench debugging.');
  const core = vscode.extensions.getExtension<CoreApi>('sohophp.php-companion');
  assert.ok(core, 'SoPHP Core is missing from the route status host.');
  const api = await core.activate();
  const stateUri = vscode.Uri.joinPath(first.uri, 'route-status-state.json');
  const providerUri = vscode.Uri.joinPath(first.uri, 'route-status-provider.mjs');
  await vscode.workspace.fs.writeFile(stateUri, Buffer.from(JSON.stringify({ complete: false })));
  await vscode.workspace.fs.writeFile(providerUri, Buffer.from(`import { readFile } from 'node:fs/promises';
let input = ''; for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const state = JSON.parse(await readFile(${JSON.stringify(stateUri.fsPath)}, 'utf8'));
process.stdout.write(JSON.stringify({ protocolVersion: 1, id: request.id, result: {
  schema: 1, providerId: 'test.route-status', generation: request.params.generation,
  complete: state.complete, routes: state.complete ? [{ name: 'profile_user', path: '/profile/user' }] : [],
} }));`));
  const registration = api.registerIntegration({ integrationId: 'test.route-status', routeProviders: [{
    providerId: 'test.route-status', command: process.execPath, args: [providerUri.fsPath],
    timeoutMs: 5_000, replacesStaticRoutes: true, cacheUntilInvalidated: true,
  }] });
  const routeUri = vscode.Uri.joinPath(first.uri, 'src', 'Controller', 'RouteConsumer.php');
  const routeDocument = await vscode.workspace.openTextDocument(routeUri);
  const routePosition = routeDocument.positionAt(routeDocument.getText().indexOf("'profile_'") + "'profile_".length);
  const query = async (): Promise<string[]> => {
    const items = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider', routeUri, routePosition);
    return items?.items.map((item) => String(item.label)) ?? [];
  };
  const statusVisible = async (): Promise<boolean> => visibleStatusBarContains(port, 'SoPHP Routes');
  try {
    await vscode.window.showTextDocument(routeDocument);
    await until(async () => { await query(); return statusVisible(); },
      'Incomplete routes did not display the SoPHP Routes status in the Workbench.');
    assert.ok(!(await query()).includes('profile_user'), 'An incomplete route snapshot returned a route candidate.');

    const otherUri = vscode.Uri.joinPath(second.uri, 'src', 'Controller', 'RouteConsumer.php');
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(otherUri));
    await until(async () => !(await statusVisible()), 'The first project route status remained visible in another project.');
    await vscode.window.showTextDocument(routeDocument);
    await until(statusVisible, 'The route status did not return when the affected project became active.');

    await vscode.workspace.fs.writeFile(stateUri, Buffer.from(JSON.stringify({ complete: true })));
    await until(async () => (await query()).includes('profile_user') && !(await statusVisible()),
      'A complete retry did not restore route completion and clear the status.');
    console.log('Route status Workbench: incomplete, other project, restored, complete');
  } finally { registration.dispose(); }
}

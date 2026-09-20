import * as vscode from 'vscode';
import type { PhpCompanionPluginApi } from '@php-companion/plugin-api';
import { SymfonyIntegration } from './integration.js';

export interface PhpCompanionSymfonyApi {
  version: 1;
  status(): { apiVersion: number; serviceProviderRegistered: boolean; eventProviderRegistered: boolean; controllerContextProviderRegistered: boolean; staticRouteProviderRegistered: boolean; winstarRouteProviderRegistered: boolean };
}

function winstarRoutesEnabled(): boolean {
  return (vscode.workspace.workspaceFolders ?? []).some((folder) =>
    vscode.workspace.getConfiguration('phpCompanion', folder.uri).get<boolean>('symfony.winstarRoutes.enabled', false));
}

export async function activate(context: vscode.ExtensionContext): Promise<PhpCompanionSymfonyApi> {
  const coreExtension = vscode.extensions.getExtension<PhpCompanionPluginApi>('sohophp.php-companion');
  if (!coreExtension) throw new Error('PHP Companion: Symfony requires sohophp.php-companion.');
  const core = await coreExtension.activate();
  const integration = new SymfonyIntegration(core,
    context.asAbsolutePath('dist/service-provider.js'),
    context.asAbsolutePath('dist/event-provider.js'),
    context.asAbsolutePath('dist/controller-context-provider.js'),
    context.asAbsolutePath('dist/static-route-provider.js'), context.asAbsolutePath('dist/winstar-route-provider.js'),
    context.asAbsolutePath('dist/web-tree-sitter.wasm'), context.asAbsolutePath('dist/tree-sitter-php.wasm'));
  const synchronize = (): void => integration.setWinstarRoutesEnabled(winstarRoutesEnabled());
  synchronize();
  context.subscriptions.push(
    integration,
    vscode.workspace.onDidChangeWorkspaceFolders(synchronize),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('phpCompanion.symfony.winstarRoutes.enabled')) synchronize();
    }),
    vscode.commands.registerCommand('phpCompanionSymfony.showStatus', async () => {
      const status = integration.status();
      await vscode.window.showInformationMessage(status.winstarRouteProviderRegistered
        ? 'PHP Companion Symfony is active; services, events, controller contexts, static routes, and Winstar routes are registered.'
        : 'PHP Companion Symfony is active; services, events, controller contexts, and static routes are registered, and Winstar runtime routes are disabled.');
    }),
  );
  return Object.freeze({ version: 1 as const, status: () => integration.status() });
}

export function deactivate(): void {}

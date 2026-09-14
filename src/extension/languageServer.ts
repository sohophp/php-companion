import * as vscode from 'vscode';
import { CloseAction, ErrorAction, LanguageClient, TransportKind, type CloseHandlerResult, type ErrorHandler, type ErrorHandlerResult, type LanguageClientOptions, type ServerOptions } from 'vscode-languageclient/node.js';
import { createRestartBudget, resolveLanguageServerActivation, type LanguageServerActivationDecision } from './languageServerPolicy.js';
import type { FolderState, VersionManager } from './versionManager.js';

interface PhpExtensionAvailabilityEntry {
  uri: string;
  disabledExtensions: string[];
  runtime?: {
    executable: string; version: string; versionId: number; sapi: string; loadedExtensions: string[];
    loadedConfigurationFile?: string; scannedConfigurationFiles: string[];
  };
}

function hasExplicitLanguageServerSetting(configuration: vscode.WorkspaceConfiguration): boolean {
  const inspected = configuration.inspect<boolean>('languageServer.enabled');
  return inspected !== undefined && [
    inspected.globalValue,
    inspected.workspaceValue,
    inspected.workspaceFolderValue,
    inspected.globalLanguageValue,
    inspected.workspaceLanguageValue,
    inspected.workspaceFolderLanguageValue,
  ].some((value) => value !== undefined);
}

export function languageServerActivationDecision(): LanguageServerActivationDecision {
  const configuration = vscode.workspace.getConfiguration('phpCompanion');
  return resolveLanguageServerActivation({
    enabled: configuration.get<boolean>('languageServer.enabled', true),
    explicitlyConfigured: hasExplicitLanguageServerSetting(configuration),
    competingServerInstalled: vscode.extensions.getExtension('bmewburn.vscode-intelephense-client') !== undefined,
  });
}

export async function startLanguageServer(context: vscode.ExtensionContext, output: vscode.LogOutputChannel, versions: VersionManager): Promise<LanguageClient | undefined> {
  const configuration = vscode.workspace.getConfiguration('phpCompanion');
  const activation = languageServerActivationDecision();
  if (!activation.start) {
    if (activation.blockedByCompetingServer) {
      output.warn('PHP Companion Language Server stayed disabled because Intelephense is installed and no explicit phpCompanion.languageServer.enabled choice exists.');
      void vscode.window.showInformationMessage('PHP Companion kept Intelephense as the PHP language provider. Set phpCompanion.languageServer.enabled explicitly to change this choice.');
    }
    return undefined;
  }

  const serverOptions: ServerOptions = {
    run: {
      module: context.asAbsolutePath('dist/language-server.js'),
      transport: TransportKind.stdio,
      args: [
        '--parser-core-wasm', context.asAbsolutePath('dist/web-tree-sitter.wasm'),
        '--php-wasm', context.asAbsolutePath('dist/tree-sitter-php.wasm'),
      ],
    },
    debug: {
      module: context.asAbsolutePath('dist/language-server.js'),
      transport: TransportKind.stdio,
      args: [
        '--parser-core-wasm', context.asAbsolutePath('dist/web-tree-sitter.wasm'),
        '--php-wasm', context.asAbsolutePath('dist/tree-sitter-php.wasm'),
      ],
    },
  };
  const symfonyRouteProviders = (): Array<{ uri: string; external: boolean }> => {
    const available = vscode.extensions.getExtension('symfony.language-tools') !== undefined;
    return (vscode.workspace.workspaceFolders ?? []).map((folder) => ({
      uri: folder.uri.toString(),
      external: available && vscode.workspace.getConfiguration('symfonyLsp', folder.uri).get<boolean>('runtimeIndexing', true),
    }));
  };
  const stateRootUri = (state: FolderState): vscode.Uri => state.projectRoot
    ? state.folder.uri.scheme === 'file' ? vscode.Uri.file(state.projectRoot) : state.folder.uri.with({ path: state.projectRoot.replaceAll('\\', '/') })
    : state.folder.uri;
  const phpExtensionAvailability = (): PhpExtensionAvailabilityEntry[] => {
    const entries = new Map<string, PhpExtensionAvailabilityEntry>();
    for (const folder of vscode.workspace.workspaceFolders ?? []) entries.set(folder.uri.toString(), {
      uri: folder.uri.toString(),
      disabledExtensions: vscode.workspace.getConfiguration('phpCompanion', folder.uri).get<string[]>('disabledExtensions', []),
    });
    for (const state of versions.allStates()) {
      const uri = stateRootUri(state); const runtime = state.runtime;
      entries.set(uri.toString(), {
        uri: uri.toString(),
        disabledExtensions: vscode.workspace.getConfiguration('phpCompanion', uri).get<string[]>('disabledExtensions', []),
        ...(runtime ? { runtime: {
          executable: runtime.path, version: runtime.version, versionId: runtime.versionId, sapi: runtime.sapi,
          loadedExtensions: runtime.loadedExtensions,
          ...(runtime.loadedConfigurationFile ? { loadedConfigurationFile: runtime.loadedConfigurationFile } : {}),
          scannedConfigurationFiles: runtime.scannedConfigurationFiles,
        } } : {}),
      });
    }
    return [...entries.values()];
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'php', scheme: 'file' }, { language: 'php', scheme: 'vscode-remote' }],
    outputChannel: output,
    initializationOptions: () => ({
      phpVersion: configuration.get<string>('phpVersion', 'auto') === 'auto' ? '8.5' : configuration.get<string>('phpVersion', '8.5'),
      cacheDirectory: vscode.Uri.joinPath(context.globalStorageUri, 'semantic-index').fsPath,
      disabledDiagnosticCodes: configuration.get<string[]>('diagnostics.disabledCodes', []),
      diagnosticSeverity: configuration.get<Record<string, string>>('diagnostics.severity', {}),
      semanticProviders: configuration.get<unknown[]>('semanticProviders', []),
      symfonyRouteProviders: symfonyRouteProviders(),
      phpExtensionAvailability: phpExtensionAvailability(),
      testMode: context.extensionMode === vscode.ExtensionMode.Test,
      // PHP Companion stages declaration edits through onWillRenameFiles so a
      // PSR-4 file rename and its text changes remain one undoable operation.
      manualRenameProvider: true,
    }),
    synchronize: { configurationSection: 'phpCompanion' },
    errorHandler: ((): ErrorHandler => {
      const budget = createRestartBudget();
      return {
        error: (_error, _message, count): ErrorHandlerResult => ({
          action: (count ?? 1) <= 3 ? ErrorAction.Continue : ErrorAction.Shutdown,
          message: (count ?? 1) <= 3 ? undefined : 'PHP Companion Language Server encountered repeated protocol errors.',
        }),
        closed: (): CloseHandlerResult => {
          const decision = budget.recordClose();
          return decision.restart
            ? { action: CloseAction.Restart, message: `PHP Companion Language Server stopped unexpectedly; restarting (${decision.recentCloses}/3).` }
            : { action: CloseAction.DoNotRestart, message: 'PHP Companion Language Server stopped repeatedly and will not restart again within this session.' };
        },
      };
    })(),
  };
  const client = new LanguageClient('phpCompanionLanguageServer', 'PHP Companion Language Server', serverOptions, clientOptions);
  await client.start();
  // Register the client before every listener that can write to it. VS Code
  // disposes subscriptions in reverse order, so notification sources are
  // removed before the stdio transport is closed.
  context.subscriptions.push(client);
  let stopping = false;
  const updateRouteProviders = (): void => {
    if (stopping) return;
    void client.sendNotification('phpCompanion/symfonyRouteProviders', { providers: symfonyRouteProviders() }).catch((error: unknown) => {
      if (stopping) return;
      output.warn(`Unable to update Symfony route provider ownership: ${String(error)}`);
    });
  };
  const updatePhpExtensionAvailability = (): void => {
    if (stopping) return;
    void client.sendNotification('phpCompanion/phpExtensionAvailability', { roots: phpExtensionAvailability() }).catch((error: unknown) => {
      if (stopping) return;
      output.warn(`Unable to update PHP extension availability: ${String(error)}`);
    });
  };
  context.subscriptions.push(
    versions.onDidChangeState(updatePhpExtensionAvailability),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('symfonyLsp.runtimeIndexing')) updateRouteProviders();
      if (event.affectsConfiguration('phpCompanion.disabledExtensions')) updatePhpExtensionAvailability();
      if (event.affectsConfiguration('phpCompanion.phpExecutablePath') || event.affectsConfiguration('phpCompanion.phpVersion')) {
        void versions.refresh().catch((error: unknown) => output.warn(`Unable to refresh PHP runtime detection: ${String(error)}`));
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => { updateRouteProviders(); updatePhpExtensionAvailability(); }),
    vscode.extensions.onDidChange(updateRouteProviders),
  );
  updateRouteProviders();
  updatePhpExtensionAvailability();
  for (const document of vscode.workspace.textDocuments) if (document.languageId === 'php' && !document.isUntitled) {
    void versions.ensureForUri(document.uri).catch((error: unknown) => output.warn(`Unable to detect PHP runtime for ${document.uri.toString()}: ${String(error)}`));
  }

  context.subscriptions.push(vscode.commands.registerCommand('phpCompanion.provideTwigInterop', async (root: vscode.Uri | string): Promise<unknown> => {
    const rootUri = typeof root === 'string' ? root : root?.toString();
    return rootUri ? client.sendRequest('phpCompanion/interop/contexts', { rootUri }) : null;
  }));
  if (context.extensionMode === vscode.ExtensionMode.Test) context.subscriptions.push(vscode.commands.registerCommand('phpCompanion._testCrashLanguageServer', async (): Promise<void> => {
    if (!await client.sendRequest<boolean>('phpCompanion/testCrash')) throw new Error('Language Server rejected the test crash request.');
    await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 100));
  }));
  // This is intentionally registered last so it runs first during disposal.
  context.subscriptions.push({ dispose: () => { stopping = true; } });
  output.info('PHP Companion Language Server started.');
  return client;
}

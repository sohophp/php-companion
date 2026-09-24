import * as vscode from 'vscode';
import { CloseAction, ErrorAction, LanguageClient, TransportKind, type CloseHandlerResult, type ErrorHandler, type ErrorHandlerResult, type LanguageClientOptions, type PublishDiagnosticsParams, type ServerOptions } from 'vscode-languageclient/node.js';
import { createRestartBudget, resolveLanguageServerActivation, type LanguageServerActivationDecision } from './languageServerPolicy.js';
import type { FolderState, VersionManager } from './versionManager.js';
import type { IntegrationRegistry } from './integrationRegistry.js';
import { t } from './localize.js';

interface PhpExtensionAvailabilityEntry {
  uri: string;
  disabledExtensions: string[];
  runtime?: {
    executable: string; version: string; versionId: number; sapi: string; loadedExtensions: string[];
    loadedConfigurationFile?: string; scannedConfigurationFiles: string[];
  };
}

interface FrameworkDocumentSnapshot { uri: string; languageId: 'yaml' | 'xml'; source: string; snapshotVersion: string; }

function openFrameworkDocuments(): { complete: boolean; documents: FrameworkDocumentSnapshot[] } {
  const documents: FrameworkDocumentSnapshot[] = []; let characters = 0;
  for (const document of vscode.workspace.textDocuments.filter((candidate) => ['yaml', 'xml'].includes(candidate.languageId) && !candidate.isUntitled)
    .sort((left, right) => left.uri.toString().localeCompare(right.uri.toString()))) {
    const source = document.getText();
    if (source.length > 1_000_000 || documents.length >= 128 || characters + source.length > 8 * 1024 * 1024) return { complete: false, documents: [] };
    characters += source.length; documents.push({ uri: document.uri.toString(), languageId: document.languageId as 'yaml' | 'xml',
      source, snapshotVersion: String(document.version) });
  }
  return { complete: true, documents };
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

export async function startLanguageServer(context: vscode.ExtensionContext, output: vscode.LogOutputChannel, versions: VersionManager, integrations: IntegrationRegistry): Promise<LanguageClient | undefined> {
  const configuration = vscode.workspace.getConfiguration('phpCompanion');
  const projectPhpVersions = (): Array<{ uri: string; version: string }> => {
    const entries = new Map<string, string>();
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const requested = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get<string>('phpVersion', 'auto');
      entries.set(folder.uri.toString(), requested === 'auto'
        ? versions.stateForUri(folder.uri)?.resolution.target ?? '7.2' : requested);
    }
    for (const state of versions.allStates()) if (state.projectRoot) {
      entries.set(stateRootUri(state).toString(), state.resolution.target);
    }
    return [...entries].map(([uri, version]) => ({ uri, version }));
  };
  const activation = languageServerActivationDecision();
  if (!activation.start) {
    if (activation.blockedByCompetingServer) {
      output.warn('SoPHP Language Server stayed disabled because Intelephense is installed and no explicit phpCompanion.languageServer.enabled choice exists.');
      void vscode.window.showInformationMessage(t('keptIntelephense'));
    }
    return undefined;
  }
  try { await versions.refresh(); }
  catch (error) { output.warn(`Unable to resolve PHP versions before starting SoPHP: ${String(error)}`); }

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
  const symfonyRouteProviders = (): Array<{ uri: string; external: boolean; environment?: string }> => {
    const available = vscode.extensions.getExtension('symfony.language-tools') !== undefined;
    return (vscode.workspace.workspaceFolders ?? []).map((folder) => {
      const environment = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get<string | null>('symfony.environment', null)?.trim();
      return {
        uri: folder.uri.toString(),
        external: available && vscode.workspace.getConfiguration('symfonyLsp', folder.uri).get<boolean>('runtimeIndexing', true),
        ...(environment && /^[A-Za-z0-9_.-]{1,64}$/.test(environment) ? { environment } : {}),
      };
    });
  };
  const bundledRouteProviders = (): unknown[] => integrations.routeProviders();
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
    middleware: {
      provideCodeActions: async (document, range, context, token, next) => {
        const sourceVersion = document.version;
        const sourceText = document.getText();
        const actions = await next(document, range, context, token);
        if (!actions || token.isCancellationRequested) return actions;
        for (const action of actions) {
          if (!(action instanceof vscode.CodeAction) || !action.edit
            || action.kind?.value !== vscode.CodeActionKind.RefactorExtract.value) continue;
          const edit = action.edit;
          action.edit = undefined;
          action.command = { title: action.title, command: 'phpCompanion.applyPreviewedExtract',
            arguments: [{ edit, title: action.title, sourceUri: document.uri, sourceVersion, sourceText }] };
        }
        return actions;
      },
    },
    initializationOptions: () => ({
      phpVersion: projectPhpVersions()[0]?.version ?? (configuration.get<string>('phpVersion', 'auto') === 'auto'
        ? '7.2' : configuration.get<string>('phpVersion', '7.2')),
      phpVersions: projectPhpVersions(),
      indexingMode: configuration.get<'off' | 'onDemand' | 'progressive' | 'experimental'>('indexing.mode', 'onDemand'),
      referenceMemoryBudgetMiB: configuration.get<number>('indexing.referenceMemoryBudgetMiB', 1536),
      experimentalReferenceSourceOnly: configuration.get<boolean>('indexing.experimentalSourceOnlyReferences', false),
      cacheDirectory: vscode.Uri.joinPath(context.globalStorageUri, 'semantic-index').fsPath,
      indexLimits: {
        maxFiles: configuration.get<number>('indexing.maxFiles', 10_000),
        maxFileSizeBytes: configuration.get<number>('indexing.maxFileSizeKb', 512) * 1024,
        maxTotalBytes: configuration.get<number>('indexing.maxTotalMb', 128) * 1024 * 1024,
      },
      disabledDiagnosticCodes: configuration.get<string[]>('diagnostics.disabledCodes', []),
      diagnosticSeverity: configuration.get<Record<string, string>>('diagnostics.severity', {}),
      semanticProviders: configuration.get<unknown[]>('semanticProviders', []),
      bundledSemanticProviders: integrations.semanticProviders(),
      routeProviders: configuration.get<unknown[]>('routeProviders', []),
      bundledRouteProviders: bundledRouteProviders(),
      symfonyRouteProviders: symfonyRouteProviders(),
      phpExtensionAvailability: phpExtensionAvailability(),
      frameworkDocumentSnapshots: openFrameworkDocuments(),
      versionedDiagnostics: true,
      testMode: context.extensionMode === vscode.ExtensionMode.Test,
      // SoPHP stages declaration edits through onWillRenameFiles so a
      // PSR-4 file rename and its text changes remain one undoable operation.
      manualRenameProvider: true,
    }),
    synchronize: { configurationSection: 'phpCompanion' },
    errorHandler: ((): ErrorHandler => {
      const budget = createRestartBudget();
      return {
        error: (_error, _message, count): ErrorHandlerResult => ({
          action: (count ?? 1) <= 3 ? ErrorAction.Continue : ErrorAction.Shutdown,
          message: (count ?? 1) <= 3 ? undefined : 'SoPHP Language Server encountered repeated protocol errors.',
        }),
        closed: (): CloseHandlerResult => {
          const decision = budget.recordClose();
          return decision.restart
            ? { action: CloseAction.Restart, message: `SoPHP Language Server stopped unexpectedly; restarting (${decision.recentCloses}/3).` }
            : { action: CloseAction.DoNotRestart, message: 'SoPHP Language Server stopped repeatedly and will not restart again within this session.' };
        },
      };
    })(),
  };
  const client = new LanguageClient('phpCompanionLanguageServer', 'SoPHP Language Server', serverOptions, clientOptions);
  // VS Code disposes subscriptions in reverse order; notification sources
  // leave before their language client and stdio transport.
  context.subscriptions.push(client);
  context.subscriptions.push(client.onNotification('phpCompanion/versionedDiagnostics', async (params: PublishDiagnosticsParams): Promise<void> => {
    if (typeof params.version !== 'number') return;
    const uri = vscode.Uri.parse(params.uri);
    const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === params.uri);
    if (!document || document.version !== params.version) return;
    const diagnostics = await client.protocol2CodeConverter.asDiagnostics(params.diagnostics);
    if (vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === params.uri) !== document
      || document.version !== params.version) return;
    client.diagnostics?.set(uri, diagnostics);
  }));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId === 'php' && event.contentChanges.length) client.diagnostics?.delete(event.document.uri);
  }));
  await client.start();
  context.subscriptions.push(client.onRequest('phpCompanion/resolveSymfonyRouteRename', async (params: unknown): Promise<unknown> => {
    const request = params as { rootUri?: unknown; oldName?: unknown; newName?: unknown } | null;
    if (!request || typeof request.rootUri !== 'string' || typeof request.oldName !== 'string' || typeof request.newName !== 'string') {
      return { complete: false, edits: [] };
    }
    const command = 'twigPlus.provideSymfonyRouteRename';
    try {
      return await vscode.commands.executeCommand(command, request);
    } catch (error) {
      output.warn(`TwigPlus could not provide complete Symfony route rename edits: ${String(error)}`);
      return { complete: false, edits: [] };
    }
  }));
  let stopping = false;
  let versionRestartTimer: ReturnType<typeof setTimeout> | undefined;
  let versionSignature = JSON.stringify(projectPhpVersions());
  const scheduleVersionRestart = (): void => {
    if (stopping) return;
    if (versionRestartTimer) clearTimeout(versionRestartTimer);
    versionRestartTimer = setTimeout(() => {
      versionRestartTimer = undefined;
      if (!stopping) void client.restart().catch((error: unknown) => output.warn(`Unable to restart SoPHP for PHP version settings: ${String(error)}`));
    }, 250);
  };
  let referencePrewarmTimer: ReturnType<typeof setTimeout> | undefined;
  const prewarmActiveReference = (): void => {
    if (referencePrewarmTimer) clearTimeout(referencePrewarmTimer);
    referencePrewarmTimer = undefined;
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (stopping || !editor || !document || document.languageId !== 'php' || document.isUntitled
      || !['file', 'vscode-remote'].includes(document.uri.scheme)) return;
    const { active: position } = editor.selection;
    referencePrewarmTimer = setTimeout(() => {
      referencePrewarmTimer = undefined;
      if (stopping || vscode.window.activeTextEditor !== editor || editor.document.version !== document.version
        || !editor.selection.active.isEqual(position)) return;
      void client.sendNotification('phpCompanion/prewarmReferenceAt', {
        uri: document.uri.toString(), version: document.version,
        position: { line: position.line, character: position.character },
      }).catch((error: unknown) => { if (!stopping) output.warn(`Unable to prewarm PHP references: ${String(error)}`); });
    }, 300);
  };
  const updateRouteProviders = (): void => {
    if (stopping) return;
    void client.sendNotification('phpCompanion/symfonyRouteProviders', { providers: symfonyRouteProviders() }).catch((error: unknown) => {
      if (stopping) return;
      output.warn(`Unable to update Symfony route provider ownership: ${String(error)}`);
    });
  };
  const updateBundledRouteProviders = (): void => {
    if (stopping) return;
    void client.sendNotification('phpCompanion/bundledRouteProviders', { providers: bundledRouteProviders() }).catch((error: unknown) => {
      if (stopping) return;
      output.warn(`Unable to update bundled route providers: ${String(error)}`);
    });
  };
  const updateIntegrationProviders = (): void => {
    if (stopping) return;
    void Promise.all([
      client.sendNotification('phpCompanion/bundledSemanticProviders', { providers: integrations.semanticProviders() }),
      client.sendNotification('phpCompanion/bundledRouteProviders', { providers: bundledRouteProviders() }),
    ]).catch((error: unknown) => {
      if (stopping) return;
      output.warn(`Unable to update SoPHP integrations: ${String(error)}`);
    });
  };
  const updatePhpExtensionAvailability = (): void => {
    if (stopping) return;
    void client.sendNotification('phpCompanion/phpExtensionAvailability', { roots: phpExtensionAvailability() }).catch((error: unknown) => {
      if (stopping) return;
      output.warn(`Unable to update PHP extension availability: ${String(error)}`);
    });
  };
  const updateVersionState = (): void => {
    const nextVersions = projectPhpVersions();
    const nextSignature = JSON.stringify(nextVersions);
    if (nextSignature !== versionSignature) {
      versionSignature = nextSignature;
      void client.sendNotification('phpCompanion/phpVersions', { versions: nextVersions,
        fallback: nextVersions[0]?.version, extensionAvailability: phpExtensionAvailability() }).catch((error: unknown) => {
        if (!stopping) output.warn(`Unable to update SoPHP PHP versions: ${String(error)}`);
      });
    } else updatePhpExtensionAvailability();
  };
  let frameworkSnapshotTimer: ReturnType<typeof setTimeout> | undefined;
  const updateFrameworkDocumentSnapshots = (): void => {
    if (stopping) return;
    if (frameworkSnapshotTimer) clearTimeout(frameworkSnapshotTimer);
    frameworkSnapshotTimer = setTimeout(() => {
      frameworkSnapshotTimer = undefined;
      void client.sendNotification('phpCompanion/frameworkDocumentSnapshots', openFrameworkDocuments()).catch((error: unknown) => {
        if (!stopping) output.warn(`Unable to update framework document snapshots: ${String(error)}`);
      });
    }, 250);
  };
  context.subscriptions.push(
    integrations.onDidChange(updateIntegrationProviders),
    versions.onDidChangeState(updateVersionState),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('symfonyLsp.runtimeIndexing') || event.affectsConfiguration('phpCompanion.symfony.environment')) updateRouteProviders();
      if (event.affectsConfiguration('phpCompanion.symfony.winstarRoutes.enabled')) updateBundledRouteProviders();
      if (event.affectsConfiguration('phpCompanion.disabledExtensions')) updatePhpExtensionAvailability();
      if (event.affectsConfiguration('phpCompanion.phpExecutablePath') || event.affectsConfiguration('phpCompanion.phpVersion')) {
        void versions.refresh().catch((error: unknown) =>
          output.warn(`Unable to refresh PHP runtime detection: ${String(error)}`));
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void versions.refresh().then(scheduleVersionRestart).catch((error: unknown) =>
        output.warn(`Unable to refresh PHP folders: ${String(error)}`));
      updateRouteProviders(); updateBundledRouteProviders(); updatePhpExtensionAvailability();
    }),
    vscode.extensions.onDidChange(() => { updateRouteProviders(); updateBundledRouteProviders(); }),
    vscode.workspace.onDidOpenTextDocument((document) => { if (['yaml', 'xml'].includes(document.languageId)) updateFrameworkDocumentSnapshots(); }),
    vscode.workspace.onDidChangeTextDocument((event) => { if (['yaml', 'xml'].includes(event.document.languageId)) updateFrameworkDocumentSnapshots(); }),
    vscode.workspace.onDidCloseTextDocument((document) => { if (['yaml', 'xml'].includes(document.languageId)) updateFrameworkDocumentSnapshots(); }),
    { dispose: () => { if (frameworkSnapshotTimer) clearTimeout(frameworkSnapshotTimer); if (versionRestartTimer) clearTimeout(versionRestartTimer); } },
    vscode.window.onDidChangeActiveTextEditor(prewarmActiveReference),
    vscode.window.onDidChangeTextEditorSelection(prewarmActiveReference),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) prewarmActiveReference();
    }),
    { dispose: () => { if (referencePrewarmTimer) clearTimeout(referencePrewarmTimer); } },
  );
  prewarmActiveReference();
  updateRouteProviders();
  updateIntegrationProviders();
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
  output.info('SoPHP Language Server started.');
  return client;
}

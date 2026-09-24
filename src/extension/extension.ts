import { PhpSyntaxParser, namespaceDeclarations } from '@php-companion/parser';
import * as vscode from 'vscode';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { resolvePsr4Namespace, resolvePsr4Namespaces } from '../composer/project.js';
import { performance } from 'node:perf_hooks';
import { VersionManager } from './versionManager.js';
import { WorkspaceManager } from './workspaceManager.js';
import { createPhpType, registerPhpTypePreviewProvider, type PhpTypeKind } from '../generation/createType.js';
import { copyIdentity, CurrentDocumentDiagnostics, NamespaceCodeActions } from '../editor/currentDocument.js';
import { PhpRenameProvider } from '../refactor/rename.js';
import { forgetRenamePreviewSnapshots, openRenamePreviewSnapshot, registerRenamePreviewProvider } from '../refactor/renamePreview.js';
import { PHP_IMPORT_METADATA_MIME, PHP_IMPORT_PASTE_KIND, PhpImportPasteProvider, phpPasteMetadata, resolveDocumentImports } from '../paste/importPasteProvider.js';
import { mayNeedPhpImportResolution, potentialPhpTypeNames } from '../paste/pasteText.js';
import {
  buildMoveEdits,
  buildMoveReconciliationEdits,
  describeMoveReconciliation,
  MoveError,
  type MoveReconciliation,
} from '../refactor/move.js';
import { buildAddImportEdit, buildOptimizeImportsEdit, rankedImportCandidates } from '../imports/importWorkflows.js';
import { ImportClassCodeActions, typeNameAt } from '../imports/providers.js';
import { withBoundedRetry } from '../refactor/retry.js';
import { languageServerActivationDecision, startLanguageServer } from './languageServer.js';
import { composerRequiresSymfony } from './languageServerPolicy.js';
import { BUILTIN_DOCUMENT_URI, builtinPhpStub, parseBuiltinDocumentUri, SUPPORTED_PHP_VERSIONS, type SupportedPhpVersion } from '@php-companion/language-spec';
import type { PhpCompanionPluginApi } from '@php-companion/plugin-api';
import { IntegrationRegistry } from './integrationRegistry.js';
import { t } from './localize.js';
import { configuredPasteImportMode, configuredRenameFileMode } from './legacySettings.js';

function offsetAt(source: string, position: vscode.Position): number {
  let offset = 0;
  for (let line = 0; line < position.line; line += 1) {
    const newline = source.indexOf('\n', offset);
    if (newline < 0) return source.length;
    offset = newline + 1;
  }
  return offset + position.character;
}

function positionAt(source: string, offset: number): vscode.Position {
  const lines = source.slice(0, offset).split('\n');
  return new vscode.Position(lines.length - 1, lines.at(-1)!.length);
}

async function recommendStandaloneSymfony(context: vscode.ExtensionContext, output: vscode.LogOutputChannel): Promise<void> {
  const extensionId = 'sohophp.php-companion-symfony';
  const stateKey = 'phpCompanion.symfonyExtensionRecommendation.v1';
  if (vscode.extensions.getExtension(extensionId) || context.workspaceState.get<boolean>(stateKey, false)) return;
  let detected = false;
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    try {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder.uri, 'composer.json'));
      if (composerRequiresSymfony(JSON.parse(Buffer.from(bytes).toString('utf8')))) { detected = true; break; }
    } catch {
      // Missing or invalid Composer manifests are handled by the normal project diagnostics.
    }
  }
  if (!detected) return;
  await context.workspaceState.update(stateKey, true);
  output.warn('Symfony FrameworkBundle detected without the standalone SoPHP Symfony extension.');
  const action = t('showSymfony');
  if (await vscode.window.showInformationMessage(
    t('symfonyRecommendation'), action,
  ) === action) {
    await vscode.commands.executeCommand('workbench.extensions.search', `@id:${extensionId}`);
  }
}

function immediateNamespaceMoveEdit(files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri; source: string }[], versions: VersionManager, parser: PhpSyntaxParser): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  for (const file of files) {
    const mappings = versions.stateForUri(file.oldUri)?.composer?.psr4 ?? versions.stateForUri(file.newUri)?.composer?.psr4 ?? [];
    const parsed = parser.parse(file.source);
    try {
      const declarations = namespaceDeclarations(parsed.tree);
      if (parsed.errors.length || declarations.length !== 1) throw new MoveError(t('moveValidNamespace'));
      const declaration = declarations[0]!;
      const sourceMappings = mappings.filter((mapping) => resolvePsr4Namespaces(file.oldUri.fsPath, [mapping]).includes(declaration.name));
      const preferred = resolvePsr4Namespaces(file.newUri.fsPath, sourceMappings);
      const candidates = preferred.length ? preferred : resolvePsr4Namespaces(file.newUri.fsPath, mappings);
      if (candidates.length !== 1) throw new MoveError(t('moveAmbiguousNamespace'));
      edit.replace(file.oldUri, new vscode.Range(positionAt(file.source, declaration.start), positionAt(file.source, declaration.end)), candidates[0]!);
    } finally { parsed.tree.delete(); }

  }
  return edit;
}

function applyTextEdits(source: string, edits: readonly vscode.TextEdit[]): string {
  return [...edits].sort((left, right) => offsetAt(source, right.range.start) - offsetAt(source, left.range.start)).reduce((result, edit) => {
    const start = offsetAt(result, edit.range.start);
    const end = offsetAt(result, edit.range.end);
    return `${result.slice(0, start)}${edit.newText}${result.slice(end)}`;
  }, source);
}

type ProtocolTextEdit = { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string };
type ProtocolDocumentChange = { kind: 'rename'; oldUri: string; newUri: string; options?: { overwrite?: boolean } }
  | { textDocument: { uri: string; version: number | null }; edits: ProtocolTextEdit[] };
type ProtocolWorkspaceEdit = { changes?: Record<string, ProtocolTextEdit[]>; documentChanges?: ProtocolDocumentChange[];
  phpCompanion?: { sourceHashes?: Record<string, string> } };

async function verifyRenameSources(result: ProtocolWorkspaceEdit): Promise<void> {
  const hashes = result.phpCompanion?.sourceHashes;
  if (!hashes) throw new Error('Rename omitted source snapshots. Run Rename again.');
  const editedUris = new Set([...Object.keys(result.changes ?? {}),
    ...(result.documentChanges ?? []).flatMap((change) => 'textDocument' in change ? [change.textDocument.uri] : [])]);
  for (const uri of editedUris) if (!hashes[uri]) throw new Error('Rename omitted a source snapshot. Run Rename again.');
  for (const [uri, expected] of Object.entries(hashes)) {
    const targetUri = vscode.Uri.parse(uri);
    const open = vscode.workspace.textDocuments.find((item) => item.uri.toString() === uri);
    const source = open?.getText() ?? Buffer.from(await vscode.workspace.fs.readFile(targetUri)).toString('utf8');
    if (createHash('sha256').update(source).digest('hex') !== expected) {
      throw new Error('A PHP file changed while Rename edits were being prepared. Run Rename again.');
    }
  }
}

function fileOperationUriKey(value: vscode.Uri | string): string {
  const uri = typeof value === 'string' ? vscode.Uri.parse(value) : value;
  return uri.scheme === 'file' && process.platform === 'win32' ? uri.fsPath.toLowerCase() : uri.toString();
}

function fileRenameKey(oldUri: vscode.Uri | string, newUri: vscode.Uri | string): string {
  return `${fileOperationUriKey(oldUri)}→${fileOperationUriKey(newUri)}`;
}

function fileRenamesKey(files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[]): string {
  return files.map((file) => fileRenameKey(file.oldUri, file.newUri)).sort().join('|');
}

function fromProtocolWorkspaceEdit(result: ProtocolWorkspaceEdit | null | undefined): vscode.WorkspaceEdit | undefined {
  if (!result) return undefined;
  const edit = new vscode.WorkspaceEdit();
  for (const change of result.documentChanges ?? []) {
    if ('kind' in change) edit.renameFile(vscode.Uri.parse(change.oldUri), vscode.Uri.parse(change.newUri), { overwrite: change.options?.overwrite ?? false });
    else for (const item of change.edits) edit.replace(vscode.Uri.parse(change.textDocument.uri), new vscode.Range(item.range.start.line, item.range.start.character, item.range.end.line, item.range.end.character), item.newText);
  }
  for (const [uri, edits] of Object.entries(result.changes ?? {})) for (const item of edits) {
    edit.replace(vscode.Uri.parse(uri), new vscode.Range(item.range.start.line, item.range.start.character, item.range.end.line, item.range.end.character), item.newText);
  }
  return edit;
}

function splitProtocolTypeRenameEdit(result: ProtocolWorkspaceEdit | null | undefined): {
  edit?: vscode.WorkspaceEdit;
  staged?: { key: string; edit: vscode.WorkspaceEdit };
} {
  if (!result) return {};
  const renames = (result.documentChanges ?? []).filter((change): change is Extract<ProtocolDocumentChange, { kind: 'rename' }> => 'kind' in change);
  if (renames.length !== 1) return { edit: fromProtocolWorkspaceEdit(result) };
  const rename = renames[0]!;
  const edit = new vscode.WorkspaceEdit();
  const staged = new vscode.WorkspaceEdit();
  for (const change of result.documentChanges ?? []) {
    if ('kind' in change) continue;
    const target = change.textDocument.uri === rename.oldUri ? staged : edit;
    for (const item of change.edits) target.replace(vscode.Uri.parse(change.textDocument.uri), new vscode.Range(item.range.start.line, item.range.start.character, item.range.end.line, item.range.end.character), item.newText);
  }
  for (const [uri, edits] of Object.entries(result.changes ?? {})) for (const item of edits) {
    edit.replace(vscode.Uri.parse(uri), new vscode.Range(item.range.start.line, item.range.start.character, item.range.end.line, item.range.end.character), item.newText);
  }
  edit.renameFile(vscode.Uri.parse(rename.oldUri), vscode.Uri.parse(rename.newUri), { overwrite: rename.options?.overwrite ?? false });
  return { edit, staged: staged.entries().length ? { key: fileRenameKey(rename.oldUri, rename.newUri), edit: staged } : undefined };
}

function replacePasteAliases(source: string, replacements: Record<string, string>): string {
  let result = source;
  for (const [before, after] of Object.entries(replacements)) result = result.replace(
    new RegExp(`\\b${before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), after,
  );
  return result;
}

export async function activate(context: vscode.ExtensionContext): Promise<PhpCompanionPluginApi> {
  const started = performance.now();
  const output = vscode.window.createOutputChannel('SoPHP', { log: true });
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  const versions = new VersionManager(status);
  const integrations = new IntegrationRegistry();
  const selfLanguageServer = languageServerActivationDecision().start;
  const diagnostics = new CurrentDocumentDiagnostics(versions, selfLanguageServer);
  const delegatedSafeMoves = new Set<string>();
  const pendingSafeMoves = new Map<string, MoveReconciliation[]>();
  type ServerMoveReconciliation = { oldUri: string; newUri: string; newNamespace: string; sourceUris: string[]; declarations: Array<{ oldFqcn: string; newFqcn: string }> };
  type PendingServerSafeMove = {
    files: Array<{ oldUri: vscode.Uri; newUri: vscode.Uri; source: string }>;
    reconciliation?: ServerMoveReconciliation[];
  };
  const pendingServerSafeMoves = new Map<string, PendingServerSafeMove>();
  const reconcilingServerSafeMoves = new Set<string>();
  const pendingMovePlanning = new Map<string, Promise<void>>();
  const pendingTypeRenameEdits = new Map<string, vscode.WorkspaceEdit>();
  let moveSequence = 0;
  let movePipeline: Promise<void> = Promise.resolve();
  let moveParserPromise: Promise<PhpSyntaxParser> | undefined;
  const moveParser = (): Promise<PhpSyntaxParser> => moveParserPromise ??= PhpSyntaxParser.create({ coreWasmPath: context.asAbsolutePath('dist/web-tree-sitter.wasm'), phpWasmPath: context.asAbsolutePath('dist/tree-sitter-php.wasm') });
  let workspacePromise: Promise<WorkspaceManager> | undefined;

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('php-companion-builtin', {
    provideTextDocumentContent: (uri) => {
      const snapshot = parseBuiltinDocumentUri(uri.toString());
      if (snapshot) return builtinPhpStub(snapshot.version, { disabledExtensions: snapshot.disabledExtensions });
      if (uri.toString() !== BUILTIN_DOCUMENT_URI) return '';
      const requested = vscode.workspace.getConfiguration('phpCompanion').get<string>('phpVersion', 'auto');
      const target = (SUPPORTED_PHP_VERSIONS as readonly string[]).includes(requested) ? requested as SupportedPhpVersion : '8.5';
      return builtinPhpStub(target);
    },
  }));
  context.subscriptions.push(registerPhpTypePreviewProvider());
  context.subscriptions.push(registerRenamePreviewProvider());

  const languageServer = startLanguageServer(context, output, versions, integrations).then((client) => {
    return client;
  }).catch((error) => {
    output.error(`PHP language server failed to start: ${error instanceof Error ? error.message : String(error)}`);
    void vscode.window.showErrorMessage(t('languageServerFailed'));
    return undefined;
  });
  void vscode.commands.executeCommand('setContext', 'phpCompanion.safeRenameAvailable', false)
    .then(() => languageServer)
    .then((client) => vscode.commands.executeCommand('setContext', 'phpCompanion.safeRenameAvailable', Boolean(selfLanguageServer && client)));
  integrations.setRequestHandler(async (method: string, params: unknown): Promise<unknown> => {
    const client = await languageServer;
    if (!client) throw new Error('SoPHP language server is not available.');
    return client.sendRequest<unknown>(method, params);
  });
  void recommendStandaloneSymfony(context, output);
  type PasteSymbol = { fqcn: string; alias: string; selectedAlias?: string };
  type ImportPlanResponse = { replacements: Record<string, string>; conflict?: { fqcn: string; sourceAlias: string }; edit?: ProtocolWorkspaceEdit };
  type SafeMoveResponse = { edit?: ProtocolWorkspaceEdit; error?: string; sources?: Record<string, string>; reconciliation?: ServerMoveReconciliation[] };
  const requestImportPlan = async (document: vscode.TextDocument, position: vscode.Position, symbols: readonly PasteSymbol[]): Promise<ImportPlanResponse | null> => {
    const client = await languageServer; if (!client) return null;
    return client.sendRequest<ImportPlanResponse | null>('phpCompanion/planTypeImports', {
      textDocument: { uri: document.uri.toString() }, position,
      symbols: symbols.map((symbol) => ({ fqcn: symbol.fqcn, sourceAlias: symbol.alias, alias: symbol.selectedAlias })),
    });
  };
  const requestSafeMovePlan = async (files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri; source?: string }[], includeFileOperations: boolean, requireCompleteIndex = false): Promise<{ edit: vscode.WorkspaceEdit; reconciliation: ServerMoveReconciliation[] }> => {
    const client = await languageServer;
    if (!client) throw new MoveError(t('languageServerUnavailable'));
    const moveId = ++moveSequence; const started = performance.now();
    output.info(`[move:${moveId}] planning files=${files.length}`);
    const result = await client.sendRequest<SafeMoveResponse>('phpCompanion/planSafeMove', {
      moves: files.map((file) => ({ oldUri: file.oldUri.toString(), newUri: file.newUri.toString(), ...(file.source === undefined ? {} : { source: file.source }) })),
      includeFileOperations, requireCompleteIndex,
    });
    if (result.error) throw new MoveError(result.error);
    const edit = fromProtocolWorkspaceEdit(result.edit);
    if (!edit) throw new MoveError(t('movePlanIncomplete'));
    const snapshots = await Promise.all(Object.entries(includeFileOperations || requireCompleteIndex ? result.sources ?? {} : {}).map(async ([uri, source]) => ({
      document: await vscode.workspace.openTextDocument(vscode.Uri.parse(uri)), source,
    })));
    if (snapshots.some(({ document, source }) => document.getText() !== source)) throw new MoveError(t('moveParticipantsChanged'));
    output.info(`[move:${moveId}] planned elapsedMs=${Math.round(performance.now() - started)} editedFiles=${edit.entries().length}`);
    return { edit, reconciliation: result.reconciliation ?? [] };
  };
  const requestSafeMove = async (files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[], includeFileOperations: boolean): Promise<vscode.WorkspaceEdit> =>
    (await requestSafeMovePlan(files, includeFileOperations)).edit;
  const requestMoveReconciliation = async (moves: readonly ServerMoveReconciliation[]): Promise<vscode.WorkspaceEdit> => {
    const client = await languageServer;
    if (!client) throw new MoveError(t('languageServerUnavailable'));
    const result = await client.sendRequest<SafeMoveResponse>('phpCompanion/reconcileSafeMove', { moves });
    if (result.error) throw new MoveError(result.error);
    const edit = fromProtocolWorkspaceEdit(result.edit);
    if (!edit) throw new MoveError(t('moveReconciliationIncomplete'));
    // A move or typing can change a document while the server plans. Never
    // apply ranges from the old text to the current editor (VS Code clamps
    // an oversized end column, which can silently consume the semicolon).
    const participants = await Promise.all(edit.entries().map(async ([uri]) => ({ uri, document: await vscode.workspace.openTextDocument(uri) })));
    for (const { uri, document } of participants) {
      if (result.sources?.[uri.toString()] !== document.getText()) throw new MoveError(t('moveSnapshotChanged', uri.fsPath));
    }
    return edit;
  };

  const workspace = (): Promise<WorkspaceManager> => {
    workspacePromise ??= WorkspaceManager.create(context, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? [], output);
    return workspacePromise;
  };

  const applyMoveReconciliation = async (edits: vscode.WorkspaceEdit): Promise<void> => {
    if (edits.entries().length && !await vscode.workspace.applyEdit(edits)) throw new MoveError(t('moveUpdateFailed'));

  };

  const reconcileServerMove = async (moves: readonly ServerMoveReconciliation[]): Promise<void> => {
    // Preserve dirty editor buffers; reconciliation uses the open document snapshot.
    await applyMoveReconciliation(await requestMoveReconciliation(moves));
    for (const move of moves) {
      const uri = vscode.Uri.parse(move.newUri);
      const document = await vscode.workspace.openTextDocument(uri);
      const parsed = (await moveParser()).parse(document.getText());
      try {
        const declarations = namespaceDeclarations(parsed.tree);
        if (parsed.errors.length || declarations.length !== 1 || declarations[0]!.name !== move.newNamespace) throw new MoveError(t('movedFileInvalid', uri.fsPath));
      } finally { parsed.tree.delete(); }
    }
    const remaining = await requestMoveReconciliation(moves);
    if (remaining.entries().length) throw new MoveError(t('moveEditsRemaining', String(remaining.entries().length)));
  };

  const rollbackUnplannedServerMove = async (pending: PendingServerSafeMove): Promise<void> => {
    for (const file of pending.files) {
      try { await vscode.workspace.fs.stat(file.newUri); }
      catch (error) {
        if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') throw new MoveError(t('moveRollbackUnavailable', file.newUri.fsPath));
        throw error;
      }
      try {
        await vscode.workspace.fs.stat(file.oldUri);
        throw new MoveError(t('moveRollbackExists', file.oldUri.fsPath));
      } catch (error) {
        if (error instanceof MoveError) throw error;
        if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') throw error;
      }
    }
    const reverseKeys = pending.files.map((file) => fileRenameKey(file.newUri, file.oldUri));
    for (const key of reverseKeys) delegatedSafeMoves.add(key);
    try {
      const edit = new vscode.WorkspaceEdit();
      for (const file of pending.files) edit.renameFile(file.newUri, file.oldUri, { overwrite: false });
      if (!await vscode.workspace.applyEdit(edit)) throw new MoveError(t('moveRollbackFailed'));
    } finally {
      for (const key of reverseKeys) delegatedSafeMoves.delete(key);
    }
  };

  const serverMoveWasReversed = async (pending: PendingServerSafeMove): Promise<boolean> => {
    const states = await Promise.all(pending.files.map(async (file) => {
      let oldExists = false; let newExists = false;
      try { await vscode.workspace.fs.stat(file.oldUri); oldExists = true; } catch { /* Missing is the expected reversed state. */ }
      try { await vscode.workspace.fs.stat(file.newUri); newExists = true; } catch { /* Missing is the expected reversed state. */ }
      return oldExists && !newExists;
    }));
    return states.every(Boolean);
  };

  const queueServerMoveReconciliation = async (key: string): Promise<boolean> => {
    const pending = pendingServerSafeMoves.get(key);
    if (!pending) return false;
    if (reconcilingServerSafeMoves.has(key)) { await movePipeline; return true; }
    reconcilingServerSafeMoves.add(key);
    movePipeline = movePipeline.then(async () => {
      try {
        await withBoundedRetry(async () => {
          pending.reconciliation ??= (await requestSafeMovePlan(pending.files, false)).reconciliation;
          if (!pending.reconciliation.length) throw new MoveError(t('moveReconciliationLost'));
          try { await reconcileServerMove(pending.reconciliation); }
          catch (error) {
            // A rapid reverse Explorer operation has its own retained plan. Do
            // not let verification of the superseded direction block that plan.
            if (!await serverMoveWasReversed(pending)) throw error;
          }
        }, {
          attempts: 13,
          delayMs: 250,
          onFailure: (error, attempt) => {
            if (attempt === 1 || attempt === 5 || attempt === 10 || attempt === 13) output.warn(`Safe Move post-operation reconciliation attempt ${attempt}/13 failed: ${error instanceof Error ? error.message : String(error)}`);
          },
        });
        pendingServerSafeMoves.delete(key);
      } finally { reconcilingServerSafeMoves.delete(key); }
    }).catch(async (error) => {
      pendingServerSafeMoves.delete(key);
      let message = 'Safe Move completed the file operation, but could not reconcile namespace and references.';
      if (!pending.reconciliation) {
        try {
          await rollbackUnplannedServerMove(pending);
          message = 'Safe Move could not produce a precise semantic plan, so the file operation was rolled back.';
        } catch (rollbackError) {
          output.warn(`Safe Move rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        }
      }
      output.warn(`${message} ${error instanceof Error ? error.message : String(error)}`);
      void vscode.window.showWarningMessage(message);
    });
    await movePipeline;
    return true;
  };

  const watchForServerMove = async (key: string, files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[]): Promise<void> => {
    for (let attempt = 0; attempt < 120 && pendingServerSafeMoves.has(key); attempt += 1) {
      const completed = await Promise.all(files.map(async (file) => {
        try { await vscode.workspace.fs.stat(file.newUri); }
        catch { return false; }
        try { await vscode.workspace.fs.stat(file.oldUri); return false; }
        catch { return true; }
      }));
      if (completed.every(Boolean)) {
        await queueServerMoveReconciliation(key);
        return;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
    }
  };

  const refreshMoveIndex = async (
    manager: WorkspaceManager,
    files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[],
    edits: vscode.WorkspaceEdit,
  ): Promise<void> => {
    for (const file of files) manager.index.remove(file.oldUri.toString());
    const uris = new Map<string, vscode.Uri>();
    for (const file of files) uris.set(file.newUri.toString(), file.newUri);
    for (const [uri] of edits.entries()) {
      const moved = files.find((file) => file.oldUri.toString() === uri.toString());
      const currentUri = moved?.newUri ?? uri;
      uris.set(currentUri.toString(), currentUri);
    }
    for (const uri of uris.values()) {
      const open = vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
      const source = open?.getText() ?? Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
      manager.index.update(uri.toString(), source);
    }
  };

  const experimentalWorkspace = async (): Promise<WorkspaceManager | undefined> => {
    const resource = vscode.window.activeTextEditor?.document.uri ?? null;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', resource);
    if (!configuration.get<boolean>('experimental.refactoring', false)) {
      void vscode.window.showInformationMessage(t('experimentalRequired'));
      return undefined;
    }
    if (configuration.get<string>('indexing.mode', 'onDemand') === 'off') {
      void vscode.window.showInformationMessage(t('indexingDisabled'));
      return undefined;
    }
    return workspace();
  };

  const commands: vscode.Disposable[] = [];
  const register = (id: string, callback: (...args: any[]) => unknown): void => { commands.push(vscode.commands.registerCommand(id, callback)); };
  const confirmPreviewedEdit = async (message: string, testPreviewAction?: () => Promise<'apply' | 'cancel'>): Promise<boolean> => {
    if (context.extensionMode === vscode.ExtensionMode.Test && testPreviewAction) return await testPreviewAction() === 'apply';
    return await vscode.window.showInformationMessage(message, t('apply')) === t('apply');
  };
  register('phpCompanion.applyPreviewedExtract', async (
    request: { edit: vscode.WorkspaceEdit; title: string; sourceUri: vscode.Uri; sourceVersion: number; sourceText: string;
      targetHashes?: Record<string, string> },
    options?: { testPreviewAction?: () => Promise<'apply' | 'cancel'> },
  ) => {
    const { edit, sourceUri, sourceVersion, sourceText } = request;
    const source = await vscode.workspace.openTextDocument(sourceUri);
    const targets = edit.entries().filter(([uri]) => uri.toString() !== sourceUri.toString());
    const existingTargets = new Map<string, { document: vscode.TextDocument; version: number; text: string }>();
    if (request.targetHashes) {
      for (const [uri] of targets) {
        const expected = request.targetHashes[uri.toString()];
        if (!expected) return void vscode.window.showWarningMessage(t('extractCancelled'));
        const document = await vscode.workspace.openTextDocument(uri);
        const text = document.getText();
        if (createHash('sha256').update(text).digest('hex') !== expected) {
          return void vscode.window.showWarningMessage(t('extractCancelled'));
        }
        existingTargets.set(uri.toString(), { document, version: document.version, text });
      }
    }
    const unchanged = async (): Promise<boolean> => {
      if (source.isClosed || source.version !== sourceVersion || source.getText() !== sourceText) return false;
      for (const [uri] of targets) {
        const existing = existingTargets.get(uri.toString());
        if (existing) {
          if (existing.document.isClosed || existing.document.version !== existing.version || existing.document.getText() !== existing.text) return false;
          continue;
        }
        try { await vscode.workspace.fs.stat(uri); return false; }
        catch (error) {
          if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') throw error;
        }
      }
      return true;
    };
    if (!await unchanged()) return void vscode.window.showWarningMessage(t('extractCancelled'));
    const sourcePreview = await vscode.workspace.openTextDocument({ language: 'php', content: applyTextEdits(sourceText, edit.get(sourceUri)) });
    await vscode.commands.executeCommand('vscode.diff', sourceUri, sourcePreview.uri,
      t('extractDiff', request.title, vscode.workspace.asRelativePath(sourceUri)), { preview: false });
    for (const [uri, edits] of targets) {
      const previous = existingTargets.get(uri.toString())?.text ?? '';
      const baseline = existingTargets.has(uri.toString()) ? uri : (await vscode.workspace.openTextDocument({ language: 'php', content: '' })).uri;
      const preview = await vscode.workspace.openTextDocument({ language: 'php', content: applyTextEdits(previous, edits) });
      await vscode.commands.executeCommand('vscode.diff', baseline, preview.uri,
        t('extractDiff', request.title, vscode.workspace.asRelativePath(uri)), { preview: false });
    }
    if (!await confirmPreviewedEdit(t('applyPreviewedExtract', request.title), options?.testPreviewAction)) return;
    if (!await unchanged()) return void vscode.window.showWarningMessage(t('extractCancelled'));
    if (!await vscode.workspace.applyEdit(edit)) return void vscode.window.showErrorMessage(t('extractApplyFailed'));
    await vscode.window.showTextDocument(source, { preview: false });
  });
  if (context.extensionMode === vscode.ExtensionMode.Test) {
    register('phpCompanion._testEffectivePasteMode', (uri: vscode.Uri) => configuredPasteImportMode(vscode.workspace.getConfiguration('phpCompanion', uri)));
    register('phpCompanion._testLocalize', (key: Parameters<typeof t>[0], ...args: string[]) => t(key, ...args));
    register('phpCompanion._testCreatePhpType', (kind: PhpTypeKind, name: string, target: vscode.Uri,
      testPreviewAction: () => Promise<'apply' | 'cancel'>) => createPhpType(kind, versions, target, { testName: name, testPreviewAction }));
    register('phpCompanion._testBuildMoveEdits', async (oldUri: vscode.Uri, newUri: vscode.Uri) => {
      if (selfLanguageServer) return requestSafeMove([{ oldUri, newUri }], false);
      await Promise.all([versions.ensureForUri(oldUri), versions.ensureForUri(newUri)]);
      const manager = await workspace();
      await manager.refreshProjectIndexes([oldUri]);
      return buildMoveEdits(manager.index, [{ oldUri, newUri }], (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []);
    });
  }
  register('phpCompanion.selectPhpVersion', () => versions.selectVersion());
  register('phpCompanion.detectPhpVersions', () => versions.refresh());
  register('phpCompanion.showCompatibilityReport', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) await versions.ensureForUri(editor.document.uri);
    const lines = [t('diagnosticsTitle'), '', t('activationRegistration', (performance.now() - started).toFixed(1)),
      t('experimentalIndexLoaded', workspacePromise ? t('yes') : t('no'))];
    for (const state of versions.allStates()) lines.push(
      `- ${state.projectRoot ?? state.folder.name}: PHP ${state.resolution.target} — ${state.resolution.sourceDetail}`,
      t('reportRuntime', state.runtime ? t('runtimeDetails', state.runtime.version, state.runtime.sapi, state.runtime.path, String(state.runtime.loadedExtensions.length)) : t('runtimeUnknown')),
      t('psr4Mappings', String(state.composer?.psr4.length ?? 0)),
    );
    const document = await vscode.workspace.openTextDocument({ language: 'markdown', content: lines.join('\n') });
    await vscode.window.showTextDocument(document, { preview: true });
  });
  register('phpCompanion.showPerformanceLog', () => output.show());
  register('phpCompanion.rebuildIndex', async () => (await experimentalWorkspace())?.rebuild(true));
  register('phpCompanion.safeMove', async (sourceUri?: vscode.Uri, targetUri?: vscode.Uri, options?: { preview?: boolean; testBeforeApply?: () => Promise<void>; testPreviewAction?: () => Promise<'apply' | 'cancel'> }) => {
    const source = sourceUri ?? vscode.window.activeTextEditor?.document.uri;
    if (!source || !source.path.endsWith('.php')) return;
    let target = targetUri;
    if (!target) {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: source.with({ path: source.path.slice(0, source.path.lastIndexOf('/')) }),
        openLabel: t('moveHere'),
      });
      if (!selected?.[0]) return;
      target = vscode.Uri.joinPath(selected[0], basename(source.fsPath));
    }
    if (target.toString() === source.toString()) return;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', source);
    if (configuration.get<string>('indexing.mode', 'onDemand') === 'off') return void vscode.window.showWarningMessage(t('safeMoveIndexingMode'));
    try {
      await Promise.all([versions.ensureForUri(source), versions.ensureForUri(target)]);
      const manager = selfLanguageServer ? undefined : await workspace();
      if (manager) await manager.refreshProjectIndexes([source]);
      const textEdits = selfLanguageServer
        ? await requestSafeMove([{ oldUri: source, newUri: target }], true)
        : await buildMoveEdits(manager!.index, [{ oldUri: source, newUri: target }], (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []);
      const edit = selfLanguageServer ? textEdits : new vscode.WorkspaceEdit();
      if (!selfLanguageServer) {
        edit.renameFile(source, target, { overwrite: false }, { label: t('moveFileLabel', basename(source.fsPath)), needsConfirmation: false });
        for (const [uri, edits] of textEdits.entries()) for (const textEdit of edits) edit.replace(uri, textEdit.range, textEdit.newText);
      }
      const participantUris = new Map<string, vscode.Uri>([[source.toString(), source]]);
      for (const [uri] of textEdits.entries()) {
        const originalUri = uri.toString() === target.toString() ? source : uri;
        participantUris.set(originalUri.toString(), originalUri);
      }
      const participants = await Promise.all([...participantUris.values()].map(async (uri) => {
        const document = await vscode.workspace.openTextDocument(uri);
        const disk = await vscode.workspace.fs.readFile(uri);
        return { uri, document, version: document.version, text: document.getText(), disk: Buffer.from(disk) };
      }));
      const participantsUnchanged = async (): Promise<boolean> => {
        for (const participant of participants) {
          const current = participant.document.isClosed ? await vscode.workspace.openTextDocument(participant.uri) : participant.document;
          if (current.getText() !== participant.text || (current === participant.document && current.version !== participant.version)) return false;
          try {
            const disk = await vscode.workspace.fs.readFile(participant.uri);
            if (!Buffer.from(disk).equals(participant.disk)) return false;
          } catch { return false; }
        }
        try { await vscode.workspace.fs.stat(target); return false; }
        catch (error) { return error instanceof vscode.FileSystemError && error.code === 'FileNotFound'; }
      };
      if (!await participantsUnchanged()) throw new MoveError(t('moveParticipantsChanged'));
      if (options?.preview ?? configuration.get<boolean>('move.preview', true)) {
        for (const [uri, edits] of textEdits.entries()) {
          const originalUri = uri.toString() === target.toString() ? source : uri;
          const original = participants.find((participant) => participant.uri.toString() === originalUri.toString())!;
          const preview = await vscode.workspace.openTextDocument({ language: 'php', content: applyTextEdits(original.text, edits) });
          await vscode.commands.executeCommand('vscode.diff', originalUri, preview.uri, t('safeMoveDiff', vscode.workspace.asRelativePath(originalUri)), { preview: false });
        }
        if (!await confirmPreviewedEdit(t('applyPreviewedSafeMove'), options?.testPreviewAction)) return;
      }
      if (context.extensionMode === vscode.ExtensionMode.Test) await options?.testBeforeApply?.();
      if (!await participantsUnchanged()) throw new MoveError(t('moveParticipantsChanged'));
      const key = fileRenameKey(source, target);
      delegatedSafeMoves.add(key);
      try {
        if (!await vscode.workspace.applyEdit(edit)) throw new MoveError(t('safeMoveApplyFailed'));
        if (manager) await refreshMoveIndex(manager, [{ oldUri: source, newUri: target }], textEdits);
      } finally {
        delegatedSafeMoves.delete(key);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.warn(`Safe Move rejected: ${message}`);
      void vscode.window.showWarningMessage(error instanceof MoveError ? message : t('safeMoveFailed', message));
    }
  });
  register('phpCompanion.resolvePastedImports', async (options?: { testAfterPlan?: () => Promise<void> }) => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document || document.languageId !== 'php') return;
    const version = document.version;
    const unchanged = (): boolean => !document.isClosed && document.version === version;
    if (selfLanguageServer) {
      const client = await languageServer; if (!client) return;
      if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
      const symbols: PasteSymbol[] = [];
      const unresolved = await client.sendRequest<Array<{ name: string; position: { line: number; character: number } }>>('phpCompanion/unresolvedTypeNames', {
        textDocument: { uri: document.uri.toString() },
      });
      if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
      for (const { name, position } of unresolved) {
        const candidates = await client.sendRequest<Array<{ fqcn: string; uri: string }>>('phpCompanion/importCandidates', {
          textDocument: { uri: document.uri.toString() }, position, name,
        });
        if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
        const selected = candidates.length === 1 ? candidates[0] : (await vscode.window.showQuickPick(
          candidates.map((candidate) => ({ label: candidate.fqcn, candidate })), { placeHolder: t('selectImport', name) },
        ))?.candidate;
        if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
        if (selected) symbols.push({ fqcn: selected.fqcn, alias: name });
      }
      if (!symbols.length) return;
      const plan = await requestImportPlan(document, document.positionAt(document.getText().length), symbols);
      if (context.extensionMode === vscode.ExtensionMode.Test) await options?.testAfterPlan?.();
      if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
      const edit = fromProtocolWorkspaceEdit(plan?.edit); if (edit) await vscode.workspace.applyEdit(edit);
      return;
    }
    const workspace = await experimentalWorkspace();
    if (workspace) {
      await workspace.ensureFullIndex();
      if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
      await resolveDocumentImports(document, workspace.index);
    }
  });
  register('phpCompanion.importClass', async (uri?: vscode.Uri, position?: vscode.Position, options?: { testAfterPlan?: () => Promise<void> }) => {
    const editor = vscode.window.activeTextEditor;
    const document = uri ? await vscode.workspace.openTextDocument(uri) : editor?.document;
    const cursor = position ?? editor?.selection.active;
    if (!document || document.languageId !== 'php' || !cursor) return;
    const word = typeNameAt(document, cursor);
    if (!word) return;
    const version = document.version;
    const unchanged = (): boolean => !document.isClosed && document.version === version;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
    if (configuration.get<string>('indexing.mode', 'onDemand') === 'off') {
      void vscode.window.showInformationMessage(t('importClassIndexingMode'));
      return;
    }
    if (selfLanguageServer) {
      const client = await languageServer; if (!client) return;
      if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
      const candidates = await client.sendRequest<Array<{ fqcn: string; uri: string; aliasRequired: boolean }>>('phpCompanion/importCandidates', {
        textDocument: { uri: document.uri.toString() }, position: word.range.start, name: word.name,
      });
      if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
      if (!candidates.length) return void vscode.window.showInformationMessage(t('noUniqueComposerCandidate', word.name));
      const selected = candidates.length === 1 ? candidates[0] : (await vscode.window.showQuickPick(
        candidates.map((candidate) => ({ label: candidate.fqcn, description: vscode.workspace.asRelativePath(vscode.Uri.parse(candidate.uri)), candidate })),
        { placeHolder: t('selectClassImport', word.name) },
      ))?.candidate;
      if (!selected) return;
      const alias = selected.aliasRequired ? await vscode.window.showInputBox({
        prompt: t('chooseAlias', selected.fqcn), value: `${word.name}Alias`,
        validateInput: (value) => /^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(value) ? undefined : t('validIdentifier'),
      }) : undefined;
      if (selected.aliasRequired && !alias) return;
      if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
      const result = await client.sendRequest<ProtocolWorkspaceEdit | null>('phpCompanion/addImport', {
        textDocument: { uri: document.uri.toString() }, position: word.range.start,
        range: { start: word.range.start, end: word.range.end }, name: word.name, fqcn: selected.fqcn, alias,
      });
      if (context.extensionMode === vscode.ExtensionMode.Test) await options?.testAfterPlan?.();
      if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
      const edit = fromProtocolWorkspaceEdit(result);
      if (edit) await vscode.workspace.applyEdit(edit);
      return;
    }
    await versions.ensureForUri(document.uri);
    if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
    const manager = await workspace();
    manager.indexDocument(document);
    if (!await manager.ensureProjectIndex(document.uri) || !unchanged()) {
      void vscode.window.showWarningMessage(t('importCancelled'));
      return;
    }
    const file = manager.index.getFile(document.uri.toString());
    if (!file || file.errors.length) return void vscode.window.showWarningMessage(t('cannotImportSyntax'));
    if (manager.index.findSymbolAt(document.uri.toString(), document.offsetAt(word.range.start))) return;
    const candidates = rankedImportCandidates(manager.index, file, word.name, versions.stateForUri(document.uri)?.composer?.psr4 ?? []);
    if (!candidates.length) return void vscode.window.showInformationMessage(t('noComposerPsr4Candidate', word.name));
    const selected = candidates.length === 1 ? candidates[0] : (await vscode.window.showQuickPick(
      candidates.map((candidate) => ({ label: candidate.fqcn, description: vscode.workspace.asRelativePath(vscode.Uri.parse(candidate.uri)), candidate })),
      { placeHolder: t('selectClassImport', word.name) },
    ))?.candidate;
    if (!selected) return;
    let alias: string | undefined;
    const collision = file.imports.some((item) => item.alias.toLowerCase() === word.name.toLowerCase() && item.fqcn.toLowerCase() !== selected.fqcn.toLowerCase())
      || file.declarations.some((item) => item.name.toLowerCase() === word.name.toLowerCase());
    if (collision) {
      alias = await vscode.window.showInputBox({ prompt: t('chooseAlias', selected.fqcn), value: word.name, validateInput: (value) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) ? undefined : t('validIdentifier') });
      if (!alias) return;
    }
    if (!unchanged()) return void vscode.window.showWarningMessage(t('importCancelled'));
    const edit = buildAddImportEdit(document, file, selected.fqcn, alias);
    if (edit) await vscode.workspace.applyEdit(edit);
  });
  register('phpCompanion.optimizeImports', async (uri?: vscode.Uri, options?: { preview?: boolean; testAfterPlan?: () => Promise<void>; testPreviewAction?: () => Promise<'apply' | 'cancel'> }) => {
    const document = uri ? await vscode.workspace.openTextDocument(uri) : vscode.window.activeTextEditor?.document;
    if (!document || document.languageId !== 'php') return;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
    if (configuration.get<string>('indexing.mode', 'onDemand') === 'off') return void vscode.window.showInformationMessage(t('optimizeIndexRequired'));
    if (selfLanguageServer) {
      const version = document.version;
      const unchanged = (): boolean => !document.isClosed && document.version === version;
      const client = await languageServer; if (!client) return;
      if (!unchanged()) return void vscode.window.showWarningMessage(t('optimizeCancelled'));
      const actions = await client.sendRequest<Array<{ title: string; kind?: string; edit?: ProtocolWorkspaceEdit }>>('textDocument/codeAction', {
        textDocument: { uri: document.uri.toString() },
        range: { start: new vscode.Position(0, 0), end: document.positionAt(document.getText().length) },
        context: { diagnostics: [], only: ['source.organizeImports'] },
        phpCompanion: { importSort: configuration.get<'grouped' | 'fqcn'>('imports.sort', 'grouped') },
      });
      if (context.extensionMode === vscode.ExtensionMode.Test) await options?.testAfterPlan?.();
      if (!unchanged()) return void vscode.window.showWarningMessage(t('optimizeCancelled'));
      const action = actions.find((candidate) => candidate.kind === 'source.organizeImports' && candidate.edit);
      const edit = fromProtocolWorkspaceEdit(action?.edit);
      if (!edit) return void vscode.window.showInformationMessage(t('importsAlreadyOrganized'));
      if (options?.preview ?? configuration.get<boolean>('imports.optimize.preview', true)) {
        const preview = await vscode.workspace.openTextDocument({ language: 'php', content: applyTextEdits(document.getText(), edit.get(document.uri)) });
        await vscode.commands.executeCommand('vscode.diff', document.uri, preview.uri, t('optimizeDiff', vscode.workspace.asRelativePath(document.uri)), { preview: false });
        if (!await confirmPreviewedEdit(t('applyPreviewedImportChanges'), options?.testPreviewAction)) return;
      }
      if (!unchanged()) return void vscode.window.showWarningMessage(t('optimizeCancelled'));
      await vscode.workspace.applyEdit(edit);
      return;
    }
    await versions.ensureForUri(document.uri);
    const manager = await workspace();
    manager.indexDocument(document);
    const version = document.version;
    if (!await manager.ensureProjectIndex(document.uri) || document.version !== version) return void vscode.window.showWarningMessage(t('optimizeCancelled'));
    const file = manager.index.getFile(document.uri.toString());
    if (!file || file.errors.length) return void vscode.window.showWarningMessage(t('cannotOptimizeSyntax'));
    const result = buildOptimizeImportsEdit(document, file, manager.index, configuration.get<'grouped' | 'fqcn'>('imports.sort', 'grouped'));
    if (!result.edit || result.optimizedSource === undefined) return void vscode.window.showInformationMessage(t('importsAlreadyOptimized'));
    if (options?.preview ?? configuration.get<boolean>('imports.optimize.preview', true)) {
      const preview = await vscode.workspace.openTextDocument({ language: 'php', content: result.optimizedSource });
      await vscode.commands.executeCommand('vscode.diff', document.uri, preview.uri, t('optimizeDiff', vscode.workspace.asRelativePath(document.uri)), { preview: false });
      if (!await confirmPreviewedEdit(t('applyPreviewedImportChanges'), options?.testPreviewAction)) return;
    }
    if (document.isClosed || document.version !== version) return void vscode.window.showWarningMessage(t('optimizeCancelled'));
    await vscode.workspace.applyEdit(result.edit);
  });

  for (const kind of ['class', 'abstract class', 'interface', 'trait', 'enum', 'test'] as PhpTypeKind[]) {
    register(`phpCompanion.new.${kind.replace(' ', '')}`, (uri?: vscode.Uri) => createPhpType(kind, versions, uri));
  }
  for (const kind of ['fqcn', 'namespace', 'classReference', 'relativePath'] as const) register(`phpCompanion.copy.${kind}`, () => copyIdentity(kind));
  register('phpCompanion.goToDefinition', () => vscode.commands.executeCommand('editor.action.revealDefinition'));
  register('phpCompanion.goToImplementation', () => vscode.commands.executeCommand('editor.action.goToImplementation'));
  register('phpCompanion.findReferences', () => vscode.commands.executeCommand('editor.action.referenceSearch.trigger'));
  void vscode.commands.executeCommand('setContext', 'phpCompanion.hasIntelephense', Boolean(vscode.extensions.getExtension('bmewburn.vscode-intelephense-client')));
  void vscode.commands.executeCommand('setContext', 'phpCompanion.hasPhpNavigation', selfLanguageServer || Boolean(vscode.extensions.getExtension('bmewburn.vscode-intelephense-client')));

  const phpSelector: vscode.DocumentSelector = [{ language: 'php', scheme: 'file' }, { language: 'php', scheme: 'vscode-remote' }];
  const renameProvider = async (document: vscode.TextDocument): Promise<PhpRenameProvider | undefined> => {
    const resourceConfiguration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
    if (!resourceConfiguration.get<boolean>('rename.enabled', true)) return undefined;
    if (resourceConfiguration.get<string>('indexing.mode', 'onDemand') === 'off') {
      throw new Error(t('renameIndexingMode'));
    }
    await versions.ensureForUri(document.uri);
    const manager = await workspace();
    manager.indexDocument(document);
    return new PhpRenameProvider({
      index: manager.index,
      versionForUri: (uri) => versions.stateForUri(uri)?.resolution.target,
      ensureProjectIndex: (uri, token) => manager.ensureProjectIndex(uri, token),
      mappingsForUri: (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? [],
      log: (message) => output.info(message),
      unsupportedReturnsUndefined: selfLanguageServer,
      stageFileRename: (oldUri, newUri, edit) => pendingTypeRenameEdits.set(fileRenameKey(oldUri, newUri), edit),
    });
  };
  const renamePlans = new WeakMap<vscode.WorkspaceEdit, { protocol: ProtocolWorkspaceEdit;
    staged?: { key: string; edit: vscode.WorkspaceEdit } }>();
  const lazyRename: vscode.RenameProvider = {
    prepareRename: async (document, position, token) => {
      try {
        if (selfLanguageServer) {
          const sourceVersion = document.version;
          const client = await languageServer; if (!client || token.isCancellationRequested) return undefined;
          const prepared = await client.sendRequest<null | { range: { start: { line: number; character: number }; end: { line: number; character: number } }; placeholder?: string }>(
            'textDocument/prepareRename', { textDocument: { uri: document.uri.toString() }, position }, token,
          );
          if (document.isClosed || document.version !== sourceVersion || token.isCancellationRequested) {
            throw new Error('The PHP document changed while Rename was being prepared. Run Rename again.');
          }
          if (!prepared) return undefined;
          const range = new vscode.Range(prepared.range.start.line, prepared.range.start.character, prepared.range.end.line, prepared.range.end.character);
          return prepared.placeholder ? { range, placeholder: prepared.placeholder } : range;
        }
        return (await renameProvider(document))?.prepareRename(document, position, token);
      } catch (error) {
        output.warn(`Rename preparation rejected: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    },
    provideRenameEdits: async (document, position, newName, token) => {
      try {
        if (!selfLanguageServer) return (await renameProvider(document))?.provideRenameEdits(document, position, newName, token);
        const sourceVersion = document.version;
        const openVersions = new Map(vscode.workspace.textDocuments.map((item) => [item.uri.toString(), item.version]));
        const client = await languageServer; if (!client || token.isCancellationRequested) return undefined;
        const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
        const result = await client.sendRequest<ProtocolWorkspaceEdit | null>(
          'textDocument/rename', {
            textDocument: { uri: document.uri.toString() }, position, newName,
            phpCompanion: {
              renameFile: configuredRenameFileMode(configuration) !== 'off',
              includePhpDoc: configuration.get<boolean>('rename.phpDoc', true),
            },
          }, token,
        );
        if (document.isClosed || document.version !== sourceVersion || token.isCancellationRequested
          || vscode.workspace.textDocuments.some((item) => openVersions.has(item.uri.toString())
            && openVersions.get(item.uri.toString()) !== item.version)) {
          throw new Error('A PHP document changed while Rename edits were being prepared. Run Rename again.');
        }
        if (result) await verifyRenameSources(result);
        if (document.isClosed || document.version !== sourceVersion || token.isCancellationRequested
          || vscode.workspace.textDocuments.some((item) => openVersions.has(item.uri.toString())
            && openVersions.get(item.uri.toString()) !== item.version)) {
          throw new Error('A PHP document changed while Rename edits were being verified. Run Rename again.');
        }
        const converted = splitProtocolTypeRenameEdit(result);
        if (converted.edit && result) renamePlans.set(converted.edit, { protocol: result, staged: converted.staged });
        if (converted.staged) {
          pendingTypeRenameEdits.set(converted.staged.key, converted.staged.edit);
          setTimeout(() => {
            if (pendingTypeRenameEdits.get(converted.staged!.key) === converted.staged!.edit) pendingTypeRenameEdits.delete(converted.staged!.key);
          }, 60_000);
        }
        return converted.edit;
      } catch (error) {
        output.warn(`Rename rejected: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    },
  };
  register('phpCompanion.safeRename', async (options?: { uri?: vscode.Uri; position?: vscode.Position; newName?: string;
    testPreviewAction?: () => Promise<'apply' | 'cancel'> }): Promise<boolean> => {
    if (!selfLanguageServer) {
      void vscode.window.showWarningMessage(t('safeRenameUnavailable'));
      return false;
    }
    const uri = options?.uri ?? vscode.window.activeTextEditor?.document.uri;
    if (!uri) return false;
    if (!vscode.workspace.getConfiguration('phpCompanion', uri).get<boolean>('rename.enabled', true)) return false;
    const document = await vscode.workspace.openTextDocument(uri);
    if (document.languageId !== 'php') return false;
    const position = options?.position ?? vscode.window.activeTextEditor?.selection.active;
    if (!position) return false;
    const cancellation = new vscode.CancellationTokenSource();
    let staged: { key: string; edit: vscode.WorkspaceEdit } | undefined;
    const previewUris = new Set<string>();
    try {
      const prepared = await lazyRename.prepareRename?.(document, position, cancellation.token);
      if (!prepared) return false;
      const previous = prepared instanceof vscode.Range ? document.getText(prepared) : prepared.placeholder;
      const newName = context.extensionMode === vscode.ExtensionMode.Test && options?.newName
        ? options.newName : await vscode.window.showInputBox({ prompt: t('renamePrompt', previous), value: previous });
      if (!newName || newName === previous) return false;
      const edit = await lazyRename.provideRenameEdits(document, position, newName, cancellation.token);
      if (!edit) return false;
      const plan = renamePlans.get(edit);
      if (!plan) throw new Error('SoPHP could not verify the Rename plan. Run Rename again.');
      staged = plan.staged;
      const diskHashes = new Map<string, string>();
      for (const uri of Object.keys(plan.protocol.phpCompanion?.sourceHashes ?? {})) {
        const bytes = await vscode.workspace.fs.readFile(vscode.Uri.parse(uri));
        diskHashes.set(uri, createHash('sha256').update(bytes).digest('hex'));
      }
      const editsByUri = new Map<string, ProtocolTextEdit[]>();
      for (const [targetUri, changes] of Object.entries(plan.protocol.changes ?? {})) editsByUri.set(targetUri, [...changes]);
      for (const change of plan.protocol.documentChanges ?? []) {
        if ('textDocument' in change) editsByUri.set(change.textDocument.uri,
          [...editsByUri.get(change.textDocument.uri) ?? [], ...change.edits]);
      }
      const fileRename = plan.protocol.documentChanges?.find((change): change is Extract<ProtocolDocumentChange, { kind: 'rename' }> =>
        'kind' in change && change.kind === 'rename');
      for (const [targetUri, changes] of editsByUri) {
        const target = vscode.Uri.parse(targetUri);
        const open = vscode.workspace.textDocuments.find((item) => item.uri.toString() === targetUri);
        const source = open?.getText() ?? Buffer.from(await vscode.workspace.fs.readFile(target)).toString('utf8');
        const textEdits = changes.map((change) => new vscode.TextEdit(new vscode.Range(
          change.range.start.line, change.range.start.character, change.range.end.line, change.range.end.character), change.newText));
        const baseline = await openRenamePreviewSnapshot(target, source);
        const preview = await openRenamePreviewSnapshot(target, applyTextEdits(source, textEdits));
        previewUris.add(baseline.uri.toString()); previewUris.add(preview.uri.toString());
        const destination = fileRename?.oldUri === targetUri ? vscode.workspace.asRelativePath(vscode.Uri.parse(fileRename.newUri)) : undefined;
        const title = `SoPHP Rename: ${vscode.workspace.asRelativePath(target)}${destination ? ` → ${destination}` : ''}`;
        await vscode.commands.executeCommand('vscode.diff', baseline.uri, preview.uri, title, { preview: false });
      }
      if (!await confirmPreviewedEdit(t('applyPreviewedRename', newName), options?.testPreviewAction)) return false;
      await verifyRenameSources(plan.protocol);
      for (const [uri, hash] of diskHashes) {
        const current = createHash('sha256').update(await vscode.workspace.fs.readFile(vscode.Uri.parse(uri))).digest('hex');
        if (current !== hash) throw new Error('A PHP file changed on disk during Rename preview. Run Rename again.');
      }
      if (staged) pendingTypeRenameEdits.set(staged.key, staged.edit);
      if (!await vscode.workspace.applyEdit(edit)) throw new Error('SoPHP could not apply Rename changes. Run Rename again.');
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(
        fileRename ? vscode.Uri.parse(fileRename.newUri) : uri), { preview: false });
      return true;
    } catch (error) {
      output.warn(`Safe Rename rejected: ${error instanceof Error ? error.message : String(error)}`);
      void vscode.window.showWarningMessage(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      if (staged && pendingTypeRenameEdits.get(staged.key) === staged.edit) pendingTypeRenameEdits.delete(staged.key);
      const previewTabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs).filter((tab) =>
        tab.input instanceof vscode.TabInputTextDiff && previewUris.has(tab.input.original.toString())
        && previewUris.has(tab.input.modified.toString()));
      if (previewTabs.length) await vscode.window.tabGroups.close(previewTabs);
      forgetRenamePreviewSnapshots(previewUris);
      cancellation.dispose();
    }
  });
  const lazyPaste: vscode.DocumentPasteEditProvider = {
    prepareDocumentPaste: async (document, ranges, transfer) => {
      const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
      if (configuredPasteImportMode(configuration) === 'off') return;
      if (selfLanguageServer) {
        const client = await languageServer; if (!client) return;
        const symbols = await client.sendRequest<PasteSymbol[]>('phpCompanion/copyTypeSymbols', {
          textDocument: { uri: document.uri.toString() }, ranges,
        });
        if (symbols.length) transfer.set(PHP_IMPORT_METADATA_MIME, new vscode.DataTransferItem(symbols));
        return;
      }
      await versions.ensureForUri(document.uri);
      const manager = await workspace();
      manager.indexDocument(document);
      return new PhpImportPasteProvider(manager.index, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []).prepareDocumentPaste(document, ranges, transfer);
    },
    provideDocumentPasteEdits: async (document, ranges, transfer) => {
      const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
      const pasteMode = configuredPasteImportMode(configuration);
      if (pasteMode === 'off' || configuration.get<string>('indexing.mode', 'onDemand') === 'off') return undefined;
      if (!transfer.get(PHP_IMPORT_METADATA_MIME)) {
        const plain = transfer.get('text/plain');
        if (!plain || !mayNeedPhpImportResolution(await plain.asString())) return undefined;
      }
      if (selfLanguageServer) {
        const client = await languageServer; const plain = transfer.get('text/plain'); if (!client || !plain) return undefined;
        const text = await plain.asString(); const position = ranges[0]?.start ?? new vscode.Position(0, 0);
        const copied = transfer.get(PHP_IMPORT_METADATA_MIME)?.value as PasteSymbol[] | undefined;
        let variants: PasteSymbol[][] = [];
        if (copied?.length) variants = [copied];
        else {
          const unique: PasteSymbol[] = []; let ambiguity: { name: string; candidates: Array<{ fqcn: string }> } | undefined;
          for (const name of potentialPhpTypeNames(text)) {
            const candidates = await client.sendRequest<Array<{ fqcn: string }>>('phpCompanion/importCandidates', {
              textDocument: { uri: document.uri.toString() }, position, name, context: 'paste',
            });
            if (candidates.length === 1) unique.push({ fqcn: candidates[0]!.fqcn, alias: name });
            else if (candidates.length > 1 && !ambiguity) ambiguity = { name, candidates };
          }
          variants = ambiguity ? ambiguity.candidates.map((candidate) => [...unique, { fqcn: candidate.fqcn, alias: ambiguity!.name }]) : [unique];
          if (pasteMode === 'auto' && ambiguity) return undefined;
        }
        const edits: vscode.DocumentPasteEdit[] = [];
        for (let variant of variants) {
          if (!variant.length) continue;
          let plan = await requestImportPlan(document, position, variant); if (!plan) continue;
          if (plan.conflict) {
            if (pasteMode === 'auto') continue;
            const selectedAlias = await vscode.window.showInputBox({ prompt: t('chooseAlias', plan.conflict.fqcn), value: `${plan.conflict.sourceAlias}Alias`,
              validateInput: (value) => /^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(value) ? undefined : t('validIdentifier') });
            if (!selectedAlias) continue;
            variant = variant.map((symbol) => symbol.fqcn === plan!.conflict!.fqcn ? { ...symbol, selectedAlias } : symbol);
            plan = await requestImportPlan(document, position, variant); if (!plan || plan.conflict) continue;
          }
          const paste = new vscode.DocumentPasteEdit(replacePasteAliases(text, plan.replacements), variants.length > 1 ? `Paste with PHP imports: ${variant.at(-1)?.fqcn}` : 'Paste with PHP imports', PHP_IMPORT_PASTE_KIND);
          const additionalEdit = fromProtocolWorkspaceEdit(plan.edit); if (additionalEdit) paste.additionalEdit = additionalEdit;
          if (pasteMode === 'prompt') paste.yieldTo = [vscode.DocumentDropOrPasteEditKind.Text];
          edits.push(paste);
        }
        return edits.length ? edits : undefined;
      }
      await versions.ensureForUri(document.uri);
      const manager = await workspace();
      const version = document.version;
      if (!await manager.ensureProjectIndex(document.uri) || document.version !== version) return undefined;
      return new PhpImportPasteProvider(manager.index, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []).provideDocumentPasteEdits(document, ranges, transfer);
    },
  };
  context.subscriptions.push(
    output, status, versions, diagnostics, ...commands,
    vscode.languages.registerCodeActionsProvider(phpSelector, new NamespaceCodeActions(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }),
    vscode.languages.registerCodeActionsProvider(phpSelector, new ImportClassCodeActions(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }),
    vscode.languages.registerRenameProvider(phpSelector, lazyRename),
    vscode.languages.registerDocumentPasteEditProvider(phpSelector, lazyPaste, phpPasteMetadata),
    vscode.workspace.onWillRenameFiles((event) => {
      const files = event.files.filter((file) => file.oldUri.path.endsWith('.php') && file.newUri.path.endsWith('.php'));
      if (!files.length) return;
      const typeRenameKey = files.length === 1 ? fileRenameKey(files[0]!.oldUri, files[0]!.newUri) : undefined;
      const stagedTypeRename = typeRenameKey ? pendingTypeRenameEdits.get(typeRenameKey) : undefined;
      if (typeRenameKey && stagedTypeRename) {
        pendingTypeRenameEdits.delete(typeRenameKey);
        event.waitUntil(Promise.resolve(stagedTypeRename));
        return;
      }
      if (files.every((file) => delegatedSafeMoves.has(fileRenameKey(file.oldUri, file.newUri)))) return;
      if (!vscode.workspace.getConfiguration('phpCompanion', files[0]!.oldUri).get<boolean>('move.enabled', true)) return;
      const key = fileRenamesKey(files);
      const planning = (async (): Promise<vscode.WorkspaceEdit> => {
        try {
          await Promise.all(files.flatMap((file) => [versions.ensureForUri(file.oldUri), versions.ensureForUri(file.newUri)]));
          // Explorer moves wholly outside PSR-4 have no namespace contract to reconcile.
          // A move across the boundary still participates and must pass Safe Move checks. A
          // filename-only rename inside one namespace has no PHP namespace/reference work;
          // the normal PSR-4 filename diagnostic remains responsible for any mismatch.
          const managedFiles = files.filter((file) => {
            const mappings = versions.stateForUri(file.oldUri)?.composer?.psr4
              ?? versions.stateForUri(file.newUri)?.composer?.psr4 ?? [];
            const oldNamespace = resolvePsr4Namespace(file.oldUri.fsPath, mappings);
            const newNamespace = resolvePsr4Namespace(file.newUri.fsPath, mappings);
            return oldNamespace !== newNamespace && (oldNamespace !== undefined || newNamespace !== undefined);
          });
          if (!managedFiles.length) return new vscode.WorkspaceEdit();
          const snapshottedFiles = await Promise.all(managedFiles.map(async (file) => {
            const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === file.oldUri.toString());
            return { ...file, source: document?.getText() ?? new TextDecoder().decode(await vscode.workspace.fs.readFile(file.oldUri)) };
          }));
          if (vscode.workspace.getConfiguration('phpCompanion', files[0]!.oldUri).get<string>('indexing.mode', 'onDemand') === 'off') {
            throw new MoveError(t('safeMoveIndexingMode'));
          }
          if (selfLanguageServer) {
            // Freeze the exact source while the old path still exists, but do
            // not start an index inside VS Code's file-operation timeout. Reuse
            // an already-complete index when available; otherwise the
            // post-operation pipeline plans from this snapshot and rolls the
            // file operation back if no precise plan can be produced.
            try {
              const planned = await requestSafeMovePlan(snapshottedFiles, false, true);
              pendingServerSafeMoves.set(key, { files: snapshottedFiles, reconciliation: planned.reconciliation });
              // Put every proven edit in the Explorer transaction so native
              // undo/redo restores imports together with the file operation.
              const transaction = new vscode.WorkspaceEdit();
              for (const [uri, edits] of planned.edit.entries()) {
                const original = snapshottedFiles.find((file) => fileOperationUriKey(file.newUri) === fileOperationUriKey(uri));
                transaction.set(original?.oldUri ?? uri, edits);
              }
              return transaction;
            } catch (error) {
              pendingServerSafeMoves.set(key, { files: snapshottedFiles });
              output.info(`Safe Move deferred semantic planning until after the file operation: ${error instanceof Error ? error.message : String(error)}`);
            }
            return immediateNamespaceMoveEdit(snapshottedFiles.map((file) => ({
              ...file,
              source: vscode.workspace.textDocuments.find((document) => document.uri.toString() === file.oldUri.toString())?.getText() ?? file.source,
            })), versions, await moveParser());
          } else {
            const manager = await workspace();
            // Rebuild from the current files before every Explorer move. A prior
            // rename may have changed both URIs and namespaces since the last
            // on-demand index, so a cached "complete" index is not sufficient.
            await manager.refreshProjectIndexes(managedFiles.map((file) => file.oldUri));
            await buildMoveEdits(manager.index, managedFiles, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []);
            pendingSafeMoves.set(key, describeMoveReconciliation(manager.index, managedFiles, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []));
          }
          // The legacy in-process provider reconciles against the final result
          // because another PHP extension can own the initial file edit.
          return new vscode.WorkspaceEdit();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          output.warn(`Safe Move rejected: ${message}`);
          void vscode.window.showWarningMessage(error instanceof MoveError ? message : t('safeMoveFailed', message));
          throw error;
        }
      })();
      const settledPlanning = planning.then(() => undefined, () => undefined);
      pendingMovePlanning.set(key, settledPlanning);
      if (selfLanguageServer) void settledPlanning.then(() => watchForServerMove(key, files)).catch((error) => {
        output.warn(`Safe Move post-operation watcher failed: ${error instanceof Error ? error.message : String(error)}`);
      });
      void settledPlanning.then(() => setTimeout(() => {
        if (pendingMovePlanning.get(key) === settledPlanning) {
          pendingMovePlanning.delete(key);
          pendingServerSafeMoves.delete(key);
        }
      }, 60_000));
      event.waitUntil(planning);
    }),
    vscode.workspace.onDidRenameFiles(async (event) => {
      const files = event.files.filter((file) => file.oldUri.path.endsWith('.php') && file.newUri.path.endsWith('.php'));
      if (!files.length) return;
      const key = fileRenamesKey(files);
      if (files.every((file) => delegatedSafeMoves.has(fileRenameKey(file.oldUri, file.newUri)))) return;
      const planning = pendingMovePlanning.get(key);
      if (planning) await planning;
      pendingMovePlanning.delete(key);
      if (await queueServerMoveReconciliation(key)) return;
      const reconciliation = pendingSafeMoves.get(key);
      pendingSafeMoves.delete(key);
      if (!reconciliation) return;
      movePipeline = movePipeline.then(async () => {
        const manager = await workspace();
        await manager.refreshProjectIndexes(files.map((file) => file.newUri));
        const edits = buildMoveReconciliationEdits(manager.index, reconciliation!);
        await applyMoveReconciliation(edits);
        await refreshMoveIndex(manager, files, edits);
      }).catch((error) => {
        const message = 'Safe Move completed the file operation, but could not reconcile namespace and references.';
        output.warn(`${message} ${error instanceof Error ? error.message : String(error)}`);
        void vscode.window.showWarningMessage(message);
      });
      await movePipeline;
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === 'php' && !document.isUntitled) void versions.ensureForUri(document.uri);
    }),
  );
  output.info(`Activation registered in ${(performance.now() - started).toFixed(1)} ms; no workspace scan or PHP process was started.`);
  await languageServer;
  return integrations.api;
}

export function deactivate(): void {}

import * as vscode from 'vscode';
import { basename } from 'node:path';
import { resolvePsr4Namespace } from '../composer/project.js';
import { performance } from 'node:perf_hooks';
import { VersionManager } from './versionManager.js';
import { WorkspaceManager } from './workspaceManager.js';
import { createPhpType, type PhpTypeKind } from '../generation/createType.js';
import { copyIdentity, CurrentDocumentDiagnostics, NamespaceCodeActions } from '../editor/currentDocument.js';
import { PhpRenameProvider } from '../refactor/rename.js';
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
import { languageServerActivationDecision, startLanguageServer } from './languageServer.js';
import { BUILTIN_DOCUMENT_URI, builtinPhpStub, SUPPORTED_PHP_VERSIONS, type SupportedPhpVersion } from '@php-companion/language-spec';

function offsetAt(source: string, position: vscode.Position): number {
  let offset = 0;
  for (let line = 0; line < position.line; line += 1) {
    const newline = source.indexOf('\n', offset);
    if (newline < 0) return source.length;
    offset = newline + 1;
  }
  return offset + position.character;
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
type ProtocolWorkspaceEdit = { changes?: Record<string, ProtocolTextEdit[]>; documentChanges?: ProtocolDocumentChange[] };

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

function beforeFileRenameEdit(
  edit: vscode.WorkspaceEdit,
  files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[],
): vscode.WorkspaceEdit {
  const result = new vscode.WorkspaceEdit();
  for (const [uri, edits] of edit.entries()) {
    const moved = files.find((file) => fileOperationUriKey(file.newUri) === fileOperationUriKey(uri));
    result.set(moved?.oldUri ?? uri, edits);
  }
  return result;
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

export function activate(context: vscode.ExtensionContext): void {
  const started = performance.now();
  const output = vscode.window.createOutputChannel('PHP Companion', { log: true });
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  const versions = new VersionManager(status);
  const selfLanguageServer = languageServerActivationDecision().start;
  const diagnostics = new CurrentDocumentDiagnostics(versions, selfLanguageServer);
  const delegatedSafeMoves = new Set<string>();
  const pendingSafeMoves = new Map<string, MoveReconciliation[]>();
  type ServerMoveReconciliation = { oldUri: string; newUri: string; newNamespace: string; sourceUris: string[]; declarations: Array<{ oldFqcn: string; newFqcn: string }> };
  const pendingServerSafeMoves = new Map<string, ServerMoveReconciliation[]>();
  const pendingMovePlanning = new Map<string, Promise<void>>();
  const pendingTypeRenameEdits = new Map<string, vscode.WorkspaceEdit>();
  let movePipeline: Promise<void> = Promise.resolve();
  let workspacePromise: Promise<WorkspaceManager> | undefined;

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('php-companion-builtin', {
    provideTextDocumentContent: (uri) => {
      if (uri.toString() !== BUILTIN_DOCUMENT_URI) return '';
      const requested = vscode.workspace.getConfiguration('phpCompanion').get<string>('phpVersion', 'auto');
      const target = (SUPPORTED_PHP_VERSIONS as readonly string[]).includes(requested) ? requested as SupportedPhpVersion : '8.5';
      return builtinPhpStub(target);
    },
  }));

  const languageServer = startLanguageServer(context, output, versions).then((client) => {
    return client;
  }).catch((error) => {
    output.error(`PHP language server failed to start: ${error instanceof Error ? error.message : String(error)}`);
    void vscode.window.showErrorMessage('PHP Companion language server failed to start. See the PHP Companion output channel.');
    return undefined;
  });
  type PasteSymbol = { fqcn: string; alias: string; selectedAlias?: string };
  type ImportPlanResponse = { replacements: Record<string, string>; conflict?: { fqcn: string; sourceAlias: string }; edit?: ProtocolWorkspaceEdit };
  type SafeMoveResponse = { edit?: ProtocolWorkspaceEdit; error?: string; reconciliation?: ServerMoveReconciliation[] };
  const requestImportPlan = async (document: vscode.TextDocument, position: vscode.Position, symbols: readonly PasteSymbol[]): Promise<ImportPlanResponse | null> => {
    const client = await languageServer; if (!client) return null;
    return client.sendRequest<ImportPlanResponse | null>('phpCompanion/planTypeImports', {
      textDocument: { uri: document.uri.toString() }, position,
      symbols: symbols.map((symbol) => ({ fqcn: symbol.fqcn, sourceAlias: symbol.alias, alias: symbol.selectedAlias })),
    });
  };
  const requestSafeMovePlan = async (files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri; source?: string }[], includeFileOperations: boolean): Promise<{ edit: vscode.WorkspaceEdit; reconciliation: ServerMoveReconciliation[] }> => {
    const client = await languageServer;
    if (!client) throw new MoveError('PHP Companion Language Server is unavailable.');
    const result = await client.sendRequest<SafeMoveResponse>('phpCompanion/planSafeMove', {
      moves: files.map((file) => ({ oldUri: file.oldUri.toString(), newUri: file.newUri.toString(), ...(file.source === undefined ? {} : { source: file.source }) })), includeFileOperations,
    });
    if (result.error) throw new MoveError(result.error);
    const edit = fromProtocolWorkspaceEdit(result.edit);
    if (!edit) throw new MoveError('PHP Companion Language Server did not return a complete Safe Move edit.');
    return { edit, reconciliation: result.reconciliation ?? [] };
  };
  const requestSafeMove = async (files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[], includeFileOperations: boolean): Promise<vscode.WorkspaceEdit> =>
    (await requestSafeMovePlan(files, includeFileOperations)).edit;
  const requestMoveReconciliation = async (moves: readonly ServerMoveReconciliation[]): Promise<vscode.WorkspaceEdit> => {
    const client = await languageServer;
    if (!client) throw new MoveError('PHP Companion Language Server is unavailable.');
    const result = await client.sendRequest<SafeMoveResponse>('phpCompanion/reconcileSafeMove', { moves });
    if (result.error) throw new MoveError(result.error);
    const edit = fromProtocolWorkspaceEdit(result.edit);
    if (!edit) throw new MoveError('PHP Companion Language Server did not return a Safe Move reconciliation edit.');
    return edit;
  };

  const workspace = (): Promise<WorkspaceManager> => {
    workspacePromise ??= WorkspaceManager.create(context, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? [], output);
    return workspacePromise;
  };

  const applyMoveReconciliation = async (edits: vscode.WorkspaceEdit, additionallyTouched: readonly vscode.Uri[] = []): Promise<void> => {
    if (edits.entries().length && !await vscode.workspace.applyEdit(edits)) throw new MoveError('VS Code could not update moved PHP namespaces and references.');
    const touched = new Set([
      ...edits.entries().map(([uri]) => fileOperationUriKey(uri)),
      ...additionallyTouched.map(fileOperationUriKey),
    ]);
    for (const document of vscode.workspace.textDocuments) {
      if (!touched.has(fileOperationUriKey(document.uri))) continue;
      if (document.isDirty && !await document.save()) throw new MoveError(`VS Code could not save ${document.uri.fsPath}.`);
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
      void vscode.window.showInformationMessage('Enable phpCompanion.experimental.refactoring to use project-wide indexing and refactoring.');
      return undefined;
    }
    if (configuration.get<string>('indexing.mode', 'onDemand') === 'off') {
      void vscode.window.showInformationMessage('PHP Companion indexing is disabled.');
      return undefined;
    }
    return workspace();
  };

  const commands: vscode.Disposable[] = [];
  const register = (id: string, callback: (...args: any[]) => unknown): void => { commands.push(vscode.commands.registerCommand(id, callback)); };
  if (context.extensionMode === vscode.ExtensionMode.Test) {
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
    const lines = ['# PHP Companion diagnostics', '', `- Activation registration: ${(performance.now() - started).toFixed(1)} ms`, `- Experimental index loaded: ${workspacePromise ? 'yes' : 'no'}`];
    for (const state of versions.allStates()) lines.push(
      `- ${state.projectRoot ?? state.folder.name}: PHP ${state.resolution.target} — ${state.resolution.sourceDetail}`,
      `  - Runtime: ${state.runtime ? `PHP ${state.runtime.version} ${state.runtime.sapi} via ${state.runtime.path}; ${state.runtime.loadedExtensions.length} loaded extensions` : 'unknown or target-version mismatch'}`,
      `  - PSR-4 mappings: ${state.composer?.psr4.length ?? 0}`,
    );
    const document = await vscode.workspace.openTextDocument({ language: 'markdown', content: lines.join('\n') });
    await vscode.window.showTextDocument(document, { preview: true });
  });
  register('phpCompanion.showPerformanceLog', () => output.show());
  register('phpCompanion.rebuildIndex', async () => (await experimentalWorkspace())?.rebuild(true));
  register('phpCompanion.safeMove', async (sourceUri?: vscode.Uri, targetUri?: vscode.Uri, options?: { preview?: boolean }) => {
    const source = sourceUri ?? vscode.window.activeTextEditor?.document.uri;
    if (!source || !source.path.endsWith('.php')) return;
    let target = targetUri;
    if (!target) {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: source.with({ path: source.path.slice(0, source.path.lastIndexOf('/')) }),
        openLabel: 'Move PHP File Here',
      });
      if (!selected?.[0]) return;
      target = vscode.Uri.joinPath(selected[0], basename(source.fsPath));
    }
    if (target.toString() === source.toString()) return;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', source);
    if (configuration.get<string>('indexing.mode', 'onDemand') === 'off') return void vscode.window.showWarningMessage('Safe Move requires phpCompanion.indexing.mode to be onDemand or experimental.');
    try {
      await Promise.all([versions.ensureForUri(source), versions.ensureForUri(target)]);
      const manager = selfLanguageServer ? undefined : await workspace();
      if (manager) await manager.refreshProjectIndexes([source]);
      const textEdits = selfLanguageServer
        ? await requestSafeMove([{ oldUri: source, newUri: target }], false)
        : await buildMoveEdits(manager!.index, [{ oldUri: source, newUri: target }], (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []);
      if (options?.preview ?? configuration.get<boolean>('move.preview', true)) {
        const choice = await vscode.window.showInformationMessage('Safe Move will update the PHP namespace and proven references.', { modal: true }, 'Preview', 'Apply');
        if (!choice) return;
        if (choice === 'Preview') {
          for (const [uri, edits] of textEdits.entries()) {
            const originalUri = uri.toString() === target.toString() ? source : uri;
            const original = await vscode.workspace.openTextDocument(originalUri);
            const preview = await vscode.workspace.openTextDocument({ language: 'php', content: applyTextEdits(original.getText(), edits) });
            await vscode.commands.executeCommand('vscode.diff', originalUri, preview.uri, `Safe Move: ${vscode.workspace.asRelativePath(originalUri)}`);
          }
          if (await vscode.window.showInformationMessage('Apply the previewed Safe Move?', { modal: true }, 'Apply') !== 'Apply') return;
        }
      }
      const key = fileRenameKey(source, target);
      delegatedSafeMoves.add(key);
      try {
        const edit = selfLanguageServer ? await requestSafeMove([{ oldUri: source, newUri: target }], true) : new vscode.WorkspaceEdit();
        if (!selfLanguageServer) {
          edit.renameFile(source, target, { overwrite: false }, { label: `Move ${basename(source.fsPath)}`, needsConfirmation: false });
          for (const [uri, edits] of textEdits.entries()) for (const textEdit of edits) edit.replace(uri, textEdit.range, textEdit.newText);
        }
        if (!await vscode.workspace.applyEdit(edit)) throw new MoveError('VS Code could not move the PHP file and update its references.');
        if (manager) await refreshMoveIndex(manager, [{ oldUri: source, newUri: target }], textEdits);
      } finally {
        delegatedSafeMoves.delete(key);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.warn(`Safe Move rejected: ${message}`);
      void vscode.window.showWarningMessage(error instanceof MoveError ? message : `Safe Move failed: ${message}`);
    }
  });
  register('phpCompanion.resolvePastedImports', async () => {
    const document = vscode.window.activeTextEditor?.document;
    if (document?.languageId === 'php' && selfLanguageServer) {
      const client = await languageServer; if (!client) return;
      const symbols: PasteSymbol[] = [];
      const unresolved = await client.sendRequest<Array<{ name: string; position: { line: number; character: number } }>>('phpCompanion/unresolvedTypeNames', {
        textDocument: { uri: document.uri.toString() },
      });
      for (const { name, position } of unresolved) {
        const candidates = await client.sendRequest<Array<{ fqcn: string; uri: string }>>('phpCompanion/importCandidates', {
          textDocument: { uri: document.uri.toString() }, position, name,
        });
        const selected = candidates.length === 1 ? candidates[0] : (await vscode.window.showQuickPick(
          candidates.map((candidate) => ({ label: candidate.fqcn, candidate })), { placeHolder: `Select import for ${name}` },
        ))?.candidate;
        if (selected) symbols.push({ fqcn: selected.fqcn, alias: name });
      }
      if (!symbols.length) return;
      const plan = await requestImportPlan(document, document.positionAt(document.getText().length), symbols);
      const edit = fromProtocolWorkspaceEdit(plan?.edit); if (edit) await vscode.workspace.applyEdit(edit);
      return;
    }
    const workspace = await experimentalWorkspace();
    if (document?.languageId === 'php' && workspace) {
      await workspace.ensureFullIndex();
      await resolveDocumentImports(document, workspace.index);
    }
  });
  register('phpCompanion.importClass', async (uri?: vscode.Uri, position?: vscode.Position) => {
    const editor = vscode.window.activeTextEditor;
    const document = uri ? await vscode.workspace.openTextDocument(uri) : editor?.document;
    const cursor = position ?? editor?.selection.active;
    if (!document || document.languageId !== 'php' || !cursor) return;
    const word = typeNameAt(document, cursor);
    if (!word) return;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
    if (configuration.get<string>('indexing.mode', 'onDemand') === 'off') {
      void vscode.window.showInformationMessage('PHP Companion Import Class requires indexing.mode to be onDemand or experimental.');
      return;
    }
    if (selfLanguageServer) {
      const client = await languageServer; if (!client) return;
      const candidates = await client.sendRequest<Array<{ fqcn: string; uri: string; aliasRequired: boolean }>>('phpCompanion/importCandidates', {
        textDocument: { uri: document.uri.toString() }, position: word.range.start, name: word.name,
      });
      if (!candidates.length) return void vscode.window.showInformationMessage(`No unique Composer candidate found for ${word.name}.`);
      const selected = candidates.length === 1 ? candidates[0] : (await vscode.window.showQuickPick(
        candidates.map((candidate) => ({ label: candidate.fqcn, description: vscode.workspace.asRelativePath(vscode.Uri.parse(candidate.uri)), candidate })),
        { placeHolder: `Select the class to import for ${word.name}` },
      ))?.candidate;
      if (!selected) return;
      const alias = selected.aliasRequired ? await vscode.window.showInputBox({
        prompt: `Choose an alias for ${selected.fqcn}`, value: `${word.name}Alias`,
        validateInput: (value) => /^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(value) ? undefined : 'Enter a valid PHP identifier.',
      }) : undefined;
      if (selected.aliasRequired && !alias) return;
      const result = await client.sendRequest<ProtocolWorkspaceEdit | null>('phpCompanion/addImport', {
        textDocument: { uri: document.uri.toString() }, position: word.range.start,
        range: { start: word.range.start, end: word.range.end }, name: word.name, fqcn: selected.fqcn, alias,
      });
      const edit = fromProtocolWorkspaceEdit(result);
      if (edit) await vscode.workspace.applyEdit(edit);
      return;
    }
    await versions.ensureForUri(document.uri);
    const manager = await workspace();
    manager.indexDocument(document);
    const version = document.version;
    if (!await manager.ensureProjectIndex(document.uri) || document.version !== version) {
      void vscode.window.showWarningMessage('Import cancelled because the document changed while candidates were indexed.');
      return;
    }
    const file = manager.index.getFile(document.uri.toString());
    if (!file || file.errors.length) return void vscode.window.showWarningMessage('Cannot import into a PHP file with syntax errors.');
    if (manager.index.findSymbolAt(document.uri.toString(), document.offsetAt(word.range.start))) return;
    const candidates = rankedImportCandidates(manager.index, file, word.name, versions.stateForUri(document.uri)?.composer?.psr4 ?? []);
    if (!candidates.length) return void vscode.window.showInformationMessage(`No Composer PSR-4 candidate found for ${word.name}.`);
    const selected = candidates.length === 1 ? candidates[0] : (await vscode.window.showQuickPick(
      candidates.map((candidate) => ({ label: candidate.fqcn, description: vscode.workspace.asRelativePath(vscode.Uri.parse(candidate.uri)), candidate })),
      { placeHolder: `Select the class to import for ${word.name}` },
    ))?.candidate;
    if (!selected) return;
    let alias: string | undefined;
    const collision = file.imports.some((item) => item.alias.toLowerCase() === word.name.toLowerCase() && item.fqcn.toLowerCase() !== selected.fqcn.toLowerCase())
      || file.declarations.some((item) => item.name.toLowerCase() === word.name.toLowerCase());
    if (collision) {
      alias = await vscode.window.showInputBox({ prompt: `Choose an alias for ${selected.fqcn}`, value: word.name, validateInput: (value) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) ? undefined : 'Enter a valid PHP identifier.' });
      if (!alias) return;
    }
    const edit = buildAddImportEdit(document, file, selected.fqcn, alias);
    if (edit) await vscode.workspace.applyEdit(edit);
  });
  register('phpCompanion.optimizeImports', async (uri?: vscode.Uri, options?: { preview?: boolean }) => {
    const document = uri ? await vscode.workspace.openTextDocument(uri) : vscode.window.activeTextEditor?.document;
    if (!document || document.languageId !== 'php') return;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
    if (configuration.get<string>('indexing.mode', 'onDemand') === 'off') return void vscode.window.showInformationMessage('PHP Companion Optimize Imports requires project indexing.');
    if (selfLanguageServer) {
      const client = await languageServer; if (!client) return;
      const actions = await client.sendRequest<Array<{ title: string; kind?: string; edit?: ProtocolWorkspaceEdit }>>('textDocument/codeAction', {
        textDocument: { uri: document.uri.toString() },
        range: { start: new vscode.Position(0, 0), end: document.positionAt(document.getText().length) },
        context: { diagnostics: [], only: ['source.organizeImports'] },
        phpCompanion: { importSort: configuration.get<'grouped' | 'fqcn'>('imports.sort', 'grouped') },
      });
      const action = actions.find((candidate) => candidate.kind === 'source.organizeImports' && candidate.edit);
      const edit = fromProtocolWorkspaceEdit(action?.edit);
      if (!edit) return void vscode.window.showInformationMessage('PHP imports are already organized or cannot be changed safely.');
      if (options?.preview ?? configuration.get<boolean>('imports.optimize.preview', true)) {
        const choice = await vscode.window.showInformationMessage('Optimize imports.', { modal: true }, 'Preview', 'Apply');
        if (choice === 'Preview') {
          const preview = await vscode.workspace.openTextDocument({ language: 'php', content: applyTextEdits(document.getText(), edit.get(document.uri)) });
          await vscode.commands.executeCommand('vscode.diff', document.uri, preview.uri, `Optimize Imports: ${vscode.workspace.asRelativePath(document.uri)}`);
          if (await vscode.window.showInformationMessage('Apply the previewed import changes?', { modal: true }, 'Apply') !== 'Apply') return;
        } else if (choice !== 'Apply') return;
      }
      await vscode.workspace.applyEdit(edit);
      return;
    }
    await versions.ensureForUri(document.uri);
    const manager = await workspace();
    manager.indexDocument(document);
    const version = document.version;
    if (!await manager.ensureProjectIndex(document.uri) || document.version !== version) return void vscode.window.showWarningMessage('Optimize Imports cancelled because the document changed.');
    const file = manager.index.getFile(document.uri.toString());
    if (!file || file.errors.length) return void vscode.window.showWarningMessage('Cannot optimize imports in a PHP file with syntax errors.');
    const result = buildOptimizeImportsEdit(document, file, manager.index, configuration.get<'grouped' | 'fqcn'>('imports.sort', 'grouped'));
    if (!result.edit || result.optimizedSource === undefined) return void vscode.window.showInformationMessage('PHP imports are already optimized or cannot be changed safely.');
    if (options?.preview ?? configuration.get<boolean>('imports.optimize.preview', true)) {
      const choice = await vscode.window.showInformationMessage(`Optimize imports (${result.removed} removed).`, { modal: true }, 'Preview', 'Apply');
      if (choice === 'Preview') {
        const preview = await vscode.workspace.openTextDocument({ language: 'php', content: result.optimizedSource });
        await vscode.commands.executeCommand('vscode.diff', document.uri, preview.uri, `Optimize Imports: ${vscode.workspace.asRelativePath(document.uri)}`);
        if (await vscode.window.showInformationMessage('Apply the previewed import changes?', { modal: true }, 'Apply') !== 'Apply') return;
      } else if (choice !== 'Apply') return;
    }
    if (document.version !== version) return void vscode.window.showWarningMessage('Optimize Imports cancelled because the document changed.');
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
      throw new Error('PHP Companion Rename requires indexing.mode to be onDemand or experimental.');
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
  const lazyRename: vscode.RenameProvider = {
    prepareRename: async (document, position, token) => {
      try {
        if (selfLanguageServer) {
          const client = await languageServer; if (!client || token.isCancellationRequested) return undefined;
          const prepared = await client.sendRequest<null | { range: { start: { line: number; character: number }; end: { line: number; character: number } }; placeholder?: string }>(
            'textDocument/prepareRename', { textDocument: { uri: document.uri.toString() }, position }, token,
          );
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
        const client = await languageServer; if (!client || token.isCancellationRequested) return undefined;
        const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
        const result = await client.sendRequest<ProtocolWorkspaceEdit | null>(
          'textDocument/rename', {
            textDocument: { uri: document.uri.toString() }, position, newName,
            phpCompanion: {
              renameFile: configuration.get<'off' | 'preview' | 'always'>('rename.file', 'preview') !== 'off',
              includePhpDoc: configuration.get<boolean>('rename.phpDoc', true),
            },
          }, token,
        );
        const converted = splitProtocolTypeRenameEdit(result);
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
  const lazyPaste: vscode.DocumentPasteEditProvider = {
    prepareDocumentPaste: async (document, ranges, transfer) => {
      const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
      if (configuration.get<string>('imports.onPaste', 'prompt') === 'off') return;
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
      if (configuration.get<string>('imports.onPaste', 'prompt') === 'off' || configuration.get<string>('indexing.mode', 'onDemand') === 'off') return undefined;
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
          if (configuration.get<'auto' | 'prompt'>('imports.onPaste', 'prompt') === 'auto' && ambiguity) return undefined;
        }
        const edits: vscode.DocumentPasteEdit[] = [];
        for (let variant of variants) {
          if (!variant.length) continue;
          let plan = await requestImportPlan(document, position, variant); if (!plan) continue;
          if (plan.conflict) {
            if (configuration.get<'auto' | 'prompt'>('imports.onPaste', 'prompt') === 'auto') continue;
            const selectedAlias = await vscode.window.showInputBox({ prompt: `Choose an alias for ${plan.conflict.fqcn}`, value: `${plan.conflict.sourceAlias}Alias`,
              validateInput: (value) => /^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(value) ? undefined : 'Enter a valid PHP identifier.' });
            if (!selectedAlias) continue;
            variant = variant.map((symbol) => symbol.fqcn === plan!.conflict!.fqcn ? { ...symbol, selectedAlias } : symbol);
            plan = await requestImportPlan(document, position, variant); if (!plan || plan.conflict) continue;
          }
          const paste = new vscode.DocumentPasteEdit(replacePasteAliases(text, plan.replacements), variants.length > 1 ? `Paste with PHP imports: ${variant.at(-1)?.fqcn}` : 'Paste with PHP imports', PHP_IMPORT_PASTE_KIND);
          const additionalEdit = fromProtocolWorkspaceEdit(plan.edit); if (additionalEdit) paste.additionalEdit = additionalEdit;
          if (configuration.get<'auto' | 'prompt'>('imports.onPaste', 'prompt') === 'prompt') paste.yieldTo = [vscode.DocumentDropOrPasteEditKind.Text];
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
          await movePipeline;
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
            if (document?.isDirty) throw new MoveError(`Cannot move PHP types: save related file ${file.oldUri.fsPath} first.`);
            return { ...file, source: document?.getText() ?? new TextDecoder().decode(await vscode.workspace.fs.readFile(file.oldUri)) };
          }));
          if (vscode.workspace.getConfiguration('phpCompanion', files[0]!.oldUri).get<string>('indexing.mode', 'onDemand') === 'off') {
            throw new MoveError('Safe Move requires phpCompanion.indexing.mode to be onDemand or experimental.');
          }
          if (selfLanguageServer) {
            const planned = await requestSafeMovePlan(snapshottedFiles, false);
            pendingServerSafeMoves.set(key, planned.reconciliation);
            // Participate in VS Code's file-operation transaction so the
            // namespace and proven references cannot be stranded if an async
            // did-rename listener is delayed or dropped on Windows. Edits for
            // the destination are remapped to the source document because the
            // will-rename edit is applied before the filesystem operation.
            return beforeFileRenameEdit(planned.edit, managedFiles);
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
          void vscode.window.showWarningMessage(error instanceof MoveError ? message : `Safe Move failed: ${message}`);
          // Rejecting the will-rename participant lets VS Code abort the Explorer
          // operation instead of leaving a moved file with stale PHP references.
          throw error;
        }
      })();
      const settledPlanning = planning.then(() => undefined, () => undefined);
      pendingMovePlanning.set(key, settledPlanning);
      void settledPlanning.then(() => setTimeout(() => {
        if (pendingMovePlanning.get(key) === settledPlanning) pendingMovePlanning.delete(key);
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
      const serverReconciliation = pendingServerSafeMoves.get(key);
      pendingServerSafeMoves.delete(key);
      const reconciliation = pendingSafeMoves.get(key);
      pendingSafeMoves.delete(key);
      if (!serverReconciliation && !reconciliation) return;
      movePipeline = movePipeline.then(async () => {
        if (serverReconciliation) {
          const currentUri = new Map(serverReconciliation.map((move) => [fileOperationUriKey(move.oldUri), vscode.Uri.parse(move.newUri)]));
          const touched = serverReconciliation.flatMap((move) => move.sourceUris.map((uri) => currentUri.get(fileOperationUriKey(uri)) ?? vscode.Uri.parse(uri)));
          await applyMoveReconciliation(await requestMoveReconciliation(serverReconciliation), touched);
          return;
        }
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
}

export function deactivate(): void {}

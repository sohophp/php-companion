import * as vscode from 'vscode';
import { basename } from 'node:path';
import { performance } from 'node:perf_hooks';
import { VersionManager } from './versionManager.js';
import { WorkspaceManager } from './workspaceManager.js';
import { createPhpType, type PhpTypeKind } from '../generation/createType.js';
import { copyIdentity, CurrentDocumentDiagnostics, NamespaceCodeActions } from '../editor/currentDocument.js';
import { PhpRenameProvider } from '../refactor/rename.js';
import { PhpImportPasteProvider, phpPasteMetadata, resolveDocumentImports } from '../paste/importPasteProvider.js';
import {
  buildMoveEdits,
  buildMoveReconciliationEdits,
  describeMoveReconciliation,
  MoveError,
  type MoveReconciliation,
} from '../refactor/move.js';
import { buildAddImportEdit, buildOptimizeImportsEdit, rankedImportCandidates } from '../imports/importWorkflows.js';
import { ImportClassCodeActions, typeNameAt } from '../imports/providers.js';

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

export function activate(context: vscode.ExtensionContext): void {
  const started = performance.now();
  const output = vscode.window.createOutputChannel('PHP Companion', { log: true });
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  const versions = new VersionManager(status);
  const diagnostics = new CurrentDocumentDiagnostics(versions);
  const delegatedSafeMoves = new Set<string>();
  const pendingSafeMoves = new Map<string, MoveReconciliation[]>();
  let movePipeline: Promise<void> = Promise.resolve();
  let workspacePromise: Promise<WorkspaceManager> | undefined;

  const workspace = (): Promise<WorkspaceManager> => {
    workspacePromise ??= WorkspaceManager.create(context, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? [], output);
    return workspacePromise;
  };

  const writeMoveEditsToDisk = async (edits: vscode.WorkspaceEdit): Promise<void> => {
    const openDocuments = new Set<vscode.TextDocument>();
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const [uri, textEdits] of edits.entries()) {
      const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
      if (document) {
        openDocuments.add(document);
        for (const textEdit of textEdits) workspaceEdit.replace(uri, textEdit.range, textEdit.newText);
      } else {
        const current = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        await vscode.workspace.fs.writeFile(uri, Buffer.from(applyTextEdits(current, textEdits), 'utf8'));
      }
    }
    if (workspaceEdit.entries().length && !await vscode.workspace.applyEdit(workspaceEdit)) throw new MoveError('VS Code could not update open PHP documents.');
    for (const document of openDocuments) {
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
      const source = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
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
    for (const state of versions.allStates()) lines.push(`- ${state.folder.name}: PHP ${state.resolution.target} — ${state.resolution.sourceDetail}`, `  - PSR-4 mappings: ${state.composer?.psr4.length ?? 0}`);
    const document = await vscode.workspace.openTextDocument({ language: 'markdown', content: lines.join('\n') });
    await vscode.window.showTextDocument(document, { preview: true });
  });
  register('phpCompanion.showPerformanceLog', () => output.show());
  register('phpCompanion.rebuildIndex', async () => (await experimentalWorkspace())?.rebuild(true));
  register('phpCompanion.safeMove', async (sourceUri?: vscode.Uri, targetUri?: vscode.Uri) => {
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
      const manager = await workspace();
      await manager.refreshProjectIndexes([source]);
      await buildMoveEdits(manager.index, [{ oldUri: source, newUri: target }], (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []);
      const reconciliation = describeMoveReconciliation(manager.index, [{ oldUri: source, newUri: target }], (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []);
      const key = `${source.toString()}→${target.toString()}`;
      delegatedSafeMoves.add(key);
      try {
        const rename = new vscode.WorkspaceEdit();
        rename.renameFile(source, target, { overwrite: false }, { label: `Move ${basename(source.fsPath)}`, needsConfirmation: false });
        if (!await vscode.workspace.applyEdit(rename)) throw new MoveError('VS Code could not move the PHP file.');
        await manager.refreshProjectIndexes([target]);
        const textEdits = buildMoveReconciliationEdits(manager.index, reconciliation);
        await writeMoveEditsToDisk(textEdits);
        await refreshMoveIndex(manager, [{ oldUri: source, newUri: target }], textEdits);
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
    });
  };
  const lazyRename: vscode.RenameProvider = {
    prepareRename: async (document, position, token) => {
      try {
        const provider = await renameProvider(document);
        return provider?.prepareRename(document, position, token);
      } catch (error) {
        output.warn(`Rename preparation rejected: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    },
    provideRenameEdits: async (document, position, newName, token) => {
      try {
        const provider = await renameProvider(document);
        return await provider?.provideRenameEdits(document, position, newName, token);
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
      await versions.ensureForUri(document.uri);
      const manager = await workspace();
      manager.indexDocument(document);
      return new PhpImportPasteProvider(manager.index, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []).prepareDocumentPaste(document, ranges, transfer);
    },
    provideDocumentPasteEdits: async (document, ranges, transfer) => {
      const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
      if (configuration.get<string>('imports.onPaste', 'prompt') === 'off' || configuration.get<string>('indexing.mode', 'onDemand') === 'off') return undefined;
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
      if (files.every((file) => delegatedSafeMoves.has(`${file.oldUri.toString()}→${file.newUri.toString()}`))) return;
      if (!vscode.workspace.getConfiguration('phpCompanion', files[0]!.oldUri).get<boolean>('move.enabled', true)) return;
      event.waitUntil((async (): Promise<vscode.WorkspaceEdit> => {
        try {
          await movePipeline;
          await Promise.all(files.flatMap((file) => [versions.ensureForUri(file.oldUri), versions.ensureForUri(file.newUri)]));
          if (vscode.workspace.getConfiguration('phpCompanion', files[0]!.oldUri).get<string>('indexing.mode', 'onDemand') === 'off') {
            throw new MoveError('Safe Move requires phpCompanion.indexing.mode to be onDemand or experimental.');
          }
          const manager = await workspace();
          // Rebuild from the current files before every Explorer move. A prior
          // rename may have changed both URIs and namespaces since the last
          // on-demand index, so a cached "complete" index is not sufficient.
          await manager.refreshProjectIndexes(files.map((file) => file.oldUri));
          await buildMoveEdits(
            manager.index,
            files,
            (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? [],
          );
          const reconciliation = describeMoveReconciliation(
            manager.index,
            files,
            (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? [],
          );
          pendingSafeMoves.set(files.map((file) => `${file.oldUri}→${file.newUri}`).sort().join('|'), reconciliation);
          // Other PHP extensions may also participate in the rename. Reconcile
          // against their final result in onDidRenameFiles instead of applying
          // stale, overlapping ranges from the pre-move document.
          return new vscode.WorkspaceEdit();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          output.warn(`Safe Move rejected: ${message}`);
          void vscode.window.showWarningMessage(error instanceof MoveError ? message : `Safe Move failed: ${message}`);
          // Rejecting the will-rename participant lets VS Code abort the Explorer
          // operation instead of leaving a moved file with stale PHP references.
          throw error;
        }
      })());
    }),
    vscode.workspace.onDidRenameFiles(async (event) => {
      const files = event.files.filter((file) => file.oldUri.path.endsWith('.php') && file.newUri.path.endsWith('.php'));
      if (!files.length) return;
      const key = files.map((file) => `${file.oldUri}→${file.newUri}`).sort().join('|');
      if (files.every((file) => delegatedSafeMoves.has(`${file.oldUri.toString()}→${file.newUri.toString()}`))) return;
      const reconciliation = pendingSafeMoves.get(key);
      pendingSafeMoves.delete(key);
      if (!reconciliation) return;
      movePipeline = movePipeline.then(async () => {
        const manager = await workspace();
        await manager.refreshProjectIndexes(files.map((file) => file.newUri));
        const edits = buildMoveReconciliationEdits(manager.index, reconciliation);
        await writeMoveEditsToDisk(edits);
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

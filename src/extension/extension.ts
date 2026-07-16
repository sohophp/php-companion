import * as vscode from 'vscode';
import { VersionManager } from './versionManager.js';
import { WorkspaceManager } from './workspaceManager.js';
import { PhpRenameProvider, RenameError, buildRenameEdit } from '../refactor/rename.js';
import { PhpImportPasteProvider, phpPasteMetadata, resolveDocumentImports } from '../paste/importPasteProvider.js';
import { t } from './localize.js';
import { buildMoveEdits } from '../refactor/move.js';
import { basename } from 'node:path';

async function uriExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  const versions = new VersionManager(status);
  await versions.refresh();
  const workspace = await WorkspaceManager.create(
    context,
    (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? [],
  );
  context.subscriptions.push(status, versions, workspace);

  if (vscode.workspace.getConfiguration('phpCompanion').get<boolean>('indexing.onStartup', false)) {
    await workspace.rebuild();
  } else {
    await workspace.indexOpenDocuments();
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('phpCompanion.selectPhpVersion', () => versions.selectVersion()),
    vscode.commands.registerCommand('phpCompanion.detectPhpVersions', () => versions.refresh()),
    vscode.commands.registerCommand('phpCompanion.rebuildIndex', () => workspace.rebuild(true)),
    vscode.commands.registerCommand('phpCompanion.showCompatibilityReport', async () => {
      const document = await vscode.workspace.openTextDocument({ language: 'markdown', content: compatibilityReport(versions, workspace) });
      await vscode.window.showTextDocument(document, { preview: true });
    }),
    vscode.commands.registerCommand('phpCompanion.renameClassLike', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'php') return;
      await workspace.ensureFullIndex();
      const symbol = workspace.index.findSymbolAt(editor.document.uri.toString(), editor.document.offsetAt(editor.selection.active));
      if (!symbol) return void vscode.window.showInformationMessage('No PHP class-like symbol at the cursor.');
      const oldName = 'name' in symbol ? symbol.name : symbol.fqcn.split('\\').at(-1)!;
      const declaration = workspace.index.findDeclarations(symbol.fqcn)[0];
      const targetVersion = versions.stateForUri(editor.document.uri)?.resolution.target;
      if (declaration?.kind === 'enum' && targetVersion && targetVersion < '8.1') {
        return void vscode.window.showErrorMessage(`Enums require PHP 8.1 or later (target: PHP ${targetVersion}).`);
      }
      const newName = await vscode.window.showInputBox({ prompt: t('renamePrompt', oldName), value: oldName, valueSelection: [0, oldName.length] });
      if (!newName || newName === oldName) return;
      try {
        const configuration = vscode.workspace.getConfiguration('phpCompanion', editor.document.uri);
        if (!declaration) throw new RenameError(`Declaration not found for ${symbol.fqcn}.`);
        const declarationUri = vscode.Uri.parse(declaration.uri);
        const syncFileName = configuration.get('rename.syncFileName', 'whenMatched') === 'whenMatched'
          && basename(declarationUri.fsPath) === `${oldName}.php`;
        const targetUri = syncFileName ? vscode.Uri.joinPath(declarationUri, '..', `${newName}.php`) : undefined;
        if (targetUri && await uriExists(targetUri)) throw new RenameError(t('conflict', targetUri.fsPath));
        const edit = await buildRenameEdit(workspace.index, symbol, newName, {
          syncFileName: false,
          includeTextMatches: configuration.get('rename.includeTextMatches', 'confirm'),
        });
        const applied = await vscode.workspace.applyEdit(edit);
        if (!applied) {
          const declarationUri = vscode.Uri.parse(declaration!.uri);
          const targetUri = vscode.Uri.joinPath(declarationUri, '..', `${newName}.php`);
          const affected = edit.entries().map(([uri, edits]) => ({ uri: uri.toString(), scheme: uri.scheme, edits: edits.length }));
          const openDocuments = vscode.workspace.textDocuments
            .filter((document) => affected.some((item) => item.uri === document.uri.toString()) || document.uri.toString() === declarationUri.toString())
            .map((document) => ({ uri: document.uri.toString(), dirty: document.isDirty, version: document.version }));
          console.error('PHP Companion rename workspace edit rejected', {
            source: declarationUri.toString(),
            sourceScheme: declarationUri.scheme,
            target: targetUri.toString(),
            targetScheme: targetUri.scheme,
            affected,
            openDocuments,
          });
          throw new RenameError('VS Code rejected the workspace edit. See Log (Remote Extension Host) for PHP Companion rename diagnostics.');
        }
        if (targetUri) {
          const fileEdit = new vscode.WorkspaceEdit();
          fileEdit.renameFile(declarationUri, targetUri, { overwrite: false });
          if (!await vscode.workspace.applyEdit(fileEdit)) {
            console.error('PHP Companion file rename rejected after semantic rename', { source: declarationUri.toString(), target: targetUri.toString() });
            throw new RenameError('Class references were updated, but VS Code rejected the file rename. See Log (Remote Extension Host).');
          }
        }
      } catch (error) {
        const message = error instanceof RenameError || error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t('renameFailed', message));
      }
    }),
    vscode.commands.registerCommand('phpCompanion.resolvePastedImports', async () => {
      const document = vscode.window.activeTextEditor?.document;
      if (document?.languageId === 'php') await resolveDocumentImports(document, workspace.index);
    }),
    vscode.languages.registerRenameProvider(
      [{ language: 'php', scheme: 'file' }, { language: 'php', scheme: 'vscode-remote' }],
      new PhpRenameProvider(
        workspace.index,
        (uri) => versions.stateForUri(uri)?.resolution.target,
        () => workspace.ensureFullIndex(),
      ),
    ),
    vscode.languages.registerDocumentPasteEditProvider(
      [{ language: 'php', scheme: 'file' }, { language: 'php', scheme: 'vscode-remote' }],
      new PhpImportPasteProvider(workspace.index),
      phpPasteMetadata,
    ),
    vscode.workspace.onWillRenameFiles((event): void => {
      const phpFiles = event.files.filter((file) => file.oldUri.path.toLowerCase().endsWith('.php') && file.newUri.path.toLowerCase().endsWith('.php'));
      if (!phpFiles.length) return;
      event.waitUntil((async (): Promise<vscode.WorkspaceEdit> => {
        await workspace.ensureFullIndex();
        return buildMoveEdits(workspace.index, phpFiles, (uri) => versions.stateForUri(uri)?.composer?.psr4 ?? []);
      })());
    }),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (!event.affectsConfiguration('phpCompanion')) return;
      await versions.refresh();
      if (vscode.workspace.getConfiguration('phpCompanion').get<boolean>('indexing.onStartup', false)) {
        await workspace.rebuild();
      }
    }),
    ...['**/composer.json', '**/composer.lock'].map((pattern) => {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidChange(() => versions.refresh());
      watcher.onDidCreate(() => versions.refresh());
      watcher.onDidDelete(() => versions.refresh());
      return watcher;
    }),
  );
}

function compatibilityReport(versions: VersionManager, workspace: WorkspaceManager): string {
  const lines = [`# ${t('reportTitle')}`, '', '## PHP versions', ''];
  for (const state of versions.allStates()) {
    lines.push(`- **${state.folder.name}**: PHP ${state.resolution.target} — ${state.resolution.sourceDetail}`);
    for (const executable of state.resolution.discovered) lines.push(`  - \`${executable.path}\`: ${executable.version}`);
    for (const warning of state.resolution.warnings) lines.push(`  - ⚠️ ${warning}`);
  }
  lines.push('', '## Index', '', `- Files: ${workspace.index.getFiles().length}`, `- Problems: ${workspace.index.getProblems().length}`);
  for (const problem of workspace.index.getProblems()) lines.push(`  - ${problem.uri ?? ''} ${problem.message}`.trimEnd());
  return lines.join('\n');
}

export function deactivate(): void {}

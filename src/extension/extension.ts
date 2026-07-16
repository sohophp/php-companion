import * as vscode from 'vscode';
import { VersionManager } from './versionManager.js';
import { WorkspaceManager } from './workspaceManager.js';
import { PhpRenameProvider, RenameError, buildRenameEdit } from '../refactor/rename.js';
import { PhpImportPasteProvider, phpPasteMetadata, resolveDocumentImports } from '../paste/importPasteProvider.js';
import { t } from './localize.js';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  const versions = new VersionManager(status);
  const workspace = await WorkspaceManager.create(context);
  context.subscriptions.push(status, versions, workspace);

  await Promise.all([versions.refresh(), workspace.rebuild()]);

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
        const edit = await buildRenameEdit(workspace.index, symbol, newName, {
          syncFileName: configuration.get('rename.syncFileName', 'whenMatched') === 'whenMatched',
          includeTextMatches: configuration.get('rename.includeTextMatches', 'confirm'),
        });
        await vscode.workspace.applyEdit(edit);
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
      { language: 'php', scheme: 'file' },
      new PhpRenameProvider(workspace.index, (uri) => versions.stateForUri(uri)?.resolution.target),
    ),
    vscode.languages.registerDocumentPasteEditProvider({ language: 'php' }, new PhpImportPasteProvider(workspace.index), phpPasteMetadata),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('phpCompanion')) await Promise.all([versions.refresh(), workspace.rebuild()]);
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

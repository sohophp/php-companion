import * as vscode from 'vscode';
import { findComposerRoot, loadComposerProject, type ComposerProject } from '../composer/project.js';
import { resolvePhpVersion } from '../php-version/resolver.js';
import { SUPPORTED_PHP_VERSIONS, type PhpVersionResolution, type PhpVersionSetting } from '../php-version/types.js';
import { t } from './localize.js';

export interface FolderState {
  folder: vscode.WorkspaceFolder;
  composer?: ComposerProject;
  resolution: PhpVersionResolution;
}

export class VersionManager implements vscode.Disposable {
  private readonly states = new Map<string, FolderState>();
  private readonly disposables: vscode.Disposable[] = [];
  private activeFolder?: vscode.WorkspaceFolder;

  constructor(private readonly status: vscode.StatusBarItem) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.activeFolder = editor ? vscode.workspace.getWorkspaceFolder(editor.document.uri) : undefined;
        this.render();
      }),
    );
  }

  async refresh(folder?: vscode.WorkspaceFolder): Promise<void> {
    const folders = folder ? [folder] : (vscode.workspace.workspaceFolders ?? []);
    await Promise.all(folders.map(async (workspaceFolder) => {
      const configuration = vscode.workspace.getConfiguration('phpCompanion', workspaceFolder.uri);
      const composerRoot = await findComposerRoot(workspaceFolder.uri.fsPath, workspaceFolder.uri.fsPath);
      const includeDev = configuration.get<boolean>('composer.includeDevAutoload', true);
      const composer = composerRoot ? await loadComposerProject(composerRoot, includeDev) : undefined;
      const setting = configuration.get<PhpVersionSetting>('phpVersion', 'auto');
      const configuredExecutable = configuration.get<string | null>('phpExecutablePath') ?? undefined;
      const resolution = await resolvePhpVersion({ setting, configuredExecutable, composer });
      this.states.set(workspaceFolder.uri.toString(), { folder: workspaceFolder, composer, resolution });
    }));
    this.activeFolder ??= vscode.window.activeTextEditor
      ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
      : folders[0];
    this.render();
  }

  stateForUri(uri: vscode.Uri): FolderState | undefined {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    return folder ? this.states.get(folder.uri.toString()) : undefined;
  }

  allStates(): FolderState[] {
    return [...this.states.values()];
  }

  async selectVersion(): Promise<void> {
    const folder = this.activeFolder ?? vscode.workspace.workspaceFolders?.[0];
    if (!folder) return void vscode.window.showInformationMessage(t('noWorkspace'));
    const state = this.states.get(folder.uri.toString());
    const items: vscode.QuickPickItem[] = [
      { label: `$(sync) ${t('auto')}`, description: state ? t('detectedFrom', state.resolution.sourceDetail) : undefined },
      ...SUPPORTED_PHP_VERSIONS.map((version) => ({ label: `PHP ${version}`, description: version === state?.resolution.target ? '$(check)' : undefined })),
      { label: `$(refresh) ${t('redetect')}` },
      { label: `$(gear) ${t('settings')}` },
    ];
    const selected = await vscode.window.showQuickPick(items, { placeHolder: `PHP Companion — ${folder.name}` });
    if (!selected) return;
    if (selected.label.includes(t('redetect'))) return this.refresh(folder);
    if (selected.label.includes(t('settings'))) {
      await vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', 'phpCompanion');
      return;
    }
    const value = selected.label.includes(t('auto')) ? 'auto' : selected.label.replace('PHP ', '') as PhpVersionSetting;
    await vscode.workspace.getConfiguration('phpCompanion', folder.uri).update('phpVersion', value, vscode.ConfigurationTarget.WorkspaceFolder);
    await this.refresh(folder);
  }

  private render(): void {
    const folder = this.activeFolder ?? vscode.workspace.workspaceFolders?.[0];
    const state = folder ? this.states.get(folder.uri.toString()) : undefined;
    if (!state) {
      this.status.hide();
      return;
    }
    this.status.text = `$(symbol-property) PHP Companion: ${state.resolution.target}`;
    this.status.tooltip = `${t('detectedFrom', state.resolution.sourceDetail)}\n${state.resolution.detectedVersion ?? ''}`.trim();
    this.status.command = 'phpCompanion.selectPhpVersion';
    this.status.show();
  }

  dispose(): void {
    this.disposables.forEach((item) => item.dispose());
  }
}

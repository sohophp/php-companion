import * as vscode from 'vscode';
import { findComposerRoot, loadComposerProject, type ComposerProject } from '../composer/project.js';
import { resolvePhpVersion } from '../php-version/resolver.js';
import { SUPPORTED_PHP_VERSIONS, type PhpVersionResolution, type PhpVersionSetting } from '../php-version/types.js';
import { t } from './localize.js';
import { isAbsolute, relative } from 'node:path';

export interface FolderState {
  folder: vscode.WorkspaceFolder;
  composer?: ComposerProject;
  resolution: PhpVersionResolution;
}

export class VersionManager implements vscode.Disposable {
  private readonly states = new Map<string, FolderState>();
  private readonly projectStates = new Map<string, FolderState>();
  private readonly watchedProjects = new Set<string>();
  private readonly refreshTimers = new Map<string, NodeJS.Timeout>();
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
      const state = { folder: workspaceFolder, composer, resolution };
      this.states.set(workspaceFolder.uri.toString(), state);
      if (composerRoot) {
        this.projectStates.set(composerRoot, state);
        this.watchComposerProject(composerRoot, workspaceFolder.uri);
      }
    }));
    this.activeFolder ??= vscode.window.activeTextEditor
      ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
      : folders[0];
    this.render();
  }

  async ensureForUri(uri: vscode.Uri): Promise<FolderState | undefined> {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) return undefined;
    const composerRoot = await findComposerRoot(uri.fsPath, folder.uri.fsPath);
    if (!composerRoot) {
      const existing = this.states.get(folder.uri.toString());
      if (existing) return existing;
      await this.refresh(folder);
      return this.states.get(folder.uri.toString());
    }
    const cached = this.projectStates.get(composerRoot);
    if (cached) return cached;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', uri);
    const composer = await loadComposerProject(composerRoot, configuration.get<boolean>('composer.includeDevAutoload', true));
    const resolution = await resolvePhpVersion({
      setting: configuration.get<PhpVersionSetting>('phpVersion', 'auto'),
      configuredExecutable: configuration.get<string | null>('phpExecutablePath') ?? undefined,
      composer,
    });
    const state = { folder, composer, resolution };
    this.projectStates.set(composerRoot, state);
    this.watchComposerProject(composerRoot, uri);
    this.states.set(folder.uri.toString(), state);
    this.render();
    return state;
  }

  stateForUri(uri: vscode.Uri): FolderState | undefined {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    const nested = [...this.projectStates.entries()]
      .filter(([root]) => { const path = relative(root, uri.fsPath); return path === '' || (!path.startsWith('..') && !isAbsolute(path)); })
      .sort(([left], [right]) => right.length - left.length)[0]?.[1];
    return nested ?? (folder ? this.states.get(folder.uri.toString()) : undefined);
  }

  allStates(): FolderState[] {
    return [...new Set([...this.states.values(), ...this.projectStates.values()])];
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

  private watchComposerProject(root: string, uri: vscode.Uri): void {
    if (this.watchedProjects.has(root)) return;
    this.watchedProjects.add(root);
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, '{composer.json,composer.lock}'));
    const schedule = (): void => {
      const pending = this.refreshTimers.get(root);
      if (pending) clearTimeout(pending);
      this.refreshTimers.set(root, setTimeout(() => {
        this.refreshTimers.delete(root);
        this.projectStates.delete(root);
        void this.ensureForUri(uri);
      }, 250));
    };
    this.disposables.push(watcher, watcher.onDidChange(schedule), watcher.onDidCreate(schedule), watcher.onDidDelete(schedule));
  }

  dispose(): void {
    for (const timer of this.refreshTimers.values()) clearTimeout(timer);
    this.disposables.forEach((item) => item.dispose());
  }
}

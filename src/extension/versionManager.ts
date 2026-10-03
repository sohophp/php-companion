import * as vscode from 'vscode';
import { findComposerRoot, loadComposerProject, type ComposerProject } from '../composer/project.js';
import { resolvePhpVersion } from '../php-version/resolver.js';
import { SUPPORTED_PHP_VERSIONS, type PhpVersionResolution, type PhpVersionSetting } from '../php-version/types.js';
import { t } from './localize.js';
import { isAbsolute, relative } from 'node:path';
import { probePhpRuntime, type PhpRuntime } from '@php-companion/runtime-probe';

export interface FolderState {
  folder: vscode.WorkspaceFolder;
  projectRoot?: string;
  composer?: ComposerProject;
  resolution: PhpVersionResolution;
  runtime?: PhpRuntime;
}

export class VersionManager implements vscode.Disposable {
  private readonly states = new Map<string, FolderState>();
  private readonly projectStates = new Map<string, FolderState>();
  private readonly watchedProjects = new Map<string, { folderUri: string; disposable: vscode.Disposable }>();
  private readonly refreshTimers = new Map<string, NodeJS.Timeout>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly stateEmitter = new vscode.EventEmitter<FolderState>();
  private readonly runtimeProbes = new Map<string, Promise<PhpRuntime | undefined>>();
  private readonly folderGenerations = new Map<string, number>();
  private nextGeneration = 0;
  private disposed = false;
  private activeFolder?: vscode.WorkspaceFolder;
  readonly onDidChangeState = this.stateEmitter.event;

  constructor(private readonly status: vscode.StatusBarItem) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.activeFolder = editor ? vscode.workspace.getWorkspaceFolder(editor.document.uri) : undefined;
        this.render();
      }),
    );
  }

  async refresh(folder?: vscode.WorkspaceFolder): Promise<void> {
    if (this.disposed) return;
    const folders = folder ? [folder] : (vscode.workspace.workspaceFolders ?? []);
    const folderUris = new Set(folders.map((item) => item.uri.toString()));
    if (!folder) this.folderGenerations.clear();
    const generations = new Map(folders.map(item => {
      const key = item.uri.toString(), generation = ++this.nextGeneration;
      this.folderGenerations.set(key, generation); return [key, generation];
    }));
    this.runtimeProbes.clear();
    if (folder) {
      this.states.delete(folder.uri.toString());
      for (const [root, state] of this.projectStates) if (state.folder.uri.toString() === folder.uri.toString()) this.projectStates.delete(root);
    } else {
      this.states.clear();
      this.projectStates.clear();
      for (const [root, watcher] of this.watchedProjects) {
        if (folderUris.has(watcher.folderUri)) continue;
        watcher.disposable.dispose();
        this.watchedProjects.delete(root);
        const timer = this.refreshTimers.get(root);
        if (timer) clearTimeout(timer);
        this.refreshTimers.delete(root);
      }
      this.activeFolder = vscode.window.activeTextEditor
        ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri) ?? folders[0]
        : folders[0];
    }
    await Promise.all(folders.map(async (workspaceFolder) => {
      const configuration = vscode.workspace.getConfiguration('phpCompanion', workspaceFolder.uri);
      const composerRoot = await findComposerRoot(workspaceFolder.uri.fsPath, workspaceFolder.uri.fsPath);
      const includeDev = configuration.get<boolean>('composer.includeDevAutoload', true);
      const composer = composerRoot ? await loadComposerProject(composerRoot, includeDev) : undefined;
      const setting = configuration.get<PhpVersionSetting>('phpVersion', 'auto');
      const configuredExecutable = configuration.get<string | null>('phpExecutablePath') ?? undefined;
      const resolution = await resolvePhpVersion({ setting, configuredExecutable, composer });
      const runtime = await this.runtimeFor(resolution, configuredExecutable);
      if (!this.isCurrentFolder(workspaceFolder, generations.get(workspaceFolder.uri.toString())!)) return;
      const state = { folder: workspaceFolder, ...(composerRoot ? { projectRoot: composerRoot } : {}), composer, resolution, ...(runtime ? { runtime } : {}) };
      this.states.set(workspaceFolder.uri.toString(), state);
      if (composerRoot) {
        this.projectStates.set(composerRoot, state);
        this.watchComposerProject(composerRoot, workspaceFolder.uri);
      }
      this.stateEmitter.fire(state);
    }));
    this.activeFolder ??= vscode.window.activeTextEditor
      ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
      : folders[0];
    const openProjectDocuments = vscode.workspace.textDocuments.filter((document) => document.languageId === 'php' && !document.isUntitled
      && folders.some(item => vscode.workspace.getWorkspaceFolder(document.uri)?.uri.toString() === item.uri.toString()
        && this.isCurrentFolder(item, generations.get(item.uri.toString())!)));
    await Promise.all(openProjectDocuments.map((document) => this.ensureForUri(document.uri)));
    this.render();
  }

  async ensureForUri(uri: vscode.Uri): Promise<FolderState | undefined> {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder || this.disposed) return undefined;
    const generation = this.folderGenerations.get(folder.uri.toString()) ?? ++this.nextGeneration;
    this.folderGenerations.set(folder.uri.toString(), generation);
    const composerRoot = await findComposerRoot(uri.fsPath, folder.uri.fsPath);
    if (!this.isCurrentFolder(folder, generation)) return this.stateForUri(uri);
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
    const configuredExecutable = configuration.get<string | null>('phpExecutablePath') ?? undefined;
    const runtime = await this.runtimeFor(resolution, configuredExecutable);
    if (!this.isCurrentFolder(folder, generation)) return this.stateForUri(uri);
    const state = { folder, projectRoot: composerRoot, composer, resolution, ...(runtime ? { runtime } : {}) };
    this.projectStates.set(composerRoot, state);
    this.watchComposerProject(composerRoot, uri);
    if (composerRoot === folder.uri.fsPath) this.states.set(folder.uri.toString(), state);
    this.stateEmitter.fire(state);
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

  async selectVersion(choose?: (items: vscode.QuickPickItem[], placeHolder: string) => Promise<vscode.QuickPickItem | undefined>): Promise<void> {
    const folder = this.activeFolder ?? vscode.workspace.workspaceFolders?.[0];
    if (!folder) return void vscode.window.showInformationMessage(t('noWorkspace'));
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    const state = activeUri ? this.stateForUri(activeUri) : this.states.get(folder.uri.toString());
    const items: vscode.QuickPickItem[] = [
      { label: `$(sync) ${t('auto')}`, description: state ? t('detectedFrom', state.resolution.sourceDetail) : undefined },
      ...SUPPORTED_PHP_VERSIONS.map((version) => ({ label: `PHP ${version}`, description: version === state?.resolution.target ? '$(check)' : undefined })),
      { label: `$(refresh) ${t('redetect')}` },
      { label: `$(gear) ${t('settings')}` },
    ];
    const placeHolder = t('versionScopeWorkspace', folder.name);
    const selected = choose ? await choose(items, placeHolder) : await vscode.window.showQuickPick(items, { placeHolder });
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
    if (this.disposed) return;
    const folder = this.activeFolder ?? vscode.workspace.workspaceFolders?.[0];
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    const state = activeUri ? this.stateForUri(activeUri) : folder ? this.states.get(folder.uri.toString()) : undefined;
    if (!state) {
      this.status.hide();
      return;
    }
    this.status.text = `$(symbol-property) SoPHP: ${state.resolution.target}`;
    this.status.tooltip = `${t('detectedFrom', state.resolution.sourceDetail)}\n${state.resolution.detectedVersion ?? ''}\n${state.runtime
      ? t('cliRuntimeDetails', state.runtime.version, state.runtime.sapi, String(state.runtime.loadedExtensions.length), state.runtime.path)
      : t('cliRuntimeUnknown')}`.trim();
    this.status.command = 'phpCompanion.selectPhpVersion';
    this.status.show();
  }

  private runtimeProbe(command: string): Promise<PhpRuntime | undefined> {
    let probe = this.runtimeProbes.get(command);
    if (!probe) { probe = probePhpRuntime(command); this.runtimeProbes.set(command, probe); }
    return probe;
  }

  private isCurrentFolder(folder: vscode.WorkspaceFolder, generation: number): boolean {
    return !this.disposed && this.folderGenerations.get(folder.uri.toString()) === generation
      && (vscode.workspace.workspaceFolders ?? []).some(item => item.uri.toString() === folder.uri.toString());
  }

  private async runtimeFor(resolution: PhpVersionResolution, configuredExecutable?: string): Promise<PhpRuntime | undefined> {
    const compact = resolution.target.replace('.', '');
    const commands = configuredExecutable ? [configuredExecutable]
      : resolution.executable ? [resolution.executable.path]
      : ['php', `php${compact}`, `php${resolution.target}`];
    const runtimes = await Promise.all([...new Set(commands)].map((command) => this.runtimeProbe(command)));
    return runtimes.find((runtime) => runtime?.minor === resolution.target);
  }

  private watchComposerProject(root: string, uri: vscode.Uri): void {
    if (this.watchedProjects.has(root)) return;
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
    this.watchedProjects.set(root, { folderUri: vscode.workspace.getWorkspaceFolder(uri)?.uri.toString() ?? '',
      disposable: vscode.Disposable.from(watcher, watcher.onDidChange(schedule), watcher.onDidCreate(schedule), watcher.onDidDelete(schedule)) });
  }

  dispose(): void {
    this.disposed = true;
    this.folderGenerations.clear();
    for (const timer of this.refreshTimers.values()) clearTimeout(timer);
    for (const watcher of this.watchedProjects.values()) watcher.disposable.dispose();
    this.disposables.forEach((item) => item.dispose());
    this.stateEmitter.dispose();
  }
}

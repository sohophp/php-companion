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
  private readonly watchedProjects = new Set<string>();
  private readonly refreshTimers = new Map<string, NodeJS.Timeout>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly stateEmitter = new vscode.EventEmitter<FolderState>();
  private readonly runtimeProbes = new Map<string, Promise<PhpRuntime | undefined>>();
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
    const folders = folder ? [folder] : (vscode.workspace.workspaceFolders ?? []);
    const folderUris = new Set(folders.map((item) => item.uri.toString()));
    this.runtimeProbes.clear();
    for (const key of folderUris) this.states.delete(key);
    for (const [root, state] of this.projectStates) if (folderUris.has(state.folder.uri.toString())) this.projectStates.delete(root);
    await Promise.all(folders.map(async (workspaceFolder) => {
      const configuration = vscode.workspace.getConfiguration('phpCompanion', workspaceFolder.uri);
      const composerRoot = await findComposerRoot(workspaceFolder.uri.fsPath, workspaceFolder.uri.fsPath);
      const includeDev = configuration.get<boolean>('composer.includeDevAutoload', true);
      const composer = composerRoot ? await loadComposerProject(composerRoot, includeDev) : undefined;
      const setting = configuration.get<PhpVersionSetting>('phpVersion', 'auto');
      const configuredExecutable = configuration.get<string | null>('phpExecutablePath') ?? undefined;
      const resolution = await resolvePhpVersion({ setting, configuredExecutable, composer });
      const runtime = await this.runtimeFor(resolution, configuredExecutable);
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
      && folderUris.has(vscode.workspace.getWorkspaceFolder(document.uri)?.uri.toString() ?? ''));
    await Promise.all(openProjectDocuments.map((document) => this.ensureForUri(document.uri)));
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
    const configuredExecutable = configuration.get<string | null>('phpExecutablePath') ?? undefined;
    const runtime = await this.runtimeFor(resolution, configuredExecutable);
    const state = { folder, projectRoot: composerRoot, composer, resolution, ...(runtime ? { runtime } : {}) };
    this.projectStates.set(composerRoot, state);
    this.watchComposerProject(composerRoot, uri);
    this.states.set(folder.uri.toString(), state);
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
    this.status.tooltip = `${t('detectedFrom', state.resolution.sourceDetail)}\n${state.resolution.detectedVersion ?? ''}\n${state.runtime
      ? `CLI ${state.runtime.version} (${state.runtime.sapi}), ${state.runtime.loadedExtensions.length} extensions — ${state.runtime.path}`
      : 'CLI runtime extensions: unknown or target-version mismatch'}`.trim();
    this.status.command = 'phpCompanion.selectPhpVersion';
    this.status.show();
  }

  private runtimeProbe(command: string): Promise<PhpRuntime | undefined> {
    let probe = this.runtimeProbes.get(command);
    if (!probe) { probe = probePhpRuntime(command); this.runtimeProbes.set(command, probe); }
    return probe;
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
    this.stateEmitter.dispose();
  }
}

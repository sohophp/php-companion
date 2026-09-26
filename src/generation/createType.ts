import * as vscode from 'vscode';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { Psr4Mapping } from '../composer/project.js';
import type { VersionManager } from '../extension/versionManager.js';
import { t } from '../extension/localize.js';
import { validPhpNamespaceSegment, validPhpTypeName } from './phpIdentifiers.js';

export type PhpTypeKind = 'class' | 'abstract class' | 'interface' | 'trait' | 'enum' | 'test';

const PREVIEW_SCHEME = 'sophp-type-preview';
const previewSources = new Map<string, string>();
let stageRootPromise: Promise<string> | undefined;

function stageRoot(): Promise<string> {
  stageRootPromise ??= mkdtemp(join(tmpdir(), 'sophp-type-stage-')).catch((error: unknown) => {
    stageRootPromise = undefined;
    throw error;
  });
  return stageRootPromise;
}

export function registerPhpTypePreviewProvider(): vscode.Disposable {
  const provider = vscode.workspace.registerTextDocumentContentProvider(PREVIEW_SCHEME, {
    provideTextDocumentContent: (uri) => previewSources.get(uri.toString()) ?? '',
  });
  const closed = vscode.workspace.onDidCloseTextDocument((document) => {
    if (document.uri.scheme === PREVIEW_SCHEME) previewSources.delete(document.uri.toString());
  });
  return vscode.Disposable.from(provider, closed);
}

function mappingsForDirectory(directory: string, mappings: Psr4Mapping[]): { mapping: Psr4Mapping; root: string }[] {
  return mappings
    .flatMap((mapping) => mapping.directories.map((root) => ({ mapping, root: resolve(root) })))
    .filter(({ root }) => {
      const path = relative(root, resolve(directory));
      return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
    })
    .sort((left, right) => right.root.length - left.root.length);
}

function mappingForDirectory(directory: string, mappings: Psr4Mapping[]): { mapping: Psr4Mapping; root: string } | undefined {
  return mappingsForDirectory(directory, mappings)[0];
}

function namespaceForMapping(directory: string, candidate: { mapping: Psr4Mapping; root: string }, targetVersion: string): string | undefined {
  const prefix = candidate.mapping.prefix.replace(/^\\+|\\+$/g, '');
  const parts = [
    ...(prefix ? prefix.split('\\') : []),
    ...relative(candidate.root, resolve(directory)).split(sep).filter(Boolean),
  ];
  if (parts.some((part) => !validPhpNamespaceSegment(part, targetVersion))) return undefined;
  return parts.join('\\');
}

export function namespaceForDirectory(directory: string, mappings: Psr4Mapping[], targetVersion = '8.5'): string | undefined {
  const candidate = mappingForDirectory(directory, mappings);
  return candidate && namespaceForMapping(directory, candidate, targetVersion);
}

export function renderPhpType(kind: PhpTypeKind, name: string, namespace: string, strictTypes: boolean): string {
  const declaration = kind === 'test' ? `final class ${name} extends \\PHPUnit\\Framework\\TestCase` : `${kind} ${name}`;
  return [
    '<?php',
    strictTypes ? 'declare(strict_types=1);' : undefined,
    namespace ? `namespace ${namespace};` : undefined,
    '',
    `${declaration}`,
    '{',
    '}',
    '',
  ].filter((line) => line !== undefined).join('\n');
}

async function directoryFromTarget(target?: vscode.Uri): Promise<vscode.Uri | undefined> {
  if (!target) {
    const active = vscode.window.activeTextEditor?.document.uri;
    return active ? vscode.Uri.joinPath(active, '..') : undefined;
  }
  try {
    const stat = await vscode.workspace.fs.stat(target);
    return stat.type & vscode.FileType.Directory ? target : vscode.Uri.joinPath(target, '..');
  } catch (error) {
    if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
      return target.path.toLowerCase().endsWith('.php') ? vscode.Uri.joinPath(target, '..') : target;
    }
    throw error;
  }
}

export async function createPhpType(kind: PhpTypeKind, versions: VersionManager, target?: vscode.Uri,
  options?: { testName?: string; testPreviewAction?: () => Promise<'apply' | 'cancel'>;
    testChooseNamespace?: (namespaces: string[]) => Promise<string | undefined>;
    testChooseTestDirectory?: () => Promise<vscode.Uri | undefined>;
    testClosePreview?: (tab: vscode.Tab) => Promise<boolean>;
    testOpenCreatedFile?: (uri: vscode.Uri) => Promise<void>;
    testApplyStagedEdit?: (edit: vscode.WorkspaceEdit) => Promise<boolean>;
    testApplySiblingEdit?: (edit: vscode.WorkspaceEdit, stagedPath: string) => Promise<boolean>;
    testApplyCreateEdit?: (edit: vscode.WorkspaceEdit) => Promise<boolean>;
    testApplyDestinationEdit?: (edit: vscode.WorkspaceEdit, stagedPath: string) => Promise<boolean> }): Promise<boolean> {
  let directoryUri = await directoryFromTarget(target);
  const folder = target ? vscode.workspace.getWorkspaceFolder(target)
    : directoryUri ? vscode.workspace.getWorkspaceFolder(directoryUri) : vscode.workspace.workspaceFolders?.[0];
  if (!directoryUri && folder) directoryUri = folder.uri;
  if (!directoryUri || !folder) { void vscode.window.showErrorMessage(t('createNoWorkspace')); return false; }
  const sourceDirectoryUri = directoryUri;
  const mappedDirectoryUri = (root: string): vscode.Uri => sourceDirectoryUri.scheme === 'file'
    ? vscode.Uri.file(root) : sourceDirectoryUri.with({ path: root.replaceAll('\\', '/') });

  const state = await versions.ensureForUri(directoryUri);
  const mappings = state?.composer?.psr4 ?? [];
  let unmappedTestDirectory = false;
  if (kind === 'test') {
    const dev = mappings.filter((mapping) => mapping.development);
    const targetMapping = mappingForDirectory(directoryUri.fsPath, dev);
    if (!targetMapping) {
      const testRoots = dev.flatMap((mapping) => mapping.directories.map((root) => ({ mapping, root })));
      const selected = testRoots.length === 1 ? testRoots[0] : testRoots.length > 1
        ? await vscode.window.showQuickPick(testRoots.map((item) => ({
          label: item.mapping.prefix || t('globalNamespace'),
          description: vscode.workspace.asRelativePath(mappedDirectoryUri(item.root), true),
          item,
        })), { placeHolder: t('chooseTestDirectory') }).then((choice) => choice?.item)
        : undefined;
      if (testRoots.length > 1 && !selected) return false;
      if (selected) directoryUri = mappedDirectoryUri(selected.root);
      if (testRoots.length === 0) {
        const projectRoot = state?.projectRoot;
        if (!projectRoot) { void vscode.window.showErrorMessage(t('createChangedProject')); return false; }
        const selectedPath = target ? relative(resolve(projectRoot), resolve(target.fsPath)) : '';
        const selectedTestDirectory = target && selectedPath.split(sep).some((part) => /^tests?$/i.test(part))
          && await vscode.workspace.fs.stat(target).then((stat) => Boolean(stat.type & vscode.FileType.Directory), () => false)
          ? target : undefined;
        const chosen = selectedTestDirectory ?? (options?.testChooseTestDirectory
          ? await options.testChooseTestDirectory()
          : (await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false,
            defaultUri: mappedDirectoryUri(projectRoot), openLabel: t('chooseTestDirectory') }))?.[0]);
        if (!chosen) return false;
        const path = relative(resolve(projectRoot), resolve(chosen.fsPath));
        if (chosen.scheme !== sourceDirectoryUri.scheme || (path !== '' && (path === '..' || path.startsWith(`..${sep}`)))) {
          void vscode.window.showErrorMessage(t('createOutsideProject'));
          return false;
        }
        const selectedDirectory = await vscode.workspace.fs.stat(chosen)
          .then((stat) => Boolean(stat.type & vscode.FileType.Directory), () => false);
        if (!selectedDirectory) { void vscode.window.showErrorMessage(t('createNotDirectory')); return false; }
        if (resolve((await versions.ensureForUri(chosen))?.projectRoot ?? '') !== resolve(projectRoot)) {
          void vscode.window.showErrorMessage(t('createOutsideProject'));
          return false;
        }
        directoryUri = chosen;
        unmappedTestDirectory = true;
      }
    }
  }
  const targetVersion = state?.resolution.target ?? '8.5';
  const versionConfiguration = vscode.workspace.getConfiguration('phpCompanion', directoryUri);
  const versionSetting = versionConfiguration.get<string>('phpVersion', 'auto');
  const executableSetting = versionConfiguration.get<string | null>('phpExecutablePath', null);
  const candidates = unmappedTestDirectory ? [] : mappingsForDirectory(directoryUri.fsPath, mappings);
  const closestRootLength = candidates[0]?.root.length;
  const namespaces = [...new Set(candidates.filter((candidate) => candidate.root.length === closestRootLength)
    .map((candidate) => namespaceForMapping(directoryUri.fsPath, candidate, targetVersion))
    .filter((value): value is string => value !== undefined))];
  let namespace = unmappedTestDirectory ? '' : namespaces[0];
  if (namespaces.length > 1) {
    namespace = options?.testChooseNamespace
      ? await options.testChooseNamespace(namespaces)
      : (await vscode.window.showQuickPick(namespaces.map((value) => ({ label: value || t('globalNamespace'), value })),
        { placeHolder: t('chooseTypeNamespace') }))?.value;
    if (namespace === undefined) return false;
    if (!namespaces.includes(namespace)) { void vscode.window.showErrorMessage(t('createChangedProject')); return false; }
  }
  if (namespace === undefined) {
    void vscode.window.showErrorMessage(t(mappingForDirectory(directoryUri.fsPath, mappings)
      ? 'createInvalidNamespace' : 'createOutsidePsr4'));
    return false;
  }
  const composerUri = state?.projectRoot ? mappedDirectoryUri(join(state.projectRoot, 'composer.json')) : undefined;
  const composerHash = composerUri ? await vscode.workspace.fs.readFile(composerUri)
    .then((bytes) => createHash('sha256').update(bytes).digest('hex'), () => undefined) : undefined;
  if (!composerUri || !composerHash) { void vscode.window.showErrorMessage(t('createChangedProject')); return false; }
  const loadedComposerHash = state?.composer?.inputEvidence?.reads.find((read) =>
    read.kind === 'source' && resolve(read.path) === resolve(composerUri.fsPath));
  if (loadedComposerHash?.kind !== 'source' || loadedComposerHash.hash !== composerHash) {
    void vscode.window.showWarningMessage(t('createChangedProject'));
    return false;
  }
  if (kind === 'enum' && state?.resolution.target && state.resolution.target < '8.1') {
    void vscode.window.showErrorMessage(t('enumPhpTarget', state.resolution.target));
    return false;
  }
  const kindName = { class: t('kindClass'), 'abstract class': t('kindAbstractClass'), interface: t('kindInterface'), trait: t('kindTrait'), enum: t('kindEnum'), test: t('kindTest') }[kind];
  const name = options?.testName ?? await vscode.window.showInputBox({ prompt: t('newTypeName', kindName),
    validateInput: (value) => validPhpTypeName(value, targetVersion) ? undefined : t('validTypeName') });
  if (!name || !validPhpTypeName(name, targetVersion)) return false;
  const uri = vscode.Uri.joinPath(directoryUri, `${name}.php`);
  const directoryState = async (): Promise<'missing' | 'directory' | 'other'> => vscode.workspace.fs.stat(directoryUri)
    .then((stat) => stat.type & vscode.FileType.Directory ? 'directory' : 'other', (error: unknown) => {
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') return 'missing';
      throw error;
    });
  const initialDirectoryState = await directoryState();
  if (initialDirectoryState === 'other') { void vscode.window.showErrorMessage(t('createNotDirectory')); return false; }
  const exists = async (): Promise<boolean> => {
    try { await vscode.workspace.fs.stat(uri); return true; }
    catch (error) {
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') return false;
      throw error;
    }
  };
  if (await exists()) { void vscode.window.showErrorMessage(t('fileExists', uri.fsPath)); return false; }
  const strictTypes = vscode.workspace.getConfiguration('phpCompanion', uri).get('generation.strictTypes', true);
  const source = renderPhpType(kind, name, namespace, strictTypes);
  const previewUri = vscode.Uri.from({ scheme: PREVIEW_SCHEME, path: uri.path, query: randomUUID() });
  previewSources.set(previewUri.toString(), source);
  let accepted = false;
  try {
    const preview = await vscode.workspace.openTextDocument(previewUri);
    await vscode.window.showTextDocument(preview, { preview: false });
    const create = t('create');
    const choice = options?.testPreviewAction ? await options.testPreviewAction()
      : await vscode.window.showInformationMessage(t('createTypeConfirm', `${namespace ? `${namespace}\\` : ''}${name}`,
        vscode.workspace.asRelativePath(uri, true)), create);
    const previewTab = vscode.window.tabGroups.all.flatMap((group) => group.tabs).find((tab) =>
      tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === previewUri.toString());
    const requested = choice === create || choice === 'apply';
    if (previewTab && !await (options?.testClosePreview
      ? options.testClosePreview(previewTab) : vscode.window.tabGroups.close(previewTab))) {
      if (requested) void vscode.window.showWarningMessage(t('createPreviewCloseFailed'));
      return false;
    }
    accepted = Boolean(previewTab && requested);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(t('createPreviewFailed', reason));
    return false;
  } finally {
    if (!vscode.window.tabGroups.all.flatMap((group) => group.tabs).some((tab) =>
      tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === previewUri.toString())) {
      previewSources.delete(previewUri.toString());
    }
  }
  if (!accepted) return false;
  const currentVersionConfiguration = vscode.workspace.getConfiguration('phpCompanion', directoryUri);
  if (currentVersionConfiguration.get<string>('phpVersion', 'auto') !== versionSetting
    || currentVersionConfiguration.get<string | null>('phpExecutablePath', null) !== executableSetting
    || (await versions.ensureForUri(directoryUri))?.resolution.target !== targetVersion) {
    void vscode.window.showWarningMessage(t('createChangedVersion'));
    return false;
  }
  const currentComposerHash = await vscode.workspace.fs.readFile(composerUri)
    .then((bytes) => createHash('sha256').update(bytes).digest('hex'), () => undefined);
  if (currentComposerHash !== composerHash) { void vscode.window.showWarningMessage(t('createChangedProject')); return false; }
  if (await directoryState() !== initialDirectoryState) {
    void vscode.window.showWarningMessage(t('createChangedDirectory'));
    return false;
  }
  if (await exists()) { void vscode.window.showErrorMessage(t('fileExists', uri.fsPath)); return false; }
  let created = false;
  let usedFileCreationFallback = false;
  if (uri.scheme === 'file') {
    const moveStagedFile = async (stagedPath: string, apply: (edit: vscode.WorkspaceEdit) => PromiseLike<boolean>): Promise<boolean> => {
      let moved = false;
      let staged = false;
      try {
        const stagedUri = vscode.Uri.file(stagedPath);
        await writeFile(stagedPath, source, { flag: 'wx', mode: 0o600 });
        staged = true;
        const edit = new vscode.WorkspaceEdit();
        edit.renameFile(stagedUri, uri, { overwrite: false });
        try { await apply(edit); } catch { /* Check whether the resource move still completed. */ }
        try {
          await stat(stagedPath);
          return false;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return false;
        }
        moved = await readFile(uri.fsPath).then((contents) => contents.equals(Buffer.from(source, 'utf8')), () => false);
        return moved;
      } catch { return false; }
      finally {
        // A successful move must retain its source path so VS Code can undo and redo the move.
        if (staged && !moved) await rm(stagedPath, { force: true }).catch(() => undefined);
      }
    };
    try {
      created = await moveStagedFile(join(await stageRoot(), `${randomUUID()}.php`),
        options?.testApplyStagedEdit ?? vscode.workspace.applyEdit);
    } catch { /* Try a stage on the destination's file system. */ }
    if (!created && !await exists()) {
      // A workspace sibling is normally on the destination's file system. Keep the
      // stage outside every workspace so Undo does not expose it as project source.
      const siblingStage = vscode.Uri.file(join(dirname(folder.uri.fsPath), `.sophp-type-stage-${randomUUID()}.php`));
      if (!vscode.workspace.getWorkspaceFolder(siblingStage)) {
        const applySiblingEdit = options?.testApplySiblingEdit;
        created = await moveStagedFile(siblingStage.fsPath, applySiblingEdit
          ? (edit): Promise<boolean> => applySiblingEdit(edit, siblingStage.fsPath) : vscode.workspace.applyEdit);
      }
    }
    if (!created && !await exists() && await directoryState() === 'directory') {
      // The destination directory may be writable even when its parent is not.
      // Keep this last stage out of PHP indexing with a hidden non-PHP suffix.
      const destinationStage = join(directoryUri.fsPath, `.sophp-type-stage-${randomUUID()}.tmp`);
      const applyDestinationEdit = options?.testApplyDestinationEdit;
      created = await moveStagedFile(destinationStage, applyDestinationEdit
        ? (edit): Promise<boolean> => applyDestinationEdit(edit, destinationStage) : vscode.workspace.applyEdit);
    }
  }
  if (!created) {
    if (await exists()) { void vscode.window.showErrorMessage(t('fileExists', uri.fsPath)); return false; }
    const contents = Buffer.from(source, 'utf8');
    const edit = new vscode.WorkspaceEdit();
    edit.createFile(uri, { overwrite: false, contents });
    let applyError: unknown;
    try { await (options?.testApplyCreateEdit ?? vscode.workspace.applyEdit)(edit); }
    catch (error) { applyError = error; }
    const complete = await vscode.workspace.fs.readFile(uri)
      .then((actual) => Buffer.from(actual).equals(contents), () => false);
    if (!complete) {
      const reason = applyError instanceof Error ? applyError.message : applyError === undefined ? '' : String(applyError);
      void vscode.window.showErrorMessage(reason ? `${t('createApplyFailed')} ${reason}` : t('createApplyFailed'));
      return false;
    }
    usedFileCreationFallback = uri.scheme === 'file';
  }
  try {
    if (options?.testOpenCreatedFile) await options.testOpenCreatedFile(uri);
    else await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), { preview: false });
  }
  catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    void vscode.window.showWarningMessage(t('createOpenFailed', reason));
  }
  if (usedFileCreationFallback) void vscode.window.showWarningMessage(t('createRedoMayNotRestore'));
  return true;
}

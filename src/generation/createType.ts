import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import { extname, relative, resolve, sep } from 'node:path';
import type { Psr4Mapping } from '../composer/project.js';
import type { VersionManager } from '../extension/versionManager.js';
import { t } from '../extension/localize.js';

export type PhpTypeKind = 'class' | 'abstract class' | 'interface' | 'trait' | 'enum' | 'test';

const TYPE_NAME = /^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/;
const PREVIEW_SCHEME = 'sophp-type-preview';
const previewSources = new Map<string, string>();

export function registerPhpTypePreviewProvider(): vscode.Disposable {
  const provider = vscode.workspace.registerTextDocumentContentProvider(PREVIEW_SCHEME, {
    provideTextDocumentContent: (uri) => previewSources.get(uri.toString()) ?? '',
  });
  const closed = vscode.workspace.onDidCloseTextDocument((document) => {
    if (document.uri.scheme === PREVIEW_SCHEME) previewSources.delete(document.uri.toString());
  });
  return vscode.Disposable.from(provider, closed);
}

function mappingForDirectory(directory: string, mappings: Psr4Mapping[]): { mapping: Psr4Mapping; root: string } | undefined {
  return mappings
    .flatMap((mapping) => mapping.directories.map((root) => ({ mapping, root: resolve(root) })))
    .filter(({ root }) => {
      const path = relative(root, resolve(directory));
      return path === '' || (path !== '..' && !path.startsWith(`..${sep}`));
    })
    .sort((left, right) => right.root.length - left.root.length)[0];
}

export function namespaceForDirectory(directory: string, mappings: Psr4Mapping[]): string | undefined {
  const candidate = mappingForDirectory(directory, mappings);
  if (!candidate) return undefined;
  const suffix = relative(candidate.root, resolve(directory)).split(sep).filter(Boolean).join('\\');
  return [candidate.mapping.prefix.replace(/^\\+|\\+$/g, ''), suffix].filter(Boolean).join('\\');
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

function directoryFromTarget(target?: vscode.Uri): vscode.Uri | undefined {
  if (!target) {
    const active = vscode.window.activeTextEditor?.document.uri;
    return active ? vscode.Uri.joinPath(active, '..') : undefined;
  }
  return extname(target.fsPath) ? vscode.Uri.joinPath(target, '..') : target;
}

export async function createPhpType(kind: PhpTypeKind, versions: VersionManager, target?: vscode.Uri,
  options?: { testName?: string; testPreviewAction?: () => Promise<'apply' | 'cancel'> }): Promise<void> {
  let directoryUri = directoryFromTarget(target);
  const folder = target ? vscode.workspace.getWorkspaceFolder(target) : vscode.workspace.workspaceFolders?.[0];
  if (!directoryUri && folder) directoryUri = folder.uri;
  if (!directoryUri || !folder) return void vscode.window.showErrorMessage(t('createNoWorkspace'));

  const state = await versions.ensureForUri(directoryUri);
  const mappings = state?.composer?.psr4 ?? [];
  let effectiveKind = kind;
  if (kind === 'test') {
    const dev = mappings.filter((mapping) => mapping.development);
    const targetMapping = mappingForDirectory(directoryUri.fsPath, dev);
    if (!targetMapping && dev[0]?.directories[0]) directoryUri = directoryUri.with({ path: dev[0].directories[0] });
  }
  const namespace = namespaceForDirectory(directoryUri.fsPath, mappings);
  if (namespace === undefined) {
    return void vscode.window.showErrorMessage(t('createOutsidePsr4'));
  }
  if (effectiveKind === 'enum' && state?.resolution.target && state.resolution.target < '8.1') {
    return void vscode.window.showErrorMessage(t('enumPhpTarget', state.resolution.target));
  }
  const kindName = { class: t('kindClass'), 'abstract class': t('kindAbstractClass'), interface: t('kindInterface'), trait: t('kindTrait'), enum: t('kindEnum'), test: t('kindTest') }[kind];
  const name = options?.testName ?? await vscode.window.showInputBox({ prompt: t('newTypeName', kindName), validateInput: (value) => TYPE_NAME.test(value) ? undefined : t('validTypeName') });
  if (!name || !TYPE_NAME.test(name)) return;
  if (kind === 'test' && !name.endsWith('Test')) effectiveKind = 'test';
  const uri = vscode.Uri.joinPath(directoryUri, `${name}.php`);
  const exists = async (): Promise<boolean> => {
    try { await vscode.workspace.fs.stat(uri); return true; }
    catch (error) {
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') return false;
      throw error;
    }
  };
  if (await exists()) return void vscode.window.showErrorMessage(t('fileExists', uri.fsPath));
  const strictTypes = vscode.workspace.getConfiguration('phpCompanion', uri).get('generation.strictTypes', true);
  const source = renderPhpType(effectiveKind, name, namespace, strictTypes);
  const previewUri = vscode.Uri.from({ scheme: PREVIEW_SCHEME, path: uri.path, query: randomUUID() });
  previewSources.set(previewUri.toString(), source);
  let accepted = false;
  try {
    const preview = await vscode.workspace.openTextDocument(previewUri);
    await vscode.window.showTextDocument(preview, { preview: false });
    const create = t('create');
    const choice = options?.testPreviewAction ? await options.testPreviewAction()
      : await vscode.window.showInformationMessage(t('createTypeConfirm', `${namespace ? `${namespace}\\` : ''}${name}`), create);
    const previewTab = vscode.window.tabGroups.all.flatMap((group) => group.tabs).find((tab) =>
      tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === previewUri.toString());
    accepted = Boolean(previewTab && (choice === create || choice === 'apply'));
    if (previewTab) await vscode.window.tabGroups.close(previewTab);
  } finally {
    previewSources.delete(previewUri.toString());
  }
  if (!accepted) return;
  if (await exists()) return void vscode.window.showErrorMessage(t('fileExists', uri.fsPath));
  await vscode.workspace.fs.createDirectory(directoryUri);
  const edit = new vscode.WorkspaceEdit();
  edit.createFile(uri, { overwrite: false, contents: Buffer.from(source, 'utf8') });
  if (!await vscode.workspace.applyEdit(edit)) return void vscode.window.showErrorMessage(t('createApplyFailed'));
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), { preview: false });
}

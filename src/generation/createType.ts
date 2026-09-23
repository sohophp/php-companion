import * as vscode from 'vscode';
import { extname, relative, resolve, sep } from 'node:path';
import type { Psr4Mapping } from '../composer/project.js';
import type { VersionManager } from '../extension/versionManager.js';
import { t } from '../extension/localize.js';

export type PhpTypeKind = 'class' | 'abstract class' | 'interface' | 'trait' | 'enum' | 'test';

const TYPE_NAME = /^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/;

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

export async function createPhpType(kind: PhpTypeKind, versions: VersionManager, target?: vscode.Uri): Promise<void> {
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
  const name = await vscode.window.showInputBox({ prompt: t('newTypeName', kindName), validateInput: (value) => TYPE_NAME.test(value) ? undefined : t('validTypeName') });
  if (!name) return;
  if (kind === 'test' && !name.endsWith('Test')) effectiveKind = 'test';
  const uri = vscode.Uri.joinPath(directoryUri, `${name}.php`);
  try {
    await vscode.workspace.fs.stat(uri);
    return void vscode.window.showErrorMessage(t('fileExists', uri.fsPath));
  } catch {
    // Expected for a new file.
  }
  const strictTypes = vscode.workspace.getConfiguration('phpCompanion', uri).get('generation.strictTypes', true);
  const source = renderPhpType(effectiveKind, name, namespace, strictTypes);
  const create = t('create');
  const choice = await vscode.window.showInformationMessage(t('createTypeConfirm', `${namespace ? `${namespace}\\` : ''}${name}`), { modal: true }, create);
  if (choice !== create) return;
  await vscode.workspace.fs.createDirectory(directoryUri);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source, 'utf8'));
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
}

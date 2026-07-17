import { basename, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import * as vscode from 'vscode';
import type { IndexedDeclaration, IndexedReference } from '../index/types.js';
import type { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';
import { t } from '../extension/localize.js';
import { isSyntaxAvailable } from '../php-version/constraints.js';
import type { PhpVersion } from '../php-version/types.js';
import { resolvePsr4Class, type Psr4Mapping } from '../composer/project.js';

export class RenameError extends Error {}

const RESERVED_NAMES = new Set([
  'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class', 'clone', 'const', 'continue',
  'declare', 'default', 'die', 'do', 'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach',
  'endif', 'endswitch', 'endwhile', 'enum', 'eval', 'exit', 'extends', 'final', 'finally', 'fn', 'for', 'foreach',
  'function', 'global', 'goto', 'if', 'implements', 'include', 'include_once', 'instanceof', 'insteadof', 'interface',
  'isset', 'list', 'match', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public', 'readonly', 'require',
  'require_once', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var', 'while', 'xor', 'yield',
  'bool', 'false', 'float', 'int', 'iterable', 'mixed', 'never', 'null', 'object', 'parent', 'resource', 'self', 'string', 'true', 'void',
]);

function uriRange(start: number, end: number, source: string): vscode.Range {
  const prefix = source.slice(0, start);
  const startLines = prefix.split('\n');
  const value = source.slice(start, end);
  const endLines = value.split('\n');
  const startPosition = new vscode.Position(startLines.length - 1, startLines.at(-1)!.length);
  const endPosition = endLines.length === 1
    ? new vscode.Position(startPosition.line, startPosition.character + value.length)
    : new vscode.Position(startPosition.line + endLines.length - 1, endLines.at(-1)!.length);
  return new vscode.Range(startPosition, endPosition);
}

function referenceReplacement(reference: IndexedReference, oldName: string, newName: string): string | undefined {
  if (reference.text === oldName) return newName;
  const pattern = new RegExp(`(^|\\\\)${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'iu');
  return pattern.test(reference.text) ? reference.text.replace(pattern, `$1${newName}`) : undefined;
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function validateName(name: string): void {
  if (!/^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(name) || RESERVED_NAMES.has(name.toLowerCase())) {
    throw new RenameError(t('invalidName'));
  }
}

export interface BuildRenameOptions {
  fileMode: 'off' | 'preview' | 'always';
  includePhpDoc: boolean;
  psr4Mappings: Psr4Mapping[];
}

function canonicalDeclarations(declarations: IndexedDeclaration[], fqcn: string, mappings: Psr4Mapping[], preferredUri?: string): IndexedDeclaration[] {
  const expected = new Set(resolvePsr4Class(fqcn, mappings).map((path) => resolve(path)));
  const canonical = declarations.filter((item) => expected.has(resolve(vscode.Uri.parse(item.uri).fsPath)));
  const candidates = canonical.length ? canonical : declarations;
  const byPath = new Map<string, IndexedDeclaration>();
  for (const item of candidates.sort((left, right) => left.uri === preferredUri ? 1 : right.uri === preferredUri ? -1 : 0)) {
    byPath.set(resolve(vscode.Uri.parse(item.uri).fsPath), item);
  }
  return [...byPath.values()];
}

export async function buildRenameEdit(
  index: WorkspaceSymbolIndex,
  declaration: IndexedDeclaration,
  newName: string,
  options: BuildRenameOptions,
): Promise<vscode.WorkspaceEdit> {
  validateName(newName);
  const declarations = canonicalDeclarations(index.findDeclarations(declaration.fqcn), declaration.fqcn, options.psr4Mappings, declaration.uri);
  if (declarations.length !== 1) {
    const paths = declarations.map((item) => vscode.Uri.parse(item.uri).fsPath).join(', ');
    throw new RenameError(`${t('duplicate', declaration.fqcn)}${paths ? `: ${paths}` : ''}`);
  }
  const canonical = declarations[0]!;
  if (canonical.uri !== declaration.uri) throw new RenameError(`The selected declaration is not the Composer PSR-4 declaration for ${declaration.fqcn}.`);
  const oldName = canonical.name;
  if (oldName === newName) return new vscode.WorkspaceEdit();

  const relatedUris = new Set([canonical.uri, ...index.findReferences(canonical.fqcn).map((item) => item.uri)]);
  for (const uri of relatedUris) {
    const file = index.getFile(uri);
    if (file?.errors.length) throw new RenameError(t('syntaxError', vscode.Uri.parse(uri).fsPath));
  }

  const declarationUri = vscode.Uri.parse(canonical.uri);
  let targetUri: vscode.Uri | undefined;
  if (options.fileMode !== 'off' && basename(declarationUri.fsPath) === `${oldName}.php`) {
    targetUri = vscode.Uri.joinPath(declarationUri, '..', `${newName}.php`);
    const caseOnlyTarget = targetUri.toString().toLowerCase() === declarationUri.toString().toLowerCase();
    if (!caseOnlyTarget && await exists(targetUri)) throw new RenameError(t('conflict', targetUri.fsPath));
  }

  const edit = new vscode.WorkspaceEdit();
  if (targetUri) {
    // Refactor Preview preserves WorkspaceEdit construction order while direct
    // workspace.applyEdit may normalize resource operations. Create the target
    // URI before adding text edits that address it so both paths are valid.
    edit.renameFile(declarationUri, targetUri, { overwrite: false }, {
      label: `Rename ${oldName}.php to ${newName}.php`,
      needsConfirmation: false,
    });
  }
  for (const file of index.getFiles()) {
    const sourceUri = vscode.Uri.parse(file.uri);
    // VS Code applies resource operations before text edits even when renameFile is appended last.
    // Text edits for the declaration file must therefore address its post-rename URI.
    const uri = targetUri && file.uri === canonical.uri ? targetUri : sourceUri;
    for (const item of file.declarations.filter((candidate) => candidate.uri === canonical.uri && candidate.start === canonical.start)) {
      edit.replace(uri, uriRange(item.start, item.end, file.source), newName);
    }
    for (const item of file.imports.filter((candidate) => candidate.fqcn.toLowerCase() === canonical.fqcn.toLowerCase())) {
      edit.replace(uri, uriRange(item.start, item.end, file.source), newName);
    }
    for (const reference of file.references.filter((candidate) => candidate.fqcn.toLowerCase() === canonical.fqcn.toLowerCase())) {
      if (reference.context === 'phpdoc' && !options.includePhpDoc) continue;
      const replacement = referenceReplacement(reference, oldName, newName);
      if (replacement) edit.replace(uri, uriRange(reference.start, reference.end, file.source), replacement);
    }
  }

  return edit;
}

export interface PhpRenameProviderOptions {
  index: WorkspaceSymbolIndex;
  versionForUri?: (uri: vscode.Uri) => PhpVersion | undefined;
  ensureProjectIndex: (uri: vscode.Uri, token: vscode.CancellationToken) => Promise<boolean>;
  mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[];
  log?: (message: string) => void;
}

function configuredFileMode(configuration: vscode.WorkspaceConfiguration): 'off' | 'preview' | 'always' {
  const current = configuration.inspect<'off' | 'preview' | 'always'>('rename.file');
  const explicitlyConfigured = current?.workspaceFolderValue ?? current?.workspaceValue ?? current?.globalValue;
  if (explicitlyConfigured) return explicitlyConfigured;
  const legacy = configuration.inspect<'whenMatched' | 'never'>('rename.syncFileName');
  const legacyValue = legacy?.workspaceFolderValue ?? legacy?.workspaceValue ?? legacy?.globalValue;
  return legacyValue === 'never' ? 'off' : 'preview';
}

export class PhpRenameProvider implements vscode.RenameProvider {
  constructor(private readonly options: PhpRenameProviderOptions) {}

  prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Range | { range: vscode.Range; placeholder: string } {
    if (token.isCancellationRequested) throw new RenameError('Rename was cancelled.');
    const file = this.options.index.getFile(document.uri.toString());
    if (file?.errors.length) throw new RenameError('Cannot rename a type declared in a file with syntax errors.');
    const symbol = this.options.index.findSymbolAt(document.uri.toString(), document.offsetAt(position));
    if (!symbol || !('name' in symbol)) throw new RenameError('PHP Companion 0.3 supports Rename only from a type declaration name.');
    const declarations = canonicalDeclarations(this.options.index.findDeclarations(symbol.fqcn), symbol.fqcn, this.options.mappingsForUri(document.uri), symbol.uri);
    if (declarations.length !== 1) throw new RenameError(t('duplicate', symbol.fqcn));
    if (declarations[0]?.uri !== symbol.uri) throw new RenameError(`The selected declaration is not the Composer PSR-4 declaration for ${symbol.fqcn}.`);
    const target = this.options.versionForUri?.(document.uri);
    if (symbol.kind === 'enum' && target && !isSyntaxAvailable(target, '8.1')) {
      throw new RenameError(`Enums require PHP 8.1 or later (target: PHP ${target}).`);
    }
    return { range: new vscode.Range(document.positionAt(symbol.start), document.positionAt(symbol.end)), placeholder: symbol.name };
  }

  async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): Promise<vscode.WorkspaceEdit> {
    const started = performance.now();
    const initialVersion = document.version;
    const openVersions = new Map(vscode.workspace.textDocuments.map((item) => [item.uri.toString(), item.version]));
    const before = this.options.index.findSymbolAt(document.uri.toString(), document.offsetAt(position));
    if (!before || !('name' in before)) throw new RenameError('PHP Companion 0.3 supports Rename only from a type declaration name.');
    const fqcn = before.fqcn;
    if (!await this.options.ensureProjectIndex(document.uri, token) || token.isCancellationRequested) throw new RenameError('Rename was cancelled before any changes were made.');
    if (document.version !== initialVersion || vscode.workspace.textDocuments.some((item) => openVersions.has(item.uri.toString()) && openVersions.get(item.uri.toString()) !== item.version)) {
      throw new RenameError('A PHP document changed while references were being indexed. Run Rename again.');
    }
    const declaration = this.options.index.findDeclarations(fqcn).find((item) => item.uri === before.uri && item.start === before.start);
    if (!declaration) throw new RenameError(`Declaration not found for ${fqcn}.`);
    const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
    const edit = await buildRenameEdit(this.options.index, declaration, newName, {
      fileMode: configuredFileMode(configuration),
      includePhpDoc: configuration.get<boolean>('rename.phpDoc', true),
      psr4Mappings: this.options.mappingsForUri(document.uri),
    });
    this.options.log?.(`Rename ${fqcn}: ${this.options.index.getFiles().length} indexed files, ${edit.entries().length} affected files, ${(performance.now() - started).toFixed(0)} ms.`);
    return edit;
  }
}

import { basename, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import * as vscode from 'vscode';
import type { IndexedDeclaration, IndexedReference } from '../index/types.js';
import type { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';
import { t } from '../extension/localize.js';
import { isSyntaxAvailable } from '../php-version/constraints.js';
import type { PhpVersion } from '../php-version/types.js';
import { resolvePsr4Class, type Psr4Mapping } from '../composer/project.js';
import { createEditPlan, isValidPhpIdentifier, type PlannedTextEdit } from '@php-companion/refactor';

export class RenameError extends Error {}

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
  if (!isValidPhpIdentifier(name)) {
    throw new RenameError(t('invalidName'));
  }
}

export interface BuildRenameOptions {
  fileMode: 'off' | 'preview' | 'always';
  includePhpDoc: boolean;
  psr4Mappings: Psr4Mapping[];
  stageFileRename?: (oldUri: vscode.Uri, newUri: vscode.Uri, edit: vscode.WorkspaceEdit) => void;
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

  const plannedEdits: Array<Omit<PlannedTextEdit, 'expectedVersion' | 'expectedLength' | 'expectedTextHash'>> = [];
  const snapshots: Array<{ uri: string; version: null; length: number }> = [];
  const sourceByUri = new Map<string, string>();
  for (const file of index.getFiles()) {
    const sourceUri = vscode.Uri.parse(file.uri);
    // WorkspaceEdit applies text edits before resource operations. Keep edits
    // for the declaration on its existing URI so they land before the file is
    // renamed to its PSR-4 target.
    const uri = sourceUri;
    snapshots.push({ uri: uri.toString(), version: null, length: file.source.length }); sourceByUri.set(uri.toString(), file.source);
    for (const item of file.declarations.filter((candidate) => candidate.uri === canonical.uri && candidate.start === canonical.start)) {
      plannedEdits.push({ uri: uri.toString(), start: item.start, end: item.end, newText: newName });
    }
    for (const item of file.imports.filter((candidate) => candidate.fqcn.toLowerCase() === canonical.fqcn.toLowerCase())) {
      plannedEdits.push({ uri: uri.toString(), start: item.start, end: item.end, newText: newName });
    }
    for (const reference of file.references.filter((candidate) => candidate.fqcn.toLowerCase() === canonical.fqcn.toLowerCase())) {
      if (reference.context === 'phpdoc' && !options.includePhpDoc) continue;
      const replacement = referenceReplacement(reference, oldName, newName);
      if (replacement) plannedEdits.push({ uri: uri.toString(), start: reference.start, end: reference.end, newText: replacement });
    }
  }
  const plan = createEditPlan(`Rename ${canonical.fqcn} to ${newName}`, snapshots, plannedEdits, targetUri ? [{ kind: 'rename', oldUri: declarationUri.toString(), newUri: targetUri.toString() }] : []);
  const edit = new vscode.WorkspaceEdit();
  const staged = new vscode.WorkspaceEdit();
  for (const planned of plan.textEdits) {
    const source = sourceByUri.get(planned.uri); if (source === undefined) throw new RenameError(`Missing source snapshot for ${planned.uri}.`);
    const target = targetUri && planned.uri === declarationUri.toString() && options.stageFileRename ? staged : edit;
    target.replace(vscode.Uri.parse(planned.uri), uriRange(planned.start, planned.end, source), planned.newText);
  }
  if (targetUri && staged.entries().length) options.stageFileRename?.(declarationUri, targetUri, staged);
  for (const operation of plan.fileOperations) if (operation.kind === 'rename') edit.renameFile(vscode.Uri.parse(operation.oldUri), vscode.Uri.parse(operation.newUri), { overwrite: operation.overwrite ?? false }, {
    label: `Rename ${oldName}.php to ${newName}.php`, needsConfirmation: false,
  });
  return edit;
}

export interface PhpRenameProviderOptions {
  index: WorkspaceSymbolIndex;
  versionForUri?: (uri: vscode.Uri) => PhpVersion | undefined;
  ensureProjectIndex: (uri: vscode.Uri, token: vscode.CancellationToken) => Promise<boolean>;
  mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[];
  log?: (message: string) => void;
  unsupportedReturnsUndefined?: boolean;
  stageFileRename?: (oldUri: vscode.Uri, newUri: vscode.Uri, edit: vscode.WorkspaceEdit) => void;
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

  async prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Range | { range: vscode.Range; placeholder: string } | undefined> {
    if (token.isCancellationRequested) throw new RenameError('Rename was cancelled.');
    const file = this.options.index.getFile(document.uri.toString());
    if (file?.errors.length) throw new RenameError('Cannot rename a type declared in a file with syntax errors.');
    const offset = document.offsetAt(position); const initialVersion = document.version;
    let symbol = this.options.index.findSymbolAt(document.uri.toString(), offset);
    if (!symbol) {
      if (this.options.unsupportedReturnsUndefined) return undefined;
      throw new RenameError('PHP Companion cannot resolve a type at this location.');
    }
    if (!('name' in symbol)) {
      if (!await this.options.ensureProjectIndex(document.uri, token) || token.isCancellationRequested) throw new RenameError('Rename was cancelled before any changes were made.');
      if (document.version !== initialVersion) throw new RenameError('The PHP document changed while references were being indexed. Run Rename again.');
      symbol = this.options.index.findSymbolAt(document.uri.toString(), offset);
      if (!symbol) return undefined;
    }
    const declarations = canonicalDeclarations(this.options.index.findDeclarations(symbol.fqcn), symbol.fqcn, this.options.mappingsForUri(document.uri), symbol.uri);
    if (declarations.length !== 1) throw new RenameError(t('duplicate', symbol.fqcn));
    const declaration = declarations[0]!;
    if ('name' in symbol && declaration.uri !== symbol.uri) throw new RenameError(`The selected declaration is not the Composer PSR-4 declaration for ${symbol.fqcn}.`);
    const selectedText = 'name' in symbol ? symbol.name : symbol.text;
    const selectedNameStart = symbol.end - declaration.name.length;
    if (selectedNameStart < symbol.start || selectedText.slice(selectedText.length - declaration.name.length) !== declaration.name) {
      if (this.options.unsupportedReturnsUndefined) return undefined;
      throw new RenameError('Rename cannot start from an explicit type alias whose spelling will remain unchanged.');
    }
    const target = this.options.versionForUri?.(document.uri);
    if (declaration.kind === 'enum' && target && !isSyntaxAvailable(target, '8.1')) {
      throw new RenameError(`Enums require PHP 8.1 or later (target: PHP ${target}).`);
    }
    return { range: new vscode.Range(document.positionAt(selectedNameStart), document.positionAt(symbol.end)), placeholder: declaration.name };
  }

  async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): Promise<vscode.WorkspaceEdit | undefined> {
    const started = performance.now();
    const initialVersion = document.version;
    const openVersions = new Map(vscode.workspace.textDocuments.map((item) => [item.uri.toString(), item.version]));
    const before = this.options.index.findSymbolAt(document.uri.toString(), document.offsetAt(position));
    if (!before) {
      if (this.options.unsupportedReturnsUndefined) return undefined;
      throw new RenameError('PHP Companion cannot resolve a type at this location.');
    }
    const fqcn = before.fqcn;
    if (!await this.options.ensureProjectIndex(document.uri, token) || token.isCancellationRequested) throw new RenameError('Rename was cancelled before any changes were made.');
    if (document.version !== initialVersion || vscode.workspace.textDocuments.some((item) => openVersions.has(item.uri.toString()) && openVersions.get(item.uri.toString()) !== item.version)) {
      throw new RenameError('A PHP document changed while references were being indexed. Run Rename again.');
    }
    const declarations = canonicalDeclarations(this.options.index.findDeclarations(fqcn), fqcn, this.options.mappingsForUri(document.uri), 'name' in before ? before.uri : undefined);
    if (declarations.length !== 1) throw new RenameError(t('duplicate', fqcn));
    const declaration = declarations[0]!;
    if ('name' in before && (declaration.uri !== before.uri || declaration.start !== before.start)) {
      throw new RenameError(`The selected declaration is not the Composer PSR-4 declaration for ${fqcn}.`);
    }
    const selectedText = 'name' in before ? before.name : before.text;
    if (selectedText.slice(selectedText.length - declaration.name.length) !== declaration.name) {
      if (this.options.unsupportedReturnsUndefined) return undefined;
      throw new RenameError('Rename cannot start from an explicit type alias whose spelling will remain unchanged.');
    }
    const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
    const edit = await buildRenameEdit(this.options.index, declaration, newName, {
      fileMode: configuredFileMode(configuration),
      includePhpDoc: configuration.get<boolean>('rename.phpDoc', true),
      psr4Mappings: this.options.mappingsForUri(document.uri),
      stageFileRename: this.options.stageFileRename,
    });
    this.options.log?.(`Rename ${fqcn}: ${this.options.index.getFiles().length} indexed files, ${edit.entries().length} affected files, ${(performance.now() - started).toFixed(0)} ms.`);
    return edit;
  }
}

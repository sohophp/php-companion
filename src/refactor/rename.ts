import { basename } from 'node:path';
import * as vscode from 'vscode';
import type { IndexedDeclaration, IndexedReference } from '../index/types.js';
import type { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';
import { t } from '../extension/localize.js';
import { isSyntaxAvailable } from '../php-version/constraints.js';
import type { PhpVersion } from '../php-version/types.js';

export class RenameError extends Error {}

function uriRange(uri: vscode.Uri, start: number, end: number, source: string): vscode.Range {
  const prefix = source.slice(0, start);
  const startLines = prefix.split('\n');
  const value = source.slice(start, end);
  const endLines = value.split('\n');
  const startPosition = new vscode.Position(startLines.length - 1, startLines.at(-1)!.length);
  const endPosition = endLines.length === 1
    ? new vscode.Position(startPosition.line, startPosition.character + value.length)
    : new vscode.Position(startPosition.line + endLines.length - 1, endLines.at(-1)!.length);
  void uri;
  return new vscode.Range(startPosition, endPosition);
}

function referenceReplacement(reference: IndexedReference, oldName: string, newName: string): string | undefined {
  if (reference.text === oldName) return newName;
  const pattern = new RegExp(`(^|\\\\)${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (pattern.test(reference.text)) return reference.text.replace(pattern, `$1${newName}`);
  return undefined;
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

export interface BuildRenameOptions {
  syncFileName: boolean;
  includeTextMatches: 'confirm' | 'never' | 'always';
}

export async function buildRenameEdit(
  index: WorkspaceSymbolIndex,
  symbol: IndexedDeclaration | IndexedReference,
  newName: string,
  options: BuildRenameOptions,
): Promise<vscode.WorkspaceEdit> {
  if (!/^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(newName)) throw new RenameError(t('invalidName'));
  const fqcn = symbol.fqcn;
  const declarations = index.findDeclarations(fqcn);
  if (declarations.length !== 1) throw new RenameError(t('duplicate', fqcn));
  const declaration = declarations[0]!;
  const oldName = declaration.name;
  if (oldName === newName) return new vscode.WorkspaceEdit();

  const relatedUris = new Set([declaration.uri, ...index.findReferences(fqcn).map((item) => item.uri)]);
  for (const uri of relatedUris) {
    const file = index.getFile(uri);
    if (file?.errors.length) throw new RenameError(t('syntaxError', vscode.Uri.parse(uri).fsPath));
  }

  const declarationUri = vscode.Uri.parse(declaration.uri);
  let targetUri: vscode.Uri | undefined;
  if (options.syncFileName && basename(declarationUri.fsPath) === `${oldName}.php`) {
    targetUri = vscode.Uri.joinPath(declarationUri, '..', `${newName}.php`);
    if (await exists(targetUri)) throw new RenameError(t('conflict', targetUri.fsPath));
  }

  const edit = new vscode.WorkspaceEdit();
  for (const file of index.getFiles()) {
    const sourceUri = vscode.Uri.parse(file.uri);
    const uri = targetUri && file.uri === declaration.uri ? targetUri : sourceUri;
    for (const item of file.declarations.filter((candidate) => candidate.fqcn.toLowerCase() === fqcn.toLowerCase())) {
      edit.replace(uri, uriRange(uri, item.start, item.end, file.source), newName);
    }
    for (const item of file.imports.filter((candidate) => candidate.fqcn.toLowerCase() === fqcn.toLowerCase())) {
      edit.replace(uri, uriRange(uri, item.start, item.end, file.source), newName);
    }
    for (const reference of file.references.filter((candidate) => candidate.fqcn.toLowerCase() === fqcn.toLowerCase())) {
      const replacement = referenceReplacement(reference, oldName, newName);
      if (replacement) edit.replace(uri, uriRange(uri, reference.start, reference.end, file.source), replacement);
    }
    if (options.includeTextMatches !== 'never') {
      const word = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      for (const textRange of file.textRanges) {
        const text = file.source.slice(textRange.start, textRange.end);
        for (const match of text.matchAll(word)) {
          const start = textRange.start + match.index;
          edit.replace(uri, uriRange(uri, start, start + oldName.length, file.source), newName, {
            label: 'Changes in PHP comments and strings',
            needsConfirmation: options.includeTextMatches === 'confirm',
          });
        }
      }
    }
  }

  if (targetUri) {
    edit.renameFile(declarationUri, targetUri, { overwrite: false }, {
      label: `Rename ${oldName}.php to ${newName}.php`,
      needsConfirmation: false,
    });
  }

  if (options.includeTextMatches !== 'never') {
    const candidates = await vscode.workspace.findFiles('**/*.{json,yaml,yml,xml,neon,md}', '**/{vendor,.git,node_modules}/**');
    const word = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    for (const uri of candidates) {
      const source = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
      for (const match of source.matchAll(word)) {
        edit.replace(uri, uriRange(uri, match.index, match.index + oldName.length, source), newName, {
          label: 'Changes in strings and configuration files',
          needsConfirmation: options.includeTextMatches === 'confirm',
        });
      }
    }
  }
  return edit;
}

export class PhpRenameProvider implements vscode.RenameProvider {
  constructor(
    private readonly index: WorkspaceSymbolIndex,
    private readonly versionForUri?: (uri: vscode.Uri) => PhpVersion | undefined,
    private readonly ensureFullIndex?: () => Promise<void>,
  ) {}

  prepareRename(document: vscode.TextDocument, position: vscode.Position): vscode.Range | { range: vscode.Range; placeholder: string } | undefined {
    const symbol = this.index.findSymbolAt(document.uri.toString(), document.offsetAt(position));
    if (!symbol) return undefined;
    const declaration = this.index.findDeclarations(symbol.fqcn)[0];
    const target = this.versionForUri?.(document.uri);
    if (declaration?.kind === 'enum' && target && !isSyntaxAvailable(target, '8.1')) {
      throw new RenameError(`Enums require PHP 8.1 or later (target: PHP ${target}).`);
    }
    return { range: new vscode.Range(document.positionAt(symbol.start), document.positionAt(symbol.end)), placeholder: 'name' in symbol ? symbol.name : symbol.text };
  }

  async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): Promise<vscode.WorkspaceEdit | undefined> {
    await this.ensureFullIndex?.();
    const symbol = this.index.findSymbolAt(document.uri.toString(), document.offsetAt(position));
    if (!symbol) return undefined;
    const configuration = vscode.workspace.getConfiguration('phpCompanion', document.uri);
    return buildRenameEdit(this.index, symbol, newName, {
      syncFileName: configuration.get('rename.syncFileName', 'whenMatched') === 'whenMatched',
      includeTextMatches: configuration.get('rename.includeTextMatches', 'confirm'),
    });
  }
}

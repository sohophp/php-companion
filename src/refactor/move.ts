import { resolve } from 'node:path';
import * as vscode from 'vscode';
import { createEditPlan, type EditPlan, type PlannedTextEdit } from '@php-companion/refactor';
import { resolvePsr4Class, resolvePsr4Namespace, type Psr4Mapping } from '../composer/project.js';
import type { IndexedDeclaration, IndexedFile } from '../index/types.js';
import type { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';

export class MoveError extends Error {}

function range(source: string, start: number, end: number): vscode.Range {
  const position = (offset: number): vscode.Position => {
    const lines = source.slice(0, offset).split('\n');
    return new vscode.Position(lines.length - 1, lines.at(-1)!.length);
  };
  return new vscode.Range(position(start), position(end));
}

function namespaceRange(source: string): { start: number; end: number } | undefined {
  const match = /\bnamespace\s+([^;{]+)\s*[;{]/m.exec(source);
  if (!match || match.index === undefined || !match[1]) return undefined;
  const start = match.index + match[0].indexOf(match[1]);
  return { start, end: start + match[1].trimEnd().length };
}

function canonicalDeclaration(declaration: IndexedDeclaration, mappings: Psr4Mapping[]): boolean {
  return resolvePsr4Class(declaration.fqcn, mappings)
    .some((path) => resolve(path) === resolve(vscode.Uri.parse(declaration.uri).fsPath));
}

function isDirty(uri: string): boolean {
  return vscode.workspace.textDocuments.some((document) => document.uri.toString() === uri && document.isDirty);
}

function addReferenceEdits(
  edits: Array<Omit<PlannedTextEdit, 'expectedVersion' | 'expectedLength' | 'expectedTextHash'>>,
  file: IndexedFile,
  oldFqcn: string,
  newFqcn: string,
  movedUri: string,
  renamedUris: ReadonlyMap<string, vscode.Uri>,
  updateImports = true,
): void {
  const uri = renamedUris.get(file.uri) ?? vscode.Uri.parse(file.uri);
  const importsOldClass = file.imports.some((item) => item.kind === 'class' && item.fqcn.toLowerCase() === oldFqcn.toLowerCase());
  if (updateImports) {
    for (const item of file.imports.filter((candidate) => candidate.kind === 'class' && candidate.fqcn.toLowerCase() === oldFqcn.toLowerCase())) {
      edits.push({ uri: uri.toString(), start: item.pathStart, end: item.pathEnd, newText: newFqcn });
    }
  }
  for (const reference of file.references.filter((candidate) => candidate.fqcn.toLowerCase() === oldFqcn.toLowerCase())) {
    if (importsOldClass) continue;
    if (reference.text.includes('\\')) {
      const leadingSlash = reference.text.startsWith('\\') ? '\\' : '';
      edits.push({ uri: uri.toString(), start: reference.start, end: reference.end, newText: `${leadingSlash}${newFqcn}` });
    } else if (file.uri !== movedUri && file.namespace.toLowerCase() === oldFqcn.slice(0, oldFqcn.lastIndexOf('\\')).toLowerCase()) {
      edits.push({ uri: uri.toString(), start: reference.start, end: reference.end, newText: `\\${newFqcn}` });
    }
  }
}

interface PlannedMove {
  indexed: IndexedFile;
  newNamespace: string;
  namespaceRange: { start: number; end: number };
  declarations: Array<{ declaration: IndexedDeclaration; newFqcn: string }>;
}

export interface MoveReconciliation {
  newUri: vscode.Uri;
  newNamespace: string;
  declarations: Array<{ oldFqcn: string; newFqcn: string }>;
}

export function describeMoveReconciliation(
  index: WorkspaceSymbolIndex,
  files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[],
  mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[],
): MoveReconciliation[] {
  return files.map((moved) => {
    const indexed = index.getFile(moved.oldUri.toString());
    if (!indexed) throw new MoveError(`Safe Move requires a complete index for ${moved.oldUri.fsPath}.`);
    const newNamespace = resolvePsr4Namespace(moved.newUri.fsPath, mappingsForUri(moved.newUri));
    if (newNamespace === undefined) throw new MoveError(`Cannot move ${moved.newUri.fsPath}: destination is outside Composer PSR-4 mappings.`);
    return {
      newUri: moved.newUri,
      newNamespace,
      declarations: indexed.declarations.map((declaration) => ({
        oldFqcn: declaration.fqcn,
        newFqcn: `${newNamespace}\\${declaration.name}`,
      })),
    };
  });
}

function removableImportRange(file: IndexedFile, statementStart: number, statementEnd: number): { start: number; end: number } | undefined {
  if (file.imports.filter((item) => item.statementStart === statementStart).length !== 1) return undefined;
  let end = statementEnd;
  while (end < file.source.length && (file.source[end] === ' ' || file.source[end] === '\t')) end += 1;
  if (file.source[end] === '\r') end += 1;
  if (file.source[end] === '\n') end += 1;
  return { start: statementStart, end };
}

function workspaceEditFromPlan(plan: EditPlan, sources: ReadonlyMap<string, string>): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  for (const planned of plan.textEdits) {
    const source = sources.get(planned.uri);
    if (source === undefined) throw new MoveError(`Missing source snapshot for ${planned.uri}.`);
    edit.replace(vscode.Uri.parse(planned.uri), range(source, planned.start, planned.end), planned.newText);
  }
  return edit;
}

/** Reconciles against post-move source, after all other file-operation participants. */
export function buildMoveReconciliationEdits(
  index: WorkspaceSymbolIndex,
  moves: readonly MoveReconciliation[],
): vscode.WorkspaceEdit {
  const plannedEdits: Array<Omit<PlannedTextEdit, 'expectedVersion' | 'expectedLength' | 'expectedTextHash'>> = [];
  const sources = new Map(index.getFiles().map((file) => [file.uri, file.source]));
  for (const move of moves) {
    const file = index.getFile(move.newUri.toString());
    if (!file || file.errors.length) throw new MoveError(`Cannot reconcile ${move.newUri.fsPath}: the moved file is missing or has syntax errors.`);
    if (file.namespace !== move.newNamespace) {
      const currentNamespace = namespaceRange(file.source);
      if (!currentNamespace) throw new MoveError(`Cannot reconcile ${move.newUri.fsPath}: global-namespace files are not supported yet.`);
      plannedEdits.push({ uri: move.newUri.toString(), start: currentNamespace.start, end: currentNamespace.end, newText: move.newNamespace });
    }
  }

  for (const move of moves) {
    for (const replacement of move.declarations) {
      for (const file of index.getFiles()) {
        const uri = vscode.Uri.parse(file.uri);
        const matching = file.imports.filter((item) => item.kind === 'class'
          && (item.fqcn.toLowerCase() === replacement.oldFqcn.toLowerCase()
            || item.fqcn.toLowerCase() === replacement.newFqcn.toLowerCase()));
        const alreadyNew = matching.filter((item) => item.fqcn.toLowerCase() === replacement.newFqcn.toLowerCase());
        let keptNew = alreadyNew[0];
        for (const item of matching) {
          if (item === keptNew) continue;
          if (!keptNew && item.fqcn.toLowerCase() === replacement.oldFqcn.toLowerCase()) {
            plannedEdits.push({ uri: uri.toString(), start: item.pathStart, end: item.pathEnd, newText: replacement.newFqcn });
            keptNew = item;
            continue;
          }
          const removal = removableImportRange(file, item.statementStart, item.statementEnd);
          if (removal) plannedEdits.push({ uri: uri.toString(), start: removal.start, end: removal.end, newText: '' });
          else if (item.fqcn.toLowerCase() === replacement.oldFqcn.toLowerCase()) {
            plannedEdits.push({ uri: uri.toString(), start: item.pathStart, end: item.pathEnd, newText: replacement.newFqcn });
          }
        }
        addReferenceEdits(plannedEdits, file, replacement.oldFqcn, replacement.newFqcn, move.newUri.toString(), new Map(), false);
      }
    }
  }
  const snapshots = [...sources].map(([uri, source]) => ({ uri, version: null as null, length: source.length }));
  return workspaceEditFromPlan(createEditPlan('Reconcile moved PHP files', snapshots, plannedEdits), sources);
}

/**
 * Builds only an all-or-nothing edit for Explorer file moves. The file operation
 * itself belongs to VS Code; this edit updates PHP namespaces and semantic refs.
 */
export async function buildMoveEdits(
  index: WorkspaceSymbolIndex,
  files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[],
  mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[],
): Promise<vscode.WorkspaceEdit> {
  const plans: PlannedMove[] = [];
  const movingUris = new Set(files.map((item) => item.oldUri.toString()));
  const renamedUris = new Map(files.map((item) => [item.oldUri.toString(), item.newUri]));
  const targetFqcns = new Set<string>();

  for (const moved of files) {
    const indexed = index.getFile(moved.oldUri.toString());
    if (!indexed) throw new MoveError(`Safe Move requires a complete index for ${moved.oldUri.fsPath}.`);
    if (indexed.errors.length) throw new MoveError(`Cannot move ${moved.oldUri.fsPath}: the file has PHP syntax errors.`);
    if (isDirty(indexed.uri)) throw new MoveError(`Cannot move ${moved.oldUri.fsPath}: save the file before moving it.`);
    const mappings = mappingsForUri(moved.oldUri);
    if (!mappings.length) throw new MoveError(`Cannot move ${moved.oldUri.fsPath}: no Composer PSR-4 mapping applies.`);
    if (indexed.declarations.some((declaration) => !canonicalDeclaration(declaration, mappings))) {
      throw new MoveError(`Cannot move ${moved.oldUri.fsPath}: its declarations do not match Composer PSR-4 paths.`);
    }
    const newNamespace = resolvePsr4Namespace(moved.newUri.fsPath, mappingsForUri(moved.newUri));
    if (newNamespace === undefined) throw new MoveError(`Cannot move ${moved.newUri.fsPath}: destination is outside Composer PSR-4 mappings.`);
    if (newNamespace.toLowerCase() === indexed.namespace.toLowerCase()) continue;
    const declarationNamespace = namespaceRange(indexed.source);
    if (!declarationNamespace) throw new MoveError(`Cannot move ${moved.oldUri.fsPath}: global-namespace files are not supported yet.`);
    const declarations = indexed.declarations.map((declaration) => ({ declaration, newFqcn: `${newNamespace}\\${declaration.name}` }));
    for (const { newFqcn } of declarations) {
      const key = newFqcn.toLowerCase();
      if (targetFqcns.has(key)) throw new MoveError(`Cannot move files: multiple declarations would become ${newFqcn}.`);
      targetFqcns.add(key);
      const conflicts = index.findDeclarations(newFqcn).filter((item) => !movingUris.has(item.uri));
      if (conflicts.length) {
        const paths = conflicts.map((item) => vscode.Uri.parse(item.uri).fsPath).join(', ');
        throw new MoveError(`Cannot move ${moved.oldUri.fsPath}: destination declaration ${newFqcn} already exists in ${paths}.`);
      }
    }
    plans.push({ indexed, newNamespace, namespaceRange: declarationNamespace, declarations });
  }

  // Validate every affected open file before constructing any edit.
  for (const plan of plans) {
    for (const { declaration } of plan.declarations) {
      const related = new Set([plan.indexed.uri, ...index.findReferences(declaration.fqcn).map((reference) => reference.uri)]);
      for (const uri of related) {
        const file = index.getFile(uri);
        if (!file || file.errors.length) throw new MoveError(`Cannot move ${declaration.fqcn}: a related file has syntax errors or is missing from the index.`);
        if (isDirty(uri)) throw new MoveError(`Cannot move ${declaration.fqcn}: save related file ${vscode.Uri.parse(uri).fsPath} first.`);
      }
    }
  }

  const plannedEdits: Array<Omit<PlannedTextEdit, 'expectedVersion' | 'expectedLength' | 'expectedTextHash'>> = [];
  const sources = new Map<string, string>();
  for (const file of index.getFiles()) {
    const targetUri = renamedUris.get(file.uri)?.toString() ?? file.uri;
    sources.set(targetUri, file.source);
  }
  for (const plan of plans) {
    const targetUri = renamedUris.get(plan.indexed.uri) ?? vscode.Uri.parse(plan.indexed.uri);
    plannedEdits.push({ uri: targetUri.toString(), start: plan.namespaceRange.start, end: plan.namespaceRange.end, newText: plan.newNamespace });
    for (const { declaration, newFqcn } of plan.declarations) {
      for (const file of index.getFiles()) {
        addReferenceEdits(
          plannedEdits,
          file,
          declaration.fqcn,
          newFqcn,
          plan.indexed.uri,
          renamedUris,
        );
      }
    }
  }
  const snapshots = [...sources].map(([uri, source]) => ({ uri, version: null as null, length: source.length }));
  return workspaceEditFromPlan(createEditPlan('Update namespaces and references for moved PHP files', snapshots, plannedEdits), sources);
}

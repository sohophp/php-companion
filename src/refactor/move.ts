import * as vscode from 'vscode';
import { resolvePsr4Namespace, type Psr4Mapping } from '../composer/project.js';
import type { IndexedFile } from '../index/types.js';
import type { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';

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

function addReferenceEdits(edit: vscode.WorkspaceEdit, file: IndexedFile, oldFqcn: string, newFqcn: string, movedUri: string): void {
  const uri = vscode.Uri.parse(file.uri);
  const importsOldClass = file.imports.some((item) => item.fqcn.toLowerCase() === oldFqcn.toLowerCase());
  for (const item of file.imports.filter((candidate) => candidate.fqcn.toLowerCase() === oldFqcn.toLowerCase())) {
    const importedPath = file.source.slice(item.pathStart, item.pathEnd).replace(/^\\+/, '');
    if (importedPath.toLowerCase() === oldFqcn.toLowerCase()) {
      edit.replace(uri, range(file.source, item.pathStart, item.pathEnd), newFqcn);
    }
  }
  for (const reference of file.references.filter((candidate) => candidate.fqcn.toLowerCase() === oldFqcn.toLowerCase())) {
    if (importsOldClass) continue;
    if (reference.text.includes('\\')) {
      const leadingSlash = reference.text.startsWith('\\') ? '\\' : '';
      edit.replace(uri, range(file.source, reference.start, reference.end), `${leadingSlash}${newFqcn}`);
    } else if (file.uri !== movedUri && file.namespace.toLowerCase() === oldFqcn.slice(0, oldFqcn.lastIndexOf('\\')).toLowerCase()) {
      edit.replace(uri, range(file.source, reference.start, reference.end), `\\${newFqcn}`);
    }
  }
}

export async function buildMoveEdits(
  index: WorkspaceSymbolIndex,
  files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[],
  mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[],
): Promise<vscode.WorkspaceEdit> {
  const edit = new vscode.WorkspaceEdit();
  for (const moved of files) {
    const indexed = index.getFile(moved.oldUri.toString());
    if (!indexed || indexed.errors.length) continue;
    const newNamespace = resolvePsr4Namespace(moved.newUri.fsPath, mappingsForUri(moved.newUri));
    if (newNamespace === undefined || newNamespace.toLowerCase() === indexed.namespace.toLowerCase()) continue;
    const declarationNamespace = namespaceRange(indexed.source);
    if (!declarationNamespace) continue;
    edit.replace(moved.oldUri, range(indexed.source, declarationNamespace.start, declarationNamespace.end), newNamespace);
    for (const declaration of indexed.declarations) {
      const oldFqcn = declaration.fqcn;
      const newFqcn = newNamespace ? `${newNamespace}\\${declaration.name}` : declaration.name;
      for (const file of index.getFiles()) addReferenceEdits(edit, file, oldFqcn, newFqcn, indexed.uri);
    }
  }
  return edit;
}

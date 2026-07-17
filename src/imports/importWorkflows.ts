import * as vscode from 'vscode';
import type { IndexedDeclaration, IndexedFile } from '../index/types.js';
import type { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';
import type { ParsedImport, SourceRange } from '../parser/phpParser.js';
import { resolve } from 'node:path';
import { resolvePsr4Class, type Psr4Mapping } from '../composer/project.js';

export interface ImportCandidate extends IndexedDeclaration {
  score: number;
}

function commonNamespaceDepth(left: string, right: string): number {
  const a = left.toLowerCase().split('\\');
  const b = right.toLowerCase().split('\\');
  let depth = 0;
  while (a[depth] && a[depth] === b[depth]) depth += 1;
  return depth;
}

export function rankedImportCandidates(index: WorkspaceSymbolIndex, file: IndexedFile, name: string, mappings: Psr4Mapping[] = []): ImportCandidate[] {
  return index.candidatesForShortName(name)
    .filter((candidate) => candidate.uri !== file.uri)
    .filter((candidate) => !mappings.length || resolvePsr4Class(candidate.fqcn, mappings).some((path) => resolve(path) === resolve(vscode.Uri.parse(candidate.uri).fsPath)))
    .map((candidate) => ({
      ...candidate,
      score: commonNamespaceDepth(file.namespace, candidate.fqcn.slice(0, candidate.fqcn.lastIndexOf('\\'))) * 100
        + (vscode.Uri.parse(candidate.uri).path.split('/').slice(0, -1).join('/') === vscode.Uri.parse(file.uri).path.split('/').slice(0, -1).join('/') ? 25 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.fqcn.localeCompare(b.fqcn));
}

export function importInsertionOffset(source: string): number {
  const usePattern = /^use\s+(?:(?:function|const)\s+)?[^;]+;\s*$/gm;
  let lastUse: RegExpExecArray | undefined;
  for (const match of source.matchAll(usePattern)) lastUse = match;
  if (lastUse?.index !== undefined) return lastUse.index + lastUse[0].length;
  const namespace = /^namespace\s+[^;{]+\s*([;{])/m.exec(source);
  if (namespace?.index !== undefined) return namespace.index + namespace[0].length;
  const openTag = /<\?php\s*/.exec(source);
  return openTag?.index !== undefined ? openTag.index + openTag[0].length : 0;
}

export function buildAddImportEdit(document: vscode.TextDocument, file: IndexedFile, fqcn: string, alias?: string): vscode.WorkspaceEdit | undefined {
  if (file.imports.some((item) => item.fqcn.toLowerCase() === fqcn.toLowerCase())) return undefined;
  const shortName = fqcn.split('\\').at(-1)!;
  const effectiveAlias = alias ?? shortName;
  const occupied = file.imports.find((item) => item.alias.toLowerCase() === effectiveAlias.toLowerCase() && item.fqcn.toLowerCase() !== fqcn.toLowerCase());
  if (occupied || file.declarations.some((item) => item.name.toLowerCase() === effectiveAlias.toLowerCase())) return undefined;
  const offset = importInsertionOffset(document.getText());
  const before = document.getText().slice(0, offset);
  const prefix = before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const suffix = document.getText().slice(offset).startsWith('\n') ? '\n' : '\n\n';
  const edit = new vscode.WorkspaceEdit();
  edit.insert(document.uri, document.positionAt(offset), `${prefix}use ${fqcn}${effectiveAlias !== shortName ? ` as ${effectiveAlias}` : ''};${suffix}`);
  return edit;
}

function overlaps(range: SourceRange, other: SourceRange): boolean {
  return range.start < other.end && other.start < range.end;
}

function maskedSource(file: IndexedFile): string {
  const ranges = [...file.commentRanges, ...file.stringRanges, ...file.imports.map((item) => ({ start: item.statementStart, end: item.statementEnd }))];
  const chars = file.source.split('');
  for (const range of ranges) for (let offset = range.start; offset < range.end; offset += 1) chars[offset] = chars[offset] === '\n' ? '\n' : ' ';
  return chars.join('');
}

function importLine(item: ParsedImport): string {
  const prefix = item.kind === 'class' ? '' : `${item.kind} `;
  const shortName = item.fqcn.split('\\').at(-1)!;
  return `use ${prefix}${item.fqcn}${item.explicitAlias || item.alias !== shortName ? ` as ${item.alias}` : ''};`;
}

export interface OptimizeImportsResult {
  edit?: vscode.WorkspaceEdit;
  optimizedSource?: string;
  removed: number;
}

export function buildOptimizeImportsEdit(document: vscode.TextDocument, file: IndexedFile, index: WorkspaceSymbolIndex, sort: 'grouped' | 'fqcn' = 'grouped'): OptimizeImportsResult {
  if (file.errors.length || !file.imports.length) return { removed: 0 };
  const statements = [...new Map(file.imports.map((item) => [item.statementStart, { start: item.statementStart, end: item.statementEnd }])).values()].sort((a, b) => a.start - b.start);
  if (statements.some((statement) => file.commentRanges.some((comment) => overlaps(statement, comment)))) return { removed: 0 };
  for (let position = 1; position < statements.length; position += 1) {
    const gap = file.source.slice(statements[position - 1]!.end, statements[position]!.start);
    if (gap.trim()) return { removed: 0 };
  }
  const searchable = maskedSource(file);
  const hasDynamicClassUse = /\b(?:new|instanceof)\s+\$|\$[A-Za-z_][A-Za-z0-9_]*\s*::/.test(searchable);
  const seen = new Set<string>();
  const kept = file.imports.filter((item) => {
    const key = `${item.kind}:${item.fqcn.toLowerCase()}:${item.alias.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (item.kind === 'class') {
      if (hasDynamicClassUse) return true;
      if (!index.findDeclarations(item.fqcn).length) return true;
      return file.references.some((reference) => reference.fqcn.toLowerCase() === item.fqcn.toLowerCase());
    }
    const flags = item.kind === 'function' ? 'i' : '';
    return new RegExp(`\\b${item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags).test(searchable);
  });
  const kindOrder = { class: 0, function: 1, const: 2 } as const;
  kept.sort((a, b) => (sort === 'grouped' ? kindOrder[a.kind] - kindOrder[b.kind] : 0) || a.fqcn.localeCompare(b.fqcn, undefined, { sensitivity: 'base' }) || a.alias.localeCompare(b.alias));
  const start = statements[0]!.start;
  const end = statements.at(-1)!.end;
  const replacement = kept.map(importLine).join('\n');
  const current = file.source.slice(start, end);
  if (current === replacement) return { removed: file.imports.length - kept.length };
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(document.positionAt(start), document.positionAt(end)), replacement);
  return { edit, optimizedSource: `${file.source.slice(0, start)}${replacement}${file.source.slice(end)}`, removed: file.imports.length - kept.length };
}

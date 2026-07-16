import * as vscode from 'vscode';
import type { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';
import { t } from '../extension/localize.js';

const METADATA_MIME = 'application/vnd.php-companion.symbols+json';
const PASTE_KIND = vscode.DocumentDropOrPasteEditKind.TextUpdateImports.append('php');

interface CopiedSymbol {
  fqcn: string;
  alias: string;
}

function importInsertionOffset(source: string): number {
  const usePattern = /^use\s+(?:(?:function|const)\s+)?[^;]+;\s*$/gm;
  let lastUse: RegExpExecArray | undefined;
  for (const match of source.matchAll(usePattern)) lastUse = match;
  if (lastUse?.index !== undefined) return lastUse.index + lastUse[0].length;
  const namespace = /^namespace\s+[^;{]+\s*([;{])/m.exec(source);
  if (namespace?.index !== undefined) return namespace.index + namespace[0].length;
  const openTag = /<\?php\s*/.exec(source);
  return openTag?.index !== undefined ? openTag.index + openTag[0].length : 0;
}

function chooseAlias(fqcn: string, preferred: string, occupied: Map<string, string>): string {
  if (!occupied.has(preferred.toLowerCase()) || occupied.get(preferred.toLowerCase()) === fqcn) return preferred;
  let suffix = 2;
  while (occupied.has(`${preferred}${suffix}`.toLowerCase())) suffix += 1;
  return `${preferred}${suffix}`;
}

function buildImportEdit(
  document: vscode.TextDocument,
  symbols: CopiedSymbol[],
  index: WorkspaceSymbolIndex,
): { insertTextReplacements: Map<string, string>; edit?: vscode.WorkspaceEdit } {
  const file = index.getFile(document.uri.toString());
  const source = document.getText();
  const namespace = file?.namespace ?? /^namespace\s+([^;{]+)/m.exec(source)?.[1]?.trim() ?? '';
  const occupied = new Map((file?.imports ?? []).map((item) => [item.alias.toLowerCase(), item.fqcn]));
  const existing = new Set((file?.imports ?? []).map((item) => item.fqcn.toLowerCase()));
  const lines: string[] = [];
  const replacements = new Map<string, string>();

  for (const symbol of symbols) {
    const parts = symbol.fqcn.split('\\');
    const symbolNamespace = parts.slice(0, -1).join('\\');
    if (symbolNamespace.toLowerCase() === namespace.toLowerCase() || existing.has(symbol.fqcn.toLowerCase())) continue;
    const preferred = symbol.alias || parts.at(-1)!;
    const alias = chooseAlias(symbol.fqcn, preferred, occupied);
    occupied.set(alias.toLowerCase(), symbol.fqcn);
    existing.add(symbol.fqcn.toLowerCase());
    lines.push(`use ${symbol.fqcn}${alias !== parts.at(-1) ? ` as ${alias}` : ''};`);
    if (alias !== preferred) replacements.set(preferred, alias);
  }
  if (!lines.length) return { insertTextReplacements: replacements };

  const offset = importInsertionOffset(source);
  const before = source.slice(0, offset);
  const prefix = before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const suffix = source.slice(offset).startsWith('\n') ? '\n' : '\n\n';
  const edit = new vscode.WorkspaceEdit();
  edit.insert(document.uri, document.positionAt(offset), `${prefix}${lines.sort().join('\n')}${suffix}`);
  return { insertTextReplacements: replacements, edit };
}

function replaceAliases(text: string, replacements: Map<string, string>): string {
  let result = text;
  for (const [before, after] of replacements) {
    result = result.replace(new RegExp(`\\b${before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), after);
  }
  return result;
}

export class PhpImportPasteProvider implements vscode.DocumentPasteEditProvider {
  constructor(private readonly index: WorkspaceSymbolIndex) {}

  prepareDocumentPaste(document: vscode.TextDocument, ranges: readonly vscode.Range[], dataTransfer: vscode.DataTransfer): void {
    const file = this.index.getFile(document.uri.toString());
    if (!file) return;
    const copied = new Map<string, CopiedSymbol>();
    for (const range of ranges) {
      const start = document.offsetAt(range.start);
      const end = document.offsetAt(range.end);
      for (const symbol of [...file.references, ...file.declarations]) {
        if (symbol.start < start || symbol.end > end) continue;
        const fqcn = symbol.fqcn;
        const alias = 'text' in symbol && !symbol.text.includes('\\') ? symbol.text : fqcn.split('\\').at(-1)!;
        copied.set(fqcn.toLowerCase(), { fqcn, alias });
      }
    }
    if (copied.size) dataTransfer.set(METADATA_MIME, new vscode.DataTransferItem([...copied.values()]));
  }

  async provideDocumentPasteEdits(document: vscode.TextDocument, _ranges: readonly vscode.Range[], dataTransfer: vscode.DataTransfer): Promise<vscode.DocumentPasteEdit[] | undefined> {
    const mode = vscode.workspace.getConfiguration('phpCompanion', document.uri).get<'auto' | 'preview' | 'off'>('pasteImports.mode', 'preview');
    if (mode === 'off') return undefined;
    const plain = dataTransfer.get('text/plain');
    if (!plain) return undefined;
    const symbols = dataTransfer.get(METADATA_MIME)?.value as CopiedSymbol[] | undefined;
    const text = await plain.asString();
    let variants: CopiedSymbol[][] = [];

    if (!symbols?.length) {
      const names = new Set(text.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? []);
      const unique: CopiedSymbol[] = [];
      let ambiguity: { name: string; candidates: ReturnType<WorkspaceSymbolIndex['candidatesForShortName']> } | undefined;
      for (const name of names) {
        const candidates = this.index.candidatesForShortName(name);
        if (candidates.length === 1) unique.push({ fqcn: candidates[0]!.fqcn, alias: name });
        else if (candidates.length > 1 && !ambiguity) ambiguity = { name, candidates };
      }
      variants = ambiguity
        ? ambiguity.candidates.map((candidate) => [...unique, { fqcn: candidate.fqcn, alias: ambiguity.name }])
        : [unique];
    } else {
      variants = [symbols];
    }
    const edits = variants.flatMap((variant) => {
      if (!variant.length) return [];
      const built = buildImportEdit(document, variant, this.index);
      if (!built.edit) return [];
      const selected = variant.at(-1)?.fqcn;
      const title = variants.length > 1 ? `${t('pasteImports')}: ${selected}` : t('pasteImports');
      const paste = new vscode.DocumentPasteEdit(replaceAliases(text, built.insertTextReplacements), title, PASTE_KIND);
      paste.additionalEdit = built.edit;
      if (mode === 'preview') paste.yieldTo = [vscode.DocumentDropOrPasteEditKind.Text];
      return [paste];
    });
    return edits.length ? edits : undefined;
  }
}

export async function resolveDocumentImports(document: vscode.TextDocument, index: WorkspaceSymbolIndex): Promise<boolean> {
  const source = document.getText();
  const file = index.getFile(document.uri.toString());
  if (!file) return false;
  const unresolved = new Set(source.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? []);
  const symbols: CopiedSymbol[] = [];
  for (const name of unresolved) {
    if (file.imports.some((item) => item.alias === name) || file.declarations.some((item) => item.name === name)) continue;
    const candidates = index.candidatesForShortName(name);
    if (candidates.length === 1) symbols.push({ fqcn: candidates[0]!.fqcn, alias: name });
    else if (candidates.length > 1) {
      const selected = await vscode.window.showQuickPick(
        candidates.map((candidate) => ({ label: candidate.fqcn, candidate })),
        { placeHolder: `Select import for ${name}` },
      );
      if (selected) symbols.push({ fqcn: selected.candidate.fqcn, alias: name });
    }
  }
  const built = buildImportEdit(document, symbols, index);
  return built.edit ? vscode.workspace.applyEdit(built.edit) : false;
}

export const phpPasteMetadata: vscode.DocumentPasteProviderMetadata = {
  copyMimeTypes: [METADATA_MIME],
  pasteMimeTypes: [METADATA_MIME, 'text/plain'],
  providedPasteEditKinds: [PASTE_KIND],
};

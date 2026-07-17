import type { ParsedPhpDocument, PhpSyntaxParser } from '../parser/phpParser.js';
import type { IndexedDeclaration, IndexedFile, IndexedReference, IndexProblem } from './types.js';

interface PendingFile {
  uri: string;
  source: string;
  parsed: ParsedPhpDocument;
}

function resolveName(text: string, namespace: string, imports: Map<string, string>): string[] {
  if (text.startsWith('\\')) return [text.slice(1)];
  const parts = text.split('\\');
  const imported = imports.get(parts[0]!.toLowerCase());
  if (imported) return [`${imported}${parts.length > 1 ? `\\${parts.slice(1).join('\\')}` : ''}`];
  if (parts.length > 1) return [namespace ? `${namespace}\\${text}` : text, text];
  return [namespace ? `${namespace}\\${text}` : text, text];
}

export class WorkspaceSymbolIndex {
  private readonly pending = new Map<string, PendingFile>();
  private readonly files = new Map<string, IndexedFile>();
  private readonly declarations = new Map<string, IndexedDeclaration[]>();
  private problems: IndexProblem[] = [];

  constructor(private readonly parser: PhpSyntaxParser) {}

  update(uri: string, source: string): void {
    const previous = this.pending.get(uri);
    const pending = { uri, source, parsed: this.parser.parse(source) };
    this.replacePending(pending);
    const before = previous?.parsed.declarations.map((item) => item.fqcn.toLowerCase()).sort().join('|');
    const after = pending.parsed.declarations.map((item) => item.fqcn.toLowerCase()).sort().join('|');
    if (previous && before === after) {
      this.resolveFile(pending);
      this.rebuildProblems();
    } else {
      this.rebuildResolvedIndex();
    }
  }

  updateMany(entries: Iterable<{ uri: string; source: string }>): void {
    for (const entry of entries) {
      this.replacePending({ ...entry, parsed: this.parser.parse(entry.source) });
    }
    this.rebuildResolvedIndex();
  }

  async updateManyAsync(entries: Iterable<{ uri: string; source: string }>, batchSize = 1, shouldContinue: () => boolean = () => true): Promise<boolean> {
    batchSize = Math.max(1, batchSize);
    let processed = 0;
    for (const entry of entries) {
      if (!shouldContinue()) { this.clear(); return false; }
      this.replacePending({ ...entry, parsed: this.parser.parse(entry.source) });
      processed += 1;
      if (processed % batchSize === 0) await this.yieldToEventLoop();
    }
    if (!await this.rebuildResolvedIndexAsync(batchSize, shouldContinue)) { this.clear(); return false; }
    return true;
  }

  remove(uri: string): void {
    this.pending.get(uri)?.parsed.tree.delete();
    this.pending.delete(uri);
    this.rebuildResolvedIndex();
  }

  clear(): void {
    for (const pending of this.pending.values()) pending.parsed.tree.delete();
    this.pending.clear();
    this.files.clear();
    this.declarations.clear();
    this.problems = [];
  }

  getFile(uri: string): IndexedFile | undefined {
    return this.files.get(uri);
  }

  getFiles(): IndexedFile[] {
    return [...this.files.values()];
  }

  findDeclarations(fqcn: string): IndexedDeclaration[] {
    return this.declarations.get(fqcn.toLowerCase()) ?? [];
  }

  findReferences(fqcn: string): IndexedReference[] {
    const key = fqcn.toLowerCase();
    return this.getFiles().flatMap((file) => file.references.filter((reference) => reference.fqcn.toLowerCase() === key));
  }

  findSymbolAt(uri: string, offset: number): IndexedDeclaration | IndexedReference | undefined {
    const file = this.files.get(uri);
    if (!file) return undefined;
    const imported = file.imports.find((item) => offset >= item.start && offset <= item.end);
    if (imported) return { uri, fqcn: imported.fqcn, text: file.source.slice(imported.start, imported.end), start: imported.start, end: imported.end, context: 'code' };
    return [...file.declarations, ...file.references].find((symbol) => offset >= symbol.start && offset <= symbol.end);
  }

  candidatesForShortName(name: string): IndexedDeclaration[] {
    const lower = name.toLowerCase();
    return [...this.declarations.values()].flat().filter((declaration) => declaration.name.toLowerCase() === lower);
  }

  getProblems(): IndexProblem[] {
    return [...this.problems];
  }

  getRelatedClasses(uri: string): string[] {
    const parsed = this.pending.get(uri)?.parsed;
    if (!parsed) return [];
    const imports = new Map(parsed.imports.map((item) => [item.alias.toLowerCase(), item.fqcn]));
    const candidates = [
      ...parsed.imports.map((item) => item.fqcn),
      ...parsed.rawNames.flatMap((item) => resolveName(item.text, parsed.namespace, imports)),
    ];
    return [...new Set(candidates.filter((fqcn) => /^[A-Z_\x80-\xff]/.test(fqcn.split('\\').at(-1) ?? '')))];
  }

  private rebuildResolvedIndex(): void {
    this.files.clear();
    this.rebuildDeclarations();
    for (const pending of this.pending.values()) this.resolveFile(pending);
    this.rebuildProblems();
  }

  private async rebuildResolvedIndexAsync(batchSize: number, shouldContinue: () => boolean): Promise<boolean> {
    this.files.clear();
    this.rebuildDeclarations();
    let processed = 0;
    for (const pending of this.pending.values()) {
      if (!shouldContinue()) return false;
      this.resolveFile(pending);
      processed += 1;
      if (processed % batchSize === 0) await this.yieldToEventLoop();
    }
    this.rebuildProblems();
    return true;
  }

  private replacePending(pending: PendingFile): void {
    this.pending.get(pending.uri)?.parsed.tree.delete();
    this.pending.set(pending.uri, pending);
  }

  private yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }

  private rebuildDeclarations(): void {
    this.declarations.clear();
    for (const pending of this.pending.values()) {
      for (const declaration of pending.parsed.declarations) {
        const indexed = { ...declaration, uri: pending.uri };
        const key = declaration.fqcn.toLowerCase();
        this.declarations.set(key, [...(this.declarations.get(key) ?? []), indexed]);
      }
    }

  }

  private resolveFile(pending: PendingFile): void {
    const imports = new Map(pending.parsed.imports.map((item) => [item.alias.toLowerCase(), item.fqcn]));
    const references: IndexedReference[] = [];
    for (const raw of pending.parsed.rawNames) {
      const fqcn = resolveName(raw.text, pending.parsed.namespace, imports)
        .find((candidate) => this.declarations.has(candidate.toLowerCase()));
      if (fqcn) references.push({ ...raw, uri: pending.uri, fqcn });
    }
    const declarations = pending.parsed.declarations.map((item) => ({ ...item, uri: pending.uri }));
    this.files.set(pending.uri, {
      uri: pending.uri,
      source: pending.source,
      namespace: pending.parsed.namespace,
      declarations,
      imports: pending.parsed.imports,
      references,
      errors: pending.parsed.errors,
      commentRanges: pending.parsed.commentRanges,
      stringRanges: pending.parsed.stringRanges,
    });
  }

  private rebuildProblems(): void {
    this.problems = [];
    for (const [fqcn, declarations] of this.declarations) {
      if (declarations.length > 1) this.problems.push({ message: `Duplicate FQCN: ${fqcn}` });
    }
    for (const pending of this.pending.values()) {
      if (pending.parsed.errors.length) this.problems.push({ uri: pending.uri, message: `${pending.parsed.errors.length} syntax error range(s)` });
    }
  }
}

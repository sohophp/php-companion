import { Language, Parser, type Node as SyntaxNode, type Tree } from 'web-tree-sitter';

export type PhpSymbolKind = 'class' | 'interface' | 'trait' | 'enum';

export interface SourceRange {
  start: number;
  end: number;
}

export interface ParsedDeclaration extends SourceRange {
  name: string;
  fqcn: string;
  kind: PhpSymbolKind;
}

export interface ParsedImport extends SourceRange {
  fqcn: string;
  alias: string;
  explicitAlias: boolean;
  pathStart: number;
  pathEnd: number;
  statementStart: number;
  statementEnd: number;
}

export interface RawName extends SourceRange {
  text: string;
}

export interface ParsedPhpDocument {
  namespace: string;
  declarations: ParsedDeclaration[];
  imports: ParsedImport[];
  rawNames: RawName[];
  errors: SourceRange[];
  textRanges: SourceRange[];
  tree: Tree;
}

export interface PhpParserPaths {
  coreWasmPath: string;
  phpWasmPath: string;
}

const DECLARATION_TYPES: Record<string, PhpSymbolKind> = {
  class_declaration: 'class',
  interface_declaration: 'interface',
  trait_declaration: 'trait',
  enum_declaration: 'enum',
};

const PROTECTED_TYPES = new Set([
  'comment', 'string', 'encapsed_string', 'heredoc', 'nowdoc', 'shell_command_expression',
]);

let parserInitialization: Promise<void> | undefined;

function byteToUtf16(source: string, byteOffset: number): number {
  return Buffer.from(source, 'utf8').subarray(0, byteOffset).toString('utf8').length;
}

function nodeRange(source: string, node: SyntaxNode): SourceRange {
  return { start: byteToUtf16(source, node.startIndex), end: byteToUtf16(source, node.endIndex) };
}

function walk(node: SyntaxNode, callback: (node: SyntaxNode) => void): void {
  callback(node);
  for (const child of node.namedChildren) walk(child, callback);
}

function parseUseClause(text: string, start: number): ParsedImport[] {
  const prefixMatch = /^\s*use\s+(?:(?:function|const)\s+)?/i.exec(text);
  if (!prefixMatch || /^(?:\s*use\s+)(?:function|const)\s+/i.test(text)) return [];
  const bodyStart = prefixMatch[0].length;
  const body = text.slice(bodyStart).replace(/;\s*$/, '').trim();
  const groupMatch = /^(.*?)\\\{([\s\S]*)\}$/.exec(body);
  const parts = groupMatch ? groupMatch[2]!.split(',') : body.split(',');
  const prefix = groupMatch ? `${groupMatch[1]}\\` : '';
  const imports: ParsedImport[] = [];
  let searchOffset = bodyStart;
  for (const part of parts) {
    const trimmed = part.trim();
    const match = /^([^\s]+)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/i.exec(trimmed);
    if (!match) continue;
    const relative = text.indexOf(trimmed, searchOffset);
    searchOffset = relative + trimmed.length;
    const fqcn = `${prefix}${match[1]}`.replace(/^\\+/, '');
    const importedName = match[1]!.split('\\').at(-1)!;
    const alias = match[2] ?? importedName;
    const nameOffset = trimmed.indexOf(importedName);
    imports.push({
      fqcn,
      alias,
      explicitAlias: match[2] !== undefined,
      start: start + relative + nameOffset,
      end: start + relative + nameOffset + importedName.length,
      pathStart: start + relative,
      pathEnd: start + relative + match[1]!.length,
      statementStart: start,
      statementEnd: start + text.length,
    });
  }
  return imports;
}

export class PhpSyntaxParser {
  private constructor(private readonly parser: Parser) {}

  static async create(paths: PhpParserPaths): Promise<PhpSyntaxParser> {
    parserInitialization ??= Parser.init({ locateFile: () => paths.coreWasmPath });
    await parserInitialization;
    const language = await Language.load(paths.phpWasmPath);
    const parser = new Parser();
    parser.setLanguage(language);
    return new PhpSyntaxParser(parser);
  }

  parse(source: string, oldTree?: Tree): ParsedPhpDocument {
    const tree = this.parser.parse(source, oldTree);
    if (!tree) throw new Error('Tree-sitter returned no parse tree.');
    const declarations: ParsedDeclaration[] = [];
    const imports: ParsedImport[] = [];
    const errors: SourceRange[] = [];
    const protectedRanges: SourceRange[] = [];
    let namespace = '';

    walk(tree.rootNode, (node) => {
      if (PROTECTED_TYPES.has(node.type)) protectedRanges.push(nodeRange(source, node));
      if (node.isError || node.isMissing) errors.push(nodeRange(source, node));
      if (node.type === 'namespace_definition' && namespace === '') {
        namespace = node.childForFieldName('name')?.text.replace(/^\\+|\\+$/g, '') ?? '';
      }
      const kind = DECLARATION_TYPES[node.type];
      if (kind) {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const range = nodeRange(source, nameNode);
          declarations.push({ ...range, name: nameNode.text, fqcn: namespace ? `${namespace}\\${nameNode.text}` : nameNode.text, kind });
        }
      }
      if (node.type === 'namespace_use_declaration') {
        const range = nodeRange(source, node);
        imports.push(...parseUseClause(source.slice(range.start, range.end), range.start));
      }
    });

    const importStatements = imports.map((item) => ({ start: item.statementStart, end: item.statementEnd }));
    const excluded = [...protectedRanges, ...importStatements, ...declarations]
      .sort((a, b) => a.start - b.start);
    const rawNames: RawName[] = [];
    const pattern = /\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*(?:\\[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)*/g;
    for (const match of source.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (excluded.some((range) => start >= range.start && end <= range.end)) continue;
      const before = source.slice(Math.max(0, start - 16), start);
      if (/(?:->|::|\$|function\s+|const\s+)\s*$/.test(before)) continue;
      rawNames.push({ text: match[0], start, end });
    }

    return { namespace, declarations, imports, rawNames, errors, textRanges: protectedRanges, tree };
  }

  dispose(): void {
    this.parser.delete();
  }
}

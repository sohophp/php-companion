import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Edit, Language, Parser, type Node as SyntaxNode, type Tree } from 'web-tree-sitter';

export type PhpSymbolKind = 'class' | 'interface' | 'trait' | 'enum';

export interface SourceRange {
  start: number;
  end: number;
}

export interface ParsedDeclaration extends SourceRange {
  name: string;
  fqcn: string;
  kind: PhpSymbolKind;
  anonymous: boolean;
  declarationStart: number;
  declarationEnd: number;
  extendsNames: string[];
  implementsNames: string[];
  traitNames: string[];
  traitAdaptations: ParsedTraitAdaptation[];
  readonlyClass: boolean;
  enumBackingType?: 'int' | 'string';
}

export type ParsedTraitAdaptation =
  | { kind: 'precedence'; trait: string; method: string; insteadOf: string[]; start: number; end: number }
  | { kind: 'alias'; trait?: string; method: string; alias?: string; visibility?: 'public' | 'protected' | 'private'; start: number; end: number };

export interface ParsedParameter extends SourceRange {
  name: string;
  type?: string;
  /** Parser-native type before any downstream PHPDoc refinement. */
  nativeType?: string;
  defaultValue?: string;
  promoted: boolean;
  variadic: boolean;
  byReference: boolean;
}

export interface ParsedCallableDeclaration extends SourceRange {
  name: string;
  fqcn: string;
  kind: 'function' | 'method';
  containerFqcn?: string;
  parameters: ParsedParameter[];
  returnType?: string;
  /** Parser-native return type before any downstream PHPDoc refinement. */
  nativeReturnType?: string;
  declarationStart: number;
  declarationEnd: number;
  visibility: 'public' | 'protected' | 'private';
  static: boolean;
}

export interface ParsedAssignment extends SourceRange {
  variable: string;
  callableFqcn: string;
  scopeId: string;
  typeName?: string;
  typeNames?: string[];
  sourceVariable?: string;
  sourceMember?: { variable: string; member: string; nullsafe: boolean };
  sourceChain?: { variable: string; steps: Array<
    | { kind: 'property'; name: string; nullsafe: boolean }
    | { kind: 'method'; name: string; nullsafe: boolean; callback?: { parameterType: string; returnType: string }; literalArgument?: string }
  > };
  sourceArrayElement?: { variable: string; key: string };
  sourceIterable?: ({ kind: 'variable'; variable: string; part: 'value' }
    | { kind: 'member'; variable: string; member: string; memberKind: 'property' | 'method'; part: 'value' }) & SourceRange;
  validRange?: SourceRange;
  sourceCall?: { kind: 'function'; name: string } | { kind: 'callable-variable'; variable: string } | { kind: 'static'; typeName: string; method: string } | { kind: 'member'; variable: string; method: string; dynamic?: 'literal' | 'variable' | 'expression' | 'constant'; callback?: { parameterType: string; returnType: string }; literalArgument?: string };
}

export interface ParsedScope {
  id: string;
  kind: 'function' | 'method' | 'closure' | 'arrow' | 'property-hook';
  containerFqcn?: string;
  parameters: ParsedParameter[];
  parentId?: string;
  captures: Array<{ variable: string; byReference: boolean }>;
  start: number;
  end: number;
}
export interface ParsedVariableReference extends SourceRange { variable: string; scopeId: string; }
export interface ParsedReturnStatement extends SourceRange { scopeId: string; expressionStart?: number; expressionEnd?: number; }
export type ParsedTypeNarrowing = SourceRange & { variable: string; scopeId: string; propertyPath?: string[]; arrayPath?: string[]; assertion?: true; inspectionStart?: number; inspectionEnd?: number } & (
  { kind: 'instanceof' | 'not-instanceof'; typeName: string }
  | { kind: 'non-null' }
  | { kind: 'boolean-literal'; value: boolean; negated: boolean }
  | { kind: 'array-key-exists'; functionName: string }
  | { kind: 'subclass-predicate'; typeName: string; functionName: string; negated?: boolean }
  | { kind: 'type-predicate'; typeName: string; functionName: string; negated?: boolean }
);

export interface ParsedPropertyDeclaration extends SourceRange {
  name: string;
  fqcn: string;
  containerFqcn: string;
  type?: string;
  defaultValue?: string;
  visibility: 'public' | 'protected' | 'private';
  writeVisibility?: 'public' | 'protected' | 'private';
  static: boolean;
  readonly: boolean;
  final: boolean;
  abstract: boolean;
  promoted: boolean;
  hooks?: Array<SourceRange & {
    kind: 'get' | 'set';
    declarationStart: number;
    declarationEnd: number;
    bodyStart?: number;
    bodyEnd?: number;
    parameter?: ParsedParameter;
    byReference: boolean;
    final: boolean;
    abstract: boolean;
    usesBackingValue: boolean;
  }>;
  virtual?: boolean;
  readable?: boolean;
  writable?: boolean;
  writeType?: string;
  declarationStart: number;
  declarationEnd: number;
}

export interface ParsedConstantDeclaration extends SourceRange {
  kind: 'constant' | 'enum-case';
  name: string;
  fqcn: string;
  containerFqcn?: string;
  global: boolean;
  type?: string;
  value?: string;
  visibility: 'public' | 'protected' | 'private';
  declarationStart: number;
  declarationEnd: number;
}

export interface ParsedImport extends SourceRange {
  kind: 'class' | 'function' | 'const';
  fqcn: string;
  alias: string;
  explicitAlias: boolean;
  aliasStart?: number;
  aliasEnd?: number;
  pathStart: number;
  pathEnd: number;
  statementStart: number;
  statementEnd: number;
  namespace: string;
}

export interface ParsedTypeReference extends SourceRange {
  context: 'native-type' | 'inheritance' | 'trait' | 'attribute' | 'instanceof' | 'static-receiver';
}

export interface RawName extends SourceRange {
  text: string;
  context: 'code' | 'phpdoc';
}

export interface ParsedMemberAccess extends SourceRange {
  name: string;
  kind: 'method' | 'property' | 'constant';
  static: boolean;
  dynamic?: 'literal' | 'variable' | 'expression' | 'constant' | 'unknown';
  receiver?: { kind: 'variable' | 'type'; name: string; nullsafe: boolean };
}

export interface ParsedCall extends SourceRange {
  /** Syntactic call category. Optional only for schema-compatible cached facts. */
  kind?: 'function' | 'method' | 'static-method' | 'constructor';
  nameStart: number;
  nameEnd: number;
  argumentsStart: number;
  argumentsEnd: number;
  arguments: Array<SourceRange & { name?: string; nameStart?: number; nameEnd?: number; unpacked: boolean }>;
  /** Acquires a Closure with `callable(...)`; it does not invoke the target. */
  firstClassCallable?: boolean;
  flat: boolean;
  standalone: boolean;
  /** The call is the whole expression statement and its return value is unused. */
  resultDiscarded?: boolean;
  /** PHP 8.5 `(void)` marker that intentionally consumes this call result. */
  intentionalVoidCast?: SourceRange;
  /** Whole expression that cannot complete when this call invokes native never. */
  terminatingExpression?: SourceRange;
  receiver?: { variable: string; nullsafe: boolean };
  condition?: { whenTrue?: SourceRange; whenFalse?: SourceRange };
  shortCircuit?: Array<{ when: 'true' | 'false'; range: SourceRange }>;
  guardContinuation?: { when: 'true' | 'false'; range: SourceRange; inspection: SourceRange };
}

export interface ParsedPhpDocument {
  namespace: string;
  declarations: ParsedDeclaration[];
  callables: ParsedCallableDeclaration[];
  assignments: ParsedAssignment[];
  scopes: ParsedScope[];
  variableReferences: ParsedVariableReference[];
  returns: ParsedReturnStatement[];
  narrowings: ParsedTypeNarrowing[];
  properties: ParsedPropertyDeclaration[];
  constants: ParsedConstantDeclaration[];
  imports: ParsedImport[];
  typeReferences: ParsedTypeReference[];
  rawNames: RawName[];
  memberAccesses: ParsedMemberAccess[];
  calls: ParsedCall[];
  errors: SourceRange[];
  commentRanges: SourceRange[];
  stringRanges: SourceRange[];
  tree: Tree;
}

export interface PhpParserPaths {
  coreWasmPath: string;
  phpWasmPath: string;
}

export function createIncrementalEdit(oldSource: string, newSource: string): Edit {
  let start = 0; const shared = Math.min(oldSource.length, newSource.length);
  while (start < shared && oldSource[start] === newSource[start]) start += 1;
  let oldEnd = oldSource.length; let newEnd = newSource.length;
  while (oldEnd > start && newEnd > start && oldSource[oldEnd - 1] === newSource[newEnd - 1]) { oldEnd -= 1; newEnd -= 1; }
  const pointAt = (source: string, offset: number): { row: number; column: number } => {
    const prefix = source.slice(0, offset); const row = (prefix.match(/\n/g) ?? []).length; const lineStart = prefix.lastIndexOf('\n');
    return { row, column: offset - lineStart - 1 };
  };
  return new Edit({ startIndex: start, oldEndIndex: oldEnd, newEndIndex: newEnd, startPosition: pointAt(oldSource, start), oldEndPosition: pointAt(oldSource, oldEnd), newEndPosition: pointAt(newSource, newEnd) });
}

export function defaultPhpParserPaths(): PhpParserPaths {
  const require = createRequire(import.meta.url);
  return {
    coreWasmPath: join(dirname(require.resolve('web-tree-sitter')), 'web-tree-sitter.wasm'),
    phpWasmPath: require.resolve('tree-sitter-php/tree-sitter-php.wasm'),
  };
}

const DECLARATION_TYPES: Record<string, PhpSymbolKind> = {
  class_declaration: 'class',
  interface_declaration: 'interface',
  trait_declaration: 'trait',
  enum_declaration: 'enum',
};

const STRING_TYPES = new Set(['string', 'encapsed_string', 'heredoc', 'nowdoc', 'shell_command_expression']);
const PHPDOC_TAG = /@(?:(?:phpstan|psalm)-)?(?:var|param|return|throws|(?:template-)?extends|(?:template-)?implements|mixin|property(?:-read|-write)?|method)\b(?<body>[^\r\n]*)/gi;

function traitAdaptations(node: SyntaxNode): ParsedTraitAdaptation[] {
  const list = node.namedChildren.find((child) => child.type === 'use_list');
  if (!list) return [];
  return list.namedChildren.flatMap((clause): ParsedTraitAdaptation[] => {
    if (clause.type === 'use_instead_of_clause') {
      const match = /^(.+?)::([A-Za-z_][A-Za-z0-9_]*)\s+insteadof\s+(.+)$/.exec(clause.text.trim());
      return match ? [{ kind: 'precedence', trait: match[1]!, method: match[2]!, insteadOf: match[3]!.split(',').map((item) => item.trim()), start: clause.startIndex, end: clause.endIndex }] : [];
    }
    if (clause.type === 'use_as_clause') {
      const match = /^(?:(.+?)::)?([A-Za-z_][A-Za-z0-9_]*)\s+as(?:\s+(public|protected|private))?(?:\s+([A-Za-z_][A-Za-z0-9_]*))?$/.exec(clause.text.trim());
      return match ? [{ kind: 'alias', trait: match[1], method: match[2]!, visibility: match[3] as 'public' | 'protected' | 'private' | undefined, alias: match[4], start: clause.startIndex, end: clause.endIndex }] : [];
    }
    return [];
  });
}

let parserInitialization: Promise<void> | undefined;

function nodeRange(_source: string, node: SyntaxNode): SourceRange {
  // web-tree-sitter receives a JavaScript string and exposes UTF-16 offsets.
  // Reinterpreting these offsets as UTF-8 bytes shifts every range following
  // an astral character and can make navigation or refactors edit wrong text.
  return { start: node.startIndex, end: node.endIndex };
}

function walk(node: SyntaxNode, callback: (node: SyntaxNode) => void): void {
  callback(node);
  for (const child of node.namedChildren) walk(child, callback);
}

function parsePhpDocNames(source: string, range: SourceRange): RawName[] {
  const text = source.slice(range.start, range.end);
  const names: RawName[] = [];
  for (const annotation of text.matchAll(PHPDOC_TAG)) {
    const body = annotation.groups?.body ?? '';
    const bodyOffset = range.start + annotation.index + annotation[0].indexOf(body);
    const pattern = /\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*(?:\\[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)*/g;
    for (const match of body.matchAll(pattern)) {
      const last = match[0].split('\\').at(-1) ?? '';
      if (!/^[A-Z_\x80-\xff]/.test(last)) continue;
      const start = bodyOffset + match.index;
      names.push({ text: match[0], start, end: start + match[0].length, context: 'phpdoc' });
    }
  }
  return names;
}

function parseUseClause(text: string, start: number, namespace: string): ParsedImport[] {
  const prefixMatch = /^\s*use\s+(?:(function|const)\s+)?/i.exec(text);
  if (!prefixMatch) return [];
  const statementKind = (prefixMatch[1]?.toLowerCase() ?? 'class') as ParsedImport['kind'];
  const bodyStart = prefixMatch[0].length;
  const body = text.slice(bodyStart).replace(/;\s*$/, '').trim();
  const groupMatch = /^(.*?)\\\{([\s\S]*)\}$/.exec(body);
  const parts = groupMatch ? groupMatch[2]!.split(',') : body.split(',');
  const prefix = groupMatch ? `${groupMatch[1]}\\` : '';
  const imports: ParsedImport[] = [];
  let searchOffset = bodyStart;
  for (const part of parts) {
    const trimmed = part.trim();
    const match = /^(?:(function|const)\s+)?([^\s]+)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/i.exec(trimmed);
    if (!match) continue;
    const relative = text.indexOf(trimmed, searchOffset);
    searchOffset = relative + trimmed.length;
    const kind = (match[1]?.toLowerCase() ?? statementKind) as ParsedImport['kind'];
    const fqcn = `${prefix}${match[2]}`.replace(/^\\+/, '');
    const importedName = match[2]!.split('\\').at(-1)!;
    const alias = match[3] ?? importedName;
    const nameOffset = trimmed.indexOf(importedName);
    const aliasOffset = match[3] === undefined ? undefined : trimmed.lastIndexOf(match[3]);
    imports.push({
      fqcn,
      alias,
      kind,
      explicitAlias: match[3] !== undefined,
      aliasStart: aliasOffset === undefined ? undefined : start + relative + aliasOffset,
      aliasEnd: aliasOffset === undefined ? undefined : start + relative + aliasOffset + match[3]!.length,
      start: start + relative + nameOffset,
      end: start + relative + nameOffset + importedName.length,
      pathStart: start + relative + trimmed.indexOf(match[2]!),
      pathEnd: start + relative + trimmed.indexOf(match[2]!) + match[2]!.length,
      statementStart: start,
      statementEnd: start + text.length,
      namespace,
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

  static createDefault(): Promise<PhpSyntaxParser> {
    return this.create(defaultPhpParserPaths());
  }

  parse(source: string, oldTree?: Tree, documentIdentity = ''): ParsedPhpDocument {
    const tree = this.parser.parse(source, oldTree);
    if (!tree) throw new Error('Tree-sitter returned no parse tree.');
    const declarations: ParsedDeclaration[] = [];
    const callables: ParsedCallableDeclaration[] = [];
    const assignments: ParsedAssignment[] = [];
    const scopes: ParsedScope[] = [];
    const variableReferences: ParsedVariableReference[] = [];
    const returns: ParsedReturnStatement[] = [];
    const narrowings: ParsedTypeNarrowing[] = [];
    const properties: ParsedPropertyDeclaration[] = [];
    const constants: ParsedConstantDeclaration[] = [];
    const imports: ParsedImport[] = [];
    const typeReferences: ParsedTypeReference[] = [];
    const memberAccesses: ParsedMemberAccess[] = [];
    const calls: ParsedCall[] = [];
    const conditionalCalls: Array<{ start: number; end: number; whenTrue?: SourceRange; whenFalse?: SourceRange }> = [];
    const shortCircuitCalls: Array<{ start: number; end: number; when: 'true' | 'false'; range: SourceRange }> = [];
    const guardContinuationCalls: Array<{ start: number; end: number; when: 'true' | 'false'; range: SourceRange; inspectionEnd: number }> = [];
    const errors: SourceRange[] = [];
    const commentRanges: SourceRange[] = [];
    const stringRanges: SourceRange[] = [];
    const namespaceDefinitions: Array<{ name: string; start: number; end: number; braced: boolean }> = [];
    const typeReferenceKeys = new Set<string>();
    const addTypeReference = (node: SyntaxNode | undefined, context: ParsedTypeReference['context']): void => {
      if (!node || (!['name', 'qualified_name'].includes(node.type) && !(context === 'static-receiver' && node.type === 'relative_scope'))) return;
      const range = nodeRange(source, node); const key = `${range.start}:${range.end}`;
      if (typeReferenceKeys.has(key)) return;
      typeReferenceKeys.add(key); typeReferences.push({ ...range, context });
    };

    walk(tree.rootNode, (node) => {
      if (node.type === 'named_type') addTypeReference(node.namedChildren[0], 'native-type');
      if (node.type === 'base_clause' || node.type === 'class_interface_clause') {
        for (const child of node.namedChildren) addTypeReference(child, 'inheritance');
      }
      if (node.type === 'use_declaration') for (const child of node.namedChildren) addTypeReference(child, 'trait');
      if (node.type === 'attribute') addTypeReference(node.childForFieldName('name') ?? node.namedChildren[0], 'attribute');
      if (node.type === 'binary_expression') {
        const left = node.childForFieldName('left') ?? node.namedChildren[0];
        const right = node.childForFieldName('right') ?? node.namedChildren.at(-1);
        if (left && right && /^\s*instanceof\s*$/iu.test(source.slice(left.endIndex, right.startIndex))) addTypeReference(right, 'instanceof');
      }
      if (['scoped_call_expression', 'scoped_property_access_expression', 'class_constant_access_expression'].includes(node.type)) {
        addTypeReference(node.childForFieldName('scope') ?? node.namedChildren[0], 'static-receiver');
      }
      if (node.type !== 'namespace_definition') return;
      const body = node.childForFieldName('body');
      namespaceDefinitions.push({
        name: node.childForFieldName('name')?.text.replace(/^\\+|\\+$/g, '') ?? '',
        start: body?.startIndex ?? node.endIndex,
        end: body?.endIndex ?? source.length,
        braced: Boolean(body),
      });
    });
    namespaceDefinitions.sort((left, right) => left.start - right.start);
    for (let index = 0; index < namespaceDefinitions.length; index += 1) {
      const current = namespaceDefinitions[index]!;
      if (!current.braced) current.end = namespaceDefinitions[index + 1]?.start ?? source.length;
    }
    const namespaceAt = (offset: number): string => {
      const braced = namespaceDefinitions.find((item) => item.braced && offset >= item.start && offset <= item.end);
      if (braced) return braced.name;
      return [...namespaceDefinitions].reverse().find((item) => !item.braced && offset >= item.start && offset < item.end)?.name ?? '';
    };
    const unwrapCondition = (input: SyntaxNode): { node: SyntaxNode; negated: boolean } => {
      let node = input; let negated = false;
      while (node.type === 'parenthesized_expression' && node.namedChildren.length === 1) node = node.namedChildren[0]!;
      if (node.type === 'unary_op_expression') {
        const argument = node.childForFieldName('argument') ?? node.namedChildren[0];
        if (argument && node.text.slice(0, argument.startIndex - node.startIndex).trim() === '!') {
          node = argument; negated = true;
          while (node.type === 'parenthesized_expression' && node.namedChildren.length === 1) node = node.namedChildren[0]!;
        }
      }
      return { node, negated };
    };
    const binaryOperator = (node: SyntaxNode): string | undefined => {
      if (node.type !== 'binary_expression') return undefined;
      const left = node.childForFieldName('left'); const right = node.childForFieldName('right');
      return left && right ? node.text.slice(left.endIndex - node.startIndex, right.startIndex - node.startIndex).trim().toLowerCase() : undefined;
    };
    const literalArrayKey = (candidate: SyntaxNode | undefined): string | undefined => {
      if (!candidate) return undefined;
      const stringKey = /^(?:'([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)'|"([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)")$/.exec(candidate.text);
      return stringKey ? stringKey[1] ?? stringKey[2]! : /^-?(?:0|[1-9][0-9]*)$/.test(candidate.text) ? candidate.text : undefined;
    };
    const staticAssertDescription = (candidate: SyntaxNode | undefined): boolean => {
      if (!candidate) return false;
      let value = candidate;
      while (value.type === 'parenthesized_expression' && value.namedChildren.length === 1) value = value.namedChildren[0]!;
      const text = value.text.trim();
      return /^null$/i.test(text)
        || /^'(?:[^'\\\\]|\\\\['\\\\])*'$/.test(text)
        || /^"(?:[^"$\\\\]|\\\\.)*"$/.test(text);
    };
    const directPropertySubject = (candidate: SyntaxNode | undefined): { variable: string; propertyPath?: string[]; arrayPath?: string[] } | undefined => {
      if (candidate?.type === 'variable_name') return { variable: candidate.text };
      if (candidate?.type === 'subscript_expression') {
        const arrayPath: string[] = []; let current: SyntaxNode | undefined = candidate;
        while (current?.type === 'subscript_expression' && arrayPath.length < 16) {
          const collection: SyntaxNode | undefined = current.namedChildren[0]; const key = current.namedChildren[1];
          if (!collection || !key) return undefined;
          const normalized = literalArrayKey(key);
          if (normalized === undefined) return undefined;
          arrayPath.unshift(normalized); current = collection;
        }
        return current?.type === 'variable_name' && arrayPath.length && current !== candidate
          ? { variable: current.text, arrayPath } : undefined;
      }
      const propertyPath: string[] = []; let current = candidate;
      while (current?.type === 'member_access_expression') {
        const name = current.childForFieldName('name'); const object = current.childForFieldName('object');
        if (name?.type !== 'name' || !object) return undefined;
        propertyPath.unshift(name.text); current = object;
      }
      return current?.type === 'variable_name' && propertyPath.length ? { variable: current.text, propertyPath } : undefined;
    };
    const predicateConditionFacts = (input: SyntaxNode, truthy: boolean, scopeId: string, start: number, end: number,
      inspectionEnd = input.endIndex): ParsedTypeNarrowing[] => {
      const unwrapped = unwrapCondition(input); const node = unwrapped.node;
      const effectiveTruthy = unwrapped.negated ? !truthy : truthy;
      const factRange = { scopeId, start, end, inspectionStart: Math.min(start, node.endIndex), inspectionEnd: Math.min(start, inspectionEnd) };
      if (node.type === 'function_call_expression') {
        const functionNode = node.childForFieldName('function') ?? node.childForFieldName('name') ?? node.namedChildren[0];
        const argumentsNode = node.childForFieldName('arguments') ?? node.namedChildren.find((child) => child.type === 'arguments');
        const arguments_ = argumentsNode?.namedChildren.filter((child) => child.type === 'argument') ?? [];
        const value = arguments_[0]?.namedChildren.at(-1);
        const predicateTypes: Record<string, string> = {
          is_null: 'null', is_bool: 'bool', is_int: 'int', is_integer: 'int', is_long: 'int',
          is_float: 'float', is_double: 'float', is_real: 'float', is_string: 'string', is_array: 'array',
          is_object: 'object', is_resource: 'resource', is_scalar: 'bool|int|float|string',
          is_numeric: 'int|float|string', is_callable: 'callable', is_iterable: 'iterable', is_countable: '\\Countable|array',
        };
        const functionName = functionNode?.text ?? '';
        const builtinName = functionName.replace(/^\\+/, '').toLowerCase();
        const argumentValue = (position: number, name: string): SyntaxNode | undefined => {
          const named = arguments_.find((argument) => argument.childForFieldName('name')?.text.toLowerCase() === name);
          if (named) return named.namedChildren.at(-1);
          return arguments_.filter((argument) => !argument.childForFieldName('name'))[position]?.namedChildren.at(-1);
        };
        if (builtinName === 'is_a') {
          const subject = directPropertySubject(argumentValue(0, 'object_or_class'));
          const classExpression = argumentValue(1, 'class')?.text ?? '';
          const typeName = /^([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*::\s*class$/iu.exec(classExpression)?.[1];
          const allowString = argumentValue(2, 'allow_string')?.text.toLowerCase();
          if (subject && typeName && (allowString === undefined || allowString === 'false')) {
            return [{ kind: 'type-predicate', ...subject, functionName, typeName, negated: !effectiveTruthy, ...factRange }];
          }
        }
        if (builtinName === 'is_subclass_of') {
          const subject = directPropertySubject(argumentValue(0, 'object_or_class'));
          const classExpression = argumentValue(1, 'class')?.text ?? '';
          const typeName = /^([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*::\s*class$/iu.exec(classExpression)?.[1];
          const allowString = argumentValue(2, 'allow_string')?.text.toLowerCase();
          if (subject && typeName && allowString === 'false') {
            return [{ kind: 'subclass-predicate', ...subject, functionName, typeName, negated: !effectiveTruthy, ...factRange }];
          }
        }
        if (builtinName === 'is_callable') {
          const subject = directPropertySubject(argumentValue(0, 'value'));
          const syntaxOnly = argumentValue(1, 'syntax_only')?.text.toLowerCase();
          if (subject && (syntaxOnly === undefined || syntaxOnly === 'false')) {
            return [{ kind: 'type-predicate', ...subject, functionName, typeName: 'callable',
              negated: !effectiveTruthy, ...factRange }];
          }
        }
        if ((builtinName === 'array_key_exists' || builtinName === 'key_exists') && effectiveTruthy && arguments_.length === 2) {
          const key = literalArrayKey(arguments_[0]?.namedChildren.at(-1));
          const collection = directPropertySubject(arguments_[1]?.namedChildren.at(-1));
          if (key !== undefined && collection && !collection.propertyPath?.length) {
            return [{ kind: 'array-key-exists', variable: collection.variable,
              arrayPath: [...(collection.arrayPath ?? []), key], functionName, ...factRange }];
          }
        }
        if (functionName.toLowerCase() === 'isset' && effectiveTruthy && arguments_.length > 0 && arguments_.length <= 64) {
          return arguments_.flatMap((argument): ParsedTypeNarrowing[] => {
            const subject = directPropertySubject(argument.namedChildren.at(-1));
            return subject ? [{ kind: 'non-null', ...subject, ...factRange }] : [];
          });
        }
        if (functionName.toLowerCase() === 'empty' && !effectiveTruthy && arguments_.length === 1) {
          const subject = directPropertySubject(value);
          return subject ? [{ kind: 'non-null', ...subject, ...factRange }] : [];
        }
        const typeName = builtinName === 'is_callable' ? undefined
          : builtinName === 'is_numeric' && !effectiveTruthy ? 'int|float' : predicateTypes[builtinName];
        const subject = directPropertySubject(value);
        if (typeName && arguments_.length === 1 && subject) {
          return [{ kind: 'type-predicate', ...subject, functionName, typeName, negated: !effectiveTruthy, ...factRange }];
        }
      }
      const left = node.childForFieldName('left'); const right = node.childForFieldName('right');
      const operator = binaryOperator(node);
      if (left && right && ((effectiveTruthy && operator === '&&') || (!effectiveTruthy && operator === '||'))) {
        return [...predicateConditionFacts(left, effectiveTruthy, scopeId, start, end, inspectionEnd),
          ...predicateConditionFacts(right, effectiveTruthy, scopeId, start, end, inspectionEnd)];
      }
      const nullSubject = right?.text.toLowerCase() === 'null' ? directPropertySubject(left ?? undefined)
        : left?.text.toLowerCase() === 'null' ? directPropertySubject(right ?? undefined) : undefined;
      const provesNonNull = effectiveTruthy ? operator === '!==' || operator === '!=' : operator === '===' || operator === '==';
      if (nullSubject && provesNonNull) return [{ kind: 'non-null', ...nullSubject, ...factRange }];
      const booleanText = ['true', 'false'].includes(right?.text.toLowerCase() ?? '') ? right!.text.toLowerCase()
        : ['true', 'false'].includes(left?.text.toLowerCase() ?? '') ? left!.text.toLowerCase() : undefined;
      const booleanSubject = booleanText === right?.text.toLowerCase() ? directPropertySubject(left ?? undefined)
        : booleanText ? directPropertySubject(right ?? undefined) : undefined;
      if (booleanSubject && booleanText && (operator === '===' || operator === '!==')) {
        const equals = effectiveTruthy ? operator === '===' : operator === '!==';
        return [{ kind: 'boolean-literal', ...booleanSubject, value: booleanText === 'true', negated: !equals, ...factRange }];
      }
      const truthySubject = effectiveTruthy ? directPropertySubject(node) : undefined;
      if (truthySubject) return [{ kind: 'non-null', ...truthySubject, ...factRange }];
      return [];
    };
    const positiveConditionFacts = (input: SyntaxNode, scopeId: string, start: number, end: number): ParsedTypeNarrowing[] => {
      const { node, negated } = unwrapCondition(input);
      const left = node.childForFieldName('left'); const right = node.childForFieldName('right');
      const operator = binaryOperator(node);
      if (!negated && operator === '&&' && left && right) {
        return [...positiveConditionFacts(left, scopeId, start, end), ...positiveConditionFacts(right, scopeId, start, end)];
      }
      if (!left || !right || !operator) return [];
      const instanceSubject = directPropertySubject(left);
      if (instanceSubject && operator === 'instanceof') {
        return [{ kind: negated ? 'not-instanceof' : 'instanceof', ...instanceSubject, typeName: right.text, scopeId, start, end }];
      }
      return [];
    };
    const conditionalCallFacts = (input: SyntaxNode, whenTrue?: SourceRange, whenFalse?: SourceRange,
      sink = conditionalCalls): void => {
      const { node, negated } = unwrapCondition(input);
      if (negated) { conditionalCallFacts(node, whenFalse, whenTrue, sink); return; }
      if (['function_call_expression', 'member_call_expression', 'nullsafe_member_call_expression', 'scoped_call_expression'].includes(node.type)) {
        sink.push({ start: node.startIndex, end: node.endIndex, whenTrue, whenFalse });
        return;
      }
      const left = node.childForFieldName('left'); const right = node.childForFieldName('right');
      const operator = binaryOperator(node);
      if (!left || !right) return;
      if (operator === '&&') {
        // A true conjunction proves every operand true. A false conjunction
        // does not identify which operand failed.
        if (whenTrue) {
          conditionalCallFacts(left, whenTrue, undefined, sink);
          conditionalCallFacts(right, whenTrue, undefined, sink);
        }
      } else if (operator === '||') {
        // A false disjunction proves every operand false. A true disjunction
        // does not identify which operand succeeded.
        if (whenFalse) {
          conditionalCallFacts(left, undefined, whenFalse, sink);
          conditionalCallFacts(right, undefined, whenFalse, sink);
        }
      }
    };
    const shortCircuitCallFacts = (input: SyntaxNode): void => {
      const { node } = unwrapCondition(input);
      const left = node.childForFieldName('left'); const right = node.childForFieldName('right');
      const operator = binaryOperator(node);
      if (!left || !right || (operator !== '&&' && operator !== '||')) return;
      const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end)
        .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
      const impliedPredicateFacts = (candidate: SyntaxNode, truthy: boolean, end: number, inspectionEnd: number): ParsedTypeNarrowing[] => {
        const unwrapped = unwrapCondition(candidate); const nested = unwrapped.node;
        const effectiveTruthy = unwrapped.negated ? !truthy : truthy;
        const nestedLeft = nested.childForFieldName('left'); const nestedRight = nested.childForFieldName('right');
        const nestedOperator = binaryOperator(nested);
        if (nestedLeft && nestedRight && ((effectiveTruthy && nestedOperator === '&&') || (!effectiveTruthy && nestedOperator === '||'))) {
          return [...impliedPredicateFacts(nestedLeft, effectiveTruthy, end, inspectionEnd),
            ...impliedPredicateFacts(nestedRight, effectiveTruthy, end, inspectionEnd)];
        }
        return scope ? predicateConditionFacts(candidate, truthy, scope.id, candidate.endIndex, end, inspectionEnd)
          .filter((fact) => fact.kind === 'boolean-literal') : [];
      };
      narrowings.push(...impliedPredicateFacts(left, operator === '&&', right.endIndex, left.endIndex));
      const facts: typeof conditionalCalls = [];
      const rightRange = nodeRange(source, right);
      conditionalCallFacts(left, operator === '&&' ? rightRange : undefined, operator === '||' ? rightRange : undefined, facts);
      for (const fact of facts) {
        if (fact.whenTrue) shortCircuitCalls.push({ start: fact.start, end: fact.end, when: 'true', range: fact.whenTrue });
        if (fact.whenFalse) shortCircuitCalls.push({ start: fact.start, end: fact.end, when: 'false', range: fact.whenFalse });
      }
      shortCircuitCallFacts(left);
      shortCircuitCallFacts(right);
    };
    const namespace = namespaceDefinitions[0]?.name ?? '';
    const anonymousFqcn = (node: SyntaxNode): string => {
      const name = `@anonymous:${encodeURIComponent(documentIdentity || 'document')}:${node.startIndex}`;
      return [namespaceAt(node.startIndex), name].filter(Boolean).join('\\');
    };

    const containingType = (node: SyntaxNode): ParsedDeclaration | undefined => {
      let current = node.parent;
      while (current) {
        if (DECLARATION_TYPES[current.type] || current.type === 'anonymous_class') {
          if (current.type === 'anonymous_class') return declarations.find((item) => item.anonymous && item.declarationStart === current!.startIndex);
          const name = current.childForFieldName('name')?.text;
          if (!name) return undefined;
          const fqcn = [namespaceAt(current.startIndex), name].filter(Boolean).join('\\');
          return declarations.find((item) => item.fqcn === fqcn);
        }
        current = current.parent;
      }
      return undefined;
    };

    const dynamicMemberName = (node: SyntaxNode): { kind: 'literal' | 'variable' | 'expression' | 'constant'; name: string; range: SourceRange } | undefined => {
      if (node.type === 'name' && node.namedChildren.length === 1) return dynamicMemberName(node.namedChildren[0]!);
      if (node.type === 'variable_name') return { kind: 'variable', name: node.text, range: nodeRange(source, node) };
      if (node.type === 'parenthesized_expression' && node.namedChildren.length === 1) return dynamicMemberName(node.namedChildren[0]!);
      if (['string', 'encapsed_string'].includes(node.type)) {
        const literal = /^(['"])([^'"\\]*)\1$/.exec(node.text); if (!literal?.[2]) return undefined;
        const content = node.namedChildren.length === 1 && node.namedChildren[0]?.type === 'string_content' ? node.namedChildren[0] : undefined;
        return content ? { kind: 'literal', name: literal[2], range: nodeRange(source, content) } : undefined;
      }
      if (node.type === 'name' || node.type === 'qualified_name' || node.type === 'class_constant_access_expression') {
        return { kind: 'constant', name: node.text, range: nodeRange(source, node) };
      }
      if (node.type === 'member_access_expression') {
        const object = node.childForFieldName('object'); const member = node.childForFieldName('name');
        if (object?.type === 'class_constant_access_expression' && member?.type === 'name' && ['name', 'value'].includes(member.text)) {
          return { kind: 'constant', name: node.text, range: nodeRange(source, node) };
        }
      }
      if (node.type !== 'binary_expression') return undefined;
      const leftNode = node.childForFieldName('left'); const rightNode = node.childForFieldName('right');
      if (!leftNode || !rightNode || !/^\s*\.\s*$/.test(source.slice(leftNode.endIndex, rightNode.startIndex))) return undefined;
      const left = dynamicMemberName(leftNode); const right = dynamicMemberName(rightNode);
      if (!left || !right || !['literal', 'expression'].includes(left.kind) || !['literal', 'expression'].includes(right.kind)) return undefined;
      return { kind: 'expression', name: left.name + right.name, range: { start: left.range.start, end: right.range.end } };
    };

    const parametersOf = (node: SyntaxNode): ParsedParameter[] => {
      const parameters = node.childForFieldName('parameters');
      if (!parameters) return [];
      return parameters.namedChildren.flatMap((parameter): ParsedParameter[] => {
        const nameNode = parameter.childForFieldName('name');
        if (!nameNode) return [];
        const range = nodeRange(source, nameNode);
        return [{
          ...range,
          name: nameNode.text.replace(/^\$/, ''),
          type: parameter.childForFieldName('type')?.text,
          nativeType: parameter.childForFieldName('type')?.text,
          defaultValue: parameter.childForFieldName('default_value')?.text,
          promoted: parameter.type === 'property_promotion_parameter',
          variadic: parameter.type === 'variadic_parameter',
          byReference: parameter.namedChildren.some((child) => child.type === 'reference_modifier'),
        }];
      });
    };

    walk(tree.rootNode, (node) => {
      if (node.type === 'comment') commentRanges.push(nodeRange(source, node));
      if (STRING_TYPES.has(node.type)) stringRanges.push(nodeRange(source, node));
      if (node.isError || node.isMissing) errors.push(nodeRange(source, node));
      if (node.type === 'variable_name' && node.parent?.type !== 'scoped_property_access_expression') {
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end)
          .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        if (scope) variableReferences.push({ ...nodeRange(source, node), variable: node.text, scopeId: scope.id });
      }
      if (node.type === 'conditional_expression') {
        const condition = node.childForFieldName('condition');
        const body = node.childForFieldName('body');
        const alternative = node.childForFieldName('alternative');
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end)
          .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        if (condition && body && alternative && scope) {
          narrowings.push(...predicateConditionFacts(condition, true, scope.id, body.startIndex, body.endIndex));
          narrowings.push(...predicateConditionFacts(condition, false, scope.id, alternative.startIndex, alternative.endIndex));
        }
      }
      if (node.type === 'return_statement') {
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end)
          .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        const expression = node.namedChildren[0];
        if (scope) returns.push({ ...nodeRange(source, node), scopeId: scope.id,
          expressionStart: expression ? nodeRange(source, expression).start : undefined,
          expressionEnd: expression ? nodeRange(source, expression).end : undefined });
      }
      const memberKinds: Record<string, ParsedMemberAccess['kind']> = {
        member_call_expression: 'method', nullsafe_member_call_expression: 'method', scoped_call_expression: 'method',
        member_access_expression: 'property', nullsafe_member_access_expression: 'property', scoped_property_access_expression: 'property',
        class_constant_access_expression: 'constant',
      };
      const memberKind = memberKinds[node.type];
      if (memberKind) {
        const explicitCandidate = node.childForFieldName('name');
        const candidate = explicitCandidate ?? node.namedChildren.at(-1);
        const receiverCandidate = node.childForFieldName('object') ?? node.childForFieldName('scope')
          ?? ((node.type.startsWith('scoped_') || node.type === 'class_constant_access_expression') ? node.namedChildren[0] : undefined);
        const braced = Boolean(candidate && receiverCandidate && /\{\s*$/.test(source.slice(receiverCandidate.endIndex, candidate.startIndex)));
        const valid = candidate && !braced && ((candidate.type === 'name' && candidate.namedChildren.length === 0)
          || (node.type === 'scoped_property_access_expression' && candidate.type === 'variable_name'));
        if (valid) {
          const memberRange = nodeRange(source, candidate!);
          memberAccesses.push({ ...memberRange, name: candidate!.text.replace(/^\$/, ''), kind: memberKind, static: node.type.startsWith('scoped_') || node.type === 'class_constant_access_expression' });
        } else if (candidate) {
          const dynamicName = dynamicMemberName(candidate);
          const object = node.childForFieldName('object'); const scope = node.childForFieldName('scope');
          if (object && candidate.startIndex === object.startIndex && candidate.endIndex === object.endIndex) return;
          const receiverNode = object ?? scope ?? receiverCandidate;
          if (candidate.type === 'variable_name' && receiverNode?.type === 'variable_name' && candidate.text === receiverNode.text) return;
          if (receiverNode && !/^\s*(?:\?->|->|::)\s*\{?\s*$/.test(source.slice(receiverNode.endIndex, candidate.startIndex))) return;
          const receiver = receiverNode?.type === 'variable_name'
            ? { kind: 'variable' as const, name: receiverNode.text, nullsafe: node.type.startsWith('nullsafe_') }
            : receiverNode && ['name', 'qualified_name'].includes(receiverNode.type)
              ? { kind: 'type' as const, name: receiverNode.text, nullsafe: false } : undefined;
          if (receiver) {
            memberAccesses.push({ ...(dynamicName?.range ?? nodeRange(source, candidate)), name: dynamicName?.name ?? candidate.text, kind: memberKind,
              static: node.type.startsWith('scoped_') || node.type === 'class_constant_access_expression', dynamic: dynamicName?.kind ?? 'unknown', receiver });
          }
        }
      }
      const callTypes = new Set(['function_call_expression', 'member_call_expression', 'nullsafe_member_call_expression', 'scoped_call_expression', 'object_creation_expression']);
      if (callTypes.has(node.type)) {
        const argumentsNode = node.childForFieldName('arguments') ?? node.namedChildren.find((child) => child.type === 'arguments');
        const nameNode = node.childForFieldName('name') ?? (node.type === 'function_call_expression'
          ? node.childForFieldName('function') ?? node.namedChildren.find((child) => child.type === 'name' || child.type === 'qualified_name'
            || child.type === 'relative_name' || child.type === 'variable_name')
          : node.type === 'object_creation_expression'
            ? node.namedChildren.find((child) => child.type === 'name' || child.type === 'qualified_name' || child.type === 'relative_name') : undefined);
        const callReceiverNode = node.childForFieldName('object') ?? node.childForFieldName('scope');
        const bracedCallName = Boolean(nameNode && callReceiverNode && /\{\s*$/.test(source.slice(callReceiverNode.endIndex, nameNode.startIndex)));
        const preciseDynamicName = nameNode && bracedCallName ? dynamicMemberName(nameNode) : undefined;
        if (argumentsNode && nameNode && (nameNode.type === 'name' || nameNode.type === 'qualified_name' || nameNode.type === 'relative_name'
          || (node.type === 'function_call_expression' && nameNode.type === 'variable_name') || preciseDynamicName)) {
          const arguments_ = argumentsNode.namedChildren.filter((child) => child.type === 'argument');
          const firstClassCallable = argumentsNode.namedChildren.some((child) => child.type === 'variadic_placeholder');
          const nestedCall = (candidate: SyntaxNode): boolean => candidate.namedChildren.some((child) => callTypes.has(child.type) || nestedCall(child));
          const nameRange = preciseDynamicName?.range ?? nodeRange(source, nameNode); const argumentsRange = nodeRange(source, argumentsNode);
          const receiverNode = node.type === 'member_call_expression' || node.type === 'nullsafe_member_call_expression'
            ? node.childForFieldName('object') ?? node.namedChildren[0] : undefined;
          const guaranteedExpression = (): SourceRange | undefined => {
            if (node.type === 'nullsafe_member_call_expression') return undefined;
            const inside = (candidate: SyntaxNode | null | undefined, container: SyntaxNode | null | undefined): boolean => Boolean(candidate && container
              && candidate.startIndex >= container.startIndex && candidate.endIndex <= container.endIndex);
            let current: SyntaxNode = node;
            while (current.parent && current.parent.type !== 'expression_statement') {
              const parent = current.parent;
              if (parent.type === 'binary_expression') {
                const right = parent.childForFieldName('right') ?? parent.namedChildren.at(-1);
                const operator = binaryOperator(parent);
                if (right && inside(current, right) && ['&&', '||', 'and', 'or', '??'].includes(operator ?? '')) return undefined;
              }
              if (parent.type === 'augmented_assignment_expression') {
                const left = parent.childForFieldName('left') ?? parent.namedChildren[0];
                const right = parent.childForFieldName('right') ?? parent.namedChildren.at(-1);
                if (left && right && inside(current, right) && source.slice(left.endIndex, right.startIndex).includes('??=')) return undefined;
              }
              if (parent.type === 'conditional_expression' || parent.type === 'match_expression') {
                const condition = parent.childForFieldName('condition') ?? parent.namedChildren[0];
                if (!inside(current, condition)) return undefined;
              }
              if (parent.type === 'nullsafe_member_call_expression' || parent.type === 'nullsafe_member_access_expression') {
                const object = parent.childForFieldName('object') ?? parent.namedChildren[0];
                if (!inside(current, object)) return undefined;
              }
              if (['if_statement', 'while_statement', 'switch_statement'].includes(parent.type)) {
                const condition = parent.childForFieldName('condition');
                if (inside(current, condition)) return condition ? nodeRange(source, condition) : undefined;
              }
              if (parent.type === 'for_statement') {
                const initialize = parent.childForFieldName('initialize');
                const condition = parent.childForFieldName('condition');
                if (inside(current, initialize)) return initialize ? nodeRange(source, initialize) : undefined;
                if (inside(current, condition)) return condition ? nodeRange(source, condition) : undefined;
                return undefined;
              }
              if (parent.type === 'foreach_statement') {
                const iterable = parent.namedChildren[0];
                return inside(current, iterable) && iterable ? nodeRange(source, iterable) : undefined;
              }
              if (parent.type === 'do_statement') return undefined;
              current = parent;
            }
            const statement = current.parent;
            const expression = statement?.type === 'expression_statement' ? statement.namedChildren[0] : undefined;
            return expression ? nodeRange(source, expression) : undefined;
          };
          const expressionStatement = node.parent?.type === 'expression_statement' ? node.parent : undefined;
          const directExpressionStatement = Boolean(expressionStatement
            && expressionStatement.namedChildren[0]?.startIndex === node.startIndex
            && expressionStatement.namedChildren[0]?.endIndex === node.endIndex);
          const statementSiblings = expressionStatement?.parent?.namedChildren ?? [];
          const statementIndex = expressionStatement ? statementSiblings.findIndex((candidate) => candidate.id === expressionStatement.id) : -1;
          const previousStatement = statementIndex > 0 ? statementSiblings[statementIndex - 1] : undefined;
          const voidCastPrefix = directExpressionStatement && previousStatement?.type === 'expression_statement'
            && /^\(\s*void\s*\)$/i.test(previousStatement.text)
            && source.slice(previousStatement.endIndex, node.startIndex).trim() === ''
            ? nodeRange(source, previousStatement) : undefined;
          let forClauseRoot: SyntaxNode = node;
          while (forClauseRoot.parent && forClauseRoot.parent.type !== 'for_statement'
            && forClauseRoot.parent.type !== 'expression_statement') forClauseRoot = forClauseRoot.parent;
          const forStatement = forClauseRoot.parent?.type === 'for_statement' ? forClauseRoot.parent : undefined;
          const forInitialize = forStatement?.childForFieldName('initialize');
          const forUpdate = forStatement?.childForFieldName('update');
          const discardedForClause = Boolean(forStatement
            && (forClauseRoot.id === forInitialize?.id || forClauseRoot.id === forUpdate?.id)
            && (forClauseRoot.id === node.id || (forClauseRoot.type === 'sequence_expression' && node.parent?.id === forClauseRoot.id)));
          const expressionSiblings = node.parent?.namedChildren ?? [];
          const expressionIndex = expressionSiblings.findIndex((candidate) => candidate.id === node.id);
          const inlinePrevious = expressionIndex > 0 ? expressionSiblings[expressionIndex - 1] : undefined;
          const inlineVoidCastPrefix = inlinePrevious?.type === 'ERROR' && /^\(\s*void\s*\)$/i.test(inlinePrevious.text)
            && source.slice(inlinePrevious.endIndex, node.startIndex).trim() === ''
            ? nodeRange(source, inlinePrevious) : undefined;
          calls.push({
            ...nodeRange(source, node), nameStart: nameRange.start, nameEnd: nameRange.end,
            kind: node.type === 'function_call_expression' ? (nameNode.type === 'variable_name' ? undefined : 'function')
              : node.type === 'object_creation_expression' ? 'constructor'
                : node.type === 'scoped_call_expression' ? 'static-method' : 'method',
            argumentsStart: argumentsRange.start, argumentsEnd: argumentsRange.end,
            firstClassCallable,
            arguments: arguments_.map((argument) => {
              const argumentName = argument.childForFieldName('name');
              const argumentNameRange = argumentName ? nodeRange(source, argumentName) : undefined;
              return {
                ...nodeRange(source, argument),
                name: argumentName?.text,
                nameStart: argumentNameRange?.start,
                nameEnd: argumentNameRange?.end,
                unpacked: argument.text.trimStart().startsWith('...'),
              };
            }),
            flat: arguments_.every((argument) => !nestedCall(argument)),
            standalone: node.parent?.type === 'expression_statement' && node.parent.parent?.type === 'compound_statement'
              && node.parent.namedChildren[0]?.startIndex === node.startIndex && node.parent.namedChildren[0]?.endIndex === node.endIndex,
            resultDiscarded: (directExpressionStatement || discardedForClause) && !voidCastPrefix && !inlineVoidCastPrefix,
            intentionalVoidCast: voidCastPrefix ?? inlineVoidCastPrefix,
            terminatingExpression: guaranteedExpression(),
            receiver: receiverNode?.type === 'variable_name'
              ? { variable: receiverNode.text, nullsafe: node.type === 'nullsafe_member_call_expression' } : undefined,
          });
          const statement = expressionStatement;
          const block = statement?.parent?.type === 'compound_statement' ? statement.parent : undefined;
          const builtinName = node.type === 'function_call_expression' ? nameNode.text.replace(/^\\+/, '').toLowerCase() : '';
          if (builtinName === 'assert' && statement && block
            && statement.namedChildren[0]?.startIndex === node.startIndex && statement.namedChildren[0]?.endIndex === node.endIndex
            && arguments_.length >= 1 && arguments_.length <= 2
            && arguments_.every((argument) => !argument.text.trimStart().startsWith('...'))) {
            let assertion: SyntaxNode | undefined; let description: SyntaxNode | undefined;
            let namedSeen = false; let validArguments = true; let positional = 0;
            for (const argument of arguments_) {
              const value = argument.namedChildren.at(-1); const argumentName = argument.childForFieldName('name')?.text.toLowerCase();
              if (argumentName) {
                namedSeen = true;
                if (argumentName === 'assertion' && !assertion) assertion = value;
                else if (argumentName === 'description' && !description) description = value;
                else validArguments = false;
              } else if (namedSeen) validArguments = false;
              else if (positional === 0) assertion = value;
              else if (positional === 1) description = value;
              else validArguments = false;
              positional += 1;
            }
            const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end)
              .sort((left, right) => left.end - left.start - (right.end - right.start))[0];
            if (validArguments && assertion && (!description || staticAssertDescription(description)) && scope) {
              const start = statement.endIndex; const end = Math.max(start, block.endIndex - 1);
              const facts = [...predicateConditionFacts(assertion, true, scope.id, start, end),
                ...positiveConditionFacts(assertion, scope.id, start, end)];
              narrowings.push(...facts.map((fact) => ({ ...fact, assertion: true as const })));
            }
          }
        }
      }
      const kind = DECLARATION_TYPES[node.type];
      if (kind) {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const range = nodeRange(source, nameNode);
          const declarationNamespace = namespaceAt(node.startIndex);
          declarations.push({
            ...range,
            name: nameNode.text,
            fqcn: declarationNamespace ? `${declarationNamespace}\\${nameNode.text}` : nameNode.text,
            kind,
            anonymous: false,
            declarationStart: node.startIndex,
            declarationEnd: node.endIndex,
            extendsNames: node.namedChildren.find((child) => child.type === 'base_clause')?.namedChildren.map((child) => child.text) ?? [],
            implementsNames: node.namedChildren.find((child) => child.type === 'class_interface_clause')?.namedChildren.map((child) => child.text) ?? [],
            traitNames: node.childForFieldName('body')?.namedChildren.filter((child) => child.type === 'use_declaration').flatMap((child) => child.namedChildren.filter((name) => name.type === 'name' || name.type === 'qualified_name').map((name) => name.text)) ?? [],
            traitAdaptations: node.childForFieldName('body')?.namedChildren.filter((child) => child.type === 'use_declaration').flatMap(traitAdaptations) ?? [],
            readonlyClass: kind === 'class' && node.namedChildren.some((child) => child.type === 'readonly_modifier'),
            enumBackingType: kind === 'enum' ? node.namedChildren.find((child) => child.type === 'primitive_type')?.text as 'int' | 'string' | undefined : undefined,
          });
        }
      } else if (node.type === 'anonymous_class') {
        const fqcn = anonymousFqcn(node); const name = fqcn.split('\\').at(-1)!;
        declarations.push({
          ...nodeRange(source, node), name, fqcn, kind: 'class', anonymous: true,
          declarationStart: node.startIndex, declarationEnd: node.endIndex,
          extendsNames: node.namedChildren.find((child) => child.type === 'base_clause')?.namedChildren.map((child) => child.text) ?? [],
          implementsNames: node.namedChildren.find((child) => child.type === 'class_interface_clause')?.namedChildren.map((child) => child.text) ?? [],
          traitNames: node.childForFieldName('body')?.namedChildren.filter((child) => child.type === 'use_declaration').flatMap((child) => child.namedChildren.filter((name) => name.type === 'name' || name.type === 'qualified_name').map((name) => name.text)) ?? [],
          traitAdaptations: node.childForFieldName('body')?.namedChildren.filter((child) => child.type === 'use_declaration').flatMap(traitAdaptations) ?? [],
          readonlyClass: false,
        });
      }
      if (node.type === 'namespace_use_declaration') {
        const range = nodeRange(source, node);
        imports.push(...parseUseClause(source.slice(range.start, range.end), range.start, namespaceAt(node.startIndex)));
      }
      if (node.type === 'function_definition' || node.type === 'method_declaration') {
        const nameNode = node.childForFieldName('name');
        if (!nameNode) return;
        const owner = node.type === 'method_declaration' ? containingType(node) : undefined;
        if (node.type === 'method_declaration' && !owner) return;
        const callableNamespace = namespaceAt(node.startIndex);
        const name = nameNode.text;
        const range = nodeRange(source, nameNode);
        callables.push({
          ...range,
          name,
          fqcn: owner ? `${owner.fqcn}::${name}` : [callableNamespace, name].filter(Boolean).join('\\'),
          kind: owner ? 'method' : 'function',
          containerFqcn: owner?.fqcn,
          parameters: parametersOf(node),
          returnType: node.childForFieldName('return_type')?.text,
          nativeReturnType: node.childForFieldName('return_type')?.text,
          declarationStart: node.startIndex,
          declarationEnd: node.endIndex,
          visibility: (node.namedChildren.find((child) => child.type === 'visibility_modifier')?.text as 'public' | 'protected' | 'private' | undefined) ?? 'public',
          static: node.namedChildren.some((child) => child.type === 'static_modifier'),
        });
        scopes.push({ id: owner ? `${owner.fqcn}::${name}` : [callableNamespace, name].filter(Boolean).join('\\'), kind: owner ? 'method' : 'function', containerFqcn: owner?.fqcn, parameters: parametersOf(node), captures: [], start: node.startIndex, end: node.endIndex });
        if (owner) {
          for (const parameter of node.childForFieldName('parameters')?.namedChildren.filter((item) => item.type === 'property_promotion_parameter') ?? []) {
            const nameNode = parameter.childForFieldName('name');
            if (!nameNode) continue;
            const name = nameNode.text.replace(/^\$/, '');
            properties.push({
              ...nodeRange(source, nameNode), name, fqcn: `${owner.fqcn}::$${name}`, containerFqcn: owner.fqcn,
              type: parameter.childForFieldName('type')?.text,
              defaultValue: parameter.childForFieldName('default_value')?.text,
              visibility: (parameter.namedChildren.find((child) => child.type === 'visibility_modifier')?.text as ParsedPropertyDeclaration['visibility'] | undefined) ?? 'public',
              static: false,
              readonly: parameter.namedChildren.some((child) => child.type === 'readonly_modifier') || owner.readonlyClass,
              // tree-sitter-php 0.24 parses PHP 8.5 final promotion as a recoverable
              // ERROR node. Preserve the semantic modifier until the grammar exposes
              // it as final_modifier, while still accepting that future shape.
              final: parameter.namedChildren.some((child) => child.type === 'final_modifier') || /\bfinal\b/i.test(parameter.text),
              abstract: false,
              promoted: true,
              declarationStart: parameter.startIndex,
              declarationEnd: parameter.endIndex,
            });
          }
        }
      }
      if (node.type === 'anonymous_function' || node.type === 'arrow_function') {
        const owner = containingType(node);
        const parent = scopes.filter((item) => node.startIndex > item.start && node.endIndex <= item.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        const useClause = node.namedChildren.find((child) => child.type === 'anonymous_function_use_clause');
        const captures = useClause?.namedChildren.flatMap((capture) => {
          const variable = capture.type === 'variable_name' ? capture : capture.namedChildren.find((child) => child.type === 'variable_name');
          return variable ? [{ variable: variable.text, byReference: capture.type === 'by_ref' }] : [];
        }) ?? [];
        scopes.push({ id: `${node.type === 'arrow_function' ? 'arrow' : 'closure'}@${node.startIndex}`, kind: node.type === 'arrow_function' ? 'arrow' : 'closure', containerFqcn: owner?.fqcn, parameters: parametersOf(node), parentId: parent?.id, captures, start: node.startIndex, end: node.endIndex });
      }
      if (node.type === 'property_declaration') {
        const owner = containingType(node);
        if (!owner) return;
        const visibilityNodes = node.namedChildren.filter((child) => child.type === 'visibility_modifier');
        const visibility = (visibilityNodes.find((child) => !child.text.includes('(set)'))?.text as ParsedPropertyDeclaration['visibility'] | undefined) ?? 'public';
        const writeVisibility = visibilityNodes.find((child) => child.text.includes('(set)'))?.text.replace(/\s*\(set\)\s*/i, '') as ParsedPropertyDeclaration['writeVisibility'] | undefined;
        const type = node.childForFieldName('type')?.text;
        for (const element of node.namedChildren.filter((child) => child.type === 'property_element')) {
          const nameNode = element.childForFieldName('name');
          if (!nameNode) continue;
          const name = nameNode.text.replace(/^\$/, '');
          const staticProperty = node.namedChildren.some((child) => child.type === 'static_modifier');
          const hookList = node.namedChildren.find((child) => child.type === 'property_hook_list');
          const hooks = hookList?.namedChildren.filter((child) => child.type === 'property_hook').flatMap((hook) => {
            const hookName = hook.namedChildren.find((child) => child.type === 'name');
            const rawKind = hookName?.text.toLowerCase();
            if (!hookName || (rawKind !== 'get' && rawKind !== 'set')) return [];
            const kind: 'get' | 'set' = rawKind;
            const body = hook.childForFieldName('body');
            let usesBackingValue = kind === 'set' && Boolean(body)
              && /=>/.test(source.slice(hookName.endIndex, body!.startIndex));
            if (body) walk(body, (candidate) => {
              if (candidate.type !== 'member_access_expression') return;
              const object = candidate.childForFieldName('object'); const member = candidate.childForFieldName('name');
              if (object?.text === '$this' && member?.text === name) usesBackingValue = true;
            });
            const parameter = kind === 'set' ? parametersOf(hook)[0] : undefined;
            const scopeParameter: ParsedParameter | undefined = kind === 'set' ? parameter ?? {
              ...nodeRange(source, hookName), name: 'value', type, nativeType: type,
              promoted: false, variadic: false, byReference: false,
            } : undefined;
            scopes.push({ id: `property-hook@${hook.startIndex}`, kind: 'property-hook', containerFqcn: owner.fqcn,
              parameters: scopeParameter ? [scopeParameter] : [], captures: [], start: hook.startIndex, end: hook.endIndex });
            return [{ ...nodeRange(source, hookName), kind, declarationStart: hook.startIndex, declarationEnd: hook.endIndex,
              bodyStart: body?.startIndex, bodyEnd: body?.endIndex, parameter,
              byReference: hook.namedChildren.some((child) => child.type === 'reference_modifier'),
              final: hook.namedChildren.some((child) => child.type === 'final_modifier'), abstract: !body, usesBackingValue }];
          }) ?? [];
          const virtual = hooks.length > 0 && !hooks.some((hook) => hook.usesBackingValue);
          const hasGet = hooks.some((hook) => hook.kind === 'get'); const hasSet = hooks.some((hook) => hook.kind === 'set');
          const readonly = node.namedChildren.some((child) => child.type === 'readonly_modifier') || (owner.readonlyClass && !staticProperty);
          properties.push({
            ...nodeRange(source, nameNode), name, fqcn: `${owner.fqcn}::$${name}`, containerFqcn: owner.fqcn,
            type, defaultValue: element.childForFieldName('default_value')?.text, visibility, writeVisibility,
            static: staticProperty,
            readonly,
            final: node.namedChildren.some((child) => child.type === 'final_modifier'),
            abstract: node.namedChildren.some((child) => child.type === 'abstract_modifier') || owner.kind === 'interface',
            promoted: false,
            hooks: hooks.length ? hooks : undefined,
            virtual: hooks.length ? virtual : undefined,
            readable: hooks.length ? hasGet || !virtual : undefined,
            writable: hooks.length ? !readonly && (hasSet || !virtual) : undefined,
            writeType: hasSet ? hooks.find((hook) => hook.kind === 'set')?.parameter?.type ?? type : undefined,
            declarationStart: node.startIndex,
            declarationEnd: node.endIndex,
          });
        }
      }
      if (node.type === 'const_declaration') {
        const owner = containingType(node);
        const visibility = (node.namedChildren.find((child) => child.type === 'visibility_modifier')?.text as ParsedConstantDeclaration['visibility'] | undefined) ?? 'public';
        const type = node.childForFieldName('type')?.text;
        for (const element of node.namedChildren.filter((child) => child.type === 'const_element')) {
          const nameNode = element.namedChildren.find((child) => child.type === 'name');
          if (!nameNode) continue;
          const valueNode = element.namedChildren.find((child) => child !== nameNode);
          constants.push({
            ...nodeRange(source, nameNode), kind: 'constant', name: nameNode.text,
            fqcn: owner ? `${owner.fqcn}::${nameNode.text}` : [namespaceAt(node.startIndex), nameNode.text].filter(Boolean).join('\\'),
            containerFqcn: owner?.fqcn, global: !owner,
            type, value: valueNode?.text, visibility,
            declarationStart: node.startIndex,
            declarationEnd: node.endIndex,
          });
        }
      }
      if (node.type === 'enum_case') {
        const owner = containingType(node);
        const nameNode = node.childForFieldName('name');
        if (!owner || owner.kind !== 'enum' || !nameNode) return;
        const valueNode = node.childForFieldName('value');
        constants.push({
          ...nodeRange(source, nameNode), kind: 'enum-case', name: nameNode.text,
          fqcn: `${owner.fqcn}::${nameNode.text}`, containerFqcn: owner.fqcn, global: false,
          type: owner.fqcn, value: valueNode?.text, visibility: 'public',
          declarationStart: node.startIndex, declarationEnd: node.endIndex,
        });
      }
      if (node.type === 'assignment_expression') {
        const left = node.childForFieldName('left');
        const right = node.childForFieldName('right');
        if (left?.type !== 'variable_name' || !right) return;
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        if (!scope) return;
        const anonymous = right.type === 'object_creation_expression' ? right.namedChildren.find((child) => child.type === 'anonymous_class') : undefined;
        const createdType = anonymous
          ? anonymousFqcn(anonymous)
          : right.type === 'object_creation_expression' ? right.namedChildren.find((child) => child.type === 'qualified_name' || child.type === 'name')?.text
          : undefined;
        let sourceCall: ParsedAssignment['sourceCall'];
        let sourceArrayElement: ParsedAssignment['sourceArrayElement'];
        let sourceMember: ParsedAssignment['sourceMember'];
        const callbackFacts = (callback: SyntaxNode | undefined): { parameterType: string; returnType: string } | undefined => {
          const parameters = callback && (callback.type === 'arrow_function' || callback.type === 'anonymous_function') ? callback.childForFieldName('parameters') : undefined;
          const parameter = parameters?.namedChildren.length === 1 && parameters.namedChildren[0]?.type === 'simple_parameter' ? parameters.namedChildren[0] : undefined;
          const parameterType = parameter?.childForFieldName('type')?.text; let returnType = callback?.childForFieldName('return_type')?.text;
          if (!returnType && callback) {
            const body = callback.childForFieldName('body');
            const returned = callback.type === 'arrow_function' ? body
              : body?.namedChildren.length === 1 && body.namedChildren[0]?.type === 'return_statement' ? body.namedChildren[0].namedChildren[0] : undefined;
            if (returned?.type === 'object_creation_expression' && !returned.namedChildren.some((child) => child.type === 'anonymous_class')) {
              returnType = returned.namedChildren.find((child) => child.type === 'qualified_name' || child.type === 'name')?.text;
            }
          }
          return parameterType && returnType ? { parameterType, returnType } : undefined;
        };
        const memberChain = (value: SyntaxNode): ParsedAssignment['sourceChain'] | undefined => {
          if (value.type === 'variable_name') return { variable: value.text, steps: [] };
          const property = value.type === 'member_access_expression' || value.type === 'nullsafe_member_access_expression';
          const method = value.type === 'member_call_expression' || value.type === 'nullsafe_member_call_expression';
          if (!property && !method) return undefined;
          const objectNode = value.childForFieldName('object'); const nameNode = value.childForFieldName('name');
          const base = objectNode && memberChain(objectNode); if (!base || nameNode?.type !== 'name') return undefined;
          const nullsafe = value.type.startsWith('nullsafe_');
          if (property) return { ...base, steps: [...base.steps, { kind: 'property', name: nameNode.text, nullsafe }] };
          const argumentsNode = value.childForFieldName('arguments'); const arguments_ = argumentsNode?.namedChildren.filter((child) => child.type === 'argument') ?? [];
          const literal = arguments_.length === 1 ? arguments_[0]?.namedChildren[0] : undefined;
          const literalArgument = literal && ['string', 'encapsed_string'].includes(literal.type) && /^(['"])[^'"\\]*\1$/.test(literal.text) ? literal.text.slice(1, -1) : undefined;
          return { ...base, steps: [...base.steps, { kind: 'method', name: nameNode.text, nullsafe, callback: arguments_.length === 1 ? callbackFacts(literal) : undefined, literalArgument }] };
        };
        const sourceChain = memberChain(right);
        if (right.type === 'subscript_expression') {
          const [collection, key] = right.namedChildren;
          if (collection?.type === 'variable_name' && key && /^(?:'[^']*'|"[^"]*"|-?\d+)$/.test(key.text)) sourceArrayElement = { variable: collection.text, key: key.text.replace(/^(['"])(.*)\1$/, '$2') };
        }
        if (right.type === 'function_call_expression') {
          const functionNode = right.childForFieldName('function');
          if (functionNode?.type === 'variable_name') sourceCall = { kind: 'callable-variable', variable: functionNode.text };
          else if (functionNode) sourceCall = { kind: 'function', name: functionNode.text };
        } else if (right.type === 'scoped_call_expression') {
          const typeNode = right.childForFieldName('scope'); const methodNode = right.childForFieldName('name');
          if (typeNode && methodNode) sourceCall = { kind: 'static', typeName: typeNode.text, method: methodNode.text };
        } else if (right.type === 'member_call_expression' || right.type === 'nullsafe_member_call_expression') {
          const objectNode = right.childForFieldName('object'); const methodNode = right.childForFieldName('name');
          if (objectNode?.type === 'variable_name' && methodNode) {
            const argumentsNode = right.childForFieldName('arguments');
            const arguments_ = argumentsNode?.namedChildren.filter((child) => child.type === 'argument') ?? [];
            const firstArgument = arguments_.length === 1 ? arguments_[0]?.namedChildren[0] : undefined;
            const callback = callbackFacts(firstArgument);
            const literal = arguments_.length === 1 ? arguments_[0]?.namedChildren[0] : undefined;
            const literalArgument = literal && ['string', 'encapsed_string'].includes(literal.type) && /^(['"])[^'"\\]*\1$/.test(literal.text) ? literal.text.slice(1, -1) : undefined;
            const dynamicName = /\{\s*$/.test(source.slice(objectNode.endIndex, methodNode.startIndex)) ? dynamicMemberName(methodNode) : undefined;
            if (methodNode.type === 'name' || dynamicName) sourceCall = {
              kind: 'member', variable: objectNode.text, method: dynamicName?.name ?? methodNode.text, dynamic: dynamicName?.kind, callback, literalArgument,
            };
          }
        } else if (right.type === 'member_access_expression' || right.type === 'nullsafe_member_access_expression') {
          const objectNode = right.childForFieldName('object'); const memberNode = right.childForFieldName('name');
          if (objectNode?.type === 'variable_name' && memberNode?.type === 'name') sourceMember = {
            variable: objectNode.text, member: memberNode.text, nullsafe: right.type === 'nullsafe_member_access_expression',
          };
        }
        assignments.push({
          ...nodeRange(source, node),
          variable: left.text,
          callableFqcn: scope.id,
          scopeId: scope.id,
          typeName: createdType,
          sourceVariable: right.type === 'variable_name' ? right.text : undefined,
          sourceMember,
          sourceChain: sourceChain?.steps.length ? sourceChain : undefined,
          sourceArrayElement,
          sourceCall,
        });
      }
      if (node.type === 'foreach_statement') {
        const [collection, target] = node.namedChildren; if (!collection || !target) return;
        const value = target.type === 'pair' ? target.namedChildren.at(-1) : target;
        const body = node.childForFieldName('body'); if (value?.type !== 'variable_name' || !body) return;
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        if (!scope) return;
        let sourceIterable: ParsedAssignment['sourceIterable'];
        if (collection.type === 'variable_name') sourceIterable = { ...nodeRange(source, collection), kind: 'variable', variable: collection.text, part: 'value' };
        else if (collection.type === 'member_access_expression' || collection.type === 'member_call_expression') {
          const object = collection.childForFieldName('object'); const member = collection.childForFieldName('name');
          if (object?.type === 'variable_name' && member) sourceIterable = { ...nodeRange(source, collection), kind: 'member', variable: object.text, member: member.text, memberKind: collection.type === 'member_call_expression' ? 'method' : 'property', part: 'value' };
        }
        if (sourceIterable) assignments.push({ ...nodeRange(source, value), variable: value.text, callableFqcn: scope.id, scopeId: scope.id, sourceIterable, validRange: nodeRange(source, body) });
      }
      if (node.type === 'catch_clause') {
        const type = node.childForFieldName('type'); const variable = node.childForFieldName('name'); const body = node.childForFieldName('body');
        const namedTypes = type?.namedChildren.filter((child) => child.type === 'named_type') ?? [];
        const typeNames = namedTypes.map((namedType) => namedType.namedChildren.find((child) => child.type === 'qualified_name' || child.type === 'name')?.text).filter((name): name is string => Boolean(name));
        if (variable?.type !== 'variable_name' || !body || typeNames.length !== namedTypes.length || typeNames.length === 0) return;
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        if (!scope) return;
        assignments.push({ ...nodeRange(source, variable), variable: variable.text, callableFqcn: scope.id, scopeId: scope.id,
          typeName: typeNames.length === 1 ? typeNames[0] : undefined, typeNames: typeNames.length > 1 ? typeNames : undefined, validRange: nodeRange(source, body) });
      }
      if (node.type === 'while_statement') {
        const rawCondition = node.childForFieldName('condition');
        let condition = rawCondition;
        while (condition?.type === 'parenthesized_expression' && condition.namedChildren.length === 1) condition = condition.namedChildren[0]!;
        let negated = false;
        if (condition?.type === 'unary_op_expression') {
          const argument = condition.childForFieldName('argument') ?? condition.namedChildren[0];
          if (argument && condition.text.slice(0, argument.startIndex - condition.startIndex).trim() === '!') {
            condition = argument; negated = true;
            while (condition.type === 'parenthesized_expression' && condition.namedChildren.length === 1) condition = condition.namedChildren[0]!;
          }
        }
        const body = node.childForFieldName('body');
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        if (rawCondition && body && scope) {
          const range = body.type === 'compound_statement'
            ? { start: body.startIndex + 1, end: Math.max(body.startIndex + 1, body.endIndex - 1) }
            : nodeRange(source, body);
          conditionalCallFacts(rawCondition, range, undefined);
          shortCircuitCallFacts(rawCondition);
          narrowings.push(...predicateConditionFacts(rawCondition, true, scope.id, body.startIndex, body.endIndex));
        }
        if (condition?.type !== 'binary_expression' || !body) return;
        const left = condition.childForFieldName('left'); const right = condition.childForFieldName('right');
        if (!left || !right) return;
        const operator = condition.text.slice(left.endIndex - condition.startIndex, right.startIndex - condition.startIndex).trim().toLowerCase();
        if (!scope) return;
        const unwrapped = rawCondition && unwrapCondition(rawCondition);
        if (rawCondition && unwrapped && !unwrapped.negated && binaryOperator(unwrapped.node) === '&&') {
          narrowings.push(...positiveConditionFacts(rawCondition, scope.id, body.startIndex, body.endIndex));
          return;
        }
        const instanceSubject = directPropertySubject(left);
        if (instanceSubject && operator === 'instanceof' && !negated) {
          narrowings.push({ kind: 'instanceof', ...instanceSubject, typeName: right.text, scopeId: scope.id, start: body.startIndex, end: body.endIndex });
        }
      }
      if (node.type === 'for_statement') {
        const condition = node.childForFieldName('condition'); const body = node.childForFieldName('body');
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        if (condition && body && scope) {
          const range = body.type === 'compound_statement'
            ? { start: body.startIndex + 1, end: Math.max(body.startIndex + 1, body.endIndex - 1) }
            : nodeRange(source, body);
          conditionalCallFacts(condition, range, undefined);
          shortCircuitCallFacts(condition);
          narrowings.push(...predicateConditionFacts(condition, true, scope.id, body.startIndex, body.endIndex));
          narrowings.push(...positiveConditionFacts(condition, scope.id, body.startIndex, body.endIndex));
        }
      }
      if (node.type === 'do_statement') {
        const condition = node.childForFieldName('condition');
        if (condition) shortCircuitCallFacts(condition);
      }
      if (node.type === 'if_statement') {
        const rawCondition = node.childForFieldName('condition');
        let condition = rawCondition;
        while (condition?.type === 'parenthesized_expression' && condition.namedChildren.length === 1) {
          const child = condition.namedChildren[0]; if (!child) break; condition = child;
        }
        let negated = false;
        if (condition?.type === 'unary_op_expression') {
          const argument = condition.childForFieldName('argument') ?? condition.namedChildren[0];
          if (argument && condition.text.slice(0, argument.startIndex - condition.startIndex).trim() === '!') {
            condition = argument; negated = true;
            while (condition.type === 'parenthesized_expression' && condition.namedChildren.length === 1) condition = condition.namedChildren[0]!;
          }
        }
        const body = node.childForFieldName('body');
        const scope = scopes.filter((item) => node.startIndex >= item.start && node.endIndex <= item.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        const containsGoto = (candidate: SyntaxNode): boolean => candidate.type === 'goto_statement'
          || candidate.namedChildren.some(containsGoto);
        const containsLoopExit = (candidate: SyntaxNode): boolean => candidate.type === 'break_statement'
          || candidate.type === 'continue_statement' || candidate.namedChildren.some(containsLoopExit);
        const isConstantTrue = (candidate: SyntaxNode | null | undefined): boolean => {
          let value = candidate;
          while (value?.type === 'parenthesized_expression' && value.namedChildren.length === 1) value = value.namedChildren[0];
          return value?.text.trim().toLowerCase() === 'true';
        };
        const terminatesBody = (candidate: SyntaxNode | null | undefined): boolean => {
          if (!candidate || containsGoto(candidate)) return false;
          if (candidate.type === 'compound_statement') {
            const finalStatement = candidate.namedChildren.filter((child) => child.type !== 'comment').at(-1);
            return terminatesBody(finalStatement);
          }
          if (candidate.type === 'return_statement' || candidate.type === 'exit_statement'
            || (candidate.type === 'expression_statement' && candidate.namedChildren[0]?.type === 'throw_expression')) return true;
          if (candidate.type === 'if_statement') {
            const nestedBody = candidate.childForFieldName('body');
            const nestedAlternatives = candidate.namedChildren
              .filter((child) => child.type === 'else_if_clause' || child.type === 'else_clause');
            const nestedElse = nestedAlternatives.find((child) => child.type === 'else_clause');
            if (!nestedBody || !nestedElse) return false;
            return [nestedBody,
              ...nestedAlternatives.filter((child) => child.type === 'else_if_clause')
                .map((child) => child.childForFieldName('body')),
              nestedElse.childForFieldName('body'),
            ].every((branch) => terminatesBody(branch));
          }
          if (candidate.type === 'try_statement') {
            const tryBody = candidate.childForFieldName('body');
            const catchBodies = candidate.namedChildren.filter((child) => child.type === 'catch_clause')
              .map((child) => child.childForFieldName('body'));
            const finallyBody = candidate.namedChildren.find((child) => child.type === 'finally_clause')
              ?.childForFieldName('body');
            if (finallyBody && terminatesBody(finallyBody)) return true;
            return Boolean(tryBody) && terminatesBody(tryBody) && catchBodies.every((branch) => terminatesBody(branch));
          }
          if (candidate.type === 'switch_statement') {
            const switchBody = candidate.childForFieldName('body');
            const labels = switchBody?.namedChildren
              .filter((child) => child.type === 'case_statement' || child.type === 'default_statement') ?? [];
            if (!labels.length || !labels.some((label) => label.type === 'default_statement')) return false;
            const statements = (label: SyntaxNode): SyntaxNode[] => {
              const value = label.childForFieldName('value');
              return label.namedChildren.filter((child) => child !== value && child.type !== 'comment');
            };
            if (labels.some((label) => statements(label).some(containsLoopExit))) return false;
            return labels.every((_, entry) => labels.slice(entry).some((label) => statements(label).some(terminatesBody)));
          }
          if (candidate.type === 'do_statement') {
            const loopBody = candidate.childForFieldName('body');
            if (!loopBody || containsLoopExit(loopBody)) return false;
            return terminatesBody(loopBody) || isConstantTrue(candidate.childForFieldName('condition'));
          }
          if (candidate.type === 'while_statement' || candidate.type === 'for_statement') {
            const loopBody = candidate.childForFieldName('body');
            const condition = candidate.childForFieldName('condition');
            if (!loopBody || containsLoopExit(loopBody)) return false;
            return (candidate.type === 'for_statement' && !condition) || isConstantTrue(condition);
          }
          return false;
        };
        const terminates = terminatesBody(body);
        const alternatives = node.namedChildren.filter((child) => child.type === 'else_if_clause' || child.type === 'else_clause');
        const hasAlternative = alternatives.length > 0;
        const simpleContinuationRange = terminates && !hasAlternative && node.parent?.type === 'compound_statement'
          ? { start: node.endIndex, end: Math.max(node.endIndex, node.parent.endIndex - 1) } : undefined;
        if (condition && body && scope) {
          const contentRange = (value: SyntaxNode): SourceRange => value.type === 'compound_statement'
            ? { start: value.startIndex + 1, end: Math.max(value.startIndex + 1, value.endIndex - 1) } : nodeRange(source, value);
          const alternative = node.childForFieldName('alternative');
          const alternativeBody = alternative?.type === 'else_clause' ? alternative.childForFieldName('body') : undefined;
          conditionalCallFacts(rawCondition!,
            contentRange(body), alternativeBody ? contentRange(alternativeBody) : undefined);
          shortCircuitCallFacts(rawCondition!);
          narrowings.push(...predicateConditionFacts(rawCondition!, true, scope.id, body.startIndex, body.endIndex));
          const continuationRange = node.parent?.type === 'compound_statement'
            ? { start: node.endIndex, end: Math.max(node.endIndex, node.parent.endIndex - 1) } : undefined;
          const elseIfs = alternatives.filter((item) => item.type === 'else_if_clause');
          const conditions = [rawCondition!, ...elseIfs.flatMap((item) => {
            const value = item.childForFieldName('condition'); return value ? [value] : [];
          })];
          const branchBodies = [body, ...elseIfs.map((item) => item.childForFieldName('body'))];
          const elseBody = alternatives.find((item) => item.type === 'else_clause')?.childForFieldName('body');
          for (let branch = 1; branch < branchBodies.length; branch += 1) {
            const branchBody = branchBodies[branch]; if (!branchBody) continue;
            for (let prior = 0; prior < branch; prior += 1) {
              narrowings.push(...predicateConditionFacts(conditions[prior]!, false, scope.id, branchBody.startIndex, branchBody.endIndex));
            }
            narrowings.push(...predicateConditionFacts(conditions[branch]!, true, scope.id, branchBody.startIndex, branchBody.endIndex));
          }
          if (elseBody) {
            for (const branchCondition of conditions) {
              narrowings.push(...predicateConditionFacts(branchCondition, false, scope.id, elseBody.startIndex, elseBody.endIndex));
            }
          }
          const unsafeGoto = [...branchBodies, elseBody].some((item) => item && containsGoto(item));
          const continuingBranches = branchBodies.flatMap((item, index) => !terminatesBody(item) ? [index] : []);
          if (!elseBody || !terminatesBody(elseBody)) continuingBranches.push(conditions.length);
          if (continuationRange && continuingBranches.length && !unsafeGoto) {
            for (const [index, guardCondition] of conditions.entries()) {
              const outcomes = continuingBranches.map((branch) => branch < index ? undefined : branch === index);
              if (outcomes.some((value) => value === undefined) || new Set(outcomes).size !== 1) continue;
              const when = outcomes[0] ? 'true' : 'false'; const facts: typeof conditionalCalls = [];
              narrowings.push(...predicateConditionFacts(guardCondition, when === 'true', scope.id, continuationRange.start, continuationRange.end));
              conditionalCallFacts(guardCondition, when === 'true' ? continuationRange : undefined,
                when === 'false' ? continuationRange : undefined, facts);
              for (const fact of facts) {
                if (fact.whenTrue) guardContinuationCalls.push({ start: fact.start, end: fact.end, when: 'true', range: fact.whenTrue, inspectionEnd: node.endIndex });
                if (fact.whenFalse) guardContinuationCalls.push({ start: fact.start, end: fact.end, when: 'false', range: fact.whenFalse, inspectionEnd: node.endIndex });
              }
            }
          }
        }
        if (condition?.type !== 'binary_expression' || !body) return;
        const left = condition.childForFieldName('left'); const right = condition.childForFieldName('right');
        if (!left || !right) return;
        const operator = condition.text.slice(left.endIndex - condition.startIndex, right.startIndex - condition.startIndex).trim().toLowerCase();
        if (!scope) return;
        const unwrapped = rawCondition && unwrapCondition(rawCondition);
        if (rawCondition && unwrapped && !unwrapped.negated && binaryOperator(unwrapped.node) === '&&') {
          narrowings.push(...positiveConditionFacts(rawCondition, scope.id, body.startIndex, body.endIndex));
          return;
        }
        const instanceSubject = directPropertySubject(left);
        if (instanceSubject && operator === 'instanceof') {
          if (!negated) narrowings.push({ kind: 'instanceof', ...instanceSubject, typeName: right.text, scopeId: scope.id, start: body.startIndex, end: body.endIndex });
          else if (!terminates || hasAlternative) narrowings.push({ kind: 'not-instanceof', ...instanceSubject, typeName: right.text, scopeId: scope.id, start: body.startIndex, end: body.endIndex });
          const alternative = node.childForFieldName('alternative'); const alternativeBody = alternative?.childForFieldName('body');
          if (alternative?.type === 'else_clause' && alternativeBody) narrowings.push({ kind: negated ? 'instanceof' : 'not-instanceof', ...instanceSubject, typeName: right.text, scopeId: scope.id, start: alternativeBody.startIndex, end: alternativeBody.endIndex });
          else if (simpleContinuationRange) narrowings.push({ kind: 'instanceof', ...instanceSubject, typeName: right.text, scopeId: scope.id, ...simpleContinuationRange });
        }
      }
    });

    for (const fact of conditionalCalls) {
      const call = calls.find((candidate) => candidate.start === fact.start && candidate.end === fact.end);
      if (call) call.condition = { whenTrue: fact.whenTrue, whenFalse: fact.whenFalse };
    }
    for (const fact of shortCircuitCalls) {
      const call = calls.find((candidate) => candidate.start === fact.start && candidate.end === fact.end);
      if (!call) continue;
      call.shortCircuit ??= [];
      if (!call.shortCircuit.some((candidate) => candidate.when === fact.when
        && candidate.range.start === fact.range.start && candidate.range.end === fact.range.end)) call.shortCircuit.push({ when: fact.when, range: fact.range });
    }
    for (const fact of guardContinuationCalls) {
      const call = calls.find((candidate) => candidate.start === fact.start && candidate.end === fact.end);
      if (call) call.guardContinuation = { when: fact.when, range: fact.range, inspection: { start: call.end, end: fact.inspectionEnd } };
    }

    const importStatements = imports.map((item) => ({ start: item.statementStart, end: item.statementEnd }));
    const excluded = [...commentRanges, ...stringRanges, ...importStatements, ...declarations]
      .sort((a, b) => a.start - b.start);
    const rawNames: RawName[] = commentRanges.flatMap((range) => parsePhpDocNames(source, range));
    const pattern = /\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*(?:\\[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)*/g;
    for (const match of source.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (excluded.some((range) => start >= range.start && end <= range.end)) continue;
      const before = source.slice(Math.max(0, start - 16), start);
      if (/(?:->|::|\$|function\s+|const\s+)\s*$/.test(before)) continue;
      rawNames.push({ text: match[0], start, end, context: 'code' });
    }

    return { namespace, declarations, callables, assignments, scopes, variableReferences, returns, narrowings, properties, constants, imports, typeReferences, rawNames, memberAccesses, calls, errors, commentRanges, stringRanges, tree };
  }

  dispose(): void {
    this.parser.delete();
  }
}

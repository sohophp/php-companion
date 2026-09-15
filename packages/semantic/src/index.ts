import { createIncrementalEdit, type ParsedAssignment, type ParsedCall, type ParsedCallableDeclaration, type ParsedConstantDeclaration, type ParsedDeclaration, type ParsedImport, type ParsedMemberAccess, type ParsedParameter, type ParsedPropertyDeclaration, type ParsedReturnStatement, type ParsedScope, type ParsedTraitAdaptation, type ParsedTypeNarrowing, type ParsedTypeReference, type ParsedVariableReference, type PhpSyntaxParser, type RawName, type SourceRange } from '@php-companion/parser';
import { DocumentDependencyGraph, DocumentKeyIndex, type DependencyNode } from '@php-companion/index';
import { displayPhpDocType, parsePhpDoc, parsePhpDocType, type ParsedPhpDoc, type PhpDocTag, type PhpDocType } from '@php-companion/phpdoc';
import { arrayType, callableType, classString, compatibility, displayType, generic, integerRange, intersection, listType, literal, named, nullable, primitive, shape, union, unknown, type Compatibility, type GenericVariance, type PhpType, type PrimitiveName, type TypeRelationContext } from '@php-companion/type-system';
import { isSemanticFactsContribution, semanticFacts, type ExternalLiteralMethodReturnFact, type ExternalMethodFact, type ExternalPropertyFact, type SemanticFactsContribution } from '@php-companion/semantic-provider';

export type { ExternalLiteralMethodReturnFact, ExternalMethodFact, ExternalPropertyFact, SemanticFactsContribution } from '@php-companion/semantic-provider';

export interface SemanticFileSnapshot {
  uri: string;
  source: string;
  namespace: string;
  declarations: ParsedDeclaration[];
  callables: ParsedCallableDeclaration[];
  imports: ParsedImport[];
  typeReferences: ParsedTypeReference[];
  assignments: ParsedAssignment[];
  properties: ParsedPropertyDeclaration[];
  constants: ParsedConstantDeclaration[];
  rawNames: RawName[];
  memberAccesses: ParsedMemberAccess[];
  calls: ParsedCall[];
  scopes: ParsedScope[];
  variableReferences: ParsedVariableReference[];
  returns: ParsedReturnStatement[];
  narrowings: ParsedTypeNarrowing[];
  templates: SemanticTemplate[];
  genericParents: SemanticGenericParent[];
  magicMembers: SemanticMagicMember[];
  syntaxErrors: SourceRange[];
  commentRanges: SourceRange[];
  stringRanges: SourceRange[];
}
export interface SemanticTemplate { ownerFqcn: string; name: string; bound?: string; default?: string; variance: GenericVariance; }
export interface SemanticGenericParent { ownerFqcn: string; kind: 'extends' | 'implements'; parentName: string; arguments: string[]; }
export interface SemanticMagicMember extends SourceRange { ownerFqcn: string; kind: 'property' | 'method'; name: string; parameters: ParsedParameter[]; returnType?: string; writeType?: string; static: boolean; readable?: boolean; writable?: boolean; templates?: SemanticTemplate[]; }
export interface SemanticSnapshot {
  schema: 72;
  layers: {
    referenceCandidates: { indexed: boolean; keys: string[] };
    typeDependencies: { indexed: boolean; nodes: Array<{ key: string; dependencies: string[] }> };
  };
  file: SemanticFileSnapshot;
}
export interface CallableConstructionFact {
  callable: string;
  result: string;
  dependencies: string[];
}
export interface CallableConstructionFactDocument {
  uri: string;
  facts: CallableConstructionFact[];
}
type SemanticFile = SemanticFileSnapshot;
interface ObjectClass { fqcn: string; nullable: boolean; typeArguments?: Record<string, string>; groups?: ObjectClass[][]; }
interface MemberTarget { fqcn: string; member: string; accessFrom?: string; static: boolean; typeArguments?: Record<string, string>; groups?: ObjectClass[][]; }
interface EffectiveProperty {
  file: SemanticFile;
  declaration: ParsedPropertyDeclaration;
  readable: boolean;
  writable: boolean;
  readType?: string;
  writeType?: string;
  readVisibility: ParsedPropertyDeclaration['visibility'];
  writeVisibility: ParsedPropertyDeclaration['visibility'];
}
type SyntaxTree = ReturnType<PhpSyntaxParser['parse']>['tree'];
type SyntaxNode = SyntaxTree['rootNode'];
export type SemanticUpdateKind = 'none' | 'implementation' | 'declaration';
export interface SemanticUpdateResult {
  incremental: boolean;
  changedRanges: number;
  /** The broadest semantic layer changed by this update. */
  kind: SemanticUpdateKind;
  /** Stable lowercase callable identities whose implementation may have changed. */
  changedCallables: string[];
  /** Stable lowercase type identities whose declaration surface may have changed. */
  changedTypes: string[];
}

export interface SemanticLocation { uri: string; start: number; end: number; }
export interface MemberInfo extends SemanticLocation {
  kind: 'method' | 'function' | 'property' | 'constant';
  name: string;
  fqcn: string;
  parameters: ParsedCallableDeclaration['parameters'];
  returnType?: string;
  writeType?: string;
  nativeReturnType?: string;
  visibility: ParsedCallableDeclaration['visibility'];
  writeVisibility?: ParsedCallableDeclaration['visibility'];
  static: boolean;
  readonly?: boolean;
  readonlyClass?: boolean;
  promoted?: boolean;
  value?: string;
  constantKind?: ParsedConstantDeclaration['kind'];
  typeScopeFqcn: string;
  calledOnFqcn: string;
  templateArguments?: Record<string, string>;
  calledOnTemplateArguments?: Record<string, string>;
  callableTemplates?: SemanticTemplate[];
  iterableValueType?: string;
  readable?: boolean;
  writable?: boolean;
  hooked?: boolean;
  virtual?: boolean;
  hasGetHook?: boolean;
  hasSetHook?: boolean;
  final?: boolean;
  abstract?: boolean;
  finalHooks?: Array<'get' | 'set'>;
  abstractHooks?: Array<'get' | 'set'>;
  getByReference?: boolean;
  synthetic?: 'enum-native' | 'phpdoc-magic';
}

function memberNameKey(kind: MemberInfo['kind'], name: string): string {
  return kind === 'method' || kind === 'function' ? name.toLowerCase() : name;
}

function memberNameEquals(kind: MemberInfo['kind'], left: string, right: string): boolean {
  return memberNameKey(kind, left) === memberNameKey(kind, right);
}

function isDirectScalar(type: PhpType): boolean {
  return ['bool', 'int', 'float', 'string'].includes(displayType(type));
}

function acceptsWeakScalarCoercion(type: PhpType): boolean {
  const parts = displayType(type).split('|');
  return parts.some((part) => ['bool', 'int', 'float', 'string'].includes(part))
    && parts.every((part) => ['bool', 'int', 'float', 'string', 'null'].includes(part));
}
export interface SignatureInfo extends MemberInfo { activeParameter: number; namedArgumentPrefix?: string; usedNamedArguments: string[]; }
export type NamedArgumentInfo = ParsedCallableDeclaration['parameters'][number];
export interface TypeInfo extends SemanticLocation { name: string; fqcn: string; kind: ParsedDeclaration['kind']; importFqcn?: string; }
export interface TypeImportCandidate extends TypeInfo { aliasRequired: boolean; }
export interface TypeCopySymbol extends SemanticLocation { fqcn: string; alias: string; }
export interface TypeImportPlan { offset: number; text: string; replacements: Record<string, string>; conflict?: { fqcn: string; sourceAlias: string }; }
export interface TypeRename extends SemanticLocation { name: string; fqcn: string; kind: ParsedDeclaration['kind']; declarationUri: string; locations: SemanticLocation[]; }
export interface TypeMoveInput { oldUri: string; newUri: string; newNamespace: string; }
export interface TypeMoveReconciliationInput {
  newUri: string;
  newNamespace: string;
  declarations: Array<{ oldFqcn: string; newFqcn: string }>;
}
export interface TypeMovePlan {
  edits: Array<SemanticLocation & { newText: string }>;
  declarations: Array<{ oldUri: string; newUri: string; oldFqcn: string; newFqcn: string }>;
  touchedSourceUris: string[];
}
export type TypeMoveResult = { plan: TypeMovePlan; error?: never } | { plan?: never; error: string };
export interface FunctionCompletionInfo extends SemanticLocation { name: string; fqcn: string; parameters: ParsedCallableDeclaration['parameters']; returnType?: string; importFqfn?: string; }
export interface ConstantCompletionInfo extends SemanticLocation { name: string; fqcn: string; type?: string; value?: string; importFqcn?: string; }
export interface UnresolvedTypeInfo extends SemanticLocation { name: string; fqcn: string; }
export interface UnresolvedSymbolInfo extends SemanticLocation { kind: 'function' | 'constant'; name: string; fqcn: string; }
export interface UndefinedVariableInfo extends SemanticLocation { name: string; scopeId: string; }
export interface UnresolvedMemberInfo extends SemanticLocation { name: string; ownerFqcn: string; kind: ParsedMemberAccess['kind']; static: boolean; }
export interface InvalidStaticMemberAccess extends SemanticLocation { name: string; ownerFqcn: string; kind: 'method' | 'property'; }
export interface InaccessibleMemberAccess extends SemanticLocation { name: string; ownerFqcn: string; kind: ParsedMemberAccess['kind']; visibility: 'protected' | 'private'; static: boolean; operation?: 'read' | 'write'; }
export interface InvalidPropertyOperation extends SemanticLocation { name: string; ownerFqcn: string; operation: 'read' | 'write'; reason: 'unreadable' | 'unwritable' | 'indirect-modification' | 'reference-assignment'; }
export interface InvalidHookedObjectReferenceIteration extends SemanticLocation { ownerFqcn: string; propertyNames: string[]; }
export interface NullableMemberAccess extends SemanticLocation { name: string; ownerFqcn: string; kind: 'method' | 'property'; operatorStart: number; operatorEnd: number; }
export interface DynamicPropertyCreation extends SemanticLocation { name: string; ownerFqcn: string; }
export interface DynamicPropertyDeclaration { uri: string; name: string; ownerFqcn: string; insertOffset: number; type: string; }
export interface InvalidAllowDynamicProperties extends SemanticLocation { typeFqcn: string; kind: ParsedDeclaration['kind']; readonlyClass: boolean; }
export interface OverridePropertyAttribute extends SemanticLocation {
  property: string;
  declaredInTrait: boolean;
  composedFromTrait: boolean;
  matchingParentProperty?: string;
}
export interface DiscardedNoDiscardReturn extends SemanticLocation { callable: string; message?: string; }
export interface InvalidNoDiscardDeclaration extends SemanticLocation {
  callable: string;
  reason: 'void-return' | 'never-return' | 'magic-method';
}
export interface InvalidNoDiscardTarget extends SemanticLocation {
  target: 'property-hook' | 'class-constant' | 'enum-case' | 'trait' | 'global-constant'
    | 'class' | 'interface' | 'enum' | 'property' | 'parameter' | 'anonymous-class';
  delayedValidation: boolean;
}
export interface DeprecatedSymbolUse extends SemanticLocation {
  symbol: string;
  kind: 'function' | 'method' | 'constant' | 'enum-case' | 'trait' | 'property-get' | 'property-set';
  message?: string;
  since?: string;
  attributeMinimumVersion?: '8.4' | '8.5';
}
export interface DeprecatedAttributeTarget extends SemanticLocation {
  target: 'function' | 'method' | 'closure' | 'property-hook' | 'class-constant' | 'enum-case' | 'trait' | 'global-constant'
    | 'class' | 'interface' | 'enum' | 'property' | 'parameter' | 'anonymous-class';
  valid: boolean;
  minimumPhpVersion: '8.4' | '8.5';
  delayedValidation: boolean;
}
export interface ReadonlyPropertyAssignment extends SemanticLocation {
  name: string;
  ownerFqcn: string;
  minimumPhpVersion: '7.2' | '8.1' | '8.2';
  operation?: 'reference-iteration';
  propertyNames?: string[];
}
export interface MissingInterfaceMethod extends MemberInfo { declarationText: string; }
export interface MissingInterfaceImplementation { uri: string; classFqcn: string; classStart: number; classEnd: number; abstract: boolean; insertOffset: number; methods: MissingInterfaceMethod[]; }
export type MissingAbstractImplementation = MissingInterfaceImplementation;
export interface ConstructorGeneration { uri: string; classFqcn: string; classStart: number; classEnd: number; insertOffset: number; properties: Array<{ name: string; type: string }>; }
export interface AccessorGeneration { uri: string; classFqcn: string; classStart: number; classEnd: number; insertOffset: number; accessors: Array<{ property: string; type: string; getter?: string; setter?: string }>; }
export interface OverrideGeneration { uri: string; classFqcn: string; classStart: number; classEnd: number; insertOffset: number; methods: MissingInterfaceMethod[]; }
export interface PrivateMethodRename { uri: string; start: number; end: number; name: string; fqcn: string; locations: SemanticLocation[]; }
export type MethodRename = PrivateMethodRename;
export interface PrivatePropertyRename { uri: string; start: number; end: number; name: string; fqcn: string; locations: SemanticLocation[]; }
export type PropertyRename = PrivatePropertyRename;
export interface FunctionRename { uri: string; start: number; end: number; name: string; fqcn: string; locations: SemanticLocation[]; }
export interface ConstantRename { uri: string; start: number; end: number; name: string; fqcn: string; locations: SemanticLocation[]; }
export interface LocalVariableRename { uri: string; start: number; end: number; name: string; scopeId: string; locations: SemanticLocation[]; }
export interface ImportInsertion { offset: number; text: string; }
export interface ImportOrganization extends SemanticLocation { newText: string; removed: string[]; }
export interface InlayTypeHint { position: number; label: string; }
export interface InlayParameterHint { position: number; label: string; }
export interface ExtractVariableInfo { uri: string; expressionStart: number; expressionEnd: number; statementStart: number; variable: string; indent: string; expression: string; }
export interface InlineVariableInfo { uri: string; declarationStart: number; declarationEnd: number; useStart: number; useEnd: number; variable: string; expression: string; }
export interface ExtractMethodInfo { uri: string; selectionStart: number; selectionEnd: number; insertOffset: number; methodName: string; parameters: string[]; output?: string; callText: string; methodText: string; }
export interface RemovePrivateParameterInfo { uri: string; callable: string; parameter: string; edits: Array<{ uri: string; start: number; end: number }>; }
export interface MissingRequiredArguments extends SemanticLocation { callable: string; parameters: string[]; }
export interface IncompatibleArgument extends SemanticLocation { callable: string; parameter: string; actualType: string; expectedType: string; }
export interface IncompatibleReturn extends SemanticLocation { callable: string; actualType: string; expectedType: string; }
export interface IncompatibleAssignment extends SemanticLocation { callable: string; variable: string; actualType: string; expectedType: string; }
export interface PhpDocTypeConflict extends SemanticLocation {
  kind: 'parameter' | 'return' | 'property';
  subject: string;
  nativeType: string;
  phpDocType: string;
}
export interface UnknownNamedArgument extends SemanticLocation { callable: string; name: string; }
export interface ArgumentOrderProblem extends SemanticLocation { kind: 'duplicate-named' | 'positional-after-named' | 'unpack-after-named'; name?: string; }
export interface UnusedImport extends SemanticLocation { name: string; kind: ParsedImport['kind']; statementStart: number; statementEnd: number; }
export interface IncompatibleMethodOverride extends SemanticLocation { method: string; inheritedMethod: string; reason: string; }
export interface IncompatiblePropertyOverride extends SemanticLocation {
  property: string;
  inheritedProperty: string;
  reason: string;
  minimumPhpVersion?: '8.5';
}
export interface MissingPropertyImplementation extends SemanticLocation { classFqcn: string; property: string; inheritedProperty: string; reason: string; abstract: boolean; }
export interface InvalidInheritance extends SemanticLocation { type: string; parent: string; reason: 'final-class' | 'readonly-mismatch'; readonly?: boolean; parentReadonly?: boolean; }
export interface InvalidTypeRelation extends SemanticLocation {
  owner: string;
  target: string;
  relation: 'extend' | 'implement' | 'use';
  expectedKind: 'class' | 'interface' | 'trait';
  actualKind: ParsedDeclaration['kind'];
}
export interface InheritanceCycle extends SemanticLocation { owner: string; target: string; relation: 'extend' | 'use'; }
export interface InvalidInstantiation extends SemanticLocation {
  target: string;
  reason: 'interface' | 'trait' | 'enum' | 'abstract-class';
}
export interface InvalidEnumTraitProperty extends SemanticLocation {
  enumFqcn: string;
  traitFqcn: string;
  propertyOwner: string;
  propertyName: string;
}
export interface InvalidReadonlyTraitProperty extends SemanticLocation {
  classFqcn: string;
  traitFqcn: string;
  propertyOwner: string;
  propertyName: string;
}
export interface InvalidEnumInterface extends SemanticLocation {
  enumFqcn: string;
  interfaceFqcn: string;
  prohibitedInterface: 'UnitEnum' | 'BackedEnum' | 'Serializable';
  reason: 'automatic-interface' | 'serializable' | 'non-backed-interface';
}
export interface InaccessibleInstantiation extends SemanticLocation {
  target: string;
  constructor: string;
  visibility: 'private' | 'protected';
}
export interface ConstructorParameterInfo extends SemanticLocation { ownerFqcn: string; name: string; parameterIndex?: number; typeFqcn: string; typeFqcns: string[]; typeGroups: string[][]; typeOperator?: 'union' | 'intersection' | 'dnf'; typeStart: number; typeEnd: number; explicitWiring: boolean; targetName?: string; requiredMethodName?: string; requiredPropertyName?: string; callableFqcn?: string; }
export interface WorkspaceSymbolInfo extends SemanticLocation { name: string; container?: string; kind: 'class' | 'interface' | 'trait' | 'enum' | 'function' | 'method' | 'property' | 'constant'; }
const BUILTIN_PARAMETER_TYPES = new Set(['array', 'bool', 'callable', 'false', 'float', 'int', 'iterable', 'mixed', 'never', 'null', 'object', 'string', 'true', 'void']);
const MAX_SEMANTIC_GRAPH_DEPTH = 64;
const MAX_ASSERTED_TARGET_INFERENCE_DEPTH = 4;
const MAX_LOCAL_CONTROL_FLOW_DEPTH = 16;
const MAX_MATCH_RESULT_ARMS = 64;
const MAX_LOCAL_SYNTAX_DEPTH = 256;
const MAX_LOCAL_SYNTAX_NODES = 100_000;

type SyntaxWalkDecision = 'descend' | 'skip' | 'stop';

function walkLocalSyntax(root: SyntaxNode, visitor: (node: SyntaxNode, depth: number) => SyntaxWalkDecision): { complete: boolean; stopped: boolean } {
  const pending: Array<{ node: SyntaxNode; depth: number }> = [{ node: root, depth: 0 }];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop()!;
    visited += 1;
    if (visited > MAX_LOCAL_SYNTAX_NODES || current.depth > MAX_LOCAL_SYNTAX_DEPTH) return { complete: false, stopped: false };
    const decision = visitor(current.node, current.depth);
    if (decision === 'stop') return { complete: true, stopped: true };
    if (decision === 'skip') continue;
    for (let index = current.node.namedChildren.length - 1; index >= 0; index -= 1) {
      pending.push({ node: current.node.namedChildren[index]!, depth: current.depth + 1 });
    }
  }
  return { complete: true, stopped: false };
}

function deepestLocalSyntax(root: SyntaxNode, start: number, end: number, predicate: (node: SyntaxNode) => boolean): SyntaxNode | undefined {
  let result: SyntaxNode | undefined;
  let resultDepth = -1;
  const traversal = walkLocalSyntax(root, (node, depth) => {
    if (start < node.startIndex || end > node.endIndex) return 'skip';
    if (predicate(node) && depth > resultDepth) { result = node; resultDepth = depth; }
    return 'descend';
  });
  return traversal.complete ? result : undefined;
}

function firstLocalSyntax(root: SyntaxNode, predicate: (node: SyntaxNode) => boolean): SyntaxNode | undefined {
  let result: SyntaxNode | undefined;
  const traversal = walkLocalSyntax(root, (node) => {
    if (!predicate(node)) return 'descend';
    result = node;
    return 'stop';
  });
  return traversal.complete ? result : undefined;
}

function wordAt(source: string, offset: number): { text: string; start: number; end: number } | undefined {
  let start = Math.min(offset, source.length);
  let end = start;
  while (start > 0 && /[A-Za-z0-9_\\\x80-\xff]/.test(source[start - 1]!)) start -= 1;
  while (end < source.length && /[A-Za-z0-9_\\\x80-\xff]/.test(source[end]!)) end += 1;
  return end > start ? { text: source.slice(start, end), start, end } : undefined;
}

function typeCompletionPrefix(source: string, offset: number): string | undefined {
  const before = source.slice(0, offset);
  const direct = [
    /\b(?:new|extends|instanceof)\s+([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/,
    /\bimplements\s+(?:[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\s*,\s*)*([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/,
    /\)\s*:\s*\??([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/,
    /\bcatch\s*\(\s*([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/,
    /#\[\s*([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/,
    /\b(?:public|protected|private|static|readonly|var)(?:\s+(?:public|protected|private|static|readonly))*\s+\??([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/,
  ].map((pattern) => pattern.exec(before)).find(Boolean);
  if (direct) return direct[1] ?? '';
  const open = before.lastIndexOf('(');
  if (open < 0 || !/(?:\bfunction\s+[A-Za-z_][A-Za-z0-9_]*|\bfn)\s*$/.test(before.slice(0, open))) return undefined;
  const segment = before.slice(open + 1).split(',').at(-1)?.trimStart() ?? '';
  const parameter = /^\??([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/.exec(segment);
  return parameter?.[1] ?? (parameter ? '' : undefined);
}

function namespaceCompletionRank(currentNamespace: string, qualifiedName: string): { common: number; distance: number } {
  const namespaceParts = currentNamespace.toLowerCase().split('\\').filter(Boolean);
  const candidateParts = qualifiedName.toLowerCase().split('\\').slice(0, -1).filter(Boolean);
  let common = 0;
  while (common < namespaceParts.length && common < candidateParts.length
    && namespaceParts[common] === candidateParts[common]) common += 1;
  return { common, distance: namespaceParts.length + candidateParts.length - (2 * common) };
}

function preferredDocTags(doc: ParsedPhpDoc | undefined, predicate: (tag: PhpDocTag) => boolean, key: (tag: PhpDocTag) => string): PhpDocTag[] {
  const priorities = { phpdoc: 0, psalm: 1, phpstan: 1 } as const;
  const selected = new Map<string, PhpDocTag>();
  for (const tag of doc?.tags.filter(predicate) ?? []) {
    const id = key(tag); const current = selected.get(id);
    if (!current || priorities[tag.dialect] >= priorities[current.dialect]) selected.set(id, tag);
  }
  return [...selected.values()];
}

function preferredPropertyVarTag(doc: ParsedPhpDoc | undefined, propertyName: string): PhpDocTag | undefined {
  const variable = `$${propertyName}`;
  return preferredDocTags(doc, (tag) => tag.name === 'var' && tag.variable === variable, () => variable).at(-1)
    ?? preferredDocTags(doc, (tag) => tag.name === 'var' && !tag.variable, () => 'var').at(-1);
}

function adjacentPhpDoc(file: Pick<SemanticFile, 'source' | 'commentRanges'>, offset: number): ParsedPhpDoc | undefined {
  const range = file.commentRanges.filter((item) => item.end <= offset && file.source.slice(item.start, item.start + 3) === '/**')
    .sort((left, right) => right.end - left.end)[0];
  if (!range || !/^[\s]*(?:#\[[\s\S]*?\][\s]*)*$/.test(file.source.slice(range.end, offset))) return undefined;
  return parsePhpDoc(file.source.slice(range.start, range.end), range.start);
}

function specializeTemplateType(value: string | undefined, arguments_: Record<string, string> | undefined): string | undefined {
  if (!value || !arguments_) return value;
  const maxExpandedTypeLength = 8_192;
  if (value.length > maxExpandedTypeLength || Object.values(arguments_).some((resolved) => resolved.length > maxExpandedTypeLength)) return undefined;
  let specialized = value;
  for (const [template, resolved] of Object.entries(arguments_)) {
    specialized = specialized.replace(new RegExp(`(?<![A-Za-z0-9_\\\\])${template}(?![A-Za-z0-9_])`, 'g'), resolved);
    if (specialized.length > maxExpandedTypeLength) return undefined;
  }
  const parsed = parsePhpDocType(specialized);
  if (!parsed.type || parsed.errors.length) return specialized;
  const normalize = (type: PhpDocType): { type: PhpDocType; changed: boolean } => {
    if (type.kind === 'union' || type.kind === 'intersection') {
      const children = type.types.map(normalize); const flattened = children.flatMap((child) =>
        child.type.kind === type.kind ? child.type.types : [child.type]);
      const unique = [...new Map(flattened.map((child) => [displayPhpDocType(child).toLowerCase(), child])).values()];
      if (unique.length === 1) return { type: unique[0]!, changed: true };
      return { type: { ...type, types: unique }, changed: children.some((child) => child.changed) || unique.length !== flattened.length };
    }
    if (type.kind === 'nullable' || type.kind === 'negated' || type.kind === 'array') {
      const child = normalize(type.kind === 'array' ? type.element : type.type);
      return { type: type.kind === 'array' ? { ...type, element: child.type } : { ...type, type: child.type }, changed: child.changed };
    }
    if (type.kind === 'generic') {
      const base = normalize(type.base); const arguments_ = type.arguments.map(normalize);
      return { type: { ...type, base: base.type, arguments: arguments_.map((argument) => argument.type) },
        changed: base.changed || arguments_.some((argument) => argument.changed) };
    }
    if (type.kind === 'conditional') {
      const subject = normalize(type.subject); const target = normalize(type.target);
      const ifTrue = normalize(type.ifTrue); const ifFalse = normalize(type.ifFalse);
      return { type: { ...type, subject: subject.type, target: target.type, ifTrue: ifTrue.type, ifFalse: ifFalse.type },
        changed: subject.changed || target.changed || ifTrue.changed || ifFalse.changed };
    }
    if (type.kind === 'callable') {
      const parameters = type.parameters.map((parameter) => ({ parameter, normalized: normalize(parameter.type) }));
      const returnType = type.returnType && normalize(type.returnType);
      return { type: { ...type, parameters: parameters.map(({ parameter, normalized }) => ({ ...parameter, type: normalized.type })),
        returnType: returnType?.type }, changed: parameters.some(({ normalized }) => normalized.changed) || Boolean(returnType?.changed) };
    }
    if (type.kind === 'shape') {
      const fields = type.fields.map((field) => ({ field, normalized: normalize(field.type) }));
      return { type: { ...type, fields: fields.map(({ field, normalized }) => ({ ...field, type: normalized.type })) },
        changed: fields.some(({ normalized }) => normalized.changed) };
    }
    return { type, changed: false };
  };
  const normalized = normalize(parsed.type);
  return normalized.changed ? displayPhpDocType(normalized.type) : specialized;
}

function semanticParameter(parameter: ParsedParameter): unknown {
  return {
    name: parameter.name, type: parameter.type, nativeType: parameter.nativeType,
    defaultValue: parameter.defaultValue, promoted: parameter.promoted,
    variadic: parameter.variadic, byReference: parameter.byReference,
  };
}

function semanticCallableSurface(callable: ParsedCallableDeclaration): unknown {
  return {
    name: callable.name, fqcn: callable.fqcn, kind: callable.kind,
    containerFqcn: callable.containerFqcn, parameters: callable.parameters.map(semanticParameter),
    returnType: callable.returnType, nativeReturnType: callable.nativeReturnType,
    visibility: callable.visibility, static: callable.static,
  };
}

function semanticTypeSurfaces(file: SemanticFile | undefined): Map<string, string> {
  const surfaces = new Map<string, string>();
  if (!file) return surfaces;
  for (const declaration of file.declarations.filter((item) => !item.anonymous)) {
    const key = declaration.fqcn.toLowerCase();
    const traitAdaptations = declaration.traitAdaptations.map((item) => item.kind === 'precedence'
      ? { kind: item.kind, trait: item.trait, method: item.method, insteadOf: item.insteadOf }
      : { kind: item.kind, trait: item.trait, method: item.method, alias: item.alias, visibility: item.visibility });
    const callables = file.callables.filter((item) => item.containerFqcn?.toLowerCase() === key).map(semanticCallableSurface);
    const properties = file.properties.filter((item) => item.containerFqcn.toLowerCase() === key).map((item) => ({
      name: item.name, fqcn: item.fqcn, type: item.type, defaultValue: item.defaultValue,
      visibility: item.visibility, writeVisibility: item.writeVisibility, static: item.static,
      readonly: item.readonly, final: item.final, abstract: item.abstract, promoted: item.promoted,
      virtual: item.virtual, readable: item.readable, writable: item.writable, writeType: item.writeType,
      hooks: item.hooks?.map((hook) => ({ kind: hook.kind, parameter: hook.parameter && semanticParameter(hook.parameter),
        byReference: hook.byReference, final: hook.final, abstract: hook.abstract })),
    }));
    const constants = file.constants.filter((item) => item.containerFqcn?.toLowerCase() === key).map((item) => ({
      kind: item.kind, name: item.name, fqcn: item.fqcn, type: item.type, value: item.value, visibility: item.visibility,
    }));
    surfaces.set(key, JSON.stringify({
      declaration: {
        name: declaration.name, fqcn: declaration.fqcn, kind: declaration.kind,
        extendsNames: declaration.extendsNames, implementsNames: declaration.implementsNames,
        traitNames: declaration.traitNames, traitAdaptations, readonlyClass: declaration.readonlyClass,
        enumBackingType: declaration.enumBackingType,
      }, callables, properties, constants,
      templates: file.templates.filter((item) => item.ownerFqcn.toLowerCase() === key || item.ownerFqcn.toLowerCase().startsWith(`${key}::`)),
      genericParents: file.genericParents.filter((item) => item.ownerFqcn.toLowerCase() === key),
      magicMembers: file.magicMembers.filter((item) => item.ownerFqcn.toLowerCase() === key).map((item) => ({
        ownerFqcn: item.ownerFqcn, kind: item.kind, name: item.name,
        parameters: item.parameters.map(semanticParameter), returnType: item.returnType, writeType: item.writeType,
        static: item.static, readable: item.readable, writable: item.writable,
        templates: item.templates?.map((template) => ({ ownerFqcn: template.ownerFqcn, name: template.name,
          bound: template.bound, default: template.default, variance: template.variance })),
      })),
    }));
  }
  return surfaces;
}

function semanticFileSurface(file: SemanticFile | undefined, typeSurfaces = semanticTypeSurfaces(file)): string {
  if (!file) return '';
  return JSON.stringify({
    namespace: file.namespace,
    types: [...typeSurfaces],
    globalCallables: file.callables.filter((item) => !item.containerFqcn).map(semanticCallableSurface),
    globalConstants: file.constants.filter((item) => !item.containerFqcn).map((item) => ({
      kind: item.kind, name: item.name, fqcn: item.fqcn, type: item.type, value: item.value, visibility: item.visibility,
    })),
    imports: file.imports.map((item) => ({ kind: item.kind, fqcn: item.fqcn, alias: item.alias,
      explicitAlias: item.explicitAlias, namespace: item.namespace })),
  });
}

function implementationSlices(file: SemanticFile | undefined): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!file) return result;
  for (const callable of file.callables) {
    const key = callable.fqcn.toLowerCase(); const values = result.get(key) ?? [];
    values.push(file.source.slice(callable.declarationStart, callable.declarationEnd)); result.set(key, values);
  }
  for (const property of file.properties.filter((item) => item.hooks?.some((hook) => !hook.abstract))) {
    const key = `${property.containerFqcn.toLowerCase()}::$${property.name}`; const values = result.get(key) ?? [];
    values.push(file.source.slice(property.declarationStart, property.declarationEnd)); result.set(key, values);
  }
  return result;
}

function changedMapKeys(left: ReadonlyMap<string, unknown>, right: ReadonlyMap<string, unknown>): Set<string> {
  const keys = new Set([...left.keys(), ...right.keys()]);
  return new Set([...keys].filter((key) => JSON.stringify(left.get(key)) !== JSON.stringify(right.get(key))));
}

function referenceNameTail(name: string): string {
  return name.slice(name.lastIndexOf('\\') + 1);
}

function memberCandidateKey(kind: ParsedMemberAccess['kind'], name: string): string {
  return `member:${kind}:${kind === 'method' ? name.toLowerCase() : name}`;
}

function referenceCandidateKeys(file: SemanticFile): Set<string> {
  const keys = new Set<string>();
  for (const declaration of file.declarations) keys.add(`declaration:type:${declaration.fqcn.toLowerCase()}`);
  for (const callable of file.callables) if (callable.kind === 'function') keys.add(`declaration:function:${callable.fqcn.toLowerCase()}`);
  for (const constant of file.constants) if (constant.global) keys.add(`declaration:constant:${constant.fqcn}`);
  for (const raw of file.rawNames) {
    const tail = referenceNameTail(raw.text); if (!tail) continue;
    keys.add(`raw-ci:${tail.toLowerCase()}`); keys.add(`raw-cs:${tail}`);
  }
  for (const imported of file.imports) {
    const identity = imported.kind === 'const' ? imported.fqcn : imported.fqcn.toLowerCase();
    keys.add(`import:${imported.kind}:${identity}`);
  }
  for (const access of file.memberAccesses) if (!access.dynamic) keys.add(memberCandidateKey(access.kind, access.name));
  return keys;
}

export class SemanticWorkspace {
  private readonly files = new Map<string, SemanticFile>();
  private readonly referenceCandidates = new DocumentKeyIndex();
  private readonly unindexedReferenceCandidateUris = new Set<string>();
  private readonly typeDependencies = new DocumentDependencyGraph();
  private readonly unindexedTypeDependencyUris = new Set<string>();
  private readonly callableDependencies = new DocumentDependencyGraph();
  private readonly callableDependenciesByUri = new Map<string, Map<string, Set<string>>>();
  private readonly unindexedCallableDependencyUris = new Set<string>();
  private readonly trees = new Map<string, SyntaxTree>();
  private readonly controlFlowAssignments = new Map<string, Set<number>>();
  private readonly externalFacts = new Map<string, SemanticFactsContribution>();
  private readonly constructorInitializationSummaries = new Map<string, Set<string>>();
  private readonly factoryConstructionSummaries = new Map<string, string | null>();
  private readonly readonlyAnalysisInProgress = new Set<string>();
  private readonly generatorInferenceInProgress = new Set<string>();
  private readonly contextualClosureInferenceInProgress = new Set<string>();
  private readonly assertedTargetInferenceInProgress = new Set<string>();
  private readonly assertedTargetInferenceCache = new Map<string, ObjectClass | null>();
  constructor(private readonly parser: PhpSyntaxParser) {}

  private replaceReferenceCandidates(file: SemanticFile): void {
    if (this.referenceCandidates.replace(file.uri, referenceCandidateKeys(file))) this.unindexedReferenceCandidateUris.delete(file.uri);
    else this.unindexedReferenceCandidateUris.add(file.uri);
  }

  private typeDependencyNodes(file: SemanticFile): DependencyNode[] {
    return file.declarations.map((declaration) => {
      const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const dependencies = [...declaration.extendsNames, ...declaration.implementsNames, ...declaration.traitNames]
        .map((name) => this.resolveSourceType(file, name, namespace, declaration.fqcn)?.toLowerCase())
        .filter((name): name is string => Boolean(name));
      return { key: declaration.fqcn.toLowerCase(), dependencies };
    });
  }

  private replaceTypeDependencies(file: SemanticFile, nodes: Iterable<DependencyNode> = this.typeDependencyNodes(file)): void {
    if (this.typeDependencies.replace(file.uri, nodes)) this.unindexedTypeDependencyUris.delete(file.uri);
    else this.unindexedTypeDependencyUris.add(file.uri);
  }

  private filesForReferenceKeys(...keys: string[]): SemanticFile[] {
    const uris = new Set(this.unindexedReferenceCandidateUris);
    for (const key of keys) for (const uri of this.referenceCandidates.documents(key)) uris.add(uri);
    return [...uris].sort().flatMap((uri) => {
      const file = this.files.get(uri); return file ? [file] : [];
    });
  }

  private dependentTypeNames(seed: ReadonlySet<string>): Set<string> | undefined {
    if (this.unindexedTypeDependencyUris.size) return undefined;
    const affected = new Set([...seed].map((name) => name.toLowerCase()));
    let frontier = [...affected];
    for (let round = 0; round < MAX_SEMANTIC_GRAPH_DEPTH; round += 1) {
      const next = new Set<string>();
      for (const dependency of frontier) for (const dependent of this.typeDependencies.directDependents(dependency)) {
        if (!affected.has(dependent)) next.add(dependent);
      }
      if (!next.size) return affected;
      for (const dependent of next) affected.add(dependent);
      frontier = [...next];
    }
    return undefined;
  }

  private dependentCallableNames(seed: ReadonlySet<string>): Set<string> | undefined {
    if (this.unindexedCallableDependencyUris.size) return undefined;
    const affected = new Set([...seed].map((name) => name.toLowerCase()));
    let frontier = [...affected];
    for (let round = 0; round < MAX_SEMANTIC_GRAPH_DEPTH; round += 1) {
      const next = new Set<string>();
      for (const dependency of frontier) for (const dependent of this.callableDependencies.directDependents(dependency)) {
        if (!affected.has(dependent)) next.add(dependent);
      }
      if (!next.size) return affected;
      for (const dependent of next) affected.add(dependent);
      frontier = [...next];
    }
    return undefined;
  }

  private replaceCallableDependency(uri: string, callable: string, dependencies: ReadonlySet<string>): void {
    const document = this.callableDependenciesByUri.get(uri) ?? new Map<string, Set<string>>();
    document.set(callable, new Set(dependencies));
    this.callableDependenciesByUri.set(uri, document);
    const nodes = [...document].map(([key, values]) => ({ key, dependencies: values }));
    if (this.callableDependencies.replace(uri, nodes)) this.unindexedCallableDependencyUris.delete(uri);
    else this.unindexedCallableDependencyUris.add(uri);
  }

  private removeCallableDependencyEntries(callables: ReadonlySet<string>): void {
    const changedUris = new Set<string>();
    for (const [uri, document] of this.callableDependenciesByUri) {
      for (const callable of callables) if (document.delete(callable)) changedUris.add(uri);
      if (!document.size) this.callableDependenciesByUri.delete(uri);
    }
    for (const uri of changedUris) {
      const document = this.callableDependenciesByUri.get(uri);
      const nodes = [...(document ?? new Map<string, Set<string>>())].map(([key, values]) => ({ key, dependencies: values }));
      if (this.callableDependencies.replace(uri, nodes)) this.unindexedCallableDependencyUris.delete(uri);
      else this.unindexedCallableDependencyUris.add(uri);
    }
  }

  private clearFactoryConstructionCaches(): void {
    this.factoryConstructionSummaries.clear();
    this.callableDependencies.clear();
    this.callableDependenciesByUri.clear();
    this.unindexedCallableDependencyUris.clear();
  }

  private invalidateFileDerivedCaches(affectedTypes: ReadonlySet<string>, changedCallables: ReadonlySet<string>,
    topologyChanged: boolean, oldDependents: Set<string> | undefined): void {
    const nextDependents = this.dependentTypeNames(affectedTypes);
    if (!oldDependents || !nextDependents) this.constructorInitializationSummaries.clear();
    else for (const name of new Set([...oldDependents, ...nextDependents])) this.constructorInitializationSummaries.delete(name);

    const callableSeeds = new Set(changedCallables);
    for (const [key, result] of this.factoryConstructionSummaries) {
      if ((result !== null && affectedTypes.has(result.toLowerCase())) || (result === null && topologyChanged)) callableSeeds.add(key);
    }
    const affectedCallables = this.dependentCallableNames(callableSeeds);
    if (!affectedCallables) this.clearFactoryConstructionCaches();
    else {
      for (const key of affectedCallables) this.factoryConstructionSummaries.delete(key);
      this.removeCallableDependencyEntries(affectedCallables);
    }
  }

  update(uri: string, source: string, retainTree = false): SemanticUpdateResult {
    const oldFile = this.files.get(uri);
    const hasDerivedCaches = this.constructorInitializationSummaries.size > 0 || this.factoryConstructionSummaries.size > 0;
    const oldSource = oldFile?.source; const oldTree = retainTree ? this.trees.get(uri) : undefined;
    if (oldTree && oldSource !== undefined) oldTree.edit(createIncrementalEdit(oldSource, source));
    const parsed = this.parser.parse(source, oldTree, uri);
    const changedRanges = oldTree ? oldTree.getChangedRanges(parsed.tree).length : 0;
    try {
      const docBefore = (offset: number): ParsedPhpDoc | undefined => adjacentPhpDoc({ source, commentRanges: parsed.commentRanges }, offset);
      const callables = parsed.callables.map((callable) => {
        const doc = docBefore(callable.declarationStart);
        const docReturn = preferredDocTags(doc, (tag) => tag.name === 'return', () => 'return').at(-1)?.type;
        const container = callable.containerFqcn
          ? parsed.declarations.find((declaration) => declaration.fqcn.toLowerCase() === callable.containerFqcn!.toLowerCase()) : undefined;
        const containerTemplates = preferredDocTags(container ? docBefore(container.declarationStart) : undefined,
          (tag) => tag.name === 'template' && Boolean(tag.variable), (tag) => tag.variable!);
        const callableTemplates = preferredDocTags(doc, (tag) => tag.name === 'template' && Boolean(tag.variable), (tag) => tag.variable!);
        const templateTags = callableTemplates;
        const returnTemplateTags = [...new Map([...containerTemplates, ...callableTemplates].map((tag) => [tag.variable!, tag])).values()];
        const templateBounds = new Map(templateTags.filter((tag) => tag.type)
          .map((tag) => [tag.variable!, displayPhpDocType(tag.type!).replace(/^\\+/, '').toLowerCase()]));
        const returnTemplateBounds = new Map(returnTemplateTags.filter((tag) => tag.type)
          .map((tag) => [tag.variable!, displayPhpDocType(tag.type!).replace(/^\\+/, '').toLowerCase()]));
        const arrayKeyTemplates = new Set(templateTags.filter((tag) => tag.type && displayPhpDocType(tag.type).toLowerCase() === 'array-key')
          .map((tag) => tag.variable!));
        return {
          ...callable,
          parameters: callable.parameters.map((parameter) => {
            const docType = preferredDocTags(doc, (tag) => tag.name === 'param' && tag.variable === `$${parameter.name}`, (tag) => tag.variable ?? '').at(-1)?.type;
            const nativeTypeText = parameter.type?.toLowerCase();
            const native = nativeTypeText?.replace(/^\?/, '');
            const genericBase = docType?.kind === 'generic' && docType.base.kind === 'name'
              ? docType.base.name.replace(/^\\+/, '').toLowerCase() : undefined;
            const keyOfShape = genericBase === 'key-of' && docType?.kind === 'generic' && docType.arguments.length === 1
              && docType.arguments[0]?.kind === 'shape' && docType.arguments[0].shapeKind === 'array'
              && docType.arguments[0].fields.every((field) => field.key !== undefined);
            const keyOfFitsNative = keyOfShape && native ? docType.arguments[0]!.kind === 'shape'
              && docType.arguments[0]!.fields.every((field) => native.split('|').includes(/^-?\d+$/.test(field.key!) ? 'int' : 'string')) : false;
            const keyOfConstantFitsNative = genericBase === 'key-of' && native
              ? ['int', 'string'].every((part) => native.split('|').includes(part)) : false;
            const valueOfName = genericBase === 'value-of' && docType?.kind === 'generic' && docType.arguments.length === 1
              && docType.arguments[0]?.kind === 'name' && !docType.arguments[0].name.includes('::') ? docType.arguments[0].name : undefined;
            const valueOfCandidate = valueOfName ? ((): string => {
              if (valueOfName.startsWith('\\')) return valueOfName.slice(1);
              const [head, ...tail] = valueOfName.split('\\');
              const imported = parsed.imports.find((item) => item.kind === 'class' && item.namespace === parsed.namespace
                && item.alias.toLowerCase() === head!.toLowerCase());
              return imported ? [imported.fqcn, ...tail].join('\\') : [parsed.namespace, valueOfName].filter(Boolean).join('\\');
            })() : undefined;
            const valueOfDeclaration = valueOfCandidate
              ? parsed.declarations.find((item) => item.fqcn.toLowerCase() === valueOfCandidate.toLowerCase())
                ?? [...this.files.values()].flatMap((item) => item.declarations).find((item) => item.fqcn.toLowerCase() === valueOfCandidate.toLowerCase())
              : undefined;
            const valueOfEnumFitsNative = valueOfDeclaration?.kind === 'enum' && Boolean(valueOfDeclaration.enumBackingType)
              && native === valueOfDeclaration.enumBackingType?.toLowerCase();
            const projectionArgument = (genericBase === 'key-of' || genericBase === 'value-of') && docType?.kind === 'generic'
              && docType.arguments.length === 1 ? docType.arguments[0] : undefined;
            const projectionBase = projectionArgument?.kind === 'generic' && projectionArgument.base.kind === 'name'
              ? projectionArgument.base.name.toLowerCase() : undefined;
            const projectedType = genericBase === 'key-of'
              ? projectionArgument?.kind === 'array' ? 'int|string'
                : (projectionBase === 'list' || projectionBase === 'non-empty-list') ? 'int'
                  : (projectionBase === 'array' || projectionBase === 'non-empty-array')
                    ? (projectionArgument?.kind === 'generic' && projectionArgument.arguments.length === 2
                      ? displayPhpDocType(projectionArgument.arguments[0]!) : 'int|string') : undefined
              : genericBase === 'value-of'
                ? projectionArgument?.kind === 'array' ? displayPhpDocType(projectionArgument.element)
                  : ['array', 'non-empty-array', 'list', 'non-empty-list'].includes(projectionBase ?? '')
                    && projectionArgument?.kind === 'generic' && projectionArgument.arguments.length
                    ? displayPhpDocType(projectionArgument.arguments.at(-1)!) : undefined
                : undefined;
            const normalizeUnion = (value: string): string => value.replace(/\s+/g, '').toLowerCase().split('|').sort().join('|');
            const collectionProjectionFitsNative = Boolean(projectedType && native && normalizeUnion(projectedType) === normalizeUnion(native));
            const documentedRefinesNativePart = (type: PhpDocType, nativePart: string): boolean => {
              if (type.kind === 'array') return nativePart === 'array' || nativePart === 'iterable';
              if (type.kind === 'shape') return type.shapeKind === 'array' && (nativePart === 'array' || nativePart === 'iterable');
              if (type.kind === 'literal') {
                const literalPrimitive = typeof type.value === 'boolean' ? 'bool'
                  : typeof type.value === 'number' ? (Number.isInteger(type.value) ? 'int' : 'float') : 'string';
                return literalPrimitive === nativePart;
              }
              const base = type.kind === 'generic' && type.base.kind === 'name'
                ? type.base.name.replace(/^\\+/, '').toLowerCase() : type.kind === 'name' ? type.name.replace(/^\\+/, '').toLowerCase() : undefined;
              return base === nativePart
                || (type.kind === 'name' && templateBounds.get(type.name) === nativePart)
                || (nativePart === 'array' && ['list', 'non-empty-array', 'non-empty-list'].includes(base ?? ''))
                || (nativePart === 'iterable' && ['array', 'list', 'non-empty-array', 'non-empty-list'].includes(base ?? ''));
            };
            const nativeUnionParts = native?.split('|') ?? [];
            const refinesNativeUnion = docType?.kind === 'union' && nativeUnionParts.length > 1
              && docType.types.every((type) => nativeUnionParts.some((part) => documentedRefinesNativePart(type, part)))
              && nativeUnionParts.every((part) => docType.types.some((type) => documentedRefinesNativePart(type, part)));
            const refinesNative = !native
              || native === 'mixed'
              || (docType?.kind === 'name' && templateBounds.get(docType.name) === native)
              || genericBase === native.replace(/^\\/, '')
              || keyOfFitsNative
              || keyOfConstantFitsNative
              || valueOfEnumFitsNative
              || collectionProjectionFitsNative
              || refinesNativeUnion
              || (docType?.kind === 'name' && docType.name.toLowerCase() === 'null' && nativeTypeText?.startsWith('?'))
              || (native === 'string' && ((docType?.kind === 'name' && docType.name.toLowerCase() === 'class-string') || genericBase === 'class-string'))
              || (native === 'array' && (docType?.kind === 'array' || docType?.kind === 'shape' || ['array', 'list', 'non-empty-array', 'non-empty-list'].includes(genericBase ?? '')))
              || (native === 'iterable' && (docType?.kind === 'array' || ['array', 'iterable', 'list', 'non-empty-array', 'non-empty-list'].includes(genericBase ?? '')))
              || ((native === 'callable' || native.split('\\').at(-1) === 'closure') && docType?.kind === 'callable');
            return { ...parameter, type: docType && refinesNative ? displayPhpDocType(docType) : parameter.type };
          }),
          returnType: ((): string | undefined => {
            const documented = docReturn ? displayPhpDocType(docReturn) : undefined;
            const native = callable.returnType?.replace(/^\\/, '').toLowerCase();
            const documentedBase = docReturn?.kind === 'generic' && docReturn.base.kind === 'name'
              ? docReturn.base.name.replace(/^\\/, '').toLowerCase() : undefined;
            const refinesArrayType = (type: PhpDocType | undefined): boolean => {
              if (!type) return false;
              if (type.kind === 'conditional') return refinesArrayType(type.ifTrue) && refinesArrayType(type.ifFalse);
              const base = type.kind === 'generic' && type.base.kind === 'name'
                ? type.base.name.replace(/^\\/, '').toLowerCase() : undefined;
              return type.kind === 'array' || type.kind === 'shape'
                || ['array', 'list', 'non-empty-array', 'non-empty-list'].includes(base ?? '');
            };
            const refinesArray = native === 'array' && refinesArrayType(docReturn);
            const refinesIterable = native === 'iterable' && (docReturn?.kind === 'array'
              || ['array', 'iterable', 'list', 'non-empty-array', 'non-empty-list'].includes(documentedBase ?? ''));
            const documentedParts = documented?.replace(/\s+/g, '').split('|') ?? [];
            const nativeParts = native?.replace(/\s+/g, '').split('|')
              .flatMap((part) => part.startsWith('?') ? [part.slice(1), 'null'] : [part]).sort() ?? [];
            const refinesNullableArrayKey = nativeParts.join('|') === 'int|null|string'
              && documentedParts.length === 2 && documentedParts.includes('null')
              && documentedParts.some((part) => arrayKeyTemplates.has(part));
            const refinesClassString = native === 'string'
              && ((docReturn?.kind === 'name' && docReturn.name.toLowerCase() === 'class-string') || documentedBase === 'class-string');
            const refinesTemplateBound = docReturn?.kind === 'name' && returnTemplateBounds.get(docReturn.name) === native;
            const documentedRefinesNativePart = (type: PhpDocType, nativePart: string): boolean => {
              if (type.kind === 'array') return nativePart === 'array' || nativePart === 'iterable';
              if (type.kind === 'shape') return type.shapeKind === 'array' && (nativePart === 'array' || nativePart === 'iterable');
              if (type.kind === 'literal') {
                const literalPrimitive = typeof type.value === 'boolean' ? 'bool'
                  : typeof type.value === 'number' ? (Number.isInteger(type.value) ? 'int' : 'float') : 'string';
                return literalPrimitive === nativePart;
              }
              const base = type.kind === 'generic' && type.base.kind === 'name'
                ? type.base.name.replace(/^\\+/, '').toLowerCase() : type.kind === 'name' ? type.name.replace(/^\\+/, '').toLowerCase() : undefined;
              return base === nativePart || (nativePart === 'bool' && (base === 'true' || base === 'false'))
                || (type.kind === 'name' && returnTemplateBounds.get(type.name) === nativePart)
                || (nativePart === 'array' && ['list', 'non-empty-array', 'non-empty-list'].includes(base ?? ''))
                || (nativePart === 'iterable' && ['array', 'list', 'non-empty-array', 'non-empty-list'].includes(base ?? ''));
            };
            const refinesNativeUnion = docReturn?.kind === 'union' && nativeParts.length > 1
              && docReturn.types.every((type) => nativeParts.some((part) => documentedRefinesNativePart(type, part)))
              && nativeParts.every((part) => docReturn.types.some((type) => documentedRefinesNativePart(type, part)));
            const refinesNativeLiteralUnion = docReturn?.kind === 'union' && nativeParts.length === 1
              && docReturn.types.every((type) => (type.kind === 'literal'
                || (type.kind === 'name' && ['true', 'false'].includes(type.name.toLowerCase())))
                && documentedRefinesNativePart(type, nativeParts[0]!));
            const conditionalNativeParts = nativeParts;
            const conditionalBranchesRefineNative = (type: PhpDocType): boolean => type.kind === 'conditional'
              ? conditionalBranchesRefineNative(type.ifTrue) && conditionalBranchesRefineNative(type.ifFalse)
              : type.kind === 'union' ? type.types.every((part) => conditionalBranchesRefineNative(part))
              : conditionalNativeParts.some((part) => documentedRefinesNativePart(type, part));
            const refinesConditionalNative = docReturn?.kind === 'conditional' && conditionalNativeParts.length > 0
              && conditionalBranchesRefineNative(docReturn);
            const documentedLateStaticParts = docReturn?.kind === 'union' ? docReturn.types : docReturn ? [docReturn] : [];
            const nativeNonNullParts = nativeParts.filter((part) => part !== 'null');
            const containerName = callable.containerFqcn?.replace(/^\\+/, '').toLowerCase();
            const nativeStaticBase = nativeNonNullParts.length === 1 ? nativeNonNullParts[0]!.replace(/^\\+/, '') : undefined;
            const refinesLateStatic = Boolean(containerName && nativeStaticBase
              && (containerName === nativeStaticBase || containerName.split('\\').at(-1) === nativeStaticBase.split('\\').at(-1))
              && documentedLateStaticParts.some((part) => part.kind === 'name' && part.name.toLowerCase() === 'static')
              && documentedLateStaticParts.every((part) => part.kind === 'name' && ['static', 'null'].includes(part.name.toLowerCase()))
              && (!documentedLateStaticParts.some((part) => part.kind === 'name' && part.name.toLowerCase() === 'null') || nativeParts.includes('null')));
            return !callable.returnType || native === 'mixed' || (documentedBase !== undefined && documentedBase === native)
              || refinesArray || refinesIterable || refinesNullableArrayKey || refinesClassString || refinesTemplateBound || refinesNativeUnion
              || refinesNativeLiteralUnion || refinesConditionalNative || refinesLateStatic
              ? documented ?? callable.returnType : callable.returnType;
          })(),
        };
      });
      const properties = parsed.properties.map((property) => {
        const promotedType = property.promoted ? callables
          .find((callable) => callable.kind === 'method' && callable.name.toLowerCase() === '__construct'
            && callable.containerFqcn?.toLowerCase() === property.containerFqcn.toLowerCase())
          ?.parameters.find((parameter) => parameter.promoted && parameter.name === property.name)?.type : undefined;
        if (promotedType) return { ...property, type: promotedType };
        const documentedType = preferredPropertyVarTag(docBefore(property.declarationStart), property.name)?.type;
        const documented = documentedType ? displayPhpDocType(documentedType) : undefined;
        const native = property.type?.replace(/^\?/, '').replace(/^\\/, '').toLowerCase();
        const documentedBase = documentedType?.kind === 'generic' && documentedType.base.kind === 'name'
          ? documentedType.base.name.replace(/^\\/, '').toLowerCase()
          : documentedType?.kind === 'name' ? documentedType.name.replace(/^\\/, '').toLowerCase() : undefined;
        const collection = documentedType?.kind === 'array' || documentedType?.kind === 'shape'
          || ['array', 'list', 'non-empty-array', 'non-empty-list'].includes(documentedBase ?? '');
        const refinesNative = !property.type || native === 'mixed' || documentedBase === native
          || (native === 'array' && collection)
          || (native === 'iterable' && (collection || documentedBase === 'iterable'))
          || (native === 'string' && documentedBase === 'class-string')
          || ((native === 'callable' || native?.split('\\').at(-1) === 'closure') && documentedType?.kind === 'callable');
        return { ...property, type: documented && refinesNative ? documented : property.type };
      });
      const declarationTemplates = parsed.declarations.flatMap((declaration): SemanticTemplate[] => {
        if (declaration.anonymous) return [];
        return preferredDocTags(docBefore(declaration.declarationStart), (tag) => tag.name === 'template' && Boolean(tag.variable), (tag) => tag.variable!)
          .map((tag) => ({ ownerFqcn: declaration.fqcn, name: tag.variable!, bound: tag.type ? displayPhpDocType(tag.type) : undefined, variance: tag.variance ?? 'invariant' }));
      });
      const callableTemplates = callables.flatMap((callable): SemanticTemplate[] => preferredDocTags(docBefore(callable.declarationStart),
        (tag) => tag.name === 'template' && Boolean(tag.variable), (tag) => tag.variable!)
        .map((tag) => ({ ownerFqcn: callable.fqcn, name: tag.variable!, bound: tag.type ? displayPhpDocType(tag.type) : undefined, variance: tag.variance ?? 'invariant' })));
      const templates = [...declarationTemplates, ...callableTemplates];
      const genericParents = parsed.declarations.flatMap((declaration): SemanticGenericParent[] => {
        if (declaration.anonymous) return [];
        return preferredDocTags(docBefore(declaration.declarationStart), (tag) => tag.name === 'extends' || tag.name === 'implements', (tag) => tag.type ? displayPhpDocType(tag.type) : tag.name)
          .flatMap((tag): SemanticGenericParent[] => {
          if ((tag.name !== 'extends' && tag.name !== 'implements') || tag.type?.kind !== 'generic' || tag.type.base.kind !== 'name') return [];
          return [{ ownerFqcn: declaration.fqcn, kind: tag.name, parentName: tag.type.base.name, arguments: tag.type.arguments.map(displayPhpDocType) }];
        });
      });
      const magicMembers = parsed.declarations.flatMap((declaration): SemanticMagicMember[] => {
        if (declaration.anonymous) return [];
        const doc = docBefore(declaration.declarationStart);
        const tags = preferredDocTags(doc, (tag) => ['property', 'property-read', 'property-write', 'method'].includes(tag.name),
          (tag) => tag.name === 'method'
            ? `method:${tag.static ?? false}:${tag.variable ?? ''}:${(tag.templates ?? []).map((template) => `${template.name}:${template.bound ? displayPhpDocType(template.bound) : ''}:${template.defaultType ? displayPhpDocType(template.defaultType) : ''}`).join(',')}:${(tag.parameters ?? []).map((parameter) => `${displayPhpDocType(parameter.type)}:${parameter.name ?? ''}:${parameter.optional}:${parameter.variadic}`).join(',')}:${tag.type ? displayPhpDocType(tag.type) : ''}`
            : `${tag.name}:${tag.variable ?? ''}`);
        const members: SemanticMagicMember[] = tags.flatMap((tag): SemanticMagicMember[] => {
          if (!tag.type || !tag.variable) return [];
          const returnType = displayPhpDocType(tag.type);
          if (tag.name === 'property' || tag.name === 'property-read' || tag.name === 'property-write') return [];
          if (tag.name !== 'method' || !tag.parameters) return [];
          const parameters = tag.parameters.map((parameter, index): ParsedParameter => ({
            name: parameter.name ?? `arg${index + 1}`, type: displayPhpDocType(parameter.type),
            defaultValue: parameter.optional ? 'null' : undefined, promoted: false, variadic: parameter.variadic, byReference: false,
            start: tag.start, end: tag.end,
          }));
          const methodFqcn = `${declaration.fqcn}::${tag.variable}`;
          const methodTemplates = tag.templates?.map((template): SemanticTemplate => ({ ownerFqcn: methodFqcn, name: template.name,
            bound: template.bound ? displayPhpDocType(template.bound) : undefined,
            default: template.defaultType ? displayPhpDocType(template.defaultType) : undefined, variance: 'invariant' }));
          return [{ ownerFqcn: declaration.fqcn, kind: 'method', name: tag.variable, parameters, returnType,
            static: tag.static ?? false, templates: methodTemplates, start: tag.start, end: tag.end }];
        });
        const properties = new Map<string, SemanticMagicMember>();
        for (const tag of tags.filter((item) => item.name === 'property' || item.name === 'property-read' || item.name === 'property-write')) {
          if (!tag.type || !tag.variable) continue;
          const name = tag.variable.slice(1); const current = properties.get(name);
          const readable = tag.name !== 'property-write'; const writable = tag.name !== 'property-read';
          properties.set(name, { ownerFqcn: declaration.fqcn, kind: 'property', name, parameters: [], static: false,
            start: current?.start ?? tag.start, end: Math.max(current?.end ?? tag.end, tag.end),
            returnType: readable ? displayPhpDocType(tag.type) : current?.returnType,
            writeType: writable ? displayPhpDocType(tag.type) : current?.writeType,
            readable: Boolean(current?.readable || readable), writable: Boolean(current?.writable || writable) });
        }
        return [...members, ...properties.values()];
      });
      const scopes = parsed.scopes.map((scope) => ({ ...scope, parameters: callables.find((callable) => callable.fqcn === scope.id)?.parameters ?? scope.parameters }));
      const nextFile: SemanticFile = { uri, source, namespace: parsed.namespace, declarations: parsed.declarations, callables, scopes, variableReferences: parsed.variableReferences, returns: parsed.returns, narrowings: parsed.narrowings, properties, constants: parsed.constants, imports: parsed.imports, typeReferences: parsed.typeReferences, assignments: parsed.assignments, rawNames: parsed.rawNames, memberAccesses: parsed.memberAccesses, calls: parsed.calls, templates, genericParents, magicMembers, syntaxErrors: parsed.errors, commentRanges: parsed.commentRanges, stringRanges: parsed.stringRanges };
      const oldTypeSurfaces = semanticTypeSurfaces(oldFile); const nextTypeSurfaces = semanticTypeSurfaces(nextFile);
      const changedTypes = changedMapKeys(oldTypeSurfaces, nextTypeSurfaces);
      const declarationChanged = semanticFileSurface(oldFile, oldTypeSurfaces) !== semanticFileSurface(nextFile, nextTypeSurfaces);
      const changedCallables = changedMapKeys(implementationSlices(oldFile), implementationSlices(nextFile));
      const implementationChanged = changedCallables.size > 0
        || (oldFile !== undefined && oldFile.source.trimEnd() !== nextFile.source.trimEnd());
      if (declarationChanged) {
        for (const callable of [...(oldFile?.callables ?? []), ...nextFile.callables]) changedCallables.add(callable.fqcn.toLowerCase());
        if (changedTypes.size === 0) for (const name of new Set([...oldTypeSurfaces.keys(), ...nextTypeSurfaces.keys()])) changedTypes.add(name);
      }
      const affectedTypes = new Set(changedTypes);
      for (const callable of changedCallables) {
        const separator = callable.lastIndexOf('::');
        if (separator > 0 && callable.slice(separator + 2) === '__construct') affectedTypes.add(callable.slice(0, separator));
        else if (separator > 0 && callable.slice(separator + 2).startsWith('$')) affectedTypes.add(callable.slice(0, separator));
      }
      const oldTypeNames = new Set(oldTypeSurfaces.keys()); const nextTypeNames = new Set(nextTypeSurfaces.keys());
      const topologyChanged = oldTypeNames.size !== nextTypeNames.size || [...oldTypeNames].some((name) => !nextTypeNames.has(name));
      const oldDependents = hasDerivedCaches && affectedTypes.size > 0 ? this.dependentTypeNames(affectedTypes) : new Set<string>();
      const controlFlowAssignments = new Set<number>();
      const controlNodes = new Set(['if_statement', 'switch_statement', 'try_statement', 'while_statement', 'do_statement', 'for_statement', 'foreach_statement']);
      const scopeBoundaries = new Set(['function_definition', 'method_declaration', 'anonymous_function', 'arrow_function']);
      const assignmentStarts = [...new Set(parsed.assignments.map((assignment) => assignment.start))].sort((left, right) => left - right);
      const containsAssignment = (start: number, end: number): boolean => {
        let low = 0; let high = assignmentStarts.length;
        while (low < high) {
          const middle = (low + high) >>> 1;
          if (assignmentStarts[middle]! < start) low = middle + 1; else high = middle;
        }
        return low < assignmentStarts.length && assignmentStarts[low]! < end;
      };
      const syntaxStack: Array<{ node: SyntaxNode; inControlFlow: boolean }> = [{ node: parsed.tree.rootNode, inControlFlow: false }];
      while (syntaxStack.length) {
        const current = syntaxStack.pop()!;
        if (!containsAssignment(current.node.startIndex, current.node.endIndex)) continue;
        if (current.node.type === 'assignment_expression' && current.inControlFlow) controlFlowAssignments.add(current.node.startIndex);
        const childInControlFlow = scopeBoundaries.has(current.node.type) ? false
          : current.inControlFlow || controlNodes.has(current.node.type);
        for (const child of current.node.namedChildren) syntaxStack.push({ node: child, inControlFlow: childInControlFlow });
      }
      this.files.set(uri, nextFile);
      this.replaceReferenceCandidates(nextFile);
      this.replaceTypeDependencies(nextFile);
      this.assertedTargetInferenceCache.clear();
      this.controlFlowAssignments.set(uri, controlFlowAssignments);
      if (hasDerivedCaches && (affectedTypes.size > 0 || changedCallables.size > 0)) {
        this.invalidateFileDerivedCaches(affectedTypes, changedCallables, topologyChanged, oldDependents);
      }
      this.trees.delete(uri);
      if (retainTree) this.trees.set(uri, parsed.tree);
      return {
        incremental: Boolean(oldTree), changedRanges,
        kind: declarationChanged ? 'declaration' : implementationChanged ? 'implementation' : 'none',
        changedCallables: [...changedCallables].sort(), changedTypes: [...changedTypes].sort(),
      };
    } finally {
      oldTree?.delete();
      if (!retainTree) parsed.tree.delete();
    }
  }
  remove(uri: string): void {
    const oldFile = this.files.get(uri);
    const hasDerivedCaches = this.constructorInitializationSummaries.size > 0 || this.factoryConstructionSummaries.size > 0;
    const affectedTypes = new Set((oldFile?.declarations ?? []).map((item) => item.fqcn.toLowerCase()));
    const changedCallables = new Set((oldFile?.callables ?? []).map((item) => item.fqcn.toLowerCase()));
    const oldDependents = hasDerivedCaches
      ? this.dependentTypeNames(affectedTypes)
      : new Set<string>();
    this.files.delete(uri); this.referenceCandidates.remove(uri); this.unindexedReferenceCandidateUris.delete(uri);
    this.typeDependencies.remove(uri); this.unindexedTypeDependencyUris.delete(uri);
    this.assertedTargetInferenceCache.clear(); this.controlFlowAssignments.delete(uri); this.trees.get(uri)?.delete(); this.trees.delete(uri);
    if (hasDerivedCaches) this.invalidateFileDerivedCaches(affectedTypes, changedCallables, true, oldDependents);
  }
  dispose(): void { for (const tree of this.trees.values()) tree.delete(); this.trees.clear(); this.files.clear(); this.referenceCandidates.clear(); this.unindexedReferenceCandidateUris.clear(); this.typeDependencies.clear(); this.unindexedTypeDependencyUris.clear(); this.controlFlowAssignments.clear(); this.externalFacts.clear(); this.constructorInitializationSummaries.clear(); this.clearFactoryConstructionCaches(); this.assertedTargetInferenceCache.clear(); this.readonlyAnalysisInProgress.clear(); }
  replaceExternalFacts(contribution: SemanticFactsContribution): boolean {
    if (!isSemanticFactsContribution(contribution)) return false;
    this.assertedTargetInferenceCache.clear();
    this.externalFacts.set(contribution.providerId, semanticFacts(contribution.providerId, contribution.generation, {
      complete: contribution.complete,
      methods: contribution.methods.map((fact) => ({ ...fact })),
      properties: contribution.properties.map((fact) => ({ ...fact })),
      literalMethodReturns: contribution.literalMethodReturns.map((fact) => ({ ...fact })),
    }));
    this.constructorInitializationSummaries.clear(); this.clearFactoryConstructionCaches();
    return true;
  }
  removeExternalFacts(providerId: string): boolean {
    const removed = this.externalFacts.delete(providerId);
    if (removed) { this.constructorInitializationSummaries.clear(); this.clearFactoryConstructionCaches(); }
    return removed;
  }
  /** @deprecated Submit one atomic SemanticFactsContribution with replaceExternalFacts(). */
  replaceExternalMethods(provider: string, facts: ExternalMethodFact[]): void {
    const current = this.externalFacts.get(provider); this.replaceExternalFacts(semanticFacts(provider, current?.generation ?? 'legacy', { complete: current?.complete, methods: facts, properties: current?.properties, literalMethodReturns: current?.literalMethodReturns }));
  }
  /** @deprecated Submit one atomic SemanticFactsContribution with replaceExternalFacts(). */
  replaceExternalProperties(provider: string, facts: ExternalPropertyFact[]): void {
    const current = this.externalFacts.get(provider); this.replaceExternalFacts(semanticFacts(provider, current?.generation ?? 'legacy', { complete: current?.complete, methods: current?.methods, properties: facts, literalMethodReturns: current?.literalMethodReturns }));
  }
  /** @deprecated Submit one atomic SemanticFactsContribution with replaceExternalFacts(). */
  replaceExternalLiteralMethodReturns(provider: string, facts: ExternalLiteralMethodReturnFact[]): void {
    const current = this.externalFacts.get(provider); this.replaceExternalFacts(semanticFacts(provider, current?.generation ?? 'legacy', { complete: current?.complete, methods: current?.methods, properties: current?.properties, literalMethodReturns: facts }));
  }
  source(uri: string): string | undefined { return this.files.get(uri)?.source; }
  snapshot(uri: string): SemanticSnapshot | undefined {
    const file = this.files.get(uri); const referencesIndexed = !this.unindexedReferenceCandidateUris.has(uri);
    const dependenciesIndexed = !this.unindexedTypeDependencyUris.has(uri); return file ? {
      schema: 72,
      layers: {
        referenceCandidates: { indexed: referencesIndexed, keys: referencesIndexed ? this.referenceCandidates.documentKeys(uri) : [] },
        typeDependencies: { indexed: dependenciesIndexed, nodes: dependenciesIndexed ? this.typeDependencies.documentNodes(uri) : [] },
      },
      file: JSON.parse(JSON.stringify(file)) as SemanticFileSnapshot,
    } : undefined;
  }
  callableConstructionFacts(uri?: string): CallableConstructionFactDocument[] {
    const documents = uri === undefined ? [...this.callableDependenciesByUri] : [[uri, this.callableDependenciesByUri.get(uri)] as const];
    return documents.flatMap(([documentUri, dependencies]) => {
      if (!dependencies) return [];
      const facts = [...dependencies].flatMap(([callable, targets]) => {
        const result = this.factoryConstructionSummaries.get(callable);
        return typeof result === 'string' ? [{ callable, result, dependencies: [...targets].sort() }] : [];
      }).sort((left, right) => left.callable.localeCompare(right.callable));
      return facts.length ? [{ uri: documentUri, facts }] : [];
    }).sort((left, right) => left.uri.localeCompare(right.uri));
  }
  restoreCallableConstructionFacts(documents: unknown): number {
    this.clearFactoryConstructionCaches();
    if (!Array.isArray(documents) || documents.length > 10_000) return 0;
    let totalFacts = 0;
    const callableOwners = new Map<string, Array<{ file: SemanticFile; callable: ParsedCallableDeclaration }>>();
    const typeOwners = new Map<string, ParsedDeclaration[]>();
    for (const file of this.files.values()) {
      for (const callable of file.callables) {
        const key = callable.fqcn.toLowerCase(); const owners = callableOwners.get(key) ?? [];
        owners.push({ file, callable }); callableOwners.set(key, owners);
      }
      for (const declaration of file.declarations.filter((item) => !item.anonymous)) {
        const key = declaration.fqcn.toLowerCase(); const owners = typeOwners.get(key) ?? [];
        owners.push(declaration); typeOwners.set(key, owners);
      }
    }
    type Candidate = { uri: string; fact: CallableConstructionFact };
    const candidates = new Map<string, Candidate>(); const duplicates = new Set<string>();
    for (const value of documents) {
      if (!value || typeof value !== 'object') continue;
      const document = value as Partial<CallableConstructionFactDocument>;
      const file = typeof document.uri === 'string' && document.uri.length <= 32_768 ? this.files.get(document.uri) : undefined;
      if (!file || !Array.isArray(document.facts) || document.facts.length > 10_000) continue;
      totalFacts += document.facts.length;
      if (totalFacts > 100_000) { this.clearFactoryConstructionCaches(); return 0; }
      for (const valueFact of document.facts) {
        if (!valueFact || typeof valueFact !== 'object') continue;
        const fact = valueFact as Partial<CallableConstructionFact>;
        if (typeof fact.callable !== 'string' || fact.callable.length < 1 || fact.callable.length > 1_024
          || fact.callable !== fact.callable.toLowerCase() || typeof fact.result !== 'string' || fact.result.length < 1 || fact.result.length > 1_024
          || !Array.isArray(fact.dependencies) || fact.dependencies.length > 256
          || fact.dependencies.some((dependency) => typeof dependency !== 'string' || dependency.length < 1 || dependency.length > 1_024
            || dependency !== dependency.toLowerCase() || dependency === fact.callable)
          || new Set(fact.dependencies).size !== fact.dependencies.length) continue;
        const caller = callableOwners.get(fact.callable);
        const result = typeOwners.get(fact.result.toLowerCase());
        if (caller?.length !== 1 || caller[0]!.file !== file || result?.length !== 1
          || fact.dependencies.some((dependency) => callableOwners.get(dependency)?.length !== 1)) continue;
        if (candidates.has(fact.callable)) duplicates.add(fact.callable);
        else candidates.set(fact.callable, { uri: document.uri!, fact: fact as CallableConstructionFact });
      }
    }
    for (const duplicate of duplicates) candidates.delete(duplicate);
    const accepted = new Map<string, Candidate>(); let progressed = true;
    while (progressed) {
      progressed = false;
      for (const [key, candidate] of candidates) {
        if (accepted.has(key) || candidate.fact.dependencies.some((dependency) => !candidates.has(dependency))) continue;
        if (!candidate.fact.dependencies.every((dependency) => accepted.get(dependency)?.fact.result.toLowerCase() === candidate.fact.result.toLowerCase())) continue;
        accepted.set(key, candidate); progressed = true;
      }
    }
    const byUri = new Map<string, Array<[string, Set<string>]>>();
    for (const [key, candidate] of accepted) {
      this.factoryConstructionSummaries.set(key, candidate.fact.result);
      const entries = byUri.get(candidate.uri) ?? [];
      entries.push([key, new Set(candidate.fact.dependencies)]); byUri.set(candidate.uri, entries);
    }
    for (const [documentUri, entries] of byUri) {
      const document = new Map(entries); this.callableDependenciesByUri.set(documentUri, document);
      const nodes = [...document].map(([key, values]) => ({ key, dependencies: values }));
      if (this.callableDependencies.replace(documentUri, nodes)) this.unindexedCallableDependencyUris.delete(documentUri);
      else this.unindexedCallableDependencyUris.add(documentUri);
    }
    return accepted.size;
  }
  restore(snapshot: unknown, expectedUri?: string): boolean {
    const value = snapshot as Partial<SemanticSnapshot> | null; const file = value?.file as Partial<SemanticFileSnapshot> | undefined;
    const references = value?.layers?.referenceCandidates; const dependencies = value?.layers?.typeDependencies;
    if (value?.schema !== 72 || !file || typeof file.uri !== 'string' || typeof file.source !== 'string' || (expectedUri !== undefined && file.uri !== expectedUri)
      || !references || typeof references.indexed !== 'boolean' || !Array.isArray(references.keys)
      || references.keys.length > 100_000 || !references.keys.every((key) => typeof key === 'string' && key.length > 0 && key.length <= 1_024)
      || !dependencies || typeof dependencies.indexed !== 'boolean' || !Array.isArray(dependencies.nodes)
      || dependencies.nodes.length > 10_000 || !dependencies.nodes.every((node) => node && typeof node === 'object'
        && typeof node.key === 'string' && node.key.length > 0 && node.key.length <= 1_024
        && Array.isArray(node.dependencies) && node.dependencies.length <= 10_000
        && node.dependencies.every((dependency) => typeof dependency === 'string' && dependency.length > 0 && dependency.length <= 1_024))
      || new Set(dependencies.nodes.map((node) => node.key)).size !== dependencies.nodes.length) return false;
    if (![file.declarations, file.callables, file.imports, file.typeReferences, file.assignments, file.properties, file.constants, file.rawNames, file.memberAccesses, file.calls, file.narrowings, file.variableReferences, file.returns, file.templates, file.genericParents, file.magicMembers, file.syntaxErrors, file.commentRanges, file.stringRanges].every(Array.isArray)) return false;
    if (!Array.isArray(file.scopes) || !file.scopes.every((scope) => Array.isArray(scope.captures))) return false;
    const restoredFile = file as SemanticFileSnapshot;
    const expectedReferenceKeys = [...referenceCandidateKeys(restoredFile)].sort();
    const expectedDependencyNodes = this.typeDependencyNodes(restoredFile)
      .map((node) => ({ key: node.key, dependencies: [...new Set(node.dependencies)].sort() }))
      .sort((left, right) => left.key.localeCompare(right.key));
    if (references.indexed && JSON.stringify([...new Set(references.keys)].sort()) !== JSON.stringify(expectedReferenceKeys)
      || !references.indexed && references.keys.length > 0
      || dependencies.indexed && JSON.stringify(dependencies.nodes.map((node) => ({ key: node.key, dependencies: [...new Set(node.dependencies)].sort() })).sort((left, right) => left.key.localeCompare(right.key))) !== JSON.stringify(expectedDependencyNodes)
      || !dependencies.indexed && dependencies.nodes.length > 0) return false;
    this.files.set(file.uri, restoredFile);
    if (references.indexed) {
      this.referenceCandidates.replace(file.uri, references.keys); this.unindexedReferenceCandidateUris.delete(file.uri);
    } else {
      this.replaceReferenceCandidates(restoredFile);
    }
    if (dependencies.indexed) {
      this.typeDependencies.replace(file.uri, dependencies.nodes); this.unindexedTypeDependencyUris.delete(file.uri);
    } else {
      this.replaceTypeDependencies(restoredFile);
    }
    this.assertedTargetInferenceCache.clear(); this.constructorInitializationSummaries.clear(); this.clearFactoryConstructionCaches(); return true;
  }

  workspaceSymbols(query: string, limit = 100): WorkspaceSymbolInfo[] {
    const needle = query.toLowerCase(); const symbols: WorkspaceSymbolInfo[] = [];
    for (const file of this.files.values()) {
      symbols.push(...file.declarations.filter((item) => !item.anonymous).map((item) => ({ uri: file.uri, start: item.start, end: item.end, name: item.name, kind: item.kind })));
      symbols.push(...file.callables.map((item) => ({ uri: file.uri, start: item.start, end: item.end, name: item.name, kind: item.kind, container: item.containerFqcn })));
      symbols.push(...file.properties.map((item) => ({ uri: file.uri, start: item.start, end: item.end, name: `$${item.name}`, kind: 'property' as const, container: item.containerFqcn })));
      symbols.push(...file.constants.map((item) => ({ uri: file.uri, start: item.start, end: item.end, name: item.name, kind: 'constant' as const, container: item.containerFqcn })));
    }
    return symbols.filter((item) => item.name.toLowerCase().includes(needle)).sort((left, right) => {
      const leftPrefix = left.name.toLowerCase().startsWith(needle); const rightPrefix = right.name.toLowerCase().startsWith(needle);
      return Number(rightPrefix) - Number(leftPrefix) || left.name.localeCompare(right.name) || left.uri.localeCompare(right.uri) || left.start - right.start;
    }).slice(0, Math.max(0, limit));
  }

  workspaceTypes(): Array<TypeInfo & { abstract: boolean }> {
    return [...this.files.values()].flatMap((file) => file.declarations.filter((item) => !item.anonymous).map((item) => ({
      uri: file.uri, start: item.start, end: item.end, name: item.name, fqcn: item.fqcn, kind: item.kind,
      abstract: item.kind === 'class' && /\babstract\b/i.test(file.source.slice(item.declarationStart, item.start)),
    })));
  }

  workspaceFunctions(): FunctionCompletionInfo[] {
    return [...this.files.values()].flatMap((file) => file.callables.filter((item) => item.kind === 'function').map((item) => ({
      uri: file.uri, start: item.start, end: item.end, name: item.name, fqcn: item.fqcn,
      parameters: item.parameters, returnType: item.returnType,
    })));
  }

  workspaceConstants(): ConstantCompletionInfo[] {
    return [...this.files.values()].flatMap((file) => file.constants.filter((item) => item.global).map((item) => ({
      uri: file.uri, start: item.start, end: item.end, name: item.name, fqcn: item.fqcn, type: item.type, value: item.value,
    })));
  }

  constructorParameterAt(uri: string, offset: number): ConstructorParameterInfo | undefined {
    return this.injectableParameterAt(uri, offset, (callable) => callable.name.toLowerCase() === '__construct' ? { callableFqcn: callable.fqcn } : undefined);
  }

  methodParameterAt(uri: string, offset: number): ConstructorParameterInfo | undefined {
    return this.injectableParameterAt(uri, offset, (callable) => callable.name.toLowerCase() !== '__construct' && callable.visibility === 'public'
      ? { callableFqcn: callable.fqcn } : undefined);
  }

  requiredMethodParameterAt(uri: string, offset: number): ConstructorParameterInfo | undefined {
    return this.injectableParameterAt(uri, offset, (callable, file) => {
      if (callable.name.toLowerCase() === '__construct' || callable.visibility !== 'public') return undefined;
      const hasRequired = (candidate: ParsedCallableDeclaration, ownerFile: SemanticFile): boolean => {
        const namespace = candidate.containerFqcn!.split('\\').slice(0, -1).join('\\');
        const prefix = ownerFile.source.slice(candidate.declarationStart, candidate.start);
        return [...prefix.matchAll(/#\[\s*(\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)/g)]
          .some((match) => this.resolveSourceType(ownerFile, match[1]!, namespace, candidate.containerFqcn) === 'Symfony\\Contracts\\Service\\Attribute\\Required');
      };
      const required = hasRequired(callable, file) || [...this.files.values()].some((ownerFile) => ownerFile.callables.some((candidate) =>
        candidate.kind === 'method' && candidate.containerFqcn && candidate.visibility !== 'private'
        && candidate.name.toLowerCase() === callable.name.toLowerCase() && candidate.fqcn.toLowerCase() !== callable.fqcn.toLowerCase()
        && this.isSubclassOf(callable.containerFqcn!, candidate.containerFqcn) && hasRequired(candidate, ownerFile)));
      return required ? { requiredMethodName: callable.name } : undefined;
    });
  }

  requiredPropertyAt(uri: string, offset: number): ConstructorParameterInfo | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    for (const property of file.properties.filter((item) => !item.promoted && !item.static && item.visibility === 'public')) {
      const nativeType = property.type?.replace(/\s+/g, '');
      if (!nativeType || !/^\??[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*$/.test(nativeType)) continue;
      const ownerFqcn = property.containerFqcn; const namespace = ownerFqcn.split('\\').slice(0, -1).join('\\');
      const typeStart = file.source.lastIndexOf(nativeType, property.start);
      if (typeStart < property.declarationStart || typeStart + nativeType.length > property.start || offset < typeStart || offset > property.end) continue;
      const prefix = file.source.slice(property.declarationStart, typeStart);
      const attributes = [...prefix.matchAll(/#\[\s*(\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)/g)];
      if (!attributes.some((match) => this.resolveSourceType(file, match[1]!, namespace, ownerFqcn) === 'Symfony\\Contracts\\Service\\Attribute\\Required')) continue;
      const typeFqcn = this.resolveSourceType(file, nativeType.replace(/^\?/, ''), namespace, ownerFqcn);
      if (!typeFqcn || !this.fileAndDeclaration(typeFqcn)) return undefined;
      const target = /#\[\s*(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\\)?Target\s*\(\s*(['"])([^'"\\]+)\1\s*\)\s*\]/s.exec(prefix);
      const explicitWiring = /#\[\s*(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\\)?Autowire\b/s.test(prefix)
        || (/#\[\s*(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\\)?Target\b/s.test(prefix) && !target);
      return { uri, start: typeStart, end: property.end, ownerFqcn, name: property.name, typeFqcn, typeFqcns: [typeFqcn], typeGroups: [[typeFqcn]], typeStart, typeEnd: typeStart + nativeType.length, explicitWiring, targetName: target?.[2], requiredPropertyName: property.name };
    }
    return undefined;
  }

  private injectableParameterAt(uri: string, offset: number, accept: (callable: ParsedCallableDeclaration, file: SemanticFile) => Partial<Pick<ConstructorParameterInfo, 'requiredMethodName' | 'callableFqcn'>> | undefined): ConstructorParameterInfo | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    for (const callable of file.callables.filter((item) => item.kind === 'method' && item.containerFqcn)) {
      const accepted = accept(callable, file); if (!accepted) continue;
      const open = file.source.indexOf('(', callable.end); if (open < 0 || open >= callable.declarationEnd) continue;
      for (let index = 0; index < callable.parameters.length; index += 1) {
        const parameter = callable.parameters[index]!; const nativeType = parameter.nativeType;
        if (!nativeType) continue;
        const normalizedType = nativeType.replace(/\s+/g, '').replace(/^\?/, '');
        const namedType = /^[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*$/;
        const topLevel = normalizedType.split(/\|(?![^()]*\))/);
        const rawGroups = topLevel.map((branch) => branch.startsWith('(') && branch.endsWith(')')
          ? branch.slice(1, -1).split('&') : topLevel.length === 1 ? branch.split('&') : [branch]);
        if (!rawGroups.length || rawGroups.some((group) => !group.length || group.some((name) => !namedType.test(name)))) continue;
        const dnf = rawGroups.some((group) => group.length > 1) && rawGroups.length > 1;
        if (!dnf && /[()]/.test(normalizedType)) continue;
        const segmentStart = index === 0 ? open + 1 : callable.parameters[index - 1]!.end;
        const typeStart = file.source.lastIndexOf(nativeType, parameter.start);
        if (typeStart < segmentStart || typeStart + nativeType.length > parameter.start) continue;
        const start = typeStart; const end = parameter.end;
        if (offset < start || offset > end) continue;
        const namespace = callable.containerFqcn!.split('\\').slice(0, -1).join('\\');
        const objectGroups = rawGroups.flatMap((group) => {
          const objectNames = group.filter((name) => !BUILTIN_PARAMETER_TYPES.has(name.toLowerCase()));
          return objectNames.length ? [objectNames] : [];
        });
        const typeGroups = objectGroups.map((group) => group.flatMap((name) => {
          const resolved = this.resolveSourceType(file, name, namespace, callable.containerFqcn);
          return resolved && this.fileAndDeclaration(resolved) ? [resolved] : [];
        }).sort((left, right) => left < right ? -1 : left > right ? 1 : 0));
        if (!typeGroups.length || typeGroups.some((group, index) => group.length !== objectGroups[index]!.length)) return undefined;
        const operator = dnf ? 'dnf' : normalizedType.includes('|') ? 'union' : normalizedType.includes('&') ? 'intersection' : undefined;
        const branches = typeGroups.map((group) => group.length > 1 && operator === 'dnf' ? `(${group.join('&')})` : group.join('&'))
          .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
        const typeFqcn = branches.join(operator === 'union' || operator === 'dnf' ? '|' : operator === 'intersection' ? '&' : '');
        const typeFqcns = [...new Set(typeGroups.flat())].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
        const prefix = file.source.slice(segmentStart, typeStart);
        const target = /#\[\s*(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\\)?Target\s*\(\s*(['"])([^'"\\]+)\1\s*\)\s*\]/s.exec(prefix);
        const explicitWiring = /#\[\s*(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\\)?Autowire\b/s.test(prefix)
          || (/#\[\s*(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\\)?Target\b/s.test(prefix) && !target);
        return { uri, start, end, ownerFqcn: callable.containerFqcn!, name: parameter.name, parameterIndex: index, typeFqcn, typeFqcns, typeGroups, typeOperator: operator, typeStart, typeEnd: typeStart + nativeType.length, explicitWiring, targetName: target?.[2], ...accepted };
      }
    }
    return undefined;
  }

  isSubtype(candidateFqcn: string, targetFqcn: string): boolean {
    return this.isSubclassOf(candidateFqcn, targetFqcn);
  }

  extractVariable(uri: string, selectionStart: number, selectionEnd: number): ExtractVariableInfo | undefined {
    const file = this.files.get(uri); const tree = this.trees.get(uri); if (!file || !tree || selectionStart >= selectionEnd) return undefined;
    let start = selectionStart; let end = selectionEnd;
    while (start < end && /\s/.test(file.source[start]!)) start += 1;
    while (end > start && /\s/.test(file.source[end - 1]!)) end -= 1;
    const expression = deepestLocalSyntax(tree.rootNode, start, end,
      (node) => node.startIndex === start && node.endIndex === end);
    if (!expression) return undefined;
    const invalid = new Set(['assignment_expression', 'augmented_assignment_expression', 'yield_expression', 'include_expression', 'include_once_expression', 'require_expression', 'require_once_expression']);
    let malformed = false;
    const inspection = walkLocalSyntax(expression, (node) => {
      if (node.isError || node.isMissing || invalid.has(node.type)) malformed = true;
      return malformed ? 'stop' : 'descend';
    });
    if (!inspection.complete || malformed || ['variable_name', 'name', 'qualified_name'].includes(expression.type)) return undefined;
    const parent = expression.parent; let statement: SyntaxNode | undefined;
    if (parent?.type === 'assignment_expression') {
      const left = parent.childForFieldName('left'); const right = parent.childForFieldName('right');
      if (left?.type !== 'variable_name' || right?.startIndex !== expression.startIndex || right.endIndex !== expression.endIndex || parent.parent?.type !== 'expression_statement') return undefined;
      statement = parent.parent;
    } else if (parent?.type === 'return_statement' && parent.namedChildren[0]?.startIndex === expression.startIndex && parent.namedChildren[0].endIndex === expression.endIndex) statement = parent;
    else return undefined;
    if (statement.parent?.type !== 'compound_statement') return undefined;
    const lineStart = file.source.lastIndexOf('\n', Math.max(0, statement.startIndex - 1)) + 1;
    const leading = file.source.slice(lineStart, statement.startIndex); if (!/^\s*$/.test(leading)) return undefined;
    const scope = this.containingScope(file, statement.startIndex); if (!scope) return undefined;
    const names = new Set([
      ...file.variableReferences.filter((item) => item.scopeId === scope.id).map((item) => item.variable.slice(1)),
      ...file.assignments.filter((item) => item.scopeId === scope.id).map((item) => item.variable.slice(1)),
    ]);
    let variable = 'extracted'; for (let suffix = 2; names.has(variable); suffix += 1) variable = `extracted${suffix}`;
    return { uri, expressionStart: start, expressionEnd: end, statementStart: lineStart, variable, indent: leading, expression: file.source.slice(start, end) };
  }

  inlineVariable(uri: string, offset: number): InlineVariableInfo | undefined {
    const file = this.files.get(uri); const tree = this.trees.get(uri); if (!file || !tree) return undefined;
    const variable = deepestLocalSyntax(tree.rootNode, offset, offset, (node) => node.type === 'variable_name');
    const assignment = variable?.parent;
    if (!variable || assignment?.type !== 'assignment_expression' || assignment.childForFieldName('left')?.startIndex !== variable.startIndex
      || assignment.parent?.type !== 'expression_statement' || assignment.parent.parent?.type !== 'compound_statement') return undefined;
    const right = assignment.childForFieldName('right'); if (!right || /=\s*&/.test(assignment.text)) return undefined;
    let malformed = false;
    const inspection = walkLocalSyntax(right, (node) => {
      if (node.isError || node.isMissing || ['assignment_expression', 'augmented_assignment_expression', 'yield_expression'].includes(node.type)) malformed = true;
      return malformed ? 'stop' : 'descend';
    });
    if (!inspection.complete || malformed) return undefined;
    const statement = assignment.parent; const block = statement.parent; if (!block) return undefined;
    const statementIndex = block.namedChildren.findIndex((item) => item.startIndex === statement.startIndex && item.endIndex === statement.endIndex);
    const next = statementIndex >= 0 ? block.namedChildren[statementIndex + 1] : undefined; if (!next) return undefined;
    let use: SyntaxNode | undefined;
    if (next.type === 'return_statement') {
      const candidate = next.namedChildren[0]; if (candidate?.type === 'variable_name' && candidate.text === variable.text) use = candidate;
    } else if (next.type === 'expression_statement') {
      const nextAssignment = next.namedChildren[0]; const candidate = nextAssignment?.type === 'assignment_expression' ? nextAssignment.childForFieldName('right') : undefined;
      if (candidate?.type === 'variable_name' && candidate.text === variable.text) use = candidate;
    }
    if (!use) return undefined;
    const scope = this.containingScope(file, statement.startIndex); if (!scope) return undefined;
    const references = file.variableReferences.filter((item) => item.scopeId === scope.id && item.variable === variable.text);
    if (references.length !== 2 || !references.some((item) => item.start === use!.startIndex && item.end === use!.endIndex)) return undefined;
    const lineStart = file.source.lastIndexOf('\n', Math.max(0, statement.startIndex - 1)) + 1;
    if (!/^\s*$/.test(file.source.slice(lineStart, statement.startIndex))) return undefined;
    let declarationEnd = statement.endIndex;
    const lineRemainder = /^[ \t]*(?:\r?\n|$)/.exec(file.source.slice(declarationEnd)); if (!lineRemainder) return undefined;
    declarationEnd += lineRemainder[0].length;
    return { uri, declarationStart: lineStart, declarationEnd, useStart: use.startIndex, useEnd: use.endIndex, variable: variable.text.slice(1), expression: file.source.slice(right.startIndex, right.endIndex) };
  }

  extractMethod(uri: string, selectionStart: number, selectionEnd: number): ExtractMethodInfo | undefined {
    const file = this.files.get(uri); const tree = this.trees.get(uri); if (!file || !tree || selectionStart >= selectionEnd) return undefined;
    let start = selectionStart; let end = selectionEnd;
    while (start < end && /\s/.test(file.source[start]!)) start += 1;
    while (end > start && /\s/.test(file.source[end - 1]!)) end -= 1;
    const callable = this.containingCallable(file, start);
    if (!callable || callable.kind !== 'method' || callable.static || !callable.containerFqcn || end > callable.declarationEnd) return undefined;
    const body = deepestLocalSyntax(tree.rootNode, start, end,
      (node) => node.type === 'compound_statement' && node.parent?.type === 'method_declaration');
    if (!body) return undefined;
    const statements = body.namedChildren.filter((node) => node.startIndex >= start && node.endIndex <= end);
    if (!statements.length || statements[0]!.startIndex !== start || statements.at(-1)!.endIndex !== end
      || statements.some((node) => node.type !== 'expression_statement')) return undefined;
    const firstIndex = body.namedChildren.indexOf(statements[0]!);
    if (firstIndex < 0 || statements.some((node, index) => body!.namedChildren[firstIndex + index] !== node)) return undefined;
    const scope = this.containingScope(file, start); if (!scope || scope.id.toLowerCase() !== callable.fqcn.toLowerCase()) return undefined;
    const parameters: Array<{ variable: string; start: number; type?: string }> = [];
    const safeByValueArgument = (node: SyntaxNode): boolean => {
      if (!scope.parameters.some((parameter) => `$${parameter.name}` === node.text) && !this.variableType(file, node.text, node.startIndex)) return false;
      const call = file.calls.find((candidate) => candidate.start <= node.startIndex && candidate.end >= node.endIndex
        && candidate.arguments.some((argument) => argument.start <= node.startIndex && argument.end >= node.endIndex));
      if (!call?.flat) return false;
      const argumentIndex = call.arguments.findIndex((argument) => argument.start <= node.startIndex && argument.end >= node.endIndex);
      const argument = call.arguments[argumentIndex]; if (!argument || argument.unpacked) return false;
      const separator = argument.nameEnd === undefined ? -1 : file.source.indexOf(':', argument.nameEnd);
      const valueStart = separator >= 0 && separator < argument.end ? separator + 1 : argument.start;
      if (file.source.slice(valueStart, argument.end).trim() !== node.text) return false;
      const signature = this.signature(uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1)); if (!signature) return false;
      const matches = [...this.files.values()].flatMap((candidate) => candidate.callables)
        .filter((candidate) => candidate.kind === signature.kind && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
      if (matches.length !== 1) return false;
      const positional = call.arguments.slice(0, argumentIndex).filter((candidate) => !candidate.name).length;
      const parameter = argument.name
        ? signature.parameters.find((candidate) => candidate.name === argument.name)
        : signature.parameters[Math.min(positional, Math.max(0, signature.parameters.length - 1))];
      return Boolean(parameter && !parameter.byReference);
    };
    let malformed = false; const inspect = (root: SyntaxNode): void => {
      const traversal = walkLocalSyntax(root, (node) => {
      if (node.isError || node.isMissing || ['assignment_expression', 'augmented_assignment_expression', 'yield_expression', 'include_expression', 'include_once_expression', 'require_expression', 'require_once_expression', 'anonymous_function', 'arrow_function'].includes(node.type)) malformed = true;
      if (node.type === 'variable_name' && node.text !== '$this') {
        const parent = node.parent; const object = parent?.childForFieldName('object');
        const safeReceiver = Boolean(parent && (parent.type === 'member_call_expression' || parent.type === 'member_access_expression')
          && object?.startIndex === node.startIndex && object.endIndex === node.endIndex && this.variableType(file, node.text, node.startIndex));
        if (!safeReceiver && !safeByValueArgument(node)) malformed = true;
        else {
          const declaredType = callable.parameters.find((parameter) => `$${parameter.name}` === node.text)?.nativeType;
          const inferredType = !declaredType && safeReceiver ? this.variableType(file, node.text, node.startIndex) : undefined;
          parameters.push({ variable: node.text, start: node.startIndex, type: declaredType ?? (inferredType ? `\\${inferredType}` : undefined) });
        }
      }
        return malformed ? 'stop' : 'descend';
      });
      if (!traversal.complete) malformed = true;
    };
    const declarationType = (type: PhpType): string | undefined => {
      if (type.kind === 'primitive') return type.name;
      if (type.kind === 'named') return `\\${type.name}`;
      if (type.kind === 'literal') return typeof type.value === 'boolean' ? 'bool' : typeof type.value === 'number' ? (Number.isInteger(type.value) ? 'int' : 'float') : 'string';
      if (type.kind === 'union' || type.kind === 'intersection') {
        const rendered = type.types.map(declarationType); if (rendered.some((item) => !item)) return undefined;
        return [...new Set(rendered)].join(type.kind === 'union' ? '|' : '&');
      }
      return undefined;
    };
    const outputType = (right: SyntaxNode): string | undefined => {
      const expression = right.text.trim();
      if (/^(?:true|false)$/i.test(expression)) return 'bool';
      if (/^[+-]?\d+$/.test(expression)) return 'int';
      if (/^[+-]?(?:\d+\.\d*|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(expression)) return 'float';
      if (/^(['"])[\s\S]*\1$/.test(expression)) return 'string';
      if (/^\[.*\]$/s.test(expression) || /^array\s*\(/i.test(expression)) return 'array';
      const call = file.calls.find((candidate) => candidate.start === right.startIndex && candidate.end === right.endIndex); if (!call) return undefined;
      const signature = this.signature(uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1)); if (!signature) return undefined;
      const declarations = [...this.files.values()].flatMap((candidate) => candidate.callables.map((item) => ({ file: candidate, item })))
        .filter(({ item }) => item.kind === signature.kind && item.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
      if (declarations.length !== 1 || !declarations[0]!.item.nativeReturnType) return undefined;
      return declarationType(this.nativeSourceType(declarations[0]!.file, declarations[0]!.item.nativeReturnType, declarations[0]!.item.containerFqcn ?? declarations[0]!.item.fqcn));
    };
    let output: { variable: string; statement: SyntaxNode; right: SyntaxNode; type?: string } | undefined;
    for (const [index, statement] of statements.entries()) {
      const expression = statement.namedChildren[0];
      if (expression?.type === 'assignment_expression') {
        const left = expression.childForFieldName('left'); const right = expression.childForFieldName('right');
        if (index !== statements.length - 1 || left?.type !== 'variable_name' || !right || /=\s*&/.test(expression.text)) return undefined;
        inspect(right); if (malformed) return undefined;
        const usedAfter = file.variableReferences.some((item) => item.scopeId === scope.id && item.variable === left.text && item.start >= statement.endIndex && item.end <= scope.end);
        if (!usedAfter || parameters.some((parameter) => parameter.variable === left.text)) return undefined;
        const inferred = this.variableType(file, left.text, statement.endIndex);
        output = { variable: left.text, statement, right, type: inferred && this.fileAndDeclaration(inferred) ? `\\${inferred}` : outputType(right) };
      } else inspect(statement);
    }
    if (malformed) return undefined;
    if (file.commentRanges.some((comment) => comment.start < end && comment.end > start)) return undefined;
    const selectionLineStart = file.source.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const leading = file.source.slice(selectionLineStart, start); if (!/^[ \t]*$/.test(leading)) return undefined;
    const lineRemainder = /^[ \t]*(?:\r?\n|$)/.exec(file.source.slice(end)); if (!lineRemainder) return undefined;
    const selectionLineEnd = end + lineRemainder[0].length;
    const declaration = file.declarations.find((item) => item.fqcn.toLowerCase() === callable.containerFqcn!.toLowerCase() && item.kind === 'class');
    if (!declaration || !this.hasCompleteHierarchy(declaration.fqcn)) return undefined;
    const methodNames = new Set(this.members(declaration.fqcn, declaration.fqcn, new Set(), true).filter((item) => item.kind === 'method').map((item) => item.name.toLowerCase()));
    let methodName = 'extractedMethod'; for (let suffix = 2; methodNames.has(methodName.toLowerCase()); suffix += 1) methodName = `extractedMethod${suffix}`;
    const insertOffset = file.source.lastIndexOf('}', declaration.declarationEnd - 1); if (insertOffset < declaration.declarationStart) return undefined;
    const callableLineStart = file.source.lastIndexOf('\n', Math.max(0, callable.declarationStart - 1)) + 1;
    const methodIndent = file.source.slice(callableLineStart, callable.declarationStart); if (!/^[ \t]*$/.test(methodIndent)) return undefined;
    const eol = file.source.includes('\r\n') ? '\r\n' : '\n';
    const selectedLines = output
      ? `${file.source.slice(selectionLineStart, output.statement.startIndex)}return ${file.source.slice(output.right.startIndex, output.right.endIndex)};`
      : file.source.slice(selectionLineStart, end);
    const parameterFacts = [...new Map(parameters.sort((left, right) => left.start - right.start).map((item) => [item.variable, item])).values()];
    const parameterNames = parameterFacts.map((item) => item.variable);
    const parameterSignature = parameterFacts.map((item) => `${item.type ? `${item.type} ` : ''}${item.variable}`).join(', ');
    return {
      uri, selectionStart: selectionLineStart, selectionEnd: selectionLineEnd, insertOffset, methodName, parameters: parameterNames.map((name) => name.slice(1)), output: output?.variable.slice(1),
      callText: `${leading}${output ? `${output.variable} = ` : ''}$this->${methodName}(${parameterNames.join(', ')});${eol}`,
      methodText: `${eol}${methodIndent}private function ${methodName}(${parameterSignature})${output?.type ? `: ${output.type}` : output ? '' : ': void'}${eol}${methodIndent}{${eol}${selectedLines}${eol}${methodIndent}}${eol}`,
    };
  }

  unusedImports(uri: string): UnusedImport[] {
    const file = this.files.get(uri); if (!file?.imports.length) return [];
    const statementCounts = new Map<number, number>();
    for (const item of file.imports) statementCounts.set(item.statementStart, (statementCounts.get(item.statementStart) ?? 0) + 1);
    const used = this.usedImportKeys(file);
    return file.imports.filter((item) => statementCounts.get(item.statementStart) === 1).flatMap((item): UnusedImport[] => {
      return used.has(`${item.statementStart}:${item.start}`) ? [] : [{ uri, start: item.start, end: item.end, name: item.alias, kind: item.kind, statementStart: item.statementStart, statementEnd: item.statementEnd }];
    });
  }

  organizeImports(uri: string, sort: 'grouped' | 'fqcn' = 'grouped'): ImportOrganization | undefined {
    const file = this.files.get(uri); if (!file?.imports.length) return undefined;
    if (new Set(file.imports.map((item) => item.namespace)).size !== 1) return undefined;
    const imports = [...file.imports].sort((left, right) => left.statementStart - right.statementStart || left.start - right.start);
    const first = imports[0]!.statementStart; let end = imports.at(-1)!.statementEnd;
    const statements = [...new Map(imports.map((item) => [item.statementStart, { start: item.statementStart, end: item.statementEnd }])).values()];
    if (file.commentRanges.some((comment) => statements.some((statement) => comment.start < statement.end && comment.end > statement.start))) return undefined;
    const masked = file.source.slice(first, end).split('');
    for (const statement of statements) for (let offset = statement.start - first; offset < statement.end - first; offset += 1) masked[offset] = ' ';
    if (masked.join('').trim() !== '') return undefined;
    const used = this.usedImportKeys(file);
    const keptByIdentity = new Map<string, ParsedImport>();
    for (const item of imports.filter((candidate) => used.has(`${candidate.statementStart}:${candidate.start}`))) {
      const key = `${item.kind}:${item.fqcn.toLowerCase()}:${item.alias.toLowerCase()}`; if (!keptByIdentity.has(key)) keptByIdentity.set(key, item);
    }
    const kept = [...keptByIdentity.values()].sort((left, right) => {
      const kinds = { class: 0, function: 1, const: 2 } as const;
      return sort === 'fqcn'
        ? left.fqcn.localeCompare(right.fqcn) || kinds[left.kind] - kinds[right.kind] || left.alias.localeCompare(right.alias)
        : kinds[left.kind] - kinds[right.kind] || left.fqcn.localeCompare(right.fqcn) || left.alias.localeCompare(right.alias);
    });
    const eol = file.source.includes('\r\n') ? '\r\n' : '\n';
    const lines = kept.map((item) => `use ${item.kind === 'class' ? '' : `${item.kind} `}${item.fqcn}${item.explicitAlias ? ` as ${item.alias}` : ''};`);
    const newline = /^\r?\n/.exec(file.source.slice(end)); if (newline) end += newline[0].length;
    const newText = lines.length ? `${lines.join(eol)}${eol}` : '';
    if (file.source.slice(first, end) === newText) return undefined;
    const keptItems = new Set(kept);
    return { uri, start: first, end, newText, removed: imports.filter((item) => !keptItems.has(item)).map((item) => item.alias) };
  }

  incompatibleMethodOverrides(uri: string): IncompatibleMethodOverride[] {
    const file = this.files.get(uri); if (!file) return [];
    const results: IncompatibleMethodOverride[] = [];
    for (const declaration of file.declarations.filter((item) => (item.kind === 'class' || item.kind === 'interface') && !item.anonymous)) {
      if (!this.hasCompleteHierarchy(declaration.fqcn)) continue;
      const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const parents = [...declaration.extendsNames, ...declaration.implementsNames]
        .map((name) => this.resolveSourceType(file, name, namespace, declaration.fqcn));
      if (!parents.length || parents.some((parent) => !parent || !this.fileAndDeclaration(parent))) continue;
      const inherited = parents.flatMap((parent) => this.members(parent!, declaration.fqcn))
        .filter((item) => item.kind === 'method' && item.visibility !== 'private');
      const ownMethods = file.callables.filter((item) => item.kind === 'method' && item.containerFqcn?.toLowerCase() === declaration.fqcn.toLowerCase());
      for (const method of ownMethods) {
        for (const parent of inherited.filter((item) => item.name.toLowerCase() === method.name.toLowerCase())) {
          const reason = this.methodCompatibilityReason(file, method, parent);
          if (reason) results.push({ uri, start: method.start, end: method.end, method: method.fqcn, inheritedMethod: parent.fqcn, reason });
        }
      }
    }
    return [...new Map(results.map((item) => [`${item.start}:${item.inheritedMethod.toLowerCase()}:${item.reason}`, item])).values()];
  }

  incompatiblePropertyOverrides(uri: string): IncompatiblePropertyOverride[] {
    const file = this.files.get(uri); if (!file) return [];
    const results: IncompatiblePropertyOverride[] = [];
    for (const declaration of file.declarations.filter((item) => (item.kind === 'class' || item.kind === 'interface') && !item.anonymous)) {
      if (!this.hasCompleteHierarchy(declaration.fqcn)) continue;
      const inherited = this.ancestorPropertyDeclarations(declaration.fqcn);
      const own = file.properties.filter((property) => property.containerFqcn.toLowerCase() === declaration.fqcn.toLowerCase());
      for (const property of own) for (const parent of inherited.filter((item) => item.declaration.name === property.name
        && item.declaration.visibility !== 'private')) {
        const inheritedFqcn = parent.declaration.fqcn;
        if (parent.declaration.final || parent.declaration.writeVisibility === 'private') {
          results.push({ uri, start: property.start, end: property.end, property: property.fqcn,
            inheritedProperty: inheritedFqcn, reason: 'a final property cannot be overridden',
            minimumPhpVersion: parent.declaration.promoted && parent.declaration.final ? '8.5' : undefined });
          continue;
        }
        const ownHookKinds = new Set(property.hooks?.map((hook) => hook.kind) ?? []);
        const finalHook = parent.declaration.hooks?.find((hook) => hook.final && ownHookKinds.has(hook.kind));
        if (finalHook) {
          results.push({ uri, start: property.start, end: property.end, property: property.fqcn,
            inheritedProperty: inheritedFqcn, reason: `the final ${finalHook.kind} hook cannot be overridden` });
          continue;
        }
        const candidate = this.effectiveProperty(declaration.fqcn, property.name);
        const required = this.declaredPropertyContract(parent.file, parent.declaration);
        const reason = candidate && this.propertyContractReason(candidate, required);
        if (reason) results.push({ uri, start: property.start, end: property.end, property: property.fqcn, inheritedProperty: inheritedFqcn, reason });
      }
    }
    return [...new Map(results.map((item) => [`${item.start}:${item.inheritedProperty.toLowerCase()}:${item.reason}`, item])).values()];
  }

  missingPropertyImplementations(uri: string): MissingPropertyImplementation[] {
    const file = this.files.get(uri); if (!file) return [];
    const results: MissingPropertyImplementation[] = [];
    for (const declaration of file.declarations.filter((item) => item.kind === 'class' && !item.anonymous)) {
      if (!this.hasCompleteHierarchy(declaration.fqcn)) continue;
      const abstract = /\babstract\b/i.test(file.source.slice(declaration.declarationStart, declaration.start));
      if (abstract) continue;
      for (const requirement of this.ancestorPropertyDeclarations(declaration.fqcn).filter((item) => item.declaration.hooks?.some((hook) => hook.abstract))) {
        if (file.properties.some((property) => property.containerFqcn.toLowerCase() === declaration.fqcn.toLowerCase()
          && property.name === requirement.declaration.name)) continue;
        const candidate = this.effectiveProperty(declaration.fqcn, requirement.declaration.name);
        const required = this.declaredPropertyContract(requirement.file, requirement.declaration, true);
        const reason = candidate ? this.propertyContractReason(candidate, required) : `property $${requirement.declaration.name} is not implemented`;
        if (!reason) continue;
        results.push({ uri, start: declaration.start, end: declaration.end, classFqcn: declaration.fqcn,
          property: requirement.declaration.name, inheritedProperty: requirement.declaration.fqcn, reason, abstract });
      }
    }
    return [...new Map(results.map((item) => [`${item.start}:${item.property}:${item.reason}`, item])).values()];
  }

  invalidInheritances(uri: string): InvalidInheritance[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.declarations.filter((item) => item.kind === 'class' && !item.anonymous && item.extendsNames.length === 1).flatMap((declaration): InvalidInheritance[] => {
      const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const parent = this.resolveSourceType(file, declaration.extendsNames[0]!, namespace, declaration.fqcn);
      const owner = parent && this.fileAndDeclaration(parent);
      if (!parent || !owner || owner.declaration.kind !== 'class') return [];
      const prefix = owner.file.source.slice(owner.declaration.declarationStart, owner.declaration.start);
      if (/\bfinal\s+class\b/i.test(prefix)) return [{ uri, start: declaration.start, end: declaration.end, type: declaration.fqcn, parent, reason: 'final-class' }];
      if (declaration.readonlyClass !== owner.declaration.readonlyClass) return [{ uri, start: declaration.start, end: declaration.end,
        type: declaration.fqcn, parent, reason: 'readonly-mismatch', readonly: declaration.readonlyClass, parentReadonly: owner.declaration.readonlyClass }];
      return [];
    });
  }

  invalidTypeRelations(uri: string): InvalidTypeRelation[] {
    const file = this.files.get(uri); if (!file) return [];
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((declaration) => ({ file: candidate, declaration })));
    return file.typeReferences.flatMap((reference): InvalidTypeRelation[] => {
      if (reference.context !== 'inheritance' && reference.context !== 'trait') return [];
      const owner = file.declarations.filter((item) => reference.start >= item.declarationStart && reference.end <= item.declarationEnd)
        .sort((left, right) => (left.declarationEnd - left.declarationStart) - (right.declarationEnd - right.declarationStart))[0];
      if (!owner) return [];
      const name = file.source.slice(reference.start, reference.end);
      let relation: InvalidTypeRelation['relation']; let expectedKind: InvalidTypeRelation['expectedKind'];
      if (reference.context === 'trait') { relation = 'use'; expectedKind = 'trait'; }
      else if (owner.extendsNames.includes(name)) {
        relation = 'extend';
        if (owner.kind !== 'class' && owner.kind !== 'interface') return [];
        expectedKind = owner.kind;
      } else if (owner.implementsNames.includes(name)) { relation = 'implement'; expectedKind = 'interface'; }
      else return [];
      const namespace = owner.fqcn.split('\\').slice(0, -1).join('\\');
      const fqcn = this.resolveSourceType(file, name, namespace, owner.fqcn); if (!fqcn) return [];
      const matches = declarations.filter((candidate) => candidate.declaration.fqcn.toLowerCase() === fqcn.toLowerCase());
      if (matches.length !== 1 || matches[0]!.declaration.kind === expectedKind) return [];
      return [{ uri, start: reference.start, end: reference.end, owner: owner.fqcn, target: fqcn, relation,
        expectedKind, actualKind: matches[0]!.declaration.kind }];
    });
  }

  inheritanceCycles(uri: string): InheritanceCycle[] {
    const file = this.files.get(uri); if (!file) return [];
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((declaration) => ({ file: candidate, declaration })));
    const uniqueDeclaration = (fqcn: string): { file: SemanticFile; declaration: ParsedDeclaration } | undefined => {
      const matches = declarations.filter((candidate) => candidate.declaration.fqcn.toLowerCase() === fqcn.toLowerCase());
      return matches.length === 1 ? matches[0] : undefined;
    };
    const reaches = (current: string, goal: string, relation: InheritanceCycle['relation'], visited: Set<string>): boolean | undefined => {
      const key = current.toLowerCase(); if (key === goal.toLowerCase()) return true;
      if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return undefined;
      if (visited.has(key)) return false; visited.add(key);
      const owner = uniqueDeclaration(current); if (!owner) return undefined;
      const expectedKind = relation === 'use' ? 'trait' : owner.declaration.kind;
      if (relation === 'use' ? owner.declaration.kind !== 'trait' : !['class', 'interface'].includes(owner.declaration.kind)) return false;
      const names = relation === 'use' ? owner.declaration.traitNames : owner.declaration.extendsNames;
      let incomplete = false;
      for (const name of names) {
        const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
        const target = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
        const resolved = target && uniqueDeclaration(target);
        if (!target || !resolved) { incomplete = true; continue; }
        if (resolved.declaration.kind !== expectedKind) continue;
        const result = reaches(target, goal, relation, new Set(visited));
        if (result === true) return true;
        if (result === undefined) incomplete = true;
      }
      return incomplete ? undefined : false;
    };
    return file.typeReferences.flatMap((reference): InheritanceCycle[] => {
      if (reference.context !== 'inheritance' && reference.context !== 'trait') return [];
      const owner = file.declarations.filter((item) => reference.start >= item.declarationStart && reference.end <= item.declarationEnd)
        .sort((left, right) => (left.declarationEnd - left.declarationStart) - (right.declarationEnd - right.declarationStart))[0];
      if (!owner) return [];
      const name = file.source.slice(reference.start, reference.end);
      const relation: InheritanceCycle['relation'] | undefined = reference.context === 'trait' && owner.kind === 'trait' ? 'use'
        : reference.context === 'inheritance' && owner.extendsNames.includes(name) && (owner.kind === 'class' || owner.kind === 'interface') ? 'extend' : undefined;
      if (!relation) return [];
      const namespace = owner.fqcn.split('\\').slice(0, -1).join('\\');
      const target = this.resolveSourceType(file, name, namespace, owner.fqcn); const targetDeclaration = target && uniqueDeclaration(target);
      if (!target || !targetDeclaration || targetDeclaration.declaration.kind !== (relation === 'use' ? 'trait' : owner.kind)) return [];
      return reaches(target, owner.fqcn, relation, new Set()) === true
        ? [{ uri, start: reference.start, end: reference.end, owner: owner.fqcn, target, relation }] : [];
    });
  }

  invalidEnumTraitProperties(uri: string): InvalidEnumTraitProperty[] {
    const file = this.files.get(uri); if (!file) return [];
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((declaration) => ({ file: candidate, declaration })));
    const uniqueDeclaration = (fqcn: string): { file: SemanticFile; declaration: ParsedDeclaration } | undefined => {
      const matches = declarations.filter((candidate) => candidate.declaration.fqcn.toLowerCase() === fqcn.toLowerCase());
      return matches.length === 1 ? matches[0] : undefined;
    };
    const traitProperty = (fqcn: string, visited = new Set<string>()): { owner: string; name: string } | null | undefined => {
      const key = fqcn.toLowerCase();
      if (visited.has(key)) return null;
      if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return undefined;
      visited.add(key);
      const owner = uniqueDeclaration(fqcn); if (!owner || owner.declaration.kind !== 'trait') return undefined;
      const ownProperty = owner.file.properties.find((property) => property.containerFqcn.toLowerCase() === key);
      if (ownProperty) return { owner: owner.declaration.fqcn, name: ownProperty.name };
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\'); let incomplete = false;
      for (const name of owner.declaration.traitNames) {
        const nested = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
        const result = nested ? traitProperty(nested, new Set(visited)) : undefined;
        if (result) return result;
        if (result === undefined) incomplete = true;
      }
      return incomplete ? undefined : null;
    };
    return file.typeReferences.flatMap((reference): InvalidEnumTraitProperty[] => {
      if (reference.context !== 'trait') return [];
      const owner = file.declarations.filter((item) => item.kind === 'enum' && reference.start >= item.declarationStart && reference.end <= item.declarationEnd)
        .sort((left, right) => (left.declarationEnd - left.declarationStart) - (right.declarationEnd - right.declarationStart))[0];
      if (!owner) return [];
      const name = file.source.slice(reference.start, reference.end);
      if (!owner.traitNames.includes(name)) return [];
      const namespace = owner.fqcn.split('\\').slice(0, -1).join('\\');
      const traitFqcn = this.resolveSourceType(file, name, namespace, owner.fqcn); if (!traitFqcn) return [];
      const target = uniqueDeclaration(traitFqcn); if (!target || target.declaration.kind !== 'trait') return [];
      const property = traitProperty(traitFqcn); if (!property) return [];
      return [{ uri, start: reference.start, end: reference.end, enumFqcn: owner.fqcn, traitFqcn,
        propertyOwner: property.owner, propertyName: property.name }];
    });
  }

  invalidReadonlyTraitProperties(uri: string): InvalidReadonlyTraitProperty[] {
    const file = this.files.get(uri); if (!file) return [];
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((declaration) => ({ file: candidate, declaration })));
    const uniqueDeclaration = (fqcn: string): { file: SemanticFile; declaration: ParsedDeclaration } | undefined => {
      const matches = declarations.filter((candidate) => candidate.declaration.fqcn.toLowerCase() === fqcn.toLowerCase());
      return matches.length === 1 ? matches[0] : undefined;
    };
    const mutableTraitProperty = (fqcn: string, visited = new Set<string>()): { owner: string; name: string } | null | undefined => {
      const key = fqcn.toLowerCase();
      if (visited.has(key)) return null;
      if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return undefined;
      visited.add(key);
      const owner = uniqueDeclaration(fqcn); if (!owner || owner.declaration.kind !== 'trait') return undefined;
      const ownProperty = owner.file.properties.find((property) => property.containerFqcn.toLowerCase() === key && !property.readonly);
      if (ownProperty) return { owner: owner.declaration.fqcn, name: ownProperty.name };
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\'); let incomplete = false;
      for (const name of owner.declaration.traitNames) {
        const nested = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
        const result = nested ? mutableTraitProperty(nested, new Set(visited)) : undefined;
        if (result) return result;
        if (result === undefined) incomplete = true;
      }
      return incomplete ? undefined : null;
    };
    return file.typeReferences.flatMap((reference): InvalidReadonlyTraitProperty[] => {
      if (reference.context !== 'trait') return [];
      const owner = file.declarations.filter((item) => item.kind === 'class' && item.readonlyClass
        && reference.start >= item.declarationStart && reference.end <= item.declarationEnd)
        .sort((left, right) => (left.declarationEnd - left.declarationStart) - (right.declarationEnd - right.declarationStart))[0];
      if (!owner) return [];
      const name = file.source.slice(reference.start, reference.end); if (!owner.traitNames.includes(name)) return [];
      const namespace = owner.fqcn.split('\\').slice(0, -1).join('\\');
      const traitFqcn = this.resolveSourceType(file, name, namespace, owner.fqcn); if (!traitFqcn) return [];
      const target = uniqueDeclaration(traitFqcn); if (!target || target.declaration.kind !== 'trait') return [];
      const property = mutableTraitProperty(traitFqcn); if (!property) return [];
      return [{ uri, start: reference.start, end: reference.end, classFqcn: owner.fqcn, traitFqcn,
        propertyOwner: property.owner, propertyName: property.name }];
    });
  }

  invalidAllowDynamicProperties(uri: string): InvalidAllowDynamicProperties[] {
    const file = this.files.get(uri); if (!file) return [];
    let incomplete = false;
    const retainedTree = this.trees.get(uri); const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, uri).tree;
    const root = (retainedTree ?? temporaryTree!).rootNode;
    const traversal = walkLocalSyntax(root, (node) => {
      if (node.isError || node.isMissing) incomplete = true;
      return 'descend';
    });
    const hasError = root.hasError;
    temporaryTree?.delete();
    if (hasError || !traversal.complete || incomplete) return [];
    return file.typeReferences.flatMap((reference): InvalidAllowDynamicProperties[] => {
      if (reference.context !== 'attribute') return [];
      const owner = file.declarations.filter((item) => reference.start >= item.declarationStart && reference.end <= item.declarationEnd)
        .sort((left, right) => (left.declarationEnd - left.declarationStart) - (right.declarationEnd - right.declarationStart))[0];
      if (!owner || (owner.kind === 'class' && !owner.readonlyClass)) return [];
      const namespace = owner.fqcn.split('\\').slice(0, -1).join('\\');
      const attribute = this.resolveSourceType(file, file.source.slice(reference.start, reference.end), namespace, owner.fqcn);
      if (attribute?.toLowerCase() !== 'allowdynamicproperties') return [];
      return [{ uri, start: reference.start, end: reference.end, typeFqcn: owner.fqcn, kind: owner.kind, readonlyClass: owner.readonlyClass }];
    });
  }

  overridePropertyAttributes(uri: string): OverridePropertyAttribute[] {
    const file = this.files.get(uri); if (!file) return [];
    const attributeFor = (candidateFile: SemanticFile, property: ParsedPropertyDeclaration): ParsedTypeReference | undefined => {
      const namespace = property.containerFqcn.split('\\').slice(0, -1).join('\\');
      return candidateFile.typeReferences.find((reference) => reference.context === 'attribute'
        && reference.start >= property.declarationStart && reference.end <= property.declarationEnd
        && this.resolveSourceType(candidateFile, candidateFile.source.slice(reference.start, reference.end), namespace, property.containerFqcn)?.toLowerCase() === 'override');
    };
    const inheritedProperties = (candidateFile: SemanticFile, declaration: ParsedDeclaration): MemberInfo[] | undefined => {
      if (!this.hasCompleteHierarchy(declaration.fqcn)) return undefined;
      const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const parents = [...declaration.extendsNames, ...declaration.implementsNames]
        .map((name) => this.resolveSourceType(candidateFile, name, namespace, declaration.fqcn));
      if (parents.some((parent) => !parent || !this.fileAndDeclaration(parent))) return undefined;
      return parents.flatMap((parent) => this.members(parent!, declaration.fqcn, new Set(), true))
        .filter((member) => member.kind === 'property' && member.visibility !== 'private');
    };
    const attributedTraitProperties = (traitFqcn: string, visited = new Set<string>()): Array<{
      file: SemanticFile;
      property: ParsedPropertyDeclaration;
    }> => {
      const key = traitFqcn.toLowerCase();
      if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return [];
      visited.add(key);
      const owner = this.fileAndDeclaration(traitFqcn);
      if (!owner || owner.declaration.kind !== 'trait') return [];
      const own = owner.file.properties.filter((property) => property.containerFqcn.toLowerCase() === key && attributeFor(owner.file, property))
        .map((property) => ({ file: owner.file, property }));
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const nested = owner.declaration.traitNames.flatMap((name) => {
        const resolved = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
        return resolved ? attributedTraitProperties(resolved, new Set(visited)) : [];
      });
      return [...own, ...nested];
    };
    const results: OverridePropertyAttribute[] = [];
    for (const declaration of file.declarations) {
      const ownProperties = file.properties.filter((property) => property.containerFqcn.toLowerCase() === declaration.fqcn.toLowerCase());
      const inherited = declaration.kind === 'trait' ? [] : inheritedProperties(file, declaration);
      for (const property of ownProperties) {
        const attribute = attributeFor(file, property); if (!attribute) continue;
        if (declaration.kind !== 'trait' && inherited === undefined) continue;
        const matching = inherited?.find((member) => member.name === property.name);
        results.push({ uri, start: attribute.start, end: attribute.end, property: property.fqcn,
          declaredInTrait: declaration.kind === 'trait', composedFromTrait: false, matchingParentProperty: matching?.fqcn });
      }
      if (declaration.kind !== 'class' || inherited === undefined) continue;
      const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const traitReferences = file.typeReferences.filter((reference) => reference.context === 'trait'
        && reference.start >= declaration.declarationStart && reference.end <= declaration.declarationEnd);
      for (const reference of traitReferences) {
        const traitFqcn = this.resolveSourceType(file, file.source.slice(reference.start, reference.end), namespace, declaration.fqcn);
        if (!traitFqcn) continue;
        for (const item of attributedTraitProperties(traitFqcn)) {
          const matching = inherited.find((member) => member.name === item.property.name);
          results.push({ uri, start: reference.start, end: reference.end, property: `${declaration.fqcn}::$${item.property.name}`,
            declaredInTrait: false, composedFromTrait: true, matchingParentProperty: matching?.fqcn });
        }
      }
    }
    return [...new Map(results.map((item) => [
      `${item.start}:${item.end}:${item.property}:${item.declaredInTrait}:${item.composedFromTrait}`,
      item,
    ])).values()];
  }

  discardedNoDiscardReturns(uri: string): DiscardedNoDiscardReturn[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.calls.flatMap((call): DiscardedNoDiscardReturn[] => {
      if (!call.resultDiscarded || call.firstClassCallable || call.kind === 'constructor') return [];
      const signature = this.completedCallSignature(file, call); if (!signature) return [];
      const declarationFile = this.files.get(signature.uri); if (!declarationFile) return [];
      const declaration = declarationFile.callables.find((candidate) => candidate.start === signature.start
        && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
      if (!declaration) return [];
      const attribute = this.callableBuiltinAttribute(declarationFile, declaration, 'nodiscard');
      const called = signature.kind === 'method' && signature.calledOnFqcn
        ? `${signature.calledOnFqcn}::${signature.name}` : signature.fqcn;
      return attribute ? [{ uri, start: call.nameStart, end: call.nameEnd, callable: called, message: attribute.message }] : [];
    });
  }

  invalidNoDiscardDeclarations(uri: string): InvalidNoDiscardDeclaration[] {
    const file = this.files.get(uri); if (!file) return [];
    const magicWithoutReturn = new Set(['__construct', '__destruct', '__clone', '__set', '__unset', '__wakeup', '__unserialize']);
    const results = file.callables.flatMap((callable): InvalidNoDiscardDeclaration[] => {
      const attribute = this.callableBuiltinAttribute(file, callable, 'nodiscard'); if (!attribute) return [];
      const nativeReturn = callable.nativeReturnType?.trim().toLowerCase();
      const reason: InvalidNoDiscardDeclaration['reason'] | undefined = nativeReturn === 'void' ? 'void-return'
        : nativeReturn === 'never' ? 'never-return'
          : callable.kind === 'method' && magicWithoutReturn.has(callable.name.toLowerCase()) ? 'magic-method' : undefined;
      return reason ? [{ uri, start: attribute.reference.start, end: attribute.reference.end, callable: callable.fqcn, reason }] : [];
    });
    for (const subject of this.builtinAttributeSubjects(file, 'nodiscard')) {
      if (subject.subjectType !== 'anonymous_function' && subject.subjectType !== 'arrow_function') continue;
      const returnType = subject.nativeReturnType?.trim().toLowerCase();
      if (returnType === 'void' || returnType === 'never') results.push({
        uri, start: subject.reference.start, end: subject.reference.end,
        callable: `${subject.subjectType === 'arrow_function' ? 'arrow function' : 'closure'}@${subject.subjectStart}`,
        reason: returnType === 'void' ? 'void-return' : 'never-return',
      });
    }
    return results;
  }

  invalidNoDiscardTargets(uri: string): InvalidNoDiscardTarget[] {
    const file = this.files.get(uri); if (!file) return [];
    return this.builtinAttributeSubjects(file, 'nodiscard').flatMap(({ reference, subjectType, delayedValidation }): InvalidNoDiscardTarget[] => {
      const result = (target: InvalidNoDiscardTarget['target']): InvalidNoDiscardTarget[] => [{
        uri, start: reference.start, end: reference.end, target, delayedValidation,
      }];
      switch (subjectType) {
        case 'function_definition':
        case 'method_declaration':
        case 'anonymous_function':
        case 'arrow_function': return [];
        case 'property_hook': return result('property-hook');
        case 'enum_case': return result('enum-case');
        case 'trait_declaration': return result('trait');
        case 'const_declaration': {
          const declaration = file.constants.find((candidate) => reference.start >= candidate.declarationStart
            && reference.end <= candidate.declarationEnd);
          return result(declaration?.global ? 'global-constant' : 'class-constant');
        }
        case 'class_declaration': return result('class');
        case 'interface_declaration': return result('interface');
        case 'enum_declaration': return result('enum');
        case 'anonymous_class': return result('anonymous-class');
        case 'property_declaration': return result('property');
        case 'simple_parameter':
        case 'variadic_parameter':
        case 'property_promotion_parameter': return result('parameter');
        default: return [];
      }
    });
  }

  deprecatedAttributeTargets(uri: string): DeprecatedAttributeTarget[] {
    const file = this.files.get(uri); if (!file) return [];
    return this.builtinAttributeSubjects(file, 'deprecated').flatMap(({ reference, subjectType, delayedValidation }): DeprecatedAttributeTarget[] => {
      const result = (target: DeprecatedAttributeTarget['target'], valid: boolean,
        minimumPhpVersion: DeprecatedAttributeTarget['minimumPhpVersion'] = '8.4'): DeprecatedAttributeTarget[] => [{
          uri, start: reference.start, end: reference.end, target, valid, minimumPhpVersion, delayedValidation,
        }];
      switch (subjectType) {
        case 'function_definition': return result('function', true);
        case 'method_declaration': return result('method', true);
        case 'anonymous_function':
        case 'arrow_function': return result('closure', true);
        case 'property_hook': return result('property-hook', true);
        case 'enum_case': return result('enum-case', true);
        case 'trait_declaration': return result('trait', true, '8.5');
        case 'const_declaration': {
          const declaration = file.constants.find((candidate) => reference.start >= candidate.declarationStart
            && reference.end <= candidate.declarationEnd);
          return result(declaration?.global ? 'global-constant' : 'class-constant', true,
            declaration?.global ? '8.5' : '8.4');
        }
        case 'class_declaration': return result('class', false);
        case 'interface_declaration': return result('interface', false);
        case 'enum_declaration': return result('enum', false);
        case 'anonymous_class': return result('anonymous-class', false);
        case 'property_declaration': return result('property', false);
        case 'simple_parameter':
        case 'variadic_parameter':
        case 'property_promotion_parameter': return result('parameter', false);
        default: return [];
      }
    });
  }

  deprecatedSymbolUses(uri: string): DeprecatedSymbolUse[] {
    const file = this.files.get(uri); if (!file) return [];
    const results: DeprecatedSymbolUse[] = [];
    for (const call of file.calls) {
      if (call.firstClassCallable) continue;
      const signature = call.kind === 'function' ? this.functionAt(uri, call.nameStart + Math.min(1, call.nameEnd - call.nameStart))
        : call.kind === 'constructor' ? this.completedCallSignature(file, call)
          : this.memberAt(uri, call.nameStart + Math.min(1, call.nameEnd - call.nameStart));
      if (!signature || (call.kind !== 'function' && signature.kind !== 'method')) continue;
      const declarationFile = this.files.get(signature.uri); if (!declarationFile) continue;
      const declaration = declarationFile.callables.find((candidate) => candidate.start === signature.start
        && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
      if (!declaration) continue;
      const deprecated = this.declarationDeprecation(declarationFile, declaration.declarationStart, declaration.declarationEnd,
        declaration.start, declaration.containerFqcn ?? declaration.fqcn, '8.4');
      if (!deprecated) continue;
      const symbol = declaration.fqcn;
      results.push({ uri, start: call.nameStart, end: call.nameEnd, symbol,
        kind: call.kind === 'function' ? 'function' : 'method', ...deprecated });
    }
    for (const access of file.memberAccesses.filter((candidate) => candidate.kind === 'constant')) {
      const member = this.memberAt(uri, access.start + Math.min(1, access.end - access.start));
      const declarationFile = member && this.files.get(member.uri);
      const declaration = declarationFile?.constants.find((candidate) => candidate.start === member!.start && candidate.end === member!.end);
      if (!member || !declarationFile || !declaration) continue;
      const deprecated = this.declarationDeprecation(declarationFile, declaration.declarationStart, declaration.declarationEnd,
        declaration.start, declaration.containerFqcn, '8.4');
      if (deprecated) results.push({ uri, start: access.start, end: access.end, symbol: member.fqcn,
        kind: declaration.kind === 'enum-case' ? 'enum-case' : 'constant', ...deprecated });
    }
    for (const access of file.memberAccesses.filter((candidate) => candidate.kind === 'property')) {
      const member = this.memberAt(uri, access.start + Math.min(1, access.end - access.start));
      const declarationFile = member && this.files.get(member.uri);
      const declaration = declarationFile?.properties.find((candidate) => candidate.start === member!.start && candidate.end === member!.end);
      if (!member || !declarationFile || !declaration?.hooks?.length) continue;
      const modes = this.propertyAccessModes(file, access);
      for (const hook of declaration.hooks.filter((candidate) => candidate.kind === 'get' ? modes.read : modes.write)) {
        const deprecated = this.declarationDeprecation(declarationFile, hook.declarationStart, hook.declarationEnd,
          hook.start, declaration.containerFqcn, '8.4');
        if (deprecated) results.push({ uri, start: access.start, end: access.end,
          symbol: `${declaration.fqcn}::${hook.kind}`, kind: hook.kind === 'get' ? 'property-get' : 'property-set', ...deprecated });
      }
    }
    for (const range of this.semanticTokenConstantUses(uri)) {
      if (file.constants.some((candidate) => range.start >= candidate.declarationStart && range.end <= candidate.declarationEnd)
        || file.imports.some((candidate) => range.start >= candidate.statementStart && range.end <= candidate.statementEnd)) continue;
      const member = this.constantAt(uri, range.start + Math.min(1, range.end - range.start));
      const declarationFile = member && this.files.get(member.uri);
      const declaration = declarationFile?.constants.find((candidate) => candidate.global
        && candidate.start === member!.start && candidate.end === member!.end);
      if (!member || !declarationFile || !declaration) continue;
      const deprecated = this.declarationDeprecation(declarationFile, declaration.declarationStart, declaration.declarationEnd,
        declaration.start, undefined, '8.5');
      if (deprecated) results.push({ uri, start: range.start, end: range.end, symbol: member.fqcn, kind: 'constant', ...deprecated });
    }
    for (const reference of file.typeReferences.filter((candidate) => candidate.context === 'trait')) {
      const scope = this.containingCallable(file, reference.start)?.containerFqcn;
      const fqcn = this.resolveSourceType(file, file.source.slice(reference.start, reference.end), this.namespaceAt(file, reference.start), scope);
      if (!fqcn) continue;
      const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
        .filter((declaration) => declaration.kind === 'trait' && declaration.fqcn.toLowerCase() === fqcn.toLowerCase())
        .map((declaration) => ({ file: candidate, declaration })));
      if (declarations.length !== 1) continue;
      const target = declarations[0]!;
      const deprecated = this.declarationDeprecation(target.file, target.declaration.declarationStart, target.declaration.declarationEnd,
        target.declaration.start, target.declaration.fqcn, '8.5');
      if (deprecated) results.push({ uri, start: reference.start, end: reference.end, symbol: target.declaration.fqcn, kind: 'trait', ...deprecated });
    }
    return [...new Map(results.map((item) => [`${item.start}:${item.end}:${item.symbol}`, item])).values()]
      .sort((left, right) => left.start - right.start || left.end - right.end);
  }

  invalidEnumInterfaces(uri: string): InvalidEnumInterface[] {
    const file = this.files.get(uri); if (!file) return [];
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((declaration) => ({ file: candidate, declaration })));
    const uniqueDeclaration = (fqcn: string): { file: SemanticFile; declaration: ParsedDeclaration } | undefined => {
      const matches = declarations.filter((candidate) => candidate.declaration.fqcn.toLowerCase() === fqcn.toLowerCase());
      return matches.length === 1 ? matches[0] : undefined;
    };
    const extendsBuiltin = (fqcn: string, builtin: string, visited = new Set<string>()): boolean | undefined => {
      if (fqcn.toLowerCase() === builtin.toLowerCase()) return true;
      const key = fqcn.toLowerCase();
      if (visited.has(key)) return false;
      if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return undefined;
      visited.add(key);
      const owner = uniqueDeclaration(fqcn); if (!owner || owner.declaration.kind !== 'interface') return undefined;
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\'); let incomplete = false;
      for (const name of owner.declaration.extendsNames) {
        const parent = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
        const result = parent ? extendsBuiltin(parent, builtin, new Set(visited)) : undefined;
        if (result === true) return true;
        if (result === undefined) incomplete = true;
      }
      return incomplete ? undefined : false;
    };
    return file.typeReferences.flatMap((reference): InvalidEnumInterface[] => {
      if (reference.context !== 'inheritance') return [];
      const owner = file.declarations.filter((item) => item.kind === 'enum' && reference.start >= item.declarationStart && reference.end <= item.declarationEnd)
        .sort((left, right) => (left.declarationEnd - left.declarationStart) - (right.declarationEnd - right.declarationStart))[0];
      if (!owner) return [];
      const name = file.source.slice(reference.start, reference.end); if (!owner.implementsNames.includes(name)) return [];
      const namespace = owner.fqcn.split('\\').slice(0, -1).join('\\');
      const interfaceFqcn = this.resolveSourceType(file, name, namespace, owner.fqcn); if (!interfaceFqcn) return [];
      const builtin = interfaceFqcn.toLowerCase();
      if (builtin === 'unitenum' || builtin === 'backedenum') return [{
        uri, start: reference.start, end: reference.end, enumFqcn: owner.fqcn, interfaceFqcn,
        prohibitedInterface: builtin === 'unitenum' ? 'UnitEnum' : 'BackedEnum', reason: 'automatic-interface',
      }];
      if (builtin === 'serializable') return [{
        uri, start: reference.start, end: reference.end, enumFqcn: owner.fqcn, interfaceFqcn,
        prohibitedInterface: 'Serializable', reason: 'serializable',
      }];
      const target = uniqueDeclaration(interfaceFqcn); if (!target || target.declaration.kind !== 'interface') return [];
      if (extendsBuiltin(interfaceFqcn, 'Serializable') === true) return [{
        uri, start: reference.start, end: reference.end, enumFqcn: owner.fqcn, interfaceFqcn,
        prohibitedInterface: 'Serializable', reason: 'serializable',
      }];
      if (!owner.enumBackingType && extendsBuiltin(interfaceFqcn, 'BackedEnum') === true) return [{
        uri, start: reference.start, end: reference.end, enumFqcn: owner.fqcn, interfaceFqcn,
        prohibitedInterface: 'BackedEnum', reason: 'non-backed-interface',
      }];
      return [];
    });
  }

  invalidInstantiations(uri: string): InvalidInstantiation[] {
    const file = this.files.get(uri); if (!file) return [];
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((declaration) => ({ file: candidate, declaration })));
    return file.calls.flatMap((call): InvalidInstantiation[] => {
      if (call.kind !== 'constructor') return [];
      const name = file.source.slice(call.nameStart, call.nameEnd);
      const scopeFqcn = this.containingCallable(file, call.nameStart)?.containerFqcn;
      const fqcn = this.resolveSourceType(file, name, this.namespaceAt(file, call.nameStart), scopeFqcn); if (!fqcn) return [];
      const matches = declarations.filter((candidate) => candidate.declaration.fqcn.toLowerCase() === fqcn.toLowerCase());
      if (matches.length !== 1) return [];
      const target = matches[0]!; const kind = target.declaration.kind;
      const reason: InvalidInstantiation['reason'] | undefined = kind === 'interface' || kind === 'trait' || kind === 'enum' ? kind
        : kind === 'class' && /\babstract\b/i.test(target.file.source.slice(target.declaration.declarationStart, target.declaration.start)) ? 'abstract-class' : undefined;
      return reason ? [{ uri, start: call.nameStart, end: call.nameEnd, target: fqcn, reason }] : [];
    });
  }

  inaccessibleInstantiations(uri: string): InaccessibleInstantiation[] {
    const file = this.files.get(uri); if (!file) return [];
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((declaration) => ({ file: candidate, declaration })));
    const uniqueDeclaration = (fqcn: string): { file: SemanticFile; declaration: ParsedDeclaration } | undefined => {
      const matches = declarations.filter((candidate) => candidate.declaration.fqcn.toLowerCase() === fqcn.toLowerCase());
      return matches.length === 1 ? matches[0] : undefined;
    };
    const constructor = (fqcn: string, visited = new Set<string>()): { file: SemanticFile; callable: ParsedCallableDeclaration } | null | undefined => {
      const key = fqcn.toLowerCase(); if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return undefined; visited.add(key);
      const owner = uniqueDeclaration(fqcn); if (!owner || owner.declaration.kind !== 'class') return undefined;
      const own = owner.file.callables.filter((item) => item.kind === 'method' && item.containerFqcn?.toLowerCase() === key && item.name.toLowerCase() === '__construct');
      if (own.length > 1) return undefined;
      if (own.length === 1) return { file: owner.file, callable: own[0]! };
      const parentName = owner.declaration.extendsNames[0]; if (!parentName) return null;
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const parent = this.resolveSourceType(owner.file, parentName, namespace, owner.declaration.fqcn);
      return parent ? constructor(parent, visited) : undefined;
    };
    const completeClassChain = (fqcn: string, visited = new Set<string>()): boolean => {
      const key = fqcn.toLowerCase(); if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return false; visited.add(key);
      const owner = uniqueDeclaration(fqcn); if (!owner || owner.declaration.kind !== 'class') return false;
      const parentName = owner.declaration.extendsNames[0]; if (!parentName) return true;
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const parent = this.resolveSourceType(owner.file, parentName, namespace, owner.declaration.fqcn);
      return Boolean(parent && completeClassChain(parent, visited));
    };
    return file.calls.flatMap((call): InaccessibleInstantiation[] => {
      if (call.kind !== 'constructor') return [];
      const name = file.source.slice(call.nameStart, call.nameEnd);
      const enclosingType = file.declarations.filter((item) => call.nameStart >= item.declarationStart && call.nameEnd <= item.declarationEnd)
        .sort((left, right) => (left.declarationEnd - left.declarationStart) - (right.declarationEnd - right.declarationStart))[0]?.fqcn;
      const accessFrom = this.containingCallable(file, call.nameStart)?.containerFqcn ?? enclosingType;
      const target = this.resolveSourceType(file, name, this.namespaceAt(file, call.nameStart), accessFrom); if (!target) return [];
      const targetOwner = uniqueDeclaration(target);
      if (!targetOwner || targetOwner.declaration.kind !== 'class'
        || /\babstract\b/i.test(targetOwner.file.source.slice(targetOwner.declaration.declarationStart, targetOwner.declaration.start))) return [];
      const resolved = constructor(target); if (!resolved || resolved.callable.visibility === 'public') return [];
      const constructorOwner = resolved.callable.containerFqcn!;
      if (resolved.callable.visibility === 'protected' && accessFrom
        && (!completeClassChain(accessFrom) || !completeClassChain(constructorOwner))) return [];
      const allowed = accessFrom && (accessFrom.toLowerCase() === constructorOwner.toLowerCase()
        || this.isSubclassOf(accessFrom, constructorOwner) || this.isSubclassOf(constructorOwner, accessFrom));
      if (resolved.callable.visibility === 'private' ? accessFrom?.toLowerCase() === constructorOwner.toLowerCase() : allowed) return [];
      return [{ uri, start: call.nameStart, end: call.nameEnd, target, constructor: resolved.callable.fqcn, visibility: resolved.callable.visibility }];
    });
  }

  completeMembers(uri: string, offset: number): MemberInfo[] {
    const target = this.memberTarget(uri, offset);
    if (!target) return [];
    const prefix = target.member.toLowerCase();
    return [...new Map(this.targetMembers(target).filter((member) => member.name.toLowerCase().startsWith(prefix))
      .map((member) => [`${member.kind}:${member.static}:${memberNameKey(member.kind, member.name)}`, member])).values()];
  }

  isMemberCompletionContext(uri: string, offset: number): boolean {
    const file = this.files.get(uri);
    if (!file) return false;
    return /(?:\?->|->|::)\s*\$?[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(file.source.slice(0, offset));
  }

  publicTypeMembers(fqcn: string): MemberInfo[] {
    return this.hasCompleteHierarchy(fqcn) ? this.members(fqcn).filter((member) => member.visibility === 'public') : [];
  }

  resolvedMemberReturnType(member: MemberInfo): string | undefined {
    if (!member.returnType || member.readable === false) return undefined;
    const owner = this.files.get(member.uri); if (!owner) return member.returnType;
    const object = this.objectType(member.returnType, true); if (!object || object.arguments.length) return member.returnType;
    const namespace = member.typeScopeFqcn.split('\\').slice(0, -1).join('\\');
    const fqcn = this.resolveType(owner, object.name, namespace, member.typeScopeFqcn);
    return fqcn && this.fileAndDeclaration(fqcn) ? `${fqcn}${object.nullable ? '|null' : ''}` : member.returnType;
  }

  completeNamedArguments(uri: string, offset: number): NamedArgumentInfo[] {
    const signature = this.signature(uri, offset);
    if (!signature || signature.namedArgumentPrefix === undefined) return [];
    const prefix = signature.namedArgumentPrefix.toLowerCase();
    const used = new Set(signature.usedNamedArguments);
    return signature.parameters.filter((parameter) => !used.has(parameter.name) && parameter.name.toLowerCase().startsWith(prefix));
  }

  completeTypes(uri: string, offset: number): TypeInfo[] {
    const file = this.files.get(uri);
    if (!file) return [];
    const contextPrefix = typeCompletionPrefix(file.source, offset);
    if (contextPrefix === undefined) return [];
    const prefix = contextPrefix.toLowerCase();
    const namespace = this.namespaceAt(file, offset);
    const visible = new Map<string, string>();
    for (const imported of file.imports.filter((item) => item.kind === 'class' && item.namespace === namespace)) visible.set(imported.alias.toLowerCase(), imported.fqcn);
    const declarations = [...new Map([...this.files.values()].flatMap((item) => item.declarations).filter((item) => !item.anonymous).map((item) => [item.fqcn.toLowerCase(), item])).values()];
    for (const candidate of declarations) {
      const namespace = candidate.fqcn.split('\\').slice(0, -1).join('\\');
      if (namespace === this.namespaceAt(file, offset)) visible.set(candidate.name.toLowerCase(), candidate.fqcn);
    }
    return declarations.flatMap((candidate): TypeInfo[] => {
      const visibleName = [...visible.entries()].find(([, fqcn]) => fqcn.toLowerCase() === candidate.fqcn.toLowerCase())?.[0];
      const name = visibleName ? file.imports.find((item) => item.namespace === namespace && item.fqcn.toLowerCase() === candidate.fqcn.toLowerCase())?.alias ?? candidate.name : candidate.name;
      if (!name.toLowerCase().startsWith(prefix)) return [];
      const candidateNamespace = candidate.fqcn.split('\\').slice(0, -1).join('\\');
      const collision = visible.get(candidate.name.toLowerCase());
      if (!visibleName && collision && collision.toLowerCase() !== candidate.fqcn.toLowerCase()) return [];
      return [{ uri: this.fileForDeclaration(candidate)?.uri ?? uri, start: candidate.start, end: candidate.end, name, fqcn: candidate.fqcn, kind: candidate.kind, importFqcn: visibleName || candidateNamespace === namespace ? undefined : candidate.fqcn }];
    }).sort((left, right) => {
      const visibility = Number(Boolean(left.importFqcn)) - Number(Boolean(right.importFqcn));
      if (visibility) return visibility;
      const leftRank = namespaceCompletionRank(namespace, left.fqcn); const rightRank = namespaceCompletionRank(namespace, right.fqcn);
      return rightRank.common - leftRank.common || leftRank.distance - rightRank.distance
        || left.name.localeCompare(right.name) || left.fqcn.localeCompare(right.fqcn);
    });
  }

  typeImportCandidates(uri: string, offset: number, name: string): TypeImportCandidate[] {
    const file = this.files.get(uri); if (!file || !/^[A-Z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(name)) return [];
    const namespace = this.namespaceAt(file, offset);
    const imports = file.imports.filter((item) => item.kind === 'class' && item.namespace === namespace);
    const existing = new Set(imports.map((item) => item.fqcn.toLowerCase()));
    const occupied = new Set([...imports.map((item) => item.alias.toLowerCase()), ...file.declarations.map((item) => item.name.toLowerCase())]);
    return [...this.files.values()].flatMap((candidateFile) => candidateFile.declarations
      .filter((declaration) => !declaration.anonymous && declaration.name.toLowerCase() === name.toLowerCase())
      .flatMap((declaration): TypeImportCandidate[] => {
        const candidateNamespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
        if (candidateNamespace.toLowerCase() === namespace.toLowerCase() || existing.has(declaration.fqcn.toLowerCase())) return [];
        return [{ uri: candidateFile.uri, start: declaration.start, end: declaration.end, name: declaration.name,
          fqcn: declaration.fqcn, kind: declaration.kind, aliasRequired: occupied.has(declaration.name.toLowerCase()) }];
      }));
  }

  typeDeclarationsNamed(name: string): TypeInfo[] {
    return [...this.files.values()].flatMap((file) => file.declarations.filter((item) => !item.anonymous && item.name.toLowerCase() === name.toLowerCase())
      .map((item) => ({ uri: file.uri, start: item.start, end: item.end, name: item.name, fqcn: item.fqcn, kind: item.kind })));
  }

  unresolvedTypeNames(uri: string): Array<SemanticLocation & { name: string }> {
    const file = this.files.get(uri); if (!file) return [];
    const unresolved = file.rawNames.flatMap((raw): Array<SemanticLocation & { name: string }> => {
      const name = raw.text.slice(raw.text.lastIndexOf('\\') + 1);
      const typeContext = raw.context === 'phpdoc' || file.typeReferences.some((type) => raw.start >= type.start && raw.end <= type.end);
      if (!typeContext || raw.text.includes('\\') || !/^[A-Z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(name) || this.typeCandidatesAt(uri, raw.start).length) return [];
      return [{ uri, start: raw.start, end: raw.end, name }];
    });
    return [...new Map(unresolved.map((item) => [item.name.toLowerCase(), item])).values()];
  }

  typeCopySymbols(uri: string, ranges: readonly SourceRange[]): TypeCopySymbol[] {
    const file = this.files.get(uri); if (!file) return [];
    const within = (start: number, end: number): boolean => ranges.some((range) => start >= range.start && end <= range.end);
    const symbols: TypeCopySymbol[] = file.declarations.filter((item) => !item.anonymous && within(item.start, item.end))
      .map((item) => ({ uri, start: item.start, end: item.end, fqcn: item.fqcn, alias: item.name }));
    for (const raw of file.rawNames.filter((item) => within(item.start, item.end))) {
      const fqcn = this.resolveSourceType(file, raw.text, this.namespaceAt(file, raw.start), this.containingCallable(file, raw.start)?.containerFqcn);
      if (!fqcn) continue;
      symbols.push({ uri, start: raw.start, end: raw.end, fqcn, alias: raw.text.includes('\\') ? fqcn.slice(fqcn.lastIndexOf('\\') + 1) : raw.text });
    }
    return [...new Map(symbols.map((item) => [`${item.fqcn.toLowerCase()}:${item.alias.toLowerCase()}`, item])).values()];
  }

  planTypeImports(uri: string, offset: number, symbols: readonly { fqcn: string; sourceAlias: string; alias?: string }[]): TypeImportPlan | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const namespace = this.namespaceAt(file, offset); const eol = file.source.includes('\r\n') ? '\r\n' : '\n';
    const imports = file.imports.filter((item) => item.kind === 'class' && item.namespace === namespace);
    const occupied = new Map(imports.map((item) => [item.alias.toLowerCase(), item.fqcn]));
    for (const declaration of file.declarations.filter((item) => item.fqcn.split('\\').slice(0, -1).join('\\') === namespace)) occupied.set(declaration.name.toLowerCase(), declaration.fqcn);
    const existing = new Map(imports.map((item) => [item.fqcn.toLowerCase(), item.alias]));
    const replacements: Record<string, string> = {}; const lines: string[] = [];
    for (const symbol of symbols) {
      if (!/^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(symbol.sourceAlias)) return undefined;
      const parts = symbol.fqcn.split('\\'); const shortName = parts.at(-1)!; const symbolNamespace = parts.slice(0, -1).join('\\');
      const alreadyVisible = existing.get(symbol.fqcn.toLowerCase());
      if (alreadyVisible) { if (alreadyVisible !== symbol.sourceAlias) replacements[symbol.sourceAlias] = alreadyVisible; continue; }
      if (symbolNamespace.toLowerCase() === namespace.toLowerCase()) { if (shortName !== symbol.sourceAlias) replacements[symbol.sourceAlias] = shortName; continue; }
      const alias = symbol.alias ?? (symbol.sourceAlias || shortName);
      if (!/^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(alias)) return undefined;
      const conflict = occupied.get(alias.toLowerCase());
      if (conflict && conflict.toLowerCase() !== symbol.fqcn.toLowerCase()) return { offset: 0, text: '', replacements, conflict: { fqcn: symbol.fqcn, sourceAlias: symbol.sourceAlias } };
      occupied.set(alias.toLowerCase(), symbol.fqcn); existing.set(symbol.fqcn.toLowerCase(), alias);
      lines.push(`use ${symbol.fqcn}${alias !== shortName ? ` as ${alias}` : ''};`);
      if (alias !== symbol.sourceAlias) replacements[symbol.sourceAlias] = alias;
    }
    if (!lines.length) return { offset: 0, text: '', replacements };
    const prior = file.imports.filter((item) => item.namespace === namespace && item.statementStart < offset).sort((left, right) => right.statementEnd - left.statementEnd)[0];
    if (prior) return { offset: prior.statementEnd, text: `${eol}${lines.sort().join(eol)}`, replacements };
    const prefix = file.source.slice(0, offset); const namespaces = [...prefix.matchAll(/\bnamespace\s+[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\s*[;{]/g)];
    const declaration = namespaces.at(-1);
    if (declaration) return { offset: declaration.index + declaration[0].length, text: `${eol}${eol}${lines.sort().join(eol)}`, replacements };
    const opening = /^<\?php(?:\s+declare\s*\([^;]+;)?/.exec(file.source);
    return opening ? { offset: opening[0].length, text: `${eol}${eol}${lines.sort().join(eol)}`, replacements } : undefined;
  }

  planTypeMoves(moves: readonly TypeMoveInput[]): TypeMoveResult {
    if (!moves.length || moves.length > 128) return { error: 'Safe Move requires between 1 and 128 PHP files.' };
    const oldUris = new Set<string>(); const newUris = new Set<string>();
    for (const move of moves) {
      if (!move.oldUri || !move.newUri || move.oldUri === move.newUri) return { error: 'Safe Move requires distinct source and destination URIs.' };
      if (oldUris.has(move.oldUri) || newUris.has(move.newUri)) return { error: 'Safe Move received duplicate source or destination URIs.' };
      oldUris.add(move.oldUri); newUris.add(move.newUri);
    }
    const targetFqcns = new Set<string>();
    const declarations: TypeMovePlan['declarations'] = [];
    const namespaceEdits: TypeMovePlan['edits'] = [];
    const movedUri = new Map(moves.map((move) => [move.oldUri, move.newUri]));
    for (const move of moves) {
      const file = this.files.get(move.oldUri);
      if (!file) return { error: `Safe Move requires a complete semantic index for ${move.oldUri}.` };
      if (file.syntaxErrors.length) return { error: `Cannot move ${move.oldUri}: the file has PHP syntax errors.` };
      const owned = file.declarations.filter((item) => !item.anonymous);
      if (!owned.length) return { error: `Cannot move ${move.oldUri}: the file has no named PHP type declaration.` };
      const namespaces = new Set(owned.map((item) => item.fqcn.split('\\').slice(0, -1).join('\\')));
      if (namespaces.size !== 1) return { error: `Cannot move ${move.oldUri}: multiple declaration namespaces are not supported.` };
      const oldNamespace = [...namespaces][0]!;
      if (oldNamespace.toLowerCase() !== move.newNamespace.toLowerCase()) {
        const ranges = [...file.source.matchAll(/\bnamespace\s+([^;{]+?)\s*[;{]/g)].flatMap((match): SourceRange[] => {
          const name = match[1]?.trim();
          if (!name || name.replace(/^\\+|\\+$/g, '').toLowerCase() !== oldNamespace.toLowerCase()) return [];
          const start = match.index + match[0].indexOf(match[1]!);
          return [{ start, end: start + match[1]!.trimEnd().length }];
        });
        if (ranges.length !== 1) return { error: `Cannot move ${move.oldUri}: its namespace declaration is missing or ambiguous.` };
        namespaceEdits.push({ uri: move.newUri, ...ranges[0]!, newText: move.newNamespace });
      }
      for (const declaration of owned) {
        const newFqcn = [move.newNamespace, declaration.name].filter(Boolean).join('\\'); const key = newFqcn.toLowerCase();
        if (targetFqcns.has(key)) return { error: `Cannot move files: multiple declarations would become ${newFqcn}.` };
        targetFqcns.add(key);
        const conflicts = [...this.files.values()].flatMap((candidate) => candidate.declarations
          .filter((item) => !item.anonymous && item.fqcn.toLowerCase() === key && !oldUris.has(candidate.uri)));
        if (conflicts.length) return { error: `Cannot move ${move.oldUri}: destination declaration ${newFqcn} already exists.` };
        declarations.push({ oldUri: move.oldUri, newUri: move.newUri, oldFqcn: declaration.fqcn, newFqcn });
      }
    }

    const edits: TypeMovePlan['edits'] = [...namespaceEdits]; const touchedSourceUris = new Set(oldUris);
    for (const replacement of declarations) {
      const oldNamespace = replacement.oldFqcn.split('\\').slice(0, -1).join('\\');
      for (const file of this.files.values()) {
        const matchingImports = file.imports.filter((item) => item.kind === 'class' && item.fqcn.toLowerCase() === replacement.oldFqcn.toLowerCase());
        const matchingRaw = file.rawNames.filter((raw) => this.resolveSourceType(file, raw.text, this.namespaceAt(file, raw.start), this.containingCallable(file, raw.start)?.containerFqcn)?.toLowerCase() === replacement.oldFqcn.toLowerCase());
        if (!matchingImports.length && !matchingRaw.length && file.uri !== replacement.oldUri) continue;
        if (file.syntaxErrors.length) return { error: `Cannot move ${replacement.oldFqcn}: a related file has PHP syntax errors.` };
        touchedSourceUris.add(file.uri);
        const targetUri = movedUri.get(file.uri) ?? file.uri;
        for (const imported of matchingImports) edits.push({ uri: targetUri, start: imported.pathStart, end: imported.pathEnd, newText: replacement.newFqcn });
        for (const raw of matchingRaw) {
          const namespace = this.namespaceAt(file, raw.start);
          const imported = matchingImports.some((item) => item.namespace.toLowerCase() === namespace.toLowerCase());
          if (imported) continue;
          if (raw.text.includes('\\')) {
            edits.push({ uri: targetUri, start: raw.start, end: raw.end, newText: `${raw.text.startsWith('\\') ? '\\' : ''}${replacement.newFqcn}` });
          } else if (file.uri !== replacement.oldUri && namespace.toLowerCase() === oldNamespace.toLowerCase()) {
            edits.push({ uri: targetUri, start: raw.start, end: raw.end, newText: `\\${replacement.newFqcn}` });
          }
        }
      }
    }
    const unique = [...new Map(edits.map((edit) => [`${edit.uri}:${edit.start}:${edit.end}:${edit.newText}`, edit])).values()];
    return { plan: { edits: unique, declarations, touchedSourceUris: [...touchedSourceUris].sort() } };
  }

  planTypeMoveReconciliation(moves: readonly TypeMoveReconciliationInput[]): TypeMoveResult {
    if (!moves.length || moves.length > 128) return { error: 'Safe Move reconciliation requires between 1 and 128 PHP files.' };
    const edits: TypeMovePlan['edits'] = []; const declarations: TypeMovePlan['declarations'] = []; const touchedSourceUris = new Set<string>();
    const removableImport = (file: SemanticFile, imported: ParsedImport): SourceRange | undefined => {
      if (file.imports.filter((item) => item.statementStart === imported.statementStart).length !== 1) return undefined;
      let end = imported.statementEnd;
      while (end < file.source.length && (file.source[end] === ' ' || file.source[end] === '\t')) end += 1;
      if (file.source[end] === '\r') end += 1;
      if (file.source[end] === '\n') end += 1;
      return { start: imported.statementStart, end };
    };
    for (const move of moves) {
      const moved = this.files.get(move.newUri);
      if (!moved || moved.syntaxErrors.length) return { error: `Cannot reconcile ${move.newUri}: the moved file is missing or has PHP syntax errors.` };
      const currentNamespaces = new Set(moved.declarations.filter((item) => !item.anonymous).map((item) => item.fqcn.split('\\').slice(0, -1).join('\\')));
      if (currentNamespaces.size !== 1) return { error: `Cannot reconcile ${move.newUri}: its declaration namespace is missing or ambiguous.` };
      const currentNamespace = [...currentNamespaces][0]!;
      if (currentNamespace.toLowerCase() !== move.newNamespace.toLowerCase()) {
        const ranges = [...moved.source.matchAll(/\bnamespace\s+([^;{]+?)\s*[;{]/g)].flatMap((match): SourceRange[] => {
          const name = match[1]?.trim(); if (!name || name.replace(/^\\+|\\+$/g, '').toLowerCase() !== currentNamespace.toLowerCase()) return [];
          const start = match.index + match[0].indexOf(match[1]!); return [{ start, end: start + match[1]!.trimEnd().length }];
        });
        if (ranges.length !== 1) return { error: `Cannot reconcile ${move.newUri}: its namespace declaration is missing or ambiguous.` };
        edits.push({ uri: move.newUri, ...ranges[0]!, newText: move.newNamespace }); touchedSourceUris.add(move.newUri);
      }
      for (const replacement of move.declarations) {
        declarations.push({ oldUri: move.newUri, newUri: move.newUri, ...replacement });
        const oldNamespace = replacement.oldFqcn.split('\\').slice(0, -1).join('\\');
        for (const file of this.files.values()) {
          const matching = file.imports.filter((item) => item.kind === 'class'
            && [replacement.oldFqcn.toLowerCase(), replacement.newFqcn.toLowerCase()].includes(item.fqcn.toLowerCase()));
          const matchingRaw = file.rawNames.filter((raw) => {
            const resolved = this.resolveSourceType(file, raw.text, this.namespaceAt(file, raw.start), this.containingCallable(file, raw.start)?.containerFqcn)?.toLowerCase();
            return resolved === replacement.oldFqcn.toLowerCase() || resolved === replacement.newFqcn.toLowerCase();
          });
          if (!matching.length && !matchingRaw.length && file.uri !== move.newUri) continue;
          if (file.syntaxErrors.length) return { error: `Cannot reconcile ${replacement.oldFqcn}: a related file has PHP syntax errors.` };
          touchedSourceUris.add(file.uri);
          let kept = matching.find((item) => item.fqcn.toLowerCase() === replacement.newFqcn.toLowerCase());
          for (const imported of matching) {
            if (imported === kept) continue;
            if (!kept && imported.fqcn.toLowerCase() === replacement.oldFqcn.toLowerCase()) {
              edits.push({ uri: file.uri, start: imported.pathStart, end: imported.pathEnd, newText: replacement.newFqcn }); kept = imported; continue;
            }
            const removal = removableImport(file, imported);
            if (removal) edits.push({ uri: file.uri, ...removal, newText: '' });
            else if (imported.fqcn.toLowerCase() === replacement.oldFqcn.toLowerCase()) edits.push({ uri: file.uri, start: imported.pathStart, end: imported.pathEnd, newText: replacement.newFqcn });
          }
          for (const raw of matchingRaw) {
            const namespace = this.namespaceAt(file, raw.start);
            if (matching.some((item) => item.namespace.toLowerCase() === namespace.toLowerCase())) continue;
            const resolved = this.resolveSourceType(file, raw.text, namespace, this.containingCallable(file, raw.start)?.containerFqcn)?.toLowerCase();
            if (resolved !== replacement.oldFqcn.toLowerCase()) continue;
            if (raw.text.includes('\\')) edits.push({ uri: file.uri, start: raw.start, end: raw.end, newText: `${raw.text.startsWith('\\') ? '\\' : ''}${replacement.newFqcn}` });
            else if (file.uri !== move.newUri && namespace.toLowerCase() === oldNamespace.toLowerCase()) edits.push({ uri: file.uri, start: raw.start, end: raw.end, newText: `\\${replacement.newFqcn}` });
          }
        }
      }
    }
    const unique = [...new Map(edits.map((edit) => [`${edit.uri}:${edit.start}:${edit.end}:${edit.newText}`, edit])).values()];
    return { plan: { edits: unique, declarations, touchedSourceUris: [...touchedSourceUris].sort() } };
  }

  completeFunctions(uri: string, offset: number): FunctionCompletionInfo[] {
    const file = this.files.get(uri); if (!file) return [];
    const before = file.source.slice(0, offset); const match = /([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/.exec(before);
    if (!match || typeCompletionPrefix(file.source, offset) !== undefined) return [];
    const prefixStart = offset - (match[1]?.length ?? 0); const context = before.slice(Math.max(0, prefixStart - 32), prefixStart);
    if (/(?:->|\?->|::|\$|\bfunction\s+|\bnamespace\s+|\buse(?:\s+function)?\s+)\s*$/.test(context)) return [];
    const prefix = (match[1] ?? '').toLowerCase(); const namespace = this.namespaceAt(file, offset);
    const imported = new Map(file.imports.filter((item) => item.kind === 'function' && item.namespace === namespace).map((item) => [item.alias.toLowerCase(), item.fqcn]));
    const callables = [...new Map([...this.files.values()].flatMap((candidate) => candidate.callables.map((item) => ({ file: candidate, item })))
      .filter(({ item }) => item.kind === 'function').map((entry) => [entry.item.fqcn.toLowerCase(), entry])).values()];
    const visible = new Map(imported);
    for (const { item } of callables) {
      const candidateNamespace = item.fqcn.split('\\').slice(0, -1).join('\\');
      if (candidateNamespace === namespace || candidateNamespace === '') visible.set(item.name.toLowerCase(), item.fqcn);
    }
    const completionTier = (candidate: FunctionCompletionInfo): number => {
      const candidateNamespace = candidate.fqcn.split('\\').slice(0, -1).join('\\');
      if (candidateNamespace === namespace) return 0;
      if ([...imported.values()].some((fqfn) => fqfn.toLowerCase() === candidate.fqcn.toLowerCase())) return 1;
      return candidateNamespace === '' ? 2 : 3;
    };
    return callables.flatMap(({ file: owner, item }): FunctionCompletionInfo[] => {
      const alias = [...imported.entries()].find(([, fqfn]) => fqfn.toLowerCase() === item.fqcn.toLowerCase())?.[0];
      const candidateNamespace = item.fqcn.split('\\').slice(0, -1).join('\\');
      const name = alias ? file.imports.find((entry) => entry.kind === 'function' && entry.namespace === namespace && entry.fqcn.toLowerCase() === item.fqcn.toLowerCase())!.alias : item.name;
      if (!name.toLowerCase().startsWith(prefix)) return [];
      const collision = visible.get(item.name.toLowerCase());
      if (!alias && candidateNamespace !== namespace && candidateNamespace !== '' && collision && collision.toLowerCase() !== item.fqcn.toLowerCase()) return [];
      return [{ uri: owner.uri, start: item.start, end: item.end, name, fqcn: item.fqcn, parameters: item.parameters, returnType: item.returnType, importFqfn: alias || candidateNamespace === namespace || candidateNamespace === '' ? undefined : item.fqcn }];
    }).sort((left, right) => {
      const tier = completionTier(left) - completionTier(right);
      if (tier) return tier;
      const leftRank = namespaceCompletionRank(namespace, left.fqcn); const rightRank = namespaceCompletionRank(namespace, right.fqcn);
      return rightRank.common - leftRank.common || leftRank.distance - rightRank.distance
        || left.name.localeCompare(right.name) || left.fqcn.localeCompare(right.fqcn);
    });
  }

  completeConstants(uri: string, offset: number): ConstantCompletionInfo[] {
    const file = this.files.get(uri); if (!file) return [];
    const before = file.source.slice(0, offset); const match = /([A-Z_][A-Z0-9_]*)?$/.exec(before);
    if (!match || typeCompletionPrefix(file.source, offset) !== undefined) return [];
    const prefixStart = offset - (match[1]?.length ?? 0); const context = before.slice(Math.max(0, prefixStart - 24), prefixStart);
    if (/(?:->|\?->|::|\$|\bconst\s+|\buse(?:\s+const)?\s+)\s*$/.test(context)) return [];
    const prefix = match[1] ?? ''; if (!prefix) return [];
    const namespace = this.namespaceAt(file, offset); const imports = file.imports.filter((item) => item.kind === 'const' && item.namespace === namespace);
    const imported = new Map(imports.map((item) => [item.alias, item.fqcn]));
    const constants = [...new Map([...this.files.values()].flatMap((candidate) => candidate.constants.filter((item) => item.global).map((item) => ({ file: candidate, item })))
      .map((entry) => [entry.item.fqcn, entry])).values()];
    const visible = new Map(imported);
    for (const { item } of constants) {
      const candidateNamespace = item.fqcn.split('\\').slice(0, -1).join('\\');
      if (candidateNamespace === namespace || candidateNamespace === '') visible.set(item.name, item.fqcn);
    }
    const completionTier = (candidate: ConstantCompletionInfo): number => {
      const candidateNamespace = candidate.fqcn.split('\\').slice(0, -1).join('\\');
      if (candidateNamespace === namespace) return 0;
      if (imports.some((entry) => entry.fqcn === candidate.fqcn)) return 1;
      return candidateNamespace === '' ? 2 : 3;
    };
    return constants.flatMap(({ file: owner, item }): ConstantCompletionInfo[] => {
      const importedEntry = imports.find((entry) => entry.fqcn === item.fqcn);
      const name = importedEntry?.alias ?? item.name; if (!name.toUpperCase().startsWith(prefix.toUpperCase())) return [];
      const candidateNamespace = item.fqcn.split('\\').slice(0, -1).join('\\'); const collision = visible.get(item.name);
      if (!importedEntry && candidateNamespace !== namespace && candidateNamespace !== '' && collision && collision !== item.fqcn) return [];
      return [{ uri: owner.uri, start: item.start, end: item.end, name, fqcn: item.fqcn, type: item.type, value: item.value, importFqcn: importedEntry || candidateNamespace === namespace || candidateNamespace === '' ? undefined : item.fqcn }];
    }).sort((left, right) => {
      const tier = completionTier(left) - completionTier(right);
      if (tier) return tier;
      const leftRank = namespaceCompletionRank(namespace, left.fqcn); const rightRank = namespaceCompletionRank(namespace, right.fqcn);
      return rightRank.common - leftRank.common || leftRank.distance - rightRank.distance
        || left.name.localeCompare(right.name) || left.fqcn.localeCompare(right.fqcn);
    });
  }

  importInsertion(uri: string, offset: number, fqcn: string, kind: 'class' | 'function' | 'const' = 'class', alias?: string): ImportInsertion | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const namespace = this.namespaceAt(file, offset); const eol = file.source.includes('\r\n') ? '\r\n' : '\n';
    const shortName = fqcn.slice(fqcn.lastIndexOf('\\') + 1); const visibleName = alias ?? shortName;
    if (kind === 'class' && (!/^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(visibleName)
      || file.imports.some((item) => item.kind === 'class' && item.namespace === namespace
        && (item.fqcn.toLowerCase() === fqcn.toLowerCase() || item.alias.toLowerCase() === visibleName.toLowerCase()))
      || file.declarations.some((item) => item.name.toLowerCase() === visibleName.toLowerCase()))) return undefined;
    if (kind === 'function' && (!/^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(visibleName)
      || file.imports.some((item) => item.kind === 'function' && item.namespace === namespace
        && (item.fqcn.toLowerCase() === fqcn.toLowerCase() || item.alias.toLowerCase() === visibleName.toLowerCase()))
      || file.callables.some((item) => item.kind === 'function' && item.fqcn.split('\\').slice(0, -1).join('\\') === namespace
        && item.name.toLowerCase() === visibleName.toLowerCase()))) return undefined;
    if (kind === 'const' && (!/^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(visibleName)
      || file.imports.some((item) => item.kind === 'const' && item.namespace === namespace
        && (item.fqcn === fqcn || item.alias === visibleName))
      || file.constants.some((item) => item.global && item.fqcn.split('\\').slice(0, -1).join('\\') === namespace
        && item.name === visibleName))) return undefined;
    const imports = file.imports.filter((item) => item.namespace === namespace && item.statementStart < offset).sort((a, b) => b.statementEnd - a.statementEnd);
    const statement = kind === 'function' ? `use function ${fqcn};` : kind === 'const' ? `use const ${fqcn};` : `use ${fqcn}${alias && alias !== shortName ? ` as ${alias}` : ''};`;
    if (imports[0]) return { offset: imports[0].statementEnd, text: `${eol}${statement}` };
    const prefix = file.source.slice(0, offset); const namespaces = [...prefix.matchAll(/\bnamespace\s+[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\s*[;{]/g)];
    const declaration = namespaces.at(-1);
    if (declaration) return { offset: declaration.index + declaration[0].length, text: `${eol}${eol}${statement}` };
    const opening = /^<\?php(?:\s+declare\s*\([^;]+;)?/.exec(file.source);
    return opening ? { offset: opening[0].length, text: `${eol}${eol}${statement}` } : undefined;
  }

  private fileForDeclaration(declaration: ParsedDeclaration): SemanticFile | undefined {
    return [...this.files.values()].find((file) => file.declarations.includes(declaration));
  }

  memberAt(uri: string, offset: number): MemberInfo | undefined {
    const members = this.membersAt(uri, offset);
    return members.length && new Set(members.map((member) => this.memberSignature(member))).size === 1 ? members[0] : undefined;
  }

  private membersAt(uri: string, offset: number): MemberInfo[] {
    const file = this.files.get(uri);
    if (!file) return [];
    const dynamicAccess = file.memberAccesses.find((access) => access.dynamic && offset >= access.start && offset <= access.end);
    if (dynamicAccess) return this.dynamicAccessMembers(file, dynamicAccess);
    const word = wordAt(file.source, offset);
    if (!word) return [];
    const target = this.memberTarget(uri, word.end);
    if (!target) return [];
    const name = word.text.replace(/^\$/, '');
    const called = /^\s*\(/.test(file.source.slice(word.end));
    const dollarPrefixed = word.start > 0 && file.source[word.start - 1] === '$';
    const expectedKind: MemberInfo['kind'] = called ? 'method' : target.static && !dollarPrefixed ? 'constant' : 'property';
    const assignment = /^\s*=(?!=|>)/.test(file.source.slice(word.end));
    const members = this.targetMembers(target).filter((candidate) => candidate.kind === expectedKind
      && memberNameEquals(candidate.kind, candidate.name, name) && (candidate.kind !== 'property' || candidate.readable !== false || assignment));
    if (!members.length || !target.groups) return members;
    const signatures = new Set(members.map((member) => this.memberSignature(member)));
    return [...new Map(target.groups.flatMap((group) => group.flatMap((variant) => this.members(variant.fqcn, target.accessFrom, new Set(), false, variant.typeArguments)))
      .filter((candidate) => candidate.kind === expectedKind && this.validAccess(candidate, target.static) && memberNameEquals(candidate.kind, candidate.name, name) && signatures.has(this.memberSignature(candidate)))
      .map((candidate) => [`${candidate.uri}:${candidate.start}:${candidate.end}`, candidate])).values()];
  }

  private dynamicAccessMembers(file: SemanticFile, access: ParsedMemberAccess): MemberInfo[] {
    if (!access.dynamic || !access.receiver) return [];
    const name = this.dynamicAccessName(file, access);
    if (!name) return [];
    const accessFrom = this.containingCallable(file, access.start)?.containerFqcn;
    let target: MemberTarget | undefined;
    if (access.receiver.kind === 'type') {
      const fqcn = this.resolveSourceType(file, access.receiver.name, this.namespaceAt(file, access.start), accessFrom);
      if (fqcn) target = { fqcn, member: name, accessFrom, static: true };
    } else {
      const object = this.variableClass(file, access.receiver.name, access.start, new Set(), access.receiver.nullsafe);
      if (object) target = { fqcn: object.fqcn, member: name, accessFrom, static: false, typeArguments: object.typeArguments, groups: object.groups };
    }
    if (!target) return [];
    return this.targetMembers(target).filter((member) => member.kind === access.kind && this.validAccess(member, target!.static)
      && memberNameEquals(member.kind, member.name, name!));
  }

  private dynamicAccessName(file: SemanticFile, access: ParsedMemberAccess): string | undefined {
    return this.dynamicAccessNameFact(file, access)?.name;
  }

  private dynamicAccessNameFact(file: SemanticFile, access: ParsedMemberAccess): { name: string; location?: SemanticLocation } | undefined {
    if (access.dynamic === 'literal' || access.dynamic === 'expression') return access.name ? { name: access.name, location: { uri: file.uri, start: access.start, end: access.end } } : undefined;
    if (access.dynamic === 'constant') return this.constantDynamicNameFact(file, access.name, access.start, this.containingCallable(file, access.start)?.containerFqcn, new Set());
    if (access.dynamic !== 'variable') return undefined;
    const scope = this.containingScope(file, access.start); if (!scope) return undefined;
    const assignment = file.assignments.filter((item) => item.scopeId === scope.id && item.variable === access.name && item.end <= access.start
      && (!item.validRange || (access.start >= item.validRange.start && access.end <= item.validRange.end)))
      .sort((left, right) => right.end - left.end)[0];
    if (!assignment) return undefined;
    const escaped = access.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const literal = new RegExp(`^\\s*${escaped}\\s*=\\s*(['"])([^'"\\\\]*)\\1\\s*$`).exec(file.source.slice(assignment.start, assignment.end));
    const interveningUse = file.variableReferences.some((reference) => reference.scopeId === scope.id && reference.variable === access.name
      && reference.start >= assignment.end && reference.end <= access.start);
    if (!literal || interveningUse) return undefined;
    const quoted = `${literal[1]}${literal[2]}${literal[1]}`;
    const relative = literal[0].lastIndexOf(quoted) + 1;
    return relative >= 0 ? { name: literal[2]!, location: { uri: file.uri, start: assignment.start + relative, end: assignment.start + relative + literal[2]!.length } } : undefined;
  }

  private constantDynamicNameFact(file: SemanticFile, expression: string, offset: number, scopeFqcn: string | undefined,
    visited: Set<string>): { name: string; location?: SemanticLocation } | undefined {
    const trimmed = expression.trim().replace(/^\((.*)\)$/s, '$1').trim();
    const enumProperty = /^(.+::[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*->\s*(name|value)$/i.exec(trimmed);
    if (enumProperty) {
      const resolved = this.constantDeclarationForExpression(file, enumProperty[1]!, offset, scopeFqcn);
      if (!resolved || resolved.constant.kind !== 'enum-case') return undefined;
      return enumProperty[2]!.toLowerCase() === 'name' ? { name: resolved.constant.name } : this.constantStringValue(resolved.file, resolved.constant, visited);
    }
    const resolved = this.constantDeclarationForExpression(file, trimmed, offset, scopeFqcn);
    return resolved ? this.constantStringValue(resolved.file, resolved.constant, visited) : undefined;
  }

  private constantDeclarationForExpression(file: SemanticFile, expression: string, offset: number, scopeFqcn?: string): { file: SemanticFile; constant: ParsedConstantDeclaration } | undefined {
    const classConstant = /^(.*)::([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)$/.exec(expression);
    if (classConstant) {
      const owner = this.resolveSourceType(file, classConstant[1]!, this.namespaceAt(file, offset), scopeFqcn); if (!owner) return undefined;
      const member = this.members(owner, scopeFqcn).filter((item) => item.kind === 'constant' && item.name === classConstant[2]);
      if (member.length !== 1) return undefined;
      const ownerFile = this.files.get(member[0]!.uri); const constant = ownerFile?.constants.find((item) => item.start === member[0]!.start && item.end === member[0]!.end);
      return ownerFile && constant ? { file: ownerFile, constant } : undefined;
    }
    if (!/^[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*$/.test(expression)) return undefined;
    const fqcn = this.resolveConstant(file, expression, this.namespaceAt(file, offset));
    const matches = [...this.files.values()].flatMap((candidate) => candidate.constants.filter((item) => item.global && item.fqcn === fqcn).map((constant) => ({ file: candidate, constant })));
    return matches.length === 1 ? matches[0] : undefined;
  }

  private constantStringValue(file: SemanticFile, constant: ParsedConstantDeclaration, visited: Set<string>): { name: string; location?: SemanticLocation } | undefined {
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(constant.fqcn) || !constant.value) return undefined;
    visited.add(constant.fqcn);
    const literal = /^(['"])([^'"\\]+)\1$/.exec(constant.value.trim());
    if (literal) {
      const tail = file.source.slice(constant.end, constant.end + Math.max(4096, constant.value.length + 32));
      const match = /^\s*=\s*(['"])([^'"\\]+)\1/.exec(tail);
      if (!match || match[2] !== literal[2]) return undefined;
      const start = constant.end + match[0].indexOf(match[2]!);
      return { name: literal[2]!, location: { uri: file.uri, start, end: start + literal[2]!.length } };
    }
    return this.constantDynamicNameFact(file, constant.value, constant.start, constant.containerFqcn, visited);
  }

  private constantLiteralType(file: SemanticFile, constant: ParsedConstantDeclaration, visited = new Set<string>()): PhpType | undefined {
    const identity = constant.fqcn;
    if (!constant.value || visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(identity)) return undefined;
    visited.add(identity); const value = constant.value.trim();
    const string = /^'([^'\\]*)'$|^"([^"\\$]*)"$/.exec(value); if (string) return literal(string[1] ?? string[2] ?? '');
    if (/^(?:true|false)$/i.test(value)) return literal(value.toLowerCase() === 'true');
    if (/^-?(?:0|[1-9](?:_?[0-9])*)$/.test(value)) {
      const integer = Number(value.replaceAll('_', '')); return Number.isSafeInteger(integer) ? literal(integer) : undefined;
    }
    if (/^-?(?:(?:[0-9](?:_?[0-9])*)?\.[0-9](?:_?[0-9])*(?:[eE][+-]?[0-9](?:_?[0-9])*)?|[0-9](?:_?[0-9])*[eE][+-]?[0-9](?:_?[0-9])*)$/.test(value)) {
      const number = Number(value.replaceAll('_', '')); return Number.isFinite(number) ? literal(number) : undefined;
    }
    if (/^null$/i.test(value)) return primitive('null');
    const array = this.flatArrayLiteral(value); if (array) return array;
    const resolved = this.constantDeclarationForExpression(file, value, constant.start, constant.containerFqcn);
    return resolved ? this.constantLiteralType(resolved.file, resolved.constant, visited) : undefined;
  }

  private dynamicClassConstantType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const syntax = this.expressionSyntax(file, start, end, 'class_constant_access_expression');
    if (!syntax || !/::\s*\{/.test(file.source.slice(start, end))) return undefined;
    const accesses = file.memberAccesses.filter((access) => access.kind === 'constant' && access.dynamic
      && access.start >= start && access.end <= end);
    if (accesses.length !== 1) return undefined;
    const members = this.dynamicAccessMembers(file, accesses[0]!);
    if (members.length !== 1 || members[0]!.constantKind !== 'constant') return undefined;
    const ownerFile = this.files.get(members[0]!.uri);
    const constant = ownerFile?.constants.find((item) => item.start === members[0]!.start && item.end === members[0]!.end);
    return ownerFile && constant ? this.constantLiteralType(ownerFile, constant) : undefined;
  }

  private dynamicMemberRenameLocations(kind: 'method' | 'property', name: string,
    target: (member: MemberInfo) => boolean): SemanticLocation[] | undefined {
    const locations: SemanticLocation[] = [];
    for (const file of this.files.values()) for (const access of file.memberAccesses.filter((item) => item.dynamic && item.kind === kind)) {
      const fact = this.dynamicAccessNameFact(file, access); if (!fact) return undefined;
      if (fact.name.toLowerCase() !== name.toLowerCase()) continue;
      const members = this.dynamicAccessMembers(file, access); if (!members.length) return undefined;
      const matching = members.map(target);
      if (matching.some(Boolean) && !matching.every(Boolean)) return undefined;
      if (matching.every(Boolean)) {
        if (!fact.location) return undefined;
        locations.push(fact.location);
      }
    }
    return [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
  }

  functionAt(uri: string, offset: number): MemberInfo | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declared = file.callables.find((item) => item.kind === 'function' && offset >= item.start && offset <= item.end);
    let callable = declared;
    if (!callable) {
      const call = file.calls.filter((item) => item.kind === 'function' && offset >= item.nameStart && offset <= item.nameEnd)
        .sort((left, right) => left.nameEnd - left.nameStart - (right.nameEnd - right.nameStart))[0];
      const word = wordAt(file.source, offset); if (!call && (!word || !/^\s*\(/.test(file.source.slice(word.end)))) return undefined;
      const name = call ? file.source.slice(call.nameStart, call.nameEnd) : word!.text;
      const before = file.source.slice(Math.max(0, (call?.nameStart ?? word!.start) - 16), call?.nameStart ?? word!.start);
      if (/(?:->|\?->|::|\bnew|\bfunction)\s*$/.test(before)) return undefined;
      const fqfn = this.resolveFunction(file, name, this.namespaceAt(file, offset));
      callable = this.filesForReferenceKeys(`declaration:function:${fqfn.toLowerCase()}`)
        .flatMap((candidate) => candidate.callables).find((item) => item.kind === 'function' && item.fqcn.toLowerCase() === fqfn.toLowerCase());
    }
    if (!callable) return undefined;
    const owner = this.filesForReferenceKeys(`declaration:function:${callable.fqcn.toLowerCase()}`).find((candidate) => candidate.callables.includes(callable!));
    return owner ? { kind: 'function', uri: owner.uri, start: callable.start, end: callable.end, name: callable.name, fqcn: callable.fqcn, parameters: callable.parameters, returnType: callable.returnType, visibility: 'public', static: false, typeScopeFqcn: callable.fqcn, calledOnFqcn: callable.fqcn } : undefined;
  }

  constantAt(uri: string, offset: number): ConstantCompletionInfo | undefined {
    const file = this.files.get(uri); const word = file && wordAt(file.source, offset); if (!file || !word) return undefined;
    const declared = file.constants.find((item) => item.global && offset >= item.start && offset <= item.end);
    const imported = file.imports.find((item) => item.kind === 'const' && offset >= item.pathStart && offset <= item.pathEnd);
    const raw = file.rawNames.filter((item) => item.context === 'code' && offset >= item.start && offset <= item.end)
      .sort((left, right) => left.end - left.start - (right.end - right.start))[0];
    const fqcn = declared?.fqcn ?? imported?.fqcn ?? this.resolveConstant(file, raw?.text ?? word.text, this.namespaceAt(file, offset));
    const matches = this.filesForReferenceKeys(`declaration:constant:${fqcn}`).flatMap((candidate) => candidate.constants
      .filter((item) => item.global && item.fqcn === fqcn).map((constant) => ({ candidate, constant })));
    if (matches.length !== 1) return undefined;
    const { candidate, constant } = matches[0]!;
    return { uri: candidate.uri, start: constant.start, end: constant.end, name: constant.name, fqcn: constant.fqcn, type: constant.type, value: constant.value };
  }

  semanticTokenConstantUses(uri: string): SourceRange[] {
    const file = this.files.get(uri); if (!file) return [];
    const excluded = [
      ...file.typeReferences,
      ...file.memberAccesses,
      ...file.calls.map((call) => ({ start: call.nameStart, end: call.nameEnd })),
    ];
    return file.rawNames.flatMap((name): SourceRange[] => {
      if (name.context !== 'code' || excluded.some((range) => name.start >= range.start && name.end <= range.end)) return [];
      return this.constantAt(uri, name.start + Math.min(1, name.end - name.start)) ? [{ start: name.start, end: name.end }] : [];
    });
  }

  unresolvedNewTypes(uri: string): UnresolvedTypeInfo[] {
    const file = this.files.get(uri); if (!file) return [];
    const known = new Set([...this.files.values()].flatMap((candidate) => candidate.declarations.filter((item) => !item.anonymous).map((item) => item.fqcn.toLowerCase())));
    return file.rawNames.flatMap((name): UnresolvedTypeInfo[] => {
      if (name.context !== 'code' || name.text.toLowerCase() === 'class' || !/\bnew\s*$/i.test(file.source.slice(Math.max(0, name.start - 24), name.start))) return [];
      const fqcn = this.resolveSourceType(file, name.text, this.namespaceAt(file, name.start));
      if (!fqcn || known.has(fqcn.toLowerCase())) return [];
      return [{ uri, start: name.start, end: name.end, name: name.text, fqcn }];
    });
  }

  unresolvedTypeReferences(uri: string): UnresolvedTypeInfo[] {
    const file = this.files.get(uri); if (!file) return [];
    const known = new Set([...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((item) => item.fqcn.toLowerCase())));
    return file.typeReferences.flatMap((reference): UnresolvedTypeInfo[] => {
      // PHP ships attributes outside the deliberately small audited builtin stub. Keep
      // those unknown until the versioned attribute catalogue can prove absence.
      if (reference.context === 'attribute') return [];
      const name = file.source.slice(reference.start, reference.end);
      if (['self', 'static', 'parent'].includes(name.toLowerCase())) return [];
      const containingType = file.declarations.find((item) => reference.start >= item.declarationStart && reference.end <= item.declarationEnd)?.fqcn;
      const scopeFqcn = this.containingCallable(file, reference.start)?.containerFqcn ?? containingType;
      const fqcn = this.resolveSourceType(file, name, this.namespaceAt(file, reference.start), scopeFqcn);
      if (!fqcn || known.has(fqcn.toLowerCase())) return [];
      return [{ uri, start: reference.start, end: reference.end, name, fqcn }];
    });
  }

  unresolvedFunctions(uri: string, knownGlobalTargets: ReadonlySet<string> = new Set()): UnresolvedSymbolInfo[] {
    const file = this.files.get(uri); if (!file) return [];
    const known = new Set([...this.files.values()].flatMap((candidate) => candidate.callables
      .filter((item) => item.kind === 'function').map((item) => item.fqcn.toLowerCase())));
    return file.calls.flatMap((call): UnresolvedSymbolInfo[] => {
      if (call.kind !== 'function') return [];
      const name = file.source.slice(call.nameStart, call.nameEnd);
      const imported = file.imports.some((item) => item.kind === 'function' && item.namespace === this.namespaceAt(file, call.nameStart)
        && item.alias.toLowerCase() === name.toLowerCase());
      if (!name.includes('\\') && !imported && !knownGlobalTargets.has(name.toLowerCase())) return [];
      const fqcn = this.resolveFunction(file, name, this.namespaceAt(file, call.nameStart));
      // The audited builtin catalogue is deliberately incomplete. A global target
      // may still be supplied by PHP or an extension, so unqualified identities are
      // eligible only when the caller supplies an explicit audited whitelist.
      if ((!fqcn.includes('\\') && !knownGlobalTargets.has(fqcn.toLowerCase())) || known.has(fqcn.toLowerCase())) return [];
      return [{ uri, start: call.nameStart, end: call.nameEnd, kind: 'function', name, fqcn }];
    });
  }

  unresolvedConstants(uri: string, knownGlobalTargets: ReadonlySet<string> = new Set()): UnresolvedSymbolInfo[] {
    const file = this.files.get(uri); if (!file) return [];
    const known = new Set([...this.files.values()].flatMap((candidate) => candidate.constants
      .filter((item) => item.global).map((item) => item.fqcn)));
    const excluded = [
      ...file.typeReferences,
      ...file.memberAccesses,
      ...file.calls.map((call) => ({ start: call.nameStart, end: call.nameEnd })),
      ...file.declarations.map((item) => ({ start: item.start, end: item.end })),
      ...file.callables.map((item) => ({ start: item.start, end: item.end })),
      ...file.constants.map((item) => ({ start: item.start, end: item.end })),
      ...file.imports.map((item) => ({ start: item.statementStart, end: item.statementEnd })),
    ];
    return file.rawNames.flatMap((raw): UnresolvedSymbolInfo[] => {
      if (raw.context !== 'code' || excluded.some((range) => raw.start >= range.start && raw.end <= range.end)) return [];
      // rawNames intentionally remains a broad navigation fallback. A qualified
      // namespace declaration has the same lexical shape as a constant, so reject
      // that declaration context before resolving expression identities.
      if (/\bnamespace\s*$/i.test(file.source.slice(Math.max(0, raw.start - 32), raw.start))) return [];
      const namespace = this.namespaceAt(file, raw.start);
      const imported = file.imports.some((item) => item.kind === 'const' && item.namespace === namespace && item.alias === raw.text);
      if (!raw.text.includes('\\') && !imported && !knownGlobalTargets.has(raw.text)) return [];
      const fqcn = this.resolveConstant(file, raw.text, namespace);
      if ((!fqcn.includes('\\') && !knownGlobalTargets.has(fqcn)) || known.has(fqcn)) return [];
      return [{ uri, start: raw.start, end: raw.end, kind: 'constant', name: raw.text, fqcn }];
    });
  }

  undefinedVariables(uri: string): UndefinedVariableInfo[] {
    const file = this.files.get(uri); if (!file || file.syntaxErrors.length) return [];
    const retainedTree = this.trees.get(uri); const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, uri).tree;
    const root = (retainedTree ?? temporaryTree!).rootNode;
    const predefined = new Set(['$GLOBALS', '$_SERVER', '$_GET', '$_POST', '$_FILES', '$_COOKIE', '$_SESSION', '$_REQUEST', '$_ENV']);
    const result: UndefinedVariableInfo[] = [];
    const contains = (container: SyntaxNode | null | undefined, node: SyntaxNode): boolean => Boolean(container
      && node.startIndex >= container.startIndex && node.endIndex <= container.endIndex);
    const enclosing = (node: SyntaxNode, scopeNode: SyntaxNode, predicate: (candidate: SyntaxNode) => boolean): SyntaxNode | undefined => {
      let current = node.parent;
      while (current && current !== scopeNode) {
        if (predicate(current)) return current;
        current = current.parent;
      }
      return undefined;
    };
    try {
      const scopeFacts = new Map<string, { definitions: Map<string, number[]>; dynamicDefinitionOffsets: number[] }>();
      const potentiallyDefined = (scopeId: string | undefined, variable: string, offset: number): boolean => {
        if (predefined.has(variable) || variable === '$this') return true;
        const facts = scopeId && scopeFacts.get(scopeId); if (!facts) return true;
        return (facts.definitions.get(variable) ?? []).some((definition) => definition <= offset)
          || facts.dynamicDefinitionOffsets.some((definition) => definition <= offset);
      };
      const orderedScopes = [...file.scopes].sort((left, right) => (right.end - right.start) - (left.end - left.start));
      for (const scope of orderedScopes) {
        const scopeNode = deepestLocalSyntax(root, scope.start, scope.end, (node) => node.startIndex === scope.start && node.endIndex === scope.end
          && (node.type === 'function_definition' || node.type === 'method_declaration' || node.type === 'anonymous_function' || node.type === 'arrow_function' || node.type === 'property_hook'));
        if (!scopeNode) continue;
        const references = file.variableReferences.filter((item) => item.scopeId === scope.id);
        const nodes = new Map<number, SyntaxNode>(); let incomplete = false;
        for (const reference of references) {
          const node = deepestLocalSyntax(scopeNode, reference.start, reference.end, (candidate) => candidate.type === 'variable_name'
            && candidate.startIndex === reference.start && candidate.endIndex === reference.end);
          if (!node) { incomplete = true; break; }
          nodes.set(reference.start, node);
        }
        if (incomplete) continue;
        const definitions = new Map<string, number[]>();
        const define = (name: string, offset: number): void => {
          const offsets = definitions.get(name) ?? []; offsets.push(offset); definitions.set(name, offsets);
        };
        for (const parameter of scope.parameters) define(`$${parameter.name}`, scope.start);
        for (const capture of scope.captures) define(capture.variable, scope.start);
        if (scope.kind === 'method' || scope.kind === 'property-hook') define('$this', scope.start);
        for (const child of file.scopes.filter((candidate) => candidate.parentId === scope.id && candidate.kind === 'closure')) {
          for (const capture of child.captures.filter((candidate) => candidate.byReference)) define(capture.variable, child.start);
        }
        const dynamicDefinitionOffsets: number[] = [];
        const traversal = walkLocalSyntax(scopeNode, (node) => {
          if (node !== scopeNode && ['function_definition', 'method_declaration', 'anonymous_function', 'arrow_function', 'property_hook'].includes(node.type)) return 'skip';
          if (['include_expression', 'include_once_expression', 'require_expression', 'require_once_expression', 'dynamic_variable_name'].includes(node.type)) {
            dynamicDefinitionOffsets.push(node.endIndex);
          }
          if (node.type === 'function_call_expression') {
            const functionNode = node.childForFieldName('function') ?? node.childForFieldName('name') ?? node.namedChildren[0];
            const name = functionNode?.text.replace(/^\\+/, '').toLowerCase();
            if (name === 'extract' || name === 'eval' || name === 'parse_str') dynamicDefinitionOffsets.push(node.endIndex);
          }
          return 'descend';
        });
        if (!traversal.complete) continue;
        const argumentDefinitionCache = new Map<number, { callEnd: number } | null>();
        const argumentMayDefine = (node: SyntaxNode): { callEnd: number } | undefined => {
          const cached = argumentDefinitionCache.get(node.startIndex);
          if (cached !== undefined) return cached ?? undefined;
          const argument = enclosing(node, scopeNode, (candidate) => candidate.type === 'argument');
          if (!argument || argument.namedChildren.at(-1)?.startIndex !== node.startIndex || argument.namedChildren.at(-1)?.endIndex !== node.endIndex) {
            argumentDefinitionCache.set(node.startIndex, null); return undefined;
          }
          const callNode = argument.parent?.parent;
          if (!callNode || !['function_call_expression', 'member_call_expression', 'nullsafe_member_call_expression', 'scoped_call_expression'].includes(callNode.type)) {
            argumentDefinitionCache.set(node.startIndex, null); return undefined;
          }
          const call = file.calls.find((candidate) => candidate.start === callNode.startIndex && candidate.end === callNode.endIndex);
          if (!call) { const value = { callEnd: callNode.endIndex }; argumentDefinitionCache.set(node.startIndex, value); return value; }
          const signature = this.signature(uri, call.argumentsStart + 1);
          if (!signature) { const value = { callEnd: call.end }; argumentDefinitionCache.set(node.startIndex, value); return value; }
          const argumentIndex = call.arguments.findIndex((candidate) => candidate.start === argument.startIndex && candidate.end === argument.endIndex);
          if (argumentIndex < 0) { const value = { callEnd: call.end }; argumentDefinitionCache.set(node.startIndex, value); return value; }
          let positional = 0; let parameter: ParsedParameter | undefined;
          for (let index = 0; index <= argumentIndex; index += 1) {
            const candidate = call.arguments[index]!;
            parameter = candidate.name
              ? signature.parameters.find((item) => item.name === candidate.name)
              : signature.parameters[positional] ?? (signature.parameters.at(-1)?.variadic ? signature.parameters.at(-1) : undefined);
            if (!candidate.name) positional += 1;
          }
          const value = parameter?.byReference ? { callEnd: call.end } : null;
          argumentDefinitionCache.set(node.startIndex, value); return value ?? undefined;
        };
        for (const reference of references) {
          const node = nodes.get(reference.start)!;
          if (scope.parameters.some((parameter) => parameter.start === reference.start && parameter.end === reference.end)) continue;
          const captureClause = enclosing(node, scopeNode, (candidate) => candidate.type === 'anonymous_function_use_clause');
          if (captureClause) continue;
          const assignment = enclosing(node, scopeNode, (candidate) => candidate.type === 'assignment_expression' || candidate.type === 'reference_assignment_expression');
          if (assignment && contains(assignment.childForFieldName('left') ?? assignment.namedChildren[0], node)) {
            define(reference.variable, assignment.endIndex); continue;
          }
          const foreach = enclosing(node, scopeNode, (candidate) => candidate.type === 'foreach_statement');
          if (foreach) {
            const collection = foreach.namedChildren[0]; const target = foreach.namedChildren[1];
            if (target && contains(target, node) && !contains(collection, node)) {
              const body = foreach.childForFieldName('body'); define(reference.variable, body?.startIndex ?? foreach.endIndex); continue;
            }
          }
          const catchClause = enclosing(node, scopeNode, (candidate) => candidate.type === 'catch_clause');
          if (catchClause && contains(catchClause.childForFieldName('name'), node)) {
            define(reference.variable, catchClause.childForFieldName('body')?.startIndex ?? catchClause.endIndex); continue;
          }
          const globalDeclaration = enclosing(node, scopeNode, (candidate) => candidate.type === 'global_declaration');
          if (globalDeclaration) { define(reference.variable, globalDeclaration.endIndex); continue; }
          const staticDeclaration = enclosing(node, scopeNode, (candidate) => candidate.type === 'static_variable_declaration' || candidate.type === 'function_static_declaration');
          if (staticDeclaration) { define(reference.variable, staticDeclaration.endIndex); continue; }
          const possibleReference = argumentMayDefine(node);
          if (possibleReference) define(reference.variable, possibleReference.callEnd);
          const augmented = enclosing(node, scopeNode, (candidate) => candidate.type === 'augmented_assignment_expression' || candidate.type === 'update_expression');
          if (augmented) define(reference.variable, augmented.endIndex);
        }
        scopeFacts.set(scope.id, { definitions, dynamicDefinitionOffsets });
        for (const reference of references) {
          if (predefined.has(reference.variable) || reference.variable === '$this') continue;
          const node = nodes.get(reference.start)!;
          if (scope.parameters.some((parameter) => parameter.start === reference.start && parameter.end === reference.end)) continue;
          const captureClause = enclosing(node, scopeNode, (candidate) => candidate.type === 'anonymous_function_use_clause');
          if (captureClause) {
            const capture = scope.captures.find((candidate) => candidate.variable === reference.variable);
            if (capture?.byReference || !scope.parentId || potentiallyDefined(scope.parentId, reference.variable, scope.start)) continue;
            result.push({ uri, start: reference.start, end: reference.end, name: reference.variable.slice(1), scopeId: scope.id });
            continue;
          }
          const assignment = enclosing(node, scopeNode, (candidate) => candidate.type === 'assignment_expression' || candidate.type === 'reference_assignment_expression');
          if (assignment && contains(assignment.childForFieldName('left') ?? assignment.namedChildren[0], node)) continue;
          const foreach = enclosing(node, scopeNode, (candidate) => candidate.type === 'foreach_statement');
          if (foreach && contains(foreach.namedChildren[1], node) && !contains(foreach.namedChildren[0], node)) continue;
          const catchClause = enclosing(node, scopeNode, (candidate) => candidate.type === 'catch_clause');
          if (catchClause && contains(catchClause.childForFieldName('name'), node)) continue;
          if (enclosing(node, scopeNode, (candidate) => candidate.type === 'global_declaration' || candidate.type === 'static_variable_declaration'
            || candidate.type === 'function_static_declaration')) continue;
          if (argumentMayDefine(node)) continue;
          const safeCall = enclosing(node, scopeNode, (candidate) => candidate.type === 'function_call_expression');
          const safeName = (safeCall?.childForFieldName('function') ?? safeCall?.childForFieldName('name') ?? safeCall?.namedChildren[0])?.text.toLowerCase();
          if (safeName === 'isset' || safeName === 'empty') continue;
          if (enclosing(node, scopeNode, (candidate) => candidate.type === 'unset_statement')) continue;
          const coalesce = enclosing(node, scopeNode, (candidate) => {
            if (candidate.type !== 'binary_expression' && candidate.type !== 'augmented_assignment_expression') return false;
            const left = candidate.childForFieldName('left') ?? candidate.namedChildren[0]; const right = candidate.childForFieldName('right') ?? candidate.namedChildren.at(-1);
            return Boolean(left && right && contains(left, node) && file.source.slice(left.endIndex, right.startIndex).includes('??'));
          });
          if (coalesce) continue;
          if ((definitions.get(reference.variable) ?? []).some((offset) => offset <= reference.start)) continue;
          if (dynamicDefinitionOffsets.some((offset) => offset <= reference.start)) continue;
          if (scope.kind === 'arrow' && (!scope.parentId || potentiallyDefined(scope.parentId, reference.variable, scope.start))) continue;
          result.push({ uri, start: reference.start, end: reference.end, name: reference.variable.slice(1), scopeId: scope.id });
        }
      }
      return result;
    } finally { temporaryTree?.delete(); }
  }

  unresolvedMembers(uri: string): UnresolvedMemberInfo[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.memberAccesses.flatMap((access): UnresolvedMemberInfo[] => {
      if (access.dynamic === 'unknown') return [];
      const target = this.memberTarget(uri, access.end); if (!target || !this.hasCompleteHierarchy(target.fqcn)) return [];
      if (access.kind === 'property' && !access.static) return [];
      if (target.groups) {
        const availableInEveryAlternative = target.groups.every((group) => this.groupHasDeclaredMember(group, access.kind, access.name, access.static)
          || this.groupHandlesMagicMember(group, target.accessFrom, access.kind, access.static));
        return availableInEveryAlternative ? [] : [{ uri, start: access.start, end: access.end, name: access.name, ownerFqcn: target.fqcn, kind: access.kind, static: access.static }];
      }
      if (access.static && access.name.toLowerCase() === 'class') return [];
      const available = this.members(target.fqcn, target.accessFrom, new Set(), false, target.typeArguments);
      const declared = this.members(target.fqcn, target.fqcn, new Set(), true);
      if (declared.some((member) => memberNameEquals(member.kind, member.name, access.name))) return [];
      const magic = access.kind === 'method' ? (access.static ? '__callStatic' : '__call') : undefined;
      if (magic && available.some((member) => member.kind === 'method' && member.name.toLowerCase() === magic.toLowerCase())) return [];
      return [{ uri, start: access.start, end: access.end, name: access.name, ownerFqcn: target.fqcn, kind: access.kind, static: access.static }];
    });
  }

  invalidStaticMemberAccesses(uri: string): InvalidStaticMemberAccess[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.memberAccesses.flatMap((access): InvalidStaticMemberAccess[] => {
      if (access.dynamic === 'unknown') return [];
      if (!access.static || access.kind === 'constant') return [];
      const target = this.memberTarget(uri, access.end); if (!target || !this.hasCompleteHierarchy(target.fqcn)) return [];
      const member = this.members(target.fqcn, target.accessFrom, new Set(), false, target.typeArguments).find((candidate) => candidate.kind === access.kind && candidate.name.toLowerCase() === access.name.toLowerCase());
      return member && !member.static ? [{ uri, start: access.start, end: access.end, name: access.name, ownerFqcn: target.fqcn, kind: access.kind }] : [];
    });
  }

  inaccessibleMemberAccesses(uri: string): InaccessibleMemberAccess[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.memberAccesses.flatMap((access): InaccessibleMemberAccess[] => {
      if (access.dynamic === 'unknown') return [];
      const target = this.memberTarget(uri, access.end); if (!target || !this.hasCompleteHierarchy(target.fqcn)) return [];
      if (target.groups) return [];
      const modes = access.kind === 'property' ? this.propertyAccessModes(file, access) : { read: true, write: false };
      const operation = modes.write ? 'write' : 'read';
      if (access.kind === 'property') {
        const member = this.members(target.fqcn, target.accessFrom, new Set(), true, target.typeArguments)
          .find((candidate) => candidate.kind === 'property' && candidate.name === access.name);
        if (!member) return [];
        const accessible = this.members(target.fqcn, target.accessFrom, new Set(), false, target.typeArguments);
        const magic = modes.read && modes.write ? ['__get', '__set'] : [operation === 'write' ? '__set' : '__get'];
        if (!member.hooked && magic.every((name) => accessible.some((candidate) => candidate.kind === 'method' && candidate.name.toLowerCase() === name))) return [];
        const visibility = operation === 'write' ? member.writeVisibility ?? member.visibility : member.visibility;
        if (this.memberVisibilityAllowed(visibility, member.typeScopeFqcn, target.accessFrom)) return [];
        if (visibility === 'public') return [];
        return [{ uri, start: access.start, end: access.end, name: access.name, ownerFqcn: target.fqcn,
          kind: access.kind, visibility, static: access.static, operation }];
      }
      const accessible = this.members(target.fqcn, target.accessFrom, new Set(), false, target.typeArguments);
      if (accessible.some((candidate) => candidate.kind === access.kind && candidate.name.toLowerCase() === access.name.toLowerCase())) return [];
      const member = this.members(target.fqcn, target.accessFrom, new Set(), true, target.typeArguments)
        .find((candidate) => candidate.kind === access.kind && candidate.name.toLowerCase() === access.name.toLowerCase());
      if (!member || member.visibility === 'public') return [];
      const magicNames = access.kind === 'method' ? [access.static ? '__callStatic' : '__call'] : [];
      if (accessible.some((candidate) => candidate.kind === 'method' && magicNames.includes(candidate.name.toLowerCase()))) return [];
      return [{ uri, start: access.start, end: access.end, name: access.name, ownerFqcn: target.fqcn, kind: access.kind, visibility: member.visibility, static: access.static }];
    });
  }

  invalidPropertyOperations(uri: string): InvalidPropertyOperation[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.memberAccesses.flatMap((access): InvalidPropertyOperation[] => {
      if (access.kind !== 'property' || access.static || access.dynamic === 'unknown') return [];
      const target = this.memberTarget(uri, access.end); if (!target || target.groups || !this.hasCompleteHierarchy(target.fqcn)) return [];
      const members = this.members(target.fqcn, target.accessFrom, new Set(), true, target.typeArguments)
        .filter((candidate) => candidate.kind === 'property' && candidate.name === access.name);
      if (members.length !== 1 || !members[0]!.hooked) return [];
      const member = members[0]!; const modes = this.propertyAccessModes(file, access);
      const results: InvalidPropertyOperation[] = [];
      const writeVisibility = member.writeVisibility ?? member.visibility;
      if (modes.referenceAssignment && this.memberVisibilityAllowed(writeVisibility, member.typeScopeFqcn, target.accessFrom)) {
        results.push({ uri, start: access.start, end: access.end, name: member.name, ownerFqcn: member.typeScopeFqcn,
          operation: 'write', reason: 'reference-assignment' });
        return results;
      }
      if (modes.indirectWrite && this.memberVisibilityAllowed(member.visibility, member.typeScopeFqcn, target.accessFrom)
        && this.memberVisibilityAllowed(writeVisibility, member.typeScopeFqcn, target.accessFrom)
        && member.getByReference !== true) {
        results.push({ uri, start: access.start, end: access.end, name: member.name, ownerFqcn: member.typeScopeFqcn,
          operation: 'write', reason: 'indirect-modification' });
        return results;
      }
      if (modes.read && this.memberVisibilityAllowed(member.visibility, member.typeScopeFqcn, target.accessFrom) && member.readable === false) {
        results.push({ uri, start: access.start, end: access.end, name: member.name, ownerFqcn: member.typeScopeFqcn,
          operation: 'read', reason: 'unreadable' });
      }
      if (modes.write && this.memberVisibilityAllowed(writeVisibility, member.typeScopeFqcn, target.accessFrom) && member.writable === false) {
        results.push({ uri, start: access.start, end: access.end, name: member.name, ownerFqcn: member.typeScopeFqcn,
          operation: 'write', reason: 'unwritable' });
      }
      return results;
    });
  }

  invalidHookedObjectReferenceIterations(uri: string): InvalidHookedObjectReferenceIteration[] {
    const file = this.files.get(uri); if (!file) return [];
    const retainedTree = this.trees.get(uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, uri).tree;
    const results: InvalidHookedObjectReferenceIteration[] = []; let complete = true;
    try {
      const traversal = walkLocalSyntax((retainedTree ?? temporaryTree!).rootNode, (node) => {
        if (node.type !== 'foreach_statement') return 'descend';
        const iterable = node.namedChildren[0]; const value = node.namedChildren[1];
        if (!iterable || iterable.type !== 'variable_name' || !value) return 'descend';
        let byReference = false;
        const referenceTraversal = walkLocalSyntax(value, (candidate) => {
          if (candidate.type === 'by_ref') { byReference = true; return 'stop'; }
          return 'descend';
        });
        if (!referenceTraversal.complete) complete = false;
        if (!byReference) return 'descend';
        const object = this.variableClass(file, iterable.text, iterable.startIndex);
        if (!object || object.nullable || object.groups || !this.hasCompleteHierarchy(object.fqcn)) return 'descend';
        const accessFrom = this.containingCallable(file, iterable.startIndex)?.containerFqcn;
        const propertyNames = this.members(object.fqcn, accessFrom, new Set(), false, object.typeArguments)
          .filter((member) => member.kind === 'property' && !member.static && member.hooked && member.getByReference !== true
            && this.memberVisibilityAllowed(member.writeVisibility ?? member.visibility, member.typeScopeFqcn, accessFrom))
          .map((member) => member.name).sort();
        if (propertyNames.length) results.push({ uri, start: iterable.startIndex, end: iterable.endIndex, ownerFqcn: object.fqcn, propertyNames });
        return 'descend';
      });
      if (!traversal.complete) complete = false;
      return complete ? results : [];
    } finally { temporaryTree?.delete(); }
  }

  nullableMemberAccesses(uri: string): NullableMemberAccess[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.memberAccesses.flatMap((access): NullableMemberAccess[] => {
      if (access.static || access.kind === 'constant') return [];
      const prefixStart = Math.max(0, access.start - 256); const prefix = file.source.slice(prefixStart, access.start);
      const receiver = /(\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*(\?->|->)\s*$/.exec(prefix);
      const accessFrom = this.containingCallable(file, access.start)?.containerFqcn;
      if (!receiver) {
        const staticCall = /([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*::\s*([A-Za-z_][A-Za-z0-9_]*)\s*\((?:[^()]|\([^()]*\))*\)\s*(\?->|->)\s*$/.exec(prefix);
        if (!staticCall || staticCall[3] !== '->') return [];
        const namespace = accessFrom?.split('\\').slice(0, -1).join('\\') ?? file.namespace;
        const owner = this.resolveSourceType(file, staticCall[1]!, namespace, accessFrom);
        const factory = owner ? this.members(owner, accessFrom).find((candidate) => candidate.kind === 'method' && candidate.static
          && candidate.name.toLowerCase() === staticCall[2]!.toLowerCase() && this.validAccess(candidate, true)) : undefined;
        const target = factory && this.memberReturnClass(factory, true);
        if (!target?.nullable || !this.hasCompleteHierarchy(target.fqcn)) return [];
        const memberExists = this.members(target.fqcn, accessFrom).some((candidate) => candidate.kind === access.kind && !candidate.static
          && candidate.name.toLowerCase() === access.name.toLowerCase());
        const operatorStart = prefixStart + staticCall.index + staticCall[0].lastIndexOf(staticCall[3]);
        return memberExists ? [{ uri, start: access.start, end: access.end, name: access.name, ownerFqcn: target.fqcn, kind: access.kind,
          operatorStart, operatorEnd: operatorStart + staticCall[3].length }] : [];
      }
      if (receiver[2] !== '->') return [];
      const target = this.variableClass(file, receiver[1]!, access.start, new Set(), true);
      const composite = target ? undefined : this.variableObjectGroups(file, receiver[1]!, access.start);
      if ((!target?.nullable || !this.hasCompleteHierarchy(target.fqcn)) && !composite?.nullable) return [];
      const memberExists = target
        ? this.members(target.fqcn, accessFrom).some((candidate) => candidate.kind === access.kind && !candidate.static && candidate.name.toLowerCase() === access.name.toLowerCase())
        : composite!.groups.every((group) => this.groupHasAccessibleMember(group, accessFrom, access.kind, access.name, false)
          || this.groupHandlesMagicMember(group, accessFrom, access.kind, false));
      const operatorStart = prefixStart + receiver.index + receiver[0].lastIndexOf(receiver[2]);
      const ownerFqcn = target?.fqcn ?? composite!.groups[0]![0]!.fqcn;
      return memberExists ? [{ uri, start: access.start, end: access.end, name: access.name, ownerFqcn, kind: access.kind, operatorStart, operatorEnd: operatorStart + receiver[2].length }] : [];
    });
  }

  missingRequiredArguments(uri: string): MissingRequiredArguments[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.calls.flatMap((call): MissingRequiredArguments[] => {
      if (call.firstClassCallable) return [];
      if (!call.flat || call.arguments.some((argument) => argument.unpacked)) return [];
      const signature = this.signature(uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1)); if (!signature) return [];
      if (signature.kind === 'function') {
        const matches = [...this.files.values()].flatMap((candidate) => candidate.callables)
          .filter((candidate) => candidate.kind === 'function' && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
        if (matches.length !== 1) return [];
      }
      const parameters = signature.parameters; const supplied = new Set<string>(); let positional = 0;
      for (const argument of call.arguments) {
        if (argument.name) {
          const parameter = parameters.find((candidate) => candidate.name === argument.name);
          if (!parameter) return [];
          supplied.add(parameter.name);
        } else {
          const parameter = parameters[positional]; if (parameter) supplied.add(parameter.name);
          positional += 1;
        }
      }
      const missing = parameters.filter((parameter) => parameter.defaultValue === undefined && !parameter.variadic && !supplied.has(parameter.name));
      return missing.length ? [{ uri, start: call.nameStart, end: call.nameEnd, callable: signature.fqcn, parameters: missing.map((parameter) => parameter.name) }] : [];
    });
  }

  phpDocTypeConflicts(uri: string): PhpDocTypeConflict[] {
    const file = this.files.get(uri); if (!file) return [];
    const conflicts: PhpDocTypeConflict[] = [];
    const inspect = (tag: PhpDocTag | undefined, nativeText: string | undefined, scopeFqcn: string,
      kind: PhpDocTypeConflict['kind'], subject: string, templateType?: (name: string) => PhpType | undefined): void => {
      if (!tag?.type || !nativeText) return;
      const documented = this.phpDocDiagnosticType(file, tag.type, scopeFqcn, { remaining: 256 }, templateType,
        (name) => this.phpDocRuntimeUpperBound(name));
      const native = this.nativeSourceType(file, nativeText, scopeFqcn);
      if (!documented || native.kind === 'unknown' || this.phpDocFitsNative(documented, native, nativeText)) return;
      conflicts.push({ uri, start: tag.type.start, end: tag.type.end, kind, subject,
        nativeType: displayType(native), phpDocType: displayPhpDocType(tag.type) });
    };
    for (const callable of file.callables) {
      const doc = adjacentPhpDoc(file, callable.declarationStart); if (!doc || doc.errors.length) continue;
      const scope = callable.containerFqcn ?? callable.fqcn;
      const templateType = this.phpDocTemplateBoundResolver(file,
        [callable.containerFqcn, callable.fqcn].filter((owner): owner is string => Boolean(owner)), scope);
      for (const parameter of callable.parameters) {
        const tag = preferredDocTags(doc, (item) => item.name === 'param' && item.variable === `$${parameter.name}`,
          (item) => item.variable ?? '').at(-1);
        inspect(tag, parameter.nativeType, scope, 'parameter', `$${parameter.name}`, templateType);
      }
      const tag = preferredDocTags(doc, (item) => item.name === 'return', () => 'return').at(-1);
      inspect(tag, callable.nativeReturnType, scope, 'return', callable.fqcn, templateType);
    }
    for (const property of file.properties) {
      const doc = adjacentPhpDoc(file, property.declarationStart); if (!doc || doc.errors.length) continue;
      const tag = preferredPropertyVarTag(doc, property.name);
      const templateType = this.phpDocTemplateBoundResolver(file, [property.containerFqcn], property.containerFqcn);
      inspect(tag, property.type, property.containerFqcn, 'property', property.fqcn, templateType);
    }
    return conflicts;
  }

  incompatibleArguments(uri: string): IncompatibleArgument[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.calls.flatMap((call): IncompatibleArgument[] => {
      if (call.arguments.some((argument) => argument.unpacked)) return [];
      const signature = this.completedCallSignature(file, call); if (!signature) return [];
      if (signature.kind === 'function') {
        if (this.callableDeclarationsForSignature(signature).length !== 1) return [];
      } else {
        const matches = [...this.files.values()].flatMap((candidate) => candidate.callables)
          .filter((candidate) => candidate.kind === 'method' && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
        if (matches.length !== 1 && signature.synthetic !== 'enum-native') return [];
      }
      const declarationFile = this.files.get(signature.uri); if (!declarationFile) return [];
      let positional = 0;
      return call.arguments.flatMap((argument): IncompatibleArgument[] => {
        const parameter = argument.name
          ? signature.parameters.find((candidate) => candidate.name === argument.name)
          : signature.parameters[Math.min(positional++, Math.max(0, signature.parameters.length - 1))];
        if (!parameter) return [];
        const separator = argument.nameEnd === undefined ? -1 : file.source.indexOf(':', argument.nameEnd);
        const valueStart = separator >= 0 && separator < argument.end ? separator + 1 : argument.start;
        const expected = this.documentedClassString(declarationFile, parameter.type, signature.typeScopeFqcn)
          ?? this.documentedList(declarationFile, parameter.type, signature.typeScopeFqcn)
          ?? this.documentedShape(declarationFile, parameter.type, signature.typeScopeFqcn)
          ?? this.documentedCallable(declarationFile, parameter.type, signature.typeScopeFqcn)
          ?? this.documentedGeneric(declarationFile, parameter.type, signature.typeScopeFqcn)
          ?? (parameter.nativeType ? this.nativeSourceType(declarationFile, parameter.nativeType, signature.typeScopeFqcn) : undefined);
        if (!expected) return [];
        let actual = this.provenArgumentType(file, valueStart, argument.end); if (!actual) return [];
        if (expected.kind === 'integer-range') {
          const integer = /^\s*(-?(?:0|[1-9][0-9_]*))\s*$/.exec(file.source.slice(valueStart, argument.end));
          const value = integer ? Number(integer[1]!.replaceAll('_', '')) : undefined;
          if (value !== undefined && Number.isSafeInteger(value)) actual = literal(value);
        }
        const hasLiteralConstraint = (type: PhpType): boolean => type.kind === 'literal'
          || (type.kind === 'union' && type.types.some(hasLiteralConstraint));
        if (hasLiteralConstraint(expected)) {
          const source = file.source.slice(valueStart, argument.end).trim();
          const integer = /^-?(?:0|[1-9](?:_?[0-9])*)$/.exec(source);
          const string = /^'([^'\\]*)'$/.exec(source);
          if (integer) {
            const value = Number(integer[0].replaceAll('_', '')); if (Number.isSafeInteger(value)) actual = literal(value);
          } else if (string) actual = literal(string[1]!);
        }
        if (isDirectScalar(actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(file)) return [];
        const result = compatibility(actual, expected, this.typeRelationContext());
        return result === 'no' ? [{ uri, start: valueStart, end: argument.end, callable: signature.fqcn, parameter: parameter.name, actualType: displayType(actual), expectedType: displayType(expected) }] : [];
      });
    });
  }

  incompatibleReturns(uri: string): IncompatibleReturn[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.returns.flatMap((statement): IncompatibleReturn[] => {
      const callable = file.callables.find((item) => item.fqcn === statement.scopeId); if (!callable?.nativeReturnType) return [];
      const scope = file.scopes.find((item) => item.id === statement.scopeId);
      if (scope && /\byield\b/i.test(file.source.slice(scope.start, scope.end))) return [];
      const expected = this.nativeSourceType(file, callable.nativeReturnType, callable.containerFqcn ?? callable.fqcn);
      const expectedName = callable.nativeReturnType.trim().toLowerCase();
      if (statement.expressionStart === undefined || statement.expressionEnd === undefined) {
        if (expectedName === 'void') return [];
        return [{ uri, start: statement.start, end: statement.end, callable: callable.fqcn, actualType: 'void', expectedType: displayType(expected) }];
      }
      if (expectedName === 'void' || expectedName === 'never') return [{ uri, start: statement.expressionStart, end: statement.expressionEnd,
        callable: callable.fqcn, actualType: 'value', expectedType: displayType(expected) }];
      const actual = this.provenArgumentType(file, statement.expressionStart, statement.expressionEnd); if (!actual) return [];
      if (isDirectScalar(actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(file)) return [];
      const result = compatibility(actual, expected, this.typeRelationContext());
      return result === 'no' ? [{ uri, start: statement.expressionStart, end: statement.expressionEnd, callable: callable.fqcn,
        actualType: displayType(actual), expectedType: displayType(expected) }] : [];
    });
  }

  incompatibleAssignments(uri: string): IncompatibleAssignment[] {
    const file = this.files.get(uri); if (!file) return [];
    const properties: IncompatibleAssignment[] = [];
    const pattern = /(\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*->\s*([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*=(?!=|>)\s*(new\s+[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*(?:\s*\([^;]*\))?|\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*|null|true|false|[+-]?(?:(?:[0-9][0-9_]*)?\.[0-9][0-9_]*(?:[eE][+-]?[0-9][0-9_]*)?|[0-9][0-9_]*[eE][+-]?[0-9][0-9_]*|0|[1-9][0-9_]*|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\[\s*\]|array\s*\(\s*\))\s*(?=;)/giu;
    for (const match of file.source.matchAll(pattern)) {
      const matchStart = match.index; const matchEnd = matchStart + match[0].length;
      if ([...file.commentRanges, ...file.stringRanges].some((range) => matchStart >= range.start && matchEnd <= range.end)) continue;
      const propertyStart = matchStart + match[0].indexOf(match[2]!);
      const member = this.memberAt(uri, propertyStart + 1); const expectedText = member?.writeType ?? member?.returnType;
      if (member?.kind !== 'property' || !expectedText || !this.hasCompleteHierarchy(member.calledOnFqcn)) continue;
      const valueStart = matchStart + match[0].lastIndexOf(match[3]!); const valueEnd = valueStart + match[3]!.length;
      const actual = this.provenArgumentType(file, valueStart, valueEnd); const declarationFile = this.files.get(member.uri);
      if (!actual || !declarationFile) continue;
      const documented = member.synthetic === 'phpdoc-magic' ? parsePhpDocType(expectedText).type : undefined;
      const expected = documented ? this.phpDocDiagnosticType(declarationFile, documented, member.typeScopeFqcn)
        : this.nativeSourceType(declarationFile, expectedText, member.typeScopeFqcn);
      if (!expected) continue;
      if (isDirectScalar(actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(file)) continue;
      const result = compatibility(actual, expected, this.typeRelationContext());
      if (result === 'no') properties.push({ uri, start: valueStart, end: valueEnd, callable: this.containingScope(file, matchStart)?.id ?? file.namespace,
        variable: `${match[1]!.slice(1)}->${match[2]!}`, actualType: displayType(actual), expectedType: displayType(expected) });
    }
    return properties.sort((left, right) => left.start - right.start);
  }

  dynamicPropertyCreations(uri: string): DynamicPropertyCreation[] {
    const file = this.files.get(uri); if (!file) return [];
    const results: DynamicPropertyCreation[] = []; const reported = new Set<string>(); const createdStatements = new Map<number, string>(); let incomplete = false;
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous).map((declaration) => ({ file: candidate, declaration })));
    const uniqueDeclaration = (fqcn: string): { file: SemanticFile; declaration: ParsedDeclaration } | undefined => {
      const matches = declarations.filter((candidate) => candidate.declaration.fqcn.toLowerCase() === fqcn.toLowerCase());
      return matches.length === 1 ? matches[0] : undefined;
    };
    const hasUniqueCompleteHierarchy = (fqcn: string, visited = new Set<string>()): boolean => {
      const key = fqcn.toLowerCase(); if (visited.has(key)) return true;
      if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return false;
      visited.add(key);
      const owner = uniqueDeclaration(fqcn); if (!owner) return false;
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      return [...owner.declaration.extendsNames, ...owner.declaration.implementsNames, ...owner.declaration.traitNames].every((name) => {
        const inherited = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
        return Boolean(inherited && hasUniqueCompleteHierarchy(inherited, visited));
      });
    };
    const allowsDynamicProperties = (fqcn: string, visited = new Set<string>()): boolean => {
      const key = fqcn.toLowerCase(); if (visited.has(key) || visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return false;
      if (key === 'stdclass' && this.fileAndDeclaration(fqcn)) return true;
      visited.add(key);
      const owner = uniqueDeclaration(fqcn); if (!owner) return false;
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const attributed = owner.file.typeReferences.some((reference) => reference.context === 'attribute'
        && reference.start >= owner.declaration.declarationStart && reference.end <= owner.declaration.declarationEnd
        && this.resolveSourceType(owner.file, owner.file.source.slice(reference.start, reference.end), namespace, owner.declaration.fqcn)?.toLowerCase() === 'allowdynamicproperties');
      if (attributed) return true;
      const parentName = owner.declaration.extendsNames[0];
      const parent = parentName && this.resolveSourceType(owner.file, parentName, namespace, owner.declaration.fqcn);
      return Boolean(parent && allowsDynamicProperties(parent, visited));
    };
    const consider = (memberNode: SyntaxNode): void => {
      const assignment = memberNode.parent;
      const statement = assignment?.parent;
      if (assignment?.type !== 'assignment_expression' || statement?.type !== 'expression_statement' || statement.namedChildren[0]?.id !== assignment.id) return;
      const name = memberNode.childForFieldName('name');
      if (!name || name.type !== 'name') return;
      const access = file.memberAccesses.find((candidate) => candidate.kind === 'property' && !candidate.static
        && candidate.start === name.startIndex && candidate.end === name.endIndex && candidate.dynamic === undefined);
      if (!access) return;
      const target = this.memberTarget(uri, access.end); if (!target || target.groups || !hasUniqueCompleteHierarchy(target.fqcn)) return;
      const owner = uniqueDeclaration(target.fqcn);
      if (!owner || owner.declaration.kind !== 'class' || owner.declaration.readonlyClass || allowsDynamicProperties(target.fqcn)) return;
      const members = this.members(target.fqcn, target.fqcn, new Set(), true, target.typeArguments);
      if (members.some((member) => member.synthetic === undefined && member.kind === 'property' && member.name === access.name)) return;
      if (members.some((member) => member.kind === 'method' && member.name.toLowerCase() === '__set')) return;
      const object = memberNode.childForFieldName('object');
      const creationKey = object?.type === 'variable_name' ? `${target.fqcn.toLowerCase()}\0${object.text}\0${access.name}` : undefined;
      if (creationKey && statement.parent?.type === 'compound_statement') {
        const siblings = statement.parent.namedChildren;
        const index = siblings.findIndex((candidate) => candidate.id === statement.id);
        if (index > 0 && createdStatements.get(siblings[index - 1]!.id) === creationKey) {
          createdStatements.set(statement.id, creationKey);
          return;
        }
      }
      if (creationKey) createdStatements.set(statement.id, creationKey);
      const key = `${access.start}:${access.end}`; if (reported.has(key)) return; reported.add(key);
      results.push({ uri, start: access.start, end: access.end, name: access.name, ownerFqcn: target.fqcn });
    };
    const retainedTree = this.trees.get(uri); const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      const traversal = walkLocalSyntax(tree.rootNode, (node) => {
        if (node.isError || node.isMissing) { incomplete = true; return 'descend'; }
        if (node.type === 'assignment_expression') {
          const left = node.childForFieldName('left'); if (left?.type === 'member_access_expression') consider(left);
        }
        return 'descend';
      });
      if (!traversal.complete || incomplete) return [];
      return results.sort((left, right) => left.start - right.start);
    } finally { temporaryTree?.delete(); }
  }

  dynamicPropertyDeclaration(uri: string, offset: number): DynamicPropertyDeclaration | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const creation = this.dynamicPropertyCreations(uri).find((item) => offset >= item.start && offset <= item.end); if (!creation) return undefined;
    const owners = [...this.files.values()].flatMap((candidate) => candidate.declarations
      .filter((declaration) => !declaration.anonymous && declaration.fqcn.toLowerCase() === creation.ownerFqcn.toLowerCase())
      .map((declaration) => ({ file: candidate, declaration })));
    if (owners.length !== 1) return undefined;
    const retainedTree = this.trees.get(uri); const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, uri).tree;
    try {
      const member = deepestLocalSyntax((retainedTree ?? temporaryTree!).rootNode, creation.start, creation.end,
        (node) => node.type === 'member_access_expression' && node.childForFieldName('name')?.startIndex === creation.start);
      const assignment = member?.parent; const right = assignment?.childForFieldName('right');
      if (assignment?.type !== 'assignment_expression' || assignment.parent?.type !== 'expression_statement' || !right) return undefined;
      const actual = this.provenArgumentType(file, right.startIndex, right.endIndex); if (!actual) return undefined;
      let type: string | undefined;
      if (actual.kind === 'primitive' && ['bool', 'int', 'float', 'string', 'array', 'object'].includes(actual.name)) type = actual.name;
      else if (actual.kind === 'literal') type = typeof actual.value === 'boolean' ? 'bool'
        : typeof actual.value === 'number' ? (Number.isInteger(actual.value) ? 'int' : 'float') : 'string';
      else if (actual.kind === 'integer-range') type = 'int';
      else if (actual.kind === 'list' || actual.kind === 'array' || actual.kind === 'shape') type = 'array';
      else if (actual.kind === 'named') {
        const matches = [...this.files.values()].flatMap((candidate) => candidate.declarations
          .filter((declaration) => !declaration.anonymous && declaration.fqcn.toLowerCase() === actual.name.toLowerCase()));
        if (matches.length === 1) type = `\\${matches[0]!.fqcn}`;
      }
      if (!type) return undefined;
      const owner = owners[0]!; const insertOffset = owner.file.source.lastIndexOf('}', owner.declaration.declarationEnd - 1);
      return insertOffset >= owner.declaration.declarationStart
        ? { uri: owner.file.uri, name: creation.name, ownerFqcn: owner.declaration.fqcn, insertOffset, type }
        : undefined;
    } finally { temporaryTree?.delete(); }
  }

  readonlyPropertyAssignments(uri: string): ReadonlyPropertyAssignment[] {
    const file = this.files.get(uri); if (!file) return [];
    if (this.readonlyAnalysisInProgress.has(uri)) return [];
    this.readonlyAnalysisInProgress.add(uri);
    try {
    const results: ReadonlyPropertyAssignment[] = [];
    const reported = new Set<string>();
    const consider = (propertyStart: number, propertyEnd: number, alwaysModification: boolean): void => {
      const member = this.memberAt(uri, propertyStart + 1);
      if (member?.kind !== 'property' || !member.readonly || !this.hasCompleteHierarchy(member.calledOnFqcn)) return;
      const accessFrom = this.containingCallable(file, propertyStart)?.containerFqcn;
      const insideWritableFamily = member.synthetic !== 'enum-native' && member.synthetic !== 'phpdoc-magic' && accessFrom !== undefined
        && (accessFrom.toLowerCase() === member.typeScopeFqcn.toLowerCase() || this.isSubclassOf(accessFrom, member.typeScopeFqcn));
      if (!alwaysModification && insideWritableFamily) return;
      const key = `${propertyStart}:${propertyEnd}`; if (reported.has(key)) return; reported.add(key);
      results.push({
        uri, start: propertyStart, end: propertyEnd, name: member.name, ownerFqcn: member.typeScopeFqcn,
        minimumPhpVersion: member.synthetic === 'phpdoc-magic' ? '7.2' : member.readonlyClass ? '8.2' : '8.1',
      });
    };
    const pattern = /(\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*->\s*([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*=(?!=|>|&)/giu;
    for (const match of file.source.matchAll(pattern)) {
      const matchStart = match.index; const matchEnd = matchStart + match[0].length;
      if ([...file.commentRanges, ...file.stringRanges].some((range) => matchStart >= range.start && matchEnd <= range.end)) continue;
      const propertyStart = matchStart + match[0].indexOf(match[2]!);
      consider(propertyStart, propertyStart + match[2]!.length, false);
    }
    const propertyRoot = (node: SyntaxNode | null): SyntaxNode | undefined => {
      if (!node) return undefined;
      if (node.type === 'member_access_expression') return node;
      if (node.type === 'subscript_expression' || node.type === 'parenthesized_expression') return propertyRoot(node.namedChildren[0] ?? null);
      return undefined;
    };
    const considerNode = (node: SyntaxNode | null, alwaysModification: boolean): void => {
      const property = propertyRoot(node); const name = property?.childForFieldName('name');
      if (name) consider(name.startIndex, name.endIndex, alwaysModification);
    };
    let localSyntaxIncomplete = false;
    const visit = (root: SyntaxNode): void => {
      const traversal = walkLocalSyntax(root, (node) => {
      if (node.type === 'augmented_assignment_expression') considerNode(node.childForFieldName('left'), true);
      else if (node.type === 'update_expression') considerNode(node.childForFieldName('argument'), true);
      else if (node.type === 'assignment_expression') {
        const left = node.childForFieldName('left'); if (left?.type === 'subscript_expression') considerNode(left, true);
      } else if (node.type === 'reference_assignment_expression') {
        considerNode(node.childForFieldName('left'), true); considerNode(node.childForFieldName('right'), true);
      } else if (node.type === 'unset_statement') {
        for (const target of node.namedChildren) considerNode(target, false);
      } else if (node.type === 'foreach_statement') {
        const value = node.namedChildren[1];
        let hasByReferenceValue = false;
        if (value) {
          const referenceTraversal = walkLocalSyntax(value, (candidate) => {
            if (candidate.type === 'by_ref') { hasByReferenceValue = true; return 'stop'; }
            return 'descend';
          });
          if (!referenceTraversal.complete) localSyntaxIncomplete = true;
        }
        if (hasByReferenceValue) considerNode(node.namedChildren[0] ?? null, true);
      }
        return 'descend';
      });
      if (!traversal.complete) localSyntaxIncomplete = true;
    };
    const retainedTree = this.trees.get(uri); const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      visit(tree.rootNode);
      if (localSyntaxIncomplete) return [];
      type FlowState = { initialized: Set<string>; reachable: boolean };
      const copyState = (state: FlowState): FlowState => ({ initialized: new Set(state.initialized), reachable: state.reachable });
      const mergeStates = (states: FlowState[]): FlowState => {
        const reachable = states.filter((state) => state.reachable);
        if (!reachable.length) return { initialized: new Set(), reachable: false };
        const initialized = new Set(reachable[0]!.initialized);
        for (const key of initialized) {
          if (reachable.some((state) => !state.initialized.has(key))) initialized.delete(key);
        }
        return { initialized, reachable: true };
      };
      type FactoryTarget = { file: SemanticFile; callable: ParsedCallableDeclaration };
      const factoryInProgress = new Set<string>();
      const factoryConstruction = (target: FactoryTarget): string | undefined => {
        const cacheKey = target.callable.fqcn.toLowerCase();
        if (this.factoryConstructionSummaries.has(cacheKey)) return this.factoryConstructionSummaries.get(cacheKey) ?? undefined;
        if (factoryInProgress.size >= MAX_SEMANTIC_GRAPH_DEPTH || factoryInProgress.has(cacheKey)) return undefined;
        factoryInProgress.add(cacheKey);
        const dependencies = new Set<string>();
        const retainedTargetTree = this.trees.get(target.file.uri);
        const temporaryTargetTree = retainedTargetTree ? undefined : this.parser.parse(target.file.source, undefined, target.file.uri).tree;
        const targetTree = retainedTargetTree ?? temporaryTargetTree!;
        try {
          const resolvedConstruction = ((): string | undefined => {
          try {
            const callableNode = deepestLocalSyntax(targetTree.rootNode, target.callable.declarationStart, target.callable.declarationEnd,
              (candidate) => candidate.startIndex === target.callable.declarationStart && candidate.endIndex === target.callable.declarationEnd
                && (candidate.type === 'function_definition' || candidate.type === 'method_declaration'));
            const factoryBody = callableNode?.childForFieldName('body');
            if (!factoryBody) return undefined;
            type FactoryFlow = { valid: boolean; fallsThrough: boolean; constructedTypes: Set<string>; breaks?: boolean };
            const mergeFactoryTypes = (targetTypes: Set<string>, sourceTypes: Set<string>): void => {
              for (const type of sourceTypes) targetTypes.add(type);
            };
            const constructedType = (returned: SyntaxNode | undefined): string | undefined => {
              if (returned?.type !== 'object_creation_expression' || returned.namedChildren.some((child) => child.type === 'anonymous_class')) return undefined;
              const typeNode = returned.namedChildren.find((child) => child.type === 'qualified_name' || child.type === 'name');
              const resolved = typeNode && this.resolveSourceType(target.file, typeNode.text, this.namespaceAt(target.file, typeNode.startIndex), target.callable.containerFqcn);
              return resolved && this.fileAndDeclaration(resolved) ? resolved : undefined;
            };
            const returnedTypes = (statement: SyntaxNode): Set<string> | undefined => {
              const returned = statement.namedChildren[0];
              const direct = constructedType(returned); if (direct) return new Set([direct]);
              const delegatedCall = returned && target.file.calls.find((call) => !call.firstClassCallable
                && call.start === returned.startIndex && call.end === returned.endIndex);
              const delegatedSignature = delegatedCall && this.completedCallSignature(target.file, delegatedCall);
              if (delegatedSignature) {
                const declarations = this.callableDeclarationsForSignature(delegatedSignature);
                const delegated = declarations.length === 1 ? declarations[0] : undefined;
                if (delegated && delegated.file.uri === delegatedSignature.uri && delegated.item.start === delegatedSignature.start) {
                  const dependency = delegated.item.fqcn.toLowerCase();
                  dependencies.add(dependency);
                  const inferred = factoryConstruction({ file: delegated.file, callable: delegated.item });
                  if (inferred) return new Set([inferred]);
                }
              }
              if (returned?.type === 'variable_name' && statement.parent?.type === 'compound_statement') {
                const siblings = statement.parent.namedChildren; const index = siblings.findIndex((candidate) => candidate.id === statement.id);
                const previous = index > 0 ? siblings[index - 1] : undefined;
                const assignment = previous?.type === 'expression_statement' ? previous.namedChildren[0] : undefined;
                const left = assignment?.type === 'assignment_expression' ? assignment.childForFieldName('left') : undefined;
                const right = assignment?.type === 'assignment_expression' ? assignment.childForFieldName('right') : undefined;
                const local = left?.type === 'variable_name' && left.text === returned.text ? constructedType(right ?? undefined) : undefined;
                if (local) return new Set([local]);
              }
              if (returned?.type !== 'match_expression') return undefined;
              const block = returned.namedChildren.find((child) => child.type === 'match_block');
              const arms = block?.namedChildren.filter((child) => child.type === 'match_conditional_expression' || child.type === 'match_default_expression') ?? [];
              if (!arms.length) return undefined;
              const types = new Set<string>();
              for (const arm of arms) {
                const type = constructedType(arm.namedChildren.at(-1)); if (!type) return undefined;
                types.add(type);
              }
              return types;
            };
            let factoryDepth = 0;
            let factoryNodes = 0;
            const analyzeFactory = (node: SyntaxNode, controlScope: 'none' | 'loop' | 'switch' = 'none'): FactoryFlow => {
              factoryDepth += 1;
              factoryNodes += 1;
              if (factoryDepth > MAX_LOCAL_SYNTAX_DEPTH || factoryNodes > MAX_LOCAL_SYNTAX_NODES) {
                factoryDepth -= 1;
                return { valid: false, fallsThrough: true, constructedTypes: new Set() };
              }
              try {
              if (node.type === 'break_statement') {
                if (controlScope === 'none' || !/^break\s*(?:1\s*)?;$/iu.test(node.text)) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                return { valid: true, fallsThrough: false, constructedTypes: new Set(), breaks: controlScope === 'switch' };
              }
              if (node.type === 'continue_statement' && controlScope === 'loop') {
                return { valid: true, fallsThrough: false, constructedTypes: new Set() };
              }
              if (node.type === 'expression_statement' && node.namedChildren[0]?.type === 'throw_expression') {
                return { valid: true, fallsThrough: false, constructedTypes: new Set() };
              }
              if (node.type === 'return_statement') {
                const constructed = returnedTypes(node);
                return { valid: Boolean(constructed), fallsThrough: false, constructedTypes: constructed ?? new Set() };
              }
              if (node.type === 'compound_statement') {
                const flow: FactoryFlow = { valid: true, fallsThrough: true, constructedTypes: new Set() };
                for (const statement of node.namedChildren) {
                  if (!flow.fallsThrough) break;
                  const statementFlow = analyzeFactory(statement, controlScope);
                  if (!statementFlow.valid) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                  mergeFactoryTypes(flow.constructedTypes, statementFlow.constructedTypes);
                  flow.breaks = flow.breaks || statementFlow.breaks;
                  flow.fallsThrough = statementFlow.fallsThrough;
                }
                return flow;
              }
              if (node.type === 'if_statement') {
                const bodies: SyntaxNode[] = []; const consequence = node.childForFieldName('body');
                if (consequence) bodies.push(consequence);
                let hasElse = false;
                for (const clause of node.namedChildren) {
                  if (clause.type !== 'else_if_clause' && clause.type !== 'else_clause') continue;
                  if (clause.type === 'else_clause') hasElse = true;
                  const clauseBody = clause.childForFieldName('body'); if (clauseBody) bodies.push(clauseBody);
                }
                if (!consequence || !bodies.length) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                const branchFlows = bodies.map((body) => analyzeFactory(body, controlScope));
                if (branchFlows.some((flow) => !flow.valid)) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                const constructedTypes = new Set<string>();
                for (const flow of branchFlows) mergeFactoryTypes(constructedTypes, flow.constructedTypes);
                return { valid: true, fallsThrough: !hasElse || branchFlows.some((flow) => flow.fallsThrough), constructedTypes,
                  breaks: branchFlows.some((flow) => flow.breaks) };
              }
              if (node.type === 'switch_statement') {
                const switchBody = node.childForFieldName('body');
                if (!switchBody) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                const labels = switchBody.namedChildren.filter((child) => child.type === 'case_statement' || child.type === 'default_statement');
                if (!labels.length) return { valid: true, fallsThrough: true, constructedTypes: new Set() };
                const labelFlows = labels.map((label) => {
                  const value = label.childForFieldName('value');
                  const flow: FactoryFlow = { valid: true, fallsThrough: true, constructedTypes: new Set() };
                  for (const statement of label.namedChildren.filter((child) => child !== value)) {
                    if (!flow.fallsThrough) break;
                    const statementFlow = analyzeFactory(statement, 'switch');
                    if (!statementFlow.valid) return { valid: false, fallsThrough: true, constructedTypes: new Set<string>() };
                    mergeFactoryTypes(flow.constructedTypes, statementFlow.constructedTypes);
                    flow.breaks = flow.breaks || statementFlow.breaks;
                    flow.fallsThrough = statementFlow.fallsThrough;
                  }
                  return flow;
                });
                if (labelFlows.some((flow) => !flow.valid)) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                const constructedTypes = new Set<string>();
                for (const flow of labelFlows) mergeFactoryTypes(constructedTypes, flow.constructedTypes);
                let followingCanExit = true; let anyEntryCanExit = false;
                for (const flow of [...labelFlows].reverse()) {
                  const canExit: boolean = Boolean(flow.breaks) || (flow.fallsThrough && followingCanExit);
                  anyEntryCanExit = anyEntryCanExit || canExit; followingCanExit = canExit;
                }
                const hasDefault = labels.some((label) => label.type === 'default_statement');
                return { valid: true, fallsThrough: !hasDefault || anyEntryCanExit, constructedTypes };
              }
              if (node.type === 'try_statement') {
                const tryBody = node.childForFieldName('body'); if (!tryBody) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                const bodies = [tryBody, ...node.namedChildren.filter((child) => child.type === 'catch_clause')
                  .map((child) => child.childForFieldName('body')).filter((body): body is SyntaxNode => Boolean(body))];
                const outcomes = bodies.map((body) => analyzeFactory(body, controlScope));
                if (outcomes.some((flow) => !flow.valid || flow.breaks)) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                const constructedTypes = new Set<string>();
                for (const flow of outcomes) mergeFactoryTypes(constructedTypes, flow.constructedTypes);
                const original: FactoryFlow = { valid: true, fallsThrough: outcomes.some((flow) => flow.fallsThrough), constructedTypes };
                const finallyBody = node.namedChildren.find((child) => child.type === 'finally_clause')?.childForFieldName('body');
                if (!finallyBody) return original;
                const finalizer = analyzeFactory(finallyBody, controlScope);
                if (!finalizer.valid || finalizer.breaks) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                const finalTypes = new Set(finalizer.constructedTypes);
                if (finalizer.fallsThrough) mergeFactoryTypes(finalTypes, original.constructedTypes);
                return { valid: true, fallsThrough: original.fallsThrough && finalizer.fallsThrough, constructedTypes: finalTypes };
              }
              if (['while_statement', 'do_statement', 'for_statement', 'foreach_statement'].includes(node.type)) {
                const loopBody = node.childForFieldName('body'); if (!loopBody) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
                const loopFlow = analyzeFactory(loopBody, 'loop');
                return loopFlow.valid
                  ? { valid: true, fallsThrough: true, constructedTypes: new Set(loopFlow.constructedTypes) }
                  : { valid: false, fallsThrough: true, constructedTypes: new Set() };
              }
              let unsupported = false;
              const unsupportedTraversal = walkLocalSyntax(node, (candidate) => {
                if (candidate !== node && ['anonymous_function', 'arrow_function', 'function_definition', 'method_declaration'].includes(candidate.type)) return 'skip';
                if (['return_statement', 'throw_expression', 'if_statement', 'try_statement', 'switch_statement', 'while_statement', 'do_statement',
                  'for_statement', 'foreach_statement', 'yield_expression', 'goto_statement', 'exit_statement', 'break_statement', 'continue_statement'].includes(candidate.type)) {
                  unsupported = true;
                  return 'stop';
                }
                return 'descend';
              });
              if (!unsupportedTraversal.complete) return { valid: false, fallsThrough: true, constructedTypes: new Set() };
              if (!unsupported) return { valid: true, fallsThrough: true, constructedTypes: new Set() };
              return { valid: false, fallsThrough: true, constructedTypes: new Set() };
              } finally {
                factoryDepth -= 1;
              }
            };
            const flow = analyzeFactory(factoryBody);
            return flow.valid && !flow.fallsThrough && flow.constructedTypes.size === 1 ? [...flow.constructedTypes][0] : undefined;
          } finally { temporaryTargetTree?.delete(); }
          })();
          this.factoryConstructionSummaries.set(cacheKey, resolvedConstruction ?? null);
          this.replaceCallableDependency(target.file.uri, cacheKey, dependencies);
          return resolvedConstruction;
        } finally {
          factoryInProgress.delete(cacheKey);
        }
      };
      const directFactoryConstruction = (assignment: SemanticFile['assignments'][number]): string | undefined => {
        if (!assignment.sourceCall || assignment.sourceCall.kind === 'callable-variable') return undefined;
        const call = file.calls.filter((candidate) => candidate.start >= assignment.start && candidate.end <= assignment.end)
          .sort((left, right) => (right.end - right.start) - (left.end - left.start))[0];
        const signature = call && this.signature(uri, call.argumentsStart + 1); if (!signature) return undefined;
        const declarations = this.callableDeclarationsForSignature(signature);
        if (declarations.length !== 1) return undefined;
        const target = declarations[0]!;
        if (target.file.uri !== signature.uri || target.item.start !== signature.start) return undefined;
        return factoryConstruction({ file: target.file, callable: target.item });
      };
      const directProperty = (node: SyntaxNode): { name: SyntaxNode; member: MemberInfo } | undefined => {
        if (node.type !== 'assignment_expression') return undefined;
        const left = node.childForFieldName('left'); const object = left?.childForFieldName('object'); const name = left?.childForFieldName('name');
        if (left?.type !== 'member_access_expression' || object?.text !== '$this' || !name) return undefined;
        const member = this.memberAt(uri, name.startIndex + 1);
        return member?.kind === 'property' && member.readonly ? { name, member } : undefined;
      };
      const methodNodes: SyntaxNode[] = [];
      const collectMethods = (node: SyntaxNode): void => {
        if (node.type === 'method_declaration') methodNodes.push(node);
        else for (const child of node.namedChildren) collectMethods(child);
      };
      collectMethods(tree.rootNode);
      const constructorSummaries = this.constructorInitializationSummaries;
      const inheritanceDepth = (fqcn: string, visited = new Set<string>()): number => {
        const key = fqcn.toLowerCase(); if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return 0; visited.add(key);
        const owner = this.fileAndDeclaration(fqcn); const parentName = owner?.declaration.extendsNames[0];
        if (!owner || !parentName) return 0;
        const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
        const parent = this.resolveSourceType(owner.file, parentName, namespace, owner.declaration.fqcn);
        return parent ? 1 + inheritanceDepth(parent, visited) : 0;
      };
      const orderedMethodNodes = [...methodNodes].sort((left, right) => {
        const rank = (node: SyntaxNode): number => node.childForFieldName('name')?.text.toLowerCase() === '__construct' ? 0 : 1;
        const depth = (node: SyntaxNode): number => {
          const candidate = this.containingCallable(file, node.startIndex); return candidate?.containerFqcn ? inheritanceDepth(candidate.containerFqcn) : 0;
        };
        return rank(left) - rank(right) || depth(left) - depth(right) || left.startIndex - right.startIndex;
      });
      for (const methodNode of orderedMethodNodes) {
        const body = methodNode.childForFieldName('body'); if (!body) continue;
        const callable = this.containingCallable(file, body.startIndex); if (!callable?.containerFqcn) continue;
        const hasGoto = /\bgoto\s+[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*\s*;/iu
          .test(file.source.slice(callable.declarationStart, callable.declarationEnd));
        let parentConstructorKeys: Set<string> | undefined;
        const resolvedParentConstructorKeys = (): Set<string> => {
          if (parentConstructorKeys) return parentConstructorKeys;
          parentConstructorKeys = new Set();
          if (callable.name.toLowerCase() !== '__construct') return parentConstructorKeys;
          const owner = this.fileAndDeclaration(callable.containerFqcn!); const parentName = owner?.declaration.extendsNames[0];
          const namespace = owner?.declaration.fqcn.split('\\').slice(0, -1).join('\\') ?? '';
          const parent = owner && parentName ? this.resolveSourceType(owner.file, parentName, namespace, owner.declaration.fqcn) : undefined;
          const parentConstructor = parent ? this.constructorFor(parent) : undefined;
          const parentOwner = parentConstructor?.callable.containerFqcn;
          if (!parentConstructor || parentConstructor.callable.visibility === 'private' || !parentOwner) return parentConstructorKeys;
          if (!constructorSummaries.has(parentOwner.toLowerCase())) this.readonlyPropertyAssignments(parentConstructor.file.uri);
          for (const key of constructorSummaries.get(parentOwner.toLowerCase()) ?? []) parentConstructorKeys.add(key);
          return parentConstructorKeys;
        };
        const processParentConstructorCall = (node: SyntaxNode, state: FlowState): FlowState => {
          if (node.type !== 'scoped_call_expression'
            || node.childForFieldName('scope')?.text.toLowerCase() !== 'parent'
            || node.childForFieldName('name')?.text.toLowerCase() !== '__construct') return state;
          for (const key of resolvedParentConstructorKeys()) state.initialized.add(key);
          return state;
        };
        const processAssignment = (node: SyntaxNode, state: FlowState, repeated: boolean): FlowState => {
          const property = directProperty(node); if (!property) return state;
          const { member, name } = property;
          const insideWritableFamily = callable.containerFqcn!.toLowerCase() === member.typeScopeFqcn.toLowerCase()
            || this.isSubclassOf(callable.containerFqcn!, member.typeScopeFqcn);
          if (!insideWritableFamily) return state;
          const key = member.fqcn.toLowerCase();
          const promotedConstructorWrite = member.promoted === true && callable.name.toLowerCase() === '__construct'
            && callable.containerFqcn!.toLowerCase() === member.typeScopeFqcn.toLowerCase();
          if (promotedConstructorWrite || (repeated && state.initialized.has(key))) consider(name.startIndex, name.endIndex, true);
          state.initialized.add(key);
          return state;
        };
        const processObjectReferenceIteration = (node: SyntaxNode, state: FlowState): void => {
          if (node.type !== 'foreach_statement') return;
          const iterable = node.namedChildren[0]; const value = node.namedChildren[1];
          let hasByReferenceValue = false;
          const referenceTraversal = value && walkLocalSyntax(value, (candidate) => {
            if (candidate.type === 'by_ref') { hasByReferenceValue = true; return 'stop'; }
            return 'descend';
          });
          if (referenceTraversal && !referenceTraversal.complete) { localSyntaxIncomplete = true; return; }
          if (iterable?.type !== 'variable_name' || !hasByReferenceValue) return;
          let receiverFqcn = callable.containerFqcn!; let initializedKeys = state.initialized;
          if (iterable.text !== '$this') {
            const assignment = file.assignments.filter((item) => item.scopeId.toLowerCase() === callable.fqcn.toLowerCase()
              && item.variable === iterable.text && item.end <= iterable.startIndex)
              .sort((left, right) => right.end - left.end)[0];
            if (!assignment) return;
            const assignmentNode = deepestLocalSyntax(body, assignment.start, assignment.end,
              (candidate) => candidate.type === 'assignment_expression' && candidate.startIndex === assignment.start && candidate.endIndex === assignment.end);
            const assignmentBlock = assignmentNode?.parent?.parent; const iterationBlock = node.parent;
            if (!assignmentNode || assignmentBlock?.type !== 'compound_statement' || iterationBlock?.type !== 'compound_statement'
              || assignmentBlock.startIndex !== iterationBlock.startIndex || assignmentBlock.endIndex !== iterationBlock.endIndex) return;
            const directNew = assignment.typeName && new RegExp(`^\\s*${iterable.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*new\\b`, 'iu')
              .test(file.source.slice(assignment.start, assignment.end));
            const resolved = directNew
              ? this.resolveSourceType(file, assignment.typeName!, this.namespaceAt(file, assignment.start), callable.containerFqcn)
              : directFactoryConstruction(assignment);
            if (!resolved || !this.fileAndDeclaration(resolved)) return;
            receiverFqcn = resolved;
            initializedKeys = new Set(this.members(receiverFqcn, callable.containerFqcn)
              .filter((member) => member.kind === 'property' && member.readonly && member.promoted && !member.static)
              .map((member) => member.fqcn.toLowerCase()));
            if (!constructorSummaries.has(receiverFqcn.toLowerCase())) {
              const owner = this.fileAndDeclaration(receiverFqcn);
              if (owner && owner.file.uri !== uri) this.readonlyPropertyAssignments(owner.file.uri);
            }
            for (const key of constructorSummaries.get(receiverFqcn.toLowerCase()) ?? []) initializedKeys.add(key);
            const inheritedConstructor = this.constructorFor(receiverFqcn);
            const constructorOwner = inheritedConstructor?.callable.containerFqcn;
            if (constructorOwner && constructorOwner.toLowerCase() !== receiverFqcn.toLowerCase()) {
              if (!constructorSummaries.has(constructorOwner.toLowerCase())) this.readonlyPropertyAssignments(inheritedConstructor.file.uri);
              for (const key of constructorSummaries.get(constructorOwner.toLowerCase()) ?? []) initializedKeys.add(key);
            }
          }
          const initialized = this.members(receiverFqcn, callable.containerFqcn)
            .filter((member) => member.kind === 'property' && member.readonly && !member.static && member.synthetic !== 'enum-native'
              && initializedKeys.has(member.fqcn.toLowerCase()));
          for (const minimumPhpVersion of ['8.1', '8.2'] as const) {
            const names = [...new Set(initialized.filter((member) => (member.readonlyClass ? '8.2' : '8.1') === minimumPhpVersion)
              .map((member) => member.name))].sort();
            if (!names.length) continue;
            const key = `reference-iteration:${iterable.startIndex}:${iterable.endIndex}:${minimumPhpVersion}`;
            if (reported.has(key)) continue; reported.add(key);
            results.push({ uri, start: iterable.startIndex, end: iterable.endIndex, name: names[0]!, ownerFqcn: receiverFqcn,
              minimumPhpVersion, operation: 'reference-iteration', propertyNames: names });
          }
        };
        if (hasGoto) {
          const promotedTraversal = walkLocalSyntax(body, (node) => {
            processAssignment(node, { initialized: new Set(), reachable: true }, false);
            return 'descend';
          });
          if (!promotedTraversal.complete) localSyntaxIncomplete = true;
          continue;
        }
        let flowDepth = 0;
        let flowNodes = 0;
        const analyze = (node: SyntaxNode, state: FlowState): FlowState => {
          flowDepth += 1;
          flowNodes += 1;
          if (flowDepth > MAX_LOCAL_SYNTAX_DEPTH || flowNodes > MAX_LOCAL_SYNTAX_NODES) {
            localSyntaxIncomplete = true;
            flowDepth -= 1;
            return state;
          }
          try {
          if (!state.reachable) return state;
          if (node.type === 'compound_statement') {
            let current = state;
            for (const child of node.namedChildren) current = analyze(child, current);
            return current;
          }
          if (node.type === 'expression_statement') {
            const expression = node.namedChildren[0];
            if (expression?.type === 'throw_expression') return { initialized: state.initialized, reachable: false };
            return expression ? processAssignment(expression, processParentConstructorCall(expression, state), true) : state;
          }
          if (node.type === 'if_statement') {
            const branches: FlowState[] = [];
            const consequence = node.childForFieldName('body');
            if (consequence) branches.push(analyze(consequence, copyState(state)));
            let hasElse = false;
            for (const clause of node.namedChildren) {
              if (clause.type !== 'else_if_clause' && clause.type !== 'else_clause') continue;
              if (clause.type === 'else_clause') hasElse = true;
              const clauseBody = clause.childForFieldName('body');
              if (clauseBody) branches.push(analyze(clauseBody, copyState(state)));
            }
            if (!hasElse) branches.push(copyState(state));
            return mergeStates(branches);
          }
          if (node.type === 'switch_statement') {
            const switchBody = node.childForFieldName('body');
            if (!switchBody) return state;
            const labels = switchBody.namedChildren.filter((child) => child.type === 'case_statement' || child.type === 'default_statement');
            const statements = (label: SyntaxNode): SyntaxNode[] => {
              const value = label.childForFieldName('value');
              return label.namedChildren.filter((child) => child !== value);
            };
            const hasNestedExit = (candidate: SyntaxNode, root: boolean): boolean => {
              if (!root && ['anonymous_function', 'arrow_function', 'function_definition', 'method_declaration'].includes(candidate.type)) return false;
              if (candidate.type === 'switch_statement') {
                const escaping = (nested: SyntaxNode): boolean => nested.type === 'continue_statement'
                  || (nested.type === 'break_statement' && !/^break\s*(?:1\s*)?;$/iu.test(nested.text))
                  || nested.namedChildren.some((child) => escaping(child));
                return escaping(candidate);
              }
              if (!root && (candidate.type === 'break_statement' || candidate.type === 'continue_statement')) return true;
              return candidate.namedChildren.some((child) => hasNestedExit(child, false));
            };
            const unsupportedExit = labels.some((label) => statements(label).some((statement) =>
              statement.type === 'continue_statement'
              || (statement.type === 'break_statement' && !/^break\s*(?:1\s*)?;$/iu.test(statement.text))
              || hasNestedExit(statement, true)));
            if (unsupportedExit) {
              for (const label of labels) {
                let local = copyState(state);
                for (const statement of statements(label)) local = analyze(statement, local);
              }
              return state;
            }
            const exits: FlowState[] = [];
            let fallthrough: FlowState | undefined;
            for (const label of labels) {
              let current = mergeStates([copyState(state), ...(fallthrough ? [fallthrough] : [])]);
              let broke = false;
              for (const statement of statements(label)) {
                if (statement.type === 'break_statement') {
                  exits.push(current); broke = true; break;
                }
                current = analyze(statement, current);
                if (!current.reachable) break;
              }
              fallthrough = broke || !current.reachable ? undefined : current;
            }
            if (fallthrough) exits.push(fallthrough);
            if (!labels.some((label) => label.type === 'default_statement')) exits.push(copyState(state));
            return mergeStates(exits);
          }
          if (node.type === 'try_statement') {
            const outcomes: FlowState[] = [];
            const tryBody = node.childForFieldName('body');
            if (tryBody) outcomes.push(analyze(tryBody, copyState(state)));
            for (const clause of node.namedChildren) {
              if (clause.type !== 'catch_clause') continue;
              const catchBody = clause.childForFieldName('body');
              if (catchBody) outcomes.push(analyze(catchBody, copyState(state)));
            }
            const merged = mergeStates(outcomes);
            const finallyClause = node.namedChildren.find((child) => child.type === 'finally_clause');
            const finallyBody = finallyClause?.childForFieldName('body');
            if (!finallyBody) return merged;
            const containsDirectReadonlyWrite = (candidate: SyntaxNode): boolean => Boolean(directProperty(candidate))
              || candidate.namedChildren.some((child) => containsDirectReadonlyWrite(child));
            if (containsDirectReadonlyWrite(finallyBody)) {
              const containsAbruptExit = (candidate: SyntaxNode): boolean => {
                if (candidate !== tryBody && ['anonymous_function', 'arrow_function', 'function_definition', 'method_declaration'].includes(candidate.type)) return false;
                return ['return_statement', 'throw_expression', 'exit_statement', 'break_statement', 'continue_statement', 'goto_statement'].includes(candidate.type)
                  || candidate.namedChildren.some((child) => containsAbruptExit(child));
              };
              const tryOrCatchBodies = [tryBody, ...node.namedChildren.filter((child) => child.type === 'catch_clause')
                .map((child) => child.childForFieldName('body'))].filter((candidate): candidate is SyntaxNode => Boolean(candidate));
              if (tryOrCatchBodies.some((candidate) => containsAbruptExit(candidate))) {
                analyze(finallyBody, copyState(state));
                return state;
              }
              return analyze(finallyBody, merged);
            }
            return analyze(finallyBody, merged);
          }
          if (node.type === 'foreach_statement') processObjectReferenceIteration(node, state);
          if (['while_statement', 'for_statement', 'foreach_statement', 'do_statement'].includes(node.type)) {
            const loopBody = node.childForFieldName('body');
            if (!loopBody) return state;
            const condition = node.childForFieldName('condition');
            const guaranteedTrue = node.type === 'for_statement'
              ? !condition || condition.text.trim().toLowerCase() === 'true'
              : (condition?.namedChildren[0] ?? condition)?.text.trim().toLowerCase() === 'true';
            const guaranteedFiniteSecondIteration = (): boolean => {
              if (node.type !== 'for_statement') return false;
              const initialize = node.childForFieldName('initialize');
              const update = node.childForFieldName('update');
              if (!initialize || !condition || !update) return false;
              const integer = '-?(?:0|[1-9][0-9_]*|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)';
              const variable = '\\$[A-Za-z_\\x80-\\xff][A-Za-z0-9_\\x80-\\xff]*';
              const initial = new RegExp(`^\\s*(${variable})\\s*=\\s*(${integer})\\s*$`, 'u').exec(initialize.text);
              const comparison = new RegExp(`^\\s*(${variable})\\s*(<=|<|>=|>)\\s*(${integer})\\s*$`, 'u').exec(condition.text);
              if (!initial || !comparison || comparison[1] !== initial[1]) return false;
              const escaped = initial[1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const increment = new RegExp(`^(?:${escaped}\\s*\\+\\+|\\+\\+\\s*${escaped})$`, 'u').test(update.text.trim());
              const decrement = new RegExp(`^(?:${escaped}\\s*--|--\\s*${escaped})$`, 'u').test(update.text.trim());
              if (!increment && !decrement) return false;
              const mentionsCounter = (candidate: SyntaxNode): boolean => {
                if (candidate !== loopBody && ['anonymous_function', 'arrow_function', 'function_definition', 'method_declaration'].includes(candidate.type)) return false;
                return (candidate.type === 'variable_name' && candidate.text === initial[1])
                  || candidate.namedChildren.some((child) => mentionsCounter(child));
              };
              if (mentionsCounter(loopBody)) return false;
              const parseInteger = (value: string): number => Number(value.replaceAll('_', ''));
              const start = parseInteger(initial[2]!); const limit = parseInteger(comparison[3]!);
              if (!Number.isSafeInteger(start) || !Number.isSafeInteger(limit)) return false;
              const compare = (value: number): boolean => comparison[2] === '<' ? value < limit
                : comparison[2] === '<=' ? value <= limit : comparison[2] === '>' ? value > limit : value >= limit;
              const step = increment ? 1 : -1;
              return compare(start) && compare(start + step);
            };
            const nestedAbrupt = (candidate: SyntaxNode, kinds: Set<string>): boolean => {
              if (candidate !== loopBody && ['anonymous_function', 'arrow_function', 'function_definition', 'method_declaration'].includes(candidate.type)) return false;
              return kinds.has(candidate.type) || candidate.namedChildren.some((child) => nestedAbrupt(child, kinds));
            };
            const afterFirst = analyze(loopBody, copyState(state));
            const stopsGuaranteedBackEdge = nestedAbrupt(loopBody, new Set([
              'break_statement', 'continue_statement', 'return_statement', 'throw_expression', 'exit_statement', 'goto_statement',
            ]));
            if ((guaranteedTrue || guaranteedFiniteSecondIteration()) && afterFirst.reachable && !stopsGuaranteedBackEdge) analyze(loopBody, copyState(afterFirst));
            if (guaranteedTrue && !nestedAbrupt(loopBody, new Set(['break_statement', 'goto_statement']))) {
              return { initialized: state.initialized, reachable: false };
            }
            return state;
          }
          if (['return_statement', 'throw_expression', 'exit_statement', 'break_statement', 'continue_statement'].includes(node.type)) {
            return { initialized: state.initialized, reachable: false };
          }
          return state;
          } finally {
            flowDepth -= 1;
          }
        };
        const initialized = new Set(this.members(callable.containerFqcn, callable.containerFqcn)
          .filter((member) => callable.name.toLowerCase() === '__construct' && member.kind === 'property' && member.promoted && member.readonly)
          .map((member) => member.fqcn.toLowerCase()));
        const finalState = analyze(body, { initialized, reachable: true });
        if (localSyntaxIncomplete) {
          constructorSummaries.delete(callable.containerFqcn.toLowerCase());
          continue;
        }
        if (callable.name.toLowerCase() === '__construct' && finalState.reachable) {
          constructorSummaries.set(callable.containerFqcn.toLowerCase(), new Set());
          const preventsSummary = (candidate: SyntaxNode): boolean => {
            if (candidate !== body && ['anonymous_function', 'arrow_function', 'function_definition', 'method_declaration'].includes(candidate.type)) return false;
            return ['return_statement', 'exit_statement', 'break_statement', 'continue_statement', 'goto_statement'].includes(candidate.type)
              || candidate.namedChildren.some((child) => preventsSummary(child));
          };
          if (!preventsSummary(body)) {
            constructorSummaries.set(callable.containerFqcn.toLowerCase(), new Set(finalState.initialized));
          }
        }
      }
    } finally { temporaryTree?.delete(); }
    for (const call of file.calls) {
      if (call.arguments.some((argument) => argument.unpacked)) continue;
      // Resolve at the opening parenthesis so nested calls and callback parameter lists in later
      // arguments cannot hide the outer callable from the text-based signature matcher.
      const signature = this.signature(uri, call.argumentsStart + 1); if (!signature) continue;
      const declarations = [...this.files.values()].flatMap((candidate) => candidate.callables)
        .filter((candidate) => candidate.kind === signature.kind && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
      if (declarations.length !== 1) continue;
      let positional = 0;
      for (const argument of call.arguments) {
        const parameter = argument.name
          ? signature.parameters.find((candidate) => candidate.name === argument.name)
          : signature.parameters[positional] ?? (signature.parameters.at(-1)?.variadic ? signature.parameters.at(-1) : undefined);
        if (!argument.name) positional += 1;
        if (!parameter?.byReference) continue;
        const separator = argument.nameEnd === undefined ? -1 : file.source.indexOf(':', argument.nameEnd);
        const valueStart = separator >= 0 && separator < argument.end ? separator + 1 : argument.start;
        const value = file.source.slice(valueStart, argument.end);
        const property = /^\s*\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*\s*->\s*([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*$/u.exec(value);
        if (!property) continue;
        const propertyStart = valueStart + value.lastIndexOf(property[1]!);
        consider(propertyStart, propertyStart + property[1]!.length, true);
      }
    }
    if (localSyntaxIncomplete) {
      this.constructorInitializationSummaries.clear();
      this.clearFactoryConstructionCaches();
      return [];
    }
    return results.sort((left, right) => left.start - right.start);
    } finally {
      this.readonlyAnalysisInProgress.delete(uri);
    }
  }

  unknownNamedArguments(uri: string): UnknownNamedArgument[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.calls.flatMap((call): UnknownNamedArgument[] => {
      if (!call.flat || call.arguments.some((argument) => argument.unpacked)) return [];
      const named = call.arguments.filter((argument) => argument.name && argument.nameStart !== undefined && argument.nameEnd !== undefined);
      if (!named.length) return [];
      const signature = this.signature(uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1)); if (!signature) return [];
      if (signature.kind === 'function') {
        const matches = [...this.files.values()].flatMap((candidate) => candidate.callables)
          .filter((candidate) => candidate.kind === 'function' && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
        if (matches.length !== 1) return [];
      }
      if (signature.parameters.some((parameter) => parameter.variadic)) return [];
      const parameters = new Set(signature.parameters.map((parameter) => parameter.name));
      return named.flatMap((argument): UnknownNamedArgument[] => parameters.has(argument.name!) ? [] : [{
        uri,
        start: argument.nameStart!,
        end: argument.nameEnd!,
        callable: signature.fqcn,
        name: argument.name!,
      }]);
    });
  }

  argumentOrderProblems(uri: string): ArgumentOrderProblem[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.calls.flatMap((call): ArgumentOrderProblem[] => {
      const problems: ArgumentOrderProblem[] = []; const names = new Set<string>(); let sawNamed = false;
      for (const argument of call.arguments) {
        if (argument.name) {
          if (names.has(argument.name)) problems.push({ uri, start: argument.nameStart ?? argument.start, end: argument.nameEnd ?? argument.end, kind: 'duplicate-named', name: argument.name });
          names.add(argument.name); sawNamed = true;
        } else if (sawNamed) {
          problems.push({ uri, start: argument.start, end: argument.end, kind: argument.unpacked ? 'unpack-after-named' : 'positional-after-named' });
        }
      }
      return problems;
    });
  }

  definition(uri: string, offset: number): SemanticLocation[] {
    const members = this.membersAt(uri, offset);
    if (members.length) return members;
    const callable = this.functionAt(uri, offset);
    if (callable) return [callable];
    const constant = this.constantAt(uri, offset);
    if (constant) return [constant];
    const file = this.files.get(uri);
    const word = file && wordAt(file.source, offset);
    if (!file || !word) return [];
    // A syntactic member access whose receiver cannot be proven must stay
    // unresolved. Falling through would reinterpret the member token as a
    // namespace-relative type name (for example, ->Output as class Output).
    if (file.memberAccesses.some((access) => offset >= access.start && offset <= access.end)) return [];
    const fqcn = this.resolveSourceType(file, word.text, this.namespaceAt(file, offset), this.containingCallable(file, offset)?.containerFqcn);
    return [...this.files.values()].flatMap((candidate) => candidate.declarations.filter((item) => item.fqcn.toLowerCase() === fqcn?.toLowerCase()).map((item) => ({ uri: candidate.uri, start: item.start, end: item.end })));
  }

  typeDefinition(uri: string, offset: number): SemanticLocation[] {
    const file = this.files.get(uri); const word = file && wordAt(file.source, offset); if (!file || !word) return [];
    const member = this.memberAt(uri, offset);
    const memberType = member && this.memberReturnClass(member, true);
    if (memberType) { const type = this.typeByFqcn(memberType.fqcn); return type ? [type] : []; }
    if (word.start > 0 && file.source[word.start - 1] === '$') {
      const variable = this.variableClass(file, `$${word.text}`, offset, new Set(), true);
      const type = variable && this.typeByFqcn(variable.fqcn); return type ? [type] : [];
    }
    const type = this.typeAt(uri, offset); return type ? [type] : [];
  }

  inlayTypeHints(uri: string, start: number, end: number): InlayTypeHint[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.assignments.filter((assignment) => assignment.start >= start && assignment.start <= end).flatMap((assignment): InlayTypeHint[] => {
      const resolved = this.variableClass(file, assignment.variable, assignment.end, new Set(), true);
      const type = resolved && !resolved.fqcn.includes('@anonymous:') ? this.typeByFqcn(resolved.fqcn) : undefined;
      return type ? [{ position: assignment.start + assignment.variable.length, label: `: ${type.name}` }] : [];
    });
  }

  inlayParameterHints(uri: string, start: number, end: number): InlayParameterHint[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.calls.filter((call) => call.start >= start && call.end <= end && call.flat
      && call.arguments.length > 0 && call.arguments.every((argument) => !argument.name && !argument.unpacked))
      .flatMap((call): InlayParameterHint[] => {
        const signature = this.signature(uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1)); if (!signature) return [];
        if (signature.parameters.some((parameter) => parameter.variadic) || call.arguments.length > signature.parameters.length) return [];
        if (signature.kind === 'function') {
          const matches = [...this.files.values()].flatMap((candidate) => candidate.callables)
            .filter((candidate) => candidate.kind === 'function' && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
          if (matches.length !== 1) return [];
        }
        return call.arguments.flatMap((argument, index) => {
          const parameter = signature.parameters[index]; if (!parameter) return [];
          return file.source.slice(argument.start, argument.end).trim() === `$${parameter.name}`
            ? [] : [{ position: argument.start, label: `$${parameter.name}:` }];
        });
      });
  }

  implementations(uri: string, offset: number): SemanticLocation[] {
    const member = this.memberAt(uri, offset) ?? this.memberDeclarationAt(uri, offset);
    if (member?.kind === 'method') {
      const owner = member.fqcn.split('::')[0]!;
      return [...this.files.values()].flatMap((file) => file.callables.filter((candidate) => candidate.kind === 'method' && candidate.containerFqcn
        && candidate.name.toLowerCase() === member.name.toLowerCase()
        && candidate.containerFqcn.toLowerCase() !== owner.toLowerCase()
        && this.isSubclassOf(candidate.containerFqcn, owner))
        .map((candidate) => ({ uri: file.uri, start: candidate.start, end: candidate.end })));
    }
    const type = this.typeAt(uri, offset);
    if (!type) return [];
    return [...this.files.values()].flatMap((file) => file.declarations.filter((candidate) => !candidate.anonymous
      && candidate.fqcn.toLowerCase() !== type.fqcn.toLowerCase()
      && this.isSubclassOf(candidate.fqcn, type.fqcn))
      .map((candidate) => ({ uri: file.uri, start: candidate.start, end: candidate.end })));
  }

  typeByFqcn(fqcn: string): TypeInfo | undefined {
    const owner = this.fileAndDeclaration(fqcn); if (!owner || owner.declaration.anonymous) return undefined;
    const declaration = owner.declaration;
    return { uri: owner.file.uri, start: declaration.start, end: declaration.end, name: declaration.name, fqcn: declaration.fqcn, kind: declaration.kind };
  }

  directSupertypes(fqcn: string): TypeInfo[] {
    const owner = this.fileAndDeclaration(fqcn); if (!owner) return [];
    const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
    return [...owner.declaration.extendsNames, ...owner.declaration.implementsNames].flatMap((name) => {
      const parent = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
      const type = parent && this.typeByFqcn(parent); return type ? [type] : [];
    });
  }

  directSubtypes(fqcn: string): TypeInfo[] {
    return [...this.files.values()].flatMap((file) => file.declarations.filter((declaration) => !declaration.anonymous).flatMap((declaration) => {
      const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const direct = [...declaration.extendsNames, ...declaration.implementsNames].some((name) => this.resolveSourceType(file, name, namespace, declaration.fqcn)?.toLowerCase() === fqcn.toLowerCase());
      const type = direct && this.typeByFqcn(declaration.fqcn); return type ? [type] : [];
    }));
  }

  missingInterfaceImplementation(uri: string, offset: number): MissingInterfaceImplementation | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declaration = file.declarations.filter((item) => item.kind === 'class' && !item.anonymous && offset >= item.declarationStart && offset <= item.declarationEnd)
      .sort((left, right) => left.declarationEnd - left.declarationStart - (right.declarationEnd - right.declarationStart))[0];
    if (!declaration?.implementsNames.length) return undefined;
    const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const interfaces = declaration.implementsNames.map((name) => this.resolveSourceType(file, name, namespace, declaration.fqcn));
    if (interfaces.some((name) => !name || this.fileAndDeclaration(name)?.declaration.kind !== 'interface')) return undefined;
    const provided = this.concreteMethodNames(declaration.fqcn); if (!provided) return undefined;
    const missing = [...new Map(interfaces.flatMap((name) => this.members(name!, declaration.fqcn).filter((item) => item.kind === 'method'))
      .map((method) => [method.name.toLowerCase(), method])).values()].filter((method) => !provided.has(method.name.toLowerCase()))
      .sort((left, right) => left.fqcn.localeCompare(right.fqcn));
    if (!missing.length) return undefined;
    const methods = missing.flatMap((method): MissingInterfaceMethod[] => {
      const owner = this.files.get(method.uri); const callable = owner?.callables.find((item) => item.fqcn.toLowerCase() === method.fqcn.toLowerCase());
      const declarationText = callable && owner?.source.slice(callable.declarationStart, callable.declarationEnd).trim();
      return declarationText && !declarationText.includes('\n') && /;\s*$/.test(declarationText) ? [{ ...method, declarationText }] : [];
    });
    if (methods.length !== missing.length) return undefined;
    const insertOffset = file.source.lastIndexOf('}', declaration.declarationEnd - 1);
    return insertOffset >= declaration.declarationStart ? {
      uri, classFqcn: declaration.fqcn, classStart: declaration.start, classEnd: declaration.end,
      abstract: /\babstract\b/i.test(file.source.slice(declaration.declarationStart, declaration.start)), insertOffset, methods,
    } : undefined;
  }

  missingInterfaceImplementations(uri: string): MissingInterfaceImplementation[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.declarations.flatMap((declaration) => {
      const missing = this.missingInterfaceImplementation(uri, declaration.start); return missing ? [missing] : [];
    });
  }

  missingAbstractImplementation(uri: string, offset: number): MissingAbstractImplementation | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declaration = file.declarations.filter((item) => item.kind === 'class' && !item.anonymous && offset >= item.declarationStart && offset <= item.declarationEnd)
      .sort((left, right) => left.declarationEnd - left.declarationStart - (right.declarationEnd - right.declarationStart))[0];
    if (!declaration || declaration.extendsNames.length !== 1 || !this.hasCompleteHierarchy(declaration.fqcn)) return undefined;
    const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const parent = this.resolveSourceType(file, declaration.extendsNames[0]!, namespace, declaration.fqcn);
    if (!parent || this.fileAndDeclaration(parent)?.declaration.kind !== 'class') return undefined;
    const provided = this.concreteMethodNames(declaration.fqcn); if (!provided) return undefined;
    const missing = this.members(parent, declaration.fqcn).filter((method) => {
      if (method.kind !== 'method' || provided.has(method.name.toLowerCase())) return false;
      const owner = this.files.get(method.uri);
      const callable = owner?.callables.find((item) => item.fqcn.toLowerCase() === method.fqcn.toLowerCase());
      return Boolean(callable && /\babstract\b/i.test(owner!.source.slice(callable.declarationStart, callable.start)));
    });
    const methods = missing.flatMap((method): MissingInterfaceMethod[] => {
      const owner = this.files.get(method.uri); const callable = owner?.callables.find((item) => item.fqcn.toLowerCase() === method.fqcn.toLowerCase());
      const declarationText = callable && owner?.source.slice(callable.declarationStart, callable.declarationEnd).trim();
      return declarationText && !declarationText.includes('\n') && /;\s*$/.test(declarationText) ? [{ ...method, declarationText }] : [];
    });
    if (!methods.length || methods.length !== missing.length) return undefined;
    const insertOffset = file.source.lastIndexOf('}', declaration.declarationEnd - 1);
    return insertOffset >= declaration.declarationStart ? {
      uri, classFqcn: declaration.fqcn, classStart: declaration.start, classEnd: declaration.end,
      abstract: /\babstract\b/i.test(file.source.slice(declaration.declarationStart, declaration.start)), insertOffset, methods,
    } : undefined;
  }

  missingAbstractImplementations(uri: string): MissingAbstractImplementation[] {
    const file = this.files.get(uri); if (!file) return [];
    return file.declarations.flatMap((declaration) => {
      const missing = this.missingAbstractImplementation(uri, declaration.start); return missing ? [missing] : [];
    });
  }

  constructorGeneration(uri: string, offset: number): ConstructorGeneration | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declaration = file.declarations.filter((item) => item.kind === 'class' && !item.anonymous && offset >= item.declarationStart && offset <= item.declarationEnd)
      .sort((left, right) => left.declarationEnd - left.declarationStart - (right.declarationEnd - right.declarationStart))[0];
    if (!declaration || declaration.extendsNames.length || declaration.traitNames.length) return undefined;
    if (file.callables.some((item) => item.containerFqcn === declaration.fqcn && item.name.toLowerCase() === '__construct')) return undefined;
    const properties = file.properties.filter((property) => property.containerFqcn === declaration.fqcn && !property.static && !property.promoted
      && property.type && property.defaultValue === undefined && file.source.slice(property.declarationStart, property.declarationEnd).trimEnd().endsWith(';'))
      .map((property) => ({ name: property.name, type: property.type! }));
    if (!properties.length) return undefined;
    const insertOffset = file.source.lastIndexOf('}', declaration.declarationEnd - 1);
    return insertOffset >= declaration.declarationStart ? { uri, classFqcn: declaration.fqcn, classStart: declaration.start, classEnd: declaration.end, insertOffset, properties } : undefined;
  }

  accessorGeneration(uri: string, offset: number): AccessorGeneration | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declaration = file.declarations.filter((item) => item.kind === 'class' && !item.anonymous && offset >= item.declarationStart && offset <= item.declarationEnd)
      .sort((left, right) => left.declarationEnd - left.declarationStart - (right.declarationEnd - right.declarationStart))[0];
    if (!declaration || !this.hasCompleteHierarchy(declaration.fqcn)) return undefined;
    const methodNames = new Set(this.members(declaration.fqcn, declaration.fqcn, new Set(), true).filter((item) => item.kind === 'method').map((item) => item.name.toLowerCase()));
    const readonlyClass = /\breadonly\s+class\b/i.test(file.source.slice(declaration.declarationStart, declaration.start));
    const accessors = file.properties.filter((property) => property.containerFqcn === declaration.fqcn && !property.static && property.type
      && file.source.slice(property.declarationStart, property.declarationEnd).trimEnd().endsWith(';')).flatMap((property) => {
      const suffix = `${property.name.charAt(0).toUpperCase()}${property.name.slice(1)}`;
      const getter = `get${suffix}`; const setter = `set${suffix}`;
      const missingGetter = !methodNames.has(getter.toLowerCase());
      const missingSetter = !property.readonly && !readonlyClass && !methodNames.has(setter.toLowerCase());
      return missingGetter || missingSetter ? [{ property: property.name, type: property.type!, getter: missingGetter ? getter : undefined, setter: missingSetter ? setter : undefined }] : [];
    });
    if (!accessors.length) return undefined;
    const insertOffset = file.source.lastIndexOf('}', declaration.declarationEnd - 1);
    return insertOffset >= declaration.declarationStart
      ? { uri, classFqcn: declaration.fqcn, classStart: declaration.start, classEnd: declaration.end, insertOffset, accessors }
      : undefined;
  }

  overrideGeneration(uri: string, offset: number): OverrideGeneration | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declaration = file.declarations.filter((item) => item.kind === 'class' && !item.anonymous && offset >= item.declarationStart && offset <= item.declarationEnd)
      .sort((left, right) => left.declarationEnd - left.declarationStart - (right.declarationEnd - right.declarationStart))[0];
    if (!declaration || declaration.extendsNames.length !== 1 || !this.hasCompleteHierarchy(declaration.fqcn)) return undefined;
    const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const parent = this.resolveSourceType(file, declaration.extendsNames[0]!, namespace, declaration.fqcn);
    if (!parent || this.fileAndDeclaration(parent)?.declaration.kind !== 'class') return undefined;
    const ownNames = new Set(file.callables.filter((item) => item.containerFqcn?.toLowerCase() === declaration.fqcn.toLowerCase()).map((item) => item.name.toLowerCase()));
    const methods = this.members(parent, declaration.fqcn).flatMap((method): MissingInterfaceMethod[] => {
      if (method.kind !== 'method' || method.visibility === 'private' || ownNames.has(method.name.toLowerCase()) || method.name.startsWith('__')) return [];
      const owner = this.files.get(method.uri); const callable = owner?.callables.find((item) => item.fqcn.toLowerCase() === method.fqcn.toLowerCase());
      const declarationText = callable && owner?.source.slice(callable.declarationStart, callable.declarationEnd).trim();
      if (!declarationText || declarationText.includes('\n') || /\b(?:abstract|final)\b/i.test(declarationText)) return [];
      const body = declarationText.indexOf('{'); if (body < 0) return [];
      const signature = declarationText.slice(0, body).trim().replace(/^\s*final\s+/i, '');
      return signature ? [{ ...method, declarationText: signature }] : [];
    });
    if (!methods.length) return undefined;
    const insertOffset = file.source.lastIndexOf('}', declaration.declarationEnd - 1);
    return insertOffset >= declaration.declarationStart
      ? { uri, classFqcn: declaration.fqcn, classStart: declaration.start, classEnd: declaration.end, insertOffset, methods }
      : undefined;
  }

  privateMethodRename(uri: string, offset: number, newName?: string): PrivateMethodRename | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const callable = file.callables.find((item) => item.kind === 'method' && item.containerFqcn && item.visibility === 'private'
      && !item.name.startsWith('__') && offset >= item.start && offset <= item.end);
    if (!callable?.containerFqcn) return undefined;
    const ownerMethods = file.callables.filter((item) => item.containerFqcn?.toLowerCase() === callable.containerFqcn!.toLowerCase());
    if (ownerMethods.filter((item) => item.name.toLowerCase() === callable.name.toLowerCase()).length !== 1) return undefined;
    if (newName && ownerMethods.some((item) => item !== callable && item.name.toLowerCase() === newName.toLowerCase())) return undefined;
    const locations = this.references(uri, callable.start, true);
    const dynamicLocations = this.dynamicMemberRenameLocations('method', callable.name,
      (member) => member.fqcn.toLowerCase() === callable.fqcn.toLowerCase());
    if (!dynamicLocations) return undefined;
    locations.push(...dynamicLocations);
    if (!locations.length) return undefined;
    return { uri, start: callable.start, end: callable.end, name: callable.name, fqcn: callable.fqcn, locations };
  }

  private traitMethodRename(file: SemanticFile, callable: ParsedCallableDeclaration, newName?: string): MethodRename | undefined {
    if (!callable.containerFqcn || !this.hasCompleteHierarchy(callable.containerFqcn)) return undefined;
    const traitFqcn = callable.containerFqcn;
    const consumers = this.traitConsumers(traitFqcn);
    if (consumers.some(({ declaration }) => !this.hasCompleteHierarchy(declaration.fqcn))) return undefined;
    const relatedOwners = new Set([traitFqcn.toLowerCase(), ...consumers.map(({ declaration }) => declaration.fqcn.toLowerCase())]);
    for (const consumer of consumers) {
      const namespace = consumer.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const contributors = consumer.declaration.traitNames.map((name) => this.resolveSourceType(consumer.file, name, namespace, consumer.declaration.fqcn))
        .filter((name): name is string => Boolean(name && this.members(name, name, new Set(), true).some((member) => member.kind === 'method' && member.name.toLowerCase() === callable.name.toLowerCase())));
      if (!contributors.some((name) => name.toLowerCase() === traitFqcn.toLowerCase()) || contributors.length <= 1) continue;
      const excluded = new Set<string>();
      for (const adaptation of consumer.declaration.traitAdaptations.filter((item): item is Extract<ParsedTraitAdaptation, { kind: 'precedence' }> =>
        item.kind === 'precedence' && item.method.toLowerCase() === callable.name.toLowerCase())) {
        const selected = this.resolveSourceType(consumer.file, adaptation.trait, namespace, consumer.declaration.fqcn);
        if (!selected || !contributors.some((name) => name.toLowerCase() === selected.toLowerCase())) return undefined;
        for (const name of adaptation.insteadOf) {
          const resolved = this.resolveSourceType(consumer.file, name, namespace, consumer.declaration.fqcn);
          if (!resolved || !contributors.some((contributor) => contributor.toLowerCase() === resolved.toLowerCase())) return undefined;
          excluded.add(resolved.toLowerCase());
        }
      }
      const exposed = contributors.filter((name) => !excluded.has(name.toLowerCase()));
      if (exposed.length !== 1) return undefined;
    }
    const conflictingPrototype = [...this.files.values()].flatMap((candidateFile) => candidateFile.callables)
      .some((candidate) => candidate !== callable && candidate.containerFqcn && candidate.name.toLowerCase() === callable.name.toLowerCase()
        && [...relatedOwners].some((owner) => this.isSubclassOf(owner, candidate.containerFqcn!)));
    if (conflictingPrototype) return undefined;
    if (newName) {
      const collision = [...this.files.values()].flatMap((candidateFile) => candidateFile.callables)
        .some((candidate) => candidate !== callable && candidate.containerFqcn && candidate.name.toLowerCase() === newName.toLowerCase()
          && (relatedOwners.has(candidate.containerFqcn.toLowerCase()) || [...relatedOwners].some((owner) => this.isSubclassOf(owner, candidate.containerFqcn!))));
      if (collision) return undefined;
      if (consumers.some(({ declaration }) => this.members(declaration.fqcn, declaration.fqcn, new Set(), true)
        .some((member) => member.name.toLowerCase() === newName.toLowerCase() && member.fqcn.toLowerCase() !== callable.fqcn.toLowerCase()))) return undefined;
    }
    const escapedName = callable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const callableArray = new RegExp(`\\[\\s*[^,\\]]+,\\s*(['"])${escapedName}\\1\\s*\\]`, 'i');
    const staticCallable = new RegExp(`(['"])[^'"\\r\\n]*::${escapedName}\\1`, 'i');
    if ([...this.files.values()].some((candidate) => callableArray.test(candidate.source) || staticCallable.test(candidate.source))) return undefined;
    const locations: SemanticLocation[] = [{ uri: file.uri, start: callable.start, end: callable.end }];
    const dynamicLocations = this.dynamicMemberRenameLocations('method', callable.name,
      (member) => member.fqcn.toLowerCase() === callable.fqcn.toLowerCase());
    if (!dynamicLocations) return undefined;
    locations.push(...dynamicLocations);
    for (const consumer of consumers) {
      for (const adaptation of consumer.declaration.traitAdaptations.filter((item) => item.method.toLowerCase() === callable.name.toLowerCase())) {
        const namespace = consumer.declaration.fqcn.split('\\').slice(0, -1).join('\\');
        if (adaptation.kind === 'precedence') {
          const selected = this.resolveSourceType(consumer.file, adaptation.trait, namespace, consumer.declaration.fqcn);
          if (selected?.toLowerCase() === traitFqcn.toLowerCase()) {
            const segment = consumer.file.source.slice(adaptation.start, adaptation.end);
            const match = new RegExp(`::\\s*(${escapedName})\\b`, 'i').exec(segment);
            if (!match) return undefined;
            const start = adaptation.start + match.index + match[0].lastIndexOf(match[1]!);
            locations.push({ uri: consumer.file.uri, start, end: start + match[1]!.length });
          }
          continue;
        }
        let applies = false;
        if (adaptation.trait) {
          applies = this.resolveSourceType(consumer.file, adaptation.trait, namespace, consumer.declaration.fqcn)?.toLowerCase() === traitFqcn.toLowerCase();
        } else {
          const matchingTraits = consumer.declaration.traitNames.map((name) => this.resolveSourceType(consumer.file, name, namespace, consumer.declaration.fqcn))
            .filter((name): name is string => Boolean(name && this.members(name, name, new Set(), true).some((member) => member.kind === 'method' && member.name.toLowerCase() === callable.name.toLowerCase())));
          if (matchingTraits.some((name) => name.toLowerCase() === traitFqcn.toLowerCase()) && matchingTraits.length !== 1) return undefined;
          applies = matchingTraits[0]?.toLowerCase() === traitFqcn.toLowerCase();
        }
        if (!applies) continue;
        const segment = consumer.file.source.slice(adaptation.start, adaptation.end);
        const match = adaptation.trait
          ? new RegExp(`::\\s*(${escapedName})\\b`, 'i').exec(segment)
          : new RegExp(`^\\s*(${escapedName})\\b`, 'i').exec(segment);
        if (!match) return undefined;
        const start = adaptation.start + match.index + match[0].lastIndexOf(match[1]!);
        locations.push({ uri: consumer.file.uri, start, end: start + match[1]!.length });
      }
    }
    const familyId = callable.fqcn.toLowerCase();
    const directCall = new RegExp(`(?:->|\\?->|::)\\s*(${escapedName})\\s*\\(`, 'gi');
    for (const candidateFile of this.files.values()) for (const match of candidateFile.source.matchAll(directCall)) {
      const start = match.index + match[0].lastIndexOf(match[1]!);
      const resolved = this.memberAt(candidateFile.uri, start + 1);
      if (resolved?.kind === 'method' && resolved.fqcn.toLowerCase() === familyId) locations.push({ uri: candidateFile.uri, start, end: start + match[1]!.length });
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri: file.uri, start: callable.start, end: callable.end, name: callable.name, fqcn: callable.fqcn, locations: unique };
  }

  private traitAliasRange(file: SemanticFile, adaptation: Extract<ParsedTraitAdaptation, { kind: 'alias' }>): SemanticLocation | undefined {
    if (!adaptation.alias) return undefined;
    const segment = file.source.slice(adaptation.start, adaptation.end); const relative = segment.lastIndexOf(adaptation.alias);
    return relative >= 0 ? { uri: file.uri, start: adaptation.start + relative, end: adaptation.start + relative + adaptation.alias.length } : undefined;
  }

  private traitAliasRename(file: SemanticFile, declaration: ParsedDeclaration,
    adaptation: Extract<ParsedTraitAdaptation, { kind: 'alias' }>, newName?: string): MethodRename | undefined {
    const aliasRange = this.traitAliasRange(file, adaptation);
    if (!adaptation.alias || !aliasRange || declaration.kind === 'trait' || !this.hasCompleteHierarchy(declaration.fqcn)) return undefined;
    const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const matchingTraits = declaration.traitNames.map((name) => this.resolveSourceType(file, name, namespace, declaration.fqcn))
      .filter((name): name is string => Boolean(name && (!adaptation.trait
        || this.resolveSourceType(file, adaptation.trait, namespace, declaration.fqcn)?.toLowerCase() === name.toLowerCase())
        && this.members(name, name, new Set(), true).some((member) => member.kind === 'method' && member.name.toLowerCase() === adaptation.method.toLowerCase())));
    if (matchingTraits.length !== 1) return undefined;
    const aliases = declaration.traitAdaptations.filter((item) => item.kind === 'alias' && item.alias?.toLowerCase() === adaptation.alias!.toLowerCase());
    if (aliases.length !== 1) return undefined;
    const relatedTypes = [...this.files.values()].flatMap((candidate) => candidate.declarations)
      .filter((candidate) => this.isSubclassOf(candidate.fqcn, declaration.fqcn));
    if (relatedTypes.some((candidate) => !this.hasCompleteHierarchy(candidate.fqcn))) return undefined;
    const aliasFqcn = `${declaration.fqcn}::${adaptation.alias}`;
    if (newName && relatedTypes.some((candidate) => this.members(candidate.fqcn, candidate.fqcn, new Set(), true)
      .some((member) => member.kind === 'method' && member.name.toLowerCase() === newName.toLowerCase()
        && member.fqcn.toLowerCase() !== aliasFqcn.toLowerCase()))) return undefined;
    const escaped = adaptation.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const callableArray = new RegExp(`\\[\\s*[^,\\]]+,\\s*(['"])${escaped}\\1\\s*\\]`, 'i');
    const staticCallable = new RegExp(`(['"])[^'"\\r\\n]*::${escaped}\\1`, 'i');
    if ([...this.files.values()].some((candidate) => callableArray.test(candidate.source) || staticCallable.test(candidate.source))) return undefined;
    const locations: SemanticLocation[] = [aliasRange];
    const dynamicLocations = this.dynamicMemberRenameLocations('method', adaptation.alias,
      (member) => member.fqcn.toLowerCase() === aliasFqcn.toLowerCase());
    if (!dynamicLocations) return undefined;
    locations.push(...dynamicLocations);
    const directCall = new RegExp(`(?:->|\\?->|::)\\s*(${escaped})\\s*\\(`, 'gi');
    for (const candidateFile of this.files.values()) for (const match of candidateFile.source.matchAll(directCall)) {
      const start = match.index + match[0].lastIndexOf(match[1]!); const resolved = this.memberAt(candidateFile.uri, start + 1);
      if (resolved?.kind === 'method' && resolved.fqcn.toLowerCase() === aliasFqcn.toLowerCase()) locations.push({ uri: candidateFile.uri, start, end: start + match[1]!.length });
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri: file.uri, start: aliasRange.start, end: aliasRange.end, name: adaptation.alias, fqcn: aliasFqcn, locations: unique };
  }

  private callableArrayMethodRenameLocations(name: string, familyIds: ReadonlySet<string>): SemanticLocation[] | undefined {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const candidate = new RegExp(`\\[\\s*[^,\\]]+,\\s*(['"])${escaped}\\1\\s*\\]`, 'gi');
    const exact = new RegExp(`^\\[\\s*(\\$[A-Za-z_\\x80-\\xff][A-Za-z0-9_\\x80-\\xff]*)\\s*,\\s*(['"])(${escaped})\\2\\s*\\]$`, 'i');
    const locations: SemanticLocation[] = [];
    for (const file of this.files.values()) {
      const matches = [...file.source.matchAll(candidate)]; if (!matches.length) continue;
      const retainedTree = this.trees.get(file.uri);
      const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
      const tree = retainedTree ?? temporaryTree!;
      try {
        for (const match of matches) {
          const parsed = exact.exec(match[0]); if (!parsed) return undefined;
          const variableStart = match.index + match[0].indexOf(parsed[1]!);
          const variableEnd = variableStart + parsed[1]!.length;
          const methodStart = match.index + match[0].lastIndexOf(parsed[3]!);
          const array = deepestLocalSyntax(tree.rootNode, match.index, match.index + match[0].length,
            (node) => node.type === 'array_creation_expression' && node.startIndex === match.index && node.endIndex === match.index + match[0].length);
          const variable = deepestLocalSyntax(tree.rootNode, variableStart, variableEnd,
            (node) => node.type === 'variable_name' && node.startIndex === variableStart && node.endIndex === variableEnd);
          if (!array || !variable) return undefined;
          const receiver = this.provenArgumentType(file, variableStart, variableEnd);
          const groups = receiver && this.objectGroups(receiver);
          if (!groups || groups.nullable || !groups.groups.length) return undefined;
          const accessFrom = this.containingCallable(file, match.index)?.containerFqcn;
          const resolved = groups.groups.map((group) => group.flatMap((variant) => this.members(
            variant.fqcn, accessFrom, new Set(), false, variant.typeArguments,
          ).filter((member) => member.kind === 'method' && member.name.toLowerCase() === name.toLowerCase())));
          if (resolved.some((members) => !members.length || members.some((member) => !familyIds.has(member.fqcn.toLowerCase())))) return undefined;
          locations.push({ uri: file.uri, start: methodStart, end: methodStart + parsed[3]!.length });
        }
      } finally { temporaryTree?.delete(); }
    }
    return locations;
  }

  methodRename(uri: string, offset: number, newName?: string): MethodRename | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declared = file.callables.find((item) => item.kind === 'method' && item.containerFqcn && !item.name.startsWith('__')
      && offset >= item.start && offset <= item.end);
    if (!declared) {
      for (const declaration of file.declarations) for (const adaptation of declaration.traitAdaptations.filter((item): item is Extract<ParsedTraitAdaptation, { kind: 'alias' }> => item.kind === 'alias' && Boolean(item.alias))) {
        const range = this.traitAliasRange(file, adaptation);
        if (range && offset >= range.start && offset <= range.end) return this.traitAliasRename(file, declaration, adaptation, newName);
      }
      const access = file.memberAccesses.find((item) => item.kind === 'method' && offset >= item.start && offset <= item.end);
      const members = access ? this.membersAt(uri, offset).filter((item) => item.kind === 'method') : [];
      if (!access || !members.length) return undefined;
      if (members.length === 1) {
        const [ownerFqcn, alias] = members[0]!.fqcn.split('::'); const owner = ownerFqcn ? this.fileAndDeclaration(ownerFqcn) : undefined;
        const adaptation = owner?.declaration.traitAdaptations.find((item): item is Extract<ParsedTraitAdaptation, { kind: 'alias' }> => item.kind === 'alias'
          && item.alias?.toLowerCase() === alias?.toLowerCase());
        const result = owner && adaptation ? this.traitAliasRename(owner.file, owner.declaration, adaptation, newName) : undefined;
        if (result && result.locations.some((location) => location.uri === uri && location.start === access.start && location.end === access.end)) {
          return { ...result, uri, start: access.start, end: access.end };
        }
      }
      const declaration = [...this.files.values()].flatMap((candidateFile) => candidateFile.callables.map((callable) => ({ file: candidateFile, callable })))
        .find(({ file: candidateFile, callable }) => callable.kind === 'method' && callable.containerFqcn
          && members.some((member) => member.uri === candidateFile.uri && member.start === callable.start && member.end === callable.end
            && member.fqcn.toLowerCase() === callable.fqcn.toLowerCase()));
      if (!declaration) return undefined;
      const result = this.methodRename(declaration.file.uri, declaration.callable.start, newName);
      if (!result || members.some((member) => !result.locations.some((location) => location.uri === member.uri && location.start === member.start && location.end === member.end))) return undefined;
      return { ...result, uri, start: access.start, end: access.end };
    }
    if (newName && newName.toLowerCase() === declared.name.toLowerCase()) return undefined;
    if (declared?.containerFqcn && this.fileAndDeclaration(declared.containerFqcn)?.declaration.kind === 'trait') return this.traitMethodRename(file, declared, newName);
    const privateRename = this.privateMethodRename(uri, offset, newName);
    if (privateRename) return privateRename;
    const callable = file.callables.find((item) => item.kind === 'method' && item.containerFqcn && item.visibility !== 'private'
      && !item.name.startsWith('__') && offset >= item.start && offset <= item.end);
    if (!callable?.containerFqcn || this.fileAndDeclaration(callable.containerFqcn)?.declaration.kind === 'trait'
      || !this.hasCompleteHierarchy(callable.containerFqcn)) return undefined;
    const candidates = [...this.files.values()].flatMap((ownerFile) => ownerFile.callables.map((item) => ({ file: ownerFile, callable: item })))
      .filter(({ callable: item }) => item.kind === 'method' && item.containerFqcn && item.visibility !== 'private'
        && item.name.toLowerCase() === callable.name.toLowerCase());
    const family = new Map<string, { file: SemanticFile; callable: ParsedCallableDeclaration }>([[callable.fqcn.toLowerCase(), { file, callable }]]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of candidates) {
        if (family.has(candidate.callable.fqcn.toLowerCase())) continue;
        const related = [...family.values()].some((member) => this.isSubclassOf(candidate.callable.containerFqcn!, member.callable.containerFqcn!)
          || this.isSubclassOf(member.callable.containerFqcn!, candidate.callable.containerFqcn!));
        if (related) { family.set(candidate.callable.fqcn.toLowerCase(), candidate); changed = true; }
      }
    }
    const members = [...family.values()];
    const relatedTypes = [...this.files.values()].flatMap((candidateFile) => candidateFile.declarations)
      .filter((declaration) => members.some((member) => this.isSubclassOf(declaration.fqcn, member.callable.containerFqcn!)
        || this.isSubclassOf(member.callable.containerFqcn!, declaration.fqcn)));
    if (members.some((member) => !this.hasCompleteHierarchy(member.callable.containerFqcn!))
      || relatedTypes.some((declaration) => !this.hasCompleteHierarchy(declaration.fqcn))) return undefined;
    if (newName) {
      const collision = [...this.files.values()].flatMap((ownerFile) => ownerFile.callables)
        .filter((candidate) => candidate.kind === 'method' && candidate.containerFqcn && candidate.name.toLowerCase() === newName.toLowerCase())
        .some((candidate) => members.some((member) => this.isSubclassOf(candidate.containerFqcn!, member.callable.containerFqcn!)
          || this.isSubclassOf(member.callable.containerFqcn!, candidate.containerFqcn!)));
      if (collision) return undefined;
    }
    const escapedName = callable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const staticCallable = new RegExp(`(['"])[^'"\\r\\n]*::${escapedName}\\1`, 'i');
    const familyIds = new Set(members.map((member) => member.callable.fqcn.toLowerCase()));
    const callableArrayLocations = this.callableArrayMethodRenameLocations(callable.name, familyIds);
    if (!callableArrayLocations || [...this.files.values()].some((candidate) => staticCallable.test(candidate.source))) return undefined;
    const locations: SemanticLocation[] = members.map((member) => ({ uri: member.file.uri, start: member.callable.start, end: member.callable.end }));
    locations.push(...callableArrayLocations);
    const dynamicLocations = this.dynamicMemberRenameLocations('method', callable.name,
      (member) => familyIds.has(member.fqcn.toLowerCase()));
    if (!dynamicLocations) return undefined;
    locations.push(...dynamicLocations);
    for (const candidateFile of this.filesForReferenceKeys(memberCandidateKey('method', callable.name))) {
      const directCall = new RegExp(`(?:->|\\?->|::)\\s*(${escapedName})\\s*\\(`, 'gi');
      for (const match of candidateFile.source.matchAll(directCall)) {
        const start = match.index + match[0].lastIndexOf(match[1]!);
        const resolved = this.memberAt(candidateFile.uri, start + 1);
        const scope = !resolved && /\b(?:parent|self|static)::\s*$/i.test(candidateFile.source.slice(Math.max(0, match.index - 16), start))
          ? this.containingCallable(candidateFile, start) : undefined;
        const familyKeywordCall = scope?.containerFqcn && members.some((member) => this.isSubclassOf(scope.containerFqcn!, member.callable.containerFqcn!)
          || this.isSubclassOf(member.callable.containerFqcn!, scope.containerFqcn!));
        if (resolved && familyIds.has(resolved.fqcn.toLowerCase()) || familyKeywordCall) locations.push({ uri: candidateFile.uri, start, end: start + match[1]!.length });
      }
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri, start: callable.start, end: callable.end, name: callable.name, fqcn: callable.fqcn, locations: unique };
  }

  removeUnusedPrivateParameter(uri: string, offset: number): RemovePrivateParameterInfo | undefined {
    const file = this.files.get(uri); const tree = this.trees.get(uri); if (!file || !tree) return undefined;
    const callable = file.callables.find((item) => item.kind === 'method' && item.visibility === 'private' && !item.name.startsWith('__')
      && item.parameters.some((parameter) => offset >= parameter.start && offset <= parameter.end));
    const parameter = callable?.parameters.find((item) => offset >= item.start && offset <= item.end);
    if (!callable?.containerFqcn || !parameter || parameter.promoted || parameter.byReference || parameter.variadic) return undefined;
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.callables)
      .filter((candidate) => candidate.kind === 'method' && candidate.fqcn.toLowerCase() === callable.fqcn.toLowerCase());
    if (declarations.length !== 1) return undefined;
    const uses = file.variableReferences.filter((item) => item.scopeId === callable.fqcn && item.variable === `$${parameter.name}`);
    if (uses.length !== 1 || uses[0]!.start !== parameter.start || uses[0]!.end !== parameter.end) return undefined;
    let parameterNode = deepestLocalSyntax(tree.rootNode, parameter.start, parameter.end,
      (node) => node.type === 'variable_name' && node.startIndex === parameter.start && node.endIndex === parameter.end);
    if (!parameterNode) return undefined;
    while (parameterNode.parent && parameterNode.parent.type !== 'formal_parameters') parameterNode = parameterNode.parent;
    const parameterList = parameterNode.parent; if (parameterList?.type !== 'formal_parameters') return undefined;
    const parameterIndex = parameterList.namedChildren.findIndex((item) => item.startIndex === parameterNode!.startIndex && item.endIndex === parameterNode!.endIndex);
    if (parameterIndex < 0) return undefined;
    const previousParameter = parameterList.namedChildren[parameterIndex - 1]; const nextParameter = parameterList.namedChildren[parameterIndex + 1];
    const edits: RemovePrivateParameterInfo['edits'] = [{ uri, start: nextParameter ? parameterNode.startIndex : previousParameter?.endIndex ?? parameterNode.startIndex, end: nextParameter?.startIndex ?? parameterNode.endIndex }];
    const directCalls: Array<{ file: SemanticFile; call: ParsedCall }> = [];
    for (const candidateFile of this.files.values()) for (const call of candidateFile.calls) {
      if (candidateFile.source.slice(call.nameStart, call.nameEnd).toLowerCase() !== callable.name.toLowerCase()) continue;
      const signature = this.signature(candidateFile.uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1));
      if (signature?.kind === 'method' && signature.fqcn.toLowerCase() === callable.fqcn.toLowerCase()) directCalls.push({ file: candidateFile, call });
    }
    const references = this.references(uri, callable.start, true);
    if (references.some((reference) => reference.start !== callable.start || reference.end !== callable.end)
      && references.filter((reference) => reference.start !== callable.start || reference.end !== callable.end).some((reference) => !directCalls.some(({ file: candidate, call }) => candidate.uri === reference.uri && call.nameStart === reference.start && call.nameEnd === reference.end))) return undefined;
    const parameterPosition = callable.parameters.indexOf(parameter);
    for (const { file: callFile, call } of directCalls) {
      if (!call.flat || call.arguments.some((argument) => argument.unpacked)) return undefined;
      const named = call.arguments.find((argument) => argument.name === parameter.name);
      const positional = call.arguments.filter((argument) => !argument.name)[parameterPosition];
      const argument = named ?? positional; if (!argument) continue;
      const separator = argument.nameEnd === undefined ? -1 : callFile.source.indexOf(':', argument.nameEnd);
      const valueStart = separator >= 0 && separator < argument.end ? separator + 1 : argument.start;
      const value = callFile.source.slice(valueStart, argument.end).trim();
      const safeValue = /^\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(value)
        || /^(?:null|true|false|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|(['"])[\s\S]*\1)$/i.test(value)
        || /^(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)(?:::[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)?$/.test(value);
      if (!safeValue) return undefined;
      const argumentIndex = call.arguments.indexOf(argument); const previous = call.arguments[argumentIndex - 1]; const next = call.arguments[argumentIndex + 1];
      edits.push({ uri: callFile.uri, start: next ? argument.start : previous?.end ?? argument.start, end: next?.start ?? argument.end });
    }
    const doc = file.commentRanges.filter((comment) => comment.end <= callable.declarationStart && file.source.startsWith('/**', comment.start))
      .sort((left, right) => right.end - left.end)[0];
    if (doc && /^[\s]*(?:#\[[\s\S]*?\][\s]*)*$/.test(file.source.slice(doc.end, callable.declarationStart))) {
      const escaped = parameter.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const line = new RegExp(`^[ \\t]*\\*[ \\t]*@(?:(?:phpstan|psalm)-)?param\\b[^\\r\\n]*\\$${escaped}\\b[^\\r\\n]*(?:\\r?\\n|$)`, 'gmu');
      for (const match of file.source.slice(doc.start, doc.end).matchAll(line)) edits.push({ uri, start: doc.start + match.index, end: doc.start + match.index + match[0].length });
    }
    return { uri, callable: callable.fqcn, parameter: parameter.name, edits };
  }

  privatePropertyRename(uri: string, offset: number, newName?: string): PrivatePropertyRename | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const property = file.properties.find((item) => item.visibility === 'private' && !item.promoted && offset >= item.start && offset <= item.end);
    if (!property) return undefined;
    const ownerProperties = file.properties.filter((item) => item.containerFqcn.toLowerCase() === property.containerFqcn.toLowerCase());
    if (ownerProperties.filter((item) => item.name.toLowerCase() === property.name.toLowerCase()).length !== 1) return undefined;
    if (newName && ownerProperties.some((item) => item !== property && item.name.toLowerCase() === newName.toLowerCase())) return undefined;
    const locations = this.references(uri, property.start, true); if (!locations.length) return undefined;
    const dynamicLocations = this.dynamicMemberRenameLocations('property', property.name,
      (member) => member.fqcn.toLowerCase() === property.fqcn.toLowerCase());
    if (!dynamicLocations) return undefined;
    locations.push(...dynamicLocations);
    return { uri, start: property.start + 1, end: property.end, name: property.name, fqcn: property.fqcn, locations: locations.map((item) => item.start === property.start ? { ...item, start: item.start + 1 } : item) };
  }

  private promotedPropertyRename(uri: string, offset: number, newName?: string): PropertyRename | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const property = file.properties.find((item) => item.promoted && offset >= item.start && offset <= item.end);
    if (!property || this.fileAndDeclaration(property.containerFqcn)?.declaration.kind === 'trait'
      || !this.hasCompleteHierarchy(property.containerFqcn)) return undefined;
    const constructor = file.callables.find((item) => item.kind === 'method' && item.containerFqcn?.toLowerCase() === property.containerFqcn.toLowerCase()
      && item.name.toLowerCase() === '__construct');
    const parameter = constructor?.parameters.find((item) => item.promoted && item.start === property.start && item.end === property.end);
    if (!constructor || !parameter) return undefined;
    const relatedTypes = [...this.files.values()].flatMap((candidateFile) => candidateFile.declarations)
      .filter((declaration) => this.isSubclassOf(declaration.fqcn, property.containerFqcn));
    if (relatedTypes.some((declaration) => !this.hasCompleteHierarchy(declaration.fqcn))) return undefined;
    const relatedProperties = [...this.files.values()].flatMap((candidateFile) => candidateFile.properties)
      .filter((candidate) => relatedTypes.some((declaration) => candidate.containerFqcn.toLowerCase() === declaration.fqcn.toLowerCase()));
    if (relatedProperties.some((candidate) => candidate !== property && candidate.name.toLowerCase() === property.name.toLowerCase())) return undefined;
    if (newName && relatedProperties.some((candidate) => candidate !== property && candidate.name.toLowerCase() === newName.toLowerCase())) return undefined;
    const normalized = newName ? `$${newName.replace(/^\$/, '')}` : undefined;
    if (normalized && constructor.parameters.some((candidate) => candidate !== parameter && `$${candidate.name}` === normalized)) return undefined;
    if (normalized && file.variableReferences.some((reference) => reference.scopeId === constructor.fqcn && reference.variable === normalized)) return undefined;
    const nested = file.scopes.filter((scope) => scope.parentId === constructor.fqcn);
    if (nested.some((scope) => file.variableReferences.some((reference) => reference.scopeId === scope.id && reference.variable === `$${parameter.name}`))) return undefined;
    const locations: SemanticLocation[] = file.variableReferences.filter((reference) => reference.scopeId === constructor.fqcn && reference.variable === `$${parameter.name}`)
      .map((reference) => ({ uri: file.uri, start: reference.start + 1, end: reference.end }));
    if (!locations.some((location) => location.start === property.start + 1 && location.end === property.end)) return undefined;
    locations.push(...this.phpDocParameterLocations(file, constructor, parameter.name));
    const dynamicLocations = this.dynamicMemberRenameLocations('property', property.name,
      (member) => member.fqcn.toLowerCase() === property.fqcn.toLowerCase());
    if (!dynamicLocations) return undefined;
    locations.push(...dynamicLocations);
    for (const candidateFile of this.files.values()) {
      for (const call of candidateFile.calls) {
        const named = call.arguments.filter((argument) => argument.name === parameter.name && argument.nameStart !== undefined && argument.nameEnd !== undefined);
        if (!named.length) continue;
        const signature = this.signature(candidateFile.uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1));
        if (signature?.fqcn.toLowerCase() !== constructor.fqcn.toLowerCase()) continue;
        locations.push(...named.map((argument) => ({ uri: candidateFile.uri, start: argument.nameStart!, end: argument.nameEnd! })));
      }
    }
    const escapedName = property.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const candidateFile of this.filesForReferenceKeys(memberCandidateKey('property', property.name))) {
      const directAccess = new RegExp(`(?:->|::)\\s*\\$?(${escapedName})\\b(?!\\s*\\()`, 'gi');
      for (const match of candidateFile.source.matchAll(directAccess)) {
        const start = match.index + match[0].lastIndexOf(match[1]!);
        const resolved = this.memberAt(candidateFile.uri, start + 1);
        if (resolved?.kind === 'property' && resolved.fqcn.toLowerCase() === property.fqcn.toLowerCase()) locations.push({ uri: candidateFile.uri, start, end: start + match[1]!.length });
      }
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri, start: property.start + 1, end: property.end, name: property.name, fqcn: property.fqcn, locations: unique };
  }

  private traitPropertyRename(file: SemanticFile, property: ParsedPropertyDeclaration, newName?: string): PropertyRename | undefined {
    if (!this.hasCompleteHierarchy(property.containerFqcn)) return undefined;
    const consumers = this.traitConsumers(property.containerFqcn);
    if (consumers.some(({ declaration }) => !this.hasCompleteHierarchy(declaration.fqcn))) return undefined;
    for (const consumer of consumers) {
      const namespace = consumer.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const contributors = consumer.declaration.traitNames.map((name) => this.resolveSourceType(consumer.file, name, namespace, consumer.declaration.fqcn))
        .filter((name): name is string => Boolean(name && this.members(name, name, new Set(), true).some((member) => member.kind === 'property' && member.name.toLowerCase() === property.name.toLowerCase())));
      if (contributors.some((name) => name.toLowerCase() === property.containerFqcn.toLowerCase()) && contributors.length > 1) return undefined;
      if (consumer.file.properties.some((candidate) => candidate !== property && candidate.containerFqcn.toLowerCase() === consumer.declaration.fqcn.toLowerCase()
        && candidate.name.toLowerCase() === property.name.toLowerCase())) return undefined;
    }
    if (newName && (file.properties.some((candidate) => candidate !== property && candidate.containerFqcn.toLowerCase() === property.containerFqcn.toLowerCase()
      && candidate.name.toLowerCase() === newName.toLowerCase()) || consumers.some(({ declaration }) => this.members(declaration.fqcn, declaration.fqcn, new Set(), true)
      .some((member) => member.kind === 'property' && member.name.toLowerCase() === newName.toLowerCase() && member.fqcn.toLowerCase() !== property.fqcn.toLowerCase())))) return undefined;
    const locations: SemanticLocation[] = [{ uri: file.uri, start: property.start + 1, end: property.end }];
    const dynamicLocations = this.dynamicMemberRenameLocations('property', property.name,
      (member) => member.fqcn.toLowerCase() === property.fqcn.toLowerCase());
    if (!dynamicLocations) return undefined;
    locations.push(...dynamicLocations);
    const escapedName = property.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const relatedOwners = new Set([property.containerFqcn.toLowerCase(), ...consumers.map(({ declaration }) => declaration.fqcn.toLowerCase())]);
    for (const candidateFile of this.filesForReferenceKeys(memberCandidateKey('property', property.name))) {
      const directAccess = new RegExp(`(?:->|::)\\s*\\$?(${escapedName})\\b(?!\\s*\\()`, 'gi');
      for (const match of candidateFile.source.matchAll(directAccess)) {
        const start = match.index + match[0].lastIndexOf(match[1]!);
        const resolved = this.memberAt(candidateFile.uri, start + 1);
        const scope = !resolved && /(?:\$this\s*(?:\?->|->)|\b(?:parent|self|static)::\s*\$?)\s*$/i.test(candidateFile.source.slice(Math.max(0, match.index - 24), start))
          ? this.containingCallable(candidateFile, start) : undefined;
        if (resolved?.kind === 'property' && resolved.fqcn.toLowerCase() === property.fqcn.toLowerCase()
          || scope?.containerFqcn && relatedOwners.has(scope.containerFqcn.toLowerCase())) locations.push({ uri: candidateFile.uri, start, end: start + match[1]!.length });
      }
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri: file.uri, start: property.start + 1, end: property.end, name: property.name, fqcn: property.fqcn, locations: unique };
  }

  propertyRename(uri: string, offset: number, newName?: string): PropertyRename | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declared = file.properties.find((item) => offset >= item.start && offset <= item.end);
    if (!declared) {
      const access = file.memberAccesses.find((item) => item.kind === 'property' && offset >= item.start && offset <= item.end);
      const members = access ? this.membersAt(uri, offset).filter((item) => item.kind === 'property') : [];
      if (!access || !members.length) return undefined;
      const declaration = [...this.files.values()].flatMap((candidateFile) => candidateFile.properties.map((property) => ({ file: candidateFile, property })))
        .find(({ file: candidateFile, property }) => members.some((member) => member.uri === candidateFile.uri && member.start === property.start && member.end === property.end));
      if (!declaration) return undefined;
      const result = this.propertyRename(declaration.file.uri, declaration.property.start, newName);
      if (!result || members.some((member) => !result.locations.some((location) => location.uri === member.uri
        && location.start === member.start + (this.files.get(member.uri)?.source[member.start] === '$' ? 1 : 0) && location.end === member.end))) return undefined;
      return { ...result, uri, start: access.start + (file.source[access.start] === '$' ? 1 : 0), end: access.end };
    }
    if (declared && this.fileAndDeclaration(declared.containerFqcn)?.declaration.kind === 'trait') return this.traitPropertyRename(file, declared, newName);
    const promotedRename = this.promotedPropertyRename(uri, offset, newName);
    if (promotedRename) return promotedRename;
    const privateRename = this.privatePropertyRename(uri, offset, newName);
    if (privateRename) return privateRename;
    const property = file.properties.find((item) => item.visibility !== 'private' && !item.promoted && offset >= item.start && offset <= item.end);
    if (!property || this.fileAndDeclaration(property.containerFqcn)?.declaration.kind === 'trait'
      || !this.hasCompleteHierarchy(property.containerFqcn)) return undefined;
    const candidates = [...this.files.values()].flatMap((ownerFile) => ownerFile.properties.map((item) => ({ file: ownerFile, property: item })))
      .filter(({ property: item }) => item.visibility !== 'private' && !item.promoted && item.name.toLowerCase() === property.name.toLowerCase());
    const family = candidates.filter((candidate) => this.isSubclassOf(candidate.property.containerFqcn, property.containerFqcn)
      || this.isSubclassOf(property.containerFqcn, candidate.property.containerFqcn));
    if (!family.length || family.some((member) => this.fileAndDeclaration(member.property.containerFqcn)?.declaration.kind === 'trait')) return undefined;
    const relatedTypes = [...this.files.values()].flatMap((candidateFile) => candidateFile.declarations)
      .filter((declaration) => family.some((member) => this.isSubclassOf(declaration.fqcn, member.property.containerFqcn)
        || this.isSubclassOf(member.property.containerFqcn, declaration.fqcn)));
    if (relatedTypes.some((declaration) => !this.hasCompleteHierarchy(declaration.fqcn))) return undefined;
    const relatedProperties = [...this.files.values()].flatMap((candidateFile) => candidateFile.properties)
      .filter((candidate) => family.some((member) => this.isSubclassOf(candidate.containerFqcn, member.property.containerFqcn)
        || this.isSubclassOf(member.property.containerFqcn, candidate.containerFqcn)));
    if (relatedProperties.some((candidate) => candidate.name.toLowerCase() === property.name.toLowerCase()
      && (candidate.visibility === 'private' || candidate.promoted))) return undefined;
    if (newName && relatedProperties.some((candidate) => candidate.name.toLowerCase() === newName.toLowerCase())) return undefined;
    const escapedName = property.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const familyIds = new Set(family.map((member) => member.property.fqcn.toLowerCase()));
    const locations: SemanticLocation[] = family.map((member) => ({ uri: member.file.uri, start: member.property.start + 1, end: member.property.end }));
    const dynamicLocations = this.dynamicMemberRenameLocations('property', property.name,
      (member) => familyIds.has(member.fqcn.toLowerCase()));
    if (!dynamicLocations) return undefined;
    locations.push(...dynamicLocations);
    for (const candidateFile of this.filesForReferenceKeys(memberCandidateKey('property', property.name))) {
      const directAccess = new RegExp(`(?:->|::)\\s*\\$?(${escapedName})\\b(?!\\s*\\()`, 'gi');
      for (const match of candidateFile.source.matchAll(directAccess)) {
        const start = match.index + match[0].lastIndexOf(match[1]!);
        const resolved = this.memberAt(candidateFile.uri, start + 1);
        const scope = !resolved && /(?:\$this\s*(?:\?->|->)|\b(?:parent|self|static)::\s*\$?)\s*$/i.test(candidateFile.source.slice(Math.max(0, match.index - 24), start))
          ? this.containingCallable(candidateFile, start) : undefined;
        const familyKeywordAccess = scope?.containerFqcn && family.some((member) => this.isSubclassOf(scope.containerFqcn!, member.property.containerFqcn)
          || this.isSubclassOf(member.property.containerFqcn, scope.containerFqcn!));
        if (resolved && resolved.kind === 'property' && familyIds.has(resolved.fqcn.toLowerCase()) || familyKeywordAccess) {
          locations.push({ uri: candidateFile.uri, start, end: start + match[1]!.length });
        }
      }
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri, start: property.start + 1, end: property.end, name: property.name, fqcn: property.fqcn, locations: unique };
  }

  functionRename(uri: string, offset: number, newName?: string): FunctionRename | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declared = file.callables.find((item) => item.kind === 'function' && offset >= item.start && offset <= item.end);
    if (!declared) {
      const word = wordAt(file.source, offset); const resolved = word && this.functionAt(uri, offset);
      if (!word || resolved?.kind !== 'function') return undefined;
      const declarationFile = this.files.get(resolved.uri);
      const declaration = declarationFile?.callables.find((item) => item.kind === 'function' && item.start === resolved.start && item.end === resolved.end);
      if (!declarationFile || !declaration) return undefined;
      const result = this.functionRename(declarationFile.uri, declaration.start, newName);
      const start = word.end - resolved.name.length;
      if (!result || !result.locations.some((location) => location.uri === uri && location.start === start && location.end === word.end)) return undefined;
      return { ...result, uri, start, end: word.end };
    }
    const callable = declared;
    const declarations = [...this.files.values()].flatMap((item) => item.callables.filter((candidate) => candidate.kind === 'function'));
    if (declarations.filter((item) => item.fqcn.toLowerCase() === callable.fqcn.toLowerCase()).length !== 1) return undefined;
    const namespace = callable.fqcn.split('\\').slice(0, -1).join('\\');
    const renamedFqcn = [namespace, newName].filter(Boolean).join('\\');
    if (newName && declarations.some((item) => item !== callable && item.fqcn.toLowerCase() === renamedFqcn.toLowerCase())) return undefined;
    const locations: SemanticLocation[] = [{ uri, start: callable.start, end: callable.end }];
    for (const candidate of this.filesForReferenceKeys(`raw-ci:${callable.name.toLowerCase()}`, `import:function:${callable.fqcn.toLowerCase()}`)) {
      for (const imported of candidate.imports.filter((item) => item.kind === 'function' && item.fqcn.toLowerCase() === callable.fqcn.toLowerCase())) {
        locations.push({ uri: candidate.uri, start: imported.pathEnd - callable.name.length, end: imported.pathEnd });
      }
      const excluded = [...candidate.commentRanges, ...candidate.stringRanges];
      for (const match of candidate.source.matchAll(/([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*\(/g)) {
        const text = match[1]!; const start = match.index; const end = start + text.length;
        if (excluded.some((range) => start >= range.start && end <= range.end)) continue;
        const resolved = this.functionAt(candidate.uri, start + 1); if (resolved?.fqcn.toLowerCase() !== callable.fqcn.toLowerCase()) continue;
        const explicitAlias = candidate.imports.some((item) => item.kind === 'function' && item.explicitAlias
          && item.fqcn.toLowerCase() === callable.fqcn.toLowerCase() && item.alias.toLowerCase() === text.toLowerCase());
        if (explicitAlias && !text.includes('\\')) continue;
        if (newName && !text.includes('\\')) {
          const callNamespace = this.namespaceAt(candidate, start);
          const collisionFqcn = [callNamespace, newName].filter(Boolean).join('\\').toLowerCase();
          if (declarations.some((item) => item.fqcn.toLowerCase() === collisionFqcn && item.fqcn.toLowerCase() !== callable.fqcn.toLowerCase())) return undefined;
          if (candidate.imports.some((item) => item.kind === 'function' && item.alias.toLowerCase() === newName.toLowerCase() && item.fqcn.toLowerCase() !== callable.fqcn.toLowerCase())) return undefined;
        }
        const nameStart = start + text.lastIndexOf('\\') + 1;
        locations.push({ uri: candidate.uri, start: nameStart, end });
      }
    }
    const unique = [...new Map(locations.map((item) => [`${item.uri}:${item.start}:${item.end}`, item])).values()];
    return { uri, start: callable.start, end: callable.end, name: callable.name, fqcn: callable.fqcn, locations: unique };
  }

  private globalConstantRename(file: SemanticFile, constant: ParsedConstantDeclaration, newName?: string): ConstantRename | undefined {
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.constants.filter((item) => item.global));
    if (declarations.filter((item) => item.fqcn === constant.fqcn).length !== 1) return undefined;
    const namespace = constant.fqcn.split('\\').slice(0, -1).join('\\');
    const renamedFqcn = [namespace, newName].filter(Boolean).join('\\');
    if (newName && declarations.some((item) => item !== constant && item.fqcn === renamedFqcn)) return undefined;
    const escaped = constant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dynamicLookup = new RegExp(`\\bconstant\\s*\\(\\s*(['"])(?:[^'"\\r\\n]*(?:\\\\|::))?${escaped}\\1`, 'i');
    if ([...this.files.values()].some((candidate) => dynamicLookup.test(candidate.source))) return undefined;
    const locations: SemanticLocation[] = [{ uri: file.uri, start: constant.start, end: constant.end }];
    for (const candidate of this.filesForReferenceKeys(`raw-cs:${constant.name}`, `import:const:${constant.fqcn}`)) {
      for (const imported of candidate.imports.filter((item) => item.kind === 'const' && item.fqcn === constant.fqcn)) {
        locations.push({ uri: candidate.uri, start: imported.pathEnd - constant.name.length, end: imported.pathEnd });
      }
      for (const raw of candidate.rawNames) {
        if (this.resolveConstant(candidate, raw.text, this.namespaceAt(candidate, raw.start)) !== constant.fqcn) continue;
        const explicitAlias = candidate.imports.some((item) => item.kind === 'const' && item.explicitAlias
          && item.fqcn === constant.fqcn && item.alias === raw.text);
        if (explicitAlias && !raw.text.includes('\\')) continue;
        if (newName && !raw.text.includes('\\')) {
          const useNamespace = this.namespaceAt(candidate, raw.start);
          const collisionFqcn = [useNamespace, newName].filter(Boolean).join('\\');
          if (declarations.some((item) => item.fqcn === collisionFqcn && item.fqcn !== constant.fqcn)) return undefined;
          if (candidate.imports.some((item) => item.kind === 'const' && item.alias === newName
            && item.fqcn !== constant.fqcn)) return undefined;
        }
        const start = raw.end - constant.name.length;
        locations.push({ uri: candidate.uri, start, end: raw.end });
      }
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri: file.uri, start: constant.start, end: constant.end, name: constant.name, fqcn: constant.fqcn, locations: unique };
  }

  private classConstantRename(file: SemanticFile, constant: ParsedConstantDeclaration, newName?: string): ConstantRename | undefined {
    if (!constant.containerFqcn || !this.hasCompleteHierarchy(constant.containerFqcn)) return undefined;
    const owner = this.fileAndDeclaration(constant.containerFqcn)?.declaration;
    if (!owner || owner.kind === 'trait') return undefined;
    const declarations = [...this.files.values()].flatMap((candidateFile) => candidateFile.constants.map((item) => ({ file: candidateFile, constant: item })))
      .filter(({ constant: item }) => item.containerFqcn);
    if (declarations.filter(({ constant: item }) => item.fqcn === constant.fqcn).length !== 1) return undefined;
    const relatedTypes = [...this.files.values()].flatMap((candidate) => candidate.declarations)
      .filter((declaration) => this.isSubclassOf(declaration.fqcn, constant.containerFqcn!) || this.isSubclassOf(constant.containerFqcn!, declaration.fqcn));
    if (relatedTypes.some((declaration) => !this.hasCompleteHierarchy(declaration.fqcn))) return undefined;
    if (newName && relatedTypes.some((type) => this.members(type.fqcn, type.fqcn, new Set(), true)
      .some((member) => member.kind === 'constant' && member.name === newName
        && member.fqcn !== constant.fqcn))) return undefined;
    const escaped = constant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dynamicAccess = /::\s*\{/;
    const stringLookup = new RegExp(`(?:\\bconstant\\s*\\(\\s*|\\bgetConstant\\s*\\(\\s*)(['"])[^'"\\r\\n]*${escaped}\\1`, 'i');
    if ([...this.files.values()].some((candidate) => dynamicAccess.test(candidate.source) || stringLookup.test(candidate.source))) return undefined;
    const locations: SemanticLocation[] = [{ uri: file.uri, start: constant.start, end: constant.end }];
    for (const candidateFile of this.filesForReferenceKeys(memberCandidateKey('constant', constant.name))) for (const access of candidateFile.memberAccesses.filter((item) => item.kind === 'constant'
      && item.name.toLowerCase() === constant.name.toLowerCase())) {
      const resolved = this.memberAt(candidateFile.uri, access.start + 1);
      if (resolved?.kind === 'constant' && resolved.fqcn === constant.fqcn) locations.push({ uri: candidateFile.uri, start: access.start, end: access.end });
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri: file.uri, start: constant.start, end: constant.end, name: constant.name, fqcn: constant.fqcn, locations: unique };
  }

  private enumCaseRename(file: SemanticFile, constant: ParsedConstantDeclaration, newName?: string): ConstantRename | undefined {
    if (constant.kind !== 'enum-case' || !constant.containerFqcn || !this.hasCompleteHierarchy(constant.containerFqcn)) return undefined;
    const owner = this.fileAndDeclaration(constant.containerFqcn)?.declaration;
    if (!owner || owner.kind !== 'enum') return undefined;
    const declarations = [...this.files.values()].flatMap((candidate) => candidate.constants)
      .filter((candidate) => candidate.kind === 'enum-case' && candidate.fqcn === constant.fqcn);
    if (declarations.length !== 1) return undefined;
    if (newName && file.constants.some((candidate) => candidate !== constant
      && candidate.containerFqcn === constant.containerFqcn && candidate.name === newName)) return undefined;
    const escaped = constant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dynamicAccess = /::\s*\{/;
    const stringLookup = new RegExp(`\\b(?:constant|getCase)\\s*\\([^\\r\\n)]*(['"])[^'"\\r\\n]*${escaped}\\1`, 'i');
    if ([...this.files.values()].some((candidate) => dynamicAccess.test(candidate.source) || stringLookup.test(candidate.source))) return undefined;
    const locations: SemanticLocation[] = [{ uri: file.uri, start: constant.start, end: constant.end }];
    for (const candidateFile of this.filesForReferenceKeys(memberCandidateKey('constant', constant.name))) for (const access of candidateFile.memberAccesses.filter((item) => item.kind === 'constant'
      && item.name === constant.name)) {
      const resolved = this.memberAt(candidateFile.uri, access.start + 1);
      if (resolved?.kind === 'constant' && resolved.fqcn === constant.fqcn) locations.push({ uri: candidateFile.uri, start: access.start, end: access.end });
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri: file.uri, start: constant.start, end: constant.end, name: constant.name, fqcn: constant.fqcn, locations: unique };
  }

  private traitConstantRename(file: SemanticFile, constant: ParsedConstantDeclaration, newName?: string): ConstantRename | undefined {
    if (!constant.containerFqcn || !this.hasCompleteHierarchy(constant.containerFqcn)) return undefined;
    const consumers = this.traitConsumers(constant.containerFqcn);
    if (consumers.some(({ declaration }) => !this.hasCompleteHierarchy(declaration.fqcn))) return undefined;
    for (const consumer of consumers) {
      const namespace = consumer.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const contributors = consumer.declaration.traitNames.map((name) => this.resolveSourceType(consumer.file, name, namespace, consumer.declaration.fqcn))
        .filter((name): name is string => Boolean(name && this.members(name, name, new Set(), true)
          .some((member) => member.kind === 'constant' && member.name === constant.name)));
      if (contributors.some((name) => name.toLowerCase() === constant.containerFqcn!.toLowerCase()) && contributors.length > 1) return undefined;
      if (consumer.file.constants.some((candidate) => candidate !== constant && candidate.containerFqcn?.toLowerCase() === consumer.declaration.fqcn.toLowerCase()
        && candidate.name === constant.name)) return undefined;
    }
    if (newName && (file.constants.some((candidate) => candidate !== constant && candidate.containerFqcn?.toLowerCase() === constant.containerFqcn!.toLowerCase()
      && candidate.name.toLowerCase() === newName.toLowerCase()) || consumers.some(({ declaration }) => this.members(declaration.fqcn, declaration.fqcn, new Set(), true)
      .some((member) => member.kind === 'constant' && member.name === newName
        && member.fqcn !== constant.fqcn)))) return undefined;
    const escaped = constant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dynamicAccess = /::\s*\{/;
    const stringLookup = new RegExp(`(?:\\bconstant\\s*\\(\\s*|\\bgetConstant\\s*\\(\\s*)(['"])[^'"\\r\\n]*${escaped}\\1`, 'i');
    if ([...this.files.values()].some((candidate) => dynamicAccess.test(candidate.source) || stringLookup.test(candidate.source))) return undefined;
    const locations: SemanticLocation[] = [{ uri: file.uri, start: constant.start, end: constant.end }];
    for (const candidateFile of this.filesForReferenceKeys(memberCandidateKey('constant', constant.name))) for (const access of candidateFile.memberAccesses.filter((item) => item.kind === 'constant'
      && item.name === constant.name)) {
      const resolved = this.memberAt(candidateFile.uri, access.start + 1);
      if (resolved?.kind === 'constant' && resolved.fqcn === constant.fqcn) locations.push({ uri: candidateFile.uri, start: access.start, end: access.end });
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return { uri: file.uri, start: constant.start, end: constant.end, name: constant.name, fqcn: constant.fqcn, locations: unique };
  }

  constantRename(uri: string, offset: number, newName?: string): ConstantRename | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const declared = file.constants.find((item) => offset >= item.start && offset <= item.end);
    if (declared) {
      if (declared.global) return this.globalConstantRename(file, declared, newName);
      if (declared.kind === 'enum-case') return this.enumCaseRename(file, declared, newName);
      return this.fileAndDeclaration(declared.containerFqcn!)?.declaration.kind === 'trait'
        ? this.traitConstantRename(file, declared, newName) : this.classConstantRename(file, declared, newName);
    }
    const member = this.memberAt(uri, offset);
    if (member?.kind === 'constant') {
      const declarationFile = this.files.get(member.uri);
      const constant = declarationFile?.constants.find((item) => !item.global && item.start === member.start && item.end === member.end);
      const result = declarationFile && constant
        ? (constant.kind === 'enum-case' ? this.enumCaseRename(declarationFile, constant, newName)
          : this.fileAndDeclaration(constant.containerFqcn!)?.declaration.kind === 'trait'
          ? this.traitConstantRename(declarationFile, constant, newName) : this.classConstantRename(declarationFile, constant, newName))
        : undefined;
      const access = file.memberAccesses.find((item) => item.kind === 'constant' && offset >= item.start && offset <= item.end);
      return result && access && result.locations.some((location) => location.uri === uri && location.start === access.start && location.end === access.end)
        ? { ...result, uri, start: access.start, end: access.end } : undefined;
    }
    const word = wordAt(file.source, offset); const resolved = word && this.constantAt(uri, offset);
    if (!word || !resolved) return undefined;
    const declarationFile = this.files.get(resolved.uri);
    const constant = declarationFile?.constants.find((item) => item.global && item.start === resolved.start && item.end === resolved.end);
    const result = declarationFile && constant ? this.globalConstantRename(declarationFile, constant, newName) : undefined;
    const start = word.end - resolved.name.length;
    return result && result.locations.some((location) => location.uri === uri && location.start === start && location.end === word.end)
      ? { ...result, uri, start, end: word.end } : undefined;
  }

  localVariableRename(uri: string, offset: number, newName?: string): LocalVariableRename | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const reference = file.variableReferences.find((item) => offset >= item.start && offset <= item.end);
    if (!reference) {
      const argument = file.calls.flatMap((call) => call.arguments).find((item) => item.name && item.nameStart !== undefined && item.nameEnd !== undefined
        && offset >= item.nameStart && offset <= item.nameEnd);
      if (!argument?.name || argument.nameStart === undefined || argument.nameEnd === undefined) return undefined;
      const signature = this.signature(uri, argument.nameStart + 1);
      const parameterIndex = signature?.parameters.findIndex((parameter) => parameter.name === argument.name) ?? -1;
      if (!signature || parameterIndex < 0) return undefined;
      const declarationFile = this.files.get(signature.uri);
      const callable = declarationFile?.callables.find((item) => item.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
      const parameter = callable?.parameters[parameterIndex];
      if (!declarationFile || !callable || !parameter) return undefined;
      if (parameter.promoted) {
        const result = this.propertyRename(declarationFile.uri, parameter.start, newName);
        return result ? { uri, start: argument.nameStart, end: argument.nameEnd, name: argument.name, scopeId: callable.fqcn, locations: result.locations } : undefined;
      }
      const result = this.localVariableRename(declarationFile.uri, parameter.start, newName);
      return result ? { ...result, uri, start: argument.nameStart, end: argument.nameEnd, name: argument.name } : undefined;
    }
    const reserved = new Set(['$this', '$GLOBALS', '$_SERVER', '$_GET', '$_POST', '$_FILES', '$_COOKIE', '$_SESSION', '$_REQUEST', '$_ENV']);
    if (reserved.has(reference.variable)) return undefined;
    const scope = file.scopes.find((item) => item.id === reference.scopeId); if (!scope || (scope.kind !== 'function' && scope.kind !== 'method')) return undefined;
    const parameter = scope.parameters.find((item) => `$${item.name}` === reference.variable);
    const escapedVariable = reference.variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (parameter?.promoted || new RegExp(`\\bglobal\\s+[^;]*${escapedVariable}\\b`).test(file.source.slice(scope.start, scope.end))) return undefined;
    const nested = file.scopes.filter((item) => item !== scope && item.start > scope.start && item.end < scope.end);
    if (nested.some((item) => file.variableReferences.some((itemRef) => itemRef.scopeId === item.id && itemRef.variable === reference.variable))) return undefined;
    const normalized = newName ? `$${newName.replace(/^\$/, '')}` : undefined;
    if (normalized && reserved.has(normalized)) return undefined;
    if (parameter && scope.kind === 'method') {
      const callable = file.callables.find((item) => item.kind === 'method' && item.fqcn === scope.id);
      if (callable && callable.visibility !== 'private') return this.inheritedMethodParameterRename(file, callable, parameter, offset, normalized);
    }
    if (normalized && normalized !== reference.variable && file.variableReferences.some((item) => item.scopeId === scope.id && item.variable === normalized)) return undefined;
    const references = file.variableReferences.filter((item) => item.scopeId === scope.id && item.variable === reference.variable);
    if (!references.length) return undefined;
    const locations = references.map((item) => ({ uri, start: item.start + 1, end: item.end }));
    if (parameter) {
      const callable = file.callables.find((item) => item.fqcn === scope.id);
      if (callable) locations.push(...this.phpDocParameterLocations(file, callable, parameter.name));
      for (const candidate of this.files.values()) {
        for (const call of candidate.calls) {
          const named = call.arguments.filter((argument) => argument.name === parameter.name && argument.nameStart !== undefined && argument.nameEnd !== undefined);
          if (!named.length) continue;
          const signature = this.signature(candidate.uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1));
          if (signature?.fqcn.toLowerCase() !== scope.id.toLowerCase()) continue;
          locations.push(...named.map((argument) => ({ uri: candidate.uri, start: argument.nameStart!, end: argument.nameEnd! })));
        }
      }
    }
    const unique = [...new Map(locations.map((item) => [`${item.uri}:${item.start}:${item.end}`, item])).values()];
    const selected = unique.find((item) => item.uri === uri && offset >= item.start && offset <= item.end) ?? unique[0]!;
    return { uri, start: selected.start, end: selected.end, name: reference.variable.slice(1), scopeId: scope.id, locations: unique };
  }

  private inheritedMethodParameterRename(file: SemanticFile, callable: ParsedCallableDeclaration, parameter: ParsedParameter, offset: number, normalized: string | undefined): LocalVariableRename | undefined {
    if (!callable.containerFqcn || !this.hasCompleteHierarchy(callable.containerFqcn)) return undefined;
    const parameterIndex = callable.parameters.indexOf(parameter); if (parameterIndex < 0) return undefined;
    const candidates = [...this.files.values()].flatMap((ownerFile) => ownerFile.callables.map((item) => ({ file: ownerFile, callable: item })))
      .filter(({ callable: item }) => item.kind === 'method' && item.containerFqcn && item.visibility !== 'private' && item.name.toLowerCase() === callable.name.toLowerCase());
    const family = new Map<string, { file: SemanticFile; callable: ParsedCallableDeclaration }>([[callable.fqcn.toLowerCase(), { file, callable }]]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of candidates) {
        if (family.has(candidate.callable.fqcn.toLowerCase())) continue;
        const related = [...family.values()].some((member) => this.isSubclassOf(candidate.callable.containerFqcn!, member.callable.containerFqcn!)
          || this.isSubclassOf(member.callable.containerFqcn!, candidate.callable.containerFqcn!));
        if (related) { family.set(candidate.callable.fqcn.toLowerCase(), candidate); changed = true; }
      }
    }
    const members = [...family.values()];
    if (members.some((member) => !this.hasCompleteHierarchy(member.callable.containerFqcn!) || !member.callable.parameters[parameterIndex])) return undefined;
    const locations: SemanticLocation[] = [];
    const parameterNames = new Map<string, string>();
    for (const member of members) {
      const candidate = member.callable.parameters[parameterIndex]!; if (candidate.promoted) return undefined;
      const variable = `$${candidate.name}`;
      if (normalized && normalized !== variable && member.file.variableReferences.some((reference) => reference.scopeId === member.callable.fqcn && reference.variable === normalized)) return undefined;
      const nested = member.file.scopes.filter((scope) => scope.parentId === member.callable.fqcn);
      if (nested.some((scope) => member.file.variableReferences.some((reference) => reference.scopeId === scope.id && reference.variable === variable))) return undefined;
      const references = member.file.variableReferences.filter((reference) => reference.scopeId === member.callable.fqcn && reference.variable === variable);
      if (!references.length) return undefined;
      locations.push(...references.map((reference) => ({ uri: member.file.uri, start: reference.start + 1, end: reference.end })));
      locations.push(...this.phpDocParameterLocations(member.file, member.callable, candidate.name));
      parameterNames.set(member.callable.fqcn.toLowerCase(), candidate.name);
    }
    const oldNames = new Set(parameterNames.values());
    for (const candidateFile of this.files.values()) {
      for (const call of candidateFile.calls) {
        if (candidateFile.source.slice(call.nameStart, call.nameEnd).toLowerCase() !== callable.name.toLowerCase()) continue;
        const relevantNamed = call.arguments.filter((argument) => argument.name && oldNames.has(argument.name)); if (!relevantNamed.length) continue;
        const signature = this.signature(candidateFile.uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1));
        if (!signature) return undefined;
        const oldName = parameterNames.get(signature.fqcn.toLowerCase()); if (!oldName) continue;
        if (relevantNamed.some((argument) => argument.name !== oldName)) return undefined;
        locations.push(...call.arguments.filter((argument) => argument.name === oldName && argument.nameStart !== undefined && argument.nameEnd !== undefined)
          .map((argument) => ({ uri: candidateFile.uri, start: argument.nameStart!, end: argument.nameEnd! })));
      }
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    const selected = unique.find((location) => location.uri === file.uri && offset >= location.start && offset <= location.end) ?? unique[0];
    return selected ? { uri: file.uri, start: selected.start, end: selected.end, name: parameter.name, scopeId: callable.fqcn, locations: unique } : undefined;
  }

  private phpDocParameterLocations(file: SemanticFile, callable: ParsedCallableDeclaration, parameterName: string): SemanticLocation[] {
    const range = file.commentRanges.filter((item) => item.end <= callable.declarationStart && file.source.startsWith('/**', item.start))
      .sort((left, right) => right.end - left.end)[0];
    if (!range || !/^[\s]*(?:#\[[\s\S]*?\][\s]*)*$/.test(file.source.slice(range.end, callable.declarationStart))) return [];
    const doc = parsePhpDoc(file.source.slice(range.start, range.end), range.start);
    return doc.tags.filter((tag) => tag.name === 'param' && tag.variable === `$${parameterName}`).flatMap((tag): SemanticLocation[] => {
      const start = file.source.indexOf(`$${parameterName}`, tag.start);
      return start >= tag.start && start + parameterName.length + 1 <= tag.end
        ? [{ uri: file.uri, start: start + 1, end: start + parameterName.length + 1 }]
        : [];
    });
  }

  references(uri: string, offset: number, includeDeclaration = true): SemanticLocation[] {
    const target = this.memberAt(uri, offset) ?? this.memberDeclarationAt(uri, offset);
    if (target) {
      const locations: SemanticLocation[] = includeDeclaration ? [{ uri: target.uri, start: target.start, end: target.end }] : [];
      const marker = target.kind === 'property' && target.static ? '\\$?' : '';
      const pattern = new RegExp(`(?:->|::)\\s*${marker}(${target.name})\\b`, 'gi');
      for (const file of this.filesForReferenceKeys(memberCandidateKey(target.kind === 'function' ? 'method' : target.kind, target.name))) {
        for (const match of file.source.matchAll(pattern)) {
          const relative = match[0].lastIndexOf(match[1]!); const start = match.index + relative;
          const resolved = this.memberAt(file.uri, start + 1);
          if (resolved?.fqcn.toLowerCase() === target.fqcn.toLowerCase()) locations.push({ uri: file.uri, start, end: start + match[1]!.length });
        }
      }
      return locations;
    }
    const callable = this.functionAt(uri, offset);
    if (callable) {
      const locations: SemanticLocation[] = includeDeclaration ? [{ uri: callable.uri, start: callable.start, end: callable.end }] : [];
      for (const file of this.filesForReferenceKeys(`raw-ci:${callable.name.toLowerCase()}`, `import:function:${callable.fqcn.toLowerCase()}`)) {
        for (const imported of file.imports.filter((item) => item.kind === 'function' && item.fqcn.toLowerCase() === callable.fqcn.toLowerCase())) locations.push({ uri: file.uri, start: imported.pathStart, end: imported.pathEnd });
        for (const match of file.source.matchAll(/([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*\(/g)) {
          const start = match.index; const resolved = this.functionAt(file.uri, start + 1);
          if (resolved?.fqcn.toLowerCase() === callable.fqcn.toLowerCase()) locations.push({ uri: file.uri, start, end: start + match[1]!.length });
        }
      }
      return [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    }
    const constant = this.constantAt(uri, offset);
    if (constant) {
      const locations: SemanticLocation[] = includeDeclaration ? [{ uri: constant.uri, start: constant.start, end: constant.end }] : [];
      for (const file of this.filesForReferenceKeys(`raw-cs:${constant.name}`, `import:const:${constant.fqcn}`)) {
        for (const imported of file.imports.filter((item) => item.kind === 'const' && item.fqcn === constant.fqcn)) locations.push({ uri: file.uri, start: imported.pathStart, end: imported.pathEnd });
        for (const raw of file.rawNames) {
          if (this.resolveConstant(file, raw.text, this.namespaceAt(file, raw.start)) === constant.fqcn) locations.push({ uri: file.uri, start: raw.start, end: raw.end });
        }
      }
      return [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    }
    const type = this.typeAt(uri, offset); if (!type) return [];
    const locations: SemanticLocation[] = includeDeclaration ? [{ uri: type.uri, start: type.start, end: type.end }] : [];
    for (const file of this.filesForReferenceKeys(`raw-ci:${type.name.toLowerCase()}`, `import:class:${type.fqcn.toLowerCase()}`)) {
      for (const imported of file.imports.filter((item) => item.kind === 'class' && item.fqcn.toLowerCase() === type.fqcn.toLowerCase())) locations.push({ uri: file.uri, start: imported.pathStart, end: imported.pathEnd });
      for (const raw of file.rawNames) {
        const namespace = this.namespaceAt(file, raw.start);
        if (this.resolveSourceType(file, raw.text, namespace)?.toLowerCase() === type.fqcn.toLowerCase()) locations.push({ uri: file.uri, start: raw.start, end: raw.end });
      }
    }
    return [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
  }

  typeRename(uri: string, offset: number, newName?: string, includePhpDoc = true, preferredDeclarationUri?: string): TypeRename | undefined {
    const file = this.files.get(uri);
    const candidates = this.typeCandidatesAt(uri, offset);
    const matches = preferredDeclarationUri ? candidates.filter((candidate) => candidate.uri === preferredDeclarationUri) : candidates;
    const target = matches.length === 1 ? matches[0] : undefined;
    if (!file || !target) return undefined;
    const selectedDeclaration = file.declarations.find((item) => !item.anonymous && offset >= item.start && offset <= item.end
      && item.fqcn.toLowerCase() === target.fqcn.toLowerCase());
    if (selectedDeclaration && uri !== target.uri) return undefined;
    const selectedImport = file.imports.find((item) => item.kind === 'class' && offset >= item.pathStart && offset <= item.pathEnd
      && item.fqcn.toLowerCase() === target.fqcn.toLowerCase());
    const selectedRaw = file.rawNames.find((item) => offset >= item.start && offset <= item.end
      && this.resolveSourceType(file, item.text, this.namespaceAt(file, item.start), this.containingCallable(file, item.start)?.containerFqcn)?.toLowerCase() === target.fqcn.toLowerCase());
    const finalRange = (end: number, text: string): SemanticLocation | undefined => {
      const slash = text.lastIndexOf('\\'); const part = text.slice(slash + 1);
      return part.toLowerCase() === target.name.toLowerCase()
        ? { uri, start: end - part.length, end }
        : undefined;
    };
    const selected = selectedDeclaration
      ? { uri, start: selectedDeclaration.start, end: selectedDeclaration.end }
      : selectedImport ? finalRange(selectedImport.pathEnd, file.source.slice(selectedImport.pathStart, selectedImport.pathEnd))
        : selectedRaw ? finalRange(selectedRaw.end, selectedRaw.text) : undefined;
    if (!selected || offset < selected.start || offset > selected.end) return undefined;

    if (newName) {
      const namespace = target.fqcn.split('\\').slice(0, -1).join('\\'); const renamedFqcn = namespace ? `${namespace}\\${newName}` : newName;
      if ([...this.files.values()].some((candidate) => candidate.declarations.some((declaration) => !declaration.anonymous
        && declaration.fqcn.toLowerCase() === renamedFqcn.toLowerCase()
        && declaration.fqcn.toLowerCase() !== target.fqcn.toLowerCase()))) return undefined;
      for (const candidate of this.files.values()) {
        const changesVisibleAlias = candidate.imports.some((item) => item.kind === 'class' && !item.explicitAlias
          && item.fqcn.toLowerCase() === target.fqcn.toLowerCase());
        if (changesVisibleAlias && (candidate.imports.some((item) => item.kind === 'class'
          && item.fqcn.toLowerCase() !== target.fqcn.toLowerCase() && item.alias.toLowerCase() === newName.toLowerCase())
          || candidate.declarations.some((declaration) => !declaration.anonymous && declaration.name.toLowerCase() === newName.toLowerCase()))) return undefined;
      }
    }

    const locations: SemanticLocation[] = [{ uri: target.uri, start: target.start, end: target.end }];
    for (const candidate of this.filesForReferenceKeys(`raw-ci:${target.name.toLowerCase()}`, `import:class:${target.fqcn.toLowerCase()}`)) {
      for (const imported of candidate.imports.filter((item) => item.kind === 'class' && item.fqcn.toLowerCase() === target.fqcn.toLowerCase())) {
        const part = imported.fqcn.slice(imported.fqcn.lastIndexOf('\\') + 1);
        if (part.toLowerCase() === target.name.toLowerCase()) locations.push({ uri: candidate.uri, start: imported.pathEnd - part.length, end: imported.pathEnd });
      }
      for (const raw of candidate.rawNames) {
        if (raw.context === 'phpdoc' && !includePhpDoc) continue;
        const resolved = this.resolveSourceType(candidate, raw.text, this.namespaceAt(candidate, raw.start), this.containingCallable(candidate, raw.start)?.containerFqcn);
        const part = raw.text.slice(raw.text.lastIndexOf('\\') + 1);
        if (resolved?.toLowerCase() === target.fqcn.toLowerCase() && part.toLowerCase() === target.name.toLowerCase()) {
          locations.push({ uri: candidate.uri, start: raw.end - part.length, end: raw.end });
        }
      }
    }
    const unique = [...new Map(locations.map((location) => [`${location.uri}:${location.start}:${location.end}`, location])).values()];
    return unique.some((location) => location.uri === uri && location.start === selected.start && location.end === selected.end)
      ? { ...selected, name: target.name, fqcn: target.fqcn, kind: target.kind, declarationUri: target.uri, locations: unique }
      : undefined;
  }

  private memberDeclarationAt(uri: string, offset: number): MemberInfo | undefined {
    const file = this.files.get(uri); if (!file) return undefined;
    const callable = file.callables.find((item) => item.containerFqcn && offset >= item.start && offset <= item.end);
    if (callable?.containerFqcn) return this.members(callable.containerFqcn, callable.containerFqcn).find((item) => item.kind === 'method' && item.uri === uri && item.start === callable.start);
    const property = file.properties.find((item) => offset >= item.start && offset <= item.end);
    if (property) return this.members(property.containerFqcn, property.containerFqcn).find((item) => item.kind === 'property' && item.uri === uri && item.start === property.start);
    const constant = file.constants.find((item) => offset >= item.start && offset <= item.end);
    return constant?.containerFqcn ? this.members(constant.containerFqcn, constant.containerFqcn).find((item) => item.kind === 'constant' && item.uri === uri && item.start === constant.start) : undefined;
  }

  typeAt(uri: string, offset: number): TypeInfo | undefined {
    const matches = this.typeCandidatesAt(uri, offset);
    return matches.length === 1 ? matches[0] : undefined;
  }

  typeCandidatesAt(uri: string, offset: number): TypeInfo[] {
    const file = this.files.get(uri); const word = file && wordAt(file.source, offset); if (!file || !word) return [];
    const declared = file.declarations.find((item) => offset >= item.start && offset <= item.end);
    const imported = file.imports.find((item) => offset >= item.pathStart && offset <= item.pathEnd);
    const fqcn = declared?.fqcn ?? imported?.fqcn ?? this.resolveSourceType(file, word.text, this.namespaceAt(file, offset), this.containingCallable(file, offset)?.containerFqcn);
    if (!fqcn) return [];
    const matches = this.filesForReferenceKeys(`declaration:type:${fqcn.toLowerCase()}`).flatMap((candidate) => candidate.declarations
      .filter((item) => !item.anonymous && item.fqcn.toLowerCase() === fqcn.toLowerCase()).map((declaration) => ({ candidate, declaration })));
    return matches.map(({ candidate, declaration }) => ({ uri: candidate.uri, start: declaration.start, end: declaration.end, name: declaration.name, fqcn: declaration.fqcn, kind: declaration.kind }));
  }

  private namespaceAt(file: SemanticFile, offset: number): string {
    const declaration = file.declarations.find((item) => offset >= item.declarationStart && offset <= item.declarationEnd);
    if (declaration) return declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const callable = this.containingCallable(file, offset);
    return callable ? (callable.containerFqcn ?? callable.fqcn).split('\\').slice(0, -1).join('\\') : file.namespace;
  }

  private withInferredGeneratorReturn(member: MemberInfo): MemberInfo {
    if (member.synthetic || (member.returnType && member.returnType.replace(/^\\/, '').toLowerCase() !== 'generator')) return member;
    const file = this.files.get(member.uri);
    const callable = file?.callables.find((item) => item.fqcn.toLowerCase() === member.fqcn.toLowerCase() && item.start === member.start);
    const returnType = file && callable ? this.inferredGeneratorReturnType(file, callable) : undefined;
    return returnType ? { ...member, returnType } : member;
  }

  signatures(uri: string, offset: number): SignatureInfo[] {
    const file = this.files.get(uri);
    if (!file) return [];
    const before = file.source.slice(0, offset);
    const completeAtCursor = file.source[offset] === ')';
    const namespace = this.namespaceAt(file, offset);
    const accessFrom = this.containingCallable(file, offset)?.containerFqcn ?? this.containingScope(file, offset)?.containerFqcn;
    const dynamicCall = file.memberAccesses.filter((access) => access.dynamic && access.kind === 'method' && access.end <= offset)
      .sort((left, right) => right.end - left.end)
      .map((access) => ({ access, match: /^(?:['"]?\s*}\s*)\(([^()]*)$/.exec(file.source.slice(access.end, offset)) }))
      .find((candidate) => candidate.match);
    if (dynamicCall?.match) {
      const members = this.dynamicAccessMembers(file, dynamicCall.access);
      const argumentsText = dynamicCall.match[1]!;
      const compatible = this.methodCandidatesForArguments(members, argumentsText, completeAtCursor, file, offset - argumentsText.length);
      return (compatible.length ? compatible : members).map((member) => ({ ...member, ...this.signatureContext(argumentsText, member.parameters) }));
    }
    const match = /(\$[A-Za-z_][A-Za-z0-9_]*|[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*(\?->|->|::)\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)$/.exec(before);
    if (match) {
      let target: ObjectClass | undefined;
      if (match[2] === '::') {
        const fqcn = this.resolveSourceType(file, match[1]!, namespace, accessFrom);
        target = fqcn ? { fqcn, nullable: false } : undefined;
      } else target = this.variableClass(file, match[1]!, offset, new Set(), match[2] === '?->');
      const members = target ? this.members(target.fqcn, accessFrom, new Set(), false, target.typeArguments)
        .filter((item) => item.kind === 'method' && this.validAccess(item, match[2] === '::') && item.name.toLowerCase() === match[3]!.toLowerCase()) : [];
      const compatible = this.methodCandidatesForArguments(members, match[4]!, completeAtCursor, file, offset - match[4]!.length);
      return (compatible.length ? compatible : members).map((member) => {
        const inferred = this.withInferredGeneratorReturn(member);
        return { ...inferred, ...this.signatureContext(match[4]!, inferred.parameters) };
      });
    }
    const constructor = /\bnew\s+([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*\(([^()]*)$/.exec(before);
    if (constructor) {
      const fqcn = this.resolveSourceType(file, constructor[1]!, namespace, accessFrom);
      const declaration = fqcn ? this.fileAndDeclaration(fqcn)?.declaration : undefined;
      if (!fqcn || !declaration) return [];
      const candidates = this.constructorsFor(fqcn).filter(({ callable }) => callable.visibility === 'public'
        || accessFrom?.toLowerCase() === callable.containerFqcn?.toLowerCase()).map(({ file: declarationFile, callable: init }): MemberInfo => ({
          kind: 'method', uri: declarationFile.uri, start: init.start, end: init.end, name: declaration.name, fqcn: init.fqcn,
          parameters: init.parameters, returnType: fqcn, visibility: init.visibility, static: false,
          typeScopeFqcn: init.containerFqcn!, calledOnFqcn: fqcn,
        }));
      const compatible = this.methodCandidatesForArguments(candidates, constructor[2]!, completeAtCursor, file, offset - constructor[2]!.length);
      return (compatible.length ? compatible : candidates).map((candidate) => ({
        ...candidate, ...this.signatureContext(constructor[2]!, candidate.parameters),
      }));
    }
    const functionCall = /(?<![\\A-Za-z0-9_\x80-\xff])([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*\(([^()]*)$/.exec(before);
    if (!functionCall || ['if', 'while', 'for', 'switch', 'match', 'isset', 'empty'].includes(functionCall[1]!.toLowerCase())) return [];
    const functionFqcn = this.resolveFunction(file, functionCall[1]!, namespace);
    const members = [...this.files.values()].flatMap((candidate) => candidate.callables.flatMap((item): MemberInfo[] =>
      item.kind === 'function' && item.fqcn.toLowerCase() === functionFqcn?.toLowerCase() ? [{
        kind: 'function', uri: candidate.uri, start: item.start, end: item.end, name: item.name, fqcn: item.fqcn,
        parameters: item.parameters, returnType: item.returnType, nativeReturnType: item.nativeReturnType,
        visibility: 'public', static: false, typeScopeFqcn: item.fqcn, calledOnFqcn: item.fqcn,
      }] : []));
    const compatible = this.methodCandidatesForArguments(members, functionCall[2]!, completeAtCursor, file, offset - functionCall[2]!.length);
    return (compatible.length ? compatible : members).map((candidate) => {
      const member = this.withInferredGeneratorReturn(candidate);
      return { ...member, ...this.signatureContext(functionCall[2]!, member.parameters) };
    });
  }

  signature(uri: string, offset: number): SignatureInfo | undefined {
    const signatures = this.signatures(uri, offset);
    return signatures.length === 1 ? signatures[0] : undefined;
  }

  private completedCallSignature(file: SemanticFile, call: ParsedCall): SignatureInfo | undefined {
    const candidates = this.signatures(file.uri, call.argumentsStart + 1);
    const argumentsText = file.source.slice(call.argumentsStart + 1, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1));
    const selected = this.methodCandidatesForArguments(candidates, argumentsText, true, file, call.argumentsStart + 1);
    if (selected.length !== 1) return undefined;
    return candidates.find((candidate) => candidate.uri === selected[0]!.uri && candidate.start === selected[0]!.start
      && candidate.fqcn.toLowerCase() === selected[0]!.fqcn.toLowerCase());
  }

  private callableBuiltinAttribute(file: SemanticFile, callable: ParsedCallableDeclaration, attributeName: string): {
    reference: ParsedTypeReference;
    message?: string;
    since?: string;
  } | undefined {
    const namespace = callable.containerFqcn?.split('\\').slice(0, -1).join('\\') ?? this.namespaceAt(file, callable.start);
    return this.builtinAttributeMetadata(file, callable.declarationStart, callable.declarationEnd, callable.start,
      namespace, callable.containerFqcn, attributeName);
  }

  private builtinAttributeSubjects(file: SemanticFile, attributeName: string): Array<{
    reference: ParsedTypeReference;
    subjectType: string;
    subjectStart: number;
    subjectEnd: number;
    nativeReturnType?: string;
    delayedValidation: boolean;
  }> {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const root = (retainedTree ?? temporaryTree!).rootNode;
    try {
      const subjects = file.typeReferences.flatMap((reference) => {
        if (reference.context !== 'attribute') return [];
        const containingType = file.declarations.filter((item) => reference.start >= item.declarationStart && reference.end <= item.declarationEnd)
          .sort((left, right) => (left.declarationEnd - left.declarationStart) - (right.declarationEnd - right.declarationStart))[0];
        const ownerFqcn = this.containingCallable(file, reference.start)?.containerFqcn ?? containingType?.fqcn;
        const resolved = this.resolveSourceType(file, file.source.slice(reference.start, reference.end),
          this.namespaceAt(file, reference.start), ownerFqcn)?.toLowerCase();
        let node = deepestLocalSyntax(root, reference.start, reference.end,
          (candidate) => candidate.startIndex === reference.start && candidate.endIndex === reference.end);
        while (node && node.type !== 'attribute_list') node = node.parent ?? undefined;
        const subject = node?.parent;
        return subject ? [{ reference, resolved, subjectType: subject.type,
          subjectStart: subject.startIndex, subjectEnd: subject.endIndex,
          nativeReturnType: subject.childForFieldName('return_type')?.text }] : [];
      });
      return subjects.filter((item) => item.resolved === attributeName.toLowerCase()).map((item) => ({
        reference: item.reference, subjectType: item.subjectType, subjectStart: item.subjectStart, subjectEnd: item.subjectEnd,
        nativeReturnType: item.nativeReturnType,
        delayedValidation: subjects.some((candidate) => candidate.resolved === 'delayedtargetvalidation'
          && candidate.subjectType === item.subjectType && candidate.subjectStart === item.subjectStart && candidate.subjectEnd === item.subjectEnd),
      }));
    } finally { temporaryTree?.delete(); }
  }

  private builtinAttributeMetadata(file: SemanticFile, declarationStart: number, declarationEnd: number, subjectStart: number,
    namespace: string, ownerFqcn: string | undefined, attributeName: string): {
      reference: ParsedTypeReference;
      message?: string;
      since?: string;
    } | undefined {
    const reference = file.typeReferences.find((candidate) => candidate.context === 'attribute'
      && candidate.start >= declarationStart && candidate.end <= declarationEnd
      && this.resolveSourceType(file, file.source.slice(candidate.start, candidate.end), namespace, ownerFqcn)?.toLowerCase() === attributeName.toLowerCase());
    if (!reference) return undefined;
    const suffix = file.source.slice(reference.end, subjectStart);
    const opening = suffix.indexOf('('); let closing = -1;
    if (opening >= 0 && suffix.slice(0, opening).trim() === '') {
      let depth = 1; let quote = ''; let escaped = false;
      for (let index = opening + 1; index < suffix.length && depth > 0; index += 1) {
        const character = suffix[index]!;
        if (quote) {
          if (escaped) escaped = false;
          else if (character === '\\') escaped = true;
          else if (character === quote) quote = '';
        } else if (character === "'" || character === '"') quote = character;
        else if (character === '(') depth += 1;
        else if (character === ')' && --depth === 0) closing = index;
      }
    }
    const arguments_ = closing > opening ? suffix.slice(opening + 1, closing) : '';
    let positional = 0; let message: string | undefined; let since: string | undefined;
    for (const literal of arguments_.matchAll(/(?:(message|since)\s*:\s*)?(["'])([^\\"']*)\2/gi)) {
      const name = literal[1]?.toLowerCase() ?? (positional++ === 0 ? 'message' : 'since');
      if (name === 'message') message = literal[3];
      if (name === 'since') since = literal[3];
    }
    return { reference, message, since };
  }

  private declarationDeprecation(file: SemanticFile, declarationStart: number, declarationEnd: number, subjectStart: number,
    ownerFqcn: string | undefined, attributeMinimumVersion: '8.4' | '8.5'): {
      message?: string;
      since?: string;
      attributeMinimumVersion?: '8.4' | '8.5';
    } | undefined {
    const namespace = ownerFqcn?.split('\\').slice(0, -1).join('\\') ?? this.namespaceAt(file, subjectStart);
    const attribute = this.builtinAttributeMetadata(file, declarationStart, declarationEnd, subjectStart,
      namespace, ownerFqcn, 'deprecated');
    if (attribute) return { message: attribute.message, since: attribute.since, attributeMinimumVersion };
    const tag = adjacentPhpDoc(file, declarationStart)?.tags.find((candidate) => candidate.name === 'deprecated');
    return tag ? { message: tag.description || undefined } : undefined;
  }

  /** Guaranteed expressions containing a call proven to resolve uniquely to native `never`. */
  neverReturningCalls(uri: string): SourceRange[] {
    const file = this.files.get(uri); if (!file) return [];
    const ranges = file.calls.flatMap((call) => {
      return call.terminatingExpression && this.isNativeNeverCall(file, call) ? [call.terminatingExpression] : [];
    });
    return [...new Map(ranges.map((range) => [`${range.start}:${range.end}`, range])).values()];
  }

  private isNativeNeverCall(file: SemanticFile, call: ParsedCall): boolean {
    if (!call.terminatingExpression || call.kind === 'constructor') return false;
    const signature = this.signature(file.uri, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1));
    if (signature?.nativeReturnType?.trim().toLowerCase() !== 'never') return false;
    if (signature.kind === 'function') {
      const declarations = [...this.files.values()].flatMap((candidate) => candidate.callables)
        .filter((candidate) => candidate.kind === 'function' && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
      if (declarations.length !== 1) return false;
    }
    const declarationFile = this.files.get(signature.uri);
    return Boolean(declarationFile && this.callArgumentsCompatible(file, call, signature, declarationFile, signature.templateArguments));
  }

  private methodCandidatesForArguments(candidates: MemberInfo[], argumentsText: string, complete: boolean,
    callerFile?: SemanticFile, argumentsStart?: number): MemberInfo[] {
    const segments: Array<{ text: string; start: number }> = []; let start = 0; let depth = 0; let quote = ''; let escaped = false;
    for (let index = 0; index < argumentsText.length; index += 1) {
      const character = argumentsText[index]!;
      if (escaped) { escaped = false; continue; }
      if (quote) {
        if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === "'" || character === '"') { quote = character; continue; }
      if ('([{'.includes(character)) depth += 1;
      else if (')]}'.includes(character)) depth = Math.max(0, depth - 1);
      else if (character === ',' && depth === 0) { segments.push({ text: argumentsText.slice(start, index), start }); start = index + 1; }
    }
    if (argumentsText.trim() !== '' || segments.length) segments.push({ text: argumentsText.slice(start), start });
    const names = segments.map((segment) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:(?!:)/.exec(segment.text)?.[1]);
    const supplied = segments.length;
    const shaped = candidates.filter((candidate) => {
      const required = candidate.parameters.filter((parameter) => parameter.defaultValue === undefined && !parameter.variadic).length;
      const variadic = candidate.parameters.some((parameter) => parameter.variadic);
      if (complete && supplied < required) return false;
      if (!variadic && supplied > candidate.parameters.length) return false;
      return names.every((name) => !name || candidate.parameters.some((parameter) => parameter.name === name) || variadic);
    });
    if (!callerFile || argumentsStart === undefined || shaped.length < 2) return shaped;
    const actuals = segments.map((segment): PhpType | undefined => {
      const named = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*:(?!:)\s*/.exec(segment.text);
      const raw = named ? segment.text.slice(named[0].length) : segment.text;
      const leading = raw.length - raw.trimStart().length; const trailing = raw.trimEnd().length;
      if (!raw.trim() || (!complete && segment === segments.at(-1) && /[A-Za-z_\\$]$/.test(raw.trim()))) return undefined;
      return this.directScalarLiteralType(raw.trim()) ?? this.provenArgumentType(callerFile, argumentsStart + segment.start + (named?.[0].length ?? 0) + leading,
        argumentsStart + segment.start + (named?.[0].length ?? 0) + trailing);
    });
    if (!actuals.some((actual) => actual && displayType(actual).toLowerCase() !== 'mixed')) return shaped;
    const relation = this.typeRelationContext();
    const ranked = shaped.flatMap((candidate): Array<{ candidate: MemberInfo; score: number }> => {
      const declarationFile = this.files.get(candidate.uri); if (!declarationFile) return [{ candidate, score: 0 }];
      const variadicIndex = candidate.parameters.findIndex((parameter) => parameter.variadic); let positional = 0; let score = 0;
      for (const [index, actual] of actuals.entries()) {
        const parameterIndex = names[index]
          ? candidate.parameters.findIndex((parameter) => parameter.name === names[index])
          : positional < candidate.parameters.length ? positional : variadicIndex;
        if (!names[index] && parameterIndex >= 0 && !candidate.parameters[parameterIndex]?.variadic) positional += 1;
        const parameter = parameterIndex >= 0 ? candidate.parameters[parameterIndex] : undefined;
        if (!actual || displayType(actual).toLowerCase() === 'mixed' || !parameter?.type) continue;
        const documented = parsePhpDocType(parameter.type).type;
        const expected = documented && this.phpDocDiagnosticType(declarationFile, documented, candidate.typeScopeFqcn);
        if (!expected) {
          const genericBase = documented?.kind === 'generic' && documented.base.kind === 'name'
            ? documented.base.name.toLowerCase().replace(/^\\/, '') : undefined;
          if ((actual.kind === 'array' || actual.kind === 'shape' || actual.kind === 'list') && genericBase === 'array') {
            score += 2;
          }
          continue;
        }
        if (expected.kind === 'primitive' && expected.name === 'mixed') continue;
        if (displayType(actual).toLowerCase() === displayType(expected).toLowerCase()) {
          score += actual.kind === 'literal' ? 3 : 2; continue;
        }
        if (actual.kind === 'literal' && expected.kind === 'primitive'
          && ((typeof actual.value === 'string' && expected.name === 'string')
            || (typeof actual.value === 'boolean' && expected.name === 'bool')
            || (typeof actual.value === 'number' && expected.name === (Number.isInteger(actual.value) ? 'int' : 'float')))) {
          score += 2; continue;
        }
        if (actual.kind === 'literal' && expected.kind === 'union'
          && expected.types.some((member) => member.kind === 'literal' && member.value === actual.value)) { score += 3; continue; }
        if ((actual.kind === 'array' || actual.kind === 'shape' || actual.kind === 'list') && expected.kind === 'array') {
          const relationResult = compatibility(actual, expected, relation);
          if (relationResult === 'no') return [];
          score += 2; continue;
        }
        if (compatibility(actual, expected, relation) === 'yes') { score += 1; continue; }
        if (isDirectScalar(actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(callerFile)) continue;
        return [];
      }
      return [{ candidate, score }];
    });
    if (!ranked.length) return shaped;
    const maximum = Math.max(...ranked.map((item) => item.score));
    return ranked.filter((item) => item.score === maximum).map((item) => item.candidate);
  }

  private directScalarLiteralType(expression: string): PhpType | undefined {
    const string = /^'([^'\\]*)'$|^"([^"\\$]*)"$/.exec(expression);
    if (string) return literal(string[1] ?? string[2] ?? '');
    if (/^(?:true|false)$/i.test(expression)) return literal(expression.toLowerCase() === 'true');
    if (/^[+-]?(?:0|[1-9][0-9_]*|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)$/.test(expression)) {
      const normalized = expression.replaceAll('_', ''); const negative = normalized.startsWith('-');
      const unsigned = normalized.replace(/^[+-]/, ''); const value = Number(unsigned) * (negative ? -1 : 1);
      return Number.isSafeInteger(value) ? literal(value) : undefined;
    }
    if (/^[+-]?(?:(?:[0-9][0-9_]*)?\.[0-9][0-9_]*(?:[eE][+-]?[0-9][0-9_]*)?|[0-9][0-9_]*[eE][+-]?[0-9][0-9_]*)$/.test(expression)) {
      const value = Number(expression.replaceAll('_', '')); return Number.isFinite(value) ? literal(value) : undefined;
    }
    return undefined;
  }

  private specializedMagicMethod(file: SemanticFile, member: MemberInfo, argumentsStart: number | undefined): MemberInfo | undefined {
    const templates = member.synthetic === 'phpdoc-magic' ? member.callableTemplates ?? [] : [];
    const referenced = templates.filter((template) => member.returnType
      && new RegExp(`(?<![A-Za-z0-9_\\\\])${template.name}(?![A-Za-z0-9_])`).test(member.returnType));
    if (!referenced.length) return member;
    const call = argumentsStart === undefined ? undefined : file.calls.find((candidate) => candidate.argumentsStart + 1 === argumentsStart);
    const declarationFile = this.files.get(member.uri); if (!call || !declarationFile) return undefined;
    const signature: SignatureInfo = { ...member, activeParameter: 0, usedNamedArguments: [] };
    const inferred = this.callTemplateArguments(file, call, signature, declarationFile, templates);
    const alternatives = inferred?.length ? inferred : [Object.fromEntries(templates.flatMap((template) => template.default ? [[template.name, template.default]] : []))];
    const specialized = alternatives.flatMap((alternative) => referenced.every((template) => alternative[template.name])
      && this.callArgumentsCompatible(file, call, signature, declarationFile, alternative) ? [alternative] : []);
    const unique = new Map(specialized.map((alternative) => [JSON.stringify(alternative), alternative]));
    if (unique.size !== 1) return undefined;
    return { ...member, templateArguments: { ...member.templateArguments, ...[...unique.values()][0]! } };
  }

  private signatureContext(argumentsText: string, parameters: ParsedCallableDeclaration['parameters']): Pick<SignatureInfo, 'activeParameter' | 'namedArgumentPrefix' | 'usedNamedArguments'> {
    const segments = argumentsText.split(','); const current = segments.at(-1) ?? '';
    const currentName = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:(?!:)/.exec(current)?.[1];
    const namedArgumentPrefix = /^\s*([A-Za-z_][A-Za-z0-9_]*)?$/.exec(current)?.[1] ?? (/^\s*$/.test(current) ? '' : undefined);
    const usedNamedArguments = [...argumentsText.matchAll(/(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:(?!:)/g)].map((match) => match[1]!);
    const namedIndex = currentName === undefined ? -1 : parameters.findIndex((parameter) => parameter.name === currentName);
    return { activeParameter: namedIndex >= 0 ? namedIndex : Math.max(0, segments.length - 1), namedArgumentPrefix, usedNamedArguments };
  }

  private resolveFunction(file: SemanticFile, name: string, namespace: string): string {
    const normalized = name.trim();
    if (normalized.startsWith('\\')) return normalized.slice(1);
    if (/^namespace\\/i.test(normalized)) return [namespace, normalized.slice(normalized.indexOf('\\') + 1)].filter(Boolean).join('\\');
    const [head, ...tail] = normalized.split('\\');
    if (tail.length) {
      const importedNamespace = file.imports.find((item) => item.kind === 'class' && item.namespace === namespace
        && item.alias.toLowerCase() === head!.toLowerCase());
      return importedNamespace ? [importedNamespace.fqcn, ...tail].join('\\') : [namespace, normalized].filter(Boolean).join('\\');
    }
    const imported = file.imports.find((item) => item.kind === 'function' && item.namespace === namespace && item.alias.toLowerCase() === normalized.toLowerCase());
    if (imported) return imported.fqcn;
    const namespaced = [namespace, normalized].filter(Boolean).join('\\');
    return this.filesForReferenceKeys(`declaration:function:${namespaced.toLowerCase()}`)
      .some((candidate) => candidate.callables.some((item) => item.kind === 'function' && item.fqcn.toLowerCase() === namespaced.toLowerCase())) ? namespaced : normalized;
  }

  private resolveConstant(file: SemanticFile, name: string, namespace: string): string {
    const normalized = name.trim();
    if (normalized.startsWith('\\')) return normalized.slice(1);
    if (/^namespace\\/i.test(normalized)) return [namespace, normalized.slice(normalized.indexOf('\\') + 1)].filter(Boolean).join('\\');
    const [head, ...tail] = normalized.split('\\');
    if (tail.length) {
      const importedNamespace = file.imports.find((item) => item.kind === 'class' && item.namespace === namespace
        && item.alias.toLowerCase() === head!.toLowerCase());
      return importedNamespace ? [importedNamespace.fqcn, ...tail].join('\\') : [namespace, normalized].filter(Boolean).join('\\');
    }
    const imported = file.imports.find((item) => item.kind === 'const' && item.namespace === namespace && item.alias === normalized);
    if (imported) return imported.fqcn;
    const namespaced = [namespace, normalized].filter(Boolean).join('\\');
    return this.filesForReferenceKeys(`declaration:constant:${namespaced}`)
      .some((candidate) => candidate.constants.some((item) => item.global && item.fqcn === namespaced)) ? namespaced : normalized;
  }

  private fileAndDeclaration(fqcn: string): { file: SemanticFile; declaration: ParsedDeclaration } | undefined {
    for (const file of this.filesForReferenceKeys(`declaration:type:${fqcn.toLowerCase()}`)) {
      const declaration = file.declarations.find((item) => item.fqcn.toLowerCase() === fqcn.toLowerCase()); if (declaration) return { file, declaration };
    }
    return undefined;
  }

  private callableDeclarationsForSignature(signature: Pick<SignatureInfo, 'kind' | 'fqcn' | 'uri' | 'start'>): Array<{ file: SemanticFile; item: ParsedCallableDeclaration }> {
    const matching = [...this.files.values()].flatMap((file) => file.callables.map((item) => ({ file, item })))
      .filter(({ item }) => item.kind === signature.kind && item.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
    const exact = matching.filter(({ file, item }) => file.uri === signature.uri && item.start === signature.start);
    return exact.length === 1 ? exact : matching;
  }

  private constructorFor(fqcn: string, visited = new Set<string>()): { file: SemanticFile; callable: ParsedCallableDeclaration } | undefined {
    return this.constructorsFor(fqcn, visited)[0];
  }

  private constructorsFor(fqcn: string, visited = new Set<string>()): Array<{ file: SemanticFile; callable: ParsedCallableDeclaration }> {
    const key = fqcn.toLowerCase(); if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return []; visited.add(key);
    const owner = this.fileAndDeclaration(fqcn); if (!owner) return [];
    const own = owner.file.callables.filter((item) => item.kind === 'method' && item.containerFqcn?.toLowerCase() === key && item.name.toLowerCase() === '__construct');
    if (own.length) return own.map((callable) => ({ file: owner.file, callable }));
    const parentName = owner.declaration.extendsNames[0]; if (!parentName) return [];
    const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const parent = this.resolveSourceType(owner.file, parentName, namespace, owner.declaration.fqcn);
    return parent ? this.constructorsFor(parent, visited) : [];
  }

  private traitConsumers(traitFqcn: string): Array<{ file: SemanticFile; declaration: ParsedDeclaration }> {
    const consumed = new Set([traitFqcn.toLowerCase()]);
    const direct: Array<{ file: SemanticFile; declaration: ParsedDeclaration }> = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const file of this.files.values()) for (const declaration of file.declarations) {
        if (consumed.has(declaration.fqcn.toLowerCase())) continue;
        const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
        if (!declaration.traitNames.some((name) => {
          const resolved = this.resolveSourceType(file, name, namespace, declaration.fqcn);
          return resolved ? consumed.has(resolved.toLowerCase()) : false;
        })) continue;
        consumed.add(declaration.fqcn.toLowerCase()); direct.push({ file, declaration }); changed = true;
      }
    }
    const all = [...direct];
    for (const file of this.files.values()) for (const declaration of file.declarations) {
      if (consumed.has(declaration.fqcn.toLowerCase())) continue;
      if (direct.some((consumer) => this.isSubclassOf(declaration.fqcn, consumer.declaration.fqcn))) {
        consumed.add(declaration.fqcn.toLowerCase()); all.push({ file, declaration });
      }
    }
    return all;
  }

  private hasCompleteHierarchy(fqcn: string, visited = new Set<string>()): boolean {
    const key = fqcn.toLowerCase(); if (visited.has(key)) return true;
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return false;
    visited.add(key);
    const owner = this.fileAndDeclaration(fqcn); if (!owner) return false;
    const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
    return [...owner.declaration.extendsNames, ...owner.declaration.implementsNames, ...owner.declaration.traitNames].every((name) => {
      const inherited = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
      return Boolean(inherited && this.hasCompleteHierarchy(inherited, visited));
    });
  }

  private concreteMethodNames(fqcn: string, visited = new Set<string>()): Set<string> | undefined {
    const key = fqcn.toLowerCase(); if (visited.has(key)) return new Set();
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return undefined;
    visited.add(key);
    const owner = this.fileAndDeclaration(fqcn); if (!owner || owner.declaration.kind === 'interface') return undefined;
    const names = new Set(owner.file.callables.filter((item) => item.containerFqcn?.toLowerCase() === key
      && !/\babstract\b/i.test(owner.file.source.slice(item.declarationStart, item.start))).map((item) => item.name.toLowerCase()));
    const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
    for (const inheritedName of [...owner.declaration.extendsNames, ...owner.declaration.traitNames]) {
      const inherited = this.resolveSourceType(owner.file, inheritedName, namespace, owner.declaration.fqcn); if (!inherited) return undefined;
      const inheritedNames = this.concreteMethodNames(inherited, visited); if (!inheritedNames) return undefined;
      for (const name of inheritedNames) names.add(name);
    }
    return names;
  }

  private dynamicCallFor(file: SemanticFile, call: ParsedCall): { access: ParsedMemberAccess; name: string } | undefined {
    const access = file.memberAccesses.find((candidate) => candidate.dynamic && candidate.kind === 'method'
      && candidate.start >= call.nameStart && candidate.end <= call.nameEnd);
    const name = access && this.dynamicAccessName(file, access);
    return access && name ? { access, name } : undefined;
  }

  private dynamicCallResultType(file: SemanticFile, call: ParsedCall): PhpType | undefined {
    const dynamic = this.dynamicCallFor(file, call); if (!dynamic) return undefined;
    const argumentsText = file.source.slice(call.argumentsStart + 1, Math.max(call.argumentsStart + 1, call.argumentsEnd - 1));
    const selected = this.methodCandidatesForArguments(this.dynamicAccessMembers(file, dynamic.access), argumentsText, true, file, call.argumentsStart + 1);
    if (selected.length !== 1) return undefined;
    const member = this.specializedMagicMethod(file, selected[0]!, call.argumentsStart + 1); if (!member) return undefined;
    const declarationFile = this.files.get(member.uri); if (!declarationFile) return undefined;
    const signature: SignatureInfo = { ...member, activeParameter: 0, usedNamedArguments: [] };
    if (!this.callArgumentsCompatible(file, call, signature, declarationFile, member.templateArguments)) return undefined;
    const literalArgument = this.literalStringArgument(argumentsText);
    const literalReturn = literalArgument === undefined ? undefined
      : this.literalMethodReturnClass(member.calledOnFqcn, member.name, literalArgument);
    let result = literalReturn ? named(literalReturn.fqcn) : this.memberDiagnosticType(member);
    if (!result) return undefined;
    if (dynamic.access.receiver?.kind === 'variable' && dynamic.access.receiver.nullsafe) {
      const receiver = this.variableClass(file, dynamic.access.receiver.name, call.start, new Set(), true);
      if (!receiver) return undefined;
      if (receiver.nullable) result = nullable(result);
    }
    return result;
  }

  private dynamicCallMemberTarget(file: SemanticFile, offset: number): MemberTarget | undefined {
    const accessFrom = this.containingCallable(file, offset)?.containerFqcn ?? this.containingScope(file, offset)?.containerFqcn;
    const candidates = file.calls.filter((call) => call.end <= offset && this.dynamicCallFor(file, call))
      .sort((left, right) => right.end - left.end);
    for (const call of candidates) {
      const suffix = file.source.slice(call.end, offset);
      const tail = /^((?:\s*(?:\?->|->)\s*[A-Za-z_][A-Za-z0-9_]*(?:\s*\((?:[^()]|\([^()]*\))*\))?)*)\s*(\?->|->)\s*([A-Za-z_][A-Za-z0-9_]*)?$/.exec(suffix);
      if (!tail) continue;
      const result = this.dynamicCallResultType(file, call); if (!result) continue;
      const object = this.objectType(displayType(result), true); if (!object) continue;
      const fqcn = this.resolveType(file, object.name, this.namespaceAt(file, call.start), accessFrom); if (!fqcn) continue;
      const typeArguments = this.templateArgumentsFor(fqcn, object.arguments, file, this.namespaceAt(file, call.start), accessFrom);
      if (object.arguments.length && !typeArguments) continue;
      let target: ObjectClass = { fqcn, nullable: object.nullable, typeArguments };
      const tailStart = call.end;
      const steps = [...tail[1]!.matchAll(/(\?->|->)\s*([A-Za-z_][A-Za-z0-9_]*)(\s*\((?:[^()]|\([^()]*\))*\))?/g)].map((match) => ({
        operator: match[1]!, name: match[2]!, kind: match[3] ? 'method' as const : 'property' as const,
        argumentsText: match[3]?.slice(1, -1),
        argumentsStart: match[3] ? tailStart + match.index! + match[0].indexOf('(') + 1 : undefined,
      }));
      let valid = true;
      for (const step of steps) {
        if (target.nullable && step.operator !== '?->') { valid = false; break; }
        const namedCandidates = this.members(target.fqcn, accessFrom, new Set(), false, target.typeArguments)
          .filter((item) => item.kind === step.kind && !item.static && item.name.toLowerCase() === step.name.toLowerCase() && this.validAccess(item, false));
        const selected = step.kind === 'method'
          ? this.methodCandidatesForArguments(namedCandidates, step.argumentsText ?? '', true, file, step.argumentsStart) : namedCandidates;
        const member = selected.length === 1 ? this.specializedMagicMethod(file, selected[0]!, step.argumentsStart) : undefined;
        const returned = member && this.memberReturnClass(member, true);
        if (!returned) { valid = false; break; }
        target = { ...returned, nullable: returned.nullable || (target.nullable && step.operator === '?->') };
      }
      if (valid && (!target.nullable || tail[2] === '?->')) return {
        fqcn: target.fqcn, member: tail[3] ?? '', accessFrom, static: false, typeArguments: target.typeArguments,
      };
    }
    return undefined;
  }

  private memberTarget(uri: string, offset: number): MemberTarget | undefined {
    const file = this.files.get(uri);
    if (!file) return undefined;
    const before = file.source.slice(0, offset);
    const dynamicTarget = this.dynamicCallMemberTarget(file, offset);
    if (dynamicTarget) return dynamicTarget;
    const staticChain = /([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*::\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(((?:[^()]|\([^()]*\))*)\)((?:\s*(?:\?->|->)\s*[A-Za-z_][A-Za-z0-9_]*(?:\s*\((?:[^()]|\([^()]*\))*\))?)*)\s*(\?->|->)\s*([A-Za-z_][A-Za-z0-9_]*)?$/.exec(before);
    const chained = /(\$[A-Za-z_][A-Za-z0-9_]*)((?:\s*\[\s*(?:'[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*'|"[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*"|-?(?:0|[1-9][0-9]*))\s*\]){0,16})((?:\s*(?:\?->|->)\s*[A-Za-z_][A-Za-z0-9_]*(?:\s*\((?:[^()]|\([^()]*\))*\))?)*)\s*(\?->|->)\s*([A-Za-z_][A-Za-z0-9_]*)?$/.exec(before);
    const accessFrom = this.containingCallable(file, offset)?.containerFqcn ?? this.containingScope(file, offset)?.containerFqcn;
    const lexicalScope = this.containingScope(file, offset);
    if (staticChain) {
      const namespace = accessFrom?.split('\\').slice(0, -1).join('\\') ?? file.namespace;
      const owner = this.resolveSourceType(file, staticChain[1]!, namespace, accessFrom);
      const initialCandidates = owner ? this.members(owner, accessFrom).filter((item) => item.kind === 'method' && item.static
        && item.name.toLowerCase() === staticChain[2]!.toLowerCase() && this.validAccess(item, true)) : [];
      const initialArgumentsStart = staticChain.index! + staticChain[0].indexOf('(') + 1;
      const selectedInitial = this.methodCandidatesForArguments(initialCandidates, staticChain[3]!, true, file, initialArgumentsStart);
      const rawInitial: MemberInfo | undefined = selectedInitial.length === 1 ? selectedInitial[0] : undefined;
      const initial = rawInitial && this.specializedMagicMethod(file, rawInitial, initialArgumentsStart);
      let target: ObjectClass | undefined = initial ? this.memberReturnClass(initial, true) : undefined;
      if (!target) return undefined;
      const staticTailStart = staticChain.index! + staticChain[0].indexOf(staticChain[4]!);
      const calls = [...staticChain[4]!.matchAll(/(\?->|->)\s*([A-Za-z_][A-Za-z0-9_]*)(\s*\((?:[^()]|\([^()]*\))*\))?/g)].map((match) => ({
        operator: match[1]!, name: match[2]!, kind: match[3] ? 'method' as const : 'property' as const,
        argumentsText: match[3]?.slice(1, -1),
        argumentsStart: match[3] ? staticTailStart + match.index! + match[0].indexOf('(') + 1 : undefined,
      }));
      for (const call of calls) {
        if (target.nullable && call.operator !== '?->') return undefined;
        const namedCandidates: MemberInfo[] = this.members(target.fqcn, accessFrom, new Set(), false, target.typeArguments)
          .filter((item) => item.kind === call.kind && !item.static && item.name.toLowerCase() === call.name.toLowerCase() && this.validAccess(item, false));
        const selected: MemberInfo[] = call.kind === 'method'
          ? this.methodCandidatesForArguments(namedCandidates, call.argumentsText ?? '', true, file, call.argumentsStart) : namedCandidates;
        const rawMember: MemberInfo | undefined = selected.length === 1 ? selected[0] : undefined;
        const member = rawMember && this.specializedMagicMethod(file, rawMember, call.argumentsStart);
        const returned: ObjectClass | undefined = member ? this.memberReturnClass(member, true) : undefined;
        if (!returned) return undefined;
        target = { ...returned, nullable: returned.nullable || (target.nullable && call.operator === '?->') };
      }
      if (target.nullable && staticChain[5] !== '?->') return undefined;
      return { fqcn: target.fqcn, member: staticChain[6] ?? '', accessFrom, static: false, typeArguments: target.typeArguments };
    }
    if (chained) {
      const chainStart = chained.index! + chained[0].indexOf(chained[3]!);
      const calls = [...chained[3]!.matchAll(/(\?->|->)\s*([A-Za-z_][A-Za-z0-9_]*)(\s*\((?:[^()]|\([^()]*\))*\))?/g)].map((match) => ({
        operator: match[1]!, name: match[2]!, kind: match[3] ? 'method' as const : 'property' as const,
        argumentsText: match[3]?.slice(1, -1),
        argumentsStart: match[3] ? chainStart + match.index! + match[0].indexOf('(') + 1 : undefined,
        callback: match[3] ? this.callbackSignature(match[3].slice(1, -1)) : undefined,
        literalArgument: match[3] ? this.literalStringArgument(match[3].slice(1, -1)) : undefined,
      }));
      const finalOperator = chained[4]!; const allowNullable = (calls[0]?.operator ?? finalOperator) === '?->';
      const arrayElement = this.directArrayElement(`${chained[1]!}${chained[2]!}`);
      let target: ObjectClass | undefined = !arrayElement
        ? this.variableClass(file, chained[1]!, offset, new Set(), allowNullable)
        : this.variableShapeElementClass(file, chained[1]!, arrayElement.path, offset, allowNullable);
      let groups: ObjectClass[][] | undefined = target?.groups;
      if (!target && !arrayElement && lexicalScope) {
        const assertedComposite = this.assertedTargetClass(file, chained[1]!, [], offset, lexicalScope, true);
        if (assertedComposite?.groups) { target = assertedComposite; groups = assertedComposite.groups; }
      }
      if (!target && !arrayElement) {
        const composite = this.variableObjectGroups(file, chained[1]!, offset);
        if (composite && (!composite.nullable || allowNullable)) {
          groups = composite.groups;
          const first = groups[0]?.[0]; target = first ? { ...first, nullable: composite.nullable } : undefined;
        }
      }
      if (!target) return undefined;
      let directPropertyPath: string[] | undefined = [];
      for (const call of calls) {
        const current: ObjectClass = target; if (current.nullable && call.operator !== '?->') return undefined;
        const candidates: MemberInfo[] = groups ? this.targetMembers({ fqcn: current.fqcn, member: call.name, accessFrom, static: false, groups })
          : this.members(current.fqcn, accessFrom, new Set(), false, current.typeArguments).filter((item) => this.validAccess(item, false));
        const namedCandidates: MemberInfo[] = candidates.filter((item) => item.kind === call.kind && !item.static && item.name.toLowerCase() === call.name.toLowerCase());
        const selected: MemberInfo[] = call.kind === 'method'
          ? this.methodCandidatesForArguments(namedCandidates, call.argumentsText ?? '', true, file, call.argumentsStart) : namedCandidates;
        const rawMember: MemberInfo | undefined = selected.length === 1 ? selected[0] : undefined;
        const member = rawMember && this.specializedMagicMethod(file, rawMember, call.argumentsStart);
        if (directPropertyPath && call.kind === 'property') directPropertyPath.push(call.name);
        else directPropertyPath = undefined;
        const propertyFlow = directPropertyPath && member && lexicalScope
          ? this.propertyFlowNarrowedType(file, chained[1]!, directPropertyPath, offset, lexicalScope, this.memberDiagnosticType(member))
          : { applied: false };
        if (propertyFlow.applied) {
          const composite = propertyFlow.type && this.objectGroups(propertyFlow.type);
          const first = composite?.groups[0]?.[0]; if (!composite || !first) return undefined;
          target = { ...first, nullable: composite.nullable }; groups = composite.groups; continue;
        }
        const assertedProperty = directPropertyPath && member && lexicalScope
          ? this.assertedPropertyPathClass(file, chained[1]!, directPropertyPath, offset, lexicalScope, true) : undefined;
        if (assertedProperty) { target = assertedProperty; groups = assertedProperty.groups; continue; }
        const methodArguments: Record<string, string> | undefined = member && call.callback ? this.methodTemplateArguments(file, offset, member, call.callback) : undefined;
        const compositeReturn = member && call.literalArgument === undefined
          ? groups ? this.commonMemberReturnGroups(groups, member, accessFrom) : this.memberReturnGroups(member)
          : undefined;
        const returned: ObjectClass | undefined = member && call.literalArgument !== undefined
          ? this.literalMethodReturnClass(current.fqcn, member.name, call.literalArgument)
            ?? this.memberReturnClass({ ...member, templateArguments: { ...member.templateArguments, ...methodArguments } }, true)
          : member ? this.memberReturnClass({ ...member, templateArguments: { ...member.templateArguments, ...methodArguments } }, true) : undefined;
        if (!returned && !compositeReturn) return undefined;
        if (compositeReturn) {
          const first = compositeReturn.groups[0]?.[0]; if (!first) return undefined;
          target = { ...first, nullable: compositeReturn.nullable || (current.nullable && call.operator === '?->') };
          groups = compositeReturn.groups;
          continue;
        }
        if (!returned) return undefined;
        target = { ...returned, nullable: returned.nullable || (current.nullable && call.operator === '?->') };
        groups = undefined;
      }
      if (target.nullable && finalOperator !== '?->') return undefined;
      return { fqcn: target.fqcn, member: chained[5] ?? '', accessFrom, static: false, typeArguments: target.typeArguments, groups };
    }
    const staticAccess = /([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*::\s*\$?([A-Za-z_][A-Za-z0-9_]*)?$/.exec(before);
    if (!staticAccess) return undefined;
    const namespace = accessFrom?.split('\\').slice(0, -1).join('\\') ?? file.namespace;
    const fqcn = this.resolveSourceType(file, staticAccess[1]!, namespace, accessFrom);
    return fqcn ? { fqcn, member: staticAccess[2] ?? '', accessFrom, static: true } : undefined;
  }

  private assignmentInsideControlFlow(file: SemanticFile, assignment: ParsedAssignment, scope: ParsedScope): boolean {
    return assignment.scopeId === scope.id && Boolean(this.controlFlowAssignments.get(file.uri)?.has(assignment.start));
  }

  private variableObjectGroups(file: SemanticFile, variable: string, offset: number, visited = new Set<string>()): { groups: ObjectClass[][]; nullable: boolean } | undefined {
    const scope = this.containingScope(file, offset); if (!scope) return undefined;
    const visitKey = `${scope.id}:${variable}:${offset}`;
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(visitKey)) return undefined; visited.add(visitKey);
    const assignment = file.assignments.filter((item) => item.scopeId === scope.id && item.variable === variable && item.end <= offset
      && (!item.validRange || (offset >= item.validRange.start && offset <= item.validRange.end))).sort((left, right) => right.end - left.end)[0];
    const standalone = this.standaloneLocalVariableAnnotationType(file, variable, offset, scope);
    if (standalone) {
      const composite = this.objectGroups(standalone);
      if (composite?.groups.length && composite.groups.flat().every((candidate) => this.hasCompleteHierarchy(candidate.fqcn))) return composite;
    }
    const annotated = assignment && this.localVariableAnnotationType(file, assignment, scope);
    if (annotated) {
      const composite = this.objectGroups(annotated);
      if (composite?.groups.length && composite.groups.flat().every((candidate) => this.hasCompleteHierarchy(candidate.fqcn))) return composite;
    }
    const nativeAssertion = this.nativeAssertVariableType(file, variable, offset, scope);
    if (nativeAssertion.applied) {
      const composite = nativeAssertion.type && this.objectGroups(nativeAssertion.type);
      return composite?.groups.length && composite.groups.flat().every((candidate) => this.hasCompleteHierarchy(candidate.fqcn))
        ? composite : undefined;
    }
    const booleanLiteral = this.booleanLiteralVariableType(file, variable, offset, scope);
    if (booleanLiteral.applied) {
      const composite = booleanLiteral.type && this.objectGroups(booleanLiteral.type);
      return composite?.groups.length && composite.groups.flat().every((candidate) => this.hasCompleteHierarchy(candidate.fqcn))
        ? composite : undefined;
    }
    const narrowing = file.narrowings.filter((item) => item.scopeId === scope.id && item.variable === variable
      && !item.propertyPath?.length && !item.arrayPath?.length && offset >= item.start && offset <= item.end
      && this.variableFlowFactStable(file, item, offset, scope))
      .sort((left, right) => left.end - left.start - (right.end - right.start))[0];
    if (narrowing?.kind === 'instanceof') {
      const fqcn = this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn);
      return fqcn && this.fileAndDeclaration(fqcn)
        ? { groups: [[{ fqcn, nullable: false }]], nullable: false } : undefined;
    }
    const assignmentInsideControlFlow = Boolean(assignment && this.assignmentInsideControlFlow(file, assignment, scope));
    const hasLaterAssignment = Boolean(assignment && file.assignments.some((candidate) => candidate.scopeId === scope.id
      && candidate.variable === variable && candidate.start > assignment.start && candidate.end <= offset
      && this.controlFlowAssignments.get(file.uri)?.has(candidate.start)));
    const declarativeAssignment = Boolean(assignment && (assignment.sourceIterable || assignment.typeNames
      || file.source.slice(assignment.start, assignment.end).trim() === variable));
    if (!declarativeAssignment && (assignmentInsideControlFlow || hasLaterAssignment)) {
      const inferred = this.linearLocalValueType(file, variable, offset, true);
      const composite = inferred && this.objectGroups(inferred);
      if (composite?.groups.length && composite.groups.flat().every((candidate) => this.hasCompleteHierarchy(candidate.fqcn))) return composite;
      return undefined;
    }
    if (assignment?.typeNames) {
      const groups = assignment.typeNames.map((typeName) => this.resolveSourceType(file, typeName, this.namespaceAt(file, assignment.start), scope.containerFqcn))
        .map((fqcn) => fqcn ? [{ fqcn, nullable: false }] : []);
      return groups.every((group) => group[0] && this.hasCompleteHierarchy(group[0].fqcn)) ? { groups, nullable: false } : undefined;
    }
    if (assignment?.sourceVariable) return this.variableObjectGroups(file, assignment.sourceVariable, assignment.start, visited);
    if (assignment?.sourceCall) {
      const call = file.calls.filter((candidate) => candidate.start >= assignment.start && candidate.end <= assignment.end)
        .sort((left, right) => right.end - right.start - (left.end - left.start))[0];
      const result = call
        ? this.callResultType(file, call.start, call.end) ?? this.callableVariableResultType(file, call.start, call.end)
        : assignment.sourceCall.kind === 'callable-variable' ? this.callableVariableResultType(file, assignment.start, assignment.end) : undefined;
      const composite = result && this.objectGroups(result);
      if (composite?.groups.length && composite.groups.flat().every((variant) => this.hasCompleteHierarchy(variant.fqcn))) return composite;
    }
    if (assignment?.sourceCall?.kind === 'function') {
      const fqfn = this.resolveFunction(file, assignment.sourceCall.name, this.namespaceAt(file, assignment.start));
      const matches = [...this.files.values()].flatMap((candidate) => candidate.callables.map((item) => ({ file: candidate, item })))
        .filter(({ item }) => item.kind === 'function' && item.fqcn.toLowerCase() === fqfn.toLowerCase());
      const found = matches.length === 1 ? matches[0] : undefined;
      const type = found?.item.nativeReturnType ? this.nativeSourceType(found.file, found.item.nativeReturnType, found.item.fqcn) : undefined;
      const result = type && this.objectGroups(type);
      return result?.groups.length && result.groups.flat().every((variant) => this.hasCompleteHierarchy(variant.fqcn)) ? result : undefined;
    }
    if (assignment?.sourceCall?.kind === 'static') {
      const sourceCall = assignment.sourceCall; const namespace = this.namespaceAt(file, assignment.start);
      const owner = this.resolveSourceType(file, sourceCall.typeName, namespace, scope.containerFqcn);
      const member = owner && this.members(owner, scope.containerFqcn).find((item) => item.kind === 'method' && item.static && item.name.toLowerCase() === sourceCall.method.toLowerCase());
      return member ? this.memberReturnGroups(member) : undefined;
    }
    if (assignment?.sourceCall?.kind === 'member') {
      const sourceCall = assignment.sourceCall;
      if (sourceCall.dynamic) return undefined;
      const owner = this.variableClass(file, sourceCall.variable, assignment.start, new Set(visited));
      if (owner) {
        const member = this.members(owner.fqcn, scope.containerFqcn, new Set(), false, owner.typeArguments)
          .find((item) => item.kind === 'method' && !item.static && item.name.toLowerCase() === sourceCall.method.toLowerCase());
        const methodArguments = member && sourceCall.callback ? this.methodTemplateArguments(file, assignment.start, member, sourceCall.callback) : undefined;
        return member ? this.memberReturnGroups({ ...member, templateArguments: { ...member.templateArguments, ...methodArguments } }) : undefined;
      }
      if (sourceCall.callback || sourceCall.literalArgument !== undefined) return undefined;
      const composite = this.variableObjectGroups(file, sourceCall.variable, assignment.start, new Set(visited)); const first = composite?.groups[0]?.[0];
      if (!composite || composite.nullable || !first) return undefined;
      const member = this.targetMembers({ fqcn: first.fqcn, member: sourceCall.method, accessFrom: scope.containerFqcn, static: false, groups: composite.groups })
        .find((item) => item.kind === 'method' && !item.static && item.name.toLowerCase() === sourceCall.method.toLowerCase());
      return member ? this.commonMemberReturnGroups(composite.groups, member, scope.containerFqcn) : undefined;
    }
    if (assignment) {
      const inferred = this.linearLocalValueType(file, variable, offset, true);
      const composite = inferred && this.objectGroups(inferred);
      return composite?.groups.length && composite.groups.flat().every((candidate) => this.hasCompleteHierarchy(candidate.fqcn))
        ? composite : undefined;
    }
    const parameter = scope.parameters.find((item) => `$${item.name}` === variable);
    if (narrowing) {
      if ((narrowing.kind !== 'type-predicate' && narrowing.kind !== 'subclass-predicate') || !parameter) return undefined;
      const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
      if (this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset)).toLowerCase() !== builtin) return undefined;
      const documented = parameter.type ? parsePhpDocType(parameter.type).type : undefined;
      const declared = documented ? this.phpDocDiagnosticType(file, documented, scope.containerFqcn ?? scope.id)
        : parameter.nativeType ? this.nativeSourceType(file, parameter.nativeType, scope.containerFqcn) : undefined;
      if (!declared) return undefined;
      const candidates = declared.kind === 'union' ? declared.types : [declared];
      let retained: PhpType[];
      if (narrowing.kind === 'type-predicate' && narrowing.typeName.toLowerCase() === 'object') {
        retained = candidates.filter((candidate) => {
          const matches = Boolean(this.objectGroups(candidate)?.groups.length);
          return narrowing.negated ? !matches : matches;
        });
      } else {
        const targetName = narrowing.kind === 'subclass-predicate'
          ? this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn) : undefined;
        if (narrowing.kind === 'subclass-predicate' && (!targetName || !this.fileAndDeclaration(targetName))) return undefined;
        const parsedTarget = narrowing.kind === 'type-predicate' ? parsePhpDocType(narrowing.typeName).type : undefined;
        const target = targetName ? named(targetName)
          : parsedTarget ? this.phpDocDiagnosticType(file, parsedTarget, scope.containerFqcn ?? scope.id) : undefined;
        if (!target) return undefined;
        if (narrowing.negated && candidates.some((candidate) => narrowing.kind === 'subclass-predicate'
          ? candidate.kind === 'named' ? !this.hasCompleteHierarchy(candidate.name)
            : ['generic', 'intersection', 'unknown'].includes(candidate.kind)
          : compatibility(candidate, target, this.typeRelationContext()) === 'unknown')) return undefined;
        retained = candidates.flatMap((candidate): PhpType[] => {
          if (narrowing.kind === 'subclass-predicate') {
            const matches = candidate.kind === 'named' && this.hasCompleteHierarchy(candidate.name)
              && candidate.name.toLowerCase() !== targetName!.toLowerCase() && this.isSubclassOf(candidate.name, targetName!);
            return narrowing.negated ? matches ? [] : [candidate] : matches ? [candidate] : [];
          }
          const matches = compatibility(candidate, target, this.typeRelationContext());
          if (narrowing.negated) return matches === 'no' ? [candidate] : [];
          if (matches === 'yes') return [candidate];
          return compatibility(target, candidate, this.typeRelationContext()) === 'yes' ? [target] : [];
        });
      }
      const narrowed = retained.length ? union(...retained) : undefined;
      const result = narrowed && this.objectGroups(narrowed);
      return result?.groups.length && result.groups.flat().every((variant) => this.hasCompleteHierarchy(variant.fqcn)) ? result : undefined;
    }
    if (!parameter?.nativeType) return undefined;
    const type = this.nativeSourceType(file, parameter.nativeType, scope.containerFqcn);
    const result = this.objectGroups(type);
    return result?.groups.length && result.groups.flat().every((variant) => this.hasCompleteHierarchy(variant.fqcn)) ? result : undefined;
  }

  private objectGroups(item: PhpType): { groups: ObjectClass[][]; nullable: boolean } | undefined {
    if (item.kind === 'named') return { groups: [[{ fqcn: item.name, nullable: false }]], nullable: false };
    if (item.kind === 'generic' && item.base.kind === 'named') {
      const baseName = item.base.name; const owner = this.fileAndDeclaration(baseName);
      const templates = owner?.file.templates.filter((template) => template.ownerFqcn.toLowerCase() === baseName.toLowerCase()) ?? [];
      if (!owner || templates.length !== item.arguments.length) return undefined;
      const typeArguments = Object.fromEntries(templates.map((template, index) => [template.name, displayType(item.arguments[index]!) ]));
      return { groups: [[{ fqcn: baseName, nullable: false, typeArguments }]], nullable: false };
    }
    if (item.kind === 'primitive' && item.name === 'null') return { groups: [], nullable: true };
    if (item.kind === 'union') {
      const parts = item.types.map((type) => this.objectGroups(type)); if (parts.some((part) => !part)) return undefined;
      return { groups: parts.flatMap((part) => part!.groups), nullable: parts.some((part) => part!.nullable) };
    }
    if (item.kind === 'intersection') {
      const parts = item.types.map((type) => this.objectGroups(type)); if (parts.some((part) => !part || part!.nullable || part!.groups.length !== 1)) return undefined;
      return { groups: [[...new Map(parts.flatMap((part) => part!.groups[0]!).map((variant) => [variant.fqcn.toLowerCase(), variant])).values()]], nullable: false };
    }
    return undefined;
  }

  private localVariableAnnotationType(file: SemanticFile, assignment: ParsedAssignment, scope: ParsedScope): PhpType | undefined {
    const doc = adjacentPhpDoc(file, assignment.start);
    if (!doc || doc.errors.length) return undefined;
    const tag = preferredDocTags(doc,
      (candidate) => candidate.name === 'var' && candidate.variable === assignment.variable && Boolean(candidate.type),
      () => assignment.variable).at(-1);
    return tag?.type ? this.phpDocDiagnosticType(file, tag.type, scope.containerFqcn ?? scope.id) : undefined;
  }

  private variableFlowFactStable(file: SemanticFile, narrowing: ParsedTypeNarrowing,
    offset: number, scope: ParsedScope): boolean {
    if (narrowing.propertyPath?.length || narrowing.arrayPath?.length) return false;
    const variable = narrowing.variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inspectionRanges = this.flowFactInspectionRanges(narrowing, offset);
    const between = inspectionRanges.map((range) => file.source.slice(range.start, range.end)).join('\n');
    const mutation = new RegExp(`(?:${variable}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${variable}|unset\\s*\\(\\s*${variable}\\s*\\)|foreach\\s*\\([^)]*\\bas\\s+&\\s*${variable})`, 'iu');
    if (mutation.test(between)
      || new RegExp(`(?:=&\\s*${variable}|&\\s*${variable}\\s*=)`, 'u').test(between)) return false;
    return !inspectionRanges.some((range) => this.priorReferenceMutations(file, scope, narrowing.variable, range.end, range.start).length);
  }

  private flowFactInspectionRanges(narrowing: ParsedTypeNarrowing, offset: number): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    const inspectionStart = narrowing.inspectionStart ?? narrowing.start;
    const inspectionEnd = narrowing.inspectionEnd ?? narrowing.start;
    if (inspectionEnd > inspectionStart) ranges.push({ start: inspectionStart, end: inspectionEnd });
    if (offset > narrowing.start) ranges.push({ start: narrowing.start, end: offset });
    return ranges;
  }

  private applyDirectFlowNarrowings(file: SemanticFile, narrowings: ParsedTypeNarrowing[],
    base: PhpType | undefined, offset: number, scope: ParsedScope): PhpType | undefined {
    let narrowed = base;
    for (const narrowing of narrowings) {
      if (!narrowed) break;
      if (narrowing.kind === 'non-null') {
        if (narrowed.kind === 'primitive' && narrowed.name === 'mixed') continue;
        const candidates = narrowed.kind === 'union' ? narrowed.types : [narrowed];
        const retained = candidates.filter((candidate) => !(candidate.kind === 'primitive' && candidate.name === 'null'));
        narrowed = retained.length ? union(...retained) : undefined;
        continue;
      }
      if (narrowing.kind === 'boolean-literal') {
        narrowed = this.booleanLiteralNarrowedType(narrowed, narrowing.value, narrowing.negated); continue;
      }
      if (narrowing.kind === 'array-key-exists') continue;
      let target: PhpType | undefined; let negated = narrowing.kind === 'not-instanceof';
      const strictSubclass = narrowing.kind === 'subclass-predicate';
      if (narrowing.kind === 'type-predicate') {
        const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset));
        const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
        const parsedTarget = resolved.toLowerCase() === builtin ? parsePhpDocType(narrowing.typeName).type : undefined;
        target = parsedTarget && this.phpDocDiagnosticType(file, parsedTarget, scope.containerFqcn ?? scope.id);
        negated = Boolean(narrowing.negated);
      } else if (narrowing.kind === 'subclass-predicate') {
        const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset));
        const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
        const fqcn = resolved.toLowerCase() === builtin
          ? this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn) : undefined;
        target = fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
        negated = Boolean(narrowing.negated);
      } else {
        const fqcn = this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn);
        target = fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
      }
      if (!target) continue;
      if (narrowed.kind === 'primitive' && narrowed.name === 'mixed') narrowed = strictSubclass || negated ? undefined : target;
      else {
        const candidates = narrowed.kind === 'union' ? narrowed.types : [narrowed]; const retained: PhpType[] = [];
        let uncertainComplement = false;
        for (const candidate of candidates) {
          const relation = strictSubclass
            ? candidate.kind === 'named' && target.kind === 'named' && this.hasCompleteHierarchy(candidate.name)
              ? candidate.name.toLowerCase() !== target.name.toLowerCase() && this.isSubclassOf(candidate.name, target.name) ? 'yes' : 'no'
              : ['primitive', 'literal', 'array', 'list', 'shape', 'callable'].includes(candidate.kind) ? 'no' : 'unknown'
            : compatibility(candidate, target, this.typeRelationContext());
          if (negated && relation === 'unknown') { uncertainComplement = true; break; }
          const candidateMatches = relation === 'yes';
          if (negated) { if (!candidateMatches) retained.push(candidate); continue; }
          if (candidateMatches) retained.push(candidate);
          else if (!strictSubclass && compatibility(target, candidate, this.typeRelationContext()) === 'yes') retained.push(target);
        }
        narrowed = !uncertainComplement && retained.length ? union(...retained) : undefined;
      }
    }
    return narrowed;
  }

  private booleanLiteralNarrowedType(base: PhpType | undefined, value: boolean, negated: boolean): PhpType | undefined {
    if (!base) return undefined;
    if (base.kind === 'primitive' && base.name === 'mixed') return negated ? undefined : literal(value);
    if (base.kind === 'unknown') return negated ? undefined : literal(value);
    const candidates = base.kind === 'union' ? base.types : [base]; const retained: PhpType[] = [];
    for (const candidate of candidates) {
      if (candidate.kind === 'primitive' && candidate.name === 'bool') {
        retained.push(literal(negated ? !value : value)); continue;
      }
      if (candidate.kind === 'literal' && typeof candidate.value === 'boolean') {
        if (negated ? candidate.value !== value : candidate.value === value) retained.push(candidate);
        continue;
      }
      if (negated) retained.push(candidate);
    }
    return retained.length ? union(...retained) : undefined;
  }

  private nativeAssertVariableType(file: SemanticFile, variable: string, offset: number,
    scope: ParsedScope): { applied: boolean; type?: PhpType } {
    const facts = file.narrowings.filter((item) => item.assertion && item.scopeId === scope.id && item.variable === variable
      && !item.propertyPath?.length && !item.arrayPath?.length && offset >= item.start && offset <= item.end
      && this.variableFlowFactStable(file, item, offset, scope))
      .sort((left, right) => left.start - right.start || left.end - left.start - (right.end - right.start));
    if (!facts.length) return { applied: false };
    const before = Math.max(0, facts[0]!.start - 1);
    let base = this.linearLocalValueType(file, variable, before, true);
    if (!base && !file.assignments.some((assignment) => assignment.scopeId === scope.id
      && assignment.variable === variable && assignment.end <= before)) {
      const parameter = scope.parameters.find((candidate) => `$${candidate.name}` === variable);
      const documented = parameter?.type ? parsePhpDocType(parameter.type).type : undefined;
      base = documented ? this.phpDocDiagnosticType(file, documented, scope.containerFqcn ?? scope.id)
        : parameter?.nativeType ? this.nativeSourceType(file, parameter.nativeType, scope.containerFqcn) : undefined;
    }
    if (!base && facts.some((fact) => fact.kind === 'instanceof'
      || (fact.kind === 'type-predicate' && !fact.negated)
      || (fact.kind === 'boolean-literal' && !fact.negated))) base = primitive('mixed');
    return { applied: true, type: this.applyDirectFlowNarrowings(file, facts, base, offset, scope) };
  }

  private booleanLiteralVariableType(file: SemanticFile, variable: string, offset: number,
    scope: ParsedScope): { applied: boolean; type?: PhpType } {
    const facts = file.narrowings.filter((item): item is Extract<ParsedTypeNarrowing, { kind: 'boolean-literal' }> =>
      item.kind === 'boolean-literal' && item.scopeId === scope.id && item.variable === variable
      && !item.propertyPath?.length && !item.arrayPath?.length && offset >= item.start && offset <= item.end
      && this.variableFlowFactStable(file, item, offset, scope))
      .sort((left, right) => left.start - right.start || left.end - left.start - (right.end - right.start));
    if (!facts.length) return { applied: false };
    const before = Math.max(0, facts[0]!.start - 1);
    let base = this.linearLocalValueType(file, variable, before, true);
    if (!base && !file.assignments.some((assignment) => assignment.scopeId === scope.id
      && assignment.variable === variable && assignment.end <= before)) {
      const parameter = scope.parameters.find((candidate) => `$${candidate.name}` === variable);
      const documented = parameter?.type ? parsePhpDocType(parameter.type).type : undefined;
      base = documented ? this.phpDocDiagnosticType(file, documented, scope.containerFqcn ?? scope.id)
        : parameter?.nativeType ? this.nativeSourceType(file, parameter.nativeType, scope.containerFqcn) : undefined;
    }
    if (!base && facts.some((fact) => !fact.negated)) base = primitive('mixed');
    return { applied: true, type: this.applyDirectFlowNarrowings(file, facts, base, offset, scope) };
  }

  private standaloneLocalVariableAnnotationType(file: SemanticFile, variable: string, offset: number, scope: ParsedScope): PhpType | undefined {
    const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namedVarTag = new RegExp(`@(?:(?:phpstan|psalm)-)?var\\b[^\\r\\n]*${escapedVariable}(?![\\p{L}\\p{N}_])`, 'iu');
    const ranges = file.commentRanges.filter((range) => range.start >= scope.start && range.end <= offset
      && file.source.startsWith('/**', range.start) && namedVarTag.test(file.source.slice(range.start, range.end)))
      .sort((left, right) => right.end - left.end).slice(0, 256);
    if (!ranges.length) return undefined;
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      let statement = deepestLocalSyntax(tree.rootNode, offset, offset, () => true);
      while (statement && statement.parent?.type !== 'compound_statement') statement = statement.parent ?? undefined;
      const block = statement?.parent; if (!block) return undefined;
      for (const range of ranges) {
        const comment = deepestLocalSyntax(tree.rootNode, range.start, range.end,
          (node) => node.type === 'comment' && node.startIndex === range.start && node.endIndex === range.end);
        if (comment?.parent?.type !== 'compound_statement' || comment.parent.startIndex !== block.startIndex
          || comment.parent.endIndex !== block.endIndex) continue;
        const source = file.source.slice(range.start, range.end);
        const doc = parsePhpDoc(source, range.start);
        if (doc.errors.length && namedVarTag.test(source)) return undefined;
        const tag = preferredDocTags(doc,
          (candidate) => candidate.name === 'var' && candidate.variable === variable && Boolean(candidate.type),
          () => variable).at(-1);
        if (!tag) continue;
        if (doc.errors.length) return undefined;
        const between = file.source.slice(range.end, offset);
        const escaped = escapedVariable;
        const mutation = new RegExp(`(?:${escaped}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${escaped}|unset\\s*\\(\\s*${escaped}\\s*\\)|foreach\\s*\\([^)]*\\bas\\s+&\\s*${escaped})`, 'iu');
        if (mutation.test(between)
          || new RegExp(`(?:=&\\s*${escaped}|&\\s*${escaped}\\s*=)`, 'u').test(between)
          || this.priorReferenceMutations(file, scope, variable, offset).length
            > this.priorReferenceMutations(file, scope, variable, range.end).length) return undefined;
        return this.phpDocDiagnosticType(file, tag.type!, scope.containerFqcn ?? scope.id);
      }
      return undefined;
    } finally {
      temporaryTree?.delete();
    }
  }

  private localArrayAnnotationType(file: SemanticFile, variable: string, offset: number, scope: ParsedScope): PhpType | undefined {
    const assignment = file.assignments.filter((candidate) => candidate.scopeId === scope.id
      && candidate.variable === variable && candidate.end <= offset).sort((left, right) => right.end - left.end)[0];
    const annotated = assignment && this.localVariableAnnotationType(file, assignment, scope); if (!annotated) return undefined;
    const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const between = file.source.slice(assignment.end, offset);
    const rootMutation = new RegExp(`(?:${escaped}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${escaped}|unset\\s*\\(\\s*${escaped}\\s*\\))`, 'u');
    const offsets = `${escaped}(?:\\s*\\[[^\\]]*\\])+`;
    const offsetMutation = new RegExp(`(?:${offsets}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${offsets}|unset\\s*\\(\\s*${offsets}\\s*\\))`, 'u');
    return rootMutation.test(between) || offsetMutation.test(between) ? undefined : annotated;
  }

  private memberSignature(member: MemberInfo): string {
    const parameters = member.parameters.map((parameter) => [parameter.nativeType ?? parameter.type ?? '', parameter.name, parameter.byReference, parameter.variadic, parameter.defaultValue !== undefined]);
    return JSON.stringify([member.kind, memberNameKey(member.kind, member.name), member.static, parameters, member.returnType ?? '', member.kind === 'property'
      ? [member.readonly, member.writeType ?? '', member.readable, member.writable, member.visibility, member.writeVisibility, member.hooked, member.virtual] : false]);
  }

  private targetMembers(target: MemberTarget): MemberInfo[] {
    if (!target.groups) return this.members(target.fqcn, target.accessFrom, new Set(), false, target.typeArguments).filter((member) => this.validAccess(member, target.static));
    const alternatives = target.groups.map((group) => {
      const candidates = group.flatMap((variant) => this.members(variant.fqcn, target.accessFrom, new Set(), false, variant.typeArguments))
        .filter((member) => this.validAccess(member, target.static));
      const byIdentity = new Map<string, MemberInfo[]>();
      for (const member of candidates) {
        const identity = `${member.kind}:${member.static}:${memberNameKey(member.kind, member.name)}`;
        byIdentity.set(identity, [...(byIdentity.get(identity) ?? []), member]);
      }
      return new Map([...byIdentity].flatMap(([identity, members]) => new Set(members.map((member) => this.memberSignature(member))).size === 1 ? [[identity, members[0]!]] : []));
    });
    const first = alternatives[0]; if (!first) return [];
    return [...first].flatMap(([identity, member]) => alternatives.slice(1).every((alternative) => {
      const candidate = alternative.get(identity); return candidate && this.memberSignature(candidate) === this.memberSignature(member);
    }) ? [member] : []);
  }

  private groupHasDeclaredMember(group: ObjectClass[], kind: MemberInfo['kind'], name: string, staticAccess: boolean): boolean {
    return group.some((variant) => {
      if (staticAccess && name.toLowerCase() === 'class') return true;
      return this.members(variant.fqcn, variant.fqcn, new Set(), true, variant.typeArguments)
        .some((member) => member.kind === kind && member.static === staticAccess && memberNameEquals(member.kind, member.name, name));
    });
  }

  private groupHasAccessibleMember(group: ObjectClass[], accessFrom: string | undefined, kind: MemberInfo['kind'], name: string, staticAccess: boolean): boolean {
    return group.some((variant) => this.members(variant.fqcn, accessFrom, new Set(), false, variant.typeArguments)
      .some((member) => member.kind === kind && member.static === staticAccess && memberNameEquals(member.kind, member.name, name)));
  }

  private groupHandlesMagicMember(group: ObjectClass[], accessFrom: string | undefined, kind: MemberInfo['kind'], staticAccess: boolean): boolean {
    const magicNames = kind === 'method' ? [staticAccess ? '__callstatic' : '__call'] : kind === 'property' && !staticAccess ? ['__get', '__set'] : [];
    return magicNames.length > 0 && group.some((variant) => this.members(variant.fqcn, accessFrom, new Set(), false, variant.typeArguments)
      .some((member) => member.kind === 'method' && magicNames.includes(member.name.toLowerCase())));
  }

  private memberReturnClass(member: MemberInfo, allowNullable = false): ObjectClass | undefined {
    if (member.kind === 'property' && member.readable === false) return undefined;
    const returnType = specializeTemplateType(member.returnType, member.templateArguments);
    const type = returnType && this.objectType(returnType, allowNullable);
    if (!type) return undefined;
    const file = this.files.get(member.uri);
    if (!file) return undefined;
    if (type.name.toLowerCase() === 'static') {
      return { fqcn: member.calledOnFqcn, nullable: type.nullable,
        typeArguments: member.calledOnTemplateArguments ?? member.templateArguments };
    }
    const ownerNamespace = member.typeScopeFqcn.split('\\').slice(0, -1).join('\\');
    const fqcn = this.resolveType(file, type.name, ownerNamespace, member.typeScopeFqcn);
    if (!fqcn) return undefined;
    const typeArguments = this.templateArgumentsFor(fqcn, type.arguments, file, ownerNamespace, member.typeScopeFqcn);
    return { fqcn, nullable: type.nullable, typeArguments };
  }

  private memberReturnGroups(member: MemberInfo): { groups: ObjectClass[][]; nullable: boolean } | undefined {
    const nativeReturnType = specializeTemplateType(member.nativeReturnType, member.templateArguments); if (!nativeReturnType) return undefined;
    if (!/[|&]/.test(nativeReturnType)) return undefined;
    const file = this.files.get(member.uri); if (!file) return undefined;
    const result = this.objectGroups(this.nativeType(file, nativeReturnType, member.typeScopeFqcn));
    return result?.groups.length && result.groups.flat().every((variant) => this.hasCompleteHierarchy(variant.fqcn)) ? result : undefined;
  }

  private commonMemberReturnGroups(groups: ObjectClass[][], member: MemberInfo, accessFrom: string | undefined): { groups: ObjectClass[][]; nullable: boolean } | undefined {
    const signature = this.memberSignature(member);
    const returns = groups.flatMap((group) => group.flatMap((variant) => this.members(variant.fqcn, accessFrom, new Set(), false, variant.typeArguments))
      .filter((candidate) => this.validAccess(candidate, false) && candidate.name.toLowerCase() === member.name.toLowerCase() && this.memberSignature(candidate) === signature))
      .map((candidate) => this.memberReturnGroups(candidate));
    if (!returns.length || returns.some((result) => !result)) return undefined;
    const key = (result: NonNullable<(typeof returns)[number]>): string => JSON.stringify([result.nullable,
      result.groups.map((group) => group.map((variant) => variant.fqcn.toLowerCase()).sort()).sort((left, right) => left.join('&').localeCompare(right.join('&')))]);
    return returns.every((result) => key(result!) === key(returns[0]!)) ? returns[0] : undefined;
  }

  private callbackSignature(source: string): { parameterType: string; returnType: string } | undefined {
    let parentheses = 0; let brackets = 0; let braces = 0; let quote = ''; let escaped = false;
    for (const character of source) {
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === "'" || character === '"') { quote = character; continue; }
      if (character === '(') parentheses += 1; else if (character === ')') parentheses -= 1;
      else if (character === '[') brackets += 1; else if (character === ']') brackets -= 1;
      else if (character === '{') braces += 1; else if (character === '}') braces -= 1;
      else if (character === ',' && parentheses === 0 && brackets === 0 && braces === 0) return undefined;
      if (parentheses < 0 || brackets < 0 || braces < 0) return undefined;
    }
    if (quote || parentheses || brackets || braces) return undefined;
    const typed = /^\s*(?:static\s+)?(?:fn|function\s*&?)\s*\(\s*([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s+(?:&\s*)?\$[A-Za-z_][A-Za-z0-9_]*\s*\)(?:\s*use\s*\([^)]*\))?\s*:\s*([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*(?:=>|\{)/.exec(source);
    if (typed) return { parameterType: typed[1]!, returnType: typed[2]! };
    const inferredArrow = /^\s*(?:static\s+)?fn\s*\(\s*([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s+(?:&\s*)?\$[A-Za-z_][A-Za-z0-9_]*\s*\)\s*=>\s*new\s+([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*\(/.exec(source);
    if (inferredArrow) return { parameterType: inferredArrow[1]!, returnType: inferredArrow[2]! };
    const inferredClosure = /^\s*(?:static\s+)?function\s*&?\s*\(\s*([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s+(?:&\s*)?\$[A-Za-z_][A-Za-z0-9_]*\s*\)(?:\s*use\s*\([^)]*\))?\s*\{\s*return\s+new\s+([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*\((?:[^()]|\([^()]*\))*\)\s*;\s*\}\s*$/.exec(source);
    return inferredClosure ? { parameterType: inferredClosure[1]!, returnType: inferredClosure[2]! } : undefined;
  }

  private literalStringArgument(source: string): string | undefined {
    const match = /^\s*(['"])([^'"\\]*)\1\s*$/.exec(source);
    return match?.[2];
  }

  private literalMethodReturnClass(receiverFqcn: string, method: string, argument: string): ObjectClass | undefined {
    const facts = [...this.externalFacts.values()].flatMap((contribution) => contribution.literalMethodReturns).filter((item) => item.name.toLowerCase() === method.toLowerCase()
      && item.argument === argument && this.isSubclassOf(receiverFqcn, item.ownerFqcn));
    const returnTypes = new Set(facts.map((fact) => fact.returnType.toLowerCase()));
    const fact = returnTypes.size === 1 ? facts[0] : undefined;
    return fact && this.fileAndDeclaration(fact.returnType) ? { fqcn: fact.returnType, nullable: false } : undefined;
  }

  private methodTemplateArguments(callerFile: SemanticFile, offset: number, member: MemberInfo,
    callback: { parameterType: string; returnType: string }): Record<string, string> | undefined {
    const parameterType = member.parameters[0]?.type; if (!parameterType || !member.callableTemplates?.length) return undefined;
    const callable = parsePhpDocType(parameterType).type;
    if (callable?.kind !== 'callable' || callable.parameters.length !== 1) return undefined;
    const callableReturn = callable.returnType; if (callableReturn?.kind !== 'name') return undefined;
    const template = member.callableTemplates.find((item) => item.name === callableReturn.name); if (!template) return undefined;
    const expected = this.objectType(displayPhpDocType(callable.parameters[0]!.type), false);
    const actualParameter = this.objectType(callback.parameterType, false); const actualReturn = this.objectType(callback.returnType, false);
    if (!expected || expected.arguments.length || !actualParameter || actualParameter.arguments.length || !actualReturn || actualReturn.arguments.length) return undefined;
    const memberFile = this.files.get(member.uri); if (!memberFile) return undefined;
    const memberNamespace = member.typeScopeFqcn.split('\\').slice(0, -1).join('\\');
    const callerNamespace = this.namespaceAt(callerFile, offset); const callerScope = this.containingScope(callerFile, offset)?.containerFqcn;
    const expectedFqcn = this.resolveType(memberFile, expected.name, memberNamespace, member.typeScopeFqcn);
    const parameterFqcn = this.resolveType(callerFile, actualParameter.name, callerNamespace, callerScope);
    const returnFqcn = this.resolveType(callerFile, actualReturn.name, callerNamespace, callerScope);
    if (!expectedFqcn || !parameterFqcn || !returnFqcn || !this.fileAndDeclaration(expectedFqcn)
      || !this.fileAndDeclaration(parameterFqcn) || !this.fileAndDeclaration(returnFqcn) || !this.isSubclassOf(expectedFqcn, parameterFqcn)) return undefined;
    if (template.bound) {
      if (template.bound.toLowerCase() === 'object') return { [template.name]: returnFqcn };
      const bound = this.resolveType(memberFile, template.bound, memberNamespace, member.typeScopeFqcn);
      if (!bound || !this.fileAndDeclaration(bound) || !this.isSubclassOf(returnFqcn, bound)) return undefined;
    }
    return { [template.name]: returnFqcn };
  }

  private validAccess(member: MemberInfo, staticAccess: boolean): boolean {
    return staticAccess ? member.kind === 'constant' || member.static : member.kind !== 'constant' && !member.static;
  }

  private memberVisibilityAllowed(visibility: MemberInfo['visibility'], ownerFqcn: string, accessFrom?: string): boolean {
    if (visibility === 'public') return true;
    if (!accessFrom) return false;
    if (accessFrom.toLowerCase() === ownerFqcn.toLowerCase()) return true;
    return visibility === 'protected' && this.isSubclassOf(accessFrom, ownerFqcn);
  }

  private propertyAccessModes(file: SemanticFile, access: ParsedMemberAccess): { read: boolean; write: boolean; indirectWrite?: boolean; referenceAssignment?: boolean } {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    try {
      const member = deepestLocalSyntax((retainedTree ?? temporaryTree!).rootNode, access.start, access.end,
        (node) => ['member_access_expression', 'scoped_property_access_expression'].includes(node.type)
          && node.childForFieldName('name')?.startIndex === access.start
          && node.childForFieldName('name')?.endIndex === access.end);
      let expression = member;
      while (expression?.parent && ['subscript_expression', 'parenthesized_expression'].includes(expression.parent.type)
        && expression.parent.namedChildren[0]?.id === expression.id) expression = expression.parent;
      const parent = expression?.parent;
      const indirectWrite = Boolean(member && expression && member.id !== expression.id);
      if (expression && parent?.type === 'assignment_expression' && parent.childForFieldName('left')?.id === expression.id) {
        return indirectWrite ? { read: true, write: true, indirectWrite: true } : { read: false, write: true };
      }
      if (expression && parent?.type === 'augmented_assignment_expression' && parent.childForFieldName('left')?.id === expression.id) {
        return { read: true, write: true, indirectWrite };
      }
      if (expression && parent?.type === 'update_expression') return { read: true, write: true, indirectWrite };
      if (expression && parent?.type === 'reference_assignment_expression') {
        return parent.childForFieldName('left')?.id === expression.id
          ? { read: false, write: true, referenceAssignment: true }
          : { read: true, write: true, indirectWrite: true };
      }
      if (expression && parent?.type === 'foreach_statement' && parent.namedChildren[0]?.id === expression.id) {
        const value = parent.namedChildren[1];
        if (value?.type === 'by_ref') return { read: true, write: true, indirectWrite: true };
      }
      const argument = expression?.parent?.type === 'argument' && expression.parent.namedChildren.at(-1)?.id === expression.id
        ? expression.parent : undefined;
      const callNode = argument?.parent?.parent;
      if (argument && callNode && ['function_call_expression', 'member_call_expression', 'nullsafe_member_call_expression', 'scoped_call_expression'].includes(callNode.type)) {
        const call = file.calls.find((candidate) => candidate.start === callNode.startIndex && candidate.end === callNode.endIndex);
        const signature = call && this.signature(file.uri, call.argumentsStart + 1);
        const declarations = signature ? [...this.files.values()].flatMap((candidate) => candidate.callables)
          .filter((candidate) => candidate.kind === signature.kind && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase()) : [];
        if (call && signature && declarations.length === 1 && !call.arguments.some((candidate) => candidate.unpacked)) {
          const argumentIndex = call.arguments.findIndex((candidate) => candidate.start === argument.startIndex && candidate.end === argument.endIndex);
          let positional = 0; let parameter: ParsedParameter | undefined;
          for (let index = 0; index <= argumentIndex; index += 1) {
            const candidate = call.arguments[index]!;
            parameter = candidate.name
              ? signature.parameters.find((item) => item.name === candidate.name)
              : signature.parameters[positional] ?? (signature.parameters.at(-1)?.variadic ? signature.parameters.at(-1) : undefined);
            if (!candidate.name) positional += 1;
          }
          if (argumentIndex >= 0 && parameter?.byReference) return { read: true, write: true, indirectWrite: true };
        }
      }
      return { read: true, write: false };
    } finally { temporaryTree?.delete(); }
  }

  private containingCallable(file: SemanticFile, offset: number): ParsedCallableDeclaration | undefined {
    return file.callables.filter((item) => offset >= item.declarationStart && offset <= item.declarationEnd).sort((a, b) => a.declarationEnd - a.declarationStart - (b.declarationEnd - b.declarationStart))[0];
  }

  private containingScope(file: SemanticFile, offset: number): ParsedScope | undefined {
    return file.scopes.filter((item) => offset >= item.start && offset <= item.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
  }

  private variableType(file: SemanticFile, variable: string, offset: number, visited = new Set<string>()): string | undefined {
    const type = this.variableClass(file, variable, offset, visited);
    return type?.nullable ? undefined : type?.fqcn;
  }

  private variableShapeElementClass(file: SemanticFile, variable: string, path: string[], offset: number, allowNullable: boolean): ObjectClass | undefined {
    const scope = this.containingScope(file, offset); if (!scope) return undefined;
    let collection = this.standaloneLocalVariableAnnotationType(file, variable, offset, scope)
      ?? this.localArrayAnnotationType(file, variable, offset, scope);
    collection ??= this.linearLocalValueType(file, variable, offset, true);
    collection ??= this.iterationVariableType(file, variable, offset, scope);
    if (!collection && !file.assignments.some((assignment) => assignment.scopeId === scope.id
      && assignment.variable === variable && assignment.end <= offset)) {
      const parameter = scope.parameters.find((item) => `$${item.name}` === variable);
      const documented = parameter?.type ? parsePhpDocType(parameter.type).type : undefined;
      collection = documented ? this.phpDocDiagnosticType(file, documented, scope.containerFqcn ?? scope.id) : undefined;
    }
    const booleanLiteral = this.booleanLiteralVariableType(file, variable, offset, scope);
    if (booleanLiteral.applied) collection = booleanLiteral.type;
    const base = collection && this.arrayElementPathType(collection, path);
    const presentBase = collection && this.arrayElementPathType(collection, path, false);
    const flow = this.arrayElementFlowNarrowedType(file, variable, path, offset, scope, base, presentBase);
    const effective = flow.applied ? flow.type : base; if (!effective) return undefined;
    const composite = this.objectGroups(effective); const first = composite?.groups[0]?.[0];
    if (!composite || !first || (composite.nullable && !allowNullable)
      || composite.groups.flat().some((candidate) => !this.fileAndDeclaration(candidate.fqcn))) return undefined;
    return { ...first, nullable: composite.nullable, groups: composite.groups };
  }

  private iterationVariableType(file: SemanticFile, variable: string, offset: number, scope: ParsedScope): PhpType | undefined {
    const iteration = file.assignments.filter((assignment) => assignment.scopeId === scope.id
      && assignment.variable === variable && assignment.sourceIterable && assignment.end <= offset
      && (!assignment.validRange || (offset >= assignment.validRange.start && offset <= assignment.validRange.end)))
      .sort((left, right) => right.end - left.end)[0]?.sourceIterable;
    if (iteration?.kind !== 'variable' || iteration.variable === variable) return undefined;
    const iterable = this.provenArgumentType(file, iteration.start, iteration.end);
    return iterable && this.delegatedGeneratorTypes(iterable)?.[iteration.part];
  }

  private assertedTargetClass(file: SemanticFile, variable: string, propertyPath: string[], offset: number, scope: ParsedScope,
    allowComposite = false): ObjectClass | undefined {
    const parameter = scope.parameters.find((candidate) => `$${candidate.name}` === variable);
    if (variable === '$this' ? !scope.containerFqcn : !parameter || parameter.byReference) return undefined;
    const inferenceKey = `${file.uri}:${scope.id}:${variable}:${propertyPath.join('->')}:${offset}:${allowComposite ? 'composite' : 'single'}`;
    if (this.assertedTargetInferenceCache.has(inferenceKey)) return this.assertedTargetInferenceCache.get(inferenceKey) ?? undefined;
    if (this.assertedTargetInferenceInProgress.size >= MAX_ASSERTED_TARGET_INFERENCE_DEPTH
      || this.assertedTargetInferenceInProgress.has(inferenceKey)) return undefined;
    this.assertedTargetInferenceInProgress.add(inferenceKey);
    try {
    const inferred = (() : ObjectClass | undefined => {
    const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const candidates = file.calls.flatMap((call): Array<{ call: ParsedCall; tag: PhpDocTag['name']; factStart: number; inspection?: SourceRange }> => {
      if (this.containingScope(file, call.start)?.id !== scope.id) return [];
      const guard = call.guardContinuation;
      if (guard && offset >= guard.range.start && offset <= guard.range.end) {
        return [{ call, tag: guard.when === 'true' ? 'assert-if-true' : 'assert-if-false', factStart: guard.range.start, inspection: guard.inspection }];
      }
      const shortCircuit = call.shortCircuit?.flatMap((fact): Array<{ call: ParsedCall; tag: PhpDocTag['name']; factStart: number }> =>
        offset >= fact.range.start && offset <= fact.range.end
          ? [{ call, tag: fact.when === 'true' ? 'assert-if-true' : 'assert-if-false', factStart: call.end }]
          : []) ?? [];
      if (shortCircuit.length) return shortCircuit;
      if (call.condition?.whenTrue && offset >= call.condition.whenTrue.start && offset <= call.condition.whenTrue.end) {
        return [{ call, tag: 'assert-if-true', factStart: call.condition.whenTrue.start }];
      }
      if (call.condition?.whenFalse && offset >= call.condition.whenFalse.start && offset <= call.condition.whenFalse.end) {
        return [{ call, tag: 'assert-if-false', factStart: call.condition.whenFalse.start }];
      }
      return call.standalone && call.end <= offset ? [{ call, tag: 'assert', factStart: call.end }] : [];
    }).sort((left, right) => right.call.end - left.call.end);
    for (const candidate of candidates) {
      const { call } = candidate;
      const between = file.source.slice(candidate.factStart, offset);
      if (/[{}]/.test(between)) continue;
      const inspection = candidate.inspection ? file.source.slice(candidate.inspection.start, candidate.inspection.end) : '';
      const mutationSources = inspection ? [between, inspection] : [between];
      const rootMutation = new RegExp(`(?:${escapedVariable}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${escapedVariable}|unset\\s*\\(\\s*${escapedVariable}\\s*\\))`, 'u');
      if (mutationSources.some((source) => rootMutation.test(source))) continue;
      if (propertyPath.length) {
        const escapedPath = propertyPath.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const propertyAccesses = escapedPath.map((_, index) =>
          `${escapedVariable}\\s*->\\s*${escapedPath.slice(0, index + 1).join('\\s*->\\s*')}`);
        const propertyAccess = `(?:${propertyAccesses.join('|')})`;
        if (mutationSources.some((source) => new RegExp(`(?:${propertyAccess}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${propertyAccess}|unset\\s*\\(\\s*${propertyAccess})`, 'u').test(source)
          || new RegExp(`${escapedVariable}(?:\\s*(?:->|\\?->)\\s*[A-Za-z_][A-Za-z0-9_]*)+\\s*\\(`, 'u').test(source)
          )) continue;
      }
      const passedToCall = file.calls.some((possibleMutation) => ((possibleMutation.start >= candidate.factStart
        && possibleMutation.end <= offset) || (candidate.inspection && possibleMutation.start >= candidate.inspection.start
        && possibleMutation.end <= candidate.inspection.end)) && possibleMutation.arguments.some((argument) =>
        new RegExp(`(?<![\\p{L}\\p{N}_])${escapedVariable}(?![\\p{L}\\p{N}_])`, 'u')
          .test(file.source.slice(argument.start, argument.end))));
      if (mutationSources.some((source) => new RegExp(`=&\\s*${escapedVariable}(?![\\p{L}\\p{N}_])`, 'u').test(source)) || passedToCall) continue;
      const signature = this.signature(file.uri, call.argumentsStart + 1);
      if (!signature || signature.synthetic || (signature.kind !== 'function' && signature.kind !== 'method')) continue;
      const declarations = [...this.files.values()].flatMap((declarationFile) => declarationFile.callables
        .filter((item) => item.kind === signature.kind && item.fqcn.toLowerCase() === signature.fqcn.toLowerCase())
        .map((item) => ({ file: declarationFile, callable: item })));
      if (declarations.length !== 1 || call.arguments.some((argument) => argument.unpacked)) continue;
      const mapped = new Map<number, string>(); let positional = 0; let valid = true; let sawNamed = false;
      for (const argument of call.arguments) {
        const raw = file.source.slice(argument.start, argument.end).trim();
        const value = argument.name ? raw.replace(new RegExp(`^${argument.name}\\s*:\\s*`), '').trim() : raw;
        const index = argument.name ? signature.parameters.findIndex((item) => item.name === argument.name) : positional++;
        if ((sawNamed && !argument.name) || index < 0 || mapped.has(index)) { valid = false; break; }
        sawNamed ||= Boolean(argument.name); mapped.set(index, value);
      }
      if (!valid || !signature.parameters.every((item, index) => item.defaultValue !== undefined || item.variadic || mapped.has(index))) continue;
      const declaration = declarations[0]!;
      const range = declaration.file.commentRanges.filter((item) => item.end <= declaration.callable.declarationStart
        && declaration.file.source.slice(item.start, item.start + 3) === '/**')
        .sort((left, right) => right.end - left.end)[0];
      const doc = range && /^[\s]*(?:#\[[\s\S]*?\][\s]*)*$/.test(declaration.file.source.slice(range.end, declaration.callable.declarationStart))
        ? parsePhpDoc(declaration.file.source.slice(range.start, range.end), range.start) : undefined;
      const assertions = preferredDocTags(doc, (tag) => tag.name === candidate.tag && Boolean(tag.variable) && Boolean(tag.type),
        (tag) => tag.variable!);
      const matched = assertions.filter((assertion) => {
        const parameterIndex = declaration.callable.parameters.findIndex((item) => `$${item.name}` === assertion.variable);
        const assertedPath = assertion.propertyPath ?? [];
        const targetMatches = parameterIndex >= 0 ? mapped.get(parameterIndex) === variable
          : assertion.variable === '$this' && signature.kind === 'method' && !call.receiver?.nullsafe && call.receiver?.variable === variable;
        return targetMatches
          && assertedPath.length === propertyPath.length && assertedPath.every((part, index) => part === propertyPath[index]);
      });
      if (matched.length !== 1) continue;
      const namespace = declaration.callable.containerFqcn?.split('\\').slice(0, -1).join('\\') ?? declaration.file.namespace;
      let assertionType = matched[0]!.type!;
      const callableTemplates = declaration.file.templates
        .filter((template) => template.ownerFqcn.toLowerCase() === signature.fqcn.toLowerCase());
      const assertionText = displayPhpDocType(assertionType);
      const referencedTemplates = callableTemplates.filter((template) =>
        new RegExp(`(?<![A-Za-z0-9_\\\\])${template.name}(?![A-Za-z0-9_])`).test(assertionText));
      if (referencedTemplates.length) {
        const inferred = this.callTemplateArguments(file, call, signature, declaration.file, callableTemplates);
        if (!inferred?.length || inferred.some((alternative) => referencedTemplates.some((template) => !alternative[template.name]))) continue;
        const specialized = [...new Set(inferred.map((alternative) => specializeTemplateType(assertionText, alternative)))];
        if (specialized.length !== 1 || !specialized[0]) continue;
        const parsed = parsePhpDocType(specialized[0]).type; if (!parsed) continue;
        const compatible = inferred.every((alternative) => specializeTemplateType(assertionText, alternative) === specialized[0]
          && this.callArgumentsCompatible(file, call, signature, declaration.file, alternative));
        if (!compatible) continue;
        assertionType = parsed;
      }
      if (assertionType.kind === 'negated') {
        const propertyMember = propertyPath.length
          ? this.declaredPropertyPathMember(file, variable, propertyPath, offset, scope) : undefined;
        if (propertyPath.length && !propertyMember) continue;
        if (assertionType.type.kind === 'name' && assertionType.type.name.toLowerCase() === 'null') {
          if (propertyMember) {
            const current = this.memberReturnClass(propertyMember, true);
            if (current?.nullable && this.fileAndDeclaration(current.fqcn)) return { ...current, nullable: false };
            continue;
          }
          if (!parameter?.type) continue;
          const current = this.objectType(parameter.type, true); const callerNamespace = this.namespaceAt(file, offset);
          if (!current?.nullable) continue;
          const fqcn = this.resolveType(file, current.name, callerNamespace, scope.containerFqcn);
          if (!fqcn || !this.fileAndDeclaration(fqcn)) continue;
          const typeArguments = this.templateArgumentsFor(fqcn, current.arguments, file, callerNamespace, scope.containerFqcn);
          if (!current.arguments.length || typeArguments) return { fqcn, nullable: false, typeArguments };
          continue;
        }
        const excluded = this.phpDocDiagnosticType(declaration.file, assertionType.type, declaration.callable.containerFqcn);
        if (!excluded) continue;
        const propertyFile = propertyMember ? this.files.get(propertyMember.uri) : undefined;
        if (!propertyMember && !parameter?.type) continue;
        const currentFile = propertyFile ?? file;
        const currentType = propertyMember ? propertyMember.returnType : parameter!.type;
        const currentScope = propertyMember?.typeScopeFqcn ?? scope.containerFqcn;
        const parsedCurrent = currentType ? parsePhpDocType(currentType).type : undefined;
        const documentedCurrent = parsedCurrent && this.phpDocDiagnosticType(currentFile, parsedCurrent, currentScope);
        const current = documentedCurrent ?? this.nativeSourceType(currentFile, currentType, currentScope);
        const alternatives = current.kind === 'union' ? current.types : [current];
        const literalPrimitive = (value: string | number | boolean): PrimitiveName => typeof value === 'boolean' ? 'bool'
          : typeof value === 'number' ? (Number.isInteger(value) ? 'int' : 'float') : 'string';
        const relation: TypeRelationContext = {
          isSubclassOf: (candidate, target) => this.hasCompleteHierarchy(candidate) && this.fileAndDeclaration(target)
            ? this.isSubclassOf(candidate, target) : undefined,
          genericVariance: (baseName) => this.genericVariance(baseName),
          genericSupertype: (sourceBaseName, sourceArguments, targetBaseName) =>
            this.genericSupertype(sourceBaseName, sourceArguments, targetBaseName),
        };
        const removes = (alternative: PhpType, removal: PhpType): boolean | undefined => {
          if (removal.kind === 'union') {
            const results = removal.types.map((member) => removes(alternative, member));
            return results.some((result) => result === true) ? true : results.every((result) => result === false) ? false : undefined;
          }
          if (removal.kind === 'literal') return alternative.kind === 'literal' ? alternative.value === removal.value : false;
          if (removal.kind === 'primitive') {
            if (removal.name === 'mixed') return true;
            if (removal.name === 'never') return false;
            if (removal.name === 'object' && ['named', 'generic', 'intersection'].includes(alternative.kind)) return true;
            if (alternative.kind === 'primitive') return alternative.name === removal.name;
            if (alternative.kind === 'literal') return literalPrimitive(alternative.value) === removal.name;
            if (['named', 'generic', 'intersection'].includes(alternative.kind)) return false;
            return undefined;
          }
          if (removal.kind === 'generic' || removal.kind === 'intersection') {
            const result = compatibility(alternative, removal, relation);
            return result === 'yes' ? true : result === 'no' ? false : undefined;
          }
          if (removal.kind !== 'named') return undefined;
          if (alternative.kind === 'generic' || alternative.kind === 'intersection') {
            const result = compatibility(alternative, removal, relation);
            return result === 'yes' ? true : result === 'no' ? false : undefined;
          }
          if (alternative.kind !== 'named') return ['primitive', 'literal'].includes(alternative.kind) ? false : undefined;
          if (alternative.name.toLowerCase() === removal.name.toLowerCase()) return true;
          return this.hasCompleteHierarchy(alternative.name) ? this.isSubclassOf(alternative.name, removal.name) : undefined;
        };
        const decisions = alternatives.map((alternative) => removes(alternative, excluded));
        if (decisions.some((decision) => decision === undefined)) continue;
        const remaining = alternatives.filter((_, index) => decisions[index] === false);
        if (remaining.length !== 1) continue;
        if (remaining[0]?.kind === 'named') return { fqcn: remaining[0].name, nullable: false };
        if (allowComposite && remaining[0]?.kind === 'intersection') {
          const composite = this.objectGroups(remaining[0]);
          const first = composite?.groups[0]?.[0];
          if (first && composite!.groups.flat().every((variant) => this.hasCompleteHierarchy(variant.fqcn))) {
            return { ...first, nullable: false, groups: composite!.groups };
          }
          continue;
        }
        if (remaining[0]?.kind !== 'generic' || remaining[0].base.kind !== 'named') continue;
        const currentNamespace = currentScope?.split('\\').slice(0, -1).join('\\') ?? currentFile.namespace;
        const typeArguments = this.templateArgumentsFor(remaining[0].base.name,
          remaining[0].arguments.map(displayType), currentFile, currentNamespace, currentScope);
        if (typeArguments) return { fqcn: remaining[0].base.name, nullable: false, typeArguments };
      }
      const asserted = this.objectType(displayPhpDocType(assertionType), false);
      const fqcn = asserted && !asserted.nullable
        ? this.resolveType(declaration.file, asserted.name, namespace, declaration.callable.containerFqcn) : undefined;
      if (!fqcn || !this.fileAndDeclaration(fqcn)) continue;
      const typeArguments = this.templateArgumentsFor(fqcn, asserted!.arguments, declaration.file, namespace, declaration.callable.containerFqcn);
      if (!asserted!.arguments.length || typeArguments) return { fqcn, nullable: false, typeArguments };
    }
    return undefined;
    })();
    this.assertedTargetInferenceCache.set(inferenceKey, inferred ?? null);
    return inferred;
    } finally { this.assertedTargetInferenceInProgress.delete(inferenceKey); }
  }

  private assertedParameterClass(file: SemanticFile, variable: string, offset: number, scope: ParsedScope): ObjectClass | undefined {
    return this.assertedTargetClass(file, variable, [], offset, scope);
  }

  private assertedPropertyClass(file: SemanticFile, variable: string, property: string, offset: number, scope: ParsedScope): ObjectClass | undefined {
    return this.assertedPropertyPathClass(file, variable, [property], offset, scope);
  }

  private assertedPropertyPathClass(file: SemanticFile, variable: string, propertyPath: string[], offset: number, scope: ParsedScope,
    allowComposite = false): ObjectClass | undefined {
    return this.assertedTargetClass(file, variable, propertyPath, offset, scope, allowComposite);
  }

  private declaredPropertyPathMember(file: SemanticFile, variable: string, propertyPath: string[], offset: number, scope: ParsedScope): MemberInfo | undefined {
    let target: ObjectClass | undefined;
    if (variable === '$this' && scope.containerFqcn) target = { fqcn: scope.containerFqcn, nullable: false };
    else {
      const parameter = scope.parameters.find((item) => `$${item.name}` === variable); const parsed = parameter?.type && this.objectType(parameter.type, true);
      const fqcn = parsed && this.resolveType(file, parsed.name, this.namespaceAt(file, offset), scope.containerFqcn);
      const typeArguments = fqcn && parsed ? this.templateArgumentsFor(fqcn, parsed.arguments, file, this.namespaceAt(file, offset), scope.containerFqcn) : undefined;
      if (fqcn && parsed && (!parsed.arguments.length || typeArguments)) target = { fqcn, nullable: parsed.nullable, typeArguments };
    }
    if (!target) return undefined;
    for (const [index, property] of propertyPath.entries()) {
      const member = this.members(target.fqcn, scope.containerFqcn, new Set(), false, target.typeArguments)
        .find((item) => item.kind === 'property' && !item.static && item.name.toLowerCase() === property.toLowerCase());
      if (!member) return undefined;
      if (index === propertyPath.length - 1) return member;
      const returned = this.memberReturnClass(member, false); if (!returned) return undefined;
      target = returned;
    }
    return undefined;
  }

  private contextualClosureParameterClass(file: SemanticFile, scope: ParsedScope, variable: string,
    allowNullable: boolean): ObjectClass | undefined {
    if (scope.kind !== 'closure' && scope.kind !== 'arrow') return undefined;
    const inferenceKey = `${file.uri}:${scope.id}:${variable}`;
    if (this.contextualClosureInferenceInProgress.has(inferenceKey)) return undefined;
    this.contextualClosureInferenceInProgress.add(inferenceKey);
    try {
    const parameterIndex = scope.parameters.findIndex((parameter) => `$${parameter.name}` === variable);
    if (parameterIndex < 0 || scope.parameters[parameterIndex]?.type
      || scope.parameters.some((parameter) => parameter.byReference || parameter.variadic)) return undefined;
    const containingCalls = file.calls.filter((call) => call.arguments.some((argument) =>
      argument.start <= scope.start && argument.end >= scope.end));
    if (!containingCalls.length) return undefined;
    containingCalls.sort((left, right) => left.end - left.start - (right.end - right.start));
    const call = containingCalls[0]!;
    const argumentIndex = call.arguments.findIndex((argument) => argument.start <= scope.start && argument.end >= scope.end);
    const argument = call.arguments[argumentIndex];
    if (!argument || argument.unpacked || call.arguments.some((candidate, index) => index <= argumentIndex && candidate.unpacked)) return undefined;
    if (!argument.name && call.arguments.slice(0, argumentIndex).some((candidate) => candidate.name)) return undefined;
    const availableSignatures = this.signatures(file.uri, call.argumentsStart + 1);
    if (availableSignatures.length !== 1 && !availableSignatures.every((signature) => signature.uri.startsWith('php-companion-builtin:')
      && signature.uri === availableSignatures[0]?.uri && signature.fqcn.toLowerCase() === availableSignatures[0]?.fqcn.toLowerCase())) return undefined;
    const signatureCandidates = availableSignatures.flatMap((signature) => {
      let signatureParameterIndex: number;
      if (argument.name) {
        signatureParameterIndex = signature.parameters.findIndex((parameter) => parameter.name === argument.name);
      } else {
        signatureParameterIndex = call.arguments.slice(0, argumentIndex).filter((candidate) => !candidate.name).length;
        if (signatureParameterIndex >= signature.parameters.length) {
          signatureParameterIndex = signature.parameters.findIndex((parameter) => parameter.variadic);
        }
      }
      const signatureParameter = signatureParameterIndex >= 0 ? signature.parameters[signatureParameterIndex] : undefined;
      const documented = signatureParameter?.type ? parsePhpDocType(signatureParameter.type).type : undefined;
      return documented?.kind === 'callable' && documented.parameters.length === scope.parameters.length
        && !documented.parameters.some((parameter) => parameter.variadic)
        ? [{ signature, documented }] : [];
    });
    if (signatureCandidates.length !== 1) return undefined;
    const { signature, documented } = signatureCandidates[0]!;
    const declarationFile = this.files.get(signature.uri); if (!declarationFile) return undefined;
    let expectedParameter = documented.parameters[parameterIndex]; if (!expectedParameter) return undefined;
    const templates = declarationFile.templates.filter((template) => template.ownerFqcn.toLowerCase() === signature.fqcn.toLowerCase());
    const expectedText = displayPhpDocType(expectedParameter.type);
    const referencedTemplates = templates.filter((template) =>
      new RegExp(`(?<![A-Za-z0-9_\\\\])${template.name}(?![A-Za-z0-9_])`).test(expectedText));
    if (referencedTemplates.length) {
      const inferred = this.callTemplateArguments(file, call, signature, declarationFile, templates,
        { start: scope.start, end: scope.end });
      if (!inferred?.length || inferred.some((alternative) => referencedTemplates.some((template) => !alternative[template.name]))) return undefined;
      const specialized = [...new Set(inferred.map((alternative) => specializeTemplateType(expectedText, alternative)))];
      if (specialized.length !== 1 || !specialized[0]) return undefined;
      const parsed = parsePhpDocType(specialized[0]).type; if (!parsed) return undefined;
      expectedParameter = { ...expectedParameter, type: parsed };
    }
    const expected = this.phpDocDiagnosticType(declarationFile, expectedParameter.type, signature.typeScopeFqcn);
    const composite = expected && this.objectGroups(expected); const first = composite?.groups[0]?.[0];
    return composite && first && composite.groups.flat().every((candidate) => this.fileAndDeclaration(candidate.fqcn))
      && (!composite.nullable || allowNullable)
      ? { ...first, nullable: composite.nullable, groups: composite.groups }
      : undefined;
    } finally {
      this.contextualClosureInferenceInProgress.delete(inferenceKey);
    }
  }

  private variableClass(file: SemanticFile, variable: string, offset: number, visited = new Set<string>(), allowNullable = false): ObjectClass | undefined {
    const scope = this.containingScope(file, offset);
    if (!scope) return undefined;
    if (variable === '$this') return scope.containerFqcn ? { fqcn: scope.containerFqcn, nullable: false } : undefined;
    const visitKey = `${scope.id}:${variable}:${offset}`;
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(visitKey)) return undefined;
    visited.add(visitKey);
    const assignment = file.assignments.filter((item) => item.scopeId === scope.id && item.variable === variable && item.end <= offset
      && (!item.validRange || (offset >= item.validRange.start && offset <= item.validRange.end))).sort((left, right) => right.end - left.end)[0];
    const standalone = this.standaloneLocalVariableAnnotationType(file, variable, offset, scope);
    if (standalone) {
      const composite = this.objectGroups(standalone); const first = composite?.groups[0]?.[0];
      if (composite && first && composite.groups.flat().every((candidate) => this.fileAndDeclaration(candidate.fqcn))
        && (!composite.nullable || allowNullable)) return { ...first, nullable: composite.nullable, groups: composite.groups };
    }
    const annotated = assignment && this.localVariableAnnotationType(file, assignment, scope);
    if (annotated) {
      const composite = this.objectGroups(annotated); const first = composite?.groups[0]?.[0];
      if (composite && first && composite.groups.flat().every((candidate) => this.fileAndDeclaration(candidate.fqcn))
        && (!composite.nullable || allowNullable)) return { ...first, nullable: composite.nullable, groups: composite.groups };
    }
    const nativeAssertion = this.nativeAssertVariableType(file, variable, offset, scope);
    if (nativeAssertion.applied) {
      const composite = nativeAssertion.type && this.objectGroups(nativeAssertion.type); const first = composite?.groups[0]?.[0];
      return composite && first && composite.groups.flat().every((candidate) => this.fileAndDeclaration(candidate.fqcn))
        && (!composite.nullable || allowNullable) ? { ...first, nullable: composite.nullable, groups: composite.groups } : undefined;
    }
    const booleanLiteral = this.booleanLiteralVariableType(file, variable, offset, scope);
    if (booleanLiteral.applied) {
      const composite = booleanLiteral.type && this.objectGroups(booleanLiteral.type); const first = composite?.groups[0]?.[0];
      return composite && first && composite.groups.flat().every((candidate) => this.fileAndDeclaration(candidate.fqcn))
        && (!composite.nullable || allowNullable) ? { ...first, nullable: composite.nullable, groups: composite.groups } : undefined;
    }
    const narrowing = file.narrowings.filter((item) => item.scopeId === scope.id && item.variable === variable
      && !item.propertyPath?.length && !item.arrayPath?.length && offset >= item.start && offset <= item.end
      && this.variableFlowFactStable(file, item, offset, scope))
      .sort((left, right) => left.end - left.start - (right.end - right.start))[0];
    if (narrowing?.kind === 'instanceof') {
      const fqcn = this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn);
      return fqcn && this.fileAndDeclaration(fqcn) ? { fqcn, nullable: false } : undefined;
    }
    if (narrowing?.kind === 'non-null') {
      const inferred = this.linearLocalValueType(file, variable, Math.max(0, narrowing.start - 1), true);
      const composite = inferred && this.objectGroups(inferred); const first = composite?.groups[0]?.[0];
      if (composite && first && composite.groups.flat().every((candidate) => this.fileAndDeclaration(candidate.fqcn))) {
        return { ...first, nullable: false, groups: composite.groups };
      }
    }
    const assignmentInsideControlFlow = Boolean(assignment && this.assignmentInsideControlFlow(file, assignment, scope));
    const hasLaterAssignment = Boolean(assignment && file.assignments.some((candidate) => candidate.scopeId === scope.id
      && candidate.variable === variable && candidate.start > assignment.start && candidate.end <= offset
      && this.controlFlowAssignments.get(file.uri)?.has(candidate.start)));
    const declarativeAssignment = Boolean(assignment && (assignment.sourceIterable || assignment.typeNames
      || file.source.slice(assignment.start, assignment.end).trim() === variable));
    if (!declarativeAssignment && (assignmentInsideControlFlow || hasLaterAssignment)) {
      const inferred = this.linearLocalValueType(file, variable, offset, true);
      const composite = inferred && this.objectGroups(inferred); const first = composite?.groups[0]?.[0];
      return composite && first && composite.groups.flat().every((candidate) => this.fileAndDeclaration(candidate.fqcn))
        && (!composite.nullable || allowNullable) ? { ...first, nullable: composite.nullable, groups: composite.groups } : undefined;
    }
    if (assignment?.typeName) {
      if (assignment.typeName.includes('@anonymous:') && file.declarations.some((item) => item.anonymous && item.fqcn === assignment.typeName)) return { fqcn: assignment.typeName, nullable: false };
      const fqcn = this.resolveSourceType(file, assignment.typeName, this.namespaceAt(file, assignment.start), scope.containerFqcn);
      if (!fqcn) return undefined;
      const typeArguments = this.constructedTypeArguments(file, assignment, fqcn, scope.containerFqcn);
      return { fqcn, nullable: false, typeArguments };
    }
    if (assignment?.sourceVariable) return this.variableClass(file, assignment.sourceVariable, assignment.start, visited, allowNullable);
    if (assignment?.sourceChain) {
      const sourceChain = assignment.sourceChain; const initial = this.variableClass(file, sourceChain.variable, assignment.start, visited, true);
      if (!initial) return undefined; let target: ObjectClass = initial; let directPropertyPath: string[] | undefined = [];
      for (const step of sourceChain.steps) {
        if (target.nullable && !step.nullsafe) return undefined;
        const declaredMember = this.members(target.fqcn, scope.containerFqcn, new Set(), false, target.typeArguments)
          .find((item) => item.kind === step.kind && !item.static && item.name.toLowerCase() === step.name.toLowerCase());
        const member = declaredMember && step.kind === 'method' ? this.withInferredGeneratorReturn(declaredMember) : declaredMember;
        if (!member) return undefined;
        if (directPropertyPath && step.kind === 'property') directPropertyPath.push(step.name);
        else directPropertyPath = undefined;
        const assertedProperty = directPropertyPath
          ? this.assertedPropertyPathClass(file, sourceChain.variable, directPropertyPath, assignment.start, scope) : undefined;
        if (assertedProperty) { target = assertedProperty; continue; }
        const methodArguments = step.kind === 'method' && step.callback ? this.methodTemplateArguments(file, assignment.start, member, step.callback) : undefined;
        const returned: ObjectClass | undefined = step.kind === 'method' && step.literalArgument !== undefined
          ? this.literalMethodReturnClass(target.fqcn, member.name, step.literalArgument)
            ?? this.memberReturnClass({ ...member, templateArguments: { ...member.templateArguments, ...methodArguments } }, true)
          : this.memberReturnClass({ ...member, templateArguments: { ...member.templateArguments, ...methodArguments } }, true);
        if (!returned) return undefined;
        target = { ...returned, nullable: returned.nullable || (target.nullable && step.nullsafe) };
      }
      return target.nullable && !allowNullable ? undefined : target;
    }
    if (assignment?.sourceMember) {
      const sourceMember = assignment.sourceMember;
      const owner = this.variableClass(file, sourceMember.variable, assignment.start, visited, true);
      if (!owner || (owner.nullable && !sourceMember.nullsafe)) return undefined;
      const member = this.members(owner.fqcn, scope.containerFqcn, new Set(), false, owner.typeArguments)
        .find((item) => item.kind === 'property' && !item.static && item.name.toLowerCase() === sourceMember.member.toLowerCase());
      const assertedProperty = member && this.assertedPropertyClass(file, sourceMember.variable, sourceMember.member, assignment.start, scope);
      if (assertedProperty) return assertedProperty;
      const returned = member && this.memberReturnClass(member, true); if (!returned) return undefined;
      const nullable = returned.nullable || (owner.nullable && sourceMember.nullsafe);
      return nullable && !allowNullable ? undefined : { ...returned, nullable };
    }
    if (assignment?.sourceArrayElement) {
      const shaped = this.variableShapeElementClass(file, assignment.sourceArrayElement.variable,
        [assignment.sourceArrayElement.key], assignment.start, allowNullable);
      if (shaped) return shaped;
    }
    if (assignment?.sourceIterable) {
      const sourceIterable = assignment.sourceIterable;
      const iterableType = this.provenArgumentType(file, sourceIterable.start, sourceIterable.end);
      const element = iterableType && this.delegatedGeneratorTypes(iterableType)?.value;
      const elementObject = element && this.objectType(displayType(element), allowNullable);
      const elementFqcn = elementObject && this.resolveType(file, elementObject.name,
        this.namespaceAt(file, sourceIterable.start), scope.containerFqcn);
      if (elementFqcn && this.fileAndDeclaration(elementFqcn)) return { fqcn: elementFqcn, nullable: elementObject!.nullable };
      if (sourceIterable.kind === 'member') {
        const iterable = sourceIterable;
        const owner = this.variableClass(file, iterable.variable, assignment.start, visited, true);
        const member = owner && this.members(owner.fqcn, scope.containerFqcn, new Set(), false, owner.typeArguments)
          .find((item) => item.kind === iterable.memberKind && !item.static && item.name.toLowerCase() === iterable.member.toLowerCase());
        if (member?.iterableValueType) {
          const memberFile = this.files.get(member.uri);
          const memberNamespace = member.typeScopeFqcn.split('\\').slice(0, -1).join('\\');
          const fqcn = memberFile && this.resolveType(memberFile, member.iterableValueType, memberNamespace, member.typeScopeFqcn);
          if (fqcn && this.fileAndDeclaration(fqcn)) return { fqcn, nullable: false };
        }
        const memberFile = member && this.files.get(member.uri);
        const inferred = member?.returnType && memberFile
          ? this.iterableElementClass(memberFile, member.returnType, member.start, member.typeScopeFqcn, allowNullable)
          : undefined;
        if (inferred) return inferred;
        return undefined;
      }
      const owner = this.variableClass(file, sourceIterable.variable, assignment.start, visited, true);
      const valueType = owner && !owner.nullable && owner.typeArguments
        ? this.genericIterableValueType(owner.fqcn, owner.typeArguments) : undefined;
      const valueObject = valueType && this.objectType(valueType, allowNullable);
      const valueFqcn = valueObject && this.resolveType(file, valueObject.name, this.namespaceAt(file, assignment.start), scope.containerFqcn);
      if (valueFqcn && this.fileAndDeclaration(valueFqcn)) return { fqcn: valueFqcn, nullable: valueObject!.nullable };
      const parameter = scope.parameters.find((item) => `$${item.name}` === sourceIterable.variable);
      const mutations = this.priorReferenceMutations(file, scope, sourceIterable.variable, assignment.start);
      const preservesValue = mutations.every((mutation) => mutation.builtin
        && ['array_pop', 'array_shift', 'sort', 'shuffle', 'usort'].includes(mutation.name));
      const inferred = preservesValue && parameter?.type
        ? this.iterableElementClass(file, parameter.type, assignment.start, scope.containerFqcn, allowNullable)
        : undefined;
      if (inferred) return inferred;
      return undefined;
    }
    if (assignment?.sourceCall) {
      const call = file.calls.filter((candidate) => candidate.start >= assignment.start && candidate.end <= assignment.end)
        .sort((left, right) => right.end - right.start - (left.end - left.start))[0];
      const result = call
        ? this.callResultType(file, call.start, call.end) ?? this.callableVariableResultType(file, call.start, call.end)
        : assignment.sourceCall.kind === 'callable-variable' ? this.callableVariableResultType(file, assignment.start, assignment.end) : undefined;
      const object = result && this.objectType(displayType(result), allowNullable);
      if (object) {
        const namespace = this.namespaceAt(file, assignment.start);
        const fqcn = this.resolveType(file, object.name, namespace, scope.containerFqcn);
        const typeArguments = fqcn ? this.templateArgumentsFor(fqcn, object.arguments, file, namespace, scope.containerFqcn) : undefined;
        if (fqcn && (!object.arguments.length || typeArguments)) return { fqcn, nullable: object.nullable, typeArguments };
      }
    }
    if (assignment?.sourceCall?.kind === 'function') {
      const fqfn = this.resolveFunction(file, assignment.sourceCall.name, this.namespaceAt(file, assignment.start));
      const found = [...this.files.values()].flatMap((candidate) => candidate.callables.map((item) => ({ file: candidate, item })))
        .find(({ item }) => item.kind === 'function' && item.fqcn.toLowerCase() === fqfn.toLowerCase());
      const returned = found && this.callableReturnClass(found.file, found.item.returnType, found.item.fqcn, allowNullable);
      if (returned) return returned;
    }
    if (assignment?.sourceCall?.kind === 'callable-variable') {
      const sourceCall = assignment.sourceCall;
      const parameter = scope.parameters.find((item) => `$${item.name}` === sourceCall.variable);
      const callable = parameter?.type ? parsePhpDocType(parameter.type).type : undefined;
      if (callable?.kind === 'callable' && callable.returnType) {
        const returned = this.objectType(displayPhpDocType(callable.returnType), allowNullable);
        const fqcn = returned && this.resolveType(file, returned.name, this.namespaceAt(file, assignment.start), scope.containerFqcn);
        if (fqcn && this.fileAndDeclaration(fqcn)) return { fqcn, nullable: returned!.nullable };
      }
    }
    if (assignment?.sourceCall?.kind === 'static') {
      const sourceCall = assignment.sourceCall;
      const namespace = this.namespaceAt(file, assignment.start); const accessFrom = scope.containerFqcn;
      const owner = this.resolveSourceType(file, sourceCall.typeName, namespace, accessFrom);
      const member = owner && this.members(owner, accessFrom).find((item) => item.kind === 'method' && item.static && item.name.toLowerCase() === sourceCall.method.toLowerCase());
      const returned = member && this.memberReturnClass(member, allowNullable);
      if (returned) return returned;
    }
    if (assignment?.sourceCall?.kind === 'member') {
      const sourceCall = assignment.sourceCall;
      if (sourceCall.dynamic) return undefined;
      const owner = this.variableClass(file, sourceCall.variable, assignment.start, visited);
      const member = owner && this.members(owner.fqcn, scope.containerFqcn, new Set(), false, owner.typeArguments)
        .find((item) => item.kind === 'method' && !item.static && item.name.toLowerCase() === sourceCall.method.toLowerCase());
      const methodArguments: Record<string, string> | undefined = member && sourceCall.callback ? this.methodTemplateArguments(file, assignment.start, member, sourceCall.callback) : undefined;
      const returned = member && sourceCall.literalArgument !== undefined
        ? this.literalMethodReturnClass(owner!.fqcn, member.name, sourceCall.literalArgument)
          ?? this.memberReturnClass({ ...member, templateArguments: { ...member.templateArguments, ...methodArguments } }, allowNullable)
        : member && this.memberReturnClass({ ...member, templateArguments: { ...member.templateArguments, ...methodArguments } }, allowNullable);
      if (returned) return returned;
    }
    // Any later assignment supersedes the parameter and branch fact. If its
    // result type cannot be proven above, keeping the earlier narrowing would
    // expose stale members and can cascade into false diagnostics.
    if (assignment) {
      const inferred = this.linearLocalValueType(file, variable, offset, true);
      const composite = inferred && this.objectGroups(inferred); const first = composite?.groups[0]?.[0];
      return composite && first && composite.groups.flat().every((candidate) => this.fileAndDeclaration(candidate.fqcn))
        && (!composite.nullable || allowNullable) ? { ...first, nullable: composite.nullable, groups: composite.groups } : undefined;
    }
    const asserted = this.assertedParameterClass(file, variable, offset, scope); if (asserted) return asserted;
    let predicateTarget: string | undefined; let predicateBuiltin = false;
    if (narrowing?.kind === 'type-predicate' || narrowing?.kind === 'subclass-predicate') {
      const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
      const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset)).toLowerCase();
      predicateBuiltin = resolved === builtin;
      const candidate = predicateBuiltin
        ? this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn) : undefined;
      predicateTarget = candidate && this.fileAndDeclaration(candidate) ? candidate : undefined;
    }
    const parameter = scope.parameters.find((item) => `$${item.name}` === variable);
    if (!parameter?.type) {
      const contextual = this.contextualClosureParameterClass(file, scope, variable, allowNullable);
      if (contextual) return contextual;
      const capture = scope.captures.find((item) => item.variable === variable);
      const inherited = scope.kind === 'arrow' || (scope.kind === 'closure' && capture && !capture.byReference);
      if (inherited && scope.parentId) return this.variableClass(file, variable, Math.max(0, scope.start - 1), visited, allowNullable);
      return undefined;
    }
    let parameterType = narrowing?.kind === 'non-null' ? parameter.type.replace(/^\?/, '').split('|').filter((item) => item.toLowerCase() !== 'null').join('|') : parameter.type;
    const resolveParameterTypeName = (name: string, namespace: string): string | undefined => parameter.nativeType
      ? this.resolveSourceType(file, name, namespace, scope.containerFqcn)
      : this.resolveType(file, name, namespace, scope.containerFqcn);
    if (narrowing?.kind === 'type-predicate' && predicateBuiltin && narrowing.typeName.toLowerCase() === 'object') {
      const namespace = this.namespaceAt(file, offset);
      parameterType = parameterType.split('|').filter((item) => {
        const fqcn = resolveParameterTypeName(item.trim(), namespace);
        const matches = Boolean(fqcn && this.fileAndDeclaration(fqcn));
        return narrowing.negated ? !matches : matches;
      }).join('|');
    }
    if (narrowing?.kind === 'type-predicate' && predicateTarget) {
      const namespace = this.namespaceAt(file, offset); const target = predicateTarget;
      const retained = parameterType.split('|').flatMap((item): string[] => {
        const normalized = item.trim(); const candidate = resolveParameterTypeName(item.trim(), namespace);
        if (candidate && this.fileAndDeclaration(candidate)) {
          const matches = candidate.toLowerCase() === target.toLowerCase() || this.isSubclassOf(candidate, target);
          if (narrowing.negated) return matches ? [] : [normalized];
          if (matches) return [normalized];
          return this.isSubclassOf(target, candidate) ? [`\\${target}`] : [];
        }
        if (narrowing.negated) return [normalized];
        return ['mixed', 'object'].includes(normalized.toLowerCase()) ? [`\\${target}`] : [];
      });
      parameterType = [...new Set(retained)].join('|');
    }
    if (narrowing?.kind === 'not-instanceof') {
      const namespace = this.namespaceAt(file, offset);
      const excluded = (predicateTarget ?? this.resolveSourceType(file, narrowing.typeName, namespace, scope.containerFqcn))?.toLowerCase();
      parameterType = parameterType.split('|').filter((item) => resolveParameterTypeName(item.trim(), namespace)?.toLowerCase() !== excluded).join('|');
    }
    if (narrowing?.kind === 'subclass-predicate' && predicateTarget) {
      const namespace = this.namespaceAt(file, offset);
      parameterType = parameterType.split('|').filter((item) => {
        const candidate = resolveParameterTypeName(item.trim(), namespace);
        const matches = Boolean(candidate && candidate.toLowerCase() !== predicateTarget!.toLowerCase()
          && this.isSubclassOf(candidate, predicateTarget!));
        return narrowing.negated ? !matches : matches;
      }).join('|');
    }
    const type = this.objectType(parameterType, allowNullable);
    if (!type) return undefined;
    const namespace = this.namespaceAt(file, offset);
    const fqcn = resolveParameterTypeName(type.name, namespace);
    if (!fqcn) return undefined;
    const typeArguments = this.templateArgumentsFor(fqcn, type.arguments, file, namespace, scope.containerFqcn);
    return { fqcn, nullable: type.nullable, typeArguments };
  }

  private iterableElementClass(file: SemanticFile, typeText: string, offset: number, scopeFqcn: string | undefined, allowNullable: boolean): ObjectClass | undefined {
    let iterable = parsePhpDocType(typeText).type;
    if (iterable?.kind === 'nullable') iterable = iterable.type;
    let element: PhpDocType | undefined;
    if (iterable?.kind === 'array') element = iterable.element;
    else if (iterable?.kind === 'name') {
      const namespace = this.namespaceAt(file, offset);
      const owner = this.resolveType(file, iterable.name, namespace, scopeFqcn);
      const valueType = owner && this.genericIterableValueType(owner, {});
      const object = valueType && this.objectType(valueType, allowNullable);
      const fqcn = object && this.resolveType(file, object.name, namespace, scopeFqcn);
      if (fqcn && this.fileAndDeclaration(fqcn)) return { fqcn, nullable: object!.nullable };
    }
    else if (iterable?.kind === 'generic' && iterable.base.kind === 'name') {
      const base = iterable.base.name.toLowerCase();
      if (['list', 'non-empty-list', 'iterable'].includes(base)) element = iterable.arguments[0];
      else if (['array', 'non-empty-array'].includes(base)) element = iterable.arguments.length > 1 ? iterable.arguments[1] : iterable.arguments[0];
      else {
        const namespace = this.namespaceAt(file, offset);
        const owner = this.resolveType(file, iterable.base.name, namespace, scopeFqcn);
        const arguments_ = iterable.arguments.map(displayPhpDocType);
        const mapping = owner && this.templateArgumentsFor(owner, arguments_, file, namespace, scopeFqcn);
        const valueType = owner && mapping && this.genericIterableValueType(owner, mapping);
        const object = valueType && this.objectType(valueType, allowNullable);
        const fqcn = object && this.resolveType(file, object.name, namespace, scopeFqcn);
        if (fqcn && this.fileAndDeclaration(fqcn)) return { fqcn, nullable: object!.nullable };
      }
    } else if (iterable?.kind === 'shape' && iterable.shapeKind === 'array' && iterable.fields.length) {
      const displayed = iterable.fields.map((field) => displayPhpDocType(field.type));
      if (displayed.every((type) => type === displayed[0])) element = iterable.fields[0]!.type;
    }
    const object = element && this.objectType(displayPhpDocType(element), allowNullable);
    const fqcn = object && this.resolveType(file, object.name, this.namespaceAt(file, offset), scopeFqcn);
    if (fqcn && this.fileAndDeclaration(fqcn)) return { fqcn, nullable: object!.nullable };
    return undefined;
  }

  private genericIterableValueType(fqcn: string, typeArguments: Record<string, string>, visited = new Set<string>()): string | undefined {
    const key = fqcn.toLowerCase(); if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return undefined; visited.add(key);
    const owner = this.fileAndDeclaration(fqcn); if (!owner) return undefined;
    const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
    for (const relation of owner.file.genericParents.filter((item) => item.ownerFqcn.toLowerCase() === key)) {
      const parent = this.resolveType(owner.file, relation.parentName, namespace, fqcn); if (!parent) continue;
      const arguments_ = relation.arguments.map((argument) => specializeTemplateType(argument, typeArguments) ?? argument);
      const iterable = parent.toLowerCase();
      if (iterable === 'iteratoraggregate' || iterable === 'traversable' || iterable === 'iterator') return arguments_.length > 1 ? arguments_[1] : arguments_[0];
      const inheritedArguments = this.templateArgumentsFor(parent, arguments_, owner.file, namespace, fqcn);
      const value = inheritedArguments && this.genericIterableValueType(parent, inheritedArguments, new Set(visited));
      if (value) return value;
    }
    return undefined;
  }

  private objectType(type: string, allowNullable: boolean): { name: string; nullable: boolean; arguments: string[] } | undefined {
    let parsed = parsePhpDocType(type).type; if (!parsed) return undefined;
    let mayBeNull = false;
    if (parsed.kind === 'nullable') { mayBeNull = true; parsed = parsed.type; }
    if (parsed.kind === 'union') {
      const remaining = parsed.types.filter((item) => !(item.kind === 'name' && item.name.toLowerCase() === 'null'));
      mayBeNull ||= remaining.length !== parsed.types.length;
      if (remaining.length !== 1) return undefined;
      parsed = remaining[0]!;
    }
    if (mayBeNull && !allowNullable) return undefined;
    if (parsed.kind === 'generic' && parsed.base.kind === 'name') {
      return { name: parsed.base.name, nullable: mayBeNull, arguments: parsed.arguments.map(displayPhpDocType) };
    }
    return parsed.kind === 'name' ? { name: parsed.name, nullable: mayBeNull, arguments: [] } : undefined;
  }

  private templateArgumentsFor(ownerFqcn: string, arguments_: string[], contextFile: SemanticFile, namespace: string, scopeFqcn?: string): Record<string, string> | undefined {
    const owner = this.fileAndDeclaration(ownerFqcn);
    const templates = owner?.file.templates.filter((item) => item.ownerFqcn.toLowerCase() === ownerFqcn.toLowerCase()) ?? [];
    if (!owner || templates.length !== arguments_.length) return undefined;
    const primitives = new Set(['array', 'array-key', 'bool', 'callable', 'false', 'float', 'int', 'iterable', 'mixed', 'never', 'null', 'object', 'string', 'true', 'void']);
    const resolved = arguments_.map((argument) => {
      const normalized = argument.trim();
      if (primitives.has(normalized.toLowerCase())) return normalized.toLowerCase();
      const parsedType = parsePhpDocType(normalized).type;
      if (parsedType?.kind === 'union' && parsedType.types.every((item) => item.kind === 'name' && ['int', 'string'].includes(item.name.toLowerCase()))) {
        return displayPhpDocType(parsedType);
      }
      const object = this.objectType(normalized, false);
      if (object && !object.arguments.length) {
        const fqcn = this.resolveType(contextFile, object.name, namespace, scopeFqcn);
        return fqcn && this.fileAndDeclaration(fqcn) ? fqcn : undefined;
      }
      const documented = parsedType && this.phpDocDiagnosticType(contextFile, parsedType, scopeFqcn);
      return documented ? displayType(documented) : undefined;
    });
    const valid = resolved.every((argument, index) => {
      if (!argument) return false;
      const bound = templates[index]?.bound; if (!bound) return true;
      if (bound.toLowerCase() === 'array-key') return argument.toLowerCase().split('|').every((part) => part === 'int' || part === 'string');
      const argumentObject = this.objectType(argument, false);
      const argumentFqcn = argumentObject && this.resolveType(contextFile, argumentObject.name, namespace, scopeFqcn);
      if (bound.toLowerCase() === 'object') return Boolean(argumentFqcn && this.fileAndDeclaration(argumentFqcn));
      if (primitives.has(bound.toLowerCase())) return argument.toLowerCase() === bound.toLowerCase();
      if (!argumentFqcn) return false;
      const boundType = this.objectType(bound, false); if (!boundType || boundType.arguments.length) return false;
      const ownerNamespace = ownerFqcn.split('\\').slice(0, -1).join('\\');
      const boundFqcn = this.resolveType(owner.file, boundType.name, ownerNamespace, ownerFqcn);
      return Boolean(boundFqcn && this.fileAndDeclaration(boundFqcn) && this.isSubclassOf(argumentFqcn, boundFqcn));
    });
    return valid ? Object.fromEntries(templates.map((template, index) => [template.name, resolved[index]!])) : undefined;
  }

  private constructedTypeArguments(file: SemanticFile, assignment: ParsedAssignment, fqcn: string,
    accessFrom?: string): Record<string, string> | undefined {
    const owner = this.fileAndDeclaration(fqcn);
    const templates = owner?.file.templates.filter((template) => template.ownerFqcn.toLowerCase() === fqcn.toLowerCase()) ?? [];
    if (!owner || !templates.length) return undefined;
    const calls = file.calls.filter((call) => call.kind === 'constructor' && call.start >= assignment.start && call.end <= assignment.end)
      .filter((call) => this.resolveSourceType(file, file.source.slice(call.nameStart, call.nameEnd),
        this.namespaceAt(file, call.nameStart), accessFrom)?.toLowerCase() === fqcn.toLowerCase());
    if (calls.length !== 1) return undefined;
    const constructors = this.constructorsFor(fqcn).filter(({ callable }) => callable.containerFqcn?.toLowerCase() === fqcn.toLowerCase());
    if (constructors.length !== 1) return undefined;
    const { file: declarationFile, callable } = constructors[0]!;
    const constructorDoc = adjacentPhpDoc(declarationFile, callable.declarationStart);
    const parameters = callable.parameters.map((parameter) => {
      const documented = preferredDocTags(constructorDoc,
        (tag) => tag.name === 'param' && tag.variable === `$${parameter.name}` && Boolean(tag.type),
        (tag) => tag.variable ?? '').at(-1)?.type;
      const documentedText = documented && displayPhpDocType(documented);
      return documentedText && templates.some((template) => new RegExp(`(?<![A-Za-z0-9_\\\\])${template.name}(?![A-Za-z0-9_])`).test(documentedText))
        ? { ...parameter, type: documentedText } : parameter;
    });
    const signature: SignatureInfo = {
      kind: 'method', uri: declarationFile.uri, start: callable.start, end: callable.end, name: owner.declaration.name,
      fqcn: callable.fqcn, parameters, returnType: fqcn, visibility: callable.visibility, static: false,
      typeScopeFqcn: callable.containerFqcn!, calledOnFqcn: fqcn, activeParameter: 0, usedNamedArguments: [],
    };
    const inferred = this.callTemplateArguments(file, calls[0]!, signature, declarationFile, templates);
    if (inferred?.length !== 1 || templates.some((template) => !inferred[0]![template.name])) return undefined;
    return this.callArgumentsCompatible(file, calls[0]!, signature, declarationFile, inferred[0]) ? inferred[0] : undefined;
  }

  private methodCompatibilityReason(file: SemanticFile, method: ParsedCallableDeclaration, inherited: MemberInfo): string | undefined {
    const inheritedFile = this.files.get(inherited.uri);
    const parent = inheritedFile?.callables.find((item) => item.kind === 'method' && item.fqcn.toLowerCase() === inherited.fqcn.toLowerCase());
    if (!inheritedFile || !parent) return undefined;
    if (/\bfinal\b/i.test(inheritedFile.source.slice(parent.declarationStart, parent.start))) return 'a final method cannot be overridden';
    if (method.static !== parent.static) return parent.static ? 'the overriding method must be static' : 'the overriding method must not be static';
    const visibility = { private: 0, protected: 1, public: 2 } as const;
    if (visibility[method.visibility] < visibility[parent.visibility]) return `visibility cannot be more restrictive than ${parent.visibility}`;
    const parentRequired = parent.parameters.filter((parameter) => parameter.defaultValue === undefined && !parameter.variadic).length;
    const childRequired = method.parameters.filter((parameter) => parameter.defaultValue === undefined && !parameter.variadic).length;
    if (childRequired > parentRequired) return `it requires ${childRequired} parameter(s), inherited declaration requires ${parentRequired}`;
    const childVariadic = method.parameters.at(-1)?.variadic ? method.parameters.at(-1) : undefined;
    if (!childVariadic && method.parameters.length < parent.parameters.length) return 'it accepts fewer parameters than the inherited declaration';
    if (parent.parameters.at(-1)?.variadic && !childVariadic) return 'it must remain variadic';
    const relation = { isSubclassOf: (candidate: string, target: string): boolean | undefined => {
      if (!this.fileAndDeclaration(candidate) || !this.fileAndDeclaration(target)) return undefined;
      return this.isSubclassOf(candidate, target);
    } };
    for (let index = 0; index < parent.parameters.length; index += 1) {
      const expected = parent.parameters[index]!;
      const actual = method.parameters[index] ?? childVariadic;
      if (!actual) return 'it accepts fewer parameters than the inherited declaration';
      if (expected.variadic && !actual.variadic) return `parameter $${expected.name} has incompatible variadic semantics`;
      if (expected.byReference !== actual.byReference) return `parameter $${expected.name} has incompatible reference semantics`;
      const parentType = this.nativeSourceType(inheritedFile, expected.nativeType, parent.containerFqcn);
      const childType = this.nativeSourceType(file, actual.nativeType, method.containerFqcn);
      if (compatibility(parentType, childType, relation) === 'no') return `parameter $${expected.name} narrows the inherited parameter type`;
    }
    const parentReturn = this.nativeSourceType(inheritedFile, parent.nativeReturnType, parent.containerFqcn);
    const childReturn = this.nativeSourceType(file, method.nativeReturnType, method.containerFqcn);
    if (compatibility(childReturn, parentReturn, relation) === 'no') return 'return type is not covariant with the inherited return type';
    return undefined;
  }

  private ancestorPropertyDeclarations(fqcn: string, visited = new Set<string>()): Array<{ file: SemanticFile; declaration: ParsedPropertyDeclaration }> {
    const key = fqcn.toLowerCase();
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return [];
    visited.add(key);
    const owner = this.fileAndDeclaration(fqcn); if (!owner) return [];
    const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
    return [...owner.declaration.extendsNames, ...owner.declaration.implementsNames].flatMap((name) => {
      const inherited = this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn);
      const parent = inherited && this.fileAndDeclaration(inherited); if (!inherited || !parent) return [];
      const own = parent.file.properties.filter((property) => property.containerFqcn.toLowerCase() === inherited.toLowerCase())
        .map((property) => ({ file: parent.file, declaration: property }));
      return [...own, ...this.ancestorPropertyDeclarations(inherited, visited)];
    });
  }

  private effectiveProperty(fqcn: string, name: string, visited = new Set<string>()): EffectiveProperty | undefined {
    const key = fqcn.toLowerCase();
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return undefined;
    visited.add(key);
    const owner = this.fileAndDeclaration(fqcn); if (!owner || owner.declaration.kind === 'interface') return undefined;
    const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const inheritedCandidates = [...owner.declaration.traitNames, ...owner.declaration.extendsNames.slice(0, 1)].flatMap((parentName) => {
      const parent = this.resolveSourceType(owner.file, parentName, namespace, owner.declaration.fqcn);
      const inherited = parent ? this.effectiveProperty(parent, name, new Set(visited)) : undefined;
      return inherited ? [inherited] : [];
    });
    const inherited = inheritedCandidates[0];
    const property = owner.file.properties.find((item) => item.containerFqcn.toLowerCase() === key && item.name === name);
    if (!property) return inherited;
    const hooks = property.hooks;
    const get = hooks?.find((hook) => hook.kind === 'get');
    const set = hooks?.find((hook) => hook.kind === 'set');
    const defaultOperations = !hooks?.length || property.virtual === false;
    const readable = get ? !get.abstract : defaultOperations || Boolean(inherited?.readable);
    const writable = !property.readonly && (set ? !set.abstract : defaultOperations || Boolean(inherited?.writable));
    return {
      file: owner.file, declaration: property, readable, writable,
      readType: property.type ?? inherited?.readType,
      writeType: set && !set.abstract ? property.writeType ?? property.type
        : defaultOperations ? property.type : inherited?.writeType,
      readVisibility: property.visibility,
      writeVisibility: property.writeVisibility ?? property.visibility,
    };
  }

  private declaredPropertyContract(file: SemanticFile, property: ParsedPropertyDeclaration, abstractOnly = false): EffectiveProperty {
    const abstractGet = property.hooks?.some((hook) => hook.kind === 'get' && hook.abstract) ?? false;
    const abstractSet = property.hooks?.some((hook) => hook.kind === 'set' && hook.abstract) ?? false;
    const readable = abstractOnly ? abstractGet : property.readable ?? true;
    const writable = abstractOnly ? abstractSet : property.writable ?? !property.readonly;
    return {
      file, declaration: property, readable, writable,
      readType: property.type,
      writeType: property.writeType ?? property.type,
      readVisibility: property.visibility,
      writeVisibility: property.writeVisibility ?? property.visibility,
    };
  }

  private propertyContractReason(candidate: EffectiveProperty, required: EffectiveProperty): string | undefined {
    const visibility = { private: 0, protected: 1, public: 2 } as const;
    if (required.readable && !candidate.readable) return 'the inherited get operation is not implemented';
    if (required.writable && !candidate.writable) return 'the inherited set operation is not implemented';
    if (required.readable && visibility[candidate.readVisibility] < visibility[required.readVisibility]) {
      return `get visibility cannot be more restrictive than ${required.readVisibility}`;
    }
    if (required.writable && visibility[candidate.writeVisibility] < visibility[required.writeVisibility]) {
      return `set visibility cannot be more restrictive than ${required.writeVisibility}`;
    }
    const relation = this.typeRelationContext();
    if (required.readable) {
      const child = this.nativeSourceType(candidate.file, candidate.readType, candidate.declaration.containerFqcn);
      const parent = this.nativeSourceType(required.file, required.readType, required.declaration.containerFqcn);
      if (compatibility(child, parent, relation) === 'no') return 'get type is not covariant with the inherited property type';
    }
    if (required.writable) {
      const parent = this.nativeSourceType(required.file, required.writeType, required.declaration.containerFqcn);
      const child = this.nativeSourceType(candidate.file, candidate.writeType, candidate.declaration.containerFqcn);
      if (compatibility(parent, child, relation) === 'no') return 'set type is not contravariant with the inherited property type';
    }
    return undefined;
  }

  private usedImportKeys(file: SemanticFile): Set<string> {
    const chars = file.source.split('');
    const statements = [...new Map(file.imports.map((item) => [item.statementStart, { start: item.statementStart, end: item.statementEnd }])).values()];
    for (const range of [...file.commentRanges, ...file.stringRanges, ...statements]) {
      for (let offset = range.start; offset < range.end; offset += 1) chars[offset] = chars[offset] === '\n' || chars[offset] === '\r' ? chars[offset]! : ' ';
    }
    const searchable = chars.join('');
    return new Set(file.imports.flatMap((item) => {
      const escaped = item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = item.kind === 'const' ? 'u' : 'iu';
      const phpDocUse = item.kind === 'class' && file.rawNames.some((name) => name.context === 'phpdoc'
        && this.resolveSourceType(file, name.text, this.namespaceAt(file, name.start))?.toLowerCase() === item.fqcn.toLowerCase());
      return phpDocUse || new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, flags).test(searchable)
        ? [`${item.statementStart}:${item.start}`] : [];
    }));
  }

  private nativeType(file: SemanticFile, input: string | undefined, scopeFqcn?: string, budget = { remaining: 256 }, sourceNames = false): PhpType {
    if (budget.remaining-- <= 0) return unknown('native type expansion budget exceeded');
    if (!input) return primitive('mixed');
    let text = input.replace(/\s+/g, '');
    while (text.startsWith('(') && text.endsWith(')')) {
      let depth = 0; let wraps = true;
      for (let index = 0; index < text.length; index += 1) {
        depth += text[index] === '(' ? 1 : text[index] === ')' ? -1 : 0;
        if (depth === 0 && index < text.length - 1) { wraps = false; break; }
      }
      if (!wraps) break; text = text.slice(1, -1);
    }
    if (text.startsWith('?')) return nullable(this.nativeType(file, text.slice(1), scopeFqcn, budget, sourceNames));
    const split = (separator: '|' | '&'): string[] => {
      const parts: string[] = []; let depth = 0; let start = 0;
      for (let index = 0; index < text.length; index += 1) {
        depth += text[index] === '(' ? 1 : text[index] === ')' ? -1 : 0;
        if (depth === 0 && text[index] === separator) { parts.push(text.slice(start, index)); start = index + 1; }
      }
      return parts.length ? [...parts, text.slice(start)] : [];
    };
    const unions = split('|'); if (unions.length) return union(...unions.map((item) => this.nativeType(file, item, scopeFqcn, budget, sourceNames)));
    const intersections = split('&'); if (intersections.length) return intersection(...intersections.map((item) => this.nativeType(file, item, scopeFqcn, budget, sourceNames)));
    const lower = text.toLowerCase();
    const primitives = new Set<PrimitiveName>(['bool', 'int', 'float', 'string', 'array', 'object', 'callable', 'iterable', 'resource', 'null', 'void', 'never', 'mixed']);
    if (primitives.has(lower as PrimitiveName)) return primitive(lower as PrimitiveName);
    if (lower === 'true') return literal(true);
    if (lower === 'false') return literal(false);
    if (lower === 'static') return unknown('late-static type');
    const namespace = scopeFqcn?.split('\\').slice(0, -1).join('\\') ?? file.namespace;
    const resolved = sourceNames ? this.resolveSourceType(file, text, namespace, scopeFqcn) : this.resolveType(file, text, namespace, scopeFqcn);
    return resolved && this.fileAndDeclaration(resolved) ? named(resolved) : unknown(`unresolved native type ${text}`);
  }

  private nativeSourceType(file: SemanticFile, input: string | undefined, scopeFqcn?: string): PhpType {
    return this.nativeType(file, input, scopeFqcn, { remaining: 256 }, true);
  }

  private documentedClassString(file: SemanticFile, input: string | undefined, scopeFqcn?: string): PhpType | undefined {
    if (!input) return undefined;
    const parsed = parsePhpDocType(input).type;
    if (parsed?.kind === 'name' && parsed.name.toLowerCase() === 'class-string') return classString();
    if (parsed?.kind !== 'generic' || parsed.base.kind !== 'name' || parsed.base.name.toLowerCase() !== 'class-string' || parsed.arguments.length !== 1) return undefined;
    const bound = this.nativeType(file, displayPhpDocType(parsed.arguments[0]!), scopeFqcn);
    return bound.kind === 'named' ? classString(bound) : undefined;
  }

  private documentedList(file: SemanticFile, input: string | undefined, scopeFqcn?: string): PhpType | undefined {
    if (!input) return undefined;
    const parsed = parsePhpDocType(input).type;
    if (parsed?.kind !== 'generic' || parsed.base.kind !== 'name' || parsed.arguments.length !== 1) return undefined;
    const base = parsed.base.name.toLowerCase(); if (base !== 'list' && base !== 'non-empty-list') return undefined;
    const value = this.nativeType(file, displayPhpDocType(parsed.arguments[0]!), scopeFqcn);
    return value.kind === 'unknown' ? undefined : listType(value, base === 'non-empty-list');
  }

  private documentedShape(file: SemanticFile, input: string | undefined, scopeFqcn?: string): PhpType | undefined {
    if (!input) return undefined;
    const parsed = parsePhpDocType(input).type;
    return parsed?.kind === 'shape' ? this.phpDocDiagnosticType(file, parsed, scopeFqcn) : undefined;
  }

  private documentedCallable(file: SemanticFile, input: string | undefined, scopeFqcn?: string): PhpType | undefined {
    if (!input) return undefined;
    const parsed = parsePhpDocType(input).type;
    return parsed?.kind === 'callable' ? this.phpDocDiagnosticType(file, parsed, scopeFqcn) : undefined;
  }

  private documentedGeneric(file: SemanticFile, input: string | undefined, scopeFqcn?: string): PhpType | undefined {
    if (!input) return undefined;
    const parsed = parsePhpDocType(input).type;
    return parsed?.kind === 'generic' ? this.phpDocDiagnosticType(file, parsed, scopeFqcn) : undefined;
  }

  private genericVariance(baseName: string): readonly GenericVariance[] | undefined {
    const owner = this.fileAndDeclaration(baseName); if (!owner || !this.hasCompleteHierarchy(baseName)) return undefined;
    const templates = owner.file.templates.filter((template) => template.ownerFqcn.toLowerCase() === baseName.toLowerCase());
    return templates.length ? templates.map((template) => template.variance) : undefined;
  }

  private genericSupertype(sourceBaseName: string, sourceArguments: readonly PhpType[], targetBaseName: string): PhpType | undefined {
    if (!this.hasCompleteHierarchy(sourceBaseName) || !this.fileAndDeclaration(targetBaseName)) return undefined;
    const resolve = (baseName: string, arguments_: readonly PhpType[], visited: Set<string>): PhpType[] => {
      const key = baseName.toLowerCase(); if (visited.has(key) || visited.size >= MAX_SEMANTIC_GRAPH_DEPTH) return [];
      const owner = this.fileAndDeclaration(baseName); if (!owner) return [];
      const templates = owner.file.templates.filter((template) => template.ownerFqcn.toLowerCase() === key);
      if (templates.length !== arguments_.length) return [];
      const templateArguments = Object.fromEntries(templates.map((template, index) => [template.name, displayType(arguments_[index]!) ]));
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const results: PhpType[] = [];
      for (const relation of owner.file.genericParents.filter((item) => item.ownerFqcn.toLowerCase() === key)) {
        const parent = this.resolveType(owner.file, relation.parentName, namespace, baseName); if (!parent) continue;
        const nativeParents = (relation.kind === 'extends' ? owner.declaration.extendsNames : owner.declaration.implementsNames)
          .map((name) => this.resolveType(owner.file, name, namespace, baseName)?.toLowerCase());
        if (!nativeParents.includes(parent.toLowerCase())) continue;
        const parentOwner = this.fileAndDeclaration(parent); if (!parentOwner) continue;
        const parentTemplates = parentOwner.file.templates.filter((template) => template.ownerFqcn.toLowerCase() === parent.toLowerCase());
        if (relation.arguments.length !== parentTemplates.length) continue;
        const parentArguments = relation.arguments.map((argument) => {
          const specialized = specializeTemplateType(argument, templateArguments);
          const parsed = specialized ? parsePhpDocType(specialized).type : undefined;
          return parsed ? this.phpDocDiagnosticType(owner.file, parsed, baseName) : undefined;
        });
        if (!parentArguments.every((argument): argument is PhpType => Boolean(argument))) continue;
        if (parent.toLowerCase() === targetBaseName.toLowerCase()) results.push(generic(named(parent), ...parentArguments));
        else results.push(...resolve(parent, parentArguments, new Set([...visited, key])));
      }
      return results;
    };
    const unique = new Map(resolve(sourceBaseName, sourceArguments, new Set()).map((type) => [displayType(type).toLowerCase(), type]));
    return unique.size === 1 ? [...unique.values()][0] : undefined;
  }

  private phpDocDiagnosticType(file: SemanticFile, type: PhpDocType, scopeFqcn?: string, budget = { remaining: 256 },
    templateType?: (name: string) => PhpType | undefined, namedType?: (name: string) => PhpType | undefined): PhpType | undefined {
    if (budget.remaining-- <= 0) return undefined;
    if (type.kind === 'literal') return Number.isSafeInteger(type.value) ? literal(type.value) : undefined;
    if (type.kind === 'negated') return undefined;
    if (type.kind === 'nullable') {
      const inner = this.phpDocDiagnosticType(file, type.type, scopeFqcn, budget, templateType, namedType); return inner ? nullable(inner) : undefined;
    }
    if (type.kind === 'union' || type.kind === 'intersection') {
      const members = type.types.map((member) => this.phpDocDiagnosticType(file, member, scopeFqcn, budget, templateType, namedType));
      if (!members.every((member): member is PhpType => Boolean(member))) return undefined;
      return type.kind === 'union' ? union(...members) : intersection(...members);
    }
    if (type.kind === 'array') {
      const element = this.phpDocDiagnosticType(file, type.element, scopeFqcn, budget, templateType, namedType);
      return element ? arrayType(element) : undefined;
    }
    if (type.kind === 'generic' && type.base.kind === 'name' && type.base.name.toLowerCase() === 'int' && type.arguments.length === 2) {
      const boundary = (value: PhpDocType, side: 'min' | 'max'): number | null | undefined => {
        if (value.kind === 'literal') return Number.isSafeInteger(value.value) ? value.value : undefined;
        return value.kind === 'name' && value.name.toLowerCase() === side ? null : undefined;
      };
      const minimum = boundary(type.arguments[0]!, 'min'); const maximum = boundary(type.arguments[1]!, 'max');
      if (minimum === undefined || maximum === undefined || (minimum !== null && maximum !== null && minimum > maximum)) return undefined;
      return integerRange(minimum, maximum);
    }
    if (type.kind === 'generic' && type.base.kind === 'name'
      && (type.base.name.toLowerCase() === 'array' || type.base.name.toLowerCase() === 'non-empty-array')
      && (type.arguments.length === 1 || type.arguments.length === 2)) {
      const arguments_ = type.arguments.map((argument) => this.phpDocDiagnosticType(file, argument, scopeFqcn, budget, templateType, namedType));
      if (!arguments_.every((argument): argument is PhpType => Boolean(argument))) return undefined;
      const nonEmpty = type.base.name.toLowerCase() === 'non-empty-array';
      return arguments_.length === 1 ? arrayType(arguments_[0]!, undefined, nonEmpty) : arrayType(arguments_[1]!, arguments_[0]!, nonEmpty);
    }
    if (type.kind === 'generic' && type.base.kind === 'name' && type.arguments.length === 1) {
      const base = type.base.name.toLowerCase();
      if ((base === 'key-of' || base === 'value-of') && type.arguments[0]!.kind === 'name'
        && type.arguments[0]!.name.endsWith('::*')) {
        const ownerName = type.arguments[0]!.name.slice(0, -3);
        const owner = this.resolveType(file, ownerName, this.namespaceAt(file, type.arguments[0]!.start), scopeFqcn);
        if (!owner || !this.hasCompleteHierarchy(owner)) return undefined;
        const members = this.members(owner, scopeFqcn).filter((member) => member.kind === 'constant' && member.constantKind === 'constant');
        if (!members.length) return undefined;
        const constants = members.map((member) => {
          const ownerFile = this.files.get(member.uri);
          const constant = ownerFile?.constants.find((item) => item.start === member.start && item.end === member.end);
          return ownerFile && constant ? { file: ownerFile, constant } : undefined;
        });
        if (!constants.every((constant): constant is NonNullable<typeof constant> => Boolean(constant))) return undefined;
        if (base === 'value-of') {
          const values = constants.map(({ file: constantFile, constant }) => this.constantLiteralType(constantFile, constant));
          return values.every((value): value is PhpType => Boolean(value)) ? union(...values) : undefined;
        }
        const arrays = constants.map(({ constant }) => constant.value ? this.flatArrayLiteral(constant.value.trim()) : undefined);
        if (!arrays.every((array): array is Extract<PhpType, { kind: 'shape' }> => array?.kind === 'shape' && array.sealed)) return undefined;
        return union(...arrays.flatMap((array) => array.fields.map((field) => literal(field.key))));
      }
      if ((base === 'key-of' || base === 'value-of') && type.arguments[0]!.kind === 'name'
        && type.arguments[0]!.name.includes('::')) {
        const resolved = this.constantDeclarationForExpression(file, type.arguments[0]!.name, type.arguments[0]!.start, scopeFqcn);
        const constantArray = resolved?.constant.kind === 'constant' && resolved.constant.value
          ? this.flatArrayLiteral(resolved.constant.value.trim()) : undefined;
        if (constantArray?.kind === 'shape' && constantArray.sealed) {
          return union(...constantArray.fields.map((field) => base === 'key-of' ? literal(field.key) : field.type));
        }
        if (base === 'value-of' && constantArray?.kind === 'list') return constantArray.valueType;
        return undefined;
      }
      if (base === 'value-of' && type.arguments[0]!.kind === 'name') {
        const enumName = this.resolveType(file, type.arguments[0]!.name, this.namespaceAt(file, type.arguments[0]!.start), scopeFqcn);
        const owner = enumName && this.fileAndDeclaration(enumName);
        if (!owner || owner.declaration.kind !== 'enum' || !owner.declaration.enumBackingType) return undefined;
        const cases = owner.file.constants.filter((constant) => constant.kind === 'enum-case'
          && constant.containerFqcn?.toLowerCase() === owner.declaration.fqcn.toLowerCase());
        const values = cases.map((constant) => this.constantLiteralType(owner.file, constant));
        return values.length && values.every((value): value is PhpType => Boolean(value)) ? union(...values) : undefined;
      }
      const argument = this.phpDocDiagnosticType(file, type.arguments[0]!, scopeFqcn, budget, templateType, namedType);
      if (!argument) return undefined;
      if (base === 'list' || base === 'non-empty-list') return listType(argument, base === 'non-empty-list');
      if (base === 'class-string') return argument.kind === 'named' ? classString(argument) : undefined;
      if ((base === 'key-of' || base === 'value-of') && argument.kind === 'shape' && argument.sealed) {
        return union(...argument.fields.map((field) => base === 'key-of' ? literal(field.key) : field.type));
      }
      if ((base === 'key-of' || base === 'value-of') && argument.kind === 'array') {
        return base === 'key-of' ? argument.keyType : argument.valueType;
      }
      if ((base === 'key-of' || base === 'value-of') && argument.kind === 'list') {
        return base === 'key-of' ? primitive('int') : argument.valueType;
      }
      if (base === 'key-of' || base === 'value-of') return undefined;
    }
    if (type.kind === 'generic') {
      const base = this.phpDocDiagnosticType(file, type.base, scopeFqcn, budget, templateType, namedType);
      const arguments_ = type.arguments.map((argument) => this.phpDocDiagnosticType(file, argument, scopeFqcn, budget, templateType, namedType));
      return base && (base.kind === 'named' || base.kind === 'primitive')
        && arguments_.every((argument): argument is PhpType => Boolean(argument)) ? generic(base, ...arguments_) : undefined;
    }
    if (type.kind === 'shape') {
      if (type.shapeKind !== 'array' || type.fields.some((field) => field.key === undefined)) return undefined;
      const fields = type.fields.map((field) => {
        const rawKey = field.key!; const numeric = /^-?\d+$/.test(rawKey) ? Number(rawKey) : undefined;
        const key = numeric ?? (/^(['"])([^\\]*)\1$/.exec(rawKey)?.[2] ?? rawKey);
        const fieldType = this.phpDocDiagnosticType(file, field.type, scopeFqcn, budget, templateType, namedType);
        return fieldType ? { key, optional: field.optional, type: fieldType } : undefined;
      });
      return fields.every((field): field is NonNullable<typeof field> => Boolean(field)) ? shape(fields) : undefined;
    }
    if (type.kind === 'callable') {
      const parameters = type.parameters.map((parameter) => {
        const parameterType = this.phpDocDiagnosticType(file, parameter.type, scopeFqcn, budget, templateType, namedType);
        return parameterType ? { type: parameterType, optional: parameter.optional, variadic: parameter.variadic } : undefined;
      });
      const returnType = type.returnType ? this.phpDocDiagnosticType(file, type.returnType, scopeFqcn, budget, templateType, namedType) : primitive('mixed');
      return returnType && parameters.every((parameter): parameter is NonNullable<typeof parameter> => Boolean(parameter))
        ? callableType(parameters, returnType) : undefined;
    }
    if (type.kind === 'name') {
      const template = templateType?.(type.name); if (template) return template;
      const projected = namedType?.(type.name); if (projected) return projected;
      const upperBound = this.phpDocRuntimeUpperBound(type.name); if (upperBound) return upperBound;
    }
    const native = this.nativeType(file, displayPhpDocType(type), scopeFqcn);
    return native.kind === 'unknown' ? undefined : native;
  }

  private phpDocTemplateBoundResolver(file: SemanticFile, owners: string[], scopeFqcn: string): (name: string) => PhpType | undefined {
    const definitions = new Map<string, SemanticTemplate>();
    for (const owner of owners) {
      const declarationStart = file.declarations.find((item) => item.fqcn.toLowerCase() === owner.toLowerCase())?.declarationStart
        ?? file.callables.find((item) => item.fqcn.toLowerCase() === owner.toLowerCase())?.declarationStart;
      const doc = declarationStart === undefined ? undefined : adjacentPhpDoc(file, declarationStart);
      if (!doc || doc.errors.length) continue;
      for (const template of file.templates.filter((item) => item.ownerFqcn.toLowerCase() === owner.toLowerCase())) definitions.set(template.name, template);
    }
    const resolved = new Map<string, PhpType | undefined>(); const resolving = new Set<string>();
    const resolve = (name: string): PhpType | undefined => {
      const definition = definitions.get(name); if (!definition) return undefined;
      if (resolved.has(name)) return resolved.get(name);
      if (resolving.has(name)) return undefined;
      resolving.add(name);
      const parsed = definition.bound ? parsePhpDocType(definition.bound).type : undefined;
      const type = parsed ? this.phpDocDiagnosticType(file, parsed, scopeFqcn, { remaining: 256 }, resolve,
        (candidate) => this.phpDocRuntimeUpperBound(candidate)) : primitive('mixed');
      resolving.delete(name); resolved.set(name, type);
      return type;
    };
    return resolve;
  }

  private phpDocRuntimeUpperBound(name: string): PhpType | undefined {
    const normalized = name.toLowerCase();
    if (normalized === 'integer' || ['positive-int', 'negative-int', 'non-positive-int', 'non-negative-int'].includes(normalized)) return primitive('int');
    if (normalized === 'boolean') return primitive('bool');
    if (normalized === 'double' || normalized === 'real') return primitive('float');
    if (['non-empty-string', 'non-falsy-string', 'truthy-string', 'numeric-string', 'literal-string', 'lowercase-string', 'uppercase-string'].includes(normalized)) return primitive('string');
    if (normalized === 'numeric' || normalized === 'number') return union(primitive('int'), primitive('float'));
    if (normalized === 'scalar') return union(primitive('bool'), primitive('int'), primitive('float'), primitive('string'));
    if (normalized === 'array-key') return union(primitive('int'), primitive('string'));
    if (normalized === 'non-empty-array') return primitive('array');
    return undefined;
  }

  private phpDocFitsNative(documented: PhpType, native: PhpType, nativeText: string): boolean {
    const nativeLeaf = nativeText.replace(/\s+/g, '').replace(/^\\+/, '').toLowerCase();
    if (documented.kind === 'callable' && nativeLeaf.split('\\').at(-1) === 'closure') return true;
    return compatibility(documented, native, this.typeRelationContext()) !== 'no';
  }

  private typeRelationContext(): TypeRelationContext {
    return {
      isSubclassOf: (candidate, target) => this.hasCompleteHierarchy(candidate) ? this.isSubclassOf(candidate, target) : undefined,
      isNamedSubtypeOfPrimitive: (candidate, target) => this.namedPrimitiveCompatibility(candidate, target),
      genericVariance: (baseName) => this.genericVariance(baseName),
      genericSupertype: (sourceBaseName, sourceArguments, targetBaseName) => this.genericSupertype(sourceBaseName, sourceArguments, targetBaseName),
    };
  }

  private namedPrimitiveCompatibility(candidate: string, target: PrimitiveName): boolean | undefined {
    const key = candidate.replace(/^\\+/, '').toLowerCase();
    if (target === 'callable') {
      if (key === 'closure') return true;
      const callable = this.members(candidate, candidate).some((member) => member.kind === 'method' && member.name.toLowerCase() === '__invoke'
        && member.visibility === 'public' && !member.static && member.synthetic !== 'phpdoc-magic');
      if (callable) return true;
      return this.hasCompleteHierarchy(candidate) ? false : undefined;
    }
    if (target !== 'iterable') return undefined;
    const contracts = new Set(['traversable', 'iterator', 'iteratoraggregate', 'generator']);
    const visit = (fqcn: string, visited: Set<string>): boolean | undefined => {
      const normalized = fqcn.replace(/^\\+/, '').toLowerCase();
      if (contracts.has(normalized)) return true;
      if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(normalized)) return undefined;
      visited.add(normalized);
      const owner = this.fileAndDeclaration(fqcn); if (!owner) return undefined;
      const namespace = owner.declaration.fqcn.split('\\').slice(0, -1).join('\\');
      const inherited = [...owner.declaration.extendsNames, ...owner.declaration.implementsNames].map((name) =>
        this.resolveSourceType(owner.file, name, namespace, owner.declaration.fqcn));
      if (!inherited.length) return false;
      const results = inherited.map((name) => name ? visit(name, new Set(visited)) : undefined);
      return results.includes(true) ? true : results.includes(undefined) ? undefined : false;
    };
    return visit(candidate, new Set());
  }

  private flatArrayLiteral(expression: string, budget = { remaining: 256 }): PhpType | undefined {
    if (budget.remaining-- <= 0) return undefined;
    if (!/^\[[\s\S]*\]$/.test(expression)) return undefined;
    const content = expression.slice(1, -1).trim(); if (!content) return shape([]);
    const split = (value: string, separator: ',' | '=>'): string[] | undefined => {
      const parts: string[] = []; let start = 0; let quote = ''; let escaped = false; let depth = 0;
      for (let index = 0; index < value.length; index += 1) {
        const character = value[index]!;
        if (quote) { if (escaped) escaped = false; else if (character === '\\') escaped = true; else if (character === quote) quote = ''; continue; }
        if (character === "'" || character === '"') { quote = character; continue; }
        if ('([{'.includes(character)) depth += 1; else if (')]}'.includes(character)) depth -= 1;
        const width = separator.length;
        if (depth === 0 && value.slice(index, index + width) === separator) { parts.push(value.slice(start, index).trim()); start = index + width; index += width - 1; }
      }
      if (quote || depth !== 0) return undefined;
      parts.push(value.slice(start).trim()); if (separator === ',' && parts.at(-1) === '') parts.pop();
      return parts.length && parts.every(Boolean) ? parts : undefined;
    };
    const literalValue = (value: string): PhpType | undefined => {
      if (/^(?:true|false)$/i.test(value)) return primitive('bool');
      if (/^[+-]?(?:0|[1-9][0-9_]*|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)$/.test(value)) return primitive('int');
      if (/^[+-]?(?:(?:[0-9][0-9_]*)?\.[0-9][0-9_]*(?:[eE][+-]?[0-9][0-9_]*)?|[0-9][0-9_]*[eE][+-]?[0-9][0-9_]*)$/.test(value)) return primitive('float');
      if (/^'(?:\\.|[^'\\])*'$|^"(?:\\.|[^"\\])*"$/s.test(value)) return primitive('string');
      if (/^null$/i.test(value)) return primitive('null');
      return /^\[[\s\S]*\]$/.test(value) ? this.flatArrayLiteral(value, budget) : undefined;
    };
    const entries = split(content, ','); if (!entries) return undefined;
    const pairs = entries.map((entry) => split(entry, '=>'));
    if (pairs.every((pair) => pair?.length === 1)) {
      const values = pairs.map((pair) => literalValue(pair![0]!));
      return values.every((value): value is PhpType => Boolean(value)) ? listType(union(...values), true) : undefined;
    }
    if (!pairs.every((pair) => pair?.length === 2)) return undefined;
    const fields = pairs.map((pair) => {
      const rawKey = pair![0]!; const value = literalValue(pair![1]!);
      const numeric = /^-?\d+$/.test(rawKey) ? Number(rawKey) : undefined;
      const quoted = /^(['"])([^\\]*)\1$/.exec(rawKey)?.[2];
      return value && (numeric !== undefined || quoted !== undefined) ? { key: numeric ?? quoted!, optional: false, type: value } : undefined;
    });
    return fields.every((field): field is NonNullable<typeof field> => Boolean(field)) ? shape(fields) : undefined;
  }

  private structuredListLiteralType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    const budget = { remaining: 256 };
    try {
      const root = deepestLocalSyntax(tree.rootNode, start, end, (candidate) => candidate.startIndex === start
        && candidate.endIndex === end && candidate.type === 'array_creation_expression');
      if (!root) return undefined;
      const infer = (array: SyntaxNode, depth: number): PhpType | undefined => {
        if (depth >= MAX_LOCAL_CONTROL_FLOW_DEPTH || budget.remaining-- <= 0) return undefined;
        if (!array.namedChildren.length) return shape([]);
        const values: PhpType[] = [];
        for (const element of array.namedChildren) {
          if (budget.remaining-- <= 0 || /^\s*\.\.\./u.test(element.text)) return undefined;
          const value = element.type === 'array_element_initializer'
            ? element.namedChildren.length === 1 ? element.namedChildren[0] : undefined
            : element;
          if (!value) return undefined;
          const type = value.type === 'array_creation_expression'
            ? infer(value, depth + 1)
            : this.provenArgumentType(file, value.startIndex, value.endIndex);
          if (!type) return undefined;
          values.push(type);
        }
        return listType(union(...values), true);
      };
      return infer(root, 0);
    } finally {
      temporaryTree?.delete();
    }
  }

  private linearLocalValueType(file: SemanticFile, variable: string, offset: number, allowMixed = false): PhpType | undefined {
    const scope = this.containingScope(file, offset); if (!scope) return undefined;
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      let statement = deepestLocalSyntax(tree.rootNode, offset, offset, () => true);
      while (statement && statement.parent?.type !== 'compound_statement') statement = statement.parent ?? undefined;
      const block = statement?.parent; if (!statement || !block) return undefined;
      const index = block.namedChildren.findIndex((candidate) => candidate.startIndex === statement!.startIndex && candidate.endIndex === statement!.endIndex);
      const scalarLiteral = (value: string): boolean => /^(?:true|false|null|[+-]?(?:0|[1-9][0-9_]*|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)|[+-]?(?:(?:[0-9][0-9_]*)?\.[0-9][0-9_]*(?:[eE][+-]?[0-9][0-9_]*)?|[0-9][0-9_]*[eE][+-]?[0-9][0-9_]*)|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")$/is.test(value.trim());
      const declaredParameterType = (name: string, position: number): PhpType | undefined => {
        const parameter = scope.parameters.find((candidate) => `$${candidate.name}` === name);
        if (!parameter?.type || file.assignments.some((assignment) => assignment.scopeId === scope.id
          && assignment.variable === name && assignment.end <= position)) return undefined;
        const parsed = parsePhpDocType(parameter.type).type;
        return parsed ? this.phpDocDiagnosticType(file, parsed, scope.containerFqcn ?? scope.id) : undefined;
      };
      type ArrayUpdate = { kind: 'append'; type: PhpType } | { kind: 'key'; key: string | number; type: PhpType };
      const updates: ArrayUpdate[] = [];
      const mutationValue = (right: SyntaxNode): PhpType | undefined => {
        const text = right.text.trim();
        if (text === variable) return undefined;
        if (/^\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(text)) return this.provenArgumentType(file, right.startIndex, right.endIndex);
        if (/^\$/.test(text) || (/[()]/.test(text) && !/^new\s+[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\s*\(\s*\)$/i.test(text))) return undefined;
        return this.provenArgumentType(file, right.startIndex, right.endIndex);
      };
      const applyUpdates = (base: PhpType): PhpType | undefined => [...updates].reverse().reduce<PhpType | undefined>((current, update) => {
        if (!current) return undefined;
        if (update.kind === 'append') {
          if (current.kind === 'shape' && current.sealed && current.fields.length === 0) return listType(update.type, true);
          return current.kind === 'list' ? listType(union(current.valueType, update.type), true) : undefined;
        }
        if (typeof update.key === 'number') {
          if (update.key !== 0) return undefined;
          if (current.kind === 'shape' && current.sealed && current.fields.length === 0) return listType(update.type, true);
          return current.kind === 'list' ? listType(union(current.valueType, update.type), true) : undefined;
        }
        if (current.kind !== 'shape' || !current.sealed || current.fields.some((field) => typeof field.key === 'number')) return undefined;
        const retained = current.fields.filter((field) => field.key !== update.key);
        return shape([...retained, { key: update.key, optional: false, type: update.type }]);
      }, base);
      const harmless = (candidate: SyntaxNode): boolean => {
        if (candidate.type === 'echo_statement') {
          const content = candidate.text.replace(/^\s*echo\s+/i, '').replace(/;\s*$/, '');
          return content.split(',').every(scalarLiteral);
        }
        const expression = candidate.type === 'expression_statement' ? candidate.namedChildren[0] : undefined;
        if (expression?.type !== 'assignment_expression') return false;
        const left = expression.childForFieldName('left'); const right = expression.childForFieldName('right');
        if (left?.type !== 'variable_name' || left.text === variable || !right || right.text.includes(variable)) return false;
        return scalarLiteral(right.text) || Boolean(this.flatArrayLiteral(right.text));
      };
      const provenNodeType = (node: SyntaxNode): PhpType | undefined => this.provenArgumentType(file, node.startIndex, node.endIndex);
      function conditionalValue(candidate: SyntaxNode): PhpType | undefined {
        const thenBody = candidate.childForFieldName('body');
        const elseIfBodies = candidate.namedChildren.filter((child) => child.type === 'else_if_clause').map((child) => child.childForFieldName('body'));
        const elseBody = candidate.namedChildren.find((child) => child.type === 'else_clause')?.childForFieldName('body');
        if (!thenBody || !elseBody || elseIfBodies.some((body) => !body)) return undefined;
        const values = [thenBody, ...elseIfBodies, elseBody].map((body) => blockValue(body!));
        return values.every((value): value is PhpType => Boolean(value)) ? union(...values) : undefined;
      }
      function switchValue(candidate: SyntaxNode): PhpType | undefined {
        const body = candidate.childForFieldName('body');
        const labels = body?.namedChildren.filter((child) => child.type === 'case_statement' || child.type === 'default_statement') ?? [];
        if (!labels.length || !labels.some((label) => label.type === 'default_statement')) return undefined;
        const values = labels.map((_, entry) => {
          let value: PhpType | undefined;
          for (let labelIndex = entry; labelIndex < labels.length; labelIndex += 1) {
            const label = labels[labelIndex]!; const caseValue = label.childForFieldName('value');
            const statements = label.namedChildren.filter((child) => !caseValue
              || child.startIndex !== caseValue.startIndex || child.endIndex !== caseValue.endIndex);
            const flow = statementsValue(statements, value);
            if (!flow.valid) return undefined;
            value = flow.value;
            if (flow.breaks) break;
          }
          return value;
        });
        return values.every((value): value is PhpType => Boolean(value)) ? union(...values) : undefined;
      }
      function tryValue(candidate: SyntaxNode): PhpType | undefined {
        const tryBody = candidate.childForFieldName('body');
        const catchBodies = candidate.namedChildren.filter((child) => child.type === 'catch_clause')
          .map((child) => child.childForFieldName('body'));
        const finallyBody = candidate.namedChildren.find((child) => child.type === 'finally_clause')?.childForFieldName('body');
        if (!tryBody || catchBodies.some((body) => !body)) return undefined;
        if (finallyBody) {
          const standalone = statementsValue(finallyBody.namedChildren);
          if (standalone.valid && !standalone.breaks && standalone.value) return standalone.value;
        }
        const values = [tryBody, ...catchBodies].map((body) => blockValue(body!));
        if (!values.every((value): value is PhpType => Boolean(value))) return undefined;
        const merged = union(...values);
        if (!finallyBody) return merged;
        const finalized = statementsValue(finallyBody.namedChildren, merged);
        return finalized.valid && !finalized.breaks ? finalized.value : undefined;
      }
      function doValue(candidate: SyntaxNode): PhpType | undefined {
        const body = candidate.childForFieldName('body'); const condition = candidate.childForFieldName('condition');
        if (!body) return undefined;
        const flow = statementsValue(body.namedChildren);
        if (!flow.valid || !flow.value) return undefined;
        if (flow.breaks) return flow.value;
        if (!condition || condition.text.includes(variable)
          || !/^\(\s*(?:true|false|\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*\)$/i.test(condition.text)) return undefined;
        return flow.value;
      }
      function whileValue(candidate: SyntaxNode): PhpType | undefined {
        const body = candidate.childForFieldName('body'); const condition = candidate.childForFieldName('condition');
        if (!body || !condition || !/^\(\s*true\s*\)$/i.test(condition.text)) return undefined;
        const flow = statementsValue(body.namedChildren);
        return flow.valid && flow.breaks ? flow.value : undefined;
      }
      function forValue(candidate: SyntaxNode): PhpType | undefined {
        const body = candidate.childForFieldName('body'); const initialize = candidate.childForFieldName('initialize');
        const condition = candidate.childForFieldName('condition'); const update = candidate.childForFieldName('update');
        if (!body) return undefined;
        const flow = statementsValue(body.namedChildren);
        if (!flow.valid || !flow.value) return undefined;
        if (!condition && flow.breaks) return flow.value;
        if (flow.breaks || !initialize || !condition || !update) return undefined;
        const integer = '-?(?:0|[1-9][0-9_]*|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)';
        const local = '\\$[A-Za-z_\\x80-\\xff][A-Za-z0-9_\\x80-\\xff]*';
        const initial = new RegExp(`^\\s*(${local})\\s*=\\s*(${integer})\\s*$`, 'u').exec(initialize.text);
        const comparison = new RegExp(`^\\s*(${local})\\s*(<=|<|>=|>)\\s*(${integer})\\s*$`, 'u').exec(condition.text);
        if (!initial || !comparison || initial[1] !== comparison[1] || initial[1] === variable) return undefined;
        const escaped = initial[1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!new RegExp(`^(?:${escaped}\\s*(?:\\+\\+|--)|(?:\\+\\+|--)\\s*${escaped})$`, 'u').test(update.text.trim())) return undefined;
        const parseInteger = (value: string): number => Number(value.replaceAll('_', ''));
        const start = parseInteger(initial[2]!); const limit = parseInteger(comparison[3]!);
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(limit)) return undefined;
        const enters = comparison[2] === '<' ? start < limit : comparison[2] === '<=' ? start <= limit
          : comparison[2] === '>' ? start > limit : start >= limit;
        return enters ? flow.value : undefined;
      }
      function foreachValue(candidate: SyntaxNode): PhpType | undefined {
        const body = candidate.childForFieldName('body');
        const iterable = candidate.namedChildren.find((child) => !body
          || child.startIndex !== body.startIndex || child.endIndex !== body.endIndex);
        if (!body || !iterable || iterable.text.includes(variable)) return undefined;
        const iterableType = provenNodeType(iterable);
        const nonEmpty = (type: PhpType, budget = { remaining: 256 }): boolean => {
          if (budget.remaining-- <= 0) return false;
          if (type.kind === 'list' || type.kind === 'array') return type.nonEmpty;
          if (type.kind === 'shape') return type.fields.some((field) => !field.optional);
          return type.kind === 'union' && type.types.length > 0 && type.types.every((member) => nonEmpty(member, budget));
        };
        if (!iterableType || !nonEmpty(iterableType)) return undefined;
        const flow = statementsValue(body.namedChildren);
        return flow.valid ? flow.value : undefined;
      }
      type OptionalLoopValue = { skip: boolean; value?: PhpType };
      function optionalLoopValue(candidate: SyntaxNode): OptionalLoopValue | undefined {
        const body = candidate.childForFieldName('body');
        if (!body) return undefined;
        if (candidate.type === 'while_statement') {
          const condition = candidate.childForFieldName('condition');
          if (!condition || condition.text.includes(variable)) return undefined;
          const normalized = condition.text.trim().replace(/^\(\s*([\s\S]*)\s*\)$/u, '$1').trim().toLowerCase();
          if (normalized === 'false') return { skip: true };
          if (normalized === 'true') return undefined;
        } else if (candidate.type === 'for_statement') {
          const initialize = candidate.childForFieldName('initialize');
          const condition = candidate.childForFieldName('condition');
          const update = candidate.childForFieldName('update');
          if ([initialize, condition, update].some((part) => part?.text.includes(variable))) return undefined;
          const normalized = condition?.text.trim().replace(/^\(\s*([\s\S]*)\s*\)$/u, '$1').trim().toLowerCase();
          if (normalized === 'false') return { skip: true };
          if (!condition || normalized === '' || normalized === 'true') return undefined;
        } else if (candidate.type === 'foreach_statement') {
          const iterable = candidate.namedChildren.find((child) => child.startIndex !== body.startIndex || child.endIndex !== body.endIndex);
          if (!iterable || iterable.text.includes(variable)) return undefined;
          const compact = iterable.text.replace(/\s+/gu, '').toLowerCase();
          if (compact === '[]' || compact === 'array()') return { skip: true };
          if (foreachValue(candidate)) return undefined;
        } else return undefined;
        const flow = statementsValue(body.namedChildren);
        return flow.valid && flow.value ? { skip: false, value: flow.value } : undefined;
      }
      const loopLeavesValueUnchanged = (candidate: SyntaxNode): boolean => {
        const body = candidate.childForFieldName('body');
        return Boolean(body && !body.text.includes(variable) && !file.assignments.some((assignment) => assignment.scopeId === scope.id
          && assignment.variable === variable && assignment.start >= candidate.startIndex && assignment.end <= candidate.endIndex));
      };
      type ValueFlow = { valid: boolean; value?: PhpType; breaks: boolean };
      let valueFlowDepth = 0;
      let valueFlowNodes = 0;
      const statementsValue = (statements: SyntaxNode[], initial?: PhpType): ValueFlow => {
        valueFlowDepth += 1;
        valueFlowNodes += statements.length;
        if (valueFlowDepth > MAX_LOCAL_CONTROL_FLOW_DEPTH || valueFlowNodes > MAX_LOCAL_SYNTAX_NODES) {
          valueFlowDepth -= 1;
          return { valid: false, breaks: false };
        }
        try {
        let value = initial;
        for (let statementIndex = 0; statementIndex < statements.length; statementIndex += 1) {
          const statement = statements[statementIndex]!;
          const expression = statement.type === 'expression_statement' ? statement.namedChildren[0] : undefined;
          const left = expression?.type === 'assignment_expression' ? expression.childForFieldName('left') : undefined;
          const right = expression?.type === 'assignment_expression' ? expression.childForFieldName('right') : undefined;
          if (left?.type === 'variable_name' && left.text === variable) {
            if (!right || right.text.trim() === variable) return { valid: false, breaks: false };
            const assignmentNode = left.parent;
            const parsedAssignment = file.assignments.find((candidate) => candidate.scopeId === scope.id
              && candidate.variable === variable && candidate.start === assignmentNode?.startIndex && candidate.end === assignmentNode?.endIndex);
            value = (parsedAssignment && this.localVariableAnnotationType(file, parsedAssignment, scope))
              ?? this.provenArgumentType(file, right.startIndex, right.endIndex)
              ?? declaredParameterType(right.text.trim(), right.startIndex);
            if (!value) return { valid: false, breaks: false };
            continue;
          }
          if (statement.type === 'if_statement') {
            value = conditionalValue(statement); if (!value) return { valid: false, breaks: false };
            continue;
          }
          if (statement.type === 'switch_statement') {
            value = switchValue(statement); if (!value) return { valid: false, breaks: false };
            continue;
          }
          if (statement.type === 'try_statement') {
            value = tryValue(statement); if (!value) return { valid: false, breaks: false };
            continue;
          }
          if (statement.type === 'do_statement') {
            value = doValue(statement); if (!value) return { valid: false, breaks: false };
            continue;
          }
          if (statement.type === 'while_statement') {
            if (loopLeavesValueUnchanged(statement)) continue;
            const guaranteed = whileValue(statement);
            if (guaranteed) value = guaranteed;
            else {
              const optional = optionalLoopValue(statement);
              if (!optional) return { valid: false, breaks: false };
              if (!optional.skip) {
                if (!value || !optional.value) return { valid: false, breaks: false };
                value = union(value, optional.value);
              }
            }
            continue;
          }
          if (statement.type === 'for_statement') {
            if (loopLeavesValueUnchanged(statement)) continue;
            const guaranteed = forValue(statement);
            if (guaranteed) value = guaranteed;
            else {
              const optional = optionalLoopValue(statement);
              if (!optional) return { valid: false, breaks: false };
              if (!optional.skip) {
                if (!value || !optional.value) return { valid: false, breaks: false };
                value = union(value, optional.value);
              }
            }
            continue;
          }
          if (statement.type === 'foreach_statement') {
            if (loopLeavesValueUnchanged(statement)) continue;
            const guaranteed = foreachValue(statement);
            if (guaranteed) value = guaranteed;
            else {
              const optional = optionalLoopValue(statement);
              if (!optional) return { valid: false, breaks: false };
              if (!optional.skip) {
                if (!value || !optional.value) return { valid: false, breaks: false };
                value = union(value, optional.value);
              }
            }
            continue;
          }
          if (statement.type === 'break_statement') {
            return /^\s*break\s*;\s*$/i.test(statement.text) && statementIndex === statements.length - 1
              ? { valid: true, value, breaks: true } : { valid: false, breaks: false };
          }
          if (!harmless(statement)) return { valid: false, breaks: false };
        }
        return { valid: true, value, breaks: false };
        } finally {
          valueFlowDepth -= 1;
        }
      };
      const blockValue = (body: SyntaxNode): PhpType | undefined => {
        if (body.type !== 'compound_statement') return undefined;
        const flow = statementsValue(body.namedChildren);
        return flow.valid && !flow.breaks ? flow.value : undefined;
      };
      const optionalLoopValues: PhpType[] = [];
      const withOptionalLoops = (value: PhpType | undefined): PhpType | undefined => value
        ? union(value, ...optionalLoopValues)
        : undefined;
      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        const candidate = block.namedChildren[cursor]!;
        const assignment = candidate.type === 'expression_statement' ? candidate.namedChildren[0] : undefined;
        const left = assignment?.type === 'assignment_expression' ? assignment.childForFieldName('left') : undefined;
        const right = assignment?.type === 'assignment_expression' ? assignment.childForFieldName('right') : undefined;
        if (left?.type === 'variable_name' && left.text === variable) {
          if (!right || this.containingScope(file, assignment!.startIndex)?.id !== scope.id) return undefined;
          if (right.text.trim() === variable) return undefined;
          const parsedAssignment = file.assignments.find((candidate) => candidate.scopeId === scope.id
            && candidate.variable === variable && candidate.start === assignment!.startIndex && candidate.end === assignment!.endIndex);
          const base = (parsedAssignment && this.localVariableAnnotationType(file, parsedAssignment, scope))
            ?? this.provenArgumentType(file, right.startIndex, right.endIndex)
            ?? declaredParameterType(right.text.trim(), right.startIndex);
          const result = withOptionalLoops(base ? applyUpdates(base) : undefined);
          return !allowMixed && result?.kind === 'primitive' && result.name === 'mixed' ? undefined : result;
        }
        if (left?.type === 'subscript_expression' && right) {
          const compact = left.text.replace(/\s+/g, '');
          const append = compact === `${variable}[]`;
          const keyed = new RegExp(`^\\${variable}\\[(-?\\d+|'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*")\\]$`).exec(compact)?.[1];
          if (append || keyed !== undefined) {
            if (optionalLoopValues.length) return undefined;
            const value = mutationValue(right); if (!value) return undefined;
            if (append) updates.push({ kind: 'append', type: value });
            else {
              const numeric = /^-?\d+$/.test(keyed!) ? Number(keyed) : undefined;
              const key = numeric ?? keyed!.slice(1, -1); updates.push({ kind: 'key', key, type: value });
            }
            continue;
          }
        }
        if (candidate.type === 'if_statement') return updates.length ? undefined : withOptionalLoops(conditionalValue(candidate));
        if (candidate.type === 'switch_statement') return updates.length ? undefined : withOptionalLoops(switchValue(candidate));
        if (candidate.type === 'try_statement') return updates.length ? undefined : withOptionalLoops(tryValue(candidate));
        if (candidate.type === 'do_statement') return updates.length ? undefined : withOptionalLoops(doValue(candidate));
        if (candidate.type === 'while_statement' || candidate.type === 'for_statement' || candidate.type === 'foreach_statement') {
          if (updates.length) return undefined;
          if (loopLeavesValueUnchanged(candidate)) continue;
          const guaranteed = candidate.type === 'while_statement' ? whileValue(candidate)
            : candidate.type === 'for_statement' ? forValue(candidate) : foreachValue(candidate);
          if (guaranteed) return withOptionalLoops(guaranteed);
          const optional = optionalLoopValue(candidate);
          if (!optional) return undefined;
          if (optional.value) optionalLoopValues.push(optional.value);
          continue;
        }
        if (!harmless(candidate)) return undefined;
      }
      return undefined;
    } finally {
      temporaryTree?.delete();
    }
  }

  private closureLiteralType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      const node = deepestLocalSyntax(tree.rootNode, start, end, (candidate) => candidate.startIndex === start
        && candidate.endIndex === end && (candidate.type === 'arrow_function' || candidate.type === 'anonymous_function'));
      if (!node) return undefined;
      const scope = file.scopes.find((candidate) => candidate.start === node.startIndex && candidate.end === node.endIndex
        && (candidate.kind === 'arrow' || candidate.kind === 'closure'));
      const returnName = node.childForFieldName('return_type')?.text;
      if (!scope || scope.parameters.some((parameter) => parameter.defaultValue !== undefined
        && !/^(?:true|false|null|[+-]?\d+(?:\.\d+)?|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")$/is.test(parameter.defaultValue.trim()))) return undefined;
      const contextualType = (parameter: ParsedScope['parameters'][number]): PhpType | undefined => {
        if (parameter.nativeType) return this.nativeSourceType(file, parameter.nativeType, scope.containerFqcn);
        const contextual = this.contextualClosureParameterClass(file, scope, `$${parameter.name}`, true); if (!contextual) return undefined;
        const type = contextual.groups?.length
          ? union(...contextual.groups.map((group) => intersection(...group.map((candidate) => named(candidate.fqcn)))))
          : named(contextual.fqcn);
        return contextual.nullable ? nullable(type) : type;
      };
      const parameters = scope.parameters.map((parameter) => ({
        type: contextualType(parameter),
        optional: parameter.defaultValue !== undefined,
        variadic: parameter.variadic,
        byReference: parameter.byReference,
      }));
      const body = node.childForFieldName('body');
      type ReturnFlow = { returns: PhpType[]; continues: boolean };
      const budget = { remaining: 64 };
      const containsUnsupportedReturnFlow = (candidate: SyntaxNode): boolean | undefined => {
        const pending = [...candidate.namedChildren];
        while (pending.length) {
          const current = pending.pop()!;
          if (budget.remaining-- <= 0) return undefined;
          if (['return_statement', 'yield_expression', 'goto_statement', 'break_statement', 'continue_statement'].includes(current.type)) return true;
          if (['anonymous_function', 'arrow_function', 'function_definition', 'method_declaration'].includes(current.type)) continue;
          pending.push(...current.namedChildren);
        }
        return false;
      };
      const closureReturnFlow = (candidate: SyntaxNode | null | undefined, depth = 0): ReturnFlow | undefined => {
        if (!candidate || depth >= MAX_LOCAL_CONTROL_FLOW_DEPTH || budget.remaining-- <= 0) return undefined;
        const statementsFlow = (statements: SyntaxNode[], statementDepth: number): ReturnFlow | undefined => {
          const returns: PhpType[] = []; let continues = true;
          for (const statement of statements) {
            if (!continues) break;
            const flow = closureReturnFlow(statement, statementDepth); if (!flow) return undefined;
            returns.push(...flow.returns); continues = flow.continues;
          }
          return { returns, continues };
        };
        if (candidate.type === 'compound_statement') {
          return statementsFlow(candidate.namedChildren, depth);
        }
        if (candidate.type === 'return_statement') {
          const expression = candidate.namedChildren[0];
          const returnType = expression ? this.provenArgumentType(file, expression.startIndex, expression.endIndex) : primitive('null');
          return returnType ? { returns: [returnType], continues: false } : undefined;
        }
        if (candidate.type === 'throw_expression' || candidate.type === 'exit_statement') {
          return { returns: [], continues: false };
        }
        if (candidate.type === 'expression_statement' && candidate.namedChildren.length === 1
          && candidate.namedChildren[0]!.type === 'throw_expression') {
          return closureReturnFlow(candidate.namedChildren[0], depth);
        }
        if (candidate.type === 'expression_statement' && candidate.namedChildren.length === 1) {
          const expression = candidate.namedChildren[0]!;
          const neverCall = file.calls.find((call) => call.terminatingExpression?.start === expression.startIndex
            && call.terminatingExpression.end === expression.endIndex && this.isNativeNeverCall(file, call));
          if (neverCall) return { returns: [], continues: false };
        }
        if (['yield_expression', 'goto_statement', 'break_statement', 'continue_statement'].includes(candidate.type)) return undefined;
        if (candidate.type === 'if_statement') {
          const branches = [candidate.childForFieldName('body'),
            ...candidate.namedChildren.filter((child) => child.type === 'else_if_clause').map((child) => child.childForFieldName('body'))];
          if (branches.some((branch) => !branch)) return undefined;
          const alternative = candidate.namedChildren.find((child) => child.type === 'else_clause')?.childForFieldName('body');
          const flows = [...branches, ...(alternative ? [alternative] : [])]
            .map((branch) => closureReturnFlow(branch, depth + 1));
          if (!flows.every((flow): flow is ReturnFlow => Boolean(flow))) return undefined;
          return {
            returns: flows.flatMap((flow) => flow.returns),
            continues: !alternative || flows.some((flow) => flow.continues),
          };
        }
        if (candidate.type === 'try_statement') {
          const tryBody = candidate.childForFieldName('body');
          const catchBodies = candidate.namedChildren.filter((child) => child.type === 'catch_clause')
            .map((child) => child.childForFieldName('body'));
          if (!tryBody || catchBodies.some((branch) => !branch)) return undefined;
          const baseFlows = [tryBody, ...catchBodies].map((branch) => closureReturnFlow(branch, depth + 1));
          if (!baseFlows.every((flow): flow is ReturnFlow => Boolean(flow))) return undefined;
          const base: ReturnFlow = {
            returns: baseFlows.flatMap((flow) => flow.returns),
            continues: baseFlows.some((flow) => flow.continues),
          };
          const finallyBody = candidate.namedChildren.find((child) => child.type === 'finally_clause')?.childForFieldName('body');
          if (!finallyBody) return base;
          const finalFlow = closureReturnFlow(finallyBody, depth + 1); if (!finalFlow) return undefined;
          return finalFlow.continues ? {
            returns: [...base.returns, ...finalFlow.returns],
            continues: base.continues,
          } : finalFlow;
        }
        if (candidate.type === 'switch_statement') {
          const switchBody = candidate.childForFieldName('body'); if (!switchBody) return undefined;
          const labels = switchBody.namedChildren.filter((child) => child.type === 'case_statement' || child.type === 'default_statement');
          if (!labels.length || labels.filter((label) => label.type === 'default_statement').length > 1) return undefined;
          const labelStatements = labels.map((label) => {
            const value = label.childForFieldName('value');
            return label.namedChildren.filter((child) => child !== value);
          });
          const entryFlows: ReturnFlow[] = [];
          for (let entry = 0; entry < labels.length; entry += 1) {
            const returns: PhpType[] = []; let continues = true; let exitsSwitch = false;
            for (let index = entry; index < labels.length && continues; index += 1) {
              for (const statement of labelStatements[index]!) {
                if (!continues) break;
                if (statement.type === 'break_statement') {
                  if (!/^break\s*(?:1\s*)?;$/iu.test(statement.text)) return undefined;
                  exitsSwitch = true; continues = false; break;
                }
                const flow = closureReturnFlow(statement, depth + 1); if (!flow) return undefined;
                returns.push(...flow.returns); continues = flow.continues;
              }
              if (exitsSwitch) continues = false;
            }
            entryFlows.push({ returns, continues: exitsSwitch || continues });
          }
          return {
            returns: entryFlows.flatMap((flow) => flow.returns),
            continues: !labels.some((label) => label.type === 'default_statement') || entryFlows.some((flow) => flow.continues),
          };
        }
        if (['while_statement', 'do_statement', 'for_statement', 'foreach_statement'].includes(candidate.type)) {
          const loopBody = candidate.childForFieldName('body'); if (!loopBody) return undefined;
          const condition = candidate.childForFieldName('condition');
          const normalizedCondition = condition?.text.replace(/^\(\s*|\s*\)$/g, '').trim().toLowerCase();
          if ((candidate.type === 'while_statement' || candidate.type === 'for_statement') && normalizedCondition === 'false') {
            return { returns: [], continues: true };
          }
          let definitelyEnters = candidate.type === 'do_statement'
            || (candidate.type === 'while_statement' && normalizedCondition === 'true')
            || (candidate.type === 'for_statement' && (!condition || normalizedCondition === '' || normalizedCondition === 'true'));
          if (candidate.type === 'foreach_statement') {
            const iterable = candidate.namedChildren.find((child) => child !== loopBody);
            if (!iterable) return undefined;
            if (/^(?:\[\s*\]|array\s*\(\s*\))$/iu.test(iterable.text.trim())) return { returns: [], continues: true };
            const iterableType = this.provenArgumentType(file, iterable.startIndex, iterable.endIndex);
            const nonEmpty = (type: PhpType, remaining = { value: 64 }): boolean => {
              if (remaining.value-- <= 0) return false;
              if (type.kind === 'list' || type.kind === 'array') return type.nonEmpty;
              if (type.kind === 'shape') return type.fields.some((field) => !field.optional);
              return type.kind === 'union' && type.types.length > 0 && type.types.every((member) => nonEmpty(member, remaining));
            };
            const literalNonEmpty = iterable.type === 'array_creation_expression'
              && iterable.namedChildren.some((element) => element.type === 'array_element_initializer' && !/^\s*\.\.\./u.test(element.text));
            definitelyEnters = literalNonEmpty || Boolean(iterableType && nonEmpty(iterableType));
          }
          const loopStatements = loopBody.type === 'compound_statement' ? loopBody.namedChildren : [loopBody];
          const returns: PhpType[] = []; let bodyContinues = true; let exitsLoop = false;
          for (const statement of loopStatements) {
            if (!bodyContinues) break;
            if (statement.type === 'break_statement') {
              if (!/^break\s*(?:1\s*)?;$/iu.test(statement.text)) return undefined;
              exitsLoop = true; bodyContinues = false; break;
            }
            const flow = closureReturnFlow(statement, depth + 1); if (!flow) return undefined;
            returns.push(...flow.returns); bodyContinues = flow.continues;
          }
          return { returns, continues: exitsLoop || bodyContinues || !definitelyEnters };
        }
        const unsupported = containsUnsupportedReturnFlow(candidate);
        return unsupported === false ? { returns: [], continues: true } : undefined;
      };
      const closureReturn = (candidate: SyntaxNode | null | undefined): PhpType | undefined => {
        const flow = closureReturnFlow(candidate);
        return flow && !flow.continues && flow.returns.length ? union(...flow.returns) : undefined;
      };
      const returnType = returnName ? this.nativeSourceType(file, returnName, scope.containerFqcn)
        : node.type === 'arrow_function' && body ? this.provenArgumentType(file, body.startIndex, body.endIndex)
        : closureReturn(body);
      const result = !returnType || parameters.some((parameter) => !parameter.type || parameter.type.kind === 'unknown') || returnType.kind === 'unknown'
        ? undefined : callableType(parameters.map((parameter) => ({ ...parameter, type: parameter.type! })), returnType);
      return result;
    } finally {
      temporaryTree?.delete();
    }
  }

  private delegatedGeneratorTypes(type: PhpType): { key: PhpType; value: PhpType } | undefined {
    if (type.kind === 'list') return { key: primitive('int'), value: type.valueType };
    if (type.kind === 'array') return { key: type.keyType, value: type.valueType };
    if (type.kind === 'shape') {
      if (!type.fields.length) return undefined;
      return {
        key: union(...type.fields.map((field) => primitive(typeof field.key === 'number' ? 'int' : 'string'))),
        value: union(...type.fields.map((field) => field.type)),
      };
    }
    if (type.kind === 'union') {
      const alternatives = type.types.map((item) => this.delegatedGeneratorTypes(item));
      return alternatives.every((item): item is { key: PhpType; value: PhpType } => Boolean(item))
        ? { key: union(...alternatives.map((item) => item.key)), value: union(...alternatives.map((item) => item.value)) }
        : undefined;
    }
    if (type.kind === 'named') {
      const inherited = ['Iterator', 'IteratorAggregate', 'Traversable'].flatMap((target) => {
        const projected = this.genericSupertype(type.name, [], target);
        const iterable = projected && this.delegatedGeneratorTypes(projected);
        return iterable ? [iterable] : [];
      });
      const unique = new Map(inherited.map((item) => [`${displayType(item.key)}\0${displayType(item.value)}`, item]));
      return unique.size === 1 ? [...unique.values()][0] : undefined;
    }
    if (type.kind !== 'generic' || (type.base.kind !== 'named' && type.base.kind !== 'primitive')) return undefined;
    const base = type.base.name.split('\\').at(-1)?.toLowerCase();
    if (base === 'list' || base === 'non-empty-list') {
      return type.arguments.length === 1 ? { key: primitive('int'), value: type.arguments[0]! } : undefined;
    }
    if (base === 'array' || base === 'non-empty-array' || base === 'iterable') {
      return type.arguments.length === 1
        ? { key: union(primitive('int'), primitive('string')), value: type.arguments[0]! }
        : type.arguments.length === 2 ? { key: type.arguments[0]!, value: type.arguments[1]! } : undefined;
    }
    if (['generator', 'iterator', 'iteratoraggregate', 'traversable'].includes(base ?? '')) {
      return type.arguments.length >= 2 ? { key: type.arguments[0]!, value: type.arguments[1]! } : undefined;
    }
    if (type.base.kind !== 'named') return undefined;
    const sourceBase = type.base.name;
    const inherited = ['Iterator', 'IteratorAggregate', 'Traversable'].flatMap((target) => {
      const projected = this.genericSupertype(sourceBase, type.arguments, target);
      const iterable = projected && this.delegatedGeneratorTypes(projected);
      return iterable ? [iterable] : [];
    });
    const unique = new Map(inherited.map((item) => [`${displayType(item.key)}\0${displayType(item.value)}`, item]));
    return unique.size === 1 ? [...unique.values()][0] : undefined;
  }

  private inferredGeneratorReturnType(file: SemanticFile, callable: ParsedCallableDeclaration): string | undefined {
    const declared = callable.returnType?.trim();
    if (declared && declared.replace(/^\\/, '').toLowerCase() !== 'generator') return undefined;
    const inferenceKey = `${file.uri}:${callable.fqcn.toLowerCase()}`;
    if (this.generatorInferenceInProgress.has(inferenceKey)) return undefined;
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    this.generatorInferenceInProgress.add(inferenceKey);
    try {
      const declaration = firstLocalSyntax(tree.rootNode, (node) => node.startIndex === callable.declarationStart
        && node.endIndex === callable.declarationEnd && (node.type === 'function_definition' || node.type === 'method_declaration'));
      if (!declaration) return undefined;
      const keys: PhpType[] = []; const values: PhpType[] = []; let invalid = false; let sawYield = false;
      const traversal = walkLocalSyntax(declaration, (node) => {
        if (node !== declaration && ['function_definition', 'method_declaration', 'anonymous_function', 'arrow_function'].includes(node.type)) return 'skip';
        if (node.isError || node.isMissing) { invalid = true; return 'stop'; }
        if (node.type !== 'yield_expression') return 'descend';
        sawYield = true;
        const delegated = /^yield\s+from\b/i.test(node.text);
        if (delegated) {
          const expression = node.namedChildren[0];
          if (expression?.type === 'array_creation_expression') {
            if (!expression.namedChildren.length) return 'skip';
            for (const element of expression.namedChildren) {
              if (element.type !== 'array_element_initializer') { invalid = true; return 'stop'; }
              const parts = element.namedChildren; const valueNode = parts.at(-1);
              const value = valueNode && this.provenArgumentType(file, valueNode.startIndex, valueNode.endIndex);
              if (!value) { invalid = true; return 'stop'; }
              if (parts.length > 1) {
                const key = this.provenArgumentType(file, parts[0]!.startIndex, parts[0]!.endIndex);
                if (!key || !['int', 'string'].includes(displayType(key))) { invalid = true; return 'stop'; }
                keys.push(key);
              } else keys.push(primitive('int'));
              values.push(value);
            }
            return 'skip';
          }
          const type = expression && this.provenArgumentType(file, expression.startIndex, expression.endIndex);
          const iterable = type && this.delegatedGeneratorTypes(type);
          if (!iterable) { invalid = true; return 'stop'; }
          keys.push(iterable.key); values.push(iterable.value); return 'skip';
        }
        const initializer = node.namedChildren[0];
        if (!initializer) {
          keys.push(primitive('int')); values.push(primitive('null')); return 'skip';
        }
        const parts = initializer.namedChildren;
        const valueNode = parts.at(-1);
        const value = valueNode && this.provenArgumentType(file, valueNode.startIndex, valueNode.endIndex);
        if (!value) { invalid = true; return 'stop'; }
        if (parts.length > 1) {
          const keyNode = parts[0]!; const key = this.provenArgumentType(file, keyNode.startIndex, keyNode.endIndex);
          const keyName = key && displayType(key);
          if (!key || !['int', 'string'].includes(keyName!)) { invalid = true; return 'stop'; }
          keys.push(key);
        } else keys.push(primitive('int'));
        values.push(value); return 'skip';
      });
      if (!traversal.complete || invalid || !sawYield || !keys.length || !values.length) return undefined;
      const returns = file.returns.filter((statement) => statement.scopeId === callable.fqcn);
      const returned: PhpType[] = [];
      for (const statement of returns) {
        if (statement.expressionStart === undefined || statement.expressionEnd === undefined) returned.push(primitive('null'));
        else {
          const type = this.provenArgumentType(file, statement.expressionStart, statement.expressionEnd); if (!type) return undefined;
          returned.push(type);
        }
      }
      const returnType = returned.length ? union(...returned) : primitive('void');
      return displayType(generic(named('Generator'), union(...keys), union(...values), primitive('mixed'), returnType));
    } finally {
      this.generatorInferenceInProgress.delete(inferenceKey);
      temporaryTree?.delete();
    }
  }

  private callResultType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const call = file.calls.find((candidate) => candidate.start === start && candidate.end === end); if (!call) return undefined;
    if (call.firstClassCallable) return named('Closure');
    const dynamicResult = this.dynamicCallResultType(file, call); if (dynamicResult) return dynamicResult;
    const signature = this.completedCallSignature(file, call); if (!signature || signature.synthetic) return undefined;
    const declarations = this.callableDeclarationsForSignature(signature);
    if (declarations.length !== 1) return undefined;
    const declarationFile = declarations[0]!.file;
    const inferredGenerator = this.inferredGeneratorReturnType(declarationFile, declarations[0]!.item);
    const returnTypeText = inferredGenerator ?? signature.returnType;
    if (!returnTypeText || ['mixed', 'void'].includes(returnTypeText.trim().toLowerCase())) return undefined;
    const templates = declarationFile.templates.filter((template) => template.ownerFqcn.toLowerCase() === signature.fqcn.toLowerCase());
    const requiredTemplates = templates.filter((template) => new RegExp(`(?<![A-Za-z0-9_\\\\])${template.name}(?![A-Za-z0-9_])`).test(returnTypeText));
    const inferred = requiredTemplates.length ? this.callTemplateArguments(file, call, signature, declarationFile, templates) : undefined;
    if (requiredTemplates.length && (!inferred?.length
      || inferred.some((alternative) => requiredTemplates.some((template) => !alternative[template.name])))) return undefined;
    if (!this.callArgumentsCompatible(file, call, signature, declarationFile)) return undefined;
    const lateTypes: Record<string, string | undefined> = {
      self: this.genericObjectReference(signature.typeScopeFqcn, signature.templateArguments),
      static: this.genericObjectReference(signature.calledOnFqcn,
        signature.calledOnTemplateArguments ?? signature.templateArguments),
      parent: this.resolveType(declarationFile, 'parent', signature.typeScopeFqcn.split('\\').slice(0, -1).join('\\'), signature.typeScopeFqcn),
    };
    const alternatives = inferred?.length ? inferred : [undefined];
    const results: PhpType[] = [];
    const expandedArguments = this.expandedCallArguments(file, call.start, call.end); if (!expandedArguments) return undefined;
    const argumentForParameter = (name: string): (typeof expandedArguments)[number] | undefined => {
      const parameterIndex = signature.parameters.findIndex((parameter) => parameter.name === name); if (parameterIndex < 0) return undefined;
      let positionalIndex = 0;
      for (const argument of expandedArguments) {
        if (argument.name) {
          if (argument.name === name) return argument;
          continue;
        }
        const index = Math.min(positionalIndex, Math.max(0, signature.parameters.length - 1));
        const parameter = signature.parameters[index];
        if (index === parameterIndex) return argument;
        if (!parameter?.variadic) positionalIndex += 1;
      }
      return undefined;
    };
    const argumentIdentity = (name: string): string | undefined => {
      const argument = argumentForParameter(name); if (!argument) return undefined;
      const text = file.source.slice(argument.start, argument.end).trim();
      return /^\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(text) ? `argument:${text}` : undefined;
    };
    const relation: TypeRelationContext = {
      isSubclassOf: (candidate, target) => this.hasCompleteHierarchy(candidate) && this.fileAndDeclaration(target)
        ? this.isSubclassOf(candidate, target) : undefined,
      genericVariance: (baseName) => this.genericVariance(baseName),
      genericSupertype: (sourceBaseName, sourceArguments, targetBaseName) =>
        this.genericSupertype(sourceBaseName, sourceArguments, targetBaseName),
    };
    for (const alternative of alternatives) {
      let returnType = specializeTemplateType(returnTypeText, alternative)!;
      for (const token of ['self', 'static', 'parent'] as const) {
        if (!new RegExp(`\\b${token}\\b`, 'i').test(returnType)) continue;
        const resolved = lateTypes[token]; const resolvedObject = resolved && this.objectType(resolved, false);
        if (!resolvedObject || !this.fileAndDeclaration(resolvedObject.name)) return undefined;
        returnType = returnType.replace(new RegExp(`\\b${token}\\b`, 'gi'), `\\${resolved}`);
      }
      const parsed = parsePhpDocType(returnType).type; if (!parsed) return undefined;
      const result = this.evaluatePhpDocType(declarationFile, parsed, signature.typeScopeFqcn, relation, (name) => {
        const argument = argumentForParameter(name);
        if (!argument) {
          const fallback = signature.parameters.find((parameter) => parameter.name === name)?.defaultValue?.trim().toLowerCase();
          return fallback === 'true' ? literal(true) : fallback === 'false' ? literal(false)
            : fallback === 'null' ? primitive('null') : undefined;
        }
        const text = file.source.slice(argument.start, argument.end).trim().toLowerCase();
        return text === 'true' ? literal(true) : text === 'false' ? literal(false)
          : argument.type ?? this.provenArgumentType(file, argument.start, argument.end);
      }, argumentIdentity);
      if (!result) return undefined;
      results.push(result);
    }
    const result = union(...results);
    const nullsafe = /^(\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)\s*\?->/.exec(file.source.slice(start, end).trim());
    if (!nullsafe) return result;
    const receiver = this.variableClass(file, nullsafe[1]!, start, new Set(), true);
    return receiver ? (receiver.nullable ? nullable(result) : result) : undefined;
  }

  private pipeExpressionType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      const root = deepestLocalSyntax(tree.rootNode, start, end, (candidate) => candidate.startIndex === start
        && candidate.endIndex === end && candidate.type === 'binary_expression');
      if (!root) return undefined;
      const operator = (node: SyntaxNode): string | undefined => node.childForFieldName('operator')?.text
        ?? ((): string | undefined => {
          const left = node.childForFieldName('left'); const right = node.childForFieldName('right');
          return left && right ? file.source.slice(left.endIndex, right.startIndex).trim() : undefined;
        })();
      const acceptsOne = (parameters: Array<{ type?: string; nativeType?: string; defaultValue?: string; variadic: boolean; byReference: boolean }>): boolean => {
        const required = parameters.filter((parameter) => parameter.defaultValue === undefined && !parameter.variadic).length;
        return required <= 1 && parameters.length > 0
          && (parameters.some((parameter) => parameter.variadic) || parameters.length >= 1)
          && !parameters[0]!.byReference;
      };
      const compatible = (actual: PhpType, expected: PhpType): boolean => {
        if (expected.kind === 'primitive' && expected.name === 'mixed') return true;
        if (isDirectScalar(actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(file)) return true;
        return compatibility(actual, expected, this.typeRelationContext()) === 'yes';
      };
      const closureStage = (node: SyntaxNode, input: PhpType): PhpType | undefined => {
        const callable = this.closureLiteralType(file, node.startIndex, node.endIndex);
        if (callable?.kind !== 'callable' || !acceptsOne(callable.parameters.map((parameter) => ({
          type: displayType(parameter.type), variadic: Boolean(parameter.variadic), byReference: Boolean(parameter.byReference),
          ...(parameter.optional ? { defaultValue: 'default' } : {}),
        })))) return undefined;
        const parameter = callable.parameters[0]!;
        return compatible(input, parameter.type) && displayType(callable.returnType).toLowerCase() !== 'void'
          ? callable.returnType : undefined;
      };
      const callableStage = (node: SyntaxNode, input: PhpType): PhpType | undefined => {
        let target = node;
        while (target.type === 'parenthesized_expression' && target.namedChildren.length === 1) target = target.namedChildren[0]!;
        if (target.type === 'arrow_function' || target.type === 'anonymous_function') return closureStage(target, input);
        if (!['function_call_expression', 'scoped_call_expression', 'member_call_expression'].includes(target.type)) return undefined;
        const argumentsNode = target.childForFieldName('arguments');
        if (!argumentsNode || argumentsNode.namedChildren.length !== 1
          || argumentsNode.namedChildren[0]!.type !== 'variadic_placeholder') return undefined;
        const candidates = this.signatures(file.uri, argumentsNode.startIndex + 1).filter((candidate) => {
          if (candidate.synthetic || !acceptsOne(candidate.parameters)) return false;
          const declarationFile = this.files.get(candidate.uri); const parameter = candidate.parameters[0];
          if (!declarationFile || !parameter) return false;
          const templates = declarationFile.templates.filter((template) => template.ownerFqcn.toLowerCase() === candidate.fqcn.toLowerCase());
          const parameterText = specializeTemplateType(parameter.type, candidate.templateArguments);
          const returnText = specializeTemplateType(candidate.returnType, candidate.templateArguments);
          if (templates.some((template) => (!candidate.templateArguments?.[template.name])
            && [parameterText, returnText].some((text) => text
              && new RegExp(`(?<![A-Za-z0-9_\\\\])${template.name}(?![A-Za-z0-9_])`).test(text)))) return false;
          const documented = parameterText ? parsePhpDocType(parameterText).type : undefined;
          const expected = documented ? this.phpDocDiagnosticType(declarationFile, documented, candidate.typeScopeFqcn)
            : parameter.nativeType ? this.nativeType(declarationFile,
              specializeTemplateType(parameter.nativeType, candidate.templateArguments)!, candidate.typeScopeFqcn) : undefined;
          return Boolean(expected && compatible(input, expected));
        });
        const results = candidates.flatMap((candidate) => {
          const result = this.memberDiagnosticType(candidate); return result ? [result] : [];
        });
        if (!results.length) return undefined;
        const unique = new Map(results.map((result) => [displayType(result).toLowerCase(), result]));
        return unique.size === 1 ? [...unique.values()][0] : undefined;
      };
      const infer = (node: SyntaxNode, depth: number): PhpType | undefined => {
        if (depth >= MAX_LOCAL_CONTROL_FLOW_DEPTH) return undefined;
        if (node.type !== 'binary_expression' || operator(node) !== '|>') {
          return this.provenArgumentType(file, node.startIndex, node.endIndex);
        }
        const left = node.childForFieldName('left'); const right = node.childForFieldName('right');
        if (!left || !right) return undefined;
        const input = infer(left, depth + 1);
        return input ? callableStage(right, input) : undefined;
      };
      return infer(root, 0);
    } finally {
      temporaryTree?.delete();
    }
  }

  private evaluatePhpDocType(file: SemanticFile, type: PhpDocType, typeScopeFqcn: string,
    relation: TypeRelationContext, parameterSubject: (name: string) => PhpType | undefined,
    parameterIdentity?: (name: string) => string | undefined,
    constraints: ReadonlyMap<string, PhpType> = new Map(), budget = { remaining: 256 }): PhpType | undefined {
    if (budget.remaining-- <= 0) return undefined;
    if (type.kind !== 'conditional') return this.phpDocDiagnosticType(file, type, typeScopeFqcn);
    const subjectKey = type.subject.kind === 'name' && type.subject.name.startsWith('$') ? type.subject.name.slice(1) : undefined;
    const constraintKey = subjectKey ? parameterIdentity?.(subjectKey) ?? `parameter:${subjectKey}` : undefined;
    const subject = subjectKey
      ? constraints.get(constraintKey!) ?? parameterSubject(subjectKey)
      : this.phpDocDiagnosticType(file, type.subject, typeScopeFqcn);
    const target = this.phpDocDiagnosticType(file, type.target, typeScopeFqcn);
    if (!subject || !target) return undefined;
    let compared = this.conditionalCompatibility(subject, target, relation);
    if (type.negated) compared = compared === 'yes' ? 'no' : compared === 'no' ? 'yes' : 'unknown';
    if (compared === 'yes') return this.evaluatePhpDocType(file, type.ifTrue, typeScopeFqcn, relation, parameterSubject, parameterIdentity, constraints, budget);
    if (compared === 'no') return this.evaluatePhpDocType(file, type.ifFalse, typeScopeFqcn, relation, parameterSubject, parameterIdentity, constraints, budget);
    const branchConstraints = (conditionTrue: boolean): ReadonlyMap<string, PhpType> => {
      if (!constraintKey) return constraints;
      const narrowed = this.conditionalSubjectBranch(subject, target, type.negated ? !conditionTrue : conditionTrue, relation);
      if (!narrowed) return constraints;
      return new Map([...constraints, [constraintKey, narrowed]]);
    };
    const whenTrue = this.evaluatePhpDocType(file, type.ifTrue, typeScopeFqcn, relation, parameterSubject, parameterIdentity, branchConstraints(true), budget);
    const whenFalse = this.evaluatePhpDocType(file, type.ifFalse, typeScopeFqcn, relation, parameterSubject, parameterIdentity, branchConstraints(false), budget);
    return whenTrue && whenFalse ? union(whenTrue, whenFalse) : undefined;
  }

  private conditionalCompatibility(source: PhpType, target: PhpType, relation: TypeRelationContext): Compatibility {
    if (source.kind === 'union') {
      const results = source.types.map((item) => this.conditionalCompatibility(item, target, relation));
      return results.every((result) => result === 'yes') ? 'yes' : results.every((result) => result === 'no') ? 'no' : 'unknown';
    }
    const direct = compatibility(source, target, relation);
    if (target.kind === 'literal' && source.kind === 'primitive') {
      const primitiveName = typeof target.value === 'boolean' ? 'bool'
        : typeof target.value === 'number' ? (Number.isInteger(target.value) ? 'int' : 'float') : 'string';
      if (source.name === primitiveName) return 'unknown';
    }
    if (direct === 'no' && compatibility(target, source, relation) === 'yes') return 'unknown';
    return direct;
  }

  private conditionalSubjectBranch(source: PhpType, target: PhpType, matches: boolean,
    relation: TypeRelationContext): PhpType | undefined {
    if (source.kind === 'union') {
      const possible = source.types.filter((item) => {
        const result = this.conditionalCompatibility(item, target, relation);
        return matches ? result !== 'no' : result !== 'yes';
      });
      return possible.length ? union(...possible) : undefined;
    }
    if (source.kind === 'primitive' && source.name === 'bool' && target.kind === 'literal' && typeof target.value === 'boolean') {
      return literal(matches ? target.value : !target.value);
    }
    const result = this.conditionalCompatibility(source, target, relation);
    if ((matches && result === 'yes') || (!matches && result === 'no')) return source;
    if (matches && result === 'unknown' && compatibility(target, source, relation) === 'yes') return target;
    return undefined;
  }

  private expandedCallArguments(file: SemanticFile, start: number, end: number): Array<{ name?: string; start: number; end: number; type?: PhpType }> | undefined {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    type ExpandedArgument = { name?: string; start: number; end: number; type?: PhpType };
    try {
      const nodeAtRange = (rangeStart: number, rangeEnd: number, type: string): SyntaxNode | undefined =>
        deepestLocalSyntax(tree.rootNode, rangeStart, rangeEnd, (node) => node.startIndex === rangeStart && node.endIndex === rangeEnd && node.type === type);
      const expandArray = (array: SyntaxNode): ExpandedArgument[] | undefined => {
        const expanded: ExpandedArgument[] = [];
        for (const element of array.namedChildren) {
          if (element.type !== 'array_element_initializer') return undefined;
          const value = element.namedChildren.at(-1); if (!value) return undefined;
          if (element.namedChildren.length === 1) { expanded.push({ start: value.startIndex, end: value.endIndex }); continue; }
          if (element.namedChildren.length !== 2) return undefined;
          const key = element.namedChildren[0]!.text.trim();
          if (/^-?\d+$/.test(key)) { expanded.push({ start: value.startIndex, end: value.endIndex }); continue; }
          const namedKey = /^(?:'([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)'|"([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)")$/.exec(key);
          if (!namedKey) return undefined;
          expanded.push({ name: namedKey[1] ?? namedKey[2], start: value.startIndex, end: value.endIndex });
        }
        return expanded;
      };
      const expandShape = (type: PhpType | undefined, source: SyntaxNode): ExpandedArgument[] | undefined => {
        if (type?.kind !== 'shape' || !type.sealed || type.fields.some((field) => field.optional
          || typeof field.key !== 'string' || !/^[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(field.key))) return undefined;
        return type.fields.map((field) => ({ name: String(field.key), start: source.startIndex, end: source.endIndex, type: field.type }));
      };
      const expandLinearNumericLocal = (variable: SyntaxNode, unpack: SyntaxNode): ExpandedArgument[] | undefined => {
        let statement: SyntaxNode | undefined = unpack;
        while (statement && statement.parent?.type !== 'compound_statement') statement = statement.parent ?? undefined;
        const block = statement?.parent; if (!statement || !block) return undefined;
        const statementIndex = block.namedChildren.findIndex((candidate) => candidate.startIndex === statement!.startIndex
          && candidate.endIndex === statement!.endIndex);
        if (statementIndex < 0) return undefined;
        const escapedVariable = variable.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const updates: Array<{ index?: number; argument: ExpandedArgument }> = [];
        for (let cursor = statementIndex - 1; cursor >= 0; cursor -= 1) {
          const candidate = block.namedChildren[cursor]!;
          const assignment = candidate.type === 'expression_statement' ? candidate.namedChildren[0] : undefined;
          const left = assignment?.type === 'assignment_expression' ? assignment.childForFieldName('left') : undefined;
          const right = assignment?.type === 'assignment_expression' ? assignment.childForFieldName('right') : undefined;
          if (left?.type === 'variable_name' && left.text === variable.text) {
            if (!right || right.type !== 'array_creation_expression') return undefined;
            if (updates.length && right.namedChildren.some((element) => element.type !== 'array_element_initializer'
              || element.namedChildren.length !== 1)) return undefined;
            const base = expandArray(right); if (!base || base.some((argument) => argument.name) || base.length + updates.length > 64) return undefined;
            const expanded = [...base];
            for (const update of updates.reverse()) {
              if (update.index !== undefined && update.index !== expanded.length) return undefined;
              expanded.push(update.argument);
            }
            return expanded;
          }
          if (left?.type === 'subscript_expression' && right) {
            const compact = left.text.replace(/\s+/g, '');
            const append = compact === `${variable.text}[]`;
            const indexed = new RegExp(`^${escapedVariable}\\[(0|[1-9][0-9]*)\\]$`).exec(compact)?.[1];
            if (append || indexed !== undefined) {
              if (right.text.includes(variable.text)) return undefined;
              const type = this.provenArgumentType(file, right.startIndex, right.endIndex); if (!type) return undefined;
              updates.push({ index: indexed === undefined ? undefined : Number(indexed),
                argument: { start: right.startIndex, end: right.endIndex, type } });
              continue;
            }
          }
          if (candidate.text.includes(variable.text)) return undefined;
        }
        return undefined;
      };
      const expand = (node: SyntaxNode): ExpandedArgument[] | undefined => {
        const name = node.childForFieldName('name')?.text;
        const value = node.namedChildren.at(-1);
        if (name) return value ? [{ name, start: value.startIndex, end: value.endIndex }] : undefined;
        const unpack = node.namedChildren.find((child) => child.type === 'variadic_unpacking');
        if (!unpack) return value ? [{ start: value.startIndex, end: value.endIndex }] : undefined;
        let array = unpack.namedChildren[0];
        if (array?.type === 'variable_name') {
          const scope = this.containingScope(file, start); if (!scope) return undefined;
          const assignments = file.assignments.filter((assignment) => assignment.scopeId === scope.id
            && assignment.variable === array!.text && assignment.end <= unpack.startIndex);
          if (!assignments.length) {
            const parameter = scope.parameters.find((candidate) => `$${candidate.name}` === array!.text);
            const references = parameter && file.variableReferences.filter((reference) => reference.scopeId === scope.id
              && reference.variable === array!.text && reference.end <= start);
            if (!parameter || parameter.byReference || !references?.some((reference) => reference.start >= parameter.start && reference.end <= parameter.end)
              || references.some((reference) => reference.start < parameter.start || reference.end > parameter.end)) return undefined;
            return expandShape(this.provenArgumentType(file, array.startIndex, array.endIndex), array);
          }
          const localNumeric = expandLinearNumericLocal(array, unpack); if (localNumeric) return localNumeric;
          const localShape = expandShape(this.provenArgumentType(file, array.startIndex, array.endIndex), array);
          if (localShape) return localShape;
          if (assignments.length !== 1) return undefined;
          const assignment = assignments[0]!;
          const references = file.variableReferences.filter((reference) => reference.scopeId === scope.id
            && reference.variable === array!.text && reference.end <= start);
          if (!references.length || references.some((reference) => reference.start < assignment.start || reference.end > assignment.end)) return undefined;
          const assignmentNode = nodeAtRange(assignment.start, assignment.end, 'assignment_expression');
          array = assignmentNode?.childForFieldName('right') ?? undefined;
        }
        return array?.type === 'array_creation_expression' ? expandArray(array) : undefined;
      };
      const call = deepestLocalSyntax(tree.rootNode, start, end,
        (node) => node.startIndex === start && node.endIndex === end
          && (/call_expression$/.test(node.type) || node.type === 'object_creation_expression'));
      const argumentsNode = call?.childForFieldName('arguments') ?? call?.namedChildren.find((child) => child.type === 'arguments');
      const arguments_ = argumentsNode?.namedChildren.filter((child) => child.type === 'argument'); if (!arguments_) return undefined;
      const expanded = arguments_.map(expand);
      return expanded.every((item): item is ExpandedArgument[] => Boolean(item)) ? expanded.flat() : undefined;
    } finally {
      temporaryTree?.delete();
    }
  }

  private callTemplateArguments(callerFile: SemanticFile, call: ParsedCall, signature: SignatureInfo,
    declarationFile: SemanticFile, templates: SemanticTemplate[], ignoredArgument?: { start: number; end: number }): Array<Record<string, string>> | undefined {
    const callArguments = this.expandedCallArguments(callerFile, call.start, call.end);
    if (!templates.length || !callArguments) return undefined;
    const templateNames = new Set(templates.map((template) => template.name));
    const maxInferenceAlternatives = 64;
    type InferenceState = { bindings: Map<string, PhpType>; observations: Array<{ expected: PhpDocType; actual: PhpType }> };
    let states: InferenceState[] = [{ bindings: new Map(), observations: [] }];
    const relation = this.typeRelationContext();
    type BoundAlternative = { bindings: Map<string, PhpType>; actual: PhpType };
    const bind = (expected: PhpDocType, actual: PhpType, target: Map<string, PhpType>): BoundAlternative[] => {
      if (expected.kind === 'name' && templateNames.has(expected.name)) {
        const previous = target.get(expected.name);
        if (previous && displayType(previous).toLowerCase() !== displayType(actual).toLowerCase()) return [];
        const bindings = new Map(target); bindings.set(expected.name, actual); return [{ bindings, actual }];
      }
      if (expected.kind === 'nullable') {
        const nonNull = actual.kind === 'union' ? actual.types.filter((type) => !(type.kind === 'primitive' && type.name === 'null')) : [actual];
        if (!nonNull.length) return [];
        const alternatives = bind(expected.type, nonNull.length === 1 ? nonNull[0]! : union(...nonNull), target);
        return actual.kind === 'union' && actual.types.some((type) => type.kind === 'primitive' && type.name === 'null')
          ? alternatives.map((alternative) => ({ ...alternative, actual: nullable(alternative.actual) })) : alternatives;
      }
      if (expected.kind === 'union') {
        const alternatives = expected.types.flatMap((branch) => bind(branch, actual, new Map(target)));
        const unique = new Map(alternatives.map((alternative) => [
          JSON.stringify([...alternative.bindings].map(([name, type]) => [name, displayType(type)])), alternative,
        ]));
        return [...unique.values()].slice(0, maxInferenceAlternatives);
      }
      if (actual.kind === 'union') {
        const alternatives: BoundAlternative[] = [];
        for (const branch of actual.types) {
          const branchAlternatives = bind(expected, branch, new Map(target));
          if (!branchAlternatives.length) return [];
          alternatives.push(...branchAlternatives);
          if (alternatives.length > maxInferenceAlternatives) return [];
        }
        return alternatives;
      }
      if (expected.kind === 'array') {
        if (actual.kind !== 'list' && actual.kind !== 'array') return [];
        return bind(expected.element, actual.valueType, target).map((alternative) => ({
          bindings: alternative.bindings,
          actual: actual.kind === 'list' ? listType(alternative.actual, actual.nonEmpty)
            : { ...actual, valueType: alternative.actual },
        }));
      }
      if (expected.kind === 'generic' && expected.base.kind === 'name') {
        const base = expected.base.name.toLowerCase();
        if ((base === 'list' || base === 'non-empty-list') && expected.arguments.length === 1 && actual.kind === 'list') {
          if (base === 'non-empty-list' && !actual.nonEmpty) return [];
          return bind(expected.arguments[0]!, actual.valueType, target).map((alternative) => ({
            bindings: alternative.bindings, actual: listType(alternative.actual, actual.nonEmpty),
          }));
        }
        if ((base === 'array' || base === 'non-empty-array') && expected.arguments.length === 2
          && (actual.kind === 'array' || actual.kind === 'list' || actual.kind === 'shape')) {
          const shapeNonEmpty = actual.kind === 'shape' && actual.fields.some((field) => !field.optional);
          if (base === 'non-empty-array' && (actual.kind === 'shape' ? !shapeNonEmpty : !actual.nonEmpty)) return [];
          if (actual.kind === 'shape' && !actual.fields.length) return [];
          const keyType = actual.kind === 'list' ? primitive('int') : actual.kind === 'shape'
            ? union(...actual.fields.map((field) => primitive(typeof field.key === 'number' ? 'int' : 'string'))) : actual.keyType;
          const valueType = actual.kind === 'shape' ? union(...actual.fields.map((field) => field.type)) : actual.valueType;
          return bind(expected.arguments[0]!, keyType, target).flatMap((keyAlternative) =>
            bind(expected.arguments[1]!, valueType, keyAlternative.bindings).map((valueAlternative) => ({
              bindings: valueAlternative.bindings,
              actual: actual.kind === 'list' ? listType(valueAlternative.actual, actual.nonEmpty)
                : actual.kind === 'shape' ? arrayType(valueAlternative.actual, keyAlternative.actual, shapeNonEmpty)
                  : { ...actual, keyType: keyAlternative.actual, valueType: valueAlternative.actual },
            })));
        }
        if (base === 'class-string' && expected.arguments.length === 1 && actual.kind === 'class-string' && actual.of) {
          return bind(expected.arguments[0]!, actual.of, target).map((alternative) => ({
            bindings: alternative.bindings, actual: classString(alternative.actual),
          }));
        }
        if (actual.kind !== 'generic') return [];
        const expectedBase = this.phpDocDiagnosticType(declarationFile, expected.base, signature.typeScopeFqcn);
        if (!expectedBase || compatibility(actual.base, expectedBase, relation) !== 'yes') return [];
        let actualArguments = actual.arguments;
        if (displayType(actual.base).toLowerCase() !== displayType(expectedBase).toLowerCase()) {
          if (!['named', 'primitive'].includes(actual.base.kind) || !['named', 'primitive'].includes(expectedBase.kind)) return [];
          const inherited = this.genericSupertype(displayType(actual.base), actual.arguments, displayType(expectedBase));
          if (inherited?.kind !== 'generic' || inherited.arguments.length !== expected.arguments.length) return [];
          actualArguments = inherited.arguments;
        }
        if (expected.arguments.length !== actualArguments.length) return [];
        let alternatives = [{ bindings: new Map(target), arguments: [] as PhpType[] }];
        for (const [index, argument] of expected.arguments.entries()) {
          alternatives = alternatives.flatMap((alternative) => bind(argument, actualArguments[index]!, alternative.bindings)
            .map((bound) => ({ bindings: bound.bindings, arguments: [...alternative.arguments, bound.actual] })));
          if (!alternatives.length || alternatives.length > maxInferenceAlternatives) return [];
        }
        return alternatives.map((alternative) => ({ bindings: alternative.bindings, actual: generic(expectedBase, ...alternative.arguments) }));
      }
      if (expected.kind === 'shape' && actual.kind === 'shape') {
        let alternatives = [{ bindings: new Map(target), fields: [...actual.fields] }];
        for (const field of expected.fields) {
          if (field.key === undefined) return [];
          const rawKey = field.key; const numeric = /^-?\d+$/.test(rawKey) ? Number(rawKey) : undefined;
          const key = numeric ?? (/^(['"])([^\\]*)\1$/.exec(rawKey)?.[2] ?? rawKey);
          const fieldIndex = actual.fields.findIndex((candidate) => candidate.key === key);
          if (fieldIndex < 0) { if (field.optional) continue; return []; }
          alternatives = alternatives.flatMap((alternative) => bind(field.type, alternative.fields[fieldIndex]!.type, alternative.bindings)
            .map((bound) => ({ bindings: bound.bindings, fields: alternative.fields.map((candidate, index) =>
              index === fieldIndex ? { ...candidate, type: bound.actual } : candidate) })));
          if (!alternatives.length || alternatives.length > maxInferenceAlternatives) return [];
        }
        return alternatives.map((alternative) => ({ bindings: alternative.bindings, actual: shape(alternative.fields, actual.sealed) }));
      }
      if (expected.kind === 'callable' && actual.kind === 'callable') {
        const actualRequired = actual.parameters.filter((parameter) => !parameter.optional && !parameter.variadic).length;
        const expectedRequired = expected.parameters.filter((parameter) => !parameter.optional && !parameter.variadic).length;
        if (actualRequired > expectedRequired
          || actual.parameters.slice(expected.parameters.length).some((parameter) => !parameter.optional && !parameter.variadic)) return [];
        let alternatives: BoundAlternative[] = [{ bindings: new Map(target), actual }];
        for (const [index, parameter] of actual.parameters.entries()) {
          const expectedParameter = expected.parameters[index]; if (!expectedParameter) continue;
          alternatives = alternatives.flatMap((alternative) => bind(expectedParameter.type, parameter.type, alternative.bindings)
            .map((bound) => ({ bindings: bound.bindings, actual })));
          if (!alternatives.length || alternatives.length > maxInferenceAlternatives) return [];
        }
        if (expected.returnType) {
          alternatives = alternatives.flatMap((alternative) => bind(expected.returnType!, actual.returnType, alternative.bindings)
            .map((bound) => ({ bindings: bound.bindings, actual })));
        }
        return alternatives;
      }
      return [{ bindings: new Map(target), actual }];
    };
    const assigned = new Set<number>(); const assignedNames = new Set<string>();
    const variadicIndex = signature.parameters.findIndex((parameter) => parameter.variadic);
    let positionalIndex = 0; let namedStarted = false;
    for (const argument of callArguments) {
      let parameterIndex: number;
      if (argument.name) {
        namedStarted = true;
        if (assignedNames.has(argument.name)) return undefined;
        assignedNames.add(argument.name);
        const namedIndex = signature.parameters.findIndex((parameter) => parameter.name === argument.name);
        parameterIndex = namedIndex >= 0 ? namedIndex : variadicIndex;
      } else {
        if (namedStarted) return undefined;
        parameterIndex = positionalIndex < signature.parameters.length ? positionalIndex : variadicIndex;
      }
      const parameter = parameterIndex >= 0 ? signature.parameters[parameterIndex] : undefined;
      if (!parameter || (assigned.has(parameterIndex) && !parameter.variadic)) return undefined;
      if (!argument.name && !parameter.variadic) positionalIndex += 1;
      if (!parameter.variadic) assigned.add(parameterIndex);
      if (ignoredArgument && argument.start <= ignoredArgument.start && argument.end >= ignoredArgument.end) {
        continue;
      }
      const documented = parameter.type ? parsePhpDocType(parameter.type).type : undefined;
      if (!documented || !templates.some((template) => new RegExp(`(?<![A-Za-z0-9_\\\\])${template.name}(?![A-Za-z0-9_])`).test(parameter.type!))) continue;
      const actual = argument.type ?? this.provenArgumentType(callerFile, argument.start, argument.end);
      if (!actual) return undefined;
      const next: InferenceState[] = [];
      for (const state of states) {
        const alternatives = bind(documented, actual, state.bindings); if (!alternatives.length) return undefined;
        for (const alternative of alternatives) {
          next.push({ bindings: alternative.bindings,
            observations: [...state.observations, { expected: documented, actual: alternative.actual }] });
          if (next.length > maxInferenceAlternatives) return undefined;
        }
      }
      states = next;
    }
    if (signature.parameters.some((parameter, index) => parameter.defaultValue === undefined && !parameter.variadic && !assigned.has(index))) return undefined;
    const results: Array<Record<string, string>> = [];
    for (const state of states) {
      let valid = true;
      for (const [name, actual] of state.bindings) {
        const template = templates.find((candidate) => candidate.name === name); if (!template?.bound) continue;
        const bound = parsePhpDocType(template.bound).type;
        const expected = bound && this.phpDocDiagnosticType(declarationFile, bound, signature.typeScopeFqcn);
        if (!expected || compatibility(actual, expected, relation) !== 'yes') { valid = false; break; }
      }
      if (!valid || !state.bindings.size) continue;
      const result = Object.fromEntries([...state.bindings].map(([name, type]) => [name, displayType(type)]));
      for (const observation of state.observations) {
        const specialized = specializeTemplateType(displayPhpDocType(observation.expected), result);
        const parsed = specialized && parsePhpDocType(specialized).type;
        const expected = parsed && this.phpDocDiagnosticType(declarationFile, parsed, signature.typeScopeFqcn);
        if (!expected) { valid = false; break; }
        if (isDirectScalar(observation.actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(callerFile)) continue;
        if (compatibility(observation.actual, expected, relation) !== 'yes') { valid = false; break; }
      }
      if (valid) results.push(result);
    }
    const unique = new Map(results.map((result) => [JSON.stringify(result), result]));
    return [...unique.values()];
  }

  private callArgumentsCompatible(callerFile: SemanticFile, call: ParsedCall, signature: SignatureInfo,
    declarationFile: SemanticFile, templateArguments?: Record<string, string>): boolean {
    const callArguments = this.expandedCallArguments(callerFile, call.start, call.end); if (!callArguments) return false;
    const relation = this.typeRelationContext();
    const callableTemplates = declarationFile.templates.filter((template) => template.ownerFqcn.toLowerCase() === signature.fqcn.toLowerCase());
    const assigned = new Set<number>(); const assignedNames = new Set<string>();
    const variadicIndex = signature.parameters.findIndex((parameter) => parameter.variadic);
    let positionalIndex = 0; let namedStarted = false;
    for (const argument of callArguments) {
      let parameterIndex: number;
      if (argument.name) {
        namedStarted = true;
        if (assignedNames.has(argument.name)) return false;
        assignedNames.add(argument.name);
        const namedIndex = signature.parameters.findIndex((parameter) => parameter.name === argument.name);
        parameterIndex = namedIndex >= 0 ? namedIndex : variadicIndex;
      } else {
        if (namedStarted) return false;
        parameterIndex = positionalIndex < signature.parameters.length ? positionalIndex : variadicIndex;
      }
      const parameter = parameterIndex >= 0 ? signature.parameters[parameterIndex] : undefined;
      if (!parameter) { if (argument.name) return false; continue; }
      if (assigned.has(parameterIndex) && !parameter.variadic) return false;
      if (!argument.name && !parameter.variadic) positionalIndex += 1;
      if (!parameter.variadic) assigned.add(parameterIndex);
      const rawDocumented = specializeTemplateType(parameter.type, templateArguments);
      const hasUnboundTemplate = callableTemplates.some((template) => rawDocumented
        && new RegExp(`(?<![A-Za-z0-9_\\\\])${template.name}(?![A-Za-z0-9_])`).test(rawDocumented));
      const documented = rawDocumented && !hasUnboundTemplate ? parsePhpDocType(rawDocumented).type : undefined;
      const expected = documented ? this.phpDocDiagnosticType(declarationFile, documented, signature.typeScopeFqcn)
        : parameter.nativeType ? this.nativeType(declarationFile, specializeTemplateType(parameter.nativeType, templateArguments)!, signature.typeScopeFqcn) : undefined;
      if (!expected || (expected.kind === 'primitive' && expected.name === 'mixed')) continue;
      const actual = argument.type ?? this.provenArgumentType(callerFile, argument.start, argument.end); if (!actual) return false;
      if (isDirectScalar(actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(callerFile)) continue;
      if (compatibility(actual, expected, relation) !== 'yes') return false;
    }
    return !signature.parameters.some((parameter, index) => parameter.defaultValue === undefined && !parameter.variadic && !assigned.has(index));
  }

  private callableVariableResultType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    type CallableArgument = { name?: string; start: number; end: number; type?: PhpType };
    let variable: string | undefined; let callStart = start; let callEnd = end;
    try {
      const call = firstLocalSyntax(tree.rootNode, (node) => node.endIndex >= start && node.startIndex <= end
        && node.startIndex >= start && node.endIndex <= end && node.type === 'function_call_expression'
        && node.childForFieldName('function')?.type === 'variable_name');
      const functionNode = call?.childForFieldName('function');
      if (functionNode?.type !== 'variable_name') return undefined;
      variable = functionNode.text; callStart = call!.startIndex; callEnd = call!.endIndex;
    } finally {
      temporaryTree?.delete();
    }
    const callArguments = this.expandedCallArguments(file, callStart, callEnd); if (!callArguments) return undefined;
    const scope = variable ? this.containingScope(file, callStart) : undefined;
    if (!variable || !scope) return undefined;
    let sourceVariable = variable; let aliasAssignment: ParsedAssignment | undefined;
    let parameter = scope.parameters.find((candidate) => `$${candidate.name}` === sourceVariable);
    if (!parameter) {
      const assignments = file.assignments.filter((assignment) => assignment.scopeId === scope.id && assignment.variable === variable && assignment.end <= callStart);
      if (assignments.length !== 1 || !assignments[0]!.sourceVariable) return undefined;
      const directAlias = assignments[0]!; aliasAssignment = directAlias; sourceVariable = directAlias.sourceVariable!;
      parameter = scope.parameters.find((candidate) => `$${candidate.name}` === sourceVariable);
      const aliasReferences = file.variableReferences.filter((reference) => reference.scopeId === scope.id && reference.variable === variable && reference.end <= callStart);
      if (!aliasReferences.length || aliasReferences.some((reference) => reference.start < aliasAssignment!.start || reference.end > aliasAssignment!.end)) return undefined;
    }
    if (!parameter?.type || parameter.byReference) return undefined;
    const priorReferences = file.variableReferences.filter((reference) => reference.scopeId === scope.id && reference.variable === sourceVariable && reference.end <= callStart);
    const allowedReference = (reference: ParsedVariableReference): boolean => (reference.start >= parameter!.start && reference.end <= parameter!.end)
      || Boolean(aliasAssignment && reference.start >= aliasAssignment.start && reference.end <= aliasAssignment.end);
    if (!priorReferences.some((reference) => reference.start >= parameter.start && reference.end <= parameter.end)
      || priorReferences.some((reference) => !allowedReference(reference))
      || file.assignments.some((assignment) => assignment.scopeId === scope.id && assignment.variable === sourceVariable && assignment.end <= callStart)) return undefined;
    const callable = parsePhpDocType(parameter.type).type;
    if (callable?.kind !== 'callable' || !callable.returnType) return undefined;
    const variadicIndex = callable.parameters.findIndex((item) => item.variadic);
    const assigned = new Set<number>(); const assignedNames = new Set<string>(); const mappedArguments = new Map<number, CallableArgument[]>();
    let positionalIndex = 0; let namedStarted = false;
    const relation = this.typeRelationContext();
    const acceptsArgument = (argument: CallableArgument, parameterIndex: number): boolean => {
      const expected = this.phpDocDiagnosticType(file, callable.parameters[parameterIndex]!.type, scope.containerFqcn ?? scope.id);
      if (!expected) return false;
      if (expected.kind === 'primitive' && expected.name === 'mixed') return true;
      const actual = argument.type ?? this.provenArgumentType(file, argument.start, argument.end); if (!actual) return false;
      if (isDirectScalar(actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(file)) return true;
      return compatibility(actual, expected, relation) === 'yes';
    };
    const mapArgument = (parameterIndex: number, argument: CallableArgument): void => {
      mappedArguments.set(parameterIndex, [...(mappedArguments.get(parameterIndex) ?? []), argument]);
    };
    for (const argument of callArguments) {
      if (argument.name) {
        namedStarted = true;
        if (assignedNames.has(argument.name)) return undefined;
        assignedNames.add(argument.name);
        const parameterIndex = callable.parameters.findIndex((item) => item.name === argument.name);
        if (parameterIndex < 0) {
          if (variadicIndex < 0 || !acceptsArgument(argument, variadicIndex)) return undefined;
          mapArgument(variadicIndex, argument);
          continue;
        }
        if (assigned.has(parameterIndex)) return undefined;
        if (!acceptsArgument(argument, parameterIndex)) return undefined;
        mapArgument(parameterIndex, argument);
        assigned.add(parameterIndex); continue;
      }
      if (namedStarted) return undefined;
      if (positionalIndex >= callable.parameters.length) {
        if (variadicIndex < 0 || !acceptsArgument(argument, variadicIndex)) return undefined;
        mapArgument(variadicIndex, argument);
        continue;
      }
      if (callable.parameters[positionalIndex]!.variadic) {
        if (!acceptsArgument(argument, positionalIndex)) return undefined;
        mapArgument(positionalIndex, argument);
        continue;
      }
      if (!acceptsArgument(argument, positionalIndex)) return undefined;
      mapArgument(positionalIndex, argument);
      assigned.add(positionalIndex); positionalIndex += 1;
    }
    if (callable.parameters.some((item, index) => !item.optional && !item.variadic && !assigned.has(index))) return undefined;
    const displayed = displayPhpDocType(callable.returnType).toLowerCase(); if (displayed === 'mixed' || displayed === 'void') return undefined;
    const callableArgument = (name: string): CallableArgument | undefined => {
      const parameterIndex = callable.parameters.findIndex((item) => item.name === name); if (parameterIndex < 0) return undefined;
      const arguments_ = mappedArguments.get(parameterIndex); if (arguments_?.length !== 1) return undefined;
      return arguments_[0];
    };
    return this.evaluatePhpDocType(file, callable.returnType, scope.containerFqcn ?? scope.id, relation, (name) => {
      const argument = callableArgument(name); if (!argument) return undefined;
      const text = file.source.slice(argument.start, argument.end).trim().toLowerCase();
      return text === 'true' ? literal(true) : text === 'false' ? literal(false)
        : argument.type ?? this.provenArgumentType(file, argument.start, argument.end);
    }, (name) => {
      const argument = callableArgument(name); if (!argument) return undefined;
      const text = file.source.slice(argument.start, argument.end).trim();
      return /^\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(text) ? `argument:${text}` : undefined;
    });
  }

  private memberChainResultType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    type ChainStep = { kind: 'property' | 'method'; name: string; nullsafe: boolean; argumentCount: number };
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    let chain: { variable: string; steps: ChainStep[] } | undefined;
    try {
      const parse = (node: SyntaxNode, depth = 0): { variable: string; steps: ChainStep[] } | undefined => {
        if (depth > MAX_LOCAL_SYNTAX_DEPTH) return undefined;
        if (node.type === 'variable_name') return { variable: node.text, steps: [] };
        const property = node.type === 'member_access_expression' || node.type === 'nullsafe_member_access_expression';
        const method = node.type === 'member_call_expression' || node.type === 'nullsafe_member_call_expression';
        if (!property && !method) return undefined;
        const object = node.childForFieldName('object'); const name = node.childForFieldName('name');
        const base = object && parse(object, depth + 1); if (!base || name?.type !== 'name') return undefined;
        let argumentCount = 0;
        if (method) {
          const argumentsNode = node.childForFieldName('arguments');
          const arguments_ = argumentsNode?.namedChildren.filter((child) => child.type === 'argument'); if (!arguments_) return undefined;
          if (arguments_.some((argument) => Boolean(argument.childForFieldName('name')) || argument.text.trimStart().startsWith('...'))) return undefined;
          argumentCount = arguments_.length;
        }
        return { variable: base.variable, steps: [...base.steps, { kind: property ? 'property' : 'method', name: name.text, nullsafe: node.type.startsWith('nullsafe_'), argumentCount }] };
      };
      const exactNode = deepestLocalSyntax(tree.rootNode, start, end,
        (node) => node.startIndex === start && node.endIndex === end);
      const node = exactNode?.type === 'argument' ? exactNode.namedChildren.at(-1) : exactNode;
      chain = node ? parse(node) : undefined;
    } finally {
      temporaryTree?.delete();
    }
    if (!chain || chain.steps.length < 1 || (chain.steps.length === 1 && chain.steps[0]?.kind === 'method')) return undefined;
    const scope = this.containingScope(file, start); let target = this.variableClass(file, chain.variable, start, new Set(), true);
    if (!scope) return undefined;
    if (!target) {
      const composite = this.variableObjectGroups(file, chain.variable, start, new Set()); if (!composite?.groups.length) return undefined;
      let groups = composite.groups; let compositeNullable = composite.nullable;
      for (const [index, step] of chain.steps.entries()) {
        if (compositeNullable && !step.nullsafe) return undefined;
        const first = groups[0]?.[0]; if (!first) return undefined;
        const member = this.targetMembers({ fqcn: first.fqcn, member: step.name, accessFrom: scope.containerFqcn, static: false, groups })
          .find((item) => item.kind === step.kind && !item.static && item.name.toLowerCase() === step.name.toLowerCase());
        if (!member) return undefined;
        if (step.kind === 'method') {
          const required = member.parameters.filter((parameter) => parameter.defaultValue === undefined && !parameter.variadic).length;
          if (step.argumentCount < required || (!member.parameters.some((parameter) => parameter.variadic) && step.argumentCount > member.parameters.length)) return undefined;
        }
        const signature = this.memberSignature(member);
        const candidates = groups.map((group) => group.flatMap((variant) => this.members(variant.fqcn, scope.containerFqcn, new Set(), false, variant.typeArguments))
          .filter((item) => item.kind === step.kind && !item.static && item.name.toLowerCase() === step.name.toLowerCase() && this.memberSignature(item) === signature));
        if (candidates.some((items) => !items.length)) return undefined;
        if (index === chain.steps.length - 1) {
          const types = candidates.map((items) => {
            const unique = new Map(items.flatMap((item) => {
              const type = this.memberDiagnosticType(item, item.kind === 'property'); return type ? [[displayType(type).toLowerCase(), type] as const] : [];
            }));
            return unique.size === 1 ? [...unique.values()][0] : undefined;
          });
          if (!types.every((type): type is PhpType => Boolean(type))) return undefined;
          const unique = new Map(types.map((type) => [displayType(type).toLowerCase(), type])); if (unique.size !== 1) return undefined;
          const result = [...unique.values()][0]!; return compositeNullable && step.nullsafe ? nullable(result) : result;
        }
        const returned = candidates.map((items) => {
          const unique = new Map(items.flatMap((item) => {
            const value = this.memberReturnClass(item, true); return value
              ? [[`${value.fqcn.toLowerCase()}:${value.nullable}:${JSON.stringify(value.typeArguments ?? {})}`, value] as const] : [];
          }));
          return unique.size === 1 ? [...unique.values()][0] : undefined;
        });
        if (!returned.every((item): item is ObjectClass => Boolean(item))) return undefined;
        if (returned.some((item) => !this.fileAndDeclaration(item.fqcn))) return undefined;
        compositeNullable = returned.some((item) => item.nullable) || (compositeNullable && step.nullsafe);
        groups = returned.map((item) => [item]);
      }
      return undefined;
    }
    for (const [index, step] of chain.steps.entries()) {
      if (target.nullable && !step.nullsafe) return undefined;
      const member = this.members(target.fqcn, scope.containerFqcn, new Set(), false, target.typeArguments)
        .find((item) => item.kind === step.kind && !item.static && item.name.toLowerCase() === step.name.toLowerCase());
      if (!member) return undefined;
      if (step.kind === 'method') {
        const required = member.parameters.filter((parameter) => parameter.defaultValue === undefined && !parameter.variadic).length;
        if (step.argumentCount < required || (!member.parameters.some((parameter) => parameter.variadic) && step.argumentCount > member.parameters.length)) return undefined;
      }
      if (index === chain.steps.length - 1) {
        const result = this.memberDiagnosticType(member, member.kind === 'property'); if (!result) return undefined;
        return target.nullable && step.nullsafe ? nullable(result) : result;
      }
      const returned = this.memberReturnClass(member, true); if (!returned || !this.fileAndDeclaration(returned.fqcn)) return undefined;
      target = { ...returned, nullable: returned.nullable || (target.nullable && step.nullsafe) };
    }
    return undefined;
  }

  private genericObjectReference(fqcn: string, arguments_: Record<string, string> | undefined): string {
    const owner = this.fileAndDeclaration(fqcn);
    const templates = owner?.file.templates.filter((template) => template.ownerFqcn.toLowerCase() === fqcn.toLowerCase()) ?? [];
    const concrete = arguments_ && templates.map((template) => arguments_[template.name]);
    return templates.length > 0 && concrete?.length === templates.length && concrete.every(Boolean)
      ? `${fqcn}<${concrete.join(', ')}>` : fqcn;
  }

  private memberDiagnosticType(member: MemberInfo, allowMixed = false): PhpType | undefined {
    if (member.kind === 'property' && member.readable === false) return undefined;
    const file = this.files.get(member.uri); let returnType = specializeTemplateType(member.returnType, member.templateArguments);
    if (!file || !returnType || returnType.trim().toLowerCase() === 'void'
      || (!allowMixed && returnType.trim().toLowerCase() === 'mixed')) return undefined;
    const lateTypes: Record<string, string | undefined> = {
      self: this.genericObjectReference(member.typeScopeFqcn, member.templateArguments),
      static: this.genericObjectReference(member.calledOnFqcn, member.calledOnTemplateArguments ?? member.templateArguments),
      parent: this.resolveType(file, 'parent', member.typeScopeFqcn.split('\\').slice(0, -1).join('\\'), member.typeScopeFqcn),
    };
    for (const token of ['self', 'static', 'parent'] as const) {
      if (!new RegExp(`\\b${token}\\b`, 'i').test(returnType)) continue;
      const resolved = lateTypes[token]; const resolvedObject = resolved && this.objectType(resolved, false);
      if (!resolvedObject || !this.fileAndDeclaration(resolvedObject.name)) return undefined;
      returnType = returnType.replace(new RegExp(`\\b${token}\\b`, 'gi'), `\\${resolved}`);
    }
    const parsed = parsePhpDocType(returnType).type;
    return parsed ? this.phpDocDiagnosticType(file, parsed, member.typeScopeFqcn) : undefined;
  }

  private expressionSyntax(file: SemanticFile, start: number, end: number, type?: string): {
    type: string;
    namedChildren: Array<{ start: number; end: number }>;
    left?: { start: number; end: number };
    right?: { start: number; end: number };
    condition?: { start: number; end: number };
    body?: { start: number; end: number };
    alternative?: { start: number; end: number };
    operator?: string;
  } | undefined {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      const syntax = deepestLocalSyntax(tree.rootNode, start, end, (candidate) => candidate.startIndex === start
        && candidate.endIndex === end && (!type || candidate.type === type));
      if (!syntax) return undefined;
      const left = syntax.childForFieldName('left'); const right = syntax.childForFieldName('right');
      const condition = syntax.childForFieldName('condition'); const body = syntax.childForFieldName('body');
      const alternative = syntax.childForFieldName('alternative');
      return {
        type: syntax.type,
        namedChildren: syntax.namedChildren.map((child) => ({ start: child.startIndex, end: child.endIndex })),
        ...(left ? { left: { start: left.startIndex, end: left.endIndex } } : {}),
        ...(right ? { right: { start: right.startIndex, end: right.endIndex } } : {}),
        ...(condition ? { condition: { start: condition.startIndex, end: condition.endIndex } } : {}),
        ...(body ? { body: { start: body.startIndex, end: body.endIndex } } : {}),
        ...(alternative ? { alternative: { start: alternative.startIndex, end: alternative.endIndex } } : {}),
        ...(syntax.childForFieldName('operator') ? { operator: syntax.childForFieldName('operator')!.text } : {}),
      };
    } finally {
      temporaryTree?.delete();
    }
  }

  private nullCoalescingType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const expression = this.expressionSyntax(file, start, end, 'binary_expression');
    if (expression?.operator !== '??') return undefined;
    const left = expression.left; const right = expression.right;
    if (!left || !right) return undefined;
    const leftType = this.provenArgumentType(file, left.start, left.end); if (!leftType) return undefined;
    const alternatives = leftType.kind === 'union' ? leftType.types : [leftType];
    const nonNull = alternatives.filter((candidate) => !(candidate.kind === 'primitive' && candidate.name === 'null'));
    if (nonNull.length === alternatives.length) return leftType;
    const rightType = this.provenArgumentType(file, right.start, right.end); if (!rightType) return undefined;
    return nonNull.length ? union(...nonNull, rightType) : rightType;
  }

  private conditionalExpressionType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const expression = this.expressionSyntax(file, start, end, 'conditional_expression');
    const condition = expression?.condition; const body = expression?.body; const alternative = expression?.alternative;
    if (!condition || !body || !alternative) return undefined;
    const conditionText = file.source.slice(condition.start, condition.end).trim().toLowerCase();
    if (conditionText === 'true') return this.provenArgumentType(file, body.start, body.end);
    if (conditionText === 'false') return this.provenArgumentType(file, alternative.start, alternative.end);
    const bodyType = this.provenArgumentType(file, body.start, body.end);
    const alternativeType = this.provenArgumentType(file, alternative.start, alternative.end);
    return bodyType && alternativeType ? union(bodyType, alternativeType) : undefined;
  }

  private matchExpressionType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      const expression = deepestLocalSyntax(tree.rootNode, start, end, (candidate) => candidate.startIndex === start
        && candidate.endIndex === end && candidate.type === 'match_expression');
      const block = expression?.childForFieldName('body')
        ?? expression?.namedChildren.find((child) => child.type === 'match_block');
      const arms = block?.namedChildren.filter((child) => child.type === 'match_conditional_expression'
        || child.type === 'match_default_expression') ?? [];
      if (!arms.length || arms.length > MAX_MATCH_RESULT_ARMS
        || arms.filter((arm) => arm.type === 'match_default_expression').length !== 1) return undefined;
      const results = arms.map((arm) => arm.childForFieldName('return_expression') ?? arm.namedChildren.at(-1))
        .map((result) => result?.type === 'throw_expression' ? primitive('never')
          : result && this.provenArgumentType(file, result.startIndex, result.endIndex));
      return results.every((result): result is PhpType => Boolean(result)) ? union(...results) : undefined;
    } finally {
      temporaryTree?.delete();
    }
  }

  private cloneExpressionType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const retainedTree = this.trees.get(file.uri);
    const temporaryTree = retainedTree ? undefined : this.parser.parse(file.source, undefined, file.uri).tree;
    const tree = retainedTree ?? temporaryTree!;
    try {
      const clone = deepestLocalSyntax(tree.rootNode, start, end, (candidate) => candidate.startIndex === start
        && candidate.endIndex === end && candidate.type === 'clone_expression');
      if (!clone) return undefined;
      const source = file.source.slice(start, end);
      let operand: { start: number; end: number } | undefined;
      let propertyUpdates: Array<{ name: string; start: number; end: number }> = [];
      if (/^clone\s*\(/i.test(source)) {
        const stringLiteral = String.raw`(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")`;
        const key = String.raw`(?:${stringLiteral}|[0-9]+)`;
        const value = String.raw`(?:${stringLiteral}|-?[0-9]+(?:\.[0-9]+)?|true|false|null)`;
        const properties = String.raw`\[\s*(?:${key}\s*=>\s*${value}\s*(?:,\s*${key}\s*=>\s*${value}\s*)*,?\s*)?\]`;
        const match = new RegExp(String.raw`^clone\s*\(\s*(\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*(?:\s*->\s*[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)*)(?:\s*,\s*(${properties}))?\s*\)$`, 'iu').exec(source);
        if (!match) return undefined;
        const relative = source.indexOf(match[1]!);
        operand = { start: start + relative, end: start + relative + match[1]!.length };
        if (match[2]) {
          const propertiesOffset = source.indexOf(match[2]);
          const entry = new RegExp(String.raw`(${stringLiteral}|[0-9]+)\s*=>\s*(${value})`, 'giu');
          propertyUpdates = [...match[2].matchAll(entry)].map((item) => {
            const single = /^'([^'\\]*)'$/.exec(item[1]!); const double = /^"([^"\\]*)"$/.exec(item[1]!);
            const valueOffset = item.index + item[0].lastIndexOf(item[2]!);
            return { name: single?.[1] ?? double?.[1] ?? '', start: start + propertiesOffset + valueOffset,
              end: start + propertiesOffset + valueOffset + item[2]!.length };
          });
          if (propertyUpdates.some((update) => !update.name)) return undefined;
        }
      } else {
        const child = clone.namedChildren[0];
        if (child) operand = { start: child.startIndex, end: child.endIndex };
      }
      if (!operand) return undefined;
      const type = this.provenArgumentType(file, operand.start, operand.end);
      const objects = type && this.objectGroups(type);
      if (!type || !objects?.groups.length || objects.nullable) return undefined;
      const accessFrom = this.containingCallable(file, start)?.containerFqcn;
      for (const update of propertyUpdates) for (const variant of objects.groups.flat()) {
        const property = this.members(variant.fqcn, accessFrom, new Set(), false, variant.typeArguments)
          .find((candidate) => candidate.kind === 'property' && !candidate.static && candidate.name === update.name && candidate.writable !== false);
        const declarationFile = property && this.files.get(property.uri);
        const expectedText = property?.writeType ?? property?.returnType;
        const documented = expectedText ? parsePhpDocType(expectedText).type : undefined;
        const expected = declarationFile && property && documented
          ? this.phpDocDiagnosticType(declarationFile, documented, property.typeScopeFqcn) : undefined;
        const actual = this.provenArgumentType(file, update.start, update.end);
        if (!expected || !actual || (!(isDirectScalar(actual) && acceptsWeakScalarCoercion(expected) && !this.hasStrictTypes(file))
          && compatibility(actual, expected, this.typeRelationContext()) !== 'yes')) return undefined;
      }
      return type;
    } finally {
      temporaryTree?.delete();
    }
  }

  private provenArgumentType(file: SemanticFile, start: number, end: number): PhpType | undefined {
    const rawExpression = file.source.slice(start, end); const expression = rawExpression.trim();
    const expressionStart = start + rawExpression.indexOf(expression); const expressionEnd = expressionStart + expression.length;
    if (expression.toLowerCase() === 'null') return primitive('null');
    if (/^(?:true|false)$/i.test(expression)) return primitive('bool');
    if (/^[+-]?(?:0|[1-9][0-9_]*|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)$/.test(expression)) return primitive('int');
    if (/^[+-]?(?:(?:[0-9][0-9_]*)?\.[0-9][0-9_]*(?:[eE][+-]?[0-9][0-9_]*)?|[0-9][0-9_]*[eE][+-]?[0-9][0-9_]*)$/.test(expression)) return primitive('float');
    const parenthesized = expression.startsWith('(') && expression.endsWith(')')
      ? this.expressionSyntax(file, expressionStart, expressionEnd, 'parenthesized_expression') : undefined;
    if (parenthesized) {
      const inner = parenthesized.namedChildren[0];
      return inner ? this.provenArgumentType(file, inner.start, inner.end) : undefined;
    }
    if (expression.includes('??')) {
      const coalesced = this.nullCoalescingType(file, expressionStart, expressionEnd); if (coalesced) return coalesced;
    }
    if (expression.includes('|>')) {
      const piped = this.pipeExpressionType(file, expressionStart, expressionEnd); if (piped) return piped;
    }
    if (expression.includes('?') && expression.includes(':')) {
      const conditional = this.conditionalExpressionType(file, expressionStart, expressionEnd); if (conditional) return conditional;
    }
    if (/^match\s*\(/i.test(expression)) {
      const matched = this.matchExpressionType(file, expressionStart, expressionEnd); if (matched) return matched;
    }
    if (/^clone\b/i.test(expression)) {
      const cloned = this.cloneExpressionType(file, expressionStart, expressionEnd); if (cloned) return cloned;
    }
    const classConstant = /^([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)::class$/i.exec(expression)?.[1];
    if (classConstant) {
      const scope = this.containingCallable(file, start)?.containerFqcn;
      const fqcn = this.resolveSourceType(file, classConstant, this.namespaceAt(file, start), scope);
      return fqcn && this.fileAndDeclaration(fqcn) ? classString(named(fqcn)) : undefined;
    }
    const scopeFqcn = this.containingCallable(file, start)?.containerFqcn;
    const dynamicConstantType = this.dynamicClassConstantType(file, expressionStart, expressionEnd);
    if (dynamicConstantType) return dynamicConstantType;
    const resolvedConstant = this.constantDeclarationForExpression(file, expression, start, scopeFqcn);
    const constantType = resolvedConstant?.constant.kind === 'enum-case' ? undefined
      : resolvedConstant && this.constantLiteralType(resolvedConstant.file, resolvedConstant.constant);
    if (constantType) return constantType;
    if (/^'(?:\\.|[^'\\])*'$|^"(?:\\.|[^"\\])*"$/s.test(expression)) return primitive('string');
    const closure = this.closureLiteralType(file, expressionStart, expressionEnd); if (closure) return closure;
    const arrayLiteral = this.flatArrayLiteral(expression); if (arrayLiteral) return arrayLiteral;
    const structuredList = this.structuredListLiteralType(file, expressionStart, expressionEnd); if (structuredList) return structuredList;
    if (/^array\s*\(\s*\)$/i.test(expression)) return primitive('array');
    const created = /^new\s+([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*(?:\(|$)/i.exec(expression)?.[1];
    if (created) {
      const scope = this.containingCallable(file, start)?.containerFqcn;
      const fqcn = this.resolveSourceType(file, created, this.namespaceAt(file, start), scope);
      return fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
    }
    const callResult = this.callResultType(file, expressionStart, expressionEnd); if (callResult) return callResult;
    const chainResult = this.memberChainResultType(file, expressionStart, expressionEnd);
    if (chainResult) {
      const directProperty = /^(\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)((?:\s*->\s*[A-Za-z_][A-Za-z0-9_]*)+)$/.exec(expression);
      if (!directProperty) return chainResult;
      const propertyPath = [...directProperty[2]!.matchAll(/->\s*([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]!);
      const scope = this.containingScope(file, start);
      const narrowed = scope
        ? this.propertyFlowNarrowedType(file, directProperty[1]!, propertyPath, start, scope, chainResult)
        : { applied: false };
      return narrowed.applied ? narrowed.type : chainResult;
    }
    const callableResult = this.callableVariableResultType(file, expressionStart, expressionEnd); if (callableResult) return callableResult;
    const directArrayElement = this.directArrayElement(expression);
    if (directArrayElement) {
      const scope = this.containingScope(file, start);
      if (!scope) return undefined;
      const annotatedCollection = this.standaloneLocalVariableAnnotationType(file, directArrayElement.variable, start, scope)
        ?? this.localArrayAnnotationType(file, directArrayElement.variable, start, scope);
      const inferredCollection = annotatedCollection ? undefined
        : this.linearLocalValueType(file, directArrayElement.variable, start, true)
          ?? this.iterationVariableType(file, directArrayElement.variable, start, scope);
      let collection = annotatedCollection ?? inferredCollection;
      if (!collection && !file.assignments.some((item) => item.scopeId === scope.id
        && item.variable === directArrayElement.variable && item.end <= start)) {
        const parameter = scope.parameters.find((item) => `$${item.name}` === directArrayElement.variable);
        const documented = parameter?.type ? parsePhpDocType(parameter.type).type : undefined;
        collection = documented ? this.phpDocDiagnosticType(file, documented, scope.containerFqcn ?? scope.id) : undefined;
      }
      const booleanLiteral = this.booleanLiteralVariableType(file, directArrayElement.variable, start, scope);
      if (booleanLiteral.applied) collection = booleanLiteral.type;
      const element = collection && this.arrayElementPathType(collection, directArrayElement.path);
      const presentElement = collection && this.arrayElementPathType(collection, directArrayElement.path, false);
      const narrowed = this.arrayElementFlowNarrowedType(file, directArrayElement.variable, directArrayElement.path, start, scope, element, presentElement);
      const fullyIndexable = (type: PhpType): boolean => type.kind === 'array' || type.kind === 'list' || type.kind === 'shape'
        || (type.kind === 'union' && type.types.length > 0 && type.types.every(fullyIndexable));
      return narrowed.applied ? narrowed.type : booleanLiteral.applied ? element
        : annotatedCollection || (inferredCollection && fullyIndexable(inferredCollection)) ? element : undefined;
    }
    if (/^\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(expression)) {
      const scope = this.containingScope(file, start);
      const flowNarrowings = scope ? file.narrowings.filter((item) => item.scopeId === scope.id
        && item.variable === expression && !item.propertyPath?.length && !item.arrayPath?.length && start >= item.start && start <= item.end
        && this.variableFlowFactStable(file, item, start, scope)
        && !file.assignments.some((assignment) => assignment.scopeId === scope.id && assignment.variable === expression
          && assignment.end >= item.start && assignment.end <= start))
        .sort((left, right) => left.end - left.start - (right.end - right.start)) : [];
      const applyFlowNarrowings = (base: PhpType | undefined): PhpType | undefined => {
        let narrowed = base;
        for (const narrowing of flowNarrowings) {
          if (!narrowed) break;
          if (narrowing.kind === 'non-null') {
            if (narrowed.kind === 'primitive' && narrowed.name === 'mixed') continue;
            const candidates = narrowed.kind === 'union' ? narrowed.types : [narrowed];
            const retained = candidates.filter((candidate) => !(candidate.kind === 'primitive' && candidate.name === 'null'));
            narrowed = retained.length ? union(...retained) : undefined;
            continue;
          }
          if (narrowing.kind === 'boolean-literal') {
            narrowed = this.booleanLiteralNarrowedType(narrowed, narrowing.value, narrowing.negated); continue;
          }
          if (narrowing.kind === 'array-key-exists') continue;
          let target: PhpType | undefined; let negated = narrowing.kind === 'not-instanceof';
          const strictSubclass = narrowing.kind === 'subclass-predicate';
          if (narrowing.kind === 'type-predicate') {
            const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, start));
            const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
            const parsedTarget = resolved.toLowerCase() === builtin ? parsePhpDocType(narrowing.typeName).type : undefined;
            target = parsedTarget && this.phpDocDiagnosticType(file, parsedTarget, scope?.containerFqcn ?? scope?.id);
            negated = Boolean(narrowing.negated);
          } else if (narrowing.kind === 'subclass-predicate') {
            const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, start));
            const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
            const fqcn = resolved.toLowerCase() === builtin
              ? this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, start), scope?.containerFqcn) : undefined;
            target = fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
            negated = Boolean(narrowing.negated);
          } else {
            const fqcn = this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, start), scope?.containerFqcn);
            target = fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
          }
          if (!target) continue;
          if (narrowed.kind === 'primitive' && narrowed.name === 'mixed') narrowed = strictSubclass || negated ? undefined : target;
          else {
            const candidates = narrowed.kind === 'union' ? narrowed.types : [narrowed]; const retained: PhpType[] = [];
            let uncertainComplement = false;
            for (const candidate of candidates) {
              const relation = strictSubclass
                ? candidate.kind === 'named' && target.kind === 'named' && this.hasCompleteHierarchy(candidate.name)
                  ? candidate.name.toLowerCase() !== target.name.toLowerCase() && this.isSubclassOf(candidate.name, target.name) ? 'yes' : 'no'
                  : ['primitive', 'literal', 'array', 'list', 'shape', 'callable'].includes(candidate.kind) ? 'no' : 'unknown'
                : compatibility(candidate, target, this.typeRelationContext());
              if (negated && relation === 'unknown') { uncertainComplement = true; break; }
              const candidateMatches = relation === 'yes';
              if (negated) { if (!candidateMatches) retained.push(candidate); continue; }
              if (candidateMatches) retained.push(candidate);
              else if (!strictSubclass && compatibility(target, candidate, this.typeRelationContext()) === 'yes') retained.push(target);
            }
            narrowed = !uncertainComplement && retained.length ? union(...retained) : undefined;
          }
        }
        return narrowed;
      };
      const standaloneValue = scope && this.standaloneLocalVariableAnnotationType(file, expression, start, scope);
      let localValue = standaloneValue ?? this.linearLocalValueType(file, expression, start)
        ?? (flowNarrowings.length ? this.linearLocalValueType(file, expression, Math.max(0, flowNarrowings[0]!.start - 1), true) : undefined);
      if (!localValue && flowNarrowings.some((fact) => (fact.assertion && (fact.kind === 'instanceof'
        || (fact.kind === 'type-predicate' && !fact.negated)))
        || (fact.kind === 'boolean-literal' && !fact.negated))) localValue = primitive('mixed');
      if (localValue) {
        const narrowed = applyFlowNarrowings(localValue);
        if (narrowed && narrowed.kind !== 'unknown' && !(narrowed.kind === 'primitive' && narrowed.name === 'mixed')) return narrowed;
        if (flowNarrowings.length) return undefined;
        return localValue;
      }
      const iteration = scope && file.assignments.filter((assignment) => assignment.scopeId === scope.id
        && assignment.variable === expression && assignment.sourceIterable && assignment.end <= start
        && (!assignment.validRange || (start >= assignment.validRange.start && end <= assignment.validRange.end)))
        .sort((left, right) => right.end - left.end)[0]?.sourceIterable;
      if (iteration?.kind === 'variable' && iteration.variable !== expression) {
        const iterable = this.provenArgumentType(file, iteration.start, iteration.end);
        const element = iterable && this.delegatedGeneratorTypes(iterable)?.[iteration.part];
        const narrowed = applyFlowNarrowings(element);
        if (narrowed && narrowed.kind !== 'unknown' && !(narrowed.kind === 'primitive' && narrowed.name === 'mixed')) return narrowed;
      }
      const reassigned = scope && file.assignments.some((assignment) => assignment.scopeId === scope.id && assignment.variable === expression && assignment.end <= start);
      const parameter = !reassigned ? scope?.parameters.find((candidate) => `$${candidate.name}` === expression) : undefined;
      const documented = parameter?.type ? parsePhpDocType(parameter.type).type : undefined;
      let parameterType = documented ? this.phpDocDiagnosticType(file, documented, scope?.containerFqcn ?? scope?.id) : undefined;
      parameterType = applyFlowNarrowings(parameterType);
      if (parameterType && scope) {
        for (const mutation of this.priorReferenceMutations(file, scope, expression, start)) {
          if (!mutation.builtin) { parameterType = undefined; break; }
          const iterable = this.delegatedGeneratorTypes(parameterType);
          if (!iterable) { parameterType = undefined; break; }
          if (['array_pop', 'array_shift'].includes(mutation.name)) {
            if (parameterType.kind === 'array') parameterType = arrayType(parameterType.valueType, parameterType.keyType, false);
            else if (parameterType.kind === 'list') parameterType = listType(parameterType.valueType, false);
            continue;
          }
          if (['sort', 'shuffle', 'usort'].includes(mutation.name)) {
            const nonEmpty = (parameterType.kind === 'array' || parameterType.kind === 'list') && parameterType.nonEmpty;
            parameterType = listType(iterable.value, nonEmpty);
            continue;
          }
          // Push/unshift/splice and output parameters can replace or widen the value domain.
          // Until their complete mutation contracts are modeled, discard the entry type.
          parameterType = undefined; break;
        }
      }
      if (parameterType && parameterType.kind !== 'unknown'
        && !(parameterType.kind === 'primitive' && parameterType.name === 'mixed')) return parameterType;
      const resolved = this.variableClass(file, expression, start, new Set(), true); if (!resolved || !this.fileAndDeclaration(resolved.fqcn)) return undefined;
      return resolved.nullable ? nullable(named(resolved.fqcn)) : named(resolved.fqcn);
    }
    return undefined;
  }

  private directArrayElement(expression: string): { variable: string; path: string[] } | undefined {
    const root = /^(\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)(.*)$/u.exec(expression); if (!root) return undefined;
    const tail = root[2]!; const path: string[] = [];
    const offset = /\s*\[\s*(?:'([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)'|"([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)"|(-?(?:0|[1-9][0-9]*)))\s*\]/gy;
    while (offset.lastIndex < tail.length && path.length < 16) {
      const match = offset.exec(tail); if (!match) return undefined;
      path.push(match[1] ?? match[2] ?? match[3]!);
    }
    return path.length > 0 && offset.lastIndex === tail.length ? { variable: root[1]!, path } : undefined;
  }

  private arrayElementType(type: PhpType, key: string, optionalAsNull = true): PhpType | undefined {
    if (type.kind === 'union') {
      const members = type.types.map((member) => this.arrayElementType(member, key, optionalAsNull)).filter((member): member is PhpType => Boolean(member));
      const nullableCollection = type.types.some((member) => member.kind === 'primitive' && member.name === 'null');
      return members.length ? union(...members, ...(optionalAsNull && nullableCollection ? [primitive('null')] : [])) : undefined;
    }
    if (type.kind === 'shape') {
      const field = type.fields.find((candidate) => String(candidate.key) === key);
      return field ? optionalAsNull && field.optional ? nullable(field.type) : field.type : undefined;
    }
    if (type.kind === 'list') return /^\d+$/.test(key) ? type.valueType : undefined;
    if (type.kind !== 'array') return undefined;
    const keyType = /^-?\d+$/.test(key) ? primitive('int') : primitive('string');
    return compatibility(keyType, type.keyType, this.typeRelationContext()) === 'no' ? undefined : type.valueType;
  }

  private arrayElementPathType(type: PhpType, path: string[], optionalAsNull = true): PhpType | undefined {
    let current: PhpType | undefined = type;
    for (const key of path) { current = current && this.arrayElementType(current, key, optionalAsNull); if (!current) return undefined; }
    return current;
  }

  private arrayElementFlowNarrowedType(file: SemanticFile, variable: string, path: string[], offset: number,
    scope: ParsedScope, base: PhpType | undefined, presentBase = base): { applied: boolean; type?: PhpType } {
    const flowNarrowings = file.narrowings.filter((item) => item.scopeId === scope.id && item.variable === variable
      && item.arrayPath?.length === path.length && item.arrayPath.every((key, index) => key === path[index])
      && offset >= item.start && offset <= item.end
      && this.arrayElementFlowFactStable(file, item, offset, scope))
      .sort((left, right) => left.end - left.start - (right.end - right.start));
    if (!flowNarrowings.length) return { applied: false };
    let narrowed = base;
    for (const narrowing of flowNarrowings) {
      if (!narrowed) break;
      if (narrowing.kind === 'non-null') {
        if (narrowed.kind === 'primitive' && narrowed.name === 'mixed') continue;
        const candidates = narrowed.kind === 'union' ? narrowed.types : [narrowed];
        const retained = candidates.filter((candidate) => !(candidate.kind === 'primitive' && candidate.name === 'null'));
        narrowed = retained.length ? union(...retained) : undefined; continue;
      }
      if (narrowing.kind === 'boolean-literal') {
        narrowed = this.booleanLiteralNarrowedType(narrowed, narrowing.value, narrowing.negated); continue;
      }
      if (narrowing.kind === 'array-key-exists') {
        const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
        const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset)).toLowerCase();
        if ((builtin === 'array_key_exists' || builtin === 'key_exists') && resolved === builtin) narrowed = presentBase;
        continue;
      }
      let target: PhpType | undefined; let negated = narrowing.kind === 'not-instanceof';
      const strictSubclass = narrowing.kind === 'subclass-predicate';
      if (narrowing.kind === 'type-predicate') {
        const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset));
        const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
        const parsedTarget = resolved.toLowerCase() === builtin ? parsePhpDocType(narrowing.typeName).type : undefined;
        target = parsedTarget && this.phpDocDiagnosticType(file, parsedTarget, scope.containerFqcn ?? scope.id);
        negated = Boolean(narrowing.negated);
      } else if (narrowing.kind === 'subclass-predicate') {
        const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset));
        const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
        const fqcn = resolved.toLowerCase() === builtin
          ? this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn) : undefined;
        target = fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
        negated = Boolean(narrowing.negated);
      } else {
        const fqcn = this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn);
        target = fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
      }
      if (!target) continue;
      if (narrowed.kind === 'primitive' && narrowed.name === 'mixed') narrowed = strictSubclass || negated ? undefined : target;
      else {
        const candidates = narrowed.kind === 'union' ? narrowed.types : [narrowed]; const retained: PhpType[] = [];
        let uncertainComplement = false;
        for (const candidate of candidates) {
          const relation = strictSubclass
            ? candidate.kind === 'named' && target.kind === 'named' && this.hasCompleteHierarchy(candidate.name)
              ? candidate.name.toLowerCase() !== target.name.toLowerCase() && this.isSubclassOf(candidate.name, target.name) ? 'yes' : 'no'
              : ['primitive', 'literal', 'array', 'list', 'shape', 'callable'].includes(candidate.kind) ? 'no' : 'unknown'
            : compatibility(candidate, target, this.typeRelationContext());
          if (negated && relation === 'unknown') { uncertainComplement = true; break; }
          const candidateMatches = relation === 'yes';
          if (negated) { if (!candidateMatches) retained.push(candidate); continue; }
          if (candidateMatches) retained.push(candidate);
          else if (!strictSubclass && compatibility(target, candidate, this.typeRelationContext()) === 'yes') retained.push(target);
        }
        narrowed = !uncertainComplement && retained.length ? union(...retained) : undefined;
      }
    }
    return { applied: true, type: narrowed };
  }

  private arrayElementFlowFactStable(file: SemanticFile, narrowing: ParsedTypeNarrowing,
    offset: number, scope: ParsedScope): boolean {
    if (!narrowing.arrayPath?.length) return false;
    const variable = narrowing.variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inspectionRanges = this.flowFactInspectionRanges(narrowing, offset);
    const between = inspectionRanges.map((range) => file.source.slice(range.start, range.end)).join('\n');
    const rootMutation = new RegExp(`(?:${variable}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${variable}|unset\\s*\\(\\s*${variable}\\s*\\))`, 'u');
    const offsets = `${variable}(?:\\s*\\[[^\\]]*\\])+`;
    const offsetMutation = new RegExp(`(?:${offsets}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${offsets}|unset\\s*\\(\\s*${offsets}\\s*\\))`, 'u');
    if (rootMutation.test(between) || offsetMutation.test(between)
      || new RegExp(`=&\\s*${variable}(?![\\p{L}\\p{N}_])`, 'u').test(between)
      || new RegExp(`foreach\\s*\\(\\s*${variable}\\s+as\\s+&`, 'iu').test(between)) return false;
    return !file.calls.some((call) => this.containingScope(file, call.start)?.id === scope.id
      && inspectionRanges.some((range) => call.start >= range.start && call.end <= range.end) && call.arguments.some((argument) => {
        const separator = argument.nameEnd === undefined ? -1 : file.source.indexOf(':', argument.nameEnd);
        const valueStart = separator >= 0 && separator < argument.end ? separator + 1 : argument.start;
        return file.source.slice(valueStart, argument.end).trim() === narrowing.variable;
      }));
  }

  private propertyFlowNarrowedType(file: SemanticFile, variable: string, propertyPath: string[], offset: number,
    scope: ParsedScope, base: PhpType | undefined): { applied: boolean; type?: PhpType } {
    const flowNarrowings = file.narrowings.filter((item) => item.scopeId === scope.id && item.variable === variable
      && item.propertyPath?.length === propertyPath.length
      && item.propertyPath.every((part, index) => part === propertyPath[index])
      && offset >= item.start && offset <= item.end && this.propertyFlowFactStable(file, item, offset, scope))
      .sort((left, right) => left.end - left.start - (right.end - right.start));
    if (!flowNarrowings.length) return { applied: false };
    let narrowed = base;
    for (const narrowing of flowNarrowings) {
      if (!narrowed) break;
      if (narrowing.kind === 'non-null') {
        if (narrowed.kind === 'primitive' && narrowed.name === 'mixed') continue;
        const candidates = narrowed.kind === 'union' ? narrowed.types : [narrowed];
        const retained = candidates.filter((candidate) => !(candidate.kind === 'primitive' && candidate.name === 'null'));
        narrowed = retained.length ? union(...retained) : undefined; continue;
      }
      if (narrowing.kind === 'boolean-literal') {
        narrowed = this.booleanLiteralNarrowedType(narrowed, narrowing.value, narrowing.negated); continue;
      }
      if (narrowing.kind === 'array-key-exists') continue;
      let target: PhpType | undefined; let negated = narrowing.kind === 'not-instanceof';
      const strictSubclass = narrowing.kind === 'subclass-predicate';
      if (narrowing.kind === 'type-predicate') {
        const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset));
        const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
        const parsedTarget = resolved.toLowerCase() === builtin ? parsePhpDocType(narrowing.typeName).type : undefined;
        target = parsedTarget && this.phpDocDiagnosticType(file, parsedTarget, scope.containerFqcn ?? scope.id);
        negated = Boolean(narrowing.negated);
      } else if (narrowing.kind === 'subclass-predicate') {
        const resolved = this.resolveFunction(file, narrowing.functionName, this.namespaceAt(file, offset));
        const builtin = narrowing.functionName.replace(/^\\+/, '').toLowerCase();
        const fqcn = resolved.toLowerCase() === builtin
          ? this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn) : undefined;
        target = fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
        negated = Boolean(narrowing.negated);
      } else {
        const fqcn = this.resolveSourceType(file, narrowing.typeName, this.namespaceAt(file, offset), scope.containerFqcn);
        target = fqcn && this.fileAndDeclaration(fqcn) ? named(fqcn) : undefined;
      }
      if (!target) continue;
      if (narrowed.kind === 'primitive' && narrowed.name === 'mixed') narrowed = strictSubclass || negated ? undefined : target;
      else {
        const candidates = narrowed.kind === 'union' ? narrowed.types : [narrowed]; const retained: PhpType[] = [];
        let uncertainComplement = false;
        for (const candidate of candidates) {
          const relation = strictSubclass
            ? candidate.kind === 'named' && target.kind === 'named' && this.hasCompleteHierarchy(candidate.name)
              ? candidate.name.toLowerCase() !== target.name.toLowerCase() && this.isSubclassOf(candidate.name, target.name) ? 'yes' : 'no'
              : ['primitive', 'literal', 'array', 'list', 'shape', 'callable'].includes(candidate.kind) ? 'no' : 'unknown'
            : compatibility(candidate, target, this.typeRelationContext());
          if (negated && relation === 'unknown') { uncertainComplement = true; break; }
          const candidateMatches = relation === 'yes';
          if (negated) { if (!candidateMatches) retained.push(candidate); continue; }
          if (candidateMatches) retained.push(candidate);
          else if (!strictSubclass && compatibility(target, candidate, this.typeRelationContext()) === 'yes') retained.push(target);
        }
        narrowed = !uncertainComplement && retained.length ? union(...retained) : undefined;
      }
    }
    return { applied: true, type: narrowed };
  }

  private propertyFlowFactStable(file: SemanticFile, narrowing: ParsedTypeNarrowing,
    offset: number, scope: ParsedScope): boolean {
    const propertyPath = narrowing.propertyPath; if (!propertyPath?.length) return false;
    const escapedVariable = narrowing.variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedPath = propertyPath.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const inspectionRanges = this.flowFactInspectionRanges(narrowing, offset);
    const between = inspectionRanges.map((range) => file.source.slice(range.start, range.end)).join('\n');
    const rootMutation = new RegExp(`(?:${escapedVariable}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${escapedVariable}|unset\\s*\\(\\s*${escapedVariable}\\s*\\))`, 'u');
    if (rootMutation.test(between)) return false;
    const propertyAccesses = escapedPath.map((_, index) =>
      `${escapedVariable}\\s*->\\s*${escapedPath.slice(0, index + 1).join('\\s*->\\s*')}`);
    const propertyAccess = `(?:${propertyAccesses.join('|')})`;
    const propertyMutation = new RegExp(`(?:${propertyAccess}\\s*(?:=(?!=|>)|\\+=|-=|\\*=|/=|\\.=|%=|&=|\\|=|\\^=|<<=|>>=|\\?\\?=|\\+\\+|--)|(?:\\+\\+|--)\\s*${propertyAccess}|unset\\s*\\(\\s*${propertyAccess})`, 'u');
    const methodCall = new RegExp(`${escapedVariable}(?:\\s*(?:->|\\?->)\\s*[A-Za-z_][A-Za-z0-9_]*)+\\s*\\(`, 'u');
    if (propertyMutation.test(between) || methodCall.test(between)
      || new RegExp(`=&\\s*${escapedVariable}(?![\\p{L}\\p{N}_])`, 'u').test(between)) return false;
    return !file.calls.some((call) => this.containingScope(file, call.start)?.id === scope.id
      && inspectionRanges.some((range) => call.start >= range.start && call.end <= range.end) && call.arguments.some((argument) => {
        const separator = argument.nameEnd === undefined ? -1 : file.source.indexOf(':', argument.nameEnd);
        const valueStart = separator >= 0 && separator < argument.end ? separator + 1 : argument.start;
        return file.source.slice(valueStart, argument.end).trim() === narrowing.variable;
      }));
  }

  private priorReferenceMutations(file: SemanticFile, scope: ParsedScope, variable: string, offset: number,
    after = scope.start): Array<{ name: string; builtin: boolean }> {
    const mutations: Array<{ name: string; builtin: boolean }> = [];
    for (const call of file.calls.filter((candidate) => candidate.end <= offset
      && candidate.start >= Math.max(scope.start, after) && candidate.end <= scope.end
      && this.containingScope(file, candidate.start)?.id === scope.id)) {
      if (call.arguments.some((argument) => argument.unpacked)) continue;
      const matchingArguments = new Set(call.arguments.flatMap((argument, index) => {
        const separator = argument.nameEnd === undefined ? -1 : file.source.indexOf(':', argument.nameEnd);
        const valueStart = separator >= 0 && separator < argument.end ? separator + 1 : argument.start;
        return file.source.slice(valueStart, argument.end).trim() === variable ? [index] : [];
      }));
      if (!matchingArguments.size) continue;
      const signature = this.signature(file.uri, call.argumentsStart + 1); if (!signature) continue;
      const declarations = [...this.files.values()].flatMap((candidate) => candidate.callables)
        .filter((candidate) => candidate.kind === signature.kind && candidate.fqcn.toLowerCase() === signature.fqcn.toLowerCase());
      if (declarations.length !== 1) continue;
      let positional = 0;
      for (const [argumentIndex, argument] of call.arguments.entries()) {
        const parameter = argument.name
          ? signature.parameters.find((candidate) => candidate.name === argument.name)
          : signature.parameters[positional] ?? (signature.parameters.at(-1)?.variadic ? signature.parameters.at(-1) : undefined);
        if (!argument.name) positional += 1;
        if (!matchingArguments.has(argumentIndex) || !parameter?.byReference) continue;
        mutations.push({
          name: signature.fqcn.split('\\').at(-1)!.toLowerCase(),
          builtin: signature.uri.startsWith('php-companion-builtin:'),
        });
      }
    }
    return mutations;
  }

  private hasStrictTypes(file: SemanticFile): boolean {
    return /^\uFEFF?\s*<\?php\s*(?:(?:\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|#[^\r\n]*)\s*)*declare\s*\(\s*strict_types\s*=\s*1\s*\)\s*;/i.test(file.source);
  }

  private callableReturnClass(file: SemanticFile, returnType: string | undefined, scopeFqcn: string | undefined, allowNullable: boolean): { fqcn: string; nullable: boolean } | undefined {
    const type = returnType && this.objectType(returnType, allowNullable);
    if (!type) return undefined;
    const namespace = scopeFqcn?.split('\\').slice(0, -1).join('\\') ?? file.namespace;
    const fqcn = this.resolveType(file, type.name, namespace, scopeFqcn);
    return fqcn ? { fqcn, nullable: type.nullable } : undefined;
  }

  private resolveType(file: SemanticFile, name: string, namespace: string, scopeFqcn?: string): string | undefined {
    const normalized = name.trim();
    if (!/^[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*$/.test(normalized)) return undefined;
    if (['self', 'static'].includes(normalized.toLowerCase())) return scopeFqcn;
    if (normalized.toLowerCase() === 'parent') {
      const scope = scopeFqcn ? file.declarations.find((item) => item.fqcn.toLowerCase() === scopeFqcn.toLowerCase()) : undefined;
      const parent = scope?.extendsNames[0];
      return parent ? this.resolveType(file, parent, namespace) : undefined;
    }
    if (normalized.startsWith('\\')) return normalized.slice(1);
    if (/^namespace\\/i.test(normalized)) return [namespace, normalized.slice(normalized.indexOf('\\') + 1)].filter(Boolean).join('\\');
    const [head, ...tail] = normalized.split('\\');
    const imported = file.imports.find((item) => item.kind === 'class' && item.namespace === namespace && item.alias.toLowerCase() === head!.toLowerCase());
    if (imported) return [imported.fqcn, ...tail].join('\\');
    const namespaced = [namespace, normalized].filter(Boolean).join('\\');
    const declarations = [...this.files.values()].flatMap((item) => item.declarations);
    if (declarations.some((item) => item.fqcn.toLowerCase() === namespaced.toLowerCase())) return namespaced;
    if (declarations.some((item) => item.fqcn.toLowerCase() === normalized.toLowerCase())) return normalized;
    return namespaced;
  }

  private resolveSourceType(file: SemanticFile, name: string, namespace: string, scopeFqcn?: string): string | undefined {
    const normalized = name.trim();
    if (!/^[\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*$/.test(normalized)) return undefined;
    if (['self', 'static'].includes(normalized.toLowerCase())) return scopeFqcn;
    if (normalized.toLowerCase() === 'parent') {
      const scope = scopeFqcn ? file.declarations.find((item) => item.fqcn.toLowerCase() === scopeFqcn.toLowerCase()) : undefined;
      const parent = scope?.extendsNames[0];
      return parent ? this.resolveSourceType(file, parent, namespace) : undefined;
    }
    if (normalized.startsWith('\\')) return normalized.slice(1);
    if (/^namespace\\/i.test(normalized)) return [namespace, normalized.slice(normalized.indexOf('\\') + 1)].filter(Boolean).join('\\');
    const [head, ...tail] = normalized.split('\\');
    const imported = file.imports.find((item) => item.kind === 'class' && item.namespace === namespace && item.alias.toLowerCase() === head!.toLowerCase());
    if (imported) return [imported.fqcn, ...tail].join('\\');
    return [namespace, normalized].filter(Boolean).join('\\');
  }

  private members(fqcn: string, accessFrom?: string, visited = new Set<string>(), includeInvisible = false, templateArguments?: Record<string, string>): MemberInfo[] {
    const key = fqcn.toLowerCase();
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return [];
    visited.add(key);
    const ownerFile = [...this.files.values()].find((file) => file.declarations.some((item) => item.fqcn.toLowerCase() === key));
    const declaration = ownerFile?.declarations.find((item) => item.fqcn.toLowerCase() === key);
    if (!ownerFile || !declaration) return [];
    const visible = (item: { visibility: ParsedCallableDeclaration['visibility'] }): boolean => {
      if (includeInvisible) return true;
      if (item.visibility === 'public') return true;
      if (accessFrom?.toLowerCase() === key) return true;
      return item.visibility === 'protected' && accessFrom !== undefined && this.isSubclassOf(accessFrom, fqcn);
    };
    const specializedReturn = (value: string | undefined): string | undefined => specializeTemplateType(value, templateArguments);
    const magicMembers: MemberInfo[] = ownerFile.magicMembers.filter((item) => item.ownerFqcn.toLowerCase() === key)
      .map((item) => ({ kind: item.kind, uri: ownerFile.uri, start: item.start, end: item.end, name: item.name,
        fqcn: item.kind === 'property' ? `${fqcn}::$${item.name}` : `${fqcn}::${item.name}`,
        parameters: item.parameters.map((parameter) => ({ ...parameter, type: specializedReturn(parameter.type) })),
        returnType: specializedReturn(item.returnType), writeType: specializedReturn(item.writeType), visibility: 'public', static: item.static,
        readonly: item.kind === 'property' && item.writable === false, readable: item.readable, writable: item.writable,
        typeScopeFqcn: fqcn, calledOnFqcn: fqcn, templateArguments, callableTemplates: item.templates, synthetic: 'phpdoc-magic' }));
    const methods: MemberInfo[] = ownerFile.callables.filter((item) => item.containerFqcn?.toLowerCase() === key && !['__construct', '__destruct'].includes(item.name.toLowerCase())).filter(visible)
      .map((item) => ({ kind: 'method', uri: ownerFile.uri, start: item.start, end: item.end, name: item.name, fqcn: item.fqcn,
        parameters: item.parameters.map((parameter) => ({ ...parameter, type: specializedReturn(parameter.type) })), returnType: specializedReturn(item.returnType), nativeReturnType: specializedReturn(item.nativeReturnType),
        visibility: item.visibility, static: item.static, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, templateArguments,
        callableTemplates: ownerFile.templates.filter((template) => template.ownerFqcn.toLowerCase() === item.fqcn.toLowerCase()) }));
    const externalMethodFacts = [...this.externalFacts.values()].flatMap((contribution) => contribution.methods).filter((item) => item.ownerFqcn.toLowerCase() === key);
    const externalMethods: MemberInfo[] = externalMethodFacts.filter((item) => externalMethodFacts
      .filter((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase())
      .every((candidate) => (candidate.returnType ?? '').toLowerCase() === (item.returnType ?? '').toLowerCase() && Boolean(candidate.static) === Boolean(item.static)))
      .map((item) => ({ kind: 'method', uri: item.uri, start: item.start, end: item.end, name: item.name, fqcn: `${fqcn}::${item.name}`, parameters: [], returnType: specializedReturn(item.returnType), visibility: 'public', static: item.static ?? false, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, templateArguments }));
    const enumMethods: MemberInfo[] = [];
    if (declaration.kind === 'enum') {
      enumMethods.push({ kind: 'method', uri: ownerFile.uri, start: declaration.start, end: declaration.end, name: 'cases', fqcn: `${fqcn}::cases`, parameters: [],
        returnType: `array<int, ${fqcn}>`, nativeReturnType: 'array', visibility: 'public', static: true, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, synthetic: 'enum-native' });
      if (declaration.enumBackingType) {
        const parameter: ParsedParameter = { name: 'value', type: declaration.enumBackingType, nativeType: declaration.enumBackingType, promoted: false,
          variadic: false, byReference: false, start: declaration.start, end: declaration.end };
        enumMethods.push(
          { kind: 'method', uri: ownerFile.uri, start: declaration.start, end: declaration.end, name: 'from', fqcn: `${fqcn}::from`, parameters: [parameter],
            returnType: 'static', nativeReturnType: 'static', visibility: 'public', static: true, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, synthetic: 'enum-native' },
          { kind: 'method', uri: ownerFile.uri, start: declaration.start, end: declaration.end, name: 'tryFrom', fqcn: `${fqcn}::tryFrom`, parameters: [parameter],
            returnType: '?static', nativeReturnType: '?static', visibility: 'public', static: true, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, synthetic: 'enum-native' },
        );
      }
    }
    const properties: MemberInfo[] = ownerFile.properties.filter((item) => item.containerFqcn.toLowerCase() === key).filter(visible)
      .map((item) => ({ kind: 'property', uri: ownerFile.uri, start: item.start, end: item.end, name: item.name, fqcn: item.fqcn, parameters: [],
        returnType: specializedReturn(item.type), writeType: specializedReturn(item.writeType), visibility: item.visibility,
        writeVisibility: item.writeVisibility, static: item.static, readonly: item.readonly, readonlyClass: declaration.readonlyClass && !item.static,
        promoted: item.promoted, readable: item.readable, writable: item.writable, hooked: Boolean(item.hooks?.length), virtual: item.virtual,
        hasGetHook: item.hooks?.some((hook) => hook.kind === 'get'), hasSetHook: item.hooks?.some((hook) => hook.kind === 'set'),
        final: item.final, abstract: item.abstract,
        finalHooks: item.hooks?.filter((hook) => hook.final).map((hook) => hook.kind),
        abstractHooks: item.hooks?.filter((hook) => hook.abstract).map((hook) => hook.kind),
        getByReference: item.hooks?.some((hook) => hook.kind === 'get' && hook.byReference),
        typeScopeFqcn: fqcn, calledOnFqcn: fqcn, templateArguments }));
    const externalPropertyFacts = [...this.externalFacts.values()].flatMap((contribution) => contribution.properties).filter((item) => item.ownerFqcn.toLowerCase() === key);
    const externalProperties: MemberInfo[] = externalPropertyFacts.filter((item) => externalPropertyFacts
      .filter((candidate) => candidate.name === item.name)
      .every((candidate) => (candidate.returnType ?? '').toLowerCase() === (item.returnType ?? '').toLowerCase()
        && (candidate.iterableValueType ?? '').toLowerCase() === (item.iterableValueType ?? '').toLowerCase()
        && candidate.visibility === item.visibility && Boolean(candidate.static) === Boolean(item.static) && Boolean(candidate.readonly) === Boolean(item.readonly))).filter(visible)
      .map((item) => ({ kind: 'property', uri: item.uri, start: item.start, end: item.end, name: item.name, fqcn: `${fqcn}::$${item.name}`, parameters: [], returnType: specializedReturn(item.returnType), iterableValueType: item.iterableValueType, visibility: item.visibility, static: item.static ?? false, readonly: item.readonly, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, templateArguments }));
    const enumProperties: MemberInfo[] = [];
    if (declaration.kind === 'enum') {
      enumProperties.push({ kind: 'property', uri: ownerFile.uri, start: declaration.start, end: declaration.end, name: 'name', fqcn: `${fqcn}::$name`, parameters: [],
        returnType: 'string', visibility: 'public', static: false, readonly: true, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, synthetic: 'enum-native' });
      if (declaration.enumBackingType) enumProperties.push({ kind: 'property', uri: ownerFile.uri, start: declaration.start, end: declaration.end, name: 'value', fqcn: `${fqcn}::$value`, parameters: [],
        returnType: declaration.enumBackingType, visibility: 'public', static: false, readonly: true, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, synthetic: 'enum-native' });
    }
    const constants: MemberInfo[] = ownerFile.constants.filter((item) => item.containerFqcn?.toLowerCase() === key).filter(visible)
      .map((item) => ({ kind: 'constant', uri: ownerFile.uri, start: item.start, end: item.end, name: item.name, fqcn: item.fqcn, parameters: [], returnType: item.type, visibility: item.visibility, static: true, value: item.value, constantKind: item.kind, typeScopeFqcn: fqcn, calledOnFqcn: fqcn, templateArguments }));
    const own = [...magicMembers, ...methods, ...externalMethods, ...enumMethods, ...properties, ...externalProperties, ...enumProperties, ...constants];
    const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const allTraitEntries = declaration.traitNames.flatMap((name) => {
      const trait = this.resolveSourceType(ownerFile, name, namespace);
      return trait ? this.members(trait, trait, new Set(visited), includeInvisible).map((member) => ({ trait, member: { ...member, typeScopeFqcn: fqcn, calledOnFqcn: fqcn } })) : [];
    });
    const traitEntries = allTraitEntries.filter(({ trait, member }) => !declaration.traitAdaptations.some((adaptation) => adaptation.kind === 'precedence'
      && adaptation.method.toLowerCase() === member.name.toLowerCase()
      && adaptation.insteadOf.some((name) => this.resolveSourceType(ownerFile, name, namespace)?.toLowerCase() === trait.toLowerCase())));
    for (const adaptation of declaration.traitAdaptations.filter((item) => item.kind === 'alias')) {
      const expectedTrait = adaptation.trait ? this.resolveSourceType(ownerFile, adaptation.trait, namespace)?.toLowerCase() : undefined;
      const matches = allTraitEntries.filter(({ trait, member }) => (!expectedTrait || trait.toLowerCase() === expectedTrait) && member.kind === 'method' && member.name.toLowerCase() === adaptation.method.toLowerCase());
      if (adaptation.alias) {
        for (const { member } of matches) traitEntries.push({ trait: member.fqcn.split('::')[0]!, member: { ...member, name: adaptation.alias, fqcn: `${fqcn}::${adaptation.alias}`, visibility: adaptation.visibility ?? member.visibility } });
      } else if (adaptation.visibility) {
        for (const entry of matches) entry.member = { ...entry.member, visibility: adaptation.visibility };
      }
    }
    const traits = traitEntries.map(({ member }) => member).filter(visible);
    const inherited = [...declaration.extendsNames, ...declaration.implementsNames].flatMap((name) => {
      const parent = this.resolveSourceType(ownerFile, name, namespace);
      if (!parent) return [];
      const relation = ownerFile.genericParents.find((item) => item.ownerFqcn.toLowerCase() === fqcn.toLowerCase()
        && this.resolveSourceType(ownerFile, item.parentName, namespace, fqcn)?.toLowerCase() === parent.toLowerCase());
      let inheritedArguments: Record<string, string> | undefined;
      if (relation) inheritedArguments = this.templateArgumentsFor(parent,
        relation.arguments.map((argument) => specializeTemplateType(argument, templateArguments) ?? argument), ownerFile, namespace, fqcn);
      return this.members(parent, accessFrom, visited, includeInvisible, inheritedArguments)
        .map((member) => ({ ...member, calledOnFqcn: fqcn, calledOnTemplateArguments: templateArguments }));
    });
    const rawCombined = [...inherited, ...traits, ...own];
    let composeHooks = properties.some((member) => member.hooked);
    if (!composeHooks && properties.length > 0) {
      const ownPropertyNames = new Set(properties.map((member) => member.name));
      composeHooks = inherited.some((member) => member.kind === 'property' && member.hooked && ownPropertyNames.has(member.name))
        || traits.some((member) => member.kind === 'property' && member.hooked && ownPropertyNames.has(member.name));
    }
    const propertyLayers = composeHooks ? new Map<string, MemberInfo>() : undefined;
    const combined = composeHooks ? rawCombined.map((member): MemberInfo => {
      if (member.kind !== 'property' || member.synthetic) return member;
      const identity = member.name;
      const previous = propertyLayers!.get(identity);
      if (!previous) { propertyLayers!.set(identity, member); return member; }
      const previousGetConcrete = previous.readable !== false && !previous.abstractHooks?.includes('get');
      const previousSetConcrete = previous.writable !== false && !previous.abstractHooks?.includes('set');
      const ownDefaultGet = member.readable !== false && (!member.hooked || member.virtual === false);
      const ownDefaultSet = !member.readonly && member.writable !== false && (!member.hooked || member.virtual === false);
      const inheritGet = !member.hasGetHook && previousGetConcrete;
      const inheritSet = !member.hasSetHook && previousSetConcrete;
      const merged: MemberInfo = {
        ...member,
        hooked: member.hooked || Boolean(previous.hooked && (inheritGet || inheritSet)),
        readable: member.hasGetHook ? member.readable : inheritGet || ownDefaultGet,
        writable: member.hasSetHook ? member.writable : inheritSet || ownDefaultSet,
        writeType: member.hasSetHook || ownDefaultSet ? member.writeType ?? member.returnType : previous.writeType,
        virtual: member.virtual === false || previous.virtual === false ? false : member.virtual,
        getByReference: member.hasGetHook ? member.getByReference : inheritGet ? previous.getByReference : false,
        hasGetHook: member.hasGetHook || Boolean(inheritGet && previous.hasGetHook),
        hasSetHook: member.hasSetHook || Boolean(inheritSet && previous.hasSetHook),
        abstractHooks: [...new Set([
          ...(member.abstractHooks ?? []),
          ...(!member.hasGetHook && !ownDefaultGet && previous.abstractHooks?.includes('get') ? ['get' as const] : []),
          ...(!member.hasSetHook && !ownDefaultSet && previous.abstractHooks?.includes('set') ? ['set' as const] : []),
        ])],
        finalHooks: [...new Set([
          ...(member.finalHooks ?? []),
          ...(!member.hasGetHook && inheritGet && previous.finalHooks?.includes('get') ? ['get' as const] : []),
          ...(!member.hasSetHook && inheritSet && previous.finalHooks?.includes('set') ? ['set' as const] : []),
        ])],
      };
      propertyLayers!.set(identity, merged); return merged;
    }) : rawCombined;
    const concrete = new Set(combined.filter((member) => member.synthetic !== 'phpdoc-magic')
      .map((member) => `${member.kind}:${memberNameKey(member.kind, member.name)}`));
    return [...new Map(combined.flatMap((member) => {
      const identity = `${member.kind}:${memberNameKey(member.kind, member.name)}`;
      if (member.synthetic === 'phpdoc-magic' && concrete.has(identity)) return [];
      return [[member.synthetic === 'phpdoc-magic' && member.kind === 'method' ? `${identity}:${this.memberSignature(member)}` : identity, member] as const];
    })).values()];
  }

  private isSubclassOf(candidate: string, target: string, visited = new Set<string>()): boolean {
    const key = candidate.toLowerCase();
    const targetKey = target.toLowerCase();
    if (key === targetKey) return true;
    if (visited.size >= MAX_SEMANTIC_GRAPH_DEPTH || visited.has(key)) return false;
    visited.add(key);
    const file = [...this.files.values()].find((item) => item.declarations.some((declaration) => declaration.fqcn.toLowerCase() === key));
    const declaration = file?.declarations.find((item) => item.fqcn.toLowerCase() === key);
    if (!file || !declaration) return false;
    if (this.fileAndDeclaration(target)) {
      if (targetKey === 'unitenum' && declaration.kind === 'enum') return true;
      if (targetKey === 'backedenum' && declaration.kind === 'enum' && declaration.enumBackingType !== undefined) return true;
      if (targetKey === 'stringable' && file.callables.some((callable) => callable.kind === 'method'
        && callable.containerFqcn?.toLowerCase() === key && callable.name.toLowerCase() === '__tostring'
        && callable.visibility === 'public' && !callable.static)) return true;
    }
    const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
    return [...declaration.extendsNames, ...declaration.implementsNames].some((name) => {
      const parent = this.resolveSourceType(file, name, namespace);
      return parent ? this.isSubclassOf(parent, target, visited) : false;
    });
  }
}

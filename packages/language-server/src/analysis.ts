import type { ParsedParameter, PhpSyntaxParser, SourceRange } from '@php-companion/parser';
import { DiagnosticSeverity, SymbolKind, type Diagnostic, type DocumentSymbol, type Range } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { invalidConstantExpressionCallables, isSyntaxAvailable, unsupportedSyntax, type SupportedPhpVersion } from '@php-companion/language-spec';

export interface PhpDocumentAnalysis {
  diagnostics: Diagnostic[];
  symbols: DocumentSymbol[];
}

export const PHP_SEMANTIC_TOKEN_TYPES = ['class', 'interface', 'enum', 'function', 'method', 'property', 'parameter', 'enumMember', 'variable', 'type'] as const;
export const PHP_SEMANTIC_TOKEN_MODIFIERS = ['declaration', 'static', 'readonly'] as const;
const ENUM_FORBIDDEN_MAGIC_METHODS = new Set([
  '__construct', '__destruct', '__clone', '__get', '__set', '__isset', '__unset', '__sleep', '__wakeup',
  '__set_state', '__serialize', '__unserialize', '__tostring', '__debuginfo',
]);
export interface PhpSemanticTokenFacts {
  typeKindAt(offset: number): 'class' | 'interface' | 'trait' | 'enum' | undefined;
  constantUses(): SourceRange[];
}

export function displayPhpParameter(parameter: ParsedParameter): string {
  return `${parameter.type ? `${parameter.type} ` : ''}${parameter.byReference ? '&' : ''}${parameter.variadic ? '...' : ''}$${parameter.name}${parameter.defaultValue !== undefined ? ` = ${parameter.defaultValue}` : ''}`;
}

export function analyzePhpSemanticTokens(document: TextDocument, parser: PhpSyntaxParser, semantic?: PhpSemanticTokenFacts): { data: number[] } {
  const parsed = parser.parse(document.getText());
  try {
    const entries = new Map<string, { start: number; end: number; type: number; modifiers: number }>();
    const add = (item: SourceRange, tokenType: typeof PHP_SEMANTIC_TOKEN_TYPES[number], modifiers = 1): void => {
      if (item.end <= item.start) return;
      const start = document.positionAt(item.start); const end = document.positionAt(item.end);
      if (start.line !== end.line) return;
      entries.set(`${item.start}:${item.end}`, { start: item.start, end: item.end, type: PHP_SEMANTIC_TOKEN_TYPES.indexOf(tokenType), modifiers });
    };

    const variableRanges: SourceRange[] = []; const nodes = [parsed.tree.rootNode]; let visitedNodes = 0;
    while (nodes.length > 0 && visitedNodes < 100_000) {
      const node = nodes.pop()!; visitedNodes += 1;
      if (node.type === 'variable_name') variableRanges.push({ start: node.startIndex, end: node.endIndex });
      nodes.push(...node.namedChildren);
    }
    if (nodes.length === 0) for (const range of variableRanges) add(range, 'variable', 0);
    const parameterNamesByScope = new Map(parsed.scopes.map((scope) => [scope.id, new Set(scope.parameters.map((parameter) => `$${parameter.name}`))]));
    for (const reference of parsed.variableReferences) {
      add(reference, parameterNamesByScope.get(reference.scopeId)?.has(reference.variable) ? 'parameter' : 'variable', 0);
    }
    const addTypeUse = (reference: SourceRange): void => {
      const kind = semantic?.typeKindAt(reference.start + Math.min(1, reference.end - reference.start));
      add(reference, kind === 'trait' ? 'class' : kind ?? 'type', 0);
    };
    for (const reference of parsed.typeReferences) addTypeUse(reference);
    for (const reference of parsed.rawNames.filter((item) => item.context === 'phpdoc')) addTypeUse(reference);
    for (const imported of parsed.imports) {
      const path = { start: imported.pathStart, end: imported.pathEnd };
      const alias = imported.aliasStart !== undefined && imported.aliasEnd !== undefined ? { start: imported.aliasStart, end: imported.aliasEnd } : undefined;
      if (imported.kind === 'class') {
        addTypeUse(path); if (alias) addTypeUse(alias);
      } else {
        const tokenType = imported.kind === 'function' ? 'function' : 'enumMember';
        add(path, tokenType, 0); if (alias) add(alias, tokenType, 0);
      }
    }
    for (const reference of semantic?.constantUses() ?? []) add(reference, 'enumMember', 0);
    const memberRanges = new Set<string>();
    for (const access of parsed.memberAccesses) {
      if (access.dynamic !== undefined) continue;
      memberRanges.add(`${access.start}:${access.end}`);
      add(access, access.kind === 'constant' ? 'enumMember' : access.kind, access.static ? 2 : 0);
    }
    for (const call of parsed.calls) {
      const name = { start: call.nameStart, end: call.nameEnd };
      if (!memberRanges.has(`${name.start}:${name.end}`)) {
        if (call.kind === 'constructor') add(name, 'class', 0);
        else if (call.kind === 'function') add(name, 'function', 0);
      }
      for (const argument of call.arguments) {
        if (argument.nameStart !== undefined && argument.nameEnd !== undefined) add({ start: argument.nameStart, end: argument.nameEnd }, 'parameter', 0);
      }
    }

    // Declarations are added last so a parser fact for the same variable range
    // cannot remove declaration/static/readonly modifiers.
    for (const scope of parsed.scopes) for (const parameter of scope.parameters) add(parameter, 'parameter');
    for (const declaration of parsed.declarations.filter((item) => !item.anonymous)) add(declaration, declaration.kind === 'trait' ? 'class' : declaration.kind);
    for (const callable of parsed.callables) {
      add(callable, callable.kind, 1 | (callable.static ? 2 : 0));
      for (const parameter of callable.parameters) add(parameter, 'parameter');
    }
    for (const property of parsed.properties) add(property, 'property', 1 | (property.static ? 2 : 0) | (property.readonly ? 4 : 0));
    for (const constant of parsed.constants) add(constant, 'enumMember', 1 | (constant.containerFqcn ? 2 : 0));
    const ordered = [...entries.values()].sort((left, right) => left.start - right.start || left.end - right.end); const data: number[] = [];
    let previousLine = 0; let previousCharacter = 0;
    for (const entry of ordered) {
      const position = document.positionAt(entry.start); const deltaLine = position.line - previousLine;
      const deltaStart = deltaLine === 0 ? position.character - previousCharacter : position.character;
      data.push(deltaLine, deltaStart, entry.end - entry.start, entry.type, entry.modifiers);
      previousLine = position.line; previousCharacter = position.character;
    }
    return { data };
  } finally { parsed.tree.delete(); }
}

function toRange(document: TextDocument, range: SourceRange): Range {
  return {
    start: document.positionAt(range.start),
    end: document.positionAt(range.end),
  };
}

function symbolKind(kind: string): SymbolKind {
  switch (kind) {
    case 'interface': return SymbolKind.Interface;
    case 'trait': return SymbolKind.Class;
    case 'enum': return SymbolKind.Enum;
    default: return SymbolKind.Class;
  }
}

interface FlowSyntaxNode { type: string; text: string; startIndex: number; endIndex: number; children: FlowSyntaxNode[]; namedChildren: FlowSyntaxNode[]; }
interface FlowBudget { remaining: number; complete: boolean; terminatingCalls: Set<string>; }
type FlowOutcome = 'terminates' | 'falls-through' | 'unknown';
const FLOW_MAY_BYPASS_FOLLOWING = new Set([
  'break_statement', 'continue_statement', 'goto_statement', 'if_statement', 'try_statement', 'switch_statement',
  'while_statement', 'do_statement', 'for_statement', 'foreach_statement',
]);

function sequenceTerminates(statements: FlowSyntaxNode[], budget: FlowBudget, depth: number): boolean {
  for (const statement of statements) {
    if (statementTerminates(statement, budget, depth + 1)) return true;
    if (FLOW_MAY_BYPASS_FOLLOWING.has(statement.type)) return false;
  }
  return false;
}

function containsPotentialLoopExit(node: FlowSyntaxNode, budget: FlowBudget, depth: number): boolean {
  if (depth > 256 || budget.remaining-- <= 0) { budget.complete = false; return true; }
  if (node.type === 'break_statement' || node.type === 'goto_statement') return true;
  if (['function_definition', 'method_declaration', 'anonymous_function', 'arrow_function'].includes(node.type)) return false;
  return node.namedChildren.some((child) => containsPotentialLoopExit(child, budget, depth + 1));
}

function expressionTerminates(node: FlowSyntaxNode, budget: FlowBudget, depth: number): boolean {
  if (depth > 256 || budget.remaining-- <= 0) { budget.complete = false; return false; }
  if (node.type === 'throw_expression' || budget.terminatingCalls.has(`${node.startIndex}:${node.endIndex}`)) return true;
  if (node.type === 'binary_expression') {
    const left = node.namedChildren[0]; const right = node.namedChildren.at(-1);
    if (!left || !right) return false;
    if (expressionTerminates(left, budget, depth + 1)) return true;
    const operator = node.text.slice(left.endIndex - node.startIndex, right.startIndex - node.startIndex).trim().toLowerCase();
    return !['&&', '||', 'and', 'or', '??'].includes(operator) && expressionTerminates(right, budget, depth + 1);
  }
  if (node.type === 'conditional_expression') {
    const condition = node.namedChildren[0];
    if (condition && expressionTerminates(condition, budget, depth + 1)) return true;
    return node.namedChildren.length === 3
      && expressionTerminates(node.namedChildren[1]!, budget, depth + 1)
      && expressionTerminates(node.namedChildren[2]!, budget, depth + 1);
  }
  if (node.type === 'match_expression') {
    const condition = node.namedChildren[0]; const block = node.namedChildren.find((child) => child.type === 'match_block');
    if (condition && expressionTerminates(condition, budget, depth + 1)) return true;
    const arms = block?.namedChildren.filter((child) => child.type === 'match_conditional_expression' || child.type === 'match_default_expression') ?? [];
    return arms.length > 0 && arms.every((arm) => {
      const value = arm.namedChildren.at(-1);
      return Boolean(value && expressionTerminates(value, budget, depth + 1));
    });
  }
  if (node.type === 'nullsafe_member_call_expression' || node.type === 'nullsafe_member_access_expression') {
    const object = node.namedChildren[0];
    return Boolean(object && expressionTerminates(object, budget, depth + 1));
  }
  const eagerContainers = new Set([
    'parenthesized_expression', 'assignment_expression', 'augmented_assignment_expression', 'unary_op_expression',
    'cast_expression', 'subscript_expression', 'member_access_expression', 'scoped_property_access_expression',
    'class_constant_access_expression', 'array_creation_expression', 'array_element_initializer', 'function_call_expression',
    'member_call_expression', 'scoped_call_expression', 'object_creation_expression', 'argument', 'arguments',
    'clone_expression', 'print_intrinsic', 'include_expression',
  ]);
  return eagerContainers.has(node.type) && node.namedChildren.some((child) => expressionTerminates(child, budget, depth + 1));
}

function requiredExpressionTerminates(node: FlowSyntaxNode, budget: FlowBudget, depth: number): boolean {
  const candidates = ['if_statement', 'while_statement', 'switch_statement'].includes(node.type)
    ? node.namedChildren.slice(0, 1)
    : node.type === 'for_statement' ? node.namedChildren.slice(0, -1)
      : node.type === 'foreach_statement' ? node.namedChildren.slice(0, 1) : [];
  return candidates.some((expression) => expressionTerminates(expression, budget, depth + 1));
}

function statementTerminates(node: FlowSyntaxNode, budget: FlowBudget, depth = 0): boolean {
  if (depth > 256 || budget.remaining-- <= 0) { budget.complete = false; return false; }
  if (requiredExpressionTerminates(node, budget, depth)) return true;
  if (node.type === 'return_statement' || node.type === 'exit_statement') return true;
  if (node.type === 'expression_statement' && node.namedChildren.length === 1
    && expressionTerminates(node.namedChildren[0]!, budget, depth + 1)) return true;
  if (node.type === 'compound_statement') {
    return sequenceTerminates(node.namedChildren, budget, depth);
  }
  if (node.type === 'if_statement') {
    const consequence = node.namedChildren.find((child) => child.type === 'compound_statement');
    const alternatives = node.namedChildren.filter((child) => child.type === 'else_if_clause');
    const fallback = node.namedChildren.find((child) => child.type === 'else_clause');
    const branch = (candidate: FlowSyntaxNode | undefined): boolean => {
      const body = candidate?.namedChildren.at(-1);
      return Boolean(body && statementTerminates(body, budget, depth + 1));
    };
    return Boolean(consequence && statementTerminates(consequence, budget, depth + 1) && fallback && branch(fallback)
      && alternatives.every((alternative) => branch(alternative)));
  }
  if (node.type === 'try_statement') {
    const body = node.namedChildren.find((child) => child.type === 'compound_statement');
    const catches = node.namedChildren.filter((child) => child.type === 'catch_clause');
    const finalizer = node.namedChildren.find((child) => child.type === 'finally_clause');
    const clauseTerminates = (clause: FlowSyntaxNode): boolean => {
      const clauseBody = clause.namedChildren.at(-1);
      return Boolean(clauseBody && statementTerminates(clauseBody, budget, depth + 1));
    };
    if (finalizer && clauseTerminates(finalizer)) return true;
    return Boolean(body && statementTerminates(body, budget, depth + 1) && catches.every(clauseTerminates));
  }
  if (node.type === 'switch_statement') {
    const block = node.namedChildren.find((child) => child.type === 'switch_block');
    const labels = block?.namedChildren.filter((child) => child.type === 'case_statement' || child.type === 'default_statement') ?? [];
    if (labels.filter((label) => label.type === 'default_statement').length !== 1) return false;
    return labels.every((_, index) => {
      const statements: FlowSyntaxNode[] = [];
      for (const label of labels.slice(index)) {
        statements.push(...label.namedChildren.slice(label.type === 'case_statement' ? 1 : 0));
      }
      return sequenceTerminates(statements, budget, depth + 1);
    });
  }
  if (node.type === 'while_statement') {
    const condition = node.namedChildren.find((child) => child.type === 'parenthesized_expression');
    const body = node.namedChildren.at(-1);
    return Boolean(condition?.namedChildren.length === 1
      && condition.namedChildren[0]?.type === 'boolean'
      && condition.namedChildren[0].text.toLowerCase() === 'true'
      && body && !containsPotentialLoopExit(body, budget, depth + 1));
  }
  if (node.type === 'do_statement') {
    const body = node.namedChildren[0];
    const condition = node.namedChildren.find((child) => child.type === 'parenthesized_expression');
    return Boolean(body && condition?.namedChildren.length === 1
      && condition.namedChildren[0]?.type === 'boolean'
      && condition.namedChildren[0].text.toLowerCase() === 'true'
      && !containsPotentialLoopExit(body, budget, depth + 1));
  }
  if (node.type === 'for_statement') {
    const body = node.namedChildren.at(-1);
    const firstSeparator = node.children.findIndex((child) => child.type === ';');
    const secondSeparator = node.children.findIndex((child, index) => index > firstSeparator && child.type === ';');
    return Boolean(firstSeparator >= 0 && secondSeparator === firstSeparator + 1
      && body && !containsPotentialLoopExit(body, budget, depth + 1));
  }
  return false;
}

function sequenceOutcome(statements: FlowSyntaxNode[], budget: FlowBudget, depth: number): FlowOutcome {
  for (const statement of statements) {
    const outcome = statementOutcome(statement, budget, depth + 1);
    if (outcome !== 'falls-through') return outcome;
  }
  return 'falls-through';
}

function branchOutcome(candidate: FlowSyntaxNode | undefined, budget: FlowBudget, depth: number): FlowOutcome {
  const body = candidate?.type === 'compound_statement' ? candidate : candidate?.namedChildren.at(-1);
  return body ? statementOutcome(body, budget, depth + 1) : 'unknown';
}

/**
 * Proves whether execution terminates or can reach the next statement. Unknown
 * covers expressions that may call user code and control transfers whose target
 * is outside the local syntax subtree.
 */
function statementOutcome(node: FlowSyntaxNode, budget: FlowBudget, depth = 0): FlowOutcome {
  if (depth > 256 || budget.remaining-- <= 0) { budget.complete = false; return 'unknown'; }
  if (requiredExpressionTerminates(node, budget, depth)) return 'terminates';
  if (node.type === 'return_statement' || node.type === 'exit_statement') return 'terminates';
  if (node.type === 'expression_statement') {
    if (node.namedChildren.length === 1 && expressionTerminates(node.namedChildren[0]!, budget, depth + 1)) return 'terminates';
    const pending = [...node.namedChildren];
    while (pending.length > 0) {
      const expression = pending.pop()!;
      if (depth > 256 || budget.remaining-- <= 0) { budget.complete = false; return 'unknown'; }
      if (expression.type === 'throw_expression') continue;
      if (['function_call_expression', 'member_call_expression', 'nullsafe_member_call_expression', 'scoped_call_expression',
        'object_creation_expression', 'yield_expression'].includes(expression.type)) return 'unknown';
      pending.push(...expression.namedChildren);
    }
    return 'falls-through';
  }
  if (node.type === 'compound_statement') return sequenceOutcome(node.namedChildren, budget, depth);
  if (node.type === 'if_statement') {
    const consequence = node.namedChildren.find((child) => child.type === 'compound_statement');
    const alternatives = node.namedChildren.filter((child) => child.type === 'else_if_clause');
    const fallback = node.namedChildren.find((child) => child.type === 'else_clause');
    if (!fallback) return 'falls-through';
    const outcomes = [branchOutcome(consequence, budget, depth), ...alternatives.map((item) => branchOutcome(item, budget, depth)),
      branchOutcome(fallback, budget, depth)];
    if (outcomes.every((outcome) => outcome === 'terminates')) return 'terminates';
    if (outcomes.some((outcome) => outcome === 'falls-through')) return 'falls-through';
    return 'unknown';
  }
  if (node.type === 'try_statement') {
    const body = node.namedChildren.find((child) => child.type === 'compound_statement');
    const catches = node.namedChildren.filter((child) => child.type === 'catch_clause');
    const finalizer = node.namedChildren.find((child) => child.type === 'finally_clause');
    if (finalizer) {
      const outcome = branchOutcome(finalizer, budget, depth);
      if (outcome !== 'falls-through') return outcome;
    }
    const outcomes = [branchOutcome(body, budget, depth), ...catches.map((item) => branchOutcome(item, budget, depth))];
    if (outcomes.every((outcome) => outcome === 'terminates')) return 'terminates';
    if (outcomes.some((outcome) => outcome === 'falls-through')) return 'falls-through';
    return 'unknown';
  }
  if (node.type === 'switch_statement') {
    const block = node.namedChildren.find((child) => child.type === 'switch_block');
    const labels = block?.namedChildren.filter((child) => child.type === 'case_statement' || child.type === 'default_statement') ?? [];
    if (labels.filter((label) => label.type === 'default_statement').length !== 1) return 'falls-through';
    const outcomes = labels.map((_, index): FlowOutcome => {
      const statements: FlowSyntaxNode[] = [];
      for (const label of labels.slice(index)) statements.push(...label.namedChildren.slice(label.type === 'case_statement' ? 1 : 0));
      return sequenceOutcome(statements, budget, depth + 1);
    });
    if (outcomes.every((outcome) => outcome === 'terminates')) return 'terminates';
    if (outcomes.some((outcome) => outcome === 'falls-through')) return 'falls-through';
    return 'unknown';
  }
  if (node.type === 'while_statement' || node.type === 'do_statement' || node.type === 'for_statement') {
    const body = node.type === 'do_statement' ? node.namedChildren[0] : node.namedChildren.at(-1);
    const condition = node.namedChildren.find((child) => child.type === 'parenthesized_expression');
    const literalTrue = condition?.namedChildren.length === 1 && condition.namedChildren[0]?.type === 'boolean'
      && condition.namedChildren[0].text.toLowerCase() === 'true';
    const firstSeparator = node.type === 'for_statement' ? node.children.findIndex((child) => child.type === ';') : -1;
    const secondSeparator = node.type === 'for_statement'
      ? node.children.findIndex((child, index) => index > firstSeparator && child.type === ';') : -1;
    const infinite = literalTrue || (node.type === 'for_statement' && firstSeparator >= 0 && secondSeparator === firstSeparator + 1);
    if (infinite && body) return containsPotentialLoopExit(body, budget, depth + 1) ? 'falls-through' : 'terminates';
    if (node.type !== 'do_statement') return 'falls-through';
    return body ? statementOutcome(body, budget, depth + 1) : 'unknown';
  }
  if (node.type === 'foreach_statement') return 'falls-through';
  if (node.type === 'break_statement') return 'falls-through';
  if (node.type === 'continue_statement' || node.type === 'goto_statement') return 'unknown';
  return 'unknown';
}

interface CallableFallthrough extends SourceRange { fqcn: string; nativeReturnType: string; }

function callableFallthroughRanges(parsed: ReturnType<PhpSyntaxParser['parse']>, terminatingCalls: SourceRange[]): CallableFallthrough[] {
  const ranges: CallableFallthrough[] = [];
  const budget: FlowBudget = { remaining: 100_000, complete: true,
    terminatingCalls: new Set(terminatingCalls.map((call) => `${call.start}:${call.end}`)) };
  const callableNodes = new Map<string, FlowSyntaxNode>();
  const pending: FlowSyntaxNode[] = [parsed.tree.rootNode];
  while (pending.length > 0 && budget.remaining-- > 0) {
    const node = pending.pop()!;
    if (node.type === 'function_definition' || node.type === 'method_declaration') {
      callableNodes.set(`${node.startIndex}:${node.endIndex}`, node);
    }
    pending.push(...node.namedChildren);
  }
  if (pending.length > 0) budget.complete = false;
  for (const callable of parsed.callables) {
    if (!callable.nativeReturnType || ['__construct', '__destruct'].includes(callable.name.toLowerCase())) continue;
    const node = callableNodes.get(`${callable.declarationStart}:${callable.declarationEnd}`);
    const body = node?.namedChildren.find((child) => child.type === 'compound_statement');
    if (!body) continue;
    const bodyNodes = [...body.namedChildren]; let generator = false;
    while (bodyNodes.length > 0 && budget.remaining-- > 0) {
      const candidate = bodyNodes.pop()!;
      if (candidate.type === 'yield_expression') { generator = true; break; }
      if (!['function_definition', 'method_declaration', 'anonymous_function', 'arrow_function'].includes(candidate.type)) {
        bodyNodes.push(...candidate.namedChildren);
      }
    }
    if (bodyNodes.length > 0 && !generator) budget.complete = false;
    if (!generator && statementOutcome(body, budget) === 'falls-through') {
      ranges.push({ start: callable.start, end: callable.end, fqcn: callable.fqcn, nativeReturnType: callable.nativeReturnType });
    }
  }
  return budget.complete ? ranges : [];
}

function unreachableRanges(root: FlowSyntaxNode, terminatingCalls: SourceRange[] = []): SourceRange[] {
  const ranges: SourceRange[] = [];
  const budget: FlowBudget = { remaining: 100_000, complete: true,
    terminatingCalls: new Set(terminatingCalls.map((call) => `${call.start}:${call.end}`)) };
  const visit = (node: typeof root, depth = 0): void => {
    if (depth > 256 || budget.remaining-- <= 0) { budget.complete = false; return; }
    if (node.type === 'compound_statement') {
      let terminated = false;
      for (const child of node.namedChildren) {
        if (terminated) { ranges.push({ start: child.startIndex, end: child.endIndex }); continue; }
        visit(child, depth + 1);
        terminated = statementTerminates(child, budget, depth + 1);
      }
      return;
    }
    for (const child of node.namedChildren) visit(child, depth + 1);
  };
  visit(root);
  return budget.complete ? ranges : [];
}

function implicitlyNullableParameters(root: any): Array<SourceRange & { newType: string }> {
  const results: Array<SourceRange & { newType: string }> = [];
  const pending = [root]; let visited = 0;
  while (pending.length > 0 && visited < 100_000) {
    const node = pending.pop()!; visited += 1;
    if (node.type === 'simple_parameter' || node.type === 'property_promotion_parameter' || node.type === 'variadic_parameter') {
      const type = node.childForFieldName('type'); const defaultValue = node.childForFieldName('default_value');
      if (type && defaultValue?.text.trim().toLowerCase() === 'null') {
        const normalized = type.text.replace(/\s+/g, '').toLowerCase();
        const explicitlyNullable = normalized.startsWith('?') || normalized === 'mixed'
          || normalized.split(/[^a-z0-9_\\]+/u).includes('null');
        if (!explicitlyNullable) {
          const newType = normalized.includes('|') ? `${type.text}|null`
            : normalized.includes('&') ? `(${type.text})|null` : `?${type.text}`;
          results.push({ start: type.startIndex, end: type.endIndex, newType });
        }
      }
    }
    pending.push(...node.namedChildren);
  }
  return pending.length === 0 ? results.sort((left, right) => left.start - right.start) : [];
}

interface InvalidNativeTypeDeclaration extends SourceRange {
  type: string;
  context: 'parameter' | 'property' | 'return';
  reason: 'return-only' | 'property-forbidden' | 'standalone' | 'duplicate' | 'bool-redundant' | 'boolean-literals' | 'iterable-array' | 'object-class' | 'iterable-traversable' | 'intersection-non-class';
}

interface InvalidRelativeScope extends SourceRange {
  type: 'self' | 'parent' | 'static';
  container?: string;
  reason: 'outside-scope' | 'missing-parent';
}

interface InvalidAbstractMethodDeclaration extends SourceRange {
  fqcn: string;
  violations: string[];
}

interface InvalidAbstractPropertyDeclaration extends SourceRange {
  fqcn: string;
  violations: string[];
}

function invalidAbstractPropertyDeclarations(parsed: ReturnType<PhpSyntaxParser['parse']>, source: string): InvalidAbstractPropertyDeclaration[] {
  return parsed.properties.flatMap((property): InvalidAbstractPropertyDeclaration[] => {
    if (property.promoted || !property.hooks?.length) return [];
    const owner = parsed.declarations.find((item) => item.fqcn.toLowerCase() === property.containerFqcn.toLowerCase());
    if (!owner) return [];
    const ownerAbstract = owner.kind === 'interface' || /\babstract\b/i.test(source.slice(owner.declarationStart, owner.start));
    const abstractHooks = property.hooks.filter((hook) => hook.abstract);
    const violations: string[] = [];
    if (property.abstract && owner.kind === 'class' && !ownerAbstract) violations.push('a class with abstract properties must be declared abstract');
    if (property.abstract && property.visibility === 'private') violations.push('abstract properties cannot be private');
    if (property.abstract && property.final) violations.push('abstract properties cannot be final');
    if (property.abstract && abstractHooks.length === 0) violations.push('abstract properties must specify at least one abstract hook');
    if (!property.abstract && abstractHooks.length > 0) violations.push('properties with bodyless hooks must be declared abstract');
    if (owner.kind === 'interface' && property.visibility !== 'public') violations.push('interface properties must be public');
    if (owner.kind === 'interface' && property.hooks.some((hook) => !hook.abstract)) violations.push('interface property hooks cannot contain a body');
    if (abstractHooks.some((hook) => hook.final)) violations.push('abstract property hooks cannot be final');
    return violations.length ? [{ start: property.start, end: property.end, fqcn: property.fqcn, violations }] : [];
  });
}

function invalidAbstractMethodDeclarations(parsed: ReturnType<PhpSyntaxParser['parse']>): InvalidAbstractMethodDeclaration[] {
  const invalid: InvalidAbstractMethodDeclaration[] = [];
  const pending = [parsed.tree.rootNode]; let visited = 0;
  while (pending.length > 0 && visited < 100_000) {
    const node = pending.pop()!; visited += 1;
    if (node.type === 'method_declaration') {
      const name = node.childForFieldName('name');
      const callable = name ? parsed.callables.find((item) => item.kind === 'method' && item.start === name.startIndex && item.end === name.endIndex) : undefined;
      let container = node.parent;
      while (container && !['class_declaration', 'interface_declaration', 'trait_declaration', 'enum_declaration'].includes(container.type)) container = container.parent;
      if (name && callable && container) {
        const abstract = node.namedChildren.some((child) => child.type === 'abstract_modifier');
        const finalMethod = node.namedChildren.some((child) => child.type === 'final_modifier');
        const visibility = node.namedChildren.find((child) => child.type === 'visibility_modifier')?.text.toLowerCase() ?? 'public';
        const privateMethod = visibility === 'private';
        const body = node.childForFieldName('body');
        const containerAbstract = container.namedChildren.some((child) => child.type === 'abstract_modifier');
        const violations: string[] = [];
        if (body && abstract) violations.push('abstract methods cannot contain a body');
        else if (body && container.type === 'interface_declaration') violations.push('interface methods cannot contain a body');
        if (abstract && container.type === 'class_declaration' && !containerAbstract) violations.push('a class with abstract methods must be declared abstract');
        if (!body && !abstract && container.type !== 'interface_declaration') violations.push('non-abstract methods must contain a body');
        if (abstract && privateMethod && container.type !== 'trait_declaration') violations.push('abstract methods cannot be private outside a trait');
        if (finalMethod && container.type === 'interface_declaration') violations.push('interface methods cannot be final');
        else if (finalMethod && abstract) violations.push('abstract methods cannot be final');
        if (container.type === 'interface_declaration' && visibility !== 'public') violations.push('interface methods must be public');
        if (violations.length > 0) invalid.push({ start: name.startIndex, end: name.endIndex, fqcn: callable.fqcn, violations });
      }
    }
    pending.push(...node.namedChildren);
  }
  return pending.length === 0 ? invalid.sort((left, right) => left.start - right.start) : [];
}

function invalidRelativeScopes(parsed: ReturnType<PhpSyntaxParser['parse']>, source: string): InvalidRelativeScope[] {
  const references = [
    ...parsed.typeReferences.flatMap((reference) => {
      const type = source.slice(reference.start, reference.end).toLowerCase();
      return ['self', 'parent', 'static'].includes(type) ? [{ ...reference, type: type as InvalidRelativeScope['type'] }] : [];
    }),
    ...parsed.calls.flatMap((call) => {
      if (call.kind !== 'constructor') return [];
      const type = source.slice(call.nameStart, call.nameEnd).toLowerCase();
      return ['self', 'parent', 'static'].includes(type)
        ? [{ start: call.nameStart, end: call.nameEnd, type: type as InvalidRelativeScope['type'] }] : [];
    }),
  ];
  const seen = new Set<string>();
  return references.sort((left, right) => left.start - right.start).flatMap((reference): InvalidRelativeScope[] => {
    const key = `${reference.start}:${reference.end}`; if (seen.has(key)) return []; seen.add(key);
    const container = parsed.declarations.filter((declaration) => reference.start >= declaration.declarationStart && reference.end <= declaration.declarationEnd)
      .sort((left, right) => left.declarationEnd - left.declarationStart - (right.declarationEnd - right.declarationStart))[0];
    if (!container) return [{ ...reference, reason: 'outside-scope' }];
    if (reference.type !== 'parent' || container.kind === 'trait' || container.extendsNames.length > 0) return [];
    return [{ ...reference, container: container.fqcn, reason: 'missing-parent' }];
  });
}

function invalidNativeTypeDeclarations(root: ReturnType<PhpSyntaxParser['parse']>['tree']['rootNode'], targetVersion: SupportedPhpVersion): InvalidNativeTypeDeclaration[] {
  const invalid: InvalidNativeTypeDeclaration[] = [];
  const pending = [root]; let visited = 0;
  while (pending.length > 0 && visited < 100_000) {
    const node = pending.pop()!; visited += 1;
    let context: InvalidNativeTypeDeclaration['context'] | undefined;
    if (node.type === 'property_declaration' || node.type === 'property_promotion_parameter') context = 'property';
    else if (node.type === 'simple_parameter' || node.type === 'variadic_parameter') context = 'parameter';
    else if (['function_definition', 'method_declaration', 'anonymous_function', 'arrow_function'].includes(node.type)) context = 'return';
    const typeNode = context === 'return' ? node.childForFieldName('return_type') : context ? node.childForFieldName('type') : undefined;
    if (context && typeNode) {
      const composite = /[|&?]/.test(typeNode.text);
      const compositeSupported = (!typeNode.text.includes('|') || isSyntaxAvailable(targetVersion, '8.0'))
        && (!typeNode.text.includes('&') || isSyntaxAvailable(targetVersion, '8.1'))
        && (!(typeNode.text.includes('|') && typeNode.text.includes('&')) || isSyntaxAvailable(targetVersion, '8.2'));
      const atomicNodes = [typeNode]; const atoms: Array<{ type: string; start: number; end: number; native: boolean }> = [];
      while (atomicNodes.length > 0) {
        const atomic = atomicNodes.pop()!;
        if (atomic.type === 'primitive_type' || atomic.type === 'named_type') {
          atoms.push({
            type: atomic.text.toLowerCase(), start: atomic.startIndex, end: atomic.endIndex,
            native: !atomic.text.includes('\\'),
          });
        } else atomicNodes.push(...atomic.namedChildren);
      }
      atoms.sort((left, right) => left.start - right.start || left.end - right.end);
      const problemStarts = new Set<number>();
      for (const atom of atoms) {
        const type = atom.type; let reason: InvalidNativeTypeDeclaration['reason'] | undefined;
        if (!atom.native) continue;
        const nativeNever = type === 'never' && isSyntaxAvailable(targetVersion, '8.1');
        const nativeMixed = type === 'mixed' && isSyntaxAvailable(targetVersion, '8.0');
        if (context === 'parameter' && (type === 'void' || type === 'static' || nativeNever)) reason = 'return-only';
        else if (context === 'property' && (type === 'callable' || type === 'void' || type === 'static' || nativeNever)) reason = 'property-forbidden';
        else if (composite && compositeSupported && (type === 'void' || nativeNever || nativeMixed)) reason = 'standalone';
        if (reason) { invalid.push({ ...atom, context, reason }); problemStarts.add(atom.start); }
      }
      if (composite && compositeSupported) {
        const nativeTypes = new Set(['array', 'bool', 'callable', 'float', 'int', 'iterable', 'object', 'parent', 'self', 'string']);
        if (isSyntaxAvailable(targetVersion, '8.0')) for (const type of ['false', 'null', 'static']) nativeTypes.add(type);
        if (isSyntaxAvailable(targetVersion, '8.2')) nativeTypes.add('true');
        const seen = new Set<string>();
        for (const atom of atoms) {
          if (atom.native && nativeTypes.has(atom.type) && seen.has(atom.type) && !problemStarts.has(atom.start)) {
            invalid.push({ ...atom, context, reason: 'duplicate' }); problemStarts.add(atom.start);
          }
          if (atom.native && nativeTypes.has(atom.type)) seen.add(atom.type);
        }
        const bool = atoms.some((atom) => atom.native && atom.type === 'bool');
        for (const atom of atoms) if (bool && atom.native && ['false', 'true'].includes(atom.type) && !problemStarts.has(atom.start)) {
          invalid.push({ ...atom, context, reason: 'bool-redundant' }); problemStarts.add(atom.start);
        }
        if (!bool && atoms.some((atom) => atom.native && atom.type === 'false') && atoms.some((atom) => atom.native && atom.type === 'true')) {
          const literal = [...atoms].reverse().find((atom) => atom.native && (atom.type === 'false' || atom.type === 'true'));
          if (literal && !problemStarts.has(literal.start)) { invalid.push({ ...literal, context, reason: 'boolean-literals' }); problemStarts.add(literal.start); }
        }
        if (atoms.some((atom) => atom.native && atom.type === 'iterable')) for (const atom of atoms) if (atom.native && atom.type === 'array' && !problemStarts.has(atom.start)) {
          invalid.push({ ...atom, context, reason: 'iterable-array' }); problemStarts.add(atom.start);
        }
        if (typeNode.type === 'union_type') {
          const branches = typeNode.namedChildren;
          if (branches.some((branch) => branch.type === 'primitive_type' && branch.text.toLowerCase() === 'object')) {
            for (const branch of branches) if (branch.type === 'named_type' && !problemStarts.has(branch.startIndex)) {
              invalid.push({ start: branch.startIndex, end: branch.endIndex, type: branch.text, context, reason: 'object-class' });
              problemStarts.add(branch.startIndex);
            }
          }
          if (branches.some((branch) => branch.type === 'primitive_type' && branch.text.toLowerCase() === 'iterable')) {
            for (const branch of branches) if (branch.type === 'named_type' && /^\\traversable$/i.test(branch.text) && !problemStarts.has(branch.startIndex)) {
              invalid.push({ start: branch.startIndex, end: branch.endIndex, type: branch.text, context, reason: 'iterable-traversable' });
              problemStarts.add(branch.startIndex);
            }
          }
        }
        const typeNodes = [typeNode];
        while (typeNodes.length > 0) {
          const current = typeNodes.pop()!;
          if (current.type === 'union_type' || current.type === 'intersection_type') {
            const namedTypes = new Set<string>();
            for (const branch of current.namedChildren) {
              if (branch.type !== 'named_type') continue;
              const identity = branch.text.toLowerCase();
              if (namedTypes.has(identity) && !problemStarts.has(branch.startIndex)) {
                invalid.push({ start: branch.startIndex, end: branch.endIndex, type: branch.text, context, reason: 'duplicate' });
                problemStarts.add(branch.startIndex);
              }
              namedTypes.add(identity);
            }
          }
          if (current.type === 'intersection_type') for (const branch of current.namedChildren) {
            if (branch.type !== 'named_type' && !problemStarts.has(branch.startIndex)) {
              invalid.push({ start: branch.startIndex, end: branch.endIndex, type: branch.text, context, reason: 'intersection-non-class' });
              problemStarts.add(branch.startIndex);
            }
          }
          typeNodes.push(...current.namedChildren);
        }
      }
    }
    pending.push(...node.namedChildren);
  }
  return pending.length === 0 ? invalid.sort((left, right) => left.start - right.start || left.end - right.end) : [];
}

export function analyzePhpDocument(document: TextDocument, parser: PhpSyntaxParser, targetVersion: SupportedPhpVersion = '8.5', expectedNamespace?: string,
  terminatingCalls: SourceRange[] = []): PhpDocumentAnalysis {
  const parsed = parser.parse(document.getText());
  try {
    const source = document.getText();
    const grammarGapRanges = newestSyntaxGrammarGapRanges(source);
    const grammarNodes = [parsed.tree.rootNode];
    while (grammarNodes.length > 0) {
      const node = grammarNodes.pop()!;
      if (node.type === 'ERROR' && /^\(\s*void\s*\)$/i.test(node.text)) {
        let forStatement = node.parent;
        while (forStatement && forStatement.type !== 'for_statement') forStatement = forStatement.parent;
        const belongsTo = (field: 'initialize' | 'update'): boolean => {
          const clause = forStatement?.childForFieldName(field);
          return Boolean(clause && ((node.startIndex >= clause.startIndex && node.endIndex <= clause.endIndex)
            || (node.endIndex <= clause.startIndex && source.slice(node.endIndex, clause.startIndex).trim() === '')));
        };
        if (!forStatement || belongsTo('initialize') || belongsTo('update')) grammarGapRanges.push({ start: node.startIndex, end: node.endIndex });
      }
      grammarNodes.push(...node.namedChildren);
    }
    const enumFqcns = new Set(parsed.declarations.filter((item) => item.kind === 'enum').map((item) => item.fqcn));
    const enumPropertyErrors = new Set<string>();
    const enumProperties = new Map<number, { start: number; end: number; containerFqcn: string; name: string }>();
    if (isSyntaxAvailable(targetVersion, '8.1')) {
      const nodes = [parsed.tree.rootNode]; let visitedNodes = 0;
      while (nodes.length > 0 && visitedNodes < 100_000) {
        const node = nodes.pop()!; visitedNodes += 1;
        if (node.type === 'ERROR') {
          let ancestor = node.parent; let insideCallableBody = false; let recoveredMethodNameStart: number | undefined; let hasEarlierModifier = false;
          while (ancestor && ancestor.type !== 'enum_declaration') {
            if (ancestor.type === 'compound_statement') insideCallableBody = true;
            if (ancestor.type === 'method_declaration') recoveredMethodNameStart = ancestor.childForFieldName('name')?.startIndex;
            if (ancestor.namedChildren.some((child) => ['visibility_modifier', 'static_modifier', 'readonly_modifier', 'var_modifier', 'final_modifier', 'abstract_modifier'].includes(child.type)
              && child.startIndex < node.startIndex)) hasEarlierModifier = true;
            ancestor = ancestor.parent;
          }
          const owner = ancestor ? parsed.declarations.find((item) => item.kind === 'enum'
            && item.declarationStart === ancestor!.startIndex && item.declarationEnd === ancestor!.endIndex) : undefined;
          if (owner && !insideCallableBody && (recoveredMethodNameStart === undefined || node.endIndex <= recoveredMethodNameStart)) {
            const segments = [...node.text.matchAll(/[^;]*;/gu)];
            const remainder = node.text.slice(segments.at(-1)?.index !== undefined
              ? segments.at(-1)!.index + segments.at(-1)![0].length : 0);
            const propertyWithModifier = /^\s*(?:(?:public|protected|private|static|readonly|var|final|abstract)\s+)+(?!function\b)(?:[?\\A-Za-z_\x80-\xff][\\A-Za-z0-9_\x80-\xff|&?()\s]*\s+)?\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*/iu;
            const recoveredPropertyTail = /^\s*(?!function\b)(?:[?\\A-Za-z_\x80-\xff][\\A-Za-z0-9_\x80-\xff|&?()\s]*\s+)?\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*/iu;
            const allProperties = segments.every((segment) => propertyWithModifier.test(segment[0])
              || (segments.length === 1 && hasEarlierModifier && recoveredPropertyTail.test(segment[0])));
            if (segments.length > 0 && remainder.trim() === '' && allProperties) {
              enumPropertyErrors.add(`${node.startIndex}:${node.endIndex}`);
              for (const segment of segments) for (const variable of segment[0].matchAll(/\$([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)/gu)) {
                const start = node.startIndex + segment.index + variable.index;
                enumProperties.set(start, { start, end: start + variable[0].length, containerFqcn: owner.fqcn, name: variable[1]! });
              }
            }
          }
        }
        nodes.push(...node.namedChildren);
      }
      if (nodes.length > 0) { enumPropertyErrors.clear(); enumProperties.clear(); }
    }
    const effectiveErrors = parsed.errors.filter((error) => !grammarGapRanges.some((range) => error.start >= range.start && error.end <= range.end)
      && !enumPropertyErrors.has(`${error.start}:${error.end}`));
    const isForbiddenEnumMagicMethod = (callable: typeof parsed.callables[number]): boolean => callable.kind === 'method'
      && callable.containerFqcn !== undefined && enumFqcns.has(callable.containerFqcn)
      && ENUM_FORBIDDEN_MAGIC_METHODS.has(callable.name.toLowerCase());
    const seenErrors = new Set<string>();
    const diagnostics = effectiveErrors.flatMap((error): Diagnostic[] => {
      const key = `${error.start}:${error.end}`;
      if (seenErrors.has(key)) return [];
      seenErrors.add(key);
      return [{
        range: toRange(document, error),
        severity: DiagnosticSeverity.Error,
        code: 'php.syntax',
        source: 'PHP Companion',
        message: 'PHP syntax is incomplete or invalid at this location.',
      }];
    });
    diagnostics.push(...unsupportedSyntax(parsed.tree.rootNode, targetVersion).map((feature): Diagnostic => ({
      range: toRange(document, feature), severity: DiagnosticSeverity.Error, code: 'php.version.unsupported', source: 'PHP Companion',
      message: `${feature.feature} requires PHP ${feature.minimumVersion} or newer; the target is PHP ${targetVersion}.`,
    })));
    if (effectiveErrors.length === 0 && isSyntaxAvailable(targetVersion, '8.5')) {
      const messages = {
        arrow: 'Arrow functions cannot be used in constant expressions because they implicitly capture variables.',
        'non-static': 'Closures in constant expressions must be static.',
        capture: 'Closures in constant expressions cannot capture variables.',
        'dynamic-first-class': 'First-class callables in constant expressions must directly name a function or static method.',
      } as const;
      diagnostics.push(...invalidConstantExpressionCallables(parsed.tree.rootNode).map((item): Diagnostic => ({
        range: toRange(document, item), severity: DiagnosticSeverity.Error,
        code: 'php.constant-expression.invalid-callable', source: 'PHP Companion', message: messages[item.reason],
      })));
    }
    if (effectiveErrors.length === 0 && isSyntaxAvailable(targetVersion, '8.4')) {
      diagnostics.push(...implicitlyNullableParameters(parsed.tree.rootNode).map((parameter): Diagnostic => ({
        range: toRange(document, parameter), severity: DiagnosticSeverity.Warning,
        code: 'php.parameter.implicitly-nullable', source: 'PHP Companion',
        message: 'Implicitly nullable parameter types are deprecated in PHP 8.4; declare null explicitly.',
        data: { typeStart: parameter.start, typeEnd: parameter.end, newType: parameter.newType },
      })));
      diagnostics.push(...invalidAbstractPropertyDeclarations(parsed, source).map((item): Diagnostic => ({
        range: toRange(document, item), severity: DiagnosticSeverity.Error,
        code: 'php.property.invalid-abstract-declaration', source: 'PHP Companion',
        message: `Invalid declaration of ${item.fqcn}: ${item.violations.join('; ')}.`,
      })));
    }
    if (effectiveErrors.length === 0) diagnostics.push(...unreachableRanges(parsed.tree.rootNode, terminatingCalls).map((range): Diagnostic => ({
      range: toRange(document, range), severity: DiagnosticSeverity.Warning, code: 'php.control-flow.unreachable', source: 'PHP Companion',
      message: 'This statement is unreachable.',
    })));
    const fallthroughCallables = effectiveErrors.length === 0 ? callableFallthroughRanges(parsed, terminatingCalls) : [];
    if (isSyntaxAvailable(targetVersion, '8.1')) {
      diagnostics.push(...fallthroughCallables.filter((item) => item.nativeReturnType.trim().toLowerCase() === 'never').map((range): Diagnostic => ({
        range: toRange(document, range), severity: DiagnosticSeverity.Error, code: 'php.never.fallthrough', source: 'PHP Companion',
        message: 'A function declared never cannot complete normally.',
      })));
    }
    diagnostics.push(...fallthroughCallables.filter((item) => !['never', 'void'].includes(item.nativeReturnType.trim().toLowerCase()))
      .map((item): Diagnostic => ({
        range: toRange(document, item), severity: DiagnosticSeverity.Error, code: 'php.return.missing', source: 'PHP Companion',
        message: `${item.fqcn} can complete without returning a value of type ${item.nativeReturnType}.`,
      })));
    if (effectiveErrors.length === 0) diagnostics.push(...invalidNativeTypeDeclarations(parsed.tree.rootNode, targetVersion).map((item): Diagnostic => ({
      range: toRange(document, item), severity: DiagnosticSeverity.Error,
      code: ['duplicate', 'bool-redundant', 'boolean-literals', 'iterable-array', 'object-class', 'iterable-traversable'].includes(item.reason)
        ? 'php.type.redundant-declaration' : 'php.type.invalid-declaration',
      source: 'PHP Companion',
      message: item.reason === 'standalone'
        ? `Type ${item.type} must be used as a standalone type.`
        : item.reason === 'return-only'
          ? `Type ${item.type} is return-only and cannot be used for a parameter.`
          : item.reason === 'property-forbidden'
            ? `Type ${item.type} cannot be used for a property.`
            : item.reason === 'duplicate'
              ? `Type ${item.type} is declared more than once.`
              : item.reason === 'bool-redundant'
                ? `Type ${item.type} is redundant when bool is declared.`
                : item.reason === 'boolean-literals'
                  ? 'Types true and false cannot be combined; use bool.'
                  : item.reason === 'iterable-array'
                    ? 'Type array is redundant when iterable is declared.'
                    : item.reason === 'object-class'
                      ? `Class type ${item.type} is redundant when object is declared.`
                      : item.reason === 'iterable-traversable'
                        ? 'Type \\Traversable is redundant when iterable is declared.'
                        : `Type ${item.type} cannot be part of an intersection type.`,
    })));
    if (effectiveErrors.length === 0 && isSyntaxAvailable(targetVersion, '8.1')) {
      const declarations = new Map(parsed.declarations.filter((item) => item.kind === 'class').map((item) => [item.fqcn, item]));
      diagnostics.push(...parsed.properties.flatMap((property): Diagnostic[] => {
        const owner = declarations.get(property.containerFqcn); if (!owner) return [];
        const explicitlyReadonly = /\breadonly\b/iu.test(source.slice(property.declarationStart, property.start));
        const readonlyClassProperty = owner.readonlyClass && isSyntaxAvailable(targetVersion, '8.2');
        if (!explicitlyReadonly && !readonlyClassProperty) return [];
        const violations = [
          property.type === undefined ? 'must have a type' : undefined,
          property.static ? 'cannot be static' : undefined,
          property.defaultValue !== undefined && !property.promoted ? 'cannot have a default value' : undefined,
          isSyntaxAvailable(targetVersion, '8.4') && property.hooks?.length ? 'cannot declare hooks' : undefined,
        ].filter((item): item is string => item !== undefined);
        if (violations.length === 0) return [];
        return [{
          range: toRange(document, property), severity: DiagnosticSeverity.Error,
          code: 'php.property.invalid-readonly-declaration', source: 'PHP Companion',
          message: `Readonly property ${property.fqcn} ${violations.join('; ')}.`,
        }];
      }));
    }
    if (effectiveErrors.length === 0 && isSyntaxAvailable(targetVersion, '8.4')) {
      diagnostics.push(...parsed.properties.flatMap((property): Diagnostic[] => {
        if (!property.hooks?.length) return [];
        const get = property.hooks.find((hook) => hook.kind === 'get');
        const set = property.hooks.find((hook) => hook.kind === 'set');
        const violation = property.static
          ? `Static property ${property.fqcn} cannot declare hooks.`
          : property.writeVisibility && property.virtual
            ? `Virtual property ${property.fqcn} cannot specify asymmetric write visibility.`
            : property.virtual && property.defaultValue !== undefined
              ? `Virtual property ${property.fqcn} cannot specify a default value.`
              : property.virtual === false && get?.byReference && set
                ? `Backed property ${property.fqcn} cannot combine a by-reference get hook with a set hook.`
                : undefined;
        return violation ? [{
          range: toRange(document, property), severity: DiagnosticSeverity.Error,
          code: 'php.property.invalid-hook-declaration', source: 'PHP Companion', message: violation,
        }] : [];
      }));
    }
    if (effectiveErrors.length === 0) diagnostics.push(...invalidRelativeScopes(parsed, source).map((item): Diagnostic => ({
      range: toRange(document, item), severity: DiagnosticSeverity.Error, code: 'php.type.invalid-relative-scope', source: 'PHP Companion',
      message: item.reason === 'outside-scope'
        ? `Cannot use ${item.type} outside a class, interface, trait, or enum scope.`
        : `Cannot use parent in ${item.container} because it has no parent type.`,
    })));
    if (effectiveErrors.length === 0) diagnostics.push(...invalidAbstractMethodDeclarations(parsed).map((item): Diagnostic => ({
      range: toRange(document, item), severity: DiagnosticSeverity.Error,
      code: 'php.method.invalid-abstract-declaration', source: 'PHP Companion',
      message: `Invalid declaration of ${item.fqcn}: ${item.violations.join('; ')}.`,
    })));
    if (effectiveErrors.length === 0 && isSyntaxAvailable(targetVersion, '8.1')) {
      diagnostics.push(...[...enumProperties.values()].sort((left, right) => left.start - right.start).map((property): Diagnostic => ({
        range: toRange(document, property), severity: DiagnosticSeverity.Error,
        code: 'php.enum.invalid-member', source: 'PHP Companion',
        message: `Enum ${property.containerFqcn} cannot declare property $${property.name}.`,
      })));
      diagnostics.push(...parsed.callables.filter(isForbiddenEnumMagicMethod).map((callable): Diagnostic => ({
        range: toRange(document, callable), severity: DiagnosticSeverity.Error,
        code: 'php.enum.invalid-member', source: 'PHP Companion',
        message: `Enum ${callable.containerFqcn} cannot include magic method ${callable.name}.`,
      })));
      diagnostics.push(...parsed.callables.filter((callable) => callable.kind === 'method' && callable.containerFqcn !== undefined
        && enumFqcns.has(callable.containerFqcn) && (callable.name.toLowerCase() === 'cases'
          || (parsed.declarations.find((item) => item.fqcn === callable.containerFqcn)?.enumBackingType !== undefined
            && ['from', 'tryfrom'].includes(callable.name.toLowerCase())))).map((callable): Diagnostic => ({
        range: toRange(document, callable), severity: DiagnosticSeverity.Error,
        code: 'php.enum.invalid-member', source: 'PHP Companion',
        message: `Enum ${callable.containerFqcn} cannot redeclare synthesized method ${callable.name}.`,
      })));
      const literalKind = (value: string): 'string' | 'int' | 'float' | 'bool' | 'null' | undefined => {
        const text = value.trim();
        if (/^'(?:\\.|[^'\\])*'$/su.test(text) || /^"(?:\\.|[^"\\$])*"$/su.test(text)) return 'string';
        if (/^[+-]?(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|[0-9][0-9_]*)$/u.test(text)) return 'int';
        if (/^[+-]?(?:(?:[0-9][0-9_]*\.[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9][0-9_]*)?|[0-9][0-9_]*[eE][+-]?[0-9][0-9_]*)$/u.test(text)) return 'float';
        if (/^(?:true|false)$/iu.test(text)) return 'bool';
        if (/^null$/iu.test(text)) return 'null';
        return undefined;
      };
      for (const declaration of parsed.declarations.filter((item) => item.kind === 'enum')) {
        const seenValues = new Map<string, string>();
        for (const enumCase of parsed.constants.filter((item) => item.kind === 'enum-case' && item.containerFqcn === declaration.fqcn)) {
          let message: string | undefined;
          if (!declaration.enumBackingType && enumCase.value !== undefined) {
            message = `Case ${enumCase.fqcn} of a non-backed enum must not have a value.`;
          } else if (declaration.enumBackingType && enumCase.value === undefined) {
            message = `Case ${enumCase.fqcn} of a backed enum must have a value.`;
          } else if (declaration.enumBackingType && enumCase.value !== undefined) {
            const kind = literalKind(enumCase.value);
            if (kind && kind !== declaration.enumBackingType) {
              message = `Case ${enumCase.fqcn} has ${kind} value but enum backing type is ${declaration.enumBackingType}.`;
            } else if (kind) {
              const identity = `${kind}:${enumCase.value.trim()}`; const previous = seenValues.get(identity);
              if (previous) message = `Case ${enumCase.fqcn} duplicates the backing value of ${previous}.`;
              else seenValues.set(identity, enumCase.fqcn);
            }
          }
          if (message) diagnostics.push({
            range: toRange(document, enumCase), severity: DiagnosticSeverity.Error,
            code: 'php.enum.invalid-case', source: 'PHP Companion', message,
          });
        }
      }
    }
    const duplicateDiagnostics = <T extends SourceRange>(items: T[], key: (item: T) => string, code: string, label: string): Diagnostic[] => {
      const seen = new Set<string>();
      return items.flatMap((item) => {
        const identity = key(item); if (!seen.has(identity)) { seen.add(identity); return []; }
        return [{ range: toRange(document, item), severity: DiagnosticSeverity.Error, code, source: 'PHP Companion', message: `Duplicate ${label} declaration.` }];
      });
    };
    diagnostics.push(...duplicateDiagnostics(parsed.declarations.filter((item) => !item.anonymous), (item) => item.fqcn.toLowerCase(), 'php.duplicate.type', 'type'));
    diagnostics.push(...duplicateDiagnostics(parsed.callables.filter((item) => item.kind === 'function'), (item) => item.fqcn.toLowerCase(), 'php.duplicate.function', 'function'));
    diagnostics.push(...duplicateDiagnostics(parsed.callables.filter((item) => item.kind === 'method'), (item) => item.fqcn.toLowerCase(), 'php.duplicate.method', 'method'));
    diagnostics.push(...duplicateDiagnostics(parsed.properties, (item) => item.fqcn, 'php.duplicate.property', 'property'));
    diagnostics.push(...duplicateDiagnostics(parsed.constants.filter((item) => item.global), (item) => item.fqcn, 'php.duplicate.constant', 'namespace constant'));
    diagnostics.push(...duplicateDiagnostics(parsed.constants.filter((item) => !item.global), (item) => item.fqcn, 'php.duplicate.constant', 'class constant'));
    if (effectiveErrors.length === 0) diagnostics.push(...parsed.callables.flatMap((callable): Diagnostic[] => {
      if (callable.kind !== 'method' || isForbiddenEnumMagicMethod(callable)) return [];
      const name = callable.name.toLowerCase();
      if (name === '__construct' || name === '__destruct') {
        const violations = [
          callable.static ? 'be static' : undefined,
          callable.nativeReturnType ? 'declare a return type' : undefined,
          name === '__destruct' && callable.parameters.length > 0 ? 'accept parameters' : undefined,
        ].filter((item): item is string => Boolean(item));
        if (violations.length === 0) return [];
        const joined = violations.length === 1 ? violations[0]! : `${violations.slice(0, -1).join(', ')} or ${violations.at(-1)}`;
        return [{
          range: toRange(document, callable), severity: DiagnosticSeverity.Error, code: 'php.method.invalid-magic-signature', source: 'PHP Companion',
          message: `${name === '__construct' ? 'Constructor' : 'Destructor'} ${callable.fqcn} cannot ${joined}.`,
        }];
      }
      const contracts: Record<string, {
        arity: number; static?: boolean; returnType?: '?array' | 'array' | 'bool' | 'string' | 'void';
        minimumVersion?: SupportedPhpVersion; parameterTypes?: Record<number, 'array' | 'string'>;
      }> = {
        __clone: { arity: 0, static: false, returnType: 'void' },
        __tostring: { arity: 0, static: false, returnType: 'string' },
        __get: { arity: 1, static: false, parameterTypes: { 0: 'string' } },
        __set: { arity: 2, static: false, returnType: 'void', parameterTypes: { 0: 'string' } },
        __isset: { arity: 1, static: false, returnType: 'bool', parameterTypes: { 0: 'string' } },
        __unset: { arity: 1, static: false, returnType: 'void', parameterTypes: { 0: 'string' } },
        __call: { arity: 2, static: false, parameterTypes: { 0: 'string', 1: 'array' } },
        __callstatic: { arity: 2, static: true, parameterTypes: { 0: 'string', 1: 'array' } },
        __sleep: { arity: 0, returnType: 'array' },
        __wakeup: { arity: 0, returnType: 'void' },
        __set_state: { arity: 1, static: true, parameterTypes: { 0: 'array' } },
        __serialize: { arity: 0, static: false, returnType: 'array', minimumVersion: '7.4' },
        __unserialize: { arity: 1, static: false, returnType: 'void', minimumVersion: '7.4', parameterTypes: { 0: 'array' } },
        __debuginfo: { arity: 0, static: false, returnType: '?array' },
      };
      const contract = contracts[name]; if (!contract) return [];
      if (contract.minimumVersion && !isSyntaxAvailable(targetVersion, contract.minimumVersion)) return [];
      const violations: string[] = [];
      if (callable.parameters.length !== contract.arity) violations.push(`must accept exactly ${contract.arity} parameter${contract.arity === 1 ? '' : 's'}`);
      if (callable.parameters.some((parameter) => parameter.variadic)) violations.push('cannot use variadic parameters');
      if (callable.parameters.some((parameter) => parameter.byReference)) violations.push('cannot take parameters by reference');
      if (contract.static === true && !callable.static) violations.push('must be static');
      if (contract.static === false && callable.static) violations.push('cannot be static');
      for (const [positionText, expected] of Object.entries(contract.parameterTypes ?? {})) {
        const position = Number(positionText); const actual = callable.parameters[position]?.nativeType?.toLowerCase().replaceAll(' ', '');
        if (!actual) continue;
        const alternatives = expected === 'array' ? ['array', 'iterable'] : ['string'];
        const acceptsExpected = actual === 'mixed' || alternatives.some((type) => new RegExp(`(^|[|?(])${type}(?=$|[|)&])`, 'u').test(actual));
        if (!acceptsExpected) violations.push(`parameter ${position + 1} type must accept ${expected} when declared`);
      }
      if (callable.nativeReturnType && contract.returnType) {
        const actual = callable.nativeReturnType.toLowerCase().replaceAll(' ', '');
        const valid = actual === contract.returnType
          || (actual === 'never' && isSyntaxAvailable(targetVersion, '8.1'))
          || (contract.returnType === 'bool' && ['true', 'false'].includes(actual))
          || (contract.returnType === '?array' && ['array', 'null', 'array|null', 'null|array'].includes(actual));
        if (!valid) violations.push(`return type must be ${contract.returnType} or a compatible subtype when declared`);
      }
      if (violations.length === 0) return [];
      return [{
        range: toRange(document, callable), severity: DiagnosticSeverity.Error, code: 'php.method.invalid-magic-signature', source: 'PHP Companion',
        message: `Magic method ${callable.fqcn} has an invalid signature: ${violations.join('; ')}.`,
      }];
    }));
    if (effectiveErrors.length === 0) diagnostics.push(...parsed.callables.flatMap((callable): Diagnostic[] => {
      if (callable.kind !== 'method' || callable.visibility === 'public' || isForbiddenEnumMagicMethod(callable)) return [];
      const name = callable.name.toLowerCase();
      const publicMagicMethods = new Set([
        '__call', '__callstatic', '__get', '__set', '__isset', '__unset', '__sleep', '__wakeup',
        '__tostring', '__invoke', '__set_state', '__debuginfo',
      ]);
      if (isSyntaxAvailable(targetVersion, '7.4')) {
        publicMagicMethods.add('__serialize'); publicMagicMethods.add('__unserialize');
      }
      if (!publicMagicMethods.has(name)) return [];
      return [{
        range: toRange(document, callable), severity: DiagnosticSeverity.Warning,
        code: 'php.method.magic-visibility', source: 'PHP Companion',
        message: `Magic method ${callable.fqcn} must have public visibility.`,
      }];
    }));
    const namedDeclarations = parsed.declarations.filter((item) => !item.anonymous);
    const namespaces = [...new Set(namedDeclarations.map((item) => item.fqcn.includes('\\') ? item.fqcn.slice(0, item.fqcn.lastIndexOf('\\')) : ''))];
    if (effectiveErrors.length === 0 && expectedNamespace !== undefined && namespaces.length === 1 && namespaces[0] !== expectedNamespace) {
      const namespaceMatch = /\bnamespace\s+([\\A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)\s*[;{]/.exec(document.getText());
      const range = namespaceMatch?.index !== undefined
        ? { start: namespaceMatch.index + namespaceMatch[0].indexOf(namespaceMatch[1]!), end: namespaceMatch.index + namespaceMatch[0].indexOf(namespaceMatch[1]!) + namespaceMatch[1]!.length }
        : namedDeclarations[0];
      if (range) diagnostics.push({
        range: toRange(document, range), severity: DiagnosticSeverity.Warning, code: 'php.namespace.psr4', source: 'PHP Companion',
        message: `Namespace ${namespaces[0] || '(global)'} does not match the unique Composer PSR-4 namespace ${expectedNamespace || '(global)'}.`,
        data: { expectedNamespace },
      });
    }
    const symbols = parsed.declarations.filter((item) => !item.anonymous).map((declaration): DocumentSymbol => {
      const selectionRange = toRange(document, declaration);
      return {
        name: declaration.name,
        detail: declaration.fqcn,
        kind: symbolKind(declaration.kind),
        range: toRange(document, { start: declaration.declarationStart, end: declaration.declarationEnd }),
        selectionRange,
        children: [
          ...parsed.callables.filter((callable) => callable.containerFqcn === declaration.fqcn).map((callable) => ({
            name: callable.name,
            detail: `${callable.name}(${callable.parameters.map(displayPhpParameter).join(', ')})${callable.returnType ? `: ${callable.returnType}` : ''}`,
            kind: SymbolKind.Method,
            range: toRange(document, { start: callable.declarationStart, end: callable.declarationEnd }),
            selectionRange: toRange(document, callable),
          })),
          ...parsed.properties.filter((property) => property.containerFqcn === declaration.fqcn).map((property) => ({
            name: `$${property.name}`,
            detail: `${property.visibility}${property.static ? ' static' : ''}${property.readonly ? ' readonly' : ''}${property.type ? ` ${property.type}` : ''}`,
            kind: SymbolKind.Property,
            range: toRange(document, { start: property.declarationStart, end: property.declarationEnd }),
            selectionRange: toRange(document, property),
          })),
          ...parsed.constants.filter((constant) => constant.containerFqcn === declaration.fqcn).map((constant) => ({
            name: constant.name,
            detail: constant.kind === 'enum-case' ? `case${constant.value !== undefined ? ` = ${constant.value}` : ''}` : `${constant.visibility} const${constant.type ? ` ${constant.type}` : ''}`,
            kind: constant.kind === 'enum-case' ? SymbolKind.EnumMember : SymbolKind.Constant,
            range: toRange(document, { start: constant.declarationStart, end: constant.declarationEnd }),
            selectionRange: toRange(document, constant),
          })),
        ].sort((left, right) => document.offsetAt(left.selectionRange.start) - document.offsetAt(right.selectionRange.start)),
      };
    });
    symbols.push(...parsed.callables.filter((callable) => callable.kind === 'function').map((callable) => ({
      name: callable.name,
      detail: callable.fqcn,
      kind: SymbolKind.Function,
      range: toRange(document, { start: callable.declarationStart, end: callable.declarationEnd }),
      selectionRange: toRange(document, callable),
    })));
    symbols.push(...parsed.constants.filter((constant) => constant.global).map((constant) => ({
      name: constant.name,
      detail: constant.fqcn,
      kind: SymbolKind.Constant,
      range: toRange(document, { start: constant.declarationStart, end: constant.declarationEnd }),
      selectionRange: toRange(document, constant),
    })));
    return { diagnostics, symbols };
  } finally {
    parsed.tree.delete();
  }
}

function newestSyntaxGrammarGapRanges(source: string): SourceRange[] {
  const ranges: SourceRange[] = [];
  for (const match of source.matchAll(/\bclone\s*\(/gi)) {
    let depth = 1; let quote = ''; let escaped = false; let index = match.index + match[0].length;
    for (; index < source.length && depth > 0; index += 1) {
      const character = source[index]!;
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === "'" || character === '"') quote = character;
      else if (character === '(' || character === '[' || character === '{') depth += 1;
      else if (character === ')' || character === ']' || character === '}') depth -= 1;
    }
    if (depth === 0) {
      const expression = source.slice(match.index, index);
      const stringLiteral = String.raw`(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")`;
      const key = String.raw`(?:${stringLiteral}|[0-9]+)`;
      const value = String.raw`(?:${stringLiteral}|-?[0-9]+(?:\.[0-9]+)?|true|false|null)`;
      const propertyArray = new RegExp(String.raw`^clone\s*\(\s*\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*(?:\s*->\s*[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)*\s*,\s*\[\s*(?:${key}\s*=>\s*${value}\s*(?:,\s*${key}\s*=>\s*${value}\s*)*,?\s*)?\]\s*\)$`, 'iu');
      if (propertyArray.test(expression)) ranges.push({ start: match.index, end: index });
    }
  }
  for (const constructor of source.matchAll(/\bfunction\s+__construct\s*\(/gi)) {
    const parametersStart = constructor.index + constructor[0].length;
    let depth = 1; let quote = ''; let escaped = false; let index = parametersStart;
    for (; index < source.length && depth > 0; index += 1) {
      const character = source[index]!;
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === "'" || character === '"') quote = character;
      else if (character === '(' || character === '[' || character === '{') depth += 1;
      else if (character === ')' || character === ']' || character === '}') depth -= 1;
    }
    if (depth !== 0) continue;
    const parameters = source.slice(parametersStart, index - 1);
    for (const promotion of parameters.matchAll(/\b(?:public|protected|private)\s+(final)\s+(?:readonly\s+)?[?\\A-Za-z_\x80-\xff][\\A-Za-z0-9_\x80-\xff|&?\s()]*\s+\$[A-Za-z_\x80-\xff]/giu)) {
      const start = parametersStart + promotion.index + promotion[0].indexOf(promotion[1]!);
      ranges.push({ start, end: start + promotion[1]!.length });
    }
  }
  return ranges;
}

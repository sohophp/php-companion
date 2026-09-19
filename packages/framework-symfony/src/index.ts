import type { ControllerTemplateContext, ControllerContextVariable, SerializedPhpType } from '@php-companion/interop';
import type { PhpSyntaxParser, ParsedImport } from '@php-companion/parser';
import type { ExternalLiteralMethodReturnFact } from '@php-companion/semantic-provider';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { isMap, isScalar, isSeq, parseDocument, type Node, type Pair, type YAMLMap } from 'yaml';

interface NodeLike { type: string; text: string; startIndex: number; endIndex: number; namedChildren: NodeLike[]; childForFieldName(name: string): NodeLike | null; }
export interface SymfonyControllerDocument { uri: string; source: string; snapshotVersion: string; }
export interface SymfonyAutowireBinding { type?: string; parameter?: string; parameterIndex?: number; serviceId?: string; explicitArgument?: boolean; }
export interface SymfonyEventListenerTagFact { event: string; method: string; priority: number; uri: string; eventStart: number; eventEnd: number; methodStart: number; methodEnd: number; }
export interface SymfonyServiceFact { id: string; className: string; alias?: string; public: boolean; autowire: boolean; autowireComplete: boolean; bindings: SymfonyAutowireBinding[]; configuredCalls: string[]; callsComplete: boolean; configuredProperties: string[]; propertiesComplete: boolean; eventListeners: SymfonyEventListenerTagFact[]; origin: 'explicit' | 'resource' | 'compiled'; uri: string; start: number; end: number; registrationUri: string; registrationStart: number; registrationEnd: number; }
export interface SymfonyServiceResourceFact { namespacePrefix: string; resource: string; exclude: string[]; public: boolean; autowire: boolean; autowireComplete: boolean; bindings: SymfonyAutowireBinding[]; configuredCalls: string[]; callsComplete: boolean; configuredProperties: string[]; propertiesComplete: boolean; eventListeners: SymfonyEventListenerTagFact[]; uri: string; start: number; end: number; }
export interface SymfonyServiceImportFact { resource: string; uri: string; start: number; end: number; }
export interface SymfonyServiceClassCandidate { fqcn: string; kind: 'class' | 'interface' | 'trait' | 'enum'; abstract: boolean; uri: string; start: number; end: number; }
export interface SymfonyServiceDocumentFacts { complete: boolean; services: SymfonyServiceFact[]; resources: SymfonyServiceResourceFact[]; imports?: SymfonyServiceImportFact[]; }
export interface SymfonyBundleRegistrationFact { bundleName: string; className: string; uri: string; start: number; end: number; environments?: string[]; excludedEnvironments?: string[]; }
export interface SymfonyBundleRegistrationFacts { complete: boolean; bundles: SymfonyBundleRegistrationFact[]; }
export type SymfonyLiteralMethodReturnFact = ExternalLiteralMethodReturnFact;
export interface SymfonyServiceIdReference { value: string; start: number; end: number; }
export interface SymfonyAutowireResolution { serviceId: string; className: string; uri: string; start: number; end: number; kind: 'exact' | 'named-alias' | 'binding' | 'inferred' | 'compiled'; inferredAlias: boolean; }
export interface SymfonyCompiledMethodArgumentFact { callableFqcn: string; parameter?: string; parameterIndex?: number; serviceId: string; className: string; uri: string; start: number; end: number; }
export interface SymfonyCompiledPropertyArgumentFact { ownerFqcn: string; property: string; serviceId: string; className: string; uri: string; start: number; end: number; }
export interface SymfonyCompiledContainerFacts { complete: boolean; services: SymfonyServiceFact[]; methodArguments: SymfonyCompiledMethodArgumentFact[]; propertyArguments: SymfonyCompiledPropertyArgumentFact[]; }
export interface SymfonyEventSubscriptionFact { subscriberFqcn: string; event: string; listener: string; priority?: number; uri: string; eventStart: number; eventEnd: number; listenerStart: number; listenerEnd: number; }
export interface SymfonyEventDispatchFact { event: string; uri: string; eventStart: number; eventEnd: number; dispatchStart: number; dispatchEnd: number; }

const primitiveNames = new Set(['bool', 'int', 'float', 'string', 'array', 'object', 'callable', 'iterable', 'resource', 'null', 'void', 'never', 'mixed']);

function record(value: unknown): Record<string, unknown> | undefined { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function array(value: unknown): unknown[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function decodeXmlAttribute(value: string): string {
  return value.replace(/&#(x[0-9a-f]+|\d+);|&(quot|apos|lt|gt|amp);/gi, (entity, numeric: string | undefined, named: string | undefined) => {
    if (numeric) { const point = Number.parseInt(numeric.replace(/^x/i, ''), numeric.toLowerCase().startsWith('x') ? 16 : 10); return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity; }
    return ({ quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' } as Record<string, string>)[named!.toLowerCase()] ?? entity;
  });
}
function xmlAttribute(tag: string, name: string, offset: number): { value: string; start: number; end: number } | undefined {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(['"])(.*?)\\1`, 's').exec(tag); if (!match || match.index === undefined) return undefined;
  const quote = match[0].indexOf(match[1]!); const start = offset + match.index + quote + 1;
  return { value: decodeXmlAttribute(match[2]!), start, end: start + match[2]!.length };
}
function compiledEventListenerTags(source: string, serviceTag: RegExpMatchArray, uri: string): SymfonyEventListenerTagFact[] {
  if (serviceTag.index === undefined || /\/>\s*$/.test(serviceTag[0])) return [];
  const contentStart = serviceTag.index + serviceTag[0].length; const close = source.indexOf('</service>', contentStart);
  if (close < 0) return [];
  return [...source.slice(contentStart, close).matchAll(/<tag(?=\s)[^>]*>/g)].flatMap((match): SymfonyEventListenerTagFact[] => {
    if (match.index === undefined) return [];
    const offset = contentStart + match.index; const name = xmlAttribute(match[0], 'name', offset);
    const event = xmlAttribute(match[0], 'event', offset); const method = xmlAttribute(match[0], 'method', offset);
    const priorityAttribute = xmlAttribute(match[0], 'priority', offset); const priority = priorityAttribute ? Number(priorityAttribute.value) : 0;
    if (name?.value !== 'kernel.event_listener' || !event || !method || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(method.value)
      || !/^-?\d+$/.test(priorityAttribute?.value ?? '0') || !Number.isSafeInteger(priority)) return [];
    return [{ event: event.value, method: method.value, priority, uri, eventStart: event.start, eventEnd: event.end,
      methodStart: method.start, methodEnd: method.end }];
  });
}

/** Parse Symfony's debug-container XML dump without loading project PHP or parameter values. */
export function analyzeSymfonyContainerXml(uri: string, source: string): SymfonyCompiledContainerFacts {
  if (/<!DOCTYPE/i.test(source)) return { complete: false, services: [], methodArguments: [], propertyArguments: [] };
  let parsed: unknown;
  try {
    parsed = new XMLParser({ ignoreAttributes: (name: string): boolean => ['__proto__', 'constructor', 'prototype'].includes(name), attributeNamePrefix: '', parseAttributeValue: false, trimValues: false }).parse(source);
  } catch { return { complete: false, services: [], methodArguments: [], propertyArguments: [] }; }
  const container = record(record(parsed)?.container); const serviceRoot = record(container?.services);
  if (!serviceRoot) return { complete: false, services: [], methodArguments: [], propertyArguments: [] };
  const nodes = array(serviceRoot.service).flatMap((value) => record(value) ? [record(value)!] : []);
  const serviceTags = [...source.matchAll(/<service(?=\s)[^>]*>/g)].filter((tag) => /\bid\s*=/.test(tag[0]));
  if (nodes.length !== serviceTags.length) return { complete: false, services: [], methodArguments: [], propertyArguments: [] };
  const raw = nodes.map((node, index) => {
    const id = typeof node.id === 'string' ? node.id : undefined; const tag = serviceTags[index]!;
    const idMatch = /\bid\s*=\s*(['"])(.*?)\1/s.exec(tag[0]);
    if (!id || !idMatch || tag.index === undefined) return undefined;
    const valueOffset = idMatch.index + idMatch[0].indexOf(idMatch[2]!);
    return { node, id, className: typeof node.class === 'string' ? node.class.replace(/^\\/, '') : undefined,
      alias: typeof node.alias === 'string' ? node.alias.replace(/^\\/, '') : undefined,
      public: node.public === 'true', abstract: node.abstract === 'true', start: tag.index + valueOffset, end: tag.index + valueOffset + idMatch[2]!.length,
      eventListeners: compiledEventListenerTags(source, tag, uri) };
  });
  if (raw.some((item) => !item)) return { complete: false, services: [], methodArguments: [], propertyArguments: [] };
  const byId = new Map(raw.map((item) => [item!.id.toLowerCase(), item!]));
  const resolveClass = (item: NonNullable<(typeof raw)[number]>, visited = new Set<string>()): string | undefined => {
    if (item.className) return item.className;
    if (!item.alias || visited.has(item.alias.toLowerCase())) return undefined;
    visited.add(item.alias.toLowerCase()); const target = byId.get(item.alias.toLowerCase());
    return target ? resolveClass(target, visited) : item.alias.includes('\\') ? item.alias : undefined;
  };
  const services = raw.flatMap((item): SymfonyServiceFact[] => {
    if (!item || item.abstract) return [];
    const className = resolveClass(item, new Set([item.id.toLowerCase()]));
    return className ? [{ id: item.id, className, alias: item.alias, public: item.public, autowire: item.node.autowire === 'true', autowireComplete: false,
      bindings: [], configuredCalls: [], callsComplete: false, configuredProperties: [], propertiesComplete: false, eventListeners: item.eventListeners,
      origin: 'compiled', uri, start: item.start, end: item.end,
      registrationUri: uri, registrationStart: item.start, registrationEnd: item.end }] : [];
  });
  const serviceById = new Map(services.map((service) => [service.id.toLowerCase(), service]));
  const invocationArguments: SymfonyCompiledMethodArgumentFact[] = [];
  const propertyArguments: SymfonyCompiledPropertyArgumentFact[] = [];
  const appendInvocation = (callableFqcn: string, values: unknown[]): void => {
    values.forEach((value, parameterIndex) => {
      const argument = record(value); const serviceId = argument?.id;
      if (!argument || !['service', 'service_closure'].includes(String(argument.type)) || typeof serviceId !== 'string' || serviceId.startsWith('.errored.')) return;
      const target = serviceById.get(serviceId.toLowerCase()); if (!target) return;
      invocationArguments.push({ callableFqcn, parameterIndex, serviceId, className: target.className, uri, start: target.start, end: target.end });
    });
  };
  for (const item of raw) {
    if (!item) continue;
    const className = resolveClass(item, new Set([item.id.toLowerCase()])); if (!className) continue;
    appendInvocation(`${className}::__construct`, array(item.node.argument));
    for (const value of array(item.node.call)) {
      const call = record(value); if (typeof call?.method !== 'string') continue;
      appendInvocation(`${className}::${call.method}`, array(call.argument));
    }
    for (const value of array(item.node.property)) {
      const property = record(value); const name = property?.name; const serviceId = property?.id;
      if (typeof name !== 'string' || typeof serviceId !== 'string' || !['service', 'service_closure'].includes(String(property?.type)) || serviceId.startsWith('.errored.')) continue;
      const target = serviceById.get(serviceId.toLowerCase()); if (!target) continue;
      propertyArguments.push({ ownerFqcn: className, property: name.replace(/^\$/, ''), serviceId, className: target.className, uri, start: target.start, end: target.end });
    }
  }
  const locatorEntries = new Map<string, Array<{ parameter: string; serviceId: string }>>();
  for (const item of raw) {
    if (!item || item.className !== 'Symfony\\Component\\DependencyInjection\\ServiceLocator') continue;
    const collection = array(item.node.argument).map(record).find((argument) => argument?.type === 'collection');
    const entries = array(collection?.argument).flatMap((value) => {
      const argument = record(value); const parameter = argument?.key; const serviceId = argument?.id;
      return typeof parameter === 'string' && typeof serviceId === 'string' && !serviceId.startsWith('.errored.') ? [{ parameter, serviceId }] : [];
    });
    if (entries.length) locatorEntries.set(item.id.toLowerCase(), entries);
  }
  const methodArguments = [...invocationArguments, ...raw.flatMap((item): SymfonyCompiledMethodArgumentFact[] => {
    if (!item) return [];
    const context = array(item.node.tag).map(record).find((tag) => tag?.name === 'container.service_locator_context');
    const factory = record(item.node.factory); const locatorId = typeof factory?.service === 'string' ? factory.service.toLowerCase() : undefined;
    const callable = typeof context?.id === 'string' ? context.id.replace(/\(\)$/, '') : undefined;
    if (!locatorId || !callable || !callable.includes('::')) return [];
    return (locatorEntries.get(locatorId) ?? []).flatMap((entry) => {
      const target = serviceById.get(entry.serviceId.toLowerCase());
      return target ? [{ callableFqcn: callable, parameter: entry.parameter, serviceId: entry.serviceId, className: target.className, uri, start: target.start, end: target.end }] : [];
    });
  })];
  return { complete: true, services, methodArguments, propertyArguments };
}

/** Locate the quoted value of Symfony's #[Autowire(service: ...)] named argument. */
export function symfonyAutowireServiceIdAt(source: string, offset: number): SymfonyServiceIdReference | undefined {
  if (offset < 0 || offset > source.length) return undefined;
  let quoteStart = -1; let quote = '';
  for (let index = offset - 1; index >= Math.max(0, offset - 2_000); index -= 1) {
    const character = source[index]!;
    if ((character === "'" || character === '"') && source[index - 1] !== '\\') { quoteStart = index; quote = character; break; }
    if (character === ';' || character === '{' || character === '}') break;
  }
  if (quoteStart < 0 || !/#\[\s*(?:\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*\\)?Autowire\s*\([^)]*\bservice\s*:\s*$/s.test(source.slice(Math.max(0, quoteStart - 2_000), quoteStart))) return undefined;
  let quoteEnd = source.length;
  for (let index = quoteStart + 1; index < source.length; index += 1) {
    if (source[index] === quote && source[index - 1] !== '\\') { quoteEnd = index; break; }
    if (source[index] === '\n') return undefined;
  }
  if (offset < quoteStart + 1 || offset > quoteEnd) return undefined;
  return { value: source.slice(quoteStart + 1, quoteEnd), start: quoteStart + 1, end: quoteEnd };
}

function literalString(node: NodeLike | undefined): string | undefined {
  if (node?.type !== 'string') return undefined;
  const quote = node.text[0];
  return (quote === "'" || quote === '"') && node.text.at(-1) === quote ? node.text.slice(1, -1) : undefined;
}

function resolveName(name: string, namespace: string, imports: ParsedImport[]): string {
  if (name.startsWith('\\')) return name.slice(1);
  if (name.toLowerCase().startsWith('namespace\\')) return [namespace, name.slice('namespace\\'.length)].filter(Boolean).join('\\');
  const [head, ...tail] = name.split('\\');
  const imported = imports.find((item) => item.kind === 'class' && item.namespace === namespace && item.alias.toLowerCase() === head!.toLowerCase());
  return imported ? [imported.fqcn, ...tail].join('\\') : [namespace, name].filter(Boolean).join('\\');
}

function classConstantIdentity(node: NodeLike, namespace: string, imports: ParsedImport[], selfFqcn?: string): string | undefined {
  if (node.type !== 'class_constant_access_expression' || node.namedChildren.length < 2) return undefined;
  const owner = node.namedChildren[0]!.text; const constant = node.namedChildren[1]!.text;
  if (owner.toLowerCase() === 'parent') return undefined;
  const resolved = ['self', 'static'].includes(owner.toLowerCase()) ? selfFqcn : resolveName(owner, namespace, imports);
  return resolved ? constant.toLowerCase() === 'class' ? resolved : `${resolved}::${constant}` : undefined;
}

function serializedType(input: string | undefined, namespace: string, imports: ParsedImport[]): SerializedPhpType {
  if (!input) return { kind: 'unknown', reason: 'missing native type' };
  const clean = input.replace(/\s+/g, '');
  if (clean.startsWith('?')) return { kind: 'union', types: [serializedType(clean.slice(1), namespace, imports), { kind: 'primitive', name: 'null' }] };
  const separator = clean.includes('|') ? '|' : clean.includes('&') ? '&' : undefined;
  if (separator) return { kind: separator === '|' ? 'union' : 'intersection', types: clean.split(separator).map((part) => serializedType(part.replace(/^\(|\)$/g, ''), namespace, imports)) };
  const lower = clean.toLowerCase();
  if (primitiveNames.has(lower)) return { kind: 'primitive', name: lower as Extract<SerializedPhpType, { kind: 'primitive' }>['name'] };
  if (lower === 'true' || lower === 'false') return { kind: 'primitive', name: 'bool' };
  return { kind: 'named', name: resolveName(clean, namespace, imports) };
}

function expressionType(node: NodeLike, variables: Map<string, SerializedPhpType>, namespace: string, imports: ParsedImport[]): SerializedPhpType {
  if (node.type === 'variable_name') return variables.get(node.text) ?? { kind: 'unknown', reason: `unknown variable ${node.text}` };
  if (node.type === 'string') return { kind: 'primitive', name: 'string' };
  if (node.type === 'integer') return { kind: 'primitive', name: 'int' };
  if (node.type === 'float') return { kind: 'primitive', name: 'float' };
  if (node.type === 'boolean') return { kind: 'primitive', name: 'bool' };
  if (node.type === 'null') return { kind: 'primitive', name: 'null' };
  if (node.type === 'array_creation_expression') return { kind: 'primitive', name: 'array' };
  if (node.type === 'object_creation_expression') {
    const name = node.namedChildren.find((item) => item.type === 'name' || item.type === 'qualified_name')?.text;
    return name ? { kind: 'named', name: resolveName(name, namespace, imports) } : { kind: 'unknown', reason: 'dynamic object construction' };
  }
  return { kind: 'unknown', reason: `unsupported expression ${node.type}` };
}

function contextVariables(node: NodeLike, variables: Map<string, SerializedPhpType>, namespace: string, imports: ParsedImport[], document: SymfonyControllerDocument): { complete: boolean; variables: ControllerContextVariable[] } | undefined {
  if (node.type !== 'array_creation_expression') return undefined;
  const result: ControllerContextVariable[] = [];
  for (const element of node.namedChildren) {
    if (element.type !== 'array_element_initializer' || element.namedChildren.length !== 2) return { complete: false, variables: result };
    const name = literalString(element.namedChildren[0]); if (name === undefined) return { complete: false, variables: result };
    const key = element.namedChildren[0]!; const start = key.startIndex + 1; const end = Math.max(start, key.endIndex - 1);
    const before = document.source.slice(0, start); const line = before.split('\n').length - 1; const character = start - (before.lastIndexOf('\n') + 1);
    result.push({ name, type: expressionType(element.namedChildren[1]!, variables, namespace, imports), optional: false,
      sources: [{ uri: document.uri, start, end, line, character, snapshotVersion: document.snapshotVersion }] });
  }
  return { complete: true, variables: result };
}

export function analyzeSymfonyControllerContexts(parser: PhpSyntaxParser, document: SymfonyControllerDocument): ControllerTemplateContext[] {
  const parsed = parser.parse(document.source, undefined, document.uri);
  try {
    const contexts: ControllerTemplateContext[] = [];
    const visit = (node: NodeLike): void => {
      if (node.type === 'member_call_expression') {
        const [receiver, method, args] = node.namedChildren;
        if (receiver?.text === '$this' && method?.text === 'render' && args?.type === 'arguments') {
          const arguments_ = args.namedChildren.map((argument) => argument.namedChildren[0] ?? argument);
          const template = literalString(arguments_[0]);
          const callable = parsed.callables.filter((item) => item.kind === 'method' && node.startIndex >= item.declarationStart && node.endIndex <= item.declarationEnd)
            .sort((left, right) => left.declarationEnd - left.declarationStart - (right.declarationEnd - right.declarationStart))[0];
          if (template !== undefined && callable?.containerFqcn) {
            const namespace = callable.containerFqcn.split('\\').slice(0, -1).join('\\');
            const variables = new Map<string, SerializedPhpType>([['$this', { kind: 'named', name: callable.containerFqcn }]]);
            for (const parameter of callable.parameters) variables.set(`$${parameter.name}`, serializedType(parameter.nativeType, namespace, parsed.imports));
            const context = arguments_[1] ? contextVariables(arguments_[1], variables, namespace, parsed.imports, document) : { complete: true, variables: [] };
            if (context) contexts.push({
              template, complete: context.complete, variables: context.variables,
              sources: [{ symbol: callable.fqcn, location: { uri: document.uri, start: callable.start, end: callable.end, line: document.source.slice(0, callable.start).split('\n').length - 1, snapshotVersion: document.snapshotVersion } }],
            });
          }
        }
      }
      for (const child of node.namedChildren) visit(child);
    };
    visit(parsed.tree.rootNode as unknown as NodeLike);
    return contexts;
  } finally { parsed.tree.delete(); }
}

function unwrappedArrayValue(node: NodeLike): NodeLike | undefined {
  return node.type === 'array_element_initializer' && node.namedChildren.length === 1 ? node.namedChildren[0] : undefined;
}

function literalTextRange(node: NodeLike): { value: string; start: number; end: number } | undefined {
  const value = literalString(node); return value === undefined ? undefined : { value, start: node.startIndex + 1, end: node.endIndex - 1 };
}

function eventSubscriptionEntries(body: NodeLike | undefined,
  eventIdentity?: (event: NodeLike) => string | undefined): Array<{ event: NodeLike; listeners: NodeLike }> | undefined {
  if (!body) return undefined;
  type SubscriptionEntry = { event: NodeLike; listeners: NodeLike };
  const arrayEntries = (array: NodeLike): Array<{ event: NodeLike; listeners: NodeLike }> | undefined => {
    if (array.type !== 'array_creation_expression') return undefined;
    const entries = array.namedChildren.map((item) => item.type === 'array_element_initializer' && item.namedChildren.length === 2
      ? { event: item.namedChildren[0]!, listeners: item.namedChildren[1]! } : undefined);
    return entries.every((entry) => entry !== undefined) ? entries as Array<{ event: NodeLike; listeners: NodeLike }> : undefined;
  };
  const deterministicEntry = ({ event, listeners }: SubscriptionEntry): boolean =>
    ['string', 'class_constant_access_expression'].includes(event.type)
      && ['string', 'array_creation_expression'].includes(listeners.type);
  const entrySignature = ({ event, listeners }: SubscriptionEntry): string =>
    `${event.type}:${event.text}\u0000${listeners.type}:${listeners.text}`;
  const convergedBranches = (statement: NodeLike,
    entriesForBody: (branch: NodeLike) => SubscriptionEntry[] | undefined): SubscriptionEntry[] | undefined => {
    if (statement.type !== 'if_statement') return undefined;
    const directBody = statement.namedChildren.find((child) => child.type === 'compound_statement');
    const elseIfBodies = statement.namedChildren.filter((child) => child.type === 'else_if_clause')
      .map((clause) => clause.namedChildren.find((child) => child.type === 'compound_statement'));
    const elseBody = statement.namedChildren.find((child) => child.type === 'else_clause')?.namedChildren
      .find((child) => child.type === 'compound_statement');
    if (!directBody || !elseBody || elseIfBodies.some((branch) => !branch)) return undefined;
    const alternatives = [directBody, ...elseIfBodies as NodeLike[], elseBody].map(entriesForBody);
    if (alternatives.some((entries) => !entries?.length)) return undefined;
    const expected = alternatives[0]!.map(entrySignature);
    if (alternatives.some((entries) => entries!.length !== expected.length
      || entries!.some((entry, index) => entrySignature(entry) !== expected[index]))) return undefined;
    return alternatives.flatMap((entries) => entries!);
  };
  const containsVariable = (node: NodeLike): boolean => node.type === 'variable_name' && node.text === variable
    || node.namedChildren.some(containsVariable);
  const safeCondition = (node: NodeLike): boolean => {
    if (containsVariable(node) || ['assignment_expression', 'augmented_assignment_expression', 'update_expression',
      'reference_assignment_expression', 'dynamic_variable_name', 'include_expression', 'include_once_expression',
      'require_expression', 'require_once_expression', 'yield_expression'].includes(node.type)) return false;
    if (node.type === 'function_call_expression') {
      const name = node.namedChildren[0]?.text.toLowerCase().replace(/^\\/, '');
      if (!name || !['defined', 'class_exists', 'interface_exists', 'trait_exists', 'enum_exists', 'function_exists', 'extension_loaded'].includes(name)) return false;
    }
    return node.namedChildren.every(safeCondition);
  };
  if (body.namedChildren.length === 1 && body.namedChildren[0]!.type === 'return_statement') {
    const returned = body.namedChildren[0]!.namedChildren[0]; return returned ? arrayEntries(returned) : undefined;
  }
  if (body.namedChildren.length === 1 && body.namedChildren[0]!.type === 'if_statement') {
    return convergedBranches(body.namedChildren[0]!, (branch) => {
      if (branch.namedChildren.length !== 1 || branch.namedChildren[0]!.type !== 'return_statement') return undefined;
      const returned = branch.namedChildren[0]!.namedChildren[0];
      const entries = returned ? arrayEntries(returned) : undefined;
      return entries?.every(deterministicEntry) ? entries : undefined;
    });
  }
  if (body.namedChildren.length < 2) return undefined;
  const firstExpression = body.namedChildren[0]?.type === 'expression_statement' ? body.namedChildren[0]!.namedChildren[0] : undefined;
  const firstTarget = firstExpression?.type === 'assignment_expression' ? firstExpression.namedChildren[0] : undefined;
  const firstArray = firstExpression?.type === 'assignment_expression' ? firstExpression.namedChildren[1] : undefined;
  if (firstTarget?.type !== 'variable_name' || !firstArray) return undefined;
  const variable = firstTarget.text; const entries = arrayEntries(firstArray); if (!entries) return undefined;
  if (!entries.every(deterministicEntry)) return undefined;
  const assignedEntries = (statements: NodeLike[]): SubscriptionEntry[] | undefined => {
    const assigned: SubscriptionEntry[] = [];
    for (const statement of statements) {
      const assignment = statement.type === 'expression_statement' ? statement.namedChildren[0] : undefined;
      const target = assignment?.type === 'assignment_expression' ? assignment.namedChildren[0] : undefined;
      const listeners = assignment?.type === 'assignment_expression' ? assignment.namedChildren[1] : undefined;
      const targetVariable = target?.type === 'subscript_expression' ? target.namedChildren[0] : undefined;
      const event = target?.type === 'subscript_expression' ? target.namedChildren[1] : undefined;
      if (targetVariable?.type !== 'variable_name' || targetVariable.text !== variable || !event || !listeners) return undefined;
      const entry = { event, listeners }; if (!deterministicEntry(entry)) return undefined; assigned.push(entry);
    }
    return assigned;
  };
  const protectedEvents = new Set(entries.map((entry) => eventIdentity?.(entry.event)).filter((identity): identity is string => identity !== undefined));
  const safeOptionalBranches = (statement: NodeLike): boolean => {
    // Different class constants can legally have the same runtime string value, so only literal keys can prove non-overlap.
    if (!eventIdentity || entries.some((entry) => eventIdentity(entry.event) === undefined || entry.event.type !== 'string')
      || statement.type !== 'if_statement') return false;
    const directCondition = statement.namedChildren.find((child) => child.type === 'parenthesized_expression');
    const directBody = statement.namedChildren.find((child) => child.type === 'compound_statement');
    const clauses = statement.namedChildren.filter((child) => child.type === 'else_if_clause');
    const elseBody = statement.namedChildren.find((child) => child.type === 'else_clause')?.namedChildren
      .find((child) => child.type === 'compound_statement');
    if (!directCondition || !directBody || !safeCondition(directCondition)) return false;
    const bodies: NodeLike[] = [directBody];
    for (const clause of clauses) {
      const condition = clause.namedChildren.find((child) => child.type === 'parenthesized_expression');
      const branch = clause.namedChildren.find((child) => child.type === 'compound_statement');
      if (!condition || !branch || !safeCondition(condition)) return false; bodies.push(branch);
    }
    if (elseBody) bodies.push(elseBody);
    const optional = bodies.map((branch) => assignedEntries(branch.namedChildren));
    if (optional.some((branch) => !branch?.length)) return false;
    return optional.every((branch) => branch!.every((entry) => {
      const identity = eventIdentity(entry.event);
      return entry.event.type === 'string' && identity !== undefined && !protectedEvents.has(identity);
    }));
  };
  for (const statement of body.namedChildren.slice(1, -1)) {
    if (statement.type === 'if_statement') {
      const converged = convergedBranches(statement, (branch) => assignedEntries(branch.namedChildren));
      if (converged) {
        entries.push(...converged);
        for (const entry of converged) { const identity = eventIdentity?.(entry.event); if (identity) protectedEvents.add(identity); }
        continue;
      }
      if (safeOptionalBranches(statement)) continue;
      return undefined;
    }
    const assigned = assignedEntries([statement]); if (!assigned) return undefined; entries.push(...assigned);
    for (const entry of assigned) { const identity = eventIdentity?.(entry.event); if (identity) protectedEvents.add(identity); }
  }
  const returned = body.namedChildren.at(-1);
  return returned?.type === 'return_statement' && returned.namedChildren[0]?.type === 'variable_name'
    && returned.namedChildren[0]!.text === variable ? entries : undefined;
}

/** Extract only complete, literal listener declarations whose callbacks are proven public instance methods. */
export function analyzeSymfonyEventSubscriptions(parser: PhpSyntaxParser, uri: string, source: string,
  isPublicInstanceListener?: (subscriberFqcn: string, listener: string) => boolean): SymfonyEventSubscriptionFact[] {
  const parsed = parser.parse(source, undefined, uri);
  try {
    const subscriptions: SymfonyEventSubscriptionFact[] = [];
    const visit = (node: NodeLike, accept: (candidate: NodeLike) => boolean): NodeLike | undefined => {
      if (accept(node)) return node;
      for (const child of node.namedChildren) { const found = visit(child, accept); if (found) return found; }
      return undefined;
    };
    const listenerSpecs = (node: NodeLike): Array<{ listener: string; start: number; end: number; priority?: number }> => {
      const direct = literalTextRange(node); if (direct) return [{ listener: direct.value, start: direct.start, end: direct.end }];
      if (node.type !== 'array_creation_expression') return [];
      const values = node.namedChildren.map(unwrappedArrayValue);
      if (values.some((value) => !value)) return [];
      const first = values[0] && literalTextRange(values[0]);
      if (first) {
        if (values.length > 2 || values[1]?.type !== 'integer' && values[1] !== undefined) return [];
        const priority = values[1] ? Number(values[1].text) : undefined;
        if (priority !== undefined && !Number.isSafeInteger(priority)) return [];
        return [{ listener: first.value, start: first.start, end: first.end, priority }];
      }
      if (!values.length || values.some((value) => value!.type !== 'array_creation_expression')) return [];
      const nested = values.flatMap((value) => listenerSpecs(value!));
      return nested.length === values.length ? nested : [];
    };
    const attributes = (owner: NodeLike, namespace: string): NodeLike[] => owner.namedChildren
      .filter((child) => child.type === 'attribute_list').flatMap((list) => list.namedChildren.flatMap((group) => group.namedChildren))
      .filter((attribute) => attribute.type === 'attribute' && attribute.namedChildren[0]
        && resolveName(attribute.namedChildren[0].text, namespace, parsed.imports).toLowerCase()
          === 'symfony\\component\\eventdispatcher\\attribute\\aseventlistener');
    const attributeValues = (attribute: NodeLike): Map<string, NodeLike> | undefined => {
      const names = ['event', 'method', 'priority', 'dispatcher']; const result = new Map<string, NodeLike>();
      const args = attribute.namedChildren.find((child) => child.type === 'arguments')?.namedChildren ?? [];
      let position = 0; let named = false;
      for (const argument of args) {
        const children = argument.namedChildren; const isNamed = children.length === 2 && children[0]?.type === 'name';
        const key = isNamed ? children[0]!.text : names[position++];
        if (!key || !names.includes(key) || result.has(key) || (!isNamed && (named || children.length !== 1))) return undefined;
        named ||= isNamed; result.set(key, children.at(-1)!);
      }
      return result;
    };
    const nullableLiteral = (node: NodeLike | undefined): { value?: string; start: number; end: number } | undefined => {
      if (!node) return { start: 0, end: 0 };
      if (node.type === 'null') return { start: node.startIndex, end: node.endIndex };
      const literal = literalTextRange(node); return literal ? { value: literal.value, start: literal.start, end: literal.end } : undefined;
    };
    for (const declaration of parsed.declarations.filter((item) => item.kind === 'class' && !item.anonymous)) {
      const namespace = declaration.fqcn.slice(0, Math.max(0, declaration.fqcn.length - declaration.name.length - 1));
      const classNode = visit(parsed.tree.rootNode as unknown as NodeLike, (node) => node.type === 'class_declaration'
        && node.startIndex === declaration.declarationStart && node.endIndex === declaration.declarationEnd);
      if (!classNode) continue;
      const methods = parsed.callables.filter((callable) => callable.kind === 'method' && callable.containerFqcn === declaration.fqcn);
      const publicListeners = new Set(methods.filter((callable) => !callable.static && callable.visibility === 'public').map((callable) => callable.name.toLowerCase()));
      const acceptsListener = (listener: string): boolean => publicListeners.has(listener.toLowerCase())
        || Boolean(isPublicInstanceListener?.(declaration.fqcn, listener));
      if (declaration.implementsNames.some((name) => resolveName(name, namespace, parsed.imports).toLowerCase()
        === 'symfony\\component\\eventdispatcher\\eventsubscriberinterface')) {
        const subscriptionMethod = methods.find((callable) => callable.name.toLowerCase() === 'getsubscribedevents'
          && callable.static && callable.visibility === 'public');
        const methodNode = subscriptionMethod ? visit(classNode, (node) => node.type === 'method_declaration'
          && node.startIndex === subscriptionMethod.declarationStart && node.endIndex === subscriptionMethod.declarationEnd) : undefined;
        const body = methodNode?.namedChildren.find((child) => child.type === 'compound_statement');
        const eventIdentity = (eventNode: NodeLike): string | undefined => literalString(eventNode)
          ?? classConstantIdentity(eventNode, namespace, parsed.imports, declaration.fqcn);
        const entries = eventSubscriptionEntries(body, eventIdentity);
        if (entries) for (const { event: eventNode, listeners: listenersNode } of entries) {
          const listeners = listenerSpecs(listenersNode);
          const eventLiteral = literalTextRange(eventNode);
          const staticIdentity = classConstantIdentity(eventNode, namespace, parsed.imports, declaration.fqcn);
          const staticEvent = staticIdentity ? { value: staticIdentity, start: eventNode.startIndex, end: eventNode.endIndex } : undefined;
          const event = eventLiteral ?? staticEvent; if (!event || !listeners.length) continue;
          for (const listener of listeners) if (acceptsListener(listener.listener)) subscriptions.push({
            subscriberFqcn: declaration.fqcn, event: event.value, listener: listener.listener, priority: listener.priority,
            uri, eventStart: event.start, eventEnd: event.end, listenerStart: listener.start, listenerEnd: listener.end,
          });
        }
      }
      const methodNodes = classNode.namedChildren.find((child) => child.type === 'declaration_list')?.namedChildren
        .filter((child) => child.type === 'method_declaration') ?? [];
      type ListenerMethod = Pick<(typeof methods)[number], 'name' | 'static' | 'visibility' | 'parameters'>;
      const inferredEvents = (method: ListenerMethod): string[] => {
        const native = method.parameters[0]?.nativeType?.replace(/^\?/, ''); if (!native || native.includes('&')) return [];
        return [...new Set(native.split('|').map((name) => name.trim()).filter((name) => name && name.toLowerCase() !== 'null')
          .flatMap((name) => primitiveNames.has(name.toLowerCase()) ? [] : [resolveName(name, namespace, parsed.imports)]))]
          .filter((name) => name.toLowerCase() !== 'symfony\\contracts\\eventdispatcher\\event');
      };
      const addAttribute = (attribute: NodeLike, listener: ListenerMethod): void => {
        if (listener.static || listener.visibility !== 'public') return;
        const values = attributeValues(attribute); if (!values) return;
        const eventValue = values.get('event'); let events: Array<{ value: string; start: number; end: number }> = [];
        const literalEvent = nullableLiteral(eventValue);
        if (eventValue?.type === 'class_constant_access_expression' && eventValue.namedChildren[1]?.text.toLowerCase() === 'class') {
          const name = eventValue.namedChildren[0]?.text;
          if (name && !['parent'].includes(name.toLowerCase())) events = [{ value: ['self', 'static'].includes(name.toLowerCase()) ? declaration.fqcn : resolveName(name, namespace, parsed.imports), start: eventValue.startIndex, end: eventValue.endIndex }];
        } else if (literalEvent?.value !== undefined) events = [{ value: literalEvent.value, start: literalEvent.start, end: literalEvent.end }];
        else if (!eventValue || eventValue.type === 'null') events = inferredEvents(listener).map((value) => ({ value, start: attribute.namedChildren[0]!.startIndex, end: attribute.namedChildren[0]!.endIndex }));
        else return;
        const priorityNode = values.get('priority'); const priority = priorityNode === undefined ? 0 : /^-?\d+$/.test(priorityNode.text) ? Number(priorityNode.text) : Number.NaN;
        if (!Number.isSafeInteger(priority) || nullableLiteral(values.get('dispatcher')) === undefined) return;
        const methodValue = nullableLiteral(values.get('method')); if (methodValue === undefined) return;
        const listenerRange = methodValue.value === listener.name ? methodValue : { start: attribute.namedChildren[0]!.startIndex, end: attribute.namedChildren[0]!.endIndex };
        for (const event of events) subscriptions.push({ subscriberFqcn: declaration.fqcn, event: event.value, listener: listener.name,
          priority, uri, eventStart: event.start, eventEnd: event.end, listenerStart: listenerRange.start, listenerEnd: listenerRange.end });
      };
      for (const methodNode of methodNodes) {
        const name = methodNode.namedChildren.find((child) => child.type === 'name')?.text;
        const method = name && methods.find((candidate) => candidate.name === name && candidate.declarationStart === methodNode.startIndex); if (!method) continue;
        for (const attribute of attributes(methodNode, namespace)) {
          const values = attributeValues(attribute); const configuredMethod = values && nullableLiteral(values.get('method'));
          if (configuredMethod?.value !== undefined) continue;
          addAttribute(attribute, method);
        }
      }
      for (const attribute of attributes(classNode, namespace)) {
        const values = attributeValues(attribute); if (!values) continue;
        const configured = nullableLiteral(values.get('method')); if (!configured) continue;
        let listener: ListenerMethod | undefined = configured.value ? methods.find((method) => method.name === configured.value) : undefined;
        if (configured.value && !listener && acceptsListener(configured.value)) listener = {
          name: configured.value, parameters: [], visibility: 'public', static: false,
        };
        if (configured.value && !listener) continue;
        if (!listener) {
          const eventNode = values.get('event'); const eventValue = nullableLiteral(eventNode);
          let eventName = eventValue?.value;
          if (!eventName && eventNode?.type === 'class_constant_access_expression' && eventNode.namedChildren[1]?.text.toLowerCase() === 'class') {
            const name = eventNode.namedChildren[0]?.text;
            if (name && name.toLowerCase() !== 'parent') eventName = ['self', 'static'].includes(name.toLowerCase()) ? declaration.fqcn : resolveName(name, namespace, parsed.imports);
          }
          if (eventName) {
            const derived = `on${eventName.replace(/(?<=\b|_)[a-z]/gi, (character) => character.toUpperCase()).replace(/[^a-z0-9]/gi, '')}`;
            const declared = methods.find((method) => method.name.toLowerCase() === derived.toLowerCase());
            listener = declared ?? methods.find((method) => method.name === '__invoke');
            if (!listener) {
              const inherited = [derived, '__invoke'].find(acceptsListener);
              if (inherited) listener = { name: inherited, parameters: [], visibility: 'public', static: false };
            }
          } else {
            listener = methods.find((method) => method.name === '__invoke');
            if (!listener && acceptsListener('__invoke')) listener = { name: '__invoke', parameters: [], visibility: 'public', static: false };
          }
        }
        if (listener) addAttribute(attribute, listener);
      }
    }
    return subscriptions;
  } finally { parsed.tree.delete(); }
}

/** Extract a caller-proven effective public static getSubscribedEvents() body supplied by a parent class or Trait. */
export function analyzeSymfonyInheritedEventSubscriptions(parser: PhpSyntaxParser, uri: string, source: string,
  providerFqcn: string, subscriberFqcn: string,
  isPublicInstanceListener: (subscriberFqcn: string, listener: string) => boolean,
  relativeClasses: { selfFqcn?: string; staticFqcn?: string; parentFqcn?: string } = {},
  sourceMethodName = 'getSubscribedEvents'): SymfonyEventSubscriptionFact[] {
  const parsed = parser.parse(source, undefined, uri);
  try {
    const declaration = parsed.declarations.find((item) => ['class', 'trait'].includes(item.kind)
      && item.fqcn.toLowerCase() === providerFqcn.toLowerCase());
    if (!declaration) return [];
    const method = parsed.callables.find((item) => item.kind === 'method' && item.containerFqcn?.toLowerCase() === providerFqcn.toLowerCase()
      && item.name.toLowerCase() === sourceMethodName.toLowerCase() && item.static);
    if (!method) return [];
    const visit = (node: NodeLike, accept: (candidate: NodeLike) => boolean): NodeLike | undefined => {
      if (accept(node)) return node;
      for (const child of node.namedChildren) { const found = visit(child, accept); if (found) return found; }
      return undefined;
    };
    const methodNode = visit(parsed.tree.rootNode as unknown as NodeLike, (node) => node.type === 'method_declaration'
      && node.startIndex === method.declarationStart && node.endIndex === method.declarationEnd);
    const body = methodNode?.namedChildren.find((child) => child.type === 'compound_statement');
    const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const eventIdentity = (eventNode: NodeLike): string | undefined => {
      const literal = literalString(eventNode); if (literal !== undefined) return literal;
      const relativeReceiver = eventNode.type === 'class_constant_access_expression'
        ? eventNode.namedChildren[0]?.text.toLowerCase() : undefined;
      const relativeOwner = relativeReceiver === 'self' ? relativeClasses.selfFqcn
        : relativeReceiver === 'static' ? relativeClasses.staticFqcn
        : relativeReceiver === 'parent' ? relativeClasses.parentFqcn : undefined;
      return relativeReceiver && ['self', 'static', 'parent'].includes(relativeReceiver)
        ? relativeOwner && eventNode.namedChildren[1] ? `${relativeOwner}::${eventNode.namedChildren[1]!.text}` : undefined
        : classConstantIdentity(eventNode, namespace, parsed.imports, providerFqcn);
    };
    const entries = eventSubscriptionEntries(body, eventIdentity); if (!entries) return [];
    const listenerSpecs = (node: NodeLike): Array<{ listener: string; start: number; end: number; priority?: number }> => {
      const direct = literalTextRange(node); if (direct) return [{ listener: direct.value, start: direct.start, end: direct.end }];
      if (node.type !== 'array_creation_expression') return [];
      const values = node.namedChildren.map(unwrappedArrayValue); if (values.some((value) => !value)) return [];
      const first = values[0] && literalTextRange(values[0]);
      if (first) {
        if (values.length > 2 || values[1]?.type !== 'integer' && values[1] !== undefined) return [];
        const priority = values[1] ? Number(values[1].text) : undefined;
        return priority === undefined || Number.isSafeInteger(priority) ? [{ listener: first.value, start: first.start, end: first.end, priority }] : [];
      }
      if (!values.length || values.some((value) => value!.type !== 'array_creation_expression')) return [];
      const nested = values.flatMap((value) => listenerSpecs(value!)); return nested.length === values.length ? nested : [];
    };
    const facts: SymfonyEventSubscriptionFact[] = [];
    for (const { event: eventNode, listeners: listenersNode } of entries) {
      const listeners = listenerSpecs(listenersNode);
      const literalEvent = literalTextRange(eventNode);
      const relativeReceiver = eventNode.type === 'class_constant_access_expression'
        ? eventNode.namedChildren[0]?.text.toLowerCase() : undefined;
      const relativeOwner = relativeReceiver === 'self' ? relativeClasses.selfFqcn
        : relativeReceiver === 'static' ? relativeClasses.staticFqcn
        : relativeReceiver === 'parent' ? relativeClasses.parentFqcn : undefined;
      const staticIdentity = relativeReceiver && ['self', 'static', 'parent'].includes(relativeReceiver)
        ? relativeOwner && eventNode.namedChildren[1]
          ? `${relativeOwner}::${eventNode.namedChildren[1]!.text}` : undefined
        : classConstantIdentity(eventNode, namespace, parsed.imports, providerFqcn);
      const event = literalEvent ?? (staticIdentity ? { value: staticIdentity, start: eventNode.startIndex, end: eventNode.endIndex } : undefined);
      if (!event || !listeners.length) continue;
      for (const listener of listeners) if (isPublicInstanceListener(subscriberFqcn, listener.listener)) facts.push({
        subscriberFqcn, event: event.value, listener: listener.listener, priority: listener.priority,
        uri, eventStart: event.start, eventEnd: event.end, listenerStart: listener.start, listenerEnd: listener.end,
      });
    }
    return facts;
  } finally { parsed.tree.delete(); }
}

/** Extract method-level AsEventListener attributes copied from an inherited or Trait-composed method. */
export function analyzeSymfonyInheritedEventListenerAttributes(parser: PhpSyntaxParser, uri: string, source: string,
  providerFqcn: string, subscriberFqcn: string, sourceMethodName: string, listenerName = sourceMethodName,
  relativeClasses: { providerParentFqcn?: string; subscriberParentFqcn?: string } = {}): SymfonyEventSubscriptionFact[] {
  const parsed = parser.parse(source, undefined, uri);
  try {
    const declaration = parsed.declarations.find((item) => ['class', 'trait'].includes(item.kind)
      && item.fqcn.toLowerCase() === providerFqcn.toLowerCase());
    const method = parsed.callables.find((item) => item.kind === 'method' && item.containerFqcn?.toLowerCase() === providerFqcn.toLowerCase()
      && item.name.toLowerCase() === sourceMethodName.toLowerCase() && !item.static);
    if (!declaration || !method) return [];
    const visit = (node: NodeLike, accept: (candidate: NodeLike) => boolean): NodeLike | undefined => {
      if (accept(node)) return node;
      for (const child of node.namedChildren) { const found = visit(child, accept); if (found) return found; }
      return undefined;
    };
    const methodNode = visit(parsed.tree.rootNode as unknown as NodeLike, (node) => node.type === 'method_declaration'
      && node.startIndex === method.declarationStart && node.endIndex === method.declarationEnd);
    const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
    const attributes = methodNode?.namedChildren.filter((child) => child.type === 'attribute_list')
      .flatMap((list) => list.namedChildren.flatMap((group) => group.namedChildren))
      .filter((attribute) => attribute.type === 'attribute' && attribute.namedChildren[0]
        && resolveName(attribute.namedChildren[0].text, namespace, parsed.imports).toLowerCase()
          === 'symfony\\component\\eventdispatcher\\attribute\\aseventlistener') ?? [];
    const attributeValues = (attribute: NodeLike): Map<string, NodeLike> | undefined => {
      const names = ['event', 'method', 'priority', 'dispatcher']; const result = new Map<string, NodeLike>();
      const args = attribute.namedChildren.find((child) => child.type === 'arguments')?.namedChildren ?? [];
      let position = 0; let named = false;
      for (const argument of args) {
        const children = argument.namedChildren; const isNamed = children.length === 2 && children[0]?.type === 'name';
        const key = isNamed ? children[0]!.text : names[position++];
        if (!key || !names.includes(key) || result.has(key) || (!isNamed && (named || children.length !== 1))) return undefined;
        named ||= isNamed; result.set(key, children.at(-1)!);
      }
      return result;
    };
    const nullableLiteral = (node: NodeLike | undefined): { value?: string; start: number; end: number } | undefined => {
      if (!node) return { start: 0, end: 0 };
      if (node.type === 'null') return { start: node.startIndex, end: node.endIndex };
      const literal = literalTextRange(node); return literal ? { value: literal.value, start: literal.start, end: literal.end } : undefined;
    };
    const inferredEvents = (): string[] => {
      const native = method.parameters[0]?.nativeType?.replace(/^\?/, ''); if (!native || native.includes('&')) return [];
      return [...new Set(native.split('|').map((name) => name.trim()).filter((name) => name && name.toLowerCase() !== 'null')
        .flatMap((name) => primitiveNames.has(name.toLowerCase()) ? [] : [resolveName(name, namespace, parsed.imports)]))]
        .filter((name) => name.toLowerCase() !== 'symfony\\contracts\\eventdispatcher\\event');
    };
    const facts: SymfonyEventSubscriptionFact[] = [];
    for (const attribute of attributes) {
      const values = attributeValues(attribute); if (!values) continue;
      const configuredMethod = nullableLiteral(values.get('method')); if (configuredMethod?.value !== undefined) continue;
      const eventNode = values.get('event'); const literalEvent = nullableLiteral(eventNode);
      let events: Array<{ value: string; start: number; end: number }> = [];
      if (eventNode?.type === 'class_constant_access_expression' && eventNode.namedChildren[1]?.text.toLowerCase() === 'class') {
        const name = eventNode.namedChildren[0]?.text; const relative = name?.toLowerCase();
        if (!name || relative === 'static') continue;
        const relativeClass = relative === 'self' ? declaration.kind === 'trait' ? subscriberFqcn : providerFqcn
          : relative === 'parent' ? declaration.kind === 'trait' ? relativeClasses.subscriberParentFqcn : relativeClasses.providerParentFqcn
          : undefined;
        if (['self', 'parent'].includes(relative!) && !relativeClass) continue;
        events = [{ value: relativeClass ?? resolveName(name, namespace, parsed.imports),
          start: eventNode.startIndex, end: eventNode.endIndex }];
      } else if (literalEvent?.value !== undefined) events = [{ value: literalEvent.value, start: literalEvent.start, end: literalEvent.end }];
      else if (!eventNode || eventNode.type === 'null') events = inferredEvents().map((value) => ({
        value, start: attribute.namedChildren[0]!.startIndex, end: attribute.namedChildren[0]!.endIndex,
      }));
      else continue;
      const priorityNode = values.get('priority'); const priority = priorityNode === undefined ? 0 : /^-?\d+$/.test(priorityNode.text) ? Number(priorityNode.text) : Number.NaN;
      if (!Number.isSafeInteger(priority) || nullableLiteral(values.get('dispatcher')) === undefined) continue;
      for (const event of events) facts.push({
        subscriberFqcn, event: event.value, listener: listenerName, priority, uri,
        eventStart: event.start, eventEnd: event.end,
        listenerStart: attribute.namedChildren[0]!.startIndex, listenerEnd: attribute.namedChildren[0]!.endIndex,
      });
    }
    return facts;
  } finally { parsed.tree.delete(); }
}

/** Extract syntactically exact dispatch event identities; callers must still prove the method target is Symfony's dispatcher. */
export function analyzeSymfonyEventDispatches(parser: PhpSyntaxParser, uri: string, source: string): SymfonyEventDispatchFact[] {
  const parsed = parser.parse(source, undefined, uri);
  try {
    const root = parsed.tree.rootNode as unknown as NodeLike;
    const visit = (node: NodeLike, accept: (candidate: NodeLike) => boolean): NodeLike | undefined => {
      if (accept(node)) return node;
      for (const child of node.namedChildren) { const found = visit(child, accept); if (found) return found; }
      return undefined;
    };
    const find = (start: number, end: number): NodeLike | undefined => visit(root, (node) => node.type === 'argument'
      && node.startIndex === start && node.endIndex === end);
    const namespaceAt = (offset: number): string | undefined => {
      const callable = parsed.callables.filter((item) => offset >= item.declarationStart && offset <= item.declarationEnd)
        .sort((left, right) => left.declarationEnd - left.declarationStart - (right.declarationEnd - right.declarationStart))[0];
      if (callable) {
        const owner = callable.containerFqcn ?? callable.fqcn;
        return owner.split('\\').slice(0, -1).join('\\');
      }
      const declaration = parsed.declarations.find((item) => offset >= item.declarationStart && offset <= item.declarationEnd);
      return declaration ? declaration.fqcn.split('\\').slice(0, -1).join('\\') : parsed.namespace;
    };
    const expression = (argument: (typeof parsed.calls)[number]['arguments'][number]): NodeLike | undefined => {
      const node = find(argument.start, argument.end); return node?.namedChildren.at(-1);
    };
    const locallyConstructedEvent = (node: NodeLike, callStart: number, namespace: string): { event: string; start: number; end: number } | undefined => {
      if (node.type !== 'variable_name' || !/^\$[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*$/.test(node.text)) return undefined;
      const blocks: NodeLike[] = [];
      const collectBlocks = (candidate: NodeLike): void => {
        if (candidate.type === 'compound_statement' && candidate.startIndex <= callStart && candidate.endIndex >= callStart) blocks.push(candidate);
        for (const child of candidate.namedChildren) collectBlocks(child);
      };
      collectBlocks(root);
      const block = blocks.sort((left, right) => left.endIndex - left.startIndex - (right.endIndex - right.startIndex))[0];
      const statementIndex = block?.namedChildren.findIndex((candidate) => candidate.startIndex <= callStart && candidate.endIndex >= callStart) ?? -1;
      if (!block || statementIndex < 0 || statementIndex > 256) return undefined;
      const states = new Map<string, string>();
      const variables = (candidate: NodeLike): string[] => {
        const found: string[] = [];
        const collect = (current: NodeLike): void => {
          if (current.type === 'variable_name') found.push(current.text);
          for (const child of current.namedChildren) collect(child);
        };
        collect(candidate); return [...new Set(found)];
      };
      const constructed = (candidate: NodeLike | null | undefined): string | undefined => {
        if (candidate?.type !== 'object_creation_expression') return undefined;
        const name = candidate.namedChildren.find((child) => ['name', 'qualified_name'].includes(child.type))?.text;
        return name && !['self', 'static', 'parent'].includes(name.toLowerCase()) ? resolveName(name, namespace, parsed.imports) : undefined;
      };
      const convergedConditional = (candidate: NodeLike): { variable: string; event: string } | undefined => {
        if (candidate.type !== 'if_statement') return undefined;
        const thenBody = candidate.childForFieldName('body');
        const elseIfBodies = candidate.namedChildren.filter((child) => child.type === 'else_if_clause')
          .map((child) => child.childForFieldName('body'));
        const elseBody = candidate.namedChildren.find((child) => child.type === 'else_clause')?.childForFieldName('body');
        if (!thenBody || !elseBody || elseIfBodies.some((body) => !body)) return undefined;
        const assigned = [thenBody, ...elseIfBodies, elseBody].map((body) => {
          if (body!.type !== 'compound_statement' || body!.namedChildren.length !== 1) return undefined;
          const expression = body!.namedChildren[0]?.type === 'expression_statement' ? body!.namedChildren[0]!.namedChildren[0] : undefined;
          const left = expression?.type === 'assignment_expression' ? expression.childForFieldName('left') : undefined;
          const right = expression?.type === 'assignment_expression' ? expression.childForFieldName('right') : undefined;
          const event = constructed(right);
          return left?.type === 'variable_name' && event ? { variable: left.text, event } : undefined;
        });
        const first = assigned[0];
        return first && assigned.every((value) => value?.variable === first.variable && value.event === first.event) ? first : undefined;
      };
      for (const statement of block.namedChildren.slice(0, statementIndex)) {
        const converged = convergedConditional(statement);
        if (converged) {
          for (const variable of variables(statement)) states.delete(variable);
          states.set(converged.variable, converged.event); continue;
        }
        const assignment = statement.type === 'expression_statement' ? statement.namedChildren[0] : undefined;
        const left = assignment?.type === 'assignment_expression' ? assignment.childForFieldName('left') : undefined;
        const right = assignment?.type === 'assignment_expression' ? assignment.childForFieldName('right') : undefined;
        if (left?.type === 'variable_name' && right) {
          const alias = right.type === 'variable_name' ? states.get(right.text) : undefined;
          const event = constructed(right) ?? alias;
          for (const variable of variables(right)) if (right.type !== 'variable_name' || variable !== right.text) states.delete(variable);
          if (event) states.set(left.text, event); else states.delete(left.text);
          continue;
        }
        for (const variable of variables(statement)) states.delete(variable);
      }
      const event = states.get(node.text);
      return event ? { event, start: node.startIndex, end: node.endIndex } : undefined;
    };
    const identity = (node: NodeLike | undefined, namespace: string): { event: string; start: number; end: number } | undefined => {
      if (!node) return undefined;
      const literal = literalTextRange(node); if (literal) return { event: literal.value, start: literal.start, end: literal.end };
      const constant = classConstantIdentity(node, namespace, parsed.imports);
      return constant ? { event: constant, start: node.startIndex, end: node.endIndex } : undefined;
    };
    return parsed.calls.flatMap((call): SymfonyEventDispatchFact[] => {
      if (call.kind !== 'method' || source.slice(call.nameStart, call.nameEnd).toLowerCase() !== 'dispatch'
        || call.firstClassCallable || call.arguments.some((argument) => argument.unpacked)) return [];
      const namespace = namespaceAt(call.start); if (namespace === undefined) return [];
      const named = new Map(call.arguments.flatMap((argument) => argument.name ? [[argument.name.toLowerCase(), argument] as const] : []));
      if (named.size !== call.arguments.filter((argument) => argument.name).length
        || [...named.keys()].some((name) => !['event', 'eventname'].includes(name))) return [];
      let sawNamed = false; let invalidOrder = false;
      for (const argument of call.arguments) { if (argument.name) sawNamed = true; else if (sawNamed) invalidOrder = true; }
      const positional = call.arguments.filter((argument) => !argument.name);
      if (invalidOrder || positional.length > 2 || named.has('event') && positional.length >= 1 || named.has('eventname') && positional.length >= 2) return [];
      const eventArgument = named.get('event') ?? positional[0]; const eventNameArgument = named.get('eventname') ?? positional[1];
      if (!eventArgument) return [];
      const eventNameNode = eventNameArgument ? expression(eventNameArgument) : undefined;
      let event = eventNameNode?.type === 'null' || !eventNameNode ? undefined : identity(eventNameNode, namespace);
      if (eventNameNode && eventNameNode.type !== 'null' && !event) return [];
      if (!event) {
        const eventNode = expression(eventArgument); if (!eventNode) return [];
        if (eventNode.type === 'object_creation_expression') {
          const name = eventNode.namedChildren.find((child) => ['name', 'qualified_name'].includes(child.type))?.text;
          if (!name || ['self', 'static', 'parent'].includes(name.toLowerCase())) return [];
          event = { event: resolveName(name, namespace, parsed.imports), start: eventNode.startIndex, end: eventNode.endIndex };
        } else event = locallyConstructedEvent(eventNode, call.start, namespace);
        if (!event) return [];
      }
      return [{ event: event.event, uri, eventStart: event.start, eventEnd: event.end,
        dispatchStart: call.nameStart, dispatchEnd: call.nameEnd }];
    });
  } finally { parsed.tree.delete(); }
}

function mapValue(map: YAMLMap, key: string): Node | null | undefined {
  return map.get(key, true) as Node | null | undefined;
}

function scalarValue(node: Node | null | undefined): unknown {
  return isScalar(node) ? node.value : undefined;
}

function serviceMap(contents: Node | null | undefined): YAMLMap | undefined {
  if (!isMap(contents)) return undefined;
  const direct = mapValue(contents, 'services'); if (isMap(direct)) return direct;
  const framework = mapValue(contents, 'framework'); const nested = isMap(framework) ? mapValue(framework, 'services') : undefined;
  return isMap(nested) ? nested : undefined;
}

function autowireBindings(node: Node | null | undefined, arguments_: boolean = false): { complete: boolean; bindings: SymfonyAutowireBinding[] } {
  if (node === undefined) return { complete: true, bindings: [] };
  if (arguments_ && isSeq(node)) return { complete: true, bindings: node.items.map((value, parameterIndex) => {
    const scalar = scalarValue(value as Node); const serviceId = typeof scalar === 'string' && /^@\??[^@]/.test(scalar) ? scalar.replace(/^@\??/, '') : undefined;
    return { parameterIndex, serviceId, explicitArgument: true };
  }) };
  if (!isMap(node)) return { complete: false, bindings: [] };
  const bindings: SymfonyAutowireBinding[] = [];
  for (const pair of node.items as Pair[]) {
    const key = scalarValue(pair.key as Node);
    if (arguments_ && typeof key === 'number' && Number.isSafeInteger(key) && key >= 0) {
      const value = scalarValue(pair.value as Node); const serviceId = typeof value === 'string' && /^@\??[^@]/.test(value) ? value.replace(/^@\??/, '') : undefined;
      bindings.push({ parameterIndex: key, serviceId, explicitArgument: true }); continue;
    }
    if (typeof key !== 'string') return { complete: false, bindings: [] };
    if (arguments_ && /^(?:0|[1-9]\d*)$/.test(key) && Number.isSafeInteger(Number(key))) {
      const value = scalarValue(pair.value as Node); const serviceId = typeof value === 'string' && /^@\??[^@]/.test(value) ? value.replace(/^@\??/, '') : undefined;
      bindings.push({ parameterIndex: Number(key), serviceId, explicitArgument: true }); continue;
    }
    const match = /^(?:(\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*(?:[|&]\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)*)(?:\s+\$([A-Za-z_][A-Za-z0-9_]*))?|\$([A-Za-z_][A-Za-z0-9_]*))$/.exec(key.trim());
    if (!match) return { complete: false, bindings: [] };
    const value = scalarValue(pair.value as Node); const serviceId = typeof value === 'string' && /^@\??[^@]/.test(value) ? value.replace(/^@\??/, '') : undefined;
    bindings.push({ type: match[1]?.replace(/(^|[|&])\\/g, '$1'), parameter: match[2] ?? match[3], serviceId, explicitArgument: arguments_ || undefined });
  }
  return { complete: true, bindings };
}

function configuredMethodCalls(node: Node | null | undefined): { complete: boolean; methods: string[] } {
  if (node === undefined) return { complete: true, methods: [] };
  if (!isSeq(node)) return { complete: false, methods: [] };
  const methods: string[] = [];
  for (const item of node.items) {
    if (!isMap(item) || item.items.length !== 1) return { complete: false, methods: [] };
    const name = scalarValue(item.items[0]!.key as Node);
    if (typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return { complete: false, methods: [] };
    methods.push(name);
  }
  return { complete: true, methods };
}

function configuredProperties(node: Node | null | undefined): { complete: boolean; properties: string[] } {
  if (node === undefined) return { complete: true, properties: [] };
  if (!isMap(node)) return { complete: false, properties: [] };
  const properties: string[] = [];
  for (const item of node.items as Pair[]) {
    const name = scalarValue(item.key as Node);
    if (typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return { complete: false, properties: [] };
    properties.push(name);
  }
  return { complete: true, properties };
}

function scalarRange(node: Node, source: string): { start: number; end: number } | undefined {
  if (!isScalar(node) || !node.range) return undefined;
  let start = node.range[0]; let end = node.range[1];
  if ((source[start] === "'" || source[start] === '"') && source[end - 1] === source[start]) { start += 1; end -= 1; }
  return { start, end };
}

function eventListenerTags(node: Node | null | undefined, uri: string, source: string): SymfonyEventListenerTagFact[] {
  if (!isSeq(node)) return [];
  return node.items.flatMap((item): SymfonyEventListenerTagFact[] => {
    if (!isMap(item)) return [];
    const name = scalarValue(mapValue(item, 'name')); const eventNode = mapValue(item, 'event'); const methodNode = mapValue(item, 'method');
    const event = scalarValue(eventNode); const method = scalarValue(methodNode); const priorityValue = scalarValue(mapValue(item, 'priority'));
    const eventRange = eventNode && scalarRange(eventNode, source); const methodRange = methodNode && scalarRange(methodNode, source);
    const priority = priorityValue === undefined ? 0 : priorityValue;
    if (name !== 'kernel.event_listener' || typeof event !== 'string' || event.includes('%')
      || typeof method !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(method)
      || typeof priority !== 'number' || !Number.isSafeInteger(priority) || !eventRange || !methodRange) return [];
    return [{ event, method, priority, uri, eventStart: eventRange.start, eventEnd: eventRange.end,
      methodStart: methodRange.start, methodEnd: methodRange.end }];
  });
}

interface XmlElementRange { name: string; start: number; end: number; openEnd: number; closeStart: number; parentStart?: number; tag: string; }

function xmlElementRanges(source: string): XmlElementRange[] | undefined {
  const ignored = [...source.matchAll(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>/g)]
    .flatMap((match) => match.index === undefined ? [] : [{ start: match.index, end: match.index + match[0].length }]);
  const tokens = [...source.matchAll(/<\s*(\/?)\s*([A-Za-z_][A-Za-z0-9_.:-]*)(?:\s[^>]*)?>/g)];
  const elements: XmlElementRange[] = []; const stack: XmlElementRange[] = [];
  for (const token of tokens) {
    if (token.index === undefined) continue;
    if (ignored.some((range) => token.index! >= range.start && token.index! < range.end)) continue;
    const name = token[2]!.split(':').at(-1)!.toLowerCase(); const closing = token[1] === '/';
    if (closing) {
      const element = stack.pop(); if (!element || element.name !== name) return undefined;
      element.closeStart = token.index; element.end = token.index + token[0].length; elements.push(element); continue;
    }
    const element: XmlElementRange = { name, start: token.index, end: token.index + token[0].length,
      openEnd: token.index + token[0].length, closeStart: token.index + token[0].length,
      parentStart: stack.at(-1)?.start, tag: token[0] };
    if (/\/\s*>$/.test(token[0])) elements.push(element); else stack.push(element);
  }
  return stack.length ? undefined : elements.sort((left, right) => left.start - right.start);
}

function xmlBoolean(value: string | undefined): boolean | undefined {
  return value === 'true' || value === '1' ? true : value === 'false' || value === '0' ? false : undefined;
}

/** Parse conventional Symfony XML service definitions without loading the container or resolving parameters. */
export function analyzeSymfonyServiceXml(uri: string, source: string): SymfonyServiceDocumentFacts {
  if (/<!DOCTYPE/i.test(source)) return { complete: false, services: [], resources: [] };
  if (XMLValidator.validate(source) !== true) return { complete: false, services: [], resources: [] };
  const elements = xmlElementRanges(source); if (!elements) return { complete: false, services: [], resources: [] };
  const containers = elements.filter((element) => element.name === 'container' && element.parentStart === undefined);
  const servicesRoots = containers.length === 1
    ? elements.filter((element) => element.name === 'services' && element.parentStart === containers[0]!.start) : [];
  const importsRoots = containers.length === 1
    ? elements.filter((element) => element.name === 'imports' && element.parentStart === containers[0]!.start) : [];
  if (servicesRoots.length > 1 || importsRoots.length > 1 || servicesRoots.length + importsRoots.length === 0
    || elements.some((element) => element.name === 'when')) return { complete: false, services: [], resources: [] };
  const children = (parent: XmlElementRange, name?: string): XmlElementRange[] => elements
    .filter((element) => element.parentStart === parent.start && (!name || element.name === name));
  const attribute = (element: XmlElementRange, name: string): { value: string; start: number; end: number } | undefined =>
    xmlAttribute(element.tag, name, element.start);
  const imports = importsRoots[0] ? children(importsRoots[0], 'import').flatMap((element): SymfonyServiceImportFact[] => {
    const resource = attribute(element, 'resource');
    return resource && !resource.value.includes('%') ? [{ resource: resource.value, uri, start: resource.start, end: resource.end }] : [];
  }) : [];
  const root = servicesRoots[0];
  if (!root) return { complete: true, services: [], resources: [], imports };
  const defaults = children(root, 'defaults'); if (defaults.length > 1) return { complete: false, services: [], resources: [] };
  const defaultPublic = xmlBoolean(defaults[0] && attribute(defaults[0], 'public')?.value) ?? false;
  const defaultAutowire = xmlBoolean(defaults[0] && attribute(defaults[0], 'autowire')?.value) ?? false;
  const parseBindings = (owner: XmlElementRange): { complete: boolean; bindings: SymfonyAutowireBinding[] } => {
    const bindings: SymfonyAutowireBinding[] = [];
    for (const bind of children(owner, 'bind')) {
      const key = attribute(bind, 'key')?.value;
      const match = key && /^(?:(\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*(?:[|&]\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)*)(?:\s+\$([A-Za-z_][A-Za-z0-9_]*))?|\$([A-Za-z_][A-Za-z0-9_]*))$/.exec(key.trim());
      if (!match) return { complete: false, bindings: [] };
      const type = attribute(bind, 'type')?.value; const id = attribute(bind, 'id')?.value;
      const serviceId = type === 'service' && id && !id.includes('%') ? id : undefined;
      bindings.push({ type: match[1]?.replace(/(^|[|&])\\/g, '$1'), parameter: match[2] ?? match[3], serviceId });
    }
    return { complete: true, bindings };
  };
  const parseArguments = (owner: XmlElementRange): { complete: boolean; bindings: SymfonyAutowireBinding[] } => {
    const bindings: SymfonyAutowireBinding[] = []; let nextIndex = 0;
    for (const argument of children(owner, 'argument')) {
      const key = attribute(argument, 'key')?.value; const configuredIndex = attribute(argument, 'index')?.value;
      if (key !== undefined && configuredIndex !== undefined) return { complete: false, bindings: [] };
      let selector: Pick<SymfonyAutowireBinding, 'parameter' | 'parameterIndex'>;
      if (key?.startsWith('$') && /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(key)) selector = { parameter: key.slice(1) };
      else {
        const indexText = configuredIndex ?? key;
        if (indexText !== undefined && !/^(?:0|[1-9]\d*)$/.test(indexText)) return { complete: false, bindings: [] };
        const parameterIndex = indexText === undefined ? nextIndex : Number(indexText);
        if (!Number.isSafeInteger(parameterIndex)) return { complete: false, bindings: [] };
        selector = { parameterIndex }; nextIndex = Math.max(nextIndex, parameterIndex + 1);
      }
      const type = attribute(argument, 'type')?.value; const id = attribute(argument, 'id')?.value;
      bindings.push({ ...selector, serviceId: type === 'service' && id && !id.includes('%') ? id : undefined, explicitArgument: true });
    }
    return { complete: true, bindings };
  };
  const parseCalls = (owner: XmlElementRange): { complete: boolean; names: string[] } => {
    const calls = children(owner, 'call'); const names = calls.map((call) => attribute(call, 'method')?.value);
    return names.every((name) => name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
      ? { complete: true, names: names as string[] } : { complete: false, names: [] };
  };
  const parseProperties = (owner: XmlElementRange): { complete: boolean; names: string[] } => {
    const properties = children(owner, 'property'); const names = properties.map((property) => attribute(property, 'name')?.value);
    return names.every((name) => name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
      ? { complete: true, names: names as string[] } : { complete: false, names: [] };
  };
  const parseListeners = (owner: XmlElementRange): SymfonyEventListenerTagFact[] => children(owner, 'tag').flatMap((tag) => {
    const name = attribute(tag, 'name')?.value; const event = attribute(tag, 'event'); const method = attribute(tag, 'method');
    const priorityValue = attribute(tag, 'priority')?.value ?? '0'; const priority = Number(priorityValue);
    return name === 'kernel.event_listener' && event && method && !event.value.includes('%')
      && /^[A-Za-z_][A-Za-z0-9_]*$/.test(method.value) && /^-?\d+$/.test(priorityValue) && Number.isSafeInteger(priority)
      ? [{ event: event.value, method: method.value, priority, uri, eventStart: event.start, eventEnd: event.end,
        methodStart: method.start, methodEnd: method.end }] : [];
  });
  const defaultBindings = defaults[0] ? parseBindings(defaults[0]) : { complete: true, bindings: [] };
  const defaultListeners = defaults[0] ? parseListeners(defaults[0]) : [];
  const resources: SymfonyServiceResourceFact[] = [];
  for (const prototype of children(root, 'prototype')) {
    const namespace = attribute(prototype, 'namespace'); const resource = attribute(prototype, 'resource');
    if (!namespace || !namespace.value.endsWith('\\') || !resource || resource.value.includes('%')) continue;
    const wiring = parseBindings(prototype); const calls = parseCalls(prototype); const properties = parseProperties(prototype);
    const excludeAttribute = attribute(prototype, 'exclude')?.value;
    const excludes = [...(excludeAttribute ? [excludeAttribute] : []), ...children(prototype, 'exclude')
      .map((exclude) => decodeXmlAttribute(source.slice(exclude.openEnd, exclude.closeStart).trim())).filter(Boolean)];
    resources.push({ namespacePrefix: namespace.value, resource: resource.value, exclude: excludes,
      public: xmlBoolean(attribute(prototype, 'public')?.value) ?? defaultPublic,
      autowire: xmlBoolean(attribute(prototype, 'autowire')?.value) ?? defaultAutowire,
      autowireComplete: defaultBindings.complete && wiring.complete, bindings: [...defaultBindings.bindings, ...wiring.bindings],
      configuredCalls: calls.names, callsComplete: calls.complete, configuredProperties: properties.names,
      propertiesComplete: properties.complete, eventListeners: [...defaultListeners, ...parseListeners(prototype)],
      uri, start: namespace.start, end: namespace.end });
  }
  const raw = new Map<string, Omit<SymfonyServiceFact, 'className' | 'origin' | 'registrationUri' | 'registrationStart' | 'registrationEnd'> & { className?: string }>();
  for (const element of children(root, 'service')) {
    const id = attribute(element, 'id'); if (!id || id.value.includes('%') || xmlBoolean(attribute(element, 'abstract')?.value) === true) continue;
    const configuredClass = attribute(element, 'class')?.value; const configuredAlias = attribute(element, 'alias')?.value;
    const factory = children(element, 'factory').length > 0 || children(element, 'from-callable').length > 0;
    const className = configuredClass && !configuredClass.includes('%') ? configuredClass.replace(/^\\/, '')
      : !configuredAlias && id.value.includes('\\') && !factory && !attribute(element, 'parent') ? id.value.replace(/^\\/, '') : undefined;
    const alias = configuredAlias && !configuredAlias.includes('%') ? configuredAlias.replace(/^@\??/, '').replace(/^\\/, '') : undefined;
    if (!className && !alias) continue;
    const wiring = parseBindings(element); const argumentsWiring = parseArguments(element);
    const calls = parseCalls(element); const properties = parseProperties(element);
    raw.set(id.value, { id: id.value, className, alias, public: xmlBoolean(attribute(element, 'public')?.value) ?? defaultPublic,
      autowire: xmlBoolean(attribute(element, 'autowire')?.value) ?? defaultAutowire,
      autowireComplete: defaultBindings.complete && wiring.complete && argumentsWiring.complete,
      bindings: [...defaultBindings.bindings, ...wiring.bindings, ...argumentsWiring.bindings],
      configuredCalls: calls.names, callsComplete: calls.complete, configuredProperties: properties.names,
      propertiesComplete: properties.complete, eventListeners: [...defaultListeners, ...parseListeners(element)],
      uri, start: id.start, end: id.end });
  }
  const resolveClass = (service: { className?: string; alias?: string }, visited = new Set<string>()): string | undefined => {
    if (service.className) return service.className;
    if (!service.alias || visited.has(service.alias)) return undefined;
    visited.add(service.alias); const target = raw.get(service.alias);
    return target ? resolveClass(target, visited) : service.alias.includes('\\') ? service.alias.replace(/^\\/, '') : undefined;
  };
  return { complete: true, resources, imports, services: [...raw.values()].flatMap((service): SymfonyServiceFact[] => {
    const className = resolveClass(service, new Set([service.id]));
    return className ? [{ ...service, className, origin: 'explicit', registrationUri: service.uri,
      registrationStart: service.start, registrationEnd: service.end }] : [];
  }) };
}

function phpConfiguratorLiteral(node: NodeLike | undefined): { value: string; start: number; end: number } | undefined {
  if (node?.type !== 'string' || node.text.length < 2) return undefined;
  const quote = node.text[0]; if ((quote !== "'" && quote !== '"') || node.text.at(-1) !== quote) return undefined;
  const raw = node.text.slice(1, -1);
  if (quote === '"' && /\$|\\(?:x[0-9a-fA-F]|u\{|[0-7])/u.test(raw)) return undefined;
  const value = quote === "'" ? raw.replace(/\\(['\\])/g, '$1')
    : raw.replace(/\\([\\"$nrtvef])/g, (_match, escaped: string) => ({ n: '\n', r: '\r', t: '\t', v: '\v', e: '\x1b', f: '\f' }[escaped] ?? escaped));
  return { value, start: node.startIndex + 1, end: node.endIndex - 1 };
}

function phpConfiguratorIndex(node: NodeLike | undefined): number | undefined {
  if (!node || !/^(?:0|[1-9]\d*)$/.test(node.text)) return undefined;
  const value = Number(node.text); return Number.isSafeInteger(value) ? value : undefined;
}

/** Extract deterministic config/bundles.php entries and direct Kernel::registerBundles() yields without booting the Kernel. */
export function analyzeSymfonyBundleRegistrations(parser: PhpSyntaxParser, uri: string, source: string): SymfonyBundleRegistrationFacts {
  const parsed = parser.parse(source, undefined, uri); const result: SymfonyBundleRegistrationFacts = { complete: true, bundles: [] };
  try {
    if (parsed.errors.length || parsed.tree.rootNode.hasError) return { complete: false, bundles: [] };
    const root = parsed.tree.rootNode as unknown as NodeLike;
    const classValue = (node: NodeLike | undefined): { value: string; start: number; end: number } | undefined => {
      if (node?.type !== 'class_constant_access_expression' || node.namedChildren[1]?.text.toLowerCase() !== 'class') return undefined;
      const owner = node.namedChildren[0]; if (!owner || ['self', 'static', 'parent'].includes(owner.text.toLowerCase())) return undefined;
      return { value: resolveName(owner.text, parsed.namespace, parsed.imports), start: owner.startIndex, end: owner.endIndex };
    };
    const add = (item: { value: string; start: number; end: number }, environments?: string[], excludedEnvironments?: string[]): void => {
      const bundleName = item.value.split('\\').at(-1);
      if (bundleName?.endsWith('Bundle')) result.bundles.push({ bundleName, className: item.value, uri, start: item.start, end: item.end,
        ...(environments?.length ? { environments } : {}), ...(excludedEnvironments?.length ? { excludedEnvironments } : {}) });
    };
    const returned = root.namedChildren.filter((node) => node.type === 'return_statement');
    const array = returned.length === 1 ? returned[0]!.namedChildren[0] : undefined;
    if (array?.type === 'array_creation_expression') {
      for (const element of array.namedChildren) {
        if (element.type !== 'array_element_initializer' || element.namedChildren.length !== 2) continue;
        const registered = classValue(element.namedChildren[0]); const environments = element.namedChildren[1];
        if (!registered || environments?.type !== 'array_creation_expression') continue;
        const states = new Map<string, boolean>(); let valid = true;
        for (const entry of environments.namedChildren) {
          const environment = entry.type === 'array_element_initializer' && entry.namedChildren.length === 2
            ? phpConfiguratorLiteral(entry.namedChildren[0])?.value : undefined;
          const value = entry.namedChildren[1]?.text.toLowerCase();
          if (!environment || !['true', 'false'].includes(value ?? '') || states.has(environment)) { valid = false; break; }
          states.set(environment, value === 'true');
        }
        if (!valid) continue;
        if (states.get('all') === true) add(registered, undefined,
          [...states].filter(([environment, enabled]) => environment !== 'all' && !enabled).map(([environment]) => environment).sort());
        else {
          const enabled = [...states].filter(([environment, value]) => environment !== 'all' && value).map(([environment]) => environment).sort();
          if (enabled.length) add(registered, enabled);
        }
      }
    }
    const collect = (node: NodeLike, type: string, found: NodeLike[] = []): NodeLike[] => {
      if (node.type === type) found.push(node);
      for (const child of node.namedChildren) collect(child, type, found);
      return found;
    };
    for (const callable of parsed.callables.filter((item) => item.kind === 'method' && item.name.toLowerCase() === 'registerbundles'
      && !item.static && item.parameters.length === 0)) {
      const owner = parsed.declarations.find((item) => item.fqcn === callable.containerFqcn && item.kind === 'class');
      const namespace = owner?.fqcn.split('\\').slice(0, -1).join('\\') ?? '';
      if (!owner || !owner.extendsNames.some((name) => resolveName(name, namespace, parsed.imports).toLowerCase() === 'symfony\\component\\httpkernel\\kernel')) continue;
      const method = collect(root, 'method_declaration').find((node) => node.startIndex <= callable.start && node.endIndex >= callable.end);
      const body = method?.namedChildren.find((node) => node.type === 'compound_statement');
      const environmentCondition = (statement: NodeLike): { environments: string[]; body: NodeLike } | undefined => {
        if (statement.type !== 'if_statement' || statement.namedChildren.length !== 2) return undefined;
        const [parenthesized, conditionalBody] = statement.namedChildren;
        const condition = parenthesized?.type === 'parenthesized_expression' ? parenthesized.namedChildren[0] : undefined;
        if (condition?.type !== 'binary_expression' || conditionalBody?.type !== 'compound_statement' || condition.namedChildren.length !== 2) return undefined;
        const [left, right] = condition.namedChildren;
        const operator = source.slice(left!.endIndex, right!.startIndex).trim();
        const member = left?.type === 'member_access_expression' && left.namedChildren[0]?.text === '$this'
          && left.namedChildren[1]?.text === 'environment' ? left : undefined;
        const environment = member && operator === '===' ? phpConfiguratorLiteral(right)?.value : undefined;
        return environment ? { environments: [environment], body: conditionalBody } : undefined;
      };
      const inspect = (statement: NodeLike, environments?: string[]): void => {
        const conditional = environmentCondition(statement);
        if (conditional) {
          if (environments) return;
          for (const nested of conditional.body.namedChildren) inspect(nested, conditional.environments);
          return;
        }
        if (statement.type !== 'expression_statement') return;
        const yields = collect(statement, 'yield_expression'); if (yields.length !== 1) return;
        const creations = collect(yields[0]!, 'object_creation_expression'); if (creations.length !== 1) return;
        const name = creations[0]!.namedChildren.find((node) => ['name', 'qualified_name'].includes(node.type));
        if (name) add({ value: resolveName(name.text, namespace, parsed.imports), start: name.startIndex, end: name.endIndex }, environments);
      };
      for (const statement of body?.namedChildren ?? []) inspect(statement);
    }
    const unique = new Map<string, SymfonyBundleRegistrationFact>();
    for (const item of result.bundles) {
      const key = `${item.bundleName.toLowerCase()}\0${item.className.toLowerCase()}`; const previous = unique.get(key);
      if (!previous) unique.set(key, item);
      else if (!previous.environments && !previous.excludedEnvironments) unique.set(key, previous);
      else if (!item.environments && !item.excludedEnvironments) unique.set(key, item);
      else if (previous.excludedEnvironments && item.excludedEnvironments) {
        const excluded = previous.excludedEnvironments.filter((environment) => item.excludedEnvironments!.includes(environment));
        unique.set(key, { ...previous, excludedEnvironments: excluded.length ? excluded : undefined });
      } else if (previous.excludedEnvironments && item.environments) {
        const excluded = previous.excludedEnvironments.filter((environment) => !item.environments!.includes(environment));
        unique.set(key, { ...previous, excludedEnvironments: excluded.length ? excluded : undefined });
      } else if (previous.environments && item.excludedEnvironments) {
        const excluded = item.excludedEnvironments.filter((environment) => !previous.environments!.includes(environment));
        unique.set(key, { ...item, excludedEnvironments: excluded.length ? excluded : undefined });
      }
      else unique.set(key, { ...previous, environments: [...new Set([...previous.environments!, ...item.environments!])].sort() });
    }
    result.bundles = [...unique.values()];
    return result;
  } finally { parsed.tree.delete(); }
}

/** Parse the static subset of Symfony's PHP service Configurator DSL without executing the returned closure. */
export function analyzeSymfonyServicePhp(parser: PhpSyntaxParser, uri: string, source: string): SymfonyServiceDocumentFacts {
  const parsed = parser.parse(source); if (parsed.errors.length) return { complete: false, services: [], resources: [] };
  const root = parsed.tree.rootNode as unknown as NodeLike;
  const returns = root.namedChildren.filter((node) => node.type === 'return_statement');
  const closure = returns.length === 1 ? returns[0]!.namedChildren[0] : undefined;
  const parameters = closure?.type === 'anonymous_function' ? closure.namedChildren.find((node) => node.type === 'formal_parameters') : undefined;
  const parameter = parameters?.namedChildren.length === 1 ? parameters.namedChildren[0] : undefined;
  const typeNode = parameter?.namedChildren.find((node) => node.type === 'named_type')?.namedChildren[0];
  const variableNode = parameter?.namedChildren.find((node) => node.type === 'variable_name');
  if (!closure || !typeNode || !variableNode || parameter.text.includes('&') || parameter.text.includes('...')
    || resolveName(typeNode.text, parsed.namespace, parsed.imports) !== 'Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator') {
    return { complete: false, services: [], resources: [] };
  }
  const body = closure.namedChildren.find((node) => node.type === 'compound_statement');
  if (!body) return { complete: false, services: [], resources: [] };
  const containerVariable = variableNode.text; let containerValid = true;
  const serviceVariables = new Set<string>(); const imports: SymfonyServiceImportFact[] = [];
  interface ChainCall { name: string; args: NodeLike[]; node: NodeLike; }
  const chain = (node: NodeLike): { base: NodeLike; calls: ChainCall[] } | undefined => {
    if (node.type !== 'member_call_expression') return { base: node, calls: [] };
    const receiver = node.namedChildren[0]; const name = node.namedChildren[1]; const args = node.namedChildren[2];
    if (!receiver || name?.type !== 'name' || args?.type !== 'arguments') return undefined;
    const previous = chain(receiver); if (!previous) return undefined;
    return { base: previous.base, calls: [...previous.calls, { name: name.text, args: args.namedChildren.map((arg) => arg.namedChildren.at(-1) ?? arg), node }] };
  };
  const classValue = (node: NodeLike | undefined): { value: string; start: number; end: number } | undefined => {
    if (node?.type !== 'class_constant_access_expression' || node.namedChildren[1]?.text.toLowerCase() !== 'class') return undefined;
    const owner = node.namedChildren[0]; if (!owner || ['self', 'static', 'parent'].includes(owner.text.toLowerCase())) return undefined;
    return { value: resolveName(owner.text, parsed.namespace, parsed.imports), start: owner.startIndex, end: owner.endIndex };
  };
  const identifier = (node: NodeLike | undefined): { value: string; start: number; end: number } | undefined => classValue(node) ?? phpConfiguratorLiteral(node);
  const functionIdentity = (name: string): string => {
    if (name.startsWith('\\')) return name.slice(1);
    const imported = parsed.imports.find((item) => item.kind === 'function' && item.alias.toLowerCase() === name.toLowerCase());
    return imported?.fqcn ?? [parsed.namespace, name].filter(Boolean).join('\\');
  };
  const serviceReference = (node: NodeLike | undefined): string | undefined => {
    if (!node) return undefined;
    const referenceChain = chain(node); const base = referenceChain?.base ?? node;
    if (base.type !== 'function_call_expression'
      || referenceChain?.calls.some((call) => !['ignoreOnInvalid', 'nullOnInvalid', 'ignoreOnUninitialized'].includes(call.name) || call.args.length)) return undefined;
    const name = base.namedChildren[0]; const args = base.namedChildren.find((child) => child.type === 'arguments');
    const identity = name && functionIdentity(name.text).toLowerCase();
    if (identity !== 'symfony\\component\\dependencyinjection\\loader\\configurator\\service' || args?.namedChildren.length !== 1) return undefined;
    return identifier(args.namedChildren[0]!.namedChildren.at(-1) ?? args.namedChildren[0])?.value;
  };
  type Mutable = Omit<SymfonyServiceFact, 'className' | 'origin' | 'registrationUri' | 'registrationStart' | 'registrationEnd'> & { className?: string };
  const raw = new Map<string, Mutable>(); const resources: SymfonyServiceResourceFact[] = [];
  let defaults = { public: false, autowire: false, autowireComplete: true, bindings: [] as SymfonyAutowireBinding[], eventListeners: [] as SymfonyEventListenerTagFact[] };
  const newMutable = (id: { value: string; start: number; end: number }, className?: string, alias?: string): Mutable => ({
    id: id.value, className, alias, public: defaults.public, autowire: defaults.autowire,
    autowireComplete: defaults.autowireComplete, bindings: [...defaults.bindings], configuredCalls: [], callsComplete: true,
    configuredProperties: [], propertiesComplete: true, eventListeners: [...defaults.eventListeners], uri, start: id.start, end: id.end,
  });
  const booleanArgument = (call: ChainCall, fallback: boolean): boolean | undefined => call.args.length === 0 ? fallback
    : call.args.length === 1 && ['true', 'false'].includes(call.args[0]!.text.toLowerCase()) ? call.args[0]!.text.toLowerCase() === 'true' : undefined;
  const listenerTag = (call: ChainCall): SymfonyEventListenerTagFact | undefined => {
    if (phpConfiguratorLiteral(call.args[0])?.value !== 'kernel.event_listener' || call.args[1]?.type !== 'array_creation_expression') return undefined;
    const values = new Map<string, NodeLike>();
    for (const element of call.args[1]!.namedChildren) {
      if (element.type !== 'array_element_initializer' || element.namedChildren.length !== 2) return undefined;
      const key = phpConfiguratorLiteral(element.namedChildren[0])?.value; if (!key) return undefined; values.set(key, element.namedChildren[1]!);
    }
    const eventNode = values.get('event'); const methodNode = values.get('method');
    const event = phpConfiguratorLiteral(eventNode) ?? classValue(eventNode); const method = phpConfiguratorLiteral(methodNode);
    const priorityText = values.get('priority')?.text ?? '0'; const priority = Number(priorityText);
    return event && method && /^[A-Za-z_][A-Za-z0-9_]*$/.test(method.value) && /^-?\d+$/.test(priorityText) && Number.isSafeInteger(priority)
      ? { event: event.value, method: method.value, priority, uri, eventStart: event.start, eventEnd: event.end,
        methodStart: method.start, methodEnd: method.end } : undefined;
  };
  for (const statement of body.namedChildren) {
    const expression = statement.type === 'expression_statement' ? statement.namedChildren[0] : undefined;
    if (expression?.type === 'assignment_expression' && expression.namedChildren[0]?.type === 'variable_name') {
      const assignedVariable = expression.namedChildren[0]!.text; const assigned = chain(expression.namedChildren[1]!);
      const servicesAssignment = containerValid && assigned?.base.text === containerVariable && assigned.calls.length === 1
        && assigned.calls[0]!.name === 'services' && assigned.calls[0]!.args.length === 0;
      if (assignedVariable === containerVariable) containerValid = false;
      if (servicesAssignment) serviceVariables.add(assignedVariable); else serviceVariables.delete(assignedVariable);
      continue;
    }
    const candidate = expression ? chain(expression) : undefined; if (!candidate) continue;
    if (containerValid && candidate.base.text === containerVariable && candidate.calls.length === 1 && candidate.calls[0]!.name === 'import') {
      const resource = phpConfiguratorLiteral(candidate.calls[0]!.args[0]);
      if (resource && !resource.value.includes('%')) imports.push({ resource: resource.value, uri, start: resource.start, end: resource.end });
      continue;
    }
    let calls = candidate.calls;
    if (containerValid && candidate.base.text === containerVariable && calls[0]?.name === 'services' && calls[0].args.length === 0) calls = calls.slice(1);
    else if (!serviceVariables.has(candidate.base.text)) continue;
    let current: Mutable | SymfonyServiceResourceFact | undefined; let currentKind: 'service' | 'resource' | 'defaults' | undefined;
    for (const call of calls) {
      if (call.name === 'defaults' && call.args.length === 0) {
        defaults = { public: false, autowire: false, autowireComplete: true, bindings: [], eventListeners: [] };
        current = undefined; currentKind = 'defaults'; continue;
      }
      if (call.name === 'instanceof') { current = undefined; currentKind = undefined; continue; }
      if (call.name === 'set') {
        const id = identifier(call.args[0]); const configuredClass = identifier(call.args[1]); if (!id) { current = undefined; currentKind = undefined; continue; }
        current = newMutable(id, configuredClass?.value ?? (id.value.includes('\\') ? id.value : undefined));
        raw.set(id.value, current); currentKind = 'service'; continue;
      }
      if (call.name === 'alias') {
        const id = identifier(call.args[0]); const target = identifier(call.args[1]); if (!id || !target) { current = undefined; currentKind = undefined; continue; }
        current = newMutable(id, undefined, target.value); raw.set(id.value, current); currentKind = 'service'; continue;
      }
      if (call.name === 'load') {
        const namespace = phpConfiguratorLiteral(call.args[0]); const resource = phpConfiguratorLiteral(call.args[1]);
        if (!namespace?.value.endsWith('\\') || !resource || resource.value.includes('%')) { current = undefined; currentKind = undefined; continue; }
        const fact: SymfonyServiceResourceFact = { namespacePrefix: namespace.value, resource: resource.value, exclude: [],
          public: defaults.public, autowire: defaults.autowire, autowireComplete: defaults.autowireComplete,
          bindings: [...defaults.bindings], configuredCalls: [], callsComplete: true, configuredProperties: [], propertiesComplete: true,
          eventListeners: [...defaults.eventListeners], uri, start: namespace.start, end: namespace.end };
        resources.push(fact); current = fact; currentKind = 'resource'; continue;
      }
      if (call.name === 'get') {
        const id = identifier(call.args[0]); current = id ? raw.get(id.value) : undefined; currentKind = current ? 'service' : undefined; continue;
      }
      if (call.name === 'remove') { const id = identifier(call.args[0]); if (id) raw.delete(id.value); current = undefined; currentKind = undefined; continue; }
      const target = currentKind === 'defaults' ? defaults : current;
      if (call.name === 'public' || call.name === 'private') {
        if (target) target.public = call.name === 'public'; continue;
      }
      if (call.name === 'autowire') {
        const value = booleanArgument(call, true); if (target && value !== undefined) target.autowire = value; else if (target) target.autowireComplete = false; continue;
      }
      if (call.name === 'bind') {
        const key = phpConfiguratorLiteral(call.args[0]); if (!target || !key) { if (target) target.autowireComplete = false; continue; }
        const match = /^(?:(\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*(?:[|&]\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)*)(?:\s+\$([A-Za-z_][A-Za-z0-9_]*))?|\$([A-Za-z_][A-Za-z0-9_]*))$/.exec(key.value.trim());
        if (!match) { target.autowireComplete = false; continue; }
        target.bindings.push({ type: match[1]?.replace(/(^|[|&])\\/g, '$1'), parameter: match[2] ?? match[3], serviceId: serviceReference(call.args[1]) }); continue;
      }
      if (call.name === 'arg') {
        const key = phpConfiguratorLiteral(call.args[0]); const parameterIndex = phpConfiguratorIndex(call.args[0])
          ?? (key && /^(?:0|[1-9]\d*)$/.test(key.value) && Number.isSafeInteger(Number(key.value)) ? Number(key.value) : undefined);
        const selector = key?.value.startsWith('$') && /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(key.value)
          ? { parameter: key.value.slice(1) } : parameterIndex !== undefined ? { parameterIndex } : undefined;
        if (!target || currentKind !== 'service' || call.args.length !== 2 || !selector) { if (target) target.autowireComplete = false; continue; }
        target.bindings = target.bindings.filter((binding) => !binding.explicitArgument
          || (selector.parameter !== undefined ? binding.parameter !== selector.parameter : binding.parameterIndex !== selector.parameterIndex));
        target.bindings.push({ ...selector, serviceId: serviceReference(call.args[1]), explicitArgument: true }); continue;
      }
      if (call.name === 'args') {
        if (!target || currentKind !== 'service' || call.args.length !== 1 || call.args[0]?.type !== 'array_creation_expression') { if (target) target.autowireComplete = false; continue; }
        target.bindings = target.bindings.filter((binding) => !binding.explicitArgument);
        let nextIndex = 0;
        for (const element of call.args[0]!.namedChildren) {
          if (element.type !== 'array_element_initializer' || ![1, 2].includes(element.namedChildren.length)) { target.autowireComplete = false; break; }
          const keyed = element.namedChildren.length === 2; const keyNode = keyed ? element.namedChildren[0] : undefined;
          const valueNode = element.namedChildren[keyed ? 1 : 0]; const key = phpConfiguratorLiteral(keyNode);
          const configuredIndex = phpConfiguratorIndex(keyNode) ?? (key && /^(?:0|[1-9]\d*)$/.test(key.value)
            && Number.isSafeInteger(Number(key.value)) ? Number(key.value) : undefined);
          let selector: Pick<SymfonyAutowireBinding, 'parameter' | 'parameterIndex'>;
          if (key?.value.startsWith('$') && /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(key.value)) selector = { parameter: key.value.slice(1) };
          else if (!keyed || configuredIndex !== undefined) {
            const parameterIndex = configuredIndex ?? nextIndex; selector = { parameterIndex }; nextIndex = Math.max(nextIndex, parameterIndex + 1);
          } else { target.autowireComplete = false; break; }
          target.bindings.push({ ...selector, serviceId: serviceReference(valueNode), explicitArgument: true });
        }
        continue;
      }
      if (call.name === 'call') {
        const configured = currentKind !== 'defaults' ? current : undefined; const method = phpConfiguratorLiteral(call.args[0]);
        if (configured && method && /^[A-Za-z_][A-Za-z0-9_]*$/.test(method.value)) configured.configuredCalls.push(method.value);
        else if (configured) configured.callsComplete = false; continue;
      }
      if (call.name === 'property') {
        const configured = currentKind !== 'defaults' ? current : undefined; const property = phpConfiguratorLiteral(call.args[0]);
        if (configured && property && /^[A-Za-z_][A-Za-z0-9_]*$/.test(property.value)) configured.configuredProperties.push(property.value);
        else if (configured) configured.propertiesComplete = false; continue;
      }
      if (call.name === 'exclude' && currentKind === 'resource' && current) {
        const resource = current as SymfonyServiceResourceFact;
        const value = phpConfiguratorLiteral(call.args[0]);
        const values = call.args[0]?.type === 'array_creation_expression' ? call.args[0].namedChildren.map((element) => phpConfiguratorLiteral(element.namedChildren.at(-1) ?? element)) : [];
        if (value) resource.exclude.push(value.value); else if (values.length && values.every(Boolean)) resource.exclude.push(...values.map((item) => item!.value));
        else resource.autowireComplete = false; continue;
      }
      if (call.name === 'tag') { const listener = listenerTag(call); if (target && listener) target.eventListeners.push(listener); continue; }
      if (call.name === 'class' && currentKind === 'service' && current) { const value = identifier(call.args[0]); (current as Mutable).className = value?.value; continue; }
      if (call.name === 'constructor' && currentKind === 'service' && current) { current.autowireComplete = false; continue; }
      if (['abstract', 'synthetic'].includes(call.name) && currentKind === 'service' && current) {
        const enabled = booleanArgument(call, true);
        if (enabled !== false) { raw.delete((current as Mutable).id); current = undefined; currentKind = undefined; }
        continue;
      }
      if (['factory', 'fromCallable', 'parent'].includes(call.name) && currentKind === 'service' && current) {
        raw.delete((current as Mutable).id); current = undefined; currentKind = undefined;
      }
    }
  }
  const resolveClass = (service: Mutable, visited = new Set<string>()): string | undefined => {
    if (service.className) return service.className;
    if (!service.alias || visited.has(service.alias)) return undefined;
    visited.add(service.alias); const target = raw.get(service.alias);
    return target ? resolveClass(target, visited) : service.alias.includes('\\') ? service.alias : undefined;
  };
  return { complete: true, resources, imports, services: [...raw.values()].flatMap((service): SymfonyServiceFact[] => {
    const className = resolveClass(service, new Set([service.id]));
    return className ? [{ ...service, className, origin: 'explicit', registrationUri: uri,
      registrationStart: service.start, registrationEnd: service.end }] : [];
  }) };
}

/** Parse only explicit Symfony YAML service entries; resource expansion and dynamic expressions remain unknown. */
export function analyzeSymfonyServiceYaml(uri: string, source: string): SymfonyServiceDocumentFacts {
  const document = parseDocument(source, { prettyErrors: false, uniqueKeys: true });
  const topLevel = isMap(document.contents) ? document.contents : undefined;
  const importsNode = topLevel ? mapValue(topLevel, 'imports') : undefined;
  const imports = isSeq(importsNode) ? importsNode.items.flatMap((item): SymfonyServiceImportFact[] => {
    if (!isMap(item)) return [];
    const resourceNode = mapValue(item, 'resource'); const resource = scalarValue(resourceNode);
    const range = resourceNode && scalarRange(resourceNode, source);
    return typeof resource === 'string' && !resource.includes('%') && range
      ? [{ resource, uri, start: range.start, end: range.end }] : [];
  }) : [];
  const services = serviceMap(document.contents);
  if (document.errors.length || !services) return { complete: document.errors.length === 0, services: [], resources: [], imports };
  const defaults = mapValue(services, '_defaults');
  const defaultPublic = isMap(defaults) && scalarValue(mapValue(defaults, 'public')) === true;
  const defaultAutowire = isMap(defaults) && scalarValue(mapValue(defaults, 'autowire')) === true;
  const defaultWiring = autowireBindings(isMap(defaults) ? mapValue(defaults, 'bind') : undefined);
  const defaultListeners = eventListenerTags(isMap(defaults) ? mapValue(defaults, 'tags') : undefined, uri, source);
  const raw = new Map<string, { id: string; className?: string; alias?: string; public: boolean; autowire: boolean; autowireComplete: boolean; bindings: SymfonyAutowireBinding[]; configuredCalls: string[]; callsComplete: boolean; configuredProperties: string[]; propertiesComplete: boolean; eventListeners: SymfonyEventListenerTagFact[]; uri: string; start: number; end: number }>();
  const resources: SymfonyServiceResourceFact[] = [];
  for (const pair of services.items as Pair[]) {
    const idValue = scalarValue(pair.key as Node); if (typeof idValue !== 'string' || idValue.startsWith('_')) continue;
    const range = isScalar(pair.key) ? pair.key.range : undefined; if (!range) continue;
    if (idValue.endsWith('\\') && isMap(pair.value)) {
      const resource = scalarValue(mapValue(pair.value, 'resource')); const configuredPublic = scalarValue(mapValue(pair.value, 'public'));
      const configuredAutowire = scalarValue(mapValue(pair.value, 'autowire'));
      const wiring = autowireBindings(mapValue(pair.value, 'bind'));
      const calls = configuredMethodCalls(mapValue(pair.value, 'calls'));
      const properties = configuredProperties(mapValue(pair.value, 'properties'));
      const listeners = eventListenerTags(mapValue(pair.value, 'tags'), uri, source);
      const excludeNode = mapValue(pair.value, 'exclude');
      const exclude = isScalar(excludeNode) && typeof excludeNode.value === 'string' ? [excludeNode.value]
        : isSeq(excludeNode) ? excludeNode.items.flatMap((item) => isScalar(item) && typeof item.value === 'string' ? [item.value] : []) : [];
      if (typeof resource === 'string' && !resource.includes('%')) resources.push({
        namespacePrefix: idValue, resource, exclude, public: typeof configuredPublic === 'boolean' ? configuredPublic : defaultPublic,
        autowire: typeof configuredAutowire === 'boolean' ? configuredAutowire : defaultAutowire,
        autowireComplete: defaultWiring.complete && wiring.complete,
        bindings: [...defaultWiring.bindings, ...wiring.bindings],
        configuredCalls: calls.methods, callsComplete: calls.complete,
        configuredProperties: properties.properties, propertiesComplete: properties.complete,
        eventListeners: [...defaultListeners, ...listeners],
        uri, start: range[0], end: range[1],
      });
      continue;
    }
    let className: string | undefined; let alias: string | undefined; let isPublic = defaultPublic; let autowire = defaultAutowire;
    let autowireComplete = defaultWiring.complete; let bindings = [...defaultWiring.bindings]; let configuredCalls: string[] = []; let callsComplete = true; let configuredPropertyNames: string[] = []; let propertiesComplete = true; let eventListeners = [...defaultListeners];
    if (pair.value === null || (isScalar(pair.value) && pair.value.value === null)) className = idValue.includes('\\') ? idValue : undefined;
    else if (isScalar(pair.value) && typeof pair.value.value === 'string') {
      const value = pair.value.value; if (value.startsWith('@')) alias = value.replace(/^@\??/, '');
    } else if (isMap(pair.value)) {
      const configuredClass = scalarValue(mapValue(pair.value, 'class')); const configuredAlias = scalarValue(mapValue(pair.value, 'alias'));
      const configuredPublic = scalarValue(mapValue(pair.value, 'public'));
      const configuredAutowire = scalarValue(mapValue(pair.value, 'autowire'));
      const wiring = autowireBindings(mapValue(pair.value, 'bind'));
      const argumentsWiring = autowireBindings(mapValue(pair.value, 'arguments'), true);
      const calls = configuredMethodCalls(mapValue(pair.value, 'calls'));
      const properties = configuredProperties(mapValue(pair.value, 'properties'));
      const listeners = eventListenerTags(mapValue(pair.value, 'tags'), uri, source);
      if (typeof configuredClass === 'string' && !configuredClass.includes('%')) className = configuredClass;
      else if (typeof configuredAlias !== 'string' && idValue.includes('\\') && !mapValue(pair.value, 'resource') && !mapValue(pair.value, 'factory')) className = idValue;
      if (typeof configuredAlias === 'string' && !configuredAlias.includes('%')) alias = configuredAlias.replace(/^@\??/, '');
      if (typeof configuredPublic === 'boolean') isPublic = configuredPublic;
      if (typeof configuredAutowire === 'boolean') autowire = configuredAutowire;
      autowireComplete &&= wiring.complete && argumentsWiring.complete;
      bindings = [...bindings, ...wiring.bindings, ...argumentsWiring.bindings];
      configuredCalls = calls.methods; callsComplete = calls.complete;
      configuredPropertyNames = properties.properties; propertiesComplete = properties.complete;
      eventListeners = [...eventListeners, ...listeners];
    }
    if (className || alias) raw.set(idValue, { id: idValue, className, alias, public: isPublic, autowire, autowireComplete, bindings, configuredCalls, callsComplete, configuredProperties: configuredPropertyNames, propertiesComplete, eventListeners, uri, start: range[0], end: range[1] });
  }
  const resolveClass = (service: { className?: string; alias?: string }, visited = new Set<string>()): string | undefined => {
    if (service.className) return service.className;
    if (!service.alias || visited.has(service.alias)) return undefined;
    visited.add(service.alias); const target = raw.get(service.alias);
    return target ? resolveClass(target, visited) : service.alias.includes('\\') ? service.alias.replace(/^\\/, '') : undefined;
  };
  return { complete: true, resources, imports, services: [...raw.values()].flatMap((service): SymfonyServiceFact[] => {
    const className = resolveClass(service, new Set([service.id]));
    return className ? [{ ...service, className, origin: 'explicit',
      registrationUri: service.uri, registrationStart: service.start, registrationEnd: service.end }] : [];
  }) };
}

function expandBraces(pattern: string): string[] {
  const match = pattern.match(/^(.*)\{([^{}]+)\}(.*)$/); if (!match) return [pattern];
  return match[2]!.split(',').flatMap((part) => expandBraces(`${match[1]}${part}${match[3]}`));
}

function resolvedPattern(uri: string, pattern: string): { prefix: string; exact: boolean } | undefined {
  if (pattern.includes('%') || /[*?[]/.test(pattern.replace(/[\\/]*\*$/, ''))) return undefined;
  try {
    const wildcard = /[\\/]*\*$/.test(pattern); const value = wildcard ? pattern.replace(/[\\/]*\*$/, '/') : pattern;
    const url = new URL(value, uri); return { prefix: decodeURIComponent(url.pathname).replace(/[\\/]+$/, ''), exact: !wildcard && /\.[A-Za-z0-9]+$/.test(value) };
  } catch { return undefined; }
}

function matchesPattern(candidateUri: string, configUri: string, pattern: string): boolean {
  try {
    const candidate = new URL(candidateUri); const config = new URL(configUri); if (candidate.protocol !== config.protocol || candidate.host !== config.host) return false;
    const resolved = resolvedPattern(configUri, pattern); if (!resolved) return false;
    const path = decodeURIComponent(candidate.pathname); return resolved.exact ? path === resolved.prefix : path === resolved.prefix || path.startsWith(`${resolved.prefix}/`);
  } catch { return false; }
}

/** Expand only deterministic directory, trailing-star and brace-exclude resources against already indexed PHP classes. */
export function expandSymfonyServiceResources(facts: SymfonyServiceDocumentFacts, candidates: SymfonyServiceClassCandidate[]): SymfonyServiceFact[] {
  const expanded = new Map<string, SymfonyServiceFact>();
  for (const resource of facts.resources) {
    const excludes = resource.exclude.flatMap(expandBraces);
    for (const candidate of candidates) {
      if (candidate.kind !== 'class' || candidate.abstract || !candidate.fqcn.startsWith(resource.namespacePrefix)
        || !matchesPattern(candidate.uri, resource.uri, resource.resource)
        || excludes.some((pattern) => matchesPattern(candidate.uri, resource.uri, pattern))) continue;
      expanded.set(candidate.fqcn, { id: candidate.fqcn, className: candidate.fqcn, public: resource.public, autowire: resource.autowire, autowireComplete: resource.autowireComplete, bindings: resource.bindings, configuredCalls: resource.configuredCalls, callsComplete: resource.callsComplete, configuredProperties: resource.configuredProperties, propertiesComplete: resource.propertiesComplete, eventListeners: resource.eventListeners, origin: 'resource', uri: candidate.uri, start: candidate.start, end: candidate.end,
        registrationUri: resource.uri, registrationStart: resource.start, registrationEnd: resource.end });
    }
  }
  for (const service of facts.services) expanded.set(service.id, service);
  return [...expanded.values()];
}

/** Resolve only source-proven Symfony constructor autowiring targets. */
export function resolveSymfonyAutowireTarget(
  services: SymfonyServiceFact[],
  consumerFqcn: string,
  dependencyFqcn: string,
  isSubtype: (candidateFqcn: string, targetFqcn: string) => boolean,
  parameterName?: string,
  targetName?: string,
  requiredMethodName?: string,
  requiredPropertyName?: string,
  parameterIndex?: number,
): SymfonyAutowireResolution | undefined {
  return resolveSymfonyAutowireTypes(services, consumerFqcn, [dependencyFqcn], undefined, isSubtype, parameterName, targetName, requiredMethodName, requiredPropertyName, undefined, parameterIndex);
}

/** Resolve named, flat union/intersection and canonical DNF types using Symfony's combined-alias rules. */
export function resolveSymfonyAutowireTypes(
  services: SymfonyServiceFact[],
  consumerFqcn: string,
  dependencyFqcns: string[],
  operator: 'union' | 'intersection' | 'dnf' | undefined,
  isSubtype: (candidateFqcn: string, targetFqcn: string) => boolean,
  parameterName?: string,
  targetName?: string,
  requiredMethodName?: string,
  requiredPropertyName?: string,
  typeGroups?: string[][],
  parameterIndex?: number,
): SymfonyAutowireResolution | undefined {
  const key = (value: string): string => value.replace(/^\\/, '').toLowerCase();
  if (!dependencyFqcns.length || (!operator && dependencyFqcns.length !== 1)) return undefined;
  const members = [...dependencyFqcns].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const groups = typeGroups?.map((group) => [...group].sort((left, right) => left < right ? -1 : left > right ? 1 : 0));
  if (operator === 'dnf' && (!groups?.length || groups.every((group) => group.length === 1))) return undefined;
  const dependencyType = operator === 'dnf'
    ? groups!.map((group) => group.length > 1 ? `(${group.join('&')})` : group[0]!).sort((left, right) => left < right ? -1 : left > right ? 1 : 0).join('|')
    : members.join(operator === 'union' ? '|' : operator === 'intersection' ? '&' : '');
  const explicitArgumentForParameter = (service: SymfonyServiceFact): boolean => service.bindings.some((binding) => binding.explicitArgument
    && (!binding.parameter || binding.parameter === parameterName)
    && (binding.parameterIndex === undefined || binding.parameterIndex === parameterIndex));
  const directConsumers = services.filter((service) => !service.alias && key(service.className) === key(consumerFqcn) && service.autowireComplete
    && (service.autowire || explicitArgumentForParameter(service)));
  const consumers = directConsumers.length || (!requiredMethodName && !requiredPropertyName) ? directConsumers : services.filter((service) =>
    !service.alias && service.autowire && service.autowireComplete && isSubtype(service.className, consumerFqcn));
  if (!consumers.length) return undefined;
  if (requiredMethodName && consumers.some((service) => !service.callsComplete || service.configuredCalls.some((method) => key(method) === key(requiredMethodName)))) return undefined;
  if (requiredPropertyName && consumers.some((service) => !service.propertiesComplete || service.configuredProperties.some((property) => key(property) === key(requiredPropertyName)))) return undefined;
  const serviceById = (id: string): SymfonyServiceFact | undefined => {
    const matches = services.filter((service) => key(service.id) === key(id)); return matches.length === 1 ? matches[0] : undefined;
  };
  const compatible = (className: string): boolean => operator === 'dnf'
    ? groups!.some((group) => group.every((member) => isSubtype(className, member)))
    : operator === 'intersection' ? members.every((member) => isSubtype(className, member)) : members.some((member) => isSubtype(className, member));
  const resolution = (service: SymfonyServiceFact, kind: SymfonyAutowireResolution['kind']): SymfonyAutowireResolution | undefined => compatible(service.className)
    ? { serviceId: service.id, className: service.className, uri: service.uri, start: service.start, end: service.end, kind, inferredAlias: kind === 'inferred' }
    : undefined;
  const ultimateId = (service: SymfonyServiceFact, visited = new Set<string>()): string | undefined => {
    if (!service.alias) return key(service.id);
    const aliasKey = key(service.alias); if (visited.has(aliasKey)) return undefined;
    visited.add(aliasKey); const target = serviceById(service.alias);
    return target ? ultimateId(target, visited) : aliasKey;
  };
  const sharedMemberAlias = (suffix = ''): SymfonyServiceFact | undefined => {
    const aliases = members.map((member) => serviceById(`${member}${suffix}`));
    if (aliases.some((service) => !service)) return undefined;
    const ids = new Set(aliases.map((service) => ultimateId(service!)));
    return ids.size === 1 ? aliases[0] : undefined;
  };
  const matchingBindings = consumers.flatMap((service) => {
    const matches = service.bindings.filter((binding) => (!binding.type || key(binding.type) === key(dependencyType))
      && (!binding.parameter || binding.parameter === parameterName)
      && (binding.parameterIndex === undefined || binding.parameterIndex === parameterIndex))
      .map((binding) => ({ binding, specificity: Number(Boolean(binding.explicitArgument)) * 4
        + Number(Boolean(binding.type)) + Number(Boolean(binding.parameter)) + Number(binding.parameterIndex !== undefined) }));
    if (!matches.length) return [];
    const specificity = Math.max(...matches.map((item) => item.specificity));
    return [matches.filter((item) => item.specificity === specificity).at(-1)!];
  });
  if (matchingBindings.length) {
    const specificity = Math.max(...matchingBindings.map((item) => item.specificity));
    const selected = matchingBindings.filter((item) => item.specificity === specificity).map((item) => item.binding);
    const ids = [...new Set(selected.map((binding) => binding.serviceId))];
    if (ids.length !== 1 || !ids[0]) return undefined;
    const service = serviceById(ids[0]); return service ? resolution(service, 'binding') : undefined;
  }
  const normalizedTarget = targetName?.replace(/[._\-\s]+([A-Za-z0-9])/g, (_, character: string) => character.toUpperCase());
  if (normalizedTarget) {
    const named = serviceById(`${dependencyType} $${normalizedTarget}`) ?? (operator && operator !== 'dnf' ? sharedMemberAlias(` $${normalizedTarget}`) : undefined);
    return named ? resolution(named, 'named-alias') : undefined;
  }
  if (parameterName) {
    const named = serviceById(`${dependencyType} $${parameterName}`) ?? (operator && operator !== 'dnf' ? sharedMemberAlias(` $${parameterName}`) : undefined);
    if (named) return resolution(named, 'named-alias');
  }
  const exact = serviceById(dependencyType) ?? (operator && operator !== 'dnf' ? sharedMemberAlias() : undefined);
  if (exact) return resolution(exact, 'exact');
  if (operator === 'dnf') return undefined;
  const memberTargets = members.map((member): { service: SymfonyServiceFact; inferred: boolean } | undefined => {
    const explicit = serviceById(member); if (explicit) return { service: explicit, inferred: false };
    const candidates = [...new Map(services.filter((service) => service.origin === 'resource' && isSubtype(service.className, member))
      .map((service) => [key(service.className), service])).values()];
    return candidates.length === 1 ? { service: candidates[0]!, inferred: true } : undefined;
  });
  if (memberTargets.some((target) => !target)) return undefined;
  const inferredIds = new Set(memberTargets.map((target) => ultimateId(target!.service)));
  if (inferredIds.size !== 1) return undefined;
  const service = memberTargets[0]!.service;
  if (!compatible(service.className)) return undefined;
  const kind = memberTargets.every((target) => target!.inferred) ? 'inferred' : 'exact';
  return { serviceId: service.id, className: service.className, uri: service.uri, start: service.start, end: service.end, kind, inferredAlias: kind === 'inferred' };
}

/** Convert public services to conservative facts for PSR/Symfony container get() calls. */
export function symfonyContainerMethodReturnFacts(services: SymfonyServiceFact[]): SymfonyLiteralMethodReturnFact[] {
  const owners = ['Psr\\Container\\ContainerInterface', 'Symfony\\Component\\DependencyInjection\\ContainerInterface'];
  return services.filter((service) => service.public).flatMap((service) => owners.map((ownerFqcn) => ({
    ownerFqcn, name: 'get', argument: service.id, returnType: service.className,
    uri: service.uri, start: service.start, end: service.end,
  })));
}

export { analyzeSymfonyKernelRouteImports, analyzeSymfonyRoutePhp, analyzeSymfonyRouteYaml, symfonyRouteCallAt, symfonyRouteParameterCallAt, symfonyRouteNameText, type SymfonyLocalizedPath, type SymfonyRoutePathPrefix, type SymfonyRouteControllerFact, type SymfonyRouteFact, type SymfonyRouteImport, type SymfonyRouteDocument, type SymfonyRouteCall, type SymfonyRouteParameterCall } from './routes.js';
export { analyzeSymfonyRouteAttributes, type SymfonyAttributeRouteFact, type SymfonyAttributeRoutes } from './routes.js';

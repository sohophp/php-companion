import type { ControllerTemplateContext, ControllerContextVariable, SerializedPhpType } from '@php-companion/interop';
import type { PhpSyntaxParser, ParsedImport } from '@php-companion/parser';
import type { ExternalLiteralMethodReturnFact } from '@php-companion/semantic-provider';
import { XMLParser } from 'fast-xml-parser';
import { isMap, isScalar, isSeq, parseDocument, type Node, type Pair, type YAMLMap } from 'yaml';

interface NodeLike { type: string; text: string; startIndex: number; endIndex: number; namedChildren: NodeLike[]; childForFieldName(name: string): NodeLike | null; }
export interface SymfonyControllerDocument { uri: string; source: string; snapshotVersion: string; }
export interface SymfonyAutowireBinding { type?: string; parameter?: string; serviceId?: string; }
export interface SymfonyEventListenerTagFact { event: string; method: string; priority: number; uri: string; eventStart: number; eventEnd: number; methodStart: number; methodEnd: number; }
export interface SymfonyServiceFact { id: string; className: string; alias?: string; public: boolean; autowire: boolean; autowireComplete: boolean; bindings: SymfonyAutowireBinding[]; configuredCalls: string[]; callsComplete: boolean; configuredProperties: string[]; propertiesComplete: boolean; eventListeners: SymfonyEventListenerTagFact[]; origin: 'explicit' | 'resource' | 'compiled'; uri: string; start: number; end: number; registrationUri: string; registrationStart: number; registrationEnd: number; }
export interface SymfonyServiceResourceFact { namespacePrefix: string; resource: string; exclude: string[]; public: boolean; autowire: boolean; autowireComplete: boolean; bindings: SymfonyAutowireBinding[]; configuredCalls: string[]; callsComplete: boolean; configuredProperties: string[]; propertiesComplete: boolean; eventListeners: SymfonyEventListenerTagFact[]; uri: string; start: number; end: number; }
export interface SymfonyServiceClassCandidate { fqcn: string; kind: 'class' | 'interface' | 'trait' | 'enum'; abstract: boolean; uri: string; start: number; end: number; }
export interface SymfonyServiceDocumentFacts { complete: boolean; services: SymfonyServiceFact[]; resources: SymfonyServiceResourceFact[]; }
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
  const tags = [...source.matchAll(/<service(?=\s)[^>]*>/g)].filter((tag) => /\bid\s*=/.test(tag[0]));
  if (nodes.length !== tags.length) return { complete: false, services: [], methodArguments: [], propertyArguments: [] };
  const raw = nodes.map((node, index) => {
    const id = typeof node.id === 'string' ? node.id : undefined; const tag = tags[index]!;
    const idMatch = /\bid\s*=\s*(['"])(.*?)\1/s.exec(tag[0]);
    if (!id || !idMatch || tag.index === undefined) return undefined;
    const valueOffset = idMatch.index + idMatch[0].indexOf(idMatch[2]!);
    return { node, id, className: typeof node.class === 'string' ? node.class.replace(/^\\/, '') : undefined,
      alias: typeof node.alias === 'string' ? node.alias.replace(/^\\/, '') : undefined,
      public: node.public === 'true', abstract: node.abstract === 'true', start: tag.index + valueOffset, end: tag.index + valueOffset + idMatch[2]!.length };
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
      bindings: [], configuredCalls: [], callsComplete: false, configuredProperties: [], propertiesComplete: false, eventListeners: [],
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

/** Extract only complete, literal EventSubscriberInterface maps whose listener methods are public instance methods on the subscriber. */
export function analyzeSymfonyEventSubscriptions(parser: PhpSyntaxParser, uri: string, source: string): SymfonyEventSubscriptionFact[] {
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
      if (declaration.implementsNames.some((name) => resolveName(name, namespace, parsed.imports).toLowerCase()
        === 'symfony\\component\\eventdispatcher\\eventsubscriberinterface')) {
        const subscriptionMethod = methods.find((callable) => callable.name.toLowerCase() === 'getsubscribedevents'
          && callable.static && callable.visibility === 'public');
        const methodNode = subscriptionMethod ? visit(classNode, (node) => node.type === 'method_declaration'
          && node.startIndex === subscriptionMethod.declarationStart && node.endIndex === subscriptionMethod.declarationEnd) : undefined;
        const body = methodNode?.namedChildren.find((child) => child.type === 'compound_statement');
        const returned = body?.namedChildren.length === 1 && body.namedChildren[0]!.type === 'return_statement'
          ? body.namedChildren[0]!.namedChildren[0] : undefined;
        if (returned?.type === 'array_creation_expression') for (const item of returned.namedChildren) {
          if (item.type !== 'array_element_initializer' || item.namedChildren.length !== 2) continue;
          const [eventNode, listenersNode] = item.namedChildren; const listeners = listenerSpecs(listenersNode!);
          const eventLiteral = literalTextRange(eventNode!);
          const staticIdentity = classConstantIdentity(eventNode!, namespace, parsed.imports, declaration.fqcn);
          const staticEvent = staticIdentity ? { value: staticIdentity, start: eventNode!.startIndex, end: eventNode!.endIndex } : undefined;
          const event = eventLiteral ?? staticEvent; if (!event || !listeners.length) continue;
          for (const listener of listeners) if (publicListeners.has(listener.listener.toLowerCase())) subscriptions.push({
            subscriberFqcn: declaration.fqcn, event: event.value, listener: listener.listener, priority: listener.priority,
            uri, eventStart: event.start, eventEnd: event.end, listenerStart: listener.start, listenerEnd: listener.end,
          });
        }
      }
      const methodNodes = classNode.namedChildren.find((child) => child.type === 'declaration_list')?.namedChildren
        .filter((child) => child.type === 'method_declaration') ?? [];
      const inferredEvents = (method: (typeof methods)[number]): string[] => {
        const native = method.parameters[0]?.nativeType?.replace(/^\?/, ''); if (!native || native.includes('&')) return [];
        return [...new Set(native.split('|').map((name) => name.trim()).filter((name) => name && name.toLowerCase() !== 'null')
          .flatMap((name) => primitiveNames.has(name.toLowerCase()) ? [] : [resolveName(name, namespace, parsed.imports)]))]
          .filter((name) => name.toLowerCase() !== 'symfony\\contracts\\eventdispatcher\\event');
      };
      const addAttribute = (attribute: NodeLike, listener: (typeof methods)[number]): void => {
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
        let listener = configured.value ? methods.find((method) => method.name === configured.value) : undefined;
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
          } else listener = methods.find((method) => method.name === '__invoke');
        }
        if (listener) addAttribute(attribute, listener);
      }
    }
    return subscriptions;
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
        const eventNode = expression(eventArgument); if (eventNode?.type !== 'object_creation_expression') return [];
        const name = eventNode.namedChildren.find((child) => ['name', 'qualified_name'].includes(child.type))?.text;
        if (!name || ['self', 'static', 'parent'].includes(name.toLowerCase())) return [];
        event = { event: resolveName(name, namespace, parsed.imports), start: eventNode.startIndex, end: eventNode.endIndex };
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

function autowireBindings(node: Node | null | undefined): { complete: boolean; bindings: SymfonyAutowireBinding[] } {
  if (node === undefined) return { complete: true, bindings: [] };
  if (!isMap(node)) return { complete: false, bindings: [] };
  const bindings: SymfonyAutowireBinding[] = [];
  for (const pair of node.items as Pair[]) {
    const key = scalarValue(pair.key as Node); if (typeof key !== 'string') return { complete: false, bindings: [] };
    const match = /^(?:(\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*(?:[|&]\\?[A-Za-z_\x80-\xff][A-Za-z0-9_\\\x80-\xff]*)*)(?:\s+\$([A-Za-z_][A-Za-z0-9_]*))?|\$([A-Za-z_][A-Za-z0-9_]*))$/.exec(key.trim());
    if (!match) return { complete: false, bindings: [] };
    const value = scalarValue(pair.value as Node); const serviceId = typeof value === 'string' && /^@\??[^@]/.test(value) ? value.replace(/^@\??/, '') : undefined;
    bindings.push({ type: match[1]?.replace(/(^|[|&])\\/g, '$1'), parameter: match[2] ?? match[3], serviceId });
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

/** Parse only explicit Symfony YAML service entries; resource expansion and dynamic expressions remain unknown. */
export function analyzeSymfonyServiceYaml(uri: string, source: string): SymfonyServiceDocumentFacts {
  const document = parseDocument(source, { prettyErrors: false, uniqueKeys: true });
  const services = serviceMap(document.contents);
  if (document.errors.length || !services) return { complete: document.errors.length === 0, services: [], resources: [] };
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
      const argumentsWiring = autowireBindings(mapValue(pair.value, 'arguments'));
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
  return { complete: true, resources, services: [...raw.values()].flatMap((service): SymfonyServiceFact[] => {
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
): SymfonyAutowireResolution | undefined {
  return resolveSymfonyAutowireTypes(services, consumerFqcn, [dependencyFqcn], undefined, isSubtype, parameterName, targetName, requiredMethodName, requiredPropertyName);
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
): SymfonyAutowireResolution | undefined {
  const key = (value: string): string => value.replace(/^\\/, '').toLowerCase();
  if (!dependencyFqcns.length || (!operator && dependencyFqcns.length !== 1)) return undefined;
  const members = [...dependencyFqcns].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const groups = typeGroups?.map((group) => [...group].sort((left, right) => left < right ? -1 : left > right ? 1 : 0));
  if (operator === 'dnf' && (!groups?.length || groups.every((group) => group.length === 1))) return undefined;
  const dependencyType = operator === 'dnf'
    ? groups!.map((group) => group.length > 1 ? `(${group.join('&')})` : group[0]!).sort((left, right) => left < right ? -1 : left > right ? 1 : 0).join('|')
    : members.join(operator === 'union' ? '|' : operator === 'intersection' ? '&' : '');
  const directConsumers = services.filter((service) => !service.alias && key(service.className) === key(consumerFqcn) && service.autowire && service.autowireComplete);
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
  const normalizedTarget = targetName?.replace(/[._\-\s]+([A-Za-z0-9])/g, (_, character: string) => character.toUpperCase());
  if (normalizedTarget) {
    const named = serviceById(`${dependencyType} $${normalizedTarget}`) ?? (operator && operator !== 'dnf' ? sharedMemberAlias(` $${normalizedTarget}`) : undefined);
    return named ? resolution(named, 'named-alias') : undefined;
  }
  const matchingBindings = consumers.flatMap((service) => service.bindings.filter((binding) =>
    (!binding.type || key(binding.type) === key(dependencyType)) && (!binding.parameter || binding.parameter === parameterName))
    .map((binding) => ({ binding, specificity: Number(Boolean(binding.type)) + Number(Boolean(binding.parameter)) })));
  if (matchingBindings.length) {
    const specificity = Math.max(...matchingBindings.map((item) => item.specificity));
    const selected = matchingBindings.filter((item) => item.specificity === specificity).map((item) => item.binding);
    const ids = [...new Set(selected.map((binding) => binding.serviceId))];
    if (ids.length !== 1 || !ids[0]) return undefined;
    const service = serviceById(ids[0]); return service ? resolution(service, 'binding') : undefined;
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

export { analyzeSymfonyRouteYaml, symfonyRouteCallAt, symfonyRouteNameText, type SymfonyRouteFact, type SymfonyRouteImport, type SymfonyRouteDocument, type SymfonyRouteCall } from './routes.js';
export { analyzeSymfonyRouteAttributes, type SymfonyAttributeRouteFact, type SymfonyAttributeRoutes } from './routes.js';

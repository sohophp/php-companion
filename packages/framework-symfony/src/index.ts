import type { ControllerTemplateContext, ControllerContextVariable, SerializedPhpType } from '@php-companion/interop';
import type { PhpSyntaxParser, ParsedImport } from '@php-companion/parser';
import type { ExternalLiteralMethodReturnFact } from '@php-companion/semantic-provider';
import { XMLParser } from 'fast-xml-parser';
import { isMap, isScalar, isSeq, parseDocument, type Node, type Pair, type YAMLMap } from 'yaml';

interface NodeLike { type: string; text: string; startIndex: number; endIndex: number; namedChildren: NodeLike[]; childForFieldName(name: string): NodeLike | null; }
export interface SymfonyControllerDocument { uri: string; source: string; snapshotVersion: string; }
export interface SymfonyAutowireBinding { type?: string; parameter?: string; serviceId?: string; }
export interface SymfonyServiceFact { id: string; className: string; alias?: string; public: boolean; autowire: boolean; autowireComplete: boolean; bindings: SymfonyAutowireBinding[]; configuredCalls: string[]; callsComplete: boolean; configuredProperties: string[]; propertiesComplete: boolean; origin: 'explicit' | 'resource' | 'compiled'; uri: string; start: number; end: number; }
export interface SymfonyServiceResourceFact { namespacePrefix: string; resource: string; exclude: string[]; public: boolean; autowire: boolean; autowireComplete: boolean; bindings: SymfonyAutowireBinding[]; configuredCalls: string[]; callsComplete: boolean; configuredProperties: string[]; propertiesComplete: boolean; uri: string; start: number; end: number; }
export interface SymfonyServiceClassCandidate { fqcn: string; kind: 'class' | 'interface' | 'trait' | 'enum'; abstract: boolean; uri: string; start: number; end: number; }
export interface SymfonyServiceDocumentFacts { complete: boolean; services: SymfonyServiceFact[]; resources: SymfonyServiceResourceFact[]; }
export type SymfonyLiteralMethodReturnFact = ExternalLiteralMethodReturnFact;
export interface SymfonyServiceIdReference { value: string; start: number; end: number; }
export interface SymfonyAutowireResolution { serviceId: string; className: string; uri: string; start: number; end: number; kind: 'exact' | 'named-alias' | 'binding' | 'inferred' | 'compiled'; inferredAlias: boolean; }
export interface SymfonyCompiledMethodArgumentFact { callableFqcn: string; parameter?: string; parameterIndex?: number; serviceId: string; className: string; uri: string; start: number; end: number; }
export interface SymfonyCompiledPropertyArgumentFact { ownerFqcn: string; property: string; serviceId: string; className: string; uri: string; start: number; end: number; }
export interface SymfonyCompiledContainerFacts { complete: boolean; services: SymfonyServiceFact[]; methodArguments: SymfonyCompiledMethodArgumentFact[]; propertyArguments: SymfonyCompiledPropertyArgumentFact[]; }

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
      bindings: [], configuredCalls: [], callsComplete: false, configuredProperties: [], propertiesComplete: false,
      origin: 'compiled', uri, start: item.start, end: item.end }] : [];
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
  const [head, ...tail] = name.split('\\');
  const imported = imports.find((item) => item.kind === 'class' && item.alias.toLowerCase() === head!.toLowerCase());
  return imported ? [imported.fqcn, ...tail].join('\\') : [namespace, name].filter(Boolean).join('\\');
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

/** Parse only explicit Symfony YAML service entries; resource expansion and dynamic expressions remain unknown. */
export function analyzeSymfonyServiceYaml(uri: string, source: string): SymfonyServiceDocumentFacts {
  const document = parseDocument(source, { prettyErrors: false, uniqueKeys: true });
  const services = serviceMap(document.contents);
  if (document.errors.length || !services) return { complete: document.errors.length === 0, services: [], resources: [] };
  const defaults = mapValue(services, '_defaults');
  const defaultPublic = isMap(defaults) && scalarValue(mapValue(defaults, 'public')) === true;
  const defaultAutowire = isMap(defaults) && scalarValue(mapValue(defaults, 'autowire')) === true;
  const defaultWiring = autowireBindings(isMap(defaults) ? mapValue(defaults, 'bind') : undefined);
  const raw = new Map<string, { id: string; className?: string; alias?: string; public: boolean; autowire: boolean; autowireComplete: boolean; bindings: SymfonyAutowireBinding[]; configuredCalls: string[]; callsComplete: boolean; configuredProperties: string[]; propertiesComplete: boolean; uri: string; start: number; end: number }>();
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
        uri, start: range[0], end: range[1],
      });
      continue;
    }
    let className: string | undefined; let alias: string | undefined; let isPublic = defaultPublic; let autowire = defaultAutowire;
    let autowireComplete = defaultWiring.complete; let bindings = [...defaultWiring.bindings]; let configuredCalls: string[] = []; let callsComplete = true; let configuredPropertyNames: string[] = []; let propertiesComplete = true;
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
      if (typeof configuredClass === 'string' && !configuredClass.includes('%')) className = configuredClass;
      else if (typeof configuredAlias !== 'string' && idValue.includes('\\') && !mapValue(pair.value, 'resource') && !mapValue(pair.value, 'factory')) className = idValue;
      if (typeof configuredAlias === 'string' && !configuredAlias.includes('%')) alias = configuredAlias.replace(/^@\??/, '');
      if (typeof configuredPublic === 'boolean') isPublic = configuredPublic;
      if (typeof configuredAutowire === 'boolean') autowire = configuredAutowire;
      autowireComplete &&= wiring.complete && argumentsWiring.complete;
      bindings = [...bindings, ...wiring.bindings, ...argumentsWiring.bindings];
      configuredCalls = calls.methods; callsComplete = calls.complete;
      configuredPropertyNames = properties.properties; propertiesComplete = properties.complete;
    }
    if (className || alias) raw.set(idValue, { id: idValue, className, alias, public: isPublic, autowire, autowireComplete, bindings, configuredCalls, callsComplete, configuredProperties: configuredPropertyNames, propertiesComplete, uri, start: range[0], end: range[1] });
  }
  const resolveClass = (service: { className?: string; alias?: string }, visited = new Set<string>()): string | undefined => {
    if (service.className) return service.className;
    if (!service.alias || visited.has(service.alias)) return undefined;
    visited.add(service.alias); const target = raw.get(service.alias);
    return target ? resolveClass(target, visited) : service.alias.includes('\\') ? service.alias.replace(/^\\/, '') : undefined;
  };
  return { complete: true, resources, services: [...raw.values()].flatMap((service): SymfonyServiceFact[] => {
    const className = resolveClass(service, new Set([service.id]));
    return className ? [{ ...service, className, origin: 'explicit' }] : [];
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
      expanded.set(candidate.fqcn, { id: candidate.fqcn, className: candidate.fqcn, public: resource.public, autowire: resource.autowire, autowireComplete: resource.autowireComplete, bindings: resource.bindings, configuredCalls: resource.configuredCalls, callsComplete: resource.callsComplete, configuredProperties: resource.configuredProperties, propertiesComplete: resource.propertiesComplete, origin: 'resource', uri: candidate.uri, start: candidate.start, end: candidate.end });
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

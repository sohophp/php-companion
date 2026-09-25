import { isMap, isScalar, isSeq, parseDocument, type Scalar, type YAMLMap } from 'yaml';
import type { ParsedImport, PhpSyntaxParser } from '@php-companion/parser';

export interface SymfonyLocalizedPath { locale: string; path: string; }
export type SymfonyRoutePathPrefix = string | SymfonyLocalizedPath[];
export interface SymfonyRouteControllerFact { className: string; classSourceName?: string; method?: string; uri: string; classStart: number; classEnd: number; methodStart?: number; methodEnd?: number; }
export interface SymfonyRouteFact { name: string; path: string; uri: string; start: number; end: number; locale?: string; controller?: SymfonyRouteControllerFact; }
export interface SymfonyRouteImport { resource: string; namePrefix: string; pathPrefix: SymfonyRoutePathPrefix; attribute?: boolean; php?: boolean; namespace?: string; exclude?: string[]; environments?: string[]; }
export interface SymfonyRouteDocument { complete: boolean; routes: SymfonyRouteFact[]; imports: SymfonyRouteImport[]; }

function resolvePhpName(name: string, namespace: string, imports: ParsedImport[]): string {
  if (name.startsWith('\\')) return name.slice(1);
  if (name.toLowerCase().startsWith('namespace\\')) return [namespace, name.slice(10)].filter(Boolean).join('\\');
  const [head, ...tail] = name.split('\\');
  const imported = imports.find((item) => item.kind === 'class' && item.namespace === namespace && item.alias.toLowerCase() === head!.toLowerCase());
  return imported ? [imported.fqcn, ...tail].join('\\') : [namespace, name].filter(Boolean).join('\\');
}

function phpString(node: SyntaxNode | undefined): { value: string; start: number; end: number } | undefined {
  if (node?.type !== 'string' || node.text.length < 2) return undefined;
  const quote = node.text[0]; if ((quote !== "'" && quote !== '"') || node.text.at(-1) !== quote) return undefined;
  const raw = node.text.slice(1, -1);
  if (quote === '"' && /\$|\\(?:x[0-9a-fA-F]|u\{|[0-7])/u.test(raw)) return undefined;
  const value = quote === "'" ? raw.replace(/\\(['\\])/g, '$1')
    : raw.replace(/\\([\\"$nrtvef])/g, (_match, escaped: string) => ({ n: '\n', r: '\r', t: '\t', v: '\v', e: '\x1b', f: '\f' }[escaped] ?? escaped));
  return { value, start: node.startIndex + 1, end: node.endIndex - 1 };
}

function supportedRoutePattern(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 512 && !/[%\r\n\0]/.test(value)
    && !/\{[^}]*\.\./.test(value) && !/[?*+@!]\(/.test(value)
    && (value.match(/\{/g)?.length ?? 0) <= 2 && (value.match(/,/g)?.length ?? 0) <= 16;
}

function localizedYamlPaths(value: unknown): SymfonyLocalizedPath[] | undefined {
  if (!isMap(value)) return undefined;
  const paths: SymfonyLocalizedPath[] = [];
  for (const pair of value.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== 'string' || !isScalar(pair.value) || typeof pair.value.value !== 'string') return undefined;
    paths.push({ locale: pair.key.value, path: pair.value.value });
  }
  return paths;
}

function yamlScalarValueRange(source: string, scalar: Scalar): { start: number; end: number } | undefined {
  if (!scalar.range || typeof scalar.value !== 'string') return undefined;
  let start = scalar.range[0]; let end = scalar.range[1]; const raw = source.slice(start, end);
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) { start += 1; end -= 1; }
  return source.slice(start, end) === scalar.value ? { start, end } : undefined;
}

function yamlMapNode(map: YAMLMap, key: string): unknown {
  return map.items.find((item) => isScalar(item.key) && item.key.value === key)?.value;
}

function yamlRouteController(source: string, uri: string, map: YAMLMap): SymfonyRouteControllerFact | undefined {
  const direct = yamlMapNode(map, 'controller'); const defaults = yamlMapNode(map, 'defaults');
  const nested = isMap(defaults) ? yamlMapNode(defaults, '_controller') : undefined; const selected = direct ?? nested;
  if ((direct !== undefined && nested !== undefined) || !isScalar(selected) || typeof selected.value !== 'string') return undefined;
  const scalar = selected; const range = yamlScalarValueRange(source, scalar); if (!range) return undefined;
  const value = scalar.value as string; const normalized = value.startsWith('\\') ? value.slice(1) : value;
  const parts = normalized.split('::'); if (parts.length > 2) return undefined;
  const className = parts[0]!; const method = parts[1];
  const identifier = '[A-Za-z_\\u0080-\\uffff][A-Za-z0-9_\\u0080-\\uffff]*';
  if (!new RegExp(`^${identifier}(?:\\\\${identifier})+$`, 'u').test(className)
    || (method !== undefined && !new RegExp(`^${identifier}$`, 'u').test(method))) return undefined;
  const leading = value.startsWith('\\') ? 1 : 0; const classStart = range.start + leading;
  return { className, uri, classStart, classEnd: classStart + className.length,
    ...(method === undefined ? {} : { method, methodStart: range.end - method.length, methodEnd: range.end }) };
}

/** Locate only a literal route controller segment under the cursor; YAML language services keep syntax/schema ownership. */
export function symfonyYamlRouteControllerAt(uri: string, source: string, offset: number): SymfonyRouteControllerFact | undefined {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > source.length) return undefined;
  const document = parseDocument(source, { uniqueKeys: true, prettyErrors: false });
  if (document.errors.length || !document.contents) return undefined;
  const pending: unknown[] = [document.contents]; let visited = 0;
  while (pending.length) {
    const node = pending.pop(); if (++visited > 10_000) return undefined;
    if (isMap(node)) {
      if (yamlMapNode(node, 'path') !== undefined) {
        const controller = yamlRouteController(source, uri, node);
        if (controller && (offset >= controller.classStart && offset < controller.classEnd
          || controller.methodStart !== undefined && controller.methodEnd !== undefined
            && offset >= controller.methodStart && offset < controller.methodEnd)) return controller;
      }
      for (const item of node.items) if (item.value) pending.push(item.value);
    } else if (isSeq(node)) {
      for (const item of node.items) if (item) pending.push(item);
    }
  }
  return undefined;
}

/** Source declarations only: completeness never implies an effective runtime route table. */
export function analyzeSymfonyRouteYaml(uri: string, source: string, environment?: string): SymfonyRouteDocument {
  const document = parseDocument(source, { uniqueKeys: true, prettyErrors: false });
  const result: SymfonyRouteDocument = { complete: true, routes: [], imports: [] };
  if (document.errors.length || !isMap(document.contents)) return { ...result, complete: false };
  const entries = document.contents.items.flatMap((pair) => {
    if (!isScalar(pair.key) || typeof pair.key.value !== 'string' || !pair.key.value.startsWith('when@')) return [pair];
    if (!environment || pair.key.value !== `when@${environment}`) return [];
    if (!isMap(pair.value)) { result.complete = false; return []; }
    return pair.value.items;
  });
  for (const pair of entries) {
    if (!isScalar(pair.key) || typeof pair.key.value !== 'string' || !isMap(pair.value)) { result.complete = false; continue; }
    const name = pair.key.value;
    if (name.startsWith('when@')) { result.complete = false; continue; }
    const value = (key: string): unknown => { const node = pair.value && isMap(pair.value) ? pair.value.get(key, true) : undefined; return isScalar(node) ? node.value : node; };
    const resource = value('resource');
    if (resource !== undefined) {
      const prefix = value('name_prefix') ?? '';
      const rawPathPrefix = value('prefix') ?? '';
      const pathPrefix = typeof rawPathPrefix === 'string' ? rawPathPrefix : localizedYamlPaths(rawPathPrefix);
      const type = value('type');
      let attributeResource = resource;
      let resourceNamespace: string | undefined;
      if (isMap(resource)) {
        const path = resource.get('path');
        const namespace = resource.get('namespace');
        if (type !== 'attribute' || !supportedRoutePattern(path) || /[*?{[]/.test(path)
          || typeof namespace !== 'string' || !/^[\\]*[a-zA-Z_\u0080-\uffff][a-zA-Z0-9_\u0080-\uffff]*(?:\\[a-zA-Z_\u0080-\uffff][a-zA-Z0-9_\u0080-\uffff]*)*\\?$/.test(namespace)
          || resource.items.some((item) => !isScalar(item.key) || !['path', 'namespace'].includes(String(item.key.value)))) {
          result.complete = false; continue;
        }
        attributeResource = path;
        resourceNamespace = namespace.replace(/^\\+|\\+$/g, '');
      }
      const excludeNode = value('exclude');
      const excludeValues: unknown[] = excludeNode === undefined || excludeNode === null ? []
        : isSeq(excludeNode) ? excludeNode.items.map((item) => isScalar(item) ? item.value : item) : [excludeNode];
      if (excludeValues.some((item) => !supportedRoutePattern(item))) { result.complete = false; continue; }
      const exclude = excludeValues as string[];

      const validPathPrefix = typeof pathPrefix === 'string' ? !pathPrefix.includes('%')
        : pathPrefix !== undefined && pathPrefix.every((item) => supportedRoutePattern(item.path) && !item.path.includes('%'));
      if (type === 'attribute' && supportedRoutePattern(attributeResource)
        && typeof prefix === 'string' && !prefix.includes('%') && pathPrefix !== undefined && validPathPrefix) {
        result.imports.push({ resource: attributeResource, namePrefix: prefix, pathPrefix, attribute: true, ...(resourceNamespace ? { namespace: resourceNamespace } : {}), ...(exclude.length ? { exclude } : {}) });
      } else if (supportedRoutePattern(resource) && (type === 'yaml' || /(?:\.ya?ml|\.\{yaml,yml\}|\.\{yml,yaml\})$/.test(resource))
        && pathPrefix !== undefined && validPathPrefix && typeof prefix === 'string' && !prefix.includes('%') && (type === undefined || type === 'yaml')) {
        result.imports.push({ resource, namePrefix: prefix, pathPrefix, ...(exclude.length ? { exclude } : {}) });
      } else if (supportedRoutePattern(resource) && resource.endsWith('.php') && (type === undefined || type === 'php')
        && pathPrefix !== undefined && validPathPrefix && typeof prefix === 'string' && !prefix.includes('%') && exclude.length === 0) {
        result.imports.push({ resource, namePrefix: prefix, pathPrefix, php: true });
      } else result.complete = false;
      continue;
    }
    const rawPath = value('path'); const path = typeof rawPath === 'string' ? rawPath : localizedYamlPaths(rawPath);
    if (path === undefined || (typeof path === 'string' ? path.includes('%') : path.some((item) => item.path.includes('%')))
      || name.includes('%') || !pair.key.range) { result.complete = false; continue; }
    const controller = yamlRouteController(source, uri, pair.value);
    const routes = typeof path === 'string' ? [{ name, path }] : path.map((item) => ({ name: `${name}.${item.locale}`, path: item.path, locale: item.locale }));
    for (const route of routes) {
      result.routes = result.routes.filter((candidate) => candidate.name !== route.name);
      result.routes.push({ ...route, uri, start: pair.key.range[0], end: pair.key.range[1], ...(controller ? { controller } : {}) });
    }
  }
  return result;
}

interface SyntaxNode { type: string; text: string; startIndex: number; endIndex: number; namedChildren: SyntaxNode[]; }
export interface SymfonyRouteCall { start: number; end: number; methodOffset: number; prefix: string; argumentName?: string; namedArguments: string[]; quote: "\"" | "'"; }
export interface SymfonyRouteParameterCall {
  start: number; end: number; methodOffset: number; prefix: string; routeName: string;
  routeArgumentName?: string; routeArgumentPosition: number;
  parametersArgumentName?: string; parametersArgumentPosition: number;
  namedArguments: string[]; existingKeys: string[]; quote: "\"" | "'";
}

function collectNodes(node: SyntaxNode, type: string, found: SyntaxNode[] = []): SyntaxNode[] {
  if (node.type === type) found.push(node);
  for (const child of node.namedChildren) collectNodes(child, type, found);
  return found;
}

function routingCallChain(statement: SyntaxNode, variable: string): Array<{ method: string; arguments: SyntaxNode[] }> | undefined {
  let current = statement.type === 'expression_statement' ? statement.namedChildren[0] : statement;
  const outerToInner: Array<{ method: string; arguments: SyntaxNode[] }> = [];
  while (current?.type === 'member_call_expression') {
    const [receiver, method, args] = current.namedChildren;
    if (!receiver || !method || !args) return undefined;
    outerToInner.push({ method: method.text, arguments: args.namedChildren }); current = receiver;
  }
  return current?.type === 'variable_name' && current.text === variable ? outerToInner.reverse() : undefined;
}

function phpRouteController(uri: string, source: string, namespace: string, imports: ParsedImport[],
  call: { arguments: SyntaxNode[] }): SymfonyRouteControllerFact | undefined {
  if (call.arguments.length !== 1 || call.arguments[0]?.namedChildren.length !== 1) return undefined;
  const argument = call.arguments[0].namedChildren[0]!;
  const identifier = '[A-Za-z_\\u0080-\\uffff][A-Za-z0-9_\\u0080-\\uffff]*';
  const classPattern = new RegExp(`^\\\\?${identifier}(?:\\\\${identifier})*$`, 'u');
  const classConstant = (node: SyntaxNode | undefined): SyntaxNode | undefined => {
    if (node?.type !== 'class_constant_access_expression' || node.namedChildren[1]?.text.toLowerCase() !== 'class') return undefined;
    const name = node.namedChildren[0];
    return name && ['name', 'qualified_name'].includes(name.type) && classPattern.test(name.text) ? name : undefined;
  };
  let classNode = classConstant(argument);
  let methodLiteral: ReturnType<typeof phpString>;
  if (argument.type === 'array_creation_expression') {
    const entries = argument.namedChildren;
    if (entries.length !== 2 || entries.some((entry) => entry.type !== 'array_element_initializer' || entry.namedChildren.length !== 1)) return undefined;
    classNode = classConstant(entries[0]!.namedChildren[0]);
    methodLiteral = phpString(entries[1]!.namedChildren[0]);
    if (!classNode || !methodLiteral || !new RegExp(`^${identifier}$`, 'u').test(methodLiteral.value)
      || source.slice(methodLiteral.start, methodLiteral.end) !== methodLiteral.value) return undefined;
  }
  if (classNode) {
    const className = resolvePhpName(classNode.text, namespace, imports);
    return { className, ...(classNode.text === className ? {} : { classSourceName: classNode.text }), uri,
      classStart: classNode.startIndex, classEnd: classNode.endIndex,
      ...(methodLiteral ? { method: methodLiteral.value, methodStart: methodLiteral.start, methodEnd: methodLiteral.end } : {}) };
  }
  const literal = phpString(argument);
  if (!literal || source.slice(literal.start, literal.end) !== literal.value) return undefined;
  const parts = literal.value.split('::');
  if (parts.length > 2 || !classPattern.test(parts[0]!) || !parts[0]!.replace(/^\\/, '').includes('\\')
    || parts[1] !== undefined && !new RegExp(`^${identifier}$`, 'u').test(parts[1])) return undefined;
  const sourceClass = parts[0]!; const className = sourceClass.replace(/^\\/, '');
  return { className, ...(sourceClass === className ? {} : { classSourceName: sourceClass }), uri,
    classStart: literal.start, classEnd: literal.start + sourceClass.length,
    ...(parts[1] === undefined ? {} : { method: parts[1], methodStart: literal.end - parts[1].length, methodEnd: literal.end }) };
}

/** Parse the deterministic source-declaration subset of Symfony's PHP RoutingConfigurator DSL. */
export function analyzeSymfonyRoutePhp(parser: PhpSyntaxParser, uri: string, source: string): SymfonyRouteDocument {
  const parsed = parser.parse(source, undefined, uri); const result: SymfonyRouteDocument = { complete: true, routes: [], imports: [] };
  try {
    if (parsed.errors.length || parsed.tree.rootNode.hasError) return { ...result, complete: false };
    const root = parsed.tree.rootNode as unknown as SyntaxNode;
    const returns = root.namedChildren.filter((node) => node.type === 'return_statement');
    const closure = returns.length === 1 ? returns[0]!.namedChildren.find((node) => node.type === 'anonymous_function') : undefined;
    const parameters = closure?.namedChildren.find((node) => node.type === 'formal_parameters')?.namedChildren ?? [];
    const parameter = parameters.length === 1 && parameters[0]?.type === 'simple_parameter' ? parameters[0] : undefined;
    const type = parameter?.namedChildren.find((node) => node.type === 'named_type')?.text;
    const variable = parameter?.namedChildren.find((node) => node.type === 'variable_name')?.text;
    const body = closure?.namedChildren.find((node) => node.type === 'compound_statement');
    if (!type || !variable || !body || resolvePhpName(type, parsed.namespace, parsed.imports).toLowerCase()
      !== 'symfony\\component\\routing\\loader\\configurator\\routingconfigurator') return { ...result, complete: false };
    const reassigned = collectNodes(body, 'assignment_expression').some((node) => node.namedChildren[0]?.type === 'variable_name'
      && node.namedChildren[0].text === variable);
    if (reassigned) return { ...result, complete: false };
    for (const statement of body.namedChildren) {
      if (statement.type !== 'expression_statement') {
        const nested = collectNodes(statement, 'member_call_expression').flatMap((node) => routingCallChain(node, variable) ?? []);
        if (nested.length) {
          result.complete = false;
          if (nested.some((call) => !['add', 'import'].includes(call.method.toLowerCase()))) return { ...result, routes: [], imports: [] };
        }
        continue;
      }
      const chain = routingCallChain(statement, variable); const first = chain?.[0];
      if (!first) continue;
      if (first.method.toLowerCase() === 'add' && first.arguments.length === 2) {
        const name = first.arguments[0]?.namedChildren.length === 1 ? phpString(first.arguments[0].namedChildren[0]) : undefined;
        const path = first.arguments[1]?.namedChildren.length === 1 ? phpString(first.arguments[1].namedChildren[0]) : undefined;
        const controllerCalls = chain!.slice(1).filter((call) => call.method.toLowerCase() === 'controller');
        const defaultsOverrideController = chain!.slice(1).some((call) => {
          if (call.method.toLowerCase() !== 'defaults') return false;
          const value = call.arguments.length === 1 && call.arguments[0]?.namedChildren.length === 1
            ? call.arguments[0].namedChildren[0] : undefined;
          if (value?.type !== 'array_creation_expression') return true;
          return value.namedChildren.some((entry) => entry.type !== 'array_element_initializer' || entry.namedChildren.length !== 2
            || phpString(entry.namedChildren[0])?.value === '_controller' || !phpString(entry.namedChildren[0]));
        });
        const controller = controllerCalls.length === 1 && !defaultsOverrideController
          ? phpRouteController(uri, source, parsed.namespace, parsed.imports, controllerCalls[0]!) : undefined;
        if (name && path) result.routes.push({ name: name.value, path: path.value, uri, start: name.start, end: name.end,
          ...(controller ? { controller } : {}) });
        else result.complete = false;
        continue;
      }
      if (first.method.toLowerCase() !== 'import' || first.arguments.length < 1 || first.arguments.length > 2) {
        return { ...result, complete: false, routes: [], imports: [] };
      }
      const resourceLiteral = first.arguments[0]?.namedChildren.length === 1 ? phpString(first.arguments[0].namedChildren[0]) : undefined;
      const resource = resourceLiteral?.value; const loaderLiteral = first.arguments[1]?.namedChildren.length === 1
        ? phpString(first.arguments[1].namedChildren[0]) : undefined;
      const loader = loaderLiteral?.value;
      if (!resource || (first.arguments[1] && !loaderLiteral) || (loader !== undefined && !['attribute', 'php', 'yaml'].includes(loader))) { result.complete = false; continue; }
      let namePrefix = ''; let pathPrefix = ''; let valid = true;
      for (const call of chain!.slice(1)) {
        const value = call.arguments.length === 1 && call.arguments[0]?.namedChildren.length === 1
          ? phpString(call.arguments[0].namedChildren[0])?.value : undefined;
        if (call.method.toLowerCase() === 'nameprefix' && value !== undefined) namePrefix += value;
        else if (call.method.toLowerCase() === 'prefix' && value !== undefined) pathPrefix += value;
        else valid = false;
      }
      if (!valid || !supportedRoutePattern(resource)) { result.complete = false; continue; }
      const attribute = loader === 'attribute'; const php = loader === 'php' || (loader === undefined && resource.endsWith('.php'));
      const yaml = loader === 'yaml' || (loader === undefined && /\.ya?ml$/.test(resource));
      if (!attribute && !php && !yaml) { result.complete = false; continue; }
      result.imports.push({ resource, namePrefix, pathPrefix, ...(attribute ? { attribute: true } : {}), ...(php ? { php: true } : {}) });
    }
    return result;
  } finally { parsed.tree.delete(); }
}

/** Extract top-level unconditional and exact environment-gated Kernel imports with deterministic Kernel-relative paths. */
export function analyzeSymfonyKernelRouteImports(parser: PhpSyntaxParser, uri: string, source: string): SymfonyRouteDocument {
  const parsed = parser.parse(source, undefined, uri); const result: SymfonyRouteDocument = { complete: true, routes: [], imports: [] };
  try {
    if (parsed.errors.length || parsed.tree.rootNode.hasError) return { ...result, complete: false };
    const root = parsed.tree.rootNode as unknown as SyntaxNode;
    const pathExpression = (node: SyntaxNode | undefined): string | undefined => {
      const literal = phpString(node); if (literal) return literal.value;
      if (node?.type === 'name' && node.text.toLowerCase() === '__dir__') return '.';
      if (node?.type === 'function_call_expression' && node.namedChildren[0]?.text.toLowerCase() === 'dirname') {
        const args = node.namedChildren[1]?.namedChildren ?? [];
        const inner = args.length === 1 ? pathExpression(args[0]?.namedChildren.at(-1)) : undefined;
        return inner === undefined ? undefined : `${inner}/..`;
      }
      if (node?.type === 'binary_expression' && node.namedChildren.length === 2) {
        const [left, right] = node.namedChildren; const operator = source.slice(left!.endIndex, right!.startIndex).trim();
        const leftPath = operator === '.' ? pathExpression(left) : undefined; const rightPath = pathExpression(right);
        return leftPath !== undefined && rightPath !== undefined ? leftPath + rightPath : undefined;
      }
      return undefined;
    };
    for (const callable of parsed.callables.filter((item) => item.kind === 'method' && item.name.toLowerCase() === 'configureroutes')) {
      const owner = parsed.declarations.find((item) => item.kind === 'class' && item.fqcn === callable.containerFqcn);
      const namespace = owner?.fqcn.split('\\').slice(0, -1).join('\\') ?? '';
      const parameter = callable.parameters.length === 1 ? callable.parameters[0] : undefined;
      if (!owner || callable.static || owner.extendsNames.length !== 1 || resolvePhpName(owner.extendsNames[0]!, namespace, parsed.imports).toLowerCase()
        !== 'symfony\\component\\httpkernel\\kernel' || !parameter?.nativeType || resolvePhpName(parameter.nativeType, namespace, parsed.imports).toLowerCase()
        !== 'symfony\\component\\routing\\loader\\configurator\\routingconfigurator') { result.complete = false; continue; }
      const method = collectNodes(root, 'method_declaration').find((node) => node.startIndex <= callable.start && node.endIndex >= callable.end);
      const body = method?.namedChildren.find((node) => node.type === 'compound_statement');
      if (!body) { result.complete = false; continue; }
      const environmentCondition = (statement: SyntaxNode): { environments: string[]; body: SyntaxNode } | undefined => {
        if (statement.type !== 'if_statement' || statement.namedChildren.length !== 2) return undefined;
        const [parenthesized, conditionalBody] = statement.namedChildren;
        const condition = parenthesized?.type === 'parenthesized_expression' ? parenthesized.namedChildren[0] : undefined;
        if (condition?.type !== 'binary_expression' || conditionalBody?.type !== 'compound_statement' || condition.namedChildren.length !== 2) return undefined;
        const [left, right] = condition.namedChildren;
        const operator = source.slice(left!.endIndex, right!.startIndex).trim();
        const isEnvironment = (node: SyntaxNode | undefined): boolean => node?.type === 'member_access_expression'
          && node.namedChildren[0]?.text === '$this' && node.namedChildren[1]?.text === 'environment';
        const environment = operator === '===' ? isEnvironment(left) ? phpString(right)?.value
          : isEnvironment(right) ? phpString(left)?.value : undefined : undefined;
        return environment ? { environments: [environment], body: conditionalBody } : undefined;
      };
      const inspect = (statement: SyntaxNode, environments?: string[]): void => {
        const conditional = environmentCondition(statement);
        if (conditional) {
          if (environments) { result.complete = false; return; }
          for (const nested of conditional.body.namedChildren) inspect(nested, conditional.environments);
          return;
        }
        const usesRoutes = collectNodes(statement, 'variable_name').some((node) => node.text === `$${parameter.name}`);
        if (statement.type !== 'expression_statement') { if (usesRoutes) result.complete = false; return; }
        const chain = routingCallChain(statement, `$${parameter.name}`); const first = chain?.[0];
        if (!first || first.method.toLowerCase() !== 'import' || first.arguments.length < 1 || first.arguments.length > 2) {
          if (usesRoutes) result.complete = false;
          return;
        }
        const argument = first.arguments[0]?.namedChildren.length === 1 ? first.arguments[0].namedChildren[0] : undefined;
        const resource = pathExpression(argument);
        const loaderArgument = first.arguments[1]?.namedChildren.length === 1 ? first.arguments[1].namedChildren[0] : undefined;
        const loader = loaderArgument ? phpString(loaderArgument)?.value : undefined;
        if (!resource || !supportedRoutePattern(resource) || (first.arguments[1] && !loader)
          || (loader !== undefined && !['attribute', 'php', 'yaml'].includes(loader))) { result.complete = false; return; }
        const attribute = loader === 'attribute'; const php = loader === 'php' || loader === undefined && resource.endsWith('.php');
        const yaml = loader === 'yaml' || loader === undefined && /\.ya?ml$/.test(resource);
        if (!attribute && !php && !yaml) { result.complete = false; return; }
        let namePrefix = ''; let pathPrefix = '';
        for (const call of chain!.slice(1)) {
          const value = call.arguments.length === 1 && call.arguments[0]?.namedChildren.length === 1
            ? phpString(call.arguments[0].namedChildren[0])?.value : undefined;
          if (value === undefined || value.includes('%')) { result.complete = false; return; }
          if (call.method.toLowerCase() === 'nameprefix') namePrefix += value;
          else if (call.method.toLowerCase() === 'prefix') pathPrefix += value;
          else { result.complete = false; return; }
        }
        result.imports.push({ resource, namePrefix, pathPrefix,
          ...(attribute ? { attribute: true } : {}), ...(php ? { php: true } : {}), ...(environments ? { environments } : {}) });
      };
      for (const statement of body?.namedChildren ?? []) inspect(statement);
    }
    return result;
  } finally { parsed.tree.delete(); }
}

/** Locate a direct literal argument; semantic ownership and the formal route parameter are checked by the caller. */
export function symfonyRouteCallAt(parser: PhpSyntaxParser, uri: string, source: string, offset: number): SymfonyRouteCall | undefined {
  if (!/(?:generateUrl|redirectToRoute|generate)\s*\(/i.test(source.slice(0, offset))) return undefined;
  const parsed = parser.parse(source, undefined, uri);
  try {
    let result: SymfonyRouteCall | undefined;
    const visit = (node: SyntaxNode): void => {
      if (offset < node.startIndex || offset > node.endIndex) return;
      if (node.type === 'member_call_expression') {
        const [, method, args] = node.namedChildren;
        const arguments_ = args?.namedChildren ?? [];
        const namedArguments: string[] = [];
        let positional = 0; let valid = true;
        for (const argument of arguments_) {
          const children = argument.namedChildren;
          if (children.length === 2 && children[0]?.type === 'name') {
            const name = children[0].text;
            if (namedArguments.includes(name)) valid = false;
            namedArguments.push(name);
          } else if (children.length === 1 && children[0]?.type !== 'variadic_unpacking') {
            if (namedArguments.length) valid = false;
            positional++;
          } else valid = false;
        }
        const selected = arguments_.find((argument) => offset >= argument.startIndex && offset <= argument.endIndex);
        const argumentName = selected?.namedChildren.length === 2 ? selected.namedChildren[0]?.text : undefined;
        const literal = selected?.namedChildren.at(-1);
        if (valid && (argumentName ? positional === 0 : selected === arguments_[0])
          && method && ['generateurl', 'redirecttoroute', 'generate'].includes(method.text.toLowerCase())
          && literal && ['string', 'encapsed_string'].includes(literal.type) && /^(['"])[^'"\\$\r\n]*\1$/.test(literal.text)
          && offset >= literal.startIndex + 1 && offset <= literal.endIndex - 1) {
          result = { start: literal.startIndex + 1, end: literal.endIndex - 1, methodOffset: method.startIndex + 1,
            prefix: source.slice(literal.startIndex + 1, offset), argumentName, namedArguments, quote: literal.text[0] as "\"" | "'" };
        }
      }
      for (const child of node.namedChildren) visit(child);
    };
    visit(parsed.tree.rootNode as unknown as SyntaxNode);
    return result;
  } finally { parsed.tree.delete(); }
}

/** Locate a direct string key inside the direct route-parameters array; semantic ownership and formal parameters are checked by the caller. */
export function symfonyRouteParameterCallAt(parser: PhpSyntaxParser, uri: string, source: string, offset: number): SymfonyRouteParameterCall | undefined {
  if (!/(?:generateUrl|redirectToRoute|generate)\s*\(/i.test(source.slice(0, offset))) return undefined;
  const parsed = parser.parse(source, undefined, uri);
  try {
    let result: SymfonyRouteParameterCall | undefined;
    const visit = (node: SyntaxNode): void => {
      if (result || offset < node.startIndex || offset > node.endIndex) return;
      if (node.type === 'member_call_expression') {
        const [, method, args] = node.namedChildren;
        if (!method || !['generateurl', 'redirecttoroute', 'generate'].includes(method.text.toLowerCase())) return;
        const arguments_ = args?.namedChildren ?? []; const namedArguments: string[] = [];
        const normalized: Array<{ node: SyntaxNode; value: SyntaxNode; name?: string; position: number }> = [];
        let positional = 0; let named = false; let valid = true;
        for (const argument of arguments_) {
          const children = argument.namedChildren; const isNamed = children.length === 2 && children[0]?.type === 'name';
          if (isNamed) {
            const name = children[0]!.text; if (namedArguments.includes(name)) valid = false;
            namedArguments.push(name); named = true; normalized.push({ node: argument, value: children[1]!, name, position: -1 });
          } else if (children.length === 1 && children[0]?.type !== 'variadic_unpacking' && !named) {
            normalized.push({ node: argument, value: children[0]!, position: positional++ });
          } else valid = false;
        }
        const parameters = normalized.find((argument) => offset >= argument.value.startIndex && offset <= argument.value.endIndex);
        if (!valid || !parameters || parameters.value.type !== 'array_creation_expression') return;
        const selected = parameters.value.namedChildren.find((element) => offset >= element.startIndex && offset <= element.endIndex);
        const key = selected?.type === 'array_element_initializer' && selected.namedChildren.length === 2 ? selected.namedChildren[0] : undefined;
        const keyLiteral = phpString(key); if (!keyLiteral || offset < keyLiteral.start || offset > keyLiteral.end) return;
        const existingKeys: string[] = [];
        for (const element of parameters.value.namedChildren) {
          if (element.type !== 'array_element_initializer' || element.namedChildren.length !== 2) return;
          const literal = phpString(element.namedChildren[0]); if (!literal) return;
          if (element !== selected) existingKeys.push(literal.value);
        }
        const route = normalized.find((argument) => argument.position === 0)
          ?? normalized.find((argument) => argument !== parameters && phpString(argument.value) !== undefined);
        const routeLiteral = route && phpString(route.value); if (!route || !routeLiteral) return;
        result = {
          start: keyLiteral.start, end: keyLiteral.end, methodOffset: method.startIndex + 1,
          prefix: source.slice(keyLiteral.start, offset), routeName: routeLiteral.value,
          ...(route.name ? { routeArgumentName: route.name } : {}), routeArgumentPosition: route.position,
          ...(parameters.name ? { parametersArgumentName: parameters.name } : {}), parametersArgumentPosition: parameters.position,
          namedArguments, existingKeys, quote: key!.text[0] as "\"" | "'",
        };
      }
      for (const child of node.namedChildren) visit(child);
    };
    visit(parsed.tree.rootNode as unknown as SyntaxNode); return result;
  } finally { parsed.tree.delete(); }
}

/** Escape a route name as PHP string contents, preserving its runtime value. */
export function symfonyRouteNameText(name: string, quote: "'" | '"'): string {
  const escaped = name.replaceAll('\\', '\\\\');
  return quote === "'" ? escaped.replaceAll("'", "\\'")
    : escaped.replaceAll('"', '\\"').replaceAll('$', '\\$');
}

export interface SymfonyAttributeRouteFact extends SymfonyRouteFact { ownerFqcn: string; method: string; }
export interface SymfonyAttributeRoutes { complete: boolean; routes: SymfonyAttributeRouteFact[]; }
type SymfonyAttributePath = string | Map<string, string>;

/** Extract local Route declarations; generated names require an explicit loader strategy and do not prove runtime registration. */
export function analyzeSymfonyRouteAttributes(parser: PhpSyntaxParser, uri: string, source: string, defaultNameStyle?: 'framework' | 'routing', environment?: string): SymfonyAttributeRoutes {
  const parsed = parser.parse(source, undefined, uri);
  const result: SymfonyAttributeRoutes = { complete: true, routes: [] };
  try {
    if (parsed.tree.rootNode.hasError) return { complete: false, routes: [] };
    const literal = (node: SyntaxNode | undefined): string | undefined => {
      if (!node || !['string', 'encapsed_string'].includes(node.type) || !/^(['"])[^'"\\$\r\n]*\1$/.test(node.text)) return undefined;
      return node.text.slice(1, -1);
    };
    const visit = (node: SyntaxNode): void => {
      if (node.type === 'class_declaration') {
        const declaration = parsed.declarations.find((item) => item.declarationStart === node.startIndex && item.kind === 'class' && !item.anonymous);
        if (!declaration || node.namedChildren.some((child) => child.type === 'abstract_modifier')) return;
        const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
        const routeAttributes = (owner: SyntaxNode): SyntaxNode[] => {
          const list = owner.namedChildren.find((child) => child.type === 'attribute_list');
          return (list?.namedChildren.flatMap((group) => group.namedChildren) ?? []).filter((attribute) => {
            const name = attribute.namedChildren[0]?.text;
            if (!name) return false;
            let fqcn: string;
            if (name.startsWith('\\')) fqcn = name.slice(1);
            else if (name.toLowerCase().startsWith('namespace\\')) fqcn = [namespace, name.slice(10)].filter(Boolean).join('\\');
            else {
              const [head, ...tail] = name.split('\\');
              const imports = parsed.imports.filter((item) => item.kind === 'class' && item.namespace === namespace && item.alias.toLowerCase() === head!.toLowerCase());
              if (imports.length > 1) { result.complete = false; return false; }
              fqcn = imports.length ? [imports[0]!.fqcn, ...tail].join('\\') : [namespace, name].filter(Boolean).join('\\');
            }
            return fqcn.toLowerCase() === 'symfony\\component\\routing\\attribute\\route';
          });
        };
        const environmentList = (node: SyntaxNode | undefined): string[] | undefined => {
          const single = literal(node); if (single !== undefined) return [single];
          if (node?.type !== 'array_creation_expression') return undefined;
          const values: string[] = [];
          for (const element of node.namedChildren) {
            if (element.type !== 'array_element_initializer' || element.namedChildren.length !== 1) return undefined;
            const value = literal(element.namedChildren[0]); if (value === undefined) return undefined;
            values.push(value);
          }
          return values;
        };
        const localizedPaths = (node: SyntaxNode | undefined): Map<string, string> | undefined => {
          if (node?.type !== 'array_creation_expression') return undefined;
          const paths = new Map<string, string>();
          for (const element of node.namedChildren) {
            if (element.type !== 'array_element_initializer' || element.namedChildren.length !== 2) return undefined;
            const locale = literal(element.namedChildren[0]); const path = literal(element.namedChildren[1]);
            if (locale === undefined || path === undefined || paths.has(locale)) return undefined;
            paths.set(locale, path);
          }
          return paths;
        };
        const values = (attribute: SyntaxNode): { name?: string; path: SymfonyAttributePath; start: number; end: number; environments?: string[] } | undefined => {
          const args = attribute.namedChildren.find((child) => child.type === 'arguments')?.namedChildren ?? [];
          const found = new Map<string, SyntaxNode>(); let position = 0; let named = false;
          for (const argument of args) {
            const children = argument.namedChildren;
            const isNamed = children.length === 2 && children[0]?.type === 'name';
            const key = isNamed ? children[0]!.text : ['path', 'name'][position++];
            if (!key || !['path', 'name', 'requirements', 'options', 'defaults', 'host', 'methods', 'schemes', 'condition', 'priority', 'locale', 'format', 'utf8', 'stateless', 'env', 'alias'].includes(key) || (!isNamed && named) || found.has(key) || (!isNamed && children.length !== 1)) return undefined;
            named ||= isNamed;
            found.set(key, children.at(-1)!);
          }
          if (found.has('alias')) return undefined;
          const environments = found.has('env') ? environmentList(found.get('env')) : undefined;
          if (found.has('env') && environments === undefined) return undefined;
          if (found.has('locale') && literal(found.get('locale')) === undefined) return undefined;
          const path = found.has('path') ? literal(found.get('path')) ?? localizedPaths(found.get('path')) : '';
          const name = found.has('name') ? literal(found.get('name')) : undefined;
          if (path === undefined || (found.has('name') && name === undefined)
            || (typeof path === 'string' ? path.includes('%') : [...path.values()].some((item) => item.includes('%'))) || name?.includes('%')) return undefined;
          const origin = found.get('name') ?? attribute;
          return { path, name, start: origin.startIndex, end: origin.endIndex, ...(environments ? { environments } : {}) };
        };
        const expandPaths = (prefix: SymfonyAttributePath, path: SymfonyAttributePath): Array<{ suffix: string; path: string; locale?: string }> | undefined => {
          if (typeof prefix === 'string' && typeof path === 'string') return [{ suffix: '', path: prefix + path }];
          if (typeof prefix === 'string') return [...path].map(([locale, item]) => ({ suffix: `.${locale}`, path: prefix + item, locale }));
          if (typeof path === 'string') return [...prefix].map(([locale, item]) => ({ suffix: `.${locale}`, path: item + path, locale }));
          if (prefix.size !== path.size || [...prefix.keys()].some((locale) => !path.has(locale))) return undefined;
          return [...path].map(([locale, item]) => ({ suffix: `.${locale}`, path: prefix.get(locale)! + item, locale }));
        };
        const classAttributes = routeAttributes(node);
        const globals = classAttributes[0] ? values(classAttributes[0]) : { path: '', name: '', environments: undefined };
        if (!globals) { result.complete = false; return; }
        if (globals.environments?.length && (!environment || !globals.environments.includes(environment))) return;
        const methods = node.namedChildren.find((child) => child.type === 'declaration_list')?.namedChildren.filter((child) => child.type === 'method_declaration') ?? [];
        const defaultName = (method: string, index: number): string | undefined => {
          // Non-ASCII case conversion depends on PHP's optional mbstring extension.
          if (!defaultNameStyle || [...(declaration.fqcn + method)].some((character) => character.codePointAt(0)! > 127)) return undefined;
          let name = `${declaration.fqcn.replaceAll('\\', '_')}_${method}`.toLowerCase() + (index ? `_${index}` : '');
          if (defaultNameStyle === 'framework') {
            name = name.replace(/(bundle|controller)_/g, '_');
            if (method.endsWith('Action') || method.endsWith('_action')) name = name.replace(/action(_\d+)?$/, '$1');
            name = name.replaceAll('__', '_');
          }
          return name;
        };
        let hasMethodRoutes = false;
        for (const method of methods) {
          const methodName = method.namedChildren.find((child) => child.type === 'name')?.text;
          let defaultIndex = 0;
          let uncertainDefaultIndex = false;
          for (const attribute of routeAttributes(method)) {
            hasMethodRoutes = true;
            const route = values(attribute);
            if (!route || !methodName) { uncertainDefaultIndex = true; result.complete = false; continue; }
            if (route.environments?.length && (!environment || !route.environments.includes(environment))) continue;
            const name = route.name ?? (!uncertainDefaultIndex ? defaultName(methodName, defaultIndex++) : undefined);
            if (name === undefined) { result.complete = false; continue; }
            const paths = expandPaths(globals.path, route.path); if (!paths) { result.complete = false; continue; }
            result.routes.push(...paths.map((item) => ({ name: (globals.name ?? '') + name + item.suffix, path: item.path,
              uri, start: route.start, end: route.end, ...(item.locale ? { locale: item.locale } : {}), ownerFqcn: declaration.fqcn, method: methodName })));
          }
        }
        if (!hasMethodRoutes && methods.some((method) => method.namedChildren.some((child) => child.type === 'name' && child.text === '__invoke'))) {
          let defaultIndex = 0;
          let uncertainDefaultIndex = false;
          for (const attribute of classAttributes) {
            const route = values(attribute);
            if (!route) { uncertainDefaultIndex = true; result.complete = false; continue; }
            if (route.environments?.length && (!environment || !route.environments.includes(environment))) continue;
            const name = route.name ?? (!uncertainDefaultIndex ? defaultName('__invoke', defaultIndex++) : undefined);
            if (name === undefined) { result.complete = false; continue; }
            const paths = expandPaths('', route.path); if (!paths) { result.complete = false; continue; }
            result.routes.push(...paths.map((item) => ({ name: name + item.suffix, path: item.path,
              uri, start: route.start, end: route.end, ...(item.locale ? { locale: item.locale } : {}), ownerFqcn: declaration.fqcn, method: '__invoke' })));
          }
        }
        return;
      }
      for (const child of node.namedChildren) visit(child);
    };
    visit(parsed.tree.rootNode as unknown as SyntaxNode);
    return result;
  } finally { parsed.tree.delete(); }
}

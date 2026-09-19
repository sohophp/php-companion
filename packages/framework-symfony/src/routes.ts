import { isMap, isScalar, isSeq, parseDocument } from 'yaml';
import type { ParsedImport, PhpSyntaxParser } from '@php-companion/parser';

export interface SymfonyRouteFact { name: string; path: string; uri: string; start: number; end: number; }
export interface SymfonyRouteImport { resource: string; namePrefix: string; pathPrefix: string; attribute?: boolean; php?: boolean; namespace?: string; exclude?: string[]; environments?: string[]; }
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

/** Source declarations only: completeness never implies an effective runtime route table. */
export function analyzeSymfonyRouteYaml(uri: string, source: string): SymfonyRouteDocument {
  const document = parseDocument(source, { uniqueKeys: true, prettyErrors: false });
  const result: SymfonyRouteDocument = { complete: true, routes: [], imports: [] };
  if (document.errors.length || !isMap(document.contents)) return { ...result, complete: false };
  for (const pair of document.contents.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== 'string' || !isMap(pair.value)) { result.complete = false; continue; }
    const name = pair.key.value;
    if (name.startsWith('when@')) { result.complete = false; continue; }
    const value = (key: string): unknown => { const node = pair.value && isMap(pair.value) ? pair.value.get(key, true) : undefined; return isScalar(node) ? node.value : node; };
    const resource = value('resource');
    if (resource !== undefined) {
      const prefix = value('name_prefix') ?? '';
      const pathPrefix = value('prefix') ?? '';
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

      if (type === 'attribute' && supportedRoutePattern(attributeResource)
        && typeof prefix === 'string' && !prefix.includes('%') && typeof pathPrefix === 'string' && !pathPrefix.includes('%')) {
        result.imports.push({ resource: attributeResource, namePrefix: prefix, pathPrefix, attribute: true, ...(resourceNamespace ? { namespace: resourceNamespace } : {}), ...(exclude.length ? { exclude } : {}) });
      } else if (supportedRoutePattern(resource) && (type === 'yaml' || /(?:\.ya?ml|\.\{yaml,yml\}|\.\{yml,yaml\})$/.test(resource))
        && typeof pathPrefix === 'string' && !pathPrefix.includes('%') && typeof prefix === 'string' && !prefix.includes('%') && (type === undefined || type === 'yaml')) {
        result.imports.push({ resource, namePrefix: prefix, pathPrefix, ...(exclude.length ? { exclude } : {}) });
      } else if (supportedRoutePattern(resource) && resource.endsWith('.php') && (type === undefined || type === 'php')
        && typeof pathPrefix === 'string' && !pathPrefix.includes('%') && typeof prefix === 'string' && !prefix.includes('%') && exclude.length === 0) {
        result.imports.push({ resource, namePrefix: prefix, pathPrefix, php: true });
      } else result.complete = false;
      continue;
    }
    const path = value('path');
    if (typeof path !== 'string' || path.includes('%') || name.includes('%') || !pair.key.range) { result.complete = false; continue; }
    result.routes.push({ name, path, uri, start: pair.key.range[0], end: pair.key.range[1] });
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
        if (name && path) result.routes.push({ name: name.value, path: path.value, uri, start: name.start, end: name.end });
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
        else if (['nameprefix', 'prefix'].includes(call.method.toLowerCase())) valid = false;
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
    for (const callable of parsed.callables.filter((item) => item.kind === 'method' && item.name.toLowerCase() === 'configureroutes'
      && !item.static && item.parameters.length === 1)) {
      const owner = parsed.declarations.find((item) => item.kind === 'class' && item.fqcn === callable.containerFqcn);
      const namespace = owner?.fqcn.split('\\').slice(0, -1).join('\\') ?? '';
      const parameter = callable.parameters[0]!;
      if (!owner || owner.extendsNames.length !== 1 || resolvePhpName(owner.extendsNames[0]!, namespace, parsed.imports).toLowerCase()
        !== 'symfony\\component\\httpkernel\\kernel' || !parameter.nativeType || resolvePhpName(parameter.nativeType, namespace, parsed.imports).toLowerCase()
        !== 'symfony\\component\\routing\\loader\\configurator\\routingconfigurator') continue;
      const method = collectNodes(root, 'method_declaration').find((node) => node.startIndex <= callable.start && node.endIndex >= callable.end);
      const body = method?.namedChildren.find((node) => node.type === 'compound_statement');
      const environmentCondition = (statement: SyntaxNode): { environments: string[]; body: SyntaxNode } | undefined => {
        if (statement.type !== 'if_statement' || statement.namedChildren.length !== 2) return undefined;
        const [parenthesized, conditionalBody] = statement.namedChildren;
        const condition = parenthesized?.type === 'parenthesized_expression' ? parenthesized.namedChildren[0] : undefined;
        if (condition?.type !== 'binary_expression' || conditionalBody?.type !== 'compound_statement' || condition.namedChildren.length !== 2) return undefined;
        const [left, right] = condition.namedChildren;
        const operator = source.slice(left!.endIndex, right!.startIndex).trim();
        const member = left?.type === 'member_access_expression' && left.namedChildren[0]?.text === '$this'
          && left.namedChildren[1]?.text === 'environment' ? left : undefined;
        const environment = member && operator === '===' ? phpString(right)?.value : undefined;
        return environment ? { environments: [environment], body: conditionalBody } : undefined;
      };
      const inspect = (statement: SyntaxNode, environments?: string[]): void => {
        const conditional = environmentCondition(statement);
        if (conditional) {
          if (environments) return;
          for (const nested of conditional.body.namedChildren) inspect(nested, conditional.environments);
          return;
        }
        if (statement.type !== 'expression_statement') return;
        const chain = routingCallChain(statement, `$${parameter.name}`); const first = chain?.[0];
        if (!first || first.method.toLowerCase() !== 'import' || first.arguments.length !== 1) return;
        const argument = first.arguments[0]?.namedChildren.length === 1 ? first.arguments[0].namedChildren[0] : undefined;
        const resource = pathExpression(argument);
        if (!resource || !/\.(?:ya?ml|php)$/.test(resource)) { result.complete = false; return; }
        result.imports.push({ resource, namePrefix: '', pathPrefix: '', ...(resource.endsWith('.php') ? { php: true } : {}), ...(environments ? { environments } : {}) });
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

/** Extract local Route declarations; generated names require an explicit loader strategy and do not prove runtime registration. */
export function analyzeSymfonyRouteAttributes(parser: PhpSyntaxParser, uri: string, source: string, defaultNameStyle?: 'framework' | 'routing'): SymfonyAttributeRoutes {
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
        const values = (attribute: SyntaxNode): { name?: string; path: string; start: number; end: number } | undefined => {
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
          // Environment and locale can change which names exist. Keep their declarations unresolved.
          if (['env', 'locale', 'alias'].some((key) => found.has(key))) return undefined;
          const path = found.has('path') ? literal(found.get('path')) : '';
          const name = found.has('name') ? literal(found.get('name')) : undefined;
          if (path === undefined || (found.has('name') && name === undefined) || path.includes('%') || name?.includes('%')) return undefined;
          const origin = found.get('name') ?? attribute;
          return { path, name, start: origin.startIndex, end: origin.endIndex };
        };
        const classAttributes = routeAttributes(node);
        const globals = classAttributes[0] ? values(classAttributes[0]) : { path: '', name: '' };
        if (!globals) { result.complete = false; return; }
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
            const name = route.name ?? (!uncertainDefaultIndex ? defaultName(methodName, defaultIndex++) : undefined);
            if (name === undefined) { result.complete = false; continue; }
            result.routes.push({ ...route, name: (globals.name ?? '') + name, path: globals.path + route.path, uri, ownerFqcn: declaration.fqcn, method: methodName });
          }
        }
        if (!hasMethodRoutes && methods.some((method) => method.namedChildren.some((child) => child.type === 'name' && child.text === '__invoke'))) {
          let defaultIndex = 0;
          let uncertainDefaultIndex = false;
          for (const attribute of classAttributes) {
            const route = values(attribute);
            if (!route) { uncertainDefaultIndex = true; result.complete = false; continue; }
            const name = route.name ?? (!uncertainDefaultIndex ? defaultName('__invoke', defaultIndex++) : undefined);
            if (name === undefined) { result.complete = false; continue; }
            result.routes.push({ ...route, name, uri, ownerFqcn: declaration.fqcn, method: '__invoke' });
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

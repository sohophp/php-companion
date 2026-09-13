import { isMap, isScalar, isSeq, parseDocument } from 'yaml';
import type { PhpSyntaxParser } from '@php-companion/parser';

export interface SymfonyRouteFact { name: string; path: string; uri: string; start: number; end: number; }
export interface SymfonyRouteImport { resource: string; namePrefix: string; pathPrefix: string; attribute?: boolean; namespace?: string; exclude?: string[]; }
export interface SymfonyRouteDocument { complete: boolean; routes: SymfonyRouteFact[]; imports: SymfonyRouteImport[]; }

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

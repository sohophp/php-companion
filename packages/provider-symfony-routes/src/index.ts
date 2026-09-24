import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { minimatch } from 'minimatch';
import {
  analyzeSymfonyBundleRegistrations,
  analyzeSymfonyKernelRouteImports,
  analyzeSymfonyRouteAttributes,
  analyzeSymfonyRoutePhp,
  analyzeSymfonyRouteYaml,
  type SymfonyBundleRegistrationFact,
  type SymfonyRouteFact,
  type SymfonyRoutePathPrefix,
} from '@php-companion/framework-symfony';
import type { PhpSyntaxParser } from '@php-companion/parser';
import { allPsr4Mappings, loadComposerProject, resolvePsr4Class, type Psr4Mapping } from '@php-companion/project';
import type { RouteFact, RouteProviderDocument } from '@php-companion/route-provider';

interface BundleRoot { path: string; realPath: string; }
function missing(error: unknown): boolean { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }
export interface SymfonyStaticRouteOptions {
  environment?: string;
  documents?: readonly RouteProviderDocument[];
  maxEntries?: number;
}

export interface SymfonyStaticRouteSnapshot {
  complete: boolean;
  routes: RouteFact[];
  inputUris: string[];
  inputDirectoryUris: string[];
  inputEvidenceComplete: boolean;
}

function within(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return local === '' || (!isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`));
}

function routePathMatches(path: string, pattern: string): boolean {
  return minimatch(path.split(sep).join('/'), pattern.split(sep).join('/'), {
    dot: false, nonegate: true, nocomment: true, noext: true, nocase: process.platform === 'win32',
  });
}

function excludedRoutePath(path: string, patterns: readonly string[]): boolean {
  for (let candidate = path; ; candidate = dirname(candidate)) {
    if (patterns.some((pattern) => routePathMatches(candidate, pattern))) return true;
    if (dirname(candidate) === candidate) return false;
  }
}

function composePathPrefix(outer: SymfonyRoutePathPrefix, inner: SymfonyRoutePathPrefix): SymfonyRoutePathPrefix | undefined {
  if (typeof outer === 'string') {
    if (typeof inner === 'string') return outer + inner;
    return inner.map((entry) => ({ ...entry, path: outer + entry.path }));
  }
  if (typeof inner === 'string') return outer.map((entry) => ({ ...entry, path: entry.path + inner }));
  const outerByLocale = new Map(outer.map((entry) => [entry.locale, entry.path]));
  if (inner.some((entry) => !outerByLocale.has(entry.locale))) return undefined;
  return inner.map((entry) => ({ ...entry, path: outerByLocale.get(entry.locale)! + entry.path }));
}

function applyPathPrefix(route: SymfonyRouteFact, prefix: SymfonyRoutePathPrefix): SymfonyRouteFact[] {
  if (typeof prefix === 'string') return [{ ...route, path: prefix + route.path }];
  if (route.locale !== undefined) {
    const localized = prefix.find((entry) => entry.locale === route.locale);
    return localized ? [{ ...route, path: localized.path + route.path }] : [];
  }
  return prefix.map((entry) => ({ ...route, name: `${route.name}.${entry.locale}`, path: entry.path + route.path, locale: entry.locale }));
}

function snapshotSources(root: string, documents: readonly RouteProviderDocument[]): Map<string, string> {
  const sources = new Map<string, string>();
  for (const document of documents) {
    try {
      const path = fileURLToPath(document.uri);
      if (within(root, path)) sources.set(resolve(path), document.source);
    } catch { /* Non-file documents cannot represent route declarations in this provider. */ }
  }
  return sources;
}

async function registeredBundleRoots(root: string, parser: PhpSyntaxParser, mappings: Psr4Mapping[], sources: Map<string, string>,
  inputPaths: Set<string>, markIncomplete: () => void, environment?: string): Promise<Map<string, BundleRoot>> {
  const registrations: SymfonyBundleRegistrationFact[] = [];
  const sourceFor = async (path: string): Promise<string> => {
    inputPaths.add(resolve(path));
    try { return sources.get(resolve(path)) ?? await readFile(path, 'utf8'); }
    catch (error) { if (!missing(error)) markIncomplete(); throw error; }
  };
  for (const filename of ['config/bundles.php', 'src/Kernel.php', 'app/AppKernel.php']) {
    const path = resolve(root, filename);
    try {
      const facts = analyzeSymfonyBundleRegistrations(parser, pathToFileURL(path).toString(), await sourceFor(path));
      registrations.push(...facts.bundles.filter((fact) => fact.environments
        ? environment !== undefined && fact.environments.includes(environment)
        : fact.excludedEnvironments ? environment !== undefined && !fact.excludedEnvironments.includes(environment) : true));
    } catch { /* Either registration convention may be absent. */ }
  }
  const classPath = async (fqcn: string, localCandidates: readonly string[] = []): Promise<string | undefined> => {
    const existing = new Set<string>();
    for (const path of [...localCandidates, ...resolvePsr4Class(fqcn, mappings)]) {
      inputPaths.add(resolve(path));
      try { if ((await stat(path)).isFile()) existing.add(await realpath(path)); }
      catch (error) { if (!missing(error)) markIncomplete(); /* Missing alternatives are not candidates. */ }
    }
    return existing.size === 1 ? [...existing][0] : undefined;
  };
  const resolveName = (name: string, namespace: string, imports: Array<{ kind: string; namespace: string; alias: string; fqcn: string }>): string | undefined => {
    if (name.startsWith('\\')) return name.slice(1);
    if (name.toLowerCase().startsWith('namespace\\')) return [namespace, name.slice(10)].filter(Boolean).join('\\');
    const [head, ...tail] = name.split('\\');
    const imported = imports.filter((item) => item.kind === 'class' && item.namespace === namespace && item.alias.toLowerCase() === head!.toLowerCase());
    return imported.length > 1 ? undefined : imported.length ? [imported[0]!.fqcn, ...tail].join('\\') : [namespace, name].filter(Boolean).join('\\');
  };
  const conventionalRoot = async (fqcn: string): Promise<BundleRoot | undefined> => {
    const registeredPath = await classPath(fqcn); if (!registeredPath) return undefined;
    let current = fqcn; let currentPath = registeredPath; const visited = new Set<string>();
    for (let depth = 0; depth < 16; depth++) {
      const key = current.toLowerCase(); if (visited.has(key)) return undefined; visited.add(key);
      if (key === 'symfony\\component\\httpkernel\\bundle\\bundle') {
        const path = dirname(registeredPath); return { path, realPath: await realpath(path) };
      }
      const source = await sourceFor(currentPath); const parsed = parser.parse(source, undefined, pathToFileURL(currentPath).toString());
      try {
        if (parsed.errors.length || parsed.tree.rootNode.hasError) return undefined;
        const declaration = parsed.declarations.find((item) => item.kind === 'class' && item.fqcn.toLowerCase() === key);
        if (!declaration || parsed.callables.some((item) => item.containerFqcn?.toLowerCase() === key
          && ['__construct', 'getpath'].includes(item.name.toLowerCase())) || declaration.extendsNames.length !== 1) return undefined;
        const namespace = declaration.fqcn.split('\\').slice(0, -1).join('\\');
        const parent = resolveName(declaration.extendsNames[0]!, namespace, parsed.imports); if (!parent) return undefined;
        const sameFile = parsed.declarations.some((item) => item.kind === 'class' && item.fqcn.toLowerCase() === parent.toLowerCase());
        current = parent;
        if (!sameFile && current.toLowerCase() !== 'symfony\\component\\httpkernel\\bundle\\bundle') {
          const nextPath = await classPath(current); if (!nextPath) return undefined; currentPath = nextPath;
        }
      } finally { parsed.tree.delete(); }
    }
    return undefined;
  };
  const grouped = new Map<string, SymfonyBundleRegistrationFact[]>();
  for (const fact of registrations) grouped.set(fact.bundleName.toLowerCase(), [...(grouped.get(fact.bundleName.toLowerCase()) ?? []), fact]);
  const roots = new Map<string, BundleRoot>();
  for (const [name, facts] of grouped) {
    const classes = [...new Set(facts.map((fact) => fact.className.toLowerCase()))]; if (classes.length !== 1) continue;
    const fact = facts.find((item) => item.className.toLowerCase() === classes[0])!;
    const bundleRoot = await conventionalRoot(fact.className); if (bundleRoot) roots.set(name, bundleRoot);
  }
  return roots;
}

/** Collect the complete static route graph without executing project PHP. */
export async function collectSymfonyStaticRouteSnapshot(rootPath: string, parser: PhpSyntaxParser, options: SymfonyStaticRouteOptions = {}): Promise<SymfonyStaticRouteSnapshot> {
  const root = resolve(rootPath); const actualRoot = await realpath(root);
  const sources = snapshotSources(root, options.documents ?? []);
  const inputPaths = new Set<string>(); const inputDirectories = new Set<string>(); let inputEvidenceComplete = true;
  const sourceFor = async (path: string): Promise<string> => {
    inputPaths.add(resolve(path));
    try { return sources.get(resolve(path)) ?? await readFile(path, 'utf8'); }
    catch (error) { if (!missing(error)) inputEvidenceComplete = false; throw error; }
  };
  const project = await loadComposerProject(root); const mappings = project ? allPsr4Mappings(project) : [];
  const bundleRoots = await registeredBundleRoots(root, parser, mappings, sources, inputPaths,
    () => { inputEvidenceComplete = false; }, options.environment);
  const projectScope: BundleRoot = { path: root, realPath: actualRoot };
  const routes: SymfonyRouteFact[] = []; const visitedContexts = new Set<string>(); let remaining = options.maxEntries ?? 256; let complete = true;
  let defaultNameStyle: 'framework' | undefined;
  try {
    inputPaths.add(resolve(root, 'composer.json'));
    const composer = JSON.parse(await readFile(resolve(root, 'composer.json'), 'utf8')) as { require?: Record<string, unknown> };
    if (typeof composer.require?.['symfony/framework-bundle'] === 'string') defaultNameStyle = 'framework';
  } catch (error) {
    if (!missing(error) && !(error instanceof SyntaxError)) inputEvidenceComplete = false;
    /* Generated attribute names remain unknown without an explicit loader style. */
  }
  const read = async (path: string, namePrefix: string, pathPrefix: SymfonyRoutePathPrefix, ancestors: Set<string>, attribute = false, php = false,
    excludedPaths: string[] = [], mapping?: { root: string; namespace: string }, scope = projectScope): Promise<void> => {
    const local = relative(scope.path, path);
    if (excludedRoutePath(path, excludedPaths)) return;
    if (ancestors.has(path)) { complete = false; return; }
    if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) { complete = false; return; }
    if (remaining-- <= 0) { complete = false; inputEvidenceComplete = false; return; }
    try {
      if (/[*?{[]/.test(path)) {
        const segments = path.split(sep); const firstMagic = segments.findIndex((segment) => /[*?{[]/.test(segment));
        const base = segments.slice(0, firstMagic).join(sep) || sep;
        const walk = async (candidate: string, seen: Set<string>): Promise<void> => {
          if (excludedRoutePath(candidate, excludedPaths)) return;
          if (remaining-- <= 0) { complete = false; inputEvidenceComplete = false; return; }
          inputPaths.add(resolve(candidate));
          try {
            const actual = await realpath(candidate); if (seen.has(actual)) return;
            if (!within(scope.realPath, actual)) { complete = false; return; }
            const info = await stat(candidate);
            if (info.isDirectory()) { inputPaths.delete(resolve(candidate)); inputDirectories.add(resolve(candidate)); }
            if (routePathMatches(candidate, path)) { await read(candidate, namePrefix, pathPrefix, ancestors, attribute, php, excludedPaths, mapping, scope); return; }
            if (!info.isDirectory()) return;
            const next = new Set([...seen, actual]);
            inputDirectories.add(resolve(candidate));
            for (const entry of (await readdir(candidate, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
              if (remaining <= 0) { inputEvidenceComplete = false; break; }
              if (!entry.name.startsWith('.')) await walk(resolve(candidate, entry.name), next);
            }
          } catch (error) { complete = false; if (!missing(error)) inputEvidenceComplete = false; }
        };
        await walk(base, new Set(ancestors)); return;
      }
      inputPaths.add(resolve(path));
      const actualPath = await realpath(path);
      if (ancestors.has(actualPath)) {
        const repeated = await stat(path);
        if (attribute && repeated.isDirectory()) {
          inputPaths.delete(resolve(path)); inputDirectories.add(resolve(path));
          return;
        }
        complete = false; return;
      }
      if (!within(scope.realPath, actualPath)) { complete = false; return; }
      const contextKey = JSON.stringify([actualPath, namePrefix, pathPrefix, attribute, php, [...excludedPaths].sort(), mapping?.root, mapping?.namespace]);
      if (visitedContexts.has(contextKey)) return; visitedContexts.add(contextKey);
      const info = await stat(path);
      if (info.isDirectory()) { inputPaths.delete(resolve(path)); inputDirectories.add(resolve(path)); }
      if (mapping && path === mapping.root && !info.isDirectory()) { complete = false; return; }
      if (attribute && info.isDirectory()) {
        const next = new Set([...ancestors, path, actualPath]);
        inputDirectories.add(resolve(path));
        for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
          if (remaining <= 0) { complete = false; inputEvidenceComplete = false; break; }
          if (!entry.name.startsWith('.') && (entry.isDirectory() || entry.isSymbolicLink() || entry.name.endsWith('.php')))
            await read(resolve(path, entry.name), namePrefix, pathPrefix, next, true, false, excludedPaths, mapping, scope);
        }
        return;
      }
      if (!info.isFile() || (attribute && !path.endsWith('.php')) || info.size > 1_000_000) { complete = false; return; }
      const uri = pathToFileURL(path).toString(); const source = await sourceFor(path); if (source.length > 1_000_000) { complete = false; return; }
      if (attribute) {
        const facts = analyzeSymfonyRouteAttributes(parser, uri, source, defaultNameStyle, options.environment);
        const expectedOwner = mapping ? `${mapping.namespace}\\${relative(mapping.root, path).slice(0, -4).split(sep).join('\\')}` : undefined;
        if (!facts.complete) complete = false;
        routes.push(...facts.routes.filter((route) => !expectedOwner || route.ownerFqcn === expectedOwner)
          .flatMap((route) => applyPathPrefix(route, pathPrefix).map((candidate) => ({ ...candidate, name: namePrefix + candidate.name }))));
        return;
      }
      const facts = php ? analyzeSymfonyRoutePhp(parser, uri, source) : analyzeSymfonyRouteYaml(uri, source, options.environment);
      if (!facts.complete) complete = false;
      routes.push(...facts.routes.flatMap((route) => applyPathPrefix(route, pathPrefix)
        .map((candidate) => ({ ...candidate, name: namePrefix + candidate.name }))));
      const next = new Set([...ancestors, path, actualPath]);
      for (const entry of facts.imports) {
        const bundle = /^@([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*Bundle)[\\/](.+)$/.exec(entry.resource);
        const bundleRoot = bundle ? bundleRoots.get(bundle[1]!.toLowerCase()) : undefined;
        if (entry.resource.startsWith('@') && !bundleRoot) { complete = false; continue; }
        const importedScope = bundleRoot ?? scope;
        const importedPath = resolve(bundleRoot?.path ?? dirname(path), (bundle?.[2] ?? entry.resource).replace(/[\\/]/g, sep));
        const importedPrefix = composePathPrefix(pathPrefix, entry.pathPrefix); if (importedPrefix === undefined) { complete = false; continue; }
        await read(importedPath, namePrefix + entry.namePrefix, importedPrefix, next, entry.attribute, entry.php,
          (entry.exclude ?? []).map((excluded) => resolve(dirname(path), excluded)),
          entry.namespace ? { root: importedPath, namespace: entry.namespace } : undefined, importedScope);
      }
    } catch (error) { complete = false; if (!missing(error)) inputEvidenceComplete = false; }
  };
  for (const filename of ['src/Kernel.php', 'app/AppKernel.php']) {
    const path = resolve(root, filename);
    try {
      inputPaths.add(path);
      if (!(await stat(path)).isFile()) continue;
      const facts = analyzeSymfonyKernelRouteImports(parser, pathToFileURL(path).toString(), await sourceFor(path));
      if (!facts.complete) complete = false;
      const imports = facts.imports.filter((item) => !item.environments || (options.environment !== undefined && item.environments.includes(options.environment)))
        .sort((left, right) => Number(Boolean(right.environments)) - Number(Boolean(left.environments)));
      for (const entry of imports) await read(resolve(dirname(path), entry.resource), entry.namePrefix, entry.pathPrefix, new Set(), false, entry.php, [], undefined, projectScope);
    } catch (error) {
      if (!missing(error)) inputEvidenceComplete = false;
      try { await stat(path); complete = false; } catch { /* Conventional Kernel files are optional. */ }
    }
  }
  for (const filename of ['config/routes.yaml', 'config/routes.yml']) {
    const path = resolve(root, filename);
    try { inputPaths.add(path); if ((await stat(path)).isFile()) await read(path, '', '', new Set()); }
    catch (error) { if (!missing(error)) inputEvidenceComplete = false; /* Conventional roots are optional. */ }
  }
  const counts = new Map<string, number>(); for (const route of routes) counts.set(route.name, (counts.get(route.name) ?? 0) + 1);
  if ([...counts.values()].some((count) => count > 1)) complete = false;
  return { complete, routes: routes.filter((route) => counts.get(route.name) === 1).sort((left, right) => left.name.localeCompare(right.name)),
    inputUris: [...inputPaths].sort().map((path) => pathToFileURL(path).toString()),
    inputDirectoryUris: [...inputDirectories].sort().map((path) => pathToFileURL(path).toString()), inputEvidenceComplete };
}

/** Backwards-compatible facts-only view. Prefer the snapshot when completeness affects correctness. */
export async function collectSymfonyStaticRouteFacts(rootPath: string, parser: PhpSyntaxParser, options: SymfonyStaticRouteOptions = {}): Promise<RouteFact[]> {
  return (await collectSymfonyStaticRouteSnapshot(rootPath, parser, options)).routes;
}

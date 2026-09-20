import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  analyzeSymfonyBundleRegistrations,
  analyzeSymfonyContainerXml,
  analyzeSymfonyServicePhp,
  analyzeSymfonyServiceXml,
  analyzeSymfonyServiceYaml,
  expandSymfonyServiceResources,
  symfonyContainerMethodReturnFacts,
  type SymfonyBundleRegistrationFact,
  type SymfonyCompiledMethodArgumentFact,
  type SymfonyCompiledPropertyArgumentFact,
  type SymfonyServiceFact,
} from '@php-companion/framework-symfony';
import type { PhpSyntaxParser } from '@php-companion/parser';
import { allPsr4Mappings, loadComposerProject, resolvePsr4Class, type Psr4Mapping } from '@php-companion/project';
import type { ExternalLiteralMethodReturnFact, SemanticProviderDocument, SemanticProviderProjectType } from '@php-companion/semantic-provider';

const YAML_CONFIGS = ['config/services.yaml', 'config/services.yml', 'config/packages/services.yaml', 'config/packages/services.yml',
  'config/symfony/services.yaml', 'config/symfony/services.yml', 'app/config/services.yaml', 'app/config/services.yml'];
const XML_CONFIGS = ['config/services.xml', 'config/packages/services.xml', 'config/symfony/services.xml', 'app/config/services.xml'];
const PHP_CONFIGS = ['config/services.php', 'config/packages/services.php', 'config/symfony/services.php', 'app/config/services.php'];

interface BundleRoot { path: string; realPath: string; classPaths: string[]; }
export interface SymfonyServiceProviderOptions {
  projectTypes: readonly SemanticProviderProjectType[];
  documents?: readonly SemanticProviderDocument[];
  maxImports?: number;
}
export interface SymfonyServiceProviderFacts {
  services: SymfonyServiceFact[];
  methodArguments: SymfonyCompiledMethodArgumentFact[];
  propertyArguments: SymfonyCompiledPropertyArgumentFact[];
  literalMethodReturns: ExternalLiteralMethodReturnFact[];
  configurationUris: string[];
}

function within(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return local === '' || (!isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`));
}

function snapshotSources(root: string, documents: readonly SemanticProviderDocument[]): Map<string, string> {
  const sources = new Map<string, string>();
  for (const document of documents) {
    try { const path = resolve(fileURLToPath(document.uri)); if (within(root, path)) sources.set(path, document.source); }
    catch { /* Non-file documents cannot override filesystem service declarations. */ }
  }
  return sources;
}

async function bundleRoots(root: string, parser: PhpSyntaxParser, projectTypes: readonly SemanticProviderProjectType[],
  mappings: readonly Psr4Mapping[], sources: Map<string, string>): Promise<Map<string, BundleRoot>> {
  const sourceFor = async (path: string): Promise<string> => sources.get(resolve(path)) ?? readFile(path, 'utf8');
  const registrations: SymfonyBundleRegistrationFact[] = [];
  for (const filename of ['config/bundles.php', 'src/Kernel.php', 'app/AppKernel.php']) {
    const path = resolve(root, filename);
    try { registrations.push(...analyzeSymfonyBundleRegistrations(parser, pathToFileURL(path).toString(), await sourceFor(path)).bundles); }
    catch { /* A project can omit either registration convention. */ }
  }
  const classPath = async (fqcn: string): Promise<string | undefined> => {
    const candidates = [...projectTypes.filter((item) => item.fqcn.toLowerCase() === fqcn.toLowerCase()).map((item) => item.path),
      ...resolvePsr4Class(fqcn, [...mappings])];
    const existing = new Set<string>();
    for (const path of candidates) {
      try { if ((await stat(path)).isFile()) existing.add(await realpath(path)); } catch { /* Missing alternatives are ignored. */ }
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
    let current = fqcn; let currentPath = registeredPath; const visited = new Set<string>(); const classPaths: string[] = [];
    for (let depth = 0; depth < 16; depth += 1) {
      const key = current.toLowerCase(); if (visited.has(key)) return undefined; visited.add(key);
      if (key === 'symfony\\component\\httpkernel\\bundle\\bundle') {
        const path = dirname(registeredPath); return { path, realPath: await realpath(path), classPaths };
      }
      classPaths.push(currentPath);
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
          const next = await classPath(current); if (!next) return undefined; currentPath = next;
        }
      } finally { parsed.tree.delete(); }
    }
    return undefined;
  };
  const grouped = new Map<string, SymfonyBundleRegistrationFact[]>();
  for (const fact of registrations) grouped.set(fact.bundleName.toLowerCase(), [...(grouped.get(fact.bundleName.toLowerCase()) ?? []), fact]);
  const result = new Map<string, BundleRoot>();
  for (const [name, facts] of grouped) {
    const classes = [...new Set(facts.map((fact) => fact.className.toLowerCase()))]; if (classes.length !== 1) continue;
    const root = await conventionalRoot(facts.find((fact) => fact.className.toLowerCase() === classes[0])!.className); if (root) result.set(name, root);
  }
  return result;
}

function importedConfig(root: string, ownerPath: string, resource: string, roots: Map<string, BundleRoot>): { path: string; containmentRoot: string } | undefined {
  if (!resource || resource.includes('%') || /[*?[\]{}]/.test(resource) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(resource)) return undefined;
  const bundle = /^@([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*Bundle)[\\/](.+)$/.exec(resource);
  const base = bundle ? roots.get(bundle[1]!.toLowerCase()) : undefined;
  if ((resource.startsWith('@') && !base) || (!bundle && isAbsolute(resource))) return undefined;
  const path = resolve(base?.path ?? dirname(ownerPath), (bundle?.[2] ?? resource).replace(/[\\/]/g, sep));
  return within(base?.path ?? root, path) && /\.(?:ya?ml|xml|php)$/i.test(path) ? { path, containmentRoot: base?.realPath ?? root } : undefined;
}

async function filesBelow(root: string, limit = 100_000): Promise<string[]> {
  const result: string[] = []; const walk = async (path: string): Promise<void> => {
    if (result.length >= limit) return;
    try {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        if (result.length >= limit) return;
        const candidate = resolve(path, entry.name); if (entry.isDirectory()) await walk(candidate); else if (entry.isFile()) result.push(candidate);
      }
    } catch { /* Missing and unreadable dependency trees make compiled metadata stale below. */ }
  }; await walk(root); return result;
}

async function freshCompiledContainer(root: string, projectTypes: readonly SemanticProviderProjectType[], sources: Map<string, string>): Promise<string | undefined> {
  // An open source/config snapshot can be newer than its disk mtime, so compiled metadata cannot be authoritative.
  if ([...sources.keys()].some((path) => /^(?:src|config)[\\/]/.test(relative(root, path)))) return undefined;
  const directory = resolve(root, 'var/cache/dev'); let entries: string[];
  try { entries = (await readdir(directory)).filter((name) => /DebugContainer\.xml$/.test(name)); } catch { return undefined; }
  const candidates = await Promise.all(entries.map(async (name) => {
    const path = resolve(directory, name); try { return { path, modified: (await stat(path)).mtimeMs }; } catch { return undefined; }
  }));
  const selected = candidates.flatMap((item) => item ? [item] : []).sort((left, right) => right.modified - left.modified)[0]; if (!selected) return undefined;
  const dependencies = [...new Set([...projectTypes.map((item) => item.path).filter((path) => within(resolve(root, 'src'), path)),
    ...(await filesBelow(resolve(root, 'config'))), resolve(root, 'composer.json'), resolve(root, 'composer.lock')])];
  const mtimes = await Promise.all(dependencies.map(async (path) => { try { return (await stat(path)).mtimeMs; } catch { return Number.POSITIVE_INFINITY; } }));
  return mtimes.every((modified) => modified <= selected.modified) ? selected.path : undefined;
}

/** Collect a complete static Symfony service graph without booting the project Kernel or executing project PHP. */
export async function collectSymfonyServiceFacts(rootPath: string, parser: PhpSyntaxParser,
  options: SymfonyServiceProviderOptions): Promise<SymfonyServiceProviderFacts> {
  const root = resolve(rootPath); const actualRoot = await realpath(root); const sources = snapshotSources(root, options.documents ?? []);
  const sourceFor = async (path: string): Promise<string> => sources.get(resolve(path)) ?? readFile(path, 'utf8');
  const project = await loadComposerProject(root); const mappings = project ? allPsr4Mappings(project) : [];
  const roots = await bundleRoots(root, parser, options.projectTypes, mappings, sources);
  const catalog: SymfonyServiceFact[] = []; const methodArguments: SymfonyCompiledMethodArgumentFact[] = [];
  const propertyArguments: SymfonyCompiledPropertyArgumentFact[] = []; const configuredPaths = new Set<string>();
  const compiled = await freshCompiledContainer(root, options.projectTypes, sources);
  if (compiled) {
    try {
      const uri = pathToFileURL(compiled).toString(); const facts = analyzeSymfonyContainerXml(uri, await sourceFor(compiled));
      if (facts.complete) { catalog.push(...facts.services); methodArguments.push(...facts.methodArguments); propertyArguments.push(...facts.propertyArguments); }
    } catch { /* Static configuration remains available when compiled metadata is malformed. */ }
  }
  const loaded = new Set<string>(); const loading = new Set<string>(); let remaining = options.maxImports ?? 256;
  const load = async (input: string, depth = 0, containmentRoot = actualRoot): Promise<void> => {
    const path = resolve(input);
    if (depth > 32 || remaining-- <= 0 || loaded.has(path) || loading.has(path)) return;
    loading.add(path);
    try {
      const actual = await realpath(path); if (!within(containmentRoot, actual)) return;
      configuredPaths.add(path);
      const uri = pathToFileURL(path).toString(); const source = await sourceFor(path); if (source.length > 1_000_000) return;
      const extension = path.split('.').at(-1)?.toLowerCase();
      const facts = extension === 'xml' ? analyzeSymfonyServiceXml(uri, source)
        : extension === 'php' ? analyzeSymfonyServicePhp(parser, uri, source) : analyzeSymfonyServiceYaml(uri, source);
      for (const imported of facts.imports ?? []) {
        const candidate = importedConfig(root, path, imported.resource, roots); if (!candidate) continue;
        const realContainment = candidate.containmentRoot === root ? actualRoot : candidate.containmentRoot;
        await load(candidate.path, depth + 1, realContainment);
      }
      catalog.push(...expandSymfonyServiceResources(facts, [...options.projectTypes])); loaded.add(path);
    } catch { /* Conventional and imported configuration files are optional. */ }
    finally { loading.delete(path); }
  };
  for (const filename of [...XML_CONFIGS, ...YAML_CONFIGS, ...PHP_CONFIGS]) await load(resolve(root, filename));
  const services = [...new Map(catalog.map((service) => [`${service.registrationUri}\0${service.id}`, service])).values()];
  return { services, methodArguments, propertyArguments, literalMethodReturns: symfonyContainerMethodReturnFacts(services),
    configurationUris: [...new Set([...configuredPaths, ...[...roots.values()].flatMap((bundle) => bundle.classPaths)])]
      .sort().map((path) => pathToFileURL(path).toString()) };
}

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
  symfonyPhpParameterDeclarations,
  symfonyXmlParameterDeclarations,
  symfonyYamlParameterDeclarations,
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
  environment?: string;
}
export interface SymfonyServiceProviderFacts {
  complete: boolean;
  services: SymfonyServiceFact[];
  methodArguments: SymfonyCompiledMethodArgumentFact[];
  propertyArguments: SymfonyCompiledPropertyArgumentFact[];
  literalMethodReturns: ExternalLiteralMethodReturnFact[];
  parameters: Array<{ id: string; uri: string; start: number; end: number }>;
  configurationUris: string[];
  /** File paths attempted by the static provider, including absent imports. */
  inputUris: string[];
  inputEvidenceComplete: boolean;
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
  mappings: readonly Psr4Mapping[], sources: Map<string, string>, inputPaths: Set<string>, markIncomplete: (inputEvidenceIncomplete: boolean) => void): Promise<Map<string, BundleRoot>> {
  const sourceFor = async (path: string): Promise<string> => {
    inputPaths.add(resolve(path)); return sources.get(resolve(path)) ?? readFile(path, 'utf8');
  };
  const registrations: SymfonyBundleRegistrationFact[] = [];
  for (const filename of ['config/bundles.php', 'src/Kernel.php', 'app/AppKernel.php']) {
    const path = resolve(root, filename);
    try {
      const facts = analyzeSymfonyBundleRegistrations(parser, pathToFileURL(path).toString(), await sourceFor(path));
      if (!facts.complete) markIncomplete(false);
      registrations.push(...facts.bundles);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') markIncomplete(true);
    }
  }
  const classPath = async (fqcn: string): Promise<string | undefined> => {
    const candidates = [...projectTypes.filter((item) => item.fqcn.toLowerCase() === fqcn.toLowerCase()).map((item) => item.path),
      ...resolvePsr4Class(fqcn, [...mappings])];
    const existing = new Set<string>();
    for (const path of candidates) {
      inputPaths.add(resolve(path));
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

async function filesBelow(root: string, limit = 100_000): Promise<{ files: string[]; complete: boolean }> {
  const result: string[] = []; let complete = true; const walk = async (path: string): Promise<void> => {
    if (result.length >= limit) { complete = false; return; }
    try {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        if (result.length >= limit) { complete = false; return; }
        const candidate = resolve(path, entry.name); if (entry.isDirectory()) await walk(candidate); else if (entry.isFile()) result.push(candidate);
      }
    } catch { complete = false; /* Missing and unreadable trees cannot prove compiled freshness. */ }
  }; await walk(root); return { files: result, complete };
}

async function freshCompiledContainer(root: string, projectTypes: readonly SemanticProviderProjectType[], sources: Map<string, string>,
  inputPaths: Set<string>, markIncomplete: () => void, environment?: string): Promise<string | undefined> {
  if (environment && environment !== 'dev') return undefined;
  // An open source/config snapshot can be newer than its disk mtime, so compiled metadata cannot be authoritative.
  if ([...sources.keys()].some((path) => /^(?:src|config)[\\/]/.test(relative(root, path)))) return undefined;
  const directory = resolve(root, 'var/cache/dev'); let entries: string[];
  try { entries = (await readdir(directory)).filter((name) => /DebugContainer\.xml$/.test(name)); } catch { return undefined; }
  const candidates = await Promise.all(entries.map(async (name) => {
    const path = resolve(directory, name); try { return { path, modified: (await stat(path)).mtimeMs }; } catch { return undefined; }
  }));
  const selected = candidates.flatMap((item) => item ? [item] : []).sort((left, right) => right.modified - left.modified)[0]; if (!selected) return undefined;
  const configFiles = await filesBelow(resolve(root, 'config'));
  if (!configFiles.complete) { markIncomplete(); return undefined; }
  const dependencies = [...new Set([...projectTypes.map((item) => item.path).filter((path) => within(resolve(root, 'src'), path)),
    ...configFiles.files, resolve(root, 'composer.json'), resolve(root, 'composer.lock')])];
  for (const path of dependencies) inputPaths.add(resolve(path));
  const mtimes = await Promise.all(dependencies.map(async (path) => { try { return (await stat(path)).mtimeMs; } catch { return Number.POSITIVE_INFINITY; } }));
  return mtimes.every((modified) => modified <= selected.modified) ? selected.path : undefined;
}

/** Collect a complete static Symfony service graph without booting the project Kernel or executing project PHP. */
export async function collectSymfonyServiceFacts(rootPath: string, parser: PhpSyntaxParser,
  options: SymfonyServiceProviderOptions): Promise<SymfonyServiceProviderFacts> {
  const root = resolve(rootPath); const actualRoot = await realpath(root); const sources = snapshotSources(root, options.documents ?? []);
  const inputPaths = new Set<string>(); let inputEvidenceComplete = true; let complete = true;
  const sourceFor = async (path: string): Promise<string> => {
    inputPaths.add(resolve(path)); return sources.get(resolve(path)) ?? readFile(path, 'utf8');
  };
  const project = await loadComposerProject(root); const mappings = project ? allPsr4Mappings(project) : [];
  const roots = await bundleRoots(root, parser, options.projectTypes, mappings, sources, inputPaths,
    (inputEvidenceIncomplete) => { complete = false; if (inputEvidenceIncomplete) inputEvidenceComplete = false; });
  const catalog: SymfonyServiceFact[] = []; const methodArguments: SymfonyCompiledMethodArgumentFact[] = [];
  const propertyArguments: SymfonyCompiledPropertyArgumentFact[] = []; const parameters: Array<{ id: string; uri: string; start: number; end: number }> = [];
  const configuredPaths = new Set<string>();
  const compiled = await freshCompiledContainer(root, options.projectTypes, sources, inputPaths,
    () => { inputEvidenceComplete = false; }, options.environment);
  if (compiled) {
    try {
      const uri = pathToFileURL(compiled).toString(); const facts = analyzeSymfonyContainerXml(uri, await sourceFor(compiled));
      if (facts.complete) { catalog.push(...facts.services); methodArguments.push(...facts.methodArguments); propertyArguments.push(...facts.propertyArguments); }
    } catch { /* Static configuration remains available when compiled metadata is malformed. */ }
  }
  const loaded = new Set<string>(); const loading = new Set<string>(); let remaining = options.maxImports ?? 256;
  const load = async (input: string, depth = 0, containmentRoot = actualRoot): Promise<void> => {
    const path = resolve(input);
    if (loaded.has(path)) return;
    if (loading.has(path)) { complete = false; return; }
    if (depth > 32 || remaining-- <= 0) { inputEvidenceComplete = false; complete = false; return; }
    inputPaths.add(path);
    loading.add(path);
    try {
      const actual = await realpath(path); if (!within(containmentRoot, actual)) { complete = false; return; }
      configuredPaths.add(path);
      const uri = pathToFileURL(path).toString(); const source = await sourceFor(path); if (source.length > 1_000_000) { complete = false; return; }
      const extension = path.split('.').at(-1)?.toLowerCase();
      const facts = extension === 'xml' ? analyzeSymfonyServiceXml(uri, source, options.environment)
        : extension === 'php' ? analyzeSymfonyServicePhp(parser, uri, source, options.environment) : analyzeSymfonyServiceYaml(uri, source, options.environment);
      if (!facts.complete) { complete = false; return; }
      const parameterDeclarations = extension === 'php' ? symfonyPhpParameterDeclarations(parser, source, options.environment)
        : extension === 'xml' ? symfonyXmlParameterDeclarations(source, options.environment)
        : extension === 'yaml' || extension === 'yml' ? symfonyYamlParameterDeclarations(source, options.environment) : [];
      parameters.push(...parameterDeclarations.map((parameter) => ({ ...parameter, id: parameter.value, uri })));
      for (const imported of facts.imports ?? []) {
        const candidate = importedConfig(root, path, imported.resource, roots); if (!candidate) { complete = false; continue; }
        const realContainment = candidate.containmentRoot === root ? actualRoot : candidate.containmentRoot;
        await load(candidate.path, depth + 1, realContainment);
      }
      catalog.push(...expandSymfonyServiceResources(facts, [...options.projectTypes])); loaded.add(path);
    } catch (error) {
      if (depth > 0 || (error as NodeJS.ErrnoException).code !== 'ENOENT') complete = false;
    }
    finally { loading.delete(path); }
  };
  for (const filename of [...XML_CONFIGS, ...YAML_CONFIGS, ...PHP_CONFIGS]) await load(resolve(root, filename));
  const services = [...new Map(catalog.map((service) => [`${service.registrationUri}\0${service.id}`, service])).values()];
  return { complete: complete && inputEvidenceComplete, services, parameters: [...new Map(parameters.map((parameter) => [`${parameter.uri}\0${parameter.start}\0${parameter.end}`, parameter])).values()],
    methodArguments, propertyArguments, literalMethodReturns: symfonyContainerMethodReturnFacts(services),
    inputUris: [...inputPaths].sort().map((path) => pathToFileURL(path).toString()),
    inputEvidenceComplete,
    configurationUris: [...new Set([...configuredPaths, ...[...roots.values()].flatMap((bundle) => bundle.classPaths)])]
      .sort().map((path) => pathToFileURL(path).toString()) };
}

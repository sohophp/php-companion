import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, extname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

export interface Psr4Mapping {
  prefix: string;
  directories: string[];
  development: boolean;
}

export interface ComposerProject {
  root: string;
  composerPath: string;
  lockPath?: string;
  platformPhp?: string;
  lockPlatformPhp?: string;
  requiredPhp?: string;
  disabledExtensions: string[];
  psr4: Psr4Mapping[];
  psr0: Psr4Mapping[];
  classmap: string[];
  files: string[];
  excludeFromClassmap: string[];
  dependencies: ComposerDependency[];
  warnings: string[];
  /** Exact metadata consumed by this load; absent on manually constructed projects. */
  inputEvidence?: ComposerInputEvidence;
}

export type ComposerMetadataRead = { kind: 'source'; path: string; hash: string } | { kind: 'missing'; path: string };
export interface ComposerInputEvidence { complete: boolean; reads: ComposerMetadataRead[]; }

export interface ComposerDependency {
  name: string;
  root: string;
  development: boolean;
  psr4: Psr4Mapping[];
  psr0: Psr4Mapping[];
  classmap: string[];
  files: string[];
  excludeFromClassmap: string[];
}

function disabledPlatformExtensions(platform: unknown): string[] {
  if (!platform || typeof platform !== 'object' || Array.isArray(platform)) return [];
  return Object.entries(platform as Record<string, unknown>)
    .filter(([name, value]) => value === false && /^ext-[a-z0-9_.-]+$/i.test(name))
    .map(([name]) => name.slice(4).toLowerCase());
}

export interface ComposerRootDiscoveryOptions {
  maxDirectories?: number;
  maxProjects?: number;
  shouldContinue?: () => boolean;
}

export interface ComposerRootDiscoveryResult {
  roots: string[];
  directories: number;
  complete: boolean;
  warnings: string[];
}

export function allPsr4Mappings(project: ComposerProject): Psr4Mapping[] {
  return [...project.psr4, ...project.dependencies.flatMap((dependency) => dependency.psr4)];
}

export function allAutoloadPaths(project: ComposerProject): string[] {
  return [...new Set([...projectAutoloadPaths(project), ...dependencyAutoloadPaths(project)])];
}

export function projectAutoloadPaths(project: ComposerProject): string[] {
  return [...new Set([...project.psr4.flatMap((mapping) => mapping.directories), ...project.psr0.flatMap((mapping) => mapping.directories), ...project.classmap, ...project.files])];
}

export function dependencyAutoloadPaths(project: ComposerProject): string[] {
  return [...new Set(project.dependencies.flatMap((dependency) => [
    ...dependency.psr4.flatMap((mapping) => mapping.directories), ...dependency.psr0.flatMap((mapping) => mapping.directories), ...dependency.classmap, ...dependency.files,
  ]))];
}

function exclusionPattern(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  let source = '';
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]!;
    if (character === '*' && normalized[index + 1] === '*') { source += '.*'; index += 1; }
    else if (character === '*') source += '[^/]*';
    else source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}(?:$|/.*)`);
}

type ExclusionScope = { root: string; comparableRoot: string; comparablePrefix: string; patterns: RegExp[] };
const exclusionScopes = new WeakMap<ComposerProject, ExclusionScope[]>();

function comparablePath(path: string): string {
  return process.platform === 'win32' ? path.toLowerCase() : path;
}

function compiledExclusionScopes(project: ComposerProject): ExclusionScope[] {
  const cached = exclusionScopes.get(project); if (cached) return cached;
  const scopes = [{ root: project.root, patterns: project.excludeFromClassmap },
    ...project.dependencies.map((dependency) => ({ root: dependency.root, patterns: dependency.excludeFromClassmap }))]
    .flatMap(({ root, patterns }) => {
      const compiled = patterns.filter((pattern) => pattern.trim() !== '').map(exclusionPattern);
      const resolvedRoot = resolve(root); const comparableRoot = comparablePath(resolvedRoot);
      const comparablePrefix = comparableRoot.endsWith(sep) ? comparableRoot : `${comparableRoot}${sep}`;
      return compiled.length ? [{ root: resolvedRoot, comparableRoot, comparablePrefix, patterns: compiled }] : [];
    });
  exclusionScopes.set(project, scopes); return scopes;
}

function excludedInScope(resolvedFilePath: string, comparableFilePath: string, scope: ExclusionScope): boolean {
  if (comparableFilePath !== scope.comparableRoot && !comparableFilePath.startsWith(scope.comparablePrefix)) return false;
  const packageRelative = relative(scope.root, resolvedFilePath);
  if (packageRelative === '..' || packageRelative.startsWith(`..${sep}`) || isAbsolute(packageRelative)) return false;
  const portable = packageRelative.split(sep).join('/');
  return scope.patterns.some((pattern) => pattern.test(portable));
}

export function isAutoloadPathExcluded(project: ComposerProject, filePath: string): boolean {
  const resolvedFilePath = resolve(filePath);
  const comparableFilePath = comparablePath(resolvedFilePath);
  return compiledExclusionScopes(project).some((scope) => excludedInScope(resolvedFilePath, comparableFilePath, scope));
}

export function resolvePsr4Class(fqcn: string, mappings: Psr4Mapping[]): string[] {
  const normalized = fqcn.replace(/^\\+/, '');
  return mappings
    .filter((mapping) => normalized.startsWith(mapping.prefix))
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .flatMap((mapping) => {
      const relative = normalized.slice(mapping.prefix.length).replace(/\\/g, '/');
      return mapping.directories.map((directory) => join(directory, `${relative}.php`));
    });
}

export function resolvePsr4Namespaces(filePath: string, mappings: Psr4Mapping[]): string[] {
  if (extname(filePath).toLowerCase() !== '.php') return [];
  const candidates = mappings.flatMap((mapping) => mapping.directories.map((directory) => ({ mapping, directory: resolve(directory) })))
    .filter(({ directory }) => {
      const path = relative(directory, resolve(filePath));
      return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
    })
    .sort((left, right) => right.directory.length - left.directory.length);
  if (!candidates.length) return [];
  return [...new Set(candidates.map((candidate) => {
    const relativeDirectory = dirname(relative(candidate.directory, resolve(filePath)));
    const suffix = relativeDirectory === '.' ? '' : relativeDirectory.split(sep).filter(Boolean).join('\\');
    const prefix = candidate.mapping.prefix.replace(/^\\+|\\+$/g, '');
    return [prefix, suffix].filter(Boolean).join('\\');
  }))].sort();
}

export function resolvePsr4Namespace(filePath: string, mappings: Psr4Mapping[]): string | undefined {
  return resolvePsr4Namespaces(filePath, mappings)[0];
}

function recordMetadataRead(evidence: ComposerInputEvidence, read: ComposerMetadataRead): void {
  if (!evidence.complete) return;
  if (evidence.reads.length >= 4_096) { evidence.complete = false; return; }
  evidence.reads.push(read);
}

async function readJson(path: string, evidence: ComposerInputEvidence): Promise<Record<string, any> | undefined> {
  let source: Buffer;
  try {
    source = await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') recordMetadataRead(evidence, { kind: 'missing', path: resolve(path) });
    else evidence.complete = false;
    return undefined;
  }
  if (evidence.complete) recordMetadataRead(evidence, { kind: 'source', path: resolve(path), hash: createHash('sha256').update(source).digest('hex') });
  try { return JSON.parse(source.toString('utf8')) as Record<string, any>; }
  catch { return undefined; }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

export async function discoverComposerRoots(workspaceRoot: string, options: ComposerRootDiscoveryOptions = {}): Promise<ComposerRootDiscoveryResult> {
  const maxDirectories = options.maxDirectories ?? 10_000; const maxProjects = options.maxProjects ?? 100;
  const roots: string[] = []; const pending = [resolve(workspaceRoot)]; let directories = 0;
  const ignored = new Set(['.git', '.hg', '.svn', '.vscode-test', 'build', 'cache', 'coverage', 'dist', 'node_modules', 'tmp', 'var', 'vendor']);
  while (pending.length) {
    if (options.shouldContinue?.() === false) return { roots, directories, complete: false, warnings: ['Composer project discovery was cancelled.'] };
    if (directories >= maxDirectories) return { roots, directories, complete: false, warnings: [`Composer project discovery exceeded ${maxDirectories} directories.`] };
    const directory = pending.pop()!; directories += 1;
    let entries; try { entries = await readdir(directory, { withFileTypes: true }); } catch { continue; }
    entries.sort((left, right) => right.name.localeCompare(left.name));
    if (entries.some((entry) => entry.isFile() && entry.name === 'composer.json')) {
      roots.push(directory);
      if (roots.length >= maxProjects) return { roots: roots.sort(), directories, complete: false, warnings: [`Composer project discovery reached ${maxProjects} projects.`] };
    }
    for (const entry of entries) if (entry.isDirectory() && !ignored.has(entry.name)) pending.push(join(directory, entry.name));
  }
  return { roots: roots.sort(), directories, complete: true, warnings: [] };
}

async function installedPackageRoots(vendorDirectory: string, evidence: ComposerInputEvidence): Promise<Map<string, string>> {
  const installedPath = join(vendorDirectory, 'composer', 'installed.json'); const data = await readJson(installedPath, evidence);
  const packages = Array.isArray(data) ? data.flatMap((entry) => Array.isArray(entry?.packages) ? entry.packages : []) : (Array.isArray(data?.packages) ? data.packages : []);
  return new Map(packages.flatMap((item: Record<string, unknown>): Array<[string, string]> => {
    if (typeof item.name !== 'string' || typeof item.install_path !== 'string') return [];
    return [[item.name.toLowerCase(), resolve(dirname(installedPath), item.install_path)]];
  }));
}

export async function findComposerRoot(startPath: string, boundary?: string): Promise<string | undefined> {
  let current = resolve(startPath);
  try {
    if ((await stat(current)).isFile()) current = dirname(current);
  } catch {
    current = dirname(current);
  }
  const stop = boundary ? resolve(boundary) : parse(current).root;
  while (true) {
    if (await isFile(join(current, 'composer.json'))) return current;
    if (current === stop || current === parse(current).root) return undefined;
    current = dirname(current);
  }
}

function collectMapping(root: string, section: unknown, key: 'psr-4' | 'psr-0', development: boolean): Psr4Mapping[] {
  if (!section || typeof section !== 'object') return [];
  const mapping = (section as Record<string, unknown>)[key];
  if (!mapping || typeof mapping !== 'object') return [];
  return Object.entries(mapping as Record<string, unknown>).flatMap(([prefix, value]) => {
    const values = Array.isArray(value) ? value : [value];
    const directories = values
      .filter((item): item is string => typeof item === 'string')
      .map((item) => isAbsolute(item) ? item : resolve(root, item));
    return directories.length ? [{ prefix, directories, development }] : [];
  });
}

function collectPaths(root: string, section: unknown, key: 'classmap' | 'files' | 'exclude-from-classmap'): string[] {
  if (!section || typeof section !== 'object') return [];
  const values = (section as Record<string, unknown>)[key];
  return (Array.isArray(values) ? values : []).filter((item): item is string => typeof item === 'string')
    .map((item) => key === 'exclude-from-classmap' ? item : (isAbsolute(item) ? item : resolve(root, item)));
}

export async function loadComposerProject(root: string, includeDev = true): Promise<ComposerProject | undefined> {
  const inputEvidence: ComposerInputEvidence = { complete: true, reads: [] };
  const composerPath = join(root, 'composer.json');
  const composer = await readJson(composerPath, inputEvidence);
  if (!composer) return undefined;
  const lockPathCandidate = join(root, 'composer.lock');
  const lock = await readJson(lockPathCandidate, inputEvidence);
  const warnings: string[] = [];
  const psr4 = [
    ...collectMapping(root, composer.autoload, 'psr-4', false),
    ...(includeDev ? collectMapping(root, composer['autoload-dev'], 'psr-4', true) : []),
  ];
  const psr0 = [...collectMapping(root, composer.autoload, 'psr-0', false), ...(includeDev ? collectMapping(root, composer['autoload-dev'], 'psr-0', true) : [])];
  const classmap = [...collectPaths(root, composer.autoload, 'classmap'), ...(includeDev ? collectPaths(root, composer['autoload-dev'], 'classmap') : [])];
  const files = [...collectPaths(root, composer.autoload, 'files'), ...(includeDev ? collectPaths(root, composer['autoload-dev'], 'files') : [])];
  const excludeFromClassmap = [...collectPaths(root, composer.autoload, 'exclude-from-classmap'), ...(includeDev ? collectPaths(root, composer['autoload-dev'], 'exclude-from-classmap') : [])];
  if (psr4.length === 0) warnings.push('No PSR-4 autoload mappings found.');
  const vendorDirectory = typeof composer.config?.['vendor-dir'] === 'string'
    ? (isAbsolute(composer.config['vendor-dir']) ? composer.config['vendor-dir'] : resolve(root, composer.config['vendor-dir']))
    : join(root, 'vendor');
  const lockedPackages = [
    ...(Array.isArray(lock?.packages) ? lock.packages.map((item: Record<string, unknown>) => ({ item, development: false })) : []),
    ...(includeDev && Array.isArray(lock?.['packages-dev']) ? lock['packages-dev'].map((item: Record<string, unknown>) => ({ item, development: true })) : []),
  ];
  const installedRoots = await installedPackageRoots(vendorDirectory, inputEvidence);
  const dependencies: ComposerDependency[] = [];
  for (const { item, development } of lockedPackages) {
    if (typeof item.name !== 'string' || !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(item.name)) continue;
    const packageRoot = installedRoots.get(item.name.toLowerCase()) ?? resolve(vendorDirectory, item.name);
    const installed = await readJson(join(packageRoot, 'composer.json'), inputEvidence);
    const autoload = installed?.autoload ?? item.autoload;
    const dependencyPsr4 = collectMapping(packageRoot, autoload, 'psr-4', development);
    dependencies.push({ name: item.name, root: packageRoot, development, psr4: dependencyPsr4, psr0: collectMapping(packageRoot, autoload, 'psr-0', development), classmap: collectPaths(packageRoot, autoload, 'classmap'), files: collectPaths(packageRoot, autoload, 'files'), excludeFromClassmap: collectPaths(packageRoot, autoload, 'exclude-from-classmap') });
  }

  return {
    root,
    composerPath,
    lockPath: lock ? lockPathCandidate : undefined,
    platformPhp: typeof composer.config?.platform?.php === 'string' ? composer.config.platform.php : undefined,
    lockPlatformPhp: typeof lock?.['platform-overrides']?.php === 'string' ? lock['platform-overrides'].php : undefined,
    requiredPhp: typeof composer.require?.php === 'string' ? composer.require.php : undefined,
    disabledExtensions: [...new Set([
      ...disabledPlatformExtensions(composer.config?.platform),
      ...disabledPlatformExtensions(lock?.['platform-overrides']),
    ])].sort(),
    psr4,
    psr0,
    classmap,
    files,
    excludeFromClassmap,
    dependencies,
    warnings,
    inputEvidence,
  };
}

import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyzeSymfonyControllerContexts } from '@php-companion/framework-symfony';
import type { ControllerTemplateContext } from '@php-companion/interop';
import type { PhpSyntaxParser } from '@php-companion/parser';
import type { SemanticProviderDocument, SemanticProviderProjectType } from '@php-companion/semantic-provider';

export interface SymfonyControllerContextProviderOptions {
  projectTypes: readonly SemanticProviderProjectType[];
  documents?: readonly SemanticProviderDocument[];
  snapshotVersion: string;
  maxFiles?: number;
  maxTotalBytes?: number;
}
export interface SymfonyControllerContextProviderFacts {
  contexts: ControllerTemplateContext[];
  sourceUris: string[];
}
interface ProjectSource { path: string; uri: string; source: string; snapshotVersion: string; }

function within(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return local === '' || (!isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`));
}

async function resolvedSourcePath(path: string, allowMissing: boolean): Promise<string> {
  try { return await realpath(path); }
  catch (error) {
    if (!allowMissing || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    let parent = dirname(path);
    for (;;) {
      try { return await realpath(parent); }
      catch (parentError) {
        if ((parentError as NodeJS.ErrnoException).code !== 'ENOENT' || parent === dirname(parent)) throw parentError;
        parent = dirname(parent);
      }
    }
  }
}

async function composerFunctionFiles(root: string): Promise<string[]> {
  let source: string;
  try { source = await readFile(join(root, 'composer.json'), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  if (source.length > 1_000_000) return [];
  let manifest: unknown;
  try { manifest = JSON.parse(source); } catch { return []; }
  if (!manifest || typeof manifest !== 'object') return [];
  const sections = ['autoload', 'autoload-dev'].map((key) => (manifest as Record<string, unknown>)[key]);
  return sections.flatMap((section) => {
    if (!section || typeof section !== 'object') return [];
    const files = (section as Record<string, unknown>).files;
    return Array.isArray(files) ? files.filter((file): file is string => typeof file === 'string'
      && file.length > 0 && !isAbsolute(file)).map((file) => resolve(root, file)).filter((file) => within(root, file)) : [];
  });
}

async function projectSources(root: string, canonicalRoot: string, types: readonly SemanticProviderProjectType[], documents: readonly SemanticProviderDocument[],
  snapshotVersion: string, maxFiles: number, maxTotalBytes: number): Promise<ProjectSource[]> {
  const snapshots = new Map<string, SemanticProviderDocument>();
  for (const document of documents) {
    if (document.languageId !== 'php') continue;
    try { const path = resolve(fileURLToPath(document.uri)); if (within(root, path)) snapshots.set(path, document); }
    catch { const type = types.find((candidate) => candidate.uri === document.uri); if (type) snapshots.set(resolve(type.path), document); }
  }
  const unique = new Map<string, string>();
  for (const type of types) {
    const path = resolve(type.path); if (!within(root, path)) throw new Error(`Project type path escapes the project root: ${type.path}`);
    if (!unique.has(path)) unique.set(path, type.uri || pathToFileURL(path).toString());
  }
  for (const path of await composerFunctionFiles(root)) if (!unique.has(path)) unique.set(path, pathToFileURL(path).toString());
  for (const [path, document] of snapshots) if (!unique.has(path)) unique.set(path, document.uri);
  if (unique.size > maxFiles) throw new Error(`Symfony controller source count exceeds ${maxFiles}.`);
  const result: ProjectSource[] = []; let bytes = 0;
  for (const [path, uri] of [...unique].sort(([left], [right]) => left.localeCompare(right))) {
    const snapshot = snapshots.get(path);
    const actual = await resolvedSourcePath(path, Boolean(snapshot));
    if (!within(canonicalRoot, actual)) throw new Error(`Project type resolves outside the project root: ${path}`);
    const source = snapshot?.source ?? await readFile(actual, 'utf8');
    bytes += Buffer.byteLength(source); if (source.length > 1_000_000 || bytes > maxTotalBytes) {
      throw new Error(`Symfony controller source budget exceeds ${maxTotalBytes} bytes.`);
    }
    result.push({ path, uri: snapshot?.uri ?? uri, source, snapshotVersion: snapshot?.snapshotVersion ?? snapshotVersion });
  }
  return result;
}

/** Collect literal Symfony render contexts without booting the project Kernel or executing project PHP. */
export async function collectSymfonyControllerContexts(rootPath: string, parser: PhpSyntaxParser,
  options: SymfonyControllerContextProviderOptions): Promise<SymfonyControllerContextProviderFacts> {
  const root = resolve(rootPath);
  const canonicalRoot = await realpath(root);
  const sources = await projectSources(root, canonicalRoot, options.projectTypes, options.documents ?? [], options.snapshotVersion,
    options.maxFiles ?? 10_000, options.maxTotalBytes ?? 128 * 1024 * 1024);
  const projectFunctions = new Set<string>();
  for (const { source, uri } of sources) {
    if (!/\bfunction\b/i.test(source) || !/\bcompact\b/i.test(source)) continue;
    const parsed = parser.parse(source, undefined, uri);
    try {
      for (const callable of parsed.callables) if (callable.kind === 'function' && callable.name.toLowerCase() === 'compact') {
        projectFunctions.add(callable.fqcn.toLowerCase());
      }
    } finally { parsed.tree.delete(); }
  }
  const contexts = sources.filter(({ source }) => /render|template/i.test(source)).flatMap(({ uri, source, snapshotVersion }) =>
    analyzeSymfonyControllerContexts(parser, { uri, source, snapshotVersion }, projectFunctions));
  return { contexts, sourceUris: sources.map((source) => source.uri) };
}

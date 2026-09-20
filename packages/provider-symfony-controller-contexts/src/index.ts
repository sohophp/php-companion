import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
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

async function projectSources(root: string, types: readonly SemanticProviderProjectType[], documents: readonly SemanticProviderDocument[],
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
  if (unique.size > maxFiles) throw new Error(`Symfony controller source count exceeds ${maxFiles}.`);
  const result: ProjectSource[] = []; let bytes = 0;
  for (const [path, uri] of [...unique].sort(([left], [right]) => left.localeCompare(right))) {
    const actual = await realpath(path); if (!within(root, actual)) throw new Error(`Project type resolves outside the project root: ${path}`);
    const snapshot = snapshots.get(path); const source = snapshot?.source ?? await readFile(actual, 'utf8');
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
  const root = await realpath(resolve(rootPath));
  const sources = await projectSources(root, options.projectTypes, options.documents ?? [], options.snapshotVersion,
    options.maxFiles ?? 10_000, options.maxTotalBytes ?? 128 * 1024 * 1024);
  const contexts = sources.filter(({ source }) => source.includes('render')).flatMap(({ uri, source, snapshotVersion }) =>
    analyzeSymfonyControllerContexts(parser, { uri, source, snapshotVersion }));
  return { contexts, sourceUris: sources.map((source) => source.uri) };
}

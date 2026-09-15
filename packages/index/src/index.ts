import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { dependencyAutoloadPaths, isAutoloadPathExcluded, loadComposerProject, projectAutoloadPaths } from '@php-companion/project';

export { DocumentKeyIndex, DEFAULT_DOCUMENT_KEY_INDEX_LIMITS,
  type DocumentKeyIndexLimits, type DocumentKeyIndexStats } from './inverted.js';
export { DocumentDependencyGraph, DEFAULT_DOCUMENT_DEPENDENCY_GRAPH_LIMITS,
  type DependencyNode, type DocumentDependencyGraphLimits, type DocumentDependencyGraphStats } from './dependency.js';

export interface ProjectIndexLimits { maxFiles: number; maxFileSizeBytes: number; maxTotalBytes: number; }
export interface ProjectIndexResult { files: number; bytes: number; cached: number; complete: boolean; projectComplete: boolean; warnings: string[]; }
export interface IndexedSource { uri: string; path: string; source: string; bytes: number; }
export interface ProjectIndexCacheOptions { directory: string; version: string; restore: (payload: unknown, source: Omit<IndexedSource, 'source'>) => boolean | Promise<boolean>; }
export interface ProjectIndexOptions { limits?: ProjectIndexLimits; shouldContinue?: () => boolean; uriForPath?: (path: string) => string; onSource: (source: IndexedSource) => unknown | Promise<unknown>; yieldEvery?: number; cache?: ProjectIndexCacheOptions; }
export const DEFAULT_INDEX_LIMITS: ProjectIndexLimits = { maxFiles: 10_000, maxFileSizeBytes: 512 * 1024, maxTotalBytes: 128 * 1024 * 1024 };

function validateLimits(limits: ProjectIndexLimits): void {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive safe integer.`);
  }
}

async function phpFiles(directory: string, output: Set<string>, limit: number, include: (path: string) => boolean, shouldContinue?: () => boolean): Promise<boolean> {
  if (shouldContinue?.() === false) return false;
  if (output.size >= limit) return true;
  let entries; try { entries = await readdir(directory, { withFileTypes: true }); } catch { return true; }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (shouldContinue?.() === false) return false;
    if (output.size >= limit) return true;
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !await phpFiles(path, output, limit, include, shouldContinue)) return false;
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.php') && include(path)) output.add(path);
  }
  return true;
}

export async function indexComposerSources(root: string, options: ProjectIndexOptions): Promise<ProjectIndexResult> {
  const limits = options.limits ?? DEFAULT_INDEX_LIMITS; const project = await loadComposerProject(root);
  validateLimits(limits);
  if (!project) return { files: 0, bytes: 0, cached: 0, complete: true, projectComplete: true, warnings: ['composer.json was not readable.'] };
  const warnings = [...project.warnings];
  const cachePath = options.cache ? join(options.cache.directory, `${createHash('sha256').update(root).digest('hex')}.json`) : undefined;
  type CacheEntry = { size: number; mtimeMs: number; payload: unknown };
  let previous = new Map<string, CacheEntry>();
  if (cachePath && options.cache) {
    try {
      const data = JSON.parse(await readFile(cachePath, 'utf8')) as { schema?: number; version?: string; root?: string; entries?: Record<string, CacheEntry> };
      if (data.schema === 1 && data.version === options.cache.version && data.root === root && data.entries) previous = new Map(Object.entries(data.entries));
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') warnings.push('Persistent index cache was unreadable and will be rebuilt.'); }
  }
  const projectCandidates = new Set<string>(); const dependencyCandidates = new Set<string>();
  const include = (path: string): boolean => !isAutoloadPathExcluded(project, path);
  for (const path of projectAutoloadPaths(project)) {
    if (options.shouldContinue?.() === false) return { files: 0, bytes: 0, cached: 0, complete: false, projectComplete: false, warnings: [...warnings, 'Project indexing was cancelled.'] };
    let info; try { info = await stat(path); } catch { continue; }
    if (info.isDirectory() && !await phpFiles(path, projectCandidates, limits.maxFiles + 1, include, options.shouldContinue)) return { files: 0, bytes: 0, cached: 0, complete: false, projectComplete: false, warnings: [...warnings, 'Project indexing was cancelled.'] };
    else if (info.isFile() && path.toLowerCase().endsWith('.php') && include(path)) projectCandidates.add(path);
  }
  const projectFiles = [...projectCandidates];
  if (projectFiles.length > limits.maxFiles) return { files: 0, bytes: 0, cached: 0, complete: false, projectComplete: false, warnings: [...warnings, `Project source index exceeded ${limits.maxFiles} files.`] };
  const remaining = limits.maxFiles - projectFiles.length;
  for (const path of dependencyAutoloadPaths(project)) {
    if (options.shouldContinue?.() === false) return { files: 0, bytes: 0, cached: 0, complete: false, projectComplete: false, warnings: [...warnings, 'Project indexing was cancelled.'] };
    let info; try { info = await stat(path); } catch { continue; }
    if (info.isDirectory() && !await phpFiles(path, dependencyCandidates, limits.maxFiles + 1, include, options.shouldContinue)) return { files: 0, bytes: 0, cached: 0, complete: false, projectComplete: false, warnings: [...warnings, 'Project indexing was cancelled.'] };
    else if (info.isFile() && path.toLowerCase().endsWith('.php') && include(path)) dependencyCandidates.add(path);
  }
  const projectFileSet = new Set(projectFiles); const uniqueDependencies = [...dependencyCandidates].filter((path) => !projectFileSet.has(path));
  const dependencyTruncatedByCount = uniqueDependencies.length > remaining;
  const files = [...projectFiles.map((path) => ({ path, project: true })), ...uniqueDependencies.slice(0, remaining).map((path) => ({ path, project: false }))];
  if (dependencyTruncatedByCount) warnings.push(`Dependency index was truncated to fit the ${limits.maxFiles}-file budget after indexing ${projectFiles.length} project files.`);
  let bytes = 0; let indexed = 0; let cached = 0; const next = new Map<string, CacheEntry>();
  let projectIncomplete = false; let dependencyIncomplete = dependencyTruncatedByCount;
  const skipped = (candidate: { path: string; project: boolean }, reason: string): void => {
    if (candidate.project) projectIncomplete = true; else dependencyIncomplete = true;
    warnings.push(`${candidate.project ? 'Project source' : 'Dependency source'} ${candidate.path} ${reason}`);
  };
  for (const candidate of files) {
    const path = candidate.path;
    if (options.shouldContinue?.() === false) return { files: indexed, bytes, cached, complete: false, projectComplete: false, warnings: [...warnings, 'Project indexing was cancelled.'] };
    let info; try { info = await stat(path); } catch { skipped(candidate, 'could not be inspected and was skipped.'); continue; } const size = info.size;
    if (size > limits.maxFileSizeBytes) { skipped(candidate, `exceeded the ${limits.maxFileSizeBytes}-byte per-file budget and was skipped.`); continue; }
    if (bytes + size > limits.maxTotalBytes) {
      if (candidate.project) return { files: indexed, bytes, cached, complete: false, projectComplete: false, warnings: [...warnings, `Project source index exceeded ${limits.maxTotalBytes} bytes.`] };
      dependencyIncomplete = true; warnings.push(`Dependency index was truncated to fit the ${limits.maxTotalBytes}-byte budget.`); break;
    }
    try {
      const uri = options.uriForPath?.(path) ?? pathToFileURL(path).toString(); const old = previous.get(path);
      let restored = false;
      if (old && old.size === size && old.mtimeMs === info.mtimeMs && options.cache) {
        try { restored = await options.cache.restore(old.payload, { uri, path, bytes: size }); }
        catch { warnings.push(`Persistent index entry for ${path} was rejected and rebuilt.`); }
      }
      if (old && restored) {
        next.set(path, old); cached += 1; bytes += size; indexed += 1;
        if (indexed % (options.yieldEvery ?? 50) === 0) await new Promise<void>((resolve) => setImmediate(resolve));
        continue;
      }
      const source = await readFile(path, 'utf8'); const payload = await options.onSource({ uri, path, source, bytes: size });
      if (payload !== undefined) next.set(path, { size, mtimeMs: info.mtimeMs, payload });
      bytes += size; indexed += 1;
      if (indexed % (options.yieldEvery ?? 50) === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    } catch { skipped(candidate, 'could not be read or analyzed and was skipped.'); }
  }
  if (cachePath && options.cache) {
    try { await mkdir(options.cache.directory, { recursive: true }); const temporary = `${cachePath}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify({ schema: 1, version: options.cache.version, root, entries: Object.fromEntries(next) })); await rename(temporary, cachePath); }
    catch { warnings.push('Persistent index cache could not be written.'); }
  }
  return { files: indexed, bytes, cached, complete: !projectIncomplete && !dependencyIncomplete, projectComplete: !projectIncomplete, warnings };
}

import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { dependencyAutoloadPaths, isAutoloadPathExcluded, loadComposerProject, projectAutoloadPaths, type ComposerProject } from '@php-companion/project';

export { DocumentKeyIndex, DEFAULT_DOCUMENT_KEY_INDEX_LIMITS,
  type DocumentKeyIndexLimits, type DocumentKeyIndexStats } from './inverted.js';
export { DocumentDependencyGraph, DEFAULT_DOCUMENT_DEPENDENCY_GRAPH_LIMITS,
  type DependencyNode, type DocumentDependencyGraphLimits, type DocumentDependencyGraphStats } from './dependency.js';
export { createSourceCandidateSummary, sourceCandidateSummaryDecision,
  type SourceCandidateMode, type SourceCandidateSummary, type SourceCandidateSummaryDecision } from './source-candidates.js';

export interface ProjectIndexLimits { maxFiles: number; maxFileSizeBytes: number; maxTotalBytes: number; }
export interface ProjectIndexResult { files: number; bytes: number; cached: number; complete: boolean; projectComplete: boolean; warnings: string[]; }
export interface IndexedSource { uri: string; path: string; source: string; bytes: number; hash: string; prepared?: unknown; }
export type ProjectIndexCacheRestoreResult = boolean | 'source';
export interface ProjectIndexCacheOptions { directory: string; version: string; key?: string; prepareRestore?: (payload: unknown, source: Omit<IndexedSource, 'source'>) => unknown | Promise<unknown>; finalizePayload?: (payload: unknown) => unknown | Promise<unknown>; restore: (payload: unknown, source: Omit<IndexedSource, 'source'>, prepared?: unknown) => ProjectIndexCacheRestoreResult | Promise<ProjectIndexCacheRestoreResult>; }
export interface IndexProgress { files: number; cached: number; total: number; phase: 'project' | 'dependencies'; }
export interface ProjectIndexOptions { onProgress?: (progress: IndexProgress) => void; limits?: ProjectIndexLimits; shouldContinue?: () => boolean; uriForPath?: (path: string) => string; onSource: (source: IndexedSource) => unknown | Promise<unknown>; prepareSource?: (source: IndexedSource) => unknown | Promise<unknown>; onProjectComplete?: () => unknown | Promise<unknown>; includeDependencies?: boolean; yieldEvery?: number; readConcurrency?: number; cache?: ProjectIndexCacheOptions; project?: ComposerProject; }
export const DEFAULT_INDEX_LIMITS: ProjectIndexLimits = { maxFiles: 10_000, maxFileSizeBytes: 512 * 1024, maxTotalBytes: 128 * 1024 * 1024 };

function validateLimits(limits: ProjectIndexLimits): void {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive safe integer.`);
  }
}

async function phpFiles(directory: string, output: Set<string>, limit: number, include: (path: string) => boolean, shouldContinue?: () => boolean): Promise<boolean> {
  if (shouldContinue?.() === false) return false;
  if (output.size >= limit) return true;
  let entries; try { entries = await readdir(directory, { recursive: true, withFileTypes: true }); } catch { return true; }
  const files = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.php'))
    .map((entry) => join(entry.parentPath, entry.name)).sort((left, right) => left.localeCompare(right));
  for (const path of files) {
    if (shouldContinue?.() === false) return false;
    if (output.size >= limit) return true;
    if (include(path)) output.add(path);
  }
  return true;
}

export async function indexComposerSources(root: string, options: ProjectIndexOptions): Promise<ProjectIndexResult> {
  const limits = options.limits ?? DEFAULT_INDEX_LIMITS; const project = options.project ?? await loadComposerProject(root);
  validateLimits(limits);
  const readConcurrency = options.readConcurrency ?? 1;
  if (!Number.isSafeInteger(readConcurrency) || readConcurrency < 1 || readConcurrency > 64) throw new RangeError('readConcurrency must be a safe integer between 1 and 64.');
  if (!project) return { files: 0, bytes: 0, cached: 0, complete: true, projectComplete: true, warnings: ['composer.json was not readable.'] };
  const warnings = [...project.warnings];
  const cacheIdentity = options.cache?.key === undefined ? root : `${root}\0${options.cache.key}`;
  const cachePath = options.cache ? join(options.cache.directory, `${createHash('sha256').update(cacheIdentity).digest('hex')}.json`) : undefined;
  type CacheEntry = { size: number; mtimeMs: number; ctimeMs?: number; hash: string; payload: unknown };
  let previous = new Map<string, CacheEntry>();
  if (cachePath && options.cache) {
    try {
      const data = JSON.parse(await readFile(cachePath, 'utf8')) as { schema?: number; version?: string; root?: string; entries?: Record<string, CacheEntry> };
      if (data.schema === 1 && data.version === options.cache.version && data.root === root && data.entries) previous = new Map(Object.entries(data.entries));
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') warnings.push('Persistent index cache was unreadable and will be rebuilt.'); }
  }
  const projectCandidates = new Set<string>();
  const include = (path: string): boolean => !isAutoloadPathExcluded(project, path);
  for (const path of projectAutoloadPaths(project)) {
    if (options.shouldContinue?.() === false) return { files: 0, bytes: 0, cached: 0, complete: false, projectComplete: false, warnings: [...warnings, 'Project indexing was cancelled.'] };
    let info; try { info = await stat(path); } catch { continue; }
    if (info.isDirectory() && !await phpFiles(path, projectCandidates, limits.maxFiles + 1, include, options.shouldContinue)) return { files: 0, bytes: 0, cached: 0, complete: false, projectComplete: false, warnings: [...warnings, 'Project indexing was cancelled.'] };
    else if (info.isFile() && path.toLowerCase().endsWith('.php') && include(path)) projectCandidates.add(path);
  }
  const projectFiles = [...projectCandidates];
  if (projectFiles.length > limits.maxFiles) return { files: 0, bytes: 0, cached: 0, complete: false, projectComplete: false, warnings: [...warnings, `Project source index exceeded ${limits.maxFiles} files.`] };
  let bytes = 0; let indexed = 0; let cached = 0; let cacheChanged = false; const next = new Map<string, CacheEntry>();
  const pendingPayloads: Promise<void>[] = [];
  let projectIncomplete = false; let dependencyIncomplete = false;
  const skipped = (candidate: { path: string; project: boolean }, reason: string): void => {
    if (candidate.project) projectIncomplete = true; else dependencyIncomplete = true;
    warnings.push(`${candidate.project ? 'Project source' : 'Dependency source'} ${candidate.path} ${reason}`);
  };
  type PrefetchedSource = { info?: { size: number; mtimeMs: number; ctimeMs: number }; source?: string; hash?: string; prepared?: unknown; preparedRestore?: unknown; inspectFailed?: boolean; readFailed?: boolean };
  const prefetch = async (path: string): Promise<PrefetchedSource> => {
    let information;
    try { information = await stat(path); } catch { return { inspectFailed: true }; }
    const info = { size: information.size, mtimeMs: information.mtimeMs, ctimeMs: information.ctimeMs };
    if (info.size > limits.maxFileSizeBytes) return { info };
    const old = previous.get(path);
    if (options.cache && old && old.size === info.size && old.mtimeMs === info.mtimeMs && old.ctimeMs === info.ctimeMs) {
      if (!options.cache.prepareRestore || options.shouldContinue?.() === false) return { info };
      try {
        const uri = options.uriForPath?.(path) ?? pathToFileURL(path).toString();
        return { info, preparedRestore: await options.cache.prepareRestore(old.payload, { uri, path, bytes: info.size, hash: old.hash }) };
      } catch { return { info }; }
    }
    if (options.cache && !options.prepareSource) return { info };
    let source: string; try { source = await readFile(path, 'utf8'); } catch { return { info, readFailed: true }; }
    if (!options.prepareSource || options.shouldContinue?.() === false) return { info, source };
    const uri = options.uriForPath?.(path) ?? pathToFileURL(path).toString();
    const hash = createHash('sha256').update(source).digest('hex');
    try { return { info, source, hash, prepared: await options.prepareSource({ uri, path, source, bytes: info.size, hash }) }; }
    catch { return { info, source, hash }; }
  };
  const indexCandidate = async (candidate: { path: string; project: boolean }, progressTotal: number,
    prefetched?: PrefetchedSource): Promise<'indexed' | 'skipped' | 'cancelled' | 'budget'> => {
    const path = candidate.path;
    if (options.shouldContinue?.() === false) return 'cancelled';
    let info;
    if (prefetched?.inspectFailed) { skipped(candidate, 'could not be inspected and was skipped.'); return 'skipped'; }
    try { info = prefetched?.info ?? await stat(path); } catch { skipped(candidate, 'could not be inspected and was skipped.'); return 'skipped'; } const size = info.size;
    if (size > limits.maxFileSizeBytes) { skipped(candidate, `exceeded the ${limits.maxFileSizeBytes}-byte per-file budget and was skipped.`); return 'skipped'; }
    if (bytes + size > limits.maxTotalBytes) {
      if (candidate.project) warnings.push(`Project source index exceeded ${limits.maxTotalBytes} bytes.`);
      else warnings.push(`Dependency index was truncated to fit the ${limits.maxTotalBytes}-byte budget.`);
      if (candidate.project) projectIncomplete = true; else dependencyIncomplete = true;
      return 'budget';
    }
    try {
      const uri = options.uriForPath?.(path) ?? pathToFileURL(path).toString(); const old = previous.get(path); let restoreAttempted = false;
      if (old && old.size === size && old.mtimeMs === info.mtimeMs && old.ctimeMs === info.ctimeMs && options.cache) {
        restoreAttempted = true;
        try {
          const decision = await options.cache.restore(old.payload, { uri, path, bytes: size, hash: old.hash }, prefetched?.preparedRestore);
          if (decision === true) {
            next.set(path, old); cached += 1; bytes += size; indexed += 1;
            options.onProgress?.({ files: indexed, cached, total: progressTotal, phase: candidate.project ? 'project' : 'dependencies' });
            if (indexed % (options.yieldEvery ?? 10) === 0) await new Promise<void>((resolve) => setImmediate(resolve));
            return 'indexed';
          }
        } catch { warnings.push(`Persistent index entry for ${path} was rejected and rebuilt.`); }
      }
      if (prefetched?.readFailed) throw new Error('Source prefetch failed.');
      const source = prefetched?.source ?? await readFile(path, 'utf8');
      const hash = prefetched?.hash ?? createHash('sha256').update(source).digest('hex');
      let restored = false;
      if (!restoreAttempted && old && old.size === size && old.hash === hash && options.cache) {
        try { restored = await options.cache.restore(old.payload, { uri, path, bytes: size, hash }) === true; }
        catch { warnings.push(`Persistent index entry for ${path} was rejected and rebuilt.`); }
      }
      if (old && restored) {
        next.set(path, { ...old, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs }); cacheChanged = true; cached += 1; bytes += size; indexed += 1;
        options.onProgress?.({ files: indexed, cached, total: progressTotal, phase: candidate.project ? 'project' : 'dependencies' });
      if (indexed % (options.yieldEvery ?? 10) === 0) await new Promise<void>((resolve) => setImmediate(resolve));
        return 'indexed';
      }
      const payload = await options.onSource({ uri, path, source, bytes: size, hash, prepared: prefetched?.prepared });
      if (payload !== undefined) {
        const entry: CacheEntry = { size, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs, hash, payload };
        next.set(path, entry); cacheChanged = true;
        if (options.cache?.finalizePayload) {
          const finish = Promise.resolve().then(() => options.cache!.finalizePayload!(payload))
            .then((finalized) => { if (finalized === undefined) next.delete(path); else entry.payload = finalized; })
            .catch(() => { next.delete(path); warnings.push(`Persistent index entry for ${path} could not be finalized.`); });
          pendingPayloads.push(finish);
        }
      }
      bytes += size; indexed += 1;
      options.onProgress?.({ files: indexed, cached, total: progressTotal, phase: candidate.project ? 'project' : 'dependencies' });
      if (indexed % (options.yieldEvery ?? 10) === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    } catch { skipped(candidate, 'could not be read or analyzed and was skipped.'); }
    return 'indexed';
  };
  for (let start = 0; start < projectFiles.length; start += readConcurrency) {
    const paths = projectFiles.slice(start, start + readConcurrency);
    const sources = readConcurrency === 1 ? [undefined] : await Promise.all(paths.map(prefetch));
    for (const [index, path] of paths.entries()) {
      const status = await indexCandidate({ path, project: true }, projectFiles.length, sources[index]);
      if (status === 'cancelled') return { files: indexed, bytes, cached, complete: false, projectComplete: false, warnings: [...warnings, 'Project indexing was cancelled.'] };
      if (status === 'budget') return { files: indexed, bytes, cached, complete: false, projectComplete: false, warnings };
    }
  }
  if (!projectIncomplete && options.shouldContinue?.() !== false) await options.onProjectComplete?.();
  if (options.shouldContinue?.() === false) return { files: indexed, bytes, cached, complete: false, projectComplete: !projectIncomplete, warnings: [...warnings, 'Project indexing was cancelled.'] };
  const commitCache = async (): Promise<void> => {
    if (!cachePath || !options.cache) return;
    await Promise.all(pendingPayloads);
    if (!cacheChanged && previous.size === next.size && [...next].every(([path, entry]) => previous.get(path) === entry)) return;
    try { await mkdir(options.cache.directory, { recursive: true }); const temporary = `${cachePath}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify({ schema: 1, version: options.cache.version, root, entries: Object.fromEntries(next) })); await rename(temporary, cachePath); }
    catch { warnings.push('Persistent index cache could not be written.'); }
  };
  if (options.includeDependencies === false) {
    await commitCache();
    return { files: indexed, bytes, cached, complete: false, projectComplete: !projectIncomplete, warnings };
  }
  const dependencyCandidates = new Set<string>(); const remaining = limits.maxFiles - projectFiles.length;
  for (const path of dependencyAutoloadPaths(project)) {
    if (options.shouldContinue?.() === false) return { files: indexed, bytes, cached, complete: false, projectComplete: !projectIncomplete, warnings: [...warnings, 'Project indexing was cancelled.'] };
    let info; try { info = await stat(path); } catch { continue; }
    if (info.isDirectory() && !await phpFiles(path, dependencyCandidates, limits.maxFiles + 1, include, options.shouldContinue)) return { files: indexed, bytes, cached, complete: false, projectComplete: !projectIncomplete, warnings: [...warnings, 'Project indexing was cancelled.'] };
    else if (info.isFile() && path.toLowerCase().endsWith('.php') && include(path)) dependencyCandidates.add(path);
  }
  const projectFileSet = new Set(projectFiles); const uniqueDependencies = [...dependencyCandidates].filter((path) => !projectFileSet.has(path));
  const dependencyTruncatedByCount = uniqueDependencies.length > remaining;
  dependencyIncomplete = dependencyTruncatedByCount;
  if (dependencyTruncatedByCount) warnings.push(`Dependency index was truncated to fit the ${limits.maxFiles}-file budget after indexing ${projectFiles.length} project files.`);
  const dependencies = uniqueDependencies.slice(0, remaining);
  const dependencyProgressTotal = projectFiles.length + dependencies.length;
  let dependencyBudgetReached = false;
  for (let start = 0; start < dependencies.length && !dependencyBudgetReached; start += readConcurrency) {
    const paths = dependencies.slice(start, start + readConcurrency);
    const sources = readConcurrency === 1 ? [undefined] : await Promise.all(paths.map(prefetch));
    for (const [index, path] of paths.entries()) {
      const status = await indexCandidate({ path, project: false }, dependencyProgressTotal, sources[index]);
      if (status === 'cancelled') return { files: indexed, bytes, cached, complete: false, projectComplete: true, warnings: [...warnings, 'Project indexing was cancelled.'] };
      if (status === 'budget') { dependencyBudgetReached = true; break; }
    }
  }
  await commitCache();
  return { files: indexed, bytes, cached, complete: !projectIncomplete && !dependencyIncomplete, projectComplete: !projectIncomplete, warnings };
}

export { PendingChanges } from './pending.js';

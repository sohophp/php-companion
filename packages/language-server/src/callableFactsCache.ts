import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CallableConstructionFact, CallableConstructionFactDocument, SemanticWorkspace } from '@php-companion/semantic';

interface FactEnvelope { schema: 1; uri: string; facts: CallableConstructionFact[]; checksum: string; }
interface CacheEntry { sourceChecksum: string; payload: FactEnvelope; }
interface CacheFile { schema: 1; version: string; root: string; entries: Record<string, CacheEntry>; }
export interface CallableFactCommitResult { written: boolean; facts: number; }

const CACHE_VERSION = 'callable-facts-v1';
const MAX_CACHE_BYTES = 64 * 1024 * 1024;
const MAX_DOCUMENTS = 10_000;
const MAX_FACTS = 100_000;
const MAX_DEPENDENCIES = 256;
const MAX_IDENTITY = 1_024;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function digest(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value); }
function checksum(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function sourceChecksum(source: string): string { return createHash('sha256').update(source).digest('hex'); }
function validIdentity(value: unknown, lowercase = false): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_IDENTITY && (!lowercase || value === value.toLowerCase());
}
function validFact(value: unknown): value is CallableConstructionFact {
  const fact = record(value);
  return Boolean(fact && validIdentity(fact.callable, true) && validIdentity(fact.result)
    && Array.isArray(fact.dependencies) && fact.dependencies.length <= MAX_DEPENDENCIES
    && fact.dependencies.every((dependency) => validIdentity(dependency, true) && dependency !== fact.callable)
    && new Set(fact.dependencies).size === fact.dependencies.length);
}
function factEnvelope(uri: string, facts: CallableConstructionFact[]): FactEnvelope {
  return { schema: 1, uri, facts, checksum: checksum({ uri, facts }) };
}
function restoreEnvelope(value: unknown, uri: string): FactEnvelope | undefined {
  const envelope = record(value);
  if (!envelope || envelope.schema !== 1 || envelope.uri !== uri || !digest(envelope.checksum)
    || !Array.isArray(envelope.facts) || envelope.facts.length > MAX_FACTS || !envelope.facts.every(validFact)
    || envelope.checksum !== checksum({ uri, facts: envelope.facts })) return undefined;
  return envelope as unknown as FactEnvelope;
}
function cacheDocument(root: string, entries: ReadonlyMap<string, CacheEntry>): CacheFile {
  return { schema: 1, version: CACHE_VERSION, root,
    entries: Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right))) };
}

export function callableFactCachePath(directory: string, root: string): string {
  return join(directory, `${createHash('sha256').update(root).digest('hex')}.callable.json`);
}

export class CallableFactCache {
  private lastDocumentChecksum: string | undefined;
  private constructor(private readonly path: string, private readonly root: string,
    private readonly previous: ReadonlyMap<string, unknown>) {}

  static async open(directory: string, root: string): Promise<CallableFactCache> {
    const path = callableFactCachePath(directory, root); let previous = new Map<string, unknown>();
    try {
      const info = await stat(path);
      if (info.size <= MAX_CACHE_BYTES) {
        const parsed = record(JSON.parse(await readFile(path, 'utf8'))); const entries = record(parsed?.entries);
        if (parsed?.schema === 1 && parsed.version === CACHE_VERSION && parsed.root === root && entries
          && Object.keys(entries).length <= MAX_DOCUMENTS) previous = new Map(Object.entries(entries));
      }
    } catch { /* Missing, unreadable, oversized, or malformed caches are rebuilt. */ }
    return new CallableFactCache(path, root, previous);
  }

  restore(workspace: SemanticWorkspace): number {
    const documents: CallableConstructionFactDocument[] = [];
    for (const [uri, value] of this.previous) {
      const entry = record(value); const source = workspace.source(uri);
      if (!entry || source === undefined || !digest(entry.sourceChecksum) || entry.sourceChecksum !== sourceChecksum(source)) continue;
      const payload = restoreEnvelope(entry.payload, uri); if (payload) documents.push({ uri, facts: payload.facts });
    }
    const restored = workspace.restoreCallableConstructionFacts(documents);
    return restored;
  }

  private document(workspace: SemanticWorkspace, excludedUris: ReadonlySet<string>): CacheFile {
    const entries = new Map<string, CacheEntry>(); let factCount = 0;
    for (const document of workspace.callableConstructionFacts()) {
      if (excludedUris.has(document.uri)) continue;
      const source = workspace.source(document.uri); if (source === undefined) continue;
      factCount += document.facts.length;
      if (entries.size >= MAX_DOCUMENTS || factCount > MAX_FACTS) throw new RangeError('Callable fact cache exceeds its entry limit.');
      entries.set(document.uri, { sourceChecksum: sourceChecksum(source), payload: factEnvelope(document.uri, document.facts) });
    }
    return cacheDocument(this.root, entries);
  }

  async commit(workspace: SemanticWorkspace, excludedUris: ReadonlySet<string>): Promise<CallableFactCommitResult> {
    const cache = this.document(workspace, excludedUris); const serialized = JSON.stringify(cache);
    if (Buffer.byteLength(serialized) > MAX_CACHE_BYTES) throw new RangeError('Callable fact cache exceeds its size limit.');
    const documentChecksum = checksum(cache); const facts = Object.values(cache.entries).reduce((sum, entry) => sum + entry.payload.facts.length, 0);
    if (documentChecksum === this.lastDocumentChecksum) return { written: false, facts };
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    try { await writeFile(temporary, serialized); await rename(temporary, this.path); }
    catch (error) { await rm(temporary, { force: true }); throw error; }
    this.lastDocumentChecksum = documentChecksum;
    return { written: true, facts };
  }
}

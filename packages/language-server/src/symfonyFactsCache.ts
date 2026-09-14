import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SymfonyCompiledContainerFacts, SymfonyServiceDocumentFacts } from '@php-companion/framework-symfony';

type FactKind = 'service-yaml' | 'compiled-container';
type FactPayload = SymfonyServiceDocumentFacts | SymfonyCompiledContainerFacts;
interface CachedFactEnvelope { schema: 1; kind: FactKind; uri: string; facts: FactPayload; checksum: string; }
interface CachedFactEntry { size: number; mtimeMs: number; sourceChecksum: string; payload: CachedFactEnvelope; }
interface CacheFile { schema: 1; version: string; root: string; entries: Record<string, CachedFactEntry>; }
export interface SymfonyFactCacheResult<T> { facts: T; cached: boolean; }

const CACHE_VERSION = 'symfony-facts-v1';
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 64;
const MAX_FACTS = 100_000;
const MAX_TEXT = 1_048_576;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function text(value: unknown): value is string { return typeof value === 'string' && value.length <= MAX_TEXT; }
function range(value: Record<string, unknown>): boolean {
  return Number.isSafeInteger(value.start) && Number.isSafeInteger(value.end)
    && (value.start as number) >= 0 && (value.end as number) >= (value.start as number);
}
function textArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= MAX_FACTS && value.every(text);
}
function binding(value: unknown): boolean {
  const item = record(value); return Boolean(item && (item.type === undefined || text(item.type))
    && (item.parameter === undefined || text(item.parameter)) && (item.serviceId === undefined || text(item.serviceId)));
}
function service(value: unknown): boolean {
  const item = record(value); return Boolean(item && text(item.id) && text(item.className)
    && (item.alias === undefined || text(item.alias)) && typeof item.public === 'boolean' && typeof item.autowire === 'boolean'
    && typeof item.autowireComplete === 'boolean' && Array.isArray(item.bindings) && item.bindings.length <= MAX_FACTS && item.bindings.every(binding)
    && textArray(item.configuredCalls) && typeof item.callsComplete === 'boolean' && textArray(item.configuredProperties)
    && typeof item.propertiesComplete === 'boolean' && ['explicit', 'resource', 'compiled'].includes(String(item.origin))
    && text(item.uri) && range(item));
}
function resource(value: unknown): boolean {
  const item = record(value); return Boolean(item && text(item.namespacePrefix) && text(item.resource) && textArray(item.exclude)
    && typeof item.public === 'boolean' && typeof item.autowire === 'boolean' && typeof item.autowireComplete === 'boolean'
    && Array.isArray(item.bindings) && item.bindings.length <= MAX_FACTS && item.bindings.every(binding)
    && textArray(item.configuredCalls) && typeof item.callsComplete === 'boolean' && textArray(item.configuredProperties)
    && typeof item.propertiesComplete === 'boolean' && text(item.uri) && range(item));
}
function compiledMethodArgument(value: unknown): boolean {
  const item = record(value); return Boolean(item && text(item.callableFqcn) && (item.parameter === undefined || text(item.parameter))
    && (item.parameterIndex === undefined || Number.isSafeInteger(item.parameterIndex) && (item.parameterIndex as number) >= 0)
    && text(item.serviceId) && text(item.className) && text(item.uri) && range(item));
}
function compiledPropertyArgument(value: unknown): boolean {
  const item = record(value); return Boolean(item && text(item.ownerFqcn) && text(item.property)
    && text(item.serviceId) && text(item.className) && text(item.uri) && range(item));
}
function factArray(value: unknown, validate: (item: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length <= MAX_FACTS && value.every(validate);
}
function validFacts(kind: FactKind, value: unknown, uri?: string): value is FactPayload {
  const facts = record(value); if (!facts || typeof facts.complete !== 'boolean') return false;
  const hasExpectedUri = (item: unknown): boolean => uri === undefined || record(item)?.uri === uri;
  return kind === 'service-yaml'
    ? factArray(facts.services, (item) => service(item) && hasExpectedUri(item))
      && factArray(facts.resources, (item) => resource(item) && hasExpectedUri(item))
    : factArray(facts.services, (item) => service(item) && hasExpectedUri(item))
      && factArray(facts.methodArguments, (item) => compiledMethodArgument(item) && hasExpectedUri(item))
      && factArray(facts.propertyArguments, (item) => compiledPropertyArgument(item) && hasExpectedUri(item));
}
function checksum(kind: FactKind, uri: string, facts: FactPayload): string {
  return createHash('sha256').update(JSON.stringify({ kind, uri, facts })).digest('hex');
}
function sourceChecksum(source: string): string { return createHash('sha256').update(source).digest('hex'); }
function digest(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value); }
function envelope(kind: FactKind, uri: string, facts: FactPayload): CachedFactEnvelope {
  return { schema: 1, kind, uri, facts, checksum: checksum(kind, uri, facts) };
}
function restoreEnvelope(value: unknown, kind: FactKind, uri: string): FactPayload | undefined {
  const item = record(value); if (!item || item.schema !== 1 || item.kind !== kind || item.uri !== uri
    || !digest(item.checksum) || !validFacts(kind, item.facts, uri)) return undefined;
  return item.checksum === checksum(kind, uri, item.facts) ? item.facts : undefined;
}

export function symfonyFactCachePath(directory: string, root: string): string {
  return join(directory, `${createHash('sha256').update(root).digest('hex')}.symfony.json`);
}

export class SymfonyFactCache {
  private readonly next = new Map<string, CachedFactEntry>();
  private constructor(private readonly path: string, private readonly root: string,
    private readonly previous: ReadonlyMap<string, CachedFactEntry>) {}

  static async open(directory: string, root: string): Promise<SymfonyFactCache> {
    const path = symfonyFactCachePath(directory, root); let previous = new Map<string, CachedFactEntry>();
    try {
      const info = await stat(path);
      if (info.size <= MAX_CACHE_BYTES) {
        const parsed = record(JSON.parse(await readFile(path, 'utf8')));
        const entries = record(parsed?.entries);
        if (parsed?.schema === 1 && parsed.version === CACHE_VERSION && parsed.root === root && entries
          && Object.keys(entries).length <= MAX_ENTRIES) previous = new Map(Object.entries(entries) as Array<[string, CachedFactEntry]>);
      }
    } catch { /* Missing, unreadable, oversized, or malformed caches are rebuilt. */ }
    return new SymfonyFactCache(path, root, previous);
  }

  private async load<T extends FactPayload>(path: string, uri: string, kind: FactKind,
    analyze: (source: string) => T, bypass = false): Promise<SymfonyFactCacheResult<T>> {
    const before = await stat(path); const source = await readFile(path, 'utf8'); const after = await stat(path);
    const stable = before.size === after.size && before.mtimeMs === after.mtimeMs;
    const sourceDigest = sourceChecksum(source); const old = this.previous.get(path);
    if (!bypass && stable && old && old.size === after.size && old.mtimeMs === after.mtimeMs
      && digest(old.sourceChecksum) && old.sourceChecksum === sourceDigest) {
      const restored = restoreEnvelope(old.payload, kind, uri) as T | undefined;
      if (restored) { this.next.set(path, old); return { facts: restored, cached: true }; }
    }
    const facts = analyze(source);
    const payload = envelope(kind, uri, facts);
    if (stable && validFacts(kind, facts, uri) && Buffer.byteLength(JSON.stringify(payload)) <= MAX_CACHE_BYTES) {
      this.next.set(path, { size: after.size, mtimeMs: after.mtimeMs, sourceChecksum: sourceDigest, payload });
    }
    return { facts, cached: false };
  }

  loadServiceYaml(path: string, uri: string, analyze: (source: string) => SymfonyServiceDocumentFacts, bypass = false): Promise<SymfonyFactCacheResult<SymfonyServiceDocumentFacts>> {
    return this.load(path, uri, 'service-yaml', analyze, bypass);
  }

  loadCompiledContainer(path: string, uri: string, analyze: (source: string) => SymfonyCompiledContainerFacts, bypass = false): Promise<SymfonyFactCacheResult<SymfonyCompiledContainerFacts>> {
    return this.load(path, uri, 'compiled-container', analyze, bypass);
  }

  async commit(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    const cache: CacheFile = { schema: 1, version: CACHE_VERSION, root: this.root, entries: Object.fromEntries(this.next) };
    const serialized = JSON.stringify(cache); if (Buffer.byteLength(serialized) > MAX_CACHE_BYTES) throw new RangeError('Symfony fact cache exceeds its size limit.');
    await writeFile(temporary, serialized); await rename(temporary, this.path);
  }
}

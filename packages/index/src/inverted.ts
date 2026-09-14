export interface DocumentKeyIndexLimits {
  maxKeysPerDocument: number;
  maxKeyLength: number;
}

export interface DocumentKeyIndexStats {
  documents: number;
  keys: number;
  postings: number;
}

export const DEFAULT_DOCUMENT_KEY_INDEX_LIMITS: DocumentKeyIndexLimits = {
  maxKeysPerDocument: 100_000,
  maxKeyLength: 1_024,
};

/**
 * Incremental, bounded inverted index from an exact caller-owned key to document URIs.
 * Replacement is atomic: invalid input leaves the previous document contribution intact.
 */
export class DocumentKeyIndex {
  private readonly keysByDocument = new Map<string, Set<string>>();
  private readonly documentsByKey = new Map<string, Set<string>>();

  constructor(private readonly limits: DocumentKeyIndexLimits = DEFAULT_DOCUMENT_KEY_INDEX_LIMITS) {
    if (!Number.isInteger(limits.maxKeysPerDocument) || limits.maxKeysPerDocument < 1
      || !Number.isInteger(limits.maxKeyLength) || limits.maxKeyLength < 1) {
      throw new RangeError('DocumentKeyIndex limits must be positive integers.');
    }
  }

  replace(uri: string, keys: Iterable<string>): boolean {
    if (!uri) return false;
    const next = new Set<string>();
    for (const key of keys) {
      if (!key || key.length > this.limits.maxKeyLength
        || (!next.has(key) && next.size >= this.limits.maxKeysPerDocument)) return false;
      next.add(key);
    }
    this.remove(uri);
    if (!next.size) return true;
    this.keysByDocument.set(uri, next);
    for (const key of next) {
      const documents = this.documentsByKey.get(key) ?? new Set<string>();
      documents.add(uri); this.documentsByKey.set(key, documents);
    }
    return true;
  }

  remove(uri: string): boolean {
    const keys = this.keysByDocument.get(uri); if (!keys) return false;
    this.keysByDocument.delete(uri);
    for (const key of keys) {
      const documents = this.documentsByKey.get(key); documents?.delete(uri);
      if (documents?.size === 0) this.documentsByKey.delete(key);
    }
    return true;
  }

  documents(key: string): string[] {
    return [...(this.documentsByKey.get(key) ?? [])].sort();
  }

  documentKeys(uri: string): string[] {
    return [...(this.keysByDocument.get(uri) ?? [])].sort();
  }

  clear(): void {
    this.keysByDocument.clear(); this.documentsByKey.clear();
  }

  stats(): DocumentKeyIndexStats {
    let postings = 0;
    for (const documents of this.documentsByKey.values()) postings += documents.size;
    return { documents: this.keysByDocument.size, keys: this.documentsByKey.size, postings };
  }
}

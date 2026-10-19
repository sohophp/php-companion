interface QueryDocument {
  readonly version: number;
  readonly isClosed: boolean;
}

interface QueryCancellation {
  readonly isCancellationRequested: boolean;
}

export async function currentDocumentQuery<T>(document: QueryDocument, token: QueryCancellation,
  query: () => T | PromiseLike<T>): Promise<T | undefined> {
  if (document.isClosed || token.isCancellationRequested) return undefined;
  const version = document.version;
  const result = await query();
  // A response can already be in transit when the server receives an edit.
  return document.isClosed || token.isCancellationRequested || document.version !== version ? undefined : result;
}

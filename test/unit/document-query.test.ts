import { describe, expect, it } from 'vitest';
import { currentDocumentQuery } from '../../src/extension/documentQuery.js';

describe('document query responses', () => {
  function pendingQuery(): {
    document: { version: number; isClosed: boolean };
    token: { isCancellationRequested: boolean };
    finish: (value: object) => void;
    pending: Promise<object | undefined>;
  } {
    const document = { version: 1, isClosed: false };
    const token = { isCancellationRequested: false };
    let finish!: (value: object) => void;
    const response = new Promise<object>(resolve => { finish = resolve; });
    const pending = currentDocumentQuery(document, token, () => response);
    return { document, token, finish, pending };
  }

  it('preserves the original response when the document stays current', async () => {
    const query = pendingQuery(); const value = { contents: ['current'] };
    query.finish(value); expect(await query.pending).toBe(value);
  });

  it('rejects an in-transit response after an edit and accepts a fresh query', async () => {
    const query = pendingQuery(); query.document.version++;
    query.finish({ contents: ['old'] }); expect(await query.pending).toBeUndefined();
    const fresh = { contents: ['new'] };
    expect(await currentDocumentQuery(query.document, query.token, () => fresh)).toBe(fresh);
  });

  it('rejects a response after the originating document closes', async () => {
    const query = pendingQuery(); query.document.isClosed = true;
    query.finish({ contents: ['closed'] }); expect(await query.pending).toBeUndefined();
  });

  it('rejects a cancelled response even if its document version stays current', async () => {
    const query = pendingQuery(); query.token.isCancellationRequested = true;
    query.finish({ contents: ['cancelled'] }); expect(await query.pending).toBeUndefined();
  });

  it('does not query an already closed or cancelled document', async () => {
    const run = (): never => { throw new Error('The query must not start'); };
    expect(await currentDocumentQuery({ version: 1, isClosed: true }, { isCancellationRequested: false }, run)).toBeUndefined();
    expect(await currentDocumentQuery({ version: 1, isClosed: false }, { isCancellationRequested: true }, run)).toBeUndefined();
  });

  it('preserves query failures', async () => {
    const failure = new Error('provider failed');
    await expect(currentDocumentQuery({ version: 1, isClosed: false }, { isCancellationRequested: false }, () => {
      throw failure;
    })).rejects.toBe(failure);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscodeTypes from 'vscode';
import type { PhpCompanionPluginApi } from '@php-companion/plugin-api';

let renameProvider: vscodeTypes.RenameProvider | undefined;

vi.mock('vscode', () => {
  class Position { constructor(public line: number, public character: number) {} }
  class Range { constructor(public startLine: number, public startCharacter: number, public endLine: number, public endCharacter: number) {} }
  class Uri { static parse(value: string): { toString: () => string } { return { toString: (): string => value }; } }
  class WorkspaceEdit {
    replacements: unknown[] = [];
    replace(uri: unknown, range: unknown, newText: string): void { this.replacements.push({ uri, range, newText }); }
  }
  return {
    Position, Range, Uri, WorkspaceEdit,
    CompletionItem: class {}, CompletionList: class {}, CompletionItemKind: { Reference: 18 },
    languages: {
      registerDefinitionProvider: vi.fn(() => ({ dispose(): void {} })),
      registerReferenceProvider: vi.fn(() => ({ dispose(): void {} })),
      registerCompletionItemProvider: vi.fn(() => ({ dispose(): void {} })),
      registerRenameProvider: vi.fn((_selector: unknown, provider: vscodeTypes.RenameProvider) => {
        renameProvider = provider; return { dispose(): void {} };
      }),
    },
  };
});

import { registerSymfonyLanguageFeatures } from '../../src/languageFeatures.js';

describe('Symfony editor language features', () => {
  beforeEach(() => { renameProvider = undefined; });

  it('falls back from service IDs to route names for prepare and rename', async () => {
    const requestLanguageServer = vi.fn(async (method: string) => {
      if (method === 'phpCompanion/symfonyRoutePrepareRename') return {
        range: { start: { line: 1, character: 2 }, end: { line: 1, character: 14 } }, placeholder: 'admin.home',
      };
      if (method === 'phpCompanion/symfonyRouteRename') return {
        changes: { 'file:///routes.yaml': [{ range: { start: { line: 1, character: 2 }, end: { line: 1, character: 14 } }, newText: 'admin.start' }] },
      };
      return null;
    });
    const context = { subscriptions: [] } as unknown as vscodeTypes.ExtensionContext;
    const core = { version: 1, registerIntegration: vi.fn(), requestLanguageServer } as unknown as PhpCompanionPluginApi;
    expect(registerSymfonyLanguageFeatures(context, core)).toBe(true);
    const document = { uri: { toString: () => 'file:///routes.yaml' }, version: 1, getText: () => 'admin.home' } as unknown as vscodeTypes.TextDocument;
    const position = { line: 1, character: 4 } as vscodeTypes.Position;
    const token = { isCancellationRequested: false } as vscodeTypes.CancellationToken;
    const prepared = await renameProvider!.prepareRename!(document, position, token);
    expect(prepared).toMatchObject({ placeholder: 'admin.home' });
    const edit = await renameProvider!.provideRenameEdits(document, position, 'admin.start', token) as unknown as { replacements: unknown[] };
    expect(edit.replacements).toHaveLength(1);
    expect(requestLanguageServer.mock.calls.map(([method]) => method)).toEqual([
      'phpCompanion/symfonyServicePrepareRename', 'phpCompanion/symfonyRoutePrepareRename',
      'phpCompanion/symfonyServiceRename', 'phpCompanion/symfonyRouteRename',
    ]);
  });
});

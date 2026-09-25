import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import * as vscode from 'vscode';
import type * as vscodeTypes from 'vscode';
import type { PhpCompanionPluginApi } from '@php-companion/plugin-api';

let renameProvider: vscodeTypes.RenameProvider | undefined;
const definitionProviders: Array<{ selector: vscodeTypes.DocumentSelector; provider: vscodeTypes.DefinitionProvider }> = [];

vi.mock('vscode', () => {
  class Position { constructor(public line: number, public character: number) {} }
  class Range { constructor(public startLine: number, public startCharacter: number, public endLine: number, public endCharacter: number) {} }
  class Location { constructor(public uri: unknown, public range: Range) {} }
  class Uri { static parse(value: string): { toString: () => string; scheme: string } {
    return { toString: (): string => value, scheme: value.split(':')[0]! };
  } }
  class WorkspaceEdit {
    replacements: unknown[] = [];
    replace(uri: unknown, range: unknown, newText: string): void { this.replacements.push({ uri, range, newText }); }
  }
  return {
    Position, Range, Location, Uri, WorkspaceEdit,
    env: { language: 'en' },
    workspace: { textDocuments: [], fs: { readFile: vi.fn() } },
    CompletionItem: class {}, CompletionList: class {}, CompletionItemKind: { Reference: 18 },
    languages: {
      registerDefinitionProvider: vi.fn((selector: vscodeTypes.DocumentSelector, provider: vscodeTypes.DefinitionProvider) => {
        definitionProviders.push({ selector, provider }); return { dispose(): void {} };
      }),
      registerReferenceProvider: vi.fn(() => ({ dispose(): void {} })),
      registerCompletionItemProvider: vi.fn(() => ({ dispose(): void {} })),
      registerRenameProvider: vi.fn((_selector: unknown, provider: vscodeTypes.RenameProvider) => {
        renameProvider = provider; return { dispose(): void {} };
      }),
    },
  };
});

import { registerSymfonyLanguageFeatures } from '../../src/languageFeatures.js';

function openDocuments(): vscodeTypes.TextDocument[] { return vscode.workspace.textDocuments as vscodeTypes.TextDocument[]; }

describe('Symfony editor language features', () => {
  beforeEach(() => {
    renameProvider = undefined; definitionProviders.length = 0; openDocuments().length = 0;
    vi.mocked(vscode.workspace.fs.readFile).mockReset().mockResolvedValue(Buffer.from('admin.home'));
  });

  it('registers PHP route controller Definition through the standalone Symfony extension', async () => {
    const requestLanguageServer = vi.fn(async (method: string) => method === 'phpCompanion/symfonyRouteControllerDefinition'
      ? [{ uri: 'file:///src/BlogController.php', range: { start: { line: 2, character: 5 }, end: { line: 2, character: 9 } } }] : []);
    const context = { subscriptions: [] } as unknown as vscodeTypes.ExtensionContext;
    const core = { version: 1, registerIntegration: vi.fn(), requestLanguageServer } as unknown as PhpCompanionPluginApi;
    expect(registerSymfonyLanguageFeatures(context, core)).toBe(true);
    const phpDefinitions = definitionProviders.filter(({ selector }) => Array.isArray(selector)
      && selector.some((item) => typeof item === 'object' && item.language === 'php'));
    expect(phpDefinitions).toHaveLength(2);
    const document = { uri: vscode.Uri.parse('file:///config/routes.php'), version: 1, getText: () => '<?php routes', isClosed: false } as unknown as vscodeTypes.TextDocument;
    const result = await phpDefinitions[1]!.provider.provideDefinition(document,
      { line: 0, character: 6 } as vscodeTypes.Position, { isCancellationRequested: false } as vscodeTypes.CancellationToken);
    expect(result).toHaveLength(1);
    expect(requestLanguageServer).toHaveBeenCalledWith('phpCompanion/symfonyRouteControllerDefinition', expect.objectContaining({
      textDocument: { uri: 'file:///config/routes.php', version: 1 }, source: '<?php routes',
    }));
  });

  it('falls back from service IDs to route names for prepare and rename', async () => {
    const sourceHash = createHash('sha256').update('admin.home').digest('hex');
    const requestLanguageServer = vi.fn(async (method: string) => {
      if (method === 'phpCompanion/symfonyRoutePrepareRename') return {
        range: { start: { line: 1, character: 2 }, end: { line: 1, character: 14 } }, placeholder: 'admin.home',
      };
      if (method === 'phpCompanion/symfonyRouteRename') return {
        changes: { 'file:///routes.yaml': [{ range: { start: { line: 1, character: 2 }, end: { line: 1, character: 14 } }, newText: 'admin.start' }] },
        phpCompanion: { sourceHashes: { 'file:///routes.yaml': sourceHash } },
      };
      return null;
    });
    const context = { subscriptions: [] } as unknown as vscodeTypes.ExtensionContext;
    const core = { version: 1, registerIntegration: vi.fn(), requestLanguageServer } as unknown as PhpCompanionPluginApi;
    expect(registerSymfonyLanguageFeatures(context, core)).toBe(true);
    const document = { uri: vscode.Uri.parse('file:///routes.yaml'), version: 1, getText: () => 'admin.home', isDirty: false } as unknown as vscodeTypes.TextDocument;
    openDocuments().push(document);
    const position = { line: 1, character: 4 } as vscodeTypes.Position;
    const token = { isCancellationRequested: false } as vscodeTypes.CancellationToken;
    const prepared = await renameProvider!.prepareRename!(document, position, token);
    expect(prepared).toMatchObject({ placeholder: 'admin.home' });
    const edit = await renameProvider!.provideRenameEdits(document, position, 'admin.start', token) as unknown as { replacements: unknown[] };
    expect(edit.replacements).toHaveLength(1);
    expect(requestLanguageServer.mock.calls.map(([method]) => method)).toEqual([
      'phpCompanion/symfonyServicePrepareRename', 'phpCompanion/symfonyParameterPrepareRename', 'phpCompanion/symfonyRoutePrepareRename',
      'phpCompanion/symfonyServiceRename', 'phpCompanion/symfonyParameterRename', 'phpCompanion/symfonyRouteRename',
    ]);
  });

  it('rejects a stale Symfony Rename with a localized message', async () => {
    const sourceHash = createHash('sha256').update('admin.home').digest('hex');
    const requestLanguageServer = vi.fn(async (method: string) => method === 'phpCompanion/symfonyRouteRename'
      ? { changes: { 'file:///routes.yaml': [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }, newText: 'admin.start' }] },
        phpCompanion: { sourceHashes: { 'file:///routes.yaml': sourceHash } } } : null);
    const context = { subscriptions: [] } as unknown as vscodeTypes.ExtensionContext;
    const core = { version: 1, registerIntegration: vi.fn(), requestLanguageServer } as unknown as PhpCompanionPluginApi;
    registerSymfonyLanguageFeatures(context, core);
    const document = { uri: vscode.Uri.parse('file:///routes.yaml'), version: 2,
      getText: () => 'admin.changed', isClosed: false, isDirty: false } as unknown as vscodeTypes.TextDocument;
    openDocuments().push(document);
    (vscode.env as { language: string }).language = 'zh-cn';
    try {
      await expect(renameProvider!.provideRenameEdits(document, { line: 0, character: 3 } as vscodeTypes.Position,
        'admin.start', { isCancellationRequested: false } as vscodeTypes.CancellationToken))
        .rejects.toThrow('准备 Symfony 重命名时源文件已变化，请重新执行重命名。');
    } finally { (vscode.env as { language: string }).language = 'en'; }
  });

  it.each([false, true])('guards a dirty Symfony Rename against an external disk change (changed=%s)', async (changed) => {
    let disk = 'disk-before';
    vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async () => Buffer.from(disk));
    const sourceHash = createHash('sha256').update('admin.home').digest('hex');
    const requestLanguageServer = vi.fn(async (method: string) => {
      if (method !== 'phpCompanion/symfonyRouteRename') return null;
      if (changed) disk = 'external-write';
      return { changes: { 'file:///routes.yaml': [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }, newText: 'admin.start' }] },
        phpCompanion: { sourceHashes: { 'file:///routes.yaml': sourceHash } } };
    });
    const context = { subscriptions: [] } as unknown as vscodeTypes.ExtensionContext;
    const core = { version: 1, registerIntegration: vi.fn(), requestLanguageServer } as unknown as PhpCompanionPluginApi;
    registerSymfonyLanguageFeatures(context, core);
    const document = { uri: vscode.Uri.parse('file:///routes.yaml'), version: 1,
      getText: () => 'admin.home', isClosed: false, isDirty: true } as unknown as vscodeTypes.TextDocument;
    openDocuments().push(document);
    const rename = renameProvider!.provideRenameEdits(document, { line: 0, character: 3 } as vscodeTypes.Position,
      'admin.start', { isCancellationRequested: false } as vscodeTypes.CancellationToken);
    if (changed) await expect(rename).rejects.toThrow('A Symfony Rename source changed');
    else expect((await rename as unknown as { replacements: unknown[] }).replacements).toHaveLength(1);
  });

  it('rejects an external disk change behind a clean open Symfony file', async () => {
    let disk = 'admin.home';
    vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async () => Buffer.from(disk));
    const sourceHash = createHash('sha256').update('admin.home').digest('hex');
    const requestLanguageServer = vi.fn(async (method: string) => {
      if (method !== 'phpCompanion/symfonyRouteRename') return null;
      disk = 'external-write';
      return { changes: { 'file:///routes.yaml': [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }, newText: 'admin.start' }] },
        phpCompanion: { sourceHashes: { 'file:///routes.yaml': sourceHash } } };
    });
    const context = { subscriptions: [] } as unknown as vscodeTypes.ExtensionContext;
    const core = { version: 1, registerIntegration: vi.fn(), requestLanguageServer } as unknown as PhpCompanionPluginApi;
    registerSymfonyLanguageFeatures(context, core);
    const document = { uri: vscode.Uri.parse('file:///routes.yaml'), version: 1,
      getText: () => 'admin.home', isClosed: false, isDirty: false } as unknown as vscodeTypes.TextDocument;
    openDocuments().push(document);
    await expect(renameProvider!.provideRenameEdits(document, { line: 0, character: 3 } as vscodeTypes.Position,
      'admin.start', { isCancellationRequested: false } as vscodeTypes.CancellationToken))
      .rejects.toThrow('A Symfony Rename source changed');
  });
});

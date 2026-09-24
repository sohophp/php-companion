import * as vscode from 'vscode';
import { createHash } from 'node:crypto';
import type { PhpCompanionPluginApi } from '@php-companion/plugin-api';

type ProtocolPosition = { line: number; character: number };
type ProtocolRange = { start: ProtocolPosition; end: ProtocolPosition };
type ProtocolLocation = { uri: string; range: ProtocolRange };
type ProtocolWorkspaceEdit = { changes?: Record<string, Array<{ range: ProtocolRange; newText: string }>>;
  phpCompanion?: { sourceHashes?: Record<string, string> } };
type ProtocolCompletionList = { isIncomplete: boolean; items: Array<{ label: string; detail: string; range: ProtocolRange }> };

function range(value: ProtocolRange): vscode.Range {
  return new vscode.Range(value.start.line, value.start.character, value.end.line, value.end.character);
}

function locations(values: readonly ProtocolLocation[]): vscode.Location[] {
  return values.map((value) => new vscode.Location(vscode.Uri.parse(value.uri), range(value.range)));
}

function workspaceEdit(value: ProtocolWorkspaceEdit | null): vscode.WorkspaceEdit | undefined {
  if (!value) return undefined;
  const edit = new vscode.WorkspaceEdit();
  for (const [uri, edits] of Object.entries(value.changes ?? {})) {
    for (const item of edits) edit.replace(vscode.Uri.parse(uri), range(item.range), item.newText);
  }
  return edit;
}

async function verifyRenameSources(value: ProtocolWorkspaceEdit, openVersions: ReadonlyMap<string, number>): Promise<boolean> {
  const hashes = value.phpCompanion?.sourceHashes;
  if (!hashes) return false;
  for (const uri of Object.keys(value.changes ?? {})) {
    const expected = hashes[uri];
    if (!expected) return false;
    const open = vscode.workspace.textDocuments.find((item) => item.uri.toString() === uri);
    const source = open?.getText() ?? Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.parse(uri))).toString('utf8');
    if (createHash('sha256').update(source).digest('hex') !== expected) return false;
  }
  return vscode.workspace.textDocuments.every((item) => !openVersions.has(item.uri.toString())
    || openVersions.get(item.uri.toString()) === item.version);
}

function requestParams(document: vscode.TextDocument, position: vscode.Position): {
  textDocument: { uri: string; version: number }; position: vscode.Position; source: string;
} {
  return { textDocument: { uri: document.uri.toString(), version: document.version }, position, source: document.getText() };
}

/** Register editor-facing Symfony features only when the independently installed plugin is active. */
export function registerSymfonyLanguageFeatures(context: vscode.ExtensionContext, core: PhpCompanionPluginApi): boolean {
  const request = core.requestLanguageServer;
  if (!request) return false; // Older API v1 cores retain their own compatibility providers.
  const current = (document: vscode.TextDocument, version: number, token: vscode.CancellationToken): boolean =>
    !token.isCancellationRequested && !document.isClosed && document.version === version;
  const safely = async <T>(method: string, params: unknown): Promise<T | undefined> => {
    try { return await request<T>(method, params); } catch { return undefined; }
  };
  const definition = (method: string): vscode.DefinitionProvider => ({
    provideDefinition: async (document, position, token): Promise<vscode.Definition | undefined> => {
      if (token.isCancellationRequested) return undefined;
      const version = document.version;
      const result = await safely<ProtocolLocation[]>(method, requestParams(document, position));
      return result && current(document, version, token) ? locations(result) : undefined;
    },
  });
  const references: vscode.ReferenceProvider = {
    provideReferences: async (document, position, referenceContext, token) => {
      if (token.isCancellationRequested) return undefined;
      const version = document.version;
      const result = await safely<ProtocolLocation[]>('phpCompanion/symfonyServiceReferences', {
        ...requestParams(document, position), context: { includeDeclaration: referenceContext.includeDeclaration },
      });
      return result && current(document, version, token) ? locations(result) : undefined;
    },
  };
  const completions: vscode.CompletionItemProvider = {
    provideCompletionItems: async (document, position, token) => {
      if (token.isCancellationRequested) return undefined;
      const version = document.version;
      const result = await safely<ProtocolCompletionList>('phpCompanion/symfonyServiceCompletions', requestParams(document, position));
      if (!result || !current(document, version, token)) return undefined;
      return new vscode.CompletionList(result.items.map((candidate) => {
        const item = new vscode.CompletionItem(candidate.label, vscode.CompletionItemKind.Reference);
        item.detail = candidate.detail; item.insertText = candidate.label; item.range = range(candidate.range); return item;
      }), result.isIncomplete);
    },
  };
  const rename: vscode.RenameProvider = {
    prepareRename: async (document, position, token) => {
      if (token.isCancellationRequested) return undefined;
      const version = document.version;
      let result = await safely<null | { range: ProtocolRange; placeholder?: string }>(
        'phpCompanion/symfonyServicePrepareRename', requestParams(document, position));
      if (!result && current(document, version, token)) result = await safely<null | { range: ProtocolRange; placeholder?: string }>(
        'phpCompanion/symfonyParameterPrepareRename', requestParams(document, position));
      if (!result && current(document, version, token)) result = await safely<null | { range: ProtocolRange; placeholder?: string }>(
        'phpCompanion/symfonyRoutePrepareRename', requestParams(document, position));
      if (!result || !current(document, version, token)) return undefined;
      const target = range(result.range); return result.placeholder ? { range: target, placeholder: result.placeholder } : target;
    },
    provideRenameEdits: async (document, position, newName, token) => {
      if (token.isCancellationRequested) return undefined;
      const version = document.version;
      const openVersions = new Map(vscode.workspace.textDocuments.map((item) => [item.uri.toString(), item.version]));
      let result = await safely<ProtocolWorkspaceEdit | null>('phpCompanion/symfonyServiceRename', {
        ...requestParams(document, position), newName,
      });
      if (!result && current(document, version, token)) result = await safely<ProtocolWorkspaceEdit | null>('phpCompanion/symfonyParameterRename', {
        ...requestParams(document, position), newName,
      });
      if (!result && current(document, version, token)) result = await safely<ProtocolWorkspaceEdit | null>('phpCompanion/symfonyRouteRename', {
        ...requestParams(document, position), newName,
      });
      if (!result || !current(document, version, token)) return undefined;
      if (!await verifyRenameSources(result, openVersions) || !current(document, version, token)) {
        throw new Error('A Symfony Rename source changed while edits were being prepared. Run Rename again.');
      }
      return workspaceEdit(result);
    },
  };
  const php: vscode.DocumentSelector = [{ language: 'php', scheme: 'file' }, { language: 'php', scheme: 'vscode-remote' }];
  const yaml: vscode.DocumentSelector = [{ language: 'yaml', scheme: 'file' }, { language: 'yaml', scheme: 'vscode-remote' }];
  const xml: vscode.DocumentSelector = [{ language: 'xml', scheme: 'file' }, { language: 'xml', scheme: 'vscode-remote' }];
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(yaml, definition('phpCompanion/symfonyControllerDefinition')),
    vscode.languages.registerReferenceProvider(yaml, references),
    vscode.languages.registerCompletionItemProvider(yaml, completions, '@', '?'),
    vscode.languages.registerRenameProvider(yaml, rename),
    vscode.languages.registerDefinitionProvider(xml, definition('phpCompanion/symfonyServiceDefinition')),
    vscode.languages.registerReferenceProvider(xml, references),
    vscode.languages.registerCompletionItemProvider(xml, completions, '"', "'", '.'),
    vscode.languages.registerRenameProvider(xml, rename),
    vscode.languages.registerDefinitionProvider(php, definition('phpCompanion/symfonyServiceDefinition')),
    vscode.languages.registerReferenceProvider(php, references),
    vscode.languages.registerCompletionItemProvider(php, completions, '"', "'", '.'),
  );
  return true;
}

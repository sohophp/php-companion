import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';

export const RENAME_PREVIEW_SCHEME = 'sophp-rename-preview';

const snapshots = new Map<string, string>();

export function registerRenamePreviewProvider(): vscode.Disposable {
  const provider = vscode.workspace.registerTextDocumentContentProvider(RENAME_PREVIEW_SCHEME, {
    provideTextDocumentContent: (uri) => snapshots.get(uri.toString()) ?? '',
  });
  const closed = vscode.workspace.onDidCloseTextDocument((document) => {
    if (document.uri.scheme === RENAME_PREVIEW_SCHEME) snapshots.delete(document.uri.toString());
  });
  return vscode.Disposable.from(provider, closed);
}

export async function openRenamePreviewSnapshot(target: vscode.Uri, source: string): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.from({ scheme: RENAME_PREVIEW_SCHEME, path: target.path, query: randomUUID() });
  snapshots.set(uri.toString(), source);
  try { return await vscode.workspace.openTextDocument(uri); }
  catch (error) { snapshots.delete(uri.toString()); throw error; }
}

export function forgetRenamePreviewSnapshots(uris: Iterable<string>): void {
  for (const uri of uris) snapshots.delete(uri);
}

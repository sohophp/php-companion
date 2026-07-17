import * as vscode from 'vscode';

export function typeNameAt(document: vscode.TextDocument, position: vscode.Position): { name: string; range: vscode.Range } | undefined {
  const range = document.getWordRangeAtPosition(position, /[A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*/);
  if (!range) return undefined;
  const name = document.getText(range);
  if (!/^[A-Z_\x80-\xff]/.test(name)) return undefined;
  return { name, range };
}

export class ImportClassCodeActions implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {
    const word = typeNameAt(document, range.start);
    if (!word) return [];
    const action = new vscode.CodeAction(`Import class '${word.name}'`, vscode.CodeActionKind.QuickFix.append('phpCompanion.importClass'));
    action.command = { command: 'phpCompanion.importClass', title: action.title, arguments: [document.uri, word.range.start] };
    return [action];
  }
}

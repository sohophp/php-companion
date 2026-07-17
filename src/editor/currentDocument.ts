import * as vscode from 'vscode';
import { basename, relative } from 'node:path';
import { resolvePsr4Namespace } from '../composer/project.js';
import type { VersionManager } from '../extension/versionManager.js';

const NAMESPACE = /^\s*namespace\s+([^;{]+)\s*[;{]/m;
const DECLARATION = /\b(?:abstract\s+|final\s+|readonly\s+)*(class|interface|trait|enum)\s+([A-Za-z_\x80-\xff][A-Za-z0-9_\x80-\xff]*)/m;

export interface CurrentPhpIdentity {
  namespace: string;
  name?: string;
  fqcn?: string;
}

export function identityFromSource(source: string): CurrentPhpIdentity {
  const namespace = NAMESPACE.exec(source)?.[1]?.trim().replace(/^\\+|\\+$/g, '') ?? '';
  const name = DECLARATION.exec(source)?.[2];
  return { namespace, name, fqcn: name ? [namespace, name].filter(Boolean).join('\\') : undefined };
}

export async function copyIdentity(kind: 'fqcn' | 'namespace' | 'classReference' | 'relativePath'): Promise<void> {
  const document = vscode.window.activeTextEditor?.document;
  if (!document || document.languageId !== 'php') return;
  const identity = identityFromSource(document.getText());
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  const value = kind === 'namespace' ? identity.namespace
    : kind === 'relativePath' && folder ? relative(folder.uri.fsPath, document.uri.fsPath).replace(/\\/g, '/')
    : identity.fqcn;
  if (!value) return void vscode.window.showInformationMessage('PHP Companion: No PHP type found in the active file.');
  await vscode.env.clipboard.writeText(kind === 'classReference' ? `${value}::class` : value);
}

export class CurrentDocumentDiagnostics implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('phpCompanion');
  private readonly disposables: vscode.Disposable[];

  constructor(private readonly versions: VersionManager) {
    this.disposables = [
      this.collection,
      vscode.workspace.onDidOpenTextDocument((document) => void this.update(document)),
      vscode.workspace.onDidChangeTextDocument((event) => void this.update(event.document)),
      vscode.workspace.onDidCloseTextDocument((document) => this.collection.delete(document.uri)),
    ];
  }

  async update(document: vscode.TextDocument): Promise<void> {
    if (document.languageId !== 'php' || document.isUntitled) return;
    const state = await this.versions.ensureForUri(document.uri);
    const expectedNamespace = resolvePsr4Namespace(document.uri.fsPath, state?.composer?.psr4 ?? []);
    const identity = identityFromSource(document.getText());
    const diagnostics: vscode.Diagnostic[] = [];
    const match = NAMESPACE.exec(document.getText());
    if (expectedNamespace !== undefined && identity.namespace !== expectedNamespace) {
      const range = match ? new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length)) : new vscode.Range(0, 0, 0, 0);
      const diagnostic = new vscode.Diagnostic(range, `Namespace should be ${expectedNamespace || '(global)'} for this PSR-4 path.`, vscode.DiagnosticSeverity.Warning);
      diagnostic.source = 'phpCompanion';
      diagnostic.code = `namespace-path:${expectedNamespace}`;
      diagnostics.push(diagnostic);
    }
    const expectedName = basename(document.uri.fsPath, '.php');
    if (identity.name && identity.name !== expectedName) {
      const offset = document.getText().indexOf(identity.name);
      const diagnostic = new vscode.Diagnostic(new vscode.Range(document.positionAt(offset), document.positionAt(offset + identity.name.length)), `Primary type name should match ${expectedName}.php.`, vscode.DiagnosticSeverity.Warning);
      diagnostic.source = 'phpCompanion';
      diagnostic.code = `type-filename:${expectedName}`;
      diagnostics.push(diagnostic);
    }
    this.collection.set(document.uri, diagnostics);
  }

  dispose(): void { this.disposables.forEach((item) => item.dispose()); }
}

export class NamespaceCodeActions implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument, _range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
    return context.diagnostics.flatMap((diagnostic) => {
      if (diagnostic.source === 'phpCompanion' && typeof diagnostic.code === 'string' && diagnostic.code.startsWith('type-filename:')) {
        const identity = identityFromSource(document.getText());
        if (!identity.name) return [];
        const action = new vscode.CodeAction(`Rename file to ${identity.name}.php`, vscode.CodeActionKind.QuickFix);
        const edit = new vscode.WorkspaceEdit();
        edit.renameFile(document.uri, vscode.Uri.joinPath(document.uri, '..', `${identity.name}.php`), { overwrite: false });
        action.edit = edit;
        action.diagnostics = [diagnostic];
        return [action];
      }
      if (diagnostic.source !== 'phpCompanion' || typeof diagnostic.code !== 'string' || !diagnostic.code.startsWith('namespace-path:')) return [];
      const expected = diagnostic.code.slice('namespace-path:'.length);
      const source = document.getText();
      const match = NAMESPACE.exec(source);
      const edit = new vscode.WorkspaceEdit();
      if (match) edit.replace(document.uri, new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length)), expected ? `namespace ${expected};` : '');
      else if (expected) {
        const tag = /<\?php\s*/.exec(source);
        const offset = tag ? tag.index + tag[0].length : 0;
        edit.insert(document.uri, document.positionAt(offset), `\nnamespace ${expected};\n`);
      }
      const action = new vscode.CodeAction('Change namespace to match PSR-4 path', vscode.CodeActionKind.QuickFix);
      action.edit = edit;
      action.diagnostics = [diagnostic];
      action.isPreferred = true;
      return [action];
    });
  }
}

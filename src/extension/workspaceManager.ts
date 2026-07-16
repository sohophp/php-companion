import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { relative } from 'node:path';
import { PhpSyntaxParser } from '../parser/phpParser.js';
import { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';
import { t } from './localize.js';

const DEFAULT_EXCLUDED_SEGMENTS = ['/vendor/', '/.git/', '/node_modules/', '/var/cache/', '/storage/framework/'];

export class WorkspaceManager implements vscode.Disposable {
  readonly index: WorkspaceSymbolIndex;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(private readonly parser: PhpSyntaxParser) {
    this.index = new WorkspaceSymbolIndex(parser);
  }

  static async create(context: vscode.ExtensionContext): Promise<WorkspaceManager> {
    const parser = await PhpSyntaxParser.create({
      coreWasmPath: context.asAbsolutePath('dist/web-tree-sitter.wasm'),
      phpWasmPath: context.asAbsolutePath('dist/tree-sitter-php.wasm'),
    });
    const manager = new WorkspaceManager(parser);
    manager.registerWatchers();
    return manager;
  }

  async rebuild(showMessage = false): Promise<void> {
    this.index.clear();
    const uris = await vscode.workspace.findFiles('**/*.php', '**/{vendor,.git,node_modules}/**');
    const entries: Array<{ uri: string; source: string }> = [];
    for (const uri of uris) {
      if (this.isExcluded(uri)) continue;
      try {
        const openDocument = vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
        const source = openDocument?.getText() ?? Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        entries.push({ uri: uri.toString(), source });
      } catch (error) {
        console.warn(`PHP Companion failed to index ${uri.toString()}`, error);
      }
    }
    this.index.updateMany(entries);
    if (showMessage) void vscode.window.showInformationMessage(t('indexed', String(this.index.getFiles().length)));
  }

  private isExcluded(uri: vscode.Uri): boolean {
    const normalized = uri.path.replace(/\\/g, '/');
    if (DEFAULT_EXCLUDED_SEGMENTS.some((segment) => normalized.includes(segment))) return true;
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    const path = folder ? relative(folder.uri.fsPath, uri.fsPath).replace(/\\/g, '/') : normalized;
    const patterns = vscode.workspace.getConfiguration('phpCompanion', uri).get<string[]>('files.exclude', []);
    return patterns.some((pattern) => minimatch(path, pattern, { dot: true }));
  }

  private registerWatchers(): void {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.php');
    const update = async (uri: vscode.Uri): Promise<void> => {
      if (this.isExcluded(uri)) return;
      try {
        const openDocument = vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
        const source = openDocument?.getText() ?? Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        this.index.update(uri.toString(), source);
      } catch {
        this.index.remove(uri.toString());
      }
    };
    this.disposables.push(
      watcher,
      watcher.onDidCreate(update),
      watcher.onDidChange(update),
      watcher.onDidDelete((uri) => this.index.remove(uri.toString())),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'php' && !event.document.isUntitled) {
          this.index.update(event.document.uri.toString(), event.document.getText());
        }
      }),
    );
  }

  dispose(): void {
    this.disposables.forEach((item) => item.dispose());
    this.parser.dispose();
  }
}

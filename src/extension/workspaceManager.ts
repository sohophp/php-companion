import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { relative } from 'node:path';
import { resolvePsr4Class, type Psr4Mapping } from '../composer/project.js';
import { PhpSyntaxParser } from '../parser/phpParser.js';
import { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';
import { t } from './localize.js';

const DEFAULT_EXCLUDED_SEGMENTS = ['/vendor/', '/.git/', '/node_modules/', '/var/cache/', '/storage/framework/'];

export class WorkspaceManager implements vscode.Disposable {
  readonly index: WorkspaceSymbolIndex;
  private readonly disposables: vscode.Disposable[] = [];
  private fullIndexComplete = false;
  private rebuildPromise?: Promise<void>;

  private constructor(
    private readonly parser: PhpSyntaxParser,
    private readonly mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[],
  ) {
    this.index = new WorkspaceSymbolIndex(parser);
  }

  static async create(
    context: vscode.ExtensionContext,
    mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[] = () => [],
  ): Promise<WorkspaceManager> {
    const parser = await PhpSyntaxParser.create({
      coreWasmPath: context.asAbsolutePath('dist/web-tree-sitter.wasm'),
      phpWasmPath: context.asAbsolutePath('dist/tree-sitter-php.wasm'),
    });
    const manager = new WorkspaceManager(parser, mappingsForUri);
    manager.registerWatchers();
    return manager;
  }

  async rebuild(showMessage = false): Promise<void> {
    if (this.rebuildPromise) return this.rebuildPromise;
    this.rebuildPromise = this.rebuildInternal(showMessage);
    try {
      await this.rebuildPromise;
    } finally {
      this.rebuildPromise = undefined;
    }
  }

  async ensureFullIndex(): Promise<void> {
    if (this.fullIndexComplete) return;
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'PHP Companion: Indexing workspace…' },
      () => this.rebuild(),
    );
  }

  async indexOpenDocuments(): Promise<void> {
    for (const document of vscode.workspace.textDocuments) {
      if (document.languageId === 'php' && !document.isUntitled) await this.indexDocumentAndImports(document);
    }
  }

  private async rebuildInternal(showMessage: boolean): Promise<void> {
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
    await this.index.updateManyAsync(entries);
    this.fullIndexComplete = true;
    if (showMessage) void vscode.window.showInformationMessage(t('indexed', String(this.index.getFiles().length)));
  }

  private async indexDocumentAndImports(document: vscode.TextDocument): Promise<void> {
    const visited = new Set<string>();
    const indexUri = async (uri: vscode.Uri, source?: string): Promise<void> => {
      const key = uri.toString();
      if (visited.has(key) || this.isExcluded(uri)) return;
      visited.add(key);
      try {
        const text = source ?? Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        this.index.update(key, text);
        for (const fqcn of this.index.getRelatedClasses(key)) {
          for (const path of resolvePsr4Class(fqcn, this.mappingsForUri(uri))) {
            const dependency = vscode.Uri.file(path);
            try {
              await vscode.workspace.fs.stat(dependency);
              await indexUri(dependency);
              break;
            } catch {
              // Try the next PSR-4 directory.
            }
          }
        }
      } catch (error) {
        console.warn(`PHP Companion failed to index ${key}`, error);
      }
    };
    await indexUri(document.uri, document.getText());
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
      vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === 'php' && !document.isUntitled) void this.indexDocumentAndImports(document);
      }),
    );
  }

  dispose(): void {
    this.disposables.forEach((item) => item.dispose());
    this.index.clear();
    this.parser.dispose();
  }
}

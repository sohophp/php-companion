import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolvePsr4Class, type Psr4Mapping } from '../composer/project.js';
import { PhpSyntaxParser } from '../parser/phpParser.js';
import { WorkspaceSymbolIndex } from '../index/workspaceIndex.js';
import { t } from './localize.js';

const DEFAULT_EXCLUDED_SEGMENTS = ['/vendor/', '/.git/', '/node_modules/', '/var/cache/', '/storage/framework/'];

export class WorkspaceManager implements vscode.Disposable {
  readonly index: WorkspaceSymbolIndex;
  private readonly disposables: vscode.Disposable[] = [];
  private fullIndexComplete = false;
  private rebuildPromise?: Promise<boolean>;

  private constructor(
    private readonly parser: PhpSyntaxParser,
    private readonly mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[],
  ) {
    this.index = new WorkspaceSymbolIndex(parser);
  }

  static async create(
    context: vscode.ExtensionContext,
    mappingsForUri: (uri: vscode.Uri) => Psr4Mapping[] = () => [],
    privateOutput?: vscode.LogOutputChannel,
  ): Promise<WorkspaceManager> {
    const parser = await PhpSyntaxParser.create({
      coreWasmPath: context.asAbsolutePath('dist/web-tree-sitter.wasm'),
      phpWasmPath: context.asAbsolutePath('dist/tree-sitter-php.wasm'),
    });
    const manager = new WorkspaceManager(parser, mappingsForUri);
    manager.output = privateOutput;
    manager.registerOpenDocumentTracking();
    return manager;
  }

  private output?: vscode.LogOutputChannel;

  async rebuild(showMessage = false, token?: vscode.CancellationToken): Promise<boolean> {
    return this.runRebuild(showMessage, token);
  }

  private async runRebuild(showMessage: boolean, token?: vscode.CancellationToken, roots?: string[]): Promise<boolean> {
    while (this.rebuildPromise) await this.rebuildPromise;
    this.rebuildPromise = this.rebuildInternal(showMessage, token, roots);
    try {
      return await this.rebuildPromise;
    } finally {
      this.rebuildPromise = undefined;
    }
  }

  async ensureFullIndex(): Promise<void> {
    if (this.fullIndexComplete) return;
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'PHP Companion: Indexing workspace…', cancellable: true },
      (_progress, token) => this.rebuild(false, token),
    );
  }

  async ensureProjectIndex(uri: vscode.Uri, token?: vscode.CancellationToken): Promise<boolean> {
    return this.refreshProjectIndexes([uri], token);
  }

  async refreshProjectIndexes(uris: readonly vscode.Uri[], token?: vscode.CancellationToken): Promise<boolean> {
    const roots = uris.flatMap((uri) => this.mappingsForUri(uri).flatMap((mapping) => mapping.directories));
    const key = [...new Set(roots.map((root) => resolve(root)))].sort().join('|');
    if (!key) throw new Error('The files are not covered by a Composer PSR-4 project.');
    return vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'PHP Companion: Indexing Composer project…', cancellable: true },
      (_progress, progressToken) => {
        const combined = { get isCancellationRequested(): boolean { return Boolean(token?.isCancellationRequested || progressToken.isCancellationRequested); } } as vscode.CancellationToken;
        return this.runRebuild(false, combined, roots);
      },
    );
  }

  indexDocument(document: vscode.TextDocument): void {
    if (document.languageId === 'php' && !document.isUntitled) this.index.update(document.uri.toString(), document.getText());
  }

  async indexOpenDocuments(): Promise<void> {
    for (const document of vscode.workspace.textDocuments) {
      if (document.languageId === 'php' && !document.isUntitled) await this.indexDocumentAndImports(document);
    }
  }

  private async rebuildInternal(showMessage: boolean, token?: vscode.CancellationToken, roots?: string[]): Promise<boolean> {
    this.index.clear();
    const configurationResource = roots?.[0]
      ? vscode.Uri.file(roots[0])
      : (vscode.workspace.workspaceFolders?.[0]?.uri ?? null);
    const configuration = vscode.workspace.getConfiguration('phpCompanion', configurationResource);
    const maxFiles = configuration.get<number>('indexing.maxFiles', 10_000);
    const maxFileSize = configuration.get<number>('indexing.maxFileSizeKb', 512) * 1024;
    const maxTotal = configuration.get<number>('indexing.maxTotalMb', 128) * 1024 * 1024;
    const started = performance.now();
    const uris = roots?.length
      ? (await Promise.all([...new Set(roots)].map((root) => vscode.workspace.findFiles(new vscode.RelativePattern(vscode.Uri.file(root), '**/*.php'), '**/{vendor,.git,node_modules,var/cache,storage/framework}/**', maxFiles + 1)))).flat()
      : await vscode.workspace.findFiles('**/*.php', '**/{vendor,.git,node_modules,var/cache,storage/framework}/**', maxFiles + 1);
    const uniqueUris = [...new Map(uris.map((uri) => [uri.toString(), uri])).values()];
    if (uniqueUris.length > maxFiles) throw new Error(`Index limit exceeded (${maxFiles} files). Narrow phpCompanion.files.exclude or raise indexing.maxFiles.`);
    const entries: Array<{ uri: string; source: string }> = [];
    let totalBytes = 0;
    for (const uri of uniqueUris) {
      if (token?.isCancellationRequested) {
        this.index.clear();
        this.output?.info('Indexing cancelled; parsed syntax trees were released.');
        return false;
      }
      if (this.isExcluded(uri)) continue;
      try {
        const size = (await vscode.workspace.fs.stat(uri)).size;
        if (size > maxFileSize) continue;
        totalBytes += size;
        if (totalBytes > maxTotal) {
          this.index.clear();
          throw new IndexLimitError(`Index size limit exceeded (${configuration.get<number>('indexing.maxTotalMb', 128)} MB).`);
        }
        const openDocument = vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
        const source = openDocument?.getText() ?? Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        entries.push({ uri: uri.toString(), source });
      } catch (error) {
        if (error instanceof IndexLimitError) throw error;
        if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') continue;
        console.warn(`PHP Companion failed to index ${uri.toString()}`, error);
      }
    }
    const complete = await this.index.updateManyAsync(entries, 50, () => !token?.isCancellationRequested);
    if (!complete) {
      this.output?.info('Indexing cancelled; parsed syntax trees were released.');
      return false;
    }
    this.fullIndexComplete = true;
    this.output?.info(`Indexed ${entries.length} files (${(totalBytes / 1024 / 1024).toFixed(1)} MB) in ${(performance.now() - started).toFixed(0)} ms.`);
    if (showMessage) void vscode.window.showInformationMessage(t('indexed', String(this.index.getFiles().length)));
    return true;
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

  private registerOpenDocumentTracking(): void {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'php' && !event.document.isUntitled) {
          this.index.update(event.document.uri.toString(), event.document.getText());
        }
      }),
      vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === 'php' && !document.isUntitled) void this.indexDocumentAndImports(document);
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        if (!this.fullIndexComplete) this.index.remove(document.uri.toString());
      }),
    );
  }

  dispose(): void {
    this.disposables.forEach((item) => item.dispose());
    this.index.clear();
    this.parser.dispose();
  }
}

class IndexLimitError extends Error {}

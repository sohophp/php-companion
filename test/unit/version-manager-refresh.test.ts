import { beforeEach, expect, it, vi } from 'vitest';
import type { PhpVersionResolution } from '../../src/php-version/types.js';

const state = vi.hoisted(() => ({ folders: [] as any[], settings: new Map<string, string>(),
  resolve: vi.fn(), events: [] as any[] }));
const uri = (path: string): any => ({ fsPath: path, toString: () => `file://${path}` });
vi.mock('vscode', () => ({
  env: { language: 'en' },
  EventEmitter: class {
    event = (): any => ({ dispose(): void {} });
    fire(value: unknown): void { state.events.push(value); }
    dispose(): void {}
  },
  RelativePattern: class {},
  Disposable: { from: (...items: any[]): any => ({ dispose: (): void => items.forEach(item => item.dispose()) }) },
  window: { onDidChangeActiveTextEditor: (): any => ({ dispose(): void {} }) },
  workspace: {
    get workspaceFolders(): any[] { return state.folders; }, textDocuments: [],
    getWorkspaceFolder: (value: any): any => state.folders.find(folder => value.fsPath === folder.uri.fsPath || value.fsPath.startsWith(`${folder.uri.fsPath}/`)),
    getConfiguration: (_section: string, value: any): any => ({ get: (name: string, fallback?: unknown) => name === 'phpVersion' ? state.settings.get(value.fsPath) ?? '7.2' : fallback }),
    createFileSystemWatcher: (): any => ({ dispose(): void {}, onDidChange: () => ({ dispose(): void {} }), onDidCreate: () => ({ dispose(): void {} }), onDidDelete: () => ({ dispose(): void {} }) }),
  },
}));
vi.mock('../../src/composer/project.js', () => ({ findComposerRoot: async (_path: string, root: string): Promise<string> => root,
  loadComposerProject: async (): Promise<any> => ({ warnings: [] }) }));
vi.mock('../../src/php-version/resolver.js', () => ({ resolvePhpVersion: (options: unknown): Promise<PhpVersionResolution> => state.resolve(options) }));
vi.mock('@php-companion/runtime-probe', () => ({ probePhpRuntime: async (): Promise<undefined> => undefined }));
import { VersionManager } from '../../src/extension/versionManager.js';

function deferred(): { promise: Promise<PhpVersionResolution>; finish: (target: '7.2' | '8.5') => void } {
  let done!: (value: PhpVersionResolution) => void;
  return { promise: new Promise(resolve => { done = resolve; }), finish: target => done({ target, source: 'setting', sourceDetail: 'test', discovered: [], warnings: [] }) };
}
const folder = { name: 'first', uri: uri('/projects/first'), index: 0 };
beforeEach(() => { state.folders = [folder]; state.events = []; state.settings.clear(); state.resolve.mockReset(); });

it('keeps the newer folder refresh when an older global refresh finishes later', async () => {
  const old = deferred(), current = deferred(); state.resolve.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const status = { hide: vi.fn(), show: vi.fn() };
  const manager = new VersionManager(status as any);
  try {
    const first = manager.refresh(); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(1));
    state.settings.set(folder.uri.fsPath, '8.5');
    const second = manager.refresh(folder); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(2));
    current.finish('8.5'); await second; old.finish('7.2'); await first;
    expect(manager.stateForUri(uri('/projects/first/File.php'))?.resolution.target).toBe('8.5');
    expect(state.events.map(event => event.resolution.target)).toEqual(['8.5']);
  } finally { manager.dispose(); }
});

it('does not restore a removed workspace folder from an outstanding version resolution', async () => {
  const old = deferred(); state.resolve.mockReturnValueOnce(old.promise);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    const first = manager.refresh(); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(1));
    state.folders = []; await manager.refresh(); old.finish('7.2'); await first;
    expect(manager.allStates()).toEqual([]); expect(state.events).toEqual([]);
  } finally { manager.dispose(); }
});

it('discards an outstanding document resolution after a newer folder refresh', async () => {
  const old = deferred(), current = deferred(); state.resolve.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    const document = uri('/projects/first/File.php');
    const first = manager.ensureForUri(document); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(1));
    const second = manager.refresh(folder); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(2));
    current.finish('8.5'); await second; old.finish('7.2');
    expect((await first)?.resolution.target).toBe('8.5');
    expect(manager.allStates().map(item => item.resolution.target)).toEqual(['8.5']);
    expect(state.events.map(event => event.resolution.target)).toEqual(['8.5']);
  } finally { manager.dispose(); }
});

it('preserves another root refresh when only the first root is refreshed again', async () => {
  const secondFolder = { name: 'second', uri: uri('/projects/second'), index: 1 }; state.folders.push(secondFolder);
  const old = deferred(), other = deferred(), current = deferred();
  state.resolve.mockReturnValueOnce(old.promise).mockReturnValueOnce(other.promise).mockReturnValueOnce(current.promise);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    const first = manager.refresh(); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(2));
    const second = manager.refresh(folder); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(3));
    current.finish('8.5'); await second; other.finish('7.2'); old.finish('7.2'); await first;
    expect(manager.stateForUri(uri('/projects/first/File.php'))?.resolution.target).toBe('8.5');
    expect(manager.stateForUri(uri('/projects/second/File.php'))?.resolution.target).toBe('7.2');
    expect(state.events.map(event => [event.folder.name, event.resolution.target])).toEqual([['first', '8.5'], ['second', '7.2']]);
  } finally { manager.dispose(); }
});

it('does not publish or show a late version result after disposal', async () => {
  const old = deferred(); state.resolve.mockReturnValueOnce(old.promise);
  const status = { hide: vi.fn(), show: vi.fn() }, manager = new VersionManager(status as any);
  const pending = manager.refresh(); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(1));
  manager.dispose(); old.finish('7.2'); await pending;
  expect(state.events).toEqual([]); expect(status.show).not.toHaveBeenCalled();
});

import { beforeEach, expect, it, vi } from 'vitest';
import type { PhpVersionResolution } from '../../src/php-version/types.js';

const state = vi.hoisted(() => ({ folders: [] as any[], settings: new Map<string, string>(),
  activeUri: undefined as any,
  resolve: vi.fn(), findRoot: vi.fn(), events: [] as any[], roots: new Map<string, string>(), missingComposers: new Set<string>(),
  composerPlatforms: new Map<string, string>(), watchers: new Map<string, (() => void)[]>() }));
const uri = (path: string): any => ({ fsPath: path, toString: () => `file://${path}` });
vi.mock('vscode', () => ({
  env: { language: 'en' },
  EventEmitter: class {
    event = (): any => ({ dispose(): void {} });
    fire(value: unknown): void { state.events.push(value); }
    dispose(): void {}
  },
  RelativePattern: class { constructor(readonly base: string) {} },
  Disposable: { from: (...items: any[]): any => ({ dispose: (): void => items.forEach(item => item.dispose()) }) },
  window: { get activeTextEditor(): any { return state.activeUri ? { document: { uri: state.activeUri } } : undefined; },
    onDidChangeActiveTextEditor: (): any => ({ dispose(): void {} }) },
  workspace: {
    get workspaceFolders(): any[] { return state.folders; }, textDocuments: [],
    getWorkspaceFolder: (value: any): any => state.folders.find(folder => value.fsPath === folder.uri.fsPath || value.fsPath.startsWith(`${folder.uri.fsPath}/`)),
    getConfiguration: (_section: string, value: any): any => ({ get: (name: string, fallback?: unknown) => name === 'phpVersion' ? state.settings.get(value.fsPath) ?? '7.2' : fallback }),
    createFileSystemWatcher: (pattern: any): any => ({ dispose(): void {},
      onDidChange: (callback: () => void): any => { state.watchers.set(pattern.base, [...(state.watchers.get(pattern.base) ?? []), callback]); return { dispose(): void {} }; },
      onDidCreate: () => ({ dispose(): void {} }), onDidDelete: () => ({ dispose(): void {} }) }),
  },
}));
vi.mock('../../src/composer/project.js', () => ({ findComposerRoot: (path: string, root: string): Promise<string | undefined> => state.findRoot(path, root),
  loadComposerProject: async (root: string): Promise<any> => state.missingComposers.has(root) ? undefined : ({ warnings: [], platformPhp: state.composerPlatforms.get(root) }) }));
vi.mock('../../src/php-version/resolver.js', () => ({ resolvePhpVersion: (options: unknown): Promise<PhpVersionResolution> => state.resolve(options) }));
vi.mock('@php-companion/runtime-probe', () => ({ probePhpRuntime: async (): Promise<undefined> => undefined }));
import { VersionManager } from '../../src/extension/versionManager.js';

function deferred(): { promise: Promise<PhpVersionResolution>; finish: (target: '7.2' | '8.5') => void } {
  let done!: (value: PhpVersionResolution) => void;
  return { promise: new Promise(resolve => { done = resolve; }), finish: target => done({ target, source: 'setting', sourceDetail: 'test', discovered: [], warnings: [] }) };
}
const folder = { name: 'first', uri: uri('/projects/first'), index: 0 };
beforeEach(() => { state.folders = [folder]; state.activeUri = undefined; state.events = []; state.settings.clear(); state.roots.clear();
  state.composerPlatforms.clear(); state.missingComposers.clear(); state.watchers.clear(); state.resolve.mockReset();
  state.findRoot.mockReset().mockImplementation(async (path: string, root: string) => state.roots.get(path) ?? root); });

function deferredRoot(): { promise: Promise<string | undefined>; finish: (root?: string) => void } {
  let done!: (value: string | undefined) => void;
  return { promise: new Promise(resolve => { done = resolve; }), finish: root => done(root) };
}

it('renders the cached parent version when the active nested Composer file is deleted', async () => {
  vi.useFakeTimers();
  const document = uri('/projects/first/nested/File.php'), root = '/projects/first/nested';
  state.resolve.mockImplementation(async ({ composer }) => ({ target: composer.platformPhp.slice(0, 3), source: 'setting', sourceDetail: 'test', discovered: [], warnings: [] }));
  state.composerPlatforms.set(folder.uri.fsPath, '8.5.9'); state.composerPlatforms.set(root, '8.1.0'); state.roots.set(document.fsPath, root);
  const status = { text: '', hide(): void {}, show(): void {} }, manager = new VersionManager(status as any);
  try {
    await manager.refresh(); state.activeUri = document; await manager.ensureForUri(document);
    expect(status.text).toContain('SoPHP: 8.1'); state.events = [];
    state.roots.delete(document.fsPath); state.watchers.get(root)![0]!(); await vi.advanceTimersByTimeAsync(250);
    expect(manager.stateForUri(document)?.resolution.target).toBe('8.5');
    expect(status.text).toContain('SoPHP: 8.5');
    expect(state.resolve).toHaveBeenCalledTimes(2); expect(state.events).toEqual([]);
  } finally { manager.dispose(); vi.useRealTimers(); }
});

it('does not restore a deleted nested Composer root from a late root lookup', async () => {
  vi.useFakeTimers();
  const lookup = deferredRoot(), document = uri('/projects/first/nested/File.php'), root = '/projects/first/nested';
  const parentResolution = { target: '7.2', source: 'setting', sourceDetail: 'parent', discovered: [], warnings: [] };
  state.resolve.mockImplementation(async ({ composer }) => ({ ...parentResolution, target: composer?.platformPhp === '7.2.34' ? '7.2' : '8.5' }));
  state.composerPlatforms.set(folder.uri.fsPath, '7.2.34'); state.composerPlatforms.set(root, '8.5.9'); state.roots.set(document.fsPath, root);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    await manager.refresh(); await manager.ensureForUri(document); state.events = [];
    state.findRoot.mockReturnValueOnce(lookup.promise);
    const old = manager.ensureForUri(document);
    state.roots.delete(document.fsPath); state.composerPlatforms.delete(root); state.missingComposers.add(root);
    state.watchers.get(root)![0]!(); await vi.advanceTimersByTimeAsync(250);
    expect(manager.stateForUri(document)?.projectRoot).toBe(folder.uri.fsPath);
    lookup.finish(root);
    expect((await old)?.projectRoot).toBe(folder.uri.fsPath);
    expect(manager.stateForUri(document)?.resolution.target).toBe('7.2');
    expect(manager.allStates().map(item => item.projectRoot)).toEqual([folder.uri.fsPath]);
    expect(state.events).toEqual([]); expect(state.resolve).toHaveBeenCalledTimes(2);
  } finally { manager.dispose(); vi.useRealTimers(); }
});

it('does not let a late folder root lookup cancel a newer document version probe', async () => {
  const lookup = deferredRoot(), current = deferred(); state.findRoot.mockReturnValueOnce(lookup.promise);
  state.resolve.mockReturnValueOnce(current.promise).mockResolvedValue({ target: '7.2', source: 'setting', sourceDetail: 'old', discovered: [], warnings: [] });
  const manager = new VersionManager({ hide() {}, show() {} } as any), document = uri('/projects/first/File.php');
  try {
    const refresh = manager.refresh(); const probe = manager.ensureForUri(document);
    await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(1));
    lookup.finish(folder.uri.fsPath); await refresh; current.finish('8.5'); await probe;
    expect(manager.stateForUri(document)?.resolution.target).toBe('8.5');
    expect(state.events.map(event => event.resolution.target)).toEqual(['8.5']);
  } finally { manager.dispose(); }
});

it('allows an older root lookup to finish when only a different nested project changed', async () => {
  vi.useFakeTimers();
  const lookup = deferredRoot(), one = uri('/projects/first/one/File.php'), two = uri('/projects/first/two/File.php');
  const firstRoot = '/projects/first/one', secondRoot = '/projects/first/two';
  state.roots.set(one.fsPath, firstRoot); state.roots.set(two.fsPath, secondRoot);
  state.resolve.mockResolvedValue({ target: '7.2', source: 'setting', sourceDetail: 'test', discovered: [], warnings: [] });
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    await manager.ensureForUri(two); state.events = [];
    state.findRoot.mockReturnValueOnce(lookup.promise); const pending = manager.ensureForUri(one);
    state.watchers.get(secondRoot)![0]!(); await vi.advanceTimersByTimeAsync(250);
    lookup.finish(firstRoot); expect((await pending)?.projectRoot).toBe(firstRoot);
    expect(state.events.map(event => event.projectRoot)).toEqual([secondRoot, firstRoot]);
  } finally { manager.dispose(); vi.useRealTimers(); }
});

it('does not let an older cold document resolution overwrite a newer Composer snapshot', async () => {
  const old = deferred(), current = deferred(); state.resolve.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    const document = uri('/projects/first/File.php'); state.composerPlatforms.set(folder.uri.fsPath, '7.2.34');
    const first = manager.ensureForUri(document); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(1));
    state.composerPlatforms.set(folder.uri.fsPath, '8.5.9');
    const second = manager.ensureForUri(document); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(2));
    expect(state.resolve.mock.calls.map(([options]) => options.composer.platformPhp)).toEqual(['7.2.34', '8.5.9']);
    current.finish('8.5'); await second; old.finish('7.2');
    expect((await first)?.resolution.target).toBe('8.5');
    expect(manager.stateForUri(document)?.resolution.target).toBe('8.5');
    expect(state.events.map(event => event.resolution.target)).toEqual(['8.5']);
  } finally { manager.dispose(); }
});

it('keeps the newer Composer watcher refresh when the previous document probe finishes late', async () => {
  vi.useFakeTimers();
  const old = deferred(), current = deferred(); state.resolve.mockResolvedValueOnce({ target: '7.2', source: 'setting', sourceDetail: 'initial', discovered: [], warnings: [] })
    .mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    await manager.refresh(); state.events = [];
    const change = state.watchers.get(folder.uri.fsPath)?.[0]; expect(change).toBeTypeOf('function');
    state.composerPlatforms.set(folder.uri.fsPath, '7.2.34'); change!(); await vi.advanceTimersByTimeAsync(250);
    expect(state.resolve).toHaveBeenCalledTimes(2);
    state.composerPlatforms.set(folder.uri.fsPath, '8.5.9'); change!(); await vi.advanceTimersByTimeAsync(250);
    expect(state.resolve).toHaveBeenCalledTimes(3);
    current.finish('8.5'); await vi.advanceTimersByTimeAsync(0); old.finish('7.2'); await vi.advanceTimersByTimeAsync(0);
    expect(manager.stateForUri(uri('/projects/first/File.php'))?.resolution.target).toBe('8.5');
    expect(state.events.map(event => event.resolution.target)).toEqual(['8.5']);
  } finally { manager.dispose(); vi.useRealTimers(); }
});

it('withdraws the pending Composer result as soon as a new change arrives, before debounce expires', async () => {
  vi.useFakeTimers();
  const old = deferred(), current = deferred(); state.resolve.mockResolvedValueOnce({ target: '7.2', source: 'setting', sourceDetail: 'initial', discovered: [], warnings: [] })
    .mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    await manager.refresh(); state.events = [];
    const change = state.watchers.get(folder.uri.fsPath)![0]!;
    change(); await vi.advanceTimersByTimeAsync(250); expect(state.resolve).toHaveBeenCalledTimes(2);
    change(); old.finish('7.2'); await vi.advanceTimersByTimeAsync(0);
    expect(state.events).toEqual([]);
    await vi.advanceTimersByTimeAsync(250); current.finish('8.5'); await vi.advanceTimersByTimeAsync(0);
    expect(manager.stateForUri(uri('/projects/first/File.php'))?.resolution.target).toBe('8.5');
    expect(state.events.map(event => event.resolution.target)).toEqual(['8.5']);
  } finally { manager.dispose(); vi.useRealTimers(); }
});

it('preserves independent nested Composer projects inside the same workspace folder', async () => {
  const first = deferred(), second = deferred(); state.resolve.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    const firstUri = uri('/projects/first/one/File.php'), secondUri = uri('/projects/first/two/File.php');
    state.roots.set(firstUri.fsPath, '/projects/first/one'); state.roots.set(secondUri.fsPath, '/projects/first/two');
    const one = manager.ensureForUri(firstUri); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(1));
    const two = manager.ensureForUri(secondUri); await vi.waitFor(() => expect(state.resolve).toHaveBeenCalledTimes(2));
    second.finish('8.5'); await two; first.finish('7.2'); await one;
    expect(manager.stateForUri(firstUri)?.resolution.target).toBe('7.2');
    expect(manager.stateForUri(secondUri)?.resolution.target).toBe('8.5');
    expect(state.events.map(event => [event.projectRoot, event.resolution.target])).toEqual([
      ['/projects/first/two', '8.5'], ['/projects/first/one', '7.2'],
    ]);
  } finally { manager.dispose(); }
});

it('does not cancel the parent folder refresh when a nested Composer watcher changes', async () => {
  vi.useFakeTimers();
  const parent = deferred(), child = deferred(); state.resolve.mockResolvedValueOnce({ target: '7.2', source: 'setting', sourceDetail: 'initial', discovered: [], warnings: [] })
    .mockReturnValueOnce(parent.promise).mockReturnValueOnce(child.promise);
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    const nested = uri('/projects/first/nested/File.php'), root = '/projects/first/nested'; state.roots.set(nested.fsPath, root);
    await manager.ensureForUri(nested); state.events = [];
    const pending = manager.refresh(); await vi.advanceTimersByTimeAsync(0);
    expect(state.resolve).toHaveBeenCalledTimes(2);
    state.watchers.get(root)![0]!(); await vi.advanceTimersByTimeAsync(250);
    expect(state.resolve).toHaveBeenCalledTimes(3);
    parent.finish('7.2'); await pending; child.finish('8.5'); await vi.advanceTimersByTimeAsync(0);
    expect(manager.stateForUri(uri('/projects/first/File.php'))?.resolution.target).toBe('7.2');
    expect(manager.stateForUri(nested)?.resolution.target).toBe('8.5');
    expect(state.events.map(event => [event.projectRoot, event.resolution.target])).toEqual([
      [folder.uri.fsPath, '7.2'], [root, '8.5'],
    ]);
  } finally { manager.dispose(); vi.useRealTimers(); }
});

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


it('recomputes the root folder version after its Composer file is deleted and restores it on creation', async () => {
  vi.useFakeTimers();
  const document = uri('/projects/first/File.php'); state.activeUri = document;
  state.resolve.mockImplementation(async ({ composer }) => ({ target: composer?.platformPhp ?? '8.5', source: 'setting', sourceDetail: 'controlled fallback', discovered: [], warnings: [] }));
  state.composerPlatforms.set(folder.uri.fsPath, '8.1');
  const status = { text: '', hide(): void {}, show(): void {} }, manager = new VersionManager(status as any);
  try {
    await manager.refresh(); expect(status.text).toContain('SoPHP: 8.1');
    state.findRoot.mockResolvedValue(undefined); state.missingComposers.add(folder.uri.fsPath);
    state.watchers.get(folder.uri.fsPath)![0]!(); await vi.advanceTimersByTimeAsync(250);
    expect(manager.stateForUri(document)?.resolution.target).toBe('8.5');
    expect(manager.stateForUri(document)?.projectRoot).toBeUndefined(); expect(status.text).toContain('SoPHP: 8.5');
    state.findRoot.mockResolvedValue(folder.uri.fsPath); state.missingComposers.delete(folder.uri.fsPath);
    state.composerPlatforms.set(folder.uri.fsPath, '7.2'); state.watchers.get(folder.uri.fsPath)![0]!();
    await vi.advanceTimersByTimeAsync(250);
    expect(manager.stateForUri(document)?.resolution.target).toBe('7.2'); expect(status.text).toContain('SoPHP: 7.2');
    expect(state.events.map(event => event.resolution.target)).toEqual(['8.1', '8.5', '7.2']);
  } finally { manager.dispose(); vi.useRealTimers(); }
});

it('does not cancel an independent nested version probe when its parent Composer file is deleted', async () => {
  vi.useFakeTimers();
  const document = uri('/projects/first/nested/File.php'), root = '/projects/first/nested', child = deferred();
  state.roots.set(document.fsPath, root);
  state.resolve.mockResolvedValueOnce({ target: '8.1', source: 'setting', sourceDetail: 'parent', discovered: [], warnings: [] })
    .mockReturnValueOnce(child.promise).mockResolvedValue({ target: '8.5', source: 'setting', sourceDetail: 'fallback', discovered: [], warnings: [] });
  const manager = new VersionManager({ hide() {}, show() {} } as any);
  try {
    await manager.refresh(); const pending = manager.ensureForUri(document); await vi.advanceTimersByTimeAsync(0);
    state.findRoot.mockImplementation(async (path: string) => state.roots.get(path));
    state.watchers.get(folder.uri.fsPath)![0]!(); await vi.advanceTimersByTimeAsync(250);
    child.finish('7.2'); await pending;
    expect(manager.stateForUri(document)?.resolution.target).toBe('7.2');
    expect(manager.stateForUri(uri('/projects/first/Other.php'))?.resolution.target).toBe('8.5');
    expect(state.events.map(event => [event.projectRoot, event.resolution.target])).toEqual([
      [folder.uri.fsPath, '8.1'], [undefined, '8.5'], [root, '7.2'],
    ]);
  } finally { manager.dispose(); vi.useRealTimers(); }
});


it('discovers a Composer file created after a projectless workspace was initialized', async () => {
  vi.useFakeTimers(); const document = uri('/projects/first/File.php'); state.activeUri = document;
  state.findRoot.mockResolvedValue(undefined);
  state.resolve.mockImplementation(async ({ composer }) => ({ target: composer?.platformPhp ?? '8.5', source: 'setting', sourceDetail: 'controlled fallback', discovered: [], warnings: [] }));
  const status = { text: '', hide(): void {}, show(): void {} }, manager = new VersionManager(status as any);
  try {
    await manager.refresh(); expect(status.text).toContain('SoPHP: 8.5');
    const change = state.watchers.get(folder.uri.fsPath)?.[0]; expect(change).toBeTypeOf('function');
    state.findRoot.mockResolvedValue(folder.uri.fsPath); state.composerPlatforms.set(folder.uri.fsPath, '7.2');
    change!(); await vi.advanceTimersByTimeAsync(250);
    expect(manager.stateForUri(document)?.resolution.target).toBe('7.2'); expect(status.text).toContain('SoPHP: 7.2');
    expect(state.events.map(event => event.resolution.target)).toEqual(['8.5', '7.2']);
  } finally { manager.dispose(); vi.useRealTimers(); }
});

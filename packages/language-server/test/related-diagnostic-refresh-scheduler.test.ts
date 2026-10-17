import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, it } from 'vitest';

interface Document { uri: string; languageId: string; getText(): string; }
interface Publication { uri: string; revision: number; }
interface Deferred { promise: Promise<void>; resolve(): void; reject(error: Error): void; }
interface Scheduler {
  schedule(root: string, editedUri: string, changedSymbols?: readonly string[]): void;
  pending(): number;
  stop(): void;
}
interface Dependencies {
  documents: { all(): Document[] };
  rootForUri(uri: string): string;
  publishDocumentDiagnostics(document: Document, coalesceMs: number, onlyIfChanged: boolean): Promise<void>;
  yieldToEventLoop(): Promise<void>;
  connection: { console: { warn(message: string): void } };
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(timer: number): void;
}
interface Environment extends Scheduler {
  publications: Publication[];
  warnings: string[];
  gate: Deferred;
  setRevision(revision: number): void;
  firePending(): Promise<void>;
}

// Importing server.ts starts its stdio connection. Load the actual internal
// scheduler body instead, with controlled publishers and event-loop boundaries.
const source = ts.createSourceFile('server.ts', readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'scheduleRelatedOpenDiagnostics');
if (!declaration) throw new Error('Related diagnostic scheduler was not found.');
const body = ts.transpileModule(declaration.getText(source), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const createScheduler = new Function('dependencies', `
  const {documents, rootForUri, publishDocumentDiagnostics, yieldToEventLoop,
    connection, setTimeout, clearTimeout} = dependencies;
  const relatedDiagnosticRefreshes = new Map();
  const relatedDiagnosticRefreshMs = 25;
  let shuttingDown = false;
  ${body}
  return {
    schedule: scheduleRelatedOpenDiagnostics,
    pending: () => relatedDiagnosticRefreshes.size,
    stop: () => {
      shuttingDown = true;
      for (const refresh of relatedDiagnosticRefreshes.values()) clearTimeout(refresh.timer);
      relatedDiagnosticRefreshes.clear();
    },
  };
`) as (dependencies: Dependencies) => Scheduler;

function deferred(): Deferred {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 64; turn += 1) await Promise.resolve();
}

function environment(options: { roots?: string[]; count?: number; holdInitial?: boolean; fail?: boolean; priority?: boolean } = {}): Environment {
  let revision = 1, timerId = 0;
  const timers = new Map<number, () => void>();
  const publications: Publication[] = [], warnings: string[] = [], gate = deferred();
  const documents = (options.roots ?? ['r']).flatMap(root => Array.from({ length: options.count ?? 9 }, (_, index) => ({
    uri: `${root}/${index}`, languageId: 'php', getText: (): string => options.priority && index === 8 ? 'function needle() {}' : '<?php',
  })));
  const scheduler = createScheduler({
    documents: { all: (): Document[] => documents },
    rootForUri: (uri): string => uri.split('/')[0]!,
    publishDocumentDiagnostics: async (document, coalesceMs, onlyIfChanged): Promise<void> => {
      expect(coalesceMs).toBe(0); expect(onlyIfChanged).toBe(true);
      publications.push({ uri: document.uri, revision });
      if (options.fail) throw new Error('publication failed');
      if (options.holdInitial && revision === 1) await gate.promise;
    },
    yieldToEventLoop: async (): Promise<void> => {},
    connection: { console: { warn: (message): void => { warnings.push(message); } } },
    setTimeout: (callback, delay): number => { expect(delay).toBe(25); const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout: (timer): void => { timers.delete(timer); },
  });
  return { ...scheduler, publications, warnings, gate,
    setRevision: (value): void => { revision = value; },
    firePending: async (): Promise<void> => {
      for (const [id, callback] of [...timers]) { timers.delete(id); callback(); await settle(); }
      await settle();
    },
  };
}

it('refreshes all other open files in the original order when no edit supersedes a wave', async () => {
  const run = environment(); run.schedule('r', 'r/0'); await run.firePending();
  expect(run.publications.map(item => item.uri)).toEqual(Array.from({ length: 8 }, (_, index) => `r/${index + 1}`));
  expect(run.pending()).toBe(0);
});

it('stops a superseded wave before checking files already refreshed by the latest edit', async () => {
  const run = environment({ holdInitial: true }); run.schedule('r', 'r/0'); await run.firePending();
  expect(run.publications).toHaveLength(4);
  run.setRevision(2); run.schedule('r', 'r/0'); await run.firePending();
  run.gate.resolve(); await settle();
  expect(run.publications).toHaveLength(12);
  expect(run.publications.filter(item => item.revision === 2)).toHaveLength(8);
  expect(run.pending()).toBe(0);
});

it('keeps the newest pending timer when an older wave finishes and rechecks the previous edited file', async () => {
  const run = environment({ holdInitial: true }); run.schedule('r', 'r/0'); await run.firePending();
  run.setRevision(2); run.schedule('r', 'r/1'); run.gate.resolve(); await settle();
  expect(run.publications).toHaveLength(4); expect(run.pending()).toBe(1);
  await run.firePending();
  const latest = run.publications.filter(item => item.revision === 2).map(item => item.uri);
  expect(latest).toContain('r/0'); expect(latest).not.toContain('r/1'); expect(latest).toHaveLength(8);
});

it('does not carry priority names from a running wave into the next pending edit', async () => {
  const run = environment({ holdInitial: true, priority: true }); run.schedule('r', 'r/0', ['App\\needle']); await run.firePending();
  expect(run.publications[0]!.uri).toBe('r/8');
  run.setRevision(2); run.schedule('r', 'r/0', ['App\\other']); await run.firePending();
  expect(run.publications.find(item => item.revision === 2)!.uri).toBe('r/1');
  run.gate.resolve(); await settle(); expect(run.pending()).toBe(0);
});

it('only supersedes work belonging to the same project root', async () => {
  const run = environment({ roots: ['a', 'b'], holdInitial: true });
  run.schedule('a', 'a/0'); run.schedule('b', 'b/0'); await run.firePending();
  run.setRevision(2); run.schedule('a', 'a/0'); await run.firePending(); run.gate.resolve(); await settle();
  expect(run.publications.filter(item => item.uri.startsWith('a/'))).toHaveLength(12);
  expect(run.publications.filter(item => item.uri.startsWith('b/'))).toHaveLength(8);
  expect(run.pending()).toBe(0);
});

it('does not remove a newer pending refresh when an older publication fails', async () => {
  const run = environment({ holdInitial: true }); run.schedule('r', 'r/0'); await run.firePending();
  run.setRevision(2); run.schedule('r', 'r/0'); run.gate.reject(new Error('old publication failed')); await settle();
  expect(run.pending()).toBe(1); await run.firePending();
  expect(run.publications.filter(item => item.revision === 2)).toHaveLength(8);
  expect(run.warnings).toHaveLength(1); expect(run.pending()).toBe(0);
});

it('releases its current record after an empty refresh or a publication failure', async () => {
  const empty = environment({ count: 1 }); empty.schedule('r', 'r/0'); await empty.firePending();
  expect(empty.publications).toHaveLength(0); expect(empty.pending()).toBe(0);
  const failed = environment({ fail: true }); failed.schedule('r', 'r/0'); await failed.firePending();
  expect(failed.warnings).toHaveLength(1); expect(failed.pending()).toBe(0);
});

it('stops before the next related-file batch after shutdown', async () => {
  const run = environment({ holdInitial: true }); run.schedule('r', 'r/0'); await run.firePending();
  run.stop(); run.gate.resolve(); await settle();
  expect(run.publications).toHaveLength(4); expect(run.pending()).toBe(0);
});

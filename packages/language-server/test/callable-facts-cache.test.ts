import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '@php-companion/semantic';
import { CallableFactCache, callableFactCachePath } from '../src/callableFactsCache.js';

describe('persistent callable factory facts', () => {
  const roots: string[] = []; let parser: PhpSyntaxParser;
  afterEach(async () => { parser?.dispose(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

  it('restores exact positive dependency chains and isolates a corrupt source entry', async () => {
    parser = await PhpSyntaxParser.createDefault();
    const root = await mkdtemp(join(tmpdir(), 'php-companion-callable-cache-')); roots.push(root);
    const cacheDirectory = join(root, '.cache');
    const sources = new Map([
      ['file:///CallableCacheInner.php', '<?php namespace CallableCache; class State { public function __construct(public readonly int $id) {} } function inner(): State { return new State(1); }'],
      ['file:///CallableCacheMiddle.php', '<?php namespace CallableCache; function middle(): State { return inner(); }'],
      ['file:///CallableCacheOuter.php', '<?php namespace CallableCache; function outer(): State { return middle(); }'],
      ['file:///CallableCacheUnrelated.php', '<?php namespace CallableCache; class Other {} function unrelated(): Other { return new Other(); }'],
      ['file:///CallableCacheConsumer.php', '<?php namespace CallableCache; class Consumer { public function run(): void { $state = outer(); foreach ($state as &$value) {} $other = unrelated(); foreach ($other as &$value) {} } }'],
    ]);
    const populate = (): SemanticWorkspace => {
      const workspace = new SemanticWorkspace(parser);
      for (const [uri, source] of sources) workspace.update(uri, source);
      return workspace;
    };
    const coldWorkspace = populate();
    expect(coldWorkspace.readonlyPropertyAssignments('file:///CallableCacheConsumer.php')).toHaveLength(1);
    const cold = await CallableFactCache.open(cacheDirectory, root);
    expect(await cold.commit(coldWorkspace, new Set())).toEqual({ written: true, facts: 4 });
    expect(await cold.commit(coldWorkspace, new Set())).toEqual({ written: false, facts: 4 });
    coldWorkspace.dispose();

    const hotWorkspace = populate(); const hot = await CallableFactCache.open(cacheDirectory, root);
    expect(hot.restore(hotWorkspace)).toBe(4);
    expect(hotWorkspace.callableConstructionFacts().flatMap((document) => document.facts)).toHaveLength(4);
    hotWorkspace.dispose();

    const changedWorkspace = populate();
    changedWorkspace.update('file:///CallableCacheInner.php', sources.get('file:///CallableCacheInner.php')!.replace('new State(1)', 'dynamic_call()'));
    const changed = await CallableFactCache.open(cacheDirectory, root);
    expect(changed.restore(changedWorkspace)).toBe(1);
    expect(changedWorkspace.callableConstructionFacts().flatMap((document) => document.facts.map((fact) => fact.callable)))
      .toEqual(['callablecache\\unrelated']);
    changedWorkspace.dispose();

    const ambiguousWorkspace = populate();
    ambiguousWorkspace.update('file:///CallableCacheDuplicate.php', '<?php namespace CallableCache; function inner(): State { return new State(2); }');
    const ambiguous = await CallableFactCache.open(cacheDirectory, root);
    expect(ambiguous.restore(ambiguousWorkspace)).toBe(1);
    expect(ambiguousWorkspace.callableConstructionFacts().flatMap((document) => document.facts.map((fact) => fact.callable)))
      .toEqual(['callablecache\\unrelated']);
    ambiguousWorkspace.dispose();

    const path = callableFactCachePath(cacheDirectory, root);
    const stored = JSON.parse(await readFile(path, 'utf8')) as { entries: Record<string, { payload: { facts: Array<{ result: string }> } }> };
    stored.entries['file:///CallableCacheInner.php']!.payload.facts[0]!.result = 'CallableCache\\Other';
    await writeFile(path, JSON.stringify(stored));
    const recoveredWorkspace = populate(); const recovered = await CallableFactCache.open(cacheDirectory, root);
    expect(recovered.restore(recoveredWorkspace)).toBe(1);
    expect(recoveredWorkspace.callableConstructionFacts().flatMap((document) => document.facts.map((fact) => fact.callable)))
      .toEqual(['callablecache\\unrelated']);
    recoveredWorkspace.dispose();
  });
});

import { describe, expect, it } from 'vitest';
import { DocumentDependencyGraph } from '../src/dependency.js';

describe('DocumentDependencyGraph', () => {
  it('replaces document contributions without removing another declaration of the same node', () => {
    const graph = new DocumentDependencyGraph();
    expect(graph.replace('file:///one.php', [{ key: 'child', dependencies: ['base'] }])).toBe(true);
    expect(graph.replace('file:///two.php', [{ key: 'child', dependencies: ['base', 'contract'] }])).toBe(true);
    expect(graph.directDependents('base')).toEqual(['child']);
    graph.remove('file:///one.php');
    expect(graph.directDependents('base')).toEqual(['child']);
    graph.remove('file:///two.php');
    expect(graph.directDependents('base')).toEqual([]);
  });

  it('returns deterministic snapshots and atomically rejects invalid replacements', () => {
    const graph = new DocumentDependencyGraph({ maxNodesPerDocument: 2, maxDependenciesPerNode: 2, maxKeyLength: 16 });
    expect(graph.replace('file:///types.php', [
      { key: 'middle', dependencies: ['base'] },
      { key: 'child', dependencies: ['middle', 'contract'] },
    ])).toBe(true);
    expect(graph.documentNodes('file:///types.php')).toEqual([
      { key: 'child', dependencies: ['contract', 'middle'] },
      { key: 'middle', dependencies: ['base'] },
    ]);
    expect(graph.replace('file:///types.php', [{ key: 'too-many', dependencies: ['a', 'b', 'c'] }])).toBe(false);
    expect(graph.directDependents('base')).toEqual(['middle']);
    expect(graph.stats()).toEqual({ documents: 1, nodes: 2, edges: 3 });
  });
});

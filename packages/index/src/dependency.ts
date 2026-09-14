export interface DependencyNode {
  key: string;
  dependencies: Iterable<string>;
}

export interface DocumentDependencyGraphLimits {
  maxNodesPerDocument: number;
  maxDependenciesPerNode: number;
  maxKeyLength: number;
}

export interface DocumentDependencyGraphStats {
  documents: number;
  nodes: number;
  edges: number;
}

export const DEFAULT_DOCUMENT_DEPENDENCY_GRAPH_LIMITS: DocumentDependencyGraphLimits = {
  maxNodesPerDocument: 10_000,
  maxDependenciesPerNode: 10_000,
  maxKeyLength: 1_024,
};

type StoredNode = { key: string; dependencies: Set<string> };

/**
 * Bounded reverse dependency graph whose contributions are replaced atomically
 * per document. Multiple documents may contribute the same logical node.
 */
export class DocumentDependencyGraph {
  private readonly nodesByDocument = new Map<string, Map<string, StoredNode>>();
  private readonly dependentsByDependency = new Map<string, Map<string, Set<string>>>();

  constructor(private readonly limits: DocumentDependencyGraphLimits = DEFAULT_DOCUMENT_DEPENDENCY_GRAPH_LIMITS) {
    if (!Number.isInteger(limits.maxNodesPerDocument) || limits.maxNodesPerDocument < 1
      || !Number.isInteger(limits.maxDependenciesPerNode) || limits.maxDependenciesPerNode < 1
      || !Number.isInteger(limits.maxKeyLength) || limits.maxKeyLength < 1) {
      throw new RangeError('DocumentDependencyGraph limits must be positive integers.');
    }
  }

  replace(uri: string, nodes: Iterable<DependencyNode>): boolean {
    if (!uri) return false;
    const next = new Map<string, StoredNode>();
    for (const node of nodes) {
      if (!node.key || node.key.length > this.limits.maxKeyLength || next.has(node.key)
        || next.size >= this.limits.maxNodesPerDocument) return false;
      const dependencies = new Set<string>();
      for (const dependency of node.dependencies) {
        if (!dependency || dependency.length > this.limits.maxKeyLength
          || (!dependencies.has(dependency) && dependencies.size >= this.limits.maxDependenciesPerNode)) return false;
        dependencies.add(dependency);
      }
      next.set(node.key, { key: node.key, dependencies });
    }

    this.remove(uri);
    if (!next.size) return true;
    this.nodesByDocument.set(uri, next);
    for (const node of next.values()) for (const dependency of node.dependencies) {
      const dependents = this.dependentsByDependency.get(dependency) ?? new Map<string, Set<string>>();
      const documents = dependents.get(node.key) ?? new Set<string>();
      documents.add(uri); dependents.set(node.key, documents); this.dependentsByDependency.set(dependency, dependents);
    }
    return true;
  }

  remove(uri: string): boolean {
    const nodes = this.nodesByDocument.get(uri); if (!nodes) return false;
    this.nodesByDocument.delete(uri);
    for (const node of nodes.values()) for (const dependency of node.dependencies) {
      const dependents = this.dependentsByDependency.get(dependency); const documents = dependents?.get(node.key);
      documents?.delete(uri);
      if (documents?.size === 0) dependents?.delete(node.key);
      if (dependents?.size === 0) this.dependentsByDependency.delete(dependency);
    }
    return true;
  }

  directDependents(key: string): string[] {
    return [...(this.dependentsByDependency.get(key)?.keys() ?? [])].sort();
  }

  documentNodes(uri: string): Array<{ key: string; dependencies: string[] }> {
    return [...(this.nodesByDocument.get(uri)?.values() ?? [])]
      .map((node) => ({ key: node.key, dependencies: [...node.dependencies].sort() }))
      .sort((left, right) => left.key.localeCompare(right.key));
  }

  clear(): void {
    this.nodesByDocument.clear(); this.dependentsByDependency.clear();
  }

  stats(): DocumentDependencyGraphStats {
    let nodes = 0; let edges = 0;
    for (const document of this.nodesByDocument.values()) {
      nodes += document.size;
      for (const node of document.values()) edges += node.dependencies.size;
    }
    return { documents: this.nodesByDocument.size, nodes, edges };
  }
}

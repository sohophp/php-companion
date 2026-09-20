# Changelog

## Unreleased

- Accept an immutable caller-owned Composer project snapshot so repeated bounded scans do not reload the complete dependency graph.
- Persist bounded lexical source summaries under an independent cache key and let validated cache adapters request source only for matching candidates; unchanged non-candidates now need metadata checks instead of source reads. Discover each Composer source tree with one deterministic recursive directory read before applying existing exclusions and limits.
- Allow cache-free candidate scans to prefetch source reads with bounded concurrency while preserving deterministic callback order and existing resource budgets.
- Restore entries directly when size, mtime and ctime are unchanged, and avoid rewriting a fully unchanged persistent cache while retaining digest fallback for metadata changes.
- Support a project-only phase for on-demand clients without discovering or parsing Composer dependency sources.
- Signal project-source completeness immediately after project files are indexed so scoped language operations can proceed while dependency indexing continues.
- Mark oversized, unreadable, or unanalyzable project files as project-incomplete and dependency gaps as whole-index-incomplete. Validate resource limits and rebuild source when a cache restore adapter rejects one entry.
- Add an atomic, bounded document dependency graph with deterministic per-document snapshots and shared-node-safe removal.
- Add an atomic, bounded, in-memory document-key inverted index for incremental declaration and reference candidate lookup.
- Prioritize complete project sources within bounded indexes, truncate dependencies deterministically, and expose project versus whole-index completeness separately.

This package uses Changesets for versioning.

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.
- Report cumulative dependency progress against the full project-plus-dependency plan instead of reusing the project-only file count.

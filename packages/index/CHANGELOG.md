# Changelog

## Unreleased

- Mark oversized, unreadable, or unanalyzable project files as project-incomplete and dependency gaps as whole-index-incomplete. Validate resource limits and rebuild source when a cache restore adapter rejects one entry.
- Add an atomic, bounded document dependency graph with deterministic per-document snapshots and shared-node-safe removal.
- Add an atomic, bounded, in-memory document-key inverted index for incremental declaration and reference candidate lookup.
- Prioritize complete project sources within bounded indexes, truncate dependencies deterministically, and expose project versus whole-index completeness separately.

This package uses Changesets for versioning.

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.

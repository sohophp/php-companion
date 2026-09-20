# Changelog

## Unreleased

- Reject files outside each Composer exclusion scope before computing relative paths, avoiding redundant path work across unrelated dependency packages.
- Cache normalized package roots and compiled `exclude-from-classmap` patterns per immutable Composer project snapshot, avoiding repeated pattern construction during bounded source scans.

This package uses Changesets for versioning.

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.

---
'@php-companion/index': patch
'@php-companion/language-server': patch
---

Accept a caller-owned immutable Composer project snapshot during bounded indexing. Reuse one snapshot per workspace root across references, moves and file-watcher deltas, invalidate it only when Composer metadata changes, and coalesce Symfony container refreshes within one watcher batch.

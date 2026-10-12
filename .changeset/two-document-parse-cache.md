---
"@php-companion/parser": patch
---

Keep at most two independently owned parse results by document identity so a stable builtin snapshot can be reused after an application document. Require exact source matches, bypass reuse for incremental trees, evict the least recently used identity and free every retained tree on disposal.

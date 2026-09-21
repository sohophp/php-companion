---
"@php-companion/parser": minor
"@php-companion/semantic": minor
"@php-companion/language-server": patch
---

Extract complete PHP declarations without eagerly constructing method-body facts. Keep broad member-reference candidates available through lazy source loading, preserve inherited ownership, and materialize full facts before persistence or implementation queries.

Persist separately validated source declaration caches for reloads without materializing method bodies.

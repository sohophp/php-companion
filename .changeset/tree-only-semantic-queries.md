---
"@php-companion/parser": minor
"@php-companion/semantic": patch
---

Expose a tree-only parser entry point for semantic queries that already have indexed facts. Avoid rebuilding declarations and control-flow facts during member reference resolution, reuse traversal parents while extracting call context, and scan excluded identifier ranges once in source order.

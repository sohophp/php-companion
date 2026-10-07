---
"@php-companion/index": patch
"@php-companion/language-server": patch
---

Bound pending cache payload finalizers to the source read window, release completed tasks, and allow cancelled scans to stop waiting without replacing the persistent cache.

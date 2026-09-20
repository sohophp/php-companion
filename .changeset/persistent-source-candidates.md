---
'@php-companion/index': minor
'@php-companion/project': patch
'@php-companion/language-server': patch
---

Persist bounded per-file symbol and named-argument summaries under an independent cache key. Cold on-demand reference and promoted-property rename scans validate file metadata, read only matching candidates, cache compiled Composer exclusions, and conservatively rebuild changed, corrupt or incomplete entries before semantic resolution.

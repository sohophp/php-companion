---
"@php-companion/parser": patch
"@php-companion/semantic": patch
"@php-companion/language-server": patch
---

Keep inline HTML and PHP tags out of PHP symbol reference and rename facts. Suppress PHP navigation and signature queries within HTML while preserving incremental UTF-16 edits, short echo regions, and incomplete PHP expressions. Invalidate earlier semantic implementation caches; declaration-only cache contracts remain unchanged.

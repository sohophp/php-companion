---
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Resolve `namespace\Symbol` explicitly within the current namespace for types,
functions, and constants. Keep qualified function and constant names relative,
expand namespace aliases, and navigate from complete qualified source names.
Keep namespace constants, class constants, and `use const` aliases case-sensitive.

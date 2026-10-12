---
"@php-companion/phpdoc": patch
"@php-companion/semantic": patch
"@php-companion/language-server": patch
---

Bound PHPDoc parsing work and AST depth/size so excessive nested or wide types cannot terminate the language server. Reject over-budget facts, preserve adjacent tags and declarations, and invalidate semantic caches created before these parsing limits.

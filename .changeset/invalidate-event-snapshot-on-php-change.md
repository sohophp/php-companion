---
'@php-companion/language-server': patch
---

Invalidate authoritative Symfony event relations when a watched PHP source actually changes or is deleted, so the next References query rebuilds subscriber and dispatch facts instead of reusing a snapshot whose declarations stayed unchanged.

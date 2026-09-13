---
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Rank function and namespace-constant completions by same-namespace visibility,
explicit imports, PHP global fallback, and namespace proximity. Preserve the
semantic order in LSP clients with stable category-specific `sortText` values.

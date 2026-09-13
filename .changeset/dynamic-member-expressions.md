---
'@php-companion/parser': minor
'@php-companion/semantic': minor
'@php-companion/language-server': patch
---

Fold parenthesized and unescaped literal-concatenated dynamic member names, unique global/class constant alias chains, and string-backed enum values into precise member and call facts. Rename the whole concatenation content atomically, and retain every other complex dynamic expression as unknown coverage that vetoes incomplete member renames without producing speculative diagnostics.

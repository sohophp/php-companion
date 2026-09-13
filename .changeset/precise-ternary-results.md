---
'@php-companion/semantic': minor
'@php-companion/language-server': patch
---

Propagate complete ordinary ternary results through local completion,
Definition, and argument diagnostics. Skip unreachable literal-condition arms
and keep reachable unknown or Elvis expressions conservative.

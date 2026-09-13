---
'@php-companion/parser': patch
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Propagate native `never` termination through guaranteed `if`, `while`, `switch`,
`for`, and `foreach` input expressions. Keep short-circuit right operands,
loop updates, and post-tested loop conditions conservative.

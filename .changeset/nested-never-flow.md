---
'@php-companion/parser': patch
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Treat native `never` calls inside assignments, arguments, and other guaranteed
expression positions as terminating the whole statement. Preserve normal flow
for conditional operands, ternary or match arms, nullsafe arguments, and other
calls that are not guaranteed to execute.

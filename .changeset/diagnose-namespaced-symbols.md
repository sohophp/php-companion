---
'@php-companion/parser': patch
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Record explicit current-namespace calls and diagnose unresolved namespaced
functions and constants only after a complete index, while suppressing unknown
unqualified global symbols until builtin and extension catalogues are complete.

---
'@php-companion/language-server': patch
---

Recognize guaranteed nested `throw` expressions in assignments, arguments,
ordinary eager expressions, control conditions, complete ternaries, and match
arms. Preserve fallthrough for short-circuit and partially terminating branches.

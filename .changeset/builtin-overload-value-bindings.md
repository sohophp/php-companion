---
'php-companion': patch
'@php-companion/semantic': patch
---

Preserve caller object bindings when every applicable builtin function overload maps supplied arguments by value. Keep reference-taking overloads, unknown unpacking, unmapped names and conflicting project declarations conservative.

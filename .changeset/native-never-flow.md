---
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Treat a compatible standalone call as terminating only when semantic resolution
finds one native `never` function or method declaration in a complete project.
Ignore PHPDoc-only, duplicate, incompatible, nested, and unresolved calls.

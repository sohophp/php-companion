---
'@php-companion/semantic': patch
---

Reject parameter reordering that would reverse omitted observable default initializers or change an omitted __LINE__ default, including defaults on possible method implementations. Preserve declaration and positional argument separators so multiline reordering keeps subsequent source lines intact.

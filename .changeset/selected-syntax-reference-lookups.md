---
"@php-companion/parser": patch
"@php-companion/index": patch
"@php-companion/semantic": patch
---

Reduce reference query work by visiting only fact-producing named syntax nodes in valid PHP, normalizing candidate names once per lookup, and resolving inferred type declarations through the existing declaration index. Preserve full error recovery, Unicode candidate matching, and declaration invalidation.

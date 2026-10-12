---
"@php-companion/semantic": patch
"php-companion": patch
---

Avoid whole-file syntax probes for expressions that cannot contain dynamic class constants, closure literals or array literals. Preserve exact syntax checks, deferred implementation loading and syntax-tree ownership.

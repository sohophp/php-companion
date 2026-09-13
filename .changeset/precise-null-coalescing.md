---
'@php-companion/semantic': minor
'@php-companion/language-server': patch
---

Infer precise null-coalescing expression results and propagate them through
local aliases into completion, Definition, and argument diagnostics. Remove
only null, skip unreachable fallbacks, and preserve reachable unknown fallbacks
as unknown.

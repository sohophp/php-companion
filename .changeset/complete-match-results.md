---
'@php-companion/semantic': minor
'@php-companion/language-server': patch
---

Propagate result unions from bounded, default-complete match expressions through
local completion, Definition, and argument diagnostics, treating throwing arms
as never. Keep incomplete, unknown-value-arm, and over-budget matches
conservative.

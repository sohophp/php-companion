---
'@php-companion/language-server': patch
---

Report native `never` functions and methods when bounded control-flow analysis
proves that a path can complete normally. Keep abstract declarations, unknown
calls, unsupported transfers, and exhausted analysis silent.

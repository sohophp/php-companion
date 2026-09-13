---
'@php-companion/language-server': patch
---

Report value-returning functions and methods when bounded control-flow analysis
proves that a path can reach the end without a return. Exclude generators,
abstract declarations, void callables, and unknown control-flow paths.

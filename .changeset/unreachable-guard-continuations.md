---
"php-companion": patch
"@php-companion/parser": patch
"@php-companion/language-server": patch
---

Recognize guaranteed assertion-guard exits before unreachable trailing statements, including resolved loop jumps and try/catch/finally. Preserve continuing-branch and confined-jump exclusions and invalidate prior persisted semantic facts.

---
"@php-companion/project": patch
"php-companion": patch
---

Match Composer classmap exclusions only against ancestor package roots, preserving parent exclusions, shared install roots, path boundaries, and wildcard behavior while avoiding scans of unrelated dependency scopes.

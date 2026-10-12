---
'@php-companion/parser': patch
---

Reuse the existing scalar fact copier for variable references and return statements when isolating cached parse results. Preserve independent records, source ranges and optional fields while keeping nested facts on the existing deep-copy path.

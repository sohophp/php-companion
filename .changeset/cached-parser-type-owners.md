---
"@php-companion/parser": patch
"php-companion": patch
---

Reuse successful containing-type resolution within a single parse. Preserve exact namespace/case ownership, the first matching duplicate declaration, anonymous identities, source ranges and recovery; recompute owners for every parse and edit.

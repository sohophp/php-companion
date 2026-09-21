---
"@php-companion/language-server": patch
---

Hydrate unresolved canonical receiver types before a first References query so unopened vendor chains do not trigger a full project scan and incorrectly return no references.

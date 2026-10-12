---
"php-companion": patch
---

Resolve inheritance source inputs from exact declaration candidates instead of scanning the whole workspace for each member query. Preserve duplicate-declaration refusal and fallback checks for declarations without index keys across live edits, prepared facts and cache restoration.

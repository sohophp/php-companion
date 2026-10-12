---
"php-companion": patch
---

Allocate deferred implementation accumulation arrays only when facts are read or loaded, reducing declaration-only cache storage while preserving validation and focused hydration.

---
"@php-companion/language-server": patch
"php-companion": patch
---

Suppress automatic idle reference prewarming while the same document is being queried, and after that unchanged document has already returned a validated persistent result. Preserve explicit selection warming, input revalidation, cancellation and cache invalidation.

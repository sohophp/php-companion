---
"@php-companion/index": minor
"@php-companion/language-server": patch
---

Prepare unchanged persistent cache entries concurrently before ordered index commits. Restore candidate semantic payloads in bounded workers, with synchronous fallback on worker failure, and initialize the PHP parser only when a worker needs to parse source.

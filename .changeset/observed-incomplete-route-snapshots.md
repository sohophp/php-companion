---
"@php-companion/language-server": patch
"@php-companion/route-provider": patch
"php-companion": patch
---

Reuse opted-in unavailable route snapshots only when all local file and directory inputs are proven, while continuing to reject partial authoritative routes. Invalidate watched and live imported PHP inputs even when they contain no route syntax; incomplete snapshots without usable local evidence still retry on the next query.

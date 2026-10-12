---
'php-companion': patch
'@php-companion/runtime-probe': patch
---

Accept the bounded legacy PostgreSQL compiler version string when probing PHP 7.2–7.4 runtimes. Preserve the shorter bounds for other constants and reject control characters or oversized payloads.

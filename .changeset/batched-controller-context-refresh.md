---
'@php-companion/language-server': patch
---

Batch changed PHP document snapshots per workspace root before refreshing authoritative Symfony controller contexts, so one watched-file notification starts one provider process while preserving per-file replacement and failure cleanup.

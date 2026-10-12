---
'@php-companion/semantic': patch
---

Avoid temporary record wrappers and per-fact iteration objects when validating deferred implementation snapshots. Preserve callable identity, source-range ownership, fact ordering and corruption rejection, including the previously accepted workspace state after an invalid restore.

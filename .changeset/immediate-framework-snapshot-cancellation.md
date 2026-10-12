---
'@php-companion/language-server': patch
---

Cancel obsolete semantic and container provider processes immediately when framework document snapshots change. Preserve the existing graceful termination and force-kill behavior, and retain periodic freshness checks for other invalidation paths.

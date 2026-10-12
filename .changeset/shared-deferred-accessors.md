---
'@php-companion/semantic': patch
---

Reuse validated declaration objects and share deferred fact accessors within each semantic workspace when restoring cached PHP files. Preserve per-file isolation, targeted callable loading and snapshot validation while avoiding a separate accessor closure for every field of every restored file.

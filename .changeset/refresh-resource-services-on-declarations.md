---
'@php-companion/language-server': patch
---

Refresh authoritative Symfony container facts once per workspace root after watched PHP declaration changes or deletions, keeping resource-expanded service IDs and autowiring current without rerunning the provider for implementation-only edits.

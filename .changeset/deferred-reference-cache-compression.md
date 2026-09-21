---
"@php-companion/index": minor
"@php-companion/language-server": patch
---

Allow cache payloads to finish asynchronously after ordered semantic source commits. Compress candidate snapshots in bounded workers while later files are indexed, and wait for finalized payloads before writing the persistent cache.

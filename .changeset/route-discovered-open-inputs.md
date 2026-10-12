---
"@php-companion/language-server": patch
"php-companion": patch
---

Refresh route snapshots once when a provider discovers inputs that already have unsaved open buffers. Validate live content after provider execution and reject unstable snapshots after the bounded retry, while preserving proven complete and incomplete cache reuse.

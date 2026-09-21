---
"@php-companion/language-server": patch
---

Remove duplicate per-file status calls from reference input validation while retaining complete final identity checks and actual source hashing. Re-read recently modified inputs during final verification to detect same-size rewrites whose restored mtime and coarse ctime clock tick otherwise hide the change. Preserve bounded reads, replacement detection and fail-closed behavior.

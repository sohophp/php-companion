---
"php-companion": patch
"@php-companion/parser": patch
"@php-companion/semantic": patch
"@php-companion/language-server": patch
---

Track resolved break/continue targets when proving PHPDoc assertion guards inside loops and switches. Reject invalid or unproven jump levels, propagate guard assertions to unchanged parameter arguments, and invalidate previous persistent semantic caches.

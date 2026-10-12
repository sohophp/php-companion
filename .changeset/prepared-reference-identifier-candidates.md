---
'php-companion': patch
---

Match prepared reference candidates at ASCII identifier boundaries to avoid rereading unrelated names that contain the requested method as a substring. Preserve quoted names, Unicode fallback, disk-only additions/removals, cancellation and open-buffer protection.

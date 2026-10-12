---
"php-companion": patch
---

Start candidate preparation workers as concurrent jobs need them, reusing idle workers and retaining the existing four-worker cap. Small reference scans avoid starting unused parser workers; reply ownership and fallback behavior stay unchanged.

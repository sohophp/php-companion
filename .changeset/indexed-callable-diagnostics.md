---
"php-companion": patch
---

Use existing exact declaration candidate indexes for argument, readonly reference and assertion diagnostics, avoiding repeated scans of unrelated callable declarations while preserving ambiguity and cache-restoration checks.

---
"php-companion": patch
---

Stop owned Symfony container providers when their last caller cancels, their inputs become stale, or the language server shuts down. Reap timed-out and oversized provider processes before returning failures, while preserving surviving callers.

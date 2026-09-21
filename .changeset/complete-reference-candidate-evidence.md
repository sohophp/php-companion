---
"@php-companion/language-server": patch
---

Track the complete named-candidate scan read set, including skipped and restored files, and validate it against source-set membership and exact disk hashes. Bound parallel input discovery to reduce audit latency while preserving content, file-set, cancellation, and symlink checks. Persisted reference result reuse remains disabled.

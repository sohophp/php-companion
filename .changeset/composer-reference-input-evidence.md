---
"@php-companion/project": minor
"@php-companion/language-server": patch
---

Record exact Composer metadata source hashes and missing paths during project loading. Validate reference input audits against those consumed bytes instead of loading the complete Composer project again; incomplete reads conservatively reject reuse. Query result persistence remains disabled.

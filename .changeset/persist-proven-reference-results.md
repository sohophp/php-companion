---
"@php-companion/language-server": patch
"@php-companion/semantic": minor
---

Reuse persisted core PHP reference locations after validating the query, complete candidate sources, consumed dependencies and missing lookups, Composer metadata, open buffers, workspace URI mappings, external semantic facts and bundled engine identity. Bound and atomically write optional query artifacts; changed or unproven inputs fall back to semantic queries. Framework Provider configurations remain on the normal query path. Expose external semantic fact identity for query validation and add cold/reload full-location baseline verification.

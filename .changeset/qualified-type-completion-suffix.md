---
'php-companion': patch
---

Avoid scanning the entire source prefix for qualified native type completions. Preserve namespace aliases, absolute and relative names, Latin-1 identifiers, type contexts and original source positions while limiting matching to the trailing identifier suffix.

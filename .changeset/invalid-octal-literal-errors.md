---
"php-companion": patch
"@php-companion/parser": patch
"@php-companion/language-spec": patch
"@php-companion/language-server": patch
---

Report malformed explicit octal prefixes as parser error facts and PHP syntax diagnostics, preserve Unicode and incremental recovery, and prevent signature refactoring while these errors remain. Invalidate semantic caches containing the previous error facts.

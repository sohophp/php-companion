---
"@php-companion/semantic": patch
---

Avoid static-chain matching when a member expression contains no static access, skip dynamic-call resolution when the file has no dynamic method access, and filter unrelated calls before PHPDoc assertion inference during member references.

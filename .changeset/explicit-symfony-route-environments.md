---
'@php-companion/framework-symfony': minor
'@php-companion/language-server': minor
---

Extract exact Symfony environment registrations and Kernel route imports, and include them in static route completion only when the workspace explicitly selects the matching environment. Resolve conditional Bundle route resources through lazily loaded Composer PSR-4 mappings without booting project PHP, while preserving external runtime-provider ownership.

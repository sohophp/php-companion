---
'@php-companion/framework-symfony': minor
'@php-companion/language-server': minor
---

Resolve deterministic positional service arguments from Symfony PHP Configurator, YAML and XML definitions by their exact constructor parameter index. Explicit scalar arguments suppress autowiring only for their own position, while explicit service arguments remain navigable even when the service disables autowiring.

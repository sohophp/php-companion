---
"@php-companion/language-server": patch
---

Keep cached static Symfony route snapshots across unrelated PHP document lifecycle events while invalidating Route attributes, Kernel/configurator sources, conventional PHP route configuration, YAML/XML changes, and uncertain deletions. Runtime-only route completions now identify themselves instead of claiming a source declaration.

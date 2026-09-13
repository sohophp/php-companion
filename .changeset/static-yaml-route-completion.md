---
'@php-companion/framework-symfony': patch
'@php-companion/language-server': patch
---

Add source-based YAML route completion for proven Symfony routing calls, including explicit import prefixes and unsaved route documents.

Escape route-name edits for the original PHP quote delimiter, preventing quote breakage and unintended interpolation.

Transfer route completion ownership per workspace when Symfony Language Tools runtime indexing is enabled; restore static completion when it is disabled.

Include explicitly imported PHP Route attributes with class, method and import prefixes, preserving unknown registration boundaries.

Discover routes in explicitly imported PHP directories while stopping cyclic directory links and excluding non-PHP files.

Honor literal file and directory exclusion lists with path-boundary matching.

Support bounded glob resource and exclusion selectors with shared matching rules; reject range expansion and unsupported extglob patterns.

Support explicit PSR-4 Attribute directory resources, matching each declaration against its mapped namespace and relative filename.

Generate unnamed Attribute route names using explicit Routing or FrameworkBundle naming strategies, preserving per-method numbering and conservative unknown-loader behavior.

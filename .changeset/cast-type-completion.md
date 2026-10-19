---
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Recognize PHP cast type completion before ordinary symbol lookup. Prefer the cast keyword while typing `(str)` or editing `(string)`, replace the complete type token without adding call syntax or whitespace, and preserve ordinary arguments, declarations, comments and string contents.

Recognize casts after concatenation, suppression and expression keywords while preserving callable variables and keyword-named members, including comments and whitespace around member operators.

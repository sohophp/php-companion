---
'@php-companion/parser': patch
'@php-companion/semantic': patch
'@php-companion/language-server': patch
---

Resolve source class names with strict PHP namespace semantics. Require imports
for global class completion candidates, keep unimported names unresolved, and
preserve exact navigation for explicit imports and fully qualified names.

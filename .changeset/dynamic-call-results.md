---
'@php-companion/parser': minor
'@php-companion/semantic': minor
'@php-companion/language-server': patch
---

Record directly representable dynamic method invocations as full call and assignment facts. Propagate their results through local assignments and member chains only when the dynamic name, overload, arguments, PHPDoc method templates, and nullsafe state are all proven. Include proven dynamic method and property string sources in Rename while retaining a workspace-wide veto for unresolved same-name dynamic coverage.

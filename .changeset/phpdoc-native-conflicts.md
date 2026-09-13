---
'@php-companion/type-system': minor
'@php-companion/phpdoc': minor
'@php-companion/semantic': minor
'@php-companion/language-server': minor
---

Model native integer-to-float and structured iterable widening in the shared type algebra.

Bound recursive relation comparisons, PHPDoc/native type expansion, generic parent traversal, and expanded template text; exhausted budgets conservatively become unknown.

Bound local CST lookup and readonly forward-flow traversal; exhausted syntax budgets discard incomplete derived diagnostics and summaries.

Bound factory and local static-value control flow, callable/member lookup, and nested conditional PHPDoc evaluation.

Invalidate constructor and factory summaries by changed callable, returned type, and inheritance or trait dependency instead of clearing them for every file update.

Model PHPDoc generic array key, value, and non-empty constraints with the shared structural array algebra.

Parse signed integer PHPDoc literals and model `int<min,max>` ranges, including exact safe-integer argument checks and conservative dynamic integer handling.

Project `key-of` and `value-of` for structured arrays and lists, closed PHPDoc array shapes, uniquely resolved static short-array constants, complete statically evaluable `Class::*` sets, and indexed backed enums while preserving dynamic and unsupported sources as unknown.

Expose precise PHPDoc/native type conflicts for parameters, returns, and properties only when incompatibility is proven, and publish the stable configurable `php.phpdoc.type-conflict` warning from the language server.

Resolve class and callable template bounds transitively with lexical shadowing while suppressing cyclic or invalid bound relations.

Bound recursive constant, hierarchy, member, variable-source, and iterable semantic graph traversal at 64 levels, preserving precise results inside the boundary and returning unknown beyond it.

Prove named iterable and callable objects through project inheritance and real `__invoke` members, while leaving incomplete external relations unknown.

Project common PHPDoc integer, string, numeric, scalar, array-key, non-empty-array, and primitive aliases to runtime upper bounds only for native conflict proofs.

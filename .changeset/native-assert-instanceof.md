---
'@php-companion/parser': minor
'@php-companion/semantic': minor
'@php-companion/language-server': patch
---

Propagate positive and finite-union negative `instanceof`, strict non-null and `!is_null`, positive/negative resolved builtin predicate, strict boolean-literal comparison, `isset`, and `array_key_exists` facts from standalone native `assert()` calls through the same statement block. Preserve strings after false `is_numeric`; keep negative mixed literal comparisons, loose comparisons, and other unrepresentable complements conservative, and invalidate facts after target mutations. Support one-argument calls and two-argument calls whose static string or `null` description is passed positionally or by reordered named arguments.

Use the same strict boolean-literal facts in ordinary branches, else paths, and proven terminating guards, including direct variables, properties, and safe array-shape paths. Safely refine native `array|false` returns with PHPDoc `array{...}|false`, then retain shape element types after excluding false from the root in ordinary branches, logically implied short-circuit operands, and selected ternary arms. Intervening by-reference mutation invalidates the fact.

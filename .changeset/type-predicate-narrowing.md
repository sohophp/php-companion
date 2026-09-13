---
"@php-companion/language-spec": minor
"@php-companion/parser": minor
"@php-companion/semantic": minor
"@php-companion/language-server": minor
---

Add versioned PHP type predicates, `isset` facts, false `empty` paths, direct truthy guards, and strict or loose null-comparison complements, and unify argument diagnostics, member completion, and Definition with proven predicate, non-null, and instanceof flow facts for parameters, safe local aliases, direct visible property paths, and safe literal array paths up to 16 levels, including representable false paths, elseif chains, and conservative mutation invalidation.

Distinguish optional array-shape absence from explicit null in proven global `array_key_exists()` and `key_exists()` true paths, including nested safe collections, namespace-shadow rejection, and mutation invalidation.

Treat object-only global `is_a($value, Type::class)` checks as precise positive or finite-Union complement facts when `$allow_string` is omitted or false, while keeping dynamic class targets and string-enabled calls unknown.

Treat global `is_subclass_of($value, Type::class, false)` as a strict object-subclass fact that excludes the target class itself, supports finite-Union complements, properties, and safe array paths, and keeps the default string-enabled mode unknown.

Restrict callable narrowing to `is_callable` calls whose `syntax_only` argument is omitted or literally false, preventing syntax-shape checks from being treated as proof of runtime callability.

Preserve all concrete declared class branches of object/scalar parameter unions after resolved global `is_object` checks so diagnostics, common-member completion, and multi-target Definition agree.

Preserve declared subtypes through object-only `is_a` true paths and remove the target plus its known subtypes from finite false-path unions.

Retain every proven subtype alternative for object-only `is_a` and strict `is_subclass_of` checks across parameters, direct properties, and safe array-shape paths, exposing signature-identical common members and all matching Definition targets.

Preserve concrete invokable, Countable, and Traversable implementation classes after `is_callable`, `is_countable`, and `is_iterable` eliminate unrelated object alternatives, while keeping complements with incomplete hierarchies unknown.

Apply adjacent property `@var` types when they safely refine the native declaration, and retain the native type when the documentation conflicts.

Bind named property `@var` tags only to their matching property in multi-property declarations, including conflict diagnostics.

Reuse validated constructor `@param` refinements for the corresponding promoted property.

---
'@php-companion/parser': minor
'@php-companion/language-spec': minor
'@php-companion/index': minor
'@php-companion/semantic': minor
'@php-companion/refactor': minor
'@php-companion/language-server': minor
---

Publish audited PHP 8.0 mixed/static return type and PHP 8.2 true/standalone false/null type syntax boundaries through the language specification and stdio server.

Warn on PHP 8.2 dynamic property creation only when a standalone assignment targets a uniquely proven concrete class with a complete hierarchy and no declared property, magic setter, inherited AllowDynamicProperties attribute, or readonly-class rule.

Reject the built-in AllowDynamicProperties attribute on readonly classes, interfaces, Traits, and Enums for PHP 8.2+ while preserving legal classes and namespace-local attributes with the same short name.

Diagnose PHP 8.2 readonly-state inheritance mismatches and uniquely proven direct or transitive Trait use that introduces a non-readonly property.

Diagnose explicitly readonly PHP 8.1+ properties and implicit PHP 8.2+ readonly-class properties that lack a type, are static, or declare a non-promoted default value, while preserving legal promoted defaults and suppressing incomplete syntax.

Extract structured method, property, and class-constant access facts and publish a stable missing-member diagnostic only when the receiver and its full hierarchy are known. Resolve language-synthesized Enum members through the shared member model; suppress the diagnostic for magic access, instance dynamic properties, unknown receivers, unsafe nullable access, and incomplete inheritance.

Diagnose proven static access to non-static methods or properties and inaccessible private or protected members without duplicating unresolved-member errors. Respect inherited visibility and accessible magic method interception.

Diagnose zero-match structured native, inheritance, trait, instanceof, and static-receiver type references only after the project index is complete. Keep pseudo-types and attributes conservative until versioned builtin coverage is complete.

Diagnose uniquely resolved class, interface, and trait kind mismatches in extends, implements, and trait-use relations while suppressing unresolved or duplicate targets.

Diagnose bounded, fully resolved class/interface inheritance cycles and Trait use cycles, including cross-file and self cycles, without cascading from incomplete or ambiguous graphs.

Diagnose direct construction of uniquely resolved interfaces, traits, enums, and abstract classes while preserving unknown behavior for missing or duplicate targets.

Diagnose inaccessible private and protected constructors across complete unique inheritance chains while preserving legal factory and class-family construction.

Diagnose later same-file named function declarations with PHP's case-insensitive function identity, and distinguish namespace from class constants in duplicate diagnostics.

Diagnose constructors and destructors that are static or declare native return types, and destructors that accept parameters, while suppressing incomplete syntax.

Validate the arity, reference and variadic flags, required staticness, contravariant declared parameters, and declared return contracts of classic clone, string conversion, overloading, sleep/wakeup, set-state, debug-info, and PHP 7.4+ serialization magic methods while accepting PHP-compatible variance.

Warn when standard magic methods are declared non-public, excluding constructors, destructors, and clone, and apply the serialization-method rule only for PHP 7.4+ targets.

Diagnose properties, uniquely resolved direct or transitive property-bearing traits, forbidden magic methods, direct cases declarations, and direct from or tryFrom declarations on backed PHP 8.1+ enums while preserving legal enum cases, constants, property-free traits, trait method shadowing, unit-enum from or tryFrom, invoke, call, and call-static methods and suppressing derivative magic-method diagnostics.

Diagnose non-backed enum cases with values, backed cases without values, directly proven scalar literal type mismatches, and later byte-identical literal backing values while leaving constant and complex expressions unknown.

Diagnose enums that explicitly implement UnitEnum or BackedEnum, directly or transitively implement Serializable, or expose BackedEnum through an interface while remaining non-backed, using only unique bounded interface graphs.

Diagnose return-only native types in parameter or property positions, callable properties, and non-standalone void, never, or mixed types with target-version-aware keyword handling.

Diagnose compile-time redundant type combinations, including duplicate primitive identities, case-insensitive duplicate complete class names at one composite level, bool with true or false, true with false, and iterable with array.

Diagnose flat object unions with class types, iterable with explicitly global Traversable, and non-class atomic types inside intersections while preserving namespace-local Traversable and relative class intersections.

Record self, parent, and static static receivers as exact type references. Diagnose those relative scopes outside a type declaration and parent inside a class, interface, or enum without an explicit parent, while preserving trait parent references.

Diagnose abstract methods with bodies, interface methods with bodies, abstract methods in concrete classes, non-abstract methods without bodies, abstract/final conflicts, final or non-public interface methods, and private abstract methods outside traits.

Honor cancellation at asynchronous LSP query boundaries, suppress stale diagnostics after rapid edits, and apply a bounded client restart policy that stops repeated crash loops. Verify recovery by crashing the acknowledged test server process and querying completion after restart.

Report Composer discovery and per-root indexing through cancellable standard LSP Work Done Progress, sharing the cancellation predicate with directory discovery and source analysis.

Allow adapters to map indexed filesystem paths to editor URIs so remote workspaces preserve their scheme and authority through cache snapshots, navigation, and invalidation.

Allow clients to disable stable diagnostic codes or override their severity at initialization and through live workspace configuration changes.

Expose direct parent and child relationships through the standard LSP Type Hierarchy API.

Resolve standard Type Definition requests for proven variables and member return types.

Report direct assignments to resolved native typed object properties when an object or null right-hand type is proven incompatible, while allowing parameter variables to change type as PHP permits.

Report direct ordinary member access on a proven nullable object while suppressing null-safe, narrowed, dynamic, and incomplete cases.
Offer a PHP 8+ Quick Fix that replaces only the proven unsafe operator and remains one Undo transaction.

Keep resolved workspace named-argument labels synchronized when renaming a parameter.

Expand uncommented group imports during Organize Imports while retaining used members and rejecting comments or discontinuous blocks.

Publish conservative Semantic Tokens for structured declarations; exact variable, parameter, call, member, named-argument, and `new` use sites; structured native/PHPDoc type positions; and typed import paths or aliases without guessing dynamic member roles or unresolved declaration kinds.

Refine type token kinds and global or namespace constant uses only from a uniquely resolved workspace declaration, suppressing duplicate identities.

Provide local-variable type Inlay Hints only when an assignment resolves to one declared object type.

Preserve reference, variadic, named, and unpacked argument facts; diagnose missing required arguments and case-sensitive PHP 8.0+ unknown named arguments only for uniquely resolved flat calls. Diagnose duplicate named arguments and positional or unpacked arguments after a named argument, and preserve reference, variadic, and default syntax in displayed signatures.

Preserve property initializer facts and generate constructors only for typed, uninitialized, non-static semicolon properties in classes without inheritance, traits, or an existing constructor.

Diagnose concrete classes that still lack resolved abstract parent methods and generate exact single-line signatures without duplicating methods already covered by an interface action.

Generate missing getters and setters for typed semicolon instance properties while respecting inherited method collisions and readonly write restrictions.

Offer one Override action per concrete public or protected parent method, preserving its exact single-line signature and forwarding arguments to `parent::method`.

Preserve parser-native signatures separately from PHPDoc refinements and diagnose only proven inherited method incompatibilities in staticness, visibility, arity, reference/variadic semantics, parameter contravariance, and return covariance.

Reject extending final classes and overriding final methods, and diagnose direct statements after an unconditional return or throw in the same block.

Diagnose independently removable imports that are unused by code and PHPDoc, and provide a versioned whole-statement removal Quick Fix. Persist comment and string ranges in semantic snapshots to keep this analysis stable across cache restores.

Validate Unicode PHP identifiers through the shared refactor package and rename private non-magic methods only from their declarations after complete indexing, with direct resolved references and same-class collision checks.

Rename safe local variables and parameters inside one named lexical scope, rejecting closure capture, superglobal, global binding, promoted-property, and collision cases. Accept replaceable external framework method facts so Doctrine repository completion and nullable entity return chains use the same semantic member query.

Rename non-promoted private properties from their declarations using resolved member references and same-class collision checks.

Rename unique named functions across resolved calls and imported targets while preserving explicit call aliases and rejecting binding collisions.

Show parameter-name inlay hints only for uniquely resolved flat positional calls, suppressing redundant, named, unpacked, variadic, nested, and ambiguous cases.

Diagnose proven object and null argument incompatibilities for unique flat calls while suppressing dynamic expressions, unresolved hierarchies, unpacking, and scalar coercion cases.

Track return statements by lexical scope and diagnose proven native object, null, empty-return, void, and never incompatibilities while suppressing dynamic expressions and generators.

Provide standard Organize Imports for contiguous imports, removing proven unused imports and sorting stable groups. Expand uncommented group imports while refusing commented, discontinuous, or multi-namespace layouts.

Enforce representative PHP 7.3 through 8.5 syntax boundaries, with conservative grammar compatibility for validated PHP 8.5 clone-with and final promoted properties. Keep malformed neighboring syntax visible.

Model PHP 8.5 final promoted properties through inheritance, enforce static-property asymmetric set visibility by read/write direction, and suppress diagnostics that depend on syntax unavailable to the configured target version.

Accept PHP 8.5 static Closures and direct function/static-method first-class callables in constant expressions, reject the four forbidden callable shapes, and type first-class callable acquisition as Closure without treating it as a zero-argument invocation.

Validate PHP 8.5 `#[Override]` property attributes across classes, interfaces, promoted properties, anonymous classes, and Trait composition, with exact PHP 8.4 target rejection and private-parent handling.

Report discarded PHP 8.5 `#[NoDiscard]` user and audited native return values, validate forbidden declarations, and support `(void)` suppression with its exact version boundary.

Run the complete Extension Host suite from the packaged VSIX in isolated user and extension directories.

Allow the packaged suite to run against an isolated Open Source Profile and verify that PHP, Twig, and YAML formatting providers retain their intended ownership without installing another PHP language server.

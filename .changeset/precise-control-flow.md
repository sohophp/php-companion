---
'@php-companion/parser': minor
'@php-companion/phpdoc': minor
'@php-companion/semantic': minor
'@php-companion/language-server': patch
'@php-companion/framework-doctrine': minor
'@php-companion/framework-symfony': minor
'@php-companion/project': minor
'@php-companion/index': minor
'@php-companion/type-system': minor
'@php-companion/semantic-provider': minor
---

Publish a versioned, framework-neutral semantic provider contract and apply each provider's sourced facts atomically by stable identity and generation. Migrate Symfony and Doctrine integration to the shared contract while retaining conservative validation and explicit removal.

Report proven external writes to readonly properties and all writes to synthesized Enum `name`/`value` for PHP 8.1+ consumers, while preserving declaring-family initialization uncertainty.

Parse class-level PHPDoc `@property` and `@method` tags as structured synthetic public members. Expose completion, method signatures, chained return types, and Definition back to the tag while giving real PHP declarations precedence over a same-named documented member.

Preserve `@property-read` and `@property-write` direction. Diagnose every write to a documented read-only property across supported PHP targets, type-check documented write-only assignments, and prevent write-only properties from producing readable member chains. Merge paired tags while retaining separate read and write types.

Model bounded and unbounded `class-string` values in the shared type algebra. Diagnose only resolved class constants proven outside a PHPDoc class-string bound, accepting indexed subclasses and leaving arbitrary strings unknown.

Model sequential `list<T>` and `non-empty-list<T>` values. Check PHPDoc list parameters against flat scalar array literals while rejecting statically keyed associative shapes and leaving dynamic or nested arrays unknown.

Check static associative array literals against PHPDoc array shapes for required keys and field compatibility. Recursively compare nested shapes, lists, nullable types, and unions while preserving dynamic keys, calls, spreads, and mixed-key arrays as unknown.

Propagate static array literals through same-block PHPDoc list and shape argument checks, crossing only literal echo or independent static-literal assignments that cannot read the target. Calls, references, control flow, dynamic overwrites, and cross-block sources remain unknown.

Check explicitly typed closure and arrow-function arguments against PHPDoc callable signatures using contravariant parameters and covariant returns. Untyped signatures, complex defaults, and dynamic callables remain unknown.

Allow type-system consumers to declare per-parameter generic covariance, contravariance, or invariance. Missing or incomplete variance metadata remains unknown.

Require an explicit generic-supertype specialization before comparing arguments across different generic bases, preventing positional assumptions when inheritance reorders template parameters.

Substitute PHPDoc generic arguments through direct and transitive `@extends` and `@implements` relations before applying the parent type's declared variance in argument diagnostics.

Use complete return types from uniquely resolved ordinary function and method calls as argument facts, binding `self`, `parent`, and `static` to the declaring or called class and retaining nullable nullsafe results while preserving ambiguity as unknown.

Parse parameter- and template-subject PHPStan/Psalm conditional types with `is` and `is not`. Evaluate them for unique function, static-method, and instance-method calls only after call-shape, template-bound, and typed-argument validation. Select a proven boolean-literal or complete object-relation branch, or union both branches when the condition is unknown, and propagate the result through local completion and navigation.

Preserve conditional types in PHPDoc Callable return positions and evaluate them from positional or named arguments when the Callable parameter has not been read, reassigned, or passed by reference. Suppress propagation for incompatible arguments and retain only common Union members for unknown conditions.

Carry proven boolean-literal and finite-Union constraints for the same parameter through nested conditional branches. Correlate inner `is` and `is not` checks, exclude unreachable result branches, and keep superclass-to-subclass possibilities unknown when the runtime subtype cannot be proven.

Share nested conditional branch constraints across different parameters only when positional or named mapping proves they receive the same direct variable argument. Apply the same rule to untouched PHPDoc Callable parameters while keeping different variables and complex expressions independent.

Apply truthy and falsy PHPDoc assertion facts inside `while` and conditional `for` bodies and proven short-circuit right operands in `while`, conditional `for`, and `do...while` conditions. Invalidate after body mutation and never carry the fact through loop exit or into the first body execution of `do...while`.

Parse unconditional and truthy/falsy PHPStan and Psalm assertion tags, including distinct negated `!null`, literal, named, generic, and parenthesized Union AST nodes plus structured parameter- and `$this`-property paths. Narrow a declared parameter after a unique function or uniquely resolved instance/static method is invoked as a standalone statement, inside the matching branch of a direct callable `if` condition, where a conjunction's true result or disjunction's false result logically implies the individual call result, while evaluating a short-circuit right operand after the left expression proves that result, or on a same-block continuation where goto-free primary, elseif, and else direct return/throw/exit, complete nested if/elseif/else, or finally-terminating/fully terminating try-and-catch outcomes, or complete switch outcomes with a default and termination from every entry, or a guaranteed first-iteration/constant-true loop without escaping jumps make every continuing path prove the same condition result, with that parameter as a direct positional or named variable argument. Apply positive `$parameter->property` assertions to fully accessible single- or multi-level property chains and local reads. Map positive method `$this->property` assertions to direct non-nullsafe variable receivers and class-visible properties, invalidating them after any ancestor property write, root reassignment, a method call along the chain, or a call receiving the root object. Specialize parameter and property-path callable-template assertions, including property `!T`, from supported argument structures such as `class-string<T>` only when inference has one result and every bound and typed argument is compatible. Remove null from one nullable parameter or fully accessible property path, or subtract proven literal, primitive, named hierarchy, generic, intersection, and removal-Union members from a finite parameter/property union only when one object remains. Generic exclusion applies declared variance and generic-supertype specialization and preserves the remaining object's type arguments. A single remaining intersection retains its complete member group for completion and navigation. Support nested parentheses, negated conditions, and plain else branches. Preserve incomplete nested, try/catch/finally, switch, or dynamic-loop branches, inaccessible properties and negative property subtraction that cannot produce one proven object, ambiguous or over-budget templates, incomplete generic relations or non-unique subtraction, facts in compound branches that do not imply an individual result, outside the branch, for dynamic or duplicate functions or methods, unpacking, references, unsupported control flow, and later possible mutation as unknown. Record standalone calls, normalized implied-condition branch ranges, and precise short-circuit evaluation ranges, and bounded multi-branch post-guard continuation ranges in the parser and use semantic snapshot schema 32.

Propagate unique function and ordinary method returns only when required, named, and variadic call shape is valid and every typed argument is proven compatible. Expand direct static arrays, one untouched same-scope local static array, one linearly built consecutive positional local array, and an untouched non-reference parameter with a sealed, all-required, identifier-keyed PHPDoc shape. Preserve broad or optional parameter shapes, used locals, sparse or dynamically keyed arrays, missing or invalid arguments, and unproven typed calls as unknown. Preserve untyped and mixed dynamic values plus caller weak scalar coercion.

Use the declared return type of an untouched PHPDoc Callable parameter only when positional, named, variadic, directly or locally unpacked static arrays, linearly built consecutive positional local arrays, or an untouched sealed all-required named parameter shape satisfy required, optional, name, and proven type declarations. Apply hierarchy, generic variance, caller strictness, and mixed rules to each argument. Support one direct same-scope alias assignment while preserving invalid names, incompatible or unproven non-mixed values, dynamic unpacking, used, multiply aliased, reassigned, or incomplete callables as unknown.

Expand a callable argument variable only when it comes from one direct same-scope static-array assignment and is untouched before use, also accepting a static base followed only by consecutive positional writes while preserving parameter arrays, reads, sparse or dynamic writes, and multiple base assignments as unknown.

Propagate static scalar, array, construction, unique call, and proven Callable results through same-block local assignments while invalidating facts at calls, references, control flow, dynamic overwrites, variable copies, and block boundaries.

Track deterministic same-block list appends and string-keyed shape writes, updating list non-empty unions and latest shape field types while preserving dynamic and mixed array mutations as unknown.

Use unreassigned declared parameters and proven local values in array appends and shape-key writes, and safely model index-zero list creation or replacement while preserving mixed, sparse, and hybrid writes as unknown.

Infer callable-level PHPDoc templates for unique function and ordinary method calls from positional, named, variadic, directly or locally unpacked static arrays, linearly built consecutive positional local arrays, sealed all-required named parameter shapes, nullable, array/list, class-string, shape, and same-base generic arguments. Validate bounds, repeated bindings, and call shape before specializing returns, preserving broad, optional, or positional parameter shapes, used locals, sparse or dynamic keys, conflicting bindings, ambiguous unions, and ambiguous or incomplete inheritance paths as unknown. Associate top-level variadic and by-reference PHPDoc parameter tags with their declared variables.

Infer call templates through direct or transitive generic parents only after substituting and reordering the child arguments declared by `@extends` or `@implements`. Validate the fully specialized parent parameter and preserve ambiguous or incomplete inheritance paths as unknown.

Expand sealed local named-argument shapes built by deterministic string-key writes for ordinary, templated, and PHPDoc Callable calls. Also expand local positional arrays built linearly from a static base through appends or consecutive non-negative integer-key writes, retaining each value type and source range. Keep used values, dynamic or sparse keys, optional parameter shapes, mixed key modes, uncertain control flow, and more than 64 arguments unknown.

Distribute Union call arguments at any supported nesting level into isolated template-binding alternatives, validate every specialized branch and bound, and union their specialized return types. Preserve covariant, invariant, and multi-template correlations without inventing Cartesian-product generic arguments. Keep calls exceeding the 64-alternative analysis budget unknown.

Resolve complete multi-step object member chains passed directly as arguments through final object, scalar, nullable, union, and PHPDoc structural returns, preserving nullsafe propagation and positional arity while leaving dynamic, incomplete, or non-object intermediate chains unknown.

Carry multi-step argument chains through Union, Intersection, and DNF receivers only when every runtime branch exposes the same member signature and canonical intermediate and final returns, retaining nullable nullsafe propagation.

Merge deterministic local assignments from every continuing branch of complete same-block `if`, `elseif`, and `else` control flow into a Union, including nested complete conditionals while preserving missing, abrupt, or side-effecting paths as unknown.

Merge deterministic local assignments from every normal exit of a complete same-block `switch`, including ordinary breaks, fallthrough, and nested complete conditionals or switches while preserving missing defaults, unassigned entries, complex jumps, and side effects as unknown.

Merge deterministic local assignments across complete same-block `try`, `catch`, and `finally` control flow, including definite finally overrides and safe finally passthrough while preserving unassigned, abrupt, and side-effecting paths as unknown.

Propagate deterministic local assignments from the guaranteed first iteration of safe `do...while` loops, including supported nested complete control flow while preserving complex conditions, jumps, side effects, and potentially zero-iteration loops as unknown.

Propagate deterministic assignments from canonical integer `for` loops whose first condition is proven true, and from explicit single-pass do/while/for loops ending in an ordinary break while preserving dynamic and zero-iteration loops as unknown.

Propagate deterministic assignments from `foreach` loops whose iterable is proven nonempty through a static value, local flow, shape, or non-empty array/list return while preserving empty and dynamic iterables as unknown.

Diagnose directly proven scalar literal argument, return, and direct typed-property assignment mismatches in `strict_types=1` files while preserving weak scalar coercion and unknown expressions.

Add conservative null, instanceof, conjunction, guard-exit, while-body, and single-catch control-flow facts.

Prioritize complete root-project sources within bounded Composer indexes, truncate only dependency sources in stable order, and report project and whole-index completeness separately.

Propagate direct property assignments through the shared semantic member model while preserving visibility and nullability, with a semantic cache schema bump.

Resolve complete variable-rooted property and method chains into local assignment types, applying visibility, generic method, literal-return, and nullsafe rules at every step.

Add a conservative Extract Variable code action for complete block-level assignment RHS and return expressions, with conflict-free naming and one versioned workspace edit.

Add a conservative Inline Variable code action for one immediate whole-value use, rejecting references, intervening statements, repeated uses and unsafe nested expressions.

Add a strict Extract Method code action with proven typed inputs and one optional output. Return declarations are inferred from real object declarations, unique native call signatures and scalar or array literals; scalar pseudo-classes, nested flow, references and multiple outputs are rejected.

Add a complete-index `refactor.rewrite` action for removing an unused ordinary parameter from a unique private non-magic method, including matching PHPDoc and every resolved positional or named call argument while rejecting effectful discarded expressions.

Invalidate prior parameter and branch facts after assignments whose result type cannot be proven, and keep disjunctions, loose comparisons, loop exits, and nested conditional exits unknown.

Persist PHPDoc generic parent relations and substitute bounded template arguments through transitive `@extends` and `@implements` member inheritance.

Expose typed Doctrine association properties through the semantic external-member boundary, preserving declared visibility, nullability, and to-many container types.

Propagate explicit external iterable value facts through direct property foreach sources while limiting the loop variable type to the loop body.

Propagate proven iterable member return types through direct method-call foreach sources, including Doctrine repository entity arrays.

Normalize PHPStan and Psalm type tags, template variance aliases, and template inheritance tags. Infer foreach values through bounded generic IteratorAggregate inheritance and substitute templates inside nullable, union, and nested generic return types.

Parse PHPStan Closure signatures and bind bounded method templates from single-parameter arrow functions or ordinary closures with explicit return types or one proven object construction, preserving transformed Doctrine map value types across direct chains and assignments.

Parse explicit Symfony YAML services, aliases, deterministic resources and brace exclusions without booting the kernel; provide private-service Autowire completion/navigation and feed only public container get calls through replaceable literal-return facts with watched-file invalidation.

Resolve conservative Symfony constructor autowiring for registered autowired consumers. Exact type ids and aliases take precedence; a resource implementation is used only when unique, while explicit parameter attributes and unsupported dynamic rules stay unknown.

Honor literal Target selectors, named aliases, service-reference bind entries and named service arguments before default type lookup; scalar and structurally unknown overrides suppress the result instead of guessing.

Resolve flat object union/intersection constructor types only when Symfony's combined alias exists or every member converges on the same service; split targets remain unknown.

Preserve canonical PHP 8.2 DNF branches and resolve only an exact Symfony service or named alias whose implementation satisfies one complete intersection branch.

Preserve parentheses when displaying DNF types and compare stronger source intersections against every required target intersection member before reporting incompatibility.

Provide conservative member Completion, Hover, multi-target Definition, and shared-return chaining for native Union, Intersection, and DNF parameters, requiring identical signatures across every runtime alternative.

Validate unresolved and nullable member diagnostics against every complete runtime alternative of native Union and DNF parameters.

Record all multi-catch types and apply the same branch-aware member model only within the corresponding catch body.

Propagate complete composite object branches and nullability through bounded direct local-variable aliases with cycle protection.

Propagate complete native composite return branches from a uniquely resolved function through a direct local assignment.

Continue member chains through canonical native composite method returns, requiring resolved branch agreement across composite receiver declarations and preserving nullsafe propagation.

Propagate native composite returns through direct local assignments from instance, static, and composite-receiver method calls.

Resolve directly attributed public Symfony Required method parameters, including base declarations whose registered concrete consumers agree, while suppressing explicit or unknown YAML calls.

Resolve public named-object Required properties under the same proof rules and suppress explicitly configured or structurally unknown YAML properties.

Follow proven non-private method prototypes when a public override inherits Symfony Required behavior.

Read fresh Symfony development debug-container XML as data to expose bundle/compiler services, public container return types, and exact controller method-locator injection while invalidating all compiled facts after newer project source or configuration changes.

Extract direct compiled constructor and method-call service arguments by position and match them back to indexed source callables and compatible object parameters.

Extract direct compiled property service references and match them to explicit indexed Required object properties by owner, name, and compatible type.

Rename a non-private method parameter by position across its complete interface, parent, and override family, including adjacent standard/PHPStan/Psalm parameter docs and resolved named arguments with implementation-specific old names; reject incomplete hierarchies, dynamic same-name calls, captures, promotions, and collisions.

Apply deterministic member precedence of own declaration, then trait, then inherited member so override signatures remain authoritative.

Attach exact PHP `render()` context-key source ranges to controller variables and preserve them across interop context merging as the basis for bounded PHP/Twig Rename edits.

Rename a public or protected class/interface method from its declaration across a complete interface, parent, and override family, including resolved direct and parent/self/static calls; reject hierarchy collisions, dynamic or string callables, and incomplete hierarchies.

Rename a non-promoted public or protected class property from its declaration across a complete class hierarchy, including repeated declarations and resolved instance/static accesses; reject hierarchy collisions, dynamic properties, promotions, and incomplete hierarchies.

Rename a promoted property as one parameter/property identity across constructor scope uses, adjacent PHPDoc, resolved direct or inherited named construction, and property accesses. Resolve inherited constructor signatures while preserving the concrete class created by `new`.

Rename trait methods and properties across declarations, internal references, and proven host or descendant references. Update a qualified method alias source while preserving the alias name. When complete `insteadof` rules prove one winner per consumer, update the selected precedence method token and leave loser-only tokens intact; reject unresolved same-name contributors, dynamic references, collisions, or incomplete consumer hierarchies.

Start method and property Rename from a uniquely resolved call or access and reuse the declaration path's complete hierarchy, collision, and dynamic-reference checks. Reject composite candidates when one edit plan cannot cover every candidate declaration.

Start unique named-function Rename from a resolved direct call, preserving explicit import aliases and rejecting initiation from an alias call whose selected token would remain unchanged.

Start parameter Rename from a uniquely resolved named argument. Preserve positional identity across inherited method declarations with implementation-specific names, and route promoted constructor arguments through the same parameter/property edit.

Rename unique namespace constants across declarations, `use const` paths, and resolved direct uses while preserving explicit aliases. Rename class constants across their declaration and exact self or inherited accesses, rejecting dynamic access, reflective strings, trait constants, semantic redirects, and incomplete hierarchies.

Rename a trait method alias independently from its `as alias` adaptation or exact calls without changing the source trait method. Reject alias collisions, ambiguous contributors, dynamic calls, callable strings, and incomplete consumer hierarchies.

Rename trait constants across their declaration, internal `self::` access, and exact host or descendant accesses. Reject multiple same-name trait contributors, host collisions, dynamic/reflection references, and incomplete consumer hierarchies.

Parse unit and backed Enum cases as case-sensitive static members and retain their backing type. Treat synthesized backed Enum factories as trusted signatures for caller-sensitive strict/weak scalar argument diagnostics. Expose EnumMember symbols, native case Hover, `cases()`, backed `from()`/`tryFrom()`, readonly `name`/`value`, chained `static` factory returns, missing backed-value diagnostics, and nullable `tryFrom` access checks. Rename one exact case from its declaration or resolved static access while preserving differently cased siblings; reject case/constant collisions, dynamic access, and reflection/string lookup. Upgrade persisted semantic snapshots to schema 21.

Record PHP 8.2 readonly classes as structured declarations and treat their ordinary and promoted instance properties as readonly members. Gate implicit-property write diagnostics at PHP 8.2 while retaining PHP 8.1 explicit readonly and native Enum behavior. Upgrade persisted semantic snapshots to schema 22.

Detect readonly compound and coalescing assignments, increment/decrement, array-offset writes, and direct reference operations as definite indirect modifications in every scope. Diagnose external unset while preserving declaring-scope pre-initialization unset and legal interior object mutation.

Treat a direct readonly property argument as an indirect modification only when one uniquely resolved user signature marks its mapped positional or named parameter by reference. Treat foreach over a direct readonly property as an indirect modification only when its value is by reference; preserve by-value calls and iteration.

Diagnose direct reassignment of a promoted readonly property from its declaring constructor body and repeated direct `$this` initialization within one compound block. Preserve mutually exclusive branches and reject straight-line proof when a callable contains `goto`.

Track definite readonly initialization through sequential statements and all reachable `if`/`elseif`/`else` branches. Diagnose assignments after an all-arm merge and loop-body writes whose loop-entry state is already initialized, while preserving single-arm, zero-iteration, unreachable, and `goto` uncertainty.

Add audited target-version signatures for `sort`, `array_pop`, `array_shift`, `array_push`, `array_unshift`, `array_splice`, `shuffle`, `usort`, `preg_match`, `preg_match_all`, and `parse_str`. Preserve PHP 7.2 minimum variadic arguments, PHP 7.3 zero-value array stack calls, PHP 8.0 native mixed/nullable declarations, and PHP 8.2 literal true returns. Route their by-reference parameters through the shared readonly-modification analysis and leave unknown builtin signatures silent.

Merge definite readonly initialization across normal `try` and `catch` exits. Carry the merge through a `finally` that has no direct readonly writes. A writing `finally` consumes and propagates that merge when try/catch contain no abrupt exit; otherwise it deliberately falls back to the pre-try state so return, throw, exit, break, continue, and goto paths remain conservative.

Merge definite readonly initialization through direct `switch` dispatch, fallthrough, plain break, default/no-match and terminal exits. Consume plain breaks within a nested switch and propagate its independent complete merge to the outer switch. Refuse propagation for nested continue or any multi-level exit.

Analyze a guaranteed second iteration for syntactically infinite while/do-while/for loops whose body has no abrupt exit. Stop readonly flow after a proven non-breaking infinite loop and preserve uncertainty for ordinary conditions or early exits.

Analyze a guaranteed second iteration for canonical finite `for` loops with an integer-literal initializer and bound, a matching local counter, and a unit increment or decrement. Require the first two conditions to be true and reject counter use in the body or any abrupt exit.

Diagnose whole-object by-reference iteration only when `$this` has concrete readonly properties proven initialized in the current flow. Aggregate the names at the receiver range and preserve unknown external or uninitialized object state.

Propagate successful-construction state for a local variable assigned directly from `new` earlier in the same compound statement. Treat visible promoted readonly properties and indexed constructor-body properties initialized on every normal exit as initialized for whole-object by-reference iteration. Accept either direct local construction or a uniquely resolved function, static method, or instance method whose supported direct or immediately local construction return, sequential, conditional, throw-terminated, try/catch, direct-construction match arms, switch fallthrough/default/local plain break, conservative loop, and finally flow proves every reachable return yields the same newly constructed concrete type and cannot fall through. Consume loop-local break and continue while keeping loops fallthrough-capable. Resolve an inherited constructor or merge a visible parent summary when control flow proves every normal exit of an own constructor has invoked `parent::__construct()`. Invalidate cached summaries after semantic input changes and guard recursive cross-file analysis. Reject constructor summaries containing return, exit, break, continue, or goto, and reject parameters, existing-object, mixed-concrete-type, fallthrough, generator, cross-scope jump, or otherwise unsupported-control-flow factory results, branch-local construction, hidden members, and single-arm or otherwise unproven parent-constructor calls.

When a directly constructed child declares no constructor, resolve its actual inherited constructor and merge that owner's initialization summary. Stop inheritance as soon as the child declares its own constructor; explicit parent-constructor calls remain a separate proof boundary.

Start type Rename from a resolved direct, fully qualified, or import-path use and reuse the existing PSR-4 file operation plus native, PHPDoc, attribute, and import edits. Preserve explicit aliases and reject initiation from an alias use whose spelling is intentionally unchanged.

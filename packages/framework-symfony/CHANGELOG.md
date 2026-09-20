# Changelog

## Unreleased

- Locate exact service-id references and completion ranges in proven PHP Configurator closures, including imported `service()`, service collection lookups, alias targets, parents and decorators, while invalidating reassigned DSL variables.
- Locate the editable value and typed prefix inside exact conventional XML service-reference attributes, including an empty quoted value.
- Locate exact service ids in conventional XML `argument`, `property`, `bind`, alias, parent, decorator, factory and configurator attributes while rejecting declarations and dynamic or structurally unsafe XML.
- Locate the exact literal controller class or method segment under a YAML cursor only inside a route map with a `path`, including sequence-based module declarations.
- Locate exact `@service` and `@?service` scalar references in Symfony YAML values while rejecting declaration keys, escaped values, expressions, parameters and malformed YAML.
- Enumerate every exact Symfony YAML `@service` and `@?service` value range for bounded semantic References without treating declaration keys as usages.
- Locate the editable id segment and typed prefix inside exact YAML `@service` and `@?service` values for conservative service completion.
- Extract exact class and method ranges from literal YAML `controller` and `defaults._controller` values while rejecting service IDs and escaped or dynamic scalars.
- Expand literal localized YAML route paths and import prefixes into locale-tagged facts while rejecting dynamic values.
- Expand literal localized `Route` Attribute path maps into `.locale` route names across class prefixes, method paths and invokable classes, rejecting mismatched or dynamic locale maps.
- Select only the exact literal YAML `when@environment` block for an explicit environment, preserve nested declaration ranges and model later same-file direct-route replacement.
- Select literal string or string-array `Route` Attribute environments at class and method scope, matching Symfony's class-first filtering and preserving automatic-name indexes across excluded declarations.
- Locate direct literal keys inside Symfony route parameter arrays, retaining the exact route argument, formal-argument positions, existing keys and replacement range while rejecting dynamic keys, unpacking and structurally unknown arrays.
- Extract exact enabled environments from `config/bundles.php` and direct `$this->environment === 'literal'` guards in Kernel bundle and route registration while leaving compound or nested conditions unknown.
- Extract unconditional custom Kernel route imports and the deterministic PHP `RoutingConfigurator` subset for literal `add()` and chained `import()` declarations, while retaining only safe unconditional facts around unsupported control flow.
- Extract universal `config/bundles.php` registrations and unconditional top-level `Kernel::registerBundles()` yields with exact class ranges, leaving environment-only and dynamic registrations unknown.
- Resolve positional PHP Configurator, YAML and XML service arguments by exact constructor index, preserve per-position scalar suppression, and honor explicit arguments before binds or inferred autowiring even when autowiring is disabled.
- Parse the static Symfony PHP Configurator service DSL from a proven returned `ContainerConfigurator` closure, including service/resource registration, aliases, defaults, named wiring overrides, configured methods/properties, listener tags and literal imports with exact source ranges. Reject reassigned configurators and runtime-dependent definitions.
- Extract exact literal service-import resources from YAML and XML so callers can build deterministic configuration graphs without loading Symfony.
- Parse conventional Symfony `services.xml` files without executing the Kernel, covering deterministic defaults, explicit services and aliases, named service arguments, calls, properties, prototypes/excludes and event-listener tags with exact source ranges. Reject environment branches, dynamic values and factories that cannot prove a class.
- Preserve guaranteed literal subscription entries across optional environment-guarded additions when branches cannot touch or overwrite the base map.
- Extract exhaustive `if`/`elseif`/`else` subscription branches only when every branch returns the same static map or appends the same static entries to one local map, preserving every branch source range.
- Extract a converged local dispatch event after a complete `if`/`elseif`/`else` only when every branch contains exactly one direct construction assignment to the same variable and event class.
- Propagate a directly constructed local dispatch event through bounded same-block direct variable aliases, invalidating variables touched by references, calls, compound expressions, or control-flow statements.
- Extract a local EventDispatcher event variable only when its last relevant statement in the same block is a direct object construction and no intervening use can expose or replace it.
- Resolve relative class-constant event keys from inherited and Trait-composed subscriber maps with caller-proven `self`, late-static `static`, and `parent` owners; follow public Trait aliases back to non-public static source methods and retain unknown when any binding is unavailable.
- Resolve inherited method-attribute `self::class` and `parent::class` according to whether the provider is a class or Trait, using caller-proven direct parents; reject invalid `static::class`.
- Extract method-level `AsEventListener` attributes for a specifically proven parent or Trait method consumer, allowing its effective callback name to differ from the source method for Trait aliases while rejecting relative cross-owner rebinding.
- Extract deterministic subscription arrays built through one static initialization, literal/class-constant keyed assignments and an unchanged return; reject dynamic mutations, and allow explicit non-relative class constants across inherited providers.
- Extract literal subscription maps from a specifically proven parent or Trait `getSubscribedEvents()` provider while rejecting cross-owner class-constant binding.
- Accept inherited or Trait-composed subscriber and class-level attribute callbacks only through an optional semantic public-instance-method validator; keep standalone syntax analysis conservative.
- Extract explicit `kernel.event_listener` tags from compiled debug-container XML with decoded event identities, integer priorities and exact raw event/method ranges.
- Extract exact event identities and source ranges from syntactic `dispatch()` candidates, including direct event construction, literal/custom event names, class constants and named arguments, while leaving receiver ownership for the semantic caller to prove.
- Extract exact class/method `#[AsEventListener]` relationships, including native event-parameter inference, class method derivation, priorities, unions and invokable fallback.
- Preserve explicit YAML `kernel.event_listener` event/method ranges on services and deterministic resources while rejecting dynamic events, invalid methods and non-literal priorities.
- Extract complete literal `EventSubscriberInterface::getSubscribedEvents()` maps, including direct listeners, priorities and multiple listeners, only when every emitted relation targets a proven public instance method.
- Preserve the distinct Symfony registration range for explicit services, deterministic YAML resources, and compiled-container services while retaining the PHP implementation location for navigation.
- 容器字面量返回事实实现独立 `@php-companion/semantic-provider` 契约。
- Emit exact source ranges for literal `render()` context keys through the interop controller-variable facts.

- Expand deterministic YAML service resources against indexed concrete PHP classes, honor brace exclusions and explicit overrides, and expose literal `Autowire(service: ...)` references for completion and navigation.
- Preserve class-name aliases that target resource-loaded services, carry inherited and per-service `autowire` flags, and resolve exact type ids or a unique resource implementation for registered autowired consumers.
- Resolve literal `#[Target]`, named autowiring aliases, and service-reference `_defaults.bind`, per-service `bind`, and named `arguments` selectors while suppressing scalar or structurally unknown overrides.
- Resolve flat object union/intersection constructor types only when a combined alias exists or every member resolves to the same service.
- Resolve canonical PHP 8.2 DNF service and named aliases only when the target satisfies one complete intersection branch, without leaf-level fallback.
- Track literal YAML method calls and resolve directly attributed public `#[Required]` method parameters, including a base declaration when all registered concrete consumers agree.
- Track literal YAML properties and resolve directly attributed public named-object `#[Required]` properties with the same conservative inheritance and override rules.
- Honor Symfony `#[Required]` inherited through a proven non-private method prototype chain.
- Parse Symfony debug-container XML into compiled service, alias and exact public method-locator facts without executing project PHP or materializing container parameters.
- Extract direct service references from compiled constructor arguments and method calls as positional invocation facts.
- Extract direct compiled property service references with their owning class and property name.

This package uses Changesets for versioning.

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.

- Add static YAML route declarations/import prefixes and AST-based literal route-call positions for PHP language-server completion.
- Preserve route-name runtime values when completing quoted PHP literals; recognize case-insensitive routing method calls.
- Locate reordered named route arguments while rejecting duplicate, positional and unpack ambiguities.
- Extract explicitly named Symfony Route attributes with imported names, class/method prefixes and invokable class fallback; expose source completeness separately from runtime registration.
- Accept explicit Attribute directory imports; keep unsupported excludes unresolved instead of silently ignoring them.
- Parse literal file/directory exclude lists for route imports while preserving unsupported-pattern boundaries.

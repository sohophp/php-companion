# Changelog

## Unreleased

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

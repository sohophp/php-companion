# Changelog

## 0.4.8 - 2026-09-27

- Align the Symfony extension version with the 0.4.8 SoPHP Core and Open Source Pack candidate; the Symfony extension still owns framework editor providers.

## 0.4.7 - 2026-09-26

- Align the Symfony extension version with the 0.4.7 SoPHP Core and Open Source Pack candidate.

## 0.4.6 - 2026-09-26

- Include exact value-expression ranges for literal Controller `render()` arrays so SoPHP Core can infer local variable types for TwigPlus.


- Support PHP array-return Symfony service configuration and exact `when@environment` branches through the standalone container provider and editor requests.

- Select complete exact `$container->env() === 'literal'` PHP Configurator `if`/`elseif`/`else` chains, including nested exact guards, and keep service or parameter navigation, completion and Rename aligned with runtime environment changes.

- Select unconditional plus exact-environment Symfony XML service graphs and keep Definition, References, completion and Rename aligned with runtime environment changes.

- Register YAML, XML and PHP Configurator parameter Definition, References, completion and Rename through the standalone Symfony extension, with service, parameter and route Rename fallbacks sharing VS Code's standard F2 flow.

- Make the Winstar runtime provider authoritative when enabled and retain the static provider as source enrichment for runtime-confirmed name/path pairs.

- Own the Symfony YAML/XML/PHP Definition, References and completion providers plus YAML/XML service Rename registration; the core-only extension no longer registers Symfony editor features.

- Enable precise service-id Rename from provider-confirmed YAML and XML declarations or references, with one workspace edit spanning YAML, XML and PHP Configurator files.

- Expose provider-confirmed PHP Configurator files to exact service Definition, References and completion while retaining the standalone Symfony extension as the owner of the configuration graph.

- Reuse the complete static-route snapshot until PHP/YAML, environment, open-document, or provider configuration invalidation instead of starting the provider for every route query.

- Core static-route fallback has been removed; this extension's complete authoritative route provider is now required for Symfony route completion, Definition and References.

- Update the complete Symfony provider set atomically on configuration changes when supported by the core, with a compatible withdraw/register fallback for older plugin API v1 cores.

- Register and package the authoritative Symfony controller-to-template context provider.

- Move authoritative Symfony subscriber, listener and dispatch-candidate discovery into the standalone extension while retaining core PHP identity and EventDispatcher receiver validation.
- Move authoritative Symfony service-container discovery into the standalone extension with bounded project types and open-document snapshots, including deterministic imports, Bundle resources and fresh compiled-container arguments.
- Move authoritative static Symfony route discovery into the standalone extension with bounded open-document snapshots and core fallback on provider failure.
- Add the standalone Symfony extension shell and move ownership of the optional Winstar runtime route provider through PHP Companion plugin API v1.

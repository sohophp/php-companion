# Changelog

- Update the complete Symfony provider set atomically on configuration changes when supported by the core, with a compatible withdraw/register fallback for older plugin API v1 cores.

- Register and package the authoritative Symfony controller-to-template context provider.

- Move authoritative Symfony subscriber, listener and dispatch-candidate discovery into the standalone extension while retaining core PHP identity and EventDispatcher receiver validation.
- Move authoritative Symfony service-container discovery into the standalone extension with bounded project types and open-document snapshots, including deterministic imports, Bundle resources and fresh compiled-container arguments.
- Move authoritative static Symfony route discovery into the standalone extension with bounded open-document snapshots and core fallback on provider failure.
- Add the standalone Symfony extension shell and move ownership of the optional Winstar runtime route provider through PHP Companion plugin API v1.

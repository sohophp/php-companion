# Changelog

- Add an optional namespaced language-server request bridge so independently installed plugins can own their editor-facing VS Code providers without accessing the core Language Client.

- Allow route providers to opt into complete snapshot reuse through validated `cacheUntilInvalidated` metadata.

- Add an optional atomic registration update operation while preserving compatibility with existing plugin API v1 cores.

- Allow a bundled integration to claim authoritative controller-to-template context ownership.

- Allow bundled integrations to declare dependent container input and authoritative event-relation ownership.
- Allow bundled integrations to declare bounded document/type inputs and authoritative container-service ownership.

- Add schema 1 for independently installed integrations to register namespaced semantic and route provider processes through the PHP Companion extension API.

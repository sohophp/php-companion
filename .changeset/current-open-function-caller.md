---
"php-companion": patch
---

Use the current open caller before resolving function query offsets while document publication is pending.

Preserve source-change metadata after query-time refresh so regular publication still refreshes dependent diagnostics, framework facts, and interop.

Carry unconsumed query updates into newer document versions when they supersede a pending publisher.

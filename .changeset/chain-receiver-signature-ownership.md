---
"php-companion": patch
---

Resolve parameter hints and missing-argument diagnostics for method calls on expression receivers such as `factory()->method()`. Keep incomplete argument lists usable and prevent unresolved receiver methods from being mistaken for unrelated functions with the same name.

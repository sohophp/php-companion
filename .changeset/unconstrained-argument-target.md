---
"php-companion": patch
"@php-companion/semantic": patch
---

目标类型完整解析为 mixed 后，省略不会产生实参类型错误的多余推导，保留其它参数、PHPDoc 细化、必填与具名参数及引用输出效果的检查。

Skip redundant argument-value inference after the resolved target is mixed, preserving other parameter constraints, PHPDoc refinements, required and named arguments, and reference output effects.

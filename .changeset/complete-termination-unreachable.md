---
'@php-companion/language-server': patch
---

Diagnose statements after complete `if`/`elseif`/`else` termination and after
provably terminating `try`/`catch`/`finally` flows. Preserve silence when any
branch can continue or the bounded flow traversal cannot finish.

Handle complete `switch` statements with a default branch and case fallthrough;
keep a continuing `break`, missing default, or unsupported transfer conservative.

Recognize literal `while (true)`, `do ... while (true)`, and `for` loops with an
empty condition (including initializer/update expressions) only when no possible
`break` or `goto` occurs in the analyzed body.

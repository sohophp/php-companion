# Changelog

- Record exact two-element callable-array assignments with either a variable receiver or `Type::class` receiver and a literal method name; dynamic strings, string class names, keyed or extra elements remain unclassified.
- Preserve exact closure/arrow assignment identities and native scope return declarations for downstream variable-call analysis.
- Record variable-function invocations as call facts while retaining first-class callable acquisition identity.
- Record property-level `abstract`/`final`, hook-level `abstract`/`final`, and by-reference `&get` facts for PHP 8.4 inheritance and indirect-modification analysis.

- Record PHP 8.4 property hooks, explicit and implicit setter parameters, hook-local scopes, asymmetric write visibility, and backed versus virtual state. Treat short `set => expression` hooks as backing writes.

- Record PHP 8.3 dynamic class constant names as literal, untouched-variable, constant, folded-expression, or unknown facts with the static type receiver, instead of indexing the grammar wrapper as a static constant name.

- Record `namespace\function()` as a complete function-call fact with the full relative-name range.

- Record the `Countable` branch of built-in `is_countable()` facts as explicitly global, preserving PHP class-name resolution inside namespaces.

- Record strict `===`/`!== true|false` facts with the literal on either side for ordinary branches, else paths, proven terminating guards, and logically implied `&&`/`||` right operands, and the selected ternary arm. Facts retain a separate inspection start after their atomic condition so intervening mutations still invalidate them. Loose equality remains conservative.

- Record positive and finite-union negative `instanceof`, strict non-null, `!is_null`, positive/negative builtin predicate, strict boolean-literal comparison, `isset`, and `array_key_exists` facts from standalone native `assert()` through the remainder of the same statement block. Boolean literals may appear on either side of `===` or `!==`; loose comparisons remain conservative. Negative `is_numeric` excludes only int/float because a false result can still be a string. One-argument calls and two-argument calls with a static string or `null` description support positional and reordered named arguments; unsupported complements, nested calls, dynamic descriptions, unpacking, and uncertain disjunctions remain conservative.

- Treat `is_callable()` as a callable type predicate only when `$syntax_only` is omitted or literally false, including named arguments and property/array subjects; true or dynamic syntax-only checks no longer create an unsound runtime-callable fact.

- Record strict-subclass facts for `is_subclass_of($value, Type::class, false)`, including named arguments, finite-Union false complements, terminating guards, direct properties, and safe array paths. The default/true/dynamic string allowance and dynamic class targets remain unknown.

- Record `is_a($value, Type::class)` as a resolved type-predicate fact when `$allow_string` is omitted or literally false, including named arguments, false complements, terminating guards, direct properties, and safe array paths. Dynamic class arguments and string-enabled calls remain unknown.

- Record true-path array-key-presence facts for `array_key_exists()` and `key_exists()` with safe literal keys and direct or nested safe array collections; false paths and dynamic keys remain unknown.

- Record bounded true and false branch facts for direct built-in type predicates, strict and loose null comparisons, `instanceof`, true `isset` operands, false `empty` paths, and direct truthy targets over variables, static non-nullsafe property paths, and safe literal array paths up to 16 levels, including true conjunctions, false disjunctions, elseif chains, plain else branches and terminating guards. Multi-operand `isset` contributes every supported operand only on a proven true path; false direct targets, true `empty`, and null-equality true paths remain unknown. Preserve the called function identity so semantic resolution can reject namespace-local shadows, and bump downstream semantic snapshots to schema 44.
- 动态成员名称新增括号、纯字符串拼接、全局/类常量和 backed Enum 名称表达式事实；其余复杂表达式记录为 unknown Rename 覆盖。

## Unreleased

- Preserve the exact foreach source-expression range so semantic consumers can evaluate generic array and iterable keys or values without adjacent-text guessing.
- 将 `self`、`parent` 和 `static` 的静态方法、静态属性及类常量接收者记录为精确 `static-receiver` 类型引用。
- 结构化输出原生对象类型、继承/接口、Trait、Attribute、`instanceof` 与静态接收者引用，并为显式 import alias 保存独立 UTF-16 范围。
- 调用事实新增 function/method/static-method/constructor 结构类别，使下游无需通过相邻文本猜测调用角色，并保持旧快照字段可选兼容。
- 结构化记录直接字符串和变量表达式动态成员名、精确名称范围及直接变量/类型接收者；可证明的动态方法调用同时进入调用与局部赋值事实，保留实参、具名参数、nullsafe 和接收者。调用表达式、插值字符串，以及不完整成员补全语法恢复时误跨语句关联的变量名称继续省略。
- 记录函数/方法/构造调用是否为复合语句中的完整独立表达式，并结构化保留直接变量实例调用的接收者/nullsafe 状态，为直接函数、实例方法或静态方法调用、逻辑蕴含明确的合取真分支/析取假分支、由左侧结果确定执行的短路右操作数及无 goto 且由主分支/elseif/else 的直接、完整嵌套条件或完整 try/catch/finally、含 default 且全部入口终止的 switch，或首轮必然终止/恒真且无退出跳转的循环结果一致证明条件真值的同块继续路径记录归一化范围；嵌套括号和否定会交换结果，不完整嵌套、try/catch/finally、switch 或动态循环分支及无法推出单次调用结果的分支不记录事实。
- 为 `while` 和有条件 `for` 记录仅在循环体内成立的 truthy/falsy 调用事实，并为 `while`、有条件 `for` 与 `do…while` 记录条件短路右操作数范围；不向循环出口或 `do…while` 首轮主体传播。
- Record `readonly class` on class declarations and implicitly mark their ordinary and promoted instance properties as readonly without treating invalid static properties as readonly members.
- Record unit and backed Enum cases as case-sensitive static member declarations with exact UTF-16 name ranges, owner types, optional values, and the enum backing type.
- Record explicit parameter and return types from single-parameter ordinary closure arguments, and infer a missing return type only from one proven object construction.
- Record direct property and nullsafe-property sources for local assignments.
- Record complete variable-rooted property and method chains for local assignments, including per-step nullsafe, callback and literal facts.
- Record every declared multi-catch type on a catch variable and bound the fact to that catch body.

This package uses Changesets for versioning.

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.

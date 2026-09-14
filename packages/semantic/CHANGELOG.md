# Changelog

- Narrow type, global function, global constant, and static member References/Rename through an incrementally replaced candidate inverted index, then retain exact semantic resolution on the reduced file set. Oversized documents fall back conservatively.

- Classify updates as declaration, implementation, or no semantic change; return affected callable/type identities and retain unrelated derived summaries across trivia-only or isolated body edits.

- Diagnose direct reference acquisition, reference assignment, uniquely resolved by-reference arguments, property-reference iteration, and visible hooked properties during whole-object reference iteration according to the effective `&get` contract.

- Validate PHP 8.4 interface and abstract property requirements, get covariance, set contravariance, visibility, final properties, final individual hooks, and `&get` requirements for array-offset modification across complete indexed hierarchies. Preserve non-overridden parent hooks in effective child members. Semantic snapshots advance to schema 71.

- Model PHP 8.4 hooked-property read/write capabilities, setter-specific write types, asymmetric write visibility, and hook-local `$this`/`$value` scopes. Diagnose proven get-only writes and set-only reads while keeping unsupported indirect/reference behavior conservative. Semantic snapshots advance to schema 70.

- Resolve PHP 8.3 dynamic class constant fetches only from literal, untouched local-string, unique string-constant, or pure string-concatenation names. Expose exact Definition and propagate literal values into local flow and argument diagnostics; inaccessible, ambiguous, mutated, read-before-use, or otherwise dynamic names remain unknown. Semantic snapshots advance to schema 69.
- Preserve proven object types through regular clone and PHP 8.5 clone-with expressions only when every simple literal property update resolves, is writable from the current scope, and has a compatible value.
- Propagate PHP 8.5 pipe results through proven single-argument functions, static methods, instance methods, and explicit closures. Validate every stage's arity, by-reference boundary, input compatibility, and unique return type; dynamic, ambiguous, generic-unbound, incompatible, `mixed`, and `void` stages remain unknown. Keep unresolved member Definition empty instead of reinterpreting the member token as a namespace-relative type.
- Preserve the leading namespace separator in fully qualified function Signature Help, and memoize completed assertion-target inference per workspace state while invalidating it on source, snapshot, or external-fact changes.
- Project a unique concrete `Iterator`, `IteratorAggregate`, or `Traversable` key/value contract from a non-template named class into `foreach`.
- Infer class-level templates from a uniquely proven constructor class-string or object argument, retain the binding on the created instance, and discard invalid Union inference branches without guessing from dynamic values.
- Deduplicate Union members introduced by direct and inherited template substitution while preserving nested generic types.
- Preserve nested generic objects used as template arguments, and retain concrete caller templates through inherited `static`/`static|null` returns and non-null narrowing.
- Project a uniquely proven custom generic iterable parent into `foreach` key/value types, including nested array offsets and non-null guards; ambiguous parent projections stay unknown.
- Infer callable templates from positional array literals containing proven object constructions, preserving conservative handling for keyed, unpacked, unknown, deep, and oversized arrays.
- Preserve receiver class-template arguments in member Signature Help so generic method parameters and returns remain specialized at the call site and in subsequent assignment and iteration flow.
- Preserve direct scalar literal values while ranking overloads so literal-mode signatures select their correlated return without widening general expression inference.
- Preserve PHPDoc literal unions when every branch refines the same native scalar return, while rejecting mixed-scalar unions.

- Preserve structured PHPDoc array returns when every branch fits a nullable native array return.

- Accept numeric literal Unions as safe PHPDoc refinements of matching native scalar branches, allowing conditional `-1|0|1` results to refine `int|bool` without widening unrelated native types.
- Accept conditional PHPDoc returns as safe refinements of native return types only when every result branch belongs to the native type, enabling literal-argument return selection for output APIs.

- Expose member-access completion context even when the receiver cannot be resolved, allowing adapters to suppress unrelated global fallbacks.

- Rank exact scalar literals ahead of their primitive type and broad Unions, prefer structurally matching generic-array overloads for static array shapes, and bind their key/value templates from literal arrays before propagating call results.

- Preserve uniquely resolved safe scalar global and class constants as literal argument types, and prefer exact literal or literal-Union overload parameters over broad primitive parameters.

- Report definitely undefined local variables across named callables, explicit closures, and arrow captures while treating every plausible assignment, capture, reference argument, dynamic symbol-table operation, and PHP-safe existence check as a suppression boundary.

- Expose conservative unresolved function and namespace-constant queries for explicit qualified, `namespace\`, and exact imported-alias identities. Suppress unqualified global candidates while the builtin and extension catalogues remain incomplete.

- Keep namespace constants, class constants, and `use const` aliases case-sensitive across lookup, Definition, References, completion identity, and Rename. Differently cased constants remain independent declarations.

- Resolve `namespace\Symbol` explicitly in the current namespace across types, functions, and constants. Qualified function and constant names stay namespace-relative instead of using the unqualified global fallback, namespace aliases expand their first segment, and complete qualified uses participate in Definition and References.

- Resolve source class names with PHP's strict namespace rules: unqualified and relative qualified names no longer fall back to indexed global classes. Global completion candidates require an import; explicit imports and fully qualified names retain navigation and member inference. Semantic snapshots advance to schema 68.

- Rank function and namespace-constant completions by PHP resolution priority: same namespace, explicit import alias, global fallback, then new imports. Rank external candidates by shared namespace prefix and distance with deterministic name and fully qualified name tie-breakers.

- Rank type completions by existing visibility, shared namespace prefix, namespace distance, display name, and FQCN. Same-namespace and imported aliases remain ahead of new imports, while equally named external candidates receive deterministic, explainable ordering.

- Merge a proven pre-loop local object type with an independently proven assignment from an optionally executed `while`, conditional `for`, or possibly empty `foreach`. Completion, Definition, and argument diagnostics consume the same Union; self-dependent assignments, body reads of the target, references, unsupported jumps, and unknown body values remain unknown. Cache control-flow assignment ownership during parsing and skip loops that cannot change the queried local.

- Infer untyped closure and arrow parameters from a uniquely resolved PHPDoc callable contract, including named argument mapping, and expose the proven object type to completion, Definition, and argument diagnostics. Specialize callable parameter templates from other proven array or collection arguments in the same call, including the callable overload of `array_map`, then bind a proven arrow body or bounded closure control flow composed of sequential statements, nested `if/elseif/else`, `try/catch/finally`, complete or fall-through `switch` cases whose direct `break`/`break 1` paths rejoin following outer statements, and bounded `while/do/for/foreach` loops whose direct `break`/`break 1` paths rejoin following outer statements where every continuing path reaches a proven return. Exclude explicit throw/exit paths and uniquely resolved native `never` calls with compatible arguments and merge conditional early and final return types as a Union so mapped elements retain their type. Ambiguous overloads, unbound or conflicting templates, any unknown return, fallthrough, no proven return, nested or multi-level `break` and `continue` inside loops, returns inside unsupported control structures, yield/goto, unresolved types, unpacking, callback references/variadics, and arity mismatches remain unknown. Bound closure return traversal to 64 nodes and the shared control-flow depth limit. Prevent top-level arrow local-value analysis from looping at the syntax root.
- Filter private-parameter removal candidates by their syntactic call name before resolving signatures, avoiding repeated expensive resolution for unrelated calls in a large indexed workspace.
- Reject a method Rename whose requested name equals the current declaration case-insensitively before scanning the workspace hierarchy, dynamic references, and resolved call sites.

- Add an editor-independent Safe Move plan for named PHP types. It validates syntax and destination collisions, then returns namespace, import, fully-qualified, and proven same-namespace reference edits without writing files. Semantic snapshots persist syntax-error ranges and advance to schema 67.

- Merge up to 64 proven result arms from a match expression with exactly one default arm, treating throwing arms as `never`. Propagate complete results through local aliases while preserving missing-default, unknown-value-arm, and over-budget matches as unknown. Semantic snapshots advance to schema 66.

- Merge both proven arms of complete ordinary ternary expressions and propagate the result through local aliases. Evaluate only the reachable arm for literal boolean conditions; keep reachable unknown arms and shorthand Elvis expressions unknown. Semantic snapshots advance to schema 65.

- Infer syntax-bounded null-coalescing expressions by removing only `null` from the left type and merging the reachable fallback. Propagate the result through local aliases into completion, Definition, and argument diagnostics; preserve falsy non-null values, skip unreachable unknown fallbacks, and keep reachable unknown fallbacks conservative. Semantic snapshots advance to schema 64.

- Apply strict boolean-literal facts from ordinary branches, else paths, and proven terminating guards to parameters, local values, direct properties, and safe array-shape paths. Completion, Definition, member chains, and argument diagnostics retain the proven `T` from `T|false`; loose comparisons, negative mixed complements, and mutated targets remain unknown. Safely refine native `array|false` returns with PHPDoc `array{...}|false`, and propagate a proven root false exclusion into safe shape-element completion, Definition, and argument diagnostics, including logically implied short-circuit operands and selected ternary arms. A separate inspection origin invalidates facts after intervening by-reference mutation. Semantic snapshots advance to schema 63.

- Apply standalone native `assert()` facts for positive and finite-union negative `instanceof`, strict non-null and `!is_null`, positive/negative resolved builtin predicates, strict boolean-literal comparisons, `isset`, and `array_key_exists` to parameters, earlier known local assignments, direct properties, and safe array-shape paths. `T|false !== false` retains `T`, `bool !== false` becomes literal `true`, and strict equality can narrow mixed to the asserted literal. Negative `is_numeric` removes only int/float and preserves string; negative mixed literal comparisons, loose comparisons, and other unrepresentable complements stay unknown. Calls with static string or `null` descriptions support positional and reordered named arguments. Completion, Definition, member chains, and argument diagnostics share the fact until target mutation; semantic snapshots advance to schema 61.

- Apply standalone explicit local `@var Type $variable` assertions within the same statement block, including array-shape literal keys. Assignments, direct mutations, unset, reference binding, and proven by-reference calls invalidate the assertion; nested blocks and malformed replacements remain isolated. Semantic snapshots advance to schema 56.

- Treat an explicit adjacent `@var Type $variable` on a local assignment as a scoped developer assertion for member queries and argument typing, including member completion and Definition through safe literal keys of an asserted array shape. A later assignment or offset mutation supersedes it; unscoped, mismatched, malformed, unresolved, or non-object member targets remain conservative. Semantic snapshots advance to schema 55.

- Reuse the constructor parameter's already validated PHPDoc refinement for its promoted property, so `@param Service $service` can refine `public mixed $service` while incompatible native declarations remain unchanged. Semantic snapshots advance to schema 54.

- Bind `@var Type $property` to the named property within multi-property declarations for both indexed types and PHPDoc/native conflict diagnostics; unscoped `@var Type` still applies to the declaration. Semantic snapshots advance to schema 53.

- Apply adjacent `@var` property types when they safely refine native `mixed`, array, iterable, string/class-string, callable/Closure, or the same named base, while retaining the native type for incompatible documentation. Property flow now agrees with PHPDoc diagnostics; semantic snapshots advance to schema 52.

- Preserve concrete object implementations after `is_callable()`, composite `is_countable()`, and `is_iterable()` predicates instead of requiring a single named predicate target. Member completion and Definition now retain invokable, Countable, and Traversable implementation classes, while complements with incomplete type relations remain unknown; semantic snapshots advance to schema 51.

- Preserve every proven object candidate after object-only `is_a()` and strict `is_subclass_of(..., false)` checks on parameters, direct properties, and safe array-shape paths, exposing only signature-identical common members and every matching Definition target. Uncertain complements remain unknown; semantic snapshots advance to schema 50.

- Preserve a declared subtype rather than replacing it with the tested parent after object-only `is_a()`; false paths remove the target and all known subtypes from finite parameter unions. Completion and Definition now agree with argument diagnostics; semantic snapshots advance to schema 49.

- Preserve every concrete declared object alternative of a parameter Union after a resolved global `is_object()` fact, including false complements and terminating guards, so single-class and common-Union member completion plus multi-target Definition consume the same narrowed type as diagnostics. Namespace-local shadows remain unknown; semantic snapshots advance to schema 48.

- Preserve callable flow for `is_callable($value)` and explicit `syntax_only: false`, while keeping literal true and dynamic syntax-only checks unknown. Runtime callable facts cover finite-Union complements, direct properties, and safe array paths; semantic snapshots advance to schema 46.

- Resolve object-only global `is_subclass_of(..., false)` facts with a strict subtype relation that excludes the target class itself. Positive and finite-Union complement paths drive diagnostics, completion, and Definition for parameters, direct properties, and safe array paths; default/true string allowance, mixed complements, dynamic targets, and namespace-local shadows stay unknown. Semantic snapshots advance to schema 45.

- Resolve object-only global `is_a()` facts through the shared type-predicate flow for parameters, mixed values, direct properties, and safe array paths. Positive and finite-Union complement paths drive diagnostics, completion, and Definition; namespace-local shadows, dynamic targets, and `$allow_string=true` remain conservative. Semantic snapshots advance to schema 44.

- Distinguish optional array-shape absence from an explicitly nullable field value in proven global `array_key_exists()` and `key_exists()` true paths. Presence facts drive diagnostics, member completion, and Definition across nested safe paths, reject namespace-local shadows, preserve declared null, and invalidate on array mutations; semantic snapshots advance to schema 44.

- Narrow declared scalar and object unions, nullable objects, mixed parameters and properties, direct proven local aliases, direct visible property paths, and shape or typed-array elements across safe literal array paths up to 16 levels through resolved global PHP type predicates, strict and loose null comparisons, `instanceof`, true `isset` operands, false `empty` paths, and direct truthy guards. Positive predicates refine mixed properties while their unrepresentable negative complements remain unknown. Argument diagnostics, member completion, and Definition consume the same facts; relevant assignment, offset or path writes, method calls, reference escape, and passing the root value to a completed call invalidate them. False `isset`, true `empty`, direct falsy paths, null-equality true paths, dynamic operands, nullsafe paths, and dynamic array keys remain unknown. Semantic snapshots advance to schema 44.
- Propagate safe same-block local copies of concrete parameter or local values into ordinary argument diagnostics, while keeping dynamic mixed array writes unknown.
- Apply existing strict non-null, positive instanceof and complementary not-instanceof facts to argument types and safe local aliases, including base-to-subclass refinement and reassignment invalidation.
- Allow object-bounded callable templates to refine native object parameters and generic `class-string<T>` PHPDoc to refine native string returns, preserving object identity through calls such as `get_class($object)`.
- Infer callable templates from the compatible branch of documented union parameters, accept matching generic union refinements of native unions, and evaluate conditional returns from omitted literal defaults.
- 接受 PHPDoc callable 参数中的合法短闭包签名，并只从实际声明的参数位置反推模板；受 `array-key` 约束的模板加 null 可精化原生 `int|string|null` 返回，供现代数组 API 保留具体键类型。
- 新增 `AllowDynamicProperties` 声明目标查询，精确返回 readonly class、interface、Trait 与 Enum 上解析到 PHP 内建 Attribute 的名称范围，并排除合法 class、自定义同名 Attribute 和残缺语法。
- 新增 PHP 8.2 动态属性创建候选查询，只返回唯一具体 class、完整唯一层级及独立简单属性赋值；同一变量、同一属性的相邻已证明创建会抑制后续连续赋值，`unset` 或其他间隔会恢复候选；为右值可证明为 bool/int/float/string/array/object 或唯一命名对象的候选生成唯一 class 插入计划，未知值保持静默；声明属性、`__set`、`#[AllowDynamicProperties]` 继承、readonly class、动态名称、读取与不完整语义保持静默。
- 新增原生参数、返回和属性类型与紧邻 PHPDoc 的可证明冲突查询；精确返回文档类型范围，并对合法精化、未解析类型、不完整关系和残缺注释保持静默。
- 限制 PHPDoc/原生类型节点展开、泛型父类型遍历和模板替换文本规模；预算耗尽时停止推断，并在文件或层级更新后从当前事实重新计算冲突。
- PHPDoc/原生冲突查询解析类级及 callable 级模板上界、作用域遮蔽和传递 bound；无 bound 模板使用 mixed 上界，循环或无效 bound 保持 unknown。
- 常量别名、构造器、继承/接口/Trait、成员、变量来源与 iterable 泛型等递归语义图统一设置 64 层边界；预算外查询返回空结果。
- Extract/Inline/private 参数查询、调用/闭包/成员链定位的局部 CST 搜索改为有界迭代遍历；readonly 属性和工厂返回的树扫描/前向流限制为 100,000 节点、256 层，局部静态值合流限制为 16 层，超限时丢弃本轮不完整摘要和诊断。
- 构造器初始化摘要按变更类型的 extends/implements/Trait 依赖闭包失效，工厂摘要按变更 callable、返回类型和类型拓扑负缓存失效；无关函数文件更新保留缓存，依赖闭包超过 64 轮时安全回退全清。
- PHPDoc `array<TKey,TValue>` 与 `non-empty-array<TKey,TValue>` 转换为共享 keyed/non-empty array 类型，静态 list/shape 实参会分别验证键、值和可证明的非空约束。
- PHPDoc `int<min,max>` 转换为共享 integer-range；安全整数直接实参精确报告越界，动态 int 保持 unknown，倒置或非安全边界不生成类型事实。
- PHPDoc 结构化 array/list、封闭 array shape、唯一解析的静态短数组类常量、完整可见的 `Class::*` 集合及已索引 backed Enum，其 `key-of`/`value-of` 投影为数组键/值、list 的 int/T、字面量键、字段类型或精确标量值 Union；投影必须匹配原生参数，任一动态、不完整或不支持常量使整个投影保持 unknown。
- 静态数组 literal 与类常量投影共享 256 节点递归预算，耗尽时丢弃不完整类型。
- 命名类可通过 Traversable 家族证明属于原生 iterable，或通过真实公开非静态 `__invoke` 证明属于 callable；PHPDoc 冲突和调用参数检查复用该项目语义关系，不完整层级保持 unknown。
- PHPDoc 冲突检查增加常用整数/字符串细化、numeric/number、scalar、array-key、non-empty-array 及基础别名的运行时上界投影；投影不进入普通精细类型推断。
- 静态求值动态成员的纯字符串拼接、全局/类常量别名链及 string backed Enum value，复用最终字面量来源执行 Rename，并对循环或无可编辑来源表达式保守否决。快照升级为 schema 36。

## Unreleased

- Propagate documented generic array parameters through built-in calls and foreach, infer templates inside typed callable parameters/returns, and use PHPDoc runtime upper bounds in ordinary generic compatibility checks. Re-evaluate parameters after uniquely resolved by-reference calls: preserve the proven value domain for pop/shift and sorting operations, while invalidating stale element facts after widening or replacement mutations.

- Expose all matching global function overloads to Signature Help, rank them by complete positional or named call arguments, and bind completed calls back to the exact selected declaration for return propagation and argument diagnostics.
- Expose every directly declared constructor overload to Signature Help, select the best candidates by positional or named argument shape and proven types, and propagate fixed generic iterable contracts from non-generic classes such as `DatePeriod` into foreach values.
- Infer `Generator<TKey, TValue, mixed, TReturn>` for uniquely resolved functions and methods with complete supported `yield` bodies. Direct yields, explicit scalar keys, array and documented iterable `yield from`, nested-scope exclusion, native `Generator` PHPDoc refinement, signature display, local assignment, and foreach value propagation are covered; any unknown yield/key/return or recursive target keeps the declaration's wider type.
- Treat fully-qualified generic PHPDoc bases as refinements of matching native types, recognize PHP's implicit Stringable and Enum interfaces, and preserve stdClass dynamic-property behavior.
- 新增有继承感知的构造器可见性查询；private 只允许声明类，protected 允许直接父子类族，类外或无关类访问返回精确目标范围，不完整/循环/重复类链保持静默。
- 新增唯一构造目标校验，返回 interface、Trait、enum 和 abstract class 的精确 `new` 类型范围；普通、未解析或重复目标保持静默。
- 新增有界 class/interface 继承环和 Trait use 环查询；仅在整条路径均唯一解析且种类一致时返回闭环引用，断链、歧义和预算耗尽保持静默。
- 新增唯一解析类型关系的声明种类校验，精确返回错误的 class/interface extends、class/enum implements 及 Trait use 目标范围；未解析与重复声明保持静默。
- 新增结构化未解析类型引用查询，覆盖原生类型、继承/接口、Trait、`instanceof` 和静态接收者；仅返回零声明匹配，伪类型与尚无完整内建目录的 Attribute 保持静默。
- 类型与全局/namespace 常量查询要求工作区内恰好一个匹配声明；新增排除结构化类型、调用和成员范围的唯一常量使用点集合，供 Semantic Tokens 复用。
- 持久化 parser 的结构化类型引用事实并升级到 schema 37，使旧缓存原子失效，为类型使用点分类和后续唯一符号细分提供稳定输入。
- 解析直接字符串动态成员名，以及同一作用域内由未被读取或重赋值的简单字符串局部变量决定的成员名；为直接变量/类型接收者提供 Hover、Definition 和方法 Signature Help，并在参数数量、具名参数、实参类型、重载及模板均唯一兼容时把动态调用结果传播到局部赋值和后续成员链。方法/属性 Rename 会改写已证明属于目标声明族的动态字符串或其局部字符串来源；任何同名未知动态覆盖仍阻止重构，已解析到无关类型的同名动态访问不会误改。nullsafe 可空性继续保留；插值、调用结果名称、已读取、重赋值、分支外、歧义或不兼容调用及复杂接收者保持 unknown；快照升级为 schema 36。
- 消费独立 `@php-companion/semantic-provider` schema 1 契约；按 provider 身份深拷贝并原子替换方法、属性和字面量返回事实，校验失败保留上一代贡献，并支持显式撤销。多个 provider 对同一事实给出不一致类型时保持 unknown；旧的分组替换 API 暂作兼容入口。
- 将类级 PHPDoc `@property` 与 `@method` 作为有来源范围的合成公开成员，提供补全、签名、返回链与 Definition；真实 PHP 声明同名时优先，未声明标签和动态名称保持 unknown；快照升级为 schema 36。
- 保留同名 `@method` 重载；参数数量、具名实参或已证明的标量/对象实参类型可唯一确定签名时传播其返回链，同形候选按精确类型、继承兼容和弱标量转换依次排序；仍有多个最佳候选时 Signature Help 展示全部签名且返回类型保持 unknown。真实方法继续覆盖同名魔术重载。
- 消费 PHPStan `@method name<T of Bound, U = Default>(...)` 方法模板；复用 Callable 模板推断从 `class-string<T>` 等参数结构绑定实参，验证 bound、默认类型和全部参数后专门化魔术方法返回。无法唯一绑定或违反约束时保持 unknown；快照升级为 schema 36。
- 区分 `@property-read` 与 `@property-write`：只读属性可读取和链式导航但所有写入均报告，只写属性参与赋值类型检查和写入位置 Definition，却不提供读取返回链；成对标签合并为一个双向成员并保留各自类型。
- 求值参数或模板主题的 PHPStan/Psalm `is` / `is not` 条件返回类型；字面量和完整对象关系选择确定分支，动态条件安全合并返回 Union，并把函数、静态方法及实例方法结果传播到局部成员链。调用形状、模板 bound、逐项实参和唯一声明仍为前置门禁。
- 对未提前读取、重赋值或按引用传递的 PHPDoc Callable 参数按位置/具名实参求值条件返回类型；错误实参保持 unknown，动态条件仅暴露返回 Union 的公共成员。
- 将同一参数的布尔字面量或有限 Union 分支约束传入嵌套条件，关联 `is` / `is not` 并排除不可能返回分支；父类型可能匹配目标子类时保守合并两侧。
- 当位置或具名映射证明不同形参接收同一个直接变量实参时，共享嵌套条件分支约束；普通调用和未触碰 PHPDoc Callable 均覆盖，不同变量或复杂表达式保持独立。
- 在 `while` 和有条件 `for` 的循环体，以及 `while`、有条件 `for` 与 `do…while` 的条件短路右操作数内应用 truthy/falsy PHPDoc 断言；修改后、循环出口及 `do…while` 首轮主体保持 unknown。
- 唯一函数或唯一解析方法上的无条件及 truthy/falsy PHPStan/Psalm 对象断言，可在独立直接调用正常返回后、直接 `if` 条件、逻辑蕴含明确的合取真分支/析取假分支，`&&`/`||` 短路语义已证明左侧真/假的右操作数，以及无 goto 且主分支/elseif/else 的直接 return/throw/exit、完整嵌套 `if/elseif/else`，或 finally 必然终止/try 与全部 catch 均终止的 `try/catch/finally`，或含 default 且每个入口沿贯穿路径均终止的 `switch`，或首轮必然终止的 `do` 及无退出跳转的恒真 `while/for` 结果使全部可继续路径一致的同块路径内收窄已声明参数；直接 `$parameter->property` 正类型断言可驱动公开属性链和局部属性读取；方法 `$this->property` 正断言可映射到直接非 nullsafe 变量接收者及类内可见属性。任一祖先属性写入、根对象重赋值、链上方法调用或传入函数后立即失效。`class-string<T>` 等已支持参数结构可复用完整调用模板推断，在绑定唯一、bound 与全部实参兼容时专门化参数或属性断言对象，包括属性 `!T` 减法。`!null` 可从参数或逐级可见属性路径的单一 nullable 对象移除 null，`!Type`、`!false`、`!true`、基础类型、泛型、交集和否定 Union 可从有限 Union 中减去已证明匹配的类型；泛型减法复用方差和父类型替换，并保留唯一剩余泛型的实参供成员链专门化。实例/静态方法、位置和具名直接变量实参、嵌套括号、否定条件及普通 else 均受支持。不完整嵌套、try/catch/finally、switch 或动态循环分支、不可见属性、无法唯一化的否定属性、歧义/越界模板、无法唯一化或关系不完整、无法推出单次调用结果的复合分支、分支外、重复或动态目标、unpack、引用参数、未支持控制流和后续潜在修改保持 unknown；快照为 schema 36。
- 唯一函数和普通方法只在必填/具名/variadic 形状有效且全部有类型实参可证明兼容时传播声明返回；直接或一次未触碰局部静态数组，以及同块静态基数组上的连续整数键或 `[]` 线性写入可展开为位置实参；确定性字符串键写入构造的封闭局部 shape，以及未触碰非引用参数的封闭全必填具名 PHPDoc shape 也可展开。宽泛/可选参数 shape、已使用数组、动态或稀疏键、不确定控制流及错误或未知的有类型实参保持 unknown，无类型/`mixed` 和 weak 标量规则继续成立。
- 唯一函数和普通方法调用从直接、nullable、array/list、class-string、shape 与同基泛型实参递归推断 Callable 级 PHPDoc 模板并替换返回类型；静态数组、线性构造的连续位置数组、确定性局部 shape 和封闭全必填具名参数 shape 展开进入相同绑定，具名/variadic、`of` 约束和一致性受验证，动态展开、歧义或冲突保持 unknown。
- Callable 级模板推断可沿直接或传递 `@extends` / `@implements` 关系把子泛型实参替换、重排为父泛型后再绑定，错误的非模板父参数会阻止返回传播；歧义或不完整继承路径继续保持 unknown。
- 受支持结构任意层级的 Union 泛型实参按分支保留完整模板绑定方案，分别校验 bound 与专门化参数，并把专门化返回组成相关 Union；覆盖协变、不变和多模板同时变化，避免生成不存在的模板笛卡尔积；超过 64 个绑定组合时保持 unknown。
- Callable 参数调用的返回传播新增逐实参类型门禁，覆盖位置、具名、variadic、直接静态数组、一次局部静态数组、线性构造的连续位置数组和确定性局部 shape 展开；继承、泛型方差、strict/weak 标量及 `mixed` 规则与普通参数兼容性一致，错误或无法证明的非 mixed 实参保持 unknown。
- 完整同块 `if/elseif/else` 合并各分支确定性局部赋值为 Union，支持嵌套完整条件；缺失分支、提前退出与合流后副作用保持 unknown。
- 完整同块 `switch` 合并全部 case/default 正常出口的确定性局部赋值，支持普通 `break`、贯穿及嵌套完整条件/switch；缺少 default、未赋值入口和复杂跳转保持 unknown。
- 完整同块 `try/catch/finally` 合并 try 与全部 catch 的确定性局部赋值，并支持 finally 确定覆盖或安全透传；未赋值及不安全路径保持 unknown。
- 至少执行一次的 `do…while` 传播循环体确定性局部赋值，并支持嵌套完整控制流；复杂条件、跳转、副作用和可能零次执行的循环保持 unknown。
- 首次条件可证明为真的规范整数 `for` 传播每轮确定性赋值；末尾普通 break 支持 do/while、`while (true)` 与 `for (;;)` 的确定单轮，零轮及动态边界保持 unknown。
- 可证明非空的 list/array/shape `foreach` 传播循环体确定性赋值，覆盖静态、同块局部及已证明调用结果；普通或动态 iterable 保持 unknown。
- 多步链支持 Union/Intersection/DNF 接收者；每个运行时分支必须具备同签名成员和相同规范返回，nullable 分支经 nullsafe 保留。
- 直接实参中的多步对象成员链逐级解析成员、对象返回、nullsafe 状态和位置实参数量，最终对象、标量、nullable、Union 与 PHPDoc 结构类型进入兼容性检查；动态、不完整或中间非对象链保持 unknown。
- 同块局部数组流处理静态 list 追加与字符串 shape 键新增/覆盖，维护非空状态、元素 Union 和最新字段类型；动态或混合更新保持 unknown。
- 数组追加与 shape 键写入的值扩展到未重赋值的已声明参数和已证明同块局部值；索引 0 可安全创建或更新 list，mixed、稀疏数值键与混合模式保持 unknown。
- 同块线性局部值传播从静态数组扩展到标量、对象构造、唯一调用和已证明 Callable 返回，仍在调用副作用、引用、控制流、动态覆盖与变量转抄处失效。
- PHPDoc Callable 参数名进入 AST；直接调用结果支持具名实参，以及静态位置/字符串键数组展开，并按重复、未知名称、必填、可选与 variadic 规则验证调用形状。
- 未触碰 PHPDoc Callable 参数支持同作用域一次直接赋值后的单层别名调用；源参数使用、别名重赋值、多层及条件别名保持 unknown。
- Callable 静态数组展开支持一次直接局部数组赋值后的未触碰变量；参数数组、追加/覆盖后数组与多次赋值保持 unknown。
- 未触碰的 PHPDoc Callable 参数在位置实参数量满足必填、可选和 variadic 声明时可把完整返回类型传入参数诊断；命名、展开、数量不符、已有使用、引用、重赋值或不完整签名保持 unknown。
- 唯一可解析函数及普通实例/静态方法的完整返回类型进入参数兼容性检查；`self`/`parent` 使用声明类、`static` 使用实际调用类，nullable nullsafe 接收者保留 null 分支；动态与歧义调用保持 unknown。
- 参数兼容性沿完整 PHPDoc `@extends` / `@implements` 链替换泛型参数，支持直接、递归和参数重排；缺失或歧义关系保持 unknown。
- 保留 PHPDoc template 方差并在泛型参数变量转发时消费；持久语义快照升级到 schema 23，旧快照明确失效重建。
- PHPDoc Callable 参数与显式闭包/箭头函数签名进入共享 Callable 代数，执行逆变参数和协变返回检查；外层调用的参数映射不再被嵌套表达式整体抑制。
- list/shape 参数检查沿同块线性语句传播局部静态数组字面量，只跨过可证明无关的纯字面量语句，并对调用和控制流保持保守。
- 参数诊断递归比较嵌套 PHPDoc array shape 与静态数组字面量，并沿用 list、nullable 和 Union 类型关系；无法完整证明的嵌套值保持 unknown。
- Diagnose missing required keys and incompatible scalar fields in flat associative literals passed to PHPDoc array-shape parameters. Parse top-level separators with quote and nesting awareness, preserving dynamic keys, nested values, and complex expressions as unknown.
- Diagnose flat scalar array literals against PHPDoc `list<T>` and `non-empty-list<T>` parameters when element or non-empty incompatibility is proven, while proving statically keyed associative shapes are not lists and preserving dynamic, nested, or unsafe-to-parse arrays as unknown.
- Diagnose a resolved unrelated `SomeClass::class` argument against a PHPDoc `class-string<Base>` parameter when the indexed hierarchy proves incompatibility, while accepting subclasses and preserving ordinary or dynamic strings as unknown.
- Diagnose whole-object by-reference iteration when `$this` has readonly properties proven initialized by the current flow, or when a same-block local has visible promoted readonly properties and indexed no-abrupt constructor-body properties initialized on every normal exit and is proven to come from direct construction or a unique factory whose supported direct or immediately local construction return, conditional, throw, try/catch, direct-construction match arms, switch fallthrough/default/local plain break, conservative loop, and finally flow constructs one concrete type. Consume loop-local `break` and `continue` while keeping every loop conservatively fallthrough-capable. Resolve an inherited constructor when the child has none, and merge a visible parent summary for an own constructor when every normal control-flow exit proves a `parent::__construct()` call. Report one receiver-range result with the exact property names and preserve silence for parameters, existing-object, mixed-type, fallthrough, generator, cross-scope jump, or unsupported-control-flow factories, branch-local construction, single-arm or unproven parent calls, hidden properties, and uninitialized state.
- Analyze a second abstract iteration for syntactically infinite `while`, `do-while`, and `for` loops only when their body has no abrupt exit. Also prove two iterations of canonical finite integer-bound `for` loops with a matching local counter and unit increment/decrement, rejecting body counter use and abrupt exits. Diagnose the first-iteration source location that must fail on iteration two, and stop analyzing code after a proven non-breaking infinite loop.
- Merge readonly initialization across `switch` dispatch, fallthrough, plain break, terminal and default/no-match exits. Consume plain breaks and complete merges inside nested switches; fall back for nested continue or multi-level exits.
- Merge definitely initialized readonly properties across normal `try` and `catch` exits. Preserve that merge through a read-only `finally`; when a writing `finally` has no abrupt try/catch path, use and propagate the merge to diagnose repeated writes inside or after it. Retain the pre-try fallback when an abrupt path exists.
- Consume uniquely resolved audited builtin declarations through the existing signature path, diagnosing readonly properties passed to the by-reference parameters of `sort`, `array_pop`, `array_shift`, `array_push`, `array_unshift`, `array_splice`, `shuffle`, `usort`, `preg_match`, `preg_match_all`, and `parse_str` while leaving unknown builtins silent.
- Track definitely initialized readonly properties through sequential statements and all reachable `if`/`elseif`/`else` arms. Diagnose a later direct assignment after an all-arm merge and a loop-body assignment when initialization is definite on loop entry; preserve single-arm, zero-iteration, unreachable, and `goto` uncertainty.
- Diagnose a direct assignment to a promoted readonly property from its declaring constructor body and the second or later direct `$this` assignment to one readonly property in the same compound block. Preserve mutually exclusive branches and suppress straight-line counting for callables containing `goto`.
- Report readonly compound/coalescing assignments, increment/decrement, array-offset writes, direct references, uniquely resolved by-reference arguments, and by-reference foreach over a property even inside the declaring family. Preserve by-value calls/foreach, possible pre-initialization `unset` in declaring scope, and interior object mutation; report external `unset`. Reuse retained trees for open documents and dispose temporary trees for snapshot-only files.
- Consume structured PHP 8.2 readonly-class facts, expose ordinary and promoted properties as readonly members, and version-gate their external-write diagnostics separately from PHP 8.1 explicit readonly properties. Bump the persistent semantic snapshot schema to 22.
- Report definitely external writes to user-declared readonly properties and all writes to synthesized Enum `name`/`value`, while leaving declaring-family initialization candidates unknown.

- Mark synthesized backed Enum factories as trusted native signatures so `from` and `tryFrom` argument checks follow the caller strict/weak scalar mode.

- Diagnose directly proven scalar literal argument, return, and direct typed-property assignment mismatches only when the source file declares `strict_types=1`; retain PHP weak scalar coercion and unknown-expression boundaries.

- Rename trait methods through fully resolved `insteadof` rules when each consumer has one winner; update the selected method token while leaving loser-only precedence tokens intact.
- Model unit/backed Enum native members (`cases`, `from`, `tryFrom`, readonly `name`/`value`) and propagate `static` factory returns through direct member chains, report a missing backed value, and preserve nullable access rules for `tryFrom`. Rename a case-sensitive Enum case from its declaration or exact static access while preserving differently cased siblings; reject case/constant collisions, dynamic access, and reflective string lookup. Bump the persistent semantic snapshot schema to 21.
- Bind method templates from ordinary closures and arrow functions in direct and assigned member-call chains, including a missing return type proven by one object construction.
- Propagate direct property assignments while preserving member visibility and nullable access rules; bump the persistent semantic snapshot schema.
- Resolve complete member chains into local assignment types through the shared visibility, generic, literal-return and nullsafe rules; bump the snapshot schema again.
- Plan conflict-free Extract Variable facts for complete block-level assignment RHS and return expressions while rejecting unsafe structural contexts.
- Plan Inline Variable facts only for a non-reference local assignment followed immediately by one whole-value use, rejecting intervening statements, repeated uses and effectful nested expressions.
- Plan a strict Extract Method subset with proven inputs and one optional output, inferring declaration-safe return types from real object declarations, unique native call signatures and scalar or array literals without leaking scalar pseudo-classes.
- Plan removal of an unused ordinary parameter from a unique private non-magic method, synchronizing PHPDoc and every resolved positional or named call while rejecting reference, variadic and potentially effectful discarded arguments.
- Expose native object constructor parameters, explicit Symfony wiring markers and indexed subtype checks through an editor-independent framework boundary.
- Expose a literal Symfony `#[Target]` selector separately from unsupported or explicit `#[Autowire]` parameter wiring.
- Expose fully resolved flat object union/intersection constructor parameter types while rejecting unresolved members.
- Preserve resolved PHP 8.2 DNF branches and their canonical Symfony container type expression.
- Expose signature-identical members across native Union and DNF alternatives, merge Intersection members, preserve chained return inference, and return every matching branch declaration.
- Check unresolved and nullable composite member accesses across every complete runtime alternative instead of using the first branch as a proxy.
- Route multi-catch variables through the same branch-aware member model within their exact catch-body lifetime; bump the semantic snapshot schema.
- Propagate complete composite object groups and nullability through bounded direct local-variable aliases with cycle protection.
- Propagate complete native composite return branches from a uniquely resolved function through a direct local assignment.
- Continue member chains through complete native composite method returns, requiring canonical branch agreement across composite receivers and preserving nullsafe propagation.
- Propagate native composite returns through direct assignments from instance methods, static methods, and common methods on composite receivers.
- Identify parameters on directly attributed public Symfony `#[Required]` methods, including declarations inherited by concrete services.
- Identify directly attributed public, non-static Symfony `#[Required]` properties with a resolved named object type.
- Follow proven non-private method prototypes when a public override inherits Symfony's `#[Required]` behavior.
- Expose public method parameter identity and declared object types for exact compiled-container locator matching.
- Rename a proven non-private method parameter by position across its complete interface, parent, and override family, including PHPDoc and each resolved named-argument spelling, while rejecting incomplete or dynamic references and scope collisions. Ordinary parameter Rename also updates standard, PHPStan, and Psalm `@param` tags.
- Prefer own members over trait members and trait members over inherited declarations so an implementation signature cannot be replaced by its interface signature.
- Rename a public or protected class/interface method from its declaration across a complete interface, parent, and override family, including resolved direct calls and parent/self/static calls; reject hierarchy collisions, dynamic call targets, callable strings, and incomplete hierarchies.
- Rename a non-promoted public or protected class property from its declaration across a complete class hierarchy, including repeated declarations and resolved instance/static accesses; reject hierarchy collisions, dynamic properties, promotions, and incomplete hierarchies.
- Disambiguate methods, properties, and class constants by access syntax before member lookup, including classes that legally use the same name for a method and property.
- Rename a promoted property as one parameter/property identity across constructor scope uses, adjacent PHPDoc, resolved named construction and property accesses, including child classes that inherit the constructor.
- Resolve inherited constructors for signature help and named-argument semantics while preserving the concrete class created by `new`.
- Rename trait methods and properties across their declarations, internal references, and proven host/descendant references; update a qualified alias source while preserving its alias, and reject unresolved contributor ambiguity.
- Start method and property Rename from a uniquely resolved use while retaining the declaration path's completeness and collision checks; reject composite candidates that one edit plan cannot cover.
- Start unique named-function Rename from a resolved direct call while preserving explicit import aliases and rejecting rename initiation from an alias call.
- Start parameter Rename from a uniquely resolved named argument, including inherited method families and promoted-property constructor arguments.
- Rename unique namespace constants across declarations, import paths, and resolved uses, and class constants across exact self/inherited accesses; preserve explicit aliases and reject dynamic, reflective, trait, collision, or incomplete-hierarchy cases.
- Rename a trait method alias independently from its adaptation or exact calls without changing the source trait method, while rejecting collisions, ambiguity, and dynamic/string callables.
- Rename trait constants across internal, host, and descendant accesses while rejecting ambiguous contributors, host collisions, dynamic/reflection references, and incomplete consumer hierarchies.

This package uses Changesets for versioning.

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.

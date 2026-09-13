# Changelog

## Unreleased

- Callable 兼容性允许实现省略调用契约的尾部参数，并允许只增加可选尾部参数；实现新增必填参数仍不兼容，已有参数继续按引用、variadic、可选性、参数逆变和返回协变检查。
- 将 PHP 原生允许的 `int` 到 `float` 拓宽及 array/list/shape 到 `iterable` 的关系纳入共享兼容性代数。
- 为递归类型关系增加默认 256 次比较预算及可选 `maxComparisons` 覆盖，超限返回 unknown，避免深层或递归类型耗尽调用栈。
- 命名对象到原生 iterable/callable 的关系改由可选 `isNamedSubtypeOfPrimitive` 上下文证明；没有项目事实时返回 unknown，不再直接判定不兼容。
- sealed shape 到 non-empty array 的关系要求至少一个必填字段；空 shape 或仅含可选字段为不兼容，开放 shape 保持 unknown。
- 新增开放/封闭 integer-range 类型；安全整数 literal 精确检查上下界，子区间要求完全包含，range 可拓宽为 int，而普通 int 到窄 range 保持 unknown。
- 基础标量到同类字面量约束返回 unknown，避免把运行时动态值误判为确定不兼容。
- 不同泛型基类不再按参数位置直接比较；新增 `genericSupertype` 上下文回调，只有完成显式父泛型参数替换后才继续模板数量和方差计算，支持继承前后模板数量不同的安全映射。
- `TypeRelationContext.genericVariance` 可为泛型基类型提供逐参数协变、逆变或不变声明；缺失或数量不匹配的元数据继续返回 unknown。
- Model `list<T>` and `non-empty-list<T>` as sequential integer-keyed array types, enforcing element and non-empty compatibility while keeping arbitrary arrays-to-list relations unknown.
- Model unconstrained and bounded `class-string<T>` values, including covariant class constraints, string widening, and conservative arbitrary-string compatibility.
- Preserve DNF parentheses when displaying nested union/intersection types and correctly compare stronger intersections with complete target intersections.

This package uses Changesets for versioning.

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.

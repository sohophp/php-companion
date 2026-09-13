# @php-companion/type-system

类型兼容关系包含 PHP 原生 `int` 到 `float` 的安全拓宽，以及 array、list 和 array shape 到 `iterable` 的结构化子类型关系；sealed shape 只有含必填字段时才能满足 non-empty array，只有可选字段时仍可能为空。命名对象到原生 `iterable`/`callable` 由 `TypeRelationContext.isNamedSubtypeOfPrimitive` 提供项目语义证明，缺少回调时返回 `unknown`。无法证明的继承、泛型方差或结构关系同样返回 `unknown`。递归关系默认限制为 256 次比较，`TypeRelationContext.maxComparisons` 可进一步收紧；预算耗尽同样返回 `unknown`。

与编辑器、文件系统和框架无关的 PHP 类型代数组件。Alpha 提供基础类型、命名类型、字面量、`int<min,max>` 区间、Union、Intersection、DNF、Nullable、keyed/non-empty array、`list<T>`/`non-empty-list<T>`、shape、泛型、`class-string<T>` 和 Callable，以及 `yes | no | unknown` 三态兼容性。Callable 参数按逆变关系检查；PHP 用户闭包可省略调用方传入但自身不读取的尾部参数，自身新增的必填参数仍不兼容。整数 literal 精确检查区间上下界，子区间必须完整包含；普通 int 到窄区间保持 unknown，宽泛基础标量到同类字面量约束也保持 unknown。DNF 以嵌套 Union/Intersection 表示，输出时保留交集分支括号。

不同命名对象在缺少继承信息时返回 `unknown`。`list<T>` 保留顺序整数键，非空列表可赋给普通列表，普通 array 到 list 保持未知。`class-string<T>` 按类继承关系协变且可赋给 string，普通 string 是否为有效类名保持 `unknown`。泛型可通过 `TypeRelationContext.genericVariance` 声明每个参数的协变、逆变或不变关系；不同泛型基类还必须由 `genericSupertype` 显式完成子类到父泛型的参数替换；父泛型专门化先于模板数量和方差比较，因此支持继承前后模板数量不同的安全映射，否则保持 `unknown`。Callable 使用参数逆变和返回协变。

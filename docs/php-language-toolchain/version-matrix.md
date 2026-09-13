# PHP 7.2–8.5 支持矩阵

最后核对：2026-09-14。`解析` 表示 Tree-sitter 能形成 CST；`事实/语义` 表示 parser 已输出并由 semantic/type-system 消费；`版本诊断` 表示会按目标版本接受或拒绝。不能由“解析成功”推断功能已支持。

| 版本 | 代表性语言边界 | 解析 | 当前事实/语义 | 版本诊断 |
| --- | --- | --- | --- | --- |
| 7.2 | object 类型、参数类型扩展 | 是 | 原生参数/返回类型、类成员 | 是；矩阵基线 |
| 7.3 | 灵活 heredoc/nowdoc、调用尾逗号 | 是 | 字符串范围隔离 | 是；调用尾逗号具备边界测试 |
| 7.4 | Typed properties、箭头函数、`??=` | 是 | 属性类型、箭头函数参数作用域 | 是；代表项具备边界测试 |
| 8.0 | Attribute、Union、属性提升、named arguments、`match`、`?->`、返回 `static` | 是 | Attribute 名称扫描；对象 Union 分支共同成员、诊断及直接别名/返回传播；提升属性和 `static` 返回绑定 | 是；代表项具备边界测试 |
| 8.1 | Enum、Intersection、readonly 属性、`never`、first-class callable | 是 | Enum、Intersection 基础表示、readonly 属性 | 是；代表项具备边界测试 |
| 8.2 | DNF 类型、readonly class、独立 `true`/`false`/`null` 类型 | 是 | DNF 进入类型代数、参数兼容、分支共同成员查询及 Symfony 注入 alias；readonly class 的普通/提升实例属性进入 readonly 成员及外部写入诊断 | 是；DNF、readonly class 及 Symfony alias 有正反语义/LSP 测试 |
| 8.3 | Typed class constants、动态 class constant、`#[Override]`、Trait 方法 final adaptation | 是 | Typed class constant；动态 class constant 的精准名称、Definition 与 literal 类型传播；其余待补 | 是；typed 与 dynamic class constant 具备边界测试 |
| 8.4 | Property hooks、final/abstract property、非对称属性可见性、无括号 `new` 链式访问 | 是 | hook 局部作用域、backed/virtual、get/set 能力、setter 写入类型、非对称写可见性、接口/抽象契约、读协变/写逆变、独立 hook 继承、final 边界，以及由 `&get` 控制的下标修改、直接引用、唯一按引用调用和属性/对象引用遍历已进入成员语义；动态或歧义调用保持 unknown | 是；版本、声明、继承及读写正反例具备测试 |
| 8.5 | Pipe operator、clone-with、常量表达式 callable、静态属性非对称可见性、final 提升属性 | 是；clone-with 与 final 提升属性使用保守兼容层 | pipe callable 链与简单 clone-with 已进入返回传播；final 提升属性进入属性事实和继承覆写检查；静态属性按读写方向应用 set 可见性；其余表达式待补 | 是；final 提升属性与静态非对称可见性具备 8.4 拒绝、8.5 接受及语义正反例 |

## 当前跨版本共同能力

- namespace、class/interface/trait/enum、extends/implements、Trait use/adaptation。
- 函数、方法、闭包、箭头函数及其最小参数/赋值作用域。
- 方法、属性、提升属性和类常量；public/protected/private、static、readonly。
- 原生参数/返回/属性类型与基础 PHPDoc fallback；`self`、`parent`、`static` 返回绑定。
- 语法错误范围、UTF-16/Unicode 范围、多 namespace 和未完成成员表达式上下文。

## 明确限制

`MultipleIterator<TInnerKey,TValue>` 已覆盖 PHP 7.2–8.5 的成员、flags、参数和返回边界。由于 flags 可运行时改变，键和值保持 `array<array-key,...>`；`MIT_NEED_ANY` 下结束的子迭代器槽位保留 null。只有唯一可证明的泛型 iterable 父级投影会进入 `foreach`，冲突或不完整继承保持 unknown。

SPL 迭代器适配器已覆盖 `IteratorIterator`、filter/recursive filter 家族、`LimitIterator`、`NoRewindIterator`、`InfiniteIterator`、`AppendIterator` 与 `EmptyIterator`。PHP 7.2/7.4/8.0 的构造、callback 和 seek 参数边界、PHP 8.1 tentative returns、PHP 8.2 `EmptyIterator::valid(): false` 分别生成；递归 child 的动态类和 append 的内层 iterator 保留键值模板。

高级 SPL 迭代器已覆盖 `RecursiveIteratorIterator`、`CachingIterator`、`RecursiveCachingIterator`、`RegexIterator`、`RecursiveRegexIterator` 与 `RecursiveTreeIterator`。Regex 因 mode 可变，值类型保持原始 `TValue`、string 与 match/split array 的安全 Union；Tree 因 bypass flags 可变，键和值分别保持原始模板与 string 的 Union。PHP 7.2 的旧 arginfo、PHP 7/8 参数名、PHP 8.1 tentative returns、PHP 8.4 typed constants 和 PHP 8.5 构造参数联合类型按目标版本生成。

SPL 目录迭代器已覆盖 `DirectoryIterator`、`FilesystemIterator`、`RecursiveDirectoryIterator` 与 `GlobIterator`。Directory 的 current/foreach 与 recursive child 保留实际调用类；Filesystem/Glob 因 flags 可变，current 保持 string、`SplFileInfo` 与 iterator 自身的安全 Union。PHP 7/8 参数名、PHP 8.1 `FOLLOW_SYMLINKS`/`OTHER_MODE_MASK` 数值变化和 tentative returns、PHP 8.4 typed constants 按目标版本生成。

Reflection 高频核心已覆盖 `ReflectionClass`/`Object`、函数/方法、属性、参数、类型、Attribute、类常量及 Enum 反射。集合返回保留 `ReflectionMethod`、`ReflectionProperty`、`ReflectionParameter`、`ReflectionAttribute` 与 `ReflectionEnumUnitCase` 元素类型；PHP 7.2/7.4 modifier 值和旧 export、PHP 8.0 Attribute/Union、PHP 8.1 tentative returns/Intersection/Enum、PHP 8.2 readonly/prototype、PHP 8.4 lazy object/property hook/typed constants 与 PHP 8.5 mangled name 分别生成。

迭代函数目录已覆盖 `is_iterable`、`iterator_to_array` 与 `iterator_count`。后两者在 PHP 8.2 起使用 `Traversable|array` 原生参数；转换返回通过条件 PHPDoc 保留默认键类型，并在 `preserve_keys=false` 时收窄为 `list<TValue>`。

类/对象检查目录覆盖类型存在性、成员存在性、继承检查、类名/父类名、成员列表及已声明类型列表；PHP 8.0 的原生参数和失败返回变化、PHP 8.1 `enum_exists` 可用性均按目标版本选择。PHP 8.3 的无参 class-name 查询弃用尚待通用 deprecated 标签协议。

变量类型谓词覆盖 PHP 7.2–8.5 的基础类型、scalar/numeric/callable/countable 及别名；`is_countable` 从 PHP 7.3 启用，`is_real` 在 PHP 8.0 移除。PHP 8.0 起生成 mixed 参数和 bool 返回的原生签名。

- 当前使用一套最新语法 grammar。选择 PHP 版本会诊断已登记的较新语法，其余未登记边界仍可能被接受。PHP 8.5 clone-with 兼容层只接受可静态验证的简单属性数组，避免为了兼容 grammar 而吞掉真实语法错误。
- DNF 已进入类型代数、原生参数兼容、分支共同成员查询、直接局部别名、函数/方法复合返回传播和 Symfony 注入参数事实。PHP 8.3 dynamic class constant 支持字面量、未触碰局部字符串、唯一字符串常量与纯字符串拼接名称的 Definition 和 literal 类型传播；动态、不可访问或歧义名称保持 unknown。PHP 8.4 property hooks 已支持短/完整 hook、局部 `$this`/`$value`、backed/virtual、get/set 能力、setter 写入类型、非对称写可见性、完整已索引层级的抽象/接口契约、读协变/写逆变、独立 hook 继承、final 属性/final hook，以及由有效 `&get` 控制的数组下标修改、直接取引用、唯一解析按引用实参、属性 foreach 引用和对象 foreach 引用；向任意 hooked property 赋引用会被拒绝。动态或歧义调用、动态属性名和跨层级生成保持 unknown。PHP 8.5 pipe 支持每段输入、单参数 arity、按引用边界和唯一返回均可证明的函数、静态/实例方法及显式闭包；动态 callable、返回歧义或未绑定 callable 模板保持 unknown。clone-with 对现有 grammar 兼容层允许的简单属性数组验证属性身份、访问权限和值类型并保留对象类型；动态属性名、复杂值和未知操作数保持 unknown。任意表达式重赋值、完整控制流合流及完整 clone-with 属性表达式等尚未进入语义模型。
- 内建 stub 当前含首批共同核心类、DateTimeInterface/DateTime/DateTimeImmutable/DateTimeZone/DateInterval/DatePeriod、完整 SPL 函数、`SplFileInfo`/`SplFileObject`/`SplTempFileObject` 和 Strings callable 目录、高频数组函数、PDO、Reflection 高频核心、Password Hashing、Hash/HMAC、安全随机数、Filter、核心/SPL 迭代与集合接口、Closure、泛型 Generator，以及完整泛型 `ArrayObject`/`ArrayIterator`、`SplObjectStorage`/`SplFixedArray`、`SplDoublyLinkedList`/`SplQueue`/`SplStack`、`SplHeap`/`SplMinHeap`/`SplMaxHeap`/`SplPriorityQueue`、SPL 迭代器适配器和 `SplObserver`/`SplSubject`。数组容器按 PHP 7.4/8.0/8.1/8.2/8.4/8.5 门控 magic serialization、IteratorAggregate/JSON/SeekableIterator 转换、原生参数、插入与排序返回、typed constants 和弃用；heap 另按版本门控 compare 参数、debug 与 PHP 8.5 serialization，并在可变 extract flags 下保留 data/priority/both 的安全 Union；Observer 接口按 PHP 7.2/7.4/8.1 门控 arginfo 参数名与 tentative `void`。WeakReference、WeakMap/Stringable、UnitEnum/BackedEnum 按 PHP 7.4/8.0/8.1 门控；SPL 文件类的 `fgetss`、CSV EOL 和 nullable write length 分别按 PHP 7.3/8.0、8.1 与 8.5 门控。Date/Time 工厂、异常、常量、微秒 API 与接口关系按 PHP 7.3/8.0/8.2/8.3/8.4 门控。安全函数保留 PHP 7 失败返回、PHP 7.4 算法身份、PHP 8.1 Hash options 与 PHP 8.4 bcrypt 成本边界；依赖编译能力的 Argon 常量不由版本选择器猜测。Filter 目录按常量 literal 提供验证返回重载，并门控 PHP 8.0、8.2 与 8.5 常量变化。数组目录包含 PHP 7.3 `array_key_first/last`、PHP 8.4 `array_find/find_key/any/all` 及 PHP 8.5 `array_first/last`，字符串和数组函数保留已审计的可用性、失败返回、参数与默认值边界，数组模板继续保留可证明的 key/value/callback 返回类型，标准异常层级按 PHP 7.2–8.5 门控。其余核心及扩展符号仍未完整生成。
- 每个版本后续必须增加可运行 PHP 对照 fixture；对应环境不存在时只记录静态 parser 证据。

## 权威来源

- [PHP 8.0 migration guide](https://www.php.net/manual/en/migration80.new-features.php)
- [PHP 8.3 release notes](https://www.php.net/releases/8.3/en.php)
- [PHP 8.4 release notes](https://www.php.net/releases/8.4/en.php)
- [PHP 8.5 release notes](https://www.php.net/releases/8.5/en.php)
- 其余边界继续依据 PHP Manual 对应 `migrationXY` 页面逐项登记。

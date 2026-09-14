Reflection 高频核心已进入共享版本化目录，覆盖类、函数、方法、属性、参数、类型、Attribute、类常量和 Enum 反射；`ReflectionClass(Foo::class)` 与对象实参可让三个实例工厂继续返回 `Foo`，动态字符串不推测。方法/属性/参数等集合结果继续驱动 foreach 成员补全、Signature Help 与内建 Definition，并按 PHP 7.2–8.5 切换旧 export、tentative returns、readonly、lazy object、property hook 和 mangled name。

mbstring 完整函数目录与版本化常量进入相同内建文档，提供函数补全、Signature Help、结构化返回传播和 Definition。PHP 7 历史参数名/旧别名、PHP 8 原生类型，以及 7.4–8.4 的新增和移除边界由目标版本决定。

# @php-companion/language-server

Composer 索引缓存使用 v44 校验封装：schema 72 的解析文件、引用候选与类型依赖，以及每个 PHP 文件的 Symfony Controller/Twig 上下文和 Doctrine repository/association 事实一并验证和恢复。单个缓存条目损坏时只重建对应文件；恢复后的反向继承图继续负责传递失效构造器摘要。已打开且内容不同的文档拒绝磁盘缓存，并且不会把未保存内容写入以磁盘时间戳为键的缓存。

Symfony `services.yaml` 和新鲜 `var/cache/dev/*DebugContainer.xml` 使用独立的 `symfony-facts-v1` 有界缓存。恢复同时校验 Composer 根、来源路径、URI、稳定文件元数据、源内容 SHA-256、事实结构和事实 SHA-256；损坏或陈旧条目单独重建。热启动仍读取来源以验证内容，但不重新执行 YAML/XML 分析。缓存只保存未展开 YAML 事实，resource 服务每次都按当前 PHP 类型目录展开；文件监控明确报告变化时会绕过对应缓存条目。

服务器可按 Composer 根选择 DOM、Filter、mbstring、PDO、SimpleXML、XML Parser、XMLReader 与 XMLWriter 内建符号。初始化和 `phpCompanion/phpExtensionAvailability` 通知接受 workspace folder/嵌套 Composer 根的禁用及已探测运行时快照，并与 Composer platform 明确为 `false` 的扩展合并；配置、运行时或 Composer 文件变化无需重启即可刷新。运行时载荷必须具有完整版本、SAPI、可执行文件与扩展目录，且 PHP 次版本必须等于服务器目标版本，否则整份运行时事实被拒绝。使用这些已审计扩展的类型、函数或常量时，服务器发布 `php.extension.unavailable`，并区分 workspace 设置、Composer platform 与实际运行时来源；未知扩展、未审计符号和项目 polyfill 保持静默。

PHP 8.4 属性 hook 现在提供 backed/virtual 感知的 Hover/Definition 与直接赋值类型检查，并发布 get-only 写入、set-only 读取、`private(set)` 外部写入、数组间接修改、直接引用、唯一签名按引用调用、属性/对象按引用遍历、接口/抽象属性缺失、继承类型或可见性不兼容、final 覆盖，以及静态、readonly、非法抽象、虚拟默认值和 backed `&get`/`set` 声明诊断。低于 PHP 8.4 的目标版本只保留既有版本边界，不启用这些 hook 语义诊断。

PHP 8.3 动态类常量访问在名称与可见常量均唯一可证明时提供 Definition，并把字面量值传播到局部类型和参数诊断；其余动态场景保持静默。低于 PHP 8.3 的目标版本会收到明确版本诊断。

PHP 8.5 clone-with 在简单属性更新完整通过类型与访问检查时提供结果成员补全和 Definition；动态键、缺失属性、不兼容更新、nullable 或非对象操作数不产生猜测结果。

PHP 8.5 pipe 表达式在全部 callable 阶段可证明兼容时提供最终返回类型的补全与 Definition；动态、按引用、不兼容、歧义或返回类型不完整的阶段不产生猜测结果。

十七种 SPL 迭代器适配器与高级迭代器，以及四种 SPL 目录迭代器已进入共享内建目录。`IteratorIterator`、递归遍历、cache、filter、limit、rewind 与 infinite 适配器保留键值模板，递归 filter/目录的动态子类和 `AppendIterator` 的嵌套 iterator 容器可继续传播具体值类型；Regex、Tree 与 Filesystem current mode 的可变输出使用安全 Union。`EmptyIterator` 的 `never`/`false` 及 PHP 7.2–8.5 参数、flags、tentative return 与 typed constant 边界进入 Signature Help、补全与 Definition。

`MultipleIterator<TInnerKey,TValue>` 的当前键和值按可变 flags 保留 `array<array-key,TInnerKey|null>` 与 `array<array-key,TValue|null>`；具体元素类型可从直接 `current()` 及 `foreach` 数组读取进入非空守卫、成员补全和 Definition。PHP 7/8.0 的 `false` 失败返回、PHP 8 参数、PHP 8.1 tentative 返回及 PHP 8.4 typed constants 由共享规格选择。

`SplObserver` 与 `SplSubject` 的 attach/detach/notify/update 已进入 Signature Help 和 Definition，并由共享规格选择 PHP 7.2–8.5 参数与返回边界。

`SplHeap<TValue>`、`SplMinHeap<TValue>`、`SplMaxHeap<TValue>` 与 `SplPriorityQueue<TValue,TPriority>` 已覆盖完整公开成员和继承关系。普通堆传播具体值类型；优先队列根据可变 extract flags 保留 data/priority/both Union，并进入 Signature Help、迭代、赋值、补全和 Definition。PHP 8.5 heap serialization 同样由共享规格选择。

`SplDoublyLinkedList<TValue>`、`SplQueue<TValue>` 与 `SplStack<TValue>` 已覆盖完整公开成员和继承关系。具体值类型进入 Signature Help、Iterator/ArrayAccess、队列和栈操作、局部赋值、foreach、补全与 Definition；PHP 7/8 插入返回、PHP 7.4 serialization 和 PHP 8.4 typed constants 均由共享规格选择。

`SplObjectStorage<TObject,TInfo>` 与 `SplFixedArray<TValue>` 已覆盖完整公开成员和 PHP 7.2–8.5 版本边界。对象键、附加信息和固定槽位类型进入 Signature Help、offset、迭代、数组转换、静态 `fromArray()` 工厂、局部赋值、成员补全和 Definition；PHP 8.0 iterator 转换、PHP 8.1 JSON、PHP 8.2 serialization、PHP 8.4 seek/deprecation 与 PHP 8.5 alias deprecation 均由共享规格选择。

`ArrayObject<TKey,TValue>` 与 `ArrayIterator<TKey,TValue>` 已覆盖完整公开成员、常量和 PHP 7.2–8.5 版本边界。容器方法的具体键值类型进入 Signature Help、返回数组/迭代器、offset/current、局部赋值、foreach、成员补全和 Definition；PHP 7.4 magic serialization、PHP 8 参数、PHP 8.2 排序 `true` 与 PHP 8.4 typed constants 均由共享规格选择。

`SplFileInfo`、`SplFileObject` 与 `SplTempFileObject` 提供版本化构造器及方法 Signature Help、继承成员补全、Definition 和返回传播。文件/CSV 读取的失败 Union、CSV 控制数组 shape，以及 PHP 7 `fgetss`、PHP 8.1 EOL、PHP 8.5 nullable write length 边界均由共享规格驱动。

SPL 官方 15 项函数目录均提供版本化 Signature Help、返回传播与 Definition；类关系、autoload callable list、对象 id/hash 和 iterator 输入边界复用同一共享规格。

服务器通过自定义请求 `phpCompanion/planSafeMove` 提供 Composer PSR-4 类型移动预检及原子 LSP `WorkspaceEdit`，并通过 `phpCompanion/reconcileSafeMove` 在资源管理器完成文件操作后执行有界、幂等的 namespace 与 import 收敛。请求会拒绝跨 Composer 根、非唯一 PSR-4 映射、语法错误、目标文件或声明冲突，以及移动涉及的未保存文档。标准 LSP 诊断 `php.type.filename` 只在文件恰有一个顶层命名类型且文件名不匹配时发布，其 Quick Fix 使用 `documentChanges` 返回文件 Rename 操作。

唯一解析调用的 PHPDoc `callable(Service): Return` 契约可为无原生类型的 closure/arrow 参数提供上下文对象类型。位置与具名实参会按外层签名映射；Callable 参数模板可从同一调用的其他已证明数组/集合实参唯一专门化。可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，会绑定 callable 返回模板，排除明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径，并把条件提前返回与最终返回合并为 Union，使 `array_map` 映射结果继续保留元素类型。补全、Definition 和参数诊断共享同一结果；重载歧义、未绑定或冲突模板、任一未知返回、函数体仍可落空、没有任何可证明返回、循环内嵌套/多层 `break` 与 `continue`、其它尚未建模控制结构内的 return、yield/goto、未解析类型、unpack、引用/variadic callback 或参数数量不符时保持 unknown。

严格 `===`/`!== true|false` 的普通分支、else 和提前退出守卫事实会驱动 `T|false` 的补全、Definition 与参数诊断；宽松相等、mixed 否定补集和修改后的目标保持 unknown。原生 `array|false` 的 PHPDoc shape 精化在排除 false 后继续驱动安全元素的补全、Definition 与诊断，逻辑已证明的短路右操作数及严格比较选择的三元 arm 同样生效。

独立原生 `assert()` 的正向与有限 Union 否定 `instanceof`、严格非空、`!is_null`、正反已解析内建谓词、严格 `true`/`false` 字面量比较、`isset` 和 `array_key_exists` 事实会在同一语句块后续代码中提供补全、Definition、成员链和参数诊断；mixed 的否定字面量比较、宽松比较或无法表示的补集保持 unknown，目标修改后立即停止使用。

独立局部 `/** @var Type $variable */` 在同一语句块内提供补全、Definition、成员链和参数诊断；跨块查询以及赋值、直接修改、`unset` 或引用修改后的查询保持 unknown。

紧邻局部赋值的显式 `@var Type $variable` 会进入补全、Definition、成员链和参数诊断；结构化 array shape 的安全字面量键也可补全和导航。重赋值或数组偏移写入后立即失效，错名、无变量名和残缺注解不会产生类型事实。

Signature Help 会显示从完整可证明函数体推导的 `Generator<TKey, TValue, mixed, TReturn>`，函数或普通方法结果经局部变量进入 foreach 后继续提供值类型成员补全与导航；未知 yield、return、委托 iterable 或递归路径保留宽类型。

版本化内建目录提供 PHP 7.2–8.5 Date/Time 成员、工厂和异常边界。`DatePeriod` 的三种构造形式会作为独立 Signature Help 候选，并按实参或命名参数收敛；foreach 值按公共 `DateTimeInterface` 契约提供成员补全和导航。

Strings 内建已覆盖 PHP 官方 103 项 callable union。PHP 7.2–8.5 的可用性、弃用、移除、参数与默认值差异按目标版本切换；`implode`、`join`、`strtr`、`count_chars`、`str_word_count` 和 `substr_replace` 使用关联重载，CSV list 与 locale shape 进入返回传播和 Definition。

首批数组内建覆盖 keys/values、merge/replace/combine、filter/map/reduce、查找、切片、聚合和 walk 等高频函数。已声明 `array<TKey,TValue>` 参数可经调用结果与 foreach 保留键和值；typed callback 同时绑定输入与返回模板。关键可用性、失败返回与 literal true 契约按目标 PHP 版本切换。

目标 PHP 8.4+ 对 `T $parameter = null` 发布 `php.parameter.implicitly-nullable` Warning，并提供首选显式可空 Quick Fix。原子类型改为 `?T`，Union 补充 `|null`，Intersection 生成合法 DNF `(A&B)|null`；已显式可空、`mixed`、无类型参数和旧目标版本保持静默。

完整项目索引后，`php.phpdoc.type-conflict` 以 Warning 标记紧邻 `@param`、`@return`、`@var` 中可证明超出原生运行时类型边界的精确类型范围；类级/callable 级模板按实际作用域和传递 bound 判断。合法子类型精化、循环或不完整模板及其他 unknown 场景均抑制，并支持通用诊断关闭与严重性覆盖设置。

常用 PHPStan/Psalm 伪类型按运行时上界参与冲突判断，例如 `positive-int` 属于 `int`，`non-empty-string` 属于 `string`，`numeric` 属于 `int|float`，`array-key` 属于 `int|string`，`non-empty-array<K,V>` 属于 `array` 和 `iterable`。

PHP Companion 的独立 PHP Language Server。严格类型文件中的直接标量字面量参数、return 和类型属性赋值错误会发布稳定诊断代码；唯一解析的 extends/implements/Trait use 目标也会执行声明种类检查；弱类型强制转换不报告。目标 PHP 8.1+ 对可证明的外部显式 readonly 写入及必然间接修改发布 `php.assignment.readonly-property`，PHP 8.2+ 同样覆盖 readonly class 的隐式只读实例属性。PHP 8.2+ 还会对唯一具体 class、完整唯一层级及独立简单赋值发布 `php.property.dynamic-deprecated` Warning；右值可证明为合法原生属性类型时，首选 Quick Fix 会在唯一源码 class 中声明相应 public 类型属性，未知值或 `vendor` 中的声明不提供编辑；声明属性、`__set`、继承的 `#[AllowDynamicProperties]`、readonly class、动态名称与不完整语义保持静默。同版本还以 `php.attribute.invalid-allow-dynamic-properties` 拒绝内建 Attribute 用于 readonly class、interface、Trait 或 Enum。当前间接修改包括复合/空合并赋值、自增减、数组偏移写入、直接引用操作、唯一签名的按引用参数、属性 foreach 引用、已确定初始化属性的 `$this` 整体引用遍历、同语句块直接构造或由唯一且通过直接 `return new` 或同块紧邻局部构造后返回、条件分支、`throw`、`try/catch`、各 arm 直接 `new` 的 `match`、含贯穿/default/局部普通 `break` 的 `switch`、保守可落空循环（含局部 `break`/`continue`）或受支持的 `finally` 证明全部可继续返回路径返回同一具体的新构造类型的工厂产生的局部对象的可见提升及索引内自有、实际继承或控制流证明全部正常出口前调用父构造器所确定初始化的 readonly 属性遍历及外部 `unset`；声明类内还覆盖提升属性的构造器再赋值、顺序重复初始化、全部 `if/elseif/else` 可继续分支、完整及局部 break 嵌套 `switch` 正常出口或 `try/catch` 正常出口初始化后的再赋值、进入循环前已确定初始化的循环体再赋值，以及无提前出口且语法恒真循环或可证明执行两轮的规范整数边界 `for` 的必然第二次迭代；无直接 readonly 写入的 `finally` 可保留 try 合流事实，写入型 `finally` 在 try/catch 无提前退出时同样使用并传播该事实。当前 Alpha 支持增量文档同步、多根 Composer 索引、持久缓存、语法/版本/重复/PSR-4/未使用 import/缺失接口及抽象父类方法/确定的继承方法签名不兼容诊断、完整索引后未解析 `new` 类型、确定缺失/不可见/错误静态访问的成员，以及 PHP 8.0+ 必填参数、未知/重复命名参数和参数顺序诊断；并提供类型、函数、常量和成员的补全、Hover、保留引用/variadic/默认值的签名、Definition、Type Definition、Implementation、Type Hierarchy、声明及精确变量/调用/成员/原生与 PHPDoc 类型/import 使用点 Semantic Tokens、已证明局部对象的 Inlay Hints、基础 References、安全子集的接口/抽象方法、构造函数、属性访问器与父方法 Override 生成、Extract Variable/Method、Inline Variable、private 非魔术方法声明 Rename 与符号查询。项目源码索引完整时，即使 vendor 因预算被截断，已注册且启用 autowire 的 Symfony 服务构造参数和直接声明的公开 `#[Required]` 方法参数、具名对象类型属性仍可显示由现有声明确定的注入服务，并从类型跳转到实现类；扁平对象 Union/Intersection 仅在各成员一致指向同一服务时生效，PHP 8.2 DNF 只接受规范化完整 alias，显式 `#[Autowire]`/`#[Target]` 参数仍由其专用规则处理。

空合并表达式的精确结果可经局部别名进入补全、Definition 与参数诊断。语言服务器只移除左侧的 `null`，保留其他 falsy 类型；左侧确定非空时跳过不可达回退，可能执行但未知的回退则使结果保持 unknown。

完整普通三元表达式会合并两个可证明 arm；字面量布尔条件只保留可达 arm。可达 unknown 与 Elvis 简写保持 unknown，不产生推测性的成员或诊断。

带唯一 default 且所有结果均可证明的 PHP 8 `match` 会把最多 64 个 arm 合并到局部补全、Definition 与参数诊断。缺失 default、unknown arm 和超预算表达式保持 unknown。

PHPDoc `class-string<T>` 参数会对已解析类常量实参执行继承约束检查；只有完整索引证明无关的类才发布 `php.argument.type-mismatch`，普通和动态字符串保持静默。

PHPStan/Psalm 条件返回类型支持参数或模板主题的 `is` / `is not`。确定的布尔字面量或对象关系选择单一返回分支，动态条件保留两侧 Union 的公共成员；函数、静态方法、实例方法及未触碰 PHPDoc Callable 参数的结果可继续驱动 Completion、Hover 与 Definition。调用不唯一、Callable 绑定不稳定、实参不兼容或类型关系不完整时保持静默。

嵌套条件会关联同一参数已经证明的布尔或有限 Union 分支，Completion 与 Definition 不暴露不可达返回类型。无法表达的补集或不完整层级不用于剪枝。

唯一函数或唯一解析方法的 PHPStan/Psalm 对象断言可在无条件独立调用正常返回后，或直接 `if` 条件、逻辑蕴含明确的合取真分支/析取假分支、短路求值已证明的右操作数及无 goto 且直接、完整嵌套条件或完整 try/catch/finally、含 default 且全部入口终止的 switch 或可证明不继续的循环结果一致证明的同块路径内收窄直接传入的已声明参数，并立即用于成员补全、Hover 和 Definition。直接 `$parameter->property` 正类型断言支持逐级可见的单/多层属性链和局部读取，方法 `$this->property` 正断言支持直接非 nullsafe 变量接收者及类内可见属性，任一祖先属性或根对象可能修改、链上方法调用后失效。Callable 模板可由 `class-string<T>` 等已支持参数结构唯一推断并在 bound 与全部实参兼容后专门化参数或属性断言；`!null` 支持参数或逐级可见属性路径的单一 nullable 对象，`!Type`、`!false`、`!true`、基础类型、泛型、交集和否定 Union 支持从有限 Union 减去已证明匹配类型且结果为唯一对象的场景，唯一剩余泛型会保留实参，唯一剩余交集会保留完整组合成员组并用于后续成员链。嵌套括号、否定条件和普通 else 受支持；不完整嵌套、try/catch/finally、switch 或动态循环分支、不可见属性、无法唯一化的否定属性、歧义或越界模板、无法唯一化或关系不完整、无法推出单次调用结果的复合分支、分支外、动态/重复目标、unpack、引用参数、未支持控制流及后续可能修改保持静默。

PHPDoc 列表参数对可证明的扁平标量数组字面量发布元素类型和非空约束诊断；静态关联键可证明不是 list；动态键、嵌套值和动态数组保持静默。

PHPDoc array shape 参数会对静态关联数组字面量发布缺少必填键和字段类型不兼容诊断，并递归处理嵌套 shape、list、nullable 与 Union；动态键与复杂值保持静默。

参数诊断会沿同一语句块传播局部静态标量、数组、对象构造、唯一调用及已证明 Callable 返回，并可跨过纯字面量 echo 或独立静态字面量赋值；遇到调用副作用、引用、控制流、动态覆盖、变量转抄或跨块来源时保持静默。

同块 `$list[] = value` 和 `$shape['key'] = value` 更新会维护 non-empty-list、元素 Union 及 shape 最新字段类型；value 可来自静态值、未重赋值的已声明参数或已证明局部值，索引 0 可安全创建/更新 list。mixed/未知值、其他数值键、混合数组模式、引用、调用副作用或未支持控制流保持静默。

直接实参中的多步对象属性/方法链会逐级检查唯一成员、对象返回、nullsafe 状态和位置实参数量，最终对象、标量、nullable、Union 及 PHPDoc 结构类型参与参数诊断。Union/Intersection/DNF 接收者要求所有运行时分支具有同签名成员和相同规范返回。由直接字符串或未触碰局部字符串决定的动态方法，在重载、参数及模板均唯一兼容时可传播局部赋值和成员链返回；无法证明的动态名称、分支返回分歧、错误或展开参数及中间非对象链保持静默。

同一外层基本块中的完整 `if/elseif/else` 会把各分支确定赋予局部变量的静态值、构造或已证明调用结果合并为 Union，并支持嵌套完整条件。缺少 else、未赋值/提前退出分支、未知副作用或跨块来源保持静默。

完整 `switch` 同样合并每个 case/default 正常出口的确定性局部赋值，支持普通 `break`、case 贯穿及嵌套完整条件/switch。缺少 default、可能未赋值的入口、带层级 break、提前退出或未知副作用保持静默。

完整 `try/catch/finally` 会合并 try 与每个 catch 的确定性局部赋值；确定赋值的 finally 覆盖此前路径，只有安全语句的 finally 保留 Union。未赋值 catch、提前退出及未知副作用保持静默。

至少执行一次的 `do…while` 可传播循环体内确定赋予的局部值，并支持上述完整嵌套控制流；规范整数边界且首次条件为真的 `for` 同样传播。循环体末尾普通 break 支持 `do…while`、`while (true)` 与 `for (;;)` 的确定单轮。复杂跳转、调用条件、未知副作用、普通 while/foreach、动态或零轮 for 不向循环后传播新值。

iterable 可证明为 non-empty-list、non-empty-array、含必填字段 shape 或对应静态/同块局部值的 `foreach` 会传播循环体确定赋值；普通或动态 iterable、空值、continue 与未知副作用保持静默。

PHPDoc Callable 参数会检查完整显式签名的闭包和箭头函数实参，按参数逆变和返回协变发布不兼容诊断；不完整和动态 callable 保持静默。

PHPDoc 泛型参数转发会读取声明类的 `@template-covariant`、`@template-contravariant` 和普通不变 `@template`；`@extends` / `@implements` 的直接及递归继承会先完成模板参数替换和重排，再应用父泛型方差。缺少完整声明、模板参数或继承关系时保持静默。

唯一可解析函数及普通实例/静态方法调用的完整返回类型，只在必填/具名/variadic 调用形状有效且全部有类型实参可证明兼容时参与参数诊断；直接静态数组、一次未触碰的同作用域局部静态数组、同块线性构造且只含连续 `[]`/整数键写入的未读取局部位置数组，以及未触碰非引用参数的封闭全必填具名 PHPDoc shape 可精准展开。无类型或 `mixed` 参数允许动态值，标量遵循调用文件 strict/weak 规则。对象继承、Union 和 PHPDoc 泛型复用同一类型代数。`self`/`parent` 按声明类、`static` 按调用类绑定，nullable nullsafe 结果保留 null 分支。宽泛/可选参数 shape、已使用的参数数组、稀疏或动态键、无法证明的修改、无效或动态调用、重复声明、`mixed`/`void` 返回与无法解析的接收者保持静默。

函数和普通方法的 Callable 级 PHPDoc 模板可从位置、具名和 variadic 实参推断后替换返回类型，直接、一次未触碰局部静态数组、线性构造的连续位置数组、确定性字符串键写入构造的封闭局部 shape 或封闭全必填具名参数 shape 展开使用同一套绑定。直接 `T`、nullable、数组/list、`class-string<T>`、shape 字段、同基泛型参数及完成参数替换和重排后的直接或传递父泛型进入保守递归绑定；受支持结构任意层级的 Union 实参逐分支保留完整模板绑定组合，分别复核约束和专门化参数，再把相关的专门化返回组成 Union；协变、不变及多模板相关结果都不会展平成模板笛卡尔积。约束、重复绑定、必填参数和调用形状必须全部成立。宽泛/可选参数 shape、已使用的参数数组、稀疏或动态键、无法证明的修改、超过 64 个绑定组合、分支结构/模板集合不一致及继承路径歧义保持静默。

未按引用、调用前未使用或重赋值的 PHPDoc Callable 参数，在位置/具名实参、直接静态数组展开、一次直接静态数组局部赋值后的变量展开、静态基数组上连续 `[]`/整数键写入构造的未读取局部位置数组，或未触碰非引用参数的封闭全必填具名 shape 展开同时满足必填、可选、variadic、名称和逐项类型声明时，其直接调用结果会参与参数诊断；同作用域一次直接赋值且双方未再使用/重赋值的单层别名也受支持。实参类型校验复用继承、泛型方差和调用文件的 strict/weak 标量规则，`mixed` 参数可接收动态值，variadic 可接收额外具名参数。重复名称、无 variadic 接收的未知名称、命名后位置实参、类型不兼容或无法证明的非 mixed 实参、宽泛/可选参数 shape、已使用参数数组、稀疏或动态键数组、数量不符、多层/条件别名或签名不完整时保持静默。

Symfony 项目存在 `var/cache/dev/*DebugContainer.xml` 时，服务器只在该文件不早于已索引 `src/`、递归 `config/`、`composer.json` 和 `composer.lock` 时读取它。新鲜缓存可补充 bundle/编译器生成的服务目录、公开 `ContainerInterface::get()` 返回类型、精确到已索引公开方法和参数名的私有 service locator、按源码 callable/参数位置/对象类型复核的编译构造参数与方法调用，以及按 owner/名称/对象类型复核的明确 Required 属性注入 Hover/Definition；任一依赖文件更新或缓存无法完整解析时，整组编译事实立即停用，继续使用静态 YAML 能力。

Controller interop 会为完整、字面量 `render()` context 中的每个变量提供 PHP 键名精确范围，并声明 `rename-prepare` 能力。TwigPlus 可据此把直接目标模板的外部变量引用与全部 Controller 键合并为一次跨语言 Rename；动态或不完整 context 不进入该能力。

原生对象 Union/Intersection/DNF 参数支持分支感知成员查询。Intersection 合并成员；Union 与 DNF 只提供所有备选分支中签名完全相同的成员，Definition 返回各分支声明，共同返回类型可以继续成员链。任何标量或未知分支、签名分歧、重赋值和无法安全应用的控制流收窄都会抑制该结果。

多类型 catch 变量在对应 catch body 内进入同一成员模型，离开 body 后类型事实失效。

原生复合参数的直接局部别名保留分支与 nullable 信息；循环或不明重赋值保持未知。

唯一可解析函数的完整原生对象复合返回类型可经直接赋值提供同样的成员体验。

完整原生对象复合方法返回可继续成员链；复合接收者要求所有共同声明解析为完全一致的规范返回分支，并保留 nullsafe 状态。

实例、静态及复合接收者共同方法的完整原生复合返回经直接局部赋值后仍提供相同成员体验。

`php.import.unused` 只报告可独立删除的单项 `use` 语句；代码和 PHPDoc 中的引用会保留 import，group use 暂交给 Optimize Imports。对应 Quick Fix 删除完整语句并支持单步撤销。

```bash
php-companion-language-server --stdio
```

当前包只声明已经实现并验证的能力；复杂控制流、高级泛型、完整诊断和重构继续按开发计划逐项加入。未知或索引不完整时保持保守结果。

唯一具名函数 Rename 可从声明或直接解析调用点发起；定义、导入路径及普通/全限定调用进入同一编辑。显式 import alias 保持不变，从 alias 调用点不提供 Rename。

命名空间常量 Rename 覆盖唯一声明、`use const` 路径与普通/全限定使用；类与 Trait 常量 Rename 覆盖声明、`self::`、宿主及精确解析的继承访问。Enum case 作为大小写敏感的 EnumMember 提供文档符号、Semantic Token、Definition、原生 case Hover 和 Rename，并可从声明或精确静态使用点发起；unit/backed Enum 的原生静态方法、只读实例属性、签名帮助、缺参/backing 类型/nullable 诊断及工厂返回链共享同一语义模型。显式 alias、动态/字符串查找、多 Trait 同名来源、冲突和不完整层级保持保守拒绝。

方法 Rename 会先完成可取消的项目索引，可从声明或唯一解析的调用点发起。private 方法只修改直接解析到同一声明的调用；public/protected 方法还要求完整继承层级，并统一修改接口、父类、重写实现、已解析直接调用和 `parent/self/static` 调用。Trait 源方法同步内部及已证明的宿主/子类调用，并修改具名 alias 的源方法而保留 alias 名；alias 自身可从 adaptation 或调用点独立 Rename，且不修改源方法。多个 Trait 同名方法存在时，只有完整 `insteadof` 规则为每个宿主证明唯一 winner 才提供编辑，并按被选中或被排除身份精确处理 precedence token。非法名称、相关层级名称冲突、未收敛的 Trait 来源、复合类型候选无法由同一计划覆盖、动态调用、数组/字符串 callable 或不完整层级不提供编辑；无法解析的普通接收者、反射和工作区外引用不会被改写。

属性 Rename 同样可从声明或唯一解析的访问点发起。private 属性修改同一声明的已解析访问；public/protected 属性要求完整类层级，并统一修改重复声明与已解析实例/静态访问。提升属性还同步构造参数作用域、紧邻 PHPDoc，以及直接或继承构造的已解析命名实参。Trait 属性同步内部及已证明的宿主/子类访问；动态属性、宿主或多 Trait 同名来源、参数/层级冲突、闭包捕获、重复提升属性或不完整层级不提供编辑。反射、字符串和工作区外访问不会被改写。

普通参数 Rename 可从声明、作用域引用或唯一解析命名实参发起。非 private 方法按参数位置覆盖完整接口、父类与重写实现，并同步各实现原参数名对应的紧邻标准/PHPStan/Psalm `@param` 和已解析命名实参；提升属性构造实参转入参数/属性同一身份编辑。层级不完整、可能相关的动态同名调用、闭包捕获或任一方法作用域名称冲突时不提供编辑。

高频读取请求在异步边界响应 LSP 取消令牌，诊断只发布当前文档版本。Composer 发现与索引通过标准 Work Done Progress 报告阶段和进度，并接受客户端取消。VS Code adapter 对服务器异常退出执行有限重启，并在一分钟内连续失败超过三次时停止恢复循环。

客户端可在初始化参数 `disabledDiagnosticCodes` 和 `diagnosticSeverity` 中传入关闭列表与严重性映射，也可通过 `workspace/didChangeConfiguration` 的 `phpCompanion.diagnostics` 动态更新；服务器会立即重算已打开的 PHP 文档。严重性支持 `error`、`warning`、`information`、`hint` 和 `off`。

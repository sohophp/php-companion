# @php-companion/semantic

`SemanticWorkspace.update()` 返回 `none`、`implementation` 或 `declaration` 分层结果，以及实际变化的 lowercase callable/type 身份。声明层比较忽略源码范围，实现层按 callable/property-hook 的源码片段比较；文件末尾空白等无语义变化不会失效派生缓存。调用方可据此只刷新受影响的框架事实，具体函数体变化仍会精确清除对应工厂或构造器摘要。

References 与 Rename 使用随 `update()`、`remove()`、`restore()` 同步替换的有界候选倒排表。类型、全局函数、全局常量和静态成员先按 PHP 大小写规则定位少量声明及使用文件，再在候选文件中执行既有语义解析；候选表不直接产出结果。单文档超过预算时进入保守全查询回退，避免为了性能牺牲完整性。

schema 73 快照把全局声明/签名、方法体实现事实、引用候选与类型依赖拆为独立记录。声明和实现记录必须属于同一 URI，派生候选键及依赖边必须能从两者重组后的语义文件重新推出，全部通过后才原子恢复。该边界允许磁盘层分别校验各类记录，并为后续只恢复声明、按需加载方法体提供稳定格式；当前查询仍要求完整实现记录，缺失或损坏时重建对应文件。继承、接口和 Trait 的反向依赖图用于传递失效构造器摘要；图不完整时清空派生缓存，不发布可能过期的结果。

工厂构造摘要会记录唯一解析的直接 Callable 调用边。`outer() -> middle() -> inner()` 可传递复用确定的直接构造结果；`inner()` 实现变化会沿有界反向图失效 `middle()` 和 `outer()`，而无关 callable 及调用边移除后的旧被调用方变化不会触发重算。组件可导出和恢复已消费的正向构造事实；恢复要求调用者、结果类型和每条直接依赖身份唯一，并由依赖叶节点向调用者逐层接受。缺失、歧义、循环、返回类型不一致、动态调用和预算耗尽保持 unknown。

`workspaceTypes()`、`workspaceFunctions()` 和 `workspaceConstants()` 提供带完整身份与来源 URI 的全局声明目录。未解析函数和常量查询默认继续抑制未限定全局名称；调用方只有传入经过审计的全局目标白名单时，才可查询这些名称，用于扩展不可用等可证明诊断。项目或 polyfill 已声明同一符号时不会报告缺失。

PHP 8.4 属性 hook 在 backed/virtual 状态可证明时分别暴露读写能力；短 setter 的独立写入类型参与直接赋值诊断，`private(set)` 等非对称可见性只约束写操作。完整已索引层级会合成未被覆盖的父 hook，并验证接口/抽象属性能力、可见性、读协变、写逆变、final 属性和 final 单 hook。数组下标修改、直接取引用、唯一签名按引用参数、属性按引用 `foreach` 及对象按引用遍历均要求有效 getter 为 `&get`；向 hooked property 绑定新引用始终拒绝。动态、歧义调用和跨层级生成保持 unknown。

PHP 8.3 动态类常量访问只在名称可由字面量、未触碰局部字符串、唯一字符串常量或纯字符串拼接证明时解析；Definition 指向唯一可见声明，常量字面量值进入局部类型和参数诊断。动态、被修改或提前读取的名称，以及不可访问、歧义或无法静态求值的常量保持 unknown。包含动态访问的常量 Rename 继续保守拒绝。

PHP 8.5 `|>` 在每一段都可证明为接受单个普通值的函数、静态方法、实例方法或显式闭包时，会把该段唯一返回类型继续传给下一段，并让最终结果进入局部变量、补全、Definition 与参数类型查询。按引用参数、输入不兼容、动态 callable、重载返回不一致、未绑定 callable 模板、`mixed` 或 `void` 立即使整条流水线保持 unknown。

PHP 8.5 clone-with 在操作数对象类型、简单字面量属性名、访问权限和更新值类型均可证明时保留原对象类型；动态键、缺失属性、不兼容值、nullable 与非对象操作数保持 unknown。

类级模板可从唯一可证明的构造参数绑定到新对象。当前支持既有 Callable 推导结构，包括 `class-string<T>|T` 的类名或对象实参；违反 bound 的 Union 候选会被淘汰，动态值、歧义构造器或未绑定模板保持 unknown。绑定后的对象会把具体模板传入成员返回，因此 `ReflectionClass<Foo>` 的实例工厂可继续返回 `Foo`。

模板替换会递归保留嵌套泛型，并消除直接或继承替换产生的重复 Union 成员。例如 `T|string` 在 `T=string` 时稳定显示为 `string`。

嵌套泛型对象可作为另一泛型类的模板实参继续穿过成员返回和局部赋值。继承方法的 `static`/`static|null` 返回同时保留实际调用类及其模板映射，非空守卫不会退化为未专门化父类；PHPDoc late-static 返回只有在确实精化原生声明类边界时才覆盖原生返回。

自定义泛型 iterable 会在继承关系完整且仅能投影出一组 `Iterator`、`IteratorAggregate` 或 `Traversable` 键值类型时进入 `foreach`。迭代值若为泛型 array/list/shape，字面量键读取及其非空守卫继续保留元素类型；不同父级投影产生冲突时保持 unknown。

成员 Signature Help 保留接收者的类模板实参。`Collection<string, Item>` 上返回 `TValue`、`array<TKey,TValue>` 或泛型 iterator 的方法会在调用点显示具体类型，并把同一事实继续传播到局部赋值、foreach、成员补全和 Definition；模板缺失、越界或无法唯一解析时保持未专门化或 unknown。

内建与项目函数重载按“精确 literal、对应 primitive、兼容 Union”排序；直接安全标量字面量在重载选择期间保留具体值，但一般表达式推断仍使用 primitive。静态 array shape 可参与 `array<TKey,TValue>` 重载选择和模板绑定，调用结果因此保留键和值类型。无法证明的动态数组、稀疏更新或不兼容元素仍保持 unknown。成员访问上下文即使无法证明接收者类型也会保持明确，使编辑器适配层不会误回退到全局函数或常量补全。

条件 PHPDoc 返回可精化已有原生返回类型，但要求两个结果分支递归落在原生类型范围内；因此 `print_r($value, true)` 为 `string`、默认调用为 `true`，`var_export($value, false)` 为 `null`，而越界文档类型不会覆盖原生契约。

唯一解析且值为安全标量的全局常量和类常量会作为 literal 实参参与重载选择。literal 或 literal Union 参数比宽泛的 `int`/`string` 参数优先，使 Filter 一类由模式常量决定返回类型的 API 能传播精确结果；动态、重复、越界、Enum case 或无法静态求值的常量保持 unknown。

`SemanticWorkspace.planTypeMoves()` 提供不依赖编辑器的类型安全移动计划：调用方传入旧 URI、新 URI 与由 Composer PSR-4 映射确定的新 namespace，组件会拒绝语法错误、目标声明冲突和无法唯一证明的声明，并返回 namespace、import、FQCN 及同 namespace 短名引用的文本编辑。文件移动完成后，`planTypeMoveReconciliation()` 使用移动前冻结的类型身份和受影响文件集合重新计算幂等编辑，以收敛并存的新旧 import。两项 API 都只生成计划，不读写或移动文件；调用方必须在应用前验证文档版本和文件操作前置条件。

唯一解析调用的 PHPDoc `callable(Service): Return` 契约可为无原生类型的 closure/arrow 参数提供上下文对象类型。位置与具名实参按外层签名精确映射；Callable 参数模板可从同一调用的其他已证明数组/集合实参唯一专门化。可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，会绑定 callable 返回模板，排除明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径，并把条件提前返回与最终返回合并为 Union，使 `array_map` 映射结果继续保留元素类型。成员补全、Definition 和参数诊断复用同一类型事实；重载歧义、未绑定或冲突模板、任一未知返回、函数体仍可落空、没有任何可证明返回、循环内嵌套/多层 `break` 与 `continue`、其它尚未建模控制结构内的 return、yield/goto、未解析类型、unpack、引用/variadic callback 及参数数量不符时保持 unknown。

普通 `if`、else 和可证明提前退出守卫会消费严格布尔字面量事实。`T|false !== false` 在直接变量、可见属性和安全 array shape 路径上保留 `T`，`bool !== false` 得到字面量 `true`；目标修改立即撤销事实。宽松相等和 mixed 的否定补集保持 unknown。PHPDoc `array{...}|false` 可逐分支验证为原生 `array|false` 的安全精化，根变量排除 false 后，安全 shape 元素继续提供成员与实参类型，逻辑已证明的短路右操作数及严格比较选择的三元 arm 同样生效；条件内后续按引用修改会撤销事实。

独立原生 `assert()` 可将正向与有限 Union 的否定 `instanceof`、严格非空、`!is_null`、正反已解析内建类型谓词、严格 `true`/`false` 字面量比较、`isset` 和 `array_key_exists` 应用到同一语句块的后续代码，精化参数以及断言前已有精确类型的局部变量，也覆盖直接属性与安全 array shape 路径。`T|false !== false` 保留 `T`，`bool !== false` 得到字面量 `true`；`!is_numeric` 仅排除 int/float，mixed 的否定字面量比较、宽松比较或无法表示的补集保持 unknown。单参数调用和静态字符串/`null` 描述的两参数调用受支持；动态描述保持 unknown。补全、Definition、成员链和参数诊断共用该事实；目标修改会撤销事实。

独立的 `/** @var Service $service */` 可在同一语句块内精化此前已有的局部变量。该事实不会跨入或跨出条件、循环及闭包语句块，并在赋值、直接修改、`unset`、引用绑定或已证明按引用调用后失效；普通按值调用不会无故清除类型。

紧邻局部赋值的显式 `@var Service $service` 被视为当前词法作用域内的开发者类型断言，可驱动成员补全、Definition、成员链与参数诊断。`@var array{service: Service} $data` 也能为安全字面量键提供成员补全与 Definition，并在数组偏移写入后失效。标签必须写出与赋值左值相同的变量名；下一次赋值会覆盖该事实，错名、无变量名、残缺或无法解析的类型保持 unknown。

Callable 模板推断可从 PHPDoc Union 参数的匹配分支绑定泛型，并沿完整泛型父接口替换实参。条件返回类型在实参省略时读取可静态表示的参数默认值；这使 `iterator_to_array($iterator)` 保留 `TKey`，而显式传入 `false` 时返回 `list<TValue>`。

Callable 级 `T of object` 可精化原生 object 参数，`class-string<T>` 可精化原生 string 返回；调用结果经过模板绑定后保留具体对象身份，供 class-string 参数兼容性与后续查询复用。

`phpDocTypeConflicts(uri)` 比较紧邻 `@param`、`@return`、`@var` 与对应原生运行时边界，只返回共享类型代数能够证明不兼容的类型范围。类级与 callable 级 `@template T of Bound` 会按作用域遮蔽并传递解析上界；无 bound 模板按 mixed 上界处理，循环或无法解析的 bound 保持 unknown。`int<min,max>` 只接受有序安全整数或开放边界，直接整数实参可精确判断，动态 int 保持 unknown。结构化 `array<K,V>` / `list<T>`、封闭 array shape、唯一解析的静态短数组类常量、层级完整且全部可见常量均可静态求值的 `Class::*`，以及已索引且 backing 匹配原生边界的 backed Enum，其 `key-of`/`value-of` 投影为数组键/值、list 的 int/T、shape 键/字段类型或精确标量值 Union；简单直接字面量可精确诊断，动态值、unit Enum 和不完整集合保持 unknown。合法收窄、未解析或不完整继承、条件等未支持类型和残缺 PHPDoc 保持空结果。PHPDoc/原生类型展开及静态数组投影各限制为 256 个节点，常量别名、继承/接口/Trait、成员、变量来源、iterable 泛型与泛型父类型等语义图递归限制为 64 层，模板替换结果限制为 8 KiB；局部 CST 搜索及 readonly/工厂前向流限制为 100,000 节点和 256 层，局部静态值合流限制为 16 层，并在超限时丢弃本轮不完整结果。相关文件或继承关系更新后查询直接使用新事实。

命名类到原生 `iterable` 的关系沿已声明父类和接口查找 `Traversable`、`Iterator`、`IteratorAggregate` 或 `Generator`；命名类到 `callable` 只接受原生 `Closure` 或真实公开非静态 `__invoke`。完整层级证明不具备契约时判定不兼容，外部或不完整层级保持 unknown。PHPDoc 冲突和参数兼容性共用该关系。

完整可证明的生成器函数或普通方法体可推导 `Generator<TKey, TValue, mixed, TReturn>`。支持直接 yield、int/string 显式键、静态数组及已声明泛型 iterable 的 yield-from；推导结果沿局部变量进入 foreach。嵌套 callable 的 yield 会被排除，任一相关表达式未知或递归时整项保持宽类型。

固定泛型 iterable 契约同样适用于不带模板实参的具体类，例如内建 `DatePeriod` 的 foreach 值会保持为 `DateTimeInterface`。构造函数 Signature Help 可展示同一类的多个已声明重载，并按位置参数、命名参数和已证明类型筛选最佳候选。

全局函数也可提供多个独立签名。编辑中的不完整调用保留仍可能成立的候选；完整调用按参数数量、名称和已证明类型绑定到具体声明，供返回传播与参数诊断复用。无法唯一绑定时保持 unknown。

PHPDoc `array<TKey,TValue>` 参数会作为结构化实参进入 callable 模板推断；已证明的内建调用结果可经局部变量和 foreach 继续传播键和值。显式 typed closure/arrow function 还能从 PHPDoc callable 的参数和返回位置绑定模板，供 `array_map` 一类 API 精确产生结果元素类型。数组参数传入唯一解析的按引用签名后会重新评估入口类型：pop/shift 与排序函数保留可证明的值域，push/unshift/splice 及其他可能替换值域的引用调用使后续元素类型回退为 unknown，避免产生过期成员结果。

PHPDoc 冲突检查会把 `positive-int` 等整数细化、`non-empty-string` 等字符串细化、`numeric`/`number`、`scalar`、`array-key`、`non-empty-array` 及 `integer`/`boolean`/`double`/`real` 别名投影为运行时上界。普通泛型兼容性也使用这些上界验证约束，同时保留已经推断出的具体类型。

PHP Companion 的编辑器无关语义查询组件。`declare(strict_types=1)` 文件中的直接标量字面量参数、return 和类型属性赋值会进入兼容性检查；弱类型文件的可强制转换标量不误报。显式 readonly 属性及 PHP 8.2 readonly class 的隐式只读属性只在可证明从声明家族外直接写入时报告；复合赋值、自增减、数组偏移写入、直接引用操作、唯一已解析签名的按引用参数及属性数组的 foreach 引用属于必然间接修改，在类内同样报告。`foreach ($this as &$value)` 仅在具体 readonly 属性已由当前控制流确定初始化时报告；同一语句块直接 `new`，或来自唯一可解析且通过直接 `return new` 或同块紧邻 `$local = new ...; return $local;`、顺序语句、条件分支、`throw` 终止、`try/catch`、各 arm 直接 `new` 的 `match`、含贯穿/default/局部普通 `break` 的 `switch`、保守可落空的 `while`/`do`/`for`/`foreach`（含循环内局部 `break`/`continue`），以及含普通透传语句或受支持控制流的 `finally` 证明全部可继续返回路径都返回同一具体的新构造类型且不会落空的函数、静态方法或实例方法工厂的局部对象，纳入当前作用域可见的提升 readonly 属性，以及索引内无提前退出的自有或实际继承构造器主体在全部正常出口初始化的 readonly 属性。子类有自有构造器时，仅在控制流证明全部正常出口前都调用了可见的 `parent::__construct()` 时合并父摘要；顶层调用和完整条件分支受支持，单臂条件保持未知。两者均聚合列出属性名，参数、返回已有对象、不同具体类型、可落空、含 `yield`、`goto`、`exit`、跨作用域跳转或其他未支持控制流的工厂、分支构造及未初始化状态保持静默。按值参数和普通 foreach 保持只读访问。构造器提升 readonly 属性在声明构造器主体内的再赋值、顺序重复赋值、全部可继续 `if/elseif/else` 分支、完整 `switch` 正常出口或 `try/catch` 正常出口初始化后的再赋值，以及进入循环前已确定初始化的循环体再赋值会报告；无提前出口且条件语法上恒真的 while/do-while/for，以及可证明前两轮成立且循环体不使用计数器的规范整数边界 `for`，还会验证必然第二次迭代。无直接 readonly 写入的 `finally` 可保留 try 合流事实；含直接写入且 try/catch 无提前退出时使用并传播正常出口合流，存在提前退出时回退到进入 try 前状态。缺少 default 的 switch、嵌套 continue 或多层 switch 跳转、单臂分支、普通条件或含提前出口循环产生的初始化、不可达语句和含 `goto` 的 callable 保持未知。外部 `unset` 报告，类内可能发生在初始化前的 `unset` 保持未知；readonly 对象属性所引用对象的内部修改不会被当作属性重写。Enum 原生 `name/value` 写入始终拒绝。当前 Alpha 对可静态证明的参数、`$this`、局部变量与完整成员链赋值、函数/工厂/成员返回、PHPDoc、类与方法模板、泛型 `IteratorAggregate` 继承链、PHPDoc 集合及外部属性事实的 `foreach` 值提供类型、函数、namespace 常量与成员查询，并支持可替换的字面量方法返回事实、单参数箭头函数/普通闭包的显式或唯一对象构造返回绑定、nullable/Union/嵌套泛型返回替换、有范围和赋值失效规则的控制流收窄、自动导入、Definition、Implementation、References、构造函数原生对象参数与继承关系查询、显式对象构造的未解析事实、严格块级 Extract Variable、支持已证明输入与末条简单赋值单一输出的实例语句 Extract Method、单次紧邻完整值使用的 Inline Variable、private 未使用参数及调用点同步删除，以及唯一平坦调用的必填参数和未知命名参数事实。未知、歧义或超出支持范围时返回空结果，不猜测。

`class-string<T>` 使用共享类型代数：已解析的 `SomeClass::class` 会按完整索引继承关系检查 PHPDoc 参数 bound；子类可赋值，无关类报告不兼容，普通字符串和动态字符串保持未知。

类级 PHPDoc `@property`、`@property-read`、`@property-write` 与 `@method` 作为有来源范围的合成公开成员参与补全、签名、链式返回和 Definition，真实 PHP 声明同名时优先。只读属性允许读取但所有写入均报告；只写属性按独立写入类型检查赋值，却不产生可读返回链；成对读写标签合并并保留不同类型。动态名称和未声明成员保持 unknown。

PHPStan/Psalm 条件返回类型支持参数或模板主题的 `is` / `is not`。唯一函数、静态方法和实例方法只有在调用形状及全部已声明实参兼容后才求值；未被提前读取、重赋值或按引用传递的 PHPDoc Callable 参数也按其位置或具名实参求值条件返回。字面量布尔实参和完整对象层级可选择确定分支，模板先执行现有 bound 校验与替换，无法确定的条件合并两侧返回 Union。嵌套条件会把同一参数的布尔或有限 Union 分支约束传入内层；位置或具名映射证明不同形参绑定同一个直接变量实参时也共享约束，从而排除逻辑上不可能的返回类型。不同变量、复杂表达式和父类型可能落入目标子类的场景保持 unknown。结果沿局部赋值进入成员补全、导航和参数诊断；分支类型无法解析、目标层级不完整、Callable 绑定不稳定或调用不唯一时保持 unknown。

唯一具名函数或唯一解析方法的无条件及 `@phpstan-assert-if-true/false` / `@psalm-assert-if-true/false` 可将对应的已声明非引用参数收窄到已索引对象类型。直接 `$parameter->property` 正类型断言可用于逐级可见的单/多层属性直接成员链和局部读取赋值；方法 `$this->property` 正断言可映射到直接非 nullsafe 变量接收者，并可在类内使用可见属性；任一祖先属性写入、根变量重赋值、链上方法调用或把根对象传入函数后事实失效。断言中的 Callable 模板可从 `class-string<T>` 等已支持参数结构和位置/具名实参推断；只有绑定结果唯一、模板 bound 及全部实参兼容时才专门化参数或属性断言类型，包括属性 `!T` 减法。`!null` 可从参数或逐级可见属性路径的单一 nullable 对象移除 null；`!Type`、`!false`、`!true`、基础类型、泛型、交集和否定 Union 可从有限 Union 中减去已证明匹配的类型，并且只在剩余唯一对象类型时暴露成员。泛型排除复用声明的协变、逆变、不变关系和泛型父类型替换，并保留唯一剩余泛型的实参供后续成员链专门化；唯一剩余交集以完整组合成员组进入补全和导航。无条件断言在独立调用正常返回后生效；条件断言在直接 `if`、`while` 或有条件 `for` 的 truthy/falsy 循环体、整个条件结果能逻辑推出调用结果的合取真分支/析取假分支，`while`、有条件 `for`、`do…while` 及普通条件中 `&&` 左侧为真或 `||` 左侧为假后必然求值的右操作数，以及无 goto 且主分支/elseif/else 的直接 return/throw/exit、完整嵌套 `if/elseif/else`，或 finally 必然终止/try 与全部 catch 均终止的 `try/catch/finally`，或含 default 且每个入口沿贯穿路径均终止的 `switch`，或首轮必然终止的 `do` 及无退出跳转的恒真 `while/for` 结果使所有可继续路径一致证明同一条件真值的同一语句块内生效。循环体内后续修改立即失效，循环出口和 `do…while` 首轮主体不继承尾部条件事实。实例/静态方法、位置或具名直接变量、嵌套括号、否定条件和普通 else 受支持。不完整分支、不可见属性或无法唯一化的否定属性断言，歧义或越界模板、无法唯一化或关系不完整、无法推出单次调用结果的复合分支、分支外、动态或重复函数或方法、unpack、引用参数、未支持控制流及后续可能修改保持未知。

PHPDoc `list<T>` 与 `non-empty-list<T>` 参数会检查扁平标量数组字面量的元素 Union 和非空状态；静态关联键可证明不是 list；动态键、嵌套值、变量及无法安全解析的字面量保持未知。

PHPDoc array shape 参数支持静态关联数组字面量的必填键、可选键和字段类型检查，并递归处理嵌套 shape、list、nullable 与 Union；动态键、调用结果、展开和混合键保持未知。

参数检查还会沿同一语句块传播局部静态标量、数组、对象构造、唯一调用及已证明 Callable 调用结果，允许跨过不读取目标变量的纯字面量 echo 或独立静态字面量赋值。函数调用副作用、引用、控制流、动态覆盖、变量转抄和跨块来源保持未知；既有对象成员流使用其独立的完整层级规则。

空合并表达式按 CST 中精确的 `binary_expression` 求值：结果为左侧去除 `null` 后的分支与可达右侧类型的 Union。左侧已确定非空时直接保留左侧并跳过右侧推断；左侧可能为空而右侧无法证明时保持 unknown。`false`、`0` 和空字符串不会被删除，nullsafe 调用、括号和右结合嵌套可经同块局部赋值进入补全、Definition 与参数诊断。

完整普通三元表达式按 CST 的 condition、body 与 alternative 字段求值：条件未知时要求两个 arm 都可证明并合并为 Union，字面量 `true` 或 `false` 只求值可达 arm。任一可达 arm 未知及没有 body 的 Elvis 形式保持 unknown；确定结果可经同块局部赋值进入补全、Definition 与参数诊断。

PHP 8 `match` 结果类型只在 CST 中存在唯一 default、arm 数量不超过 64 且每个值结果表达式均可证明时合并，`throw` arm 作为 `never` 排除。多个条件指向同一结果不影响合并；缺少 default、unknown 值结果或超预算时保持 unknown，完整结果可经同块局部赋值进入补全、Definition 与参数诊断。

同块局部数组支持确定性的 `$list[] = value` 追加和 `$shape['key'] = value` 新增/覆盖；value 可以是静态值、未重赋值的已声明参数或已证明同块局部值。空数组追加后成为 non-empty-list，多次追加合并元素 Union，shape 覆盖使用最新字段类型；空 list 或既有 list 的索引 0 写入也安全更新元素 Union。mixed/未知值、其他数值键、list/shape 混合更新、引用、调用副作用和未支持控制流保持未知。

直接作为实参的多步对象属性/方法链会逐级解析唯一可见成员、对象返回和 nullsafe 状态，并校验位置实参数量；最终对象、标量、nullable、Union、list/shape 或 generic 类型进入参数兼容性检查。Union/Intersection/DNF 接收者复用分组模型，每个运行时分支必须提供同签名成员并解析到同一规范中间/最终类型。由直接字符串或未触碰局部字符串决定的动态方法，在重载、参数及模板均唯一兼容时也可把返回传播到局部赋值和后续成员链。无法证明的动态名称、规范返回分歧、错误或展开参数、中间非对象及不完整层级保持未知。

同一外层基本块中的完整 `if/elseif/else` 会合并局部静态标量、数组、构造与已证明调用结果；每个可继续分支必须明确赋值，嵌套完整条件可递归合并，结果使用 Union。缺少 else、任一分支未赋值、提前退出、未知调用/引用、合流后副作用或跨块使用保持未知。

同一外层基本块中的完整 `switch` 会从每个 case/default 入口追踪普通 `break`、贯穿和嵌套完整 `if`/`switch`，并把所有正常出口的确定性局部赋值合并为 Union。缺少 default、任一入口可能未赋值、带层级的 break、提前退出、未知副作用或合流后副作用保持未知。

完整 `try/catch/finally` 会合并 try 与每个 catch 的确定性局部赋值，并让确定赋值的 finally 覆盖此前路径；finally 只有安全语句时保留合流结果。未赋值 catch、提前退出、未知副作用或不安全 finally 保持未知。

`do…while` 因至少执行一次，可传播循环体的确定性局部赋值，并复用完整条件、switch 与 try/catch/finally 合流；循环体末尾普通 `break` 视为确定单轮。规范整数常量初始化、同计数器比较与单步增减的 `for` 在首次条件为真时也会传播，`while (true)` 与 `for (;;)` 的末尾普通 break 支持确定单轮。调用条件、复杂跳转、未知副作用、可能零次执行的普通 while/foreach 及首次条件为假的 for 不向循环后传播新值。

`foreach` 的 iterable 在可证明为 non-empty-list、non-empty-array、含必填字段 shape 或对应的静态/同块局部值时，会传播循环体每轮确定赋予的局部值，并支持末尾普通 break。普通 list/array、空 shape、动态 iterable、continue 和未知副作用保持 unknown。

PHPDoc Callable 参数会与具有完整显式参数/返回类型的闭包或箭头函数实参比较，遵循参数逆变和返回协变；缺失类型、复杂默认值和动态 callable 保持未知。

PHPDoc 泛型参数转发会读取声明类型的逐参数方差；协变、逆变与不变关系统一由 type-system 计算。`@extends` / `@implements` 会沿完整继承链逐层替换模板参数，支持参数重排；缺少模板参数、类型声明或完整继承事实时保持未知。持久语义快照 schema 为 23，旧快照会重建。

唯一可解析函数或普通实例/静态方法调用的完整返回类型，只有在必填/具名/variadic 调用形状有效且每个有类型实参可证明兼容时才进入参数兼容性检查，包括对象、Union 和 PHPDoc 泛型；直接静态数组及一次直接赋值后未触碰的同作用域局部静态数组可按整数位置键或合法字符串参数名展开；同块从静态数组开始、只以 `[]` 或下一个连续整数键写入且调用前未读取的局部数组，也可保留每一项的来源和类型并展开为位置实参。未触碰的非引用参数还可按封闭、全必填、纯合法字符串键 PHPDoc shape 展开为具名实参。无类型或 `mixed` 参数允许动态值，标量遵循调用文件 strict/weak 规则。方法的 `self`/`parent` 按声明类绑定，`static` 按实际调用类绑定；nullsafe 调用在接收者可能为空时保留 null 分支。重复声明、宽泛/可选参数 shape、已使用的参数数组、稀疏或动态键、无法证明的修改、无效调用、动态调用、`mixed`/`void` 返回和无法解析的接收者保持未知。

函数和普通方法的 Callable 级 PHPDoc 模板可从位置、具名和 variadic 实参推断，并在解析调用返回前替换；直接、一次未触碰局部静态数组、线性构造的连续位置数组、确定性字符串键写入构造的封闭局部 shape 或上述封闭具名参数 shape 展开会先转换为同一逻辑实参序列。当前精准子集覆盖直接 `T`、nullable、`T[]`、`list<T>` / `array<K,V>`、`class-string<T>`、shape 字段、同基泛型参数，以及完成 `@extends` / `@implements` 参数替换和重排后的直接或传递父泛型；受支持结构任意层级的 Union 实参会逐分支保留完整模板绑定组合，分别复核约束和专门化参数，再把相关的专门化返回组成 Union；因此协变、不变及多个模板同时变化都不会被展平成模板笛卡尔积。全部 `of` 约束、多处绑定一致性、必填参数和调用形状必须可证明。宽泛/可选参数 shape、已使用的参数数组、稀疏或动态键、无法证明的修改、超过 64 个绑定组合、Union 分支结构/模板集合不一致、继承路径歧义、冲突绑定和越界实参保持 unknown。

未按引用且调用前没有其他使用或重赋值的 PHPDoc Callable 参数，只有在实参数量、名称和每个可证明实参类型都满足必填、可选及 variadic 声明时才会提供完整返回类型。位置实参、具名参数、variadic 收集的额外具名参数、只含静态位置键或合法字符串参数名的直接数组展开、一次直接静态数组局部赋值后的未触碰变量展开、静态基数组上连续 `[]`/整数键写入构造的未读取局部位置数组、未触碰非引用参数的封闭全必填具名 shape 展开，以及同作用域一次直接 `$alias = $parameter` 后未再使用/重赋值的别名调用均受支持；类型检查复用继承、泛型方差及调用文件的 strict/weak 标量规则，声明为 `mixed` 的参数接受动态值。重复名称、没有 variadic 接收的未知名称、命名后位置实参、类型不兼容或无法证明的非 mixed 实参、宽泛/可选参数 shape、已使用参数数组、稀疏或动态键数组、数量不符、多层/条件别名、已使用源参数、`mixed`/`void` 返回或无 PHPDoc 签名的动态 callable 保持未知。

普通参数可从声明、作用域引用或唯一解析命名实参发起 Rename。非 private 方法按参数位置遍历完整接口、父类和重写实现族，分别收集每个方法作用域中的声明、使用和紧邻 PHPDoc 的标准/PHPStan/Psalm `@param`，并按该实现原来的参数名更新唯一解析的命名实参。提升属性构造命名实参转入参数/属性同一身份路径。任何关联层级不完整、可能相关的动态同名调用、闭包捕获或名称冲突都会使结果为空。

唯一具名函数可从声明或直接解析调用点 Rename，覆盖定义、导入路径及普通/全限定调用。显式 import alias 保持稳定，从 alias 调用点不会发起全局函数 Rename。

唯一命名空间常量支持声明或直接使用点 Rename，覆盖声明、`use const` 路径及普通/全限定使用，显式 alias 保持稳定。类与 Trait 常量支持声明或已解析静态访问发起，覆盖 `self::`、宿主和继承访问中仍解析到同一声明的引用。Enum case 以大小写敏感身份从声明或精确静态访问发起 Rename，不会修改大小写不同的 sibling；unit/backed Enum 合成准确的 `cases()`、`from()`/`tryFrom()`、只读 `name`/`value` 成员，`static` 工厂返回可继续直接成员链，`from()` 缺参、backing value 类型和 `tryFrom()` nullable 普通访问复用统一诊断，并按调用文件 strict/weak 模式处理标量。动态访问、`constant()`/`ReflectionEnum::getCase()` 等字符串查找、多 Trait 同名来源、层级不完整或名称冲突返回空。

public/protected 方法名 Rename 同样要求完整接口、父类和重写实现族，从声明或唯一解析调用点统一修改族内声明、已解析直接调用及 `parent/self/static` 调用。Trait 源方法同步 Trait 内调用、已证明的宿主/子类调用及具名 alias 的源方法，alias 名保持不变；alias 可从 adaptation 或唯一解析调用点独立 Rename，仅修改 alias 声明和精确调用。多个 Trait 同名方法由完整 `insteadof` 规则收敛到唯一 winner 时，winner Rename 同步 precedence 的方法 token，被排除 Trait Rename 保留该 token。无唯一 winner、层级名称冲突、动态调用、数组/字符串 callable、复合类型候选无法由同一计划覆盖或不完整层级会返回空。无法解析的普通接收者和工作区外调用不进入编辑。

public/protected 非提升属性 Rename 要求完整类层级，可从声明或唯一解析访问点发起，统一修改相关重复声明及已解析实例/静态访问。Trait 属性同步 Trait 内及已证明的宿主/子类访问。层级或宿主名称冲突、多 Trait 同名来源、提升或 private 同名属性、动态属性访问及不完整层级会返回空；反射、字符串和工作区外访问不进入编辑。

提升属性 Rename 将属性与构造参数视为同一身份，统一修改参数声明和作用域使用、紧邻标准/PHPStan/Psalm `@param`、直接或继承构造的已解析命名实参及属性访问。参数/属性冲突、闭包捕获、重复属性、Trait、动态访问或不完整层级会返回空。

原生对象 Union、Intersection 和 DNF 参数使用分支感知的成员模型：Intersection 汇总各约束的成员；Union/DNF 只返回所有运行时备选分支中名称、种类、静态性、参数和返回类型完全一致的成员。共同成员可继续返回链推断，Definition 保留所有分支声明。成员不存在诊断检查每个完整运行时备选分支；nullable 诊断还要求每个分支都存在该成员。签名冲突、非对象分支、未知层级、重赋值和不能安全应用的收窄保持未知。

多类型 catch 变量在对应 catch body 内使用相同的 Union 规则；离开 body 后不保留类型事实。

原生复合参数通过 `$copy = $source` 形成的直接局部别名保留分支和 nullable 信息；循环别名、未知来源或之后无法证明的重赋值不产生结果。

唯一可解析函数的原生对象复合返回类型可通过直接赋值进入同一模型；函数歧义、标量分支和不完整类型层级保持未知。

完整原生对象复合方法返回可继续成员链。复合接收者上的共同方法还必须在所有声明中解析为相同规范分支；相同短类型文本若因 namespace 指向不同类型，会停止推断。nullable 接收者经 `?->` 继续保留 nullable 状态。

实例方法、静态方法和复合接收者共同方法的完整原生复合返回经直接局部赋值后继续保留分支。带回调模板或字面量特化的复合接收者调用在无法证明统一替换时保持未知。


动态成员查询会静态折叠括号和纯字符串点拼接，并以同一证明驱动导航、调用返回传播和 Rename。唯一全局/类常量、常量别名链和 string backed Enum `->value` 也可提供名称及可编辑字面量来源；循环引用安全终止。Enum `->name` 只参与查询，没有独立字符串来源时关闭成员 Rename。其他复杂动态表达式作为 unknown 覆盖阻止可能不完整的成员重构，不据此产生缺失成员、静态性或可见性诊断。

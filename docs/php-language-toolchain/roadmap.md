# 开发步骤与阶段交付

计划已进入实施阶段。本文件是长期工程任务目录；逐项事实和验证证据以 [实施状态](status.md) 为准。核心依赖顺序为 P0 → P1 → P2 → P3 → P4，后续 P5–P8 按场景逐项交付；测试、性能测量和文档同步贯穿全程。格式化集成可在 P1 后先完成，但最终仍须参加 P9 验收。

每阶段提交可运行产物、测试结果、已知限制和下一阶段依赖。阶段完成标记必须链接实际证据。

## P0：规格、基线与验收设施

- [ ] 保存当前功能回归基线，审计现有 parser/index 的可复用范围。
- [x] 建立 PHP 7.2–8.5 按次版本划分的语法、推断、诊断、重构支持矩阵；未实现项保持显式标注。
- [ ] 将验收文档中的场景落实为编号 fixtures，包含合法反例和未完成输入。
- [ ] 固定数据契约、包依赖检查、缓存版本、ADR 和模式迁移方案。
- [ ] 固定基准机器、公开合成项目、真实项目脱敏副本和测量脚本；确定性生成器、脚本和 Linux x64 1k/10k/50k 报告已完成，其他平台及脱敏真实项目待测。

产物：规格矩阵、fixtures/testkit 雏形、架构决策、基准清单。退出条件：每项最终目标可追踪到测试类别，既有工作流具备回归证据。

## P1：组件提取与 LSP 闭环

- [x] 建立 workspace 包、按依赖构建和打包资源检查。
- [x] 建立公开 exports、声明输出、依赖边界与 Changesets；当前十六个组件执行 packaging.md 的仓库外 tarball 消费验收。
- [x] 提取 parser、project、版本规则，保留旧 API 兼容门面。
- [x] 实现 initialize/shutdown、文档同步、取消、重启、日志与进度；请求取消、快速编辑版本保护、标准索引进度、有限重启策略和真实进程异常退出恢复均有协议或 Extension Host 证据。
- [x] 实现快照和 UTF-16/字节映射、CRLF、Unicode、Remote URI；远程索引、Definition 与文件失效保持 `vscode-remote` URI，缓存跨 URI 模式时安全重建。
- [x] 建立独立预览模式，交付文档符号和基础语法诊断。

产物：可安装预览 VSIX。退出条件：无 Intelephense 的真实 Extension Host 可用；快速输入不返回过期诊断；原有工作流回归通过。

## P2：语法和 PHPDoc 模型

- [ ] 函数/方法/属性/常量/参数/变量、namespace、全部 use 类别及作用域。
- [ ] 继承、接口、Trait alias/insteadof、匿名类、闭包、箭头函数、枚举和 Attribute。
- [ ] 混合 PHP/HTML 区域、错误恢复、增量 Tree 编辑与无损编辑范围。
- [ ] PHP 8.4/8.5 新语法逐项审计，旧版本语法边界按矩阵验证；7.3–8.5 每个次版本已有自动边界样例，PHP 8.0 `mixed`/`static` 返回类型与 PHP 8.2 `true`/独立 `false`/独立 `null` 已补齐；8.4 property hooks 的 backed/virtual、hook 作用域、读写能力、setter 类型、非对称写可见性、抽象/接口契约、读协变/写逆变、独立 hook 继承、final 属性/final hook，以及由 `&get` 控制的数组下标修改、直接引用、唯一按引用调用和属性/对象引用遍历已进入语义，动态或歧义引用目标保持 unknown；8.4 `#[Deprecated]` 的函数、方法、构造器、闭包、箭头函数、类常量、Enum case 与 Property Hook 使用/目标诊断，以及 8.5 Trait/全局常量扩展、非法目标拒绝和延迟目标验证已进入语义；8.5 pipe 的可证明单参数 callable 链、clone-with 的简单可验证属性更新、final 提升属性、静态属性非对称可见性、常量表达式 Closure/first-class callable、属性 `#[Override]`，以及 `#[NoDiscard]`/`(void)` 的调用、返回约束、完整目标与延迟验证契约已完成，其余项目继续逐项补齐。
- [ ] 独立 PHPDoc AST，区分类型表达式、参数名和普通说明文本。

产物：稳定 parser/phpdoc API 和语法版本报告。退出条件：局部错误不污染整文件，未完成成员/调用表达式仍可查询上下文；各目标版本的支持项与拒绝项有证据。

**内部技术节点：P0–P2 完成后形成语法链路，但产品首发还须完成 R1 必需能力；无需等待全部长期阶段。**

## P3：项目、内建符号与持久索引

- [x] PSR-4、PSR-0、classmap、files、exclude-from-classmap、autoload-dev。
- [x] vendor、path repository、symlink、多根和嵌套 Composer 项目。
- [ ] 目标 PHP 版本与扩展签名选择；首个精准子集已按 workspace folder/嵌套 Composer 根配置、Composer `config.platform` / lock 中显式为 `false` 的 `ext-*`，以及与目标次版本一致的实际 PHP CLI 已加载扩展，选择 DOM、Filter、mbstring、PDO、SimpleXML、XML Parser、XMLReader 与 XMLWriter。配置、Composer 与成功探测的运行时变化会刷新内建符号；探测失败或版本不匹配保持 unknown，未声明 `require.ext-*` 不推断为缺失。标准 Strings 103 项 callable union、完整 mbstring 目录、libxml、SimpleXML、XML Parser、XMLReader、XMLWriter、经典 DOM 与 PHP 8.4–8.5 现代 `Dom\` 目录、SPL 15 项函数、`SplFileInfo`/`SplFileObject`/`SplTempFileObject`、四种 SPL 目录迭代器、完整泛型 `ArrayObject`/`ArrayIterator`、`SplObjectStorage`/`SplFixedArray`、`SplDoublyLinkedList`/`SplQueue`/`SplStack`、`SplHeap`/`SplMinHeap`/`SplMaxHeap`/`SplPriorityQueue`、十七种 SPL 适配/高级迭代器（含递归遍历、缓存、Regex 与 Tree）、`SplObserver`/`SplSubject`、标准异常树、Date/Time、JSON、序列化/编码/URL、文件/路径/流及元数据/权限/链接、Directory、Program Execution、PDO/PDOStatement、支持具体实例返回的泛型 Reflection 高频核心、Password Hashing、Hash/HMAC、安全随机数、Filter、PCRE 主 API与稳定常量、核心 Math 全函数与稳定常量、Variable Handling、Function Handling、Session Handling、Network 可调用目录与核心类型，以及 PHP Options/Info 的运行时符号/扩展自省、配置、环境、资源/进程、GC、CLI 与输出目录、Error Handling、Output Control 函数/常量目录、高频泛型数组函数、迭代函数、类与对象检查函数、迭代/集合契约、Closure、泛型 Generator、WeakReference/WeakMap、Stringable 与 Enum 接口已按 PHP 7.2–8.5 生成并记录官方来源；其余核心/扩展目录、启用扩展的版本约束及 Remote/容器完整环境矩阵仍待完成。
- [x] 声明与方法体分层索引，引用倒排表、派生依赖和持久缓存；更新契约区分 declaration/implementation/none，返回具体 callable/type 身份，并按变化范围失效构造器与工厂摘要。语言服务器只在声明变化时重建 Doctrine/Symfony 声明事实。schema 75 把声明/签名、文件级实现、每个唯一函数/方法/Property Hook 的实现、引用候选、变量调用与类型依赖拆为规范记录，v47 分别校验源码、声明、文件实现、每条 callable 实现、派生层和框架载荷；热缓存命中先注册声明表，类型/函数/常量/符号目录不装载正文。成员补全、Definition、Type Definition、Signature Help 与区间 Inlay Hint 只水合目标 callable 和文件级事实；已恢复的正向 Callable 依赖事实可直接复用，未限定范围或无法证明依赖闭包时自动装载完整文件。反向依赖图随文件更新、删除和恢复原子替换，传递失效构造器摘要。Symfony 外部来源及已消费正向 Callable 构造事实使用独立有界缓存。类型、全局函数、全局常量及静态成员 References/Rename 先缩小文件集合再执行精确语义解析；超限文档保守回退。负向、递归、歧义及动态结论不持久化。
- [x] 文件增删改移、未保存覆盖、Composer 更新和缓存损坏恢复；真实 stdio 生命周期覆盖创建/删除/移动、磁盘 change 不覆盖打开缓冲区、关闭后恢复磁盘事实，以及 Composer platform 与 autoload 映射刷新。索引 JSON 损坏和单条 restore adapter 拒绝均回退源码重建。
- [x] 索引完整性、资源上限、取消与进度可观察；项目文件数/总字节超限拒绝完整发布，单文件超限或读取/分析失败明确关闭 `projectComplete`，依赖截断只关闭全量 `complete`，两者均有稳定警告。未完整索引不发布未解析符号诊断；目录发现和逐文件处理消费取消信号，LSP work-done progress 发布 begin/report/end。

产物：项目查询与缓存服务。退出条件：vendor 定义可查，多项目不串数据；热启动复用缓存；局部函数体编辑不全量重建；受限索引不产生伪“未定义”。

## P4：基础类型与独立编码 Alpha

- [x] 基础类型代数、Union/Intersection、字面量、null/void/never、mixed/unknown；独立 `@php-companion/type-system` 还统一提供 named、整数区间、array/list/shape、泛型、class-string、Callable、Nullable 与 DNF，使用 `yes | no | unknown` 三态关系和有界递归。Union 扁平化、去重、吸收 never/mixed，Intersection 与 DNF 使用规范顺序；继承信息或预算不足保持 unknown。
- [ ] 名称绑定、成员查找、继承、可见性、静态性、self/parent/static；源码类名已区分 namespace 相对解析、显式 import 与 `\\FQCN`，未限定或相对限定类名不会像函数/常量一样错误回退到全局声明。unit/backed Enum 的 `cases()`、`from()`/`tryFrom()`、只读 `name`/`value`、caller-sensitive backing 参数检查和 `static` 返回链，PHP 8.2 readonly class 的普通/提升实例属性，标准异常树，以及 Date/Time、核心迭代/集合/Closure/Generator/Weak/自动接口契约已进入共享成员模型；PHP 8.1 Fiber/ReflectionFiber 和 PHP 8.2 敏感参数对象已按版本进入同一成员、签名、返回传播与导航路径。DatePeriod 构造重载和固定 foreach 值契约具备真实编辑请求覆盖，其余内建类型继续按 language-spec 补齐。
- [ ] 原生签名、赋值/调用/链式调用传播、基础数组与闭包类型；全局函数多重载已进入 Signature Help，完整调用可按位置/命名参数和已证明类型绑定具体声明，供返回传播和参数诊断使用。PHP 8.1 first-class callable 的直接函数、静态/实例方法及最多八层未修改局部别名可复用唯一目标签名，变量调用提供 Signature Help、缺参/错参诊断，并按位置、具名和泛型实参传播返回；未触碰的 PHPDoc `callable(...)` 参数及一次直接局部别名，以及紧邻非控制流局部赋值且首次直接使用的 `@var callable(...)`，也会显示参数名、可选/variadic 契约与返回类型，并对直接变量调用发布缺参和已证明错参诊断，返回传播继续支持条件类型。动态、提前使用、介入读取、重赋值、引用逃逸、歧义和超预算保持 unknown。PHPDoc 泛型数组参数现可经高频内建调用、局部变量和 foreach 保留键值类型，typed callback 可绑定输入和返回模板；成员 Signature Help 保留接收者的类模板实参，嵌套泛型对象及继承 `static|null` 返回会在局部赋值和非空收窄后保留实际调用类模板，`ArrayObject`/`ArrayIterator`、十七种 SPL 迭代器（Regex/Tree 保留转换安全 Union）、`SplObjectStorage`/`SplFixedArray`、`SplDoublyLinkedList`/`SplQueue`/`SplStack` 与 SPL heap/priority queue 的数组、迭代器、offset/current/info、队列、栈和提取返回可继续传播具体模板实参，静态 `fromArray([new T()])` 可从无键对象数组字面量反推工厂模板；可变 priority extract mode 保留 data/priority/both 安全 Union。PHP 7.3 key endpoints、PHP 8.4 find/predicate 回调和 PHP 8.5 value endpoints 已按版本接入，合法省略尾部参数的用户闭包可作为双参数数组回调。
- [x] 补全、Hover、Signature Help、Definition、Implementation、文档/工作区符号、基础 References。
- [x] 类型、函数与命名空间常量的自动导入候选和补全排序共用语义查询；类型保持已可见候选优先，函数/常量依次优先当前 namespace、显式 import 和 PHP 全局回退，外部候选按共同 namespace 前缀与距离排序，名称/FQCN 确定性决胜，LSP 以分类 `sortText` 保持顺序并附加统一 import 编辑。`namespace\\Symbol`、相对限定名称、namespace alias 及大小写敏感常量身份已按 PHP 运行时规则进入同一查询和导航路径。

产物：独立 Alpha。退出条件：禁用其他 PHP LS 后可在具有明确类型声明的项目中连续编码；未知类型不猜测；所有功能消费同一语义核心。

## P5：控制流与高级类型

全局内建类型谓词的正向直接条件、确定 `&&` 子条件及循环主体已能按范围收窄参数 Union/mixed 和直接可证明的局部副本；`!is_*` 真分支、elseif/else 条件链、提前终止后的继续路径及确定为假的 `||` 两侧可从有限 Union 排除已证明成员，多项事实按同一范围连续应用，局部重赋值会使旧事实失效。调用必须解析到真实全局内建函数，命名空间 shadow 不生效，无法表示的 mixed 补集保持 unknown。属性路径、无法唯一表示的对象补集及更一般的跨块相关性仍属于后续精确控制流范围。

Generator 精准子集已从完整可证明的函数/普通方法体推导直接 yield、显式标量键、静态数组或已声明泛型 iterable 的 yield from 及 return 类型，结果进入签名、局部赋值和 foreach 值类型；未知或递归路径整体保持宽类型。`TSend` 反推、yield-from 返回值及动态迭代器仍属于 P5c 后续范围。

泛型 iterable 的精准子集已能沿完整且唯一的 `Iterator`、`IteratorAggregate` 或 `Traversable` 父级投影键值类型。嵌套 array/list/shape 值可经 foreach 变量、字面量键与非空守卫进入补全和导航；父级投影冲突或层级不完整时保持 unknown。

- [ ] P5a：条件分支、instanceof、空值、提前返回、循环、异常路径及合流；严格/宽松 null 不等路径、null 相等条件的反向路径、正向 instanceof 及有限 Union 的反向 instanceof 已统一进入参数、安全局部副本、直接可见属性路径和最多 16 层安全字面量数组键路径的实参诊断，对象事实同时驱动成员补全与 Definition。`isset` 支持直接变量、静态非 nullsafe 属性路径，以及可证明 array shape 或 typed array 的安全字符串/整数文字键路径；多参数真路径逐项移除 null，否定提前退出后的继续路径同样生效，false 路径不猜测 null-only。`array_key_exists`/`key_exists` 真路径区分可选字段缺失与显式 null，并覆盖嵌套安全数组集合、命名空间遮蔽和修改失效；false 路径不猜测键缺失后的读取类型。`is_a($value, Type::class)` 在 `allow_string` 省略或为 false 时支持对象正向精化与有限 Union 反向排除，保留所有已声明子类的精确身份并在反向路径排除目标及已知子类；`is_subclass_of($value, Type::class, false)` 使用排除目标类型自身的严格子类型关系，并支持有限 Union 正反路径。多子类真路径在参数、直接属性和安全 array shape 路径上进入公共成员补全和多目标 Definition。两者的命名参数、提前终止守卫、属性和数组路径进入相同消费链；动态 class 和 string-enabled 调用保持 unknown。`is_callable` 只在 `syntax_only` 省略或为 false 时产生运行时 callable 事实，true 或动态语法检查保持 unknown。`is_object` 能从对象/标量参数 Union 保留全部具体对象分支，使单类或公共成员补全和多目标 Definition 与诊断一致。`empty` 已证明为假的路径及直接 truthy 守卫在相同目标上移除 null；宽松 null 相等真路径、`empty` 真路径和直接 falsy 路径不把 PHP 的广义空值错误解释为 null。内建类型谓词同样覆盖这些属性与数组元素，正向谓词可精化 mixed 属性或元素，而无法表示的 mixed 补集保持 unknown；根对象、路径前缀或数组下标写入、链上方法调用、引用逃逸及传入已完成调用后撤销事实。严格 `===`/`!== true|false` 已覆盖普通分支、else 与可证明提前退出守卫中的参数、局部值、直接属性和安全 array shape 路径，`T|false` 精确保留 `T`，`bool !== false` 得到字面量 `true`；原生 `array|false` 可由 PHPDoc `array{...}|false` 安全精化，并在根变量排除 false 后把 shape 元素送入补全、Definition 与实参诊断，严格比较事实也传播到逻辑已证明的短路右操作数和三元表达式的确定 arm，并在条件内后续按引用修改时撤销；宽松相等和 mixed 的否定补集保持 unknown。独立原生 `assert()` 的正向及有限 Union 否定 instanceof、严格非空、`!is_null`、正反已解析内建谓词、严格 `true`/`false` 字面量比较、`isset` 与 `array_key_exists` 事实已覆盖同块参数、断言前已有精确类型的局部值、直接属性及安全 array shape 路径，并按目标修改失效；`T|false !== false` 保留 `T`，`bool !== false` 得到字面量 `true`，严格相等可把 mixed 收窄为对应字面量。`!is_numeric` 只排除 int/float 并保留 string；mixed 的否定字面量比较、宽松比较或无法表示的补集保持 unknown。单参数及第二参数为静态字符串或 `null` 的位置/命名参数形式（包括命名换序）受支持，嵌套调用、动态描述、参数展开和不确定析取保持 unknown。动态成员、nullsafe 路径、变量数组键、数组与属性混合路径、一般对象补集和更复杂合流仍待完成。
- [ ] P5b：泛型约束和继承替换、class-string、list、array shape、Callable；共享代数已实现受限/非受限 `class-string` 的继承协变与 string 拓宽，以及逐参数泛型协变/逆变/不变关系；PHPDoc parser 保留模板方差，semantic 对泛型参数变量转发应用声明方差，并沿完整 `@extends` / `@implements` 链完成直接、递归及参数重排的父泛型替换，再应用父类型方差；解析完成的类常量实参与 PHPDoc bound 已进入精准参数诊断；list/shape 参数诊断覆盖直接静态数组字面量及同块局部赋值，shape 递归处理嵌套 shape、list、nullable 与 Union；Callable 已对显式闭包/箭头函数签名执行参数逆变和返回协变检查，未触碰的 PHPDoc Callable 变量仅在位置/具名/variadic/直接或一次局部静态数组展开、静态基数组上连续 `[]`/整数键写入构造的未读取局部位置数组展开、确定性字符串键写入构造的封闭局部 shape 及封闭全必填具名参数 shape 展开同时满足数量、名称和逐项类型声明时把返回类型传入参数诊断，逐项校验复用继承、泛型方差、调用文件 strict/weak 标量及 `mixed` 规则；唯一函数和普通方法可从位置/具名/variadic、直接或一次未触碰局部静态数组展开、线性构造的连续局部位置数组展开、确定性字符串键写入构造的封闭局部 shape 展开、未触碰非引用参数的封闭全必填具名 shape 展开及直接、nullable、array/list、class-string、shape、同基泛型、完成参数替换与重排后的直接或传递父泛型实参推断 Callable 级模板，受支持结构任意层级的 Union 泛型实参逐分支保留完整绑定方案，分别复核 bound 与专门化参数后组成相关返回 Union，覆盖协变、不变及多模板同时变化；唯一函数、普通方法及完整多步对象成员链的调用结果仅在调用形状和逐项已声明实参兼容性可证明时进入参数诊断，普通调用同样支持直接或一次未触碰局部静态数组、线性构造的连续局部位置数组、确定性字符串键写入构造的封闭局部 shape 及封闭全必填具名参数 shape 展开，覆盖对象、标量、nullable、Union、PHPDoc 结构类型及 `self`/`parent`/`static` 绑定，Union/Intersection/DNF 接收者要求全部分支成员和规范返回一致；同块局部值已传播静态标量、数组、构造及上述调用结果，list 追加、字符串 shape 键及索引 0 写入可消费静态值、未重赋值的已声明参数和已证明局部值，完整 `if/elseif/else`、含 default 的完整 `switch` 与完整 `try/catch/finally` 可递归合并确定性分支赋值，switch 支持普通 `break` 和贯穿，finally 支持确定覆盖和安全透传，安全 `do…while`、规范非空整数 `for`、显式单轮循环及可证明非空 `foreach` 可传播必然迭代；一般 `while`、条件 `for` 与动态 `foreach` 在循环体赋值独立且完全可证明时会把循环前类型与循环体类型合并为 Union。mixed/调用结果数组值、稀疏或混合更新、宽泛/可选或数值键参数 shape 展开、已使用的局部数组、自依赖或循环体读取目标、引用、复杂跳转、无法证明的修改及复杂动态 callable，以及局部数组动态/稀疏键展开、超过 64 个参数或绑定组合、Union 不一致结构及歧义/不完整继承路径的模板反推仍待完成。
- [ ] P5c：模板推断、条件类型、断言、闭包上下文、Generator、引用与副作用；参数或模板主题的 PHPStan/Psalm `is` / `is not` 条件返回类型已在唯一函数、静态方法和实例方法调用中完成精准子集，布尔字面量及完整对象关系选择确定分支，模板复用现有推断/bound/实参校验，动态条件合并两侧 Union 并沿局部赋值进入补全与导航。未被提前读取、重赋值或按引用传递的 PHPDoc Callable 参数也支持按兼容的位置/具名实参求值条件返回，错误实参保持 unknown。PHPStan/Psalm 无条件及 truthy/falsy 对象断言已在唯一函数或唯一解析方法、独立调用、直接 `if` 条件、逻辑蕴含明确的合取真分支/析取假分支、短路求值已证明的右操作数、无 goto 且主分支/elseif/else 的直接 return/throw/exit、完整嵌套 `if/elseif/else`，或 finally 必然终止/try 与全部 catch 均终止的 `try/catch/finally`，或含 default 且每个入口沿贯穿路径均终止的 `switch`，或首轮必然终止的 `do` 及无退出跳转的恒真 `while/for` 结果使所有可继续路径一致证明条件真值的同块继续路径、位置/具名变量实参及已声明非引用参数的精准范围内完成，支持嵌套括号、否定条件和普通 else。直接 `$parameter->property` 正类型断言已覆盖逐级可见的单/多层属性链和局部读取，任一祖先属性写入或链上方法调用会使事实失效；方法 `$this->property` 正断言已覆盖直接非 nullsafe 变量接收者和类内可见属性，并在属性/根对象可能修改时失效。Callable 模板断言已覆盖由 `class-string<T>` 等已支持参数结构唯一推断、验证 bound 和全部实参后专门化参数、`$parameter->path`、方法 `$this->path` 及属性 `!T` 的场景；`!null` 已覆盖参数或逐级可见属性路径的单一 nullable 对象，`!Type`、`!false`、`!true`、基础类型、泛型、交集及否定 Union 已覆盖有限 Union 减去已证明匹配类型后唯一化的场景，泛型排除复用协变、逆变、不变和父类型替换并保留剩余实参。不完整嵌套、try/catch/finally、switch 或动态循环分支、不可见属性、无法唯一化的否定属性、歧义/越界模板、无法唯一化或关系不完整、无法推出单次调用结果的复合分支、分支外、动态或重复函数/方法目标、unpack、未支持控制流和后续可能修改被明确抑制。嵌套条件已能关联同一参数的布尔与有限 Union 分支，并在位置或具名映射证明不同形参绑定同一直接变量时关联跨参数分支，普通调用与未触碰 PHPDoc Callable 均覆盖；`while` 和有条件 `for` 的 truthy/falsy 主体，以及 `while`、有条件 `for` 与 `do…while` 的条件短路右操作数已支持，并在修改或循环出口失效。唯一解析调用的 PHPDoc `callable(Service): Return` 现在还能为无原生类型的 closure/arrow 参数提供上下文对象类型，并通过精确位置或具名参数映射进入补全、Definition 与参数诊断；Callable 参数模板可从同一调用的其他已证明数组/集合实参唯一专门化，覆盖 `array_map(fn($item) => …, $items)` 的 callable/null 内建重载筛选；可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，还能绑定 callable 返回模板，排除明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径，并把条件提前返回与最终返回合并为 Union，使映射结果元素继续进入补全、多目标 Definition 和参数诊断。返回遍历限制为 64 个节点并服从共享控制流深度预算；用户重载歧义、未绑定或冲突模板、任一未知返回、函数体仍可落空、没有任何可证明返回、循环内嵌套/多层 `break` 与 `continue`、其它尚未建模控制结构内的 return、yield/goto、未解析类型、unpack、引用/variadic callback 及参数数量不符均保持 unknown。复杂表达式或属性别名的跨参数依赖、无法表示的对象补集、`do…while` 后续迭代相关性及 foreach 等更复杂循环断言仍待实现。
- [ ] 魔术属性/方法、动态调用的保守模型与插件接口；类级 PHPDoc `@property` / `@method` 已完成结构化解析、实例/静态补全、签名、返回链与标签 Definition，真实声明同名优先；`@property-read` / `@property-write` 已区分读写方向、只读写入诊断、只写赋值类型及读取链抑制；同名方法重载已按参数数量、具名实参和已证明的标量/对象实参类型选择唯一最佳返回，并在歧义时保留多个 Signature Help 候选；PHPStan 内联方法模板、bound/default 解析和 `class-string<T>` 等既有结构的调用推断已接入；直接字符串或未触碰局部字符串决定的动态成员名可在直接变量/类型接收者上精准导航、显示方法签名，并在全部调用门禁唯一成立时传播到局部赋值和后续成员链；已证明属于目标声明族的动态方法/属性字符串可参与 Rename，未知同名覆盖仍关闭重构；独立 `semantic-provider` schema 1 契约已让框架组件用稳定身份、generation 和来源范围原子替换或撤销外部方法、属性及字面量返回事实。第三方 Provider 现由用户显式配置发现，经一次性无 shell 子进程、超时/输出上限和严格响应身份校验接入，失败保留上一代事实，配置移除则撤销对应身份。确定性括号、纯字符串拼接、唯一全局/类常量别名链及 string backed Enum `->value` 已支持查询和有来源的原子重构；Enum `->name` 仅支持查询，变量拼接、调用、插值、转义及其他复杂动态表达式仍保持 unknown。
- [ ] 原生类型/PHPDoc 冲突规则、递归终止、类型展开预算与派生失效；参数、返回和属性的首个精准子集已完成，只有共享代数在完整索引下证明 PHPDoc 超出原生运行时边界才发布稳定诊断，合法收窄与 unknown 场景抑制。类型关系、PHPDoc/原生类型节点、泛型父类型层级和模板替换文本已有明确预算，超限降级 unknown；冲突关系的跨文件层级更新失效已验证。类级/callable 级模板遮蔽、传递 bound、无 bound mixed 上界和循环抑制，集合/invokable 到原生 iterable/callable 的项目语义关系，以及首批整数/字符串/numeric/scalar/array-key/non-empty-array 伪类型运行时上界已接入；主要递归语义图、重构/调用定位、readonly/工厂前向流和局部静态值流均已有独立预算，constructor/factory 摘要已按类型/callable/继承/Trait 依赖定向失效。`array<TKey,TValue>` 的键/值及 non-empty shape 关系、`int<min,max>` 安全整数区间，以及结构化 array/list、封闭 array shape、唯一静态短数组类常量、完整可见 `Class::*` 集合与 backed Enum 的 `key-of`/`value-of` 已结构化。

产物：高级推断报告和类型回归集。退出条件：泛型 Repository/集合/工厂、分支收窄和递归类型场景通过；未证明的副作用不产生不可靠收窄；重估后续排期。

## P6：诊断与编码辅助 Beta

当前返回路径诊断已覆盖原生值返回类型与 `never` 在有界控制流中可证明的正常结束；
Generator、抽象声明、未知调用和未支持路径保持静默。

空合并表达式 `left ?? right` 已按精确 CST 节点进入类型主链，只删除左侧 `null`，并把可达回退合并到局部别名、补全、Definition 与参数诊断。确定非空的左侧跳过未知回退；可能为空且回退未知时保持 unknown，其他 falsy 类型不丢失。

完整普通三元表达式已合并两个可证明 arm 的类型，并支持字面量布尔条件只求值可达 arm。结果进入局部补全、Definition 与参数诊断；可达 unknown 和 Elvis 简写保持 unknown。

带唯一 default 的 PHP 8 `match` 已在 64 arm 预算内合并全部可证明结果，并进入相同局部查询链；缺少 default、unknown arm 和超预算保持 unknown。

- [ ] 未解析符号、未定义局部变量、参数/返回值/赋值类型、命名参数、权限与静态调用诊断；命名函数、方法、显式闭包和箭头函数的确定未定义变量已完成，并在分支可能赋值、引用参数、捕获、安全存在性检查和动态符号表边界保持保守；未解析构造、原生参数/返回/属性、继承/接口、Trait、`instanceof`、静态接收者类型及成员，以及显式限定、`namespace\` 或精确 import alias 绑定的命名空间函数/常量已完成；未限定全局函数/常量在内建及扩展目录未穷尽时保持静默。interface/Trait/enum/abstract class 非法实例化及 private/protected 构造器可见性，唯一目标调用的缺少必填参数，以及可证明对象/null 实参、严格类型文件中的直接标量字面量实参、return 与类型属性赋值、原生返回类型和直接对象/null 属性赋值不兼容已完成。PHP 8.2+ 的直接动态属性创建已在唯一具体 class 与完整唯一层级中覆盖；右值类型可证明时可在唯一项目源码 class 中生成 public 类型属性，并通过跨文件 Apply/Undo/Redo 验证，未知值及 vendor 声明拒绝编辑；声明属性、`__set`、继承的 `#[AllowDynamicProperties]`、readonly class 和不完整语义保持静默。PHP 8.1+ 声明家族外显式 readonly/Enum 原生属性写入、PHP 8.2+ readonly class 隐式属性写入，以及任意作用域内可证明的复合/空合并赋值、自增减、数组偏移写入、直接引用操作、唯一已解析签名的按引用参数、属性 foreach 引用和外部 unset 已由稳定代码覆盖；`sort`、`array_pop`、`array_shift`、`array_push`、`array_unshift`、`array_splice`、`shuffle`、`usort`、`preg_match`、`preg_match_all`、`parse_str` 已由逐版本审计的内建签名进入同一规则。声明家族内部已覆盖提升属性构造器再赋值、顺序重复初始化、全部可继续 `if/elseif/else` 分支、完整 switch 正常出口与 `try/catch` 正常出口的确定初始化合流、无直接 readonly 写入 finally 的事实保留、循环入口已确定初始化时的循环体再赋值、无提前出口恒真循环和规范整数边界 `for` 的必然第二次迭代，以及当前流已确定初始化属性的 `$this` 整体引用遍历和同语句块直接构造或来自唯一且由直接构造返回或同块紧邻局部构造后返回、条件、`throw`、`try/catch`、各 arm 直接 `new` 的 `match`、含贯穿/default/局部普通 `break` 的 `switch`、保守可落空循环（含局部 `break`/`continue`）或受支持的 `finally` 证明全部可继续返回路径返回同一具体的新构造类型的工厂的局部对象的可见提升 readonly 状态及索引内无提前退出的自有/实际继承构造器正常出口摘要；自有构造器在全部正常出口前由顶层或完整条件分支调用可见的 `parent::__construct()` 时会合并父构造摘要，单臂条件保持未知。嵌套 continue/多层 switch 跳转、含提前退出路径的写入型 finally 完整 abrupt-flow、更一般的有限循环边界、无法证明覆盖全部正常出口的复杂父构造路径、含生成器、跨作用域跳转或其他复杂控制流工厂的对象初始化状态传播，以及剩余内建签名目录仍待实现。PHP 8.4 隐式可空参数已按原子、Union 与 Intersection 类型形状提供精准 Warning 和显式可空 Quick Fix，并通过真实 Apply/Undo/Redo；参数变量重赋值不受 PHP 参数入口类型约束，明确不作为错误报告。
- [ ] 继承/接口不兼容、重复声明、未使用 import、版本规则、可证明不可达代码；final 类/方法、readonly 状态不一致的父子类、readonly class 引入非 readonly 属性 Trait、extends/implements/Trait use 声明种类、class/interface/Trait 循环关系、静态性、可见性、参数数量/引用/variadic 与可证明类型方差的继承方法签名不兼容，构造器/析构器、经典魔术方法签名与可见性、抽象方法声明契约、PHP 8.1+ 显式 readonly 与 PHP 8.2+ readonly class 属性声明契约、`AllowDynamicProperties` 的 readonly class/interface/Trait/Enum 非法目标，以及 PHP 8.1+ Enum case/接口/直接属性/带属性 Trait/禁用与合成方法，返回专用/属性禁用/非独立、首批冗余原生类型与同层重复完整类名声明、类型外 `self`/`parent`/`static` 与无父类型声明中的 `parent`，以及同文件类型/命名函数/方法/属性/namespace 与类常量重复声明、首批版本规则、独立语句的精准未使用 import 和直接 return/throw 后不可达诊断已完成，其余边界待实现。
- [x] 实现接口、抽象方法、构造函数/访问器生成、Override 与命名参数补全；当前均已在保守支持域内完成并具备语义、stdio 或真实 Extension Host 证据。
- [x] Implementation、Type Hierarchy、Inlay Hints、Semantic Tokens；Implementation、Type Hierarchy、已证明局部对象的类型提示、唯一扁平位置调用的参数名提示，以及声明、变量/参数/调用/成员/`new`、原生/PHPDoc 类型、继承/Trait/Attribute/`instanceof`/静态接收者、import/alias 和唯一全局/namespace 常量 Semantic Tokens 已完成；唯一类型声明会细分 class/interface/enum，重复、动态或未解析身份保持保守。
- [x] Import/Optimize Imports 完整迁移：默认服务器路径的 Import Class、Paste/Resolve Imports 与 Optimize Imports 均由 semantic/LSP 提供；候选和复制身份按 Composer 规范声明收敛，冲突 alias 与使用文本原子处理。连续 use 块支持标准 Organize Imports，无注释 group use 会安全展开、删除未使用成员、去重并按 grouped/FQCN 排序；注释边界和多 namespace 保守拒绝。旧实现仅供关闭自研服务器的兼容模式使用。
- [ ] 稳定诊断代码、严重性/关闭设置、未知和索引未完成时抑制策略；现有代码已支持动态关闭和逐代码严重性覆盖。`php.extension.unavailable` 只对 workspace 设置或 Composer platform 明确禁用、且属于八组已审计扩展目录的类型、函数和常量发布，消息与 data 保留禁用来源；项目/polyfill 已声明同一身份、扩展状态未知、符号未审计或索引未完成时保持静默。剩余诊断仍待完成。

产物：复杂类型项目 Beta。退出条件：每条诊断具备正例、合法反例和输入中间态；Quick Fix 通过真实编辑器文本、选区和撤销验证。

## P7：可靠重构

- [ ] 第一批：类型、函数、常量、局部变量/参数、方法、属性 Rename；继承链和命名参数调用。类型、唯一具名函数/命名空间常量、类与 Trait 常量、大小写敏感 Enum case、非魔术 private 方法、局部变量/参数和属性已在保守支持域内完成；类型、函数、常量、Enum case、方法与属性支持从唯一解析使用点发起，类型使用点复用 PSR-4 文件同步并保留显式 alias，public/protected 方法名与参数同步完整接口/父类/重写族，普通属性同步完整类层级，提升属性把构造参数作用域、PHPDoc、直接/继承构造命名实参及属性访问作为同一身份；Trait 方法/属性同步已证明消费层级，源方法 Rename 保留具名 alias，alias 也可独立 Rename，完整 `insteadof` precedence 会按唯一 winner 自动改写。两元素数组 callable 在接收者变量类型完整、非 nullable，且每个 Union/Intersection 分支都解析到同一方法族时会同步方法名字符串；未知接收者、复杂 callable 与 `"Class::method"` 保持拒绝。其余动态/字符串引用和跨工作区引用仍待完成。
- [ ] 第一批：迁移 PSR-4 Move、文件 Rename、PHPDoc 与 import 编辑。
- [ ] 第二批：提取变量/方法、修改签名及调用点、内联局部变量；块级完整赋值 RHS/return 表达式的 Extract Variable、支持已证明输入与末条简单赋值单一输出的连续实例语句 Extract Method、声明后紧邻一次完整值使用的 Inline Variable，以及 private 未使用普通参数连同 PHPDoc/位置和命名实参删除的精准子集已完成，并通过真实应用与 Undo/Redo；多输出/控制流提取及通用修改签名仍待实现。
- [ ] 第二批：限定可证明场景的提取接口、移动成员。
- [x] 统一 EditPlan、范围/文件操作冲突和文档版本/内容前置条件；接口/抽象方法、构造函数、访问器、Override、类型及 private/public/protected 方法 Rename 与 PSR-4 Safe Move 已迁移。动态引用完整性说明仍随各重构能力单独验收。
- [ ] 公开 API 的工作区外引用明确列为无法验证范围。

产物：重构候选版与操作证据。退出条件：支持场景在预览/应用/取消/Undo/Redo 下正确；不支持的控制流或动态引用明确拒绝或说明不完整性；不静默漏改。

## P8：Symfony / Doctrine / Twig 协作

- [x] 审计 twig-plus metadata schema 1–4、语言服务器消费逻辑与 twig-plus-metadata Controller analyzer，确认 Twig parser/server/formatter 和 Twig 访问规则仍由 twig-plus 唯一拥有。
- [ ] Symfony 服务/别名、依赖注入、Controller render 上下文的静态分析；字面量 `$this->render()` 上下文、确定性 YAML resource/exclude、私有服务的 `#[Autowire(service: ...)]` 补全/Hover/导航、显式公开服务/别名的 Container `get('id')`，以及已注册 autowire 消费者的 bind、命名 arguments、字面量 Target/具名别名、同名服务/别名、唯一 resource 实现、成员一致的扁平 Union/Intersection、完整规范 alias 的 PHP 8.2 DNF 构造注入和含非私有原型继承的公开 Required 方法/具名对象属性注入 Hover/实现导航已由独立 framework-symfony 包接入。新鲜 dev debug-container XML 已补充 bundle/编译器服务、公开容器返回类型、精确公开方法私有 locator、直接构造参数/方法调用及 Required 属性；无法映射到已索引公开方法的 callable，以及缓存缺失或过期时的对应纯静态覆盖待完成。
- [ ] Doctrine Entity、关联、Repository 泛型及明确列出的常用查询返回类型；attribute 实体、四类关联、标准 ServiceEntityRepository 实体绑定、find/findOneBy/findAll/findBy、关联 Collection 泛型、IteratorAggregate 迭代，以及显式返回类型或唯一 `new Class(...)` 返回的箭头函数/普通闭包 map 已接入语义主链，自定义查询与动态/条件回调返回推断待完成。
- [x] interop v1 提供能力/项目/快照协商、Controller 上下文、序列化类型/公开成员、来源位置和失效消息；扩展桥在启动与 PHP 变化后有界重试，协议不兼容或 PHP LS 未就绪时保留磁盘 metadata 与通用 Twig 能力。
- [x] twig-plus 消费 PHP 变量上下文与公共成员目录，继续由自身决定模板作用域、Union 共有成员和 Twig 属性访问规则。
- [x] 多 Controller 上下文按项目与模板合并，保留全部来源与 Union；动态模板跳过，动态 context 标记不完整，未知类型保留 mixed/unknown。
- [x] 跨 PHP/Twig 导航与受限语义 Rename，通过单一编辑计划执行；Twig 上下文变量可导航到 Controller 来源，Twig 属性访问可导航到所有 Union 分支共有成员的精确 PHP 声明。完整字面量 `render()` context 的外部变量可从 Twig 发起 Rename，一次修改直接目标模板中未被局部声明遮蔽的引用和全部 Controller 键；动态/不完整 context、名称冲突和无法定位的来源会拒绝。真实双 VSIX Extension Host 已验证跨文件一次应用及 Undo/Redo 往返。

产物：两个项目兼容版本与契约测试。退出条件：render → Twig 成员补全/定义、PHP 修改后失效、多来源上下文和跨语言重构通过；不复制 Twig parser/server/formatter。

## P9：最终资格验证与交付

- [x] 完成 formatter、调试和测试入口集成；运行时与目标 PHP 版本分离。Winstar 项目版 PHP CS Fixer 3.95.22 已经 PHP 8.5 包装器完成 CLI 与真实格式化 Provider/Undo 验证；PHP Debug 经 PHP 8.5.9 / Xdebug 3.5.3 完成 launch，PHPUnit 扩展经项目 PHPUnit 9.6.36 执行真实测试。平台矩阵由后续独立条目继续验收。
- [x] 移除独立推荐组合对 Intelephense 的依赖，保留明确的旧工作流兼容说明。Open Source Pack 与保留原扩展 ID 的 Recommended Pack 均安装 PHP Companion 加七项已通过组合门禁的开源工具，并默认启用自研 PHP Language Server；打包校验会直接读取 VSIX manifest，拒绝 Intelephense 依赖或未启用自研核心。手动安装 Intelephense 的旧路径继续由独立兼容回归覆盖。Symfony Language Tools 0.20.1/0.20.2 都因普通 PHP Rename 冲突退出受支持 Profile，等待上游修复后重新评估。
- [ ] 全量版本矩阵、系统矩阵、真实 VSIX 和真实项目基准通过；当前 VSIX 已通过 Linux、Windows、macOS 的打包 Extension Host 与七扩展 Open Source Profile，PHP 7.2–8.5 运行时矩阵全部通过；Winstar PHP 8.5 与 CoreRepo PHP 7.2 的项目源码完整索引、抽样引用和项目 Oracle 已通过。Windows 客户端连接 WSL Remote 及多小时真实项目会话仍待完成。
- [x] 关闭默认启用路径中的旧语义实现，完成配置迁移及文档/本地化；类型 Rename、Import/Paste/Optimize Imports、Safe Move 命令、资源管理器移动协调，以及主类型/文件名诊断均迁入统一 semantic/Language Server。文件移动与 Rename 使用标准 LSP WorkspaceEdit/EditPlan，旧 WorkspaceManager Provider 只在关闭自研服务器或显式旧实验命令时保留。
- [ ] 执行 acceptance.md 全部最终检查，记录原始报告与已知限制。
- [ ] 形成最终交付报告：已完成、证据、支持范围、限制、安装和回退方法。

产物：可安装发布候选 VSIX、完整源码与验收报告。退出条件：最终验收全部通过。公开发布另行确认；未公开发布不妨碍“开发与本地交付完成”，但不得声称 Marketplace 验证完成。

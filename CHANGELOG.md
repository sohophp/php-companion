- Composer 项目索引现在把超出单文件预算、瞬时不可读或分析失败的项目源码标记为 `projectComplete=false`，依赖源码缺口标记为 `complete=false`；不完整索引不再启用未解析符号诊断。结构合法但 restore adapter 拒绝的持久缓存条目会回退到源码重建。真实 stdio 回归覆盖 PHP 文件创建、删除、移动、打开缓冲区覆盖磁盘变化及 Composer autoload 映射刷新。
- 提交 `74f9544` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵；对应私有 Alpha 候选已绑定完整提交和三个 VSIX 的 SHA-256。
- 热缓存实现事实现在按查询目标 callable 水合：成员补全、Definition、Type Definition、Signature Help 和区间 Inlay Hint 只合并文件级事实与光标/范围覆盖的函数、方法或 Property Hook 记录；未标记的整文件诊断、重构和跨文件正文扫描自动完整装载，保持保守完整性。
- 提交 `6a609ac` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵；最新私有 Alpha 候选绑定该完整提交。
- Open Source Profile 的 PHP 8.4 Property Hook 精确诊断验收在 Windows 全插件冷启动下使用 15 秒有界等待，并在失败时输出最后收到的诊断码；消除首次索引偶发超过 5 秒造成的误报，同时保留精确数量断言。
- 提交 `7e27eb9` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵；对应私有 Alpha 候选已绑定完整提交和三个 VSIX 的 SHA-256。
- PHP 语义快照升级到 schema 74：文件级实现事实与每个唯一函数、方法、Property Hook 的实现事实成为独立记录；Language Server v46 分别校验源码、声明、文件实现、每条 callable 实现、派生层和框架事实。重复 callable 身份保守留在文件记录，记录搬移、复制、范围或内容篡改均拒绝恢复。
- 新增 `pnpm candidate:alpha` 私有候选组装门禁：只接受干净提交，把三个已验证 VSIX、源码提交、文件大小、SHA-256 和冻结外部插件版本写入独立候选目录，并生成中文安装说明；机器清单同时冻结拒绝的 Symfony Language Tools 0.20.1 与 DotJoshJohnson XML Tools 2.5.1，该命令不执行 Marketplace/npm 发布。
- 提交 `c28cf43` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。
- v45 热恢复现在先注册声明表，并把实现数组保持为按文件延迟记录；工作区类型/函数/常量/符号目录不触发正文装载，首次正文查询通过统一 getter 原子装载完整实现。10,000 文件基准中索引完成时 10,000 个实现均延迟，传递 readonly 查询只装载 3 个相关文件。
- 提交 `b7c3069` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。
- 提交 `ec96d9e` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。
- PHP 语义快照升级到 schema 73，把全局声明/签名、方法体实现事实和派生索引拆为独立磁盘记录；Language Server v45 分别校验声明、实现、派生层及框架事实 SHA-256，为后续声明复用和方法体按需加载建立可验证边界。
- 提交 `1d4a909` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。
- 已消费且可证明为单一构造类型的 Callable 工厂摘要新增独立持久缓存：只保存正向事实，按调用者源码、载荷 SHA-256、唯一 callable/type 身份及完整直接依赖链恢复；实现变化、同名歧义、损坏条目和缺失依赖会拒绝整条受影响链，未保存文件不会写入。
- Symfony `services.yaml` 与新鲜 `debug-container.xml` 的原始派生事实新增独立持久缓存：按 Composer 根、来源路径、URI、稳定文件元数据、源内容 SHA-256、事实结构和事实 SHA-256 校验，热启动不重复解析；YAML resource 始终使用当前 PHP 类型目录重新展开，文件监控事件强制绕过对应条目，单条损坏只重建该来源。
- 提交 `7d4adea` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。
- 工厂构造摘要新增有界 Callable 反向依赖图：唯一解析且返回表达式为直接函数或方法调用的工厂可传递复用下游构造结论；被调用方实现变化会失效全部传递调用者，无关 callable 与已移除的旧依赖边继续保留缓存。递归、歧义、动态调用及预算耗尽保持 unknown。
- 提交 `72afd9a` 的 CI 以 18/18 通过 Linux、Windows、macOS Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵。
- 新增 Open Source Profile 的机器可读精确版本清单、隔离 Marketplace 安装器和 Linux/Windows/macOS 完整组合 CI；Symfony Language Tools 0.20.2 会拒绝普通 PHP 声明 Rename，0.20.1 虽在本地组合通过，随后也在重复 Ubuntu CI 中产生相同拒绝。两个默认 Pack 和受支持 Profile 均移除该扩展，版本清单保留拒绝记录并阻止误装，等待上游提供可关闭的 Rename Provider 或稳定修复。
- 提交 `4cd7530` 的三平台 CI 以 18/18 关闭冻结版本组合门禁：Linux、Windows、macOS 的 Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵全部通过。
- 声明级 F2 的 Extension Host 验收在切换到刚打开的文档后，以有界重试等待 Language Client 完成 `didOpen` 同步，避免 Windows 快速机器把瞬时 `No result` 误判为 Rename 功能失败。
- Open Source Profile 在执行 PHPUnit 前显式激活并重新发现测试，以结果和源文件双哨兵执行最多 60 秒的有界启动重试；代理从 PATH 中选择实际 PHP 脚本并用当前 `PHP_BINARY` 执行，既不回落到系统旧 PHP，也不把 Windows 批处理启动器当成 PHP 文件。首次命令只触发插件激活时不会再被误判为测试失败，延迟的旧进程也不能冒充新命令成功。
- Open Source Profile 先用 `which`/`where.exe` 把各平台 PATH 中的固定 PHPUnit 版本解析为绝对入口，再通过隔离 PHP 代理脚本适配扩展的脚本路径契约，并为测试进程提供 30 秒启动窗口；CI 不再把 `phpunit` 命令名误当成工作区内的 PHP 文件。
- Safe Move 移动后协调在成功前持续保留源文件快照和已生成的精确计划，`onDidRenameFiles` 与文件观察器共享同一个最多约 20 秒的有界任务；已规划移动的重复文件监控事件使用增量索引，快速反向移动会立即让出旧协调任务，较慢的文件系统或 Language Server 更新不再永久丢失 namespace 与引用修复。
- 资源管理器 Safe Move 的 `onWillRenameFiles` 阶段冻结源文件、检查未保存内容，并只尝试复用已完成的索引，不再在 VS Code 文件事务中启动全项目索引；索引未就绪时，完整语义计划在移动后从冻结快照生成，始终无法形成精确计划则自动把文件移回原路径，避免留下路径与 namespace 不一致的文件。
- 加固资源管理器 Safe Move 的移动后协调：移动前只生成并保留精确计划，避免 VS Code 在同一文件事务中应用源文档文本编辑时偶发内部失败；移动后事件与有界文件状态观察器竞争一次性领取计划，即使 `onDidRenameFiles` 延迟或丢失也会恢复。瞬时文件系统、Language Server 或工作区编辑失败继续从当前状态重试，只有目标 namespace 已落盘且语义协调计划为空时才视为完成。
- 新增可独立发布的 `@php-companion/runtime-probe`：首次打开 PHP 文件或主动检测时，以无 shell、3 秒、128 KiB 边界读取目标 CLI 的版本、SAPI、已加载扩展与 INI 来源；仅在次版本一致时裁剪已审计扩展符号并发布带运行时来源的精准诊断。
- Add a reproducible Language Server long-edit benchmark covering latest-version completion, update-to-diagnostics and hot-query latency, cancellation, retained RSS, process restart, and corrupt persistent-cache recovery.
- Run component tarball verification, editing resilience, and packaged Extension Host gates across Linux, Windows, and macOS CI, using a platform-aware Electron launcher and RSS sampler.
- PHP 8.4 hooked-property reference analysis now covers direct reference acquisition, forbidden reference assignment, uniquely resolved by-reference arguments, property iteration, and visible hooked properties during whole-object reference iteration. Effective `&get` implementations pass; dynamic and ambiguous calls stay unknown.
- PHP 8.4 property hook inheritance now validates interface and abstract requirements, get covariance, set contravariance, operation visibility, final properties, and final individual hooks across complete indexed hierarchies. Child members preserve non-overridden parent hooks; array-offset writes require an effective `&get`. Invalid abstract/interface declarations, virtual defaults, and backed `&get` plus `set` combinations receive stable diagnostics. Semantic snapshots advance to schema 71 and persistent caches to v42.
- PHP 8.4 property hooks now distinguish backed and virtual storage, short and full setter bodies, get-only/set-only capabilities, setter write types and asymmetric write visibility. Hook-local `$this`/`$value`, Definition, direct and compound operation diagnostics, invalid static/readonly hook declarations, schema 70 and cache v41 are covered by parser, semantic and stdio tests.
- PHP 8.3 动态类常量访问现在支持字面量、未触碰局部字符串、唯一字符串常量别名和纯字符串拼接；Definition 精确落到可见常量声明，字面量值进入局部类型与参数诊断。动态输入、修改/提前读取的名称、不可访问或歧义常量保持 unknown，并按目标版本报告 PHP 8.3 边界。
- PHP 8.5 clone-with 现在为普通 clone、简单属性更新和已证明成员操作数保留对象类型，并进入补全与 Definition；只有声明属性存在、当前作用域可访问且字面量值类型兼容时才传播，nullable、标量、动态键和未证明更新保持 unknown。
- PHP 8.5 pipe 表达式现在会通过兼容的单参数函数、静态方法、实例方法和显式闭包传播返回类型，并进入补全与 Definition。每一段都必须具有可证明输入和唯一返回；按引用、动态、歧义、未绑定泛型、不兼容、`mixed` 与 `void` 阶段保持 unknown。未知成员不再因名称恰好匹配当前命名空间类型而产生错误 Definition。
- 增加 PHP 8.4–8.5 现代 `Dom\` 命名空间完整目录：16 个常量、28 个类型、HTML5/XML 文档工厂、CSS selector、XPath、TokenList、命名空间信息、集合与 SimpleXML 桥进入版本化签名、返回传播、补全及导航；保留 PHP 8.5 children、outerHTML、class 查询和 adjacent HTML 边界。
- 修复命名空间内前导反斜线函数调用的 Signature Help，并缓存同一工作区状态下确定的 PHPDoc assertion 推断子问题；文件、快照或外部语义事实变化时精确失效，保留四层嵌套推断且消除大型真实 fixture 的指数重复。
- 增加 PHP 7.2–8.5 经典 DOM 完整目录：45 个全局常量、20/22 个类型、111–139 个方法和 87/93 个虚拟属性进入版本化签名、返回传播、补全及导航；保留 PHP 7 旧方法/必填参数、PHP 8.0 DOM mixin、8.1 tentative returns、8.3 WHATWG 成员和 8.4 DOMNode/XPath API 边界。
- 限制断言驱动的嵌套签名推断深度，防止大型方法中 `signatures`、变量类型和 `@phpstan-assert` 相互递归造成组合爆炸；超过四层时保持保守 unknown。
- 增加 PHP 7.2–8.5 libxml、SimpleXML、XML Parser、XMLReader 与 XMLWriter 目录；错误对象、结构化列表、版本化 loader/handler/option API、SimpleXML 成员和固定迭代值进入签名、补全、返回传播及内建导航。
- 补齐 PHP 7.2–8.5 mbstring 完整可调用目录和版本化常量；保留 list、位置 pair、匹配集合及失败返回，并覆盖 PHP 7.4 `mb_str_split`、PHP 8.0 旧别名移除、PHP 8.2 `mb_get_info` null、PHP 8.3 `mb_str_pad` 与 PHP 8.4 trim/首字母 API 边界。
- 补齐 PHP 7.2–8.5 Reflection 高频核心目录：类、函数、方法、属性、参数、类型、Attribute、类常量与 Enum 反射进入版本化签名、集合元素传播、补全和内建导航；`ReflectionClass<T>` 可从已证明的类名或对象构造实参返回具体实例类型。
- 补齐 `DirectoryIterator`、`FilesystemIterator`、`RecursiveDirectoryIterator` 与 `GlobIterator`；目录项和递归子类保留实际对象身份，可变 current mode 使用安全 Union，并覆盖 PHP 7.2–8.5 参数、flags 与 typed constant 边界。
- 补齐六种高级 SPL 迭代器；递归与缓存类型保留具体键值，Regex 与 Tree 的可变转换使用安全 Union，并覆盖 PHP 7.2–8.5 参数、返回和 typed constant 边界。
- 修复多扩展资源管理器移动中的 Safe Move 竞态：在完整索引前冻结旧文件内容和目标状态，移动事件先发生时仍可按移动前语义规划，并在移动后协调 namespace 与引用。
- 补齐十一种版本化泛型 SPL 迭代器适配器；具体键值类型可穿过过滤、限制、递归子迭代器、AppendIterator 嵌套容器及 late-static 非空收窄，并进入补全、签名和内建导航。
- 补齐版本化泛型 `MultipleIterator<TInnerKey,TValue>`，保留 PHP 7/8 参数、失败返回、PHP 8.1 tentative 返回和 PHP 8.4 typed constants；自定义泛型迭代器的嵌套数组值现在可经 `foreach`、字面量键与非空守卫精确传播，歧义父级保持 unknown。
- 补齐版本化 `SplObserver` 与 `SplSubject` 接口，保留 PHP 7.2 旧 arginfo 参数名、PHP 7.4 现代参数名和 PHP 8.1 tentative `void`，并提供成员签名与内建导航。
- 补齐版本化泛型 `SplHeap`、`SplMinHeap`、`SplMaxHeap` 与 `SplPriorityQueue`，普通堆值类型可跨继承/迭代传播，优先队列按可变 extract flags 保留 data/priority/both 安全 Union，并覆盖版本化 compare、typed constants 与 PHP 8.5 serialization。
- 补齐版本化泛型 `SplDoublyLinkedList`、`SplQueue` 与 `SplStack`，值类型可跨继承成员、迭代、offset、出队/栈操作、补全和导航传播，并保留 PHP 7 插入操作的 `true` 返回、PHP 7.4 序列化、PHP 8 签名和 PHP 8.4 typed constants。
- 补齐版本化泛型 `SplObjectStorage` 与 `SplFixedArray`，对象/附加信息/固定槽位类型可跨成员签名、迭代、静态工厂、赋值、补全和导航传播；对象数组字面量现在可安全驱动 callable 模板反推。
- 补齐版本化 `ArrayObject` 与 `ArrayIterator`，泛型键值类型可跨成员签名、返回数组/迭代器、offset/current、赋值、补全和导航传播。
- 补齐 `SplFileInfo`、`SplFileObject` 与 `SplTempFileObject`，保留文件/CSV 失败返回、继承成员、iterator 契约及 PHP 7.2–8.5 签名边界。
- 修复 PHP 8 下 `count_chars` 与 `str_word_count` 的模式相关 Signature Help，使宽原生 Union 不再覆盖更精确的已审计重载返回。
- 补齐 PHP SPL 官方 15 项函数目录，保留类关系 `class-string` 映射、autoload callable list、PHP 7/8 参数与返回边界、PHP 8.2 iterator 数组输入及 PHP 8.5 特定注销调用弃用边界。
- 补齐 PHP Strings 官方可调用目录：PHP 7.2–8.5 按版本生成 103 项联合目录，保留移除、弃用、新增与参数边界，并为 `count_chars`、`str_word_count`、`str_getcsv`、`localeconv` 和 `substr_replace` 提供精准返回。
- 重载排序在调用点保留直接标量字面量，使数字模式参数可以稳定选择对应返回类型，同时不改变全局变量推断。
- 完成 PHP Filesystem 可调用目录：补齐流状态、CSV/INI、锁、seek、流 stat、同步、process-file 和临时流 API，加入稳定文件/锁/seek/INI 常量，并保留 PHP 7 `fgetss`、PHP 8.1 sync/EOL 与 PHP 8.4 CSV escape 弃用边界。
- 补齐 PHP Filesystem 元数据、权限、上传与链接目录：新增 33 项函数，保留完整 `stat/lstat` shape、realpath cache shape、失败返回、PHP 7/8 参数名及平台/权限边界。
- 补齐 PHP Program Execution 目录：覆盖 11 项函数，保留命令输出/退出码引用、process/pipe resource、描述符与状态 shape、PHP 7.4 array command、PHP 8 参数名、PHP 8.2 `passthru` 返回及 PHP 8.3 cached exit-code 边界。
- 补齐 PHP Directory 目录：覆盖 9 项函数、3 项排序常量与 `Directory` 类型，保留资源/失败返回、目录列表、PHP 7/8 参数名与方法差异、PHP 8.1 readonly 属性及 PHP 8.5 final 边界。
- 补齐 PHP Network 函数目录：覆盖 37 项网络、DNS、HTTP header、cookie、地址转换、stream alias 与 syslog API，以及 15 项稳定 DNS 常量；按 PHP 7.3、8.2、8.4、8.5 保留可用性、返回收窄、options shape 和弃用边界。
- 补齐 PHP Session Handling：覆盖 23 项函数、3 项状态常量、四个 handler 类型、cookie 返回 shape、PHP 7.3 options 数组及 PHP 8.5 `partitioned` 字段，并保持 callback/object save-handler 重载的精确边界。
- 补齐 PHP Function Handling 目录：结合既有自省函数覆盖全部 13 项 API，保留动态调用的 `mixed` 安全边界、参数列表 shape、PHP 7/8 参数差异、PHP 8.0–8.1 shutdown `?bool` 过渡、PHP 8.2 `void` 返回，以及 PHP 7.2 弃用/PHP 8.0 移除的 `create_function`。
- 增加完整 PHP Output Control 目录：16 项函数和 PHP 7.2–8.5 的 13/14 项常量，保留 buffer status 条件 shape、内容/长度失败返回、handler callable/null 契约、PHP 7/8 参数差异及 PHP 8.4 `PHP_OUTPUT_HANDLER_PROCESSED` 门槛。
- 增加完整 PHP Error Handling 目录：14 项函数与 18 项稳定常量按 PHP 7.2–8.5 生成，保留 backtrace/error shape、handler callable、PHP 8.2/8.4 literal `true` 返回、PHP 8.4 `E_ALL`/`E_STRICT` 变化，以及 PHP 8.5 当前 handler 查询门槛；结构化 PHPDoc 返回现在可安全精化 `?array` 原生边界。
- 隔离 Open Source Profile 验证现在在临时用户目录关闭 VS Code 与扩展自动更新，避免组合门禁改写冻结的第三方扩展目录；Symfony fixture 明确保持静态索引和关闭发行元数据请求。Symfony Language Tools 仍要求真实项目已安装 Composer 依赖，合成无 `vendor/` 工作区的上游事件循环退出不再冒充真实项目通过证据。
- 补齐 PHP Options/Info 剩余目录：环境变量、包含文件、资源/进程信息、GC、CLI 标题、运行时输出、版本比较与历史兼容接口共 32 项函数及 22 项版本化常量；`getenv`/`version_compare` 保留参数关联返回，`gc_status` 按 PHP 7.3/8.3 切换 shape，`phpinfo`/`phpcredits` 按 PHP 8.2 收窄为 `true`，magic-quotes 与 Assertion 配置按弃用、移除和值变化生成。共享 PHPDoc 安全精化同时支持数值字面量 Union，且不把仅在 ZTS debug 构建存在的 `zend_thread_id` 伪装为通用符号。
- 增加 PHP 配置与运行时信息目录，覆盖 INI、include path、版本/SAPI/配置文件与内存统计，精确表达 `ini_get_all` shape，并按 PHP 7.4/8.0/8.1/8.2 生成弃用、移除、签名和可用性边界。
- 增加 PHP 7.2–8.5 运行时符号与扩展自省目录，覆盖常量、函数和扩展检查，并保留固定函数表 shape、分组常量条件返回、扩展函数失败分支、PHP 7/8 参数差异及 PHP 8.1 `define` 对象值边界。
- 补齐 Variable Handling 可调用目录，以条件返回精确表达 `print_r`/`var_export` 的输出与返回模式，按版本生成 PHP 8.0 `get_debug_type`/`get_resource_id` 和 PHP 8.4 `print_r(): string|true`；条件 PHPDoc 只有每个分支都属于原生返回范围时才精化。
- 补齐 PHP 7.2–8.5 核心 Math 全函数与稳定常量目录，提供 `abs` 精确重载、`min/max` 泛型返回，并按版本生成 PHP 8.0 `fdiv` 和 PHP 8.4 `fpow`/`RoundingMode`；同时阻止无法解析的成员补全错误回退到全局符号。
- 补齐 PHP 7.2–8.5 PCRE 主 API 与稳定 `PREG_*` 常量，按字符串/数组 subject 选择精确返回，保留 `preg_grep` 键值模板、PHP 7 匹配失败返回、PHP 7.4 callback flags 及 PHP 8.0 `preg_last_error_msg()` 门槛。
- 重载排序现在遵循精确字面量、对应原始类型、宽泛 Union 的优先级，并可从静态 array shape 绑定 `array<TKey,TValue>` 模板，避免精准内建重载退化成宽返回。
- 增加 PHP 7.2–8.5 Filter 函数与常量目录，按已证明过滤器常量选择精确返回，并覆盖 PHP 8.0 规范 bool 名称、PHP 8.2 global-range flag 和 PHP 8.5 throw-on-failure/value 变化。
- 增加 PHP 7.2–8.5 Password Hashing、Hash 与安全随机数内建目录，保留 PHP 7 的失败返回、PHP 7.4 算法身份变化、PHP 8.1 Hash options 参数及 PHP 8.4 bcrypt 默认成本边界。
- 修正 LanguageClient 清理顺序：先停止配置/扩展变化通知源，再关闭 stdio 客户端，避免 VS Code 退出时向已销毁流写入；纯净与 Open Source Profile 打包宿主均以退出码 0 验证。
- 增加 PHP 7.2–8.5 PDO 高频类型目录，覆盖连接、事务、预处理、绑定、抓取、失败返回和稳定常量，并按版本限制 PHP 8.4 `PDO::connect(): static` 与 `setFetchMode(): true`。
- 增加序列化、Base64/十六进制与 URL 高频内建目录，覆盖 `parse_url` 多形失败返回、查询编码常量和 PHP 8 `get_headers` 参数类型/名称边界。
- 增加高频文件、路径和流内建目录，保留 `resource` 元数据、`false` 失败返回、PHP 8 可空读取/写入长度，以及 `FILE_APPEND`、`LOCK_EX` 和 `PATHINFO_*` 常量。
- 增加 PHP 7.2–8.5 版本化 JSON 函数和常量目录，覆盖 `json_encode` 失败返回、`json_decode` 参数、`JSON_THROW_ON_ERROR`、`JSON_ERROR_NON_BACKED_ENUM` 与 PHP 8.3 `json_validate` 门槛，并接入补全、签名、返回传播和 Definition。
- 新增 `php.variable.undefined`：在命名函数、方法、显式闭包和箭头函数内，只对当前位置前没有任何可能定义来源的变量发布 Warning。参数、顺序赋值、分支中的可能赋值、foreach/catch/global/static、引用赋值、按引用调用、闭包捕获、预定义变量及 `isset`/`empty`/`unset`/`??` 均按 PHP 行为处理；动态符号表和未解析调用保持保守。
- 完整索引后，显式限定、`namespace\` 以及精确 `use function`/`use const` alias 目标可发布 `php.function.unresolved` 和 `php.constant.unresolved`。未限定全局候选、动态调用、字符串内容、语法错误和索引未完成状态保持静默，避免在内建及扩展目录尚未穷尽时误报。
- Parser 现在把 `namespace\function()` 记录为完整函数调用事实，使签名、导航、类型传播和诊断消费相同的显式当前命名空间身份。
- namespace 常量、类常量和 `use const` alias 的语义身份现在保持 PHP 的大小写敏感规则；`FLAG` 与 `flag` 可独立导航、引用和重命名，错误大小写不会绑定已有常量。
- `namespace\Symbol` 现在对类、函数和常量显式解析到当前 namespace；相对限定函数/常量不再错误回退到全局声明，namespace alias 会展开限定调用和常量使用，完整限定名称的 Definition 使用同一解析规则。
- namespace 内的未限定与相对限定类名现在严格按 PHP 类名规则解析，不再错误回退到已有全局类；全局类补全生成必要的 `use`，未导入引用保持未解析，显式 import 和 `\\FQCN` 继续驱动 Definition 与成员类型。内建 `is_countable()` 的 `Countable` 契约改为显式全局名，语义快照升至 68、持久缓存升至 v39。
- 函数与命名空间常量补全现在依次优先当前 namespace、显式 `use function`/`use const` 别名、PHP 全局回退和需要新增 import 的候选；外部候选按共同 namespace 前缀与距离排列，LSP 用稳定 `sortText` 保留语义顺序和准确 import 编辑。
- 一般 `while`、条件 `for` 与可能为空的动态 `foreach` 现在可在循环体赋值独立且完全可证明时，把循环前类型与循环体类型合并为 Union；成员补全、多目标 Definition 和参数诊断使用同一事实。自依赖赋值、目标在循环体被读取、引用、复杂跳转或未知值继续保持 unknown。控制流赋值归属在解析时缓存，并跳过不可能修改目标局部值的循环。
- 类型补全现在按已可见状态、共同 namespace 前缀、namespace 距离、显示名称和 FQCN 确定排序；LSP 发送稳定 `sortText`，使当前命名空间和已导入别名优先于新 import，相同短类名仍以完整名称和准确 import 编辑区分。
- 唯一解析调用的 PHPDoc `callable(Service): Return` 契约现在可为无原生类型的 closure/arrow 参数提供上下文对象类型，并统一驱动成员补全、Definition 与参数诊断；具名实参会按名称映射。Callable 参数模板可从同一调用的其他已证明数组/集合实参唯一专门化，包括 `array_map(fn($item) => …, $items)`；可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，会绑定 callable 返回模板，排除明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径，并把条件提前返回与最终返回合并为 Union，使映射结果继续提供元素补全、Definition 与参数诊断。重载歧义、未绑定或冲突模板、任一未知返回、函数体仍可落空、没有任何可证明返回、循环内嵌套/多层 `break` 与 `continue`、其它尚未建模控制结构内的 return、yield/goto、未解析类型、unpack、引用/variadic callback 及参数数量不符保持 unknown。同步修复顶层 arrow function 局部值分析在语法根节点循环的问题。
- 删除未使用 private 参数时先按调用名称筛选候选，再执行签名解析，避免大型已索引工作区为无关调用重复解析签名；完整语义套件继续使用原有 5 秒单项预算。
- 方法 Rename 在新名称与当前声明仅大小写不同或完全相同时直接拒绝，避免大型工作区执行无意义的层级、动态引用和调用点全扫描；行为与既有自身冲突拒绝结果一致。

- Safe Move 的命名空间、声明冲突、import、FQCN 与已证明同命名空间引用编辑迁入编辑器无关 semantic 计划；语义快照保存语法错误范围并升至 schema 67，为 Language Server 接管默认移动路径建立全有或全无基础。

- 默认 Safe Move 命令及资源管理器双向移动改由 Language Server 完成 Composer 路径预检、未保存文件保护、原子文件/文本编辑和移动后 import 去重协调；连续移动会在预检前刷新当前源文件身份。主类型与文件名不一致诊断及文件 Rename Quick Fix 也迁入 LSP，旧适配层逻辑仅在自研服务器关闭时启用。

- 带唯一 `default` 的完整 PHP 8 `match` 表达式现在合并最多 64 个可证明 arm 结果，`throw` arm 作为 `never` 不污染值 Union，并经局部赋值进入补全、Definition 与参数诊断。缺少 default、任一其他结果 unknown 或超出预算时保持 unknown，避免把可能的 `UnhandledMatchError` 或动态结果当作确定类型。Semantic snapshot 升至 schema 66。

- 完整普通三元表达式 `condition ? trueArm : falseArm` 现在合并两侧可证明类型，并经局部赋值进入补全、Definition 与参数诊断；字面量 `true`/`false` 只求值可达 arm，因此不可达的 unknown 不会污染结果。任一可达 arm 未知及省略中间表达式的 Elvis 形式保持 unknown。Semantic snapshot 升至 schema 65。

- 空合并表达式 `left ?? right` 现在使用语法树计算精确结果类型：只从左侧移除 `null`，保留 `false`、`0` 与空字符串；左侧确定非空时不读取未知右侧，左侧可能为空且右侧未知时保持 unknown。结果可经同块局部赋值进入补全、Definition 与参数诊断，并支持 nullsafe 调用、括号及右结合嵌套。Semantic snapshot 升至 schema 64。

- 普通 `if`、else 与可证明提前退出守卫现在消费严格 `===`/`!== true|false` 事实：`T|false` 可精确保留对象分支，`bool !== false` 得到字面量 `true`，并覆盖直接变量、属性与安全 array shape 路径。宽松 `==`/`!=`、mixed 的否定补集及修改后的目标保持 unknown；补全、Definition 和参数诊断使用同一结果。`@return array{...}|false` 可安全精化原生 `array|false`，使根变量排除 false 后的安全 shape 元素继续保留精确类型，逻辑已证明的短路右操作数与严格比较选择的三元 arm 同样生效。控制流事实记录独立检查起点，条件内后续按引用修改会撤销事实。Semantic snapshot 升至 schema 63。

- 独立原生 `assert()` 现在会把可证明的条件事实应用到同一语句块的后续代码：正向与有限 Union 的否定 `instanceof`、严格非空、`!is_null`、正反内建类型谓词、严格 `true`/`false` 字面量比较、`isset` 和 `array_key_exists` 覆盖参数、断言前的已知局部值、直接属性与安全 array shape 路径。`!is_numeric` 只排除必定为数字的 int/float，保留可能为非数字值的 string；mixed 的否定字面量比较、宽松比较或无法表示的补集保持 unknown。单参数调用以及第二参数为静态字符串或 `null` 的位置/命名参数形式均受支持，动态描述保持 unknown。补全、Definition 和参数诊断共享事实，后续目标修改会撤销事实。Semantic snapshot 升至 schema 61。

- 独立局部 `/** @var Service $service */` 现在可在同一语句块内精化既有变量，无需绑定新赋值；直接对象、array shape 字面量键、参数诊断、补全和 Definition 使用同一事实。断言不会跨条件/循环/闭包语句块，并在赋值、直接修改、`unset`、引用绑定或已证明按引用调用后失效。Semantic snapshot 升至 schema 56。

- 紧邻局部赋值的显式 `@var Service $service` 现在可作为开发者类型断言，驱动成员补全、Definition、后续成员链和参数类型诊断；结构化 `@var array{service: Service} $data` 同样驱动安全字面量键的成员补全与导航。错名、无变量名、残缺注解、数组偏移写入与下一次重赋值均不会泄漏旧类型。Semantic snapshot 升至 schema 55。

- 首批字符串内建目录覆盖长度、截取、查找、替换、拆分/连接、格式化、HTML 转义、大小写、填充、比较和 `strtr`，并保留 PHP 8.0/8.1 的函数可用性、失败返回、参数与默认值边界。全局函数 Signature Help 支持多重载，`implode`、`join`、`strtr` 使用关联参数签名；完整调用可绑定具体重载并进入返回传播和参数诊断。

- Date/Time 内建目录扩展到 PHP 7.2–8.5 的 `DateTimeInterface`、`DateTime`、`DateTimeImmutable`、`DateTimeZone`、`DateInterval` 与 `DatePeriod` 高频契约，并按 7.3/8.0/8.2/8.3/8.4 门控工厂、常量、专用异常和微秒 API。`DatePeriod` 的三种构造形式可在 Signature Help 中按位置、命名和已证明实参类型筛选，foreach 值按 `DateTimeInterface` 提供补全与导航。

- 默认自研服务器路径的 Import Class、Paste/Resolve Imports 与 Optimize Imports 已迁入统一 semantic/LSP：复制范围只携带已解析类型身份，手工 Resolve 只处理结构化未解析类型；候选按 Composer 规范声明收敛，批量 import 与 alias 文本替换原子生成，标准 Source Action 支持 grouped/FQCN 排序、未使用项删除和重复 import 去重。关闭服务器时继续提供旧工作流。

- 类型 Rename 已迁入统一 semantic/Language Server，使用标准 LSP `documentChanges` 原子提交文本与 PSR-4 文件操作；显式 alias 保持稳定，非规范陈旧重复声明不阻塞唯一 Composer 规范声明，冲突继续保守拒绝。默认自研服务器路径不再先调用旧类型 Provider；关闭自研服务器时仍保留兼容实现。

- PHP Companion 独立安装及两个组合包现在均默认启用自研 PHP Language Server，且不再自动安装 Intelephense。若发现 Intelephense 且用户尚未明确选择 `phpCompanion.languageServer.enabled`，Companion 会保留原提供者并保持自身服务器关闭；显式 true/false 始终优先。Recommended Pack 保留既有扩展 ID 作为兼容升级入口，最终 VSIX 校验会读取 manifest 并拒绝依赖回退。

- PHP 8.4 隐式可空参数新增 Warning `php.parameter.implicitly-nullable`：只标记带非 nullable 原生类型且默认值恰为 `null` 的参数类型；显式 `?T`、`T|null`、`mixed`、无类型参数、旧目标版本及残缺语法保持静默。首选 Quick Fix 按原类型形状生成 `?T`、`T|null` 或 `(A&B)|null`，并支持单步 Apply/Undo/Redo。

- `#[AllowDynamicProperties]` 新增 PHP 8.2 声明契约 `php.attribute.invalid-allow-dynamic-properties`：精确拒绝 readonly class、interface、Trait 与 Enum，并支持全限定名和 import alias；普通 class、命名空间同名自定义 Attribute、旧目标版本及残缺语法保持静默。
- PHP 8.2 动态属性创建新增 Warning `php.property.dynamic-deprecated`：只检查唯一具体 class 与完整唯一层级上的独立简单属性赋值；可证明相邻语句已在同一变量上创建同名属性时，后续连续赋值不再重复提示；右值能精确归纳为合法原生属性类型时提供首选“声明属性”Quick Fix，可跨文件写入唯一源码 class，未知值及 `vendor` 声明不提供编辑；真实声明属性、`__set`、当前类或祖先的 `#[AllowDynamicProperties]`、readonly class、读取、动态名称、复合类型、重复/未解析声明及残缺语法保持静默。
- PHP 原子类型版本矩阵补齐：`php.version.unsupported` 现在精确标记 PHP 8.0 的 `mixed`/`static` 返回类型，以及 PHP 8.2 的 `true`、独立 `false`/`null`、`false|null` 和 `?false`；合法的 PHP 8.0 `int|false` Union 仍按 Union 版本处理。language-spec、parser 驱动矩阵和 stdio LSP 均覆盖 7.2–8.5 边界。
- PHP 8.2 readonly class 新增跨文件声明契约：`php.inheritance.readonly-mismatch` 拒绝 readonly 与非 readonly 类互相继承，`php.readonly-class.invalid-trait` 拒绝直接或传递引入非 readonly 属性的唯一 Trait；合法同状态继承、readonly/无属性 Trait，以及未解析或重复身份保持静默。
- readonly 属性声明新增 `php.property.invalid-readonly-declaration`：PHP 8.1+ 精确拒绝显式 readonly 属性缺少类型、声明为 static 或携带普通属性默认值，PHP 8.2+ 同样覆盖 readonly class 的隐式只读属性；同一属性的违规合并到属性名范围，`mixed` 类型和构造器提升参数默认值保持合法，旧目标版本及残缺语法不级联。
- Enum 接口新增 `php.enum.invalid-interface`：拒绝显式直接实现自动提供的 `UnitEnum`/`BackedEnum`、直接或唯一接口继承图中的 `Serializable`，以及非 backed Enum 实现 `BackedEnum` 子接口；合法的 `UnitEnum` 子接口和 backed Enum 的 `BackedEnum` 子接口保持静默。
- Enum case 新增 `php.enum.invalid-case`：拒绝非 backed Enum 携带值、backed Enum 缺值、直接标量字面量与 `int`/`string` 背书类型不一致，以及同一 Enum 中完全相同的后续字面量值；常量及复杂表达式不猜测。
- PHP 8.1+ Enum 成员新增 `php.enum.invalid-member`：精确拒绝实例/静态属性、唯一解析的直接或嵌套带属性 Trait、语言禁止的魔术方法、直接声明的 `cases()` 及 backed Enum 的 `from()`/`tryFrom()`，同时保留合法 case、常量、无属性 Trait、Trait 同名方法、unit Enum 的 `from()`/`tryFrom()`、`__invoke`、`__call` 与 `__callStatic`；已识别的属性语法恢复为成员诊断，并抑制同一禁用魔术方法的签名/可见性级联。
- 非 public 标准魔术方法新增独立 Warning `php.method.magic-visibility`；构造器、析构器和 `__clone` 保留 PHP 允许的非 public 可见性，`__serialize`/`__unserialize` 按目标 PHP 7.4 门槛启用。
- 经典魔术方法扩展 `php.method.invalid-magic-signature`：检查 `__clone`、`__toString`、`__get`/`__set`、`__isset`/`__unset`、`__call`/`__callStatic`、`__sleep`/`__wakeup`、`__set_state`、`__debugInfo` 及 PHP 7.4+ `__serialize/__unserialize` 的参数数量、引用/variadic、确定静态性、逆变参数边界及已声明返回类型；接受 `mixed`/Union/`iterable` 参数与 `never`、`true`/`false`、`array`/`null` 等合法变化。
- 抽象方法声明新增 `php.method.invalid-abstract-declaration`：拒绝 abstract 方法体、interface 方法体、具体类中的 abstract 方法、非 abstract 方法缺少方法体、abstract/final 冲突、final 或非 public interface 方法，以及 Trait 之外的 private abstract 方法；同一方法的违规合并到方法名范围，合法 public interface、static abstract 与 Trait private abstract 契约保持静默。
- 相对类型作用域新增 `php.type.invalid-relative-scope`：拒绝类型作用域外的 `self`/`parent`/`static`，以及无父类的 class、无父接口的 interface 和 enum 中的 `parent`；Trait 与具有显式父类型的声明保持合法。Parser 同时把相对静态接收者纳入精确类型范围和 Semantic Tokens。
- 复合原生类型新增 `php.type.redundant-declaration`：检查大小写不敏感的重复原生类型、同层重复限定或非限定类名、`bool` 与 `true`/`false`、`true|false`、`iterable|array`、`iterable|\Traversable` 及平坦 `object|Class`，只标记冗余原子；Intersection 中确定的非类原子由 `php.type.invalid-declaration` 标记。组合语法在目标版本不可用、语法残缺或合法 Union 时静默。
- 原生类型声明新增 `php.type.invalid-declaration`：精确拒绝参数中的 `void`/`never`/`static`、属性及提升属性中的 `callable`/`void`/`never`/`static`，以及非独立的 `void`/`never`/`mixed`；`never` 和 `mixed` 按目标 PHP 8.1/8.0 门槛启用，旧版本同名类及残缺语法保持静默。
- 构造器和析构器的编译期声明契约现在发布 `php.method.invalid-magic-signature`：拒绝 static、原生返回类型及析构器参数，并将同一方法的违规合并到方法名范围；语法残缺时静默。
- 同文件重复命名函数现在使用大小写不敏感身份发布 `php.duplicate.function`，只标记后续声明；`php.duplicate.constant` 的提示会准确区分 namespace 常量和类常量。
- 唯一且完整类链中的 private/protected 构造器现在参与 `new` 可见性检查，发布 `php.instantiation.inaccessible-constructor`；支持继承构造器、private 工厂、protected 父子类族访问，并在调用方层级不完整或目标重复时静默。
- 唯一解析的 interface、Trait、enum 与 abstract class 构造调用发布 `php.instantiation.invalid-target`，精确标记 `new` 后的类型名；普通 class、未解析或重复目标保持静默。
- 完整且唯一解析的 class/interface extends 环与 Trait use 环发布 `php.inheritance.cycle`；跨文件、自环均精确标记形成闭环的引用范围，断链、种类错误、重复身份或 64 层预算耗尽保持静默。
- 继承关系新增唯一身份的种类校验：class 只能继承 class、interface 只能继承 interface、class/enum 只能 implements interface、Trait `use` 只能引用 trait；未解析或重复目标不产生猜测，发布稳定 `php.inheritance.invalid-type-kind`。
- 完整索引后的 `php.type.unresolved` 从显式 `new` 扩展到原生参数/返回/属性类型、继承/接口、Trait、`instanceof` 与静态接收者；只有工作区中零匹配的结构化类型引用才报告，`self`/`parent`/`static` 和尚未具备完整版本目录的 Attribute 保持静默。
- Semantic Tokens 复用工作区唯一解析：类型使用点在恰好一个声明时细分为 class/interface/enum，Trait 使用标准 class 显示；全局、namespace 与 `use const` alias 常量表达式只在唯一声明且不与类型、调用或成员事实重叠时分类。重复 FQCN 会同时抑制相关 Hover/Definition 与 token。
- Parser 结构化记录原生对象类型、继承/接口、Trait、Attribute、`instanceof`、静态接收者及显式 import alias 的精确范围；Semantic Tokens 使用标准 `type` 分类这些位置、PHPDoc 类型和 class import，并按 function/constant 分类对应 import。semantic 快照升级为 schema 37，旧缓存不会混入缺失事实。
- Semantic Tokens 从声明扩展到 CST 精确确认的文件顶层/局部变量、当前作用域参数引用、普通/静态方法与属性/常量访问、函数调用、命名实参标签和 `new` 类型使用点；动态成员保持普通变量或静默，声明区间继续优先携带 declaration/static/readonly 修饰。变量 CST 扫描限制为 100,000 节点，超限不发布部分结果。
- 原生参数、返回和属性类型现在与紧邻 PHPDoc 精化执行保守兼容性校验；稳定 `php.phpdoc.type-conflict` Warning 只标记可证明超出运行时边界的文档类型范围，合法收窄及 unknown 场景保持静默。
- 类型关系、PHPDoc/原生类型展开、泛型继承遍历和模板替换具备明确预算；超限安全降级为 unknown，相关文件编辑后派生冲突按新层级即时重算。
- PHPDoc/原生类型冲突进一步解析类级和 callable 级模板的作用域遮蔽、无 bound mixed 上界及传递 bound；循环模板关系保持 unknown。
- 递归语义图入口统一限制常量别名、构造器、继承/接口/Trait、成员、变量来源及 iterable 泛型遍历深度，超限不暴露未经完整证明的结果。
- 局部 CST 搜索改为最多 100,000 节点、256 层的迭代遍历；Extract/Inline/private 参数重构、readonly 前向控制流和 16 层局部值流在预算耗尽时整体保持静默，避免深层源码造成栈溢出、超长计算或部分诊断。
- 构造器初始化与工厂构造摘要按变更 callable、类型及继承/Trait 依赖闭包定向失效；无关文件保存不再清空已验证摘要，类型拓扑变化仍会撤销相关结果和负缓存。
- PHPDoc `array<TKey,TValue>` 与 `non-empty-array<TKey,TValue>` 进入结构化数组代数，实参数组的键和值类型分别校验；sealed shape 只有存在必填字段时才能满足非空数组约束。
- PHPDoc AST 结构化保留有符号整数，类型系统新增 `int<min,max>` 开放/封闭区间；安全整数实参按边界精准判断，宽泛动态 int 到窄区间保持 unknown，倒置或不安全边界保持静默。
- 结构化 `array<K,V>` / `list<T>`、封闭 array shape、唯一解析的静态短数组类常量、完整可见的 `Class::*` 常量集合及已索引 backed Enum 支持 `key-of<...>` / `value-of<...>` 精确投影；直接简单字符串/安全整数键可诊断，动态同基础类型值或集合中任一不可求值常量使结果保持 unknown。
- 静态数组递归投影限制为 256 个节点，超限整体返回 unknown。
- 命名集合和 invokable 对象通过项目继承/成员事实接入原生 iterable/callable 关系，修复 PHPDoc 与实参检查中的确定性误报，并让外部不完整关系保持 unknown。
- 常用 PHPStan/Psalm 整数、字符串、numeric、scalar、array-key 与 non-empty-array 伪类型按运行时上界参与 PHPDoc/原生冲突判断，避免把合法精化误报为冲突。
- parser 与 semantic 结构化消费直接字符串或未触碰局部字符串决定的动态成员名，为直接变量/类型接收者提供精准 Hover、Definition 与 Signature Help；在参数数量、具名参数、实参类型、PHPDoc 重载和方法模板均唯一兼容时，动态调用结果可传播到局部赋值和后续成员链，并保留 nullsafe 可空性。方法/属性 Rename 会更新已证明属于目标声明族的动态字面量或局部字符串来源；同名未知动态覆盖继续阻止重构，已解析到无关类型的同名动态访问不会误改。复杂表达式、插值、读取、重赋值、歧义、不兼容调用和越界控制流保持 unknown。semantic 快照升级为 schema 36。
- 动态成员名称进一步支持括号、纯字符串拼接、全局/类常量别名链和 string backed Enum `->value`，并从最终字面量来源安全参与 Rename；循环常量、Enum `->name` 无可编辑来源及其他复杂表达式保守关闭重构。

## Unreleased

- 构造器参数已经验证的 PHPDoc 精化现在会复用于同名提升属性：`@param Service $service` 可精化 `public mixed $service` 的属性读取、补全与 Definition；与原生属性类型冲突的文档仍不会进入查询模型。Semantic snapshot 升至 schema 54。

- 多属性声明中的 `@var Type $property` 现在只绑定指定属性，类型索引与 PHPDoc/原生冲突诊断使用同一身份规则；未带变量名的 `@var Type` 仍应用到整条声明。Semantic snapshot 升至 schema 53。

- 紧邻属性的 `@var` 现在可在兼容时精化原生 `mixed`、array/list/shape、iterable、string/class-string、callable/Closure 或同基类型，并在文档类型与原生边界冲突时保留原生类型。属性补全、Definition 与谓词控制流使用同一结果；Semantic snapshot 升至 schema 52。

- `is_callable()`、`is_countable()` 与 `is_iterable()` 的非单一命名谓词目标现可从对象 Union 中保留具体 invokable、Countable 和 Traversable 实现类，使接口成员、实现类专有成员和 Definition 使用同一精确类型；无关对象分支被排除，关系不完整的 false 补集保持 unknown。Semantic snapshot 升至 schema 51。

- 对象模式 `is_a()` 与严格 `is_subclass_of(..., false)` 现在会在参数、直接属性和安全 array shape 路径上保留所有已证明的子类型候选，多子类结果只暴露签名一致的公共成员，Definition 返回全部匹配声明；不确定补集保持 unknown。Semantic snapshot 升至 schema 50。

- 对象模式 `is_a(Child|Other, Base::class)` 的真路径现在保留实际 `Child`，不再降级成 `Base`；false 路径会从有限参数 Union 排除目标及其已知子类型。诊断、子类专有成员补全和 Definition 使用同一关系；Semantic snapshot 升至 schema 49。

- `is_object()` 现在会在声明的对象/标量 Union 中保留全部具体对象分支，使参数诊断、单类或多类公共成员补全和多目标 Definition 使用同一收窄结果；false/else、提前终止守卫、命名空间 shadow 与显式全局调用均有覆盖。Semantic snapshot 升至 schema 48。

- `is_callable()` 仅在 `$syntax_only` 省略或字面量 false、即 PHP 实际验证运行时可调用性时产生 callable 控制流事实；显式 false 与命名参数支持参数、属性、数组路径及有限 Union 反向排除。true 或动态 syntax-only 不再被错误收窄；Semantic snapshot 升至 schema 46。

- 全局 `is_subclass_of($value, Type::class, false)` 进入严格对象子类型控制流：目标类型自身不算子类，正向与有限 Union 反向路径统一驱动参数、直接属性和安全数组路径的诊断、补全与 Definition。省略、true 或动态 `$allow_string`、动态类参数、mixed 补集及命名空间同名函数保持 unknown；Semantic snapshot 升至 schema 45。

- 全局 `is_a($value, Type::class)` 在 `$allow_string` 省略或明确为 `false` 时进入对象类型控制流：正向路径可从 mixed 或 Union 精化目标类型，false/else 路径可排除有限 Union 成员，并覆盖命名参数、提前终止守卫、直接属性与安全数组路径的诊断、补全和 Definition。动态类参数、命名空间同名函数及 `$allow_string=true` 保持 unknown；Semantic snapshot 升至 schema 44。

- `array_key_exists()` 与其官方别名 `key_exists()` 的已证明真路径现在区分 array shape 可选字段“不存在”和字段显式 `null`：存在事实可驱动嵌套安全路径的实参诊断、成员补全与 Definition，但不会删除声明中的 null。命名空间同名函数、false 路径、动态键和修改后的事实保持保守；Semantic snapshot 升至 schema 43。

- PHP 类型谓词、`isset`、`empty`、直接真值守卫、严格/宽松 null 比较和 `instanceof` 现可精准收窄直接、静态名称、非 nullsafe 的可见属性路径，以及最多 16 层、可证明 array shape 或 typed array 的安全字面量键路径，并统一驱动实参诊断、成员补全与 Definition。多参数 `isset` 真路径、`empty` 假路径、直接 truthy 路径及 null 不等路径移除 null，null 相等条件提前终止后的继续路径同样生效；不能证明非空的方向不猜测 null-only。正向谓词可把 mixed 属性或元素精化为具体类型，无法表示的 mixed 补集仍保持 unknown；动态键和超预算路径保持 unknown。

- PHP 类型谓词控制流扩展到参数及直接可证明的局部副本，并覆盖 `!is_*` 真分支、elseif/else 条件链、提前终止后的继续路径，以及析取条件确定为假的路径；有限 Union 会逐项排除已证明类型，局部重赋值立即失效，无法表示的 mixed 补集保持 unknown。
- 严格非空、`instanceof` 与其可表示补集现在统一进入函数实参诊断，参数和安全局部副本的调用检查与成员补全使用相同的分支事实。

- 变量类型谓词加入 PHP 7.2–8.5 版本目录，并在已解析到全局内建函数的正向 `if`/循环分支中收窄 Union 或 mixed 参数；命名空间同名函数、否定分支和范围外代码不会继承该事实。
- 类与对象检查目录新增 `get_class`/`get_parent_class`、类型存在性、成员检查、继承检查及声明列表函数；保留 PHP 8.0/8.1 边界，并把 `get_class($object)` 精化为对象对应的 `class-string<T>`。
- 首批迭代函数目录加入 `is_iterable`、`iterator_to_array` 与 `iterator_count`；PHP 8.2 的 `Traversable|array` 参数边界、泛型父接口键值替换、默认保留键及显式重建 list 的条件返回均进入补全、签名和导航主链。
- 新增首批高频数组函数的 PHP 7.2–8.5 精准签名，并将 PHPDoc 数组键值类型经 values/filter/map、局部变量和 foreach 传播到补全、导航与参数诊断；加入 PHP 7.3 key endpoints、PHP 8.4 find/predicate 回调和 PHP 8.5 value endpoints。pop/shift/splice 返回值及 usort 回调参数同步保留输入数组的值模板；按引用调用后重新评估参数值域，避免过期成员结果。Callable 类型同时接受合法省略尾部回调参数的用户闭包。

- 类级 PHPDoc `@property` 与 `@method` 进入独立 AST 和 semantic 魔术成员表，提供成员补全、方法签名、链式返回与注释 Definition；真实 PHP 成员覆盖同名注释成员，无法证明的动态名称保持 unknown。semantic 快照升级为 schema 36，phpdoc、semantic、stdio LSP 与真实 Extension Host 覆盖。
- `@property-read` 与 `@property-write` 具备方向语义：只读属性支持读取链并在所有 PHP 7.2–8.5 目标上拒绝写入，只写属性按独立写入类型检查赋值并阻止读取链；同名读写标签可合并并保留不同的读写类型。
- PHPDoc 条件类型新增独立 AST，并在唯一函数、静态方法和实例方法调用点求值参数或模板主题的 `is` / `is not`。布尔字面量和完整对象层级选择确定返回分支；模板复用现有推断、bound 与实参校验；动态条件安全合并两侧 Union，并沿局部赋值驱动成员补全和导航。无法证明的调用、类型和关系继续保持 unknown。phpdoc、semantic、stdio LSP 与真实 Extension Host 覆盖。
- PHPDoc Callable 返回位置支持同一条件类型 AST；未提前读取、重赋值或按引用传递的 Callable 参数按位置/具名实参选择返回分支，动态条件保留 Union 公共成员，错误实参抑制结果传播。semantic、stdio LSP 与真实 Extension Host 覆盖。
- 嵌套条件类型现在传播同一参数的布尔或有限 Union 分支约束，关联内层 `is` / `is not` 并排除不可达返回类型；父类型可能匹配目标子类时保持两侧 Union。semantic、stdio LSP 与真实 Extension Host 覆盖。
- 嵌套条件类型在位置或具名映射证明不同形参绑定同一个直接变量实参时共享分支约束，覆盖唯一函数/方法与未触碰的 PHPDoc Callable；不同变量及复杂表达式保持独立。semantic、stdio LSP 与真实 Extension Host 覆盖。
- PHPDoc truthy/falsy 断言现在用于 `while` 和有条件 `for` 的循环体，以及 `while`、有条件 `for` 与 `do…while` 的条件短路右操作数；循环体内修改立即失效，循环出口和 `do…while` 首轮主体不继承条件事实。parser、semantic、stdio LSP 与真实 Extension Host 覆盖。
- PHPDoc 解析和 semantic 主链支持无条件及 `@phpstan-assert-if-true/false` / `@psalm-assert-if-true/false` 对象类型断言。唯一函数或唯一解析方法的直接变量位置或具名实参可在独立调用正常返回后，或直接 `if` 条件、逻辑蕴含明确的合取真分支/析取假分支、短路求值已证明的右操作数及无 goto 且主分支/elseif/else 的直接 return/throw/exit、完整嵌套 `if/elseif/else`，或 finally 必然终止/try 与全部 catch 均终止的 `try/catch/finally`，或含 default 且每个入口沿贯穿路径均终止的 `switch`，或首轮必然终止的 `do` 及无退出跳转的恒真 `while/for` 结果使所有可继续路径一致证明条件真值的同块路径内收窄已声明参数，并驱动成员补全与导航；直接 `$parameter->property` 正类型断言进入逐级可见的单/多层属性链和局部读取；方法声明中的 `$this->property` 可映射到直接非 nullsafe 变量接收者，并支持类内可见属性。任一祖先属性写入、根对象重赋值、链上方法调用或传入函数后失效。`class-string<T>` 等已支持参数结构可唯一推断 Callable 模板、验证 bound 和全部实参后专门化参数或属性断言类型。`!null` 可从参数或逐级可见属性路径的单一 nullable 对象移除 null，`!Type`、`!false`、`!true`、基础类型、泛型、交集和否定 Union 可从有限 Union 中减去已证明匹配的类型；泛型排除复用协变、逆变、不变和父类型替换，并保留唯一剩余泛型实参供后续成员链专门化；唯一剩余交集以完整组合成员组进入补全和导航。支持嵌套括号和否定；不完整嵌套、try/catch/finally、switch 或动态循环分支、不可见属性、无法唯一化的否定属性、歧义/越界模板、无法唯一化或关系不完整、无法推出单次调用结果的复合分支、分支外、动态/重复函数或方法、unpack、引用参数、未支持控制流跨越和后续可能修改保持 unknown。parser 缓存独立调用和蕴含分支范围，semantic 快照为 schema 36，避免查询期重复解析和旧缓存误用。
- 唯一函数和普通方法的返回类型只在必填/具名/variadic 调用形状有效且全部有类型实参可证明兼容时传播；直接静态数组、一次未触碰局部静态数组，以及同块从静态数组开始并以连续整数键或 `[]` 写入线性构造的局部位置参数数组均可展开；确定性字符串键写入构造的封闭局部 shape，以及未触碰非引用参数的封闭全必填具名 PHPDoc shape 也可展开。无类型/`mixed` 参数保留动态值支持，动态键、稀疏键、中途读取和不确定控制流保持 unknown。超过 64 个参数或绑定组合时保持静默。semantic、stdio LSP 与真实 Extension Host 正反例覆盖。
- 唯一函数和普通方法调用可从位置、具名、variadic、静态数组、线性构造的连续位置参数数组、确定性局部 shape 或封闭具名参数 shape 展开及 `T[]`、list/array、class-string、shape、同基泛型等结构实参推断 Callable 级 PHPDoc 模板，并在约束和一致性成立后替换返回类型；宽泛/可选参数 shape、已使用数组、动态或稀疏键、越界、冲突和歧义推断保持静默。PHPDoc 顶层 variadic/引用参数标签也会正确关联变量。semantic、stdio LSP 与真实 Extension Host 覆盖。
- Callable 级调用模板推断可沿直接或传递 `@extends` / `@implements` 关系先替换和重排子泛型参数，再绑定父泛型模板返回；错误父参数阻止传播，歧义或不完整继承路径保持静默。semantic、stdio LSP 与真实 Extension Host 覆盖。
- Callable 级调用模板推断可对受支持结构任意层级的 Union 泛型实参逐分支保留完整绑定方案，分别复核 bound 与专门化参数后组成相关返回 Union；协变、不变及多个模板同时变化均不会展平成不存在的模板笛卡尔积。semantic、stdio LSP 与真实 Extension Host 覆盖。
- PHPDoc Callable 返回类型只在调用形状和每个实参类型都可证明兼容时进入下游参数诊断；位置、具名、variadic、直接或一次局部静态数组、线性构造的连续位置参数数组及确定性局部 shape 展开统一复用继承、泛型方差和 strict/weak 标量规则，错误及未知的非 mixed 实参保持静默。semantic、stdio LSP 与真实 Extension Host 正反例覆盖。
- 泛型兼容性新增显式 supertype 特化边界：不同泛型基类必须先把子类参数替换到父泛型，才能继续应用父类型方差；缺少替换事实时返回 unknown，避免把参数重排的继承关系误判为兼容。
- 参数诊断沿与原生直接继承一致的 PHPDoc `@extends` / `@implements` 关系递归替换泛型参数，支持重排后再应用父类型方差；伪造、不完整或歧义关系保持 unknown。
- 参数诊断开始消费唯一可解析函数及普通实例/静态方法的完整返回类型，复用对象继承、Union 与 PHPDoc 泛型代数，并准确绑定 `self`/`parent`/`static` 与 nullable nullsafe 结果；动态、重复和无法解析的接收者继续静默。
- 参数诊断可消费未触碰且实参满足必填、可选及 variadic 声明的 PHPDoc Callable 参数调用返回，覆盖位置/具名实参和静态位置键/字符串键数组展开；未知名称、动态展开、数量不符、已有使用、引用、重赋值或不完整签名继续静默。
- 未触碰的 PHPDoc Callable 参数可经同作用域一次直接 `$alias = $parameter` 后调用并传播返回类型；源参数额外使用、别名重赋值、多层或条件别名保持 unknown。
- Callable 数组展开支持一次直接静态数组局部赋值后的未触碰变量，并按位置/字符串键映射参数；参数数组、已更新数组和多次赋值保持 unknown。
- 同块局部类型流扩展到静态标量、数组、对象构造、唯一调用和已证明 Callable 返回；调用副作用、引用、控制流、动态覆盖、变量转抄与跨块来源仍使事实失效。
- 同块局部数组类型流支持静态 list 追加和字符串 shape 键新增/覆盖，维护 non-empty-list、元素 Union 及最新字段类型；动态值与混合模式保持 unknown。
- 数组追加与 shape 键写入支持未重赋值的已声明参数和已证明同块局部值，索引 0 可安全创建或更新 list 元素 Union；mixed、稀疏数值键与混合模式保持 unknown。
- 直接实参的多步对象成员链现在逐级解析唯一成员、对象返回、nullsafe 状态和位置实参数量，将最终对象、标量、nullable、Union 与 PHPDoc 结构类型交给参数兼容性检查。
- 多步成员链接入 Union/Intersection/DNF 分组接收者，只有全部运行时分支成员签名及规范中间/最终返回一致时才继续，并保留 nullable nullsafe 传播。
- 同块完整 `if/elseif/else` 会把全部可继续分支的确定性局部赋值合并为 Union，并递归处理嵌套完整条件；缺失、提前退出或含未知副作用的分支保持 unknown。
- 同块完整 `switch` 会把每个 case/default 正常出口的确定性局部赋值合并为 Union，支持普通 `break`、case 贯穿及嵌套完整条件/switch；缺少 default、未赋值入口、复杂跳转或未知副作用保持 unknown。
- 同块完整 `try/catch/finally` 会合并 try 与全部 catch 的确定性局部赋值；finally 可确定覆盖或安全透传此前 Union，未赋值、提前退出及未知副作用路径保持 unknown。
- 至少执行一次的安全 `do…while` 会传播循环体确定性局部赋值及其中的完整控制流 Union；break/continue、调用条件、未知副作用和可能零次执行的循环保持 unknown。
- 首次条件为真的规范整数 `for` 会传播循环体的确定性局部赋值；末尾普通 break 可证明 do/while、`while (true)` 与 `for (;;)` 的单轮结果，动态及零轮边界保持 unknown。
- 可证明非空的 list、array 或含必填字段 shape 的 `foreach` 会传播循环体确定性局部赋值，支持静态、同块局部和已证明调用来源；普通、空或动态 iterable 保持 unknown。
- 类型核心新增显式泛型方差上下文：组件消费者可按泛型基类型声明逐参数 covariant、contravariant 或 invariant 关系；PHPDoc parser 保留模板方差，semantic 在泛型参数变量转发时接入该关系。缺失/不完整元数据继续保持 unknown，不猜测第三方泛型。语义快照升级到 schema 23，旧缓存重建。
- PHPDoc Callable 参数诊断消费显式签名的闭包和箭头函数实参，按参数逆变、返回协变及引用/variadic/可选标记检查兼容性；缺失类型、复杂默认值和动态 callable 保持未知。参数诊断同时按外层调用 AST 映射实参，不再因实参内部含闭包或构造表达式而跳过其余可证明类型。semantic、stdio LSP 与真实 Extension Host 正反例覆盖。
- PHPDoc list/shape 参数诊断可沿同一语句块传播局部静态数组字面量，允许跨过不读取目标变量的纯字面量 echo 或独立静态字面量赋值；函数调用、引用、控制流、动态覆盖和跨块来源保持未知。semantic、stdio LSP 与真实 Extension Host 正反例覆盖。
- PHPDoc array shape 参数诊断递归支持嵌套静态数组字面量，包括嵌套 shape、list、nullable 与 Union 字段；动态键、调用结果、展开和混合键继续保持未知。semantic、stdio LSP 与真实 Extension Host 正反例覆盖。
- PHPDoc array shape 参数支持扁平关联数组字面量诊断：按静态 string/int 键检查必填字段、可选字段和标量字段类型；动态键、嵌套值及复杂表达式保持未知。引号感知拆分同时正确处理列表字符串内的逗号。semantic、stdio LSP 与真实 Extension Host 覆盖。
- 类型核心新增 `list<T>` 与 `non-empty-list<T>`，保留顺序整数键和非空约束，并可安全拓宽为兼容的 array。semantic 对 PHPDoc 列表参数检查扁平标量数组字面量的元素 Union 与空/非空状态；静态关联键可证明不是 list，变量、动态键、嵌套或无法可靠解析的字面量保持未知。type-system、semantic、stdio LSP 与真实 Extension Host 覆盖。
- 类型核心新增 `class-string<T>`：受限类字符串按完整继承关系协变，可安全拓宽为 `string`；普通字符串到类字符串保持未知。semantic 识别已解析的 `SomeClass::class`，对 PHPDoc `@param class-string<Base>` 的无关类实参发布精准类型不兼容诊断，子类、普通字符串和动态字符串不误报。type-system、semantic、stdio LSP 与真实 Extension Host 覆盖。
- readonly 构造状态支持精准工厂返回：类方法内同一语句块的局部变量来自唯一可解析函数、静态方法或实例方法，且通过直接 `return new` 或同块紧邻 `$local = new ...; return $local;`、顺序语句、条件分支、`throw` 终止、`try/catch`、各 arm 直接 `new` 的 `match`、含贯穿/default/局部普通 `break` 的 `switch`、保守可落空的 `while`/`do`/`for`/`foreach`（含循环内局部 `break`/`continue`）及包含普通透传语句或受支持控制流的 `finally` 证明全部可继续返回路径都返回同一具体的新构造类型时，沿具体构造器摘要报告对象整体引用遍历。返回已有对象、不同构造类型、可落空路径、工厂内 `yield`、`goto`、`exit`、跨作用域跳转或其他未支持控制流、条件/分支赋值、动态 callable 和后续覆盖保持静默。semantic、stdio LSP 与真实 Extension Host 覆盖。
- readonly 构造状态支持继承与显式父构造器：直接构造的子类没有自有构造器时解析实际继承的父构造器；自有构造器的控制流证明全部正常出口前都调用了 `parent::__construct()` 时合并可见的父构造确定初始化摘要，覆盖顶层调用和完整 `if/elseif/else` 分支。单臂条件、私有父构造器和无法证明的路径保持未知。跨文件父类、子类、消费者链由 semantic、stdio LSP、PHP 8.5 运行时与真实 Extension Host 覆盖。
- readonly 对象整体引用遍历新增直接构造局部变量状态：同一语句块中由 `new` 产生且未覆盖的局部对象，其当前作用域可见的构造器提升属性与索引内无提前退出构造器主体在全部正常出口初始化的 readonly 属性，视为成功构造后已初始化，并在 `foreach ($object as &$value)` 聚合报告。参数、工厂返回、分支构造、私有不可见成员和未证明的普通属性保持静默。semantic、stdio LSP、PHP 8.5 运行时与真实 Extension Host 覆盖。
- readonly `switch` 数据流支持局部嵌套：内层 switch 只有普通 `break` 时由内层消费并独立完成 case/default 合流，再把确定初始化事实传播给外层；缺少 default、内层 continue 或任意多层 break 继续保守回退。semantic、stdio LSP、PHP 8.5 运行时与真实 Extension Host 覆盖。
- readonly `finally` 数据流新增无提前退出的写入证明：`try/catch` 正常出口的确定初始化事实可用于诊断 `finally` 内重复写入，`finally` 自身的必然初始化也传播到后续语句。只要 try/catch 含 return/throw/exit/break/continue/goto，仍从进入 try 前状态保守分析，避免把合法首次初始化误报为重写。semantic、stdio LSP、PHP 8.5 运行时与真实 Extension Host 覆盖。
- readonly 循环数据流新增有限 `for` 第二轮证明：同一局部计数器从整数常量开始，以 `++`/`--` 单步趋近整数常量边界，且前两次条件均为真、循环体不读取或修改计数器也无提前退出时，报告循环体第二次必然执行的重复初始化。递增/递减正例、单次迭代、计数器参与循环体和 break 反例由 semantic、stdio LSP、PHP 8.5 运行时与真实 Extension Host 覆盖。
- language-spec 的逐版本内建签名目录新增 `array_shift`、`array_push`、`array_unshift`、`array_splice`、`shuffle`、`usort` 与 `preg_match_all`，并保留 PHP 7.2、7.3、8.0、8.2 的参数及返回类型差异。它们的按引用参数进入统一 readonly 间接修改诊断；官方签名、PHP 8.5 运行时、semantic、stdio LSP 与真实 Extension Host 覆盖。
- readonly 诊断新增对象整体引用遍历：当 `$this` 的具体 readonly 属性已由当前控制流确定初始化时，`foreach ($this as &$value)` 在 receiver 范围发布一条聚合诊断并列出属性名；未初始化属性和外部状态未知对象保持静默。semantic、stdio LSP、PHP 8.5 运行时与真实 Extension Host 覆盖。
- readonly 初始化数据流新增确定循环回边：`while (true)`、`do…while (true)` 与无条件/true 条件 `for` 在循环体无 break/continue/return/throw/exit/goto 时执行第二轮抽象解释，报告第二次迭代必然发生的重复初始化；普通条件和含提前出口循环保持未知。确定无限循环后的语句不再产生 readonly 重复写入误报。semantic、stdio LSP、PHP 8.5 运行时与真实 Extension Host 覆盖。
- readonly 初始化数据流新增 `switch` 合流：每个 case 的直接派发与上一个 case 的 fallthrough 取确定事实交集；仅在包含 default 且所有正常 break/末尾出口均初始化时向 switch 后传播。缺少 default、fallthrough 的部分初始化、嵌套或多层 break 保持保守。semantic、stdio LSP 与真实 Extension Host 覆盖。
- readonly 初始化数据流新增 `try/catch` 正常出口交集合流；不直接写 readonly 属性的 `finally` 保留该事实，含直接写入的 `finally` 则回退到进入 try 前状态并停止传播，以避免提前 return/throw 路径造成误报。semantic、stdio LSP 与真实 Extension Host 覆盖。
- language-spec 的内建文档新增经 PHP 官方手册核对且按目标版本生成的 `sort`、`array_pop`、`preg_match`、`parse_str` 签名；semantic 由同一签名模型识别它们的按引用参数，使 readonly 数组属性传入这些函数时发布确定修改诊断，未知内建函数继续静默。组件、stdio LSP 与真实 Extension Host 覆盖。
- readonly 初始化诊断新增保守的前向控制流：全部可继续的 `if/elseif/else` 分支均初始化后再次赋值会报告，循环入口已确定初始化时循环体再次赋值也会报告；单臂分支、零次循环结果、不可达语句和 `goto` 保持未知。semantic、stdio LSP 与真实 Extension Host 覆盖。
- 声明家族内部的 readonly 直接赋值新增两个可证明错误：构造器提升属性在构造器主体内已经完成初始化，任何再赋值均报告；同一语句块对同一 `$this` 属性的第二次及后续直接赋值报告。互斥分支、不同语句块及含 `goto` 的非线性 callable 保持保守。semantic、stdio LSP 与真实 Extension Host 覆盖。

- `php.assignment.readonly-property` 扩展到可证明的间接修改：`+=`/`??=` 等复合赋值、前后自增减、数组偏移写入、直接引用赋值/获取、唯一签名的按引用参数以及属性数组的 foreach 引用在声明类内部也会报告；类内初始化前可能合法的 `unset` 保持静默，外部 `unset` 报告，按值参数/foreach 及 readonly 对象所持对象的内部成员修改不误报。打开文档复用增量 CST，关闭文档使用即时释放的临时 CST；semantic、stdio LSP、PHP 8.5 对照与真实 Extension Host 覆盖。

- PHP 8.2 `readonly class` 现已成为 parser 的结构化声明事实，普通及提升实例属性统一进入 readonly 成员模型；`php.assignment.readonly-property` 仅在目标 PHP 8.2+ 报告其类级隐式只读写入，PHP 8.1 继续只处理显式属性。语义快照升级到 schema 22，并由 parser、semantic、stdio LSP 目标版本对照和真实 Extension Host 覆盖。

- 新增 `php.assignment.readonly-property`：PHP 8.1+ 中只报告可证明发生在声明家族外的 readonly 属性写入，并覆盖 Enum 原生 `name/value`；声明类及子类内部的初始化候选保持保守。semantic、stdio LSP 与真实 Extension Host 均覆盖。

- 在 `declare(strict_types=1)` 文件中，对可直接证明的 bool/int/float/string/空数组字面量补充参数、return 与直接类型属性赋值不兼容诊断；弱类型文件继续尊重 PHP 标量强制转换，变量和复合表达式保持未知。semantic、stdio LSP 与真实 Extension Host 均覆盖正反边界。

- 类型 Rename 可从直接短名、全限定名和 import 目标等唯一解析使用点发起，并复用既有 PSR-4 文件同步、PHPDoc/Attribute/import 更新和单步 Undo/Redo；显式 alias 使用点因其拼写保持不变而拒绝。真实 Extension Host 从 `new Type()` 使用点完成跨文件及文件名往返。
- Trait 方法 Rename 支持可证明的 `insteadof` precedence：每个宿主必须收敛到唯一 winner；重命名 winner 时同步选中方法 token，重命名被排除 Trait 时保留 precedence 并同步其具名 alias 源。无完整 precedence、规则目标不明确或新名称冲突仍拒绝；真实 Extension Host 已验证跨文件 Undo/Redo。
- 新增大小写敏感的 Enum case Rename：从 case 声明或精确静态访问发起，统一修改声明和已解析引用并保留大小写不同的 sibling；同 Enum case/常量冲突、动态访问和 `ReflectionEnum::getCase()`/`constant()` 字符串查找会拒绝。unit/backed Enum 还精确提供 `cases()`、backed Enum 的 `from()`/`tryFrom()`、只读 `name`/`value` 与静态工厂返回链；合成工厂签名按调用文件的 strict/weak 模式参与 backing value 参数诊断；`from()` 缺参和 `tryFrom()` nullable 普通访问进入既有精准诊断。语义快照升级到 schema 21，真实 Extension Host 已验证补全、Hover、Signature Help 与 Rename Apply/Undo/Redo。
- 新增 public/protected 方法名精准 Rename：从声明同步完整接口、父类、重写实现及已解析直接调用，并覆盖 `parent/self/static` 调用；层级冲突、动态/字符串 callable 和不完整层级会拒绝。真实打包 Extension Host 已验证跨文件 Apply/Undo/Redo。
- 新增 public/protected 非提升属性精准 Rename：从声明同步完整类层级中的重复声明及已解析实例/静态访问；层级冲突、提升/动态属性和不完整层级会拒绝。真实打包 Extension Host 已验证跨文件 Apply/Undo/Redo。
- 新增 Trait 方法与属性精准 Rename：同步 Trait 声明、内部引用及已证明的宿主/子类引用；具名方法 alias 会改源方法并保留 alias 名。无唯一 precedence 的多 Trait 来源、宿主冲突、动态引用或不完整消费关系会拒绝。真实打包 Extension Host 验证跨文件 Apply/Undo/Redo。
- 方法与属性 Rename 现在可从唯一解析的调用/访问点发起，并复用声明发起路径的完整层级、冲突与动态引用门禁；复合类型的候选声明无法由同一编辑计划完整覆盖时拒绝。打包 Extension Host 已从接口、普通/提升/Trait 成员使用点验证跨文件 Undo/Redo。
- 唯一具名函数 Rename 可从直接解析调用点发起；显式 import alias 继续保留且 alias 调用点拒绝发起全局函数重命名。
- 参数 Rename 可从唯一解析的命名实参发起；接口/父类/重写族仍按参数位置统一修改各自声明、作用域、PHPDoc 与命名实参，提升属性构造实参复用参数/属性同一身份路径。
- 新增命名空间常量与类常量精准 Rename：命名空间常量同步声明、`use const` 路径和直接使用并保留显式 alias；类常量同步 `self::` 及解析到同一声明的继承访问。动态/字符串查找、冲突及不完整层级会拒绝。真实打包 Extension Host 已验证跨文件 Undo/Redo。
- Trait 方法 alias 现在拥有独立 Rename 身份：可从 `as alias` 或已解析 alias 调用发起，只修改 adaptation 与该 alias 的精确调用，不触碰源 Trait 方法；冲突、动态/字符串 callable 和歧义来源会拒绝。打包 Extension Host 已验证 Apply/Undo/Redo。
- Trait 常量 Rename 同步 Trait 声明、内部 `self::`、宿主及子类精确访问；多 Trait 同名来源、宿主冲突、动态/反射引用和不完整消费层级会拒绝。打包 Extension Host 已验证跨文件 Undo/Redo。
- 修复方法与属性同名时成员解析固定取方法的问题；现在按调用括号、实例访问及静态 `$` 语法区分 method/property/constant，补全、导航、诊断和重构共享同一结果。
- 新增提升属性精准 Rename：构造参数声明和使用、PHPDoc、直接/继承构造命名实参及属性访问作为同一身份原子修改；同时补齐继承构造签名解析。真实打包 Extension Host 已验证跨文件 Apply/Undo/Redo。

### Added

- 增加 Linux / WSL R1 验收审计；打包 VSIX 的隔离 Extension Host 现在真实验证成员 Hover、Signature Help、References，以及构造函数、Import、nullable Quick Fix 和类型 Rename 的 Redo 往返。
- 增加 Extension Host 诊断 corpus 完整集合门禁，统计 17 个正例和 4 个未知/不完整语义抑制场景，防止新增漏报或级联误报。
- Safe Move 命令默认预览 namespace 与已证明引用，以单个 WorkspaceEdit 提交文件及文本编辑，并增加一次 Undo/Redo 完整往返门禁。
- 严格空值控制流收窄覆盖 `=== null` 的直接 else 分支和直接否定等价式；宽松比较与复杂条件继续保守处理。
- 修正变量在分支内或参数作用域中被未知值重新赋值后仍沿用旧类型的问题，避免过期成员补全和级联诊断。
- 提前退出收窄支持以 `return`、`throw` 或 `exit` 结束的顶层守卫语句序列，同时拒绝仅在嵌套条件中退出的路径。
- `while` 循环支持直接 `instanceof` 和严格非空入口收窄，事实限定在循环体内并在重赋值或循环出口失效。
- 正向 `if`/`while` 合取条件可同时收窄多个已证明变量；析取和复杂否定不产生不可靠事实。
- 单一类型 catch 变量在对应异常处理块内进入统一成员推断；多重 catch 继续保守为未知。
- PHPDoc `@extends`/`@implements` 泛型实参可沿继承链替换父方法返回模板，并校验父模板约束；语义快照升级到 schema 14。
- Doctrine 关联属性通过通用外部属性边界进入语义核心，保留声明可见性、nullability 和 to-many 容器泛型；成员链支持属性与方法交替导航。
- foreach 可从直接成员属性消费明确的外部集合元素事实，Doctrine to-many 关联的循环变量只在循环体内获得目标实体类型。
- foreach 可从直接成员方法的已证明数组/迭代返回类型推导元素，Doctrine Repository `findAll()`/`findBy()` 的循环变量获得实体类型。
- PHPDoc 支持 PHPStan/Psalm 精确标签、模板方差别名及 template-extends/implements；泛型集合沿 IteratorAggregate 继承链推导 foreach 值，在 nullable/Union 返回类型中替换模板参数，并让保持元素类型的 Doctrine `filter()` 链继续精确导航。
- PHPDoc 支持 `Closure(T):U` 签名；参数类型明确的单参数箭头函数或普通闭包可从显式返回类型或唯一 `new Class(...)` 返回绑定方法级模板，使 Doctrine `map()` 在直接链与赋值后传播新的集合元素对象类型，并拒绝动态/条件返回及不兼容回调参数。
- 局部变量可从直接属性读取继承对象类型，同时保留属性可见性、nullable 返回及 nullsafe receiver 约束；旧语义缓存通过 schema 升级安全重建。
- 局部赋值类型传播扩展到以变量为根的完整属性/方法混合链；每一步复用泛型、字面量返回、可见性和 nullsafe 规则，语义快照升级到 schema 18。
- 新增严格块级 Extract Variable：完整赋值 RHS 或 return 表达式通过单个版本化 WorkspaceEdit 提取，自动规避变量名冲突，并拒绝部分表达式及会改变控制流的上下文；真实 Extension Host 已验证 Undo/Redo。
- 新增严格 Inline Variable：只内联声明后紧邻的一次完整值使用，拒绝多次使用、介入语句、引用赋值、嵌套赋值、yield 与损坏语法；删除声明和替换使用由同一个版本化 WorkspaceEdit 提交，并通过真实 Extension Host Undo/Redo。
- 新增严格 Extract Method：提取实例方法顶层、完整且连续的表达式语句；支持已证明对象接收者与唯一按值调用实参输入，也支持将末条简单局部赋值转换为单一返回值，并要求该变量在原作用域后续真实使用。返回类型可从真实对象声明、唯一调用的原生签名及 bool/int/float/string/array 字面量证明，避免把标量误生成为类名；引用、展开、歧义、嵌套或多输出流会拒绝。调用替换和 private 方法插入由同一个版本化 WorkspaceEdit 提交，并通过真实 Extension Host Undo/Redo。
- 新增首个修改签名安全子集：从 private 非魔术方法声明上的未使用普通参数发起，完整索引后同步删除参数、标准/PHPStan/Psalm `@param` 行，以及所有唯一解析直接调用中的位置或命名实参。只丢弃变量、标量/null 字面量或常量引用；可能带副作用的实参、引用/variadic/提升参数、展开或无法完整映射的场景拒绝。真实 Extension Host 已验证单次应用及 Undo/Redo。
- framework-symfony 静态解析标准/legacy services.yaml 的显式服务、别名和确定性 resource/exclude；私有服务支持 `#[Autowire(service: ...)]` 补全、Hover 与 Definition，公开服务通过可替换字面量方法返回事实为 PSR/Symfony Container `get('id')` 提供直接链及赋值链类型，配置或已索引 PHP 文件变化会立即失效。
- Symfony 服务事实增加 `_defaults`/单服务 `autowire` 继承，并保留指向 resource 服务的类名别名；完整索引后，已注册且启用自动装配的构造参数可在同名服务/别名或唯一 resource 实现可证明时显示注入 Hover 并跳转实现类，显式参数属性和歧义情况不猜测。
- Symfony 构造注入继续覆盖字面量 `#[Target]`、`Interface $name` 具名别名、`_defaults.bind`、服务级 bind 与命名 arguments 的服务引用，并在 Hover 标明解析来源；标量覆盖、动态选择器及冲突绑定保持未知。
- Symfony 构造注入支持可完整解析的扁平对象 Union/Intersection：按容器排序规则规范化类型，组合别名或各成员指向同一服务时才提供 Hover 与实现跳转；成员分歧保持未知。
- Symfony 构造注入支持 PHP 8.2 DNF 的规范化完整 service/具名 alias；目标实现必须满足至少一个完整交集分支，缺少完整 DNF alias 时不做叶子推断。
- 通用类型代数保留 PHP 8.2 DNF 交集分支括号，并修正较强交集向完整目标交集的兼容判断；参数类型诊断已有合法 DNF 分支和不兼容对象正反例。
- Union/Intersection/DNF 参数可提供保守成员体验：Intersection 合并约束成员，Union/DNF 只暴露每个备选分支都存在且签名完全一致的成员；共同返回类型可继续链式补全，Definition 返回所有分支声明。
- Union/DNF 成员不存在诊断逐个验证运行时备选分支；nullable 复合参数只在每个分支都确有该成员时报告普通 `->`，避免以首个分支代表整个类型。
- 多类型 `catch (A|B $e)` 在 catch body 内复用 Union 成员模型，提供共同成员补全、Hover、多目标 Definition 与逐分支缺失诊断；离开 body 后立即失效。
- 直接局部别名赋值保留原生 Union/Intersection/DNF 参数的完整分支与 nullable 信息；循环别名、未知来源和后续不明重赋值仍停止推断。
- 语义快照曾升级到 schema 19，以隔离新增的多类型 catch 分支事实；其后由 Enum case 结构化事实、backing/native member 模型及 readonly class 事实继续升级到 schema 22；当前模板方差事实使用 schema 23。
- 唯一可解析函数的原生对象 Union/Intersection/DNF 返回类型可经直接赋值保留全部分支；歧义函数、标量分支和不完整层级不产生类型事实。
- 成员链可继续穿过完整原生 Union/Intersection/DNF 方法返回；复合接收者还要求各分支共同方法的返回分支规范化后完全一致，nullable 接收者继续保留空安全传播。
- 实例方法、静态方法及复合接收者共同方法的完整原生复合返回可经直接局部赋值继续传播；回调模板或字面量特化无法证明时保留原有单类型路径或停止。
- Symfony 直接声明的公开 `#[Required]` 方法参数复用同一精确装配链路；抽象基类只有在已注册具体子类收敛到同一结果时才启用，显式或无法解析的 YAML `calls` 会抑制结果。
- Symfony 直接声明的公开、具名对象类型 `#[Required]` 属性也提供注入 Hover 与实现跳转；显式或无法解析的 YAML `properties` 会抑制结果。
- Symfony Required 方法识别沿可证明的方法原型链继承属性，覆盖子类重写方法；私有父方法不会被当作原型。
- Symfony 框架层可读取时间上新鲜的 `var/cache/dev/*DebugContainer.xml`，补充 bundle/编译器生成服务、公开容器服务返回类型及可定位公开方法的私有 locator 参数；源码或配置较新时整份编译事实立即停用，且不会启动 Kernel、执行项目 PHP 或读取参数值。
- 编译容器中的直接构造参数及 `<call method>` 服务引用按参数位置进入注入事实；LSP 还需同时证明源码 callable、参数位置和对象类型兼容，多个编译目标保持未知。
- 编译容器 `<property name>` 服务引用可映射到同一 owner 的明确 `#[Required]` 对象属性；名称、类型不匹配或多目标时抑制。
- 增加编辑器无关的 `@php-companion/refactor` 组件，以带版本前置条件的计划校验文本和文件操作；接口方法生成、类型 Rename 与 PSR-4 Safe Move 已接入。
- 增加稳定代码 `php.member.unresolved`：只对已知接收者和完整继承链中的确定缺失成员报告，并对动态或不完整语义保守抑制。
- 增加 `phpCompanion.diagnostics.disabledCodes` 和 `phpCompanion.diagnostics.severity`，支持按稳定代码动态关闭或覆盖严重性，并立即刷新打开的 PHP 文档。
- 增加标准 LSP Type Hierarchy，支持按直接继承/实现关系逐层查询父类型与子类型。
- 增加标准 Type Definition，支持从可证明的变量和成员返回值跳转到类型声明。
- 增加 `php.assignment.type-mismatch`，精准报告直接类型属性被确定不兼容的对象或 null 赋值；参数变量重赋值按 PHP 语义保持允许。
- 增加 `php.member.possibly-null`，精准报告 nullable 对象对真实成员的直接普通访问，并尊重显式非 null 分支；PHP 8+ 可预览应用 null-safe Quick Fix。
- 参数 Rename 同步修改解析到同一函数或方法的工作区内命名参数标签，避免声明与调用脱节。
- 非 private 继承方法参数可按参数位置跨接口、父类和重写实现统一 Rename，并分别改写各声明原有参数名对应的 PHPDoc 与已解析命名实参；普通函数/方法参数 Rename 也同步标准、PHPStan 和 Psalm `@param`。层级不完整、同名动态调用、闭包捕获或任一作用域冲突时拒绝。成员合并顺序同时修正为自身声明优先于 Trait、Trait 优先于继承成员，避免父接口签名覆盖实现类签名。
- Organize Imports 支持无注释 group use，按成员证明使用情况后展开、删除和稳定排序；组内注释继续拒绝改写。
- 增加声明级 Semantic Tokens，对结构化确认的类型、函数、方法、参数、属性和常量声明分类。
- 增加标准 Inlay Hints，为可唯一证明的局部对象赋值显示类型提示。
- 增加 `php.argument.missing-required`，对唯一解析的函数、方法和构造调用报告缺少的必填参数，并对不完整调用保守抑制。
- 增加 PHP 8.0+ `php.argument.unknown-named`，按大小写精确标记唯一解析、非 variadic 平坦调用的未知命名参数；增加重复命名参数、命名参数后位置参数/展开参数诊断，并让参数签名展示保留引用、variadic 与默认值。
- 增加 `php.member.non-static-access` 与 `php.member.inaccessible`，只在接收类型及完整层级已知时报告错误静态访问或可见性，并识别可访问继承路径与魔术成员接管。
- 高频 LSP 查询在异步边界响应取消，快速连续编辑不会晚发旧版本诊断；VS Code 客户端加入一分钟三次的有限服务器重启策略，反复崩溃时停止循环，并用真实子进程异常退出验证重启后的补全恢复。
- Composer 项目发现和逐根索引通过标准 LSP Work Done Progress 报告可取消进度，取消条件贯穿目录发现与源码分析且始终发送结束事件。
- Composer 文件预算现在优先完整索引根项目源码，依赖超限时按稳定顺序截断，并分别报告项目完整性与全量完整性；大型 vendor 树不再使可用项目索引整体归零。
- index 支持 adapter 注入路径到 URI 映射；Language Server 在 `vscode-remote` workspace 中保持远程 URI 完成索引、Definition、打开文档覆盖和文件失效，并隔离旧缓存。
- 增加安全子集的构造函数生成：无继承/Trait/既有构造函数时，为有类型且无默认值的普通实例属性生成参数和赋值；属性 hook 等不确定声明不提供操作。
- 增加 `php.class.missing-abstract-method` 与抽象方法生成，对完整继承链中仍未实现的单行抽象签名提供精确诊断和去重 Code Action。
- 增加属性访问器生成：只处理有类型的普通实例属性，跳过属性 hook 和已有/继承方法，并为 readonly 属性或类省略 setter。
- 增加逐方法 Override 生成：只列出完整父类层级中的可覆盖具体方法，保留精确签名并生成正确的 `parent::` 参数转发。
- 增加稳定 `php.import.unused` 诊断及删除 Quick Fix，仅处理代码/PHPDoc 都未使用且可独立删除的单项 import；语义缓存 schema 同步升级。
- 增加稳定 `php.method.incompatible-override`，对完整继承/接口层级中可证明的静态性、可见性、参数数量/引用/variadic 和原生类型方差错误进行诊断；未解析类型保持未知并抑制。
- 增加 final 类继承和 final 方法覆盖诊断，以及直接语句块中无条件 return/throw 后的稳定不可达代码诊断。
- 增加可独立发布的 interop v1 与 framework-symfony 包，静态生产 Symfony Controller render 上下文、公共 PHP 类型成员及精确 UTF-16 声明位置，并通过 VS Code adapter 向 TwigPlus 提供有界实时桥接和成员 Definition。
- 增加可独立发布的 framework-doctrine 包，静态提取 attribute 实体、关联目标、标准 ServiceEntityRepository 实体绑定和常用查询返回类型，不启动 ORM 或数据库。
- 增加自研 Language Server 的 private 非魔术方法 Rename：仅允许从声明发起，在完整索引后修改直接解析引用，并拒绝非法名称、同类冲突及非 private 方法；字符串、反射和动态成员名不改写，VS Code 组合入口继续保留既有类型 Rename。
- 增加可独立发布的 testkit，提供 UTF-16 标记 fixture、LSP framing、PHP 版本样例和冻结的 R1 性能预算。
- 建立可独立发布的 language-spec、parser、phpdoc、project、index、type-system、semantic 和 language-server monorepo 组件，以及真实 tarball 消费验证。
- 增加自研 PHP Language Server 预览开关，提供增量文档同步、语法诊断、文档符号，以及针对可证明类型的成员补全、Hover、参数提示、定义和基础引用。
- 独立 PHPDoc AST 支持 nullable、Union、Intersection、泛型、数组后缀和 array/object shape；紧邻声明的 `@param`、`@return`、`@var` 可在原生类型缺失时参与保守推断。
- parser 与语义查询加入属性、提升属性和类常量，区分实例/静态访问、成员种类和可见性。
- 增加首批 PHP 7.2–8.5 共同内建类签名和只读虚拟文档，支持核心类型补全与定义跳转。
- parser 与 semantic 增加 Trait precedence/alias/visibility、闭包和箭头函数独立作用域，以及 `self`、`parent`、`static` 返回类型绑定。
- Language Server 监听 PHP 与 Composer 文件变化；未保存文档保持优先，完整重建后移除已经失效的磁盘快照。
- 增加首批目标 PHP 版本语法诊断，使用稳定代码 `php.version.unsupported` 区分语法错误与版本不兼容。
- 类型补全扩展到跨 namespace、参数、返回、属性、catch 与 Attribute 位置，并通过 LSP `additionalTextEdits` 精确插入 `use`；已有 alias 冲突时不猜测。
- Signature Help 支持构造函数、导入函数与 alias；增加有界 Workspace Symbols 和同文件重复类型/方法/属性/常量诊断。
- 增加版本化语义快照持久缓存：按文件大小和 mtime 复用，目标 PHP 版本参与 cache key，损坏缓存自动重建并以原子 rename 写入；关闭未保存文档时恢复磁盘快照。
- 增加首批控制流收窄：直接正向 `instanceof` 与严格非 null 分支只在对应语句块内生效；nullable/Union 在分支外保持未知。
- nullable 对象支持显式空安全成员补全、方法签名及返回链；链中缺少必要的 `?->` 时不做不可靠推断。
- 控制流收窄支持可证明的提前退出守卫，包括否定 `instanceof` 后 `return`，以及严格 null 检查后的 `return` 或 `throw`。
- type-system 增加 keyed/non-empty array、shape、泛型与 Callable 类型；命名参数支持乱序 Signature Help 和未使用参数名补全。
- 简单赋值推断增加函数、静态工厂和对象方法返回值传播，并在多 namespace 文件中按实际调用作用域绑定类型。
- 类型、函数和成员共用 Hover/Definition 查询；函数 References 支持 namespace 与导入 alias，并排除同名但不同身份的函数。
- parser/semantic 支持闭包显式按值捕获和箭头函数隐式捕获；按引用捕获保守降级，旧语义快照会被拒绝并安全重建。
- Language Server 按 workspace root 隔离语义索引，避免相同 FQCN 跨项目串线；索引取消覆盖目录发现阶段。
- 函数补全支持同 namespace、全局、导入 alias 与跨 namespace 候选，并为外部函数生成 `use function` 文本编辑。
- PHPDoc 增加 Callable 签名 AST；匿名类使用文档级合成身份支持自身及继承成员推断，同时不污染全局类型候选。
- PHPDoc 类模板实参可替换方法返回类型并继续成员链；打开文档通过 Tree edit 复用旧语法树执行增量重解析。
- 增加类型与方法的 Implementation 导航，支持父类和接口的传递实现查找。
- namespace 常量支持顶层符号、补全、Hover、Definition、References 与 `use const` 自动导入。
- PHPDoc array shape 已知键和 Callable 返回可驱动成员补全；直接 `instanceof` 的普通 else 分支执行互补 Union 收窄。
- 静态读取根项目及已安装 Composer 依赖的 PSR-4、PSR-0、classmap 和 files 路径，并通过独立 index 包在有界预算内建立项目和 vendor 语义索引。
- Composer 依赖解析支持 `installed.json` 的实际安装路径，包括 path repository 与 symlink 安装。
- 工作区内有界发现嵌套 Composer 项目，并按最深项目根隔离语义查询。
- Composer 索引遵守根包与各依赖自己的 `exclude-from-classmap` 规则，避免把明确排除的测试、生成或旧代码声明加入工作区。
- 唯一 Composer PSR-4 映射下提供 namespace 不匹配诊断和首选 Quick Fix；不确定映射、混合 namespace 或语法错误时不报告。
- 完整索引后对显式 `new` 表达式提供未解析类型诊断；索引不完整和语法错误时抑制。
- 非抽象类缺少已解析接口方法时提供稳定诊断，并可通过 Code Action 生成精确签名与可单步撤销的方法体。
- Open Source Pack 和 Recommended Pack 增加 Red Hat YAML，JSON 等基础语言继续使用 VS Code 内建服务。
- Open Source Pack 移除闭源 Database Client 及非核心 CSS Peek、拼写、Markdown 扩展，收敛为八项核心开源工具。
- Open Source Pack 与 Recommended Pack 加入 MIT 的 Symfony Language Tools；默认关闭 runtime indexing 与 release metadata，并通过 Linux x64 Companion/TwigPlus 组合 Extension Host 门禁。
- 扩展 PHP 7.3–8.5 代表语法版本边界，覆盖调用尾逗号、typed property、null-safe、never、DNF、typed class constant、property hook、final property、pipe、clone-with 与 final 提升属性；PHP 8.5 grammar 缺口采用带合法反例的保守兼容层。
- 增加打包 VSIX 的隔离 Extension Host 门禁，从实际发布文件验证语言服务器、WASM、运行依赖及完整编辑器用例。
- 记录 Open Source Pack 在 VS Code 1.136.1 / WSL 的实际安装版本；确认 PHP CS Fixer 扩展 0.3.21 的内置 PHAR 不支持 PHP 8.5，并为 Winstar 接入项目锁定 fixer 的 PHP 8.5 包装器。
- 增加可重复的 Open Source Profile Extension Host 门禁，在所有外部工具同时启用且无 Intelephense 时回归 Companion，并实际验证 PHP/Twig/YAML formatter 所有权、PHP 格式化应用与 Undo、PHPUnit 命令和 PHP debugger contribution。
- 完成十五个组件的本地独立发布边界：新增 `@php-companion/semantic-provider` schema 1 契约，统一 Symfony/Doctrine 外部事实的原子替换、来源范围和运行时校验；全部包继续执行 Node.js 20+、per-package changelog、typed ESM exports、`workspace:^` 内部兼容范围、无环依赖及 tarball 安装后真实 LS PHP 查询检查。
- 新增可独立发布的 `@php-companion/semantic-provider-host`：第三方事实提供器仅从显式设置发现，每轮运行于一次性无 shell 子进程；超时、崩溃、输出超限或协议/身份/generation 校验失败时保留上一代事实。
- Open Source Profile 门禁增加真实 PHP 8.5/Xdebug launch、项目 PHPUnit 执行哨兵、内建 JSON 格式化及 EditorConfig 缩进应用，形成 Linux/WSL 的外部工具闭环。

### Fixed

- 修复 astral Unicode 字符导致后续 PHP 语法范围左移的问题。

## [0.4.5] - 2026-09-05

### Added

- Open Source Pack 和 Recommended Pack 现在都包含 CSS Peek，提供 CSS/SCSS/LESS 选择器定义跳转和内联预览。

## [0.4.4] - 2026-09-01

### Added

- Open Source Pack 和 Recommended Pack 现在都包含 Markdown Preview Enhanced，提供增强的 Markdown 预览与导出能力。

## [0.4.3] - 2026-09-01

### Added

- Open Source Pack 和 Recommended Pack 现在都包含 Code Spell Checker，提供代码与文档拼写检查。

## [0.4.2] - 2026-08-14

### Fixed

- 粘贴纯数字、标量或不含 PHP 类型名的文本时不再启动项目索引，避免普通粘贴出现不必要的等待状态。

## [0.4.1] - 2026-08-13

### Added

- Open Source Pack 和 Recommended Pack 现在都包含 Database Client，提供数据库连接、查询和数据管理工具。

## [0.4.0] - 2026-07-17

### Added

- 正式提供 Import Class Quick Fix/命令，候选限定到当前 Composer PSR-4 项目并按 namespace 距离排序。
- Paste Auto Import 不再依赖实验重构开关；多候选不猜测，alias 冲突要求明确选择。
- 新增带 Preview/Apply 流程的 Optimize Imports，支持 class/function/const、group use、alias、PHPDoc 和 Attribute。
- 新增 `imports.optimize.preview` 与 `imports.sort` 配置。

### Changed

- Import 与 Optimize Imports 按需索引 Composer 项目，保持激活阶段零扫描。
- 无法可靠分析、语法错误、取消或文档版本变化时不执行部分修改。
- 实验性 Safe Move 改为全有或全无：PSR-4 不规范、目标 FQCN 冲突、语法错误、索引缺失或未保存的相关文件会拒绝引用更新。
- Safe Move 不再依赖 `experimental.refactoring`，默认处理资源管理器内的 Composer PSR-4 PHP 文件移动；可通过 `move.enabled` 关闭。
- Safe Move 改为在文件操作完成后基于最新文档做幂等协调，串行处理连续移动，并自动收敛其他 PHP 扩展可能产生的新旧重复 `use`。
- 修正资源级配置读取与搜索根目录作用域警告；移动冲突现在报告实际声明文件路径。

本项目遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 的格式。

## [0.3.0] - 2026-07-17

### Added

- 以零启动扫描、懒加载 Composer/PHP 检测的方式恢复 PHP Companion 运行时。
- 新增 PSR-4 类型创建、FQN/namespace/类引用/相对路径复制，以及打开文件的 namespace/path 诊断和 Quick Fix。
- 新增性能日志、诊断报告、索引模式和文件数/大小/总量资源上限。
- 重新开放 Open Source Pack 和 Recommended Pack，以精简且不重复的 PHP 工具组合取代空占位包；Recommended Pack 额外提供 Intelephense。
- 正式接管 PHP 类型声明上的标准 F2 Rename，更新语义代码/PHPDoc 引用并可预览同步重命名 PSR-4 文件。

### Changed

- 项目级 Tree-sitter 索引与重构改为显式实验功能，只在用户触发后加载。
- Intelephense 保持可选协作，不作为强制扩展依赖。
- Rename 不再依赖实验重构总开关；普通字符串、配置文本和关联测试文件不会被自动重命名。
- 修正 `indexing.mode` 与粘贴 Import 设置的配置作用域读取，避免 VS Code Extension Host 产生 scope warning。
- Rename 重复符号检查现在只认 Composer 可解析的 PSR-4 规范声明，忽略路径不匹配的旧文件，并在真实冲突时报告具体文件路径。
- 修正 Refactor Preview 按构建顺序校验 WorkspaceEdit 时，目标文件文本编辑早于 `renameFile` 而导致 Apply 失败的问题。
- 增加 interface/trait Rename 准备、显式 alias 保留、全部 class-like 解析和非规范重复声明的 Extension Host 回归覆盖。

## [0.1.3] - 2026-07-17

### Changed

- 暂停全部运行时功能，移除自动激活、命令、设置、语言 Provider、文件监听和工作区索引，避免持续占用 Extension Host 资源。
- Open Source Pack 和 Recommended Pack 改为空占位包，不再为新用户安装其他扩展。
- Marketplace 显示名称改为 `PHP Companion (Paused)`；保留原扩展 ID，让现有用户自动升级到安全占位版本。

## [0.1.2] - 2026-07-17

### Changed

- Open Source Pack 和 Recommended Pack 默认将 PHPStan 设为手动分析模式，避免大型项目在启动、保存文件或修改配置时自动执行全项目分析并阻塞 Extension Host。
- PHP Companion 改用渐进式索引：自动索引打开文件及其 PSR-4 Import，跨项目重命名时按需补齐索引；完整索引会分批解析并主动让出事件循环，同时释放被替换或清空的 Tree-sitter 语法树。
- 新增 PSR-4 文件移动重构，移动 PHP 类时同步更新 namespace 与相关引用。
- 不再注册 `Shift+F6`，避免与 IntelliJ IDEA Keybindings 的 Rename 操作冲突；仍可从命令面板执行 PHP Companion 重命名。

## [0.1.1] - 2026-07-16

### Added

- 为 PHP Companion、Open Source Pack 和 Recommended Pack 添加不同的 256×256 Marketplace 图标与横幅配色。
- 自动校验图标尺寸以及三个 VSIX 是否包含图标。

## [0.1.0] - 2026-07-16

### Added

- PHP 7.2–8.5 的工作区级版本检测和手动选择。
- Composer PSR-4/Tree-sitter 符号索引与兼容性报告。
- class、interface、trait 和 enum 的 Shift+F6 安全重命名。
- PHP 代码复制粘贴时的 import 元数据与补全。
- 独立的 Open Source Pack 和包含 Intelephense 的 Recommended Pack。
- 中英文命令、设置和扩展包说明。

[0.1.0]: https://github.com/sohophp/php-companion/releases/tag/v0.1.0
[0.1.1]: https://github.com/sohophp/php-companion/compare/v0.1.0...v0.1.1
[0.1.2]: https://github.com/sohophp/php-companion/compare/v0.1.1...v0.1.2
[0.1.3]: https://github.com/sohophp/php-companion/compare/v0.1.2...v0.1.3
[0.3.0]: https://github.com/sohophp/php-companion/compare/v0.1.3...v0.3.0
[0.4.0]: https://github.com/sohophp/php-companion/compare/v0.3.0...v0.4.0
[0.4.1]: https://github.com/sohophp/php-companion/compare/v0.4.0...v0.4.1
[0.4.2]: https://github.com/sohophp/php-companion/compare/v0.4.1...v0.4.2
[0.4.3]: https://github.com/sohophp/php-companion/compare/v0.4.2...v0.4.3
[0.4.4]: https://github.com/sohophp/php-companion/compare/v0.4.3...v0.4.4
[0.4.5]: https://github.com/sohophp/php-companion/compare/v0.4.4...v0.4.5

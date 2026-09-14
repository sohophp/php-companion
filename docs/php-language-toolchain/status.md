# 实施状态

最后更新：2026-09-15。状态必须以源码和本页列出的验证命令为依据。

2026-09-15 最新 P3 增量：Symfony `services.yaml` 和新鲜 `var/cache/dev/*DebugContainer.xml` 的未展开来源事实进入独立 `symfony-facts-v1` 持久缓存。恢复同时核对 Composer 根、路径、URI、稳定文件元数据、源内容 SHA-256、事实结构和事实 SHA-256；即使外部工具保留文件大小和 mtime，内容变化也会重建。监控事件强制绕过对应条目，单条损坏或 URI 映射变化只重建受影响来源，读取期间变化的文件不写缓存。YAML resource 每次按当前 PHP 类型目录展开，避免 PHP 声明变化后恢复旧服务集合。真实冷/热两进程 stdio 测试证明第二次启动恢复 2/2 来源且容器服务补全仍精确。全仓类型检查、ESLint 和最终测试通过；十六个组件 628 项、根扩展 35 项共 663 项。10,000 文件热恢复 10,000/10,000，耗时约为冷索引的 27.39%；500 轮编辑无陈旧补全，诊断 P95 2.45 ms、热补全 P95 0.99 ms、取消 1.04 ms。十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux 打包 Extension Host 均通过。提交 `7d4adea` 的 [CI 34907040302](https://github.com/sohophp/php-companion/actions/runs/34907040302) 18/18 成功，覆盖三平台 Quality、Extension Host、七扩展 Open Source Profile 和 PHP 7.2–8.5。通用 Callable 事实持久化及更细的声明/方法体独立磁盘记录仍开放，P3 尚未完成。证据见[Symfony 来源事实持久化验收](reports/persistent-symfony-source-facts-2026-09-15.md)。

2026-09-15 最新 P3 增量：工厂构造摘要现为唯一解析、直接返回调用建立有界 Callable 反向依赖图；`outer -> middle -> inner` 可传递复用构造结论，修改 `inner` 会失效全部调用者，移除调用边后再修改旧被调用方不会误清 `outer`。递归、歧义、动态调用和超预算继续保持 unknown，图不完整时清空相关派生缓存。全仓类型检查和 ESLint 通过；十六个组件 625 项、根扩展 35 项共 660 项测试通过；500 轮长编辑基准无陈旧结果，诊断 P95 3.77 ms、热补全 P95 1.29 ms、取消 1.38 ms；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 Linux 打包 Extension Host 均通过。提交 `72afd9a` 的 [CI 34902843097](https://github.com/sohophp/php-companion/actions/runs/34902843097) 18/18 成功，覆盖三平台 Quality、Extension Host、七扩展 Open Source Profile 和 PHP 7.2–8.5。进程内派生摘要不会随 schema 72 快照恢复，因此本次没有无意义地升级 v44 缓存。通用 Callable 事实持久化和更细磁盘记录仍开放，P3 尚未完成。证据见[Callable 工厂依赖图验收](reports/callable-factory-dependency-graph-2026-09-15.md)。

2026-09-15 最新组合门禁：新增第三方扩展机器可读版本清单和隔离 Marketplace 安装器，CI 在 Linux、Windows 与 macOS 分别安装冻结版本并运行完整 Open Source Profile。门禁发现 Symfony Language Tools 0.20.2 会参与普通 PHP 声明 Rename 并返回 `The element can't be renamed.`；0.20.1 虽在本地相同组合通过，随后也在冻结版本的 Ubuntu CI 中产生相同拒绝。该扩展目前退出两个默认 Pack、受支持 Profile 和手动推荐清单，版本注册表明确标记为拒绝；上游提供可关闭的 Rename Provider 或稳定修复后必须重过三平台门禁。Marketplace 临时 429/5xx/网络中断采用最多五次有界重试；PHPUnit 的 PATH 命令先解析为平台绝对入口，再经隔离 PHP 代理脚本适配扩展要求的脚本路径契约，并使用 30 秒启动窗口。Safe Move 的 will 阶段冻结源文件并只复用已完成的索引，未就绪时在移动后从快照生成精确计划并提供约 20 秒协调窗口，无法形成计划则自动回滚文件操作。已规划路径的重复监控事件使用增量索引，快速反向移动不会被旧方向任务阻塞。提交 `4cd7530` 的 [CI 34894351400](https://github.com/sohophp/php-companion/actions/runs/34894351400) 18/18 成功：三系统 Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5 运行时矩阵全部通过。Windows 客户端连接 WSL Remote 与多小时真实项目会话仍开放。证据见[Open Source Profile 版本与 Provider 组合门禁](reports/open-source-profile-version-gate-2026-09-15.md)。

2026-09-15 最新稳定性增量：Ubuntu 打包 Extension Host 多次暴露 Explorer `Service → Contact` 文件已移动但 namespace 仍旧，证明 VS Code will-rename 参与者报错不会可靠取消移动。产品路径现让 `onWillRenameFiles` 冻结源文件并只使用已完成索引，移动后事件与文件状态观察器共享同一个最多 13 次、约 20 秒的串行协调任务；任务保留到 namespace、引用和保存完成且再次规划为空，无法形成精确计划则回滚文件。已规划移动的重复监控事件增量更新索引，快速反向移动会让旧任务立即退出。16 个组件 624 项、纯净打包 Extension Host 与当时包含八个冻结第三方扩展的诊断 Profile 均通过本地回归；该 Profile 随后因 Symfony 0.20.1 的 CI Rename 冲突收缩为七个受支持外部扩展。提交 `35773d5` 的历史 [CI 34873469728](https://github.com/sohophp/php-companion/actions/runs/34873469728) 15/15 成功；最终修正提交 `4cd7530` 的 [CI 34894351400](https://github.com/sohophp/php-companion/actions/runs/34894351400) 进一步以 18/18 关闭三平台七扩展组合。证据见[Safe Move 移动后收敛验收](reports/safe-move-reconciliation-retry-2026-09-15.md)及[Open Source Profile 版本与 Provider 组合门禁](reports/open-source-profile-version-gate-2026-09-15.md)。

2026-09-14 最新 P3 增量：Language Server 持久缓存升级到 v44，把每文件 Symfony Controller/Twig 上下文和 Doctrine repository/association 事实与 schema 72 语义快照放入同一 SHA-256 校验封装；恢复时验证 URI、范围、类型结构和内容，Twig interop 位置更新为当前 generation。热启动不再为这些事实重新解析 PHP。开放文档与磁盘缓存源不同会拒绝恢复，未保存内容也不会写入以磁盘元数据为键的缓存。10,000 文件 Linux x64 基准冷索引 16,932.74 ms、热恢复 3,897.67 ms，恢复 10,000/10,000，PHP 与框架重分析均为 0；损坏单个条目只重建 1 个文件。16 个组件 624 项、根扩展 33 项测试，16 个隔离 tarball、三份 VSIX 内容及 VS Code 1.137.0 打包 Extension Host 均通过；提交 `8576cee` 的 [CI 34861958814](https://github.com/sohophp/php-companion/actions/runs/34861958814) 15/15 成功，三平台热启动均恢复 1,000/1,000、PHP 与框架重分析为 0。Callable 调用依赖、Symfony YAML/编译容器外部事实及更细粒度磁盘记录仍未完成，P3 保持开放。证据见[框架派生事实持久化验收](reports/persistent-framework-facts-2026-09-14.md)。

2026-09-14 最新 P3 增量：`@php-companion/index` 新增按文档原子替换的有界反向依赖图；schema 72 语义快照把解析文件、引用候选和类型继承依赖作为独立层持久化，并在恢复前验证派生内容与解析文件一致。Language Server 缓存升级到 v43。10,000 文件 Linux x64 基准中，冷索引 16,977.41 ms，热启动 4,050.65 ms，全部 10,000 个文件从快照恢复且没有重新解析；篡改单个结构合法的引用层后只重建该 1 个文件。Linux x64、Windows x64 和 macOS arm64 的 1,000 文件 CI 均恢复 1,000/1,000、重解析 0，并通过传递依赖失效与单文件损坏重建；对应提交的 15 个 CI 任务全部通过。Callable 调用依赖、框架派生事实和更细的声明/方法体磁盘拆分仍未完成，P3 总项保持开放。证据见[持久语义分层与派生依赖图验收](reports/persistent-semantic-layers-2026-09-14.md)。

2026-09-14 最新真实项目 Alpha 门禁：新增可重复的 `audit:workspace`，只读加载 Composer 项目与依赖，要求项目源码完整、确定性抽样类型声明至少 90% 可唯一解析、References P95 不超过 150 ms，并可用版本化 JSON Oracle 验证真实补全与 Definition。Winstar 当前 2,218 个项目 PHP 文件全部进入索引，100/100 个抽样声明解析成功，References P95 12.17 ms，`BlogPostsEntityRepository` 经原生 `assert` 后补全 `createQueryBuilder` 并跳到 Doctrine `EntityRepository.php`；CoreRepo 的 1,137 个 PHP 7.2 项目文件同样完整，100/100 成功，P95 21.17 ms，`Language::getUrlCode()` 精确跳到项目声明。两者依赖均按 10,000 文件预算截断，所以不据此声称全依赖完整。当时无 Intelephense 的 Linux/WSL 隔离 Profile 也完成通用组合回归，但尚未包含后来加入的声明级 F2 场景；2026-09-15 的版本门禁已经取代该组合结论。证据见[真实项目 Alpha 门禁报告](reports/real-project-alpha-gate-2026-09-14.md)。Windows + WSL Remote 与多小时真实项目会话仍待完成。

2026-09-14 最新增量：`@php-companion/index` 新增有界、原子替换的文档键倒排表；`@php-companion/semantic` 为类型、全局函数、全局常量和静态成员维护声明及使用候选，并让 References/Rename 只在候选文件内执行原有精确语义解析。更新、删除、快照恢复均同步 postings，超限文档进入保守回退。10,000 文件、200 轮最终本机基准中，类型引用 P95 为 0.17 ms、成员引用 P95 为 0.57 ms，均低于 150 ms 热查询预算；无无关命中、替换后陈旧命中或恢复遗漏。十六个组件 619 项、根扩展 33 项，共 652 项测试通过；十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 打包宿主均通过。证据见[增量引用候选索引报告](reports/incremental-reference-candidate-index-2026-09-14.md)。解析后引用事实持久化、完整派生依赖图和分层磁盘格式仍待完成，因此 P3 总项保持开放。

2026-09-14 最新增量：`@php-companion/semantic` 的更新结果已形成声明/实现/无语义变化三层契约，并返回实际变化的 callable/type 身份。文件末尾 trivia 不再清除工厂摘要；单个函数体变化只失效对应 callable，构造器和 Property Hook 实现变化会沿受影响类型层级失效构造摘要，声明变化仍保守扩大到公开表面。Language Server 据此让控制器模板上下文跟随实现体更新，同时只在声明层变化时重建 Doctrine 与 Symfony service 声明事实。引用倒排表、完整派生依赖图和分层磁盘格式尚未完成，因此 P3 总项保持开放。证据见[分层语义更新报告](reports/layered-semantic-updates-2026-09-14.md)。

2026-09-14 最新增量：新增可独立发布的 `@php-companion/runtime-probe`，用参数数组直接启动目标 PHP CLI，在 3 秒和 128 KiB 边界内读取版本、SAPI、已加载扩展及 INI 来源，不执行 shell、项目 autoloader 或 Symfony Kernel。探测只在首次打开 PHP 文件或主动重新检测后发生；服务端再次验证载荷，并只接受与目标 PHP 次版本一致的结果。成功探测到缺少 DOM、Filter、mbstring、PDO、SimpleXML、XML Parser、XMLReader 或 XMLWriter 时，会按 workspace folder/嵌套 Composer 根裁剪内建符号并发布 `php.extension.unavailable`，诊断结构区分设置、Composer 和运行时来源；失败、超时、畸形输出、版本不匹配、项目/polyfill 定义继续保持 unknown。十六个组件 616 项、根扩展 33 项，共 649 项测试通过；本机六个 PHP 次版本、十六个隔离 tarball、三份 VSIX 内容和 VS Code 1.137.0 打包宿主均通过。验证证据见[PHP 运行时扩展探测报告](reports/php-runtime-extension-probe-2026-09-14.md)。其余扩展目录和完整 P3 环境能力仍待逐项完成。

PHP 8.4 Property Hook 继承与引用边界证据见 [PHP 8.4 Property Hook 继承与引用边界验收](reports/php84-property-hook-inheritance-2026-09-13.md)；基础读写模型见 [PHP 8.4 Property Hooks 验收报告](reports/php84-property-hooks-2026-09-13.md)。

R4/F13 的 Linux x64 连续编辑、取消、重启与损坏缓存恢复证据见 [长时间编辑与恢复门禁](reports/editing-resilience-linux-x64-2026-09-13.md)；当前候选的 Linux、Windows 与 macOS CI 证据见 [跨平台候选验收报告](reports/cross-platform-candidate-2026-09-14.md)；class/interface/trait/enum 声明级 F2 证据见 [声明级 F2 类型重命名验收](reports/declaration-f2-rename-2026-09-14.md)。

XML 文档扩展已选用仍在维护的 `redhat.vscode-xml`，并加入 Open Source Pack 与 Recommended Pack；`DotJoshJohnson.xml` 因长期未发布且依赖已废弃、无法获得安全修复的 `xmldom` 而拒绝。依据与能力边界见 [XML 扩展选型](reports/xml-extension-selection-2026-09-14.md)。

方法族 Rename 已覆盖接收者类型可完全证明的两元素数组 callable，并保持未知或复杂 callable 的整体拒绝门槛；证据见 [数组 callable 方法 Rename 验收](reports/array-callable-method-rename-2026-09-14.md)。

PHP 扩展符号选择已落地首个精准子集：workspace folder 显式配置与 Composer `config.platform` 中明确隐藏的扩展会共同裁剪 DOM、Filter、mbstring、PDO、SimpleXML、XML Parser、XMLReader 与 XMLWriter，配置和 Composer 文件变化可实时恢复或移除；缺少 `require.ext-*` 不作缺失推断。证据见 [PHP 扩展能力选择验收](reports/php-extension-availability-2026-09-14.md)。

2026-09-14 PHP 扩展能力选择封板：首批八个独立审计扩展组已进入 `language-spec` 的机器可读选择契约，`project` 只接受 Composer platform 明确为 `false` 的禁用事实，VS Code adapter 按 workspace folder 向多根 Language Server 发送完整快照；设置切换与 Composer 文件更新通过真实 stdio 验证。通用配置变化不再无条件重建项目索引。十五个组件 610 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 内容检查及 VS Code 1.137.0 打包 Extension Host 均通过。完整边界与产物哈希见 [PHP 扩展能力选择验收](reports/php-extension-availability-2026-09-14.md)。

2026-09-14 PHP 扩展不可用诊断封板：八组已审计扩展的类型、函数和常量在明确禁用时发布 `php.extension.unavailable`，支持直接名称与 `use` 别名，区分 workspace 设置和 Composer platform 来源；项目/polyfill 同身份、未知扩展、未审计符号和不完整索引保持静默。十五个组件 611 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及 VS Code 1.137.0 打包 Extension Host 本地门禁通过。证据见 [PHP 扩展不可用诊断验收](reports/php-extension-unavailable-diagnostics-2026-09-14.md)。

PHP 8.5 final 提升属性的版本、解析和继承语义证据见 [PHP 8.5 final 提升属性验收](reports/php85-final-property-promotion-2026-09-14.md)；静态属性 set 可见性证据见 [PHP 8.5 静态属性非对称可见性验收](reports/php85-static-asymmetric-visibility-2026-09-14.md)。

PHP 8.5 常量表达式 Closure 与 first-class callable 证据见 [PHP 8.5 常量表达式 callable 验收](reports/php85-constant-expression-callables-2026-09-14.md)。

PHP 8.5 属性 `#[Override]` 的版本、继承与 Trait 组合证据见 [PHP 8.5 属性 Override 验收](reports/php85-override-properties-2026-09-14.md)。

PHP 8.5 `#[NoDiscard]`、`(void)` 与重要返回值诊断证据见 [PHP 8.5 NoDiscard 验收](reports/php85-no-discard-2026-09-14.md)。

PHP 8.4–8.5 `#[Deprecated]` 与 PHPDoc 弃用使用/目标诊断证据见 [Deprecated 符号与目标诊断验收](reports/deprecated-symbol-uses-2026-09-14.md)。

PHP 8.3 动态类常量访问证据见 [PHP 8.3 动态类常量访问报告](reports/php83-dynamic-class-constant-flow-2026-09-13.md)；PHP 8.5 clone-with 类型传播证据见 [PHP 8.5 Clone With 类型传播报告](reports/php85-clone-with-type-flow-2026-09-13.md)；PHP 8.5 管道类型传播证据见 [PHP 8.5 Pipe 类型传播报告](reports/php85-pipe-type-flow-2026-09-13.md)；现代 `Dom\` 目录证据见 [现代 Dom 命名空间内建目录报告](reports/modern-dom-builtins-2026-09-13.md)；经典 DOM 目录证据见 [经典 DOM 内建目录报告](reports/classic-dom-builtins-2026-09-13.md)；XMLReader/XMLWriter 目录证据见 [XMLReader / XMLWriter 内建目录报告](reports/xml-reader-writer-builtins-2026-09-13.md)；XML Parser 目录证据见 [XML Parser 内建目录报告](reports/xml-parser-builtins-2026-09-13.md)；XML 基础目录证据见 [XML 基础内建目录报告](reports/xml-foundation-builtins-2026-09-13.md)；mbstring 完整目录证据见 [mbstring 内建目录报告](reports/mbstring-builtins-2026-09-13.md)；Reflection 高频核心证据见 [Reflection 核心内建报告](reports/reflection-core-builtins-2026-09-13.md)；最新 PHP SPL 函数完整目录证据见 [SPL 函数完整内建报告](reports/spl-functions-builtins-2026-09-12.md)；PHP Strings 完整目录证据见 [Strings 完整内建报告](reports/strings-complete-builtins-2026-09-12.md)；PHP Filesystem 完整目录证据见 [Filesystem 完整内建报告](reports/filesystem-complete-builtins-2026-09-12.md)；元数据、权限与链接的运行时细节见 [文件系统元数据内建报告](reports/filesystem-metadata-builtins-2026-09-12.md)；PHP Program Execution 证据见 [程序执行内建报告](reports/program-execution-builtins-2026-09-12.md)；PHP Directory 证据见 [目录内建报告](reports/directory-builtins-2026-09-12.md)；PHP Network 证据见 [网络内建目录报告](reports/network-builtins-2026-09-12.md)；PHP Session Handling 证据见 [会话内建报告](reports/session-builtins-2026-09-12.md)；PHP Function Handling 证据见 [函数处理内建目录报告](reports/function-handling-builtins-2026-09-12.md)；PHP Output Control 证据见 [输出控制内建目录报告](reports/output-control-builtins-2026-09-12.md)；PHP Error Handling 证据见 [错误处理内建目录报告](reports/error-handling-builtins-2026-09-12.md)；Symfony Language Tools 0.20.1 的真实 Winstar 复核见 [Symfony 0.20.1 复核报告](reports/symfony-language-tools-0.20.1-recheck-2026-09-12.md)；PHP Options/Info 环境与运行时证据见 [环境与运行时目录报告](reports/runtime-environment-builtins-2026-09-11.md)；PHP 配置证据见 [PHP 配置与运行时信息报告](reports/runtime-configuration-builtins-2026-09-11.md)；运行时自省证据见 [运行时符号与扩展自省报告](reports/runtime-introspection-builtins-2026-09-11.md)；Variable Handling 证据见 [Variable Handling 内建目录报告](reports/variable-handling-builtins-2026-09-11.md)；Math 证据见 [Math 内建目录报告](reports/math-builtins-2026-09-11.md)；PCRE 证据见 [PCRE 内建目录报告](reports/pcre-builtins-2026-09-11.md)；Filter 证据见 [Filter 内建目录报告](reports/filter-builtins-2026-09-10.md)；安全函数证据见 [Password/Hash/随机数内建目录报告](reports/security-builtins-2026-09-10.md)；局部变量诊断证据见 [确定未定义变量诊断报告](reports/definitely-undefined-variable-2026-09-10.md)；未解析符号证据见 [未解析函数与常量诊断报告](reports/unresolved-function-constant-diagnostics-2026-09-10.md)；完整名称绑定证据见 [限定名称与常量大小写报告](reports/qualified-name-and-constant-case-2026-09-10.md)；补全排序证据见 [函数和命名空间常量补全排序报告](reports/function-constant-completion-ranking-2026-09-10.md)；上下文闭包证据见 [PHPDoc callable 上下文闭包类型报告](reports/contextual-closure-typing-2026-09-10.md)。下方按时间追加的旧记录保留当时的验证边界。

SPL 目录迭代器证据见 [SPL 目录迭代器内建报告](reports/spl-directory-iterators-builtins-2026-09-13.md)；SPL 高级迭代器证据见 [SPL 高级迭代器内建报告](reports/spl-advanced-iterators-builtins-2026-09-13.md)；基础迭代器适配器证据见 [SPL 迭代器适配器内建报告](reports/spl-iterator-adapters-builtins-2026-09-13.md)；MultipleIterator 证据见 [MultipleIterator 内建报告](reports/multiple-iterator-builtins-2026-09-13.md)；SPL Observer/Subject 证据见 [SPL Observer / Subject 内建报告](reports/spl-observer-builtins-2026-09-13.md)；SPL 堆与优先队列证据见 [SPL Heap / PriorityQueue 内建报告](reports/spl-heaps-builtins-2026-09-13.md)；SPL 线性容器证据见 [SplDoublyLinkedList / SplQueue / SplStack 内建报告](reports/spl-linear-collections-builtins-2026-09-13.md)；SPL 对象/固定数组容器证据见 [SplObjectStorage / SplFixedArray 内建报告](reports/spl-object-collections-builtins-2026-09-13.md)；SPL 数组容器证据见 [ArrayObject / ArrayIterator 内建报告](reports/spl-array-collections-builtins-2026-09-13.md)。

2026-09-14 Deprecated 诊断封板：PHPDoc `@deprecated` 与按 namespace/import 精确解析的内建 `#[Deprecated]` 进入统一 `php.symbol.deprecated` warning，并携带标准 LSP Deprecated tag。唯一函数、方法、构造器、类常量、Enum case、Property Hook get/set，以及 PHP 8.5 Trait use/全局常量按实际声明与目标版本报告；first-class callable、未标记覆写、自定义同名 Attribute、动态和歧义目标保持静默。静态 `message`/`since` 进入文案，版本化内建 `utf8_encode()` 与 `SplObjectStorage::attach()` 已通过真实 stdio 验证。原生声明目标额外覆盖合法闭包/箭头函数、PHP 8.5 Trait/全局常量门槛，并拒绝类、接口、Enum、普通属性、参数和匿名类；PHP 8.5 同目标 DelayedTargetValidation 会推迟非法目标检查，PHP 8.4 仍拒绝。十五个组件 606 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及 VS Code 1.137.0 打包 Extension Host 门禁均通过；使用诊断提交 `db52c3e` 的 [CI 34793080024](https://github.com/sohophp/php-companion/actions/runs/34793080024) 已通过跨平台及 PHP 7.2–8.5 矩阵。证据见 [Deprecated 符号与目标诊断验收](reports/deprecated-symbol-uses-2026-09-14.md)。

2026-09-14 PHP 8.5 `#[NoDiscard]` 封板：解析器区分整条表达式语句和 `for` 初始化/更新列表中的真正丢弃、赋值或其他表达式消费，以及 `(void)` 明确忽略；semantic 仅对唯一解析且实参兼容的用户函数/方法、Trait 实际声明和版本化原生声明发布 `php.return-value.discarded`。覆写方法不会继承 Attribute，Trait 方法会保留；字符串 `message` 进入提示。显式 void/never、无返回值 magic method，以及 void/never 闭包与箭头函数获得返回约束错误；Property Hook、类型、属性、参数、常量和匿名类等全部非法目标获得独立目标错误，同目标 DelayedTargetValidation 可按 PHP 8.5 规则推迟目标检查。经变量调用的闭包丢弃数据流仍保持 unknown。PHP 8.4 及更低不启用 NoDiscard 行为，`(void)` 单独按 PHP 8.5 版本拒绝，PHP 8.5 的 `for` 条件仍保留语法错误。九个 DateTimeImmutable 修改方法已按 PHP 8.5.9 Reflection 加入原生 Attribute。提交 `e4a42a8` 的 [CI 34790640137](https://github.com/sohophp/php-companion/actions/runs/34790640137) 通过 Linux、Windows、macOS 质量与 Extension Host 门禁及 PHP 7.2–8.5 集成矩阵；完整目标增量的最终门禁待本轮封板记录。完整证据见 [PHP 8.5 NoDiscard 验收](reports/php85-no-discard-2026-09-14.md)。

2026-09-14 PHP 8.5 属性 `#[Override]` 封板：内建 Attribute 经 namespace/import 精确解析后，直接类属性、接口属性、构造器提升属性和匿名类属性会在完整继承图中查找同名非私有祖先属性；缺失匹配时发布 `php.attribute.invalid-override-property`。Trait 声明在 PHP 8.5 单独保持静默，组合进类后按消费类的父类/接口契约检查，嵌套 Trait 同样覆盖；PHP 8.0–8.4 目标只发布属性目标版本诊断，PHP 7.x 复用 Attribute 自身的版本诊断，均不级联缺失匹配错误。PHP 8.4.23/8.5.9 运行时、semantic 和真实 stdio LSP 正反例均通过；十五个组件 596 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及打包 Extension Host 均通过。运行时、产物哈希与完整证据见 [PHP 8.5 属性 Override 验收](reports/php85-override-properties-2026-09-14.md)。

2026-09-14 PHP 8.5 常量表达式 callable 封板：Attribute、属性/参数默认值、全局/类常量中的 static 无捕获 Closure、直接函数和静态方法 first-class callable 具备 8.4/8.5 版本边界；arrow、非 static、`use` 捕获及动态 callable 在 8.5 获得稳定错误。parser 区分 Closure 获取与调用，semantic 返回 `Closure`、保留 Definition，并消除缺少必填参数误报；参数类型错误会显示实际 `Closure`。PHP 8.4.23/8.5.9 运行时、版本分析、semantic 和真实 stdio LSP 正反例均通过。十五个组件 594 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及打包 Extension Host 均通过。详见 [PHP 8.5 常量表达式 callable 验收](reports/php85-constant-expression-callables-2026-09-14.md)。

2026-09-14 PHP 8.5 静态属性非对称可见性封板：静态属性访问现在与实例属性共用直接赋值、复合赋值、自增减及读取上下文识别，按 set 可见性允许声明类内部写入并拒绝子类或全局写入，公开读取保持可用。`php.member.inaccessible` 文案会区分 read/write、static 和 `$property` 身份。PHP 8.4.23 与 PHP 8.5.9 的真实 lint/执行结果验证版本和运行时边界，parser、semantic、版本分析及真实 stdio LSP 正反例均通过。十五个组件 591 项、根扩展 33 项、十五个隔离 tarball 和三份 VSIX 内容校验均成功。详见 [PHP 8.5 静态属性非对称可见性验收](reports/php85-static-asymmetric-visibility-2026-09-14.md)。

2026-09-14 PHP 8.5 final 提升属性封板：解析器会从当前语法包的可恢复节点中保留 `final` 属性事实，并在语法包以后提供正式节点时直接消费；PHP 8.4 目标产生版本诊断且不级联属性覆写错误，PHP 8.5 目标接受，同一事实进入完整索引下的继承覆写检查。PHP 8.4.23 与 PHP 8.5.9 真实 lint 分别验证拒绝/接受边界，PHP 8.5 同时验证子类覆写被运行时拒绝。十五个组件 590 项、根扩展 33 项、十五个隔离 tarball、三份 VSIX 及打包 Extension Host 均通过。详见 [PHP 8.5 final 提升属性验收](reports/php85-final-property-promotion-2026-09-14.md)。

2026-09-13 最新封板：PHP 8.4 Property Hook 继承已覆盖完整已索引层级中的接口/抽象属性要求、get 协变、set 逆变、双向不变、独立 hook 继承、final 属性/final hook 与 `private(set)` 隐式 final；有效 `&get` 会控制数组下标修改、直接取引用、唯一解析按引用实参、属性 foreach 引用和对象 foreach 引用是否合法，向 hooked property 赋引用始终拒绝。动态或歧义目标保持 unknown。非法抽象/接口声明、virtual 默认值及 backed `&get`/`set` 组合均有稳定诊断。Semantic snapshot 升至 schema 71，持久缓存升至 v42。十五个组件 590 项、根扩展 33 项，共 623 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮继承与引用边界报告。

2026-09-14 跨平台候选门禁：提交 `c9adcf7` 的 [CI 34771375887](https://github.com/sohophp/php-companion/actions/runs/34771375887) 全部通过。Linux x64、Windows x64 与 macOS arm64 均完成 quality、十五个组件 tarball 仓库外安装、500 次编辑恢复基准、三份 VSIX 构建与内容校验；三个系统上的 VS Code 1.137.0 打包主扩展 Extension Host 均通过。PHP 7.2–8.5 运行时矩阵全部通过。三系统基准均为 0 次陈旧补全，缓存损坏恢复和重启后补全恢复通过，详细指标及原始 JSON 见 [跨平台候选验收报告](reports/cross-platform-candidate-2026-09-14.md)。随后 2026-09-15 的组合门禁补齐三系统冻结第三方 Profile；WSL Remote 自动矩阵和多小时真实项目会话仍待最终系统矩阵，因此 F13 总项保持开放。

2026-09-14 声明级 F2 封板：class、interface、trait、enum 均可从声明发起 Rename，在一次可撤销的工作区编辑中同步规范 PSR-4 文件名、声明、跨文件 import/类型引用、PHPDoc 和静态访问；普通字符串、显式 alias、大小写不同的 Enum case 与非规范重复声明保持不变。VS Code 扩展通过 `onWillRenameFiles` 将旧声明文件编辑并入文件操作；独立 LSP 客户端仍获得标准有序 `documentChanges`。同 namespace 纯文件名变化不再触发 Safe Move 的重复规划，四种类型的 Apply/Undo/Redo 均无通用错误提示。十五个组件 590 项、根扩展 33 项、十五个独立 tarball、源码/兼容/打包 Extension Host 与三份 VSIX 校验均在 Linux x64 通过；提交 `aa7c2b6` 的 [CI 34778678115](https://github.com/sohophp/php-companion/actions/runs/34778678115) 进一步通过 Linux x64、Windows x64、macOS arm64 的质量和打包 Extension Host 门禁，以及 PHP 7.2–8.5 运行时矩阵。详见 [声明级 F2 类型重命名验收](reports/declaration-f2-rename-2026-09-14.md)。

2026-09-13 R4/F13 Linux x64 门禁：真实 stdio Language Server 完成 100 次预热和 1,000 次交替类型文档更新，陈旧补全为 0；更新到诊断 P95 3.38 ms，热补全 P95 1.34 ms，立即取消 1.06 ms，最终 RSS 比基线增加 3.13 MiB。实际 semantic cache 被破坏后，重启进程明确报告并重建缓存，精确补全恢复。脚本已增加 Windows/macOS RSS 采样并接入三系统 CI。WSL Remote 和多小时真实项目会话仍待系统矩阵，因此 F13 总项保持开放。

2026-09-13 前一封板：PHP 8.4 Property Hooks 已结构化记录 hook、局部 `$this`/`$value`、backed/virtual、get/set 能力、setter 写入类型及非对称写可见性；短 setter 按真实 PHP 规则写入 backing storage。Definition、直接与复合读写、静态/readonly hook、write-only virtual 非对称可见性及 PHP 8.3/8.4 版本边界均有正反例。Semantic snapshot 升至 schema 70，持久缓存升至 v41。十五个组件 588 项、根扩展 33 项，共 621 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见基础 Property Hooks 报告。

2026-09-13 最新封板：PHP 8.3 `Type::{$name}` 会从字符串字面量、未触碰局部字符串、唯一字符串常量或纯字符串拼接解析唯一可见类常量，并提供 Definition 与 literal 类型传播；动态、修改/提前读取、不可访问、歧义或无法求值的名称保持 unknown，低版本收到明确版本诊断。Semantic snapshot 升至 schema 69，持久缓存升至 v40。十五个组件 584 项、根扩展 33 项，共 617 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮动态类常量报告。

2026-09-13 最新封板：普通 clone 与 PHP 8.5 clone-with 在操作数为可证明非 nullable 对象，且简单属性数组的声明身份、当前作用域可写性和值类型全部兼容时保留对象、Union、Intersection 与泛型身份，并进入 Completion 与 Definition；动态键、复杂值、缺失/不可访问属性和未知操作数保持 unknown。十五个组件 581 项、根扩展 33 项，共 614 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮 Clone With 报告。

2026-09-13 最新封板：PHP 8.5 `|>` 通过可证明兼容的单参数函数、静态方法、实例方法和显式闭包逐段传播返回类型，并进入成员补全与 Definition；按引用、动态、歧义、未绑定泛型、不兼容、`mixed` 和 `void` 阶段保持 unknown。未知成员不再因名称匹配当前命名空间类型产生假 Definition。十五个组件 579 项、根扩展 33 项，共 612 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮 Pipe 报告。

2026-09-13 最新封板：PHP 8.4–8.5 现代 `Dom\` 的 16 个命名空间常量、28 个类型、168/171 个显式方法和 85/89 个显式属性已进入版本化规格；包含 enum 自动成员时与 PHP 8.4.23、8.5.9 Reflection 的 171/174 个方法和 87/91 个属性一致。当前覆盖 HTML5/XML 文档工厂、selector、XPath、TokenList、集合、命名空间信息、SimpleXML/经典 DOM 导入与 PHP 8.5 新成员；同时修复命名空间内完全限定函数签名，并缓存确定的 assertion 推断子问题以消除大型 fixture 的指数重复。十五个组件 577 项、根扩展 33 项，共 610 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮现代 Dom 报告。

2026-09-13 最新封板：经典 DOM 的 45 个全局常量、PHP 7 的 20 个类型/111 个方法、PHP 8.0–8.2 的 22 个类型/122–126 个方法/87 个虚拟属性、PHP 8.3–8.5 的 22 个类型/137–139 个方法/93 个属性已进入版本化规格。当前覆盖 PHP 7 旧成员和 7.4 可选参数、PHP 8.0 mixin、8.1 tentative returns、8.2 SimpleXML 导入联合返回、8.3 WHATWG 成员，以及 8.4 DOMNode 位置常量与 XPath API；断言驱动的嵌套签名推断增加四层精度边界，消除大型 fixture 的组合爆炸。十五个组件 575 项、根扩展 33 项，共 608 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮经典 DOM 报告。

2026-09-13 最新封板：XMLReader 的 22 个常量、14 个属性和 25/28 个方法，以及 XMLWriter 的 42 个过程式函数、42/45 个对象方法已进入 PHP 7.2–8.5 版本化规格与真实 fixture。当前覆盖 PHP 7 历史参数/resource、PHP 8.1 tentative returns 与类型属性、PHP 8.3 true close、PHP 8.4 typed constants 和六个现代静态工厂。十五个组件 573 项、根扩展 33 项，共 606 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮 XMLReader/XMLWriter 报告。

2026-09-13 最新封板：XML Parser 的 22 个函数及 27/28 个常量已进入 PHP 7.2–8.5 版本化规格和真实扩展 fixture。当前覆盖 PHP 7 resource/历史参数、PHP 8.0 XMLParser 对象、8.1 结构解析返回、8.2 literal-true handler、8.3 bool option、8.4 大文档选项和原生 handler 联合类型。十五个组件 571 项、根扩展 33 项，共 604 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值见本轮 XML Parser 报告。

2026-09-13 最新封板：PHP 7.2–8.5 libxml 与 SimpleXML 已进入独立版本化规格。当前覆盖稳定 libxml 常量、错误对象与列表、external entity loader 的 8.2/8.5 边界、SimpleXML 工厂与完整公开成员，并新增无模板命名 iterable 的固定键值投影，使 SimpleXML foreach 子节点保持对象身份。十五个组件 571 项、根扩展 33 项，共 604 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。构建相关常量、工厂返回自定义子类推导边界及产物校验值见本轮 XML 报告。

2026-09-13 最新封板：PHP 7.2–8.5 mbstring 完整可调用目录与版本化常量已进入语言规范、Language Server 和真实扩展 fixture。生成目录已与本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 反射结果逐项比较，无漏项、误加项或重复声明；PHP 7.3/8.0 边界由官方源码和手册交叉确认。十五个组件 568 项、根扩展 33 项，共 601 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值和扩展裁剪边界见本轮 mbstring 报告。

2026-09-13 最新封板：PHP 7.2–8.5 Reflection 高频核心、类常量与 Enum 反射已进入最终打包产物；`ReflectionClass<T>` 从可证明类名/对象保留三个实例工厂的具体返回，动态字符串保持 unknown。方法/属性/参数/Attribute/Enum case 集合保留元素类型，版本化签名、补全与内建导航由真实 Extension Host 验证。十五个组件 566 项、根扩展 33 项，共 599 项测试通过；十五个 tarball、三份 VSIX、纯净宿主和七插件 Open Source Profile 均通过，冻结第三方目录 1,370 个文件哈希不变。产物校验值和限制见本轮 Reflection 报告。

2026-09-13 最新封板：`DirectoryIterator`、`FilesystemIterator`、`RecursiveDirectoryIterator` 与 `GlobIterator` 的版本化声明、迭代契约、可变 current mode 安全 Union 和 PHP 8.1 flags 数值边界已进入最终打包产物；十五个组件 563 项、根扩展 33 项，共 596 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮目录迭代器报告。

2026-09-13 前一封板：六种版本化泛型 SPL 高级迭代器、转换安全 Union 与模板替换后的 Union 去重已进入最终打包产物；十五个组件 561 项、根扩展 33 项，共 594 项测试通过。多扩展资源管理器 Safe Move 在完整索引前冻结旧源与目标状态，已消除移动先于规划完成时的旧 URI 丢失竞态。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮高级迭代器报告。

2026-09-13 前一封板：十一种版本化泛型 SPL 迭代器适配器、嵌套泛型对象与继承 `static|null` 调用者模板传播已进入最终打包产物；十五个组件 558 项、根扩展 33 项，共 591 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮适配器报告。

2026-09-13 最新封板：版本化泛型 `MultipleIterator<TInnerKey,TValue>`、可变 flags 的安全键值数组、PHP 7/8.0 失败返回及唯一泛型 iterable 父级投影已进入最终打包产物；十五个组件 554 项、根扩展 33 项，共 587 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮 MultipleIterator 报告。

2026-09-13 前一封板：版本化 `SplObserver` / `SplSubject` 完整接口、PHP 7.2/7.4 参数名边界和 PHP 8.1 tentative `void` 已进入最终打包产物；十五个组件 550 项、根扩展 33 项，共 583 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮 Observer / Subject 报告。

2026-09-13 前一封板：完整泛型 `SplHeap` / `SplMinHeap` / `SplMaxHeap` / `SplPriorityQueue` 规格、跨父类模板传播与可变 extract flags 的安全 Union 已进入最终打包产物；十五个组件 548 项、根扩展 33 项，共 581 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮 Heap / PriorityQueue 报告。

2026-09-13 前一封板：完整泛型 `SplDoublyLinkedList` / `SplQueue` / `SplStack` 规格与跨父类模板传播已进入最终打包产物；十五个组件 546 项、根扩展 33 项，共 579 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见本轮线性容器报告。

2026-09-13 前一封板：完整泛型 `SplObjectStorage` / `SplFixedArray` 规格与对象数组静态工厂模板反推已进入最终打包产物；十五个组件 544 项、根扩展 33 项，共 577 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与含七项第三方能力的 Open Source Profile 均通过，冻结第三方目录的 1,370 个文件哈希不变。产物校验值和限制见对象集合报告。

2026-09-13 前一封板：完整 `ArrayObject` / `ArrayIterator` 规格与 receiver template Signature Help 已进入最终打包产物；十五个组件 542 项、根扩展 33 项，共 575 项测试通过。十五个真实 tarball、三份 VSIX 内容检查、VS Code 1.137.0 纯净宿主与 Open Source Profile 均通过，冻结第三方目录的 1,371 个文件哈希不变。产物校验值和限制见数组容器报告。

2026-09-12 最新封板：`SplFileInfo`、`SplFileObject` 与 `SplTempFileObject` 已进入版本化共享规格；十五个组件 540 项、根扩展 33 项，共 573 项测试通过。TypeScript、ESLint、十五个真实 tarball、三份 VSIX 内容检查，以及 VS Code 1.137.0 的纯净与 Open Source Profile 最终打包宿主均通过；冻结开源目录的 1,371 个文件哈希不变。当前候选哈希及限制见 [SPL 文件对象内建报告](reports/spl-file-objects-builtins-2026-09-12.md)。

## 已完成

- [x] 开发目标、R0–R4 路线、P0–P9 工程任务、最终验收和组件发布规则成文。
- [x] PHP 7.2–8.5 Reflection 高频核心进入共享规格：类/对象、函数/方法、属性、参数、Named/Union/Intersection type、Attribute、类常量与 Enum 反射按版本生成；`ReflectionClass<T>` 从可证明的 class-string/对象构造实参保留三个实例工厂的具体返回，动态名称保持 unknown；集合元素进入 foreach 补全、签名和 Definition，旧 export、modifier 值、tentative returns、readonly、lazy object、property hook 与 mangled name 边界均有正反例。
- [x] PHP SPL 官方 15 项函数按 PHP 7.2–8.5 完整生成；类关系查询保留 `array<class-string,class-string>|false`，autoload 队列保留 callable list，iterator callback/args、对象 hash/id、PHP 7/8 参数名与原生返回、PHP 8.0 返回收窄、PHP 8.2 数组输入进入 Signature Help、返回传播与 Definition。PHP 8.5 `spl_autoload_unregister('spl_autoload_call')` 的调用形状弃用保持显式边界，不错误弃用整个函数。
- [x] `SplFileInfo`、`SplFileObject`、`SplTempFileObject` 按 PHP 7.2–8.5 生成构造器、继承成员、文件/CSV 失败 Union、固定 CSV 控制数组 shape 和 iterator 契约；PHP 7 `fgetss` 弃用/移除、PHP 8 参数名、PHP 8.1 CSV EOL 与 PHP 8.5 nullable write length 进入 Signature Help、返回传播与 Definition。
- [x] `ArrayObject<TKey,TValue>` 与 `ArrayIterator<TKey,TValue>` 的完整公开成员、常量、继承接口和 PHP 7.2–8.5 签名边界进入共享规格；成员 Signature Help 保留接收者模板实参，`getArrayCopy()`、`getIterator()`、`offsetGet()`、`current()` 继续驱动局部赋值、foreach、成员补全与 Definition。PHP 7.4 magic serialization、PHP 8 参数、PHP 8.2 排序 `true` 和 PHP 8.4 typed constants 均按版本选择。
- [x] `SplObjectStorage<TObject,TInfo>` 与 `SplFixedArray<TValue>` 的完整公开成员、接口和 PHP 7.2–8.5 签名边界进入共享规格；对象键、可空附加信息和可空固定槽位可跨 offset、iterator、数组转换、局部赋值、foreach、补全与 Definition 传播。`fromArray([new Item()])` 可安全反推静态 callable 模板；PHP 7.4 magic serialization、PHP 8.0 IteratorAggregate、PHP 8.1 JSON、PHP 8.2 serialization、PHP 8.4 SeekableIterator/弃用及 PHP 8.5 alias 弃用均按版本选择。
- [x] `SplDoublyLinkedList<TValue>`、`SplQueue<TValue>` 与 `SplStack<TValue>` 的完整公开成员和继承关系进入共享规格；具体值类型可跨 Iterator、ArrayAccess、队列/栈继承成员、局部赋值、foreach、补全与 Definition 传播。PHP 7 插入操作 `true`、PHP 7.4 magic serialization、PHP 8 参数与 `void` 返回及 PHP 8.4 typed constants 均按版本选择。
- [x] `SplHeap<TValue>`、`SplMinHeap<TValue>`、`SplMaxHeap<TValue>` 与 `SplPriorityQueue<TValue,TPriority>` 的完整公开成员和继承关系进入共享规格；普通 heap 值跨继承、迭代、赋值、补全与 Definition 传播，priority queue 对可变 extract flags 保留 data/priority/both Union。PHP 7/8 compare 参数、PHP 7.4 debug、PHP 8.4 typed constants/literal `true` 与 PHP 8.5 serialization 均按版本选择。
- [x] `SplObserver` 与 `SplSubject` 的完整接口进入共享规格、Signature Help 与 Definition；PHP 7.2 旧 arginfo 参数名、PHP 7.4 现代参数名和 PHP 8.1 tentative `void` 按目标版本选择。
- [x] `MultipleIterator<TInnerKey,TValue>` 的完整公开成员和 flags 进入共享规格；可变 numeric/associative flags 使用安全 array-key 容器，`MIT_NEED_ANY` 允许结束的子迭代器产生 null。直接 `current()` 与 `foreach` 的嵌套数组读取可传播具体元素类型，歧义泛型父级保持 unknown；PHP 7/8.0 失败返回、PHP 8 参数、PHP 8.1 tentative 返回及 PHP 8.4 typed constants 按版本选择。
- [x] `IteratorIterator`、五种 filter/recursive filter、`LimitIterator`、`NoRewindIterator`、`InfiniteIterator`、`AppendIterator` 与 `EmptyIterator` 的公开成员、泛型父级和 PHP 7.2–8.5 签名进入共享规格。具体键值类型可穿过继承、foreach、递归子类和 append 的嵌套 iterator；`EmptyIterator` 保留 `never` 与 PHP 8.2 literal `false`。
- [x] `RecursiveIteratorIterator`、`CachingIterator`、`RecursiveCachingIterator`、`RegexIterator`、`RecursiveRegexIterator` 与 `RecursiveTreeIterator` 的完整成员、常量、泛型和 PHP 7.2–8.5 边界进入共享规格。递归及 cache 保留具体键值；Regex 的五种模式保留原值/string/array 安全 Union，Tree 的 bypass flags 保留原值/string 安全 Union。PHP 7 参数名、7.2 `setPostfix` arginfo、PHP 8 参数类型、PHP 8.1 tentative returns、PHP 8.4 typed constants 与 PHP 8.5 树构造联合类型分别选择。
- [x] `DirectoryIterator`、`FilesystemIterator`、`RecursiveDirectoryIterator` 与 `GlobIterator` 的完整公开成员、flags、继承接口和 PHP 7.2–8.5 边界进入共享规格。目录项与 recursive child 保留实际调用类；Filesystem 可变 current mode 保持 string、`SplFileInfo` 与 iterator 自身的安全 Union；PHP 7/8 参数名、PHP 8.1 tentative returns/flags 数值变化及 PHP 8.4 typed constants 分别选择。
- [x] PHP Strings 官方 103 项 callable union 按 PHP 7.2–8.5 完整生成；模式相关的 `count_chars`/`str_word_count`、CSV list、locale shape、string/array `substr_replace`、稳定常量及 PHP 7.4/8.0/8.2/8.3 版本边界进入 Signature Help、返回传播和 Definition。调用点直接标量字面量仅在重载排序阶段保留，避免污染一般表达式推断。
- [x] PHP Filesystem 官方可调用目录完整覆盖；流、CSV/INI、锁、seek/stat、sync、process-file、临时流、路径、元数据、权限、上传和链接函数均按 PHP 7.2–8.5 生成，稳定常量、resource、引用参数、list/shape 与失败返回进入 Signature Help、返回传播及 Definition。PHP 7 `fgetss`、PHP 8.1 sync/EOL 和 PHP 8.4 CSV escape 弃用边界均保留。
- [x] PHP Filesystem 元数据、权限、上传与链接的 33 项函数按 PHP 7.2–8.5 生成；`stat/lstat` 的完整混合键 shape、realpath cache entry shape、磁盘/元数据失败返回及 PHP 7/8 参数名已进入 Signature Help、返回传播与 Definition。平台、SAPI、权限与构建条件保持显式边界。
- [x] 默认静态 Symfony 模式的路由名称补全由自研服务器在可证明源码范围内接管：覆盖 YAML 与 Attribute 声明、目录/glob 导入、exclude、映射 namespace、具名参数、字符串转义、未保存 YAML 和外部运行时提供者所有权切换；环境、本地化及运行时生成路由明确交还 Symfony Language Tools 的运行时模式，不作静态猜测。源码测试和真实组合 Extension Host 均通过。
- [x] PHP 7.2–8.5 支持矩阵按解析、事实/语义和版本诊断分栏，避免把最新 grammar 的解析能力误报为目标版本支持。
- [x] PHP Error Handling 的 14 项函数与 18 项稳定常量按 PHP 7.2–8.5 生成；backtrace/error shape、handler callable、PHP 8.2/8.4 literal `true`、PHP 8.4 `E_ALL`/`E_STRICT` 和 PHP 8.5 handler 查询门槛已进入 Signature Help、返回传播与 Definition。共享 semantic 同时支持结构化 PHPDoc array 返回安全精化 `?array`。
- [x] PHP Output Control 的 16 项函数与 13/14 项常量按 PHP 7.2–8.5 生成；单层/完整 buffer status 条件 shape、内容与长度失败返回、handler callable/null、PHP 7/8 参数边界和 PHP 8.4 processed flag 已进入 Signature Help、返回传播与 Definition。
- [x] PHP Function Handling 结合既有自省函数覆盖全部 13 项 API；动态 callback 返回保持 `mixed`，参数 list、shutdown/tick callback、PHP 7/8 参数差异、PHP 8.0–8.2 shutdown 返回迁移，以及 PHP 7.2 弃用/PHP 8.0 移除的 `create_function` 已进入版本化 Signature Help 与 Definition。
- [x] PHP Session Handling 的 23 项函数、3 项状态常量、四个 handler 类型、save-handler 重载和 callback 契约按 PHP 7.2–8.5 生成；cookie shape 覆盖 PHP 7.3 `samesite` 与 PHP 8.5 `partitioned`，`session_status()` 经安全字面量 Union 收窄为 `0|1|2`。
- [x] PHP Network 的 37 项函数与 15 项稳定 DNS 常量按 PHP 7.2–8.5 生成；DNS/header/request/network-interface shape、socket 失败返回、response-code/cookie 重载，以及 PHP 7.3/8.2/8.4/8.5 的可用性、返回收窄、options 和弃用边界已进入 Signature Help、返回传播与 Definition。平台相关 `LOG_*` 值保持显式边界。
- [x] PHP Directory 的 9 项函数、3 项稳定排序常量与 `Directory` 类型按 PHP 7.2–8.5 生成；resource/list/false 返回、PHP 7/8 参数和方法差异、PHP 8.1 readonly 属性与 PHP 8.5 final 边界已进入 Signature Help、成员传播和 Definition。构建/SAPI 条件及平台相关路径/GLOB 常量保持显式边界。
- [x] PHP Program Execution 的 11 项函数按 PHP 7.2–8.5 生成；命令 output/exit-code 引用、process/pipe resource、descriptor/status shape、PHP 7.4 array command、PHP 8 参数名、PHP 8.2 passthru 返回与 PHP 8.3 cached 状态已进入 Signature Help、返回传播和 Definition。平台与权限能力保持显式边界。
- [x] pnpm monorepo 建立 language-spec、parser、phpdoc、project、index、type-system、interop、semantic-provider、semantic-provider-host、framework-symfony、framework-doctrine、semantic、refactor、language-server 与 testkit 十五个可独立打包组件。
- [x] `@php-companion/refactor` 提供带版本/内容前置条件的编辑计划和共享 Unicode PHP 标识符校验，拒绝越界、重叠与文件操作冲突；Language Server 的接口方法/构造函数生成、类型及成员 Rename，以及 PSR-4 Safe Move 和移动后协调均消费该编辑器无关契约。
- [x] 类型 Rename 已进入统一 semantic/Language Server 路径，可从声明、直接短名、全限定名或 import 目标等唯一解析使用点发起，使用标准 LSP `documentChanges` 和同一 EditPlan 更新类型声明、原生/PHPDoc/Attribute 引用、import 路径及严格匹配的 Composer PSR-4 文件名。显式 alias 的使用名保持稳定且不作为发起点；唯一规范声明存在时会忽略路径不匹配的陈旧重复声明。真实打包 Extension Host 已验证跨文件及文件操作的一次 Apply/Undo/Redo；旧 VS Code 类型 Rename 仅在自研服务器关闭的兼容模式中保留。
- [x] 默认自研服务器路径中的 Import Class、Optimize Imports、Paste Imports 与 Resolve Imports 已迁入统一 semantic/Language Server。Import 候选按唯一 Composer 规范声明筛选，重复或无规范唯一性的声明不提供；服务器生成单个或批量 import 编辑，名称冲突时显式 alias 与粘贴文本/当前使用点同步处理。复制元数据只携带已解析类型身份，手工 Resolve 只扫描结构化未解析类型。Optimize Imports 复用标准 `source.organizeImports`，支持 grouped/FQCN 排序、删除未使用项和按类型身份去重，保留预览与单步 Undo。旧 Import/Paste 实现只在自研服务器关闭时保留。
- [x] 默认 Safe Move 命令与资源管理器文件移动已迁入 semantic/Language Server。服务器按唯一 Composer PSR-4 路径验证源与目标，拒绝语法错误、声明冲突和未保存的相关文件，生成 namespace、import、FQCN 与已证明同 namespace 引用编辑；Explorer 移动后只刷新移动前冻结的受影响文件集合，再幂等收敛其他 PHP 插件可能留下的新旧重复 import。连续双向移动、命令 Apply/Undo/Redo 和真实打包 Extension Host 均通过。主类型/文件名诊断及 Rename File Quick Fix 同时迁入 LSP；适配层旧实现仅用于关闭自研服务器的兼容模式。
- [x] 唯一解析调用的 PHPDoc `callable(Service): Return` 契约可为无原生类型的 closure/arrow 参数提供上下文对象类型；位置与具名实参均精确映射，并统一驱动成员补全、Definition 和参数类型诊断。Callable 参数模板可从同一调用的其他已证明数组/集合实参唯一专门化，覆盖 `array_map(fn($item) => …, $items)` 的 callable/null 内建重载筛选；可证明的 arrow 主体，以及由有界顺序语句、嵌套 `if/elseif/else`、`try/catch/finally`、支持直接 `break;`/`break 1;` 汇入外层后续语句的 `switch` case 贯穿，以及支持直接 `break;`/`break 1;` 汇入外层后续语句的有界 `while/do/for/foreach` 循环组成、每条可继续路径最终到达可证明 `return` 的 closure 主体，会绑定 callable 返回模板，排除明确的 throw/exit 以及唯一解析且实参兼容的原生 never 调用终止路径，并把条件提前返回与最终返回合并为 Union，使映射结果进入补全、多目标 Definition 与参数诊断。返回遍历限制为 64 个节点并服从共享控制流深度预算；重载歧义、未绑定或冲突模板、任一未知返回、函数体仍可落空、没有任何可证明返回、循环内嵌套/多层 `break` 与 `continue`、其它尚未建模控制结构内的 return、yield/goto、未解析类型、unpack、引用/variadic callback 以及参数数量不符时保持 unknown。顶层 arrow function 的局部值分析同时增加语法根终止保护。
- [x] testkit 提供 UTF-16 标记 fixture、分片 LSP framing、PHP 7.2–8.5 代表样例、性能分位统计和冻结 R1 预算。
- [x] 确定性 Composer/PSR-4 索引基准可执行并输出机器可读报告；Linux x64 的 1k/10k/50k 文件各 5 次冷索引 P95 为 1497.03/13463.54/64712.98 ms，峰值 RSS 为 115.1/168/323.8 MiB，低于对应冻结预算。
- [x] 现有 VS Code 扩展改用共享 parser 包，删除独立解析实现。
- [x] parser 提供仓库无关公开入口和默认 WASM 定位，独立 tarball 可消费。
- [x] language-server 提供 bin/stdio、增量文档同步、版本校验、语法诊断和文档符号。
- [x] VS Code adapter 已打包独立服务器入口；预览阶段曾默认关闭，当前独立安装和两个组合包均默认启用。已有 Intelephense 且用户没有显式设置时，激活策略保留旧 Provider；显式 true/false 优先。
- [x] 修复 emoji 等 astral Unicode 之前导致语法范围左移的 UTF-16 映射错误。
- [x] Changesets 与真实 tarball 隔离消费者验证建立。
- [x] 十五个组件完成 K01–K06 本地独立发布验收：统一声明 Node.js 20+、MIT、typed ESM exports、独立 changelog 与发布文件清单；内部依赖使用可转换为 caret semver 的 `workspace:^`，发布门禁检查无环图、仓库外导入、任意工作目录 WASM、真实 LS stdio 初始化及 PHP 文档查询。公开 npm 发布仍须单独确认。
- [x] `@php-companion/semantic-provider` 建立独立 schema 1 外部事实契约；Symfony 与 Doctrine 通过同一 provider 身份、generation 和带来源位置的完整快照接入，语义工作区先校验再原子替换或显式撤销，失败提交不破坏上一代事实。
- [x] `@php-companion/semantic-provider-host` 只运行 `phpCompanion.semanticProviders` 显式配置的可信命令，每轮使用独立无 shell 子进程及单请求/单响应 JSON 协议；超时、崩溃、输出超限、协议/身份/generation/完整性错误均不提交，上一代事实继续可用，移除配置则撤销该 provider。该边界提供故障隔离，不宣称 OS 安全沙箱，也不会从 Composer 或项目文件自动执行代码。
- [x] parser 结构化记录直接字符串或变量表达式动态成员名、直接接收者及可证明动态方法的调用/赋值事实；semantic 仅在名称是无插值字符串，或同一作用域内简单字符串局部变量从赋值到访问之间未被读取、重赋值且仍在有效范围时，为直接变量/类型接收者提供 Hover、Definition 与方法 Signature Help。参数数量、具名参数、已证明实参类型、PHPDoc 重载及方法模板均唯一兼容时，调用结果进入局部赋值和直接/后续成员链，并保留 nullsafe 可空性；调用结果名称、插值、已读取/重赋值、分支外、歧义、不兼容调用和复杂接收者保持 unknown；持久快照为 schema 37。
- [x] 方法和属性 Rename 会把已证明解析到目标声明族的动态字符串字面量，或其未触碰局部字符串赋值来源纳入同一编辑；动态访问已解析到无关类型时保持不变。任一同名动态名称、接收者或成员归属无法证明时，整个重构保持不可用，避免部分改名；不完整补全语法不会被 parser 误记为跨语句动态访问。
- [x] 动态成员名称支持任意括号层级和仅由无转义字符串组成的 `.` 拼接；补全、导航、签名和返回链消费折叠后的唯一名称，Rename 用覆盖首段到末段内容的单一区间把拼接原子改为新名称。变量拼接、调用、插值、转义及含注释表达式记录为 unknown 覆盖，只用于关闭可能不完整的 Rename，并抑制未解析/静态性/可见性猜测。持久快照升级为 schema 37。
- [x] 动态名称可解析唯一全局常量、可见类常量、`self/static/parent` 与常量别名链，以及 string backed Enum case 的 `->value`；循环别名安全终止。导航和调用推断消费最终字符串值，Rename 修改最终字面量来源并去重共享别名；Enum `->name` 可用于查询但因没有独立字符串来源会保守关闭方法 Rename。
- [x] `@php-companion/type-system` 建立基础类型、Union/Nullable 和三态兼容性，未知关系不误判。
- [x] type-system 增加 keyed/non-empty array、开放/封闭 shape、泛型、`list<T>`/`non-empty-list<T>`、受限/非受限 `class-string` 和 Callable；list 保留顺序整数键和非空约束，semantic 已检查直接静态数组字面量与 PHPDoc list/shape 参数，并沿同块局部赋值传播静态标量、数组、构造及已证明调用结果，可跨过不读取目标变量的纯字面量语句；完整 `if/elseif/else`、含 default 的完整 `switch` 与完整 `try/catch/finally` 合并确定性正常出口，switch 支持普通 `break`、贯穿和嵌套完整控制流，finally 支持确定覆盖及安全透传，安全 `do…while`、规范非空整数 `for`、末尾普通 break 的显式单轮循环及可证明非空 `foreach` 传播必然迭代的确定赋值；shape 递归检查必填/可选键及嵌套 shape、list、nullable、Union 字段类型；参数 shape 的数值键、局部数组的动态或稀疏数值键展开、混合键、含未知副作用或未支持控制流来源保持未知；`class-string<T>` 按完整继承关系协变并可拓宽为 string；PHPDoc 模板方差已接入泛型参数变量转发，支持逐参数协变、逆变和不变关系，`@extends` / `@implements` 直接及递归继承会显式替换和重排参数后再应用父类型方差，缺失、歧义或不完整元数据保持 unknown；Callable 实施参数逆变和返回协变。
- [x] `@php-companion/project` 静态读取根项目与已安装依赖的 Composer autoload 配置，不执行项目 PHP 或 autoloader。
- [x] `@php-companion/semantic` 对可证明的参数和 `$this` 类型提供保守成员、定义与签名查询；未知/Union 不猜测。
- [x] 类型、函数和成员统一支持 Hover/Definition；函数 References 解析 namespace、导入 alias 并排除其他 namespace 的同名函数。
- [x] 类型和方法支持 Implementation 导航；继承与接口关系可传递查找，实现结果限定在当前语义工作区。
- [x] 标准 LSP Type Hierarchy 支持从类型准备视图并逐层查询直接父类型和子类型；结果沿文档 URI 路由到所属 Composer 根，不跨多根语义空间。
- [x] 标准 Type Definition 对可证明的参数/局部变量类型和成员返回类型跳转到声明；未知、标量和无法绑定的类型返回空结果。
- [x] 标准 Semantic Tokens 对 parser/CST 已结构化确认的类型、函数、方法、参数、属性和常量声明，以及文件顶层/局部变量、当前作用域参数引用、函数调用、`new` 类型、普通/静态方法、属性/常量访问和命名实参标签分类；标准 `type` 覆盖原生对象类型、继承/接口、Trait、Attribute、`instanceof`、静态接收者、PHPDoc 类型、class import 路径和显式 alias，function/const import 使用各自类别。当前 Composer 根内恰好一个类型声明时细分 class/interface/enum，唯一全局/namespace 常量表达式分类为 enumMember；重复或未解析身份保持通用类型或静默。声明携带 declaration/static/readonly 修饰，动态成员不猜测。
- [x] 标准 Inlay Hints 对局部赋值后可唯一解析到已声明类的变量显示短类型名；Union、标量、匿名类和未知调用结果不显示。
- [x] 独立 PHPDoc AST 支持 nullable、Union、Intersection、泛型、数组后缀和 shape；`@param`、`@return`、`@var` 在原生类型缺失时接入保守推断，`array`/`iterable`/`callable` 等宽泛原生参数允许由同类别 PHPDoc 精化。
- [x] 函数和普通方法在完整可证明的生成器函数体中推导 `Generator<TKey, TValue, mixed, TReturn>`：支持无键/显式 int 或 string 键的直接 `yield`、静态数组及已声明泛型 iterable 的 `yield from`、无原生返回类型或原生 `Generator`，并排除嵌套闭包/函数的 yield。推导结果进入 Signature Help、函数/方法调用局部赋值及 foreach 值类型；原生 `Generator` 上同基 PHPDoc 泛型优先。任一 yield、键、return、委托 iterable 或递归调用无法证明时保留宽类型，不拼接局部猜测。
- [x] 原生参数、返回和属性类型与紧邻 PHPDoc 由共享类型代数校验运行时边界；`php.phpdoc.type-conflict` 只在完整索引证明文档类型不属于原生类型时标记精确类型范围。对象子类、`class-string`、array/list/shape、Callable、泛型方差、PHP 原生 `int` 到 `float` 及 `iterable` 关系进入同一判断；合法精化、未解析或不完整关系、条件/模板等未支持类型和残缺注释保持静默，并支持逐代码关闭与严重性覆盖。
- [x] 类型兼容性默认限制 256 次递归比较并允许调用方收紧；semantic 的 PHPDoc/原生类型转换限制 256 个展开节点、泛型父类型替换限制 64 层、模板替换结果限制 8 KiB。预算耗尽统一转为 unknown；PHPDoc 冲突查询在声明或继承文件更新后直接用当前工作区事实重算，测试覆盖合法→冲突→合法的失效往返及 300 层输入抑制。
- [x] PHPDoc/原生冲突查询按类级后 callable 级顺序建立模板作用域，内层同名模板遮蔽外层；`T of Bound` 可沿其他模板传递解析，无 bound 模板按 mixed 上界判断，循环、无效或不完整 bound 抑制。参数、返回和模板属性均复用同一规则。
- [x] 常量别名、构造器查找、完整层级、具体方法集合、变量/别名来源、iterable 泛型、泛型父类型、成员聚合和子类型关系等递归语义图入口统一限制为 64 层；边界内保持精确，超限返回 unknown/空结果。测试覆盖 63 层继承和 60 层变量别名仍可解析，以及 65/70 层安全抑制。
- [x] Extract Variable/Method、Inline Variable 和 private 参数定位使用最多 100,000 节点、256 层的迭代 CST 遍历；readonly 属性扫描及前向控制流使用相同显式预算，超限时清除本轮派生摘要并抑制整项诊断。测试验证 180 层合法块嵌套仍精确报告，300 层安全返回空结果。
- [x] 局部静态值合流限制为 16 层；调用参数展开、闭包/Callable 调用和成员链的 CST 定位复用有界迭代遍历，工厂返回前向流也限制节点数与深度。测试验证 8 层完整条件仍传播精确 string，20 层异常输入在约 0.4 秒的专项测试内抑制参数诊断。
- [x] constructor/factory 派生摘要按变更文件中的 callable、类型和 extends/implements/Trait 依赖闭包定向失效；类型声明拓扑变化撤销负工厂缓存，闭包超过 64 轮回退全清。计数 parser 的隔离测试证明首次查询建立摘要、无关文件保存产生 0 次工厂重解析、目标 callable 保存后重新解析。
- [x] PHPDoc `array<TKey,TValue>` / `non-empty-array<TKey,TValue>` 使用结构化 keyed/non-empty array 关系；静态数组实参分别检查 key/value，sealed shape 只有必填字段才能证明非空，仅可选字段确定不满足，开放 shape 保持 unknown。
- [x] PHPDoc AST 保留有符号整数 literal，`int<min,max>` 转为共享 integer-range。安全整数直接实参精确检查边界，range 子类型要求完整包含并可拓宽为 int；动态 int 到窄 range 保持 unknown，倒置/非安全边界抑制。PHPDoc/类型系统/semantic 正反例覆盖。
- [x] 结构化 `array<K,V>` / `list<T>`、封闭 PHPDoc array shape、唯一解析的静态短数组类常量、层级完整且全部可见常量均可静态求值的 `Class::*`，以及已索引 backed Enum，其 `key-of<...>` / `value-of<...>` 投影为数组键/值、list 的 int/T、shape 键/字段类型或精确标量值 Union。投影和 Enum backing 必须匹配原生参数；简单直接字符串/安全整数键精确校验，动态同类标量保持 unknown，unit Enum 或任一动态、不支持、不完整常量使投影静默。
- [x] 静态数组 literal 与类常量投影具有独立 256 节点预算；300 层嵌套反例在耗尽时整体保持 unknown。
- [x] 命名对象到原生 `iterable`/`callable` 不再由基础种类直接判否：semantic 沿已声明关系证明 `Traversable`/`Iterator`/`IteratorAggregate`/`Generator`，并从真实公开非静态 `__invoke` 证明 invokable；已完成层级且无契约才判不兼容，不完整层级返回 unknown。PHPDoc 冲突和实参诊断均覆盖集合/invokable 正例与普通类反例。
- [x] PHPDoc/原生冲突专用运行时上界覆盖 `positive-int`/`negative-int`/非正负整数、`non-empty-string`/truthy/numeric/literal/大小写字符串、`numeric`/`number`、`scalar`、`array-key`、`non-empty-array` 及 `integer`/`boolean`/`double`/`real` 别名；合法原生上界不报，包含越界分支时精确报告。宽化仅用于冲突证明，不替代普通精细推断。
- [x] PHPDoc AST 结构化保留参数或模板主题的 `is` / `is not` 条件类型，包括 Callable 返回位置。semantic 在唯一函数、静态方法和实例方法调用形状及全部已声明实参通过后求值；未提前读取、重赋值或按引用传递的 PHPDoc Callable 参数也按位置/具名实参求值。布尔字面量和完整对象关系选择确定分支，模板先完成现有推断与 bound 校验，未知条件合并两侧返回 Union；嵌套条件把同一参数的布尔或有限 Union 分支约束传入内层并关联 `is` / `is not`，父类型可能匹配目标子类时保留两侧；结果沿局部赋值进入补全与 Definition。无法解析的分支、不完整层级、不稳定 Callable 绑定和不唯一调用保持 unknown，并由 stdio 与真实 Extension Host 覆盖。
- [x] PHPDoc AST 支持 Callable 参数名、可选/variadic 标记和返回类型，兼容前置/后置 variadic 写法，并对未完成 Callable 输入返回结构化错误。
- [x] PHPDoc AST 区分无条件 PHPStan/Psalm `assert`、`assert-if-true/false`、`!null` / `!false` / `!true` / `!Type` / `!Generic<T>` / `!(A|B)` 否定类型，并结构化保留 `$parameter->property` 路径；semantic 对唯一函数或唯一解析方法的独立直接调用、直接 `if` 调用、`while` 或有条件 `for` 的 truthy/falsy 循环体，以及 `while`、有条件 `for`、`do…while` 和普通条件中整个条件结果能逻辑推出单次调用结果的合取真分支/析取假分支、短路求值已证明左侧结果的右操作数及无 goto 且主分支/elseif/else 的直接 return/throw/exit、完整嵌套 `if/elseif/else`，或 finally 必然终止/try 与全部 catch 均终止的 `try/catch/finally`，或含 default 且每个入口沿贯穿路径均终止的 `switch`，或首轮必然终止的 `do` 及无退出跳转的恒真 `while/for` 结果使所有可继续路径一致证明条件真值的同块继续路径，按位置或具名变量实参收窄已声明非引用参数。直接属性正类型断言支持逐级可见的单/多层属性链和局部读取；方法 `$this->property` 正断言可映射到直接非 nullsafe 变量接收者，并支持类内可见属性。任一祖先属性写入、根变量重赋值、链上方法调用或传入函数后失效。Callable 模板可从 `class-string<T>` 等已支持参数结构推断，并且只在绑定唯一、bound 与全部实参兼容时专门化参数或属性断言，包括属性 `!T` 减法。`!null` 从参数或逐级可见属性路径的单一 nullable 对象移除 null；`!Type`、`!false`、`!true`、基础类型、泛型、交集及否定 Union 从参数或属性终点的有限 Union 中减去已证明匹配的类型，并只在剩余唯一对象类型时暴露成员；泛型排除复用声明方差和泛型父类型替换，且保留唯一剩余泛型实参。嵌套条件对同一参数共享布尔与有限 Union 约束，并在位置或具名映射证明不同形参绑定同一直接变量时共享跨参数约束；不同变量和复杂表达式保持独立。嵌套括号、否定条件和普通 else 受支持；循环体内修改立即失效，循环出口和 `do…while` 首轮主体不继承尾部条件事实。stdio 与真实 Extension Host 验证成员补全/Definition 及不完整分支、无法证明的分支、条件外不泄漏。不可见属性、无法唯一化的否定属性、歧义/越界模板、无法唯一化或关系不完整、动态/重复函数或方法、unpack、引用参数、未支持控制流及后续可能修改保持 unknown；parser 缓存独立调用及归一化蕴含分支范围，semantic 快照为 schema 37。
- [x] PHPDoc 类模板按声明顺序绑定已知对象实参并验证 `of` 对象约束，方法返回模板可精确替换并继续成员链；函数和普通方法的 Callable 级模板还能从位置、具名、variadic、直接或一次未触碰局部静态数组展开、静态基数组上连续 `[]`/整数键写入构造的未读取局部位置数组展开、确定性字符串键写入构造的封闭局部 shape 展开、未触碰非引用参数的封闭全必填具名 shape 展开及直接/nullable/array/list/class-string/shape/同基泛型、完成参数替换与重排后的直接或传递父泛型实参递归推断返回替换；受支持结构任意层级的 Union 泛型实参逐分支保留完整绑定方案、分别复核 bound 与专门化参数并组成相关返回 Union，覆盖协变、不变及多模板同时变化；同时验证重复绑定、必填参数和调用形状。宽泛/可选参数 shape、已使用的参数数组、局部数组的动态或稀疏键、无法证明的修改、超过 64 个绑定组合、Union 分支结构/模板集合不一致、继承路径歧义、冲突绑定、对象身份或约束无法证明时不推断。
- [x] PHPDoc `array{key: Type}` 的已知字符串/整数键可直接或经局部赋值驱动对象成员补全；可选键只在显式 `?->` 下使用，缺失键或动态索引保持未知。
- [x] 直接属性读取赋值传播对象类型，例如 `$repo = $this->repository`；公开/当前作用域可见性、nullable 属性和 nullsafe receiver 均沿用成员解析规则，nullable 结果只允许后续 `?->`，私有外部属性和对 nullable receiver 的普通 `->` 保持 unknown。stdio LSP 已验证构造注入对象的属性转局部变量链。
- [x] 局部赋值可沿完整、静态可证明的属性/方法混合链传播，例如 `$mailer = $this->provider()->holder->mailer`；链上逐步复用成员可见性、泛型方法模板、字面量方法返回与 nullsafe 规则，中间任何缺失成员或 nullable 普通访问会使整条赋值保持 unknown。stdio LSP 已验证四步混合链。
- [x] PHPDoc `callable(...): Type` 参数在局部直接调用并赋值时传播对象返回类型；位置/具名实参、variadic 收集、直接静态数组及一次直接静态数组局部赋值后的未触碰变量展开及未触碰非引用参数的封闭全必填具名 shape 展开按参数名称、必填/可选和逐项类型验证，复用继承、泛型方差、调用文件 strict/weak 标量及 `mixed` 规则；同作用域一次直接赋值且未再使用/重赋值的单层别名可继续传播。类型不兼容或无法证明的非 mixed 实参、宽泛/可选/整数键/已使用或已修改的参数数组、复杂别名和无法证明的返回保持未知。
- [x] PHPDoc `list<T>`、`array<K,V>`、`T[]` 和同质 array shape 的对象元素可传播到 `foreach` 值变量；混合 shape、未知 iterable 和 key 类型不猜测。
- [x] parser 支持多 namespace、函数、方法、参数、属性、提升属性、类常量和原生返回类型；LSP 文档符号包含对应成员。
- [x] semantic 区分方法、实例/静态属性和类常量，完成可见性过滤、PHPDoc 返回链和类型级基础 References。
- [x] 简单赋值传播覆盖 `new`、变量复制、函数调用、静态工厂和已知对象成员调用；多 namespace 文件按调用所在函数绑定名称。
- [x] project 静态读取根项目及依赖的 PSR-4、PSR-0、classmap、files；独立 index 包在固定文件/大小预算内向语义消费者提供快照。
- [x] Composer 2 `vendor/composer/installed.json` 的 `install_path` 用于定位 path repository/自定义安装位置，避免把 symlink 包错误固定到 `vendor/name`。
- [x] index 按根包和每个依赖各自的 Composer `exclude-from-classmap` 规则过滤扫描，支持 `*`、`**` 和隐式递归后缀。
- [x] language-spec 提供首批 PHP 7.2–8.5 共同核心类签名，并按目标版本生成标准异常树、DateTimeInterface/DateTime/DateTimeImmutable/DateTimeZone/DateInterval/DatePeriod、Iterator/IteratorAggregate/Traversable、ArrayAccess、Countable、JsonSerializable、Serializable、SPL 迭代器、Closure、Generator、ArrayObject/ArrayIterator、WeakReference/WeakMap、Stringable 和 UnitEnum/BackedEnum。Date/Time 工厂、异常、常量、微秒 API 与 DatePeriod 接口变化按 7.3/8.0/8.2/8.3/8.4 门控；DatePeriod 三个构造重载支持按位置、命名和已证明实参类型筛选，固定 iterable 契约把 foreach 值传播为 DateTimeInterface。继承成员、构造签名、可见性/final 约束、tentative return type 的保守 PHPDoc 表达及 Iterator/Generator 泛型进入共享语义；全限定泛型与原生类型正确精化，Stringable/Enum 自动接口和 stdClass 动态属性规则生效。全局内建类型支持补全、签名、诊断和只读虚拟定义跳转。
- [x] language-spec 的首批字符串目录覆盖 `strlen`、`substr`、四类位置查找、PHP 8.0 contains/starts/ends、trim/大小写、replace、explode、implode/join、sprintf、HTML 转义、换行/折行、单词大小写、str_split/pad/reverse/compare 和 strtr；PHP 8.0 的失败返回、参数及函数可用性与 PHP 8.1 HTML flags 默认值按目标版本生成。全局函数 Signature Help 支持多候选，完整调用按形状和已证明类型绑定具体声明；implode/join/strtr 以关联重载避免无效 Union 组合，PHP 8 旧式反向 implode 可得到规范签名与错位参数诊断。
- [x] Trait precedence、alias、visibility 进入结构化 AST 和成员组合；私有 Trait 成员按宿主类访问，冲突排除后仍可通过 alias 使用。
- [x] `self`、`parent` 与晚期静态绑定返回链分开解析；闭包和箭头函数采用最小词法作用域，外层赋值不会错误泄漏。
- [x] 闭包 `use` 捕获进入结构化作用域：按值捕获可安全继承类型，按引用捕获保持未知；箭头函数按语言规则隐式继承外层变量。旧语义快照会被拒绝并安全重建。
- [x] 匿名类获得按文档 URI 和源码位置隔离的稳定身份，可提取自身/继承成员并传播给局部赋值；不会暴露为全局类型或工作区符号。
- [x] Language Server 动态监听 PHP/Composer 变化，保护未保存覆盖，并在完整重建后清理失效磁盘快照。
- [x] LSP 高频读取请求在异步边界检查取消令牌，Workspace Symbol 的协议取消在冻结的 100 ms 预算内返回空结果；快速连续编辑只允许当前文档版本发布诊断。
- [x] VS Code adapter 使用独立可测的服务器恢复策略：60 秒内最多自动重启三次，第四次停止，重复协议错误转入关闭流程；Extension Test 已让服务器确认请求后以非零状态退出，并验证重启后的真实成员补全恢复。
- [x] 支持标准 LSP Work Done Progress：Composer 项目发现、逐根索引和就绪状态可见，客户端取消进度会进入发现与源码分析共用的取消条件，结束事件始终成对发送。
- [x] `vscode-remote` workspace 的 URI 可转换为服务器侧路径，index 由 adapter 注入路径到 URI 映射；Definition、打开文档覆盖、文件失效及补全保持远程 scheme/authority，旧 file-only 缓存安全重建。
- [x] 每个 workspace root 使用独立语义空间并按最深根路由查询；相同 FQCN 不跨项目串线，Workspace Symbols 单独聚合。
- [x] 工作区内嵌套 Composer 根会有界发现并按最深根使用独立语义空间；跳过 vendor/VCS/node_modules，取消或达到目录/项目预算时显式返回不完整状态。
- [x] 索引取消检查覆盖目录发现和文件分析两个阶段；发现期取消不会发布部分索引。
- [x] 文件预算按根项目源码与依赖分层：根项目自身超限仍拒绝部分发布；只有依赖超限时才按稳定顺序截断，并将 `projectComplete` 与全量 `complete` 分开报告。Winstar 默认 10,000 文件预算实测先保留全部 1,638 个项目/测试 PHP 文件，再填充依赖到预算，不再因大型 vendor 树返回 0 文件；不完整索引继续抑制需要全量证明的诊断与 Twig interop。
- [x] `declare(strict_types=1)` 文件中的直接 bool/int/float/string/空数组字面量进入参数、return 与类型属性赋值兼容检查；未重赋值且类型已声明的参数变量可作为共享类型事实，mixed 保持 unknown；弱类型文件保留 PHP 标量强制转换，其他变量、调用和复合表达式未证明时不猜测。唯一函数和普通方法的声明返回只在必填/具名/variadic 形状有效且每个有类型实参可证明兼容时传播，直接或一次未触碰局部静态数组展开按整数位置键和合法字符串参数名校验，同块静态基数组上连续 `[]`/整数键写入构造且未读取的局部位置数组也保留逐项类型，未触碰非引用参数的封闭全必填具名 PHPDoc shape 也可展开；无类型/`mixed` 参数仍接受动态值，宽泛/可选参数 shape、已使用参数数组、局部数组的动态或稀疏键、无法证明的修改和无效调用保持 unknown。semantic、stdio LSP 与 VS Code Extension Host 已覆盖。
- [x] PHP 版本门槛进入 `php.version.unsupported` 稳定诊断；当前覆盖箭头函数、Union、Attribute、属性提升、match、named argument、PHP 8.0 `mixed`/`static` 返回类型、Enum、Intersection、PHP 8.2 `true`/独立 `false`/独立 `null`/`false|null`/`?false`、readonly 和 typed class constant。
- [x] 跨 namespace 类型补全覆盖构造、继承、参数、返回、属性、catch 与 Attribute；候选通过 `additionalTextEdits` 插入 `use`，alias 冲突时不猜测。
- [x] 函数补全覆盖同 namespace、全局函数、`use function` alias 与跨 namespace 候选；外部候选使用 `additionalTextEdits` 插入精确 `use function`。
- [x] namespace 常量进入 parser/semantic/LSP：支持顶层符号、补全、Hover、Definition、References、`use const` alias 和跨 namespace 自动导入；类常量仍按静态成员处理。
- [x] Signature Help 支持成员、静态方法、构造函数和导入函数；Workspace Symbols 有界返回类型、函数与成员。
- [x] 命名参数 Signature Help 可按乱序参数名定位，补全仅返回尚未使用且前缀匹配的参数名。
- [x] 同文件重复类型、命名函数、方法、属性、namespace 常量和类常量使用稳定诊断代码，并只标记后续声明；类型/函数/方法身份大小写不敏感，属性和常量保持 PHP 的大小写敏感规则，常量提示准确区分作用域。
- [x] 构造器/析构器的确定编译期契约使用 `php.method.invalid-magic-signature`：两者不可 static 或声明原生返回类型，析构器不可接收参数；同一方法的多个违规合并为一个方法名诊断，合法构造参数、无参析构器和语法残缺输入保持静默。PHP 8.5 运行时对照、单元正反例和打包 Extension Host 覆盖。
- [x] `php.method.invalid-magic-signature` 进一步覆盖 `__clone`、`__toString`、`__get`/`__set`、`__isset`/`__unset`、`__call`/`__callStatic`、`__sleep`/`__wakeup`、`__set_state`、`__debugInfo` 及目标 PHP 7.4+ 的 `__serialize/__unserialize` 精确参数数量、引用/variadic 标记、语言强制静态性、已声明 string/array 参数的逆变边界及返回类型；PHP 7.3 及以下的序列化同名方法保持普通方法语义。参数契约接受 `mixed`、含期望类型的宽 Union 和 array 的 `iterable` 超类型；返回契约接受目标版本支持的 `never`、bool 的 `true`/`false`，以及 nullable array 的 `array`/`null` 协变；`__set` 的第二参数等 PHP 实际未强制位置不猜错。PHP 7.2/8.5 运行时对照、单元正反例、残缺输入抑制和打包 Extension Host 覆盖。
- [x] 非 public 标准魔术方法使用独立 Warning `php.method.magic-visibility`，只标记方法名；构造器、析构器与 `__clone` 保留 PHP 允许的非 public 可见性，目标 PHP 7.3 及以下不把 `__serialize`/`__unserialize` 当作受约束魔术方法，残缺输入保持静默。PHP 8.5 运行时 Warning 对照、目标版本单元反例和打包 Extension Host 覆盖。
- [x] PHP 8.1+ Enum 的非法成员使用 `php.enum.invalid-member`：实例/静态属性通过受限 CST 错误恢复精确标记变量名；完整索引中唯一解析的直接或嵌套 Trait 闭包一旦证明属性，就在 Enum 的直接 Trait use 名称上报告属性来源；语言禁止的构造/析构/克隆、属性重载、睡眠/序列化、字符串转换及调试魔术方法精确标记方法名；Enum 直接声明 `cases()` 一律非法，backed Enum 直接声明 `from()`/`tryFrom()` 非法。case、类常量、无属性 Trait、Trait 中由引擎合成 API 覆盖的同名方法、unit Enum 的 `from()`/`tryFrom()`、`__invoke`、`__call`、`__callStatic` 合法，缺失/重复 Trait 身份保持静默，禁用方法不再级联魔术签名或可见性诊断。CST 恢复遍历有 100,000 节点预算，Trait 图有 64 层预算；普通语法错误、方法体错误、残缺声明及目标 PHP 8.0 保持原有语义。PHP 8.5 运行时对照、单元正反例和打包 Extension Host 覆盖。
- [x] PHP 8.1+ Enum case 契约使用 `php.enum.invalid-case` 并只标记 case 名称：非 backed case 不可带值，backed case 必须带值；直接 string/int/float/bool/null 字面量可证明与 `int`/`string` 背书类型不一致时报告，同一 Enum 内字节完全相同且类型匹配的后续字面量值报告重复来源。常量、运算及其他复杂表达式保持 unknown，避免执行项目 PHP；目标 PHP 8.0 和残缺输入不产生级联。PHP 8.5 的声明期与首次访问/`from()` 延迟失败均已对照，单元正反例和打包 Extension Host 覆盖。
- [x] PHP 8.1+ Enum 接口契约使用 `php.enum.invalid-interface` 并标记 implements 名称：显式直接实现引擎自动提供的 `UnitEnum`/`BackedEnum` 非法；直接或唯一解析、64 层以内的接口继承图包含 `Serializable` 非法；非 backed Enum 实现 `BackedEnum` 子接口非法。扩展 `UnitEnum` 的普通接口可由 unit/backed Enum 实现，扩展 `BackedEnum` 的接口可由 backed Enum 实现；缺失、重复或超预算接口图保持 unknown。namespace 同名接口、全限定名称和 import alias 按解析后的完整身份区分。PHP 8.5 运行时直接/传递对照、单元正反例和打包 Extension Host 覆盖。
- [x] 抽象方法的确定编译期契约使用 `php.method.invalid-abstract-declaration`：abstract 方法与 interface 方法不可包含方法体，含 abstract 方法的 class 必须声明 abstract，非 abstract 方法必须包含方法体，abstract 不可与 final 共存，interface 方法不可 final 且必须 public，private abstract 仅在 Trait 契约中合法；同一方法的多个违规合并到方法名范围。PHP 8.5 运行时对照、合法 public interface/static abstract/Trait private abstract 反例、残缺输入抑制和打包 Extension Host 覆盖。
- [x] `php.type.invalid-declaration` 精确标记原生类型原子：参数不可使用 `void`/`never`/`static`，普通及提升属性不可使用 `callable`/`void`/`never`/`static`，`void`/`never`/`mixed` 不可组成 nullable、Union 或 Intersection；`never` 从目标 PHP 8.1、`mixed` 从 PHP 8.0 才作为关键字应用规则，PHP 7.2 的同名 `never` 类已由项目运行时验证合法。结构化 CST 遍历限制为 100,000 节点，语法残缺或预算耗尽时不发布部分结果；单元正反例和打包 Extension Host 覆盖。
- [x] `php.type.redundant-declaration` 精确标记复合声明中的后续重复原生类型、同一 Union/Intersection 层级内大小写不敏感的重复完整类名、与 `bool` 同现的 `true`/`false`、`true|false` 的后一个字面量、与 `iterable` 同现的 `array` 或显式全局 `\Traversable`，以及平坦 `object|Class` 的类分支；Intersection 中结构化确认的标量/内建非类原子由 `php.type.invalid-declaration` 标记。原生身份和完整类名按大小写不敏感规则比较，限定名不拆段，也不跨相对/绝对写法猜测等价；PHP 8.0 Union、8.1 Intersection、8.2 DNF/`true` 版本门槛分别生效。`bool|null`、`iterable|Countable`、namespace 内自定义 `Traversable`、`A&self`/`A&parent`、不同完整类名、旧目标版本及残缺类型不产生级联诊断；PHP 8.5 运行时对照、单元正反例和打包 Extension Host 覆盖。
- [x] `php.type.invalid-relative-scope` 精确标记类型声明作用域外的 `self`/`parent`/`static`，以及无显式父类型的 class/interface 和 enum 中的 `parent`；Trait 的 `parent` 与有父类/父接口声明保持合法。原生类型、`instanceof`、`new` 和相对静态接收者共用结构化范围；语法残缺时静默。Parser、语言服务器单元正反例和打包 Extension Host 覆盖。
- [x] 唯一 Composer PSR-4 映射下提供稳定 `php.namespace.psr4` 诊断和首选 Quick Fix；重叠映射、多 namespace 与语法错误时抑制，预览 LS 启用后旧诊断所有者让位。
- [x] `new`、原生参数/返回/属性类型、继承/接口、Trait、`instanceof` 与静态接收者中的确定类型名在完整索引后提供 `php.type.unresolved` 诊断；只有零声明匹配才报告，`self`/`parent`/`static`、Attribute、索引取消/超限/构建中、语法错误和字符串内容保持静默。
- [x] 显式限定、`namespace\` 和精确 `use function`/`use const` alias 绑定的命名空间函数与常量在完整索引后提供 `php.function.unresolved` / `php.constant.unresolved`；函数身份大小写不敏感、常量身份大小写敏感。未限定全局候选、动态调用、语法错误和未完成索引保持静默，避免把尚未收录的 PHP 扩展符号误报为缺失。
- [x] 命名函数、方法、显式闭包与箭头函数内提供 `php.variable.undefined` Warning，只报告当前位置之前没有任何可能定义来源的确定缺失变量。参数、顺序/引用赋值、分支可能赋值、foreach/catch/global/static、已解析按引用参数、未解析调用参数、按值/按引用闭包捕获、箭头自动捕获、PHP 预定义变量，以及 `isset`/`empty`/`unset`/`??` 安全读取均有正反例；include/require、动态变量和 `extract`/`eval`/`parse_str` 后保持静默。该本地诊断不等待项目索引，语法错误时不级联。
- [x] 已知接收者且继承链完整时，确定缺失的方法、静态属性和类常量提供 `php.member.unresolved` 诊断；未知/Union、nullable 非安全访问、实例动态属性、魔术成员、枚举合成成员和缺失父类时抑制。
- [x] 类级 PHPDoc `@property` 与 `@method` 结构化进入 semantic 魔术成员表，提供实例/静态成员补全、参数签名、链式返回类型和指回标签的 Definition；同名 `@method` 重载先按参数数量与具名实参筛选，再以已证明的标量/对象实参类型按精确匹配、继承兼容、弱标量转换排序，唯一最佳匹配才传播返回链，歧义时 Signature Help 保留全部最佳候选且返回类型保持 unknown；PHPStan `method<T of Bound, U = Default>(...)` 方法模板可从 `class-string<T>` 等参数结构推断，复核 bound、默认值与全部参数后专门化返回；真实 PHP 声明覆盖全部同名注释成员；`@property-read` 可读取和链式导航但所有写入均诊断，`@property-write` 使用独立写入类型检查赋值且不生成读取链，同名成对标签合并并保留各自读写类型；未声明动态名称保持 unknown。快照升级为 schema 37。phpdoc、semantic、stdio LSP 与真实 Extension Host 覆盖。
- [x] 已知接收者且继承链完整时，非静态方法/属性被静态访问提供 `php.member.non-static-access`，不可见的 private/protected 成员提供 `php.member.inaccessible`；可访问继承路径和 `__call`/`__callStatic`/`__get`/`__set` 魔术接管时抑制，且不会与未解析成员重复报告。
- [x] `phpCompanion.diagnostics.disabledCodes` 可按稳定代码关闭自研服务器诊断，`phpCompanion.diagnostics.severity` 可逐代码覆盖 error/warning/information/hint/off；客户端同步配置变化后，服务器立即重算所有已打开 PHP 文档。
- [x] 唯一解析的函数、方法和构造调用在缺少必填参数时提供 `php.argument.missing-required`；正确的位置/命名参数、默认值和 variadic 被识别，参数展开、嵌套调用、未知命名参数、重复函数或动态目标时抑制。
- [x] PHP 8.0+ 唯一解析调用中的未知命名参数提供 `php.argument.unknown-named`，参数名按 PHP 规则区分大小写且范围精确；variadic、参数展开、嵌套调用、重复函数、动态目标和 PHP 7.x 时保守抑制。
- [x] PHP 8.0+ 的重复命名参数、命名参数后的普通位置参数和参数展开分别提供稳定诊断；这些调用级确定错误不依赖目标解析，PHP 7.x 仅保留版本诊断。
- [x] 补全详情、Document Symbol、Hover 与 Signature Help 保留参数的引用、variadic 和默认值语法。
- [x] 类上的 Code Action 可生成已解析接口中确实缺少的方法，原样保留单行接口签名的引用/variadic/default/返回类型，并跳过已有继承实现、未解析层级和复杂多行签名。
- [x] 具体类未实现完整继承链中的抽象父方法时提供稳定 `php.class.missing-abstract-method` 诊断与 Code Action；已有中间层具体实现会消除要求，抽象子类不报告诊断，单行签名原样生成并与接口动作去重。
- [x] 类上的 Code Action 可为无父类、无 Trait、无既有构造函数的安全子集生成构造函数；只接收有类型、无默认值、非静态且以分号声明的属性，通过统一 EditPlan 应用并支持单步 Undo，继承构造与属性 hook 场景不提供操作。
- [x] 类上的 Code Action 可为完整继承链中的有类型、非静态、分号属性生成缺失的 `getX`/`setX`；既有或继承方法不会重复，readonly 属性/类只生成 getter，属性 hook 不参与。真实 Extension Host 已验证四个访问器的应用和单步 Undo。
- [x] 具名单继承类可对完整继承链中的 public/protected 单行具体方法逐项生成 Override，保留签名、默认值和 variadic 转发，按 void/never 与有返回值生成正确的 `parent::` 调用；private/final/abstract/魔术/已覆盖方法不提供动作。真实 Extension Host 已验证候选排除、应用和单步 Undo。
- [x] 完整继承链中已声明的同名方法会校验静态性、可见性、必填/可接受参数数量、引用、variadic、参数逆变与返回协变；只在原生类型和类关系可证明时发布稳定 `php.method.incompatible-override`，未索引外部类型及晚期静态类型保持未知并抑制。原生签名与 PHPDoc 精化分别保存，避免文档类型制造运行时兼容误报。
- [x] 继承 final 类发布 `php.inheritance.final-class`，覆盖 final 方法由 `php.method.incompatible-override` 报告；直接同一语句块中无条件 return/throw 后的每条语句发布 `php.control-flow.unreachable`。复杂分支合流与 break/continue 暂不推断，真实 Extension Host 已验证三类诊断。
- [x] 唯一解析的 extends/implements/Trait use 关系会校验声明种类，class/interface 继承、class/enum 实现及 Trait 引用错误发布 `php.inheritance.invalid-type-kind`；正确、未解析和重复目标保持静默。
- [x] 完整唯一解析的 class/interface extends 环和 Trait use 环发布 `php.inheritance.cycle`，覆盖跨文件及自环；断链、声明种类错误、重复目标和 64 层预算耗尽保持静默。
- [x] 唯一解析的 interface、Trait、enum 与 abstract class 被 `new` 时发布 `php.instantiation.invalid-target`；普通 class、未解析名称和重复目标保持静默。
- [x] 唯一完整类链中的自有或继承 private/protected 构造器执行作用域可见性校验并发布 `php.instantiation.inaccessible-constructor`；private 工厂和 protected 父子类族访问合法，不完整、循环或重复层级保持静默。
- [x] `php.import.unused` 仅报告可独立删除且在代码/PHPDoc 中均无别名使用的单项 import；注释/字符串不被误认成语义使用，group use 保守留给 Optimize Imports。Quick Fix 通过 EditPlan 删除整行，真实 Extension Host 已验证诊断、应用和单步 Undo；语义快照升至 schema 11 保存注释/字符串范围及原生签名并隔离旧缓存。
- [x] 自研 Language Server 可从非魔术 private 方法声明发起 Rename；请求内确保完整索引，只编辑直接解析到同一方法的声明/调用，并拒绝非法 Unicode PHP 标识符、同类名称冲突及调用点发起。字符串、反射和动态成员名明确不改写；类型和方法 Rename 现已共用服务器语义入口，真实 Extension Host 已验证两处编辑和单步 Undo。public/protected 方法的继承族能力见后续独立条目。
- [x] 完整索引后，非抽象类缺失已解析接口方法使用稳定 `php.interface.missing-method` 诊断；抽象类、索引不完整或层级不完整时不误报。
- [x] index/semantic 建立版本化持久快照，按文件元数据复用、损坏回退、原子写入并按目标 PHP 版本隔离；VS Code 缓存位于扩展全局存储目录。
- [x] 打开的未保存 PHP 内容优先于磁盘；文档关闭后恢复已索引磁盘版本，避免关闭文件导致项目符号消失。
- [x] P5a 首批控制流支持直接正向 `instanceof` 和严格 `!== null` 分支；收窄范围限定在正向 body，nullable/Union 在分支外不提供成员猜测。
- [x] P5a 支持可证明的提前退出守卫：否定 `instanceof` 后 `return`，以及严格 null 检查后 `return`/`throw`，只在守卫后的同一词法作用域收窄。
- [x] P5a 严格空值比较支持非 null 正向分支、`=== null` 的直接 else 分支和直接否定等价式；宽松比较、elseif 与条件组合保持未知，不产生越界收窄。
- [x] 控制流事实遇到同一变量的后续赋值即失效；只有赋值结果类型可证明时才继续传播，未知调用或标量重赋值不会沿用旧参数/分支类型。
- [x] 提前退出守卫识别顶层语句序列末尾的 `return`、`throw` 或 `exit`；嵌套条件退出不视为整个分支终止，避免在可能继续执行的路径上收窄。
- [x] `while` 循环对直接 `instanceof` 与严格非空入口条件只在循环体内收窄；重赋值立即失效，循环出口不保留事实，宽松比较保持未知。
- [x] `if`/`while` 的正向 `&&` 条件对每个必然成立的直接 `instanceof` 或严格非空原子分别收窄；`||`、整体复杂否定和无法证明的原子不推断。
- [x] 单类型与多类型 catch 变量只在对应 catch body 内传播；多类型 catch 复用 Union 的共同成员、Hover、多目标 Definition 和逐分支缺失诊断，离开 body 后立即失效。
- [x] PHPDoc `@extends`/`@implements` 泛型实参进入版本化语义快照，并沿完整继承链替换父方法返回模板；补全、Hover/签名消费具体化后的返回类型。实参数量、类型解析或父模板约束不成立时不替换。
- [x] 二成员及一般 Union 在直接 `instanceof` 的普通 `else` 分支排除已匹配类型；否定条件的正反分支对称处理，不扩展到 elseif 或含未知副作用的条件。
- [x] nullable 对象仅在显式 `?->` 时提供成员、返回链与签名推断；链上可空返回值若改用普通 `->`，继续保持未知而不猜测。
- [x] 原生对象 Union/Intersection/DNF 参数进入分支感知成员主链：Intersection 汇总约束成员；Union/DNF 只暴露每个运行时备选分支都存在且签名完全相同的成员。共同返回类型可继续链式补全，Hover 使用已证明的共同签名，Definition 返回所有分支声明；成员不存在诊断逐个检查完整运行时备选分支，nullable 诊断只在每个分支都确有该成员时报告。标量/未知分支、签名冲突、重赋值及无法安全应用的收窄保持未知。semantic 与真实 stdio LSP 均覆盖 Completion/Hover/多目标 Definition、链式返回和复合诊断正反例。
- [x] 原生复合参数经直接局部别名赋值继续保留全部运行时分支与 nullable 信息，复用共同成员、Definition 和诊断规则；递归访问有界，循环别名、未知来源和不明重赋值停止推断。semantic 与真实 stdio LSP 覆盖 DNF 别名补全和多目标 Definition。
- [x] 唯一可解析函数的原生对象 Union/Intersection/DNF 返回经直接局部赋值进入相同分支模型；函数歧义、标量分支和不完整层级保持未知。semantic 与真实 stdio LSP 覆盖返回 Union 的共同成员补全。
- [x] 完整原生对象 Union/Intersection/DNF 方法返回可继续成员链；复合接收者的共同方法必须在各声明中解析为相同规范分支，同名短类型解析分歧时停止。nullable 复合接收者经 `?->` 保留空安全传播；semantic 与真实 stdio LSP 覆盖共同方法返回 Union 后的成员补全。
- [x] 实例方法、静态方法及复合接收者共同方法的完整原生复合返回可经直接局部赋值继续传播；回调模板、字面量特化或分支声明无法统一时停止。semantic 覆盖三类赋值，真实 stdio LSP 覆盖复合接收者方法返回 Union 的赋值后补全。
- [x] 开源和推荐扩展包加入 Red Hat YAML；JSON 等基础语言明确使用 VS Code 内建服务。
- [x] 完成 twig-plus 与 twig-plus-metadata schema/实现审计：Twig parser、语言服务器、formatter、作用域和访问规则保持唯一所有权；PHP Companion 不复制模板实现。
- [x] `@php-companion/interop` v1 提供项目/快照身份、能力协商、Controller 上下文、序列化 PHP 类型与成员、来源位置、失效和 Rename 准备消息，并在仓库外保持可独立消费。
- [x] `@php-companion/framework-symfony` 静态提取字面量 `$this->render()` 目标及关联数组 context；参数、`$this`、`new` 和字面量类型进入 interop，动态模板不猜测，动态数组形状标为不完整，不启动 Symfony/Composer PHP。
- [x] framework-symfony 使用成熟 `yaml` 解析器静态读取约定位置的 services.yaml，输出带源码范围的显式 class/alias/public/autowire 事实；解析 legacy `framework.services` 与标准 `services`、别名链，以及确定性的目录/末尾星号 resource 和花括号 exclude，拒绝 factory、参数化 class、任意复杂 glob 和损坏 YAML。resource 只从已索引、命名空间匹配的可实例化 PHP class 生成服务，显式定义优先覆盖；私有服务进入 `#[Autowire(service: '...')]` 的前缀补全、Hover 和 Definition，只有公开服务通过通用字面量方法返回事实驱动 PSR/Symfony Container `get('id')` 的直接链与赋值链。项目源码索引完整时，已注册且启用 autowire 的服务构造参数按字面量 Target、类型/参数 bind 或命名 arguments、参数名具名别名、同名 service/alias、唯一 resource 实现的顺序解析，并提供注明来源的注入 Hover 与实现 Definition；扁平对象 Union/Intersection 按 Symfony 的类型排序和组合别名规则解析，只有组合别名存在或每个成员收敛到同一服务才产生结果；PHP 8.2 DNF 只接受规范化完整 service/具名 alias，且目标实现必须满足一个完整交集分支。直接声明的公开 Required 方法和具名对象类型属性复用相同解析；抽象基类只有在所有已注册具体子类一致时产生结果，显式或未知 YAML calls/properties 会抑制。显式 Autowire service ID 仍走专用补全/导航，标量覆盖、动态选择器、DNF 叶子回退、冲突绑定和歧义保持未知。配置及已索引 PHP 文件保存/删除会失效事实。Winstar `src/` 1335 个项目文件完整、vendor 达到 10000 文件预算的只读审计仍证明 819 个同名构造注入目标；当前源码另有 7 个文件中的 9 个 `#[Required]` 注入点。依赖截断不会关闭这些正向结果。
- [x] framework-symfony 使用 `fast-xml-parser` 把 Symfony dev debug-container XML 作为只读数据，提取 bundle/编译器生成服务、别名、`container.service_locator_context` 方法参数、直接构造参数/`<call method>` 服务引用及 `<property>` 服务引用；拒绝 DOCTYPE，不解析标量参数值，不启动 Kernel 或项目 PHP。Language Server 只选择 `var/cache/dev/*DebugContainer.xml` 中最新且不早于已索引 `src/`、递归 `config/`、`composer.json`、`composer.lock` 的文件；静态 YAML 在重复服务 ID 上优先。新鲜缓存为公开 bundle 服务提供 Container `get()` 成员链，为 locator、按 callable/参数位置/对象类型复核的编译调用，以及按 owner/名称/类型复核的明确 Required 属性提供 `(compiled)` Hover 与实现 Definition；多个编译目标或源码/配置更新会抑制相应事实。当前 Winstar 真实 XML 解析得到 2779 个可用服务、4416 条直接编译调用参数、507 条 locator 参数，覆盖 1084 个构造函数和 380 个方法调用；当前容器没有直接 property 参数。端到端 LSP 此前已验证 `AuthController::verifyToken(AdminSsoService $sso)` 的编译容器 Hover 和源码跳转。
- [x] `@php-companion/framework-doctrine` 静态识别 Doctrine Mapping attribute 实体、OneToOne/ManyToOne/OneToMany/ManyToMany 的可证明目标，以及标准 ServiceEntityRepository 构造绑定；为 find/findOneBy 与 findAll/findBy 输出实体/集合返回类型，动态 target 和自定义查询保持未知，不启动 ORM 或数据库。
- [x] Doctrine 声明类型明确的关联属性通过通用外部属性入口进入统一成员链，保留 private/protected/public、nullability 和实际 to-many 容器；`Collection<int, Entity>` 可经模板方法返回继续导航到实体成员，属性/方法交替链由真实 stdio LSP 验证。
- [x] Doctrine to-many 关联的显式元素事实可沿 `$entity->collection` 直接 foreach 来源传播，循环变量仅在 body 内解析为目标实体；复杂来源链和未声明元素继续保持未知。
- [x] PHPDoc 解析器规范化 PHPStan/Psalm 的 param/return/var/template 标签、template 方差与 template-extends/implements，并让同一目标的工具专用类型优先于基础 `mixed`。自定义泛型集合可沿完整 `IteratorAggregate<TKey, TValue>` 继承链推导 foreach 值；`array-key` 约束只接受 int/string。模板在 nullable/Union/嵌套泛型返回中执行标识符级替换，Doctrine `get(): TValue|null` 可经 `?->` 精确导航，`filter(): Collection<TKey,TValue>` 保持实体类型；语义缓存升至 schema 16。
- [x] 方法级 PHPStan 模板可从单参数箭头函数或普通闭包绑定返回对象：参数类型必须显式；返回类型可显式声明，或从唯一的 `new Class(...)` 箭头表达式/闭包 return 证明。校验回调参数可接受集合元素、返回对象满足模板 bound 后，Doctrine `map(Closure(T):U): Collection<TKey,U>` 在直接链及局部赋值后均传播 U；动态/条件返回、复杂回调或不兼容参数保持 unknown。真实 Winstar Doctrine 源码已验证两种回调形式及对象构造返回推断，stdio LSP 已验证显式箭头形式。
- [x] Doctrine 标准 Repository 方法事实通过 semantic 的可替换外部成员入口进入统一成员查询；PHP 补全可列出四个稳定方法，`find()` 的 nullable 实体返回能经 `?->` 继续成员链，`findAll()`/`findBy()` 的数组元素可在直接 foreach body 内传播；自定义方法保持未知，文件更新/关闭/删除会同步失效。
- [x] 自研 Language Server 可在单个具名函数或方法内 Rename 局部变量和普通参数；参数可从声明、作用域引用或唯一解析命名实参发起，并同步更新已解析到同一 callable 的工作区命名实参。提升属性构造实参进入参数/属性同一身份路径。结构化变量引用限定词法作用域，名称冲突、`$this`/超全局、`global` 绑定和跨闭包捕获会拒绝，编辑通过统一 EditPlan 并保持单步 Undo。
- [x] 唯一具名函数 Rename 可从声明或直接解析调用点发起，统一修改定义、导入路径及普通/全限定调用；显式 import alias 保持不变，从 alias 调用点发起会拒绝。semantic、stdio LSP 与真实 Extension Host 覆盖调用点发起和单步 Undo。
- [x] 唯一命名空间常量可从声明或直接使用点 Rename，统一修改声明、`use const` 路径及普通/全限定使用并保留显式 alias；类与 Trait 常量同步声明、`self::`、宿主和精确解析到同一声明的继承访问。大小写敏感 Enum case 可从声明或精确静态访问发起，只修改同一 case 身份并保留大小写不同的 sibling。unit/backed Enum 通过共享成员模型提供 `cases()`、backed `from()`/`tryFrom()`、只读 `name`/`value`、工厂 `static` 返回链、EnumMember 补全类型、原生 case Hover、精确签名帮助、`from()` 缺参/backing value 类型诊断与 `tryFrom()` nullable/nullsafe 访问检查；合成工厂签名按调用文件 strict/weak 模式处理标量；未知 case 不再被语言特例吞掉。动态访问、`constant()`/`ReflectionEnum::getCase()` 字符串查找、多 Trait 同名来源、语义重定向冲突及不完整层级会拒绝。semantic、stdio LSP 与 VS Code 1.136.1 Extension Host 覆盖补全/Hover/Signature Help 及跨文件 Rename Apply/Undo/Redo。
- [x] 非 private 方法普通参数可从声明或唯一解析命名实参按参数位置跨完整接口、父类和重写实现族 Rename；每个声明原有参数名的作用域引用、紧邻标准/PHPStan/Psalm `@param` 及唯一解析命名实参会统一进入一个 WorkspaceEdit。普通函数/方法参数 Rename 同样保持 PHPDoc 一致。自身成员优先于 Trait、Trait 优先于继承成员，保证调用解析采用真实重写签名。层级不完整、可能相关的动态同名调用、提升参数、闭包捕获或任一作用域冲突时拒绝。semantic、stdio LSP 与真实 Extension Host 均覆盖正反例，编辑器验证调用点发起、应用及单步 Undo/Redo。
- [x] public/protected 方法名可从声明或唯一解析调用点发起，在完整接口、父类和重写实现族中同步全部声明及已解析直接调用，包括 `parent/self/static` 调用；新名称与相关层级冲突、复合类型候选无法由同一计划覆盖、动态方法调用、数组/字符串 callable 或不完整层级会拒绝。无法静态解析的普通接收者调用保持不改并属于明确的工作区外/动态引用边界。semantic、stdio LSP 与 VS Code 1.136.1 打包 Extension Host 已覆盖跨文件应用及单步 Undo/Redo。
- [x] public/protected 非提升属性可从声明或唯一解析访问点发起 Rename，在完整类层级中同步重复声明及已解析实例/静态访问；新名称与相关层级冲突、private 同名属性、动态属性访问或不完整层级会拒绝，提升属性由下一条独立身份路径处理。反射、序列化字符串、无法解析的普通接收者及工作区外访问不进入编辑。semantic、stdio LSP 与 VS Code 1.136.1 打包 Extension Host 已覆盖跨文件应用及单步 Undo/Redo。
- [x] 提升属性 Rename 将构造参数与属性视为同一身份：同步参数声明/作用域使用、紧邻标准/PHPStan/Psalm `@param`、直接及继承构造的已解析命名实参和属性访问。构造签名解析会沿类层级找到继承构造，同时保留 `new` 创建的实际子类类型。参数/属性冲突、嵌套闭包捕获、重复属性、Trait、动态属性访问及不完整层级会拒绝。semantic、stdio LSP 与 VS Code 1.136.1 打包 Extension Host 已覆盖跨文件应用和 Undo/Redo。
- [x] Trait 方法与属性可从 Trait 声明或唯一解析的宿主/子类使用点发起 Rename，统一修改 Trait 内部引用和已证明宿主/子类引用；具名 `Trait::method as alias` 在源方法 Rename 时修改源 token 并保留 alias 名。alias 自身可从 adaptation 或精确调用独立 Rename，只修改 alias 身份。多个 Trait 同名方法由完整 `insteadof` 规则收敛到唯一 winner 时，winner Rename 同步被选中方法 token，被排除 Trait Rename 保留 precedence token 并同步自己的具名 alias 源。无唯一 winner、宿主或新名称冲突、动态/字符串引用及不完整消费层级会拒绝。semantic 具备正反例，stdio LSP 与 VS Code 1.136.1 Extension Host 覆盖跨文件 Apply/Undo/Redo。
- [x] 首个第二批重构 Extract Variable 已接入 `refactor.extract`：仅接受块级函数/方法/闭包中完整的简单赋值 RHS 或完整 return 表达式，自动避开作用域变量名冲突；部分子表达式、内联控制语句、赋值/yield/include/require 和损坏语法会拒绝。两个文本编辑由同一版本化 EditPlan 提交，VS Code 1.136.1 Extension Host 已验证应用及单步 Undo/Redo。
- [x] Inline Variable 的精准子集已接入 `refactor.inline`：光标必须位于普通局部变量声明左值，声明后紧邻的 return 或简单赋值 RHS 必须是该变量唯一且完整的使用；多次使用、介入语句、引用赋值、嵌套赋值、yield 和损坏语法均拒绝。声明删除和使用替换由同一版本化 EditPlan 提交，VS Code 1.136.1 Extension Host 已验证应用及单步 Undo/Redo。
- [x] Extract Method 的精准子集已接入 `refactor.extract`：接受普通实例方法体顶层、完整且连续的表达式语句；除 `$this` 外，允许类型可证明的成员接收者和唯一解析平坦调用中明确按值接收的完整实参，并按首次出现顺序生成输入。选区末条可为一个非引用简单局部赋值，当该变量在同一作用域后续真实使用且未同时充当输入时，赋值会转换为新方法 return，原位置接收单一输出。返回类型仅从真实对象声明、唯一调用的原生返回签名或 bool/int/float/string/array 字面量生成；未知结果省略类型，标量不会作为伪类名输出。生成签名复用原生输入类型，并避开继承层级方法名冲突。多赋值/多输出、yield、include/require、闭包、注释边界、未知变量、引用/展开/嵌套或歧义调用、嵌套控制块、静态方法与不完整继承层级均拒绝。两个编辑由同一版本化 EditPlan 提交，VS Code 1.136.1 Extension Host 已验证类型化输入、单一输出及各自单步 Undo/Redo。
- [x] 修改签名的首个精准子集已接入 `refactor.rewrite`：仅从唯一 private 非魔术方法声明上的普通未使用参数发起，要求完整项目索引，并同步删除参数节点、紧邻 PHPDoc 中对应标准/PHPStan/Psalm `@param` 行及所有唯一解析直接调用中的位置或命名实参。被删实参仅允许变量、标量/null 字面量或常量引用，避免丢失调用/构造等求值副作用；参数仍被使用、引用/variadic/提升参数、重复声明、展开实参、未解析引用或列表映射不完整时不提供操作。所有跨文件编辑使用同一版本化 EditPlan。VS Code 1.136.1 Extension Host 已验证声明、PHPDoc、两种调用风格的一次应用和单步 Undo/Redo。
- [x] 从声明发起的非提升 private 属性可沿统一成员解析 Rename；只修改同一属性的声明和已证明访问，拒绝访问点发起及同类属性冲突，并由真实 Extension Host 验证应用和单步 Undo。
- [x] 唯一具名函数可从声明发起 Rename，覆盖解析到同一 FQFN 的调用及 `use function` 目标路径；显式 alias 调用保留 alias，普通字符串/注释不改写，目标 FQFN、调用 namespace 或 import alias 冲突时拒绝。
- [x] 参数名 Inlay Hint 仅出现在唯一解析、扁平、无 named/unpack/variadic 的纯位置调用；参数同名变量、嵌套调用和不完整签名不显示，真实 Extension Host 与既有局部类型提示共同验证。
- [x] `php.argument.type-mismatch` 只报告唯一解析、参数映射确定且对象/null 实参类型可证明的原生签名不兼容；继承兼容、nullable、mixed/动态表达式、嵌套调用、unpack、缺失层级和弱类型标量转换保持静默。
- [x] `php.return.type-mismatch` 使用结构化 return/最小词法作用域检查具名函数和方法；对象继承、nullable、空 return、void/never 冲突可证明时报告，动态表达式和含 yield 的生成器保持静默。语义快照升至 schema 13 并隔离旧缓存。
- [x] `php.assignment.readonly-property` 在目标 PHP 8.1+ 报告可证明位于声明家族外的显式 readonly 属性写入，并始终拒绝 Enum 原生 `name/value` 写入；PHP 8.2+ 进一步使用结构化 readonly class 事实覆盖普通及提升实例属性。复合/空合并赋值、自增减、数组偏移写入、直接引用、唯一已解析签名的按引用参数和属性 foreach 引用属于必然间接修改，在声明家族内同样报告；当前流已确定初始化属性的 `$this` 整体引用遍历在 receiver 范围聚合报告；同一语句块直接 `new`，或来自唯一可解析且通过直接 `return new` 或同块紧邻 `$local = new ...; return $local;`、顺序语句、条件分支、`throw` 终止、`try/catch`、各 arm 直接 `new` 的 `match`、含贯穿/default/局部普通 `break` 的 `switch`、保守可落空的 `while`/`do`/`for`/`foreach`（含循环内局部 `break`/`continue`），以及含普通透传语句或受支持控制流的 `finally` 证明全部可继续返回路径都返回同一具体的新构造类型且不会落空的函数、静态方法或实例方法工厂的局部对象，还会纳入当前作用域可见的提升 readonly 属性，以及索引内无提前退出的自有或实际继承构造器主体在全部正常出口初始化的属性；子类有自有构造器时仅在控制流证明全部正常出口前都调用了可见的 `parent::__construct()` 时合并父摘要，完整条件分支受支持；单臂条件调用、参数、返回已有对象、不同具体类型、可落空、含 `yield`、`goto`、`exit`、跨作用域跳转或其他未支持控制流的工厂、分支构造、含 return/exit/break/continue/goto 的构造器摘要及未初始化属性保持静默。逐版本审计的 `sort`、`array_pop`、`array_shift`、`array_push`、`array_unshift`、`array_splice`、`shuffle`、`usort`、`preg_match`、`preg_match_all`、`parse_str` 内建签名进入同一按引用规则，未知内建函数保持静默；按值调用/foreach 保持只读访问。提升属性在声明构造器主体内再赋值、顺序重复初始化、全部可继续 `if/elseif/else` 分支、完整及局部 break 嵌套 `switch` 正常出口或 `try/catch` 正常出口初始化后的再赋值、循环入口已确定初始化时的循环体再赋值，以及无提前出口恒真 while/do-while/for 或规范整数边界 `for` 的必然第二次迭代会报告；规范有限循环要求同一局部计数器、整数常量初值与边界、`++`/`--` 单步更新、前两次条件为真，循环体不使用计数器且无提前退出。确定无限循环后的语句停止分析。无直接 readonly 写入的 `finally` 可保留 try 合流事实；写入型 finally 在 try/catch 无提前退出时使用并传播正常出口合流，存在提前退出时回退到进入 try 前状态。缺少 default 的 switch、嵌套 continue 或多层 switch 跳转、单臂分支、普通条件或含提前出口循环的初始化、不可达语句和含 `goto` 的 callable 保持未知。外部 unset 报告，类内可能发生在初始化前的 unset 及 readonly 对象的内部成员修改保持静默。semantic 同时覆盖保留 CST 和快照文件路径，stdio LSP、PHP 8.5 运行时对照与 VS Code Extension Host 覆盖。
- [x] `php.property.invalid-readonly-declaration` 在目标 PHP 8.1+ 检查显式 readonly 属性，PHP 8.2+ 检查 readonly class 的隐式只读属性；缺少类型、static 和非提升默认值按属性合并报告，`mixed` 与提升参数默认值保持合法。旧目标版本及语法残缺时抑制，language-server 单元测试和真实打包 Extension Host 覆盖精确属性名范围与稳定消息。
- [x] `php.property.dynamic-deprecated` 在目标 PHP 8.2+ 对唯一具体 class、完整唯一继承层级及独立简单属性赋值发布 Warning；同一变量同一属性在相邻语句已证明创建后，连续赋值不重复提示，`unset` 或其他间隔会恢复诊断。右值能证明为 bool/int/float/string/array/object、整数区间或唯一命名对象时提供首选“声明属性”Quick Fix，使用同一 EditPlan 跨文件插入 public 类型属性；未知值和 `vendor` 声明保持不可编辑。真实声明属性、`__set`、当前类或祖先的 `#[AllowDynamicProperties]`、readonly class、读取、动态名称、Union/Intersection、重复或未解析声明及残缺语法保持静默。semantic、stdio 版本对照和真实打包 Extension Host 覆盖精确属性名范围、跨文件编辑及 Apply/Undo/Redo。
- [x] `php.attribute.invalid-allow-dynamic-properties` 在目标 PHP 8.2+ 精确拒绝内建 `#[AllowDynamicProperties]` 用于 readonly class、interface、Trait 或 Enum；支持全限定名和 import alias，合法普通 class、命名空间同名自定义 Attribute、旧目标版本及残缺语法保持静默。PHP 8.5 运行时对照、semantic、stdio 和真实打包 Extension Host 覆盖。
- [x] `php.parameter.implicitly-nullable` 在目标 PHP 8.4+ 只对默认值恰为 `null` 的非 nullable 原生类型参数发布 Warning，精确标记类型范围；显式 `?T`、含 `null` Union、`mixed`、无类型参数、旧目标版本及残缺语法保持静默。首选 Quick Fix 依原子/Union/Intersection 形状生成合法显式可空类型，analysis、stdio 与真实打包 Extension Host 覆盖 Apply/Undo/Redo。
- [x] PHP 8.2 readonly class 的跨文件声明契约已进入 semantic：`php.inheritance.readonly-mismatch` 精确拒绝 readonly/非 readonly 父子状态不一致，`php.readonly-class.invalid-trait` 沿最多 64 层唯一 Trait 图拒绝直接或传递引入非 readonly 属性。相同 readonly 状态、显式 readonly/无属性 Trait、旧目标版本、未解析或重复身份保持静默；semantic、stdio LSP 与真实打包 Extension Host 覆盖。
- [x] `php.assignment.type-mismatch` 检查可解析对象的原生类型属性直接赋值；只比较可证明的对象变量、`new` 与 `null`，继承、nullable 和未知层级保持保守，动态调用、未知属性、复杂左值及弱类型标量不报告。PHP 参数变量可合法改变运行时类型，因此参数重赋值是固定反例。
- [x] `php.member.possibly-null` 只报告可证明 nullable 对象的直接普通 `->` 成员访问；成员必须真实存在且层级完整，`?->`、显式非 null 分支、mixed、动态成员和未知层级保持静默。PHP 8+ 提供仅替换该运算符的 null-safe Quick Fix，并由真实 Extension Host 验证单步 Undo。
- [x] 标准 `source.organizeImports` 对单 namespace、连续且无注释夹杂的 use 块删除已证明未使用项，并按 class/function/const 与 FQ 名稳定排序；无注释 group use 会展开为规范单项声明并逐成员删除，含注释 group、非连续块和多 namespace 不提供编辑，真实 Extension Host 已验证应用与单步 Undo。
- [x] PHP LS 从完整索引提供 context/公开类型目录及成员 UTF-16 声明位置，PHP 扩展暴露版本化桥命令；TwigPlus 扩展在启动和 PHP 文件变化后有界拉取，Twig LS 校验后合并实时与 metadata 上下文。多 Controller 类型形成 Union，只补全各分支共有成员；Twig 变量可导航到 Controller 来源，共有属性访问可精确导航到一个或多个 PHP 成员声明。
- [x] interop Controller 变量携带每个字面量 Symfony `render()` context key 的精确 PHP 来源范围；多 Controller 合并按 URI/range 去重保留全部键位置。TwigPlus 已消费该事实：完整直接目标模板的外部变量 Rename 一次更新模板内全部未被局部声明遮蔽的引用和全部 PHP context key，并拒绝动态/不完整 context、无来源及名称冲突。两仓协议集成测试覆盖 Prepare、跨语言 edits 和拒绝场景；VS Code 1.136.1 真实双 VSIX Extension Host 已验证跨 PHP/Twig 一次应用及 Undo/Redo 往返。
- [x] Open Source Pack 的核心外部成员已在 VS Code 1.136.1 / WSL 隔离目录完成实际安装与版本记录；移除当前发行版闭源且有付费边界的 Database Client，并删除非核心 CSS Peek、拼写和 Markdown 扩展，最终默认组合为 PHP Companion 加七项外部工具。PHP CS Fixer 0.3.21 的 manifest/许可证文本差异和内置 PHAR 最高支持 PHP 8.3 的限制已如实记录；Winstar 改用项目版 3.95.22 与 PHP 8.5 包装器并实际格式化成功。
- [x] Open Source Profile 组合 Extension Host 门禁加载七项受支持外部扩展及主 VSIX，且不含 Intelephense 或 Symfony Language Tools；完整 Companion 编辑用例继续通过，PHP/Twig/YAML/XML 与内建 JSON formatter 已实际调用，PHP 格式化编辑可应用和单步撤销，EditorConfig 缩进已应用。PHP Debug 经 PHP 8.5.9 / Xdebug 3.5.3 完成真实 launch 会话，PHPUnit 扩展经项目 PHPUnit 9.6.36 执行选定测试并产生哨兵结果。PHPUnit 快速删除临时重命名文件的 `ENOENT` 已记录为限制。
- [x] Open Source Pack 与 Recommended Pack 的默认 PHP 核心已统一为 PHP Companion 自研服务器。Recommended Pack 保留原 ID 作为无迁移升级入口，但 manifest 不再包含 Intelephense；两个 Pack 都设置 `phpCompanion.languageServer.enabled: true`。源码 manifest 测试和最终 VSIX 内容校验同时强制这两个条件，README 与 Release checklist 记录手动旧工作流的关闭设置。
- [x] Symfony Language Tools 0.19.0 Linux x64 已加入两个默认 Pack。Marketplace Gallery SHA-256 与包内 MIT 许可证已核对；真实 VS Code 1.136.1 Extension Host 验证插件实际激活、runtime indexing 与 release metadata 默认关闭，并确认 Companion 完整用例、TwigPlus formatter、YAML/JSON、PHP CS Fixer、EditorConfig、Xdebug 与 PHPUnit 组合不回归。

## 已验证证据

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:extension
pnpm verify:packages
```

字符串内建增量完成后，language-spec 为 10 项、Language Server 为 65 项，十五个组件为 383 项，加仓库既有 30 项共 413 项；该计数取代下方累计证据段中的 62/378/408。重新打包的主 VSIX 已在隔离 VS Code 1.136.1 Extension Host 验证字符串函数 Definition、implode/strtr 重载选择、DatePeriod foreach 与构造重载，以及既有 Generator 推导链路。

高频数组内建增量加入逐版本函数目录，以及 PHPDoc `array<TKey,TValue>` 经 values/filter/map、局部变量与 foreach 的键值传播；typed callback 的参数和返回模板共同参与重载绑定。按引用数组调用会重新评估入口参数类型，保留 pop/shift/排序可证明的值域，并在 push/unshift/splice 等可能替换值域的调用后清除过期元素事实。最终测试与 VSIX 证据记录于 [数组内建符号与泛型传播验收](reports/array-builtins-2026-09-08.md)。

数组内建增量完成后，language-spec 为 11 项、Language Server 为 68 项，十五个组件为 387 项，加仓库既有 30 项共 417 项；该计数取代上方字符串增量的 413 项。目录新增 PHP 7.3 key endpoints、PHP 8.4 find/predicate 回调与 PHP 8.5 value endpoints，并接受合法省略尾部参数的用户闭包。重新打包的主 VSIX 已在隔离 VS Code 1.136.1 Extension Host 验证 values/map/find/first/pop/splice 返回元素 Definition、splice 后不保留输入数组的过期元素 Definition、`array_is_list` 内建导航及全部既有宿主用例，SHA-256 为 `5f1464b12078f238f5bc2a41cf5b903ad7bc05db1424aa0ed8bf13a71ef155d2`。

核心迭代函数增量加入 `is_iterable`、`iterator_to_array` 与 `iterator_count`，并按 PHP 8.2 边界切换 `Traversable`/`Traversable|array`。模板推断可从 PHPDoc Union 的兼容分支沿 `IteratorAggregate<TKey,TValue>` 到 `Traversable<TKey,TValue>` 绑定，省略的 literal 默认参数参与条件返回求值，因此默认调用保留键值、`preserve_keys=false` 精确返回 list 值域。最终证据见 [迭代函数与条件返回验收](reports/iterator-functions-2026-09-08.md)。

该增量完成后，Language Server 为 69 项，十五个组件为 388 项，加仓库既有 30 项共 418 项；九个 PHP 7.2–8.5 stub 均为 0 个 parser error。十五个 tarball 隔离安装通过，主 VSIX 在隔离 VS Code 1.136.1 Extension Host 退出码为 0，SHA-256 为 `8a4b4b40ca326d18a3f8421554e2aab9850401fb566c64c3098f754d2b103dc8`。该计数与产物取代上方数组增量证据。

类与对象检查增量完成后，`get_class($object)` 可传播 `class-string<具体类>`，PHP 8.0 失败返回边界和 PHP 8.1 `enum_exists` 门槛进入共同目录。Language Server 为 70 项，semantic 为 181 项，十五个组件共 390 项，加根仓库 30 项共 420 项；九套 stub 均为 0 个 parser error。最新主 VSIX 的隔离 Extension Host 退出码为 0，SHA-256 为 `007eb33201f499f964f3fafd04dd67fb7aa1113b6501b4d968a43f3d5e6eadcd`。完整证据见 [类与对象检查函数验收](reports/class-object-functions-2026-09-08.md)。

变量类型谓词增量加入 PHP 7.2–8.5 函数和别名目录，并将已解析全局内建调用的正向分支事实接入 Union/mixed 参数类型。命名空间同名函数、范围外和赋值后保持保守；该阶段 semantic snapshot 升至 schema 38，后续补集事实已升至 schema 39。阶段证据见 [类型谓词与分支收窄验收](reports/type-predicate-narrowing-2026-09-08.md)。

2026-09-08 当前分别有：language-spec 8 项、phpdoc 12 项、parser 41 项、project 6 项、index 7 项、type-system 17 项、interop 3 项、semantic-provider 5 项、semantic-provider-host 4 项、framework-symfony 20 项、framework-doctrine 2 项、semantic 180 项、refactor 6 项、language-server 62 项、testkit 5 项（含真实 stdio、请求取消、快速编辑版本保护、标准索引进度、项目优先依赖截断、Remote URI、多根/嵌套根隔离、持久缓存、文件失效、Symfony/Twig interop、resource/Autowire 服务补全与导航、公开服务容器字面量调用、按类型/Target/bind/Union/Intersection/DNF 构造注入 Hover/实现导航、Required 方法/属性、编译容器 bundle 服务与公开方法私有 locator、DNF 参数兼容、完整成员链赋值传播、Doctrine Repository 主链、PHPStan 泛型集合迭代与方法模板、泛型继承参数替换、唯一调用、Callable 逐实参类型门禁/条件返回/成员链结果及同块局部值/数组更新、动态调用局部赋值和直接返回链、完整条件、switch、try/catch/finally、规范非空整数 for、显式单轮循环与非空 foreach 合流诊断、PHPDoc/原生类型冲突、接口/抽象方法、构造函数、访问器、Override、Extract Variable/Method、Inline Variable、private 参数及调用点删除、类型/函数/命名空间与类/Trait 常量、Enum case、private 与 public/protected 继承族方法、普通/提升/Trait 属性、可证明动态成员及 Trait 方法/局部变量/参数与继承方法参数 Rename、未使用/组织 import、继承方法签名兼容、final 继承限制、直接不可达语句、PHP 7.3–8.5 代表语法边界及兼容层反例、readonly class 目标版本对照、readonly 声明契约、PHP 8.2 `AllowDynamicProperties` 目标与动态属性创建、readonly 间接修改与确定性重复初始化、类型/函数/常量自动导入、命名参数、对象/null 参数、返回值、类型属性赋值及 nullable 成员访问诊断、参数名/局部类型提示、版本/重复/PSR-4/未解析类型、Enum 成员、成员静态性/可见性、魔术方法可见性与参数诊断、Quick Fix、Hover、Definition/Type Definition/Implementation/Type Hierarchy/References、Semantic Tokens 与内建符号）、既有 30 项，共 408 项测试通过；TypeScript 与 ESLint 通过。VS Code 1.136.1 Extension Host 已重新验证服务器异常退出后的自动恢复、上述诊断、符号、成员补全、Hover、Signature Help、Definition、Type Definition、Implementation、References、Type Hierarchy、Inlay Hints、namespace 常量与 Enum case 定义、Symfony 默认/Target/bind/扁平 Union/Intersection 构造注入及 Required 方法/属性 Hover/实现导航、PSR-4/未使用 import Quick Fix、Organize Imports、各类 Rename、PSR-4 Safe Move、Extract Variable/Method、Inline Variable、private 参数及调用点删除和代码生成；命名空间/类/Trait 常量、Enum case、公开继承族与 Trait 方法、普通/提升/Trait 属性、继承方法参数、Extract Variable/Method、Inline Variable、private 参数删除、构造函数、Import、nullable 成员、隐式可空参数与动态属性声明 Quick Fix、类型 Rename 与 Safe Move 命令具备真实 Undo/Redo 往返。最终打包 VSIX 已在隔离配置中运行同一套 Extension Host 用例；PHP Companion 与 TwigPlus 最终 VSIX 联调 31/31 通过，5 组输入回放报告通过。十五个组件从真实 tarball 在仓库外安装运行通过。

## 尚未完成

- [ ] P0 全部精准正反 fixtures 和真实插件组合操作核验；Open Source Profile 已在 Linux、Windows、macOS 完成冻结版本隔离安装及 PHP/Twig/YAML/XML/JSON、EditorConfig、PHP CS Fixer、Xdebug 与 PHPUnit 组合门禁，PHPUnit 快速删除日志限制已记录；更完整规则组合、Windows 客户端连接 WSL Remote 和人工操作仍待验证。标记 testkit、版本代表样例与冻结性能预算已建立，版本矩阵仍需随实现逐项关闭未支持状态。
- [ ] parser 的完整表达式事实；打开文档已使用 Tree edit 增量重解析并保留全量语义等价，匿名类和闭包捕获已完成。PHPDoc 模板继承、方差标签和条件类型 AST 已解析；完整嵌套条件相关性及方差安全审计仍待完成。
- [ ] Composer 嵌套项目、完整逐版本内建符号生成；path/symlink、多个 workspace root、exclude-from-classmap、持久快照、首批版本化标准异常树、Date/Time、字符串及核心迭代/对象契约已实现。八个已审计扩展组已支持 workspace folder 与 Composer 显式禁用选择，仍需其余扩展/核心符号、启用扩展版本约束、自动环境探测、声明/方法体分层和依赖级增量失效。
- [ ] type-system 高级类型；semantic 当前覆盖可证明参数、`$this`、`new` 赋值、单一返回链、PHPDoc 基础类型、成员可见性、基础 References、首批正向控制流收窄，以及完整 if/switch/try/catch/finally、安全 do/while、规范非空整数 for、显式单轮循环、可证明非空 foreach，并在一般 while、条件 for 与动态 foreach 的循环体赋值独立且完全可证明时合并循环前后局部类型；自依赖、引用、复杂跳转、循环体读取目标和完整泛型推断仍未完成。
- [x] 类型、函数与命名空间常量的自动导入候选使用统一 semantic 查询。类型按已可见状态和 namespace 邻近度排序；函数/常量按当前 namespace、显式 import、PHP 全局回退及新 import 分级，外部候选再按共同 namespace 前缀和距离排序。名称与 FQCN 负责确定性决胜，Language Server 通过分类 `sortText` 保持顺序并携带精确 import 编辑。证据见 [类型补全排序验收](reports/type-completion-ranking-2026-09-10.md)与[函数和常量补全排序验收](reports/function-constant-completion-ranking-2026-09-10.md)。
- [x] namespace 内源码类名严格区分未限定名、相对限定名、显式 import 和 `\\FQCN`。全局类不会作为未导入类名的隐式 Definition 或成员类型，补全会附加必要 `use`；函数和常量的 PHP 全局回退保持独立。内建 `is_countable()` 使用显式 `\\Countable`，语义快照为 schema 68、持久缓存为 v39。
- [x] `namespace\\Symbol` 对类、函数和常量显式绑定当前 namespace；普通相对限定函数/常量不使用仅适用于未限定名称的全局回退，namespace alias 可展开限定调用。命名空间常量、类常量和 `use const` alias 按 PHP 规则区分大小写，查询、Definition、References 与 Rename 共用相同身份。
- [ ] 精准诊断、完整现有工作流迁移、高级类型与安全重构；类型/唯一函数/private 方法/public 与 protected 继承族方法/Trait 方法/private、public/protected、提升与 Trait 属性/局部与继承方法参数 Rename、PSR-4 Safe Move、Extract Variable/Method、Inline Variable、接口/抽象方法、构造函数与访问器生成已迁移到统一 EditPlan；唯一 winner 的 Trait precedence 自动改写已完成，动态/字符串引用及其余第二批重构仍待实现。
- [ ] Symfony/Doctrine 全部框架能力；TwigPlus interop 的 Controller 上下文、类型成员、Union 合并、Controller 来源导航、PHP 成员精确导航及直接目标模板上下文变量 Rename，Symfony 确定性 resource、显式服务、Autowire service ID 补全/导航、公开服务字面量 Container get，以及 bind、命名 arguments、字面量 Target/具名别名、同名类型、唯一 resource 实现、成员一致的扁平 Union/Intersection、完整规范 alias 的 PHP 8.2 DNF 构造注入、含非私有原型继承的公开 Required 方法/具名对象属性、新鲜 dev 编译容器的 bundle 服务、公开方法私有 locator、直接编译构造/方法调用及 Required 属性已实现；Doctrine attribute、标准 Repository、关联集合/迭代和可证明对象返回的箭头函数/普通闭包 map 已实现；无法映射到已索引公开方法的 callable、缺失或过期容器缓存场景的静态替代，以及动态/条件回调返回推断仍待完成。
- [x] R1 首发候选：Linux / WSL 的 S01–S08 已通过。Safe Move 命令默认 Preview，以单个 WorkspaceEdit 原子提交文件、namespace 和引用，并通过一次 Undo/Redo 往返；资源管理器移动继续验证双向协调与重复 import 收敛。冻结诊断 corpus 的 TP=17、FP=0、FN=0，4/21 未知或不完整场景均正确抑制。R4 F01–F14 与完整系统矩阵未完成。
- [ ] 打包发布候选、公开 npm/Marketplace 发布。

当前核心编码闭环和开源组合已达到 R1 首发候选；打包主扩展及七扩展 Open Source Profile 已通过 Linux x64、Windows x64 与 macOS arm64 自动门禁。Windows 客户端连接 WSL Remote、多小时真实项目会话和 R4 最终功能仍未完成。逐项证据见 [R1 Linux / WSL 验收审计](reports/r1-acceptance-linux-wsl-2026-09-06.md)、[跨平台候选验收报告](reports/cross-platform-candidate-2026-09-14.md)及[Open Source Profile 版本与 Provider 组合门禁](reports/open-source-profile-version-gate-2026-09-15.md)。

JSON 高频目录现已覆盖 PHP 7.2–8.5 的 `json_encode`、`json_decode`、`json_last_error`、`json_last_error_msg`、主要选项/错误常量，以及 PHP 7.3 `JSON_THROW_ON_ERROR`、PHP 8.1 `JSON_ERROR_NON_BACKED_ENUM` 和 PHP 8.3 `json_validate` 门槛。PHP 7 返回通过 PHPDoc 表达，PHP 8 使用原生参数和返回类型；补全、Signature Help、Definition 与返回传播共用版本化内建文档。完整证据见 [JSON 内建目录验收](reports/json-builtins-2026-09-10.md)。

文件系统高频目录现已覆盖整文件读写、流打开/关闭/读取/写入、文件与目录检查、大小、basename/dirname/pathinfo/realpath/glob，以及常用目录创建、复制、移动和删除操作。`resource` 参数和返回通过 PHPDoc 保留，`false` 失败边界进入返回传播；PHP 7 的不可空尾部长度用精确重载表达，PHP 8 的 nullable length 使用原生签名。完整证据见 [文件系统内建目录验收](reports/filesystem-builtins-2026-09-10.md)。

序列化和 URL 高频目录现已覆盖 serialize/unserialize、Base64/十六进制、URL 编解码、`parse_url`、`http_build_query` 与 `get_headers`。`parse_url` 按是否省略 component 区分返回范围，所有失败返回继续保留；PHP 8.0 的 `get_headers` 第二参数从 int `format` 切换为 bool `associative`，与命名参数补全使用同一版本化签名。完整证据见 [序列化与 URL 内建目录验收](reports/encoding-url-builtins-2026-09-10.md)。

PDO 高频目录现已覆盖 `PDO`、`PDOStatement`、`PDOException`、跨驱动稳定常量、连接与事务、预处理、绑定、执行和结果抓取。`prepare`/`query`/`exec`/`quote`/`fetchObject`/`getColumnMeta` 保留失败返回，PHP 7 与 PHP 8 参数身份独立生成；`PDO::connect(): static` 和 `PDOStatement::setFetchMode(): true` 从 PHP 8.4 起可用。完整证据见 [PDO 内建目录验收](reports/pdo-builtins-2026-09-10.md)。

LanguageClient 现在先注册客户端、再注册所有可能发送通知的监听器，并以最后注册的关闭闸门优先阻止新通知；VS Code 逆序清理会先移除通知源，再关闭 stdio。纯净与 Open Source Profile 的同一主 VSIX 均以退出码 0 完成，PHP Companion 自身的 `ERR_STREAM_DESTROYED` 不再复现；Symfony Language Tools 0.20.0 的退出 EPIPE 仍具竞态性并作为第三方限制保留。证据见 [LanguageClient 关闭生命周期验收](reports/language-client-shutdown-2026-09-10.md)。

## 2026-09-09 首发候选收口复验

- `pnpm check` 通过；十五个组件 460 项、根仓库 33 项，共 493 项测试通过，TypeScript、ESLint、三个 VSIX 构建及内容检查同时通过。
- `pnpm verify:packages` 从真实 tarball 在仓库外安装并运行十五个组件。
- 包含 Symfony Language Tools、TwigPlus、YAML、PHP CS Fixer、PHP Debug、PHPUnit 与 EditorConfig 的隔离 Open Source Profile 通过完整打包 Extension Host 回归。
- 独立安装默认启用自研服务器；若已安装 Intelephense 且用户没有显式配置则保留旧 Provider，显式 true/false 优先。纯策略测试和删除 fixture 显式开关后的纯净/开源组合打包 Extension Host 均通过；旧语义 Rename 路径的最终移除仍属 P9 后续工作。
- 本轮产物校验值、命令和外部插件关闭期日志边界见 [首发候选收口验证](reports/release-candidate-linux-wsl-2026-09-09.md)。

## 2026-09-08 静态路由补全增量

- 自研 framework-symfony 提供 YAML 路由声明、显式 YAML 导入及 name/path prefix 事实；重复键、动态参数、环境分支、localized path 和通配导入不被猜测为确定声明。
- PHP LS 在语义证明方法属于 AbstractController 或 Symfony 路由接口时，提供常规 `config/routes.yaml/yml` 及显式导入的路由名称补全，替换整个字符串内容；同名普通方法不触发该能力。
- 读取限制为 64 个文件、单文件 1 MB，阻止路径或 symlink 逃出项目；未保存 YAML 优先，取消或 PHP 文档版本改变时放弃结果。
- framework-symfony 10 项、language-server 51 项测试通过，包含真实 stdio 的完整候选断言、普通方法反例和未保存路由更新。其他测试计数沿用上次记录，本轮没有把局部测试冒充全部回归。
- 仍未完成：Attribute/PHP 路由配置、glob/环境/本地化导入、运行时与自研补全的能力切换，以及路由查询性能矩阵；静态路由整体条目保持未完成。
- 新构建 VSIX 的完整 Open Source Profile Extension Host 退出码 0，新增断言确认自研静态 YAML 路由候选与 Symfony Attribute 导航同时工作；TypeScript、相关 ESLint、VSIX 校验与差异检查通过。

## 2026-09-08 路由补全字符串正确性

补全编辑现在按 PHP 原字符串的引号类型转义路由名中的反斜线、引号及双引号中的 `$`，保持 YAML 名称对应的运行时字符串值。框架方法大小写不敏感；`GENERATEURL()` 与标准形式使用同一语义归属门禁。框架组件增加特殊名称和 Unicode 反例；真实 stdio 覆盖单/双引号编辑、大写调用与未保存 YAML。通过 Winstar `bin/php-runtime` 对两种引号的生成表达式执行 Base64 等值对照，均通过。

本次源码验证不代表已有 VSIX 自动更新；最终交付前仍须重新构建、执行打包门禁并更新产物校验值。

## 2026-09-08 具名路由参数

路由补全现在支持以真实声明中首个参数名传递路由名，并允许先传入其他具名参数，例如 `generateUrl(parameters: [], route: '...')`。参数名由语义工作区返回的方法签名验证；不会把 `name:` 与 `route:` 混为一谈。重复参数、位置参数与具名路由冲突、具名参数后跟位置参数和 unpack 场景拒绝提供该补全。框架组件 12 项测试通过，真实 stdio 验证重排调用返回完整路由候选、错误参数名不返回路由。

具名参数与字符串转义已进入重新构建的主扩展 VSIX；完整组合 Extension Host、51 项 LS 回归和 VSIX 内容校验通过，产物校验值见 Symfony 组合报告。这取代上节“尚未重打包”的时间点状态，不代表 Attribute 补全或整个 R4 已完成。

## 2026-09-08 路由 Provider 所有权

已接入按工作区的 Symfony 路由补全切换：安装外部 Symfony 插件且启用其运行时索引时，停止该根目录的自研静态候选；关闭后恢复，PHP 其他语义功能不受影响。adapter 在配置/扩展/工作区变化时发送完整快照，并在服务器初始化与重启时读取最新选择。真实 stdio 测试覆盖停止、恢复、非法值保持原状态，以及嵌套根优先；尚需真实编辑器中切换运行时模式的独立验收，本次不能据此关闭整个 Provider 组合验收条目。

Provider 所有权切换已补真实编辑器验收：新 VSIX 在隔离组合中完成静态候选停止/恢复及 PHP 方法导航保持可用，完整 Extension Host 退出码 0，证据与新产物哈希见 Symfony 组合报告。此项取代上一时间点的“切换尚待编辑器验收”，外部运行时索引/补全能力及其余路由类型仍未完成。

## 2026-09-08 Attribute 路由声明与显式文件导入

framework-symfony 通过 PHP AST 提取明确命名的 Symfony Route Attribute，解析 import alias / 全限定名并排除同名自定义 Attribute；组合首个类级 Route 的 name/path 前缀与方法 Route，保留同一方法上的多个声明，并支持没有方法级 Route 时明确命名的 invokable 类路由。动态名称、环境/本地化、重复参数和残缺语法保守降级，不执行项目代码。

PHP LS 仅消费常规 YAML 路由配置通过 `type: attribute` 显式导入的 `.php` 文件，并叠加导入前缀。真实 stdio 对照验证未导入 Attribute 不出现在候选中、加入导入后出现正确名称与 path，删除导入后恢复原候选。框架组件 15 项、语言服务器 51 项测试通过。

尚未完成：目录/glob Attribute 导入、自动生成名称、继承方法路由、完整环境/本地化规则；这里的明确声明不代表全部 Symfony Runtime 路由表。参考官方 Symfony 7.4 `AttributeClassLoader` 的类级 globals、方法路由与 invokable fallback 规则。

Attribute 显式文件导入已通过新 VSIX 的完整组合 Extension Host：两个来源路由候选及提供者切换断言通过，产物哈希记录在 Symfony 组合报告。该增量不关闭目录/glob 和完整框架路由验收项。

## 2026-09-08 Attribute 目录导入

显式 `type: attribute` 目录资源支持递归 PHP 文件发现和导入前缀。目录按稳定顺序遍历，以 realpath 祖先集合终止目录 symlink 循环，并沿用项目路径边界、64 个资源预算、单文件 1 MB 和取消检查；非 PHP 文件及隐藏目录不加入候选。存在尚不支持的通配符或动态 exclude 时标记导入未解析，不忽略排除规则；明确文件/目录及其列表已支持。

框架组件 16 项测试通过；真实 stdio 的嵌套目录 fixture 包含循环 symlink 与伪 PHP 文本文件，最终候选严格只有预期路由。glob、通配符 exclude、资源 namespace 映射和完整环境规则仍待实现。本增量的源码测试不代表已有 VSIX 已重建；目录模式的编辑器 fixture 已准备，打包宿主验证仍待下一次构建。


## 2026-09-08 显式路由排除规则

YAML 路由导入支持 `exclude` 的文件、目录和字符串列表，路径相对于声明该导入的 YAML 文件解析，遍历前执行完整路径边界匹配。真实 stdio 验证排除目录、排除文件及相近目录名反例；未支持的通配符/参数化排除仍保持未解析，避免错误包含被排除路由。框架组件 16 项测试通过。

目录导入和明确排除已通过新 VSIX 组合宿主验收，前提是启动前配置 PHP 命令，再单独切换运行时开关。另发现连续配置修改期间 Symfony Language Tools 0.19.0 的事件循环退出，保留为开放组合缺陷；证据及持久化错误摘录见 Symfony 组合报告，未将复测通过等同于缺陷修复。


## 2026-09-08 有界路由 glob 与独立安装验收

resource/exclude 已支持共享 glob 匹配，覆盖递归 PHP、YAML 扩展名候选、字符集合、单字符和有界花括号选择；拒绝范围展开、extglob 和参数化路径。框架 17 项、LS 51 项、实际 VSIX 组合断言和 15 个组件 tarball 隔离安装通过。最新范围、产物哈希和宿主开放异常见 [增量报告](reports/symfony-route-glob-2026-09-08.md)。此项取代旧记录中 glob 尚未实现的状态，最终框架/平台验收仍开放。


## 2026-09-08 PSR-4 路由目录映射

已实现明确 `resource: {path, namespace}` Attribute 导入，并按目录/文件名验证目标类身份；同文件额外类、错误 namespace 和被排除文件不进入候选。框架 18 项测试、语言服务器完整 51 项测试（含映射正反例的真实 stdio）、相关 TypeScript 构建和 ESLint 均通过。此增量暂为源码验证，上一 glob 报告的 VSIX 不包含此改动；最终发布前仍须重建并执行组合宿主验收。


## 2026-09-08 标准 Loader 默认路由名称

明确策略下支持 FrameworkBundle / Routing 自动命名、类级前缀、同一方法的未命名序号及 invokable 类 fallback。LS 仅在根 Composer 声明 FrameworkBundle 依赖时启用该默认策略。20 项框架测试、51 项 LS 测试与相关 ESLint 通过；真实 PHP 8.5 包装器执行 Symfony AttributeRouteControllerLoader 得到相同结果。

对照脚本：[Loader oracle](reports/symfony-route-name-oracle-2026-09-08.php)。本地执行依赖脚本注明的 Winstar vendor autoload，不启动应用 Kernel。输出为 `["prefix_app_demo_show","prefix_fixed","prefix_app_demo_show_1","prefix_app_demo_index"]` 和 `["app_single__invoke"]`。自定义 Loader、非 ASCII 默认名、继承、环境及自动 FQCN 别名仍未完成。此增量与前一 PSR-4 映射均待下一次 VSIX 重建/组合验收；现有 VSIX 不代表已包含这些功能。


## 2026-09-08 PSR-4 / 默认名称组合宿主验收

前两节增量已进入新主扩展 VSIX，实际 Open Source Profile 精确候选与 Provider 切换断言通过，退出码 0。新产物哈希、原始日志、已执行检查及仍开放异常见 [组合报告](reports/symfony-route-mapped-2026-09-08.md)。此项取代前两节“尚待 VSIX 重建”的时间点状态，不关闭整体框架与最终验收。


## 2026-09-08 编辑器 fixture 保存一致性

已修复测试清理直接覆盖 dirty 文档磁盘内容的问题，改用 WorkspaceEdit / TextDocument.save 并断言恢复后的缓冲区与磁盘一致。完整组合宿主复测退出码 0，日志保存冲突为零；原有 Apply/Undo/Redo 验证保留。PHPUnit ENOENT 和通知失败仍开放，见 [保存一致性报告](reports/fixture-restore-2026-09-08.md)。


## 2026-09-08 PHPUnit 发现范围与完整恢复

隔离 Profile 补充真实 testsuite 配置，单文件与全套测试分别执行并验证结果标记。Safe Move 恢复前保存编辑计划涉及的全部文件，避免遗漏引用触发保护。完整组合测试退出码 0；ENOENT、保存冲突、通知失败和 unknown error 均为零，仅保留预期 alias Rename 拒绝。此项关闭已配置 Profile 的普通源码误扫描与 fixture 清理问题；真实测试文件移动竞态及外部 Symfony 配置变更问题仍不作已修复声明。见 [发现范围报告](reports/phpunit-discovery-2026-09-08.md)。


## 2026-09-08 非 PSR-4 自动移动与测试文件变化

修复自动 Explorer 移动对映射外测试文件误触发 Safe Move 错误的问题；跨映射边界和显式 Safe Move 保留校验。新 VSIX 通过测试文件 Move/Undo/Redo 后逐次全套执行及源文件身份核对，原有 PSR-4 场景和 30 项根单测通过。日志无移动/保存/ENOENT 错误，但外部 Symfony EPIPE 再现，仍属开放稳定性问题。见 [增量验收](reports/unmapped-move-2026-09-08.md)。

## 2026-09-08 完整终止流后的不可达诊断

`php.control-flow.unreachable` 除直接 return/throw 外，现可证明完整
`if/elseif/else`、全部 try/catch 终止，以及必然终止的 finally。任一分支可继续、
缺少 else 或不受支持的控制流仍保持静默；分支内部原有不可达检查继续生效。
遍历限制为 100,000 节点和 256 层，耗尽时撤销本轮全部不可达结果。专项分析测试
29 项及完整语言服务器 52 项回归作为本增量门槛。后续已增加含 default 的完整
switch 与 case 贯穿；break、缺少 default 和不支持的控制转移保持静默。字面量
`while (true)`、`do ... while (true)` 和条件为空的 for（允许初始化/更新表达式）在
体内无 break/goto 时也会
终止外部流；动态条件和可退出循环保持静默。尚不扩展到一般常量求值、never 调用和
跨函数分析。

新主扩展 VSIX 的真实 Open Source Profile 进一步验证冻结诊断数量与精确范围：完整
条件后的语句被标记，可继续 else 后的语句保持静默，宿主退出码 0。产物哈希、首次
失败修正和外部 Symfony EPIPE 边界见[专项报告](reports/unreachable-complete-flow-2026-09-08.md)。

随后同一门禁加入完整 switch 正例和含 break 的反例，新 VSIX 要求恰好三条精确
范围并通过。最终运行未出现 EPIPE，但只作为单次未复现记录，不关闭该间歇问题。

恒真循环增量也已进入后续 VSIX：真实宿主要求第四条精确范围来自
`while (true)`，含 break 的循环后语句保持静默；宿主退出码 0，相关五类错误计数
均为零。最新哈希和日志位置见同一专项报告。

条件为空且带初始化/更新表达式的 for 已进入再下一版 VSIX，冻结集合增至五条并
通过；动态条件 for 的专项反例保持静默。该次外部 Symfony 连接流销毁再次出现，
故上一时间点的单次干净日志不构成缺陷关闭证据。

## 2026-09-08 原生 never 调用终止流

完整项目索引下，唯一解析且实参兼容的独立函数、实例方法或静态方法调用，在其原生
返回类型严格为 `never` 时进入终止流。PHPDoc-only never、重复声明、类型不兼容、
嵌套赋值和未解析调用保持静默；PHP 8.1 以下不启用。语义完整 180 项、语言服务器
完整 54 项及相关 ESLint/构建通过。真实 VSIX 证据在本节后续更新，不以源码测试
替代编辑器验收。

该能力已进入新主 VSIX；实际 Open Source Profile 冻结诊断集要求六条精确范围并
通过，新增项严格为 `unreachableAfterNeverCall();`。产物哈希、stdio 正反例和日志
计数见[原生 never 验收报告](reports/native-never-flow-2026-09-08.md)。

## 2026-09-08 原生 never 声明的正常结束路径

新增稳定错误码 `php.never.fallthrough`。PHP 8.1+ 的原生 `never` 函数或方法仅在
有界控制流证明至少一条路径会正常到达函数体末尾时报告；空函数体、缺少 else 的
条件分支、无 default 的 switch、动态条件循环和可 break 的恒真循环属于已支持
正例。全部分支 return/throw/exit、无退出跳转的恒真循环以及已由完整索引证明的
原生 never 独立调用可终止该路径。抽象方法、普通未知调用、goto/continue、未支持
语句或预算耗尽保持静默。显式 `return` 继续由现有 `php.return.type-mismatch`
处理，不发布重复诊断。

最终门禁已通过：语言服务器 56 项、语义组件 180 项、相关 TypeScript/ESLint、
15 个组件 tarball 隔离安装、VSIX 内容校验及真实 Open Source Profile。主 VSIX
中的新诊断精确命中 `invalidNeverFallthrough`，未知调用反例保持静默，宿主退出码 0。
产物哈希、日志计数以及首次由 PHP CS Fixer 版本门禁导致的失败见
[专项报告](reports/never-fallthrough-2026-09-08.md)。

## 2026-09-08 原生值返回类型的缺失 return

同一有界控制流现发布 `php.return.missing`：具有原生值返回类型的函数或方法在可证明
存在正常结束路径时报告 Error。nullable 和 mixed 同样检查；void、never、Generator、
抽象声明、未知调用及未支持路径保持静默。语言服务器 57 项、隔离 Profile 和开源组合
Profile 完整宿主均通过；组合运行仍再现外部 Symfony EPIPE。精确边界、PHP 8.5
runtime 对照、产物哈希和日志见[专项报告](reports/missing-native-return-2026-09-08.md)。

## 2026-09-08 嵌套原生 never 调用

原生 `never` 终止事实已从独立调用扩展到赋值、普通参数和其他必经表达式位置，并把
完整表达式范围交给不可达分析。短路右侧、三元/match arm、nullsafe 参数和 nullsafe
方法自身仍保持可达；短路左侧、条件表达式的条件和 nullsafe 接收者可作为必经位置。
完整索引、唯一解析、原生返回类型、实参兼容与 PHP 8.1+ 门禁保持不变。Parser 40
项、Semantic 180 项、Language Server 57 项、15 个组件 tarball 隔离安装和真实
Open Source Profile 均通过；冻结不可达集合新增且只新增嵌套赋值后的一个精确范围。
产物哈希、格式化引擎身份与日志计数见
[专项报告](reports/nested-native-never-flow-2026-09-08.md)。

## 2026-09-08 控制条件中的原生 never 调用

终止事实进一步覆盖 `if`、`while`、`switch` 的 condition、`for` 的初始化与 condition，
以及 `foreach` iterable。控制条件的短路右侧、`for` update 和 `do...while` condition
继续保持静默。Parser 41 项、Semantic 180 项、Language Server 57 项、15 个组件
tarball 隔离安装及实际 Open Source Profile 均通过；冻结不可达集合新增且只新增
控制条件后的一个精确范围。产物哈希和日志计数见
[专项报告](reports/never-control-conditions-2026-09-08.md)。

## 2026-09-08 嵌套 throw-expression 控制流

PHP 8+ 的 throw-expression 已进入同一有界控制流：赋值、参数及普通必经表达式可终止
后续流，三元或 match 仅在全部结果均终止时成立；短路右侧和部分终止分支保持可达。
该事实同时用于不可达、原生 `never` 正常结束和原生值返回缺失 return。Language
Server 58 项、15 个组件 tarball 隔离安装及实际 Open Source Profile 均通过；冻结
不可达集合新增两个精确范围，短路反例保持可达。产物哈希与外部 Symfony stream
destroyed 复现计数见[专项报告](reports/nested-throw-flow-2026-09-08.md)。

## 2026-09-08 变量类型谓词与正向分支收窄

内建目录现覆盖基础类型、`scalar`、`numeric`、`callable`、`iterable`、`countable`
及历史别名，并按 PHP 7.2–8.5 精确控制版本边界。Parser 为直接谓词条件及可证明
为真的 `&&` 子条件记录有范围的类型事实；Semantic 仅在名称解析到全局内建函数时
收窄 Union 或 mixed，命名空间同名函数、否定条件及范围外代码不会误用事实。新增
持久事实最初使 semantic snapshot 升至 schema 38；后续补集事实加入否定标记后升至 schema 39。

最终门禁通过：15 个组件共 393 项测试和根包 30 项测试通过，其中 Parser 42、
Semantic 182、Language Server 71 项；九个版本 stub 分别有 254、258、273、284、
290、290、291、302、304 个 callable 且 parser error 均为 0。15 个组件 tarball
通过隔离安装，主 VSIX 与两个扩展包通过内容校验。打包版 VS Code 1.136.1 宿主确认
内建定义跳转、正向分支零误报及分支外唯一精确诊断，退出码 0；主 VSIX SHA-256 为
`8eddccf35a772e605cc375f8bf4d21f127b0d6ec52251637a691d13b3149fb20`。完整范围与日志
位置见[专项报告](reports/type-predicate-narrowing-2026-09-08.md)。

谓词补集随后覆盖 `!is_*` 真分支、elseif/else 链、提前终止后的同块继续路径，以及
确定为假的析取条件。有限 Union 可连续排除多个已证明成员；mixed 补集、假合取、
真析取和 namespace shadow 继续保持 unknown。直接可证明的具体或 mixed 局部副本
也会消费谓词事实，局部重赋值立即失效，动态 mixed 数组写入仍保持 unknown。
严格非空和正反 `instanceof` 事实也已统一进入参数及局部副本的实参诊断。最终门禁
为 15 个组件 403 项、根包 30 项，其中 Parser 44、Semantic 186、Language
Server 75 项；15 个组件 tarball 隔离验证和打包版 VS Code 1.136.1 宿主均退出 0。
主 VSIX SHA-256 为
`e70f1aaaf5bbdc4c9c637a95f642e9769c4ee31178778a3d8aaee8977a35e953`，完整证据见
[补集路径验收报告](reports/type-predicate-complements-2026-09-08.md)。

## 2026-09-08 属性路径类型谓词收窄

全局内建 `is_*` 谓词现在可收窄直接变量根、静态属性名、非 nullsafe 的单层或多层
可见属性路径。根对象赋值、任一路径前缀写入或 unset、链上方法调用、引用逃逸及
把根对象传给已完成调用会撤销事实；动态成员、nullsafe 路径和命名空间同名函数
保持 unknown。Semantic snapshot 升至 schema 40。

最终门禁通过：15 个组件 406 项、根包 30 项，其中 Parser 45、Semantic 187、
Language Server 76 项；15 个组件 tarball 隔离验证、VSIX 内容验证及打包版 VS Code
1.136.1 Extension Host 均退出码 0。宿主冻结七条属性谓词精确诊断；主 VSIX SHA-256
为 `5c8ed6dbe6653cfc98aa80f045ac484fffd0848c265eafcc10e4c7f3f85e400f`。完整边界和
日志位置见[属性路径验收报告](reports/property-predicate-narrowing-2026-09-08.md)。

## 2026-09-08 属性对象非空与 instanceof 流

严格属性 null 比较和属性 `instanceof` 已接入同一结构化属性路径事实。Nullable 对象
可在已证明分支移除 null，有限对象 Union 可选择或排除目标成员；参数诊断与成员补全
共享结果。带路径事实与根变量事实已明确隔离，避免把属性类型错误套用到根对象。
全部属性副作用失效规则继续生效。

最终门禁通过：15 个组件 408 项、根包 30 项，其中 Parser 45、Semantic 188、
Language Server 77 项；组件 tarball、VSIX 内容和打包版 VS Code 1.136.1 宿主均验证
通过。宿主冻结新增四条对象属性诊断和正向/else 成员 Definition；主 VSIX SHA-256
为 `a36a91f0e8ba300beb4d52a155a89a43aa1d3f8fd9135714e597f61f6f01dbb2`。完整证据见
[属性对象流验收报告](reports/property-object-flow-2026-09-08.md)。

## 2026-09-08 mixed 属性正向谓词

声明为 `mixed` 的直接属性现在可在全局内建类型谓词的正向已证明分支精化为具体
类型；无法表示的否定 mixed 补集继续保持 unknown。属性流基础类型只为属性读取
保留 mixed，未扩大普通方法调用结果。

最终门禁仍为 15 个组件 408 项、根包 30 项，组件 tarball、PHP 8.5 fixture、VSIX
内容及 VS Code 1.136.1 打包宿主均通过。宿主冻结八条标量属性诊断和四条对象属性
诊断，并证明否定 mixed 补集无额外误报；主 VSIX SHA-256 为
`48d47f43244ea14d10d5a2e282d9e21405f0b1c30b667b4b4cd7c3e42729c79a`。证据见
[mixed 属性谓词验收报告](reports/mixed-property-predicate-2026-09-08.md)。

## 2026-09-09 isset 非空流收窄

`isset(...)` 已证明为真的直接变量、静态属性名和非 nullsafe 属性路径现在会产生
非空流事实；多参数调用在整体真路径收窄全部受支持操作数，否定后提前终止的守卫
会把事实带入后续代码。普通 false 分支不推断 null-only，动态成员、nullsafe 路径和
数组下标仍保持 unknown。变量或属性修改及既有对象逃逸规则会使事实失效。

最终门禁通过：15 个组件 411 项、根包 30 项，其中 Parser 46、Semantic 189、
Language Server 78 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容和打包版
VS Code 1.136.1 宿主均验证通过。宿主冻结总计十五条属性流诊断，并验证 `isset`
后的 nullable 对象成员 Definition；主 VSIX SHA-256 为
`7b7123cd5151b7635972047dc0874a45fe9b900f43ac195d34ee83941671c70a`。第一次完整
测试中一个既有 Language Server 用例以 5082 ms 超过固定 5000 ms，未放宽预算，
同配置完整重跑通过。证据见
[isset 非空流收窄验收报告](reports/isset-flow-narrowing-2026-09-09.md)。

## 2026-09-09 数组字面量键控制流

`isset($array['key'])`、规范整数文字键、全局内建 `is_*` 谓词、严格 null 比较和
`instanceof` 现在会产生独立数组元素流事实。Semantic 可从 array shape、typed array
和 list 取得元素类型，并把同一结果用于正反分支实参诊断、对象成员补全及 Definition。
数组元素事实不会污染根变量；根数组
重赋值、任意下标写入或 unset、引用逃逸、引用 foreach 和根数组调用逃逸会撤销事实。
变量键、复杂字符串键、嵌套下标、属性容器和 false 分支仍保持 unknown。Semantic
snapshot 升至 schema 41。

最终门禁通过：15 个组件 413 项、根包 30 项，其中 Parser 46、Semantic 190、
Language Server 79 项；组件 tarball、PHP 8.5 fixture、VSIX 内容和打包版 VS Code
1.136.1 宿主均验证通过。宿主冻结总计二十一条属性/数组流诊断，并验证 `isset`
对象元素、对象 Union 正向/else 及严格非空 nullable 对象元素 Definition；主 VSIX
SHA-256 为
`8fbe6148079e86de39fbaddb2ba605ecdfccec7426c2f8f2f85229524a273590`。较早一次完整
测试中既有 Language Server 用例以 5116 ms 超过固定 5000 ms，未放宽预算；同配置
重跑通过，最终对象元素扩展后的完整门禁首次通过。完整证据见
[数组字面量键控制流验收报告](reports/array-element-flow-2026-09-09.md)。

## 2026-09-09 empty 假路径非空流

`empty(...)` 已证明为假的直接变量、静态非 nullsafe 属性路径和安全字面量数组键
现在会产生非空事实，包括 `!empty(...)` 分支及 `empty(...)` 提前终止后的继续路径。
nullable 标量进入参数诊断，nullable 对象属性和 array shape 元素进入成员补全与
Definition。`empty(...)` 真路径不被错误简化为 null；动态目标和复杂表达式保持
unknown。

最终门禁通过：15 个组件 416 项、根包 30 项，其中 Parser 46、Semantic 191、
Language Server 81 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容与 VS Code
1.136.2 打包宿主均验证通过。宿主冻结新增四条 `empty` 精确诊断、两个成员
Definition，整份属性/数组 fixture 共二十五条诊断。主 VSIX SHA-256 为
`d5d2844ebe7502f8dbb571cd61a558413248269e7dea11c05e60320bb5ca0a32`。既有泛型数组
测试按版本门控和传播行为拆分后，在不提高 5000 ms 预算的前提下稳定通过。完整证据见
[empty 假路径非空流验收报告](reports/empty-false-flow-2026-09-09.md)。

## 2026-09-09 直接 truthy 路径非空流

直接变量、静态非 nullsafe 属性路径和安全字面量数组键在已证明 truthy 的分支中
现在会产生非空事实；否定条件提前终止后的继续路径同样生效。nullable 标量进入
参数诊断，nullable 对象进入成员补全与 Definition。falsy 路径仍保留 PHP 广义空值
的不确定性，mixed 和动态目标保持 unknown。

最终门禁通过：15 个组件 418 项、根包 30 项，其中 Parser 46、Semantic 192、
Language Server 82 项；组件 tarball、PHP 8.5 fixture、VSIX 内容及 VS Code 1.136.2
打包宿主均验证通过。宿主冻结新增四条 truthy/falsy 精确诊断、两个对象成员
Definition，完整属性/数组 fixture 共二十九条诊断；主 VSIX SHA-256 为
`d0820f333eda5602a5dc4689c95816b1d34e3af4788221848b52797ea72b0a21`。完整证据见
[直接 truthy 路径非空流验收报告](reports/truthy-flow-narrowing-2026-09-09.md)。

## 2026-09-09 宽松 null 比较非空流

`!= null` 真路径和 `== null` 假路径现在与严格比较共享非空事实，覆盖直接变量、
静态属性路径及安全字面量数组键，并进入分支、else、提前终止后的继续路径、循环和
已支持合流。宽松相等真路径仍保留 PHP 广义空值不确定性，不推断 null-only。

最终门禁通过：15 个组件 420 项、根包 30 项，其中 Parser 46、Semantic 193、
Language Server 83 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容及 VS Code
1.136.2 打包宿主均验证通过。宿主冻结新增四条宽松 null 比较精确诊断，完整属性/数组
fixture 共三十三条诊断；主 VSIX SHA-256 为
`0674d40a6836fc01adbe5dd043ea38cdc653a8c00c563abe9fb13d1e481a4ece`。既有泛型数组
测试按版本门控和传播行为拆分后，在不提高 5000 ms 单测预算的前提下完整测试首次
通过。完整证据见
[宽松 null 比较非空流验收报告](reports/loose-null-flow-2026-09-09.md)。

## 2026-09-09 嵌套安全数组键路径控制流

类型谓词、`isset`、`empty` 假路径、直接 truthy 守卫、严格/宽松 null 比较和
`instanceof` 的数组元素事实已从单键扩展到最多 16 层安全字符串或规范整数文字键。
Semantic 递归读取 array shape、typed array 和 list 元素类型，并用同一条完整路径驱动
实参诊断、成员补全及 Definition；动态键、超预算路径和数组与属性混合路径保持
unknown。根数组重赋值、任意下标写入或 unset、引用及调用逃逸继续撤销事实。

最终门禁通过：15 个组件 423 项、根包 30 项，其中 Parser 47、Semantic 194、
Language Server 84 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容及 VS Code
1.136.2 打包宿主均验证通过。宿主冻结新增六条嵌套路径精确诊断和四个对象成员
Definition，完整属性/数组 fixture 共三十九条诊断；主 VSIX SHA-256 为
`8bfbca82b06cb1a71296fcfd33dbdd030d3e3a532a2d28a07b4f5730e2e131cb`。嵌套写入
失效及 16/17 层预算边界回归加入后完整测试首次通过，固定 5000 ms 单测预算未变。完整证据见
[嵌套安全数组键路径验收报告](reports/nested-array-path-flow-2026-09-09.md)。

## 2026-09-09 array_key_exists 键存在流

全局 `array_key_exists()` 及官方别名 `key_exists()` 的真路径现在产生独立“键存在”
事实。该事实只移除 array shape 可选标记带来的缺失可能性，保留字段类型显式声明的
null；直接与嵌套安全数组集合均进入实参诊断、成员补全和 Definition。命名空间同名
函数、false 路径、动态键和超预算路径保持 unknown，数组修改继续撤销事实。PHP
7.2–7.4 的对象参数重载及 PHP 8.0 起的 array-only 边界同时保留在版本目录中。

最终门禁通过：15 个组件 425 项、根包 30 项，其中 Language Spec 11、Parser 47、
Semantic 195、Language Server 85 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容
及 VS Code 1.136.2 打包宿主均验证通过。宿主冻结新增两条精确诊断、两个存在路径的
成员 Definition，并验证显式 nullable 与修改后的路径均无 Definition；完整属性/数组
fixture 共四十一条类型不兼容诊断。主 VSIX SHA-256 为
`b3c4e4a9fc91b222f609a2a3d74bc50f8fd1baaa27c2857b4be9e3f92874446a`。完整测试首次
通过，固定 5000 ms 单测预算未变。实施与验收证据见
[array_key_exists 键存在流验收报告](reports/array-key-exists-flow-2026-09-09.md)。

## 2026-09-09 is_a 对象类型控制流

全局 `is_a($value, Type::class)` 在 `$allow_string` 省略或明确为 false 时已进入统一
类型谓词流：正向路径把 mixed 或对象 Union 精化为目标类型，false/else 路径从有限
Union 排除目标成员，并覆盖命名参数、提前终止守卫、直接属性和安全数组路径。参数
诊断、成员补全和 Definition 共用结果。动态 class、`$allow_string=true`、动态第三
参数及命名空间同名函数保持 unknown；显式全局调用仍可解析。Semantic snapshot 升至
schema 44。

最终门禁通过：15 个组件 428 项、根包 30 项，其中 Parser 48、Semantic 196、
Language Server 86 项；15 个组件 tarball、PHP 8.5 fixture、VSIX 内容及 VS Code
1.136.2 打包宿主均验证通过。宿主冻结新增七条精确诊断和五个对象成员 Definition，
完整属性/数组 fixture 共四十八条类型不兼容诊断；主 VSIX SHA-256 为
`03dd89031dd370bb4568c9ce6c0653f36a2af88b5a5289fdf400852654c733ea`。首次宿主运行
暴露既有属性阶段选择器包含新增 `$box->object` 用例；收紧旧阶段范围后第二次通过，
没有改动产品逻辑或等待预算。实施与验收证据见
[is_a 对象类型控制流验收报告](reports/is-a-object-flow-2026-09-09.md)。

## 2026-09-09 is_subclass_of 严格对象子类型控制流

全局 `is_subclass_of($value, Type::class, false)` 已进入统一对象控制流。实现使用严格
子类型关系，目标类型自身不会被误判为子类；正向路径保留已证明的子类，false/else
路径从关系完整的有限 Union 排除这些子类。命名参数、否定和提前终止守卫、直接属性、
最多 16 层安全数组路径均复用相同诊断、成员补全和 Definition 消费链。

第三参数省略、为 true 或动态值时仍允许 class-string，因此不产生对象事实；动态 class、
无法表示的 mixed 补集和命名空间同名函数同样保持 unknown。Semantic snapshot 升至
schema 45，旧 schema 44 缓存会安全重建。

验证覆盖 Parser、Semantic、Language Server 和打包 Extension Host；详细命令、测试数量、
VSIX 哈希及日志见
[is_subclass_of 严格对象子类型控制流验收报告](reports/is-subclass-of-object-flow-2026-09-09.md)。

## 2026-09-09 is_callable 运行时可调用性控制流

`is_callable($value)` 与明确 `syntax_only: false` 的调用现在产生 callable 正向事实和
有限 Union 反向事实，并覆盖命名参数、提前终止守卫、直接属性与安全数组路径。PHP
只做回调结构检查的 `syntax_only=true` 以及动态布尔值不会再被当作运行时 callable
证明；命名空间同名函数继续保持 unknown。

Semantic snapshot 升至 schema 46，旧 schema 45 缓存会安全重建。详细测试、打包和
宿主证据见
[is_callable 运行时可调用性控制流验收报告](reports/is-callable-runtime-flow-2026-09-09.md)。

## 2026-09-09 is_object 具体对象分支

全局 `is_object()` 对声明为具体对象与标量的参数 Union 收窄时，现在会保留具体对象
身份。正向分支与否定提前退出后的继续路径可提供成员补全和 Definition，false/else
分支继续驱动精确实参诊断；命名空间同名函数不产生事实，显式全局调用仍生效。

Semantic snapshot 升至 schema 48，旧 schema 47 缓存会安全重建。详细验证见
[is_object 具体对象分支验收报告](reports/is-object-concrete-flow-2026-09-09.md)。

## 2026-09-09 is_a 子类型身份保留

对象模式 `is_a(Child|Other, Base::class)` 的真路径现在保留实际 `Child` 身份，
成员补全和 Definition 不再退化到 `Base`。false/else 或目标分支提前退出后的继续路径
会排除目标及所有关系完整的已知子类型，并保留其余 Union 成员。mixed 或宽泛 object
仍可按目标类型精化，命名空间 shadow 和 string-enabled 边界维持既有保守规则。

Semantic snapshot 升至 schema 49，旧 schema 48 缓存会安全重建。详细验证见
[is_a 子类型身份保留验收报告](reports/is-a-subtype-preservation-2026-09-09.md)。

## 2026-09-09 对象谓词多子类型保留

对象模式 `is_a()` 与严格 `is_subclass_of(..., false)` 的真路径现在在参数、直接属性
和安全 array shape 路径上保留全部已证明子类型。`ChildOne|ChildTwo|Other` 会精化为
两个 Child 分支，只暴露签名一致的公共成员；Definition 返回两个实际声明。false 路径仅在关系完整时排除匹配候选，mixed
等不确定补集保持 unknown。

Semantic snapshot 升至 schema 50，旧 schema 49 缓存会安全重建。详细验证见
[对象谓词多子类型保留验收报告](reports/object-predicate-subtype-unions-2026-09-09.md)。

## 2026-09-09 复合对象谓词具体类保留

`is_countable()` 的 `Countable|array` 与 `is_iterable()` 的 `iterable` 目标现在通过共享类型代数逐项筛选参数 Union。真路径会保留已证明实现 `Countable` 或 `Traversable` 的具体类，因此接口成员、实现类专有成员、补全和 Definition 保持一致；无关对象候选被排除，包含数组或关系不完整的结果仍保守降级。Semantic snapshot 升至 schema 51。

同一类型代数也覆盖 `is_callable()`：带公开实例 `__invoke()` 的具体对象会在参数、直接属性和安全 array shape 路径上保留类身份，专有成员补全与 Definition 不再退化成抽象 callable。

详细证据见 [复合对象谓词验收报告](reports/composite-object-predicates-2026-09-09.md)。

## 2026-09-09 属性 PHPDoc 安全精化

紧邻属性的 `@var` 不再因为存在原生类型而被统一丢弃。原生 `mixed` 接受结构化文档类型；array/list/shape、iterable、class-string、callable/Closure 和同基类型只在可证明属于原生边界时进入成员与控制流模型。冲突文档继续由诊断报告，查询侧保留原生类型，不暴露伪成员。Semantic snapshot 升至 schema 52。

详细证据见 [属性 PHPDoc 安全精化验收](reports/property-phpdoc-refinement-2026-09-09.md)。

多属性声明中的 `@var Type $property` 已进一步按属性名绑定：指定标签只影响匹配属性，未指定变量的标签才共享给整条声明；索引与冲突诊断复用同一选择规则。Semantic snapshot 升至 schema 53。

构造器提升属性现在复用同名参数已经通过原生边界检查的 PHPDoc 类型。`@param Service $service` 可精化 `public mixed $service`，而 `public int $service` 等冲突声明仍保留原生类型。Semantic snapshot 升至 schema 54。

## 2026-09-09 局部变量 PHPDoc 类型断言

紧邻局部赋值且显式写出同名变量的 `@var Service $service` 现在进入统一局部类型模型，可驱动成员补全、Definition、成员链与参数类型诊断。结构化 `@var array{service: Service} $data` 也可沿安全字面量键提供成员补全与 Definition，并在偏移写入后失效。注解只在赋值所在词法作用域内生效，下一次同名赋值会覆盖该事实；错名、无变量名、残缺或无法解析的注解保持 unknown。Semantic snapshot 升至 schema 55。

详细证据见 [局部变量 PHPDoc 类型断言验收](reports/local-variable-phpdoc-2026-09-09.md)。

## 2026-09-09 独立局部 PHPDoc 类型断言

独立 `/** @var Service $service */` 现在可在同一语句块内精化此前已有的局部变量，无需绑定新赋值；对象、复合对象和 array shape 字面量键均进入成员补全、Definition、成员链与参数诊断。事实不会从条件、循环或闭包块泄漏到其他块；后续赋值、复合修改、自增减、`unset`、引用绑定、引用 foreach 或已证明按引用调用会使其失效，普通按值调用保持事实。后续同变量残缺注解会阻止旧断言继续生效。查询在访问 CST 前按变量名筛选 PHPDoc 候选，Semantic 203 项全量回归为 28.61 秒。Semantic snapshot 升至 schema 56。

详细证据见 [独立局部 PHPDoc 类型断言验收](reports/standalone-local-variable-phpdoc-2026-09-09.md)。

## 2026-09-09 原生 assert 类型控制流

独立原生 `assert()` 现在可把正向及有限 Union 的否定 `instanceof`、严格非空、`!is_null`、正反已解析内建类型谓词、严格 `true`/`false` 字面量比较、`isset` 与 `array_key_exists` 事实应用到同一语句块后续代码，精化参数、断言前已有精确类型的局部值、直接属性和安全 array shape 路径。`!is_numeric` 只排除一定满足谓词的 int/float，保留可能返回 false 的 string；`T|false !== false` 保留 `T`，`bool !== false` 得到字面量 `true`，严格相等可把 mixed 收窄为对应字面量；mixed 的否定字面量比较、宽松比较或无法表示的补集保持 unknown。单参数、静态字符串/`null` 描述的两参数位置或命名形式、命名换序与肯定合取中的必然原子受支持；嵌套调用、动态描述、参数展开和不确定析取保持 unknown。成员补全、Definition、成员链与参数诊断共用事实，并在目标修改后失效。Semantic snapshot 升至 schema 61。

详细证据见 [原生 assert 类型控制流验收](reports/native-assert-flow-2026-09-09.md)。

## 2026-09-09 严格布尔字面量控制流

普通 `if`、else 与可证明提前退出守卫现在消费两侧均可放置字面量的严格 `===`/`!== true|false` 事实。`T|false` 可在参数、断言前已有精确类型的局部变量、直接可见属性和安全 array shape 路径中保留 `T`，`bool !== false` 得到字面量 `true`；补全、Definition、成员链和参数诊断使用同一类型。赋值等既有目标修改规则会撤销事实，宽松 `==`/`!=` 与 mixed 的否定补集保持 unknown。PHPDoc `array{...}|false` 现在可逐分支安全精化原生 `array|false`；排除根变量 false 后，安全 shape 元素进入相同补全、Definition 和诊断链，严格比较事实也传播到逻辑已证明的短路右操作数和三元表达式的确定 arm；独立检查起点确保条件内后续按引用修改撤销事实。Semantic snapshot 升至 schema 63。

详细证据见 [严格布尔字面量控制流验收](reports/strict-boolean-literal-flow-2026-09-09.md)。

## 2026-09-09 空合并表达式类型传播

`left ?? right` 现在由精确 CST 节点驱动：仅从左侧类型删除 `null`，再与实际可达的右侧类型合并。左侧确定非空时不要求右侧可推断；左侧可能为空且右侧未知时保持 unknown。`false`、`0` 与空字符串保留，nullsafe 调用、括号和右结合嵌套可经同块局部赋值进入补全、Definition 与参数类型诊断。Semantic snapshot 升至 schema 64。

完整证据见 [空合并表达式类型传播验收](reports/null-coalescing-flow-2026-09-09.md)。

## 2026-09-09 普通三元表达式结果类型

完整 `condition ? trueArm : falseArm` 现在按 CST 字段计算结果：普通条件要求两侧均可证明并组成 Union，字面量 `true`/`false` 只求值可达 arm。结果经同块局部赋值进入补全、Definition 与参数诊断；可达 unknown 与 Elvis 简写保持 unknown。Semantic snapshot 升至 schema 65。

完整证据见 [普通三元表达式结果类型验收](reports/ternary-result-flow-2026-09-09.md)。

## 2026-09-09 match 表达式结果类型

带唯一 default、最多 64 个 arm 且每个值结果可证明的 PHP 8 `match` 现在合并结果 Union，`throw` arm 作为 `never` 排除，并经同块局部赋值进入补全、Definition 与参数诊断。缺少 default、unknown 值 arm 或超预算时保持 unknown。Semantic snapshot 升至 schema 66。

完整证据见 [match 表达式结果类型验收](reports/match-result-flow-2026-09-09.md)。

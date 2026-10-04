# 魔术方法修饰符与声明注释补全

日期：2026-10-03。源码、完整语义、定向协议与 Linux 可见编辑器通过。

## 修改

- 明确 static 的方法只建议适用的 __callStatic／__set_state；private／protected 位置仅保留合同允许的构造、析构和 clone 名字，保留现有版本、枚举、去重和继承 final 过滤。
- 未写 static 时仍可选择需要它的方法，同一 LSP CompletionItem 通过 additionalTextEdits 在 function 前补上。已有 static 不重复插入，不修改已有参数、注释或可见性。
- 声明上下文取得可靠的 static、visibility 和 function 原文位置；按已解析 commentRanges 遮蔽注释，保留 UTF-16 长度及 CR/LF。声明关键字与名称之间的换行或注释可识别；导入、成员引用、匿名类引用和字符串反例保留。
- 注释文本一次拼接。首个独立原型逐条重复制头部，242 KB／1500 注释样例 P95 379.29 ms，超预算；线性拼接原型约 35.83 ms。当前构建同样例仅声明上下文 P95 50.61 ms。

## 证据

| 门禁 | 结果 |
| --- | --- |
| 完整语义 | 69 文件、1299/1299，47.31 秒，4 worker |
| 当前 Core 定向 stdio | 4 文件、10/10，10.59 秒；PHP 7.2／8.5 各 9 修饰符场景，并回归枚举、去重及继承 final |
| 1500 注释真实协议热查询 | 两版各 20 热样本；P95 106.15／101.43 ms，均满足 150 ms 门槛；每次核对候选和 static 编辑 |
| Linux VS Code 1.140.0 | 8 次 Enter/Tab，类／枚举／已写 static／注释，准确文本、光标、Undo/Redo、磁盘保护通过 |
| 可见列表等待 | 8 次显式触发后首次观察为 144.94–217.51 ms；已预查询 provider，包含 CDP 轮询，不是按键到自动弹出的等待 |
| 构建和检查 | Semantic／Server／Core、根 tsc --noEmit、扩展测试 tsc --noEmit、定向 lint 退出 0 |

PHP 实际加载和独立原型历史见[审计](completion-magic-static-audit-2026-10-03.md)。接口、Trait、匿名类、大小写、引用声明和不同注释位置含在新增 31 项语义正反例中。编译首次指出可选捕获组的类型保护缺失，补齐后构建通过；语义分组本身要求捕获至少一个修饰符，运行行为不变。

规则依据 [PHP 魔术方法](https://www.php.net/manual/en/language.oop5.magic.php)的正常声明合同。旧 PHP 有些不合适的 static 声明仅警告或可加载，实际记录保留；补全不推荐这些旧式声明，也不擅自改变 private/protected。本次提供名称、括号与修饰符补齐，已有参数由用户继续编辑；没有扩展为完整魔术方法签名模板系统。

此前完整协议 494 项／Core C2 65 条属于本次修饰符修改之前。本次没有重跑当前完整协议或 C2，Windows 与真人 WSL 单列；注释密集独立样例也不能代表大 Composer 项目。未打包、提交、推送或更新 Profile。

后续[当前集中集成](completion-modifier-integration-2026-10-03.md)已完成本修饰符产品输入下的完整协议 496/496（零跳过）、完整 Core C2 65、正式夹具修正后的标准 Core／Symfony C3 68、三版 C1 操作链及当前重启／冷父类竞态。原本节的“未重跑”是定向批次时点，不能据此误读为当前仍缺集中结果；真人 WSL 与完整平台矩阵继续单列。

## 2026-10-04 注释密集声明热查询优化

继续处理后续完整 LSP 曾出现的 185.57／209.14 ms 超预算。先串行测量当前旧 bundle 的同一 242,729 字节、1500 注释、各版 20 热样本夹具。语义 CPU 采样发现，多条声明／前缀正则反复扫描整份头部；缓存注释遮蔽本身不能解决这一成本。

现每个活跃 SemanticFile 最多保留一份遮蔽注释后的前缀，通过 WeakMap 随文件释放；源码或解析注释集合变化不复用。声明前缀从光标向后扫描当前标识符；声明正则限定到最后一个语句／块边界后的完整尾部，并将匹配位置恢复成绝对 UTF-16 位置。不使用固定字符截断，尾部的长注释与换行仍完整保留；成员、导入和参数边界仍按现有规则处理。

| 独立真实 LSP | 旧 bundle 热 P95 | 当前 bundle 热 P95 | 当前第一次查询 |
| --- | ---: | ---: | ---: |
| PHP 7.2 | 102.83 ms | 28.52 ms | 70.30 ms |
| PHP 8.5 | 101.14 ms | 34.93 ms | 65.98 ms |

原始数据分别在 `/tmp/sophp-magic-header-baseline/` 和 `/tmp/sophp-magic-header-current/` 的 `magic-modifier-stdio-*.json`。每次继续精确核对 __call／__callStatic、static 编辑及插入文本，原 150 ms 门槛未改。第一次查询发生在诊断更新后，不是整个冷启动。中间 `/tmp/sophp-magic-header-fixed.log`、`/tmp/sophp-magic-header-tail.log` 实际仍运行旧扩展 bundle，保留记录但不作为优化证明；最终显式执行 production bundle 后，当前日志为 `/tmp/sophp-magic-header-current.log`。

当前完整语义 79 文件／1366 项通过（`/tmp/sophp-magic-header-full-semantic.log`）；新增 CRLF／Unicode 注释、光标前后移动、未保存源码替换、恢复原文和移除后替换为导入的回归。五文件／13 项定向 LSP 回归通过（`/tmp/sophp-magic-header-protocol-regression.log`），覆盖继承 final、枚举、属性／参数声明边界、属性 hook 和普通魔术方法。构建、根 TypeScript、定向 ESLint 与 diff 检查通过。

`/tmp/sophp-magic-header-host.log`：Linux 隔离 VS Code 宿主退出 0，通过实际 Completion Provider 对同一注释密集文件的重复查询、未保存加入 static、一次 Undo 和恢复后的精确候选及 additionalTextEdits 核对，磁盘保持原文。可复用 Test-only 选择器 `PHP_COMPANION_TEST_C2_MAGIC_HEADER_ONLY=1`；不是产品设置。该宿主测试没有测实际可见弹窗等待或用户 Enter/Tab 接受，不冒称真人 WSL UI 验收。

这是注释密集独立文档的性能改善，不关闭原完整 LSP 组合负载失败、大 Composer 项目／全部冻结场景性能或真实 WSL 门槛。未打包、更新 Profile、提交或推送。

后续当前完整 Language Server 回归已结束：`pnpm --filter @php-companion/language-server exec vitest run`，日志 `/tmp/sophp-magic-header-full-lsp.log`，56 文件、837 项通过、1 项条件跳过、零失败，1506.37 秒，退出 0。沿用默认并发和所有既有断言，未筛掉性能失败；此前两项魔术方法热 P95 失败在此完整运行范围内已通过。未输出该轮具体 P95，单独样例的数值不当作全量运行实测数值。唯一跨进程引用 bundle 条件跳过单列补验，默认完整运行不称为零跳过验收。上文“完整 LSP 组合负载失败未关闭”是定向批次状态，不改写历史失败日志，也不据此证明大项目／全部操作预算。

条件项补验：将 PHP_COMPANION_TEST_REFERENCE_BUNDLE 指向当前 dist/language-server.js，显式选取跨进程引用恢复及变更输入撤回用例。`/tmp/sophp-magic-header-reference-bundle.log` 一项通过、498 项未选中，77.62 秒。补验结果独立记录，未把默认完整运行改写成零跳过；也没有改变该用例的原断言。

### 连续编辑与缓存内存

复用 scripts/benchmark-project-completion.mjs，独立临时 Composer 项目的 Editing.php 保留上述 1500 注释／常量、未闭合 class 前缀；分别追加 `public static function __ca{{cursor}}($name,$args){} }` 和 `private function __con{{cursor}}(){} }`。当前 bundle 与 parser WASM 配套，开启 SOPHP_BENCHMARK_GC=1、SOPHP_BENCHMARK_EXPECT_FIRST=1，交替 300 轮。每轮核对首位 __callStatic／__construct，另一侧旧候选不出现，不完整列表为零；未要求 resolve，未修改磁盘。原始[测量 JSON](completion-magic-header-edit-memory-2026-10-04.json)纳入回归材料，临时项目测量后移除，日志保留。

GC 后 heapUsed 第 1／100／300 轮为 39.60／30.34／30.62 MiB，第 100–300 轮增加 0.28 MiB；external 约 34 MiB、arrayBuffers 约 0.02 MiB。RSS 从 228.89 MiB 增至 311.16 MiB，不能把该数字隐去或直接当成保留对象泄漏。这是单文档 300 轮短时证明，不关闭两小时、多文档、全部缓存或平台的内存验收。

连续编辑后立即请求补全的全链路 P95 为 383.56 ms，包含源码解析／语义更新；即使候选断言通过和堆增长趋缓，也不能称该路径满足 150 ms。GC 会改变运行状态，此数字用于定位剩余编辑成本，不替代普通运行性能门禁。下一项核对该注释密集文档的更新成本；不改写上文已有同一文档未修改时的热查询改善。

### 更新成本采样与常量表达式诊断

后续沿用同一夹具，100 轮 CPU 采样（无显式 GC）确认：publishDocumentDiagnostics／analyzePhpDocument 的解析及语法检查占主要调用链，semantic update 也有独立成本；候选并非主要等待来源。`/tmp/sophp-magic-update-profile.json` 的 P95 为 376.19 ms，带 profiler，不作为普通运行基线。当前诊断已经有 25 ms 合并窗口，本次不通过延迟或删除诊断来获取更好的测量数字。

明确发现 invalidConstantExpressionCallables 在每个常量名、注释和字面量上追溯父节点，而只有 arrow_function、anonymous_function 和 variadic_placeholder 能产生该类诊断。现先判断节点类别再检查 ancestry，所有子节点仍遍历，原 callable 限制、范围及诊断内容保留。单独对同一真实语法树的 20 热样本测量，检查器 P95 从 50.02 ms 降为 10.13 ms（`/tmp/sophp-constant-callable-walk-before.json`、`/tmp/sophp-constant-callable-walk-after.json`）；这是局部检查成本，不是整个补全链路。

当前普通运行 100 轮 P95 为 341.63 ms，P50 276.89 ms；每轮首位候选、旧候选缺席及磁盘不变通过，不完整列表为零，见 `/tmp/sophp-magic-update-plain-after.json`。仍未达到 150 ms，不能与上轮显式 GC 或 profiler 数字混用以声称严格同比改善。语言规格 15 文件／249 项、实际文档分析 47 项通过，包含 PHP 8.5 常量表达式 callable 正反例；构建、根 TypeScript 和定向 ESLint 通过。之前完整 LSP 837 项属于 863c74c 输入，未用它冒称本次增量后的完整验收。

当前 bundle 的 `/tmp/sophp-constant-callable-host.log` 隔离 VS Code 宿主退出 0：注释密集文档重复查询、未保存 static 修改、Undo 和精确候选／编辑继续通过，磁盘不变。没有可见弹窗等待、真实 WSL 或完整长期使用声明。临时项目已移除，原始测量与 CPU profile 保留；本增量未提交、不更新 Profile。

### 同一文档解析结果复用

语义更新和诊断先后消费相同源码时，后者原来再次提取完整解析事实。解析器现在最多保留一个带文档身份的结果，仅在 URI 与源码完全一致、且未传入增量语法树时复用。事实深复制、语法树独立复制；调用方修改事实、编辑或释放树不会改变其它调用方结果。替换缓存及 dispose 会释放缓存自己的树；错误恢复树的标记保留。诊断传入文档 URI，避免匿名类身份跨文档混用。

普通、无 profiler／显式 GC 的同类 1500 注释输入，100 轮交替编辑后立即补全 P95 300.80 ms、P50 247.63 ms（`/tmp/sophp-parser-reuse-edit.json`）；上一版同类普通测量为 341.63／276.89 ms。这是本地样本观察，仍超 150 ms，不宣称完整性能门禁通过。首位 __callStatic／__construct、旧候选缺席、不完整列表为零及磁盘不变均通过；临时 Composer 项目已移除。

解析器 3 文件／103 项通过，包括事实修改、树释放、增量编辑、旧源码恢复、legacy 恢复树和不同 URI 的匿名类隔离；语义全量 79 文件／1366 项、实际诊断 47 项、定向声明／枚举／魔术方法协议 3 文件／8 项通过。根 TypeScript、定向 ESLint 通过。日志保留为 `/tmp/sophp-parser-reuse-{tests-final,semantic,analysis,protocol,typecheck,lint}.log`。先前完整 LSP 837 项仍属于 863c74c 输入，未冒称本增量完整验收。

同一输入另做 300 轮显式 GC 内存检查，每轮候选／排序／撤回及磁盘不变通过。GC 后堆第 100／300 轮为 31.23／31.51 MiB，后 200 轮增量 0.28 MiB；external 约 34 MiB，arrayBuffers 0.02 MiB，RSS 第 1／300 轮为 244.13／285.38 MiB。这只覆盖单文档交替编辑的有界样本，不证明长期使用无泄漏。该 GC 运行的 P95 338.97 ms 不混入普通性能样本，仍超 150 ms。[原始 JSON](completion-parser-reuse-edit-memory-2026-10-04.json)保留全部采样；临时项目已移除。

当前 bundle 的隔离 VS Code 宿主 `/tmp/sophp-parser-reuse-host.log` 退出 0：注释密集文档重复查询、未保存 static 修改、Undo 及精确当前候选通过；没有将 Provider 自动化冒称可见列表等待或真人 WSL 验收。开始当前增量的默认完整 LSP 回归，日志 `/tmp/sophp-parser-reuse-full-lsp.log`；结束前不记为通过、不提交此增量、不更新 Profile。

完整回归输入纠正：首轮 `/tmp/sophp-parser-reuse-full-lsp.log` 在约五分钟时主动 SIGINT 停止（Vitest 130，命令包装退出 1），未获完整终态，不计为通过。部分用例启动 packages/language-server/dist/server.js，而其 analysis.js 原来仍是 11:06 的旧构建、没有 document.uri 参数；根 bundle 与此前魔术方法协议／宿主对应当前源码，但不足以证明包内入口。已执行 language-server build 并检查编译入口现包含 document.uri，构建日志 `/tmp/sophp-parser-reuse-server-build.log`。纠正构建输入后另开完整回归，保留首轮日志，不覆盖或将首轮冒称当前验收。

重建后默认完整 LSP 原进程结束：56 文件、837 通过、1 条件跳过、零失败，退出 0，1596.52 秒；日志 `/tmp/sophp-parser-reuse-full-built-lsp.log`。结束时逐字核对 `/tmp/sophp-parser-reuse-full-built-inputs.json` 中 1727 项源码／测试／构建输入，变化为零。没有放宽原断言或 150 ms 热查询门槛；默认摘要不输出各项 P95，不能用普通编辑的 300.80 ms 或局部热样本代替它。唯一跨进程引用 bundle 条件项开始另用当前 bundle 补验，结束前不改默认 1 跳过的事实。

当前 bundle 的跨进程引用条件项补验退出 0：1 个目标用例通过，498 个其它用例由 -t 筛选而未运行，84.59 秒；日志 `/tmp/sophp-parser-reuse-reference-bundle.log`。不改写默认完整回归的 1 条件跳过。解析复用与常量表达式检查、相关测试和原始内存 JSON 作为本地源码里程碑收口，提交标题 `perf(core): reuse document parses and bound constant checks`；本节此前“未提交”是当批状态。保留首次未重建包内入口的停止日志和超预算输入数据，没有打包、推送、更新 Profile 或关闭真人 WSL 验收。


### 最高版本的无结果诊断遍历

2026-10-04 在 be9cca7 源码下对同一 1500 注释／常量文件做新的 CPU 定位：`/tmp/sophp-edit-profile-current` 保留原 CPU profile；`/tmp/sophp-edit-profile-current-summary.json` 保留采样汇总。诊断的版本特性检查累计约 3.2 秒／100 轮；Profiler 时序单列，不当作普通性能。

所有 `unsupportedSyntax` 特性最低版本均受 `SupportedPhpVersion` 类型约束，支持列表有序；最高支持目标不可能产生版本不支持诊断。现在该目标立即返回空结果。较低版本走原规则，语法合法性和非法常量表达式等独立诊断保持原检查。

本次串行、无 profiler／显式 GC 的普通 100 轮编辑测量：优化前 P50／P95 255.16／331.46 ms，优化后 227.58／290.12 ms。首位 __callStatic／__construct、另一侧旧候选缺席、不完整列表为零与磁盘不变全部通过。它是本地样本改善，**仍超过 150 ms**；没有重复等价测量直到得到绿色。原始 [JSON](completion-version-walk-edit-2026-10-04.json) 分开记录 profiler 与普通前后样本。自己的临时 Composer fixture 已移除，原 CPU profile 和日志保留。

语言规格完整 15 文件／249 项、实际文档诊断 47 项通过，日志 `/tmp/sophp-version-walk-{spec,analysis}.log`；包构建与定向 lint 通过。当前隔离 Linux 1.140.0 宿主重复补全、未保存 static 修改、Undo、精确候选和磁盘不变通过，`/tmp/sophp-version-walk-host.log` 退出 0。没有运行本增量的全量 LSP、内存或可见等待门槛，不能用历史全量结果宣称本次完整通过。

本增量先留在同一开发分支，不例行提交、推送、打包或更新 Profile。原路线图继续，编辑等待和真人 WSL 保持开放。


### 无错误树的恢复扫描前提

沿前一轮 CPU 证据继续检查：分析器的 `(void)` ERROR 恢复整树扫描没有先检查树是否有错误；枚举属性 ERROR 恢复也在没有枚举、没有语法错误的普通类中遍历。现分别以 root.hasError，以及已解析枚举集合非空且 root.hasError 为入口前提。两个扫描内部、原有节点预算和范围处理不变；普通 `(void)` 括号表达式的合法性检查仍独立执行，不能因为树无 ERROR 就删除它。

使用与前一轮字节 SHA256 完全一致的临时源码、同一普通 100 轮交替编辑参数，当前 P50／P95 为 208.27／254.21 ms；此前版本遍历优化后的样本为 227.58／290.12 ms。每轮首位、另一侧旧候选缺席、不完整列表为零及磁盘不变通过；**仍未达到 150 ms**。记录追加到 [同组 JSON](completion-version-walk-edit-2026-10-04.json) 的 errorRecoveryGuardAfter，不合并 profiler 时间，不重复相同测量直到绿色。自己的临时 Composer fixture 已删除。

当前构建下实际分析器 47/47 通过，`/tmp/sophp-diagnostic-recovery-analysis.log`；真实 stdio F02-VERSION-01（7.2／8.1／8.5）和 PHP 8.5 NoDiscard／void-cast 两条通过，497 条未选中，`/tmp/sophp-diagnostic-recovery-protocol.log`。这是定向协议，不冒称全量 499 通过。当前隔离 Linux 1.140.0 C2 注释密集补全、未保存 static 修改、Undo 与磁盘不变通过，`/tmp/sophp-diagnostic-recovery-host.log` 退出 0。构建、定向 ESLint、diff 检查通过。

此处没有重跑全量 LSP、九版本和可见等待；不把历史输入的全量结果或上一批最高版本 guard 的 249 条规格测试写成本批重新执行。两批性能增量保持同一分支尚未提交，不打包、推送或更新 Profile。原路线图和未完成预算继续保留。


### 当前合并增量的完整 LSP 回归（进行中）

2026-10-04 核验包内 language-spec／analysis／semantic／server 产物分别含最新版本遍历、ERROR 恢复入口、比较条件及 filterText 修复后，开始默认完整 `pnpm --filter @php-companion/language-server exec vitest run`。`/tmp/sophp-diagnostic-current-full-inputs.json` 冻结 1742 项源码／测试／构建输入，`/tmp/sophp-diagnostic-current-full-lsp.log` 保留原输出。进程会话 7203；启动后的轮询与实际 pnpm／Vitest worker 进程均确认仍运行。

结束前不记通过，不并行启动其它测试宿主或性能测量，不改变源代码／测试／构建产物。保留默认并发、150 ms 热断言和条件跳过的原配置；终态需核对冻结输入及实际汇总。两批诊断优化尚未提交，不打包或更新 Profile。原路线图 active。


完整回归等待期间的只读审计：原 CPU profile 的 readonlyPropertyAssignments 是另一热点。当前实现约 660 行，除了直接／间接属性修改，也处理按引用 foreach、构造初始化摘要及跨文件构造来源。因此不能用源码没有 `->` 作为快速返回条件：按引用 foreach 可以在没有该操作符时报告已初始化的 readonly 属性。后续优化须保留这些路径及摘要按需计算，先核对语义事实和对应反例。本次仅只读检查，未改变冻结源码或启动并行测试；回归原会话仍运行，未记通过。


### 合并回归终态与枚举实参断言核对

原会话 7203 已结束，默认完整回归退出 1：58 文件中 57 通过、1 失败；841 项中 839 通过、1 失败、1 条件跳过，1617.29 秒。结束后重新核验冻结输入 1742 项，零变化。原日志 `/tmp/sophp-diagnostic-current-full-lsp.log` 保留，不改写成全绿。

唯一失败为 stdio.test.ts 的枚举实参旧 filterText 断言：期望 ReCompletionColor::Red，实际 Red。be9cca7 的可见列表修复已经有意将匹配文本改为大小写对齐的枚举 case 名称，显示标签、插入内容仍为完整 CompletionColor::Red。核对实现后更新旧断言，并增加未保存 re 小写输入、精确替换范围以及接受后 paint(CompletionColor::Red) 文本检查；没有改变产品实现或放宽性能门槛。

目标用例补验 `/tmp/sophp-enum-argument-filter-regression.log` 退出 0：1 通过、498 未选中，5.32 秒。该结果是失败用例修正后的定向验收，不能声称重新执行后的完整 841 项全绿。默认完整回归的跨进程引用 bundle 条件跳过仍保持原事实。编辑样本 254.21 ms 仍超 150 ms，真人 WSL 与 Profile 仍未更新。


最终补充的三文件定向协议 `/tmp/sophp-diagnostic-milestone-values.log`：9 通过、493 未选中，19.59 秒，覆盖枚举实参、PHPDoc 字面量和 match／switch 条件；定向 ESLint `/tmp/sophp-diagnostic-milestone-lint.log` 退出 0。两项诊断遍历前提、枚举实参断言与证据作为本地源码里程碑收口，提交标题 perf(core): skip provably empty diagnostic walks。前文“进行中／未提交”为当批状态；完整回归原失败及定向补验分开报告，不打包、推送、更新 Profile 或停止 goal。

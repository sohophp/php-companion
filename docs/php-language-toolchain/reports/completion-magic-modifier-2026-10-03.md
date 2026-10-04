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

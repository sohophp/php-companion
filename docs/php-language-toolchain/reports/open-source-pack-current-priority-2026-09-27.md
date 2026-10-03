# Open Source Pack 整理与 SoPHP Core 起点

2026-10-02 默认组合复验：[当前源码 Pack 工作流](open-source-pack-current-workflow-2026-10-02.md)实际导航、格式化与 Undo、EditorConfig、调试启动退出和 PHPUnit CLI 均通过，八项输入前后一致，固定外部版本已核对。实际组合含额外 Apache 依赖；本机源码默认工作流复验缺口关闭，真实 WSL／跨平台／数小时实际使用仍开放。未打包或更新 Profile。

2026-10-02 当前补全集成：[完整 stdio 431/431](completion-current-integration-2026-10-02.md)已通过、零跳过、48 项终态输入一致，关闭下文 R49／R50 当时未全跑的集成缺口。独立 vendor 宿主 1,000 轮／6,000 次查询，以及两版本 Core 和 Pack 模板 Enter／Tab 接受也已通过。真实 WSL、数小时使用和完整冻结组合仍单列；未打包或更新 Profile，不继续扩展已通过的数组输入排列。

2026-10-02 词中数组字面量：[R50](c2-word-middle-array-literals-2026-10-02.md)关闭引号缺失时，恢复范围现包含光标右侧同一字面量的有界后缀，接受建议不留下重复文字或覆盖原箭头。32 个同输入对照全部正确，新共享 40 项、定向语义 88 项、本轮完整语义 1115 项、最终四项两版定向协议、完整 C2 及两版 C1 共 96 次相关可见列表／精确 Tab／Undo/Redo 通过；10k 文件 1600 查询 P95 11.14–44.44 ms，48 项终态一致。完整语义后仅有等价正则转义清理，最终协议及宿主已单列证明；未重跑完整 431 协议，未打包或更新 Profile。

2026-10-02 数组键接受文本：[R49](c2-existing-array-arrow-completion-2026-10-02.md)已修复未闭合键引号时覆盖原 `=>` 的问题，并阻止非法恢复回落到不安全范围。共享 24 项、全量语义 1075/1075、四项两版定向 LSP、完整 C2 及两版 C1 共 32 次目标可见列表／精确 Tab／Undo/Redo 通过；10k 文件 800 查询 P95 11.56–23.04 ms，45 项终态一致。修复前 [R48](c2-cached-array-literal-completion-2026-10-02.md)完整 429/429、零跳过及 42 项终态一致已通过，另有跨文件缓存契约 16 项；本批当前协议只报告四项定向，不冒充完整 431 项。未打包或更新 Profile。

2026-10-02 中间数组创建补全：[R47](c2-middle-array-literal-completion-2026-10-02.md)关闭已复现的八个缺口。新语义 24 项及当前完整 1051/1051、两版定向 LSP、完整 Core C2、两版 C1 可见列表与精确 Tab／Undo/Redo 通过；64 次目标弹窗等待 111–173 ms。10k 文件 800 查询 P95 18.51–45.54 ms，42 项终态一致。本轮未重跑完整 429 协议，R44 是修复前的历史结果；真实 WSL 与候选安装单列，未打包或更新 Profile。

2026-10-02 缓存与完整集成：[R46 缓存数组读取恢复](c2-cached-array-recovery-2026-10-02.md)四种加载模式 × 三种跨文件来源共 12 项语义与 Lint 通过，原消费快照和源码不变，后台完整事实与 eager 相等；声明源码的正常按需体加载可推进 revision，已单列。R44 正式完整 stdio 429/429、零跳过、1345.15 秒通过，40 项产品和 R45 工具终态一致。下一项已固定八个中间创建数组键／值缺口：EOF 正例正确，有后续源码时为空；按原专项补齐，不新增功能范围。未打包或更新 Profile。

2026-10-02 补全重启验证：[R45 未保存缓冲区恢复](c4-unsaved-completion-restart-2026-10-02.md)在真实 Linux Core-only Extension Host 中注入一次服务器崩溃，核对不同 PID 后取得未保存 Beta 补全及准确 Definition，缓冲区保持 dirty、磁盘仍为 Alpha，继续编辑可恢复 Alpha。正式独立宿主、Lint、宿主类型检查和原 40 项输入一致通过。默认 Core-only 宿主的提前返回已单列，未冒充重启测试。产品不变，R44 完整 429 项仍运行，真实 WSL／其它平台／长会话仍单列；未打包或更新 Profile。

2026-10-02 C2 异步补全修复：[R44 路由同版本重开](c2-route-reopen-completion-2026-10-02.md)已应用两个身份守卫；12 个名称／路径参数失败已修复，六个原本正确的 Definition 保留。正式 18 项协议、十项既有 stdio、可见 Route Status 宿主和 40 项终态一致通过。修复前 R42 完整 428 项加 bundle 条件补跑 1 项覆盖原 429 集合；新守卫的完整集成另行核对，不冒充已跑。未打包或更新 Profile。

2026-10-02 C2 取消验证：[R43 正在执行的补全请求](c2-completion-cancellation-2026-10-02.md)在 PHP 7.2／8.5 与三种索引模式下，实际标准取消通知使已暂停请求返回空，后续请求仍返回正确成员；六个独立真实 LSP 场景和脚本 ESLint 通过。产品输入 38 项不变，本批不计入正在运行的完整 429 项 stdio。没有新增生产设置或修改产品实现，未打包或更新 Profile。

2026-10-02 C2 性能修复：[R42 补全恢复查询索引成本](c2-recovery-index-performance-2026-10-02.md)已应用；公开查询副本保留完整索引，私有恢复副本保留项目事实且不重建无关背景索引。相同 10,000 文件、400 次正式测量，P95 从 209–220 ms 降至 11.77–15.62 ms，150 ms 预算通过，候选和 revision 保持。全量语义 1015/1015、六项定向真实 stdio、完整 Core C2、两 PHP 版本 76 次可见数组读取／精确 Tab／Undo/Redo 与 38 项终态一致通过。R41 的规模性能缺口已由本批关闭；完整 429 项协议集成与真实 WSL 人工验收仍单列。未打包或更新 Profile。

2026-10-02 C2 最新增量：[R41 文件中间的未闭合数组读取](c2-middle-array-access-completion-2026-10-02.md)已应用，25 项新增语义、全量 1014/1014、六项真实 stdio、完整 Core C2 与 PHP 7.2／8.5 共 76 次可见列表／精确 Tab 全文／Undo/Redo 通过；后续语句和括号不被覆盖，38 项终态输入一致。2,300 文件热查询最差 P95 32.38 ms；10,000 文件正式基线 400 次、P95 209–220 ms，规模预算未通过，下一步优先优化查询副本的索引复制，不放宽 150 ms。未重跑全部 429 stdio，未打包或更新 Profile。

2026-10-02 C3 原快照阻塞已修复：[有界文档数量](c3-document-snapshot-capacity-2026-10-02.md)用实际 133 份／32,605 字符输入确认 128 份上限导致事件引用撤回；语义 Provider 的数量合同统一为 512，字符容量不变。契约 14 项、Provider／宿主 41 项、八项真实 stdio 与实际新 Core／Symfony 完整 C3 组合通过，未保存 dispatch 与 Undo 撤回正确，37 项终态输入一致。两次旧 Symfony 构建失败及包名错误证据保留；当前完整 429 stdio 未重跑，真实 WSL 与路线图其它范围仍开放。未打包或更新 Profile。

2026-10-02 最新 C2 增量：[R39 已知数组读取键](c2-array-access-completion-2026-10-02.md)已应用，产品语义 989/989、四项定向 LSP、完整 Core C2 与 PHP 7.2／8.5 共 48 次可见列表、精确 Tab 全文及 Undo/Redo 通过；支持已知局部／参数／返回／嵌套形状，动态绑定和未知调用撤回，读取键不插入 `=>`。热查询最差 P95 32.61 ms，三十项终态输入一致。本批没有重跑全部 427 项 stdio；前批 R38 完整 425/425 是其自身源码证据。未打包或更新 Profile。

2026-10-02 最新 C2 增量：[R38 字符串键和值前缀](c2-quoted-prefix-completion-2026-10-02.md)已应用，产品语义 910/910、PHPDoc 21/21、六项定向 LSP 与 PHP 7.2／8.5 共 32 次可见列表、精确 Tab 全文及 Undo/Redo 通过；转义键名、标点／中文和美元符号不改变接受文本含义。热查询最差 P95 1.84 ms；完整 Core C2 已通过，二十七项宿主终态输入一致；完整 425/425 stdio 已通过、零跳过、1323.76 秒，二十七项终态一致。未打包或更新 Profile。

2026-10-02 最新 C2 增量：[R37 未闭合数组键和值补全](c2-unfinished-shape-completion-2026-10-02.md)已应用，主产品语义 852/852、六项定向 LSP、完整 Core C2 与 PHP 7.2／8.5 共 32 次可见列表、精确 Tab 文本及 Undo/Redo 通过；临时括号不进入文件。完整 423/423 stdio 已通过、零跳过、1325.31 秒，十九项终态输入一致；前批 R36 完整 421/421、零跳过、十六项终态一致已确认，不能替代本批。标点与转义前缀、真实 WSL 与完整 C3 Symfony 快照问题仍开放；未打包或更新 Profile。

2026-10-02 最新 C2 增量：[R36 联合数组形状共有键和值](c2-union-shape-completion-2026-10-02.md)已应用，产品语义 794/794、四项定向 LSP、完整 Core C2 与 PHP 8.5 可见列表／Tab／Undo/Redo 通过。PHP 7.2 可见列表／Tab／Undo/Redo 也已通过，完整 421 stdio 已通过、零跳过，十六项终态输入一致，十六项输入冻结。前批 [局部提取集中集成](c3-local-extraction-batch-integration-2026-10-02.md)完整 stdio 419/419、零跳过、十三项终态一致已确认；该结果不替代 R36。本批仍保留未闭合引号恢复与完整 C3 Symfony 快照问题，未打包或更新 Profile。

2026-10-02 前批 C3 增量：[连续赋值加末尾 return](c3-extract-method-local-returns-2026-10-02.md)已应用，当时产品语义 767/767、四项定向 LSP、编译与静态检查通过，独立编辑器七场景预览／Undo/Redo 全通过、十项输入终态一致。后续完整 stdio 419/419 与十三项输入终态一致已确认。完整组合的 Symfony 快照边界仍开放，停止重复清理尝试；未打包或更新 Profile。

2026-10-02 当前 C3 增量：[连续赋值与临时变量](c3-extract-method-local-chains-2026-10-02.md)已在完整协议 415/415 终态之后应用；产品语义 749/749、两项定向 LSP、编译与静态检查通过。单输出／捕获输出预览和一次 Undo/Redo 通过；完整组合因 Symfony 未保存 dispatch References 漏项失败；两种资源清理均失败并停止重试，七个独立提取场景通过；当前完整 stdio 417 未再全跑，未打包或更新 Profile。

日期：2026-09-27。本文是当前执行入口；历史报告保留当时的候选与测试结果。只核对 SoPHP 仓库和独立 Composer 夹具，不修改业务项目。

交付顺序已收紧为[稳定版优先的执行计划](../stability-first-delivery.md)：先冻结可用范围并完成真实安装验收，再改善高频体验，最后关闭 R4 全部范围。[最新候选门禁](stability-first-candidate-gate-2026-09-27.md)已通过源码、24 个组件包、完整 10 项 Pack 与 C3 打包宿主；真实 WSL 编辑器和新源码的跨平台 CI 仍待验收。

## 2026-10-02 当前源码状态

当前 [C3 分支输出列表](c3-extract-method-branch-output-lists-2026-10-02.md)：完整语义 722/722、两项定向 LSP 和 PHP 7.2／8.1／8.5 共 48 个实际路径通过；支持每分支 2–32 个必有独立输出，保留所有拒绝边界。标准组合 C3 宿主通过，新增三／四输出预览与一次 Undo/Redo 通过，八项输入终态一致；完整 415 项后续已通过（零跳过），未打包或更新 Profile。

当前 [R35 分支数组形状](c2-branch-shape-completion-2026-10-02.md)：709/709 语义、五项定向 LSP、Core C2 和 8.5 真实弹窗／Tab／Undo/Redo 通过；7.2 新弹窗 16 次、Tab／Undo/Redo 与 12 项终态输入一致通过，完整 413 项未再全跑。它在前批 [411/411 集成](c2-value-batch-integration-2026-10-02.md)与输入终态匹配后才应用，未打包或更新 Profile。

当前 [R34 取值分支补全](c2-branch-value-completion-2026-10-02.md)：语义 675/675、13 项定向 LSP、完整 Core C2 及未保存编辑／Undo/Redo 通过；合并取值左侧允许 null，match 条件隔离外层结果合同。[R32–R34 集成](c2-value-batch-integration-2026-10-02.md)完整 stdio 411/411、零跳过，完整 C2/C3、三版本可见列表及 12 项输入终态一致，未打包或更新 Profile。

当前 [R33 未完成声明成员补全](c2-trailing-callable-members-2026-10-02.md)：语义 658/658、八项定向 LSP、隔离 Core C2 与 Undo/Redo 通过；统一普通函数／方法和回调的末尾恢复，私有及静态 this 边界保持。当前完整 stdio 409 未全跑，R32/R33 下一批集中集成，未打包或更新 Profile。

当前 [R32 回调候选说明](c2-callback-completion-details-2026-10-02.md)：语义 645/645、六项定向 LSP 与隔离 Core C2／Undo/Redo 通过；当前完整 stdio 407 未全跑。前批 [R30/R31 集成](c2-callback-batch-integration-2026-10-02.md)已完成，405 个独立 stdio 用例分完整运行及缓存补跑全部验证，C2/C3、Lint、三版本可见列表及终态输入一致。未打包或更新 Profile。

最新 [R31 连续输入恢复](c2-trailing-callback-completion-2026-10-02.md)：语义 633/633、R30/R31 四项定向 LSP、隔离 Core C2 与 Undo/Redo 通过。完整 Core C2、标准组合 C3、Lint 和三版本可见列表通过；完整 stdio 404 通过／1 跳过后补跑缓存项通过，八项冻结输入终态一致；下方 403／624 及更早数字对应旧源码范围。未打包或更新 Profile。

当前新增 [R30 回调返回值补全](c2-callback-return-completion-2026-10-02.md)：语义 624/624、两项定向 LSP、隔离 Core C2 与 Undo/Redo 通过；当前 stdio 403 项尚未全跑。前一项 Extract Variable 增量语义 607/607、四项定向 LSP 与标准组合 C3 通过。下方集成数量保留原批源码范围，未打包或更新 Profile。

当前批次为 [操作数排序与两项内联保护集成](c2-c3-operand-inline-integration-2026-10-02.md)：全量语义 598/598、完整 Core C2、标准组合 C3、Lint 和三版本可见补全／接受文本通过；17 项输入终态一致，完整 stdio 399/399 已通过（零跳过、1244.27 秒）。下文旧数量保留历史范围，真实 WSL 与 renderer 异常单列，未打包或更新 Profile。

本批补全源码起点为 [R29 操作数排序](c2-operand-completion-context-2026-10-02.md)：当前全量语义 587/587、四项定向 LSP 与 100 轮连续编辑通过，P95 4.81 ms；定向 Core C2 宿主及 Undo/Redo 通过，完整 stdio 当前 397 项尚未全跑。它在 R26–R28 [完整集成](c2-column-context-integration-gate-2026-10-02.md)的 395/395 终态及 17 项输入一致后才应用；前一批完整 Core C2、标准组合 C3、Lint 及三版本可见列表通过，不能算作 R29 再次全量验收。未打包或更新 Profile。

当前最新批次为 R23–R25 [字符串与局部证明缓存集成](c2-proof-cache-integration-gate-2026-10-02.md)：语义 558/558、完整 stdio 389/389（零跳过、1191.05 秒）、完整 Core C2、标准组合 C3、全仓 Lint 和当前测试输入的 PHP 7.2／8.1／8.5 可见列表／接受文本通过；1,000 轮连续编辑无过期补全、Hover 或 Definition，缓存损坏后重启恢复。16 项冻结输入与 C3 两项输入在终态后全部匹配；没有把下面历史 383 项或 R23 的 387 项数量当作本批次结果。现有支持范围保留，未打包或更新 Profile。

R21–R22 [完整阶段集成](c2-local-syntax-integration-gate-2026-10-02.md)已通过：stdio 383/383、零跳过，完整 C2、全仓 Lint 和 PHP 7.2／8.1／8.5 可见补全，终态冻结输入一致。随后才应用 R23 [赋值后字符串误判修复](c2-post-assignment-literal-types-2026-10-02.md)：相同源码全量语义 555/555、当前矩阵、八项定向 LSP 与定向宿主通过，十调用 100 轮 P95 79.67 ms；当前完整 387 项尚未再跑。没有打包或更新 Profile，真实 WSL 使用与 renderer 异常继续单列。以下保留历史批次记录，不能把当时待运行数量当作当前状态。

## 2026-10-01 源码收口状态

R19–R20 已通过[完整阶段集成](c2-value-expression-integration-gate-2026-10-01.md)：stdio 375/375、零跳过，完整 C2 与 Lint 通过，终态输入哈希一致。随后才应用 R21 [static 声明头修复](c2-static-scope-value-types-2026-10-01.md)，相同源码临时全量语义 554/554、当前分支矩阵、八项定向 LSP 及宿主通过；新的 379 项完整 stdio 未再跑，不能把前批 375 项记作 R21 再次全量通过。

最新追加 R20 [常量与常见值表达式](c2-expression-value-call-types-2026-10-01.md)：语义最终 553 项、十六项定向 LSP 和定向宿主通过，十调用 100 轮 P95 19.95 ms。R19–R20 当前完整 stdio 共 375 项尚未重新执行，前述阶段 367 项仍仅对应其冻结的 R17–R18 源码；下一批集中集成验证，不例行打包或升级 Profile。

阶段集成之后新增 R19 [按值调用数组实参](c2-array-value-call-types-2026-10-01.md)：语义 552 项、十二项定向 LSP 与定向 C2 宿主通过，十调用 100 轮 P95 22.74 ms；当前 371 项完整 stdio 尚未再跑。下面完整 367 项与完整 C2 结果属于 R17–R18，不能把它们算作 R19 修改后的全量复验。

最新批次为[方法调用增量集成](c2-method-integration-gate-2026-10-01.md)：R17–R18 的完整 Core C2 宿主、全仓 Lint 与完整 stdio 367/367 已通过；0 跳过、1179.11 s，跨进程缓存用例启用，八项输入哈希最终一致。独立签名审计脚本的随后增量另经定向 Lint。前一批[泛型增量集成](c2-generic-integration-gate-2026-10-01.md)359/359 和下文 357 项均属历史批次，最新终态以方法增量集成报告为准；这不是全部 language-server 测试文件或全仓包测试再次通过，也不替代真人验收。

最新集成证据：[当前源码完整回归](c2-current-source-integration-gate-2026-10-01.md)。完整 stdio 357 项、0 跳过，启用跨进程引用缓存；完整 C1/C2/C3 源码宿主、C1 可见列表和全仓 Lint 通过。R07–R13 的近期类型排序、传播和引用失效增量已进入该回归。可见等待中位 238 ms／最大 254 ms（与协议回归并行）；VS Code renderer 异常仍记录。后文保留历史计数和当时未执行项，当前全量 stdio 状态以此记录为准。没有打包、发布或更新 Profile，真实 WSL 使用仍单列。

下表说明当前源码增量，历史安装候选和发布记录仍保留各自当时的范围。人工验收按用户决定暂缓；源码工作继续。

| 范围 | 已有证据 | 尚未关闭 |
| --- | --- | --- |
| C1 输入与导航 | [首次引用命名空间重复解析修复](c1-import-scope-reference-cost-2026-10-01.md)：同一项目 1,071 个位置哈希一致，37 秒降至 7.1 秒；[范围传递](c1-namespace-range-transport-2026-10-01.md)避免主线程再次解析 | 首次候选扫描仍约 6–7 秒，交叉顺序结果有波动；本轮两条定向路径后转其它项；真实 WSL 可见等待单列 |
| C2 补全类型与编辑一致性 | [属性赋值排序](c2-property-expected-completion-2026-10-01.md)：语义 538 项、PHP 7.2／8.5 协议与隔离宿主 Undo/Redo；[连续编辑](c2-url-long-edit-memory-2026-10-01.md)：1,000 轮结果正确、P95 25 ms | 大型项目与真实长会话、可见列表；普通 RSS 增长及 GC 后堆测量分别保留，不作全局无泄漏结论 |
| C3 已支持重构 | [源码集成](c2-completion-integration-2026-10-01.md)包含 Safe Move 对只读内置声明的过滤，C3 源码宿主通过 | 新源码整体复验与真实编辑器操作继续单列，不扩大重构支持域 |
| C4 缓存与版本 | [缓存损坏恢复](c4-cache-entry-recovery-2026-10-01.md)：42 项索引与真实 stdio 五次重启；[phpstorm-stubs 覆盖](phpstorm-stubs-audit-gate-2026-10-01.md)重新复核 49 个目录 | 其它平台、真实 WSL Remote、全部 PHP 版本与候选安装验收 |

缓存修复前的完整 `stdio.test.ts` 协议回归为 346 项通过、1 项跳过，共 347 项。C1 可见补全宿主退出码 0；C3 明确恢复编辑器焦点并补充 Redo 后完整宿主退出码 0，见[对应回归记录](c3-import-race-focus-regression-2026-10-01.md)。跳过的跨进程引用缓存用例另行启用后发现配置输入证据丢失和方法预热后的重复扫描，两项已修复：[当前缓存验证](c4-reference-provider-input-evidence-2026-10-01.md)包含 Provider 宿主 10 项、32 次跨进程场景与 4 项标准入口 LSP 回归通过。本轮没有重新执行完整 stdio 或将进程测试记作真实 WSL 验收。固定语料的原 60 项及声明 D01–D30 保留，类型回归追加 R07 属性赋值和 R08 简写三元表达式。接下来按现有剩余范围推进，不新增默认扩展或无界功能。

当前 C2 新增[简写三元类型](c2-shorthand-ternary-values-2026-10-01.md)：语义 540 项、PHP 7.2／8.5 两项协议及隔离宿主通过，100 轮热补全 P95 11.96 ms；一般控制流和真实 WSL 显示仍单列。没有重新执行本轮全部 349 项 stdio。

## 当前决定

- **Pack 保持 10 项，暂不增删。** Core 与 Symfony 负责 PHP 和可证明的框架事实；TwigPlus、Red Hat YAML/XML、PHP Debug、PHP CS Fixer、EditorConfig、Apache Conf Snippets 和 PHP DocBlocker 各负责一项独立能力。测试默认走项目 PHPUnit/Pest CLI。旧 Recommended Pack 不再维护。外部成员升级须复核组合，Pack 的 `extensionPack` 无法锁定 Marketplace 版本。
- **使用同版本组合。** [0.4.12 发布版本](sophp-0412-release-gate-2026-09-27.md)的 Core、Symfony、Pack 三份 VSIX 已公开；标签构建及跨平台自动门禁通过。旧 0.4.9 私有候选仍是历史测试记录，不代表当前窗口已切到 0.4.12。项目 PHP、Composer、fixer、Xdebug 与测试命令需要在实际 Extension Host 环境中配置；真实 WSL Remote 操作链仍属 C4 验收。
- **Core 起点是普通 PHP 的 C1/C2 连续输入链。** 在独立 Composer 项目核对未打开 vendor 类、未保存声明的补全、定义、实现、引用、参数提示、Hover 和诊断，先复现首个用户可见错误或明显等待，再做定向修复。没有新的高影响 C1/C2 回归时，推进已支持 C3 操作的稳定性和 C4 候选验收。`createFile` 兜底 Redo 保留失败记录，只有新的可验证线索才重新调查。人工反馈随时并入，不阻塞独立源码工作。R4 的完整 PhpStorm 式体验目标不变。
- **日常增量不打包发布。** 源码改动用定向语义、LSP 和隔离宿主验证收口，不例行提交、推送或创建 PR。打包、更新 Profile 与发布按用户明确通知执行，不因阶段自动化通过而自动生成三份 VSIX。

发布后 C3 审计发现并修复了[Safe Move 在多个 namespace 或别名间误删导入](c3-safe-move-import-scope-2026-09-27.md)的风险。此项已进入 0.4.11，同次打包宿主和跨平台门禁均通过。

C1 普通表达式中[同前缀函数和常量的合并补全](c1-function-constant-overlap-completion-2026-09-27.md)也已从独立 Composer 项目的真实 LSP 失败用例推进到定向和独立 C1 源码宿主通过；完整组合与跨平台门禁已随 0.4.11 通过。

随后补上[顶层 `use function` / `use const` 导入补全](c1-function-constant-import-completion-2026-09-27.md)：未打开的 Composer `autoload.files` 函数与常量也能按需建议，独立 C1 源码宿主已核对实际结果；组合和跨平台门禁已随 0.4.11 执行并通过。

0.4.11 发布后的[分组函数与常量导入补全](c1-grouped-symbol-import-completion-2026-09-27.md)已覆盖同类与混合 `use`、逗号后当前成员、子命名空间以及已有闭合大括号的编辑范围，并抑制别名输入时的表达式建议。完整语义、独立 Composer 真实 LSP 和 C1 源码宿主通过；这一增量及[分组类导入子命名空间补全](c1-nested-class-group-import-completion-2026-09-27.md)已进入公开的 0.4.12。

0.4.12 发布后的[分组类导入子命名空间建议](c1-grouped-namespace-completion-2026-09-27.md)补齐 `{Ope}` → `{Operations\}` → 类名的连续输入链。独立 Composer 真实 LSP、逗号后成员编辑范围和 C1 源码宿主实际接受建议均通过；这是尚未打包的源码增量。

[分组函数与常量导入的实际接受建议](c1-grouped-symbol-import-acceptance-2026-09-27.md)也已在独立 C1 源码宿主验证：子命名空间建议保留大括号，并能继续补全组内函数。普通导入不改变编辑范围；此项仍为未打包的源码增量。

[分组符号导入的 C2 未保存声明反馈](c2-grouped-symbol-import-live-feedback-2026-09-27.md)已通过独立 stdio 与完整 C2 源码宿主：函数和常量改名后候选更新，关闭未保存声明后函数候选恢复磁盘事实。普通 C2 测试入口也改为隔离用户数据目录，避免继承设置影响结果。

最新 C1 增量：[类体 trait `use` 补全](c1-trait-use-completion-2026-09-27.md)已从可复现缺口修复到语义、按需 stdio、独立 C1 与 10 项 Pack 源码宿主通过。它已进入 0.4.9 私有候选；日常增量继续不重复打包。

[继承与实现语句的候选类型](c1-inheritance-kind-completion-2026-09-27.md)又修复了 `extends`/`implements` 混入错误声明种类的问题，完整语义与 10 项 Pack 的 VS Code C1 源码宿主通过；同属候选冻结后的源码增量。

[创建、类型检查与 Attribute 候选种类](c1-construction-kind-completion-2026-09-27.md)进一步筛选 `new`、`instanceof` 和 Attribute 的声明种类。随后 [Attribute 类身份筛选](c1-attribute-class-completion-2026-09-27.md) 在按需声明层保留类头标记，排除未标记的普通 class；解析器、语义和 10 项 Pack C1 源码宿主通过。目标位、重复使用与真实 Remote 仍待验收。

[未保存 Attribute 声明跨文件刷新](c2-unsaved-attribute-marker-completion-2026-09-27.md)补齐了 C2 的对应宿主证据：去掉、恢复 `#[Attribute]` 后，另一文件的候选会撤回、再出现；10 项 Pack C2 源码宿主通过。下一步仍按普通 PHP 连续编辑的错误结果与可见等待推进，优先修可复现的高频问题，再处理 C3 剩余安全编辑与 C4 安装验收。

[Attribute 目标位置补全](c1-attribute-target-completion-2026-09-27.md)又让已完成的 class、method 等 Attribute 位置按可证明的 `TARGET_*` 标志筛选，并覆盖未打开 Composer 类型与未保存声明切换；10 项 Pack C1/C2 源码宿主通过。动态标志、重复使用和构造参数适配仍待处理。

[同组第二个 Attribute 名称补全](c1-grouped-attribute-completion-2026-09-27.md)修复了 `#[First, Sec]` 原本没有候选的问题，继续使用类身份与目标标志筛选；语义正反例和 10 项 Pack C1 源码宿主已通过。

[Symfony 新建未保存路由文件的 Rename 链](symfony-unsaved-route-rename-2026-09-27.md)补上了静态 Provider 对新建 `config/routes.yaml` 快照的识别，并让独立 Symfony 扩展在磁盘始终不存在且缓冲区未变化时接受 Rename。Provider、真实 LSP 和客户端正反例通过；实际窗口的 F2/Undo 仍待组合宿主验收。

下表、证据和历史进展解释这些决定；以本节顺序为准。

本轮[普通 PHP C1/C2 基线复核与 PHPDoc 模板续行](c1-multiline-template-bound-completion-2026-09-27.md)已通过独立 Composer vendor 的六项查询和 C2 源码宿主，并修复多行模板约束的项目类补全。完整 Pack 源码宿主第二次运行通过，首次在原有数组形状补全处有一次尚未归因的失败；该 C1 波动继续记录，C3 最终创建 Redo 和 C4 安装门槛仍开放。新增源码已进入 0.4.8 候选。

[多异常 catch 类型补全](c1-multicatch-type-completion-2026-09-27.md)已从语义红灯修复到完整 Pack 源码宿主通过，覆盖跨命名空间异常类、自动导入和不重复候选；普通表达式与无效交叉符号不进入该上下文。它已进入 0.4.8 候选。

[新目录类型生成的最近父目录暂存移动](c3-type-generation-missing-directory-stage-2026-09-27.md)已在完整 Pack 源码宿主通过一次 Undo/Redo：即使系统临时目录和工作区同级移动失败，只要目标目录的现有父目录可用，仍能保持可重做的资源移动。所有移动都失败时最终创建兜底仍可创建文件，但该路径的 Redo 缺口继续开放。

## 先用这套组合开始开发

1. 从 [0.4.12 GitHub Release](https://github.com/sohophp/php-companion/releases/tag/v0.4.12)安装 SoPHP Core、SoPHP Symfony 和 Open Source Pack；也可从 Marketplace 的各自页面安装；同一 Release 的三份 VSIX 属于同批构建。Pack manifest 只固定扩展 ID，外部成员版本以实际安装结果为准。
2. 在 PHP 项目使用的 VS Code Extension Host 中确认只有 SoPHP 负责通用 PHP 语言能力，PHP CS Fixer 是唯一默认 PHP formatter，TwigPlus 负责 Twig，Red Hat 扩展分别负责 YAML/XML。`php.validate.executablePath`、PHP CS Fixer、Xdebug 和测试 CLI 指向同一个项目运行环境；Pack 不会安装这些项目工具。
3. 在独立 Composer 项目走一次输入、补全、跳转、PHPDoc、Symfony/Twig、格式化、调试和 PHPUnit/Pest CLI 的链路。任何一步缺失时记录候选摘要、扩展宿主位置、操作输入和结果。真实 WSL Remote 及长期使用仍是 C4 验收项，现有隔离 Linux 宿主结果不能替代它们。

这套 10 项组合可用于已列明的功能范围；测试视图和额外通用 PHP 语言服务器暂不自动安装。Open Source Pack 继续作为唯一维护的组合入口，不恢复 Recommended Pack。

## 固定组合

[Pack manifest](../../../packages/php-companion-extension-pack/package.json) 有 **10 个直接成员**。下表是 [0.4.9 冻结候选记录](open-source-pack-049-private-alpha-2026-09-27.md)中的外部成员版本，用于复现当时验证的组合；Core 与 Symfony 当前公开版本已更新为 0.4.12。`extensionPack` 本身只列扩展 ID，不能锁定 Marketplace 后续安装的版本。

| 成员 | 候选版本 | 唯一负责的能力 |
| --- | --- | --- |
| `sohophp.php-companion` | 0.4.12 | 通用 PHP 补全、类型、导航、诊断、Composer 索引和受限重构 |
| `sohophp.php-companion-symfony` | 0.4.12 | 可证明的 Symfony 服务、路由、事件和 Controller 上下文 |
| `sohophp.twig-plus` | 1.3.8 | Twig 语言服务与格式化 |
| `redhat.vscode-yaml` | 1.24.0 | YAML 编辑 |
| `redhat.vscode-xml` | 0.29.3 | XML 编辑 |
| `xdebug.php-debug` | 1.40.1 | Xdebug 调试入口 |
| `junstyle.php-cs-fixer` | 0.3.21 | PHP 默认格式化器 |
| `EditorConfig.EditorConfig` | 0.18.2 | 项目编辑约定 |
| `eiminsasete.apacheconf-snippets` | 1.4.0 | Apache 配置片段；语法扩展由其依赖安装 |
| `neilbrayfield.php-docblocker` | 2.7.0 | `/**` 注释生成和 PHPDoc 标签建议 |

SoPHP Core 消费 PHPDoc 类型，Symfony 补框架事实，TwigPlus 负责 Twig 通用功能。Pack 默认启用 SoPHP 语言服务、按需索引和 PHP CS Fixer 格式化器，并关闭 PHP 通用单词建议。JSON、HTML、CSS、JavaScript、TypeScript、Git 和终端先用 VS Code 内建能力。PHPUnit/Pest 默认使用项目 CLI；PHPStan 由项目自行选择。旧 Recommended Pack 不再维护。

**暂不进入默认包：**原版 `recca0120.vscode-phpunit` 3.9.40 在完整组合中发生过测试文件 Rename 后读取旧路径的异常；测试视图仅单独评估。[替代候选的隔离结果](open-source-pack-test-provider-candidates-2026-09-25.md)不能代替 Pest 和真实 Remote 验收。另一个通用 PHP Language Server 和 `symfony.language-tools` 会造成能力冲突，均不纳入受支持组合。

## 当前可使用范围

历史私有候选冻结于 [`f0ca6ddc`](open-source-pack-049-private-alpha-2026-09-27.md)：同批 Core、Symfony、Pack 三份 VSIX，八个外部成员版本和产物摘要已记录。隔离 Linux 的完整组合与 C3 打包宿主通过，WSL Alpha Profile 的安装文件与摘要也已核对。PHP 7.2–8.5 九个**目标设置**的 C1 宿主，以及 WSL2 自动化规模基准属于先前 0.4.7 候选的通过记录，尚未用 0.4.9 重跑。当前窗口还需 Reload Window；新进程的 Extension Host 归属、实际工具路径、人工编辑、其它平台和长会话仍待验收。

公开 [Marketplace Pack 页面](https://marketplace.visualstudio.com/items?itemName=sohophp.php-companion-open-source-pack)现提供 0.4.12；三份固定 VSIX 也可从[同一 GitHub Release](https://github.com/sohophp/php-companion/releases/tag/v0.4.12)获取。对已有 PHP 开发环境，先核对唯一通用 PHP 语言服务、唯一 PHP 默认 formatter、项目 PHP CLI 版本和 Remote 运行位置；不为每个 Core 小修复重打 VSIX。

## SoPHP Core 从哪里开始

| 顺序 | 要完成的操作链 | 通过条件 |
| --- | --- | --- |
| 1. C1 输入与跳转 | 在独立 Composer 项目复现 PHPDoc 类型跳转、普通类/成员补全与定义、未保存输入和跨文件导航缺口；先核对现有能力，再修最常见的实际错误 | 候选位置准确，说明文字和普通注释不误触发；未打开 vendor/项目类、别名和编辑后结果一致；完整 Pack 源码宿主通过 |
| 2. C2 同一份事实 | 对同一未保存声明连续检查补全、参数提示、Hover、Definition 和诊断，覆盖取消、关闭重开及 watcher 交错 | 不出现过期建议、错误诊断或相互矛盾的类型；记录用户可见等待与结果来源 |
| 3. C3 安全编辑 | 继续按实际使用频率验证 Import、Rename、Safe Move、Extract、Inline 和类型生成的预览、取消、应用结果、Undo/Redo | 每个支持场景可撤销且失败可解释；最终 `WorkspaceEdit.createFile` 兜底的 Redo 仍是明确未通过项，偶发 `Canceled` 根因未明 |
| 4. C4 交付组合 | 下个交付点一次性冻结三份 VSIX 和外部成员版本，在真实 WSL Remote Profile 检查 PHP→Symfony/Twig/YAML/XML→格式化→调试→CLI 测试 | 安装位置、唯一 Provider、工具路径及完整操作链通过；之后继续 Windows/macOS、PHP 版本矩阵和长会话 |

第一项的起手点已完成：[PHPDoc 类型跳转](c1-phpdoc-type-navigation-2026-09-27.md)在独立夹具复现了说明文字误跳，[跨行续写与未保存修改](c1-phpdoc-continued-type-navigation-2026-09-27.md)也已通过完整 Pack 源码宿主。[PHPDoc 引用及安全改名范围](c3-phpdoc-type-rename-safety-2026-09-27.md)随后修复了同名说明文字和数组形状键被误改的风险。PHPDoc 注释生成继续交给 DocBlocker。接下来优先处理可复现的 C1/C2 高频输入、反馈错误与等待；按用户可见影响调整顺序。

[C2 缓冲区关闭往返](c2-phpdoc-buffer-close-reference-2026-09-27.md)又确认默认 `onDemand` 下跨行 PHPDoc 的 References 与 Definition 跟随未保存内容，关闭后 References 恢复磁盘事实；单独运行时 `experimental` 模式的即时关闭查询尚无同样结论。继续检查更高频的普通 PHP 输入和跨能力反馈。

[完整语言服务器回归](c2-post-phpdoc-full-lsp-regression-2026-09-27.md)在最近 PHPDoc 解析改动后通过 21 个测试文件、383 项用例（1 项跳过），包括已有的普通 PHP 未保存成员与多能力反馈链。当前未复现新的普通 PHP 错误；下一项优先处理 C3 明确失败的文件创建 Redo 路径，或用户实际操作反馈中影响更大的 C1/C2 问题。

[关闭未保存文件后的即时引用](c2-phpdoc-close-index-modes-2026-09-27.md)已在源码中补上同项目关闭事件与后续语义查询的顺序约束，并让尚未完成全量索引的 `experimental`/`progressive` 模式按有界缓存恢复磁盘事实。独立 stdio 用例覆盖默认 `onDemand`、`experimental` 和 `progressive`，完整 stdio 回归 196 项通过、1 项跳过；该增量未进入 `248ee1f8` 冻结候选。Pack 默认仍使用 `onDemand`。

[PHPDoc 模板约束补全](c1-phpdoc-type-completion-2026-09-27.md)继续推进 C1：Core 识别 `@template T of ...`、`as ...` 和 PHPStan/Psalm 方言中的类型输入位置，隔离 Core 源码宿主验证建议与 Definition；DocBlocker 仍负责注释生成。此源码增量也未进入现有候选。

[已限定原生类型名补全](c1-qualified-native-type-completion-2026-09-27.md)进一步修复了 `new \Vendor\...`、导入的 namespace 别名、相对限定名、`extends` 和原生返回类型位置。独立语义测试及真实按需 stdio 请求验证了未打开的 PSR-4 类、准确 namespace 与不重复插入 import。它仍只是冻结后源码，尚未进入 `248ee1f8` 候选；下一个 C1 输入缺口继续按真实复现和用户可见影响选择。

R4 的目标仍是完整、稳定、接近 PhpStorm 的 PHP 开发体验。成熟扩展可以长期负责独立能力；只有同场景准确性、等待和回退的独立证据证明 SoPHP 更好时才切换所有者。人工反馈可随时纳入，不阻塞独立源码与自动化工作。

限定类型名的同一输入链还补上了下一段 namespace 建议，并阻止类型位置被同前缀的 PHP 函数补全抢占。独立 Composer PSR-4 stdio、完整语义包及语言服务器 stdio 回归已通过；隔离 VS Code 1.139.1 C1 源码宿主还实际接受了 namespace 建议并核对别名类补全。已安装 VSIX 与真实 WSL Remote 仍待下次候选验收。

绝对类型名的第一段也已补齐：`new \Dom` 可建议 Composer 的根 namespace。语义、定向真实 LSP 和隔离 C1 源码宿主已通过，结果仍属于冻结后源码。

[classmap 根 namespace 等待](c1-classmap-root-namespace-latency-2026-09-27.md)进一步显示，约 1 万 PHP 文件时同前缀重复请求原需 247 ms。复用有界的不完整搜索结果及已装载文件后，该脚本样本降到 4 ms；namespace 与类型候选并行查询又让首次请求从约 406 ms 降到 239 ms。真实 VS Code 与更大 classmap 项目仍须复核等待。

[Pack 清单复核与 Symfony `compact()` 函数身份](open-source-pack-audit-and-symfony-compact-2026-09-27.md)已核对当前 10 项 manifest、冻结 Profile 和 0.4.7 候选摘要，默认成员无需调整。随后修复了 Controller 导入同名 `compact()` 时向 Twig 发布虚假变量的问题；框架、Provider 与按需索引的 VS Code 源码宿主通过。该修复尚未进入 `248ee1f8` 安装候选。下一项先核对同命名空间跨文件 `compact()` 的实际解析与 Twig 上下文，再处理独立 Composer 项目的可见 C1/C2 错误；C3 创建文件 Redo 与 C4 Remote 验收门槛仍开放。

[跨文件 `compact()` 函数身份](symfony-cross-file-compact-context-2026-09-27.md)现覆盖已打开 PHP 文件与项目 Composer `autoload.files` 中的同命名空间声明，并处理未保存编辑、Undo、关闭及 watcher 导致的上下文刷新。默认按需索引的 VS Code 源码宿主与最终源码的定向真实 LSP 回归通过；完整 LSP 回归在最后一条 watcher 改动前通过，详细证据边界见报告。此增量未进入现有 0.4.7 VSIX；下一步回到普通 PHP 的 C1 候选可见性和 C2 同版本编辑反馈，同时继续保留 C3、C4 和 R4 验收门槛。

[新建未保存服务配置](symfony-unsaved-service-config-2026-09-27.md)补上了 Pack 的 Symfony 服务 Provider 对 `config/services.yaml` 的快照入口：PHP 服务引用的定义跳转现在可指向尚未落盘的声明；项目外符号链接仍被拒绝。定向 Provider 与真实 LSP stdio 已通过。关闭、磁盘 watcher、同版本重开及再次关闭的定义位置往返也已验证，并修复了查询早于服务图刷新的旧偏移问题。Pack 维持现有 10 项与唯一能力所有者，不因这次源码修复改变成员或重打 VSIX。下一步回到独立 Composer 项目的普通 PHP C1/C2 高频编辑反馈；C3 创建文件 Redo 和 C4 真实安装验收继续开放。

[Attribute 重复使用补全](c1-attribute-repeatability-completion-2026-09-27.md)继续补齐 Core 的 C1 输入体验：同一声明已使用且可证明不可重复的 Attribute 不再二次建议；允许重复或标志未知的类仍保留。语义包、隔离 Core 宿主与完整 10 项 Pack 源码 Profile 的 C1 操作链通过。下一步仍以独立 Composer 项目的 C1/C2 错误和等待为优先证据；这项源码增量尚未进入冻结候选，也不改变 Pack 成员。

[Attribute 构造参数输入](c1-attribute-constructor-arguments-2026-09-27.md)补上未闭合 `#[Config(na` 的命名参数建议与构造函数参数提示，并按需载入未打开的 Composer Attribute 类。语义、真实 LSP 和完整 Pack 源码宿主均通过；现有成员分工维持不变。下一步继续检查高频普通 PHP 编辑中的错误结果、旧结果和明显等待，然后处理 C3 的可复现阻断项。偶发的 VS Code `Canceled` 已有三次同配置完整 C3 复核未复现，仍需在下一次出现时记录命令与文档版本；最终 `createFile` 兜底 Redo 仍开放。

[catch 异常类型补全](c1-catch-type-completion-2026-09-27.md)收紧了 Core 的 C1 候选：已知普通类与接口不再混入 `catch`/多重 `catch`；层级不完整的候选仍保留。完整语义测试与 10 项 Pack 源码宿主通过。Pack 成员不变，源码尚未打包；后续继续按 C1/C2、C3、C4 的验收顺序推进。

[抽象类创建候选](c1-abstract-construction-completion-2026-09-27.md)修正 `new` 补全对抽象类的误推荐，并让未保存的修饰符变化更新候选。解析器、语义层和 10 项 Pack 源码宿主均通过。Pack 成员不变，源码仍待下一次候选冻结。

[构造函数可见性补全](c1-constructor-visibility-completion-2026-09-27.md)继续收紧 `new` 候选，并验证未打开项目类与未保存构造函数修饰符的候选往返；完整语义测试和 10 项 Pack 源码宿主通过。此项在 0.4.9 冻结之后，留待下一阶段统一打包。[最终创建兜底的分步编辑探针](c3-split-create-redo-probe-2026-09-27.md)仍未恢复一次 Redo，C3 该缺口保持开放。

[Attribute 参数的跨文件反馈](c2-attribute-constructor-buffer-feedback-2026-09-27.md)又以独立 Composer 项目确认 Completion 和 Signature Help 同步跟随未保存构造函数声明，关闭后立即恢复磁盘参数。此项进入 C2 回归，不改变 Pack 成员或候选冻结节奏。

# 默认模式的复制／粘贴导入：2026-10-04

## 修复范围

`copyTypeSymbols`、`planTypeImports`、`importCandidates`、`addImport` 和 `unresolvedTypeNames` 原先依赖全局 `ensureCompleteRoot`。公开默认 onDemand／progressive 不会因项目源码准备而设置全局完成标记，使复制类型元数据、粘贴时添加 use 和显式 Import 操作无法正常返回。

五个入口改为等待项目源码准备，并在请求内复用当前源码范围核对。类型候选仍通过既有 canonical 声明筛选、namespace／alias 冲突和插入范围校验；预算不足、取消、项目 epoch 变化或活动文档版本变化均拒绝结果。不会设置全局索引或框架 Provider 完成状态。

核对仍遍历 PHP 项目与 Composer 依赖，只有本次相关名称的新文件才加载语义事实；已有索引文件内容变化时仍刷新，已消失的关闭文件仍移除，防止旧声明存留。无关的新 vendor 文件不会因一次 Import 而解析函数体。Rename、参数修改和 Move 调用共享函数时不传名称过滤，继续取得全部当前源码事实。

## 验证

- 选定 **8 项真实 stdio 测试通过**，460 项未运行。包括三种模式的六项成功／预算不足矩阵及既有 PSR-4 综合操作、部分依赖回归。
- 成功矩阵核对复制别名 VendorReceipt 的 Acme\\Receipt 元数据、paste 上下文候选、别名 use 插入、普通 use 插入、未解析参数类型的发现。
- 在未保存目标文档中增加同名类，粘贴规划报告 alias 冲突；删除 vendor 类型文件且不发送 watcher 事件后，复制不再携带旧类型，粘贴规划拒绝。规划不改磁盘。
- 项目两份源码在 maxFiles=2 内，加入依赖后超预算；五个入口均不产生候选或编辑。
- 隔离 Linux VS Code 串行运行 onDemand 和 progressive，复用既有 `C3_IMPORT_RACE_ONLY`。普通 Import、显式粘贴导入和实际 Paste Provider 的定向入口可用；请求等待期间编辑文档后，旧的 Import／粘贴规划被撤回，Undo 恢复。该子集不是完整 C3 或全部接受文本／Redo 验收。
- 语言服务器构建、根 TypeScript noEmit、相关 ESLint 及 diff 空白检查通过。

复用命令：

```sh
pnpm --filter @php-companion/language-server build
pnpm --filter @php-companion/language-server exec vitest run test/stdio.test.ts -t 'resolves copied and pasted imports|renames a unique type and its matching|only the dependency index is partial'
node esbuild.mjs --production
PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_C3_IMPORT_RACE_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=onDemand node scripts/run-extension-test.mjs ./dist-test/runTest.js
# 第二次串行运行将 mode 改为 progressive。
```

日志：`/tmp/sophp-default-import-onDemand-20261004.log`、`/tmp/sophp-default-import-progressive-20261004.log`。

## 仍需核对

扫描不会把无关新文件全部解析，但仍有文件范围核对和磁盘读取成本，真实规模的复制／粘贴等待尚未测量，不能宣称满足热查询 P95 预算。首批未改变未解析名称识别的语义范围；构造表达式的后续修复及定向接受证明见下节。真实 WSL、Windows／Remote 交互及完整 Import 预览／Redo 仍不能由上述定向子集代替。

没有打包、更新用户 Profile、推送或发布。

## 后续：构造表达式发现与接受文本

`unresolvedTypeNames` 原先仅依据 PHPDoc／类型引用事实判断可导入位置，因此独立 `new Missing()` 没有进入自动导入发现。现在检查语法节点是否是 object_creation_expression 的直接名称，覆盖有括号、省略括号和 new 与名称间注释；字符串、普通函数、动态或匿名构造、完整限定名不会因为此扩展进入列表。已有静态类型引用发现继续保留。已有当前 namespace scope 的 use alias 也会过滤，防止将已经绑定的未知别名再次当作缺少导入。

新增语义用例同时覆盖上述正反例以及未保存文本更新。最终选定语义 3 项通过、493 项未运行；默认模式协议矩阵恢复为只有 `new Receipt()` 而无类型参数标注的输入，7 项协议通过、461 项未运行。依赖类型、alias 冲突、删除文件、超预算及既有 PSR-4 综合回归继续通过。

隔离 Linux VS Code 定向构造导入验收显式设置 fixture 模式。实际 Paste Provider 在构造表达式中返回正确 use；显式 resolvePastedImports 成功应用，保留构造名称和注释，单次 Undo 恢复原文、Redo 精确恢复编辑文本。onDemand 日志 `/tmp/sophp-constructor-import-onDemand-20261004.log`。progressive 首次运行在未等待 fixture 源码候选准备时未返回 Paste 建议，日志 `/tmp/sophp-constructor-import-progressive-20261004.log` 保留为失败证据；增加至多 15 秒的明确候选准备条件后，progressive 的实际 Provider、应用、单次 Undo/Redo 通过，日志 `/tmp/sophp-constructor-import-progressive-ready-20261004.log`。不能将此条件当作用户首次粘贴已经通过；首次失败的直接原因尚未证实，启动期粘贴结果继续核对。运行方式：

```sh
PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_C3_CONSTRUCTOR_IMPORT_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=onDemand node scripts/run-extension-test.mjs ./dist-test/runTest.js
# 第二次串行运行将 mode 改为 progressive。
```

语义和语言服务器构建、根 TypeScript noEmit、宿主编译、四份修改源码的 ESLint 及 diff 空白检查通过。本次证明是构造导入的定向接受流程；多符号／用户选择 alias 的 UI 接受以及真实项目等待仍需核对，不能称完整 Import 或 C3 验收。用户 Profile 未更新。

## 后续：多个粘贴类型的 alias 冲突

Core Paste Provider 原来仅接受一次 alias 选择：若第二个符号仍有冲突，就丢弃整组建议。改为逐个处理冲突，只有全部符号得到无冲突规划且原文仍有效才返回 Paste 编辑。用户取消后不返回部分规划；auto 模式不发起选择；同一符号再次冲突或未知符号冲突时拒绝，避免反复提示走不出来。

- 根 `paste-text` 单元 7 项通过，覆盖两个冲突依次选择、原始剪贴板元数据不被改写、第二次取消、auto 无选择、选择期间文档变化和重复冲突终止。
- 隔离 Linux VS Code 串行运行 onDemand／progressive，两种模式均退出 0。使用实际 Core Paste Provider、真实语言服务器与 VS Code WorkspaceEdit，向 clipboard DataTransfer 放入两份复制类型元数据。测试模式受控选择两个 alias，核对替换后的粘贴文本和两个 use；取消第二个 alias 不返回部分编辑。完整 Paste 编辑一次应用后，单次 Undo 恢复原文，Redo 精确恢复。
- 受控 alias 输入只在 ExtensionMode.Test 开启；上述证据没有真人输入框选择或真实剪贴板键盘操作，不能当作这些 UI 的验收。
- 宿主先等待 fixture 源码就绪，启动期首次粘贴仍开放；多名称歧义分支和编辑器回退 Paste Provider 不在本次修复范围。

复用命令：

```sh
pnpm exec vitest run test/unit/paste-text.test.ts
PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_C3_MULTI_ALIAS_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=onDemand node scripts/run-extension-test.mjs ./dist-test/runTest.js
```

双模式日志 `/tmp/sophp-multi-alias-onDemand-20261004.log`、`/tmp/sophp-multi-alias-progressive-20261004.log`。既有 onDemand Import／Paste 请求期间编辑与 Undo 子集也退出 0，日志 `/tmp/sophp-multi-alias-import-race-20261004.log`。根 TypeScript noEmit、production bundle、宿主编译、四份修改源码 ESLint 和 diff 空白检查通过。用户 Profile 未更新。

## 性能基线：预算尚未通过

新增可复用 `scripts/benchmark-paste-imports.mjs`。它创建独立临时 Composer 项目（项目噪声文件＋两个活动文档＋一个 vendor 类型），以真实 stdio 执行复制元数据、paste 候选和导入规划，分别报告首轮与稳定输入后的耗时。每个结果都核对正确类型／use，测量后删除 vendor 文件且不发送 watcher 事件，确认旧复制信息与规划撤回，并确认规划没有改写两个活动文件。结束时清理自建 fixture。

当前 onDemand 基线，单位 ms：

| PHP 文件数 | 稳定轮数 | Copy P95 | 候选 P95 | 规划 P95 | 三步总计 P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 103 | 5 | 59.60 | 56.53 | 56.05 | 164.02 |
| 1,003 | 10 | 420.50 | 442.64 | 430.64 | 1,270.53 |

1,003 文件的首轮三步约 2,664.72 ms，Copy 占 1,793.78 ms；首轮从 initialize 已返回、didOpen 已发送后开始，不包含扩展加载或编辑器弹窗时间。热源码扫描 P95 约 448.23 ms，说明这条路径随文件量增长已不能满足热查询 P95 ≤ 150 ms 预算。小样本 P95 使用 nearest-rank；这里不声称长期分布、真实 vendor 复杂度或真人等待。

对照实验仅将该扫描的 metadata inspector 改为普通异步 stat：1,003 文件下 Copy／候选／规划 P95 约 475.96／462.49／475.77 ms，三步总计约 1,350.11 ms，没有改善。实验已撤回，product source 保持原 metadata worker 路径并重新构建，不把性能下降方案留下。

数据：`/tmp/sophp-paste-import-baseline-100-20261004.json`、`/tmp/sophp-paste-import-baseline-1000-20261004.json`、`/tmp/sophp-paste-import-async-stat-1000-20261004.json`。

复用命令：

```sh
pnpm --filter @php-companion/language-server build
node scripts/benchmark-paste-imports.mjs 100 5 onDemand
node scripts/benchmark-paste-imports.mjs 1000 10 onDemand
# 也支持 progressive；本轮尚未测量该模式的性能。
```

下一步需要区分库存枚举、metadata／读取与语义回调耗时，再选择优化点。优化须保留依赖、新文件发现及预算检查。源码修改未获得性能证明，此性能项保持未完成；没有更新用户 Profile。

## Import 磁盘源码复用：有效改善，整体预算仍开放

CPU 采样中重复 open/read/fstat/close 占主要开销，源码回调占比较小。新增进程内弱引用缓存，仅在上次完整 Import 扫描的磁盘源码与当前语义源码一致时复用；每次仍枚举文件并检查 size、mtime、ctime，打开文档内容不同就重新读取。未保存内容不写入这份磁盘事实缓存。新文件、删除文件与所有索引预算仍检查；扫描不完整、取消或 epoch 变化不发布新缓存。普通 Rename、Move、参数修改的完整读取路径保持原实现。

真实 stdio 合成样本，单位 ms；每组 10 轮，nearest-rank P95：

| 模式 | PHP 文件数 | Copy P95 | 候选 P95 | 规划 P95 | 三步 P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| onDemand | 1,003 | 119.00 | 132.80 | 120.91 | 370.99 |
| onDemand | 2,503 | 201.56 | 202.01 | 191.30 | 574.74 |
| progressive | 1,003 | 918.22 | 139.48 | 166.66 | 1,100.38 |

onDemand 1,003 文件三步 P95 相比基线减少约 71%；2,503 文件仍超单次 150 ms。progressive 三步 P50 为 321.73 ms，但 Copy 存在尖峰；脚本从 initialize/didOpen 后开始，未等待全局后台准备完成，因此它记录启动后的连续请求，不保证后台已稳定。尚未定位尖峰原因，不据此声明稳定态或整体性能达标。首轮 Copy 仍约 1.78 秒／3.85 秒／1.71 秒；本改动主要减少重复磁盘读取，不关闭冷启动缺口。部分协议检查与测量同时运行，数据不是独占机器或五轮统计。所有测量确认无 watcher 删除撤回及规划未写文件。

验证：

- 初版复用代码的定向 Import／Rename／Move／预算协议 16 项通过。
- 扩充后的全组一次 15 通过、1 失败：experimental 在恢复 vendor 声明后返回空列表。随后仅复测三模式 Import 矩阵 6 项通过，包含同大小／保留 mtime 修改、无 watcher 新文件、暖缓存后文件数量／字节超限、未保存 vendor 关闭恢复及删除撤回。前次失败保留，原因未确认，不能把复测通过解释为竞态已消除。
- onDemand、progressive 隔离 VS Code 宿主串行通过实际 Import Provider 的并发编辑和 Undo 保护。没有替代真实 WSL UI 或启动首次粘贴验收。
- Language Server／扩展构建、根 typecheck、宿主编译、变更文件 ESLint、diff 检查通过。

数据：`/tmp/sophp-paste-import-stamp-1000-20261004.json`、`/tmp/sophp-paste-import-stamp-2500-20261004.json`、`/tmp/sophp-paste-import-stamp-progressive-1000-20261004.json`。失败及复测分别见 `/tmp/sophp-import-stamp-protocol-final-20261004.log`、`/tmp/sophp-import-stamp-protocol-imports-recheck-20261004.log`；双模式宿主见 `/tmp/sophp-import-stamp-host-{onDemand,progressive}-20261004.log`。

可选 CPU 采样：`SOPHP_IMPORT_CPU_PROFILE=/tmp/sophp-import-profile node scripts/benchmark-paste-imports.mjs 1000 5 onDemand`。采样有额外开销，不混入性能基线；脚本等待服务退出以确保采样文件刷新。本批不更新 Profile、打包、推送或发布。下一步核对后台准备与请求之间的失效交错及首次粘贴；大规模性能项保持未完成。

## 首次 Provider 与受控失效交错

新增 `PHP_COMPANION_TEST_C3_FIRST_IMPORT_ONLY=1` 宿主入口，不先调用候选请求、不循环等待源码准备，直接执行实际 Paste Provider。基于磁盘复用版本的两次串行独立运行：progressive 首次返回正确 use，等待 277 ms；onDemand 等待 870 ms。随后显式 resolvePastedImports、接受文本、单次 Undo/Redo 通过。日志 `/tmp/sophp-first-import-{progressive,onDemand}-20261004.log`。这只是各一次受控 fixture 测量，尚不证明长期、真实 WSL UI、系统 clipboard 或之前首次失败已消失；不能把耗时变化归因于尚未证明的具体竞态。

进一步新增仅 testMode 可用的扫描终点暂停。扫描已完成时写入依赖变化并发送 watcher，待第二个独立候选请求确认通知处理后释放原请求。原实现三模式成功用例均返回空 Copy，形成 `/tmp/sophp-import-epoch-red-20261004.log` 的 3 失败／3 预算拒绝通过证据。这确定了一种失效后直接放弃的路径，未确定它就是早先偶发失败的原因。

Import 扫描现在在 epoch 被另一变更取代时从最新状态重扫一次；新的缓存仍只在完整扫描后发布。最多两次扫描，第二次再失效即拒绝，取消和文档版本保护继续生效；不改 Rename／Move／参数操作的行为。扫描预算未放宽。增加 testMode Copy 返回阶段标记，使后续空结果能区分项目准备未完成、缺少复制符号、扫描拒绝与缺少唯一声明。

最终协议矩阵 6 项通过，462 项未运行，保留当前矩阵里的外部文件更新、新增、预算、关闭恢复和删除核验，并新增：一次受控失效后恢复正确 Copy；取消不触发重试；两次受控失效后拒绝旧类型且最多重试一次。日志 `/tmp/sophp-import-epoch-bounded-20261004.log`。中途一轮仍出现 experimental 恢复 vendor 声明空结果（5 通过／1 失败，`/tmp/sophp-import-epoch-green-20261004.log`），之后增加阶段证据的矩阵 6 项通过（`/tmp/sophp-copy-import-diagnostic-20261004.log`）；该偶发项根因仍未确认，不删除失败记录或放宽断言。

增加重扫后，progressive 隔离宿主的实际 Import Provider 并发编辑／Undo 拒绝保护通过，日志 `/tmp/sophp-import-epoch-host-progressive-20261004.log`。Language Server、扩展构建、根 typecheck、宿主编译、变更文件 ESLint、diff 检查通过。没有重复规模性能测量，不改变上一节整体预算仍开放的结论。

复用首次输入入口：

```sh
PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_C3_FIRST_IMPORT_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=progressive node scripts/run-extension-test.mjs ./dist-test/runTest.js
# 串行第二次改成 onDemand；保留既有 CONSTRUCTOR_IMPORT_ONLY 的明确准备验收。
```

本次源码与证据先留在当前分支，不单独打包、更新 Profile、推送或发布。后续在 C3 收口里程碑一起整理提交。

## 旧后台依赖快照覆盖：两个受控时机已修复

本轮先复测带阶段标记的矩阵，6 项通过，没有把未复现解释为解决。随后加入仅 testMode 可用的后台依赖源码暂停：后台已读到旧 `Removed`，前台从无 watcher 的新磁盘源码核验 `Receipt`，再让后台旧快照完成。第一版受控用例在 Import 扫描结束处暂停，返回空列表并记录 `copyImportMissingDeclaration`，失败日志 `/tmp/sophp-import-background-red-20261004.log`。这证明后台旧快照确实可以覆盖前台刚核验的语义事实。

先为 Import 记录本次检查到的语义源码，在完成扫描后逐项核对；源码被后台替换时仍只允许重核验一次。该版本 7 项定向协议通过，但扩大回归仍捕获 progressive 恢复声明返回空结果（16 通过／1 失败，`/tmp/sophp-import-background-regression-20261004.log`）。阶段证据无重试标记，说明仅在扫描末尾检查仍不足。

第二个受控时机暂停在扫描返回后、Copy 读取候选前；同样让旧后台快照完成，再恢复 Copy，仍返回空列表。失败日志 `/tmp/sophp-import-snapshot-gap-red-20261004.log`。现在将五个 Import 入口的语义结果读取放入源码核验完成的同步回调：复制信息、候选、直接导入插入点、粘贴规划和未解析名称都在已核验事实仍有效时取得，返回途中不再重读可能被覆盖的语义数据。文档版本保护、取消、扫描预算与单次重扫上限保留，普通 Rename／Move／参数扫描不改变。

最终 `/tmp/sophp-import-snapshot-regression-final-20261004.log` 的 18 项定向协议通过、452 项未运行。包含两个覆盖时机、三模式 Import／预算矩阵、一次失效恢复、二次失效终止、取消不重试、无 watcher 外部变更／新增／删除、未保存关闭恢复及既有 Rename／Move 当前覆盖保护。

最新 progressive 不等待候选的首次实际 Provider、resolvePastedImports、接受文本与一次 Undo/Redo 通过，首次 Provider 391 ms，日志 `/tmp/sophp-first-import-snapshot-progressive-20261004.log`。Language Server／扩展构建、根 typecheck、变更文件 ESLint、diff 检查通过。两条受控失败路径已关闭；不能断言此前所有偶发空结果都来自这两个时机，长期使用、真实 WSL UI 与大规模预算仍开放。

最终源码另测 onDemand 1,003 文件／10 轮，Copy／候选／规划 P95 为 133.83／147.60／133.98 ms，三步 374.21 ms，首轮 Copy 1,745.51 ms。数据 `/tmp/sophp-import-snapshot-perf-final-20261004.json`；删除撤回及未写文件核验通过。与先前测量有波动，此单组不证明长期分布或整体预算达标，2,503 文件及 progressive 的既有缺口不关闭。

源码和证据继续留在同一分支，待 C3 收口一并提交；没有更新 Profile、打包、推送或发布。下一步推进生成／提取等独立 C3 入口，只有新可复现证据才继续追查 Import 偶发问题。

## 等长写入的 metadata 碰撞：已定位并补充内容核验

再次组合 Import 与成员生成回归时复现 progressive 的恢复空结果（12 通过／1 失败，`/tmp/sophp-import-evidence-combined.log`）；单独 6 项矩阵此前通过（`/tmp/sophp-import-evidence-run1.log`），保留两份证据。新增仅 testMode 可读的 Copy 失败证据，记录使用中的符号、声明、相关缓存源码和 stamp。

失败时 Copy 的符号仍正确为 Acme\Receipt，声明列表为空，语义与磁盘缓存源码仍是 `class Removed`。已恢复的 Receipt 文件 size=38、mtimeMs=1700000000000、ctimeMs=1791061993239.0215，与缓存 Removed 的三个 metadata 值完全相同。恢复写入和 utimes 均已 await。由此定位到相同 metadata 的内容变更误命中；本次失败无需后台快照覆盖就会发生。不能继续以 size／mtime／ctime 相等证明内容相等。

现有 SourceStat Worker 现在可携带预期 SHA-256，在单文件预算内读取实际 bytes 并核对。Import 与成员生成的磁盘源码复用要求 metadata 和内容哈希同时匹配；新／变化／未保存源码沿原完整读取和语义更新，普通 Rename／Move／参数扫描保持完整读取。文件预算、总字节预算、取消和一次重扫限制不变。Worker 缺失或读取失败不复用，文件超单项预算不做哈希。没有增加用户设置。

`/tmp/sophp-import-hash-protocol.log` 15 项通过：6 项三模式 Import／预算矩阵、6 项默认生成／预算矩阵、既有复杂生成及两个 Worker 测试。包括无 watcher 的等长修改／恢复、删除／新增、未保存关闭恢复、取消与两次失效上限。Worker 定向验证实际 bytes 不同必不匹配、恢复后匹配、单文件超预算及缺失拒绝。

内容核验增加读取成本。隔离于上述测试之后的 onDemand 1,003 文件／10 轮（`/tmp/sophp-import-hash-perf-isolated-1000.json`）：Copy／候选／规划 P95 170.02／178.97／170.81 ms，三步 487.81 ms，冷 Copy 1,836.88 ms；删除撤回及未写源文件通过。此前 133.83／147.60／133.98 ms 是仅 metadata 复用的旧版本数据，不能继续用作当前版本性能结论。另有与协议并发测量的数据仅用于诊断，不作为隔离性能结果。当前 1k 单组已高于 150 ms，规模性能与峰值内存仍开放；不为等待预算恢复不可靠的 metadata 复用。

既有两个旧后台快照交错回归另行通过（`/tmp/sophp-import-hash-background.log`），没有因内容核验移除同步结果捕获或单次重扫保护。当前 progressive 不等待候选的实际首次 Paste Provider、resolve／应用及一次 Undo/Redo 通过，首次 Provider 288 ms（`/tmp/sophp-import-hash-first-progressive.log`）；是小 fixture 的一次 UI 操作测量，不替代 1k 热查询分布。Language Server／扩展构建、根 typecheck、相关源码与测试 ESLint、diff 检查通过。

源码仍在同一分支，尚未更新用户 Profile。下一步核对 Worker 启动与扫描等待的具体开销，保留实际内容核验，再推进 C3 其它未关闭操作；不因本组回归通过就宣称所有 Import 或整个 C3 已完成。

## Worker 启动复用（保留内容核验）

单文件 10 次测量：每次新 Worker 首次检查 60.46–80.86 ms，同一 Worker 后续检查 0.35–0.71 ms（`/tmp/sophp-worker-startup-baseline.json`）。因此本次先处理线程启动开销，不减少待核验源码。

在同一语言服务器内按 Worker 脚本路径复用线程，批次 ID 全局唯一，每个扫描仍持有独立 SharedArrayBuffer 取消标记、等待列表和监听器。关闭扫描只取消自身；最后一个扫描释放后保留 30 秒空闲复用窗口，随后终止；语言服务器 shutdown 显式释放。活跃扫描保持 Worker 引用，空闲 Worker 与定时器 unref，不依赖语言服务器 stdin 维持未完成请求；最初独立微测发现 warm Worker 无其它 handle 时过早退出，修正活跃引用后 10 次均完成（`/tmp/sophp-worker-startup-reuse-final.json`）：首次 75.31 ms，随后跨扫描 0.27–0.62 ms。

隔离性能测量均在协议／类型／lint 等重任务之前串行运行，每组 10 轮：

| 模式／文件数 | 热 Copy P95 | 热候选 P95 | 热规划 P95 | 三步 P95 | 冷 Copy |
| --- | ---: | ---: | ---: | ---: | ---: |
| onDemand／1,003 | 83.67 ms | 69.21 ms | 71.71 ms | 212.30 ms | 1,785.50 ms |
| onDemand／2,503 | 158.98 ms | 155.19 ms | 155.63 ms | 451.53 ms | 4,187.09 ms |
| progressive／1,003 | 73.14 ms | 67.88 ms | 59.76 ms | 187.24 ms | 1,823.62 ms |

数据 `/tmp/sophp-worker-reuse-perf-onDemand-1000.json`、`/tmp/sophp-worker-reuse-perf-onDemand-2500.json`、`/tmp/sophp-worker-reuse-perf-progressive-1000.json`；每组删除撤回及未写文件核验通过。1k 两默认模式本组均低于 150 ms，2.5k 仍超预算。只有本机三组，不是五轮验收、10k／50k、真实可见等待或峰值内存证明；不放宽预算。

当前定向组合 `/tmp/sophp-worker-reuse-regression.log`：25 项通过（4 个 Worker 生命周期／内容核验，6 个 Import／预算，2 个后台交错，6 个参数修改／预算，6 个成员生成／预算，1 个复杂成员生成）；References 编辑后取消另行 1 项通过（`/tmp/sophp-worker-reuse-reference-cancel.log`）。Worker 生命周期含已 dispatch 的两个扫描独立取消、释放后再次复用、终止后新建恢复及模拟 30 秒空闲终止；不把计时器模拟当作长期会话测试。

最新 progressive 隔离宿主的四类生成仍通过真实预览／取消／应用、磁盘和未保存依赖变化拒绝、一次 Undo/Redo（`/tmp/sophp-worker-reuse-generation-host.log`）。源码／扩展构建、根 typecheck、变更文件 ESLint 与 diff 检查通过。没有打包、更新用户 Profile、推送或发布，C3 和跨规模性能门槛保持未完成。


## 扫描窗口调整（源码检查点之后）

前述 Import／生成／预览保护已随 `88ebffb` 本地提交，完整门槛的 810 通过／2 性能失败／1 条件跳过见[生成报告](default-indexing-generation-2026-10-04.md#c3-源码阶段检查点)。本增量只把共同受检扫描的并发窗口从 32 调到索引器已支持、且与 Worker 批大小一致的 128；逐文件内容哈希、读取／文件数／总字节预算、顺序语义回调、取消和单次重新核验保持原约束。没有并入临时路径缓存方案。

调整前在临时副本中比较了路径缓存、路径缓存＋128 窗口及仅 128 窗口；收益主要来自窗口。实验期间全量回归仍运行，`/tmp/sophp-c3-{path,window-only}*-experiment-perf.json` 只用于选择方案，不作为验收数字；副本已清理。

源码调整并构建后，四组标准 benchmark 串行执行，各 10 次热查询，仍验证无 watcher 删除及规划不写文件。下面每格为该组 P95，单位 ms：

| 默认模式／总文件 | Copy | 候选 | Plan | 三步合计 | 首次 Copy |
| --- | ---: | ---: | ---: | ---: | ---: |
| onDemand／1,003 | 57.55 | 46.36 | 47.13 | 137.90 | 1724.85 |
| onDemand／2,503 | 108.53 | 110.26 | 107.26 | 311.32 | 4265.45 |
| progressive／1,003 | 64.51 | 48.33 | 45.50 | 147.44 | 1842.80 |
| progressive／2,503 | 102.32 | 165.25 | 2062.72 | 2314.87 | 3732.13 |

日志 `/tmp/sophp-c3-scan-window-perf-{onDemand,progressive}-{1000,2500}.{json,log}`。onDemand 2,503 文件从此前约 155–159 ms 降到约 107–110 ms，但 progressive 2,503 文件仍有 165 ms 候选及约 2 秒 Plan 尖峰；其受检扫描计时最大约 896 ms，尖峰不能仅用扫描窗口解释。整体 150 ms 门槛未通过，不靠重复运行抹掉这组失败；下一步定位请求前后等待与后台任务交错。单组 10 样本也不能替代五轮、10k／50k、峰值内存及实际弹窗等待验收。冷启动没有明显改善。

36 项定向协议／Worker 回归通过，444 项未运行，83.97 秒：三模式 Import 成功／预算／失效、生成及 PHP 版本撤回、参数修改、Rename／Safe Move 的当前源码覆盖与预算拒绝、后台 Import 快照覆盖、Worker 取消／复用／空闲释放。日志 `/tmp/sophp-c3-scan-window-regression.log`。Language Server／扩展构建、修改源文件 ESLint 通过。

progressive 隔离宿主的首次实际构造表达式 Paste Provider、resolve／应用及一次 Undo/Redo 通过，Provider 等待 544 ms；日志 `/tmp/sophp-c3-scan-window-first-import-host.log`，退出 0。小 fixture 的单次首次等待不是 2,503 文件热查询验收，也不是用户 WSL 使用验证。本增量暂留同一分支，待下一次必要里程碑一起整理提交；没有打包、推送、更新 Profile 或发布。


## progressive Import 再次准备尖峰

扩充既有 benchmark，保留原有汇总并增加逐请求时间、单调时钟、热样本／扫描样本和最多 256 条后台消息；可与既有 `SOPHP_IMPORT_CPU_PROFILE` 对齐，没有新增用户设置。独立 2,503 文件 profile 再次复现 Plan 约 2.30 秒：后台在约 8,705 ms 记录 `index:2 start reason=progressive-source-change`，Plan 在约 8,875 ms 发出，项目来源到约 11,063 ms 才再次 ready。日志及各 Worker profile 位于 `/tmp/sophp-progressive-import-profile{.json,.log,/}`。首次选中类型扫描读入 vendor 声明后，候选失效会撤回整项目来源准备，触发两秒 debounce；后续请求在重新准备期间等待，并不是同一次 Import 磁盘扫描突然需要两秒。

受控协议先复现无磁盘变化仍启动第二次索引（`/tmp/sophp-progressive-import-prepared-red.log`）。修补仅在完整扫描、未取消、来源／epoch 未被覆盖，以及既有 project source ready 仍成立时，复用已核验项目来源；项目 URI 集合同步当前覆盖，候选 epoch 及 container facts 仍失效，所有变化文件的旧 light 摘要移除，不只移除最后一个。无关新 vendor 源码仍按既有选择规则处理；尚未加载的无关**项目**文件不提供完整项目证明，继续撤回 ready 并触发原准备。扫描超预算、失效或取消不获得这条复用路径，没有延后到空闲时才保障来源完整性。

首次修补的边界回归还抓到未知项目文件没有造成实际语义更新时未触发失效，等待重扫超时；日志 `/tmp/sophp-progressive-import-prepared-green.log` 保留。增加未覆盖来源的显式失效后，单项回归通过（`/tmp/sophp-progressive-import-prepared-green-final.log`）：vendor 发现后没有重复整项目准备；两个项目消费者同时改变后引用都更新，删除消费者及 vendor 声明变化即时反映；新无关项目文件仍重新准备并进入 workspace symbol。不是只断言索引次数的实现镜像测试。

最新完整组合选中 37 项通过、444 项未运行，93.10 秒；包括前节 36 项及上述新回归，日志 `/tmp/sophp-progressive-import-prepared-regression.log`。Language Server／扩展构建、根 TypeScript、修改的 server／stdio／benchmark ESLint 与 diff 检查通过。隔离 progressive 首次实际构造表达式 Paste Provider、resolve／应用和一次 Undo/Redo 退出 0，Provider 等待 496 ms（`/tmp/sophp-progressive-import-prepared-first-host.log`）；不等同真实 WSL 或大项目可见等待。

修补后标准 benchmark 串行单组各 10 热样本，2,503 文件最新 P95，单位 ms：

| 默认模式 | Copy | 候选 | Plan | 三步合计 | 首次 Copy |
| --- | ---: | ---: | ---: | ---: | ---: |
| onDemand | 105.59 | 118.31 | 113.15 | 318.88 | 3723.51 |
| progressive | 115.53 | 117.26 | 110.65 | 322.95 | 3733.05 |

日志 `/tmp/sophp-progressive-import-prepared-perf{-onDemand-2500,-2500}.{json,log}`；两组都验证无 watcher 删除、规划不写文件，progressive 的热查询时间窗只有 `index:1`，没有再次整项目准备。上一节约 2 秒失败继续保留。此两组单次查询在 150 ms 内，但仍不关闭整体性能验收：五轮、10k／50k、峰值内存、后台外部 Provider 组合及真人等待继续开放；完整套件中两条魔术方法的组合负载性能失败也没有改记为通过。源码留在原分支，未打包、更新 Profile、推送或发布。

## 2,503 文件五轮热查询验收

在上述源码上串行运行两默认模式，每种模式五个独立进程／临时 Composer 项目，每轮每类查询 100 次热采样；首次请求单独计时。命令为 `node scripts/benchmark-paste-imports.mjs 2500 100 onDemand` 或 `progressive`。保留全部十轮，没有择优删除或因超预算而重跑。总计 3,000 次热请求，协议／结果断言失败 0；取消未在本轮测量。

下表为每轮 P95（ms），各单轮均满足 150 ms 预算：

| 模式 | 轮次 | Copy | 候选 | Plan | 首次 Copy |
| --- | ---: | ---: | ---: | ---: | ---: |
| onDemand | 1 | 111.20 | 118.61 | 117.46 | 4183.13 |
| onDemand | 2 | 111.62 | 111.75 | 109.60 | 3889.90 |
| onDemand | 3 | 102.03 | 103.55 | 107.19 | 3725.44 |
| onDemand | 4 | 109.12 | 109.96 | 109.16 | 3800.55 |
| onDemand | 5 | 105.82 | 105.74 | 105.51 | 3913.79 |
| progressive | 1 | 110.11 | 111.23 | 112.87 | 3663.28 |
| progressive | 2 | 114.32 | 113.82 | 117.96 | 3876.76 |
| progressive | 3 | 116.91 | 111.27 | 114.14 | 3752.92 |
| progressive | 4 | 110.45 | 110.68 | 113.71 | 3784.39 |
| progressive | 5 | 115.96 | 116.16 | 115.01 | 3752.14 |

每种模式每类查询合并 500 个热样本；P95 按排序后 `ceil(n × 0.95)` 位置计算，不取单轮 P95 的平均值：

| 模式 | 查询 | P50 | P95 | 最大值 |
| --- | --- | ---: | ---: | ---: |
| onDemand | Copy | 93.95 | 110.13 | 122.99 |
| onDemand | 候选 | 93.96 | 111.06 | 130.10 |
| onDemand | Plan | 94.47 | 111.13 | 135.76 |
| progressive | Copy | 98.54 | 113.46 | 137.61 |
| progressive | 候选 | 98.60 | 113.22 | 133.98 |
| progressive | Plan | 97.71 | 115.01 | 143.27 |

三步串行合计 P95 分别为 322.91／334.88 ms；它是工作流等待数据，不将三个请求相加后的数值套用单次查询 150 ms 门槛。十轮均验证无 watcher 删除后的撤回和规划不写文件；后台消息各仅出现 `index:1`，未重现重复准备。首次 Copy 约 3.66–4.18 秒，冷启动仍需单独改进。

可复核的逐轮热样本、冷／热统计、源码哈希、Node／平台和后台消息保存在[五轮原始数据](default-indexing-imports-2503-five-runs-2026-10-04.json)。完整请求 trace／stderr 留于 `/tmp/sophp-import-qualification-2500/`。本轮只关闭本机 2,503 文件两默认模式的 Import 热查询子门槛；10k／50k、峰值 RSS、取消／长期会话、外部 Provider 组合及真人 WSL 可见等待仍开放，完整套件的两条魔术方法组合负载失败保留。没有打包或更新用户 Profile。

扫描窗口、prepared source 复用和公共预览运行程序设置保护合并为同一源码里程碑，提交标题 `fix(refactor): reuse verified project preparation and bind PHP runtime settings`。上述“尚未提交”记录描述各增量完成时的状态，以本里程碑为后续源码基线；C3 整体仍未完成，用户已安装的旧 Profile 未包含此批修改。

## 首次扫描复用已加载源码

本地里程碑为 `4248e37`。后续冷启动 profile（`/tmp/sophp-import-cold-profile{.json,.log,/}`）显示首次 Copy 约 4.12 秒，其中项目准备约 3.14 秒，随后 Import 受检扫描约 1.02 秒；已有项目文本在首次受检扫描没有此前 Import 缓存时仍被再次读入。profile 带额外开销，仅作定位，不与无 profile 数字直接计算优化比例。

当前源码把已加载文本作为**待验证候选**，请求 Worker 比对实际磁盘字节的 SHA-256；只有哈希匹配、扫描元数据符合、当前语义文本和打开缓冲区仍一致，且需要实现时实现已加载，才跳过重复读取并进入原有受检缓存。未知文件、哈希不匹配、未保存缓冲区与磁盘不同、实现未加载仍走原读取路径；文件数／单文件／总字节预算、取消、来源失效后单次重新核验不放宽。候选仅保留本次扫描期间，不另建持久缓存。

新增两模式首次复制回归先通过真实 Rename 准备建立已加载项目，再同尺寸修改闭合声明并恢复 mtime、不发送 watcher，同时使打开文档的磁盘副本与未保存缓冲区不同：首次复制不接受已删除声明，恢复声明后复制成功，缓冲区优先且规划不修改磁盘。初版测试用 workspace symbol 建立前置状态，但 onDemand 不会因此启动完整索引，超时日志 `/tmp/sophp-import-first-loaded-regression.log` 保留；改为实际 Rename 准备，没有放宽断言。最终 Import 组合 11 通过／468 未运行（35.59 秒），成员生成＋Worker 组合另 10 通过／473 未运行（20.61 秒）；日志 `/tmp/sophp-import-first-loaded-{regression-final,generation-worker}.log`。源码／扩展构建、修改文件 ESLint、diff 检查通过。

两默认模式隔离 VS Code 宿主的实际首次构造表达式 Paste Provider、resolve／应用和一次 Undo/Redo 均通过，等待分别为 onDemand 636 ms／progressive 410 ms；日志 `/tmp/sophp-import-first-loaded-host-{onDemand,progressive}.log`，退出 0。这是小 fixture 单次操作数据，不证明真实 WSL 或大项目 UI 延迟。

随后以相同 2,503 文件确定性 fixture 串行运行两模式各五个冷进程；每个进程仅带五次热控制查询（命令 `node scripts/benchmark-paste-imports.mjs 2500 5 MODE`），不将这 25 个热样本当作新的 100 样本热门槛。十轮均验证删除撤回与规划不写文件，失败 0，没有重复准备。首次 Copy 与首次受检扫描统计单位 ms：

| 模式 | 五轮首次 Copy | 中位数 | 前次五轮中位数 | 首次扫描中位数 |
| --- | --- | ---: | ---: | ---: |
| onDemand | 3292.62／3270.90／3153.23／3196.29／3270.13 | 3270.13 | 3889.90 | 259.09 |
| progressive | 3042.32／3079.76／3027.75／3075.87／3219.87 | 3075.87 | 3752.92 | 246.99 |

中位数分别减少约 15.9%／18.0%，仍需约 3 秒，项目准备仍占主要等待。前次和本次均串行、无 CPU profile；它是本机前后测量，不宣称跨平台同等收益。逐轮原始数据、源码哈希及五个热控制样本已追加到[原始数据](default-indexing-imports-2503-five-runs-2026-10-04.json)的 `coldSourceReuseFollowup`，没有覆盖 `4248e37` 前批热门槛证据。完整 trace／stderr 在 `/tmp/sophp-import-first-loaded-cold-2500/`；取消／内存未在这轮冷测量中采样。此增量暂留同一分支，不打包、提交、推送或更新 Profile；跨规模及真实使用门槛继续开放。

## 项目准备读取与首次请求交错

按首次 Copy 的单调时钟窗口拆分前述 CPU profile，主线程文件打开／读取／fstat／关闭累计约 1.1 秒，准备过程的 `memoryUsage` 约 266 ms，解析 Worker 有较多空闲等待。本增量选择文件读取路径，未修改内存阈值或内存检查频率。

现有 SourceStat Worker 增加可选的预算内 UTF-8 源码返回；读取后按实际字节长度核对单文件预算，过大的文件不提供文本，读取失败使扫描不完整。创建 Worker 失败的原 async fallback 同样返回预算内文本。索引器的既有大库存 inspector 可携带当前文本，顺序准备／语义回调消费同一次读取快照；项目准备沿用原 32／128 窗口，取消、文件数／总字节、缓存写入格式和解析路径不扩大。小于 1,000 路径时沿用原读取方式。已供应当前文本时，即使 `verifyCachedSourceHash` 未启用，也比较实际文本哈希，不凭碰撞元数据恢复旧 payload。新测试覆盖读取／下一次修改、UTF-8／空文件／过大文件／删除、元数据全部碰撞及显式哈希选项开／关两种缓存恢复。

新增 `PHP_COMPANION_TEST_C3_PROJECT_NOISE` 仅为隔离 first-import 宿主 fixture 添加有界 PHP 文件，没有产品设置。1,000 文件首次 progressive 宿主曾返回空 Provider（`/tmp/sophp-index-worker-source-host-progressive-1000.log`）；带失败诊断的一轮又返回成功（`...-1000-diag.log`），原失败保持为间歇证据。继续以测试暂停点在项目首个语义回调前创建闭合类型并发送 watcher；等待来源 epoch 实际改变后释放，稳定复现 progressive 首次候选为空，onDemand 同场景通过：`/tmp/sophp-first-import-watch-red.log`。

修补共同准备入口：只有等待期间来源 epoch 确实改变且未取消，才在原准备结束后重新准备一次；不循环重复未知失败或预算失败。测试状态的 epoch 及新暂停点仅在 testMode 返回／启用。epoch 入口修补后的协议＋Worker 组合 20 项通过、466 未运行，49.61 秒（`/tmp/sophp-index-worker-source-regression-final.log`），包含受控 watcher 交错、两个默认模式首次复制、原 Import／预算／旧快照、1,000 文件并发准备与取消及 Worker 生命周期。随后补齐当前文本缓存保护，最终索引包全量 45 项通过（`/tmp/sophp-index-worker-source-final-index-tests.log`）。源码／扩展 bundle、宿主编译、根 TypeScript、修改文件 ESLint 与 diff 检查通过。

最终 bundle 的隔离宿主均加入 1,000 个 PHP 文件后才激活，两个模式实际首次 Paste Provider、resolve／应用和一次 Undo/Redo 通过，等待 onDemand 1468 ms／progressive 1528 ms；日志 `/tmp/sophp-index-worker-source-cache-guard-host-{onDemand,progressive}.log`，退出 0。首次失败与两种模式的受控回归保留；这组通过不宣称所有首次交错或真实 WSL 已验收。

缓存文本保护补齐前的十轮冷测保留于 `/tmp/sophp-index-worker-source-cold-2500/`，作为中间诊断。最终源码再串行执行两模式各五个冷进程，每轮五个热控制样本；所有十轮的删除撤回／不写文件断言通过，失败 0。单位 ms：

| 模式 | 五轮首次 Copy | 中位数 | 前批中位数 | 最小／最大 |
| --- | --- | ---: | ---: | --- |
| onDemand | 2062.04／1928.33／2004.94／1934.35／1973.90 | 1973.90 | 3270.13 | 1928.33／2062.04 |
| progressive | 1984.61／2310.84／2333.33／1967.63／2184.48 | 2184.48 | 3075.87 | 1967.63／2333.33 |

相对前批减少约 39.6%／29.0%；相对最初五轮 3889.90／3752.92 ms 减少约 49.3%／41.8%。仍是本机独立、短源码 Composer fixture 的冷请求等待，首次请求约 2 秒，不能写成真实业务项目同等收益或完整冷索引门槛。最终逐轮样本、实际源码哈希、背景消息追加到[原始数据](default-indexing-imports-2503-five-runs-2026-10-04.json)的 `projectSourceReadFollowup`；trace／stderr 在 `/tmp/sophp-index-worker-source-final-cold-2500/`。每模式每类 25 个热控制样本低于 150 ms，但不替代当前源码的完整热测；峰值内存、新规模、长期会话、跨平台、外部 Provider 和真人使用继续开放，完整套件两条魔术方法组合负载失败保留。

首次扫描复用、项目准备读取、当前文本缓存保护和首次准备的 epoch 交错修补合并为一次必要源码里程碑，提交标题 `fix(index): reuse verified source reads and retry superseded preparation`。前节未提交状态由本里程碑更新；不打包、推送、发布或更新用户 Profile，goal 继续运行。

后续[小项目读取路径与核心热查询／峰值内存](default-indexing-core-memory-2026-10-04.md)已移除显式 inspector 的 1,000 路径门槛，覆盖并发 1；上述“小于 1,000 路径沿用原读取方式”仅描述此前里程碑实现。新测量单独报告核心查询与 Import，10k Import 延迟继续开放。

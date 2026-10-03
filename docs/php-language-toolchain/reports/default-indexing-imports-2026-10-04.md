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

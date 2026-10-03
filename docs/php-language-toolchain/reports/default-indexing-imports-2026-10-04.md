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

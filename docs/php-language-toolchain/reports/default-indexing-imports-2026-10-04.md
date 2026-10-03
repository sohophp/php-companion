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

扫描不会把无关新文件全部解析，但仍有文件范围核对和磁盘读取成本，真实规模的复制／粘贴等待尚未测量，不能宣称满足热查询 P95 预算。此轮未改变未解析名称识别的语义范围；仅构造表达式的自动发现需单独核对。真实 WSL、Windows／Remote 交互及完整 Import 预览／Redo 仍不能由上述定向子集代替。

没有打包、更新用户 Profile、推送或发布。

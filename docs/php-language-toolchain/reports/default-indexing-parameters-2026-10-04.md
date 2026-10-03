# 默认索引模式的方法参数修改：2026-10-04

## 范围与修复

新增、删除、重排方法参数原先以 `ensureCompleteRoot` 为前置条件。公开默认 onDemand 和 progressive 的项目源码准备不会设置全局 `completeRoots`，导致这些请求即使项目源码可用也返回空结果。

三类编辑请求现在先等待项目源码准备，再复用 Rename 的完整当前 PHP 源码扫描，包括 Composer 依赖。共享函数命名为 `refreshRefactorDiskSources`；不设置全局索引或框架 Provider 完成标记。扫描预算、取消、项目 epoch 变化仍使请求失败；扫描期间活动文档版本变化也拒绝规划。语义层的完整继承关系、动态调用、调用实参及编辑快照保护继续执行。

每次编辑请求均独立核对源码范围，即使 experimental 已标记完成也不跳过。此路径可能增加大项目重构等待；没有用微型 fixture 的结果宣称真实规模延迟达标。

## 定向验证

最终选定协议测试 11 项通过（其余 445 项未运行），包括六项三模式成功／预算不足矩阵、既有 watcher 方法族及默认模式 Rename 回归。协议矩阵覆盖 onDemand、progressive、experimental：

- 接口、实现、Composer vendor 调用者都纳入新增、删除、重排参数的编辑及 sourceHashes。
- 每次请求前新增未打开调用者且不发送 watcher 事件，核对请求独立发现新文件。
- 项目两份源码在预算内、加入依赖后超出 maxFiles=2，三种参数编辑均拒绝。测试计时要求每次确实进入完整扫描，排除仅靠全局标记提前拒绝的假通过。
- 所有规划请求均不写入磁盘。

隔离 Linux VS Code 宿主分别显式设置 onDemand 和 progressive，串行运行。两种模式中，新增、删除、重排参数均通过三文件预览、取消不修改、应用后的参数与调用文本，以及单次 Undo/Redo 恢复。使用独立临时 fixture 和测试 Profile；没有更新用户 Profile。

复用命令：

```sh
pnpm --filter @php-companion/language-server build
pnpm --filter @php-companion/language-server exec vitest run test/stdio.test.ts -t 'method parameter changes with fresh source coverage|includes newly watched unopened files|complete source Rename|dependency source exceeds the budget'
node esbuild.mjs --production
pnpm exec tsc -p test/extension/tsconfig.json
PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_C3_PARAMETERS_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=onDemand node scripts/run-extension-test.mjs ./dist-test/runTest.js
# 第二次串行执行时将 indexing mode 改为 progressive。
```

根 TypeScript noEmit、语言服务器构建、隔离宿主编译、三份修改源码的 ESLint 及 diff 空白检查通过。

宿主日志：`/tmp/sophp-default-parameters-onDemand-20261004.log`、`/tmp/sophp-default-parameters-progressive-20261004.log`。

## 未关闭的边界

这是三类方法参数编辑的定向证明，不是完整 C3、Windows/Remote 或真实 WSL 验收。Safe Move 的现有源码候选扫描另行审计；其它依赖 `ensureCompleteRoot` 的重构入口仍须逐项核对。没有打包、安装、推送或发布。

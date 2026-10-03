# Safe Move 当前源码覆盖：2026-10-04

## 发现与修复

原实现仅在 `projectCompleteRoots` 尚未完成时扫描项目内名称候选，且不包含 Composer 依赖；项目完成后只处理已收到的 watcher 更新。定向回归在未修改实现时确认：onDemand／progressive 的规划漏掉 vendor 调用者，experimental 的第二次规划漏掉未发送 watcher 事件的新项目调用者。

Safe Move 现在每次请求复用 `refreshRefactorDiskSources`，扫描完整当前 PHP 项目与依赖源码，发现新文件、刷新变化内容并移除已消失的关闭文档。它不把源码覆盖证明写成全局索引或框架 Provider 完成状态。

保留捕获源快照的先后顺序、Explorer 已经移动源文件后的快照入口、未保存内容、PSR-4 路径和 namespace 校验、相关文件快照，以及 `overwrite: false`。扫描预算不足、取消或项目 epoch 改变时不生成编辑。

既有“依赖索引不完整”用例曾允许 Safe Move：未读依赖可能含有待改引用，现改为拒绝 Move；其普通 Import 查询不重复启动完整项目索引的断言仍保留。

## 验证

- **10 项定向协议测试通过**，其余 452 项未运行。包括 onDemand／progressive／experimental 六项成功与预算不足矩阵，以及既有全局／具名 namespace、导入 reconciliation、部分依赖和 PSR-4 重命名／移动竞态用例。
- 成功矩阵精确核对源文件操作、项目与 vendor 调用者的编辑和 sources。第二次请求前新增未打开调用者，不发送 watcher 事件，要求规划独立发现它。
- 预算矩阵项目两份源码在 maxFiles=2 内，加入依赖后超出预算。每次请求要求有 `safeMoveDiskRefresh` 计时，确认完整扫描实际执行并拒绝，而非其它前置条件提前返回。
- 规划请求不写磁盘。
- 隔离 Linux VS Code 串行运行 onDemand 和 progressive：源与调用者预览、取消不修改、应用时移动文件并改 namespace／引用、单次 Undo/Redo 恢复均验证。此处没有 vendor 宿主用例，vendor 覆盖证据来自协议矩阵。
- 语言服务器构建、根 TypeScript noEmit、隔离宿主编译、三份修改源码 ESLint 和 diff 空白检查通过。

复用命令：

```sh
pnpm --filter @php-companion/language-server build
pnpm --filter @php-companion/language-server exec vitest run test/stdio.test.ts -t 'Safe Move with current project and dependency|plans Safe Move between global|reconciles Safe Move imports|only the dependency index is partial|renames a unique type and its matching'
node esbuild.mjs --production
pnpm exec tsc -p test/extension/tsconfig.json
PHP_COMPANION_TEST_C3_ONLY=1 PHP_COMPANION_TEST_C3_MOVE_ONLY=1 PHP_COMPANION_TEST_C3_INDEXING_MODE=onDemand node scripts/run-extension-test.mjs ./dist-test/runTest.js
# 第二次串行运行将 mode 改为 progressive。
```

宿主日志：`/tmp/sophp-default-move-onDemand-20261004.log`、`/tmp/sophp-default-move-progressive-20261004.log`。

## 剩余范围

这是 Safe Move 源码覆盖证明，不是 C3 整体完成或真实 WSL 验收。每次扫描会增加大型项目操作等待，仍需实际规模测量。类型复制／粘贴导入等入口仍存在全局索引前置条件，后续核对；Move 目标文件状态已进一步复用 Rename 的严格检查，见[目标预检后续记录](rename-destination-preflight-2026-10-04.md)。没有打包、更新用户 Profile、推送或发布。

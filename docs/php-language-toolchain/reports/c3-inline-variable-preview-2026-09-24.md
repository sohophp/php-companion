# C3 Inline Variable 预览与旧动作保护

日期：2026-09-24。

## 改动

Core 的 CodeAction 中间件现在把 `RefactorInline` 和现有 `RefactorExtract` 一样送入差异预览。执行时检查选择动作时的源文件版本和内容，确认后再次检查，避免旧动作覆盖后来输入。应用后回到源文件，保持编辑器 Undo/Redo 的操作路径。

## 验证

- `pnpm typecheck`、相关文件 ESLint、`pnpm build` 和扩展测试 TypeScript 编译通过。
- VS Code 1.139.0 的隔离 Core/Symfony Extension Host 中，Inline Variable 的旧动作被拒绝，取消不修改文件，确认后将立即使用的局部变量内联；一次 Undo 恢复原文，一次 Redo 恢复结果。`PHP_COMPANION_TEST_C3_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js` 退出码 0。

此次是源码宿主门禁；用户实际安装的 0.4.5 VSIX 尚不包含本次改动。生成新文件后的 Redo 仍开放，C3 不能据此判定完成。

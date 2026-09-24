# C3 私有参数修改签名预览

日期：2026-09-24。

`Remove unused parameter` 现在通过 CodeAction 预览命令执行。Language Server 为参与编辑的已有文件传递 SHA-256 源码摘要；客户端在打开预览前与确认应用前检查源文件及其它目标文件。摘要或打开文档版本不匹配时拒绝旧编辑。已有目标文件的差异预览以其原文为左侧，而非空文件。

验证：`pnpm build`、扩展测试 TypeScript 编译和相关 ESLint 通过。VS Code 1.139.0 隔离 C3 宿主用真实私有方法参数动作验证旧动作拒绝、取消、应用与 Undo/Redo；双文件编辑进一步验证第二个目标在计划生成后、预览期间变化均不会被覆盖，正常多文件应用可一次撤销与重做。`PHP_COMPANION_TEST_C3_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js` 退出码 0。

完整 `node scripts/run-extension-test.mjs ./dist-test/runTest.js` 也以退出码 0 结束；原有私有参数动作的声明、PHPDoc、位置参数和命名参数编辑及 Undo/Redo 均通过。

此门禁覆盖当前 `Remove unused parameter` 子集，不能代替完整 Change Signature 的参数增删、重排与跨项目调用分析。已安装 0.4.5 VSIX 尚不包含本次源码改动。

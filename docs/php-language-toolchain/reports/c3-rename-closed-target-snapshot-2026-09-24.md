# C3 Rename 关闭目标文件快照

日期：2026-09-24。

Core 的标准 PHP Rename 结果现在携带参与文本编辑的每个文件的 SHA-256 源码摘要。客户端在把 WorkspaceEdit 交给 VS Code 前，读取打开缓冲区或磁盘文件并逐项核对；缺少摘要或内容变化就拒绝旧编辑，PSR-4 文件改名的待处理声明编辑也不会暂存。原有请求期间打开文档版本检查仍保留，并在异步读取关闭文件后再次执行。

定向 VS Code 1.139.0 C3 宿主使用现有 `UserService.php` 与关闭的 `UserController.php`：先证明正常 Rename 包含 Controller 的引用，再暂停第二次 Rename 响应，直接修改磁盘上的 Controller 注释，释放旧结果后客户端拒绝返回 WorkspaceEdit，两个文件都没有被改名或覆盖。`PHP_COMPANION_TEST_C3_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js` 退出码 0；`pnpm build`、根扩展与测试 TypeScript 编译、相关 ESLint 均通过。

完整 `node scripts/run-extension-test.mjs ./dist-test/runTest.js` 也以退出码 0 结束，原有类型、方法、参数、Symfony 与 PSR-4 文件改名场景继续通过。

这项快照验证覆盖 Core 通用 PHP Rename 在**请求返回前**的跨文件变化。Symfony 专有 Rename Provider、VS Code 原生预览打开后到点击 Apply 前的变化、用户真实 F2 界面交互仍需独立验收；当前已安装 0.4.5 VSIX 不包含本次源码改动。

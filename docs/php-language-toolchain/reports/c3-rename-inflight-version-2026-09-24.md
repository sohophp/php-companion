# C3 Rename 请求中的编辑版本保护

日期：2026-09-24。

SoPHP 的 F2 `prepareRename` 和 `provideRenameEdits` 现在记录发起时的打开文档版本。Language Server 响应后，若源文档关闭、源文档或其它已打开文档发生编辑、请求被取消，客户端拒绝返回旧的 Rename 编辑。文件改名所需的待处理编辑只会在复核通过后暂存。

VS Code 1.139.0 隔离 C3 宿主通过真实 F2 Provider 请求验证：服务端算出局部变量 Rename 后暂停；此时用户修改未保存源文档并让服务器收到新版本；释放旧结果后客户端不返回可应用的 WorkspaceEdit，用户修改保留。构建、根扩展/测试 TypeScript 编译、相关 ESLint、设置描述单元测试 2/2 及 C3 宿主均通过。

完整 `node scripts/run-extension-test.mjs ./dist-test/runTest.js` 退出码 0，原有类型、成员、参数、Symfony 和 PSR-4 文件 Rename 回归继续通过。

[VS Code 1.88 更新说明](https://code.visualstudio.com/updates/v1_88)记录 Rename 预览快捷键改为 Windows/Linux `Ctrl+Enter`、macOS `Cmd+Enter`；README 和中英文设置描述已更新。`f14-setting-description-baseline-2026-09-23.json` 保留当时的历史快照，基线测试只允许 `rename.file` 这一处已核对的文案更正。

标准 F2 的预览由 VS Code 提供。此轮证明请求处理中编辑的拒绝；预览打开后、用户点击 Apply 前目标文件再次变化的行为尚未完成独立 UI 验收，不能据此关闭 Rename 的全部 C3 门槛。

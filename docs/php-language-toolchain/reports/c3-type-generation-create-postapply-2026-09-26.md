# C3 类型生成最终创建路径的应用结果

日期：2026-09-26。范围仅为 SoPHP 隔离分支源码、独立 Composer 夹具与 10 项 Open Source Pack 源码宿主；未修改业务项目，未重新打包 VSIX。

类型生成优先移动预先准备的文件。两次移动都失败时，最终使用 VS Code `WorkspaceEdit.createFile`。原先只看 `applyEdit` 的返回值：若编辑已经创建文件，但 API 随后返回 `false` 或抛错，命令仍报告失败，用户可能再次发起创建。

现在最终创建路径在应用后读取目标 URI，核对完整生成字节。内容完整才返回成功；缺失或内容不符仍返回失败。应用阶段的异常保留在失败提示中。文件已经完整创建时，打开编辑器失败仍只作警告，命令保持成功结果。

C3 宿主注入四种结果：先完整应用再返回 `false`、先完整应用再抛错、未应用返回 `false`、未应用抛错；命令结果与实际文件一致。`pnpm build`、扩展宿主 TypeScript、改动文件 ESLint、`git diff --check` 均通过。完整 10 项 Open Source Pack 源码 C3 宿主退出码 0，日志 `/tmp/sophp-c3-create-postapply-profile-20260926.log`。

最终 `createFile` 路径的一次 Undo 后 Redo 仍受 [VS Code 资源编辑缺口](c3-type-generation-fallback-redo-2026-09-26.md)影响。首选及同文件系统备用移动路径仍有一次 Undo/Redo 证据。此源码修复在 0.4.7 冻结 VSIX 之后，现有候选不包含它；真实 WSL Remote 和跨平台行为仍需验收。

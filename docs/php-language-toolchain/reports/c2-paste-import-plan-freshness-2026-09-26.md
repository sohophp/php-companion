# C2：粘贴导入计划的目标文档新鲜度

日期：2026-09-26。粘贴导入 Provider 会等待 Composer 候选和语言服务器的导入计划；目标 PHP 文件若在等待期间改变，此前仍可能返回基于旧版本的附加 `use` 编辑。

Provider 现在在查询前记录目标文档版本和磁盘快照，返回建议前再次核对。目标文件发生未保存编辑或外部磁盘变化时，丢弃旧建议；同一检查也覆盖非自托管语言服务的兼容路径。

验证：隔离 VS Code 1.139.1 Linux x64 中，完整 10 项 Open Source Pack 的 C3 源码宿主退出码 0。测试通过实际 Paste Provider 路径确认正常文档有 `UserService` 导入建议；暂停真实 `planTypeImports` 请求，在等待期间编辑目标文档，释放请求后 Provider 不再返回旧建议。主扩展和宿主测试 TypeScript 编译、相关 ESLint 与 `git diff --check` 通过。该测试验证 Provider 返回值，不代替人工粘贴菜单验收；源码尚未打包 VSIX，真实 WSL Remote 仍待 C4。

# C2/C3 后续源码完整回归门禁

日期：2026-09-29。源码基线为 `32e7e6a` 加当前未提交增量；本次检查发生在跨 namespace 导入冲突修复及独立半词附近变量诊断修复之后。保留工作区内其它未提交改动。

## 结果

- `pnpm test`：退出码 0。语义包 487/487；语言服务器 21 个测试文件，444 项通过、1 项跳过；testkit 5/5；Symfony 13/13；根扩展 69/69。其它组件包也在同一命令中通过。
- `pnpm lint`：退出码 0。
- `pnpm exec tsc --noEmit` 与 `pnpm --dir packages/php-companion-symfony typecheck`：均退出码 0；`pnpm test` 已执行组件构建。
- `git diff --check`：退出码 0。

这次全量回归补齐了此前仅做定向验证的两个源码增量。C3 导入的真实 LSP 与隔离 Core 宿主、C2 诊断的真实 LSP 与隔离 C2 宿主仍分别以各自报告为证据；本次没有重新运行可见编辑器或长会话性能门禁，也没有打包 VSIX、更新 Profile 或做真实 WSL UI 验收。C1–C4 与 R4 仍按路线图继续。

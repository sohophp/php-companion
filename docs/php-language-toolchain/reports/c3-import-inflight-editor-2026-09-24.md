# C3 导入请求处理期间的编辑

日期：2026-09-24。此前三个导入命令已能拒绝“服务器计划返回后、客户端应用前”的旧编辑。本轮进一步验证服务器**仍持有请求**时，用户修改打开的 PHP 文档。

扩展测试模式现在可一次性暂停 `addImport`、`planTypeImports` 或 `organizeImports` 的已计算响应，并报告暂停状态与服务器中的文档版本。独立 C3 宿主用例依次发起 `Import Class`、`Resolve Pasted Imports`、`Optimize Imports`；每次确认响应已暂停，修改未保存缓冲区，等服务器收到新版本，再释放旧响应。三次均断言旧编辑没有应用、用户输入仍在，并可单独 Undo 该输入。服务器输出依次记录三个 `[test-query-paused]` 方法。

验证：TypeScript 检查、相关 ESLint、差异检查和 `pnpm test:extension:c3` 通过；VS Code 1.139.0 源码宿主退出码 0，日志 `/tmp/sophp-c3-inflight-import-20260924.log`。本轮同时提供可重复运行的独立 C3 宿主入口，避免每次只为这三个时序等待完整编辑器回归。

此门禁证明本机源码宿主中的服务端请求交错和版本拒绝。QuickPick 输入、非模态预览通知的真人点击、WSL Remote 与可安装候选仍分别待验；不宣称 C3 或 R4 完成。未修改业务项目，未打包 VSIX。

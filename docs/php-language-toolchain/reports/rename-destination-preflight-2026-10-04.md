# Rename 目标预检

## 缺口与修复

原编辑器回退 Rename 的存在性检查吞掉所有 `workspace.fs.stat` 异常，权限、提供者不可用及普通 I/O 故障均会被当作不存在。实际 parser／索引配合受控文件系统故障的新增测试，在修复前 3 项失败、3 项通过；现在只允许明确的 `FileNotFound`，其余错误原样传播，且在创建 WorkspaceEdit／暂存改名前退出。

默认 Language Server 的非大小写改名目标也吞掉所有 Node stat 错误。真实 stdio 在目标为自指循环链接时仍得到文本和文件改名计划，新增回归修复前失败。目标检查改为 `lstat`：已有目录项（包括循环与悬空链接）均占用目标，只有 `ENOENT` 可放行，其它错误返回不可用计划。正常文件不存在、恢复后重新规划和 `renameFile: false` 的纯文本修改继续可用。没有改大小写专用分支、文件操作覆盖选项或应用流程。

## 验证

- 定向根单元 3 文件／17 项通过：新增 6 项包含 NoPermissions／Unavailable／普通 I/O、已有目标、确认缺失目标和关闭文件改名的反例，并复测现有 Move 文件状态及 Rename 设置迁移。使用真实 parser／索引；VS Code 文件系统和 WorkspaceEdit 是受控模拟，不当作 Remote 权限 UI 验收。
- 最终真实 stdio 2 项通过、444 项未选中，7.60 秒：新增 POSIX 循环／悬空链接、源文件和链接不变、精确纯文本编辑、删除链接后恢复文件联动，及既有 PSR-4 Rename／导入综合回归。新增链接用例在 Windows 明确跳过，当前执行环境 Linux WSL2；不声明 Windows 链接验收。
- 当前 production bundle 的定向 VS Code 1.140.0 C3 退出 0：两个链接均返回 false、未打开预览、源码／链接保持不变；目标缺失时预览取消、应用、类型与文件名联动，以及一次 Undo/Redo 通过。日志 `/tmp/sophp-rename-destination-host-ready-20261004.log`。用例由 `PHP_COMPANION_TEST_C3_RENAME_DESTINATION_ONLY=1` 运行。
- 同轮完整标准 Core／独立 Symfony C3 退出 0、68 条 C3 证明，日志 `/tmp/sophp-rename-target-c3-20261004.log`；该整轮已含编辑器回退修复，但早于默认 Language Server 的 lstat 修复，不能冒称最后全部改动后的完整 C3。默认 LSP 最终改动由上述真实协议和定向宿主覆盖。
- Language Server 构建、production bundle、根 TypeScript noEmit、宿主编译、相关 ESLint 和 diff check 通过。

最初宿主探针使用了不在公开 API 白名单内的请求，随后在启动未准备好时遇到编辑器 `No result.`；夹具改用标准 Rename Provider 命令并仅等待这个明确启动状态，超时和其它异常继续失败。没有增加产品测试白名单或放宽拒绝／文本／Undo 门槛。

本批没有全量协议、真实 Remote 权限或用户 WSL UI 结论。未安装、打包、更新 Profile 或推送；C3 整体仍按原路线图开放。

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

## 大小写专用分支补充

随后核对原本跳过目标检查的大小写分支。修复前新增回退用例 4 项失败、8 项通过；真实 stdio 在同时存在 `OldName.php` 与内容不同的 `oldname.php` 时仍生成文件改名计划，回归失败。

现在大小写变化也先检查目标。如果目标查找成功，只有目录实际包含源文件拼写、且没有独立的新拼写目录项时，才视为大小写不敏感文件系统上的源文件别名。独立目标、缺少源目录项和目录读取失败均拒绝；确认缺失的目标直接沿用正常改名。该判断不以操作系统名称推断文件系统大小写行为，文件操作仍保持 overwrite=false。

- 最终根定向 3 文件／23 项通过。新增 6 项检查独立冲突、同一源别名、源项不存在、目录 NoPermissions／FileNotFound 和确认缺失目标；故障在创建编辑前退出。
- 最终真实 stdio 2 项通过、444 项未选中，7.28 秒。原目标用例追加 Linux 大小写冲突、纯文本修改精确结果、两个文件原文不变及删除冲突后的准确目标 URI；原 PSR-4 回归同时通过。
- 当前 VS Code 1.140.0 定向宿主退出 0，日志 `/tmp/sophp-rename-case-destination-host-20261004.log`。独立大小写目标在预览前拒绝，保留两个文件；正常与大小写目标各经过取消／应用／一次 Undo/Redo，并额外 Undo 恢复夹具。原循环／悬空链接反例继续通过。
- 独立 Windows 挂载临时目录协议探针确认大小写不敏感：目录只有 OldName.php，lstat／读取 oldname.php 命中同一源内容，完整索引模式生成准确文本和 OldName.php → oldname.php 操作，原文和目录项未变。原始 JSON `/tmp/sophp-case-insensitive-filesystem-20261004.json`，临时夹具已清理。运行进程为 WSL Node 22.14.0，不能当作原生 Windows 编辑器／Remote UI 证明。
- Language Server 构建、production bundle、根 noEmit、宿主编译、相关 ESLint 及 diff check 通过；没有重跑完整 C3 或全量协议。

该临时探针最初等待 progressive 的全局 complete=true，但项目准备已结束且该模式报告 complete=false；修正等待后，类型 Rename 仍没有文件改名计划。完整索引模式才用于上述文件系统别名验证，不把模式替换当作默认模式问题已解决。后续优先核对 onDemand／progressive 的类型 Rename 完整性条件及用户反馈；当前不依据此单个探针给两种模式整体下结论。

随后完成[默认模式 Rename 定向修复](default-indexing-rename-2026-10-04.md)：使用独立完整源码扫描替代旧全局标记拒绝，双模式协议及串行宿主通过；预算反例、首次并行失败及真人边界分别保留。

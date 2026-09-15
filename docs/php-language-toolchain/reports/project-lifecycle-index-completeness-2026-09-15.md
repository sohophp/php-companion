# 项目生命周期与索引完整性验收

日期：2026-09-15。范围：P3 文件/Composer 生命周期、资源边界、完整性状态、取消、进度和持久缓存恢复。

## 最终契约

- VS Code 文件监控创建未知 PHP 文件、删除已索引 PHP 文件或发送普通移动的 delete/create 组合时重新发现 Composer 源码；移动后的 Definition 使用新 URI，旧声明不残留。
- 已打开 PHP 文档始终以编辑器内容为权威来源。对应磁盘文件发生 change 或完整 Composer 重索引时，不覆盖未保存内容；关闭文档后恢复磁盘事实。
- `composer.json` / `composer.lock` 变化重新读取项目模型。扩展启用状态和新增 PSR-4/PSR-0/classmap/files 映射无需重启即可生效。
- `maxFiles`、`maxFileSizeBytes` 和 `maxTotalBytes` 必须是正安全整数。项目源码缺口报告 `projectComplete=false`；依赖截断或缺口在项目完整时报告 `projectComplete=true, complete=false`。
- 项目或依赖索引不完整时不发布 `php.type.unresolved`、`php.function.unresolved` 和 `php.constant.unresolved`。已证明的正向查询仍可使用已经索引的声明。
- 无效缓存 JSON、摘要/结构校验失败和 restore adapter 抛错均不能成为完整缓存命中；受影响来源回退到解析，其他有效条目继续复用。

## 自动证据

`packages/language-server/test/stdio.test.ts` 使用真实 `dist/server.js --stdio` 连续执行以下状态变化：

1. 打开与磁盘内容不同的 Consumer，确认成员补全来自打开缓冲区；随后改写磁盘并发送 watched change，结果不变。
2. 创建类型并发送 Created，确认类型补全出现；删除并发送 Deleted，确认候选消失。
3. 将声明文件移动并发送 Deleted/Created，确认 Definition 只落到新 URI，同时打开缓冲区的补全仍有效。
4. 已存在但不在 Composer 映射中的类型起初无法 Definition；修改 autoload 后重新索引，Definition 精确落到新增映射目录。
5. 放入超过默认 512 KiB 单文件预算的项目源码，确认日志报告 `complete=false` 和具体预算警告，且打开文档不产生任何未解析类型、函数或常量诊断。

`packages/index/test/index.test.ts` 分别验证文件数、单文件大小、总字节和非法预算；项目与依赖缺口的两级完整性；确定性依赖截断；发现阶段取消且不发布部分集合；无效 JSON 和单条 restore adapter 异常的源码恢复。`packages/language-server/test/stdio.test.ts` 另有 work-done progress create/begin/end 与请求取消回归。长期编辑基准持续测量更新、诊断、补全、取消、RSS、重启和缓存损坏恢复。

最终全仓类型检查和 ESLint 通过；十六个组件 638 项、根扩展 35 项，共 673 项测试通过。十六个组件的隔离 tarball、三个 VSIX 内容及 VS Code 1.137.0 Linux x64 打包 Extension Host 通过。1,000 文件持久索引复核冷/热为 2,213.75/671.14 ms，热/冷比 0.3032，恢复 1,000/1,000、重解析 0；聚焦查询只加载 `Consumer::inspect`，派生层和 callable 记录损坏分别只重建 1 个文件。

## 边界

文件系统事件由 VS Code 提供；测试覆盖协议级 Created/Changed/Deleted 及普通移动组合，资源管理器 Safe Move 另有独立事务、Undo/Redo 和失败恢复门禁。自动测试证明 Windows/Linux/macOS 进程和扩展宿主行为时，仍不代替 Windows 客户端连接 WSL Remote 的人工长会话。

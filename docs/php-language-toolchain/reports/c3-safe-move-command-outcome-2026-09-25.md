# C3 Safe Move 命令结果

日期：2026-09-25。SoPHP Core 的 `phpCompanion.safeMove` 现在返回布尔值：用户取消、预览被关闭、应用前文件变化、应用失败时返回 `false`；VS Code 成功应用文件移动时返回 `true`。若移动已应用、随后旧索引刷新失败，命令仍返回 `true`，同时明确提示文件已移动但索引刷新失败，避免把已发生的文件操作误报为未发生。

独立 C3 扩展宿主 `/tmp/sophp-c3-safe-move-command-outcome-20260925.log` 与当前 10 项 Open Source Pack 源码宿主 `/tmp/sophp-c3-safe-move-command-outcome-full-pack-20260925.log` 均退出码 0。宿主分别断言取消、关闭预览、预览后外部改写磁盘为 `false`，实际应用为 `true`；源文件与目标文件状态、预览清理及一次 Undo/Redo 继续通过。根扩展与测试 TypeScript、相关 ESLint 和差异检查通过。

测试没有强制制造旧索引刷新抛错，也没有使用安装候选或 WSL Remote；这些情形仍需与交付候选分开验收。类型生成文件的一次 Redo 缺口不受此改动影响。

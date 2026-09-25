# C3 导入命令结果

日期：2026-09-25。`SoPHP: Import Class` 和 `SoPHP: Resolve Pasted Imports` 现在只在工作区编辑实际应用成功后返回 `true`；没有可用计划、用户取消、源文件过期、磁盘内容变化或应用失败返回 `false`。原有失败提示保留；旧索引模式下应用编辑抛错时也给出导入失败提示并返回 `false`。这使命令调用方能区分“操作已应用”与“没有改动”。

独立 C3 宿主 `/tmp/sophp-c3-import-command-outcomes-fixed-20260925.log` 和当前 10 项 Open Source Pack 源码宿主 `/tmp/sophp-c3-import-command-outcomes-full-pack-20260925.log` 均退出码 0。两条命令分别覆盖服务端请求期间的未保存编辑、计划完成后的外部磁盘改写、正常应用及一次 Undo/Redo；新增断言核对过期时返回 `false`、应用时返回 `true`。根扩展及测试 TypeScript、相关 ESLint 与差异检查通过。

调查时发现原 Safe Move 宿主场景在外部磁盘改写后立即复用同一打开文件作为成功样本，会被随后到达的 VS Code watcher 事件正确判为“规划期间参与文件变化”，导致间歇性失败。成功移动现使用新文件夹具，并保留原文件专测并发改写拒绝；没有放松产品的快照守卫。失败复现日志为 `/tmp/sophp-c3-import-command-outcomes-20260925.log` 与 `/tmp/sophp-c3-import-command-outcomes-repeat-20260925.log`。临时诊断日志已从源码移除。

这两次是 Linux 源码扩展宿主测试；没有注入 `workspace.applyEdit` 抛错，也没有覆盖安装候选或 WSL Remote。类型生成文件的一次 Redo 缺口仍开放。

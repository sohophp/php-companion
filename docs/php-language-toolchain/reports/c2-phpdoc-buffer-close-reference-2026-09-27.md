# C2 PHPDoc 类型的缓冲区与磁盘引用往返

日期：2026-09-27。只在 SoPHP 隔离分支和独立临时 Composer 项目验证，不修改业务项目或打包 VSIX。

新增真实 stdio 回归：默认 Pack 使用的 `onDemand` 模式下，磁盘 PHPDoc 的跨行类型为 `Widget`；打开文件后未保存改为 `Other`。从两个类声明查询 References、从注释类名查询 Definition，均按当前缓冲区切换。关闭文件后磁盘仍为 `Widget`，References 恢复到 `Widget`，且 `Other` 不再返回该文件。定向 `stdio.test.ts` **1/1** 通过。

建夹具时先使用了语言服务器单独运行的 `experimental` 默认值，关闭文件后的即时 References 返回空；该模式可能仍在准备项目索引，不是当前 Pack 的默认配置。按 Pack manifest 的 `onDemand` 设置后，完整往返通过。若将来把 `experimental` 提为日常默认，应单独调查该关闭时机与索引完成状态，不能用本次 `onDemand` 证据替代。真实 VS Code WSL Remote、长会话与安装候选仍待验收。

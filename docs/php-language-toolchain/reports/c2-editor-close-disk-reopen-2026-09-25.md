# C2 编辑器关闭后磁盘更新与重新打开

日期：2026-09-25。使用独立 Composer PSR-4 夹具和 VS Code 1.139.0 隔离 Core 源码宿主，未修改业务项目或打包 VSIX。

## 操作与结果

1. 打开引用 `ReopenFeedback::reopenOld(int)` 的使用方，补全确认旧方法可见。使用方启用 `strict_types=1`，声明文件名与类名符合 PSR-4。
2. 打开声明文件并关闭其编辑器标签页。宿主在关闭后仍保留该文档（`retainedAfterClose=true`）；因此标签页关闭不能作为 LSP `didClose` 的证据。
3. 在磁盘上把声明改为 `reopenNew(string $value)`，重新打开文件。编辑器文档读到新内容，使用方补全只包含新方法，旧方法定义不再返回。
4. 未保存地把使用方调用改为 `reopenNew(1)`；Definition 指向新声明，Hover 与 Signature Help 显示新方法和 `string` 参数，严格类型诊断报告数字实参错误。再把实参改为字符串，诊断撤回；从新声明查找 References 能找到未保存的调用。
5. 同时把接口与实现类的声明从旧方法改为新方法；从接口的新声明执行 Implementation，落在实现类的新方法。

独立 Core 源码宿主日志 `/tmp/sophp-c2-editor-reopen-implementation-20260925.log`，退出码 0。随后在冻结的外部扩展目录中加载 Core、Symfony、Pack 元数据及 8 个外部成员，完整 C2 源码 Profile 日志 `/tmp/sophp-pack10-c2-editor-reopen-implementation-20260925.log`，退出码 0。TypeScript 编译通过。此前直接发送同版本 `didClose/didOpen` 的真实 LSP 门禁仍见[同版本重开报告](c2-same-version-reopen-queries-2026-09-25.md)；两份证据覆盖不同生命周期。测试中的非 PSR-4 文件名和未启用严格类型曾使跨文件诊断断言失败，修正夹具后门禁通过；这些失败不作为生产故障归因。

本项收口当前 Linux 源码宿主中的关闭标签页、磁盘更新、重新打开后的补全、定义、Hover、参数提示、Implementation、References 与诊断一致性。安装候选、WSL Remote、不同文件系统和长时间会话仍按 C4 验收。

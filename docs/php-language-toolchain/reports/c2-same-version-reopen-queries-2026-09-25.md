# C2 同版本重开后的旧查询防护

日期：2026-09-25。独立 Composer PSR-4 夹具中，先打开 `Contract $item` 的使用方并暂停一项查询，再以 `didClose` / `didOpen`、**相同 LSP 版本号 1**重开成 `Other $item`。随后释放旧请求，并请求新结果。

既有真实 stdio 回归只覆盖 Completion；现在同一时序覆盖 Completion、Hover、Signature Help 和 Definition。四项旧请求分别返回空列表或 `null`，不会把旧 `Contract` 结果交给新文档；四项新请求均对应 `Other::render(string $value): void`，Definition 指向 `Other.php`。定向真实 stdio 测试 1/1 通过，相关 ESLint 与 `git diff --check` 通过。此项仅扩大回归门禁，没有改动生产语言服务器。

该测试直接发送真实 LSP 的关闭与重开通知。VS Code 关闭编辑器标签页未必立即关闭文档；此前隔离宿主中关闭标签页没有产生 `didClose`，因此本报告不把 stdio 证据写成真实编辑器关闭标签页的端到端验收。下一步继续从完整组合中实际可复现的旧结果或等待入手；安装候选、Remote 和长会话仍按 C4 验收。

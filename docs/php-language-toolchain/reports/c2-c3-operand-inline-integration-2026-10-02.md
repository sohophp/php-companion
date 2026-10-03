# C2／C3：操作数排序与共享写入保护集成

日期：2026-10-02。将 R29 操作数排序、Inline Variable 动态绑定与闭包引用捕获作为一批收口。完整集成已结束，冻结输入终态一致；stdio 只启动一次，未因日志静默重启。后续源码变化单独验收；未打包、提交或更新 Profile。

| 检查 | 当前证据 |
| --- | --- |
| 全量语义 | 当前 23 文件、598/598，50.60 秒 |
| 标准组合 C3 | 当前源码退出码 0，新增 extract 别名／闭包捕获的操作撤回与 Undo/Redo，及原 Rename、Move、Extract、生成、Symfony 引用流程均通过 |
| 当前完整 stdio | 399/399、零跳过，通过；1244.27 秒、退出码 0，显式启用跨进程引用缓存 |
| 完整 Core C2 | 退出码 0；正式 CORE_ONLY／C2_ONLY 入口，未启用 C2_ELVIS_ONLY；旧反馈链和新增操作数排序同批通过 |
| 全仓 Lint | 明确退出码 0 |
| C1 可见列表 | PHP 7.2／8.1／8.5 均退出码 0；列表、Enter／Tab 接受、模板占位符和 Undo 通过；renderer 异常单列 |
| 冻结输入 | 17 项在 stdio 终态后全部一致，final-inputs.log；C3 自身八项也在其终态匹配 |

17 项输入 `/tmp/sophp-operand-inline-integration-inputs.sha256`，日志 `/tmp/sophp-operand-inline-integration-{full-stdio,full-c2-host,lint}.log`，对应终态退出码 `{stdio,c2,lint}-exit.txt`。当前 C3 终态及八项输入见 [捕获保护](c3-inline-captured-local-bindings-2026-10-02.md)。

| PHP | 六次弹窗等待（ms） | 中位／最大（ms） | 已知 renderer 异常 |
| --- | --- | --- | --- |
| 7.2 | 233／263／258／239／232／245 | 242／263 | 无 getItemsByProvider 异常 |
| 8.1 | 238／219／226／234／226／242 | 230／242 | 一次 |
| 8.5 | 230／221／230／227／239／239 | 230／239 | 一次 |

原始可见日志 `/tmp/sophp-operand-inline-integration-c1-ui-{72,81,85}.log`，对应 `-exit.txt` 均为 0。既有 [无 SoPHP 的最小 Provider 对照](c1-renderer-suggest-minimal-control-2026-10-01.md)保持原范围，本批不声称修复 renderer。可见等待不等同于热 LSP P95，也不代表 WSL Profile 真人验收。

保留原 60 项、D01–D30 和 R01–R29。源码自动化不代替真实 WSL、Windows/macOS、全部外部扩展安装或多小时人工会话；已记录 renderer 异常与最终资源 Redo 范围继续单列，不因本次通过若干安全操作而关闭整个 C3 或 F08。

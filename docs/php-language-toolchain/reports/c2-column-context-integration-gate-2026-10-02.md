# C2：对象列与条件上下文阶段集成

日期：2026-10-02。范围 R26–R28；完整集成已结束，所有以下输入终态一致。未打包、提交或更新 Profile。后续修改须单独记录，不借本批结果宣称再次全量通过。

| 检查 | 状态 |
| --- | --- |
| 全量语义 | 21 个文件、578/578 通过，50.53 秒；含最后追加的四项赋值位置用例 |
| 完整 Core C2 宿主 | 退出码 0；未启用 ELVIS_ONLY 子集，包含普通／泛型对象列及条件上下文的未保存修改、Undo/Redo |
| 完整 stdio | 395/395 通过、零跳过，1230.35 秒，退出码 0；显式启用跨进程引用缓存 |
| 全仓 Lint | 补收明确退出码 0；原观察句柄缺失，使用 lint-final 日志及 lint-exit 文件作为终态证据 |
| 冻结输入 | 17 项 SHA-256 在完整 stdio 终态后全部一致；记录 final-inputs.log |
| C1／C3 | PHP 7.2／8.1／8.5 可见列表与接受文本均退出码 0；标准组合 C3 同样退出码 0，包含 Core／Symfony／Pack 源码宿主的导入、Rename、Move、Extract 与类型生成操作 |

输入清单 `/tmp/sophp-column-context-integration-inputs.sha256`。日志 `/tmp/sophp-column-context-integration-{full-semantic,full-c2-host,full-stdio,lint}.log`；stdio 终态退出码另写入 `/tmp/sophp-column-context-integration-stdio-exit.txt`。

三个版本均核对枚举版本限制、词中替换、Tab 模板及占位符与 Undo，独立日志及退出文件为 `/tmp/sophp-column-context-integration-c1-ui-{72,81,85}.log` 与对应 `-exit.txt`。

| PHP | 六次可见弹窗等待（ms） | 中位／最大（ms） | 结果 |
| --- | --- | --- | --- |
| 7.2 | 227／235／236／234／227／233 | 234／236 | 退出码 0；最后一个 func 字符触发等待 28 ms |
| 8.1 | 225／235／231／227／246／228 | 230／246 | 退出码 0；一次已知 getItemsByProvider renderer 异常 |
| 8.5 | 229／239／227／226／234／236 | 232／239 | 退出码 0；一次相同 renderer 异常 |

renderer 异常仍单列，既有无 SoPHP 最小 Provider 对照见 [异常归因](c1-renderer-suggest-minimal-control-2026-10-01.md)，不声称已经修复。全仓 Lint 终态见 `/tmp/sophp-column-context-integration-lint-final.log` 与 `lint-exit.txt`。

C3 使用 `PHP_COMPANION_TEST_C3_ONLY=1` 的标准组合入口，未设置 CORE_ONLY。终态日志 `/tmp/sophp-column-context-integration-full-c3-host.log`、退出码 `/tmp/sophp-column-context-integration-c3-exit.txt`；包含拒绝过期编辑、预览取消／应用、已支持操作的 Undo/Redo，以及 Symfony 事件引用刷新。此结果不代表外部十项扩展已安装验收，也不关闭所有 createFile 兜底、跨平台与真实 WSL 门槛。C3 结束与完整 stdio 终态后 17 项冻结输入均一致，最终日志 `/tmp/sophp-column-context-integration-final-inputs.log`。

已有增量证据见 [普通对象列](c2-object-column-property-types-2026-10-02.md)、[泛型行](c2-generic-object-column-types-2026-10-02.md)与[条件上下文](c2-conditional-completion-context-2026-10-02.md)。本报告不以启动状态、旧测试或单个定向用例代替完整集成结论。真实 WSL、跨平台、完整外部扩展组合与已记录的 renderer 异常保持单独验收。

# 参数重排修正构建的完整回归与编辑器验证

2026-10-11，正常 Core/Symfony 语言服务器 `762362525977cfa6d81d99ca1766ddc256bb7638d95655b0bb01cd7886aa401e`。本轮完整测试和编辑器运行均使用该构建，未借用旧构建资格。[默认值及行号修正](reorder-default-evaluation-2026-10-11.md)的定向语义、协议及九版本实际 PHP 证据保持。

| 范围 | 当前构建结果 | 独立终态证据 |
| --- | --- | --- |
| 完整语义 | 179文件、23776/23776；原23761项保留，新增15项 | [质量及语义审计](../../../.vscode-test/d1889-quality-semantic-terminal-audit.json) |
| 完整 LSP | 125文件、1526/1526；原1520项保留，新增6项；零失败、跳过或TODO | [LSP审计](../../../.vscode-test/d1887-current-full-lsp-terminal-audit.json) |
| 全项目质量门禁 | Lint、根与Symfony严格类型、依赖边界和契约、24组件类型、113/113根单元通过 | [质量及语义审计](../../../.vscode-test/d1889-quality-semantic-terminal-audit.json) |
| Linux 原完整编辑器流程 | C1/C2 onDemand及C3 onDemand/progressive四流程通过 | [编辑器审计](../../../.vscode-test/d1888-current-editor-terminal-audit.json) |
| 原生 Windows PHP8.5 完整 C3 | onDemand/experimental通过，257.87/282.11秒；原300秒期限保持 | [Windows审计](../../../.vscode-test/d1893-current-native-c3-terminal-audit.json) |
| Linux 原12扩展组合 | 原功能、格式化失败恢复、保存及format-on-save、Undo/Redo、真实Xdebug和PHPUnit任务通过 | [组合审计](../../../.vscode-test/d1901-current-full-profile-terminal-audit.json) |
| 组合编辑反馈 | 标量50轮P95=79ms；联合30轮P95=100ms；原150ms门槛通过 | 同上 |

根类型及各组件等原纯门禁分别执行；未执行带构建副作用的整条 `pnpm typecheck` 包装命令。编辑器使用新严格编译的97份JS，137份源输入逐项核对；旧95份编译产物不作为当前编译资格。

两项 Linux C3 和两项 Windows C3 均实际执行新增效果重排及默认值/行号流程，覆盖公开命令、预览/取消/应用、未保存调用者及一次Undo/Redo。每个C3保留原40组生成边界（20允许、20拒绝），共160组；原完整流程遗漏新场景的失败记录保留。

12扩展组合的PHP/Twig格式化分别核对保存磁盘、缓冲区、版本与Undo/Redo；故意失败后恢复正常格式化。实际Xdebug在第3行断点读取40，单步至第4行读取42，程序返回42；PHPUnit实际编辑器ProcessExecution任务按通过/断言失败/恢复返回0/1/0，工作目录和PHP8.5运行时一致。测试资源和自有进程终态均已核对，不代表Test Explorer完整资格。

组合首轮标量反馈1093ms，首次Hover调用947ms；联合最大469ms。这些冷启动观测保留，P95通过不关闭整体冷启动或引用性能。旧8b42a368引用六流程仍为5/6，选区1172ms超过原1000ms；该引用报告未在76236252重新执行，不转移性能资格。

全部运行先冻结输入、再执行原流程、最后核对输入、仓库、链接和自有进程。各独立归档为LSP188、Linux编辑器373、质量/语义243、Windows391、组合87文件；数量不合并为去重总数。组合冻结31551输入/185链接，Windows合并核对30359输入/184链接；没有测试中途修改源文件或缩短流程。Windows及组合运行结束后才更新本报告与项目文档，历史冻结快照及归档保持。

缺失的高级类型编号映射已恢复为[当前报告](advanced-type-numbered-fixtures-2026-10-11.json)：12项既有用例各对应本次完整语义中的一个通过结果，未添加测试或重建旧23475项历史资格。验收表仍为173个唯一编号、14家族、26个未完成计划大项。

当前Windows其它模式及完整C1/C2、当前macOS、真实WSL Remote、真实项目多小时与人工使用、通用重构支持及完整F01–F14/P0–P9继续开放。原Windows C2/Undo/createFile Redo限制和历次失败保留。日常Profile未更新，未提交、推送、打包或发布；不关闭C1–C4、F13、P9或R4。

[机器报告](reorder-default-full-qualification-2026-10-11.json)。

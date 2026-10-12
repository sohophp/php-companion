# 当前标识符与 Unicode 方法修正构建：完整验证

2026-10-11，同一正常 Core/Symfony 语言服务器 `db1b1e6a01b305d009bf0437ee6aa2e6addc41579cfb098a545e4781a81687da`。此前[正常源码修正](prepared-reference-identifier-normal-2026-10-11.md)已完成准备引用的标识符筛选、中文/补充平面方法名与 UTF-16 范围保护；现在完成该构建的完整组合验证。

| 验证范围 | 当前结果 |
| --- | --- |
| 全项目质量门禁 | Lint、Core/Symfony 严格类型、组件依赖、公开契约、24 组件类型及 113 根单元全部通过 |
| 完整 Parser / Semantic / LSP | 200 / 23,782 / 1,530 项通过；Semantic 180 文件、LSP 126 文件，零失败、跳过和 TODO；原 23,776/1,526 身份及次数保留 |
| 固定真实项目引用六流程 | 六项全部通过；12 个 cold/reload 阶段各 188 References、1 Definition，完整位置摘要及四个继承/vendor 锚点匹配 |
| 原四项 Linux 编辑器工作流 | C1/C2 onDemand、C3 onDemand/progressive 全部通过；两 C3 的实参/默认值重排及 80 组生成边界实际执行 |
| 原生 Windows 完整 C3 | PHP8.5 onDemand/experimental 全部通过；实际 wrapper 为 264.218/297.029 秒，原 300,000ms 期限保持；两项共 80 组生成边界及生命周期门禁通过 |
| 原完整 12 扩展 Linux 组合 | 标量 50 轮 P95 86ms、Union/Shape 30 轮 P95 131ms，通过原 150ms 门槛；PHP/Twig 格式化、保存、Undo/Redo、故意失败恢复，实际 Xdebug 40→42 和 PHPUnit 任务 0/1/0 均通过 |

引用结果和计时分别保留，不把某个流程通过推导为全部性能预算通过：

| 原流程 | cold / reload References，ms |
| --- | --- |
| normal_reload | 16041 / 1916 |
| early_reload | 15844 / 2159 |
| early_reload_prewarm | 16219 / 1358 |
| source_reload | 5658 / 6609 |
| source_selection_reload | **606 / 637** |
| source_prime_immediate | 5311 / 15978 |

选区流程的原 1000ms 全链路、100ms semantic 守卫与无候选扫描要求均通过；提前恢复原 3500ms 及整阶段行为守卫保持。上述每阶段为单次采样，**不是 P95**。正常冷首次查询仍有秒级候选加载成本，完整真实项目性能继续开放。旧选区 1172ms 失败及私有候选 558/677ms 保留在原快照，不作为当前测量。

当前编辑器沿用已严格编译的 97 份产物，重新核对 137 份源码输入和全部产物的精确身份；此次没有重新编译这些 Linux 编辑器测试，也没有沿用旧编辑器通过结论。Windows 原完整入口重新生成隔离 bundle，原业务断言、工作流和期限保持。日常安装仍为原版本，未更新 Profile、打包、提交、推送或发布。

独立终态审计分别核对 LSP 30,112、质量/语义 30,118、引用 69,605、Linux 编辑器 30,122、Windows 30,376、完整组合 31,562 个冻结输入；184 条原链接、组合的第 185 条私有链接、两仓库身份及自有进程/缓存退出保持。全部三个排队父进程已退出并收集。新增汇总归档 62 文件，原各独立原始日志、位置、运行时和归档保留。

175 个编号样例、14 家族，路线图 26 个未关闭大项保持。此处证明当前构建的上述范围；其它 Windows 模式/C1/C2、macOS、真实 WSL Remote、真实项目多小时人工使用、剩余语言/重构支持、完整 F13/P9/R4 与最终交付继续。完整 Unicode 语言支持亦未因此关闭。

[机器报告](prepared-reference-identifier-full-qualification-2026-10-11.json)；[汇总终态证据](../../../.vscode-test/d1953-current-qualification-evidence.json)；[LSP](../../../.vscode-test/d1940-current-full-lsp-terminal-audit.json)、[质量与语义](../../../.vscode-test/d1941-quality-semantic-terminal-audit.json)、[引用六流程](../../../.vscode-test/d1942-current-reference-terminal-audit.json)、[Linux 编辑器](../../../.vscode-test/d1944-current-editor-terminal-audit.json)、[原生 Windows](../../../.vscode-test/d1950-current-native-c3-terminal-audit.json)、[完整扩展组合](../../../.vscode-test/d1951-current-full-profile-terminal-audit.json)、[汇总归档](../../../.vscode-test/d1953-current-qualification-evidence-archive/manifest.json)。

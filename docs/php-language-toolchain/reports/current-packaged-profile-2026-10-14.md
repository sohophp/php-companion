# 当前冻结 VSIX 的完整 Linux 组合验证

2026-10-14。结论：**三份冻结 VSIX 在完整 Open Source Profile 操作链中已执行并通过，独立终态审计退出 0**。实际阶段命令退出 0，耗时 93.65 秒；原 9100 个依赖噪声文件、50/30 轮反馈及 150 ms 的 P95 门槛保持。

Core、Symfony、Open Source Pack 从[本轮独立保存的新包](current-local-vsix-2026-10-14.md)解压加载。编辑器中核对了三份包的实际路径，Core/Symfony 合计 16 份运行文件与冻结构建逐字相同；实际 PHP 服务器和两份 WASM 参数也指向解压目录。Core 语言服务器摘要保持 `f60765a40ed94dbe9a85d9692203af9c986c971ba3c834108b1ef1d8abc93375`。

| 原完整反馈检查 | 轮次 | P50 | P95 | 最大值 | 原 P95 门槛 |
| --- | --- | --- | --- | --- | --- |
| 真实依赖项目的标量编辑 | 50 | 60 ms | 77 ms | 1037 ms | 150 ms，通过 |
| 联合类型与数组结构编辑 | 30 | 79 ms | 103 ms | 458 ms | 150 ms，通过 |

慢轮次完整保留。以上证明对应工作流的 P95 达标，不表示所有操作均小于 150 ms，也不关闭复杂 Controller 的原 500/150 ms 缺陷。

完整原流程包含 PHP/Twig 格式化、保存、Undo/Redo、保存时格式化、故障与恢复及设置恢复；YAML/XML/JSON、EditorConfig、Symfony Controller/Twig 上下文亦按原流程执行。实际 PHP 8.5.9、Xdebug 3.5.3 和调试扩展 1.40.1 完成断点、单步、变量 40→42、工作目录核对和会话结束。编辑器内 PHPUnit 三个实际任务的退出码为 0/1/0，测试见证为 42/41/42，含空格参数、运行时、工作目录和任务清理通过。

隔离组合保留原 8 个外部扩展和 TwigPlus 1.3.8 的运行副本，总计 12 个扩展。TwigPlus 的 94 份运行资源与当前源目录相同，其外置依赖指向既有仓库根目录并冻结解析入口；本批没有打包或验证 TwigPlus 发行包。外部扩展资格沿用原隔离工件，不能据本次结果声称正式安装配置或真人体验通过。

104 份测试 JavaScript 与正常编译输出逐字相同。另一份私有启动副本仅移除“真实依赖场景必须使用源码模式”的启动限制，让同一完整场景加载冻结 VSIX；完整测试入口、顺序、断言和 50/30 轮门槛保持。私有观察器只核对加载与资源证据，没有更换为测试子集。生产源码与日常安装配置未改。

首轮实际退出 1，原因是我准备的 TwigPlus 副本遗漏 `vscode-html-languageservice` 依赖。该失败、34636 项输入和资源清理核对及 50 份归档均保留。随后依据源目录实际解析位置补齐依赖，在新的隔离环境执行完整流程；监督器准备阶段的路径错误也保留原日志，不计为测试执行。通过记录属于修正后的独立运行，不覆盖首轮失败。

终态核对确认 34736 项输入及依赖链接保持，驱动、原命令、PHP/Twig 服务器、实际任务进程、进程组和专属显示服务均已结束，测试项目及显示授权目录已清理。73 份原件与归档副本摘要逐一核对；私有启动的唯一改动和最终驱动摘要另行复核。

证据：[实际执行状态](../../../.vscode-test/current-packaged-profile-runtime2-2026-10-14/state.json)、[严格终态审计](../../../.vscode-test/current-packaged-profile-runtime2-2026-10-14/final-audit.json)、[最终准备及归档复核](../../../.vscode-test/current-packaged-profile-runtime2-2026-10-14/final-preparation-and-archive-audit.json)、[归档摘要](../../../.vscode-test/current-packaged-profile-runtime2-2026-10-14/archive/manifest.json)、[首轮失败审计](../../../.vscode-test/current-packaged-profile-2026-10-14/failed-terminal-audit.json)、[结构化报告](current-packaged-profile-2026-10-14.json)。

执行与终态审计完成后，更新了计划、README 和状态三份文档；[文档更新后的复核](../../../.vscode-test/current-packaged-profile-runtime2-2026-10-14/post-documentation-audit.json)确认冻结清单中仅这三份文档发生预期变化，其余 34733 项及 73 归档保持。原执行快照和输入摘要保留，没有用更新后的文档摘要替换原记录。

本批完整组合验证已收口。**未执行**：原 Core/Symfony 独立打包测试入口的全部流程、真人 WSL、远程 CI、正式安装及发布。组合测试与独立包测试的不同入口分别保留；干净提交的 Alpha 候选、复杂 Controller 性能及完整目标继续开放，新增功能暂缓。

后续[当前冻结包的完整独立入口](current-standalone-vsix-2026-10-14.md)已在修正声明 F2 的可见编辑器前提后通过原完整流程和严格终态审计。上述未执行项描述本批组合结束时的状态；两个入口的资格分别保留，真人与远程 CI 仍未执行。

# 当前其余组件完整回归

当前正常构建 `c390c035998872f2ef9066a241cb780eba96f790ac2665517ba1c3170a7a0ede` 的其余 22 套包测试全部通过：54 个文件、733 项，零失败、零跳过。按原包测试入口顺序执行 `pnpm --dir <package> test`，仅增加 JSON 报告参数；未选择单个案例、重试失败或修改时限。

| 包/扩展 | 文件数 | 通过数 |
| --- | --- | --- |
| runtime-probe | 2 | 30 |
| language-spec | 17 | 320 |
| phpdoc | 4 | 86 |
| project | 1 | 14 |
| index | 4 | 68 |
| type-system | 1 | 18 |
| interop | 1 | 4 |
| semantic-provider | 1 | 14 |
| semantic-provider-host | 2 | 16 |
| route-provider | 1 | 3 |
| route-provider-host | 1 | 2 |
| plugin-api | 1 | 2 |
| provider-winstar-routes | 1 | 6 |
| framework-symfony | 6 | 72 |
| provider-symfony-routes | 1 | 14 |
| provider-symfony-services | 1 | 14 |
| provider-symfony-events | 1 | 5 |
| provider-symfony-controller-contexts | 1 | 12 |
| framework-doctrine | 2 | 9 |
| refactor | 1 | 6 |
| testkit | 1 | 5 |
| php-companion-symfony | 3 | 13 |

本轮补齐 runtime-probe、language-spec、PHPDoc、Project/Index、类型系统、Interop、Provider/Host、Framework、Refactor/Testkit 和 Symfony 扩展包的完整测试。已经通过的当前 Parser 244、Semantic 24,098 与 LSP 1,562 项沿用[当前完整LSP记录](unreachable-guard-current-full-regression-2026-10-12.md)，没有再次执行；根 113 项和质量门禁沿用[当前编辑器与质量记录](unreachable-guard-current-editor-gates-2026-10-12.md)。本轮没有执行整条根 `pnpm test` 命令，不宣称它的单次整体运行资格。

运行前核对原当前快照：产品和测试输入保持，差异只允许此前四份状态文档。运行后 30212 个输入及 184 个链接全部保持；独立审计再次核对原始 JSON、所有案例成功状态、实际父子进程退出和 47 份报告/日志/脚本归档。运行 D2388 退出 0，审计 `.vscode-test/d2389-current-component-tests-terminal-audit.json`。

结果完成当前其余组件的自动化回归检查，仍不代替完整版本/平台/Remote/长期会话与真人验收。复杂 Controller 诊断的 500ms 目标继续开放；26 个路线图大项及六个最终检查未关闭。产品源码、日常 Profile 保持，无提交、打包、推送或发布。

[机器报告](unreachable-guard-remaining-component-regression-2026-10-12.json)。

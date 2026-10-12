# 当前构建的真实项目引用六流程资格

2026-10-11。同一正常Core/Symfony构建`8b42a3680a8af156a07b7636a3637537997e66f8e8b4fd0edac4015237ff45f9`，在原固定66079文件真实项目副本上完成原六流程一次严格复测，**5/6通过**。原检查器逐字保持，原1000ms选区及3500ms提前恢复门槛均未调整；测试RPC模式与原基准相同，不作为独立生产模式或编辑器/Remote资格。

| 原流程 | cold引用 / ms | reload引用 / ms | 结果 |
| --- | ---: | ---: | --- |
| normal_reload | 16091 | 1931 | 通过 |
| early_reload | 16168 | 1967 | 通过 |
| early_reload_prewarm | 16237 | 1407 | 通过 |
| source_reload | 5977 | 6911 | 通过 |
| source_selection_reload | 1172 | 未执行 | 原1000ms门槛失败 |
| source_prime_immediate | 6269 | 15933 | 通过 |

全部实际11个阶段均返回188个引用和1个Definition，原完整位置摘要及原URI归一摘要匹配；每阶段原始引用文件SHA256独立核对，原四个继承/vendor锚点保持。失败流程cold语义阶段和结果已经返回，整请求1172ms超过1000ms，检查器退出1，reload未执行；不重跑求绿色，不将其计为完整性能资格。各流程只一次测量，不作P95或跨轮性能改善结论。

两种early_reload在原整阶段日志守卫下通过：实际188结果在Provider前恢复，reload无candidate/容器/路由Provider运行日志，分别1967/1407ms。此结果绑定当前8b构建；[原4/6及后续后台候选失败](winstar-reference-cache-matrix-2026-10-11.md)保留，不能仅凭本轮通过证明唯一历史根因。

66079项目与241工具输入共66320项终态保持；Composer全部路径仍在私有副本内，未执行业务PHP或修改原项目。原driver、checker、服务器及观察到的子进程已结束，六个自有缓存移除。原始结果、所有位置、失败日志、冻结清单、当前工具/运行资产、终态审计及报告共349文件归档。

[机器报告](current-reference-six-mode-qualification-2026-10-11.json)；[终态审计](../../../.vscode-test/d1842-current-reference-matrix-terminal-audit.json)、[归档清单](../../../.vscode-test/d1842-current-reference-matrix-archive/manifest.json)。当前[1514项完整LSP与四项编辑器流程](route-reference-current-full-qualification-2026-10-11.md)、[完整12扩展组合](route-reference-current-full-profile-2026-10-11.md)资格保持，终态另核对90份组合归档。

171编号/14家族、未完成大项26保持。完整六流程因选区性能失败仍开放，F13/P9/R4、其它版本/平台、真实WSL Remote、真实项目长期及人工使用继续；原生产模式、165ms组合和旧C3失败证据保留。日常Profile未更新，未提交、打包或发布。

# 不可达尾部guard当前正常服务器规模验证

正常构建 `c390c035998872f2ef9066a241cb780eba96f790ac2665517ba1c3170a7a0ede` 在Linux PHP8.5/progressive模式下，原1千/1万/5万文件各五轮冷、热索引全部通过。30个实际正常服务器、9000次热completion/hover/definition查询；原生成器、目标/消费者字节、冷索引/RSS/缓存/热查询预算均保持，没有强制GC、预热、筛选或重试。

| 文件数 | 五轮冷索引P95 / 门槛 | 五轮热恢复P95 | 最高RSS / 门槛 | 最高缓存 / 门槛 | 最高热查询P95 / 门槛 |
| --- | --- | --- | --- | --- | --- |
| 1,000 | 2.120s / 8s | 1.686s | 348.66 / 384MiB | 2.57 / 64MiB | 3.26ms / 150ms |
| 10,000 | 16.128s / 60s | 11.869s | 592.34 / 768MiB | 25.75 / 512MiB | 4.52ms / 150ms |
| 50,000 | 74.331s / 300s | 55.216s | 1124.82 / 1536MiB | 128.96 / 2560MiB | 3.95ms / 150ms |

五轮索引P95按原最近秩为五轮最大值，热查询每方法/每阶段100次的P95按第95个有序样本核对。所有冷索引缓存命中0、热恢复全部文件命中，热恢复manifest不变；每阶段项目文件数、精确结果、正常argv/WASM、优雅退出、wait4线程峰值RSS与缓存实际字节独立核对。

首次精确completion在索引就绪等待前请求，各阶段五轮最高首次响应P95为2976.75ms；热查询最高P95为4.52ms。原规模门禁未给首次查询另定门槛，本次不能据热查询结果声明冷查询或编辑诊断预算达标。

峰值内存为1124.82MiB（约1.10GiB）。wait4覆盖实际服务器线程直至退出，驱动、生成器与编辑器UI内存不在此范围。

每规模显式maxFiles与样本数一致，progressive按原工作负载排除依赖索引，complete=false按此语义断言；不作为默认10k限制、完整vendor索引、其它模式/平台、真实项目诊断或长期稳定性资格。所有临时生成项目及自有进程组均清理。

独立审计复核31684个输入、185个链接和两仓状态，30服务器终态与201份归档摘要全部核对。原始证据 `.vscode-test/d2383-*`，审计 `.vscode-test/d2384-current-production-server-scale-terminal-audit.json`。

同构建的[完整LSP1562](unreachable-guard-current-full-regression-2026-10-12.md)、[质量及四编辑器流程](unreachable-guard-current-editor-gates-2026-10-12.md)、[12扩展组合与25轮普通编辑结果](unreachable-guard-current-composite-performance-2026-10-12.md)保持。179编号/14家族、26大项与完整性能/版本/平台/Remote/长期/真人验收继续，日常Profile未更新。无提交、打包、推送或发布。

[机器报告](unreachable-guard-current-server-scale-2026-10-12.json)。

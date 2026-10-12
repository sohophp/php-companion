# 当前正常服务器的规模与内存验收

2026-10-11，正常构建`169e923bda8dd948a37d65f4c78c74c733a63789350966c5b66babafdce0a9fe`。

原实际生产服务器工作负载逐字复制，使用当前正常八项JS/WASM及当前testkit。固定原1k/10k/50k语料、PHP8.5/progressive，每规模五轮；每轮独立fixture/cache，冷服务器自然退出后同缓存启动新暖服务器。15完整流程/30服务器全部通过，没有复跑失败样本、testMode、profiler、强制GC或查询预热。原fixture consumer/target摘要及所有预算逐轮核对。

| 文件数 | 完整冷/暖轮数 | 冷/暖索引P95秒 | 冷/暖最高RSS MiB | 原RSS门槛 MiB | 最大缓存 MiB |
| --- | --- | --- | --- | --- | --- |
| 1000 | 5 | 2.17/1.75 | 348.37/350.80 | 384 | 2.57 |
| 10000 | 5 | 16.49/11.71 | 608.66/494.57 | 768 | 25.77 |
| 50000 | 5 | 75.29/56.75 | 1142.27/1111.93 | 1536 | 128.93 |

各组五样本P95采用原testkit最近秩算法，等于最大样本。索引时间来自服务器index start/end；首个精确补全另记，约2.9–3.2秒，不能解释成编辑器可见时间。随后每阶段每方法100个原热请求，补全/Hover/Definition共9000次，最高单轮热查询P95为3.64ms，低于150ms。原冷索引8/60/300秒、RSS384/768/1536 MiB和缓存64/512/2560 MiB保持。

冷缓存命中零、暖命中全部项目文件，完整项目/引用事实就绪、查询结果、源码不变与暖manifest逐字不变均验证。显式maxFiles与每组语料规模一致；这不代表默认10k限制下完成50k索引。progressive按产品设计排除依赖，complete=false保留，不能作为完整vendor索引资格。

RSS使用实际服务器自然退出后的Linux wait4 high water，覆盖初始化、worker线程、首次/热查询与shutdown；父驱动和语料生成内存、独立进程并发总量及编辑器不在该范围内。此处与原包API四阶段同进程/独立worker矩阵分别保留，历史失败不撤销，也不由不同快照直接作改善结论。

独立终态核对31592输入、链接、两仓、15驱动、30实际服务器及observer/进程组；所有fixture已移除。201证据文件归档并逐项核对摘要。原始数据见`.vscode-test/d2207-current-production-server-scale-run.json`；独立审计与归档为`d2208-current-production-server-scale-terminal-audit.json`及`d2208-current-production-server-scale-archive/manifest.json`。

当前完整真实Controller连续诊断500ms/编辑150ms、当前长期会话、Windows/其他平台/WSL Remote、完整工具及真人验收仍开放；此矩阵仅获得当前Linux PHP8.5/progressive生产服务器规模范围的资格。原176编号/14家族和26未完成大项保持，正常源码未因本验收修改，日常Profile未更新。

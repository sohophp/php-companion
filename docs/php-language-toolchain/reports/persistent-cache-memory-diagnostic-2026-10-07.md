# D288：持久缓存四阶段内存观测

日期：2026-10-07。本次仅采集诊断，**不作为时延或 RSS 资格，也没有产品改动**。原未插桩 10k 完整基准 **1003.52／768 MiB 失败**保持。

D284 整轮 LSP 一项警告失败后，原 D285 依赖任务按门禁跳过，该记录未改写。D287 原完整生命周期文件 36／36 结束后，本次独立运行 parser／index／semantic 组件；不运行 LSP，也不把它作为整轮通过。四项组件／原基准哈希与 D281 正式测量相同，源代码和两仓／运行时输入均冻结保持。

原四次完整加载、Doctrine、19999 个 deferred callable、聚焦四文件及仅 Consumer::inspect、派生失效、两种损坏各重解析一个文件、恢复后补全／构造事实全部通过。原同进程序列、预算、并发及清理保留；只加 50 ms 内存采样、阶段标记、四类实际 Map 大小、V8 heap space 与自然 GC 观察。总计 766 个周期样本、327 条 GC，均无截断、无强制 GC。插桩进程峰值 911.71 MiB，仍超 768，退出 1；与原 1003.52 不作配对比较或改善结论。

| 标记 | RSS MiB | heapUsed MiB | heapTotal MiB | external MiB | arrayBuffers MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| load1:end | 290.38 | 163.67 | 195.07 | 38.78 | 4.93 |
| load2:end | 577.07 | 455.13 | 483.84 | 34.44 | 0.59 |
| mutation1:after-stringify-write | 682.91 | 208.42 | 441.7 | 88.52 | 54.66 |
| load3:end | 572.28 | 179.75 | 247.8 | 53.34 | 19.48 |
| mutation2:after-stringify-write | 801.39 | 404.72 | 443.94 | 96.31 | 62.46 |
| load4:end | 617.76 | 267.1 | 386.11 | 43.27 | 9.43 |
| process:exit | 608.49 | 254.47 | 376.83 | 34.73 | 0.72 |

arrayBuffers 是 external 的组成部分，不能相加。周期采样可能漏掉同步 parse/stringify 的瞬时峰值；过程 maxRSS 与阶段标记分别保存。

四个 load 末尾的 trees Map 均为 0，和 `SemanticWorkspace.update` 默认 `retainTree=false` 一致；每次 dispose 后观测的 files／trees／deferredImplementations／deferredSources 均为 0。撤回此前“冷索引保留所有文件 AST”的假设；不能据此排除所有其它对象保留。

热恢复及整份 manifest 的读写／后续恢复伴随明显 heapUsed／large-object space 增长，随后自然 GC 又显著降低已用堆；RSS 与已用堆不是一一对应。数据支持继续核对整份缓存的临时分配与恢复对象生命周期，尚不能区分可达对象、待回收垃圾、分配器驻留和泄漏各占多少，不据此认定唯一根因。既有流式／压缩／分文件方案的失败保持，不重复等价试验。

完整原始采样、GC、标记和脚本／输入归档 `.vscode-test/d288-memory-profile-evidence`，附各项 SHA-256；详见[机器报告](persistent-cache-memory-diagnostic-2026-10-07.json)。原大 Controller 150 ms、10k／50k 内存、当前完整 LSP、平台／完整工具组合／长期／真人 WSL 及全部 C1–C4／R4、P0–P9／F01–F14 继续开放。结构复制私有原型尚未执行，未提交、打包、更新 Profile、推送或发布。

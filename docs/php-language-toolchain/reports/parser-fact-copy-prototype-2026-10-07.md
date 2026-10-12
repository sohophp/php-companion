# D286：嵌套事实复制的私有原型

日期：2026-10-07。**仅私有原型，正式 parser／Core 未改**。完整数据见[机器报告](parser-fact-copy-prototype-2026-10-07.json)。

原型只把 cloneDocumentFacts 中嵌套事实的 structuredClone 换成 plain-object／array 图复制，保留现有标量类别复制。WeakMap 保留对象共享／循环、undefined、数组空位和安全 own __proto__；非普通值整体回退原生克隆。用于当前 typed fact records，不声称可替代任意带 getter 的外部对象。私有编译副本反向替换能逐字节重建原 dist，与此前撤回的序列化一次／独立解码方案不同。

90 份既有 PHP fixture、归档真实 Controller、32 项 Trait 文本边界及两份隔离／恢复输入，共 125 份。冷／增量／warm／声明事实、AST、错误、范围及 own undefined 对照 1500 次，返回数据被调用方修改后的缓存隔离 750 次，全部通过。只证明本组事实一致性／所有权，不替代完整 parser／semantic／LSP 或编辑器资格。

在同一进程按 AB／BA 交替六轮，每块 25 次预热＋100 次测量，逐次在计时区外断言事实与错误。每个版本／输入／模式各 600 个样本，自然 GC，无强制 GC。计时是 public parser 调用，不包含 LSP 和编辑器。

| 输入／模式 | 原版合并 P95 ms | 原型合并 P95 ms | 原型单轮 P95 变差 |
| --- | ---: | ---: | ---: |
| archived-real-controller／warm-cache-copy | 9.236 | 4.401 | 0／6 |
| archived-real-controller／incremental-edit-and-copy | 85.305 | 80.980 | 2／6 |
| nested-declarations／warm-cache-copy | 0.081 | 0.039 | 0／6 |
| nested-declarations／incremental-edit-and-copy | 0.616 | 0.611 | 3／6 |
| trait-and-unfinished-input／warm-cache-copy | 0.150 | 0.064 | 0／6 |
| trait-and-unfinished-input／incremental-edit-and-copy | 0.891 | 0.729 | 3／6 |

缓存读取的六轮 P95 均降低，但大 Controller 增量两轮 P95 变差；小输入也有变差轮次，nested warm 最大值 0.142→4.954 ms、Trait incremental 最大值 3.998→7.234 ms，全部保留。合并数据不证明统计显著性或普通编辑已满足 150 ms，过程 RSS 也不作规模资格。

两轮原始样本、输入／日志／脚本、原版及私有副本、90 份既有 fixture 和归档 Controller 位于 `.vscode-test/d286-fact-copy-evidence`，机器报告附 SHA-256。下一步先冻结最新正常 Core 的原五组普通编辑基线，再决定是否进入正式源码候选，逐项保护旧 PHP、真实文件及未完成输入；不因微基准收益直接采用。

D284 原完整 LSP 一项警告失败、原 1003.52／768 MiB 和历史大 Controller 173.01 ms 仍开放；D288 内存观测不替代预算。全部 C1–C4／R4、P0–P9／F01–F14 范围保持，未打包、更新 Profile、提交、推送或发布。

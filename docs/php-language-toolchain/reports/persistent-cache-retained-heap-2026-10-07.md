# D300–D302：持久缓存保留对象诊断

日期：2026-10-07。正常 Core `079ffa1b`；产品与原基准未修改。**本报告是诊断，不是性能或规模资格通过**。完整原始结果、路径、哈希及范围见[机器报告](persistent-cache-retained-heap-2026-10-07.json)。

## 首轮采集失败与修正

D300 原进程 42.98 秒退出 13，4231 项冻结输入审计零变化；第一份快照 JSON 已完整写出，但 `pipeline` 等待未结束，后两次恢复未执行。原失败保留，不计完整诊断。小样本观察到 source end、输出 finish／close 均完成，而 source closed=false，同样退出 13。[Node 22.14 实现](https://github.com/nodejs/node/blob/v22.14.0/lib/internal/heap_utils.js#L40-L58)的 HeapSnapshotStream `_destroy` 没有完成 close 回调；[退出码 13](https://nodejs.org/download/release/v22.14.0/docs/api/process.html#exit-codes)表示顶层 await 未解决。这是本诊断采集器的问题，不推断为产品缓存故障。

D301 仅修正私有写入器：保留有界流和禁止覆盖，等待输出文件 close，同时检查 source 已 end、输出已 finish。小样本的完整 JSON／实际字节／0600、1 字节硬上限拒绝及已存在文件拒绝通过。原 benchmark 通过移除私有插桩可逐字重建，SHA-256 保持 `914df37d4d0b1c435a66eb8435faa80da87efa61f8f8b52b34b1beb213f92aef`。

## 完整序列与对象结果

独立运行 65.76 秒退出 1；**原四阶段功能断言全部通过，但原 RSS 判定仍为失败**。4234 冻结输入、两仓／正常构建／Node／九份实际 PHP CLI 均无变化；期间没有并发测试、构建、宿主或基准。10k 冷解析、10k 热恢复且零解析、三 Callable 事实、聚焦四文件加载，以及两种损坏各只重解析一文件与结果恢复均通过。

| 结构匹配／观察 | warm dispose 前 | warm dispose 后 |
| --- | ---: | ---: |
| SemanticFile 形状 | 10000 | 0 |
| 声明快照形状 | 10000 | 0 |
| 延迟实现快照形状 | 9996 | 0 |
| 缓存 entry／payload 形状 | 0／0 | 0／0 |
| SemanticWorkspace 对象 | 2 | 2 |
| 显式 GC 后 heapUsed | 123.55 MiB | 13.01 MiB |
| 快照文件 | 163.77 MiB | 13.32 MiB |

被选文件的快照路径经过 workspace.files，延迟实现经过 workspace.deferredImplementations；dispose 后这些形状均不再出现。两份 workspace 对象本身仍被基准的栈／上下文引用。剩余较大节点包含 32 MiB WASM backing store 和语义模块源码，不能据此称为异常保留。

结构匹配不等于构造器证明；这里只分析选择的路径，最短路径不是独占保留者／dominator。节点 self size 不包含保留子图，也不能折算为 RSS 节省。这份合成样本支持“所检查的语义数据可在 dispose／GC 后回收”，不证明整个产品无泄漏。

## 边界与后续

按[Node V8 文档](https://nodejs.org/download/release/v22.14.0/docs/api/v8.html)，queryObjects 会在 full GC 后观察，堆快照也会改变内存和事件循环行为。本轮两次主动 GC 和快照序列化使耗时／RSS 不可与未插桩基线比较。诊断原输出为 **1156.79／768 MiB 失败**，不作为新正式规模数值；此前未插桩完整 10k 的 **1003.52／768 MiB 失败**保持。

下一步转向整份缓存读取、恢复与损坏重建期间的临时分配／峰值叠加，用独立分配栈采样区分路径；不把上述观察写成唯一 RSS 根因，不重复失败的分文件存储／压缩候选。普通编辑 **150.30／150 ms**、50k、其它平台／版本／完整组合／长会话／真人，以及全部 C1–C4／R4、P0–P9／F01–F14 继续开放。

证据位于 `.vscode-test/d302-retained-heap-evidence`。两份完成快照各低于 512 MiB，复核期限 2026-10-09T12:20:43.649Z。首轮快照在完整 JSON 检查和 gzip 解压 SHA-256 一致后无损归档，原日志／输入／退出码／未完成 manifest 保留；不自动删除其它资产。未提交、推送、打包、更新 Profile 或发布。

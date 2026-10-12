# D303–D304：完整缓存序列的分配栈采样

日期：2026-10-07。正常 Core `079ffa1b`；产品与原 benchmark 未修改。**仅诊断，不新增性能或规模资格**。详见[机器报告](persistent-cache-allocation-stacks-2026-10-07.json)。

## 原序列与采样范围

在 D300–D302 的对象回收观察后独立执行，原同进程 10k 冷加载、热恢复、两种完整 manifest 损坏及各自恢复全部保持，原断言／预算／清理不变。移除私有包装可逐字重建原脚本 SHA-256 `914df37d4d0b1c435a66eb8435faa80da87efa61f8f8b52b34b1beb213f92aef`。

通过 Node 22.14 实际 Inspector 的 HeapProfiler.startSampling 设置 65536 字节平均间隔，并保留 Major／Minor GC 已回收对象的采样。这两项参数在[该 Node 自带 V8 协议](https://github.com/nodejs/node/blob/v22.14.0/deps/v8/include/js_protocol.pdl#L718-L738)中明确区分临时分配与存活对象；没有调用 collectGarbage、queryObjects 或堆快照。实际协议探针通过，再运行完整序列；采样器本身仍会改变性能／内存，不能作为正式预算测量。

完整进程 45.05 秒退出 1，原功能断言全部通过，RSS 原判定为 **826.66／768 MiB 失败**。4237 输入、两仓与构建、Node／九份实际 PHP CLI 保持，改变 0 项；没有并发测试、构建、宿主或性能测量。

## 分配位置

获得 55759 个统计样本、1200 个调用树节点，profile 2665665 字节。节点 selfSize 合计约 4309.94 MiB，代表全序列累计统计分配归属，**不等于精确分配字节、同一时刻存活内存或 RSS**。

| 合并函数的独占采样 selfSize | 累计统计归属 |
| --- | ---: |
| `indexComposerSources` | 435.58 MiB |
| `mutateCacheFile` | 387.15 MiB |
| `write` | 272.85 MiB |
| `recordChecksum` | 258.02 MiB |
| `unmarshalNode` | 209.36 MiB |
| `add` | 207.24 MiB |
| `validDeferredImplementation` | 203.35 MiB |
| `commitCache` | 171.78 MiB |
| `createFromString` | 163.96 MiB |
| `restoreDeclaration` | 144.05 MiB |

按可见同步调用栈，声明恢复组约 1092.08 MiB（25.34%），其中 validDeferredImplementation 函数自身约 203.35 MiB；该路径还包含集合、范围、排序、语义文件和延迟访问器的分配。原基准 mutateCacheFile、整份索引函数、字符串解码、校验序列化等均占有明显份额，不能只把一个路径称为峰值根因。

indexComposerSources 自身的统计值不能全部写成 JSON.parse；读取／解码位于异步边界后的独立栈，无法完整回溯调用者。分组保留未分类运行时分配。函数 inclusive 值互相重叠，禁止相加。

## 决策与边界

下一项先对声明恢复的验证器做私有等价与分配对照，检查空字段循环、临时 records 包装和重复集合分配；只有得到有区别的证据才进入产品。范围所有权、事实排序、Callable 身份、校验和及两类损坏拒绝必须保持。不重复已失败的分文件存储／压缩方案，不把强制 GC 接入产品。

原正式完整 10k **1003.52／768 MiB**、普通编辑 **150.30／150 ms** 仍失败。本采样没有证明性能改善，也不关闭 50k、其它平台／版本／完整工具组合／长会话／真人及全部原 C1–C4／R4、P0–P9／F01–F14。证据归档 `.vscode-test/d304-allocation-evidence`，逐项附 SHA-256。采样文件上限 32 MiB，复核期限 2026-10-09T12:28:23.204Z；不自动删除其它资产。未提交、推送、打包、更新 Profile 或发布。

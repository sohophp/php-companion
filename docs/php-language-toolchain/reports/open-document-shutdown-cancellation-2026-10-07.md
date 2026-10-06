# D160：文档重放与关闭取消

## 原失败与根因

D159 原完整 C1 在根 Composer 生命周期退出 1；定向宿主也失败。第一次捕获脚本没有进入 Extension Host，且原探针存在 Thenable 类型检查错误，这些工具问题保留，不作为产品资格证据。修正后的直接 stderr 仍只有 146 KB 的压缩源码行；独立异常监视器用 `uncaughtExceptionMonitor` 同步保存错误对象，没有处理或改变异常退出。

失败产物 `b8158652` 的真实异常为 `origin=unhandledRejection`、`message=SoPHP is shutting down.`。逐字节匹配正式产物的 source map 指向 `semanticForQueryRoot` 的 RequestCancelled、`semanticForUri` 和 `onDidOpen`。原始 stdin 包含初始化、两份保留文档的 didOpen、配置变化和 shutdown：新的进程在重放文档时再次关闭，尚未完成的通知任务拒绝了。TextDocuments 不等待这些异步事件回调，因此拒绝成为进程级异常。不能把这次故障归因于 Trait 预检。

## 源码与定向证明

- `trackOpenSourcePublication` 只在服务器正在关闭且错误确实是 RequestCancelled 的 ResponseError 时结束任务；保留 finally 释放文档屏障。普通查询取消和其它错误继续原流程，产品没有新增全局异常处理器。
- 增加仅 testMode 生效的暂停点和取消观测，强制文档重放／修改与关闭交错。覆盖 open／change、onDemand／progressive、PHP 7.2／8.5，八种组合在两项测试内执行。加强后的断言必须观察到释放暂停任务之后的新取消记录。
- 原处理的两项定向检查失败；这一工具批没有独立冻结 hook-only bundle，实际根因以已冻结异常宿主和映射为证。修复后完整关闭文件 **10／10、零跳过**；加强断言后两项／八组合通过，另外八项在该定向调用中有意不执行，已由完整调用证明。加强的是测试断言，产品源码与宿主测试产物未变化。
- 保留一次准备错误：修改命令使用错误 cwd，修改没有生效而 shell 继续跑了原十项。该重复不作为另一解法或挑选通过样本。语言服务器构建、正式 bundle、根 TypeScript 与限定 ESLint 通过。

## 原完整 C1 与最终普通性能

正式最终 bundle：`d53779903dbc901a868d94aa05ead1a2f2bab9882a7b0abfe6b7639d346cce66`。

原完整普通 C1 **退出 0，116.30 秒**，3222 个输入、HEAD、工作树、六个 CLI 和 Node 到终态保持。没有启用补全计时／trace 或异常监视器。嵌套 Composer 8.1 → 8.5 → 8.1 → 8.5，以及根 CLI 7.2 → 创建 8.1 → 删除 7.2 → 恢复 8.1 均通过；保留根文档 version 1 在重启后重新打开，最终诊断和状态通过原等待断言。补全、导入、未保存接收者切换及快速编辑也通过。

可见跨命名空间类型六次样本中位数 274 ms、最大 327 ms。该值包含输入和编辑器呈现，不能当成服务器热查询。renderer 有五条错误：两条 Copilot proposals、一条 url.parse 弃用、两条重启期间通知发送失败；此轮 `getItemsByProvider` 出现零次，不因此关闭批量 renderer 或所有重启通知错误。

继续使用 D159 的同一 242801 字节夹具，每版本一次串行 100 轮普通编辑，不与其它测试／构建并行，不采 CPU／GC／RSS。最终产物测量：

| PHP | P50 | P95 | 最大 |
| --- | ---: | ---: | ---: |
| 7.2 | 97.62 ms | **141.69 ms** | 383.36 ms |
| 8.5 | 97.96 ms | **138.40 ms** | 197.38 ms |

两版 P95 均低于原 150 ms 门槛；首项、共享候选、磁盘原文及引擎哈希检查通过。该门槛仅在这个固定夹具通过，不证明其它项目、所有请求或长会话性能。

## 收口与下一步

D159 的 ASCII Trait 预检与本次重启取消处理共同形成源码里程碑，保留所有原失败记录。[结构化证据](open-document-shutdown-cancellation-2026-10-07.json)包含冻结摘要、原异常、映射、测试、宿主和普通性能来源。

下一步运行整个当前 LSP 组合，保留原用例和预算。普通项目／长会话、50k cache RSS、裸 `$` 说明、批量 renderer 与重启通知错误、缺失 CLI／其它平台及真实 WSL 长使用仍开放；原 C1–C4／R4 不缩减。Goal active；未打包、更新 Profile、推送或发布。

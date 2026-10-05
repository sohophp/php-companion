# D90 闭包补全的函数声明查找成本

日期：2026-10-05；基于 `34c15010`。收口 D88 另一处可重复超时的独立源码改进。

## 证据与修改

原 stdio 测试 `serves contextual closure parameter completion and definition from a unique PHPDoc callable` 保持 15 秒超时及全部补全、跳转、诊断断言。D88 完整运行与单独复现均超时；D89 的引用影响快速证明尝试无效并撤回。

本次使用仅连接测试所拥有服务器进程的 loopback Inspector WebSocket，采样 10,647 次，保留原测试超时。主线程仍在 `publishDocumentDiagnostics`，其闭包类型推断反复进入函数签名查找，扫描大内建文件中的全部 callable。请求 64 附近的近似采样窗口包含 719 个样本，叶节点热点是 `signaturesWithImplementation` 中全声明 `flatMap`。采样起点与请求时间为近似对齐，保留 150 ms 边缘余量，不能当成准确请求耗时或正式性能门槛。

最初 NODE_OPTIONS 及 Worker Inspector 采样未产出有效 profile；Worker 停在 Profiler.enable。随后改用独立 WebSocket driver 成功，两个失败方式不作为 CPU 证据。采样方式依据 [Node Inspector 文档](https://nodejs.org/docs/latest-v22.x/api/inspector.html)。所有临时测试追踪、inspect 参数均已撤回，原 stdio 源文件 SHA-256 保持。

产品改动只给声明数组建立 WeakMap 索引，按小写 FQCN 保存**所有**函数声明及其顺序；不将方法混入函数。签名与函数声明查找复用该索引。源码修改、快照恢复或声明替换产生新的数组，自然重新建立索引；旧数组可回收。实参兼容、上下文推断、返回类型、歧义规则、取消与原超时保持。

## 验证

- 原始、无采样的闭包 stdio 场景在 **9.55 秒**通过，未修改 15 秒门槛或断言；其它 530 项被过滤。它包含完整上下文参数、箭头／闭包结果、跳转及原诊断要求。
- 新增七项语义，覆盖 update／restore／restoreDeclaration、保留／临时树、大小写 alias、同名方法与其它 namespace 排除、重复声明及顺序、重命名、删除和重新加入。与既有引用影响、恢复签名组合共 59 项通过。首次新文件因括号笔误在采集前失败，修正后通过，既有 52 项在首次运行已经通过。
- 完整语义 **109 文件／2450 项全部通过**，零跳过，60.85 秒。115 份 TypeScript 源码／测试摘要在运行前后保持。此总耗时不是跨环境性能改善承诺。
- 当前生产 bundle 的隔离 Linux VS Code，四种内建／自定义箭头和闭包场景各 Enter／Tab，共八次可见候选、词中接受全文、光标、Undo/Redo、磁盘保持通过。可见等待 142–304 ms，来自预加载后的显式触发，不算真实 WSL 或自然输入验收。
- 八份实际接受文本通过 PHP 8.5.9 语法检查，未执行代码；语义／服务器与生产构建、Extension Host 类型检查、限定 ESLint 和 diff 检查通过。

## 后续门槛

D88 完整 LSP 仍是 898 通过／2 失败的历史结果；D89 XMLReader 和本次闭包场景分别通过，**不能拼接为完整绿色**。下一步运行当前完整组合，保持原 15 秒与 150 ms 门槛。D86 大文件普通连续编辑 P95 199.82／153.37 ms 仍开放；本次闭包夹具与可见等待不能代替它。规模、长期／峰值内存、其它平台和真实 WSL 继续单列。

本批本地源码提交，未打包、更新 Profile、推送或发布，goal active。摘要、CPU 热点、原始回归统计及完整接受文本见 [结构化证据](completion-function-lookup-cost-2026-10-05.json)；CPU 原始 profile 保留 `/tmp/sophp-d90-external.cpuprofile`。

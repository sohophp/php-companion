# D70 连续输入时重新计算补全匹配

日期：2026-10-05。前检查点 `a6bc9581`。本批修改 Core 补全响应与隔离验证；不增加补全类别或产品设置。

## 问题与修复

实际 progressive 自然输入在 `Sh → Ot → Sh → Sho` 的最后一步失败：正文已为 `new Sho;`，弹窗仍有 ShortCurrent、ShallowCurrent、SessionHandler，持续到原 10 秒截止。服务端针对 Sho 的匹配已经排除后两项；旧完整列表允许编辑器继续使用自己的模糊匹配，且 initials 候选的 filterText 绑定旧前缀。候选搜集的完整性不能代表后续输入可复用这一列表。

类型、函数、常量的通用响应，以及成员响应，现在保留 `isIncomplete: true`，使继续输入重新取得服务端匹配结果。匹配算法、候选内容、排序、插入文本和声明过滤保持。独立 Provider、声明名称、变量和数组键的各自返回分支不由本批统一改为不完整。[LSP 官方 CompletionList 约定](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/language/completion/)允许服务端通过此标志要求继续输入时重新计算。

## 验证

| 范围 | 实际结果 |
| --- | --- |
| 新协议回归 | onDemand／progressive × 配置 PHP 7.2／8.5，4 项／84 个未保存状态通过；类型、表达式中的函数与常量、成员；包含空前缀、收窄、替换、恢复、大小写及 initials；磁盘保持 |
| 原有协议 | 165 项相关协议初次组合为 159 通过、6 项仍按数组读取失败；全部 47 项适配场景复测为 44 通过、3 个剩余读取点失败；最后这 3 项各复测通过，涵盖原 6 项及新增 4 项。命名用例并集 169 项已有通过记录；产品源码／bundle 相同，各阶段关键输入均保持，最终集合名称与 collection 一致。此为分段组合，未请求项不计通过，不是一次完整 LSP |
| 自然 UI | Linux VS Code 1.140.0，配置 PHP 8.5；onDemand 与 progressive 各 12 流程／39 次可见检查／11 次完整接受，共 100 条观察；无 Provider 预热或手动 triggerSuggest，零指定 getItemsByProvider 异常 |
| 可见等待 | onDemand 可见列表观测 15–336 ms；progressive 8–323 ms。列表隐藏检查另包含 500 ms 稳定观察；均不等于热查询延迟 |
| 原热查询门槛 | 魔术名称 PHP 7.2／8.5 P95 20.74／30.40 ms；注释赋值 92.19／112.39 ms；每组 20 热样本、原 150 ms 断言通过。只代表固定文档 |
| 工程 | 定向 ESLint、语言服务器 TypeScript、宿主 TypeScript、diff 空白检查通过 |

原 135 项首次结果为 123 通过、12 失败；随后 165 项结果仍有 6 个旧读取点失败（带超时实参、数组结构断言或经 helper 返回）。47 项适配场景的三个剩余点为缓存整条响应的 .result 或用变量保存期望数组，最后 3 项复测通过；所有失败点均按数组读取补全返回；原 payload 已含期望候选。改为读取标准 CompletionItem 数组或 CompletionList.items，保留原数组内容、顺序、编辑范围与负例断言。共 183 个 transport 包装，覆盖 46 个用例声明；去掉包装及 helper 后，测试全文 SHA-256 与前检查点逐字一致。新 84 状态另明确要求重新计算标志为真，不通过删断言适配本批。

## 隔离模式的证据边界

C1 编译宿主原本会强制 folder onDemand；首次临时脚本还引用了错误的 path_1。纠正 folder 后发现 workspace 全局设置仍是 onDemand；仅 folder 为 progressive 的一次绿色不能作为实际 progressive 资格。可复用脚本现在同时设置隔离 folder 与临时多根 workspace 设置，开始及成功终态均核对两层配置；源码初始化按 workspace 全局配置读取模式。原 C1 宿主及已安装用户设置没有修改。

协议夹具的 progressive 准备信号是 Reference source facts ready，原先等待 complete=true 导致夹具超时；纠正为实际就绪信号后执行所有状态。本批不把该信号解释为完整引用索引。原产品 UI 失败、成功全量可见状态、模式证明、精确接受文本、84 个协议状态、断言还原证明、原始日志摘要及当前源码／bundle 摘要见 [结构化证据](completion-progressive-matching-2026-10-05.json)。

## 保留边界与后续

D69 的完整 59 文件／875 项 LSP 绑定此前产品，不能作为改变响应后的 D70 完整组合。D69 99 文件／2054 项语义记录保留，本批语义源码与产物未变；本批没有重新运行完整语义。D65 普通连续编辑 P95 243.40 ms 仍开放；其余实际 CLI、其它平台／规模／长期会话与真人 WSL 尚未由本批证明。

收口本地源码里程碑；不打包、更新 Profile、推送或发布。下一项核对当前完整 LSP 的响应兼容边界，再处理已有冷类型读取期间关闭候选缓冲区及磁盘替换的独立复现；不增加补全类别。goal 保持 active，等待用户明确暂停后进入真人测试。

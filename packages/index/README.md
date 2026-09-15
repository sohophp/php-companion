# @php-companion/index

受资源预算和取消信号约束的 Composer PHP 源码扫描组件。扫描始终先完整收集根项目源码；项目自身超过文件数或总字节预算时拒绝发布部分项目索引，单个项目文件超出大小预算、无法读取或无法分析时明确报告 `projectComplete=false`。依赖超限或无法处理时保留完整项目正向事实，并报告全量 `complete=false`。扫描遵守根包及依赖各自的 exclude-from-classmap 规则，可复用版本化持久快照；单条缓存恢复失败会回退到源码重建。组件不依赖 semantic 或编辑器 API，调用方决定快照内容，并可注入路径到 URI 的映射以保持 Remote 编辑器身份。

`DocumentKeyIndex` 提供无 IO 的精确 key → document URI 倒排表。单文档替换、删除、清空和统计均为独立 API；替换会先验证键长与单文档键数预算，超限时保留旧 postings，调用方可把该文档放入保守回退集合，避免不完整候选产生假阴性。组件只管理候选身份，不解释 PHP 名称或决定语义相等性。

`DocumentDependencyGraph` 提供按文档原子替换的反向依赖图。节点和边受独立预算限制，同一逻辑节点可由多个文档贡献；删除一个文档不会误删其他贡献。调用方可持久化确定性 `documentNodes()` 结果，并用 `directDependents()` 自行执行有界传递闭包。

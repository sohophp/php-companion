# 只读局部遍历的根包装对象重复展开成本

2026-10-14。结论：**成本调查及独立终态核对通过，达到私有正确性原型调查门槛。尚未实施缓存，未取得性能准入。** 正常 b403 源码和第三方 SDK 保持。

只观测一次同步 `incompatibleArguments` 内原 `firstLocalSyntax` 的两个既有内部调用。原根节点、谓词、遍历顺序、节点/深度预算和命名子节点 getter 计算及返回全部保留。以 Tree 对象、根节点 ID 和位置区分重复根包装对象；只计入重复根遍历中不同包装对象的首次命名子节点展开，已有同对象缓存命中另列。

两侧各四次固定真实 Controller 未保存编辑的完整诊断及可见补全摘要一致。每次编辑合计本地及完整检查：1502 次遍历，其中 1500 次使用重复根的新包装对象；重复首次展开 25122 次。重复展开耗时分别 128.19、131.51、110.97、108.28 ms，中位数 **119.58 ms**，超过预定 50 ms。根位置/子节点形状变化、上限截断和同对象再次首次展开均为 0。

这与已否定的[子节点描述重建缓存](argument-child-expansion-prototype-2026-10-14.md)不同：后者每次仍创建独立数组和 Node，收益不足。新的待验证边界仅允许内部只读遍历保留包装对象，使 SDK 自带对象内缓存发挥作用；不改全局 getter，不改谓词、裁剪算法或预算，不重开单对象 getter 外提、字符筛选和范围裁剪的旧方案。源码有根对象身份比较路径，必须排除全局根共享。两个既有谓词仅读取位置、类型及字段节点；返回节点的内部调用者保持只读。

已执行并通过：两侧正常构建和原四编辑命令退出 0；独立终态审计退出 0。3316 产品/测试、66079 项目、11 准备及 30 私有输入保持，控制八资产与正常产物逐字一致；所属进程组、驱动和服务器结束，两份性能缓存清理，34 份原件和归档副本摘要核对通过。源码反向核对确认原 getter 和遍历方法体保留。

资格限 Linux/Node22/PHP8.5/onDemand 的原真实 Controller 工作流。观察器计时和四次编辑不构成 P95 性能资格，完整输出一致也不单独证明包装对象共享等价。后续须先证明内外层作用域、Tree 编辑/删除、总保留节点上限及预算耗尽时的原计算，再完成语义/协议和原 25 轮准入对照；失败则结束该假设。原 500/150 ms、真人 WSL 和远程 CI 缺口继续开放，功能扩展暂缓。

证据：[预定门槛](../../../.vscode-test/argument-root-traversal-cost-2026-10-14/admission.json)、[实际原命令](../../../.vscode-test/argument-root-traversal-cost-2026-10-14/supervisor-state.json)、[原始分析](../../../.vscode-test/argument-root-traversal-cost-2026-10-14/analysis.json)、[源码核对](../../../.vscode-test/argument-root-traversal-cost-2026-10-14/getter-source-audit.json)、[独立审计](../../../.vscode-test/argument-root-traversal-cost-2026-10-14/final-audit.json)、[归档](../../../.vscode-test/argument-root-traversal-cost-2026-10-14/archive/manifest.json)、[结构化报告](argument-root-traversal-cost-2026-10-14.json)。

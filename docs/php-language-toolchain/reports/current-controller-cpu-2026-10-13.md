# 当前复杂Controller的CPU采样

2026-10-13。正常Core f60765a4使用Node内建--cpu-prof，在固定真实项目、PHP8.5/onDemand、原正常stdio流程中执行四编辑。没有改变诊断规则或实现，也没有加载Getter观察器。

已执行并通过：与未采样正常25轮的前四轮比较，完整诊断及可见补全摘要逐项一致；1012产品及66079项目输入保持，磁盘未改，服务器/驱动退出、缓存清理通过。采样覆盖服务器启动、查询及四编辑，不能称为单次诊断成本或P95性能资格。

得到主线程18.26秒及内建快照worker1.37秒两份Profile。按函数位置合并调用上下文后的主线程自耗采样包括：空闲5497ms、节点包装对象构造992ms、垃圾回收565ms、members505ms、signaturesWithImplementation311ms、variableClass305ms。不同线程、包含时间、自耗时间和GC不可混加来推断诊断收益。

节点构造调用者中，沿namedChildren/局部范围遍历/callableVariableResultType/provenArgumentType的自耗采样约266.67ms；源码复核确认实际调用者NT为firstLocalSyntax，它在可选范围内按相交关系逐层遍历；deepestLocalSyntax的正常非空范围已采用原生最小覆盖节点加祖先路径，点位置采用有序子节点二分。依赖只缓存单个包装对象的命名子节点，新的根/子节点包装仍会首次展开。这不同于此前把同一node.namedChildren读取移到循环外的失败原型；也不同于31.16ms成本不足的type Getter缓存。

下一项核对firstLocalSyntax有范围参数时的有序相交裁剪，保留原节点/深度预算、首个匹配、重叠边界、遍历顺序及全部输出。采样只是具体调用路径依据，不构成优化准入；需独立差分及正常25轮对照后决定。尚未实施该原型。

原始运行框架的scope文字沿用Getter调查描述，实际命令--cpu-prof、metadata.profiled=true、instrumentedCounts=false与两份CPU产物已核对。原文件保留，另存正确描述版本供后续使用，不重写原证据或重复采样。

证据：[实际命令与终态](../../../.vscode-test/current-controller-cpu-2026-10-13/state.json)、[自耗采样](../../../.vscode-test/current-controller-cpu-2026-10-13/main-function-self-samples.json)、[构造调用者](../../../.vscode-test/current-controller-cpu-2026-10-13/constructor-sampled-callers.json)、[独立核对](../../../.vscode-test/current-controller-cpu-2026-10-13/final-audit.json)。

未采样当前基线仍为诊断1713.81ms、查询600.44ms，原500/150ms预算失败。完整目标和真人验收保持开放；不重试已拒绝的等价假设，功能扩展暂缓，未提交/推送/发布/更新Profile。

更正记录：上一版本把firstLocalSyntax范围相交遍历误归为deepestLocalSyntax非空范围定位，源码复核后已纠正；未经实施的非空范围扩展假设撤销。CPU原数据及构造调用者不改，后续原型只针对实际firstLocalSyntax路径。

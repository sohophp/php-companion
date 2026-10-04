# 数组形状字段值候选：当前源码验证

## 范围与基线

本项属于既有补全计划中的预期类型排序与可证明数组形状值建议。基线 fe950b54 完整 LSP 回归为 857 通过／1 条件跳过，固定 2960 输入已核对；该完整结果不证明后续源码修改已通过完整 LSP。

`/tmp/sophp-shape-candidate-before.json` 记录 12 次 retained／临时 CST 基线查询：bool 字段内 bool／string 函数及常量都 rank 2；string 局部变量按名称排在 bool 前；内层 bool 实参及分组字段值没有 true 候选。已知内层 string 实参的函数排序原本正确，必须保留。

## 修改

候选入口通过 expectedCandidateCompletionType 读取最近的字段或实参／返回／赋值契约。函数、常量、变量、成员、new 类型及字面量值使用同一字段选择逻辑；根数组契约的基础方法保持独立，避免递归。现有 32／64 候选预算保持。未知或不兼容候选仍保留，证据不足时不猜测字段类型。

数组祖先查找在内层 arguments 或词法主体停止，防止外层 shape 覆盖内层契约；分组与值分支按表达式起点定位。空值的 ERROR 恢复不能将外层数组分支的起点误用为字段起点。`??` 左值允许 null，右值不增加 null；外层数组的 `??` 不把字段改成 nullable。空字段值也可建议可见局部变量。

## 已完成验证

- 新测试 shape-value-candidate-completion.test.ts 共 64 项通过，包含 retained／临时 CST、函数／常量／变量／成员／静态成员／构造类型、内层已知与未知调用、作用域边界、运算、嵌套、union、未保存更新以及查询事实不变。
- 联合定向回归 5 文件 219 项通过（该次新测试为 52 项，之后扩充至 64 项）；日志 `/tmp/sophp-shape-candidate-focused.log`。首次 6 项失败和第二次 1 项失败均保留在执行历史，不能当作当时通过：对应空字段外层分支起点及错误的右侧 null 测试预期，修正后重跑通过。
- semantic 构建与定向 ESLint 退出码 0，`git diff --check` 通过。
- 完整 semantic 原会话 41988 退出码 0：87 文件／1666 项全部通过，用时 59.94 秒；日志 `/tmp/sophp-shape-candidate-full-semantic.log`。
- 真实 stdio PHP 7.2／8.5 两项通过，合计 34 次 completion 查询，包括最终首项、候选保留、范围、未保存契约切换和负例。516 项未选中，不记为通过；`/tmp/sophp-shape-candidate-protocol.log`。初次负例错误地要求普通表达式不能出现 true 关键字；修正为同前缀函数排序检查，普通合法关键字保持。
- 隔离 Linux VS Code 1.140.0／PHP 8.5 四例 × Enter／Tab 八次通过：函数、常量、分组字段值、内层 bool 实参的可见首项／精确接受文本／光标／Undo／Redo／磁盘不变。日志 `/tmp/sophp-shape-candidate-visible-host.log`，原会话 4944 退出码 0。
- [可见列表与实际接受文本](completion-shape-visible-2026-10-04.json)记录八次证据；PHP 8.5.9 `-l` 全部接受，仅编译不执行。Provider 就绪后的显式 trigger 等待 152–438 ms，不能作为自动弹出或 P95 达标证据。最终定向 ESLint 退出码 0。
- [当前编辑性能](completion-shape-performance-2026-10-04.json)：独立 241283 字节／1500 注释常量夹具，串行 100 轮交替 bool／string 字段类型，全部首项正确、另一类函数保留、incomplete 为 0、磁盘不变。P50 402.65 ms／P95 463.51 ms／最大 707.62 ms，**超过 150 ms，性能门禁未通过**。这是当前新夹具的一次测量，无 profiler／显式 GC／配对基线，不与 D49／D50 不同源码夹具作性能回归或改善结论；不重复测量到绿色。自己的临时夹具核对 SHA-256 和两文件清单后清理，原始日志 `/tmp/sophp-shape-candidate-performance-raw.log` 保留。

## 尚未完成

普通编辑性能未达标，真人 WSL 仍待实际使用反馈；本项修改后的完整 LSP 未重跑，fe950b54 完整通过仅属于前一固定输入。可见列表未覆盖所有符号类别／版本／平台。当前源码及证据作为 D51 必要本地检查点收口，不代表完整补全阶段结束；没有打包、推送或更新 Profile，goal active。下一项性能工作先取得当前 CPU 证据，不能继续等价盲试。

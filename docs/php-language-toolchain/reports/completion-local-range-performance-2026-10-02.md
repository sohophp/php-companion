# 局部表达式补全：范围定位性能

## 原问题与定位

[上一批数组模板合同](phpstorm-stubs-array-template-consumption-2026-10-02.md)功能正确，但 1003 类基线单文件的 fill_keys→foreach 成员查询，200 次未保存切换 P95 197.12 ms，超过 150 ms。

增加基准的可选 `SOPHP_BENCHMARK_CPU_PROFILE_DIR`，不改变默认测量。Node CPU profile 必须正常退出才写入，首次 SIGTERM 没有产物；改为 LSP shutdown/exit 后采样成功，100 次诊断执行保留实际 `.cpuprofile`。profile 期间的时间不作为预算证据。

16830 个采样中，诊断发布、namedChildren 展开、局部树遍历及实参类型推断是主要调用路径，存在路径重叠，不能把这些计数相加。非空局部范围定位之前会展开文件顶层全部 namedChildren，虽然访客随后排除范围外节点，包装对象和顶层遍历成本已发生。

## 修改

`deepestLocalSyntax` 对非空范围使用 Tree-sitter `namedDescendantForIndex` 定位最小覆盖节点，再按祖先链选最深符合条件的节点，避免逐项创建和检查全部顶层兄弟。

- 保留根范围检查和 256 层深度限制。
- 原来的空范围／光标边界查询保持原流程。
- 不改类型合同、候选过滤或未保存更新，不缓存跨版本语法节点。

## 最终证据

- 同一原始 fixture、两片段、同样 200 次实际 stdio、正确候选首位与对侧候选缺席：P50 46.41 ms、P95 **81.17 ms**、最大 200.99 ms、首次 110.32 ms。未开启 CPU profiling；磁盘原文不变。P95 满足 150 ms；最大值仍超过该数值，不能称每次均低于 150 ms。
- 新回归：1000 个兄弟声明、中文和 emoji、LF／CRLF、两个相同调用的独立范围、First→Second→First 未保存刷新。表达式类型及成员身份准确。
- 完整语义终态退出 0：1213/1213、59 文件、48.18 秒；包含已有正常／超限深度正反例。
- 实际根 stdio 6/6、三文件、5.53 秒，覆盖 fill_keys、相邻十项及 combine 的未保存状态和旧候选撤回。
- 当前根 Core、Linux VS Code 1.140.0 隔离宿主退出 0：fill_keys／reverse 各四次类型与成员更新，文档 dirty、磁盘未变。
- semantic 构建、根 bundle 构建和本次源码、回归、基准脚本 ESLint 退出 0。

本次关闭这个单文件样例的 P95 缺口。没有测量可见弹窗、完整多文件／vendor 项目、Windows 或真人 WSL；也没有重跑完整 stdio。不打包、提交、推送或更新 Profile，不声称整个性能专项或路线图完成。

# C2：一致重载合同的实参补全

日期：2026-10-01。源码增量；未打包、提交、推送或更新 Profile。

## 缺口与实现

以前取得预期实参类型时，签名数量必须恰好为一。合法重载即使对当前参数都要求 string，只因返回类型或其它参数不同，也会失去变量和函数返回值排序、空白实参建议以及值建议。

现在，同一来源和目标的内置重载或 PHPDoc 魔术方法重载，在当前参数类型全部可证明且完全一致时，共用该类型。不同返回类型不影响这个独立参数事实。上限 32 个签名；当前参数绑定不确定、任一合同未知或缺失、类型冲突、跨来源/目标以及重复项目声明均不采用该证明。没有把不同参数类型合成 Union 来猜测用户意图。

沿用原有兼容→未知→不兼容排序，不删除未知或不兼容候选；相同预期 bool 参数可给出 false/true 值建议。单签名逻辑及命名参数映射保持原有接口。

## 当前证据

| 检查 | 结果 |
| --- | --- |
| 全量语义 | 16 文件，547/547，48.41 s；新增位置/具名/空白实参、函数返回值排序、bool 值建议、内置重载、一致→冲突编辑及重复声明反例 |
| 标准 stdio LSP | PHP 7.2／8.5 两项通过，7.63 s；位置、具名、空白实参和函数候选随一致→冲突→一致的未保存编辑刷新 |
| 隔离源码宿主 | 退出码 0；重载参数排序、未知候选保留、未保存冲突修改及一次 Undo/Redo；既有 Elvis、按值调用、引用返回场景同时通过 |
| 连续编辑 | 独立 Composer 项目只读内存副本 100 轮；每轮预期首位正确，两个共享合法候选保留；P50 14.88 ms，P95 27.49 ms，首轮/最大 81.94 ms |
| 构建检查 | semantic build、源码 bundle、LSP typecheck、扩展测试 TypeScript、相关 ESLint、benchmark Node 语法与 diff check 通过 |

性能原始数据：[JSON](c2-overload-expected-benchmark-2026-10-01.json)。日志位于 `/tmp/sophp-overload-expected-{full-semantic,stdio,host,build,bundle,lsp-tsc,host-tsc,eslint}.log`。

## 基准语义

基准中的 BenchAgreed 有两个 send 重载，当前参数都是 string，另一个参数分别为 int/string；BenchConflict 的当前参数分别为 string/int。三个候选函数分别返回 int/string/未知。轮流编辑接收者类型，首位应在 Text 与 Int 之间切换，两个函数都应保留。

`scripts/benchmark-project-completion.mjs` 新增显式 `SOPHP_BENCHMARK_SHARED_CANDIDATES=1` 模式，必须同时开启 `SOPHP_BENCHMARK_EXPECT_FIRST=1`。它逐轮核对首位及另一合法候选仍存在，输出 sharedCandidates 标志。未开启时继续使用原先另一组候选必须撤回的断言；此处不把共享候选误报为过期，也不声称检查了任意其它过期结果。

## 范围

不同类型重载之间的交集推导、部分重载合同缺失、跨目标一致合同和普通重复声明不由本轮解决。PHP 7.2 的具名参数位置测试是编辑恢复中的值补全证据，不表示具名参数语法可在 PHP 7.2 运行。全量 357 项 stdio 未重跑；两项定向结果不替代全量。源码宿主不等于真实 WSL Profile 使用或可见弹窗等待验收。

# foreach 与循环当前复杂Controller诊断定位

正常构建 `0de51947915730f6123ba71371945f95da2581d9ee00f15e72f1f80f33c40e82` 保留原四轮真实Controller只读stdio/CPU定位流程，补全、悬停、Definition、真实getRows引用及0/1/0/1返回类型诊断正确；版本、查询顺序与源字节保持。

| 文档版本 | 诊断到达解码器耗时 | 探针返回类型错误数 |
| --- | --- | --- |
| 1 | 3820.39ms | 0 |
| 2 | 3062.53ms | 1 |
| 3 | 2554.25ms | 0 |
| 4 | 2457.39ms | 1 |

四个当前观察均超过原500ms目标；本次只有四个带CPU采样的核心stdio观察，不作为完整P95、真实编辑器UI或完整性能资格。每轮最后取得全局查询计时；后三轮diagnostics计时分别2954.31、2418.76、2358.93ms，原始计时及完整诊断载荷保留。计时器没有URI分组，不把首轮多项全局计时归为同一诊断请求；问题定位继续，尚未修复。

实际VS Code可执行文件以Electron Node运行正常服务器，开启CPU采样、testMode、onDemand与空框架/路由提供器。只在LSP打开缓冲区交替增补探针，未写入或执行业务PHP；磁盘字节与66,079个真实项目输入保持。该设置用于核心成本定位，不代替完整扩展组合的真实编辑器验收。

实际主线程采样按函数、URL、行和列区分，未使用source map推断源码行。当前主要包含耗时为incompatibleArguments约5773ms、signaturesWithImplementation约5323ms、provenArgumentType约4115ms；self成本含members约855ms与WASM解析。包含成本存在祖先/子调用重叠，不能相加为独立耗时，也尚未证明任何缓存方案能解决此问题。完整帧、样本与正常bundle片段保留于机器报告。

独立终态审计复核66,079项目输入、20工具输入、实际服务器及父子进程、六CPU轨迹与2546份归档。输入与磁盘保持，实际自有进程已退出。原始证据 `.vscode-test/d2291-*`、`.vscode-test/d2292-*`，分析D2293，审计D2295。

本轮没有修改产品源码或采用优化候选；原被拒绝的成员组合/实参复用方案不重试。已通过的[当前规模门禁](foreach-loop-current-server-scale-2026-10-12.md)、[组合及普通编辑](foreach-loop-current-composite-editing-2026-10-12.md)保持各自范围，不能迁作复杂诊断预算资格。完整性能、版本/平台/Remote、长期/真人与177编号/14家族、26大项继续，Profile未更新。无提交、打包、推送或发布。

[机器报告](foreach-loop-current-controller-diagnostics-2026-10-12.json)。

# 首次 References：先解析接收者依赖，不依赖 Definition 预热

日期：2026-09-21。修复前源码：`574092e`。

## 首次路径缺陷

此前基准固定先执行 Definition、再执行首次 References。直接把请求顺序改为 References → Definition 后，真实 Winstar `AdminPasswordChangeGuard.php` 最后一个 `get` 在空缓存下出现：

- References 27.975 秒，错误返回 0 处；位置摘要为空数组 SHA-256。
- 随后的 Definition 1.480 秒，返回正确的 1 处声明。

原因是 References 在确定候选名称前没有按需加载 vendor 接收者类型。`Request` 或其 `attributes` / `getSession()` 返回类型尚未加载时，找不到成员目标，查询退到项目扫描；扫描项目源码后仍缺 vendor 声明，最终出现错误的空结果。Definition 自己会按 PSR-4 逐步加载类型，因此先做 Definition 的旧基准掩盖了缺陷。

此前先 Definition 后 References 的 7–8 秒测量仍可用于该特定路径的历史对照，但不能作为“用户首次操作就是 References”的正确性和延迟证据。

## 修复与门禁

References 在项目级目标尚未解析时，使用与 Definition 相同的 canonical PSR-4 类型加载逻辑，最多四轮沿接收者类型链加载声明。已能解析的类型/成员、局部变量和已识别的构造器提升属性不走此补充步骤。每轮检查取消状态，并在异步加载后校验打开文档版本；目标解析成功后进入原有候选扫描、精确语义匹配和缓存路径。

新增真实 stdio 回归分别从未加载的 vendor 属性链和方法返回链执行 References，覆盖冷启动与 Reload，验证完整两处位置，排除同名无关方法，并确认使用 named-candidates 而非全项目索引。测试没有先发 Definition、Hover 或 Completion 请求。

基准脚本新增 `PHP_COMPANION_BENCHMARK_REFERENCES_FIRST=1`，`once` 模式请求顺序为 References → Definition，重复模式为 References → References → Definition → References，分别测量直接重复与导航后的重复查询。默认通用脚本保留原顺序以支持历史对照；`pnpm check:references:winstar` 则强制 References 先执行，并核对顺序、方法集合、数量和完整位置摘要。

## 正式构建复测

空持久缓存、独立 LSP 进程，扫描 2,285 文件、解析 1,653 候选：

| 查询 | 时间 | 结果 |
| --- | ---: | --- |
| 直接首次 References | 9.138 秒 | 正确 112 处 |
| 随后 Definition | 0.021 秒 | 正确 1 处 |

References 峰值 RSS 为 732,892 KiB。完整 References 位置 SHA-256 保持 `bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2`；Definition 保持 `62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1`。9.138 秒包含首次依赖准备，不能与先 Definition 的 7.942 秒直接比较。

更新后的 `pnpm check:references:winstar` 通过：直接首次 References 9.041 秒，112 处完整位置摘要一致；随后 Definition 0.019 秒，1 处声明一致。

同一持久缓存、重新启动独立 LSP，按重复模式执行：

| 查询 | 时间 | 结果 |
| --- | ---: | --- |
| Reload 后首次 References | 7.483 秒 | 正确 112 处 |
| 紧接着重复 References | 0.016 秒 | 正确 112 处 |
| Definition | 0.016 秒 | 正确 1 处 |
| Definition 后再查 References | 2.679 秒 | 正确 112 处 |

该轮恢复 1,652 候选，候选阶段 3.307 秒，首次语义阶段 2.798 秒，峰值 RSS 442,432 KiB。所有 References 完整位置摘要一致。直接重复命中语义缓存（日志 0 ms），但执行 Definition 后出现重新计算（语义 2.666 秒）；这是后续需要定位的缓存失效路径，不能把直接重复的 16 ms 用于描述导航后查询。以上均为单次测量，不是延迟分位数。

## 验证边界

新增两个 stdio 场景通过；包含它们的 LSP 定向回归 50 项通过、156 项跳过，用时 48.36 秒。相关 TypeScript、ESLint 和正式 esbuild 构建通过。语义包本轮未修改，没有重复其全量测试。

尚未冻结新 VSIX 或更新用户 WSL Profile。此轮修正了首次路径的错误结果与无效扫描，但直接首次查询仍约 9 秒，尚未达到满意的交互水平；后续耗时优化以 References-first 门禁为准。

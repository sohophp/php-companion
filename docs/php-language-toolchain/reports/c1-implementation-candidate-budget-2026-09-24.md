# C1 Implementation 候选预算边界

日期：2026-09-24。

## 复现

独立 Composer fixture 安装 Guzzle、Monolog、Symfony HttpFoundation 等锁定依赖，共 1,029 个 PHP 文件。`node scripts/benchmark-implementation-boundary.mjs 9100` 再生成 9,100 个无关项目文件与 1 个 Consumer，总计 10,130 个 PHP 文件。Consumer 调用 `Psr\\Http\\Message\\ResponseInterface::getStatusCode()`；声明在 vendor 接口，实现位于 vendor 的 Guzzle Response。

修复前，Definition 找到接口，Implementation 在一次本机请求的 1,697 ms 后报告搜索不完整。原因是名称预筛虽然跳过无关文件的源码解析，索引器仍把它们计入默认 10,000 文件读取预算；项目文件先耗尽额度，依赖实现无法参与搜索。

## 修复与边界

当名称满足预筛条件且 Implementation 搜索包含依赖时，索引器仍枚举、检查全部 autoload PHP 路径，但已证明不含名称的文件不消耗候选文件数与总读取字节额度。Linux/WSL 优先使用系统 `rg`；其它平台先尝试 PATH 中的 `rg`，缺失或失败时使用有界 Node 文件搜索。两者都不能完整证明候选时，退回原完整索引，超出原预算会明确返回不完整。默认最多检查 50,000 个 PHP 路径；显式调高文件预算时，目录清单上限也不会低于用户配置。可移植搜索另受 8 秒、单文件 4 MiB、总读取 512 MiB 限制。搜索结果同时覆盖大小写形式的 `.php` 扩展名。普通项目索引和无预筛的查询仍使用原有预算策略，不把部分结果报作完整结果。

## 本轮证据

- 索引包 40 项通过：无关文件不占候选额度，实际候选超额仍返回不完整，普通索引限制保持原样。
- F04-NAV-20 真实 stdio 定向测试通过：低候选额度下跨项目/vendor 找到唯一实现，排除项目内同名方法，读取大写 `.PHP` 文件。F04-NAV-19 继续约束无预筛时的“不完整”反馈。
- 相同 10,130 文件基准在修复后找到 Guzzle Response；一次本机请求为 1,530 ms。单次计时只证明本轮结果和大致量级，不能作为延迟分布、Windows/macOS 或持续使用验收。
- Language Server 全套回归 17 个测试文件通过，311 项通过、1 项原有跳过；受影响的 TypeScript 构建与 ESLint 通过。

下一步继续测预筛失败、目录变动、取消与较长编辑会话的结果和等待分布；C1 组合候选验收仍按[核心计划](../future-core-plan.md)执行。

## 可移植路径增量

同一 fixture 在没有 PATH `rg` 的独立语言服务器进程中，Node 预筛仍找到 Guzzle Response。单次本机请求约 5,288 ms，其中候选搜索约 3,731 ms；默认 Linux `rg` 路径本轮单次请求约 1,532 ms，其中候选搜索约 38 ms。可移植路径的定向单元测试覆盖大写 `.PHP`、无关文件、文件数超额、取消与符号链接循环；真实 stdio F04-NAV-20 在可移植路径下返回唯一实现。以上数据来自 Linux 上强制运行可移植路径，不等于 Windows/macOS 实机验收；差距列为后续性能工作。

本增量的 Language Server 全套回归通过 18 个测试文件，314 项通过、1 项原有跳过。受影响 TypeScript 构建、ESLint 和预筛定向测试通过。

## 可移植搜索等待优化

原 Node 回退逐文件异步 `stat`/读取，在 9,100 个合成小文件的本机对照中约 2,887 ms；同步读取约 117 ms。为避免阻塞语言服务器主线程，文件遍历与同步读取现运行于单独的短生命周期 Worker。主线程负责取消、8 秒超时及 Worker 失败后的保守回退；扫描仍保留文件数、单文件大小、总读取量、排除路径与符号链接循环的边界。

同一 10,130 文件 fixture 的单次本机无 `rg` 请求在独立语言服务器构建中为 2,256 ms（候选搜索 577 ms），在随 Core 分发的 bundled Language Server 中为 2,001 ms（候选搜索 466 ms），均返回 Guzzle Response。Core 的 `pnpm build` 已生成并包含 `portableCandidateSearchWorker.js`；打包内容校验清单已纳入该文件。上述仍是 Linux 上的单次基准，不证明 Windows/macOS 实机等待分布或长时间会话。

## 连续未保存编辑

`node scripts/benchmark-implementation-boundary.mjs 9100 bundle-no-rg 10` 在同一打开的 Consumer 缓冲区连续切换 `getStatusCode()` 与 `getReasonPhrase()`，每轮发送递增版本的未保存 `didChange`，并验证 Implementation 的 URI **和方法行号**。10/10 轮均返回对应的 Guzzle 方法，未出现上一轮的落点。

最初每次编辑都重新搜索整个磁盘。现将名称预筛结果按 Composer 项目对象、搜索范围和名称缓存最多 16 组，且只有对应索引完整完成才保存；每轮索引仍枚举 autoload 路径，并以初次扫描时间为界读取后来新增或变化的文件。F04-NAV-20 真实 stdio 用例在缓存已建立后新增 vendor 实现，第二次查询返回新旧两个实现，并观察到 `cached=true`，证明新文件没有被旧预筛排除。

本机两次独立 10 轮无 `rg` 会话的等待记录：缓存前最小 1,367 ms、中位 1,513.5 ms、最大 2,043 ms；最终构建复测的 bundled Core 最小 965 ms、中位 1,116.5 ms、最大 2,062 ms，后 8 轮复用了预筛结果。它们是短时连续编辑基准，不能证明数小时会话、跨系统或人眼可见的编辑器反馈。

## 50,000 文件边界

可移植候选搜索原先按遍历次数计数：Composer 自动加载目录与单文件路径重叠时，同一个 PHP 文件会被重复计算，在 50,000 文件附近提前放弃预筛。现按解析后的文件路径去重，只对首次遇到的路径计入文件数与读取字节；重叠目录的定向测试通过。

在同一独立 Composer fixture 中执行以下命令；`default` 使用独立 Language Server 构建与系统 `rg`，`bundle-no-rg` 使用 bundled Core Language Server，并在子进程中清空 PATH，强制走可移植搜索：

| 命令 | autoload PHP 清单规模 | 首次 Implementation 等待 | 结果 |
| --- | ---: | ---: | --- |
| `node scripts/benchmark-implementation-boundary.mjs 48970 default 1` | 49,989 | 5,630 ms | Guzzle Response 第 122 行 |
| `node scripts/benchmark-implementation-boundary.mjs 48970 bundle-no-rg 1` | 49,989 | 6,702 ms | Guzzle Response 第 122 行 |
| `node scripts/benchmark-implementation-boundary.mjs 48981 bundle-no-rg 1` | 50,000 | 6,944 ms | Guzzle Response 第 122 行 |
| `node scripts/benchmark-implementation-boundary.mjs 48982 bundle-no-rg 1 incomplete` | 50,001 | 2,059 ms | 明确报告搜索不完整，无部分落点 |

命令中的数字为额外生成的项目噪声文件数；fixture 还包含 1,029 个 PHP 文件和 1 个 Consumer，其中部分文件不属于 Composer autoload 清单。表中的等待为单次本机测量，不能代表延迟分布。这个验证覆盖按需 Implementation 的 50,000 路径清单边界，不等于 50,000 文件冷索引、峰值内存、Windows/macOS 或实际编辑器验收。

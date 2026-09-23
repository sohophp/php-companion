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

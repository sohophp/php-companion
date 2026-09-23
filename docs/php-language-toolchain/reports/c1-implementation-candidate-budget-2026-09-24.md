# C1 Implementation 候选预算边界

日期：2026-09-24。

## 复现

独立 Composer fixture 安装 Guzzle、Monolog、Symfony HttpFoundation 等锁定依赖，共 1,029 个 PHP 文件。`node scripts/benchmark-implementation-boundary.mjs 9100` 再生成 9,100 个无关项目文件与 1 个 Consumer，总计 10,130 个 PHP 文件。Consumer 调用 `Psr\\Http\\Message\\ResponseInterface::getStatusCode()`；声明在 vendor 接口，实现位于 vendor 的 Guzzle Response。

修复前，Definition 找到接口，Implementation 在一次本机请求的 1,697 ms 后报告搜索不完整。原因是名称预筛虽然跳过无关文件的源码解析，索引器仍把它们计入默认 10,000 文件读取预算；项目文件先耗尽额度，依赖实现无法参与搜索。

## 修复与边界

当 Linux/WSL 的 `rg` 成功、名称满足预筛条件，且 Implementation 搜索包含依赖时，索引器仍枚举、检查全部 autoload PHP 路径，但已证明不含名称的文件不消耗候选文件数与总读取字节额度。默认最多检查 50,000 个 PHP 路径；显式调高文件预算时，目录清单上限也不会低于用户配置。超出目录清单、实际匹配文件数、单文件或总读取字节额度时保持“不完整”结果。`rg` 失败或超时会退回原完整索引，此时若超出原预算，也会明确返回不完整。搜索结果同时覆盖大小写形式的 `.php` 扩展名。普通项目索引、无预筛的查询及非 Linux 平台仍使用原有预算策略，不把部分结果报作完整结果。

## 本轮证据

- 索引包 40 项通过：无关文件不占候选额度，实际候选超额仍返回不完整，普通索引限制保持原样。
- F04-NAV-20 真实 stdio 定向测试通过：低候选额度下跨项目/vendor 找到唯一实现，排除项目内同名方法，读取大写 `.PHP` 文件。F04-NAV-19 继续约束无预筛时的“不完整”反馈。
- 相同 10,130 文件基准在修复后找到 Guzzle Response；一次本机请求为 1,530 ms。单次计时只证明本轮结果和大致量级，不能作为延迟分布、Windows/macOS 或持续使用验收。
- Language Server 全套回归 17 个测试文件通过，311 项通过、1 项原有跳过；受影响的 TypeScript 构建与 ESLint 通过。

下一步继续测预筛失败、目录变动、取消与较长编辑会话的结果和等待分布；C1 组合候选验收仍按[核心计划](../future-core-plan.md)执行。

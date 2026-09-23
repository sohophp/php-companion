# C1 真实 Composer 依赖树编辑链

日期：2026-09-24。

## 独立项目

测试项目位于 `test/extension/real-vendor/`，用提交的 `composer.lock` 固定 30 个公开包：Guzzle PSR-7、Monolog、Symfony HttpFoundation/Console/DependencyInjection/HttpKernel/Mime/Routing/Yaml 及其依赖。Composer 平台目标为 PHP 7.2.34；本轮安装后 vendor 含 1,029 个 PHP 文件。`vendor/` 由 Composer 安装且不入库。复现入口为 `pnpm test:extension:c1:real-vendor`，只在显式运行该入口时复制项目到隔离 VS Code 宿主的临时工作区。

## 发现与修复

项目 Consumer 声明 `Psr\Http\Message\ResponseInterface` 接收者。首次 Completion、Hover、Signature Help、Definition 和 References 正确，但 Implementation 返回空；手动打开 `GuzzleHttp\Psr7\Response.php` 后才找到实现。按需候选扫描原先只遍历项目自动加载路径，排除了已安装依赖。现在仅 Implementation 的候选扫描包含依赖路径，并把扫描范围纳入任务键、缓存键、ripgrep 路径和完整性判断。项目范围的 References 等查询保持原范围。

隔离 Core 宿主现在无需打开实现文件即可完成六项查询：Definition 指向 PSR 接口，Implementation 指向 Guzzle Response；未保存地把接收者改成 `Monolog\Logger` 后，补全改为 `getName`，旧 `getStatusCode` 不再作为方法候选，Definition 指向 Logger。最初 293 文件时，首次 Implementation 命令单次观测为 482 ms。扩大到 1,029 文件后三次新宿主首次观测为 1,093/949/1,059 ms；两次各 12 次热态中位数均为 4 ms，最大 7/5 ms；未保存切到 Logger 再切回 ResponseInterface 后的首次 Implementation 为 290/274 ms。这些是本地小样本，不代表长期 P95。F04-NAV-18 独立 stdio 夹具用一个未打开的 Composer vendor 实现复现并验证修复；定向 1/1、语言服务器全套 309 项通过且 1 项跳过。正式 `pnpm test:extension:c1:real-vendor` 入口退出码 0。

另以 `PHP_COMPANION_TEST_C1_UI=1 pnpm test:extension:c1:real-vendor` 观察 Workbench：在真实 PSR 接口类型后输入 `g`，首次可见列表包含 `getStatusCode`，没有 Monolog 的 `getName`；293/1,029 文件时各一次可见观测为 208/211 ms。TypeScript、ESLint、Composer 严格校验、按锁文件安装 dry run 和差异检查通过。

这是 PHP 7.2 目标、Linux 隔离宿主与 1,029 个真实 PHP 文件的结果。还需其它 PHP/平台/Remote 矩阵、超过默认 10,000 文件预算的边界、持续会话分布，以及完整 Open Source Pack 的组合门禁。本轮没有生成 VSIX，也没有修改业务项目。

## 索引预算边界

F04-NAV-19 用独立 stdio 夹具把索引文件预算设为 1：项目 Consumer 已占额度，vendor 的接口和实现尚未完整扫描。Implementation 现在返回明确的“实现查找未完成，部分项目或已安装依赖源码未被扫描”错误，提示查看 SoPHP 输出与索引设置，不把扫描不完整误报成零个实现。中文与英文协议消息和真实 stdio 定向共 4 项通过。此用例验证小预算的失败反馈；默认 10,000 文件附近的性能与用户操作仍待单独验证。

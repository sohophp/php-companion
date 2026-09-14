# PHP 运行时扩展探测验收报告

日期：2026-09-14

## 交付范围

- 新增 `@php-companion/runtime-probe` 独立组件，公开 PHP CLI 解析、单个探测和有界多命令发现 API，可单独构建、测试、打包和发布。
- 探测脚本仅读取 `PHP_VERSION`、`PHP_VERSION_ID`、`PHP_SAPI`、`get_loaded_extensions()`、`php_ini_loaded_file()` 与 `php_ini_scanned_files()`；不读取项目源码、不加载 Composer autoloader、不启动框架。
- Node 使用 `execFile(executable, ['-d', 'auto_prepend_file=', '-d', 'auto_append_file=', '-r', script])`，不经过 shell，并显式关闭 CLI 自动前置/后置文件；默认超时 3 秒，标准输出上限 128 KiB。输出带版本化帧标记并执行完整结构校验，扩展身份统一为小写且去重。
- VS Code 在首次打开 PHP 文件或主动检测时选择运行时；显式 `phpExecutablePath` 具有唯一所有权，否则只尝试默认 `php` 和目标次版本对应命令。探测结果会按 workspace folder 和嵌套 Composer 根通知语言服务器。
- 语言服务器独立复核载荷，只接受与目标 PHP 次版本一致的成功结果；然后把实际未加载扩展与 workspace `disabledExtensions`、Composer `config.platform=false` 合并。任一来源明确不可用即可裁剪，但共享符号仍要求全部所有者不可用。
- `php.extension.unavailable` 的结构化数据记录 `setting`、`composer`、`runtime` 和已验证的运行时版本、SAPI、可执行文件及主 INI；完整扩展/INI 目录只保留在根级快照中，避免在每条诊断中重复放大协议载荷。项目或 polyfill 已声明同名符号时继续抑制诊断。

## 精准边界

- 找不到命令、进程失败/超时、超限输出、缺少帧、JSON 或字段不合法：整份结果为 unknown。
- 探测到的 PHP 次版本与语言服务器目标不同：整份运行时事实被拒绝，不裁剪任何扩展符号。
- Composer 没有声明 `ext-*`：不据此推断缺失。
- 当前只消费已经完成版本目录和符号所有权审计的八个扩展组；其他扩展即使未加载也不发布诊断。
- 探测在 Extension Host 所在机器执行，因此本地、WSL、SSH 和 Dev Container 自然对应各自环境；完整 Remote 自动矩阵仍属于 P9 门禁。

## 验证

- runtime-probe 单元测试覆盖合法载荷、扩展名规范化、不可执行命令、畸形输出、进程异常、别名去重和版本解析。
- 真实 stdio LSP 测试覆盖设置、Composer 与运行时三种来源同时存在、运行时快照刷新、内建 Definition 移除，以及目标版本不匹配反例。
- `pnpm test` 通过：十六个组件 616 项、根扩展 33 项，共 649 项；其中 runtime-probe 4 项、language-server 161 项。
- 本机 PHP 7.2、7.4、8.1、8.2、8.4、8.5 的真实 CLI 集成探测全部通过；提交 `431d93e` 的 [CI 34824531041](https://github.com/sohophp/php-companion/actions/runs/34824531041) 进一步通过 PHP 7.2–8.5 九版本矩阵，以及 Linux、Windows、macOS 的质量与打包 Extension Host，共 15/15 项成功。
- `pnpm typecheck`、`pnpm lint`、`pnpm verify:packages`、`pnpm package:all` 与 `pnpm verify:vsix` 通过；十六个真实 tarball 在仓库外隔离消费者中安装和调用成功。
- `pnpm test:extension:packaged` 在 VS Code 1.137.0 Linux x64 隔离配置中完成完整 Extension Host 用例，退出码 0。

## 候选产物

- `php-companion-0.4.5.vsix`：`5899b4dd91b941ef1b02e2a779fbf7943955cfc90e9a309af67b18480b6b6aab`
- `php-companion-open-source-pack-0.4.5.vsix`：`d74a84ee947b89988c2363ad6f038c622eb473bf9e030b2d161cf65dc79edaf2`
- `php-companion-recommended-pack-0.4.5.vsix`：`76661f2ca4058be3278826bc899e62a7786570f29f0e9a6779fe634fea1431c0`

以上产物哈希是本地候选证据，不等同于 npm 或 Marketplace 发布；跨平台与 PHP 7.3/8.0 的自动证据由上述 CI 提供。

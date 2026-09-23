# C1 配置 PHP 可执行文件的 auto 版本探测

日期：2026-09-24。F04-HOST-05 在原有双 Composer 根隔离宿主用例旁增加第三根。第三根不在 `composer.json` 指定 PHP 约束或平台版本，工作区设置 `phpCompanion.phpVersion=auto`，通过测试入口设置 `phpCompanion.phpExecutablePath`。测试入口先运行该 PHP 的 `-r 'echo PHP_VERSION;'` 取得预期版本，再启动 VS Code Extension Host。

本机以 `PHP_COMPANION_TEST_C1_RUNTIME_PHP=/usr/bin/php81` 执行；CLI 为 PHP 8.1.34。隔离 VS Code 1.139.0 Core 宿主中，第三根的 enum 和 match 没有低版本诊断，`(void)` cast 有一条 PHP 8.5 前不支持的诊断，`str_contains` 内建补全存在。原双根查询链同时通过，宿主退出码 0。测试中的第一轮失败由夹具同时声明 class 和 enum、不能触发预期文件名诊断造成；夹具改成单一 enum 后通过，没有产品代码改动。

复现命令：先运行 `node esbuild.mjs --production` 与 `pnpm exec tsc -p test/extension/tsconfig.json`，再运行 `PHP_COMPANION_TEST_C1_ONLY=1 PHP_COMPANION_TEST_C1_RUNTIME_PHP=/usr/bin/php81 node scripts/run-extension-test.mjs ./dist-test/runTest.js`。这不是 VSIX 打包，也不要求修改业务项目。

此结果只证明 Linux 上显式配置的 PHP 可执行文件可驱动 `auto` 版本及其可见诊断和提供者查询。无配置时的 PATH 自动发现、Windows/macOS、WSL Remote、内建虚拟声明导航和实际建议列表显示时间仍需单独验证。

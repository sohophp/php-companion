# C1 auto 优先采用 PATH 中的 PHP

日期：2026-09-24。Composer 未指定 PHP 平台或版本约束时，SoPHP 的 `auto` 会探测本机可执行文件。原命令顺序先找 `php85`、`php8.5` 等版本化名称，最后才找 PATH 中通常直接运行的 `php`。本机 `/usr/bin/php` 为 7.2.34，同时存在 `/usr/bin/php85` 8.5.9；旧规则会让编辑器按 8.5 解释一个默认 CLI 为 7.2 的项目。

现在默认先探测 `php`，找不到或版本超出受支持范围时再依次尝试版本化命令。显式 `phpCompanion.phpVersion`、Composer `config.platform.php`、锁定平台、`require.php` 和显式 `phpCompanion.phpExecutablePath` 的既有优先级不变。Runtime Probe 的默认枚举顺序同步为 `php` 在前。单元回归先确认旧实现错误选择 8.5，再确认新实现选择 PATH 的 7.2，并保留 `php` 缺失时选择版本化 8.5 的正例。

验证：版本选择单元 10/10、Runtime Probe 4/4 和构建通过。隔离 VS Code 1.139.0 Core 宿主增加第三独立 Composer 根，不写 PHP 约束或可执行文件路径；`PHP_COMPANION_TEST_C1_RUNTIME_DISCOVER=1` 模式先从 PATH 运行 `php` 得到 7.2.34，再确认版本诊断包含 match、enum、`(void)` 且补全不含 PHP 8.0 起提供的 `str_contains`，宿主退出码 0。同一构建下显式 `/usr/bin/php81` 复测仍按 8.1.34 返回诊断和内建补全，退出码 0。

复现入口：`PHP_COMPANION_TEST_C1_RUNTIME_DISCOVER=1 pnpm test:extension:c1`。本轮未打包 VSIX，也未修改业务项目。当前只验证 Linux 上的实际 PATH；Windows、macOS、WSL Remote、多 PHP 切换后的刷新及完整 Pack 组合仍开放。

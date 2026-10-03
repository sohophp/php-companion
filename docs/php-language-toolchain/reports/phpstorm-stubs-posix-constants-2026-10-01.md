# POSIX 运行时常量接入

固定上游修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 POSIX 目录提供 43 个常量名称。同步脚本现同时生成名称目录；数值来自项目 PHP 运行时，不沿用上游固定数值。

本机 PHP 8.1.34／8.5.9 分别提供 26／43 项。探测 → JSON → 客户端 payload → 服务器 → 版本化内置 URI → 生成声明使用十进制字符串保存 PHP 有符号 64 位整数；声明仍输出 PHP 整数表达式。`POSIX_RLIMIT_INFINITY` 本机为 `-1`，`POSIX_RLIMIT_AS` 为 `9`，均与固定上游不同。未知数值不猜测；扩展关闭后撤回。

PHP 8.3 起允许 SC／PC 配置常量，`POSIX_SC_CHILD_MAX`、`POSIX_SC_CLK_TCK` 从 PHP 8.4 起；后者边界与 [PHP 官方常量手册](https://www.php.net/manual/en/posix.constants.sysconf.php)核对。

验证证据：

- 语言规范 126 项、运行时探测 28 项及客户端 payload 定向测试通过。
- PHP 7.2／8.5 真实 stdio LSP 两项通过：Hover 原样显示 `9223372036854775807`，运行时更新后显示 `-1`，关闭扩展后为空。
- 本机完整探测后，在无扩展 PHP 进程中加载生成声明并逐项读取常量值；PHP 8.1 的 26 项和 PHP 8.5 的 43 项与项目反射结果完全一致，内置 URI 往返亦一致。
- 根项目 TypeScript 检查与修改文件 ESLint 通过。JSON 拒绝不安全数值、越界整数、非十进制字符串及注入表达式。

自动化与本机运行时证据不替代真实 WSL UI 使用。未打包、提交、推送或更新 Profile。

# C3 类型生成的 PHP 名称校验

日期：2026-09-25。工作范围仅为 SoPHP 仓库和独立临时 Composer 项目，没有修改业务项目或生成 VSIX。

类型生成原先只校验名称字符，`class class {}` 等无效 PHP 会进入预览并写成文件。现在按项目目标 PHP 版本校验类型名与 PSR-4 命名空间段，交互输入和命令内部的最终检查使用同一规则。保留词在预览前被拒绝；合法 Unicode、`enum` 和 `resource` 仍可使用。

规则参考 [PHP 保留关键字](https://www.php.net/manual/en/reserved.keywords.php)、[其它保留词](https://www.php.net/manual/en/reserved.other-reserved-words.php)及 [PHP 8 命名空间变化](https://www.php.net/manual/en/migration80.incompatible.php)，并由本机 `php72`、`php74`、`php81`、`php82`、`php84`、`php85` 的 `php -l` 临时样本核对。`fn` 从 PHP 7.4、`match`/`mixed` 从 PHP 8.0、`readonly`/`never` 从 PHP 8.1、`__PROPERTY__` 从 PHP 8.4 才作为类型名拒绝；`enum` 作为类名仍合法。PHP 7.x 的命名空间关键字段被拒绝，PHP 8 的限定名允许保留词段。PHP 8.0 的版本边界参考官方迁移说明；本机没有 `php80` CLI。

验证：`test/unit/php-identifiers.test.ts` 的 3 项定向测试、根 TypeScript 和相关 ESLint 通过；独立 VS Code 1.139.0 Linux x64 C3 宿主退出码 0，`class` 输入没有打开预览，也没有生成文件，原有预览、取消、应用及一次 Undo 回归继续通过。宿主日志为 `/tmp/sophp-c3-reserved-name-20260925.log`。加入 `__PROPERTY__` 的版本分界后重新运行单元与静态检查；此变更不影响已通过宿主的 `class` 拒绝路径。

此项只解决无效生成输入。文件创建后一次 Undo 可删除文件、一次 Redo 未恢复的问题仍开放，不能据此判定 C3 类型生成全部完成。

# phpstorm-stubs PHP 7 字符串签名核对（2026-09-30）

按本机 PHP 7.2、7.4 反射结果，修正常用字符串和 HTML 函数的旧参数名，涵盖 `substr`、`trim`、`str_replace`、`explode`、`sprintf`、`htmlspecialchars`、`nl2br`、`wordwrap`、`str_pad` 等；同时校正 `pathinfo`、`bin2hex`、`hex2bin`。PHP 8 保留原有参数名。PHP 7 不支持命名参数，这一组修正主要改善签名提示文字。

| PHP | 标准库函数缺失 | 单声明签名差异 | 重载形状差异 |
| --- | ---: | ---: | ---: |
| 7.2 | 0 | 79（原 107） | 16 |
| 7.4 | 0 | 80（原 108） | 16 |
| 8.5 | 0 | 0 | 9 |

审计命令：`node scripts/audit-phpstorm-runtime-signatures.mjs <version> standard <runtime>`，运行时分别为 `php72`、`php74`、`php85`。语言规格 104 项测试通过；PHP 7.2 的真实 stdio LSP 定向测试已检查 `htmlspecialchars` 显示 `$quote_style`。语言规格和语言服务器构建、所改 TypeScript 文件的 ESLint 与 `git diff --check` 均通过。剩余 PHP 7 差异主要集中于数学、类型判断、文件和数组函数参数名，继续按函数族处理。源码未打包、安装或更新 Profile。

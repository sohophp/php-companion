# phpstorm-stubs PHP 7 数学与类型判断签名核对（2026-09-30）

按本机 PHP 7.2／7.4 反射结果，校正 `ceil`、`floor`、`round`、`log`、`sqrt`、`hypot`、进制转换，以及 `is_*` 类型判断和 `is_callable` 的旧参数名。同步调整对应 PHPDoc 参数名，保持现有类型推断。PHP 8 参数名保持原样。

接续[字符串签名核对](phpstorm-stubs-php7-string-parameters-2026-09-30.md)，标准库单声明签名差异如下：

| PHP | 标准库函数缺失 | 单声明差异 | 重载形状差异 |
| --- | ---: | ---: | ---: |
| 7.2 | 0 | 52（原 79） | 16 |
| 7.4 | 0 | 53（原 80） | 16 |
| 8.5 | 0 | 0 | 9 |

`pnpm --filter @php-companion/language-spec build` 与 104 项语言规格测试通过；审计命令为 `node scripts/audit-phpstorm-runtime-signatures.mjs <version> standard <runtime>`，运行时分别为 `php72`、`php74`、`php85`。剩余差异集中于 URL／序列化、文件和数组函数；部分重载形状本身用于提供类型专用签名，需要另行判断。源码未打包、安装或更新 Profile。

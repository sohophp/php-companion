# phpstorm-stubs PHP 7 数组函数签名核对（2026-09-30）

2026-10-01 续项：[常用内置合同核验](c2-builtin-url-component-contracts-2026-10-01.md)已覆盖 min／max／implode 的常见调用与 parse_url 的组件／数组形状；其它重载形式仍待独立核验。

按本机 PHP 7.2／7.4 反射校正数组与排序函数的旧参数名，并同步修正关联 PHPDoc。覆盖 `sort`、`usort`、`array_keys`、`array_values`、`array_fill`、`array_filter`、`array_reduce`、`array_walk`、`array_intersect`／`array_diff` 等常用函数。PHP 7.4 的 `hrtime`、`is_countable`、`array_key_first`／`array_key_last` 参数名也按实际反射调整；PHP 8 声明维持原样。

接续[URL 与文件函数核对](phpstorm-stubs-php7-utility-file-parameters-2026-09-30.md)，标准库审计结果：

| PHP | 函数名缺失 | 单声明差异 | 重载形状差异 |
| --- | ---: | ---: | ---: |
| 7.2 | 0 | 2（原 37） | 16 |
| 7.4 | 0 | 1（原 38） | 16 |
| 8.5 | 0 | 0 | 9 |

剩余三处单声明差异都涉及反射与实际调用数量不一致：本机 PHP 7.2 实测 `pack('x')` 和 `stream_context_set_option($context, $options)` 成功，PHP 7.4 实测无参 `hrtime()` 成功，故保留这些合法调用的声明。重载形状项包括 `min`／`max`、`implode`、`parse_url` 等类型或参数形式专用声明，尚未逐项核实候选选择质量。

语言规格 104 项测试及 PHP 7.2 标准数组补全与签名的真实 stdio LSP 定向测试通过；语言规格构建、所改 TypeScript 文件 ESLint 和 `git diff --check` 通过。本机没有 PHP 7.3 运行时，7.3 的少数版本专用参数名仅由现有上游声明与相邻版本推断，仍需独立运行时复核。源码未打包、安装或更新 Profile。

# 标准数组函数原生参数类型核对（2026-10-01）

基于固定 `phpstorm-stubs` 核对的标准数组目录已覆盖函数名；本轮继续检查当前内置声明和运行时反射之间的原生类型。PHP 8.1／8.2／8.4／8.5 的 `count`、`sizeof`、`array_walk`、`array_walk_recursive`、`array_column` 中，五个函数的参数形状原本正确，但 `Countable|array`、`array|object` 和 `int|string|null` 等原生参数类型尚未全部写进声明。

现在 PHP 8 目标的这些参数与本机反射一致，保留原来的泛型 PHPDoc 和返回类型推断。PHP 7 目标仍使用原有签名，不把 PHP 8 的联合类型带入旧版。新增 `scripts/audit-phpstorm-standard-native-types.mjs` 对五个函数的所有原生参数及返回类型逐项比较；本机四个 PHP 8 运行时的 20 组签名全部一致。此审计仅覆盖列出的函数，不把整套标准库宣称为原生类型完全一致。

语言规格全量 121/121、语义全量 517/517、`array_column` 签名提示和数组补全的真实 stdio LSP 定向测试、受影响文件 ESLint 与 `git diff --check` 通过。Winstar2024 只读打开缓冲区交替 100 轮输入 `array_col`／`array_wa`，目标均出现，热查询 P95 26.25 ms；[机器结果](phpstorm-stubs-standard-native-types-benchmark-2026-10-01.json)。这不是已安装 Profile 的真实 WSL 弹窗验收。本轮未改 Winstar 文件、打包、提交或更新 Profile。

后续复查：曾分别尝试给 `array_search`、`array_rand` 增加 PHP 8 的原生返回联合类型，并尝试通用模板边界与数字默认值解析。现有返回 PHPDoc 的模板精度在这两项改动下分别退化为 `false|int|string` 与 `array|int|string`；`array_search` 已有的字符串键回归用例直接检出差异。相关试探性代码均撤回，保留原有更精确的返回 PHPDoc，不将这两项计入原生签名审计。该限制留作独立语义工作，避免同一问题阻滞其它目录接入。

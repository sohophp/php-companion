# phpstorm-stubs：getrusage 平台返回审计

2026-10-02。固定修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `standard/standard_3.php` 仅声明 `array|false`，没有数组形状。当前 SoPHP 提供 `array<string, int>|false`；PHP 7.2／8.5 语义实测保留失败分支，但成功保护后 `ru_` 前缀没有键建议。

## 本次完成

新增 `scripts/check-getrusage-runtime.mjs`，核对自身和子进程模式、计数器整数类型、四个计时字段及平台字段范围；脚本 ESLint 通过。

- Linux PHP 7.2／7.4／8.1／8.2／8.4／8.5：两种模式均返回 17 个字段。
- 原生 Windows PHP 8.5.11：两种模式均返回 6 个字段。子进程模式也包含值为零的 `ru_majflt` 和 `ru_maxrss`，与手册注释所述“仅自身模式”有差异；保留实际结果。
- [PHP 官方手册](https://www.php.net/manual/en/function.getrusage.php)列出平台返回差异及失败 false。

[完整结果](phpstorm-stubs-getrusage-platform-audit-2026-10-02.json)保存七套运行时输出与两版语义基线；原始输出在 `/tmp/sophp-stubs-getrusage-runtime.jsonl` 和 `/tmp/sophp-stubs-getrusage-semantic.json`。

首次探测使用 `-n`，旧版 PHP 因 JSON 扩展未加载失败，已改为正常配置。首次 Windows 子进程断言按手册要求四个字段，被实际六字段输出否定；改为检查通用计时字段与允许的平台字段，并记录全部实际字段。

## 未完成范围

产品声明保持现有宽类型。直接加入 Linux 的 17 字段会给 Windows 提供错误候选；只加入四个共有字段会遗漏已证实的平台字段。下一步需利用项目平台事实选择数组形状，再做协议和宿主验证；本次运行时审计不等于键补全已实现。

443 项完整协议回归继续使用原进程；本次检查确认其冻结的 80 项输入没有变化。没有重建产品、打包、提交、推送或更新 Profile。

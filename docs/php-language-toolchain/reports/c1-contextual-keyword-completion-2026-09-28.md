# C1：PHP 关键字补全按上下文返回

日期：2026-09-28。用户在真实 WSL 的 Winstar `src/Config/app.php` 中输入 `retu`，建议列表显示 `register_tick_function` 等函数，却没有 `return`。此前同一文件还遇到 `n → new` 和 `func → function` 缺失。Winstar 只用于复现，不修改业务文件。

## 对照与范围

PhpStorm 的[基础补全](https://www.jetbrains.com/help/phpstorm/auto-completing-code.html)会根据光标位置提供可达的类、方法和关键字；[类型匹配补全](https://www.jetbrains.com/help/phpstorm/auto-completing-code.html)会进一步按预期类型筛选。[PHP 关键字清单](https://www.php.net/manual/en/reserved.keywords.php)是语法依据。SoPHP 当前只补齐了常用关键字的基础层，未声称实现 PhpStorm 的类型匹配、Live Templates、后缀模板或整行预测。

SoPHP 现在统一按文件顶层、类成员、语句和表达式位置返回关键字；`return`、`function`、`foreach`、`throw`、`new` 等匹配输入前缀的关键字排在函数与常量建议前。类成员中的 `function`、可调用体中的 `yield` / `global`、循环中的 `break` / `continue` 分别受语境限制；`fn`、`match`、`enum`、`readonly` 受项目 PHP 目标版本限制。注释、字符串、成员访问、导入和类型位置沿用各自的补全来源。未闭合的函数或类导致语法树坍缩时，针对短文件保守恢复花括号作用域，继续提供正在输入的关键字。

## 验证与后续补全专项

- 语义回归：451/451 通过；定向测试覆盖已闭合与未闭合函数/类、表达式和注释/字符串/成员排除。
- LSP 定向测试：`retu`、`func`、`fore`、`thro`、`n`，以及 PHP 7.2 对新关键字的排除通过。
- 隔离 VS Code Core 宿主：`retu` 只返回 `return`；`fore`、`thro`、`n` 的关键字在前。完整 C1 宿主在更早的跨行 PHPDoc 泛型补全断言处失败，未执行到本轮新增断言，因此本轮另设独立关键字宿主入口。该 PHPDoc 失败仍需独立定位，不能算整套 C1 通过。
- 用户重载前一版后反馈完整输入 `function` 时仍只看到 `function_exists`。新增带前置语句和注释的 `func` / `function` 回归：在声明位置只返回 `function`，避免 `func_get_arg` / `function_exists` 混入；在表达式位置 `return func` 仍可补全真实函数。LSP 定向测试 2/2、独立关键字宿主退出码 0（日志显示 `func` / `function` 都只返回 `function`）、相关 ESLint 与 `git diff --check` 通过。
- 第二次 Core 0.4.13 VSIX SHA-256 为 `28740adf463ff92804f5b9dded3b0d97712003bbdd71c8321600a4f13111de18`，已覆盖安装到 WSL RockyLinux8；安装的 Language Server 与 VSIX 内容 SHA-256 同为 `23e8be92d827a78a5eab14d0850d24ebee6906525228f69e0900599a926fd1f6`。运行中的扩展宿主仍是安装前进程，需重载窗口后再做真实 UI 复测。
- 后续只推进补全：首先修复并稳定 PHPDoc/类型位置与候选来源；随后改进预期类型排序、函数参数与数组键值建议；最后评估常用语句模板与后缀补全。每项都要求 PHP 7.2/8.5、未保存修改、隔离宿主和真实 WSL 输入验证。遇到无法可靠复现的问题先记录证据和停止点，避免反复阻塞其它补全工作。

当前修改不等于完整 PhpStorm 补全，也不等于用户 WSL 窗口已验收。未发布、提交或推送。

# C1：自动 PHP 版本宿主门禁

日期：2026-09-26。隔离 VS Code C1 宿主在未设置 `PHP_COMPANION_TEST_C1_PHP_VERSION` 时，曾失败于版本诊断断言。显式 PHP 7.2 和 8.5 的同一宿主此前均通过，故先核对实际自动目标。

测试模式现在可按 URI 读取版本管理器的有效目标。隔离宿主中第一个 Composer 项目实际选中 PHP 8.5；原测试却把它固定视为 7.2，连续误判版本诊断、`str_contains` 补全，以及两个项目的内建声明虚拟 URI 和签名。调整后，这些断言按各项目实际目标判断；两个目标相同时验证共用同版本 URI，目标不同才验证 URI 隔离。显式 7.2/8.5 的跨版本宿主门禁仍单独保留。

主扩展与宿主 TypeScript 编译、相关 ESLint 和 `git diff --check` 通过。未显式设置版本的隔离 VS Code 1.139.1 Linux x64 C1 宿主退出码 0；日志 `/tmp/sophp-c1-auto-version-final-20260926.log` 记录首项目自动目标 PHP 8.5，并通过六项编辑查询、Composer vendor 和双根工作区链。

这项改动修正测试对 `auto` 的环境假设；没有改变产品的版本选择规则。真实 WSL Remote 自动探测、不同 PATH 环境和长会话仍按 C4 验收。

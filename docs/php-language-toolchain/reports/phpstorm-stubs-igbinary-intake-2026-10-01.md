# phpstorm-stubs igbinary 接入（2026-10-01）

固定修订的 `igbinary/igbinary.php` 提供 `igbinary_serialize` 和 `igbinary_unserialize` 两个名称。本机 PHP 7.2／7.4／8.1／8.5 的 igbinary 3.2.16 反射均仅导出这两个函数；参数分别为必填 `$value` 和 `$str`，无扩展常量。SoPHP 保留上游返回值的保守 PHPDoc 提示，并按项目是否加载 igbinary 撤回声明。

固定上游同步、语言规格 118 项、真实 stdio LSP 跳转与扩展撤回定向测试、TypeScript 构建和 ESLint 通过。没有打包、安装或更新 Profile；真实 WSL UI 未验收。

# phpstorm-stubs YAML 接入（2026-10-01）

从固定修订 `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681` 的 `yaml/yaml.php` 核对五个函数名和 25 个常量名。`scripts/sync-phpstorm-yaml.mjs` 对本机 PHP 7.2、8.1、8.2、8.4、8.5 的反射结果逐项核对：函数名称、参数名称、可选性、引用方式、参数类型和常量值一致。PHP 7.4 本机未加载 YAML，使用相邻版本的相同声明作为后备。

SoPHP 现在为已加载 YAML 的项目提供解析／输出函数及常量的补全、跳转和签名；扩展关闭或运行时未加载时撤回这些声明。保留解析函数的引用输出参数 `$ndocs`，不把上游 PHPDoc 中的返回类型声明成运行时原生返回类型。此接入针对 PECL YAML 扩展，与 Symfony YAML 组件无关。

固定上游同步、语言规格 117 项、真实 stdio LSP 的启用／撤回定向测试和 TypeScript 构建已通过。未打包、安装或更新 Profile；真实 WSL 可见弹窗仍待使用反馈。

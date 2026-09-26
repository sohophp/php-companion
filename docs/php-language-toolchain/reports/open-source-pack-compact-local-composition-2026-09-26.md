# Open Source Pack 完整组合复核：局部 `compact()`

日期：2026-09-26。当前 Core、Symfony、Pack 源码与 TwigPlus 1.3.8 源码同宿主加载，另七个直接外部成员来自隔离目录 `/tmp/sophp-pack-source-context-20260926`；仅使用临时 Composer 项目及独立 PHP 8.5、fixer、PHPUnit 工具路径。未修改业务项目，未打包 VSIX。

在 VS Code 1.139.1 Linux x64 的隔离 Open Source Profile 中，完整 PHP 编辑反馈、Symfony YAML 服务、Twig/YAML/XML、PHP CS Fixer、EditorConfig、PHP Debug 和 PHPUnit CLI 链继续通过；同一轮新增 Controller 顶层直接赋值后 `compact()` 的 Twig 补全与 Definition、`#[Template]` 局部变量 Definition，以及现有未保存改名、移除属性、Revert 和旧来源撤销。Extension Host 退出码 **0**。

本轮使用 `PHP_COMPANION_TEST_PROFILE_SOURCE=1 PHP_COMPANION_TEST_PROFILE_SYMFONY_CONTEXTS=1 node scripts/run-extension-test.mjs ./dist-test/runPackagedTest.js`，并明确设置隔离扩展目录、TwigPlus 源码目录、PHP 8.5、PHP CS Fixer 与 PHPUnit 可执行路径；完整命令与路径见[上一轮组合记录](open-source-pack-compact-composition-2026-09-26.md)。源码组合通过不证明旧 `15a5254` VSIX 已包含这些增量，也不替代真实 WSL Remote、Windows/macOS 或长时间使用验收。

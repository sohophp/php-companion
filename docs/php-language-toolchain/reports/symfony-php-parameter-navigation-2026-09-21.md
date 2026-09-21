# Symfony PHP Configurator 参数导航与重命名验收（2026-09-21）

## 结论

独立 `sohophp.php-companion-symfony` 扩展已把 PHP Configurator 静态参数纳入 YAML/XML/PHP 共用的权威参数图。支持从已证明的 `parameters()->set('id', value)` 声明或官方 `param('id')` 引用发起 Definition、References、Completion 和原子 F2 Rename。

Provider 仅发布参数 ID、URI 和源码范围，不读取、执行或序列化参数值。

## 精准边界

- 配置文件必须返回唯一匿名函数，且唯一参数必须精确解析为 Symfony `ContainerConfigurator`。
- 声明支持直接 `$container->parameters()->set()` 及未重赋值的 `$parameters = $container->parameters()` 别名。
- 引用只接受规范导入或完全限定的 Symfony Configurator `param()`，普通业务函数、方法和 `$this->param()` 均排除。
- 动态 ID、非法名称、变量重赋值、损坏 PHP、重复声明或任一权威配置文件不可完整扫描时保持无结果。
- Rename 一次覆盖 YAML `%id%`、XML `%id%`、PHP `param('id')` 和唯一声明，并验证每段原始文本后才返回 WorkspaceEdit。

## 自动证据

- framework-symfony：48 项通过。
- provider-symfony-services：2 项通过。
- php-companion-symfony：4 项通过。
- Language Server 定向 stdio：通过，覆盖 PHP Definition、Completion、Rename 和 YAML/XML/PHP 跨格式引用。
- Language Server 完整回归：198 项通过。
- 全仓 TypeScript：通过。
- 全仓 ESLint：通过。
- `pnpm test:extension:packaged`：首次运行发现 PHP 参数 F2 未进入核心手动 Rename Provider；修复 `textDocument/prepareRename` 与 `textDocument/rename` 的参数回退后，VS Code 1.138.0 隔离双 VSIX 宿主验证三格式 Definition、References、Completion 与 F2，并以状态码 0 退出。
- Winstar 当前没有 PHP Configurator 参数声明样本；其大量业务 `$this->param()` 调用作为真实负样本，均不满足规范函数 import 和 Configurator 闭包门禁。

提交和候选 SHA-256 将在干净提交生成 Alpha 候选后追加。

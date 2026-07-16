# PHP Companion Recommended Pack

这是从 PhpStorm 迁移到 VS Code 时的推荐安装组合：包含 PHP Companion、TwigPlus、常用 PHP 专项工具，以及作为基础 PHP Language Server 的 Intelephense。

## 与 Open Source Pack 的区别

Recommended Pack 包含 Open Source Pack 的全部扩展，并额外安装 `bmewburn.vscode-intelephense-client`。Intelephense 的基础功能可以免费使用，但其语言服务器不是开源软件，部分高级功能需要 Premium。

PHP Companion 不依赖 Intelephense；卸载或禁用 Intelephense 后，PHP Companion 自己的版本检测、索引、类符号重命名和智能粘贴仍可工作。

不要在同一工作区同时启用 Intelephense 和另一个 PHP Language Server，否则可能出现重复补全、诊断和跳转结果。

## 包含的能力

- Intelephense：类型感知补全、定义跳转、悬停、签名提示和诊断。
- PHP Companion：PHP 7.2–8.5 目标版本、Composer/PSR-4 索引、安全重命名和智能粘贴。
- TwigPlus：接近 PhpStorm 的 Twig 开发体验。
- IntelliJ 键位、PHPDoc、namespace、PSR-4 文件、Xdebug、PHPUnit/Pest、PHP CS Fixer 和 PHPStan。

## PHPStan 性能安全默认值

Recommended Pack 默认将 PHPStan 设为手动分析模式：关闭启动时的全项目分析、PHP 文件监听和配置文件监听。这样可避免大型项目在打开工作区或保存文件时反复执行完整分析，并减少对 VS Code Extension Host、Copilot 和 WSL 响应速度的影响。

PHPStan 本身仍保持启用。需要分析时，可通过命令面板运行 `PHPStan: Analyse`，或从资源管理器对指定文件、目录运行 `PHPStan: Analyse current path`。工作区中显式设置的 `phpstan.initialAnalysis`、`phpstan.fileWatcher` 和 `phpstan.configFileWatcher` 会覆盖扩展包默认值。

PHP Companion 自身的启动时全工作区索引也默认关闭。打开文件时会自动索引该文件及其 Composer PSR-4 Import；跨项目重命名等操作会显示进度并自动补齐索引，不需要用户提前运行 `PHP Companion: Rebuild Symbol Index`。

## 本地安装

```bash
pnpm package:all
code --install-extension php-companion-0.1.2.vsix
code --install-extension packages/php-companion-recommended-pack/php-companion-recommended-pack-0.1.2.vsix
```

本地测试应先安装 PHP Companion VSIX。正式发布后，安装本扩展包会自动安装清单中的扩展。

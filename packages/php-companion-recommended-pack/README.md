# PHP Companion Recommended Pack

这是从 PhpStorm 迁移到 VS Code 时的推荐安装组合：包含 PHP Companion、TwigPlus、常用 PHP 专项工具，以及作为基础 PHP Language Server 的 Intelephense。

## 与 Open Source Pack 的区别

Recommended Pack 包含 Open Source Pack 的全部扩展，并额外安装 `bmewburn.vscode-intelephense-client`。Intelephense 的基础功能可以免费使用，但其语言服务器不是开源软件，部分高级功能需要 Premium。

PHP Companion 不依赖 Intelephense；卸载或禁用 Intelephense 后，PHP Companion 自己的版本检测、索引、Shift+F6 重命名和智能粘贴仍可工作。

不要在同一工作区同时启用 Intelephense 和另一个 PHP Language Server，否则可能出现重复补全、诊断和跳转结果。

## 包含的能力

- Intelephense：类型感知补全、定义跳转、悬停、签名提示和诊断。
- PHP Companion：PHP 7.2–8.5 目标版本、Composer/PSR-4 索引、安全重命名和智能粘贴。
- TwigPlus：接近 PhpStorm 的 Twig 开发体验。
- IntelliJ 键位、PHPDoc、namespace、PSR-4 文件、Xdebug、PHPUnit/Pest、PHP CS Fixer 和 PHPStan。

## 本地安装

```bash
pnpm package:all
code --install-extension php-companion-0.1.1.vsix
code --install-extension packages/php-companion-recommended-pack/php-companion-recommended-pack-0.1.1.vsix
```

本地测试应先安装 PHP Companion VSIX。正式发布后，安装本扩展包会自动安装清单中的扩展。
